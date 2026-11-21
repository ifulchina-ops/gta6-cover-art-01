// Leonida Nights — the editor. Owns the state (layout, grade, copy, panels), draws the live preview onto the
// canvas, and wires the rail: photos, layout, grade, copy, per-panel crop, and the three PNG exports.
import { drawCover, compose, DEFAULT_COPY, EXPORT_SIZES, GRADE_LABELS, LAYOUT_LABELS, LAYOUTS, GRADES, PANEL_COUNT } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

/** The four sample vignettes, in panel order when auto-deal runs. */
export const SAMPLES = [
  { id: 'neon', file: 'samples/neon.jpg', label: 'Neon boulevard' },
  { id: 'speedboat', file: 'samples/speedboat.jpg', label: 'Speedboat' },
  { id: 'muscle', file: 'samples/muscle.jpg', label: 'Muscle car' },
  { id: 'lifeguard', file: 'samples/lifeguard.jpg', label: 'Lifeguard tower' },
];

/** Everything the cover depends on. `photos` holds loaded images by index; `panels` indexes into it. */
const state = {
  layout: 'grid',
  grade: 'vice',
  size: 'square',
  seed: 7,
  copy: { ...DEFAULT_COPY },
  photos: [],
  panels: [],
  selected: 0,
  /** Set once the user drags a panel or picks a photo for one: auto-deal stops from then on. */
  panelsTouched: false,
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** The export size record for the current choice. */
function sizeOf() {
  return EXPORT_SIZES.find((s) => s.id === state.size) ?? EXPORT_SIZES[0];
}

/** Fits the canvas to the preview board while keeping its export pixel size (so the PNG is the exact size). */
function fitCanvas() {
  const { w, h } = sizeOf();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const board = $('board');
  const box = board.getBoundingClientRect();
  const availW = Math.max(120, box.width - 36);
  const availH = Math.max(120, box.height - 36);
  const scale = Math.min(availW / w, availH / h);
  canvas.style.width = `${Math.round(w * scale)}px`;
  canvas.style.height = `${Math.round(h * scale)}px`;
}

/** Paints the canvas from the state: the preview and the export both come through here. */
function paint() {
  const { w, h } = sizeOf();
  drawCover(ctx, w, h, state, state.photos);
  $('stage-meta').textContent = `${GRADE_LABELS[state.grade]} · ${LAYOUT_LABELS[state.layout]} · ${w} × ${h}`;
}

function redraw() {
  fitCanvas();
  paint();
}

/** One panel per layout slot, keeping whatever the user already set where the slot still exists. */
function syncPanels() {
  const want = PANEL_COUNT[state.layout] ?? 4;
  const next = [];
  for (let i = 0; i < want; i++) {
    next.push(state.panels[i] ?? { photo: -1, zoom: 1, fx: 0, fy: 0 });
  }
  state.panels = next;
  if (state.selected >= want) state.selected = want - 1;
  if (!state.panelsTouched) dealPhotos();
}

/** Round-robin deal: panel i takes photo i, until the user places a photo by hand. */
export function dealPhotos() {
  if (state.panelsTouched) return;
  const n = state.photos.length;
  if (n === 0) return;
  state.panels.forEach((panel, i) => {
    panel.photo = i % n;
  });
}

/** Marks the panels as hand-placed and updates the hint that says so. */
function touchPanels() {
  state.panelsTouched = true;
  $('deal-state').textContent = 'Photos are placed by hand; add or pick a photo to change one.';
}

/** A small SVG keyline for each layout button. */
const LAYOUT_ICONS = {
  grid: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect x="0.5" y="0.5" width="13" height="9" rx="1.4"/><rect x="16.5" y="0.5" width="13" height="9" rx="1.4"/><rect x="0.5" y="10.5" width="13" height="9" rx="1.4"/><rect x="16.5" y="10.5" width="13" height="9" rx="1.4"/></svg>',
  strip: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect x="0.5" y="1" width="29" height="5" rx="1.2"/><rect x="0.5" y="7.5" width="29" height="5" rx="1.2"/><rect x="0.5" y="14" width="29" height="5" rx="1.2"/></svg>',
  hero: '<svg viewBox="0 0 30 20" aria-hidden="true"><rect x="0.5" y="0.5" width="29" height="12" rx="1.4"/><rect x="0.5" y="14" width="14" height="5.5" rx="1.2"/><rect x="15.5" y="14" width="14" height="5.5" rx="1.2"/></svg>',
};

const GRADE_STRIPS = {
  vice: 'linear-gradient(180deg,#240c38,#6e2260,#d95a76,#ffa459,#ffd08a)',
  neon: 'linear-gradient(180deg,#04061c,#0b1450,#1d2c86,#4a2a9c,#7b48b8)',
  sunset: 'linear-gradient(180deg,#3b0f3d,#8c2352,#d8455f,#ff8f5c,#ffc98a)',
};

function buildRail() {
  const layouts = $('layouts');
  layouts.innerHTML = '';
  for (const id of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg';
    b.dataset.layout = id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.layout === id));
    b.innerHTML = `${LAYOUT_ICONS[id]}<span>${LAYOUT_LABELS[id]}</span>`;
    b.addEventListener('click', () => {
      state.layout = id;
      if (!state.panelsTouched) dealPhotos();
      syncPanels();
      buildRail();
      redraw();
    });
    layouts.append(b);
  }

  const grades = $('grades');
  grades.innerHTML = '';
  for (const id of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.grade = id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.grade === id));
    b.innerHTML = `<i style="background:${GRADE_STRIPS[id]}"></i><span>${GRADE_LABELS[id]}</span>`;
    b.addEventListener('click', () => {
      state.grade = id;
      buildRail();
      redraw();
    });
    grades.append(b);
  }

  const sizes = $('sizes');
  sizes.innerHTML = '';
  for (const s of EXPORT_SIZES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'size';
    b.dataset.size = s.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.size === s.id));
    b.textContent = s.label;
    b.addEventListener('click', () => {
      state.size = s.id;
      buildRail();
      redraw();
    });
    sizes.append(b);
  }
}

