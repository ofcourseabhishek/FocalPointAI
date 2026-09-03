# Snapgrade — Product Requirements Document (PRD)

**Status:** Draft v1  
**Product:** Snapgrade  
**Primary use case:** Photography learning through image critique  
**Product principle:** Teach, don't just judge.

---

## 1. Product Summary

Snapgrade is a photography learning product that helps photographers understand **why an image works, where it loses impact, and what decisions could make the next frame stronger**.

The product should not behave like a generic “AI photo score” tool. A numeric result may exist as a secondary summary, but the main value is a structured critique that explains composition, visual hierarchy, exposure, color, subject separation, timing, and intent.

Snapgrade should help the user think more like a **creative director**: identify choices, understand trade-offs, and make more intentional photographs.

---

## 2. Product Vision

### Core promise

> Turn a photograph into a lesson.

Snapgrade should answer three questions:

1. **What is the photograph trying to make me notice?**
2. **Which visual decisions support or weaken that intent?**
3. **What would I do differently on the next frame?**

### Product principles

- **Teach, don't just judge.**
- Explain reasoning before presenting conclusions.
- Prefer observable evidence over vague aesthetic claims.
- Treat different photographic genres differently.
- Avoid pretending there is one objectively “correct” image.
- Reward intentional decisions, not conformity to arbitrary rules.
- Make critique actionable enough to influence the user's next photograph.
- Use scores sparingly and never as the main learning interface.
- Surface uncertainty when the system is not confident.
- Keep the interface editorial, calm, premium, and photography-first.

---

## 3. Problem

Most automated image-rating products fail photographers in one of three ways:

- They produce a number without explaining the visual reasoning behind it.
- They apply generic rules regardless of genre or intent.
- They describe the image rather than critique the decisions inside it.

A photographer does not improve from being told that an image is “7.8/10.” They improve by understanding that:

- the brightest region competes with the subject,
- the frame contains two competing centers of attention,
- the subject separation works because of contrast rather than depth of field,
- the crop removes useful negative space,
- or the visual tension may actually be intentional.

Snapgrade is designed around that gap.

---

## 4. Target Users

### Primary

**Learning photographers**
- Beginner to intermediate.
- Already taking photographs regularly.
- Wants useful critique without needing a mentor for every image.
- Comfortable with mobile or desktop uploads.

### Secondary

**Serious hobbyists / advanced photographers**
- Wants a second opinion.
- Uses critique to inspect composition or technical decisions.
- Values nuance and genre-aware analysis.

### Future

- Photography students.
- Teachers and critique groups.
- Creators reviewing a shoot.
- Portfolio review workflows.

---

## 5. Jobs To Be Done

### Functional

- Upload a photograph and receive a structured critique.
- Understand the strongest and weakest visual decisions.
- See the critique anchored to parts of the image.
- Understand how technical choices affect visual impact.
- Leave with concrete suggestions for the next attempt.
- Revisit previous critiques and identify recurring patterns.

### Emotional

- Feel guided rather than graded.
- Gain confidence in explaining one's own photographic choices.
- Build visual literacy.
- Develop a repeatable self-critique process.

---

## 6. Goals

### MVP goals

- Deliver a useful first critique from a single uploaded image.
- Explain the critique through evidence rather than generic statements.
- Separate local computer-vision measurements from higher-level semantic reasoning.
- Reduce unnecessary paid-model/API calls by extracting deterministic signals locally.
- Produce consistent output structure across images.
- Support a premium, responsive result experience.
- Make every critique end with a useful next-step lesson.

### Product quality goals

- Results feel specific to the uploaded photograph.
- Critiques do not contradict measurable image properties.
- Genre and likely intent influence the critique.
- The same image should not produce wildly different conclusions between runs.
- Users can understand the most important insight within seconds.
- Deeper detail remains available without overwhelming the first view.

---

## 7. Non-Goals for MVP

- Professional photo editing or RAW development.
- Automatic image manipulation.
- Full Lightroom replacement.
- Social network / public feed.
- Photographer ranking.
- Marketplace or paid critique marketplace.
- Fine-grained camera/lens recommendations.
- Perfect reconstruction of the photographer's intent.
- Declaring whether an image is objectively “good” or “bad.”

---

## 8. Core User Experience

### 8.1 Landing experience

The landing page should establish Snapgrade as a **learning system**, not an AI scoring gimmick.

Narrative sequence:

1. Hero — the image contains decisions.
2. The Read — Snapgrade shows how it reads visual structure.
3. Beyond the Score — a photograph is more than one number.
4. Adaptive Analysis — different frames need different questions.
5. Growth loop — critique should improve the next frame.
6. CTA — invite the user to bring their own photograph.
7. Footer — closing brand statement and product links.

### 8.2 Upload

The user can:

- Drag and drop an image.
- Select a file.
- Use a mobile image picker.
- See accepted formats and file constraints.
- Confirm the selected image before analysis.

Recommended v1 formats:

- JPEG
- PNG
- WebP

Future:
- HEIC
- RAW preview ingestion

