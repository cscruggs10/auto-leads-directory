import puppeteer, { Browser, Page } from 'puppeteer';
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
      await Promise.all(batch.map(dealer => scrapeDealerInventory(dealer.id)));
    }
    
    console.log('Completed scraping for all dealers');
  } catch (error) {
    console.error('Error in scrapeAllDealers:', error);
    throw error;
  }
}

export async function scrapeDealerInventory(dealerId: number): Promise<void> {
  const startTime = Date.now();
  let browser: Browser | null = null;
  
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
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to dealer website
    await page.goto(dealer.website_url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Scrape vehicles based on dealer configuration
    const vehicles = await scrapeVehiclesFromPage(page, config);
    
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
              vehicle.down_payment || vehicle.price ? Math.min(vehicle.price * 0.1, 2000) : 1000,
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
              vehicle.down_payment || vehicle.price ? Math.min(vehicle.price * 0.1, 2000) : 1000,
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
      [dealerId, error.message, Date.now() - startTime]
    );
    
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function scrapeVehiclesFromPage(page: Page, config: any): Promise<ScrapedVehicle[]> {
  // This is a generic scraper - in production, customize for each dealer's website
  const vehicles: ScrapedVehicle[] = [];
  
  try {
    // Example scraping logic - customize based on dealer website structure
    const vehicleElements = await page.$$eval(
      config.selector || '.vehicle-item',
      elements => elements.map(el => {
        // Extract vehicle data from DOM
        const getTextContent = (selector: string): string => {
          const element = el.querySelector(selector);
          return element?.textContent?.trim() || '';
        };
        
        const getAttribute = (selector: string, attr: string): string => {
          const element = el.querySelector(selector);
          return element?.getAttribute(attr) || '';
        };
        
        // Parse vehicle information
        const title = getTextContent('.vehicle-title, h3, h2');
        const priceText = getTextContent('.price, .vehicle-price');
        const vinText = getTextContent('.vin') || getAttribute('[data-vin]', 'data-vin');
        const mileageText = getTextContent('.mileage, .vehicle-mileage');
        const imageUrl = getAttribute('img', 'src');
        
        return {
          title,
          price: priceText,
          vin: vinText,
          mileage: mileageText,
          image: imageUrl,
          link: getAttribute('a', 'href')
        };
      })
    );
    
    // Process and validate scraped data
    for (const element of vehicleElements) {
      try {
        // Parse title to extract year, make, model
        const titleMatch = element.title.match(/(\d{4})\s+(\w+)\s+(.+)/);
        if (!titleMatch) continue;
        
        const [, year, make, model] = titleMatch;
        
        // Generate VIN if not found (for demo purposes - in production, VIN is required)
        const vin = element.vin || generateDemoVIN();
        
        // Parse numeric values
        const price = parseFloat(element.price.replace(/[^0-9.]/g, '')) || null;
        const mileage = parseInt(element.mileage.replace(/[^0-9]/g, '')) || null;
        
        vehicles.push({
          vin,
          year: parseInt(year),
          make,
          model: model.trim(),
          price,
          mileage,
          down_payment: price ? Math.min(price * 0.1, 2000) : 1000,
          photos: element.image ? [element.image] : [],
          source_url: element.link || page.url()
        });
      } catch (error) {
        console.error('Error parsing vehicle element:', error);
      }
    }
  } catch (error) {
    console.error('Error in scrapeVehiclesFromPage:', error);
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