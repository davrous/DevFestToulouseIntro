import { smoothstep } from "../engine/Timeline";

export const SOUNDTRACK_FADE_SECONDS = 1.25;

export function soundtrackEndGain(remainingSeconds: number): number {
  if (Number.isNaN(remainingSeconds) || remainingSeconds === -Infinity) {
    throw new RangeError("Soundtrack remaining time must be finite or positive infinity while metadata loads.");
  }
  return smoothstep(remainingSeconds / SOUNDTRACK_FADE_SECONDS);
}

export interface Soundtrack {
  id: string;
  label: string;
  url: string;
}

export const DEFAULT_SOUNDTRACK_ID = "violas-journey";

export const SOUNDTRACKS: readonly Soundtrack[] = [
  {
    id: "violas-journey",
    label: "Viola's Journey - MP3 320 kbit/s",
    url: "./assets/music/violas-journey.mp3",
  },
  {
    id: "violas-journey-wav",
    label: "Viola's Journey - WAV original (lossless)",
    url: "./assets/music/violas-journey.wav",
  },
];

export function isJourneySoundtrack(id: string | null): boolean {
  return id === "violas-journey" || id === "violas-journey-wav";
}

export function fillSoundtrackSelector(select: HTMLSelectElement): void {
  select.replaceChildren(...SOUNDTRACKS.map((soundtrack) => {
    const option = document.createElement("option");
    option.value = soundtrack.id;
    option.textContent = soundtrack.label;
    return option;
  }));
  select.value = DEFAULT_SOUNDTRACK_ID;
}

export function getSoundtrack(id: string): Soundtrack {
  const soundtrack = SOUNDTRACKS.find((candidate) => candidate.id === id);
  if (!soundtrack) throw new Error(`Unknown soundtrack: ${id}`);
  return soundtrack;
}
