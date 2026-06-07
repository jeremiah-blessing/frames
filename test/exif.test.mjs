import { test } from "node:test";
import assert from "node:assert/strict";
import { shutterParts, classifyTechnique, formatExif } from "../src/exif.mjs";

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

test("shutterParts rejects non-positive and non-finite values", () => {
  assert.equal(shutterParts(0), null);
  assert.equal(shutterParts(-0.01), null);
  assert.equal(shutterParts(NaN), null);
  assert.equal(shutterParts(Infinity), null);
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

test("formatExif full frozen frame", () => {
  const r = formatExif({ ExposureTime: 0.000625, FNumber: 2.8, ISO: 160, FocalLength: 200 });
  assert.deepEqual(r, {
    shutter: "1/1600",
    shutterDenominator: 1600,
    aperture: "f/2.8",
    focal: "200mm",
    iso: "160",
    technique: "FROZEN",
    meta: "1/1600s · f/2.8 · 200mm · ISO 160",
  });
});

test("formatExif panning frame classifies PANNING", () => {
  const r = formatExif({ ExposureTime: 0.01, FNumber: 11, ISO: 160, FocalLength: 200 });
  assert.equal(r.technique, "PANNING");
  assert.equal(r.shutterDenominator, 100);
  assert.equal(r.aperture, "f/11");
});

test("formatExif tracking frame", () => {
  const r = formatExif({ ExposureTime: 0.0025 }); // 1/400
  assert.equal(r.technique, "TRACKING");
  assert.equal(r.shutterDenominator, 400);
});

test("formatExif omits missing fields and nulls technique without shutter", () => {
  const r = formatExif({ FNumber: 2.8 });
  assert.equal(r.shutter, null);
  assert.equal(r.shutterDenominator, null);
  assert.equal(r.technique, null);
  assert.equal(r.aperture, "f/2.8");
  assert.equal(r.meta, "f/2.8");
});

test("formatExif on empty exif", () => {
  const r = formatExif({});
  assert.equal(r.meta, "");
  assert.equal(r.technique, null);
});
