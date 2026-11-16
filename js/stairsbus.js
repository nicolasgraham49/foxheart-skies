// [Stairs + bus] Small planes don't use the jet bridge — the owner's real-life note
// (Nov 14): "in real life small planes don't go on the gateway, they use stairs and
// bus drop off the passengers." So the PJ-1 on a CHARTER flight never docks a bridge:
// a stair truck waits at the L1 door and an apron bus ferries the client party to and
// from the stand. Departure (gate or terminal start): the bus brings the party from
// the terminal kerb, the clients walk from the bus to the stairs and climb into the
// cabin — each one who tops the stairs admits the next waiting cabin passenger, so
// boarding completes with exactly the party size, through the cabin's own session.
// On a terminal start the lounge figures end their walk at the gate door (onfoot.js,
// stairsBus flag) and are counted down to the bus from here; the bus shuttles until
// everyone is delivered. Arrival: the stairs and bus drive in as she parks, the
// clients come down the stairs as the cabin deplanes them, board the bus, and the
// bus drives off. Airliners are untouched: nothing here exists unless main.js sets
// up a charter flight, and the bridge simply never gets its dock call there.
// Nothing here moves the aircraft, touches the sign-in gate or the walk-around
// gate (the bus starts only when beginBoarding succeeds), or knows about
// FLY_ANYWHERE (which stays OFF).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { People } from './people.js';
import { currentType } from './ac-types.js';
import { rng } from './terrain.js';

const clamp = THREE.MathUtils.clamp;
// ---------------------------------------------------------------- materials / kit
const MATS = {
  paint: new THREE.MeshStandardMaterial({ color: 0xe9ebee, roughness: 0.5, metalness: 0.12 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2e3339, roughness: 0.85, metalness: 0.05 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.35, metalness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x141c26, roughness: 0.15, metalness: 0.4 }),
  accent: new THREE.MeshStandardMaterial({ color: 0xe8721c, roughness: 0.55, metalness: 0.1 }),
  tyre: new THREE.MeshStandardMaterial({ color: 0x17181a, roughness: 0.95 }),
  lampF: new THREE.MeshStandardMaterial({ color: 0x554a30, emissive: 0xffe9b0, emissiveIntensity: 1.6 }),
  lampR: new THREE.MeshStandardMaterial({ color: 0x3a0f0f, emissive: 0xd42418, emissiveIntensity: 1.2 }),
  beacon: new THREE.MeshStandardMaterial({ color: 0x3a2408, emissive: 0xff8c1a, emissiveIntensity: 1.8 }),
};
class Parts {
  constructor() { this.L = {}; }
  add(key, geo, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1)));
    (this.L[key] ||= []).push(g); return this;
  }
  box(key, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { return this.add(key, new THREE.BoxGeometry(w, h, d), x, y, z, ry, rx, rz); }
  cyl(key, rt, rb, h, seg, x, y, z, ry = 0, rx = 0, rz = 0) { return this.add(key, new THREE.CylinderGeometry(rt, rb, h, seg), x, y, z, ry, rx, rz); }
  build(shadow = true) {
    const grp = new THREE.Group();
    for (const k in this.L) { const m = new THREE.Mesh(mergeGeometries(this.L[k]), MATS[k]); m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; grp.add(m); }
    this.L = {}; return grp;
  }
}
const wheel = (P, x, y, z, r, w) => { P.cyl('tyre', r, r, w, 14, x, y, z, 0, 0, Math.PI / 2); P.cyl('metal', r * 0.45, r * 0.45, w + 0.02, 10, x, y, z, 0, 0, Math.PI / 2); };