### 8.3 Analysis progress

Do not use a fake generic spinner for the entire process.

Show meaningful phases such as:

- Reading the frame
- Finding visual weight
- Checking tonal structure
- Inspecting subject separation
- Building the critique

The UI does not need to expose internal implementation details.

### 8.4 Results

The first result screen should answer:

- **What is the image doing well?**
- **What is holding it back?**
- **What should the photographer try next?**

Then allow deeper exploration.

Suggested result hierarchy:

#### A. The Read
A short editorial summary of the image's visual logic.

#### B. What works
2–4 specific strengths.

#### C. What competes
1–3 issues or tensions that reduce clarity or intent.

#### D. Visual breakdown
Structured dimensions such as:
- Composition
- Visual hierarchy
- Light / exposure
- Color
- Subject separation
- Timing / gesture when relevant
- Technical clarity when relevant

#### E. Image evidence
Overlay regions, lines, heatmaps, or markers tied to individual observations.

#### F. Next-frame lesson
A concrete instruction the photographer could apply while shooting again.

Example:

> Keep the subject where it is, but simplify the bright edge on the right. The current frame asks the eye to choose between two anchors.

### 8.5 Optional overall score

If retained, score is secondary.

Requirements:

- Never lead with the score.
- Never imply false precision.
- Prefer a broad band or descriptive tier over decimal scoring.
- Explain which dimensions produced the summary.
- Allow the product to function without the score.

---

## 9. Analysis Dimensions

Not every image should receive every dimension with equal weight.

### Core dimensions

| Dimension | Product question |
|---|---|
| Composition | How are elements arranged and balanced? |
| Visual hierarchy | Where does the eye go first, second, third? |
| Subject clarity | Is the intended subject visually clear? |
| Light | Does luminance support the subject and mood? |
| Exposure | Are important tonal regions preserved? |
| Color | Do hue, saturation, and temperature support the image? |
| Separation | Does the subject separate from its surroundings? |
| Technical clarity | Is blur/noise/detail helping or hurting? |
| Edge control | Are distracting elements entering from frame boundaries? |
| Depth | Do layering and perspective create useful spatial structure? |

### Conditional dimensions

Use only when relevant:

- Gesture / expression
- Motion
- Symmetry
- Geometry / architecture
- Horizon / orientation
- Skin tone handling
- Repetition / pattern
- Minimalism
- Environmental context
- Atmosphere
- Story / interaction
- Product presentation
- Food presentation

---

## 10. Adaptive Analysis

Snapgrade must classify or infer the likely photographic context before final critique.

Possible genre labels:

- Portrait
- Street
- Landscape
- Architecture
- Product
- Food
- Wildlife
- Macro
- Event
- Night
- Minimal
- Abstract
- Documentary
- Other / mixed

Genre classification should influence:

- Which metrics are emphasized.
- Which rules are relaxed.
- What counts as a distraction.
- How much technical sharpness matters.
- Whether asymmetry or unusual exposure may be intentional.

The system should avoid statements such as “the subject must be on a rule-of-thirds intersection.”

Instead:

> The subject is centered, which makes the frame feel deliberate and static. The surrounding symmetry supports that choice.

---

## 11. Local CV + Model Reasoning Strategy

Snapgrade should perform deterministic and low-cost analysis locally/server-side before invoking a higher-cost multimodal model.

### Local CV responsibilities

Potential signals:

- Image dimensions and orientation.
- EXIF metadata.
- Global luminance histogram.
- Highlight clipping.
- Shadow clipping.
- Dynamic range estimate.
- Contrast.
- Saturation distribution.
- White-balance / color cast indicators.
- Sharpness / blur estimate.
- Noise estimate.
- Edge density.
- Saliency map.
- Face/person detection when applicable.
- Subject bounding region.
- Foreground/background separation.
- Horizon / dominant line detection.
- Frame-edge object density.
- Symmetry.
- Rule-of-thirds proximity as a descriptive signal, never a quality rule.
- Dominant colors.
- Empty-space estimate.

### Higher-level model responsibilities

- Infer likely subject and intent.
- Interpret visual relationships.
- Resolve trade-offs between local metrics.
- Produce natural-language critique.
- Decide which observations matter.
- Generate the final next-frame lesson.

### Benefits

- Lower API cost.
- More consistent critique.
- Better evidence grounding.
- Easier debugging.
- Ability to reject obvious contradictions.
- Potential for caching and re-analysis without re-running every stage.

---

## 12. Evidence Requirements

Every major critique point should ideally be supported by one or more of:

- Local CV metric.
- Detected region.
- Semantic observation.
- Image coordinate / bounding box.
- Confidence score.

Example internal structure:

```json
{
  "claim": "The bright sign competes with the subject.",
  "dimension": "visual_hierarchy",
  "evidence": [
    {
      "type": "saliency_region",
      "bbox": [0.71, 0.10, 0.92, 0.36],
      "strength": 0.84
    },
    {
      "type": "semantic",
      "text": "The sign is the highest-luminance object near the upper-right edge."
    }
  ]
}
```

