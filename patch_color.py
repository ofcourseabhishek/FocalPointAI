css_path = 'frontend/src/result-read.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Update metric toggle default color
css = css.replace('.result-read__metric-toggle {\n  font-size: 18px;\n  font-weight: 400;\n  color: var(--rr-muted);', '.result-read__metric-toggle {\n  font-size: 18px;\n  font-weight: 400;\n  color: var(--rr-secondary);')

# Update metric button hover to include focus
css = css.replace('.result-read__metric-button:hover .result-read__metric-toggle {\n  color: var(--rr-gold);\n}', '.result-read__metric-button:hover .result-read__metric-toggle,\n.result-read__metric-button:focus-visible .result-read__metric-toggle {\n  color: var(--rr-gold);\n}\n\n.result-read__metric-row[data-expanded="true"] .result-read__metric-toggle {\n  color: var(--rr-gold);\n}')

# Update capture plus default color
css = css.replace('.result-read__capture-plus {\n  color: var(--rr-muted);', '.result-read__capture-plus {\n  color: var(--rr-secondary);')

# Update capture summary hover to include focus and expanded
css = css.replace('.result-read__capture-summary:hover .result-read__capture-plus {\n  color: var(--rr-gold);\n}', '.result-read__capture-summary:hover .result-read__capture-plus,\n.result-read__capture-summary:focus-visible .result-read__capture-plus {\n  color: var(--rr-gold);\n}\n\n.result-read__capture-details-widget[open] .result-read__capture-plus {\n  color: var(--rr-gold);\n}')

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(css)
