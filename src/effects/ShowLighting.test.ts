import { describe, expect, it } from "vitest";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { SPEAKERS } from "../content/speakers";
import { cameraPose, routeAnchor } from "../camera/CameraPath";
import { CELL, cellPosition, createTitleCells } from "../content/title";
import { silentFeatures } from "../engine/AudioAnalyzer";
import { FLOOR_STATION_TIMES, PortalLasers, floorVisibility, laserAim, laserEndpoints, laserReach, laserStrength, speakerReveal, spotlightSweep, spectrumBarHeight } from "./ShowLighting";
import { WALL_METER_BANKS, wallMeterLevels, wallMeterVisibility } from "./WallMeters";

describe("stage lighting choreography", () => {
  const silence = silentFeatures();

  it("runs without audio, reacts to transients and ends before the title reveal", () => {
    for (const speaker of SPEAKERS) {
      expect(laserStrength(speaker.startTime - 3, speaker, silence)).toBe(0);
      expect(laserStrength(speaker.startTime - 2.5, speaker, silence)).toBeGreaterThan(0);
      expect(laserReach(speaker.startTime - 3, speaker)).toBe(0);
      expect(laserReach(speaker.startTime - 2.7, speaker)).toBeGreaterThan(0);
      expect(laserReach(speaker.startTime - 2.7, speaker)).toBeLessThan(1);
      expect(laserReach(speaker.startTime - 2.3, speaker)).toBe(1);
      expect(laserAim(speaker.startTime - 2, speaker)).toBe(0);
      expect(laserAim(speaker.startTime - 1, speaker)).toBeGreaterThan(0);
      expect(laserAim(speaker.startTime - .25, speaker)).toBe(1);
      expect(spotlightSweep(speaker.startTime + .25, speaker)).toBe(0);
      expect(spotlightSweep(speaker.startTime + 1.5, speaker)).toBeCloseTo(.5);
      expect(spotlightSweep(speaker.startTime + 2.75, speaker)).toBe(1);
      expect(speakerReveal(speaker.startTime - .4, speaker)).toBe(0);
      expect(speakerReveal(speaker.startTime + .25, speaker)).toBe(0);
      expect(speakerReveal(speaker.startTime + 2.05, speaker)).toBe(1);
      expect(laserStrength(speaker.startTime + 5, speaker, silence)).toBeGreaterThan(.3);
      expect(laserStrength(speaker.startTime + 5, speaker, { ...silence, kick: 1, drop: 1 }))
        .toBeGreaterThan(laserStrength(speaker.startTime + 5, speaker, silence));
      expect(laserStrength(speaker.endTime, speaker, silence)).toBe(0);
    }
    expect(floorVisibility(0)).toBe(1);
    expect(floorVisibility(153)).toBeGreaterThan(0);
    expect(floorVisibility(155)).toBe(0);
    expect(floorVisibility(180)).toBe(0);
    expect(spectrumBarHeight(15, 15, 0, silence)).toBeGreaterThan(.3);
    expect(spectrumBarHeight(15, 15, 0, { ...silence, bass: 1, kick: 1 }))
      .toBeGreaterThan(spectrumBarHeight(15, 15, 0, silence) + 1);
    expect(spectrumBarHeight(15, 15, 1, { ...silence, bass: 1 }))
      .toBe(spectrumBarHeight(15, 15, 1, silence));
    expect(spectrumBarHeight(15, 100, 0, { ...silence, bass: 1 })).toBe(.025);
    expect(spectrumBarHeight(155, 150, 0, { ...silence, bass: 1 })).toBe(.025);
  });

  it("returns exactly to the same visual state after seeking backward", () => {
    const first = SPEAKERS[1];
    const strength = laserStrength(68, first, silence);
    const endpoints = laserEndpoints(68, first, -1, 1);
    const bar = spectrumBarHeight(68, 69, 2, silence);
    laserStrength(175, first, { ...silence, drop: 1 });
    laserEndpoints(140, SPEAKERS[3], 1, 0);
    spectrumBarHeight(153, 150, 2, { ...silence, treble: 1 });
    expect(laserStrength(68, first, silence)).toBe(strength);
    expect(laserEndpoints(68, first, -1, 1)).toEqual(endpoints);
    expect(spectrumBarHeight(68, 69, 2, silence)).toBe(bar);
  });

  it("keeps beams outside the speaker text panels and inside the corridor", () => {
    const corridor = createTitleCells().filter((cell) => cell.letter === 0);
    const occupied = new Set(corridor.map((cell) => `${cell.col},${cell.row}`));
    for (const speaker of SPEAKERS) {
      const { position, yaw } = routeAnchor(speaker.gateTime, speaker.lateralOffset);
      const world = Matrix.RotationY(yaw).multiply(Matrix.Translation(position.x, 0, position.z));
      for (let time = speaker.startTime - 2.5; time < speaker.endTime; time += .5) {
        if (time < speaker.startTime - 2) {
          expect(laserEndpoints(time, speaker, -1, 0).target.z).toBeLessThan(-15);
        }
        for (const side of [-1, 1]) {
          expect(laserEndpoints(time, speaker, side, 0).origin)
            .toEqual(laserEndpoints(time, speaker, side, 1).origin);
          for (const ray of [0, 1, 2]) {
            const { origin, target } = laserEndpoints(time, speaker, side, ray);
            expect(origin.y).toBeLessThan(1);
            if (time >= speaker.startTime - .25) {
              expect(target.y).toBeGreaterThan(12);
              expect(Math.abs(target.x)).toBeGreaterThan(((speaker.gateWidth ?? 24) - 1) / 2);
            }
            const camera = cameraPose(time).position;
            const start = Vector3.TransformCoordinates(origin, world);
            const end = Vector3.TransformCoordinates(target, world);
            const length = end.subtract(start);
            const nearest = Math.max(0, Math.min(1, Vector3.Dot(camera.subtract(start), length) / length.lengthSquared()));
            expect(Vector3.Distance(camera, start.add(length.scale(nearest))), `${speaker.name} / ${time} / camera clearance`)
              .toBeGreaterThan(1.5);
            for (let step = 0; step <= 10; step++) {
              const point = Vector3.Lerp(origin, target, step / 10);
              expect(point.z).toBeGreaterThan(-22);
              expect(point.y).toBeGreaterThan(0);
              expect(point.y).toBeLessThan(30);
              const actual = Vector3.TransformCoordinates(point, world);
              const nearest = corridor.reduce((best, cell) =>
                Math.hypot(actual.x - cell.x, actual.z - cell.z) < Math.hypot(actual.x - best.x, actual.z - best.z)
                  ? cell : best);
              expect(corridor.some((cell) => {
                const dx = actual.x - cell.x;
                const dz = actual.z - cell.z;
                return Math.abs(dx) < CELL / 2 && Math.abs(dz) < CELL / 2
                  && (Math.abs(dx) < CELL / 2 - .5 || occupied.has(`${cell.col + Math.sign(dx)},${cell.row}`))
                  && (Math.abs(dz) < CELL / 2 - .5 || occupied.has(`${cell.col},${cell.row - Math.sign(dz)}`));
              }),
              `${speaker.name} / ${time} / ${side} / ${ray} / ${actual.toString()} / ${JSON.stringify(nearest)}`).toBe(true);
            }
          }
        }
      }
    }
  });

  it("places the floor spectrum within the letter corridor, below the camera route", () => {
    const corridor = createTitleCells().filter((cell) => cell.letter === 0);
    const bridge = [7, 8, 9].map((row) => cellPosition(2, row));
    for (const station of FLOOR_STATION_TIMES) {
      const { position, yaw } = routeAnchor(station);
      for (const lane of [-1, 0, 1]) {
        for (const dx of [-1, 1]) {
          for (const dz of [-4, 4]) {
            const x = (lane * 6.5) + dx;
            const actualX = position.x + Math.cos(yaw) * x + Math.sin(yaw) * dz;
            const actualZ = position.z - Math.sin(yaw) * x + Math.cos(yaw) * dz;
            expect([...corridor, ...bridge].some((cell) => Math.abs(actualX - cell.x) < CELL / 2
              && Math.abs(actualZ - cell.z) < CELL / 2), `${station}s / lane ${lane}`).toBe(true);
          }
        }
      }
      expect(position.y - (2.4 + .18)).toBeGreaterThan(5);
    }
  });

  it("keeps Mitsuru's illuminated backplate clear of the brick wall", () => {
    const speaker = SPEAKERS[3];
    const { position, yaw } = routeAnchor(speaker.gateTime, speaker.lateralOffset);
    const world = Matrix.RotationY(yaw).multiply(Matrix.Translation(position.x, 0, position.z));
    const center = cellPosition(4, 4).x;
    for (const side of [-1, 1]) {
      const edge = Vector3.TransformCoordinates(new Vector3(side * ((speaker.gateWidth ?? 24) + 1.2) / 2, 20, -.07), world);
      expect(edge.x).toBeGreaterThan(center - CELL / 2 + .2);
      expect(edge.x).toBeLessThan(center + CELL / 2 - .2);
    }
  });

  it("lights three rectangles at each corridor end and over the exit", () => {
    const occupied = new Set(createTitleCells().map((cell) => `${cell.col},${cell.row}`));
    for (const bank of WALL_METER_BANKS) {
      const [dc, dr] = bank.face === "east" ? [1, 0] : [0, bank.face === "north" ? -1 : 1];
      expect(occupied.has(`${bank.col},${bank.row}`)).toBe(true);
      expect(occupied.has(`${bank.col + dc},${bank.row + dr}`)).toBe(false);
      expect(wallMeterVisibility(bank.start - 1, bank)).toBe(0);
      expect(wallMeterVisibility(bank.start + 3, bank)).toBe(1);
      expect(wallMeterVisibility(bank.end, bank)).toBe(0);
    }
    expect(wallMeterVisibility(0, WALL_METER_BANKS[0])).toBe(1);
    expect(wallMeterVisibility(82, WALL_METER_BANKS[1])).toBe(1);
    expect(wallMeterVisibility(105, WALL_METER_BANKS[2])).toBe(1);
    expect(WALL_METER_BANKS).toHaveLength(5);
    expect(wallMeterVisibility(140, WALL_METER_BANKS[3])).toBe(1);
    expect(WALL_METER_BANKS[3].face).toBe("south");
    expect(wallMeterVisibility(150, WALL_METER_BANKS[4])).toBe(1);
    expect(WALL_METER_BANKS[4].face).toBe("north");
    expect(wallMeterVisibility(159, WALL_METER_BANKS[4])).toBe(0);
    expect(wallMeterLevels({ ...silence, bass: .8, mid: .6, treble: .9 })).toEqual([.8, .6, .9]);
    expect(wallMeterLevels({ ...silence, violaEnergy: .7 })).toEqual([0, .7, .42]);
  });

  it("uses real floor spotlights whose intensity follows the speaker prelude and audio", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const lasers = new PortalLasers(scene, new TransformNode("portal", scene), SPEAKERS[0]);
    const lights = scene.lights.filter((light): light is SpotLight => light instanceof SpotLight);
    expect(lights).toHaveLength(2);
    expect(lights.every((light) => light.position.y < 1 && light.intensity === 0)).toBe(true);
    lasers.update(SPEAKERS[0].startTime - 2.5, silence);
    expect(lights.every((light) => light.intensity > 0)).toBe(true);
    expect(lights[0].direction.z).toBeLessThan(0);
    const quiet = lights[0].intensity;
    lasers.update(SPEAKERS[0].startTime + 5, { ...silence, energy: 1, kick: 1 });
    expect(lights[0].intensity).toBeGreaterThan(quiet);
    expect(lights[0].direction.z).toBeGreaterThan(0);
    lasers.update(SPEAKERS[0].startTime + .3, silence);
    const center = Math.abs(lights[0].direction.x);
    lasers.update(SPEAKERS[0].startTime + 3, silence);
    expect(Math.abs(lights[0].direction.x)).toBeLessThan(center);
    expect(scene.meshes.filter((mesh) => mesh.name === `FX/Laser ${SPEAKERS[0].name}` && mesh.isEnabled())).toHaveLength(8);
    lasers.update(SPEAKERS[0].endTime, silence);
    expect(lights.every((light) => light.intensity === 0)).toBe(true);
    scene.dispose();
    engine.dispose();
  });

});
