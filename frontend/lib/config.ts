export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://auto-leads-directory-production.up.railway.app/api/v1';

export const config = {
  api: {
    vehicles: `${API_URL}/vehicles`,
    vehiclesFeatured: `${API_URL}/vehicles/featured`,
    vehicleDetail: (vin: string) => `${API_URL}/vehicles/${vin}`,
    dealers: `${API_URL}/dealers`,
    dealerDetail: (id: string) => `${API_URL}/dealers/${id}`,
    leads: `${API_URL}/leads`,
  }
};