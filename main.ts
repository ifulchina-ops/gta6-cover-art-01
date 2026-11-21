// Leonida Nights — the entrypoint (Node 22, standard library only). It hands the
// cover maker in: copies app/ and screenshots/ from beside this file to /output
// and writes /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in
// for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The handover is deterministic: the same repository always writes the same
// bytes, so the grader's two runs agree.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The sample scenes the app deals from — the entry is broken without them. */
const SAMPLES = ['neon.jpg', 'speedboat.jpg', 'muscle.jpg', 'lifeguard.jpg'];
const MAX_SHOT_BYTES = 262144;

/**
 * Fails loudly before anything is copied when the entry cannot pass the gate:
 * a missing sample, or a screenshots/ folder outside its shape (3 to 4 shots,
 * each at most 256 KiB). A quiet handover of a broken entry helps nobody.
 */
function checkAssets() {
  for (const sample of SAMPLES) {
    if (!existsSync(join(here, 'app', 'samples', sample))) {
      throw new Error(`missing sample photo: app/samples/${sample}`);
    }
  }
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(shotsDir)) throw new Error('missing screenshots/ folder');
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`screenshots/ must hold 3 or 4 shots, found ${shots.length}`);
  }
  for (const shot of shots) {
    const size = statSync(join(shotsDir, shot)).size;
    if (size > MAX_SHOT_BYTES) {
      throw new Error(`screenshot ${shot} is ${size} bytes, over the 256 KiB cap`);
    }
  }
}

/** Copies the app and its screenshots, then writes the dossier. */
function handIn() {
  checkAssets();
  mkdirSync(outDir, { recursive: true });
  cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  }
  // The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
  // bytes; the others refuse an entry the scorer would refuse (more than 4
  // screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
  // app files, in all, or a path under app/ over 1000 bytes).
  writeFileSync(
    join(outDir, 'dossier.json'),
    buildDossier(outDir, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      app_max_files: 993,
      app_max_bytes: 50331648,
      app_path_max_bytes: 1000,
    }),
  );
}

handIn();
