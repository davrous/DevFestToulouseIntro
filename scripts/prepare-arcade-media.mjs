#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// No network is used at runtime. Run once online, then use --offline to rebuild
// from the checked, hash-addressed source cache; --force re-encodes all clips.
const flags = new Set(process.argv.slice(2));
if ([...flags].some((flag) => !["--offline", "--force", "--help"].includes(flag))) {
  console.error("Usage: node scripts/prepare-arcade-media.mjs [--offline] [--force]");
  process.exit(1);
}
if (flags.has("--help")) {
  console.log("Usage: node scripts/prepare-arcade-media.mjs [--offline] [--force]");
  console.log("FFMPEG_PATH / FFPROBE_PATH override the Homebrew executables.");
  console.log("Online runs revalidate source HTTP validators / SHA-256; offline runs require cached GIFs.");
  process.exit(0);
}

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceDir = join(root, "assets/arcade/source");
const outputDir = join(root, "public/assets/arcade");
const ffmpeg = process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";
const ffprobe = process.env.FFPROBE_PATH || "/opt/homebrew/bin/ffprobe";
const execute = promisify(execFile);
const staged = new Set();
const recipe = {
  version: 1,
  codec: "libx264",
  profile: "baseline",
  level: "3.0",
  pixelFormat: "yuv420p",
  fps: 20,
  maxDimension: 512,
  upscale: false,
  scaleFilter: "neighbor",
  crf: 20,
  preset: "medium",
  threads: 1,
  audio: false,
  poster: "middle decoded video frame",
};
// 140 retains the filmed ball/paddles; higher thresholds erase their dim pixels.
const pongConversion = {
  version: 2,
  monochrome: true,
  lumaThreshold: 140,
  filters: ["format=gray", "lut=y='if(gte(val,140),255,0)'"],
};
const media = [
  {
    id: "pong",
    originalUrl: "https://upload.wikimedia.org/wikipedia/commons/6/62/Pong_Game_Test2.gif",
    sourcePage: "https://commons.wikimedia.org/wiki/File:Pong_Game_Test2.gif",
    conversion: {
      ...pongConversion,
      fingerprint: createHash("sha256").update(JSON.stringify(pongConversion)).digest("hex"),
    },
    license: {
      id: "CC-BY-3.0",
      url: "https://creativecommons.org/licenses/by/3.0/",
      attribution: "pong74ls; cropped by WikiJunkie; via Wikimedia Commons",
      rightsHolder: "pong74ls / WikiJunkie (GIF); Atari (underlying Pong game)",
      reuseStatus: "CC BY 3.0 for the supplied GIF; underlying game rights are separate",
      modifications: "Grayscale with full-range luma threshold 140/255 to isolate white gameplay on black and suppress colored CRT reflections; original filmed perspective retained; nearest-neighbor fit within 512 px, 20 fps H.264 conversion, PNG poster extraction",
    },
  },
  {
    id: "donkey-kong",
    originalUrl: "https://media1.tenor.com/m/pJL8t9ToDywAAAAd/donkey-kong-arcade.gif",
    sourcePage: "https://tenor.com/view/donkey-kong-arcade-game-shigeru-miyamoto-king-kong-gif-11858818635301130028",
    license: {
      id: null,
      url: null,
      attribution: "Donkey Kong arcade gameplay; user-supplied Tenor link",
      rightsHolder: "Nintendo (game and characters)",
      reuseStatus: "No explicit reuse grant identified. Supplied links are not a license; rights clearance is required before public redistribution.",
      modifications: "Nearest-neighbor fit within 512 px, 20 fps H.264 conversion, PNG poster extraction",
    },
  },
  {
    id: "super-mario",
    originalUrl: "https://media1.tenor.com/m/q96J5OBXy0AAAAAd/super-mario-bros-nes.gif",
    sourcePage: "https://tenor.com/view/super-mario-bros-nes-nintendo-game-platformer-2d-platformer-gif-12384487641424841536",
    license: {
      id: null,
      url: null,
      attribution: "Super Mario Bros. NES gameplay; user-supplied Tenor link",
      rightsHolder: "Nintendo (game and characters)",
      reuseStatus: "No explicit reuse grant identified. Supplied links are not a license; rights clearance is required before public redistribution.",
      modifications: "Nearest-neighbor fit within 512 px, 20 fps H.264 conversion, PNG poster extraction",
    },
  },
];

