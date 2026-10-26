import { describe, expect, it } from "vitest";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { CINEMA } from "../content/showBeats";
import { TUNNEL_FLIGHT_LENGTH, TUNNEL_LENGTH, TUNNEL_POINTS, TUNNEL_RADIUS,
  tunnelFlightPose, tunnelPoint, tunnelTravelProgress } from "./TunnelFlight";

describe("physical labyrinth tunnel flight", () => {
  it("slows the flight and reduces vertical movement, angular speed and banking without changing the tunnel design", () => {
    expect(TUNNEL_LENGTH).toBeGreaterThan(950);
    expect(TUNNEL_LENGTH).toBeLessThan(1000);
    const verticalSpan = Math.max(...TUNNEL_POINTS.map((point) => point.y)) - Math.min(...TUNNEL_POINTS.map((point) => point.y));
    expect(verticalSpan).toBeGreaterThan(15);
    expect(verticalSpan).toBeLessThan(25);
    expect(TUNNEL_FLIGHT_LENGTH / (CINEMA.vortexEnd - CINEMA.lens)).toBeLessThan(70);
    for (let time = CINEMA.lens; time < CINEMA.vortexEnd; time += .025) {
      const pose = tunnelFlightPose(time), next = tunnelFlightPose(time + .001);
      const speed = Vector3.Distance(pose.position, next.position) / .001;
      expect(speed).toBeGreaterThan(55);
      expect(speed).toBeLessThan(80);
      expect(Vector3.Distance(pose.position, tunnelPoint(pose.distance))).toBeLessThan(TUNNEL_RADIUS - 2);
      const forward = pose.target.subtract(pose.position).normalize();
      const nextForward = next.target.subtract(next.position).normalize();
      const turn = Math.acos(Math.min(1, Math.max(-1, Vector3.Dot(forward, nextForward)))) / .001 * 180 / Math.PI;
      expect(turn).toBeLessThan(75);
      const right = Vector3.Cross(Vector3.Up(), forward).normalize();
      expect(Math.abs(Math.asin(Vector3.Dot(pose.up, right)))).toBeLessThan(.23);
      expect(Math.abs(Vector3.Dot(pose.up, forward))).toBeLessThan(.0001);
      expect([...pose.position.asArray(), ...pose.up.asArray()].every(Number.isFinite)).toBe(true);
    }
  });

  it("gently accelerates on measured Journey attacks without integrating wall-clock state or shifting the 94.2s exit", () => {
    const speed = (time: number) => (tunnelTravelProgress(time + .001) - tunnelTravelProgress(time)) / .001;
    expect(speed(86.235)).toBeGreaterThan(speed(84.9) * 1.12);
    expect(tunnelTravelProgress(CINEMA.lens)).toBe(0);
    expect(tunnelTravelProgress(94.199)).toBeLessThan(1);
    expect(tunnelTravelProgress(94.2)).toBe(1);
    expect(tunnelTravelProgress(180)).toBe(1);
    const progress = tunnelTravelProgress(87.123);
    tunnelTravelProgress(180); tunnelTravelProgress(0);
    expect(tunnelTravelProgress(87.123)).toBe(progress);
    expect(() => tunnelTravelProgress(NaN)).toThrow();
  });

  it("physically turns ninety degrees right before the iris, then reproduces poses on seek", () => {
    const initial = tunnelFlightPose(CINEMA.lens), final = tunnelFlightPose(CINEMA.vortexExit);
    const firstDirection = initial.target.subtract(initial.position).normalize();
    const lastDirection = final.target.subtract(final.position).normalize();
    expect(firstDirection.z).toBeGreaterThan(.99);
    expect(lastDirection.x).toBeGreaterThan(.99);
    expect(Math.abs(Vector3.Dot(firstDirection, lastDirection))).toBeLessThan(.03);
    const pose = tunnelFlightPose(87);
    tunnelFlightPose(180); tunnelFlightPose(0);
    expect(tunnelFlightPose(87)).toEqual(pose);
    expect(() => tunnelFlightPose(NaN)).toThrow();
  });
});
