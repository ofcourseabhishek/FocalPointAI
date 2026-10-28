"use client";;
/**
 * @author: @dorianbaffier
 * @description: Shadow Text
 * @version: 1.0.0
 * @date: 2026-10-22
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// How close the pointer has to come (px around the text) to take the light.
const NEAR = 160;
// Each frame the shadows close this much of the gap to where they should be.
const EASE = 0.14;
const MAX_STEPS = 40;

function sunAt(date) {
  const hours = date.getHours() + date.getMinutes() / 60;
  const t = (hours - 6) / 14;
  if (t < 0 || t > 1) {
    // Night: a faint, high moon.
    return { x: 0.5, height: 0.7, strength: 0.35 };
  }
  return { x: t, height: Math.sin(Math.PI * t), strength: 1 };
}

/** A long, soft shadow as one stack of text shadows. */
function cast(dx, dy, strength) {
  const length = Math.hypot(dx, dy);
  if (length < 0.5 || strength < 0.01) {
    return "none";
  }
  // Enough copies that they blur into one shadow instead of a comb.
  const steps = Math.round(Math.min(MAX_STEPS, Math.max(6, length / 2.5)));
  const spacing = length / steps;
  const parts = [];
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    // Sharp where the letter meets its shadow, softer the farther it falls.
    const blur = Math.max(spacing * 1.15, 0.3 + f * length * 0.08);
    const alpha = strength * (3.6 / steps) * (1 - f) ** 1.6;
    parts.push(
      `${(dx * f).toFixed(1)}px ${(dy * f).toFixed(1)}px ${blur.toFixed(1)}px rgb(var(--shadow) / calc(var(--shadow-strength) * ${alpha.toFixed(3)}))`
    );
  }
  return parts.join(",");
}

export function ShadowText({
  children,
  as: Tag = "p",
  clock = true,
  interactive = true,
  reach = 1.1,
  className
}) {
  const rootRef = useRef(null);
  const words = children.split(" ");

  // biome-ignore lint/correctness/useExhaustiveDependencies: children renders the letter spans the effect reads
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const letters = [...root.querySelectorAll("[data-letter]")];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Where each letter stands, and the shadow it casts now and should cast.
    let centers = [];
    let size = 16;
    const now = letters.map(() => ({ x: 0, y: 0, s: 0 }));
    const goal = letters.map(() => ({ x: 0, y: 0, s: 0 }));
    let pointer = null;
    let raf = 0;

    const measure = () => {
      const box = root.getBoundingClientRect();
      size = Number.parseFloat(getComputedStyle(root).fontSize) || 16;
      centers = letters.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left - box.left + r.width / 2,
          y: r.top - box.top + r.height * 0.6,
        };
      });
    };

    const aim = () => {
      const box = root.getBoundingClientRect();
      const longest = reach * size;
      const sun = clock
        ? sunAt(new Date())
        : { x: 0.55, height: 0.85, strength: 1 };
      for (let i = 0; i < letters.length; i++) {
        const c = centers[i];
        if (!c) {
          continue;
        }
        if (pointer) {
          // A lamp in your hand: the farther away, the longer the shadow.
          const dx = c.x - pointer.x;
          const dy = c.y - pointer.y;
          const d = Math.max(1, Math.hypot(dx, dy));
          const len = Math.min(longest, d * 0.22);
          goal[i] = { x: (dx / d) * len, y: (dy / d) * len, s: 1 };
        } else {
          // The sun is far away, so every shadow points the same way; a low
          // sun throws long ones.
          const lx = box.width * (sun.x * 1.6 - 0.3);
          const ly = -box.height * 3;
          const dx = c.x - lx;
          const dy = c.y - ly;
          const d = Math.hypot(dx, dy);
          const len = longest * (0.18 + (1 - sun.height) * 0.82);
          goal[i] = { x: (dx / d) * len, y: (dy / d) * len, s: sun.strength };
        }
      }
    };

    const paint = () => {
      for (let i = 0; i < letters.length; i++) {
        letters[i].style.textShadow = cast(now[i].x, now[i].y, now[i].s);
      }
    };

    const frame = () => {
      raf = 0;
      let moving = false;
      for (let i = 0; i < letters.length; i++) {
        const a = now[i];
        const b = goal[i];
        a.x += (b.x - a.x) * EASE;
        a.y += (b.y - a.y) * EASE;
        a.s += (b.s - a.s) * EASE;
        if (
          Math.abs(b.x - a.x) > 0.05 ||
          Math.abs(b.y - a.y) > 0.05 ||
          Math.abs(b.s - a.s) > 0.002
        ) {
          moving = true;
        }
      }
      paint();
      if (moving) {
        raf = requestAnimationFrame(frame);
      }
    };

    const update = () => {
      aim();
      if (reduceMotion) {
        for (let i = 0; i < letters.length; i++) {
          now[i] = { ...goal[i] };
        }
        paint();
      } else if (!raf) {
        raf = requestAnimationFrame(frame);
      }
    };

    measure();
    update();

    const resizeObserver = new ResizeObserver(() => {
      measure();
      update();
    });
    resizeObserver.observe(root);
    document.fonts?.ready.then(() => {
      measure();
      update();
    });
    // The sun moves on with the clock.
    const tick = window.setInterval(update, 30_000);

    const onMove = (event) => {
      const box = root.getBoundingClientRect();
      const x = event.clientX - box.left;
      const y = event.clientY - box.top;
      const near =
        x > -NEAR && y > -NEAR && x < box.width + NEAR && y < box.height + NEAR;
      if (near) {
        pointer = { x, y };
        update();
      } else if (pointer) {
        pointer = null;
        update();
      }
    };
    const onLeave = () => {
      if (pointer) {
        pointer = null;
        update();
      }
    };
    if (interactive) {
      window.addEventListener("pointermove", onMove);
      document.documentElement.addEventListener("pointerleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(tick);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [children, clock, interactive, reach]);

  return (
    <Tag
      className={cn(
        "[--shadow-strength:1] [--shadow:24_24_27] dark:[--shadow-strength:1.7] dark:[--shadow:0_0_0]",
        className
      )}
      ref={rootRef}>
      <span className="sr-only">{children}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <span key={`${word}-${w.toString()}`}>
            <span className="inline-block whitespace-nowrap">
              {[...word].map((char, c) => (
                <span className="inline-block" data-letter="" key={`${char}-${c.toString()}`}>
                  {char}
                </span>
              ))}
            </span>
            {w < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}
