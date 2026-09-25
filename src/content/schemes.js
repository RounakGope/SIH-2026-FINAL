// Government schemes a farmer can use around a diagnosis, with the arithmetic.
// Every rate here is published (see SOURCES); anything the app can't know (sum
// insured, shop prices, yield) is entered by the farmer.

// Price floor for valuing the crop: MSP / FRP, ₹ per quintal.
export const PRICE = {
  Cotton: { rs: 7710, basis: 'MSP 2025-26, medium staple (long staple ₹8,110)' },
  Soybean: { rs: 5328, basis: 'MSP 2025-26, yellow' },
  Chickpea: { rs: 5875, basis: 'MSP rabi marketing season 2026-27, gram' },
  Sugarcane: { rs: 355, basis: 'FRP 2025-26 at 10.25% recovery' }
};

// PMFBY farmer premium, as a share of the sum insured: kharif food and oilseed
// crops 2%, rabi 1.5%, annual commercial or horticultural crops 5%.
// Maharashtra withdrew its ₹1 premium scheme in 2025, so the standard share applies.
export const PMFBY = {
  Cotton: { share: 5, season: 'kharif', why: 'annual commercial crop' },
  Sugarcane: { share: 5, season: 'annual', why: 'annual commercial crop' },
  Soybean: { share: 2, season: 'kharif', why: 'kharif oilseed' },
  Chickpea: { share: 1.5, season: 'rabi', why: 'rabi pulse' },
  Tur: { share: 2, season: 'kharif', why: 'kharif pulse' },
  Grape: { share: 5, season: 'annual', why: 'horticultural crop' }
};

// Enrolment cut-offs are notified by the state each season; these are the usual dates.
export const DEADLINES = [
  { id: 'pmfby-kharif', season: 'kharif', month: 7, day: 31, label: { en: 'PMFBY kharif enrolment closes', mr: 'PMFBY खरीप नोंदणीची शेवटची तारीख', hi: 'PMFBY खरीफ़ नामांकन की आखिरी तारीख' } },
  { id: 'pmfby-rabi', season: 'rabi', month: 12, day: 15, label: { en: 'PMFBY rabi enrolment closes', mr: 'PMFBY रब्बी नोंदणीची शेवटची तारीख', hi: 'PMFBY रबी नामांकन की आखिरी तारीख' } }
];

export const SOURCES = {
  pmfby: 'PMFBY operational guidelines (pmfby.gov.in); Maharashtra ₹1 premium withdrawn in 2025',
  kcc: 'Modified Interest Subvention Scheme (PIB, May 2025): 7% up to ₹3 lakh, 3% prompt-repayment incentive',
  pmkisan: 'PM-KISAN (pmkisan.gov.in): ₹6,000 a year in three instalments',
  smam: 'Sub-Mission on Agricultural Mechanization: 50% for SC/ST, small and marginal, women farmers; 40% for others',
  price: 'MSP 2025-26 kharif and 2026-27 rabi (Cabinet / CACP); sugarcane FRP 2025-26'
};

const HA_PER_ACRE = 0.4047;

// Next PMFBY cut-off for this crop's season, with days left.
export function nextDeadline(crop, today = new Date()) {
  const season = PMFBY[crop]?.season;
  const list = DEADLINES.filter(d => season === 'annual' || d.season === season);
  let best = null;
  for (const d of list) {
    let when = new Date(today.getFullYear(), d.month - 1, d.day, 23, 59);
    if (when < today) when = new Date(today.getFullYear() + 1, d.month - 1, d.day, 23, 59);
    const days = Math.ceil((when - today) / 86400000);
    if (!best || days < best.days) best = { ...d, when, days };
  }
  return best;
}

// Everything the scheme screen shows, from the farm, the recommended remedy and
// what the farmer typed in: { sumInsuredPerHa, yieldQPerAcre, lossAvoidedPct,
// remedyPricePerKgL, sprayerPrice, scStWomen, borrowOnKcc }.
export function schemeMaths(farm, remedy, inputs) {
  const ha = farm.acres * HA_PER_ACRE;
  const pm = PMFBY[farm.crop];
  const price = PRICE[farm.crop];
  const out = { ha: Math.round(ha * 100) / 100 };

  if (pm && inputs.sumInsuredPerHa > 0) {
    const sumInsured = inputs.sumInsuredPerHa * ha;
    out.pmfby = { share: pm.share, why: pm.why, sumInsured: Math.round(sumInsured), premium: Math.round(sumInsured * pm.share / 100) };
  } else if (pm) out.pmfby = { share: pm.share, why: pm.why };

  // Cost of the recommended chemical step: quantity from the dose, price from the shop.
  // No central scheme subsidises crop-protection chemicals, so the subsidy is ₹0.
  if (remedy) {
    out.remedy = { product: remedy.product, qty: remedy.qty, unit: remedy.unit };
    if (inputs.remedyPricePerKgL > 0) {
      out.remedy.cost = Math.round(remedy.qty / 1000 * inputs.remedyPricePerKgL);
      out.remedy.subsidy = 0;
      if (inputs.borrowOnKcc) out.kcc = { rate: 4, interest6m: Math.round(out.remedy.cost * 0.04 / 2) };
    }
  }

  if (price) {
    out.price = price;
    if (inputs.yieldQPerAcre > 0) {
      out.cropValue = Math.round(inputs.yieldQPerAcre * farm.acres * price.rs);
      if (inputs.lossAvoidedPct > 0) out.lossAvoided = Math.round(out.cropValue * inputs.lossAvoidedPct / 100);
    }
  }

  const smallMarginal = ha <= 2;
  const rate = smallMarginal || inputs.scStWomen ? 50 : 40;
  out.smam = { rate, smallMarginal };
  if (inputs.sprayerPrice > 0) { out.smam.subsidy = Math.round(inputs.sprayerPrice * rate / 100); out.smam.youPay = inputs.sprayerPrice - out.smam.subsidy; }

  out.pmkisan = { perYear: 6000, instalment: 2000 };
  return out;
}
