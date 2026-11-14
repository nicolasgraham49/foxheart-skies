// Per-airport visual identity (owner rule, 2026-11-06): "i don't want every airport
// in the world to have the same design." Terminal + landside dressing varies by
// airport/region — palette, materials, roofline, signage, vegetation, landside
// character. Shared functional systems (jet bridges, people, boarding, the hall
// layout) stay shared; this table only drives how each place LOOKS.
//
// Consumers: env-buildings.js (exterior: cladding/concrete/roof tints, roof
// profile, name-sign colours, curb vegetation, car palette, landmark/extra
// blocks) and env-hall.js (interior: carpet/wall/ceiling tints, sign colours,
// suspended-art material). interiors.js ACCENTS still drives hall accent
// colours, shop names, sign language and greeter text; the stripe colour on the
// terminal comes from there too (this table's `stripe2` adds an optional
// second band). KTPA's entry reproduces the pre-identity build exactly —
// Tampa's look is Tampa's, kept as the reference, not a global template.
//
// Tints are vertex-colour multipliers over the shared textures, so they must
// stay light (they can only darken/colour the base texture, never brighten it).

import { World, haversine } from './data.js';
import { climateFor } from './surroundings.js';

const CARS_STD = [0xe8e8e8, 0x1a1a1a, 0x8c949c, 0x7a1d1d, 0x1d3557, 0xc0c4c8, 0x2f4f3a, 0xd9d2c3];

