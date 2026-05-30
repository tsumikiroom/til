// sketch.js
// p5 wiring: load image (drop / file picker / preload sample), build UI,
// run quadtree on demand, render leaves.

let sourceImg = null;       // p5.Image
let imagePixels = null;     // { width, height, data: Uint8ClampedArray }
let leaves = [];
let lastStats = null;

const params = {
  threshold: 400,
  minLeaf: 4,
  maxLeaf: 256,
  varianceSampleStride: 2,
  samplesPerLeaf: 1,
  showBorders: false,
};

let cnv;
let statsEl;

// p5.js 2.0 removed preload(). Use async setup() with await loadImage instead.
async function setup() {
  pixelDensity(1);
  const wrap = document.getElementById('canvas-wrap');
  cnv = createCanvas(800, 600);
  cnv.parent(wrap);
  cnv.drop(handleDrop);

  buildControls();

  // Draw placeholder first so something appears immediately.
  drawPlaceholder('読み込み中…');
  noLoop();

  // Try to load sample image. If it doesn't exist (404), fall through to drop-prompt.
  try {
    sourceImg = await loadImage('samples/portrait.jpg');
    onImageReady();
  } catch (e) {
    sourceImg = null;
    drawPlaceholder('画像をドロップしてください');
  }
}

function drawPlaceholder(msg) {
  background(30);
  fill(180);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(16);
  text(msg, width / 2, height / 2);
}

function draw() {
  if (!sourceImg || leaves.length === 0) return;

  background(0);
  noStroke();
  for (const leaf of leaves) {
    if (params.showBorders) stroke(0);
    else noStroke();
    fill(leaf.color[0], leaf.color[1], leaf.color[2]);
    rect(leaf.x, leaf.y, leaf.w, leaf.h);
  }
}

// --- UI ----------------------------------------------------------------

function buildControls() {
  const ctrl = document.getElementById('controls');

  addSlider(ctrl, 'threshold', 0, 4000, params.threshold, 10);
  addSlider(ctrl, 'minLeaf', 2, 64, params.minLeaf, 1);
  addSlider(ctrl, 'maxLeaf', 32, 1024, params.maxLeaf, 16);
  addSlider(ctrl, 'varianceSampleStride', 1, 8, params.varianceSampleStride, 1);
  addSliderDisabled(
    ctrl, 'samplesPerLeaf', 1, 1, 1, 1,
    'v2: median-of-N (現在は中点1サンプルのみ)'
  );

  // showBorders checkbox
  const borderRow = document.createElement('div');
  borderRow.className = 'row';
  borderRow.innerHTML = `
    <label><input type="checkbox" id="ctrl-showBorders"> show borders</label>
  `;
  ctrl.appendChild(borderRow);
  document.getElementById('ctrl-showBorders').addEventListener('change', (e) => {
    params.showBorders = e.target.checked;
    redraw();
  });

  // File picker
  const fileRow = document.createElement('div');
  fileRow.className = 'row';
  fileRow.innerHTML = `
    <label>画像を選択</label>
    <input type="file" id="ctrl-file" accept="image/*">
  `;
  ctrl.appendChild(fileRow);
  document.getElementById('ctrl-file').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    try {
      sourceImg = await loadImage(url);
      onImageReady();
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  // Re-process button
  const runBtn = document.createElement('button');
  runBtn.textContent = 'Re-process';
  runBtn.addEventListener('click', () => runQuadtree());
  ctrl.appendChild(runBtn);

  // Save button
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save PNG';
  saveBtn.addEventListener('click', () => saveCanvas('quadtree-mosaic', 'png'));
  ctrl.appendChild(saveBtn);

  // Stats panel
  statsEl = document.createElement('div');
  statsEl.id = 'stats';
  statsEl.textContent = '— no run yet —';
  ctrl.appendChild(statsEl);

  // Hint
  const hint = document.createElement('div');
  hint.id = 'hint';
  hint.innerHTML = `
    スライダーは即時反映されません。<br>
    変更後 <b>Re-process</b> を押してください。<br>
    画像はキャンバスへドロップでも切替可能。
  `;
  ctrl.appendChild(hint);
}

function addSlider(parent, key, min, max, init, step) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `
    <label>${key}: <span class="value" id="val-${key}">${init}</span></label>
    <input type="range" id="ctrl-${key}" min="${min}" max="${max}" step="${step}" value="${init}">
  `;
  parent.appendChild(row);
  const valEl = document.getElementById(`val-${key}`);
  const input = document.getElementById(`ctrl-${key}`);
  input.addEventListener('input', () => {
    const v = Number(input.value);
    params[key] = v;
    valEl.textContent = v;
  });
}

function addSliderDisabled(parent, key, min, max, init, step, note) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `
    <label>${key}: <span class="value">${init}</span> <span style="color:#666">— ${note}</span></label>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${init}" disabled>
  `;
  parent.appendChild(row);
}

// --- Image handling ---------------------------------------------------

async function handleDrop(file) {
  if (!file.type || file.type !== 'image') return;
  sourceImg = await loadImage(file.data);
  onImageReady();
}

function onImageReady() {
  // Downscale very large images (>2048 on long edge) for perf.
  const maxDim = 2048;
  if (sourceImg.width > maxDim || sourceImg.height > maxDim) {
    if (sourceImg.width >= sourceImg.height) {
      sourceImg.resize(maxDim, 0);
    } else {
      sourceImg.resize(0, maxDim);
    }
  }

  resizeCanvas(sourceImg.width, sourceImg.height);
  sourceImg.loadPixels();
  imagePixels = {
    width: sourceImg.width,
    height: sourceImg.height,
    data: sourceImg.pixels, // Uint8ClampedArray, RGBA
  };
  runQuadtree();
}

function runQuadtree() {
  if (!imagePixels) return;
  const result = buildQuadtree(imagePixels, params);
  leaves = result.leaves;
  lastStats = result.stats;
  updateStatsLabel();
  console.log('[quadtree]', lastStats);
  redraw();
}

function updateStatsLabel() {
  if (!statsEl || !lastStats) return;
  statsEl.innerHTML = `
    Leaves: <b>${lastStats.leafCount}</b><br>
    Depth: ${lastStats.minDepth}–${lastStats.maxDepth}<br>
    Last run: ${lastStats.runMs.toFixed(1)} ms
  `;
}
