// AI traffic: scripted arrivals and departures on the active runway of the current airport.
import * as THREE from 'three';
import { parkedAirlinerGeometry } from './airport.js';
import { trafficAirliner, TRAFFIC_LIVERIES, pickTrafficVariant, trafficGlassMaterial, trafficFinMaterial, trafficTitlesMaterial, VARIANT_KZ } from './ac-traffic.js';
import { atmos } from './sky.js';
import { KT, D2R } from './data.js';

export class Traffic {
  constructor(scene) {
    this.scene = scene; this.list = []; this.timer = 25; this.enabled = true; this.ends = []; this.apt = null;
    // per-variant geometry sets with fictional liveries (ac-traffic.js); the simple parked
    // geometry stays as the fallback if the detailed build ever throws
    try { this.geoSet = {}; for (const v of ['std', 'stretch', 'short']) this.geoSet[v] = trafficAirliner('high', v); }
    catch (e) { this.geoSet = { std: parkedAirlinerGeometry() }; }
    this.geo = this.geoSet.std;
    this.glassMat = trafficGlassMaterial();
  }
  setup(apt, aptPos, ends, active) { this.clear(); this.apt = apt; this.aptPos = aptPos; this.ends = ends; this.active = active; this.timer = 20; }
  clear() { for (const a of this.list) this.scene.remove(a.obj); this.list = []; }
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
  spawn(kind, player) {
    const E = this.active; if (!E) return;
    const thr = new THREE.Vector3(this.aptPos.x + E.thrX, this.aptPos.y, this.aptPos.z + E.thrZ), dir = new THREE.Vector3(E.dir.x, 0, E.dir.z);
    const start = new THREE.Vector3(this.aptPos.x + E.x, this.aptPos.y, this.aptPos.z + E.z);
    // keep clear of the player on or near this runway
    const rel = player.clone().sub(thr); const along = rel.dot(dir), cross = Math.abs(rel.x * -dir.z + rel.z * dir.x);
    if (cross < 300 && along > -16000 && along < E.length + 600 && player.y - this.aptPos.y < 1200) return;
    const liv = (Math.random() * TRAFFIC_LIVERIES.length) | 0, varn = pickTrafficVariant(Math.random());
    const a = { kind, obj: this.make(liv, varn), t: 0, thr, dir, start, E, s: 0, v: 0, h: 0, pitch: 0, done: false };
    if (kind === 'arr') { a.s = -16000; a.v = 145 * KT; a.h = 15 + 16000 * Math.tan(3 * D2R); }
    else { a.s = 40; a.v = 0; a.h = 0; a.hold = 12; a.s0 = start.clone().sub(thr).dot(dir) + 40; a.s = a.s0; }
    this.list.push(a);
  }
  update(dt, t, player, night) {
    if (!this.enabled || !this.active) return;
    this.timer -= dt;
    if (this.timer < 0 && this.list.length < 2) { this.spawn(Math.random() < 0.5 ? 'arr' : 'dep', player); this.timer = 70 + Math.random() * 50; }
    for (const a of this.list) {
      a.t += dt;
      if (a.kind === 'arr') {
        if (a.h > 0.01) {
          a.v += (138 * KT - a.v) * dt * 0.05;
          a.s += a.v * dt;
          if (a.h < 14) { a.h = Math.max(0, a.h - Math.max(1.0, a.h * 0.45) * dt); a.pitch += (4 - a.pitch) * dt; }
          else { a.h = Math.max(13.9, 15 + (286 - a.s) * Math.tan(3 * D2R)); a.pitch += (2.5 - a.pitch) * dt; }
        } else { a.v = Math.max(9, a.v - 2.2 * dt); a.s += a.v * dt; a.pitch += (0 - a.pitch) * dt * 2; if (a.v <= 9.5) a.exitT = (a.exitT || 0) + dt; if (a.exitT > 25 || a.s > a.E.length - 100) a.done = true; }
      } else {
        if (a.hold > 0) { a.hold -= dt; }
        else {
          a.v += (a.h > 0 ? 1.4 : 2.1) * dt; a.s += a.v * dt;
          if (a.v > 145 * KT) { a.pitch = Math.min(15, a.pitch + 3 * dt); }
          if (a.pitch > 7) a.h += a.v * Math.sin((a.pitch - 7) * D2R * 1.1) * dt + (a.h > 0 ? 0 : 0);
          if (a.h > 1200 || a.s > 18000) a.done = true;
        }
      }
      const p = (a._p || (a._p = new THREE.Vector3())).copy(a.thr).addScaledVector(a.dir, a.s); p.y = a.thr.y + a.h + 3.6; // [Perf] per-plane scratch, was a clone + a 6x3 array literal per plane per frame
      a.obj.position.copy(p);
      const hdg = Math.atan2(a.dir.x, -a.dir.z);
      a.obj.rotation.set(0, 0, 0); a.obj.rotateY(-hdg); a.obj.rotateX(a.pitch * D2R);
      a.x = p.x; a.y = p.y; a.z = p.z;
      const L = a.obj.userData.lights; const bc = (t % 1) < 0.12, st = (t % 1.2) < 0.05;
      const ll = (a.h < 3000 ? 1 : 0) * (night ? 1.4 : 0.8);
      L.setXYZ(0, 0.1, 1, 0.35); L.setXYZ(1, 1, 0.08, 0.05);
      if (bc) L.setXYZ(2, 1, 0.05, 0.02); else L.setXYZ(2, 0, 0, 0);
      if (st) L.setXYZ(3, 3, 3, 3); else L.setXYZ(3, 0.8, 0.8, 0.8);
      L.setXYZ(4, ll, ll, ll * 0.9); L.setXYZ(5, ll, ll, ll * 0.9);
      L.needsUpdate = true;
    }
    for (const a of this.list.filter(a => a.done)) this.scene.remove(a.obj);
    this.list = this.list.filter(a => !a.done);
  }
}
