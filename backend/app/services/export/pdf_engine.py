"""Premium multi-page PDF critiques for Snapgrade."""

from __future__ import annotations

import hashlib
import html
import io
import json
import math
import re
import unicodedata
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

from PIL import Image as PILImage, ImageOps
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing


PAGE_W, PAGE_H = A4
MARGIN = 22 * mm
CONTENT_W = PAGE_W - (2 * MARGIN)

PAPER = colors.HexColor("#F3EFE7")
INK = colors.HexColor("#2A211B")
SECONDARY_INK = colors.HexColor("#5A4636")
MUTED = colors.HexColor("#7B6A5C")
GOLD = colors.HexColor("#B8924A")
SOFT_GOLD = colors.HexColor("#D2BC8A")
LINE = colors.HexColor("#D8D0C4")
SURFACE = colors.HexColor("#E8E1D7")
PALE_SURFACE = colors.HexColor("#EEE8DE")
OLIVE = colors.HexColor("#65704E")
CLAY = colors.HexColor("#9A5A45")
WHITE = PAPER


def _register_fonts() -> tuple[str, str, str]:
    repository_root = Path(__file__).resolve().parents[4]
    snapgrade_font_root = repository_root / "frontend" / "public" / "fonts"
    font_root = repository_root / "fonts" / "Google_Sans" / "static"
    try:
        # Mirror the display face used in the app when ReportLab can consume it.
        pdfmetrics.registerFont(TTFont("SnapgradeRegular", str(snapgrade_font_root / "neuehaasgrotdisp-55roman-trial.otf")))
        pdfmetrics.registerFont(TTFont("SnapgradeMedium", str(snapgrade_font_root / "neuehaasgrotdisp-65medium-trial.otf")))
        return "SnapgradeRegular", "SnapgradeMedium", "SnapgradeMedium"
    except Exception:
        try:
            pdfmetrics.registerFont(TTFont("SnapgradeRegular", str(font_root / "GoogleSans-Regular.ttf")))
            pdfmetrics.registerFont(TTFont("SnapgradeMedium", str(font_root / "GoogleSans-Medium.ttf")))
            pdfmetrics.registerFont(TTFont("SnapgradeBold", str(font_root / "GoogleSans-Bold.ttf")))
            return "SnapgradeRegular", "SnapgradeMedium", "SnapgradeBold"
        except Exception:
            return "Helvetica", "Helvetica-Bold", "Helvetica-Bold"


FONT, FONT_MEDIUM, FONT_BOLD = _register_fonts()
# ReportLab's ImageReader does not natively render the SVG mark. Until it does,
# use the typographic wordmark rather than introducing an asset conversion path.