export const IDENTITY = {
  // Tampa — the reference look, unchanged: tropical-modern, teal, wave roof, palms.
  KTPA: { roof: 'wave', panel: 0xffffff, conc: 0xffffff, roofTint: 0xf5ead6, glass: 0xffffff,
    signBg: '#1d232b', signFg: '#f3f4f5', stripe2: null, veg: 'palm', cars: CARS_STD, traffic: 1, blocks: 0, landmark: null,
    hall: { carpet: '#274b4d', wall: '#ece4d4', ceil: '#d9d0bf', signBg: '#151b26', signFg: '#ffd34d', way: '#20262e', art: 'wood' } },
  // Miami — art-deco pastels: blush-cream cladding, pale-aqua roof wash, pink +
  // aqua deco double band, deep-teal name sign with pink neon-leaning letters.
  KMIA: { roof: 'wave', panel: 0xf7e3d8, conc: 0xf2f0e6, roofTint: 0xd6ece4, glass: 0xffe9f1,
    signBg: '#0d3b3e', signFg: '#ffc7d9', stripe2: '#29c4c4', veg: 'palm',
    cars: [0xf6ead8, 0xf3c6d3, 0xbfe3dd, 0xe8e8e8, 0x8c949c, 0x7a1d1d, 0x1d3557, 0xf0d9a0], traffic: 1.1, blocks: 1, landmark: null,
    hall: { carpet: '#31586b', wall: '#f2e8dc', ceil: '#e3d9c8', signBg: '#123a44', signFg: '#ff9ebb', art: 'accent' } },
  // Incheon — sleek Korean modern: one sweeping pale arch, blue-grey metal and
  // glass, navy signage, pines at the curb.
  RKSI: { roof: 'arch', panel: 0xdfe7ee, conc: 0xe9edf0, roofTint: 0xcfdce8, glass: 0xdfeaf2,
    signBg: '#0e2242', signFg: '#ffffff', stripe2: null, veg: 'pine',
    cars: [0xe8e8e8, 0xc0c4c8, 0x1a1a1a, 0xe8e8e8, 0x8c949c, 0x2a2f35, 0xd9d2c3, 0x1d3557], traffic: 1.2, blocks: 0, landmark: null,
    hall: { carpet: '#2c3e50', wall: '#e9e9e6', ceil: '#ccd4da', signBg: '#10243e', signFg: '#dbe9fa', art: 'metal' } },
  // Gimpo — the older domestic sibling of Incheon: warmer concrete, a brass
  // second band, deep-green signage, one urban block on the landside.
  RKSS: { roof: 'wave', panel: 0xe9e2d2, conc: 0xe9e6da, roofTint: 0xdcd2bc, glass: 0xe8e2d2,
    signBg: '#123524', signFg: '#f2e8c8', stripe2: '#c8a028', veg: 'pine',
    cars: [0xe8e8e8, 0xc0c4c8, 0x1a1a1a, 0xe8e8e8, 0x8c949c, 0x2a2f35, 0xd9d2c3, 0x1d3557], traffic: 1.1, blocks: 1, landmark: null,
    hall: { carpet: '#2c3e50', wall: '#e9e9e6', ceil: '#d3dade', signBg: '#10243e', signFg: '#dbe9fa', art: 'metal' } },
  // Haneda — crisp white terminal with a restrained red second band.
  RJTT: { roof: 'wave', panel: 0xf0ece2, conc: 0xeeece6, roofTint: 0xe8e0cc, glass: 0xf2ece2,
    signBg: '#1c1a24', signFg: '#f2d8d8', stripe2: '#a6192e', veg: 'pine', cars: CARS_STD, traffic: 1.1, blocks: 0, landmark: null,
    hall: { carpet: '#33404d', wall: '#ecebe4', ceil: '#d8d2c4', signBg: '#1c1a24', signFg: '#f0d9a8', art: 'wood' } },
  // Los Angeles — basin light, warm sand, a low wide mesa roof, palms, and the
  // mid-century Theme Building standing on the landside.
  KLAX: { roof: 'mesa', panel: 0xf3e9d4, conc: 0xefe9da, roofTint: 0xeee0bc, glass: 0xfff2da,
    signBg: '#33241a', signFg: '#ffd9a0', stripe2: null, veg: 'palm', cars: CARS_STD, traffic: 1.2, blocks: 1, landmark: 'theme',
    hall: { carpet: '#3a4a56', wall: '#ece1cd', ceil: '#ddd2bc', signBg: '#241c14', signFg: '#ffc46b', art: 'wood' } },
  // San Francisco — fog-grey slab with a bay-teal second band, cypress rows.
  KSFO: { roof: 'slab', panel: 0xe2e6e1, conc: 0xe6e8e2, roofTint: 0xd6dbd2, glass: 0xe4ecec,
    signBg: '#26343a', signFg: '#ffd9c9', stripe2: '#1f7a6d', veg: 'cypress', cars: CARS_STD, traffic: 1, blocks: 0, landmark: null,
    hall: { carpet: '#2e4a4a', wall: '#e8e6de', ceil: '#cfd4cc', signBg: '#1e2c30', signFg: '#ffb59d', art: 'metal' } },
  // New York — glass-and-steel: cool blue-grey cladding, a dark flat slab roof,
  // a taxi-yellow second band, denser landside (extra blocks, more traffic).
  KJFK: { roof: 'slab', panel: 0xccd4dc, conc: 0xd6d9db, roofTint: 0x9fb2c4, glass: 0xcfdce8,
    signBg: '#0b0e13', signFg: '#d7e6ff', stripe2: '#f4b400', veg: 'tree',
    cars: [0x1a1a1a, 0xf4b400, 0xe8e8e8, 0x1a1a1a, 0x8c949c, 0xf4b400, 0x2a2f35, 0xc0c4c8], traffic: 1.6, blocks: 3, landmark: null,
    hall: { carpet: '#232a33', wall: '#e2e4e6', ceil: '#c9ccd0', signBg: '#0b0e13', signFg: '#ffffff', art: 'metal' } },
  // Heathrow — grey steel slab with the Heathrow-purple second band.
  EGLL: { roof: 'slab', panel: 0xd8d5cd, conc: 0xdcdad4, roofTint: 0xaeb4ba, glass: 0xd8dde2,
    signBg: '#1d1a26', signFg: '#e8ddff', stripe2: '#572c84', veg: 'shrub', cars: CARS_STD, traffic: 1.3, blocks: 1, landmark: null,
    hall: { carpet: '#33383e', wall: '#e5e3de', ceil: '#c6c4bc', signBg: '#17141f', signFg: '#d9c8ff', art: 'metal' } },
  OMDB: { roof: 'wave', panel: 0xf5ecd6, conc: 0xf0e9d8, roofTint: 0xefdfba, glass: 0xfff4dc,
    signBg: '#14342c', signFg: '#ffd98a', stripe2: null, veg: 'palm', cars: CARS_STD, traffic: 1.1, blocks: 2, landmark: null,
    hall: { carpet: '#274b45', wall: '#efe8da', ceil: '#ddd2ba', signBg: '#122b24', signFg: '#ffd98a', art: 'accent' } },
  WSSS: { roof: 'arch', panel: 0xe6efe6, conc: 0xe9efe6, roofTint: 0xd5e8d6, glass: 0xe6f2e4,
    signBg: '#2c1030', signFg: '#ffd7f2', stripe2: null, veg: 'tropical', cars: CARS_STD, traffic: 1, blocks: 1, landmark: null,
    hall: { carpet: '#2c4a3a', wall: '#e9e6da', ceil: '#d4dcc8', signBg: '#241028', signFg: '#ffb8e6', art: 'accent' } },
  // Tocumen, Panamá — tropical: terracotta-washed roof, orange + green double
  // band, lush broadleaf planting at the curb, Spanish signage (via ACCENTS).
  MPTO: { roof: 'wave', panel: 0xf7e7d0, conc: 0xf0e8d6, roofTint: 0xe8a075, glass: 0xfff4de,
    signBg: '#2c3418', signFg: '#ffe3b0', stripe2: '#2f9e5b', veg: 'tropical',
    cars: [0xe8e8e8, 0xd94f30, 0x1a1a1a, 0x2f7d4f, 0xf0d9a0, 0x8c949c, 0x1d3557, 0xe8e8e8], traffic: 1, blocks: 1, landmark: null,
    hall: { carpet: '#2f5240', wall: '#f0e4cd', ceil: '#ded2b8', signBg: '#1d2b16', signFg: '#ffc46b', art: 'wood' } },
};

