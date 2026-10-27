import { DATA_ARCH_LIFT } from "./showBeats";
import { smoothstep } from "../engine/Timeline";

export function dataArchLift(time: number): number {
  if (!Number.isFinite(time)) throw new RangeError("Data arch time must be finite.");
  return DATA_ARCH_LIFT.lift * smoothstep((time - DATA_ARCH_LIFT.start) / (DATA_ARCH_LIFT.end - DATA_ARCH_LIFT.start));
}