def _plain(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    text = str(value)
    replacements = {
        "\u2011": "-", "\u2012": "-", "\u2013": "-", "\u2014": "-",
        "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"',
        "\u2022": "-", "\u00b7": "-", "\u2192": "->",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return unicodedata.normalize("NFKC", text).strip() or fallback


def _safe(value: Any, fallback: str = "") -> str:
    return html.escape(_plain(value, fallback)).replace("\n", "<br/>")


def _truncate(value: Any, length: int) -> str:
    text = _plain(value)
    return text if len(text) <= length else text[: max(0, length - 3)].rstrip() + "..."


def _score(value: Any) -> int:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0
    if 0 <= number <= 10:
        number *= 10
    return max(0, min(100, round(number)))


def _status(score: int) -> tuple[str, colors.Color]:
    if score >= 85:
        return "Excellent", OLIVE
    if score >= 70:
        return "Strong", SECONDARY_INK
    if score >= 55:
        return "Needs refinement", GOLD
    return "Priority", CLAY


def _filename(value: Any) -> str:
    return Path(_plain(value, "photograph")).name[:120] or "photograph"


def pdf_download_filename(filename: Any) -> str:
    stem = Path(_filename(filename)).stem
    safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip("-._") or "photograph"
    return f"{safe_stem}-critique.pdf"


def _analysis_id(data: dict[str, Any]) -> str:
    canonical = json.dumps(data, sort_keys=True, default=str, separators=(",", ":"))
    number = int(hashlib.sha1(canonical.encode("utf-8")).hexdigest()[:10], 16) % 100000
    return f"SG-{number:05d}"


def _nested(data: dict[str, Any], *path: str) -> Any:
    current: Any = data
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _aspect(data: dict[str, Any], path: tuple[str, ...]) -> dict[str, Any] | None:
    value = _nested(data.get("aspects") or {}, *path)
    return value if isinstance(value, dict) and "rating" in value else None


CATEGORY_CONFIG = [
    ("Composition", [("composition",), ("crop",), ("feel", "angle_and_viewpoint")]),
    ("Lighting", [("highlights",), ("shadows",), ("ambiance",)]),
    ("Exposure", [("brightness",), ("contrast",)]),
    ("Focus", [("details",)]),
    ("Color", [("colour",), ("saturation",), ("warmth",)]),
    ("Storytelling", [("feel", "wow_factor"), ("feel", "emotional_impact")]),
]


def _category_data(data: dict[str, Any]) -> list[dict[str, Any]]:
    categories: list[dict[str, Any]] = []
    edits = data.get("suggested_edits") or []
    edits_by_key = {
        str(edit.get("key")): _plain(edit.get("text"))
        for edit in edits
        if isinstance(edit, dict) and edit.get("key") and edit.get("text")
    }

    for label, paths in CATEGORY_CONFIG:
        entries = [entry for path in paths if (entry := _aspect(data, path))]
        scores = [_score(entry.get("rating")) for entry in entries]
        score = round(sum(scores) / len(scores)) if scores else 70
        strengths = [_plain(entry.get("what_works")) for entry in entries if entry.get("what_works")]
        suggestions = [
            _plain(entry.get("what_could_be_improved"))
            for entry in entries
            if entry.get("what_could_be_improved")
        ]
        for path in paths:
            if path[-1] in edits_by_key:
                suggestions.append(edits_by_key[path[-1]])
        categories.append({
            "name": label,
            "score": score,
            "analysis": " ".join(strengths) or "The image has a stable foundation in this area.",
            "suggestions": suggestions or ["Preserve the current result and refine only with clear intent."],
        })

    focus = next(item for item in categories if item["name"] == "Focus")
    sharpness = _nested(data, "advanced_cv", "sharpness", "score")
    if sharpness is not None:
        focus["score"] = round((focus["score"] + _score(sharpness)) / 2)

    edit_texts = [
        _plain(edit.get("text") if isinstance(edit, dict) else edit)
        for edit in edits
    ]
    edit_texts = [text for text in edit_texts if text]
    editing_score = max(40, min(96, 94 - len(edit_texts) * 6))
    categories.append({
        "name": "Editing",
        "score": editing_score,
        "analysis": (
            "The file needs only selective finishing adjustments."
            if len(edit_texts) <= 2
            else "The image has a workable base with several targeted finishing opportunities."
        ),
        "suggestions": edit_texts or ["Use subtle local adjustments and compare against the original."],
    })
    return categories


LEARNING = {
    "Composition": {
        "topic": "Rule of Thirds and Visual Balance",
        "reason": "Subject placement is limiting visual tension or leaving the frame less balanced than it could be.",
        "exercises": ["Shoot 10 off-center frames", "Practice intentional negative space", "Compare centered and thirds crops"],
        "time": "20 minutes",
    },
    "Lighting": {
        "topic": "Shape the Subject with Light",
        "reason": "The direction or balance of light is not separating the subject as clearly as possible.",
        "exercises": ["Rotate the subject toward window light", "Make three frames at different angles", "Compare hard and soft light"],
        "time": "25 minutes",
    },
    "Exposure": {
        "topic": "Protect Highlights, Lift Midtones",
        "reason": "The tonal range can be distributed more deliberately without losing highlight or shadow detail.",
        "exercises": ["Bracket three exposures", "Check the histogram before capture", "Edit one frame using only exposure controls"],
        "time": "20 minutes",
    },
    "Focus": {
        "topic": "Intentional Focus and Depth",
        "reason": "The sharpest area is not communicating the main point of attention strongly enough.",
        "exercises": ["Use single-point autofocus", "Make five aperture variations", "Inspect focus at 100 percent"],
        "time": "20 minutes",
    },
    "Color": {
        "topic": "White Balance and Palette Control",
        "reason": "Color temperature or saturation is competing with the intended mood.",
        "exercises": ["Set a custom white balance", "Build a three-color palette", "Compare neutral and creative grades"],
        "time": "15 minutes",
    },
    "Storytelling": {
        "topic": "Clarify the Visual Story",
        "reason": "The image needs a stronger relationship between subject, environment, and moment.",
        "exercises": ["Remove one distracting element", "Shoot a wide, medium, and detail frame", "Write a one-sentence intent before shooting"],
        "time": "25 minutes",
    },
    "Editing": {
        "topic": "A Controlled Five-Step Edit",
        "reason": "Several adjustments are competing for attention and need a more deliberate order.",
        "exercises": ["Correct exposure before color", "Use masks instead of global edits", "Compare at matching brightness"],
        "time": "20 minutes",
    },
}


def _tutorials(data: dict[str, Any], limit: int = 3) -> list[dict[str, Any]]:
    tutorials = data.get("tutorial_recommendations") or []
    return [item for item in tutorials if isinstance(item, dict) and item.get("youtube_link")][:limit]


def _video_id(tutorial: dict[str, Any]) -> str:
    supplied = _plain(tutorial.get("video_id"))
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", supplied):
        return supplied
    parsed = parse_qs(urlparse(_plain(tutorial.get("youtube_link"))).query).get("v", [""])[0]
    return parsed if re.fullmatch(r"[A-Za-z0-9_-]{11}", parsed) else ""


@lru_cache(maxsize=32)
def _youtube_thumbnail(video_id: str) -> ImageReader | None:
    """Fetch a YouTube thumbnail without ever making PDF generation depend on it."""
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        return None
    try:
        request = Request(
            f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            headers={"User-Agent": "Snapgrade/1.0"},
        )
        with urlopen(request, timeout=3) as response:
            image_bytes = response.read(2 * 1024 * 1024)
        return ImageReader(io.BytesIO(image_bytes)) if image_bytes else None
    except Exception:
        return None


def _draw_play_thumbnail(c: Canvas, tutorial: dict[str, Any], x: float, y: float, w: float, h: float) -> None:
    thumbnail = _youtube_thumbnail(_video_id(tutorial))
    c.saveState()
    path = c.beginPath()
    path.roundRect(x, y, w, h, 7)
    c.clipPath(path, stroke=0, fill=0)
    if thumbnail:
        c.drawImage(thumbnail, x, y, w, h, preserveAspectRatio=False, mask="auto")
        c.setFillColor(colors.Color(0, 0, 0, alpha=0.18))
        c.rect(x, y, w, h, fill=1, stroke=0)
    else:
        c.setFillColor(INK)
        c.rect(x, y, w, h, fill=1, stroke=0)
        c.setFillColor(SECONDARY_INK)
        c.circle(x + w * 0.18, y + h * 0.78, w * 0.32, fill=1, stroke=0)
    c.restoreState()
    radius = min(19, h * 0.2)
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.94))
    c.circle(x + w / 2, y + h / 2, radius, fill=1, stroke=0)
    c.setFillColor(GOLD)
    path = c.beginPath()
    path.moveTo(x + w / 2 - radius * 0.25, y + h / 2 - radius * 0.42)
    path.lineTo(x + w / 2 + radius * 0.52, y + h / 2)
    path.lineTo(x + w / 2 - radius * 0.25, y + h / 2 + radius * 0.42)
    path.close()
    c.drawPath(path, fill=1, stroke=0)


