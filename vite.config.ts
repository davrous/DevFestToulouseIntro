import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: { strictPort: true, port: 5173 },
  preview: { strictPort: true, port: 4173 },
  build: { target: "es2022" },
});
