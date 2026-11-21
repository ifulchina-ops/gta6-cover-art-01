// Fixed scenes for screenshots, driven by the page's query: ?shot=cover draws a cover alone, ?shot=editor the
// whole studio with a photo loaded. Every value comes from the query, so the same URL always paints the same
// frame; window.__shotReady is set on the second animation frame, once the fonts and the cover are down.

const SAMPLE_IDS = ['neon', 'speedboat', 'muscle', 'lifeguard'];

/** `?photos=neon,speedboat,muscle,lifeguard` picks which vignettes fill the panels, in order. */
function sampleFiles(query) {
  const asked = (query.get('photos') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const ids = asked.length > 0 ? asked : SAMPLE_IDS;
  return ids.filter((id) => SAMPLE_IDS.includes(id)).slice(0, 4);
}

/** `?title=`, `?subtitle=`, `?kicker=` and `?caption=` set the copy; each falls back to what the page holds. */
function applyCopy(state, query) {
  for (const key of ['title', 'subtitle', 'kicker', 'caption']) {
    const value = query.get(key);
    if (value !== null) state.copy[key] = value;
  }
}

/**
 * Prepares a screenshot scene: `api` is main.js's handle on the editor ({ state, canvas, paint, loadImage,
 * deal, buildSlots, buildRail, syncPanelControls }).
 */
export async function runShot(shot, query, api) {
  const { state } = api;

  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size')) state.size = query.get('size');

  const files = sampleFiles(query);
  state.photos = [];
  for (const id of files) {
    try {
      const src = `samples/${id}.jpg`;
      const img = await api.loadImage(src);
      state.photos.push({ img, src, label: id });
    } catch {
      /* leave the slot empty rather than fail the shot */
    }
  }

  applyCopy(state, query);
  // A shot with no photos given keeps the dealt order; one given follows the query's order exactly.
  if (query.get('photos') !== null || !state.panelsTouched) {
    state.panelsTouched = false;
    api.deal();
  }

  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.buildRail();
  api.buildSlots();
  api.syncPanelControls();
  // Fonts must be ready before the first paint, or the lettering draws in a fallback face.
  try {
    await document.fonts.ready;
  } catch {
    /* an older browser without FontFaceSet still paints */
  }
  api.paint();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
