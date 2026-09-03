import re

with open('frontend/src/result-read.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace metric toggle default color
css = css.replace('.result-read__metric-toggle {\n  font-size: 18px;\n  font-weight: 400;\n  color: var(--rr-secondary);', '.result-read__metric-toggle {\n  font-size: 18px;\n  font-weight: 400;\n  color: #5B4636;')

# Replace metric toggle hover/focus/expanded colors
css = css.replace('.result-read__metric-button:hover .result-read__metric-toggle,\n.result-read__metric-button:focus-visible .result-read__metric-toggle {\n  color: var(--rr-gold);\n}\n\n.result-read__metric-row[data-expanded="true"] .result-read__metric-toggle {\n  color: var(--rr-gold);\n}', '.result-read__metric-button:hover .result-read__metric-toggle,\n.result-read__metric-button:focus-visible .result-read__metric-toggle {\n  color: #B88A3B;\n}\n\n.result-read__metric-row[data-expanded="true"] .result-read__metric-toggle {\n  color: #B88A3B;\n}')

# Replace capture plus default color
css = css.replace('.result-read__capture-plus {\n  color: var(--rr-secondary);', '.result-read__capture-plus {\n  color: #5B4636;')

# Replace capture summary hover/focus/expanded colors
css = css.replace('.result-read__capture-summary:hover .result-read__capture-plus,\n.result-read__capture-summary:focus-visible .result-read__capture-plus {\n  color: var(--rr-gold);\n}\n\n.result-read__capture-details-widget[open] .result-read__capture-plus {\n  color: var(--rr-gold);\n}', '.result-read__capture-summary:hover .result-read__capture-plus,\n.result-read__capture-summary:focus-visible .result-read__capture-plus {\n  color: #B88A3B;\n}\n\n.result-read__capture-details-widget[open] .result-read__capture-plus {\n  color: #B88A3B;\n}')

with open('frontend/src/result-read.css', 'w', encoding='utf-8') as f:
    f.write(css)
