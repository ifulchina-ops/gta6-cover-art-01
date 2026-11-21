# Leonida Nights — a GTA 6 cover maker for make.fun

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/ifulchina-ops/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/ifulchina-ops/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An entry for the make.fun bounty [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01): a web app that turns a person's photo and a caption into cover art in the style of GTA 6's posters, exported as a PNG to share.

## The app

Leonida Nights deals photos into a multi-panel Vice City poster. Four sample scenes ship with it — a neon boulevard, a speedboat at sunset, a muscle car on Ocean Drive, and a lifeguard tower — and any photo of your own can join the deal or take a panel by hand.

- **Three layouts**: a 2×2 grid of panels, three film-strip bands with sprocket holes, or one big hero photo.
- **Three grades**: Vice Gold (amber golden-hour wash), Neon Night (pink and teal), and Sunset.
- **Panels that deal themselves**: photos fill the panels round-robin until you place one by hand — click a panel, pick its photo, and the auto-deal steps aside.
- **Crop by dragging**: drag a panel to position its photo, zoom it with the slider.
- **A seeded skyline**: the Vice City towers behind the title come from a seeded generator, so the same grade always paints the same skyline — every render is deterministic.
- **Bold lettering**: the caption in Anton capitals with a dark outline and an accent rule beneath it, the subtitle in Pacifico script with its own dark outline.
- **Three export sizes**: 1080 × 1080, 1080 × 1350, and 1920 × 1080 PNG.

The app is plain static files under `app/` — no build step, no network request, photos never uploaded. It runs offline in desktop Chrome.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Hand the entry in with:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Files

- `main.ts` — the entrypoint (copies `app/` and `screenshots/` to the output and writes `dossier.json`)
- `serve.ts` — a tiny static server for trying the app locally
- `app/index.html` — the editor page
- `app/style.css` — the editor's Vice City styling
- `app/src/cover.js` — the cover painter (layouts, grades, seeded skyline, title block)
- `app/src/main.js` — the editor wiring (photos, panels, crop, export)
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover` / `?shot=editor`)
- `app/samples/` — the four sample scenes, made with an image model
- `app/fonts/` — Anton and Pacifico, under the SIL Open Font License
- `screenshots/` — three screenshots of the app and its covers
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged

## License

MIT — see [LICENSE](LICENSE).

---

Built for [make.fun](https://make.fun) — [gta6-cover-art-01: Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01).
