"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useLenis } from "lenis/react";
import Image from "next/image";
import { READ_IMAGE_URL } from "./read-image";
import {
  DESKTOP_HERO_TIMELINE,
  getActiveHeroStage,
  HERO_ANALYSIS_BODY_STAGGER,
  type HeroStage,
} from "./hero-timeline";
import { HeroProcessOverlays } from "./HeroProcessOverlays";

// Locked product copy. Do not change without an explicit user request.
const LOCKED_HERO_COPY = {
  eyebrow: "FEEDBACK, NOT SCORES",
  description: "See what worked, what didn't, and why.",
} as const;

const processStages = [
  {
    number: "01",
    title: "Observe",
    description:
      "Snapgrade starts with what is actually in the frame — subjects, edges, light, spacing and visual weight.",
  },
  {
    number: "02",
    title: "Prioritize",
    description:
      "It works out what attracts attention first, what supports it, and what starts to compete with it.",
  },
  {
    number: "03",
    title: "Interpret",
    description:
      "Those signals become photographic decisions — balance, depth, emphasis, rhythm and separation.",
  },
  {
    number: "04",
    title: "Direct",
    description:
      "Then the read becomes useful feedback: what is working, what is getting in the way, and what to try next.",
  },
] as const;

type HeroTimelineStage = (typeof DESKTOP_HERO_TIMELINE)[number];

function LockedHeroHeading() {
  return (
    <>
      Better pictures
      <br />
      start with
      <br />
      <span className="opacity-70">understanding.</span>
    </>
  );
}

function Wordmark({ emphasis = false }: { emphasis?: boolean }) {
  return (
    <div className="overflow-hidden" aria-label="Snapgrade">
      <span
        className={`hero-wordmark block font-sans leading-none tracking-[-0.035em] ${
          emphasis
            ? "text-[28px] font-medium text-[rgba(242,242,240,0.88)]"
            : "text-[23px] font-medium text-white/95"
        }`}
      >
        snapgrade
      </span>
    </div>
  );
}