async function run(binary, args) {
  try {
    return await execute(binary, args, { timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`${binary}: ${error.stderr || error.message}`, { cause: error });
  }
}

function partPath(path) {
  const pathWithSuffix = `${path}.${process.pid}.part`;
  staged.add(pathWithSuffix);
  return pathWithSuffix;
}

async function atomicJson(path, data) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  if (await readFile(path, "utf8").catch(() => null) === serialized) return;
  const part = partPath(path);
  await writeFile(part, serialized);
  await rename(part, path);
  staged.delete(part);
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function fingerprint(path) {
  const data = await readFile(path);
  return { sha256: createHash("sha256").update(data).digest("hex"), bytes: data.length };
}

async function probe(path, gif = false) {
  const { stdout } = await run(ffprobe, [
    "-v", "error", ...(gif ? ["-ignore_loop", "1"] : []),
    "-count_frames", "-show_streams", "-show_format", "-of", "json", path,
  ]);
  const result = JSON.parse(stdout);
  const video = result.streams.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error(`${path}: no video stream`);
  const [numerator, denominator] = (video.avg_frame_rate || "0/1").split("/").map(Number);
  return {
    width: video.width,
    height: video.height,
    frames: Number(video.nb_read_frames || video.nb_frames),
    durationSeconds: Number(video.duration || result.format.duration || 0),
    codec: video.codec_name,
    pixelFormat: video.pix_fmt,
    fps: denominator ? numerator / denominator : 0,
    profile: video.profile || null,
    audioStreams: result.streams.filter((stream) => stream.codec_type === "audio").length,
  };
}

async function validateSource(path) {
  const data = await readFile(path);
  if (!["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii"))) {
    throw new Error(`${path}: expected GIF87a / GIF89a signature (not an HTML error page)`);
  }
  const info = await probe(path, true);
  if (info.codec !== "gif" || !(info.frames > 1) || !(info.durationSeconds > 0)) {
    throw new Error(`${path}: expected a multi-frame animated GIF with positive duration`);
  }
  await run(ffmpeg, [
    "-hide_banner", "-nostdin", "-v", "error", "-xerror", "-err_detect", "explode",
    "-ignore_loop", "1", "-i", path, "-map", "0:v:0", "-an", "-f", "null", "-",
  ]);
  return {
    width: info.width, height: info.height, frames: info.frames, durationSeconds: info.durationSeconds,
  };
}

