import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Import anime
if "import anime" not in code:
    code = code.replace("import React, { useState, useEffect, useRef } from 'react';", 
                        "import React, { useState, useEffect, useRef } from 'react';\nimport anime from 'animejs';")

# 2. Add refs and useEffects inside App()
hooks_insertion = """
  // Anime.js Animation Hooks
  const scoreRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    anime({
      targets: '.upload-card',
      scale: uploadState === 'dragging' ? 1.02 : 1,
      boxShadow: uploadState === 'dragging' ? '0 0 30px rgba(99, 102, 241, 0.4)' : '0 0 0 rgba(0,0,0,0)',
      duration: 300,
      easing: 'easeOutExpo'
    });
  }, [uploadState]);

  useEffect(() => {
    if (isLoading) {
      anime({
        targets: '.analysis-step',
        opacity: [0, 1],
        translateX: [-20, 0],
        delay: anime.stagger(100),
        easing: 'spring(1, 80, 10, 0)'
      });
    }
  }, [isLoading]);

  useEffect(() => {
    if (analysisResult && scoreRef.current) {
      const overallScore = Math.max(0, Math.min(100, Math.round((Number(analysisResult.overall_rating) || 0) * 10)));
      scoreRef.current.innerHTML = '0';
      anime({
        targets: scoreRef.current,
        innerHTML: [0, overallScore],
        round: 1,
        easing: 'easeOutExpo',
        duration: 2000
      });
    }
  }, [analysisResult]);

  useEffect(() => {
    if (contentRef.current) {
      anime({
        targets: contentRef.current,
        opacity: [0, 1],
        translateY: [15, 0],
        easing: 'spring(1, 80, 10, 0)',
        duration: 800
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (isDownloadingPdf) {
      anime({
        targets: '.download-button',
        scale: [1, 0.95],
        opacity: [1, 0.7],
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine',
        duration: 600
      });
    } else {
      anime.remove('.download-button');
      anime({
        targets: '.download-button',
        scale: 1,
        opacity: 1,
        easing: 'spring(1, 80, 10, 0)'
      });
    }
  }, [isDownloadingPdf]);
"""

if "const scoreRef = useRef(null);" not in code:
    code = code.replace("const imgRef = useRef(null);", hooks_insertion + "\n  const imgRef = useRef(null);")


# 3. Patch the Score element
score_old = "<div><strong>{overallScore}</strong><small>/100</small></div>"
score_new = '<div><strong ref={scoreRef}>{overallScore}</strong><small>/100</small></div>'
code = code.replace(score_old, score_new)

# 4. Patch the Content Ref
content_old = '<div className="workspace-content" ref={reviewRef}>'
content_new = '<div className="workspace-content" ref={(el) => { reviewRef.current = el; contentRef.current = el; }}>'
code = code.replace(content_old, content_new)


with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("App.jsx patched!")
