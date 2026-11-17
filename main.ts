// MOTHLIGHT v2 — Five Nights of the Glow Moth (best-game-01).
// Build entry: copy game/ + screenshots/ to /output and write
// /output/dossier.json with the kit's buildDossier library, at the
// competition gate's caps (competition.yaml, reference/gate.json):
//   game/ at most 993 files+dirs, 48 MiB; each path at most 1000 bytes;
//   game/index.html at most 1 MiB; 3-4 screenshots, each at most 256 KiB,
//   long side at most 1280, short side at least 480; dossier at most
//   1.5 MiB, its text at most 163,840 bytes.
// No network, no extra dependencies — Node 22 built-ins only.
// Deterministic: run twice, the dossier bytes are identical.
import { buildDossier } from "./vendor/makefun-game.ts";
import { cp, mkdir } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

await mkdir(out, { recursive: true });
await cp(path.join(root, "game"), path.join(out, "game"), { recursive: true });
await cp(path.join(root, "screenshots"), path.join(out, "screenshots"), { recursive: true });

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};
const dossier = buildDossier(out, caps);
writeFileSync(path.join(out, "dossier.json"), dossier);

console.log("MOTHLIGHT v2 built: game/ + screenshots/ copied to " + out +
  ", dossier.json " + dossier.length + " bytes");
