# Model handoff — what the app needs from you

**Deadline: prototype submission 24 September 2026.**

The app is finished and already runs. It currently uses a fake "DEMO" predictor that guesses from leaf colour. Your job is to replace it. **You do not need to write or change any app code** — you drop three files into one folder and the app picks them up.

Everything below is the contract. If your export matches it, integration takes five minutes. If it doesn't, it turns into a conversion job we don't have time for, so please read the **Six ways this breaks** section before you export.

---

## 1. What to deliver

Three files, into `public/model/`:

```
public/model/model.json
public/model/metadata.json
public/model/weights.bin
```

That's it. Replace the `PUT_MODEL_HERE.txt` placeholder that's sitting there now.

If your converter splits the weights into shards (`group1-shard1of3.bin`, `group1-shard2of3.bin`, …) instead of a single `weights.bin`, **copy all the shards too** — `model.json` references them by name and the load fails if any are missing.

---

## 2. The five classes — exact names, exact order

```
healthy
bacterial_blight
leaf_curl
jassid_damage
other
```

These are not arbitrary labels. Each one is a key into the app's IPM advice content (`src/content/ipm.js`) — the symptom description, the treatment ladder, the safe dose and the Marathi translation are all written against these five names. A class that isn't in this list has no advice attached to it.

**Casing and separators are forgiving.** The app normalises labels — lowercases them and turns spaces and hyphens into underscores. So `Bacterial Blight`, `bacterial-blight` and `bacterial_blight` all land correctly. Don't stress about that part.

**Order is not forgiving.** The app pairs your model's output probabilities to labels *by index*:

```js
m.labels.map((label, i) => ({ label, p: probs[i] }))
```

So the order of `labels` in `metadata.json` must match the order of your model's output units. Teachable Machine handles this automatically. If you're exporting from your own Keras training script, this is the single easiest thing to get silently wrong — a shuffled label list produces a model that loads fine, runs fine, and is confidently wrong about everything.

### What `other` is for

`other` is a deliberate reject class, not a dumping ground. When the app predicts `other` it stops, refuses to prescribe anything, and routes the case to the KVK expert queue.

Train it on: blurry shots, soil, hands, sky, non-leaf objects, and diseases outside the other four. A farmer photographing their shoe should land here, not on `bacterial_blight` at 80%.

---

## 3. Input and output shape

| | |
|---|---|
| **Input size** | 224 × 224 × 3 (RGB) |
| **Input range** | `[-1, 1]` — i.e. `pixel / 127.5 - 1` |
| **Output** | Softmax, 5 units, summing to 1 |
| **Format** | TensorFlow.js **Layers** model |

The app feeds you a centre-square crop of the photo, resized to 224. It does *not* do background removal, leaf segmentation or colour correction — what the camera saw is what you get.

If you train at a size other than 224, set `"imageSize"` in `metadata.json` and the app will use that instead. Keep the `[-1, 1]` scaling either way — that one is hardcoded.

### `metadata.json` minimum

```json
{
  "labels": ["healthy", "bacterial_blight", "leaf_curl", "jassid_damage", "other"],
  "imageSize": 224
}
```

Teachable Machine writes extra fields alongside these; they're harmless, leave them in.

---

## 4. The easiest path: Teachable Machine

The app was built against Teachable Machine's export, so this route needs zero thought:

