import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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
