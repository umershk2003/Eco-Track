import { adminDb } from '../config/firebase';
import { Logger } from '../utils/logger';
import { FieldValue } from 'firebase-admin/firestore';

export class AuditService {
  private collection = adminDb.collection('audit_logs');
  private memoryLogs: any[] = [];
  private useMemoryFallback = false;

  private isPermissionDenied(error: any): boolean {
    const msg = error?.message || '';
    return msg.includes('PERMISSION_DENIED') || msg.includes('permission') || error?.code === 7;
  }

  private async writeLog(logEntry: any) {
    if (this.useMemoryFallback) {
      this.memoryLogs.push(logEntry);
      return;
    }
    try {
      await this.collection.add({
        ...logEntry,
        timestamp: FieldValue.serverTimestamp()
      });
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        Logger.warn('AuditService', 'Firestore permission denied. Falling back to in-memory audit logging.');
        this.useMemoryFallback = true;
        this.memoryLogs.push(logEntry);
      } else {
        Logger.error('AuditService', 'Failed to write audit log to Firestore', error);
      }
    }
  }

  async logAuthenticationEvent(uid: string, eventType: string, email?: string, details?: any) {
    const message = `Auth event [${eventType}] for UID: ${uid}${email ? ` (${email})` : ''}`;
    Logger.info('AuditService', message, details);

    await this.writeLog({
      category: 'authentication',
      uid,
      eventType,
      email: email || '',
      message,
      details: details || null,
      createdAt: new Date()
    });
  }

  async logAIRequest(uid: string, action: 'classify-waste' | 'chat', promptLength: number, details?: any) {
    const message = `AI action [${action}] by UID: ${uid} (prompt len: ${promptLength})`;
    Logger.info('AuditService', message, details);

    await this.writeLog({
      category: 'ai_request',
      uid,
      action,
      promptLength,
      message,
      details: details || null,
      createdAt: new Date()
    });
  }

  async logDatabaseError(query: string, error: any) {
    const message = `Database error during query: ${query}. Error: ${error.message || error}`;
    Logger.error('AuditService', message);

    await this.writeLog({
      category: 'database_error',
      query,
      errorMessage: error.message || String(error),
      message,
      createdAt: new Date()
    });
  }

  async logSlowRequest(method: string, url: string, durationMs: number, uid?: string) {
    const message = `Slow request detected: ${method} ${url} took ${durationMs}ms${uid ? ` (UID: ${uid})` : ''}`;
    Logger.warn('AuditService', message);

    await this.writeLog({
      category: 'slow_request',
      method,
      url,
      durationMs,
      uid: uid || null,
      message,
      createdAt: new Date()
    });
  }

  async logFailedRequest(method: string, url: string, ip: string, statusCode: number, errorMsg: string, uid?: string) {
    const message = `Failed request: ${method} ${url} status ${statusCode} - ${errorMsg} (IP: ${ip})`;
    Logger.warn('AuditService', message);

    await this.writeLog({
      category: 'failed_request',
      method,
      url,
      ip,
      statusCode,
      errorMessage: errorMsg,
      uid: uid || null,
      message,
      createdAt: new Date()
    });
  }
}

export const auditService = new AuditService();
