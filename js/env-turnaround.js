// Turnaround choreography (environment artist), driven by groundcrew.js on sim time. Everything lives in a stand
// frame = the parked aircraft's body frame on the ground (x right wing, z aft): services on the RIGHT, passengers by
// the bridge on the left. Vehicles drive in on the head-of-stand road (z = -43) or the rear service road (z = +42)
// via the equipment lane outside the wingtip (x = 21), dock, work (box up, belts running, hoses on, ULDs rolling),
// then back out with a turn and leave. Departure: most services are already working when you arrive at the gate and
// finish in ~3.5 min; fuel and the aft catering truck drive in. Arrival: they drive in after the chocks.
// Pushback (prep): whatever is still docked undocks and leaves at speed; anything not clear in 6.6 s is hidden.
import * as THREE from 'three';
import { makeVehicle, POSE, bagsMesh, uldMeshes, hoseMesh, gseMats, T } from './env-gse.js';
import { currentType } from './ac-types.js';

const PI = Math.PI;
const clamp = THREE.MathUtils.clamp, sm = THREE.MathUtils.smoothstep;
class Leg {
  constructor(pts, rev = false, v = 5.2) { this.c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'); this.L = this.c.getLength(); this.T = 2.5 + this.L / v; this.rev = rev; }
  pose(u, o) { u = clamp(u, 0, 1); return this.at(this.L * u * u * (3 - 2 * u), o); }
  at(s, o) { // arc distance; extrapolates straight off both ends (trailers)
    const L = this.L, e = clamp(s / L, 0, 1), p = this.c.getPointAt(e), t = this.c.getTangentAt(e), x = s < 0 ? s : s > L ? s - L : 0;
    o.x = p.x + t.x * x; o.z = p.z + t.z * x; if (this.rev) t.negate(); o.yaw = Math.atan2(-t.x, -t.z); return o;
  }
  near(x, z) { let best = 0, bd = 1e9; for (let i = 0; i <= 400; i++) { const p = this.c.getPointAt(i / 400), d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = i / 400; } } return best * this.L; }
}
const DEP = { cat1: [null, 92], belt1: [null, 200], belt2: [null, 184], cont: [null, 172], train: [null, 160], lav: [null, 58], water: [null, 74], van: [null, 46], fuel: [3, 146], cat2: [10, 114] };
const ARR = { belt1: 3, train: 6, belt2: 9, cont: 12, van: 14, cat1: 18, cat2: 26, lav: 30, water: 36, fuel: 44 };
const DEPLOY = { cat: 9, belt: 4, cont: 5, fuel: 6, lav: 2, water: 2, van: 0, train: 0 };
const CART_OFF = [3.95, 8.15, 12.55, 16.95]; // arc distance behind the tug centre: cart, cart, ULD dolly, ULD dolly

