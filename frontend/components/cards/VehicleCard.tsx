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
  const primaryPhoto = vehicle.photos?.[0] || '/images/no-vehicle-image.jpg';
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  
  return (
    <div className="bg-surface rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Featured Badge */}
      {vehicle.is_featured && (
        <div className="absolute top-2 left-2 z-10 bg-secondary text-white px-2 py-1 text-xs font-semibold rounded">
          Featured
        </div>
      )}
      
      {/* Image */}
      <div className="relative h-48 bg-gray-200">
        <Image
          src={primaryPhoto}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Vehicle Title */}
        <h3 className="font-semibold text-lg text-text-primary mb-1">
          {title}
        </h3>
        
        {/* Dealer & Location */}
        <p className="text-sm text-text-secondary mb-2">
          at {vehicle.dealer_name} • {vehicle.dealer_city}
        </p>
        
        {/* Vehicle Details */}
        <div className="flex items-center gap-4 text-sm text-text-secondary mb-3">
          {vehicle.mileage && (
            <span>{formatMileage(vehicle.mileage)}</span>
          )}
          {vehicle.exterior_color && (
            <span>{vehicle.exterior_color}</span>
          )}
        </div>
        
        {/* Down Payment */}
        <div className="mb-4">
          <p className="text-sm text-text-secondary">Down Payment Required</p>
          <p className="text-lg font-semibold text-primary">
            ${vehicle.down_payment_required?.toLocaleString() || 'Contact for details'}
          </p>
        </div>
        
        {/* CTA Button */}
        <Link href={`/vehicles/${vehicle.vin}`} className="block">
          <Button className="w-full" variant="primary">
            View Details & Request Price
          </Button>
        </Link>
      </div>
    </div>
  );
}