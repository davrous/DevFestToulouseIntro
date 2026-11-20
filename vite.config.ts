import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  server: { strictPort: true, port: 31000 },
  preview: { strictPort: true, port: 4173 },
  test: {
    // Use the browser's ESM paths: Kabelsalat's main is an IIFE; some Tonal CJS paths are absent.
    alias: [
      { find: "@kabelsalat/web", replacement: resolve("node_modules", "@kabelsalat", "web", "dist", "index.mjs") },
      { find: "@kabelsalat/core", replacement: resolve("node_modules", "@kabelsalat", "core", "dist", "index.mjs") },
      { find: "@strudel/tonal", replacement: resolve("node_modules", "@strudel", "tonal", "tonal.mjs") },
      { find: /^@tonaljs\/([^/]+)$/, replacement: `${resolve("node_modules", "@tonaljs")}/$1/dist/index.mjs` },
    ],
    server: { deps: { inline: ["@strudel/core", "@strudel/mini", "@strudel/tonal", "@strudel/transpiler", /@tonaljs\//, "@kabelsalat/web", "@kabelsalat/core", "@kabelsalat/lib"] } },
  },
  build: {
    target: "es2022",
    rollupOptions: { input: { show: resolve("index.html"), strudel: resolve("strudel", "index.html") } },
  },
});
