// Where a farmer takes a sample. Contact details are only what the institution
// publishes itself; where no phone is listed here, none was verified.
//
// KVK Selsura: kvkselsura.pdkv.ac.in (Contact Us page) — coordinates, phones, email.
// Other institutes: coordinates are approximate (campus town), for distance only.
export const KVKS = [
  {
    id: 'kvk-wardha', name: 'Krishi Vigyan Kendra, Selsura (Wardha)',
    org: 'Dr. Panjabrao Deshmukh Krishi Vidyapeeth, Akola',
    address: 'Selsura, Wardha–Yavatmal road, Dist. Wardha', lat: 20.67515, lon: 78.53082,
    phones: ['9970070944', '9970073165'], email: 'kvk.wardha@gmail.com', web: 'https://kvkselsura.pdkv.ac.in'
  }
];

// Plant-pathology labs. `crops` = the crops each is the natural referral for.
export const LABS = [
  { id: 'pdkv', name: 'Dept. of Plant Pathology, Dr. PDKV', address: 'Krishinagar, Akola', lat: 20.70, lon: 77.03, web: 'https://www.pdkv.ac.in', crops: ['Cotton', 'Soybean', 'Chickpea', 'Tur'] },
  { id: 'cicr', name: 'ICAR-Central Institute for Cotton Research', address: 'Nagpur', lat: 21.04, lon: 79.05, web: 'https://cicr.org.in', crops: ['Cotton'] },
  { id: 'vsi', name: 'Vasantdada Sugar Institute', address: 'Manjari (Bk.), Pune', lat: 18.51, lon: 73.98, web: 'https://www.vsisugar.com', crops: ['Sugarcane'] },
  { id: 'mpkv', name: 'Mahatma Phule Krishi Vidyapeeth', address: 'Rahuri, Ahilyanagar', lat: 19.39, lon: 74.65, web: 'https://mpkv.ac.in', crops: ['Sugarcane', 'Chickpea', 'Soybean', 'Grape'] },
  { id: 'vnmkv', name: 'Vasantrao Naik Marathwada Krishi Vidyapeeth', address: 'Parbhani', lat: 19.26, lon: 76.78, web: 'https://vnmkv.ac.in', crops: ['Soybean', 'Cotton', 'Tur', 'Chickpea'] }
];

export function distanceKm(aLat, aLon, bLat, bLon) {
  const r = Math.PI / 180, dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// Nearest KVK, and the nearest lab that handles this crop.
export function referralFor(crop, lat, lon) {
  const withKm = x => ({ ...x, km: Math.round(distanceKm(lat, lon, x.lat, x.lon)) });
  const kvk = KVKS.map(withKm).sort((a, b) => a.km - b.km)[0];
  const lab = LABS.filter(l => l.crops.includes(crop)).map(withKm).sort((a, b) => a.km - b.km)[0];
  return { kvk, lab };
}
