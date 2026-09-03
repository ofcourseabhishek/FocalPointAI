import re

with open('frontend/src/components/ResultRead.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_measured_evidence_section = r"""
function EvidenceMetricRow({ metric, isExpanded, onToggle }) {
  return (
    <article className="result-read__metric-row" data-expanded={isExpanded}>
      <button type="button" className="result-read__metric-button" onClick={onToggle} aria-expanded={isExpanded}>
        <span className="result-read__metric-name">{metric.label}</span>
        {metric.assessment && <span className="result-read__metric-assessment" data-assessment={String(metric.assessment).toLowerCase().replace(/\s+/g, '-')}>{metric.assessment}</span>}
        {metric.score !== null && <span className="result-read__metric-score">{metric.score}</span>}
        <span className="result-read__metric-toggle" aria-hidden="true">{isExpanded ? '−' : '+'}</span>
      </button>
      <div className="result-read__metric-content-wrapper" aria-hidden={!isExpanded}>
        <div className="result-read__metric-content">
          {metric.saw && (
            <div className="result-read__metric-block">
              <h4 className="result-read__metric-eyebrow">WHAT SNAPGRADE SAW</h4>
              <p>{metric.saw}</p>
            </div>
          )}
          {metric.matters && (
            <div className="result-read__metric-block">
              <h4 className="result-read__metric-eyebrow">WHY IT MATTERS</h4>
              <p>{metric.matters}</p>
            </div>
          )}
          {metric.works && (
            <div className="result-read__metric-block">
              <h4 className="result-read__metric-eyebrow">WHAT'S WORKING</h4>
              <p>{metric.works}</p>
            </div>
          )}
          {metric.improve && (
            <div className="result-read__metric-block">
              <h4 className="result-read__metric-eyebrow">WHAT WOULD IMPROVE IT</h4>
              <p>{metric.improve}</p>
            </div>
          )}
          {metric.try && (
            <div className="result-read__metric-block">
              <h4 className="result-read__metric-eyebrow">TRY THIS</h4>
              <p>{metric.try}</p>
            </div>
          )}
          {metric.learn && (
            <div className="result-read__metric-block result-read__metric-lesson">
              <h4 className="result-read__metric-eyebrow">LEARN THIS</h4>
              <div className="result-read__lesson-card">
                {metric.learn.thumbnail && <img src={metric.learn.thumbnail} alt="" />}
                <div className="result-read__lesson-info">
                  <strong>{metric.learn.title}</strong>
                  <span>{metric.learn.creator} · {metric.learn.duration}</span>
                  {metric.learn.url && <a href={metric.learn.url} target="_blank" rel="noreferrer">Watch ↗</a>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function MeasuredEvidenceSection({ evidence, frameWorks, previewUrl, file }) {
  const [activeCategory, setActiveCategory] = useState(frameWorks[0]?.id || 'composition');
  const [activeMetricId, setActiveMetricId] = useState(null);
  const [viewMode, setViewMode] = useState('analysis');
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
    setActiveMetricId(prev => (prev === id ? null : id));
    setActiveCategory(catId);
  };

  const layers = Object.fromEntries(
    [activeCategoryData].map((item) => [
      item.id,
      item.id === 'color' ? { ...item.evidence, shapes: [], geometry: EMPTY_GEOMETRY } : item.evidence
    ])
  );
  const isAnalysis = viewMode === 'analysis';

  return (
    <section className="result-read__measured" aria-labelledby="measured-evidence-title">
      <CurtainResiduals position="bottom-right" />
      <header className="result-read__chapter-hero result-read__chapter-hero--evidence">
        <h2 className="result-read__chapter-label">EVIDENCE</h2>
        <h3 className="result-read__chapter-title" id="measured-evidence-title">What the image is doing.</h3>
        <p className="result-read__chapter-desc">A closer read of the decisions inside the frame.</p>
        
        {evidence.capture?.hasSettings && (
          <details className="result-read__capture-details-widget">
            <summary className="result-read__capture-summary">
              <span>{evidence.capture.settings.map(s => s.value).join(' · ')}</span>
              <span className="result-read__capture-plus">+</span>
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
                  {category.metrics.length > 0 ? (
                    category.metrics.map((metric) => (
                      <EvidenceMetricRow 
                        key={metric.label} 
                        metric={metric} 
                        isExpanded={activeMetricId === `${category.id}-${metric.label}`} 
                        onToggle={() => handleToggleMetric(category.id, metric.label)}
                      />
                    ))
                  ) : (
                    <p className="result-read__metric-empty">No detailed metrics available.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <aside className="result-read__evidence-viewer-sticky">
          <div className="result-read__evidence-viewer">
            <div className="result-read__evidence-stage">
              <img className="result-read__evidence-photo-base" src={previewUrl} alt={photoAlt} />
              
              <div className="result-read__evidence-overlay-container" data-active={isAnalysis}>
                {activeCategory === 'focus' && evidence.focus?.map && (
                  <img className="result-read__evidence-focus-map" src={evidence.focus.map} alt="Focus map" data-active={isAnalysis} />
                )}
                {activeCategory !== 'focus' && (
                  <EvidenceLayer activeTab={activeCategory} layers={layers} motionMode="pointer" />
                )}
              </div>
            </div>
            
            <div className="result-read__evidence-viewer-controls">
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v)}>
                <ToggleGroupItem value="original">Original</ToggleGroupItem>
                <ToggleGroupItem value="analysis">Evidence</ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            {activeCategory === 'light' && evidence.tonal?.histogram && (
              <div className="result-read__evidence-technical-region">
                <h4>TONAL DISTRIBUTION</h4>
                <div className="result-read__histogram-chart-mini" aria-hidden="true">
                  <Suspense fallback={<Skeleton className="result-read__histogram-skeleton" />}>
                    <MeasuredHistogramChart data={evidence.tonal.histogram.map((value, index) => ({ bin: index + 1, value }))} />
                  </Suspense>
                </div>
                <div className="result-read__histogram-labels">
                  <span>SHADOWS</span>
                  <span>MIDTONES</span>
                  <span>HIGHLIGHTS</span>
                </div>
              </div>
            )}
            
            {activeCategory === 'color' && activeCategoryData.palette && activeCategoryData.palette.length > 0 && (
              <div className="result-read__evidence-technical-region">
                <h4>COLOUR PROFILE</h4>
                <div className="result-read__measured-palette-mini">
                  {activeCategoryData.palette.map((c, i) => (
                    <div key={i} className="result-read__palette-swatch-mini">
                      <span style={{ backgroundColor: c.hex || c }} aria-hidden="true" />
                      {c.percentage != null && <small>{c.percentage.toFixed(0)}%</small>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </aside>
      </div>
    </section>
  );
}
"""

start_str = "function TonalDistribution({ tonal }) {"
end_str = "function viewFromLocation() {"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_measured_evidence_section + "\n" + content[end_idx:]
    with open('frontend/src/components/ResultRead.jsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Replaced successfully!")
else:
    print("Could not find start or end strings.")
