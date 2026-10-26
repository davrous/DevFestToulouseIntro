export type VisualTheme = "signal" | "neural" | "playground" | "overclock";
export type SpeakerWorld = "game" | "cinema" | "digital";

export interface SpeakerConfig {
  name: string;
  demoTitle: string;
  startTime: number;
  endTime: number;
  gateTime: number;
  visualTheme: VisualTheme;
  world: SpeakerWorld;
  lateralOffset?: number;
  gateWidth?: number;
}

export const SPEAKERS: readonly SpeakerConfig[] = [
  { name: "Anne-Flore Bernard", demoTitle: "Slop City", startTime: 17, endTime: 39, gateTime: 29, visualTheme: "signal", world: "game" },
  { name: "David Rousset", demoTitle: "Musical Agentic Blender", startTime: 66, endTime: 83, gateTime: 76, visualTheme: "neural", world: "cinema" },
  { name: "Eric Mittelette", demoTitle: "IA Barrée", startTime: 99, endTime: 116, gateTime: 107, visualTheme: "neural", world: "digital" },
  { name: "Mitsuru Furuta", demoTitle: "Qui veut gagner des tokens", startTime: 128, endTime: 146, gateTime: 136, visualTheme: "overclock", world: "digital", lateralOffset: 1.1, gateWidth: 22 },
];

export const THEME_COLORS: Record<VisualTheme, string> = {
  signal: "#8cffe0",
  neural: "#b7a0ff",
  playground: "#ffac92",
  overclock: "#ffe29e",
};

export function activeSpeaker(time: number): SpeakerConfig | undefined {
  return SPEAKERS.find((speaker) => time >= speaker.startTime && time < speaker.endTime);
}
