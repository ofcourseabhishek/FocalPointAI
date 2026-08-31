"use client";

import type { CSSProperties } from "react";
import { useRef } from "react";
import { useInView, useScroll } from "framer-motion";
import { TheRead } from "./TheRead";
import { READ_PIN_TRACK_HEIGHT_VIEWPORTS } from "./read-timeline";
import styles from "./ReadSection.module.css";

export function ReadSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinTrackRef = useRef<HTMLDivElement>(null);
  // This only starts decorative asset preloading; content is never hidden or inert.
  const isVisible = useInView(sectionRef, { amount: "some", margin: "300px 0px" });
  const { scrollYProgress } = useScroll({
    target: pinTrackRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      ref={sectionRef}
      aria-label="The Read"
      className="relative overflow-x-clip bg-[#0a0a0a]"
      style={{ "--read-pin-track-vh": READ_PIN_TRACK_HEIGHT_VIEWPORTS } as CSSProperties}
    >
      <div aria-hidden="true" className={styles.entryGap} />
      <div ref={pinTrackRef} className={styles.pinTrack}>
        <div className={styles.pinFrame}>
          <TheRead
            readingProgress={scrollYProgress}
            isActive={isVisible}
            pinTrackRef={pinTrackRef}
          />
        </div>
      </div>
    </section>
  );
}
