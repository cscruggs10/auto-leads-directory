import https from 'https';
import http from 'http';
import pool from '../config/database';

interface ScrapedVehicle {
  vin: string;
  year: number;
  make: string;
  model: string;
  mileage?: number;
  price?: number;
  down_payment?: number;
  photos: string[];
  source_url: string;
  stock_number?: string;
  exterior_color?: string;
  interior_color?: string;
  transmission?: string;
  engine?: string;
}

export async function scrapeAllDealers(): Promise<void> {
  console.log('Starting scraping for all active dealers...');
  
  try {
    // Get all active dealers with scraping enabled
    const result = await pool.query(
      'SELECT * FROM dealers WHERE is_active = true AND scraping_enabled = true'
    );
    
    const dealers = result.rows;
    console.log(`Found ${dealers.length} dealers to scrape`);
    
    // Process dealers with concurrency limit
    const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_SCRAPES || '3');
    
    for (let i = 0; i < dealers.length; i += maxConcurrent) {
      const batch = dealers.slice(i, i + maxConcurrent);
      await Promise.all(batch.map((dealer: any) => scrapeDealerInventory(dealer.id)));
    }
    
    console.log('Completed scraping for all dealers');
  } catch (error) {
    console.error('Error in scrapeAllDealers:', error);
    throw error;
  }
}

// Helper function to fetch HTML using Node.js built-in modules
async function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
      timeout: 30000
    };
    
    const req = client.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data);
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

export async function scrapeDealerInventory(dealerId: number): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log(`Starting scraping for dealer ${dealerId}`);
    
    // Get dealer configuration
    const dealerResult = await pool.query(
      'SELECT * FROM dealers WHERE id = $1',
      [dealerId]
    );
    
    if (dealerResult.rows.length === 0) {
      throw new Error(`Dealer ${dealerId} not found`);
    }
    
    const dealer = dealerResult.rows[0];
    const config = dealer.scraping_config || {};
    
    // Create scraping log entry
    const logResult = await pool.query(
      `INSERT INTO scraping_logs (dealer_id, status, started_at) 
       VALUES ($1, 'in_progress', $2) 
       RETURNING id`,
      [dealerId, new Date()]
    );
    const logId = logResult.rows[0].id;
    
    console.log(`Fetching ${dealer.website_url}`);
    
    // Fetch the page with Node.js built-in modules
    const htmlContent = await fetchHtml(dealer.website_url);
    
    // Scrape vehicles from the HTML using regex parsing
    const vehicles = await scrapeVehiclesFromHTML(htmlContent, dealer.website_url, config);
    
    console.log(`Found ${vehicles.length} vehicles for dealer ${dealerId}`);
    
    // Process scraped vehicles
    let vehiclesAdded = 0;
    let vehiclesUpdated = 0;
    
    for (const vehicle of vehicles) {
      try {
        // Check if vehicle exists
        const existingResult = await pool.query(
          'SELECT vin FROM vehicles WHERE vin = $1',
          [vehicle.vin]
        );
        
        if (existingResult.rows.length > 0) {
          // Update existing vehicle
          await pool.query(
            `UPDATE vehicles SET
              mileage = $2,
              price = $3,
              down_payment_required = $4,
              photos = $5,
              is_available = true,
              last_scraped_at = NOW(),
              updated_at = NOW()
            WHERE vin = $1`,
            [
              vehicle.vin,
              vehicle.mileage,
              vehicle.price,
              vehicle.down_payment || (vehicle.price ? Math.min(vehicle.price * 0.1, 2000) : 1000),
              JSON.stringify(vehicle.photos)
            ]
          );
          vehiclesUpdated++;
        } else {
          // Insert new vehicle
          await pool.query(
            `INSERT INTO vehicles (
              vin, dealer_id, year, make, model, mileage, price,
              down_payment_required, photos, source_url, stock_number,
              exterior_color, interior_color, transmission, engine,
              is_available, last_scraped_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, NOW())`,
            [
              vehicle.vin,
              dealerId,
              vehicle.year,
              vehicle.make,
              vehicle.model,
              vehicle.mileage,
              vehicle.price,
              vehicle.down_payment || (vehicle.price ? Math.min(vehicle.price * 0.1, 2000) : 1000),
              JSON.stringify(vehicle.photos),
              vehicle.source_url,
              vehicle.stock_number,
              vehicle.exterior_color,
              vehicle.interior_color,
              vehicle.transmission,
              vehicle.engine
            ]
          );
          vehiclesAdded++;
        }
      } catch (error) {
        console.error(`Error processing vehicle ${vehicle.vin}:`, error);
      }
    }
    
    // Mark vehicles not in current scrape as unavailable
    const scrapedVins = vehicles.map(v => v.vin);
    if (scrapedVins.length > 0) {
      await pool.query(
        `UPDATE vehicles 
         SET is_available = false, updated_at = NOW() 
         WHERE dealer_id = $1 AND vin != ALL($2::varchar[])`,
        [dealerId, scrapedVins]
      );
    }
    
    // Update scraping log
    const duration = Date.now() - startTime;
    await pool.query(
      `UPDATE scraping_logs SET
        status = 'completed',
        vehicles_found = $2,
        vehicles_added = $3,
        vehicles_updated = $4,
        duration_ms = $5,
        completed_at = NOW()
      WHERE id = $1`,
      [logId, vehicles.length, vehiclesAdded, vehiclesUpdated, duration]
    );
    
    console.log(`Completed scraping for dealer ${dealerId}: ${vehiclesAdded} added, ${vehiclesUpdated} updated`);
    
  } catch (error) {
    console.error(`Error scraping dealer ${dealerId}:`, error);
    
    // Update scraping log with error
    await pool.query(
      `UPDATE scraping_logs SET
        status = 'failed',
        error_message = $2,
        duration_ms = $3,
        completed_at = NOW()
      WHERE dealer_id = $1 AND status = 'in_progress'`,
      [dealerId, (error as Error).message, Date.now() - startTime]
    );
    
    throw error;
  }
}

