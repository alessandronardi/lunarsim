import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Set GEMINI_API_KEY globally for backend proxy calls
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  return {
    plugins: [
      react(),
      {
        name: 'api-chat-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/chat')) {
              // GET request: check if key is set
              if (req.method === 'GET') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ hasApiKey: !!process.env.GEMINI_API_KEY }));
                return;
              }

              // POST request: proxy to Gemini API
              if (req.method === 'POST') {
                const apiKey = process.env.GEMINI_API_KEY;
                if (!apiKey) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured locally in .env' }));
                  return;
                }

                try {
                  // Buffer request body
                  let bodyStr = '';
                  req.on('data', (chunk: any) => { bodyStr += chunk; });
                  req.on('end', async () => {
                    let parsedBody;
                    try {
                      parsedBody = JSON.parse(bodyStr);
                    } catch (e) {
                      res.writeHead(400, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ error: 'Malformed JSON body' }));
                      return;
                    }

                    const { model, contents, systemInstruction } = parsedBody;
                    const targetModel = model || 'gemini-3.5-flash';
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

                    try {
                      const response = await fetch(geminiUrl, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          contents,
                          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                          generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 1024,
                          }
                        })
                      });

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        res.writeHead(response.status, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(errorData));
                        return;
                      }

                      const data = await response.json();
                      res.writeHead(200, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify(data));
                    } catch (error: any) {
                      res.writeHead(500, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ error: error.message || 'Internal Server Error' }));
                    }
                  });
                } catch (err: any) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
                }
                return;
              }
            }
            next();
          });
        }
      }
    ],
    server: {
      port: 5188,
      strictPort: true,
    }
  };
})