// Region fallbacks for airports without an explicit entry (nearby generic
// airports built next to a featured one still shouldn't clone Tampa).
const REGION_DEFAULTS = [
  [/^(KR|JP|CN|TW|HK)$/, { roof: 'arch', panel: 0xdfe7ee, conc: 0xe9edf0, roofTint: 0xcfdce8, glass: 0xdfeaf2, signBg: '#0e2242', signFg: '#ffffff', veg: 'pine' }],
  [/^(GB|IE|FR|DE|NL|ES|IT|CH|AT|SE|NO|DK|FI|PL|CZ|PT|BE)$/, { roof: 'slab', panel: 0xd8d5cd, conc: 0xdcdad4, roofTint: 0xaeb4ba, glass: 0xd8dde2, signBg: '#1d1a26', signFg: '#e8ddff', veg: 'shrub' }],
  [/^(AE|QA|SA|KW|BH|OM)$/, { roof: 'wave', panel: 0xf5ecd6, conc: 0xf0e9d8, roofTint: 0xefdfba, glass: 0xfff4dc, signBg: '#14342c', signFg: '#ffd98a', veg: 'palm' }],
  [/^(PA|CR|GT|BZ|HN|SV|NI|DO|CU|JM|PR|CO|VE|EC|PE)$/, { roof: 'wave', panel: 0xf7e7d0, conc: 0xf0e8d6, roofTint: 0xe8a075, glass: 0xfff4de, signBg: '#2c3418', signFg: '#ffe3b0', veg: 'tropical' }],
  [/^(TH|SG|MY|ID|PH|VN|KH|LK|IN|BD)$/, { roof: 'arch', panel: 0xe6efe6, conc: 0xe9efe6, roofTint: 0xd5e8d6, glass: 0xe6f2e4, signBg: '#2c1030', signFg: '#ffd7f2', veg: 'tropical' }],
];
const BASE = { roof: 'wave', panel: 0xffffff, conc: 0xffffff, roofTint: 0xf5ead6, glass: 0xffffff, signBg: '#1d232b', signFg: '#f3f4f5', stripe2: null, veg: 'tree', cars: CARS_STD, traffic: 1, blocks: 0, landmark: null, hall: null };

