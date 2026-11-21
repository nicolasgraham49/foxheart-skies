// Era Three — HOME FIELD · Phase 1b "The Signature" (the load sheet).
// At Stand 7 the Baggage & cargo line stops being a timer the captain watches and
// becomes a sheet he authors: four units wait on dollies beside the stand — three
// LD3s and one heavy pallet. He places each into the forward or aft hold (or refuses
// it: a refused unit stays on the ramp for the whole departure, visibly), watches
// the balance needle answer every placement, and then SIGNS. The signature is real:
// the signed CG writes a constant pitch moment and a trim-drag fuel factor into the
// FDM, so the flight carries the ground's decision in its trim and its burn.
// Signed laws honoured here: the captain signs last (REJECT always available, no
// auto-fix, signing out of band is allowed and stamped, never blocked); skipping the
// sheet entirely leaves the classic auto-load (standard CG, factor 1 — no penalty);
// the walk-around is never timed or graded — completing it is one binary Trust line
// ("walked") and its duration is recorded nowhere. The Trust Record here is stamps,
// not stars: walked / secured / signed. The full debrief book is 1d's, not this.
import * as THREE from 'three';
import { uldMeshes, makeVehicle, T } from './env-gse.js';
import { TYPES } from './ac-types.js';
import * as Walkaround from './walkaround.js';

export const UNITS = [
  { id: 'uld1', kind: 'ULD 1 · LD3', label: 'Mail & parcels', kg: 1180 },
  { id: 'uld2', kind: 'ULD 2 · LD3', label: 'Checked bags', kg: 1420 },
  { id: 'uld3', kind: 'ULD 3 · LD3', label: 'Perishables · keep cool', kg: 890 },
  { id: 'plt1', kind: 'Pallet', label: 'Crates · machine parts', kg: 1740 },
];
const ARM = { fwd: -6.4, aft: 6.0 };      // hold moment arms (m, datum at the standard CG)
const M0 = 42000;                          // baseline mass the moments lean against (kg)
const CAP = { fwd: 2, aft: 2 };            // hold positions per end
const BAND = 0.55;                         // safe band, in needle units (±0.55 ≈ CG 20–30% MAC)
const CG_K = 0.014, BURN_K = 0.05;         // signature → flight: pitch-moment coefficient, trim-drag factor

const LINES = {
  firstPlace: 'First can placed by your own hand, Captain. Watch the needle — she tells the truth before the sheet does.',
  outFwd: 'Needle’s forward of the band, Captain. Heavy nose — she’ll want a firm hand on rotation. Sign it only if you mean it.',
  outAft: 'Needle’s aft of the band, Captain. Tail-happy — she’ll lift her nose if you so much as look at her. Sign it only if you mean it.',
  backIn: 'Needle’s back inside the band. Tidy work.',
  refused: n => `${n} refused — it stays on the ramp and watches us leave. Your sheet, your call.`,
  unrefused: n => `${n} back on the sheet. The ramp forgives, Captain.`,
  signIn: 'Signed, in the band. That’s a load I’d fly behind, Captain.',
  signOut: 'Signed out of band — stamped as such, and she’s yours. The needle doesn’t lie, but around here it doesn’t ground you either.',
  signEmpty: 'Signed with an empty belly. Light ship, Captain — she’ll climb like she means it.',
};

function foxSpec() { const t = TYPES.find(x => x.id === 'fox') || TYPES[0]; return { G: t.gse, D: t.dim }; }
// stand-local prop spots (the Stand7 corner frame: x right of the aircraft, z aft)
const SPOTS = {
  staged: [{ x: 24, z: 15.5 }, { x: 28.5, z: 15.5 }, { x: 24, z: 20 }, { x: 28.5, z: 20 }],
  fwd: [{ x: 11, z: -11.5 }, { x: 11, z: -5.5 }],
  aft: [{ x: 11, z: 4.5 }, { x: 11, z: 10.5 }],
  refused: { x: 31, z: 27 },
};

