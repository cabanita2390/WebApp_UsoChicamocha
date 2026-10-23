// vite.config.js
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  define: {
    // Polyfill para 'global' en el navegador (para sockjs-client)
    global: 'globalThis',
  },
})