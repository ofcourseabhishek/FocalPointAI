# Snapgrade Landing Page — Design Specification

**Document:** `Design.md`  
**Product:** Snapgrade  
**Scope:** Public landing page  
**Design direction:** Editorial, photographic, product-led, restrained  
**Reference:** User-provided landing-page motion reference (`reference.mp4`)  
**Status:** Implementation-ready design direction

---

## 1. Design Goal

Snapgrade should look like a serious tool for learning photography, not a generic AI SaaS landing page.

The landing page should make three things obvious within the first few seconds:

1. Snapgrade looks at an actual photograph.
2. It explains why the photograph works or does not work.
3. The product gives the photographer something useful to try next.

The reference video is useful for **composition and pacing**, not for its visual effects. We will borrow its:

- strong centered headlines;
- large product-led moments;
- alternating text and evidence;
- modular section composition;
- cinematic scroll pacing;
- clear visual hierarchy;
- generous negative space.

We will **not** borrow its:

- purple/blue gradients;
- glowing edges;
- glassmorphism;
- floating particles;
- fake dashboard-style cards;
- decorative AI imagery;
- visual effects with no product meaning.

The result should feel closer to a modern photography publication combined with a polished creative tool.

---

## 2. Core Rules

These rules are non-negotiable.

### 2.1 One background, one accent

Use one flat page background throughout the main landing page.

**Page background:** `#F4F2ED` — warm photographic off-white  
**Primary text:** `#111111`  
**Secondary text:** `#62605B`  
**Border:** `#D8D5CE`  
**Accent:** `#315CFF`

The accent color is used only for interactive state, emphasis, active analysis markers, links, and selected UI details.

Do not introduce a second branded accent.

Do not use gradients anywhere on the page, including:

- hero backgrounds;
- buttons;
- overlays;
- section transitions;
- cards;
- text fills;
- image masks;
- footer treatment.

Black and white are neutrals, not additional accents.

### 2.2 No glassmorphism

No `backdrop-blur`, frosted panels, translucent floating navigation, glow borders, or semi-transparent cards designed to imitate glass.

Cards should be ordinary opaque surfaces with either:

- a 1px border; or
- a clearly different neutral surface when necessary inside a product screenshot.

### 2.3 Product proof over decorative features

Never create a section whose primary content is three generic feature cards in a row.

Every major claim should be supported by at least one of:

- a real Snapgrade screenshot;
- a real product interaction;
- a short demo clip;
- a real analyzed photograph;
- an actual analysis excerpt;
- a real measured result once reliable product data exists.

If we do not have a real number, do not invent one.

### 2.4 Plain human copy

Write as if a photographer is explaining Snapgrade to another photographer.

Avoid language such as:

- empower;
- unleash;
- revolutionize;
- supercharge;
- transform your creative journey;
- next-generation;
- cutting-edge;
- game-changing;
- AI-powered magic;
- elevate your photography.

No marketing emoji.

Prefer concrete verbs:

- upload;
- look;
- compare;
- notice;
- explain;
- learn;
- try;
- improve.

### 2.5 Every animation must explain something

Animation is allowed only when it helps a user understand:

- how a photograph is read;
- how analysis moves from image to observation;
- how feedback appears inside the product;
- how one section gives way to the next.

Delete motion that exists only to make the page feel animated.

---

## 3. Visual Character

### 3.1 Keywords

- editorial;
- photographic;
- quiet;
- precise;
- confident;
- tactile;
- human;
- spacious;
- product-led.

### 3.2 What it must not feel like

- crypto landing page;
- AI wrapper;
- Tailwind component showcase;
- gaming UI;
- purple SaaS dashboard;
- futuristic control room;
- stock-template startup.

### 3.3 Shape language

Use a restrained radius system.

- Buttons: `10px`
- Small controls: `8px`
- Product screenshot frame: `16px`
- Large image containers: `18px`
- Utility chips only when the real product uses them: `999px`

Do not make every container rounded.

Text sections should usually exist directly on the page, not inside cards.

---

## 4. Typography

Use **Neue Haas Grotesk** as the landing page typeface.

If the production project has a properly licensed webfont, load the actual family and use it consistently. Do not silently replace it with a trendy display font.

Fallback stack:

```css
font-family: "Neue Haas Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif;
```

### 4.1 Type roles

