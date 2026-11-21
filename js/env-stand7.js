// Era Three — HOME FIELD · Phase 1a "The Anchor" (environment artist).
// Stand 7 at KTPA is the captain's home stand. When he departs KTPA from Stand 7 in an
// airliner (never the charter PJ-1 — Era Two owns the apron), the automatic turnaround
// steps aside and HE conducts: a Ramp Sequence panel extends the ground-services idea
// with CALL / HOLD / RE-SEQUENCE for the three GSE services that share the stand's one
// equipment lane — Fuel, Baggage & cargo, Catering. The lane is real: only one service
// may be in transit at a time, because the shipped choreography routes every vehicle
// down the same lane (env-turnaround.js Leg paths, x = span/2 + 3.1). A service called
// while the lane is held waits at staging — visibly named in the panel — until the lane
// clears. Docked services work in parallel; the player sequences the movements.
// Ray, the named ramp lead, speaks through the panel at every beat that matters.
// Signed laws honoured here: No Dead Air (Ray nudges after 45 s without a decision —
// a line, never a penalty), the walk-around is never timed or mentioned, nothing is
// scored, pushback stays the captain's free choice at any moment (forgiveness).
// Neighbour stands 6 and 8 carry frozen-phase theatre: posed GSE around the scenery
// fleet, zero per-frame cost. Stand 7's own corner is dressed from the existing kit:
// a ULD rack row, a spare GPU, and the fox on the lead-in line.
import * as THREE from 'three';
import { makeVehicle, POSE, gpuUnit, coneGeometry, gseMats, uldMeshes, T } from './env-gse.js';
import { TYPES } from './ac-types.js';

export const HOME_ICAO = 'KTPA', HOME_GATE = '7';
export const LEAD_NAME = 'Ray';

// the three conducted services: crewIds are GroundCrew SERVICES ids (groundcrew.js),
// veh are Turnaround vehicle ids (env-turnaround.js); work = docked work seconds.
const SEQ = [
  { id: 'fuel', name: 'Fuel', crewIds: ['fuel'], veh: ['fuel'], work: 80, fee: 160, sub: 'hydrant dispenser · right wing' },
  { id: 'bags', name: 'Baggage & cargo', crewIds: ['bags'], veh: ['belt1', 'belt2', 'cont', 'train'], work: 120, fee: 220, sub: 'belt loaders · ULD loader · baggage train' },
  { id: 'cater', name: 'Catering', crewIds: ['cat1', 'cat2'], veh: ['cat1', 'cat2'], work: 65, fee: 140, sub: 'hi-lift trucks · doors R1 + R2' },
];
const COL = { working: '#55e08f', coming: '#ffb84d', leaving: '#66d7ea', done: '#8e99a8', away: '#4b5563', queued: '#ffb84d', held: '#e06c5f' };

const LINES = {
  greet: tod => (tod < 720 ? 'Morning' : tod < 1080 ? 'Afternoon' : 'Evening') + ', Captain. Stand 7 — she’s yours. Fuel, bags, catering: your call who takes the lane first.',
  firstDispatch: 'Rolling. One service on the lane at a time — that’s the rule that keeps the paint on.',
  dispatch: n => `${n} is rolling.`,
  queued: (n, h) => `${n} holds at staging — ${h} owns the lane. Re-sequence or hold whoever you like; the lane frees when ${h} parks.`,
  laneFree: n => `Lane’s clear. ${n} — you’re up.`,
  doneOne: { fuel: 'Fuel’s done — hose in, panel shut.', bags: 'Bags are done. Every can accounted for.', cater: 'Catering’s done and clear of the doors.' },
  doneAll: 'That’s a turnaround, Captain. Stand 7 is clear — push when you’re ready and I’ll walk her out.',
  hold: n => `${n} held. Your ramp, your order.`,
  unhold: n => `${n} released.`,
  recall: n => `${n} called off — they’ll clear the lane.`,
  pauseWork: n => `${n} holding at the aircraft. Crew’s patient; so am I.`,
  resumeWork: n => `${n} back at it.`,
  nudge: 'Lane’s empty and the clock’s awake, Captain. Who’s next?',
  pushDone: 'All services clear. Have a good flight, Captain — we’ll keep your stand.',
  pushEarly: 'Pushing with work undone — your call, Captain. Stand 7 keeps the rest warm.',
  brake: 'Parking brake first, Captain — then the ramp is yours.',
  // [Home Field 1b] the priced second route (No Dead Air: a queued service always has a priced way out)
  offer: (n, fee) => `${n} could come round the apron side — second route, $${fee} flat. Your call, Captain; the lane’s free eventually either way.`,
  route: (n, fee) => `${n} — rolling round the apron side. $${fee} on the field’s tab.`,
  routeRefused: n => `Fair enough — ${n} waits for the lane. Patience is free, Captain.`,
};

