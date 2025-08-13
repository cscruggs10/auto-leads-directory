import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/error.middleware';

export const getDealers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, city, state } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT 
        d.*,
        COUNT(DISTINCT v.vin) as vehicle_count
      FROM dealers d
      LEFT JOIN vehicles v ON d.id = v.dealer_id AND v.is_available = true
      WHERE d.is_active = true
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (city) {
      paramCount++;
      query += ` AND LOWER(d.city) = LOWER($${paramCount})`;
      params.push(city);
    }

    if (state) {
      paramCount++;
      query += ` AND d.state = UPPER($${paramCount})`;
      params.push(state);
    }

    query += ` GROUP BY d.id ORDER BY d.name ASC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM dealers WHERE is_active = true`;
    const countParams: any[] = [];
    let countParamCount = 0;

    if (city) {
      countParamCount++;
      countQuery += ` AND LOWER(city) = LOWER($${countParamCount})`;
      countParams.push(city);
    }

    if (state) {
      countParamCount++;
      countQuery += ` AND state = UPPER($${countParamCount})`;
      countParams.push(state);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDealerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        d.*,
        COUNT(DISTINCT v.vin) as vehicle_count,
        COUNT(DISTINCT CASE WHEN v.is_featured = true THEN v.vin END) as featured_count
      FROM dealers d
      LEFT JOIN vehicles v ON d.id = v.dealer_id AND v.is_available = true
      WHERE d.id = $1 AND d.is_active = true
      GROUP BY d.id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return next(new AppError('Dealer not found', 404));
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getDealerBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const query = `
      SELECT 
        d.*,
        COUNT(DISTINCT v.vin) as vehicle_count,
        COUNT(DISTINCT CASE WHEN v.is_featured = true THEN v.vin END) as featured_count,
        JSON_AGG(
          DISTINCT jsonb_build_object(
            'make', v.make,
            'count', (
              SELECT COUNT(*) 
              FROM vehicles 
              WHERE dealer_id = d.id 
              AND make = v.make 
              AND is_available = true
            )
          )
        ) FILTER (WHERE v.make IS NOT NULL) as makes_available
      FROM dealers d
      LEFT JOIN vehicles v ON d.id = v.dealer_id AND v.is_available = true
      WHERE d.slug = $1 AND d.is_active = true
      GROUP BY d.id
    `;

    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return next(new AppError('Dealer not found', 404));
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getDealersByRegion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Region can be city or state
    const query = `
      SELECT 
        d.*,
        COUNT(DISTINCT v.vin) as vehicle_count,
        AVG(v.down_payment_required) as avg_down_payment
      FROM dealers d
      LEFT JOIN vehicles v ON d.id = v.dealer_id AND v.is_available = true
      WHERE d.is_active = true 
        AND (LOWER(d.city) = LOWER($1) OR d.state = UPPER($1))
      GROUP BY d.id
      ORDER BY d.average_rating DESC, d.name ASC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [region, limit, offset]);

    const countResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM dealers 
       WHERE is_active = true 
         AND (LOWER(city) = LOWER($1) OR state = UPPER($1))`,
      [region]
    );
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      region,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};