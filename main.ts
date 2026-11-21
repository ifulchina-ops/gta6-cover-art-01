// Leonida Nights — a gta6-cover-art-01 entry (Node 22, standard library only). app/ is the app: plain static
// files a desktop browser loads offline, no build step, no network request. This program hands it in: it copies
// app/ and screenshots/ beside this file to /output, refuses to build anything the scorer would refuse, and
// writes /output/dossier.json with the kit's vendored buildDossier.
//
//   node serve.ts                                  try the app at http://localhost:8080
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The guards are deliberate and loud: a sample vignette that is missing or the wrong size, a screenshots/
// folder that is not 3 or 4 shots, or a shot over the 256 KiB cap fails the build here instead of at the gate.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The scorer's caps (reference/gate.json): only text_max_bytes shapes the bytes, the others refuse. */
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

/** The four vignettes the app ships, and the pixel size each one is resized to. */
const SAMPLES = ['neon', 'speedboat', 'muscle', 'lifeguard'] as const;
const SAMPLE_W = 1024;
const SAMPLE_H = 683;
const SHOT_MAX_BYTES = 262144;

/** Reads a JPEG's pixel size from its SOF marker without decoding it: [width, height], or null. */
function jpegSize(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1]!;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const height = (bytes[i + 5]! << 8) | bytes[i + 6]!;
      const width = (bytes[i + 7]! << 8) | bytes[i + 8]!;
      return [width, height];
    }
    i += 2 + length;
  }
  return null;
}

/** Fails the build with one clear line, never a stack trace the gate has to interpret. */
function refuse(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- guards

/** Every sample must be present, a JPEG, and exactly 1024x683; a missing one would ship an empty slot. */
function checkSamples(): void {
  const dir = join(here, 'app', 'samples');
  if (!existsSync(dir)) refuse('missing app/samples/ (the four vignettes the app deals)');
  for (const name of SAMPLES) {
    const file = join(dir, `${name}.jpg`);
    if (!existsSync(file)) refuse(`missing sample app/samples/${name}.jpg`);
    const bytes = new Uint8Array(readFileSync(file));
    const size = jpegSize(bytes);
    if (size === null) refuse(`app/samples/${name}.jpg is not a JPEG`);
    const [w, h] = size;
    if (w !== SAMPLE_W || h !== SAMPLE_H) refuse(`app/samples/${name}.jpg is ${w}x${h}, expected ${SAMPLE_W}x${SAMPLE_H}`);
    if (bytes.length > SHOT_MAX_BYTES) refuse(`app/samples/${name}.jpg is ${bytes.length} bytes, over 256 KiB`);
  }
}

/** screenshots/ holds 3 or 4 whole PNG or JPEG files, each at most 256 KiB; anything else refuses the build. */
function checkScreenshots(): void {
  const dir = join(here, 'screenshots');
  if (!existsSync(dir)) refuse('missing screenshots/ (3 or 4 shots: the first by name is the cover)');
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
  if (names.length < 3 || names.length > CAPS.screenshots.max) {
    refuse(`screenshots/ holds ${names.length} files, expected 3 or 4`);
  }
  for (const name of names) {
    const file = join(dir, name);
    const size = statSync(file).size;
    if (size > SHOT_MAX_BYTES) refuse(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
    const bytes = new Uint8Array(readFileSync(file));
    const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!png && !jpeg) refuse(`screenshots/${name} is neither a PNG nor a JPEG`);
  }
}

// ---------------------------------------------------------------- build

mkdirSync(out, { recursive: true });

checkSamples();
checkScreenshots();

cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, CAPS);
writeFileSync(join(out, 'dossier.json'), dossier);

const shots = readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.'));
console.log(`Leonida Nights -> ${out}`);
console.log(`  app/ copied, ${shots.length} screenshots, dossier.json ${(dossier.length / 1024).toFixed(1)} KiB`);
