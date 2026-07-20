import { adminDb } from '../config/firebase';
import { Reward, Redemption } from '../types';
import { Logger } from '../utils/logger';

export class RewardRepository {
  private rewardCollection = adminDb.collection('rewards');
  private redemptionCollection = adminDb.collection('redemptions');
  private memoryRewards = new Map<string, any>();
  private memoryRedemptions = new Map<string, any>();
  private useMemoryFallback = false;

  private isPermissionDenied(error: any): boolean {
    const msg = error?.message || '';
    return msg.includes('PERMISSION_DENIED') || msg.includes('permission') || error?.code === 7;
  }

  async findAll(): Promise<Reward[]> {
    if (this.useMemoryFallback) {
      return Array.from(this.memoryRewards.values());
    }
    try {
      const snap = await this.rewardCollection.get();
      return snap.docs.map(doc => ({ rewardId: doc.id, ...doc.data() } as Reward));
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        Logger.warn('RewardRepository', 'Permission denied. Falling back to memory storage.');
        this.useMemoryFallback = true;
        return Array.from(this.memoryRewards.values());
      }
      throw error;
    }
  }

  async findById(rewardId: string): Promise<Reward | null> {
    if (this.useMemoryFallback) {
      return this.memoryRewards.get(rewardId) || null;
    }
    try {
      const doc = await this.rewardCollection.doc(rewardId).get();
      if (!doc.exists) return null;
      return { rewardId: doc.id, ...doc.data() } as Reward;
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        return this.memoryRewards.get(rewardId) || null;
      }
      throw error;
    }
  }

  async create(rewardId: string, reward: Partial<Reward>): Promise<void> {
    const fullReward = {
      rewardId,
      stock: 100,
      imageUrl: '',
      ...reward
    };

    if (this.useMemoryFallback) {
      this.memoryRewards.set(rewardId, fullReward);
      return;
    }
    try {
      await this.rewardCollection.doc(rewardId).set(fullReward);
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        this.memoryRewards.set(rewardId, fullReward);
        return;
      }
      throw error;
    }
  }

  async update(rewardId: string, updates: Partial<Reward>): Promise<void> {
    if (this.useMemoryFallback) {
      const existing = this.memoryRewards.get(rewardId) || {};
      this.memoryRewards.set(rewardId, { ...existing, ...updates });
      return;
    }
    try {
      await this.rewardCollection.doc(rewardId).update(updates);
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        const existing = this.memoryRewards.get(rewardId) || {};
        this.memoryRewards.set(rewardId, { ...existing, ...updates });
        return;
      }
      throw error;
    }
  }

  async delete(rewardId: string): Promise<void> {
    if (this.useMemoryFallback) {
      this.memoryRewards.delete(rewardId);
      return;
    }
    try {
      await this.rewardCollection.doc(rewardId).delete();
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        this.memoryRewards.delete(rewardId);
        return;
      }
      throw error;
    }
  }

  // Redemptions
  async createRedemption(redemptionId: string, redemption: Partial<Redemption>): Promise<void> {
    const fullRedemption = {
      redemptionId,
      status: 'pending',
      redeemedAt: new Date(),
      ...redemption
    };

    if (this.useMemoryFallback) {
      this.memoryRedemptions.set(redemptionId, fullRedemption);
      return;
    }
    try {
      await this.redemptionCollection.doc(redemptionId).set({
        ...redemption,
        status: redemption.status || 'pending',
        redeemedAt: new Date()
      });
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        this.memoryRedemptions.set(redemptionId, fullRedemption);
        return;
      }
      throw error;
    }
  }

  async findRedemptionsByUserId(userId: string): Promise<Redemption[]> {
    if (this.useMemoryFallback) {
      return Array.from(this.memoryRedemptions.values()).filter(r => r.userId === userId);
    }
    try {
      const snap = await this.redemptionCollection.where('userId', '==', userId).get();
      return snap.docs.map(doc => ({ redemptionId: doc.id, ...doc.data() } as Redemption));
    } catch (error: any) {
      if (this.isPermissionDenied(error)) {
        this.useMemoryFallback = true;
        return Array.from(this.memoryRedemptions.values()).filter(r => r.userId === userId);
      }
      throw error;
    }
  }
}

export const rewardRepository = new RewardRepository();