This evidence does not always need to be shown directly to the user, but the backend should preserve it.

---

## 13. Consistency Layer

Before returning results, Snapgrade should validate the critique.

Examples:

- Do not call an image “underexposed” if the luminance analysis does not support it.
- Do not say a face is soft if face-level sharpness is strong.
- Do not describe a bright object as distracting unless it is actually visually prominent.
- Do not recommend cropping away context when the critique also says context is central to the story.

The validator may:

- Drop unsupported observations.
- Lower confidence.
- Ask the reasoning model for a revision.
- Replace exact claims with qualified language.

---

## 14. User Accounts

### MVP option A — low-friction

Allow analysis without requiring an account.

Anonymous user:
- Uploads.
- Receives result.
- Analysis is stored using an anonymous session ID with short retention.

Account:
- Saves history.
- Revisits critiques.
- Tracks recurring lessons.

### Account features

- Sign in.
- Analysis history.
- Delete analysis.
- Delete account/data.
- Optional saved learning profile.

---

## 15. Learning Profile

Future but schema-ready.

Snapgrade can aggregate recurring critique patterns such as:

- Busy edges.
- Weak subject separation.
- Inconsistent horizons.
- Over-reliance on centered framing.
- Strong use of contrast.
- Effective negative space.

The product should phrase these as patterns, not labels.

Example:

> Across your recent frames, bright edge elements frequently become secondary focal points.

---

## 16. Functional Requirements

### Upload

- Validate MIME type.
- Validate file size.
- Normalize orientation.
- Strip unsafe metadata before downstream processing.
- Generate a working derivative.
- Preserve original only if product policy requires it.

### Analysis

- Create analysis ID before processing.
- Record stage and progress.
- Run local CV extraction.
- Infer image context.
- Run semantic reasoning.
- Validate critique.
- Save structured result.
- Return stable result schema.

### Results

- Render useful summary even if some analysis modules fail.
- Support retry for failed semantic stage.
- Keep overlays linked to structured evidence.
- Allow users to delete an analysis.

---

## 17. Non-Functional Requirements

### Performance

Initial targets:

- Upload acknowledgement: < 1 second after transfer completes.
- Local CV analysis: target < 2 seconds for normal web-sized images.
- First complete critique: target p50 < 8 seconds, p95 < 15 seconds.
- Result page repeat load from stored analysis: < 2 seconds.

Targets should be measured in production and revised.

### Reliability

- Graceful fallback when one optional CV module fails.
- Idempotent analysis jobs.
- Retries for transient external model failures.
- No duplicate paid inference for the same analysis stage.

### Security

- Validate image content independent of filename.
- Use signed object-storage URLs.
- Limit upload size.
- Rate-limit analysis creation.
- Keep service secrets server-side.
- Strip or control EXIF.
- Sanitize model outputs before display.

### Privacy

- Clear retention policy.
- User-controlled deletion.
- Do not train on private uploads by default.
- Store only data necessary for the product experience.

---

## 18. Success Metrics

### Activation

- % of landing visitors who start upload.
- % of upload starters who complete analysis.
- Time to first critique.

### Engagement

- % of users who expand at least one detailed dimension.
- % who interact with image evidence.
- % who analyze a second image.
- Return rate within 7 / 30 days.

### Learning-value proxies

- “Was this useful?” rating.
- % of critiques saved/revisited.
- % of users reporting the next-frame lesson was actionable.
- Repeat issue reduction across multiple analyses, if history is enabled.

### Cost

- Average external inference cost per image.
- % of analyses answered using cached/local features.
- Retry rate.
- Model tokens or image-processing cost per completed critique.

---

## 19. Analytics Events

Suggested events:

```text
landing_cta_clicked
upload_started
upload_completed
analysis_created
analysis_stage_completed
analysis_completed
analysis_failed
result_summary_viewed
dimension_expanded
overlay_toggled
next_frame_lesson_viewed
analysis_deleted
reanalyze_clicked
feedback_submitted
signup_started
signup_completed
```

Avoid collecting sensitive image-derived labels unless required.

---

## 20. MVP Release Criteria

Snapgrade v1 is ready when:

- A user can upload a supported image from desktop and mobile.
- The backend can extract the defined local CV feature set.
- The semantic critique follows one stable schema.
- The final critique contains image-specific evidence.
- The result has a clear “what works / what competes / try next” structure.
- Failures produce useful recovery states.
- External inference cost is measured.
- User uploads and analyses can be deleted.
- Landing-to-analysis flow works without broken transitions.
- The experience works responsively across modern mobile and desktop browsers.

---

## 21. Future Product Directions

- Side-by-side frame comparison.
- “Before / after” critique.
- Shoot-level analysis.
- Personal learning trends.
- Portfolio critique.
- Assignment mode.
- Teacher / classroom mode.
- Genre-specific critique packs.
- Camera-roll import.
- Critique conversation: ask “why?” about any observation.
- Local or distilled vision models for more of the pipeline.
- Embedding-based retrieval of similar learning examples.
