import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function runMigrations(): Promise<void> {
  console.log('🚀 Starting database migrations...');
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection established');
    client.release();
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Executing database schema...');
    await pool.query(schema);
    console.log('✅ Database schema created successfully');
    
    // Check if we need to seed data
    const dealerCount = await pool.query('SELECT COUNT(*) FROM dealers');
    const count = parseInt(dealerCount.rows[0].count);
    
    if (count === 0) {
      console.log('📦 Database is empty, seeding initial data...');
      await seedInitialData();
    } else {
      console.log(`📊 Found ${count} existing dealers in database`);
    }
    
    console.log('🎉 Database migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export async function seedInitialData(): Promise<void> {
  console.log('🌱 Seeding initial data...');
  
  try {
    // Insert dealers
    const dealers = [
      {
        name: 'Memphis Auto Sales',
        slug: 'memphis-auto-sales',
        city: 'Memphis',
        state: 'TN',
        address: '123 Elvis Presley Blvd, Memphis, TN 38116',
        phone: '(901) 555-0101',
        email: 'sales@memphisautosales.com',
        website_url: 'https://memphisautosales.com',
        logo_url: '/images/dealers/memphis-auto-sales.jpg',
        average_rating: 4.5,
        total_reviews: 127,
        description: 'Quality pre-owned vehicles with easy financing options for all credit types',
        scraping_enabled: true,
        license_number: 'TN-D12345',
        business_hours: {
          monday: '9:00-18:00',
          tuesday: '9:00-18:00',
          wednesday: '9:00-18:00',
          thursday: '9:00-18:00',
          friday: '9:00-18:00',
          saturday: '9:00-17:00',
          sunday: 'closed'
        },
        services: ['financing', 'trade_ins', 'warranties', 'service']
      },
      {
        name: 'Beale Street Motors',
        slug: 'beale-street-motors',
        city: 'Memphis',
        state: 'TN',
        address: '456 Beale Street, Memphis, TN 38103',
        phone: '(901) 555-0202',
        email: 'info@bealestreetmotors.com',
        website_url: 'https://bealestreetmotors.com',
        logo_url: '/images/dealers/beale-street-motors.jpg',
        average_rating: 4.2,
        total_reviews: 89,
        description: 'Buy Here Pay Here specialist serving the Memphis community since 1994',
        scraping_enabled: true,
        license_number: 'TN-D23456',
        business_hours: {
          monday: '8:00-19:00',
          tuesday: '8:00-19:00',
          wednesday: '8:00-19:00',
          thursday: '8:00-19:00',
          friday: '8:00-19:00',
          saturday: '9:00-18:00',
          sunday: '12:00-17:00'
        },
        services: ['buy_here_pay_here', 'bad_credit_ok', 'trade_ins']
      },
      {
        name: 'Riverside Auto Group',
        slug: 'riverside-auto-group',
        city: 'Memphis',
        state: 'TN',
        address: '789 Riverside Dr, Memphis, TN 38103',
        phone: '(901) 555-0303',
        email: 'sales@riversideautogroup.com',
        website_url: 'https://riversideautogroup.com',
        logo_url: '/images/dealers/riverside-auto-group.jpg',
        average_rating: 4.7,
        total_reviews: 203,
        description: 'Affordable vehicles with low down payments and flexible terms',
        scraping_enabled: true,
        license_number: 'TN-D34567',
        business_hours: {
          monday: '9:00-20:00',
          tuesday: '9:00-20:00',
          wednesday: '9:00-20:00',
          thursday: '9:00-20:00',
          friday: '9:00-20:00',
          saturday: '9:00-19:00',
          sunday: '11:00-18:00'
        },
        services: ['financing', 'low_down_payments', 'trade_ins', 'warranties']
      }
    ];
    
    const dealerIds: number[] = [];
    
    for (const dealer of dealers) {
      const result = await pool.query(`
        INSERT INTO dealers (
          name, slug, city, state, address, phone, email, website_url, logo_url,
          average_rating, total_reviews, description, scraping_enabled, 
          license_number, business_hours, services
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
        dealer.name, dealer.slug, dealer.city, dealer.state, dealer.address,
        dealer.phone, dealer.email, dealer.website_url, dealer.logo_url,
        dealer.average_rating, dealer.total_reviews, dealer.description,
        dealer.scraping_enabled, dealer.license_number,
        JSON.stringify(dealer.business_hours), JSON.stringify(dealer.services)
      ]);
      
      dealerIds.push(result.rows[0].id);
      console.log(`✅ Inserted dealer: ${dealer.name}`);
    }
    
    // Insert sample vehicles
    const vehicles = [
      {
        vin: '1HGCM82633A123456',
        dealer_id: dealerIds[0],
        year: 2018,
        make: 'Honda',
        model: 'Civic',
        trim: 'LX',
        mileage: 45000,
        price: 16999.00,
        down_payment_required: 1500.00,
        exterior_color: 'Silver',
        interior_color: 'Black',
        transmission: 'CVT Automatic',
        engine: '2.0L 4-Cylinder',
        fuel_type: 'Gasoline',
        drivetrain: 'FWD',
        body_type: 'Sedan',
        doors: 4,
        mpg_city: 28,
        mpg_highway: 36,
        is_featured: true,
        features: ['Air Conditioning', 'Power Windows', 'Bluetooth', 'Backup Camera']
      },
      {
        vin: '1FTFW1ET5DFC12345',
        dealer_id: dealerIds[1],
        year: 2019,
        make: 'Ford',
        model: 'F-150',
        trim: 'XLT',
        mileage: 38000,
        price: 28999.00,
        down_payment_required: 2000.00,
        exterior_color: 'Blue',
        interior_color: 'Gray',
        transmission: '10-Speed Automatic',
        engine: '3.3L V6',
        fuel_type: 'Gasoline',
        drivetrain: '4WD',
        body_type: 'Pickup Truck',
        doors: 4,
        mpg_city: 19,
        mpg_highway: 25,
        is_featured: false,
        features: ['4WD', 'Tow Package', 'Power Seats', 'Apple CarPlay', 'Android Auto']
      },
      {
        vin: '1N4AL3AP0HC123456',
        dealer_id: dealerIds[2],
        year: 2017,
        make: 'Nissan',
        model: 'Altima',
        trim: '2.5 S',
        mileage: 52000,
        price: 14499.00,
        down_payment_required: 1200.00,
        exterior_color: 'White',
        interior_color: 'Beige',
        transmission: 'CVT Automatic',
        engine: '2.5L 4-Cylinder',
        fuel_type: 'Gasoline',
        drivetrain: 'FWD',
        body_type: 'Sedan',
        doors: 4,
        mpg_city: 27,
        mpg_highway: 38,
        is_featured: true,
        features: ['Push Button Start', 'Remote Start', 'Heated Seats', 'Sunroof']
      }
    ];
    
    for (const vehicle of vehicles) {
      await pool.query(`
        INSERT INTO vehicles (
          vin, dealer_id, year, make, model, trim, mileage, price, down_payment_required,
          exterior_color, interior_color, transmission, engine, fuel_type, drivetrain,
          body_type, doors, mpg_city, mpg_highway, is_featured, features
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      `, [
        vehicle.vin, vehicle.dealer_id, vehicle.year, vehicle.make, vehicle.model,
        vehicle.trim, vehicle.mileage, vehicle.price, vehicle.down_payment_required,
        vehicle.exterior_color, vehicle.interior_color, vehicle.transmission, vehicle.engine,
        vehicle.fuel_type, vehicle.drivetrain, vehicle.body_type, vehicle.doors,
        vehicle.mpg_city, vehicle.mpg_highway, vehicle.is_featured, JSON.stringify(vehicle.features)
      ]);
      
      console.log(`✅ Inserted vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    }
    
    // Update dealer vehicle counts
    await pool.query(`
      UPDATE dealers SET vehicle_count = (
        SELECT COUNT(*) FROM vehicles WHERE dealer_id = dealers.id AND is_available = true
      )
    `);
    
    console.log('🌱 Initial data seeded successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}