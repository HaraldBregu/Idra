// Drives the widget's SDK seam against a running Friday, without a browser.
// Usage: node check.js <path-to-sdk-token> [url]
import { readFileSync } from 'node:fs';
import { connected, projects, useRemote } from './src/lib/projects.js';

const [tokenPath, url = 'http://127.0.0.1:8765'] = process.argv.slice(2);

console.log('connected before:', connected());
console.log('ping:', await useRemote({ token: readFileSync(tokenPath, 'utf8').trim(), url }));
console.log('connected after: ', connected());

const states = [];
const list = await projects.list({ onState: (state) => states.push(state) });
console.log('run states:', states);
console.log('projects:', list);
