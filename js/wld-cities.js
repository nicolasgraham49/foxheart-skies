// City realism: per-city SKYLINE parameters for the featured regions (surroundings.js).
// The downtown cores already exist as analytic city blobs ({lat, lon, r, d, h} — position,
// radius, density, tallest-building height). What they lacked was identity: every core
// extruded the same blue-grey glass. This table gives each featured city a glass tint
// family, a masonry tint family and an accent colour (drawn from the airport identity
// palette in env-identity.js — Tampa teal, Miami pink, JFK taxi yellow, Heathrow purple,
// Haneda red, Dubai gold...), plus a peak-height scale and a tower-density scale.
// terrain.js (City) turns each qualifying core blob (h >= 90, d >= 0.75) into a skyline
// cluster via wld-hood.js genSkyline(); the parameters live here so a city is tuned by
// editing one row, never by hand-building a scene.
import { REGIONS } from './surroundings.js';

// glass / wall: linear RGB base tints for tower instance colours (varied per tower by hash)
// accent: a minority of towers take this tint (the city's signature colour)
// hScale: skyline peak height as a fraction of the blob's tallest-building height
// density: tower spacing scale (1 = the standard ~62 m jittered grid, higher = tighter)
export const SKYLINE = {
  tampa:     { glass: [0.40, 0.51, 0.57], wall: [0.76, 0.72, 0.66], accent: [0.15, 0.44, 0.44], hScale: 0.95, density: 1.0 },
  miami:     { glass: [0.54, 0.62, 0.63], wall: [0.92, 0.85, 0.78], accent: [0.96, 0.64, 0.72], hScale: 1.0, density: 1.1 },
  seoul:     { glass: [0.44, 0.51, 0.59], wall: [0.79, 0.81, 0.83], accent: [0.19, 0.29, 0.54], hScale: 1.0, density: 1.25 },
  la:        { glass: [0.49, 0.54, 0.59], wall: [0.84, 0.79, 0.71], accent: [0.84, 0.61, 0.34], hScale: 1.0, density: 1.0 },
  sf:        { glass: [0.47, 0.55, 0.57], wall: [0.81, 0.81, 0.79], accent: [0.12, 0.47, 0.42], hScale: 0.95, density: 1.0 },
  nyc:       { glass: [0.39, 0.46, 0.55], wall: [0.60, 0.56, 0.52], accent: [0.95, 0.70, 0.09], hScale: 1.0, density: 1.3 },
  panama:    { glass: [0.51, 0.59, 0.61], wall: [0.89, 0.83, 0.75], accent: [0.17, 0.61, 0.35], hScale: 1.0, density: 1.0 },
  tokyo:     { glass: [0.43, 0.49, 0.57], wall: [0.79, 0.78, 0.76], accent: [0.64, 0.09, 0.17], hScale: 1.0, density: 1.3 },
  london:    { glass: [0.41, 0.47, 0.55], wall: [0.64, 0.60, 0.56], accent: [0.33, 0.16, 0.51], hScale: 0.95, density: 1.1 },
  dubai:     { glass: [0.54, 0.57, 0.54], wall: [0.87, 0.81, 0.67], accent: [0.97, 0.79, 0.44], hScale: 1.0, density: 1.0 },
  singapore: { glass: [0.45, 0.54, 0.54], wall: [0.83, 0.85, 0.81], accent: [0.89, 0.44, 0.69], hScale: 1.0, density: 1.15 },
};
const FALLBACK = { glass: [0.45, 0.51, 0.57], wall: [0.74, 0.71, 0.66], accent: [0.5, 0.5, 0.48], hScale: 1.0, density: 1.0 };

const REGION_OF = new Map();
for (const r of REGIONS) for (const c of r.cities) REGION_OF.set(c, r.id);

// A city blob from the masks (the same object as in REGIONS) -> its skyline style,
// or null when the blob is not a skyline core (too low / too sparse to read as a downtown).
export function skylineStyle(cityObj) {
  if (!cityObj || cityObj.h < 90 || cityObj.d < 0.75) return null;
  const id = REGION_OF.get(cityObj);
  return (id && SKYLINE[id]) || FALLBACK;
}
export function regionIdOf(cityObj) { return REGION_OF.get(cityObj) || null; }
