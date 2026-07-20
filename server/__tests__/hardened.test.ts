// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock firebase config and userRepository before anything else
vi.mock('../config/firebase', () => {
  return {
    adminAuth: {
      updateUser: vi.fn().mockResolvedValue({}),
      getUser: vi.fn().mockResolvedValue({ uid: 'user-citizen', email: 'citizen@ecotrack.com' }),
      generatePasswordResetLink: vi.fn().mockResolvedValue('https://mock-reset-link.com'),
      getUserByEmail: vi.fn().mockResolvedValue({ uid: 'mock-uid', email: 'citizen@ecotrack.com' }),
      generateEmailVerificationLink: vi.fn().mockResolvedValue('https://mock-verify-link.com'),
    },
    adminDb: {
      collection: vi.fn(() => ({
        add: vi.fn().mockResolvedValue({ id: 'mock-log-id' }),
        limit: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ docs: [] })
        }))
      }))
    }
  };
});

vi.mock('../repositories/userRepository', () => {
  return {
    userRepository: {
      findByUid: vi.fn().mockResolvedValue({ uid: 'user-citizen', email: 'citizen@ecotrack.com', role: 'citizen' }),
      findByEmail: vi.fn().mockResolvedValue({ uid: 'user-citizen', email: 'citizen@ecotrack.com', role: 'citizen' }),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    }
  };
});

import { app } from '../../server';
import { userService } from '../services/userService';
import { reportService } from '../services/reportService';
import { scheduleService } from '../services/scheduleService';
import { rewardService } from '../services/rewardService';

// Mock Services
vi.mock('../services/userService', () => ({
  userService: {
    getProfile: vi.fn(),
    getProfileByEmail: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    updateRoleAndStatusByAdmin: vi.fn(),
    getAllProfiles: vi.fn(),
  }
}));

vi.mock('../services/reportService', () => ({
  reportService: {
    getAllReports: vi.fn(),
    getReportById: vi.fn(),
    createReport: vi.fn(),
    updateReport: vi.fn(),
    deleteReport: vi.fn(),
  }
}));

vi.mock('../services/scheduleService', () => ({
  scheduleService: {
    getAllSchedules: vi.fn(),
    getScheduleById: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
  }
}));

vi.mock('../services/rewardService', () => ({
  rewardService: {
    getAllRewards: vi.fn(),
    getRewardById: vi.fn(),
    createReward: vi.fn(),
    updateReward: vi.fn(),
    deleteReward: vi.fn(),
    redeemReward: vi.fn(),
    getRedemptions: vi.fn(),
  }
}));

