'use client';

import { useState, useEffect } from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface SearchFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void;
  loading?: boolean;
}

interface SearchFilters {
  region: string;
  year_min: string;
  year_max: string;
  make: string;
  model: string;
  down_payment_max: string;
  mileage_max: string;
}

// Mock data - in production, fetch from API
const REGIONS = [
  { value: 'memphis-tn', label: 'Memphis, TN' },
  { value: 'nashville-tn', label: 'Nashville, TN' },
  { value: 'knoxville-tn', label: 'Knoxville, TN' }
];

const MAKES = [
  { value: 'chevrolet', label: 'Chevrolet' },
  { value: 'ford', label: 'Ford' },
  { value: 'dodge', label: 'Dodge' },
  { value: 'toyota', label: 'Toyota' },
  { value: 'honda', label: 'Honda' },
  { value: 'nissan', label: 'Nissan' },
  { value: 'hyundai', label: 'Hyundai' },
  { value: 'kia', label: 'Kia' }
];

const MODELS_BY_MAKE: { [key: string]: { value: string; label: string }[] } = {
  chevrolet: [
    { value: 'silverado', label: 'Silverado' },
    { value: 'equinox', label: 'Equinox' },
    { value: 'malibu', label: 'Malibu' },
    { value: 'impala', label: 'Impala' }
  ],
  ford: [
    { value: 'f-150', label: 'F-150' },
    { value: 'escape', label: 'Escape' },
    { value: 'focus', label: 'Focus' },
    { value: 'fusion', label: 'Fusion' }
  ],
  toyota: [
    { value: 'camry', label: 'Camry' },
    { value: 'corolla', label: 'Corolla' },
    { value: 'rav4', label: 'RAV4' },
    { value: 'highlander', label: 'Highlander' }
  ]
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1999 }, (_, i) => ({
  value: (currentYear - i).toString(),
  label: (currentYear - i).toString()
}));

const DOWN_PAYMENT_OPTIONS = [
  { value: '1000', label: 'Under $1,000' },
  { value: '2000', label: 'Under $2,000' },
  { value: '3000', label: 'Under $3,000' },
  { value: '5000', label: 'Under $5,000' },
  { value: '10000', label: 'Under $10,000' }
];

const MILEAGE_OPTIONS = [
  { value: '50000', label: 'Under 50k miles' },
  { value: '75000', label: 'Under 75k miles' },
  { value: '100000', label: 'Under 100k miles' },
  { value: '150000', label: 'Under 150k miles' }
];

export function SearchFilters({ onFiltersChange, loading }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    region: 'memphis-tn',
    year_min: '',
    year_max: '',
    make: '',
    model: '',
    down_payment_max: '',
    mileage_max: ''
  });

  const availableModels = filters.make ? MODELS_BY_MAKE[filters.make] || [] : [];

  useEffect(() => {
    // Reset model when make changes
    if (filters.make && !availableModels.find(m => m.value === filters.model)) {
      setFilters(prev => ({ ...prev, model: '' }));
    }
  }, [filters.make, availableModels, filters.model]);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: SearchFilters = {
      region: 'memphis-tn',
      year_min: '',
      year_max: '',
      make: '',
      model: '',
      down_payment_max: '',
      mileage_max: ''
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <div className="bg-surface p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Find Your Perfect Vehicle
        </h2>
        <Button variant="ghost" onClick={handleClearFilters}>
          Clear All
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Region */}
        <Select
          label="Region"
          value={filters.region}
          onChange={(e) => handleFilterChange('region', e.target.value)}
          options={REGIONS}
        />
        
        {/* Year Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            Year Range
          </label>
          <div className="flex gap-2">
            <Select
              placeholder="Min Year"
              value={filters.year_min}
              onChange={(e) => handleFilterChange('year_min', e.target.value)}
              options={YEARS}
              className="flex-1"
            />
            <Select
              placeholder="Max Year"
              value={filters.year_max}
              onChange={(e) => handleFilterChange('year_max', e.target.value)}
              options={YEARS}
              className="flex-1"
            />
          </div>
        </div>
        
        {/* Make */}
        <Select
          label="Make"
          placeholder="Any Make"
          value={filters.make}
          onChange={(e) => handleFilterChange('make', e.target.value)}
          options={MAKES}
        />
        
        {/* Model */}
        <Select
          label="Model"
          placeholder={filters.make ? 'Any Model' : 'Select Make First'}
          value={filters.model}
          onChange={(e) => handleFilterChange('model', e.target.value)}
          options={availableModels}
          disabled={!filters.make}
        />
        
        {/* Down Payment */}
        <Select
          label="Max Down Payment"
          placeholder="Any Amount"
          value={filters.down_payment_max}
          onChange={(e) => handleFilterChange('down_payment_max', e.target.value)}
          options={DOWN_PAYMENT_OPTIONS}
        />
        
        {/* Mileage */}
        <Select
          label="Max Mileage"
          placeholder="Any Mileage"
          value={filters.mileage_max}
          onChange={(e) => handleFilterChange('mileage_max', e.target.value)}
          options={MILEAGE_OPTIONS}
        />
      </div>
      
      {/* Search Button for Mobile */}
      <div className="mt-4 md:hidden">
        <Button className="w-full" disabled={loading}>
          {loading ? 'Searching...' : 'Update Results'}
        </Button>
      </div>
    </div>
  );
}