| Role | Desktop | Mobile | Weight | Line height |
|---|---:|---:|---:|---:|
| Hero display | clamp(64px, 7vw, 112px) | 48–58px | 500 | 0.94–1.00 |
| Section display | clamp(48px, 5vw, 80px) | 38–46px | 500 | 1.00–1.08 |
| Section heading | 32–40px | 28–34px | 500 | 1.10 |
| Lead body | 20–22px | 18px | 400 | 1.50 |
| Body | 16–18px | 16px | 400 | 1.55 |
| Small/meta | 13–14px | 13px | 500 | 1.40 |

Body text must remain within the requested `1.5–1.6` line-height range.

### 4.2 Text width

- Hero headline: maximum `12–14ch`
- Section display: maximum `15ch`
- Lead paragraph: maximum `620px`
- General body text: maximum `65ch`

Do not stretch paragraphs across the whole viewport.

### 4.3 Emphasis

Use weight, size, whitespace, and the accent color sparingly.

Do not use gradient text.

Do not color individual words only because they look good. Accent-colored words should correspond to a product concept, interaction state, or meaningful emphasis.

---

## 5. Spacing and Vertical Rhythm

The current landing page should feel intentionally spacious, not accidentally empty.

Use a consistent 8px base spacing scale:

```text
8 / 16 / 24 / 32 / 48 / 64 / 80 / 96 / 128 / 160
```

### 5.1 Page gutters

- Desktop ≥ 1440px: `64px`
- Laptop 1024–1439px: `40px`
- Tablet: `28px`
- Mobile: `20px`

### 5.2 Section rhythm

Default section vertical padding:

- Desktop: `128px 0`
- Large editorial sections: up to `160px 0`
- Mobile: `80px 0`

Do not create a full viewport of empty space between sections.

Do not use `min-height: 100vh` on normal content sections.

Use viewport-height sections only when the scroll choreography genuinely needs a pinned stage.

### 5.3 Internal rhythm

Recommended spacing:

- Eyebrow → heading: `16px`
- Heading → lead copy: `24px`
- Lead copy → CTA/evidence: `32–48px`
- Text block → product visual: `64–80px`
- Related evidence items: `24px`

---

## 6. Grid

Use a maximum content width of `1440px`.

Main layout:

- 12-column desktop grid;
- `24px` gutters between columns;
- 4-column tablet adaptation;
- single-column mobile.

The page does not need to visibly expose the grid. It exists to keep alignment consistent across the hero, photographs, analysis overlays, workspace screenshot, and footer.

### 6.1 Alignment principle

The reference repeatedly uses a centered statement followed by a large product visual. Snapgrade should use the same rhythm, but alternate it with editorial left-aligned sections so the page does not become repetitive.

Suggested sequence:

```text
Centered hero
→ full-width evidence
→ editorial analysis section
→ product workspace
→ image-led explanation
→ adaptive analysis
→ final CTA
→ sticky reveal footer
```

---

## 7. Navigation

### Desktop

Navigation sits directly on the page background.

Structure:

```text
Snapgrade                           The Read  How it works  About     Analyze photo
```

Rules:

- no glass background;
- no glow;
- no floating capsule containing the whole navigation;
- no oversized nav height;
- active/hover state uses underline or accent text;
- primary CTA may use a solid accent fill.

Height: approximately `72px`.

The previously planned behavior remains valid: navigation may hide while scrolling down and return when the user scrolls up. This motion must be quick and functional, not theatrical.

### Mobile

- Snapgrade wordmark left;
- menu control right;
- full-height or simple sheet menu;
- flat background;
- no blurred overlay requirement.

---

## 8. Landing Page Structure

## 8.1 Hero — The Product Promise

### Purpose

Explain Snapgrade immediately and show that the product works on real photographs.

### Copy

**Headline:**

> Learn why a photo works.

**Body:**

> Upload a photograph. Snapgrade points out what works, what gets in the way, and what you can try next.

**Primary CTA:** `Analyze a photo`  
**Secondary CTA:** `See an example`

### Layout

Desktop:

- centered headline;
- short centered paragraph;
- two compact CTAs;
- large real product visual directly below;
- visual should begin within the first viewport on common laptop screens.

The user should not have to scroll through a full empty hero before seeing the product.

### Product visual

Use a real Snapgrade screenshot or a short muted product recording.

Preferred composition:

- one real photograph visible in the workspace;
- analysis already present or beginning to appear;
- enough UI chrome to prove this is the actual app;
- no invented dashboard shell around it.