export class Turnaround {
  constructor(parent, crew, quality) {
    gseMats(quality); this.q = quality; this.crew = crew;
    this.svc = new THREE.Group(); this.svc.name = 'turnaround'; this.svc.visible = false; parent.add(this.svc);
    const V = {}; for (const id of ['cat1', 'cat2', 'belt1', 'belt2', 'cont', 'fuel', 'lav', 'water', 'van']) V[id] = makeVehicle(id.replace(/\d$/, ''));
    V.train = makeVehicle('btug'); V.train.cars = [makeVehicle('cart'), makeVehicle('cart'), makeVehicle('dolly'), makeVehicle('dolly')];
    for (const id in V) { V[id].id = id; this.svc.add(V[id].obj); if (V[id].cars) V[id].cars.forEach(c => this.svc.add(c.obj)); }
    this.V = V; this.bags = bagsMesh(64); this.svc.add(this.bags); [this.uldA, this.uldB] = uldMeshes(3); this.svc.add(this.uldA, this.uldB);
    this.hoses = new THREE.Group(); this.svc.add(this.hoses); this._o = { x: 0, z: 0, yaw: 0 }; this.mode = null;
    this._m = new THREE.Matrix4(); this._m2 = new THREE.Matrix4(); this._v = new THREE.Vector3();
  }
  // ac: aircraft (world), groundH: apron height, mode 'dep' | 'arr'
  start(ac, groundH, yaw, mode, auto = true) {
    this.mode = mode; this.t = 0; this.prepT = null; this.svc.visible = true;
    this.svc.position.set(ac.position.x, groundH, ac.position.z); this.svc.rotation.set(0, yaw, 0); this.svc.updateMatrixWorld(true);
    const h = this.hAC = ac.position.y - groundH; this.hDoor = h - 0.55; this.hCargo = h - 1.55;
    const V = this.V;
    // [Aircraft types] roads, lane and every dock/path derive from the selected type's spec;
    // the offsets below reproduce the fox numbers exactly on the default type.
    const GT = this.GT = currentType(), G = GT.gse;
    const RZ = GT.dim.tailZ + 23, FZ = GT.dim.noseZ - 24.4, LX = GT.dim.span / 2 + 3.1;
    const d1z = G.doorR1z, d2z = G.doorR2z, b1z = G.belt1z, b2z = G.belt2z, cz = G.contz, fx = G.fuelX, fz = G.fuelz, lz = G.lavz, wz = G.waterz, vz = G.vanz, tz = G.trainz, cx = G.catX, kx = G.contX, lx2 = G.lavX, wx = G.waterX;
    // docks (centre x, z, yaw) from the contact points on the hull
    const tip = POSE.beltTip(V.belt1, this.hCargo), bx = G.beltX ?? (1.55 - tip.z); this.beltPhi = tip.phi;
    const D = { cat1: [cx, d1z, PI / 2], cat2: [cx, d2z, PI / 2], belt1: [bx, b1z, PI / 2], belt2: [bx, b2z, PI / 2], cont: [kx, cz, PI / 2], fuel: [fx, fz, 0], lav: [lx2, lz, 0], water: [wx, wz, 0], van: [14, vz, PI / 2], train: [12.8, tz, 0] };
    const P = {
      cat1: [[[100, FZ], [40, FZ], [LX, FZ + 7], [LX, d1z - 6], [cx + 7.75, d1z], [cx + 3.75, d1z], [cx, d1z]], [[cx, d1z], [cx + 3.25, d1z], [cx + 6.25, d1z + 1.4], [cx + 8.25, d1z + 4]], [[cx + 8.25, d1z + 4], [cx + 7.65, d1z + 3.2], [cx + 8.75, d1z - 4], [cx + 11.25, d1z - 13], [LX, d1z - 21], [28, FZ], [100, FZ]]],
      cat2: [[[100, RZ], [40, RZ], [LX, RZ - 7], [LX, d2z + 7.4], [cx + 7.75, d2z], [cx + 3.75, d2z], [cx, d2z]], [[cx, d2z], [cx + 4.25, d2z], [cx + 9.25, d2z]], [[cx + 9.25, d2z], [cx + 7.75, d2z + 0.8], [cx + 6.85, d2z + 3.4], [cx + 7.75, d2z + 9.4], [cx + 10.75, d2z + 16.4], [LX + 1, d2z + 23.4], [30, RZ], [100, RZ]]],
      belt1: [[[100, FZ], [40, FZ], [LX, FZ + 7], [LX, b1z - 7.6], [14, b1z], [bx + 3.5, b1z], [bx, b1z]], [[bx, b1z], [bx + 3, b1z], [bx + 6.5, b1z + 1.4], [bx + 9, b1z + 4.2]], [[bx + 9, b1z + 4.2], [bx + 8.4, b1z + 3.5], [bx + 9, b1z - 3.6], [18, b1z - 13.6], [LX, b1z - 22.6], [28, FZ], [100, FZ]]],
      belt2: [[[100, RZ], [40, RZ], [LX, RZ - 7], [LX, b2z + 7.8], [14, b2z], [bx + 3.5, b2z], [bx, b2z]], [[bx, b2z], [bx + 3, b2z], [bx + 6.5, b2z - 1.4], [bx + 9, b2z - 4.2]], [[bx + 9, b2z - 4.2], [bx + 8.4, b2z - 3.5], [bx + 9, b2z + 3.8], [18, b2z + 12.8], [LX, b2z + 21.8], [28, RZ], [100, RZ]]],
      cont: [[[100, RZ], [40, RZ], [LX, RZ - 7], [LX, cz + 9.1], [kx + 8.85, cz], [kx + 3.6, cz], [kx, cz]], [[kx, cz], [kx + 2.8, cz], [kx + 6.8, cz - 1.4], [kx + 9.3, cz - 4.4]], [[kx + 9.3, cz - 4.4], [kx + 8.7, cz - 3.6], [kx + 9.35, cz + 4.1], [kx + 11.85, cz + 14.1], [LX, cz + 24.1], [28, RZ], [100, RZ]]],
      fuel: [[[100, RZ], [40, RZ], [LX + 1, RZ - 6], [LX, fz + 23.5], [fx + 2.5, fz + 11.5], [fx + 0.2, fz + 5.5], [fx, fz + 3], [fx, fz]], null, [[fx, fz], [fx, fz - 4.5], [fx + 0.6, fz - 10.5], [fx + 2.5, fz - 20.5], [LX, fz - 30.5], [28, FZ], [100, FZ]]],
      lav: [[[100, RZ], [20, RZ], [8, RZ - 1], [4, RZ - 5], [lx2, lz + 10.6], [lx2, lz + 4.6], [lx2, lz]], [[lx2, lz], [lx2, lz + 7.6], [lx2 - 0.7, lz + 15.6], [lx2 - 4.2, lz + 20.6], [lx2 - 8.2, lz + 22.1]], [[lx2 - 8.2, lz + 22.1], [lx2 - 3.2, lz + 22.6], [30, RZ], [100, RZ]]],
      water: [[[100, RZ], [24, RZ], [12, RZ - 1], [8, RZ - 5], [wx, wz + 12.2], [wx, wz + 5.2], [wx, wz]], [[wx, wz], [wx, wz + 8.2], [wx - 0.7, wz + 16.2], [wx - 4.2, wz + 21.7], [wx - 8.2, wz + 23.7]], [[wx - 8.2, wz + 23.7], [wx - 3.2, wz + 24.2], [30, RZ], [100, RZ]]],
      van: [[[100, FZ], [40, FZ], [24, FZ + 1.5], [18, vz - 1], [14, vz]], null, [[14, vz], [8, vz - 0.5], [0, vz - 2], [-12, FZ], [-100, FZ]]],
      train: [[[100, RZ], [40, RZ], [LX + 1, RZ - 6], [LX, tz + 34.6], [16, tz + 23.6], [13.2, tz + 14.6], [12.8, tz + 8.6], [12.8, tz]], null, [[LX, tz + 34.6], [16, tz + 23.6], [13.2, tz + 14.6], [12.8, tz + 8.6], [12.8, tz], [12.8, tz - 5.4], [14.5, tz - 13.4], [LX, tz - 22.4], [28, FZ], [100, FZ]]],
    };
    for (const id in V) {
      const v = V[id], [x, z, yw] = D[id], [pin, prev, pfwd] = P[id], tl = !auto ? [Infinity, null] : mode === 'dep' ? DEP[id] : [ARR[id], null];
      Object.assign(v, { dock: { x, z, yaw: yw }, legIn: new Leg(pin, false, id === 'train' ? 4 : 5.2), legRev: prev && new Leg(prev, true, 2.2), legFwd: new Leg(pfwd, false, id === 'train' ? 4 : 5.5), at: tl[0], out: tl[1], dep: DEPLOY[v.type === 'btug' ? 'train' : v.type] ?? 0, fast: 1, gone: false, docked: v.at === null, recall: false });
      v.legIn.T = Math.max(v.legIn.T, 8); if (id === 'train') v.s0 = v.legFwd.near(12.8, tz);
    }
    // hoses and cables (stand frame, static once docked)
    this.hoses.clear(); const hw = h - 0.05;
    const mk = (pts, r, col) => { const m = hoseMesh(pts, r, col); m.visible = false; this.hoses.add(m); return m; };
    this.hFuel = mk([[fx + 0.5, 2.75, fz + 1.25], [fx - 0.3, 3.1, fz + 2.5], [fx - 1.4, hw - 0.05, fz + 3.6], [G.fuelPanelX, hw, G.fuelPanelZ]], 0.05);
    const pit = mk([[fx + 1.1, 0.7, fz + 0.3], [fx + 1.7, 0.25, fz + 0.7], [fx + 2.6, 0.06, fz + 1.1]], 0.06); pit.add(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16), gseMats().metal).translateX(fx + 2.6).translateY(0.02).translateZ(fz + 1.1)); this.hPit = pit;
    this.hLav = mk([[lx2 - 0.7, 0.9, lz - 2.95], [lx2 - 1.2, 1.6, lz - 3.4], [lx2 - 2.0, h - 0.95, lz - 4.2], [lx2 - 2.6, h - 0.5, lz - 4.6]], 0.06, 0x3a3f45);
    this.hWater = mk([[wx - 0.7, 0.9, wz - 2.95], [wx - 2.0, 1.4, wz - 3.6], [wx - 4.7, h - 1.3, wz - 4.8], [wx - 6.25, h - 0.95, wz - 5.2]], 0.045, 0x2a4f8a);
    this.update(0);
  }
  prep() { // pushback requested: clear the stand
    if (this.prepT != null || !this.mode) return; this.prepT = this.t;
    for (const id in this.V) { const v = this.V[id], tin = v.at == null ? -1e9 : v.at; if (this.t < tin + v.legIn.T) { v.gone = true; continue; } if (v.out == null || v.out > this.t) { v.out = this.t; v.fast = 3.2; } }
  }
  // ---- manual services: state of one vehicle, call (drive in + dock + work), dismiss (undock + leave now)
  vstate(v) { const t = this.t; if (!this.mode) return 'away'; if (v.gone) return v.recall ? 'coming' : v.docked ? 'done' : 'away'; if (v.at === Infinity) return 'away'; const tin = v.at == null ? -1e9 : v.at;
    if (t < tin || (v.at != null && t < tin + v.legIn.T)) return 'coming'; if (v.out == null || t < v.out) return 'working'; return 'leaving'; }
  call(v, delay = 0) { const st = this.vstate(v); if (st === 'leaving') { v.recall = true; return; } if (st === 'coming' || st === 'working') return;
    Object.assign(v, { at: this.t + delay, out: null, gone: false, fast: 1, docked: false }); }
  dismiss(v) { const st = this.vstate(v); v.recall = false; if (st === 'working') v.out = Math.max(this.t, v.out == null ? this.t : Math.min(v.out, this.t));
    else if (st === 'coming') { if (v.at > this.t) { v.at = Infinity; v.gone = false; } else v.out = v.at + v.legIn.T - v.dep; } }
  clear() { this.svc.visible = false; this.mode = null; for (let i = 3; i < this.crew.n; i++) this.crew.p[i].vis = false; }
  // phase of a vehicle at time t: { vis, x, z, yaw, k (deploy 0..1), work (s since docked, -1 if not working), s (train arc) }
  phase(v, t, o) {
    o.vis = false; o.k = 0; o.work = -1; o.s = null; if (v.gone) return o;
    const tin = v.at == null ? -1e9 : v.at; if (t < tin) return o;
    o.vis = true;
    if (v.at != null && t < tin + v.legIn.T) { const u = (t - tin) / v.legIn.T; if (v.id === 'train') { o.s = v.legIn.L * u * u * (3 - 2 * u); o.legT = v.legIn; } else v.legIn.pose(u, o); return o; }
    const tDock = v.at == null ? -20 - v.dep : tin + v.legIn.T; const park = () => { o.x = v.dock.x; o.z = v.dock.z; o.yaw = v.dock.yaw; if (v.id === 'train') { o.s = v.legIn.L; o.legT = v.legIn; } };
    v.docked = true;
    if (v.out == null || t < v.out) { park(); o.k = v.dep ? clamp((t - tDock) / v.dep, 0, 1) : 1; o.work = o.k >= 1 ? t - tDock - v.dep : -1; return o; }
    let u = (t - v.out) * v.fast;
    if (u < v.dep) { park(); o.k = 1 - u / v.dep; return o; } u -= v.dep;
    if (v.legRev) { if (u < v.legRev.T) { v.legRev.pose(u / v.legRev.T, o); return o; } u -= v.legRev.T; }
    if (u < v.legFwd.T) { const e = u / v.legFwd.T; if (v.id === 'train') { o.s = v.s0 + (v.legFwd.L - v.s0) * e * e * (3 - 2 * e) * 1.15; o.legT = v.legFwd; } else v.legFwd.pose(e, o); return o; }
    o.vis = false; v.gone = true; return o;
  }
  update(dt) {
    if (!this.mode) return; this.t += dt; const t = this.t, o = this._o, C = this.crew, dep = this.mode === 'dep';
    if (this.prepT != null && t - this.prepT > 6.6) for (const id in this.V) this.V[id].gone = true;
    const ph = {};
    for (const id in this.V) {
      const v = this.V[id]; if (v.gone && v.recall) { v.recall = false; this.call(v, 1.5); } this.phase(v, t, o); ph[id] = { vis: o.vis, k: o.k, work: o.work };
      v.obj.visible = o.vis; if (v.cars) v.cars.forEach(c => c.obj.visible = o.vis);
      if (!o.vis) continue;
      if (o.s != null) { o.legT.at(o.s, o); v.obj.position.set(o.x, 0, o.z); v.obj.rotation.y = o.yaw; v.cars.forEach((c, i) => { o.legT.at(o.s - CART_OFF[i], o); c.obj.position.set(o.x, 0, o.z); c.obj.rotation.y = o.yaw; }); }
      else { v.obj.position.set(o.x, 0, o.z); v.obj.rotation.y = o.yaw; }
      if (v.type === 'cat') POSE.cat(v, ph[id].k, this.hDoor, ph[id].work >= 0 ? ph[id].work : null);
      if (v.type === 'cont') POSE.cont(v, ph[id].k, this.hCargo);
      if (v.type === 'fuel') POSE.fuel(v, ph[id].k, this.hAC - 1.7);
      if (v.type === 'belt') v.boom.rotation.x = 0.02 + (this.beltPhi - 0.02) * sm(ph[id].k, 0, 1);
    }
    this.svc.updateMatrixWorld(true); gseMats().belt.map.offset.y -= dt * 1.9 * (dep ? 1 : -1);
    // hoses
    const conn = (id, pre = 2) => ph[id].work >= 0 && (this.V[id].out == null || t < this.V[id].out - pre);
    this.hFuel.visible = conn('fuel', 4); this.hPit.visible = ph.fuel.vis && ph.fuel.k > 0.3;
    this.hLav.visible = conn('lav'); this.hWater.visible = conn('water');
    // bags: belts (up on departure, down on arrival) and carts; ULDs on dollies + the loader
    let bi = 0; const B = this.bags, M = this._m, M2 = this._m2;
    const beltOn = id => ph[id].work >= 0 && (this.V[id].out == null || t < this.V[id].out - 3);
    for (const id of ['belt1', 'belt2']) {
      const v = this.V[id]; if (!beltOn(id)) continue; const phi = v.boom.rotation.x, w = ph[id].work;
      for (let n = 0; n < 6; n++) { const d0 = ((w * 0.95 + n * 2.3) % 13.8); if (d0 > v.Lb - 0.5) continue; const d = dep ? d0 + 0.3 : v.Lb - 0.2 - d0;
        M2.copy(T(0, v.py + 0.13 * Math.cos(phi) + d * Math.sin(phi), v.pz - d * Math.cos(phi), (n % 3) * 0.4 - 0.4, phi)); B.setMatrixAt(bi++, M.multiplyMatrices(v.obj.matrix, M2)); }
    }
    const tr = this.V.train; const tDockTrain = tr.at == null ? -20 : tr.at + tr.legIn.T;
    const fill = i => dep ? 1 - clamp((t - tDockTrain - 20 - i * 40) / 140, 0, 1) : clamp((t - tDockTrain - 15 - i * 30) / 140, 0, 1);
    if (ph.train.vis) for (let ci = 0; ci < 2; ci++) { const c = tr.cars[ci], nb = Math.round(fill(ci) * 20);
      for (let j = 0; j < nb && bi < 64; j++) { const L = Math.floor(j / 8), r = j % 8; M2.copy(T((r % 2) * 0.66 - 0.33, 0.62 + L * 0.27, Math.floor(r / 2) * 0.68 - 1.02, ((j * 7) % 3) * 0.5)); B.setMatrixAt(bi++, M.multiplyMatrices(c.obj.matrix, M2)); } }
    for (let i = bi; i < 64; i++) B.setMatrixAt(i, ZERO); B.instanceMatrix.needsUpdate = true; B.count = 64;
    let ui = 0; const UA = this.uldA, UB = this.uldB, cv = this.V.cont, cw = ph.cont.work, cyc = cw >= 0 && (cv.out == null || t < cv.out - 2) ? Math.floor(cw / 40) : -1;
    const uldDone = cw >= 0 ? clamp(Math.floor(cw / 40), 0, 2) : dep && (cv.gone || (cv.out != null && t >= cv.out)) ? 2 : 0; // ULDs moved so far
    if (ph.train.vis) for (let di = 0; di < 2; di++) { const has = dep ? di >= uldDone : di < uldDone; if (!has) continue; M2.copy(T(0, 0.6, 0, 0)); M.multiplyMatrices(tr.cars[2 + di].obj.matrix, M2); UA.setMatrixAt(ui, M); UB.setMatrixAt(ui++, M); }
    // ULD transfer travel is clamped (C-F1): the old 7.6 m slide drove the ULD's front
    // face (centre z - 0.765) to stand x = 0.39 — through the closed cargo-door skin.
    // 6.1 m of travel stops the front at stand x ≈ 2.09, clear of the hull; the
    // loader's bridge deck spans the remaining gap visually.
    if (cyc >= 0 && cyc < 2) { const p = (cw % 40) / 40, e = sm(p, 0.1, 0.85), z = dep ? 3.0 - 6.1 * e : -3.1 + 6.1 * e; if (p < 0.88) { M2.copy(T(0, cv.main.position.y + 0.08, z)); M.multiplyMatrices(cv.obj.matrix, M2); UA.setMatrixAt(ui, M); UB.setMatrixAt(ui++, M); } }
    for (let i = ui; i < 3; i++) { UA.setMatrixAt(i, ZERO); UB.setMatrixAt(i, ZERO); } UA.instanceMatrix.needsUpdate = UB.instanceMatrix.needsUpdate = true;
    // service crew (slots 3..)
    const man = (i, v, x, y, z, yaw, mode, vis = true) => { const p = C.p[i]; p.vis = vis && !!v.obj.visible; if (!p.vis) return; p.pos.set(x, y, z); v.obj.localToWorld(p.pos); p.yaw = this.svc.rotation.y + v.obj.rotation.y + yaw; p.mode = mode; };
    const work = id => ph[id].work >= 0;
    man(3, this.V.belt1, 1.05, 0, 2.7, -PI / 2, beltOn('belt1') ? 'load' : 'idle', work('belt1'));
    man(4, this.V.belt2, 1.05, 0, 2.7, -PI / 2, beltOn('belt2') ? 'load' : 'idle', work('belt2'));
    man(5, cv, 0.8, cv.bridge.position.y + 0.02, -2.4, PI, 'idle', ph.cont.k > 0.9);
    const fv = this.V.fuel; man(6, fv, -0.5, fv.plat.position.y, 3.95, -PI / 2, 'idle', ph.fuel.k > 0.6);
    for (const [i, id] of [[7, 'cat1'], [8, 'cat2']]) { const v = this.V[id]; man(i, v, -0.5, v.boxG.position.y, v.plat.position.z + 0.4, PI, 'idle', ph[id].k > 0.98); }
    man(9, this.V.lav, -1.35, 0, -3.3, -2.4, 'idle', work('lav')); man(10, this.V.water, -1.35, 0, -3.3, -2.3, 'idle', work('water'));
    man(11, tr, 0, 1.12, 0.45, PI, 'sit', ph.train.vis);
    // cleaners: walk between the van and the bridge stairs (they work inside the cabin)
    const van = this.V.van, vd = (van.at == null ? -1e9 : van.at) + van.legIn.T;
    const G = this.GT.gse;
    for (const j of [0, 1]) { const p = C.p[12 + j]; let f = -1; if (dep) f = t > 28 + j * 1.5 && t < 44 ? 1 - (t - 28 - j * 1.5) / 14 : -1; else f = ph.van.vis && t > vd + 2 + j * 1.5 && t < vd + 16 + j * 1.5 ? (t - vd - 2 - j * 1.5) / 14 : -1;
      p.vis = f >= 0 && this.svc.visible; if (!p.vis) continue; const a = [12.5, G.vanz + 1.4 + j * 0.8], b = [-3 + j * 0.8, G.doorR1z - 11.5]; const x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f; p.pos.set(x, 0, z); this.svc.localToWorld(p.pos);
      p.yaw = this.svc.rotation.y + Math.atan2((b[0] - a[0]) * (dep ? -1 : 1), (b[1] - a[1]) * (dep ? -1 : 1)); p.mode = 'walk'; }
    { const p = C.p[14]; p.vis = this.svc.visible && this.prepT == null; p.pos.set(3.2, 0, this.GT.dim.noseZ - 2.9); this.svc.localToWorld(p.pos); p.yaw = this.svc.rotation.y + 0.3; p.mode = 'idle'; }
  }
  stats() { let tris = 0, calls = 0; this.svc.traverseVisible(o => { if (o.isMesh) { calls++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); } }); return { calls, tris: Math.round(tris) }; }
}
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
