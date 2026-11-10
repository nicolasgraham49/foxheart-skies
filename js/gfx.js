// Shared graphics-capability state, published by main.js at boot.
//
// The quality tier NAME does not guarantee the GPU can run what the tier implies.
// On some Windows (ANGLE/D3D) drivers, a multisampled HalfFloat post-processing
// target is not renderable: the composer chain then silently outputs pure black
// while the DOM/HUD stays alive (the owner's High/Ultra black screen, Nov 2026 —
// Medium, which uses samples: 0, was fine). main.js therefore probes the real
// composer at boot with a known-bright scene and records what ACTUALLY works on
// this GPU; other systems consult this state instead of assuming from the tier.
export const GFX = { msaa: true, composer: true };

const _msaaListeners = [];

// Publish the MSAA verdict (called by main.js after the boot probe / fallback).
export function setMsaaActive(v) {
  GFX.msaa = !!v;
  for (const f of _msaaListeners) { try { f(GFX.msaa); } catch (e) { } }
}

// Register interest in the MSAA verdict. Fires immediately if MSAA is already
// known dead, and again if the verdict changes later.
export function onMsaaChange(f) {
  _msaaListeners.push(f);
  if (!GFX.msaa) { try { f(false); } catch (e) { } }
}
