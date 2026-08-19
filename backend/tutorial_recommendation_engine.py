"""Deterministic, photo-aware YouTube tutorial recommendations.

The recommender intentionally uses only the analysis scores produced by this
application and the curated local catalog. It does not require a YouTube API
key, so recommendations work in both Gemini and local-CV modes.
"""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse


CATALOG_PATH = Path(__file__).with_name("tutorials_catalog.json")
LEVEL_ORDER = {"beginner": 0, "novice": 1, "experienced": 2, "professional": 3}
CATEGORY_LABELS = {
    "exposure_and_camera_control": "Exposure & camera control",
    "composition_and_framing": "Composition & framing",
    "photographic_storytelling": "Photographic storytelling",
    "lightroom_post_processing": "Lightroom post-processing",
    "colour_theory_and_hsl": "Colour theory & HSL",
    "detail_sharpening_noise_and_grain": "Detail, sharpening & noise",
    "snapseed_mobile_editing": "Snapseed mobile editing",
}

OBJECTIVE_HINTS = {
    "composition": ["essential_composition_principles", "composition_rules_for_beginners"],
    "crop": ["framing_techniques", "simplification_and_visual_hierarchy"],
    "thirds": ["essential_composition_principles", "composition_rules_for_beginners"],
    "leading_lines": ["leading_lines"],
    "framing": ["framing_techniques"],
    "negative_space": ["composition_rules_for_beginners", "simplification_and_visual_hierarchy"],
    "layering": ["layering_and_depth", "connecting_composition_light_and_story"],
    "brightness": ["reading_the_histogram", "camera_metering_modes", "basic_panel_and_histogram"],
    "highlights": ["reading_the_histogram", "basic_panel_and_histogram"],
    "shadows": ["reading_the_histogram", "basic_panel_and_histogram"],
    "contrast": ["natural_light_and_contrast", "tone_curve", "basic_panel_and_histogram"],
    "ambiance": ["natural_light_and_contrast", "connecting_composition_light_and_story"],
    "details": ["autofocus_modes", "sharpening_and_noise_reduction", "lens_and_image_corrections"],
    "sharpness": ["autofocus_modes", "sharpening_and_noise_reduction"],
    "colour": ["colour_theory_foundations", "applied_colour_theory", "lightroom_colour_grading"],
    "saturation": ["practical_hsl_editing", "lightroom_hsl_panel"],
    "warmth": ["white_balance", "colour_theory_foundations"],
    "wow_factor": ["storytelling_foundations", "statement_and_conceptual_photography"],
    "emotional_impact": ["storytelling_foundations", "narrative_subject_and_meaning"],
    "edits_needed": ["complete_lightroom_workflow", "complete_snapseed_workflow"],
    "exif_settings": ["exposure_triangle", "complete_camera_foundation"],
}

TEACHING_STATEMENTS = {
    "leading_lines": "This tutorial teaches how photographers use natural lines to guide attention toward the subject.",
    "negative_space": "This tutorial teaches how photographers use empty space to isolate a subject and create visual calm.",
    "framing": "This tutorial teaches how photographers use frames within the scene to create depth and direct attention.",
    "thirds": "This tutorial teaches how photographers place a subject on strong grid intersections for a more intentional composition.",
}
GATED_VISUAL_CONCEPTS = {"leading_lines", "framing", "negative_space", "thirds"}


def _number(value: Any, default: float = 70.0) -> float:
    try:
        result = float(value)
        return max(0.0, min(100.0, result))
    except (TypeError, ValueError):
        return default


def _tokens(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", value.casefold())
        if len(token) > 2
    }


