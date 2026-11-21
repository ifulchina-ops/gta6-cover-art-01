// Fixed scenes for screenshots. `?shot=cover` shows the cover alone, full-bleed;
// `?shot=editor` shows the editor with a sample loaded. The query picks the rest:
// `photo` names a sample (neon, speedboat, muscle, lifeguard), `caption` and
// `subtitle` the words, `layout` one of grid, strips or hero, `grade` one of
// gold, neon or sunset, `size` one of square, portrait or wide.
// window.__shotReady is set once the cover has been painted with its fonts.

/**
 * Sets up a screenshot scene: applies the query to the editor state, waits for
 * the webfonts (Anton + Pacifico) so the lettering paints correctly, redraws,
 * then flags readiness. `apply` is the editor's setup callback.
 */
export async function runShot(shot, query, apply) {
  const scene = {
    photo: query.get('photo') ?? 'neon',
    caption: query.get('caption') ?? 'Leonida Nights',
    subtitle: query.get('subtitle') ?? 'welcome back to Vice City',
    layout: query.get('layout') ?? 'grid',
    grade: query.get('grade') ?? 'gold',
    size: query.get('size') ?? 'square',
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await apply(scene);
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.ready,
    ]);
  } catch {
    // Fonts already local; a load failure still leaves the fallback faces.
  }
  await apply(scene);
  await new Promise((done) => {
    requestAnimationFrame(() => requestAnimationFrame(done));
  });
  window.__shotReady = true;
}
