// Leonida Nights — the cover painter. Draws a GTA-style multi-panel poster on a
// canvas: photos dealt into panels, a seeded Vice City skyline, a colour grade
// wash, and a bold caption with a script subtitle. Every render is deterministic:
// the same state paints the same pixels, because the skyline comes from a seeded
// generator, never Math.random().

/** Seeded PRNG (mulberry32): the same seed always yields the same sequence. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns a short string into a stable 32-bit seed. */
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Colour grades: wash tints, skyline ink, accent bar, caption shadow. */
export const GRADES = {
  gold: {
    label: 'Vice Gold',
    washTop: 'rgba(255, 170, 40, 0.00)',
    washBottom: 'rgba(255, 140, 20, 0.28)',
    sky: '#2a1608',
    accent: '#ffb020',
    scrim: 'rgba(20, 8, 0, 0.55)',
  },
  neon: {
    label: 'Neon Night',
    washTop: 'rgba(255, 46, 136, 0.10)',
    washBottom: 'rgba(0, 229, 204, 0.22)',
    sky: '#12081f',
    accent: '#ff2e88',
    scrim: 'rgba(10, 0, 20, 0.55)',
  },
  sunset: {
    label: 'Sunset',
    washTop: 'rgba(255, 107, 53, 0.05)',
    washBottom: 'rgba(200, 40, 120, 0.30)',
    sky: '#2b1030',
    accent: '#ff6b35',
    scrim: 'rgba(25, 5, 15, 0.55)',
  },
};

/** Export sizes: the common post shapes. */
export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

/**
 * Deals photos into panels, round-robin, until the user places one by hand.
 * `available` is the photos to deal from (uploads first, then samples),
 * `manual` the panels the user placed themselves, `touched` true once the user
 * has placed any panel by hand. Untouched panels always get a photo: with four
 * samples and four panels, every panel shows a different scene.
 */
export function dealPanels(available, count, touched, manual) {
  const slots = [];
  for (let i = 0; i < count; i++) {
    if (touched && manual[i]) {
      slots.push(manual[i]);
    } else if (available.length > 0) {
      slots.push(available[i % available.length]);
    } else {
      slots.push(null);
    }
  }
  return slots;
}

/**
 * Paints one photo into a rectangle, cover-fit, with a per-panel zoom and pan
 * offset (the crop the user sets by dragging). Falls back to a dark panel when
 * there is no photo yet.
 */
export function paintPhoto(ctx, img, x, y, w, h, zoom, dx, dy) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#1a1024';
  ctx.fillRect(x, y, w, h);
  if (img) {
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * base;
    const ph = img.naturalHeight * base;
    ctx.drawImage(img, x + (w - pw) / 2 + dx, y + (h - ph) / 2 + dy, pw, ph);
  }
  ctx.restore();
}

/** Washes the whole cover with the grade's colour tint. */
export function paintWash(ctx, w, h, grade) {
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Paints the Vice City skyline silhouette along the bottom of a band: seeded
 * towers with lit windows, identical for the same grade every time.
 */
export function paintSkyline(ctx, x, y, w, h, grade, seed) {
  const rand = mulberry32(seed);
  ctx.fillStyle = grade.sky;
  let bx = x;
  while (bx < x + w) {
    const bw = w * (0.04 + rand() * 0.07);
    const bh = h * (0.35 + rand() * 0.6);
    ctx.fillRect(bx, y + h - bh, bw, bh);
    if (rand() > 0.6) ctx.fillRect(bx + bw * 0.35, y + h - bh - h * 0.12, bw * 0.3, h * 0.12);
    ctx.fillStyle = grade.accent;
    const cols = Math.max(1, Math.floor(bw / (w * 0.012)));
    const rows = Math.max(1, Math.floor(bh / (h * 0.09)));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rand() > 0.55) {
          ctx.globalAlpha = 0.5 + rand() * 0.5;
          ctx.fillRect(bx + bw * 0.12 + c * bw * 0.22, y + h - bh + h * 0.05 + r * h * 0.09, bw * 0.1, h * 0.04);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = grade.sky;
    bx += bw + w * 0.008;
  }
}

/** Paints film-strip sprocket holes down both edges of a band. */
export function paintSprockets(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  const hole = Math.min(w * 0.02, h * 0.28);
  const gap = hole * 2.1;
  for (let hx = x + hole * 0.6; hx < x + w - hole; hx += gap) {
    ctx.fillRect(hx, y + h * 0.08, hole, h * 0.2);
    ctx.fillRect(hx, y + h * 0.72, hole, h * 0.2);
  }
}

/**
 * Paints the title block: the big caption in Anton capitals with a dark
 * outline, an accent rule beneath it, and the script subtitle in Pacifico with
 * its own dark outline so it stays legible over any photo.
 */
export function paintTitle(ctx, w, y, h, caption, subtitle, grade) {
  const text = caption.trim().toUpperCase();
  const cx = w / 2;
  let size = h * 0.42;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (text) {
    ctx.font = `${size}px Anton, sans-serif`;
    while (ctx.measureText(text).width > w * 0.92 && size > 20) {
      size -= 4;
      ctx.font = `${size}px Anton, sans-serif`;
    }
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = 'rgba(10, 0, 10, 0.9)';
    ctx.strokeText(text, cx, y + h * 0.32);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, cx, y + h * 0.32);
    const ruleW = Math.min(w * 0.6, ctx.measureText(text).width * 0.7);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(cx - ruleW / 2, y + h * 0.58, ruleW, Math.max(3, h * 0.045));
  }
  const sub = subtitle.trim();
  if (sub) {
    const subSize = h * 0.22;
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.lineWidth = Math.max(2, subSize * 0.14);
    ctx.strokeStyle = 'rgba(10, 0, 10, 0.9)';
    ctx.strokeText(sub, cx, y + h * 0.82);
    ctx.fillStyle = '#ffe9c9';
    ctx.fillText(sub, cx, y + h * 0.82);
  }
}

