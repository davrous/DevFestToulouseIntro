import "./style.css";
import { App } from "./engine/App";
import type { ShowController } from "./engine/ShowController";
import type { SimReadyViewer } from "./simready/SimReadyViewer";

declare global {
  interface Window { devfest: App; showController: ShowController; simreadyViewer?: SimReadyViewer }
}

async function boot(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#render-canvas");
  if (!canvas) throw new Error("The render canvas is missing.");
  if (new URLSearchParams(location.search).get("asset-viewer") === "simready") {
    const { SimReadyViewer } = await import("./simready/SimReadyViewer");
    const viewer = new SimReadyViewer(canvas);
    window.simreadyViewer = viewer;
    await viewer.initialize();
    return;
  }
  const app = new App(canvas);
  window.devfest = app;
  window.showController = app.showController;
  await app.initialize();
}

void boot().catch((error: unknown) => {
  console.error("DevFest initialization failed", error);
  const status = document.getElementById("load-status");
  if (status) status.textContent = `Unable to initialize: ${error instanceof Error ? error.message : String(error)}. Verify the local assets and graphics support, then reload.`;
});
