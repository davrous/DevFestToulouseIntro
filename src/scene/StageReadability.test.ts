import { describe, expect, it } from "vitest";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { cameraPose, routeAnchor } from "../camera/CameraPath";
import { CASSOULET_SIGN, DEPLOY_ROCKET, ORBIT_LINK, T_SIGN_ANCHORS } from "./EasterEggs";
import { BUFFER_OVERFLOW, bufferAnchor } from "./DigitalOverflow";
import { ASTRONAUT_FINALE, CASSOULET_WALL_POSTER, CINEMA, LEVEL_COMPLETE, rocketLift } from "../content/showBeats";
import { CABINET_COUNT } from "./ArcadeCathedral";
import { xorPanelPose } from "./XorCpuGate";
import { legacyXorSettings, legacyXorState } from "./LegacyXorSequence";
import { RUNNER_COUNT, SCENERY_COUNT } from "./PixelWorld";
import { POPCORN_SOURCES } from "./CinemaPopcorn";
import { CHOCOLATINE } from "../content/cues";
import { SPEAKERS } from "../content/speakers";

function longestReadableInterval(start: number, end: number, world: Matrix | ((time: number) => Matrix), width: number, height: number, lateral = 0): number {
  let best = 0;
  let current = 0;
  for (let time = start; time < end; time += .25) {
    const pose = cameraPose(time);
    const placement = typeof world === "function" ? world(time) : world;
    const transform = placement.multiply(Matrix.LookAtLH(pose.position, pose.target, Vector3.Up()))
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
  it("keeps the wall comic readable after Mitsuru's card and before rocket liftoff", () => {
    const poster = CASSOULET_WALL_POSTER;
    expect(poster.lookStart).toBeGreaterThan(SPEAKERS[3].gateTime);
    expect(poster.lookEnd).toBeLessThan(DEPLOY_ROCKET.launch);
    const world = Matrix.RotationY(poster.yaw).multiply(Matrix.Translation(poster.x, poster.y, poster.z));
    expect(longestReadableInterval(poster.lookStart, DEPLOY_ROCKET.launch, world, poster.width, poster.width * 9 / 16))
      .toBeGreaterThanOrEqual(4);
  });
  it("frames the unlabelled clap for two seconds and shortens the cut without hitting its plane", () => {
    const anchor = routeAnchor(CINEMA.clapperAnchor);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, anchor.position.y, anchor.position.z));
    expect(CINEMA.clap - CINEMA.clapperStart).toBeLessThanOrEqual(2.3);
    expect(CINEMA.clap - CINEMA.clapperClose).toBeLessThanOrEqual(.2);
    expect(CINEMA.start - CINEMA.clap).toBeLessThanOrEqual(.16);
    expect(longestReadableInterval(CINEMA.clapperStart, CINEMA.clapperClose, world, 22, 23))
      .toBeGreaterThanOrEqual(2);
    expect(Vector3.Distance(cameraPose(49).position, cameraPose(CINEMA.start).position)).toBeGreaterThan(9);
    for (let time = CINEMA.clapperStart; time < CINEMA.clap; time += .1) {
      expect(Vector3.Distance(cameraPose(time).position, anchor.position)).toBeGreaterThan(15);
    }
  });

  it("frames the overflow before the cassoulet, and the rocket before the final right turn", () => {
    const buffer = BUFFER_OVERFLOW;
    const anchor = bufferAnchor();
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, buffer.height, anchor.position.z));
    expect(longestReadableInterval(buffer.spill + .16, buffer.signEnd, world, buffer.width, 4.4, 1.5)).toBeGreaterThanOrEqual(1.5);
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

  it("centers the lens throughout the sudden rush after the initial popcorn fall", () => {
    const anchor = routeAnchor(CINEMA.lensAnchor);
    expect(CINEMA.camera).toBe(80);
    expect(CINEMA.lens).toBeGreaterThan(CINEMA.popcorn + 2);
    for (let time = CINEMA.camera; time < CINEMA.lens - .05; time += .05) {
      const pose = cameraPose(time);
      const transform = Matrix.LookAtLH(pose.position, pose.target, Vector3.Up())
        .multiply(Matrix.PerspectiveFovLH(pose.fov, 16 / 9, .15, 12000));
      const center = Vector3.TransformCoordinates(anchor.position, transform);
      expect(Math.abs(center.x)).toBeLessThan(.3);
      expect(Math.abs(center.y)).toBeLessThan(.4);
      expect(center.z).toBeGreaterThan(-1);
    }
    expect(Vector3.Distance(cameraPose(CINEMA.lens).position, anchor.position)).toBeLessThan(.001);
  });
  it("keeps both raised buckets visible without steering up before their overhead spill", () => {
    for (const source of POPCORN_SOURCES) {
      const anchor = routeAnchor(source.time, source.lateral);
      const world = Matrix.RotationY(anchor.yaw)
        .multiply(Matrix.Translation(anchor.position.x, source.height, anchor.position.z));
      expect(longestReadableInterval(CINEMA.davidGate - 2, CINEMA.popcorn, world, source.size, source.size))
        .toBeGreaterThanOrEqual(1.5);
    }
  });
  it("keeps David's cinema screen readable before the projector transition", () => {
    const anchor = routeAnchor(CINEMA.davidGate);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, 17, anchor.position.z));
    expect(longestReadableInterval(CINEMA.davidStart, CINEMA.davidGate, world, 21, 9))
      .toBeGreaterThanOrEqual(4);
  });

  it("keeps LEVEL COMPLETE above the clapperboard and readable during its approach", () => {
    const anchor = routeAnchor(CINEMA.clapperAnchor);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, LEVEL_COMPLETE.height, anchor.position.z));
    expect(LEVEL_COMPLETE.height - 2).toBeGreaterThan(anchor.position.y + 11);
    expect(LEVEL_COMPLETE.end).toBe(CINEMA.clap);
    expect(longestReadableInterval(CINEMA.clapperStart, CINEMA.clapperClose,
      world, LEVEL_COMPLETE.width, 4)).toBeGreaterThanOrEqual(1.25);
  });
  it("halves the original cabinet and sprite clutter", () => {
    expect(CABINET_COUNT).toBeLessThanOrEqual(6);
    expect(RUNNER_COUNT).toBeLessThanOrEqual(12);
    expect(SCENERY_COUNT).toBeLessThanOrEqual(6);
  });

  it("frames the HTTP request from 27 seconds and the redirect from 28.5 seconds before the legacy boss", () => {
    const http = T_SIGN_ANCHORS.chocolatine;
    const httpAnchor = routeAnchor(http.time);
    const httpWorld = Matrix.RotationY(CHOCOLATINE.yaw)
      .multiply(Matrix.Translation(httpAnchor.position.x, http.height, httpAnchor.position.z));
    expect(CHOCOLATINE.start).toBe(27);
    expect(CHOCOLATINE.redirect).toBe(28.5);
    expect(longestReadableInterval(27, 27.25, httpWorld, http.width, 4.5)).toBe(.25);
    expect(longestReadableInterval(28.5, 28.75, httpWorld, http.width, 4.5)).toBe(.25);
    expect(longestReadableInterval(CHOCOLATINE.start, CHOCOLATINE.redirect, httpWorld, http.width, 4.5))
      .toBeGreaterThanOrEqual(1.5);
    expect(longestReadableInterval(CHOCOLATINE.redirect, CHOCOLATINE.end, httpWorld, http.width, 4.5))
      .toBeGreaterThanOrEqual(1.5);
  });

  it("shows the cassoulet gag after Eric and before Mitsuru", () => {
    const npm = CASSOULET_SIGN;
    const anchor = routeAnchor(npm.time);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x, npm.height, anchor.position.z));
    expect(longestReadableInterval(npm.start, npm.end, world, npm.width, 7, npm.lateral))
      .toBeGreaterThanOrEqual(4.5);
    expect(npm.start).toBeGreaterThanOrEqual(115);
    expect(npm.end).toBeLessThanOrEqual(126);
  });

  it("frames the full-size astronaut behind Orbital Link near the final exit", () => {
    const anchor = routeAnchor(ASTRONAUT_FINALE.anchor, ASTRONAUT_FINALE.lateral);
    const world = Matrix.RotationY(anchor.yaw).multiply(Matrix.Translation(
      anchor.position.x + Math.sin(anchor.yaw) * ASTRONAUT_FINALE.depth, ASTRONAUT_FINALE.height / 2,
      anchor.position.z + Math.cos(anchor.yaw) * ASTRONAUT_FINALE.depth));
    expect(longestReadableInterval(147, 159, world, 8, ASTRONAUT_FINALE.height))
      .toBeGreaterThanOrEqual(2);
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

  it("frames the actual XOR module and its granted label during activation", () => {
    const settings = legacyXorSettings();
    const world = (time: number) => {
      const { open } = legacyXorState(time, settings), pose = xorPanelPose(1, open, settings);
      return Matrix.Translation(0, -2.15, -.31)
        .multiply(Matrix.Translation(-6.075, -7.1, -1.08 - Math.sin(Math.PI * open) * 3))
        .multiply(Matrix.Compose(Vector3.One(), pose.rotation, pose.position))
        .multiply(Matrix.RotationY(settings.gateYaw))
        .multiply(Matrix.Translation(settings.gateX, settings.gateY, settings.gateZ));
    };
    expect(longestReadableInterval(41.9, 44.5, world, 6, 1.15)).toBeGreaterThanOrEqual(1);
  });

  it("keeps BUILD FAILED printed on the completed opaque wall before impact", () => {
    const anchor = routeAnchor(40);
    const world = Matrix.RotationY(anchor.yaw)
      .multiply(Matrix.Translation(anchor.position.x - Math.sin(anchor.yaw) * 1.13, 12.15,
        anchor.position.z - Math.cos(anchor.yaw) * 1.13));
    expect(longestReadableInterval(36.85, 38.2, world, 17, 3.1)).toBeGreaterThanOrEqual(.75);
  });
});