async function loadSource(item) {
  const path = join(sourceDir, `${item.id}.gif`);
  const statePath = join(sourceDir, `${item.id}.source.json`);
  const state = await readJson(statePath);
  const localHash = await fingerprint(path).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  const cached = state?.originalUrl === item.originalUrl && localHash?.sha256 === state.sha256;
  if (flags.has("--offline")) {
    if (!cached) throw new Error(`${item.id}: missing or corrupt verified cache; rerun without --offline`);
    console.log(`${item.id}: using verified offline source`);
    return { path, ...localHash, ...await validateSource(path) };
  }

  const headers = { "User-Agent": "DevFestToulouse-local-arcade-media-preparation/1.0" };
  if (cached && state.etag) headers["If-None-Match"] = state.etag;
  if (cached && state.lastModified) headers["If-Modified-Since"] = state.lastModified;
  let response;
  try {
    response = await fetch(item.originalUrl, { headers, signal: AbortSignal.timeout(90_000) });
  } catch (error) {
    throw new Error(`${item.id}: download failed (${error.message}); --offline uses an existing verified cache`);
  }
  if (response.status === 304 && cached) {
    console.log(`${item.id}: source unchanged (HTTP 304)`);
    return { path, ...localHash, ...await validateSource(path) };
  }
  if (!response.ok) throw new Error(`${item.id}: HTTP ${response.status} for ${item.originalUrl}`);
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 128 * 1024 * 1024) {
      await response.body.cancel().catch(() => {});
      throw new Error(`${item.id}: source exceeds the 128 MiB safety limit`);
    }
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  const hash = createHash("sha256").update(data).digest("hex");
  let metadata;
  if (cached && localHash.sha256 === hash) {
    metadata = await validateSource(path);
    console.log(`${item.id}: source unchanged (SHA-256)`);
  } else {
    const part = partPath(path);
    await writeFile(part, data);
    metadata = await validateSource(part);
    await rename(part, path);
    staged.delete(part);
    console.log(`${item.id}: downloaded and validated ${bytes} bytes`);
  }
  await atomicJson(statePath, {
    schemaVersion: 1,
    originalUrl: item.originalUrl,
    finalUrl: response.url,
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    sha256: hash,
    bytes,
    ...metadata,
  });
  return { path, sha256: hash, bytes, ...metadata };
}

async function validateVideo(path, width, height, sourceDuration, conversion) {
  const info = await probe(path);
  if (info.codec !== "h264" || info.pixelFormat !== "yuv420p" || info.audioStreams !== 0 ||
      info.width !== width || info.height !== height || info.fps !== recipe.fps ||
      !(info.frames > 1) || Math.abs(info.durationSeconds - sourceDuration) > 2 / recipe.fps) {
    throw new Error(`${path}: encoded video does not match the required recipe: ${JSON.stringify(info)}`);
  }
  const filters = ["blackframe=amount=100:threshold=17"];
  if (conversion?.monochrome) {
    filters.push("signalstats", ...["UMIN", "UMAX", "VMIN", "VMAX"].map(
      (key) => `metadata=mode=print:key=lavfi.signalstats.${key}`,
    ));
  }
  const { stderr } = await run(ffmpeg, [
    "-hide_banner", "-nostdin", "-v", "info", "-xerror", "-err_detect", "explode",
    "-i", path, "-map", "0:v:0", "-an",
    "-vf", filters.join(","), "-f", "null", "-",
  ]);
  if (/\bpblack:100\b/.test(stderr)) throw new Error(`${path}: fully black decoded frame detected`);
  if (conversion?.monochrome) {
    const chroma = [...stderr.matchAll(/lavfi\.signalstats\.(?:UMIN|UMAX|VMIN|VMAX)=(\d+)/g)];
    if (chroma.length !== info.frames * 4 || chroma.some((match) => Number(match[1]) !== 128)) {
      throw new Error(`${path}: expected neutral chroma in every monochrome frame`);
    }
  }
  return info;
}

async function validatePoster(path, width, height) {
  const info = await probe(path);
  if (info.codec !== "png" || info.frames !== 1 || info.width !== width || info.height !== height) {
    throw new Error(`${path}: invalid PNG poster`);
  }
  await run(ffmpeg, [
    "-hide_banner", "-nostdin", "-v", "error", "-xerror", "-err_detect", "explode",
    "-i", path, "-f", "null", "-",
  ]);
}

