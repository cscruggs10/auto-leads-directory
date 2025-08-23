// Mock database for development without PostgreSQL
export const mockDatabase = {
  vehicles: [
    {
      vin: '1HGCM82633A123456',
      dealer_id: 1,
      year: 2018,
      make: 'Honda',
      model: 'Civic',
      mileage: 45000,
      down_payment_required: 1500,
      photos: [],
      dealer_name: 'Memphis Auto Sales',
      dealer_city: 'Memphis',
      dealer_state: 'TN',
      dealer_slug: 'memphis-auto-sales',
      exterior_color: 'Silver',
      interior_color: 'Black',
      transmission: 'CVT',
      engine: '2.0L I4',
      is_available: true,
      is_featured: true
    },
    {
      vin: '1FTFW1ET5DFC12345',
      dealer_id: 2,
      year: 2019,
      make: 'Ford',
      model: 'F-150',
      mileage: 38000,
      down_payment_required: 2000,
      photos: [],
      dealer_name: 'Beale Street Motors',
      dealer_city: 'Memphis',
      dealer_state: 'TN',
      dealer_slug: 'beale-street-motors',
      exterior_color: 'Blue',
      interior_color: 'Gray',
      transmission: '10-Speed Automatic',
      engine: '3.3L V6',
      is_available: true,
      is_featured: false
    },
    {
      vin: '1N4AL3AP0HC123456',
      dealer_id: 3,
      year: 2017,
      make: 'Nissan',
      model: 'Altima',
      mileage: 52000,
      down_payment_required: 1200,
      photos: [],
      dealer_name: 'Riverside Auto Group',
      dealer_city: 'Memphis',
      dealer_state: 'TN',
      dealer_slug: 'riverside-auto-group',
      exterior_color: 'White',
      interior_color: 'Beige',
      transmission: 'CVT',
      engine: '2.5L I4',
      is_available: true,
      is_featured: true
    }
  ],
  dealers: [
    {
      id: 1,
      name: 'Memphis Auto Sales',
      slug: 'memphis-auto-sales',
      city: 'Memphis',
      state: 'TN',
      logo_url: '/images/dealer-logo-1.jpg',
      average_rating: 4.5,
      description: 'Quality pre-owned vehicles with easy financing',
      vehicle_count: 25,
      is_active: true
    },
    {
      id: 2,
      name: 'Beale Street Motors',
      slug: 'beale-street-motors',
      city: 'Memphis',
      state: 'TN',
      logo_url: '/images/dealer-logo-2.jpg',
      average_rating: 4.2,
      description: 'Buy Here Pay Here specialist serving Memphis',
      vehicle_count: 18,
      is_active: true
    },
    {
      id: 3,
      name: 'Riverside Auto Group',
      slug: 'riverside-auto-group',
      city: 'Memphis',
      state: 'TN',
      logo_url: '/images/dealer-logo-3.jpg',
      average_rating: 4.7,
      description: 'Affordable vehicles with low down payments',
      vehicle_count: 32,
      is_active: true
    }
  ]
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  // Mock query implementation
  console.log('Mock Query:', text, params);
  
  if (text.includes('vehicles') && text.includes('SELECT')) {
    return {
      rows: mockDatabase.vehicles.filter(() => true), // Simple mock filtering
      rowCount: mockDatabase.vehicles.length
    };
  }
  
  if (text.includes('dealers') && text.includes('SELECT')) {
    return {
      rows: mockDatabase.dealers,
      rowCount: mockDatabase.dealers.length
    };
  }
  
  if (text.includes('INSERT INTO leads')) {
    return {
      rows: [{ id: Math.floor(Math.random() * 1000) }],
      rowCount: 1
    };
  }
  
  return { rows: [], rowCount: 0 };
};