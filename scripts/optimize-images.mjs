// Wandelt die Originalbilder in optimierte WebP-Dateien um und schreibt
// src/data/images.json mit Maßen (für Layout ohne Springen).
// Aufruf: npm run images
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.resolve(root, '../chicago-ink-site');
const OUT = path.join(root, 'public/img');

const g = (f) => path.join(SRC, 'material/galerie', f);
const x = (f) => path.join(SRC, 'extra-nicht-verlinkt', f);

// slug -> { src, trim } ; trim = schwarze Balken von Handy-Screenshots entfernen
const gallery = {
  'vader-sleeve-detail': { src: g('referenceWork-01.jpeg') },
  'vader-fullsleeve': { src: x('referenceWork-50.png') },
  'berg-wanderer': { src: g('referenceWork-57.png') },
  'auge-schmetterling': { src: g('referenceWork-59.png') },
  'fc-koeln': { src: x('referenceWork-14.png') },
  'motorradfahrer': { src: g('referenceWork-00.png') },
  'portrait-zigarre': { src: g('referenceWork-16.png') },
  'frauengesicht': { src: g('referenceWork-04.png') },
  'wolf-augen': { src: g('referenceWork-06.png') },
  'wolf-fullsleeve': { src: x('referenceWork-04 (4).jpeg') },
  'zeus': { src: g('referenceWork-02.png') },
  'loewe-mit-jungen': { src: g('referenceWork-21.png') },
  'erzengel': { src: g('referenceWork-23.png') },
  'huette-hund-sleeve': { src: g('referenceWork-24.png') },
  'adler': { src: g('referenceWork-25.png') },
  'yoda': { src: g('referenceWork-29.png') },
  'engel-backpiece': { src: g('referenceWork-34.png') },
  'i-am-enough': { src: g('referenceWork-36.png') },
  'es-pennywise': { src: g('referenceWork-49.png') },
  'justitia': { src: x('referenceWork-01.png') },
  'kinderportraet': { src: x('referenceWork-04.jpeg') },
  'ruecken-totenkopf': { src: x('referenceWork-05.jpeg') },
  'anubis': { src: x('referenceWork-051.png') },
  'berg-huette-sleeve': { src: x('referenceWork-052.png') },
  'schwarze-witwe': { src: x('referenceWork-053.png') },
  'anime-bein': { src: x('referenceWork-054.png') },
  'fullsleeve-seite': { src: x('referenceWork-05 (5).jpeg'), trim: true },
  'leguan': { src: x('referenceWork-05 (6).jpeg'), trim: true },
  'wildschwein': { src: x('referenceWork-04 (2).jpeg') },
  'krieger': { src: x('referenceWork-04 (3).jpeg') },
  'baer': { src: x('referenceWork-11.png') },
};

const artists = {
  tanja: path.join(SRC, 'material/artists/Tanja.png'),
  sava: path.join(SRC, 'material/artists/Sava.png'),
  hermes: path.join(SRC, 'material/artists/Hermes.png'),
};

const studio = {
  'studio-empfang': { src: path.join(SRC, 'material/stageImage.jpeg') },
  'studio-arbeit': { src: x('referenceWork-17.jpeg'), trim: true },
};

const meta = { gallery: {}, artists: {}, studio: {} };

async function load(src, trim) {
  let img = sharp(src).rotate();
  if (trim) {
    // Erst in Puffer rendern, damit trim auf dem gedrehten Bild arbeitet
    const buf = await img.toBuffer();
    img = sharp(buf).trim({ background: '#000000', threshold: 28 });
  }
  const buf = await img.toBuffer();
  return sharp(buf);
}

async function variants(group, slug, src, widths, { trim = false, quality = 78 } = {}) {
  const dir = path.join(OUT, group);
  await mkdir(dir, { recursive: true });
  const base = await load(src, trim);
  const { width, height } = await base.metadata();
  for (const w of widths) {
    await base
      .clone()
      .resize({ width: Math.min(w, width), withoutEnlargement: true })
      .webp({ quality, effort: 5 })
      .toFile(path.join(dir, `${slug}-${w}.webp`));
  }
  meta[group][slug] = { w: width, h: height };
  console.log(`${group}/${slug}  ${width}x${height}`);
}

for (const [slug, { src, trim }] of Object.entries(gallery)) {
  await variants('gallery', slug, src, [640, 1400], { trim });
}
for (const [slug, src] of Object.entries(artists)) {
  await variants('artists', slug, src, [520, 900]);
}
for (const [slug, { src, trim }] of Object.entries(studio)) {
  await variants('studio', slug, src, [900, 2000], { trim });
}

// Logo: WebP für die Anzeige, PNG für das Partikel-Sampling im Hero
const logoSrc = path.join(SRC, 'material/Chicago-Ink_Logo.png');
await mkdir(path.join(OUT, 'brand'), { recursive: true });
await sharp(logoSrc).resize(512).webp({ quality: 90 }).toFile(path.join(OUT, 'brand/logo-512.webp'));
await sharp(logoSrc).resize(1024).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, 'brand/logo-1024.png'));

// Favicons: nur die beiden Silhouetten (oberer Logo-Teil) auf dunklem Grund
const sil = await sharp(logoSrc).extract({ left: 300, top: 40, width: 424, height: 305 }).toBuffer();
const iconBase = async (size) =>
  sharp({ create: { width: size, height: size, channels: 4, background: '#0b0a09' } })
    .composite([{ input: await sharp(sil).resize({ width: Math.round(size * 0.86), height: Math.round(size * 0.86), fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(), gravity: 'center' }])
    .png();
await (await iconBase(32)).toFile(path.join(root, 'public/favicon-32.png'));
await (await iconBase(180)).toFile(path.join(root, 'public/apple-touch-icon.png'));
await (await iconBase(512)).toFile(path.join(root, 'public/icon-512.png'));

// Open-Graph-Bild (WhatsApp-/Social-Vorschau)
const stage = await sharp(studio['studio-empfang'].src).rotate().resize(1200, 630, { fit: 'cover' }).modulate({ brightness: 0.32, saturation: 0.6 }).toBuffer();
const logoOg = await sharp(logoSrc).resize(470).toBuffer();
await sharp(stage)
  .composite([{ input: logoOg, gravity: 'center' }])
  .jpeg({ quality: 84 })
  .toFile(path.join(root, 'public/og-image.jpg'));

await mkdir(path.join(root, 'src/data'), { recursive: true });
await writeFile(path.join(root, 'src/data/images.json'), JSON.stringify(meta, null, 2));
console.log('fertig');
