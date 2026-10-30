#!/usr/bin/env python3
"""Generate Android notification (status bar) icons from brand foregrounds.

Android renders notification small icons as a monochrome alpha mask, so each
`status_bar_icon.png` is a white silhouette on a transparent background derived
from the brand's `android-icon-foreground.png`.

Usage:
    python scripts/generate-status-bar-icons.py
    python scripts/generate-status-bar-icons.py --brand naat-collection
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SIZE = 96
PADDING = 6
BRANDS_ROOT = Path(__file__).resolve().parent.parent / "brands"


def otsu_threshold(gray: np.ndarray) -> int:
    histogram, _ = np.histogram(gray, bins=256, range=(0, 256))
    total = gray.size
    sum_all = float(np.dot(np.arange(256), histogram))
    sum_background = 0.0
    weight_background = 0
    best_variance = 0.0
    threshold = 0

    for value in range(256):
        weight_background += int(histogram[value])
        if weight_background == 0:
            continue

        weight_foreground = total - weight_background
        if weight_foreground == 0:
            break

        sum_background += value * histogram[value]
        mean_background = sum_background / weight_background
        mean_foreground = (sum_all - sum_background) / weight_foreground
        variance = (
            weight_background
            * weight_foreground
            * (mean_background - mean_foreground) ** 2
        )
        if variance > best_variance:
            best_variance = variance
            threshold = value

    return threshold


def clean_mask(mask: np.ndarray) -> np.ndarray:
    """Remove noise and tiny detached specks from a silhouette mask."""
    iterations = max(1, round(min(mask.shape) * 0.002))
    mask = ndimage.binary_opening(mask, iterations=iterations)
    mask = ndimage.binary_closing(mask, iterations=iterations)

    labels, count = ndimage.label(mask)
    if count == 0:
        return mask

    sizes = ndimage.sum(mask, labels, range(1, count + 1))
    minimum = mask.size * 0.001
    keep = np.zeros_like(mask)
    for index, size in enumerate(sizes, start=1):
        if size >= minimum:
            keep |= labels == index
    return keep


def build_mask(image: Image.Image) -> np.ndarray:
    """Return a boolean mask of the artwork in `image`."""
    rgba = image.convert("RGBA")
    alpha = np.asarray(rgba)[..., 3]
    alpha_mask = alpha > 8
    coverage = float(alpha_mask.mean())

    bbox = Image.fromarray(alpha_mask).getbbox()
    if bbox is None:
        raise ValueError("image has no visible pixels")

    # A filled (rounded) rectangle is a background plate, not a silhouette.
    bbox_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
    fill_ratio = float(alpha_mask[bbox[1] : bbox[3], bbox[0] : bbox[2]].mean())

    if 0.02 < coverage < 0.95 and fill_ratio < 0.9:
        return clean_mask(alpha_mask)

    # Opaque artwork (photo/calligraphy on a solid plate): treat the bright
    # artwork as the foreground. `p85` keeps the silhouette readable at 96px
    # while Otsu handles low-contrast icons.
    cropped = rgba.crop(bbox)
    gray = np.asarray(cropped.convert("L"))
    threshold = max(otsu_threshold(gray), int(np.percentile(gray, 85)))
    mask = clean_mask(gray > threshold)

    if not mask.any():
        return clean_mask(alpha_mask)

    full = np.zeros(alpha.shape, dtype=bool)
    full[bbox[1] : bbox[3], bbox[0] : bbox[2]] = mask
    return full


def render_icon(mask: np.ndarray) -> Image.Image:
    bbox = Image.fromarray(mask).getbbox()
    if bbox is None:
        raise ValueError("silhouette mask is empty")

    art = Image.fromarray((mask * 255).astype(np.uint8)).crop(bbox)
    inner = SIZE - 2 * PADDING
    art.thumbnail((inner, inner), Image.Resampling.LANCZOS)

    icon = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    opaque = Image.new("RGBA", art.size, (255, 255, 255, 0))
    opaque.putalpha(art)
    icon.alpha_composite(
        opaque,
        ((SIZE - art.width) // 2, (SIZE - art.height) // 2),
    )
    return icon


def generate(brand_dir: Path) -> None:
    source = brand_dir / "assets" / "images" / "android-icon-foreground.png"
    target = brand_dir / "assets" / "images" / "status_bar_icon.png"

    if not source.exists():
        raise FileNotFoundError(f"missing foreground: {source}")

    icon = render_icon(build_mask(Image.open(source)))
    icon.save(target, "PNG", optimize=True)
    print(f"{brand_dir.name}: {source.name} -> {target.name}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--brand",
        help="Only regenerate this brand (default: every brand)",
    )
    args = parser.parse_args()

    brands = (
        [BRANDS_ROOT / args.brand]
        if args.brand
        else sorted(path for path in BRANDS_ROOT.iterdir() if path.is_dir())
    )
    for brand_dir in brands:
        generate(brand_dir)


if __name__ == "__main__":
    main()
