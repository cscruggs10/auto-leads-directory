import { Router } from 'express';
import { browseAIService } from '../services/browse-ai.service';
import pool from '../config/database';
import { validate } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const configureBotSchema = Joi.object({
  botId: Joi.string().required(),
  listName: Joi.string().default('vehicles'),
  inputParameters: Joi.object().default({}),
  fieldMapping: Joi.object({
    year: Joi.string().optional(),
    make: Joi.string().optional(),
    model: Joi.string().optional(),
    price: Joi.string().optional(),
    mileage: Joi.string().optional(),
    photos: Joi.string().optional(),
    stockNumber: Joi.string().optional(),
    exteriorColor: Joi.string().optional(),
    interiorColor: Joi.string().optional(),
    transmission: Joi.string().optional(),
    engine: Joi.string().optional(),
    url: Joi.string().optional()
  }).optional()
});

const testBotSchema = Joi.object({
  botId: Joi.string().required(),
  inputParameters: Joi.object().optional()
});

/**
 * @route POST /api/v1/browse-ai/dealers/:dealerId/configure
 * @desc Configure Browse AI bot for a dealer
 * @access Admin
 */
router.post('/dealers/:dealerId/configure', 
  validate(configureBotSchema),
  async (req, res) => {
    const { dealerId } = req.params;
    const { botId, listName, inputParameters, fieldMapping } = req.body;

    try {
      // Get current dealer config
      const dealerResult = await pool.query(
        'SELECT scraping_config FROM dealers WHERE id = $1',
        [dealerId]
      );

      if (dealerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Dealer not found' });
      }

      // Update scraping config with Browse AI settings
      const currentConfig = dealerResult.rows[0].scraping_config || {};
      const updatedConfig = {
        ...currentConfig,
        browse_ai: {
          botId,
          listName,
          inputParameters,
          fieldMapping
        },
        // Keep legacy field for backward compatibility
        browse_ai_bot_id: botId
      };

      await pool.query(
        'UPDATE dealers SET scraping_config = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [JSON.stringify(updatedConfig), dealerId]
      );

      res.json({
        success: true,
        message: 'Browse AI bot configured successfully',
        config: updatedConfig.browse_ai
      });

    } catch (error) {
      console.error('Error configuring Browse AI bot:', error);
      res.status(500).json({ error: 'Failed to configure Browse AI bot' });
    }
  }
);

/**
 * @route GET /api/v1/browse-ai/dealers/:dealerId/config
 * @desc Get Browse AI configuration for a dealer
 * @access Admin
 */
