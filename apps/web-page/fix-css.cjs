const fs = require('fs');
let css = fs.readFileSync('src/result-read.css', 'utf8');

// Fix sticky photo top
css = css.replace(/top: 110px;/g, 'top: 134px;');

// Fix touch targets
css = css.replace(/\.result-read__view-tabs \{([^}]+)height: 44px;([^}]+)\}/g, '.result-read__view-tabs {$1height: 54px;$2}');
css = css.replace(/\.result-read__view-tab \{([^}]+)min-height: 34px;([^}]+)\}/g, '.result-read__view-tab {$1min-height: 44px;$2}');
css = css.replace(/\.result-read__focus-expand \{([^}]+)width: 32px; height: 32px;([^}]+)\}/g, '.result-read__focus-expand {$1width: 44px; height: 44px;$2}');
css = css.replace(/\.result-read__focus-tab \{([^}]+)height: 36px;([^}]+)\}/g, '.result-read__focus-tab {$1height: 44px;$2}');

// Tokenize hardcoded hex
css = css.replace(/body:has\(\.result-read\) \{([^}]+)background: #f3efe7;([^}]+)color: #2a211b;([^}]+)\}/g, 'body:has(.result-read) {$1background: var(--rr-canvas, #f3efe7);$2color: var(--rr-ink, #2a211b);$3}');

fs.writeFileSync('src/result-read.css', css);
