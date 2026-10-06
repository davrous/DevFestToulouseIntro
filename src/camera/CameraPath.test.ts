import { describe, expect, it } from "vitest";
import { cameraPose, interiorPosition, routeAnchor } from "./CameraPath";
import { CELL, HEIGHT, TITLE_WIDTH, cellPosition, createTitleCells, seededRandom, SEED } from "../content/title";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SPEAKERS } from "../content/speakers";
import { BRIDGE_CELLS, bridgeVisible, isArcadeExit } from "../scene/Labyrinth";
import { arcadeDoorOpen } from "../scene/ArcadeT";

describe("title labyrinth choreography", () => {
  it("builds the seven- and eight-letter words using reproducible modules", () => {
    const cells = createTitleCells();
    expect(new Set(cells.filter((cell) => cell.line === 0).map((cell) => cell.letter)).size).toBe(7);
    expect(new Set(cells.filter((cell) => cell.line === 1).map((cell) => cell.letter)).size).toBe(8);
    const first = seededRandom(SEED);
    const second = seededRandom(SEED);
    expect(Array.from({ length: 40 }, first)).toEqual(Array.from({ length: 40 }, second));
  });

  it("keeps every frame in the T, D or roofed connecting passage with wall clearance", () => {
    const cells = createTitleCells().filter((cell) => cell.letter === 0)
      .concat([7, 8, 9].map((row) => ({ col: 2, row, line: 1, letter: 0, ...cellPosition(2, row) })));
    const occupied = new Set(cells.map((cell) => `${cell.col},${cell.row}`));
    for (let t = 0; t <= 163; t += 1 / 30) {
      const p = interiorPosition(t);
      expect(cells.some((cell) => Math.abs(p.x - cell.x) <= CELL / 2 && Math.abs(p.z - cell.z) <= CELL / 2), `interior at ${t.toFixed(2)}s`).toBe(true);
      for (const cell of cells) {
        for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (occupied.has(`${cell.col + dc},${cell.row + dr}`)) continue;
          const wx = cell.x + dc * CELL / 2;
          const wz = cell.z - dr * CELL / 2;
          const distance = dr === 0
            ? Math.hypot(p.x - wx, Math.max(0, Math.abs(p.z - wz) - CELL / 2))
            : Math.hypot(Math.max(0, Math.abs(p.x - wx) - CELL / 2), p.z - wz);
          expect(distance, `boundary clearance at ${t.toFixed(2)}s`).toBeGreaterThan(1);
        }
      }
      expect(p.y).toBeGreaterThan(3);
      expect(p.y).toBeLessThan(HEIGHT - 4);
    }
  });

  it("runs the original D circuit at more than 1.5 times its former average speed", () => {
    let distance = 0;
    let previous = interiorPosition(70);
    for (let time = 70 + 1 / 30; time <= 155; time += 1 / 30) {
      const current = interiorPosition(Math.min(time, 155));
      distance += Vector3.Distance(previous, current);
      previous = current;
    }
    expect(distance / 85).toBeGreaterThan(1.5 * 453.5 / 155);
    const originalStart = cellPosition(.12, 5.05);
    expect(interiorPosition(70).x).toBeCloseTo(originalStart.x);
    expect(interiorPosition(70).z).toBeCloseTo(originalStart.z);
  });

  it("opens the T exit before crossing and keeps the bridge through the final reveal", () => {
    const tExit = createTitleCells().find((cell) => cell.line === 1 && cell.letter === 0 && cell.col === 1 && cell.row === 9);
    expect(tExit).toBeDefined();
    expect(isArcadeExit(tExit!, 1, 0)).toBe(true);
    expect(BRIDGE_CELLS).toEqual([{ col: 2, row: 9 }, { col: 2, row: 8 }, { col: 2, row: 7 }]);
    const doorway = cellPosition(1.5, 9).x;
    for (let t = 44; t < 50; t += .05) {
      if (interiorPosition(t).x >= doorway) expect(arcadeDoorOpen(t)).toBeGreaterThan(.75);
    }
    expect(bridgeVisible(60)).toBe(true);
    expect(bridgeVisible(144)).toBe(true);
    expect(bridgeVisible(145)).toBe(true);
    expect(bridgeVisible(163)).toBe(true);
    expect(bridgeVisible(180)).toBe(true);
  });

  it("does not reveal the structure before the escape and has no camera cuts", () => {
    for (let t = 0; t <= 180; t += .1) {
      const p = cameraPose(t);
      const next = cameraPose(t + .01);
      expect(p.position.subtract(next.position).length()).toBeLessThan(3);
      expect(p.target.subtract(p.position).length()).toBeGreaterThan(.1);
      if (t < 159) expect(p.reveal).toBe(0);
    }
  });

  it("clears the exit aperture before ascending through the roof", () => {
    for (let t = 159; t < 162; t += .01) {
      const p = cameraPose(t).position;
      if (p.y > 23) expect(p.z).toBeLessThan(27);
    }
  });

  it("frames the complete title at widescreen and portrait aspects, then holds", () => {
    for (const aspect of [16 / 9, 21 / 9, 4 / 3, 9 / 16]) {
      const pose = cameraPose(180, aspect);
      const distance = pose.position.subtract(pose.target).length();
      const visibleWidth = 2 * Math.tan(pose.fov / 2) * distance * aspect;
      expect(visibleWidth).toBeGreaterThan(TITLE_WIDTH * 1.08);
    }
    expect(cameraPose(173)).toEqual(cameraPose(180));
  });

  it("seeking yields exactly the same pose every time", () => {
    const before = cameraPose(108);
    cameraPose(179);
    cameraPose(7);
    expect(cameraPose(108)).toEqual(before);
  });

  it("fits every actual letter corner inside the image by 2:53, including narrow windows", () => {
    for (const aspect of [16 / 9, 21 / 9, 4 / 3, 9 / 16]) {
      for (const time of [173, 177, 180]) {
        const pose = cameraPose(time, aspect);
        const view = Matrix.LookAtLH(pose.position, pose.target, Vector3.Up());
        const projection = Matrix.PerspectiveFovLH(pose.fov, aspect, .15, 12000);
        const transform = view.multiply(projection);
        for (const cell of createTitleCells()) {
          for (const dx of [-CELL / 2, CELL / 2]) {
            for (const dz of [-CELL / 2, CELL / 2]) {
              for (const y of [-2.8, HEIGHT + 2]) {
                const screen = Vector3.TransformCoordinates(new Vector3(cell.x + dx, y, cell.z + dz), transform);
                expect(Math.abs(screen.x), `horizontal framing at ${time}s / ${aspect}`).toBeLessThan(.95);
                expect(Math.abs(screen.y), `vertical framing at ${time}s / ${aspect}`).toBeLessThan(.95);
                expect(screen.z).toBeGreaterThan(0);
                expect(screen.z).toBeLessThan(1);
              }
            }
          }
        }
      }
    }
  });

  it("keeps camera turns below 45 degrees per second inside the maze", () => {
    let worst = { time: 0, speed: 0 };
    for (let time = 0; time < 159; time += .05) {
      const pose = cameraPose(time);
      const next = cameraPose(time + .05);
      const forward = pose.target.subtract(pose.position).normalize();
      const nextForward = next.target.subtract(next.position).normalize();
      const angle = Math.acos(Math.min(1, Math.max(-1, Vector3.Dot(forward, nextForward))));
      const speed = angle / .05 * 180 / Math.PI;
      if (speed > worst.speed) worst = { time, speed };
    }
    expect(worst.speed, `angular velocity at ${worst.time.toFixed(2)}s`).toBeLessThan(45);
  });

  it("frames every complete speaker-name panel for at least four seconds at projector aspect", () => {
    for (const speaker of SPEAKERS) {
      const { position: anchor, yaw } = routeAnchor(speaker.gateTime, speaker.lateralOffset);
      const world = Matrix.RotationY(yaw).multiply(Matrix.Translation(anchor.x, 0, anchor.z));
      let readable = 0;
      let best = 0;
      for (let time = speaker.startTime + 1; time < speaker.gateTime - 1; time += .25) {
        const pose = cameraPose(time);
        const transform = world.multiply(Matrix.LookAtLH(pose.position, pose.target, Vector3.Up()))
          .multiply(Matrix.PerspectiveFovLH(pose.fov, 16 / 9, .15, 12000));
        const halfWidth = ((speaker.gateWidth ?? 24) - 1) / 2;
        const corners = [-halfWidth, halfWidth].flatMap((x) => [-2.2, 2.2].map((dy) =>
          Vector3.TransformCoordinates(new Vector3(x, Math.min(25, anchor.y + 6.5) + dy, -.12), transform)));
        const inside = corners.every((p) => Math.abs(p.x) < .98 && Math.abs(p.y) < .98 && p.z > 0 && p.z < 1);
        const height = Math.max(...corners.map((p) => p.y)) - Math.min(...corners.map((p) => p.y));
        readable = inside && height > .07 ? readable + .25 : 0;
        best = Math.max(best, readable);
      }
      expect(best, speaker.name).toBeGreaterThanOrEqual(4);
    }
  });
});
