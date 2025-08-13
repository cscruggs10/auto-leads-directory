import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

interface LeadData {
  vehicle_vin: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employment_status: string;
  down_payment_available: number;
  bankruptcy_status: string;
  credit_score_range?: string;
  preferred_contact_method?: string;
  preferred_contact_time?: string;
  comments?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export function useSubmitLead() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (leadData: LeadData) => {
      const response = await axios.post(`${API_BASE_URL}/leads`, leadData);
      return response.data;
    },
    onSuccess: (data) => {
      // Redirect to thank you page with confirmation number
      router.push(`/thank-you?confirmation=${data.data.confirmation_number}`);
    },
    onError: (error: any) => {
      // Handle error
      console.error('Lead submission failed:', error);
      
      // You can show a toast notification here
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        alert('Failed to submit your request. Please try again.');
      }
    },
  });
}