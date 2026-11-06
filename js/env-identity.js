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
    cars: [0xf6ead8, 0xf3c6d3, 0xbfe3dd, 0xe8e8e8, 0x8c949c, 0x7a1d1d, 0x1d3557, 0xf0d9a0], traffic: 1.1, blocks: 0, landmark: null,
    hall: { carpet: '#31586b', wall: '#f2e8dc', ceil: '#e3d9c8', signBg: '#123a44', signFg: '#ff9ebb', art: 'accent' } },
  // Incheon — sleek Korean modern: one sweeping pale arch, blue-grey metal and
  // glass, navy signage, pines at the curb.
  RKSI: { roof: 'arch', panel: 0xdfe7ee, conc: 0xe9edf0, roofTint: 0xcfdce8, glass: 0xdfeaf2,
    signBg: '#0e2242', signFg: '#ffffff', stripe2: null, veg: 'pine',
    cars: [0xe8e8e8, 0xc0c4c8, 0x1a1a1a, 0xe8e8e8, 0x8c949c, 0x2a2f35, 0xd9d2c3, 0x1d3557], traffic: 1.2, blocks: 0, landmark: null,
    hall: { carpet: '#2c3e50', wall: '#e9e9e6', ceil: '#ccd4da', signBg: '#10243e', signFg: '#dbe9fa', art: 'metal' } },
  RKSS: { roof: 'wave', panel: 0xe4e9ee, conc: 0xe9edf0, roofTint: 0xd8e2ea, glass: 0xdfeaf2,
    signBg: '#0e2242', signFg: '#ffffff', stripe2: null, veg: 'pine',
    cars: [0xe8e8e8, 0xc0c4c8, 0x1a1a1a, 0xe8e8e8, 0x8c949c, 0x2a2f35, 0xd9d2c3, 0x1d3557], traffic: 1.1, blocks: 0, landmark: null,
    hall: { carpet: '#2c3e50', wall: '#e9e9e6', ceil: '#d3dade', signBg: '#10243e', signFg: '#dbe9fa', art: 'metal' } },
  RJTT: { roof: 'wave', panel: 0xf0ece2, conc: 0xeeece6, roofTint: 0xe8e0cc, glass: 0xf2ece2,
    signBg: '#1c1a24', signFg: '#f2d8d8', stripe2: null, veg: 'pine', cars: CARS_STD, traffic: 1.1, blocks: 0, landmark: null,
    hall: { carpet: '#33404d', wall: '#ecebe4', ceil: '#d8d2c4', signBg: '#1c1a24', signFg: '#f0d9a8', art: 'wood' } },
  // Los Angeles — basin light, warm sand, a low wide mesa roof, palms, and the
  // mid-century Theme Building standing on the landside.
  KLAX: { roof: 'mesa', panel: 0xf3e9d4, conc: 0xefe9da, roofTint: 0xeee0bc, glass: 0xfff2da,
    signBg: '#33241a', signFg: '#ffd9a0', stripe2: null, veg: 'palm', cars: CARS_STD, traffic: 1.2, blocks: 1, landmark: 'theme',
    hall: { carpet: '#3a4a56', wall: '#ece1cd', ceil: '#ddd2bc', signBg: '#241c14', signFg: '#ffc46b', art: 'wood' } },
  KSFO: { roof: 'slab', panel: 0xe2e6e1, conc: 0xe6e8e2, roofTint: 0xd6dbd2, glass: 0xe4ecec,
    signBg: '#26343a', signFg: '#ffd9c9', stripe2: null, veg: 'cypress', cars: CARS_STD, traffic: 1, blocks: 0, landmark: null,
    hall: { carpet: '#2e4a4a', wall: '#e8e6de', ceil: '#cfd4cc', signBg: '#1e2c30', signFg: '#ffb59d', art: 'metal' } },
  // New York — glass-and-steel: cool blue-grey cladding, a dark flat slab roof,
  // a taxi-yellow second band, denser landside (extra blocks, more traffic).
  KJFK: { roof: 'slab', panel: 0xccd4dc, conc: 0xd6d9db, roofTint: 0x9fb2c4, glass: 0xcfdce8,
    signBg: '#0b0e13', signFg: '#d7e6ff', stripe2: '#f4b400', veg: 'tree',
    cars: [0x1a1a1a, 0xf4b400, 0xe8e8e8, 0x1a1a1a, 0x8c949c, 0xf4b400, 0x2a2f35, 0xc0c4c8], traffic: 1.6, blocks: 3, landmark: null,
    hall: { carpet: '#232a33', wall: '#e2e4e6', ceil: '#c9ccd0', signBg: '#0b0e13', signFg: '#ffffff', art: 'metal' } },
  EGLL: { roof: 'slab', panel: 0xd8d5cd, conc: 0xdcdad4, roofTint: 0xaeb4ba, glass: 0xd8dde2,
    signBg: '#1d1a26', signFg: '#e8ddff', stripe2: null, veg: 'shrub', cars: CARS_STD, traffic: 1.3, blocks: 1, landmark: null,
    hall: { carpet: '#33383e', wall: '#e5e3de', ceil: '#c6c4bc', signBg: '#17141f', signFg: '#d9c8ff', art: 'metal' } },
  OMDB: { roof: 'wave', panel: 0xf5ecd6, conc: 0xf0e9d8, roofTint: 0xefdfba, glass: 0xfff4dc,
    signBg: '#14342c', signFg: '#ffd98a', stripe2: null, veg: 'palm', cars: CARS_STD, traffic: 1.1, blocks: 1, landmark: null,
    hall: { carpet: '#274b45', wall: '#efe8da', ceil: '#ddd2ba', signBg: '#122b24', signFg: '#ffd98a', art: 'accent' } },
  WSSS: { roof: 'arch', panel: 0xe6efe6, conc: 0xe9efe6, roofTint: 0xd5e8d6, glass: 0xe6f2e4,
    signBg: '#2c1030', signFg: '#ffd7f2', stripe2: null, veg: 'tropical', cars: CARS_STD, traffic: 1, blocks: 0, landmark: null,
    hall: { carpet: '#2c4a3a', wall: '#e9e6da', ceil: '#d4dcc8', signBg: '#241028', signFg: '#ffb8e6', art: 'accent' } },
  // Tocumen, Panamá — tropical: terracotta-washed roof, orange + green double
  // band, lush broadleaf planting at the curb, Spanish signage (via ACCENTS).
  MPTO: { roof: 'wave', panel: 0xf7e7d0, conc: 0xf0e8d6, roofTint: 0xe8a075, glass: 0xfff4de,
    signBg: '#2c3418', signFg: '#ffe3b0', stripe2: '#2f9e5b', veg: 'tropical',
    cars: [0xe8e8e8, 0xd94f30, 0x1a1a1a, 0x2f7d4f, 0xf0d9a0, 0x8c949c, 0x1d3557, 0xe8e8e8], traffic: 1, blocks: 0, landmark: null,
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

// apt may be a world.json airport object ({icao, cc}), an ICAO string, or null.
export function identityFor(apt) {
  const icao = typeof apt === 'string' ? apt : apt?.icao, cc = typeof apt === 'string' ? '' : (apt?.cc || '');
  if (icao && IDENTITY[icao]) return IDENTITY[icao];
  for (const [re, d] of REGION_DEFAULTS) if (re.test(cc)) return { ...BASE, ...d };
  return BASE;
}
