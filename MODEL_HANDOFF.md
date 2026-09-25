# Model handoff — what the app expects from a crop model

The app runs one disease model per crop, on the phone, with TensorFlow.js. This is the
contract the ML team's 24 September 2026 delivery follows; keep to it for every retrain
and a new model is a file copy, not a code change.

## 1. Where the files go

Drop the ML team's float32 export, exactly as delivered, into `ml/models/<crop>/`,
then run `node scripts/quantize-models.mjs`. It writes the float16 copy the app serves
into `public/model/<crop>/` (2× smaller; predictions within 0.3 points of float32 on
the demo photos — per-tensor uint8 was tried and rejected: it flipped 7 of 16 photos).

What the app serves, one folder per crop, named after the crop in lowercase:

```
public/model/<crop>/model.json
public/model/<crop>/group1-shard1of2.bin   (every shard model.json lists)
public/model/<crop>/group1-shard2of2.bin
public/model/<crop>/class_names.json
public/model/ATTRIBUTION.md                (dataset credits; ships with the models)
```

Crops the app knows today: `cotton`, `soybean`, `chickpea`, `sugarcane`
(`src/content/rules.js` → `CROPS`, flag `model: true`).

## 2. Format

| | |
|---|---|
| **Format** | TF.js **graph** model (`tensorflowjs_converter --output_format=tfjs_graph_model`) |
| **Input** | 224 × 224 × 3 RGB, raw **0–255** — MobileNetV2's `preprocess_input` is inside the graph, so the app does **not** rescale |
| **Output** | softmax, one unit per class |
| **Labels** | `class_names.json`: a JSON array, index *i* = output unit *i* |

The app feeds the model the **whole photo squashed to 224×224** (no centre crop), the same
way `image_dataset_from_directory` and `predict.py` resize training images. The browser
does that downscale on a canvas; Chrome filters a very large photo slightly differently
when the tab is hidden (software) than when it is visible (GPU), which can move a
borderline confidence by a few points. On a phone in use the page is visible, so results
are consistent.

## 3. Class names

`class_names.json` must list the classes in the order of the model's output units. Keras
`image_dataset_from_directory` sorts class folders alphabetically, so after a Kaggle/Colab
retrain regenerate the file from the folder names — never from `config.py`.

Every class name must exist for that crop in `src/content/ipm.js` (`IPM_BY_CROP`): that is
where the symptom text, the treatment ladder, the safe dose and the Marathi live. A class
the app doesn't know is treated as `other` and sent to the expert. **Adding a class means
adding its advice first** (sourced, never invented).

`other` is the reject class (soil, sky, hands, other plants). Cotton and chickpea currently
ship without one, so for them only the 70% confidence rule stands between a non-leaf photo
and a diagnosis.

## 4. The guard rails in the app

- **Label count check.** On load the app runs a blank image through the model and refuses a
  `class_names.json` whose length doesn't match the output width. It falls back to demo mode
  and shows *"Demo mode: the disease model for this crop has not loaded"* on the Scan screen.
- **70% confidence rule.** Below 0.7 top-1 confidence the app does not prescribe; the case goes
  to the KVK expert queue. An accurate but under-confident model makes the demo look broken, so
  judge a model by its confidence on correct predictions, not accuracy alone.

## 5. Caching and updates

Models are not in the install-time cache (4 crops ≈ 18 MB). The app loads the farmer's own crop
model when it opens, and the service worker keeps it for offline use (`vite.config.js`,
cache `models-v2`). **When you replace model files, bump that cache name** (`models-v3`), or
phones that already have the old files keep using them.

## 6. How the 24 September delivery checked out

Run in the browser, through the shipped web models and `class_names.json`, on the ML team's
own demo photos:

| Crop | Result |
|---|---|
| Soybean | 4/4 correct, 92–99.8% |
| Sugarcane | mosaic 81%, healthy 81%, `other` 95% correct; red rot read as healthy at 33% → expert queue |
| Chickpea | severe wilt 97%, healthy 96% correct; moderate wilt 56% → expert; noise image → healthy 78% (no `other` class) |
| Cotton | blight 88% correct; healthy leaf → blight 64% and leaf curl → healthy 65%, both → expert queue |

Label order is confirmed for soybean and sugarcane (sugarcane's `other` sits at index 2 and
catches the noise image, which only works with the shipped order). Cotton's web model is weaker
than the 95–98% in its `report.txt`: that report and confusion matrix, like chickpea's,
describe the *local* 5-/4-class models, not the shipped 3-class web models.

## 7. Wanted from the next retrain

1. Cotton: restore `jassid_damage` and add a real `other` class; publish the web model's own
   report, and run the web model (not the Keras one) on the demo photos.
2. Chickpea: ship the `other` class the local model already has.
3. Replace the synthetic `other` placeholders with real soil / sky / hand / weed photos.
4. After any change: regenerate `class_names.json`, bump the `models-vN` cache name.
