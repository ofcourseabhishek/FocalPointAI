const fs = require('fs');
let css = fs.readFileSync('src/upload-workspace.css', 'utf8');

// Fix border-color animation with pseudo-element
css = css.replace(/\.upload-workspace__surface--loading \{\s*animation: pulse-border 2\.5s ease-in-out infinite;\s*\}/, 
  '.upload-workspace__surface--loading::after { content: ""; position: absolute; inset: -1px; border: 1px solid color-mix(in srgb, var(--uw-gold) 60%, var(--uw-line)); border-radius: inherit; pointer-events: none; animation: pulse-border-opacity 2.5s ease-in-out infinite; }');

css = css.replace(/@keyframes pulse-border \{\s*0%, 100% \{ border-color: var\(--uw-line\); \}\s*50% \{ border-color: color-mix\(in srgb, var\(--uw-gold\) 60%, var\(--uw-line\)\); \}\s*\}/, 
  '@keyframes pulse-border-opacity { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }');

// Add position: relative to surface if not present
if (!css.includes('position: relative;') || css.indexOf('position: relative;') > css.indexOf('.upload-workspace__surface {') + 100) {
    css = css.replace(/\.upload-workspace__surface \{/, '.upload-workspace__surface { position: relative;');
}

// Tokenize hardcoded hex
css = css.replace(/body:has\(\.upload-workspace\) \{([^}]+)background: #e8e1d7;([^}]+)color: #2a211b;([^}]+)\}/g, 'body:has(.upload-workspace) {$1background: var(--uw-canvas, #e8e1d7);$2color: var(--uw-ink, #2a211b);$3}');

fs.writeFileSync('src/upload-workspace.css', css);
