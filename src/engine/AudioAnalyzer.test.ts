import { describe, expect, it } from "vitest";
import { frequencyBand, TUNNEL_AUDIO_BANDS } from "./AudioAnalyzer";

describe("Web Audio speaker-trail frequency mapping", () => {
  it("separates bass, viola fundamentals, upper mids and high percussion", () => {
    const rate = 48000, fft = 2048;
    for (const [index, frequency] of [90, 440, 1400, 8000].entries()) {
      const spectrum = new Uint8Array(fft / 2);
      spectrum[Math.round(frequency * fft / rate)] = 255;
      const levels = TUNNEL_AUDIO_BANDS.map(([low, high]) => frequencyBand(spectrum, rate, fft, low, high));
      expect(levels[index]).toBeGreaterThan(0);
      expect(levels.filter((_, band) => band !== index)).toEqual([0, 0, 0]);
    }
  });
});
