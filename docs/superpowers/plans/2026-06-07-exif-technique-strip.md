# EXIF Technique Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the lightbox's plain EXIF text line with a compact technique strip (white-box PANNING/TRACKING/FROZEN tag + four icon-stats) overlaid on the image, and reveal a compact version on grid-thumbnail hover.

**Architecture:** Pure data/formatting logic moves into `src/exif.mjs`; strip HTML rendering into `src/strip.mjs`. `build.mjs` imports both — it stores discrete EXIF fields in `photos.json` and pre-renders strip HTML into the page. The grid shows a compact strip on hover (server-rendered into each cell); the lightbox injects the full strip via JS from a `_strip` field embedded per photo. No new runtime dependencies.

**Tech Stack:** Node 22 (ESM), `sharp`, `exifr`, Node's built-in test runner (`node:test` + `node:assert`). No browser framework.

---

## File Structure

- **Create `src/exif.mjs`** — pure EXIF formatting + technique classification. Exports `shutterParts`, `classifyTechnique`, `formatExif`.
- **Create `src/strip.mjs`** — pure HTML rendering of the EXIF strip. Exports `renderStrip`.
- **Modify `src/build.mjs`** — import the two modules; remove inline `fmtShutter`/`fmtMeta`; store discrete fields in the manifest; render compact strips into the grid and embed full strips for the lightbox.
- **Modify `src/template.html`** — add icon SVG symbol set, strip CSS (white box + zone colors + scrim + grid hover), swap the lightbox `lb-meta` element for a strip container, and populate it in JS.
- **Create `test/exif.test.mjs`**, **`test/strip.test.mjs`**, **`test/build.test.mjs`** — unit + integration tests.
- **Modify `package.json`** — add `"test": "node --test"`.

---

## Task 1: Test harness + shutter parsing + technique classifier

**Files:**
- Modify: `package.json` (add test script)
- Create: `src/exif.mjs`
- Test: `test/exif.test.mjs`

- [ ] **Step 1: Add the test script to package.json**

In `package.json`, change the `scripts` block to:

```json
  "scripts": {
    "build": "node src/build.mjs",
    "test": "node --test"
  },
```

- [ ] **Step 2: Write the failing test**

Create `test/exif.test.mjs`:

```javascript
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test test/exif.test.mjs`
Expected: FAIL — `Cannot find module '../src/exif.mjs'`.

- [ ] **Step 4: Write minimal implementation**

Create `src/exif.mjs`:

