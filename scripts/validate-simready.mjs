import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { validateBytes } from "gltf-validator";

const root = new URL("../public/assets/simready/", import.meta.url);
const spec = JSON.parse(await readFile(new URL("../assets/simready/assets.json", import.meta.url)));
const manifest = JSON.parse(await readFile(new URL("manifest.json", root)));
assert.equal(manifest.revision, spec.revision);
assert.equal(manifest.assets.length, spec.assets.length, "All nine requested assets must be present.");
const reports = [];
let failures = 0;
for (const asset of manifest.assets) {
  assert.ok(spec.assets.some((expected) => expected.id === asset.id && expected.source === asset.source));
  assert.ok(["CC-BY-4.0", "CC0-1.0"].includes(asset.license));
  const bytes = new Uint8Array(await readFile(new URL(`${asset.id}.glb`, root)));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
  const report = await validateBytes(bytes, { uri: `${asset.id}.glb`, maxIssues: 1000 });
  reports.push({ id: asset.id, ...report });
  failures += report.issues.numErrors;
  console.log(`${asset.id}: ${report.issues.numErrors} errors, ${report.issues.numWarnings} warnings, ${(bytes.length / 1e6).toFixed(2)} MB`);
  for (const message of report.issues.messages.filter((message) => message.severity <= 1).slice(0, 8)) {
    console.log(`  ${message.code}: ${message.message} ${message.pointer ?? ""}`);
  }
}
await writeFile(new URL("validation.json", root), `${JSON.stringify({ revision: manifest.revision, reports }, null, 2)}\n`);
assert.equal(failures, 0, "glTF validation failed. See public/assets/simready/validation.json.");