@lru_cache(maxsize=1)
def load_tutorial_catalog() -> list[dict[str, Any]]:
    """Load and flatten the curated tutorial catalog."""
    with CATALOG_PATH.open("r", encoding="utf-8") as catalog_file:
        raw_catalog = json.load(catalog_file)

    tutorials: list[dict[str, Any]] = []
    for category, objectives in raw_catalog.items():
        if category == "metadata_note" or not isinstance(objectives, dict):
            continue
        for objective, tutorial in objectives.items():
            if not isinstance(tutorial, dict) or not tutorial.get("youtube_link"):
                continue
            video_id = parse_qs(urlparse(tutorial["youtube_link"]).query).get("v", [""])[0]
            tutorials.append(
                {
                    "id": objective,
                    "objective": objective,
                    "category": category,
                    "category_label": CATEGORY_LABELS.get(category, category.replace("_", " ").title()),
                    "title": tutorial.get("tutorial_title", "Untitled tutorial"),
                    "creator": tutorial.get("creator"),
                    "youtube_link": tutorial["youtube_link"],
                    "video_id": video_id,
                    "embed_url": f"https://www.youtube-nocookie.com/embed/{video_id}",
                    "thumbnail_url": f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg",
                    "thumbnail_fallback_url": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
                    "runtime": tutorial.get("runtime"),
                    "level": tutorial.get("level", "beginner"),
                    "skills_taught": tutorial.get("skills_taught", []),
                }
            )
    return tutorials


def _aspect_score(analysis: dict[str, Any], key: str, default: float = 70.0) -> float:
    aspects = analysis.get("aspects") or {}
    if key in {"wow_factor", "emotional_impact", "angle_and_viewpoint"}:
        value = (aspects.get("feel") or {}).get(key, {})
    else:
        value = aspects.get(key, {})
    return _number(value.get("rating") if isinstance(value, dict) else value, default)


def _collect_needs(analysis: dict[str, Any]) -> list[dict[str, Any]]:
    needs: list[dict[str, Any]] = []
    technique_statuses = (analysis.get("intent_profile") or {}).get("technique_evaluations") or {}

    def add(key: str, score: float, label: str, detail: str = "", technique_key: str | None = None) -> None:
        status = technique_statuses.get(technique_key or key, {}).get("status")
        if status in {"not_applicable", "intentional_absence"}:
            return
        needs.append({"key": key, "score": _number(score), "label": label, "detail": detail})

    score_engine = analysis.get("score_engine") or {}
    categories = score_engine.get("categories") or {}
    intent_profile = analysis.get("intent_profile") or {}
    intent_opportunities = intent_profile.get("opportunities") or []
    if not intent_profile or any(item.get("technique") == "composition" for item in intent_opportunities):
        add("composition", categories.get("composition", _aspect_score(analysis, "composition")), "composition")
    add("brightness", _aspect_score(analysis, "brightness"), "exposure")
    add("contrast", _aspect_score(analysis, "contrast"), "tonal contrast")
    add("highlights", _aspect_score(analysis, "highlights"), "highlight control")
    add("shadows", _aspect_score(analysis, "shadows"), "shadow detail")
    add("ambiance", _aspect_score(analysis, "ambiance"), "lighting and mood")
    add("details", categories.get("focus", _aspect_score(analysis, "details")), "focus and sharpness")
    add("colour", categories.get("color", _aspect_score(analysis, "colour")), "colour harmony", technique_key="colour")
    add("saturation", _aspect_score(analysis, "saturation"), "colour intensity", technique_key="colour")
    add("warmth", _aspect_score(analysis, "warmth"), "white balance", technique_key="colour")
    add("crop", _aspect_score(analysis, "crop"), "framing and crop")
    add("wow_factor", _aspect_score(analysis, "wow_factor"), "visual impact")
    add("emotional_impact", _aspect_score(analysis, "emotional_impact"), "storytelling")

    composition = ((analysis.get("advanced_cv") or {}).get("composition") or {})
    for key, label in (
        ("rule_of_thirds", "rule of thirds"),
        ("leading_lines", "leading lines"),
        ("framing", "natural framing"),
        ("negative_space", "negative space"),
    ):
        item = composition.get(key) or {}
        mapped_key = "thirds" if key == "rule_of_thirds" else key
        if item:
            add(mapped_key, item.get("score", 70), label, item.get("description", ""), technique_key=mapped_key)

    existing_keys = {need["key"] for need in needs}
    for opportunity in ((analysis.get("intent_profile") or {}).get("opportunities") or []):
        key = opportunity.get("technique")
        if key and key not in existing_keys:
            add(key, opportunity.get("score", 50), opportunity.get("label", key.replace("_", " ")), opportunity.get("reason", ""), technique_key=key)
            existing_keys.add(key)

    diagnostics = ((analysis.get("exif_analysis") or {}).get("diagnostics") or {})
    if diagnostics.get("status") in {"warning", "critical"}:
        score = 45 if diagnostics["status"] == "critical" else 65
        add("exif_settings", score, "camera settings", diagnostics.get("issue", ""))

    edits = analysis.get("suggested_edits") or []
    if edits:
        add("edits_needed", max(35, 88 - len(edits) * 7), "post-processing workflow")

    return sorted(needs, key=lambda need: (need["score"], need["key"]))


