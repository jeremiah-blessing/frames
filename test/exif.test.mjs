import { test } from "node:test";
import assert from "node:assert/strict";
import { shutterParts, classifyTechnique } from "../src/exif.mjs";

test("shutterParts formats fast fractional shutter", () => {
  const r = shutterParts(0.000625); // 1/1600s
  assert.equal(r.display, "1/1600");
  assert.equal(r.denominator, 1600);
});

test("shutterParts formats a slow pan", () => {
  const r = shutterParts(0.01); // 1/100s
  assert.equal(r.display, "1/100");
  assert.equal(r.denominator, 100);
});

test("shutterParts handles exposures of one second or longer", () => {
  const r = shutterParts(2); // 2s
  assert.equal(r.display, "2s");
  assert.equal(r.denominator, 0.5);
});

test("shutterParts returns null when missing", () => {
  assert.equal(shutterParts(null), null);
  assert.equal(shutterParts(undefined), null);
});

test("classifyTechnique zones", () => {
  assert.equal(classifyTechnique(100), "PANNING");
  assert.equal(classifyTechnique(250), "PANNING");
  assert.equal(classifyTechnique(251), "TRACKING");
  assert.equal(classifyTechnique(400), "TRACKING");
  assert.equal(classifyTechnique(999), "TRACKING");
  assert.equal(classifyTechnique(1000), "FROZEN");
  assert.equal(classifyTechnique(3200), "FROZEN");
  assert.equal(classifyTechnique(0.5), "PANNING"); // very slow (>=1s)
  assert.equal(classifyTechnique(null), null);
});