If a still screenshot is used, keep it crisp and large enough to read.

### Motion

A subtle entrance is enough:

- copy fades/translates `8–16px`;
- product frame enters shortly after;
- no glowing halo;
- no floating particles;
- no orbiting shapes.

The hero must become fully readable in under roughly one second after load, respecting reduced-motion preferences.

---

## 8.2 The Read — How Snapgrade Looks at a Photograph

### Purpose

This is the central explanatory section. It should demonstrate the analysis engine using one real photograph instead of talking abstractly about AI.

### Copy

**Eyebrow:** `THE READ`

**Heading:**

> One photograph. Six ways to understand it.

**Body:**

> Snapgrade looks at the decisions inside the frame: where your eye goes, how the light behaves, what the color is doing, and whether the subject reads clearly.

### Six analysis lenses

Use real terminology, not marketing labels:

1. Composition
2. Light
3. Color
4. Focus
5. Subject separation
6. Visual timing / moment

If the actual engine uses different dimensions, the production UI and this page must use the real engine vocabulary.

### Layout

Use the previously established photograph-led scroll interaction:

- photograph is the main object;
- text is secondary;
- analysis annotations appear around or over the photograph;
- each annotation has a direct visual relationship to something visible in the image;
- the sequence advances only as fast as the user can read it.

Do not turn this into six feature cards.

### Motion

The motion should behave like someone examining a print:

- a region is indicated;
- the relevant observation appears;
- the visual focus shifts gently;
- previous information remains understandable;
- there is a short rest state after the final observation before the section releases scroll.

Avoid constant zooming, overshoot, springy cards, or decorative movement.

---

## 8.3 Product Evidence — Show the Actual Analysis

### Purpose

Replace generic feature-card content with undeniable product proof.

### Heading

> Here is what the feedback actually looks like.

### Body

> The result is not a list of compliments. Snapgrade tells you what it noticed, why it matters, and what you could change on the next frame.

### Evidence

Use one of these, in priority order:

1. a real 8–15 second product demo clip;
2. a real analysis screenshot paired with the source photograph;
3. a real before/after interaction showing the same analysis expanded;
4. a real result metric only after it can be verified from product data.

### Layout

A strong desktop composition:

```text
[ source photograph 4 cols ] [ actual Snapgrade analysis 8 cols ]
```

or

```text
[ full-width real product recording ]
```

No abstract AI icon in the middle.

No diagram of fake neural nodes.

No invented review count, confidence score, or productivity metric.

---

## 8.4 Adaptive Analysis — Different Frames Need Different Questions

### Purpose

Explain that Snapgrade does not apply an identical checklist to every genre or photograph.

### Heading

> Different photos need different questions.

### Body

> A portrait, a street photograph, and a landscape do not succeed for the same reasons. Snapgrade changes what it pays attention to based on the frame in front of it.

### Visual treatment

Use three **real photographs**, not three feature cards.

Preferred interaction:

- one large image stage;
- genre label changes as the image changes;
- 2–3 concrete analysis questions appear beside each image;
- transition between frames is direct and restrained.

Example questions:

**Portrait**
- Does the face separate from the background?
- Is the light helping the expression?
- Where does the eye land first?

**Street**
- Is there a clear subject or moment?
- Do background elements compete with it?
- Does the framing strengthen the timing?

**Landscape**
- Is there a visual path through the frame?
- Is the light creating useful depth?
- Does the foreground contribute or distract?

This proves adaptation more effectively than saying “adaptive AI.”

---

## 8.5 Workspace — Make the Product Feel Tangible

### Purpose

Give the user a clean look at the real Snapgrade interface.

### Heading

> Keep the photograph and the feedback in the same place.

### Body

> Review the image, read the reasoning, and go back to the parts of the frame that matter without jumping between disconnected screens.

### Visual

Use a current production screenshot.

The screenshot should be allowed to occupy most of the viewport width. It does not need decorative cards around it.

### Screenshot scroll reveal

If the established screenshot-scroll-reveal behavior is retained:

- begin when the complete section enters the viewport;
- reveal the screenshot quickly enough that the user can inspect it;
- after full reveal, keep it stable for a meaningful scroll interval;
- never make the screenshot disappear immediately after reaching readable scale;
- avoid overlong pinning.

A user should be able to stop scrolling and read the interface.

---

## 8.6 Beyond the Score — The Philosophy

### Purpose

Explain why Snapgrade is more useful than reducing a photograph to one number.

