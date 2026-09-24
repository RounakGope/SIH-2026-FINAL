// Wardha district talukas with APPROXIMATE centre coordinates (good enough for
// the demo map; swap for real boundaries later).
export const DISTRICT = 'Wardha';
export const DEFAULT_LOCATION = { lat: 20.74, lon: 78.6 };

export const TALUKAS = [
  { name: 'Wardha', mr: 'वर्धा', hi: 'वर्धा', lat: 20.745, lon: 78.602 },
  { name: 'Deoli', mr: 'देवळी', hi: 'देवली', lat: 20.648, lon: 78.481 },
  { name: 'Seloo', mr: 'सेलू', hi: 'सेलू', lat: 20.846, lon: 78.715 },
  { name: 'Arvi', mr: 'आर्वी', hi: 'आर्वी', lat: 20.99, lon: 78.227 },
  { name: 'Ashti', mr: 'आष्टी', hi: 'आष्टी', lat: 21.203, lon: 78.186 },
  { name: 'Karanja', mr: 'कारंजा', hi: 'कारंजा', lat: 21.123, lon: 78.4 },
  { name: 'Hinganghat', mr: 'हिंगणघाट', hi: 'हिंगणघाट', lat: 20.548, lon: 78.839 },
  { name: 'Samudrapur', mr: 'समुद्रपूर', hi: 'समुद्रपुर', lat: 20.65, lon: 78.97 }
];

// Taluka name in the app's language.
export const talukaName = (name, lang) => TALUKAS.find(t => t.name === name)?.[lang] || name;

export function nearestTaluka(lat, lon) {
  let best = TALUKAS[0], bestD = Infinity;
  for (const t of TALUKAS) {
    const d = (t.lat - lat) ** 2 + ((t.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < bestD) { bestD = d; best = t; }
  }
  return best.name;
}
