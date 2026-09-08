import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import '../result-read.css';
import { __testables, getContainTransform, getResultReadModel } from '../lib/result-read';
import {
  RESULT_VIEW_ORDER,
  curtainDirection,
  executeCurtainTransition,
} from '../lib/result-curtain';
import { MorphicNavbar } from './ui/morphic-navbar';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { ResultPhotoViewport } from './result/ResultPhotoViewport';
import { DiagnosticPanel } from './result/DiagnosticPanel';
import { EvidenceAccordion } from './result/EvidenceAccordion';
import { MistakeCard } from './result/MistakeCard';
import { deriveMistakes } from '../lib/mistake-guidance';

import { DownloadIcon } from './icons/snapgrade-icons';

const TAB_ORDER = ['image', 'attention', 'light', 'focus', 'composition'];
const TAB_LABELS = { image: 'Image', attention: 'Attention', light: 'Light', focus: 'Focus', composition: 'Composition' };
const RESULT_VIEW_LABELS = { overview: 'Overview', evidence: 'Analysis', frame: 'Learn' };
const RESULT_VIEW_TABS = RESULT_VIEW_ORDER.map((value) => ({ value, title: RESULT_VIEW_LABELS[value] }));
const CURTAIN_CHAPTERS = {
  overview: { label: 'OVERVIEW', title: 'WHAT MATTERS MOST' },
  evidence: { label: 'ANALYSIS', title: 'LOOK CLOSER' },
  frame: { label: 'LEARN', title: 'WHAT TO LEARN NEXT' },
};
const EMPTY_THIRDS = { horizontal: [], vertical: [], intersections: [] };
const EMPTY_GEOMETRY = { leadingLines: [], horizon: null, centroid: null, ruleOfThirds: EMPTY_THIRDS };
const MeasuredHistogramChart = lazy(() => import('./MeasuredHistogramChart'));

function resultScrollOffset() {
  if (typeof document === 'undefined') return 108;
  const headerBottom = document.querySelector('.result-read__header')?.getBoundingClientRect().bottom;
  return Number.isFinite(headerBottom) && headerBottom > 0 ? Math.ceil(headerBottom) : 108;
}

function OverlayAsset({ src }) { return <img className="result-read__evidence-image" src={src} alt="" />; }

function useContainedImageRect(containerRef, imageDimensions) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !imageDimensions?.width || !imageDimensions?.height) return undefined;
    const update = () => {
      const bounds = container.getBoundingClientRect();
      setRect(getContainTransform(bounds.width, bounds.height, imageDimensions.width, imageDimensions.height));
    };
    update();
    if (!('ResizeObserver' in window)) {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, imageDimensions?.width, imageDimensions?.height]);
  return rect;
}

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
      {layer.asset && <OverlayAsset src={layer.asset} />}
      <GeometryLayer geometry={layer.geometry} shapes={layer.shapes} />
      <PointMarkers geometry={layer.geometry} shapes={layer.shapes} />
    </div>)}
  </div>;
}

function Palette({ colors, labels }) {
  if (!colors?.length) return null;
  return <div className="result-read__palette-evidence"><div className="result-read__palette" role="img" aria-label={`Supplied color palette: ${colors.join(', ')}`}>{colors.map((color, index) => <span key={`${color}-${index}`} style={{ backgroundColor: color }} />)}</div>{labels?.length === 2 && <div className="result-read__palette-labels"><span>{labels[0]}</span><span>{labels[1]}</span></div>}</div>;
}

