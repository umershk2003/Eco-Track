import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { scheduleService } from '../services/scheduleService';
import { z } from 'zod';

const createScheduleSchema = z.object({
  areaName: z.string().min(2),
  city: z.string().min(2),
  wasteType: z.enum(['organic', 'recyclable', 'general', 'mixed']),
  collectorId: z.string(),
  daysOfWeek: z.array(z.string()),
  timeWindow: z.string(),
  active: z.boolean().optional()
});

const updateScheduleSchema = createScheduleSchema.partial();

export class ScheduleController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const schedules = await scheduleService.getAllSchedules();
      return res.json({ success: true, schedules });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const schedule = await scheduleService.getScheduleById(id);
      return res.json({ success: true, schedule });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createScheduleSchema.parse(req.body);
      const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const schedule = await scheduleService.createSchedule(scheduleId, {
        ...validated,
        active: validated.active ?? true
      });

      return res.status(201).json({ success: true, message: 'Schedule created successfully', schedule });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateScheduleSchema.parse(req.body);
      const updated = await scheduleService.updateSchedule(id, validated);
      return res.json({ success: true, message: 'Schedule updated successfully', schedule: updated });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await scheduleService.deleteSchedule(id);
      return res.json({ success: true, message: 'Schedule deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const scheduleController = new ScheduleController();
