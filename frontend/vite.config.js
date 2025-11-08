import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    // Handle client-side routing
    historyApiFallback: true
  }
})