### Main line

> Every image has a reason.

### Supporting copy

> A score can tell you that something feels off. It cannot tell you what happened inside the frame. Snapgrade focuses on the decisions behind the result, so the feedback is useful on the next photograph too.

### Visual

Use a single strong photograph.

The animation should reveal decisions inside that photograph rather than adding abstract decoration around it.

Possible sequence:

- photograph appears normally;
- one compositional relationship is highlighted;
- one lighting relationship is highlighted;
- a short textual observation appears;
- all annotations clear;
- photograph remains as the final image.

Do not display fake numeric scores merely to destroy or explode them as an effect.

---

## 8.7 Final CTA

### Purpose

Make the next action obvious without a large SaaS sales panel.

### Copy

**Heading:**

> Bring a photograph. We’ll start there.

**Body:**

> Upload one frame and see what Snapgrade notices.

**CTA:** `Analyze a photo`

### Layout

- left-aligned or centered depending on preceding section;
- generous but not full-screen spacing;
- no gradient CTA panel;
- no decorative glow behind the button;
- optional real photograph crop on one side if it strengthens the composition.

---

## 8.8 Footer — Sticky Reveal

Retain the planned sticky-reveal behavior inspired by the Motion example, but keep the footer visually flat.

### Footer content

Recommended groups:

**Snapgrade**
- short sentence: `Photography feedback that explains the frame.`

**Product**
- Analyze
- How it works
- The Read

**Project**
- About
- Privacy
- Terms
- License

**Social**
- Instagram
- LinkedIn

Use the creator’s actual social destinations already established in the project implementation.

### License

Display the license clearly. Do not hide it inside legal fine print if open-source or source-available licensing is part of the project identity.

### Motion

The footer may be revealed as the last main section moves upward, but:

- no gradient curtain;
- no glow;
- no parallax objects;
- content must remain accessible without animation;
- reduced-motion mode should simply show the footer normally.

---

## 9. Image Direction

Photography is the strongest visual asset on the page. Treat it accordingly.

### Use

- authored-looking photographs;
- real photographs analyzed by Snapgrade;
- visually distinct genres;
- enough resolution to support large crops;
- images with obvious visual decisions that can be discussed.

### Avoid

- generic laptop-on-desk stock images;
- robots;
- neural-network graphics;
- floating camera icons;
- 3D purple AI cubes;
- fake screenshots;
- image collages added only to fill space.

### Cropping

Do not crop away the exact visual feature that the analysis text discusses.

Where analysis overlays are present, the image crop must stay stable while the corresponding observation is visible.

---

## 10. Buttons and Links

### Primary button

- background: accent `#315CFF`;
- text: white;
- no gradient;
- radius: `10px`;
- height: `44–48px`;
- horizontal padding: `20–24px`;
- hover: slightly darker solid accent or small translate, not glow.

### Secondary button

- transparent background;
- 1px neutral border;
- dark text;
- no glass effect.

### Text links

- dark text with underline on hover, or accent text;
- visible keyboard focus;
- no animated rainbow underline.

---

## 11. Borders, Shadows, and Depth

The page should not depend on effects for hierarchy.

### Borders

Use `1px solid #D8D5CE` when separation is needed.

### Shadows

Shadows are allowed only for real interface surfaces such as a product screenshot frame.

Maximum recommended style:

```css
box-shadow: 0 16px 40px rgba(17, 17, 17, 0.10);
```

Do not stack multiple colored shadows.

Do not use outer glows.

### Depth priority

Create hierarchy in this order:

1. scale;
2. whitespace;
3. alignment;
4. typography;
5. border;
6. shadow only when necessary.

---

## 12. Motion System

The reference feels polished partly because sections transition with confidence. Snapgrade should achieve that without visual excess.

### Allowed motion primitives

- opacity;
- translate X/Y;
- restrained scale (`0.98 → 1`);
- clipping/masking for image reveals;
- sticky positioning;
- scroll progress tied to meaningful analysis states;
- simple crossfade between real photographs.

### Avoid

- constant floating;
- looping orb movement;
- cursor-follow glow;
- magnetic cards unless needed for interaction;
- rotating gradients;
- 3D card tilts;
- particle fields;
- animated background noise;
- unnecessary page-wide parallax;
- animation on every headline.

### Timing

General UI transitions:

- hover: `120–180ms`;
- interface reveal: `250–450ms`;
- editorial section transition: `400–700ms`;
- scroll sequences: tied to content comprehension, not arbitrary distance.

