import { describe, expect, it } from "vitest";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { cameraPose, routeAnchor } from "../camera/CameraPath";
import { cellPosition } from "../content/title";
import { CASSOULET_SIGN, DEPLOY_ROCKET, ORBIT_LINK, T_SIGN_ANCHORS } from "./EasterEggs";
import { BUFFER_OVERFLOW } from "./DigitalOverflow";
import { CINEMA, rocketLift } from "../content/showBeats";
import { CABINET_COUNT } from "./ArcadeCathedral";
import { RUNNER_COUNT, SCENERY_COUNT } from "./PixelWorld";

function longestReadableInterval(start: number, end: number, world: Matrix, width: number, height: number, lateral = 0): number {
  let best = 0;
  let current = 0;
  for (let time = start; time < end; time += .25) {
    const pose = cameraPose(time);
    const transform = world.multiply(Matrix.LookAtLH(pose.position, pose.target, Vector3.Up()))
      .multiply(Matrix.PerspectiveFovLH(pose.fov, 16 / 9, .15, 12000));
    const corners = [-width / 2, width / 2].flatMap((x) => [-height / 2, height / 2].map((y) =>
      Vector3.TransformCoordinates(new Vector3(x + lateral, y, 0), transform)));
    const visible = corners.every((p) => Math.abs(p.x) < .95 && Math.abs(p.y) < .9 && p.z > 0 && p.z < 1);
    const imageHeight = Math.max(...corners.map((p) => p.y)) - Math.min(...corners.map((p) => p.y));
    current = visible && imageHeight > .08 ? current + .25 : 0;
    best = Math.max(best, current);
  }
  return best;
}

