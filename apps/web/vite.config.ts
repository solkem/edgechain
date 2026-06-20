import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vite.dev/config/
// Based on working config from midnight-seabattle:
// https://github.com/bricktowers/midnight-seabattle/blob/master/battleship-ui/vite.config.ts
export default defineConfig({
  cacheDir: "./.vite",
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 8080,
    host: true,
  },
  build: {
    target: "esnext",
    minify: false,
    outDir: 'dist',
    assetsDir: 'assets',
  },
  plugins: [
    wasm(),
    react(),
    tailwindcss(),
    viteCommonjs(),
    topLevelAwait(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      util: 'util/',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
      define: {
        global: 'globalThis',
      },
    },
    include: [
      'util',
    ],
    // CRITICAL: Exclude Midnight packages with WASM from optimization
    // These use top-level await which esbuild can't handle in CJS context
    exclude: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/onchain-runtime',
      '@midnight-ntwrk/zswap',
      '@midnight-ntwrk/ledger',
      'object-inspect', // Exclude so our util polyfill works
    ],
  },
  ssr: {
    noExternal: ['util', 'object-inspect'],
  },
  define: {},
});
