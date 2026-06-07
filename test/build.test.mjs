import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const TECHNIQUES = new Set(["PANNING", "TRACKING", "FROZEN"]);

before(() => {
  // Runs the real build (mutates _site/ and photos.json). Build is deterministic
  // and derivatives are mtime-cached, so reruns are fast. Surface stderr on failure.
  try {
    execFileSync("node", ["src/build.mjs"], { stdio: ["ignore", "ignore", "inherit"] });
  } catch (err) {
    throw new Error(`build.mjs failed during test setup: ${err.message}`);
  }
});

// Invariant assertions — independent of which specific photos are present,
// so adding/removing/reordering photos does not break the suite.
test("photos.json: every frame with a shutter has a valid technique + discrete fields", async () => {
  const photos = JSON.parse(await readFile("photos.json", "utf8"));
  assert.ok(photos.length > 0, "manifest is non-empty");
  for (const p of photos) {
    if (p.shutter != null) {
      assert.equal(typeof p.shutterDenominator, "number");
      assert.ok(Number.isFinite(p.shutterDenominator));
      assert.ok(TECHNIQUES.has(p.technique), `${p.name} technique "${p.technique}" is valid`);
    } else {
      assert.equal(p.technique, null, `${p.name} has no shutter, so technique must be null`);
    }
  }
});

test("photos.json: at least one frame carries full discrete EXIF", async () => {
  const photos = JSON.parse(await readFile("photos.json", "utf8"));
  const p = photos.find((x) => x.shutter && x.aperture && x.focal && x.iso);
  assert.ok(p, "a frame with shutter+aperture+focal+iso exists");
  assert.match(p.shutter, /^(1\/\d+|\d+(\.\d+)?s)$/);
  assert.match(p.aperture, /^f\/\d/);
  assert.match(p.focal, /^\d+mm$/);
});

test("rendered index.html embeds grid strips and per-photo full strips", async () => {
  const html = await readFile("_site/index.html", "utf8");
  assert.match(html, /exif-strip is-compact/); // grid hover strips
  assert.match(html, /"_strip"/);               // per-photo full strip embedded for lightbox
});

test("photos.json does not contain render-only _strip field", async () => {
  const raw = await readFile("photos.json", "utf8");
  assert.doesNotMatch(raw, /_strip/, "the committed manifest must not carry render-only strip HTML");
});

test("rendered index.html has icon symbols and a lightbox strip container", async () => {
  const html = await readFile("_site/index.html", "utf8");
  assert.match(html, /id="ic-shutter"/);
  assert.match(html, /id="ic-aperture"/);
  assert.match(html, /id="ic-focal"/);
  assert.match(html, /id="ic-iso"/);
  assert.match(html, /id="lb-strip"/);
  assert.doesNotMatch(html, /id="lb-meta"/); // old element removed
});
