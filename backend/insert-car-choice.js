const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:aTEiNcPKJNFyJNZWZYoShDWayQSUrCjz@autorack.proxy.rlwy.net:53000/railway',
  ssl: { rejectUnauthorized: false }
});

async function insertCarChoiceVehicles() {
  try {
    console.log('🚗 Inserting Car Choice vehicles...');
    
    // Clear existing Car Choice vehicles first
    await pool.query('DELETE FROM vehicles WHERE dealer_id = 4');
    
    // Insert 5 test vehicles first to verify it works
    const insertQuery = `
      INSERT INTO vehicles (
        vin, dealer_id, year, make, model, title, 
        is_active, is_available, condition,
        created_at, updated_at
      ) VALUES
      ('CC2018MIT000001', 4, 2018, 'Mitsubishi', 'Outlander Sport SE 2.4 AWC CVT', '2018 Mitsubishi Outlander Sport SE 2.4 AWC CVT', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2014POR000002', 4, 2014, 'Porsche', 'Panamera 4dr HB', '2014 Porsche Panamera 4dr HB', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2019MER000003', 4, 2019, 'Mercedes-Benz', 'GLA-Class 4d SUV GLA250 4Matic', '2019 Mercedes-Benz GLA-Class 4d SUV GLA250 4Matic', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2015AUD000004', 4, 2015, 'Audi', 'A6 4d Sedan 2.0T Premium+', '2015 Audi A6 4d Sedan 2.0T Premium+', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2019AUD000005', 4, 2019, 'Audi', 'Q7 SE Premium Plus 55 TFSI quattro', '2019 Audi Q7 SE Premium Plus 55 TFSI quattro', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    
    await pool.query(insertQuery);
    
    // Check count
    const result = await pool.query('SELECT COUNT(*) FROM vehicles WHERE dealer_id = 4');
    console.log(`✅ Successfully inserted ${result.rows[0].count} Car Choice vehicles`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

insertCarChoiceVehicles();