describe('Hardened Backend Services Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Monitoring & Observability Routes', () => {
    it('GET /health should return system metrics', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('uptime');
    });

    it('GET /live should return 200 OK', async () => {
      const res = await request(app).get('/live');
      expect(res.status).toBe(200);
      expect(res.text).toBe('OK');
    });

    it('GET /ready should verify database readiness', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });
  });

  describe('Swagger/OpenAPI Documentation Route', () => {
    it('GET /api/docs should serve interactive Swagger UI html', async () => {
      const res = await request(app).get('/api/docs');
      expect(res.status).toBe(200);
      expect(res.text).toContain('swagger-ui');
    });

    it('GET /api/docs/json should return OpenAPI Spec JSON', async () => {
      const res = await request(app).get('/api/docs/json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
    });
  });

  describe('Reports Endpoint & RBAC (/api/reports)', () => {
    const citizenProfile = { uid: 'user-citizen', role: 'citizen', status: 'active', email: 'citizen@ecotrack.com' };
    const adminProfile = { uid: 'user-admin', role: 'admin', status: 'active', email: 'admin@ecotrack.com' };

    it('GET /api/reports without credentials should return 401 Unauthorized', async () => {
      const res = await request(app).get('/api/reports');
      expect(res.status).toBe(401);
    });

    it('GET /api/reports with valid credentials should list all reports', async () => {
      const mockReports = [{ reportId: 'rep-1', address: 'Banjara Hills', severity: 'full' }];
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);
      vi.mocked(reportService.getAllReports).mockResolvedValue(mockReports as any);

      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', 'Bearer fallback_session:user-citizen');

      expect(res.status).toBe(200);
      expect(res.body.reports).toEqual(mockReports);
    });

    it('POST /api/reports should create a new report successfully', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);
      vi.mocked(reportService.createReport).mockResolvedValue({ reportId: 'rep-created', address: 'Secunderabad' } as any);

      const res = await request(app)
        .post('/api/reports')
        .set('Authorization', 'Bearer fallback_session:user-citizen')
        .send({
          imageUrl: 'https://example.com/waste.jpg',
          latitude: 17.385044,
          longitude: 78.486671,
          address: 'Secunderabad, Hyderabad',
          severity: 'overflowing'
        });

      expect(res.status).toBe(201);
      expect(res.body.report.reportId).toBe('rep-created');
    });

    it('PUT /api/reports/:id as admin should allow role-based edits', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(adminProfile as any);
      vi.mocked(reportService.getReportById).mockResolvedValue({ reportId: 'rep-123', userId: 'user-other' } as any);
      vi.mocked(reportService.updateReport).mockResolvedValue({ reportId: 'rep-123', status: 'acknowledged' } as any);

      const res = await request(app)
        .put('/api/reports/rep-123')
        .set('Authorization', 'Bearer fallback_session:user-admin')
        .send({ status: 'acknowledged' });

      expect(res.status).toBe(200);
      expect(res.body.report.status).toBe('acknowledged');
    });

    it('DELETE /api/reports/:id as citizen should be forbidden', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);

      const res = await request(app)
        .delete('/api/reports/rep-123')
        .set('Authorization', 'Bearer fallback_session:user-citizen');

      expect(res.status).toBe(403);
    });

    it('DELETE /api/reports/:id as admin should delete report successfully', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(adminProfile as any);
      vi.mocked(reportService.getReportById).mockResolvedValue({ reportId: 'rep-123' } as any);

      const res = await request(app)
        .delete('/api/reports/rep-123')
        .set('Authorization', 'Bearer fallback_session:user-admin');

      expect(res.status).toBe(200);
      expect(reportService.deleteReport).toHaveBeenCalledWith('rep-123');
    });
  });

  describe('Schedules Endpoints & Admin Protection (/api/schedules)', () => {
    const citizenProfile = { uid: 'user-citizen', role: 'citizen', status: 'active' };
    const adminProfile = { uid: 'user-admin', role: 'admin', status: 'active' };

    it('GET /api/schedules should list schedules for verified users', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);
      vi.mocked(scheduleService.getAllSchedules).mockResolvedValue([{ scheduleId: 'sch-1', areaName: 'Gachibowli' }] as any);

      const res = await request(app)
        .get('/api/schedules')
        .set('Authorization', 'Bearer fallback_session:user-citizen');

      expect(res.status).toBe(200);
      expect(res.body.schedules[0].areaName).toBe('Gachibowli');
    });

    it('POST /api/schedules as citizen should return 403 Forbidden', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);

      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', 'Bearer fallback_session:user-citizen')
        .send({ areaName: 'Error Area' });

      expect(res.status).toBe(403);
    });

    it('POST /api/schedules as admin should create schedule successfully', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(adminProfile as any);
      vi.mocked(scheduleService.createSchedule).mockResolvedValue({ scheduleId: 'sch-99', areaName: 'Kondapur' } as any);

      const res = await request(app)
        .post('/api/schedules')
        .set('Authorization', 'Bearer fallback_session:user-admin')
        .send({
          areaName: 'Kondapur',
          city: 'Hyderabad',
          wasteType: 'recyclable',
          collectorId: 'coll-88',
          daysOfWeek: ['Monday', 'Thursday'],
          timeWindow: '8:00 AM - 10:00 AM'
        });

      expect(res.status).toBe(201);
      expect(res.body.schedule.areaName).toBe('Kondapur');
    });
  });

  describe('Rewards Endpoints & Point Deduction (/api/rewards)', () => {
    const citizenProfile = { uid: 'user-citizen', role: 'citizen', status: 'active' };
    const adminProfile = { uid: 'user-admin', role: 'admin', status: 'active' };

    it('GET /api/rewards should list available municipal rewards', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);
      vi.mocked(rewardService.getAllRewards).mockResolvedValue([{ rewardId: 'rew-1', title: 'Free Metro Ticket' }] as any);

      const res = await request(app)
        .get('/api/rewards')
        .set('Authorization', 'Bearer fallback_session:user-citizen');

      expect(res.status).toBe(200);
      expect(res.body.rewards[0].title).toBe('Free Metro Ticket');
    });

    it('POST /api/rewards/:id/redeem should trigger points deduction and return voucher', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);
      vi.mocked(rewardService.redeemReward).mockResolvedValue({ redemptionId: 'red-99', voucherCode: 'ECO-METRO-123' } as any);

      const res = await request(app)
        .post('/api/rewards/rew-1/redeem')
        .set('Authorization', 'Bearer fallback_session:user-citizen');

      expect(res.status).toBe(201);
      expect(res.body.redemption.voucherCode).toBe('ECO-METRO-123');
    });
  });

  describe('User Status Management Endpoints (/api/users)', () => {
    const citizenProfile = { uid: 'user-citizen', role: 'citizen', status: 'active' };
    const adminProfile = { uid: 'user-admin', role: 'admin', status: 'active' };

    it('GET /api/users as citizen should return 403 Forbidden', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer fallback_session:user-citizen');

      expect(res.status).toBe(403);
    });

    it('GET /api/users as admin should return all registered user profiles', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(adminProfile as any);
      vi.mocked(userService.getAllProfiles).mockResolvedValue([citizenProfile, adminProfile] as any);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer fallback_session:user-admin');

      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(2);
    });

    it('PUT /api/users/:uid/status as admin should allow disabling user account', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(adminProfile as any);
      vi.mocked(userService.updateRoleAndStatusByAdmin).mockResolvedValue({ uid: 'user-citizen', role: 'citizen', status: 'disabled' } as any);

      const res = await request(app)
        .put('/api/users/user-citizen/status')
        .set('Authorization', 'Bearer fallback_session:user-admin')
        .send({ status: 'disabled' });

      expect(res.status).toBe(200);
      expect(res.body.profile.status).toBe('disabled');
    });
  });

  describe('Additional Audited Authentication Endpoints', () => {
    const citizenProfile = { uid: 'user-citizen', role: 'citizen', status: 'active', email: 'citizen@ecotrack.com' };

    it('POST /api/auth/send-verification should generate email verification links', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);

      const res = await request(app)
        .post('/api/auth/send-verification')
        .set('Authorization', 'Bearer fallback_session:user-citizen');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('link');
    });

    it('POST /api/auth/verify-email should manually confirm email status', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);

      const res = await request(app)
        .post('/api/auth/verify-email')
        .set('Authorization', 'Bearer fallback_session:user-citizen');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/auth/forgot-password should return standard reset links', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'citizen@ecotrack.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('link');
    });

    it('POST /api/auth/reset-password should complete the update', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ uid: 'user-citizen', password: 'new-strong-password' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/auth/logout should create secure logouts', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer fallback_session:user-citizen');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/auth/refresh-token should verify session token freshness', async () => {
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);

      const res = await request(app)
        .post('/api/auth/refresh-token')
        .set('Authorization', 'Bearer fallback_session:user-citizen');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
