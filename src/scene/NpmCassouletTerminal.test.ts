import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CASSOULET_INSTALL, CASSOULET_PILE } from "../content/showBeats";
import { NpmCassouletTerminal, npmInstallState } from "./NpmCassouletTerminal";

const canvas = vi.hoisted(() => ({ uploads: vi.fn(), text: vi.fn() }));
vi.mock("@babylonjs/core/Materials/Textures/dynamicTexture", () => ({
  DynamicTexture: class {
    getContext() { return { fillStyle: "", font: "", fillRect() {}, fillText: canvas.text }; }
    update = canvas.uploads;
  },
}));

describe("timeline-driven npm terminal", () => {
  it("types the command, downloads 4.8 GB and starts the cans exactly at successful completion", () => {
    expect(npmInstallState(CASSOULET_INSTALL.start).command).toBe("");
    const typing = npmInstallState(CASSOULET_INSTALL.start + .4);
    expect(typing.command.startsWith("$ npm")).toBe(true);
    expect(typing.command.length).toBeLessThan("$ npm install cassoulet".length);
    expect(npmInstallState(CASSOULET_INSTALL.typingEnd).command).toBe("$ npm install cassoulet");
    const middle = npmInstallState((CASSOULET_INSTALL.typingEnd + CASSOULET_INSTALL.complete) / 2);
    expect(middle.downloadedGB).toBeCloseTo(2.4, 1);
    expect(middle.complete).toBe(false);
    const before = npmInstallState(CASSOULET_INSTALL.complete - .001);
    expect(before.downloadedGB).toBeLessThan(4.8);
    expect(before.complete).toBe(false);
    const done = npmInstallState(CASSOULET_INSTALL.complete);
    expect(done.downloadedGB).toBe(4.8);
    expect(done.progress).toBe(1);
    expect(done.complete).toBe(true);
    expect(CASSOULET_PILE.start).toBe(CASSOULET_INSTALL.complete);
    expect(() => npmInstallState(NaN)).toThrow();
  });

  it("renders a terminal without uploading a new texture for every render frame or changing state on pause/seek", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const terminal = new NpmCassouletTerminal(scene, new TransformNode("npm stage", scene));
    canvas.uploads.mockClear();
    canvas.text.mockClear();
    terminal.update(120.01);
    terminal.update(120.02);
    terminal.update(120.09);
    expect(canvas.uploads).toHaveBeenCalledTimes(1);
    terminal.update(CASSOULET_INSTALL.complete);
    expect(canvas.text).toHaveBeenCalledWith("added 4.8 GB  /  installation complete", expect.any(Number), expect.any(Number));
    const expected = npmInstallState(120.01);
    terminal.update(180);
    terminal.update(117);
    terminal.update(120.01);
    expect(npmInstallState(120.01)).toEqual(expected);
    expect(scene.getMeshByName("npm install cassoulet")).toBe(terminal.mesh);
    scene.dispose();
    engine.dispose();
  });
});
