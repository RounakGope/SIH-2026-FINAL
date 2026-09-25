// Exports disease, crop and taluka names (en/mr/hi) from the app's content into
// server/src/main/resources/names.json, so the server's SMS texts use exactly the
// app's wording. Run after changing src/content: npm run export-names
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'fs';

const entry = `
import { IPM_BY_CROP } from './src/content/ipm.js';
import { CROPS } from './src/content/rules.js';
import { TALUKAS } from './src/content/talukas.js';
const diseases = {};
for (const [crop, set] of Object.entries(IPM_BY_CROP))
  for (const [label, info] of Object.entries(set)) diseases[crop + '|' + label] = { ...info.name, diseased: !!info.diseased };
const crops = Object.fromEntries(Object.entries(CROPS).map(([k, c]) => [k, { en: k, mr: c.mr, hi: c.hi }]));
const talukas = Object.fromEntries(TALUKAS.map(t => [t.name, { en: t.name, mr: t.mr, hi: t.hi, lat: t.lat, lon: t.lon }]));
console.log(JSON.stringify({ diseases, crops, talukas }, null, 1));
`;
const out = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'js' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error' });
const logs = [];
const orig = console.log; console.log = s => logs.push(s);
await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));
console.log = orig;
mkdirSync('server/src/main/resources', { recursive: true });
writeFileSync('server/src/main/resources/names.json', logs.join('\n'));
const n = JSON.parse(logs.join('\n'));
console.log(`names.json: ${Object.keys(n.diseases).length} diseases, ${Object.keys(n.crops).length} crops, ${Object.keys(n.talukas).length} talukas`);
