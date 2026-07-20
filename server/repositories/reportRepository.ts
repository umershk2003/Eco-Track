import { adminDb } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { BinReport } from '../types';
import { Logger } from '../utils/logger';

export class ReportRepository {
  private collection = adminDb.collection('binReports');
  private memoryDb = new Map<string, any>();
  private useMemoryFallback = false;

  private isPermissionDenied(error: any): boolean {
    const msg = error?.message || '';
    return msg.includes('PERMISSION_DENIED') || msg.includes('permission') || error?.code === 7;
  }

  async findAll(): Promise<BinReport[]> {
    if (this.useMemoryFallback) {
      return Array.from(this.memoryDb.values());
    }
    try {
      const snap = await this.collection.get();
      return snap.docs.map(doc => ({ reportId: doc.id, ...doc.data() } as BinReport));
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        Logger.warn('ReportRepository', 'Firestore read permission denied. Falling back to memory DB.');
        this.useMemoryFallback = true;
        return Array.from(this.memoryDb.values());
      }
      throw error;
    }
  }

  async findById(reportId: string): Promise<BinReport | null> {
    if (this.useMemoryFallback) {
      return this.memoryDb.get(reportId) || null;
    }
    try {
      const doc = await this.collection.doc(reportId).get();
      if (!doc.exists) return null;
      return { reportId: doc.id, ...doc.data() } as BinReport;
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        return this.memoryDb.get(reportId) || null;
      }
      throw error;
    }
  }

  async create(reportId: string, report: Partial<BinReport>): Promise<void> {
    const fullReport = {
      reportId,
      status: 'reported',
      upvotes: 0,
      upvotedBy: [],
      pointsAwarded: 15,
      reportedAt: new Date(),
      resolvedAt: null,
      ...report
    };

    if (this.useMemoryFallback) {
      this.memoryDb.set(reportId, fullReport);
      return;
    }
    try {
      await this.collection.doc(reportId).set({
        ...report,
        status: report.status || 'reported',
        upvotes: report.upvotes || 0,
        upvotedBy: report.upvotedBy || [],
        pointsAwarded: report.pointsAwarded || 15,
        reportedAt: FieldValue.serverTimestamp(),
        resolvedAt: report.resolvedAt || null
      });
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        this.memoryDb.set(reportId, fullReport);
        return;
      }
      throw error;
    }
  }

  async update(reportId: string, updates: Partial<BinReport>): Promise<void> {
    if (this.useMemoryFallback) {
      const existing = this.memoryDb.get(reportId) || {};
      this.memoryDb.set(reportId, { ...existing, ...updates });
      return;
    }
    try {
      await this.collection.doc(reportId).update(updates);
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        const existing = this.memoryDb.get(reportId) || {};
        this.memoryDb.set(reportId, { ...existing, ...updates });
        return;
      }
      throw error;
    }
  }

  async delete(reportId: string): Promise<void> {
    if (this.useMemoryFallback) {
      this.memoryDb.delete(reportId);
      return;
    }
    try {
      await this.collection.doc(reportId).delete();
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        this.memoryDb.delete(reportId);
        return;
      }
      throw error;
    }
  }
}

export const reportRepository = new ReportRepository();
