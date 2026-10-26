import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Animation } from "@babylonjs/core/Animations/animation";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { CinemaAssets } from "./CinemaAssets";
import { TerminatorWalk, terminatorWalkState } from "./TerminatorWalk";
import { TERMINATOR, terminatorPosition } from "../content/showBeats";
import { CELL, HEIGHT, ROOF_THICKNESS, cellPosition } from "../content/title";

describe("local animated Terminator at the D entrance", () => {
  it("keeps the enlarged animated envelope on a straight, wall-safe lane", () => {
    const cell = cellPosition(TERMINATOR.column, TERMINATOR.row);
    for (let time = 59; time <= TERMINATOR.end; time += .1) {
      const pose = terminatorPosition(time);
      // Conservative envelope from the supplied clip, including swinging arms and feet.
      expect(pose.x - 9).toBeGreaterThan(cell.x - CELL / 2 + .75);
      expect(pose.x + 9).toBeLessThan(cell.x + CELL / 2 - .75);
      expect(pose.z - 7).toBeGreaterThan(cell.z - CELL / 2 + .75);
      expect(pose.z + 7).toBeLessThan(cell.z + CELL / 2 - .75);
      expect(pose.y + TERMINATOR.height / 2).toBeLessThan(HEIGHT - ROOF_THICKNESS / 2);
    }
  });

  it("samples the supplied walk clip, advances toward the entrance and exactly restores its pose on seek", () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const assets = new CinemaAssets(scene), actor = new TerminatorWalk(scene);
    const hip = new TransformNode("test animated hip", scene);
    hip.parent = actor.root;
    const animation = new Animation("walk", "rotation.x", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animation.setKeys([{ frame: 0, value: 0 }, { frame: 30, value: .6 }, { frame: 60, value: 0 }]);
    const group = new AnimationGroup(TERMINATOR.clip, scene);
    group.addTargetedAnimation(animation, hip); group.start(true); group.pause();
    const take = vi.spyOn(assets, "takeAnimated").mockReturnValue({ node: hip, animation: group });
    actor.prepare(assets);
    expect(TERMINATOR.height).toBeCloseTo(7.2 * 3, 8);
    expect(take).toHaveBeenCalledWith("terminator", actor.root, "Cinema / animated T-800", TERMINATOR.height);
    actor.update(TERMINATOR.walkStart);
    const initial = actor.root.position.clone();
    expect(initial.y - TERMINATOR.height / 2).toBeCloseTo(TERMINATOR.groundOffset, 8);
    actor.update(63.25);
    expect(actor.root.position.x).toBeGreaterThan(initial.x);
    expect(actor.root.position.z).toBe(initial.z);
    expect(actor.root.rotation.y).toBe(Math.PI / 2);
    expect(hip.rotation.x).toBeGreaterThan(0);
    expect(group.isPlaying).toBe(false);
    const snapshot = [...actor.root.position.asArray(), hip.rotation.x];
    actor.update(180); actor.update(0); actor.update(63.25);
    expect([...actor.root.position.asArray(), hip.rotation.x]).toEqual(snapshot);
    expect(actor.root.isEnabled()).toBe(true);
    actor.update(TERMINATOR.end);
    expect(actor.root.isEnabled()).toBe(false);
    scene.dispose(); engine.dispose();
  });

  it("does not replace a missing walk animation with a static success-shaped fallback", () => {
    expect(() => terminatorWalkState(63, 0, 0, 60)).toThrow();
    const engine = new NullEngine(), scene = new Scene(engine);
    expect(() => new TerminatorWalk(scene).prepare(new CinemaAssets(scene))).toThrow(/The Chase/);
    scene.dispose(); engine.dispose();
  });
});
