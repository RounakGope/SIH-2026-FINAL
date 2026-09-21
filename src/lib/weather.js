// 5-day forecast from Open-Meteo (free, no API key). The last good forecast is
// kept on the phone so the risk card still works offline.
const KEY = 'fr_weather';

export async function getWeather(lat, lon) {
  const cached = readCache();
  const fresh = cached && cached.lat === lat && cached.lon === lon && Date.now() - cached.at < 3 * 3600 * 1000;
  if (fresh || !navigator.onLine) return cached;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      '&hourly=relative_humidity_2m&daily=precipitation_sum,temperature_2m_max,temperature_2m_min' +
      '&forecast_days=5&timezone=Asia%2FKolkata';
    const r = await fetch(url);
    if (!r.ok) throw new Error('weather ' + r.status);
    const j = await r.json();
    const days = j.daily.time.map((date, i) => {
      const hours = j.hourly.relative_humidity_2m.slice(i * 24, i * 24 + 24).filter(v => v != null);
      return {
        date,
        rain: j.daily.precipitation_sum[i] ?? 0,
        tMax: j.daily.temperature_2m_max[i],
        tMin: j.daily.temperature_2m_min[i],
        rhMean: hours.length ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : null
      };
    });
    const w = { lat, lon, at: Date.now(), days };
    try { localStorage.setItem(KEY, JSON.stringify(w)); } catch {}
    return w;
  } catch (e) {
    console.warn('weather fetch failed, using cache', e);
    return cached;
  }
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
