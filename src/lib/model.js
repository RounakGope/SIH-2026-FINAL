// Loads the Teachable Machine model from /public/model and runs it on-device.
// Put the three exported files there: model.json, metadata.json, weights.bin.
// If they are missing, a clearly-labelled DEMO predictor is used so the rest of
// the app can be built and tested before the real model arrives.
import * as tf from '@tensorflow/tfjs';

let loading = null;

export function loadModel() {
  if (!loading) loading = doLoad();
  return loading;
}

async function doLoad() {
  try {
    const metaRes = await fetch('/model/metadata.json');
    if (!metaRes.ok) throw new Error('no metadata.json');
    const meta = await metaRes.json();
    const model = await tf.loadLayersModel('/model/model.json');
    const size = meta.imageSize || 224;
    const labels = meta.labels;
    // Warm-up so the first real scan is not the slow one.
    tf.tidy(() => model.predict(tf.zeros([1, size, size, 3])));
    return { demo: false, labels, size, model, backend: tf.getBackend() };
  } catch (e) {
    console.warn('Real model not found, using DEMO predictor:', e.message);
    return { demo: true, labels: ['healthy', 'bacterial_blight', 'leaf_curl', 'jassid_damage', 'other'], size: 224 };
  }
}

// canvas: a square canvas already cropped to the leaf (see image.js).
// severity: result of lesionMask, used only by the demo predictor.
export async function classify(m, canvas, severity) {
  if (m.demo) return demoPredict(severity);
  const probs = tf.tidy(() => {
    let img = tf.browser.fromPixels(canvas).toFloat();
    if (img.shape[0] !== m.size) img = tf.image.resizeBilinear(img, [m.size, m.size]);
    // Teachable Machine preprocessing: scale pixels to [-1, 1].
    const x = img.div(127.5).sub(1).expandDims(0);
    return m.model.predict(x).dataSync();
  });
  const all = m.labels.map((label, i) => ({ label: normalise(label), p: probs[i] }))
    .sort((a, b) => b.p - a.p);
  return all;
}

// Accept "Bacterial blight", "bacterial-blight" etc. from the model's labels.
function normalise(label) {
  return String(label).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function demoPredict(sev) {
  let top;
  if (!sev || sev.leafFraction < 0.08) top = ['other', 0.62];
  else if (sev.pct < 4) top = ['healthy', 0.9];
  else top = ['bacterial_blight', Math.min(0.95, 0.55 + sev.pct / 60)];
  const rest = ['healthy', 'bacterial_blight', 'leaf_curl', 'jassid_damage', 'other'].filter(l => l !== top[0]);
  const remaining = 1 - top[1];
  return [
    { label: top[0], p: top[1] },
    { label: rest[0], p: remaining * 0.6 },
    { label: rest[1], p: remaining * 0.25 },
    { label: rest[2], p: remaining * 0.1 },
    { label: rest[3], p: remaining * 0.05 }
  ];
}
