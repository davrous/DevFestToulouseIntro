"""Download only the pinned NVIDIA packages, preserving all relative references."""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from time import sleep

from huggingface_hub import HfApi, hf_hub_download
from huggingface_hub.hf_api import RepoFile
from huggingface_hub.utils import HfHubHTTPError
from requests.exceptions import RequestException

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "assets/simready/assets.json"
SOURCE = ROOT / "assets/simready/source"
LOGGER = logging.getLogger("simready")


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest() if hasattr(hashlib, "file_digest") else _digest(stream)


def _digest(stream) -> str:
    checksum = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
        checksum.update(chunk)
    return checksum.hexdigest()


def download_file(repo: str, revision: str, filename: str) -> Path:
    for attempt in range(3):
        try:
            return Path(hf_hub_download(repo_id=repo, repo_type="dataset", revision=revision,
                                        filename=filename, local_dir=SOURCE))
        except (HfHubHTTPError, RequestException) as error:
            LOGGER.warning("Download attempt %s failed for %s: %s", attempt + 1, filename, error)
            if attempt == 2:
                raise
            sleep(2 ** attempt)
    raise RuntimeError(f"Download exhausted: {filename}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", action="append", help="Friendly asset ID; repeat to select several.")
    args = parser.parse_args()
    spec = json.loads(SPEC.read_text())
    selected = [asset for asset in spec["assets"] if not args.asset or asset["id"] in args.asset]
    if args.asset and set(args.asset) - {asset["id"] for asset in selected}:
        parser.error("Unknown asset ID.")
    api = HfApi()
    revision = api.repo_info(spec["repoId"], repo_type="dataset", revision=spec["revision"]).sha
    if revision != spec["revision"]:
        raise RuntimeError("The dataset revision must be an immutable, resolved commit hash.")
    records = []
    for asset in selected:
        folder = asset["source"]
        metadata = download_file(spec["repoId"], revision, f"{folder}/com.nvidia.simready.packaging.json")
        package = json.loads(metadata.read_text())
        license_id = package.get("license")
        if license_id not in {"CC-BY-4.0", "CC0-1.0"}:
            raise RuntimeError(f"{folder}: unreviewed license {license_id!r}; review before redistribution.")
        files = [entry for entry in api.list_repo_tree(spec["repoId"], repo_type="dataset",
                 revision=revision, path_in_repo=folder, recursive=True) if isinstance(entry, RepoFile)]
        LOGGER.info("%s: %s files, %.1f MB, %s", asset["id"], len(files),
                    sum(file.size for file in files) / 1e6, license_id)
        with ThreadPoolExecutor(max_workers=4) as pool:
            paths = list(pool.map(lambda file: download_file(spec["repoId"], revision, file.path), files))
        roots = json.loads((SOURCE / folder / ".metadata/com.nvidia.simready.root_usds.json").read_text())["entries"]
        if len(roots) != 1 or not (SOURCE / folder / roots[0]).is_file():
            raise RuntimeError(f"{folder}: expected exactly one existing USD entry point, got {roots}")
        records.append({**asset, "revision": revision, "license": license_id, "package": package,
                        "sourceUrl": f"https://huggingface.co/datasets/{spec['repoId']}/tree/{revision}/{folder}",
                        "entry": f"{folder}/{roots[0]}",
                        "files": [{"path": path.relative_to(SOURCE).as_posix(), "bytes": path.stat().st_size,
                                   "sha256": digest(path)} for path in paths]})
        LOGGER.info("%s: source package verified", asset["id"])
    manifest_path = SOURCE / "manifest.json"
    existing = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"revision": revision, "assets": []}
    if existing["revision"] != revision:
        raise RuntimeError("Source cache belongs to another revision; use a separate source directory.")
    combined = {asset["id"]: asset for asset in existing["assets"]}
    combined.update({asset["id"]: asset for asset in records})
    manifest_path.write_text(json.dumps({"revision": revision, "assets": list(combined.values())}, indent=2) + "\n")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    main()
