import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Support CORS for client invocations across domains
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { to, subject, html, text } = req.body || {};
    if (!to || (!html && !text)) {
      return res.status(400).json({ error: 'Recipient (to) and content (html or text) are required' });
    }

    const currentSender = process.env.SYSTEM_EMAIL_SENDER || 'mannargreenride@gmail.com';
    const currentHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const currentPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const currentUser = process.env.SMTP_USER || 'mannargreenride@gmail.com';
    const currentPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'gvjwgypcbeczpowb';

    if (!currentPass) {
      return res.status(500).json({ error: 'SMTP password not configured' });
    }

    const transporter = nodemailer.createTransport({
      host: currentHost,
      port: currentPort,
      secure: currentPort === 465,
      auth: {
        user: currentUser,
        pass: currentPass,
      },
    });

    await transporter.sendMail({
      from: `"Mannar Green Ride" <${currentSender}>`,
      to,
      subject,
      text: text || '',
      html: html || '',
    });

    return res.status(200).json({ success: true, message: 'System email dispatched successfully' });
  } catch (err) {
    console.error('❌ [Vercel API Email] Delivery failure:', err);
    return res.status(500).json({ error: err.message || 'Failed to dispatch email' });
  }
}
