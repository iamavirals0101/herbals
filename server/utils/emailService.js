import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';

const createTransporter = (port = smtpPort, secure = smtpSecure) =>
  nodemailer.createTransport({
    host: smtpHost,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 30000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 20000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 45000),
    pool: false
  });

const sendViaResend = async (to, subject, text, htmlOverride = null) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'RESEND_API_KEY is missing' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html: htmlOverride || createEmailTemplate(text)
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      success: false,
      error: data?.message || `Resend API error (${response.status})`
    };
  }

  return { success: true, messageId: data?.id || null };
};

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
export const sendEmail = async (to, subject, text, options = {}) => {
  const htmlOverride = options?.html || null;
  const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  if (provider === 'resend') {
    try {
      const result = await sendViaResend(to, subject, text, htmlOverride);
      if (result.success) {
        console.log('Email sent successfully via Resend', result.messageId || '');
      } else {
        console.error('Error sending email via Resend', result.error);
      }
      return result;
    } catch (err) {
      console.error('Error sending email via Resend', err.message);
      return { success: false, error: err.message || 'Resend send error' };
    }
  }

  const attempts = [
    { port: smtpPort, secure: smtpSecure },
    // Fallback for providers/environments where implicit SSL port is blocked.
    { port: 587, secure: false }
  ];

  const mailOptions = {
    from: {
      name: process.env.EMAIL_FROM_NAME,
      address: process.env.EMAIL_USER
    },
    to,
    subject,
    text, // Plain text version
    html: htmlOverride || createEmailTemplate(text), // HTML version
    headers: {
      'X-Entity-Ref-ID': Date.now().toString(), // Unique ID for each email
      'List-Unsubscribe': `<mailto:${process.env.EMAIL_USER}?subject=unsubscribe>`,
      'Precedence': 'bulk', // Mark as bulk email
      'X-Auto-Response-Suppress': 'OOF, AutoReply' // Suppress auto-replies
    },
    priority: 'normal',
    encoding: 'utf-8'
  };

  try {
    let lastError = null;

    for (const attempt of attempts) {
      try {
        const transporter = createTransporter(attempt.port, attempt.secure);
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully via ${smtpHost}:${attempt.port}`, info.messageId);
        return { success: true, messageId: info.messageId };
      } catch (err) {
        lastError = err;
        console.error(`Error sending email via ${smtpHost}:${attempt.port}`, err.message);
      }
    }

    return { success: false, error: lastError?.message || 'Unknown email send error' };
  } catch (error) {
    console.error('Error sending email:', error.message);
    return { success: false, error: error.message || 'Unknown email send error' };
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
