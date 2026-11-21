// Leonida Nights — the cover renderer. Everything here is a pure function of the state passed in: the
// skyline is seeded with mulberry32 (one seed per grade), so the same cover draws the same pixels twice.

export const GRADES = ['vice', 'neon', 'sunset'];
export const LAYOUTS = ['grid', 'strip', 'hero'];

export const GRADE_LABELS = { vice: 'Vice Gold', neon: 'Neon Night', sunset: 'Sunset' };
export const LAYOUT_LABELS = { grid: '2 × 2 grid', strip: 'Film strip', hero: 'Hero' };

export const EXPORT_SIZES = [
  { id: 'square', label: '1080 × 1080', w: 1080, h: 1080, file: 'leonida-nights-1080x1080.png' },
  { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350, file: 'leonida-nights-1080x1350.png' },
  { id: 'wide', label: '1920 × 1080', w: 1920, h: 1080, file: 'leonida-nights-1920x1080.png' },
];

export const DEFAULT_COPY = {
  title: 'LEONIDA NIGHTS',
  subtitle: 'Ocean Drive After Dark',
  kicker: 'A LEONIDA STORY',
  caption: 'NEON · SPEEDBOAT · MUSCLE · LIFEGUARD',
};

/** Panels each layout holds, so the editor and the renderer agree on the count. */
export const PANEL_COUNT = { grid: 4, strip: 3, hero: 3 };

/** One palette per grade: the sky, the silhouette, the grade wash over the photos, the lettering inks. */
const PALETTE = {
  vice: {
    sky: ['#1d0830', '#521a58', '#a8326e', '#e2645f', '#ffb066'],
    sun: '#fff2c6',
    sunGlow: 'rgba(255, 168, 92, 0.50)',
    stars: 0,
    far: 'rgba(84, 30, 84, 0.85)',
    near: '#22102f',
    window: '#ffd489',
    washTop: 'rgba(255, 162, 74, 0.30)',
    washBottom: 'rgba(78, 10, 78, 0.50)',
    plate: 'rgba(22, 7, 26, ',
    ink: '#fff7e4',
    inkDeep: '#ffcf7d',
    accent: '#ffc23d',
    rule: '#ff5b9e',
    glow: 'rgba(255, 150, 70, 0.55)',
    dim: 'rgba(255, 240, 214, 0.72)',
    frame: 'rgba(255, 244, 220, 0.26)',
  },
  neon: {
    sky: ['#03051a', '#080f3e', '#181f72', '#3a2589', '#6b3fb0'],
    sun: '#d8fbff',
    sunGlow: 'rgba(90, 232, 255, 0.40)',
    stars: 90,
    far: 'rgba(34, 52, 120, 0.85)',
    near: '#060a22',
    window: '#8ef4ff',
    washTop: 'rgba(52, 214, 255, 0.28)',
    washBottom: 'rgba(104, 18, 148, 0.52)',
    plate: 'rgba(4, 6, 22, ',
    ink: '#f0feff',
    inkDeep: '#9df0ff',
    accent: '#3ef0d2',
    rule: '#ff3ea5',
    glow: 'rgba(90, 240, 255, 0.60)',
    dim: 'rgba(206, 246, 255, 0.72)',
    frame: 'rgba(190, 245, 255, 0.26)',
  },
  sunset: {
    sky: ['#33063a', '#7a1a4e', '#c93a58', '#f97a54', '#ffc98a'],
    sun: '#ffeeb8',
    sunGlow: 'rgba(255, 198, 120, 0.52)',
    stars: 0,
    far: 'rgba(126, 40, 72, 0.85)',
    near: '#2b0d26',
    window: '#ffe4a8',
    washTop: 'rgba(255, 178, 96, 0.30)',
    washBottom: 'rgba(112, 14, 62, 0.46)',
    plate: 'rgba(28, 8, 22, ',
    ink: '#fff5e0',
    inkDeep: '#ffc98a',
    accent: '#ffd166',
    rule: '#ff5b35',
    glow: 'rgba(255, 168, 88, 0.55)',
    dim: 'rgba(255, 238, 210, 0.72)',
    frame: 'rgba(255, 232, 196, 0.26)',
  },
};

