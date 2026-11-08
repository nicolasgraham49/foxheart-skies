// Air traffic control: the full IFR flow, with the right unit at each phase and real frequency handoffs:
// ATIS (the letter changes with the hour and the weather) → Delivery (IFR clearance: departure, initial altitude,
// departure frequency, squawk; readback, "readback correct") → Ground (push and start, taxi to the holding point)
// → Tower (line up and wait, takeoff) → Departure → Center / Control (climb, direct, sector handoff, descent)
// → Approach (descent, vectors, speed, ILS clearance) → Tower (landing, go-around) → Ground (vacate, taxi to gate).
// ATC watches the flight: altitude / heading / speed deviations, missing readbacks, missed handoffs (reminder, then
// radio check), runway entry or takeoff without a clearance, unstable approaches (go around). In Easy assist it is
// gentle and the first officer reads back / checks in for you when you are busy.
// Phraseology: FAA style at US airports ("climb and maintain one one thousand", "point"), ICAO elsewhere ("climb
// flight level one five zero", "decimal", QNH). Airline callsigns are never abbreviated; a unit gives its own name on
// first contact only. Every transmission goes through the shared speech manager (speech.js) and the next one waits
// for it to finish, with a short squelch gap. Readbacks are spoken by the first officer in their own voice.
const DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'niner'];
const digits = (s, dot = 'decimal') => String(s).split('').map(c => c === '.' ? dot : /\d/.test(c) ? DIG[+c] : c === '-' || c === ',' ? '' : c).filter(Boolean).join(' ');
const rwyS = id => { const m = String(id).match(/^(\d+)([LRC]?)$/); if (!m) return id; return digits(m[1].padStart(2, '0')) + (m[2] ? ' ' + { L: 'left', R: 'right', C: 'center' }[m[2]] : ''); };
const NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const r100 = ft => Math.round(ft / 100) * 100;
// altitudes: "five thousand five hundred", from 10,000 the thousands digit by digit ("one one thousand"), "flight level two four zero" at or above the transition altitude
const altD = (ft, ta) => { ft = r100(ft); return ft >= ta ? 'FL' + String(ft / 100).padStart(3, '0') : ft.toLocaleString('en-US'); };
const altS = (ft, ta) => { ft = r100(ft); if (ft >= ta) return 'flight level ' + digits(String(ft / 100).padStart(3, '0')); const th = Math.floor(ft / 1000), h = Math.round((ft % 1000) / 100); return [th ? (th >= 10 ? digits(th) : NUMW[th]) + ' thousand' : '', h ? NUMW[h] + ' hundred' : ''].filter(Boolean).join(' ') || 'zero'; };
const hdgD = h => String(Math.round(((h % 360) + 360) % 360) || 360).padStart(3, '0');
const NATO = 'Alfa Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey Xray Yankee Zulu'.split(' ');
const twyS = n => String(n).split('').map(c => /\d/.test(c) ? DIG[+c] : NATO['ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(c)] || c).join(' ');
// ---------------------------------------------------------------- multilingual ATC: a facility speaks its airport's language.
// Spanish for Spain + Latin America, Korean for Korea, Japanese for Japan, English elsewhere (incl. Dubai and
// Singapore, where English IS the aviation working language — see the [ATC home language] PROGRESS entry). The
// pilot + FO speak Spanish at every airport — see the Spanish cockpit block at pilotSpanish() (the owner's
// standing order; controllers unaffected).
const lang2 = s => String(s || '').toLowerCase().replace(/_/g, '-').slice(0, 2);
const ES_CC = new Set(['ES', 'MX', 'PA', 'CO', 'PE', 'CL', 'AR', 'VE', 'EC', 'BO', 'PY', 'UY', 'CU', 'DO', 'PR', 'GT', 'HN', 'SV', 'NI', 'CR']);
export const aptLang = apt => { const cc = apt && apt.cc; return cc === 'KR' ? 'ko' : cc === 'JP' ? 'ja' : ES_CC.has(cc) ? 'es' : 'en'; };
// ---------------------------------------------------------------- controller ACCENTS: the voice locale a facility
// carries when it speaks ENGLISH. Localized phraseology (es / ko above) already speaks with a local-language voice;
// the accent covers every other transmission — a Spanish voice reading English at Panama IS the Latin accent, a
// British voice at Heathrow, a Japanese voice at Haneda. Ordered BCP-47 preference tags (lowercase): the first tag
// with an installed voice wins. US airports pin en-US (on a machine whose English voices are all en-US — the
// common case — that pool IS today's English pool); anywhere unlisted returns null and keeps the plain pool.
// Consumed by voiceFor (persona pick inside the accent pool) and passed to speech.js as o.accent — the
// one documented exception that lets the resolver return a voice whose language differs from the utterance's.
export const aptAccent = apt => { const cc = apt && apt.cc; if (!cc) return null; if (cc === 'US') return ['en-us'];
  if (ES_CC.has(cc)) return ['es'];
  switch (cc) { case 'KR': return ['ko']; case 'JP': return ['ja']; case 'GB': return ['en-gb']; case 'AE': return ['ar', 'en-gb', 'en-in']; case 'SG': return ['en-gb', 'en-sg']; }
  return null; };
const DIG_ES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const digitsEs = (s, dot = 'punto') => String(s).split('').map(c => c === '.' ? dot : /\d/.test(c) ? DIG_ES[+c] : c === '-' || c === ',' ? '' : c).filter(Boolean).join(' ');
const NUM_ES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const numEs = n => { n = Math.round(Math.abs(n)); if (n < 30) return NUM_ES[n]; const t = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'][Math.floor(n / 10)], o = n % 10; return o ? t + ' y ' + NUM_ES[o] : t; };
const DIG_KO = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const digitsKo = (s, dot = '점') => String(s).split('').map(c => c === '.' ? dot : /\d/.test(c) ? DIG_KO[+c] : c === '-' || c === ',' ? '' : c).filter(Boolean).join(' ');
const numKo = n => { n = Math.round(Math.abs(n)); if (n < 10) return DIG_KO[n]; const t = Math.floor(n / 10), o = n % 10; return (t > 1 ? DIG_KO[t] : '') + '십' + (o ? DIG_KO[o] : ''); };
const DIG_JA = ['ゼロ', 'イチ', 'ニ', 'サン', 'ヨン', 'ゴ', 'ロク', 'ナナ', 'ハチ', 'キュウ'];
const digitsJa = (s, dot = 'テン') => String(s).split('').map(c => c === '.' ? dot : /\d/.test(c) ? DIG_JA[+c] : c === '-' || c === ',' ? '' : c).filter(Boolean).join(' ');
const numJa = n => { n = Math.round(Math.abs(n)); if (n < 10) return DIG_JA[n]; const t = Math.floor(n / 10), o = n % 10; return (t > 1 ? DIG_JA[t] : '') + 'ジュウ' + (o ? DIG_JA[o] : ''); };
// full number words for altitudes / speeds: KO Sino-Korean place values (5500 -> "오천오백"), JA with the
// standard rendaku on 3/6/8 hundreds and 3/8 thousands (5500 -> "ゴセンゴヒャク", 13000 -> "イチマンサンゼン")
const numKoW = n => { n = Math.round(Math.abs(n)); if (!n) return DIG_KO[0]; const man = Math.floor(n / 10000), ch = Math.floor(n % 10000 / 1000), bk = Math.floor(n % 1000 / 100), sp = Math.floor(n % 100 / 10), il = n % 10;
  return (man ? (man === 1 ? '일' : DIG_KO[man]) + '만' : '') + (ch ? (ch === 1 ? '천' : DIG_KO[ch] + '천') : '') + (bk ? (bk === 1 ? '백' : DIG_KO[bk] + '백') : '') + (sp ? (sp === 1 ? '십' : DIG_KO[sp] + '십') : '') + (il ? DIG_KO[il] : ''); };
const numJaW = n => { n = Math.round(Math.abs(n)); if (!n) return DIG_JA[0]; const man = Math.floor(n / 10000), sn = Math.floor(n % 10000 / 1000), hy = Math.floor(n % 1000 / 100), ju = Math.floor(n % 100 / 10), il = n % 10;
  const sen = sn === 1 ? 'セン' : sn === 3 ? 'サンゼン' : sn === 8 ? 'ハッセン' : DIG_JA[sn] + 'セン', hyaku = hy === 1 ? 'ヒャク' : hy === 3 ? 'サンビャク' : hy === 6 ? 'ロッピャク' : hy === 8 ? 'ハッピャク' : DIG_JA[hy] + 'ヒャク';
  return (man ? DIG_JA[man] + 'マン' : '') + (sn ? sen : '') + (hy ? hyaku : '') + (ju ? (ju === 1 ? 'ジュウ' : DIG_JA[ju] + 'ジュウ') : '') + (il ? DIG_JA[il] : ''); };
const H100_ES = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
const numEsW = n => { n = Math.round(Math.abs(n)); if (n < 100) return numEs(n); if (n < 1000) { const h = Math.floor(n / 100), r = n % 100; return (h === 1 ? (r ? 'ciento' : 'cien') : H100_ES[h]) + (r ? ' ' + numEs(r) : ''); } if (n < 100000) { const t = Math.floor(n / 1000), r = n % 1000; return (t === 1 ? 'mil' : numEsW(t) + ' mil') + (r ? ' ' + numEsW(r) : ''); } return digitsEs(String(n)); }; // full Spanish number words for the pilot's speech: 5500 -> "cinco mil quinientos", 210 -> "doscientos diez"
// message builder: parts are strings (same display/spoken), [display, spoken] pairs or other messages
const M = (...parts) => ({ d: parts.map(p => Array.isArray(p) ? p[0] : p && p.d !== undefined ? p.d : p).join(''), s: parts.map(p => Array.isArray(p) ? p[1] : p && p.s !== undefined ? p.s : p).join('') });
const cap = m => ({ ...m, d: m.d.charAt(0).toUpperCase() + m.d.slice(1) });
const fstr = mhz => mhz.toFixed(Math.round(mhz * 1000) % 10 ? 3 : 2);
const D2R = Math.PI / 180, R2D = 180 / Math.PI, wrap180 = a => ((a % 360) + 540) % 360 - 180;
const gcNm = (la1, lo1, la2, lo2) => { const p1 = la1 * D2R, p2 = la2 * D2R, dl = (lo2 - lo1) * D2R, dp = p2 - p1; const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2; return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h))); };
const gcBrg = (la1, lo1, la2, lo2) => { const p1 = la1 * D2R, p2 = la2 * D2R, dl = (lo2 - lo1) * D2R; return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * R2D + 360) % 360; };
export const SHORT = { KTPA: 'Tampa', KMIA: 'Miami', RKSI: 'Incheon', KLAX: 'Los Angeles', MPTO: 'Tocumen', KJFK: 'Kennedy', KSFO: 'San Francisco', RKSS: 'Gimpo', RJTT: 'Tokyo', EGLL: 'Heathrow', OMDB: 'Dubai', WSSS: 'Singapore' };
export const REGION_CS = { US: ['Sunfin', 'Pelican', 'Coral', 'Bayhawk', 'Skylark', 'Manatee', 'Seabird', 'Palmetto', 'Osprey', 'Redtail'], KR: ['Hanbit', 'Mirae', 'Arirang', 'Haneul', 'Blue Crane', 'Seorak'], JP: ['Sakura Wing', 'Kestrel', 'Hikari', 'Tsubame'], PA: ['Canal', 'Quetzal', 'Isthmus', 'Toucan', 'Pacifico'], GB: ['Thames', 'Kestrel', 'Albion', 'Speedlink'], AE: ['Falcon', 'Oasis', 'Dune'], SG: ['Merlion', 'Orchid', 'Straits'], default: ['Skylark', 'Kestrel', 'Seabird', 'Osprey', 'Nimbus', 'Aurora'] };
export const DEST_DEFAULT = { KTPA: 'KMIA', KMIA: 'KTPA', RKSI: 'RJTT', RKSS: 'RJTT', RJTT: 'RKSS', KLAX: 'KSFO', KSFO: 'KLAX', MPTO: 'KMIA', KJFK: 'EGLL', EGLL: 'KJFK', OMDB: 'EGLL', WSSS: 'RKSI' };
// [data key, fallback key, simulated base MHz, unit word]; frequencies come from the airport data where it has them (else marked *)
const FAC = { ATIS: ['A', null, 127.85, 'Information'], DEL: ['C', null, 121.9, 'Delivery'], GND: ['G', null, 121.75, 'Ground'], TWR: ['T', null, 118.7, 'Tower'], DEP: ['D', 'P', 124.35, 'Departure'], APP: ['P', 'D', 119.25, 'Approach'], CTR: [null, null, 132.45, 'Center'] };
const CENTER_CC = new Set(['US', 'CA']); // area control is "Center" there, "Control" elsewhere (London Control, Incheon Control)
const TA = { US: 18000, CA: 18000, MX: 18500, KR: 14000, JP: 14000, AU: 10000, NZ: 13000, SG: 11000, AE: 13000, GB: 6000, IE: 5000, FR: 5000, DE: 5000, NL: 3000, ES: 6000, IT: 6000 }; // transition altitudes
const VOICE = { ATIS: { rate: 1.0, pitch: 0.9 }, DEL: { rate: 1.06, pitch: 1.16 }, GND: { rate: 1.1, pitch: 0.8 }, TWR: { rate: 1.16, pitch: 1.22 }, DEP: { rate: 1.12, pitch: 0.74 }, APP: { rate: 1.08, pitch: 1.02 }, CTR: { rate: 1.04, pitch: 0.88 }, ME: { rate: 1.08, pitch: 0.9 } };
const VORD = { DEL: 3, GND: 2, TWR: 0, DEP: 4, APP: 1, CTR: 5, ATIS: 6 };
const DEP_PH = new Set(['gate', 'clr_ok', 'pushing', 'pushed', 'taxiing', 'to_twr', 'twr_hold', 'lineup', 'takeoff_clr', 'rwy_start', 'to_dep', 'dep']);
const ARR_TWR = new Set(['to_twr_arr', 'land_clr', 'twr_continue', 'go_around']);

export function facility(apt, kind) {
  const [k1, k2, base, word0] = FAC[kind]; const f = apt.freq || {};
  const real = k1 ? (f[k1] ?? (k2 ? f[k2] : undefined)) : undefined;
  let h = 0; for (const c of apt.icao + kind) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const mhz = real ?? +(base + ((h % 9) - 4) * 0.025).toFixed(3);
  const word = kind === 'CTR' && !CENTER_CC.has(apt.cc) ? 'Control' : word0;
  const name = (SHORT[apt.icao] || apt.city || apt.name.split(' ')[0]) + ' ' + word;
  return { kind, mhz, real: real != null, name, apt };
}
const fmtF = f => fstr(f.mhz) + (f.real ? '' : '*');
const freqS = f => digits(fstr(f.mhz).replace(/0$/, ''), f.apt.cc === 'US' ? 'point' : 'decimal');

