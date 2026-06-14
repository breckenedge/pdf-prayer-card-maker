# Prayer Card Tiler

A tiny, single-file web app that turns a **2‑page prayer‑card PDF** (page 1 = the front
image, page 2 = the back prayer) into a **print‑ready, n‑up duplex sheet** on US Letter —
so you can print your own prayer cards at home, double‑sided, and cut them apart.

**Live app:** https://www.breckenridge.dev/pdf-prayer-card-maker/

It runs entirely in your browser. Your PDF is **never uploaded** anywhere — all the work
happens client‑side with [pdf-lib](https://pdf-lib.js.org/).

## The inspiration

Devotional prayer cards (a saint or holy image on the front, a prayer on the back) are
usually bought a few at a time. But plenty of them are freely available as PDFs, and a
standard card is small — about **2.5″ × 4.25″** — so a single sheet of Letter paper can
hold several at once.

The annoying part is the layout: to print a stack of cards at home you need the fronts
tiled in a grid on one sheet and the backs tiled on the next sheet, **mirrored** so that
front and back line up after you flip the paper for double‑sided (duplex) printing. Doing
that by hand in a layout program is fiddly and easy to get wrong.

This tool automates exactly that: drop in a 2‑page card PDF, and it figures out the best
grid, places the cards at their true size, mirrors the backs for a long‑edge flip, and
gives you a clean two‑page PDF to print and cut. It works for any 2‑page card PDF, but it
was built with prayer cards in mind.

## What it does

- **Drag‑and‑drop** (or pick) a 2‑page PDF — front on page 1, back on page 2.
- Auto‑calculates the **best grid**, trying both portrait and landscape Letter and
  choosing whichever fits more cards (ties prefer portrait).
- Places each card at its **exact size**, scaling the source to fit without stretching
  (content is centered; you’re warned if the source aspect ratio doesn’t match the card).
- Accounts for your printer’s **non‑printable margin** and an optional **gutter** between
  cards for cutting room.
- **Mirrors the back page** horizontally so cards register when you flip on the long edge.
- **Live preview** that updates as you change the file or any setting.
- A one‑click **download** of the final print‑ready PDF.

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| Card width / height | 2.5″ × 4.25″ | A common prayer‑card size; change to match yours. |
| Printer margin | 0.25″ | Most home printers can’t print within ~¼″ of the edge. Set 0 for borderless. |
| Gutter | 0.125″ | Blank space between cards to leave cutting room. Set 0 to butt them edge‑to‑edge. |

## Printing

1. Generate and download the PDF.
2. Print **double‑sided**, flipping on the **long edge** (the common duplex default).
3. Cut the cards apart.

If your fronts and backs don’t line up, your printer is probably flipping on the *short*
edge — switch the duplex setting to long‑edge.

## Development & tests

The app itself needs no build step — `index.html` is fully self‑contained and loads
pdf-lib from a CDN. The `test/` folder is Node‑only tooling:

```bash
npm install          # installs pdf-lib + mupdf as dev dependencies
npm test             # runs the geometry self-tests + real pdf-lib composition checks
npm run render       # renders sample output to test-out/*.png for a visual check
#   node test/render.mjs "path/to/your-card.pdf"   # render a real card
```

The test harness loads the app’s own functions straight out of `index.html` with **no
browser stubs** (the logic is dependency‑injected and DOM wiring is guarded), so the tests
exercise the real composition code.

## Privacy

100% client‑side. No servers, no uploads, no analytics. Open the page, work offline if you
like, close the tab — nothing leaves your machine.

## License

MIT
