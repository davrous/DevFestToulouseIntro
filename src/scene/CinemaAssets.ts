import "@babylonjs/loaders/glTF";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

const ROOT = "/assets/cinema/";
// The source clip reopens after frame 70; use only its closing stroke.
export const CLAPPER_CLOSE = { from: 50, to: 60 } as const;

const FILENAMES = {
  seat: "cinema_seat.glb",
  clapper: "black_film_slate_or_clapperboard.glb",
  spotlight: "spotlight.glb",
  reel: "film_reel.glb",
  camera: "cinema_camera.glb",
  television: "retro_crt_tv.glb",
  popcorn: "popcorn_bucket.glb",
  astronaut: "low_poly_astronaut.glb",
  satellite: "low_poly_satellite.glb",
  vhs: "vhs_tape.glb",
  chair: "directors_chair.glb",
} as const;

export type CinemaAsset = keyof typeof FILENAMES;

interface Template {
  root: AbstractMesh;
  animation?: AnimationGroup;
  span: number;
  center: Vector3;
  size: Vector3;
}

export class CinemaAssets {
  private readonly templates = new Map<CinemaAsset, Template>();

  constructor(private readonly scene: Scene) {}

  async prepare(): Promise<void> {
    await Promise.all((Object.entries(FILENAMES) as [CinemaAsset, string][]).map(async ([key, file]) => {
      try {
        const loaded = await SceneLoader.ImportMeshAsync("", ROOT, file, this.scene);
        const root = loaded.meshes[0];
        if (!root) throw new Error(`Model ${file} has no root mesh.`);
        // Presentation ground/socles are not part of the props' physical scale.
        const presentationNode = key === "camera" ? "ground_0" : key === "chair" ? "Cylinder.003" : undefined;
        if (presentationNode) {
          const decoration = root.getDescendants().find((node) => node.name === presentationNode);
          if (!decoration) throw new Error(`Model ${file} is missing its known presentation node ${presentationNode}.`);
          decoration.dispose();
        }
        if (key === "clapper" && loaded.animationGroups[0]) {
          loaded.animationGroups[0].start(false);
          loaded.animationGroups[0].pause();
          loaded.animationGroups[0].goToFrame(CLAPPER_CLOSE.from);
        }
        const { min, max } = root.getHierarchyBoundingVectors(true);
        const size = max.subtract(min);
        const span = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(span) || span <= 0) throw new Error(`Model ${file} has invalid bounds.`);
        root.name = `Cinema asset / template ${key}`;
        root.setEnabled(false);
        this.templates.set(key, { root, animation: loaded.animationGroups[0], span, size, center: max.add(min).scale(.5) });
      } catch (error) {
        console.error(`Local cinema model could not load: ${ROOT}${file}`, error);
      }
    }));
  }

  create(name: CinemaAsset, parent: TransformNode, label: string, size: number,
    dimension: "span" | "height" = "span"): TransformNode | undefined {
    const template = this.templates.get(name);
    if (!template) return undefined;
    const pivot = new TransformNode(label, this.scene);
    pivot.parent = parent;
    const model = template.root.instantiateHierarchy(pivot, { doNotInstantiate: name === "camera" });
    if (!model) {
      console.error(`Local cinema model could not be cloned: ${name}`);
      pivot.dispose();
      return undefined;
    }
    const factor = size / (dimension === "height" ? template.size.y : template.span);
    model.scaling.scaleInPlace(factor);
    model.position.subtractInPlace(template.center.scale(factor));
    model.setEnabled(true);
    return pivot;
  }

  takeClapper(parent: TransformNode, size: number): { node: TransformNode; animation?: AnimationGroup } | undefined {
    const template = this.templates.get("clapper");
    if (!template) return undefined;
    const pivot = new TransformNode("Cinema / animated clapperboard", this.scene);
    pivot.parent = parent;
    template.root.parent = pivot;
    template.root.scaling.scaleInPlace(size / template.span);
    template.root.position.subtractInPlace(template.center.scale(size / template.span));
    template.root.setEnabled(true);
    if (template.animation) {
      template.animation.start(false);
      template.animation.pause();
    }
    return { node: pivot, animation: template.animation };
  }
}
