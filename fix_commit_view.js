const fs = require('fs');
const file = 'frontend/src/components/ResultRead.jsx';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split(/\r?\n/);
const fixedLines = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const commitView = ({ nextView, push, scroll }) => {') && lines[i+8] && lines[i+8].includes('window.scrollTo({ top: Math.max(0, target), behavior: \'auto\' });')) {
    skip = true;
    i += 9; // Skip the first broken commitView
    continue;
  }
  if (skip && lines[i] === '') {
    continue; // Skip the blank line after it
  }
  skip = false;
  fixedLines.push(lines[i]);
}
fs.writeFileSync(file, fixedLines.join('\n'));
console.log('Fixed via line iteration');
