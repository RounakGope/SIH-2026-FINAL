// Loads a crop's disease model from /public/model/<crop>/ and runs it on-device.
//
// What the ML team ships per crop (see MODEL_HANDOFF.md):
//   model.json + group1-shard*.bin   TF.js GRAPH model (MobileNetV2), 224×224×3
//   class_names.json                 output index → class name, in the model's order
//
// Input is raw RGB in 0–255. MobileNetV2's preprocessing is baked into the graph,
// so scaling here (÷255, or to [-1, 1]) would silently wreck the predictions.
//
// If a crop's files are missing or don't load, a clearly-labelled DEMO predictor
// is used so the rest of the app still works; the Scan screen shows a banner.
import * as tf from '@tensorflow/tfjs';

const SIZE = 224;
const loaded = new Map();

export function loadModel(crop) {
  const key = String(crop).toLowerCase();
  if (!loaded.has(key)) loaded.set(key, doLoad(key));
  return loaded.get(key);
}

async function doLoad(key) {
  try {
    const res = await fetch(`/model/${key}/class_names.json`);
    if (!res.ok) throw new Error(`no class_names.json for ${key}`);
    const labels = (await res.json()).map(normalise);
    const model = await tf.loadGraphModel(`/model/${key}/model.json`);
    // Guard rail: a label file that doesn't match the model is the one mistake
    // that would make every diagnosis confidently wrong, so refuse to use it.
    // Running a blank image also warms the model up, so the first real scan isn't
    // the slow one.
    const width = tf.tidy(() => model.predict(tf.zeros([1, SIZE, SIZE, 3])).shape[1]);
    if (width !== labels.length) {
      throw new Error(`class_names.json has ${labels.length} labels but the model has ${width} outputs`);
    }
    return { demo: false, crop: key, labels, size: SIZE, model, head: await findHead(key), backend: tf.getBackend() };
  } catch (e) {
    console.warn(`Model for ${key} not loaded, using DEMO predictor:`, e.message);
    loaded.delete(key); // try again next time, e.g. once the phone is back online
    return { demo: true, crop: key, size: SIZE };
  }
}

// The whole photo, squashed to size×size. This matches how the models were
// trained (image_dataset_from_directory / PIL resize the full image without
// cropping), so the model sees photos the way it saw its training set.
export function modelInput(img, size = SIZE) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  c.getContext('2d').drawImage(img, 0, 0, size, size);
  return c;
}

// canvas: output of modelInput().
// sev: result of lesionMask(); used only by the demo predictor.
// demoLabels: [healthyLabel, diseasedLabel] for the demo predictor.
// Returns every class as [{ label, p }], most likely first.
export async function classify(m, canvas, sev, demoLabels) {
  if (m.demo) return demoPredict(sev, demoLabels);
  const probs = tf.tidy(() => {
    let img = tf.browser.fromPixels(canvas).toFloat(); // 0–255, as the model expects
    if (img.shape[0] !== m.size || img.shape[1] !== m.size) img = tf.image.resizeBilinear(img, [m.size, m.size]);
    return m.model.predict(img.expandDims(0)).dataSync();
  });
  return m.labels.map((label, i) => ({ label, p: probs[i] })).sort((a, b) => b.p - a.p);
}

// ---------- where the model looked (class activation map) ----------
// The models end MobileNetV2 feature maps (7×7×1280) → global average pool → one
// dense layer. For that head, Grad-CAM reduces exactly to a class activation map
// (Zhou et al. 2016): weight each feature map by the dense weight of the predicted
// class and sum. No gradients needed, so it is cheap on a phone.
async function findHead(key) {
  try {
    const nodes = (await (await fetch(`/model/${key}/model.json`)).json()).modelTopology.node;
    const pool = nodes.find(n => n.op === 'Mean');
    const dense = nodes.find(n => n.op === '_FusedMatMul' || n.op === 'MatMul');
    return pool && dense ? { features: pool.input[0], kernel: dense.input[1] } : null;
  } catch { return null; }
}

// Returns a JPEG data URL of the photo with the regions that drove `label` warmed
// up, or null when there is no real model (demo mode) or the head isn't recognised.
export function explain(m, canvas, img, label, width = 320) {
  const k = m.demo || !m.head ? -1 : m.labels.indexOf(label);
  if (k < 0) return null;
  const w = width, h = Math.round(width * (img.naturalHeight || img.height) / (img.naturalWidth || img.width));
  const heat = tf.tidy(() => {
    const x = tf.browser.fromPixels(canvas).toFloat().expandDims(0);
    const maps = m.model.execute(x, m.head.features);            // [1, 7, 7, 1280]
    const weights = m.model.weights[m.head.kernel][0];            // [1280, classes]
    const n = maps.shape[3];
    const cam = maps.reshape([-1, n]).matMul(weights.slice([0, k], [n, 1]))
      .reshape([1, maps.shape[1], maps.shape[2], 1]).relu();
    // The model saw the whole photo squashed, so the 7×7 grid maps onto the full
    // frame and can be stretched back to the photo's own shape.
    return tf.image.resizeBilinear(cam.div(cam.max().add(1e-6)), [h, w]).dataSync();
  });
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    const v = heat[i];
    // Dim what the model ignored and warm what drove the call, with a smooth ramp
    // so the overlay has no hard edges.
    const dim = 0.5 + 0.5 * Math.min(1, v / 0.4);
    const a = Math.max(0, Math.min(0.7, (v - 0.3) * 1.1));
    for (let ch = 0; ch < 3; ch++) px.data[i * 4 + ch] *= dim;
    px.data[i * 4] = px.data[i * 4] * (1 - a) + 235 * a;
    px.data[i * 4 + 1] = px.data[i * 4 + 1] * (1 - a) + (120 - 90 * v) * a;
    px.data[i * 4 + 2] = px.data[i * 4 + 2] * (1 - a) + 30 * a;
  }
  ctx.putImageData(px, 0, 0);
  return c.toDataURL('image/jpeg', 0.7);
}

// Accept "Bacterial blight", "bacterial-blight" etc. from a label file.
function normalise(label) {
  return String(label).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

// Stand-in until a crop's model files exist: guesses from lesion colour alone.
function demoPredict(sev, [healthy, diseased]) {
  let top;
  if (!sev || sev.leafFraction < 0.08) top = ['other', 0.62];
  else if (sev.pct < 4) top = [healthy, 0.9];
  else top = [diseased, Math.min(0.95, 0.55 + sev.pct / 60)];
  const rest = [healthy, diseased, 'other'].filter(l => l !== top[0]);
  const remaining = 1 - top[1];
  return [
    { label: top[0], p: top[1] },
    { label: rest[0], p: remaining * 0.7 },
    { label: rest[1], p: remaining * 0.3 }
  ];
}