// ---------------------------------------------------------------- the stair truck
// [Charter apron] the stair truck's plan geometry for a sill height, exported so
// onfoot.js can lay the captain's walk slope over the very steps the clients climb
// (one source of truth for the door / platform / stair-base positions).
export function stairFrame(sill) {
  const T = currentType();
  const n = Math.max(5, Math.ceil(sill / 0.19)), run = n * 0.29;
  return { doorX: -T.dim.R, doorZ: T.cabin.profile.door1, platX1: -T.dim.R - 1.55, baseX: -T.dim.R - 1.55 - run, steps: n, run };
}
// Built in the stand frame (x right wing, z aft, y up from the apron) against the
// L1 door of the current type: a towed airstair — top platform at the sill, a flight
// of steps down to the apron, handrails, support legs and a tow bar. Returns the
// group plus the walk points the clients use.
function buildStairs(T, sill) {
  const doorX = -T.dim.R, doorZ = T.cabin.profile.door1;
  const P = new Parts();
  const platX0 = doorX - 0.05, platX1 = doorX - 1.55, platCx = (platX0 + platX1) / 2; // platform span in x
  P.box('paint', platX0 - platX1, 0.09, 1.35, platCx, sill - 0.045, doorZ);            // platform deck
  P.box('accent', 0.06, 0.1, 1.35, platX1 + 0.02, sill - 0.04, doorZ);                 // orange nosing at the flight
  const SF = stairFrame(sill);
  const n = SF.steps, riser = sill / n, tread = 0.29, run = SF.run;
  const baseX = SF.baseX;
  for (let i = 0; i < n; i++) P.box('dark', tread + 0.03, 0.05, 1.1, platX1 - (i + 0.5) * tread, sill - (i + 0.5) * riser + 0.025, doorZ); // treads
  const slopeLen = Math.hypot(run, sill), slopeA = Math.atan2(sill, run), midX = (platX1 + baseX) / 2, midY = sill / 2;
  for (const s of [-1, 1]) {
    P.box('metal', slopeLen, 0.26, 0.06, midX, midY - 0.16, doorZ + s * 0.56, 0, 0, slopeA);        // stringer
    P.box('metal', slopeLen, 0.05, 0.05, midX, midY + 0.92, doorZ + s * 0.58, 0, 0, slopeA);        // handrail
    for (let i = 0; i <= 3; i++) { const f = i / 3; P.box('metal', 0.045, 0.92, 0.045, platX1 - f * run, sill - f * sill + 0.46, doorZ + s * 0.58); } // rail posts
    P.box('metal', 1.5, 0.05, 0.05, platCx, sill + 0.95, doorZ + s * 0.68);                        // platform rail
    P.box('metal', 0.045, 0.95, 0.045, platX1 + 0.02, sill + 0.47, doorZ + s * 0.68);
    P.box('metal', 0.045, 0.95, 0.045, platX0 - 0.06, sill + 0.47, doorZ + s * 0.68);
  }
  P.box('paint', run + 1.2, 0.22, 0.9, midX, 0.32, doorZ);                                            // chassis bed under the flight
  for (const s of [-1, 1]) P.box('metal', 0.09, sill - 0.1, 0.09, platCx + 0.45, (sill - 0.1) / 2, doorZ + s * 0.55); // platform legs
  wheel(P, baseX + 0.55, 0.3, doorZ - 0.62, 0.3, 0.16); wheel(P, baseX + 0.55, 0.3, doorZ + 0.62, 0.3, 0.16);
  P.box('metal', 1.5, 0.07, 0.09, baseX - 0.7, 0.3, doorZ, 0, 0, 0.1);                                 // tow bar
  P.box('accent', platX0 - platX1, 0.16, 1.37, platCx, sill - 0.2, doorZ);                             // stripe under the platform
  const g = P.build(); g.name = 'airstair';
  return {
    group: g,
    doorTop: new THREE.Vector3(doorX - 0.3, sill, doorZ),
    platTop: new THREE.Vector3(platX1 + 0.25, sill, doorZ),
    base: new THREE.Vector3(baseX + 0.35, 0, doorZ),
    doorX, doorZ, sill,
  };
}

