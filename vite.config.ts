import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function whatsappProxyPlugin() {
  return {
    name: 'whatsapp-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/whatsapp/send', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { to, message, gatewayUrl, apiKey } = JSON.parse(body || '{}');
            if (!to || !message) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Recipient number (to) and message are required' }));
              return;
            }

            // If a gateway URL is provided, forward to it
            if (gatewayUrl && gatewayUrl.startsWith('http')) {
              try {
                const response = await fetch(gatewayUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { 'Authorization': `Bearer ${apiKey}`, 'token': apiKey } : {}),
                  },
                  body: JSON.stringify({
                    to,
                    phone: to,
                    body: message,
                    message,
                  }),
                });
                const data = await response.json().catch(() => ({}));
                res.statusCode = response.ok ? 200 : response.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: response.ok, data }));
                return;
              } catch (fetchErr: any) {
                console.error('[WhatsApp Proxy] Error contacting gateway:', fetchErr);
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to contact WhatsApp gateway: ' + fetchErr.message }));
                return;
              }
            }

            // Direct automated dispatch acknowledgment (e.g. simulation / direct mode)
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, mode: 'automated_direct', to, sentAt: Date.now() }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), whatsappProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 9898,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