```javascript
// Pure EXIF formatting + technique classification (no I/O).

// exposureTime is in seconds (number) or null/undefined.
// Returns { display, denominator } or null.
export function shutterParts(exposureTime) {
  if (exposureTime == null) return null;
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/exif.test.mjs`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add package.json src/exif.mjs test/exif.test.mjs
git commit -m "feat: shutter parsing + technique classifier (PANNING/TRACKING/FROZEN)"
```

---

## Task 2: `formatExif` aggregator

**Files:**
- Modify: `src/exif.mjs`
- Test: `test/exif.test.mjs`

- [ ] **Step 1: Add failing tests**

Append to `test/exif.test.mjs`:

```javascript
import { formatExif } from "../src/exif.mjs";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/exif.test.mjs`
Expected: FAIL — `formatExif` is not exported.

- [ ] **Step 3: Implement `formatExif`**

Append to `src/exif.mjs`:

```javascript
// Turn a raw exifr object into the discrete display fields the strip renders.
export function formatExif(exif = {}) {
  const sp = shutterParts(exif.ExposureTime);
  const shutter = sp ? sp.display : null;
  const shutterDenominator = sp ? sp.denominator : null;
  const technique = classifyTechnique(shutterDenominator);
  const aperture = exif.FNumber != null ? `f/${+Number(exif.FNumber).toFixed(1)}` : null;
  const focal = exif.FocalLength != null ? `${Math.round(exif.FocalLength)}mm` : null;
  const iso = exif.ISO != null ? String(exif.ISO) : null;

  const metaShutter = shutter ? (shutter.endsWith("s") ? shutter : `${shutter}s`) : null;
  const meta = [metaShutter, aperture, focal, iso != null ? `ISO ${iso}` : null]
    .filter(Boolean)
    .join(" · ");

  return { shutter, shutterDenominator, aperture, focal, iso, technique, meta };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/exif.test.mjs`
Expected: PASS — all tests (Task 1 + Task 2) green.

- [ ] **Step 5: Commit**

```bash
git add src/exif.mjs test/exif.test.mjs
git commit -m "feat: formatExif aggregates discrete EXIF fields + technique"
```

---

## Task 3: `renderStrip` HTML renderer

**Files:**
- Create: `src/strip.mjs`
- Test: `test/strip.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `test/strip.test.mjs`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/strip.test.mjs`
Expected: FAIL — `Cannot find module '../src/strip.mjs'`.

- [ ] **Step 3: Implement `renderStrip`**

Create `src/strip.mjs`:

```javascript
// Pure renderer: photo (with discrete EXIF fields) -> strip HTML string.
// Used by build.mjs for the grid (compact) and the lightbox (full).

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/strip.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/strip.mjs test/strip.test.mjs
git commit -m "feat: renderStrip renders compact/full EXIF strip HTML"
```

---

## Task 4: Wire modules into `build.mjs`

**Files:**
- Modify: `src/build.mjs` (imports; remove `fmtShutter`/`fmtMeta`; manifest fields; render calls)
- Test: `test/build.test.mjs`

- [ ] **Step 1: Write the failing integration test**

Create `test/build.test.mjs`:

```javascript
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

test("rendered index.html contains grid strips and icon symbols", async () => {
  const html = await readFile("_site/index.html", "utf8");
  assert.match(html, /exif-strip is-compact/); // grid hover strips
  assert.match(html, /id="ic-shutter"/);       // icon symbol defs present
  assert.match(html, /"_strip"/);               // per-photo full strip embedded for lightbox
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/build.test.mjs`
Expected: FAIL — `photos.json` has no `shutter`/`technique` field yet, and `index.html` has no `exif-strip`.

- [ ] **Step 3: Add imports and remove the inline formatters**

In `src/build.mjs`, after the existing `import exifr from "exifr";` line (line 17), add:

```javascript
import { formatExif } from "./exif.mjs";
import { renderStrip } from "./strip.mjs";
```

Delete the entire `fmtShutter` function (currently around lines 33-37):

```javascript
function fmtShutter(t) {
  if (t == null) return null;
  if (t >= 1) return `${Number.isInteger(t) ? t : t.toFixed(1)}s`;
  return `1/${Math.round(1 / t)}s`;
}
```

Delete the entire `fmtMeta` function (currently around lines 39-49):

```javascript
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
```

(Leave `fmtBytes`, `fmtDate`, `seedCaption`, `escapeHtml` in place — they are unrelated.)

- [ ] **Step 4: Populate discrete fields in the manifest entry**

In `main()`, find the `photos.push({ ... })` block (currently around lines 178-191):

```javascript
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
```

Replace it with (note `...formatExif(src.exif)` replaces the `meta:` line and adds the discrete fields):

```javascript
    photos.push({
      name,
      src: src.file,
      original: origRel,
      width: src.width,
      height: src.height,
      bytes: src.bytes,
      bytesLabel: fmtBytes(src.bytes),
      ...formatExif(src.exif),
      caption: keptCaptions.has(src.file) ? keptCaptions.get(src.file) : seedCaption(src.exif, src.date),
      sizes,
      fallback,
    });
```

- [ ] **Step 5: Render compact strips into the grid**

In `renderGrid` (currently lines 132-148), find the returned cell template's closing `</picture>` / `</a>` and insert the compact strip between them. Replace the `return` template literal:

```javascript
      return `      <a class="cell" href="#${p.name}" data-name="${p.name}" style="flex-grow:${ar};flex-basis:${Math.round(ar * 240)}px">
        <picture>
          <source type="image/webp" srcset="${srcset}" sizes="${sizes}">
          <img loading="lazy" width="${p.width}" height="${p.height}" alt="${escapeHtml(p.caption)}" src="${p.fallback}">
        </picture>
      </a>`;
```

with:

```javascript
      return `      <a class="cell" href="#${p.name}" data-name="${p.name}" style="flex-grow:${ar};flex-basis:${Math.round(ar * 240)}px">
        <picture>
          <source type="image/webp" srcset="${srcset}" sizes="${sizes}">
          <img loading="lazy" width="${p.width}" height="${p.height}" alt="${escapeHtml(p.caption)}" src="${p.fallback}">
        </picture>
        ${renderStrip(p, { compact: true })}
      </a>`;
```

- [ ] **Step 6: Embed full strips for the lightbox**

In `main()`, find these lines (currently 199-203):

```javascript
  const gridPhotos = photos.map((p) => ({ ...p, root: "" }));
  const html = template
    .replace("{{GRID}}", renderGrid(gridPhotos))
    .replace("{{DATA}}", JSON.stringify(photos))
    .replace("{{COUNT}}", String(photos.length));
```

Replace with:

```javascript
  const dataPhotos = photos.map((p) => ({ ...p, _strip: renderStrip(p) }));
  const html = template
    .replace("{{GRID}}", renderGrid(photos))
    .replace("{{DATA}}", JSON.stringify(dataPhotos))
    .replace("{{COUNT}}", String(photos.length));
```

- [ ] **Step 7: Run the integration test to verify it passes**

Run: `node --test test/build.test.mjs`
Expected: PASS — both assertions green. (`photos.json` now has the fields; `index.html` has `exif-strip is-compact` and `_strip`.) Note: `id="ic-shutter"` and `exif-strip` from the grid both come from build output; the icon symbol assertion passes only after Task 5 adds the symbols to the template — so this specific assertion will still fail here.

> If the `id="ic-shutter"` assertion fails at this step, that is expected: the icon symbols are added to `template.html` in Task 5. The other two assertions (discrete fields, `_strip`, `exif-strip is-compact`) must pass now.

- [ ] **Step 8: Commit**

```bash
git add src/build.mjs test/build.test.mjs
git commit -m "feat: build stores discrete EXIF fields and renders strips"
```

---

## Task 5: Template — icons, CSS, lightbox strip

**Files:**
- Modify: `src/template.html`

- [ ] **Step 1: Add the icon symbol set**

In `src/template.html`, immediately after the opening `<body>` tag (before `<header>`), insert:

```html
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <symbol id="ic-shutter" viewBox="0 0 24 24"><circle cx="12" cy="13.5" r="7.5" fill="none" stroke="currentColor" stroke-width="1.7"/><line x1="9.5" y1="2.5" x2="14.5" y2="2.5" stroke="currentColor" stroke-width="1.7"/><line x1="12" y1="2.5" x2="12" y2="6" stroke="currentColor" stroke-width="1.7"/><line x1="12" y1="13.5" x2="12" y2="9.5" stroke="currentColor" stroke-width="1.7"/></symbol>
    <symbol id="ic-aperture" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><line x1="12" y1="3" x2="12" y2="9" stroke="currentColor" stroke-width="1.5"/><line x1="20" y1="16.5" x2="14.6" y2="13.5" stroke="currentColor" stroke-width="1.5"/><line x1="4" y1="16.5" x2="9.4" y2="13.5" stroke="currentColor" stroke-width="1.5"/></symbol>
    <symbol id="ic-focal" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="6.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.7"/></symbol>
    <symbol id="ic-iso" viewBox="0 0 24 24"><rect x="3" y="6.5" width="18" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7"/><line x1="3" y1="9.5" x2="21" y2="9.5" stroke="currentColor" stroke-width="1.3"/><line x1="3" y1="14.5" x2="21" y2="14.5" stroke="currentColor" stroke-width="1.3"/></symbol>
  </defs></svg>
```

- [ ] **Step 2: Add strip CSS**

In the `<style>` block, find the `.lb-meta` and `.lb-cap` rules (lines 58-59):

```css
  .lb-meta { font-family: var(--mono); font-size: .8rem; color: var(--accent); letter-spacing: .02em; }
  .lb-cap { font-size: .85rem; color: var(--dim); margin-top: .35rem; }
```

Replace those two lines with:

```css
  .lb-cap { font-size: .85rem; color: var(--dim); margin-top: .55rem; }

  /* EXIF strip (shared: grid hover + lightbox) */
  .exif-strip { display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
                font-family: var(--mono); font-size: .72rem; color: #fff; }
  .exif-strip .icstat { display: inline-flex; align-items: center; gap: 4px; }
  .exif-strip .ic { width: 13px; height: 13px; color: #fff; flex: 0 0 auto; }
  .wbox { background: #fff; color: #111; font-weight: 700; font-size: .56rem;
          letter-spacing: .1em; padding: 3px 7px; border-radius: 3px; line-height: 1;
          border-left: 3px solid #999; }
  .wbox-PANNING  { border-left-color: #5aa8ff; }
  .wbox-TRACKING { border-left-color: #9a9aa2; }
  .wbox-FROZEN   { border-left-color: #ff6347; }

  /* grid: hidden at rest, revealed on hover over the thumbnail */
  .cell .exif-strip { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
                      padding: 8px 9px; opacity: 0; transition: opacity .18s;
                      background: linear-gradient(transparent, rgba(0,0,0,.8)); }
  .cell:hover .exif-strip { opacity: 1; }

  /* lightbox: strip overlaid on the bottom of the stage */
  #lb-strip { position: absolute; left: 0; right: 0; bottom: 0; z-index: 3;
              padding: 12px 16px; background: linear-gradient(transparent, rgba(0,0,0,.82)); }
  #lb-strip .exif-strip { font-size: .8rem; }
  #lb-strip:empty { display: none; }
```

- [ ] **Step 3: Make the lightbox stage a positioning context and swap the meta element**

In `src/template.html`, the lightbox info block currently is (lines 92-95 area):

```html
    <div class="lb-info">
      <div class="lb-meta" id="lb-meta"></div>
      <div class="lb-cap" id="lb-cap"></div>
    </div>
```

Replace with:

```html
    <div id="lb-strip"></div>
    <div class="lb-info">
      <div class="lb-cap" id="lb-cap"></div>
    </div>
```

Then move `#lb-strip` so it overlays the stage: it must be a child of `.lb-stage`. Find the `.lb-stage` block (the `<div class="lb-stage"> ... </div>` containing `lb-img`, `lb-prev`, `lb-next`, `lb-loading`) and insert `<div id="lb-strip"></div>` as the last child inside `.lb-stage`, immediately before its closing `</div>`. Remove the standalone `<div id="lb-strip"></div>` you added above so it appears only once, inside `.lb-stage`.

Confirm `.lb-stage` has `position: relative` in CSS. The existing rule is:

```css
  .lb-stage { flex: 1; display: flex; align-items: center; justify-content: center;
              min-height: 0; padding: 0 1rem; position: relative; }
```

It already includes `position: relative` — no change needed.

- [ ] **Step 4: Update the lightbox JS**

In `src/template.html` `<script>`, the element lookup line (line 101) currently is:

```javascript
  const lb = $("lb"), lbImg = $("lb-img"), lbMeta = $("lb-meta"), lbCap = $("lb-cap"),
```

Replace `lbMeta = $("lb-meta")` with `lbStrip = $("lb-strip")`:

```javascript
  const lb = $("lb"), lbImg = $("lb-img"), lbStrip = $("lb-strip"), lbCap = $("lb-cap"),
```

Then find the meta assignment inside `show()` (line 122):

```javascript
    lbMeta.textContent = p.meta || "";
```

Replace with:

```javascript
    lbStrip.innerHTML = p._strip || "";
```

- [ ] **Step 5: Rebuild and run the full test suite**

Run: `npm test`
Expected: PASS — all of `test/exif.test.mjs`, `test/strip.test.mjs`, `test/build.test.mjs` green (the `id="ic-shutter"` assertion now passes because the symbols exist in the template).

- [ ] **Step 6: Visual check in the browser**

Run:
```bash
node src/build.mjs && (cd _site && python3 -m http.server 8099 >/dev/null 2>&1 &) && sleep 1 && open http://localhost:8099
```
Confirm by eye:
- Grid is clean at rest; hovering a thumbnail fades in the white box (`PANNING`/`TRACKING`/`FROZEN`) + shutter.
- Opening a photo shows the full strip (white box + four icon-stats) overlaid at the bottom of the image, caption beneath.
- A frame's white box color edge matches its zone (blue / grey / red).

Then stop the server:
```bash
pkill -f "http.server 8099"
```

- [ ] **Step 7: Commit**

```bash
git add src/template.html
git commit -m "feat: EXIF strip overlay in lightbox + grid hover, with icons"
```

---

## Task 6: Verify and deploy

**Files:** none (verification + deploy)

- [ ] **Step 1: Full clean rebuild + tests**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 2: Confirm graceful fallback logic holds**

Run:
```bash
node -e "import('./src/strip.mjs').then(({renderStrip})=>{console.log(renderStrip({technique:null,shutter:null,aperture:'f/2.8'}))})"
```
Expected output contains `exif-strip`, contains `#ic-aperture`, and does NOT contain `wbox` or `#ic-shutter`.

- [ ] **Step 3: Commit any regenerated outputs**

`photos.json` now carries the discrete fields. Stage and commit it:

```bash
git add photos.json
git commit -m "chore: regenerate manifest with discrete EXIF fields" || echo "nothing to commit"
```

- [ ] **Step 4: Push and watch the deploy**

```bash
git push
```
Then watch the GitHub Actions run:
```bash
gh run watch "$(gh run list --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
```
Expected: build ✓, deploy ✓.

- [ ] **Step 5: Verify live**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://jeremiah-blessing.github.io/frames/
open https://jeremiah-blessing.github.io/frames/
```
Expected: 200, and the live grid hover + lightbox show the technique strip.

---

## Self-Review Notes

- **Spec coverage:** strip + white box w/ colored edge (Tasks 3, 5) · technique zones PANNING/TRACKING/FROZEN (Task 1) · four icon-stats (Tasks 3, 5) · lightbox full + grid-hover compact + caption below (Tasks 4, 5) · graceful fallback (Tasks 3, 6) · data-model discrete fields (Tasks 2, 4) · layout/pipeline/originals untouched (no task modifies those paths). All covered.
- **Type consistency:** `formatExif` returns `{shutter, shutterDenominator, aperture, focal, iso, technique, meta}`; `renderStrip` reads `technique/shutter/aperture/focal/iso`; build spreads `...formatExif(...)` so the photo objects carry exactly those keys; `_strip` is added only to the embedded `dataPhotos`, never to committed `photos.json`. Consistent.
- **Touch devices:** no hover → users open the lightbox, which shows the full strip (Task 5). Covered without extra code.
```
