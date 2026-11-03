// Checks the tutorial data without a browser: run `node tools/check.mjs` before committing.
// It loads every chapter, rebuilds each step's full state, and reports anything a view
// would choke on or a reader would see broken: unknown programs, tags, memory regions,
// address links, tabs, and diagrams, plus non-English text in the page files.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPTERS } from '../js/data/chapters/index.js';
import { PROGRAMS } from '../js/data/programs/index.js';
import { MEMORY_MAP } from '../js/data/memoryMap.js';
import { buildStates } from '../js/core/state.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TABS = new Set(['memory', 'code', 'terminal']);
const VISUALS = new Set(['board', 'disk', 'gdt', 'none', ...extraVisuals()]);
const MONITORS = new Set(['off', 'nosignal', 'text', 'graphics']);
const MAX_MILESTONE_LABEL = 12;   // fits next to its marker on a phone

// Keys every chapter's step 0 must set, so a chapter opens without the ones before it
const START_KEYS = ['signals', 'cpu', 'led', 'regs', 'monitor', 'screen', 'memory', 'code',
  'tab', 'visual', 'csip'];

const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);

// Diagrams added after day 3 register themselves in VisualView; read their names from it
function extraVisuals() {
  const source = readFileSync(new URL('../js/views/VisualView.js', import.meta.url), 'utf8');
  const match = /VISUALS\s*=\s*Object\.freeze\(\[([^\]]*)\]/.exec(source);
  return match ? [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
}

function parseAddress(text) {
  const segmented = /^([0-9A-F]{4}):([0-9A-F]{4})$/i.exec(text);
  if (segmented) return parseInt(segmented[1], 16) * 16 + parseInt(segmented[2], 16);
  return /^0x[0-9A-F]+$/i.test(text) ? parseInt(text, 16) : NaN;
}

function checkText(where, text) {
  if (typeof text !== 'string') return;
  for (const match of text.matchAll(/\{([^}]+)\}/g)) {
    if (Number.isNaN(parseAddress(match[1]))) fail(where, `bad address link {${match[1]}}`);
  }
}

function regionsFor(state) {
  const extra = (state.memory && state.memory.layout) || [];
  return [...MEMORY_MAP, ...extra];
}

function checkCode(where, code) {
  if (!code) return;
  if (code.program === null || code.program === undefined) return;
  const program = PROGRAMS[code.program];
  if (!program) return fail(where, `unknown program '${code.program}'`);
  if (!program.illustrative) return;
  const tags = new Set(program.lines.map((line) => line.tag).filter(Boolean));
  const focus = Array.isArray(code.focus) ? code.focus : [];
  for (const tag of focus) {
    if (typeof tag === 'string' && !tags.has(tag)) fail(where, `${code.program} has no tag '${tag}'`);
  }
  if (code.current && !tags.has(code.current)) {
    fail(where, `${code.program} has no tag '${code.current}' (current)`);
  }
}

function checkMemory(where, state) {
  const memory = state.memory || {};
  const regions = regionsFor(state);
  const focus = memory.focus;
  if (focus && !regions.some((region) => region.id === focus.id)) {
    fail(where, `memory focus names unknown region '${focus.id}'`);
  }
  const ids = new Set();
  for (const region of regions) {
    if (ids.has(region.id)) fail(where, `memory region '${region.id}' is defined twice`);
    ids.add(region.id);
    if (region.start > region.end) fail(where, `memory region '${region.id}' ends before it starts`);
  }
  for (const [name, write] of Object.entries(state.writes || {})) {
    if (!write) continue;
    if (write.start > write.end) fail(where, `write '${name}' ends before it starts`);
    for (const [address, bytes] of write.data || []) {
      if (address < write.start || address + bytes.length - 1 > write.end) {
        fail(where, `write '${name}' has data outside its range at 0x${address.toString(16)}`);
      }
    }
  }
}

for (const chapter of CHAPTERS) {
  if (!chapter.steps) continue;
  const ids = new Set();
  const states = buildStates(chapter.steps);
  const first = states[0];
  for (const key of START_KEYS) {
    if (!(key in first)) fail(`${chapter.id} step 0`, `missing '${key}' in the starting state`);
  }
  chapter.steps.forEach((step, index) => {
    const where = `${chapter.id} ${step.id || `#${index}`}`;
    const state = states[index];
    if (!step.id) fail(where, 'step has no id');
    if (ids.has(step.id)) fail(where, 'duplicate step id');
    ids.add(step.id);
    for (const field of ['title', 'summary', 'detail', 'time']) {
      if (!step[field]) fail(where, `missing ${field}`);
    }
    if (chapter.phases && !chapter.phases[step.phase]) fail(where, `unknown phase '${step.phase}'`);
    for (const field of ['summary', 'detail', 'formula']) checkText(`${where} ${field}`, step[field]);
    if (step.milestone && step.milestone.label.length > MAX_MILESTONE_LABEL) {
      fail(where, `milestone label '${step.milestone.label}' is too long for phones`);
    }
    if (step.source && !PROGRAMS[step.source]) fail(where, `unknown source program '${step.source}'`);
    if (!TABS.has(state.tab)) fail(where, `unknown tab '${state.tab}'`);
    if (!VISUALS.has(state.visual)) fail(where, `unknown diagram '${state.visual}'`);
    if (!MONITORS.has(state.monitor)) fail(where, `unknown monitor mode '${state.monitor}'`);
    checkCode(where, state.code);
    checkMemory(where, state);
  });
}

// Page text and code comments must be English: no Chinese or Japanese characters, apart
// from the book's own title and author in the credits
const ALLOWED = ['30日でできる! OS自作入門', '30天自制操作系统', '川合秀実'];
const CJK_RANGES = [[0x3040, 0x30FF], [0x3400, 0x9FFF], [0xF900, 0xFAFF], [0xFF00, 0xFFEF]];
const hasCJK = (text) => [...text].some((ch) => {
  const code = ch.codePointAt(0);
  return CJK_RANGES.some(([low, high]) => code >= low && code <= high);
});
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name.startsWith('.') || name === 'node_modules') return [];
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
for (const path of walk(ROOT)) {
  if (!/\.(js|mjs|css|html)$/.test(path)) continue;
  readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
    let rest = line;
    for (const allowed of ALLOWED) rest = rest.split(allowed).join('');
    if (hasCJK(rest)) fail(`${relative(ROOT, path)}:${i + 1}`, 'non-English text');
  });
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}
const ready = CHAPTERS.filter((chapter) => chapter.steps);
const steps = ready.reduce((sum, chapter) => sum + chapter.steps.length, 0);
console.log(`OK: ${ready.length} chapters, ${steps} steps.`);
