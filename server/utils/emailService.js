import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure Nodemailer transporter for Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  },
  pool: true, // Use pooled connections for better performance
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000, // 1 second between batches
  rateLimit: 5 // Max 5 messages per second
});

// Generate a simple HTML email template
const createEmailTemplate = (message) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${process.env.EMAIL_FROM_NAME}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          ${message}
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: center;">
          <p>This email was sent by ${process.env.EMAIL_FROM_NAME}. If you wish to unsubscribe, please contact us.</p>
        </div>
      </body>
    </html>
  `;
};

// Send a single email
export const sendEmail = async (to, subject, text) => {
  try {
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME,
        address: process.env.EMAIL_USER
      },
      to,
      subject,
      text, // Plain text version
      html: createEmailTemplate(text), // HTML version
      headers: {
        'X-Entity-Ref-ID': Date.now().toString(), // Unique ID for each email
        'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER}?subject=unsubscribe>`,
        'Precedence': 'bulk', // Mark as bulk email
        'X-Auto-Response-Suppress': 'OOF, AutoReply' // Suppress auto-replies
      },
      priority: 'normal',
      encoding: 'utf-8'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send campaign emails in batches to avoid rate limits
export const sendCampaignEmails = async (customers, campaign) => {
  const results = [];
  const batchSize = 5;
  const delayBetweenBatches = 2000; // 2 seconds

  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);
    const batchPromises = batch.map(customer => 
      sendEmail(
        customer.email,
        campaign.name,
        campaign.message
      )
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Wait between batches to avoid hitting provider rate limits
    if (i + batchSize < customers.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return results;
}; 