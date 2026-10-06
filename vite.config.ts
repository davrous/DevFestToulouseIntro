import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  server: { strictPort: true, port: 5173 },
  preview: { strictPort: true, port: 4173 },
  test: {
    // Kabelsalat's "main" is an IIFE; Node tests need its published ESM entry.
    alias: {
      "@kabelsalat/web": resolve("node_modules", "@kabelsalat", "web", "dist", "index.mjs"),
      "@kabelsalat/core": resolve("node_modules", "@kabelsalat", "core", "dist", "index.mjs"),
    },
    server: { deps: { inline: ["@strudel/core", "@strudel/mini", "@strudel/transpiler", "@kabelsalat/web", "@kabelsalat/core", "@kabelsalat/lib"] } },
  },
  build: {
    target: "es2022",
    rollupOptions: { input: { show: resolve("index.html"), strudel: resolve("strudel", "index.html") } },
  },
});
