"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import type { MotionValue } from "framer-motion";
import { useLenis } from "lenis/react";
import { ImageReveal } from "./ImageReveal";
import { ReadAtlasOverlay, readAtlasTileUrl } from "./ReadAtlasOverlay";
import { getReadStageAtProgress, getReadStageSeekProgress, isReadIntentSettled, type ReadStage } from "./read-timeline";
import styles from "./ReadSection.module.css";

const readings = [
  { num: "01", title: "COMPOSITION", desc: "Framing, balance, subject placement,\nand visual hierarchy.", meta: "READ 01 / 06\nVISUAL ARCHITECTURE" },
  { num: "02", title: "LIGHT", desc: "Direction, contrast, exposure,\nand highlight and shadow behavior.", meta: "READ 02 / 06\nTONAL STRUCTURE" },
  { num: "03", title: "COLOR", desc: "Palette, harmony, temperature,\nand separation.", meta: "READ 03 / 06\nPALETTE DYNAMICS" },
  { num: "04", title: "FOCUS", desc: "Sharpness, depth of field,\nand focal priority.", meta: "READ 04 / 06\nSHARPNESS & ATTENTION" },
  { num: "05", title: "SUBJECT", desc: "What draws attention and\nhow clearly the subject reads.", meta: "READ 05 / 06\nSUBJECT CLARITY" },
  { num: "06", title: "INTENT", desc: "Mood, context, and emotional read —\nand whether the choices support the image's purpose.", meta: "READ 06 / 06\nPHOTOGRAPHIC INTENT" },
] as const;

type AssetStatus = "idle" | "loading" | "ready" | "failed";

function loadImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new window.Image();
    // Decorative downloads never gate the reading. A slow connection should
    // still reveal its overlay when it succeeds, rather than fail on a timer.
    image.decoding = "async";
    image.onload = () => {
      if (typeof image.decode === "function") {
        image.decode().then(resolve, resolve);
      } else resolve();
    };
    image.onerror = () => reject(new Error(`Could not load Read overlay: ${url}`));
    image.src = url;
  });
}

function useReadAtlasAssets(
  shouldPreload: boolean,
) {
  const [statuses, setStatuses] = useState<AssetStatus[]>(() => readings.map(() => "idle"));
  const started = useRef(new Set<number>());

  useEffect(() => {
    if (!shouldPreload) return;
    readings.forEach((_, index) => {
      if (started.current.has(index)) return;
      started.current.add(index);
      setStatuses((current) => current.map((status, i) => (i === index ? "loading" : status)));
      void loadImage(readAtlasTileUrl(index)).then(
        () => {
          setStatuses((current) => current.map((status, i) => (i === index ? "ready" : status)));
        },
        () => {
          setStatuses((current) => current.map((status, i) => (i === index ? "failed" : status)));
        },
      );
    });
  }, [shouldPreload]);

  return statuses;
}

function ReadControls({ activeStage, onSelect }: { activeStage: number; onSelect: (index: number, immediate?: boolean) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 md:flex md:flex-wrap md:gap-x-5 md:gap-y-1 lg:gap-x-7">
      {readings.map((reading, index) => (
        <button
          key={reading.num}
          aria-pressed={activeStage === index}
          aria-label={`Show ${reading.title} reading`}
          onClick={(event) => onSelect(index, event.detail === 0)}
          className={`min-h-11 border px-1.5 py-2 font-mono text-[9px] uppercase leading-tight tracking-[0.12em] transition-[border-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#0a0a0a] active:scale-[0.97] focus-visible:active:scale-100 focus-visible:transition-none motion-reduce:active:scale-100 md:min-h-11 md:border-x-0 md:border-t-0 md:px-0 md:pb-1 md:pt-1 lg:text-[10px] lg:tracking-[var(--landing-label-tracking)] ${activeStage === index ? "border-white/85 text-white" : "border-white/20 text-white/75 hover:border-white/55 hover:text-white"}`}
        >
          <span className="mr-1 text-white/65 lg:hidden">{reading.num}</span>{reading.title}
        </button>
      ))}
    </div>
  );
}

