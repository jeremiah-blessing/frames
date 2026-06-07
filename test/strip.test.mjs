import { test } from "node:test";
import assert from "node:assert/strict";
import { renderStrip } from "../src/strip.mjs";

const full = {
  technique: "PANNING", shutter: "1/100", aperture: "f/11", focal: "200mm", iso: "160",
};

test("full strip has white box and all four icon-stats", () => {
  const html = renderStrip(full);
  assert.match(html, /wbox-PANNING/);
  assert.match(html, />PANNING</);
  assert.match(html, /#ic-shutter/);
  assert.match(html, /#ic-aperture/);
  assert.match(html, /#ic-focal/);
  assert.match(html, /#ic-iso/);
  assert.doesNotMatch(html, /is-compact/);
});

test("compact strip has white box + shutter only", () => {
  const html = renderStrip(full, { compact: true });
  assert.match(html, /is-compact/);
  assert.match(html, /wbox-PANNING/);
  assert.match(html, /#ic-shutter/);
  assert.doesNotMatch(html, /#ic-aperture/);
});

test("no shutter -> no white box, no shutter stat, other stats remain", () => {
  const html = renderStrip({ technique: null, shutter: null, aperture: "f/2.8", focal: "200mm", iso: "800" });
  assert.doesNotMatch(html, /wbox/);
  assert.doesNotMatch(html, /#ic-shutter/);
  assert.match(html, /#ic-aperture/);
});

test("empty data renders an empty strip container without throwing", () => {
  const html = renderStrip({});
  assert.match(html, /exif-strip/);
  assert.doesNotMatch(html, /wbox/);
});
