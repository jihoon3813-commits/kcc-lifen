import fs from 'node:fs';
const code = fs.readFileSync('public/app.js', 'utf8');
const submitIdx = code.indexOf("document.addEventListener('submit'");
console.log(code.slice(submitIdx, submitIdx + 2500));
