// Quantises the ML team's float32 crop models (ml/models/<crop>/, exactly as
// delivered) into the files the app serves (public/model/<crop>/).
//
//   node scripts/quantize-models.mjs            float16: 2x smaller, near-lossless (default)
//   node scripts/quantize-models.mjs uint8      4x smaller, NOT recommended
//
// TF.js reads the `quantization` entry in model.json and restores float32 on load,
// so the app needs no code change. Measured on the ML team's 16 demo photos:
// float16 stays within 0.3 points of float32; per-tensor uint8 changed 7 of 16
// predictions, several of them confidently wrong. Use float16.
//
// After changing the served files, bump the `models-vN` cache name in vite.config.js.
import { readFileSync, writeFileSync, readdirSync, unlinkSync, copyFileSync } from 'fs';
import { join } from 'path';

const mode = process.argv[2] || 'float16';
if (!['uint8', 'float16'].includes(mode)) throw new Error('mode must be uint8 or float16');
const SRC = 'ml/models';
const OUT = 'public/model';
const CROPS = ['cotton', 'soybean', 'sugarcane', 'chickpea'];
const SHARD = 4 * 1024 * 1024;

function toHalf(f) {
  // IEEE 754 float32 -> float16 bits, round to nearest.
  const b = new DataView(new ArrayBuffer(4)); b.setFloat32(0, f);
  const x = b.getUint32(0);
  const sign = (x >>> 16) & 0x8000, exp = ((x >>> 23) & 0xff) - 127 + 15, mant = x & 0x7fffff;
  if (exp <= 0) return sign;                          // underflow -> signed zero
  if (exp >= 31) return sign | 0x7c00;                // overflow -> inf
  let h = sign | (exp << 10) | (mant >>> 13);
  if (mant & 0x1000) h++;                             // round
  return h;
}

for (const crop of CROPS) {
  const src_dir = join(SRC, crop), dir = join(OUT, crop);
  const model = JSON.parse(readFileSync(join(src_dir, 'model.json'), 'utf8'));
  const specs = model.weightsManifest.flatMap(g => g.weights);
  const src = Buffer.concat(model.weightsManifest.flatMap(g => g.paths.map(p => readFileSync(join(src_dir, p)))));

  const parts = [];
  const outSpecs = [];
  let off = 0;
  for (const w of specs) {
    const n = w.shape.reduce((a, b) => a * b, 1);
    const bytes = (w.dtype === 'float32' || w.dtype === 'int32') ? 4 * n : null;
    if (bytes == null) throw new Error(`unexpected dtype ${w.dtype} in ${crop}`);
    const raw = src.subarray(off, off + bytes); off += bytes;
    if (w.dtype !== 'float32') { parts.push(raw); outSpecs.push({ name: w.name, shape: w.shape, dtype: w.dtype }); continue; }
    const f = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + bytes));
    if (mode === 'float16') {
      const h = new Uint16Array(n); for (let i = 0; i < n; i++) h[i] = toHalf(f[i]);
      parts.push(Buffer.from(h.buffer));
      outSpecs.push({ name: w.name, shape: w.shape, dtype: 'float32', quantization: { dtype: 'float16', original_dtype: 'float32' } });
    } else {
      let min = Infinity, max = -Infinity; for (const v of f) { if (v < min) min = v; if (v > max) max = v; }
      const scale = max > min ? (max - min) / 255 : 1;
      const q = new Uint8Array(n); for (let i = 0; i < n; i++) q[i] = Math.round((f[i] - min) / scale);
      parts.push(Buffer.from(q.buffer));
      outSpecs.push({ name: w.name, shape: w.shape, dtype: 'float32', quantization: { dtype: 'uint8', min, scale, original_dtype: 'float32' } });
    }
  }
  if (off !== src.length) throw new Error(`${crop}: read ${off} of ${src.length} weight bytes`);

  const all = Buffer.concat(parts);
  for (const f of readdirSync(dir)) if (f.endsWith('.bin')) unlinkSync(join(dir, f)); // old shards
  copyFileSync(join(src_dir, 'class_names.json'), join(dir, 'class_names.json'));
  const paths = [];
  const nShards = Math.max(1, Math.ceil(all.length / SHARD));
  for (let i = 0; i < nShards; i++) {
    const p = `group1-shard${i + 1}of${nShards}.bin`;
    writeFileSync(join(dir, p), all.subarray(i * SHARD, (i + 1) * SHARD));
    paths.push(p);
  }
  const out = { ...model, weightsManifest: [{ paths, weights: outSpecs }] };
  writeFileSync(join(dir, 'model.json'), JSON.stringify(out));
  console.log(`${crop}: ${(src.length / 1e6).toFixed(1)} MB float32 -> ${(all.length / 1e6).toFixed(1)} MB ${mode} (${nShards} shard${nShards > 1 ? 's' : ''})`);
}
