// [Walk-around preflight] Before anyone boards, a real captain walks the jet: nose to
// tail, eyes on the gear, the intakes, the wing, the tail. On a TERMINAL (on-foot)
// departure the captain can do that walk himself. After the crew sign-in he heads out
// to the apron, where a route of inspection checkpoints waits around the aircraft —
// each one offers "E · Inspect …" in the crew-talk prompt idiom and opens a short
// card in the captain's own checklist voice. Boarding does NOT begin while the
// walk-around is unfinished: beginBoarding() in main.js refuses every caller until
// the route is complete OR the captain releases boarding himself at the front door
// (the deliberate-act escape, so he is never trapped — the same shape as the sign-in
// gate and the departure-captain rule; this gate touches boarding only, never
// aircraft movement). Gate starts are untouched: no walk-around, boarding as today.
// Checkpoints are positioned from the selected type's own dimensions (ac-types dim /
// vis / cabin profile), so the route fits all five types from the FJ-200 to the
// A350 and the little PJ-1. Card texts are the captain's voice; the PJ-1 and the
// A350 carry a few lines of their own. Markers are small orange discs (sprites) that
// vanish as their checkpoint is checked. Pure overlay + one gate flag: nothing here
// moves the aircraft, the crew or the passengers.
import * as THREE from 'three';
import { currentType } from './ac-types.js';

// ---------------------------------------------------------------- the checks
// Captain's-voice lines, one short card per checkpoint. 'std' is the narrowbody set;
// a type entry overrides individual lines (the A350's bogies, the PJ-1's small scale).
const TEXTS = {
  std: {
    nose: 'Pin out, tyres good, steering centred. No drips on the concrete, nothing hanging loose.',
    eng1: 'Intake clear, fan blades clean, not a scrap of FOD anywhere. She’ll breathe easy.',
    gear: 'Tyres healthy, brakes cool, chocks still in. No weeping hydraulics.',
    wing: 'Flaps and slats clean and true, fuel cap flush, no dents, no bird souvenirs. Nav light bright.',
    tail: 'APU exhaust clear, rudder and elevators free through their travel. Tail cone clean.',
    eng2: 'Intake clear, blades clean. Two good lungs on this aeroplane.',
    door: 'Sill clean, seals honest, handle flush — and the bridge is clear of the fuselage. That’s the walk-around.',
  },
  a350: {
    nose: 'Twin tyres good, pin out, steering centred. Big aeroplane, same honest checks.',
    gear: 'Twin bogies, twelve tyres between them — all healthy. Brakes cool, chocks in, nothing weeping.',
    wing: 'That wing goes on forever — flaps clean, caps flush, not a mark on her. Nav light bright.',
    door: 'Door one of four — sill clean, seals honest, bridge clear. That’s the walk-around, all sixty-one metres of her.',
  },
  pjet: {
    nose: 'Pin out, tyre good, steering centred. Small wheel, honest work.',
    eng1: 'Intake clear, the little fan clean. Small engine, big heart.',
    gear: 'Single wheels, tyres good, chocks in. Nothing dripping on the concrete.',
    wing: 'The little wing — flaps clean, cap flush, light bright. Short and sweet, like her.',
    tail: 'T-tail way up top — elevator free, APU clear underneath. Worth the crick in the neck.',
    eng2: 'Intake clear, blades clean. Both sides breathe easy.',
    door: 'One door, twelve seats, and she’s all yours. Sill clean, seals honest — walk-around done.',
  },
};
// the route, nose to tail: stand points in aircraft-local (x, z), ground level
function route(T) {
  const d = T.dim, eng = T.vis.eng, wg = T.vis.wg;
  const engZ = eng.z0 - 1.19 * (eng.scale || 1) - 1.8;      // ahead of the intake lip
  const wingX = -(wg.bK + (wg.bT - wg.bK) * 0.45);          // ~half-way out the left wing
  const wingTe = wg.te[1] + (wg.te[2] - wg.te[1]) * 0.45;   // trailing edge at that station
  const txt = { ...TEXTS.std, ...(TEXTS[T.id] || {}) };
  const mk = (id, name, x, z) => ({ id, name, x, z, text: txt[id], done: false, world: null, marker: null, baseY: 0 });
  return [
    mk('nose', 'Nose gear', 1.7, d.noseGearZ - 1.2), // right of the gear: the headset operator works the LEFT side (-1.8, noseGearZ-0.6) — the stand point keeps the two 2.5 m prompt discs (inspect / talk) from covering each other's spot
    mk('eng1', 'Engine 1 · intake', -d.engX, engZ),
    mk('gear', 'Main gear', -(d.mainX + 1.7), d.mainZ + 0.4),
    mk('wing', 'Wing · flaps', wingX, wingTe + 2.3),
    mk('tail', 'Tail · APU', 1.7, d.tailZ + 2.2),
    mk('eng2', 'Engine 2 · intake', d.engX, engZ),
    mk('door', 'Front door', -(d.R + 1.8), T.cabin.profile.door1),
  ];
}

