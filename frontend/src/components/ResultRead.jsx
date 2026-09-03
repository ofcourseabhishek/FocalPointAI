import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { MorphIcon } from "morphicons/react";
import { Plus, Minus, ArrowUpRight } from "lucide";
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
import { PhotoMetaStrip } from './result/PhotoMetaStrip';
import { ResultDiagnosticSelector } from './result/ResultDiagnosticSelector';
import { DiagnosticPanel } from './result/DiagnosticPanel';
import { MetricEvidenceRow as SharedMetricEvidenceRow } from './result/MetricEvidenceRow';

import { DownloadIcon } from './icons/snapgrade-icons';

const TAB_ORDER = ['image', 'attention', 'light', 'focus', 'composition'];
const TAB_LABELS = { image: 'Image', attention: 'Attention', light: 'Light', focus: 'Focus', composition: 'Composition' };
const RESULT_VIEW_LABELS = { overview: 'Overview', evidence: 'Analysis', frame: 'Visual Breakdown' };
const RESULT_VIEW_TABS = RESULT_VIEW_ORDER.map((value) => ({ value, title: RESULT_VIEW_LABELS[value] }));
const CURTAIN_CHAPTERS = {
  overview: { label: 'OVERVIEW', title: 'What matters most.' },
  evidence: { label: 'ANALYSIS', title: 'Look closer.' },
  frame: { label: 'VISUAL BREAKDOWN', title: 'See it in the frame.' },
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

function OverlayDiagnostics({ category }) {
  if (!import.meta.env.DEV || !category?.evidence?.annotations?.length) return null;
  return <details className="result-read__overlay-diagnostics">
    <summary>Overlay diagnostics</summary>
    {category.evidence.annotations.map((annotation, index) => <pre key={`${annotation.id || annotation.kind}-${index}`}>{JSON.stringify({
      category: category.id,
      source: annotation.source || 'unspecified',
      ...(annotation.confidence !== null ? { confidence: annotation.confidence } : {}),
      geometry: annotation.kind === 'region' ? { type: annotation.kind, points: annotation.points } : annotation.kind === 'line' ? { type: annotation.kind, start: annotation.start, end: annotation.end } : { type: annotation.kind, x: annotation.x, y: annotation.y, width: annotation.width, height: annotation.height },
    }, null, 2)}</pre>)}
  </details>;
}

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

function TrustedSpatialOverlay({ evidence }) {
  return <>
    {evidence.asset && <OverlayAsset src={evidence.asset} />}
    <GeometryLayer geometry={evidence.geometry} shapes={evidence.shapes} />
    <PointMarkers geometry={evidence.geometry} shapes={evidence.shapes} />
  </>;
}

function CompositionOverlay({ evidence }) {
  return <>
    {evidence.asset && <OverlayAsset src={evidence.asset} />}
    <GeometryLayer geometry={evidence.geometry} shapes={evidence.shapes} showRuleOfThirds />
    <PointMarkers geometry={evidence.geometry} shapes={evidence.shapes} />
  </>;
}
function LightingOverlay({ evidence }) { return <TrustedSpatialOverlay evidence={evidence} />; }
function FocusOverlay({ evidence }) { return <TrustedSpatialOverlay evidence={evidence} />; }
function ColorOverlay({ evidence }) { return <TrustedSpatialOverlay evidence={evidence} />; }
function SubjectOverlay({ evidence }) { return <TrustedSpatialOverlay evidence={evidence} />; }
function PostProcessingOverlay({ evidence }) { return <TrustedSpatialOverlay evidence={evidence} />; }

const FRAME_OVERLAYS = {
  composition: CompositionOverlay,
  light: LightingOverlay,
  focus: FocusOverlay,
  color: ColorOverlay,
  visualHierarchy: SubjectOverlay,
  postProcessing: PostProcessingOverlay,
};

function VisualEvidenceOverlay({ categories, activeCategory, motionMode = 'scroll' }) {
  return <div className="result-read__frame-overlay-shell" data-motion={motionMode} aria-hidden="true">
    {categories.map((category) => {
      const CategoryOverlay = FRAME_OVERLAYS[category.id];
      return <div className="result-read__frame-overlay-layer" data-active={activeCategory === category.id} data-category={category.id} data-evidence-mode={category.evidenceMode} key={category.id}>
        {category.hasSpatialEvidence && CategoryOverlay ? <CategoryOverlay evidence={category.evidence} /> : null}
        <div className="result-read__frame-overlay-label">
          <span>{category.label} / Evidence</span>
          <strong>{category.descriptor}</strong>
        </div>
      </div>;
    })}
  </div>;
}

function FramePaletteRail({ categories, activeCategory }) {
  const colorCategory = categories.find((item) => item.id === 'color');
  const isVisible = activeCategory === 'color' && colorCategory?.palette?.length > 0;
  return <div className="result-read__frame-palette-shell" data-visible={isVisible} aria-hidden={!isVisible}>
    {colorCategory ? <Palette colors={colorCategory.palette} labels={colorCategory.paletteLabels} /> : null}
  </div>;
}

function FramePhoto({ previewUrl, file, imageDimensions, category, categories, activeCategory, lazy, motionMode, analysis }) {
  const visibleCategory = category || categories?.find((item) => item.id === activeCategory) || categories?.[0];
  const visibleCategories = categories || [visibleCategory];
  const visibleCategoryId = activeCategory || visibleCategory.id;
  const photoAlt = file?.name ? `Analyzed photograph: ${file.name}` : 'Analyzed photograph';
  return <div className="result-read__frame-visual flex flex-col h-full">
    <DiagnosticPanel modes={[]} activeModeId={visibleCategoryId} onModeChange={() => {}}>
      <ResultPhotoViewport src={previewUrl} alt={photoAlt} className="w-full h-full">
        <VisualEvidenceOverlay categories={visibleCategories} activeCategory={visibleCategoryId} motionMode={motionMode} />
      </ResultPhotoViewport>
      {analysis?.exif_analysis?.camera_settings && <PhotoMetaStrip {...analysis.exif_analysis.camera_settings} />}
    </DiagnosticPanel>
    <OverlayDiagnostics category={visibleCategory} />
    <FramePaletteRail categories={visibleCategories} activeCategory={visibleCategoryId} />
  </div>;
}




function FrameWorkSection({ categories, previewUrl, file, imageDimensions, analysis }) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || 'composition');
  const [motionMode, setMotionMode] = useState('scroll');
  const blocks = useRef({});
  const active = categories.find((category) => category.id === activeCategory) || categories[0];
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const updateActiveCategory = () => {
      const positions = Object.entries(blocks.current).filter(([, block]) => block).map(([category, block]) => { const bounds = block.getBoundingClientRect(); return { category, top: bounds.top, bottom: bounds.bottom }; });
      const isAtDocumentEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const centered = isAtDocumentEnd ? categories.at(-1)?.id : __testables.readingZoneCategory(positions, window.innerHeight / 2);
      if (centered) {
        setMotionMode('scroll');
        setActiveCategory(centered);
      }
    };
    const observer = new IntersectionObserver(updateActiveCategory, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.01] });
    Object.values(blocks.current).forEach((block) => block && observer.observe(block));
    updateActiveCategory();
    return () => observer.disconnect();
  }, [categories]);
  if (!active) return null;

  const selectCategory = (categoryId, input) => {
    setMotionMode(input);
    setActiveCategory(categoryId);
    const block = blocks.current[categoryId];
    if (!block) return;
    const top = window.scrollY + block.getBoundingClientRect().top - resultScrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  };

  return <section className="result-read__frame-works result-read__frame-page result-read__chapter-page" aria-labelledby="frame-works-title">
      <div className="result-read__frame-content">
        <header className="result-read__chapter-hero">
        <h2 className="result-read__chapter-label">VISUAL BREAKDOWN</h2>
        <h3 className="result-read__chapter-title" id="frame-works-title">See how the frame works.</h3>
        <p className="result-read__chapter-desc">See where composition, light, focus, color, and hierarchy are shaping the photograph.</p>
      </header>
      
    <div className="result-read__chapter-body result-read__frame-body result-read__frame-works-grid">
      <aside className="result-read__frame-sticky">
        <FramePhoto previewUrl={previewUrl} file={file} imageDimensions={imageDimensions} categories={categories} activeCategory={activeCategory} motionMode={motionMode} analysis={analysis} />
      </aside>
      <div className="result-read__frame-analysis">{categories.map((category) => <article className="result-read__frame-block" data-category={category.id} data-has-score={category.score != null} key={category.id} ref={(element) => { blocks.current[category.id] = element; }}>
        <div className="result-read__frame-block-top"><span>{category.sequence}</span><h3>{category.label}</h3></div>
        {category.score != null && <div className="result-read__frame-score" aria-label={`${category.label} score ${category.score}`}>{category.score}</div>}
        <p className="result-read__frame-interpretation">{category.interpretation}</p>
        {category.supporting && <p className="result-read__frame-supporting">{category.supporting}</p>}
        <div className="result-read__frame-mobile-photo"><FramePhoto previewUrl={previewUrl} file={file} imageDimensions={imageDimensions} category={category} lazy={true} motionMode="keyboard" analysis={analysis} /></div>
        {category.metrics.length > 0 && <dl className="result-read__metrics">{category.metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl>}
      </article>)}</div>
    </div>
      </div>
  </section>;
}




