import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import type { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import { SKYNET_WARNING } from "../content/showBeats";
import { createWorldText } from "./WorldText";
import { createEventDecal, loadEventArtwork } from "./EventBranding";
import logoUrl from "../assets/skynet/skynet-logo.png";

export const SKYNET_WARNING_TEXT = "Warning, it's operational!";
export const SKYNET_TRIANGLE_UV_START = .37;

export function skynetTriangleIntensity(time: number): number {
  if (!Number.isFinite(time)) throw new RangeError("Skynet triangle requires finite show time.");
  return (1 + Math.cos((time - SKYNET_WARNING.readStart) * 2 * Math.PI / SKYNET_WARNING.blinkPeriod)) / 2;
}

export function skynetWarningActive(time: number, enabled = true): boolean {
  if (!Number.isFinite(time)) throw new RangeError("Skynet warning requires finite show time.");
  return enabled && time >= SKYNET_WARNING.start && time < SKYNET_WARNING.end;
}

export class SkynetWarning {
  readonly root: TransformNode;
  readonly mesh;
  readonly ready: Promise<void>;
  triangleIntensity = 1;
  private triangleMaterial?: StandardMaterial;
  private triangleTexture?: Texture;

  constructor(scene: Scene) {
    this.root = new TransformNode("Digital / Skynet early warning", scene);
    this.root.position.set(SKYNET_WARNING.x, SKYNET_WARNING.y, SKYNET_WARNING.z);
    this.root.rotation.y = SKYNET_WARNING.yaw;
    const frame = MeshBuilder.CreateBox("Digital / Skynet warning housing", {
      width: SKYNET_WARNING.width + .5, height: SKYNET_WARNING.height + .5, depth: .3,
    }, scene);
    frame.parent = this.root;
    frame.position.z = .2;
    frame.isPickable = false;
    const metal = new StandardMaterial("Digital / Skynet matte housing", scene);
    metal.disableLighting = true;
    metal.emissiveColor.set(.035, .018, .023);
    metal.specularColor.set(0, 0, 0);
    frame.material = metal;
    this.mesh = createWorldText(scene, {
      name: "Digital / Skynet warning message", width: SKYNET_WARNING.width, height: SKYNET_WARNING.height,
      background: "#000000", border: "#ed3349",
      lines: [{ text: "" }, { text: SKYNET_WARNING_TEXT, color: "#ffd1d6", size: 148 }],
    });
    this.mesh.parent = this.root;
    if (!(this.mesh.material instanceof StandardMaterial)) throw new Error("Skynet warning requires the shared text material.");
    this.mesh.material.transparencyMode = StandardMaterial.MATERIAL_OPAQUE;
    this.ready = loadEventArtwork(scene, logoUrl, "Skynet / original local Terminator logo").then((texture) => {
      const { width, height } = texture.getSize();
      const logoHeight = SKYNET_WARNING.logoWidth * height / width;
      const part = (name: string, lowerV: number, upperV: number) => {
        const mesh = createEventDecal(scene, name, texture, SKYNET_WARNING.logoWidth, 1);
        mesh.parent = this.root;
        mesh.position.set(0, SKYNET_WARNING.logoY + logoHeight * (lowerV + upperV - 1) / 2, -.035);
        mesh.scaling.y = height / width * (upperV - lowerV);
        const uv = mesh.getVerticesData(VertexBuffer.UVKind);
        if (!uv) throw new Error("Skynet logo requires plane texture coordinates.");
        mesh.setVerticesData(VertexBuffer.UVKind, uv.map((value, index) =>
          index % 2 ? lowerV + value * (upperV - lowerV) : value));
        if (!(mesh.material instanceof StandardMaterial)) throw new Error("Skynet logo requires the shared decal material.");
        mesh.material.emissiveColor.set(.9, .9, .9);
        mesh.material.transparencyMode = StandardMaterial.MATERIAL_OPAQUE;
        return mesh.material;
      };
      part("Digital / Skynet logo", 0, SKYNET_TRIANGLE_UV_START);
      this.triangleMaterial = part("Digital / Skynet warning triangle", SKYNET_TRIANGLE_UV_START, 1);
      // StandardMaterial adds its emissive texture; pulse a separate texture level too.
      this.triangleTexture = texture.clone();
      this.triangleMaterial.emissiveTexture = this.triangleTexture;
      this.triangleTexture.level = this.triangleIntensity;
      this.triangleMaterial.emissiveColor.setAll(.9 * this.triangleIntensity);
    });
    this.update(0);
  }

  update(time: number, enabled = true): void {
    this.root.setEnabled(skynetWarningActive(time, enabled));
    this.triangleIntensity = skynetTriangleIntensity(time);
    this.triangleMaterial?.emissiveColor.setAll(.9 * this.triangleIntensity);
    if (this.triangleTexture) this.triangleTexture.level = this.triangleIntensity;
  }
}
