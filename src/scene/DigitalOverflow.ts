import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import { routeAnchor } from "../camera/CameraPath";
import { cellPosition } from "../content/title";
import { BUFFER_OVERFLOW } from "../content/showBeats";
import { clamp } from "../engine/Timeline";
import { BufferWater, bufferFillState } from "../effects/BufferWater";
import { BoxBatch } from "./Instances";
import { createWorldText } from "./WorldText";
import { emissive } from "./Labyrinth";

export { BUFFER_OVERFLOW } from "../content/showBeats";

export function bufferAnchor(): { position: Vector3; yaw: number } {
  const anchor = routeAnchor(BUFFER_OVERFLOW.anchor);
  anchor.position.x = cellPosition(3, 1).x - 2.5;
  anchor.position.y = 0;
  return { position: anchor.position, yaw: BUFFER_OVERFLOW.yaw };
}

export function bufferCubePosition(time: number, index: number): Vector3 {
  if (!Number.isFinite(time) || !Number.isInteger(index) || index < 0 || index > BUFFER_OVERFLOW.count) {
    throw new RangeError("Invalid buffer cube time or index.");
  }
  if (index === BUFFER_OVERFLOW.count) {
    return new Vector3(BUFFER_OVERFLOW.tankX, bufferFillState(time).extraY, 0);
  }
  const release = BUFFER_OVERFLOW.start + index * BUFFER_OVERFLOW.fillInterval;
  const fall = clamp((time - release) / BUFFER_OVERFLOW.fallDuration);
  const home = new Vector3(BUFFER_OVERFLOW.tankX + (index % 4 - 1.5) * 1.04,
    1.72 + Math.floor(index / 8) * 1.04, (Math.floor(index / 4) % 2 - .5) * 1.08);
  home.y += (10 - home.y) * (1 - fall * fall);
  return home;
}

export class DigitalOverflow {
  readonly root: TransformNode;
  readonly water: BufferWater;
  private readonly label: Mesh;
  private readonly bytes: Mesh[] = [];

  constructor(scene: Scene) {
    const anchor = bufferAnchor();
    this.root = new TransformNode("Digital / overflowing ring buffer", scene);
    this.root.position.copyFrom(anchor.position);
    this.root.rotation.y = anchor.yaw;
    const steel = new PBRMaterial("Digital / buffer chassis", scene);
    steel.albedoColor = Color3.FromHexString("#284452");
    steel.emissiveColor = Color3.FromHexString("#182d36");
    steel.metallic = .55;
    steel.roughness = .45;
    const chassis = new BoxBatch("Digital / buffer capacity rack", steel);
    chassis.add(BUFFER_OVERFLOW.tankX, .6, 0, 5.8, 1.2, 5.2);
    for (const x of [-2.9, 2.9]) {
      for (const z of [-2.6, 2.6]) chassis.add(BUFFER_OVERFLOW.tankX + x, 3.6, z, .15, 5, .15);
      chassis.add(BUFFER_OVERFLOW.tankX + x, BUFFER_OVERFLOW.tankRim, 0, .18, .18, 5.2);
    }
    for (const z of [-2.6, 2.6]) chassis.add(BUFFER_OVERFLOW.tankX, BUFFER_OVERFLOW.tankRim, z, 5.8, .18, .18);
    const rack = chassis.build(scene);
    rack.unfreezeWorldMatrix();
    rack.parent = this.root;
    const glass = new PBRMaterial("Digital / buffer transparent capacity tank", scene);
    glass.albedoColor = Color3.FromHexString("#a9f8ed");
    glass.alpha = .1;
    glass.metallic = .05;
    glass.roughness = .2;
    for (const side of [-1, 1]) {
      const pane = MeshBuilder.CreateBox(`Digital / buffer glass side ${side}`, { width: .06, height: 4.8, depth: 5.1 }, scene);
      pane.parent = this.root;
      pane.position.set(BUFFER_OVERFLOW.tankX + side * 2.8, 3.6, 0);
      pane.material = glass;
    }
    const front = MeshBuilder.CreateBox("Digital / buffer glass front", { width: 5.6, height: 4.8, depth: .06 }, scene);
    front.parent = this.root;
    front.position.set(BUFFER_OVERFLOW.tankX, 3.6, -2.5);
    front.material = glass;
    this.label = createWorldText(scene, {
      name: "Digital / BUFFER OVERFLOW", width: BUFFER_OVERFLOW.width, height: 4.4,
      background: "#0c1f2b", border: "#ffc383",
      lines: [{ text: "BUFFER OVERFLOW", color: "#ffc383" }, { text: "console.log('just one more...')", color: "#baf5e6" }],
    });
    this.label.parent = this.root;
    this.label.position.set(1.5, BUFFER_OVERFLOW.height, -.1);
    const colors = ["#8de5df", "#ffc383"].map((color, index) =>
      emissive(scene, `Digital / byte ${index ? "overflow" : "memory"}`, color, 1.05));
    for (let index = 0; index <= BUFFER_OVERFLOW.count; index++) {
      const mesh = MeshBuilder.CreateBox(`Digital / overflowing byte ${index}`, { size: .9 }, scene);
      mesh.material = colors[index === BUFFER_OVERFLOW.count ? 1 : 0];
      mesh.parent = this.root;
      mesh.isPickable = false;
      this.bytes.push(mesh);
    }
    this.water = new BufferWater(scene, this.root);
    this.update(0);
  }

  update(time: number): void {
    const active = time >= 95 && time < BUFFER_OVERFLOW.end + 2;
    this.root.setEnabled(active);
    const state = bufferFillState(time);
    this.label.visibility = state.label;
    if (!active) return;
    for (const [index, byte] of this.bytes.entries()) {
      const release = index === BUFFER_OVERFLOW.count
        ? BUFFER_OVERFLOW.spill - BUFFER_OVERFLOW.extraFallDuration
        : BUFFER_OVERFLOW.start + index * BUFFER_OVERFLOW.fillInterval;
      byte.setEnabled(time >= release && time < BUFFER_OVERFLOW.end);
      byte.position.copyFrom(bufferCubePosition(time, index));
    }
    this.water.update(time);
  }
}
