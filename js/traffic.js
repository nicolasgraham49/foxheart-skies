// AI traffic: scripted arrivals and departures on the active runway of the current airport.
// [Traffic] at the 12 featured airports the lifecycle completes on the ground: an arrival
// vacates, taxis in on the real taxiNet (connector -> parallel -> apron link -> apron lane
// -> lead-in) and parks at a free stand (bridge docks); after a dwell it pushes back with a
// tug, taxis out and takes off. Non-featured airports keep the original air-only behaviour.
import * as THREE from 'three';
import { parkedAirlinerGeometry } from './airport.js';
import { trafficAirliner, TRAFFIC_LIVERIES, pickTrafficVariant, trafficGlassMaterial, trafficFinMaterial, trafficTitlesMaterial, VARIANT_KZ } from './ac-traffic.js';
import { atmos } from './sky.js';
import { KT, D2R } from './data.js';

const GROUND_PHASES = ['taxiin', 'parked', 'push', 'pushpause', 'taxiout'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapPi = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
// [Playtest fixes Nov 14] (P2) path helpers for mover deconfliction: distance
// from a point to a polyline, and the gap between two polylines (resampled so
// crossing paths read ~0 without segment-intersection math).
const segDist = (px, pz, ax, az, bx, bz) => { const abx = bx - ax, abz = bz - az, t = clamp(((px - ax) * abx + (pz - az) * abz) / (abx * abx + abz * abz || 1), 0, 1); return Math.hypot(px - (ax + abx * t), pz - (az + abz * t)); };
const distToPath = (x, z, path) => { if (path.length < 2) return Math.hypot(x - path[0].x, z - path[0].z); let d = 1e9; for (let i = 0; i + 1 < path.length; i++) d = Math.min(d, segDist(x, z, path[i].x, path[i].z, path[i + 1].x, path[i + 1].z)); return d; };
const resample = (path, step) => { const out = [path[0]]; for (let i = 0; i + 1 < path.length; i++) { const a = path[i], b = path[i + 1], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / step)); for (let k = 1; k <= n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n }); } return out; };
const pathGap = (p1, p2) => { const a = resample(p1, 7), b = resample(p2, 7); let d = 1e9; for (const p of a) for (const q of b) { const dd = Math.hypot(p.x - q.x, p.z - q.z); if (dd < d) d = dd; } return d; };

