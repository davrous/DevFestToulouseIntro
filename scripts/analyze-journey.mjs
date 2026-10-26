import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const input = fileURLToPath(new URL("../public/assets/music/violas-journey.mp3", import.meta.url));
const pcm = execFileSync("ffmpeg", ["-nostdin", "-v", "error", "-i", input,
  "-ac", "1", "-ar", "22050", "-f", "f32le", "-"], { maxBuffer: 32 * 1024 * 1024 });
const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const rate = 22050, size = 1024, hop = 220;
const real = new Float64Array(size), imaginary = new Float64Array(size);
const previous = new Float64Array(size / 2);
const frames = [];
for (let offset = 0; offset + size <= samples.length; offset += hop) {
  let square = 0;
  for (let i = 0; i < size; i++) {
    square += samples[offset + i] ** 2;
    real[i] = samples[offset + i] * (.5 - .5 * Math.cos(2 * Math.PI * i / (size - 1)));
    imaginary[i] = 0;
  }
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [real[i], real[j]] = [real[j], real[i]];
  }
  for (let length = 2; length <= size; length *= 2) {
    const angle = -2 * Math.PI / length;
    for (let start = 0; start < size; start += length) {
      for (let k = 0; k < length / 2; k++) {
        const a = start + k, b = a + length / 2;
        const cosine = Math.cos(angle * k), sine = Math.sin(angle * k);
        const r = real[b] * cosine - imaginary[b] * sine;
        const im = real[b] * sine + imaginary[b] * cosine;
        real[b] = real[a] - r; imaginary[b] = imaginary[a] - im;
        real[a] += r; imaginary[a] += im;
      }
    }
  }
  const flux = [0, 0, 0];
  for (let bin = 1; bin < size / 2; bin++) {
    const frequency = bin * rate / size;
    const band = frequency < 180 ? 0 : frequency < 2400 ? 1 : 2;
    const power = real[bin] ** 2 + imaginary[bin] ** 2;
    const level = Math.log1p(Math.sqrt(power) * 10);
    flux[band] += Math.max(0, level - previous[bin]);
    previous[bin] = level;
  }
  frames.push({ time: (offset + size / 2) / rate, rms: Math.sqrt(square / size), flux });
}
const quantile = (values, q) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)];
const peaks = [0, 1, 2].map(band => {
  const result = [];
  for (let i = 20; i < frames.length - 20; i++) {
    const value = frames[i].flux[band];
    if (value < frames[i - 1].flux[band] || value <= frames[i + 1].flux[band]) continue;
    const baseline = frames.slice(i - 20, i + 21).map(frame => frame.flux[band]);
    const strength = (value - quantile(baseline, .5)) / Math.max(.05, quantile(baseline, .8));
    if (strength < .75 || value < .5) continue;
    const peak = { time: +(frames[i].time - .012).toFixed(3), strength: +strength.toFixed(3), value };
    const last = result.at(-1);
    if (last && peak.time - last.time < .16) {
      if (value > last.value) result[result.length - 1] = peak;
    } else result.push(peak);
  }
  return result;
});
const tempo = (start, end, band) => {
  const subset = frames.filter(frame => frame.time >= start && frame.time < end);
  const envelope = subset.map(frame => frame.flux[band]);
  const mean = envelope.reduce((sum, value) => sum + value, 0) / envelope.length;
  const centered = envelope.map(value => Math.max(0, value - mean));
  const candidates = [];
  for (let lag = 30; lag < 100; lag++) {
    let sum = 0, power = 0;
    for (let i = lag; i < centered.length; i++) {
      sum += centered[i] * centered[i - lag]; power += centered[i] ** 2;
    }
    candidates.push({ bpm: +(60 * rate / (hop * lag)).toFixed(2), score: +(sum / power).toFixed(3) });
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, 4);
};
const sections = [[0, 30], [30, 50], [50, 80], [80, 100], [100, 130], [130, 160], [160, 177.6]];
for (const [start, end] of sections) {
  const selection = frames.filter(frame => frame.time >= start && frame.time < end);
  console.log(`${start}-${end}s: RMS ${quantile(selection.map(frame => frame.rms), .5).toFixed(3)}, bass tempo ${JSON.stringify(tempo(start, end, 0))}`);
}
const nearby = (band, time, threshold) =>
  peaks[band].some(peak => Math.abs(peak.time - time) < .055 && peak.strength >= threshold);
const pack = (events, gain) => events.map(peak =>
  [peak.time, +Math.min(.85, gain * Math.sqrt(peak.strength)).toFixed(3)]);
const beats = pack(peaks[0].filter(peak => peak.strength >= 1.4), .28);
const kicks = pack(peaks[0].filter(peak => peak.strength >= 1.3
  && nearby(2, peak.time, 1.2)), .4);
const snares = pack(peaks[2].filter(peak => peak.strength >= 1.4
  && nearby(1, peak.time, 1.1)), .3);
const map = {
  source: "violas-journey.mp3",
  sha256: createHash("sha256").update(readFileSync(input)).digest("hex"),
  duration: samples.length / rate,
  analysis: { sampleRate: rate, fftSize: size, hop, method: "Hann-windowed three-band positive log spectral flux; local-median peak picking; cross-band percussion confirmation" },
  beats, kicks, snares,
};
writeFileSync(new URL("../src/audio/violasJourney.json", import.meta.url), `${JSON.stringify(map)}\n`);
console.log(`Mapped ${beats.length} low-register accents, ${kicks.length} broadband bass attacks and ${snares.length} mid/high attacks.`);
