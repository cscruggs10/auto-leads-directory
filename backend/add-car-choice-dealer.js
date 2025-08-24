const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addCarChoiceDealer() {
  const client = await pool.connect();
  
  try {
    console.log('Adding Car Choice dealer with Browse AI bot configuration...');
    
    // Car Choice dealer configuration
    const dealerData = {
      name: 'Car Choice',
      slug: 'car-choice',
      website_url: 'https://carchoice.com', // Update with actual URL
      city: 'Memphis',
      state: 'TN',
      description: 'Quality pre-owned vehicles with flexible financing options in Memphis, TN',
      scraping_enabled: true,
      scraping_config: {
        browse_ai: {
          botId: '0198dc74-5ba6-7637-b1b0-b68de2a5e2bc',
          listName: 'vehicles', // Adjust based on Browse AI bot configuration
          inputParameters: {}, // Add any required input parameters
          fieldMapping: {
            // Customize these based on Car Choice Browse AI bot output
            year: 'year',
            make: 'make', 
            model: 'model',
            price: 'price',
            mileage: 'mileage',
            photos: 'images',
            stockNumber: 'stock_number',
            exteriorColor: 'exterior_color',
            url: 'vehicle_url'
          }
        },
        // Legacy support for existing scraper
        browse_ai_bot_id: '0198dc74-5ba6-7637-b1b0-b68de2a5e2bc'
      }
    };
    
    // Check if dealer already exists
    const existingDealer = await client.query(
      'SELECT id FROM dealers WHERE slug = $1',
      [dealerData.slug]
    );
    
    if (existingDealer.rows.length > 0) {
      // Update existing dealer
      const result = await client.query(
        `UPDATE dealers SET 
          name = $1,
          website_url = $2,
          city = $3,
          state = $4,
          description = $5,
          scraping_enabled = $6,
          scraping_config = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE slug = $8
        RETURNING id, name`,
        [
          dealerData.name,
          dealerData.website_url,
          dealerData.city,
          dealerData.state,
          dealerData.description,
          dealerData.scraping_enabled,
          JSON.stringify(dealerData.scraping_config),
          dealerData.slug
        ]
      );
      
      console.log(`✅ Updated Car Choice dealer (ID: ${result.rows[0].id})`);
    } else {
      // Insert new dealer
      const result = await client.query(
        `INSERT INTO dealers (
          name, slug, website_url, city, state, description,
          scraping_enabled, scraping_config
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name`,
        [
          dealerData.name,
          dealerData.slug,
          dealerData.website_url,
          dealerData.city,
          dealerData.state,
          dealerData.description,
          dealerData.scraping_enabled,
          JSON.stringify(dealerData.scraping_config)
        ]
      );
      
      console.log(`✅ Added Car Choice dealer (ID: ${result.rows[0].id})`);
    }
    
    console.log('Car Choice dealer configuration:');
    console.log('- Browse AI Bot ID:', dealerData.scraping_config.browse_ai.botId);
    console.log('- Field mapping configured for common vehicle fields');
    console.log('- Ready for scraping!');
    
  } catch (error) {
    console.error('Error adding Car Choice dealer:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
addCarChoiceDealer();