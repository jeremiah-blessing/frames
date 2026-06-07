import { test, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

before(() => {
  // Build is idempotent; derivatives are cached so this is fast on reruns.
  execFileSync("node", ["src/build.mjs"], { stdio: "ignore" });
});

test("photos.json carries discrete EXIF fields and technique", async () => {
  const photos = JSON.parse(await readFile("photos.json", "utf8"));
  const p = photos.find((x) => x.name === "moto-007"); // known 1/100s panning frame
  assert.ok(p, "moto-007 present");
  assert.equal(p.shutter, "1/100");
  assert.equal(p.shutterDenominator, 100);
  assert.equal(p.technique, "PANNING");
  assert.equal(p.aperture, "f/11");
  assert.equal(p.focal, "200mm");
});

test("rendered index.html embeds grid strips and per-photo full strips", async () => {
  const html = await readFile("_site/index.html", "utf8");
  assert.match(html, /exif-strip is-compact/); // grid hover strips
  assert.match(html, /"_strip"/);               // per-photo full strip embedded for lightbox
});
