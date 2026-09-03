with open('frontend/src/result-read.css', 'a', encoding='utf-8') as f:
    f.write("""
/* Sticky Viewer Layout Update */
@media (min-width: 961px) {
  .result-read__evidence-viewer-sticky {
    position: sticky;
    top: 110px;
    height: calc(100vh - 110px - 32px);
  }
}

.result-read__evidence-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 24px;
}

.result-read__evidence-image-stage {
  flex: 1 1 0%;
  position: relative;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--rr-surface);
  border: 1px solid var(--rr-line);
  overflow: hidden;
}

.result-read__evidence-photo-base,
.result-read__evidence-focus-map,
.result-read__evidence-overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.result-read__evidence-viewer-controls-overlay {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
}

.result-read__evidence-technical-stage {
  flex-shrink: 0;
  animation: rr-fade-in 300ms ease forwards;
}

.result-read__evidence-technical-stage:empty {
  display: none;
}

.result-read__evidence-technical-region {
  animation: rr-fade-in 300ms ease forwards;
}

@keyframes rr-fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.result-read__evidence-eyebrow {
  margin: 0 0 16px 0;
  font-size: 11px;
  font-weight: 500;
  color: var(--rr-gold-text);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* Adjust histogram to fit the bottom area smoothly */
.result-read__evidence-technical-region .result-read__histogram {
  margin-top: 0;
}
.result-read__histogram-chart-mini {
  height: 120px;
  width: 100%;
  border-bottom: 1px solid var(--rr-line);
  position: relative;
}
.result-read__histogram-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 10px;
  color: var(--rr-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
""")
