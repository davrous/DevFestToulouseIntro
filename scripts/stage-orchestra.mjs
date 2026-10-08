import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const manifest = JSON.parse(await readFile(new URL("../src/strudel/orchestraSamples.json", import.meta.url), "utf8"));
const base = `https://raw.githubusercontent.com/${manifest.repository}/${manifest.revision}/`;
const destination = new URL("../public/assets/strudel/orchestra/", import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), "devfest-orchestra-"));
const ffmpeg = (args) => {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", ...args], { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr}`);
  return result.stderr;
};
async function download(path) {
  const url = base + path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sample download failed: ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

try {
  await mkdir(destination, { recursive: true });
  for (const sample of manifest.samples) {
    const source = join(temporary, sample.file);
    await writeFile(source, await download(sample.source));
    const analysis = ffmpeg(["-i", source, "-af", "atrim=duration=6,volumedetect", "-f", "null", "-"]);
    const peak = /max_volume: (-?[\d.]+) dB/.exec(analysis);
    if (!peak) throw new Error(`Could not measure ${sample.file}`);
    const gain = -3 - Number(peak[1]);
    ffmpeg(["-y", "-i", source, "-af", `atrim=duration=6,volume=${gain}dB,afade=t=out:st=5.5:d=0.5`,
      "-ar", "32000", "-ac", "1", "-c:a", "pcm_s16le", fileURLToPath(new URL(sample.file, destination))]);
    console.log(`${sample.sound} / ${sample.root} -> ${sample.file}`);
  }
  await writeFile(new URL("../public/licenses/VSCO-2-CE-CC0.txt", import.meta.url), await download("LICENSE"));
} finally {
  await rm(temporary, { recursive: true });
}
