import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import '../result-read.css';
import { getResultReadModel, youtubeVideoId } from '../lib/result-read';
import { Skeleton } from './ui/skeleton';
import { ResultPhotoViewport } from './result/ResultPhotoViewport';
import { describeMetric } from '../lib/metric-guide';
import { MorphicNavbar } from './kokonutui/morphic-navbar';
import ScrollIndex from './kokonutui/scroll-index';
import { MistakeCard } from './result/MistakeCard';
import { SectionMenu } from './result/SectionMenu';
import CardFlip from './kokonutui/card-flip';
import CardStack from './kokonutui/card-stack';
import { MorphIcon } from 'morphicons/react';
import { deriveMistakes } from '../lib/mistake-guidance';
import { weakAreas, WEAK_BELOW } from '../lib/weak-areas';
import { lessonDeck } from '../lib/lesson-deck';

import { DownloadIcon } from './icons/snapgrade-icons';

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
      <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">What pulled this photograph down, and how to fix it in editing where that's possible.</p>
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

// Tap or drag a flip card to turn it; the graph is the front, the numbers the back.
const FLIP_FACE = 'measure-gloss rounded-xl border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950';
const GLOSS_CARD = `${CARD} measure-gloss`;
const FLIP_HINT = 'mt-auto pt-3 text-center text-xs text-zinc-400';

function MeasureFlip({ label, front, back }) {
  const faces = [
    <>{front}<p className={FLIP_HINT}>Tap to see the numbers</p></>,
    <>{back}<p className={FLIP_HINT}>Tap to see the graph</p></>,
  ];
  return <div className="relative">
    {/* A hidden in-flow copy of both faces, stacked in one cell: the card takes the taller
        side's height, so neither side ever has to scroll. */}
    <div className="invisible grid" aria-hidden="true" inert>
      {faces.map((face, index) => <div className="col-start-1 row-start-1 flex flex-col border border-transparent p-6" key={index}>{face}</div>)}
    </div>
    <CardFlip
      label={label}
      className="absolute inset-0 aspect-auto h-auto w-full"
      faceClassName={FLIP_FACE}
      front={<div className="flex h-full flex-col">{faces[0]}</div>}
      back={<div className="flex h-full flex-col">{faces[1]}</div>}
    />
  </div>;
}

