const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Use Railway production database directly
const pool = new Pool({
  connectionString: 'postgresql://postgres:aTEiNcPKJNFyJNZWZYoShDWayQSUrCjz@autorack.proxy.rlwy.net:53000/railway',
  ssl: { rejectUnauthorized: false }
});

// Parse vehicle info string into components
function parseVehicleInfoString(vehicleInfo) {
  if (!vehicleInfo) return {};
  
  const trimmed = vehicleInfo.trim();
  console.log('Parsing vehicle info:', trimmed);
  
  // Extract year (4 digits at the start)
  const yearMatch = trimmed.match(/^\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0]) : null;
  
  // Remove year and trim
  let remaining = yearMatch ? trimmed.substring(4).trim() : trimmed;
  
  // Extract make (next word after year)
  const makeMatch = remaining.match(/^(\w+)/);
  const make = makeMatch ? makeMatch[1] : null;
  
  // Remove make and trim
  remaining = makeMatch ? remaining.substring(makeMatch[1].length).trim() : remaining;
  
  // The rest is the model
  const model = remaining || null;
  
  return {
    year,
    make,
    model: model ? model.substring(0, 255) : null // Ensure model fits in VARCHAR(255)
  };
}

async function importCSV() {
  const csvFilePath = '/Users/coreyscruggs/Downloads/car-choice-inventory-list_car-choice-inventory_captured-list_2025-08-24_13-43-26_0198dd63-042d-7534-98ee-26e554056e5e.csv';
  
  try {
    // Get Car Choice dealer ID
    const dealerResult = await pool.query(
      'SELECT id FROM dealers WHERE name = $1',
      ['Car Choice']
    );
    
    if (dealerResult.rows.length === 0) {
      throw new Error('Car Choice dealer not found in database');
    }
    
    const dealerId = dealerResult.rows[0].id;
    console.log(`Found Car Choice dealer with ID: ${dealerId}`);
    
    // Read CSV file
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvContent.split('\n');
    
    // Skip header row
    const dataLines = lines.slice(1).filter(line => line.trim());
    
    console.log(`Processing ${dataLines.length} vehicles from CSV...`);
    
    let processed = 0;
    let errors = 0;
    
    for (const line of dataLines) {
      try {
        // Parse CSV line (simple split for this format)
        const [position, vehicleInfo, imageUrl] = line.split(',');
        
        if (!vehicleInfo) {
          console.log(`Skipping line with no vehicle info: ${line}`);
          continue;
        }
        
        // Clean up the data
        const cleanVehicleInfo = vehicleInfo.replace(/^"|"$/g, '').trim();
        const cleanImageUrl = imageUrl ? imageUrl.replace(/^"|"$/g, '').trim() : null;
        
        // Skip if no vehicle info after cleaning
        if (!cleanVehicleInfo) {
          console.log(`Skipping line with empty vehicle info after cleaning`);
          continue;
        }
        
        // Parse vehicle components
        const { year, make, model } = parseVehicleInfoString(cleanVehicleInfo);
        
        if (!year || !make) {
          console.log(`Skipping vehicle with missing year/make: ${cleanVehicleInfo}`);
          continue;
        }
        
        // Generate a VIN-like identifier (since we don't have real VINs)
        const vin = `CC${year}${make.substring(0, 3).toUpperCase()}${String(processed + 1).padStart(6, '0')}`;
        
        // Insert vehicle into database
        await pool.query(`
          INSERT INTO vehicles (
            vin, year, make, model, dealer_id, 
            title, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (vin) DO UPDATE SET
            year = EXCLUDED.year,
            make = EXCLUDED.make,
            model = EXCLUDED.model,
            title = EXCLUDED.title,
            updated_at = CURRENT_TIMESTAMP
        `, [
          vin,
          year,
          make,
          model,
          dealerId,
          cleanVehicleInfo,
          true
        ]);
        
        // Add image if provided and not a placeholder
        if (cleanImageUrl && !cleanImageUrl.includes('onepix.png') && cleanImageUrl.startsWith('http')) {
          await pool.query(`
            INSERT INTO vehicle_images (vehicle_vin, image_url, is_primary, created_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (vehicle_vin, image_url) DO NOTHING
          `, [vin, cleanImageUrl, true]);
        }
        
        processed++;
        console.log(`✅ Processed: ${cleanVehicleInfo}`);
        
      } catch (error) {
        errors++;
        console.error(`❌ Error processing line: ${line}`);
        console.error(error.message);
      }
    }
    
    console.log(`\n📊 Import Summary:`);
    console.log(`✅ Successfully processed: ${processed} vehicles`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`🏪 Dealer: Car Choice (ID: ${dealerId})`);
    
    // Show final count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM vehicles WHERE dealer_id = $1',
      [dealerId]
    );
    console.log(`🚗 Total vehicles for Car Choice: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ CSV import failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the import
console.log('🚀 Starting Browse AI CSV import...');
importCSV();