function LearnNextSection({ evidence, frameWorks }) {
  const lessons = (evidence?.whatToLearnNext || []).slice(0, 4);
  const mistakes = useMemo(() => deriveMistakes(frameWorks), [frameWorks]);

  return <section className="result-read__frame-works result-read__frame-page result-read__chapter-page" aria-labelledby="learn-next-title">
    <div className="result-read__frame-content">
      <header className="result-read__chapter-hero">
        <h2 className="result-read__chapter-label">LEARN</h2>
        <h3 className="result-read__chapter-title" id="learn-next-title">WHAT WENT WRONG, AND HOW TO FIX IT</h3>
        <p className="result-read__chapter-desc">Here's what pulled this photograph down — whether it's rescuable now, and how to shoot around it next time.</p>
      </header>

      {mistakes.length > 0 ? (
        <div className="result-read__mistake-list">
          {mistakes.map((mistake) => (
            <MistakeCard key={mistake.id} {...mistake} />
          ))}
        </div>
      ) : (
        <p className="result-read__chapter-desc" style={{ marginTop: 40 }}>No significant issues were detected — this frame is technically solid. Explore the tutorials below to keep leveling up.</p>
      )}

      <div className="result-read__learn-next-section">
        <div className="result-read__learn-next-header">
          <h3 className="result-read__learn-next-title">What to learn next</h3>
          <p className="result-read__learn-next-desc">Tutorials matched to where this photograph has the most room to grow.</p>
        </div>

        {lessons.length > 0 ? (
          <div className="result-read__learn-next-grid">
            {lessons.map((lesson, index) => (
              <article
                key={lesson.id || lesson.url || index}
                className="result-read__learn-next-item"
                data-featured={index === 0}
              >
                <a href={lesson.url || lesson.youtube_url} target="_blank" rel="noreferrer" className="result-read__learn-next-card">
                  {(lesson.thumbnail || lesson.thumbnailFallback) && (
                    <div className="result-read__learn-next-thumb-wrapper">
                      <img
                        className="result-read__learn-next-thumb"
                        src={lesson.thumbnail || lesson.thumbnailFallback}
                        alt=""
                        loading="lazy"
                        onError={(event) => {
                          if (lesson.thumbnailFallback && event.currentTarget.src !== lesson.thumbnailFallback) {
                            event.currentTarget.src = lesson.thumbnailFallback;
                          } else {
                            event.currentTarget.closest('.result-read__learn-next-thumb-wrapper').style.display = 'none';
                          }
                        }}
                      />
                      <span className="result-read__learn-next-play" aria-hidden="true">▶</span>
                      {lesson.duration && <span className="result-read__learn-next-duration">{lesson.duration}</span>}
                    </div>
                  )}

                  <div className="result-read__learn-next-content">
                    <span className="result-read__learn-next-priority">{lesson.priority_label || (index === 0 ? 'MOST NEEDED' : 'THEN EXPLORE')}</span>
                    <strong className="result-read__learn-next-lesson-title">{lesson.learning_goal || lesson.title}</strong>
                    {lesson.creator && <span className="result-read__learn-next-creator">{lesson.creator}</span>}
                    {lesson.reason && <p className="result-read__learn-next-reason">{lesson.reason}</p>}

                    {lesson.helps_with && lesson.helps_with.length > 0 && (
                      <div className="result-read__learn-next-helps-wrapper">
                        <span className="result-read__learn-next-helps-label">Helps with</span>
                        <div className="result-read__learn-next-tags">
                          {lesson.helps_with.map((h, i) => <span className="result-read__learn-next-tag" key={i}>{h}</span>)}
                        </div>
                      </div>
                    )}

                    <span className="result-read__learn-next-cta">
                      Watch <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </a>
              </article>
            ))}
          </div>
        ) : (
          <p className="result-read__chapter-desc">No learning resources were returned for this photograph.</p>
        )}
      </div>
    </div>
  </section>;
}
function MeasuredEvidenceSection({ evidence, frameWorks, previewUrl, file, imageDimensions, analysis }) {
  const photoAlt = file?.name ? `Analyzed photograph: ${file.name}` : 'Analyzed photograph';

  return (
    <section className="result-read__measured result-read__chapter-page" aria-labelledby="measured-evidence-title">
      <header className="result-read__chapter-hero">
        <h2 className="result-read__chapter-label">ANALYSIS</h2>
        <h3 className="result-read__chapter-title" id="measured-evidence-title">WHAT THE IMAGE IS DOING</h3>
        <p className="result-read__chapter-desc">A closer read of the decisions inside the frame.</p>
      </header>
      
      <div className="result-read__technical-evidence-layout">
        <div className="result-read__technical-image">
          <h4 className="result-read__evidence-category-eyebrow result-read__eyebrow" style={{marginBottom: 16}}>IMAGE EVIDENCE</h4>
          <div className="result-read__frame-photo-frame">
            <DiagnosticPanel className="result-read__diagnostic-panel--analysis" modes={[]}>
              <ResultPhotoViewport src={previewUrl} alt={photoAlt} imageDimensions={imageDimensions} className="result-read__photo-viewport--analysis" />
            </DiagnosticPanel>
          </div>
        </div>
        
        <aside className="result-read__technical-sidebar">
          {evidence.tonal?.histogram?.length > 0 && (
            <div className="result-read__technical-block">
              <h4 className="result-read__eyebrow" style={{marginBottom: 16}}>TONAL RANGE</h4>
              <div className="result-read__histogram-chart-mini" aria-hidden="true">
                <Suspense fallback={<Skeleton className="result-read__histogram-skeleton h-24" />}>
                  <MeasuredHistogramChart data={evidence.tonal.histogram.map((value, index) => ({ bin: index + 1, value }))} />
                </Suspense>
              </div>
              <div className="result-read__histogram-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 500, color: 'var(--rr-muted)', marginTop: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <span>SHADOWS</span>
                <span>MIDTONES</span>
                <span>HIGHLIGHTS</span>
              </div>
            </div>
          )}
          
          {evidence.color?.palette?.length > 0 && (
            <div className="result-read__technical-block" style={{marginTop: 48}}>
              <h4 className="result-read__eyebrow" style={{marginBottom: 16}}>COLOR PROFILE</h4>
              <Palette colors={evidence.color.palette} />
            </div>
          )}
          
          {evidence.capture?.hasSettings && (
            <div className="result-read__technical-block" style={{marginTop: 48}}>
              <h4 className="result-read__eyebrow" style={{marginBottom: 16}}>CAPTURE DETAILS</h4>
              <dl className="result-read__capture-list" style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                {evidence.capture.supplemental.map((item) => (
                  <div key={item.label} style={{display: 'flex', justifyContent: 'space-between', fontSize: 12}}>
                    <dt style={{color: 'var(--rr-muted)'}}>{item.label}</dt>
                    <dd style={{margin: 0, fontWeight: 500}}>{item.value}</dd>
                  </div>
                ))}
                {evidence.capture.settings.map((item) => (
                  <div key={item.label} style={{display: 'flex', justifyContent: 'space-between', fontSize: 12}}>
                    <dt style={{color: 'var(--rr-muted)'}}>{item.label}</dt>
                    <dd style={{margin: 0, fontWeight: 500}}>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </aside>
      </div>

      <div className="result-read__metric-list result-read__analysis-faq">
        {frameWorks.map((category) => {
          const items = (category.metrics || [])
            .filter((metric) => metric.label)
            .map((metric, index) => ({
              id: metric.id || metric.label || String(index),
              title: metric.label,
              // Prefer the qualitative read (e.g. "Overexposed", "Rule of Thirds") over any raw number.
              descriptor: metric.assessment || metric.value,
            }))
            .filter((item) => item.descriptor);

          return (
            <div className="result-read__faq-category" key={category.id}>
              <h3 className="result-read__faq-category-label">{category.label}</h3>
              {category.score != null && <div className="result-read__faq-category-score">{category.score}</div>}
              {category.interpretation && <p className="result-read__faq-category-interpretation">{category.interpretation}</p>}

              {items.length > 0 && (
                <div className="result-read__evidence-list">
                  {items.map((item) => (
                    <EvidenceAccordion
                      key={item.id}
                      title={item.title}
                      valueTag={item.descriptor}
                      interactive={false}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function viewFromLocation() {
  if (typeof window === 'undefined') return 'overview';
  const segment = window.location.pathname.split('/').filter(Boolean).at(-1);
  return segment === 'frame' || segment === 'evidence' ? segment : 'overview';
}

function previewResultLocation() {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/analysis/preview') || new URLSearchParams(window.location.search).get('preview') === 'result';
}

function OverviewActions({ actions, onAnalyzeAnother }) {
  const keep = actions?.keep?.filter((item) => item?.label || item?.text).slice(0, 2) || [];
  
  const sections = [
    keep.length > 0 && <section className="result-read__action-section result-read__action-section--keep" key="keep" aria-labelledby="overview-keep-title"><div className="result-read__action-heading"><h2 className="result-read__eyebrow" id="overview-keep-title">Keep</h2><p>What deserves to stay.</p></div><ol>{keep.map((item, index) => <li key={`${item.label || 'keep'}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div>{item.text && item.label && <h3>{item.label}</h3>}<p>{item.text || item.label}</p></div></li>)}</ol></section>,
    
    actions?.change && <section className="result-read__action-section result-read__action-section--change" key="change" aria-labelledby="overview-change-title">
      <div className="result-read__change-layout">
        <h2 className="result-read__eyebrow" id="overview-change-title">Change one thing</h2>
        <div className="result-read__change-content">
          {actions.change.category && actions.change.category.toLowerCase() !== 'general' && (
            <h3 className="result-read__change-kicker result-read__eyebrow" style={{marginBottom: 16}}>{actions.change.category}</h3>
          )}
          <p className="result-read__change-priority">{actions.change.action}</p>
          {actions.change.observation && <p className="result-read__change-detail">{actions.change.observation}</p>}
          
          {actions.change.consequence && (
            <div className="result-read__change-why">
              <h3>Why this matters</h3>
              <p>{actions.change.consequence}</p>
            </div>
          )}
        </div>
      </div>
    </section>,
    
    actions?.tryThisNext && <section className="result-read__action-section result-read__action-section--next" key="next" aria-labelledby="overview-next-title">
      <div className="result-read__action-heading">
        <h2 className="result-read__eyebrow" id="overview-next-title">Try this next</h2>
        <p>{actions.tryThisNext.title || 'Practice Session'}</p>
      </div>
      <div className="result-read__next-content">
        <h3 className="result-read__next-instruction">{actions.tryThisNext.instruction || "Try three variations of the same frame."}</h3>
        {actions.tryThisNext.variations?.length > 0 && (
          <ol className="result-read__next-steps">
            {actions.tryThisNext.variations.map((variation, index) => (
              <li key={`variation-${index}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{variation.label || variation.approach || `Variation ${index + 1}`}</h3>
                  <p>{variation.instruction || variation.outcome || variation.text}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>,
  ].filter(Boolean);
  if (sections.length === 0 && !onAnalyzeAnother) return null;
  return <div className="result-read__overview-actions">{sections}{onAnalyzeAnother && <section className="result-read__overview-cta" aria-labelledby="overview-cta-title"><div><h2 className="result-read__eyebrow" id="overview-cta-title">Ready for another frame?</h2><p>Put the feedback into practice.</p><small>Your current analysis will be replaced.</small></div><button className="result-read__analyze-another" type="button" onClick={onAnalyzeAnother}>Analyze another photograph <span aria-hidden="true">→</span></button></section>}</div>;
}

export function ResultRead({ analysis, file, previewUrl, imageDimensions, onDownloadReport, onAnalyzeAnother, isDownloadingReport = false, downloadError = '' }) {
  const model = useMemo(() => getResultReadModel(analysis), [analysis]);
  const photoAlt = file?.name ? `Analyzed photograph: ${file.name}` : 'Analyzed photograph';
  const initialView = useRef(viewFromLocation());
  const [activeTab, setActiveTab] = useState('image');
  const [motionMode, setMotionMode] = useState('pointer');
  const [activeView, setActiveView] = useState(initialView.current);
  const [selectedView, setSelectedView] = useState(initialView.current);
  const [visitedViews, setVisitedViews] = useState(() => new Set([initialView.current]));
  const tabsRef = useRef({});
  const viewPanelRefs = useRef({});
  const activeViewRef = useRef(initialView.current);
  const selectedViewRef = useRef(initialView.current);
  const curtainRunningRef = useRef(false);
  const pendingNavigationRef = useRef(null);
  const selectViewRef = useRef(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const curtainStageRef = useRef(null);
  const curtainSurfaceRef = useRef(null);
  const curtainAccentRef = useRef(null);
  const curtainCopyRef = useRef(null);
  const curtainChapterLabelRef = useRef(null);
  const curtainChapterTitleRef = useRef(null);
  const available = Object.fromEntries(TAB_ORDER.map((tab) => [tab, tab === 'image' || Boolean(model.evidence.layers[tab]?.asset || model.evidence.layers[tab]?.shapes.length || model.evidence.layers[tab]?.geometry?.horizon || model.evidence.layers[tab]?.geometry?.centroid || model.evidence.layers[tab]?.geometry?.leadingLines.length)]));
  const overviewModes = useMemo(() => [
    { id: 'image', label: 'Image', loadState: 'idle' },
    { id: 'attention', label: 'Attention', loadState: available.attention ? 'idle' : 'unavailable', unavailableReason: available.attention ? undefined : 'No spatial evidence is available for this layer.' },
    { id: 'light', label: 'Light', loadState: available.light ? 'idle' : 'unavailable', unavailableReason: available.light ? undefined : 'No spatial evidence is available for this layer.' },
    { id: 'focus', label: 'Focus', loadState: available.focus ? 'idle' : 'unavailable', unavailableReason: available.focus ? undefined : 'No spatial evidence is available for this layer.' },
    { id: 'composition', label: 'Composition', loadState: available.composition ? 'idle' : 'unavailable', unavailableReason: available.composition ? undefined : 'No spatial evidence is available for this layer.' },
  ], [available]);
  const selectTab = (tab, input = 'pointer') => { if (available[tab]) { setMotionMode(input); setActiveTab(tab); } };
  const moveFocus = (event, currentIndex) => { const nextTab = __testables.nextAvailableTab(TAB_ORDER, available, TAB_ORDER[currentIndex], event.key); if (!nextTab) return; event.preventDefault(); selectTab(nextTab, 'keyboard'); tabsRef.current[nextTab]?.focus(); };
  const analysisId = previewResultLocation() ? 'preview' : analysis?.analysis_id || analysis?.id || 'current';

  const scrollViewIntoPlace = (view) => window.requestAnimationFrame(() => {
    const panel = viewPanelRefs.current[view];
    if (!panel) return;
    const target = window.scrollY + panel.getBoundingClientRect().top - resultScrollOffset();
    window.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
  });

  const commitView = ({ nextView, push, scroll }) => {
    if (nextView === activeViewRef.current) return;
    activeViewRef.current = nextView;
    flushSync(() => {
      setVisitedViews((current) => current.has(nextView) ? current : new Set([...current, nextView]));
      setActiveView(nextView);
    });
    if (push) {
      const suffix = nextView === 'overview' ? '' : `/${nextView}`;
      window.history.pushState({}, '', `/analysis/${encodeURIComponent(analysisId)}${suffix}${window.location.search}`);
    }
    if (scroll) scrollViewIntoPlace(nextView);
  };

  const runPageCurtain = async (nextView, direction, push, scroll) => {
    curtainRunningRef.current = true;
    flushSync(() => setIsTransitioning(true));
    const curtainStage = curtainStageRef.current;
    const curtainSurface = curtainSurfaceRef.current;
    const curtainAccent = curtainAccentRef.current;
    const curtainCopy = curtainCopyRef.current;
    const chapter = CURTAIN_CHAPTERS[nextView];
    
    if (curtainChapterLabelRef.current && curtainChapterTitleRef.current) {
      curtainChapterLabelRef.current.textContent = chapter.label;
      curtainChapterTitleRef.current.textContent = chapter.title;
    }

    await executeCurtainTransition({
      direction,
      stageElement: curtainStage,
      surfaceElement: curtainSurface,
      accentElement: curtainAccent,
      copyElement: curtainCopy,
      onPhaseChange: (phase) => {
        if (curtainStage) {
          curtainStage.dataset.direction = direction;
          curtainStage.dataset.phase = phase;
        }
      },
      onCovered: async () => {
        selectedViewRef.current = nextView;
        setSelectedView(nextView);
        commitView({ nextView, push: push && !pendingNavigationRef.current, scroll });
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
      },
      onComplete: () => {
        if (curtainStage) {
          delete curtainStage.dataset.direction;
          delete curtainStage.dataset.phase;
        }
        curtainRunningRef.current = false;
        setIsTransitioning(false);
        const pendingNavigation = pendingNavigationRef.current;
        pendingNavigationRef.current = null;
        if (pendingNavigation) selectViewRef.current?.(pendingNavigation.nextView, { push: false, scroll: pendingNavigation.scroll, input: 'history' });
      },
      onFallback: () => {
        selectedViewRef.current = nextView;
        setSelectedView(nextView);
        commitView({ nextView, push, scroll });
      },
    });
  };

  const selectView = (nextView, { push = true, scroll = true, input = 'pointer' } = {}) => {
    if (!RESULT_VIEW_ORDER.includes(nextView)) return;
    if (curtainRunningRef.current) {
      if (!push) pendingNavigationRef.current = { nextView, scroll };
      return;
    }
    if (nextView === selectedViewRef.current) return;

    const direction = curtainDirection(activeViewRef.current, nextView);
    if (!direction) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (input === 'keyboard' || reducedMotion) {
      selectedViewRef.current = nextView;
      setSelectedView(nextView);
      commitView({ nextView, push, scroll });
      return;
    }

    runPageCurtain(nextView, direction, push, scroll);
  };
  selectViewRef.current = selectView;

  useEffect(() => {
    const onPopState = () => {
      const nextView = viewFromLocation();
      selectViewRef.current?.(nextView, { push: false });
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  return <main className="result-read">
    <header className="result-read__header">
        <div className="result-read__header-left">
          <a className="result-read__wordmark" href={import.meta.env.VITE_LANDING_URL || 'https://snapgrade.com'}>snapgrade</a>
          <nav className="result-read__view-nav" aria-label="Analysis views"><MorphicNavbar activeItemClassName="result-read__view-tab--active" ariaLabel="Analysis views" containerClassName="result-read__view-tabs" indicatorClassName="result-read__view-indicator" itemClassName="result-read__view-tab" itemId={(view) => `result-read-view-tab-${view}`} items={RESULT_VIEW_TABS} onValueChange={(view, meta) => selectView(view, { input: meta.input })} panelId={(view) => `result-read-view-panel-${view}`} semanticValue={activeView} value={selectedView} /></nav>
        </div>
        <div className="result-read__header-actions">
          {onDownloadReport && <Button className="result-read__download" variant="ghost" type="button" onClick={onDownloadReport} disabled={isDownloadingReport}>{isDownloadingReport ? 'Preparing report…' : downloadError ? 'Try download again' : <>Download report <DownloadIcon data-icon="inline-end" aria-hidden="true" /></>}</Button>}{downloadError && <p className="result-read__download-error">{downloadError}</p>}<span className="result-read__sr-only" role="status" aria-live="polite">{downloadError || (isDownloadingReport ? 'Preparing the report.' : '')}</span>
        </div>
      </header>
      
    <section className="result-read__main" aria-label="Photography analysis result">
      <h1 className="result-read__sr-only">Photography analysis result</h1>
      
      <div className="result-read__view-content" aria-busy={isTransitioning} inert={isTransitioning}>
        <section className="result-read__view-panel result-read__view-panel--overview result-read__chapter-page" data-active={activeView === 'overview'} id="result-read-view-panel-overview" ref={(element) => { viewPanelRefs.current.overview = element; }} role="tabpanel" aria-labelledby="result-read-view-tab-overview" hidden={activeView !== 'overview'}>
          <div className="result-read__grid">
            <section className="result-read__image-column" aria-label="Photograph and visual evidence">
              <DiagnosticPanel 
                modes={overviewModes} 
                activeModeId={activeTab} 
                onModeChange={(id, input) => selectTab(id, input)}
              >
                <ResultPhotoViewport src={previewUrl} alt={photoAlt} className="result-read__photo-viewport--overview">
                  <EvidenceLayer activeTab={activeTab} layers={model.evidence.layers} motionMode={motionMode} />
                </ResultPhotoViewport>
              </DiagnosticPanel>
            </section>
            <aside className="result-read__read" aria-label="Overview"><h2 className="result-read__eyebrow">WHAT MATTERS MOST</h2>{model.read.primary && <p className="result-read__statement">{model.read.primary}</p>}{model.read.supporting && <p className="result-read__supporting">{model.read.supporting}</p>}{!model.read.primary && !model.read.supporting && <p className="result-read__supporting">No written read was returned for this photograph.</p>}{model.score != null && <div className="result-read__score" aria-label={`Overall score: ${model.score} out of 100`}><span>Overall</span><strong>{model.score}</strong><small>/100</small></div>}</aside>
          </div>
          <OverviewActions actions={model.overviewActions} onAnalyzeAnother={onAnalyzeAnother} />
        </section>
        <section className="result-read__view-panel result-read__view-panel--frame" data-active={activeView === 'frame'} id="result-read-view-panel-frame" ref={(element) => { viewPanelRefs.current.frame = element; }} role="tabpanel" aria-labelledby="result-read-view-tab-frame" hidden={activeView !== 'frame'}>{visitedViews.has('frame') && <LearnNextSection evidence={model.measuredEvidence} frameWorks={model.frameWorks} />}</section>
        <section className="result-read__view-panel result-read__view-panel--evidence" data-active={activeView === 'evidence'} id="result-read-view-panel-evidence" ref={(element) => { viewPanelRefs.current.evidence = element; }} role="tabpanel" aria-labelledby="result-read-view-tab-evidence" hidden={activeView !== 'evidence'}>{visitedViews.has('evidence') && <MeasuredEvidenceSection evidence={model.measuredEvidence} frameWorks={model.frameWorks} previewUrl={previewUrl} file={file} imageDimensions={imageDimensions} analysis={analysis} />}</section>
      </div>
    </section>
    
      <div className="result-read__page-curtain" data-active={isTransitioning} aria-hidden="true" ref={curtainStageRef}>
        <div className="result-read__page-curtain-layer result-read__page-curtain-accent" ref={curtainAccentRef} />
        <div className="result-read__page-curtain-layer result-read__page-curtain-surface" ref={curtainSurfaceRef}>
          <div className="result-read__curtain-copy" ref={curtainCopyRef}><span className="result-read__curtain-label" ref={curtainChapterLabelRef} /><strong className="result-read__curtain-title" ref={curtainChapterTitleRef} /></div>
        </div>
      </div>
  </main>;
}

