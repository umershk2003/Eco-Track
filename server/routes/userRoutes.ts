import { Router, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { verifyFirebaseToken, requireAuth, requireAdmin } from '../middlewares/auth';
import { AuthenticatedRequest } from '../middlewares/auth';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { authRateLimiter } from '../middlewares/security';

const router = Router();

router.use('/users', verifyFirebaseToken, requireAuth);

// Get all users (Admin/Super Admin only)
router.get('/users', requireAdmin, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getAllProfiles();
    return res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

// Get user profile by UID
router.get('/users/:uid', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { uid } = req.params;
    const currentUid = req.user?.uid;
    const role = req.profile?.role || 'citizen';

    if (role !== 'admin' && role !== 'super_admin' && currentUid !== uid) {
      throw new ForbiddenError('Forbidden: Access denied to other user profiles');
    }

    const profile = await userService.getProfile(uid);
    if (!profile) {
      throw new NotFoundError('User profile not found');
    }

    return res.json({ success: true, profile });
  } catch (error) {
    next(error);
  }
});

// Update user status (active/disabled) (Admin/Super Admin only)
router.put('/users/:uid/status', requireAdmin, authRateLimiter, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { uid } = req.params;
    const { status } = req.body;

    if (status !== 'active' && status !== 'disabled') {
      throw new Error('Invalid status. Supported: active, disabled');
    }

    const updated = await userService.updateRoleAndStatusByAdmin(
      uid,
      (await userService.getProfile(uid))?.role || 'citizen',
      status
    );

    return res.json({ success: true, message: `User status set to ${status}`, profile: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
