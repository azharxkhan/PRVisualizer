import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Keep the target in sync with the HTTPS port in
      // api/PrMap.Api/Properties/launchSettings.json.
      // secure: false trusts only the local dev certificate - never ship it.
      '/api': { target: 'https://localhost:7001', secure: false },
    },
  },
})
