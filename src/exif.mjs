// Pure EXIF formatting + technique classification (no I/O).

// exposureTime is in seconds (number) or null/undefined.
// Returns { display, denominator } or null.
export function shutterParts(exposureTime) {
  if (exposureTime == null || !Number.isFinite(exposureTime) || exposureTime <= 0) return null;
  if (exposureTime >= 1) {
    const s = Number.isInteger(exposureTime) ? String(exposureTime) : exposureTime.toFixed(1);
    return { display: `${s}s`, denominator: 1 / exposureTime };
  }
  const denominator = Math.round(1 / exposureTime);
  return { display: `1/${denominator}`, denominator };
}

// denominator = shutter denominator (e.g. 1/100s -> 100). null -> null.
export function classifyTechnique(denominator) {
  if (denominator == null) return null;
  if (denominator <= 250) return "PANNING";
  if (denominator < 1000) return "TRACKING";
  return "FROZEN";
}
