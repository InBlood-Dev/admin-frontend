import api from './api';
import type {
  AdminReport,
  PaginatedReportsResponse,
} from '../types';

export interface ListReportsParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  report_type?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

async function listReports(params: ListReportsParams = {}): Promise<PaginatedReportsResponse> {
  const { data } = await api.get('/admin/reports', { params });
  return data.data;
}

async function reviewReport(reportId: string): Promise<AdminReport> {
  const { data } = await api.put(`/admin/reports/${reportId}/review`);
  return data.data;
}

async function dismissReport(reportId: string): Promise<AdminReport> {
  const { data } = await api.put(`/admin/reports/${reportId}/dismiss`);
  return data.data;
}

async function actionReport(
  reportId: string,
  action: 'ban_user' | 'delete_content' | 'warn',
): Promise<AdminReport> {
  const { data } = await api.put(`/admin/reports/${reportId}/action`, { action });
  return data.data;
}

export interface BulkReportActionResult {
  total: number;
  succeeded: number;
  failed: number;
  failures: { id: string; error: string }[];
}

async function bulkReviewReports(reportIds: string[]): Promise<BulkReportActionResult> {
  const { data } = await api.put('/admin/reports/bulk-review', { report_ids: reportIds });
  return data.data;
}

async function bulkDismissReports(reportIds: string[]): Promise<BulkReportActionResult> {
  const { data } = await api.put('/admin/reports/bulk-dismiss', { report_ids: reportIds });
  return data.data;
}

async function bulkActionReports(
  reportIds: string[],
  action: 'ban_user' | 'delete_content' | 'warn',
): Promise<BulkReportActionResult> {
  const { data } = await api.put('/admin/reports/bulk-action', { report_ids: reportIds, action });
  return data.data;
}

const reportService = {
  listReports,
  reviewReport,
  dismissReport,
  actionReport,
  bulkReviewReports,
  bulkDismissReports,
  bulkActionReports,
};

export default reportService;
