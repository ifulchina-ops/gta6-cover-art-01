// Neon Coast Cover Studio — wires the editor: photo uploads, layout + grade picks,
// caption editing, per-panel drag/zoom, undo/redo and PNG export in three post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCoverArt, renderCover, layoutPanels, LAYOUT_PANELS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const badgeInput = document.getElementById('badgeInput');
const zoomInput = document.getElementById('zoomInput');
const panelHint = document.getElementById('panelHint');
const photoList = document.getElementById('photoList');

/** Photos loaded in this session: { id, name, img, url }. Samples count as photos too. */
const photos = [];
let photoSeq = 0;
let selectedPhoto = 0;
let selectedPanel = 0;

/** The cover state (everything undo/redo snapshots). Panels hold a photo slot index. */
let state = freshState('grid4');

function freshState(layout) {
  const count = LAYOUT_PANELS[layout] ?? 4;
  return {
    layout, grade: 'sunset',
    title: 'NEON COAST', subtitle: 'sunset stories', badge: 'EST. 2026',
    halftone: true, grain: true,
    panels: Array.from({ length: count }, (_, i) => ({ photo: null, zoom: 1.15, ox: 0, oy: 0 })),
  };
}

function snapshot() { return JSON.parse(JSON.stringify(state)); }

const undoStack = [];
const redoStack = [];
function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncUndoButtons();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  state = undoStack.pop();
  syncControlsFromState();
  redraw();
  setStatus('Undid the last change.');
  syncUndoButtons();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  state = redoStack.pop();
  syncControlsFromState();
  redraw();
  setStatus('Redid the change.');
  syncUndoButtons();
}
function syncUndoButtons() {
  document.getElementById('undoBtn').disabled = !undoStack.length;
  document.getElementById('redoBtn').disabled = !redoStack.length;
}

/** Photo slots as draw order expects: photos[i] is the image for slot i (or null). */
function photoImages() { return photos.map((p) => p.img); }

/** Keep panels the right length for the layout, assigning photos round-robin. */
function ensurePanels() {
  const count = LAYOUT_PANELS[state.layout] ?? 4;
  while (state.panels.length < count) state.panels.push({ photo: null, zoom: 1.15, ox: 0, oy: 0 });
  state.panels.length = count;
  state.panels.forEach((panel, i) => {
    if (panel.photo == null && photos.length) panel.photo = i % photos.length;
    if (panel.photo != null && panel.photo >= photos.length) panel.photo = photos.length ? panel.photo % photos.length : null;
  });
}

function redraw() {
  ensurePanels();
  drawCoverArt(canvas, state, photoImages());
  const panel = state.panels[selectedPanel];
  if (panel) {
    zoomInput.value = String(panel.zoom);
    panelHint.textContent = `Panel ${selectedPanel + 1} selected — drag on the cover to move its photo, scroll to zoom.`;
  }
}

function setStatus(msg) { statusEl.textContent = msg; }

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(img, name) {
  if (photos.length >= 6) { setStatus('That is the limit — 6 photos at most (4 uploads + 2 samples).'); return -1; }
  const entry = { id: ++photoSeq, name, img, url: img.src };
  photos.push(entry);
  selectedPhoto = photos.length - 1;
  // Fill empty panels with the new photo first, then re-deal round-robin.
  // If every panel still shows the same single photo (the fresh default),
  // re-deal the panels round-robin so a newly added photo actually appears.
  ensurePanels();
  const shown = new Set(state.panels.map((p) => p.photo));
  if (shown.size <= 1) state.panels.forEach((panel, i) => { panel.photo = photos.length ? i % photos.length : null; });
  renderPhotoList();
  return photos.length - 1;
}