def _draw_qr(c: Canvas, url: str, x: float, y: float, size: float) -> None:
    qr = QrCodeWidget(url)
    x1, y1, x2, y2 = qr.getBounds()
    width, height = x2 - x1, y2 - y1
    drawing = Drawing(size, size, transform=[size / width, 0, 0, size / height, 0, 0])
    drawing.add(qr)
    renderPDF.draw(drawing, c, x, y)


def _tutorial_caption(tutorial: dict[str, Any]) -> str:
    based_on = tutorial.get("based_on") or {}
    skill = _plain(based_on.get("label"), "your priority skill")
    score = _score(based_on.get("score"))
    title = _plain(tutorial.get("title"), "this tutorial")
    creator = _plain(tutorial.get("creator"), "YouTube")
    return f"Try this tutorial on {title} from {creator} to improve {skill}, the skill that needs the most attention ({score}/100)."


def _paragraph_style(size=9, leading=13, color=INK, bold=False, align=0) -> ParagraphStyle:
    return ParagraphStyle(
        name=f"p-{size}-{leading}-{bold}-{align}",
        fontName=FONT_BOLD if bold else FONT,
        fontSize=size,
        leading=leading,
        textColor=color,
        alignment=align,
        allowWidows=0,
        allowOrphans=0,
    )


def _paragraph(c: Canvas, text: Any, x: float, top: float, width: float, style: ParagraphStyle, max_height=200) -> float:
    p = Paragraph(_safe(text), style)
    _, height = p.wrap(width, max_height)
    p.drawOn(c, x, top - height)
    return height


def _rich_paragraph(c: Canvas, text: str, x: float, top: float, width: float, style: ParagraphStyle, max_height=200) -> float:
    p = Paragraph(text, style)
    _, height = p.wrap(width, max_height)
    p.drawOn(c, x, top - height)
    return height


def _card(c: Canvas, x: float, y: float, w: float, h: float, fill=WHITE, stroke=LINE, radius=5) -> None:
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.7)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def _header(c: Canvas, title: str, analysis_id: str, page: int) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont(FONT_MEDIUM, 11)
    c.drawString(MARGIN, PAGE_H - 35, "Snapgrade")
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 35, f"{title}  |  {analysis_id}")
    c.setStrokeColor(LINE)
    c.line(MARGIN, PAGE_H - 58, PAGE_W - MARGIN, PAGE_H - 58)
    c.line(MARGIN, 38, PAGE_W - MARGIN, 38)
    c.setFont(FONT, 7.5)
    c.drawString(MARGIN, 25, "Snapgrade - A closer read of your photograph")
    c.drawRightString(PAGE_W - MARGIN, 25, f"Page {page} of 7")


def _section_title(c: Canvas, kicker: str, title: str, subtitle: str | None = None) -> None:
    c.setFillColor(GOLD)
    c.setFont(FONT_BOLD, 8)
    c.drawString(MARGIN, PAGE_H - 82, kicker.upper())
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 23)
    c.drawString(MARGIN, PAGE_H - 111, title)
    if subtitle:
        _paragraph(c, subtitle, MARGIN, PAGE_H - 126, CONTENT_W, _paragraph_style(9, 13, MUTED))


