import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Simple API health route in case it is requested
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Serve static files and handle fallbacks
  if (process.env.NODE_ENV !== 'production') {
    // Development mode: Utilize Vite middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve static assets out of output dist/
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));

    // Handle deep link requests by redirecting them into modern index.html SPA
    app.get('*', (req, res, next) => {
      // Bypass fallback for standard file extension requests that missed static files
      if (req.path.includes('.') || req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GoalSpire Express Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