function renderPhotoList() {
  photoList.innerHTML = '';
  photos.forEach((p, i) => {
    const li = document.createElement('li');
    if (i === selectedPhoto) li.classList.add('selected');
    const thumb = document.createElement('img');
    thumb.src = p.url; thumb.alt = p.name;
    const label = document.createElement('span');
    label.textContent = p.name.length > 16 ? `${p.name.slice(0, 15)}…` : p.name;
    const rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'remove'; rm.textContent = '×';
    rm.setAttribute('aria-label', `Remove ${p.name}`);
    rm.addEventListener('click', (e) => {
      e.stopPropagation();
      pushHistory();
      photos.splice(i, 1);
      state.panels.forEach((panel) => {
        if (panel.photo === i) panel.photo = null;
        else if (panel.photo != null && panel.photo > i) panel.photo -= 1;
      });
      selectedPhoto = Math.max(0, Math.min(selectedPhoto, photos.length - 1));
      renderPhotoList();
      redraw();
      setStatus(`Removed ${p.name}.`);
    });
    li.append(thumb, label, rm);
    li.addEventListener('click', () => {
      selectedPhoto = i;
      renderPhotoList();
      const panel = state.panels[selectedPanel];
      if (panel) { pushHistory(); panel.photo = i; redraw(); setStatus(`${p.name} is now in panel ${selectedPanel + 1}.`); }
    });
    photoList.append(li);
  });
}

function setLayout(layout) {
  if (!LAYOUT_PANELS[layout]) return;
  pushHistory();
  const old = state.panels;
  state.layout = layout;
  ensurePanels();
  state.panels.forEach((panel, i) => { if (panel.photo == null && old[i]) panel.photo = old[i].photo; });
  document.querySelectorAll('#layoutChoices button').forEach((b) => b.classList.toggle('active', b.dataset.layout === layout));
  redraw();
  setStatus(`Layout: ${layout}.`);
}

function setGrade(grade) {
  if (!GRADES[grade]) return;
  pushHistory();
  state.grade = grade;
  document.querySelectorAll('#gradeChoices button').forEach((b) => b.classList.toggle('active', b.dataset.grade === grade));
  redraw();
  setStatus(`Grade: ${GRADES[grade].label}.`);
}

