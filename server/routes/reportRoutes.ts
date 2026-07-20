import { Router } from 'express';
import { reportController } from '../controllers/reportController';
import { verifyFirebaseToken, requireAuth, requireAdmin } from '../middlewares/auth';
import { authRateLimiter } from '../middlewares/security';

const router = Router();

router.use('/reports', verifyFirebaseToken, requireAuth);

router.get('/reports', (req, res, next) => reportController.getAll(req as any, res, next));
router.get('/reports/:id', (req, res, next) => reportController.getById(req as any, res, next));
router.post('/reports', authRateLimiter, (req, res, next) => reportController.create(req as any, res, next));
router.put('/reports/:id', authRateLimiter, (req, res, next) => reportController.update(req as any, res, next));
router.delete('/reports/:id', requireAdmin, (req, res, next) => reportController.delete(req as any, res, next));

export default router;
