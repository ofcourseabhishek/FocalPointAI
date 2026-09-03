with open('frontend/src/result-read.css', 'a', encoding='utf-8') as f:
    f.write("""

/* NEW EVIDENCE LAYOUT */

.result-read__evidence-split-layout {
  display: grid;
  grid-template-columns: minmax(0, 44fr) minmax(280px, 48fr);
  align-items: start;
  gap: 8%;
  margin-top: 60px;
}

.result-read__evidence-analysis {
  display: flex;
  flex-direction: column;
  gap: 120px;
}

.result-read__evidence-category-hero {
  margin-bottom: 40px;
}

.result-read__evidence-category-eyebrow {
  margin: 0;
  color: var(--rr-ink);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  line-height: 1.45;
  text-transform: uppercase;
}

.result-read__evidence-category-desc {
  margin: 12px 0 0;
  color: var(--rr-muted);
  font-size: 16px;
  line-height: 1.5;
}

.result-read__metric-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--rr-line);
}

.result-read__metric-row {
  border-bottom: 1px solid var(--rr-line);
}

.result-read__metric-button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto 32px;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-height: 72px;
  padding: 22px 0;
  background: transparent;
  border: 0;
  color: var(--rr-ink);
  text-align: left;
  cursor: pointer;
  transition: background-color 200ms ease;
}

.result-read__metric-button:hover .result-read__metric-name {
  transform: translateX(1px);
}

.result-read__metric-button:hover .result-read__metric-toggle {
  color: var(--rr-gold);
}

.result-read__metric-name {
  font-size: 18px;
  font-weight: 500;
  line-height: 1.2;
  transition: transform 180ms ease;
}

.result-read__metric-assessment {
  font-size: 13px;
  color: var(--rr-muted);
}
.result-read__metric-assessment[data-assessment="needs-work"],
.result-read__metric-assessment[data-assessment="developing"] {
  color: var(--rr-gold-text);
}
.result-read__metric-assessment[data-assessment="needs-work"] {
  font-weight: 500;
}

.result-read__metric-score {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.result-read__metric-toggle {
  font-size: 18px;
  font-weight: 400;
  color: var(--rr-muted);
  text-align: right;
  transition: color 180ms ease;
}

.result-read__metric-row[data-expanded="true"] .result-read__metric-name {
  color: var(--rr-focus);
}

.result-read__metric-content-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 350ms var(--rr-ease-out);
}

.result-read__metric-row[data-expanded="true"] .result-read__metric-content-wrapper {
  grid-template-rows: 1fr;
}

.result-read__metric-content {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.result-read__metric-row[data-expanded="true"] .result-read__metric-content {
  padding: 10px 0 38px;
  animation: rr-metric-fade-up 350ms var(--rr-ease-out) forwards;
}

@keyframes rr-metric-fade-up {
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}

.result-read__metric-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-read__metric-eyebrow {
  margin: 0;
  color: var(--rr-gold-text);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.1em;
  line-height: 1.2;
  text-transform: uppercase;
}

.result-read__metric-block p {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  color: var(--rr-ink);
  max-width: 60ch;
}

.result-read__metric-lesson {
  margin-top: 10px;
}

.result-read__lesson-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--rr-line);
}

.result-read__lesson-card img {
  width: 90px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.result-read__lesson-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-read__lesson-info strong {
  font-size: 14px;
  font-weight: 500;
  color: var(--rr-ink);
}

.result-read__lesson-info span {
  font-size: 12px;
  color: var(--rr-muted);
}

.result-read__lesson-info a {
  font-size: 12px;
  color: var(--rr-gold-text);
  text-decoration: none;
  font-weight: 500;
}
.result-read__lesson-info a:hover {
  text-decoration: underline;
}

/* EVIDENCE VIEWER */

.result-read__evidence-viewer-sticky {
  position: sticky;
  top: 110px;
  height: max-content;
}

.result-read__evidence-stage {
  position: relative;
  width: 100%;
  background: var(--rr-surface);
  border: 1px solid var(--rr-line);
  overflow: hidden;
}

.result-read__evidence-photo-base {
  display: block;
  width: 100%;
  height: auto;
  max-height: 65vh;
  object-fit: contain;
}

.result-read__evidence-overlay-container {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 300ms ease;
  pointer-events: none;
}

.result-read__evidence-overlay-container[data-active="true"] {
  opacity: 1;
}

.result-read__evidence-focus-map {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transition: opacity 300ms ease;
}
.result-read__evidence-focus-map[data-active="true"] {
  opacity: 1;
}


.result-read__evidence-viewer-controls {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

/* TECHNICAL REGIONS */
.result-read__evidence-technical-region {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--rr-line);
}

.result-read__evidence-technical-region h4 {
  margin: 0 0 16px;
  color: var(--rr-muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.result-read__histogram-chart-mini {
  height: 120px;
  width: 100%;
  border-bottom: 1px solid var(--rr-line);
}

.result-read__histogram-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 9px;
  color: var(--rr-muted);
  letter-spacing: 0.1em;
}

.result-read__measured-palette-mini {
  display: flex;
  gap: 8px;
}

.result-read__palette-swatch-mini {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.result-read__palette-swatch-mini span {
  display: block;
  height: 36px;
  border: 1px solid color-mix(in srgb, var(--rr-ink) 10%, transparent);
}
.result-read__palette-swatch-mini small {
  font-size: 10px;
  color: var(--rr-muted);
}

/* CAPTURE DETAILS */
.result-read__capture-details-widget {
  margin-top: 24px;
}

.result-read__capture-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-top: 1px solid var(--rr-line);
  border-bottom: 1px solid var(--rr-line);
  font-size: 14px;
  color: var(--rr-ink);
  cursor: pointer;
  list-style: none;
}
.result-read__capture-summary::-webkit-details-marker {
  display: none;
}
.result-read__capture-plus {
  color: var(--rr-muted);
  font-size: 18px;
  transition: transform 200ms ease;
}
.result-read__capture-details-widget[open] .result-read__capture-plus {
  transform: rotate(45deg);
}

.result-read__capture-content {
  padding: 32px 0;
  border-bottom: 1px solid var(--rr-line);
}
.result-read__capture-content h4 {
  margin: 0 0 24px;
  font-size: 11px;
  color: var(--rr-gold-text);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.result-read__capture-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px 32px;
  margin: 0;
}
.result-read__capture-list dt {
  font-size: 11px;
  color: var(--rr-muted);
  text-transform: uppercase;
  margin-bottom: 4px;
}
.result-read__capture-list dd {
  margin: 0;
  font-size: 15px;
  color: var(--rr-ink);
}

@media (max-width: 960px) {
  .result-read__evidence-split-layout {
    grid-template-columns: 1fr;
    gap: 60px;
  }
  .result-read__evidence-viewer-sticky {
    position: static;
    order: -1;
  }
  .result-read__metric-button {
    grid-template-columns: minmax(0, 1fr) auto 32px;
  }
  .result-read__metric-assessment {
    display: none;
  }
}

""")
