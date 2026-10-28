import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import '../result-read.css';
import { getResultReadModel } from '../lib/result-read';
import { Skeleton } from './ui/skeleton';
import { ResultPhotoViewport } from './result/ResultPhotoViewport';
import { DiagnosticPanel } from './result/DiagnosticPanel';
import { describeMetric } from '../lib/metric-guide';
import { MorphicNavbar } from './kokonutui/morphic-navbar';
import ScrollIndex from './kokonutui/scroll-index';
import { MistakeCard } from './result/MistakeCard';
import { MorphIcon } from 'morphicons/react';
import { deriveMistakes } from '../lib/mistake-guidance';

import { DownloadIcon } from './icons/snapgrade-icons';

const TAB_ORDER = ['image', 'attention', 'light', 'focus', 'composition'];
const EMPTY_THIRDS = { horizontal: [], vertical: [], intersections: [] };
const EMPTY_GEOMETRY = { leadingLines: [], horizon: null, centroid: null, ruleOfThirds: EMPTY_THIRDS };
const MeasuredHistogramChart = lazy(() => import('./MeasuredHistogramChart'));

// Shared with the upload page: zinc surfaces, gold accent, Neue Haas display headings.
const SECTION = 'scroll-mt-20 border-t border-zinc-200 py-16 sm:py-20 dark:border-zinc-800';
// Floating index entries, in page order; sections that render nothing are left out.
const SECTION_INDEX = [['read', 'Read'], ['scores', 'Scores'], ['actions', 'Actions'], ['breakdown', 'Breakdown'], ['measurements', 'Numbers'], ['improve', 'Improve']];

/** Which sections exist, and which one sits under the middle of the viewport. */
/**
 * The navbar shows near the top and whenever the reader scrolls up; it slides away while
 * they scroll down. Movements under JITTER px are ignored so trackpad wobble can't flicker it.
 * Only the reader's own scrolling hides it: jumps from clicking a link or tab never do.
 */
const NAVBAR_TOP_ZONE = 200;
const JITTER = 8;
function useNavbarVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    let readerScrolling = false;
    const byReader = (event) => {
      // A pointerdown on <html> itself is a grab of the page scrollbar.
      readerScrolling = event.type !== 'pointerdown' || event.target === document.documentElement;
    };
    const byJump = () => { readerScrolling = false; };
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y < NAVBAR_TOP_ZONE) {
        setVisible(true);
        last = y;
      } else if (Math.abs(y - last) > JITTER) {
        if (y < last) setVisible(true);
        else if (readerScrolling) setVisible(false);
        last = y;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const readerEvents = ['wheel', 'touchmove', 'keydown', 'pointerdown'];
    readerEvents.forEach((type) => window.addEventListener(type, byReader, { passive: true }));
    window.addEventListener('click', byJump);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      readerEvents.forEach((type) => window.removeEventListener(type, byReader));
      window.removeEventListener('click', byJump);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return visible;
}

function useSectionIndex() {
  const [sections, setSections] = useState([]);
  const [current, setCurrent] = useState('read');
  useEffect(() => {
    const present = SECTION_INDEX.filter(([id]) => document.getElementById(id));
    setSections(present);
    const observer = new IntersectionObserver((entries) => {
      const hit = entries.find((entry) => entry.isIntersecting);
      if (hit) setCurrent(hit.target.id);
    }, { rootMargin: '-45% 0px -50% 0px' });
    for (const [id] of present) observer.observe(document.getElementById(id));
    return () => observer.disconnect();
  }, []);
  return { sections, current };
}
const CARD = 'rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950';
const EYEBROW = 'text-xs font-medium uppercase tracking-[0.14em] text-[#856324] dark:text-[#d2b16e]';
const PILL_PRIMARY = 'inline-flex h-10 items-center gap-2 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200';
const PILL_OUTLINE = 'inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900';

