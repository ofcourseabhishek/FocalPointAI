import re

with open('frontend/src/components/ResultRead.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the aside block
new_aside = """        <aside className="result-read__evidence-viewer-sticky">
          <div className="result-read__evidence-viewer">
            <div className="result-read__evidence-image-stage">
              <img className="result-read__evidence-photo-base" src={previewUrl} alt={photoAlt} />
              
              <div className="result-read__evidence-overlay-container" data-active={isAnalysis}>
                {activeCategory === 'focus' && evidence.focus?.map && (
                  <img className="result-read__evidence-focus-map" src={evidence.focus.map} alt="Focus map" data-active={isAnalysis} />
                )}
                {activeCategory !== 'focus' && (
                  <EvidenceLayer activeTab={activeCategory} layers={layers} motionMode="pointer" />
                )}
              </div>
              <div className="result-read__evidence-viewer-controls-overlay">
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v)}>
                  <ToggleGroupItem value="original">Original</ToggleGroupItem>
                  <ToggleGroupItem value="analysis">Evidence</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            
            <div className="result-read__evidence-technical-stage" data-category={activeCategory}>
              {activeCategory === 'light' && evidence.tonal?.histogram && (
                <div className="result-read__evidence-technical-region">
                  <h4 className="result-read__evidence-eyebrow">EVIDENCE / TONAL DISTRIBUTION</h4>
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
                  <h4 className="result-read__evidence-eyebrow">EVIDENCE / COLOUR PROFILE</h4>
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
            
          </div>
        </aside>"""

pattern = re.compile(r'<aside className="result-read__evidence-viewer-sticky">.*?</aside>', re.DOTALL)
content = pattern.sub(new_aside, content)

with open('frontend/src/components/ResultRead.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
