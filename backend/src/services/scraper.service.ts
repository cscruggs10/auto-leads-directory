import https from 'https';
import http from 'http';
import pool from '../config/database';
import { browseAIService } from './browse-ai.service';

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

// Helper function to fetch data using Browse AI bot specific to each dealer
async function fetchWithBrowseAI(dealerId: number): Promise<any[]> {
  const useBrowseAI = process.env.BROWSE_AI_API_KEY && process.env.BROWSE_AI_ENABLED === 'true';
  
  if (!useBrowseAI) {
    throw new Error('Browse AI is not configured');
  }

  try {
    // Get dealer's Browse AI bot ID from database
    const dealerResult = await pool.query(
      'SELECT scraping_config FROM dealers WHERE id = $1',
      [dealerId]
    );

    if (dealerResult.rows.length === 0) {
      throw new Error(`Dealer ${dealerId} not found`);
    }

    const scrapingConfig = dealerResult.rows[0].scraping_config || {};
    const botId = scrapingConfig.browse_ai_bot_id;

    if (!botId) {
      throw new Error(`No Browse AI bot configured for dealer ${dealerId}. Please configure bot first.`);
    }

    console.log(`🤖 Using Browse AI bot ${botId} for dealer ${dealerId}...`);

    // Start Browse AI task
    const taskResponse = await fetch(`https://api.browse.ai/v2/robots/${botId}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BROWSE_AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputParameters: {}
      })
    });

    if (!taskResponse.ok) {
      const errorText = await taskResponse.text();
      throw new Error(`Browse AI task creation failed: ${taskResponse.status} ${errorText}`);
    }

    const taskData = await taskResponse.json() as any;
    const taskId = taskData.result.id;
    console.log(`📋 Browse AI task created: ${taskId}`);

    // Poll for task completion
    return await pollBrowseAITask(botId, taskId);

  } catch (error) {
    console.error('Browse AI error:', error);
    throw error;
  }
}

// Poll Browse AI task until completion
async function pollBrowseAITask(botId: string, taskId: string): Promise<any[]> {
  const maxAttempts = 30; // 5 minutes max (10 second intervals)
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Polling Browse AI task ${taskId} (attempt ${attempt}/${maxAttempts})...`);
    
    const response = await fetch(`https://api.browse.ai/v2/robots/${botId}/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.BROWSE_AI_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Browse AI task polling failed: ${response.status}`);
    }

    const data = await response.json() as any;
    const status = data.result.status;

    if (status === 'successful') {
      console.log(`✅ Browse AI task completed successfully`);
      return data.result.capturedLists || {};
    } else if (status === 'failed') {
      throw new Error(`Browse AI task failed: ${data.result.error?.message || 'Unknown error'}`);
    } else if (status === 'cancelled') {
      throw new Error('Browse AI task was cancelled');
    }

    // Still running, wait before next poll
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second intervals
  }

  throw new Error('Browse AI task timed out after 5 minutes');
}

// Process Browse AI captured data into vehicle format
async function processBrowseAIData(browseAIData: any, baseUrl: string, config: any): Promise<ScrapedVehicle[]> {
  const vehicles: ScrapedVehicle[] = [];
  
  try {
    console.log('Processing Browse AI captured data...');
    
    // Browse AI returns capturedLists object with named lists
    // The exact structure depends on how you configure your Browse AI bot
    
    // Example: assuming your bot captures a list called "vehicles"
    const vehicleList = browseAIData.vehicles || browseAIData.inventory || browseAIData.cars || [];
    
    if (!Array.isArray(vehicleList)) {
      console.log('No vehicle list found in Browse AI data');
      return vehicles;
    }
    
    console.log(`Processing ${vehicleList.length} vehicles from Browse AI...`);
    
    for (const item of vehicleList) {
      try {
        // Extract vehicle information from Browse AI captured fields
        // These field names will match what you configure in your Browse AI bot
        const year = parseInt(item.year || item.model_year || extractYear(item.title || ''));
        const make = item.make || item.brand || extractMake(item.title || '');
        const model = item.model || extractModel(item.title || '', make);
        
        // Extract pricing - Browse AI might capture this as text that needs parsing
        let price: number | undefined;
        if (item.price) {
          const priceStr = item.price.toString().replace(/[^0-9.]/g, '');
          price = priceStr ? parseFloat(priceStr) : undefined;
        }
        
        // Extract mileage
        let mileage: number | undefined;
        if (item.mileage || item.miles) {
          const mileageStr = (item.mileage || item.miles).toString().replace(/[^0-9]/g, '');
          mileage = mileageStr ? parseInt(mileageStr) : undefined;
        }
        
        // Generate VIN (Browse AI might capture actual VIN if available)
        const vin = item.vin || generateDemoVIN();
        
        if (year && make && model) {
          const vehicle: ScrapedVehicle = {
            vin,
            year,
            make: make.trim(),
            model: model.trim(),
            price,
            mileage,
            down_payment: price ? Math.min(price * 0.1, 2000) : 1000,
            photos: item.images ? (Array.isArray(item.images) ? item.images : [item.images]) : [],
            source_url: item.url || item.link || baseUrl,
            stock_number: item.stock_number || item.stock || undefined,
            exterior_color: item.color || item.exterior_color || undefined,
            interior_color: item.interior_color || undefined,
            transmission: item.transmission || undefined,
            engine: item.engine || undefined
          };
          
          vehicles.push(vehicle);
          console.log(`Processed Browse AI vehicle: ${year} ${make} ${model}${price ? ` - $${price}` : ''}${mileage ? ` (${mileage.toLocaleString()} mi)` : ''}`);
        } else {
          console.log('Skipping incomplete vehicle data from Browse AI:', item);
        }
      } catch (error) {
        console.log('Error processing Browse AI vehicle item:', error);
      }
    }
    
    console.log(`Successfully processed ${vehicles.length} vehicles from Browse AI`);
    return vehicles;
    
  } catch (error) {
    console.error('Error processing Browse AI data:', error);
    return vehicles;
  }
}

