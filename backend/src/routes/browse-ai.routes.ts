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