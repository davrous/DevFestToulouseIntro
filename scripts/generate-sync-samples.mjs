import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../public/assets/strudel/", import.meta.url);
mkdirSync(root, { recursive: true });
const rate = 44100;
let seed = 31000;
const noise = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2147483648 - 1; };
for (const name of ["bd", "sd", "hh"]) {
  const duration = name === "bd" ? .4 : name === "sd" ? .22 : .07;
  const count = Math.ceil(duration * rate);
  const wav = Buffer.alloc(44 + count * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(count * 2, 40);
  let phase = 0, previousNoise = 0;
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const random = noise();
    phase += 2 * Math.PI * (name === "bd" ? 48 + 130 * Math.exp(-t * 35) : 180) / rate;
    const attack = Math.min(1, t / .001);
    const value = name === "bd" ? Math.sin(phase) * Math.exp(-t * 14)
      : name === "sd" ? (.7 * random + .3 * Math.sin(phase)) * Math.exp(-t * 22)
      : (random - previousNoise) * .45 * Math.exp(-t * 65);
    previousNoise = random;
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value * attack * .8)) * 32767), 44 + i * 2);
  }
  writeFileSync(new URL(`${name}.wav`, root), wav);
}
console.log(`Generated three original engineering demo samples in ${fileURLToPath(root)}`);