def _image_reader(image_bytes: bytes | None) -> tuple[ImageReader | None, int, int]:
    if not image_bytes:
        return None, 0, 0
    try:
        stream = io.BytesIO(image_bytes)
        with PILImage.open(stream) as source:
            # Phone cameras often keep the sensor pixels sideways and record the
            # intended rotation in EXIF. ReportLab does not apply that metadata.
            image = ImageOps.exif_transpose(source)
            width, height = image.size
            image.thumbnail((1600, 1600), PILImage.Resampling.LANCZOS)
            normalized = io.BytesIO()
            image.save(normalized, format="PNG")
        normalized.seek(0)
        return ImageReader(normalized), width, height
    except Exception:
        return None, 0, 0


def _draw_image(c: Canvas, image: ImageReader | None, iw: int, ih: int, x: float, y: float, w: float, h: float) -> tuple[float, float, float, float]:
    c.setFillColor(SURFACE)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=0)
    if not image or iw <= 0 or ih <= 0:
        c.setFillColor(MUTED)
        c.setFont(FONT_MEDIUM, 10)
        c.drawCentredString(x + w / 2, y + h / 2, "Image preview unavailable")
        return x, y, w, h
    scale = min(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.saveState()
    path = c.beginPath()
    path.roundRect(x, y, w, h, 6)
    c.clipPath(path, stroke=0, fill=0)
    c.drawImage(image, dx, dy, dw, dh, preserveAspectRatio=True, mask="auto")
    c.restoreState()
    return dx, dy, dw, dh


def _progress_bar(c: Canvas, x: float, y: float, w: float, score: int, color=GOLD, height=8) -> None:
    c.setFillColor(SURFACE)
    c.roundRect(x, y, w, height, height / 2, fill=1, stroke=0)
    c.setFillColor(color)
    c.roundRect(x, y, max(height, w * score / 100), height, height / 2, fill=1, stroke=0)


def _check(c: Canvas, x: float, y: float, color=OLIVE) -> None:
    c.setFillColor(color)
    c.circle(x, y, 6, fill=1, stroke=0)
    c.setStrokeColor(WHITE)
    c.setLineWidth(1.4)
    c.line(x - 3, y, x - 0.5, y - 2.5)
    c.line(x - 0.5, y - 2.5, x + 3.5, y + 2.5)


def _radar(c: Canvas, categories: list[dict[str, Any]], cx: float, cy: float, radius: float) -> None:
    count = len(categories)
    angles = [math.pi / 2 + (2 * math.pi * index / count) for index in range(count)]
    for ring in (0.25, 0.5, 0.75, 1.0):
        points = [(cx + math.cos(a) * radius * ring, cy + math.sin(a) * radius * ring) for a in angles]
        path = c.beginPath()
        path.moveTo(*points[0])
        for point in points[1:]:
            path.lineTo(*point)
        path.close()
        c.setStrokeColor(LINE)
        c.setLineWidth(0.6)
        c.drawPath(path, fill=0, stroke=1)
    for angle, category in zip(angles, categories):
        ex, ey = cx + math.cos(angle) * radius, cy + math.sin(angle) * radius
        c.setStrokeColor(LINE)
        c.line(cx, cy, ex, ey)
        lx, ly = cx + math.cos(angle) * (radius + 20), cy + math.sin(angle) * (radius + 20)
        c.setFillColor(MUTED)
        c.setFont(FONT_MEDIUM, 7)
        c.drawCentredString(lx, ly - 2, category["name"])
    data_points = [
        (cx + math.cos(a) * radius * item["score"] / 100, cy + math.sin(a) * radius * item["score"] / 100)
        for a, item in zip(angles, categories)
    ]
    path = c.beginPath()
    path.moveTo(*data_points[0])
    for point in data_points[1:]:
        path.lineTo(*point)
    path.close()
    c.setFillColor(colors.Color(GOLD.red, GOLD.green, GOLD.blue, alpha=0.17))
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.8)
    c.drawPath(path, fill=1, stroke=1)
    for x, y in data_points:
        c.setFillColor(GOLD)
        c.circle(x, y, 2.8, fill=1, stroke=0)


