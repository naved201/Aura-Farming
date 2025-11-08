import { defineConfig } from 'vite'
<<<<<<< HEAD
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,js}",
      jsxRuntime: 'automatic',
    }),
  ],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})

=======

export default defineConfig({
  server: {
    port: 5173,
    // Handle client-side routing
    historyApiFallback: true
  }
})
>>>>>>> 5a5850b6214bf8f9ef5085e289a4386c27f27786