export function paletteOf(grade) {
  return PALETTE[grade] ?? PALETTE.vice;
}

// ---------------------------------------------------------------- seeds

/** A string's 32-bit seed: the same grade name always seeds the same skyline. */
export function hashSeed(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32: a small, fast, seedable generator. Never Math.random(), so every render repeats. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- composition

/**
 * The frame's bands and panel rectangles for a canvas of `w` × `h`: a sky band across the top (the seeded
 * skyline stands on its horizon), the panels under it, and the title plate along the foot. The panels run
 * a little way under the plate, so the art bleeds into the lettering instead of stacking above it.
 */
export function compose(w, h, layout) {
  const wide = w / h > 1.3;
  const m = Math.round(w * 0.017);
  const gap = Math.round(Math.max(6, w * 0.011));
  const skyH = Math.round(h * (wide ? 0.135 : 0.118));
  const plateH = Math.round(h * (wide ? 0.33 : 0.315));
  const bleed = Math.round(plateH * 0.26);
  const area = { x: 0, y: skyH, w, h: h - skyH - plateH + bleed };
  const panels = [];

  if (layout === 'strip') {
    const bands = 3;
    const inner = area.h - 2 * m - gap * (bands - 1);
    const bh = inner / bands;
    for (let i = 0; i < bands; i++) {
      const y = area.y + m + i * (bh + gap);
      panels.push({ x: 0, y: Math.round(y), w, h: Math.round(bh), film: true });
    }
  } else if (layout === 'hero') {
    const innerH = area.h - 2 * m - gap;
    const heroH = Math.round(innerH * 0.63);
    panels.push({ x: m, y: area.y + m, w: w - 2 * m, h: heroH });
    const cw = Math.floor((w - 2 * m - gap) / 2);
    const y = area.y + m + heroH + gap;
    const ch = area.y + area.h - m - y;
    panels.push({ x: m, y, w: cw, h: ch });
    panels.push({ x: m + cw + gap, y, w: w - 2 * m - cw - gap, h: ch });
  } else {
    const cw = Math.floor((w - 2 * m - gap) / 2);
    const ch = Math.floor((area.h - 2 * m - gap) / 2);
    for (let i = 0; i < 4; i++) {
      const x = m + (i % 2) * (cw + gap);
      const y = area.y + m + Math.floor(i / 2) * (ch + gap);
      panels.push({ x, y, w: i % 2 === 0 ? cw : w - 2 * m - cw - gap, h: ch });
    }
  }
  return { sky: { x: 0, y: 0, w, h: skyH }, area, plate: { x: 0, y: h - plateH, w, h: plateH }, panels };
}

// ---------------------------------------------------------------- the sky

function paintSky(ctx, band, pal, rand) {
  const g = ctx.createLinearGradient(0, 0, 0, band.h);
  const stops = pal.sky;
  for (let i = 0; i < stops.length; i++) g.addColorStop(i / (stops.length - 1), stops[i]);
  ctx.fillStyle = g;
  ctx.fillRect(band.x, band.y, band.w, band.h);

  // Stars, only where the grade asks for a night: seeded, so they sit in the same places every render.
  if (pal.stars > 0) {
    ctx.save();
    for (let i = 0; i < pal.stars; i++) {
      const x = rand() * band.w;
      const y = rand() * band.h * 0.62;
      const r = 0.4 + rand() * 1.1;
      ctx.globalAlpha = 0.25 + rand() * 0.65;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, r * Math.max(1, band.h / 150), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // The sun (or the moon, under Neon Night) sits low over the horizon, behind the roofline.
  const cx = band.w * (0.62 + rand() * 0.12);
  const cy = band.h * 0.70;
  const r = band.h * 0.34;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 3.4);
  glow.addColorStop(0, pal.sunGlow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, band.w, band.h);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = pal.sun;
  ctx.fill();

  // Synthwave bands cut the disc on the night grade, the way a poster's sun is sliced by scanlines.
  if (pal.stars > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 1; i <= 4; i++) {
      const y = cy + (r * i) / 5;
      ctx.fillRect(cx - r, y, r * 2, Math.max(1.5, r * 0.055));
    }
    ctx.restore();
  }

  // A few long clouds: thin bars of the sun's light, seeded so they never move between renders.
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = pal.sun;
  for (let i = 0; i < 3; i++) {
    const cw = band.w * (0.16 + rand() * 0.26);
    const cyy = band.h * (0.2 + rand() * 0.34);
    ctx.fillRect(band.w * rand() * 0.7, cyy, cw, Math.max(2, band.h * 0.014));
  }
  ctx.restore();
}

/** One row of buildings standing on `baseY`: rectangles, some crowns, lit windows. */
function paintBuildings(ctx, band, pal, rand, opts) {
  const { baseY, color, minH, maxH, minW, maxW, windows, alpha } = opts;
  let x = -band.w * 0.03;
  ctx.save();
  ctx.globalAlpha = alpha;
  while (x < band.w) {
    const bw = band.w * (minW + rand() * (maxW - minW));
    const bh = band.h * (minH + rand() * (maxH - minH));
    const top = baseY - bh;
    ctx.fillStyle = color;
    ctx.fillRect(x, top, bw, bh);
    // A stepped crown on some towers, an aerial on others.
    if (rand() < 0.32) ctx.fillRect(x + bw * 0.2, top - bh * 0.12, bw * 0.6, bh * 0.12);
    if (rand() < 0.2) ctx.fillRect(x + bw * 0.46, top - bh * 0.26, Math.max(1.5, band.w * 0.0016), bh * 0.26);
    if (windows) {
      const cols = Math.max(2, Math.floor(bw / (band.w * 0.013)));
      const rows = Math.max(3, Math.floor(bh / (band.h * 0.055)));
      for (let rr = 0; rr < rows; rr++) {
        for (let c = 0; c < cols; c++) {
          if (rand() > 0.4) continue;
          ctx.globalAlpha = alpha * (0.4 + rand() * 0.5);
          ctx.fillStyle = pal.window;
          const wx = x + bw * 0.16 + (c * bw * 0.68) / cols;
          const wy = top + bh * 0.12 + (rr * bh * 0.78) / rows;
          ctx.fillRect(wx, wy, Math.max(1, bw * 0.055), Math.max(1, band.h * 0.016));
        }
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
    }
    x += bw * (1.04 + rand() * 0.22);
  }
  ctx.restore();
}

/** A landmark tower: the tallest thing on the skyline, its crown lit in the grade's accent. */
function paintLandmark(ctx, band, pal) {
  const h = band.h;
  const w = band.w * 0.052;
  const x = band.w * 0.28;
  const top = band.h * 0.12;
  ctx.save();
  ctx.fillStyle = pal.near;
  ctx.fillRect(x, top, w, h - top);
  // A shoulder on each side, then a spire.
  ctx.fillRect(x - w * 0.5, top + h * 0.16, w * 0.5, h);
  ctx.fillRect(x + w, top + h * 0.22, w * 0.46, h);
  ctx.fillRect(x + w * 0.4, top - h * 0.14, w * 0.2, h * 0.14);
  // The crown: a band of accent light near the top, and a lit crown line.
  ctx.fillStyle = pal.accent;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(x + w * 0.12, top + h * 0.04, w * 0.76, Math.max(2, h * 0.014));
  ctx.globalAlpha = 0.5;
  ctx.fillRect(x + w * 0.4, top - h * 0.14, w * 0.2, Math.max(2, h * 0.012));
  ctx.restore();
}

/** The seeded skyline: a hazy far row, a near row, a landmark, and the horizon's light. */
function paintSkyline(ctx, band, pal, rand) {
  const baseY = band.h;
  paintBuildings(ctx, band, pal, rand, {
    baseY,
    color: pal.far,
    minH: 0.26,
    maxH: 0.6,
    minW: 0.02,
    maxW: 0.05,
    windows: false,
    alpha: 1,
  });
  paintLandmark(ctx, band, pal);
  paintBuildings(ctx, band, pal, rand, {
    baseY,
    color: pal.near,
    minH: 0.18,
    maxH: 0.5,
    minW: 0.024,
    maxW: 0.062,
    windows: true,
    alpha: 1,
  });
  // Haze at the horizon, then a thin line of light where the city meets the panels.
  const haze = ctx.createLinearGradient(0, baseY - band.h * 0.22, 0, baseY);
  haze.addColorStop(0, 'rgba(0, 0, 0, 0)');
  haze.addColorStop(1, pal.sunGlow);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = haze;
  ctx.fillRect(0, baseY - band.h * 0.22, band.w, band.h * 0.22);
  const line = ctx.createLinearGradient(0, 0, band.w, 0);
  line.addColorStop(0, 'rgba(0, 0, 0, 0)');
  line.addColorStop(0.5, pal.accent);
  line.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = line;
  ctx.fillRect(0, baseY - Math.max(1, band.h * 0.008), band.w, Math.max(1, band.h * 0.008));
  ctx.restore();
}

/** The state lockup in the sky band's corner: a plate, a star, and the state's name. */
function paintBadge(ctx, band, pal) {
  const size = Math.round(band.h * 0.115);
  const pad = Math.round(band.w * 0.009);
  const label = 'LEONIDA';
  ctx.save();
  ctx.font = `400 ${size}px Anton, "Arial Narrow", sans-serif`;
  ctx.letterSpacing = `${Math.round(size * 0.3)}px`;
  const tw = ctx.measureText(label).width;
  const bx = band.w * 0.035;
  const by = band.h * 0.17;
  const bh = size * 1.85;
  ctx.fillStyle = 'rgba(8, 4, 14, 0.66)';
  ctx.fillRect(bx, by, tw + pad * 3.4 + size * 0.7, bh);
  ctx.fillStyle = pal.accent;
  ctx.fillRect(bx + pad, by + bh * 0.28, size * 0.2, bh * 0.44);
  ctx.fillStyle = pal.ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + pad * 2.2 + size * 0.36, by + bh * 0.54);
  ctx.restore();
}

// ---------------------------------------------------------------- panels

/** Draws one photo cropped into `rect`: cover fit, times the panel's zoom, moved by its drag offsets. */
function paintPhoto(ctx, rect, photo, panel, pal) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();

  if (!photo || !photo.img || !photo.img.naturalWidth) {
    ctx.fillStyle = 'rgba(10, 5, 16, 1)';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let d = -rect.h; d < rect.w; d += 26) {
      ctx.beginPath();
      ctx.moveTo(rect.x + d, rect.y + rect.h);
      ctx.lineTo(rect.x + d + rect.h, rect.y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const img = photo.img;
  const zoom = Math.max(1, panel.zoom ?? 1);
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const overX = Math.max(0, (dw - rect.w) / 2);
  const overY = Math.max(0, (dh - rect.h) / 2);
  const fx = Math.max(-1, Math.min(1, panel.fx ?? 0));
  const fy = Math.max(-1, Math.min(1, panel.fy ?? 0));
  const dx = rect.x + (rect.w - dw) / 2 + fx * overX;
  const dy = rect.y + (rect.h - dh) / 2 + fy * overY;
  ctx.drawImage(img, dx, dy, dw, dh);

  // The grade: a warm-top / cool-foot wash ties four different photos into one poster.
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, pal.washTop);
  wash.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
  wash.addColorStop(1, pal.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  // A dimming pass at the panel's foot, so the lettering above it stays readable.
  const shade = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
  shade.addColorStop(0, 'rgba(8, 2, 14, 0)');
  shade.addColorStop(1, 'rgba(8, 2, 14, 0.38)');
  ctx.fillStyle = shade;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** One unifying grade over every panel: the pass that makes four different photos read as one poster. */
function paintGradePass(ctx, area, pal) {
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const warm = ctx.createLinearGradient(0, area.y, 0, area.y + area.h);
  warm.addColorStop(0, pal.washTop);
  warm.addColorStop(0.5, pal.rule);
  warm.addColorStop(1, pal.washBottom);
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = warm;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.20;
  const deep = ctx.createLinearGradient(0, area.y, 0, area.y + area.h);
  deep.addColorStop(0, pal.sky[2]);
  deep.addColorStop(1, pal.sky[0]);
  ctx.fillStyle = deep;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.restore();
}

/** A film strip's perforations: two rows of holes punched through the black band the photo sits in. */
function paintSprockets(ctx, rect) {
  const holeH = rect.h * 0.082;
  const holeW = holeH * 1.3;
  const step = holeW * 2.1;
  const rows = [rect.y + rect.h * 0.046, rect.y + rect.h - rect.h * 0.046 - holeH];
  ctx.save();
  ctx.fillStyle = 'rgba(255, 246, 232, 0.24)';
  for (const rowY of rows) {
    for (let x = rect.x + step * 0.55; x < rect.x + rect.w - holeW; x += step) {
      const r = holeH * 0.3;
      const x0 = x;
      const y0 = rowY;
      ctx.beginPath();
      ctx.moveTo(x0 + r, y0);
      ctx.arcTo(x0 + holeW, y0, x0 + holeW, y0 + holeH, r);
      ctx.arcTo(x0 + holeW, y0 + holeH, x0, y0 + holeH, r);
      ctx.arcTo(x0, y0 + holeH, x0, y0, r);
      ctx.arcTo(x0, y0, x0 + holeW, y0, r);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A panel's frame: a hairline of light on the inside edge, so panels read as prints on a poster. */
function paintFrame(ctx, rect, pal) {
  ctx.save();
  ctx.strokeStyle = pal.frame;
  ctx.lineWidth = Math.max(1, rect.w * 0.0022);
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.restore();
}

function paintFilmPanel(ctx, rect, photo, panel, pal) {
  ctx.save();
  ctx.fillStyle = '#08050e';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const inset = rect.h * 0.145;
  paintPhoto(ctx, { x: rect.x, y: rect.y + inset, w: rect.w, h: rect.h - inset * 2 }, photo, panel, pal);
  paintSprockets(ctx, rect);
  ctx.restore();
}

// ---------------------------------------------------------------- lettering

/** The title's fill: a soft vertical sheen, the way a printed cover's gold lettering catches light. */
function inkGradient(ctx, y, size, pal) {
  const g = ctx.createLinearGradient(0, y - size * 0.8, 0, y + size * 0.06);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, pal.ink);
  g.addColorStop(0.78, pal.inkDeep);
  g.addColorStop(1, pal.accent);
  return g;
}

/** Fills text with a dark outline under it: the outline is what keeps the lettering legible over any photo. */
function outlinedText(ctx, text, x, y, size, pal, family = 'Anton, "Arial Narrow", sans-serif') {
  ctx.font = `400 ${size}px ${family}`;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = 'rgba(10, 3, 12, 0.94)';
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = inkGradient(ctx, y, size, pal);
  ctx.fillText(text, x, y);
}

/** Shrinks `size` until `text` fits `maxWidth`, never below `floor`; returns the size that fits. */
function fitSize(ctx, text, maxWidth, start, floor, family) {
  let size = start;
  for (;;) {
    ctx.font = `400 ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth || size <= floor) return size;
    size -= Math.max(1, Math.round(size * 0.03));
  }
}

/** A small diamond, used either side of the kicker. */
function diamond(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** One measured line of the plate: its text, face, size and the ascent/descent the face reports. */
function lineMetrics(ctx, text, family, size) {
  ctx.font = `400 ${size}px ${family}`;
  const m = ctx.measureText(text);
  return { text, family, size, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent, width: m.width };
}

/**
 * The title plate: kicker, accent rule, the title, the script subtitle and the caption, stacked with measured
 * gaps so no two lines can ever collide, on a gradation the panels bleed into.
 */
function paintPlate(ctx, plate, copy, pal, w, h) {
  // The art bleeds under the plate: the gradation starts well above it and reaches full ink at the title.
  const grad = ctx.createLinearGradient(0, plate.y - plate.h * 0.56, 0, plate.y + plate.h * 0.34);
  grad.addColorStop(0, `${pal.plate}0)`);
  grad.addColorStop(0.5, `${pal.plate}0.62)`);
  grad.addColorStop(0.78, `${pal.plate}0.93)`);
  grad.addColorStop(1, `${pal.plate}0.99)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, plate.y - plate.h * 0.56, w, plate.h * 1.56);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const kickerText = (copy.kicker || '').trim().toUpperCase();
  const titleText = (copy.title || '').trim().toUpperCase();
  const subText = (copy.subtitle || '').trim();
  const capText = (copy.caption || '').trim().toUpperCase();

  // Sizes, each fitted to the plate's width rather than guessed.
  const kickerSize = Math.max(10, Math.round(plate.h * 0.058));
  const capStart = Math.max(9, Math.round(plate.h * 0.05));
  const titleStart = Math.round(plate.h * 0.46);
  const subStart = Math.round(plate.h * 0.15);
  const kicker = kickerText ? lineMetrics(ctx, kickerText, 'Anton, "Arial Narrow", sans-serif', kickerSize) : null;
  const title = titleText
    ? lineMetrics(ctx, titleText, 'Anton, "Arial Narrow", sans-serif', fitSize(ctx, titleText, w * 0.9, titleStart, Math.round(titleStart * 0.4), 'Anton, "Arial Narrow", sans-serif'))
    : null;
  const sub = subText ? lineMetrics(ctx, subText, 'Pacifico, cursive', fitSize(ctx, subText, w * 0.76, subStart, Math.round(subStart * 0.5), 'Pacifico, cursive')) : null;
  ctx.letterSpacing = `${Math.round(capStart * 0.24)}px`;
  const cap = capText
    ? lineMetrics(ctx, capText, 'Anton, "Arial Narrow", sans-serif', fitSize(ctx, capText, w * 0.82, capStart, Math.round(capStart * 0.6), 'Anton, "Arial Narrow", sans-serif'))
    : null;
  ctx.letterSpacing = '0px';

  // The stack's gaps, in plate-relative units, then its total height and its top.
  const ruleH = Math.max(3, Math.round(plate.h * 0.015));
  const gapKicker = Math.round(plate.h * 0.03);
  const gapRule = Math.round(plate.h * 0.045);
  const gapSub = Math.round(plate.h * 0.055);
  const gapCap = Math.round(plate.h * 0.05);
  const block =
    (kicker ? kicker.ascent + kicker.descent : 0) +
    (kicker ? gapKicker + ruleH + gapRule : 0) +
    (title ? title.ascent + title.descent : 0) +
    (sub ? gapSub + sub.ascent + sub.descent : 0) +
    (cap ? gapCap + cap.ascent + cap.descent : 0);
  // Optically centred: a touch above dead centre, the way a printed plate sits.
  let y = plate.y + Math.max(0, (plate.h - block) * 0.46);

  if (kicker) {
    const baseline = y + kicker.ascent;
    ctx.font = `400 ${kicker.size}px ${kicker.family}`;
    ctx.letterSpacing = `${Math.round(kicker.size * 0.36)}px`;
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.95;
    ctx.fillText(kicker.text, w / 2 + kicker.size * 0.18, baseline);
    ctx.globalAlpha = 1;
    ctx.letterSpacing = '0px';
    const r = kicker.size * 0.2;
    const half = kicker.width / 2;
    diamond(ctx, w / 2 - half - kicker.size * 0.95, baseline - kicker.ascent * 0.36, r, pal.accent);
    diamond(ctx, w / 2 + half + kicker.size * 0.85, baseline - kicker.ascent * 0.36, r, pal.accent);
    y += kicker.ascent + kicker.descent + gapKicker;

    // The accent rule: a short bar of the grade's two colours, between the kicker and the title.
    const ruleW = Math.round(w * 0.2);
    const ruleGrad = ctx.createLinearGradient(w / 2 - ruleW / 2, 0, w / 2 + ruleW / 2, 0);
    ruleGrad.addColorStop(0, pal.accent);
    ruleGrad.addColorStop(0.5, pal.rule);
    ruleGrad.addColorStop(1, pal.accent);
    ctx.fillStyle = ruleGrad;
    ctx.fillRect(w / 2 - ruleW / 2, Math.round(y), ruleW, ruleH);
    y += ruleH + gapRule;
  }

  if (title) {
    const baseline = y + title.ascent;
    ctx.save();
    ctx.shadowColor = pal.glow;
    ctx.shadowBlur = title.size * 0.38;
    outlinedText(ctx, title.text, w / 2, baseline, title.size, pal);
    ctx.restore();
    y += title.ascent + title.descent + gapSub;
  }

  if (sub) {
    const baseline = y + sub.ascent;
    ctx.font = `400 ${sub.size}px ${sub.family}`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10, 3, 12, 0.92)';
    ctx.lineWidth = Math.max(2, sub.size * 0.15);
    ctx.strokeText(sub.text, w / 2, baseline);
    ctx.fillStyle = pal.accent;
    ctx.fillText(sub.text, w / 2, baseline);
    y += sub.ascent + sub.descent + gapCap;
  }

  if (cap) {
    const baseline = y + cap.ascent;
    ctx.font = `400 ${cap.size}px ${cap.family}`;
    ctx.letterSpacing = `${Math.round(cap.size * 0.24)}px`;
    ctx.fillStyle = pal.dim;
    ctx.fillText(cap.text, w / 2 + cap.size * 0.12, baseline);
    ctx.letterSpacing = '0px';
  }
  ctx.restore();
}

