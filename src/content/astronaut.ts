import { ASTRONAUT_CORNER } from "./showBeats";
import { smoothstep } from "../engine/Timeline";

export function astronautRiseState(time: number): { progress: number; scale: number; centerY: number; archY: number } {
  if (!Number.isFinite(time)) throw new RangeError("Astronaut growth time must be finite.");
  const progress = smoothstep((time - ASTRONAUT_CORNER.riseStart) / (ASTRONAUT_CORNER.riseEnd - ASTRONAUT_CORNER.riseStart));
  const scale = 1 + (ASTRONAUT_CORNER.finalScale - 1) * progress;
  return { progress, scale, centerY: ASTRONAUT_CORNER.height * scale / 2, archY: ASTRONAUT_CORNER.gateLift * progress };
}
