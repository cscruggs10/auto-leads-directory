import pool from '../config/database';
import fetch from 'node-fetch';

interface BrowseAITask {
  id: string;
  status: 'running' | 'successful' | 'failed' | 'cancelled';
  result?: {
    capturedLists: Record<string, any[]>;
    capturedTexts?: Record<string, string>;
  };
  error?: {
    message: string;
  };
}

interface BrowseAIResponse {
  result: BrowseAITask;
}

interface BrowseAIConfig {
  botId: string;
  inputParameters?: Record<string, any>;
  fieldMapping?: {
    year?: string;
    make?: string;
    model?: string;
    price?: string;
    mileage?: string;
    photos?: string;
    stockNumber?: string;
    exteriorColor?: string;
    interiorColor?: string;
    transmission?: string;
    engine?: string;
    url?: string;
  };
  listName?: string; // The name of the captured list (e.g., 'vehicles', 'inventory', 'cars')
}

export class BrowseAIService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.browse.ai/v2';

  constructor() {
    this.apiKey = process.env.BROWSE_AI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('BROWSE_AI_API_KEY environment variable is required');
    }
  }

  /**
   * Create a new scraping task for a specific bot
   */
  async createTask(botId: string, inputParameters: Record<string, any> = {}): Promise<string> {
    console.log(`🤖 Creating Browse AI task for bot ${botId}...`);
    
    try {
      const response = await fetch(`${this.baseUrl}/robots/${botId}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputParameters })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Browse AI task creation failed: ${response.status} ${errorText}`);
      }

      const data = await response.json() as BrowseAIResponse;
      const taskId = data.result.id;
      
      console.log(`📋 Browse AI task created: ${taskId}`);
      return taskId;
      
    } catch (error) {
      console.error('Browse AI task creation error:', error);
      throw error;
    }
  }

  /**
   * Get task status and results
   */
  async getTask(botId: string, taskId: string): Promise<BrowseAITask> {
    const response = await fetch(`${this.baseUrl}/robots/${botId}/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Browse AI task polling failed: ${response.status}`);
    }

    const data = await response.json() as BrowseAIResponse;
    return data.result;
  }

  /**
   * Poll a task until completion with timeout
   */
  async pollTask(botId: string, taskId: string, maxAttempts = 30): Promise<Record<string, any[]>> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Polling Browse AI task ${taskId} (attempt ${attempt}/${maxAttempts})...`);
      
      const task = await this.getTask(botId, taskId);
      
      if (task.status === 'successful') {
        console.log(`✅ Browse AI task completed successfully`);
        return task.result?.capturedLists || {} as Record<string, any[]>;
      } else if (task.status === 'failed') {
        throw new Error(`Browse AI task failed: ${task.error?.message || 'Unknown error'}`);
      } else if (task.status === 'cancelled') {
        throw new Error('Browse AI task was cancelled');
      }

      // Still running, wait before next poll
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second intervals
    }

    throw new Error(`Browse AI task timed out after ${maxAttempts * 10} seconds`);
  }

  /**
   * Run a complete scraping workflow for a dealer
   */
  async scrapeDealer(dealerId: number): Promise<any[]> {
    console.log(`Starting Browse AI scraping for dealer ${dealerId}...`);
    
    // Get dealer's Browse AI configuration
    const dealerResult = await pool.query(
      'SELECT scraping_config FROM dealers WHERE id = $1',
      [dealerId]
    );

    if (dealerResult.rows.length === 0) {
      throw new Error(`Dealer ${dealerId} not found`);
    }

    const scrapingConfig = dealerResult.rows[0].scraping_config || {};
    const browseAIConfig: BrowseAIConfig = scrapingConfig.browse_ai || {};

    if (!browseAIConfig.botId) {
      throw new Error(`No Browse AI bot configured for dealer ${dealerId}`);
    }

    // Create and run task
    const taskId = await this.createTask(browseAIConfig.botId, browseAIConfig.inputParameters);
    const capturedData = await this.pollTask(browseAIConfig.botId, taskId);
    
    // Process the captured data using dealer-specific configuration
    console.log('🔍 Step A: Processing Browse AI data...');
    const processedVehicles = this.processData(capturedData, browseAIConfig);
    console.log(`🔍 Step B: Processed ${processedVehicles.length} vehicles`);
    
    if (processedVehicles.length === 0) {
      console.log('❌ CRITICAL: No vehicles were processed from Browse AI data!');
      return [];
    }
    
    // Store vehicles in database
    console.log('🔍 Step C: Saving vehicles to database...');
    try {
      const savedVehicles = await this.saveVehiclesToDatabase(processedVehicles, dealerId);
      console.log(`✅ Step D: Successfully stored ${savedVehicles.length} vehicles in database`);
      return savedVehicles;
    } catch (error) {
      console.log('❌ EXCEPTION saving to database:', error);
      console.log('❌ Database error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Process Browse AI captured data into standardized vehicle format
   */
  processData(capturedData: any, config: BrowseAIConfig): any[] {
    const vehicles: any[] = [];
    
    try {
      console.log('Processing Browse AI captured data...');
      
      // Get all available lists from Browse AI
      const availableLists = Object.keys(capturedData);
      console.log('🔍 Available Browse AI lists:', availableLists);
      console.log('🔍 Full captured data structure:', JSON.stringify(capturedData, null, 2).substring(0, 1000));
      
      // Try to find the vehicle list - look for common names or use the first available list
      let vehicleList: any[] = [];
      const possibleNames = [
        config.listName || 'vehicles',
        'Car Choice Inventory', // Specific for Car Choice
        'inventory',
        'cars', 
        'listings',
        'vehicles'
      ];
      
      for (const listName of possibleNames) {
        if (capturedData[listName] && Array.isArray(capturedData[listName])) {
          vehicleList = capturedData[listName];
          console.log(`Found vehicle list: '${listName}' with ${vehicleList.length} items`);
          break;
        }
      }
      
      // If no named list found, try the first available list
      if (vehicleList.length === 0 && availableLists.length > 0) {
        const firstList = availableLists[0];
        if (Array.isArray(capturedData[firstList])) {
          vehicleList = capturedData[firstList];
          console.log(`Using first available list: '${firstList}' with ${vehicleList.length} items`);
        }
      }
      
      if (!Array.isArray(vehicleList) || vehicleList.length === 0) {
        console.log('No vehicle list found in Browse AI data');
        console.log('Available data:', Object.keys(capturedData));
        return vehicles;
      }
      
      console.log(`🚀 Processing ${vehicleList.length} vehicles from Browse AI...`);
      
      for (const item of vehicleList) {
        try {
          console.log('🔍 Step 1: Processing vehicle item:', JSON.stringify(item, null, 2).substring(0, 300));
          
          console.log('🔍 Step 2: Calling parseVehicleItem...');
          const vehicle = this.parseVehicleItem(item, config);
          
          if (vehicle) {
            console.log('🔍 Step 3: Vehicle parsed successfully:', JSON.stringify(vehicle, null, 2).substring(0, 200));
            vehicles.push(vehicle);
            console.log(`✅ Step 4: Added to vehicles array - ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
          } else {
            console.log('❌ Step 3 FAILED: parseVehicleItem returned null');
          }
        } catch (error) {
          console.log('❌ EXCEPTION in processing vehicle item:', error);
          console.log('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        }
      }
      
      console.log(`Successfully processed ${vehicles.length} vehicles from Browse AI`);
      return vehicles;
      
    } catch (error) {
      console.error('Error processing Browse AI data:', error);
      return vehicles;
    }
  }

  /**
   * Parse a vehicle item from Browse AI data (handles multiple formats)
   */
  private parseVehicleItem(item: any, config: BrowseAIConfig): any | null {
    try {
      console.log('🔍 Item keys:', Object.keys(item));
      
      // Check for various column-based formats
      if (item['Vehicle Info'] || item['Image']) {
        console.log('📋 Using column-based parser (Vehicle Info + Image)');
        return this.parseColumnBasedVehicle(item);
      }
      
      // Check for other possible column formats
      const possibleVehicleFields = ['vehicle', 'car', 'listing', 'title', 'name', 'description'];
      const possibleImageFields = ['image', 'photo', 'picture', 'img'];
      
      for (const vField of possibleVehicleFields) {
        for (const iField of possibleImageFields) {
          if (item[vField] || item[iField]) {
            console.log(`📋 Using alternative column parser (${vField} + ${iField})`);
            return this.parseAlternativeColumnFormat(item, vField, iField);
          }
        }
      }
      
      // Try to find any field that looks like vehicle info
      for (const [key, value] of Object.entries(item)) {
        if (typeof value === 'string' && this.looksLikeVehicleInfo(value)) {
          console.log(`📋 Found vehicle info in field '${key}':`, value);
          return this.parseFromString(value, item);
        }
      }
      
      // Fall back to standard field mapping
      console.log('📋 Using standard field mapping');
      return this.mapVehicleData(item, config.fieldMapping);
      
    } catch (error) {
      console.log('❌ Error parsing vehicle item:', error);
      return null;
    }
  }

  /**
   * Parse column-based vehicle data (Vehicle Info + Image columns)
   */
  private parseColumnBasedVehicle(item: any): any | null {
    try {
      const vehicleInfo = item['Vehicle Info']?.trim() || '';
      const imageUrl = item['Image'] || '';
      
      if (!vehicleInfo) {
        console.log('No vehicle info found');
        return null;
      }
      
      // Parse the vehicle info string (e.g., "2018 Mitsubishi Outlander Sport SE 2.4 AWC CVT")
      const parsedVehicle = this.parseVehicleInfoString(vehicleInfo);
      if (!parsedVehicle) {
        console.log('Failed to parse vehicle info:', vehicleInfo);
        return null;
      }
      
      // Add image if available (filter out placeholder images)
      const photos: string[] = [];
      if (imageUrl && 
          imageUrl !== 'https://www.shopcarchoice.com/cssLib/onepix.png' && 
          !imageUrl.includes('onepix.png')) {
        photos.push(imageUrl);
      }
      
      return {
        vin: this.generateDemoVIN(),
        year: parsedVehicle.year,
        make: parsedVehicle.make,
        model: parsedVehicle.model,
        trim: parsedVehicle.trim,
        mileage: parsedVehicle.mileage,
        price: parsedVehicle.price,
        down_payment: parsedVehicle.price ? Math.min(parsedVehicle.price * 0.1, 2000) : 1000,
        photos,
        source_url: 'https://www.shopcarchoice.com/car-choice-memphis-inventory',
        stock_number: parsedVehicle.stockNumber,
        exterior_color: parsedVehicle.color,
        transmission: parsedVehicle.transmission,
        engine: parsedVehicle.engine
      };
      
    } catch (error) {
      console.log('Error parsing column-based vehicle:', error);
      return null;
    }
  }

  /**
   * Parse vehicle info string - handles multiple formats
   */
  private parseVehicleInfoString(vehicleInfo: string): any | null {
    try {
      console.log('🔧 Parsing vehicle string:', vehicleInfo);
      
      // Clean the string - handle leading/trailing spaces
      const cleaned = vehicleInfo.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
      
      // Extract year - look for 4-digit year anywhere in the string
      const yearMatch = cleaned.match(/\b(19|20)\d{2}\b/);
      if (!yearMatch) {
        console.log('❌ No year found in:', cleaned);
        return null;
      }
      
      const year = parseInt(yearMatch[0]);
      console.log('✅ Found year:', year);
      
      // Extract make - look for car manufacturer names
      const carMakes = [
        'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge', 'Ford', 
        'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jeep', 'Kia', 'Lexus', 'Lincoln', 
        'Mazda', 'Mercedes', 'Mitsubishi', 'Nissan', 'Ram', 'Subaru', 'Toyota', 
        'Volkswagen', 'Volvo', 'Acura'
      ];
      
      let make = '';
      for (const manufacturer of carMakes) {
        if (cleaned.toLowerCase().includes(manufacturer.toLowerCase())) {
          make = manufacturer;
          break;
        }
      }
      
      if (!make) {
        console.log('❌ No make found in:', cleaned);
        return null;
      }
      
      console.log('✅ Found make:', make);
      
      // Extract model - everything after make until common trim/option words
      const makeIndex = cleaned.toLowerCase().indexOf(make.toLowerCase());
      let afterMake = cleaned.substring(makeIndex + make.length).trim();
      
      // Remove year if it appears after make
      afterMake = afterMake.replace(/\b(19|20)\d{2}\b/, '').trim();
      
      // Split into words
      const words = afterMake.split(/\s+/).filter(w => w.length > 0);
      
      if (words.length === 0) {
        console.log('❌ No model found after make');
        return null;
      }
      
      // First 1-3 words are usually the model
      let model = words[0];
      let trim = '';
      
      // Handle common multi-word models
      const multiWordModels = [
        'Outlander Sport', 'Range Rover', 'Continental Flying', 'Town Country',
        'Grand Cherokee', 'Grand Caravan', 'Santa Fe', 'Land Cruiser'
      ];
      
      if (words.length > 1) {
        const twoWordModel = `${words[0]} ${words[1]}`;
        const threeWordModel = words.length > 2 ? `${words[0]} ${words[1]} ${words[2]}` : '';
        
        // Check for 3-word models first
        if (threeWordModel && multiWordModels.some(m => m.toLowerCase() === threeWordModel.toLowerCase())) {
          model = threeWordModel;
          trim = words.slice(3).join(' ');
        }
        // Check for 2-word models
        else if (multiWordModels.some(m => m.toLowerCase() === twoWordModel.toLowerCase()) || 
                 (words[1] && words[1].match(/^[A-Z][a-z]/) && !words[1].match(/^(SE|LE|LX|EX|LT|LS|SL|S|L|XL)$/))) {
          model = twoWordModel;
          trim = words.slice(2).join(' ');
        }
        // Single word model
        else {
          trim = words.slice(1).join(' ');
        }
      }
      
      console.log('✅ Found model:', model);
      console.log('✅ Found trim:', trim || '(none)');
      
      return {
        year,
        make,
        model: model.trim(),
        trim: trim.trim() || undefined,
        mileage: undefined,
        price: undefined,
        color: undefined,
        transmission: undefined,
        engine: undefined,
        stockNumber: undefined
      };
      
    } catch (error) {
      console.log('❌ Error parsing vehicle info string:', error);
      return null;
    }
  }

  /**
   * Map Browse AI captured fields to vehicle data using field mapping
   */
  private mapVehicleData(item: any, fieldMapping: BrowseAIConfig['fieldMapping'] = {}): any | null {
    try {
      // Use field mapping or fallback to common field names
      const year = this.extractField(item, fieldMapping.year, ['year', 'model_year', 'yr']);
      const make = this.extractField(item, fieldMapping.make, ['make', 'brand', 'manufacturer']);
      const model = this.extractField(item, fieldMapping.model, ['model', 'model_name']);
      const priceField = this.extractField(item, fieldMapping.price, ['price', 'cost', 'amount']);
      const mileageField = this.extractField(item, fieldMapping.mileage, ['mileage', 'miles', 'odometer']);
      
      // Extract and clean price
      let price: number | undefined;
      if (priceField) {
        const priceStr = priceField.toString().replace(/[^0-9.]/g, '');
        price = priceStr ? parseFloat(priceStr) : undefined;
      }
      
      // Extract and clean mileage
      let mileage: number | undefined;
      if (mileageField) {
        const mileageStr = mileageField.toString().replace(/[^0-9]/g, '');
        mileage = mileageStr ? parseInt(mileageStr) : undefined;
      }

      // Extract other fields
      const photos = this.extractPhotos(item, fieldMapping.photos);
      const stockNumber = this.extractField(item, fieldMapping.stockNumber, ['stock_number', 'stock', 'sku']);
      const exteriorColor = this.extractField(item, fieldMapping.exteriorColor, ['exterior_color', 'color', 'ext_color']);
      const interiorColor = this.extractField(item, fieldMapping.interiorColor, ['interior_color', 'int_color']);
      const transmission = this.extractField(item, fieldMapping.transmission, ['transmission', 'trans']);
      const engine = this.extractField(item, fieldMapping.engine, ['engine', 'motor']);
      const url = this.extractField(item, fieldMapping.url, ['url', 'link', 'href', 'detail_url']);

      // Validate required fields
      if (!year || !make || !model) {
        console.log('Skipping vehicle with missing required fields:', { year, make, model });
        return null;
      }

      // Generate demo VIN if not provided
      const vin = this.generateDemoVIN();

      return {
        vin,
        year: parseInt(year.toString()),
        make: make.toString().trim(),
        model: model.toString().trim(),
        price,
        mileage,
        down_payment: price ? Math.min(price * 0.1, 2000) : 1000,
        photos,
        source_url: url || '',
        stock_number: stockNumber?.toString(),
        exterior_color: exteriorColor?.toString(),
        interior_color: interiorColor?.toString(),
        transmission: transmission?.toString(),
        engine: engine?.toString()
      };
      
    } catch (error) {
      console.log('Error mapping vehicle data:', error);
      return null;
    }
  }

  /**
   * Extract field value using mapping or fallback field names
   */
  private extractField(item: any, mappedField: string | undefined, fallbackFields: string[]): any {
    if (mappedField && item[mappedField] !== undefined) {
      return item[mappedField];
    }
    
    for (const field of fallbackFields) {
      if (item[field] !== undefined) {
        return item[field];
      }
    }
    
    return undefined;
  }

  /**
   * Extract photos array from Browse AI data
   */
  private extractPhotos(item: any, photoField?: string): string[] {
    const photos: string[] = [];
    
    try {
      let photoData;
      
      if (photoField && item[photoField]) {
        photoData = item[photoField];
      } else {
        // Try common photo field names
        photoData = item.photos || item.images || item.pictures || item.gallery;
      }
      
      if (Array.isArray(photoData)) {
        return photoData.filter(url => typeof url === 'string' && url.length > 0);
      } else if (typeof photoData === 'string' && photoData.length > 0) {
        return [photoData];
      }
      
    } catch (error) {
      console.log('Error extracting photos:', error);
    }
    
    return photos;
  }

  /**
   * Check if a string looks like vehicle information
   */
  private looksLikeVehicleInfo(str: string): boolean {
    const cleaned = str.trim().toLowerCase();
    
    // Check for year pattern (4 digits between 1900-2030)
    const hasYear = /\b(19|20)\d{2}\b/.test(cleaned);
    
    // Check for common car makes
    const carMakes = ['ford', 'chevrolet', 'toyota', 'honda', 'nissan', 'bmw', 'mercedes', 'audi', 'volkswagen', 'hyundai', 'kia', 'mazda', 'subaru', 'jeep', 'ram', 'gmc', 'buick', 'cadillac', 'lexus', 'infiniti', 'acura', 'mitsubishi'];
    const hasMake = carMakes.some(make => cleaned.includes(make));
    
    return hasYear && hasMake && str.length > 10;
  }

  /**
   * Parse alternative column format
   */
  private parseAlternativeColumnFormat(item: any, vehicleField: string, imageField: string): any | null {
    const vehicleInfo = item[vehicleField]?.trim() || '';
    const imageUrl = item[imageField] || '';
    
    if (!vehicleInfo) return null;
    
    return this.parseFromString(vehicleInfo, { ...item, image: imageUrl });
  }

  /**
   * Parse vehicle from any string format
   */
  private parseFromString(vehicleStr: string, originalItem: any): any | null {
    try {
      const parsed = this.parseVehicleInfoString(vehicleStr);
      if (!parsed) return null;
      
      // Get image from original item if available
      const photos: string[] = [];
      const imageFields = ['image', 'Image', 'photo', 'picture', 'img'];
      
      for (const field of imageFields) {
        const imageUrl = originalItem[field];
        if (imageUrl && 
            typeof imageUrl === 'string' && 
            imageUrl.length > 0 &&
            !imageUrl.includes('onepix.png') &&
            !imageUrl.includes('placeholder')) {
          photos.push(imageUrl);
          break;
        }
      }
      
      return {
        vin: this.generateDemoVIN(),
        year: parsed.year,
        make: parsed.make,
        model: parsed.model,
        trim: parsed.trim,
        mileage: parsed.mileage,
        price: parsed.price,
        down_payment: parsed.price ? Math.min(parsed.price * 0.1, 2000) : 1000,
        photos,
        source_url: 'https://www.shopcarchoice.com/car-choice-memphis-inventory',
        stock_number: parsed.stockNumber,
        exterior_color: parsed.color,
        transmission: parsed.transmission,
        engine: parsed.engine
      };
      
    } catch (error) {
      console.log('Error parsing from string:', error);
      return null;
    }
  }

  /**
   * Generate a demo VIN for testing
   */
  private generateDemoVIN(): string {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    let vin = '';
    for (let i = 0; i < 17; i++) {
      vin += chars[Math.floor(Math.random() * chars.length)];
    }
    return vin;
  }

  /**
   * Save processed vehicles to the database
   */
  async saveVehiclesToDatabase(vehicles: any[], dealerId: number): Promise<any[]> {
    const savedVehicles: any[] = [];
    
    console.log(`💾 Saving ${vehicles.length} vehicles to database for dealer ${dealerId}...`);
    
    for (const vehicle of vehicles) {
      try {
        // Check if vehicle already exists by VIN
        const existingResult = await pool.query(
          'SELECT id FROM vehicles WHERE vin = $1',
          [vehicle.vin]
        );
        
        if (existingResult.rows.length > 0) {
          // Update existing vehicle
          const updateResult = await pool.query(`
            UPDATE vehicles SET
              year = $2,
              make = $3,
              model = $4,
              trim = $5,
              mileage = $6,
              price = $7,
              down_payment_required = $8,
              photos = $9,
              source_url = $10,
              stock_number = $11,
              exterior_color = $12,
              interior_color = $13,
              transmission = $14,
              engine = $15,
              last_scraped_at = NOW(),
              updated_at = NOW()
            WHERE vin = $1 AND dealer_id = $16
            RETURNING *
          `, [
            vehicle.vin,
            vehicle.year,
            vehicle.make,
            vehicle.model,
            vehicle.trim,
            vehicle.mileage,
            vehicle.price,
            vehicle.down_payment,
            JSON.stringify(vehicle.photos || []),
            vehicle.source_url,
            vehicle.stock_number,
            vehicle.exterior_color,
            vehicle.interior_color,
            vehicle.transmission,
            vehicle.engine,
            dealerId
          ]);
          
          if (updateResult.rows.length > 0) {
            savedVehicles.push(updateResult.rows[0]);
            console.log(`🔄 Updated: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
          }
        } else {
          // Insert new vehicle
          const insertResult = await pool.query(`
            INSERT INTO vehicles (
              vin, dealer_id, year, make, model, trim, mileage, price, 
              down_payment_required, photos, source_url, stock_number, 
              exterior_color, interior_color, transmission, engine, 
              last_scraped_at, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
              NOW(), NOW(), NOW()
            )
            RETURNING *
          `, [
            vehicle.vin,
            dealerId,
            vehicle.year,
            vehicle.make,
            vehicle.model,
            vehicle.trim,
            vehicle.mileage,
            vehicle.price,
            vehicle.down_payment,
            JSON.stringify(vehicle.photos || []),
            vehicle.source_url,
            vehicle.stock_number,
            vehicle.exterior_color,
            vehicle.interior_color,
            vehicle.transmission,
            vehicle.engine
          ]);
          
          savedVehicles.push(insertResult.rows[0]);
          console.log(`➕ Added: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
        }
        
      } catch (error) {
        console.error(`❌ Error saving vehicle ${vehicle.vin}:`, error);
      }
    }
    
    // Update dealer vehicle count
    await pool.query(
      'UPDATE dealers SET vehicle_count = (SELECT COUNT(*) FROM vehicles WHERE dealer_id = $1 AND is_available = true) WHERE id = $1',
      [dealerId]
    );
    
    return savedVehicles;
  }
}

export const browseAIService = new BrowseAIService();