def _cover(c: Canvas, data: dict[str, Any], image, iw, ih, overall: int, analysis_id: str) -> None:
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(SURFACE)
    c.rect(0, PAGE_H - 182, PAGE_W, 182, fill=1, stroke=0)
    c.setFillColor(GOLD)
    c.rect(MARGIN, PAGE_H - 62, 34, 2, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont(FONT_MEDIUM, 15)
    c.drawString(MARGIN, PAGE_H - 84, "Snapgrade")
    c.setFillColor(GOLD)
    c.setFont(FONT_MEDIUM, 8)
    c.drawString(MARGIN, PAGE_H - 111, "01 / OVERVIEW")
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 27)
    c.drawString(MARGIN, PAGE_H - 143, "The Read")
    c.setFillColor(MUTED)
    c.setFont(FONT, 9)
    c.drawString(MARGIN, PAGE_H - 163, _filename(data.get("filename")))

    _draw_image(c, image, iw, ih, MARGIN, 326, CONTENT_W, 290)

    c.setStrokeColor(LINE)
    c.line(MARGIN, 292, PAGE_W - MARGIN, 292)
    c.setFillColor(MUTED)
    c.setFont(FONT_MEDIUM, 9)
    c.drawString(MARGIN, 270, "OVERALL SCORE")
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 28)
    c.drawString(MARGIN, 238, str(overall))
    c.setFillColor(MUTED)
    c.setFont(FONT_MEDIUM, 12)
    c.drawString(MARGIN + 37, 243, "/100")
    status, status_color = _status(overall)
    c.setFillColor(status_color)
    c.setFont(FONT_BOLD, 10)
    c.drawRightString(PAGE_W - MARGIN, 246, status.upper())

    settings = _nested(data, "exif_analysis", "camera_settings") or {}
    date_text = datetime.now().strftime("%d %b %Y")
    metadata = [
        ("DATE", date_text),
        ("ANALYSIS ID", analysis_id),
        ("CAMERA", settings.get("camera") or "Not embedded"),
        ("LENS", settings.get("lens") or "Not embedded"),
    ]
    y = 187
    col_w = CONTENT_W / 2
    for index, (label, value) in enumerate(metadata):
        col, row = index % 2, index // 2
        x = MARGIN + col * col_w
        top = y - row * 46
        c.setFillColor(MUTED)
        c.setFont(FONT_BOLD, 7)
        c.drawString(x, top, label)
        c.setFillColor(INK)
        c.setFont(FONT_MEDIUM, 9)
        c.drawString(x, top - 16, _truncate(value, 40))

    c.setStrokeColor(LINE)
    c.line(MARGIN, 67, PAGE_W - MARGIN, 67)
    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawCentredString(PAGE_W / 2, 49, "Generated by Snapgrade - A closer read of your photograph")


def _summary_page(c: Canvas, data: dict[str, Any], categories, overall, analysis_id) -> None:
    _header(c, "Overview", analysis_id, 2)
    _section_title(c, "01 / Overview", "The Read", "A focused view of what is already working and the one change with the most leverage.")
    _card(c, MARGIN, 626, CONTENT_W, 70, fill=SURFACE, stroke=LINE)
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 11)
    c.drawString(MARGIN + 16, 672, "Overall rating")
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 24)
    c.drawRightString(PAGE_W - MARGIN - 16, 666, f"{overall}%")
    _progress_bar(c, MARGIN + 16, 642, CONTENT_W - 32, overall, GOLD, 6)

    ranked = sorted(categories, key=lambda item: item["score"], reverse=True)
    strengths, needs = ranked[:2], list(reversed(ranked[-1:]))
    gap = 12
    card_w = (CONTENT_W - gap) / 2
    for index, (title, items, tint, icon_color) in enumerate((
        ("KEEP", strengths, PALE_SURFACE, OLIVE),
        ("CHANGE ONE THING", needs, SURFACE, GOLD),
    )):
        x = MARGIN + index * (card_w + gap)
        c.setStrokeColor(LINE)
        c.line(x, 606, x + card_w, 606)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 10)
        c.drawString(x + 15, 582, title)
        for row, item in enumerate(items):
            yy = 554 - row * 28
            if index == 0:
                _check(c, x + 20, yy + 2, icon_color)
            else:
                c.setFillColor(icon_color)
                c.circle(x + 20, yy + 2, 3.2, fill=1, stroke=0)
            c.setFillColor(INK)
            c.setFont(FONT_MEDIUM, 8.5)
            c.drawString(x + 33, yy, f"{item['name']}  {item['score']}/100")

    c.setStrokeColor(LINE)
    c.line(MARGIN, 457, PAGE_W - MARGIN, 457)
    c.setFillColor(GOLD)
    c.setFont(FONT_BOLD, 8)
    c.drawString(MARGIN + 15, 435, "WHY THIS MATTERS")
    _paragraph(
        c,
        _truncate(data.get("first_impression"), 430) or "The photograph has a clear foundation and a focused path for refinement.",
        MARGIN + 15,
        419,
        CONTENT_W - 30,
        _paragraph_style(8.7, 12.2, INK),
        55,
    )
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 11)
    c.drawString(MARGIN, 347, "Category balance")
    _radar(c, categories, PAGE_W / 2, 185, 105)


def _detail_page(c: Canvas, categories, analysis_id) -> None:
    _header(c, "Frame", analysis_id, 3)
    _section_title(c, "02 / Frame", "How the Frame Works", "The visual decisions shaping the photograph, translated into practical next actions.")
    row_h = 82
    start_y = 618
    for index, category in enumerate(categories):
        y = start_y - index * row_h
        _, status_color = _status(category["score"])
        c.setStrokeColor(LINE)
        c.line(MARGIN, y + row_h - 7, PAGE_W - MARGIN, y + row_h - 7)
        c.setFillColor(status_color)
        c.setFont(FONT_BOLD, 18)
        c.drawString(MARGIN, y + 38, str(category["score"]))
        c.setFillColor(MUTED)
        c.setFont(FONT_MEDIUM, 6.5)
        c.drawString(MARGIN + 2, y + 24, "/100")

        x = MARGIN + 54
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 10)
        c.drawString(x, y + 56, category["name"].upper())
        c.setFillColor(GOLD)
        c.setFont(FONT_BOLD, 8)
        c.drawRightString(PAGE_W - MARGIN, y + 56, "FRAME READ")
        _rich_paragraph(
            c,
            f"<b>Analysis:</b> {_safe(_truncate(category['analysis'], 155))}",
            x,
            y + 42,
            CONTENT_W - 65,
            _paragraph_style(7.3, 9.5, INK),
            20,
        )
        suggestion = category["suggestions"][0]
        _rich_paragraph(
            c,
            f"<font color='#B8924A'><b>Next:</b></font> {_safe(_truncate(suggestion, 140))}",
            x,
            y + 20,
            CONTENT_W - 65,
            _paragraph_style(7.3, 9.5, MUTED),
            18,
        )


