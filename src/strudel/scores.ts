import violaScore from "../../examples/devfest-viola.strudel?raw";
import legacyScore from "../../examples/devfest-keynote.strudel?raw";
import orchestra from "./orchestraSamples.json";

export const SCORES = [
  { id: "arcade", label: "Arcade symphonique", key: "D minor",
    description: "Chiptune, FM mallets, acoustic orchestra and a rhythmic trance build." },
  { id: "cinema", label: "Cinema suspendu", key: "G minor",
    description: "More piano, harp and strings; lyrical cinema passage and a spacious orchestral reveal." },
  { id: "trance", label: "Trance heroique", key: "D minor / D major finale",
    description: "Faster arpeggios, wide supersaws, acid bass and a brighter heroic final resolution." },
  { id: "legacy", label: "Previous keynote", key: "Bb minor",
    description: "The earlier score, preserved for comparison." },
] as const;
export type ScoreId = typeof SCORES[number]["id"];
export const DEFAULT_SCORE: ScoreId = "arcade";

export function getScore(id: string) {
  const score = SCORES.find((entry) => entry.id === id);
  if (!score) throw new RangeError(`Unknown performance score: ${id}`);
  return score;
}

export function scoreSource(id: string): string {
  const score = getScore(id);
  return score.id === "legacy" ? legacyScore : violaScore.replace("const VERSION = 'arcade'", `const VERSION = '${score.id}'`);
}

export function fillScoreSelector(selector: HTMLSelectElement): void {
  selector.replaceChildren(...SCORES.map((score) => {
    const option = document.createElement("option");
    option.value = score.id;
    option.textContent = `${score.label} / ${score.key}`;
    return option;
  }));
  selector.value = DEFAULT_SCORE;
}

export const orchestraSampleMap: Record<string, Record<string, string[]>> = {};
for (const sample of orchestra.samples) {
  (orchestraSampleMap[sample.sound] ??= {})[sample.root] = [`orchestra/${sample.file}`];
}
export const orchestraBuffers = orchestra.samples.map((sample) => ({ sound: sample.sound, file: `orchestra/${sample.file}` }));