function LensDetails({ stage, mobile = false }: { stage: number; mobile?: boolean }) {
  const reading = readings[stage];
  if (mobile) {
    return (
      <div aria-live="polite" aria-atomic="true">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/80">
          <span className="mr-2 text-white/70">{reading.num}</span>{reading.title}
        </p>
        <p className="mt-1 whitespace-pre-line text-[13px] leading-[1.35] text-white/80">{reading.desc}</p>
      </div>
    );
  }
  return (
    <div aria-live="polite" aria-atomic="true">
      <span className="font-mono text-[11px] text-white/75 lg:hidden">{reading.num}</span>
      <p className="hidden font-mono text-[11px] tracking-[var(--landing-label-tracking)] text-[var(--landing-text-meta)] lg:block">READ {reading.num} / 06</p>
      <h3 className="mt-1 text-[11px] font-medium tracking-[0.2em] text-white lg:mt-3 lg:tracking-[var(--landing-label-tracking)] lg:text-[var(--landing-text-primary)]">{reading.title}</h3>
      <p className="mt-3 whitespace-pre-line text-sm leading-[1.45] text-white/80 lg:max-w-[50ch] lg:text-base lg:text-[var(--landing-text-body)]">{reading.desc}</p>
      <p className="mt-6 whitespace-pre-line font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-white/70 lg:hidden">{reading.meta}</p>
    </div>
  );
}

