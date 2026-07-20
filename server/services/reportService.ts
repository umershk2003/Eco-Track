import { reportRepository } from '../repositories/reportRepository';
import { BinReport } from '../types';
import { NotFoundError } from '../utils/errors';

export class ReportService {
  async getAllReports(): Promise<BinReport[]> {
    return reportRepository.findAll();
  }

  async getReportById(reportId: string): Promise<BinReport> {
    const report = await reportRepository.findById(reportId);
    if (!report) {
      throw new NotFoundError(`Report with ID ${reportId} not found`);
    }
    return report;
  }

  async createReport(reportId: string, data: Partial<BinReport>): Promise<BinReport> {
    await reportRepository.create(reportId, data);
    return this.getReportById(reportId);
  }

  async updateReport(reportId: string, updates: Partial<BinReport>): Promise<BinReport> {
    await this.getReportById(reportId); // Throws 404 if not found
    await reportRepository.update(reportId, updates);
    return this.getReportById(reportId);
  }

  async deleteReport(reportId: string): Promise<void> {
    await this.getReportById(reportId); // Throws 404 if not found
    await reportRepository.delete(reportId);
  }
}

export const reportService = new ReportService();