export class Traffic {
  constructor(scene) {
    this.scene = scene; this.list = []; this.timer = 25; this.enabled = true; this.ends = []; this.apt = null; this.seq = 0; // [Playtest fixes Nov 14] spawn order = ground right-of-way priority
    this.gnd = null; this.featured = false; this.playerPos = null;
    // per-variant geometry sets with fictional liveries (ac-traffic.js); the simple parked
    // geometry stays as the fallback if the detailed build ever throws
    try { this.geoSet = {}; for (const v of ['std', 'stretch', 'short']) this.geoSet[v] = trafficAirliner('high', v); }
    catch (e) { this.geoSet = { std: parkedAirlinerGeometry() }; }
    this.geo = this.geoSet.std;
    this.glassMat = trafficGlassMaterial();
  }
  setup(apt, aptPos, ends, active, built) {
    this.clear(); this.apt = apt; this.aptPos = aptPos; this.ends = ends; this.active = active; this.timer = 20;
    this.gnd = built && built.b ? built.b : null; this.featured = !!(apt && apt.featured);
    if (this.groundOK()) this.seedParked();
  }
  clear() {
    for (const a of this.list) { this.scene.remove(a.obj); if (a.stand) { a.stand.used = false; a.stand = null; } }
    this.list = [];
  }
  groundOK() { return !!(this.featured && this.gnd && this.gnd.stands && this.gnd.stands.length > 2 && this.gnd.taxiNet && this.gnd.taxiNet.length); }
  make(liv = 0, varn = 'std') {
    const L = TRAFFIC_LIVERIES[liv % TRAFFIC_LIVERIES.length], geo = this.geoSet[varn] || this.geo, kz = VARIANT_KZ[varn] || 1;
    const grp = new THREE.Group();
    const bm = atmos(new THREE.MeshStandardMaterial({ vertexColors: true, color: new THREE.Color(L.body[0], L.body[1], L.body[2]), roughness: 0.4, metalness: 0.15 }));
    grp.add(new THREE.Mesh(geo.body, bm));
    grp.add(new THREE.Mesh(geo.fin, trafficFinMaterial(liv)));
    if (geo.titles) { const tm = new THREE.Mesh(geo.titles, trafficTitlesMaterial(liv)); tm.renderOrder = 2; grp.add(tm); }
    if (geo.glass && geo.glass.attributes.position.count) grp.add(new THREE.Mesh(geo.glass, this.glassMat));
    const wz = z => -13 + (z + 13) * kz; // light points follow the variant warp
    const lp = [[17, 0.3, wz(4.8)], [-17, 0.3, wz(4.8)], [0, 2.1, wz(-1)], [0, 1.5, wz(19.5)], [4.5, -0.8, wz(-3.5)], [-4.5, -0.8, wz(-3.5)]];
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp.flat(), 3)); lg.setAttribute('aCol', new THREE.Float32BufferAttribute(new Float32Array(lp.length * 3), 3));
    const lm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `#include <common>\n#include <logdepthbuf_pars_vertex>\nattribute vec3 aCol; varying vec3 vC; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; vC = aCol; gl_PointSize = clamp(3000.0/-mv.z, 2.5, 40.0) * min(1.0, length(aCol)); \n#include <logdepthbuf_vertex>\n}`,
      fragmentShader: `#include <common>\n#include <logdepthbuf_pars_fragment>\nvarying vec3 vC; void main(){ vec2 q = gl_PointCoord-0.5; float r = dot(q,q)*4.0; gl_FragColor = vec4(vC*(exp(-r*6.0)+0.5*exp(-r*40.0))*2.0, 1.0);\n#include <logdepthbuf_fragment>\n}` });
    const pts = new THREE.Points(lg, lm); pts.frustumCulled = false; grp.add(pts);
    grp.userData.lights = lg.attributes.aCol;
    this.scene.add(grp); return grp;
  }
  makeTug() { // minimal pushback tug (a child of the plane's group, nose-gear local frame)
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 4.6), new THREE.MeshStandardMaterial({ color: 0xd8d3c3, roughness: 0.7, metalness: 0.1 }));
    body.position.y = 0.55; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 1.6), new THREE.MeshStandardMaterial({ color: 0x2c3136, roughness: 0.4, metalness: 0.2 }));
    cab.position.set(0, 1.25, 0.4); g.add(cab);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 3.4), new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.6 }));
    bar.position.set(0, 0.35, 3.6); g.add(bar);
    g.visible = false; return g;
  }
  spawn(kind, player) {
    const E = this.active; if (!E) return;
    const thr = new THREE.Vector3(this.aptPos.x + E.thrX, this.aptPos.y, this.aptPos.z + E.thrZ), dir = new THREE.Vector3(E.dir.x, 0, E.dir.z);
    const start = new THREE.Vector3(this.aptPos.x + E.x, this.aptPos.y, this.aptPos.z + E.z);
    // keep clear of the player on or near this runway
    const rel = player.clone().sub(thr); const along = rel.dot(dir), cross = Math.abs(rel.x * -dir.z + rel.z * dir.x);
    if (cross < 300 && along > -16000 && along < E.length + 600 && player.y - this.aptPos.y < 1200) return;
    // [Playtest fixes Nov 14] (P1) a legacy departure materialises ON the runway: never spawn one onto an occupied strip
    if (kind === 'dep' && this.runwayUse(E).busy) return;
    const liv = (Math.random() * TRAFFIC_LIVERIES.length) | 0, varn = pickTrafficVariant(Math.random());
    const a = { kind, obj: this.make(liv, varn), t: 0, thr, dir, start, E, s: 0, v: 0, h: 0, pitch: 0, done: false, phase: 'air', seq: this.seq++ };
    if (kind === 'arr') { a.s = -16000; a.v = 145 * KT; a.h = 15 + 16000 * Math.tan(3 * D2R); }
    else { a.s = 40; a.v = 0; a.h = 0; a.hold = 12; a.s0 = start.clone().sub(thr).dot(dir) + 40; a.s = a.s0; }
    this.list.push(a);
  }
  // ------------------------------------------------------------ ground ops
  netFor() {
    if (!this.gnd) return null;
    return this.gnd.taxiNet.find(t => t.r.a === this.active || t.r.b === this.active) || this.gnd.taxiNet[0] || null;
  }
  // ------------------------------------------------------------ [Playtest fixes Nov 14] (P1) ONE runway-occupancy model
  // Shared by the tower (atcCtx.runwayBusy in main.js delegates here) and by
  // traffic itself (runwayEntryClear, the arrival go-around, the dep spawn
  // guard). A physical runway (either end) is in use when any traffic aircraft
  // is physically ON the strip — any phase, ground or air (the old ctx test
  // read air-phase traffic only, so a jet sitting on the runway in a ground
  // phase was invisible and the captain got his takeoff clearance over it) —
  // or on short final, or rolling / climbing out over the strip.
  onStrip(E, x, z, alongPad = 90, crossPad = 16) { // world-frame point vs E's strip rectangle
    if (!E) return false;
    const dx = x - (this.aptPos.x + E.thrX), dz = z - (this.aptPos.z + E.thrZ);
    const along = dx * E.dir.x + dz * E.dir.z, cross = -dx * E.dir.z + dz * E.dir.x;
    const W = E.width || (this.netFor() && this.netFor().r.W) || 45;
    return along > -alongPad && along < E.length + alongPad && Math.abs(cross) < W / 2 + crossPad;
  }
  runwayUse(E) {
    if (!this.apt || !this.active || !E) return { busy: false };
    if (!(E === this.active || E === this.active.other || this.active === E.other ||
      (E.ident && this.active.ident && (E.ident === this.active.ident || (this.active.other && E.ident === this.active.other.ident))))) return { busy: false }; // traffic only ever uses the active runway (ident fallback: the caller's end may come from another geometry instance of the same strip)
    for (const a of this.list) { if (a.done) continue;
      if ((a.h || 0) < 120 && this.onStrip(E, a.x, a.z)) return { busy: true, a, why: a.kind === 'arr' ? 'traffic landing' : (a.phase && a.phase !== 'air') ? 'traffic on the runway' : 'traffic departing' };
      if (a.kind === 'arr' && (!a.phase || a.phase === 'air') && !a.ga && a.s > -7000 && a.s < 60) return { busy: true, a, why: a.s < -400 ? `traffic ${Math.max(1, Math.round(-a.s / 1852))} mile final` : 'traffic landing' };
      if (a.kind === 'dep' && (!a.phase || a.phase === 'air') && (a.hold > 0 || a.h < 250) && a.s < E.length + 400) return { busy: true, a, why: 'traffic departing' };
    }
    return { busy: false };
  }
  playerOnRunway(pp) { // the captain physically on the active strip (ground or just-rotated height)
    if (!pp || !this.active) return false;
    if (pp.y - this.aptPos.y > 120) return false;
    return this.onStrip(this.active, pp.x, pp.z, 160, 22);
  }
  runwayEntryClear(a, player) { // may ground mover a cross onto the active runway right now?
    const use = this.runwayUse(this.active); if (use.busy && use.a !== a) return false;
    if (this.playerOnRunway(player)) return false;
    if (player && a.route) {
      if (player.y - this.aptPos.y < 60) { const lp = a.route.find(p => p.tag === 'lineup'); if (lp && Math.hypot(player.x - lp.p.x, player.z - lp.p.z) < 170) return false; } // captain taxiing to the same entry
      else if (player.y - this.aptPos.y >= 40) { // captain airborne on approach to this runway: do not enter under him
        const E = this.active, dx = player.x - (this.aptPos.x + E.thrX), dz = player.z - (this.aptPos.z + E.thrZ);
        const along = dx * E.dir.x + dz * E.dir.z, cross = -dx * E.dir.z + dz * E.dir.x;
        if (along > -3800 && along < E.length && Math.abs(cross) < 320) return false;
      }
    }
    return true;
  }
  pathAhead(a, len) { // [Playtest fixes Nov 14] (P2) my position + upcoming route points, truncated to ~len metres of travel
    const pts = [{ x: a.x, z: a.z }]; if (!a.route) return pts;
    let acc = 0, px = a.x, pz = a.z;
    for (let i = a.routeI; i < a.route.length && acc < len; i++) { const p = a.route[i].p; acc += Math.hypot(p.x - px, p.z - pz); pts.push({ x: p.x, z: p.z }); px = p.x; pz = p.z; }
    return pts;
  }
  lanePt(s) { // a point on the apron taxilane (42 m in front of the stand line), airport-local
    const fr = this.gnd.frame, nOff = -(fr.dep / 2 - 45) + 42;
    return { x: fr.ax + fr.adx * s + fr.nx * nOff, z: fr.az + fr.adz * s + fr.nz * nOff };
  }
  freeStand(focus) {
    const fr = this.gnd.frame; let best = null, bd = 1e18, freeN = 0;
    for (const st of this.gnd.stands) if (!st.used) freeN++;
    if (freeN <= 1) return null; // never take the last free stand — it stays available for the captain (his arrival pickStand takes a free stand)
    for (const st of this.gnd.stands) {
      if (st.used) continue;
      const wx = this.aptPos.x + st.x - focus.x, wz = this.aptPos.z + st.z - focus.z, d = wx * wx + wz * wz;
      if (d < bd) { bd = d; best = st; }
    }
    return best;
  }
  focusPoint(player) { // where ground ops should cluster: near the player when the player is at this airport
    if (player && Math.hypot(player.x - this.aptPos.x, player.z - this.aptPos.z) < 1600) return player;
    return { x: this.aptPos.x + this.gnd.frame.ax, z: this.aptPos.z + this.gnd.frame.az };
  }
  seedParked() { // two neighbours on stands from the first frame (setup runs under the loading screen: no pop-in)
    const focus = { x: this.aptPos.x + this.gnd.frame.ax, z: this.aptPos.z + this.gnd.frame.az };
    const free = this.gnd.stands.filter(s => !s.used).sort((p, q) => p.s - q.s);
    const picks = [0.3, 0.7].slice(0, Math.min(2, Math.max(0, free.length - 2))); // leave at least two stands free: one for the captain, one spare
    for (const pick of picks) {
      if (this.list.filter(a => a.phase === 'parked').length >= 2) break;
      const st = free[Math.floor(free.length * pick)]; if (!st || st.used) continue;
      this.parkNew(st, focus);
    }
  }
  parkNew(st, focus) {
    const liv = (Math.random() * TRAFFIC_LIVERIES.length) | 0, varn = pickTrafficVariant(Math.random());
    const E = this.active, thr = new THREE.Vector3(this.aptPos.x + E.thrX, this.aptPos.y, this.aptPos.z + E.thrZ), dir = new THREE.Vector3(E.dir.x, 0, E.dir.z);
    const a = { kind: 'dep', obj: this.make(liv, varn), t: 0, thr, dir, start: thr.clone(), E, s: 0, v: 0, h: 0, pitch: 0, done: false, phase: 'parked', stand: st, dwell: 200 + Math.random() * 320, seq: this.seq++ };
    st.used = true;
    const fr = this.gnd.frame;
    a.x = this.aptPos.x + st.x - fr.nx * 2; a.z = this.aptPos.z + st.z - fr.nz * 2; a.y = this.aptPos.y + 3.6;
    a.gHdg = st.inHdg * D2R;
    st.jb?.userData?.setDocked?.(true);
    this.list.push(a); return a;
  }
  pickLink(net, nearS, mode) {
    if (net.links && net.links.length) {
      return net.links.slice().sort((p, q) => Math.abs(p.s - nearS) - Math.abs(q.s - nearS))[0];
    }
    // no painted link (defensive): a synthetic one from the parallel to the apron front edge
    const fr = this.gnd.frame, r = net.r;
    const vs = clamp((fr.ax - r.a.x) * r.dir.x + (fr.az - r.a.z) * r.dir.z, 0, r.L);
    return { name: '', s: vs, a: net.P(vs), b: { x: fr.ax + fr.nx * fr.dep / 2, z: fr.az + fr.nz * fr.dep / 2 } };
  }
  W2(x, z) { return new THREE.Vector3(x, this.aptPos.y + 3.6, z); } // local -> world point at gear height
  beginTaxiIn(a, player) {
    const net = this.netFor(); if (!net) return false;
    const r = net.r, fr = this.gnd.frame;
    const st = this.freeStand(this.focusPoint(player)); if (!st) return false;
    const lx = a.x - this.aptPos.x, lz = a.z - this.aptPos.z;
    const sRwy = (lx - r.a.x) * r.dir.x + (lz - r.a.z) * r.dir.z;
    const dirSign = this.active === r.a ? 1 : -1;
    let conn = null, bestAhead = -1e18;
    for (const c of net.conns) { const ahead = (c.s - sRwy) * dirSign; if (ahead > 100 && (!conn || ahead < bestAhead)) { conn = c; bestAhead = ahead; } }
    if (!conn) { // nothing comfortably ahead: leave by the far end connector
      for (const c of net.conns) { const ahead = (c.s - sRwy) * dirSign; if (ahead > bestAhead) { conn = c; bestAhead = ahead; } }
    }
    if (!conn) return false;
    const link = this.pickLink(net, conn.s, 'in');
    st.used = true; a.stand = st;
    const rx = -r.dir.z, rz = r.dir.x, px = rx * net.sd, pz = rz * net.sd; // unit toward the parallel taxiway
    const clX = r.a.x + r.dir.x * conn.s, clZ = r.a.z + r.dir.z * conn.s;
    const sLink = (link.b.x - fr.ax) * fr.adx + (link.b.z - fr.az) * fr.adz;
    const laneLink = this.lanePt(sLink), laneStand = this.lanePt(st.s);
    const pts = [
      { p: this.W2(lx, lz), v: 12, tag: 'rollout' },
      { p: this.W2(clX + px * r.W * 0.3, clZ + pz * r.W * 0.3), v: 9, tag: 'exit' },
      { p: this.W2(conn.b.x, conn.b.z), v: 10, tag: 'connector' },
    ];
    if (Math.abs(link.s - conn.s) > 30) pts.push({ p: this.W2(net.P(link.s).x, net.P(link.s).z), v: 13, tag: 'parallel' });
    pts.push(
      { p: this.W2(link.b.x, link.b.z), v: 11, tag: 'link' },
      { p: this.W2(laneLink.x, laneLink.z), v: 11, tag: 'lane' },
      { p: this.W2(laneStand.x, laneStand.z), v: 10, tag: 'lane' },
      { p: this.W2(st.x + fr.nx * 30, st.z + fr.nz * 30), v: 6, tag: 'leadin' },
      { p: this.W2(st.x - fr.nx * 2, st.z - fr.nz * 2), v: 3.5, tag: 'stand' },
    );
    a.route = pts; a.routeI = 0; a.phase = 'taxiin'; a.v = Math.min(a.v, 12); a.gHdg = Math.atan2(a.dir.x, -a.dir.z);
    a.connS = conn.s; a.net = net;
    return true;
  }
  startDeparture(a) {
    const net = this.netFor(), st = a.stand; if (!net || !st) return false;
    const r = net.r, fr = this.gnd.frame;
    const sEnd = r.a === this.active ? 0 : r.L;
    const link = this.pickLink(net, sEnd, 'out');
    const conn = net.conns.slice().sort((p, q) => Math.abs(p.s - sEnd) - Math.abs(q.s - sEnd))[0];
    const sLink = (link.b.x - fr.ax) * fr.adx + (link.b.z - fr.az) * fr.adz;
    const laneLink = this.lanePt(sLink), laneStand = this.lanePt(st.s);
    const lenConn = Math.hypot(conn.b.x - conn.a.x, conn.b.z - conn.a.z) || 1;
    const holdPt = { x: conn.a.x + (conn.b.x - conn.a.x) * (26 / lenConn), z: conn.a.z + (conn.b.z - conn.a.z) * (26 / lenConn) };
    const thrStation = (this.active.thrX - r.a.x) * r.dir.x + (this.active.thrZ - r.a.z) * r.dir.z;
    const dirSign = this.active === r.a ? 1 : -1;
    const lineS = thrStation + dirSign * 45;
    const pts = [
      { p: this.W2(st.x + fr.nx * 36, st.z + fr.nz * 36), v: 2, tag: 'pushback' },
      { p: this.W2(laneStand.x, laneStand.z), v: 9, tag: 'lane' },
      { p: this.W2(laneLink.x, laneLink.z), v: 11, tag: 'lane' },
      { p: this.W2(link.b.x, link.b.z), v: 11, tag: 'link' },
      { p: this.W2(link.a.x, link.a.z), v: 12, tag: 'parallel' },
    ];
    if (Math.abs(conn.s - link.s) > 30) pts.push({ p: this.W2(net.P(conn.s).x, net.P(conn.s).z), v: 13, tag: 'parallel' });
    pts.push(
      { p: this.W2(holdPt.x, holdPt.z), v: 7, tag: 'hold', hold: 7 + Math.random() * 8 },
      { p: this.W2(conn.a.x, conn.a.z), v: 7, tag: 'lineup' },
      { p: this.W2(r.a.x + r.dir.x * conn.s, r.a.z + r.dir.z * conn.s), v: 7, tag: 'lineup' },
      { p: this.W2(r.a.x + r.dir.x * lineS, r.a.z + r.dir.z * lineS), v: 8, tag: 'lineup' },
    );
    a.route = pts; a.routeI = 0; a.phase = 'push'; a.waitT = 5; a.v = 0; a.net = net; a.connS = conn.s;
    if (!a.tug) { a.tug = this.makeTug(); a.obj.add(a.tug); }
    a.tug.visible = false;
    st.jb?.userData?.setDocked?.(false);
    return true;
  }
  groundMovers() { return this.list.filter(a => a.phase === 'taxiin' || a.phase === 'taxiout' || a.phase === 'push').length; }
  followRoute(a, dt, player) {
    const pt = a.route[a.routeI]; if (!pt) return true;
    const dx = pt.p.x - a.x, dz = pt.p.z - a.z, dist = Math.hypot(dx, dz);
    if (pt.hold && !pt.holdDone) {
      if (dist < 9) { a.v = Math.max(0, a.v - 3 * dt); if (a.v < 0.2) { pt.hold -= dt; if (pt.hold <= 0) { pt.holdDone = true; a.routeI++; } } return false; }
    }
    const want = Math.atan2(dx, -dz), diff = wrapPi(want - a.gHdg);
    let vT = pt.v;
    const ad = Math.abs(diff);
    if (ad > 0.45) vT = Math.min(vT, 3.6); else if (ad > 0.2) vT = Math.min(vT, 6.5);
    if (a.routeI === a.route.length - 1) vT = Math.min(vT, Math.max(2.2, dist * 0.32));
    // [Playtest fixes Nov 14] (P2) deconfliction with NO drive-through. Three
    // independent stops, each held until it actually clears:
    //  (a) the captain: the original ahead-cone hard stop (62 m), unchanged;
    //  (b) any mover physically in my immediate path (15 m of my next ~36 m):
    //      a hard stop — except a mover that is stopped and yielding to me,
    //      which I may pass; under 6 m I stop whoever I am;
    //  (c) right-of-way: I yield EARLY to an earlier-spawned (lower-seq) mover
    //      whose route crosses mine inside the ~95 m lookahead — I stop well
    //      before the conflict point, its path stays clear, and once it has
    //      passed, mine clears too, so the pair never meets nose-to-nose.
    // The old release — "creep on after a 30 s hold" — is gone: it drove movers
    // through each other at intersections whenever a hold outlasted the timer.
    if (a.phase === 'taxiin' || a.phase === 'taxiout') {
      const fx = Math.sin(a.gHdg), fz = -Math.cos(a.gHdg);
      const block = (ox, oz, rad) => { const bx = ox - a.x, bz = oz - a.z, dd = Math.hypot(bx, bz); return dd < rad && (bx * fx + bz * fz) > 0.15 * dd; };
      let held = false; a.yielding = false;
      const nearPlayer = player && player.y - this.aptPos.y < 60;
      const myNear = this.pathAhead(a, 36), myPath = this.pathAhead(a, 95);
      // the 62 m ahead-cone alone also fires for a captain PARKED at his
      // gate tens of metres off the route line (44 m away, 37 m off the
      // path, in the probe) — and he never moves, so the mover held
      // forever: apron gridlock next to the captain's stand. The cone now
      // only counts when the captain is also near my actual route path;
      // the precise path check below remains the hard stop.
      if (nearPlayer && block(player.x, player.z, 62) && distToPath(player.x, player.z, myPath) < 30) held = true;
      if (nearPlayer && distToPath(player.x, player.z, myNear) < 20) held = true;
      for (const o of this.list) {
        if (o === a || o.done || o.phase === 'parked') continue;
        const dNear = distToPath(o.x, o.z, myNear);
        if (dNear < 6) { held = true; continue; }
        const oYieldingToMe = o.phase && o.phase !== 'air' && o.yielding && (o.seq || 0) > (a.seq || 0) && o.v < 0.5;
        if (dNear < 15 && !oYieldingToMe) held = true;
        if (o.phase && o.phase !== 'air' && o.route && (o.seq || 0) < (a.seq || 0) && pathGap(myPath, this.pathAhead(o, 95)) < 24) { held = true; a.yielding = true; }
      }
      // [Playtest fixes Nov 14] (P1) a line-up point is a runway entry: cross
      // onto the strip only when the shared occupancy model says it is clear
      // and the captain is neither on it nor about to use it. Once I am on the
      // strip myself I am committed and vacate/line up without stopping.
      if (!held && a.phase === 'taxiout' && pt.tag === 'lineup' && a.routeI <= a.route.findIndex(p => p.tag === 'lineup') && !this.runwayEntryClear(a, player)) held = true; // committed once the first line-up point is REACHED (routeI passes it): geometry can't say it — a connector joins the strip flush, so the mover is inside the runway rectangle while still on the connector
      if (held) { a.holdFor = (a.holdFor || 0) + dt; vT = 0; } else a.holdFor = 0;
    }
    a.v += clamp(vT - a.v, -2.4 * dt, 1.3 * dt);
    const rate = a.v < 7 ? 0.5 : a.v < 12 ? 0.33 : 0.22;
    a.gHdg += clamp(diff, -rate * dt, rate * dt);
    a.x += Math.sin(a.gHdg) * a.v * dt; a.z += -Math.cos(a.gHdg) * a.v * dt;
    if (dist < Math.max(6.5, a.v * 0.55)) { a.routeI++; return a.routeI >= a.route.length; }
    return false;
  }
  updateGround(a, dt, player) {
    a.y = this.aptPos.y + 3.6; a.h = 0; a.pitch *= 0.9;
    if (a.phase === 'parked') { a.v = 0; a.dwell -= dt; }
    else if (a.phase === 'push') {
      if (a.waitT > 0) { a.waitT -= dt; a.v = 0; } // the bridge is still retracting
      else {
        if (a.tug) { a.tug.visible = true; a.tug.position.set(0, -3.55, -16.2); }
        const pt = a.route[0], dx = pt.p.x - a.x, dz = pt.p.z - a.z, dist = Math.hypot(dx, dz);
        a.v = Math.min(1.7, a.v + 0.8 * dt);
        if (dist > 0.4) { a.x += dx / dist * a.v * dt; a.z += dz / dist * a.v * dt; }
        if (dist < 1.2) { a.phase = 'pushpause'; a.waitT = 3; a.v = 0; a.routeI = 1; }
      }
    }
    else if (a.phase === 'pushpause') {
      a.waitT -= dt;
      if (a.tug && a.tug.visible) { a.tug.position.x += 3.4 * dt; a.tug.position.z -= 1.2 * dt; } // the tug clears off to the side
      if (a.waitT <= 0) { if (a.tug) a.tug.visible = false; a.phase = 'taxiout'; }
    }
    else if (a.phase === 'taxiin' || a.phase === 'taxiout') {
      const fin = this.followRoute(a, dt, player);
      if (a.phase === 'taxiin') {
        // vacated once the fuselage is clear of the runway strip
        if (!a.vacated && a.net) { const r = a.net.r, lx = a.x - this.aptPos.x, lz = a.z - this.aptPos.z; const cross = Math.abs((lx - r.a.x) * -r.dir.z + (lz - r.a.z) * r.dir.x); if (cross > r.W / 2 + 8) { a.vacated = true; a.exitT = 99; } }
        if (fin) {
          a.phase = 'parked'; a.v = 0; a.dwell = 240 + Math.random() * 360;
          const fr = this.gnd.frame; a.gHdg = a.stand.inHdg * D2R;
          a.x = this.aptPos.x + a.stand.x - fr.nx * 2; a.z = this.aptPos.z + a.stand.z - fr.nz * 2;
          a.stand.jb?.userData?.setDocked?.(true);
        }
      } else if (fin) { // taxiout complete: hand over to the legacy runway departure
        a.phase = 'air'; a.kind = 'dep'; a.s = 45; a.v = Math.max(a.v, 8); a.h = 0; a.hold = 5; a.pitch = 0;
        if (a.stand) { a.stand.used = false; a.stand = null; }
        a.route = null;
      }
    }
    a.obj.position.set(a.x, a.y, a.z);
    a.obj.rotation.set(0, 0, 0); a.obj.rotateY(-a.gHdg);
  }
  // ------------------------------------------------------------ test hooks (used by fsim-harness)
  forceArr() { const n = this.list.length; this.spawn('arr', new THREE.Vector3(0, 1e7, 0)); const a = this.list[this.list.length - 1]; if (a && this.list.length > n && a.kind === 'arr') { a.s = -2600; return a; } return null; }
  forceDep() { const a = this.list.find(p => p.phase === 'parked'); if (a) { a.dwell = 0; return this.startDeparture(a); } return false; }
  groundState() {
    return this.list.map(a => ({ kind: a.kind, phase: a.phase, gate: a.stand ? a.stand.gate : null, x: Math.round(a.x || 0), z: Math.round(a.z || 0), v: +((a.v || 0).toFixed(1)), routeI: a.routeI ?? null, routeN: a.route ? a.route.length : 0, vacated: !!a.vacated }));
  }
  update(dt, t, player, night) {
    if (!this.enabled || !this.active) return;
    this.playerPos = player;
    this.timer -= dt;
    if (this.timer < 0) {
      const air = this.list.filter(a => !a.phase || a.phase === 'air');
      if (this.groundOK()) {
        this.timer = 50 + Math.random() * 40;
        if (air.length < 2 && this.list.length < 6) {
          const ready = this.list.find(a => a.phase === 'parked' && a.dwell <= 0);
          const depBusy = this.list.some(a => a.phase === 'taxiout' || a.phase === 'push' || a.phase === 'pushpause');
          if (ready && !depBusy && this.groundMovers() < 3) this.startDeparture(ready);
          else if (!air.some(a => a.kind === 'arr') && this.freeStand(this.focusPoint(player))) this.spawn('arr', player);
          else if (!ready && !depBusy) this.spawn('dep', player);
        }
      } else {
        this.timer = 70 + Math.random() * 50;
        if (this.list.length < 2) this.spawn(Math.random() < 0.5 ? 'arr' : 'dep', player);
      }
    }
    for (const a of this.list) {
      a.t += dt;
      if (a.phase && a.phase !== 'air') { this.updateGround(a, dt, player); }
      else if (a.kind === 'arr') {
        // [Playtest fixes Nov 14] (P1) never land on an occupied runway: on short
        // final, if the strip is physically in use (the captain on it, or any
        // other mover on it), go around, climb away and leave.
        if (!a.ga && a.s > -4200 && a.s < -40) {
          const stripBusy = this.playerOnRunway(player) || this.list.some(o => o !== a && !o.done && (o.h || 0) < 120 && this.onStrip(this.active, o.x, o.z));
          if (stripBusy) a.ga = true;
        }
        if (a.ga) { a.v += (150 * KT - a.v) * dt * 0.3; a.s += a.v * dt; a.h += dt * 10.5; a.pitch += (8 - a.pitch) * dt; if (a.h > 1100 || a.s > 12000) a.done = true; }
        else if (a.h > 0.01) {
          a.v += (138 * KT - a.v) * dt * 0.05;
          a.s += a.v * dt;
          if (a.h < 14) { a.h = Math.max(0, a.h - Math.max(1.0, a.h * 0.45) * dt); a.pitch += (4 - a.pitch) * dt; }
          else { a.h = Math.max(13.9, 15 + (286 - a.s) * Math.tan(3 * D2R)); a.pitch += (2.5 - a.pitch) * dt; }
        } else {
          a.v = Math.max(9, a.v - 2.2 * dt); a.s += a.v * dt; a.pitch += (0 - a.pitch) * dt * 2; if (a.v <= 9.5) a.exitT = (a.exitT || 0) + dt; if (a.exitT > 25 || a.s > a.E.length - 100) a.done = true;
          // [Traffic] slow enough on the roll-out at a featured airport: turn off and taxi to a gate
          if (!a.done && this.groundOK() && !a.gndTried && (a.v <= 13.5 || a.s > a.E.length - 260)) { a.gndTried = true; if (this.beginTaxiIn(a, player)) a.done = false; }
        }
      } else {
        if (a.hold > 0) { a.hold -= dt; }
        else {
          a.v += (a.h > 0 ? 1.4 : 2.1) * dt; a.s += a.v * dt;
          if (a.v > 145 * KT) { a.pitch = Math.min(15, a.pitch + 3 * dt); }
          if (a.pitch > 7) a.h += a.v * Math.sin((a.pitch - 7) * D2R * 1.1) * dt + (a.h > 0 ? 0 : 0);
          if (a.h > 1200 || a.s > 18000) a.done = true;
        }
      }
      if (!a.phase || a.phase === 'air') {
        const p = (a._p || (a._p = new THREE.Vector3())).copy(a.thr).addScaledVector(a.dir, a.s); p.y = a.thr.y + a.h + 3.6; // [Perf] per-plane scratch, was a clone + a 6x3 array literal per plane per frame
        a.obj.position.copy(p);
        const hdg = Math.atan2(a.dir.x, -a.dir.z);
        a.obj.rotation.set(0, 0, 0); a.obj.rotateY(-hdg); a.obj.rotateX(a.pitch * D2R);
        a.x = p.x; a.y = p.y; a.z = p.z;
      }
      const L = a.obj.userData.lights; const bc = (t % 1) < 0.12, st = (t % 1.2) < 0.05;
      const ll = a.phase === 'parked' ? 0 : (a.h < 3000 ? 1 : 0) * (night ? 1.4 : 0.8);
      L.setXYZ(0, 0.1, 1, 0.35); L.setXYZ(1, 1, 0.08, 0.05);
      if (bc) L.setXYZ(2, 1, 0.05, 0.02); else L.setXYZ(2, 0, 0, 0);
      if (st) L.setXYZ(3, 3, 3, 3); else L.setXYZ(3, 0.8, 0.8, 0.8);
      L.setXYZ(4, ll, ll, ll * 0.9); L.setXYZ(5, ll, ll, ll * 0.9);
      L.needsUpdate = true;
    }
    for (const a of this.list.filter(a => a.done)) { this.scene.remove(a.obj); if (a.stand) { a.stand.used = false; a.stand = null; } }
    this.list = this.list.filter(a => !a.done);
  }
}
