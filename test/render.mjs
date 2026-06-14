// Visual check: compose a tiled PDF and rasterise both pages to PNG so you can eyeball
// card placement and crop marks (what the in-browser stub tests can't show).
//
//   node test/render.mjs "C:/path/to/source.pdf"   # use a real 2-page card PDF
//   node test/render.mjs                            # synthetic bordered test card
//
// Options: --w=2.5 --h=4.25 --margin=0.25 --gutter=0.125
// Output: test-out/front.png, test-out/back.png
//
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as pdfLib from 'pdf-lib';
import { loadCore } from './core.mjs';

const args = process.argv.slice(2);
const srcPath = args.find(a => !a.startsWith('--'));
const opt = (name, def) => {
  const a = args.find(x => x.startsWith('--' + name + '='));
  return a ? parseFloat(a.split('=')[1]) : def;
};
const cardWin = opt('w', 2.5), cardHin = opt('h', 4.25);
const printMarginIn = opt('margin', 0.25), gutterIn = opt('gutter', 0.125);

// A synthetic source whose artwork fills the page edge-to-edge, so any "content vs crop
// mark" misalignment is purely the tiler's doing.
async function syntheticSource() {
  const { PDFDocument, rgb } = pdfLib;
  const d = await PDFDocument.create();
  for (const label of ['FRONT', 'BACK']) {
    const w = cardWin * 72, h = cardHin * 72;
    const p = d.addPage([w, h]);
    p.drawRectangle({ x: 1, y: 1, width: w - 2, height: h - 2, borderWidth: 2, borderColor: rgb(0.1, 0.3, 0.8) });
    p.drawLine({ start: { x: 0, y: h / 2 }, end: { x: w, y: h / 2 }, thickness: 1, color: rgb(0.8, 0.1, 0.1) });
    p.drawText(label, { x: 6, y: h / 2 + 4, size: 10 });
  }
  return d.save();
}

const inputBytes = srcPath ? new Uint8Array(fs.readFileSync(srcPath)) : await syntheticSource();

const core = loadCore();
const { bytes, layout, warnings } = await core.composePdf(pdfLib, {
  inputBytes, cardWin, cardHin, printMarginIn, gutterIn
});
console.log(`layout: ${layout.cols}×${layout.rows}=${layout.count}, ${layout.orient}`);
if (warnings.length) warnings.forEach(w => console.log('warn:', w));

const outDir = fileURLToPath(new URL('../test-out/', import.meta.url));
fs.mkdirSync(outDir, { recursive: true });

let mupdf;
try { mupdf = await import('mupdf'); }
catch { console.log('mupdf not installed (npm i mupdf) — wrote PDF only'); }

if (mupdf) {
  const doc = mupdf.Document.openDocument(Buffer.from(bytes), 'application/pdf');
  const scale = mupdf.Matrix.scale(1.5, 1.5);
  for (const [i, name] of [[0, 'front'], [1, 'back']]) {
    const pix = doc.loadPage(i).toPixmap(scale, mupdf.ColorSpace.DeviceRGB, false, true);
    fs.writeFileSync(outDir + name + '.png', pix.asPNG());
    console.log('wrote test-out/' + name + '.png');
  }
} else {
  fs.writeFileSync(outDir + 'out.pdf', Buffer.from(bytes));
  console.log('wrote test-out/out.pdf');
}
