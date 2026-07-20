import { Router } from 'express';
import { rewardController } from '../controllers/rewardController';
import { verifyFirebaseToken, requireAuth, requireAdmin } from '../middlewares/auth';
import { authRateLimiter } from '../middlewares/security';

const router = Router();

router.use('/rewards', verifyFirebaseToken, requireAuth);

router.get('/rewards', (req, res, next) => rewardController.getAll(req as any, res, next));
router.get('/rewards/my-redemptions', (req, res, next) => rewardController.getMyRedemptions(req as any, res, next));
router.get('/rewards/:id', (req, res, next) => rewardController.getById(req as any, res, next));
router.post('/rewards/:id/redeem', authRateLimiter, (req, res, next) => rewardController.redeem(req as any, res, next));

router.post('/rewards', requireAdmin, authRateLimiter, (req, res, next) => rewardController.create(req as any, res, next));
router.put('/rewards/:id', requireAdmin, authRateLimiter, (req, res, next) => rewardController.update(req as any, res, next));
router.delete('/rewards/:id', requireAdmin, (req, res, next) => rewardController.delete(req as any, res, next));

export default router;
