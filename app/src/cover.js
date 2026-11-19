// Neon Coast Cover Studio — the cover engine.
// Draws GTA-style multi-panel cover art onto a 2D canvas: any photo(s) in poster
// panels, a Vice-sunset / neon gradient-map grade, bold Anton title lettering with a
// neon Pacifico subtitle, a halftone title block, film grain and a vignette.
// All art is drawn in code; no Rockstar logo, artwork or font is used anywhere.

/** The five colour grades: sky stops, photo wash, bottom tint and title accent. */
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    sky: ['#2a1052', '#7b1e6d', '#e2543e', '#ffb347'],
    wash: 'rgba(255, 110, 60, 0.28)', tint: 'rgba(190, 30, 110, 0.45)',
    accent: '#ffd166', glow: '#ff2e88', filter: 'saturate(1.25) contrast(1.06)',
  },
  neon: {
    label: 'Neon Night',
    sky: ['#050514', '#1b0f3d', '#4d0f63', '#a4136e'],
    wash: 'rgba(255, 46, 136, 0.30)', tint: 'rgba(40, 20, 120, 0.5)',
    accent: '#7df9ff', glow: '#ff2e88', filter: 'saturate(1.35) contrast(1.12)',
  },
  dusk: {
    label: 'Palm Dusk',
    sky: ['#1d2b53', '#5b2a6e', '#b03a5b', '#ff7e5f'],
    wash: 'rgba(150, 80, 200, 0.26)', tint: 'rgba(90, 30, 90, 0.45)',
    accent: '#ffb347', glow: '#ff7e5f', filter: 'saturate(1.15) contrast(1.05)',
  },
  noir: {
    label: 'Noir',
    sky: ['#0c0c0e', '#232326', '#4a4a52', '#8a8a96'],
    wash: 'rgba(255, 255, 255, 0.10)', tint: 'rgba(0, 0, 0, 0.4)',
    accent: '#ffffff', glow: '#cccccc', filter: 'grayscale(1) contrast(1.18) brightness(0.96)',
  },
  teal: {
    label: 'Teal Heat',
    sky: ['#04263b', '#0a5e6e', '#12a5a0', '#ffb347'],
    wash: 'rgba(18, 165, 160, 0.28)', tint: 'rgba(4, 38, 59, 0.5)',
    accent: '#ffe66d', glow: '#12e5d0', filter: 'saturate(1.3) contrast(1.08)',
  },
};

/** How many panels each layout has. */
export const LAYOUT_PANELS = { grid4: 4, hero3: 4, fullbleed: 1, grid9: 9, tilted: 4 };

/** Panel rectangles (fractions of the canvas) for a layout, with rotation for tilted. */
export function layoutPanels(layout, w, h) {
  const m = 0.028 * w; // outer margin
  const g = 0.016 * w; // gap between panels
  const titleH = layout === 'fullbleed' ? 0 : Math.max(0.19 * h, 150 * (h / 1080));
  const x0 = m, y0 = m, pw = w - 2 * m, ph = h - titleH - m;
  const box = (fx, fy, fw, fh, rot = 0) => ({ x: x0 + fx * pw, y: y0 + fy * ph, w: fw * pw, h: fh * ph, rot });
  switch (layout) {
    case 'grid4': {
      const cw = (1 - g / pw) / 2, ch = (1 - g / ph) / 2;
      return [box(0, 0, cw, ch), box(cw + g / pw, 0, cw, ch), box(0, ch + g / ph, cw, ch), box(cw + g / pw, ch + g / ph, cw, ch)];
    }
    case 'hero3': {
      const heroW = 0.60, colX = heroW + g / pw, colW = 1 - colX;
      const rh = (1 - 2 * (g / ph)) / 3;
      return [box(0, 0, heroW, 1), box(colX, 0, colW, rh), box(colX, rh + g / ph, colW, rh), box(colX, 2 * (rh + g / ph), colW, rh)];
    }
    case 'fullbleed':
      return [{ x: 0, y: 0, w, h, rot: 0 }];
    case 'grid9': {
      const cw = (1 - 2 * (g / pw)) / 3, ch = (1 - 2 * (g / ph)) / 3;
      const out = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(box(c * (cw + g / pw), r * (ch + g / ph), cw, ch));
      return out;
    }
    case 'tilted':
    default: {
      // Four overlapping snapshots, tilted like photos tossed on a table.
      return [
        box(0.02, 0.04, 0.46, 0.46, -7),
        box(0.52, 0.00, 0.46, 0.44, 6),
        box(0.06, 0.52, 0.44, 0.44, 5),
        box(0.52, 0.50, 0.46, 0.46, -5),
      ];
    }
  }
}

