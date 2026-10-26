import "@babylonjs/loaders/glTF";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { SIMREADY_ASSETS, parseReports, type SimReadyAssetId, type SimReadyReport } from "./registry";

export class SimReadyAssets {
  readonly reports = new Map<SimReadyAssetId, SimReadyReport>();
  readonly errors = new Map<SimReadyAssetId, string>();
  private readonly loading = new Map<SimReadyAssetId, Promise<AssetContainer | undefined>>();
  private readonly containers = new Map<SimReadyAssetId, AssetContainer>();
  private manifest?: Promise<void>;
  private disposed = false;

  constructor(private readonly scene: Scene, private readonly notify: (message: string) => void = console.warn) {
    scene.onDisposeObservable.addOnce(() => this.dispose());
  }

  async prepare(ids: readonly SimReadyAssetId[], progress: (message: string) => void = () => {}): Promise<void> {
    this.manifest ??= this.loadManifest();
    await this.manifest;
    let loaded = 0;
    for (let index = 0; index < ids.length; index += 3) {
      await Promise.all(ids.slice(index, index + 3).map(async (id) => {
        await this.load(id);
        progress(`Loading local NVIDIA assets: ${++loaded}/${ids.length} / ${SIMREADY_ASSETS[id].title}`);
      }));
    }
  }

  private async loadManifest(): Promise<void> {
    const response = await fetch("./assets/simready/manifest.json");
    if (!response.ok) throw new Error(`SimReady manifest unavailable: HTTP ${response.status}.`);
    const input: unknown = await response.json();
    for (const [id, report] of parseReports(input)) this.reports.set(id, report);
  }

  private load(id: SimReadyAssetId): Promise<AssetContainer | undefined> {
    let pending = this.loading.get(id);
    if (!pending) {
      pending = this.loadContainer(id);
      this.loading.set(id, pending);
    }
    return pending;
  }

  private async loadContainer(id: SimReadyAssetId): Promise<AssetContainer | undefined> {
    try {
      if (!this.reports.has(id)) throw new Error("Asset is absent from the verified conversion manifest.");
      const container = await SceneLoader.LoadAssetContainerAsync("./assets/simready/", `${id}.glb`, this.scene);
      if (this.disposed) {
        container.dispose();
        return undefined;
      }
      if (!container.meshes.some((mesh) => mesh.getTotalVertices() > 0)) {
        container.dispose();
        throw new Error("GLB contains no render geometry.");
      }
      this.containers.set(id, container);
      return container;
    } catch (error) {
      const message = `Optional SimReady asset ${id} unavailable: ${error instanceof Error ? error.message : String(error)}`;
      console.error(message, error);
      this.errors.set(id, message);
      this.notify(message);
      return undefined;
    }
  }

  create(id: SimReadyAssetId, parent: TransformNode, name: string, size: number,
    dimension: "height" | "max" = "max", centered = false): TransformNode | undefined {
    if (!Number.isFinite(size) || size <= 0) throw new RangeError("SimReady instance size must be positive.");
    const container = this.containers.get(id);
    if (!container) return undefined;
    const pivot = new TransformNode(name, this.scene);
    const content = new TransformNode(`${name} / normalized`, this.scene);
    content.parent = pivot;
    const rotation = SIMREADY_ASSETS[id].rotation;
    content.rotation.set(rotation[0], rotation[1], rotation[2]);
    const entries = container.instantiateModelsToScene((source) => `${name} / ${source}`, false, { doNotInstantiate: true });
    for (const root of entries.rootNodes) {
      root.parent = content;
      root.setEnabled(true);
    }
    const { min, max } = content.getHierarchyBoundingVectors(true);
    const dimensions = max.subtract(min);
    const span = dimension === "height" ? dimensions.y : Math.max(dimensions.x, dimensions.y, dimensions.z);
    if (!Number.isFinite(span) || span <= 0) {
      pivot.dispose();
      throw new Error(`Cannot normalize SimReady ${id}: invalid model bounds.`);
    }
    const factor = size / span;
    const center = max.add(min).scale(.5);
    content.scaling.setAll(factor);
    content.position.set(-center.x * factor, -(centered ? center.y : min.y) * factor, -center.z * factor);
    pivot.parent = parent;
    pivot.metadata = { simready: id, report: this.reports.get(id) };
    for (const mesh of pivot.getChildMeshes()) mesh.isPickable = false;
    return pivot;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const container of this.containers.values()) container.dispose();
    this.containers.clear();
    this.loading.clear();
  }
}
