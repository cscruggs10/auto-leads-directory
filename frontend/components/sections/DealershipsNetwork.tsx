'use client';

import Image from 'next/image';
import { useDealers } from '@/hooks/useDealers';

interface Dealer {
  id: number;
  name: string;
  slug: string;
  city: string;
  state: string;
  logo_url: string;
  average_rating: number;
  description: string;
  vehicle_count: number;
  is_active: boolean;
}

interface DealersResponse {
  success: boolean;
  data: Dealer[];
}

export const DealershipsNetwork = () => {
  const { data, isLoading } = useDealers();
  const dealersData = data as DealersResponse | undefined;

  if (isLoading) {
    return (
      <section className="py-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">
              Dealerships in Our Network
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              These are just a few of the 50+ dealerships actively competing for your business
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-card border border-border-light animate-pulse">
                <div className="w-20 h-20 bg-background-gray rounded-xl mb-4"></div>
                <div className="h-4 bg-background-gray rounded w-24 mb-2"></div>
                <div className="h-3 bg-background-gray rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!dealersData?.data || dealersData.data.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-4">
            Dealerships in Our Network
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            These are just a few of the 50+ dealerships actively competing for your business
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {dealersData.data.map((dealer) => (
            <div
              key={dealer.id}
              className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-card border border-border-light hover:shadow-card-hover transition-all duration-200 hover:-translate-y-1"
            >
              <div className="relative w-20 h-20 mb-4 bg-background-light rounded-xl flex items-center justify-center overflow-hidden">
                <Image
                  src={dealer.logo_url}
                  alt={`${dealer.name} logo`}
                  width={80}
                  height={80}
                  className="object-contain max-w-full max-h-full"
                  onError={(e) => {
                    // Fallback to text-based logo if image fails
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="text-primary font-bold text-sm text-center leading-tight">
                          ${dealer.name.split(' ').map(word => word[0]).join('').slice(0, 3)}
                        </div>
                      `;
                    }
                  }}
                />
              </div>
              
              <h3 className="font-semibold text-text-primary text-sm text-center mb-1 leading-tight">
                {dealer.name}
              </h3>
              
              <p className="text-xs text-text-secondary text-center">
                {dealer.city}, {dealer.state}
              </p>
              
              <div className="flex items-center mt-2">
                <div className="flex text-yellow-400 text-xs">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={i < Math.floor(dealer.average_rating) ? 'text-yellow-400' : 'text-gray-300'}>
                      ★
                    </span>
                  ))}
                </div>
                <span className="ml-1 text-xs text-text-secondary">
                  {dealer.average_rating}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-text-secondary text-sm mb-4">
            Plus 40+ more dealerships ready to compete for your business
          </p>
          <div className="flex justify-center space-x-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-3 h-3 bg-primary/20 rounded-full"></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};