async function prepare(item, source, previous, samePreparation) {
  const factor = Math.min(1, recipe.maxDimension / Math.max(source.width, source.height));
  const width = Math.max(2, 2 * Math.floor(source.width * factor / 2));
  const height = Math.max(2, 2 * Math.floor(source.height * factor / 2));
  const videoPath = join(outputDir, `${item.id}.mp4`);
  const posterPath = join(outputDir, `${item.id}-poster.png`);
  let reusable = !flags.has("--force") && samePreparation && previous?.source.sha256 === source.sha256 &&
    previous?.conversion?.fingerprint === item.conversion?.fingerprint;
  if (reusable) {
    const videoHash = await fingerprint(videoPath).catch(() => null);
    const posterHash = await fingerprint(posterPath).catch(() => null);
    reusable = videoHash?.sha256 === previous.video.sha256 && posterHash?.sha256 === previous.poster.sha256;
  }
  if (reusable) {
    await validateVideo(videoPath, width, height, source.durationSeconds, item.conversion);
    await validatePoster(posterPath, width, height);
    console.log(`${item.id}: reusing fully decoded outputs`);
    return { ...item, source: { file: relative(root, source.path), ...withoutPath(source) }, video: previous.video, poster: previous.poster };
  }

  const videoPart = partPath(videoPath);
  const posterPart = partPath(posterPath);
  await run(ffmpeg, [
    "-hide_banner", "-nostdin", "-v", "error", "-y", "-xerror", "-err_detect", "explode",
    "-ignore_loop", "1", "-i", source.path, "-map", "0:v:0", "-an", "-map_metadata", "-1",
    "-vf", [
      `fps=${recipe.fps}`, `scale=${width}:${height}:flags=neighbor`,
      ...(item.conversion?.filters ?? []), "setsar=1", "format=yuv420p",
    ].join(","),
    "-c:v", recipe.codec, "-profile:v", recipe.profile, "-level:v", recipe.level,
    "-preset", recipe.preset, "-crf", String(recipe.crf), "-threads", String(recipe.threads),
    "-g", String(recipe.fps * 2), "-fps_mode", "cfr", "-movflags", "+faststart",
    "-f", "mp4", videoPart,
  ]);
  const info = await validateVideo(videoPart, width, height, source.durationSeconds, item.conversion);
  const timestampSeconds = Math.floor(info.frames / 2) / recipe.fps;
  await run(ffmpeg, [
    "-hide_banner", "-nostdin", "-v", "error", "-y", "-xerror",
    "-i", videoPart, "-vf", `select=eq(n\\,${Math.floor(info.frames / 2)})`,
    "-frames:v", "1", "-map_metadata", "-1", "-threads", "1",
    "-c:v", "png", "-f", "image2", "-update", "1", posterPart,
  ]);
  await validatePoster(posterPart, width, height);
  const video = { url: `/assets/arcade/${item.id}.mp4`, ...await fingerprint(videoPart), ...info };
  const poster = {
    url: `/assets/arcade/${item.id}-poster.png`,
    ...await fingerprint(posterPart), width, height, timestampSeconds,
  };
  // Publish only after both staged files have been fully decoded successfully.
  await rename(videoPart, videoPath);
  staged.delete(videoPart);
  await rename(posterPart, posterPath);
  staged.delete(posterPart);
  console.log(`${item.id}: encoded ${width}x${height}, ${info.durationSeconds}s, ${video.bytes} bytes; poster ${poster.bytes} bytes`);
  return { ...item, source: { file: relative(root, source.path), ...withoutPath(source) }, video, poster };
}

function withoutPath({ path, ...source }) {
  return source;
}

try {
  await mkdir(sourceDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });
  const ffmpegVersion = (await run(ffmpeg, ["-version"])).stdout.split("\n")[0];
  const ffprobeVersion = (await run(ffprobe, ["-version"])).stdout.split("\n")[0];
  const preparation = { ...recipe, ffmpegVersion, ffprobeVersion };
  const manifestPath = join(outputDir, "manifest.json");
  const previous = await readJson(manifestPath);
  const samePreparation = JSON.stringify(previous?.preparation) === JSON.stringify(preparation);
  const results = [];
  for (const item of media) {
    const source = await loadSource(item);
    results.push(await prepare(item, source, previous?.media.find((entry) => entry.id === item.id), samePreparation));
  }
  await atomicJson(manifestPath, { schemaVersion: 1, preparation, media: results });
  console.log("Ready: public/assets/arcade/manifest.json (all GIFs, videos and posters fully decoded)");
} catch (error) {
  console.error(`Arcade preparation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await Promise.all([...staged].map((path) => rm(path, { force: true })));
}