/** The title band rectangle for a layout (null for full-bleed, where it overlays). */
export function titleBand(layout, w, h) {
  if (layout === 'fullbleed') return { x: 0, y: h * 0.72, w, h: h * 0.28, overlay: true };
  const rects = layoutPanels(layout, w, h);
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x: 0, y: bottom, w, h: h - bottom, overlay: false };
}

let grainPattern = null;
/** A reusable 128x128 noise tile, built once per page load. */
function getGrain(ctx) {
  if (grainPattern) return grainPattern;
  const tile = document.createElement('canvas');
  tile.width = 128; tile.height = 128;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 100 + Math.floor(Math.random() * 90);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 28;
  }
  tctx.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(tile, 'repeat');
  return grainPattern;
}

/** Draws one photo into a panel rect, cover-fit, with the panel's zoom and pan. */
export function drawPanelPhoto(ctx, photo, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  if (rect.rot) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((rect.rot * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);
  } else {
    ctx.translate(x, y);
  }
  // Drop shadow + white poster frame behind the photo.
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = w * 0.03;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w * 0.012, -w * 0.012, w * 1.024, h * 1.024);
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  if (photo) {
    const zoom = panel?.zoom ?? 1.15;
    const base = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * zoom;
    const pw = photo.naturalWidth * base, ph = photo.naturalHeight * base;
    const ox = (panel?.ox ?? 0) * w, oy = (panel?.oy ?? 0) * h;
    ctx.filter = grade.filter || 'none';
    ctx.drawImage(photo, (w - pw) / 2 + ox, (h - ph) / 2 + oy, pw, ph);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#3d1a5e'); g.addColorStop(1, '#12081f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${Math.round(h * 0.07)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', w / 2, h / 2);
  }
  // Gradient-map grade: warm wash + coloured bottom tint.
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grade.wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  const tint = ctx.createLinearGradient(0, h * 0.3, 0, h);
  tint.addColorStop(0, 'rgba(0,0,0,0)');
  tint.addColorStop(1, grade.tint);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A sunset sky with a low sun and a palm-skyline silhouette along the bottom. */
function drawSkyline(ctx, w, h, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Sun disc.
  const sunR = w * 0.13;
  const sunX = w * 0.72, sunY = h * 0.34;
  const sun = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
  sun.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
  sun.addColorStop(0.6, 'rgba(255, 170, 90, 0.75)');
  sun.addColorStop(1, 'rgba(255, 120, 80, 0)');
  ctx.fillStyle = sun;
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
  // Skyline blocks + palm silhouettes.
  ctx.fillStyle = 'rgba(16, 6, 28, 0.85)';
  const base = h * 0.86;
  let bx = 0;
  while (bx < w) {
    const bw = w * (0.05 + Math.random() * 0.06);
    const bh = h * (0.05 + Math.random() * 0.12);
    ctx.fillRect(bx, base - bh, bw, bh + h);
    bx += bw + w * 0.012;
  }
  drawPalm(ctx, w * 0.16, base, h * 0.20);
  drawPalm(ctx, w * 0.84, base, h * 0.17);
}

/** One simple palm silhouette: curved trunk + five fronds. */
function drawPalm(ctx, x, y, s) {
  ctx.strokeStyle = 'rgba(16, 6, 28, 0.9)';
  ctx.fillStyle = 'rgba(16, 6, 28, 0.9)';
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.08, y - s * 0.55, x + s * 0.16, y - s * 0.85);
  ctx.stroke();
  const topX = x + s * 0.16, topY = y - s * 0.85;
  for (let i = 0; i < 5; i++) {
    const a = (-160 + i * 32) * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * s * 0.22, topY + Math.sin(a) * s * 0.22 - s * 0.06, topX + Math.cos(a) * s * 0.38, topY + Math.sin(a) * s * 0.32 + s * 0.08);
    ctx.lineWidth = s * 0.03;
    ctx.stroke();
  }
}

