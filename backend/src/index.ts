import { createServer } from './server';

const PORT = Number(process.env.PORT) || 4000;

const start = async () => {
  const app = createServer();

  app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
  });
};

void start();
