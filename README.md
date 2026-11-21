# Leonida Nights

A GTA-style cover art maker that runs entirely in the browser: drop four photos in, pick a layout and a
colour grade, edit the copy, and export a poster-sized PNG. No build step, no network request, nothing
uploaded — every script, font and sample photo is a file under `app/`.

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ifulchina-ops/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ifulchina-ops/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

## What it does

- **Four sample vignettes** — a neon boulevard, a speedboat at sunset, an orange muscle car on Ocean Drive and
  a pink/yellow lifeguard tower — 1024 × 683 each, dealt into the panels round-robin until you place one by hand.
- **Three layouts** — a 2 × 2 grid, three film-strip bands with sprocket holes, and a hero panel over two smaller
  ones. Panel counts follow the layout, and your crops carry across them.
- **Three grades** — Vice Gold (the default), Neon Night and Sunset. Each one sets the sky, the grade wash over
  the photographs and the lettering inks.
- **A seeded skyline.** The city behind the panels is drawn from mulberry32 with a seed per grade, never
  `Math.random()`, so the same cover renders the same pixels on every run.
- **Drag-to-crop.** Drag a panel to move its crop, scroll to zoom, or use the sliders; each panel keeps its own
  crop and zoom.
- **Copy that is yours.** Title, subtitle, kicker and caption, in Anton and Pacifico with dark outlines so the
  lettering holds over any photograph.
- **Three exports** — 1080 × 1080, 1080 × 1350 and 1920 × 1080 PNG.

## Run it

```sh
node serve.ts              # serves app/ at http://localhost:8080
```

Or open `app/index.html` through any static file server; there is no build step and no dependency.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output directory, refuses a missing or mis-sized sample, a
`screenshots/` folder that is not 3 or 4 shots, or any shot over 256 KiB, and writes `dossier.json` with the
vendored `buildDossier`.

## Layout of the repository

```
main.ts              the entrypoint: guards, copies app/ and screenshots/, writes dossier.json
serve.ts             a tiny static server for app/, for trying it locally
app/index.html       the studio: a rail of controls beside the live preview
app/style.css        the studio's styling, and the cover-only shot frame
app/src/cover.js     the renderer: compose(), the seeded sky, the panels, the lettering
app/src/main.js      the editor: state, photo loading, auto-deal, drag-to-crop, PNG export
app/src/shots.js     fixed scenes for the screenshots (?shot=cover, ?shot=editor)
app/samples/         the four sample vignettes
app/fonts/           Anton and Pacifico (SIL Open Font License)
screenshots/         1-cover, 2-editor, 3-cover
```

## License

MIT. The bundled fonts are under the SIL Open Font License; their licences are in `app/fonts/`.
