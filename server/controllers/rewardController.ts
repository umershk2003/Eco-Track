import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { rewardService } from '../services/rewardService';
import { z } from 'zod';

const createRewardSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  pointsCost: z.number().int().positive(),
  partner: z.string().min(2),
  stock: z.number().int().nonnegative(),
  imageUrl: z.string().url().optional()
});

const updateRewardSchema = createRewardSchema.partial();

export class RewardController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rewards = await rewardService.getAllRewards();
      return res.json({ success: true, rewards });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const reward = await rewardService.getRewardById(id);
      return res.json({ success: true, reward });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createRewardSchema.parse(req.body);
      const rewardId = `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const reward = await rewardService.createReward(rewardId, {
        ...validated,
        imageUrl: validated.imageUrl || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300'
      });

      return res.status(201).json({ success: true, message: 'Reward created successfully', reward });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateRewardSchema.parse(req.body);
      const updated = await rewardService.updateReward(id, validated);
      return res.json({ success: true, message: 'Reward updated successfully', reward: updated });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await rewardService.deleteReward(id);
      return res.json({ success: true, message: 'Reward deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async redeem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const uid = req.user?.uid;
      if (!uid) {
        throw new Error('Authentication required');
      }

      const redemption = await rewardService.redeemReward(uid, id);
      return res.status(201).json({ success: true, message: 'Reward redeemed successfully', redemption });
    } catch (error) {
      next(error);
    }
  }

  async getMyRedemptions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        throw new Error('Authentication required');
      }

      const redemptions = await rewardService.getRedemptions(uid);
      return res.json({ success: true, redemptions });
    } catch (error) {
      next(error);
    }
  }
}

export const rewardController = new RewardController();
