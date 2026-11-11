// Terminal hall interior (environment artist): the full passenger flow in one merged, baked-light mesh plus a few
// instanced/transparent extras. Departures: check-in hall (islands with bag-drop belts + scales, backlit signs, kiosks,
// queue stanchions with belt barriers, FIDS) -> security checkpoint (lanes with divest tables, roller conveyors, X-ray
// tunnels with lead curtains, trays, walk-through metal detectors, body scanners, staff) -> passport control booths
// (large airports) -> airside shopping street (duty free, local shops, cafés with seating, washrooms) -> gate lounge
// (linked seating, charging pillars, gate desk + screens, glass wall onto the apron). Arrivals: immigration ->
// baggage claim carousels -> customs exit. Perforated metal ceiling with linear lights, side mezzanines with glass
// balustrades, wayfinding signs, and a polished stone floor that reflects every light, sign and screen (mirrored
// emissive geometry under a slightly transparent floor). Hall frame: x along the façade, y up (floor F), z inward.
import * as THREE from 'three';
import { atmos } from './sky.js';
import { foxHeart } from './aircraft.js';
import { People } from './people.js';
import { ACCENTS } from './interiors.js';
import { identityFor } from './env-identity.js';

const AT = 2048, R = {};
const reg = (n, x, y, w, h) => { R[n] = [x, y, w, h]; };
['stone', 'carpet', 'wood', 'white', 'metal', 'fabric', 'leaf', 'trunk'].forEach((n, i) => reg(n, i * 256, 0, 256, 256));
['glassD', 'counter', 'rubber', 'perf', 'leather', 'steel', 'navy', 'accent'].forEach((n, i) => reg(n, i * 256, 256, 256, 256));
reg('signDep', 0, 512, 1024, 128); reg('signGate', 1024, 512, 512, 128); reg('signSec', 1536, 512, 512, 128);
['shop0', 'shop1', 'shop2', 'shop3'].forEach((n, i) => reg(n, i * 512, 640, 512, 256));
reg('signHello', 0, 896, 1024, 128); reg('signArr', 1024, 896, 512, 128); reg('signBag', 1536, 896, 512, 128);
reg('lattice', 0, 1024, 256, 256); reg('light', 256, 1024, 256, 256); reg('xray', 512, 1024, 256, 256); reg('kiosk', 768, 1024, 128, 256); reg('charge', 896, 1024, 128, 256);
reg('wc', 1024, 1024, 256, 256); reg('logo', 1280, 1024, 256, 256); reg('gateDesk', 1536, 1024, 512, 128); reg('belt', 1536, 1152, 256, 128); reg('scale', 1792, 1152, 256, 128);
['wayG', 'wayS', 'wayP', 'wayWC'].forEach((n, i) => reg(n, i * 512, 1280, 512, 128)); ['wayB', 'wayX', 'passport', 'menu'].forEach((n, i) => reg(n, i * 512, 1408, 512, 128));
['shop4', 'shop5', 'shop6', 'shop7'].forEach((n, i) => reg(n, i * 512, 1536, 512, 256)); ['scan', 'wtmd'].forEach((n, i) => reg(n, i * 256, 1792, 256, 256)); reg('poster0', 512, 1792, 512, 256); reg('poster1', 1024, 1792, 512, 256); reg('tray', 1536, 1792, 256, 256); reg('mirror', 1792, 1792, 256, 256);
const WORDS = { es: ['Salidas · Departures', 'Puerta', 'Llegadas · Arrivals', 'Control de seguridad · Security', 'Reclamo de equipaje · Baggage'], ko: ['출발 Departures', '탑승구 Gate', '도착 Arrivals', '보안검색 Security', '수하물 Baggage'], ja: ['出発 Departures', '搭乗口 Gate', '到着 Arrivals', '保安検査 Security', '手荷物 Baggage'], ar: ['المغادرة · Departures', 'Gate', 'الوصول · Arrivals', 'Security', 'Baggage'] };
const EN = ['Departures', 'Gate', 'Arrivals', 'Security', 'Baggage claim'];