/** Scanlines, a corner vignette and a hairline frame: the last pass, over the whole cover. */
function paintGlass(ctx, w, h, pal) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#000000';
  const step = Math.max(2, Math.round(h * 0.0032));
  for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, 1);
  ctx.globalAlpha = 1;
  const vig = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.38, w / 2, h * 0.5, Math.max(w, h) * 0.8);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(4, 0, 8, 0.52)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  // A hairline frame inset from the edge, so the poster reads as a printed sheet.
  const inset = Math.round(Math.min(w, h) * 0.012);
  ctx.strokeStyle = pal.frame;
  ctx.lineWidth = Math.max(1, Math.round(Math.min(w, h) * 0.0016));
  ctx.strokeRect(inset + 0.5, inset + 0.5, w - inset * 2 - 1, h - inset * 2 - 1);
  ctx.restore();
}

// ---------------------------------------------------------------- the cover

/**
 * Draws one whole cover onto `ctx` at `w` × `h`. `state` is { layout, grade, seed, copy, panels[] } and
 * `photos` the loaded images those panels index; a panel with no photo draws a dark placeholder.
 */
export function drawCover(ctx, w, h, state, photos) {
  const pal = paletteOf(state.grade);
  const layout = LAYOUTS.includes(state.layout) ? state.layout : 'grid';
  const frame = compose(w, h, layout);
  const seed = (state.seed ?? 0) ^ hashSeed(state.grade ?? 'vice');
  const rand = mulberry32(seed);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = pal.sky[0];
  ctx.fillRect(0, 0, w, h);

  paintSky(ctx, frame.sky, pal, rand);
  paintSkyline(ctx, frame.sky, pal, rand);
  paintBadge(ctx, frame.sky, pal);

  const panels = state.panels ?? [];
  for (let i = 0; i < frame.panels.length; i++) {
    const rect = frame.panels[i];
    const panel = panels[i] ?? { photo: -1, zoom: 1, fx: 0, fy: 0 };
    const photo = photos[panel.photo] ?? null;
    if (rect.film) paintFilmPanel(ctx, rect, photo, panel, pal);
    else {
      paintPhoto(ctx, rect, photo, panel, pal);
      paintFrame(ctx, rect, pal);
    }
  }

  // One grade over the whole panel area: four photos, one light.
  paintGradePass(ctx, frame.area, pal);

  paintPlate(ctx, frame.plate, state.copy ?? DEFAULT_COPY, pal, w, h);
  paintGlass(ctx, w, h, pal);
  ctx.restore();
}