// ---------------------------------------------------------------- the apron bus
// A boxy apron coach, nose toward local -z, passenger door on the +x side (the side
// that faces the aircraft when it parks on the jet's left). 
function buildBus() {
  const P = new Parts();
  P.box('paint', 2.5, 1.9, 10.6, 0, 1.62, 0);                    // body
  P.box('paint', 2.4, 0.2, 10.3, 0, 2.66, 0);                    // roof
  P.box('dark', 2.44, 0.52, 10.2, 0, 0.42, 0);                   // skirt
  P.box('glass', 2.56, 0.72, 9.6, 0, 2.08, 0);                   // window band
  P.box('glass', 2.3, 0.8, 0.06, 0, 2.02, -5.31);                // windshield
  P.box('accent', 2.54, 0.3, 10.62, 0, 1.24, 0);                 // fox-orange stripe
  P.box('dark', 2.4, 0.5, 0.05, 0, 0.95, -5.31);                 // grille
  P.box('lampF', 0.42, 0.18, 0.05, -0.85, 0.98, -5.33); P.box('lampF', 0.42, 0.18, 0.05, 0.85, 0.98, -5.33);
  P.box('lampR', 0.36, 0.16, 0.05, -0.9, 1.0, 5.33); P.box('lampR', 0.36, 0.16, 0.05, 0.9, 1.0, 5.33);
  P.box('dark', 0.05, 1.85, 1.15, 1.26, 1.28, -3.2);             // passenger door (+x, forward)
  P.box('metal', 0.3, 0.08, 1.0, 1.32, 0.32, -3.2);              // door step
  P.box('beacon', 0.2, 0.1, 0.2, 0, 2.81, -4.4);                 // roof beacon
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) wheel(P, sx * 1.16, 0.48, sz * 3.6, 0.48, 0.34);
  const g = P.build(); g.name = 'apron-bus';
  return g;
}

// ---------------------------------------------------------------- a route follower
// Polyline in the stand frame (x, z); the bus eases out of and into its stops.
function Route(pts, speed) {
  const P = pts.map(p => new THREE.Vector2(p[0], p[1])); const seg = []; let L = 0;
  for (let i = 0; i < P.length - 1; i++) { const l = P[i].distanceTo(P[i + 1]); seg.push(l); L += l; }
  return {
    L, s: 0, speed, done: false,
    step(dt) {
      if (this.done) return;
      const v = this.speed * clamp(Math.min(this.s, L - this.s) / 7, 0.22, 1);
      this.s = Math.min(L, this.s + v * dt); if (this.s >= L) this.done = true;
    },
    pose(o) {
      let s = this.s;
      for (let i = 0; i < seg.length; i++) {
        if (s <= seg[i] || i === seg.length - 1) {
          const a = P[i], b = P[i + 1], f = seg[i] ? clamp(s / seg[i], 0, 1) : 0;
          o.x = a.x + (b.x - a.x) * f; o.z = a.y + (b.y - a.y) * f;
          o.yaw = Math.atan2(-(b.x - a.x), -(b.y - a.y)); return o;
        }
        s -= seg[i];
      }
      return o;
    },
  };
}

// ---------------------------------------------------------------- state
const S = {
  active: false, mode: null,           // 'dep' | 'arr'
  scene: null, group: null, stairs: null, stairWrap: null, bus: null, crowd: null,
  party: 0, preloaded: false,
  // [Charter apron] shuttle-feed + lead-client hold (charter apron starts only;
  // both stay false for the original lounge/gate flows, which are untouched)
  feedKerb: false, feedT: 0, holdLead: false, leadMet: false, leadReleased: false, leadWaiting: false, leadHoldT: 0,
  // departure counters
  atKerb: 0, inBus: 0, walking: 0, delivered: 0, firstKerbT: -1, loungeSeen: 0,
  boardingActive: false, phase: 'idle', route: null, dwell: 0, releaseT: 0,
  walkers: [], nextIdx: 0,
  // arrival counters
  outSeen: 0, aboard: 0, stairK: 1, stairDocked: true,
  time: 0, env: null,
};
const KERB = [-30, -34], PARK = [-8.2, -2.6];
const R_KERB_STAND = [KERB, [-18, -27], [-11, -16], [-8.6, -9], PARK];
const R_STAND_KERB = [PARK, [-11, -14], [-18, -25], KERB];
const R_OUT = [PARK, [-9, -12], [-6, -24], [6, -33], [40, -35], [95, -35]];
const R_IN = [[95, -35], [40, -35], [10, -33], [-4, -26], [-8.6, -12], PARK];

