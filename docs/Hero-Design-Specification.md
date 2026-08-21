# Snapgrade Landing Page — Hero Design Specification

## Overview

The Snapgrade hero section introduces the product as a premium photography learning experience.

The goal is to communicate:

> Every photograph contains intentional decisions. Snapgrade helps you understand them.

The hero should feel less like an AI product landing page and more like an editorial photography experience.

Design inspiration:

```
Apple product simplicity
+
Photography magazine editorial design
+
Interactive image critique experience
```

---

# Core Design Direction

## Visual Style

Primary direction:

**A — Single iconic photograph + subtle analysis overlays**

Combined with:

**C — Editorial magazine cover style**

The hero should focus on one powerful photograph rather than dashboards, metrics, or product screenshots.

---

# Hero Structure

```
------------------------------------------------

                 Navigation


             SEE BEYOND THE FRAME


          Every image
          has a reason.


      Snapgrade reveals the choices
      behind every photograph.


          [ Analyze a photograph ]
          [ Explore how it works ]


              Large photograph


------------------------------------------------
```

---

# Hero Copy

## Eyebrow

```
SEE BEYOND THE FRAME
```

Purpose:
- Creates curiosity
- Establishes photography philosophy
- Avoids technical/product language

---

## Main Heading

```
Every image
has a reason.
```

Typography:

- Large editorial scale
- Medium weight
- Tight line height
- Strong whitespace

Desktop:

```
96px - 120px
line-height: 0.9
```

---

## Supporting Text

```
Snapgrade reveals the choices behind every photograph.
```

Purpose:
- Explains value immediately
- Avoids mentioning AI
- Positions Snapgrade as a learning tool

---

# CTA

## Primary

```
Analyze a photograph
```

Purpose:
- Clear action
- Connected to product experience

---

## Secondary

```
Explore how it works
```

Purpose:
- Allows curious visitors to continue learning without uploading immediately

---

# Hero Image

## Concept

One photograph should dominate the hero.

The image should feel like:

- A photograph worth studying
- A frame from a photography book
- Something with intentional choices hidden inside it

Suitable categories:

- Street photography
- Portrait photography
- Cinematic landscapes

---

# Image Treatment

Initial state:

- Slightly softened
- Subtle blur or reduced contrast
- Calm entrance animation

Final state:

- Fully revealed
- Sharp details visible
- Analysis layers removed or minimized

---

# Interactive Reveal

The hero image should communicate that photographs contain multiple decisions.

## Stage 1 — Composition

Reveal:

```
WHY THIS FRAME?
```

Visual elements:

- Composition guides
- Balance indicators
- Framing hints

---

## Stage 2 — Light

Reveal:

```
LIGHT CHANGES THE STORY
```

Visual elements:

- Light direction
- Shadow areas
- Highlight relationships

---

## Stage 3 — Timing

Reveal:

```
THE MOMENT WAS CHOSEN
```

Visual elements:

- Subject movement
- Timing cues
- Moment selection

---

## Stage 4 — Emotion

Reveal:

```
THE FRAME FEELS BEFORE IT EXPLAINS
```

Visual elements:

- Minimal emotional interpretation
- Connection between technical choices and feeling

---

# Animation Behaviour

## Entry

When the page loads:

- Typography appears first
- Image enters slowly
- Avoid aggressive motion

---

## Scroll Interaction

Animations should begin when the complete hero content enters the viewport.

Use:

- Framer Motion
- Motion.dev patterns
- Lenis smooth scrolling

---

# Component Structure

```
components/
└── landing/
    ├── Hero.tsx
    ├── HeroImage.tsx
    ├── ImageReveal.tsx
    └── DecisionMarkers.tsx
```

---

# Layout Requirements

## Desktop

Requirements:

- Full viewport hero
- Large typography
- Generous whitespace
- Photograph as the visual anchor

Height:

```
100svh minimum
```

---

## Mobile

Requirements:

- Preserve editorial feeling
- Avoid excessive animations
- Maintain clear hierarchy

Order:

```
Eyebrow

Heading

Description

CTA

Image
```

---

# Technical Requirements

Stack:

- Next.js
- Tailwind CSS
- Framer Motion
- Motion.dev
- Lenis smooth scrolling

---

# Acceptance Criteria

- [ ] Hero communicates Snapgrade's purpose within 5 seconds
- [ ] Photograph is the primary visual focus
- [ ] Design feels editorial, not SaaS
- [ ] No dashboard or AI clichés
- [ ] Analysis overlays reveal naturally
- [ ] Typography feels premium and minimal
- [ ] Animations start at correct viewport timing
- [ ] Mobile experience remains elegant
- [ ] Hero connects smoothly to the next section

---

# Final Experience Goal

The visitor should leave the first viewport thinking:

> "I want to understand why this photograph works."