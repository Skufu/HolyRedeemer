import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { damageLostService, ListIncidentsParams, ReportIncidentRequest } from '@/services/damage_lost';

export const useDamageLostIncidents = (params?: ListIncidentsParams) => {
  return useQuery({
    queryKey: ['damage-lost', 'incidents', params],
    queryFn: () => damageLostService.listIncidents(params),
  });
};

export const useDamageLostIncident = (id: string) => {
  return useQuery({
    queryKey: ['damage-lost', 'incident', id],
    queryFn: () => damageLostService.getIncident(id),
    enabled: !!id,
  });
};

export const useReportIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReportIncidentRequest) => damageLostService.reportIncident(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damage-lost'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useResolveIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => damageLostService.resolveIncident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damage-lost'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};