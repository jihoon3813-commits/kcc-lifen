import fs from 'node:fs';
const code = fs.readFileSync('public/app.js', 'utf8');
const lines = code.split('\n');
console.log('Total lines:', lines.length);
lines.slice(215, 245).forEach((l, i) => console.log(i + 216, l));
