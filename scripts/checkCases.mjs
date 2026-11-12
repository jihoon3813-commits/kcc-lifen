import fs from 'node:fs';
const code = fs.readFileSync('public/app.js', 'utf8');
const custIdx = code.indexOf("case'customer':");
console.log('Customer block:', code.slice(custIdx, custIdx + 300));
const noteIdx = code.indexOf("case'note':");
console.log('Note block:', code.slice(noteIdx, noteIdx + 300));
