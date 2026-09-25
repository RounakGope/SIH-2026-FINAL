// Outbreak intelligence from anonymous reports (see reportOf in lib/store.js).
// Pure functions: the same code runs on local, Firebase and API data.
import { ipmFor } from './ipm';
import { countsForAlert } from './rules';
import { distanceKm } from './labs';

export const CELL = 20; // report grid: 1/20 degree ≈ 5.5 km (store.js writes cy/cx with it)
const DAYS = 14;
const MIN_REPORTS = 3; // below this, widen the area rather than show a near-empty map

export const cellCentre = (cy, cx) => [cy / CELL, cx / CELL];

function inRadius(r, farm, radius) {
  if (radius === 'district') return true;
  if (radius === 'taluka') return r.taluka === farm.taluka;
  if (r.cy == null) return false;
  const [lat, lon] = cellCentre(r.cy, r.cx);
  return distanceKm(farm.lat, farm.lon, lat, lon) <= 6; // 5 km + half a grid cell
}

// Returns { radius (actually used), widened, groups: [...] } for the farmer's crop,
// ranked by how many farms report each problem, then by severity.
export function outbreaksNear(reports, farm, requested, myCaseIds = new Set()) {
  const since = Date.now() - DAYS * 86400000;
  const base = reports.filter(r => r.createdAt >= since && !myCaseIds.has(r.id) &&
    (r.crop || 'Cotton') === farm.crop && countsForAlert(r));
  const order = ['5km', 'taluka', 'district'];
  let radius = requested, list = base.filter(r => inRadius(r, farm, radius));
  // Degrade 5 km -> taluka -> district until there is enough to say something.
  while (list.length < MIN_REPORTS && order.indexOf(radius) < order.length - 1) {
    radius = order[order.indexOf(radius) + 1];
    list = base.filter(r => inRadius(r, farm, radius));
  }

  const byLabel = {};
  for (const r of list) {
    const g = byLabel[r.label] ||= { label: r.label, farms: 0, sevSum: 0, sevN: 0, acres: 0, cells: {}, treated: {}, improvedN: 0, treatedN: 0 };
    g.farms++;
    if (r.sev != null) { g.sevSum += r.sev; g.sevN++; }
    g.acres += r.acres || 0;
    if (r.cy != null) { const k = r.cy + ',' + r.cx; g.cells[k] = (g.cells[k] || 0) + 1; }
    if (r.treated) {
      g.treatedN++;
      const t = g.treated[r.treated] ||= { tier: r.treated, n: 0, improved: 0 };
      t.n++; if (r.improved) { t.improved++; g.improvedN++; }
    }
  }
  const groups = Object.values(byLabel).map(g => {
    // What worked for neighbours: the treatment most often followed by a lower
    // severity on the next walk (needs at least 2 such farms to say anything).
    const worked = Object.values(g.treated).filter(t => t.improved >= 2).sort((a, b) => b.improved / b.n - a.improved / a.n || b.n - a.n)[0] || null;
    return {
      label: g.label, info: ipmFor(g.label, farm.crop), farms: g.farms,
      severity: g.sevN ? Math.round(g.sevSum / g.sevN) : null, acres: g.acres,
      cells: Object.entries(g.cells).map(([k, n]) => { const [cy, cx] = k.split(',').map(Number); return { cy, cx, n }; }),
      worked: worked && { tier: worked.tier, farms: worked.improved, of: worked.n }
    };
  }).sort((a, b) => b.farms - a.farms || (b.severity || 0) - (a.severity || 0));
  return { radius, widened: radius !== requested, groups };
}
