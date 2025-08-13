'use client';

import { SearchFilters } from '@/components/forms/SearchFilters';
import { VehicleCard } from '@/components/cards/VehicleCard';
import { Button } from '@/components/ui/Button';
import { useVehicles, useFeaturedVehicles } from '@/hooks/useVehicles';
import { useFilters } from '@/contexts/FilterContext';

interface SearchFiltersType {
  region: string;
  year_min: string;
  year_max: string;
  make: string;
  model: string;
  down_payment_max: string;
  mileage_max: string;
}

export default function HomePage() {
  const { filters, updateFilters } = useFilters();
  const { data: vehiclesData, isLoading } = useVehicles(filters);
  const { data: featuredData } = useFeaturedVehicles();

  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    updateFilters({ ...newFilters, page: 1 });
  };

  const handlePageChange = (page: number) => {
    updateFilters({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary to-primary/90 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your Perfect Vehicle in Memphis
            </h1>
            <p className="text-xl mb-8 text-white/90">
              Quality pre-owned vehicles with easy financing and low down payments
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold">500+</div>
                <div className="text-sm">Available Vehicles</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">$500</div>
                <div className="text-sm">Min Down Payment</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">24hrs</div>
                <div className="text-sm">Quick Approval</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Filters */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SearchFilters onFiltersChange={handleFiltersChange} loading={isLoading} />
        </div>
      </section>

      {/* Featured Vehicles */}
      {featuredData?.data && featuredData.data.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-text-primary mb-8">Featured Vehicles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredData.data.slice(0, 4).map((vehicle: any) => (
                <VehicleCard key={vehicle.vin} vehicle={vehicle} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Search Results */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-text-primary">
              {vehiclesData?.pagination?.total || 0} Vehicles Found
            </h2>
            <select
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={filters.sort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
            >
              <option value="created_at_desc">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="year_desc">Year: Newest</option>
              <option value="year_asc">Year: Oldest</option>
              <option value="mileage_asc">Mileage: Low to High</option>
            </select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : vehiclesData?.data && vehiclesData.data.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {vehiclesData.data.map((vehicle: any) => (
                  <VehicleCard key={vehicle.vin} vehicle={vehicle} />
                ))}
              </div>

              {/* Pagination */}
              {vehiclesData.pagination.totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(filters.page - 1)}
                      disabled={filters.page === 1}
                    >
                      Previous
                    </Button>
                    
                    {[...Array(Math.min(5, vehiclesData.pagination.totalPages))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={filters.page === pageNum ? 'primary' : 'outline'}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(filters.page + 1)}
                      disabled={filters.page === vehiclesData.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl text-text-secondary mb-4">
                No vehicles found matching your criteria
              </p>
              <Button variant="outline" onClick={() => updateFilters(defaultFilters)}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Behind the Wheel?
          </h2>
          <p className="text-xl mb-8">
            Apply for pre-approval in minutes and drive home today!
          </p>
          <Button size="lg" variant="secondary">
            Get Pre-Approved Now
          </Button>
        </div>
      </section>
    </div>
  );
}