### Easing

Prefer a clean ease-out such as:

```text
cubic-bezier(0.22, 1, 0.36, 1)
```

Use springs only where an actual draggable or physical interaction benefits from them.

### Reduced motion

Respect `prefers-reduced-motion`.

In reduced-motion mode:

- remove pin-heavy choreography;
- show content in final readable state;
- preserve all information;
- do not hide product evidence behind motion.

---

## 13. Copy System

All copy should pass this test:

> Would a photographer actually say this to another photographer?

### Preferred pattern

**Claim → concrete explanation → proof**

Example:

> Different photos need different questions.
>
> A portrait and a street photograph do not succeed for the same reasons.
>
> [Show the actual adaptive analysis on real images.]

### Avoid unsupported claims

Do not say:

- “industry-leading accuracy”;
- “10x better feedback”;
- “professional results every time”;
- “understands photography like a human”;
- “trusted by thousands”;

unless we have evidence and are willing to publish it.

### CTA language

Prefer:

- Analyze a photo
- See an example
- Try Snapgrade
- See the feedback
- Open the analysis

Avoid:

- Get Started Now
- Unlock Your Potential
- Begin Your Journey
- Experience the Future

---

## 14. Responsive Behavior

### Mobile principles

Mobile should be redesigned, not merely scaled down.

- single column;
- text alignment defaults to left except the hero if centered copy remains visually strong;
- remove long pinned scenes;
- preserve the photograph at useful size;
- stack annotations under the image when overlays become unreadable;
- make real UI screenshots horizontally scrollable only as a last resort;
- favor cropped, mobile-specific product captures when available.

### Hero mobile

- headline fits within roughly 3–4 lines;
- product proof should appear before excessive scrolling;
- buttons can stack at very narrow widths;
- no background effect is removed because none should exist in the first place.

### The Read mobile

Convert complex desktop choreography into a sequence:

```text
Photograph
→ observation 1
→ observation 2
→ observation 3
...
```

Keep the image present while the relevant copy changes when practical.

### Workspace mobile

Use a real mobile product view if Snapgrade has one. If the product is desktop-first, use a carefully cropped viewport that still communicates the real interface.

---

## 15. Accessibility

Minimum requirements:

- WCAG AA text contrast;
- visible keyboard focus;
- semantic heading hierarchy;
- buttons are real buttons;
- links are real links;
- all informative images have meaningful alt text;
- decorative images use empty alt text;
- video demos have a poster frame and accessible description;
- autoplay video must be muted;
- do not communicate analysis meaning through color alone;
- all scroll-driven content must still be available to screen readers;
- motion has a reduced-motion fallback.

Photography annotations should use both shape/position and text, not only accent color.

---

## 16. Performance Rules

A photography landing page can become heavy quickly. Product proof must not make it slow.

- Serve AVIF/WebP where appropriate.
- Use responsive image `srcset`.
- Do not preload every photograph.
- Preload only the true hero asset when beneficial.
- Lazy-load below-the-fold images.
- Use poster images for videos.
- Keep demo clips short and compressed.
- Avoid shipping animation libraries for effects that CSS can handle.
- Do not mount multiple hidden videos for responsive variants.
- Keep scroll listeners passive or use the animation library’s optimized primitives.

The visual target should not compromise Core Web Vitals.

---

## 17. Explicit Landing-Page Cleanup Audit

Before implementation is considered complete, search the codebase and remove anything that exists only because it looked good in a demo.

### Remove

- all gradients;
- all purple-to-blue backgrounds;
- all gradient text;
- all `backdrop-blur` / frosted glass effects;
- floating orbs;
- floating dots or star fields;
- decorative particles;
- blurred color blobs;
- glow rings;
- animated glow borders;
- fake dashboard screenshots;
- placeholder analytics panels;
- made-up charts;
- made-up user counts;
- fake testimonials;
- fake company logos;
- generic feature icon grids;
- decorative AI cubes;
- icon-only cards that do not show product behavior;
- animations with no explanatory purpose;
- duplicate CTAs;
- full-screen blank spacer sections;
- unused components left from Tailwind examples.

### Keep only when real

- screenshots;
- demo recordings;
- analyzed photographs;
- actual product UI;
- real measured metrics;
- real quotes from identified users with permission;
- real integrations if they exist;
- real social links;
- real legal/license links.

---

