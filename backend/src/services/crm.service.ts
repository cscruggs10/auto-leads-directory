import axios from 'axios';
import pool from '../config/database';

interface LeadData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dealer_id: number;
  vehicle_vin?: string;
  employment_status?: string;
  down_payment_available?: number;
  bankruptcy_status?: string;
  created_at?: Date;
}

export async function syncLeadToCRM(leadData: LeadData): Promise<void> {
  try {
    console.log(`Syncing lead ${leadData.id} to GoHighLevel CRM`);
    
    const apiKey = process.env.GOHIGHLEVEL_API_KEY;
    const apiUrl = process.env.GOHIGHLEVEL_API_URL || 'https://rest.gohighlevel.com/v1';
    
    if (!apiKey) {
      console.warn('GoHighLevel API key not configured, skipping CRM sync');
      return;
    }
    
    // Get vehicle information if available
    let vehicleInfo = null;
    if (leadData.vehicle_vin) {
      const vehicleResult = await pool.query(
        'SELECT year, make, model FROM vehicles WHERE vin = $1',
        [leadData.vehicle_vin]
      );
      if (vehicleResult.rows.length > 0) {
        vehicleInfo = vehicleResult.rows[0];
      }
    }
    
    // Prepare CRM payload
    const crmPayload = {
      firstName: leadData.first_name,
      lastName: leadData.last_name,
      email: leadData.email,
      phone: leadData.phone,
      source: 'Auto Leads Directory',
      tags: ['subprime-lead', 'website-lead'],
      customFields: {
        lead_id: leadData.id.toString(),
        dealer_id: leadData.dealer_id.toString(),
        employment_status: leadData.employment_status || '',
        down_payment_available: leadData.down_payment_available?.toString() || '',
        bankruptcy_status: leadData.bankruptcy_status || '',
        vehicle_of_interest: vehicleInfo 
          ? `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`
          : '',
        vin: leadData.vehicle_vin || ''
      }
    };
    
    const response = await axios.post(
      `${apiUrl}/contacts`,
      crmPayload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    if (response.status === 200 || response.status === 201) {
      const crmLeadId = response.data.contact?.id || response.data.id;
      
      console.log(`Successfully synced lead ${leadData.id} to CRM with ID: ${crmLeadId}`);
      
      // Update lead record with CRM information
      await pool.query(
        `UPDATE leads SET 
          crm_lead_id = $1,
          crm_sync_status = 'synced',
          crm_synced_at = NOW()
        WHERE id = $2`,
        [crmLeadId, leadData.id]
      );
      
      // Create follow-up opportunity in CRM
      if (vehicleInfo) {
        await createCRMOpportunity(crmLeadId, {
          name: `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model} - ${leadData.first_name} ${leadData.last_name}`,
          value: vehicleInfo.price || 15000,
          stage: 'New Lead',
          source: 'Auto Leads Directory'
        });
      }
      
    } else {
      throw new Error(`CRM API returned status ${response.status}`);
    }
    
  } catch (error) {
    console.error(`Failed to sync lead ${leadData.id} to CRM:`, (error as Error).message);
    
    // Update lead record with sync failure
    await pool.query(
      `UPDATE leads SET 
        crm_sync_status = 'failed'
      WHERE id = $1`,
      [leadData.id]
    );
  }
}

async function createCRMOpportunity(contactId: string, opportunityData: any): Promise<void> {
  try {
    const apiKey = process.env.GOHIGHLEVEL_API_KEY;
    const apiUrl = process.env.GOHIGHLEVEL_API_URL || 'https://rest.gohighlevel.com/v1';
    
    if (!apiKey) return;
    
    const response = await axios.post(
      `${apiUrl}/opportunities`,
      {
        contactId,
        pipelineId: 'default', // Configure based on your CRM setup
        ...opportunityData
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log(`Created CRM opportunity for contact ${contactId}`);
    
  } catch (error) {
    console.error(`Failed to create CRM opportunity for contact ${contactId}:`, (error as Error).message);
  }
}

export async function retryCRMSync(): Promise<void> {
  try {
    console.log('Retrying failed CRM syncs...');
    
    // Get failed syncs from last 24 hours
    const result = await pool.query(`
      SELECT * FROM leads 
      WHERE crm_sync_status = 'failed' 
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    console.log(`Found ${result.rows.length} failed CRM syncs to retry`);
    
    for (const lead of result.rows) {
      await syncLeadToCRM(lead);
      
      // Small delay between retries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error('Error in retryCRMSync:', error);
  }
}