function busDoorPoint() { // where clients step off / on, in the stand frame
  const b = S.bus; if (!b) return new THREE.Vector3(-6.9, 0, -5.8);
  const v = new THREE.Vector3(1.45, 0, -3.2); v.applyEuler(new THREE.Euler(0, b.rotation.y, 0)); return new THREE.Vector3(b.position.x + v.x, 0, b.position.z + v.z);
}
function setBus(route) { S.route = route; const o = route.pose({ x: 0, z: 0, yaw: 0 }); S.bus.position.set(o.x, 0, o.z); S.bus.rotation.y = o.yaw; }
function driveBus(pts, speed, next) { S.route = Route(pts, speed); S.phase = next; }

export function reset() {
  if (S.group && S.scene) { S.scene.remove(S.group); S.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  Object.assign(S, { active: false, mode: null, scene: null, group: null, stairs: null, stairWrap: null, bus: null, crowd: null, party: 0, preloaded: false, feedKerb: false, feedT: 0, holdLead: false, leadMet: false, leadReleased: false, leadWaiting: false, leadHoldT: 0, atKerb: 0, inBus: 0, walking: 0, delivered: 0, firstKerbT: -1, loungeSeen: 0, boardingActive: false, phase: 'idle', route: null, dwell: 0, releaseT: 0, walkers: [], nextIdx: 0, outSeen: 0, aboard: 0, stairK: 1, stairDocked: true, time: 0, env: null });
}

// Shared scene build: the stand group rides the aircraft's parked transform, so
// everything inside it lives in the turnaround's body frame (x right, z aft).
function build(scene, aircraft, groundH, party) {
  reset();
  const T = currentType();
  const g = new THREE.Group(); g.name = 'stairsbus';
  g.position.set(aircraft.position.x, groundH, aircraft.position.z);
  const e = new THREE.Euler().setFromQuaternion(aircraft.quaternion, 'YXZ'); g.rotation.y = e.y;
  scene.add(g);
  const sill = aircraft.position.y - groundH - 0.55; // CABIN.floor, from the live transform
  const st = buildStairs(T, sill);
  S.stairWrap = new THREE.Group(); S.stairWrap.add(st.group); g.add(S.stairWrap);
  S.stairs = st;
  S.bus = buildBus(); g.add(S.bus);
  // the client walkers: a small People crowd in the same frame (hidden until used)
  const R = rng(4177 + party * 131);
  S.crowd = new People(g, Math.max(party, 1), R, {});
  S.crowd.p.forEach((p, i) => { p.hidden = true; p.y = -100; p.suitcase = i % 2 === 0; p.backpack = i % 2 === 1; });
  S.scene = scene; S.group = g; S.party = party; S.active = true;
  return st;
}

// Departure scene (called by main.js at flight start on a charter flight): stairs
// docked at the door, the bus waiting at the terminal kerb. On a GATE start the
// party is already aboard the bus (preloaded); on a TERMINAL start they come down
// from the lounge group by group (clientDown, via the lounge 'gone' count).
// [Charter apron] opts (charter apron starts only): feedKerb — no lounge feeds the
// kerb, so the party gathers there once boarding is called; holdLead — the lead
// client waits at the foot of the stairs for the captain's hello (see frame()).
export function setupDeparture(scene, aircraft, groundH, party, preloaded, opts) {
  build(scene, aircraft, groundH, party);
  S.mode = 'dep'; S.preloaded = !!preloaded; S.stairDocked = true; S.phase = 'kerb';
  S.feedKerb = !!(opts && opts.feedKerb); S.holdLead = !!(opts && opts.holdLead);
  if (S.preloaded) { S.inBus = party; }
  S.bus.position.set(KERB[0], 0, KERB[1]); S.bus.rotation.y = Math.PI / 2; // facing the stand
}
// Arrival scene (called by main.js at parkAtGate on a charter flight): the stair
// truck is towed in and the bus drives in empty, then both wait for the deplane.
export function setupArrival(scene, aircraft, groundH, party) {
  build(scene, aircraft, groundH, party);
  S.mode = 'arr'; S.stairDocked = false; S.stairK = 0; S.phase = 'in';
  S.stairWrap.position.set(-16, 0, 14);
  setBus(Route(R_IN, 7));
}

// Boarding has begun (beginBoarding succeeded — sign-in + walk-around gates are
// already satisfied by the caller): the bus may start its work.
export function startBoarding() { if (S.active && S.mode === 'dep') S.boardingActive = true; }
// A lounge client reached the gate door and went down to the bus (terminal starts).
export function clientDown() { if (S.active && S.mode === 'dep' && !S.preloaded) { S.atKerb++; if (S.firstKerbT < 0) S.firstKerbT = S.time; } }
// The captain took his seat mid-boarding: the lounge feed stops where it stands,
// so every client not yet delivered counts as having made their own way down.
export function collectAll() {
  if (!S.active || S.mode !== 'dep') return;
  S.leadReleased = true; // [Charter apron] a seated captain ends the lead client's wait too — she boards with the rest
  if (S.preloaded) return;
  const missing = S.party - (S.delivered + S.walking + S.inBus + S.atKerb);
  if (missing > 0) { S.atKerb += missing; if (S.firstKerbT < 0) S.firstKerbT = S.time; }
}
// [Charter apron] the lead client's apron wait, for charter.js (via main.js env):
// leadWaiting() while she stands at the foot of the stairs; leadPos() her ground
// point in world space (null when no lead walker is out); meetLead() — the captain
// said hello, she may climb.
export function leadWaiting() { return !!S.leadWaiting; }
export function leadPos() {
  if (!S.group) return null;
  const lead = S.walkers.find(w => w.state === 'up' && w.idx === 0);
  if (!lead) return null;
  return S.group.localToWorld(new THREE.Vector3(lead.p.x, 0, lead.p.z));
}
export function meetLead() { if (S.holdLead && !S.leadMet) { S.leadMet = true; S.leadWaiting = false; return true; } return false; }
// Boarding was skipped (seatAll): the show is over — walkers vanish, the bus leaves.
export function cancel() {
  if (!S.active) return;
  S.leadWaiting = false; // [Charter apron]
  for (const w of S.walkers) hideWalker(w);
  S.walkers = []; S.walking = 0;
  if (S.mode === 'dep' && S.phase !== 'gone') { const o = { x: S.bus.position.x, z: S.bus.position.z, yaw: 0 }; driveBus([[o.x, o.z], [-6, -24], [6, -33], [40, -35], [95, -35]], 7, 'leaving'); }
}

function hideWalker(w) { if (w && w.p) { w.p.hidden = true; w.p.y = -100; } }
function spawnWalker(idx, fromTop) {
  const p = S.crowd.p[idx % S.crowd.p.length]; if (!p) return null;
  const st = S.stairs, bd = busDoorPoint();
  const pts = fromTop
    ? [st.doorTop, st.platTop, st.base, new THREE.Vector3(-5.9, 0, -5.6), bd]
    : [bd, new THREE.Vector3(-5.9, 0, -5.6), st.base, st.platTop, st.doorTop];
  Object.assign(p, { hidden: false, mode: 'walk', act: 'idle', speed: 1.12, x: pts[0].x, y: pts[0].y, z: pts[0].z, yaw: 0 });
  const w = { p, idx, pts, seg: 0, state: fromTop ? 'down' : 'up', atTop: false };
  S.walkers.push(w); return w;
}
// move a walker along its points (y follows the segment, like the lounge feeder)
function stepWalker(w, dt) {
  const p = w.p, a = w.pts[w.seg], b = w.pts[w.seg + 1];
  if (!b) return true;
  const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz);
  const segLen = Math.max(0.001, Math.hypot(b.x - a.x, b.z - a.z));
  p.y = b.y + (a.y - b.y) * clamp(d / segLen, 0, 1);
  if (d < 0.1) { p.x = b.x; p.z = b.z; p.y = b.y; w.seg++; return w.seg >= w.pts.length - 1 && Math.hypot(w.pts[w.pts.length - 1].x - p.x, w.pts[w.pts.length - 1].z - p.z) < 0.11; }
  const s = Math.min(d, 1.15 * dt); p.x += dx / d * s; p.z += dz / d * s; p.yaw = Math.atan2(dx, dz); p.mode = 'walk';
  return false;
}

