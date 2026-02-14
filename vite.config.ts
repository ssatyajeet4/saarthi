import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Cast process to any to avoid TS error if Node types are missing/incomplete
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This is critical: It replaces 'process.env.API_KEY' in your code
      // with the actual value from your environment variables during build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    server: {
      port: 5173,
      host: true // Exposes the server to the network (required for some phone testing methods)
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});