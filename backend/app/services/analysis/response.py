"""Build the stable frontend contract from authoritative local analysis data."""
from __future__ import annotations

import hashlib
from typing import Any
from urllib.parse import urlparse

from app.schemas.analysis import AnalysisResponse

CATEGORIES = (
    ("composition", "Composition", ("composition", "crop"), "composition"),
    ("lighting", "Lighting", ("brightness", "highlights", "shadows", "ambiance", "contrast"), "lighting"),
    ("focus", "Focus", ("details",), "focus"),
    ("color", "Color", ("colour", "saturation", "warmth"), "color"),
    ("subject", "Subject", ("wow_factor", "emotional_impact", "angle_and_viewpoint"), "subject"),
    ("post_processing", "Post-Processing", ("noise",), "post_processing"),
)

TUTORIAL_METRIC_ALIASES = {
    "thirds": "composition",
    "leading_lines": "composition",
    "framing": "composition",
    "negative_space": "composition",
    "layering": "composition",
    "sharpness": "details",
    "exif_settings": "brightness",
}


def _score(value: Any, default: int = 0) -> int:
    try:
        return max(0, min(100, round(float(value))))
    except (TypeError, ValueError):
        return default


def _point(value: Any) -> list[float] | None:
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        return None
    try:
        point = [float(x) for x in value]
    except (TypeError, ValueError):
        return None
    return point if all(0 <= x <= 1 for x in point) else None


def _region(value: Any) -> list[float] | None:
    if not isinstance(value, (list, tuple)) or len(value) != 4:
        return None
    try:
        x, y, width, height = [float(item) for item in value]
    except (TypeError, ValueError):
        return None
    return [x, y, width, height] if x >= 0 and y >= 0 and width > 0 and height > 0 and x + width <= 1 and y + height <= 1 else None


def _valid_data_url(value: Any, mime: str) -> str | None:
    return f"data:{mime};base64,{value}" if isinstance(value, str) and value else None


def _visual_evidence(raw: dict) -> tuple[list[dict], dict[str, list[str]]]:
    advanced, composition = raw.get("advanced_cv") or {}, (raw.get("advanced_cv") or {}).get("composition") or {}
    result, ids = [], {category: [] for category, *_ in CATEGORIES}
    def add(category: str, item: dict) -> None:
        item["id"] = f"e{len(result) + 1}"
        result.append(item); ids[category].append(item["id"])
    thirds = composition.get("rule_of_thirds") or {}
    grid = thirds.get("grid_lines") or {}
    horizontal = [x for x in grid.get("horizontal", []) if isinstance(x, (int, float)) and 0 <= x <= 1]
    vertical = [x for x in grid.get("vertical", []) if isinstance(x, (int, float)) and 0 <= x <= 1]
    if horizontal or vertical:
        add("composition", {"category": "composition", "type": "grid", "source": "derived", "horizontal": horizontal, "vertical": vertical})
    centroid = _point((advanced.get("subject_centering") or {}).get("centroid"))
    if centroid: add("subject", {"category": "subject", "type": "point", "source": "local_cv", "point": centroid})
    for face in advanced.get("faces") or []:
        region = _region((face or {}).get("box"))
        if region: add("subject", {"category": "subject", "type": "region", "source": "local_cv", "region": region})
    for line in (composition.get("leading_lines") or {}).get("lines", []):
        start, end = _point((line or {}).get("start")), _point((line or {}).get("end"))
        if start and end: add("composition", {"category": "composition", "type": "line", "source": "local_cv", "start": start, "end": end})
    horizon = advanced.get("horizon") or {}; line = horizon.get("line") or {}
    start, end = _point(line.get("start")), _point(line.get("end"))
    if start and end: add("composition", {"category": "composition", "type": "line", "source": "local_cv", "start": start, "end": end})
    for category, key, mime in (("focus", "focus_map_b64", "image/jpeg"), ("subject", "saliency_map_b64", "image/jpeg")):
        data_url = _valid_data_url(advanced.get(key), mime)
        if data_url: add(category, {"category": category, "type": "mask", "source": "local_cv", "data_url": data_url})
    palette = [x for x in advanced.get("color_palette") or [] if isinstance(x, dict) and isinstance(x.get("hex"), str)]
    if palette: add("color", {"category": "color", "type": "palette", "source": "local_cv", "palette": palette})
    histogram = (raw.get("image_statistics") or {}).get("luminance_histogram")
    if isinstance(histogram, list) and all(isinstance(x, (int, float)) for x in histogram): add("lighting", {"category": "lighting", "type": "histogram", "source": "local_cv", "values": histogram})
    return result, ids


