'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, useScroll, AnimatePresence, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Plus, Minus } from 'lucide-react';

const FOOTER_LINKS = [
  {
    title: 'Product',
    links: [
      { label: 'Analyze', href: '#' },
      { label: 'Learn', href: '#' },
      { label: 'Gallery', href: '#' },
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Photography Guides', href: '#' },
      { label: 'Composition', href: '#' },
      { label: 'Lighting', href: '#' },
      { label: 'Camera Fundamentals', href: '#' },
      { label: 'Repository', href: 'https://github.com/ofcourseabhishek/snapgrade', external: true },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'Instagram', href: 'https://instagram.com/ofcourse.abhishek', external: true },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/abhishek--rai/', external: true },
      { label: 'GitHub', href: 'https://github.com/ofcourseabhishek', external: true },
      { label: 'Contact', href: '#' },
    ],
  },
];

// Subtle hover link
const FooterLink = ({ label, href, external }: { label: string; href: string, external?: boolean }) => {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="group flex items-center py-1 text-sm text-white/60 transition-colors duration-150 hover:text-white sm:text-base lg:py-0.5 lg:text-[var(--landing-text-body)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      <span className="transition-transform duration-150 motion-reduce:transform-none motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-x-1">{label}</span>
      <span className="ml-2 -translate-x-2 opacity-0 transition-[opacity,transform] duration-150 motion-reduce:transform-none motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100">
        {external ? <ArrowUpRight size={14} /> : <ArrowRight size={14} />}
      </span>
    </a>
  );
};

