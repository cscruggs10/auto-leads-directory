import { Router, Request, Response } from 'express';
import pool from '../config/database';

const router = Router();

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
        business_hours, services
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
      JSON.stringify(services)
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
      SELECT d.*, COUNT(v.id) as vehicle_count
      FROM dealers d
      LEFT JOIN vehicles v ON d.id = v.dealer_id AND v.is_available = true
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching dealers:', error);
    res.status(500).json({ error: 'Failed to fetch dealers' });
  }
});

export default router;