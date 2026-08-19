"""Intent-aware photography evaluation built from local CV evidence."""

from __future__ import annotations

from typing import Any


def _score(value: Any, default: float = 0.0) -> float:
    try:
        return max(0.0, min(100.0, float(value)))
    except (TypeError, ValueError):
        return default


def _technique(status: str, usage: float, effectiveness: float, applicability: float, confidence: float, reason: str) -> dict[str, Any]:
    return {
        "usage_score": round(_score(usage)),
        "effectiveness_score": round(_score(effectiveness)),
        "applicability": round(_score(applicability)),
        "status": status,
        "confidence": round(_score(confidence)),
        "reason": reason,
    }


def build_intent_profile(local_analysis: dict[str, Any]) -> dict[str, Any]:
    stats = local_analysis.get("image_statistics") or {}
    advanced = local_analysis.get("advanced_cv") or {}
    comp = advanced.get("composition") or {}
    aspects = local_analysis.get("aspects") or {}
    brightness = _score((stats.get("brightness") or {}).get("value")) * 100
    contrast = _score((stats.get("contrast") or {}).get("value"), 55)
    saturation = _score((stats.get("saturation") or {}).get("value"), 50)
    negative_space = _score((comp.get("negative_space") or {}).get("score"))
    leading_lines = _score((comp.get("leading_lines") or {}).get("score"))
    thirds = _score((comp.get("rule_of_thirds") or {}).get("score"))
    framing = _score((comp.get("framing") or {}).get("score"))
    symmetry = _score((comp.get("symmetry_patterns") or {}).get("score"))
    centered = bool((advanced.get("subject_centering") or {}).get("is_centered"))
    clutter = _score((advanced.get("background_clutter") or {}).get("score"), 50)
    monochrome = saturation <= 18
    minimalist = negative_space >= 52 and clutter <= 48
    atmospheric = brightness < 38 and contrast >= 52

    style_signals: list[dict[str, Any]] = []
    if monochrome:
        style_signals.append({"label": "Monochrome", "confidence": 94, "reason": "Color saturation is intentionally near zero."})
    if minimalist:
        style_signals.append({"label": "Minimalism", "confidence": 86, "reason": "Large negative space and a quiet background isolate the subject."})
    if atmospheric:
        style_signals.append({"label": "Atmospheric mood", "confidence": 72, "reason": "Low brightness and controlled contrast emphasize mood over detail."})
    if advanced.get("faces"):
        style_signals.append({"label": "Portrait subject", "confidence": 78, "reason": "A human subject was detected in the frame."})

    if minimalist:
        primary_intent = "Minimalist storytelling through subject isolation and negative space"
    elif monochrome:
        primary_intent = "Monochrome storytelling through tone, shape, and texture"
    elif atmospheric:
        primary_intent = "Atmospheric mood and tonal storytelling"
    elif advanced.get("faces"):
        primary_intent = "Subject-led portrait storytelling"
    else:
        primary_intent = "Clear visual communication"

    leading_state = "present" if leading_lines >= 50 else "absent_but_applicable"
    leading_reason = "Diagonal lines visibly guide attention toward the subject." if leading_state == "present" else "No strong directional lines are detected."
    if minimalist and negative_space >= 65 and leading_lines < 50:
        leading_state = "not_applicable"
        leading_reason = "This frame relies on minimalism and negative space rather than directional movement."

    thirds_state = "present" if thirds >= 65 else "absent_but_applicable"
    thirds_reason = "Subject or horizon placement supports a thirds-based layout." if thirds_state == "present" else "A thirds placement could be explored if it serves the intended balance."
    if centered and symmetry >= 70 or minimalist and thirds < 50:
        thirds_state = "not_applicable"
        thirds_reason = "Minimalist placement is intentional here; a grid-based thirds score would misread the image's visual restraint."

    color_state = "intentional_absence" if monochrome else "present" if _score((aspects.get("colour") or {}).get("rating")) >= 70 else "absent_but_applicable"
    color_reason = "Monochrome style selected to emphasize mood, shape, and texture." if monochrome else "Color relationships support the image." if color_state == "present" else "Color relationships could be refined to support the subject."

    technique_evaluations = {
        "colour": _technique(color_state, 0 if monochrome else saturation, _score((aspects.get("colour") or {}).get("rating")), 8 if monochrome else 92, 94 if monochrome else 76, color_reason),
        "leading_lines": _technique(leading_state, leading_lines, leading_lines, 30 if leading_state == "not_applicable" else 82, 90, leading_reason),
        "thirds": _technique(thirds_state, thirds, thirds, 35 if thirds_state == "not_applicable" else 82, 84, thirds_reason),
        "negative_space": _technique("present" if negative_space >= 50 else "absent_but_applicable", negative_space, negative_space, 92, 86, "Negative space gives the subject breathing room." if negative_space >= 50 else "More deliberate empty space could simplify the frame."),
        "framing": _technique(
            "not_applicable" if minimalist and framing < 50 else "present" if framing >= 50 else "absent_but_applicable",
            framing,
            framing,
            35 if minimalist and framing < 50 else 78,
            72,
            "Minimalist framing is intentional; depth can be developed through layers instead." if minimalist and framing < 50 else "Detected framing elements support depth." if framing >= 50 else "Additional natural framing could add depth.",
        ),
        "layering": _technique(
            "absent_but_applicable" if minimalist else "present" if framing >= 65 else "absent_but_applicable",
            25 if minimalist else framing,
            42 if minimalist else framing,
            90,
            70,
            "Adding a foreground layer could create depth without losing the minimalist subject isolation." if minimalist else "Foreground, subject, and background layers can strengthen dimensionality.",
        ),
        "contrast": _technique("present" if _score((aspects.get("contrast") or {}).get("rating")) >= 70 else "absent_but_applicable", _score((aspects.get("contrast") or {}).get("rating")), _score((aspects.get("contrast") or {}).get("rating")), 88, 78, "Tonal separation supports the selected mood." if _score((aspects.get("contrast") or {}).get("rating")) >= 70 else "Stronger tonal separation could improve subject clarity."),
    }

    strengths = [
        {"technique": key, "label": key.replace("_", " ").title(), "reason": value["reason"]}
        for key, value in technique_evaluations.items()
        if value["status"] == "present"
    ]
    strengths.extend({"technique": signal["label"].lower().replace(" ", "_"), "label": signal["label"], "reason": signal["reason"]} for signal in style_signals)
    opportunities = [
        {"technique": key, "label": key.replace("_", " ").title(), "score": value["effectiveness_score"], "reason": value["reason"]}
        for key, value in technique_evaluations.items()
        if value["status"] == "absent_but_applicable"
    ]
    opportunities.sort(key=lambda item: item["score"])

    expected = ["negative space", "contrast", "shape", "tone", "depth"] if minimalist else ["composition", "exposure", "focus", "color"]
    if monochrome:
        expected = ["contrast", "texture", "tone", "shape"]

    return {
        "style_signals": style_signals,
        "primary_intent": primary_intent,
        "expected_techniques": expected,
        "technique_evaluations": technique_evaluations,
        "strengths": strengths,
        "opportunities": opportunities,
    }
