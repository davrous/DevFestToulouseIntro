import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CASSOULET_INSTALL, CASSOULET_SIGN } from "../content/showBeats";
import { clamp } from "../engine/Timeline";

const COMMAND = "$ npm install cassoulet";

export function npmInstallState(time: number): {
  command: string; progress: number; downloadedGB: number; complete: boolean; cursor: boolean;
} {
  if (!Number.isFinite(time)) throw new RangeError("Terminal time must be finite.");
  const typed = clamp((time - CASSOULET_INSTALL.start) / (CASSOULET_INSTALL.typingEnd - CASSOULET_INSTALL.start));
  const complete = time >= CASSOULET_INSTALL.complete;
  const progress = clamp((time - CASSOULET_INSTALL.typingEnd) / (CASSOULET_INSTALL.complete - CASSOULET_INSTALL.typingEnd));
  return {
    command: COMMAND.slice(0, Math.floor(COMMAND.length * typed)),
    progress, complete, cursor: Math.floor(time * 2) % 2 === 0,
    downloadedGB: complete ? CASSOULET_INSTALL.gigabytes
      : Math.min(4.79, Math.floor(CASSOULET_INSTALL.gigabytes * progress * 100) / 100),
  };
}

export class NpmCassouletTerminal {
  readonly mesh;
  readonly state = npmInstallState(0);
  private readonly texture: DynamicTexture;
  private lastFrame = "";

  constructor(scene: Scene, parent: TransformNode) {
    this.texture = new DynamicTexture("Cassoulet / simulated npm terminal", { width: 1024, height: 512 }, scene, false);
    const material = new StandardMaterial("Cassoulet / terminal phosphor", scene);
    material.disableLighting = true;
    material.diffuseTexture = this.texture;
    material.emissiveTexture = this.texture;
    material.diffuseColor = Color3.Black();
    material.emissiveColor.set(.9, 1, .92);
    material.specularColor = Color3.Black();
    material.backFaceCulling = false;
    this.mesh = MeshBuilder.CreatePlane("npm install cassoulet",
      { width: CASSOULET_SIGN.width, height: 7 }, scene);
    this.mesh.parent = parent;
    this.mesh.position.set(CASSOULET_SIGN.lateral, CASSOULET_SIGN.height, 0);
    this.mesh.material = material;
    this.mesh.isPickable = false;
    this.update(0);
  }

  update(time: number): void {
    const frame = `${Math.floor(time * 10)}:${time >= CASSOULET_INSTALL.complete}`;
    if (frame === this.lastFrame) return;
    this.lastFrame = frame;
    Object.assign(this.state, npmInstallState(time >= CASSOULET_INSTALL.complete ? time : Math.floor(time * 10) / 10));
    const state = this.state;
    const ctx = this.texture.getContext();
    ctx.fillStyle = "#07151c";
    ctx.fillRect(0, 0, 1024, 512);
    ctx.fillStyle = "#15313b";
    ctx.fillRect(0, 0, 1024, 46);
    ctx.font = "20px Consolas, monospace";
    ctx.fillStyle = "#95b7b9";
    ctx.fillText("TERMINAL  /  localhost:31000  /  ~/devfest", 28, 31);
    ctx.font = "36px Consolas, monospace";
    ctx.fillStyle = "#a8ffd4";
    ctx.fillText(state.command + (!state.complete && state.cursor ? "_" : ""), 30, 105);
    ctx.font = "32px Consolas, monospace";
    ctx.fillStyle = "#9bbec7";
    ctx.fillText(state.progress > 0 ? "Resolving packages... done" : "toulouse@ai4fun:~/demo", 30, 165);
    if (state.progress > 0) {
      const filled = Math.floor(state.progress * 24);
      const bar = `[${"#".repeat(filled)}${"-".repeat(24 - filled)}]`;
      ctx.fillStyle = "#ffcf8d";
      ctx.fillText(`${bar} ${Math.floor(state.progress * 100)}%`, 30, 225);
      ctx.fillStyle = "#b9e4dc";
      ctx.fillText(`${state.downloadedGB.toFixed(2)} GB / 4.80 GB  receiving...`, 30, 285);
    }
    if (state.complete) {
      ctx.fillStyle = "#a8ffd4";
      ctx.fillText("added 4.8 GB  /  installation complete", 30, 355);
      ctx.fillText("Delivering packages...", 30, 407);
      ctx.fillText(`$ ${state.cursor ? "_" : ""}`, 30, 466);
    } else if (state.progress > 0) {
      ctx.fillStyle = "#8aaca9";
      ctx.fillText("cache: LOCALHOST  /  compression: none", 30, 355);
      ctx.fillText(`time remaining: ${Math.max(0, CASSOULET_INSTALL.complete - time).toFixed(1)}s`, 30, 407);
    }
    this.texture.update();
  }
}
