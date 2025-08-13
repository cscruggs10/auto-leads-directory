import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

interface VehicleFilters {
  page?: number;
  limit?: number;
  make?: string;
  model?: string;
  year_min?: string;
  year_max?: string;
  down_payment_max?: string;
  mileage_max?: string;
  sort?: string;
}

interface VehiclesResponse {
  success: boolean;
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useVehicles(filters: VehicleFilters) {
  return useQuery({
    queryKey: ['vehicles', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await axios.get<VehiclesResponse>(
        `${API_BASE_URL}/vehicles?${params.toString()}`
      );
      
      return response.data;
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useVehicle(vin: string) {
  return useQuery({
    queryKey: ['vehicle', vin],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/vehicles/${vin}`);
      return response.data;
    },
    enabled: !!vin,
  });
}

export function useFeaturedVehicles() {
  return useQuery({
    queryKey: ['vehicles', 'featured'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/vehicles/featured`);
      return response.data;
    },
  });
}