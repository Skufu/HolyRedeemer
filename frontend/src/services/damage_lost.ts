import { api, ApiResponse } from './api';

export interface DamageLostIncident {
  id: string;
  transaction_id: string;
  copy_id: string;
  student_id: string;
  student_name?: string;
  student_number?: string;
  book_title?: string;
  book_author?: string;
  copy_number?: number;
  incident_type: 'damage' | 'lost';
  severity: 'minor' | 'moderate' | 'severe' | 'total_loss';
  description: string;
  assessed_cost: number;
  receipt_no: string;
  transaction_receipt_no?: string;
  circulation_status?: string;
  transaction_status?: string;
  status: 'pending' | 'assessed' | 'resolved' | 'disputed';
  reported_at: string;
  grade_level?: number;
  section?: string;
  qr_code?: string;
  checkout_date?: string;
  due_date?: string;
  return_date?: string;
}

export interface ReportIncidentRequest {
  transaction_id: string;
  copy_id: string;
  incident_type: 'damage' | 'lost';
  severity: 'minor' | 'moderate' | 'severe' | 'total_loss';
  description: string;
  assessed_cost: number;
}

export interface ListIncidentsParams {
  page?: number;
  per_page?: number;
  incident_type?: string;
  status?: string;
  student_id?: string;
}

export const damageLostService = {
  reportIncident: async (data: ReportIncidentRequest): Promise<ApiResponse<DamageLostIncident>> => {
    const response = await api.post<ApiResponse<DamageLostIncident>>('/damage-lost/report', data);
    return response.data;
  },

  listIncidents: async (params?: ListIncidentsParams): Promise<ApiResponse<DamageLostIncident[]>> => {
    const response = await api.get<ApiResponse<DamageLostIncident[]>>('/damage-lost/incidents', { params });
    return response.data;
  },

  getIncident: async (id: string): Promise<ApiResponse<DamageLostIncident>> => {
    const response = await api.get<ApiResponse<DamageLostIncident>>(`/damage-lost/incidents/${id}`);
    return response.data;
  },

  resolveIncident: async (id: string): Promise<ApiResponse<DamageLostIncident>> => {
    const response = await api.put<ApiResponse<DamageLostIncident>>(`/damage-lost/incidents/${id}/resolve`);
    return response.data;
  },
};