export class Signature {
  constructor(stand7, fdm, { toast = () => { }, scene = null, ground = null } = {}) {
    this.stand7 = stand7; this.fdm = fdm; this.toast = toast; this.scene = scene; this.ground = ground;
    this.active = false; this.signed = false; this.stamp = null; this._group = null; this._uld = null; this._acc = 1;
    this.units = {}; for (const u of UNITS) this.units[u.id] = { def: u, st: 'staged' };
    this.trust = { walked: false, secured: false, signed: false };
    // ---- the load sheet panel (same glass language as the Ramp Sequence panel)
    const root = document.createElement('div'); root.id = 'sigPanel'; root.className = 'glass'; root.hidden = true;
    root.style.cssText = 'position:fixed;z-index:6;left:max(16px,env(safe-area-inset-left,0px));top:290px;width:min(430px,92vw);max-height:calc(100vh - 320px);overflow:auto;padding:12px;display:grid;gap:10px;pointer-events:auto;background:rgba(14,18,24,.92)';
    const btn = 'padding:5px 11px;border-radius:6px;border:1px solid var(--line2);background:rgba(255,255,255,.05);font:11px var(--f-mono);letter-spacing:.06em;color:var(--ink);white-space:nowrap';
    this._btnCss = btn;
    root.innerHTML = `<div class="rhead"><span class="rlab">STAND 7 · LOAD SHEET</span><span class="rname" data-k="sum" style="font:11px var(--f-mono);color:var(--mute)"></span><button data-k="close" aria-label="Close load sheet" style="padding:2px 8px;color:var(--mute)">✕</button></div>
      <div>
        <div style="display:flex;justify-content:space-between;font:10px var(--f-mono);letter-spacing:.1em;color:var(--mute)"><span>NOSE HEAVY</span><span data-k="cgpct" style="color:var(--ink)"></span><span>TAIL HEAVY</span></div>
        <div data-k="track" style="position:relative;height:14px;border:1px solid var(--line2);border-radius:7px;margin-top:4px;background:rgba(255,255,255,.04)">
          <div data-k="band" style="position:absolute;top:0;bottom:0;border-radius:6px;background:rgba(85,224,143,.18);border-left:1px solid rgba(85,224,143,.5);border-right:1px solid rgba(85,224,143,.5)"></div>
          <div data-k="needle" style="position:absolute;top:-3px;width:3px;height:18px;border-radius:2px;background:#ffb84d;box-shadow:0 0 6px rgba(255,184,77,.7)"></div>
        </div>
        <div data-k="cglabel" style="font:11px var(--f-mono);letter-spacing:.05em;margin-top:4px"></div>
      </div>
      <div class="ropts" data-k="rows"></div>
      <div data-k="note" style="font-size:12px;color:var(--mute);min-height:1.2em"></div>
      <div data-k="stamp" hidden style="font:12px var(--f-mono);letter-spacing:.06em;border-radius:6px;padding:8px 10px"></div>
      <div class="rfoot"><span data-k="trust" style="font:11px var(--f-mono);color:var(--mute)"></span><button data-k="sign" style="${btn};border-color:rgba(242,118,46,.55);color:#ffb84d">SIGN THE LOAD SHEET</button></div>`;
    document.body.appendChild(root); this.el = root;
    const q = k => root.querySelector(`[data-k="${k}"]`); this._q = q;
    q('close').onclick = () => this.toggle(false);
    q('sign').onclick = () => this.sign();
    const band = q('band'); band.style.left = (50 - BAND * 50) + '%'; band.style.width = (BAND * 100) + '%';
    const rowsEl = q('rows'); this.rows = {};
    for (const u of UNITS) {
      const el = document.createElement('div'); el.className = 'ropt'; el.style.gridTemplateColumns = '1fr auto'; el.dataset.unitRow = u.id;
      el.innerHTML = `<span><span data-n></span><br><small data-s></small></span>
        <span style="display:flex;gap:5px;align-items:center">
          <button data-act="fwd" style="${btn}">FWD</button><button data-act="aft" style="${btn}">AFT</button><button data-act="refuse" style="${btn}">REFUSE</button></span>`;
      el.querySelector('[data-act="fwd"]').onclick = () => this.place(u.id, 'fwd');
      el.querySelector('[data-act="aft"]').onclick = () => this.place(u.id, 'aft');
      el.querySelector('[data-act="refuse"]').onclick = () => this.refuse(u.id);
      rowsEl.appendChild(el);
      this.rows[u.id] = { el, name: el.querySelector('[data-n]'), sub: el.querySelector('[data-s]'), fwd: el.querySelector('[data-act="fwd"]'), aft: el.querySelector('[data-act="aft"]'), refuse: el.querySelector('[data-act="refuse"]') };
    }
  }
  get open() { return !this.el.hidden; }
  toggle(open) { if (!this.active) return false; this.el.hidden = !(open ?? this.el.hidden); if (!this.el.hidden) this.refresh(); return !this.el.hidden; }
  focusables() { return [...this.el.querySelectorAll('button')].filter(e => !e.disabled && e.style.display !== 'none'); }