router.get('/dealers/:dealerId/config', async (req, res) => {
  const { dealerId } = req.params;

  try {
    const result = await pool.query(
      'SELECT name, scraping_config FROM dealers WHERE id = $1',
      [dealerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const dealer = result.rows[0];
    const browseAIConfig = dealer.scraping_config?.browse_ai || {};

    res.json({
      dealerName: dealer.name,
      browseAIConfig: {
        botId: browseAIConfig.botId || dealer.scraping_config?.browse_ai_bot_id,
        listName: browseAIConfig.listName || 'vehicles',
        inputParameters: browseAIConfig.inputParameters || {},
        fieldMapping: browseAIConfig.fieldMapping || {}
      },
      isConfigured: !!(browseAIConfig.botId || dealer.scraping_config?.browse_ai_bot_id)
    });

  } catch (error) {
    console.error('Error getting Browse AI config:', error);
    res.status(500).json({ error: 'Failed to get Browse AI configuration' });
  }
});

/**
 * @route POST /api/v1/browse-ai/test
 * @desc Test Browse AI bot configuration
 * @access Admin
 */
router.post('/test',
  validate(testBotSchema),
  async (req, res) => {
    const { botId, inputParameters = {} } = req.body;

    try {
      console.log(`Testing Browse AI bot ${botId}...`);
      
      // Create a test task
      const taskId = await browseAIService.createTask(botId, inputParameters);
      
      // Poll for results (shorter timeout for testing)
      const capturedData = await browseAIService.pollTask(botId, taskId, 10); // 100 seconds max
      
      res.json({
        success: true,
        message: 'Browse AI bot test completed successfully',
        taskId,
        capturedData: {
          availableLists: Object.keys(capturedData),
          sampleData: Object.fromEntries(
            Object.entries(capturedData).map(([key, value]) => [
              key, 
              Array.isArray(value) ? value.slice(0, 2) : value // Show first 2 items only
            ])
          )
        }
      });

    } catch (error) {
      console.error('Browse AI test error:', error);
      res.status(500).json({ 
        error: 'Browse AI test failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route POST /api/v1/browse-ai/dealers/:dealerId/scrape
 * @desc Manually trigger Browse AI scraping for a dealer
 * @access Admin
 */
router.post('/dealers/:dealerId/scrape', async (req, res) => {
  const { dealerId } = req.params;

  try {
    // Check if dealer exists and has Browse AI configured
    const dealerResult = await pool.query(
      'SELECT name, scraping_config FROM dealers WHERE id = $1',
      [dealerId]
    );

    if (dealerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const dealer = dealerResult.rows[0];
    const config = dealer.scraping_config || {};
    
    if (!config.browse_ai?.botId && !config.browse_ai_bot_id) {
      return res.status(400).json({ 
        error: 'No Browse AI bot configured for this dealer' 
      });
    }

    // Trigger scraping using Browse AI service
    console.log(`Manual scraping triggered for dealer ${dealerId} (${dealer.name})`);
    
    // Run scraping in background
    browseAIService.scrapeDealer(parseInt(dealerId))
      .then(vehicles => {
        console.log(`✅ Scraping completed for dealer ${dealerId}: ${vehicles.length} vehicles found`);
      })
      .catch(error => {
        console.error(`❌ Scraping failed for dealer ${dealerId}:`, error);
      });

    res.json({
      success: true,
      message: `Browse AI scraping started for ${dealer.name}`,
      dealerId: parseInt(dealerId)
    });

  } catch (error) {
    console.error('Error triggering Browse AI scraping:', error);
    res.status(500).json({ error: 'Failed to trigger Browse AI scraping' });
  }
});

/**
 * @route GET /api/v1/browse-ai/debug/:dealerId
 * @desc Debug endpoint to see raw Browse AI data
 * @access Admin
 */
router.get('/debug/:dealerId', async (req, res) => {
  const { dealerId } = req.params;
  
  try {
    console.log('🔍 DEBUG: Starting Browse AI debug for dealer', dealerId);
    
    // Get dealer configuration
    const dealerResult = await pool.query(
      'SELECT name, scraping_config FROM dealers WHERE id = $1',
      [dealerId]
    );

    if (dealerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const dealer = dealerResult.rows[0];
    const browseAIConfig = dealer.scraping_config?.browse_ai || {};
    
    if (!browseAIConfig.botId) {
      return res.status(400).json({ error: 'No Browse AI bot configured for this dealer' });
    }

    console.log('🔍 DEBUG: Creating task for bot', browseAIConfig.botId);
    
    // Create and poll task
    const taskId = await browseAIService.createTask(browseAIConfig.botId, browseAIConfig.inputParameters);
    const capturedData = await browseAIService.pollTask(browseAIConfig.botId, taskId, 5); // Quick 5 attempts
    
    console.log('🔍 DEBUG: Raw data received:', JSON.stringify(capturedData, null, 2).substring(0, 2000));
    
    // Return raw data structure for debugging
    res.json({
      success: true,
      dealer: dealer.name,
      botId: browseAIConfig.botId,
      dataStructure: {
        keys: Object.keys(capturedData),
        listSizes: Object.entries(capturedData).map(([key, value]) => ({
          list: key,
          count: Array.isArray(value) ? value.length : 0,
          sampleItem: Array.isArray(value) && value.length > 0 ? value[0] : null
        }))
      },
      rawData: capturedData
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/v1/browse-ai/webhook
 * @desc Webhook endpoint for Browse AI task completion
 * @access Browse AI
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('🎣 Browse AI webhook received:', JSON.stringify(req.body, null, 2));
    
    const { task, robot } = req.body;
    
    if (!task || task.status !== 'successful') {
      console.log('⚠️ Webhook received but task not successful:', task?.status);
      return res.status(200).json({ message: 'Task not successful, ignoring' });
    }
    
    console.log('✅ Browse AI task completed successfully!');
    console.log('🤖 Bot ID:', robot?.id);
    console.log('📋 Task ID:', task?.id);
    console.log('📊 Captured Lists:', Object.keys(task?.capturedLists || {}));
    
    // Find dealer by bot ID
    const dealerResult = await pool.query(
      `SELECT id, name, scraping_config FROM dealers 
       WHERE scraping_config->>'browse_ai'->>'botId' = $1 
       OR scraping_config->>'browse_ai_bot_id' = $1`,
      [robot?.id]
    );
    
    if (dealerResult.rows.length === 0) {
      console.log('⚠️ No dealer found for bot ID:', robot?.id);
      return res.status(200).json({ message: 'Dealer not found' });
    }
    
    const dealer = dealerResult.rows[0];
    console.log(`🏪 Processing for dealer: ${dealer.name} (ID: ${dealer.id})`);
    
    // Process the captured data
    const browseAIConfig = dealer.scraping_config?.browse_ai || {};
    const capturedData = task.capturedLists || {};
    
    console.log('🔄 Processing captured data...');
    const processedVehicles = await browseAIService.processData(capturedData, browseAIConfig);
    
    if (processedVehicles.length > 0) {
      console.log(`💾 Saving ${processedVehicles.length} vehicles to database...`);
      const savedVehicles = await browseAIService.saveVehiclesToDatabase(processedVehicles, dealer.id);
      console.log(`✅ Webhook processing complete: ${savedVehicles.length} vehicles saved`);
    } else {
      console.log('❌ No vehicles were processed from webhook data');
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Webhook processed successfully',
      vehiclesProcessed: processedVehicles.length
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * @route POST /api/v1/browse-ai/import-car-choice
 * @desc Import Car Choice inventory from CSV data
 * @access Admin
 */
router.post('/import-car-choice', async (req, res) => {
  try {
    console.log('🚀 Importing Car Choice inventory...');
    
    // Get Car Choice dealer ID
    const dealerResult = await pool.query('SELECT id FROM dealers WHERE name = $1', ['Car Choice']);
    if (dealerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Car Choice dealer not found' });
    }
    const dealerId = dealerResult.rows[0].id;
    
    // All 73 vehicles from your CSV file
    const vehicles = [
      "2018 Mitsubishi Outlander Sport SE 2.4 AWC CVT",
      "2014 Porsche Panamera 4dr HB",
      "2019 Mercedes-Benz GLA-Class 4d SUV GLA250 4Matic",
      "2015 Audi A6 4d Sedan 2.0T Premium+",
      "2019 Audi Q7 SE Premium Plus 55 TFSI quattro",
      "2017 Buick Cascada 2d Convertible Premium",
      "2012 Toyota Highlander FWD 4dr I4 (Natl)",
      "2017 Genesis G90 3.3T Premium AWD",
      "2006 Bentley Continental Flying Spur 4d Sedan",
      "2012 Toyota Tundra 4WD Double Cab 4.6L",
      "2019 Ford Taurus 4d Sedan FWD Limited",
      "2019 Genesis G70 2.0T Advanced AWD",
      "2014 Toyota Tacoma 2WD Access Cab I4 MT (Natl)",
      "2018 Honda Accord Sedan 4d LX 1.5L",
      "2017 Jaguar F-PACE 4d SUV AWD 35t Prestige",
      "2020 Mercedes-Benz GLE-Class 4d SUV GLE350 4matic",
      "2018 Mercedes-Benz GLE-Class 4d SUV Coupe GLE43 AMG 4matic",
      "2016 Land Rover Range Rover Sport 4d SUV 3.0L SC SE",
      "2020 Jeep Gladiator Sport S 4x4",
      "2016 Cadillac XTS 4d Sedan Luxury",
      "2017 FIAT 124 Spider Lusso Convertible",
      "2015 Mercedes-Benz S-Class 4d Sedan S550",
      "2015 Mercedes-Benz E-Class 4dr Sdn E 350 RWD",
      "2019 Chevrolet Silverado 1500 4WD Crew Cab 147",
      "2016 Chevrolet Tahoe 4d SUV RWD LTZ",
      "2023 Chevrolet Express Cargo Van RWD 2500 135",
      "2013 Chevrolet Camaro 2d Coupe LT2",
      "2015 Cadillac CTS 4d Sedan 2.0L Turbo Luxury",
      "2012 Ford Taurus 4d Sedan Limited",
      "2017 Land Rover Range Rover Sport 4d SUV 3.0L SC SE",
      "2019 Chevrolet Impala 4d Sedan LT w/1LT V6",
      "2016 Chevrolet Trax 4d SUV FWD LTZ",
      "2017 Chevrolet Camaro 2d Coupe SS1",
      "2007 Dodge Nitro 4d SUV 2WD R/T",
      "2021 Chevrolet Tahoe 4WD 4dr Z71",
      "2018 Honda Accord Sedan 4d Sport 1.5L CVT",
      "2017 Maserati Levante 4d Sport Utility",
      "2014 Ford Mustang 2dr Cpe V6",
      "2020 Subaru Crosstrek 4d SUV 2.0i Limited",
      "2018 Land Rover Range Rover Evoque 5 Door SE",
      "2018 Chrysler Pacifica 4d Wagon Touring L Plus",
      "2024 Cadillac Escalade 4WD 4dr Sport Platinum",
      "2018 Ram 1500 4WD Crew Cab SLT",
      "2019 Mercedes-Benz C-Class 4d Sedan C300",
      "2018 Land Rover Range Rover Velar 4d SUV 4WD P250 SE R-Dynamic",
      "2018 Nissan Maxima Platinum 3.5L",
      "2018 Land Rover Range Rover 4d SUV 5.0L SC",
      "2014 Chevrolet Silverado 1500 4WD Double Cab 143.5",
      "2017 INFINITI QX50 4d SUV AWD",
      "2018 Toyota RAV4 XLE FWD (Natl)",
      "2011 Chevrolet MALIBU SEDAN",
      "2015 Mazda CX-5 FWD 4dr Auto Sport",
      "2016 GMC Yukon XL 4d SUV 4WD Denali",
      "2014 Subaru Forester 4d SUV i Limited",
      "2016 Land Rover Range Rover Sport 4WD 4dr V8",
      "2023 Toyota RAV4 LE FWD",
      "2021 Jeep Gladiator Freedom 4x4 *Ltd Avail*",
      "2019 Jeep Wrangler Unlimited Sport S 4x4",
      "2016 Lincoln MKZ 4d Sedan FWD Black Label EcoBoost",
      "2016 Land Rover Range Rover Sport 4WD 4dr V6 HSE",
      "2022 Toyota Camry SE Auto",
      "2008 Porsche Cayman 2d Coupe",
      "2003 Nissan Xterra 4d SUV 4WD XE AT",
      "2017 Toyota Tundra 4WD SR5 CrewMax 5.5' Bed 5.7L FFV (Natl)",
      "2017 Nissan Rogue 2017.5 FWD SL",
      "2006 Freightliner SPRINTER",
      "2018 Toyota Corolla LE CVT (Natl)",
      "2021 Ford Bronco Sport Big Bend 4x4",
      "2023 Ford Bronco 2 Door 4x4",
      "2014 Ford F-150 2WD SuperCrew",
      "2020 BMW X5 sDrive40i Sports Activity Vehicle",
      "2020 Nissan Altima 4d Sedan FWD 2.5L Platinum",
      "2016 GMC Yukon 4d SUV RWD SLT"
    ];
    
    let processed = 0;
    
    for (let i = 0; i < vehicles.length; i++) {
      const vehicleInfo = vehicles[i];
      
      // Parse year, make, model
      const yearMatch = vehicleInfo.match(/^(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;
      
      const remaining = vehicleInfo.substring(4).trim();
      const makeMatch = remaining.match(/^(\w+)/);
      const make = makeMatch ? makeMatch[1] : 'Unknown';
      
      const model = remaining.substring(make.length).trim() || 'Unknown';
      
      if (year && make) {
        const vin = `CC${year}${make.substring(0, 3).toUpperCase()}${String(i + 1).padStart(6, '0')}`;
        
        await pool.query(`
          INSERT INTO vehicles (vin, year, make, model, dealer_id, title, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (vin) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
        `, [vin, year, make, model, dealerId, vehicleInfo, true]);
        
        processed++;
      }
    }
    
    const countResult = await pool.query('SELECT COUNT(*) FROM vehicles WHERE dealer_id = $1', [dealerId]);
    
    res.json({
      success: true,
      message: `Imported ${processed} Car Choice vehicles`,
      totalVehicles: parseInt(countResult.rows[0].count)
    });
    
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import failed', details: error.message });
  }
});

/**
 * @route GET /api/v1/browse-ai/dealers
 * @desc List all dealers with Browse AI configuration status
 * @access Admin
 */
router.get('/dealers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        slug,
        scraping_enabled,
        scraping_config,
        updated_at
      FROM dealers 
      WHERE is_active = true
      ORDER BY name
    `);

    const dealers = result.rows.map((dealer: any) => ({
      id: dealer.id,
      name: dealer.name,
      slug: dealer.slug,
      scrapingEnabled: dealer.scraping_enabled,
      browseAI: {
        configured: !!(dealer.scraping_config?.browse_ai?.botId || dealer.scraping_config?.browse_ai_bot_id),
        botId: dealer.scraping_config?.browse_ai?.botId || dealer.scraping_config?.browse_ai_bot_id || null,
        listName: dealer.scraping_config?.browse_ai?.listName || 'vehicles'
      },
      lastUpdated: dealer.updated_at
    }));

    res.json({
      dealers,
      summary: {
        total: dealers.length,
        configured: dealers.filter((d: any) => d.browseAI.configured).length,
        enabled: dealers.filter((d: any) => d.scrapingEnabled).length
      }
    });

  } catch (error) {
    console.error('Error listing dealers:', error);
    res.status(500).json({ error: 'Failed to list dealers' });
  }
});

export default router;