const STORAGE_KEY = "devfest.loading-diagnostics.v1";
const BASE = { skipVideo: false, skipCinema: false, skipSimReady: false, renderLite: false, skipWarmup: false };

export const DIAGNOSTIC_PROFILES = {
  baseline: { ...BASE, label: "Version complete avec journal" },
  "no-video": { ...BASE, skipVideo: true, label: "Sans videos d'arcade" },
  "render-lite": { ...BASE, renderLite: true, label: "Rendu leger : 1280x720 max, sans HDR/MSAA/post-effets" },
  "no-cinema": { ...BASE, skipCinema: true, label: "Sans modeles du cinema, T-800 et astronaute" },
  "no-simready": { ...BASE, skipSimReady: true, label: "Sans modeles NVIDIA" },
  "no-warmup": { ...BASE, skipWarmup: true, label: "Sans pre-rendus de preparation" },
  minimal: { skipVideo: true, skipCinema: true, skipSimReady: true, renderLite: true, skipWarmup: true,
    label: "Minimum : sans videos/modeles lourds, rendu leger, sans pre-rendus" },
} as const;

export type DiagnosticName = keyof typeof DIAGNOSTIC_PROFILES;
type JournalStorage = Pick<Storage, "getItem" | "setItem">;
interface Stage { at: string; name: string; detail?: string }
export interface DiagnosticRun { profile: DiagnosticName; startedAt: string; stages: Stage[] }

function isName(value: string): value is DiagnosticName {
  return Object.hasOwn(DIAGNOSTIC_PROFILES, value);
}

