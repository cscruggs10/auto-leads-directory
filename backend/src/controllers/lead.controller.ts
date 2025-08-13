import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { formatToADF } from '../utils/adf.formatter';
import { deliverLeadWebhook } from '../services/webhook.service';
import { syncLeadToCRM } from '../services/crm.service';
import { sendLeadConfirmationEmail } from '../services/email.service';

export const createLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      vehicle_vin,
      first_name,
      last_name,
      email,
      phone,
      employment_status,
      down_payment_available,
      bankruptcy_status,
      credit_score_range,
      preferred_contact_method,
      preferred_contact_time,
      comments,
      utm_source,
      utm_medium,
      utm_campaign
    } = req.body;

    // Get vehicle and dealer information
    const vehicleQuery = `
      SELECT v.*, d.id as dealer_id, d.name as dealer_name, d.email as dealer_email
      FROM vehicles v
      JOIN dealers d ON v.dealer_id = d.id
      WHERE v.vin = $1
    `;
    
    const vehicleResult = await pool.query(vehicleQuery, [vehicle_vin]);
    
    if (vehicleResult.rows.length === 0) {
      return next(new AppError('Vehicle not found', 404));
    }

    const vehicle = vehicleResult.rows[0];

    // Get client IP
    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const user_agent = req.headers['user-agent'];

    // Insert lead into database
    const insertQuery = `
      INSERT INTO leads (
        vehicle_vin,
        dealer_id,
        first_name,
        last_name,
        email,
        phone,
        employment_status,
        down_payment_available,
        bankruptcy_status,
        credit_score_range,
        preferred_contact_method,
        preferred_contact_time,
        comments,
        utm_source,
        utm_medium,
        utm_campaign,
        ip_address,
        user_agent,
        lead_source,
        lead_type
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      ) RETURNING *
    `;

    const leadResult = await pool.query(insertQuery, [
      vehicle_vin,
      vehicle.dealer_id,
      first_name,
      last_name,
      email,
      phone,
      employment_status,
      down_payment_available,
      bankruptcy_status,
      credit_score_range || null,
      preferred_contact_method || 'phone',
      preferred_contact_time || null,
      comments || null,
      utm_source || null,
      utm_medium || null,
      utm_campaign || null,
      ip_address,
      user_agent,
      'website',
      'price_request'
    ]);

    const lead = leadResult.rows[0];

    // Format lead to ADF
    const adfXml = formatToADF({
      ...lead,
      vehicle,
      dealer_name: vehicle.dealer_name
    });

    // Update lead with ADF XML
    await pool.query(
      'UPDATE leads SET adf_xml = $1 WHERE id = $2',
      [adfXml, lead.id]
    );

    // Increment lead count for vehicle
    await pool.query(
      'UPDATE vehicles SET leads_count = leads_count + 1 WHERE vin = $1',
      [vehicle_vin]
    );

    // Async operations (don't wait for these)
    Promise.all([
      // Deliver lead via webhook
      deliverLeadWebhook(lead.id, adfXml, vehicle.dealer_id),
      
      // Sync to CRM
      syncLeadToCRM(lead),
      
      // Send confirmation email
      sendLeadConfirmationEmail({
        to: email,
        name: `${first_name} ${last_name}`,
        vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        dealer: vehicle.dealer_name
      })
    ]).catch(error => {
      console.error('Error in async lead processing:', error);
    });

    res.status(201).json({
      success: true,
      message: 'Lead submitted successfully',
      data: {
        id: lead.id,
        confirmation_number: `AL${lead.id.toString().padStart(6, '0')}`,
        estimated_contact_time: '24-48 hours'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getLeadById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // In production, this should be protected with authentication
    const query = `
      SELECT 
        l.*,
        v.year,
        v.make,
        v.model,
        v.vin,
        d.name as dealer_name
      FROM leads l
      LEFT JOIN vehicles v ON l.vehicle_vin = v.vin
      LEFT JOIN dealers d ON l.dealer_id = d.id
      WHERE l.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return next(new AppError('Lead not found', 404));
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const getLeadStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In production, this should be protected with authentication
    const { start_date, end_date, dealer_id } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered_leads,
        COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed_leads,
        COUNT(CASE WHEN delivery_status = 'pending' THEN 1 END) as pending_leads,
        COUNT(DISTINCT dealer_id) as unique_dealers,
        COUNT(DISTINCT vehicle_vin) as unique_vehicles
      FROM leads
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (start_date) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(end_date);
    }

    if (dealer_id) {
      paramCount++;
      query += ` AND dealer_id = $${paramCount}`;
      params.push(dealer_id);
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};