// ---- controls ---------------------------------------------------------------
document.getElementById('photoInput').addEventListener('change', async (e) => {
  const files = [...e.target.files].slice(0, 4);
  if (!files.length) return;
  pushHistory();
  for (const file of files) {
    const img = await loadImage(URL.createObjectURL(file));
    await addPhoto(img, file.name);
  }
  redraw();
  setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} added — click a panel, then a photo, to place it.`);
  e.target.value = '';
});

document.getElementById('samples').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-sample]');
  if (btn) {
    pushHistory();
    const img = await loadImage(`samples/${btn.dataset.sample}`);
    await addPhoto(img, btn.dataset.sample.replace('.jpg', ''));
    redraw();
    setStatus(`Sample “${btn.dataset.sample}” loaded.`);
    return;
  }
  if (e.target.id === 'clearPhotos') {
    pushHistory();
    photos.length = 0;
    selectedPhoto = 0;
    state.panels.forEach((p) => { p.photo = null; });
    renderPhotoList();
    redraw();
    setStatus('Photos cleared — add your own or a sample.');
  }
});

document.getElementById('layoutChoices').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-layout]');
  if (btn) setLayout(btn.dataset.layout);
});
document.getElementById('gradeChoices').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-grade]');
  if (btn) setGrade(btn.dataset.grade);
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
badgeInput.addEventListener('input', () => { state.badge = badgeInput.value; redraw(); });
document.getElementById('halftoneToggle').addEventListener('change', (e) => { pushHistory(); state.halftone = e.target.checked; redraw(); });
document.getElementById('grainToggle').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; redraw(); });
zoomInput.addEventListener('input', () => {
  const panel = state.panels[selectedPanel];
  if (panel) { panel.zoom = Number(zoomInput.value); redraw(); }
});
zoomInput.addEventListener('change', () => pushHistory());
document.getElementById('shuffleBtn').addEventListener('click', () => {
  if (!photos.length) { setStatus('Add a photo first, then shuffle.'); return; }
  pushHistory();
  const order = photos.map((_, i) => i).sort(() => Math.random() - 0.5);
  state.panels.forEach((panel, i) => { panel.photo = order[i % order.length]; });
  redraw();
  setStatus('Photos shuffled across the panels.');
});
document.getElementById('swapBtn').addEventListener('click', () => {
  if (!photos.length) { setStatus('Add a photo first.'); return; }
  pushHistory();
  const panel = state.panels[selectedPanel];
  panel.photo = panel.photo == null ? 0 : (panel.photo + 1) % photos.length;
  redraw();
  setStatus(`Panel ${selectedPanel + 1} now shows ${photos[panel.photo].name}.`);
});
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.getElementById('resetBtn').addEventListener('click', () => {
  pushHistory();
  state = freshState(state.layout);
  syncControlsFromState();
  redraw();
  setStatus('Cover reset to a fresh layout.');
});

function syncControlsFromState() {
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  badgeInput.value = state.badge;
  document.getElementById('halftoneToggle').checked = state.halftone;
  document.getElementById('grainToggle').checked = state.grain;
  document.querySelectorAll('#layoutChoices button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeChoices button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
}

// ---- drag + wheel on the preview --------------------------------------------
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
}
function panelAt(point) {
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return i;
  }
  return -1;
}
let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const point = canvasPoint(e);
  const hit = panelAt(point);
  if (hit < 0) return;
  selectedPanel = hit;
  canvas.classList.add('dragging');
  canvas.setPointerCapture(e.pointerId);
  dragging = { x: point.x, y: point.y, moved: false };
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const point = canvasPoint(e);
  const rects = layoutPanels(state.layout, canvas.width, canvas.height);
  const rect = rects[selectedPanel];
  const panel = state.panels[selectedPanel];
  if (rect && panel) {
    panel.ox += (point.x - dragging.x) / rect.w;
    panel.oy += (point.y - dragging.y) / rect.h;
    panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox));
    panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy));
    if (Math.abs(point.x - dragging.x) + Math.abs(point.y - dragging.y) > 2) dragging.moved = true;
    dragging.x = point.x; dragging.y = point.y;
    redraw();
  }
});
canvas.addEventListener('pointerup', () => {
  if (dragging?.moved) pushHistory();
  dragging = null;
  canvas.classList.remove('dragging');
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

// ---- export ------------------------------------------------------------------
const EXPORT_SIZES = [
  { name: 'square', w: 1080, h: 1080 },
  { name: 'portrait', w: 1080, h: 1350 },
  { name: 'wide', w: 1920, h: 1080 },
];

/** Renders the cover at a size and downloads it as a PNG. Returns the blob. */
export function exportCover(width, height, filename) {
  return new Promise((resolve) => {
    const out = renderCover(state, photoImages(), width, height);
    out.toBlob((blob) => {
      if (!blob) { setStatus('Export failed — try again.'); resolve(null); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob);
    }, 'image/png');
  });
}

async function exportOne(size) {
  await exportCover(size.w, size.h, `neon-coast-${size.name}-${size.w}x${size.h}.png`);
  setStatus(`Saved neon-coast-${size.name}-${size.w}x${size.h}.png`);
}
document.getElementById('exportSquare').addEventListener('click', () => exportOne(EXPORT_SIZES[0]));
document.getElementById('exportPortrait').addEventListener('click', () => exportOne(EXPORT_SIZES[1]));
document.getElementById('exportWide').addEventListener('click', () => exportOne(EXPORT_SIZES[2]));
document.getElementById('exportAll').addEventListener('click', async () => {
  for (const size of EXPORT_SIZES) {
    // eslint-disable-next-line no-await-in-loop
    await exportOne(size);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 350));
  }
  setStatus('All three sizes exported — check your downloads.');
});

// ---- shot scenes + first paint ----------------------------------------------
const shotApi = {
  addPhoto,
  loadImage,
  setState(patch) {
    pushHistory();
    Object.assign(state, patch);
    if (patch.layout) ensurePanels();
    syncControlsFromState();
  },
  setCaption(title, subtitle) {
    state.title = title;
    if (subtitle !== undefined) state.subtitle = subtitle;
    syncControlsFromState();
  },
  redraw,
  setStatus,
};
// Exposed for the finalist review / automated checks: export without a click.
window.__coverApp = { exportCover, getState: () => snapshot(), getPhotos: () => photos.length, redraw };

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, shotApi);
} else {
  redraw();
}
if (document.fonts?.ready) {
  document.fonts.load('400 100px Anton').catch(() => {});
  document.fonts.load('400 60px Pacifico').catch(() => {});
  document.fonts.ready.then(() => redraw());
}
syncUndoButtons();