// ---------------------------------------------------------------- state
const S = {
  armed: false, foot: null, parts: null, type: null,
  cps: [],            // the route, in order
  released: false,    // boarding gate open (route complete OR captain's release)
  near: null,         // checkpoint in prompt range right now
  releaseNear: false, // captain is at the door release point
  card: null,         // open check card { id, el }
  toast: null,        // latest toast fn from frame()'s env
};

export function reset() {
  closeCard();
  for (const cp of S.cps) if (cp.marker) { cp.marker.parent && cp.marker.parent.remove(cp.marker); cp.marker.material.map && cp.marker.material.map.dispose(); cp.marker.material.dispose(); cp.marker = null; }
  if (S.foot) S.foot.walkPrompt = null;
  S.armed = false; S.foot = null; S.parts = null; S.type = null; S.cps = []; S.released = false; S.near = null; S.releaseNear = false;
  const el = document.getElementById('walkCard'); if (el) el.remove();
}

// Arm the walk-around for a terminal departure's on-foot session: build the route
// from the live type + the aircraft's world transform. Called from enterFoot (dep,
// terminal starts only) — gate starts never arm, so boardingOpen() stays true there.
export function arm(foot) {
  if (!foot || !foot.aircraft || !foot.parts) return false;
  if (S.armed && S.foot === foot && S.parts === foot.parts) return true; // already armed on this build
  reset();
  const T = currentType();
  S.armed = true; S.foot = foot; S.parts = foot.parts; S.type = T.id; S.released = false;
  foot.aircraft.updateMatrixWorld(true);
  S.cps = route(T);
  for (const cp of S.cps) {
    cp.world = foot.aircraft.localToWorld(new THREE.Vector3(cp.x, T.dim.wheelY, cp.z));
    // the marker: a small orange disc floating at head height (a sprite — no scene cost
    // beyond itself, and it only ever exists on terminal departures)
    try {
      const cv = document.createElement('canvas'); cv.width = cv.height = 96;
      const cx = cv.getContext('2d');
      cx.beginPath(); cx.arc(48, 48, 40, 0, Math.PI * 2); cx.fillStyle = '#e8721c'; cx.fill();
      cx.lineWidth = 9; cx.strokeStyle = 'rgba(255,255,255,.92)'; cx.stroke();
      cx.beginPath(); cx.arc(48, 48, 11, 0, Math.PI * 2); cx.fillStyle = '#14202e'; cx.fill();
      const tex = new THREE.CanvasTexture(cv);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      cp.marker = new THREE.Sprite(mat); cp.marker.scale.set(0.34, 0.34, 1);
      cp.baseY = cp.world.y + 1.55;
      cp.marker.position.set(cp.world.x, cp.baseY, cp.world.z);
      foot.scene.add(cp.marker);
    } catch (e) { cp.marker = null; }
  }
  return true;
}

// ---------------------------------------------------------------- the gate
export function pending() { return S.armed && !S.released; }
export function boardingOpen() { return !pending(); }
// The captain's deliberate release (E at the door, or the J skip in main.js): the
// gate opens, the remaining checks stay available to finish or leave.
export function release() {
  if (!S.armed || S.released) return false;
  S.released = true;
  return true;
}
function complete() { return S.armed && S.cps.length > 0 && S.cps.every(c => c.done); }
function nextCp() { return S.cps.find(c => !c.done) || null; }
function doneCount() { return S.cps.reduce((n, c) => n + (c.done ? 1 : 0), 0); }

// ---------------------------------------------------------------- the card (crew sign-in card idiom)
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function showCard(cp) {
  closeCard();
  const total = S.cps.length, n = doneCount(), last = n >= total;
  try {
    const el = document.createElement('div'); el.id = 'walkCard';
    el.style.cssText = 'position:fixed;left:18px;top:64px;width:316px;background:#10161f;color:#eef2f6;border-radius:10px;box-shadow:0 10px 34px rgba(0,0,0,.45);font:13px/1.55 system-ui,sans-serif;padding:0 0 12px;overflow:hidden;opacity:0;transition:opacity .45s;pointer-events:none;z-index:60;border-top:3px solid #e07f2e';
    el.innerHTML = '<div style="background:#0d2b4c;color:#fff;padding:7px 12px;font-weight:700;letter-spacing:.06em">🔧 PREFLIGHT · ' + esc(cp.name.toUpperCase()) + ' <span style="float:right;font-weight:400;color:#e8a35c">' + n + '/' + total + '</span></div>'
      + '<div style="padding:10px 14px 0">' + esc(cp.text) + '</div>'
      + (last ? '<div style="padding:8px 14px 0;color:#7dc98a;font-weight:700">✓ Preflight complete — boarding is released.</div>' : '')
      + '<div style="padding:12px 14px 0"><button id="walkCardBtn" style="pointer-events:auto;cursor:pointer;background:#e07f2e;color:#14100b;border:0;border-radius:7px;padding:8px 14px;font:600 13px system-ui,sans-serif">' + (last ? '✈ She’s all yours' : '✓ Checked — keep walking') + '</button></div>';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    S.card = { id: cp.id, el };
    el.querySelector('#walkCardBtn').onclick = () => closeCard();
    setTimeout(() => { if (S.card && S.card.el === el) closeCard(); }, 40000); // never trap the captain behind a card
  } catch (e) { }
}
function closeCard() { if (S.card) { const el = S.card.el; S.card = null; el.style.opacity = '0'; setTimeout(() => el.remove(), 600); } else { const el = document.getElementById('walkCard'); if (el) el.remove(); } }