def _learner_level(analysis: dict[str, Any]) -> str:
    overall = _number((analysis.get("score_engine") or {}).get("overall"), _number(analysis.get("overall_rating"), 7) * 10)
    if overall < 58:
        return "beginner"
    if overall < 76:
        return "novice"
    if overall < 89:
        return "experienced"
    return "professional"


def _visual_validation(analysis: dict[str, Any], need_key: str, need_label: str) -> dict[str, Any]:
    """Validate that the analyzed image actually contains the visual concept.

    This is deliberately evidence-only. It does not claim that a YouTube
    thumbnail is visually similar to the user's photo; it gates concept claims
    against the local CV signals we can prove from the analyzed image.
    """
    advanced = analysis.get("advanced_cv") or {}
    composition = advanced.get("composition") or {}
    leading_strength = _number((composition.get("leading_lines") or {}).get("score"), 0)
    subject_guidance = leading_strength
    if need_key != "leading_lines":
        subject_guidance = _number((composition.get("rule_of_thirds") or {}).get("score"), 70)
    composition_score = _number((analysis.get("score_engine") or {}).get("categories", {}).get("composition"), 70)
    concept_score = _number((composition.get(need_key) or {}).get("score"), _aspect_score(analysis, need_key, 70))
    passed = need_key not in GATED_VISUAL_CONCEPTS or concept_score >= 50
    return {
        "concept": need_label,
        "concept_score": round(concept_score),
        "leading_line_strength": round(leading_strength),
        "subject_guidance": round(subject_guidance),
        # There is no honest way to compare the user's frame to a YouTube
        # thumbnail without a separate image-understanding pass. Keep this
        # explicit instead of inventing a similarity score.
        "composition_similarity": None,
        "comparison_available": False,
        "passed": passed,
        "status": "evidence_confirmed" if passed else "skill_gap_not_visualized",
    }


