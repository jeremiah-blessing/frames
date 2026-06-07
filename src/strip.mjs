// Pure renderer: photo (with discrete EXIF fields) -> strip HTML string.
// Used by build.mjs for the grid (compact) and the lightbox (full).

//
// No HTML escaping: icon names are passed by this module, technique is a fixed
// set (PANNING/TRACKING/FROZEN/null), and stat values come from formatExif —
// all derived from numeric EXIF, never user input. Keep this true if refactoring.

function stat(icon, val) {
  if (!val) return "";
  return `<span class="icstat"><svg class="ic" aria-hidden="true"><use href="#ic-${icon}"></use></svg>${val}</span>`;
}

export function renderStrip(p = {}, { compact = false } = {}) {
  const box = p.technique ? `<span class="wbox wbox-${p.technique}">${p.technique}</span>` : "";
  const stats = compact
    ? stat("shutter", p.shutter)
    : stat("shutter", p.shutter) + stat("aperture", p.aperture) + stat("focal", p.focal) + stat("iso", p.iso);
  return `<div class="exif-strip${compact ? " is-compact" : ""}">${box}${stats}</div>`;
}
