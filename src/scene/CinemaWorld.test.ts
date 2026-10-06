import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { CINEMA, REHEARSAL_STOPS } from "../content/showBeats";
import { SPEAKERS } from "../content/speakers";
import { CinemaWorld } from "./CinemaWorld";

vi.mock("./WorldText", async () => {
  const { Mesh } = await import("@babylonjs/core/Meshes/mesh");
  const { StandardMaterial } = await import("@babylonjs/core/Materials/standardMaterial");
  return {
    createWorldText: (scene: Scene, options: { name: string }) => {
      const mesh = new Mesh(options.name, scene);
      mesh.material = new StandardMaterial(`${options.name} test texture`, scene);
      return mesh;
    },
  };
});

vi.mock("@babylonjs/core/Materials/Textures/dynamicTexture", () => ({
  DynamicTexture: class {
    wrapU = 0;
    uOffset = 0;
    getContext() { return { fillStyle: "", fillRect() {} }; }
    update() {}
  },
}));

describe("cinematic show choreography", () => {
  it("keeps the existing four-speaker program while moving David's introduction to cinema", () => {
    expect(SPEAKERS.map((speaker) => speaker.world)).toEqual(["game", "cinema", "digital", "digital"]);
    expect(SPEAKERS[1].gateTime).toBe(CINEMA.davidGate);
    expect(SPEAKERS[1].demoTitle).toBe("Musical Agentic Blender");
    expect(REHEARSAL_STOPS.map((stop) => stop.label)).toContain("CAMERA LENS");
    expect(REHEARSAL_STOPS.at(-1)?.label).toBe("FINAL REVEAL");
  });

  it("cuts on the clapper, projects David once, then travels through lens and space without entering the finale", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    new FreeCamera("Cinematic camera", Vector3.Zero(), scene);
    const cinema = new CinemaWorld(scene);
    const silence = silentFeatures();
    const shutter = scene.getMeshByName("FX/Cinema / shutter cut");
    const reels = scene.getTransformNodeByName("Cinema / reels and moving film architecture");
    const crt = scene.getMeshByName("Cinema / CRT display 0");
    const lens = scene.getTransformNodeByName("Cinema / camera iris to projector");
    const space = scene.getTransformNodeByName("Cinema / brief Toulouse space crossing");
    if (!shutter || !reels || !crt || !lens || !space) throw new Error("Cinema stages must be built before playback.");
    cinema.update(49.9, silence);
    expect(shutter.isEnabled()).toBe(false);
    const clapper = scene.getTransformNodeByName("Cinema / clapperboard transition");
    const architecture = scene.getTransformNodeByName("Cinema / impossible auditorium");
    if (!clapper || !architecture) throw new Error("Both sides of the cut must exist.");
    for (let time = CINEMA.clapperStart; time < CINEMA.clap; time += .25) {
      cinema.update(time, silence);
      expect(clapper.isEnabled()).toBe(true);
      expect(architecture.isEnabled()).toBe(false);
      expect(crt.isEnabled()).toBe(false);
    }
    cinema.update(CINEMA.clap + .01, silence);
    expect(shutter.isEnabled()).toBe(true);
    cinema.update(70, silence);
    expect(shutter.isEnabled()).toBe(false);
    expect(cinema.davidRoot.isEnabled()).toBe(true);
    cinema.update(CINEMA.crtSync + .1, silence);
    expect(crt.material?.name).toBe("Cinema / synchronized CRT frame test texture");
    cinema.update(CINEMA.crtSyncEnd + .1, silence);
    expect(crt.material?.name).toBe("Cinema / CRT content 0 test texture");
    cinema.update(79, silence);
    expect(reels.isEnabled()).toBe(true);
    cinema.update(87, silence);
    expect(lens.isEnabled()).toBe(true);
    expect(scene.getMeshByName("FX/Cinema / optical element 0")?.isEnabled()).toBe(false);
    expect(scene.getTransformNodeByName("Cinema / projector emerging after lens")?.isEnabled()).toBe(false);
    cinema.update(CINEMA.lens, silence);
    expect(scene.getMeshByName("FX/Cinema / optical element 0")?.isEnabled()).toBe(true);
    cinema.update(96, silence);
    expect(space.isEnabled()).toBe(true);
    cinema.update(175, silence);
    expect(space.isEnabled()).toBe(false);
    expect(cinema.davidRoot.isEnabled()).toBe(false);
    expect(scene.getLightByName("Cinema / one real premiere projector")?.intensity).toBe(0);
    cinema.update(CINEMA.clap + .01, silence);
    expect(shutter.isEnabled()).toBe(true);
    scene.dispose();
    engine.dispose();
  });
});
