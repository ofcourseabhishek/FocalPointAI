with open('frontend/src/result-read.css', 'a', encoding='utf-8') as f:
    f.write("""
/* Hero layout fixes */
.result-read__chapter-hero {
  /* Override the baseline alignment */
  align-items: start !important;
  /* Nullify any min-height */
  min-height: 0 !important;
  /* The parent .result-read__view-content adds 48px top padding on desktop. 
     To hit a 64px target, we only need 16px here. */
  padding-top: 16px !important;
  padding-bottom: 48px !important;
}

@media (max-width: 760px) {
  .result-read__chapter-hero {
    /* Parent view-content adds ~60px padding on mobile */
    padding-top: 0 !important;
  }
}

/* Gap between hero and Evidence layout */
.result-read__evidence-split-layout {
  margin-top: 42px !important;
}
""")