  // ------------------------------------------------------------ arm / disarm
  arm({ standB = null, stand = null } = {}) {
    this.active = true; this.signed = false; this.stamp = null; this._placedOnce = false; this._wasOut = false;
    for (const u of UNITS) this.units[u.id].st = 'staged';
    this.trust = { walked: false, secured: false, signed: false };
    this._q('stamp').hidden = true; this._q('note').textContent = 'Place each unit — FWD or AFT — or refuse it. Skip the sheet entirely and the crew loads her standard, as always.';
    if (standB && stand && this.scene && this.ground) this._buildProps(standB, stand);
    this.toggle(false); this.refresh();
  }
  disarm() {
    this.active = false; this.el.hidden = true;
    if (this._group) { this.scene && this.scene.remove(this._group); this._group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this._group = null; this._uld = null; }
  }
  _frame(standB, st) { const fr = standB.b.frame; return { x: standB.x + st.x - fr.nx * 2, z: standB.z + st.z - fr.nz * 2, yaw: Math.atan2(fr.nx, fr.nz) }; }
  _buildProps(standB, stand) {
    const f = this._frame(standB, stand);
    const g = new THREE.Group(); g.name = 'stand7-load';
    g.position.set(f.x, this.ground(f.x, f.z).h, f.z); g.rotation.y = f.yaw;
    SPOTS.staged.forEach(p => { const d = makeVehicle('dolly'); d.obj.position.set(p.x, 0, p.z); d.obj.rotation.y = Math.PI / 2; g.add(d.obj); });
    const [ua, ub] = uldMeshes(UNITS.length); this._uld = [ua, ub]; g.add(ua, ub);
    this.scene.add(g); this._group = g; this._layout();
  }
  _spotFor(u) {
    if (u.st === 'refused') return { ...SPOTS.refused, y: 0.02 };
    if (u.st === 'fwd' || u.st === 'aft') { const placed = UNITS.filter(x => this.units[x.id].st === u.st); const i = Math.max(0, placed.indexOf(u.def)); return { ...SPOTS[u.st][Math.min(i, 1)], y: 0.55 }; }
    if (u.st === 'crew') return { ...SPOTS.aft[UNITS.indexOf(u.def) % 2], y: 0.55 };
    const i = UNITS.indexOf(u.def); return { ...SPOTS.staged[i], y: 0.55 };
  }
  _layout() {
    if (!this._uld) return;
    UNITS.forEach((u, i) => { const s = this._spotFor(this.units[u.id]); const m = T(s.x, s.y, s.z, (i % 2 ? -0.04 : 0.05)); this._uld[0].setMatrixAt(i, m); this._uld[1].setMatrixAt(i, m); });
    this._uld[0].instanceMatrix.needsUpdate = this._uld[1].instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------ the sheet's arithmetic
  cg() {
    let moment = 0, kg = 0;
    for (const u of UNITS) { const s = this.units[u.id]; if (s.st === 'fwd' || s.st === 'aft') { moment += u.kg * ARM[s.st]; kg += u.kg; } }
    const norm = Math.max(-1, Math.min(1, (moment / (M0 + kg)) / 0.55));
    return { norm, pct: 25 + norm * 9, kg, inBand: Math.abs(norm) <= BAND };
  }
  _count(pos) { return UNITS.filter(u => this.units[u.id].st === pos).length; }

  // ------------------------------------------------------------ the captain's hands
  place(id, pos) {
    if (!this.active || this.signed) return;
    const u = this.units[id]; if (!u || u.st === pos) return;
    if (this._count(pos) >= CAP[pos]) { this.toast(`The ${pos} hold is full — two positions, no more. Move something or refuse it.`); return; }
    u.st = pos; this._layout();
    const c = this.cg();
    if (!this._placedOnce) { this._placedOnce = true; this.stand7.say(LINES.firstPlace); }
    else if (!c.inBand && !this._wasOut) this.stand7.say(c.norm > 0 ? LINES.outAft : LINES.outFwd);
    else if (c.inBand && this._wasOut) this.stand7.say(LINES.backIn);
    this._wasOut = !c.inBand;
    this.refresh();
  }
  refuse(id) {
    if (!this.active || this.signed) return;
    const u = this.units[id]; if (!u) return;
    if (u.st === 'refused') { u.st = 'staged'; this.stand7.say(LINES.unrefused(u.def.kind)); }
    else { u.st = 'refused'; this.stand7.say(LINES.refused(u.def.kind)); }
    this._layout();
    const c = this.cg(); this._wasOut = !c.inBand;
    this.refresh();
  }
  sign() {
    if (!this.active || this.signed) return;
    // anything still on its dolly is loaded by the crew in the standard position —
    // the sheet records it, the needle doesn't move for it, and "secured" stays
    // unearned: that stamp means every accepted can was placed by the captain.
    let crewLoaded = [];
    for (const u of UNITS) { const s = this.units[u.id]; if (s.st === 'staged') { s.st = 'crew'; crewLoaded.push(u.kind); } }
    this._layout();
    const c = this.cg();
    this.signed = true; this.trust.signed = true;
    this.trust.secured = UNITS.every(u => { const st = this.units[u.id].st; return st === 'fwd' || st === 'aft' || st === 'refused'; });
    this.stamp = c.kg === 0 ? 'empty' : c.inBand ? 'in' : 'out';
    // the signature reaches the flight model: a constant pitch moment from the CG
    // offset (the law trims it out — the stab settles where the signature put it)
    // and the trim-drag factor on the burn. Standard/unsigned stays exactly 0 / 1.
    this.fdm.cgCm = CG_K * c.norm; this.fdm.burnFactor = 1 + BURN_K * Math.abs(c.norm);
    this.stand7.say(this.stamp === 'empty' ? LINES.signEmpty : this.stamp === 'in' ? LINES.signIn : LINES.signOut);
    this.toast(`Load sheet signed — CG ${c.pct.toFixed(1)}% MAC · ${c.kg.toLocaleString()} kg aboard${this.stamp === 'out' ? ' · OUT OF BAND, stamped' : ''}. She flies the way you loaded her.`, 7000);
    if (crewLoaded.length) this._q('note').textContent = `Crew-loaded standard (not on the needle): ${crewLoaded.join(', ')}.`;
    this.refresh();
  }

  // ------------------------------------------------------------ per-frame
  update(dt) {
    if (!this.active) return;
    if (this.stand7.closed && this.open) this.toggle(false); // pushback ends the ground game; the sheet is history
    this._acc += dt;
    if (this._acc > 0.25) {
      this._acc = 0;
      // the walk-around is a Trust stamp, never a grade: done is done, and how
      // long it took is recorded nowhere (Summit law 3).
      if (!this.trust.walked && this.stand7.active) { try { if (Walkaround.state().complete) this.trust.walked = true; } catch (e) { } }
      if (this.open) this.refresh();
    }
  }
  refresh() {
    if (!this.active) return;
    const c = this.cg();
    this._q('needle').style.left = `calc(${50 + c.norm * 50}% - 1px)`;
    this._q('needle').style.background = c.inBand ? '#55e08f' : '#e06c5f';
    this._q('cgpct').textContent = `CG ${c.pct.toFixed(1)}% MAC`;
    const lbl = this._q('cglabel');
    lbl.textContent = c.kg === 0 ? 'NOTHING PLACED — the crew’s standard load rides the centre' : `${c.kg.toLocaleString()} kg placed · ${c.inBand ? 'IN THE BAND' : c.norm > 0 ? 'AFT OF THE BAND' : 'FORWARD OF THE BAND'}`;
    lbl.style.color = c.kg === 0 ? 'var(--mute)' : c.inBand ? '#55e08f' : '#e06c5f';
    this._q('sum').textContent = this.signed ? 'SIGNED' : `${UNITS.filter(u => this.units[u.id].st !== 'staged').length} of ${UNITS.length} decided`;
    for (const u of UNITS) {
      const s = this.units[u.id], r = this.rows[u.id];
      const stTxt = s.st === 'staged' ? 'ON ITS DOLLY · UNDECIDED' : s.st === 'fwd' ? 'FWD HOLD' : s.st === 'aft' ? 'AFT HOLD' : s.st === 'crew' ? 'CREW-LOADED · STANDARD' : 'REFUSED · STAYS ON THE RAMP';
      r.name.textContent = `${u.kind} — ${u.label}`;
      r.sub.textContent = `${u.kg.toLocaleString()} kg · ${stTxt}`;
      r.fwd.disabled = this.signed || s.st === 'fwd' || (s.st !== 'fwd' && this._count('fwd') >= CAP.fwd);
      r.aft.disabled = this.signed || s.st === 'aft' || (s.st !== 'aft' && this._count('aft') >= CAP.aft);
      r.refuse.disabled = this.signed || s.st === 'crew';
      r.refuse.textContent = s.st === 'refused' ? 'UN-REFUSE' : 'REFUSE';
    }
    const st = this._q('stamp');
    if (this.signed) {
      st.hidden = false;
      const who = 'SIGNED — N. GRAHAM, CAPTAIN';
      if (this.stamp === 'in') { st.textContent = `✓ ${who} · IN BALANCE · CG ${c.pct.toFixed(1)}%`; st.style.color = '#55e08f'; st.style.border = '1px solid rgba(85,224,143,.45)'; }
      else if (this.stamp === 'out') { st.textContent = `⚠ ${who} · OUT OF BALANCE — SIGNED ANYWAY · CG ${c.pct.toFixed(1)}%`; st.style.color = '#ffb84d'; st.style.border = '1px solid rgba(255,184,77,.5)'; }
      else { st.textContent = `✓ ${who} · NOTHING ABOARD`; st.style.color = 'var(--mute)'; st.style.border = '1px solid var(--line2)'; }
      this._q('sign').disabled = true; this._q('sign').textContent = 'SIGNED ✓';
    } else { st.hidden = true; this._q('sign').disabled = false; this._q('sign').textContent = 'SIGN THE LOAD SHEET'; }
    const t = this.trust;
    this._q('trust').textContent = `TRUST — WALKED ${t.walked ? '✓' : '—'} · SECURED ${t.secured ? '✓' : '—'} · SIGNED ${t.signed ? '✓' : '—'}`;
  }
  state() {
    const c = this.cg();
    const o = { active: this.active, panelOpen: this.open, signed: this.signed, stamp: this.stamp, cgNorm: +c.norm.toFixed(3), cgPct: +c.pct.toFixed(1), inBand: c.inBand, loadedKg: c.kg, trust: { ...this.trust }, fdm: { cgCm: +(this.fdm.cgCm || 0).toFixed(4), burnFactor: +(this.fdm.burnFactor || 1).toFixed(4) }, units: {} };
    if (this._group) this._group.updateMatrixWorld(true);
    for (const u of UNITS) {
      const s = this.units[u.id], spot = this._spotFor(s);
      const w = this._group ? this._group.localToWorld(new THREE.Vector3(spot.x, spot.y, spot.z)) : null;
      o.units[u.id] = { st: s.st, kg: u.kg, world: w ? [+w.x.toFixed(1), +w.y.toFixed(1), +w.z.toFixed(1)] : null };
    }
    o.propsInScene = !!this._group;
    return o;
  }
}
