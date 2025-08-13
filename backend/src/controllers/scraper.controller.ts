import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { scrapeAllDealers, scrapeDealerInventory } from '../services/scraper.service';

let isScrapingInProgress = false;

export const triggerScraping = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In production, this should be protected with authentication
    const { dealer_id } = req.body;

    if (isScrapingInProgress) {
      return res.status(409).json({
        success: false,
        message: 'Scraping is already in progress'
      });
    }

    isScrapingInProgress = true;

    // Start scraping in the background
    if (dealer_id) {
      // Scrape specific dealer
      scrapeDealerInventory(dealer_id)
        .finally(() => {
          isScrapingInProgress = false;
        });
      
      res.json({
        success: true,
        message: `Scraping initiated for dealer ${dealer_id}`
      });
    } else {
      // Scrape all dealers
      scrapeAllDealers()
        .finally(() => {
          isScrapingInProgress = false;
        });
      
      res.json({
        success: true,
        message: 'Scraping initiated for all dealers'
      });
    }
  } catch (error) {
    isScrapingInProgress = false;
    next(error);
  }
};

export const getScrapingStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the latest scraping log for each dealer
    const query = `
      WITH latest_logs AS (
        SELECT DISTINCT ON (dealer_id)
          sl.*,
          d.name as dealer_name
        FROM scraping_logs sl
        JOIN dealers d ON sl.dealer_id = d.id
        ORDER BY dealer_id, started_at DESC
      )
      SELECT * FROM latest_logs
      ORDER BY started_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      is_scraping: isScrapingInProgress,
      recent_logs: result.rows
    });
  } catch (error) {
    next(error);
  }
};

export const getScrapingLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dealer_id, status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        sl.*,
        d.name as dealer_name,
        d.slug as dealer_slug
      FROM scraping_logs sl
      JOIN dealers d ON sl.dealer_id = d.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (dealer_id) {
      paramCount++;
      query += ` AND sl.dealer_id = $${paramCount}`;
      params.push(dealer_id);
    }

    if (status) {
      paramCount++;
      query += ` AND sl.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY sl.started_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM scraping_logs WHERE 1=1`;
    const countParams: any[] = [];
    let countParamCount = 0;

    if (dealer_id) {
      countParamCount++;
      countQuery += ` AND dealer_id = $${countParamCount}`;
      countParams.push(dealer_id);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total
      }
    });
  } catch (error) {
    next(error);
  }
};