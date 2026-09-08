# Visual Breakdown Data Audit

## Current JSON Shape
The backend currently returns categories containing `metrics` (via `analysis.categories`).

**Backend Schema (`Metric`):**
```python
class Metric:
    id: str
    label: str
    rating: int | float | None
    score: int | float | None
    summary: str | None
    detail: str | None
    evidence: list[str]
    recommendation: str | None
    observation: str | None
    evidence_ids: list[str]
    source: str | None
```

**Frontend Model (`result-read.js` `categoryMetrics` mapping):**
Currently maps `metrics` to:
```javascript
{
  id: string,
  label: string, // maps to metric.label
  value: string,
  assessment: string,
  score: number | null,
  saw: string, // maps to metric.summary
  matters: string, // maps to metric.detail
  try: string, // maps to metric.recommendation
  learn: object,
  works: string,
  improve: string,
  observation: string,
  evidenceIds: array,
  source: string
}
```

## Missing Fields / Migration Requirements
The target shape requires:
```javascript
{
  category: "composition",
  score: 99,
  summary: "...", // Maps to frontend `category.interpretation` / `category.supporting`
  evidence: [ // Maps to `metrics`
    {
      title: "Composition Rules", // Maps to metric `label`
      score: 96,                  // Maps to metric `score`
      analysis: "...",            // Maps to `summary` / `detail` / `observation`
      suggestion: "..."           // Maps to `recommendation` / `try`
    }
  ]
}
```

- In `result-read.js`, `category.evidence` is currently used for **visual overlay layers** (the spatial evidence). The Phase 2 data contract asks for an `evidence` array containing the textual breakdown metrics. We need to be careful with naming in the frontend model to avoid colliding with `category.evidence` which holds the `asset`, `shapes`, etc. We should map the legacy `metrics` to `evidenceBreakdown` or rename the target property.
- Older results might just use the old `metrics` shape or lack `recommendation`. The UI should map `saw` and `matters` (or `summary` and `detail`) to `analysis`, and `try` to `suggestion`.

## Frontend Components Involved
- `frontend/src/components/ResultRead.jsx`
- `frontend/src/components/result/MetricEvidenceRow.jsx` (To be replaced by `EvidenceRow.jsx`).
- `frontend/src/components/result/EvidenceAccordion.jsx` (New component).
- `frontend/src/lib/result-read.js` (For data contract mapping).
- `frontend/src/result-read.css` (For animation and accordion styles).

## Backend Prompts & Schema
- `app/prompts/analysis.txt`: Currently instructs the LLM for `aspects`. Needs to be updated in Phase 7 to remove "Detect post processing" and replace with "Provide refinement suggestions".
- `app/schemas/analysis.py`: Need to rename "post_processing" to "refinement" in the schema.
- `app/services/analysis/response.py`: Maps Gemini response to the schema.