def build_canonical_response(raw: dict, metadata: dict, recommended: list[dict]) -> dict:
    engine, aspects = raw.get("score_engine") or {}, raw.get("aspects") or {}
    authority, engine_categories = engine.get("aspects") or {}, engine.get("categories") or {}
    evidence, evidence_ids = _visual_evidence(raw); categories = []; metric_map = {}
    for category_id, label, metric_ids, engine_id in CATEGORIES:
        metrics = []
        for metric_id in metric_ids:
            source = (aspects.get("feel") or {}).get(metric_id, {}) if metric_id in {"wow_factor", "emotional_impact", "angle_and_viewpoint"} else aspects.get(metric_id, {})
            rating = engine_categories.get("noise") if metric_id == "noise" else authority.get(metric_id, source.get("rating") if isinstance(source, dict) else None)
            if rating is None: continue
            metric = {"id": metric_id, "label": metric_id.replace("_", " ").title(), "rating": _score(rating), "score": _score(rating), "summary": source.get("what_works") if isinstance(source, dict) else None, "detail": source.get("what_could_be_improved") if isinstance(source, dict) else None, "recommendation": next((edit.get("text") for edit in raw.get("suggested_edits") or [] if edit.get("key") == metric_id), None), "evidence": evidence_ids[category_id]}
            metrics.append(metric); metric_map[metric_id] = (category_id, metric)
        category_score = authority.get("feel", {}).get("emotional_impact") if engine_id == "subject" else engine_categories.get("noise") if engine_id == "post_processing" else engine_categories.get(engine_id)
        normalized_category_score = _score(category_score) if category_score is not None else (metrics[0]["score"] if metrics else None)
        categories.append({"id": category_id, "label": label, "score": normalized_category_score, "summary": metrics[0].get("summary") if metrics else None, "detail": metrics[0].get("detail") if metrics else None, "evidence_ids": evidence_ids[category_id], "metrics": metrics})
    weakest = sorted((value[1] for value in metric_map.values()), key=lambda metric: metric["score"])[:3]
    learning = [{"metric_id": metric["id"], "label": metric["label"], "category": metric_map[metric["id"]][0], "score": metric["score"], "priority": index + 1} for index, metric in enumerate(weakest)]
    tutorials = []
    for index, tutorial in enumerate(recommended):
        if len(tutorials) == 4: break
        url = tutorial.get("youtube_link") or tutorial.get("url")
        if not isinstance(url, str) or urlparse(url).scheme != "https" or not urlparse(url).netloc or any(x["id"] == tutorial.get("id") for x in tutorials): continue
        based = tutorial.get("based_on") or {}
        matched = []
        for item in [*(tutorial.get("addresses") or []), based]:
            metric_id = item.get("key") if isinstance(item, dict) else None
            metric_id = metric_id if metric_id in metric_map else TUTORIAL_METRIC_ALIASES.get(metric_id)
            if metric_id in metric_map and metric_id not in matched:
                matched.append(metric_id)
        tutorials.append({"id": tutorial["id"], "title": tutorial["title"], "url": url, "topic": tutorial.get("category_label") or tutorial.get("category") or "Photography", "video_id": tutorial.get("video_id"), "thumbnail_url": tutorial.get("thumbnail_url"), "thumbnail_fallback_url": tutorial.get("thumbnail_fallback_url"), "channel": tutorial.get("creator"), "matched_metric_ids": matched, "reason": tutorial.get("reason"), "priority": len(tutorials) + 1, "priority_label": "START HERE" if not tutorials else "THEN EXPLORE" if len(tutorials) < 3 else "OPTIONAL DEEPER DIVE"})
    supplied_overview = raw.get("overview") if isinstance(raw.get("overview"), dict) else {}
    overview = {
        "summary": supplied_overview.get("summary") or raw.get("first_impression") or "A local computer-vision critique is ready.",
        "keep": supplied_overview.get("keep") if isinstance(supplied_overview.get("keep"), list) else [x["summary"] for x in sorted((item[1] for item in metric_map.values()), key=lambda item: item["score"], reverse=True)[:2] if x.get("summary")],
        "change_one_thing": supplied_overview.get("change_one_thing") or (learning[0] if learning else None),
        "try_this_next": supplied_overview.get("try_this_next") or [x.get("recommendation") for x in weakest if x.get("recommendation")],
    }
    canonical = {"metadata": metadata, "overview": overview, "analysis": {"overall_score": _score(engine.get("overall"), _score(raw.get("overall_rating")) * 10), "categories": categories}, "visual_breakdown": {"evidence": evidence, "composition": composition if (composition := (raw.get("advanced_cv") or {}).get("composition", {})) else {}, "lighting": (raw.get("image_statistics") or {}).get("brightness", {}), "focus": (raw.get("advanced_cv") or {}).get("blur", {}), "color": {"palette": (raw.get("advanced_cv") or {}).get("color_palette", [])}, "subject": (raw.get("advanced_cv") or {}).get("subject_centering", {}), "post_processing": {"suggested_edits": raw.get("suggested_edits", [])}}, "learning_next": learning, "tutorials": tutorials, "diagnostics": {"analysis_id": "SG-" + hashlib.sha1((metadata.get("filename") or "image").encode()).hexdigest()[:10], "mode": raw.get("mode", "computer_vision"), "ai_status": raw.get("ai_status", "not_configured"), "score_source": engine.get("source", "application"), "coordinate_space": "normalized"}}
    validator = getattr(AnalysisResponse, "model_validate", AnalysisResponse.parse_obj); model = validator(canonical)
    return getattr(model, "model_dump", model.dict)(exclude_none=True)
