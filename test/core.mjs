// Loads index.html's functions into Node with NO browser stubs.
//
// The logic <script> ends with `if (typeof module !== 'undefined') module.exports = {…}`
// and guards all DOM wiring behind `typeof document !== 'undefined'`. So running it here
// with a `module` object provided — and no `document` / `PDFLib` globals — populates
// exports cleanly. pdf-lib is injected into composePdf at call time, never read globally.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const HTML = fileURLToPath(new URL('../index.html', import.meta.url));

export function loadCore() {
  const html = fs.readFileSync(HTML, 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const code = scripts[scripts.length - 1][1];   // logic script (the CDN <script> has no body)
  const mod = { exports: {} };
  new Function('module', 'exports', code)(mod, mod.exports);
  return mod.exports;
}