// Accordion for mobile
const MobileAccordion = ({
  title,
  links,
  prefersReducedMotion,
}: {
  title: string;
  links: { label: string; href: string, external?: boolean }[];
  prefersReducedMotion: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [useInstantTransition, setUseInstantTransition] = useState(false);
  const panelId = useId();
  const triggerId = `${panelId}-trigger`;

  const toggle = (isKeyboardActivation: boolean) => {
    setUseInstantTransition(prefersReducedMotion || isKeyboardActivation);
    setIsOpen((open) => !open);
  };

  return (
    <div className="border-b border-white/5 py-4">
      <button
        id={triggerId}
        aria-controls={panelId}
        aria-expanded={isOpen}
        onClick={(event) => toggle(event.detail === 0)}
        className="-mx-2 flex min-h-[44px] w-[calc(100%+1rem)] items-center justify-between rounded-md px-2 text-left text-sm font-medium uppercase tracking-widest text-white/60 transition-[background-color,transform,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] focus-visible:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:active:scale-100 motion-reduce:transition-none"
      >
        {title}
        {isOpen ? <Minus size={14} /> : <Plus size={14} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: prefersReducedMotion || useInstantTransition ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pt-4 pb-1">
              {links.map((link, i) => (
                <FooterLink key={i} label={link.label} href={link.href} external={link.external} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function Footer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [height, setHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver(() => {
      // Use offsetHeight to include padding, since contentRect excludes it
      if (contentRef.current) {
        setHeight(contentRef.current.offsetHeight);
        setViewportHeight(window.visualViewport?.height ?? window.innerHeight);
        setViewportWidth(window.innerWidth);
      }
    });
    const updateViewportSize = () => {
      setViewportHeight(window.visualViewport?.height ?? window.innerHeight);
      setViewportWidth(window.innerWidth);
    };
    observer.observe(contentRef.current);
    window.addEventListener('resize', updateViewportSize);
    window.visualViewport?.addEventListener('resize', updateViewportSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateViewportSize);
      window.visualViewport?.removeEventListener('resize', updateViewportSize);
    };
  }, []);

  const canReveal = viewportWidth >= 768 && height > 0 && viewportHeight >= height;

  useEffect(() => {
    if (!isFocusMode || !focusedElement) return;

    const frame = window.requestAnimationFrame(() => {
      focusedElement.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusedElement, isFocusMode]);

  // The spacer remains the scroll target so reveal progress never changes semantics.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end end'],
  });

  // Trigger brand text fade/slide reveal when the curtain starts revealing the footer
  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (latest > 0.15 && !isRevealed) setIsRevealed(true);
    if (latest <= 0.15 && isRevealed) setIsRevealed(false);
  });

  const handleFooterFocusCapture = (event: React.FocusEvent<HTMLElement>) => {
    if (!canReveal || isFocusMode) return;

    setFocusedElement(event.target as HTMLElement);
    setIsFocusMode(true);
  };

  const brandVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0.65, transform: 'none' },
        visible: { opacity: 0.65, transform: 'none' },
      }
    : {
        hidden: { opacity: 0, transform: 'translateY(20px)' },
        visible: { opacity: 0.65, transform: 'translateY(0)' },
      };

  const isFixedReveal = canReveal && !isFocusMode;

  return (
    <>
      {/* Desktop spacer lets the fixed footer sit beneath the final section. */}
      <div
        ref={containerRef}
        aria-hidden="true"
        style={{ height: isFixedReveal ? height : 0 }}
        className="relative hidden w-full z-0 md:block"
      />

      <footer
        ref={contentRef}
        onFocusCapture={handleFooterFocusCapture}
        className={`relative w-full bg-[#050505] text-[#e4e4e2] overflow-hidden z-0 font-sans ${
          isFixedReveal ? 'md:fixed md:bottom-0 md:left-0' : 'md:relative'
        }`}
      >
        <div className="mx-auto w-full max-w-7xl px-6 py-12 md:px-12 md:py-16 lg:max-w-none lg:px-[var(--page-inset)] lg:py-14">
          <div className="flex flex-col items-start justify-between gap-16 mb-24 lg:flex-row lg:mb-16 lg:gap-12">
            {/* Links Section: Desktop (3 columns) & Mobile (Accordion) */}
            <div className="w-full lg:w-1/2">
              {/* Desktop View */}
              <div className="hidden md:grid grid-cols-3 gap-8">
                {FOOTER_LINKS.map((section, i) => (
                  <div key={i} className="flex flex-col gap-6 lg:gap-4">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-white/60 lg:tracking-[var(--landing-label-tracking)] lg:text-[var(--landing-text-body)]">
                      {section.title}
                    </h3>
                    <div className="flex flex-col gap-4 lg:gap-2">
                      {section.links.map((link, j) => (
                        <FooterLink key={j} label={link.label} href={link.href} external={link.external} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile View */}
              <div className="md:hidden flex flex-col">
                {FOOTER_LINKS.map((section, i) => (
                  <MobileAccordion
                    key={i}
                    title={section.title}
                    links={section.links}
                    prefersReducedMotion={Boolean(prefersReducedMotion)}
                  />
                ))}
              </div>
            </div>

            {/* Brand Statement Section (Right Side) */}
            <div className="w-full lg:w-1/2 flex lg:justify-end">
              <h2 className="mt-6 text-4xl font-medium tracking-tight font-sans text-right md:text-5xl lg:mt-0 lg:text-[4rem]"
                  style={{ letterSpacing: '-0.02em' }}>
                <div className="overflow-hidden">
                  <span className="inline-block text-white/65 md:hidden">
                    See more, understand better.
                  </span>
                  <motion.span
                    variants={brandVariants}
                    initial={prefersReducedMotion ? 'visible' : 'hidden'}
                    animate={isRevealed || isFocusMode || prefersReducedMotion || !canReveal ? "visible" : "hidden"}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: [0.23, 1, 0.32, 1] }}
                    className="hidden text-white md:inline-block"
                  >
                    See more, understand better.
                  </motion.span>
                </div>
              </h2>
            </div>

          </div>

          {/* Bottom Legal / Copyright Section */}
          <div className="flex flex-col items-start justify-between gap-8 border-t border-white/5 pt-8 text-xs text-white/60 sm:text-sm md:flex-row md:items-end lg:border-[color:var(--landing-rule-dark)] lg:pt-7 lg:text-[var(--landing-text-meta)]">
            <div className="flex flex-col gap-3">
              <p>© 2026 Snapgrade. All rights reserved.</p>
              <p className="max-w-md leading-relaxed">
                An AI-powered photography learning platform.<br />
                Images analyzed belong to their respective creators.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-6">
              <a href="#" className="transition-colors duration-150 hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Privacy</a>
              <a href="#" className="transition-colors duration-150 hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Terms</a>
              <a href="#" className="transition-colors duration-150 hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">License</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
