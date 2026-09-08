"""Manual real-image integration matrix.

Run from ``backend`` with ``python tests/real_image_matrix.py``. The source
pixels come from photographs already in this repository. Derived variants are
written only to a temporary directory and exercise orientation, exposure,
focus, colour, and multiple-subject-like composition changes.
"""
from __future__ import annotations

import io
import json
import os
import sys
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT))
os.environ["GEMINI_API_KEY"] = ""

from main import app  # noqa: E402

EXPECTED_CATEGORIES = {
    "composition", "lighting", "focus", "color", "subject", "post_processing"
}


def _save(image: Image.Image, path: Path) -> Path:
    image.convert("RGB").save(path, format="JPEG", quality=90)
    return path


def _geometry_is_normalized(evidence: list[dict]) -> bool:
    for item in evidence:
        for key in ("point", "start", "end"):
            if key in item and not all(0 <= value <= 1 for value in item[key]):
                return False
        if "region" in item:
            x, y, width, height = item["region"]
            if min(x, y, width, height) < 0 or width <= 0 or height <= 0:
                return False
            if x + width > 1 or y + height > 1:
                return False
    return True


def main() -> None:
    read_path = REPOSITORY_ROOT / "apps/landing-page/public/images/read/read-photo.jpg"
    subject_path = REPOSITORY_ROOT / "apps/landing-page/public/beyonthescore/frames/frame-03.webp"
    read = Image.open(read_path).convert("RGB")
    subject = Image.open(subject_path).convert("RGB")

    with tempfile.TemporaryDirectory(prefix="snapgrade-real-image-matrix-") as directory:
        temporary = Path(directory)
        left = ImageOps.fit(subject, (540, 960))
        pair = Image.new("RGB", (1080, 960))
        pair.paste(left, (0, 0))
        pair.paste(ImageOps.mirror(left), (540, 0))
        variants = {
            "portrait_urban": read_path,
            "portrait_single_subject": subject_path,
            "landscape": _save(ImageOps.fit(read, (1200, 800)), temporary / "landscape.jpg"),
            "bright": _save(ImageEnhance.Brightness(subject).enhance(1.65), temporary / "bright.jpg"),
            "dark": _save(ImageEnhance.Brightness(subject).enhance(0.32), temporary / "dark.jpg"),
            "soft_focus": _save(subject.filter(ImageFilter.GaussianBlur(8)), temporary / "soft-focus.jpg"),
            "mostly_sharp": _save(subject.filter(ImageFilter.UnsharpMask(radius=2, percent=180)), temporary / "mostly-sharp.jpg"),
            "strong_palette": _save(ImageEnhance.Color(read).enhance(1.8), temporary / "strong-palette.jpg"),
            "muted_palette": _save(ImageEnhance.Color(read).enhance(0.12), temporary / "muted-palette.jpg"),
            "paired_subjects": _save(pair, temporary / "paired-subjects.jpg"),
        }

        rows = []
        client = TestClient(app)
        for name, path in variants.items():
            response = client.post(
                "/analyze",
                files={"file": (path.name, path.read_bytes(), "image/webp" if path.suffix == ".webp" else "image/jpeg")},
            )
            response.raise_for_status()
            result = response.json()
            evidence = result["visual_breakdown"]["evidence"]
            category_ids = {item["id"] for item in result["analysis"]["categories"]}
            assert category_ids == EXPECTED_CATEGORIES
            assert _geometry_is_normalized(evidence)
            assert len(result["tutorials"]) <= 4
            assert len({tutorial["url"] for tutorial in result["tutorials"]}) == len(result["tutorials"])
            assert all(tutorial["url"].startswith("https://www.youtube.com/") for tutorial in result["tutorials"])
            advanced = result.get("advanced_cv") or {}
            statistics = result.get("image_statistics") or {}
            rows.append({
                "case": name,
                "size": f"{result['metadata']['width']}x{result['metadata']['height']}",
                "orientation": result["metadata"]["orientation"],
                "brightness": (statistics.get("brightness") or {}).get("value"),
                "sharpness": (statistics.get("sharpness") or {}).get("value"),
                "faces": len(advanced.get("faces") or []),
                "horizon": bool((advanced.get("horizon") or {}).get("line")),
                "evidence_types": sorted({item["type"] for item in evidence}),
                "tutorials": [tutorial["id"] for tutorial in result["tutorials"]],
            })
        print(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
