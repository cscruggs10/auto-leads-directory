'use client';

import { SearchFilters } from '@/components/forms/SearchFilters';
import { VehicleCard } from '@/components/cards/VehicleCard';
import { Button } from '@/components/ui/Button';
import { DealershipsNetwork } from '@/components/sections/DealershipsNetwork';
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

export default function HomePage() {
  const { filters, updateFilters } = useFilters();
  const { data, isLoading } = useVehicles(filters);
  const vehiclesData = data as VehiclesResponse | undefined;
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
      <section className="relative bg-gradient-to-br from-gray-50 to-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl lg:text-6xl font-bold text-text-primary mb-6 leading-tight">
              Memphis Car Shoppers: Stop Begging Dealerships for Approval.{' '}
              <span className="text-primary">Make Them Compete for YOU.</span>
            </h1>
            <p className="text-xl lg:text-2xl text-text-secondary mb-12 leading-relaxed">
              We'll share your info with our network of 50+ Memphis dealerships who WANT subprime buyers. 
              Watch them fight to earn your business with their best offers.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto mb-16">
              <div className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">50+</div>
                <div className="text-text-secondary font-medium">Competing Dealerships</div>
              </div>
              <div className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">5+</div>
                <div className="text-text-secondary font-medium">Avg Offers Per Buyer</div>
              </div>
              <div className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-primary mb-2">1994</div>
                <div className="text-text-secondary font-medium">Industry Insiders Since</div>
              </div>
            </div>
            
            {/* Trust Builders */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-sm">
              <div className="text-center p-4 bg-white/50 rounded-xl border border-border-light">
                <div className="text-secondary font-bold">✓</div>
                <div className="font-medium text-text-primary">One Application</div>
                <div className="text-text-light text-xs">No more filling out forms at every lot</div>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-xl border border-border-light">
                <div className="text-secondary font-bold">✓</div>
                <div className="font-medium text-text-primary">Multiple Approvals</div>
                <div className="text-text-light text-xs">Dealerships compete for your business</div>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-xl border border-border-light">
                <div className="text-secondary font-bold">✓</div>
                <div className="font-medium text-text-primary">Better Terms</div>
                <div className="text-text-light text-xs">Competition drives down your rate</div>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-xl border border-border-light">
                <div className="text-secondary font-bold">✓</div>
                <div className="font-medium text-text-primary">Expert Guidance</div>
                <div className="text-text-light text-xs">We know who approves what</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dealerships Network */}
      <DealershipsNetwork />

      {/* Search Filters */}
      <section className="py-12 bg-background-gray">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-surface rounded-3xl shadow-search p-8 border border-border-light">
            <SearchFilters onFiltersChange={handleFiltersChange} loading={isLoading} />
          </div>
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
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-text-primary mb-2">
                {vehiclesData?.pagination?.total || 0} dealerships ready to compete for you
              </h2>
              <p className="text-text-secondary">
                Each vehicle connects you with a dealer who actively wants subprime buyers
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary font-medium">Sort by:</span>
              <select
                className="px-4 py-2 border border-border rounded-xl bg-surface text-text-primary font-medium focus:outline-none focus:border-text-primary transition-colors"
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
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-surface rounded-2xl shadow-card p-6 animate-pulse border border-border-light">
                  <div className="h-56 bg-background-gray rounded-xl mb-6"></div>
                  <div className="h-6 bg-background-gray rounded-lg mb-3"></div>
                  <div className="h-4 bg-background-gray rounded-lg w-3/4 mb-4"></div>
                  <div className="h-4 bg-background-gray rounded-lg w-1/2 mb-6"></div>
                  <div className="h-12 bg-background-gray rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : vehiclesData?.data && vehiclesData.data.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              <Button variant="outline" onClick={() => updateFilters({})}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-primary-hover text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Ready to get behind the wheel?
          </h2>
          <p className="text-xl lg:text-2xl mb-10 text-white/90 leading-relaxed">
            Get pre-approved in minutes and drive home today with easy financing 
            options for all credit types.
          </p>
          <button className="bg-white text-primary hover:bg-gray-50 font-bold py-4 px-8 rounded-2xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl">
            Get Pre-Approved Now
          </button>
        </div>
      </section>
    </div>
  );
}