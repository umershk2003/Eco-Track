import { rewardRepository } from '../repositories/rewardRepository';
import { userRepository } from '../repositories/userRepository';
import { Reward, Redemption } from '../types';
import { NotFoundError, ValidationError } from '../utils/errors';

export class RewardService {
  async getAllRewards(): Promise<Reward[]> {
    return rewardRepository.findAll();
  }

  async getRewardById(rewardId: string): Promise<Reward> {
    const reward = await rewardRepository.findById(rewardId);
    if (!reward) {
      throw new NotFoundError(`Reward with ID ${rewardId} not found`);
    }
    return reward;
  }

  async createReward(rewardId: string, data: Partial<Reward>): Promise<Reward> {
    await rewardRepository.create(rewardId, data);
    return this.getRewardById(rewardId);
  }

  async updateReward(rewardId: string, updates: Partial<Reward>): Promise<Reward> {
    await this.getRewardById(rewardId);
    await rewardRepository.update(rewardId, updates);
    return this.getRewardById(rewardId);
  }

  async deleteReward(rewardId: string): Promise<void> {
    await this.getRewardById(rewardId);
    await rewardRepository.delete(rewardId);
  }

  async redeemReward(userId: string, rewardId: string): Promise<Redemption> {
    const reward = await this.getRewardById(rewardId);
    if (reward.stock <= 0) {
      throw new ValidationError('This reward is out of stock!');
    }

    const userProfile = await userRepository.findByUid(userId);
    if (!userProfile) {
      throw new NotFoundError('User profile not found');
    }

    if (userProfile.points < reward.pointsCost) {
      throw new ValidationError(`Insufficient points. You need ${reward.pointsCost} points but only have ${userProfile.points}`);
    }

    // Deduct points
    const newPoints = userProfile.points - reward.pointsCost;
    await userRepository.update(userId, { points: newPoints });

    // Decrement stock
    await rewardRepository.update(rewardId, { stock: reward.stock - 1 });

    // Generate random voucher
    const voucherCode = `ECO-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const redemptionId = `redempt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const redemption: Partial<Redemption> = {
      redemptionId,
      userId,
      rewardId,
      rewardTitle: reward.title,
      pointsSpent: reward.pointsCost,
      status: 'pending',
      voucherCode
    };

    await rewardRepository.createRedemption(redemptionId, redemption);

    return {
      redemptionId,
      userId,
      rewardId,
      rewardTitle: reward.title,
      pointsSpent: reward.pointsCost,
      status: 'pending',
      redeemedAt: new Date(),
      voucherCode
    };
  }

  async getRedemptions(userId: string): Promise<Redemption[]> {
    return rewardRepository.findRedemptionsByUserId(userId);
  }
}

export const rewardService = new RewardService();
