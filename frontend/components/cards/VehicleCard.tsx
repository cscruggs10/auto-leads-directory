import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { formatMileage } from '@/lib/utils';

interface Vehicle {
  vin: string;
  year: number;
  make: string;
  model: string;
  mileage?: number;
  down_payment_required?: number;
  photos: string[];
  dealer_name: string;
  dealer_city: string;
  exterior_color?: string;
  is_featured?: boolean;
}

interface VehicleCardProps {
  vehicle: Vehicle;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const primaryPhoto = vehicle.photos?.[0];
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  
  return (
    <div className="bg-surface rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden border border-border-light group">
      {/* Featured Badge */}
      {vehicle.is_featured && (
        <div className="absolute top-4 left-4 z-10 bg-primary text-white px-3 py-1 text-xs font-semibold rounded-full">
          Featured
        </div>
      )}
      
      {/* Image */}
      <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200">
        {primaryPhoto ? (
          <Image
            src={primaryPhoto}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={() => {
              // Handle image error by showing placeholder
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-background-gray to-gray-200">
            <div className="text-center text-text-light">
              <svg className="mx-auto h-20 w-20 mb-3 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11C5.84 5 5.28 5.42 5.08 6.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-1.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
              <p className="text-sm font-semibold text-text-secondary">{vehicle.make}</p>
              <p className="text-xs text-text-light">{vehicle.model}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Vehicle Title */}
        <h3 className="font-bold text-lg text-text-primary mb-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        
        {/* Dealer & Location */}
        <p className="text-sm text-text-secondary mb-4">
          {vehicle.dealer_name} • {vehicle.dealer_city}
        </p>
        
        {/* Vehicle Details */}
        <div className="flex items-center gap-6 text-sm text-text-secondary mb-5">
          {vehicle.mileage && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium">{formatMileage(vehicle.mileage)}</span>
            </div>
          )}
          {vehicle.exterior_color && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-text-secondary"></div>
              <span className="font-medium">{vehicle.exterior_color}</span>
            </div>
          )}
        </div>
        
        {/* Down Payment */}
        <div className="mb-6">
          <p className="text-xs text-text-light font-medium uppercase tracking-wide mb-1">
            Down Payment
          </p>
          <p className="text-2xl font-bold text-text-primary">
            ${vehicle.down_payment_required?.toLocaleString() || '--'}
          </p>
        </div>
        
        {/* CTA Button */}
        <Link href={`/vehicles/${vehicle.vin}`} className="block">
          <button className="w-full bg-text-primary hover:bg-text-secondary text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 group-hover:bg-primary">
            Get This Dealer's Offer
          </button>
        </Link>
      </div>
    </div>
  );
}