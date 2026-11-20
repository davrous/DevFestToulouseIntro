import "./style.css";
import type { App } from "./engine/App";
import { diagnosticRoute, showLoadingDiagnosticReport, startLoadingDiagnostics, type LoadingDiagnostics } from "./debug/LoadingDiagnostics";
import type { ShowController } from "./engine/ShowController";
import type { SimReadyViewer } from "./simready/SimReadyViewer";

declare global {
  interface Window { devfest: App; showController: ShowController; simreadyViewer?: SimReadyViewer }
}

let loadingDiagnostics: LoadingDiagnostics | undefined;

async function boot(): Promise<void> {
  const route = diagnosticRoute(location.search);
  if (route === "report") { showLoadingDiagnosticReport(); return; }
  const diagnostics = loadingDiagnostics = route ? startLoadingDiagnostics(route) : undefined;
  diagnostics?.mark("boot:entry", new URL(import.meta.url).pathname);
  diagnostics?.mark("boot:before-app-import");
  const { App } = await import("./engine/App");
  diagnostics?.mark("boot:app-imported");
  const canvas = document.querySelector<HTMLCanvasElement>("#render-canvas");
  if (!canvas) throw new Error("The render canvas is missing.");
  if (new URLSearchParams(location.search).get("asset-viewer") === "simready") {
    const { SimReadyViewer } = await import("./simready/SimReadyViewer");
    const viewer = new SimReadyViewer(canvas);
    window.simreadyViewer = viewer;
    await viewer.initialize();
    return;
  }
  const app = new App(canvas, diagnostics);
  window.devfest = app;
  window.showController = app.showController;
  await app.initialize();
}

void boot().catch((error: unknown) => {
  loadingDiagnostics?.mark("boot:error", error instanceof Error ? error.message : String(error));
  console.error("DevFest initialization failed", error);
  const status = document.getElementById("load-status");
  if (status) status.textContent = `Unable to initialize: ${error instanceof Error ? error.message : String(error)}. Verify the local assets and graphics support, then reload.`;
});
