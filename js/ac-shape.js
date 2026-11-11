// Aircraft hull definition shared by the exterior, the livery painter and the cabin.
// Body frame: x = right wing, y = up, z = aft (nose at -z). Section at z: crown `top`, keel `bot`, half-width `w`,
// widest-line height `ym`; theta = 0 at the crown, PI/2 on the right side, PI under the keel, 3PI/2 on the left.
//
// [Aircraft types] The shape is LIVE STATE: applyShape(spec) (driven by ac-types.js at boot, before
// anything builds) re-points the section curves, windows, doors and gear at the selected type.
// The default type ("fox", the original Foxheart narrowbody) installs the ORIGINAL literal tables
// below verbatim, so its hull is numerically identical to the pre-types build. Other types derive
// their curves by remapping the canonical nose-/tail-anchored control points.
import * as THREE from 'three';
import { pchip } from './ac-util.js';

// ---- the original fox tables, verbatim (absolute z) — the default type's hull, untouched
const FOX_TOP = [[-18.6, -0.38], [-18.57, -0.2], [-18.45, 0.08], [-18.2, 0.42], [-17.8, 0.78], [-17.3, 1.1], [-16.8, 1.36], [-16.2, 1.63], [-15.6, 1.85], [-14.8, 1.98], [-13.6, 2.045], [-12.1, 2.06], [9.5, 2.06], [11.5, 2.02], [13.5, 1.92], [15.5, 1.76], [17.5, 1.55], [18.6, 1.4], [19.0, 1.3]];
const FOX_BOT = [[-18.6, -0.38], [-18.57, -0.56], [-18.45, -0.78], [-18.2, -1.02], [-17.8, -1.3], [-17.3, -1.53], [-16.6, -1.75], [-15.6, -1.92], [-14.4, -2.02], [-13.1, -2.06], [3.5, -2.06], [5.5, -2.0], [7.5, -1.82], [9.5, -1.55], [11.5, -1.22], [13.5, -0.82], [15.5, -0.38], [17.5, 0.12], [18.6, 0.55], [19.0, 0.8]];
const FOX_WID = [[-18.6, 0], [-18.57, 0.2], [-18.45, 0.43], [-18.2, 0.69], [-17.8, 0.98], [-17.3, 1.24], [-16.6, 1.5], [-15.6, 1.74], [-14.4, 1.9], [-13.1, 1.965], [-11.4, 1.98], [6.5, 1.98], [9.5, 1.94], [11.5, 1.85], [13.5, 1.65], [15.5, 1.3], [17.5, 0.8], [18.6, 0.45], [19.0, 0.28]];
const FOX_YM = [[-18.6, -0.38], [-18.2, -0.3], [-17.3, -0.2], [-15.6, -0.08], [-13.6, -0.02], [-11.4, 0], [5.0, 0], [9.5, 0.12], [11.5, 0.3], [13.5, 0.55], [15.5, 0.78], [17.5, 0.95], [19.0, 1.05]];
// ---- canonical form of the same hull for remapping: nose points as [distance from nose, value],
// tail points as [distance from tail, value]. Remap: z = noseZ + d*noseScale / tailZ - dT*tailScale,
// values scaled by vScale (top/bot/ym) or wScale (wid).
const CANON = {
  topN: [[0, -0.38], [0.03, -0.2], [0.15, 0.08], [0.4, 0.42], [0.8, 0.78], [1.3, 1.1], [1.8, 1.36], [2.4, 1.63], [3.0, 1.85], [3.8, 1.98], [5.0, 2.045], [6.5, 2.06]],
  topT: [[9.5, 2.06], [7.5, 2.02], [5.5, 1.92], [3.5, 1.76], [1.5, 1.55], [0.4, 1.4], [0, 1.3]],
  botN: [[0, -0.38], [0.03, -0.56], [0.15, -0.78], [0.4, -1.02], [0.8, -1.3], [1.3, -1.53], [2.0, -1.75], [3.0, -1.92], [4.2, -2.02], [5.5, -2.06]],
  botT: [[15.5, -2.06], [13.5, -2.0], [11.5, -1.82], [9.5, -1.55], [7.5, -1.22], [5.5, -0.82], [3.5, -0.38], [1.5, 0.12], [0.4, 0.55], [0, 0.8]],
  widN: [[0, 0], [0.03, 0.2], [0.15, 0.43], [0.4, 0.69], [0.8, 0.98], [1.3, 1.24], [2.0, 1.5], [3.0, 1.74], [4.2, 1.9], [5.5, 1.965], [7.2, 1.98]],
  widT: [[12.5, 1.98], [9.5, 1.94], [7.5, 1.85], [5.5, 1.65], [3.5, 1.3], [1.5, 0.8], [0.4, 0.45], [0, 0.28]],
  ymN: [[0, -0.38], [0.4, -0.3], [1.3, -0.2], [3.0, -0.08], [5.0, -0.02], [7.2, 0]],
  ymT: [[14, 0], [9.5, 0.12], [7.5, 0.3], [5.5, 0.55], [3.5, 0.78], [1.5, 0.95], [0, 1.05]],
};
function remap(spec, nPts, tPts, vScale, isTopBot) {
  const out = [];
  for (const [d, v] of nPts) {
    let vv = v * vScale;
    if (isTopBot && d < 3) { const f = (1 - d / 3) * (1 - d / 3); if (isTopBot === 1) vv -= (spec.noseTopDrop || 0) * f; else if (isTopBot === 2) vv += (spec.noseBotRise || 0) * f; }
    out.push([spec.noseZ + d * spec.noseScale, vv]);
  }
  const tail = tPts.map(([dT, v]) => [spec.tailZ - dT * spec.tailScale, v * vScale]);
  tail.sort((a, b) => a[0] - b[0]);
  return out.concat(tail);
}
function buildCurves(spec) {
  if (spec.foxTables) return { TOP: pchip(FOX_TOP), BOT: pchip(FOX_BOT), WID: pchip(FOX_WID), YM: pchip(FOX_YM) };
  return {
    TOP: pchip(remap(spec, CANON.topN, CANON.topT, spec.vScale, 1)),
    BOT: pchip(remap(spec, CANON.botN, CANON.botT, spec.vScale, 2)),
    WID: pchip(remap(spec, CANON.widN, CANON.widT, spec.wScale, 0)),
    YM: pchip(remap(spec, CANON.ymN, CANON.ymT, spec.vScale, 0)),
  };
}