function buildSlots() {
  const slots = $('slots');
  slots.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const used = state.panels.some((p) => p.photo === i);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `slot${used ? ' is-used' : ''}`;
    b.title = `Put ${photo.label} in the selected panel`;
    b.dataset.photo = String(i);
    b.innerHTML = `<img src="${photo.src}" alt=""><b>${i + 1}</b>`;
    b.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      touchPanels();
      syncPanelControls();
      buildSlots();
      redraw();
    });
    slots.append(b);
  });
}

/** Refills the crop controls from the selected panel. */
function syncPanelControls() {
  const panel = state.panels[state.selected] ?? { zoom: 1, fx: 0, fy: 0 };
  $('panel-name').textContent = `Panel ${state.selected + 1}`;
  $('crop-x').value = String(Math.round((panel.fx ?? 0) * 100));
  $('crop-y').value = String(Math.round((panel.fy ?? 0) * 100));
  $('zoom').value = String(Math.round((panel.zoom ?? 1) * 100));
}

/** Loads a File into the photo list and puts it in the selected panel. */
async function addFile(file, panelIndex) {
  if (!file || !file.type.startsWith('image/')) return;
  const src = URL.createObjectURL(file);
  const img = await loadImage(src);
  state.photos.push({ img, src, label: file.name });
  const i = state.photos.length - 1;
  if (!state.panelsTouched) dealPhotos();
  else state.panels[panelIndex ?? state.selected].photo = i;
  buildSlots();
  syncPanelControls();
  redraw();
  $('status').textContent = `Added ${file.name}`;
}

