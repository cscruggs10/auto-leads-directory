import axios from 'axios';

interface EmailData {
  to: string;
  name: string;
  vehicle: string;
  dealer: string;
  confirmationNumber?: string;
}

export async function sendLeadConfirmationEmail(emailData: EmailData): Promise<void> {
  try {
    console.log(`Sending confirmation email to ${emailData.to}`);
    
    const emailService = process.env.EMAIL_SERVICE || 'sendgrid';
    
    if (emailService === 'sendgrid') {
      await sendViaSendGrid(emailData);
    } else if (emailService === 'ses') {
      await sendViaSES(emailData);
    } else {
      console.warn('No email service configured, skipping email send');
    }
    
  } catch (error) {
    console.error('Failed to send confirmation email:', (error as Error).message);
    // Don't throw - email failure shouldn't break lead submission
  }
}

async function sendViaSendGrid(emailData: EmailData): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('SendGrid API key not configured');
    return;
  }
  
  const emailContent = generateEmailContent(emailData);
  
  const payload = {
    personalizations: [{
      to: [{ email: emailData.to, name: emailData.name }],
      subject: 'Your Vehicle Inquiry Confirmation - Auto Leads Directory'
    }],
    from: {
      email: process.env.EMAIL_FROM || 'noreply@autoleadsdirectory.com',
      name: 'Auto Leads Directory'
    },
    content: [{
      type: 'text/html',
      value: emailContent
    }]
  };
  
  await axios.post(
    'https://api.sendgrid.com/v3/mail/send',
    payload,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  );
  
  console.log(`Confirmation email sent successfully to ${emailData.to}`);
}

async function sendViaSES(emailData: EmailData): Promise<void> {
  // AWS SES implementation would go here
  console.log('AWS SES email sending not implemented yet');
}

function generateEmailContent(emailData: EmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vehicle Inquiry Confirmation</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1E3A8A; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .highlight { background: #F59E0B; color: white; padding: 10px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Auto Leads Directory</h1>
                <p>Your Vehicle Inquiry Confirmation</p>
            </div>
            
            <div class="content">
                <h2>Thank you, ${emailData.name}!</h2>
                
                <p>We've received your inquiry about the <strong>${emailData.vehicle}</strong> from <strong>${emailData.dealer}</strong>.</p>
                
                <div class="highlight">
                    <h3>What happens next?</h3>
                    <ul>
                        <li>A representative from ${emailData.dealer} will contact you within <strong>24-48 hours</strong></li>
                        <li>They'll provide pricing information and answer any questions</li>
                        <li>You can schedule a test drive and discuss financing options</li>
                    </ul>
                </div>
                
                <h3>Your Inquiry Details:</h3>
                <ul>
                    <li><strong>Vehicle:</strong> ${emailData.vehicle}</li>
                    <li><strong>Dealer:</strong> ${emailData.dealer}</li>
                    <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
                    ${emailData.confirmationNumber ? `<li><strong>Confirmation:</strong> ${emailData.confirmationNumber}</li>` : ''}
                </ul>
                
                <p><strong>Important:</strong> If you don't hear from the dealer within 48 hours, please contact us at <a href="mailto:support@autoleadsdirectory.com">support@autoleadsdirectory.com</a></p>
            </div>
            
            <div class="footer">
                <p>This email was sent because you submitted a vehicle inquiry on Auto Leads Directory.</p>
                <p>If you have questions, contact us at support@autoleadsdirectory.com</p>
            </div>
        </div>
    </body>
    </html>
  `;
}