import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/send': 'http://localhost:3000', // route to Express server
    }
  },
  plugins: [react()],
});
