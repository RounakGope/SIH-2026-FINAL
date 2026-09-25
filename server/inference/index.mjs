// Server-side re-verification ("two-tier inference").
//
// The phone runs the float16 model on one view of the photo. This service runs the
// ML team's full-precision float32 model (ml/models/<crop>, exactly as delivered)
// with test-time augmentation — the photo, its mirror image and a centre crop,
// probabilities averaged — and the API compares the result with the phone's.
//
//   POST /verify  { crop: "cotton", image: "data:image/jpeg;base64,..." }
//     -> { label, p, probs: {label: p}, model: "cotton-float32-tta3" }
//   GET  /health
//
// Pure JavaScript TensorFlow (CPU): no native build, runs anywhere Node does.
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tf from '@tensorflow/tfjs';
import jpeg from 'jpeg-js';

const ROOT = process.env.MODELS_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'ml', 'models');
const PORT = +(process.env.PORT || 8090);
const SIZE = 224;
const models = new Map();

async function load(crop) {
  if (models.has(crop)) return models.get(crop);
  const dir = join(ROOT, crop);
  if (!/^[a-z]+$/.test(crop) || !existsSync(join(dir, 'model.json'))) throw Object.assign(new Error(`no model for ${crop}`), { status: 404 });
  const p = (async () => {
    const mj = JSON.parse(readFileSync(join(dir, 'model.json'), 'utf8'));
    const weightData = Buffer.concat(mj.weightsManifest.flatMap(g => g.paths.map(f => readFileSync(join(dir, f)))));
    const model = await tf.loadGraphModel(tf.io.fromMemory({
      modelTopology: mj.modelTopology, weightSpecs: mj.weightsManifest.flatMap(g => g.weights),
      weightData: weightData.buffer.slice(weightData.byteOffset, weightData.byteOffset + weightData.byteLength)
    }));
    const labels = JSON.parse(readFileSync(join(dir, 'class_names.json'), 'utf8'));
    return { model, labels };
  })();
  models.set(crop, p);
  return p;
}

function decode(image) {
  const b64 = String(image).replace(/^data:image\/\w+;base64,/, '');
  const { width, height, data } = jpeg.decode(Buffer.from(b64, 'base64'), { useTArray: true, maxMemoryUsageInMB: 256 });
  return tf.tidy(() => tf.tensor3d(data, [height, width, 4], 'int32').slice([0, 0, 0], [height, width, 3]).toFloat());
}

// The three views, each squashed to 224×224 like training (raw 0–255: the model
// does its own MobileNetV2 preprocessing).
function views(img) {
  return tf.tidy(() => {
    const [h, w] = img.shape;
    const full = tf.image.resizeBilinear(img, [SIZE, SIZE]);
    const mirror = tf.reverse(full, 1);
    const ch = Math.round(h * 0.85), cw = Math.round(w * 0.85);
    const crop = tf.image.resizeBilinear(img.slice([Math.floor((h - ch) / 2), Math.floor((w - cw) / 2), 0], [ch, cw, 3]), [SIZE, SIZE]);
    return tf.stack([full, mirror, crop]);
  });
}

async function verify(crop, image) {
  const { model, labels } = await load(crop);
  const img = decode(image);
  const probs = tf.tidy(() => model.predict(views(img)).mean(0).dataSync());
  img.dispose();
  const all = Object.fromEntries(labels.map((l, i) => [l, Math.round(probs[i] * 10000) / 10000]));
  const best = labels.reduce((a, l, i) => probs[i] > probs[labels.indexOf(a)] ? l : a, labels[0]);
  return { label: best, p: all[best], probs: all, model: `${crop}-float32-tta3` };
}

const server = http.createServer(async (req, res) => {
  const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  try {
    if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true, backend: tf.getBackend(), loaded: [...models.keys()] });
    if (req.method !== 'POST' || req.url !== '/verify') return send(404, { error: 'not found' });
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 12e6) return send(413, { error: 'too large' }); }
    const { crop, image } = JSON.parse(body);
    const t0 = Date.now();
    const out = await verify(String(crop).toLowerCase(), image);
    console.log(`verify ${crop}: ${out.label} ${out.p} (${Date.now() - t0} ms)`);
    send(200, out);
  } catch (e) {
    console.warn('verify failed:', e.message);
    send(e.status || 400, { error: e.message });
  }
});

await tf.setBackend('cpu');
server.listen(PORT, () => console.log(`inference service on :${PORT}, models from ${ROOT}`));