describe("readable arcade jokes at projector aspect", () => {
  it("frames the unlabelled clap for two seconds and shortens the cut without hitting its plane", () => {
    const anchor = routeAnchor(CINEMA.clapperAnchor);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, anchor.position.y, anchor.position.z));
    expect(CINEMA.clap - CINEMA.clapperStart).toBeLessThanOrEqual(3.5);
    expect(longestReadableInterval(CINEMA.clapperStart, CINEMA.clapperClose, world, 22, 23))
      .toBeGreaterThanOrEqual(2);
    expect(Vector3.Distance(cameraPose(49).position, cameraPose(CINEMA.start).position)).toBeGreaterThan(9);
    for (let time = CINEMA.clapperStart; time < CINEMA.clap; time += .1) {
      expect(Vector3.Distance(cameraPose(time).position, anchor.position)).toBeGreaterThan(15);
    }
  });

  it("frames the overflow before the cassoulet, and the rocket before the final right turn", () => {
    const buffer = BUFFER_OVERFLOW;
    const anchor = routeAnchor(buffer.anchor);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, buffer.height, anchor.position.z));
    expect(longestReadableInterval(buffer.start, buffer.signEnd, world, buffer.width, 4.4)).toBeGreaterThanOrEqual(3);
    expect(buffer.signEnd).toBeLessThan(CASSOULET_SIGN.start);
    const rocket = routeAnchor(DEPLOY_ROCKET.time, DEPLOY_ROCKET.lateral);
    const rocketWorld = Matrix.RotationY(DEPLOY_ROCKET.yaw)
      .multiply(Matrix.Translation(rocket.position.x, DEPLOY_ROCKET.height / 2, rocket.position.z));
    expect(longestReadableInterval(DEPLOY_ROCKET.lookStart, DEPLOY_ROCKET.launch, rocketWorld, DEPLOY_ROCKET.width, DEPLOY_ROCKET.height))
      .toBeGreaterThanOrEqual(2);
  });

  it("keeps the ascending nose and ceiling impact in view through the flash and shockwave", () => {
    const anchor = routeAnchor(DEPLOY_ROCKET.time, DEPLOY_ROCKET.lateral);
    for (let time = DEPLOY_ROCKET.launch; time < DEPLOY_ROCKET.impact + 1.2; time += .05) {
      const impact = new Vector3(anchor.position.x, DEPLOY_ROCKET.height + rocketLift(time) - .05, anchor.position.z);
      const pose = cameraPose(time);
      const transform = Matrix.LookAtLH(pose.position, pose.target, Vector3.Up())
        .multiply(Matrix.PerspectiveFovLH(pose.fov, 16 / 9, .15, 12000));
      const screen = Vector3.TransformCoordinates(impact, transform);
      expect(Math.abs(screen.x), `impact horizontal framing at ${time}`).toBeLessThan(.85);
      expect(Math.abs(screen.y), `impact vertical framing at ${time}`).toBeLessThan(.85);
      expect(screen.z).toBeGreaterThan(0);
      expect(screen.z).toBeLessThan(1);
    }
  });

  it("gives the frontal camera lens a readable approach before the optical transition", () => {
    const anchor = routeAnchor(CINEMA.lens);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, anchor.position.y, anchor.position.z));
    expect(longestReadableInterval(CINEMA.camera, CINEMA.lens, world, 13.6, 13.6))
      .toBeGreaterThanOrEqual(2);
  });
  it("keeps David's cinema screen readable before the projector transition", () => {
    const anchor = routeAnchor(CINEMA.davidGate);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, 17, anchor.position.z));
    expect(longestReadableInterval(CINEMA.davidStart, CINEMA.davidGate, world, 21, 9))
      .toBeGreaterThanOrEqual(4);
  });

  it("shows LEVEL COMPLETE before the clapperboard cut", () => {
    const anchor = routeAnchor(58);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, 14, anchor.position.z));
    expect(longestReadableInterval(46.3, 48.8, world, 18, 4)).toBeGreaterThanOrEqual(1.25);
  });
  it("halves the original cabinet and sprite clutter", () => {
    expect(CABINET_COUNT).toBeLessThanOrEqual(6);
    expect(RUNNER_COUNT).toBeLessThanOrEqual(12);
    expect(SCENERY_COUNT).toBeLessThanOrEqual(6);
  });

  it("finishes both HTTP stages before Anne-Flore's arrival", () => {
    const http = T_SIGN_ANCHORS.chocolatine;
    const httpAnchor = routeAnchor(http.time);
    const httpWorld = Matrix.RotationY(httpAnchor.yaw)
      .multiply(Matrix.Translation(httpAnchor.position.x, http.height, httpAnchor.position.z));
    expect(longestReadableInterval(5, 9.5, httpWorld, http.width, 4.5)).toBeGreaterThanOrEqual(2.5);
    expect(longestReadableInterval(9.5, 14, httpWorld, http.width, 4.5)).toBeGreaterThanOrEqual(2.5);
  });

  it("shows the cassoulet gag after Eric and before Mitsuru", () => {
    const npm = CASSOULET_SIGN;
    const anchor = routeAnchor(npm.time);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, npm.height, anchor.position.z));
    expect(longestReadableInterval(npm.start, npm.end, world, npm.width, 5, npm.lateral))
      .toBeGreaterThanOrEqual(4.5);
    expect(npm.start).toBeGreaterThanOrEqual(115);
    expect(npm.end).toBeLessThanOrEqual(126);
  });

  it("frames the Toulouse orbital label after Mitsuru", () => {
    const anchor = routeAnchor(ORBIT_LINK.time);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(
        anchor.position.x + Math.sin(anchor.yaw) * ORBIT_LINK.depth, ORBIT_LINK.height,
        anchor.position.z + Math.cos(anchor.yaw) * ORBIT_LINK.depth));
    expect(longestReadableInterval(ORBIT_LINK.start, 160, world, ORBIT_LINK.width, 4.2))
      .toBeGreaterThanOrEqual(3);
  });

  it("shows the rebase command before and while it unlocks the T door", () => {
    const door = cellPosition(1, 9);
    const rebase = Matrix.RotationY(Math.PI / 2)
      .multiply(Matrix.Translation(door.x + 13, 17, door.z));
    expect(longestReadableInterval(41.2, 45.7, rebase, 18, 6)).toBeGreaterThanOrEqual(2);
  });

  it("introduces the boss header before the transparent legacy wall arrives", () => {
    const anchor = routeAnchor(39);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, 21.5, anchor.position.z));
    expect(longestReadableInterval(33, 36.1, world, 19, 5)).toBeGreaterThanOrEqual(1.5);
  });
});
