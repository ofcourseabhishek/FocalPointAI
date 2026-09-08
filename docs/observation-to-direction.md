# Observation to direction

This local landing-page extension explains Snapgrade's value in one concrete
sequence: a visual observation becomes a practical next action. It follows
`The Read` and leads directly into the analyzer invitation; Hero, Footer, and
the wider design system are outside its scope. The current user Snapgrade brief
and incumbent landing-page code are the source of truth here. Do not use the
older PRODUCT branding to reinterpret this section.

## Rhythm and composition

The warm off-white section (`#F5F4F0`) begins with a hairline rule, a 10px
uppercase label, and a two-line display headline. A second rule opens a
two-column desktop composition: the photograph takes the flexible left column
and the annotation column is `0.36fr`, offset downward to meet the image rather
than its top edge. The observation appears first; the bordered `Try next` note
follows below it. The closing statement sits back in the left reading column,
then the following CTA repeats the rule/headline/button cadence before the
footer.

At mobile widths, the grid becomes a single column with a 4:5 image; from the
`md` breakpoint it becomes 4:3. The image is the existing repository asset
`/beyonthescore/frames/frame-03.webp`, rendered with `object-cover` and a
`50% 60%` focal point. Preserve the person, orange backpack, golden wall, and
the deliberate tension between person and bright background. Labels are 10px,
medium, uppercase, with generous tracking. The heading uses a tight,
normal-weight sans display (`clamp(2rem, 4vw, 4.5rem)`); the notes use compact
sans copy (`clamp(1.15rem, 1.7vw, 1.5rem)`) with negative tracking. This is an
editorial annotation treatment, not a card or feature grid.

## Motion and resilience

The server-rendered baseline keeps both notes readable without JavaScript.
Enhancement starts only when `IntersectionObserver` is available and reduced
motion is not requested. The main one-time observer watches the image,
observation, and advice references, so entering the advice directly still starts
the sequence if the preceding image/observation was skipped. Once the image has
loaded, it waits 360ms before showing the observation. A separate, one-time
advice observer records that the `Try next` note is in view; after both
conditions are true, advice appears 320ms later. Entrances use a short 420ms
opacity/vertical-shift transition with `cubic-bezier(0.22, 1, 0.36, 1)`.
Nothing replays, pins, or hijacks scroll.

Reduced-motion changes and missing `IntersectionObserver` force the observation
and advice visible with no transition; the image-load failure handler also makes
both notes visible. The SSR baseline remains the separate no-JavaScript
fallback.

## CTA destination

`CallToAction` uses `NEXT_PUBLIC_ANALYZER_URL` when supplied. Its documented
default is `https://focalpoint-ai.vercel.app`; this is a configured outbound
destination, not evidence that the external analyzer was live-tested.

## Verification record

The extension was captured for the requested responsive checks at 390px mobile,
1280px working desktop, and 1440px wide desktop. Review the single-column to
two-column transition, 4:5/4:3 crop, note order, visible fallback states,
keyboard focus for the CTA, and absence of horizontal overflow at those widths.
This record concerns the local landing implementation only and makes no claim
of external application verification.
