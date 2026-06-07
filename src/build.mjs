// Build the static motorcycle photo portfolio.
//
//   photos/*.jpg  ──▶  read EXIF ─▶ sort by capture date ─▶ moto-NNN
//                 ──▶  sharp: WebP 400/1000/2000 + JPG 1000 fallback
//                 ──▶  copy originals → _site/originals/
//                 ──▶  photos.json (committed, caption-merge preserving)
//                 ──▶  _site/index.html (rendered from template + manifest)
//
// Re-runnable: existing derivatives are skipped when up to date, and
// human-edited captions in photos.json are preserved across rebuilds.

import { readdir, mkdir, copyFile, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import exifr from "exifr";

const ROOT = path.resolve(fileURLToPath(import.meta.url), "../..");
const PHOTOS_DIR = path.join(ROOT, "photos");
const SITE_DIR = path.join(ROOT, "_site");
const IMG_DIR = path.join(SITE_DIR, "img");
const ORIG_DIR = path.join(SITE_DIR, "originals");
const MANIFEST_PATH = path.join(ROOT, "photos.json");
const TEMPLATE_PATH = path.join(ROOT, "src", "template.html");

const WIDTHS = [400, 1000, 2000];
const FALLBACK_WIDTH = 1000;
const IMAGE_RE = /\.(jpe?g)$/i;

// ── EXIF formatting ─────────────────────────────────────────────────────────

function fmtShutter(t) {
  if (t == null) return null;
  if (t >= 1) return `${Number.isInteger(t) ? t : t.toFixed(1)}s`;
  return `1/${Math.round(1 / t)}s`;
}

function fmtMeta(e) {
  return [
    fmtShutter(e.ExposureTime),
    e.FNumber != null ? `f/${+e.FNumber.toFixed(1)}` : null,
    e.FocalLength != null ? `${Math.round(e.FocalLength)}mm` : null,
    e.ISO != null ? `ISO ${e.ISO}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(d) {
  if (!d) return null;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Placeholder caption seed — meant to be overwritten by hand later.
function seedCaption(e, date) {
  const parts = [e.Model, fmtDate(date)].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Untitled";
}

function fmtBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${Math.round(mb)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// ── pipeline ────────────────────────────────────────────────────────────────

async function newerThan(src, out) {
  // true when `out` is missing or older than `src` (needs regeneration)
  if (!existsSync(out)) return true;
  const [s, o] = await Promise.all([stat(src), stat(out)]);
  return s.mtimeMs > o.mtimeMs;
}

async function readSource(file) {
  const srcPath = path.join(PHOTOS_DIR, file);
  const fileStat = await stat(srcPath);
  let exif = {};
  try {
    exif = (await exifr.parse(srcPath, { pick: [
      "ExposureTime", "FNumber", "ISO", "FocalLength", "LensModel", "Model", "DateTimeOriginal",
    ] })) || {};
  } catch {
    // Graceful: a file with broken/absent EXIF must not abort the build.
    exif = {};
  }
  const meta = await sharp(srcPath).metadata();
  const date = exif.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal : null;
  return {
    file,
    srcPath,
    exif,
    date,
    sortKey: date ? date.getTime() : fileStat.mtimeMs, // fallback to mtime when no capture date
    width: meta.width,
    height: meta.height,
    bytes: fileStat.size,
  };
}

async function makeDerivatives(src, name) {
  const sizes = [];
  for (const target of WIDTHS) {
    const actual = Math.min(target, src.width); // never upscale
    const out = path.join(IMG_DIR, `${name}-${target}.webp`);
    if (await newerThan(src.srcPath, out)) {
      await sharp(src.srcPath).rotate().resize({ width: actual, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
    }
    sizes.push({ w: actual, url: `img/${name}-${target}.webp` });
  }
  const fbActual = Math.min(FALLBACK_WIDTH, src.width);
  const fbOut = path.join(IMG_DIR, `${name}-${FALLBACK_WIDTH}.jpg`);
  if (await newerThan(src.srcPath, fbOut)) {
    await sharp(src.srcPath).rotate().resize({ width: fbActual, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(fbOut);
  }
  return { sizes, fallback: `img/${name}-${FALLBACK_WIDTH}.jpg` };
}

async function loadExistingCaptions() {
  // Preserve human-edited captions across rebuilds, keyed by original filename.
  if (!existsSync(MANIFEST_PATH)) return new Map();
  try {
    const prev = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    return new Map(prev.map((p) => [p.src, p.caption]));
  } catch {
    return new Map();
  }
}

function renderGrid(photos) {
  return photos
    .map((p) => {
      const srcset = p.sizes.map((s) => `${s.url} ${s.w}w`).join(", ");
      const sizes = "(max-width:700px) 50vw, 340px";
      const ar = (p.width / p.height).toFixed(4);
      // flex-grow/basis by aspect ratio → justified rows
      return `      <a class="cell" href="#${p.name}" data-name="${p.name}" style="flex-grow:${ar};flex-basis:${Math.round(ar * 240)}px">
        <picture>
          <source type="image/webp" srcset="${srcset}" sizes="${sizes}">
          <img loading="lazy" width="${p.width}" height="${p.height}" alt="${escapeHtml(p.caption)}" src="${p.fallback}">
        </picture>
      </a>`;
    })
    .join("\n");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function main() {
  if (!existsSync(PHOTOS_DIR)) throw new Error(`No photos/ directory at ${PHOTOS_DIR}`);
  await mkdir(IMG_DIR, { recursive: true });
  await mkdir(ORIG_DIR, { recursive: true });

  const files = (await readdir(PHOTOS_DIR)).filter((f) => IMAGE_RE.test(f));
  if (!files.length) throw new Error("No source images found in photos/");

  const sources = await Promise.all(files.map(readSource));
  sources.sort((a, b) => a.sortKey - b.sortKey || a.file.localeCompare(b.file));

  const keptCaptions = await loadExistingCaptions();
  const pad = String(sources.length).length >= 3 ? 3 : 3;

  const photos = [];
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const name = `moto-${String(i + 1).padStart(pad, "0")}`;
    const ext = ".jpg"; // normalize original extension
    const origRel = `originals/${name}${ext}`;
    const origOut = path.join(SITE_DIR, origRel);
    if (await newerThan(src.srcPath, origOut)) await copyFile(src.srcPath, origOut);

    const { sizes, fallback } = await makeDerivatives(src, name);

    photos.push({
      name,
      src: src.file,
      original: origRel,
      width: src.width,
      height: src.height,
      bytes: src.bytes,
      bytesLabel: fmtBytes(src.bytes),
      meta: fmtMeta(src.exif),
      caption: keptCaptions.has(src.file) ? keptCaptions.get(src.file) : seedCaption(src.exif, src.date),
      sizes,
      fallback,
    });
    process.stdout.write(`  ✓ ${name}  ${src.file}  ${photos.at(-1).meta || "(no exif)"}\n`);
  }

  // Manifest (committed, caption source of truth) — strip render-only fields.
  await writeFile(MANIFEST_PATH, JSON.stringify(photos, null, 2) + "\n");

  // Render page.
  const template = await readFile(TEMPLATE_PATH, "utf8");
  const gridPhotos = photos.map((p) => ({ ...p, root: "" }));
  const html = template
    .replace("{{GRID}}", renderGrid(gridPhotos))
    .replace("{{DATA}}", JSON.stringify(photos))
    .replace("{{COUNT}}", String(photos.length));
  await writeFile(path.join(SITE_DIR, "index.html"), html);

  console.log(`\nBuilt ${photos.length} photos → ${path.relative(ROOT, SITE_DIR)}/`);
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
