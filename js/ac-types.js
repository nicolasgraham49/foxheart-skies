// [Aircraft types] The selectable fleet. One parametric spec per type drives the hull shape
// (ac-shape.applyShape), the exterior build (ac-model TYPE_VIS), the FDM, the cabin/seat map
// (interiors + ac-cabin), the ground-service dock points (env-turnaround) and the jet bridge.
// The default type 'fox' is the original Foxheart narrowbody: every value below reproduces the
// pre-types build exactly (its shape installs the literal tables in ac-shape.js). The other types
// are STYLISED family likenesses — Boeing-style / Airbus-style silhouettes, Foxheart liveries only,
// never real airline or manufacturer branding.
import { applyShape } from './ac-shape.js';

const FOX_PROBES = [[0, -2.0, -17.5], [0, -1.08, 12], [5.75, -3.0, -5], [-5.75, -3.0, -5], [17, -0.2, 3.8], [-17, -0.2, 3.8], [0, -2.1, 0]];
const FOX_BELLY = [[5.75, -3.0, -5], [-5.75, -3.0, -5], [0, -2.1, 0], [0, -2.0, -14], [0, -1.08, 12]];

export const TYPES = [
  {
    id: 'fox', name: 'Foxheart FJ-200', maker: 'Foxheart Original', seatsNote: '174 seats · 121 passengers',
    desc: 'The original Foxheart twin-jet. 174 seats, 121 passengers board.',
    shape: { foxTables: true, noseZ: -18.6, tailZ: 19.0 },
    dim: { length: 37.6, span: 35.8, noseZ: -18.6, tailZ: 19.0, R: 1.98, wheelY: -3.62, mainZ: 1.25, mainX: 3.8, noseGearZ: -12.9, engX: 5.75 },
    deckDz: 0,
    vis: { wg: { b0: 1.2, bK: 6.2, bT: 16.95, sweep: Math.tan(27 * Math.PI / 180), dih: Math.tan(5.5 * Math.PI / 180), zRef: -4.3, bRef: 1.7, yRef: -1.05, te: [2.5, 2.8, 5.0] }, ht: { b0: 0.35, bT: 6.3, z0: 13.7, y0: 1.0, sweep: Math.tan(32 * Math.PI / 180), dih: Math.tan(6 * Math.PI / 180), cr: 3.75, ct: 1.3 }, vt: { y0: 1.4, h: 6.45, z0: 11.55, sweep: Math.tan(37 * Math.PI / 180), cr: 6.05, ct: 2.05 }, eng: { x: 5.75, y: -1.95, z0: -6.95, scale: 1 }, wingletScale: 1, mask: false, flatFan: false, fair: { yc: -0.95, a: 2.2, b: 1.24 } },
    fdm: { mass: 64000, I: { pitch: 3.4e6, roll: 1.5e6, yaw: 4.4e6 }, S: 122.6, CBAR: 4.19, B: 34.1, thrust: 120000, engX: 5.75, probes: FOX_PROBES, belly: FOX_BELLY },
    cabin: { rows: 29, pitch: 0.79, z0: -10.6, seatXs: [-1.505, -1.005, -0.505, 0.505, 1.005, 1.505], aisleXs: [0], pax: 121, psuXs: [-1.17, 1.17], entryHx: 1.7, crewPostX: 0.62, profile: { sx: 1, door1: -13.0, door2: 11.6, aisles: [0], centrePSU: false } },
    gse: { belt1z: -8.4, belt2z: 9.2, contz: 5.9, fuelX: 16, fuelz: -1.5, fuelPanelX: 13.5, fuelPanelZ: 2.62, lavz: 19.4, waterz: 17.8, vanz: -37, trainz: -8.6, doorR1z: -13.0, doorR2z: 11.6, catX: 6.75, contX: 6.15, beltX: null, lavX: 3.2, waterX: 7.2 },
  },
  {
    id: 'b737', name: 'Boeing 737-style', maker: 'Boeing-style narrowbody', seatsNote: '168 seats · 117 passengers',
    desc: 'Boeing-style narrowbody: pointed nose, flattened-bottom engine intakes, tall blended winglets. 168 seats, 117 passengers board.',
    shape: {
      noseZ: -19.75, tailZ: 19.75, noseScale: 1.10, tailScale: 1.06, wScale: 1.88 / 1.98, vScale: 3.80 / 4.12, noseTopDrop: 0.10, noseBotRise: 0.06,
      doors: [{ id: 'L1', z: -14.2, side: -1 }, { id: 'R1', z: -14.2, side: 1 }, { id: 'L2', z: 12.8, side: -1 }, { id: 'R2', z: 12.8, side: 1 }],
      gear: { mainX: 3.66, mainZ: 1.4, hingeY: -0.95, wheelR: 0.57, wheelW: 0.40, track: 0.39, retract: 86 * Math.PI / 180, noseZ: -14.0, noseHingeY: -1.25, noseR: 0.35, noseW: 0.26, wheelY: -3.55, bogie: 0 },
    },
    dim: { length: 39.5, span: 35.8, noseZ: -19.75, tailZ: 19.75, R: 1.88, wheelY: -3.55, mainZ: 1.4, mainX: 3.66, noseGearZ: -14.0, engX: 5.6 },
    deckDz: -1.15,
    vis: { wg: { b0: 1.15, bK: 6.0, bT: 16.95, sweep: Math.tan(25 * Math.PI / 180), dih: Math.tan(6 * Math.PI / 180), zRef: -4.0, bRef: 1.7, yRef: -1.08, te: [2.5, 2.8, 5.0] }, ht: { b0: 0.35, bT: 6.9, z0: 14.6, y0: 1.05, sweep: Math.tan(32 * Math.PI / 180), dih: Math.tan(6 * Math.PI / 180), cr: 3.6, ct: 1.25 }, vt: { y0: 1.35, h: 6.1, z0: 12.3, sweep: Math.tan(38 * Math.PI / 180), cr: 6.4, ct: 1.9 }, eng: { x: 5.6, y: -1.90, z0: -6.6, scale: 0.94 }, wingletScale: 1.25, mask: false, flatFan: true, fair: { yc: -0.90, a: 2.1, b: 1.18 } },
    fdm: { mass: 66000, I: { pitch: 3.9e6, roll: 1.7e6, yaw: 5.0e6 }, S: 124.6, CBAR: 4.05, B: 35.8, thrust: 121000, engX: 5.6, probes: [[0, -2.0, -18.6], [0, -1.08, 12.6], [5.6, -2.9, -5], [-5.6, -2.9, -5], [16.8, -0.2, 3.8], [-16.8, -0.2, 3.8], [0, -2.1, 0]], belly: [[5.6, -2.9, -5], [-5.6, -2.9, -5], [0, -2.1, 0], [0, -2.0, -15.1], [0, -1.08, 12.6]] },
    cabin: { rows: 28, pitch: 0.79, z0: -11.6, seatXs: [-1.43, -0.955, -0.48, 0.48, 0.955, 1.43], aisleXs: [0], pax: 117, psuXs: [-1.11, 1.11], entryHx: 1.65, crewPostX: 0.59, profile: { sx: 1.88 / 1.98, door1: -14.2, door2: 12.8, aisles: [0], centrePSU: false } },
    gse: { belt1z: -9.6, belt2z: 10.4, contz: 7.1, fuelX: 16, fuelz: -1.2, fuelPanelX: 13.5, fuelPanelZ: 2.9, lavz: 20.2, waterz: 18.6, vanz: -38.2, trainz: -9.8, doorR1z: -14.2, doorR2z: 12.8, catX: 6.6, contX: 6.0, beltX: null, lavX: 3.1, waterX: 7.0 },
  },
  {
    id: 'a320', name: 'Airbus A320-style', maker: 'Airbus-style narrowbody', seatsNote: '180 seats · 125 passengers',
    desc: 'Airbus-style narrowbody: round nose with the black cockpit mask, sharklets, rounder tail cone. 180 seats, 125 passengers board.',
    shape: {
      noseZ: -18.79, tailZ: 18.78, noseScale: 0.98, tailScale: 1.02, wScale: 1.0, vScale: 1.0, noseTopDrop: -0.03, noseBotRise: -0.02,
      doors: [{ id: 'L1', z: -13.4, side: -1 }, { id: 'R1', z: -13.4, side: 1 }, { id: 'L2', z: 12.6, side: -1 }, { id: 'R2', z: 12.6, side: 1 }],
      gear: { mainX: 3.75, mainZ: 1.3, hingeY: -0.95, wheelR: 0.60, wheelW: 0.43, track: 0.39, retract: 86 * Math.PI / 180, noseZ: -13.2, noseHingeY: -1.25, noseR: 0.38, noseW: 0.28, wheelY: -3.70, bogie: 0 },
    },
    dim: { length: 37.57, span: 34.1, noseZ: -18.79, tailZ: 18.78, R: 1.98, wheelY: -3.70, mainZ: 1.3, mainX: 3.75, noseGearZ: -13.2, engX: 5.9 },
    deckDz: -0.19,
    vis: { wg: { b0: 1.2, bK: 6.0, bT: 15.9, sweep: Math.tan(25 * Math.PI / 180), dih: Math.tan(5.7 * Math.PI / 180), zRef: -4.2, bRef: 1.7, yRef: -1.02, te: [2.5, 2.8, 5.0] }, ht: { b0: 0.35, bT: 6.1, z0: 13.2, y0: 1.0, sweep: Math.tan(28 * Math.PI / 180), dih: Math.tan(5 * Math.PI / 180), cr: 3.5, ct: 1.2 }, vt: { y0: 1.4, h: 5.9, z0: 11.2, sweep: Math.tan(33 * Math.PI / 180), cr: 5.6, ct: 1.95 }, eng: { x: 5.9, y: -1.92, z0: -6.8, scale: 1.0 }, wingletScale: 1.3, mask: true, flatFan: false, fair: { yc: -0.95, a: 2.2, b: 1.24 } },
    fdm: { mass: 64000, I: { pitch: 3.4e6, roll: 1.5e6, yaw: 4.4e6 }, S: 122.6, CBAR: 4.19, B: 34.1, thrust: 120000, engX: 5.9, probes: [[0, -2.0, -17.7], [0, -1.08, 11.8], [5.9, -3.0, -5], [-5.9, -3.0, -5], [16.15, -0.2, 3.8], [-16.15, -0.2, 3.8], [0, -2.1, 0]], belly: [[5.9, -3.0, -5], [-5.9, -3.0, -5], [0, -2.1, 0], [0, -2.0, -14.2], [0, -1.08, 11.8]] },
    cabin: { rows: 30, pitch: 0.79, z0: -10.8, seatXs: [-1.505, -1.005, -0.505, 0.505, 1.005, 1.505], aisleXs: [0], pax: 125, psuXs: [-1.17, 1.17], entryHx: 1.7, crewPostX: 0.62, profile: { sx: 1, door1: -13.4, door2: 12.6, aisles: [0], centrePSU: false } },
    gse: { belt1z: -8.8, belt2z: 10.2, contz: 6.9, fuelX: 16, fuelz: -1.4, fuelPanelX: 13.5, fuelPanelZ: 2.7, lavz: 19.2, waterz: 17.6, vanz: -37.2, trainz: -9.0, doorR1z: -13.4, doorR2z: 12.6, catX: 6.75, contX: 6.15, beltX: null, lavX: 3.2, waterX: 7.2 },
  },
  {
    id: 'a350', name: 'Airbus A350-style', maker: 'Airbus-style widebody', seatsNote: '297 seats · 252 passengers',
    desc: 'Airbus A350-style widebody: twin aisles, 3-3-3 seating, four door pairs, twin-bogie mains. 297 seats, 252 passengers board — the heavy one: longer take-off roll, gentler climb.',
    shape: {
      noseZ: -30.5, tailZ: 30.5, noseScale: 1.55, tailScale: 1.9, wScale: 2.98 / 1.98, vScale: 3.05 / 2.06, noseTopDrop: 0.02, noseBotRise: 0.0, winPitch: 0.55, winDoors: [-24.8, 21.0],
      doors: [{ id: 'L1', z: -24.8, side: -1 }, { id: 'R1', z: -24.8, side: 1 }, { id: 'L2', z: -8.0, side: -1 }, { id: 'R2', z: -8.0, side: 1 }, { id: 'L3', z: 9.0, side: -1 }, { id: 'R3', z: 9.0, side: 1 }, { id: 'L4', z: 21.0, side: -1 }, { id: 'R4', z: 21.0, side: 1 }],
      gear: { mainX: 5.1, mainZ: 1.6, hingeY: -1.1, wheelR: 0.63, wheelW: 0.46, track: 0.42, retract: 86 * Math.PI / 180, noseZ: -24.2, noseHingeY: -1.5, noseR: 0.42, noseW: 0.31, wheelY: -4.95, bogie: 0.78 },
    },
    dim: { length: 61.0, span: 61.0, noseZ: -30.5, tailZ: 30.5, R: 2.98, wheelY: -4.95, mainZ: 1.6, mainX: 5.1, noseGearZ: -24.2, engX: 9.6 },
    deckDz: -11.9,
    // a350 te = trailing-edge z at [root, kink, tip] -> chords 10.7 / 6.8 / 2.9 m,
    // the widebody's own planform (the fox te values break this wing; see ac-model wingSec).
    vis: { wg: { b0: 1.9, bK: 9.0, bT: 29.9, sweep: Math.tan(31.9 * Math.PI / 180), dih: Math.tan(6 * Math.PI / 180), zRef: -6.0, bRef: 2.6, yRef: -1.5, te: [4.3, 4.8, 13.9] }, ht: { b0: 0.5, bT: 11.2, z0: 24.6, y0: 1.6, sweep: Math.tan(33.5 * Math.PI / 180), dih: Math.tan(5 * Math.PI / 180), cr: 5.6, ct: 1.9 }, vt: { y0: 2.0, h: 8.6, z0: 21.5, sweep: Math.tan(38 * Math.PI / 180), cr: 8.6, ct: 2.9 }, eng: { x: 9.6, y: -2.9, z0: -10.5, scale: 1.45 }, wingletScale: 1.5, mask: true, flatFan: false, fair: { yc: -1.5, a: 3.3, b: 1.75 } },
    fdm: { mass: 215000, I: { pitch: 3.0e7, roll: 1.33e7, yaw: 3.9e7 }, S: 443, CBAR: 7.0, B: 61.0, thrust: 374000, engX: 9.6, probes: [[0, -3.0, -29.4], [0, -1.6, 23.5], [9.6, -4.4, -8], [-9.6, -4.4, -8], [29.6, -0.3, 5.5], [-29.6, -0.3, 5.5], [0, -3.1, 0]], belly: [[9.6, -4.4, -8], [-9.6, -4.4, -8], [0, -3.1, 0], [0, -3.0, -25.9], [0, -1.6, 23.5]] },
    cabin: { rows: 33, pitch: 0.84, z0: -21.5, seatXs: [-2.5, -1.97, -1.44, -0.5, 0, 0.5, 1.44, 1.97, 2.5], aisleXs: [-0.97, 0.97], pax: 252, psuXs: [-2.05, 0, 2.05], entryHx: 2.7, crewPostX: 0.97, profile: { sx: 2.98 / 1.98, door1: -24.8, door2: 9.0, aisles: [-0.97, 0.97], centrePSU: true } },
    gse: { belt1z: -20.2, belt2z: 6.6, contz: 3.3, fuelX: 23, fuelz: -3.0, fuelPanelX: 20, fuelPanelZ: 3.4, lavz: 24.5, waterz: 23.0, vanz: -48.9, trainz: -20.4, doorR1z: -24.8, doorR2z: 9.0, catX: 7.7, contX: 7.1, beltX: null, lavX: 4.3, waterX: 8.2 },
  },
  {
    // [Private charter] the little jet: half the airliner's size, a T-tail (ht root sits on
    // the fin top: b0 ~ 0, y0 at the fin's top LE), underwing pods (the parametric pylon is
    // wing-keyed — rear-mounting would need a new pylon path), one front door pair, twelve
    // club seats in a 2-2 cabin. In Free Flight she boards her standard 8 guests; a charter
    // flight narrows the manifest to the contract's party (see setFlightPax below).
    // door1 sits 5.55 behind the nose, like every other type, so the flight deck lands in
    // its proven place (ckSeatZ = door1 - 2.0 by construction of deckDz = noseZ + 18.6).
    id: 'pjet', name: 'Foxheart PJ-1', maker: 'Foxheart private jet', seatsNote: '12 club seats · up to 8 guests',
    desc: 'The little Foxheart jet: twelve club seats, a T-tail and a short-field heart. In Private Charter she flies whoever booked you; in Free Flight she boards 8 guests.',
    shape: {
      noseZ: -10.8, tailZ: 10.4, noseScale: 0.75, tailScale: 0.55, wScale: 1.32 / 1.98, vScale: 1.32 / 2.06, noseTopDrop: 0.06, noseBotRise: 0.04, winPitch: 0.62, winDoors: [-5.25, 5.4],
      doors: [{ id: 'L1', z: -5.25, side: -1 }, { id: 'R1', z: -5.25, side: 1 }],
      door: { w: 0.78, h: 1.72, r: 0.15, y0: -0.55, y1: 1.17 },
      gear: { mainX: 1.9, mainZ: 1.3, hingeY: -0.7, wheelR: 0.42, wheelW: 0.30, track: 0.30, retract: 86 * Math.PI / 180, noseZ: -8.3, noseHingeY: -0.8, noseR: 0.30, noseW: 0.22, wheelY: -2.5, bogie: 0 },
    },
    dim: { length: 21.2, span: 20.4, noseZ: -10.8, tailZ: 10.4, R: 1.32, wheelY: -2.5, mainZ: 1.3, mainX: 1.9, noseGearZ: -8.3, engX: 3.1 },
    deckDz: 7.8,
    // wing: LE root -1.64 / tip 1.92, chords 3.39 / 2.26 / 1.33 (root/kink/tip) — the
    // leading edge never crosses the trailing edge at any station (the a350 lesson).
    vis: { wg: { b0: 0.9, bK: 4.4, bT: 9.3, sweep: Math.tan(23 * Math.PI / 180), dih: Math.tan(4 * Math.PI / 180), zRef: -1.6, bRef: 1.0, yRef: -0.92, te: [1.75, 2.1, 3.25] }, ht: { b0: 0.05, bT: 2.6, z0: 8.45, y0: 3.88, sweep: Math.tan(30 * Math.PI / 180), dih: Math.tan(3 * Math.PI / 180), cr: 2.15, ct: 0.85 }, vt: { y0: 0.85, h: 3.2, z0: 6.3, sweep: Math.tan(38 * Math.PI / 180), cr: 3.6, ct: 1.15 }, eng: { x: 3.1, y: -1.55, z0: -2.7, scale: 0.62 }, wingletScale: 0.8, mask: false, flatFan: false, fair: { yc: -0.63, a: 1.45, b: 0.82 } },
    fdm: { mass: 17500, I: { pitch: 5.2e5, roll: 2.6e5, yaw: 7.4e5 }, S: 46, CBAR: 2.4, B: 20.4, thrust: 67000, engX: 3.1, probes: [[0, -1.15, -9.9], [0, -0.62, 7.6], [3.1, -1.75, -2.2], [-3.1, -1.75, -2.2], [9.1, -0.1, 2.2], [-9.1, -0.1, 2.2], [0, -1.25, 0]], belly: [[3.1, -1.75, -2.2], [-3.1, -1.75, -2.2], [0, -1.25, 0], [0, -1.15, -8.2], [0, -0.62, 7.6]] },
    cabin: { rows: 3, pitch: 1.02, z0: -4.35, seatXs: [-0.78, -0.30, 0.30, 0.78], aisleXs: [0], pax: 8, psuXs: [-0.55, 0.55], entryHx: 1.15, crewPostX: 0.45, profile: { sx: 1.32 / 1.98, door1: -5.25, door2: 3.2, aisles: [0], centrePSU: false } },
    gse: { belt1z: 5.2, belt2z: 7.6, contz: 4.4, fuelX: 9, fuelz: 0.4, fuelPanelX: 7.4, fuelPanelZ: 2.2, lavz: 10.6, waterz: 9.8, vanz: -22, trainz: -5.5, doorR1z: -5.25, doorR2z: 3.2, catX: 4.6, contX: 4.2, beltX: null, lavX: 2.4, waterX: 4.8 },
  },
];

export const TYPE_KEY = 'fox.type';
let cur = TYPES[0];
export function currentType() { return cur; }
export function typeById(id) { return TYPES.find(t => t.id === id) || TYPES[0]; }
export function savedType() { try { return typeById(localStorage.getItem(TYPE_KEY) || 'fox'); } catch (e) { return TYPES[0]; } }
export function saveType(id) { try { localStorage.setItem(TYPE_KEY, id); } catch (e) { } }
// Boot entry (main.js, before any build): installs the type's hull shape and returns the spec.
export function applyType(id) { cur = typeById(id); applyShape(cur.shape); return cur; }

// [Private charter] a charter flight's manifest is the contract's client count, not the
// type's standard load. main.js sets this at flight start (a number for a charter flight,
// null for everything else); the terminal builder reads flightPax() when it sizes the
// departure lounge's flight crowd. With no override set — every airline flight, always —
// flightPax() returns exactly the selected type's cabin.pax, so nothing else can change.
let paxOverride = null;
export function setFlightPax(n) { paxOverride = (n == null ? null : n); }
export function flightPax() { return paxOverride != null ? paxOverride : cur.cabin.pax; }
