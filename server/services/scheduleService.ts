import { scheduleRepository } from '../repositories/scheduleRepository';
import { CollectionSchedule } from '../types';
import { NotFoundError } from '../utils/errors';

export class ScheduleService {
  async getAllSchedules(): Promise<CollectionSchedule[]> {
    return scheduleRepository.findAll();
  }

  async getScheduleById(scheduleId: string): Promise<CollectionSchedule> {
    const schedule = await scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundError(`Schedule with ID ${scheduleId} not found`);
    }
    return schedule;
  }

  async createSchedule(scheduleId: string, data: Partial<CollectionSchedule>): Promise<CollectionSchedule> {
    await scheduleRepository.create(scheduleId, data);
    return this.getScheduleById(scheduleId);
  }

  async updateSchedule(scheduleId: string, updates: Partial<CollectionSchedule>): Promise<CollectionSchedule> {
    await this.getScheduleById(scheduleId);
    await scheduleRepository.update(scheduleId, updates);
    return this.getScheduleById(scheduleId);
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    await this.getScheduleById(scheduleId);
    await scheduleRepository.delete(scheduleId);
  }
}

export const scheduleService = new ScheduleService();
