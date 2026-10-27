const fs = require('fs');
let code = fs.readFileSync('src/components/ResultRead.jsx', 'utf8');

// 1. Fix getBoundingClientRect in observer
const observerOld = `const updateActiveCategory = () => {
        const positions = Object.entries(blocks.current).filter(([, block]) => block).map(([category, block]) => { const bounds = block.getBoundingClientRect(); return { category, top: bounds.top, bottom: bounds.bottom }; });
        const centered = __testables.readingZoneCategory(positions, window.innerHeight / 2);
        if (centered) setActiveCategory(centered);
      };`;

const observerNew = `const updateActiveCategory = (entries = []) => {
        const intersecting = entries.find((entry) => entry.isIntersecting);
        if (intersecting) {
          const categoryId = Object.entries(blocks.current).find(([, block]) => block === intersecting.target)?.[0];
          if (categoryId) setActiveCategory(categoryId);
        }
      };`;
      
code = code.replace(observerOld, observerNew);

const observerInitOld = `Object.values(blocks.current).forEach((block) => block && observer.observe(block));
      updateActiveCategory();
      return () => observer.disconnect();`;
      
const observerInitNew = `Object.values(blocks.current).forEach((block) => block && observer.observe(block));
      return () => observer.disconnect();`;
      
code = code.replace(observerInitOld, observerInitNew);

// 2. Add lazy prop to FramePhoto
code = code.replace(/function FramePhoto\(\{ previewUrl, file, category, categories, activeCategory \}\) \{/g, `function FramePhoto({ previewUrl, file, category, categories, activeCategory, lazy }) {`);

// 3. Add decoding async and loading lazy to FramePhoto image
code = code.replace(/<img className="result-read__frame-photo" src=\{previewUrl\} alt=\{photoAlt\} \/>/g, `<img className="result-read__frame-photo" src={previewUrl} alt={photoAlt} loading={lazy ? "lazy" : undefined} decoding="async" />`);

// 4. Pass lazy={true} to mobile FramePhotos
code = code.replace(/<FramePhoto previewUrl=\{previewUrl\} file=\{file\} category=\{category\} \/>/g, `<FramePhoto previewUrl={previewUrl} file={file} category={category} lazy={true} />`);

// 5. Focus section images decoding="async"
code = code.replace(/<img className="result-read__focus-photo" data-active=\{activeView === 'photo'\} src=\{previewUrl\} alt=\{activeView === 'photo' \? photoAlt : ''\} \/>/g, `<img className="result-read__focus-photo" data-active={activeView === 'photo'} src={previewUrl} alt={activeView === 'photo' ? photoAlt : ''} decoding="async" />`);

code = code.replace(/<img className="result-read__focus-map" data-active=\{activeView === 'map'\} src=\{focus\.map\} alt=\{activeView === 'map' \? 'Technical focus map for the photograph' : ''\} \/>/g, `<img className="result-read__focus-map" data-active={activeView === 'map'} src={focus.map} alt={activeView === 'map' ? 'Technical focus map for the photograph' : ''} decoding="async" loading="lazy" />`);

code = code.replace(/<img src=\{focus\.map\} alt="Technical focus map for the photograph" \/>/g, `<img src={focus.map} alt="Technical focus map for the photograph" decoding="async" />`);

fs.writeFileSync('src/components/ResultRead.jsx', code);
