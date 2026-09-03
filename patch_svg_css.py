with open('frontend/src/result-read.css', 'a', encoding='utf-8') as f:
    f.write("""
/* MorphIcon explicit overrides */
.result-read__metric-toggle svg,
.result-read__capture-plus svg {
  width: 18px;
  height: 18px;
  color: inherit !important;
  stroke: currentColor !important;
}

.result-read__metric-toggle svg path,
.result-read__capture-plus svg path {
  stroke: currentColor !important;
  fill: none !important;
}
""")