export function diagnosticRoute(search: string): DiagnosticName | "report" | undefined {
  const value = new URLSearchParams(search).get("diagnostic");
  if (value === null) return undefined;
  if (value === "report" || isName(value)) return value;
  throw new RangeError(`Unknown loading diagnostic: ${value}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRun(value: unknown): value is DiagnosticRun {
  return isRecord(value) && typeof value.profile === "string" && isName(value.profile)
    && typeof value.startedAt === "string" && Array.isArray(value.stages)
    && value.stages.every((stage: unknown) => isRecord(stage) && typeof stage.at === "string"
      && typeof stage.name === "string" && (stage.detail === undefined || typeof stage.detail === "string"));
}

export function readDiagnosticRuns(storage: JournalStorage): DiagnosticRun[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.runs) || !value.runs.every(isRun)) {
    throw new Error("Invalid local loading diagnostic journal.");
  }
  return value.runs;
}

export class LoadingDiagnostics {
  readonly profile;
  readonly run: DiagnosticRun;
  storageError?: string;
  onUpdate?: () => void;
  private storage?: JournalStorage;
  private runs: DiagnosticRun[];

  constructor(readonly name: DiagnosticName, storage: () => JournalStorage = () => window.localStorage,
    private readonly now: () => string = () => new Date().toISOString()) {
    this.profile = DIAGNOSTIC_PROFILES[name];
    this.run = { profile: name, startedAt: now(), stages: [] };
    this.runs = [this.run];
    try {
      const target = storage();
      this.runs.push(...readDiagnosticRuns(target).slice(0, 7));
      this.storage = target;
    } catch (error) {
      this.reportStorageError(error);
    }
    this.mark("diagnostic:started", this.profile.label);
  }

  private reportStorageError(error: unknown): void {
    this.storage = undefined;
    this.storageError = error instanceof Error ? error.message : String(error);
    console.error("Loading diagnostic persistence unavailable; console/in-memory only.", error);
  }

  mark(name: string, detail?: string): void {
    this.run.stages.push({ at: this.now(), name, ...(detail === undefined ? {} : { detail }) });
    if (this.run.stages.length > 100) this.run.stages.shift();
    console.info(`[Loading diagnostic / ${this.name}] ${name}`, detail ?? "");
    if (this.storage) {
      try { this.storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, runs: this.runs })); }
      catch (error) { this.reportStorageError(error); }
    }
    this.onUpdate?.();
  }

  async step<T>(name: string, work: () => Promise<T>): Promise<T> {
    this.mark(`${name}:start`);
    try {
      const value = await work();
      this.mark(`${name}:done`);
      return value;
    } catch (error) {
      this.mark(`${name}:error`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}

export function startLoadingDiagnostics(name: DiagnosticName): LoadingDiagnostics {
  const panel = document.createElement("details");
  panel.open = true;
  panel.style.cssText = "position:fixed;top:8px;left:8px;right:8px;z-index:100000;padding:10px;background:#07151ff2;color:#fff;font:12px monospace;max-height:28vh;overflow:auto;user-select:text";
  const summary = document.createElement("summary"), status = document.createElement("pre");
  const report = document.createElement("a");
  report.href = "?diagnostic=report"; report.textContent = "Rapport local / exporter JSON";
  report.style.color = "#8fffd0";
  panel.append(summary, report, status); document.body.append(panel);
  const diagnostics = new LoadingDiagnostics(name);
  diagnostics.onUpdate = () => {
    summary.textContent = `Diagnostic : ${name} / ${diagnostics.run.stages.at(-1)?.name}`;
    status.textContent = [diagnostics.profile.label,
      diagnostics.storageError ? `ATTENTION : journal non persistant : ${diagnostics.storageError}` : "Traces locales uniquement.",
      ...diagnostics.run.stages.slice(-5).map((stage) => `${stage.at.slice(11, 23)} ${stage.name} ${stage.detail ?? ""}`)].join("\n");
  };
  diagnostics.mark("device", `${navigator.userAgent}; viewport ${innerWidth}x${innerHeight}; DPR ${devicePixelRatio}`);
  window.addEventListener("error", (event) => diagnostics.mark("javascript:error", event.message));
  window.addEventListener("unhandledrejection", (event) => diagnostics.mark("javascript:unhandled", String(event.reason)));
  return diagnostics;
}

export function showLoadingDiagnosticReport(): void {
  const panel = document.createElement("main");
  panel.style.cssText = "position:fixed;inset:0;z-index:100000;overflow:auto;padding:24px;background:#07151f;color:#fff;font:16px sans-serif;user-select:text";
  const title = document.createElement("h1"); title.textContent = "Diagnostic iPhone / chargement";
  const description = document.createElement("p");
  description.textContent = "Cette page ne lance pas la 3D. Choisir un test, attendre SYSTEM READY ou le plantage, puis revenir ici. Les traces restent sur cet appareil et ne sont pas envoyees automatiquement.";
  panel.append(title, description);
  for (const [name, profile] of Object.entries(DIAGNOSTIC_PROFILES)) {
    const row = document.createElement("p"), link = document.createElement("a");
    link.href = `?diagnostic=${name}`; link.textContent = profile.label; link.style.color = "#8fffd0";
    row.append(link); panel.append(row);
  }
  const normal = document.createElement("a"); normal.href = location.pathname; normal.textContent = "Version normale (sans diagnostic)"; normal.style.color = "#ffd394";
  const note = document.createElement("p");
  note.textContent = "Les 8 derniers essais sont conserves. Apres un arret brutal, une ecriture recente peut manquer. Une derniere etape en cours est un indice, pas une preuve de cause : plusieurs chargements sont paralleles.";
  panel.append(normal, note);
  const output = document.createElement("pre"); output.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px";
  try {
    const runs = readDiagnosticRuns(window.localStorage);
    output.textContent = JSON.stringify({ version: 1, runs }, null, 2);
    const download = document.createElement("button"); download.textContent = "Exporter les traces JSON";
    download.addEventListener("click", () => {
      const data = new Blob([output.textContent ?? ""], { type: "application/json" });
      const url = URL.createObjectURL(data), link = document.createElement("a");
      link.href = url; link.download = "devfest-iphone-diagnostic.json"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    panel.append(download);
  } catch (error) {
    console.error("Unable to read local loading diagnostics.", error);
    output.textContent = `Journal indisponible : ${error instanceof Error ? error.message : String(error)}`;
  }
  panel.append(output); document.body.replaceChildren(panel);
}
