#!/usr/bin/env python3
"""
Tier-B depth-map generator for the panorama walkthrough.

Produces one grayscale depth map per panorama into public/panoramas/depth/,
which the viewer's displacement shader turns into true per-pixel parallax
(see the "Depth / parallax" block in app/components/PanoramaViewer.js).

This is the ONE step the app can't do at runtime — it needs an AI monocular
depth model. It's a one-time offline pass; re-run only when source art changes.

Convention the shader expects:
  - grayscale JPEG, same name as the panorama (e.g. "Scene 56.jpg")
  - brighter = NEARER, darker = farther (0..1 after normalization)
  If your output looks inside-out (near things bulge away), flip with --invert.

Setup (once):
  pip install torch transformers pillow numpy

Usage (from the project root, platinum-township/):
  python scripts/depth_infer.py                 # all panoramas, skip existing
  python scripts/depth_infer.py --force         # regenerate everything
  python scripts/depth_infer.py "Scene 56.jpg"  # just one
  python scripts/depth_infer.py --invert        # flip near/far if it looks wrong

After generating, set DEPTH_ENABLED = true in app/components/PanoramaViewer.js.

NOTE: Depth-Anything is a perspective model run on an equirectangular image, so
seams at the poles/edges are approximate. It's more than enough for a convincing
"walk into the space" parallax; it is not survey-grade geometry. A 360-aware
model (e.g. 360MonoDepth) would be sharper if you ever want to upgrade — the
shader contract (grayscale, near=bright) stays the same.
"""

import os
import sys
import glob

import numpy as np
from PIL import Image

# Keep the depth map small — it's coarse data, not detail. 2048×1024 is plenty
# for smooth displacement and stays a tiny ~100–200 KB JPEG per scene.
OUT_W, OUT_H = 2048, 1024
SRC_DIR = "public/panoramas"
OUT_DIR = "public/panoramas/depth"


def main():
    args = [a for a in sys.argv[1:]]
    force = "--force" in args
    invert = "--invert" in args
    explicit = [a for a in args if not a.startswith("--")]

    if explicit:
        paths = [os.path.join(SRC_DIR, name) for name in explicit]
    else:
        paths = sorted(glob.glob(os.path.join(SRC_DIR, "*.jpg")))

    if not paths:
        print(f"No panoramas found in {SRC_DIR}/. Run from the project root.")
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)

    # Imported lazily so the script can print the helpful message above before
    # the (heavy) model libraries are required.
    from transformers import pipeline

    print("Loading Depth-Anything-V2-Small (first run downloads weights)...")
    pipe = pipeline(
        "depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf"
    )

    for path in paths:
        name = os.path.splitext(os.path.basename(path))[0]
        out_path = os.path.join(OUT_DIR, f"{name}.jpg")
        if os.path.exists(out_path) and not force:
            print(f"skip  {name} (exists — use --force to redo)")
            continue

        img = Image.open(path).convert("RGB")
        depth = pipe(img)["depth"]
        d = np.asarray(depth, dtype=np.float32)

        # Normalize to 0..1. The model emits larger = nearer; keep that so the
        # shader reads bright = near. --invert flips it if your model differs.
        d = (d - d.min()) / (d.max() - d.min() + 1e-6)
        if invert:
            d = 1.0 - d

        out = Image.fromarray((d * 255.0).astype("uint8")).resize((OUT_W, OUT_H))
        out.save(out_path, quality=85)
        print(f"depth {name} -> {out_path}")

    print("\nDone. Set DEPTH_ENABLED = true in app/components/PanoramaViewer.js to use them.")


if __name__ == "__main__":
    main()