export let NOSE_Z = -18.6, TAIL_Z = 19.0, HULL_L = TAIL_Z - NOSE_Z;
let { TOP, BOT, WID, YM } = buildCurves({ foxTables: true });
export function SEC(z) { const top = TOP(z), bot = BOT(z); const ym = Math.min(top - 0.04, Math.max(bot + 0.04, YM(z))); return { top, bot, w: Math.max(0, WID(z)), ym }; }
export function hullPoint(z, th, out = new THREE.Vector3(), s = SEC(z)) {
  const c = Math.cos(th); return out.set(s.w * Math.sin(th), s.ym + (c >= 0 ? s.top - s.ym : s.ym - s.bot) * c, z);
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
export function hullNormal(z, th, out = new THREE.Vector3()) {
  const e = 1e-3, zz = Math.min(TAIL_Z - 2e-3, Math.max(NOSE_Z + 0.02, z));
  hullPoint(zz + e, th, _a); hullPoint(zz - e, th, _b); hullPoint(zz, th + e, _c); hullPoint(zz, th - e, _d);
  return out.crossVectors(_a.sub(_b), _c.sub(_d)).normalize();
}
// theta of the hull point at height y on the given side (+1 right, -1 left)
export function thetaAt(z, y, side, s = SEC(z)) {
  const c = y >= s.ym ? (y - s.ym) / (s.top - s.ym) : (y - s.ym) / (s.ym - s.bot); const t = Math.acos(Math.max(-1, Math.min(1, c)));
  return side > 0 ? t : Math.PI * 2 - t;
}
// half-width of the hull at height y (0 outside the section)
export function halfWidth(z, y, s = SEC(z)) { const c = y >= s.ym ? (y - s.ym) / (s.top - s.ym) : (y - s.ym) / (s.ym - s.bot); return Math.abs(c) >= 1 ? 0 : s.w * Math.sqrt(1 - c * c); }
export function insideHull(p, pad = 0) { const s = SEC(p.z); if (s.w <= 0) return false; const hy = p.y >= s.ym ? s.top - s.ym : s.ym - s.bot; return (p.x / (s.w + pad)) ** 2 + ((p.y - s.ym) / (hy + pad)) ** 2 < 1; }

// ------------------------------------------------------------------ cabin windows, doors
export const FLOOR_Y = -0.55, WIN_Y = 0.40, WIN_PITCH = 0.535;
export const WINDOWS = []; // { z, side, exit }
export const DOOR = { w: 0.81, h: 1.85, r: 0.18, y0: FLOOR_Y, y1: FLOOR_Y + 1.85 };
export const DOORS = [];
export const EXITS = [];
// main-gear stow position (wheel well in the belly fairing) and fairing envelope, shared by gear + body.
// wheelY: the FDM ground-contact plane in body coords (DIM.wheelY mirrors it). bogie: half-spacing of a
// two-axle main bogie (0 = single axle, the narrowbody layout).
export const GEAR = { mainX: 3.8, mainZ: 1.25, hingeY: -0.95, wheelR: 0.58, wheelW: 0.42, track: 0.39, retract: 86 * Math.PI / 180, noseZ: -12.9, noseHingeY: -1.25, noseR: 0.38, noseW: 0.28, wheelY: -3.62, bogie: 0 };

const FOX_WINDOWS = () => { const w = []; for (let k = -21; k <= 19; k++) { const z = 0.3725 + k * WIN_PITCH; for (const side of [1, -1]) w.push({ z, side, exit: k === -1 || k === 0 }); } return w; };
const FOX_DOORS = [{ id: 'L1', z: -13.0, side: -1 }, { id: 'R1', z: -13.0, side: 1 }, { id: 'L2', z: 11.6, side: -1 }, { id: 'R2', z: 11.6, side: 1 }];
const FOX_GEAR = { mainX: 3.8, mainZ: 1.25, hingeY: -0.95, wheelR: 0.58, wheelW: 0.42, track: 0.39, retract: 86 * Math.PI / 180, noseZ: -12.9, noseHingeY: -1.25, noseR: 0.38, noseW: 0.28, wheelY: -3.62, bogie: 0 };

// Install a type's shape: curves, window run, door set and gear geometry. Called once at boot by
// ac-types.applyType, before the aircraft/cabin/world build. Arrays are mutated in place so every
// importer's reference stays valid.
export let NOSE_SCALE = 1; // nose-station stretch of the installed shape (1 on the fox)
export function applyShape(spec) {
  NOSE_Z = spec.noseZ; TAIL_Z = spec.tailZ; HULL_L = TAIL_Z - NOSE_Z; NOSE_SCALE = spec.noseScale || 1;
  ({ TOP, BOT, WID, YM } = buildCurves(spec));
  WINDOWS.length = 0;
  if (spec.foxTables) { for (const w of FOX_WINDOWS()) WINDOWS.push({ ...w, i: WINDOWS.length }); }
  else {
    const d1 = spec.doors[0].z, dA = spec.winDoors ? spec.winDoors[1] : spec.doors[spec.doors.length - 1].z;
    const z0 = d1 + 2.1375, z1 = dA - 1.0625, pitch = spec.winPitch || WIN_PITCH;
    const n = Math.max(8, Math.round((z1 - z0) / pitch) + 1), mid = (z0 + z1) / 2;
    const zs = []; for (let i = 0; i < n; i++) zs.push(z0 + (z1 - z0) * (n === 1 ? 0 : i / (n - 1)));
    const ex = new Set(zs.map((z, i) => [Math.abs(z - mid), i]).sort((a, b) => a[0] - b[0]).slice(0, 2).map(x => x[1]));
    zs.forEach((z, zi) => { for (const side of [1, -1]) WINDOWS.push({ z, side, exit: ex.has(zi), i: WINDOWS.length }); });
  }
  DOORS.length = 0; for (const d of (spec.foxTables ? FOX_DOORS : spec.doors)) DOORS.push({ ...d });
  EXITS.length = 0; for (const w of WINDOWS.filter(w => w.exit)) EXITS.push({ z: w.z, side: w.side, w: 0.51, h: 0.96, r: 0.12 });
  Object.assign(GEAR, spec.foxTables ? FOX_GEAR : spec.gear);
  if (spec.door) Object.assign(DOOR, spec.door); else Object.assign(DOOR, { w: 0.81, h: 1.85, r: 0.18, y0: FLOOR_Y, y1: FLOOR_Y + 1.85 });
}
// the module's initial state IS the fox shape
applyShape({ foxTables: true, noseZ: -18.6, tailZ: 19.0 });
