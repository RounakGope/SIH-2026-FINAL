// A stand-in for a field sensor node (leaf-wetness + soil-moisture probe): posts
// readings to the API exactly as the hardware would, with its device key.
//
//   node sensor-sim.mjs <plot code> [--api http://localhost:8080/api] [--key dev-sensor-key] [--every 30]
//
// The plot code is shown in the app under Settings → "Code to pair a field sensor".
// It backfills the last 24 hours, then sends a reading every --every minutes.
// Readings are marked device: 'simulator', so the app labels them as simulated.
//
// Pattern: a plain day-night cycle (cool humid nights with dew on the leaves, hot dry
// afternoons, soil slowly drying), the same as src/lib/sensorSim.js. It is not a
// forecast of anything.

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
const plotId = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const API = opt('api', process.env.API_URL || 'http://localhost:8080/api').replace(/\/$/, '');
const KEY = opt('key', process.env.SENSOR_KEY || 'dev-sensor-key');
const EVERY = +opt('every', 30);
if (!plotId) {
  console.error('usage: node sensor-sim.mjs <plot code> [--api URL] [--key DEVICE_KEY] [--every MINUTES]');
  process.exit(2);
}

function reading(at, soil, stepMin) {
  const d = new Date(at), h = d.getHours() + d.getMinutes() / 60;
  const day = Math.sin(((h - 9) / 24) * 2 * Math.PI);           // +1 mid-afternoon, -1 before dawn
  const rh = Math.round(78 - 18 * day + (Math.random() - 0.5) * 4);
  const tempC = Math.round((25 + 7 * day + (Math.random() - 0.5)) * 10) / 10;
  const leafWetness = rh >= 90 ? 1 : rh >= 86 ? 0.5 : 0;          // dew forms near saturation
  return { plotId, at, rh, tempC, leafWetness, soilMoisture: Math.round(soil * 10) / 10, device: 'simulator', stepMin };
}

async function post(r) {
  const res = await fetch(API + '/sensors/readings', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Key': KEY }, body: JSON.stringify(r)
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

let soil = 34;
const STEP = 30;
try {
  for (let i = 24 * 60 / STEP; i > 0; i--) { soil -= 0.08; await post(reading(Date.now() - i * STEP * 60000, soil, STEP)); }
} catch (e) {
  console.error(`the API did not take the reading (${e.message}). Check --api, and that --key matches the server's SENSOR_KEY.`);
  process.exitCode = 1;
}
if (!process.exitCode) console.log(`sent 24 h of readings for plot ${plotId} to ${API}; now one every ${EVERY} min (Ctrl+C to stop)`);
if (!process.exitCode) setInterval(() => {
  soil -= 0.08 * EVERY / STEP;
  const r = reading(Date.now(), soil, EVERY);
  post(r).then(() => console.log(new Date().toLocaleTimeString(), `rh ${r.rh}%  leaf wet ${r.leafWetness}  soil ${r.soilMoisture}%`))
    .catch(e => console.warn('send failed, will retry next reading:', e.message));
}, EVERY * 60000);
