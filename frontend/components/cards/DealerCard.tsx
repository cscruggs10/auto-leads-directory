import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface Dealer {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  city: string;
  state: string;
  average_rating?: number;
  vehicle_count?: number;
  description?: string;
}

interface DealerCardProps {
  dealer: Dealer;
}

export function DealerCard({ dealer }: DealerCardProps) {
  return (
    <div className="bg-surface rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6">
      {/* Header with Logo and Name */}
      <div className="flex items-start gap-4 mb-4">
        {dealer.logo_url ? (
          <div className="relative w-16 h-16 flex-shrink-0">
            <Image
              src={dealer.logo_url}
              alt={`${dealer.name} logo`}
              fill
              className="object-contain rounded"
            />
          </div>
        ) : (
          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-gray-400 text-xs text-center">
              No Logo
            </span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-text-primary truncate">
            {dealer.name}
          </h3>
          <p className="text-text-secondary text-sm">
            {dealer.city}, {dealer.state}
          </p>
          
          {/* Rating */}
          {dealer.average_rating && dealer.average_rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(dealer.average_rating!)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-text-secondary">
                ({dealer.average_rating.toFixed(1)})
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Description */}
      {dealer.description && (
        <p className="text-text-secondary text-sm mb-4 line-clamp-2">
          {dealer.description}
        </p>
      )}
      
      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm">
          <span className="text-text-secondary">Available Vehicles: </span>
          <span className="font-semibold text-text-primary">
            {dealer.vehicle_count || 0}
          </span>
        </div>
      </div>
      
      {/* CTA Button */}
      <Link href={`/dealers/${dealer.slug}`} className="block">
        <Button className="w-full" variant="outline">
          View Inventory
        </Button>
      </Link>
    </div>
  );
}