## 18. Reference-to-Snapgrade Translation

The provided reference should influence structure as follows:

| Reference pattern | Snapgrade translation |
|---|---|
| Large centered hero statement | Large direct photography-focused hero statement |
| Product UI immediately below hero | Real Snapgrade analysis UI immediately below hero |
| Dark modular scenes | Flat editorial sections on one warm background |
| Glowing purple cards | Real photographs or opaque product surfaces |
| Capability/card mosaic | Product screenshot, demo, or adaptive-photo sequence |
| Dramatic section pacing | Controlled scroll chapters with reading time |
| Product-first presentation | Product-first presentation retained |
| Decorative particles/glows | Removed completely |
| Gradient visual identity | Single blue accent only |

The target is **the reference’s confidence without the reference’s SaaS decoration**.

---

## 19. Recommended Page Order

Final landing-page sequence:

```text
1. Navigation
2. Hero — Learn why a photo works.
3. Real product evidence
4. The Read — One photograph. Six ways to understand it.
5. Workspace — real interface screenshot / reveal
6. Adaptive Analysis — Different photos need different questions.
7. Beyond the Score — Every image has a reason.
8. Final CTA — Bring a photograph. We’ll start there.
9. Sticky reveal footer
```

This order moves from:

```text
promise → proof → explanation → product → differentiation → philosophy → action
```

It avoids the common landing-page pattern of repeating claims before the user has seen the product.

---

## 20. Component Guidance

Suggested landing page components:

```text
LandingPage
├── LandingNav
├── HeroSection
│   └── ProductProof
├── ProductEvidenceSection
├── TheReadSection
│   ├── PhotographStage
│   └── AnalysisAnnotation
├── WorkspaceSection
│   └── ScreenshotReveal
├── AdaptiveAnalysisSection
│   └── PhotographSequence
├── BeyondTheScoreSection
├── FinalCTASection
└── StickyRevealFooter
```

Do not create `FeatureCard`, `GlowOrb`, `GradientBlob`, `ParticleField`, or generic `BentoCard` components for this page unless a real product requirement appears later.

---

## 21. Design Tokens

```css
:root {
  --landing-bg: #F4F2ED;
  --landing-text: #111111;
  --landing-muted: #62605B;
  --landing-border: #D8D5CE;
  --landing-accent: #315CFF;
  --landing-accent-hover: #244DE0;
  --landing-on-accent: #FFFFFF;

  --radius-control: 8px;
  --radius-button: 10px;
  --radius-media: 18px;

  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-5: 48px;
  --space-6: 64px;
  --space-7: 80px;
  --space-8: 96px;
  --space-9: 128px;
  --space-10: 160px;

  --page-max: 1440px;
}
```

These tokens are a starting point. Implementation may adjust exact values when tested against real content, but it should not add extra accent colors or effect tokens to recreate the removed aesthetic.

---

## 22. Definition of Done

The landing page design is complete when all of the following are true:

- [ ] No gradients remain.
- [ ] No glassmorphism remains.
- [ ] No purple/blue decorative background remains.
- [ ] One flat page background is used consistently.
- [ ] One accent color is used consistently.
- [ ] Neue Haas Grotesk is actually loaded or a licensing decision is explicitly documented.
- [ ] Body line-height is between 1.5 and 1.6.
- [ ] Section spacing follows a consistent rhythm.
- [ ] No accidental blank viewport-sized gaps remain.
- [ ] Hero copy explains the product in plain English.
- [ ] The hero shows real product proof.
- [ ] No generic three-feature-card row remains.
- [ ] All displayed screenshots are from the real Snapgrade product.
- [ ] No fake testimonials or metrics remain.
- [ ] The Read demonstrates analysis on a real photograph.
- [ ] Adaptive Analysis uses real images rather than generic icons.
- [ ] Workspace screenshot remains readable long enough to inspect.
- [ ] Beyond the Score supports the idea “Every image has a reason.”
- [ ] Every retained animation has an explanatory or navigational purpose.
- [ ] Reduced-motion mode remains fully usable.
- [ ] Mobile layout has been deliberately composed.
- [ ] Final CTA clearly leads to photo analysis.
- [ ] Sticky reveal footer contains real project, social, legal, and license information.

---

## 23. Final Design Principle

When deciding whether to add something to this landing page, ask:

> Does this help someone understand the photograph, understand Snapgrade, or trust that the product is real?

If the answer is no, remove it.