function buildAtlas(icao, gate, dest) {
  const A0 = ACCENTS[icao] || { name: '', accent: '#e8732f', accent2: '#2b6fd6', wood: '#c4a07a', floor: '#e6e3dd', plant: 'tree', hello: 'Welcome', local: ['Café', 'Books'] };
  // per-airport identity (env-identity.js): hall palette + sign colours layered over ACCENTS
  const IH = (identityFor(icao) || {}).hall || {};
  const A = { ...A0, carpetBase: IH.carpet || '#274b4d', wallCol: IH.wall || '#ece4d4', ceilCol: IH.ceil || '#d9d0bf', signBg: IH.signBg || '#151b26', signFg: IH.signFg || '#ffd34d', wayBg: IH.way || IH.signBg || '#20262e', art: IH.art || 'wood' };
  const cv = document.createElement('canvas'); cv.width = cv.height = AT; const c = cv.getContext('2d');
  const tile = (n, f) => { const [x, y, w, h] = R[n]; c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.translate(x, y); f(c, w, h); c.restore(); };
  const noise = (w, h, n, a, col) => { for (let i = 0; i < n; i++) { c.fillStyle = col(Math.random()); c.globalAlpha = a; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5); } c.globalAlpha = 1; };
  const F = (s, w = 600) => `${w} ${s}px "Saira Condensed", "Noto Sans KR", "Noto Sans JP", "Arial Narrow", sans-serif`;
  const txt = (s, x, y, size, col, al = 'left', w = 600) => { c.fillStyle = col; c.font = F(size, w); c.textAlign = al; c.textBaseline = 'middle'; c.fillText(s, x, y); };
  const arrow = (x, y, s, dir, col) => { c.save(); c.translate(x, y); c.rotate(dir); c.fillStyle = col; c.beginPath(); c.moveTo(s, 0); c.lineTo(0, -s * 0.8); c.lineTo(0, -s * 0.3); c.lineTo(-s, -s * 0.3); c.lineTo(-s, s * 0.3); c.lineTo(0, s * 0.3); c.lineTo(0, s * 0.8); c.fill(); c.restore(); };
  const man = (x, y, s, col, skirt) => { c.fillStyle = col; c.beginPath(); c.arc(x, y - s * 0.75, s * 0.16, 0, 7); c.fill(); if (skirt) { c.beginPath(); c.moveTo(x - s * 0.3, y + s * 0.25); c.lineTo(x + s * 0.3, y + s * 0.25); c.lineTo(x + s * 0.14, y - s * 0.52); c.lineTo(x - s * 0.14, y - s * 0.52); c.fill(); } else c.fillRect(x - s * 0.2, y - s * 0.52, s * 0.4, s * 0.62); c.fillRect(x - s * 0.17, y + 0.1 * s, s * 0.13, s * 0.55); c.fillRect(x + s * 0.04, y + 0.1 * s, s * 0.13, s * 0.55); };
  const W = WORDS[A.lang] || EN;
  tile('stone', (c, w, h) => { c.fillStyle = A.floor; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) { const gx = Math.random() * w, gy = Math.random() * h, g = c.createRadialGradient(gx, gy, 2, gx, gy, 30 + Math.random() * 60); g.addColorStop(0, Math.random() < 0.6 ? 'rgba(196,164,120,0.10)' : 'rgba(120,116,108,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
    noise(w, h, 5200, 0.28, r => r < 0.34 ? '#8f867a' : r < 0.62 ? '#ffffff' : r < 0.8 ? '#6f6a62' : r < 0.92 ? '#b08d57' : A.accent);
    for (let i = 0; i < 700; i++) { c.globalAlpha = 0.22 + Math.random() * 0.3; c.fillStyle = ['#7d7466', '#efe9dc', '#a98f63'][i % 3]; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3.5, 1.5 + Math.random() * 2.5); } c.globalAlpha = 1;
    for (let i = 0; i < 5; i++) { c.strokeStyle = 'rgba(150,138,120,.10)'; c.lineWidth = 1 + Math.random() * 1.5; c.beginPath(); c.moveTo(Math.random() * w, 0); c.bezierCurveTo(Math.random() * w, h * 0.3, Math.random() * w, h * 0.6, Math.random() * w, h); c.stroke(); }
    c.strokeStyle = 'rgba(96,84,68,.5)'; c.lineWidth = 2.5; c.strokeRect(0, 0, w, h); c.strokeStyle = 'rgba(176,141,87,.55)'; c.lineWidth = 1; c.strokeRect(4, 4, w - 8, h - 8); });
  tile('carpet', (c, w, h) => { c.fillStyle = A.carpetBase; c.fillRect(0, 0, w, h); for (let i = -w; i < w * 2; i += 32) { c.strokeStyle = (i / 32) % 2 ? A.accent : '#c9a35f'; c.globalAlpha = 0.30; c.lineWidth = 3; c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); } c.globalAlpha = 1; noise(w, h, 3800, 0.16, r => r < 0.55 ? '#12262a' : r < 0.85 ? '#7fae9f' : '#d9b878'); });
  tile('wood', (c, w, h) => { c.fillStyle = A.wood; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(90,58,28,${0.05 + Math.random() * 0.11})`; c.fillRect(0, y, w, 1.5); } for (let i = 0; i < 22; i++) { c.strokeStyle = `rgba(70,44,20,${0.05 + Math.random() * 0.09})`; c.lineWidth = 1 + Math.random() * 2; c.beginPath(); const y0 = Math.random() * h; c.moveTo(0, y0); c.bezierCurveTo(w * 0.3, y0 + 4 - Math.random() * 8, w * 0.7, y0 + 4 - Math.random() * 8, w, y0); c.stroke(); } for (let y = 0; y < h; y += 64) { c.fillStyle = 'rgba(58,38,18,.45)'; c.fillRect(0, y, w, 2); c.fillStyle = 'rgba(255,236,200,.20)'; c.fillRect(0, y + 2, w, 1); } });
  tile('white', (c, w, h) => { c.fillStyle = A.wallCol; c.fillRect(0, 0, w, h); noise(w, h, 1800, 0.05, r => r < 0.5 ? '#8a7c66' : '#ffffff'); c.fillStyle = 'rgba(120,104,80,.20)'; c.fillRect(0, h * 0.52, w, 2); c.fillStyle = 'rgba(90,78,60,.4)'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h); c.fillStyle = 'rgba(255,252,244,.5)'; c.fillRect(0, 2, w, 1); c.fillRect(0, h * 0.52 + 2, w, 1); });
  tile('metal', (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#d0d4d9'); g.addColorStop(1, '#9aa1aa'); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`; c.fillRect(0, y, w, 1); } });
  tile('fabric', (c, w, h) => { c.fillStyle = A.accent2; c.fillRect(0, 0, w, h); noise(w, h, 3000, 0.22, r => r < 0.5 ? '#000' : '#fff'); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, h - 10, w, 10); });
  tile('leaf', (c, w, h) => { c.fillStyle = '#2f6b34'; c.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { c.fillStyle = ['#3f8a3f', '#245a2a', '#4e9a48'][i % 3]; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 30, 8, Math.random() * 3, 0, 7); c.fill(); } });
  tile('trunk', (c, w, h) => { c.fillStyle = '#7b5d3f'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 14) { c.fillStyle = 'rgba(40,25,10,.4)'; c.fillRect(0, y, w, 4); } });
  tile('glassD', (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a4a58'); g.addColorStop(1, '#1a232c'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(0, h * 0.2); c.lineTo(w * 0.4, 0); c.lineTo(w * 0.55, 0); c.lineTo(0, h * 0.35); c.fill(); });
  tile('counter', (c, w, h) => { c.fillStyle = '#20283a'; c.fillRect(0, 0, w, h); c.fillStyle = A.accent; c.fillRect(0, h * 0.62, w, 10); foxHeart(c, w / 2, h * 0.32, 44); txt('NICOFOXHEART AIR', w / 2, h * 0.86, 22, '#fff', 'center', 700); });
  tile('rubber', (c, w, h) => { c.fillStyle = '#3b3e44'; c.fillRect(0, 0, w, h); c.fillStyle = '#2c2f34'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 6, h); });
  tile('perf', (c, w, h) => { c.fillStyle = A.ceilCol; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(96,86,70,.4)'; for (let y = 4; y < h; y += 8) for (let x = (y / 8 % 2) * 4 + 4; x < w; x += 8) c.fillRect(x, y, 2, 2); c.fillStyle = 'rgba(84,74,60,.5)'; c.fillRect(0, 0, w, 3); c.fillRect(0, 0, 3, h); c.fillStyle = 'rgba(255,250,238,.35)'; c.fillRect(0, 3, w, 1); });
  tile('leather', (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#96683c'); g.addColorStop(0.55, '#7d5230'); g.addColorStop(1, '#5f3c22'); c.fillStyle = g; c.fillRect(0, 0, w, h); noise(w, h, 2200, 0.10, r => r < 0.5 ? '#3c2412' : '#e8b988'); c.fillStyle = 'rgba(46,28,14,.5)'; c.fillRect(0, h - 8, w, 3); c.fillStyle = 'rgba(255,220,170,.25)'; c.fillRect(0, 6, w, 2); });
  tile('steel', (c, w, h) => { c.fillStyle = '#7d848c'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 2) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`; c.fillRect(x, 0, 1, h); } });
  tile('navy', (c, w, h) => { c.fillStyle = '#1b2747'; c.fillRect(0, 0, w, h); });
  tile('accent', (c, w, h) => { c.fillStyle = A.accent; c.fillRect(0, 0, w, h); });
  const sign = (n, text, bg, fg, icon) => tile(n, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); const x0 = h * (icon ? 1.15 : 0.4); let sz = Math.round(h * 0.42); c.font = F(sz, 600); const tw = c.measureText(text).width; if (x0 + tw > w - 14) sz = Math.max(13, Math.floor(sz * (w - 14 - x0) / tw)); txt(text, x0, h / 2 + 2, sz, fg); if (icon) icon(c, w, h); });
  const plane = (c, w, h) => { c.fillStyle = A.signFg; c.save(); c.translate(h * 0.55, h / 2); c.rotate(-0.6); c.fillRect(-h * 0.3, -h * 0.05, h * 0.6, h * 0.1); c.fillRect(-h * 0.08, -h * 0.28, h * 0.14, h * 0.56); c.fillRect(-h * 0.3, -h * 0.13, h * 0.08, h * 0.26); c.restore(); };
  sign('signDep', W[0], A.signBg, A.signFg, plane); sign('signGate', `${W[1]} ${gate}  ·  ${dest}`, A.signBg, '#ffffff'); sign('signSec', W[3], A.signBg, A.signFg, (c, w, h) => arrow(h * 0.55, h / 2, h * 0.3, -Math.PI / 2, A.signFg));
  sign('signHello', A.hello, A.accent, '#ffffff'); sign('signArr', W[2], A.signBg, A.signFg, plane); sign('signBag', W[4], A.signBg, A.signFg, (c, w, h) => { c.fillStyle = A.signFg; c.fillRect(h * 0.32, h * 0.38, h * 0.46, h * 0.36); c.fillRect(h * 0.45, h * 0.28, h * 0.2, h * 0.1); });
  const way = (n, text, ar, icon) => tile(n, (c, w, h) => { c.fillStyle = A.wayBg; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd34d'; c.fillRect(0, 0, w, 6); if (icon) icon(c, w, h); let sz = 46; c.font = F(sz, 600); const avail = w - 120 - (ar != null ? 92 : 16), tw = c.measureText(text).width; if (tw > avail) sz = Math.max(15, Math.floor(sz * avail / tw)); txt(text, 120, h / 2 + 3, sz, '#f3f4f5'); if (ar != null) arrow(w - 52, h / 2, 28, ar, '#ffd34d'); });
  way('wayG', `${W[1]}s 1–30`, 0, plane); way('wayS', W[3], -Math.PI / 2, (c, w, h) => arrow(56, h / 2, 26, -Math.PI / 2, '#ffd34d')); way('wayP', 'Passport control', -Math.PI / 2, (c, w, h) => { c.fillStyle = '#ffd34d'; c.fillRect(34, 34, 46, 60); c.fillStyle = '#20262e'; c.beginPath(); c.arc(57, 58, 12, 0, 7); c.fill(); });
  way('wayWC', 'Toilets', null, (c, w, h) => { man(50, 72, 64, '#f3f4f5'); man(88, 72, 64, '#f3f4f5', true); }); way('wayB', W[4], -Math.PI / 2, (c, w, h) => { c.fillStyle = '#ffd34d'; c.fillRect(30, 46, 56, 44); c.fillRect(46, 34, 24, 12); }); way('wayX', 'Exit · Nothing to declare', -Math.PI / 2, (c, w, h) => { c.fillStyle = '#3cb371'; c.fillRect(30, 30, 64, 68); });
  tile('passport', (c, w, h) => { c.fillStyle = '#1d3557'; c.fillRect(0, 0, w, h); txt('ALL PASSPORTS', w / 2, h * 0.4, 48, '#fff', 'center', 700); txt('Have your boarding pass ready', w / 2, h * 0.78, 26, '#cfd8e3', 'center'); });
  tile('menu', (c, w, h) => { c.fillStyle = '#1c1a17'; c.fillRect(0, 0, w, h); txt(A.local[0], 16, 26, 30, '#f3d9a4', 'left', 700); ['Espresso  2.90', 'Flat white  3.80', 'Croissant  2.50', 'Sandwich  6.90'].forEach((s, i) => txt(s, 16 + (i % 2) * 250, 66 + Math.floor(i / 2) * 36, 24, '#efe7da')); });
  const shop = (n, name, col, kind) => tile(n, (c, w, h) => { c.fillStyle = '#241f1b'; c.fillRect(0, 0, w, h); c.fillStyle = col; c.fillRect(0, 0, w, 64); c.fillStyle = 'rgba(255,214,140,.85)'; c.fillRect(0, 64, w, 3); txt(name, w / 2, 34, 38, '#fff', 'center', 700);
    const g = c.createLinearGradient(0, 76, 0, h); if (kind === 'cafe') { g.addColorStop(0, '#f4e3c2'); g.addColorStop(0.75, '#c99a67'); g.addColorStop(1, '#8a5f3a'); } else { g.addColorStop(0, '#f7efdd'); g.addColorStop(0.75, '#d9c39c'); g.addColorStop(1, '#a68d64'); } c.fillStyle = g; c.fillRect(14, 76, w - 28, h - 88);
    c.fillStyle = 'rgba(60,40,22,.28)'; c.fillRect(14, h - 34, w - 28, 22);
    if (kind === 'cafe') { c.fillStyle = '#4a3220'; c.fillRect(34, 178, w - 68, 62); c.fillStyle = '#6d4a2d'; c.fillRect(34, 178, w - 68, 8); for (let i = 0; i < 6; i++) { c.fillStyle = ['#efdcba', '#96683c', '#f6f2ea'][i % 3]; c.fillRect(54 + i * 68, 128, 38, 34); } c.fillStyle = 'rgba(255,196,110,.45)'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(70 + i * 124, 92, 30, 9, 0, 0, 7); c.fill(); } for (let i = 0; i < 4; i++) { c.fillStyle = '#2c1e12'; c.fillRect(66 + i * 124, 76, 3, 12); c.fillStyle = '#ffca7a'; c.beginPath(); c.arc(67 + i * 124, 92, 4.5, 0, 7); c.fill(); } }
    else { const pal = ['#a03a30', '#33648c', '#3f7d54', '#c07f24', '#6d4a7a', '#ddd6c4', '#37424e']; for (let r2 = 0; r2 < 3; r2++) { const y0 = 96 + r2 * 48; c.fillStyle = 'rgba(74,54,32,.55)'; c.fillRect(24, y0 + 38, w - 48, 4); for (let i = 0; i < 9; i++) { c.fillStyle = pal[(i * 5 + r2 * 3) % 7]; c.globalAlpha = 0.92; c.fillRect(28 + i * 52, y0 + 4, 34, 34); c.globalAlpha = 1; c.fillStyle = 'rgba(255,255,255,.20)'; c.fillRect(28 + i * 52, y0 + 4, 34, 7); } } c.fillStyle = 'rgba(255,205,120,.32)'; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(56 + i * 102, 84, 34, 8, 0, 0, 7); c.fill(); } }
    c.fillStyle = 'rgba(30,24,20,.88)'; for (let x = 14; x <= w - 14; x += 62) c.fillRect(x, 76, 5, h - 88); c.fillRect(14, 76, w - 28, 5); c.fillRect(14, 128, w - 28, 4); });
  shop('shop0', A.local[0], A.accent, 'cafe'); shop('shop1', 'Duty Free', '#1b2747'); shop('shop2', A.local[1], A.accent2); shop('shop3', 'Fox & Friends', '#e8732f');
  shop('shop4', 'News & Books', '#2f5d50'); shop('shop5', 'Fragrance & Beauty', '#7a3b69'); shop('shop6', 'Kitchen & Bar', '#6b4b2a', 'cafe'); shop('shop7', 'Tech & Travel', '#2b2f36');
  tile('lattice', (c, w, h) => { c.fillStyle = A.wood; c.fillRect(0, 0, w, h); c.fillStyle = '#3a2a1c'; for (let i = 0; i < w; i += 32) { c.fillRect(i + 13, 0, 6, h); c.fillRect(0, i + 13, w, 6); } });
  tile('light', (c, w, h) => { c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, h); });
  tile('xray', (c, w, h) => { c.fillStyle = '#c9ced3'; c.fillRect(0, 0, w, h); c.fillStyle = '#2b3036'; c.fillRect(w * 0.22, h * 0.35, w * 0.56, h * 0.55); for (let x = w * 0.24; x < w * 0.76; x += 10) { c.fillStyle = 'rgba(70,80,90,.9)'; c.fillRect(x, h * 0.36, 7, h * 0.53); } c.fillStyle = '#ffd34d'; c.fillRect(0, h * 0.9, w, h * 0.1); txt('X-RAY', w / 2, h * 0.18, 30, '#3a4048', 'center', 700); });
  tile('kiosk', (c, w, h) => { c.fillStyle = '#e9ecef'; c.fillRect(0, 0, w, h); c.fillStyle = '#0f2a4a'; c.fillRect(10, 18, w - 20, h * 0.45); c.fillStyle = A.accent; c.fillRect(18, 30, w - 36, 22); c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) c.fillRect(22, 66 + i * 18, w - 44, 10); c.fillStyle = '#20262e'; c.fillRect(24, h * 0.7, w - 48, 8); });
  tile('charge', (c, w, h) => { c.fillStyle = '#2b3138'; c.fillRect(0, 0, w, h); c.fillStyle = A.accent; c.fillRect(0, 0, w, 12); c.fillStyle = '#ffd34d'; c.beginPath(); c.moveTo(70, 40); c.lineTo(50, 82); c.lineTo(66, 82); c.lineTo(56, 118); c.lineTo(82, 70); c.lineTo(66, 70); c.fill(); for (let i = 0; i < 4; i++) { c.fillStyle = '#0d0f12'; c.fillRect(30 + (i % 2) * 40, 150 + Math.floor(i / 2) * 36, 28, 20); } });
  tile('wc', (c, w, h) => { c.fillStyle = '#20262e'; c.fillRect(0, 0, w, h); man(86, 150, 110, '#f3f4f5'); man(170, 150, 110, '#f3f4f5', true); c.fillStyle = '#ffd34d'; c.fillRect(0, h - 14, w, 14); });
  tile('logo', (c, w, h) => { c.fillStyle = '#1b2747'; c.fillRect(0, 0, w, h); foxHeart(c, w / 2, h / 2, 90); });
  tile('gateDesk', (c, w, h) => { c.fillStyle = '#0d1420'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd34d'; c.font = '700 44px "B612 Mono", monospace'; c.textBaseline = 'middle'; c.fillText(`${gate}`, 18, 40); txt(`NF 412  ${dest}`, 130, 40, 34, '#fff'); txt('BOARDING', 130, 92, 34, '#55e08f'); });
  tile('belt', (c, w, h) => { c.fillStyle = '#222'; c.fillRect(0, 0, w, h); c.fillStyle = '#333'; for (let x = 0; x < w; x += 20) c.fillRect(x, 0, 10, h); });
  tile('scale', (c, w, h) => { c.fillStyle = '#2b3036'; c.fillRect(0, 0, w, h); c.fillStyle = '#0b0f0b'; c.fillRect(20, 30, w - 40, 56); c.fillStyle = '#7dff7a'; c.font = '700 40px "B612 Mono", monospace'; c.textBaseline = 'middle'; c.fillText('18.4 kg', 34, 60); });
  tile('scan', (c, w, h) => { c.fillStyle = '#d9dee3'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(80,140,200,.45)'; c.fillRect(30, 20, w - 60, h - 40); c.fillStyle = '#4b5563'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14); });
  tile('wtmd', (c, w, h) => { c.fillStyle = '#b8bec5'; c.fillRect(0, 0, w, h); c.fillStyle = '#20262e'; c.fillRect(w * 0.3, 10, w * 0.4, 30); c.fillStyle = '#55e08f'; c.fillRect(w * 0.35, 18, w * 0.12, 14); c.fillStyle = '#e74c3c'; c.fillRect(w * 0.53, 18, w * 0.12, 14); });
  const poster = (n, t1, t2, c1, c2) => tile(n, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(w * 0.78, h * 0.35, 70, 0, 7); c.fill(); txt(t1, 26, h * 0.62, 54, '#fff', 'left', 700); txt(t2, 28, h * 0.82, 24, 'rgba(255,255,255,.85)'); });
  poster('poster0', 'Discover ' + (A.name || 'the city'), 'Explore more with Nicofoxheart Air', A.accent, '#1b2747'); poster('poster1', 'Fly further', 'New routes every season', '#e8732f', '#6b2c1a');
  tile('tray', (c, w, h) => { c.fillStyle = '#3b4148'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2f35'; c.fillRect(20, 20, w - 40, h - 40); });
  tile('mirror', (c, w, h) => { c.fillStyle = '#9fb0bd'; c.fillRect(0, 0, w, h); });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex, accent: A };
}
function atlasMat(tex, o = {}) {
  const m = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, ...o });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aTile; varying vec4 vTile;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvTile = aTile;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vTile;').replace('#include <map_fragment>', 'vec2 tuv = vTile.xy + clamp(fract(vMapUv), 0.004, 0.996) * vTile.zw; vec4 sampledDiffuseColor = texture2D(map, tuv); diffuseColor *= sampledDiffuseColor;');
  };
  m.userData.key = 'hallAtlas' + (o.transparent ? 'T' : ''); return atmos(m);
}
class Builder {
  constructor(light) { this.P = []; this.N = []; this.U = []; this.C = []; this.T = []; this.I = []; this.light = light; }
  tileOf(n) { const [x, y, w, h] = R[n]; const p = 3; return [(x + p) / AT, 1 - (y + h - p) / AT, (w - 2 * p) / AT, (h - 2 * p) / AT]; }
  quad(a, b, c, d, n, tile, u0, v0, u1, v1, tint = [1, 1, 1], emissive = 0) {
    const base = this.P.length / 3; const T = this.tileOf(tile);
    for (const [p, uv] of [[a, [u0, v0]], [b, [u1, v0]], [c, [u1, v1]], [d, [u0, v1]]]) { this.P.push(p.x, p.y, p.z); this.N.push(n.x, n.y, n.z); this.U.push(uv[0], uv[1]); this.T.push(...T); const L = emissive ? emissive : this.light(p, n); const c3 = Array.isArray(L) ? L : [L, L, L]; this.C.push(c3[0] * tint[0], c3[1] * tint[1], c3[2] * tint[2]); }
    this.I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  box(cx, cy, cz, sx, sy, sz, tile, o = {}) {
    const ry = o.ry || 0, cs = Math.cos(ry), sn = Math.sin(ry), rep = o.rep ?? 0, tint = o.tint || [1, 1, 1];
    const V = (x, y, z) => new THREE.Vector3(cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs), Nr = (x, y, z) => new THREE.Vector3(x * cs + z * sn, y, -x * sn + z * cs);
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, faces = o.faces || 'pxnxpynypznz', uv = (w, h) => rep ? [w / rep, h / rep] : [1, 1];
    const t = f => (o.tiles && o.tiles[f]) || tile, em = f => (o.emit && o.emit[f]) || 0;
    if (faces.includes('pz')) { const [a, b] = uv(sx, sy); this.quad(V(-hx, -hy, hz), V(hx, -hy, hz), V(hx, hy, hz), V(-hx, hy, hz), Nr(0, 0, 1), t('pz'), 0, 0, a, b, tint, em('pz')); }
    if (faces.includes('nz')) { const [a, b] = uv(sx, sy); this.quad(V(hx, -hy, -hz), V(-hx, -hy, -hz), V(-hx, hy, -hz), V(hx, hy, -hz), Nr(0, 0, -1), t('nz'), 0, 0, a, b, tint, em('nz')); }
    if (faces.includes('px')) { const [a, b] = uv(sz, sy); this.quad(V(hx, -hy, hz), V(hx, -hy, -hz), V(hx, hy, -hz), V(hx, hy, hz), Nr(1, 0, 0), t('px'), 0, 0, a, b, tint, em('px')); }
    if (faces.includes('nx')) { const [a, b] = uv(sz, sy); this.quad(V(-hx, -hy, -hz), V(-hx, -hy, hz), V(-hx, hy, hz), V(-hx, hy, -hz), Nr(-1, 0, 0), t('nx'), 0, 0, a, b, tint, em('nx')); }
    if (faces.includes('py')) { const [a, b] = uv(sx, sz); this.quad(V(-hx, hy, hz), V(hx, hy, hz), V(hx, hy, -hz), V(-hx, hy, -hz), Nr(0, 1, 0), t('py'), 0, 0, a, b, tint, em('py')); }
    if (faces.includes('ny')) { const [a, b] = uv(sx, sz); this.quad(V(-hx, -hy, -hz), V(hx, -hy, -hz), V(hx, -hy, hz), V(-hx, -hy, hz), Nr(0, -1, 0), t('ny'), 0, 0, a, b, tint, em('ny')); }
  }
  geometry() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3)); g.setAttribute('aTile', new THREE.Float32BufferAttribute(this.T, 4)); g.setIndex(this.I); g.computeBoundingSphere(); return g; }
}
class Walk { // same data shape as interiors.js WalkMap (onfoot merges zones + blocks)
  constructor() { this.zones = []; this.blocks = []; }
  rect(c, u, hl, hw, y0, y1 = y0, tag = '') { this.zones.push({ c: c.clone(), u: u.clone().setY(0).normalize(), hl, hw, y0, y1, tag }); }
  block(c, u, hl, hw) { this.blocks.push({ c: c.clone(), u: u.clone().setY(0).normalize(), hl, hw }); }
}
function fidsCanvas(o, title) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 320; const c = cv.getContext('2d');
  c.fillStyle = '#081019'; c.fillRect(0, 0, 1024, 320); c.fillStyle = '#12304f'; c.fillRect(0, 0, 1024, 52); c.fillStyle = '#ffd34d'; c.font = '700 30px "B612 Mono", monospace'; c.textBaseline = 'middle'; c.fillText(title, 20, 27);
  c.fillStyle = '#e8edf5'; c.font = '22px "B612 Mono", monospace'; c.fillText(new Date().toUTCString().slice(17, 22) + ' UTC', 860, 27);
  c.fillStyle = '#8e9bb1'; c.font = '18px "B612 Mono", monospace'; c.fillText('TIME   FLIGHT   ' + (o.mode === 'dep' ? 'DESTINATION' : 'FROM') + '              GATE   STATUS', 20, 74);
  const rows = o.board || []; c.font = '23px "B612 Mono", monospace';
  rows.slice(0, 7).forEach((r, i) => { const y = 108 + i * 30; c.fillStyle = i % 2 ? '#0e1724' : '#0b131e'; c.fillRect(10, y - 21, 1004, 28); c.fillStyle = '#e8edf5'; c.fillText(r.time, 20, y); c.fillText(r.flight, 110, y); c.fillText(r.city.slice(0, 22), 236, y); c.fillText(String(r.gate), 610, y); c.fillStyle = r.status === 'BOARDING' ? '#55e08f' : r.status === 'DELAYED' ? '#ff5d5d' : r.status === 'LANDED' ? '#66d7ea' : '#ffd34d'; c.fillText(r.status, 700, y); });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// opts: { icao, mode: 'dep'|'arr', gate, dest, O (world façade point, y = apron), n (unit toward the apron), depth, doorX, board }
export function buildHall(opts, rnd) {
  const { icao, mode, gate, dest } = opts, dep = mode === 'dep';
  const FLIGHT_N = opts.flightN || 121; // [Aircraft types] the selected type's passenger count (interiors.js buildCabin load)
  const at = buildAtlas(icao, gate, dest), A = at.accent; const mat = atlasMat(at.tex), floorMat = atlasMat(at.tex, { transparent: true, opacity: 0.9, depthWrite: true });
  const F = 4.6, rawD = Math.max(40, (opts.depth || 40) - 4), big = rawD >= 60;
  const D = Math.max(46, rawD) + (big ? 6 : 4), HW = big ? 58 : 46, HC = 11, dx = opts.doorX;
  // ---- terminal layout (Terminal rebuild): a SEQUENCE of rooms, sized by airport class.
  // z runs from the apron glass (0) to the landside wall (D): gate pier -> airside market ->
  // [passport] -> security room -> check-in hall. Ceiling heights step 7.2 / 11 / 4.3 / 15|13
  // so every room reads as its own volume, and security is a real walled room whose only
  // openings are its lanes (see the wall runs in the security section).
  const ceilPier = 7.2, ceilAir = 11, ceilSec = dep ? 4.3 : 5.2, ceilLand = big ? 15 : 13, Hmax = ceilLand;
  const zS = 23, sDepth = big ? 9 : 6, zPierEnd = 17;
  const zP = big ? zS + sDepth + 1.6 : 0; // passport booth line (large airports)
  const z0sec = big ? zP + 2.8 : 25.4, z1sec = Math.min(z0sec + (big ? 7 : 6), D * 0.68 - 0.6), zm = (z0sec + z1sec) / 2;
  const wallOut = z0sec - 1.0, wallIn = z1sec + 1.0; // security room wall planes (airside exit / landside entry)
  const lanes = [0, -6.5, 6.5, -19.5, 19.5, -26, 26].filter(x => Math.abs(x) < HW - 9);
  const qRows = dep ? (big ? 3 : 1) : 0, qz = z1sec + 1.4;
  const ckZ = Math.min(D - 5, Math.max(qz + qRows * 1.3 + 4.5, D * 0.82));
  const ckIslands = big ? [-52, -26, 0, 26, 52] : [-26, 0, 26];
  const kioskXZ = [[-12, ckZ - 5.5], [-9.5, ckZ - 5.5], [18, ckZ - 5.5], [20.5, ckZ - 5.5], ...(big ? [[-38, ckZ - 5.5], [38, ckZ - 5.5]] : [])];
  const ceilAt = z => z < zPierEnd ? ceilPier : z < wallOut ? ceilAir : z < wallIn ? ceilSec : ceilLand;
  const zAxis = new THREE.Vector3(-opts.n.x, 0, -opts.n.z).normalize(), xAxis = new THREE.Vector3(0, 1, 0).cross(zAxis);
  const O = opts.O.clone(); const W = (x, y, z) => new THREE.Vector3(O.x + xAxis.x * x + zAxis.x * z, O.y + y, O.z + xAxis.z * x + zAxis.z * z);
  const group = new THREE.Group(); group.position.copy(O); group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, new THREE.Vector3(0, 1, 0), zAxis));
  // baked light: daylight from the glass wall, skylights down the middle, ceiling line lights, darker corners and under counters
  const light = (p, n) => { const winK = Math.exp(-Math.max(0, p.z) / 17), up = Math.max(0, n.y) * 0.14, low = Math.abs(n.y) < 0.5 ? -0.14 * Math.exp(-(p.y - F) / 0.7) : 0, down = Math.max(0, -n.y) * -0.08, corner = -0.08 * Math.exp(-(HW - Math.abs(p.x)) / 3) - 0.06 * Math.exp(-(D - p.z) / 3), sky = 0.05 * Math.exp(-p.x * p.x / 300);
    const L = 0.74 + winK * 0.34 + up + low + down + corner + sky; let rgb = [L * (1.03 + 0.09 * winK), L * (1.0 + 0.015 * winK), L * (0.95 - 0.07 * winK)];
    // room character (Terminal rebuild): the check-in hall gets daylight pools under its three
    // skylight strips, the security room is dimmer and warmer, the gate pier stays soft
    if (p.z > wallIn) { const pool = Math.exp(-Math.pow(p.x / 3.6, 2)) + Math.exp(-Math.pow((p.x - HW / 2) / 3.6, 2)) + Math.exp(-Math.pow((p.x + HW / 2) / 3.6, 2)); const g = 0.16 * pool * (n.y > 0.5 ? 1 : n.y < -0.5 ? 0.3 : 0.45); rgb = [rgb[0] + g * 1.05, rgb[1] + g, rgb[2] + g * 0.88]; }
    else if (p.z > wallOut) rgb = [rgb[0] * 0.92, rgb[1] * 0.86, rgb[2] * 0.73];
    else if (p.z < zPierEnd) rgb = [rgb[0] * 0.99, rgb[1] * 0.97, rgb[2] * 0.94];
    return rgb; };
  const B = new Builder(light), BF = new Builder(light), BM = new Builder(() => 1); // main, polished floor, mirrored brights
  const wm = new Walk(); const wc = (x, z) => W(x, 0, z); const blk = (x, z, hx, hz) => wm.block(wc(x, z), xAxis, hx, hz);
  const glow = (cx, cy, cz, sx, sy, sz, tile, o) => { B.box(cx, cy, cz, sx, sy, sz, tile, o); const sw = s => s && s.replace(/py|ny/g, m => m === 'py' ? 'ny' : 'py'); const swap = obj => obj && Object.fromEntries(Object.entries(obj).map(([k, v]) => [k === 'py' ? 'ny' : k === 'ny' ? 'py' : k, v]));
    const emit = swap(o.emit), k = o.mirrorK ?? 1.6; BM.box(cx, 2 * F - cy, cz, sx, sy, sz, tile, { ...o, faces: sw(o.faces), tiles: swap(o.tiles), emit: emit && Object.fromEntries(Object.entries(emit).map(([a, v]) => [a, v * k])) }); };
  const sign = (name, x, y, z, w, h, ry = 0, e = 1.25) => glow(x, y, z, w, h, 0.12, 'steel', { ry, tiles: { pz: name }, emit: { pz: e }, faces: 'pznz' });
  const hang = (name, x, y, z, w, h, ry = 0, ceil = ceilAir) => { glow(x, y, z, w, h, 0.12, 'steel', { ry, tiles: { pz: name, nz: name }, emit: { pz: 1.25, nz: 1.25 }, faces: 'pznzpyny' }); for (const s of [-1, 1]) B.box(x + Math.cos(ry) * s * w * 0.4, (y + F + ceil) / 2 + h / 4, z - Math.sin(ry) * s * w * 0.4, 0.03, Math.max(0.1, F + ceil - y - h / 2), 0.03, 'steel'); };
  // ---- floor: polished stone (reflective, separate mesh), carpet at the gate
  BF.box(0, F - 0.15, D / 2, HW * 2, 0.3, D, 'stone', { faces: 'py', rep: 2 });
  B.box(0, F + 0.006, 8, HW * 2 - 2, 0.01, 14, 'carpet', { faces: 'py', rep: 3 });
  // ---- glass wall onto the apron: sill, mullions, transoms
  B.box(0, F + 0.25, 0.1, HW * 2, 0.5, 0.2, 'steel', { faces: 'pxnxpypz' });
  for (let x = -HW; x <= HW; x += 3) if (Math.abs(x - dx) > 2.2) B.box(x, F + HC / 2, 0.05, 0.14, HC, 0.3, 'steel');
  for (const y of [3.3, 7.4]) B.box(0, F + y, 0.05, HW * 2, 0.1, 0.24, 'steel'); B.box(0, F + HC, 0.08, HW * 2, 0.4, 0.4, 'steel');
  // ---- walls rise to the tallest room; every room gets its own ceiling (Terminal rebuild)
  B.box(-HW, F + Hmax / 2, D / 2, 0.4, Hmax, D, 'white', { faces: 'px', rep: 3 }); B.box(HW, F + Hmax / 2, D / 2, 0.4, Hmax, D, 'white', { faces: 'nx', rep: 3 }); B.box(0, F + Hmax / 2, D, HW * 2, Hmax, 0.4, 'white', { faces: 'nz', rep: 3 });
  const slab = (z0, z1, h, tint) => B.box(0, F + h + 0.1, (z0 + z1) / 2, HW * 2, 0.2, z1 - z0, 'white', { faces: 'ny', rep: 3, tint });
  slab(0.9, zPierEnd, ceilPier); // gate pier: a low coffered ceiling, timber beams + warm light panels
  for (let x = -HW + 6; x < HW - 4; x += 6) B.box(x, F + ceilPier - 0.22, zPierEnd / 2, 0.28, 0.45, zPierEnd - 1.4, 'wood', { faces: 'nypznz' });
  for (let x = -HW + 8; x < HW - 6; x += 12) for (const z of [4.2, 9.2, 14.2]) glow(x, F + ceilPier - 0.03, z, 2.6, 0.05, 0.8, 'light', { faces: 'ny', emit: { ny: 1.55 }, mirrorK: 1.2 });
  slab(zPierEnd, wallOut, ceilAir); // airside market: folded-plate ribs ride under the slab
  for (let z = zPierEnd + 1.4; z < wallOut - 1.2; z += 3.2) { const zm2 = z + 1.6, n1 = new THREE.Vector3(0, -0.88, 0.47).normalize(), n2 = new THREE.Vector3(0, -0.88, -0.47).normalize();
    B.quad(new THREE.Vector3(-HW, F + ceilAir - 0.05, z), new THREE.Vector3(HW, F + ceilAir - 0.05, z), new THREE.Vector3(HW, F + ceilAir - 0.62, zm2), new THREE.Vector3(-HW, F + ceilAir - 0.62, zm2), n1, 'white', 0, 0, HW / 1.5, 0.55);
    B.quad(new THREE.Vector3(-HW, F + ceilAir - 0.62, zm2), new THREE.Vector3(HW, F + ceilAir - 0.62, zm2), new THREE.Vector3(HW, F + ceilAir - 0.05, z + 3.2), new THREE.Vector3(-HW, F + ceilAir - 0.05, z + 3.2), n2, 'white', 0, 0, HW / 1.5, 0.55);
    glow(0, F + ceilAir - 0.68, zm2, HW * 2 - 6, 0.04, 0.34, 'light', { faces: 'ny', emit: { ny: 1.5 }, mirrorK: 1.1 }); }
  B.box(0, F + (ceilPier + ceilAir) / 2, zPierEnd, HW * 2, ceilAir - ceilPier, 0.3, 'white', { faces: 'pznz', rep: 3 }); // bulkhead between pier and market
  slab(wallOut, wallIn, ceilSec, [0.6, 0.56, 0.5]); // security: low, warm and baffled
  for (let z = wallOut + 0.7; z < wallIn - 0.4; z += 0.95) B.box(0, F + ceilSec - 0.26, z, HW * 2, 0.52, 0.09, 'wood', { faces: 'pznz' });
  for (let z = wallOut + 1.2; z < wallIn - 0.8; z += 1.9) glow(0, F + ceilSec - 0.03, z, HW * 2 - 8, 0.04, 0.3, 'light', { faces: 'ny', emit: { ny: 1.5 }, mirrorK: 1.1 });
  slab(wallIn, D, ceilLand); // check-in hall: tall span, beam grid and three skylight strips
  for (let z = wallIn + 3; z < D - 1.5; z += 6) B.box(0, F + ceilLand - 0.3, z, HW * 2, 0.6, 0.35, 'white', { faces: 'nypznz', rep: 3 });
  for (let x = -HW + 12; x < HW - 8; x += 12) B.box(x, F + ceilLand - 0.3, (wallIn + D) / 2, 0.35, 0.6, D - wallIn - 2, 'white', { faces: 'nypxnx', rep: 3 });
  for (const sx of [-HW / 2, 0, HW / 2]) glow(sx, F + ceilLand - 0.02, (wallIn + D) / 2, 3.2, 0.05, D - wallIn - 3.5, 'light', { faces: 'ny', emit: { ny: 1.9 }, mirrorK: 1.3 });
  const cols = []; for (const x of [-22, 22]) for (const z of [18, D - 12]) cols.push([x, z]);
  for (const [x, z] of cols) { const ch = ceilAt(z); B.box(x, F + ch / 2, z, 0.7, ch, 0.7, 'wood', { faces: 'pxnxpznz', rep: 2 }); B.box(x, F + 0.32, z, 0.86, 0.64, 0.86, 'steel', { faces: 'pxnxpznz' }); B.box(x, F + ch - 0.3, z, 0.86, 0.6, 0.86, 'wood', { faces: 'pxnxpznz' }); blk(x, z, 0.5, 0.5); }
  { // suspended art over the airside promenade: a slow fan of timber + accent fins (DESIGN T-F6)
    for (let i = 0; i < 9; i++) { const x = -8 + i * 2, z = 20.2 + Math.sin(i * 1.7) * 1.6, y = F + 8.3 + Math.cos(i * 2.3) * 0.7, len = 3.6 - Math.abs(i - 4) * 0.24; B.box(x, (y + F + ceilAir) / 2, z, 0.03, F + ceilAir - y - 0.1, 0.03, 'steel'); B.box(x, y, z, len, 0.09, 0.55, A.art === 'accent' ? 'accent' : A.art === 'metal' ? (i % 3 === 1 ? 'accent' : 'metal') : (i % 3 === 1 ? 'accent' : 'wood'), { ry: i * 0.35, faces: 'pynypznzpxnx' }); } }
  // ---- side mezzanines with glass balustrades
  const mz0 = 18, mz1 = D - 1, gl = []; for (const s of [-1, 1]) { const x0 = s * (HW - 3.5);
    B.box(x0, F + 5.6, (mz0 + mz1) / 2, 7, 0.45, mz1 - mz0, 'white', { faces: 'pynypxnx', rep: 3 }); B.box(s * (HW - 7.02), F + 5.6, (mz0 + mz1) / 2, 0.06, 0.45, mz1 - mz0, 'steel', { faces: s > 0 ? 'nx' : 'px' });
    for (let z = mz0 + 2; z < mz1; z += 5) glow(x0, F + 5.35, z, 4, 0.04, 0.5, 'light', { faces: 'ny', emit: { ny: 1.5 } });
    B.box(s * (HW - 7.05), F + 6.95, (mz0 + mz1) / 2, 0.08, 0.06, mz1 - mz0, 'steel'); B.box(s * (HW - 7.05), F + 7.02, (mz0 + mz1) / 2, 0.17, 0.07, mz1 - mz0, 'wood', { faces: 'pypznz' }); gl.push([s * (HW - 7.05), F + 6.32, (mz0 + mz1) / 2, mz1 - mz0]); }
  // ---- gate lounge: linked seats (instanced), charging pillars, gate desk + screens, gate sign
  if (dep) { glow(dx + 7, F + 2.6, 3.2, 3.6, 0.9, 0.12, 'steel', { tiles: { pz: 'gateDesk' }, emit: { pz: 1.25 }, faces: 'pznz' }); B.box(dx + 7, F + 0.55, 3.5, 3.4, 1.1, 0.9, 'counter', { tiles: { nz: 'counter', py: 'stone' } }); for (const o of [-0.8, 0.8]) glow(dx + 7 + o, F + 1.35, 3.3, 0.5, 0.32, 0.04, 'steel', { tiles: { pz: 'kiosk' }, emit: { pz: 1.1 }, faces: 'pznz' }); hang('signGate', dx, F + 3.9, 1.0, 4.4, 1.1, 0, ceilPier); blk(dx + 7, 3.5, 1.8, 0.6); }
  else hang('signArr', dx, F + 3.9, 1.0, 4.4, 1.1, 0, ceilPier);
  B.box(dx, F + HC - 0.75, 0.42, 30, 1.1, 0.22, 'accent', { faces: 'pznz' }); // gate identity band over the glass
  const bb = new Builder(() => 0.95); for (let k = 0; k < 6; k++) { const x = k * 0.62 - 1.55; bb.box(x, 0.45, 0, 0.54, 0.1, 0.52, 'leather'); bb.box(x, 0.8, 0.25, 0.54, 0.6, 0.08, 'leather', { ry: 0 }); if (k < 5) bb.box(x + 0.31, 0.62, 0.02, 0.05, 0.05, 0.45, 'steel'); }
  bb.box(0, 0.36, 0.02, 3.9, 0.06, 0.12, 'steel'); for (const x of [-1.6, 1.6]) { bb.box(x, 0.18, 0.02, 0.06, 0.36, 0.06, 'steel'); bb.box(x, 0.02, 0.02, 0.06, 0.04, 0.5, 'steel'); }
  const benchPos = []; const benchXs = []; for (let bx = 13; bx <= HW - 10; bx += 7) benchXs.push(bx); for (const z of [5.5, 8.6, 11.7]) for (const bx of benchXs) for (const x of [-bx, bx]) if (Math.abs(x - dx) > 5 && Math.abs(x - dx - 7) > 3) benchPos.push([x, z]);
  const benches = new THREE.InstancedMesh(bb.geometry(), mat, benchPos.length); const M = new THREE.Matrix4(); benchPos.forEach(([x, z], i) => { M.makeTranslation(x, F, z); benches.setMatrixAt(i, M); blk(x, z, 1.95, 0.45); }); benches.frustumCulled = false; group.add(benches);
  const chargeXs = [-30.5, -16.5, 16.5, 30.5]; if (big) chargeXs.push(-44.5, 44.5);
  for (const x of chargeXs) if (Math.abs(x - dx) > 4) { glow(x, F + 0.55, 8.6, 0.42, 1.1, 0.42, 'steel', { tiles: { pz: 'charge', nz: 'charge' }, emit: { pz: 1.05, nz: 1.05 }, faces: 'pznzpxnxpy' }); blk(x, 8.6, 0.3, 0.3); }
  // ---- airside shopping street: shop + café units both sides, washrooms, café seating, wayfinding
  const units = big ? [['shop0', 'cafe'], ['shop1'], ['shop4'], ['shop2'], ['wc'], ['shop6', 'cafe']] : [['shop0', 'cafe'], ['shop4']];
  let ui = 0;
  for (const s of [-1, 1]) for (let x0 = big ? 5 : 31; x0 + 11 <= HW - 0.5 && ui < units.length; x0 += 11.5) {
    const [nm, kind] = units[ui++], x = s * (x0 + 5.5), zc = zS + sDepth / 2;
    if (nm === 'wc') { B.box(x, F + 2.6, zc, 11, 5.2, sDepth, 'white', { faces: 'nzpy', rep: 3 }); for (const o of [-2.6, 2.6]) B.box(x + o, F + 1.2, zS - 0.01, 1.4, 2.4, 0.02, 'navy', { faces: 'nz' }); sign('wc', x, F + 3.4, zS - 0.08, 1.6, 1.6, Math.PI); blk(x, zc, 5.6, sDepth / 2); continue; }
    glow(x, F + 2.3, zS + 0.12, 10.6, 4.4, 0.05, 'steel', { tiles: { nz: nm }, emit: { nz: 1.12 }, faces: 'nz', mirrorK: 1.3 }); for (const o of [-1, 1]) B.box(x + o * 5.4, F + 2.6, zc, 0.2, 5.2, sDepth, 'white', { faces: 'pxnx' }); B.box(x, F + 4.85, zS + 0.05, 11, 0.7, 0.14, 'steel', { faces: 'pynz' });
    for (const o of [-5.3, 5.3]) B.box(x + o, F + 2, zS, 0.12, 4, 0.12, 'steel'); B.box(x, F + 3.95, zS, 11, 0.08, 0.1, 'steel');
    glow(x, F + 5.12, zc, 10, 0.04, sDepth - 1, 'light', { faces: 'ny', emit: { ny: 1.7 } });
    if (kind === 'cafe') { glow(x + 3.2, F + 1.1, zS - 0.5, 1.4, 1.0, 0.06, 'steel', { tiles: { nz: 'menu', pz: 'menu' }, emit: { nz: 1.15, pz: 1.15 }, faces: 'pznz' }); B.box(x + 3.2, F + 0.3, zS - 0.5, 0.06, 0.6, 0.06, 'steel');
      for (let i = 0; i < 3; i++) { const tx = x - 4 + i * 3.6, tz = zS - 1.4; B.box(tx, F + 0.74, tz, 0.8, 0.05, 0.8, 'wood', { faces: 'pyny' }); B.box(tx, F + 0.37, tz, 0.08, 0.74, 0.08, 'steel'); for (const o of [-0.65, 0.65]) { B.box(tx + o, F + 0.45, tz, 0.42, 0.06, 0.42, 'leather'); B.box(tx + o * 1.3, F + 0.7, tz, 0.06, 0.45, 0.4, 'leather'); } blk(tx, tz, 1.1, 0.5); } }
    blk(x, zc + 0.5, 5.6, sDepth / 2 - 0.5);
  }
  if (big) B.box(0, F + 5.3, zS + sDepth / 2, HW * 2, 0.2, sDepth, 'perf', { faces: 'ny', rep: 1.2 }); // shop soffit
  hang('wayG', 0, F + 3.6, 19, 6, 1.5, 0); hang('wayWC', -18, F + 3.6, 19, 6, 1.5, 0);
  // ---- passport control (large airports), security checkpoint, queue
  if (big) { for (const x of [-14, -8.6, -3.2, 3.2, 8.6, 14]) { B.box(x, F + 0.6, zP, 2.2, 1.2, 2.4, 'wood', { tiles: { py: 'white' } }); B.box(x, F + 1.5, zP - 0.6, 2.2, 0.6, 0.05, 'mirror', { faces: 'pznz', tint: [0.9, 0.95, 1.0] }); B.box(x, F + 2.3, zP, 2.4, 0.12, 2.6, 'white'); blk(x, zP, 1.15, 1.25); }
    for (const x of [-11.3, -5.9, 5.9, 11.3]) B.box(x, F + 1.0, zP + 1.2, 0.05, 2.0, 2.2, 'glassD', { faces: 'pxnx' }); hang('passport', 0, F + 4.0, wallOut - 1.2, 5, 1.25, 0); hang('wayP', -26, F + 4.0, wallOut - 1.2, 6, 1.5, 0); }
  if (dep) for (const xc of lanes) {
    const cx = xc + 1.9, L = z1sec - z0sec; B.box(cx, F + 0.42, zm, 0.9, 0.08, L, 'rubber', { rep: 0.6, tiles: { py: 'rubber' } }); for (const o of [-0.47, 0.47]) B.box(cx + o, F + 0.5, zm, 0.06, 0.14, L, 'steel'); for (const z of [z0sec + 0.3, z1sec - 0.3]) for (const o of [-0.4, 0.4]) B.box(cx + o, F + 0.2, z, 0.06, 0.4, 0.06, 'steel');
    B.box(cx, F + 0.95, zm, 1.2, 1.1, 2.2, 'xray', { tiles: { px: 'xray', nx: 'xray', pz: 'metal', nz: 'metal', py: 'metal' } }); for (const z of [zm - 1.12, zm + 1.12]) for (let i = 0; i < 5; i++) B.box(cx - 0.36 + i * 0.18, F + 0.82, z, 0.16, 0.6, 0.01, 'rubber', { faces: 'pznz' });
    glow(cx + 0.9, F + 1.2, zm - 0.3, 0.05, 0.4, 0.6, 'steel', { tiles: { px: 'kiosk' }, emit: { px: 1.1 }, faces: 'px' }); B.box(cx + 0.9, F + 0.5, zm - 0.3, 0.5, 1.0, 0.7, 'metal');
    for (const o of [-0.48, 0.48]) B.box(xc + o, F + 1.05, zm + 1.5, 0.1, 2.1, 0.5, 'wtmd', { tiles: { pz: 'wtmd', nz: 'wtmd', px: 'metal', nx: 'metal' } }); B.box(xc, F + 2.15, zm + 1.5, 1.06, 0.18, 0.5, 'wtmd', { tiles: { pz: 'wtmd', nz: 'wtmd' } });
    B.box(xc - 1.8, F + 1.15, zm - 0.6, 1.4, 2.3, 1.4, 'scan', { tiles: { px: 'scan', nx: 'scan', pz: 'scan', nz: 'scan', py: 'metal' } }); blk(xc - 1.8, zm - 0.6, 0.75, 0.75);
    B.box(cx, F + 0.42, z1sec + 0.6, 1.4, 0.84, 0.9, 'steel'); blk(cx, zm, 0.6, L / 2 + 0.5);
  }
  // ---- security is a real ROOM (Terminal rebuild): solid walls between the entry and exit
  // planes; the only openings are the lanes themselves, so airside is physically gated
  const trayState = { t: 0, per: 6, player: { lane: -1, u: 0 }, alarm: [] };
  let trayMesh = null; const archLights = [];
  if (dep) {
    const wallRun = (z, hg, hdrTo) => { let last = -HW; const segs = []; for (const xc of [...lanes].sort((a, b) => a - b)) { segs.push([last, xc - hg]); last = xc + hg; } segs.push([last, HW]);
      for (const [a, b] of segs) { if (b - a < 0.1) continue; const cxw = (a + b) / 2; B.box(cxw, F + ceilSec / 2, z, b - a, ceilSec, 0.36, 'white', { faces: 'pznz', rep: 3 }); blk(cxw, z, (b - a) / 2, 0.18); }
      if (hdrTo > ceilSec + 0.1) B.box(0, F + (ceilSec + hdrTo) / 2, z, HW * 2, hdrTo - ceilSec, 0.36, 'white', { faces: 'pznz', rep: 3 }); }; // the band above the doorways is solid across the whole width — no slots into the roof void
    wallRun(wallIn, 1.2, ceilLand); wallRun(wallOut, 1.1, ceilAir);
    const tb = new Builder(light); tb.box(0, 0, 0, 0.6, 0.08, 0.45, 'tray', { faces: 'pypxnxpznz', tiles: { py: 'tray' } });
    trayMesh = new THREE.InstancedMesh(tb.geometry(), mat, lanes.length * trayState.per + 1); trayMesh.frustumCulled = false; group.add(trayMesh);
    for (const xc of lanes) { const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.1), new THREE.MeshBasicMaterial({ color: 0x2bd576, toneMapped: false, side: THREE.DoubleSide })); lm.position.set(xc, F + 2.27, zm + 1.5); group.add(lm); archLights.push(lm); trayState.alarm.push(0); }
  }
  if (dep) { hang('signSec', 0, F + 4.4, z1sec + 2.2, 6, 1.4, 0, ceilLand); hang('wayS', 26, F + 4.0, z1sec + 2.2, 6, 1.5, 0, ceilLand); }
  // queue stanchions with belt barriers (visual; you can duck under them)
  for (let r = 0; r < qRows; r++) { const z = qz + r * 1.3; for (let x = -16; x <= 16; x += 2.2) { B.box(x, F + 0.5, z, 0.07, 1.0, 0.07, 'steel'); B.box(x, F + 0.01, z, 0.36, 0.02, 0.36, 'steel', { faces: 'py' }); } for (let x = -16; x < 16; x += 2.2) if (!((r % 2 ? x > 13 : x < -13))) B.box(x + 1.1, F + 0.92, z, 2.1, 0.05, 0.01, 'navy', { faces: 'pznz' }); }
  // [Arrival ending] working baggage-claim state (arrivals only): bags loop both carousels
  // (near lane past the waiting passengers, far lane back) and claimPax collect theirs and
  // head for the exit. claimPos walks the belt loop: s in metres along a 29.4 m perimeter.
  let claim = null; const claimPax = [];
  const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _ce = new THREE.Euler(), _cv = new THREE.Vector3(), _cs = new THREE.Vector3();
  const claimPos = (belt, s) => { const a = 6.3, lz = 1.05, P = 4 * a + 4 * lz; s = ((s % P) + P) % P;
    if (s < 2 * a) return [belt.x - a + s, belt.z + lz, 1, 0, 0];
    if (s < 2 * a + 2 * lz) return [belt.x + a, belt.z + lz - (s - 2 * a), 0, -1, 1];
    if (s < 4 * a + 2 * lz) return [belt.x + a - (s - 2 * a - 2 * lz), belt.z - lz, -1, 0, 2];
    return [belt.x - a, belt.z - lz + (s - 4 * a - 2 * lz), 0, 1, 3]; };
  // ---- check-in (departures) or baggage claim + customs exit (arrivals)
  if (dep) {
    for (const x of ckIslands) { B.box(x, F + 1.3, ckZ + 1.2, 10, 2.6, 0.4, 'white'); glow(x, F + 2.2, ckZ + 0.98, 9.6, 1.6, 0.06, 'logo', { tiles: { nz: 'logo' }, emit: { nz: 1.15 }, faces: 'nz' }); glow(x, F + 2.2, ckZ + 1.42, 9.6, 1.6, 0.06, 'logo', { tiles: { pz: 'logo' }, emit: { pz: 1.1 }, faces: 'pz' });
      for (let i = 0; i < 4; i++) { const cx = x - 3.6 + i * 2.4; B.box(cx, F + 0.55, ckZ, 1.5, 1.1, 1.0, 'counter', { tiles: { nz: 'counter', py: 'white' } }); glow(cx, F + 1.32, ckZ - 0.1, 0.42, 0.3, 0.04, 'steel', { tiles: { nz: 'kiosk' }, emit: { nz: 1.05 }, faces: 'nz' }); B.box(cx + 1.0, F + 0.25, ckZ - 0.15, 0.6, 0.5, 1.6, 'rubber', { tiles: { py: 'belt' } }); glow(cx + 1.0, F + 0.62, ckZ - 1.0, 0.36, 0.2, 0.04, 'steel', { tiles: { nz: 'scale' }, emit: { nz: 1.1 }, faces: 'nz' }); }
      blk(x, ckZ, 5.1, 0.8);
      for (let r = 0; r < 2; r++) for (let k = 0; k <= 4; k++) { const sx = x - 4.4 + k * 2.2, sz = ckZ - 2.2 - r * 1.4; B.box(sx, F + 0.5, sz, 0.07, 1.0, 0.07, 'steel'); if (k < 4) B.box(sx + 1.1, F + 0.92, sz, 2.1, 0.05, 0.01, 'navy', { faces: 'pznz' }); } }
    for (const [x, z] of kioskXZ) { B.box(x, F + 0.5, z, 0.5, 1.0, 0.4, 'metal'); glow(x, F + 1.25, z - 0.05, 0.5, 0.7, 0.12, 'steel', { tiles: { nz: 'kiosk' }, emit: { nz: 1.15 }, faces: 'nzpy', ry: 0 }); blk(x, z, 0.3, 0.3); }
    hang('signDep', 0, F + 6.8, D - 0.6, 12, 1.5, Math.PI);
  } else {
    for (const x of [-16, 16]) { const zc = (z0sec + D) / 2 - 2; B.box(x, F + 0.35, zc, 14, 0.7, 4, 'metal'); B.box(x, F + 0.72, zc, 13.4, 0.04, 3.4, 'belt', { faces: 'py', tiles: { py: 'belt' } }); B.box(x, F + 1.3, zc, 1.0, 1.2, 1.2, 'metal'); glow(x, F + 3.8, zc - 2.4, 3.2, 1.0, 0.1, 'steel', { tiles: { nz: 'signBag', pz: 'signBag' }, emit: { nz: 1.2, pz: 1.2 }, faces: 'pznz' }); blk(x, zc, 7.1, 2.1); }
    { // [Arrival ending] the carousels RUN: instanced bags loop the belt and dark slats sweep
      // the surface with them (same instanced-mesh pattern as the security trays).
      const belts = [-16, 16].map(bx => ({ x: bx, z: (z0sec + D) / 2 - 2, bags: [] }));
      const bagMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.52, 0.72, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff }), 16);
      const bagCols = [0xb8452e, 0x2e5fb8, 0x30343c, 0x7a4fa3, 0x1f8a70, 0xd9a441, 0x8a8f98, 0x53381f];
      let bi = 0;
      for (const belt of belts) for (let i = 0; i < 8; i++) { const bag = { s: i * 3.675 + rnd() * 1.6, taken: 0, sc: 0.9 + rnd() * 0.25, ix: bi }; belt.bags.push(bag); bagMesh.setColorAt(bi, new THREE.Color(bagCols[bi % bagCols.length])); bi++; }
      bagMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); bagMesh.frustumCulled = false; group.add(bagMesh);
      const slatMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.03, 1.5), new THREE.MeshBasicMaterial({ color: 0x17181c }), 24);
      const slats = []; for (const belt of belts) for (let i = 0; i < 12; i++) slats.push({ belt, s: i * 2.45 });
      slatMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); slatMesh.frustumCulled = false; group.add(slatMesh);
      claim = { belts, bagMesh, slatMesh, slats, collected: 0 };
    }
    hang('wayX', 0, F + 4.0, D - 6, 7, 1.75, 0, ceilLand); B.box(0, F + 1.4, D - 0.25, 6, 2.8, 0.1, 'glassD', { faces: 'nz' }); hang('signHello', 0, F + 6.4, D - 0.6, 16, 2.0, Math.PI);
    if (big) hang('wayB', -24, F + 4, z0sec + 2, 6, 1.5, Math.PI, ceilSec);
  }
  // posters (light boxes) on the side walls, planters with the local plants
  for (const [x, z, n] of [[-HW + 0.25, zS - 4, 'poster0'], [HW - 0.25, zS - 4, 'poster1'], [-HW + 0.25, D - 10, 'poster1'], [HW - 0.25, D - 10, 'poster0']]) glow(x, F + 2.2, z, 0.08, 2.0, 4.0, 'steel', { tiles: { px: n, nx: n }, emit: { px: 1.15, nx: 1.15 }, faces: x < 0 ? 'px' : 'nx' });
  const planters = [[-(HW - 8), 13], [HW - 8, 13], [-(HW - 8), 21.5], [HW - 8, 21.5], [-(HW - 8), D - 4], [HW - 8, D - 4]];
  for (const [x, z] of planters) { B.box(x, F + 0.4, z, 1.6, 0.8, 1.6, 'wood'); blk(x, z, 0.9, 0.9);
    if (A.plant === 'palm') { for (let k = 0; k < 5; k++) B.box(x, F + 1.2 + k * 0.9, z, 0.32 - k * 0.03, 0.9, 0.32 - k * 0.03, 'trunk'); for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; B.box(x + Math.cos(a) * 1.3, F + 5.15, z + Math.sin(a) * 1.3, 2.6, 0.06, 0.6, 'leaf', { ry: -a }); } }
    else if (A.plant === 'tropical') { for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; B.box(x + Math.cos(a) * 0.6, F + 1.5 + (k % 3) * 0.4, z + Math.sin(a) * 0.6, 1.4, 0.05, 0.7, 'leaf', { ry: -a }); } }
    else { B.box(x, F + 1.5, z, 0.2, 1.4, 0.2, 'trunk'); B.box(x, F + 2.8, z, 1.4, 1.8, 1.4, 'leaf'); } }
  if (A.lattice) for (const x of [-34, 34]) B.box(x, F + 2, zS - 3, 6, 4, 0.15, 'lattice', { faces: 'pznz' });
  for (const s of [-1, 1]) for (const dz of [-1.7, 1.7]) { const x = s * (HW - 2.8), z = 15.5 + dz; B.box(x, F + 0.44, z, 0.85, 0.13, 0.85, 'leather'); B.box(x + s * 0.44, F + 0.88, z, 0.13, 1.0, 0.85, 'leather'); B.box(x - s * 0.05, F + 0.2, z, 0.72, 0.4, 0.72, 'wood'); blk(x, z, 0.55, 0.55); }
  // ---- meshes: mirror (under the floor), polished floor (transparent), main, glass, FIDS boards, light shafts
  const mirror = new THREE.Mesh(BM.geometry(), mat); mirror.frustumCulled = false; group.add(mirror);
  const floor = new THREE.Mesh(BF.geometry(), floorMat); floor.frustumCulled = false; floor.renderOrder = 1; group.add(floor);
  const mesh = new THREE.Mesh(B.geometry(), mat); mesh.frustumCulled = false; group.add(mesh);
  const glassM = new THREE.MeshBasicMaterial({ color: 0x9ccbe0, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2, HC), glassM); facade.position.set(0, F + HC / 2, 0.04); group.add(facade);
  const balM = new THREE.MeshBasicMaterial({ color: 0xbfe3ee, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
  for (const [x, y, z, l] of gl) { const p = new THREE.Mesh(new THREE.PlaneGeometry(l, 1.1), balM); p.position.set(x, y, z); p.rotation.y = Math.PI / 2; group.add(p); }
  const shaftC = document.createElement('canvas'); shaftC.width = 64; shaftC.height = 256; { const c = shaftC.getContext('2d'); const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,240,210,0.9)'); g.addColorStop(1, 'rgba(255,240,210,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 256); const h = c.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.25, 'rgba(0,0,0,0)'); h.addColorStop(0.75, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = h; c.fillRect(0, 0, 64, 256); }
  const shaftT = new THREE.CanvasTexture(shaftC); const shaftM = new THREE.MeshBasicMaterial({ map: shaftT, transparent: true, opacity: 0.17, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let x = -(HW - 8); x <= HW - 8; x += 9) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 15), shaftM); sh.position.set(x + 2, F + 5.2, 5.5); sh.rotation.set(-0.85, 0.15, 0); group.add(sh); }
  { const patchGeo = new THREE.PlaneGeometry(3.1, 13); patchGeo.rotateZ(0.42); // low-sun pools on the floor inside the glass
    for (let x = -(HW - 8); x <= HW - 8; x += 9) { const p = new THREE.Mesh(patchGeo, shaftM); p.position.set(x + 3.4, F + 0.03, 7.4); p.rotation.set(-Math.PI / 2, 0, 0); p.renderOrder = 2; group.add(p); } }
  const board = fidsCanvas(opts, dep ? 'DEPARTURES' : 'ARRIVALS'); const fm = new THREE.MeshBasicMaterial({ map: board, toneMapped: false });
  const boards = dep ? [[-8, F + 4.2, D - 0.3, Math.PI, 1], [8, F + 4.2, D - 0.3, Math.PI, 1], [-22, F + 3.2, 18 - 0.4, 0, 0.45], [22, F + 3.2, 18 - 0.4, 0, 0.45], [0, F + 3.4, zS - 1.0, 0, 0.5]] : [[0, F + 3.6, z0sec + 3, Math.PI, 0.7], [-22, F + 3.2, 18 - 0.4, 0, 0.45]];
  for (const [x, y, z, ry, s] of boards) { const bm = new THREE.Mesh(new THREE.PlaneGeometry(12 * s, 3.75 * s), fm); bm.position.set(x, y, z); bm.rotation.y = ry; group.add(bm); const rf = bm.clone(); rf.position.y = 2 * F - y; rf.scale.y = -1; rf.material = new THREE.MeshBasicMaterial({ map: board, toneMapped: false, side: THREE.DoubleSide, color: 0x666666 }); group.add(rf); }
  // ---- people: seated at the gate, check-in queues, security staff + passengers, shoppers, walkers
  const NP = dep ? 91 + FLIGHT_N : 96; const crowd = new People(group, NP, rnd); let k = 0; const walkers = [];
  const ACTS = ['idle', 'phone', 'read', 'talk', 'sleep', 'idle', 'phone'];
  const usedBench = new Set(); // bench seats already taken (ambient sitters first, then the flight's load)
  for (const [x, z] of benchPos) for (let sI = 0; sI < 6; sI++) if (rnd() < 0.3 && k < 26) { const p = crowd.p[k++]; usedBench.add(x + ':' + sI); Object.assign(p, { x: x + sI * 0.62 - 1.55, y: F, z: z + 0.06, yaw: Math.PI, mode: 'sit', act: ACTS[(rnd() * ACTS.length) | 0], talkSide: rnd() < 0.5 ? 1 : -1, windowSide: 0 }); }
  const staff = (x, z, yaw, mode = 'stand') => { if (k >= NP - 1) return; const i = k++; crowd.setCrew(i); Object.assign(crowd.p[i], { x, y: F, z, yaw, mode, act: 'idle' }); };
  // ---- live flow machines (Terminal rebuild): passengers who MOVE through check-in queues
  // and two security lanes on their own loops, so the terminal's core processes visibly work.
  // A mover walks a list of [x, z, waitSec?] points, then fires its callback (hide/recycle).
  const ckFlows = [], secFlows = [];
  const sendP = (p, pts, speed, cb, keepHidden) => { if (!keepHidden) p.hidden = false; p._mv = { pts, i: 0, speed: speed || 1.05, cb }; p.mode = 'walk'; p.act = 'idle'; };
  const stepMover = (p, dt) => { const mv = p._mv; if (!mv) return; if (p._waitT > 0) { p._waitT -= dt; return; } const tg = mv.pts[mv.i]; if (!tg) { p._mv = null; p.mode = 'stand'; if (mv.cb) mv.cb(); return; } const dxp = tg[0] - p.x, dzp = tg[1] - p.z, d = Math.hypot(dxp, dzp); if (d < 0.12) { if (tg[2] > 0) p._waitT = tg[2]; mv.i++; return; } p.x += dxp / d * mv.speed * dt; p.z += dzp / d * mv.speed * dt; p.yaw = Math.atan2(dxp, dzp); };
  const flowLaneIdx = [0, 2]; // lanes[0] and lanes[2] run live passenger cycles; the rest keep a standing passenger
  if (dep) for (const xc of lanes) { staff(xc + 2.9, zm - 0.3, -Math.PI / 2); const li = lanes.indexOf(xc); if (flowLaneIdx.indexOf(li) < 0 && rnd() < 0.7 && k < NP - 2) { const p = crowd.p[k++]; Object.assign(p, { x: xc, y: F, z: z1sec + 0.6, yaw: Math.PI, mode: 'stand', act: rnd() < 0.4 ? 'phone' : 'idle', suitcase: false }); } }
  if (big) for (const x of [-8.6, 3.2, 14]) staff(x, zP + 0.4, Math.PI, 'sit');
  if (dep) { for (const x of ckIslands) { for (let i = 0; i < 2; i++) staff(x - 3.6 + i * 4.8, ckZ + 0.7, Math.PI); const fl = { island: x, slots: [], timer: 3 + rnd() * 6 }; for (let q = 0; q < 4 && k < NP - 22; q++) { const p = crowd.p[k++]; Object.assign(p, { x: x - 2.5 + (q % 2) * 0.3, y: F, z: ckZ - 1.7 - q * 0.85, yaw: 0, mode: 'stand', act: rnd() < 0.3 ? 'phone' : 'idle', suitcase: rnd() < 0.7 }); p._home = [p.x, p.z]; fl.slots.push(p); } ckFlows.push(fl); }
    for (let q = 0; q < 6 && k < NP - 16; q++) { const p = crowd.p[k++]; Object.assign(p, { x: -12 + q * 2.4 + (q % 2) * 0.5, y: F, z: qz + 0.6 + (q % 3) * 1.3, yaw: Math.PI, mode: 'stand', act: 'idle', suitcase: rnd() < 0.5 }); }
    for (const li of flowLaneIdx) { const xc = lanes[li]; if (xc === undefined) continue; const sf = { lane: li, timer: 1.5 + li * 2.5, people: [] }; for (let q = 0; q < 3 && k < NP - 14; q++) { const p = crowd.p[k++]; Object.assign(p, { x: xc + (q - 1) * 0.55, y: F, z: z1sec + 1.1 + q * 0.75, yaw: Math.PI, mode: 'stand', act: 'idle', suitcase: false }); p.hidden = true; p._home = [p.x, p.z]; sf.people.push(p); } secFlows.push(sf); } }
  else for (const x of [-16, 16]) for (let q = 0; q < 5 && k < NP - 14; q++) { const p = crowd.p[k++]; const sx = x - 5.6 + q * 2.8; Object.assign(p, { x: sx, y: F, z: (z0sec + D) / 2 - 2 + 3.1, yaw: Math.PI, mode: 'stand', act: rnd() < 0.4 ? 'phone' : 'idle' }); p._claim = { bi: x < 0 ? 0 : 1, spotX: sx, phase: 'wait', t: 3 + rnd() * 12 }; claimPax.push(p); }
  for (let i = 0; i < 4 && k < NP - 12; i++) { const p = crowd.p[k++]; Object.assign(p, { x: -6 + i * 4, y: F, z: zS - 1.4, yaw: i % 2 ? Math.PI / 2 : -Math.PI / 2, mode: 'sit', act: ACTS[i % ACTS.length] }); }
  // ---- this flight's passengers (departures): the gate lounge starts FULL — the whole cabin load waits
  // here, most of them on the benches nearest the gate, the rest standing at the windows and by the desk,
  // bags in hand. onfoot.js walks them to the podium and down the bridge as their group is called.
  const flightPax = [];
  if (dep) {
    const benchesByGate = benchPos.slice().sort((a, b) => Math.abs(a[0] - dx) - Math.abs(b[0] - dx));
    outer: for (const [bx, bz] of benchesByGate) for (let sI = 0; sI < 6 && flightPax.length < Math.min(92, Math.round(FLIGHT_N * 0.76)); sI++) { if (k >= NP - 12) break outer; const bk = bx + ':' + sI; if (usedBench.has(bk) || rnd() < 0.14) continue; usedBench.add(bk); const p = crowd.p[k++]; Object.assign(p, { x: bx + sI * 0.62 - 1.55, y: F, z: bz + 0.06, yaw: Math.PI, mode: 'sit', act: ACTS[(rnd() * ACTS.length) | 0], talkSide: rnd() < 0.5 ? 1 : -1, windowSide: 0, flight: true }); flightPax.push(p); }
    while (flightPax.length < FLIGHT_N && k < NP - 12) { const p = crowd.p[k++]; const nearDesk = flightPax.length > FLIGHT_N - 15; Object.assign(p, { x: nearDesk ? dx + 7 + (rnd() - 0.5) * 7 : dx + (rnd() - 0.5) * 22, y: F, z: nearDesk ? 5.4 + rnd() * 2.2 : 2.4 + rnd() * 0.9, yaw: Math.PI + (rnd() - 0.5) * 0.8, mode: 'stand', act: rnd() < 0.45 ? 'phone' : 'idle', talkSide: rnd() < 0.5 ? 1 : -1, suitcase: rnd() < 0.65, backpack: rnd() < 0.4, flight: true }); flightPax.push(p); }
  }
  const famPath = [[-30, 19], [30, 19], [30, 16.5], [-30, 16.5]];
  for (let f = 0; f < 3 && k < NP - 2; f++) { const p = crowd.p[k++]; if (f > 0) { p.age = 'kid'; p.scale = 0.58 + rnd() * 0.12; p.backpack = true; crowd.paint(p); } Object.assign(p, { x: famPath[0][0] - f * 0.9, y: F, z: famPath[0][1] + f * 0.6, mode: 'walk', path: famPath, seg: 1, speed: 0.95, family: f, suitcase: f === 0 }); walkers.push(p); }
  while (k < NP - 1 && walkers.length < (dep ? 10 : 1e9)) { const p = crowd.p[k]; const side = rnd() < 0.5 ? -1 : 1, path = rnd() < 0.6 ? [[-38 + rnd() * 20, 18 + rnd() * 3], [18 + rnd() * 20, 18 + rnd() * 3]] : [[side * (2 + rnd() * 1.5), 17], [side * (2 + rnd() * 1.5), D - 4], [side * (8 + rnd() * 8), D - 3]]; Object.assign(p, { x: path[0][0], y: F, z: path[0][1], mode: 'walk', path, seg: (rnd() * path.length) | 0, speed: 0.9 + rnd() * 0.5, suitcase: rnd() < 0.45 }); walkers.push(p); k++; }
  { const p = crowd.p[NP - 1]; crowd.setCrew(NP - 1); Object.assign(p, { x: dx + 7, y: F, z: 4.6, yaw: Math.PI, mode: 'stand', act: 'idle' }); if (!dep) p.hidden = true; }
  // ---- walk zone
  wm.rect(wc(0, D / 2), xAxis, HW - 0.6, D / 2 - 0.8, O.y + F, O.y + F, 'hall');
  const update = (dt, t, cam) => {
    for (const p of walkers) { const tg = p.path[p.seg]; const ox = p.family ? -p.family * 0.8 : 0; const dxp = tg[0] + ox - p.x, dzp = tg[1] + (p.family ? p.family * 0.5 : 0) - p.z, d = Math.hypot(dxp, dzp); if (d < 0.5) { p.seg = (p.seg + 1) % p.path.length; continue; } p.x += dxp / d * p.speed * dt; p.z += dzp / d * p.speed * dt; p.yaw = Math.atan2(dxp, dzp); }
    // live queues + security flows + tray belts (Terminal rebuild)
    if (dep) {
      for (const p of crowd.p) if (p._mv || p._waitT > 0 || p._unhide > 0) { if (p._unhide > 0) { p._unhide -= dt; if (p._unhide <= 0 && !p._mv) p.hidden = false; } stepMover(p, dt); }
      for (const fl of ckFlows) { if (!fl.slots.length || fl.slots.some(p => p._mv)) continue; fl.timer -= dt; if (fl.timer > 0) continue; fl.timer = 4 + rnd() * 6; const head = fl.slots[0];
        sendP(head, [[fl.island - 1.2, ckZ - 0.95, 4 + rnd() * 3.5]], 1.05, () => { sendP(head, [[fl.island * 0.3, wallIn + 2.4]], 1.3, () => { // served: stroll off, vanish, reappear behind the queue tail
          head.hidden = true; head.x = fl.island - 2.5; head.z = ckZ - 5.6; sendP(head, [[fl.island - 2.5, ckZ - 5.6, 0.9]], 1.2, () => { sendP(head, [head._home], 1.0, null); fl.slots.push(head); }, true); }); });
        fl.slots.shift(); for (const p of fl.slots) { const hi = fl.slots.indexOf(p); p._home = [fl.island - 2.5 + (hi % 2) * 0.3, ckZ - 1.7 - hi * 0.85]; if (!p._mv) sendP(p, [p._home], 1.0, null); } }
      for (const sf of secFlows) { if (sf.people.some(p => p._mv)) continue; sf.next = ((sf.next || 0) + 1) % sf.people.length; const p = sf.people[sf.next]; if (!p || !p.hidden) continue; sf.timer -= dt; if (sf.timer > 0) continue; sf.timer = 5 + rnd() * 5; const xc = lanes[sf.lane], cx = xc + 1.9;
        p.x = p._home[0]; p.z = p._home[1]; sendP(p, [[cx - 0.55, z1sec - 0.7, 1.8], [xc, zm + 2.5, 0.3], [xc, zm + 0.3, 0.2], [cx, z0sec + 0.95, 1.4], [xc * 0.4, wallOut - 2.2]], 0.95, () => { p.hidden = true; }); }
      if (trayMesh) { const per = trayState.per, zHi = z1sec - 0.6, zLo = z0sec + 0.6; trayState.t += dt;
        for (let li = 0; li < lanes.length; li++) for (let j = 0; j < per; j++) { const u = (trayState.t * 0.05 + j / per + li * 0.37) % 1; M.makeTranslation(lanes[li] + 1.9, F + 0.55, zHi + (zLo - zHi) * u); trayMesh.setMatrixAt(li * per + j, M); }
        const pi = lanes.length * per;
        if (trayState.player.lane >= 0) { trayState.player.u = Math.min(1, trayState.player.u + dt / 13); M.makeTranslation(lanes[trayState.player.lane] + 1.9, F + 0.55, zHi + (zLo - zHi) * trayState.player.u); } else M.makeScale(0.001, 0.001, 0.001).setPosition(0, F - 50, 0);
        trayMesh.setMatrixAt(pi, M); trayMesh.instanceMatrix.needsUpdate = true;
        for (let li = 0; li < archLights.length; li++) if (trayState.alarm[li] > 0) { trayState.alarm[li] -= dt; archLights[li].material.color.setHex(trayState.alarm[li] > 0 ? 0xff4444 : 0x2bd576); } }
    }
    if (!dep && claim) {
      // [Arrival ending] baggage claim at work: step claim movers (same stepping as the dep
      // flows), advance the belt field, then run each waiting passenger's collect cycle.
      for (const p of crowd.p) if (p._mv || p._waitT > 0 || p._unhide > 0) { if (p._unhide > 0) { p._unhide -= dt; if (p._unhide <= 0 && !p._mv) p.hidden = false; } stepMover(p, dt); }
      const spd = 0.55 * dt;
      for (const belt of claim.belts) for (const bag of belt.bags) { if (bag.taken > 0) { bag.taken -= dt; if (bag.taken <= 0) bag.s = rnd() * 29.4; } else bag.s += spd; }
      for (const sl of claim.slats) sl.s += spd;
      for (const belt of claim.belts) for (const bag of belt.bags) { const [px, pz, hx, hz] = claimPos(belt, bag.s); const sc = bag.taken > 0 ? 0.001 : bag.sc; _ce.set(0, Math.atan2(hx, hz), 0); _cq.setFromEuler(_ce); _cv.set(px, F + 1.1, pz); _cs.set(sc, sc, sc); _cm.compose(_cv, _cq, _cs); claim.bagMesh.setMatrixAt(bag.ix, _cm); }
      claim.bagMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < claim.slats.length; i++) { const sl = claim.slats[i]; const [px, pz, hx, hz] = claimPos(sl.belt, sl.s); _ce.set(0, Math.atan2(hx, hz), 0); _cq.setFromEuler(_ce); _cv.set(px, F + 0.755, pz); _cs.set(1, 1, 1); _cm.compose(_cv, _cq, _cs); claim.slatMesh.setMatrixAt(i, _cm); }
      claim.slatMesh.instanceMatrix.needsUpdate = true;
      for (const p of claimPax) { const c = p._claim; if (!c || p._mv || p.hidden) continue; const belt = claim.belts[c.bi];
        if (c.phase === 'wait') { if (c.t > 0) c.t -= dt; else { let grab = null; for (const bag of belt.bags) { if (bag.taken > 0) continue; const [bx2, , hx] = claimPos(belt, bag.s); if (hx === 1 && Math.abs(bx2 - p.x) < 0.7) { grab = bag; break; } }
          if (grab) { c.phase = 'grab'; c.bag = grab; p.act = 'lift'; sendP(p, [[p.x, belt.z + 2.35, 0.85]], 1.1, () => { if (c.bag.taken <= 0) { c.bag.taken = 14 + rnd() * 10; claim.collected++; } p.suitcase = true; p.act = 'idle'; c.phase = 'leave'; }); } } }
        else if (c.phase === 'leave') { c.phase = 'exit'; sendP(p, [[belt.x * 0.35, D - 3.4], [0, D - 2.6]], 1.25, () => { p.hidden = true; p.x = dx + (rnd() - 0.5) * 8; p.z = 2.5 + rnd() * 1.5; p.suitcase = false; p._unhide = 1.2; c.phase = 'return'; }); }
        else if (c.phase === 'return') { c.phase = 'wait'; c.t = 2 + rnd() * 5; sendP(p, [[c.spotX, belt.z + 3.1]], 1.15, () => { p.yaw = Math.PI; }); } }
    }
    floorMat.color.copy(mat.color); crowd.commit(t, cam ? group.worldToLocal(cam.clone()) : null);
  };
  const spawn = dep ? { pos: W(13, F, D * 0.92), yaw: 0 } : { pos: W(dx, F, 2.0), yaw: 0 };
  // ---- spawn keep-out (black-terminal fix, Nov 7): onfoot seeds this build with
  // Date.now(), so every boot rolls a different crowd — and the long walker paths run
  // straight through the landside spawn zone: a Monte Carlo of the path formulas puts a
  // walker path inside the 4.3 m spawn disc on ~88% of rolls and within 1 m of the
  // third-person camera's rest spot (boom 3.23 m behind the spawn) on ~63%. The boom
  // collision grid only contains hall geometry, never people, so a walker standing on
  // the camera eclipses the whole frame — pitch black, HUD/flow fine, any quality tier
  // (owner's MPTO report). Guarantee the disc on every roll: relocate anyone placed
  // inside it, push walk-path waypoints out, and break any segment that would chord
  // through it with a pushed-out midpoint. R = 4.3 m > boom 3.23 + body radius.
  {
    const sx = dep ? 13 : dx, sz = dep ? D * 0.92 : 2.0, R = 4.3;
    const pushOut = (o, kx, kz, RR = R) => { const ddx = o[kx] - sx, ddz = o[kz] - sz, d = Math.hypot(ddx, ddz); if (d >= RR) return; if (d < 1e-4) { o[kx] = sx + RR; o[kz] = sz; } else { o[kx] = sx + ddx / d * RR; o[kz] = sz + ddz / d * RR; } };
    for (const p of crowd.p) {
      if (Math.hypot(p.x - sx, p.z - sz) < R) { if (p.mode === 'sit') { p.mode = 'stand'; p.act = 'idle'; } pushOut(p, 'x', 'z'); }
      if (p._home && Math.hypot(p._home[0] - sx, p._home[1] - sz) < R) { const o = { x: p._home[0], z: p._home[1] }; pushOut(o, 'x', 'z'); p._home = [o.x, o.z]; }
      if (p.path) {
        for (const w of p.path) { const o = { x: w[0], z: w[1] }; pushOut(o, 'x', 'z'); w[0] = o.x; w[1] = o.z; }
        // segment repair, iterated: a pushed midpoint can leave a sub-segment dipping
        // back under R, so overshoot inserts to R + 0.3 and repeat until clean
        for (let pass = 0; pass < 5; pass++) { let bad = false;
          for (let i = p.path.length - 1; i >= 0; i--) { const a = p.path[i], b = p.path[(i + 1) % p.path.length]; const abx = b[0] - a[0], abz = b[1] - a[1]; const tt = Math.max(0, Math.min(1, ((sx - a[0]) * abx + (sz - a[1]) * abz) / (abx * abx + abz * abz || 1))); const qx = a[0] + abx * tt, qz = a[1] + abz * tt; if (Math.hypot(qx - sx, qz - sz) < R) { const o = { x: qx, z: qz }; pushOut(o, 'x', 'z', R + 0.3); p.path.splice(i + 1, 0, [o.x, o.z]); bad = true; } }
          if (!bad) break; }
      }
    }
  }
  crowd.commit(0);
  // ---- the player-facing flow contract (departures): check-in points and the security
  // process geometry, so onfoot.js can run tray -> arch -> collect and gate airside for real
  const flow = dep ? {
    ck: [...ckIslands.map(x => ({ x: x - 1.2, z: ckZ - 1.3 })), ...kioskXZ.map(([x, z]) => ({ x, z: z - 0.7 }))],
    sec: { wallIn, wallOut, archZ: zm + 1.5, lanes: lanes.map(x => ({ x, beltX: x + 1.9, divest: { x: x + 1.9, z: z1sec - 0.6 }, collect: { x: x + 1.9, z: z0sec + 0.9 } })),
      setPlayerTray(li) { trayState.player.lane = li; trayState.player.u = 0; },
      clearPlayerTray() { trayState.player.lane = -1; trayState.player.u = 0; },
      archAlarm(li) { trayState.alarm[li] = 1.6; if (archLights[li]) archLights[li].material.color.setHex(0xff4444); } }
  } : null;
  return { group, walk: wm, update, crowd, mat, shafts: shaftM, spawn, xAxis, zAxis, O, F, D, doorX: dx, flightPax, exitPos: W(0, F, D - 2), world: W, flow, claimInfo: () => claim ? { belts: claim.belts.map(b => ({ x: b.x, z: b.z })), visible: claim.belts.reduce((n, b) => n + b.bags.filter(g => g.taken <= 0).length, 0), total: claim.belts.reduce((n, b) => n + b.bags.length, 0), collected: claim.collected, pax: claimPax.length, sample: (() => { const b0 = claim.belts[0]; const bg = b0.bags.find(g => g.taken <= 0) || b0.bags[0]; const [sx, sz] = claimPos(b0, bg.s); return [Math.round(sx * 100) / 100, Math.round(sz * 100) / 100]; })() } : null, dispose() { group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); at.tex.dispose(); board.dispose(); } };
}