// ---- [Every airport] generated identities for every NON-featured airport ----
// Owner's order (Nov 13): "make each airport have their own unique design."
// Deterministic per airport: an FNV-1a hash of the ICAO seeds a small PRNG and
// every choice is drawn from region-plausible lists layered over the region
// default / BASE the airport has today. Same airport in -> same identity out,
// on every reload; two different airports differ. The identity is a pure
// function of the airport's own record (icao, country, lat, lon, large), so a
// bare-ICAO call (env-hall) resolves the record through World and lands on the
// SAME identity as the object call the exterior build makes.
// Two layers, by what a choice costs:
//  - COLOUR layer (every airport): tint family multiplied over the region
//    palette, sign colour pair, car-palette rotation + regional accents, the
//    full hall palette, and a climate bend (desert warmth / boreal cool) from
//    climateFor(). Colours and atlas paint only — zero geometry, zero draw
//    calls, so this layer is free everywhere.
//  - GEOMETRY layer (roof form, vegetation kit, second-stripe presence,
//    landside blocks, curb-traffic density): seeded ONLY outside the featured
//    penumbra. Within 100 km of a featured airport the geometry fields stay
//    exactly what identityFor returns today — the featured scenes (and their
//    measured perf baselines, whose frames include the neighbours' terminals)
//    stay byte-stable, and the featured sets keep their art-directed regional
//    look. Everywhere else each airport gets its own silhouette too.
// The 12 hand-built IDENTITY entries above are returned untouched — generated
// identities never apply to featured airports.
const MACROS = [
  [/^(KR|JP|CN|TW|HK)$/, 'eastasia'],
  [/^(GB|IE|FR|DE|NL|ES|IT|CH|AT|SE|NO|DK|FI|PL|CZ|PT|BE)$/, 'europe'],
  [/^(AE|QA|SA|KW|BH|OM)$/, 'gulf'],
  [/^(PA|CR|GT|BZ|HN|SV|NI|DO|CU|JM|PR|CO|VE|EC|PE)$/, 'latam'],
  [/^(TH|SG|MY|ID|PH|VN|KH|LK|IN|BD)$/, 'seasia'],
];
// tint multipliers (r,g,b) applied over the region default's hex tints
const TINTS = {
  generic: [[1, 1, 1], [0.84, 0.88, 0.96], [0.97, 0.90, 0.78], [0.88, 0.93, 0.85], [0.93, 0.84, 0.80], [0.80, 0.85, 0.92]],
  eastasia: [[0.90, 0.93, 1.0], [1, 1, 1], [0.85, 0.88, 0.90], [0.96, 0.90, 0.82]],
  europe: [[0.92, 0.90, 0.86], [0.84, 0.88, 0.94], [1, 0.97, 0.90], [0.80, 0.86, 0.82]],
  gulf: [[1, 0.97, 0.88], [0.98, 0.92, 0.80], [0.94, 0.90, 0.84], [1, 1, 0.96]],
  latam: [[1, 0.95, 0.85], [0.92, 0.97, 0.90], [0.97, 0.88, 0.80], [1, 1, 1]],
  seasia: [[0.94, 0.97, 0.92], [1, 0.96, 0.88], [0.88, 0.92, 0.96], [0.97, 0.90, 0.78]],
};
const ROOFS = {
  generic: ['wave', 'slab', 'arch', 'mesa'], eastasia: ['arch', 'slab', 'wave'],
  europe: ['slab', 'arch', 'wave', 'mesa'], gulf: ['wave', 'arch', 'mesa'],
  latam: ['wave', 'arch', 'slab'], seasia: ['arch', 'wave', 'slab'],
};
const SIGNS = {
  generic: [['#1d232b', '#f3f4f5'], ['#14231d', '#ffd34d'], ['#232946', '#eebbc3'], ['#3a2e20', '#ffe9c9'], ['#101418', '#7fd4ff'], ['#2b1a2e', '#f5d90a']],
  eastasia: [['#101418', '#ff5a3c'], ['#0e1a2e', '#7fd4ff'], ['#1d232b', '#f3f4f5'], ['#14231d', '#a8e063']],
  europe: [['#1c2b39', '#f5f5f0'], ['#3d2c1e', '#ffd9a0'], ['#232323', '#ffb400'], ['#20303c', '#9fd8e8']],
  gulf: [['#2a2118', '#f7c873'], ['#14202a', '#e8f0f2'], ['#33241a', '#ffd34d'], ['#1d232b', '#f3f4f5']],
  latam: [['#123524', '#ffe45e'], ['#26355e', '#7fd4ff'], ['#3a1f16', '#ffb37f'], ['#1d232b', '#f3f4f5']],
  seasia: [['#0f2a1e', '#ffd34d'], ['#1b2a4a', '#f5d90a'], ['#2e1a12', '#ff9e5e'], ['#1d232b', '#f3f4f5']],
};
const STRIPES = {
  generic: ['#e8732f', '#2b6fd6', '#c8402e', '#1f7a4d'], eastasia: ['#e8392a', '#2b6fd6', '#f5d90a'],
  europe: ['#b03a2e', '#2e5f8a', '#e8a33d'], gulf: ['#c9a227', '#7a4a21', '#1f7a6d'],
  latam: ['#f29a4c', '#1f9d63', '#e8452c'], seasia: ['#f5a623', '#1f9d63', '#e84e8a'],
};
const VEGS = {
  generic: ['tree', 'shrub', 'cypress', 'pine'], eastasia: ['pine', 'tree', 'shrub', 'cypress'],
  europe: ['tree', 'pine', 'shrub', 'cypress'], gulf: ['palm', 'shrub', 'palm'],
  latam: ['palm', 'tropical', 'tree', 'palm'], seasia: ['tropical', 'palm', 'tree', 'tropical'],
};
const CAR_ACC = {
  generic: [0xb03030, 0x28418c], eastasia: [0xf0f0f0, 0x30343c], europe: [0x5a6e7f, 0x8c2f39],
  gulf: [0xf5f2ea, 0xc9a227], latam: [0xd9481f, 0x1f7a4d], seasia: [0xe8b13c, 0x2e7d5b],
};
const CARPETS = ['#274b4d', '#3d2b45', '#59331f', '#26343f', '#402830', '#1f3a2e', '#333d29', '#46351f'];
const WALLS = ['#ece4d4', '#e8e4da', '#dfe5e6', '#efe6da', '#e6ddce', '#dde3da'];
const CEILS = ['#d9d0bf', '#d5d8d2', '#cfd4d8', '#ddd5c4'];

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng32(seed) { let a = (seed >>> 0) || 1; return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; }
const mulT = (hex, t) => {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * t[0])), g = Math.min(255, Math.round(((hex >> 8) & 255) * t[1])), b = Math.min(255, Math.round((hex & 255) * t[2]));
  return (r << 16) | (g << 8) | b;
};
const PENUMBRA_KM = 100; // featured sets stay frozen inside this radius (see header)
function inPenumbra(rec) {
  if (!rec || typeof rec.lat !== 'number' || !World.featured || !World.featured.length) return false;
  for (const f of World.featured) { const F = World.byIcao.get(f); if (F && haversine(rec.lat, rec.lon, F.lat, F.lon) < PENUMBRA_KM * 1000) return true; }
  return false;
}

