import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { Logger } from '../utils/logger';

export function requestLogger(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  // Listen for the finish event to log complete response details
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const userId = req.user?.uid ? ` (UID: ${req.user.uid})` : '';
    const logMsg = `${method} ${originalUrl} ${statusCode} - ${duration}ms from IP: ${ip}${userId}`;

    if (statusCode >= 500) {
      Logger.error('RequestLogger', logMsg);
    } else if (statusCode >= 400) {
      Logger.warn('RequestLogger', logMsg);
    } else {
      Logger.info('RequestLogger', logMsg);
    }
  });

  next();
}
