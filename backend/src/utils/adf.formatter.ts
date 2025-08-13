interface ADFLeadData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  comments?: string;
  vehicle: {
    vin: string;
    year: number;
    make: string;
    model: string;
    stock_number?: string;
    price?: number;
    mileage?: number;
  };
  dealer_name: string;
  employment_status?: string;
  down_payment_available?: number;
  bankruptcy_status?: string;
  credit_score_range?: string;
  preferred_contact_method?: string;
  preferred_contact_time?: string;
  created_at?: Date;
}

export function formatToADF(data: ADFLeadData): string {
  const timestamp = new Date().toISOString();
  
  // Build ADF XML format
  const adf = `<?xml version="1.0" encoding="UTF-8"?>
<?adf version="1.0"?>
<adf>
  <prospect status="new">
    <id sequence="1" source="AutoLeadsDirectory">${data.id}</id>
    <requestdate>${timestamp}</requestdate>
    <vehicle interest="buy" status="used">
      <vin>${data.vehicle.vin}</vin>
      <year>${data.vehicle.year}</year>
      <make>${data.vehicle.make}</make>
      <model>${data.vehicle.model}</model>
      ${data.vehicle.stock_number ? `<stock>${data.vehicle.stock_number}</stock>` : ''}
      ${data.vehicle.mileage ? `<odometer units="miles">${data.vehicle.mileage}</odometer>` : ''}
      ${data.vehicle.price ? `<price type="asking">${data.vehicle.price}</price>` : ''}
    </vehicle>
    <customer>
      <contact>
        <name part="first">${escapeXml(data.first_name)}</name>
        <name part="last">${escapeXml(data.last_name)}</name>
        <email>${escapeXml(data.email)}</email>
        <phone type="voice" time="nopreference">${formatPhone(data.phone)}</phone>
      </contact>
      <comments>${escapeXml(buildComments(data))}</comments>
    </customer>
    <vendor>
      <vendorname>${escapeXml(data.dealer_name)}</vendorname>
      <contact>
        <name part="full">Internet Sales</name>
      </contact>
    </vendor>
    <provider>
      <name>Auto Leads Directory</name>
      <service>Lead Generation</service>
      <url>https://autoleadsdirectory.com</url>
    </provider>
  </prospect>
</adf>`;

  return adf.trim();
}

function escapeXml(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX if US number
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  return phone;
}

function buildComments(data: ADFLeadData): string {
  const parts: string[] = [];
  
  if (data.comments) {
    parts.push(data.comments);
  }
  
  parts.push('--- Pre-Qualification Information ---');
  
  if (data.employment_status) {
    parts.push(`Employment Status: ${data.employment_status.replace('_', ' ')}`);
  }
  
  if (data.down_payment_available) {
    parts.push(`Down Payment Available: $${data.down_payment_available}`);
  }
  
  if (data.bankruptcy_status) {
    parts.push(`Bankruptcy Status: ${data.bankruptcy_status}`);
  }
  
  if (data.credit_score_range) {
    parts.push(`Credit Score Range: ${data.credit_score_range}`);
  }
  
  if (data.preferred_contact_method) {
    parts.push(`Preferred Contact Method: ${data.preferred_contact_method}`);
  }
  
  if (data.preferred_contact_time) {
    parts.push(`Preferred Contact Time: ${data.preferred_contact_time}`);
  }
  
  return parts.join('\n');
}

export function parseADFResponse(xml: string): any {
  // Basic XML response parser for ADF responses
  // In production, use a proper XML parser like xml2js
  try {
    const status = xml.match(/<status>([^<]+)<\/status>/)?.[1];
    const message = xml.match(/<message>([^<]+)<\/message>/)?.[1];
    const leadId = xml.match(/<leadid>([^<]+)<\/leadid>/)?.[1];
    
    return {
      status: status || 'unknown',
      message: message || '',
      leadId: leadId || null
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Failed to parse response',
      leadId: null
    };
  }
}