import { api, ApiResponse } from './api';

export interface LibrarySetting {
  key: string;
  value: string;
  description?: string;
  category?: string;
}

export interface UpdateSettingsInput {
  settings: Record<string, string>;
}

export const settingsService = {
  list: async (category?: string): Promise<ApiResponse<LibrarySetting[]>> => {
    const params = category ? { category } : undefined;
    const response = await api.get<ApiResponse<LibrarySetting[]>>('/settings', { params });
    return response.data;
  },

  get: async (key: string): Promise<ApiResponse<LibrarySetting>> => {
    const response = await api.get<ApiResponse<LibrarySetting>>(`/settings/${key}`);
    return response.data;
  },

  update: async (data: UpdateSettingsInput): Promise<ApiResponse<null>> => {
    const response = await api.put<ApiResponse<null>>('/settings', data);
    return response.data;
  },

  getBorrowingSettings: async (): Promise<ApiResponse<Record<string, string>>> => {
    const response = await api.get<ApiResponse<Record<string, string>>>('/settings/borrowing');
    return response.data;
  },

  getFineSettings: async (): Promise<ApiResponse<Record<string, string>>> => {
    const response = await api.get<ApiResponse<Record<string, string>>>('/settings/fines');
    return response.data;
  },
};
