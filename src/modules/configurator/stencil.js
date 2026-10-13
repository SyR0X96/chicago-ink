// ============================================================================
//  Darstellung auf der Haut im Look einer echten Stencil-Vorlage
//  (lila Umdruck, wie er im Studio vor dem Stechen aufgebracht wird).
// ============================================================================

export const STENCIL = '#4b36a6';
export const INK = '#15161a';

export const formats = [
  { id: 'hoch', label: 'Hochformat', aspect: 3 / 4, shape: 'rect' },
  { id: 'quer', label: 'Querformat', aspect: 4 / 3, shape: 'rect' },
  { id: 'rund', label: 'Rund', aspect: 1, shape: 'round' },
  { id: 'band', label: 'Band', aspect: 3.6, shape: 'rect' },
];

function canvasFor(aspect, size = 1024) {
  const c = document.createElement('canvas');
  c.width = Math.round(aspect >= 1 ? size : size * aspect);
  c.height = Math.round(aspect >= 1 ? size / aspect : size);
  return c;
}

function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// Platzhalter für ein Motiv: zeigt Fläche, Format und die Idee
export async function renderPlaceholder(formatId = 'hoch', idea = '') {
  const f = formats.find((x) => x.id === formatId) || formats[0];
  const c = canvasFor(f.aspect);
  const ctx = c.getContext('2d');
  const { width: W, height: H } = c;
  const m = Math.min(W, H);
  const pad = m * 0.04;
  const lw = Math.max(4, m * 0.012);

  ctx.strokeStyle = STENCIL;
  ctx.fillStyle = STENCIL;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Fläche leicht getönt
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.beginPath();
  if (f.shape === 'round') ctx.ellipse(W / 2, H / 2, W / 2 - pad, H / 2 - pad, 0, 0, Math.PI * 2);
  else ctx.roundRect(pad, pad, W - pad * 2, H - pad * 2, m * 0.06);
  ctx.fill();
  ctx.restore();

  // gestrichelte Kontur
  ctx.lineWidth = lw;
  ctx.setLineDash([lw * 3, lw * 2.4]);
  ctx.beginPath();
  if (f.shape === 'round') ctx.ellipse(W / 2, H / 2, W / 2 - pad, H / 2 - pad, 0, 0, Math.PI * 2);
  else ctx.roundRect(pad, pad, W - pad * 2, H - pad * 2, m * 0.06);
  ctx.stroke();
  ctx.setLineDash([]);

  // Eckwinkel (nur eckige Formate)
  if (f.shape === 'rect') {
    const k = m * 0.12;
    ctx.lineWidth = lw * 1.6;
    for (const [x, y, sx, sy] of [[pad, pad, 1, 1], [W - pad, pad, -1, 1], [pad, H - pad, 1, -1], [W - pad, H - pad, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * k);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * k, y);
      ctx.stroke();
    }
  }

  // Fadenkreuz in der Mitte
  ctx.lineWidth = lw * 0.8;
  const cr = m * 0.05;
  ctx.beginPath();
  ctx.moveTo(W / 2 - cr, H / 2);
  ctx.lineTo(W / 2 + cr, H / 2);
  ctx.moveTo(W / 2, H / 2 - cr);
  ctx.lineTo(W / 2, H / 2 + cr);
  ctx.stroke();

  // Beschriftung
  try { await document.fonts.load(`italic 400 64px "Instrument Serif"`); } catch { /* Fallback */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = 'DEIN MOTIV';
  const ls = m * 0.085;
  ctx.font = `600 ${Math.round(ls * 0.42)}px "Inter Variable", sans-serif`;
  ctx.letterSpacing = `${Math.round(ls * 0.1)}px`;
  const text = idea.trim();
  const labelY = text ? H / 2 - cr - ls * 0.9 : H / 2 + cr + ls * 0.8;
  ctx.fillText(label, W / 2, labelY);
  ctx.letterSpacing = '0px';
  if (text) {
    const fs = Math.round(Math.min(m * 0.13, W * 0.1));
    ctx.font = `italic 400 ${fs}px "Instrument Serif", serif`;
    const lines = wrap(ctx, text.length > 60 ? text.slice(0, 58) + '…' : text, W - pad * 6).slice(0, f.id === 'band' ? 1 : 3);
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + cr + fs * 0.9 + i * fs * 1.05));
  }
  return c;
}

// Schriftzug: eine elegante Vorlage – die finale Typo gestaltet der Artist
export async function renderText(text, size = 1400) {
  const t = text.trim() || 'Dein Text';
  const px = 220;
  const fontStr = `italic 400 ${px}px "Instrument Serif", serif`;
  try { await document.fonts.load(fontStr, t); } catch { /* Fallback */ }
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = fontStr;
  const w = Math.ceil(ctx.measureText(t).width + px * 0.6);
  const h = Math.ceil(px * 1.5);
  const scale = Math.min(1, size / w);
  c.width = Math.max(4, Math.round(w * scale));
  c.height = Math.max(4, Math.round(h * scale));
  ctx.scale(scale, scale);
  ctx.font = fontStr;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = STENCIL;
  ctx.fillText(t, w / 2, h / 2);
  return c;
}

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Eigenes Bild: 'original' (weißer Hintergrund wird entfernt) oder 'stencil' (lila Linien)
export function processUpload(img, mode = 'original', max = 1024) {
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(2, Math.round(img.naturalWidth * s));
  const h = Math.max(2, Math.round(img.naturalHeight * s));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (mode === 'stencil') ctx.filter = 'blur(1.2px)';
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = 'none';
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = d[i * 4 + 3] / 255;
    lum[i] = ((0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255) * a + (1 - a);
  }

  if (mode === 'original') {
    for (let i = 0; i < w * h; i++) {
      d[i * 4 + 3] = Math.round(d[i * 4 + 3] * Math.min(1, Math.max(0, (0.97 - lum[i]) / 0.08)));
    }
  } else {
    // Sobel-Kanten -> Linienzeichnung in Stencil-Lila
    const mag = new Float32Array(w * h);
    let maxM = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx = -lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1] + lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1];
        const gy = -lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1] + lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1];
        const m = Math.hypot(gx, gy);
        mag[i] = m;
        if (m > maxM) maxM = m;
      }
    }
    const sample = [];
    for (let i = 0; i < mag.length; i += 7) sample.push(mag[i]);
    sample.sort((a, b) => a - b);
    const t = Math.max(sample[Math.floor(sample.length * 0.88)], maxM * 0.08);
    for (let i = 0; i < w * h; i++) {
      const a = Math.min(1, Math.max(0, (mag[i] - t * 0.7) / (t * 0.9)));
      d[i * 4] = 75; d[i * 4 + 1] = 54; d[i * 4 + 2] = 166;
      d[i * 4 + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(id, 0, 0);
  return c;
}
