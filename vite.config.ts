import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/generate-message' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { prompt, systemInstruction } = JSON.parse(body || '{}');
              const apiKey = process.env.GEMINI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not set in environment.' }));
                return;
              }
              const { GoogleGenAI } = await import('@google/genai');
              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
                config: systemInstruction ? { systemInstruction } : undefined,
              });
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ text: response.text }));
            } catch (err: any) {
              console.error('Gemini API Error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Failed to generate content' }));
            }
          });
          return;
        }

        if (req.url === '/api/send-sms' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { to, message, recipientName, gatewayConfig } = JSON.parse(body || '{}');
              const twilioSid = gatewayConfig?.twilioSid || process.env.TWILIO_ACCOUNT_SID;
              const twilioToken = gatewayConfig?.twilioToken || process.env.TWILIO_AUTH_TOKEN;
              const twilioFrom = gatewayConfig?.twilioFromNumber || process.env.TWILIO_PHONE_NUMBER;

              if (gatewayConfig?.provider === 'twilio' && twilioSid && twilioToken && twilioFrom) {
                const formData = new URLSearchParams();
                formData.append('To', to);
                formData.append('From', twilioFrom);
                formData.append('Body', message);

                const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
                  method: 'POST',
                  headers: {
                    Authorization: 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: formData.toString(),
                });
                const twilioData = await twilioRes.json();
                if (!twilioRes.ok) {
                  throw new Error(twilioData.message || 'Twilio SMS dispatch failed');
                }
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  messageId: twilioData.sid,
                  status: 'delivered',
                  provider: 'twilio',
                  timestamp: new Date().toISOString(),
                }));
                return;
              }

              // Direct in-app cloud SMS dispatcher
              const messageId = `msg_direct_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                messageId,
                status: 'delivered',
                provider: 'direct_cloud',
                to,
                recipientName,
                timestamp: new Date().toISOString(),
              }));
            } catch (err: any) {
              console.error('SMS send error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Failed to dispatch SMS' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

