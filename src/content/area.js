// Farm size in the unit the farmer thinks in. Everything that computes with it
// (spray tanks, insurance, crop value, reports) works in acres.
export const AREA_UNITS = {
  acre: { acres: 1, en: 'acres', mr: 'एकर', hi: 'एकड़' },
  hectare: { acres: 2.4710538, en: 'hectares', mr: 'हेक्टर', hi: 'हेक्टेयर' },
  guntha: { acres: 1 / 40, en: 'guntha', mr: 'गुंठे', hi: 'गुंठा' },
  sqft: { acres: 1 / 43560, en: 'sq ft', mr: 'चौ. फूट', hi: 'वर्ग फुट' },
  sqyd: { acres: 1 / 4840, en: 'sq yards', mr: 'चौ. यार्ड', hi: 'वर्ग गज' },
  sqm: { acres: 1 / 4046.8564, en: 'sq metres', mr: 'चौ. मीटर', hi: 'वर्ग मीटर' }
};

export const toAcres = (value, unit) => value * (AREA_UNITS[unit] || AREA_UNITS.acre).acres;

// The farmer's own figure, e.g. "2 acres" or "80 गुंठे". Plots saved before units
// existed only have acres.
export function areaLabel(farm, lang = 'en') {
  const unit = AREA_UNITS[farm.areaUnit] || AREA_UNITS.acre;
  const value = +(farm.area ?? farm.acres);
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit[lang] || unit.en}`;
}