function MeasuredEvidenceSection({ evidence, frameWorks, previewUrl, file, imageDimensions, analysis }) {
  const [activeCategory, setActiveCategory] = useState(frameWorks[0]?.id || 'composition');
  const [expandedMetrics, setExpandedMetrics] = useState(() => new Set());
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const blocks = useRef({});

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const updateActiveCategory = () => {
      const positions = Object.entries(blocks.current).filter(([, block]) => block).map(([category, block]) => { const bounds = block.getBoundingClientRect(); return { category, top: bounds.top, bottom: bounds.bottom }; });
      const centered = __testables.readingZoneCategory(positions, window.innerHeight / 3);
      if (centered) {
        setActiveCategory(centered);
      }
    };
    const observer = new IntersectionObserver(updateActiveCategory, { rootMargin: '-30% 0px -60% 0px', threshold: [0, 0.01] });
    Object.values(blocks.current).forEach((block) => block && observer.observe(block));
    updateActiveCategory();
    return () => observer.disconnect();
  }, [frameWorks]);

  const activeCategoryData = frameWorks.find((c) => c.id === activeCategory) || frameWorks[0];
  const photoAlt = file?.name ? `Analyzed photograph: ${file.name}` : 'Analyzed photograph';

  const handleToggleMetric = (catId, metricLabel) => {
    const id = `${catId}-${metricLabel}`;
    setExpandedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActiveCategory(catId);
  };

  const layers = Object.fromEntries(
    frameWorks.map((item) => [
      item.id,
      item.id === 'color' ? { ...item.evidence, shapes: [], geometry: EMPTY_GEOMETRY } : item.evidence
    ])
  );
  const isAnalysis = expandedMetrics.size > 0;

  return (
    <section className="result-read__measured result-read__chapter-page" aria-labelledby="measured-evidence-title">
      <header className="result-read__chapter-hero">
        <h2 className="result-read__chapter-label">ANALYSIS</h2>
        <h3 className="result-read__chapter-title" id="measured-evidence-title">What the image is doing.</h3>
        <p className="result-read__chapter-desc">A closer read of the decisions inside the frame.</p>
        
        {evidence.capture?.hasSettings && (
          <details className="result-read__capture-details-widget" onToggle={(e) => setIsCaptureOpen(e.currentTarget.open)}>
            <summary className="result-read__capture-summary">
              <span>{evidence.capture.settings.map(s => s.value).join(' · ')}</span>
              <span className="result-read__capture-plus" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
                <MorphIcon icon={isCaptureOpen ? Minus : Plus} spring="snappy" strokeWidth={2} size={18} color="currentColor" />
              </span>
            </summary>
            <div className="result-read__capture-content">
              <h4>CAPTURE DETAILS</h4>
              <dl className="result-read__capture-list">
                {evidence.capture.supplemental.map((item) => (
                  <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
                ))}
                {evidence.capture.settings.map((item) => (
                  <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
                ))}
              </dl>
            </div>
          </details>
        )}
      </header>
      
      <div className="result-read__evidence-split-layout">
        <div className="result-read__evidence-analysis">
          {frameWorks.map((category) => {
            return (
              <div key={category.id} className="result-read__evidence-category" data-category={category.id} ref={(el) => { blocks.current[category.id] = el; }}>
                <div className="result-read__evidence-category-hero">
                  <h4 className="result-read__evidence-category-eyebrow">{category.sequence.split('/')[0]} / {category.label.toUpperCase()}</h4>
                  <p className="result-read__evidence-category-desc">{category.interpretation}</p>
                </div>
                
                <div className="result-read__metric-list">
                  {category.metrics.map((metric) => (
                    <SharedMetricEvidenceRow 
                      key={metric.id || metric.label} 
                      metric={metric} 
                      isExpanded={expandedMetrics.has(`${category.id}-${metric.label}`)} 
                      onToggle={() => handleToggleMetric(category.id, metric.label)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        <aside className="result-read__evidence-viewer-sticky">
          <div className="result-read__evidence-viewer h-full flex flex-col">
            <DiagnosticPanel
              modes={[]} // No modes in Analysis tab for now
            >
              <ResultPhotoViewport src={previewUrl} alt={photoAlt} className="w-full h-full min-h-[400px]">
                  <EvidenceLayer activeTab={activeCategory} layers={layers} motionMode="pointer" />
                  {evidence.focus?.map && (
                    <img 
                      className="result-read__evidence-focus-map absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-500" 
                      src={evidence.focus.map} 
                      alt="Focus map" 
                      style={{ opacity: activeCategory === 'focus' ? 1 : 0 }}
                    />
                  )}
              </ResultPhotoViewport>
              {analysis?.exif_analysis?.camera_settings && <PhotoMetaStrip {...analysis.exif_analysis.camera_settings} />}
              
              <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                {activeCategory === 'light' && evidence.tonal?.histogram?.length > 0 && (
                  <div className="result-read__evidence-technical-region bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 pointer-events-auto shadow-lg" data-region="histogram">
                    <h4 className="result-read__evidence-eyebrow text-xs font-bold tracking-widest text-zinc-500 mb-2">ANALYSIS / TONAL DISTRIBUTION</h4>
                    <div className="result-read__histogram-chart-mini" aria-hidden="true">
                      <Suspense fallback={<Skeleton className="result-read__histogram-skeleton h-24" />}>
                        <MeasuredHistogramChart data={evidence.tonal.histogram.map((value, index) => ({ bin: index + 1, value }))} />
                      </Suspense>
                    </div>
                    <div className="result-read__histogram-labels flex justify-between text-[10px] font-bold text-zinc-400 mt-2">
                      <span>SHADOWS</span>
                      <span>MIDTONES</span>
                      <span>HIGHLIGHTS</span>
                    </div>
                  </div>
                )}
                
                {activeCategory === 'color' && activeCategoryData.palette && activeCategoryData.palette.length > 0 && (
                  <div className="result-read__evidence-technical-region bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 pointer-events-auto shadow-lg" data-region="palette">
                    <h4 className="result-read__evidence-eyebrow text-xs font-bold tracking-widest text-zinc-500 mb-2">ANALYSIS / COLOUR PROFILE</h4>
                    <div className="result-read__measured-palette-mini flex gap-1 h-12">
                      {activeCategoryData.palette.map((c, i) => (
                        <div key={i} className="result-read__palette-swatch-mini flex-1 rounded-sm relative overflow-hidden group">
                          <span className="absolute inset-0" style={{ backgroundColor: c.hex || c }} aria-hidden="true" />
                          {c.percentage != null && <small className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{c.percentage.toFixed(0)}%</small>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {activeCategory === 'focus' && evidence.focus?.metrics && evidence.focus.metrics.length > 0 && (
                  <div className="result-read__evidence-technical-region bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 pointer-events-auto shadow-lg inline-block" data-region="focus">
                    <h4 className="result-read__evidence-eyebrow text-xs font-bold tracking-widest text-zinc-500 mb-2">PRIMARY FOCUS</h4>
                    <div className="result-read__focus-metrics-mini font-mono text-sm text-zinc-800 dark:text-zinc-200">
                      {evidence.focus.metrics.map(m => m.value).join(' · ')}
                    </div>
                  </div>
                )}
              </div>
            </DiagnosticPanel>
            
          </div>
        </aside>
      </div>

      {evidence.whatToLearnNext && evidence.whatToLearnNext.length > 0 && (
        <div className="result-read__learn-next-section">
          <div className="result-read__learn-next-header">
            <h4 className="result-read__learn-next-eyebrow">YOUR NEXT STEP</h4>
            <h3 className="result-read__learn-next-title">What to learn next</h3>
            <p className="result-read__learn-next-desc">A few lessons worth your time, based on the changes that would improve this photograph most.</p>
          </div>
          <div className="result-read__learn-next-list">
            {evidence.whatToLearnNext.map((lesson, index) => (
              <article key={lesson.id || lesson.url || index} className="result-read__learn-next-item">
                <div className="result-read__learn-next-number-row">
                  <span className="result-read__learn-next-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="result-read__learn-next-priority">{lesson.priority_label || (index === 0 ? "START HERE" : "THEN EXPLORE")}</span>
                </div>
                <a href={lesson.url || lesson.youtube_url} target="_blank" rel="noreferrer" className="result-read__learn-next-card">
                  {lesson.thumbnail && <div className="result-read__learn-next-thumbnail-wrapper">
                    <img src={lesson.thumbnail} alt="" className="result-read__learn-next-thumbnail" onError={(event) => { if (lesson.thumbnailFallback && event.currentTarget.src !== lesson.thumbnailFallback) event.currentTarget.src = lesson.thumbnailFallback; }} />
                    {lesson.duration && <span className="result-read__learn-next-duration">{lesson.duration}</span>}
                  </div>}
                  <div className="result-read__learn-next-content">
                    <strong className="result-read__learn-next-lesson-title">{lesson.learning_goal || lesson.title}</strong>
                    {lesson.creator && <div className="result-read__learn-next-meta">
                      <span className="result-read__learn-next-creator">{lesson.creator}</span>
                      {lesson.duration && <span className="result-read__learn-next-meta-duration">{lesson.duration}</span>}
                    </div>}
                    {lesson.reason && <p className="result-read__learn-next-reason">{lesson.reason}</p>}
                    
                    {lesson.helps_with && lesson.helps_with.length > 0 && (
                      <div className="result-read__learn-next-helps-wrapper">
                        <span className="result-read__learn-next-helps-label">HELPS WITH</span>
                        <span className="result-read__learn-next-helps-value">{lesson.helps_with.join(' · ')}</span>
                      </div>
                    )}
                    
                    <span className="result-read__learn-next-cta">
                      WATCH ON YOUTUBE <MorphIcon icon={ArrowUpRight} size={14} strokeWidth={2} style={{ marginLeft: 2 }} aria-hidden="true" />
                    </span>
                  </div>
                </a>
              </article>
            ))}
          </div>
        </div>
      )}
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
    actions?.change && <section className="result-read__action-section result-read__action-section--change" key="change" aria-labelledby="overview-change-title"><div className="result-read__change-layout"><h2 className="result-read__eyebrow" id="overview-change-title">Change one thing</h2><div className="result-read__change-content"><p className="result-read__change-priority"><strong>{actions.change.category} / {actions.change.action}:</strong> {actions.change.observation}</p>{actions.change.consequence && <div className="result-read__change-why"><h3>Why this matters</h3><p>{actions.change.consequence}</p></div>}</div></div></section>,
    actions?.tryThisNext && <section className="result-read__action-section result-read__action-section--next" key="next" aria-labelledby="overview-next-title"><div className="result-read__action-heading"><h2 className="result-read__eyebrow" id="overview-next-title">Try this next</h2></div><div className="result-read__next-content"><ol className="result-read__next-steps">{(actions.tryThisNext.variations || []).map((variation, index) => <li key={`variation-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{variation.approach}</h3><p>{variation.outcome}</p></div></li>)}</ol></div></section>,
  ].filter(Boolean);
  if (sections.length === 0 && !onAnalyzeAnother) return null;
  return <div className="result-read__overview-actions">{sections}{onAnalyzeAnother && <section className="result-read__overview-cta" aria-labelledby="overview-cta-title"><div><h2 className="result-read__eyebrow" id="overview-cta-title">Ready for another frame?</h2><p>Put the feedback into practice.</p><small>Your current analysis will be replaced.</small></div><button className="result-read__analyze-another" type="button" onClick={onAnalyzeAnother}>Analyze another photograph <span aria-hidden="true">→</span></button></section>}</div>;
}

export function ResultRead({ analysis, file, previewUrl, imageDimensions, onDownloadReport, onAnalyzeAnother, isDownloadingReport = false, downloadError = '' }) {
  const model = useMemo(() => getResultReadModel(analysis), [analysis]);
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
                modes={model.diagnosticModes} 
                activeModeId={activeTab} 
                onModeChange={(id) => selectTab(id, 'pointer')}
              >
                <ResultPhotoViewport src={previewUrl} alt={photoAlt} className="w-full h-full">
                  <EvidenceLayer activeTab={activeTab} layers={model.evidence.layers} motionMode={motionMode} />
                </ResultPhotoViewport>
                {analysis?.exif_analysis?.camera_settings && <PhotoMetaStrip {...analysis.exif_analysis.camera_settings} />}
              </DiagnosticPanel>
            </section>
            <aside className="result-read__read" aria-label="Overview"><h2 className="result-read__eyebrow">What matters most.</h2>{model.read.primary && <p className="result-read__statement">{model.read.primary}</p>}{model.read.supporting && <p className="result-read__supporting">{model.read.supporting}</p>}{!model.read.primary && !model.read.supporting && <p className="result-read__supporting">No written read was returned for this photograph.</p>}{model.score != null && <div className="result-read__score" aria-label={`Overall score: ${model.score} out of 100`}><span>Overall</span><strong>{model.score}</strong><small>/100</small></div>}</aside>
          </div>
          <OverviewActions actions={model.overviewActions} onAnalyzeAnother={onAnalyzeAnother} />
        </section>
        <section className="result-read__view-panel result-read__view-panel--frame" data-active={activeView === 'frame'} id="result-read-view-panel-frame" ref={(element) => { viewPanelRefs.current.frame = element; }} role="tabpanel" aria-labelledby="result-read-view-tab-frame" hidden={activeView !== 'frame'}>{visitedViews.has('frame') && <FrameWorkSection categories={model.frameWorks} previewUrl={previewUrl} file={file} imageDimensions={imageDimensions} analysis={analysis} />}</section>
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

