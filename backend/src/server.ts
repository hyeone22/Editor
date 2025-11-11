import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { registerHealthRoute } from './routes/health';
import { registerExportPdfRoute } from './routes/exportPdf';

export const createServer = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  registerHealthRoute(app);
  registerExportPdfRoute(app);

  app.get('/', (_req, res) => {
    res.json({ message: 'Editor backend is running' });
  });

  return app;
};