// Helper function to fetch HTML - uses ScrapingBee for JavaScript rendering
async function fetchHtml(url: string): Promise<string> {
  const useScrapingBee = process.env.SCRAPINGBEE_API_KEY && process.env.SCRAPING_ENABLED === 'true';
  
  if (useScrapingBee) {
    // Use ScrapingBee for JavaScript-rendered content
    console.log('🐝 Using ScrapingBee for JavaScript rendering...');
    
    const scrapingBeeUrl = new URL('https://app.scrapingbee.com/api/v1/');
    scrapingBeeUrl.searchParams.append('api_key', process.env.SCRAPINGBEE_API_KEY!);
    scrapingBeeUrl.searchParams.append('url', url);
    scrapingBeeUrl.searchParams.append('render_js', 'true');
    scrapingBeeUrl.searchParams.append('wait', '3000'); // Initial wait for page load
    scrapingBeeUrl.searchParams.append('block_ads', 'true');
    scrapingBeeUrl.searchParams.append('block_resources', 'false');
    
    // Use ScrapingBee's JavaScript scenario to handle "Load Next Page" buttons
    const jsScenario = {
      "instructions": [
        {"wait": 3000},
        {
          "evaluate": "(async()=>{let maxClicks=15; for(let i=0; i<maxClicks; i++){let btn=null; let selectors=[...document.querySelectorAll('button')].filter(b=>b.textContent.includes('Load Next Page')||b.textContent.includes('Load More')); if(selectors.length>0) btn=selectors[0]; else btn=document.querySelector('.load-more, [data-testid=\"load-more\"], #load-more'); if(!btn||getComputedStyle(btn).display==='none'||btn.disabled) break; btn.scrollIntoView(); btn.click(); await new Promise(r=>setTimeout(r,2000)); window.scrollBy(0,500);} })();"
        },
        {"wait": 5000}
      ]
    };
    scrapingBeeUrl.searchParams.append('js_scenario', JSON.stringify(jsScenario));
    
    try {
      const response = await fetch(scrapingBeeUrl.toString());
      
      if (!response.ok) {
        console.error(`ScrapingBee error: ${response.status} ${response.statusText}`);
        throw new Error(`ScrapingBee API error: ${response.status}`);
      }
      
      const html = await response.text();
      console.log(`✅ ScrapingBee successfully fetched ${html.length} characters`);
      return html;
    } catch (error) {
      console.error('ScrapingBee error:', error);
      throw error;
    }
  } else {
    // Fallback to basic HTTP fetch (no JavaScript support)
    console.log('Using basic HTTP fetch (no JavaScript support)...');
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
    
    let vehicles: ScrapedVehicle[] = [];
    
    // Check if Browse AI is enabled and bot is configured for this dealer
    const useBrowseAI = process.env.BROWSE_AI_ENABLED === 'true' && 
      (config.browse_ai?.botId || config.browse_ai_bot_id);
    
    if (useBrowseAI) {
      console.log(`Using Browse AI service for dealer ${dealerId}`);
      
      try {
        // Use the new Browse AI service
        vehicles = await browseAIService.scrapeDealer(dealerId);
      } catch (error) {
        console.error('Browse AI service error, falling back to legacy method:', error);
        // Fallback to legacy Browse AI method
        const browseAIData = await fetchWithBrowseAI(dealerId);
        vehicles = await processBrowseAIData(browseAIData, dealer.website_url, config);
      }
      
    } else {
      console.log(`Fetching ${dealer.website_url} using fallback scraper`);
      
      // Fallback to ScrapingBee/HTML scraping
      const htmlContent = await fetchHtml(dealer.website_url);
      vehicles = await scrapeVehiclesFromHTML(htmlContent, dealer.website_url, config);
    }
    
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
          const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
          const jsonData = JSON.parse(jsonContent);
          
          // Handle different JSON-LD structures
          let vehicleData = null;
          if (jsonData['@type'] === 'Car' || jsonData['@type'] === 'Vehicle') {
            vehicleData = jsonData;
          } else if (jsonData['@type'] === 'ItemList' && jsonData.itemListElement) {
            // Handle ItemList containing vehicles
            for (const item of jsonData.itemListElement) {
              if (item.item && (item.item['@type'] === 'Car' || item.item['@type'] === 'Vehicle')) {
                vehicleData = item.item;
                await processJsonLdVehicle(vehicleData, baseUrl, vehicles);
              }
            }
            continue;
          } else if (Array.isArray(jsonData)) {
            // Handle array of vehicles
            for (const item of jsonData) {
              if (item['@type'] === 'Car' || item['@type'] === 'Vehicle') {
                vehicleData = item;
                await processJsonLdVehicle(vehicleData, baseUrl, vehicles);
              }
            }
            continue;
          }
          
          if (vehicleData) {
            await processJsonLdVehicle(vehicleData, baseUrl, vehicles);
          }
        } catch (e) {
          console.log('JSON-LD parsing error:', (e as Error).message);
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

async function processJsonLdVehicle(vehicleData: any, baseUrl: string, vehicles: ScrapedVehicle[]): Promise<void> {
  try {
    // Extract vehicle information from JSON-LD structured data
    const year = vehicleData.modelDate || vehicleData.vehicleModelDate || extractYear(vehicleData.name);
    const make = vehicleData.brand?.name || vehicleData.manufacturer?.name || extractMake(vehicleData.name);
    const model = vehicleData.model?.name || vehicleData.vehicleModel || extractModel(vehicleData.name, make);
    const vin = vehicleData.vehicleIdentificationNumber || generateDemoVIN();
    
    // Extract pricing
    let price = undefined;
    if (vehicleData.offers && vehicleData.offers.price) {
      price = parseFloat(vehicleData.offers.price.replace(/[^0-9.]/g, ''));
    } else if (vehicleData.price) {
      price = parseFloat(vehicleData.price.replace(/[^0-9.]/g, ''));
    }
    
    // Extract mileage  
    let mileage = undefined;
    if (vehicleData.mileageFromOdometer) {
      mileage = parseInt(vehicleData.mileageFromOdometer.value || vehicleData.mileageFromOdometer);
    }
    
    // Extract other details
    const stockNumber = vehicleData.sku || extractStockNumber(vehicleData.name || '');
    const exteriorColor = vehicleData.color || vehicleData.vehicleBodyType?.color;
    const transmission = vehicleData.vehicleTransmission || vehicleData.transmissionType;
    const engine = vehicleData.vehicleEngine?.name || vehicleData.engine;
    
    if (year && make && model && (price || mileage)) {
      vehicles.push({
        vin,
        year: parseInt(year),
        make: make.trim(),
        model: model.trim(),
        price,
        mileage,
        down_payment: price ? Math.min(price * 0.1, 2000) : 1000,
        photos: [],
        source_url: baseUrl,
        stock_number: stockNumber,
        exterior_color: exteriorColor,
        transmission: transmission,
        engine: engine
      });
      
      console.log(`Extracted JSON-LD vehicle: ${year} ${make} ${model}${price ? ` - $${price}` : ''}${mileage ? ` (${mileage} mi)` : ''}`);
    }
  } catch (error) {
    console.log('Error processing JSON-LD vehicle:', (error as Error).message);
  }
}

function extractYear(text: string): string | null {
  const yearMatch = text?.match(/\b(19[9][0-9]|20[0-2][0-9])\b/);
  return yearMatch ? yearMatch[1] : null;
}

function extractMake(text: string): string | null {
  const makes = ['Ford', 'Chevrolet', 'Chevy', 'Toyota', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Jeep', 'Dodge', 'Chrysler', 'Buick', 'GMC', 'Cadillac', 'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Mazda', 'Subaru', 'Mitsubishi', 'Acura', 'Lexus', 'Infiniti'];
  for (const make of makes) {
    if (text?.toLowerCase().includes(make.toLowerCase())) {
      return make;
    }
  }
  return null;
}

function extractModel(text: string, make: string): string | null {
  if (!text || !make) return null;
  const makeIndex = text.toLowerCase().indexOf(make.toLowerCase());
  if (makeIndex === -1) return null;
  
  const afterMake = text.substring(makeIndex + make.length).trim();
  const modelMatch = afterMake.match(/^\s*([A-Za-z0-9\-\s]+?)(?:\s|$|[0-9]{4})/);
  return modelMatch ? modelMatch[1].trim() : null;
}

function extractStockNumber(text: string): string | null {
  const stockMatch = text.match(/(?:stock|sku|#)\s*:?\s*([A-Z0-9\-]+)/i);
  return stockMatch ? stockMatch[1] : null;
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