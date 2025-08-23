const { Pool } = require('pg');
require('dotenv').config();

// Use Railway database URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addCarWorldGroup() {
  try {
    console.log('🚀 Adding Car World Group to production database...');
    
    const result = await pool.query(`
      INSERT INTO dealers (
        name, slug, city, state, address, phone, email, website_url, logo_url,
        average_rating, total_reviews, description, scraping_enabled, 
        license_number, business_hours, services
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, name
    `, [
      'Car World Group',
      'car-world-group',
      'Memphis',
      'TN',
      '123 Main Street, Memphis, TN 38103',
      '(501) 999-9999',
      'sales@carworldgroup.com',
      'https://www.carworldarkansas.com/used-cars-memphis-tn',
      '/images/dealers/car-world-group.jpg',
      4.3,
      0,
      'Bad Credit In-House Financing specialist serving Memphis area with guaranteed approval options',
      true,
      'TN-CWG2024',
      JSON.stringify({
        monday: '9:00-19:00',
        tuesday: '9:00-19:00', 
        wednesday: '9:00-19:00',
        thursday: '9:00-19:00',
        friday: '9:00-19:00',
        saturday: '9:00-18:00',
        sunday: '12:00-17:00'
      }),
      JSON.stringify(['bad_credit_ok', 'in_house_financing', 'guaranteed_approval', 'trade_ins'])
    ]);
    
    console.log(`✅ Successfully added: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    
    // Add a sample vehicle for Car World Group
    await pool.query(`
      INSERT INTO vehicles (
        vin, dealer_id, year, make, model, trim, mileage, price, down_payment_required,
        exterior_color, interior_color, transmission, engine, fuel_type, drivetrain,
        body_type, doors, mpg_city, mpg_highway, is_featured, features
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    `, [
      '1G1ZD5ST9KF123456',
      result.rows[0].id,
      2019,
      'Chevrolet',
      'Malibu',
      'LS',
      47000,
      17999.00,
      999.00,
      'Red',
      'Black',
      'CVT Automatic', 
      '1.5L Turbo 4-Cylinder',
      'Gasoline',
      'FWD',
      'Sedan',
      4,
      29,
      36,
      true,
      JSON.stringify(['Backup Camera', 'Bluetooth', 'Power Windows', 'A/C', 'Low Down Payment'])
    ]);
    
    console.log('✅ Added sample vehicle for Car World Group');
    
    // Update dealer vehicle count
    await pool.query(`
      UPDATE dealers SET vehicle_count = (
        SELECT COUNT(*) FROM vehicles WHERE dealer_id = $1 AND is_available = true
      ) WHERE id = $1
    `, [result.rows[0].id]);
    
    console.log('🎉 Car World Group successfully added to production database!');
    
  } catch (error) {
    console.error('❌ Error adding dealer:', error);
  } finally {
    await pool.end();
  }
}

addCarWorldGroup();