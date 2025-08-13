'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LeadCaptureForm } from '@/components/forms/LeadCaptureForm';
import { useVehicle } from '@/hooks/useVehicles';
import { formatMileage, formatPrice } from '@/lib/utils';

export default function VehicleDetailPage() {
  const params = useParams();
  const vin = params.vin as string;
  const { data, isLoading, error } = useVehicle(vin);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded-lg mb-8"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-4">Vehicle Not Found</h1>
        <p className="text-text-secondary mb-8">The vehicle you're looking for is no longer available.</p>
        <Button onClick={() => router.push('/')}>Browse Other Vehicles</Button>
      </div>
    );
  }

  const vehicle = data.data;
  const photos = vehicle.photos || [];
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="text-sm">
            <a href="/" className="text-text-secondary hover:text-primary">Home</a>
            <span className="mx-2 text-text-secondary">/</span>
            <a href="/" className="text-text-secondary hover:text-primary">Vehicles</a>
            <span className="mx-2 text-text-secondary">/</span>
            <span className="text-text-primary">{title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div>
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="relative h-96">
                {photos.length > 0 ? (
                  <Image
                    src={photos[selectedImage] || '/images/no-vehicle-image.jpg'}
                    alt={title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image available</span>
                  </div>
                )}
              </div>
              
              {photos.length > 1 && (
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {photos.slice(0, 8).map((photo: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`relative h-20 rounded overflow-hidden border-2 ${
                          selectedImage === index ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <Image
                          src={photo}
                          alt={`${title} ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle Specifications */}
            <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">Specifications</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-text-secondary">VIN:</span>
                  <span className="ml-2 font-medium">{vehicle.vin}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Stock #:</span>
                  <span className="ml-2 font-medium">{vehicle.stock_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Mileage:</span>
                  <span className="ml-2 font-medium">{formatMileage(vehicle.mileage)}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Exterior:</span>
                  <span className="ml-2 font-medium">{vehicle.exterior_color || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Interior:</span>
                  <span className="ml-2 font-medium">{vehicle.interior_color || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Transmission:</span>
                  <span className="ml-2 font-medium">{vehicle.transmission || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Engine:</span>
                  <span className="ml-2 font-medium">{vehicle.engine || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Drivetrain:</span>
                  <span className="ml-2 font-medium">{vehicle.drivetrain || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Info & Lead Form */}
          <div>
            {!showLeadForm ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-3xl font-bold text-text-primary mb-2">{title}</h1>
                
                {/* Dealer Info */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-text-secondary">at</span>
                  <a href={`/dealers/${vehicle.dealer_slug}`} className="text-primary hover:underline">
                    {vehicle.dealer_name}
                  </a>
                  <span className="text-text-secondary">•</span>
                  <span className="text-text-secondary">{vehicle.dealer_city}, {vehicle.dealer_state}</span>
                </div>

                {/* Pricing */}
                <div className="border-t border-b py-6 mb-6">
                  <div className="mb-4">
                    <p className="text-text-secondary mb-1">Required Down Payment</p>
                    <p className="text-3xl font-bold text-primary">
                      ${vehicle.down_payment_required?.toLocaleString() || 'Contact for details'}
                    </p>
                  </div>
                  
                  {vehicle.monthly_payment_estimate && (
                    <div>
                      <p className="text-text-secondary mb-1">Estimated Monthly Payment</p>
                      <p className="text-2xl font-semibold text-text-primary">
                        ${vehicle.monthly_payment_estimate}/mo
                      </p>
                    </div>
                  )}
                  
                  <p className="text-sm text-text-secondary mt-4">
                    * Final pricing and terms subject to approval and dealer verification
                  </p>
                </div>

                {/* Features */}
                {vehicle.features && vehicle.features.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-text-primary mb-3">Features</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {vehicle.features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center">
                          <svg className="w-4 h-4 text-success mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {vehicle.description && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-text-primary mb-3">Description</h3>
                    <p className="text-text-secondary">{vehicle.description}</p>
                  </div>
                )}

                {/* CTA Buttons */}
                <div className="space-y-3">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setShowLeadForm(true)}
                  >
                    Request Price & Schedule Test Drive
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    size="lg"
                  >
                    Call Dealer: {vehicle.dealer_phone}
                  </Button>
                </div>

                {/* Dealer Rating */}
                {vehicle.dealer_rating && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">Dealer Rating</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(vehicle.dealer_rating)
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="ml-2 text-text-secondary">
                          ({vehicle.dealer_rating.toFixed(1)})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <LeadCaptureForm 
                vehicleVin={vehicle.vin}
                vehicleInfo={{
                  year: vehicle.year,
                  make: vehicle.make,
                  model: vehicle.model
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}