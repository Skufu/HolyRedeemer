import { api, ApiResponse } from './api';

export interface BackupItem {
  name: string;
  size: number;
  createdAt: string;
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

export const backupService = {
  create: async (): Promise<void> => {
    const response = await api.post('/backup/create', null, { responseType: 'blob' });
    const filename = parseFilename(response.headers['content-disposition']) || 'library_backup.sql';
    triggerDownload(response.data, filename);
  },

  list: async (): Promise<ApiResponse<BackupItem[]>> => {
    const response = await api.get<ApiResponse<BackupItem[]>>('/backup/list');
    return response.data;
  },

  download: async (name: string): Promise<void> => {
    const response = await api.get(`/backup/download/${encodeURIComponent(name)}`, { responseType: 'blob' });
    const filename = parseFilename(response.headers['content-disposition']) || name;
    triggerDownload(response.data, filename);
  },
};