export class ATC {
  constructor(audio) {
    this.audio = audio; this.log = []; this.queue = []; this.auto = false; this.speakMe = true; this.voices = [];
    this.cs = 'Foxheart 412'; this.csS = 'Foxheart four one two'; this.phase = 'idle'; this.listeners = []; this.errors = []; this.tuned = null; this.t = 0;
    this.autoT = 0; this.atisOn = false; this.voicePref = {}; this.chatterOn = true; this.tx = null; this.gapT = 0; this.flags = {}; this.heard = {}; this.atisSt = {}; this.contacted = new Set();
    this.onNote = null; this.fast = false; // fast: pace transmissions on sim time only (headless tests)
    try { const load = () => { this.rankVoices(); this.listeners.forEach(f => { try { f(this, 'voices'); } catch (e) { } }); }; this.rankVoices(); speechSynthesis.addEventListener ? speechSynthesis.addEventListener('voiceschanged', load) : (speechSynthesis.onvoiceschanged = load); } catch (e) { }
  }
  on(f) { this.listeners.push(f); }
  emit() { for (const f of this.listeners) try { f(this); } catch (e) { this.errors.push(String(e)); } }
  note(t) { try { this.onNote && this.onNote(t); } catch (e) { } }
  // ---------------------------------------------------------------- setup per flight
  setup(o) {
    this.o = o; this.dep = o.dep; this.arr = o.arr || o.dep; this.stopAtis(); this.log = []; this.queue = []; this.tx = null; this.gapT = 0;
    this.rb = null; this.ho = null; this.alt = null; this.hdgA = null; this.spdA = null; this.flags = {}; this.heard = {}; this.contacted = new Set(); this.personas = {}; this.lastInstr = null; this.taxiRoute = null; this.exitName = null; this.minAgl = 1e9; this.chatT = 14; this.chatLog = []; this.phT = 0; this.divertApt = null; this.divertedFrom = null;
    let sq; do { sq = String(2 + (Math.random() * 5 | 0)) + [0, 0, 0].map(() => Math.random() * 8 | 0).join(''); } while (/^(2000|7000|1200)$/.test(sq)); this.squawk = sq;
    const dep = this.dep, arr = this.arr, d = gcNm(dep.lat, dep.lon, arr.lat, arr.lon), crs = gcBrg(dep.lat, dep.lon, arr.lat, arr.lon);
    let cr = Math.max(8000, Math.min(37000, Math.round(d * 1.4 / 10) * 1000)); if (((cr / 1000) % 2 === 1) !== (crs < 180)) cr += cr >= 37000 ? -1000 : 1000; // semicircular rule: eastbound odd, westbound even
    this.cruise = cr; this.depTop = Math.min(cr, this.ta(dep) >= 10000 ? 11000 : 15000); this.init = Math.min(this.depTop, Math.max(3000, Math.round((dep.elevFt + 5000) / 1000) * 1000));
    this.bottom = Math.min(cr, Math.round((arr.elevFt + (this.ta(arr) >= 10000 ? 11000 : 7000)) / 1000) * 1000); this.appAlt = Math.max(2000, r100(arr.elevFt + 3000)); this.ctrApt = dep;
    let h = 0; for (const c of dep.icao) h = (h * 7 + c.charCodeAt(0)) >>> 0; this.sid = (SHORT[dep.icao] || dep.city || dep.icao) + ' ' + ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][h % 7];
    this.phase = { gate: 'gate', terminal: 'gate', runway: 'rwy_start', final: 'to_twr_arr', route: 'to_ctr' }[o.start] || 'gate';
    if (this.phase === 'to_twr_arr') { this.ho = { to: 'TWR', from: 'APP', t: 0, n: 0, skipBye: true }; this.flags.appClr = true; this.contacted.add(this.fac('APP').name); }
    if (this.phase === 'to_ctr') { this.ctrApt = arr; this.flags.climbed = true; this.flags.sector = true; this.ho = { to: 'CTR', from: 'CTR', t: 0, n: 0, skipBye: true, quiet: true }; }
    this.tune(this.phase === 'gate' ? 'DEL' : this.phase === 'to_ctr' ? 'CTR' : this.phase === 'to_twr_arr' ? 'APP' : 'TWR', true);
    this.emit();
  }
  apt() { return DEP_PH.has(this.phase) ? this.dep : this.arr; }
  fac(kind, apt) { return facility(apt || (kind === 'DEP' ? this.dep : kind === 'APP' ? this.arr : kind === 'CTR' ? (this.ctrApt || this.dep) : this.apt()), kind); }
  tune(kind, silent) { this.tuned = this.fac(kind); if (kind !== 'ATIS') this.stopAtis(); if (kind === 'ATIS' && !silent) this.startAtis(); this.emit(); }
  setPhase(p) { if (this.phase !== p) { this.phase = p; this.phT = this.t; this.emit(); } }
  ctxS() { return this.o.ctx.state(); }
  easy() { const c = this.o?.ctx; return !!(c && c.assist && c.assist() === 'easy'); }
  // ---------------------------------------------------------------- phrase helpers
  ta(A) { return TA[(A || this.apt()).cc] ?? 7000; }
  usA(A) { return (A || this.apt()).cc === 'US'; }
  CSm() { return [this.cs, this.csS]; }
  Am(ft, A) { const ta = this.ta(A); return [altD(ft, ta), altS(ft, ta)]; }
  cmdAlt(ft, cur, A) { const up = ft > cur, a = this.Am(ft, A); if (this.usA(A)) return M(up ? 'climb and maintain ' : 'descend and maintain ', a); return M(up ? 'climb ' : 'descend ', ft >= this.ta(A) ? a : ['altitude ' + a[0] + ' ft', 'altitude ' + a[1] + ' feet']); }
  altimM(A) { return this.usA(A) ? M('altimeter ', ['29.92', 'two niner niner two']) : M(['QNH ', 'Q N H '], ['1013', 'one zero one three']); }
  hdgM(h, cur) { const d = wrap180(h - cur); return M(Math.abs(d) < 8 ? 'fly heading ' : d > 0 ? 'turn right heading ' : 'turn left heading ', [hdgD(h), digits(hdgD(h))]); }
  freqM(F) { return [fstr(F.mhz), freqS(F)]; }
  contactM(kind, apt) { const F = this.fac(kind, apt); const lg = aptLang(F.apt);
    if (lg === 'es') return M(this.pick('cmVe', ['contacte ', 'contacte ', 'pase a ']), F.name, ' ', this.freqL(F, lg));
    if (lg === 'ko') return M(F.name, ' ', this.freqL(F, lg), '로 연락하십시오');
    if (lg === 'ja') return M(F.name, ' ', this.freqL(F, lg), 'に連絡してください');
    return M(this.pick('cmV', ['contact ', 'contact ', 'call ', 'switch to ']), F.name, ' ', this.freqM(F)); }
  // ---- localized building blocks (display, spoken) for the core controller calls at ES / KO / JA airports
  freqL(F, lg) { const s = fstr(F.mhz).replace(/0$/, ''); return [fstr(F.mhz), lg === 'es' ? digitsEs(s, 'punto') : lg === 'ko' ? digitsKo(s, '점') : lg === 'ja' ? digitsJa(s, 'テン') : freqS(F)]; }
  csM2(lg) { return [this.cs, lg === 'es' ? 'Foxheart ' + digitsEs('412') : lg === 'ko' ? '폭스하트 ' + digitsKo('412') : lg === 'ja' ? 'フォックスハート ' + digitsJa('412') : this.csS]; } // our callsign, spoken in the facility's language
  rwyL(id, lg) { const m = String(id).match(/^(\d+)([LRC]?)$/); if (!m) return [id, id]; const d = m[1].padStart(2, '0');
    if (lg === 'es') return [id, digitsEs(d) + (m[2] ? ' ' + { L: 'izquierda', R: 'derecha', C: 'central' }[m[2]] : '')];
    if (lg === 'ko') return [id, digitsKo(d) + (m[2] ? ' ' + { L: '왼쪽', R: '오른쪽', C: '중앙' }[m[2]] : '')];
    if (lg === 'ja') return [id, digitsJa(d) + (m[2] ? ' ' + { L: 'レフト', R: 'ライト', C: 'センター' }[m[2]] : '')];
    return this.rwyM(id); }
  windL(A, lg) { const w = this.wx(); if (w.kt < 3) return lg === 'es' ? M('viento en calma') : lg === 'ko' ? M('바람은 잔잔합니다') : lg === 'ja' ? M('風は穏やかです') : M('wind calm');
    const d = hdgD(Math.round(w.dir / 10) * 10), k = Math.round(w.kt), g = Math.round(k * 1.5);
    if (lg === 'es') return M('viento ', [d + ' a ' + k, digitsEs(d) + ' a ' + numEs(k)], w.gust ? M(' con rachas de ', [String(g), numEs(g)]) : '');
    if (lg === 'ko') return M('바람 ', [d + '도 ' + k + '노트', digitsKo(d) + '도 ' + numKo(k) + '노트'], w.gust ? M(', 돌풍 ', [g + '노트', numKo(g) + '노트']) : '');
    if (lg === 'ja') return M('風 ', [d + '度 ' + k + 'ノット', digitsJa(d) + '度 ' + numJa(k) + 'ノット'], w.gust ? M('、ガスト ', [g + 'ノット', numJa(g) + 'ノット']) : '');
    return this.windM(A); }
  helloL(apt) { const lg = aptLang(apt); if (lg === 'en') return this.hello(); const m = this.o.ctx.weather().localMin ?? 720; return lg === 'es' ? (m < 720 ? 'buenos días' : m < 1140 ? 'buenas tardes' : 'buenas noches') : lg === 'ja' ? (m < 720 ? 'おはようございます' : m < 1140 ? 'こんにちは' : 'こんばんは') : '안녕하세요'; }
  maybeHiL(apt, p = 0.45) { return Math.random() < p ? this.helloL(apt) + ', ' : ''; } // controller-side greeting, in the facility's language
  rwyM(id) { return [id, rwyS(id)]; }
  city(A) { return SHORT[A.icao] || A.city || A.icao; }
  idM(kind, apt) { const F = this.fac(kind, apt); if (this.contacted.has(F.name)) return ''; this.contacted.add(F.name); return F.name + ', '; } // a unit names itself on first contact only
  hello() { const m = this.o.ctx.weather().localMin ?? 720; return m < 690 ? 'good morning' : m < 1050 ? 'good afternoon' : 'good evening'; }
  maybeHi(p = 0.45) { return Math.random() < p ? this.hello() + ', ' : ''; }
  altRep(s, tgt, A) { const a = r100(s.altFt); if (tgt == null && Math.abs(s.vsFpm) >= 250) return M(this.Am(a, A), s.vsFpm > 0 ? ' climbing' : ' descending'); if (tgt == null || Math.abs(s.altFt - tgt) < 250 || Math.abs(s.vsFpm) < 250) return M('level ', this.Am(Math.abs(s.altFt - (tgt ?? a)) < 250 ? (tgt ?? a) : a, A)); return M(this.Am(a, A), s.vsFpm > 0 ? ' climbing ' : ' descending ', this.Am(tgt, A)); }
  pick(key, arr) { this._last = this._last || {}; let i = Math.floor(Math.random() * arr.length); if (arr.length > 1 && i === this._last[key]) i = (i + 1) % arr.length; this._last[key] = i; return arr[i]; }
  bye(apt) {
    const c = (apt || this.apt()).icao; const pools = {
      KTPA: ['have a good one', 'see ya', 'good day'], KMIA: ['good day', 'adiós', 'have a good one'], MPTO: ['buen vuelo', 'good day, gracias'],
      RKSI: ['good day', 'have a safe flight'], RKSS: ['good day'], RJTT: ['good day'], EGLL: ['cheers', 'good day', 'bye bye'], OMDB: ['good day'], WSSS: ['good day'] };
    return this.pick('bye', pools[c] || ['good day', 'see ya', 'so long']);
  }
  human(m, pUh) {
    const head = (m.d.split(',')[0] || '').trim();
    if (Math.random() < pUh && /, /.test(m.d) && (/^[A-Za-z ]+ \d{2,4}$/.test(head))) { const f = x => x.replace(/^([^,]+), /, '$1, uh, '); return { ...m, d: f(m.d), s: f(m.s) }; } // keep extra fields (e.g. lang)
    return m;
  }
  // ---------------------------------------------------------------- weather / ATIS (the letter moves on with the hour and when the wind or weather changes)
  wx() { return this.o.ctx.weather(); }
  windM(A) { const w = this.wx(); if (w.kt < 3) return M('wind calm'); const d = hdgD(Math.round(w.dir / 10) * 10), k = Math.round(w.kt); const g = Math.round(k * 1.5);
    if ((A || this.apt()).cc === 'US') return M('wind ', [d, digits(d)], ' at ', [String(k), String(k)], w.gust ? M(' gusting ', [String(g), String(g)]) : '');
    return M('wind ', [d, digits(d) + ' degrees'], ', ', [k + ' kt', digits(String(k)) + ' knots'], w.gust ? M(' gusting ', [g + ' kt', digits(String(g)) + ' knots']) : ''); }
  atisLetter(A) {
    const w = this.wx(); let st = this.atisSt[A.icao]; const hr = Math.floor((((w.utcMin + 10) % 1440) + 1440) % 1440 / 60), key = w.kind + ':' + Math.round(w.dir / 10) + ':' + Math.round(w.kt / 4);
    if (!st) { let h = 0; for (const c of A.icao) h = (h * 31 + c.charCodeAt(0)) >>> 0; st = this.atisSt[A.icao] = { i: (h + hr) % 26, hr, key }; }
    else if (st.hr !== hr || st.key !== key) { st.i = (st.i + 1) % 26; st.hr = hr; st.key = key; }
    return NATO[st.i];
  }
  atisText() {
    const A = this.apt(), w = this.wx(), E = A === this.dep && DEP_PH.has(this.phase) ? this.o.depEnd : this.o.ctx.arrEnd(), L = this.atisLetter(A);
    const us = A.cc === 'US'; const name = A.name.replace(/International Airport/, 'International').replace(/ Airport$/, '');
    const vis = w.vis >= 10000 ? (us ? M('visibility one zero') : M('visibility one zero kilometers or more')) : M('visibility ', [String(us ? Math.max(0.25, Math.round(w.vis / 1609 * 4) / 4) + ' SM' : Math.round(w.vis) + ' m'), (us ? String(Math.max(0.25, Math.round(w.vis / 1609 * 4) / 4)) + ' miles' : digits(Math.round(w.vis)) + ' meters')]);
    const cl = { clear: 'sky clear', scattered: 'scattered clouds at four thousand', overcast: 'overcast at two thousand eight hundred', rain: 'light rain, broken one thousand two hundred, overcast two thousand', fog: 'fog, vertical visibility two hundred' }[w.kind] || 'sky clear';
    const t = w.temp; const z = String(Math.floor(((w.utcMin % 1440) + 1440) % 1440 / 60)).padStart(2, '0') + '50'; const r = E ? E.ident : '';
    return M(name, ' information ', L, ', ', [z + 'Z', digits(z) + ' zulu'], '. ', this.windM(), '. ', vis, '. ', cl, '. ', 'temperature ', [String(t), digits(String(Math.abs(t)))], ', dew point ', [String(t - 5), digits(String(Math.abs(t - 5)))], '. ', this.altimM(A), '. ',
      'I L S approaches in use, landing and departing runway ', this.rwyM(r), '. ', us ? 'Read back all runway hold short instructions. ' : '', 'Advise on initial contact you have information ', L, '.');
  }
  startAtis() {
    this.atisOn = true; const A = this.apt(); this.heard[A.icao] = this.atisLetter(A);
    const loop = () => { if (!this.atisOn) return; const m = this.atisText(); this.heard[this.apt().icao] = this.atisLetter(this.apt()); this.say('ATIS', m, () => { if (this.atisOn) this.atisTimer = setTimeout(loop, 2500); }, true); };
    loop();
  }
  stopAtis() { this.atisOn = false; clearTimeout(this.atisTimer); if (this.speech) this.speech.cancel('atis'); this.speakingAtis = false; }
  infoM(A) { const h = this.heard[A.icao]; return h ? M(', information ', h) : ''; } // pilot: "with information Kilo" only if you listened
  infoChk(A) { const cur = this.atisLetter(A); if (this.heard[A.icao] === cur) return ''; this.heard[A.icao] = cur; return M('information ', cur, ' is current, ', this.altimM(A), '. '); }
  // ---------------------------------------------------------------- transmissions
  me(kind, m, delay = 0) { this.dropChatter(); let mm = this.human(m, 0.03); if (this.pilotSpanish() && !mm.lang) mm = { ...mm, lang: 'es' }; // Spanish cockpit: the call was composed in Spanish — the tag is what makes speech.js voice it with the Spanish voice
    this.push({ who: 'ME', kind, m: mm, delay }); this.lastMeT = this.t; }
  atc(kind, m, delay = 1.6, then, x) { this.push(Object.assign({ who: kind, kind, m: this.human(m, 0.07), delay: delay * this.pace() * (0.85 + Math.random() * 0.4), then }, x || {})); }
  other(kind, cs, m, delay = 0.6) { this.push({ who: 'OTHER', cs, kind, m: this.human(m, 0.1), delay, chatter: true }); }
  push(x) { this.queue.push(x); }
  dropChatter() { this.queue = this.queue.filter(x => !x.chatter); if (this.tx && this.tx.chatter && this.speech) this.speech.cancel('chatter'); }
  pace() { return Math.max(0.55, 1 - this.busy() * 0.12); }
  busy() { return Math.min(3, (this.chatLog || []).filter(t => this.t - t < 90).length); }
  waiting() { return this.queue.some(x => x.reply); } // a reply to your call is on its way
  // ---------------------------------------------------------------- voices: per-language pools for the AUTO picker.
  // Reliability first: local voices outrank network ones — the old ranking put "online / natural" (network) voices
  // on top, and those are the ones that silently fail on real Windows Chrome lists, which is why Auto muted the
  // controllers while a hand-picked Settings voice spoke. Quality only breaks ties between local voices now.
  // Whatever Auto resolves to is re-validated at speak time by speech.js, which also substitutes / retries.
  rankVoices() {
    let all = []; try { all = speechSynthesis.getVoices(); } catch (e) { }
    this.allVoices = all;
    const score = v => (v.localService ? 100 : 0) + (/natural|neural/i.test(v.name) ? 30 : 0) + (/google/i.test(v.name) ? 15 : 0) + (/microsoft/i.test(v.name) ? 8 : 0) + (/^en-(US|GB|AU|IE|CA)/i.test(v.lang) ? 6 : 0) + (v.default ? 4 : 0);
    const pool = lg => all.filter(v => lang2(v.lang) === lg && !/espeak|compact/i.test(v.name)).sort((a, b) => score(b) - score(a));
    this.voicesByLang = { en: pool('en'), es: pool('es'), ko: pool('ko'), ja: pool('ja') };
    this.voices = this.voicesByLang.en;
  }
  poolFor(lg) { const p = (this.voicesByLang || {})[lg] || []; const alive = p.filter(v => !(this.speech && this.speech.voiceBad && this.speech.voiceBad(v))); return alive.length ? alive : p; }
  poolForLoc(tag) { // voices matching one accent locale tag ('es', 'ko', 'ja', 'ar', 'en-gb', …), reliability-ranked like the language pools and blocklist-aware the same way
    const tg = String(tag || '').toLowerCase();
    const score = v => (v.localService ? 100 : 0) + (/natural|neural/i.test(v.name) ? 30 : 0) + (/google/i.test(v.name) ? 15 : 0) + (/microsoft/i.test(v.name) ? 8 : 0) + (v.default ? 4 : 0);
    const all = (this.allVoices || []).filter(v => { const vl = String(v.lang || '').toLowerCase().replace(/_/g, '-'); return (vl === tg || vl.startsWith(tg + '-') || (tg.length === 2 && lang2(v.lang) === tg)) && !/espeak|compact/i.test(v.name); }).sort((a, b) => score(b) - score(a));
    const alive = all.filter(v => !(this.speech && this.speech.voiceBad && this.speech.voiceBad(v))); return alive.length ? alive : all;
  }
  facLang(apt) { return aptLang(apt); }
  // ---------------------------------------------------------------- the SPANISH COCKPIT: the owner is a Spanish
  // speaker IRL and wants his crew the same in the sim, so the captain's calls and the FO's readbacks are
  // COMPOSED in Spanish and voiced by a Spanish voice at EVERY airport: me() stamps lang 'es' on pilot
  // transmissions (say() then tags the utterance es-ES, exactly like localized controller text), voiceFor('ME')
  // draws the crew's voice from the Spanish pool, and say() passes the es locale explicitly as the accent
  // request so the resolver keeps the crew Spanish even over a stale non-Spanish pick. Controllers are NOT
  // touched — their language/accent system stands, so a US tower still answers in English (real bilingual ops;
  // the owner understands both). Readbacks stay a pure language layer: every rb carries an optional mEs twin
  // and readback() picks it when the preference is on — the state machine never parses speech text.
  // PERSISTED PREFERENCE: localStorage 'fox.pilotSpanish' — unset or '1' = Spanish (Spanish is the DEFAULT,
  // per the owner's standing order), '0' = the old all-English cockpit. setPilotSpanish(on) flips it live and
  // persists it; a future Settings toggle only has to call that.
  pilotSpanish() { if (this._pilotEs != null) return this._pilotEs; try { const v = localStorage.getItem('fox.pilotSpanish'); return v == null ? true : v !== '0' && v !== 'false'; } catch (e) { return true; } }
  setPilotSpanish(on) { this._pilotEs = !!on; try { localStorage.setItem('fox.pilotSpanish', on ? '1' : '0'); } catch (e) { } }
  // ---- the pilot's own phraseology in Spanish (same [display, spoken] pair shape as the English builders)
  CSp() { return [this.cs, 'Foxheart ' + digitsEs('412')]; } // our callsign as WE say it: "Foxheart cuatro uno dos"
  altEsM(ft, A) { const ta = this.ta(A); ft = r100(ft); return [altD(ft, ta), ft >= ta ? 'nivel de vuelo ' + digitsEs(String(ft / 100).padStart(3, '0')) : numEsW(ft) + ' pies']; }
  altRepEs(s, tgt, A) { const a = r100(s.altFt); if (tgt == null && Math.abs(s.vsFpm) >= 250) return M(this.altEsM(a, A), s.vsFpm > 0 ? ' ascendiendo' : ' descendiendo'); if (tgt == null || Math.abs(s.altFt - tgt) < 250 || Math.abs(s.vsFpm) < 250) return M('manteniendo ', this.altEsM(Math.abs(s.altFt - (tgt ?? a)) < 250 ? (tgt ?? a) : a, A)); return M(this.altEsM(a, A), s.vsFpm > 0 ? ' ascendiendo a ' : ' descendiendo a ', this.altEsM(tgt, A)); }
  cmdAltEs(ft, cur, A) { const up = ft > cur, a = this.altEsM(ft, A); if (this.usA(A)) return M(up ? 'ascienda y mantenga ' : 'descienda y mantenga ', a); return M(up ? 'ascienda a ' : 'descienda a ', ft >= this.ta(A) ? a : ['altitud ' + a[0] + ' ft', 'altitud ' + a[1]]); }
  hdgEsM(h, cur) { const d = wrap180(h - cur); return M(Math.abs(d) < 8 ? 'mantenga rumbo ' : d > 0 ? 'vire a la derecha rumbo ' : 'vire a la izquierda rumbo ', [hdgD(h), digitsEs(hdgD(h))]); }
  spdEsM(kt) { return [kt + ' kt', numEsW(kt) + ' nudos']; }
  freqEsM(F) { return this.freqL(F, 'es'); }
  rwyEsM(id) { return this.rwyL(id, 'es'); }
  twyEs(n) { return String(n).split('').map(c => /\d/.test(c) ? DIG_ES[+c] : NATO['ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(c)] || c).join(' '); }
  infoEsM(A) { const h = this.heard[A.icao]; return h ? M(', con información ', h) : ''; } // "con información Kilo", only if you listened
  hiEs() { const m = this.o.ctx.weather().localMin ?? 720; return m < 720 ? 'buenos días' : m < 1140 ? 'buenas tardes' : 'buenas noches'; }
  maybeHiEs(p = 0.45) { return Math.random() < p ? this.hiEs() + ', ' : ''; }
  byeEs() { return this.pick('byeEs', ['adiós', 'buen día', 'hasta luego', 'gracias, adiós']); }
  dirEs(d) { return { north: 'norte', south: 'sur', east: 'este', west: 'oeste', 'north-east': 'noreste', 'south-west': 'suroeste', 'north-west': 'noroeste', 'south-east': 'sureste' }[d] || d; }
  routeInstrEs(s) { const c = this.o.ctx, fx = c.fixNear && c.fixNear(this.arr); const tgt = fx || this.arr; const brg = gcBrg(s.lat, s.lon, tgt.lat, tgt.lon); const dist = gcNm(s.lat, s.lon, tgt.lat, tgt.lon);
    if (fx && dist < 400) return M('proceda directo a ', [fx.id, this.twyEs(fx.id)]); const h = Math.round(brg / 5) * 5; return this.hdgEsM(h, s.trk); }
  taxiInstrEs(r, E) { const T = r.via.map(n => [n, this.twyEs(n)]).flatMap((x, i) => i ? [', ', x] : [x]); const R = this.rwyEsM(E.ident);
    return this.usA(this.dep) ? M('pista ', R, ', rodaje por ', ...T, ', mantenga corto de pista ', R, ' en ', [r.hold, this.twyEs(r.hold)], ', ', this.CSp(), '.') : M('rodaje al punto de espera ', [r.hold, this.twyEs(r.hold)], ' pista ', R, ' por ', ...T, ', ', this.CSp(), '.'); }
  natEs(nat) { const m = String(nat).match(/^engine (failure|fire), engine (one|two)$/); if (m) return (m[1] === 'fire' ? 'fuego en el motor ' : 'falla de motor, motor ') + numEs(m[2] === 'one' ? 1 : 2);
    const b = String(nat).match(/^bird strike, engine (one|two) damaged$/); if (b) return 'impacto de aves, motor ' + numEs(b[1] === 'one' ? 1 : 2) + ' dañado';
    return { 'landing gear will not extend': 'el tren de aterrizaje no se extiende', 'landing gear will not extend, belly landing': 'el tren de aterrizaje no se extiende, aterrizaje de panza', 'hydraulic failure': 'falla hidráulica', 'rapid decompression, emergency descent': 'descompresión rápida, descenso de emergencia', 'electrical failure, both generators': 'falla eléctrica, ambos generadores', 'flaps jammed': 'flaps atascados', emergency: 'una emergencia', 'technical problem': 'un problema técnico' }[nat] || nat; }
  // ---- controller phrase builders for KO / JA, mirroring the Spanish builders above (the ES ones double as
  // controller builders). Used ONLY at the fixed transmission points the es/ko treatment covers — push, taxi,
  // vectors/descent, ILS clearance, go-around, divert — so no facility mixes languages inside one instruction.
  altKoM(ft, A = this.apt()) { const ta = this.ta(A); return [altD(ft, ta), ft >= ta ? '플라이트레벨 ' + digitsKo(String(Math.round(ft / 100))) : numKoW(ft) + ' 피트']; }
  altJaM(ft, A = this.apt()) { const ta = this.ta(A); return [altD(ft, ta), ft >= ta ? 'フライトレベル ' + digitsJa(String(Math.round(ft / 100))) : numJaW(ft) + ' フィート']; }
  hdgKoM(h, cur = 0) { const d = wrap180(h - cur); if (Math.abs(d) < 8) return M('헤딩 ', [hdgD(h), digitsKo(hdgD(h))]); return M(d > 0 ? '우로 선회, 헤딩 ' : '좌로 선회, 헤딩 ', [hdgD(h), digitsKo(hdgD(h))]); }
  hdgJaM(h, cur = 0) { const d = wrap180(h - cur); if (Math.abs(d) < 8) return M('ヘディング ', [hdgD(h), digitsJa(hdgD(h))]); return M(d > 0 ? '右旋回、ヘディング ' : '左旋回、ヘディング ', [hdgD(h), digitsJa(hdgD(h))]); }
  cmdAltKo(ft, cur, A = this.apt()) { return M(this.altKoM(ft, A), ft > cur ? '까지 상승하십시오' : '까지 강하하십시오'); } // Korean puts the altitude first
  cmdAltJa(ft, cur, A = this.apt()) { return M(this.altJaM(ft, A), ft > cur ? 'まで上昇してください' : 'まで降下してください'); }
  AmL(ft, A, lg) { return lg === 'es' ? this.altEsM(ft, A) : lg === 'ko' ? this.altKoM(ft, A) : lg === 'ja' ? this.altJaM(ft, A) : this.Am(ft, A); }
  cmdAltL(ft, cur, A, lg) { return lg === 'es' ? this.cmdAltEs(ft, cur, A) : lg === 'ko' ? this.cmdAltKo(ft, cur, A) : lg === 'ja' ? this.cmdAltJa(ft, cur, A) : this.cmdAlt(ft, cur, A); }
  hdgL(h, cur, lg) { return lg === 'es' ? this.hdgEsM(h, cur) : lg === 'ko' ? this.hdgKoM(h, cur) : lg === 'ja' ? this.hdgJaM(h, cur) : this.hdgM(h, cur); }
  spdL(kt, lg) { return lg === 'es' ? this.spdEsM(kt) : lg === 'ko' ? [kt + ' kt', numKoW(kt) + ' 노트'] : lg === 'ja' ? [kt + ' kt', numJaW(kt) + ' ノット'] : [kt + ' kt', digits(kt) + ' knots']; }
  dirKo(d) { return { north: '북쪽', south: '남쪽', east: '동쪽', west: '서쪽', 'north-east': '북동쪽', 'south-west': '남서쪽', 'north-west': '북서쪽', 'south-east': '남동쪽' }[d] || d; }
  dirJa(d) { return { north: '北', south: '南', east: '東', west: '西', 'north-east': '北東', 'south-west': '南西', 'north-west': '北西', 'south-east': '南東' }[d] || d; }
  routeInstrL(s, lg) { const c = this.o.ctx, fx = c.fixNear && c.fixNear(this.arr); const tgt = fx || this.arr; const brg = gcBrg(s.lat, s.lon, tgt.lat, tgt.lon); const dist = gcNm(s.lat, s.lon, tgt.lat, tgt.lon);
    if (fx && dist < 400) return lg === 'es' ? M('proceda directo a ', [fx.id, this.twyEs(fx.id)]) : lg === 'ko' ? M([fx.id, twyS(fx.id)], '로 직행하십시오') : M([fx.id, twyS(fx.id)], 'へ直行してください');
    const h = Math.round(brg / 5) * 5; return this.hdgL(h, s.trk, lg); }
  taxiInstrL(r, E, lg) { const RL = this.rwyL(E.ident, lg), hold = [r.hold, twyS(r.hold)], T = r.via.map(n => [n, lg === 'es' ? this.twyEs(n) : twyS(n)]).flatMap((x, i) => i ? [', ', x] : [x]);
    if (lg === 'es') return M('rodaje al punto de espera ', [r.hold, this.twyEs(r.hold)], ' pista ', RL, ' por ', ...T);
    if (lg === 'ko') return M('활주로 ', RL, ', ', hold, ' 지점까지 ', ...T, ' 경유, 지상활주를 허가합니다');
    return M('滑走路 ', RL, '、誘導路 ', ...T, '経由、待機地点 ', hold, 'まで走行してください'); }

  // ---------------------------------------------------------------- controller personas: one "person" per facility per airport.
  // Each persona shifts the voice slot and colours pitch / rate, so Tampa Ground is not the same human as Miami Ground,
  // and after a long stint on one frequency the shift changes (the persona rotates to a colleague).
  personaFor(kind, apt) {
    if (!this.personas) this.personas = {};
    const key = kind + '@' + (apt ? apt.icao : '?'); let p = this.personas[key];
    if (!p) { let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const DPS = [0.93, 0.97, 1.0, 1.04, 1.08], DRS = [0.95, 0.98, 1.0, 1.03];
      p = this.personas[key] = { off: h % 3, dpI: h % 5, drI: (h >>> 3) % 4, dp: DPS[h % 5], dr: DRS[(h >>> 3) % 4], n: 0 }; }
    return p;
  }
  voiceFor(who, cs, per, lang, apt) {
    const pref = this.voicePref || {};
    const byName = nm => nm && nm !== 'auto' ? (this.allVoices || []).find(v => v.name === nm) : null;
    if (who === 'ME') { // the captain + first officer. SPANISH COCKPIT (the owner's order): a pilot transmission in
      // Spanish (lang 'es' — me() stamps it, say() passes it through) draws the crew's voice from the SPANISH
      // pool; say() pairs it with the es-ES tag, and speech.js's explicit-locale path covers a stale
      // non-Spanish pick. A request in English gets the crew's English voice exactly as before (the player's
      // own pick first, then en-US, the plain English pool only when no en-US voice exists) — which is also
      // what the controller pools' FO-reservation probes ask for (voiceFor('ME', …, 'en')), so controller pool
      // composition is unchanged by the Spanish preference.
      const man = byName(pref.pilot); if (man) return man;
      if (this.pilotSpanish() && (lang || 'en') === 'es') { const ES = this.poolFor('es'); if (ES.length) { const n = Math.min(ES.length, 8); return ES[n > 2 ? 2 : n - 1]; } }
      const US = this.poolForLoc('en-us'); const V = US.length ? US : this.poolFor('en'); if (!V.length) return null; const n = Math.min(V.length, 8); return V[n > 2 ? 2 : n - 1];
    }
    const man = byName(pref.controller); if (man) return man; // a hand-picked Settings voice wins (speech.js still validates it exists)
    // ACCENT: a controller speaking English at a foreign airport takes a voice from that airport's locale
    // (aptAccent) when the machine has one — the persona slot applies within the accent pool, so facilities and
    // shift changes still separate. No accent voice installed → fall through to the plain pool, today's behaviour.
    // (OTHER — other pilots on the frequency — are not controllers and keep the plain pool.)
    if (who !== 'OTHER' && (lang || 'en') === 'en') { const acc = aptAccent(apt); if (acc) for (const tg of acc) { const V = this.poolForLoc(tg); if (!V.length) continue;
      let slots = []; for (let i = 0; i < V.length; i++) slots.push(i);
      if (V.length > 1) { const mi = V.indexOf(this.voiceFor('ME', null, null, 'en')); if (mi >= 0) slots = slots.filter(i => i !== mi); } // the FO's own voice stays reserved in English-locale pools (a no-op in es/ko/ja/ar pools)
      return V[slots[((VORD[who] ?? 0) + (per ? per.off : 0)) % slots.length]]; } }
    const V = this.poolFor(lang || 'en'); if (!V.length) return null; const n = Math.min(V.length, 8);
    if (who === 'OTHER') { let h = 0; for (const c of cs || '') h = (h * 31 + c.charCodeAt(0)) >>> 0; return V[h % n]; }
    let slots = []; for (let i = 0; i < n; i++) slots.push(i);
    if ((lang || 'en') === 'en' && n > 1) { const mi = V.indexOf(this.voiceFor('ME', null, null, 'en')); const me = mi >= 0 ? mi : (n > 2 ? 2 : n - 1); slots = slots.filter(i => i !== me); } // the FO's voice stays reserved at English airports
    return V[slots[((VORD[who] ?? 0) + (per ? per.off : 0)) % slots.length]];
  }
  say(kind, m, done, atis, cs) {
    const f = kind === 'ME' || kind === 'OTHER' ? (this.tuned || this.fac('TWR')) : this.fac(kind);
    const fac = kind === 'ME' ? this.cs : kind === 'OTHER' ? cs : f.name;
    m = { ...m, d: m.d.replace(/(^|[.!?] )([a-z])/g, (_, a, b) => a + b.toUpperCase()) }; // sentence case for the subtitles and the log (keeps lang)
    if (!atis || !this.log.length || this.log[this.log.length - 1].text !== m.d) this.log.push({ who: kind, fac, text: m.d, t: this.t, atis: !!atis, other: kind === 'OTHER' });
    if (this.log.length > 80) this.log.shift();
    this.emit();
    const A = this.audio; const est = Math.min(22, 0.9 + m.s.length * 0.06 / this.pace());
    let ended = false; const fin = () => { if (ended) return; ended = true; A && A.radioClose && A.radioClose(); this.speakingAtis = false; done && done(); };
    const speak = (kind !== 'ME' || this.speakMe) && this.audio?.voice !== false && this.voiceOn !== false;
    if (!this.voices.length) this.rankVoices();
    if (this.speech) { // shared speech manager: one queue with priorities; squelch tied to the real start / end
      const vc = VOICE[kind === 'OTHER' ? 'APP' : kind] || VOICE.TWR; let h = 0; for (const c of (cs || kind)) h = (h * 17 + c.charCodeAt(0)) >>> 0;
      const per = kind === 'ME' || kind === 'OTHER' ? null : this.personaFor(kind, f.apt);
      if (per && ++per.n % 25 === 0) { per.off = (per.off + 1) % 3; per.dpI = (per.dpI + 2) % 5; per.dp = [0.93, 0.97, 1.0, 1.04, 1.08][per.dpI]; } // shift change: a colleague takes the frequency
      const pitch = kind === 'OTHER' ? 0.82 + (h % 7) * 0.06 : Math.min(1.45, Math.max(0.6, vc.pitch * (per ? per.dp : 1))), vol = Math.min(1, ((this.audio?.vol ?? 0.7) + 0.2) * (kind === 'OTHER' ? 0.72 + (h % 5) * 0.05 : 1));
      const txLang = m.lang || 'en'; // the language of the TEXT: localized phraseology carries its own, the rest stays English — real bilingual ops
      const acc = kind === 'ME' ? (txLang === 'es' ? ['es'] : null) // Spanish cockpit: the crew explicitly requests the es locale (resolveVoice's accent contract — a Spanish voice reading the crew's Spanish, never a stale English pick)
        : kind !== 'OTHER' && txLang === 'en' ? aptAccent(f.apt) : null; // controllers (never other pilots) carry their airport's accent in English; localized text already speaks with a local voice
      const id = this.speech.say({ text: m.s, display: m.d, who: kind === 'ME' ? this.cs.toUpperCase() + ' · FO' : kind === 'OTHER' ? cs : fac, channel: atis ? 'atis' : kind === 'OTHER' ? 'chatter' : 'atc', voice: () => this.voiceFor(kind, cs, per, txLang, f.apt), accent: acc || undefined, lang: txLang === 'ko' ? 'ko-KR' : txLang === 'es' ? 'es-ES' : txLang === 'ja' ? 'ja-JP' : 'en-US',
        rate: vc.rate * (per ? per.dr : 1) * (1 + this.busy() * 0.05) * (0.96 + Math.random() * 0.08), pitch, volume: vol, mute: !speak, maxWait: kind === 'OTHER' ? 10 : 0,
        onstart: () => A && A.radioOpen && A.radioOpen(kind === 'ME', kind === 'OTHER' ? 0.6 : 1), onend: fin });
      this.speakingAtis = !!atis; return { id, est };
    }
    A && A.radioOpen && A.radioOpen(kind === 'ME', 1); setTimeout(fin, est * 1000); return { id: null, est };
  }
  txDone() {
    const x = this.tx, sp = this.speech, simT = this.t - x.t0, real = performance.now() - x.real;
    if (x.id != null && sp) { if (!((sp.cur && sp.cur.id === x.id) || sp.items.some(i => i.id === x.id))) return true; }
    else if (real > x.est * 1000) return true;
    return this.fast ? simT > x.est : real > x.est * 2500 + 5000; // watchdog
  }
  pumpTx(dt) {
    if (this.tx) { if (!this.txDone()) return; this.tx = null; this.gapT = 0.3 + Math.random() * 0.5; }
    if (this.gapT > 0) { this.gapT -= dt; return; }
    const x = this.queue[0]; if (!x) return;
    if (x.delay > 0) { x.delay -= dt; return; }
    this.queue.shift(); if (x.stale && x.stale()) return;
    if (x.who === 'STEPON') { this.audio?.stepOn && this.audio.stepOn(); this.log.push({ who: 'OTHER', fac: '—', text: '(two stations transmitting at once: squeal)', t: this.t, other: true }); this.tx = { id: null, est: 1.4, t0: this.t, real: performance.now(), chatter: true }; this.emit(); return; }
    if (x.who === 'ME') this.tune(x.kind, true); else if (!x.chatter && this.tuned?.kind !== 'ATIS' && this.tuned?.name !== this.fac(x.kind).name) this.tune(x.kind, true);
    if (x.rb) this.rb = Object.assign({ kind: x.kind, t: this.t, nag: 0 }, x.rb);
    if (x.ho) this.ho = Object.assign({ t: this.t, n: 0 }, x.ho);
    if (!x.chatter && x.who !== 'ME' && (x.rb || x.ho || x.instr)) this.lastInstr = { kind: x.kind, m: x.m, t: this.t };
    const r = this.say(x.who === 'ME' ? 'ME' : x.who === 'OTHER' ? 'OTHER' : x.kind, x.m, null, false, x.cs);
    this.tx = { id: r.id, est: r.est, t0: this.t, real: performance.now(), chatter: !!x.chatter }; if (x.chatter) this.chatLog.push(this.t);
    x.then && x.then(); this.emit();
  }
  update(dt) {
    this.t += dt; if (!this.o) return;
    try { this.pumpTx(dt); this.fT = (this.fT || 0) + dt; if (this.fT >= 0.25) { const d = this.fT; this.fT = 0; this.follow(d); this.chatter(d); this.assistStep(); } } // the controller looks at the scope 4x a second
    catch (e) { if (this.errors.length < 20) this.errors.push(String(e && e.stack || e)); }
    if (this.auto && !this.queue.length && !this.tx) { this.autoT += dt; if (this.autoT > 2.5) { this.autoT = 0; const o = this.options().find(o => o.auto); if (o) this.choose(o.id); } } else this.autoT = 0;
  }
  // Easy assist: the first officer reads back and checks in if you have not after a while
  assistStep() {
    if (this.auto || this.queue.length || this.tx || !this.easy()) return;
    if (this.rb && this.t - this.rb.t > 9) { this.note('First officer: read back “' + this.rb.label + '”'); this.choose('rb'); return; }
    if (this.ho && !this.rb && this.t - this.ho.t > 40) { this.note('First officer: switched to ' + this.fac(this.ho.to, this.ho.apt).name); this.choose('ho'); }
  }
  // ---------------------------------------------------------------- the living frequency: other aircraft
  chatter(dt) {
    if (this.chatterOn === false || !this.tuned || ['ATIS', 'DEL'].includes(this.tuned.kind)) return;
    this.chatT = (this.chatT ?? 12) - dt; if (this.chatT > 0 || this.queue.length || this.tx) return;
    if (this.flags.emer || this.rb || this.ho || this.t - (this.lastMeT ?? -99) < 10 || ['twr_hold', 'lineup', 'takeoff_clr', 'go_around'].includes(this.phase)) { this.chatT = 6; return; } // never step on your calls
    const s = this.ctxS(); if (ARR_TWR.has(this.phase) && !s.onGround && s.aglFt < 1500) { this.chatT = 8; return; }
    this.chatT = 26 + Math.random() * 30;
    const k = this.tuned.kind, A = this.tuned.apt, F = this.tuned.name, c = this.o.ctx; const w = this.windM(); const ta = this.ta(A);
    const lines = REGION_CS[A.cc] || REGION_CS.default; const air = this.pick('air', lines); const num = String(100 + Math.floor(Math.random() * 880));
    const cs = air + ' ' + num, csS = air + ' ' + digits(num);
    const E = (k === 'TWR' || k === 'GND') ? (A === this.dep && DEP_PH.has(this.phase) ? this.o.depEnd : c.arrEnd()) : c.arrEnd(); const r = E ? E.ident : '27';
    const R = this.rwyM(r); const CS = [cs, csS];
    const twy = this.pick('twy', ['A', 'B', 'C', 'J', 'K']) + (Math.random() < 0.5 ? String(1 + (Math.random() * 4 | 0)) : '');
    const alt = (5 + (Math.random() * 6 | 0)) * 1000, alt2 = alt - 2000, AA = ft => [altD(ft, ta), altS(ft, ta)];
    const stepOn = Math.random() < 0.07;
    const ai = c.traffic ? c.traffic().find(a => !a.called && (k === 'TWR' ? (a.kind === 'arr' && a.s > -9000 && a.s < -1500) || (a.kind === 'dep' && a.hold > 0) : false)) : null;
    if (ai) { ai.called = true; ai.cs = ai.cs || cs; }
    const scripts = {
      GND: () => { this.other(k, cs, M(F, ', ', CS, ', ', this.hello(), ', stand ', [String(2 + (Math.random() * 20 | 0)), ''], ', request taxi.'), 0.2); this.atc(k, M(CS, ', runway ', R, ', taxi via ', [twy, twyS(twy)], ', hold short runway ', R, '.'), 1.2, null, { chatter: true }); this.other(k, cs, M('Runway ', R, ' via ', [twy, twyS(twy)], ', hold short, ', CS, '.'), 0.8); },
      TWR: () => {
        if (ai && ai.kind === 'dep') { this.atc(k, M([ai.cs, ai.cs], ', ', w, ', runway ', R, ', cleared for takeoff.'), 0.3, null, { chatter: true }); this.other(k, ai.cs, M('Cleared for takeoff ', R, ', ', [ai.cs, ai.cs], '.'), 0.7); return; }
        const n = ai ? Math.max(2, Math.round(-ai.s / 1852)) : 3 + (Math.random() * 6 | 0); const c2 = ai ? [ai.cs, ai.cs] : CS;
        this.other(k, c2[0], M(F, ', ', c2, ', ', [String(n), String(n)], ' mile final runway ', R, '.'), 0.2);
        if (stepOn) { this.push({ who: 'STEPON', kind: k, delay: 0.2, chatter: true }); this.atc(k, M(this.pick('blk', ['Blocked, say again.', 'Two stations at once, last station say again.', 'Blocked, aircraft calling final, say again.'])), 0.6, null, { chatter: true }); this.other(k, c2[0], M(F, ', ', c2, ', ', [String(n), String(n)], ' mile final, ', R, '.'), 0.6); }
        this.atc(k, M(c2, ', ', w, ', runway ', R, ', cleared to land.'), 1.0, null, { chatter: true }); this.other(k, c2[0], M('Cleared to land ', R, ', ', c2, '.'), 0.7);
      },
      APP: () => { this.other(k, cs, M(F, ', ', CS, ', ', AA(alt), ' descending ', AA(alt2), ', information ', this.atisLetter(A), '.'), 0.2); this.atc(k, M(CS, ', ', F, ', ', this.pick('ident', ['radar contact, ', '', 'roger, ']), this.cmdAlt(alt2 - 1000, alt, A), ', expect I L S runway ', R, '.'), 1.1, null, { chatter: true }); this.other(k, cs, M(this.cmdAlt(alt2 - 1000, alt, A), ', I L S ', R, ', ', CS, '.'), 0.7); },
      DEP: () => { const fl = (180 + (Math.random() * 10 | 0) * 10) * 100; this.other(k, cs, M(F, ', ', CS, ', ', AA(alt2), ' climbing ', AA(alt), '.'), 0.2); this.atc(k, M(CS, ', ', F, ', radar contact, ', this.cmdAlt(fl, alt, A), '.'), 1.0, null, { chatter: true }); this.other(k, cs, M(this.cmdAlt(fl, alt, A), ', ', CS, '.'), 0.7); },
      CTR: () => { const fl = (300 + (Math.random() * 8 | 0) * 10) * 100, hd = 10 * (1 + (Math.random() * 35 | 0)); if (Math.random() < 0.5) { this.other(k, cs, M(F, ', ', CS, ', level ', AA(fl), '.'), 0.2); this.atc(k, M(CS, ', ', F, ', roger.'), 0.9, null, { chatter: true }); } else { this.atc(k, M(CS, ', ', this.hdgM(hd, hd + 40), ', direct when able.'), 0.3, null, { chatter: true }); this.other(k, cs, M(this.hdgM(hd, hd + 40), ', ', CS, '.'), 0.8); } },
    };
    if (scripts[k]) scripts[k]();
  }
  // ---------------------------------------------------------------- what the pilot can say now (short; the first one is the smart "next step")
  options() {
    const c = this.o?.ctx; if (!c) return []; const s = c.state(); const p = this.phase; const out = []; const E = this.o.depEnd;
    const add = (id, kind, label, auto = true, pri = true, apt) => out.push({ id, kind, label, auto, pri, freq: fmtF(this.fac(kind, apt)) });
    if (this.rb) add('rb', this.rb.kind, 'Read back: ' + this.rb.label);
    else if (this.ho) { const F = this.fac(this.ho.to, this.ho.apt); add('ho', this.ho.to, `${this.ho.skipBye ? 'Call' : 'Switch to'} ${F.name} ${fstr(F.mhz)}${this.ho.to === 'GND' ? ': request taxi to the gate' : this.ho.to === 'TWR' && DEP_PH.has(p) ? ': ready for departure' : ''}`, true, true, this.ho.apt); }
    else if (!this.waiting()) switch (p) {
      case 'gate': add('clr', 'DEL', `Request IFR clearance to ${this.city(this.arr)}`); break;
      case 'clr_ok': add('push', 'GND', 'Request pushback and start'); break;
      case 'pushed': add('taxi', 'GND', 'Request taxi'); break;
      case 'taxiing': if (c.nearHold() || s.onDepRwy) add('ready', 'TWR', `Tower: holding short ${E.ident}, ready for departure`); break;
      case 'rwy_start': add('ready', 'TWR', `Ready for departure, runway ${E.ident}`); break;
      case 'ctr': if (!this.flags.desc && s.distArrNm < this.todNm(s) + 40) add('descent', 'CTR', 'Request descent', s.distArrNm < this.todNm(s) + 5); break;
      case 'app': if (!this.flags.appClr && s.distArrNm < 40) add('ils', 'APP', `Request the ILS runway ${c.arrEnd().ident}`, false, false); break;
    }
    const em = c.emergency && c.emergency();
    if (this.flags.emer && !this.waiting() && (!em || (s.onGround && s.gsKt < 5))) add('cancel', this.curK(), s.onGround ? `Cancel ${this.flags.emer === 'mayday' ? 'MAYDAY' : 'PAN-PAN'}, vacate the runway` : `Cancel ${this.flags.emer === 'mayday' ? 'MAYDAY' : 'PAN-PAN'}`, false, true);
    if (this.atisWanted(s)) { const A = this.apt(); add('atis', 'ATIS', `Listen to ATIS (${this.city(A)})`, false, false); }
    if (this.flags.tfc) { const k = this.tuned?.kind || 'APP'; add('tfc_sight', k, 'Traffic in sight', false, false); add('tfc_look', k, 'Looking for the traffic', true, false); }
    // diversion (pilot's choice, never auto): offer the nearest suitable airport while airborne. An active
    // emergency runs its own divert through declare(), so this is only for a voluntary diversion — or for
    // cancelling one and continuing to the planned destination.
    if (!s.onGround && !this.flags.emer && !this.rb && !this.ho && !this.waiting()) {
      if (this.divertApt) add('canceldiv', this.curK(), `Cancel diversion — continue to ${this.city(this.divertedFrom || this.arr)}`, false, false);
      else { const dv = c.divert && c.divert(); if (dv && dv.apt && dv.apt !== this.arr) add('divert', this.curK(), `Divert to ${this.city(dv.apt)} (${dv.apt.icao}) — nearest suitable${dv.distNm != null ? ', ' + Math.round(dv.distNm) + ' NM' : ''}`, false, false); }
    }
    if (this.lastInstr && this.t - this.lastInstr.t < 150 && !this.waiting()) add('sayagain', this.lastInstr.kind, 'Say again', false, false);
    // emergencies always come LAST in the list (number keys of normal calls never shift onto them). With a real failure they are offered
    // directly; without one they sit behind an 'Emergency…' entry that needs a second, deliberate confirm (opened menu times out after 20 s)
    if (!this.flags.emer && (!s.onGround || s.gsKt > 30 || em)) { const k = this.curK(), ask = this.emerAsk != null && this.t - this.emerAsk < 20;
      if (em) { add('mayday', k, `MAYDAY: ${em.nature}`, false, em.kind === 'mayday'); add('pan', k, `PAN-PAN: ${em.nature}`, false, em.kind === 'pan'); }
      else if (ask) { add('emer_back', k, 'Back: no emergency', false, false); add('mayday', k, 'Confirm MAYDAY (distress)', false, false); add('pan', k, 'Confirm PAN-PAN (urgency)', false, false); }
      else add('emer_menu', k, 'Emergency… (MAYDAY / PAN-PAN)', false, false); }
    return out;
  }
  atisWanted(s) { if (this.atisOn) return false; const p = this.phase; if (s.onGround) return ['gate', 'clr_ok', 'pushing', 'pushed', 'rwy_start'].includes(p); return ['ctr', 'to_ctr', 'to_app', 'app'].includes(p) && s.distArrNm < 140 && this.heard[this.arr.icao] !== this.atisLetter(this.arr); }
  todNm(s) { return 38 + Math.max(0, (s.altFt - this.bottom) / 1000) * 3; }
  // ---------------------------------------------------------------- pilot choice → transmission(s) and the controller's reply
  choose(id) {
    const c = this.o?.ctx; if (!c) return; const CS = this.CSm();
    switch (id) {
      case 'atis': this.tune('ATIS'); return;
      case 'sayagain': { const L = this.lastInstr; if (!L) return; this.me(L.kind, this.pilotSpanish() ? M('Repita, ', this.CSp(), '.') : M('Say again, ', CS, '.')); this.atc(L.kind, L.m, 1.3, null, { reply: true }); return; }
      case 'tfc_look': { const k = this.tuned?.kind || 'APP'; this.flags.tfc = false; this.me(k, this.pilotSpanish() ? M(this.pick('lookEs', ['Buscando, ', 'Buscando el tráfico, ', 'Sin contacto, buscando, ']), this.CSp(), '.') : M(this.pick('look', ['Looking, ', 'Looking for the traffic, ', 'Negative contact, looking, ']), CS, '.')); this.atc(k, M(CS, ', ', this.pick('tfcAck', ['roger, I will advise.', 'roger.', 'roger, traffic no factor.'])), 1.6, null, { reply: true }); this.emit(); return; }
      case 'tfc_sight': { const k = this.tuned?.kind || 'APP'; this.flags.tfc = false; this.me(k, this.pilotSpanish() ? M(this.pick('sightEs', ['Tráfico a la vista, ', 'Tengo el tráfico, ', 'A la vista, ']), this.CSp(), '.') : M(this.pick('sight', ['Traffic in sight, ', 'Got the traffic, ', 'In sight, ']), CS, '.')); this.atc(k, M(CS, ', ', this.pick('vis', ['thank you.', 'roger, maintain visual separation.', 'thanks.'])), 1.6, null, { reply: true }); this.emit(); return; }
      case 'rb': return this.readback();
      case 'ho': return this.checkIn();
      case 'clr': return this.reqClearance();
      case 'push': return this.reqPush();
      case 'taxi': return this.reqTaxi();
      case 'ready': return this.reqDeparture();
      case 'descent': return this.reqDescent();
      case 'emer_menu': this.emerAsk = this.t; this.emit(); return;
      case 'emer_back': this.emerAsk = null; this.emit(); return;
      case 'mayday': case 'pan': this.emerAsk = null; return this.declare(id);
      case 'cancel': return this.cancelEmer();
      case 'divert': return this.requestDivert();
      case 'canceldiv': return this.cancelDivert();
      case 'ils': { const re = c.arrEnd(); this.me('APP', this.pilotSpanish() ? M(this.fac('APP').name, ', ', this.CSp(), ', solicito aproximación I L S a la pista ', this.rwyEsM(re.ident), '.') : M(this.fac('APP').name, ', ', CS, ', request the I L S runway ', this.rwyM(re.ident), '.')); this.atc('APP', M(CS, ', roger, expect vectors for the I L S runway ', this.rwyM(re.ident), '.'), 1.6, null, { reply: true }); this.flags.ilsReq = true; return; }
    }
  }
  // the first officer reads back the pending instruction; some units confirm ("readback correct"), then whatever it unlocks happens
  readback() {
    const r = this.rb; if (!r) return; this.rb = null; this.me(r.kind, this.pilotSpanish() && r.mEs ? r.mEs : r.m); // Spanish cockpit: the FO reads back the Spanish twin when the clearance carried one
    if (r.fcu) this.o.ctx.fcu && this.o.ctx.fcu(r.fcu);
    if (r.ok) this.atc(r.kind, r.ok, 1.4, null, { reply: true }); r.then && r.then(); this.emit();
  }
  assignAlt(ft) { this.alt = { ft, t: this.t, reached: false, warnT: -1e9 }; }
  assignHdg(h, fix) { this.hdgA = h == null ? null : { hdg: h, fix, t: this.t, bad: 0, warnT: -1e9 }; }
  assignSpd(kt) { this.spdA = kt == null ? null : { kt, t: this.t, warnT: -1e9 }; }
  reqClearance() {
    const dep = this.dep, arr = this.arr, CS = this.CSm(), CPS = this.CSp(), D = this.fac('DEL'), us = this.usA(dep), dF = this.fac('DEP'), sq = [this.squawk, digits(this.squawk)];
    this.me('DEL', this.pilotSpanish() ? M(D.name, ', ', CPS, ', ', this.maybeHiEs(), 'puerta ', [this.o.gate, digitsEs(this.o.gate)], this.infoEsM(dep), ', solicito autorización I F R a ', this.city(arr), '.') : M(D.name, ', ', CS, ', ', this.maybeHi(), 'gate ', [this.o.gate, digits(this.o.gate)], this.infoM(dep), ', request I F R clearance to ', this.city(arr), '.'));
    const exp = this.cruise > this.init ? M(', expect ', this.Am(this.cruise, dep), ' one zero minutes after departure') : '';
    const sidM = this.pick('sid', [M('via the ', this.sid, ' departure, radar vectors, then as filed'), M('via the ', this.sid, ' departure, then as filed'), M(this.sid, ' departure, radar vectors, then as filed')]);
    const m = us ? M(CS, ', ', this.idM('DEL'), this.maybeHiL(dep, 0.3), this.infoChk(dep), 'cleared to ', this.city(arr), ' airport ', sidM, '. ', this.cmdAlt(this.init, 0, dep), exp, '. Departure frequency ', this.freqM(dF), ', squawk ', sq, '.')
      : M(CS, ', ', this.idM('DEL'), this.maybeHiL(dep, 0.3), this.infoChk(dep), 'cleared to ', this.city(arr), ' ', sidM, '. ', this.cmdAlt(this.init, 0, dep), '. Squawk ', sq, ', departure frequency ', this.freqM(dF), '.');
    const rbm = M('Cleared to ', this.city(arr), ' via the ', this.sid, ' departure, radar vectors, ', this.cmdAlt(this.init, 0, dep), ', departure ', this.freqM(dF), ', squawk ', sq, ', ', CS, '.');
    const rbmEs = M('Autorizado a ', this.city(arr), ' vía la salida ', this.sid, ', vectores radar, ', this.cmdAltEs(this.init, 0, dep), ', frecuencia de salida ', this.freqEsM(dF), ', código ', [this.squawk, digitsEs(this.squawk)], ', ', CPS, '.');
    const lgC = aptLang(dep);
    let ok;
    if (lgC === 'ja') ok = M(this.csM2('ja'), '、復唱は正確です', this.pick('gndNextJa', ['。', '。プッシュバックの準備ができたら、', '。']), this.fac('GND').name, ' ', this.freqL(this.fac('GND'), 'ja'), 'に連絡してください。'); // JA/KO word order: the contact instruction follows the facility + frequency
    else if (lgC === 'ko') ok = M(this.csM2('ko'), ', 정확히 복장했습니다', this.pick('gndNextKo', ['. ', '. 푸시백 준비가 되면, ', '. ']), this.fac('GND').name, ' ', this.freqL(this.fac('GND'), 'ko'), '로 연락하십시오.');
    else if (lgC === 'es') ok = M(this.csM2('es'), ', lectura correcta', this.pick('gndNextEs', ['. ', '. Cuando esté listo para el retroceso, ', '. ']), M(this.pick('cmVe', ['contacte ', 'contacte ', 'pase a ']), this.fac('GND').name, ' ', this.freqL(this.fac('GND'), 'es'), '.'));
    else ok = M(this.csM2(lgC), ', ', 'readback correct', this.pick('gndNext', ['. ', '. When ready to push, ', '. ']), M(this.pick('gndN2', ['contact ', 'call ']), this.fac('GND').name, ' ', this.freqM(this.fac('GND')), '.'));
    if (lgC !== 'en') ok.lang = lgC;
    this.atc('DEL', m, 2.2, null, { reply: true, rb: { label: `${this.city(arr)} via ${this.sid}, ${altD(this.init, this.ta(dep))}, squawk ${this.squawk}`, m: rbm, mEs: rbmEs, ok, fcu: { alt: this.init }, then: () => { this.setPhase('clr_ok'); } } });
  }
  reqPush() {
    const c = this.o.ctx, CS = this.CSm(), CPS = this.CSp(), G = this.fac('GND'), E = this.o.depEnd;
    this.me('GND', this.pilotSpanish() ? M(G.name, ', ', CPS, ', ', this.maybeHiEs(0.3), 'puerta ', [this.o.gate, digitsEs(this.o.gate)], this.contacted.has(this.fac('DEL').name) ? '' : this.infoEsM(this.dep), ', ', this.pick('pushReqEs', ['solicito retroceso y arranque', 'listo para retroceso y arranque', 'solicito retroceso']), '.') : M(G.name, ', ', CS, ', ', this.maybeHi(0.3), 'gate ', [this.o.gate, digits(this.o.gate)], this.contacted.has(this.fac('DEL').name) ? '' : this.infoM(this.dep), ', ', this.pick('pushReq', ['request push and start', 'ready to push and start', 'request pushback']), '.'));
    const face = c.pushFace(), tail = this.pick('face', ['face ', 'tail ']); const dirW = tail === 'face ' ? face : { north: 'south', south: 'north', east: 'west', west: 'east', 'north-east': 'south-west', 'south-west': 'north-east', 'north-west': 'south-east', 'south-east': 'north-west' }[face] || face;
    const expR = Math.random() < 0.5, app = M(this.pick('pushOk', ['push and start approved, ', 'push and start at your discretion, ', 'push approved, ']), tail, dirW);
    const lg = aptLang(this.dep); // push approval in the airport's language (es/ko/ja); the pilot's rb below stays the EN summary, as at every localized site
    let appTx = app, expTx = expR ? M(', expect runway ', this.rwyM(E.ident)) : '';
    if (lg === 'es') { appTx = M(this.pick('pushOkEs', ['retroceso y arranque aprobado, ', 'retroceso y arranque a su discreción, ', 'retroceso aprobado, ']), tail === 'face ' ? 'cara ' : 'cola ', this.dirEs(dirW)); expTx = expR ? M(', espere la pista ', this.rwyL(E.ident, 'es')) : ''; }
    else if (lg === 'ko') { appTx = M(this.pick('pushOkKo', ['푸시백과 엔진 시동을 허가합니다, ', '푸시백을 허가합니다, ']), tail === 'face ' ? '기수 ' : '꼬리 ', this.dirKo(dirW), ' 방향'); expTx = expR ? M(', 활주로 ', this.rwyL(E.ident, 'ko'), ' 예상') : ''; }
    else if (lg === 'ja') { appTx = M(this.pick('pushOkJa', ['プッシュバックとエンジン始動を許可します、', 'プッシュバックを許可します、']), tail === 'face ' ? 'フェイシング ' : 'テール ', this.dirJa(dirW)); expTx = expR ? M('、滑走路 ', this.rwyL(E.ident, 'ja'), 'を予定してください') : ''; }
    const gm = M(lg === 'en' ? CS : this.csM2(lg), ', ', this.idM('GND'), this.maybeHiL(this.dep, 0.25), appTx, expTx, lg === 'ja' ? '' : '.'); if (lg !== 'en') gm.lang = lg;
    this.atc('GND', gm, 2, null,
      { reply: true, rb: { label: `push and start, ${tail}${dirW}`, m: M(cap(app), ', ', CS, '.'), mEs: M('Retroceso y arranque aprobado, ', tail === 'face ' ? 'cara ' : 'cola ', this.dirEs(dirW), ', ', CPS, '.'), then: () => { this.setPhase('pushing'); if (!c.pushing()) c.startPushback(); } } });
  }
  taxiInstr(r, E) { // US: "runway 19R, taxi via B, A, hold short runway 19R at A1"; ICAO: "taxi to holding point A1 runway 19R via B, A"
    const T = r.via.map(n => [n, twyS(n)]).flatMap((x, i) => i ? [', ', x] : [x]); const R = this.rwyM(E.ident);
    return this.usA(this.dep) ? M('runway ', R, ', taxi via ', ...T, ', hold short runway ', R, ' at ', [r.hold, twyS(r.hold)]) : M('taxi to holding point ', [r.hold, twyS(r.hold)], ' runway ', R, ' via ', ...T);
  }
  issueTaxi(delay, prefix) {
    const c = this.o.ctx, CS = this.CSm(), E = this.o.depEnd; const r = c.taxiOut(); this.taxiRoute = r; const ins = this.taxiInstr(r, E);
    const lg = aptLang(this.dep); // taxi instruction in the airport's language; rb.m below keeps the EN build (established summary contract)
    const gm = M(lg === 'en' ? CS : this.csM2(lg), ', ', this.idM('GND'), prefix || '', lg === 'en' ? ins : this.taxiInstrL(r, E, lg), lg === 'ja' ? '' : '.'); if (lg !== 'en') gm.lang = lg;
    this.atc('GND', gm, delay, () => { c.showTaxi(r); this.setPhase('taxiing'); },
      { reply: true, rb: { label: `taxi via ${r.via.join(', ')}, hold short ${E.ident} at ${r.hold}`, m: M(cap(ins), ', ', CS, '.'), mEs: M(cap(this.taxiInstrEs(r, E)), ', ', this.CSp(), '.') } });
  }
  reqTaxi() { const CS = this.CSm(); this.me('GND', this.pilotSpanish() ? M(this.contacted.has(this.fac('GND').name) ? '' : this.fac('GND').name + ', ', this.CSp(), ', solicito rodaje.') : M(this.contacted.has(this.fac('GND').name) ? '' : this.fac('GND').name + ', ', CS, ', request taxi.')); this.issueTaxi(2); }
  reqDeparture(viaHo) {
    const CS = this.CSm(), E = this.o.depEnd, T = this.fac('TWR'), s = this.ctxS(); const onRwy = this.phase === 'rwy_start' || s.onDepRwy;
    this.me('TWR', this.pilotSpanish() ? M(T.name, ', ', this.CSp(), ', ', onRwy ? M('pista ', this.rwyEsM(E.ident), ', listo para la salida.') : M('manteniendo corto de pista ', this.rwyEsM(E.ident), ', listo para la salida.')) : M(T.name, ', ', CS, ', ', onRwy ? M('runway ', this.rwyM(E.ident), ', ready for departure.') : M('holding short runway ', this.rwyM(E.ident), ', ready for departure.')), viaHo ? 0.9 : 0);
    this.towerDep(2, onRwy);
  }
  towerDep(delay, onRwy) {
    const c = this.o.ctx, CS = this.CSm(), E = this.o.depEnd, R = this.rwyM(E.ident); const b = c.runwayBusy(this.dep, E); const id = this.idM('TWR');
    if (b.busy) { const lg = aptLang(this.dep);
      if (lg !== 'en') { const CL = this.csM2(lg), RL = this.rwyL(E.ident, lg); // frame localized; the reason (b.why) is dynamic and stays English
        const hs = lg === 'es' ? (onRwy ? M('mantenga posición, ', b.why) : M('mantenga corto de la pista ', RL, ', ', b.why)) : lg === 'ko' ? (onRwy ? M('위치를 유지하십시오, ', b.why) : M('활주로 ', RL, ' 앞에서 대기하십시오, ', b.why)) : (onRwy ? M('位置を保持してください、', b.why) : M('滑走路 ', RL, ' 手前で待機してください、', b.why));
        const m = M(CL, ', ', id, hs, '.'); m.lang = lg;
        this.atc('TWR', m, delay, () => this.setPhase('twr_hold'), { reply: true, rb: { label: onRwy ? 'hold position' : `hold short ${E.ident}`, m: M(onRwy ? 'Holding position' : M('Holding short runway ', R), ', ', CS, '.'), mEs: M(onRwy ? 'Mantengo posición' : M('Mantengo corto de pista ', this.rwyEsM(E.ident)), ', ', this.CSp(), '.') } }); return; }
      const hs = onRwy ? M('hold position, ', b.why) : M('hold short runway ', R, ', ', b.why); this.atc('TWR', M(CS, ', ', id, hs, '.'), delay, () => this.setPhase('twr_hold'), { reply: true, rb: { label: onRwy ? 'hold position' : `hold short ${E.ident}`, m: M(onRwy ? 'Holding position' : M('Holding short runway ', R), ', ', CS, '.'), mEs: M(onRwy ? 'Mantengo posición' : M('Mantengo corto de pista ', this.rwyEsM(E.ident)), ', ', this.CSp(), '.') } }); return; }
    if (onRwy || Math.random() < 0.55) this.clearTakeoff(delay, id); else this.lineUp(delay, id);
  }
  lineUp(delay, id = '') { const CS = this.CSm(), E = this.o.depEnd, R = this.rwyM(E.ident), lg = aptLang(this.dep);
    if (lg !== 'en') { const CL = this.csM2(lg), RL = this.rwyL(E.ident, lg);
      const m = lg === 'es' ? M(CL, ', ', id, this.pick('luawEs', [M('pista ', RL, ', alíniese y espere.'), M('alíniese y espere, pista ', RL, '.')]))
        : lg === 'ko' ? M(CL, ', ', id, '활주로 ', RL, ', 정렬하고 대기하십시오.')
        : M(CL, ', ', id, this.pick('luawJa', [M('滑走路 ', RL, '、進入して待機してください。'), M('滑走路 ', RL, '、ラインナップして待機してください。')])); m.lang = lg;
      this.atc('TWR', m, delay, () => this.setPhase('lineup'), { reply: true, rb: { label: `line up and wait ${E.ident}`, m: M('Line up and wait runway ', R, ', ', CS, '.'), mEs: M('Me alineo y espero, pista ', this.rwyEsM(E.ident), ', ', this.CSp(), '.') } }); return; }
    const m = this.pick('luaw', [M('runway ', R, ', line up and wait.'), M('line up and wait, runway ', R, '.'), M('runway ', R, ', line up.')]); this.atc('TWR', M(CS, ', ', id, m), delay, () => this.setPhase('lineup'), { reply: true, rb: { label: `line up and wait ${E.ident}`, m: M('Line up and wait runway ', R, ', ', CS, '.'), mEs: M('Me alineo y espero, pista ', this.rwyEsM(E.ident), ', ', this.CSp(), '.') } }); }
  clearTakeoff(delay, id = '') {
    const E = this.o.depEnd, CS = this.CSm(), R = this.rwyM(E.ident), lg = aptLang(this.dep);
    const calm = this.wx().kt < 3 && Math.random() < 0.5; // a calm wind is often simply not mentioned
    if (lg !== 'en') { const CL = this.csM2(lg), RL = this.rwyL(E.ident, lg), wp = calm ? null : this.windL(this.dep, lg);
      const m = lg === 'es' ? M(CL, ', ', id, wp ? M(wp, ', ') : '', 'pista ', RL, ', autorizado a despegar.')
        : lg === 'ko' ? M(CL, ', ', id, wp ? M(wp, ', ') : '', '활주로 ', RL, ', 이륙을 허가합니다.')
        : M(CL, ', ', id, this.pick('toJa', [M(wp ? M(wp, '、') : '', '滑走路 ', RL, '、離陸を許可します。'), M('滑走路 ', RL, '、離陸を許可します', wp ? M('。', wp, '。') : '。')])); m.lang = lg;
      this.atc('TWR', m, delay, () => { this.setPhase('takeoff_clr'); this.flags.tkoClr = true; }, { reply: true, rb: { label: `cleared for takeoff ${E.ident}`, m: M('Cleared for takeoff runway ', R, ', ', CS, '.'), mEs: M('Autorizado a despegar, pista ', this.rwyEsM(E.ident), ', ', this.CSp(), '.') } }); return; }
    const wp = calm ? null : this.windM();
    const m = Math.random() < 0.55 ? M(CS, ', ', id, wp ? M(wp, ', ') : '', 'runway ', R, ', cleared for takeoff.')
      : M(CS, ', ', id, 'runway ', R, ', cleared for takeoff', wp ? M(', ', wp) : '', '.');
    this.atc('TWR', m, delay, () => { this.setPhase('takeoff_clr'); this.flags.tkoClr = true; }, { reply: true, rb: { label: `cleared for takeoff ${E.ident}`, m: M('Cleared for takeoff runway ', R, ', ', CS, '.'), mEs: M('Autorizado a despegar, pista ', this.rwyEsM(E.ident), ', ', this.CSp(), '.') } });
  }
  clearLanding(delay, pre) {
    const re = this.o.ctx.arrEnd(), CS = this.CSm(), R = this.rwyM(re.ident), lg = aptLang(this.arr);
    const calm = this.wx().kt < 3 && Math.random() < 0.5;
    if (lg !== 'en') { const CL = this.csM2(lg), RL = this.rwyL(re.ident, lg), wp = calm ? null : this.windL(this.arr, lg);
      const emer = this.flags.emer ? (lg === 'es' ? ', los bomberos están en espera' : lg === 'ko' ? ', 소방 구조대가 대기 중입니다' : '、消防救助隊が待機しています') : '';
      const preL = pre ? (lg === 'es' ? '¿me recibe? ' : lg === 'ko' ? '잘 들리십니까? ' : '聞こえますか？ ') : '';
      const m = lg === 'es' ? M(CL, ', ', this.idM('TWR'), preL, !pre && !this.flags.emer && Math.random() < 0.3 ? 'es el número uno, ' : '', wp ? M(wp, ', ') : '', 'pista ', RL, ', autorizado a aterrizar', emer, '.')
        : lg === 'ko' ? M(CL, ', ', this.idM('TWR'), preL, wp ? M(wp, ', ') : '', '활주로 ', RL, ', 착륙을 허가합니다', emer, '.')
        : M(CL, ', ', this.idM('TWR'), preL, wp ? M(wp, '、') : '', '滑走路 ', RL, '、着陸を許可します', emer, '。'); m.lang = lg;
      this.atc('TWR', m, delay, () => { this.setPhase('land_clr'); this.ho = null; }, { reply: true, rb: { label: `cleared to land ${re.ident}`, m: M('Cleared to land runway ', R, ', ', CS, '.'), mEs: M('Autorizado a aterrizar, pista ', this.rwyEsM(re.ident), ', ', this.CSp(), '.') } }); return; }
    const wp = calm ? null : this.windM();
    const emer = this.flags.emer ? ', fire and rescue are standing by' : '';
    const shape = Math.random();
    const m = shape < 0.3 && !pre && !this.flags.emer ? M(CS, ', ', this.idM('TWR'), 'you\'re number one, ', wp ? M(wp, ', ') : '', 'runway ', R, ', cleared to land.')
      : shape < 0.6 ? M(CS, ', ', this.idM('TWR'), pre || '', 'runway ', R, ', cleared to land', wp ? M(', ', wp) : '', emer, '.')
      : M(CS, ', ', this.idM('TWR'), pre || '', wp ? M(wp, ', ') : '', 'runway ', R, ', cleared to land', emer, '.');
    this.atc('TWR', m, delay, () => { this.setPhase('land_clr'); this.ho = null; }, { reply: true, rb: { label: `cleared to land ${re.ident}`, m: M('Cleared to land runway ', R, ', ', CS, '.'), mEs: M('Autorizado a aterrizar, pista ', this.rwyEsM(re.ident), ', ', this.CSp(), '.') } });
  }
  // direct to a real navaid near the destination when there is one, else a vector toward it
  routeInstr(s) {
    const c = this.o.ctx, fx = c.fixNear && c.fixNear(this.arr); const tgt = fx || this.arr; const brg = gcBrg(s.lat, s.lon, tgt.lat, tgt.lon); const dist = gcNm(s.lat, s.lon, tgt.lat, tgt.lon);
    if (fx && dist < 400) return { m: M('proceed direct ', [fx.id, twyS(fx.id)]), label: 'direct ' + fx.id, hdg: Math.round(brg), fix: fx };
    const h = Math.round(brg / 5) * 5; return { m: this.hdgM(h, s.trk), label: 'heading ' + hdgD(h), hdg: h, fix: null };
  }
  checkIn() {
    const h = this.ho; if (!h) return; const c = this.o.ctx, s = this.ctxS(), CS = this.CSm(), ES = this.pilotSpanish(), CPS = this.CSp(); const F = this.fac(h.to, h.apt), old = this.fac(h.from);
    if (!h.skipBye) this.me(h.from, ES ? M(this.freqEsM(F), ', ', Math.random() < 0.75 ? this.byeEs() + ', ' : '', CPS, '.') : M(this.freqM(F), ', ', Math.random() < 0.75 ? this.bye(old.apt) + ', ' : '', CS, '.'));
    this.ho = null; if (h.to === 'CTR' && h.apt) this.ctrApt = h.apt; const d = h.skipBye ? 0 : 1.1;
    switch (h.to) {
      case 'TWR': if (DEP_PH.has(this.phase)) { this.reqDeparture(true); return; }
        { const re = c.arrEnd(), nm = Math.max(1, Math.round(s.thrNm)); this.me('TWR', ES ? M(F.name, ', ', CPS, ', a ', [String(nm), numEsW(nm)], ' millas en final, aproximación I L S a la pista ', this.rwyEsM(re.ident), '.') : M(F.name, ', ', CS, ', ', [String(nm), digits(nm)], ' mile final, I L S runway ', this.rwyM(re.ident), '.'), d);
          const b = c.runwayBusy(this.arr, re);
          if (b.busy) { const lgT = aptLang(this.arr); const cm = lgT === 'en' ? M(CS, ', ', this.idM('TWR'), this.pick('cont', ['continue approach, ', 'continue inbound, ', 'continue the approach, ']), b.why, '.')
            : M(this.csM2(lgT), ', ', this.idM('TWR'), lgT === 'es' ? 'continúe la aproximación, ' : lgT === 'ko' ? '접근을 계속하십시오, ' : 'アプローチを継続してください、', b.why, lgT === 'ja' ? '' : '.'); if (lgT !== 'en') cm.lang = lgT; this.atc('TWR', cm, 2, () => this.setPhase('twr_continue'), { reply: true, instr: true }); }
          else this.clearLanding(2); return; }
      case 'DEP': {
        this.me('DEP', ES ? M(F.name, ', ', CPS, ', ', this.maybeHiEs(0.3), this.altRepEs(s, this.alt?.ft ?? this.init, this.dep), '.') : M(F.name, ', ', CS, ', ', this.maybeHi(0.3), this.altRep(s, this.alt?.ft ?? this.init, this.dep), '.'), d);
        const ri = this.routeInstr(s), climb = this.depTop;
        const ins = M(this.cmdAlt(climb, s.altFt, this.dep), ', ', ri.m);
        const insEs = M(this.cmdAltEs(climb, s.altFt, this.dep), ', ', this.routeInstrEs(s));
        const lgD = aptLang(this.dep); // radar-contact + climb instruction in the departure airport's language
        const dm = M(lgD === 'en' ? CS : this.csM2(lgD), ', ', this.idM('DEP'), lgD === 'en' ? this.pick('rcD', this.usA(this.dep) ? ['radar contact, ', 'radar contact, ', 'roger, radar contact, '] : ['radar contact, ', 'identified, ', 'radar contact, ']) : lgD === 'es' ? this.pick('rcDEs', ['contacto radar, ', 'contacto radar, ', 'recibido, contacto radar, ']) : lgD === 'ko' ? this.pick('rcDKo', ['레이더 접촉했습니다, ', '레이더 접촉, ']) : this.pick('rcDJa', ['レーダーコンタクト、', 'レーダーに捕捉しました、']), lgD === 'en' ? ins : M(this.cmdAltL(climb, s.altFt, this.dep, lgD), ', ', this.routeInstrL(s, lgD)), lgD === 'ja' ? '' : '.'); if (lgD !== 'en') dm.lang = lgD;
        this.atc('DEP', dm, 2, () => this.setPhase('dep'),
          { reply: true, rb: { label: `${altD(climb, this.ta(this.dep))}, ${ri.label}`, m: M(cap(ins), ', ', CS, '.'), mEs: M(insEs, ', ', CPS, '.'), fcu: { alt: climb, hdg: ri.hdg }, then: () => { this.assignAlt(climb); this.assignHdg(ri.hdg, ri.fix); } } });
        return; }
      case 'CTR': {
        const A = this.ctrApt; this.me('CTR', ES ? M(F.name, ', ', CPS, ', ', this.altRepEs(s, this.alt?.ft ?? null, A), '.') : M(F.name, ', ', CS, ', ', this.altRep(s, this.alt?.ft ?? null, A), '.'), d);
        if (!this.flags.climbed && this.cruise > s.altFt + 500) { this.flags.climbed = true; const ins = this.cmdAlt(this.cruise, s.altFt, A);
          const lgX = aptLang(A); const cm2 = M(lgX === 'en' ? CS : this.csM2(lgX), ', ', this.idM('CTR', A), lgX === 'es' ? 'recibido, ' : lgX === 'ko' ? '알겠습니다, ' : lgX === 'ja' ? '了解、' : 'roger, ', lgX === 'en' ? ins : this.cmdAltL(this.cruise, s.altFt, A, lgX), lgX === 'ja' ? '' : '.'); if (lgX !== 'en') cm2.lang = lgX;
          this.atc('CTR', cm2, 2, () => this.setPhase('ctr'), { reply: true, rb: { label: altD(this.cruise, this.ta(A)), m: M(cap(ins), ', ', CS, '.'), mEs: M(this.cmdAltEs(this.cruise, s.altFt, A), ', ', CPS, '.'), fcu: { alt: this.cruise }, then: () => this.assignAlt(this.cruise) } }); }
        else { this.flags.climbed = true; const lgA = aptLang(A);
          if (lgA !== 'en') { const ack = M(this.csM2(lgA), ', ', this.idM('CTR', A), lgA === 'es' ? this.pick('ctrREs', ['recibido.', 'contacto radar.']) : lgA === 'ko' ? this.pick('ctrRKo', ['알겠습니다.', '레이더 접촉했습니다.']) : this.pick('ctrRJa', ['了解しました。', 'レーダーコンタクト。'])); ack.lang = lgA; this.atc('CTR', ack, 2, () => this.setPhase('ctr'), { reply: true }); }
          else this.atc('CTR', M(CS, ', ', this.idM('CTR', A), (this.usA(A) && Math.random() < 0.5 ? M('roger, ', this.city(A), ' altimeter ', ['29.92', 'two niner niner two'], '.') : this.pick('ctrR', ['roger.', 'radar contact.']))), 2, () => this.setPhase('ctr'), { reply: true });
          if (!this.alt) this.assignAlt(r100(s.altFt)); }
        return; }
      case 'APP': {
        const A = this.arr, re = c.arrEnd(), R = this.rwyM(re.ident);
        this.me('APP', ES ? M(F.name, ', ', CPS, ', ', this.flags.ga ? M('aproximación frustrada, ', this.altRepEs(s, this.alt?.ft ?? this.appAlt, A)) : this.altRepEs(s, this.alt?.ft ?? null, A), this.flags.ga ? '' : this.infoEsM(A), '.') : M(F.name, ', ', CS, ', ', this.flags.ga ? M('missed approach, ', this.altRep(s, this.alt?.ft ?? this.appAlt, A)) : this.altRep(s, this.alt?.ft ?? null, A), this.flags.ga ? '' : this.infoM(A), '.'), d);
        const g = c.approachGeo(); const tgtAlt = this.appAlt;
        const onRoute = c.onRoute && c.onRoute(); const hd = Math.round(g.ipHdg / 5) * 5; const spd = !this.flags.ga && s.ias > 228 ? 210 : null;
        const ins = M(tgtAlt < s.altFt - 300 ? M(this.cmdAlt(tgtAlt, s.altFt, A), ', ') : M('maintain ', this.Am(tgtAlt, A), ', '), onRoute ? M('continue on your route, expect the I L S runway ', R) : M(this.hdgM(hd, s.trk), ', vectors I L S runway ', R), spd ? M(', reduce speed to ', [spd + ' kt', digits(spd) + ' knots']) : '');
        const insEs = M(tgtAlt < s.altFt - 300 ? M(this.cmdAltEs(tgtAlt, s.altFt, A), ', ') : M('mantenga ', this.altEsM(tgtAlt, A), ', '), onRoute ? M('continúe en su ruta, espere el I L S de la pista ', this.rwyEsM(re.ident)) : M(this.hdgEsM(hd, s.trk), ', vectores para el I L S de la pista ', this.rwyEsM(re.ident)), spd ? M(', reduzca la velocidad a ', this.spdEsM(spd)) : '');
        const lgA2 = aptLang(A), RL2 = this.rwyL(re.ident, lgA2); // approach vectors in the arrival airport's language (es reuses insEs, the same phraseology)
        const insL = lgA2 === 'es' ? insEs : lgA2 === 'en' ? ins : M(tgtAlt < s.altFt - 300 ? M(this.cmdAltL(tgtAlt, s.altFt, A, lgA2), ', ') : lgA2 === 'ko' ? M(this.AmL(tgtAlt, A, lgA2), ' 유지, ') : M(this.AmL(tgtAlt, A, lgA2), 'を維持、'),
          onRoute ? (lgA2 === 'ko' ? M('항로 유지, I L S 활주로 ', RL2, ' 접근을 예상하십시오') : M('ルートを継続してください、I L S 滑走路 ', RL2, ' アプローチを予定してください')) : (lgA2 === 'ko' ? M(this.hdgL(hd, s.trk, lgA2), ', I L S 활주로 ', RL2, ' 접근 레이더 유도') : M(this.hdgL(hd, s.trk, lgA2), '、I L S 滑走路 ', RL2, ' アプローチへのレーダー誘導')),
          spd ? (lgA2 === 'ko' ? M(', 속도를 ', this.spdL(spd, lgA2), '로 감속하십시오') : M('、速度を ', this.spdL(spd, lgA2), 'に減速してください')) : '');
        const am = M(lgA2 === 'en' ? CS : this.csM2(lgA2), ', ', this.idM('APP'), this.flags.ga ? (lgA2 === 'es' ? 'contacto radar. ' : lgA2 === 'ko' ? '레이더 접촉했습니다. ' : lgA2 === 'ja' ? 'レーダーコンタクト。' : 'radar contact. ') : M(this.infoChk(A), lgA2 === 'en' ? this.pick('appLead', ['radar contact, ', 'roger, ', '']) : lgA2 === 'es' ? this.pick('appLeadEs', ['contacto radar, ', 'recibido, ', '']) : lgA2 === 'ko' ? this.pick('appLeadKo', ['레이더 접촉했습니다, ', '알겠습니다, ', '']) : this.pick('appLeadJa', ['レーダーコンタクト、', '了解しました、', ''])), insL, lgA2 === 'ja' ? '' : '.'); if (lgA2 !== 'en') am.lang = lgA2;
        this.atc('APP', am, 2.2, () => { this.setPhase('app'); this.flags.vecT = this.t; },
          { reply: true, rb: { label: `${altD(tgtAlt, this.ta(A))}${onRoute ? ', own navigation' : ', heading ' + hdgD(hd)}${spd ? ', ' + spd + ' kt' : ''}`, m: M(cap(ins), ', ', CS, '.'), mEs: M(insEs, ', ', CPS, '.'), fcu: { alt: tgtAlt, hdg: onRoute ? null : hd, spd }, then: () => { this.assignAlt(tgtAlt); this.assignHdg(onRoute ? null : hd); this.assignSpd(spd); } } });
        this.flags.ga = false; return; }
      case 'GND': {
        const A = this.arr, re = c.arrEnd(), ex = this.exitName; this.me('GND', ES ? M(F.name, ', ', CPS, ', libre de la pista ', this.rwyEsM(re.ident), ex ? M(' por ', [ex, this.twyEs(ex)]) : '', ', solicito rodaje a la puerta.') : M(F.name, ', ', CS, ', clear of runway ', this.rwyM(re.ident), ex ? M(' at ', [ex, twyS(ex)]) : '', ', request taxi to the gate.'), d);
        const r = c.taxiIn(); this.taxiRoute = r; const T = r.via.map(n => [n, twyS(n)]).flatMap((x, i) => i ? [', ', x] : [x]); const TE = r.via.map(n => [n, this.twyEs(n)]).flatMap((x, i) => i ? [', ', x] : [x]);
        const ins = M('taxi to gate ', [r.gate, digits(r.gate)], ' via ', ...T);
        const lgG = aptLang(A);
        const insTx = lgG === 'es' ? M('rodaje a la puerta ', [r.gate, digitsEs(r.gate)], ' por ', ...TE) : lgG === 'ko' ? M('게이트 ', [r.gate, digitsKo(r.gate)], '까지 ', ...T, ' 경유, 지상활주하십시오') : lgG === 'ja' ? M('ゲート', [r.gate, digitsJa(r.gate)], 'まで、', ...T, '経由で走行してください') : ins;
        const gm2 = M(lgG === 'en' ? CS : this.csM2(lgG), ', ', this.idM('GND'), this.pick('welc', lgG === 'es' ? ['', 'bienvenido a ' + this.city(A) + ', '] : lgG === 'ko' ? ['', this.city(A) + '에 오신 것을 환영합니다, '] : lgG === 'ja' ? ['', this.city(A) + 'へようこそ、'] : ['', 'welcome to ' + this.city(A) + ', ']), insTx, lgG === 'ja' ? '' : '.'); if (lgG !== 'en') gm2.lang = lgG;
        this.atc('GND', gm2, 2, () => { c.showTaxi(r); this.setPhase('taxi_in'); },
          { reply: true, rb: { label: `gate ${r.gate} via ${r.via.join(', ')}`, m: M('Taxi to gate ', [r.gate, digits(r.gate)], ' via ', ...T, ', ', CS, '.'), mEs: M('Rodaje a la puerta ', [r.gate, digitsEs(r.gate)], ' por ', ...TE, ', ', CPS, '.') } });
        return; }
    }
  }
  reqDescent() {
    const s = this.ctxS(), CS = this.CSm(), A = this.ctrApt; this.me('CTR', this.pilotSpanish() ? M(this.fac('CTR').name, ', ', this.CSp(), ', ', this.altRepEs(s, null, A), ', solicito descenso.') : M(this.fac('CTR').name, ', ', CS, ', ', this.altRep(s, null, A), ', request descent.'));
    this.descend(1.8, true);
  }
  descend(delay, reply) {
    const s = this.ctxS(), CS = this.CSm(), A = this.ctrApt; this.flags.desc = true; const tgt = Math.min(this.bottom, r100(s.altFt) - 1000); if (tgt < this.appAlt) return;
    const ins = M(this.cmdAlt(tgt, s.altFt, A), tgt < this.ta(A) ? M(', ', this.city(this.arr), ' ', this.altimM(this.arr)) : '');
    const lgX2 = aptLang(A); const dm2 = M(lgX2 === 'en' ? CS : this.csM2(lgX2), ', ', lgX2 === 'en' ? ins : M(this.cmdAltL(tgt, s.altFt, A, lgX2), tgt < this.ta(A) ? M(', ', this.city(this.arr), ' ', this.altimM(this.arr)) : ''), lgX2 === 'ja' ? '' : '.'); if (lgX2 !== 'en') dm2.lang = lgX2;
    this.atc('CTR', dm2, delay, null, { reply, rb: { label: altD(tgt, this.ta(A)), m: M(this.cmdAlt(tgt, s.altFt, A), ', ', CS, '.'), mEs: M(this.cmdAltEs(tgt, s.altFt, A), ', ', this.CSp(), '.'), fcu: { alt: tgt }, then: () => this.assignAlt(tgt) } });
  }
  // ---------------------------------------------------------------- ATC follows the flight and calls you
  follow(dt) {
    const c = this.o.ctx, s = c.state(), p = this.phase, CS = this.CSm(), easy = this.easy();
    // things that happen without a radio call
    if (p === 'pushing' && c.pushDone()) this.setPhase('pushed');
    if (['gate', 'clr_ok'].includes(p) && c.pushing()) { // pushed without asking
      if (!easy && !this.flags.pushNag) { this.flags.pushNag = true; this.atc('GND', M(CS, ', ', this.idM('GND'), 'I see you pushing. Push approved, face ', c.pushFace(), '. Next time, request pushback before you push.'), 1.2, null, { instr: true }); }
      this.rb = null; this.setPhase('pushing');
    }
    if (p === 'taxi_in' && c.atGate()) { this.setPhase('parked'); this.alt = this.hdgA = this.spdA = null; }
    this.monitorTimers(s, easy, dt);
    if (this.queue.length || this.tx) return; // proactive calls wait for a quiet frequency
    const E = this.o.depEnd, R = this.rwyM(E.ident);
    // departure ground / tower
    if (p === 'pushed' && s.onGround && s.gsKt > 4 && !this.flags.taxiNag && !this.rb) { this.flags.taxiNag = true; if (easy) this.issueTaxi(0.8, ''); else this.atc('GND', M(CS, ', ', this.idM('GND'), 'hold position, you are not cleared to taxi. Advise ready to taxi.'), 0.8, null, { rb: { label: 'hold position', m: M('Holding position, ', CS, '.'), mEs: M('Mantengo posición, ', this.CSp(), '.') } }); return; }
    if (p === 'taxiing' && !this.ho && !this.rb && (c.nearHold() || s.onDepRwy) && !this.flags.twrHo) { this.flags.twrHo = true; this.atc('GND', M(CS, ', ', this.pick('gTwr', ['', 'holding short, ']), this.contactM('TWR', this.dep), '.'), 0.8, () => this.setPhase('to_twr'), { ho: { to: 'TWR', from: 'GND' } }); return; }
    const preClr = ['pushed', 'taxiing', 'to_twr', 'twr_hold', 'gate', 'clr_ok'].includes(p);
    if (preClr && s.onGround && s.onDepRwy && !this.flags.incur) { // on the runway without a clearance
      this.flags.incur = true; this.ho = null; this.rb = null;
      if (s.gsKt > 30 && s.tl > 0.5 && (easy || s.gsKt > 80)) { if (easy) this.clearTakeoff(0.3); else { this.flags.deviation = true; this.setPhase('takeoff_clr'); } return; }
      this.atc('TWR', M(CS, ', ', this.idM('TWR', this.dep), easy ? M('you have entered runway ', R, ' without a clearance. Hold position, I will have a clearance for you shortly.') : s.gsKt > 30 ? M('stop immediately, I say again, stop immediately! You are not cleared for takeoff.') : M('hold position! You are not cleared onto runway ', R, '.')), 0.3,
        () => this.setPhase('twr_hold'), { rb: { label: 'hold position', m: M('Holding position, ', CS, '.'), mEs: M('Mantengo posición, ', this.CSp(), '.') } });
      return;
    }
    if (p === 'twr_hold' && this.t - this.phT > 4 && !this.rb && !c.runwayBusy(this.dep, E).busy && !this.flags.luaw) { this.flags.luaw = true; this.lineUp(0.6); return; }
    if (p === 'lineup' && !this.rb && this.t - this.phT > 9 && !c.runwayBusy(this.dep, E).busy) { this.clearTakeoff(0.6); this.phT = this.t; return; }
    if (['takeoff_clr', 'rwy_start', 'lineup', 'twr_hold', 'taxiing', 'to_twr'].includes(p) && !s.onGround && s.aglFt > 600) {
      const dev = this.flags.deviation || !this.flags.tkoClr ? (easy ? '' : M('possible pilot deviation, advise you contact ', this.fac('TWR', this.dep).name, ' after landing. ')) : '';
      this.rb = null; this.atc('TWR', M(CS, ', ', dev, this.contactM('DEP'), ', ', this.bye(this.dep), '.'), 0.3, () => this.setPhase('to_dep'), { ho: { to: 'DEP', from: 'TWR' } });
      this.alt = null; this.assignAlt(this.init); this.alt.reached = false; return;
    }
    // climb, cruise, descent
    const distDep = gcNm(s.lat, s.lon, this.dep.lat, this.dep.lon);
    if (p === 'dep' && !this.rb && (s.altFt > this.depTop - 1500 && this.alt?.ft === this.depTop || distDep > 45)) { this.atc('DEP', M(CS, ', ', this.contactM('CTR', this.dep), ', ', this.bye(this.dep), '.'), 0.5, () => this.setPhase('to_ctr'), { ho: { to: 'CTR', from: 'DEP', apt: this.dep } }); return; }
    if (p === 'ctr' && !this.rb) {
      if (!this.flags.sector && this.ctrApt === this.dep && this.dep !== this.arr && s.distArrNm < distDep && this.fac('CTR', this.arr).name !== this.fac('CTR', this.dep).name) { this.flags.sector = true; this.atc('CTR', M(CS, ', ', this.contactM('CTR', this.arr), '.'), 0.5, () => this.setPhase('to_ctr'), { ho: { to: 'CTR', from: 'CTR', apt: this.arr } }); return; }
      if (!this.flags.desc && s.distArrNm < this.todNm(s) && s.altFt > this.bottom + 800) { this.descend(0.6, false); return; }
      if ((this.flags.desc || s.altFt < this.bottom + 800) && (s.distArrNm < 40 || (s.altFt < this.bottom + 600 && s.distArrNm < 60))) { this.atc('CTR', M(CS, ', ', this.contactM('APP', this.arr), '.'), 0.5, () => this.setPhase('to_app'), { ho: { to: 'APP', from: 'CTR' } }); return; }
    }
    // approach: vectors, then the ILS clearance; tower handoff once established
    if (p === 'app' && !this.rb) {
      const g = c.approachGeo(), A = this.arr, re = c.arrEnd(), R2 = this.rwyM(re.ident);
      if (!this.flags.appClr && (g.ipNm < 4.5 || (g.thrNm > 7 && g.thrNm < 24 && Math.abs(g.crossNm) < 5 && Math.abs(wrap180(s.trk - re.hdg)) < 100))) {
        const onRoute = c.onRoute && c.onRoute(); const vh = c.vectorHeading(); const alt = this.appAlt; const aligned = Math.abs(g.crossNm) < 1 && Math.abs(wrap180(s.trk - re.hdg)) < 25;
        const ins = onRoute ? M(this.cmdAlt(alt, s.altFt, A), ', cleared I L S runway ', R2, ' approach') : M(aligned ? '' : M(this.hdgM(vh.hdg, s.trk), ', '), s.altFt > alt + 300 ? this.cmdAlt(alt, s.altFt, A) : M('maintain ', this.Am(alt, A)), ' until established on the localizer, cleared I L S runway ', R2, ' approach');
        const insEs = onRoute ? M(this.cmdAltEs(alt, s.altFt, A), ', autorizado para la aproximación I L S a la pista ', this.rwyEsM(re.ident)) : M(aligned ? '' : M(this.hdgEsM(vh.hdg, s.trk), ', '), s.altFt > alt + 300 ? this.cmdAltEs(alt, s.altFt, A) : M('mantenga ', this.altEsM(alt, A)), ' hasta establecerse en el localizador, autorizado para la aproximación I L S a la pista ', this.rwyEsM(re.ident));
        const lgI = aptLang(A), RLi = this.rwyL(re.ident, lgI); // ILS clearance in the arrival airport's language (es reuses insEs)
        const insL = lgI === 'es' ? insEs : lgI === 'en' ? ins : onRoute ? M(this.cmdAltL(alt, s.altFt, A, lgI), lgI === 'ko' ? ', I L S 활주로 ' : ', I L S 滑走路 ', RLi, lgI === 'ko' ? ' 접근을 허가합니다' : ' アプローチを許可します') : M(aligned ? '' : M(this.hdgL(vh.hdg, s.trk, lgI), lgI === 'ko' ? ', ' : '、'), s.altFt > alt + 300 ? this.cmdAltL(alt, s.altFt, A, lgI) : lgI === 'ko' ? M(this.AmL(alt, A, lgI), ' 유지') : M(this.AmL(alt, A, lgI), 'を維持'), lgI === 'ko' ? ', 로컬라이저에 확립될 때까지, I L S 활주로 ' : '、ローカライザーに確立するまで、I L S 滑走路 ', RLi, lgI === 'ko' ? ' 접근을 허가합니다' : ' アプローチを許可します');
        const im = M(lgI === 'en' ? CS : this.csM2(lgI), ', ', insL, lgI === 'ja' ? '' : '.'); if (lgI !== 'en') im.lang = lgI;
        this.atc('APP', im, 0.6, null,
          { rb: { label: `cleared ILS ${re.ident}`, m: M(cap(ins), ', ', CS, '.'), mEs: M(insEs, ', ', this.CSp(), '.'), fcu: { alt, hdg: onRoute ? null : vh.hdg }, then: () => { this.flags.appClr = true; c.armIls(onRoute ? null : vh.hdg, alt); this.assignAlt(alt); this.assignHdg(null); this.assignSpd(null); } } });
        return;
      }
      if (!this.flags.appClr && this.hdgA && this.t - (this.flags.vecT || 0) > 50) { const hd = Math.round(g.ipHdg / 5) * 5; if (Math.abs(wrap180(hd - this.hdgA.hdg)) > 25) { this.flags.vecT = this.t; const lgV = aptLang(this.arr); const vm = M(lgV === 'en' ? CS : this.csM2(lgV), ', ', this.hdgL(hd, s.trk, lgV), lgV === 'ja' ? '。' : '.'); if (lgV !== 'en') vm.lang = lgV; this.atc('APP', vm, 0.5, null, { rb: { label: 'heading ' + hdgD(hd), m: M(this.hdgM(hd, s.trk), ', ', CS, '.'), mEs: M(this.hdgEsM(hd, s.trk), ', ', this.CSp(), '.'), fcu: { hdg: hd }, then: () => this.assignHdg(hd) } }); return; } }
      if (this.flags.appClr && s.thrNm < 11 && (s.locCaptured || Math.abs(s.locDots) < 1 || s.thrNm < 6)) { this.atc('APP', M(CS, ', ', this.contactM('TWR', this.arr), '.'), 0.5, () => { this.setPhase('to_twr_arr'); this.hdgA = null; }, { ho: { to: 'TWR', from: 'APP' } }); return; }
    }
    // arrival tower: no check-in on short final, continue → land, unstable approach, go-around, vacate
    if (ARR_TWR.has(p) && !s.onGround) {
      if (s.thrNm < 9 && s.aglFt < 2500) this.minAgl = Math.min(this.minAgl, s.aglFt);
      if (p === 'to_twr_arr' && (s.aglFt < 1000 || s.thrNm < 4.5) && !this.flags.twrCall) { this.flags.twrCall = true; this.rb = null; this.clearLanding(0.3, 'how do you read? '); return; }
      if (p === 'twr_continue' && this.t - this.phT > 3 && !c.runwayBusy(this.arr, c.arrEnd()).busy) { this.clearLanding(0.3); return; }
      const ga = this.minAgl < 1200 && s.aglFt > this.minAgl + 300 && s.vsFpm > 500;
      if (ga && p !== 'go_around') { this.goAround(false); return; }
      if (p === 'go_around' && !this.rb && s.aglFt > 1400 && !this.ho) { this.atc('TWR', M(CS, ', ', this.contactM('APP', this.arr), '.'), 0.4, () => { this.setPhase('to_app'); Object.assign(this.flags, { appClr: false, ga: true, advise: false, gaCmd: false, twrCall: false }); this.minAgl = 1e9; }, { ho: { to: 'APP', from: 'TWR' } }); return; }
      if (p !== 'go_around' && s.thrNm < 6 && s.aglFt < 1400 && s.aglFt > 120) {
        const gearBad = !s.gearDown, gs = s.gsDots, loc = s.locDots, far = Math.max(Math.abs(gs), Math.abs(loc)), busy = p === 'twr_continue' && c.runwayBusy(this.arr, c.arrEnd()).busy;
        if (!this.flags.advise && s.aglFt < 1300 && s.aglFt > 650 && (gearBad || far > 1.4)) { this.flags.advise = true;
          const what = gearBad ? 'check gear down' : Math.abs(gs) >= Math.abs(loc) ? (gs > 0 ? 'you appear low on the glide path' : 'you appear high on the glide path') : (loc > 0 ? 'you appear left of the final approach course' : 'you appear right of the final approach course');
          this.atc('TWR', M(CS, ', ', what, '.'), 0.2); return; }
        if (!this.flags.gaCmd && s.aglFt < 600 && ((busy && s.aglFt < 500) || (gearBad && s.aglFt < 450) || (far > (easy ? 2.3 : 1.8)))) { this.goAround(true, busy ? 'traffic on the runway' : gearBad ? 'your gear appears up' : 'you are not established on the approach'); return; }
      }
    }
    const emNow = c.emergency && c.emergency(); if (!this.flags.emer && emNow && emNow.kind === 'mayday' && s.onGround && ARR_TWR.has(p)) { this.flags.emer = 'mayday'; this.flags.emerT = this.t - 6; } // the tower saw it happen
    if (this.flags.emer && s.onGround && s.gsKt < 40 && !this.flags.emerGnd && this.t - (this.flags.emerT || 0) > 5) { this.flags.emerGnd = this.flags.vacate = true; this.rb = this.ho = null; c.rescue && c.rescue(); this.setPhase('emer_gnd');
      this.atc('TWR', M(CS, ', ', this.idM('TWR'), 'fire and rescue are on their way to you. Hold position and advise intentions.'), 1.2, null, { instr: true }); return; }
    if ((ARR_TWR.has(p) || p === 'app') && s.onGround && s.gsKt < 60 && !this.flags.vacate && s.distArrNm < 8) {
      this.flags.vacate = true; this.rb = null; this.ho = null; const ex = c.exitInfo(); this.exitName = ex.name;
      const vac = this.usA(this.arr) ? M('turn ', ex.side, ex.name ? M(' at ', [ex.name, twyS(ex.name)]) : ' next available taxiway', ', ') : M('vacate ', ex.side, ex.name ? M(' via ', [ex.name, twyS(ex.name)]) : '', ', ');
      const lgW = aptLang(this.arr); // vacate + welcome in the arrival airport's language (the GND handoff inside is contactM, already localized)
      const vacTx = lgW === 'es' ? M('salga a la ', ex.side === 'left' ? 'izquierda' : 'derecha', ex.name ? M(' por ', [ex.name, this.twyEs(ex.name)]) : '', ', ') : lgW === 'ko' ? M(ex.side === 'left' ? '좌측 ' : '우측 ', ex.name ? M([ex.name, twyS(ex.name)], '으로 ') : '', '활주로를 비우십시오, ') : lgW === 'ja' ? M(ex.side === 'left' ? '左' : '右', ex.name ? M('、', [ex.name, twyS(ex.name)], '経由、') : 'へ、', '滑走路を空けてください、') : vac;
      const welcTx = lgW === 'es' ? this.pick('welc', ['.', ', bienvenido a ' + this.city(this.arr) + '.', '.']) : lgW === 'ko' ? this.pick('welc', ['.', ', ' + this.city(this.arr) + '에 오신 것을 환영합니다.', '.']) : lgW === 'ja' ? this.pick('welc', ['。', '、' + this.city(this.arr) + 'へようこそ。', '。']) : this.pick('welc', ['.', ', welcome to ' + this.city(this.arr) + '.', '.']);
      const wm = M(lgW === 'en' ? CS : this.csM2(lgW), ', ', vacTx, this.contactM('GND', this.arr), welcTx); if (lgW !== 'en') wm.lang = lgW;
      this.atc('TWR', wm, 1.5, () => { this.setPhase('to_gnd'); this.alt = this.hdgA = this.spdA = null; }, { ho: { to: 'GND', from: 'TWR' } }); return;
    }
    if (p === 'to_gnd' && s.onArrRwy && s.gsKt < 3 && this.t - this.phT > 45 && !this.flags.vacNag) { this.flags.vacNag = true; this.atc('TWR', M(CS, ', vacate the runway without delay, ', this.pick('vacW', ['traffic on final.', 'traffic four mile final.'])), 0.3, null, { instr: true }); return; }
    // traffic advisories
    if (!s.onGround && c.traffic) {
      for (const a of c.traffic()) {
        if (a.advised || a.done) continue; const d = a.distNm, da = a.dAltFt;
        if (d < 5.5 && d > 1.5 && Math.abs(da) < 2200 && s.altFt < 14000 && (a.kind === 'arr' ? a.s < -2500 : a.h > 60)) {
          a.advised = true; const k = ['takeoff_clr', 'land_clr', 'twr_continue', 'to_twr_arr', 'go_around'].includes(p) ? 'TWR' : ['dep', 'to_dep', 'to_ctr'].includes(p) ? 'DEP' : 'APP';
          const ty = a.type || ['737', 'seven three seven']; const clock = a.clock; const nd = Math.round(d);
          this.atc(k, M(CS, ', traffic, ', [clock + " o'clock", clock + " o'clock"], ', ', [String(nd), String(nd)], nd === 1 ? ' mile, ' : ' miles, ', [ty[0], ty[1]], ', ', Math.abs(da) < 400 ? 'same altitude' : M([r100(Math.abs(da)) + ' ft', altS(r100(Math.abs(da)), 99999) + ' feet'], da > 0 ? ' above' : ' below').d, a.vs > 300 ? ', climbing' : a.vs < -300 ? ', descending' : '', '.'), 0.4, () => { this.flags.tfc = true; this.emit(); });
          return;
        }
      }
    }
  }
  goAround(cmd, why) {
    const CS = this.CSm(), re = this.o.ctx.arrEnd(), alt = this.appAlt, A = this.arr; this.flags.gaCmd = true; this.ho = null;
    const ins = M('fly runway heading, ', this.cmdAlt(alt, alt - 1, A));
    const insEs = M('mantenga el rumbo de pista, ', this.cmdAltEs(alt, alt - 1, A));
    const lgGa = aptLang(A); // go-around command + missed-approach instruction in the tower's language; the reason (why) is dynamic and stays English
    const insL = lgGa === 'es' ? insEs : lgGa === 'en' ? ins : lgGa === 'ko' ? M('활주로 헤딩 유지, ', this.cmdAltL(alt, alt - 1, A, lgGa)) : M('滑走路ヘディングを維持、', this.cmdAltL(alt, alt - 1, A, lgGa));
    const m = lgGa === 'en' ? (cmd ? M(CS, ', go around, I say again, go around', why ? M(', ', why) : '', '. ', ins, '.') : M(CS, ', ', this.pick('gaR', ['roger, ', 'roger the go-around, ']), ins, '.'))
      : cmd ? M(this.csM2(lgGa), lgGa === 'es' ? ', frustre, repito, frustre' : lgGa === 'ko' ? ', 복행하십시오, 다시 말합니다, 복행하십시오' : '、ゴーアラウンド、繰り返します、ゴーアラウンドしてください', why ? M(lgGa === 'ja' ? '、' : ', ', why) : '', lgGa === 'ja' ? '。' : '. ', insL, lgGa === 'ja' ? '' : '.')
      : M(this.csM2(lgGa), ', ', lgGa === 'es' ? 'recibido, ' : lgGa === 'ko' ? '알겠습니다, ' : '了解、', insL, lgGa === 'ja' ? '' : '.');
    if (lgGa !== 'en') m.lang = lgGa;
    this.atc('TWR', m, cmd ? 0.1 : 1.2, () => this.setPhase('go_around'), { rb: { label: 'go around, runway heading, ' + altD(alt, this.ta(A)), m: M(cmd ? M('Going around, ', ins) : cap(ins), ', ', CS, '.'), mEs: M(cmd ? M('Frustrando, ', insEs) : insEs, ', ', this.CSp(), '.'), fcu: { alt, hdg: Math.round(re.hdg) }, then: () => { this.assignAlt(alt); } } });
  }
  // readback / handoff reminders and altitude / heading / speed checks
  monitorTimers(s, easy, dt) {
    if (this.queue.length || this.tx) return; const CS = this.CSm();
    const r = this.rb; if (r && !easy && !this.auto) { const w = this.t - r.t;
      if (w > 16 && r.nag === 0) { r.nag = 1; this.atc(r.kind, M(CS, ', ', this.pick('nag', ['did you copy?', 'read back, please.', 'how do you read?', 'I need a readback.'])), 0.2); return; }
      if (w > 42 && r.nag === 1) { r.nag = 2; this.atc(r.kind, M(CS, ', ', this.fac(r.kind).name, ', radio check, how do you read?'), 0.2); return; } }
    const h = this.ho; if (h && !this.rb && !this.auto) { const w = this.t - h.t, F = this.fac(h.to, h.apt);
      if (w > (easy ? 30 : 22) && h.n === 0 && !h.quiet) { h.n = 1; const lgR = aptLang(F.apt); const rm = M(CS, ', ', easy ? 'reminder, ' : 'I say again, ', this.contactM(h.to, h.apt), '.'); if (lgR !== 'en') rm.lang = lgR; this.atc(h.from, rm, 0.2); return; } // the reminder repeats the handoff through contactM and carries the facility's language tag, like the original instruction (was hardcoded English — a leak at ES/KO/JA airports)
      if (w > 55 && h.n === 1 && !easy) { h.n = 2; const lgR2 = aptLang(F.apt); const rm2 = M(CS, ', ', this.fac(h.from).name, ', radio check, how do you read? ', this.contactM(h.to, h.apt), '.'); if (lgR2 !== 'en') rm2.lang = lgR2; this.atc(h.from, rm2, 0.2); return; }
      if (h.quiet && w > 20 && h.n === 0) h.n = 1; }
    if (s.onGround || this.rb) return;
    const live = ['dep', 'to_ctr', 'ctr', 'to_app', 'app', 'go_around'].includes(this.phase) && !(this.flags.appClr && (s.locCaptured || Math.abs(s.locDots) < 1.2));
    const A = this.alt; if (A && live) { const dev = s.altFt - A.ft; if (Math.abs(dev) < 200) A.reached = true;
      if (this.t - A.warnT > 50) { const tol = easy ? 600 : 300, cur = [altD(r100(s.altFt), this.ta()), altS(r100(s.altFt), this.ta())];
        if (A.reached && Math.abs(dev) > tol && (Math.sign(dev) === Math.sign(s.vsFpm) || Math.abs(s.vsFpm) < 300)) { A.warnT = this.t; this.flags.busts = (this.flags.busts || 0) + 1; this.atc(this.curK(), easy ? M(CS, ', just a reminder, your assigned altitude is ', this.Am(A.ft), '.') : M(CS, ', altitude check, I show you at ', cur, ', maintain ', this.Am(A.ft), '.'), 0.2); return; }
        if (!A.reached && this.t - A.t > 75 && Math.abs(dev) > 1000 && ((Math.sign(s.vsFpm) === Math.sign(dev) && Math.abs(s.vsFpm) > 300) || Math.abs(s.vsFpm) < 200)) { A.warnT = this.t; this.atc(this.curK(), M(CS, ', ', this.cmdAlt(A.ft, s.altFt), easy ? ', when you are ready.' : M(', I show you ', Math.abs(s.vsFpm) < 200 ? 'level at ' : 'at ', cur, '.')), 0.2); return; } } }
    const H = this.hdgA; if (H && live && this.t - H.t > 30) { const want = H.fix ? gcBrg(s.lat, s.lon, H.fix.lat, H.fix.lon) : H.hdg; const err = Math.abs(wrap180(s.trk - want));
      H.bad = err > (easy ? 40 : 20) ? H.bad + dt : 0;
      if (H.bad > 12 && this.t - H.warnT > 60) { H.warnT = this.t; this.atc(this.curK(), H.fix ? M(CS, ', check your track, proceed direct ', [H.fix.id, twyS(H.fix.id)], '.') : M(CS, ', check heading, fly heading ', [hdgD(H.hdg), digits(hdgD(H.hdg))], '.'), 0.2); return; } }
    const S = this.spdA; if (S && live && this.t - S.t > 60 && Math.abs(s.ias - S.kt) > 25 && this.t - S.warnT > 90) { S.warnT = this.t; this.atc(this.curK(), M(CS, ', maintain ', [S.kt + ' kt', digits(S.kt) + ' knots'], '.'), 0.2); }
  }
  setAssigned(ft) { this.assignAlt(ft); }
  // ---------------------------------------------------------------- emergencies: MAYDAY / PAN-PAN, priority handling and the nearest suitable runway
  declare(kind) {
    const c = this.o.ctx, s = this.ctxS(), CS = this.CSm(), ES = this.pilotSpanish(), CPS = this.CSp(), k = this.curK(), F = this.fac(k), em = c.emergency && c.emergency(); const may = kind === 'mayday';
    const nat = em ? em.nature : may ? 'emergency' : 'technical problem'; const div = c.divert ? c.divert().apt : this.arr; const back = div === this.dep;
    const fm = c.fuelMin ? c.fuelMin() : 120, fh = Math.floor(fm / 60), fmm = Math.round((fm % 60) / 5) * 5; const souls = c.souls ? c.souls() : 156;
    this.flags.emer = kind; this.flags.emerT = this.t; this.rb = null; this.ho = null; this.queue = this.queue.filter(x => !x.chatter); this.dropChatter();
    const word = may ? ['MAYDAY, MAYDAY, MAYDAY', 'Mayday, Mayday, Mayday'] : ['PAN-PAN, PAN-PAN, PAN-PAN', 'Pan pan, pan pan, pan pan'];
    this.me(k, ES ? M(word, ', ', F.name, ', ', CPS, ', ', this.natEs(nat), ', ', s.onGround ? 'deteniéndome en la pista' : back ? 'solicito retorno inmediato a ' + this.city(div) : 'solicito desvío a ' + this.city(div), s.onGround ? '' : M(', ', this.altRepEs(s, this.alt?.ft ?? null)), ', ', [souls + ' almas a bordo', souls + ' almas a bordo'], ', combustible ', [`${fh} h ${String(fmm).padStart(2, '0')} min`, `${fh ? numEsW(fh) + (fh > 1 ? ' horas ' : ' hora ') : ''}${fmm ? numEsW(fmm) + ' minutos' : ''}`], '.') : M(word, ', ', F.name, ', ', CS, ', ', nat, ', ', s.onGround ? 'stopping on the runway' : back ? 'request immediate return to ' + this.city(div) : 'request diversion to ' + this.city(div), s.onGround ? '' : M(', ', this.altRep(s, this.alt?.ft ?? null)), ', ', [souls + ' souls on board', souls + ' souls on board'], ', fuel ', [`${fh} h ${String(fmm).padStart(2, '0')} min`, `${fh ? fh + (fh > 1 ? ' hours ' : ' hour ') : ''}${fmm ? fmm + ' minutes' : ''}`], '.'));
    this.atc(k, M(CS, ', ', this.idM(k), 'roger ', may ? 'MAYDAY' : ['PAN-PAN', 'pan pan'], '.'), 1.4, null, { reply: true });
    if (may) this.atc(k, M('All stations, ', F.name, ', stop transmitting, MAYDAY in progress.'), 0.5, null, { reply: true });
    if (s.onGround) { this.atc(k, M(CS, ', fire and rescue are on their way. Hold position.'), 0.6, () => { c.rescue && c.rescue(); }, { reply: true }); return; }
    // vectors to the nearest suitable runway, "runway of your choice"
    this.vectorToDivert(div, k, true);
  }
  // point the flight at a divert airport: the arrival switches (the session destination follows via
  // ctx.setArr), the planned destination is remembered for a later cancel, the nav map lights the target
  // amber (ctx.divertShown), and the current facility vectors you to its ILS with a readback — the exact
  // contract declare() has always used, shared now with a voluntary diversion.
  vectorToDivert(div, k, emer) {
    const c = this.o.ctx, s = this.ctxS(), CS = this.CSm(), CPS = this.CSp();
    if (div !== this.arr) { if (!this.divertedFrom) this.divertedFrom = this.arr; c.setArr && c.setArr(div); this.arr = div; this.divertApt = div; c.divertShown && c.divertShown(div); }
    this.appAlt = Math.max(2000, r100(div.elevFt + 3000));
    const g = c.approachGeo(), re = c.arrEnd(), hd = Math.round(g.ipHdg / 5) * 5, tgt = s.altFt > 10300 ? Math.max(this.appAlt, 10000) : s.altFt < this.appAlt ? this.appAlt : Math.max(this.appAlt, r100(s.altFt));
    const altIns = Math.abs(tgt - s.altFt) < 300 ? M('maintain ', this.Am(tgt, div)) : this.cmdAlt(tgt, s.altFt, div);
    const altInsEs = Math.abs(tgt - s.altFt) < 300 ? M('mantenga ', this.altEsM(tgt, div)) : this.cmdAltEs(tgt, s.altFt, div);
    const ins = M(this.hdgM(hd, s.trk), ', ', altIns, ', vectors I L S runway ', this.rwyM(re.ident), ' at ', this.city(div));
    const lgDiv = aptLang(this.fac(k).apt); // the SPEAKING facility's language (not the divert field's)
    const altInsL = Math.abs(tgt - s.altFt) < 300 ? (lgDiv === 'ko' ? M(this.AmL(tgt, div, lgDiv), ' 유지') : lgDiv === 'ja' ? M(this.AmL(tgt, div, lgDiv), 'を維持') : this.cmdAltL(tgt, s.altFt, div, lgDiv)) : this.cmdAltL(tgt, s.altFt, div, lgDiv);
    const insL = lgDiv === 'es' ? M(this.hdgEsM(hd, s.trk), ', ', altInsEs, ', vectores para el I L S de la pista ', this.rwyEsM(re.ident), ' en ', this.city(div))
      : lgDiv === 'ko' ? M(this.hdgL(hd, s.trk, lgDiv), ', ', altInsL, ', I L S 활주로 ', this.rwyL(re.ident, lgDiv), ' ', this.city(div), ' 레이더 유도')
      : lgDiv === 'ja' ? M(this.hdgL(hd, s.trk, lgDiv), '、', altInsL, '、I L S 滑走路 ', this.rwyL(re.ident, lgDiv), '、', this.city(div), 'へのレーダー誘導') : ins;
    const msg = lgDiv === 'en' ? (emer ? M(CS, ', ', ins, ', runway of your choice, fire and rescue will be standing by.') : M(CS, ', diversion approved, ', ins, '.'))
      : emer ? M(this.csM2(lgDiv), ', ', insL, lgDiv === 'es' ? ', pista de su elección, los bomberos estarán en espera.' : lgDiv === 'ko' ? ', 원하시는 활주로를 사용하십시오, 소방 구조대가 대기하겠습니다.' : '、ご希望の滑走路を使用できます、消防救助隊が待機しています。')
      : M(this.csM2(lgDiv), ', ', lgDiv === 'es' ? 'desvío aprobado, ' : lgDiv === 'ko' ? '회항을 허가합니다, ' : 'ダイバートを許可します、', insL, lgDiv === 'ja' ? '' : '.');
    if (lgDiv !== 'en') msg.lang = lgDiv;
    this.atc(k, msg, 0.8, () => { this.setPhase('app'); Object.assign(this.flags, { appClr: false, vecT: this.t, advise: false, gaCmd: false, twrCall: false, vacate: false }); this.contacted.add(this.fac('APP').name); this.ctrApt = div; this.emit(); },
      { reply: true, rb: { label: `heading ${hdgD(hd)}, ${altD(tgt, this.ta(div))}, ILS ${re.ident} ${this.city(div)}`, m: M(cap(ins), ', ', CS, '.'), mEs: M(this.hdgEsM(hd, s.trk), ', ', altInsEs, ', vectores para el I L S de la pista ', this.rwyEsM(re.ident), ' en ', this.city(div), ', ', CPS, '.'), fcu: { alt: tgt, hdg: hd }, then: () => { this.assignAlt(tgt); this.assignHdg(hd); } } });
  }
  // a voluntary diversion (the DIVERT button / U key / radio option): nearest suitable airport, ATC clears
  // you to it, no emergency declared. Emergencies keep their own path through declare().
  requestDivert() {
    const c = this.o?.ctx; if (!c) return; const s = this.ctxS();
    if (this.flags.emer) return; // declare() owns the emergency divert
    if (s.onGround) { this.note('Divert is for when you are airborne.'); return; }
    if (this.rb || this.ho || this.waiting()) { this.note('Divert: finish the current ATC call first.'); return; }
    const dv = c.divert && c.divert(), div = dv && dv.apt;
    if (!div) { this.note('No suitable airport within reach.'); return; }
    if (div === this.arr) { this.note(this.city(div) + ' is already your destination — and the nearest suitable airport.'); return; }
    const CS = this.CSm(), ES = this.pilotSpanish(), CPS = this.CSp(), k = this.curK(), F = this.fac(k);
    this.me(k, ES ? M(F.name, ', ', CPS, ', solicito desvío a ', this.city(div), '.') : M(F.name, ', ', CS, ', request diversion to ', this.city(div), '.'));
    this.vectorToDivert(div, k, false);
  }
  // cancel the diversion and continue to the planned destination (also how a cancelled emergency restores it)
  cancelDivert() {
    const c = this.o?.ctx; if (!c) return; const s = this.ctxS(); const orig = this.divertedFrom; if (!orig || s.onGround) return;
    if (this.rb || this.ho || this.waiting()) { this.note('Cancel diversion: finish the current ATC call first.'); return; }
    const CS = this.CSm(), ES = this.pilotSpanish(), CPS = this.CSp(), k = this.curK(), F = this.fac(k);
    this.me(k, ES ? M(F.name, ', ', CPS, ', cancelo el desvío, solicito continuar a ', this.city(orig), '.') : M(F.name, ', ', CS, ', cancel diversion, request to continue to ', this.city(orig), '.'));
    this.atc(k, M(CS, ', roger, continue to ', this.city(orig), '.'), 1.4, null, { reply: true });
    this.restoreDivert();
  }
  restoreDivert() { // state only: arrival back to the planned destination, divert light out, enroute flow re-armed
    const c = this.o.ctx, orig = this.divertedFrom; if (!orig) return;
    this.divertedFrom = null; this.divertApt = null;
    c.setArr && c.setArr(orig); this.arr = orig; c.divertShown && c.divertShown(null);
    this.appAlt = Math.max(2000, r100(orig.elevFt + 3000));
    this.bottom = Math.min(this.cruise, Math.round((orig.elevFt + (this.ta(orig) >= 10000 ? 11000 : 7000)) / 1000) * 1000);
    this.rb = null; this.ho = { to: 'CTR', from: 'CTR', apt: orig, t: this.t, n: 0, skipBye: true, quiet: true }; this.ctrApt = orig;
    Object.assign(this.flags, { appClr: false, desc: false, vecT: 0, advise: false, gaCmd: false, twrCall: false, vacate: false, sector: true });
    this.setPhase('to_ctr');
  }
  cancelEmer() {
    const c = this.o.ctx, s = this.ctxS(), CS = this.CSm(), k = this.curK(), F = this.fac(k), may = this.flags.emer === 'mayday';
    this.me(k, this.pilotSpanish() ? M(this.CSp(), ', cancelo el ', may ? 'MAYDAY' : ['PAN-PAN', 'pan pan'], s.onGround ? ', puedo liberar la pista.' : ', la situación está bajo control.') : M(CS, ', cancel ', may ? 'MAYDAY' : ['PAN-PAN', 'pan pan'], s.onGround ? ', we can vacate the runway.' : ', the situation is under control.'));
    this.atc(k, M(CS, ', roger, ', may ? 'MAYDAY' : ['PAN-PAN', 'pan pan'], ' cancelled.'), 1.4, null, { reply: true });
    if (may) this.atc(k, M('All stations, ', F.name, ', distress traffic ended.'), 0.5, null, { reply: true });
    this.flags.emer = null;
    if (!s.onGround && this.divertedFrom) this.restoreDivert(); // emergency over: the flight continues to its planned destination (the divert light goes out with it)
    if (s.onGround) { const ex = c.exitInfo(); this.exitName = ex.name; this.atc('TWR', M(CS, ', vacate ', ex.side, ex.name ? M(' via ', [ex.name, twyS(ex.name)]) : ' when able', ', ', this.contactM('GND', this.arr), '.'), 0.8, () => this.setPhase('to_gnd'), { ho: { to: 'GND', from: 'TWR' } }); }
  }
  curK() { const k = this.tuned?.kind, air = this.o && !this.ctxS().onGround; if (k && k !== 'ATIS' && !(air && (k === 'DEL' || k === 'GND'))) return k; return { to_dep: 'TWR', takeoff_clr: 'TWR', dep: 'DEP', to_ctr: 'DEP', ctr: 'CTR', to_app: 'CTR', app: 'APP', to_twr_arr: 'APP', land_clr: 'TWR', twr_continue: 'TWR', go_around: 'TWR' }[this.phase] || (air ? 'APP' : 'GND'); }
}
