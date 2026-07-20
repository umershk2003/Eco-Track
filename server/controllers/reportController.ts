import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { reportService } from '../services/reportService';
import { z } from 'zod';
import { ValidationError, ForbiddenError } from '../utils/errors';
import { auditService } from '../services/auditService';

const createReportSchema = z.object({
  imageUrl: z.string().url(),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().min(5),
  severity: z.enum(['full', 'overflowing', 'damaged', 'illegal-dumping'])
});

const updateReportSchema = z.object({
  status: z.enum(['reported', 'acknowledged', 'collected', 'invalid']).optional(),
  severity: z.enum(['full', 'overflowing', 'damaged', 'illegal-dumping']).optional()
});

export class ReportController {
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const reports = await reportService.getAllReports();
      return res.json({ success: true, reports });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const report = await reportService.getReportById(id);
      return res.json({ success: true, report });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createReportSchema.parse(req.body);
      const uid = req.user?.uid || 'anonymous';
      const reporterName = req.profile?.fullName || 'Citizen';
      
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const report = await reportService.createReport(reportId, {
        ...validated,
        userId: uid,
        reporterName
      });

      await auditService.logDatabaseError('createReport', { message: `Report created: ${reportId} by ${uid}` });

      return res.status(201).json({ success: true, message: 'Report created successfully', report });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validated = updateReportSchema.parse(req.body);
      
      const report = await reportService.getReportById(id);
      const role = req.profile?.role || 'citizen';
      const uid = req.user?.uid;

      // Citizen can only update their own reports if status is reported
      if (role === 'citizen') {
        if (report.userId !== uid) {
          throw new ForbiddenError('Forbidden: You can only update your own reports');
        }
      }

      const updated = await reportService.updateReport(id, validated);
      return res.json({ success: true, message: 'Report updated successfully', report: updated });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await reportService.deleteReport(id);
      return res.json({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
