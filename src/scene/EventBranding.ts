import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { SpeakerPortal } from "./SpeakerPortal";
import { cellPosition } from "../content/title";
import { smoothstep } from "../engine/Timeline";
import { speakerReveal } from "../effects/ShowLighting";
import flagUrl from "../assets/event/mascot-flag-green.png";
import planetUrl from "../assets/event/mascot-planet-violet.png";
import anniversaryUrl from "../assets/event/anniversary-cube-orange.png";

function loadArtwork(scene: Scene, url: string, name: string): Promise<Texture> {
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

function decal(scene: Scene, name: string, texture: Texture, size: number, opacity: number): Mesh {
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
  private readonly crest: Mesh[] = [];

  constructor(scene: Scene, private readonly davidPortal: SpeakerPortal) {
    this.ready = Promise.all([
      loadArtwork(scene, flagUrl, "Event mascot / green flag"),
      loadArtwork(scene, planetUrl, "Event mascot / violet planet"),
      loadArtwork(scene, anniversaryUrl, "Event anniversary / orange cube"),
    ]).then(([flag, planet, anniversary]) => {
      const bank = cellPosition(.85, 3.5);
      const backplate = MeshBuilder.CreatePlane("Event mascot / server service plate", { width: 5.2, height: 7 }, scene);
      const plateMaterial = new StandardMaterial("Service plate / dark enamel", scene);
      plateMaterial.disableLighting = true;
      plateMaterial.emissiveColor = new Color3(.035, .065, .075);
      backplate.material = plateMaterial;
      backplate.position.set(bank.x, 12, bank.z - 4.06);
      backplate.isPickable = false;
      const serviceMark = decal(scene, "Event mascot / server insignia", flag, 5, .85);
      serviceMark.position.set(bank.x, 12, bank.z - 4.1);

      const crestPlate = MeshBuilder.CreatePlane("Event mascot / David crest plate", { width: 5.8, height: 5.4 }, scene);
      crestPlate.material = plateMaterial;
      crestPlate.parent = davidPortal.root;
      crestPlate.position.set(0, 26.95, -.56);
      crestPlate.isPickable = false;
      const planetMark = decal(scene, "Event mascot / David portal crest", planet, 5.2, .85);
      planetMark.parent = davidPortal.root;
      planetMark.position.set(0, 26.95, -.6);
      this.crest.push(crestPlate, planetMark);

      for (const [name, texture, x] of [
        ["Event mascot / final signature", flag, -180],
        ["Event anniversary / final signature", anniversary, 180],
      ] as const) {
        const mark = decal(scene, name, texture, 130, .58);
        mark.position.set(x, 1.2, -286);
        mark.rotation.x = Math.PI / 2;
        mark.visibility = 0;
        this.finalMarks.push(mark);
      }
    });
  }

  update(time: number): void {
    for (const mesh of this.crest) mesh.visibility = speakerReveal(time, this.davidPortal.config);
    const visibility = smoothstep((time - 170) / 3);
    this.finalMarks.forEach((mesh) => { mesh.visibility = visibility; });
  }
}