/** Pointer drag on the canvas moves the selected panel's crop; a wheel zooms it. */
function wireBoard() {
  let dragging = false;
  let start = null;
  canvas.addEventListener('pointerdown', (e) => {
    const frame = compose(canvas.width, canvas.height, state.layout);
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const hit = frame.panels.findIndex((p) => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
    if (hit < 0) return;
    state.selected = hit;
    syncPanelControls();
    const panel = state.panels[hit];
    dragging = true;
    start = { x: e.clientX, y: e.clientY, fx: panel.fx ?? 0, fy: panel.fy ?? 0 };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const panel = state.panels[state.selected];
    const spanX = (rect.width / canvas.width) * compose(canvas.width, canvas.height, state.layout).panels[state.selected].w;
    const spanY = (rect.height / canvas.height) * compose(canvas.width, canvas.height, state.layout).panels[state.selected].h;
    const zoom = Math.max(1, panel.zoom ?? 1);
    panel.fx = Math.max(-1, Math.min(1, start.fx + (e.clientX - start.x) / Math.max(1, spanX * (zoom - 1) * 0.5)));
    panel.fy = Math.max(-1, Math.min(1, start.fy + (e.clientY - start.y) / Math.max(1, spanY * (zoom - 1) * 0.5)));
    touchPanels();
    paint();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = 'grab';
    syncPanelControls();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.style.cursor = 'grab';
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const panel = state.panels[state.selected];
      panel.zoom = Math.max(1, Math.min(2.6, (panel.zoom ?? 1) * (e.deltaY < 0 ? 1.06 : 0.94)));
      touchPanels();
      syncPanelControls();
      paint();
    },
    { passive: false },
  );
}

function wireControls() {
  $('files').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) await addFile(file);
    e.target.value = '';
  });

  const drop = $('drop');
  for (const type of ['dragenter', 'dragover']) {
    drop.addEventListener(type, (e) => {
      e.preventDefault();
      drop.classList.add('is-over');
    });
  }
  for (const type of ['dragleave', 'drop']) {
    drop.addEventListener(type, () => drop.classList.remove('is-over'));
  }
  drop.addEventListener('drop', async (e) => {
    e.preventDefault();
    for (const file of Array.from(e.dataTransfer?.files ?? [])) await addFile(file);
  });

  for (const key of ['title', 'subtitle', 'kicker', 'caption']) {
    const input = $(key);
    input.value = state.copy[key];
    input.addEventListener('input', () => {
      state.copy[key] = input.value;
      paint();
    });
  }

  $('crop-x').addEventListener('input', (e) => {
    state.panels[state.selected].fx = Number(e.target.value) / 100;
    touchPanels();
    paint();
  });
  $('crop-y').addEventListener('input', (e) => {
    state.panels[state.selected].fy = Number(e.target.value) / 100;
    touchPanels();
    paint();
  });
  $('zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value) / 100;
    touchPanels();
    paint();
  });

  $('deal').addEventListener('click', () => {
    state.panelsTouched = false;
    $('deal-state').textContent = 'Auto-deal is on: photos fill the panels in turn.';
    dealPhotos();
    buildSlots();
    syncPanelControls();
    redraw();
  });

  $('reset-panel').addEventListener('click', () => {
    state.panels[state.selected] = { photo: state.panels[state.selected]?.photo ?? -1, zoom: 1, fx: 0, fy: 0 };
    syncPanelControls();
    paint();
  });

  $('export').addEventListener('click', () => {
    const s = sizeOf();
    fitCanvas();
    paint();
    canvas.toBlob((blob) => {
      if (!blob) {
        $('status').textContent = 'Export failed';
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = s.file;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      $('status').textContent = `Saved ${s.file} · ${(blob.size / 1024).toFixed(0)} KB`;
    }, 'image/png');
  });

  window.addEventListener('resize', redraw);
}

/** Loads the sample vignettes, in order, then deals them round-robin and builds the rail. */
async function loadSamples() {
  for (const sample of SAMPLES) {
    try {
      const img = await loadImage(sample.file);
      state.photos.push({ img, src: sample.file, label: sample.label });
    } catch {
      /* a missing sample leaves its slot empty; main.ts refuses to build without all four */
    }
  }
}

async function boot() {
  await loadSamples();
  syncPanels();
  buildRail();
  buildSlots();
  syncPanelControls();
  wireControls();
  wireBoard();
  redraw();

  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, {
      state,
      canvas,
      paint: redraw,
      loadImage,
      deal: dealPhotos,
      buildSlots,
      buildRail,
      syncPanelControls,
    });
  }
}

boot();
