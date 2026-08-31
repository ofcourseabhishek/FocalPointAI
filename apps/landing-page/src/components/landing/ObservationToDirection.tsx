"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const ENTER_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export function ObservationToDirection() {
  const imageRef = useRef<HTMLDivElement>(null);
  const observationRef = useRef<HTMLElement>(null);
  const adviceRef = useRef<HTMLDivElement>(null);
  const [imageReady, setImageReady] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [observationVisible, setObservationVisible] = useState(false);
  const [adviceInView, setAdviceInView] = useState(false);
  const [adviceVisible, setAdviceVisible] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotionFrame: number | undefined;
    const showWithoutMotion = () => {
      reducedMotionFrame = window.requestAnimationFrame(() => {
        setEnhanced(false);
        setObservationVisible(true);
        setAdviceInView(true);
        setAdviceVisible(true);
      });
    };
    const handleMotionChange = () => {
      if (reducedMotion.matches) showWithoutMotion();
    };

    reducedMotion.addEventListener("change", handleMotionChange);

    if (reducedMotion.matches) {
      showWithoutMotion();
      return () => {
        if (reducedMotionFrame !== undefined) {
          window.cancelAnimationFrame(reducedMotionFrame);
        }
        reducedMotion.removeEventListener("change", handleMotionChange);
      };
    }

    if (!("IntersectionObserver" in window)) {
      showWithoutMotion();
      return () => {
        if (reducedMotionFrame !== undefined) {
          window.cancelAnimationFrame(reducedMotionFrame);
        }
        reducedMotion.removeEventListener("change", handleMotionChange);
      };
    }

    let observationTimer: number | undefined;

    const imageObserver = new IntersectionObserver(
      (entries) => {
        setEnhanced(true);
        if (entries.some((entry) => entry.isIntersecting) && imageReady) {
          observationTimer = window.setTimeout(() => setObservationVisible(true), 360);
          imageObserver.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    const adviceObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAdviceInView(true);
          adviceObserver.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    if (imageRef.current) imageObserver.observe(imageRef.current);
    if (observationRef.current) imageObserver.observe(observationRef.current);
    if (adviceRef.current) imageObserver.observe(adviceRef.current);
    if (adviceRef.current) adviceObserver.observe(adviceRef.current);

    return () => {
      if (observationTimer !== undefined) window.clearTimeout(observationTimer);
      if (reducedMotionFrame !== undefined) {
        window.cancelAnimationFrame(reducedMotionFrame);
      }
      imageObserver.disconnect();
      adviceObserver.disconnect();
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, [imageReady]);

  useEffect(() => {
    if (!observationVisible || !adviceInView) return;

    const adviceTimer = window.setTimeout(() => setAdviceVisible(true), 320);
    return () => window.clearTimeout(adviceTimer);
  }, [adviceInView, observationVisible]);

  const handleImageFailure = () => {
    setObservationVisible(true);
    setAdviceInView(true);
    setAdviceVisible(true);
  };

  return (
    <section
      id="direction"
      aria-labelledby="direction-heading"
      className="bg-[#F5F4F0] px-6 pb-24 pt-24 font-sans text-[#171714] md:px-[clamp(24px,5vw,80px)] md:pb-28 md:pt-36 lg:px-[var(--page-inset)] lg:pb-24 lg:pt-24"
    >
      <div className="mx-auto max-w-[1440px] lg:max-w-none">
        <div className="border-t border-[#171714]/25 pt-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#171714]/65 lg:tracking-[var(--landing-label-tracking)]">
            From observation to direction
          </p>
          <h2
            id="direction-heading"
            className="mt-10 max-w-[1020px] text-[clamp(2rem,4vw,4.5rem)] font-normal leading-[1.06] tracking-[-0.04em] lg:text-[clamp(2.75rem,4.25vw,4.75rem)]"
          >
            <span className="block text-[#171714]/65">Knowing what happened is useful.</span>
            <span className="block">Knowing what to try next is better.</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-10 border-t border-[#171714]/25 pt-8 md:mt-16 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.36fr)] md:gap-[clamp(2rem,6vw,7rem)] md:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.3fr)] lg:border-[color:var(--landing-rule-light)]">
          <figure className="min-w-0" ref={imageRef}>
            <div className="relative aspect-[4/5] overflow-hidden bg-[#e9e6dc] md:aspect-[4/3]">
              <Image
                src="/beyonthescore/frames/frame-03.webp"
                alt="A person wearing black with an orange backpack against a sunlit golden stone wall"
                fill
                sizes="(max-width: 767px) calc(100vw - 3rem), (max-width: 1023px) 58vw, 60vw"
                className="object-cover object-[50%_60%]"
                onLoad={() => setImageReady(true)}
                onError={handleImageFailure}
              />
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute left-[22%] top-[calc(33%_-_1rem)] h-8 w-px bg-[#171714]/55 transition-opacity duration-300 ${
                  observationVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                <span className="absolute -left-px -top-px h-[3px] w-[3px] bg-[#171714]/75" />
              </div>
            </div>
            <figcaption className="mt-3 text-[10px] leading-relaxed tracking-[0.01em] text-[#171714]/62 lg:text-xs lg:text-[#171714]/70">
              An example of the feedback you get back.
            </figcaption>
          </figure>

          <div className="relative flex flex-col self-start pt-2 md:pt-[clamp(3.75rem,9vw,9rem)]">
            <article
              ref={observationRef}
              className={`max-w-[30rem] transition-[opacity,transform] duration-[420ms] motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
                enhanced && !observationVisible
                  ? "translate-y-[4px] opacity-0"
                  : "translate-y-0 opacity-100"
              }`}
              style={{ transitionTimingFunction: ENTER_EASING }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#171714]/62 lg:tracking-[var(--landing-label-tracking)] lg:text-[#171714]/72">
                Observation
              </p>
              <p className="mt-4 text-[clamp(1.15rem,1.7vw,1.5rem)] leading-[1.28] tracking-[-0.02em]">
                The sunlit wall pulls attention away from the person in the frame.
              </p>
            </article>

            <article
              ref={adviceRef}
              className={`mt-12 max-w-[30rem] border-t border-[#171714]/25 pt-5 transition-[opacity,transform] duration-[420ms] motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none md:mt-16 lg:border-[color:var(--landing-rule-light)] ${
                enhanced && !adviceVisible
                  ? "translate-y-[8px] opacity-0"
                  : "translate-y-0 opacity-100"
              }`}
              style={{ transitionTimingFunction: ENTER_EASING }}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#171714]/62 lg:tracking-[var(--landing-label-tracking)] lg:text-[#171714]/72">
                Try next
              </p>
              <p className="mt-4 text-[clamp(1.15rem,1.7vw,1.5rem)] leading-[1.28] tracking-[-0.02em]">
                Lower the wall’s exposure locally, or change your position so the person sits against a quieter background.
              </p>
            </article>
          </div>
        </div>

        <p className="mt-20 max-w-[32rem] text-[clamp(1.1rem,1.6vw,1.3rem)] leading-[1.3] tracking-[-0.02em] md:mt-28 lg:hidden">
          <span className="text-[#171714]/65">Snapgrade doesn’t just grade the frame.</span>
          <br />
          It helps you make the next one better.
        </p>
      </div>
    </section>
  );
}
