import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vite.dev/config/
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
  plugins: [react(), tailwindcss(), wasm(), topLevelAwait(), viteCommonjs()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      url: 'url',
      fs: 'browserify-fs',
    },
    
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
    include: [
      'buffer',
      'process',
    ],
  },
  define: {},
});
