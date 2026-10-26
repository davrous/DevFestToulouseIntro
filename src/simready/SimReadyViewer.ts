import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { RawCubeTexture } from "@babylonjs/core/Materials/Textures/rawCubeTexture";
import { Constants } from "@babylonjs/core/Engines/constants";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Viewport } from "@babylonjs/core/Maths/math.viewport";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { SimReadyAssets } from "./SimReadyAssets";
import { SIMREADY_ASSETS, isSimReadyAssetId } from "./registry";

export class SimReadyViewer {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: ArcRotateCamera;
  readonly assets: SimReadyAssets;
  ready = false;
  private root?: TransformNode;
  private normals?: LinesMesh;
  private readonly panel = document.createElement("aside");
  private readonly info = document.createElement("pre");
  private readonly selection = document.createElement("select");
  private readonly wireframe = document.createElement("input");
  private readonly bounds = document.createElement("input");
  private readonly showNormals = document.createElement("input");
  private readonly scale = document.createElement("input");

  constructor(canvas: HTMLCanvasElement) {
    canvas.setAttribute("aria-label", "NVIDIA SimReady model inspection");
    document.getElementById("lobby")!.hidden = true;
    document.body.classList.remove("lobby-visible");
    document.body.classList.add("simready-inspection");
    this.panel.className = "simready-viewer";
    this.panel.setAttribute("aria-label", "NVIDIA SimReady asset inspection");
    const title = document.createElement("h2");
    title.textContent = "NVIDIA SimReady / Asset viewer";
    const back = document.createElement("a");
    back.href = "./";
    back.textContent = "Return to the intro";
    this.panel.append(title, back);
    this.selection.setAttribute("aria-label", "SimReady asset");
    for (const [id, title] of [["all", "All nine assets"], ...Object.entries(SIMREADY_ASSETS).map(([id, asset]) => [id, asset.title])]) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = title;
      this.selection.append(option);
    }
    this.selection.value = "snackVendingMachine";
    this.panel.append(this.selection);
    for (const [text, input] of [["Wireframe", this.wireframe], ["Bounding boxes", this.bounds], ["Vertex normals", this.showNormals]] as const) {
      const label = document.createElement("label");
      input.type = "checkbox";
      label.append(input, text);
      this.panel.append(label);
      input.addEventListener("change", () => this.applyInspection());
    }
    const scaleLabel = document.createElement("label");
    this.scale.type = "range";
    this.scale.min = ".25";
    this.scale.max = "3";
    this.scale.step = ".05";
    this.scale.value = "1";
    this.scale.setAttribute("aria-label", "Inspection scale");
    scaleLabel.append("Scale", this.scale);
    this.panel.append(scaleLabel, this.info);
    document.body.append(this.panel);
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(.025, .04, .055, 1);
    this.camera = new ArcRotateCamera("SimReady inspection camera", -Math.PI / 2, 1.15, 4.5, new Vector3(0, 1, 0), this.scene);
    this.camera.minZ = .01;
    this.camera.lowerRadiusLimit = .25;
    this.camera.wheelPrecision = 50;
    this.camera.attachControl(canvas, true);
    new HemisphericLight("Viewer soft fill", new Vector3(.3, 1, -.4), this.scene).intensity = 1;
    new DirectionalLight("Viewer key", new Vector3(-1, -2, 1), this.scene).intensity = 1.4;
    const faces = Array.from({ length: 6 }, (_, index) => {
      const pixels = new Uint8Array(16 * 16 * 4);
      for (let pixel = 0; pixel < pixels.length; pixel += 4) {
        pixels[pixel] = index % 2 ? 135 : 200;
        pixels[pixel + 1] = index % 2 ? 155 : 210;
        pixels[pixel + 2] = index % 2 ? 180 : 220;
        pixels[pixel + 3] = 255;
      }
      return pixels;
    });
    this.scene.environmentTexture = new RawCubeTexture(this.scene, faces, 16,
      Constants.TEXTUREFORMAT_RGBA, Constants.TEXTURETYPE_UNSIGNED_BYTE, true);
    this.scene.environmentIntensity = .85;
    const ground = MeshBuilder.CreateGround("Inspection floor", { width: 24, height: 24 }, this.scene);
    ground.position.y = -.015;
    const groundMaterial = new StandardMaterial("Inspection floor material", this.scene);
    groundMaterial.diffuseColor = Color3.FromHexString("#253541");
    ground.material = groundMaterial;
    this.assets = new SimReadyAssets(this.scene, (message) => { this.info.textContent = message; });
    this.selection.addEventListener("change", () => this.select(this.selection.value));
    this.scale.addEventListener("input", () => {
      this.root?.scaling.setAll(Number(this.scale.value));
      this.applyInspection();
    });
    const resize = () => {
      this.engine.resize();
      const panelWidth = Math.min(330, Math.max(180, window.innerWidth * .38));
      this.panel.style.width = `${panelWidth}px`;
      this.camera.viewport = new Viewport(0, 0, Math.max(.25, (window.innerWidth - panelWidth - 32) / window.innerWidth), 1);
    };
    window.addEventListener("resize", resize);
    resize();
    window.addEventListener("pagehide", () => {
      this.scene.dispose();
      this.engine.dispose();
    }, { once: true });
    this.engine.runRenderLoop(() => { if (this.ready) this.scene.render(); });
  }

  async initialize(): Promise<void> {
    const ids = Object.keys(SIMREADY_ASSETS).filter(isSimReadyAssetId);
    await this.assets.prepare(ids, (message) => { this.info.textContent = message; });
    this.select("snackVendingMachine");
    this.ready = true;
  }

  select(value: string): void {
    if (value !== "all" && !isSimReadyAssetId(value)) throw new Error(`Unknown SimReady selection: ${value}`);
    this.root?.dispose();
    this.normals?.dispose();
    this.normals = undefined;
    this.root = new TransformNode("SimReady inspection instances", this.scene);
    this.scale.value = "1";
    const ids = value === "all" ? Object.keys(SIMREADY_ASSETS).filter(isSimReadyAssetId) : [value];
    for (const [index, id] of ids.entries()) {
      const node = this.assets.create(id, this.root, `Viewer / ${id}`, 2);
      if (node && value === "all") node.position.set((index % 3 - 1) * 3.3, 0, (Math.floor(index / 3) - 1) * 3.3);
    }
    this.camera.setTarget(new Vector3(0, .9, 0));
    this.camera.radius = value === "all" ? 14 : 4.5;
    this.info.textContent = ids.map((id) => {
      const report = this.assets.reports.get(id);
      return report ? `${id}\n${report.source}\n${report.license}\n${report.sourceUrl}\n`
        + `${(report.bytes / 1e6).toFixed(2)} MB / ${report.triangles.toLocaleString()} triangles\n`
        + `${report.meshes} meshes / ${report.materials} materials / ${report.textures} textures\n`
        + `Source dimensions: ${report.dimensions.map((value) => value.toFixed(3)).join(" × ")} m\n`
        + `Warnings: ${report.warnings.join("\n") || "none"}\n${this.assets.errors.get(id) ?? ""}`
        : this.assets.errors.get(id) ?? `No report for ${id}`;
    }).join("\n\n");
    this.applyInspection();
  }

  private applyInspection(): void {
    this.normals?.dispose();
    this.normals = undefined;
    if (!this.root) return;
    const lines: Vector3[][] = [];
    const meshes = this.root.getChildMeshes();
    for (const mesh of meshes) {
      if (mesh.material) mesh.material.wireframe = this.wireframe.checked;
      mesh.showBoundingBox = this.bounds.checked;
      if (!this.showNormals.checked) continue;
      const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
      const normals = mesh.getVerticesData(VertexBuffer.NormalKind);
      if (!positions || !normals) continue;
      const world = mesh.computeWorldMatrix(true);
      const step = Math.max(1, Math.ceil(positions.length / 3 / Math.max(1, 800 / meshes.length)));
      for (let index = 0; index < positions.length; index += step * 3) {
        const point = Vector3.TransformCoordinates(Vector3.FromArray(positions, index), world);
        const direction = Vector3.TransformNormal(Vector3.FromArray(normals, index), world).normalize().scale(.07);
        lines.push([point, point.add(direction)]);
      }
    }
    if (lines.length) {
      this.normals = MeshBuilder.CreateLineSystem("Inspection vertex normals", { lines }, this.scene);
      this.normals.color = Color3.FromHexString("#9bffe3");
    }
  }
}