1. [teachablemachine.withgoogle.com](https://teachablemachine.withgoogle.com) → **Image Project** → **Standard image model**
2. Create exactly five classes, named as above
3. Upload training images into each
4. **Train Model**
5. **Export Model** → **TensorFlow.js** tab → **Download my model**
6. Unzip → you get `model.json`, `metadata.json`, `weights.bin` → drop all three into `public/model/`

Teachable Machine already outputs 224px, `[-1, 1]` scaling, softmax and a Layers model. Nothing to configure.

### If you're training your own model in Keras instead

Fine — but you must convert to **Layers** format, not Graph format:

```bash
pip install tensorflowjs

tensorflowjs_converter \
  --input_format=keras \
  --output_format=tfjs_layers_model \
  model.h5 \
  public/model/
```

Then hand-write `metadata.json` yourself (see the minimum above) — the converter doesn't produce one.

`--output_format=tfjs_graph_model` will **not** work. See trap 1 below.

---

## 5. Accuracy bar that actually matters

The app does not prescribe treatment below **70% top-1 confidence** (`THRESHOLD = 0.7` in `src/content/ipm.js`). Below that it says it's unsure and sends the case to the expert review queue.

This is a deliberate safety decision and we're not lowering it — wrong pesticide advice costs a farmer money and damages soil. But it has a practical consequence for you:

> **A model that's technically accurate but under-confident will make the live demo look broken.** If your softmax hovers at 55–65% on correct predictions, every scan routes to the expert queue and the judges never see a diagnosis.

So when you're evaluating, don't just look at accuracy — look at **the confidence distribution on correct predictions**. We want the correct class landing comfortably above 0.7 on a clean field photo. If heavy augmentation or label smoothing is flattening your softmax, ease off.

### On training data

Per the project plan, we're building on PlantVillage and PlantDoc. Worth knowing:

- **PlantVillage is lab imagery** — single leaf, uniform background, studio lighting. A model trained only on it tends to collapse on real field photos.
- **PlantDoc is field imagery** — messier, and much closer to what the app will actually receive.

Train with heavy augmentation (rotation, blur, brightness, shadow, partial occlusion) and, if you can, **hold out a field-image test set rather than a PlantVillage split**. The number that matters is accuracy on a phone photo taken in a crop at midday, not validation accuracy on clean lab images.

---

## 6. Six ways this breaks

These all produce a model that *looks* fine to you and fails in the app. Worth thirty seconds each.

**1. Graph model instead of Layers model.** The app calls `tf.loadLayersModel()`. A `tfjs_graph_model` export throws on load. → Use `--output_format=tfjs_layers_model`.

**2. Missing weight shards.** `model.json` names its weight files. Copy every `.bin` the export produced, not just the first.

**3. Label order scrambled.** Loads clean, predicts confidently, wrong every time. → Verify `metadata.json` label order matches your training class index order (`train_generator.class_indices` in Keras).

**4. Wrong input scaling.** If you trained on `[0, 1]` or ImageNet mean-subtraction, predictions will be garbage — the app hardcodes `[-1, 1]`. → Train on `[-1, 1]`, or tell me and I'll change the one line.

**5. Extra or renamed classes.** Unknown labels don't crash — they silently fall through to `other` and get routed to the expert queue forever. So a sixth class isn't an error you'll see, it's just dead weight. → Stick to the five, or tell me first so I can write the IPM content for the new one.

**6. The failure is silent.** This is the big one. If *any* of the above goes wrong, the app doesn't error — it quietly falls back to the DEMO predictor and carries on. You can hand over a broken export and nobody notices until the demo. **Always run the verification below.**

---

## 7. Verify it before you hand it over

Two minutes, and it's the difference between a working demo and a bad surprise on the 24th.

```bash
npm install
npm run dev
```

Open the app → go to **Scan** → take or upload a leaf photo. Then check both of these:

- ✅ **The orange "demo model" banner is GONE.** If you can still see it, your model did not load and the app is faking the result.
- ✅ **The browser console has no `Real model not found, using DEMO predictor:` warning.** Open DevTools with F12. That warning line also tells you *why* it failed — missing file, bad format, etc.

If the banner is gone and the console is clean, the model is genuinely running on-device. Then sanity-check a few predictions:

- A clearly healthy leaf → `healthy`, above 70%
- A clearly blighted leaf → `bacterial_blight`, above 70%
- A photo of your hand or the floor → `other`

---

## 8. Send it back however you like

Zip the three files and send them over, or push to a branch if you've got repo access. If anything above doesn't fit how you trained the model, **tell me before the 23rd** — most mismatches are a one-line change on my side, but only if I know about them in time.

Questions on any of this, just ask.
