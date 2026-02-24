// @ts-check
import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";

import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

// Cargar todas las variables de .env (el 3er arg "" significa sin filtro de prefijo)
const env = loadEnv("", process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  output: "static",
  // Configuración para GitHub Pages
  site: env.PUBLIC_BASE_URL || "http://localhost:4321",
  base: env.PUBLIC_BASE_ROUTE || "/",
  server: {
    port: Number(env.PORT) || 4321,
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      target: "es2020",
      rollupOptions: {
        output: {
          manualChunks: {
            leaflet: ["leaflet", "react-leaflet"],
          },
        },
      },
    },
    esbuild: {
      target: "es2020",
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "es2020",
      },
      include: ["leaflet", "react-leaflet"],
    },
    ssr: {
      noExternal: ["leaflet", "react-leaflet"],
    },
    worker: {
      format: "es",
    },
  },

  integrations: [react()],
});