function MeasurementsSection({ evidence }) {
  const tonal = evidence?.tonal;
  const focus = evidence?.focus;
  const capture = evidence?.capture;
  const geometry = evidence?.geometry;
  // Start on the simple tonal curve; RGB is opt-in (or the only view, if that is all there is).
  const [rgbView, setRgbView] = useState(() => !(tonal?.histogram?.length > 0));
  const showRgb = Boolean(tonal?.rgb) && rgbView;
  const hasHistogram = Boolean(tonal?.rgb) || tonal?.histogram?.length > 0;
  const hasTonal = hasHistogram || tonal?.metrics?.length > 0;
  const hasFocus = Boolean(focus?.map) || focus?.metrics?.length > 0;
  const hasCapture = capture?.hasSettings || capture?.supplemental?.length > 0;
  const hasGeometry = geometry?.length > 0;
  if (!hasTonal && !hasFocus && !hasGeometry && !hasCapture) return null;

  const tonalTitle = <div className="flex items-center justify-between gap-4">
    <h3 className={EYEBROW}>Tonal range</h3>
    {tonal?.rgb && tonal?.histogram?.length > 0 && <HistogramViewSwitch checked={rgbView} onChange={setRgbView} />}
  </div>;
  const tonalGraph = <>
    <div
      className={showRgb
        ? 'result-read__camera-histogram mt-4 h-[140px] overflow-hidden rounded-md border border-zinc-500/70 bg-black p-1 [isolation:isolate]'
        : 'result-read__histogram-chart-mini mt-4 text-zinc-700 dark:text-zinc-300'}
      aria-hidden="true"
    >
      <Suspense fallback={<Skeleton className="result-read__histogram-skeleton h-24" />}>
        <MeasuredHistogramChart
          view={showRgb ? 'rgb' : 'tonal'}
          rgb={tonal?.rgb}
          luminance={tonal?.histogram}
          clipLevels={tonal?.clipLevels}
          shadowClipping={tonal?.shadowClipping}
          highlightClipping={tonal?.highlightClipping}
        />
      </Suspense>
    </div>
    <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400"><span>Shadows</span><span>Midtones</span><span>Highlights</span></div>
    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
      Shaded edges: clipped below {tonal?.clipLevels?.shadow} or above {tonal?.clipLevels?.highlight} (gold when over 1%)
    </p>
  </>;
  const tonalRead = tonal?.interpretation && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{tonal.interpretation}</p>;
  const focusTitle = <h3 className={EYEBROW}>Focus &amp; sharpness</h3>;
  const focusMap = focus?.map && <figure className="mt-4">
    <img className="max-h-64 w-full rounded-lg bg-zinc-100 object-contain dark:bg-zinc-900" src={focus.map} alt="Focus map" />
    <figcaption className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Brighter areas hold more detail.</figcaption>
  </figure>;

  // One card per measurement; a card with a graph becomes a flip card: the read and graph on the front,
  // the numbers on the back.
  const cards = [
    hasTonal && {
      id: 'tonal',
      content: hasHistogram
        ? <MeasureFlip label="Tonal range" front={<>{tonalTitle}{tonalRead}{tonalGraph}</>} back={<><h3 className={EYEBROW}>Tonal range</h3><Facts items={tonal.metrics} /></>} />
        : <article className={GLOSS_CARD}>{tonalTitle}{tonalRead}<Facts items={tonal.metrics} /></article>,
    },
    hasFocus && {
      id: 'focus',
      content: focusMap
        ? <MeasureFlip label="Focus and sharpness" front={<>{focusTitle}{focusMap}</>} back={<>{focusTitle}<Facts items={focus.metrics} /></>} />
        : <article className={GLOSS_CARD}>{focusTitle}<Facts items={focus.metrics} /></article>,
    },
    hasGeometry && {
      id: 'geometry',
      content: <article className={GLOSS_CARD}><h3 className={EYEBROW}>Geometry &amp; balance</h3><Facts items={geometry} /></article>,
    },
    hasCapture && {
      id: 'capture',
      content: <article className={GLOSS_CARD}><h3 className={EYEBROW}>Capture details</h3><Facts items={[...(capture.supplemental || []), ...(capture.settings || [])]} /></article>,
    },
  ].filter(Boolean);

  return <section className={SECTION} id="measurements" aria-labelledby="measurements-title">
    <SectionHeading id="measurements-title" eyebrow="Measurements" title="The numbers behind the read" description="What the pixels measure, independent of taste." />
    {/* Phones: one column. Wider screens: two. */}
    <div className="grid items-start gap-6 md:grid-cols-2">
      {cards.map((card) => <div key={card.id}>{card.content}</div>)}
    </div>
  </section>;
}

/** A lesson's thumbnail, or a gold tile for a search, which has no single video. */
function LessonArt({ lesson }) {
  const thumbnail = lesson.thumbnail || lesson.thumbnailFallback;
  if (!thumbnail) {
    return <span className="grid size-full place-items-center bg-gradient-to-br from-[#b8924a] to-[#6b5226] text-zinc-950" aria-hidden="true">
      <span className="flex flex-col items-center gap-2">
        <span className="grid size-12 place-items-center rounded-full bg-zinc-950/85 text-xl text-[#e9dcc0]">▶</span>
        <span className="text-xs font-medium">YouTube search</span>
      </span>
    </span>;
  }
  return <img
    className="size-full object-cover"
    src={thumbnail}
    alt=""
    draggable={false}
    loading="lazy"
    onError={(event) => {
      if (lesson.thumbnailFallback && event.currentTarget.src !== lesson.thumbnailFallback) event.currentTarget.src = lesson.thumbnailFallback;
    }}
  />;
}