/** Halftone dots across the title band, fading left to right. */
function drawHalftone(ctx, band, w) {
  const step = Math.max(14, w * 0.018);
  for (let yy = band.y + step / 2; yy < band.y + band.h; yy += step) {
    for (let xx = step / 2; xx < w; xx += step) {
      const fade = 1 - xx / w;
      const r = step * 0.28 * fade + step * 0.06;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.16 * fade + 0.03})`;
      ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/** The big title + neon script subtitle + badge, drawn in the title band. */
function drawTitleBlock(ctx, band, state, w, h, grade) {
  const { title, subtitle, badge } = state;
  ctx.save();
  if (!band.overlay) {
    ctx.fillStyle = 'rgba(12, 4, 22, 0.92)';
    ctx.fillRect(band.x, band.y, band.w, band.h);
  } else {
    const g = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
    g.addColorStop(0, 'rgba(12, 4, 22, 0)');
    g.addColorStop(1, 'rgba(12, 4, 22, 0.88)');
    ctx.fillStyle = g;
    ctx.fillRect(band.x, band.y, band.w, band.h);
  }
  if (state.halftone) drawHalftone(ctx, band, w);
  // Badge ribbon, top-right of the band.
  if (badge && badge.trim()) {
    ctx.font = `400 ${Math.round(h * 0.016)}px Anton, sans-serif`;
    const bw = ctx.measureText(badge.toUpperCase()).width + h * 0.03;
    const bh = h * 0.032, bx = w - bw - w * 0.03, by = band.y + h * 0.014;
    ctx.fillStyle = grade.accent;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#14081f';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(badge.toUpperCase(), bx + bw / 2, by + bh / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }
  // Title: Anton, outlined, sunset-gradient fill, sized to fit.
  const text = (title || 'NEON COAST').trim().toUpperCase();
  let size = band.h * 0.52;
  ctx.textAlign = 'center';
  const setFont = (s) => { ctx.font = `400 ${s}px Anton, 'Arial Narrow', sans-serif`; };
  setFont(size);
  // Leave room for the badge ribbon at the band's top-right corner.
  const maxTitleWidth = badge && badge.trim() ? w * 0.84 : w * 0.92;
  while (ctx.measureText(text).width > maxTitleWidth && size > 18) { size -= 2; setFont(size); }
  const ty = band.y + band.h * 0.58;
  const grad = ctx.createLinearGradient(0, ty - size, 0, ty + size * 0.2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, grade.accent);
  grad.addColorStop(1, grade.glow);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.085);
  ctx.strokeStyle = '#14081f';
  ctx.strokeText(text, w / 2, ty);
  ctx.fillStyle = grad;
  ctx.fillText(text, w / 2, ty);
  // Subtitle: Pacifico neon script under the title.
  if (subtitle && subtitle.trim()) {
    let subSize = band.h * 0.2;
    ctx.font = `400 ${subSize}px Pacifico, cursive`;
    while (ctx.measureText(subtitle).width > w * 0.7 && subSize > 12) {
      subSize -= 2;
      ctx.font = `400 ${subSize}px Pacifico, cursive`;
    }
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = subSize * 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, w / 2, band.y + band.h * 0.9);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` at its own pixel size.
 * `state`: { layout, grade, title, subtitle, badge, halftone, grain, panels[] }.
 * `photos`: array of HTMLImageElement (or null) indexed by photo slot.
 */
export function drawCoverArt(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = state.layout || 'grid4';
  ctx.clearRect(0, 0, w, h);
  drawSkyline(ctx, w, h, grade);
  const rects = layoutPanels(layout, w, h);
  rects.forEach((rect, i) => {
    const panel = state.panels?.[i] ?? { photo: null, zoom: 1.15, ox: 0, oy: 0 };
    const photo = panel.photo != null ? photos[panel.photo] ?? null : null;
    drawPanelPhoto(ctx, photo, rect, panel, grade);
  });
  // Thin white poster frame around the whole cover.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  drawTitleBlock(ctx, titleBand(layout, w, h), state, w, h, grade);
  if (state.grain) {
    const pattern = getGrain(ctx);
    if (pattern) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }
  // Vignette: darken the corners so the centre pops.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,18,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Renders the cover at an export size and returns the offscreen canvas. */
export function renderCover(state, photos, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCoverArt(canvas, state, photos);
  return canvas;
}
