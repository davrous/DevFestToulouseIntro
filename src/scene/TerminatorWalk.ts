import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { Scene } from "@babylonjs/core/scene";
import { TERMINATOR, terminatorPosition } from "../content/showBeats";
import { clamp } from "../engine/Timeline";
import type { CinemaAssets } from "./CinemaAssets";

export function terminatorWalkState(time: number, from: number, to: number, fps: number):
  { distance: number; frame: number; visible: boolean } {
  if (![time, from, to, fps].every(Number.isFinite) || to <= from || fps <= 0) {
    throw new RangeError("Terminator walk needs finite time and a non-empty animation clip.");
  }
  const elapsed = clamp(time - TERMINATOR.walkStart, 0, TERMINATOR.walkEnd - TERMINATOR.walkStart);
  return { distance: elapsed / (TERMINATOR.walkEnd - TERMINATOR.walkStart) * TERMINATOR.distance,
    frame: from + elapsed * fps % (to - from), visible: time >= TERMINATOR.start && time < TERMINATOR.end };
}

export class TerminatorWalk {
  readonly root: TransformNode;
  private animation?: AnimationGroup;

  constructor(scene: Scene) {
    this.root = new TransformNode("Cinema / Terminator walking into D entrance", scene);
    this.root.rotation.y = Math.PI / 2;
    this.root.setEnabled(false);
  }

  prepare(assets: CinemaAssets): void {
    const model = assets.takeAnimated("terminator", this.root, "Cinema / animated T-800", TERMINATOR.height);
    if (!model?.animation || model.animation.name !== TERMINATOR.clip) {
      throw new Error(`The local Terminator model must contain its "${TERMINATOR.clip}" skeletal animation.`);
    }
    this.animation = model.animation;
    this.update(0);
  }

  update(time: number): void {
    if (!this.animation) return;
    const fps = this.animation.targetedAnimations[0]?.animation.framePerSecond;
    if (!fps) throw new Error("The Terminator walk clip has no animation frame rate.");
    const state = terminatorWalkState(time, this.animation.from, this.animation.to, fps);
    this.root.setEnabled(state.visible);
    const position = terminatorPosition(time);
    this.root.position.set(position.x, position.y, position.z);
    this.animation.goToFrame(state.frame);
  }
}
