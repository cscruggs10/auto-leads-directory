import axios from 'axios';
import pool from '../config/database';
import { parseADFResponse } from '../utils/adf.formatter';

const MAX_RETRY_ATTEMPTS = parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3');
const RETRY_DELAY = parseInt(process.env.WEBHOOK_RETRY_DELAY || '5000');

export async function deliverLeadWebhook(leadId: number, adfXml: string, dealerId: number): Promise<void> {
  try {
    console.log(`Attempting to deliver lead ${leadId} to dealer ${dealerId}`);
    
    // Get dealer webhook configuration
    const dealerResult = await pool.query(
      'SELECT name, email, webhook_url FROM dealers WHERE id = $1',
      [dealerId]
    );
    
    if (dealerResult.rows.length === 0) {
      throw new Error(`Dealer ${dealerId} not found`);
    }
    
    const dealer = dealerResult.rows[0];
    
    // For demo purposes, we'll simulate webhook delivery
    // In production, replace with actual dealer webhook URLs
    const webhookUrl = dealer.webhook_url || `https://example.com/webhook/${dealerId}`;
    
    let lastError: Error | null = null;
    let deliverySuccessful = false;
    
    // Retry logic
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`Delivery attempt ${attempt} for lead ${leadId}`);
        
        const response = await axios.post(
          webhookUrl,
          {
            format: 'adf',
            data: adfXml,
            lead_id: leadId,
            timestamp: new Date().toISOString()
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'AutoLeadsDirectory/1.0',
              'X-Lead-Source': 'AutoLeadsDirectory'
            },
            timeout: 30000
          }
        );
        
        // Check response
        if (response.status >= 200 && response.status < 300) {
          console.log(`Lead ${leadId} delivered successfully to dealer ${dealerId}`);
          
          // Parse response if it's ADF format
          let responseData = null;
          if (response.data && typeof response.data === 'string' && response.data.includes('<?xml')) {
            responseData = parseADFResponse(response.data);
          }
          
          // Update lead delivery status
          await pool.query(
            `UPDATE leads SET 
              delivery_status = 'delivered',
              delivery_attempts = $2,
              delivery_response = $3,
              delivered_at = NOW()
            WHERE id = $1`,
            [leadId, attempt, JSON.stringify(responseData || response.data)]
          );
          
          deliverySuccessful = true;
          break;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (error) {
        const err = error as Error;
        console.error(`Delivery attempt ${attempt} failed for lead ${leadId}:`, err.message);
        lastError = err;
        
        // Update last attempt timestamp
        await pool.query(
          'UPDATE leads SET last_delivery_attempt = NOW() WHERE id = $1',
          [leadId]
        );
        
        // Wait before retry (except on last attempt)
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
    }
    
    // If all attempts failed, mark as failed
    if (!deliverySuccessful) {
      console.error(`Failed to deliver lead ${leadId} after ${MAX_RETRY_ATTEMPTS} attempts`);
      
      await pool.query(
        `UPDATE leads SET 
          delivery_status = 'failed',
          delivery_attempts = $2,
          delivery_response = $3
        WHERE id = $1`,
        [leadId, MAX_RETRY_ATTEMPTS, JSON.stringify({ error: lastError?.message || 'Unknown error' })]
      );
      
      // In production, you might want to:
      // 1. Send notification to admin
      // 2. Queue for manual review
      // 3. Try alternative delivery method (email)
    }
    
  } catch (error) {
    console.error(`Error in deliverLeadWebhook for lead ${leadId}:`, error);
    
    await pool.query(
      `UPDATE leads SET 
        delivery_status = 'failed',
        delivery_attempts = 1,
        delivery_response = $2
      WHERE id = $1`,
      [leadId, JSON.stringify({ error: (error as Error).message })]
    );
  }
}

export async function retryFailedDeliveries(): Promise<void> {
  try {
    console.log('Checking for failed lead deliveries to retry...');
    
    // Get failed deliveries from last 24 hours
    const result = await pool.query(`
      SELECT id, adf_xml, dealer_id 
      FROM leads 
      WHERE delivery_status = 'failed' 
        AND created_at > NOW() - INTERVAL '24 hours'
        AND delivery_attempts < $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [MAX_RETRY_ATTEMPTS]);
    
    console.log(`Found ${result.rows.length} failed deliveries to retry`);
    
    for (const lead of result.rows) {
      await deliverLeadWebhook(lead.id, lead.adf_xml, lead.dealer_id);
      
      // Small delay between retries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error('Error in retryFailedDeliveries:', error);
  }
}