'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence, useMotionValueEvent } from 'framer-motion';
import { ArrowRight, Plus, Minus } from 'lucide-react';

const FOOTER_LINKS = [
  {
    title: 'Product',
    links: [
      { label: 'Analyze', href: '#' },
      { label: 'Learn', href: '#' },
      { label: 'Gallery', href: '#' },
      { label: 'About', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Photography Guides', href: '#' },
      { label: 'Composition', href: '#' },
      { label: 'Lighting', href: '#' },
      { label: 'Camera Knowledge', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'Instagram', href: '#' },
      { label: 'LinkedIn', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
];

const BRAND_TEXT = 'Every image has a reason.';

// Subtle hover link
const FooterLink = ({ label, href }: { label: string; href: string }) => {
  return (
    <a
      href={href}
      className="group flex items-center text-sm sm:text-base text-white/50 hover:text-white transition-all duration-300 py-1"
    >
      <span className="transform transition-transform duration-300 group-hover:-translate-x-1">{label}</span>
      <span className="ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
        <ArrowRight size={14} />
      </span>
    </a>
  );
};

// Accordion for mobile
const MobileAccordion = ({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/5 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-white/40 tracking-widest uppercase mb-1"
      >
        {title}
        {isOpen ? <Minus size={14} /> : <Plus size={14} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pt-4 pb-1">
              {links.map((link, i) => (
                <FooterLink key={i} label={link.label} href={link.href} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function Footer() {
  const spacerRef = useRef<HTMLDivElement>(null);
  const fixedRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (!fixedRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setHeight(entries[0].contentRect.height);
    });
    observer.observe(fixedRef.current);
    return () => observer.disconnect();
  }, []);

  // We still track scroll to trigger the text stagger
  const { scrollYProgress } = useScroll({
    target: spacerRef,
    offset: ['start end', 'end end'],
  });

  // Trigger brand text stagger when the curtain starts revealing the footer
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest > 0.15 && !isRevealed) setIsRevealed(true);
    if (latest <= 0.15 && isRevealed) setIsRevealed(false);
  });

  const words = BRAND_TEXT.split(' ');

  return (
    <>
      {/* Spacer to push content up and reveal footer */}
      <div ref={spacerRef} style={{ height }} className="relative w-full z-0" />

      <div
        ref={fixedRef}
        className="fixed bottom-0 left-0 w-full bg-[#050505] text-[#e4e4e2] overflow-hidden z-0 font-sans"
      >
        <div className="mx-auto w-full max-w-7xl px-6 py-12 md:px-12 md:py-24">
          {/* Top Section: Brand Statement & Description */}
          <div className="flex flex-col items-start mb-24 md:mb-40 max-w-4xl">
            <h2 
              className="text-5xl md:text-7xl lg:text-9xl font-medium tracking-tight mb-8 flex flex-wrap gap-x-3 md:gap-x-4 gap-y-2 font-sans"
              style={{
                letterSpacing: '-0.02em'
              }}
            >
              {words.map((word, i) => (
                <div key={i} className="overflow-hidden">
                  <motion.span
                    className="inline-block"
                    variants={{
                      hidden: { opacity: 0, y: 40 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    initial="hidden"
                    animate={isRevealed ? "visible" : "hidden"}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.08,
                      ease: [0.21, 0.47, 0.32, 0.98],
                    }}
                  >
                    {word}
                  </motion.span>
                </div>
              ))}
            </h2>
            <motion.p 
              className="text-white/40 text-lg md:text-2xl max-w-lg font-light leading-relaxed"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 }
              }}
              initial="hidden"
              animate={isRevealed ? "visible" : "hidden"}
              transition={{ duration: 1, delay: 0.5 }}
            >
              Snapgrade helps photographers understand<br className="hidden md:block"/> the decisions behind every photograph.
            </motion.p>
          </div>

          {/* Links Section: Desktop (3 columns) & Mobile (Accordion) */}
          <div className="mb-16 md:mb-24">
            {/* Desktop View */}
            <div className="hidden md:grid grid-cols-3 gap-8 max-w-3xl">
              {FOOTER_LINKS.map((section, i) => (
                <div key={i} className="flex flex-col gap-6">
                  <h3 className="text-xs font-semibold text-white/30 tracking-widest uppercase">
                    {section.title}
                  </h3>
                  <div className="flex flex-col gap-4">
                    {section.links.map((link, j) => (
                      <FooterLink key={j} label={link.label} href={link.href} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col">
              {FOOTER_LINKS.map((section, i) => (
                <MobileAccordion key={i} title={section.title} links={section.links} />
              ))}
            </div>
          </div>

          {/* Bottom Legal / Copyright Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pt-8 border-t border-white/5 text-white/30 text-xs sm:text-sm">
            <div className="flex flex-col gap-3">
              <p>© 2026 Snapgrade. All rights reserved.</p>
              <p className="max-w-md leading-relaxed">
                Photography analysis powered by AI.<br />
                Images remain property of their respective owners.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">License</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
