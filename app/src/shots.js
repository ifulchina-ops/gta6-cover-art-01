// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo
// loaded; ?shot=cover shows a finished cover alone, full frame.
// Query knobs: photo (sample name, or comma list), caption, subtitle, layout, grade.
// window.__shotReady is set once the scene has painted, so a screenshot can wait on it.
// The default cover is the classic GTA grid: four DIFFERENT Leonida vignettes,
// one per panel — neon boulevard, speedboat, muscle car, lifeguard tower.
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const defaultPhotos = shot === 'cover'
    ? 'neon,speedboat,muscle,lifeguard'
    : 'muscle';
  const names = (query.get('photos') ?? query.get('photo') ?? defaultPhotos)
    .split(',').map((s) => s.trim()).filter(Boolean);
  const caption = query.get('caption') ?? 'LEONIDA NIGHTS';
  const subtitle = query.get('subtitle') ?? 'welcome back to Vice City';
  const layout = query.get('layout') ?? 'grid4';
  const grade = query.get('grade') ?? 'sunset';
  const badge = query.get('badge') ?? 'VICE CITY';

  // Load every named sample photo first, then lay out the panels over them.
  for (const name of names) {
    const file = name.endsWith('.jpg') ? name : `${name}.jpg`;
    try {
      const img = await api.loadImage(`samples/${file}`);
      await api.addPhoto(img, file.replace('.jpg', ''));
    } catch {
      // A missing sample must not break the scene; the cover still renders.
    }
  }
  api.setState({ layout, grade, badge });
  api.setCaption(caption, subtitle);
  api.redraw();
  // Wait for the vendored fonts, then repaint once so lettering is final.
  try { await document.fonts.ready; } catch { /* fonts are optional */ }
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
