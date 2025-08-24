import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Manual migration endpoint
router.post('/migrate', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting manual migration...');
    const { runMigrations } = await import('../database/migrate');
    await runMigrations();
    res.json({
      success: true,
      message: 'Migrations completed successfully'
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
  }
});

// Test scraper endpoint
router.post('/scrape/:dealerId', async (req: Request, res: Response) => {
  try {
    const { dealerId } = req.params;
    console.log(`🚀 Starting scraper test for dealer ${dealerId}...`);
    
    const { scrapeDealerInventory } = await import('../services/scraper.service');
    await scrapeDealerInventory(parseInt(dealerId));
    
    res.json({
      success: true,
      message: `Scraping completed for dealer ${dealerId}`
    });
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
  }
});

// Debug endpoint to check database connection
router.get('/debug/db', async (req: Request, res: Response) => {
  try {
    const useMockDb = !process.env.DATABASE_URL || process.env.USE_MOCK_DB === 'true';
    
    if (useMockDb) {
      res.json({
        database: 'mock',
        USE_MOCK_DB: process.env.USE_MOCK_DB,
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0
      });
    } else {
      // Try to query the actual database
      const result = await pool.query('SELECT COUNT(*) as dealer_count FROM dealers');
      res.json({
        database: 'postgresql',
        dealer_count: result.rows[0].dealer_count,
        USE_MOCK_DB: process.env.USE_MOCK_DB,
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0
      });
    }
  } catch (error) {
    res.json({
      database: 'error',
      error: (error as Error).message,
      USE_MOCK_DB: process.env.USE_MOCK_DB,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      RUN_MIGRATIONS: process.env.RUN_MIGRATIONS
    });
  }
});

// Add new dealer
router.post('/dealers', async (req: Request, res: Response) => {
  try {
    const {
      name,
      city,
      state,
      website_url,
      phone,
      description,
      services = []
    } = req.body;

    if (!name || !city || !state) {
      return res.status(400).json({ error: 'Name, city, and state are required' });
    }

    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const result = await pool.query(`
      INSERT INTO dealers (
        name, slug, city, state, phone, website_url, logo_url,
        average_rating, total_reviews, description, scraping_enabled,
        business_hours, services, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      name,
      slug,
      city,
      state,
      phone,
      website_url,
      `/images/dealers/${slug}.jpg`,
      4.0,
      0,
      description,
      true,
      JSON.stringify({
        monday: '9:00-19:00',
        tuesday: '9:00-19:00',
        wednesday: '9:00-19:00', 
        thursday: '9:00-19:00',
        friday: '9:00-19:00',
        saturday: '9:00-18:00',
        sunday: '12:00-17:00'
      }),
      JSON.stringify(services),
      true
    ]);

    res.status(201).json({
      success: true,
      message: 'Dealer added successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error adding dealer:', error);
    res.status(500).json({ error: 'Failed to add dealer' });
  }
});

// Get all dealers (admin view)
router.get('/dealers', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.*,
        COUNT(DISTINCT v.vin) as vehicle_count
      FROM dealers d
      LEFT JOIN vehicles v ON d.id = v.dealer_id AND v.is_available = true
      GROUP BY d.id 
      ORDER BY d.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.rows.length,
        page: 1,
        limit: result.rows.length,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching dealers:', error);
    res.status(500).json({ error: 'Failed to fetch dealers' });
  }
});

// Configure Browse AI bot for dealer
router.put('/dealers/:id/bot', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { browse_ai_bot_id } = req.body;

    if (!browse_ai_bot_id) {
      return res.status(400).json({ error: 'browse_ai_bot_id is required' });
    }

    const result = await pool.query(`
      UPDATE dealers 
      SET scraping_config = COALESCE(scraping_config, '{}')::jsonb || $1::jsonb,
          updated_at = NOW() 
      WHERE id = $2 
      RETURNING *
    `, [JSON.stringify({ browse_ai_bot_id }), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    res.json({
      success: true,
      message: `Browse AI bot ${browse_ai_bot_id} configured for dealer ${id}`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error configuring Browse AI bot:', error);
    res.status(500).json({ error: 'Failed to configure bot' });
  }
});

// Update dealer website URL
router.put('/dealers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { website_url } = req.body;

    if (!website_url) {
      return res.status(400).json({ error: 'website_url is required' });
    }

    const result = await pool.query(
      'UPDATE dealers SET website_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [website_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    res.json({
      success: true,
      message: 'Dealer updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating dealer:', error);
    res.status(500).json({ error: 'Failed to update dealer' });
  }
});

// Clean up test data - keep only real dealers
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    console.log('🧹 Starting database cleanup...');
    
    // Deactivate test dealers (keep only Car World Group and Car Choice)
    const realDealerIds = [4, 5]; // Car World Group and Car Choice
    
    // Deactivate all dealers except the real ones
    await pool.query(`
      UPDATE dealers 
      SET is_active = false, updated_at = NOW() 
      WHERE id NOT IN ($1, $2)
    `, realDealerIds);
    
    // Remove vehicles from deactivated dealers
    await pool.query(`
      DELETE FROM vehicles 
      WHERE dealer_id NOT IN ($1, $2)
    `, realDealerIds);
    
    // Get final count
    const dealerCount = await pool.query('SELECT COUNT(*) as count FROM dealers WHERE is_active = true');
    const vehicleCount = await pool.query('SELECT COUNT(*) as count FROM vehicles WHERE is_available = true');
    
    res.json({
      success: true,
      message: 'Database cleanup completed',
      active_dealers: parseInt(dealerCount.rows[0].count),
      available_vehicles: parseInt(vehicleCount.rows[0].count)
    });
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;