function GeometryLayer({ geometry = EMPTY_GEOMETRY, shapes = [], showRuleOfThirds = false }) {
  const { leadingLines = [], horizon, ruleOfThirds = EMPTY_THIRDS } = geometry;
  return <svg className="result-read__geometry" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    {showRuleOfThirds && ruleOfThirds.horizontal.map((position) => <line className="result-read__geometry-line result-read__geometry-line--thirds" key={`thirds-h-${position}`} x1="0" y1={position * 100} x2="100" y2={position * 100} />)}
    {showRuleOfThirds && ruleOfThirds.vertical.map((position) => <line className="result-read__geometry-line result-read__geometry-line--thirds" key={`thirds-v-${position}`} x1={position * 100} y1="0" x2={position * 100} y2="100" />)}
    {showRuleOfThirds && ruleOfThirds.intersections.map((marker, index) => <circle className="result-read__geometry-intersection" key={`thirds-point-${marker.x}-${marker.y}-${index}`} cx={marker.x * 100} cy={marker.y * 100} r="0.9" />)}
    {horizon && <line className="result-read__geometry-line result-read__geometry-line--horizon" x1={horizon.start.x * 100} y1={horizon.start.y * 100} x2={horizon.end.x * 100} y2={horizon.end.y * 100} />}
    {leadingLines.map((item, index) => <line className="result-read__geometry-line" key={`${item.start.x}-${item.start.y}-${index}`} x1={item.start.x * 100} y1={item.start.y * 100} x2={item.end.x * 100} y2={item.end.y * 100} />)}
    {shapes.map((shape, index) => {
      if (shape.kind === 'bbox') return <rect className="result-read__geometry-shape" key={`bbox-${index}`} x={shape.x * 100} y={shape.y * 100} width={shape.width * 100} height={shape.height * 100} />;
      if (shape.kind === 'point') return null;
      if (shape.kind === 'line') return <line className="result-read__geometry-line" key={`line-${index}`} x1={shape.start.x * 100} y1={shape.start.y * 100} x2={shape.end.x * 100} y2={shape.end.y * 100} />;
      if (shape.kind === 'grid') return <g key={`grid-${index}`}>{shape.horizontal.map((position) => <line className="result-read__geometry-line result-read__geometry-line--thirds" key={`grid-h-${position}`} x1="0" y1={position * 100} x2="100" y2={position * 100} />)}{shape.vertical.map((position) => <line className="result-read__geometry-line result-read__geometry-line--thirds" key={`grid-v-${position}`} x1={position * 100} y1="0" x2={position * 100} y2="100" />)}</g>;
      return <polygon className="result-read__geometry-shape" key={`region-${index}`} points={shape.points.map((item) => `${item.x * 100},${item.y * 100}`).join(' ')} />;
    })}
  </svg>;
}

function PointMarkers({ geometry = EMPTY_GEOMETRY, shapes = [] }) {
  const markers = [...(geometry.centroid ? [{ ...geometry.centroid, kind: 'centroid' }] : []), ...shapes.filter((shape) => shape.kind === 'point')];
  return markers.map((marker, index) => <span className="result-read__point-marker" data-kind={marker.kind} key={`${marker.kind}-${marker.x}-${marker.y}-${index}`} style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }} />);
}

function EvidenceLayer({ activeTab, layers, motionMode = 'scroll' }) {
  return <div className="result-read__evidence-stack" data-motion={motionMode} aria-hidden="true">
    {Object.entries(layers).map(([id, layer]) => <div className="result-read__evidence" data-active={activeTab === id} data-layer={id} key={id}>
      {layer.asset && <img className="result-read__evidence-image" src={layer.asset} alt="" />}
      <GeometryLayer geometry={layer.geometry} shapes={layer.shapes} />
      <PointMarkers geometry={layer.geometry} shapes={layer.shapes} />
    </div>)}
  </div>;
}