// ---------------------------------------------------------------- per-frame
// env (from main.js): { camera, exposure, simTime, admitNext(), entered(), outCount(), loungeDown() }
export function frame(dt, env) {
  if (!S.active || !env) return;
  S.env = env; S.time += dt;
  const crowd = S.crowd;
  if (crowd) { crowd.setExposure(Math.min(1.6, 0.62 / Math.max(0.05, env.exposure || 1))); }
  // ---- the bus route, whichever phase is driving it
  if (S.route && !S.route.done) { S.route.step(dt); const o = S.route.pose({ x: 0, z: 0, yaw: 0 }); S.bus.position.set(o.x, 0, o.z); S.bus.rotation.y = o.yaw; }
  const busParked = !S.route || S.route.done;

  if (S.mode === 'dep') {
    // terminal starts: count lounge figures who reached the gate door (they went
    // down to the bus) — main.js reads the count off the lounge crowd each frame
    if (!S.preloaded && env.loungeDown) { const n = env.loungeDown(); if (n > S.loungeSeen) { const d = n - S.loungeSeen; S.loungeSeen = n; for (let i = 0; i < d; i++) clientDown(); } }
    // [Charter apron] shuttle starts have no lounge to empty: once boarding is
    // called, the party gathers at the FBO kerb a few at a time, and the kerb
    // logic below shuttles them in as they come — same bus, same stairs.
    if (S.feedKerb && S.boardingActive && S.phase === 'kerb') {
      const remaining = S.party - S.delivered - S.walking - S.inBus - S.atKerb;
      if (remaining > 0) { S.feedT += dt; if (S.feedT >= 2.2) { S.feedT = 0; S.atKerb++; if (S.firstKerbT < 0) S.firstKerbT = S.time; } }
    }
    if (S.phase === 'kerb' && S.boardingActive) {
      const remaining = S.party - S.delivered - S.walking - S.inBus;
      const allHere = S.atKerb > 0 && S.atKerb >= remaining;
      const waited = S.firstKerbT >= 0 && S.time - S.firstKerbT > 5;
      if (S.inBus > 0 || ((S.atKerb > 0) && (allHere || waited))) {
        if (S.inBus === 0) { S.inBus = S.atKerb; S.atKerb = 0; }
        S.firstKerbT = -1;
        driveBus(R_KERB_STAND, 7, 'toStand');
      }
    } else if (S.phase === 'toStand' && busParked) { S.phase = 'unload'; S.releaseT = 0; }
    else if (S.phase === 'unload') {
      S.releaseT -= dt;
      if (S.inBus > 0 && S.releaseT <= 0) { S.inBus--; S.walking++; spawnWalker(S.nextIdx++, false); S.releaseT = 1.4; }
      else if (S.inBus === 0 && S.walking === 0) {
        if (S.delivered >= S.party) { driveBus(R_OUT, 7, 'leaving'); }
        else driveBus(R_STAND_KERB, 7, 'toKerb');
      }
    } else if (S.phase === 'toKerb' && busParked) { S.phase = 'kerb'; if (S.firstKerbT < 0 && S.atKerb > 0) S.firstKerbT = S.time; }
    else if (S.phase === 'leaving' && busParked) { S.phase = 'gone'; S.bus.visible = false; }
    // [Charter apron] the lead client (walker 0) waits at the foot of the stairs
    // for the captain's hello: she holds at the stair base, the rest of the party
    // queues behind her, and the wait ends when he meets her (meetLead), takes
    // his seat (collectAll), or 45 s pass — she is never a deadlock, only a hello.
    const leadW = S.walkers.find(w => w.state === 'up' && w.idx === 0);
    const leadAtBase = !!(leadW && leadW.seg >= 2 && !leadW.atTop);
    if (S.holdLead && leadAtBase && !S.leadMet && !S.leadReleased) { S.leadHoldT += dt; if (S.leadHoldT >= 45) S.leadReleased = true; }
    S.leadWaiting = !!(S.holdLead && leadAtBase && !S.leadMet && !S.leadReleased);
    // walkers climb; at the top each one admits the next cabin passenger, and a
    // walker completes whenever the cabin's entered count passes its index (the
    // cabin's own safety net can admit ahead of the climb — counts stay honest)
    for (let i = S.walkers.length - 1; i >= 0; i--) {
      const w = S.walkers[i];
      if (w.state === 'up') {
        const held = S.leadWaiting && !w.atTop && (w.idx === 0 ? w.seg >= 2 : w.seg >= 1); // [Charter apron] the queue behind the lead
        if (held) w.p.mode = 'stand';
        else if (!w.atTop) { if (stepWalker(w, dt)) { w.atTop = true; w.p.mode = 'stand'; env.admitNext && env.admitNext(); } }
        else if (env.admitNext) env.admitNext();
        const entered = env.entered ? env.entered() : 0;
        if (w.atTop && entered > w.idx) { hideWalker(w); S.walkers.splice(i, 1); S.walking--; S.delivered++; }
      }
    }
  } else if (S.mode === 'arr') {
    if (!S.stairDocked) { // the stair truck is towed into place
      S.stairK = Math.min(1, S.stairK + dt / 9); const k = S.stairK * S.stairK * (3 - 2 * S.stairK);
      S.stairWrap.position.set(-16 * (1 - k), 0, 14 * (1 - k));
      if (S.stairK >= 1) S.stairDocked = true;
    }
    if (S.phase === 'in' && busParked) S.phase = 'wait';
    // mirror the cabin deplane: every cabin passenger who vanishes at the door
    // reappears at the top of the stairs and walks down to the bus
    if (env.outCount) {
      const n = env.outCount();
      if (n > S.outSeen) { S.outSeen = n; }
    }
    const wantOut = Math.min(S.outSeen, S.party);
    const outActive = S.walkers.filter(w => w.state === 'down').length + S.aboard;
    if (S.stairDocked && busParked && outActive < wantOut) {
      S.releaseT -= dt;
      if (S.releaseT <= 0) { spawnWalker(S.nextIdx++, true); S.releaseT = 1.1; }
    }
    for (let i = S.walkers.length - 1; i >= 0; i--) {
      const w = S.walkers[i];
      if (w.state === 'down' && stepWalker(w, dt)) { hideWalker(w); S.walkers.splice(i, 1); S.aboard++; }
    }
    if (S.phase === 'wait' && S.aboard >= S.party && S.party > 0) { S.phase = 'dwell'; S.dwell = 3; }
    else if (S.phase === 'dwell') { S.dwell -= dt; if (S.dwell <= 0) driveBus(R_OUT, 7, 'leaving'); }
    else if (S.phase === 'leaving' && busParked) { S.phase = 'gone'; S.bus.visible = false; }
  }
  if (crowd && S.group) { S.group.updateMatrixWorld(true); crowd.commit(env.simTime || 0, S.group.worldToLocal(env.camera.position.clone())); }
}

export function state() {
  const lp = leadPos();
  return {
    active: S.active, mode: S.mode, phase: S.phase, party: S.party, preloaded: S.preloaded,
    feedKerb: S.feedKerb, holdLead: S.holdLead, leadWaiting: S.leadWaiting, leadMet: S.leadMet, // [Charter apron]
    leadPos: lp ? [+lp.x.toFixed(1), +lp.y.toFixed(1), +lp.z.toFixed(1)] : null, // [Charter apron]
    boardingActive: S.boardingActive, atKerb: S.atKerb, inBus: S.inBus, walking: S.walking,
    delivered: S.delivered, aboard: S.aboard, outSeen: S.outSeen, stairDocked: S.stairDocked,
    busVisible: S.bus ? S.bus.visible : false,
    busPos: S.bus ? [+S.bus.position.x.toFixed(1), +S.bus.position.z.toFixed(1)] : null,
    sill: S.stairs ? +S.stairs.sill.toFixed(2) : null,
    doorTop: S.stairs ? [+S.stairs.doorTop.x.toFixed(2), +S.stairs.doorTop.y.toFixed(2), +S.stairs.doorTop.z.toFixed(2)] : null,
  };
}
