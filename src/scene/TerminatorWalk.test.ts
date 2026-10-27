import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Animation } from "@babylonjs/core/Animations/animation";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { CinemaAssets } from "./CinemaAssets";
import { TerminatorWalk, terminatorWalkState } from "./TerminatorWalk";
import { TERMINATOR, terminatorPosition } from "../content/showBeats";
import { CELL, HEIGHT, ROOF_THICKNESS, cellPosition } from "../content/title";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { readFileSync } from "node:fs";
import HavokPhysics from "@babylonjs/havok";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import "@babylonjs/core/Physics/joinedPhysicsEngineComponent";
import { CassouletPile } from "../simready/CassouletPile";
import { CASSOULET_PILE } from "../content/showBeats";

describe("local animated Terminator at the D entrance", () => {
  it("keeps the enlarged animated envelope on a straight, wall-safe lane", () => {
    const cell = cellPosition(TERMINATOR.column, TERMINATOR.row);
    for (let time = TERMINATOR.start; time <= TERMINATOR.end; time += .1) {
      const pose = terminatorPosition(time);
      // Conservative envelope from the supplied clip, including swinging arms and feet.
      expect(pose.x - 9).toBeGreaterThan(cell.x - CELL / 2 + .75);
      expect(pose.x + 9).toBeLessThan(cell.x + CELL / 2 - .75);
      expect(pose.z - 7).toBeGreaterThan(cellPosition(4, 5).z - CELL / 2 + .75);
      expect(pose.z + 7).toBeLessThan(cellPosition(4, 1).z + CELL / 2 - .75);
      expect(pose.y + TERMINATOR.height / 2).toBeLessThan(HEIGHT - ROOF_THICKNESS / 2);
    }
  });

  it("walks after the terminal, then uses measured can contacts and recorded collapse/fragments on replay", async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const wasmBinary = Uint8Array.from(readFileSync(
      new URL("../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm", import.meta.url))).buffer;
    const plugin = new HavokPlugin(true, await HavokPhysics({ wasmBinary }));
    scene.enablePhysics(new Vector3(0, -17, 0), plugin);
    plugin.setVelocityLimits(32, 12);
    const stage = new TransformNode("Cassoulet rescue stage", scene);
    stage.position.set(-448, .02, 126); stage.rotation.y = Math.PI;
    const cans = Array.from({ length: CASSOULET_PILE.count }, (_, index) => {
      const node = new TransformNode(`can ${index}`, scene); node.parent = stage; return node;
    });
    const pile = new CassouletPile(scene, stage, cans);
    pile.initialize();
    const assets = new CinemaAssets(scene), actor = new TerminatorWalk(scene);
    const hip = new TransformNode("test animated hip", scene);
    hip.parent = actor.root;
    const body = MeshBuilder.CreateBox("test chrome body", {}, scene);
    body.parent = hip;
    const material = new PBRMaterial("test original chrome", scene);
    body.material = material;
    const can = MeshBuilder.CreateBox("unrelated can", {}, scene);
    const animation = new Animation("walk", "rotation.x", 60, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
    animation.setKeys([{ frame: 0, value: 0 }, { frame: 30, value: .6 }, { frame: 60, value: 0 }]);
    const group = new AnimationGroup(TERMINATOR.clip, scene);
    group.addTargetedAnimation(animation, hip); group.start(true); group.pause();
    const take = vi.spyOn(assets, "takeAnimated").mockReturnValue({ node: hip, animation: group });
    actor.prepare(assets);
    expect(material.maxSimultaneousLights).toBe(6);
    expect(actor.lights.every((light) => light.parent === actor.root
      && light.includedOnlyMeshes.length === 1 && light.includedOnlyMeshes[0] === body
      && !light.canAffectMesh(can) && light.intensity === 0)).toBe(true);
    expect(TERMINATOR.height).toBeCloseTo(7.2 * 3, 8);
    expect(take).toHaveBeenCalledWith("terminator", actor.root, "Cinema / animated T-800", TERMINATOR.height);
    actor.update(TERMINATOR.walkStart, pile);
    const initial = actor.root.position.clone();
    expect(initial.y - TERMINATOR.height / 2).toBeCloseTo(TERMINATOR.groundOffset, 8);
    actor.update(121.25, pile);
    expect(actor.root.position.z).toBeGreaterThan(initial.z);
    expect(actor.root.position.x).toBe(initial.x);
    expect(hip.rotation.x).toBeGreaterThan(0);
    expect(group.isPlaying).toBe(false);
    expect(actor.lights.every((light) => light.isEnabled() && light.intensity > 0)).toBe(true);
    const snapshot = [...actor.root.position.asArray(), hip.rotation.x];
    actor.update(180, pile); actor.update(0, pile); actor.update(121.25, pile);
    expect([...actor.root.position.asArray(), hip.rotation.x]).toEqual(snapshot);
    expect(actor.root.isEnabled()).toBe(true);
    actor.update(pile.rescue!.destroyTime + .3, pile);
    expect(actor.root.isEnabled()).toBe(false);
    expect(actor.lights.every((light) => !light.isEnabled() && light.intensity === 0)).toBe(true);
    expect(actor.debris.isEnabled()).toBe(true);
    expect(actor.debris.thinInstanceCount).toBe(TERMINATOR.fragments);
    actor.update(121.25, pile);
    expect(actor.root.isEnabled()).toBe(true);
    expect(actor.debris.isEnabled()).toBe(false);
    actor.update(121.25, pile, false);
    expect(actor.lights.every((light) => !light.isEnabled() && light.intensity === 0)).toBe(true);
    actor.update(TERMINATOR.end, pile);
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