function SectionHeading({ id, eyebrow, title, description }) {
  return <header className="mb-10 max-w-2xl">
    <p className={EYEBROW}>{eyebrow}</p>
    <h2 className="result-read__display mt-2 text-3xl font-medium tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100" id={id}>{title}</h2>
    {description && <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400">{description}</p>}
  </header>;
}

/** Measurements with what they mean, so a number is never left to speak for itself. */
function Facts({ items, explain = true }) {
  if (!items?.length) return null;
  return <dl className="mt-5 grid gap-4 text-sm">
    {items.map((item) => {
      const { meaning, verdict } = explain ? describeMetric(item.label, item.value) : { meaning: '', verdict: '' };
      return <div className="border-b border-zinc-100 pb-4 last:border-0 last:pb-0 dark:border-zinc-900" key={item.label}>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500 dark:text-zinc-400">{item.label}</dt>
          <dd className="m-0 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{item.value}</dd>
        </div>
        {verdict && <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{verdict}</p>}
        {meaning && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{meaning}</p>}
      </div>;
    })}
  </dl>;
}

// Dark text on light swatches, white on dark ones.
function readableOn(hex) {
  const digits = hex.slice(1, hex.length === 4 || hex.length === 5 ? 4 : 7);
  const [r, g, b] = (digits.length === 3 ? [...digits].map((d) => d + d) : digits.match(/../g)).map((pair) => parseInt(pair, 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#18181b' : '#ffffff';
}

// Proportional palette bar. Hovering or focusing a swatch floats a pill in its colour
// with the hex code and share; clicking copies the hex code.
function Swatches({ colors }) {
  const [active, setActive] = useState(null); // { index, x } with x relative to the bar
  const [copied, setCopied] = useState(null);
  if (!colors?.length) return null;
  const swatches = colors.map((color) => typeof color === 'string' ? { hex: color, percentage: null } : color);
  const show = (index, x) => setActive({ index, x });
  const copy = (hex, index) => navigator.clipboard?.writeText(hex.toUpperCase()).then(() => {
    setCopied(index);
    setTimeout(() => setCopied((current) => current === index ? null : current), 1200);
  });
  const current = active && swatches[active.index];
  return <div className="relative mt-4" onMouseLeave={() => setActive(null)}>
    <div className="flex h-12 overflow-hidden rounded-lg">
      {swatches.map((color, index) => <button
        type="button"
        key={`${color.hex}-${index}`}
        className="cursor-copy outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        style={{ backgroundColor: color.hex, flexGrow: color.percentage || 1 }}
        aria-label={`Copy ${color.hex.toUpperCase()}${color.percentage != null ? `, ${Math.round(color.percentage)}% of the photo` : ''}`}
        onMouseMove={(event) => show(index, event.clientX - event.currentTarget.parentElement.getBoundingClientRect().left)}
        onFocus={(event) => show(index, event.currentTarget.offsetLeft + event.currentTarget.offsetWidth / 2)}
        onBlur={() => setActive(null)}
        onClick={() => copy(color.hex, index)}
      />)}
    </div>
    {current && <span
      className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium tabular-nums shadow-md ring-1 ring-black/10"
      style={{ left: active.x, backgroundColor: current.hex, color: readableOn(current.hex) }}
      aria-live="polite"
    >
      {copied === active.index ? 'Copied' : `${current.hex.toUpperCase()}${current.percentage != null ? ` · ${Math.round(current.percentage)}%` : ''}`}
    </span>}
  </div>;
}

function ScoresSection({ categories }) {
  const scored = categories.filter((category) => category.score != null);
  if (!scored.length) return null;
  return <section className={SECTION} id="scores" aria-labelledby="scores-title">
    <SectionHeading id="scores-title" eyebrow="Scores" title="At a glance" description="How each part of the frame scored. Jump to any one for the full read." />
    <ul className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
      {scored.map((category) => <li key={category.id}>
        <a className="flex items-baseline justify-between text-sm text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white" href={`#category-${category.id}`}>
          <span>{category.label}</span>
          <span className="result-read__display text-lg tabular-nums text-zinc-900 dark:text-zinc-100">{category.score}</span>
        </a>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-[#b8924a]" style={{ width: `${category.score}%` }} />
        </div>
      </li>)}
    </ul>
  </section>;
}

function ActionsSection({ actions, mistakes }) {
  const keep = actions?.keep?.filter((item) => item?.label || item?.text).slice(0, 2) || [];
  // The model always returns these objects; only show a card when it has real content
  // (without Gemini, well-scored photos get no practice variations).
  const change = actions?.change?.action ? actions.change : null;
  const next = actions?.tryThisNext?.variations?.length ? actions.tryThisNext : null;
  const cards = [keep.length > 0, change, next].filter(Boolean).length;
  return <section className={SECTION} id="actions" aria-labelledby="actions-title">
    <SectionHeading id="actions-title" eyebrow="What to do with it" title="Keep, change, try, fix" />
    {cards > 0 && <div className={`grid gap-6 ${['', 'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3'][cards]}`}>
      {keep.length > 0 && <article className={CARD}>
        <h3 className={EYEBROW}>Keep</h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">What deserves to stay.</p>
        <ol className="mt-5 grid gap-5">
          {keep.map((item, index) => <li className="flex gap-3" key={`${item.label || 'keep'}-${index}`}>
            <span className="text-xs tabular-nums text-zinc-400">{String(index + 1).padStart(2, '0')}</span>
            <div>{item.text && item.label && <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</h4>}<p className="text-sm text-zinc-600 dark:text-zinc-400">{item.text || item.label}</p></div>
          </li>)}
        </ol>
      </article>}
      {change && <article className={`${CARD} border-[#b8924a]/50 dark:border-[#b8924a]/40`}>
        <h3 className={EYEBROW}>Change one thing{change.category && change.category.toLowerCase() !== 'general' ? ` · ${change.category}` : ''}</h3>
        <p className="result-read__display mt-3 text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">{change.action}</p>
        {change.observation && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{change.observation}</p>}
        {change.consequence && <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-zinc-900"><h4 className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Why this matters</h4><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{change.consequence}</p></div>}
      </article>}
      {next && <article className={CARD}>
        <h3 className={EYEBROW}>Try this next</h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{next.title || 'Practice session'}</p>
        <p className="mt-4 text-base font-medium text-zinc-900 dark:text-zinc-100">{next.instruction || 'Try three variations of the same frame.'}</p>
        {next.variations?.length > 0 && <ol className="mt-5 grid gap-4">
          {next.variations.map((variation, index) => <li className="flex gap-3" key={`variation-${index}`}>
            <span className="text-xs tabular-nums text-zinc-400">{String(index + 1).padStart(2, '0')}</span>
            <div><h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{variation.label || variation.approach || `Variation ${index + 1}`}</h4><p className="text-sm text-zinc-600 dark:text-zinc-400">{variation.instruction || variation.outcome || variation.text}</p></div>
          </li>)}
        </ol>}
      </article>}
    </div>}
    <div className="mt-12">
      <h3 className="result-read__display text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">What went wrong, and how to fix it</h3>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">What pulled this photograph down, whether it's rescuable now, and how to shoot around it next time.</p>
      {mistakes.length > 0
        ? <div className="result-read__mistake-list mt-6">{mistakes.map((mistake, index) => <MistakeCard key={mistake.id} defaultExpanded={index === 0} {...mistake} />)}</div>
        : <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">No significant issues were detected. This frame is technically solid.</p>}
    </div>
  </section>;
}

function metricRows(category) {
  return (category.metrics || []).filter((metric) => metric.label).map((metric, index) => {
    const saw = metric.saw || metric.observation;
    const advice = metric.improve || metric.try;
    const reason = metric.matters || metric.works;
    // A comment on this part of the photo, never a bare number: the analysis's own words first,
    // then a plain-language read of the measurement, then a word value like "Moderate".
    const { verdict } = describeMetric(metric.label, metric.value);
    // Yes/No adds nothing next to a comment that already says it.
    const wordValue = metric.value != null && typeof metric.value !== 'boolean' && Number.isNaN(Number.parseFloat(metric.value)) && !/^(yes|no)$/i.test(String(metric.value)) ? String(metric.value) : '';
    return {
      id: metric.id || metric.label || String(index),
      title: metric.label,
      tag: metric.assessment || wordValue,
      comment: saw || verdict,
      adviceLabel: advice ? 'How to improve' : reason ? 'Why it matters' : '',
      advice: advice || reason,
    };
  }).filter((row) => row.tag || row.comment || row.advice);
}

const plusPath = 'M12 5v14M5 12h14';
const minusPath = 'M5 12h14';

function BreakdownCard({ category, palette, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const rows = metricRows(category);
  const contentId = `category-${category.id}-details`;
  // Open when a link (e.g. a score in At a glance) jumps to this category.
  useEffect(() => {
    const openOnJump = (event) => { if (event.target.closest?.(`a[href="#category-${category.id}"]`)) setOpen(true); };
    document.addEventListener('click', openOnJump);
    return () => document.removeEventListener('click', openOnJump);
  }, [category.id]);
  return <article className={`${CARD} scroll-mt-8`} id={`category-${category.id}`}>
    <button type="button" className="flex w-full cursor-pointer items-center justify-between gap-4 text-left" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls={rows.length ? contentId : undefined}>
      <h3 className="result-read__display text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">{category.label}</h3>
      <span className="flex items-center gap-4">
        {category.score != null && <span className="result-read__display text-3xl tabular-nums text-zinc-900 dark:text-zinc-100">{category.score}<small className="ml-0.5 text-sm text-zinc-400">/100</small></span>}
        <span className="text-zinc-500 dark:text-zinc-400" aria-hidden="true"><MorphIcon icon={open ? minusPath : plusPath} spring="snappy" strokeWidth={1.5} size={18} color="currentColor" /></span>
      </span>
    </button>
    {category.interpretation && <p className="mt-3 max-w-3xl text-base text-zinc-700 dark:text-zinc-300">{category.interpretation}</p>}
    {category.supporting && <p className="mt-2 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">{category.supporting}</p>}
    {palette?.length > 0 && <Swatches colors={palette} />}
    {rows.length > 0 && <div className={`grid transition-[grid-template-rows] duration-300 motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} id={contentId} inert={!open}>
      {/* No padding on the clipped box: overflow hidden doesn't clip its own padding. */}
      <div className="overflow-hidden">
        <ul className="mt-6 divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-900 dark:border-zinc-900">
          {rows.map((row) => <li className="py-4" key={row.id}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{row.title}</h4>
              {row.tag && <span className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">{row.tag}</span>}
            </div>
            {row.comment && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{row.comment}</p>}
            {row.advice && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"><span className="font-medium text-[#856324] dark:text-[#d2b16e]">{row.adviceLabel}:</span> {row.advice}</p>}
          </li>)}
        </ul>
      </div>
    </div>}
  </article>;
}

function BreakdownSection({ categories, measuredPalette }) {
  // Skip categories that would only show the "No … reading was returned" placeholder.
  const visible = categories.filter((category) => category.score != null || category.hasReading || category.metrics?.length);
  if (!visible.length) return null;
  return <section className={SECTION} id="breakdown" aria-labelledby="breakdown-title">
    <SectionHeading id="breakdown-title" eyebrow="Category breakdown" title="What the image is doing" description="Every category we read, with what we saw in each part and how to push it further." />
    <div className="grid gap-6">
      {visible.map((category, index) => <BreakdownCard
        key={category.id}
        category={category}
        // The measured palette carries percentages, so Color gets the proportional bar.
        palette={category.id === 'color' && measuredPalette?.length ? measuredPalette : category.palette}
        defaultOpen={index === 0}
      />)}
    </div>
  </section>;
}

function HistogramViewSwitch({ checked, onChange }) {
  return <button
    aria-checked={checked}
    className="group inline-flex items-center gap-2 rounded-full text-xs font-medium text-zinc-600 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:text-zinc-300 dark:focus-visible:ring-offset-zinc-950"
    onClick={() => onChange(!checked)}
    role="switch"
    type="button"
  >
    RGB
    <span className={`relative h-5 w-9 rounded-full border transition-colors duration-150 ${checked ? 'border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100' : 'border-zinc-300 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800'}`}>
      <span className={`absolute top-0.5 left-0.5 size-3.5 rounded-full shadow-sm transition-transform duration-150 ease-out ${checked ? 'translate-x-4 bg-white dark:bg-zinc-900' : 'translate-x-0 bg-white dark:bg-zinc-400'}`} />
    </span>
  </button>;
}

function MeasurementsSection({ evidence }) {
  const tonal = evidence?.tonal;
  const focus = evidence?.focus;
  const capture = evidence?.capture;
  // Start on the simple tonal curve; RGB is opt-in (or the only view, if that is all there is).
  const [rgbView, setRgbView] = useState(() => !(tonal?.histogram?.length > 0));
  const showRgb = Boolean(tonal?.rgb) && rgbView;
  const hasHistogram = Boolean(tonal?.rgb) || tonal?.histogram?.length > 0;
  const hasTonal = hasHistogram || tonal?.metrics?.length > 0;
  const hasFocus = Boolean(focus?.map) || focus?.metrics?.length > 0;
  const hasCapture = capture?.hasSettings || capture?.supplemental?.length > 0;
  if (!hasTonal && !hasFocus && !hasCapture) return null;
  return <section className={SECTION} id="measurements" aria-labelledby="measurements-title">
    <SectionHeading id="measurements-title" eyebrow="Measurements" title="The numbers behind the read" description="What the pixels measure, independent of taste." />
    <div className="grid gap-6 md:grid-cols-2">
      {hasTonal && <article className={CARD}>
        <div className="flex items-center justify-between gap-4">
          <h3 className={EYEBROW}>Tonal range</h3>
          {tonal?.rgb && tonal?.histogram?.length > 0 && <HistogramViewSwitch checked={rgbView} onChange={setRgbView} />}
        </div>
        {hasHistogram && <>
          <div
            className={showRgb
              ? 'result-read__camera-histogram mt-4 h-[140px] overflow-hidden rounded-md border border-zinc-500/70 bg-black p-1 [isolation:isolate]'
              : 'result-read__histogram-chart-mini mt-4 text-zinc-700 dark:text-zinc-300'}
            aria-hidden="true"
          >
            <Suspense fallback={<Skeleton className="result-read__histogram-skeleton h-24" />}>
              <MeasuredHistogramChart
                view={showRgb ? 'rgb' : 'tonal'}
                rgb={tonal.rgb}
                luminance={tonal.histogram}
                clipLevels={tonal.clipLevels}
                shadowClipping={tonal.shadowClipping}
                highlightClipping={tonal.highlightClipping}
              />
            </Suspense>
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400"><span>Shadows</span><span>Midtones</span><span>Highlights</span></div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Shaded edges: clipped below {tonal.clipLevels.shadow} or above {tonal.clipLevels.highlight} (gold when over 1%)
          </p>
        </>}
        {tonal.interpretation && <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{tonal.interpretation}</p>}
        <Facts items={tonal.metrics} />
      </article>}
      {hasFocus && <article className={CARD}>
        <h3 className={EYEBROW}>Focus &amp; sharpness</h3>
        {focus.map && <img className="mt-4 max-h-56 w-full rounded-lg bg-zinc-100 object-contain dark:bg-zinc-900" src={focus.map} alt="Focus map: brighter areas hold more detail" />}
        <Facts items={focus.metrics} />
      </article>}
      {hasCapture && <article className={CARD}>
        <h3 className={EYEBROW}>Capture details</h3>
        <Facts items={[...(capture.supplemental || []), ...(capture.settings || [])]} />
      </article>}
    </div>
  </section>;
}

const youtubeSearch = (query) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

/**
 * When the backend sends no tutorials, point at YouTube searches for this photo's weak spots:
 * its detected mistakes first, then its lowest-scoring categories. Real search links, never
 * invented videos.
 */
function searchRecommendations(mistakes, categories) {
  const picks = mistakes.map((mistake) => ({
    key: mistake.id,
    topic: mistake.metricLabel || mistake.categoryLabel,
    area: mistake.categoryLabel,
    reason: mistake.diagnosis,
  }));
  const weakest = categories.filter((category) => category.score != null).sort((a, b) => a.score - b.score);
  for (const [rank, category] of weakest.entries()) {
    if (picks.some((pick) => pick.area === category.label)) continue;
    const reason = rank === 0
      ? `${category.label} scored ${category.score}/100, this frame's lowest.`
      : `${category.label} scored ${category.score}/100.`;
    picks.push({ key: category.id, topic: category.label, area: category.label, reason });
  }
  return picks.slice(0, 3).map((pick, index) => ({
    id: `search-${pick.key}`,
    url: youtubeSearch(`${pick.topic} photography tutorial`),
    priority_label: index === 0 ? 'Most needed' : 'Then explore',
    learning_goal: `Improve your ${pick.topic.toLowerCase()}`,
    reason: pick.reason,
    helps_with: [pick.area],
    isSearch: true,
  }));
}

function ImproveSection({ lessons, mistakes, categories }) {
  const supplied = (lessons || []).slice(0, 3);
  const shown = supplied.length ? supplied : searchRecommendations(mistakes, categories);
  if (!shown.length) return null;
  return <section className={SECTION} id="improve" aria-labelledby="improve-title">
    <SectionHeading
      id="improve-title"
      eyebrow="Improve"
      title="Lessons to level up"
      description={supplied.length
        ? 'YouTube lessons matched to where this photograph has the most room to grow.'
        : 'YouTube searches aimed at where this photograph has the most room to grow.'}
    />
    <div className="grid gap-6 sm:grid-cols-2">
      {shown.map((lesson, index) => {
        // The top recommendation leads: full width, big thumbnail, gold frame.
        const featured = index === 0;
        const thumbnail = lesson.thumbnail || lesson.thumbnailFallback;
        return <a
          className={featured
            ? 'group grid overflow-hidden rounded-2xl border-2 border-[#b8924a] bg-white shadow-[0_0_0_6px_rgba(184,146,74,0.12)] transition-colors sm:col-span-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] dark:bg-zinc-950'
            : 'group flex flex-col gap-3 overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700'}
          href={lesson.url || lesson.youtube_url}
          key={lesson.id || lesson.url || index}
          rel="noreferrer"
          target="_blank"
        >
        {thumbnail ? <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-900">
          <img
            className="size-full object-cover"
            src={thumbnail}
            alt=""
            loading="lazy"
            onError={(event) => {
              if (lesson.thumbnailFallback && event.currentTarget.src !== lesson.thumbnailFallback) event.currentTarget.src = lesson.thumbnailFallback;
              else event.currentTarget.parentElement.style.display = 'none';
            }}
          />
          {featured && <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover:bg-black/25" aria-hidden="true">
            <span className="grid size-16 place-items-center rounded-full bg-[#b8924a] text-2xl text-zinc-950 shadow-lg transition-transform duration-150 group-hover:scale-105">▶</span>
          </span>}
          {lesson.duration && <span className="absolute right-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">{lesson.duration}</span>}
        </div> : featured && <div className="grid aspect-video place-items-center bg-gradient-to-br from-[#b8924a] to-[#6b5226] text-zinc-950" aria-hidden="true">
          {/* A search has no single video, so no thumbnail; this tile marks it as a search instead. */}
          <span className="flex flex-col items-center gap-3">
            <span className="grid size-16 place-items-center rounded-full bg-zinc-950/85 text-2xl text-[#e9dcc0]">▶</span>
            <span className="text-sm font-medium">YouTube search</span>
          </span>
        </div>}
        <div className={featured ? 'flex flex-col justify-center gap-3 p-8' : 'flex flex-col gap-2 p-6'}>
          <span className={featured ? `${EYEBROW} w-fit rounded-full bg-[#b8924a]/15 px-2.5 py-1` : EYEBROW}>{featured ? 'Most recommended' : lesson.priority_label || 'Then explore'}</span>
          <strong className={featured ? 'result-read__display text-3xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100' : 'text-base font-medium text-zinc-900 dark:text-zinc-100'}>{lesson.learning_goal || lesson.title}</strong>
          {lesson.creator && <span className="text-xs text-zinc-500 dark:text-zinc-400">{lesson.creator}</span>}
          {lesson.reason && <p className="text-sm text-zinc-600 dark:text-zinc-400">{lesson.reason}</p>}
          {lesson.helps_with?.length > 0 && <div className="flex flex-wrap gap-1.5">{lesson.helps_with.map((tag, tagIndex) => <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400" key={tagIndex}>{tag}</span>)}</div>}
          <span className={featured ? `${PILL_PRIMARY} mt-2 w-fit` : 'mt-1 text-sm font-medium text-zinc-900 group-hover:underline dark:text-zinc-100'}>{lesson.isSearch ? 'Find lessons on YouTube' : 'Watch'} <span aria-hidden="true">→</span></span>
        </div>
      </a>;
      })}
    </div>
  </section>;
}

export function ResultRead({ analysis, file, previewUrl, imageDimensions, onDownloadReport, onAnalyzeAnother, isDownloadingReport = false, downloadError = '' }) {
  const model = useMemo(() => getResultReadModel(analysis), [analysis]);
  const photoAlt = file?.name ? `Analyzed photograph: ${file.name}` : 'Analyzed photograph';
  const [activeTab, setActiveTab] = useState('image');
  const [motionMode, setMotionMode] = useState('pointer');
  const layers = model.evidence.layers;
  const available = Object.fromEntries(TAB_ORDER.map((tab) => [tab, tab === 'image' || Boolean(layers[tab]?.asset || layers[tab]?.shapes.length || layers[tab]?.geometry?.horizon || layers[tab]?.geometry?.centroid || layers[tab]?.geometry?.leadingLines.length)]));
  const modes = TAB_ORDER.map((id) => ({
    id,
    label: id[0].toUpperCase() + id.slice(1),
    loadState: available[id] ? 'idle' : 'unavailable',
    unavailableReason: available[id] ? undefined : 'No spatial evidence is available for this layer.',
  }));
  const { sections, current } = useSectionIndex();
  const navbarVisible = useNavbarVisible();
  const mistakes = useMemo(() => deriveMistakes(model.frameWorks), [model.frameWorks]);
  const selectTab = (tab, input = 'pointer') => { if (available[tab]) { setMotionMode(input); setActiveTab(tab); } };

  return <main className="result-read relative">
    <a className="absolute top-6 left-6 z-10 font-semibold text-xl tracking-tight text-zinc-900 sm:left-10 dark:text-zinc-100" href={import.meta.env.VITE_LANDING_URL || 'https://snapgrade.com'}>snapgrade</a>

    {/* Tablet and up only, like the lamp. It slides away while reading down and drops back
        down on scroll up; inert while hidden so its links leave the tab order. */}
    {sections.length > 1 && <div
      className={`pointer-events-none fixed inset-x-0 top-3 z-40 hidden transition-transform duration-300 ease-out motion-reduce:transition-none md:block ${navbarVisible ? 'translate-y-0' : '-translate-y-24'}`}
      inert={!navbarVisible}
    >
      <MorphicNavbar
        ariaLabel="Jump to section"
        className="[&>div]:pointer-events-auto"
        items={Object.fromEntries(sections.map(([id, name]) => ['#' + id, { name }]))}
        value={'#' + current}
      />
    </div>}

    <div className="result-read__content mx-auto w-full max-w-6xl px-6 sm:px-10">
      {/* The scroll index is always visible. From tablet width up it hangs fixed under the pull-cord
          lamp, in the margin the content keeps clear for the lamp, so it needs no column of its own. */}
      <ScrollIndex
        className="md:block md:[&>nav]:fixed md:[&>nav]:top-[210px] md:[&>nav]:right-[100px]"
        scroller="window"
        selector="h2"
      >
      <section className="grid scroll-mt-20 gap-10 pt-24 pb-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center" id="read" aria-labelledby="result-title">
        <div className="result-read__hero-photo" aria-label="Photograph and visual evidence">
          <DiagnosticPanel modes={modes} activeModeId={activeTab} onModeChange={(id) => selectTab(id, 'pointer')}>
            <ResultPhotoViewport src={previewUrl} alt={photoAlt} className="result-read__photo-viewport--overview" imageDimensions={imageDimensions} objectFit="contain">
              <EvidenceLayer activeTab={activeTab} layers={layers} motionMode={motionMode} />
            </ResultPhotoViewport>
          </DiagnosticPanel>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className={EYEBROW}>What matters most</p>
            {model.genre && model.genre !== 'Photograph' && <span className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">{model.genre}</span>}
          </div>
          <h1 className="result-read__display mt-3 text-3xl font-medium tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100" id="result-title">{model.read.primary || 'Your photograph, read.'}</h1>
          {model.read.supporting
            ? <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">{model.read.supporting}</p>
            : !model.read.primary && <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">No written read was returned for this photograph.</p>}
          {model.score != null && <div className="mt-8 flex items-baseline gap-3" aria-label={`Overall score: ${model.score} out of 100`}>
            <span className={EYEBROW}>Overall</span>
            <strong className="result-read__display text-6xl font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{model.score}</strong>
            <span className="text-sm text-zinc-400">/100</span>
          </div>}
          <div className="mt-8 flex flex-wrap gap-3">
            {onDownloadReport && <button className={PILL_PRIMARY} type="button" onClick={onDownloadReport} disabled={isDownloadingReport}>
              {isDownloadingReport ? 'Preparing report…' : downloadError ? 'Try download again' : <>Download report <DownloadIcon className="size-4" aria-hidden="true" /></>}
            </button>}
            {onAnalyzeAnother && <button className={PILL_OUTLINE} type="button" onClick={onAnalyzeAnother}>Analyze another photograph</button>}
          </div>
          {downloadError && <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{downloadError}</p>}
          <span className="result-read__sr-only" role="status" aria-live="polite">{isDownloadingReport ? 'Preparing the report.' : ''}</span>
        </div>
      </section>

      <ScoresSection categories={model.frameWorks} />
      <ActionsSection actions={model.overviewActions} mistakes={mistakes} />
      <BreakdownSection categories={model.frameWorks} measuredPalette={model.measuredEvidence?.palette} />
      <MeasurementsSection evidence={model.measuredEvidence} />
      <ImproveSection lessons={model.measuredEvidence?.whatToLearnNext} mistakes={mistakes} categories={model.frameWorks} />

      {onAnalyzeAnother && <section className={`${SECTION} flex flex-wrap items-end justify-between gap-6`} aria-labelledby="another-title">
        <div>
          <p className={EYEBROW}>Ready for another frame?</p>
          <h2 className="result-read__display mt-2 text-3xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100" id="another-title">Put the feedback into practice.</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Your current analysis will be replaced.</p>
        </div>
        <button className={PILL_PRIMARY} type="button" onClick={onAnalyzeAnother}>Analyze another photograph <span aria-hidden="true">→</span></button>
      </section>}
      </ScrollIndex>
    </div>
  </main>;
}