def recommend_tutorials(analysis: dict[str, Any], limit: int = 3) -> list[dict[str, Any]]:
    """Rank tutorials against the weakest evidence-backed areas in an analysis."""
    if not isinstance(analysis, dict):
        raise ValueError("Analysis must be an object")

    limit = max(1, min(8, int(limit)))
    all_needs = _collect_needs(analysis)
    rejected_visual_needs = []
    eligible_needs = []
    for need in all_needs:
        validation = _visual_validation(analysis, need["key"], need["label"])
        if need["key"] in GATED_VISUAL_CONCEPTS and not validation["passed"]:
            rejected_visual_needs.append({
                "key": need["key"],
                "label": need["label"],
                "score": round(need["score"]),
                "reason": "Visual evidence is below the validation threshold; this concept is excluded from the primary recommendation.",
            })
            continue
        eligible_needs.append(need)
    # A visual mismatch must change the primary result, not merely lower its
    # confidence. Keep non-gated technical needs available as fallbacks.
    ranking_needs = eligible_needs or all_needs
    primary_needs = ranking_needs[:8]
    learner_level = _learner_level(analysis)
    learner_rank = LEVEL_ORDER[learner_level]
    scored: list[tuple[float, dict[str, Any], dict[str, Any]]] = []

    for tutorial in load_tutorial_catalog():
        tutorial_rank = LEVEL_ORDER.get(tutorial["level"], 0)
        level_distance = abs(tutorial_rank - learner_rank)
        best_score = 0.0
        best_need = primary_needs[0]
        tutorial_text = " ".join(
            [tutorial["objective"], tutorial["title"], *tutorial["skills_taught"]]
        )
        tutorial_tokens = _tokens(tutorial_text)

        for position, need in enumerate(primary_needs):
            weakness = 100.0 - need["score"]
            priority = max(0.0, 18.0 - position * 1.5)
            direct_match = 34.0 if tutorial["objective"] in OBJECTIVE_HINTS.get(need["key"], []) else 0.0
            overlap = len(_tokens(f"{need['key']} {need['label']} {need['detail']}") & tutorial_tokens)
            match_score = weakness * 0.42 + priority + direct_match + min(18.0, overlap * 4.5)
            if match_score > best_score:
                best_score = match_score
                best_need = need

        level_bonus = 10.0 if level_distance == 0 else 4.0 if level_distance == 1 else -8.0 * level_distance
        scored.append((best_score + level_bonus, tutorial, best_need))

    scored.sort(key=lambda item: (-item[0], item[1]["title"]))
    # The first result must address the single lowest-scoring skill. Other
    # results may diversify the learning path across related categories.
    most_needed_key = primary_needs[0]["key"]
    primary_candidates = [item for item in scored if item[2]["key"] == most_needed_key]
    if primary_candidates:
        primary = primary_candidates[0]
        scored.remove(primary)
        scored.insert(0, primary)
    selected: list[dict[str, Any]] = []
    seen_categories: set[str] = set()

    def addresses_for(tutorial: dict[str, Any], primary_need: dict[str, Any]) -> list[dict[str, Any]]:
        tutorial_text = " ".join([tutorial["objective"], tutorial["title"], *tutorial["skills_taught"]])
        tutorial_tokens = _tokens(tutorial_text)
        related = [primary_need]
        for need in ranking_needs:
            if need["key"] == primary_need["key"] or need["score"] >= 85:
                continue
            direct = tutorial["objective"] in OBJECTIVE_HINTS.get(need["key"], [])
            overlap = _tokens(f"{need['key']} {need['label']}") & tutorial_tokens
            if direct or overlap:
                related.append(need)
        return [
            {"key": need["key"], "label": need["label"], "score": round(need["score"])}
            for need in related[:3]
        ]

    # Prefer a varied learning path, then fill remaining slots by raw relevance.
    for diversify in (True, False):
        for raw_score, tutorial, need in scored:
            if len(selected) >= limit:
                break
            if any(item["id"] == tutorial["id"] for item in selected):
                continue
            if diversify and tutorial["category"] in seen_categories:
                continue
            match_percent = round(max(55.0, min(99.0, 55.0 + raw_score * 0.42)))
            creator = tutorial["creator"] or "Creator not verified"
            visual_validation = _visual_validation(analysis, need["key"], need["label"])
            if not visual_validation["passed"]:
                match_percent = min(match_percent, 67)
            confidence_label = (
                "Highly Recommended" if match_percent >= 82
                else "Recommended" if match_percent >= 68
                else "Recommended to Learn"
            )
            current_score = round(need["score"])
            target_score = min(92, max(70, current_score + 25))
            reason = (
                f"Recommended because {need['label']} is one of this photo's clearest growth areas "
                f"({current_score}/100)."
                if visual_validation["passed"] else
                f"This is a skill-building lesson: {need['label']} currently scores {current_score}/100, "
                "and the image does not yet show strong visual evidence of the technique."
            )
            selected.append(
                {
                    **tutorial,
                    "creator": creator,
                    "match_score": match_percent,
                    "confidence_label": confidence_label,
                    "teaching_statement": TEACHING_STATEMENTS.get(
                        need["key"],
                        f"This tutorial teaches practical techniques for improving {need['label']} in future photographs.",
                    ),
                    "reason": reason,
                    "based_on": {"key": need["key"], "label": need["label"], "score": current_score},
                    "addresses": addresses_for(tutorial, need),
                    "target_score": target_score,
                    "visual_validation": visual_validation,
                    "rejected_visual_needs": rejected_visual_needs,
                    "learner_level": learner_level,
                }
            )
            seen_categories.add(tutorial["category"])
        if len(selected) >= limit:
            break

    return selected
