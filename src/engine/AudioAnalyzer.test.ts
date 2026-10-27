import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioAnalyzer, frequencyBand, TUNNEL_AUDIO_BANDS } from "./AudioAnalyzer";

afterEach(() => vi.unstubAllGlobals());

class TestAudioNode {
  connections: unknown[] = [];
  gain = {
    value: 1,
    cancelScheduledValues: vi.fn(),
    setTargetAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
  };
  connect(node: unknown) { this.connections.push(node); }
  disconnect() { this.connections = []; }
}

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

  describe("soundtrack output envelope", () => {
    it("fades only the media output after analysis, with no bypass or change to input gain", async () => {
      const gains: TestAudioNode[] = [], analyser = new TestAudioNode(), destination = new TestAudioNode(), source = new TestAudioNode();
      vi.stubGlobal("AudioContext", class extends EventTarget {
        state = "running";
        currentTime = 10;
        destination = destination;
        createGain() { const gain = new TestAudioNode(); gains.push(gain); return gain; }
        createAnalyser() { return analyser; }
        createMediaElementSource() { return source; }
      });
      vi.stubGlobal("document", { createElement: () => ({}) });
      const audio = new AudioAnalyzer(() => {}, 0);
      await audio.connectMediaElement(document.createElement("audio"));
      expect(source.connections).toEqual([gains[0]]);
      expect(gains[0].connections).toEqual([analyser]);
      expect(analyser.connections).toEqual([gains[1]]);
      expect(gains[1].connections).toEqual([destination]);
      audio.setOutputVolume(.25);
      expect(gains[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(.25, 10, .008);
      audio.setOutputVolume(.25);
      expect(gains[1].gain.setTargetAtTime).toHaveBeenCalledTimes(1);
      audio.setOutputVolume(1, true);
      expect(gains[1].gain.setValueAtTime).toHaveBeenLastCalledWith(1, 10);
      expect(gains[0].gain.value).toBe(1);
      expect(audio.gainDb).toBe(0);
      audio.disconnect();
      expect(analyser.connections).toEqual([]);
      expect(gains[1].connections).toEqual([]);
    });

    it("validates the gain before audio is initialized and remembers a pre-playback fade", () => {
      const audio = new AudioAnalyzer(() => {}, 0);
      audio.setOutputVolume(.5);
      expect(audio.outputVolume).toBe(.5);
      expect(() => audio.setOutputVolume(-.1)).toThrow();
      expect(() => audio.setOutputVolume(1.1)).toThrow();
      expect(() => audio.setOutputVolume(NaN)).toThrow();
    });
  });
});