// ---------------------------------------------------------------- per-frame
// Called from the main loop (same slot as CrewTalk.frame). env: { foot, onFoot, signedIn, toast }
export function frame(dt, env) {
  if (!env) return;
  if (env.toast) S.toast = env.toast;
  const foot = env.foot;
  if (!S.armed || !foot || S.foot !== foot || foot.parts !== S.parts) return;
  const live = !!env.onFoot && !!env.signedIn;
  // markers bob gently over their checkpoints; done ones vanish; all hide off-foot
  const now = performance.now();
  for (const cp of S.cps) if (cp.marker) {
    cp.marker.visible = !!env.onFoot && !cp.done;
    if (cp.marker.visible) cp.marker.position.y = cp.baseY + Math.sin(now / 520 + cp.x) * 0.05;
  }
  // an open card closes cleanly when the captain walks away from its checkpoint
  if (S.card) {
    const cp = S.cps.find(c => c.id === S.card.id);
    if (!env.onFoot || !cp || Math.hypot(foot.pos.x - cp.world.x, foot.pos.z - cp.world.z) > 4.5) closeCard();
  }
  S.near = null; S.releaseNear = false;
  if (!live || complete()) { foot.walkPrompt = null; return; }
  if (!foot.zoneTag || foot.zoneTag() !== 'apron') { foot.walkPrompt = null; return; }
  const nx = nextCp(), total = S.cps.length, n = doneCount();
  if (nx && Math.hypot(foot.pos.x - nx.world.x, foot.pos.z - nx.world.z) < 2.5) S.near = nx;
  const door = S.cps[S.cps.length - 1];
  if (!S.released && door && nx !== door && Math.hypot(foot.pos.x - door.world.x, foot.pos.z - door.world.z) < 2.5) S.releaseNear = true;
  if (S.card) foot.walkPrompt = null; // the card carries the progress while it is open
  else if (S.near) foot.walkPrompt = 'E  Inspect ' + S.near.name.toLowerCase() + ' · Preflight ' + n + '/' + total;
  else if (S.releaseNear) foot.walkPrompt = 'E  Release boarding · or finish the walk-around — Preflight ' + n + '/' + total;
  // The passive progress hint is the apron's lowest-priority prompt: it yields to an
  // actionable crew-talk prompt (the inspect / release prompts above stay dominant —
  // they are the gated task at its own checkpoint).
  else foot.walkPrompt = foot.crewPrompt ? null : (S.released ? 'Preflight ' + n + '/' + total + ' · boarding released — finish the checks or head up' : 'Preflight ' + n + '/' + total + ' · walk the jet, captain — boarding waits on you');
}

// E pressed on foot: inspect the checkpoint in range, release boarding at the door,
// or close an open card. True = the press was used.
export function tryInspect(foot) {
  if (!S.armed || S.foot !== foot) return false;
  if (S.card) { closeCard(); return true; }
  if (S.near) {
    const cp = S.near; cp.done = true;
    if (cp.marker) cp.marker.visible = false;
    showCard(cp);
    if (complete()) {
      if (!S.released) { S.released = true; if (S.toast) S.toast('Preflight complete — boarding is released. She’s yours, Captain.', 5000); }
      else if (S.toast) S.toast('Walk-around complete — every check done, Captain.', 4000);
    }
    return true;
  }
  if (S.releaseNear) {
    if (release() && S.toast) S.toast('Boarding released — your call, Captain. The rest of the walk-around is yours to finish or leave.', 5000);
    return true;
  }
  return false;
}

export function state() {
  const wc = document.getElementById('walkCard');
  return {
    armed: S.armed, type: S.type, total: S.cps.length, done: doneCount(),
    doneIds: S.cps.filter(c => c.done).map(c => c.id),
    next: nextCp() ? nextCp().id : null, released: S.released, complete: complete(),
    near: S.near ? S.near.id : null, releaseNear: S.releaseNear,
    cardOpen: !!S.card, cardId: S.card ? S.card.id : null,
    cardText: wc ? wc.textContent.replace(/\s+/g, ' ').trim() : null,
    checkpoints: S.cps.map(c => ({ id: c.id, name: c.name, done: c.done, world: c.world ? [+c.world.x.toFixed(1), +c.world.y.toFixed(1), +c.world.z.toFixed(1)] : null })),
  };
}
