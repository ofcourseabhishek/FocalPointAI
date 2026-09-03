with open('frontend/src/result-read.css', 'a', encoding='utf-8') as f:
    f.write("""
.result-read__metric-content-wrapper { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 350ms var(--rr-ease-out); }
.result-read__metric-row[data-expanded="true"] .result-read__metric-content-wrapper { grid-template-rows: 1fr; }
.result-read__metric-content { overflow: hidden; display: flex; flex-direction: column; gap: 28px; }
.result-read__metric-row[data-expanded="true"] .result-read__metric-content { padding: 28px 0 38px; animation: rr-metric-fade-up 350ms var(--rr-ease-out) forwards; }
@keyframes rr-metric-fade-up { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
""")
