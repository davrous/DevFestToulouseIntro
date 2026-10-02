import "./style.css";
import { App } from "./engine/App";

declare global {
  interface Window { devfest: App }
}

async function boot(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#render-canvas");
  if (!canvas) throw new Error("The render canvas is missing.");
  const app = new App(canvas);
  window.devfest = app;
  await app.initialize();
}

void boot().catch((error: unknown) => {
  console.error("DevFest initialization failed", error);
  const status = document.getElementById("load-status");
  if (status) status.textContent = `Unable to initialize: ${error instanceof Error ? error.message : String(error)}. Check WebGL support and reload.`;
});
