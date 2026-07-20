import { Router } from 'express';
import { authController } from '../controllers/authController';
import { verifyFirebaseToken, requireAuth, requireAdmin } from '../middlewares/auth';
import { authRateLimiter } from '../middlewares/security';

const router = Router();

// Registration: Authenticate, rate limit, then register profile
router.post('/register', verifyFirebaseToken, authRateLimiter, (req, res, next) => {
  authController.registerProfile(req as any, res, next);
});

// Profile Management: Requires authenticating the token
router.get('/profile', verifyFirebaseToken, requireAuth, (req, res, next) => {
  authController.getProfile(req as any, res, next);
});

router.put('/profile', verifyFirebaseToken, requireAuth, authRateLimiter, (req, res, next) => {
  authController.updateProfile(req as any, res, next);
});

// Email Verification
router.post('/send-verification', verifyFirebaseToken, requireAuth, authRateLimiter, (req, res, next) => {
  authController.sendEmailVerificationLink(req as any, res, next);
});

router.post('/verify-email', verifyFirebaseToken, requireAuth, authRateLimiter, (req, res, next) => {
  authController.verifyEmailStatus(req as any, res, next);
});

// Password recovery
router.post('/forgot-password', authRateLimiter, (req, res, next) => {
  authController.forgotPassword(req as any, res, next);
});

router.post('/reset-password', authRateLimiter, (req, res, next) => {
  authController.resetPassword(req as any, res, next);
});

// Session and Token Management
router.get('/session', verifyFirebaseToken, requireAuth, (req, res, next) => {
  authController.getProfile(req as any, res, next);
});

router.post('/refresh-token', verifyFirebaseToken, requireAuth, (req, res, next) => {
  authController.refreshToken(req as any, res, next);
});

router.post('/logout', verifyFirebaseToken, requireAuth, (req, res, next) => {
  authController.logout(req as any, res, next);
});

// Admin Role Change: Requires Admin privileges
router.put('/users/:targetUid/role', verifyFirebaseToken, requireAuth, requireAdmin, (req, res, next) => {
  authController.updateUserRoleByAdmin(req as any, res, next);
});

export default router;
