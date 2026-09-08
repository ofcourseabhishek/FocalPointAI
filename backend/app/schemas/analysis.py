"""Validated public response shape; legacy fields may coexist during migration."""
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


class _Model(BaseModel):
    model_config = ConfigDict(extra="allow")


class Metric(_Model):
    id: str
    label: str
    rating: int | float | None = None
    score: int | float | None = None
    summary: str | None = None
    detail: str | None = None
    evidence: list[str] = Field(default_factory=list)
    recommendation: str | None = None
    observation: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)
    source: str | None = None
    # A short categorical read (e.g. "Overexposed", "Rule of Thirds") for
    # display without a number, and the what-went-wrong / how-to-fix guidance
    # that powers the Learn page.
    assessment: str | None = None
    value: str | None = None
    what_works: str | None = None
    saw: str | None = None
    improve: str | None = None
    try_this: str | None = None


class Category(_Model):
    id: str
    label: str
    score: int | float | None = None
    summary: str | None = None
    detail: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)
    metrics: list[Metric] = Field(default_factory=list)


class Evidence(_Model):
    id: str
    category: str
    type: Literal["grid", "point", "line", "region", "polygon", "mask", "palette", "histogram", "global_metric"]
    source: Literal["local_cv", "gemini", "derived"]
    confidence: int | float | None = None


class LearningNext(_Model):
    metric_id: str
    label: str
    category: str
    score: int | float | None = None
    priority: int


class Tutorial(_Model):
    id: str
    title: str
    url: str
    topic: str
    video_id: str | None = None
    thumbnail_url: str | None = None
    thumbnail_fallback_url: str | None = None
    channel: str | None = None
    matched_metric_ids: list[str] = Field(default_factory=list)
    reason: str | None = None
    priority: int
    priority_label: str


class Metadata(_Model):
    filename: str
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    orientation: Literal["landscape", "portrait", "square"]
    format: Literal["jpeg", "png", "webp"] | None = None
    exif: dict[str, Any] | None = None
    camera_settings: dict[str, Any] | None = None


class ChangeOneThing(_Model):
    category: str
    action: str
    observation: str | None = None
    consequence: str | None = None
    # Legacy fields
    text: str | None = None
    detail: str | None = None
    why: str | None = None


class PracticeVariation(_Model):
    label: str
    instruction: str
    # Legacy field
    text: str | None = None


class PracticeExercise(_Model):
    status: Literal["available", "unavailable", "insufficient"]
    title: str | None = None
    instruction: str | None = None
    supporting: str | None = None
    variations: list[PracticeVariation] = Field(default_factory=list)
    closing: str | None = None
    # Legacy fields
    text: str | None = None
    steps: list[Any] = Field(default_factory=list)


class Overview(_Model):
    summary: str
    keep: list[Any] = Field(default_factory=list)
    change_one_thing: ChangeOneThing | None = None
    try_this_next: PracticeExercise | None = None


class Analysis(_Model):
    overall_score: int | float = Field(ge=0, le=100)
    categories: list[Category]


class DiagnosticMode(_Model):
    id: str
    category: str
    supported: bool
    representations: list[str] = Field(default_factory=list)
    unavailable_reason: str | None = None


class VisualBreakdown(_Model):
    evidence: list[Evidence] = Field(default_factory=list)
    diagnostic_modes: list[DiagnosticMode] = Field(default_factory=list)
    composition: dict[str, Any] = Field(default_factory=dict)
    lighting: dict[str, Any] = Field(default_factory=dict)
    focus: dict[str, Any] = Field(default_factory=dict)
    color: dict[str, Any] = Field(default_factory=dict)
    subject: dict[str, Any] = Field(default_factory=dict)
    technical: dict[str, Any] = Field(default_factory=dict)


class Diagnostics(_Model):
    analysis_id: str
    mode: str
    ai_status: str
    score_source: str
    coordinate_space: Literal["normalized"]


class AnalysisResponse(_Model):
    metadata: Metadata
    overview: Overview
    analysis: Analysis
    visual_breakdown: VisualBreakdown
    learning_next: list[LearningNext]
    tutorials: list[Tutorial]
    diagnostics: Diagnostics
