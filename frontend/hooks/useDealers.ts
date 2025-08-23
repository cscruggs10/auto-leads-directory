import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { config } from '@/lib/config';

interface DealerFilters {
  page?: number;
  limit?: number;
  city?: string;
  state?: string;
}

export function useDealers(filters: DealerFilters = {}) {
  return useQuery({
    queryKey: ['dealers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await axios.get(
        `${config.api.dealers}?${params.toString()}`
      );
      
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useDealer(slug: string) {
  return useQuery({
    queryKey: ['dealer', slug],
    queryFn: async () => {
      const response = await axios.get(`${config.api.dealers}/slug/${slug}`);
      return response.data;
    },
    enabled: !!slug,
  });
}

export function useDealersByRegion(region: string) {
  return useQuery({
    queryKey: ['dealers', 'region', region],
    queryFn: async () => {
      const response = await axios.get(`${config.api.dealers}/region/${region}`);
      return response.data;
    },
    enabled: !!region,
  });
}