import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { uploadImageMiddleware, validateAIRequest } from '../validators/aiValidator';

const router = Router();

router.post('/classify-waste', (req, res, next) => aiController.classifyWaste(req, res, next));
router.post('/chat', (req, res, next) => aiController.chat(req, res, next));
router.get('/tips/today', (req, res, next) => aiController.getTipOfTheDay(req, res, next));

// New YOLO AI Detection route
router.post('/detect', uploadImageMiddleware, validateAIRequest, (req, res, next) => aiController.detectWaste(req, res, next));

export default router;
