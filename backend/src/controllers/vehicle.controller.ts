import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/error.middleware';

export const getVehicles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = 1,
      limit = 20,
      make,
      model,
      year_min,
      year_max,
      down_payment_max,
      mileage_max,
      sort = 'created_at_desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let query = `
      SELECT 
        v.*,
        d.name as dealer_name,
        d.city as dealer_city,
        d.logo_url as dealer_logo
      FROM vehicles v
      JOIN dealers d ON v.dealer_id = d.id
      WHERE v.is_available = true
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (make) {
      paramCount++;
      query += ` AND LOWER(v.make) = LOWER($${paramCount})`;
      params.push(make);
    }

    if (model) {
      paramCount++;
      query += ` AND LOWER(v.model) = LOWER($${paramCount})`;
      params.push(model);
    }

    if (year_min) {
      paramCount++;
      query += ` AND v.year >= $${paramCount}`;
      params.push(year_min);
    }

    if (year_max) {
      paramCount++;
      query += ` AND v.year <= $${paramCount}`;
      params.push(year_max);
    }

    if (down_payment_max) {
      paramCount++;
      query += ` AND v.down_payment_required <= $${paramCount}`;
      params.push(down_payment_max);
    }

    if (mileage_max) {
      paramCount++;
      query += ` AND v.mileage <= $${paramCount}`;
      params.push(mileage_max);
    }

    // Add sorting
    const sortOptions: { [key: string]: string } = {
      'price_asc': 'v.price ASC NULLS LAST',
      'price_desc': 'v.price DESC NULLS LAST',
      'year_desc': 'v.year DESC',
      'year_asc': 'v.year ASC',
      'mileage_asc': 'v.mileage ASC',
      'mileage_desc': 'v.mileage DESC',
      'created_at_desc': 'v.created_at DESC'
    };

    query += ` ORDER BY ${sortOptions[sort as string] || 'v.created_at DESC'}`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM vehicles v
      WHERE v.is_available = true
    `;
    
    const countParams: any[] = [];
    let countParamCount = 0;

    if (make) {
      countParamCount++;
      countQuery += ` AND LOWER(v.make) = LOWER($${countParamCount})`;
      countParams.push(make);
    }

    if (model) {
      countParamCount++;
      countQuery += ` AND LOWER(v.model) = LOWER($${countParamCount})`;
      countParams.push(model);
    }

    if (year_min) {
      countParamCount++;
      countQuery += ` AND v.year >= $${countParamCount}`;
      countParams.push(year_min);
    }

    if (year_max) {
      countParamCount++;
      countQuery += ` AND v.year <= $${countParamCount}`;
      countParams.push(year_max);
    }

    if (down_payment_max) {
      countParamCount++;
      countQuery += ` AND v.down_payment_required <= $${countParamCount}`;
      countParams.push(down_payment_max);
    }

    if (mileage_max) {
      countParamCount++;
      countQuery += ` AND v.mileage <= $${countParamCount}`;
      countParams.push(mileage_max);
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

export const getVehicleByVIN = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vin } = req.params;

    const query = `
      SELECT 
        v.*,
        d.name as dealer_name,
        d.slug as dealer_slug,
        d.city as dealer_city,
        d.state as dealer_state,
        d.phone as dealer_phone,
        d.email as dealer_email,
        d.logo_url as dealer_logo,
        d.average_rating as dealer_rating
      FROM vehicles v
      JOIN dealers d ON v.dealer_id = d.id
      WHERE v.vin = $1
    `;

    const result = await pool.query(query, [vin]);

    if (result.rows.length === 0) {
      return next(new AppError('Vehicle not found', 404));
    }

    // Increment view count
    await pool.query(
      'UPDATE vehicles SET views_count = views_count + 1 WHERE vin = $1',
      [vin]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const searchVehicles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      q, // search query
      region,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let query = `
      SELECT 
        v.*,
        d.name as dealer_name,
        d.city as dealer_city,
        d.logo_url as dealer_logo
      FROM vehicles v
      JOIN dealers d ON v.dealer_id = d.id
      WHERE v.is_available = true
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (q) {
      paramCount++;
      query += ` AND (
        v.make ILIKE $${paramCount} OR
        v.model ILIKE $${paramCount} OR
        v.year::text LIKE $${paramCount} OR
        CONCAT(v.year, ' ', v.make, ' ', v.model) ILIKE $${paramCount}
      )`;
      params.push(`%${q}%`);
    }

    if (region) {
      paramCount++;
      query += ` AND (d.city ILIKE $${paramCount} OR d.state = UPPER($${paramCount}))`;
      params.push(`%${region}%`);
    }

    query += ` ORDER BY v.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedVehicles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = `
      SELECT 
        v.*,
        d.name as dealer_name,
        d.city as dealer_city,
        d.logo_url as dealer_logo
      FROM vehicles v
      JOIN dealers d ON v.dealer_id = d.id
      WHERE v.is_available = true AND v.is_featured = true
      ORDER BY v.created_at DESC
      LIMIT 12
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getVehiclesByDealer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dealerId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const query = `
      SELECT 
        v.*,
        d.name as dealer_name,
        d.city as dealer_city,
        d.logo_url as dealer_logo
      FROM vehicles v
      JOIN dealers d ON v.dealer_id = d.id
      WHERE v.dealer_id = $1 AND v.is_available = true
      ORDER BY v.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [dealerId, limit, offset]);

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM vehicles WHERE dealer_id = $1 AND is_available = true',
      [dealerId]
    );
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