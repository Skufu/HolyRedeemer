import { api, ApiResponse } from './api';

export interface SchoolYearArchiveRequest {
  start_date?: string;
  end_date?: string;
  include_audit_logs?: boolean;
  include_notifications?: boolean;
}

export interface ArchiveGraduatesRequest {
  student_ids: string[];
}

export interface ImportStudentsResult {
  total: number;
  imported: number;
  skipped: number;
}

export interface ImportStudentsError {
  row: number;
  message: string;
  data?: Record<string, string>;
}

export interface ImportStudentsResponse {
  result: ImportStudentsResult;
  errors: ImportStudentsError[];
}

export interface ResetStudentDataResponse {
  transactions: number;
  fines: number;
  payments: number;
  requests: number;
  notifications: number;
  auditLogs: number;
  favorites: number;
  achievements: number;
}

export interface YearEndSummaryResponse {
  totalTransactions: number;
  returnedCount: number;
  overdueCount: number;
  lostCount: number;
  activeLoans: number;
  pendingFines: number;
  paidFines: number;
  waivedFines: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  fulfilledRequests: number;
  activeStudents: number;
  graduatedStudents: number;
}

export interface UpdatePoliciesRequest {
  school_year?: string;
  settings?: Record<string, string>;
}

const parseFilename = (contentDisposition?: string): string | undefined => {
  if (!contentDisposition) return undefined;
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  return match?.[1];
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const schoolYearService = {
  exportArchive: async (payload: SchoolYearArchiveRequest): Promise<void> => {
    const response = await api.post('/school-year/export-archive', payload, { responseType: 'blob' });
    const filename = parseFilename(response.headers['content-disposition']) || 'holyredeemer_archive.csv';
    triggerDownload(response.data, filename);
  },

  archiveGraduates: async (payload: ArchiveGraduatesRequest): Promise<ApiResponse<{ updated: number }>> => {
    const response = await api.post<ApiResponse<{ updated: number }>>('/school-year/archive-graduates', payload);
    return response.data;
  },

  importStudents: async (file: File): Promise<ApiResponse<ImportStudentsResponse>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<ImportStudentsResponse>>('/school-year/import-students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getReports: async (params?: { start_date?: string; end_date?: string }): Promise<ApiResponse<YearEndSummaryResponse>> => {
    const response = await api.get<ApiResponse<YearEndSummaryResponse>>('/school-year/reports', { params });
    return response.data;
  },

  resetStudentData: async (payload: { start_date?: string; end_date?: string }): Promise<ApiResponse<ResetStudentDataResponse>> => {
    const response = await api.post<ApiResponse<ResetStudentDataResponse>>('/school-year/reset-student-data', payload);
    return response.data;
  },

  updatePolicies: async (payload: UpdatePoliciesRequest): Promise<ApiResponse<null>> => {
    const response = await api.put<ApiResponse<null>>('/school-year/update-policies', payload);
    return response.data;
  },

  exportStudents: async (): Promise<void> => {
    const response = await api.get('/school-year/export-students', { responseType: 'blob' });
    const filename = parseFilename(response.headers['content-disposition']) || 'holyredeemer_students.csv';
    triggerDownload(response.data, filename);
  },
};
