// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

const env = loadEnv('', process.cwd(), '');

export default defineConfig({
  output: 'static',
  site: env.PUBLIC_BASE_URL || 'http://localhost:4321',
  base: env.PUBLIC_BASE_ROUTE || '/',
  server: {
    port: Number(env.PORT) || 4321,
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      target: 'es2020',
      minify: 'esbuild', // Explicitly enable minification
      cssMinify: true, // Enable CSS minification
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/leaflet') ||
              id.includes('node_modules/react-leaflet')
            ) {
              return 'leaflet-vendor';
            }

            // Separate React runtime into its own chunk
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/scheduler')
            ) {
              return 'react-vendor';
            }

            // Separate Appwrite SDK - only includes what's imported
            if (id.includes('node_modules/appwrite')) {
              return 'appwrite-vendor';
            }

            // Group other larger dependencies
            if (
              id.includes('node_modules/@radix-ui') ||
              id.includes('node_modules/class-variance-authority')
            ) {
              return 'ui-vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 600, // Increase limit for vendor chunks
      reportCompressedSize: true, // Report gzipped sizes
    },
    esbuild: {
      target: 'es2020',
      minify: true, // Enable esbuild minification
      treeShaking: true, // Enable tree shaking
      drop: ['console', 'debugger'], // Remove console and debugger statements in production
      legalComments: 'none', // Remove comments
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2020',
      },
      include: ['leaflet', 'react-leaflet'],
    },
    ssr: {
      external: ['leaflet', 'react-leaflet'],
    },
    worker: {
      format: 'es',
    },
  },

  integrations: [react()],
});
