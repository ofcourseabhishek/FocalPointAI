const fs = require('fs');
const file = 'frontend/src/components/ResultRead.jsx';
let content = fs.readFileSync(file, 'utf8');

const correctCode = `  const scrollViewIntoPlace = (view) => window.requestAnimationFrame(() => {
    const panel = viewPanelRefs.current[view];
    if (!panel) return;
    const target = window.scrollY + panel.getBoundingClientRect().top - resultScrollOffset();
    window.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
  });

  const commitView = ({ nextView, push, scroll }) => {
    if (nextView === activeViewRef.current) return;
    activeViewRef.current = nextView;
    flushSync(() => {
      setVisitedViews((current) => current.has(nextView) ? current : new Set([...current, nextView]));
      setActiveView(nextView);
    });
    if (push) {
      const suffix = nextView === 'overview' ? '' : \`/\${nextView}\`;
      window.history.pushState({}, '', \`/analysis/\${encodeURIComponent(analysisId)}\${suffix}\${window.location.search}\`);
    }
    if (scroll) scrollViewIntoPlace(nextView);
  };`;

const regex = /  const scrollViewIntoPlace = [\s\S]*?  const runPageCurtain =/m;
content = content.replace(regex, correctCode + '\n\n  const runPageCurtain =');
fs.writeFileSync(file, content);
console.log('Fixed the whole block');
