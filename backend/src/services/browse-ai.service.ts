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
    return this.processData(capturedData, browseAIConfig);
  }

  /**
   * Process Browse AI captured data into standardized vehicle format
   */
  private processData(capturedData: any, config: BrowseAIConfig): any[] {
    const vehicles: any[] = [];
    
    try {
      console.log('Processing Browse AI captured data...');
      
      // Get the vehicle list - try different common names
      const listName = config.listName || 'vehicles';
      const vehicleList = capturedData[listName] || 
                         capturedData.inventory || 
                         capturedData.cars || 
                         capturedData.listings || 
                         [];
      
      if (!Array.isArray(vehicleList)) {
        console.log(`No vehicle list found with name '${listName}' in Browse AI data`);
        console.log('Available lists:', Object.keys(capturedData));
        return vehicles;
      }
      
      console.log(`Processing ${vehicleList.length} vehicles from Browse AI...`);
      
      for (const item of vehicleList) {
        try {
          const vehicle = this.mapVehicleData(item, config.fieldMapping);
          if (vehicle) {
            vehicles.push(vehicle);
            console.log(`Processed vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.price ? ` - $${vehicle.price}` : ''}`);
          }
        } catch (error) {
          console.log('Error processing vehicle item:', error);
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
}

export const browseAIService = new BrowseAIService();