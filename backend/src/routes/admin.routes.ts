import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

// Debug endpoint to check database connection
router.get('/debug/db', async (req: Request, res: Response) => {
  try {
    const useMockDb = !process.env.DATABASE_URL || process.env.USE_MOCK_DB === 'true';
    
    if (useMockDb) {
      res.json({
        database: 'mock',
        USE_MOCK_DB: process.env.USE_MOCK_DB,
        DATABASE_URL: !!process.env.DATABASE_URL
      });
    } else {
      // Try to query the actual database
      const result = await pool.query('SELECT COUNT(*) as dealer_count FROM dealers');
      res.json({
        database: 'postgresql',
        dealer_count: result.rows[0].dealer_count,
        USE_MOCK_DB: process.env.USE_MOCK_DB,
        DATABASE_URL: !!process.env.DATABASE_URL
      });
    }
  } catch (error) {
    res.json({
      database: 'error',
      error: (error as Error).message,
      USE_MOCK_DB: process.env.USE_MOCK_DB,
      DATABASE_URL: !!process.env.DATABASE_URL
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

export default router;