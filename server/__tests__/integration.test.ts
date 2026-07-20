// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { userService } from '../services/userService';
import { aiService } from '../services/aiService';

vi.mock('../services/userService', () => ({
  userService: {
    getProfile: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    updateRoleAndStatusByAdmin: vi.fn(),
  },
}));

vi.mock('../services/aiService', () => ({
  aiService: {
    getRecyclingTipOfTheDay: vi.fn(() => ({
      id: 1,
      category: 'organic',
      binColor: 'Green Bin',
      icon: 'Leaf',
      title: { en: 'Organic compost' },
      description: { en: 'Recycle compost' }
    })),
  },
}));

describe('Integrated HTTP API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/tips/today', () => {
    it('should return 200 and a random tip', async () => {
      const res = await request(app).get('/api/tips/today');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.category).toBe('organic');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should reject requests with missing token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Ali',
          email: 'ali@example.com',
          area: 'Latifabad',
          phone: '03001234567'
        });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Missing or invalid authorization header');
    });

    it('should validate inputs using Zod schemas', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', 'Bearer fallback_session:user-123')
        .send({
          fullName: 'A', // too short, Zod fails
          email: 'not-an-email',
          area: 'L',
          phone: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should register successfully with correct fields', async () => {
      const mockProfile = { uid: 'user-123', fullName: 'Ali Khan', email: 'ali@example.com', role: 'citizen' };
      vi.mocked(userService.createProfile).mockResolvedValue(mockProfile as any);

      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', 'Bearer fallback_session:user-123')
        .send({
          fullName: 'Ali Khan',
          email: 'ali@example.com',
          area: 'Latifabad No. 3',
          phone: '03001234567'
        });

      expect(res.status).toBe(201);
      expect(res.body.profile).toEqual(mockProfile);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return profile for valid authenticated sessions', async () => {
      const mockProfile = { uid: 'user-123', fullName: 'Ali Khan', email: 'ali@example.com', role: 'citizen', status: 'active' };
      vi.mocked(userService.getProfile).mockResolvedValue(mockProfile as any);

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer fallback_session:user-123');

      expect(res.status).toBe(200);
      expect(res.body.profile).toEqual(mockProfile);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should allow user to update their own profile', async () => {
      const mockProfile = { uid: 'user-123', fullName: 'Ali Khan', email: 'ali@example.com', role: 'citizen', status: 'active' };
      vi.mocked(userService.getProfile).mockResolvedValue(mockProfile as any);
      vi.mocked(userService.updateProfile).mockResolvedValue({ ...mockProfile, fullName: 'Ali Updated' } as any);

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer fallback_session:user-123')
        .send({
          fullName: 'Ali Updated'
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.fullName).toBe('Ali Updated');
    });
  });

  describe('RBAC: PUT /api/auth/users/:targetUid/role', () => {
    it('should prevent Citizen from changing user roles', async () => {
      const citizenProfile = { uid: 'user-citizen', role: 'citizen', status: 'active' };
      vi.mocked(userService.getProfile).mockResolvedValue(citizenProfile as any);

      const res = await request(app)
        .put('/api/auth/users/some-uid/role')
        .set('Authorization', 'Bearer fallback_session:user-citizen')
        .send({
          role: 'admin'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access restricted to roles');
    });

    it('should allow Admin to change user roles', async () => {
      const adminProfile = { uid: 'user-admin', role: 'admin', status: 'active' };
      const targetProfile = { uid: 'target-123', role: 'citizen' };
      const updatedProfile = { uid: 'target-123', role: 'collector', status: 'active' };

      vi.mocked(userService.getProfile).mockResolvedValue(adminProfile as any);
      vi.mocked(userService.updateRoleAndStatusByAdmin).mockResolvedValue(updatedProfile as any);

      const res = await request(app)
        .put('/api/auth/users/target-123/role')
        .set('Authorization', 'Bearer fallback_session:user-admin')
        .send({
          role: 'collector',
          status: 'active'
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.role).toBe('collector');
      expect(userService.updateRoleAndStatusByAdmin).toHaveBeenCalledWith('target-123', 'collector', 'active');
    });
  });
});
