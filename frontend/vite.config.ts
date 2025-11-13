import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repository = process.env.GITHUB_REPOSITORY;
const inferredBasePath = repository ? `/${repository.split('/').pop()}/` : '/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? inferredBasePath : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  // Vitest configuration - ignored by TypeScript without vitest types.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error Vitest config is picked up when the dependency is installed.
  test: {
    environment: 'happy-dom',
    globals: true,
    restoreMocks: true
  }
}));
