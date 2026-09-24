# Dataset attribution and licensing

FasalRakshak models are trained on third-party public datasets. Several are
published under **Creative Commons Attribution 4.0 (CC BY 4.0)**, which legally
requires attribution to the original authors.

**Action required:** reproduce the credits below in the app's About / Credits
screen, and keep this file with the model package.

---

## Cotton

**Mendeley Data — SAR-CLD-2024 (primary cotton source)**
- Title: *SAR-CLD-2024: A Comprehensive Dataset for Cotton Leaf Disease Detection*
- Authors: Prayma Bishshash, Md Asraful Sharker Nirob, Md. Habibur Shikder, Afjal Sarower
- Institution: Daffodil International University
- Published: 13 August 2024 · Version 2
- DOI: [10.17632/b3jy2p6k8w.2](https://doi.org/10.17632/b3jy2p6k8w.2)
- License: **CC BY 4.0** — attribution required
- Used: 2 137 original images. Class mapping: Healthy Leaf → `healthy`,
  Bacterial Blight → `bacterial_blight`, Curl Virus → `leaf_curl`,
  Leaf Hopper Jassids → `jassid_damage`. Herbicide Growth Damage, Leaf Redding
  and Leaf Variegation were **excluded** as out-of-scope. The 7 000 pre-augmented
  copies were deliberately **not** used to avoid near-duplicate leakage.

**Kaggle — cotton-leaf-disease-dataset (supplementary cotton source)**
- Author: Noon, Serosh Karim et al.
- Citation: *"Computationally Light Deep Learning Framework to Recognize Cotton
  Leaf Diseases"*, 1 January 2021, pp. 1–16
- URL: <https://www.kaggle.com/datasets/seroshkarim/cotton-leaf-disease-dataset>
- Images: 1 711 (healthy, bacterial blight, curl virus, fusarium wilt)
- License: **not stated by the publisher.** Fusarium wilt was excluded as
  out-of-scope. Treat as research use and verify terms before commercial release.

---

## Chickpea

**Kaggle — Fusarium Wilt Disease in Chickpea Dataset**
- Author: Tolga Hayit et al.
- Published references: Hayit et al., *European Journal of Plant Pathology* (2023);
  Hayit et al., *Journal of Plant Pathology* (2023)
- URL: <https://www.kaggle.com/datasets/tolgahayit/fusarium-wilt-disease-in-chickpea-dataset>
- Images: 4 339 originals, plus a 15 000-image pre-augmented set which was **not** used
- Regrouping applied: grades 1 (HR) + 3 (R) → `healthy` (2 136);
  5 (MR) → `wilt_moderate` (1 133); 7 (S) + 9 (HS) → `wilt_severe` (1 070)
- License: **not stated by the publisher.** Verify terms before commercial release.

---

## Soybean

**Mendeley Data — Multi-Class Soybean Leaf Disease Dataset**
- Authors: Madhuri Thorwat, Pranali Magdum, Shweta Jadhav, Anushka Sutar, Riya Oswal
- Published: 26 May 2026 · Version 2
- DOI: [10.17632/6fhphxg297.2](https://doi.org/10.17632/6fhphxg297.2)
- License: **CC BY 4.0** — attribution required
- Images: 499 (Bacterial Blight 99, Cercospora Leaf Blight 99, Healthy 97,
  Rust 99, Sudden Death Syndrome 105)
- Known issue: this dataset is recent and lightly validated; class-level label
  quality has not been independently audited.

---

## Sugarcane

**Mendeley Data — Sugarcane Leaf Disease Dataset**
- Authors: Swapnil Daphal, Sanjay Koli
- Institution: Savitribai Phule Pune University
- Published: 19 August 2022 · Version 1
- DOI: [10.17632/9424skmnrk.1](https://doi.org/10.17632/9424skmnrk.1)
- License: **CC BY 4.0** — attribution required
- Images: 2 521 after extraction, collected in Maharashtra with smartphones
  (Healthy 522, RedRot 518, Rust 514, Mosaic 462, Yellow 505)

---

## Third-party libraries

| Component | License |
|---|---|
| TensorFlow 2.15.0 | Apache License 2.0 |
| TensorFlow.js converter 4.17.0 | Apache License 2.0 |
| MobileNetV2 backbone (ImageNet weights) | TensorFlow Hub / Apache 2.0 distribution |
| scikit-learn 1.4.2 | BSD-3-Clause |
| NumPy 1.26.4 | BSD-3-Clause |
| Matplotlib 3.8.4 | PSF-based (Matplotlib License) |
| Pillow 10.3.0 | MIT-CMU |

The MobileNetV2 ImageNet-pretrained backbone is itself trained on
ImageNet (ILSVRC 2012). For commercial deployment, review the current
ImageNet terms — academic-use conditions have applied historically.

---

## Suggested credits text for the app

> Leaf disease models trained by the FasalRakshak ML team on publicly available
> datasets: SAR-CLD-2024 (Daffodil International University, CC BY 4.0),
> Multi-Class Soybean Leaf Disease Dataset (CC BY 4.0), Sugarcane Leaf Disease
> Dataset (Savitribai Phule Pune University, CC BY 4.0), and Kaggle datasets by
> Serosh Karim and Tolga Hayit. Backbone: MobileNetV2 (ImageNet, Apache 2.0).
