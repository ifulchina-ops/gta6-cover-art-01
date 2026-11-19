# Neon Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ifulchina-ops/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ifulchina-ops/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Neon Coast Cover Studio turns your photo(s) and a caption into GTA VI-style multi-panel cover art — a Vice City sunset/neon grade, bold outlined title lettering with a glowing script subtitle, halftone title block, grain and vignette — and exports it as a PNG in 1080×1080, 1080×1350, or 1920×1080. It runs fully offline in the browser: your photos never leave your machine.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

## How it works

1. Add 1–4 of your own photos (or try the two built-in samples) and click a photo, then a panel, to place it.
2. Pick a layout — 4-panel grid, hero-and-three, full-bleed, 9-panel grid, or tilted snapshot collage — and a grade: Vice Sunset, Neon Night, Palm Dusk, Noir, or Teal Heat.
3. Drag any panel to reposition its photo, scroll or use the zoom slider to crop, and edit the title, subtitle, and badge.
4. Export one size or all three as PNGs. Undo/redo covers every change.

The cover engine (`app/src/cover.js`) draws everything on canvas: sunset skies with a low sun and palm skyline, gradient-map grades per panel, Anton title lettering (SIL OFL, vendored) with a Pacifico neon subtitle, halftone dots, film grain, and a vignette. `?shot=cover` renders a finished cover full-frame and `?shot=editor` shows the editor with a sample loaded, for screenshots.

## Layouts & grades

- **Layouts:** 4-panel grid · hero-and-three · full-bleed · 9-panel grid · tilted snapshot collage. Every panel has its own photo, zoom, and pan (drag the photo, scroll to zoom).
- **Grades:** Vice Sunset · Neon Night · Palm Dusk · Noir · Teal Heat — each a gradient-map wash plus a coloured bottom tint over the photos, with its own title accent colour.

<sub>Entered on [make.fun](https://make.fun/?ref=noble-beacon-95&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