def _annotation_page(c: Canvas, data, image, iw, ih, analysis_id) -> None:
    _header(c, "Evidence", analysis_id, 4)
    _section_title(c, "03 / Evidence", "Measured Evidence", "Signals from the photograph that support the visual read.")
    dx, dy, dw, dh = _draw_image(c, image, iw, ih, MARGIN, 208, CONTENT_W, 475)
    cv = data.get("advanced_cv") or {}
    thirds = _nested(cv, "composition", "rule_of_thirds") or {}
    thirds_score = _score(thirds.get("score"))
    grid_color = OLIVE if thirds_score >= 70 else GOLD
    c.saveState()
    c.setStrokeColor(grid_color)
    c.setLineWidth(1)
    c.setDash(3, 3)
    for fraction in (1 / 3, 2 / 3):
        c.line(dx + dw * fraction, dy, dx + dw * fraction, dy + dh)
        c.line(dx, dy + dh * fraction, dx + dw, dy + dh * fraction)
    c.setDash()

    subject = _nested(cv, "subject_centering", "centroid")
    if isinstance(subject, (list, tuple)) and len(subject) >= 2:
        sx = dx + dw * float(subject[0])
        sy = dy + dh * (1 - float(subject[1]))
        c.setStrokeColor(GOLD)
        c.setLineWidth(2)
        c.circle(sx, sy, 14, fill=0, stroke=1)
        c.setFillColor(GOLD)
        c.roundRect(sx + 12, sy + 10, 70, 15, 4, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(FONT_BOLD, 6.5)
        c.drawString(sx + 18, sy + 15, "VISUAL FOCUS")

    horizon = cv.get("horizon") or {}
    line = horizon.get("line")
    if isinstance(line, dict) and line.get("start") and line.get("end"):
        color = OLIVE if horizon.get("is_level") else CLAY
        start, end = line["start"], line["end"]
        c.setStrokeColor(color)
        c.setLineWidth(2.2)
        c.line(dx + dw * start[0], dy + dh * (1 - start[1]), dx + dw * end[0], dy + dh * (1 - end[1]))

    for face in (cv.get("faces") or [])[:3]:
        box = face.get("box") if isinstance(face, dict) else None
        if isinstance(box, (list, tuple)) and len(box) == 4:
            fx, fy, fw, fh = box
            c.setStrokeColor(GOLD)
            c.setLineWidth(1.5)
            c.rect(dx + dw * fx, dy + dh * (1 - fy - fh), dw * fw, dh * fh, fill=0, stroke=1)
    c.restoreState()

    c.setFillColor(MUTED)
    c.setFont(FONT, 7)
    c.drawString(MARGIN, 190, "Overlay positions are evidence-informed guides, not pixel-level object masks.")
    legend = [("Good", OLIVE), ("Improve", GOLD), ("Problem", CLAY)]
    for index, (label, color) in enumerate(legend):
        x = MARGIN + index * 122
        _card(c, x, 126, 108, 42, fill=WHITE)
        c.setFillColor(color)
        c.circle(x + 17, 147, 5, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont(FONT_MEDIUM, 8)
        c.drawString(x + 30, 144, label)
    clutter = _nested(cv, "background_clutter", "description")
    if clutter:
        _paragraph(c, _truncate(clutter, 180), MARGIN, 104, CONTENT_W, _paragraph_style(7.5, 10.5, MUTED), 35)


def _learning_page(c: Canvas, data, categories, analysis_id) -> None:
    weakest = min(categories, key=lambda item: item["score"])
    lesson = LEARNING[weakest["name"]]
    tutorial = next(iter(_tutorials(data, 1)), None)
    based_on = (tutorial or {}).get("based_on") or {}
    priority_name = _plain(based_on.get("label"), weakest["name"])
    priority_score = _score(based_on.get("score")) if tutorial else weakest["score"]
    _header(c, "Learn in Context", analysis_id, 5)
    _section_title(c, "Personal lesson", "Learn in Context", "Turn the lowest score into one focused practice session.")

    _card(c, MARGIN, 582, CONTENT_W, 112, fill=SURFACE, stroke=LINE)
    c.setFillColor(GOLD)
    c.setFont(FONT_BOLD, 10)
    c.drawString(MARGIN + 18, 666, f"BECAUSE YOUR {priority_name.upper()} SCORE WAS {priority_score}...")
    reason = _plain((tutorial or {}).get("reason")) or lesson["reason"]
    _paragraph(c, reason, MARGIN + 18, 642, CONTENT_W - 36, _paragraph_style(10, 15, INK), 52)

    c.setFillColor(MUTED)
    c.setFont(FONT_BOLD, 8)
    c.drawString(MARGIN, 548, "RECOMMENDED VIDEO")
    if tutorial:
        _card(c, MARGIN, 354, CONTENT_W, 174, fill=WHITE)
        thumb_x, thumb_y, thumb_w, thumb_h = MARGIN + 14, 370, 218, 142
        _draw_play_thumbnail(c, tutorial, thumb_x, thumb_y, thumb_w, thumb_h)
        text_x = thumb_x + thumb_w + 16
        text_w = CONTENT_W - thumb_w - 60
        c.setFillColor(GOLD)
        c.setFont(FONT_BOLD, 7)
        c.drawString(text_x, 502, "YOUTUBE - BEST MATCH")
        _paragraph(c, _truncate(tutorial.get("title"), 105), text_x, 486, text_w, _paragraph_style(11, 14, INK, bold=True), 45)
        c.setFillColor(MUTED)
        c.setFont(FONT_MEDIUM, 7.5)
        metadata = " - ".join(filter(None, [
            _plain(tutorial.get("creator")),
            _plain(tutorial.get("runtime")),
            f"{_score(tutorial.get('match_score'))}% match",
        ]))
        c.drawString(text_x, 427, _truncate(metadata, 52))
        c.setFillColor(GOLD)
        c.setFont(FONT_BOLD, 8)
        c.drawString(text_x, 399, "CLICK TO WATCH ON YOUTUBE")
        qr_size = 38
        _draw_qr(c, tutorial["youtube_link"], PAGE_W - MARGIN - qr_size - 12, 363, qr_size)
        c.linkURL(tutorial["youtube_link"], (MARGIN, 354, PAGE_W - MARGIN, 528), relative=0, thickness=0)
        _paragraph(c, _tutorial_caption(tutorial), MARGIN, 338, CONTENT_W, _paragraph_style(7.5, 10.5, MUTED), 28)
    else:
        _card(c, MARGIN, 420, CONTENT_W, 108, fill=WHITE)
        c.setFillColor(INK)
        c.setFont(FONT_BOLD, 16)
        c.drawString(MARGIN + 18, 477, lesson["topic"])
        c.setFillColor(MUTED)
        c.setFont(FONT, 8.5)
        c.drawString(MARGIN + 18, 453, f"Focused practice - {lesson['time']}")

    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 12)
    c.drawString(MARGIN, 294, "Practice after watching")
    for index, exercise in enumerate(lesson["exercises"]):
        y = 232 - index * 54
        _card(c, MARGIN, y, CONTENT_W, 44, fill=PAPER)
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.2)
        c.roundRect(MARGIN + 15, y + 13, 17, 17, 4, fill=0, stroke=1)
        c.setFillColor(INK)
        c.setFont(FONT_MEDIUM, 9)
        c.drawString(MARGIN + 45, y + 18, exercise)