function genIdentity(rec) {
  const cc = rec.cc || '';
  let macro = 'generic', regDef = null;
  for (const [re, d] of REGION_DEFAULTS) if (re.test(cc)) { regDef = d; break; }
  for (const [re, m] of MACROS) if (re.test(cc)) { macro = m; break; }
  const base = { ...BASE, ...(regDef || {}) };
  const h = hashStr(rec.icao), R = rng32(h), pick = arr => arr[Math.floor(R() * arr.length)];
  const pen = inPenumbra(rec);
  // ---- colour layer (all airports)
  const t = pick(TINTS[macro]).slice();
  const clim = (typeof rec.lat === 'number') ? climateFor(rec.lat, rec.lon) : 'temperate';
  if (clim === 'desert') { t[0] = Math.min(1, t[0] * 1.02); t[1] = Math.min(1, t[1] * 0.99); t[2] *= 0.90; } // warm sand bend
  else if (clim === 'boreal') { t[0] *= 0.94; t[1] *= 0.97; t[2] = Math.min(1, t[2] * 1.03); } // cold pale bend
  const rt = 0.9 + R() * 0.1; // roof reads a touch greyer/darker than the walls
  const sp = pick(SIGNS[macro]);
  const rot = h % CARS_STD.length, cars = CARS_STD.map((_, i) => CARS_STD[(i + rot) % CARS_STD.length]);
  const acc = CAR_ACC[macro]; cars[3] = acc[0]; cars[6] = acc[1];
  const hall = {
    carpet: pick(CARPETS), wall: pick(WALLS), ceil: pick(CEILS),
    signBg: sp[0], signFg: sp[1], way: sp[0], art: pick(['wood', 'metal', 'accent']),
  };
  // ---- geometry layer (outside the featured penumbra only)
  let roof = base.roof, veg = base.veg, stripe2 = base.stripe2, blocks = base.blocks || 0, traffic = base.traffic || 1;
  if (!pen) {
    roof = R() < 0.5 ? base.roof : pick(ROOFS[macro]);
    let vegList = VEGS[macro];
    if (clim === 'desert') vegList = ['palm', 'shrub', 'palm'];
    else if (clim === 'boreal') vegList = ['pine', 'shrub', 'pine', 'tree']; // snow belt
    else if (clim === 'tropical') vegList = ['palm', 'tropical', 'palm', 'tree'];
    else if (clim === 'subtropical') vegList = [...vegList, 'palm'];
    veg = pick(vegList);
    stripe2 = R() < 0.45 ? pick(STRIPES[macro]) : null;
    traffic = 0.9 + Math.floor(R() * 5) * 0.1;
    blocks = Math.floor(R() * 3) + (rec.large ? 1 : 0);
  }
  return {
    roof, panel: mulT(base.panel, t), conc: mulT(base.conc, t),
    roofTint: mulT(base.roofTint, [t[0] * rt, t[1] * rt, t[2] * rt]), glass: mulT(base.glass, t),
    signBg: sp[0], signFg: sp[1], stripe2, veg, cars, traffic, blocks, landmark: null, hall,
    gen: true, penumbra: pen, // [Every airport] provenance for audits/tests; consumers ignore these
  };
}

const GEN = new Map(); // icao -> generated identity (pure function of the record; this is only a memo)

// apt may be a world.json airport object ({icao, cc}), an ICAO string, or null.
export function identityFor(apt) {
  const icao = typeof apt === 'string' ? apt : apt?.icao;
  if (icao && IDENTITY[icao]) return IDENTITY[icao];
  if (icao) {
    const hit = GEN.get(icao); if (hit) return hit;
    const rec = (apt && typeof apt === 'object') ? apt : (World.byIcao.get(icao) || { icao, cc: '' });
    const id = genIdentity(rec); GEN.set(icao, id); return id;
  }
  const cc = (apt && typeof apt === 'object' && apt.cc) || '';
  for (const [re, d] of REGION_DEFAULTS) if (re.test(cc)) return { ...BASE, ...d };
  return BASE;
}
