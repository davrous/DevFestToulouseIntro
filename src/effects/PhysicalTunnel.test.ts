import { describe, expect, it } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { CINEMA } from "../content/showBeats";
import { PhysicalTunnel, TUNNEL_LAYER, tunnelAudioBands } from "./PhysicalTunnel";
import { TUNNEL_DISTANCES, TUNNEL_EXIT_INDEX, TUNNEL_FLIGHT_LENGTH, TUNNEL_POINTS, tunnelFlightPose } from "../camera/TunnelFlight";

describe("shared physical tunnel render", () => {
  it("keeps the unchanged tunnel design and removes its render pass exactly at 94.2s", () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const camera = new FreeCamera("World camera", Vector3.Zero(), scene);
    const tunnel = new PhysicalTunnel(scene);
    expect(engine.scenes).toHaveLength(1);
    expect(camera.layerMask & TUNNEL_LAYER).toBe(0);
    expect(tunnel.mesh.getTotalVertices()).toBeGreaterThan(29000);
    expect(tunnel.texture.renderList).toHaveLength(1);
    expect(tunnel.texture.renderList![0]).toBe(tunnel.mesh);
    expect(tunnel.texture.hasAlpha).toBe(true);
    expect(tunnel.texture.clearColor.a).toBe(0);
    expect(TUNNEL_DISTANCES[TUNNEL_EXIT_INDEX]).toBeCloseTo(TUNNEL_FLIGHT_LENGTH, 6);
    expect(Vector3.Distance(TUNNEL_POINTS[TUNNEL_EXIT_INDEX], tunnelFlightPose(94.2).position)).toBeLessThan(.000001);
    expect(scene.customRenderTargets).not.toContain(tunnel.texture);
    tunnel.update(94.199, silentFeatures());
    expect(scene.customRenderTargets).toContain(tunnel.texture);
    tunnel.update(94.2, silentFeatures());
    expect(scene.customRenderTargets).not.toContain(tunnel.texture);
    tunnel.update(79, silentFeatures());
    expect(scene.customRenderTargets).toContain(tunnel.texture);
    tunnel.update(85, { ...silentFeatures(), bass: .1, lowMid: .2, highMid: .3, treble: .4 });
    expect(tunnel.bands).toEqual([.1, .2, .3, .4]);
    const count = [scene.meshes.length, scene.materials.length, scene.cameras.length];
    for (const time of [94, 0, 82, 94, 80, 180]) tunnel.update(time, silentFeatures());
    expect(scene.customRenderTargets).not.toContain(tunnel.texture);
    expect([scene.meshes.length, scene.materials.length, scene.cameras.length]).toEqual(count);
    tunnel.update(CINEMA.lens, silentFeatures());
    expect(scene.customRenderTargets.filter((target) => target === tunnel.texture)).toHaveLength(1);
    scene.dispose(); engine.dispose();
  });

  it("keeps the four FFT controls separate without accumulating audio-driven motion", () => {
    for (let index = 0; index < 4; index++) {
      const bands: [number, number, number, number] = [0, 0, 0, 0];
      bands[index] = .75;
      expect(tunnelAudioBands({ ...silentFeatures(), bass: bands[0], lowMid: bands[1], highMid: bands[2], treble: bands[3] })).toEqual(bands);
    }
    expect(tunnelAudioBands({ ...silentFeatures(), bass: -1, lowMid: 2, highMid: .3, treble: .4 })).toEqual([0, 1, .3, .4]);
  });
});