def _resource_page(c: Canvas, data, categories, analysis_id) -> None:
    weakest = sorted(categories, key=lambda item: item["score"])[:2]
    tutorials = _tutorials(data, 3)
    _header(c, "Personalized Resources", analysis_id, 6)
    _section_title(c, "Curated next steps", "Personalized Resources", f"Selected for {weakest[0]['name'].lower()} and {weakest[1]['name'].lower()}, your two highest-leverage areas.")

    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 12)
    c.drawString(MARGIN, 670, "Your YouTube learning path")
    if not tutorials:
        _card(c, MARGIN, 530, CONTENT_W, 110, fill=WHITE)
        _paragraph(c, "Run a new photo analysis to generate score-based YouTube tutorials.", MARGIN + 18, 600, CONTENT_W - 36, _paragraph_style(11, 16, INK), 50)
        return

    for index, tutorial in enumerate(tutorials):
        y = 518 - index * 151
        _card(c, MARGIN, y, CONTENT_W, 130, fill=WHITE)
        thumb_x, thumb_y, thumb_w, thumb_h = MARGIN + 12, y + 12, 168, 106
        _draw_play_thumbnail(c, tutorial, thumb_x, thumb_y, thumb_w, thumb_h)
        text_x = thumb_x + thumb_w + 16
        text_w = CONTENT_W - thumb_w - 44
        skill = _plain((tutorial.get("based_on") or {}).get("label"), "recommended skill")
        c.setFillColor(GOLD)
        c.setFont(FONT_BOLD, 7)
        c.drawString(text_x, y + 106, f"#{index + 1} - {skill.upper()} - {_score(tutorial.get('match_score'))}% MATCH")
        _paragraph(c, _truncate(tutorial.get("title"), 110), text_x, y + 91, text_w, _paragraph_style(10.5, 13, INK, bold=True), 42)
        c.setFillColor(MUTED)
        c.setFont(FONT_MEDIUM, 7.5)
        c.drawString(text_x, y + 40, _truncate(f"{tutorial.get('creator')} - {tutorial.get('runtime')}", 60))
        c.setFillColor(GOLD)
        c.setFont(FONT_BOLD, 7.5)
        c.drawString(text_x, y + 20, "CLICK ANYWHERE ON THIS CARD TO WATCH")
        c.linkURL(tutorial["youtube_link"], (MARGIN, y, PAGE_W - MARGIN, y + 130), relative=0, thickness=0)

    c.setFillColor(MUTED)
    c.setFont(FONT, 8)
    c.drawCentredString(PAGE_W / 2, 83, "Video cards are clickable. The primary recommendation also includes a scannable QR code on page 5.")


