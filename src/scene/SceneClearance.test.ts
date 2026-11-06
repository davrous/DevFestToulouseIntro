import { describe, expect, it } from "vitest";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { cameraPose, interiorPosition, routeAnchor } from "../camera/CameraPath";
import { CELL, HEIGHT, TITLE_WIDTH, TITLE_DEPTH, cellPosition } from "../content/title";
import { SPEAKERS } from "../content/speakers";
import { DUST, showFogDensity } from "./Atmosphere";
import { CORE_LAYOUT } from "./Interior";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { MusicReactive } from "../effects/MusicReactive";
import { silentFeatures } from "../engine/AudioAnalyzer";

describe("shot clearance and reveal clarity", () => {
  it("removes tiny ambient data dots from the corridors while retaining the reveal particles", () => {
    const engine = new NullEngine(), scene = new Scene(engine), music = new MusicReactive(scene);
    for (const time of [0, 18, 99, 139, 158.999, 159, 170, 180, 0]) {
      music.update(time, silentFeatures());
      expect(music.particles.isEnabled()).toBe(time >= 159);
    }
    scene.dispose(); engine.dispose();
  });

  it("keeps drifting dust more than two units below every interior camera pose", () => {
    const highestDust = DUST.maxY + DUST.drift + DUST.thickness / 2;
    for (let time = 0; time <= 163; time += .1) {
      expect(interiorPosition(time).y - highestDust).toBeGreaterThan(2);
    }
  });

  it("keeps the full orbiting core envelope inside the walls and below the roof", () => {
    const radius = Math.max(...CORE_LAYOUT.ringDiameters) / 2 + CORE_LAYOUT.ringThickness / 2;
    expect(CORE_LAYOUT.offsetX + radius).toBeLessThan(CELL / 2 - 1.6);
    expect(CORE_LAYOUT.height + radius).toBeLessThan(HEIGHT - 1.15);
    const p = cellPosition(CORE_LAYOUT.column, CORE_LAYOUT.row);
    const center = new Vector3(p.x + CORE_LAYOUT.offsetX, CORE_LAYOUT.height, p.z);
    for (let time = 0; time <= 163; time += .1) {
      expect(Vector3.Distance(interiorPosition(time), center) - radius).toBeGreaterThan(1);
    }
    for (const gateRow of [1.8, 3.2, 4.6]) {
      expect(Math.abs(p.z - cellPosition(4, gateRow).z)).toBeGreaterThan(radius + .5);
    }
  });

  it("clears both corridor walls with Mitsuru's shifted name panel", () => {
    const speaker = SPEAKERS[3];
    const { position, yaw } = routeAnchor(speaker.gateTime, speaker.lateralOffset);
    const world = Matrix.RotationY(yaw).multiply(Matrix.Translation(position.x, 0, position.z));
    const halfWidth = ((speaker.gateWidth ?? 24) - 1) / 2;
    const center = cellPosition(4, 4).x;
    for (const x of [-halfWidth - .035, halfWidth + .035]) {
      const corner = Vector3.TransformCoordinates(new Vector3(x, 24, -.12), world);
      expect(corner.x).toBeGreaterThan(center - 12);
      expect(corner.x).toBeLessThan(center + 12);
    }
  });

  it("does not fog away the letter bodies during the moving reveal", () => {
    for (let time = 166; time <= 180; time += .1) {
      const camera = cameraPose(time).position;
      const density = showFogDensity(time, 1);
      for (const x of [-TITLE_WIDTH / 2, TITLE_WIDTH / 2]) {
        for (const z of [-TITLE_DEPTH / 2, TITLE_DEPTH / 2]) {
          const distance = Vector3.Distance(camera, new Vector3(x, HEIGHT, z));
          const transmission = Math.exp(-((distance * density) ** 2));
          expect(transmission, `letter transmission at ${time.toFixed(1)}s`).toBeGreaterThan(.6);
        }
      }
    }
    expect(showFogDensity(90)).toBe(.009);
    expect(showFogDensity(180, 1)).toBe(.00008);
  });
});