// Desktop steps the text up so it holds its own beside the lesson deck.
// solid uses the same rule as "What went wrong" (no detected mistakes), so the two sections
// never disagree about whether the frame is technically solid.
function WeakAreas({ areas, hasWeak, solid }) {
  return <div>
    <h3 className={EYEBROW}>{hasWeak && !solid ? 'What needs the most work' : 'What limits its potential'}</h3>
    {solid && <p className="mt-3 text-sm lg:text-[15px] text-zinc-600 dark:text-zinc-400">
      No significant issues were detected. This frame is technically solid.
      {areas.length > 0 && ' What would lift it further are the areas below, its weakest relative to the rest, and the lessons in this section are picked to help with them.'}
    </p>}
    {areas.length > 0 && <ol className="mt-5 grid gap-6">
      {areas.map((area) => <li className="border-l-2 border-[#b8924a]/60 pl-4" key={area.id}>
        <div className="flex items-baseline justify-between gap-4">
          <h4 className="text-base font-medium lg:text-[17px] text-zinc-900 dark:text-zinc-100">
            {area.label}{area.label !== area.area && <span className="font-normal text-zinc-500 dark:text-zinc-400"> · {area.area}</span>}
          </h4>
          <span className="result-read__display shrink-0 text-lg tabular-nums lg:text-xl text-zinc-900 dark:text-zinc-100">{area.score}<small className="ml-0.5 text-xs text-zinc-400 lg:text-sm">/100</small></span>
        </div>
        {area.note && <p className="mt-1 text-sm lg:text-[15px] text-zinc-600 dark:text-zinc-400">{area.note}</p>}
        {area.tip && <p className="mt-2 text-sm lg:text-[15px] text-zinc-600 dark:text-zinc-400"><span className="font-medium text-[#856324] dark:text-[#d2b16e]">Next time you shoot:</span> {area.tip}</p>}
      </li>)}
    </ol>}
  </div>;
}

function ImproveSection({ lessons, mistakes, categories }) {
  // Problems Actions can't fix in post point here, so they are always listed.
  const unfixable = mistakes.filter((mistake) => !mistake.canFixInPost).map((mistake) => ({ area: mistake.categoryLabel, label: mistake.metricLabel }));
  const { areas, hasWeak } = weakAreas(categories, { include: unfixable });
  const solid = mistakes.length === 0;
  const supplied = lessons || [];
  // At least four cards, or one per area under the cutoff: real lessons first, then searches.
  const shown = lessonDeck({ lessons: supplied, weak: areas.filter((area) => area.score < WEAK_BELOW), mistakes, categories });
  if (!shown.length) return null;
  // Closed: the thumbnail and what the lesson teaches. Open: the player (searches have none),
  // why it was suggested, and the video's title, creator, length and topic.
  const cards = shown.map((lesson, index) => {
    const href = lesson.url || lesson.youtube_url;
    const videoId = lesson.isSearch ? '' : youtubeVideoId(href);
    const topic = lesson.category || lesson.helps_with?.join(', ');
    return {
      id: lesson.id || href || String(index),
      title: lesson.learning_goal || lesson.title,
      subtitle: lesson.priority_label,
      detailTitle: lesson.title || lesson.learning_goal,
      art: <LessonArt lesson={lesson} />,
      player: videoId ? <iframe
        className="size-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={lesson.title || 'YouTube lesson'}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      /> : null,
      descriptionLabel: lesson.reason ? 'Why we suggested it' : '',
      description: lesson.reason,
      specs: [['Creator', lesson.creator], ['Length', lesson.duration], ['Topic', topic]]
        .filter(([, value]) => value).map(([label, value]) => ({ label, value })),
      actionLabel: videoId ? 'Watch on YouTube' : 'Find lessons on YouTube',
      href,
    };
  });
  return <section className={SECTION} id="improve" aria-labelledby="improve-title">
    <SectionHeading
      id="improve-title"
      eyebrow="Improve"
      title="Lessons to level up"
      description={supplied.length
        ? 'YouTube lessons matched to where this photograph has the most room to grow.'
        : 'YouTube searches aimed at where this photograph has the most room to grow.'}
    />
    {/* Lessons first: above the text on narrow screens, on the left on desktop. */}
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <CardStack
        cards={cards}
        accent="#b8924a"
        onAction={(card) => window.open(card.href, '_blank', 'noopener,noreferrer')}
      />
      {(areas.length > 0 || solid) && <div><WeakAreas areas={areas} hasWeak={hasWeak} solid={solid} /></div>}
    </div>
  </section>;
}

