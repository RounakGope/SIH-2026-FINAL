# FasalRakshak: prototype app

A phone web app (PWA) for cotton farmers plus a staff page for KVK experts and district officers.
Built with React + Vite, Firebase (Firestore, Auth, Hosting), and a Teachable Machine model that runs on the phone.

- Farmer app: `/`: set up field → risk alerts → photograph leaves (offline) → IPM advice → progress
- Staff page: `/staff`: district dashboard with taluka map + expert review queue

## 1. Run it (5 minutes)

```bash
npm install
npm run dev          # opens on http://localhost:5173, and on your Wi-Fi IP for phones
```

With no Firebase keys it runs in **local demo mode**: everything works, but data stays in that one browser.
The farmer tab and `/staff` tab in the same browser still see each other's data, so the whole flow can be tried on one laptop.

## 2. Add the ML model

Copy `model.json`, `metadata.json` and `weights.bin` from Teachable Machine into `public/model/`.
Class names must be exactly: `healthy`, `bacterial_blight`, `leaf_curl`, `jassid_damage`, `other`.
Until then the app uses a DEMO predictor and shows a yellow banner on the Scan screen.

## 3. Connect Firebase (15 minutes, one person)

1. https://console.firebase.google.com → **Add project** (Google Analytics not needed).
2. **Build → Firestore Database → Create database** → production mode → region `asia-south1` (Mumbai).
3. **Build → Authentication → Get started** → enable **Anonymous** and **Email/Password**.
4. **Authentication → Users → Add user**: create the expert/officer login(s), e.g. `kvk.wardha@demo.in`.
5. **Project settings → Your apps → Web (</>)** → register app → copy the config values.
6. `cp .env.example .env` and paste the values in.
7. Install the CLI and deploy the security rules:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add          # pick your project
   firebase deploy --only firestore:rules
   ```
8. `npm run dev`, open `/staff`, log in, click **Load demo data**.

## 4. Put it on a phone (HTTPS is required for offline mode and the camera)

```bash
npm run deploy               # = vite build && firebase deploy
```
Open the `https://<project>.web.app` link on the phone → browser menu → **Add to Home screen / Install app**.
Open it once while online so everything is cached (model, fonts, forecast). After that it works in airplane mode.

## How offline works

- The app, the model and the fonts are precached by the service worker (`vite.config.js`).
- Scans are saved with Firestore's **offline cache** (`src/lib/firebase.js`). With no network the write stays on the phone.
  When the network returns it uploads by itself. The header pill shows `Offline · 2 waiting` → `Synced`.
- The last 5-day forecast is kept on the phone, and risk rules run on the phone.
- First launch must be online (anonymous sign-in needs the network once).

## Demo script (slide 19)

1. **Home**: tap **Demo data** under the trap chart → Pink bollworm **HIGH**, trap count above ETL.
2. Turn on **airplane mode**.
3. **Scan** → photograph a diseased leaf → disease, leaf %, plants infected, confidence.
4. Scroll: IPM ladder, safe use for your acres, cost vs value.
5. Photograph the unclear leaf → **Not sure. Sent to a KVK expert**. Pill shows `Offline · 1 waiting`.
6. Turn airplane mode off → pill flips to **Synced**.
7. Laptop `/staff` → **Review queue** → Confirm/Correct → the farmer's phone shows the expert note, and the map counts it.

Staff page: **Reset demo data** before each rehearsal.

## Where to change things

| What | File |
| --- | --- |
| Remedies, IPM steps, doses, sources, confidence threshold, ₹ figures | `src/content/ipm.js` (every `TODO` shows highlighted in the app) |
| Risk rules (pink bollworm ETL, weather rule, outbreak levels) | `src/content/rules.js` |
| Talukas and map positions | `src/content/talukas.js` |
| English / Marathi text | `src/lib/i18n.jsx` (Marathi needs a native speaker's check) |
| Screens | `src/farmer/*.jsx`, `src/staff/Staff.jsx` |
| Colours, fonts, shapes | `src/styles/organic.css` (design system, unchanged), `src/styles/app.css` |
| Demo data for the map | `src/staff/seed.js` |
| Firestore access rules | `firestore.rules` |

## Data

Firestore collection `cases`: one document per 10-plant walk:
`id, uid, district, taluka, crop, cropDay, stage, lat, lon (2 decimals ≈ 1 km), label, confidence, top3,
leafPct, plantsInfected, plantsWalked, photo (small JPEG), status, expert, createdAt`.
`status` is `auto` | `pending_review` | `confirmed` | `corrected` | `lab_referred`.

## Known limits (say so if judges ask)

- Leaf severity % is a colour-threshold lesion mask, not a second model; best with one leaf filling the frame.
- Taluka positions are approximate centres, not boundaries.
- Rupee figures are illustrative until real prices and the mandi rate are filled in.
- Photo diagnosis is cotton only; other crops show "coming next".
