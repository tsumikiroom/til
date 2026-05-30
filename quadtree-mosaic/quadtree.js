// quadtree.js
// Pure-function quadtree image decomposition with midpoint color sampling.
// No p5 dependency. Input/output shapes documented below so this module can
// later be re-used from a Node script, a Web Worker, or a TouchDesigner port.
//
// Input image shape:
//   { width: number, height: number, data: Uint8ClampedArray }   // RGBA, row-major
//
// Params:
//   {
//     threshold: number,           // variance metric cutoff (per-channel-avg, see varianceMetric)
//     minLeaf: number,             // smallest allowed leaf side in px
//     maxLeaf: number,             // largest allowed leaf side in px (forces structure on flat images)
//     varianceSampleStride: number,// pixel stride when computing variance (perf)
//     samplesPerLeaf: number,      // reserved for v2 (median-of-N). v1 only uses 1.
//   }
//
// Output:
//   {
//     leaves: Array<{ x:number, y:number, w:number, h:number, color:[r,g,b] }>,
//     stats:  { leafCount, minDepth, maxDepth, runMs }
//   }
//
// Algorithm: pure recursive. Split a region into 4 quadrants iff
//   (region is larger than maxLeaf) OR (variance > threshold AND region > minLeaf).
// Compare-and-contrast with Michael Fogleman's `quads`: he uses a priority queue
// and a fixed split budget N (always exactly N+1 leaves). The recursive form
// here matches the user's mental model and produces a leaf count that depends
// on image content. A greedy-budget alternative is deferred to stage ②.

function buildQuadtree(image, params) {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const leaves = [];
  let minDepth = Infinity;
  let maxDepth = -Infinity;

  const root = { x: 0, y: 0, w: image.width, h: image.height };
  recurse(image, root, params, 0, leaves, (depth) => {
    if (depth < minDepth) minDepth = depth;
    if (depth > maxDepth) maxDepth = depth;
  });

  const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  return {
    leaves,
    stats: {
      leafCount: leaves.length,
      minDepth: isFinite(minDepth) ? minDepth : 0,
      maxDepth: maxDepth >= 0 ? maxDepth : 0,
      runMs: t1 - t0,
    },
  };
}

function recurse(image, region, params, depth, leaves, onLeaf) {
  const tooSmallToSplit =
    region.w <= params.minLeaf || region.h <= params.minLeaf;
  const tooBig =
    region.w > params.maxLeaf || region.h > params.maxLeaf;

  let shouldSplit;
  if (tooBig) {
    shouldSplit = true;
  } else if (tooSmallToSplit) {
    shouldSplit = false;
  } else {
    const metric = varianceMetric(image, region, params.varianceSampleStride);
    shouldSplit = metric > params.threshold;
  }

  if (!shouldSplit) {
    leaves.push({
      x: region.x,
      y: region.y,
      w: region.w,
      h: region.h,
      color: midpointColor(image, region, params.samplesPerLeaf),
    });
    onLeaf(depth);
    return;
  }

  // Quadrant split. Use floating-point halves but round at pixel-read time
  // only — avoids cumulative ±1 drift at deep recursion levels.
  const halfW = region.w / 2;
  const halfH = region.h / 2;
  const quads = [
    { x: region.x,         y: region.y,         w: halfW, h: halfH },
    { x: region.x + halfW, y: region.y,         w: halfW, h: halfH },
    { x: region.x,         y: region.y + halfH, w: halfW, h: halfH },
    { x: region.x + halfW, y: region.y + halfH, w: halfW, h: halfH },
  ];
  for (const q of quads) recurse(image, q, params, depth + 1, leaves, onLeaf);
}

// Per-channel variance averaged over RGB, single pass via E[X²] - E[X]².
// Uses strided sampling to keep cost roughly O(area / stride²).
function varianceMetric(image, region, stride) {
  const { width, data } = image;
  const x0 = Math.floor(region.x);
  const y0 = Math.floor(region.y);
  const x1 = Math.min(width,        Math.floor(region.x + region.w));
  const y1 = Math.min(image.height, Math.floor(region.y + region.h));
  const s = Math.max(1, stride | 0);

  let n = 0;
  let sR = 0, sG = 0, sB = 0;
  let sR2 = 0, sG2 = 0, sB2 = 0;

  for (let y = y0; y < y1; y += s) {
    let idx = (y * width + x0) * 4;
    for (let x = x0; x < x1; x += s) {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      sR  += r;     sG  += g;     sB  += b;
      sR2 += r * r; sG2 += g * g; sB2 += b * b;
      n++;
      idx += 4 * s;
    }
  }
  if (n === 0) return 0;
  const mR = sR / n, mG = sG / n, mB = sB / n;
  const vR = sR2 / n - mR * mR;
  const vG = sG2 / n - mG * mG;
  const vB = sB2 / n - mB * mB;
  return (vR + vG + vB) / 3;
}

function midpointColor(image, region, samplesPerLeaf) {
  if (samplesPerLeaf <= 1) {
    const cx = clampInt(Math.floor(region.x + region.w / 2), 0, image.width - 1);
    const cy = clampInt(Math.floor(region.y + region.h / 2), 0, image.height - 1);
    const idx = (cy * image.width + cx) * 4;
    return [image.data[idx], image.data[idx + 1], image.data[idx + 2]];
  }
  // TODO(v2): median-of-N. Sample N pixels in a small disc around (cx,cy),
  // return per-channel median. Reduces midpoint-jitter on flat noisy regions
  // (see Scrapbox: "中点サンプリングは『ブロックがたまたまノイズの上に乗ってしまう』...").
  // Falling through to the 1-sample path keeps v1 honest.
  const cx = clampInt(Math.floor(region.x + region.w / 2), 0, image.width - 1);
  const cy = clampInt(Math.floor(region.y + region.h / 2), 0, image.height - 1);
  const idx = (cy * image.width + cx) * 4;
  return [image.data[idx], image.data[idx + 1], image.data[idx + 2]];
}

function clampInt(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
// Note: not exposed globally — p5.js 2.0 has its own `clamp` and any name
// clash on the window object raises "Cannot redefine property: clamp" at
// script load time.

// Browser global export (no module system).
if (typeof window !== 'undefined') {
  window.buildQuadtree = buildQuadtree;
}
// Node export for future headless use.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildQuadtree, varianceMetric, midpointColor };
}
