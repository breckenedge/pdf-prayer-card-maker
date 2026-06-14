// Node test runner for index.html.
//
// It loads the app's own functions directly out of the HTML — NO browser stubs — by
// running the logic <script> with `module`/`exports` provided and `document` absent
// (the UI block is guarded by `typeof document !== 'undefined'`). pdf-lib is injected
// into composePdf, so the real PDF composition runs and we assert on real output bytes.
//
//   npm test
//
import zlib from 'node:zlib';
import * as pdfLib from 'pdf-lib';
import { loadCore } from './core.mjs';

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log('  PASS  ' + name);
  else { console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); failures++; }
}

// --- helpers that exercise real pdf-lib ---
async function makeInput(w, h, pages = 2) {
  const d = await pdfLib.PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const p = d.addPage([w, h]);
    // pdf-lib refuses to embed a page with no content stream, so draw a border.
    p.drawRectangle({ x: 2, y: 2, width: w - 4, height: h - 4, borderWidth: 1 });
  }
  return d.save();
}

// Count "x y m  x y l" line operators per page — i.e. drawn crop-mark segments.
async function segCounts(bytes) {
  const doc = await pdfLib.PDFDocument.load(bytes);
  const ctx = doc.context;
  return doc.getPages().map(page => {
    const ref = page.node.Contents();
    const arr = ref.asArray ? ref.asArray() : [ref];
    const buf = Buffer.concat(arr.map(r => {
      const o = ctx.lookup(r);
      let c = o.contents;
      try { c = zlib.inflateSync(Buffer.from(o.contents)); } catch {}
      return Buffer.from(c);
    }));
    return [...buf.toString('latin1').matchAll(/[\d.]+ [\d.]+ m\s+[\d.]+ [\d.]+ l/g)].length;
  });
}

const core = loadCore();

// 1) Pure self-tests — the exact runTests() the in-browser button runs.
console.log('runTests() (pure geometry/layout):');
const t = core.runTests();
t.filter(x => !x.pass).forEach(x => console.log('  FAIL  ' + x.name + '  — ' + x.detail));
check(`self-tests ${t.filter(x => x.pass).length}/${t.length}`, t.every(x => x.pass));

// 2) Real composition through real pdf-lib.
console.log('composePdf() (real pdf-lib output):');
const input = await makeInput(180, 306);             // 2.5 × 4.25 aspect, matches the card
const { bytes, layout, warnings } = await core.composePdf(pdfLib, {
  inputBytes: input, cardWin: 2.5, cardHin: 4.25, printMarginIn: 0.25, gutterIn: 0.125
});
const out = await pdfLib.PDFDocument.load(bytes);
check('output has 2 pages', out.getPageCount() === 2, 'got ' + out.getPageCount());
const p0 = out.getPages()[0];
check('page is Letter portrait (612×792)',
  Math.round(p0.getWidth()) === 612 && Math.round(p0.getHeight()) === 792,
  p0.getWidth() + '×' + p0.getHeight());
check('layout is 3×2=6', `${layout.cols}×${layout.rows}=${layout.count}` === '3×2=6',
  `${layout.cols}×${layout.rows}=${layout.count}`);
check('no aspect warnings for matching card', warnings.length === 0, warnings.join(' | '));

const counts = await segCounts(bytes);
check('FRONT has no crop marks', counts[0] === 0, 'got ' + counts[0]);
check('BACK has no crop marks', counts[1] === 0, 'got ' + counts[1]);

// 3) Error handling.
console.log('error handling:');
let threw = false;
try {
  const one = await makeInput(180, 306, 1);
  await core.composePdf(pdfLib, { inputBytes: one, cardWin: 2.5, cardHin: 4.25, printMarginIn: 0.25, gutterIn: 0.125 });
} catch { threw = true; }
check('rejects a <2-page input', threw);

threw = false;
try {
  await core.composePdf(pdfLib, { inputBytes: input, cardWin: 20, cardHin: 30, printMarginIn: 0.25, gutterIn: 0 });
} catch { threw = true; }
check('rejects an oversize card', threw);

// 4) Aspect mismatch surfaces a warning (front + back).
console.log('aspect mismatch:');
const square = await makeInput(300, 300);
const r2 = await core.composePdf(pdfLib, {
  inputBytes: square, cardWin: 2.5, cardHin: 4.25, printMarginIn: 0.25, gutterIn: 0.125
});
check('square source warns on both pages', r2.warnings.length === 2, 'warnings=' + r2.warnings.length);

console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nALL GREEN\n');
process.exit(failures ? 1 : 0);
