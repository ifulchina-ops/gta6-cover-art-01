// Leonida Nights — wires the editor page: pick samples or upload photos, deal
// them into panels, crop by dragging, write the caption, choose a layout, grade
// and size, and export the cover as a PNG. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).
import { drawCover, renderCover, dealPanels, layoutRects, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const SAMPLE_NAMES = ['neon', 'speedboat', 'muscle', 'lifeguard'];
const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const layoutSelect = document.getElementById('layout');
const gradeSelect = document.getElementById('grade');
const sizeSelect = document.getElementById('size');
const zoomInput = document.getElementById('zoom');
const status = document.getElementById('status');
const panelHint = document.getElementById('panel-hint');

const state = {
  caption: 'Leonida Nights',
  subtitle: 'welcome back to Vice City',
  layout: 'grid',
  grade: 'gold',
  size: 'square',
  uploads: [],
  samples: new Map(),
  manual: [null, null, null, null],
  panelsTouched: false,
  crops: [0, 1, 2, 3].map(() => ({ zoom: 1, dx: 0, dy: 0 })),
  selected: 0,
};

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads every sample photo once, in name order. */
async function ensureSamples() {
  for (const name of SAMPLE_NAMES) {
    if (!state.samples.has(name)) {
      state.samples.set(name, await loadImage(`samples/${name}.jpg`));
    }
  }
}

/** Photos available to deal: uploads first, then the samples in their set order. */
function availablePhotos() {
  return [...state.uploads, ...state.samples.values()].filter(Boolean);
}

/** How many panels the current layout shows. */
function panelCount() {
  return state.layout === 'hero' ? 1 : state.layout === 'strips' ? 3 : 4;
}

/** The panels to paint right now, dealt round-robin unless placed by hand. */
function currentPanels() {
  return dealPanels(availablePhotos(), panelCount(), state.panelsTouched, state.manual);
}

function redraw() {
  const size = SIZES[state.size] ?? SIZES.square;
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, {
    panels: currentPanels(),
    caption: state.caption,
    subtitle: state.subtitle,
    layout: state.layout,
    grade: state.grade,
    crops: state.crops,
  });
  panelHint.textContent = `Panel ${state.selected + 1} of ${panelCount()} selected — drag it to crop, or pick its photo below.`;
}

/** Assigns a photo to the selected panel by hand; auto-deal stops from here. */
function placeInSelected(img) {
  state.manual[state.selected] = img;
  state.panelsTouched = true;
  redraw();
}

/** Which panel rect (if any) holds a point in canvas pixels. */
function panelAt(x, y) {
  const plan = layoutRects(state.layout, canvas.width, canvas.height);
  return plan.panels.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

/** Converts a pointer event on the canvas to canvas pixels. */
function toCanvasPixels(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

let dragging = null;
canvas.addEventListener('pointerdown', (event) => {
  const at = toCanvasPixels(event);
  const hit = panelAt(at.x, at.y);
  if (hit === -1) return;
  state.selected = hit;
  zoomInput.value = String(state.crops[hit].zoom);
  dragging = { startX: at.x, startY: at.y, moved: false };
  canvas.setPointerCapture(event.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const at = toCanvasPixels(event);
  const dx = at.x - dragging.startX;
  const dy = at.y - dragging.startY;
  if (Math.abs(dx) + Math.abs(dy) > 2) dragging.moved = true;
  if (!dragging.moved) return;
  const crop = state.crops[state.selected];
  crop.dx += dx;
  crop.dy += dy;
  dragging.startX = at.x;
  dragging.startY = at.y;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  dragging = null;
});

document.getElementById('photo').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const img = await loadImage(URL.createObjectURL(file));
  state.uploads.unshift(img);
  status.textContent = 'Photo added — it leads the deal.';
  redraw();
});

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    const name = button.dataset.sample;
    await ensureSamples();
    placeInSelected(state.samples.get(name));
    status.textContent = `${name} placed in panel ${state.selected + 1}.`;
  });
});

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});
layoutSelect.addEventListener('change', () => {
  state.layout = layoutSelect.value;
  state.selected = 0;
  redraw();
});
gradeSelect.addEventListener('change', () => {
  state.grade = gradeSelect.value;
  redraw();
});
sizeSelect.addEventListener('change', () => {
  state.size = sizeSelect.value;
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.crops[state.selected].zoom = Number(zoomInput.value);
  redraw();
});
document.getElementById('reset-crop').addEventListener('click', () => {
  state.crops[state.selected] = { zoom: 1, dx: 0, dy: 0 };
  zoomInput.value = '1';
  redraw();
});
document.getElementById('auto-deal').addEventListener('click', () => {
  state.manual = [null, null, null, null];
  state.panelsTouched = false;
  status.textContent = 'Auto-deal on — panels fill round-robin again.';
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.size] ?? SIZES.square;
  const out = renderCover(
    {
      panels: currentPanels(),
      caption: state.caption,
      subtitle: state.subtitle,
      layout: state.layout,
      grade: state.grade,
      crops: state.crops,
    },
    size.w,
    size.h,
  );
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leonida-nights-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved leonida-nights-${size.w}x${size.h}.png`;
  }, 'image/png');
});

/** Applies a screenshot scene: the named sample leads the deal. */
async function applyScene(scene) {
  await ensureSamples();
  state.caption = scene.caption;
  state.subtitle = scene.subtitle;
  state.layout = scene.layout;
  state.grade = scene.grade;
  state.size = scene.size;
  captionInput.value = scene.caption;
  subtitleInput.value = scene.subtitle;
  layoutSelect.value = scene.layout;
  gradeSelect.value = scene.grade;
  sizeSelect.value = scene.size;
  const order = [scene.photo, ...SAMPLE_NAMES.filter((n) => n !== scene.photo)];
  state.uploads = [];
  state.samples = new Map(order.map((n) => [n, state.samples.get(n)]));
  state.manual = [null, null, null, null];
  state.panelsTouched = false;
  redraw();
}

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, applyScene);
} else {
  ensureSamples().then(redraw);
}
redraw();
