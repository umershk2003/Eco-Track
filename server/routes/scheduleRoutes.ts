import { Router } from 'express';
import { scheduleController } from '../controllers/scheduleController';
import { verifyFirebaseToken, requireAuth, requireAdmin } from '../middlewares/auth';
import { authRateLimiter } from '../middlewares/security';

const router = Router();

router.use('/schedules', verifyFirebaseToken, requireAuth);

router.get('/schedules', (req, res, next) => scheduleController.getAll(req as any, res, next));
router.get('/schedules/:id', (req, res, next) => scheduleController.getById(req as any, res, next));
router.post('/schedules', requireAdmin, authRateLimiter, (req, res, next) => scheduleController.create(req as any, res, next));
router.put('/schedules/:id', requireAdmin, authRateLimiter, (req, res, next) => scheduleController.update(req as any, res, next));
router.delete('/schedules/:id', requireAdmin, (req, res, next) => scheduleController.delete(req as any, res, next));

export default router;
