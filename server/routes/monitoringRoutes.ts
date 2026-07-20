import { Router, Request, Response } from 'express';
import { adminDb } from '../config/firebase';
import { Logger } from '../utils/logger';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version
  };
  return res.json(healthData);
});

router.get('/live', (req: Request, res: Response) => {
  return res.status(200).send('OK');
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Quick Firestore check (simple list collection or similar)
    await adminDb.collection('schedules').limit(1).get();
    return res.json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    Logger.error('Monitoring', `Ready check failed: ${error.message}`);
    return res.status(503).json({
      status: 'unready',
      database: 'disconnected',
      error: error.message
    });
  }
});

export default router;
