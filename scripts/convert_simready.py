"""Convert verified source packages with an isolated, explicitly selectable Blender."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess

from download_simready import ROOT, SOURCE, SPEC, digest

OUTPUT = ROOT / "public/assets/simready"
WORK = ROOT / "assets/simready/work"
BLENDER_SCRIPT = ROOT / "scripts/blender_usd_to_glb.py"


def glb_stats(path: Path) -> dict:
    with path.open("rb") as stream:
        magic, version, length = struct.unpack("<4sII", stream.read(12))
        if magic != b"glTF" or version != 2 or length != path.stat().st_size:
            raise ValueError(f"Invalid GLB header: {path}")
        size, kind = struct.unpack("<II", stream.read(8))
        if kind != 0x4E4F534A:
            raise ValueError("The GLB must start with a JSON chunk.")
        model = json.loads(stream.read(size))
    if any("uri" in image for image in model.get("images", [])):
        raise ValueError("Runtime GLB must embed all textures.")
    primitives = [primitive for mesh in model.get("meshes", []) for primitive in mesh["primitives"]]
    if not primitives or any("NORMAL" not in primitive["attributes"] for primitive in primitives):
        raise ValueError("Missing geometry or vertex normals.")
    accessors = model["accessors"]
    return {
        "bytes": path.stat().st_size, "meshes": len(model["meshes"]),
        "materials": len(model.get("materials", [])), "textures": len(model.get("textures", [])),
        "vertices": sum(accessors[p["attributes"]["POSITION"]]["count"] for p in primitives),
        "triangles": sum(accessors[p["indices"]]["count"] // 3 if "indices" in p else
                         accessors[p["attributes"]["POSITION"]]["count"] // 3 for p in primitives),
        "extensions": model.get("extensionsUsed", []),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--blender", default=os.environ.get("BLENDER_PATH") or shutil.which("blender"))
    parser.add_argument("--asset", action="append")
    parser.add_argument("--texture-size", type=int, help="Override the per-asset recipe (default 1024).")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if not args.blender:
        default_mac = Path("/Applications/Blender.app/Contents/MacOS/Blender")
        if default_mac.is_file():
            args.blender = str(default_mac)
        else:
            parser.error("Blender is required. Install Blender 4.5 LTS, pass --blender /path/to/blender, or set BLENDER_PATH.")
    source_manifest = json.loads((SOURCE / "manifest.json").read_text())
    recipes = {asset["id"]: asset for asset in json.loads(SPEC.read_text())["assets"]}
    assets = [asset for asset in source_manifest["assets"] if not args.asset or asset["id"] in args.asset]
    if args.asset and set(args.asset) - {asset["id"] for asset in assets}:
        parser.error("Unknown or not-yet-downloaded asset.")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    previous = json.loads((OUTPUT / "manifest.json").read_text()) if (OUTPUT / "manifest.json").exists() else {"assets": []}
    records = {asset["id"]: asset for asset in previous["assets"]}
    blender_version = subprocess.check_output([args.blender, "--version"], text=True).splitlines()[0]
    for asset in assets:
        identifier = asset["id"]
        texture_size = args.texture_size or recipes[identifier].get("textureSize", 1024)
        signature = hashlib.sha256(json.dumps({
            "package": asset["package"]["package_hash"], "script": digest(BLENDER_SCRIPT),
            "textureSize": texture_size, "blender": blender_version,
        }, sort_keys=True).encode()).hexdigest()
        output = OUTPUT / f"{identifier}.glb"
        if not args.force and output.exists() and records.get(identifier, {}).get("signature") == signature:
            if digest(output) != records[identifier]["sha256"]:
                raise RuntimeError(f"Cached GLB checksum mismatch: {identifier}")
            print("CACHED", identifier, flush=True)
            continue
        temporary = WORK / f"{identifier}.glb"
        report_path = WORK / f"{identifier}.json"
        log = WORK / f"{identifier}.log"
        print("CONVERTING", identifier, flush=True)
        with log.open("w") as stream:
            result = subprocess.run([args.blender, "--background", "--factory-startup", "--python-exit-code", "1",
                "--python", str(BLENDER_SCRIPT), "--", "--input", str(SOURCE / asset["entry"]),
                "--output", str(temporary), "--report", str(report_path), "--asset-id", identifier,
                "--source-url", asset["sourceUrl"], "--license", asset["license"],
                "--texture-size", str(texture_size)], stdout=stream, stderr=subprocess.STDOUT)
        if result.returncode:
            raise RuntimeError(f"{identifier}: Blender exited {result.returncode}. Inspect {log}\n{log.read_text()[-6000:]}")
        stats = glb_stats(temporary)
        if stats["bytes"] >= 50_000_000:
            raise RuntimeError(f"{identifier}: GLB exceeds 50 MB; optimize before publishing.")
        report = json.loads(report_path.read_text())
        report["warnings"] = sorted(set(report["warnings"] + [
            line.split("WARNING:", 1)[-1].strip() for line in log.read_text().splitlines()
            if "WARNING:" in line or "Warning:" in line
        ]))
        temporary.replace(output)
        thumbnail = next((SOURCE / asset["source"] / "simready_usd/.thumbs/256x256").glob("*.usd.png"), None)
        if thumbnail:
            shutil.copy2(thumbnail, OUTPUT / f"{identifier}.png")
        license_file = SOURCE / asset["source"] / ".metadata/LICENSE.txt"
        if not license_file.is_file():
            raise RuntimeError(f"{identifier}: missing original license text.")
        shutil.copy2(license_file, OUTPUT / f"{identifier}.LICENSE.txt")
        records[identifier] = {
            **report, **stats, "source": asset["source"], "revision": asset["revision"],
            "license": asset["license"], "sourceUrl": asset["sourceUrl"],
            "url": f"./assets/simready/{identifier}.glb", "sha256": digest(output), "signature": signature,
            "sourceBytes": sum(file["bytes"] for file in asset["files"]),
            "sourceFiles": len(asset["files"]), "status": "converted-reimported",
        }
        (OUTPUT / "manifest.json").write_text(json.dumps({
            "revision": source_manifest["revision"], "assets": list(records.values()),
        }, indent=2) + "\n")
        print("CONVERTED", identifier, stats, flush=True)
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)
    attribution = ["# NVIDIA SimReady attribution", "",
        "Publisher: NVIDIA. Each package's declared license is recorded independently.",
        "Models were converted from OpenUSD to GLB, deduplicated and texture-resized; geometry and UVs are preserved.",
        f"Dataset revision: `{source_manifest['revision']}`.", "",
        "| Asset | Original model / source | License |", "| --- | --- | --- |"]
    conversion = ["# SimReady conversion report", "", f"Converter: {blender_version}.", "",
        "| Asset | Source MB | GLB MB | Meshes | Triangles | Materials | Textures | Status |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |"]
    notes = []
    for asset in records.values():
        attribution.append(f"| `{asset['id']}` | [{asset['source']}]({asset['sourceUrl']}) | {asset['license']} |")
        conversion.append(f"| {asset['id']} | {asset['sourceBytes']/1e6:.2f} | {asset['bytes']/1e6:.2f} | "
                          f"{asset['meshes']} | {asset['triangles']} | {asset['materials']} | {asset['textures']} | {asset['status']} |")
        if asset["warnings"]:
            notes.extend(["", f"**{asset['id']}:** " + " ".join(asset["warnings"]), ""])
        if asset.get("portalClearance"):
            notes.append(f"Donut verified clear-hole radius at the 18-unit runtime size: {asset['portalClearance']['radiusAt18Units']:.3f} world units.")
    conversion.extend(["", "## Conversion notes", *notes, "",
        "Official Khronos validation is recorded in `public/assets/simready/validation.json`.",
        "Missing explicit tangents are intentional; Babylon uses derivative-based normal mapping. No normal textures are removed."])
    (docs / "simready-attribution.md").write_text("\n".join(attribution) + "\n")
    (docs / "simready-conversion-report.md").write_text("\n".join(conversion) + "\n")


if __name__ == "__main__":
    main()