/**
 * Panel rectangles for a layout: grid is a 2x2 of panels above the title band,
 * strips is three full-width film bands above it, hero is one full-bleed photo
 * with the title laid over a scrim at the foot.
 */
export function layoutRects(layout, w, h) {
  const gutter = Math.round(Math.min(w, h) * 0.012);
  const titleH = Math.round(h * 0.24);
  const photoH = h - titleH;
  if (layout === 'strips') {
    const bandH = (photoH - gutter * 4) / 3;
    return {
      panels: [0, 1, 2].map((i) => ({
        x: gutter,
        y: gutter + i * (bandH + gutter),
        w: w - gutter * 2,
        h: bandH,
      })),
      title: { x: 0, y: photoH, w, h: titleH },
      film: true,
    };
  }
  if (layout === 'hero') {
    return {
      panels: [{ x: 0, y: 0, w, h }],
      title: { x: 0, y: h - titleH, w, h: titleH },
      film: false,
      scrim: true,
    };
  }
  const pw = (w - gutter * 3) / 2;
  const ph = (photoH - gutter * 3) / 2;
  return {
    panels: [
      { x: gutter, y: gutter, w: pw, h: ph },
      { x: gutter * 2 + pw, y: gutter, w: pw, h: ph },
      { x: gutter, y: gutter * 2 + ph, w: pw, h: ph },
      { x: gutter * 2 + pw, y: gutter * 2 + ph, w: pw, h: ph },
    ],
    title: { x: 0, y: photoH, w, h: titleH },
    film: false,
  };
}

/**
 * Draws the whole cover onto `canvas` from a state object:
 * { panels, caption, subtitle, layout, grade, crops } where panels holds one
 * image (or null) per panel and crops holds { zoom, dx, dy } per panel.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.gold;
  const plan = layoutRects(state.layout, w, h);
  ctx.fillStyle = '#0d0716';
  ctx.fillRect(0, 0, w, h);
  plan.panels.forEach((rect, i) => {
    const crop = state.crops?.[i] ?? { zoom: 1, dx: 0, dy: 0 };
    paintPhoto(ctx, state.panels[i] ?? null, rect.x, rect.y, rect.w, rect.h, crop.zoom, crop.dx, crop.dy);
    if (plan.film) paintSprockets(ctx, rect.x, rect.y, rect.w, rect.h);
  });
  paintWash(ctx, w, h, grade);
  const title = plan.title;
  if (plan.scrim) {
    ctx.fillStyle = grade.scrim;
    ctx.fillRect(title.x, title.y, title.w, title.h);
  } else {
    paintSkyline(ctx, title.x, title.y, title.w, title.h, grade, hashSeed(state.grade));
  }
  paintTitle(ctx, w, title.y, title.h, state.caption, state.subtitle, grade);
}

/** Renders a cover offscreen at the given size and returns the canvas. */
export function renderCover(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas, state);
  return canvas;
}
