// Field-sensor SIMULATOR, for demos without hardware. A real leaf-wetness / soil
// probe posts the same readings to the API (POST /api/sensors/readings); this
// writes them locally instead, clearly marked device: 'simulator'.
//
// Pattern: a plain day-night cycle — cool, humid nights with dew on the leaves,
// hot dry afternoons, soil slowly drying. It is not a forecast of anything.
import { pushSensorReading } from './store';

const STEP_MIN = 30;
function reading(at, soil) {
  const h = new Date(at).getHours() + new Date(at).getMinutes() / 60;
  const day = Math.sin(((h - 9) / 24) * 2 * Math.PI);           // +1 mid-afternoon, -1 before dawn
  const rh = Math.round(78 - 18 * day + (Math.random() - 0.5) * 4);
  const tempC = Math.round((25 + 7 * day + (Math.random() - 0.5)) * 10) / 10;
  const leafWetness = rh >= 90 ? 1 : rh >= 86 ? 0.5 : 0;          // dew forms near saturation
  return { at, rh, tempC, leafWetness, soilMoisture: Math.round(soil * 10) / 10, device: 'simulator', stepMin: STEP_MIN };
}

const timers = {};
export function startSensorSim(plotId) {
  if (timers[plotId]) return;
  // Backfill the last 24 hours so the card has something to show straight away.
  let soil = 34;
  for (let i = 48; i > 0; i--) { soil -= 0.08; pushSensorReading(plotId, reading(Date.now() - i * STEP_MIN * 60000, soil)); }
  timers[plotId] = setInterval(() => { soil -= 0.08; pushSensorReading(plotId, reading(Date.now(), soil)); }, STEP_MIN * 60000);
}
export function stopSensorSim(plotId) { clearInterval(timers[plotId]); delete timers[plotId]; }

// Hours the leaves were wet in the last 24 h, from any sensor's readings.
export function wetHours(readings) {
  const since = Date.now() - 24 * 3600000;
  return Math.round(readings.filter(r => r.at >= since).reduce((s, r) => s + r.leafWetness * (r.stepMin || 5) / 60, 0) * 10) / 10;
}
