// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyFirebaseToken, requireAuth, requireRole } from '../middlewares/auth';
import { adminAuth } from '../config/firebase';
import { userService } from '../services/userService';

vi.mock('../config/firebase', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(),
  },
}));

vi.mock('../services/userService', () => ({
  userService: {
    getProfile: vi.fn(),
    createProfile: vi.fn(),
  },
}));

describe('Auth & RBAC Middlewares', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe('verifyFirebaseToken', () => {
    it('should call next with UnauthorizedError if Authorization header is missing', async () => {
      await verifyFirebaseToken(req, res, next);
      expect(next).toHaveBeenCalled();
      const errorArg = next.mock.calls[0][0];
      expect(errorArg.message).toContain('Missing or invalid authorization header');
    });

    it('should authenticate a valid fallback_session token', async () => {
      req.headers.authorization = 'Bearer fallback_session:user-abc';
      const mockProfile = { uid: 'user-abc', email: 'user@abc.com', role: 'citizen', status: 'active' };
      vi.mocked(userService.getProfile).mockResolvedValue(mockProfile as any);

      await verifyFirebaseToken(req, res, next);
      expect(req.user.uid).toBe('user-abc');
      expect(req.profile).toEqual(mockProfile);
      expect(next).toHaveBeenCalledWith(); // no error
    });

    it('should authenticate a valid Firebase ID token', async () => {
      req.headers.authorization = 'Bearer valid-firebase-token';
      const decoded = { uid: 'fb-123', email: 'fb@example.com', email_verified: true, name: 'Firebase User' };
      vi.mocked(adminAuth.verifyIdToken).mockResolvedValue(decoded as any);
      
      const mockProfile = { uid: 'fb-123', email: 'fb@example.com', role: 'citizen', status: 'active' };
      vi.mocked(userService.getProfile).mockResolvedValue(mockProfile as any);

      await verifyFirebaseToken(req, res, next);
      expect(req.user.uid).toBe('fb-123');
      expect(req.profile).toEqual(mockProfile);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject verified users who are disabled/suspended', async () => {
      req.headers.authorization = 'Bearer valid-firebase-token';
      const decoded = { uid: 'fb-123', email: 'fb@example.com', email_verified: true };
      vi.mocked(adminAuth.verifyIdToken).mockResolvedValue(decoded as any);
      
      const mockProfile = { uid: 'fb-123', email: 'fb@example.com', role: 'citizen', status: 'disabled' };
      vi.mocked(userService.getProfile).mockResolvedValue(mockProfile as any);

      await verifyFirebaseToken(req, res, next);
      expect(next).toHaveBeenCalled();
      const errorArg = next.mock.calls[0][0];
      expect(errorArg.message).toContain('disabled');
    });

    it('should fall back to JWT manual decoding in development/test if verifyIdToken fails', async () => {
      req.headers.authorization = 'Bearer header.eyJzdWIiOiJkZXYtNDU2IiwiZW1haWwiOiJkZXZAZXhhbXBsZS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6IkRldiBVc2VyIn0.signature';
      vi.mocked(adminAuth.verifyIdToken).mockRejectedValue(new Error('5 NOT_FOUND: Project not found'));
      
      const mockProfile = { uid: 'dev-456', email: 'dev@example.com', role: 'collector', status: 'active' };
      vi.mocked(userService.getProfile).mockResolvedValue(mockProfile as any);

      await verifyFirebaseToken(req, res, next);
      expect(req.user.uid).toBe('dev-456');
      expect(req.profile.role).toBe('collector');
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireAuth', () => {
    it('should let request proceed if req.user and req.profile are loaded', () => {
      req.user = { uid: '123' };
      req.profile = { uid: '123' };
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject with UnauthorizedError if not loaded', () => {
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      const errorArg = next.mock.calls[0][0];
      expect(errorArg.message).toContain('Authentication required');
    });
  });

  describe('requireRole', () => {
    it('should allow if role is allowed', () => {
      req.user = { uid: '123' };
      req.profile = { role: 'admin' };
      const checkAdmin = requireRole(['admin']);
      checkAdmin(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should forbid if role is not allowed', () => {
      req.user = { uid: '123' };
      req.profile = { role: 'citizen' };
      const checkAdmin = requireRole(['admin']);
      checkAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
      const errorArg = next.mock.calls[0][0];
      expect(errorArg.message).toContain('restricted to roles');
    });
  });
});
