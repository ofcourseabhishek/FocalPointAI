"""Deterministic scoring and Gemini-context helpers for photo analysis."""

from copy import deepcopy


def _clamp(value):
    return max(0, min(100, int(round(float(value or 0)))))


def _average(*values):
    valid = [float(value) for value in values if value is not None]
    return _clamp(sum(valid) / len(valid)) if valid else 0


def _rating(aspects, key):
    return _clamp(aspects.get(key, {}).get("rating", 0))


def build_score_engine(local_analysis: dict, exif_summary: dict | None = None) -> dict:
    """Create all public scores from local CV/EXIF evidence, never from Gemini."""
    aspects = local_analysis.get("aspects", {})
    advanced = local_analysis.get("advanced_cv", {})
    composition_signals = advanced.get("composition", {})

    technique_scores = [
        composition_signals.get("rule_of_thirds", {}).get("score", 0),
        composition_signals.get("golden_ratio", {}).get("score", 0),
        composition_signals.get("leading_lines", {}).get("score", 0),
        composition_signals.get("symmetry_patterns", {}).get("score", 0),
        composition_signals.get("framing", {}).get("score", 0),
        _rating(aspects, "crop"),
    ]
    # A photograph does not need to use every composition technique. Reward the
    # three strongest detected structures instead of penalising absent techniques.
    composition = _average(*sorted(technique_scores, reverse=True)[:3])

    horizon = advanced.get("horizon", {})
    horizon_score = 85 if not horizon.get("detected") or horizon.get("is_level") else 55
    angle = _average(composition, _rating(aspects, "crop"), horizon_score)
    lighting = _average(
        _rating(aspects, "brightness"),
        _rating(aspects, "highlights"),
        _rating(aspects, "shadows"),
        _rating(aspects, "ambiance"),
    )
    exposure = _average(
        _rating(aspects, "brightness"),
        _rating(aspects, "contrast"),
        _rating(aspects, "highlights"),
        _rating(aspects, "shadows"),
    )
    color = _average(
        _rating(aspects, "colour"),
        _rating(aspects, "saturation"),
        _rating(aspects, "warmth"),
    )
    focus = _rating(aspects, "details")

    raw_exif = (exif_summary or {}).get("raw", {})
    iso = raw_exif.get("iso")
    iso_quality = None
    if isinstance(iso, (int, float)):
        if iso <= 400:
            iso_quality = 92
        elif iso <= 800:
            iso_quality = 84
        elif iso <= 1600:
            iso_quality = 72
        elif iso <= 3200:
            iso_quality = 58
        elif iso <= 6400:
            iso_quality = 42
        else:
            iso_quality = 25
    noise = _average(focus, iso_quality) if iso_quality is not None else focus

    categories = {
        "composition": composition,
        "lighting": lighting,
        "exposure": exposure,
        "color": color,
        "focus": focus,
        "noise": noise,
    }
    overall = _average(composition, lighting, exposure, color, focus)

    aspect_scores = {key: _rating(aspects, key) for key in aspects if key != "feel"}
    aspect_scores["composition"] = composition
    aspect_scores["feel"] = {
        "wow_factor": _average(composition, color, focus),
        "angle_and_viewpoint": angle,
        "emotional_impact": _average(composition, color, _rating(aspects, "ambiance")),
    }

    return {
        "version": "local-cv-v1",
        "source": "application",
        "aspects": aspect_scores,
        "categories": categories,
        "overall": overall,
    }


def build_gemini_context(local_analysis: dict, exif_summary: dict, score_engine: dict) -> dict:
    """Return a compact, JSON-safe evidence package for Gemini's explanation."""
    advanced = local_analysis.get("advanced_cv", {})
    composition = advanced.get("composition", {})
    return {
        "image_statistics": local_analysis.get("image_statistics", {}),
        "camera": exif_summary.get("formatted", {}),
        "composition_evidence": {
            key: {
                "score": value.get("score"),
                "description": value.get("description"),
            }
            for key, value in composition.items()
        },
        "camera_diagnostics": local_analysis.get("exif_analysis"),
        "authoritative_scores": score_engine,
    }


def enforce_authoritative_scores(
    gemini_analysis: dict,
    local_analysis: dict,
    score_engine: dict,
) -> dict:
    """Keep Gemini prose while replacing every score and fact with local values."""
    result = deepcopy(gemini_analysis)
    gemini_aspects = result.setdefault("aspects", {})
    local_aspects = local_analysis.get("aspects", {})

    for key, local_aspect in local_aspects.items():
        if key == "feel":
            continue
        target = gemini_aspects.setdefault(key, deepcopy(local_aspect))
        if not isinstance(target, dict):
            target = deepcopy(local_aspect)
            gemini_aspects[key] = target
        target["rating"] = score_engine["aspects"][key]
        target.setdefault("what_works", local_aspect.get("what_works", ""))
        target.setdefault(
            "what_could_be_improved",
            local_aspect.get("what_could_be_improved", ""),
        )

    composition_score = score_engine["aspects"]["composition"]
    composition = gemini_aspects.setdefault("composition", {})
    composition["rating"] = composition_score
    composition.setdefault(
        "what_works",
        "The strongest detected composition structures give the frame a clear visual order.",
    )
    composition.setdefault(
        "what_could_be_improved",
        "Refine subject placement and the visual path through the frame.",
    )

    feel = gemini_aspects.setdefault("feel", {})
    for key, rating in score_engine["aspects"]["feel"].items():
        item = feel.setdefault(key, {})
        item["rating"] = rating
        item.setdefault("what_works", "The visual choices support the photograph's intent.")
        item.setdefault("what_could_be_improved", "Make the intended visual message more deliberate.")

    result["overall_rating"] = round(score_engine["overall"] / 10.0, 1)
    result["score_engine"] = score_engine
    result["image_statistics"] = local_analysis.get("image_statistics", {})
    result["advanced_cv"] = local_analysis.get("advanced_cv", {})
    result["exif_analysis"] = local_analysis.get("exif_analysis")
    result["mode"] = "gemini_ai"
    return result