async function scrapeVehiclesFromHTML(html: string, baseUrl: string, config: any): Promise<ScrapedVehicle[]> {
  const vehicles: ScrapedVehicle[] = [];
  
  try {
    console.log('Analyzing page structure for vehicle listings...');
    
    // First, try to find JSON-LD structured data
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
    
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const jsonData = JSON.parse(jsonContent);
          if (jsonData['@type'] === 'Car' || jsonData.name) {
            console.log('Found structured data for vehicle:', jsonData.name || jsonData.model);
            // Extract vehicle from JSON-LD if available
          }
        } catch (e) {
          // Not valid JSON-LD, continue
        }
      }
    }
    
    // Look for price patterns as indicators of vehicle listings
    // Find all text content that contains dollar amounts
    const pricePattern = /\$[\d,]+(?:\.\d{2})?/g;
    const priceMatches = html.match(pricePattern) || [];
    
    console.log(`Found ${priceMatches.length} price patterns`);
    
    // Split HTML into chunks around price patterns to analyze context
    const htmlChunks = html.split(/(?=\$[\d,]+)/);
    
    for (const chunk of htmlChunks) {
      if (vehicles.length >= 20) break; // Limit results
      
      // Extract price from this chunk
      const priceMatch = chunk.match(/\$(\d{1,3}(?:,\d{3})*)(?:\.\d{2})?/);
      if (!priceMatch) continue;
      
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (price < 5000 || price > 100000) continue; // Skip unrealistic prices
      
      // Remove HTML tags to get clean text for analysis
      const cleanText = chunk.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Look for year pattern (4 digits between 1990-2025)
      const yearMatch = cleanText.match(/\b(19[9][0-9]|20[0-2][0-9])\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;
      
      // Look for make/model patterns
      const makes = ['Ford', 'Chevrolet', 'Chevy', 'Toyota', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Jeep', 'Dodge', 'Chrysler', 'Buick', 'GMC', 'Cadillac', 'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Mazda', 'Subaru', 'Mitsubishi', 'Acura', 'Lexus', 'Infiniti'];
      
      let make = '';
      let model = '';
      
      for (const brandName of makes) {
        const regex = new RegExp(`\\b${brandName}\\b`, 'i');
        if (regex.test(cleanText)) {
          make = brandName;
          // Try to extract model after make
          const makeIndex = cleanText.toLowerCase().indexOf(brandName.toLowerCase());
          const afterMake = cleanText.substring(makeIndex + brandName.length).trim();
          const modelMatch = afterMake.match(/^\s*([A-Za-z0-9\-]+)/);
          if (modelMatch) {
            model = modelMatch[1];
          }
          break;
        }
      }
      
      // Look for mileage
      const mileageMatch = cleanText.match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi)/i);
      const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : undefined;
      
      // Look for stock number
      const stockMatch = cleanText.match(/(?:stock|sku|id)[#:\s]*([A-Z0-9\-]+)/i);
      const stockNumber = stockMatch ? stockMatch[1] : undefined;
      
      if (year && make && model) {
        const vin = generateDemoVIN(); // Generate demo VIN
        
        vehicles.push({
          vin,
          year,
          make,
          model: model.trim(),
          price,
          mileage,
          down_payment: Math.min(price * 0.1, 2000),
          photos: [],
          source_url: baseUrl,
          stock_number: stockNumber
        });
        
        console.log(`Extracted vehicle: ${year} ${make} ${model} - $${price}${mileage ? ` (${mileage} mi)` : ''}`);
      }
    }
    
    console.log(`Successfully extracted ${vehicles.length} vehicles`);
    
  } catch (error) {
    console.error('Error in scrapeVehiclesFromHTML:', error);
  }
  
  return vehicles;
}

function generateDemoVIN(): string {
  // Generate a demo VIN for testing (17 characters)
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars[Math.floor(Math.random() * chars.length)];
  }
  return vin;
}