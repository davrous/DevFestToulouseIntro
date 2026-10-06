export type VisualTheme = "signal" | "neural" | "playground" | "overclock";

export interface SpeakerConfig {
  name: string;
  demoTitle: string;
  startTime: number;
  endTime: number;
  gateTime: number;
  visualTheme: VisualTheme;
  lateralOffset?: number;
  gateWidth?: number;
}

export const SPEAKERS: readonly SpeakerConfig[] = [
  { name: "Anne-Flore Bernard", demoTitle: "Musical Agentic Blender", startTime: 17, endTime: 39, gateTime: 29, visualTheme: "signal" },
  { name: "David Rousset", demoTitle: "Musical Agentic Blender", startTime: 80, endTime: 96, gateTime: 88, visualTheme: "neural" },
  { name: "Eric Mittelette", demoTitle: "IA Barrée", startTime: 96, endTime: 115, gateTime: 107, visualTheme: "playground" },
  { name: "Mitsuru Furuta", demoTitle: "Blague Japonaise", startTime: 128, endTime: 146, gateTime: 136, visualTheme: "overclock", lateralOffset: 1.1, gateWidth: 22 },
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
