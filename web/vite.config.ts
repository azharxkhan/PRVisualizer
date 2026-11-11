import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // A GitHub Pages project site is served from /<repo>/, so assets need that prefix. The Pages
  // workflow sets BASE_PATH; every other build stays at the root.
  base: process.env.BASE_PATH ?? '/',
  server: {
    proxy: {
      // Keep the target in sync with the HTTPS port in
      // api/PrMap.Api/Properties/launchSettings.json.
      // secure: false trusts only the local dev certificate - never ship it.
      '/api': { target: 'https://localhost:7198', secure: false },
    },
  },
})
