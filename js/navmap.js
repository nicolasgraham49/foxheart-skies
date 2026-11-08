// Navigation plan — the single source of truth for "where are we going, how
// far is left, and how long will it take". main.js feeds it the session's
// origin/destination airport objects (the same ones ATC and the flight plan
// use) and, per snapshot, the aircraft's lat/lon + groundspeed. The cockpit
// ND (cockpit.js) and the HUD progress strip (main.js) only READ nav.info —
// they never compute distances themselves.
//
// A future emergency-divert pass calls setDivert(apt) to light up a target on
// the map; nothing in this pass sets it, and clearing it is setDivert(null).
import { haversine, NM, D2R } from './data.js';

const GS_MIN_KT = 25; // below this an ETA is meaningless (parked / taxiing)

const clamp01 = v => Math.max(0, Math.min(1, v));
export function fmtEte(min) { // minutes -> "H:MM", null -> "--:--"
  if (min == null || !isFinite(min)) return '--:--';
  const m = Math.max(0, Math.round(min)); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
}
export function fmtClock(min) { // minutes into the day -> "HH:MM"
  if (min == null || !isFinite(min)) return '--:--';
  const m = ((Math.round(min) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
function bearingTo(lat1, lon1, lat2, lon2) { // initial great-circle bearing, deg true
  const p1 = lat1 * D2R, p2 = lat2 * D2R, dl = (lon2 - lon1) * D2R;
  const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export class NavPlan {
  constructor() { this.dep = null; this.arr = null; this.divert = null; this.totalNm = 0; this.gsKt = 0; this.info = null; }
  setFlight(dep, arr) {
    dep = dep || null; arr = arr || null;
    if (arr && dep && arr.icao === dep.icao && !(this.divert && this.divert.icao === arr.icao)) arr = null; // a flight to itself has no plan — unless it is a divert back to the departure airport, which is a real plan
    if ((dep && dep.icao) === (this.dep && this.dep.icao) && (arr && arr.icao) === (this.arr && this.arr.icao)) return;
    this.dep = dep; this.arr = arr; this.gsKt = 0;
    this.totalNm = dep && arr ? haversine(dep.lat, dep.lon, arr.lat, arr.lon) / NM : 0;
    this.info = null;
  }
  setDivert(apt) { this.divert = apt || null; } // future divert pass: target airport object or null
  // Called per display snapshot (~12-20 Hz). gs smoothing is a fixed-step EMA
  // (time constant ~2 s of snapshots) so the ETA doesn't jitter with gusts.
  update(lat, lon, gsKt, todMin) {
    if (!this.arr) { this.info = null; return null; }
    this.gsKt += (Math.max(0, gsKt) - this.gsKt) * 0.04;
    const remainNm = haversine(lat, lon, this.arr.lat, this.arr.lon) / NM;
    const eteMin = this.gsKt >= GS_MIN_KT ? remainNm / this.gsKt * 60 : null;
    const dv = this.divert ? { icao: this.divert.icao, lat: this.divert.lat, lon: this.divert.lon, distNm: haversine(lat, lon, this.divert.lat, this.divert.lon) / NM, brg: bearingTo(lat, lon, this.divert.lat, this.divert.lon) } : null;
    this.info = {
      dep: this.dep ? { icao: this.dep.icao, lat: this.dep.lat, lon: this.dep.lon } : null,
      arr: { icao: this.arr.icao, lat: this.arr.lat, lon: this.arr.lon },
      totalNm: this.totalNm, remainNm,
      progress: this.totalNm > 1 ? clamp01(1 - remainNm / this.totalNm) : (remainNm < 1 ? 1 : 0),
      gsKt: this.gsKt, eteMin, etaClockMin: eteMin == null ? null : todMin + eteMin,
      brgTo: bearingTo(lat, lon, this.arr.lat, this.arr.lon),
      divert: dv,
    };
    return this.info;
  }
}
