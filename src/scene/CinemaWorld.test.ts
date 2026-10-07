import { describe, expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { CINEMA, CLAP_CRT, REHEARSAL_STOPS } from "../content/showBeats";
import { clapCrtState } from "../effects/ClapCrtTransition";
import { SPEAKERS } from "../content/speakers";
import { CinemaWorld } from "./CinemaWorld";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";

vi.mock("./WorldText", async () => {
  const { Mesh } = await import("@babylonjs/core/Meshes/mesh");
  const { StandardMaterial } = await import("@babylonjs/core/Materials/standardMaterial");
  return {
    createWorldText: (scene: Scene, options: { name: string }) => {
      const mesh = new Mesh(options.name, scene);
      const material = new StandardMaterial(`${options.name} test texture`, scene);
      material.emissiveColor.set(.9, .95, 1);
      mesh.material = material;
      return mesh;
    },
  };
});

vi.mock("@babylonjs/core/Materials/Textures/dynamicTexture", () => ({
  DynamicTexture: class {
    wrapU = 0;
    uOffset = 0;
    getContext() { return { fillStyle: "", fillRect() {}, fillText() {}, measureText(text: string) { return { width: text.length * 40 }; } }; }
    update() {}
  },
}));

describe("cinematic show choreography", () => {
  it("preserves CRT color and applies a non-accumulating 18-percent snare accent", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    new FreeCamera("Cinematic camera", Vector3.Zero(), scene);
    const cinema = new CinemaWorld(scene);
    const crt = scene.getMeshByName("Cinema / CRT display 0");
    if (!(crt?.material instanceof StandardMaterial)) throw new Error("CRT must have a text material.");
    const material = crt.material;
    const base = material.emissiveColor.clone();
    expect(base.asArray()).toEqual([.9, .95, 1]);
    cinema.update(60, { ...silentFeatures(), snare: 1 });
    expect(material.emissiveColor.asArray()).toEqual(base.scale(1.18).asArray());
    cinema.update(60, { ...silentFeatures(), snare: 1 });
    expect(material.emissiveColor.asArray()).toEqual(base.scale(1.18).asArray());
    cinema.update(60, silentFeatures());
    expect(material.emissiveColor.asArray()).toEqual(base.asArray());
    scene.dispose();
    engine.dispose();
  });

  it("keeps the existing four-speaker program while moving David's introduction to cinema", () => {
    expect(SPEAKERS.map((speaker) => speaker.world)).toEqual(["game", "cinema", "digital", "digital"]);
    expect(SPEAKERS[1].gateTime).toBe(CINEMA.davidGate);
    expect(SPEAKERS[1].demoTitle).toBe("Musical Agentic Blender");
    expect(REHEARSAL_STOPS.map((stop) => stop.label)).toContain("CAMERA LENS");
    expect(REHEARSAL_STOPS.at(-1)?.label).toBe("FINAL REVEAL");
  });

  it("prepares a raised bucket on each side and mirrors their inward tilt on playback and rewind", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    new FreeCamera("Cinematic camera", Vector3.Zero(), scene);
    const cinema = new CinemaWorld(scene);
    vi.spyOn(cinema.assets, "prepare").mockResolvedValue();
    vi.spyOn(cinema.assets, "takeClapper").mockReturnValue(undefined);
    vi.spyOn(cinema.assets, "create").mockImplementation((asset, parent, name) => {
      if (asset !== "popcorn") return undefined;
      const bucket = new TransformNode(name, scene);
      bucket.parent = parent;
      return bucket;
    });
    await cinema.prepare();
    const left = scene.getTransformNodeByName("Cinema / tipping popcorn bucket -1")!;
    const right = scene.getTransformNodeByName("Cinema / tipping popcorn bucket 1")!;
    cinema.update(CINEMA.start, silentFeatures());
    expect(left.isEnabled() && right.isEnabled()).toBe(true);
    expect(left.parent).toBeInstanceOf(TransformNode);
    expect(right.parent).toBeInstanceOf(TransformNode);
    expect(scene.getTransformNodeByName("Cinema / popcorn support -1")!.position.y).toBe(18);
    expect(scene.getTransformNodeByName("Cinema / popcorn support 1")!.position.y).toBe(18);
    expect(left.rotation.z).toBeCloseTo(-.1);
    expect(right.rotation.z).toBeCloseTo(.1);
    cinema.update(CINEMA.popcorn, silentFeatures());
    expect(left.rotation.z).toBeCloseTo(-1.35);
    expect(right.rotation.z).toBeCloseTo(1.35);
    cinema.update(CINEMA.popcornTip - .1, silentFeatures());
    expect(left.rotation.z).toBeCloseTo(-.1);
    expect(right.rotation.z).toBeCloseTo(.1);
    cinema.update(CINEMA.lens, silentFeatures());
    expect(left.isEnabled() || right.isEnabled()).toBe(false);
    scene.dispose();
    engine.dispose();
  });

  it("hands off behind the CRT line without a black plane, then projects David and crosses lens and space", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    new FreeCamera("Cinematic camera", Vector3.Zero(), scene);
    const cinema = new CinemaWorld(scene);
    const silence = silentFeatures();
    expect(scene.getMeshByName("FX/Cinema / shutter cut")).toBeNull();
    const reels = scene.getTransformNodeByName("Cinema / reels and moving film architecture");
    const crt = scene.getMeshByName("Cinema / CRT display 0");
    const lens = scene.getTransformNodeByName("Cinema / camera iris to projector");
    const space = scene.getTransformNodeByName("Cinema / brief Toulouse space crossing");
    if (!reels || !crt || !lens || !space) throw new Error("Cinema stages must be built before playback.");
    cinema.update(49.9, silence);
    expect(clapCrtState(49.9).active).toBe(false);
    const clapper = scene.getTransformNodeByName("Cinema / clapperboard transition");
    const architecture = scene.getTransformNodeByName("Cinema / impossible auditorium");
    if (!clapper || !architecture) throw new Error("Both sides of the cut must exist.");
    for (let time = 0; time < CINEMA.clap; time += .25) {
      cinema.update(time, silence);
      expect(clapper.isEnabled()).toBe(true);
      expect(architecture.isEnabled()).toBe(false);
      expect(crt.isEnabled()).toBe(false);
    }
    cinema.update(CINEMA.clap + .01, silence);
    expect(clapCrtState(CINEMA.clap + .01).active).toBe(true);
    expect(clapCrtState(CINEMA.start).signalHeight).toBeCloseTo(CLAP_CRT.minimumHeight);
    cinema.update(CINEMA.start, silence);
    expect(architecture.isEnabled()).toBe(true);
    expect(clapper.isEnabled()).toBe(false);
    cinema.update(44, silence);
    expect(clapper.isEnabled()).toBe(true);
    expect(architecture.isEnabled()).toBe(false);
    cinema.update(70, silence);
    expect(clapCrtState(70).active).toBe(false);
    expect(cinema.davidRoot.isEnabled()).toBe(true);
    cinema.update(CINEMA.crtSync + .1, silence);
    expect(crt.material?.name).toBe("Cinema / synchronized CRT frame test texture");
    cinema.update(CINEMA.crtSyncEnd + .1, silence);
    expect(crt.material?.name).toBe("Cinema / CRT content 0");
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
    expect(clapper.isEnabled()).toBe(true);
    expect(architecture.isEnabled()).toBe(false);
    scene.dispose();
    engine.dispose();
  });

  it("keeps the whole cinema set visible from entry and sweeps the lights across David's actual card", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    new FreeCamera("Cinematic camera", Vector3.Zero(), scene);
    const cinema = new CinemaWorld(scene);
    expect(scene.getMeshByName("Cinema / slate title")).toBeNull();
    const screen = scene.getMeshByName("Cinema premiere / David Rousset");
    if (!(screen?.material instanceof StandardMaterial)) throw new Error("David requires a lit screen.");
    expect(screen.material.disableLighting).toBe(false);
    expect(screen.material.maxSimultaneousLights).toBeGreaterThanOrEqual(6);
    for (const time of [CINEMA.start + .1, 60, 68, 78, 87]) {
      cinema.update(time, silentFeatures());
      for (const name of ["Cinema / impossible auditorium", "Cinema / reels and moving film architecture",
        "Cinema / camera iris to projector", "Cinema / aligned CRT installation", "Cinema / David premiere screen"]) {
        expect(scene.getTransformNodeByName(name)?.isEnabled(), `${name} at ${time}s`).toBe(true);
      }
    }
    const hits: number[] = [];
    for (let time = 67; time < 75; time += .25) {
      cinema.update(time, silentFeatures());
      for (const side of [-1, 1]) {
        const spot = scene.getLightByName(`Cinema / premiere aisle lighting ${side}`);
        if (!(spot instanceof SpotLight)) throw new Error("Expected moving spot.");
        const distance = (-.12 - spot.position.z) / spot.direction.z;
        const hit = spot.position.add(spot.direction.scale(distance));
        expect(Math.abs(hit.x)).toBeLessThan(8);
        expect(hit.y).toBeGreaterThan(12.5);
        expect(hit.y).toBeLessThan(21.5);
        expect(spot.intensity).toBeGreaterThan(0);
        expect(spot.includedOnlyMeshes).toContain(screen);
        expect(spot.includedOnlyMeshes).toHaveLength(1);
        expect(spot.falloffType).toBe(SpotLight.FALLOFF_PHYSICAL);
        hits.push(Math.abs(hit.x));
      }
    }
    expect(Math.min(...hits)).toBeLessThan(.6);
    expect(Math.max(...hits)).toBeGreaterThan(7);
    cinema.update(40, silentFeatures());
    expect(scene.getTransformNodeByName("Cinema / reels and moving film architecture")?.isEnabled()).toBe(false);
    scene.dispose();
    engine.dispose();
  });
});
