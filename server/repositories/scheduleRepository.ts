import { adminDb } from '../config/firebase';
import { CollectionSchedule } from '../types';
import { Logger } from '../utils/logger';

export class ScheduleRepository {
  private collection = adminDb.collection('schedules');
  private memoryDb = new Map<string, any>();
  private useMemoryFallback = false;

  private isPermissionDenied(error: any): boolean {
    const msg = error?.message || '';
    return msg.includes('PERMISSION_DENIED') || msg.includes('permission') || error?.code === 7;
  }

  async findAll(): Promise<CollectionSchedule[]> {
    if (this.useMemoryFallback) {
      return Array.from(this.memoryDb.values());
    }
    try {
      const snap = await this.collection.get();
      return snap.docs.map(doc => ({ scheduleId: doc.id, ...doc.data() } as CollectionSchedule));
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        Logger.warn('ScheduleRepository', 'Permission denied. Falling back to memory storage.');
        this.useMemoryFallback = true;
        return Array.from(this.memoryDb.values());
      }
      throw error;
    }
  }

  async findById(scheduleId: string): Promise<CollectionSchedule | null> {
    if (this.useMemoryFallback) {
      return this.memoryDb.get(scheduleId) || null;
    }
    try {
      const doc = await this.collection.doc(scheduleId).get();
      if (!doc.exists) return null;
      return { scheduleId: doc.id, ...doc.data() } as CollectionSchedule;
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        return this.memoryDb.get(scheduleId) || null;
      }
      throw error;
    }
  }

  async create(scheduleId: string, schedule: Partial<CollectionSchedule>): Promise<void> {
    const fullSchedule = {
      scheduleId,
      active: true,
      daysOfWeek: [],
      ...schedule
    };

    if (this.useMemoryFallback) {
      this.memoryDb.set(scheduleId, fullSchedule);
      return;
    }
    try {
      await this.collection.doc(scheduleId).set(fullSchedule);
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        this.memoryDb.set(scheduleId, fullSchedule);
        return;
      }
      throw error;
    }
  }

  async update(scheduleId: string, updates: Partial<CollectionSchedule>): Promise<void> {
    if (this.useMemoryFallback) {
      const existing = this.memoryDb.get(scheduleId) || {};
      this.memoryDb.set(scheduleId, { ...existing, ...updates });
      return;
    }
    try {
      await this.collection.doc(scheduleId).update(updates);
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        const existing = this.memoryDb.get(scheduleId) || {};
        this.memoryDb.set(scheduleId, { ...existing, ...updates });
        return;
      }
      throw error;
    }
  }

  async delete(scheduleId: string): Promise<void> {
    if (this.useMemoryFallback) {
      this.memoryDb.delete(scheduleId);
      return;
    }
    try {
      await this.collection.doc(scheduleId).delete();
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        this.memoryDb.delete(scheduleId);
        return;
      }
      throw error;
    }
  }
}

export const scheduleRepository = new ScheduleRepository();