export function ResultRead({ analysis, file, previewUrl, imageDimensions, onDownloadReport, onAnalyzeAnother, isDownloadingReport = false, downloadError = '', theme, onThemeChange }) {
  const model = useMemo(() => getResultReadModel(analysis), [analysis]);
  const photoAlt = file?.name ? `Analyzed photograph: ${file.name}` : 'Analyzed photograph';
  // Sizes the gallery mount to the photo, so the mat stays even on all four sides.
  const heroAspect = imageDimensions?.width > 0 && imageDimensions?.height > 0 ? imageDimensions.width / imageDimensions.height : null;
  const { sections, current } = useSectionIndex();
  const navbarVisible = useNavbarVisible();
  const mistakes = useMemo(() => deriveMistakes(model.frameWorks), [model.frameWorks]);

  return <main className="result-read relative">
    <a className="absolute top-6 left-[4.5rem] z-10 font-['Neue_Haas_Grotesk_Display',Geist,Inter,sans-serif] font-semibold text-xl tracking-tight text-zinc-900 lg:left-10 dark:text-zinc-100" href={import.meta.env.VITE_LANDING_URL || 'https://snapgradebyark.vercel.app'}>snapgrade</a>

    {/* Desktop only, like the lamp; smaller screens get the SectionMenu. It slides away while reading down and drops back
        down on scroll up; inert while hidden so its links leave the tab order. */}
    {sections.length > 1 && <div
      className={`pointer-events-none fixed inset-x-0 top-3 z-40 hidden transition-transform duration-300 ease-out motion-reduce:transition-none lg:block ${navbarVisible ? 'translate-y-0' : '-translate-y-24'}`}
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
      {/* From tablet width up the scroll index hangs fixed in the right margin the content keeps
          clear, so it needs no column of its own. Phones hide it and use the SectionMenu. */}
      <ScrollIndex
        className="block max-md:[&>nav]:hidden md:[&>nav]:fixed md:[&>nav]:top-[210px] md:[&>nav]:right-[100px]"
        scroller="window"
        selector="h2"
      >
      <section className="grid scroll-mt-20 gap-10 pt-24 pb-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center" id="read" aria-labelledby="result-title">
        <div className="result-read__hero-photo" style={heroAspect ? { '--hero-aspect': heroAspect } : undefined}>
          <ResultPhotoViewport src={previewUrl} alt={photoAlt} className="result-read__photo-viewport--overview" imageDimensions={imageDimensions} objectFit="contain" />
        </div>

        {/* Phones: centred like the upload page. */}
        <div className="max-md:text-center">
          <div className="flex flex-wrap items-center gap-2 max-md:justify-center">
            <p className={EYEBROW}>What matters most</p>
            {model.genre && model.genre !== 'Photograph' && <span className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">{model.genre}</span>}
          </div>
          <h1 className="result-read__display mt-3 text-2xl font-medium tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-100" id="result-title">{model.read.primary || 'Your photograph, read.'}</h1>
          {model.read.supporting
            ? <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">{model.read.supporting}</p>
            : !model.read.primary && <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">No written read was returned for this photograph.</p>}
          {model.score != null && <div className="mt-8 flex items-baseline gap-3 max-md:justify-center" aria-label={`Overall score: ${model.score} out of 100`}>
            <span className={EYEBROW}>Overall</span>
            <strong className="result-read__display text-6xl font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{model.score}</strong>
            <span className="text-sm text-zinc-400">/100</span>
          </div>}
          <div className="mt-8 flex flex-wrap gap-3 max-md:justify-center">
            {onDownloadReport && <button className={PILL_PRIMARY} type="button" onClick={onDownloadReport} disabled={isDownloadingReport}>
              {isDownloadingReport ? 'Preparing report…' : downloadError ? 'Try download again' : <>Download report <DownloadIcon className="size-4" aria-hidden="true" /></>}
            </button>}
            {/* The short label lets both pills share one row on phones. */}
            {onAnalyzeAnother && <button className={PILL_OUTLINE} type="button" onClick={onAnalyzeAnother}><span className="md:hidden">New photo</span><span className="max-md:hidden">Analyze another photograph</span></button>}
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
    <SectionMenu sections={sections} current={current} theme={theme} onThemeChange={onThemeChange} />
  </main>;
}
