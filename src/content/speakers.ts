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
  { name: "Anne-Flore Bernard", demoTitle: "Musical Agentic Blender", startTime: 30, endTime: 55, gateTime: 43, visualTheme: "signal" },
  { name: "David Rousset", demoTitle: "Musical Agentic Blender", startTime: 60, endTime: 78, gateTime: 73, visualTheme: "neural" },
  { name: "Eric Mittelette", demoTitle: "IA Barrée", startTime: 90, endTime: 108, gateTime: 106, visualTheme: "playground" },
  { name: "Mitsuru Furuta", demoTitle: "Blague Japonaise", startTime: 120, endTime: 139, gateTime: 130, visualTheme: "overclock", lateralOffset: 2, gateWidth: 22 },
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
