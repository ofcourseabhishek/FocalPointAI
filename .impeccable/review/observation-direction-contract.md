# Observation to direction — local extension

Scope: `apps/landing-page/src/components/landing/ObservationToDirection.tsx`,
`CallToAction.tsx`, and their composition in `src/app/page.tsx`.
Mode: Persuade. Existing Hero and The Read are unchanged by this task.

## THESIS
Show how looking carefully at one photograph leads to a useful next step.

## OWN-WORLD
Inherit the current editorial landing page: Neue Haas Grotesk, flat warm
`#F5F4F0` background, dark `#171714` text, thin annotation rules, photography
and whitespace. User explicitly requests uppercase section and note labels.
No cards, gradients, generic AI icons, scores, or feature grid.

## STORY
The Read → From observation to direction → invitation to analyze a photograph.
Use the existing sunlit-wall photograph at
`/beyonthescore/frames/frame-03.webp`. Explain the wall's visual competition
with the passer-by, then suggest a local exposure adjustment or a change of
position. Mark this as example feedback, not a live analysis result.

## FIRST VIEWPORT
The headline introduces the payoff. A photograph occupies roughly 55–65%
of desktop viewport width; adjacent margin notes hold one observation and
one action. Mobile stacks the same image and notes without horizontal overflow.
Keep the person's head, feet, and bright wall visible in every crop.

## FORM
This is a precisely specified local addition, not a new visual identity:
no concept roll, comp round, or seed is applicable. Existing assets suffice.
Photo is visible first, observation fades in, then advice reveals vertically.
One-time entrance only; no pinning, scroll hijacking, replay, or word morph.
Content remains visible without JavaScript and with reduced motion.

Closing line: “Snapgrade doesn’t just grade the frame. It helps you make the
next one better.” CTA: “See what your photograph is telling you.” / “Analyze
a photo”. The separate analyzer destination comes from the repository README
and can be overridden with `NEXT_PUBLIC_ANALYZER_URL`.

## Verification boundary
Inspect desktop 1440×900, mobile 390×844, and existing user viewport 1280×720.
Check note order, image loading, focus, reduced-motion implementation,
progressive enhancement, and changed-file lint/type/build. Preserve unrelated
user modifications and do not expand into Hero/Footer repairs.

PRODUCT.md contains old branding; the user's current Snapgrade brief and
incumbent landing-page code take precedence. No global design-system rewrite.