// KTPA's home stand for pickStand (main.js): gate 7, if it exists and is free.
export function homeStand(b) {
  if (!b || !b.apt || b.apt.icao !== HOME_ICAO || !b.b || !b.b.stands) return null;
  const all = b.b.stands; all.forEach((s, i) => { s.gateName = String(i + 1); });
  const st = all[+HOME_GATE - 1]; if (!st || st.used) return null;
  st.used = true; return st;
}

function foxSpec() { const t = TYPES.find(x => x.id === 'fox') || TYPES[0]; return { G: t.gse, D: t.dim }; }

// a low-poly fox head on canvas (the home-stand medallion / sign art)
function foxCanvas(size, withText) {
  const c = document.createElement('canvas'); c.width = size; c.height = withText ? size / 2 : size;
  const x = c.getContext('2d'), W = c.width, H = c.height, u = Math.min(W, H) / 100;
  x.fillStyle = '#0d1420'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#f2762e'; x.lineWidth = 3 * u; x.strokeRect(3 * u, 3 * u, W - 6 * u, H - 6 * u);
  const cx = withText ? 26 * u : 50 * u, cy = H / 2, s = (withText ? 0.62 : 0.92) * (H / 100);
  const P = (pts, fill) => { x.fillStyle = fill; x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(cx + (px - 50) * s, cy + (py - 50) * s) : x.moveTo(cx + (px - 50) * s, cy + (py - 50) * s)); x.closePath(); x.fill(); };
  P([[16, 6], [38, 30], [14, 34]], '#f2762e'); P([[84, 6], [62, 30], [86, 34]], '#f2762e'); // ears
  P([[16, 6], [26, 16], [36, 28], [14, 34]], '#8a3b12'); P([[84, 6], [74, 16], [64, 28], [86, 34]], '#8a3b12'); // ear shade
  P([[14, 34], [86, 34], [76, 62], [60, 88], [50, 96], [40, 88], [24, 62]], '#f2762e'); // head
  P([[24, 62], [40, 88], [50, 96], [60, 88], [76, 62], [64, 74], [50, 80], [36, 74]], '#f5ede2'); // cheeks / muzzle
  P([[44, 84], [56, 84], [50, 93]], '#14181f'); // nose
  P([[30, 52], [42, 50], [36, 58]], '#14181f'); P([[70, 52], [58, 50], [64, 58]], '#14181f'); // eyes
  if (withText) {
    x.fillStyle = '#e8edf5'; x.textAlign = 'left'; x.textBaseline = 'middle';
    x.font = `700 ${30 * u}px "B612 Mono", monospace`; x.fillText('7', 46 * u, cy - 14 * u);
    x.font = `700 ${13.5 * u}px "B612 Mono", monospace`; x.fillText('FOXHEART', 58 * u, cy - 15 * u);
    x.fillStyle = '#8e9bb1'; x.font = `500 ${10.5 * u}px "B612 Mono", monospace`; x.fillText('HOME STAND · KTPA', 58 * u, cy + 8 * u);
    x.fillStyle = '#f2762e'; x.font = `italic 500 ${10.5 * u}px "B612 Mono", monospace`; x.fillText('we kept your stand', 58 * u, cy + 26 * u);
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Stand7 {
  constructor(crew, { toast = () => { }, scene = null, ground = null, openClassic = null, onLoad = null } = {}) {
    this.crew = crew; this.toast = toast; this.scene = scene; this.ground = ground; this.openClassic = openClassic;
    this.onLoad = onLoad; // [Home Field 1b] the LOAD SHEET button on the Baggage & cargo row (wired by main.js)
    this.active = false; this.closed = false; this.seqDone = false; this.t = 0; this.lastAction = 0; this._savedAuto = null; this.fees = 0;
    this.svc = {}; for (const def of SEQ) this.svc[def.id] = { def, st: 'away', held: false, paused: false, recalling: false, workT: 0, external: false, alt: false, offered: false, offerT: 0 };
    this.queue = []; this.leadLine = ''; this._dress = []; this._acc = 1;
    // ---- panel DOM (the Ramp Sequence panel; same glass language as env-svcpanel.js)
    const root = document.createElement('div'); root.id = 'stand7Panel'; root.className = 'glass'; root.hidden = true;
    root.style.cssText = 'position:fixed;z-index:6;right:max(16px,env(safe-area-inset-right,0px));top:170px;width:min(430px,92vw);max-height:calc(100vh - 210px);overflow:auto;padding:12px;display:grid;gap:10px;pointer-events:auto;background:rgba(14,18,24,.92)';
    const btn = 'padding:5px 11px;border-radius:6px;border:1px solid var(--line2);background:rgba(255,255,255,.05);font:11px var(--f-mono);letter-spacing:.06em;color:var(--ink);white-space:nowrap';
    this._btnCss = btn;
    root.innerHTML = `<div class="rhead"><span class="rlab">STAND 7 · RAMP SEQUENCE</span><span class="rname" data-k="clock" style="font:11px var(--f-mono);color:var(--mute)"></span><button data-k="close" aria-label="Close ramp sequence" style="padding:2px 8px;color:var(--mute)">✕</button></div>
      <div style="border-left:2px solid var(--fox,#f2762e);padding:2px 0 2px 10px"><div style="font:600 10px var(--f-mono);letter-spacing:.14em;color:var(--fox,#f2762e)">${LEAD_NAME.toUpperCase()} · RAMP LEAD</div><div data-k="lead" style="font-size:12.5px;color:var(--ink);min-height:1.45em"></div></div>
      <div data-k="lane" style="font:11px var(--f-mono);letter-spacing:.06em;padding:5px 9px;border-radius:6px;border:1px solid var(--line2)"></div>
      <div class="ropts" data-k="rows"></div>
      <div data-k="banner" hidden style="font:11px var(--f-mono);letter-spacing:.05em;color:#55e08f;border:1px solid rgba(85,224,143,.4);border-radius:6px;padding:6px 9px">TURNAROUND COMPLETE — STAND 7 IS CLEAR · PUSHBACK (K) WHEN READY</div>
      <div class="rfoot"><span data-k="tally" style="font:11px var(--f-mono);color:var(--mute)"></span><button data-k="other" style="${btn}">Other services</button></div>`;
    document.body.appendChild(root); this.el = root;
    const q = k => root.querySelector(`[data-k="${k}"]`); this._q = q;
    q('close').onclick = () => this.toggle(false);
    q('other').onclick = () => { if (this.openClassic) this.openClassic(); };
    const rowsEl = q('rows'); this.rows = {};
    for (const def of SEQ) {
      const el = document.createElement('div'); el.className = 'ropt'; el.style.gridTemplateColumns = 'auto 1fr auto'; el.dataset.svcRow = def.id;
      el.innerHTML = `<i style="width:9px;height:9px;border-radius:50%;display:block"></i>
        <span><span data-n></span><br><small data-s></small>
        <span data-bar style="display:block;height:3px;border-radius:2px;background:rgba(255,255,255,.08);margin-top:4px;overflow:hidden"><span data-fill style="display:block;height:100%;width:0%;background:#55e08f"></span></span></span>
        <span style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <button data-act="up" style="${btn}" title="Re-sequence: move up the queue">▲</button><button data-act="dn" style="${btn}" title="Re-sequence: move down the queue">▼</button>
          <button data-act="hold" style="${btn}">HOLD</button><button data-act="main" style="${btn}"></button><button data-act="route" style="${btn}" title="Priced second route: come round the apron side, now"></button>${def.id === 'bags' ? `<button data-act="load" style="${btn}" title="The load sheet: place the ULDs, watch the needle, sign">LOAD SHEET</button>` : ''}</span>`;
      el.querySelector('[data-act="main"]').onclick = () => this.mainAction(def.id);
      el.querySelector('[data-act="hold"]').onclick = () => this.holdAction(def.id);
      el.querySelector('[data-act="up"]').onclick = () => this.move(def.id, -1);
      el.querySelector('[data-act="dn"]').onclick = () => this.move(def.id, 1);
      el.querySelector('[data-act="route"]').onclick = () => this.secondRoute(def.id);
      const loadBtn = el.querySelector('[data-act="load"]'); if (loadBtn) loadBtn.onclick = () => { if (this.onLoad) this.onLoad(); };
      rowsEl.appendChild(el);
      this.rows[def.id] = { el, dot: el.querySelector('i'), name: el.querySelector('[data-n]'), sub: el.querySelector('[data-s]'), fill: el.querySelector('[data-fill]'), bar: el.querySelector('[data-bar]'), main: el.querySelector('[data-act="main"]'), hold: el.querySelector('[data-act="hold"]'), up: el.querySelector('[data-act="up"]'), dn: el.querySelector('[data-act="dn"]'), route: el.querySelector('[data-act="route"]'), load: loadBtn };
    }
  }
  get open() { return !this.el.hidden; }
  toggle(open) { this.el.hidden = !(open ?? this.el.hidden); if (!this.el.hidden) this.refresh(); return !this.el.hidden; }
  focusables() { return [...this.el.querySelectorAll('button')].filter(e => !e.disabled && e.style.display !== 'none'); }
  say(line) { this.leadLine = line; const el = this._q('lead'); if (el) el.textContent = line; }

  // ------------------------------------------------------------ arm / disarm
  preArm() { if (this._savedAuto == null) this._savedAuto = this.crew.autoServices; this.crew.autoServices = false; }
  arm({ standB = null, stand = null, tod = 1080, onFoot = false } = {}) {
    this.active = true; this.closed = false; this.seqDone = false; this.t = 0; this.lastAction = 0; this.queue = []; this._dispatchedOnce = false; this.fees = 0;
    for (const id in this.svc) Object.assign(this.svc[id], { st: 'away', held: false, paused: false, recalling: false, workT: 0, external: false, alt: false, offered: false, offerT: 0 });
    this._q('banner').hidden = true;
    if (standB && stand && this.scene && this.ground) { this._buildCorner(standB, stand); this._buildNeighbours(standB, stand); }
    const g = LINES.greet(tod); this.say(g); this.toast(LEAD_NAME + ': ' + g, 7000);
    if (!onFoot) this.toggle(true); else this.toggle(false);
    this.refresh();
  }
  disarm() {
    // restore the captain's own auto-turnaround preference — unless he changed it himself mid-flight
    if (this._savedAuto != null) { if (this.crew.autoServices === false) this.crew.autoServices = this._savedAuto; this._savedAuto = null; }
    this.active = false; this.closed = false; this.toggle(false);
    for (const g of this._dress) { this.scene && this.scene.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.userData.ownMat) { o.material.map && o.material.map.dispose(); o.material.dispose(); } }); }
    this._dress = [];
  }

  // ------------------------------------------------------------ the conducted sequence
  turn() { return this.crew.turn; }
  vstates(def) { const t = this.turn(); return def.veh.map(id => t.vstate(t.V[id])); }
  laneHolder() {
    for (const def of SEQ) { const s = this.svc[def.id]; if (!s.alt && (s.st === 'entering' || s.st === 'leaving')) return def; } // [1b] a second-route service travels the apron side — it never owns the lane
    // a finished or dismissed service's trucks still own the lane while they drive off
    if (this.turn() && this.turn().mode) for (const def of SEQ) { const s = this.svc[def.id]; if (!s.alt && (s.st === 'done' || s.st === 'working') && this.vstates(def).some(v => v === 'leaving')) return def; }
    return null;
  }
  dispatch(def, auto = false, alt = false) {
    const s = this.svc[def.id]; let ok = true, msg = '';
    for (const cid of def.crewIds) { const r = this.crew.callService(cid); if (r && !r.ok) { ok = false; msg = r.msg; } }
    if (!ok) { this.say(LINES.brake); if (msg) this.toast(msg); return false; }
    s.st = 'entering'; s.recalling = false; s.alt = !!alt; this.lastAction = this.t;
    const qi = this.queue.indexOf(def.id); if (qi >= 0) this.queue.splice(qi, 1);
    if (alt) this.say(LINES.route(def.name, def.fee));
    else if (auto) this.say(LINES.laneFree(def.name));
    else { this.say(!this._dispatchedOnce ? LINES.firstDispatch : LINES.dispatch(def.name)); this._dispatchedOnce = true; }
    return true;
  }
  // [Home Field 1b] the priced second route: a queued service comes round the apron
  // side right now, for a flat fee shown before it is paid. Refusing costs the wait.
  secondRoute(id) {
    const s = this.svc[id], def = s.def; if (!s || s.st !== 'queued') return;
    if (this.dispatch(def, false, true)) { this.fees += def.fee; this.lastAction = this.t; }
    this.refresh();
  }
  mainAction(id) {
    const s = this.svc[id], def = s.def; this.lastAction = this.t;
    if (s.st === 'away') {
      const holder = this.laneHolder();
      if (!holder && !this.queue.some(qid => !this.svc[qid].held)) { if (!this.dispatch(def)) return; }
      else { s.st = 'queued'; if (!this.queue.includes(id)) this.queue.push(id); this.say(LINES.queued(def.name, holder ? holder.name : 'the queue')); }
    } else if (s.st === 'queued') {
      if (s.held) { s.held = false; this.say(LINES.unhold(def.name)); }
      else { this.queue = this.queue.filter(q => q !== id); s.st = 'away'; this.say(LINES.recall(def.name)); }
    } else if (s.st === 'entering' || s.st === 'working') {
      for (const cid of def.crewIds) this.crew.dismissService(cid);
      s.recalling = s.st === 'entering'; s.st = 'leaving'; s.paused = false; s.workT = 0; this.say(LINES.recall(def.name));
    }
    this.refresh();
  }
  holdAction(id) {
    const s = this.svc[id], def = s.def; this.lastAction = this.t;
    if (s.st === 'queued') { s.held = !s.held; this.say(s.held && s.offered ? LINES.routeRefused(def.name) : s.held ? LINES.hold(def.name) : LINES.unhold(def.name)); } // [1b] holding a service with a priced route on the table is the refusal — Ray notes it, once, without a grudge
    else if (s.st === 'working') { s.paused = !s.paused; this.say(s.paused ? LINES.pauseWork(def.name) : LINES.resumeWork(def.name)); }
    this.refresh();
  }
  move(id, dir) {
    const i = this.queue.indexOf(id); if (i < 0) return; const j = i + dir; if (j < 0 || j >= this.queue.length) return;
    [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]]; this.lastAction = this.t; this.refresh();
  }
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const crew = this.crew;
    if (!this.closed && (crew.state === 'prep' || crew.state === 'pushing' || crew.state === 'release')) {
      this.closed = true; this.say(this.seqDone ? LINES.pushDone : LINES.pushEarly); this.toggle(false); return;
    }
    if (this.closed || crew.state !== 'parked' || !this.turn() || !this.turn().mode) { this._acc += dt; if (this._acc > 0.25) { this._acc = 0; this.refresh(); } return; }
    // adopt services called from anywhere (the classic panel stays live at Stand 7)
    for (const def of SEQ) {
      const s = this.svc[def.id], vs = this.vstates(def);
      const anyMoving = vs.some(v => v === 'coming' || v === 'leaving'), anyWorking = vs.some(v => v === 'working'), allAway = vs.every(v => v === 'away'), allWorking = vs.every(v => v === 'working');
      if (s.st === 'away' && (anyMoving || anyWorking)) { s.st = anyWorking && !anyMoving ? 'working' : 'entering'; s.external = true; this.lastAction = this.t; }
      else if (s.st === 'queued' && (anyMoving || anyWorking)) { this.queue = this.queue.filter(q => q !== def.id); s.st = 'entering'; s.external = true; }
      else if (s.st === 'entering') {
        if (allAway) { s.st = 'away'; s.recalling = false; }
        else if (allWorking && !s.recalling) { s.st = 'working'; s.workT = 0; this.lastAction = this.t; }
      } else if (s.st === 'working') {
        if (allAway || (vs.some(v => v === 'leaving') && !anyWorking)) { s.st = 'away'; s.workT = 0; s.paused = false; } // dismissed from the classic panel
        else if (!s.paused) { s.workT += dt; if (s.workT >= def.work) { s.st = 'done'; for (const cid of def.crewIds) this.crew.dismissService(cid); this.lastAction = this.t; this.say(LINES.doneOne[def.id]); if (SEQ.every(d => this.svc[d.id].st === 'done')) { this.seqDone = true; this._q('banner').hidden = false; this.say(LINES.doneAll); } } }
      } else if (s.st === 'leaving') { if (allAway) { s.st = 'away'; s.recalling = false; } }
      else if (s.st === 'done') { /* vehicles clear on their own; the record stands */ }
    }
    // the lane frees: send the first queued service that isn't held
    if (!this.laneHolder() && this.crew.canService() === '') {
      const next = this.queue.find(qid => !this.svc[qid].held);
      if (next) this.dispatch(this.svc[next].def, true);
    }
    // [Home Field 1b] No Dead Air, priced: a service still queued behind a held lane
    // after a few seconds gets Ray's second-route offer — once per queueing. The
    // offer never expires and refusing it costs nothing but the wait.
    for (const def of SEQ) {
      const s = this.svc[def.id];
      if (s.st !== 'queued') { s.offered = false; s.offerT = 0; continue; }
      if (!s.offered && !s.held && this.laneHolder()) { s.offerT += dt; if (s.offerT >= 6) { s.offered = true; this.say(LINES.offer(def.name, def.fee)); } }
    }
    // No Dead Air: a decision at least every ~45 s, or Ray asks for one (a line, never a penalty)
    const busy = SEQ.some(d => { const st = this.svc[d.id].st; return st === 'entering' || st === 'working' || st === 'leaving'; });
    if (!this.seqDone && !busy && !this.queue.some(q => !this.svc[q].held) && this.t - this.lastAction >= 45) { this.say(LINES.nudge); this.lastAction = this.t; }
    this._acc += dt; if (this._acc > 0.25) { this._acc = 0; this.refresh(); }
  }
  refresh() {
    if (!this.active) return;
    const mm = String(Math.floor(this.t / 60)).padStart(2, '0'), ss = String(Math.floor(this.t % 60)).padStart(2, '0');
    this._q('clock').textContent = mm + ':' + ss;
    const holder = this.laneHolder();
    const lane = this._q('lane');
    if (holder) { lane.textContent = '⬤ LANE — ' + holder.name.toUpperCase() + ' MOVING'; lane.style.color = '#ffb84d'; }
    else { lane.textContent = '⬤ LANE CLEAR'; lane.style.color = '#55e08f'; }
    let doneN = 0;
    for (const def of SEQ) {
      const s = this.svc[def.id], r = this.rows[def.id];
      if (s.st === 'done') doneN++;
      let label = '', col = COL.away;
      if (s.st === 'away') label = 'NOT CALLED';
      else if (s.st === 'queued') { const n = this.queue.indexOf(def.id) + 1; label = s.held ? `HELD BY YOU · #${n} IN QUEUE` : `HELD AT STAGING · #${n} IN QUEUE`; col = s.held ? COL.held : COL.queued; }
      else if (s.st === 'entering') { label = s.alt ? 'VIA THE APRON · DRIVING IN' : 'ON THE LANE · DRIVING IN'; col = COL.coming; }
      else if (s.st === 'working') { label = s.paused ? 'WORKING · HELD AT THE AIRCRAFT' : `WORKING · ${Math.max(0, Math.ceil(def.work - s.workT))}s`; col = COL.working; }
      else if (s.st === 'leaving') { label = 'CLEARING THE LANE'; col = COL.leaving; }
      else if (s.st === 'done') { label = 'DONE ✓'; col = COL.done; }
      r.dot.style.background = col; r.dot.style.boxShadow = s.st === 'working' ? '0 0 6px ' + col : 'none';
      r.name.textContent = def.name; r.sub.textContent = label + ' · ' + def.sub;
      r.fill.style.width = s.st === 'done' ? '100%' : s.st === 'working' ? Math.min(100, s.workT / def.work * 100) + '%' : '0%';
      r.bar.style.display = (s.st === 'working' || s.st === 'done') ? 'block' : 'none';
      const m = r.main;
      if (s.st === 'away') { m.textContent = 'CALL'; m.disabled = false; }
      else if (s.st === 'queued') { m.textContent = s.held ? 'CALL' : 'STAND DOWN'; m.disabled = false; }
      else if (s.st === 'entering') { m.textContent = 'RECALL'; m.disabled = false; }
      else if (s.st === 'working') { m.textContent = 'DISMISS'; m.disabled = false; }
      else if (s.st === 'leaving') { m.textContent = '···'; m.disabled = true; }
      else { m.textContent = 'DONE'; m.disabled = true; }
      const canHold = s.st === 'queued' || s.st === 'working';
      r.hold.style.display = canHold ? '' : 'none'; r.hold.textContent = (s.held || s.paused) ? 'HELD' : 'HOLD';
      r.hold.style.borderColor = (s.held || s.paused) ? 'rgba(224,108,95,.6)' : 'var(--line2)';
      const canSeq = s.st === 'queued' && this.queue.length > 1;
      r.up.style.display = r.dn.style.display = canSeq ? '' : 'none';
      r.up.disabled = this.queue.indexOf(def.id) <= 0; r.dn.disabled = this.queue.indexOf(def.id) >= this.queue.length - 1;
      // [1b] the priced second route is always on a queued service's row: hold, re-sequence, or pay — a decision, never dead air
      if (r.route) { r.route.style.display = s.st === 'queued' ? '' : 'none'; r.route.textContent = `2ND ROUTE $${def.fee}`; }
    }
    this._q('tally').textContent = doneN + ' of 3 complete';
    if (this.leadLine && this._q('lead').textContent !== this.leadLine) this._q('lead').textContent = this.leadLine;
  }
  state() {
    const o = { active: this.active, closed: this.closed, seqDone: this.seqDone, t: +this.t.toFixed(1), lead: this.leadLine, queue: this.queue.slice(), lane: (this.laneHolder() || {}).id || null, panelOpen: this.open, auto: this.crew.autoServices, dressed: this._dress.length, fees: this.fees, services: {} };
    for (const def of SEQ) { const s = this.svc[def.id]; o.services[def.id] = { st: s.st, held: s.held, paused: s.paused, alt: s.alt, offered: s.offered, workT: +s.workT.toFixed(1), veh: this.turn() && this.turn().mode ? this.vstates(def) : [] }; }
    return o;
  }

  // ------------------------------------------------------------ the corner + the neighbours (static theatre)
  _frame(standB, st) { const fr = standB.b.frame; return { x: standB.x + st.x - fr.nx * 2, z: standB.z + st.z - fr.nz * 2, yaw: Math.atan2(fr.nx, fr.nz) }; }
  _cones(g, D, n = 6) {
    const im = new THREE.InstancedMesh(coneGeometry(), gseMats(this.crew.q).paint, n);
    const ez = -1.05, pos = [[0, D.noseZ - 2.5], [-D.span / 2 - 0.6, 4], [D.span / 2 + 0.6, 4], [0, D.tailZ + 2], [-(5.75 + 0.75), ez], [5.75 + 0.75, ez]];
    pos.slice(0, n).forEach((p, i) => im.setMatrixAt(i, T(p[0], 0, p[1]))); im.castShadow = true; im.frustumCulled = false; g.add(im); return im;
  }
  _buildCorner(standB, stand) {
    const { G, D } = foxSpec(); const f = this._frame(standB, stand);
    const g = new THREE.Group(); g.name = 'stand7-corner'; g.position.set(f.x, this.ground(f.x, f.z).h, f.z); g.rotation.y = f.yaw;
    // the sign board on the lead-in line's left shoulder
    const signTex = foxCanvas(1024, true);
    const board = new THREE.Group(); board.position.set(-7.5, 0, -30); board.rotation.y = 0.15;
    const postG = new THREE.CylinderGeometry(0.06, 0.06, 1.7, 8), postM = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.6, metalness: 0.4 });
    for (const px of [-1.4, 1.4]) { const p = new THREE.Mesh(postG, postM); p.position.set(px, 0.85, 0); board.add(p); }
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 0.09), new THREE.MeshStandardMaterial({ color: 0x11161f, roughness: 0.7 })); body.position.y = 1.75; board.add(body);
    for (const s of [1, -1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.7), new THREE.MeshStandardMaterial({ map: signTex, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.38, roughness: 0.6 })); m.position.set(0, 1.75, s * 0.055); if (s < 0) m.rotation.y = Math.PI; m.userData.ownMat = true; board.add(m); }
    g.add(board);
    // the fox medallion painted on the lead-in line
    const medTex = foxCanvas(512, false);
    const med = new THREE.Mesh(new THREE.CircleGeometry(1.7, 28), new THREE.MeshStandardMaterial({ map: medTex, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 }));
    med.rotation.x = -Math.PI / 2; med.position.set(0, 0.03, -30.5); med.userData.ownMat = true; g.add(med);
    // ULD rack row on the staging hatching, clear of the lane (lane x ≈ 21)
    const rackM = new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.55, metalness: 0.5 });
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.22, 13.6), rackM); rack.position.set(26.5, 0.32, 10.2); rack.castShadow = true; g.add(rack);
    const [ua, ub] = uldMeshes(3);
    for (let i = 0; i < 3; i++) { const m = T(26.5, 0.55, 5.6 + i * 4.4, (i - 1) * 0.03); ua.setMatrixAt(i, m); ub.setMatrixAt(i, m); }
    ua.instanceMatrix.needsUpdate = ub.instanceMatrix.needsUpdate = true; g.add(ua, ub);
    // spare GPU + a dolly, parked on the corner
    const gpu = gpuUnit(); gpu.position.set(25.5, 0, -8); gpu.rotation.y = 0.4; g.add(gpu);
    const dolly = makeVehicle('dolly'); dolly.obj.position.set(25.2, 0, 1.5); dolly.obj.rotation.y = Math.PI / 2; g.add(dolly.obj);
    this._cones(g, D, 4).position.set(23.6, 0, 3.2);
    this.scene.add(g); this._dress.push(g);
  }
  _buildNeighbours(standB, stand) {
    const { G, D } = foxSpec(); const stands = standB.b.stands; const idx = stands.indexOf(stand);
    const mk = (nst, phase) => {
      if (!nst) return; const f = this._frame(standB, nst);
      const g = new THREE.Group(); g.name = 'stand7-neighbour'; g.position.set(f.x, this.ground(f.x, f.z).h, f.z); g.rotation.y = f.yaw;
      const s = nst.parkS || 1, hAC = 3.6 * s, hDoor = hAC - 0.55, hCargo = hAC - 1.55;
      const put = (v, x, z, yaw) => { v.obj.position.set(x, 0, z); v.obj.rotation.y = yaw; g.add(v.obj); };
      if (phase === 'A') { // fuelling + loading, mid-turn
        const fv = makeVehicle('fuel'); put(fv, G.fuelX, G.fuelz, 0); POSE.fuel(fv, 1, hAC - 1.7);
        const bv = makeVehicle('belt'); const tip = POSE.beltTip(bv, hCargo); put(bv, 1.55 - tip.z, G.belt1z, Math.PI / 2); bv.boom.rotation.x = 0.02 + (tip.phi - 0.02);
        const gpu = gpuUnit(); gpu.position.set(4.2, 0, D.noseGearZ - 3.9); gpu.rotation.y = 0.4; g.add(gpu);
      } else { // catering up, loader up, train waiting — a turn paused in amber
        const cv = makeVehicle('cat'); put(cv, G.catX, G.doorR1z, Math.PI / 2); POSE.cat(cv, 1, hDoor, 0);
        const lv = makeVehicle('cont'); put(lv, G.contX, G.contz, Math.PI / 2); POSE.cont(lv, 1, hCargo);
        const tug = makeVehicle('btug'); put(tug, 12.8, G.trainz, 0);
        [3.95, 8.15].forEach(off => { const c = makeVehicle('cart'); put(c, 12.8, G.trainz + off, 0); });
        const d = makeVehicle('dolly'); put(d, 12.8, G.trainz + 12.55, 0);
      }
      this._cones(g, D, 6);
      this.scene.add(g); this._dress.push(g);
    };
    mk(stands[idx - 1], 'A'); mk(stands[idx + 1], 'B');
  }
}
