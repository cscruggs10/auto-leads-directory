import axios from 'axios';
import * as cheerio from 'cheerio';
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
    
    // Fetch the page with Axios
    const response = await axios.get(dealer.website_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      timeout: 30000
    });
    
    // Load HTML into Cheerio
    const $ = cheerio.load(response.data);
    
    // Scrape vehicles from the HTML
    const vehicles = await scrapeVehiclesFromHTML($, dealer.website_url, config);
    
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

async function scrapeVehiclesFromHTML($: cheerio.CheerioAPI, baseUrl: string, config: any): Promise<ScrapedVehicle[]> {
  const vehicles: ScrapedVehicle[] = [];
  
  try {
    console.log('Analyzing page structure for vehicle listings...');
    
    // First, try to find JSON-LD structured data
    const jsonLdScripts = $('script[type="application/ld+json"]');
    
    jsonLdScripts.each((i, script) => {
      try {
        const jsonData = JSON.parse($(script).html() || '');
        if (jsonData['@type'] === 'Car' || jsonData.name) {
          console.log('Found structured data for vehicle:', jsonData.name || jsonData.model);
          // Extract vehicle from JSON-LD if available
        }
      } catch (e) {
        // Not valid JSON-LD, continue
      }
    });
    
    // Look for common vehicle listing patterns
    const possibleSelectors = [
      '.vehicle-item', '.car-item', '.inventory-item', '.listing-item',
      '.vehicle', '.car', '.auto-item', '[data-vehicle]',
      '.vehicle-card', '.car-card', '.inventory-card'
    ];
    
    let vehicleElements: cheerio.Cheerio<any> | null = null;
    
    for (const selector of possibleSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} potential vehicles using selector: ${selector}`);
        vehicleElements = elements;
        break;
      }
    }
    
    // If no specific vehicle containers found, look for patterns in the page
    if (!vehicleElements || vehicleElements.length === 0) {
      console.log('No vehicle containers found, looking for price patterns...');
      
      // Look for price patterns as indicators of vehicle listings
      const priceElements = $('*:contains("$")').filter((i, el) => {
        const text = $(el).text();
        return /\$[\d,]+/.test(text) && parseInt(text.replace(/[^0-9]/g, '')) > 5000;
      });
      
      console.log(`Found ${priceElements.length} price elements`);
      
      // Try to find vehicle info near price elements
      priceElements.each((i, priceEl) => {
        if (vehicles.length >= 20) return; // Limit results
        
        const $priceEl = $(priceEl);
        const priceText = $priceEl.text().trim();
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        
        if (price < 5000 || price > 100000) return; // Skip unrealistic prices
        
        // Look for vehicle info in siblings or parent elements
        const container = $priceEl.closest('div, article, section').first();
        const containerText = container.text();
        
        // Look for year pattern (4 digits between 1990-2025)
        const yearMatch = containerText.match(/\b(19[9][0-9]|20[0-2][0-9])\b/);
        const year = yearMatch ? parseInt(yearMatch[1]) : null;
        
        // Look for make/model patterns
        const makes = ['Ford', 'Chevrolet', 'Chevy', 'Toyota', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Jeep', 'Dodge', 'Chrysler', 'Buick', 'GMC', 'Cadillac', 'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Mazda', 'Subaru', 'Mitsubishi', 'Acura', 'Lexus', 'Infiniti'];
        
        let make = '';
        let model = '';
        
        for (const brandName of makes) {
          const regex = new RegExp(`\\b${brandName}\\b`, 'i');
          if (regex.test(containerText)) {
            make = brandName;
            // Try to extract model after make
            const makeIndex = containerText.toLowerCase().indexOf(brandName.toLowerCase());
            const afterMake = containerText.substring(makeIndex + brandName.length).trim();
            const modelMatch = afterMake.match(/^\s*([A-Za-z0-9\-]+)/);
            if (modelMatch) {
              model = modelMatch[1];
            }
            break;
          }
        }
        
        // Look for mileage
        const mileageMatch = containerText.match(/(\d{1,3}(?:,\d{3})*)\s*(?:miles?|mi)/i);
        const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : undefined;
        
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
            source_url: baseUrl
          });
          
          console.log(`Extracted vehicle: ${year} ${make} ${model} - $${price}`);
        }
      });
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