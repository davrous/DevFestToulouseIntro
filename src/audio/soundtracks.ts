export interface Soundtrack {
  id: string;
  label: string;
  url: string;
}

export const SOUNDTRACKS: readonly Soundtrack[] = [
  {
    id: "violas-journey",
    label: "Viola's Journey",
    url: "./assets/music/violas-journey.wav",
  },
  {
    id: "viola-trance",
    label: "Viola & Trance",
    url: "./assets/music/viola-trance.wav",
  },
];

export function fillSoundtrackSelector(select: HTMLSelectElement): void {
  select.replaceChildren(...SOUNDTRACKS.map((soundtrack) => {
    const option = document.createElement("option");
    option.value = soundtrack.id;
    option.textContent = soundtrack.label;
    return option;
  }));
}

export function getSoundtrack(id: string): Soundtrack {
  const soundtrack = SOUNDTRACKS.find((candidate) => candidate.id === id);
  if (!soundtrack) throw new Error(`Unknown soundtrack: ${id}`);
  return soundtrack;
}
