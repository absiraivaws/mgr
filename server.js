import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '9898', 10);
const distDir = path.join(__dirname, 'dist');
const indexHtml = path.join(distDir, 'index.html');

// Ensure production bundle exists; if not, build it automatically
if (!fs.existsSync(indexHtml)) {
  console.log('📦 [Node.js Server] "dist" not found. Running build...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ [Node.js Server] Initial build failed:', err);
  }
}

const app = express();

app.use(express.json());

// System Email Transporter configuration (strictly mannargreenride@gmail.com)
const SYSTEM_SENDER_EMAIL = process.env.SYSTEM_EMAIL_SENDER || 'mannargreenride@gmail.com';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || 'mannargreenride@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';

let mailTransporter = null;
if (SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

// System Email Sender Endpoint (Notifications, Account alerts, Confirmations, Automated messages)
// All system-generated emails must originate from mannargreenride@gmail.com
app.post('/api/email/send', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body || {};
    if (!to || (!html && !text)) {
      return res.status(400).json({ error: 'Recipient (to) and content (html or text) are required' });
    }

    if (!process.env.SMTP_PASS) {
      dotenv.config();
    }

    const currentPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || SMTP_PASS;
    const currentHost = process.env.SMTP_HOST || SMTP_HOST;
    const currentPort = parseInt(process.env.SMTP_PORT || String(SMTP_PORT), 10);
    const currentUser = process.env.SMTP_USER || SMTP_USER;
    const currentSender = process.env.SYSTEM_EMAIL_SENDER || SYSTEM_SENDER_EMAIL;

    if (!currentPass) {
      console.warn(`[System Email] SMTP credentials not yet configured in server environment. Simulated dispatch to ${to}`);
      return res.status(200).json({
        success: true,
        mode: 'simulated_pending_smtp_credentials',
        from: `Mannar Green Ride <${currentSender}>`,
        to,
        subject: subject || 'Mannar Green Ride Notification',
        message: 'Email dispatch registered. To deliver actual emails, set SMTP_PASS (Google App Password) in your server environment.'
      });
    }

    const transporter = nodemailer.createTransport({
      host: currentHost,
      port: currentPort,
      secure: currentPort === 465,
      auth: { user: currentUser, pass: currentPass },
    });

    const info = await transporter.sendMail({
      from: `"Mannar Green Ride" <${currentSender}>`,
      to,
      subject: subject || 'Mannar Green Ride Notification',
      text,
      html,
    });

    console.log(`[System Email] Successfully delivered email to ${to}: ${info.messageId}`);
    return res.status(200).json({
      success: true,
      from: `Mannar Green Ride <${currentSender}>`,
      to,
      messageId: info.messageId,
    });
  } catch (err) {
    console.error('[System Email] Delivery failure:', err);
    return res.status(500).json({ error: err.message || 'Email delivery failed' });
  }
});

// WhatsApp Proxy Endpoint (for SMS / WhatsApp API gateways)
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { to, message, gatewayUrl, apiKey } = req.body || {};
    if (!to || !message) {
      return res.status(400).json({ error: 'Recipient number (to) and message are required' });
    }

    if (gatewayUrl && gatewayUrl.startsWith('http')) {
      try {
        const gatewayRes = await fetch(gatewayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}`, token: apiKey } : {}),
          },
          body: JSON.stringify({
            to,
            phone: to,
            body: message,
            message,
          }),
        });

        const data = await gatewayRes.json().catch(() => ({}));
        return res.status(gatewayRes.ok ? 200 : gatewayRes.status).json({
          success: gatewayRes.ok,
          data,
        });
      } catch (fetchErr) {
        console.error('[WhatsApp Proxy] Error contacting gateway:', fetchErr);
        return res.status(502).json({ error: 'Failed to contact WhatsApp gateway: ' + fetchErr.message });
      }
    }

    // Direct automated simulated acknowledgment
    return res.status(200).json({ success: true, mode: 'automated_direct', to, sentAt: Date.now() });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'node-express',
    port: PORT,
    timestamp: new Date().toISOString(),
    distReady: fs.existsSync(indexHtml),
  });
});

// Serve static assets from dist
app.use(express.static(distDir));

// SPA fallback: any other route serves index.html
app.get('*', (req, res) => {
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(503).send('Application bundle building or not found. Run "npm run build".');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=================================================`);
  console.log(`🚀 Multi-Business Hub (Node.js / Express Server)`);
  console.log(`📡 Local:   http://localhost:${PORT}`);
  console.log(`📂 Serving: ${distDir}`);
  console.log(`=================================================\n`);
});