function FeedbackButton({ id }: { id: string }) {
  return (
    <button
      id={id}
      type="button"
      className="feedback-button group relative isolate inline-flex min-h-12 w-fit items-center justify-center border border-white/90 bg-transparent px-7 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.17em] text-[#08090a] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#08090a]"
    >
      <span
        aria-hidden="true"
        className="feedback-button-layer absolute inset-0 -z-10 h-full w-full bg-[#f3f1e9] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
      />
      <span className="relative flex items-center gap-3">
        GET FEEDBACK
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M1 6H11M11 6L6 1M11 6L6 11"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

function FeedbackLink({ id, href }: { id: string; href: string }) {
  return (
    <a
      id={id}
      href={href}
      className="inline-flex min-h-14 w-fit items-center justify-center bg-[#f3f1e9] px-8 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.17em] text-[#08090a] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#08090a] focus-visible:active:scale-100 focus-visible:transition-none"
    >
      <span className="relative flex items-center gap-3.5">
        GET FEEDBACK
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M1 7H13M13 7L7 1M13 7L7 13"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </a>
  );
}

function StageFeedback({
  stage,
  timeline,
  scrollYProgress,
  shouldReduceMotion,
  isActive,
}: {
  stage: (typeof processStages)[number];
  timeline: HeroTimelineStage;
  scrollYProgress: MotionValue<number>;
  shouldReduceMotion: boolean;
  isActive: boolean;
}) {
  const indexOpacity = useTransform(
    scrollYProgress,
    [timeline.enterAt, timeline.settledAt, timeline.leaveAt, timeline.endAt],
    [0, 1, 1, 0],
  );
  const indexTransform = useTransform(
    scrollYProgress,
    [timeline.enterAt, timeline.settledAt, timeline.leaveAt, timeline.endAt],
    ["translate3d(0, 10px, 0)", "translate3d(0, 0, 0)", "translate3d(0, 0, 0)", "translate3d(0, -10px, 0)"],
  );
  const headlineOpacity = useTransform(
    scrollYProgress,
    [timeline.enterAt + 0.003, timeline.settledAt + 0.003, timeline.leaveAt, timeline.endAt],
    [0, 1, 1, 0],
  );
  const headlineTransform = useTransform(
    scrollYProgress,
    [timeline.enterAt + 0.003, timeline.settledAt + 0.003, timeline.leaveAt, timeline.endAt],
    ["translate3d(0, 10px, 0)", "translate3d(0, 0, 0)", "translate3d(0, 0, 0)", "translate3d(0, -10px, 0)"],
  );
  const bodyOpacity = useTransform(
    scrollYProgress,
    [timeline.enterAt + HERO_ANALYSIS_BODY_STAGGER, timeline.settledAt + HERO_ANALYSIS_BODY_STAGGER, timeline.leaveAt, timeline.endAt],
    [0, 1, 1, 0],
  );
  const bodyTransform = useTransform(
    scrollYProgress,
    [timeline.enterAt + HERO_ANALYSIS_BODY_STAGGER, timeline.settledAt + HERO_ANALYSIS_BODY_STAGGER, timeline.leaveAt, timeline.endAt],
    ["translate3d(0, 10px, 0)", "translate3d(0, 0, 0)", "translate3d(0, 0, 0)", "translate3d(0, -10px, 0)"],
  );
  const reducedStyle = { opacity: isActive ? 1 : 0, transform: "translate3d(0, 0, 0)" };

  return (
    <article aria-hidden={!isActive} inert={!isActive} className="absolute bottom-0 left-0">
      <motion.p
        className="font-mono text-[10px] uppercase tracking-[var(--landing-label-tracking)] text-[rgba(242,242,240,0.48)]"
        style={shouldReduceMotion ? reducedStyle : { opacity: indexOpacity, transform: indexTransform }}
      >
        {stage.number} / 04
      </motion.p>
      <motion.h2
        className="mt-4 text-[clamp(2.25rem,3.4vw,4rem)] font-medium leading-[0.92] tracking-[-0.04em] text-[#f2f2f0]"
        style={shouldReduceMotion ? reducedStyle : { opacity: headlineOpacity, transform: headlineTransform }}
      >
        {stage.title}
      </motion.h2>
      <motion.p
        className="mt-4 max-w-md text-base leading-relaxed text-[rgba(242,242,240,0.68)] lg:text-lg"
        style={shouldReduceMotion ? reducedStyle : { opacity: bodyOpacity, transform: bodyTransform }}
      >
        {stage.description}
      </motion.p>
    </article>
  );
}

function MobileAnalysis() {
  return (
    <section id="critique-analysis-mobile" aria-labelledby="mobile-analysis-heading" className="px-5 pb-16 pt-14 sm:px-8">
      <h2 id="mobile-analysis-heading" className="max-w-sm text-3xl font-medium leading-[0.98] tracking-[-0.04em] text-[#f3f1e9]">
        From photograph to useful feedback.
      </h2>
      <ol className="mt-10 border-t border-white/15">
        {processStages.map((stage) => (
          <li key={stage.number} className="grid grid-cols-[3.5rem_1fr] gap-3 border-b border-white/15 py-6">
            <span className="font-mono text-[10px] tracking-[0.16em] text-white/60">{stage.number} / 04</span>
            <div>
              <h3 className="text-lg font-medium tracking-[-0.02em] text-[#f3f1e9]">{stage.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{stage.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const lenis = useLenis();
  const [activeStage, setActiveStage] = useState<HeroStage>(0);
  const [hasFinalStageExited, setHasFinalStageExited] = useState(false);
  const analyzerUrl =
    process.env.NEXT_PUBLIC_ANALYZER_URL || "https://snapgrade-app.vercel.app";
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });
  const [introTimeline, ...processTimeline] = DESKTOP_HERO_TIMELINE;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const nextStage = getActiveHeroStage(latest);
    setActiveStage((current) => (current === nextStage ? current : nextStage));
    setHasFinalStageExited((current) => {
      const next = latest >= processTimeline[3].endAt;
      return current === next ? current : next;
    });
  });

  const introOpacity = useTransform(scrollYProgress, [introTimeline.enterAt, introTimeline.leaveAt, introTimeline.endAt, 1], [1, 1, 0, 0]);
  const introTransform = useTransform(
    scrollYProgress,
    [introTimeline.leaveAt, introTimeline.endAt, 1],
    ["translate3d(0, 0, 0)", "translate3d(0, -10px, 0)", "translate3d(0, -10px, 0)"],
  );
  const progressScaleX = useTransform(scrollYProgress, [processTimeline[0].enterAt, processTimeline[3].endAt], [0, 1]);
  const progressOpacity = useTransform(scrollYProgress, [processTimeline[0].enterAt, processTimeline[0].activateAt], [0, 1]);
  const revealIntroForFocusedCta = () => {
    const hero = containerRef.current;
    if (!hero) return;

    // Focus may reach this CTA after the intro has scrolled away. Update the
    // visual state first, then use Lenis' immediate path so the focused target
    // is never left in an opacity-zero frame.
    scrollYProgress.set(0);
    setActiveStage(0);
    setHasFinalStageExited(false);
    if (lenis) {
      lenis.scrollTo(hero, { immediate: true, force: true });
      return;
    }

    hero.scrollIntoView({ block: "start", behavior: "auto" });
  };

  return (
    <>
      <section className="bg-[#08090a] font-sans text-[#e4e4e2] selection:bg-white/30 selection:text-white [@media(min-width:1024px)_and_(min-height:600px)]:hidden">
        <div className="px-5 pb-12 pt-8 sm:px-8 sm:pt-10">
          <Wordmark />
          <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">{LOCKED_HERO_COPY.eyebrow}</p>
          <h1 className="mt-7 max-w-3xl text-[clamp(3rem,13vw,5rem)] font-medium leading-[0.93] tracking-[-0.04em] text-[#f3f1e9]"><LockedHeroHeading /></h1>
          <p className="mt-7 max-w-md text-base leading-relaxed text-white/65">{LOCKED_HERO_COPY.description}</p>
          <div className="mt-9 flex flex-col items-start gap-7">
            <FeedbackButton id="feedback-mobile" />
            <a href="#critique-analysis-mobile" className="text-sm text-white/65 underline decoration-white/35 underline-offset-4 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#08090a]">See how it works</a>
          </div>
        </div>
        <figure className="relative mx-5 aspect-[4/5] overflow-hidden sm:mx-8">
          <Image src={READ_IMAGE_URL} alt="Street photograph prepared for a visual critique" fill priority className="object-cover" sizes="(max-width: 1023px) calc(100vw - 2.5rem), 42vw" />
        </figure>
        <MobileAnalysis />
      </section>

      <section ref={containerRef} aria-label="Interactive photographic feedback process" className="relative hidden h-[420svh] bg-[#08090a] font-sans text-[#e4e4e2] selection:bg-white/30 selection:text-white [@media(min-width:1024px)_and_(min-height:600px)]:block">
        <div className="sr-only">
          <h2>From photograph to useful feedback.</h2>
          <ol>{processStages.map((stage) => <li key={stage.number}><h3>{stage.number} / 04 — {stage.title}</h3><p>{stage.description}</p></li>)}</ol>
        </div>
        <span id="critique-analysis" aria-hidden="true" className="pointer-events-none absolute top-[20%] h-px w-px" />
        <div className="sticky top-0 h-svh overflow-hidden">
          <div className="absolute left-[var(--page-inset)] top-[6svh] z-30">
            <Wordmark emphasis />
          </div>
          <div className="absolute bottom-0 right-0 top-0 w-[61vw] overflow-hidden bg-[#171815]">
            <Image src={READ_IMAGE_URL} alt="Street photograph prepared for a visual critique" fill priority className="object-cover object-center" sizes="61vw" />
            <HeroProcessOverlays activeStage={hasFinalStageExited ? 0 : activeStage} shouldReduceMotion={shouldReduceMotion ?? false} />
          </div>
          <div className="absolute inset-y-0 left-0 z-10 w-[39vw] bg-[#08090a]" />
          <div aria-hidden="true" className="absolute inset-y-0 left-[39vw] z-10 w-[100px] bg-[linear-gradient(90deg,#08090a_0%,rgba(8,9,10,0)_100%)]" />
          <motion.div aria-hidden="true" className="absolute inset-y-0 left-[39vw] z-[15] w-[140px] bg-[linear-gradient(90deg,rgba(8,9,10,0.78)_0%,rgba(8,9,10,0)_100%)]" style={{ opacity: shouldReduceMotion ? (activeStage === 0 ? 1 : 0) : introOpacity }} />
          <motion.div className="absolute left-[var(--page-inset)] top-[20svh] z-20 w-[38vw] max-w-[44rem] [@media(min-height:701px)_and_(max-height:800px)]:top-[16svh] [@media(min-height:641px)_and_(max-height:700px)]:top-[14svh] [@media(max-height:640px)]:top-[12svh]" onFocusCapture={revealIntroForFocusedCta} style={{ pointerEvents: activeStage === 0 ? "auto" : "none", opacity: shouldReduceMotion ? (activeStage === 0 ? 1 : 0) : introOpacity, transform: shouldReduceMotion ? "translate3d(0, 0, 0)" : introTransform }}>
            <p className="font-mono text-[11px] uppercase tracking-[var(--landing-label-tracking)] text-[var(--landing-text-meta)]">{LOCKED_HERO_COPY.eyebrow}</p>
            <h1 className="mt-7 max-w-[44rem] text-[clamp(3.5rem,min(6.2vw,11.5svh),7rem)] font-medium leading-[0.91] tracking-[-0.04em] text-[var(--landing-text-primary)] [@media(max-height:700px)]:mt-5"><LockedHeroHeading /></h1>
            <p className="mt-8 max-w-[33rem] text-[1.3125rem] leading-relaxed text-[var(--landing-text-body)] [@media(min-height:641px)_and_(max-height:700px)]:mt-5 [@media(max-height:640px)]:mt-4">{LOCKED_HERO_COPY.description}</p>
            <div className="mt-10 flex flex-col items-start gap-6 [@media(min-width:1024px)]:flex-row [@media(min-width:1024px)]:flex-wrap [@media(min-width:1024px)]:items-center [@media(min-height:641px)_and_(max-height:700px)]:mt-6 [@media(max-height:640px)]:mt-5"><FeedbackLink id="feedback-desktop" href={analyzerUrl} /><a href="#critique-analysis" className="text-base text-[var(--landing-text-body)] underline decoration-white/35 underline-offset-4 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#08090a]">See how it works</a></div>
          </motion.div>
          <div className="absolute bottom-[calc(15svh+70px)] left-[var(--page-inset)] z-20 w-[calc(39vw-var(--page-inset)-24px)] max-w-[430px]">
            {processStages.map((stage, index) => {
              const stageNumber = index + 1;
              const isActive = activeStage === stageNumber && (stageNumber !== 4 || !hasFinalStageExited);
              return <StageFeedback key={stage.number} stage={stage} timeline={processTimeline[index]} scrollYProgress={scrollYProgress} shouldReduceMotion={shouldReduceMotion ?? false} isActive={isActive} />;
            })}
          </div>
          <motion.div aria-hidden="true" className="absolute bottom-[9svh] left-[var(--page-inset)] z-20 h-px w-[min(11rem,calc(39vw-var(--page-inset)-24px))] origin-left bg-white/15" style={{ opacity: progressOpacity }}>
            <motion.div className="h-full w-full origin-left bg-[rgba(242,242,240,0.68)]" style={{ scaleX: progressScaleX }} />
          </motion.div>
        </div>
      </section>
    </>
  );
}
