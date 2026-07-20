import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { Logger } from '../utils/logger';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  // 1. Log the error using our unified Logger
  const context = req.path ? `HTTP ${req.method} ${req.path}` : 'Server';
  
  // 2. Identify and parse the error type
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
    Logger.warn(context, `${err.constructor.name}: ${message}`, details);
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.issues;
    Logger.warn(context, `ZodValidationError: ${message}`, details);
  } else {
    statusCode = err.status || err.statusCode || 500;
    message = err.message || 'An unexpected error occurred';
    Logger.error(context, `UnhandledException: ${message}`, {
      stack: err.stack,
      originalError: err
    });
  }

  // 3. Format the response JSON safely
  const responsePayload: any = {
    success: false,
    message: message,
    error: message,
    errors: details || []
  };

  if (details) {
    responsePayload.details = details;
  }

  // Include stack trace only in non-production environments
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    responsePayload.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
}
