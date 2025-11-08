import type { Express } from 'express';

export const registerHealthRoute = (app: Express) => {
  app.get('/api/health', (_req, res) => {
    res.json({
      message: 'Healthy',
      timestamp: new Date().toISOString(),
    });
  });
};