export default function TheRead({ readingProgress, isActive, pinTrackRef }: { readingProgress: MotionValue<number>; isActive: boolean; pinTrackRef: RefObject<HTMLDivElement | null> }) {
  const [displayedStage, setDisplayedStage] = useState(0);
  const [shouldAnimateOverlay, setShouldAnimateOverlay] = useState(false);
  const mobileStageRef = useRef<HTMLDivElement>(null);
  const isMobileRef = useRef(false);
  const isPinnedDesktopRef = useRef(false);
  const progressSourceRef = useRef<"desktop" | "mobile" | "static">("static");
  const lenis = useLenis();
  const { scrollYProgress: mobileScrollProgress } = useScroll({
    target: mobileStageRef,
    offset: ["start start", "end end"],
  });
  const mobileReadingProgress = useTransform(mobileScrollProgress, [0.08, 0.94], [0, 1]);
  const scrollStageRef = useRef(0);
  const statuses = useReadAtlasAssets(isActive);
  const shouldReduceMotion = useReducedMotion();

  const selectDisplayedStage = useCallback((stage: number, immediate = false) => {
    // Copy and controls communicate the state immediately. Atlas images are
    // decorative and may arrive later without delaying this state change.
    setDisplayedStage(stage);
    setShouldAnimateOverlay(!immediate);
  }, []);

  const updateDesktopScrollStage = useCallback((latest: number, force = false) => {
    if (isMobileRef.current || !isPinnedDesktopRef.current) return;
    const nextStage = getReadStageAtProgress(latest);
    if (force || nextStage !== scrollStageRef.current) {
      scrollStageRef.current = nextStage;
      selectDisplayedStage(nextStage);
    }
    // Intent's shared settle checkpoint is a rendering boundary too: once it
    // is crossed, finish any interrupted decorative fade before the dwell.
    if (isReadIntentSettled(latest)) setShouldAnimateOverlay(false);
  }, [selectDisplayedStage]);

  const updateMobileScrollStage = useCallback((latest: number, force = false) => {
    if (!isMobileRef.current) return;
    const nextStage = Math.max(0, Math.min(readings.length - 1, Math.floor(latest * readings.length)));
    if (force || nextStage !== scrollStageRef.current) {
      scrollStageRef.current = nextStage;
      selectDisplayedStage(nextStage);
    }
  }, [selectDisplayedStage]);

  useMotionValueEvent(readingProgress, "change", (latest) => {
    updateDesktopScrollStage(latest);
  });
  useMotionValueEvent(mobileReadingProgress, "change", (latest) => {
    updateMobileScrollStage(latest);
  });

  useEffect(() => {
    const mobileMedia = window.matchMedia("(max-width: 767px)");
    const pinnedDesktopMedia = window.matchMedia("(min-width: 1024px) and (min-height: 600px), (min-width: 768px) and (min-height: 701px)");
    const updateLayout = () => {
      isMobileRef.current = mobileMedia.matches;
      isPinnedDesktopRef.current = pinnedDesktopMedia.matches;
      const nextSource = mobileMedia.matches ? "mobile" : pinnedDesktopMedia.matches ? "desktop" : "static";
      const sourceChanged = progressSourceRef.current !== nextSource;
      progressSourceRef.current = nextSource;

      if (mobileMedia.matches) {
        updateMobileScrollStage(mobileReadingProgress.get(), sourceChanged);
      } else if (pinnedDesktopMedia.matches) {
        updateDesktopScrollStage(readingProgress.get(), sourceChanged);
      }
    };

    updateLayout();
    mobileMedia.addEventListener("change", updateLayout);
    pinnedDesktopMedia.addEventListener("change", updateLayout);
    return () => {
      mobileMedia.removeEventListener("change", updateLayout);
      pinnedDesktopMedia.removeEventListener("change", updateLayout);
    };
  }, [mobileReadingProgress, readingProgress, updateDesktopScrollStage, updateMobileScrollStage]);

  const selectStage = (index: number, immediate = false) => {
    selectDisplayedStage(index, immediate);

    const pinTrack = pinTrackRef.current;
    const isPinnedNow = Boolean(pinTrack
      && isPinnedDesktopRef.current
      && !isMobileRef.current
      && pinTrack.getBoundingClientRect().top <= 0
      && pinTrack.getBoundingClientRect().bottom >= window.innerHeight);

    if (!isPinnedNow || !pinTrack) return;

    const seekProgress = getReadStageSeekProgress(index as ReadStage);
    const target = window.scrollY + pinTrack.getBoundingClientRect().top
      + (pinTrack.offsetHeight - window.innerHeight) * seekProgress;

    // Match the selected reading to the physical track before the next wheel
    // frame; Lenis avoids native scrolling being overwritten by its inertia.
    scrollStageRef.current = index;
    readingProgress.set(seekProgress);
    if (lenis) {
      lenis.scrollTo(target, { immediate: true, force: true });
    } else {
      window.scrollTo({ top: target, behavior: "auto" });
    }
  };
  const selectedReading = readings[displayedStage];
  const statusMessage = `${selectedReading.title} reading selected`;

  // Stable layers make rapid reversals interruptible. Keyboard selection removes
  // the transition from every layer, including the previously selected lens.
  const activeOverlay = readings.map((reading, index) => statuses[index] === "ready" ? (
      <div
        key={reading.num}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          opacity: displayedStage === index ? 0.8 : 0,
          transition: shouldAnimateOverlay && !shouldReduceMotion
            ? "opacity 180ms cubic-bezier(0.23, 1, 0.32, 1)"
            : "none",
        }}
      >
        <ReadAtlasOverlay stage={index} />
      </div>
  ) : null);

  return (
    <section className={`${styles.pinnedScene} z-30 bg-[#0a0a0a] font-sans text-[#f3f1ea] selection:bg-white/25 selection:text-white`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.075),transparent_42%),linear-gradient(180deg,#111210_0%,#0a0a0a_72%)]" />

      <div className="relative z-10 px-6 py-10 sm:px-8 md:hidden">
        <p className="border-l border-white/40 pl-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/80">THE READ</p>
        <h2 className="mt-5 max-w-[18rem] text-[clamp(2rem,10vw,2.8rem)] font-medium leading-[0.93] tracking-[-0.04em] text-[#f3f1ea]"><span className="block">One photograph.</span><span className="block text-white/75">Six ways to understand it.</span></h2>
        <p className="mt-4 max-w-[31rem] text-[15px] leading-[1.5] text-white/80">Snapgrade looks beyond a single score. It reads the technical and visual decisions that shape how a photograph feels.</p>
      </div>

      <div ref={mobileStageRef} className="relative z-10 h-[165svh] md:hidden">
        <div className="sticky top-0 flex min-h-svh flex-col overflow-y-auto px-6 py-3 sm:px-8">
          <div className="relative ml-auto aspect-[2/3] shrink-0 overflow-hidden rounded-sm border border-white/15 bg-[#161715] shadow-[0_22px_60px_rgba(0,0,0,0.5)]" style={{ width: "min(100%, calc((100svh - 16rem) * 2 / 3), 21.333rem)" }}>
            <ImageReveal overlay={activeOverlay} />
          </div>
          <div className="mt-3 border-t border-white/20 pt-2"><LensDetails stage={displayedStage} mobile /></div>
          <div className="mt-2 border-t border-white/20 pt-2">
            <ReadControls activeStage={displayedStage} onSelect={selectStage} />
            <p className="sr-only" aria-live="polite">{statusMessage}</p>
          </div>
        </div>
      </div>

      <div className="absolute right-[clamp(3rem,5vw,6rem)] top-1/2 z-10 hidden aspect-[2/3] h-[min(88svh,calc(50vw*1.5),56rem)] w-auto -translate-y-1/2 origin-center overflow-hidden rounded-sm border border-white/10 bg-[#161715] shadow-[0_28px_85px_rgba(0,0,0,0.55)] md:block lg:right-[var(--page-inset)] lg:aspect-[3/4] lg:h-[min(80svh,calc(44vw*4/3),50rem)] lg:border-[var(--landing-rule-dark)]">
        <ImageReveal overlay={activeOverlay} />
      </div>

      <div className="relative z-20 mx-auto hidden h-full min-h-svh w-full max-w-[96rem] flex-col px-12 pb-9 pt-9 md:flex lg:max-w-none lg:px-[var(--page-inset)] lg:pb-12 lg:pt-8 [@media(min-width:1024px)_and_(min-height:600px)_and_(max-height:700px)]:pb-5 [@media(min-width:1024px)_and_(min-height:600px)_and_(max-height:700px)]:pt-5">
        <p className="shrink-0 border-l border-white/40 pl-3 font-mono text-[10px] uppercase tracking-[0.28em] text-white/80 md:mr-[60%] lg:border-0 lg:pl-0 lg:tracking-[var(--landing-label-tracking)] lg:text-[var(--landing-text-meta)]">THE READ</p>
        <div className="order-2 shrink-0 md:mr-[60%] lg:order-1 lg:mt-12 lg:mr-[56%] [@media(min-width:1024px)_and_(min-height:600px)_and_(max-height:700px)]:mt-6">
          <h2 className="max-w-2xl text-[clamp(2rem,4.4vw,4.4rem)] font-medium leading-[0.93] tracking-[-0.04em] text-[#f3f1ea] lg:text-[clamp(2.6rem,4.4vw,4.75rem)] lg:leading-[0.98] lg:text-[var(--landing-text-primary)] [@media(min-width:1024px)_and_(min-height:600px)_and_(max-height:700px)]:text-[clamp(2.3rem,3.6vw,3rem)]"><span className="block">One photograph.</span><span className="block text-white/75 lg:text-[var(--landing-text-body)]">Six ways to understand it.</span></h2>
          <p className="mt-4 max-w-[39rem] text-[17px] leading-[1.55] text-white/80 lg:mt-6 lg:max-w-[50ch] lg:text-[var(--landing-text-body)] [@media(min-width:1024px)_and_(min-height:600px)_and_(max-height:700px)]:mt-3 [@media(min-width:1024px)_and_(min-height:600px)_and_(max-height:700px)]:text-[15px] [@media(min-width:1024px)_and_(min-height:600px)_and_(max-height:700px)]:leading-[1.45]">Snapgrade looks beyond a single score. It reads the technical and visual decisions that shape how a photograph feels.</p>
        </div>
        <div className="relative order-1 flex min-h-0 flex-1 items-center py-7 lg:order-2 [@media(min-width:1024px)_and_(min-height:600px)_and_(max-height:700px)]:py-4"><div className="w-[40%] self-center lg:min-h-[10rem]"><LensDetails stage={displayedStage} /></div></div>
        <div className="order-3 mt-6 shrink-0 border-t border-white/20 pt-4 md:mr-[60%] lg:mr-[56%] lg:border-[var(--landing-rule-dark)] [@media(min-width:1024px)_and_(min-height:600px)_and_(max-height:700px)]:mt-3 [@media(min-width:1024px)_and_(min-height:600px)_and_(max-height:700px)]:pt-3">
          <ReadControls activeStage={displayedStage} onSelect={selectStage} />
          <p className="sr-only" aria-live="polite">{statusMessage}</p>
        </div>
      </div>
    </section>
  );
}

export { TheRead };
