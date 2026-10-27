import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { cellPosition } from "../content/title";
import { smoothstep } from "../engine/Timeline";
import flagUrl from "../assets/event/mascot-flag-green.png";
import anniversaryUrl from "../assets/event/anniversary-cube-orange.png";

export function loadEventArtwork(scene: Scene, url: string, name: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const texture = new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => resolve(texture),
      (message, exception) => reject(new Error(`Unable to load local event artwork "${name}": ${message ?? "image decoding failed"}`, { cause: exception })),
    );
    texture.name = name;
    texture.hasAlpha = true;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  });
}

export function createEventDecal(scene: Scene, name: string, texture: Texture, size: number, opacity: number): Mesh {
  const material = new StandardMaterial(`${name} / printed light`, scene);
  material.disableLighting = true;
  material.diffuseColor = Color3.Black();
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.emissiveColor = new Color3(1.25, 1.25, 1.25);
  material.useAlphaFromDiffuseTexture = true;
  material.alpha = opacity;
  const mesh = MeshBuilder.CreatePlane(name, { size }, scene);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.metadata = { eventArtwork: texture.name };
  return mesh;
}

export class EventBranding {
  readonly ready: Promise<void>;
  private readonly finalMarks: Mesh[] = [];

  constructor(scene: Scene) {
    this.ready = Promise.all([
      loadEventArtwork(scene, flagUrl, "Event mascot / green flag"),
      loadEventArtwork(scene, anniversaryUrl, "Event anniversary / orange cube"),
    ]).then(([flag, anniversary]) => {
      const bank = cellPosition(.85, 3.5);
      const backplate = MeshBuilder.CreatePlane("Event mascot / server service plate", { width: 5.2, height: 7 }, scene);
      const plateMaterial = new StandardMaterial("Service plate / dark enamel", scene);
      plateMaterial.disableLighting = true;
      plateMaterial.emissiveColor = new Color3(.035, .065, .075);
      backplate.material = plateMaterial;
      backplate.position.set(bank.x, 12, bank.z - 4.06);
      backplate.isPickable = false;
      const serviceMark = createEventDecal(scene, "Event mascot / server insignia", flag, 5, .85);
      serviceMark.position.set(bank.x, 12, bank.z - 4.1);

      for (const [name, texture, x] of [
        ["Event mascot / final signature", flag, -180],
        ["Event anniversary / final signature", anniversary, 180],
      ] as const) {
        const mark = createEventDecal(scene, name, texture, 130, .58);
        mark.position.set(x, 1.2, -286);
        mark.rotation.x = Math.PI / 2;
        mark.visibility = 0;
        this.finalMarks.push(mark);
      }
    });
  }

  update(time: number): void {
    const visibility = smoothstep((time - 170) / 3);
    this.finalMarks.forEach((mesh) => { mesh.visibility = visibility; });
  }
}
