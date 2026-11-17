#!/usr/bin/env python3
"""Rebuild scroll animation frames from the editable 3D scene.

Requirements: running local Flask app, Node.js, Playwright Chromium, ffmpeg.
Usage: python scripts/build-showcase-sequence.py
Environment: GKM_URL, FRAMES, FRAME_WIDTH, FRAME_HEIGHT, FRAME_DIR, WEBP_QUALITY.
The generated images are deployment assets; the source 3D scene remains authoritative.
"""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "build" / "showcase-frames"
OUT = ROOT / "static" / "showcase-sequence"
COUNT = max(2, int(os.environ.get("FRAMES", "120")))
QUALITY = int(os.environ.get("WEBP_QUALITY", "88"))

def run(command):
    print("+", " ".join(map(str, command)), flush=True)
    subprocess.run(command, cwd=ROOT, check=True)

def main():
    if not shutil.which("node") or not shutil.which("ffmpeg"):
        sys.exit("Install Node.js and ffmpeg before rebuilding the showcase sequence.")
    if not 0 <= QUALITY <= 100:
        sys.exit("WEBP_QUALITY must be between 0 and 100.")
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env["FRAMES"] = str(COUNT)
    env["FRAME_DIR"] = str(RAW)
    print("Capturing the current 3D animation...", flush=True)
    subprocess.run(["node", "scripts/capture-showcase-frames.cjs"], cwd=ROOT, env=env, check=True)
    manifest = json.loads((RAW / "manifest.json").read_text())
    if manifest["frames"] != COUNT:
        sys.exit("Capture produced an unexpected frame count.")
    for i in range(COUNT):
        src = RAW / f"{i:04d}.png"
        if not src.exists():
            sys.exit(f"Missing captured frame: {src}")
        dest = OUT / f"{i:04d}.webp"
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
             "-frames:v", "1", "-c:v", "libwebp", "-quality", str(QUALITY), str(dest)])
    (OUT / "manifest.json").write_text(json.dumps({
        "version": 1, "frames": COUNT, "width": manifest["width"],
        "height": manifest["height"], "format": "webp",
        "pattern": "%04d.webp", "quality": QUALITY
    }, indent=2) + "\n")
    print(f"Built {COUNT} WebP frames in {OUT}. Review visual fidelity before deployment.")

if __name__ == "__main__":
    main()