def _progress_page(c: Canvas, data, categories, overall, analysis_id) -> None:
    _header(c, "Progress and Next Steps", analysis_id, 7)
    _section_title(c, "Practice loop", "Progress and Next Steps", "Save this report as your baseline, then compare the next critique after focused practice.")
    previous = data.get("previous_rating")
    previous_score = _score(previous) if previous is not None else None
    change = overall - previous_score if previous_score is not None else None
    metrics = [
        ("CURRENT", str(overall), INK),
        ("PREVIOUS", str(previous_score) if previous_score is not None else "--", MUTED),
        ("IMPROVEMENT", f"{change:+d}" if change is not None else "BASELINE", OLIVE if change is None or change >= 0 else CLAY),
    ]
    gap = 10
    metric_w = (CONTENT_W - gap * 2) / 3
    for index, (label, value, color) in enumerate(metrics):
        x = MARGIN + index * (metric_w + gap)
        _card(c, x, 574, metric_w, 110, fill=SURFACE if index == 0 else PAPER)
        c.setFillColor(MUTED)
        c.setFont(FONT_BOLD, 7)
        c.drawString(x + 14, 656, label)
        c.setFillColor(color)
        c.setFont(FONT_BOLD, 24 if len(value) < 5 else 12)
        c.drawString(x + 14, 617, value)
        c.setFillColor(MUTED)
        c.setFont(FONT, 7)
        c.drawString(x + 14, 593, "out of 100" if index < 2 else "first recorded critique" if change is None else "points")

    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 12)
    c.drawString(MARGIN, 536, "Category baseline")
    y = 505
    for category in categories:
        c.setFillColor(INK)
        c.setFont(FONT_MEDIUM, 8)
        c.drawString(MARGIN, y, category["name"])
        c.setFillColor(MUTED)
        c.setFont(FONT_BOLD, 8)
        c.drawRightString(PAGE_W - MARGIN, y, str(category["score"]))
        _progress_bar(c, MARGIN + 93, y - 1, CONTENT_W - 121, category["score"], _status(category["score"])[1], 6)
        y -= 34

    weakest = sorted(categories, key=lambda item: item["score"])[:3]
    target = min(95, max(90, overall + 5))
    _card(c, MARGIN, 92, CONTENT_W, 130, fill=PALE_SURFACE, stroke=LINE)
    c.setFillColor(GOLD)
    c.setFont(FONT_BOLD, 8)
    c.drawString(MARGIN + 16, 197, "NEXT GOAL")
    c.setFillColor(INK)
    c.setFont(FONT_BOLD, 16)
    c.drawString(MARGIN + 16, 171, f"Reach {target}+ by improving:")
    for index, item in enumerate(weakest):
        x = MARGIN + 20 + index * 145
        _check(c, x, 127, GOLD)
        c.setFillColor(INK)
        c.setFont(FONT_MEDIUM, 8)
        c.drawString(x + 14, 124, item["name"])


def generate_critique_pdf(analysis_results: dict[str, Any], image_bytes: bytes | None = None) -> bytes:
    """Generate a seven-page, portfolio-ready photography critique."""
    if not isinstance(analysis_results, dict):
        raise ValueError("Analysis results must be an object")

    output = io.BytesIO()
    c = Canvas(output, pagesize=A4, pageCompression=1)
    c.setTitle("Snapgrade - Photography Analysis")
    c.setAuthor("Snapgrade")
    c.setSubject("A closer read of your photograph")

    image, iw, ih = _image_reader(image_bytes)
    categories = _category_data(analysis_results)
    overall = _score(analysis_results.get("overall_rating"))
    analysis_id = _analysis_id(analysis_results)

    _cover(c, analysis_results, image, iw, ih, overall, analysis_id)
    c.showPage()
    _summary_page(c, analysis_results, categories, overall, analysis_id)
    c.showPage()
    _detail_page(c, categories, analysis_id)
    c.showPage()
    _annotation_page(c, analysis_results, image, iw, ih, analysis_id)
    c.showPage()
    _learning_page(c, analysis_results, categories, analysis_id)
    c.showPage()
    _resource_page(c, analysis_results, categories, analysis_id)
    c.showPage()
    _progress_page(c, analysis_results, categories, overall, analysis_id)
    c.showPage()
    c.save()
    return output.getvalue()
