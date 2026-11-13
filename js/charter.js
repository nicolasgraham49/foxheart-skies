// Foxheart Skies — [Private charter] (era two, piece one).
//
// The owner's wish (10 Nov): "I want to fly private as well, for private people." He picked
// charter first of the era-two pieces. This is the opposite of the 121-passenger airline
// machine: a small jet (the PJ-1, see ac-types.js), a handful of NAMED clients who booked
// YOU, and one flight that is entirely theirs.
//
// The shape mirrors the Stories era deliberately, because it works: a roster in rotation
// (no repeat until exhausted, then the cycle restarts), an on-foot encounter in the
// departure lounge (marker, prompt, a card in the clients' own words), ONE cruise beat if
// you said hello, and a written keepsake that lands in the logbook when the trip completes
// — here, the Charter Book (fox.charterNotes; "Clear logbook" never touches it, exactly
// like the Letters). Two honest differences from Stories, by design:
//   · the clients ARE the whole manifest — main.js narrows the flight's passenger count to
//     the contract's party size (ac-types.setFlightPax + a per-flight cabin re-apply), so
//     the lounge holds only them and boarding seats exactly them;
//   · the note lands whether or not you stopped to say hello — they booked you, and a
//     thank-you is part of the service. The cruise beat still belongs to the hello alone.
// Skipping the hello never blocks the flight. Nothing here moves the aircraft, touches the
// sign-in gate, or knows about FLY_ANYWHERE (which stays OFF).
import * as THREE from 'three';

// ---------------------------------------------------------------- the contracts
// name = the lead client (the prompt and the card speak to them); party = how many people
// are aboard, lead included; meet = the card lines, in their voices; beat = the one cruise
// moment (only if you met them); note = the Charter Book entry they leave after landing.
export const CONTRACTS = [
  {
    id: 'hartleys', title: 'The Hartleys — just married', name: 'June Hartley', party: 2,
    partyLabel: 'June & Ellis Hartley', from: 'KTPA', to: 'KMIA', tod: 630, wx: 'clear',
    occasion: 'Married this morning at the courthouse — the honeymoon starts the second the wheels leave Tampa.',
    meet: [
      '“Captain? Hi — I’m June, this is Ellis. We got married at nine this morning. The ink on the certificate is barely dry.”',
      '“Everyone said we were mad to book a jet on a courthouse budget. Then Ellis sold his boat. His BOAT, captain.”',
      '“I don’t care about the champagne or the leather seats. I just want the first hour of being his wife to be up in the sky.”',
    ],
    beat: 'In the back of the little jet, June Hartley has fallen asleep against her husband’s shoulder, still wearing her courthouse shoes. Ellis catches your eye in the mirror and mouths: thank you.',
    note: [
      'Captain — we keep saying it: that was the best first hour of a marriage anyone ever had.',
      'Ellis cried at the Gulf. Don’t tell him I told you. June did too, so we’re even.',
      '— June & Ellis',
    ],
  },
  {
    id: 'osei', title: 'Dr. Osei’s keynote', name: 'Dr. Amara Osei', party: 3,
    partyLabel: 'Dr. Amara Osei, her sister Adaeze & Dr. Lena Vogt', from: 'KJFK', to: 'EGLL', tod: 1080, wx: 'scattered',
    occasion: 'She presents the keynote at a surgical conference in London tomorrow — and refused to arrive exhausted.',
    meet: [
      '“Captain Graham? Amara Osei. Tomorrow I stand up in London and tell four hundred surgeons what my team found.”',
      '“The airline would have had me presenting on three hours of sleep and airport coffee. My sister vetoed that. She is usually right.”',
      '“All I ask is a smooth night and a quiet cabin. The slides are done. Tonight, somebody else flies.”',
    ],
    beat: 'Dr. Osei is asleep over the Atlantic with her shoes off and her slides face-down — the first time in months, her sister whispers, that she has stopped rehearsing.',
    note: [
      'Captain — I slept six hours over the Atlantic and woke up over Ireland feeling like a person, not a presentation.',
      'The keynote went well. Four hundred surgeons, and I told them the truth slowly, the way you flew us: no hurry, no drama.',
      'You will be our first call for the return. — A. Osei',
    ],
  },
  {
    id: 'vidal', title: 'Abuelo’s surprise', name: 'Ramón Vidal', party: 6,
    partyLabel: 'Ramón Vidal, his sister Luisa & four of the family', from: 'MPTO', to: 'KTPA', tod: 600, wx: 'clear',
    occasion: 'The grandchildren in Tampa think Abuelo is still in Panamá. He has other plans.',
    meet: [
      '“Capitán. Ramón Vidal. In Tampa there are three grandchildren who believe their abuelo is too old to travel. ¡Ja!”',
      '“My daughter booked this aeroplane and swore everyone to secrecy. Six Vidals keeping a secret — that is the real miracle, not the flight.”',
      '“When we land, I walk in with the pasteles and I do NOT knock. Fly us gentle, capitán. The surprise is precious cargo.”',
    ],
    beat: 'Somewhere over the Gulf, Ramón Vidal is teaching the whole cabin a song his mother sang — six Vidals, three generations of harmony, none of it in tune and all of it perfect.',
    note: [
      'Capitán — he walked in without knocking, exactly as planned. The screaming could be heard in two counties.',
      'The grandchildren have not let go of him since. Abuelo slept eleven hours and woke up asking for breakfast AND lunch.',
      'The family thanks you. The pasteles survived the flight. Ramón did not share them. — the Vidals',
    ],
  },
  {
    id: 'loworbit', title: 'Low Orbit, quietly', name: 'Wren Callahan', party: 4,
    partyLabel: 'Wren, Milo, June & Theo — the band Low Orbit', from: 'KLAX', to: 'KSFO', tod: 1290, wx: 'clear',
    occasion: 'Four musicians, no entourage, no posts — a quiet getaway between tours, guitars riding in the hold.',
    meet: [
      '“Hey. Wren. That’s Milo, June, Theo — we’re Low Orbit, but tonight we’d rather be nobody at all.”',
      '“Arena tour ended Tuesday. Forty-one shows. Our manager thinks we’re at a spa. There is no spa. There’s this plane and then a house with no wifi.”',
      '“Guitars are in the hold, phones are off. Fly us up the coast slow, captain. We’ve earned the dark.”',
    ],
    beat: 'The cabin of the little jet is dark and quiet up the coast — four musicians asleep in a row, and the only music is the hush of the engines and the city lights sliding past below.',
    note: [
      'Captain — nobody knew where we were for three days. Do you know what that’s worth to us?',
      'We wrote two songs at the house. One of them is about the flight up. You’ll know it when you hear it.',
      'Same time after the next tour. Phones off. — W.',
    ],
  },
  {
    id: 'sato', title: 'The Satos, just the two of them', name: 'Kenji Sato', party: 2,
    partyLabel: 'Kenji & Aya Sato', from: 'RJTT', to: 'RKSI', tod: 700, wx: 'scattered',
    occasion: 'Their first trip alone since their daughter was born — grandma has the baby, and the house is quiet.',
    meet: [
      '“Captain, hello. Kenji Sato — this is my wife, Aya. It is our first trip alone since our daughter was born, fourteen months ago.”',
      '“Grandma has her. We have called four times already. Aya made me put the phone in the bag. The bag is in the hold. Aya is very wise.”',
      '“Two days in Seoul. We will eat slowly, walk slowly, sleep in the middle of the bed. That is the whole plan. It is a perfect plan.”',
    ],
    beat: 'Over the sea to Seoul, Kenji and Aya Sato are watching a film on one screen, sharing one set of earphones — and Aya is asleep before the opening scene ends.',
    note: [
      'Captain — we ate slowly. We walked slowly. Aya slept in the middle of the bed AND the middle of your aeroplane.',
      'Our daughter grew, we are quite sure, an entire centimetre while we were gone. Worth it. Every minute.',
      'Thank you for flying us like we were the only people in the sky. — Kenji & Aya',
    ],
  },
  {
    id: 'bell', title: 'The fishing crew, all eight', name: 'Marcus Bell', party: 8,
    partyLabel: 'Marcus Bell & seven old friends', from: 'KMIA', to: 'KTPA', tod: 1020, wx: 'scattered',
    occasion: 'Fifty years since the fishing trip that started it all — the whole crew together for the first time in a decade.',
    meet: [
      '“Captain! Marcus Bell. Count ’em — eight. First time we’ve all been in one place in ten years, and it took a private jet to do it.”',
      '“Fifty years ago we took a leaky boat out of Miami and caught nothing but sunburn and one story we’ve been telling ever since.”',
      '“Now the boat’s a charter out of Tampa and the crew flies in style. Get us there safe, captain — the fish have had a decade to get cocky.”',
    ],
    beat: 'Eight old friends in a little jet over the Everglades, and the cabin is LOUD — the leaky-boat story is being told again, all eight of them talking at once, every version different.',
    note: [
      'Captain — eight for eight, all landed, all fed, all lying about the one that got away by sundown.',
      'Same crew, same boat, fifty years on. You started it right. The fish send their regards and their relief that it’s over.',
      '— Marcus, for the crew',
    ],
  },
  {
    id: 'almeida', title: 'The Almeidas move to Singapore', name: 'Sofia Almeida', party: 4,
    partyLabel: 'Sofia Almeida, her parents & her brother Tomás', from: 'OMDB', to: 'WSSS', tod: 960, wx: 'clear',
    occasion: 'A new job and a new life in Singapore — the whole family came along to hand her over to it properly.',
    meet: [
      '“Captain, hi — Sofia. Tomorrow I start a new job in a city I’ve visited twice. Today my whole family insists on delivering me in person.”',
      '“Mum has packed food for the flight, for the arrival, and possibly for the first month. Tomás has packed opinions. Dad has packed tissues and is pretending he hasn’t.”',
      '“It’s a long way to fly to a new life. I’m glad I don’t have to do the first part alone.”',
    ],
    beat: 'Halfway to Singapore, Sofia Almeida’s father has finally fallen asleep — and her mother is quietly putting a blanket over him, the way she has for forty years, at 41,000 feet.',
    note: [
      'Captain — Sofia starts Monday. Her flat is small, her team seems kind, and her mother has already filled her freezer from three thousand miles of planning.',
      'Dad cried at the airport, then denied it all the way home. He asked us to thank “the young captain who flew her gentle.”',
      'She was delivered properly. — the Almeidas',
    ],
  },
  {
    id: 'briggs', title: 'One more Atlantic crossing', name: 'Walter Briggs', party: 2,
    partyLabel: 'Walter Briggs & his daughter Claire', from: 'EGLL', to: 'KJFK', tod: 690, wx: 'overcast',
    occasion: 'He crossed this ocean as a young engineer in 1974. His daughter booked the jet so he could do it once more — his way.',
    meet: [
      '“Captain. Walter Briggs. In 1974 I crossed this ocean as a junior engineer with a slide rule and a window seat I never looked away from.”',
      '“My daughter says the airlines would rush me. Claire booked you instead. She says I am to be flown like a person, not a parcel.”',
      '“Window seat, captain, if the little aeroplane allows it. I intend to watch the whole Atlantic go by, same as last time.”',
    ],
    beat: 'Walter Briggs has not moved from the window for an hour — ocean, cloud, ocean — while his daughter watches HIM the way he watches the sea.',
    note: [
      'Captain — Dad watched the whole Atlantic. Somewhere mid-ocean he went quiet, and then he said: “Still there. So am I.”',
      'He talked about 1974 all the way home from the airport, like a man half his age. You gave him back a piece of his own story.',
      'Flown like a person. Exactly as booked. — Claire Briggs',
    ],
  },
];

// ---------------------------------------------------------------- storage
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
export function notes() { const L = lsGet('fox.charterNotes', []); return Array.isArray(L) ? L : []; }
function cycle() { const c = lsGet('fox.charterCycle', null); return c && Array.isArray(c.used) ? c : { used: [] }; }
export function usedIds() { return cycle().used.slice(); }
export function byId(id) { return CONTRACTS.find(c => c.id === id) || null; }
// The next booking the rotation would offer (the board still lets the captain pick any
// unflown contract — flying one consumes it, exactly like choosing a story out of order).
export function nextContract() {
  const used = cycle().used;
  for (const c of CONTRACTS) if (!used.includes(c.id)) return c;
  lsSet('fox.charterCycle', { used: [] }); // roster exhausted: the cycle restarts, notes stay
  return CONTRACTS[0];
}
function consume(id) { const c = cycle(); if (!c.used.includes(id)) { c.used.push(id); lsSet('fox.charterCycle', c); } }

// ---------------------------------------------------------------- per-flight state
const S = {
  contract: null,   // the contract this flight is flying
  foot: null,       // the OnFoot instance it was armed on
  fig: null,        // the lounge figure carrying the lead client (term-local coords)
  marker: null,     // the little heart sprite over their head
  markerBaseY: 0,
  met: false,       // the captain stopped to meet them
  beatShown: false, // the cruise beat already surfaced
  cruiseSince: 0,   // wall-clock start of the current continuous cruise stretch
  done: false,      // trip completed / consumed
};

export function reset() {
  S.contract = null; S.foot = null; S.fig = null; S.marker = null; S.met = false; S.beatShown = false; S.cruiseSince = 0; S.done = false;
  const el = document.getElementById('charterCard'); if (el) el.remove();
}

// Register the flight's contract at flight start (called by main.js for EVERY charter
// start, gate included): the client's note is part of the service whether or not the
// captain met them in the terminal. The meetable figure is a terminal-start extra,
// attached by arm() below.
export function setContract(id) {
  S.contract = byId(id); S.met = false; S.beatShown = false; S.cruiseSince = 0; S.done = false;
  return S.contract;
}

// Arm the encounter for a charter terminal departure (called by main.js instead of
// Stories.arm on a charter flight): the lounge holds ONLY the clients (the flight's
// passenger count was narrowed to the party), and the lead client waits with the last
// boarding group, so the captain has the whole pre-boarding window to find them.
export function arm(foot, contract) {
  if (!foot || !foot.parts || !foot.parts.term || !contract) return false;
  if (S.contract && S.foot === foot) return true; // already armed on this terminal build
  const term = foot.parts.term, figs = term.flightPax || [];
  if (!figs.length) return false;
  let maxG = 0; for (const p of figs) if (p.bp && p.bp.group > maxG) maxG = p.bp.group;
  const fig = figs.find(p => p.bp && p.bp.group === maxG) || figs[figs.length - 1];
  if (!fig) return false;
  S.contract = contract; S.foot = foot; S.fig = fig; S.met = false; S.beatShown = false; S.cruiseSince = 0; S.done = false;
  foot.charterFig = fig; foot.charterName = contract.name; foot.charterMet = false;
  // the marker: the same little fox-orange heart the story passengers wear (a sprite — no
  // people-system cost), so a charter client reads the same way in the lounge.
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d'); cx.font = '104px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.shadowColor = 'rgba(120,50,5,.95)'; cx.shadowBlur = 7; cx.fillStyle = '#e8721c'; cx.fillText('♥', 64, 70); cx.fillText('♥', 64, 70);
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    S.marker = new THREE.Sprite(mat); S.marker.scale.set(0.36, 0.36, 1);
    S.markerBaseY = fig.y + 2.05; S.marker.position.set(fig.x, S.markerBaseY, fig.z);
    term.group.add(S.marker);
  } catch (e) { S.marker = null; }
  return true;
}

// Is the captain standing close enough to meet the client? (term-local distance)
export function nearFig(foot) {
  if (!S.contract || S.met || !S.fig || !foot || !foot.parts || !foot.parts.term) return false;
  const bp = S.fig.bp; if (bp && bp.state !== 'wait') return false; // they've been called — the moment has passed
  const lp = foot.parts.term.group.worldToLocal(foot.pos.clone());
  return Math.hypot(lp.x - S.fig.x, lp.z - S.fig.z) < 2.4;
}

// E pressed near the lead client: open the meeting card. True = the press was used.
export function tryMeet(foot) {
  if (!nearFig(foot)) return false;
  S.met = true; if (foot) foot.charterMet = true;
  if (S.marker) { S.marker.visible = false; }
  showCard(S.contract);
  return true;
}

function showCard(c) {
  try {
    const old = document.getElementById('charterCard'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'charterCard';
    el.style.cssText = 'position:fixed;left:18px;top:64px;width:308px;background:#10161f;color:#eef2f6;border-radius:10px;box-shadow:0 10px 34px rgba(0,0,0,.45);font:13px/1.55 system-ui,sans-serif;padding:0 0 12px;overflow:hidden;opacity:0;transition:opacity .45s;pointer-events:none;z-index:60;border-top:3px solid #e07f2e';
    el.innerHTML = '<div style="background:#0d2b4c;color:#fff;padding:7px 12px;font-weight:700;letter-spacing:.06em">YOUR CHARTER <span style="float:right;font-weight:400;color:#e8a35c">' + c.from + ' → ' + c.to + '</span></div>'
      + '<div style="padding:10px 14px 0"><b style="font-size:16px">' + c.name + '</b><br><span style="color:#9fb2c3">' + c.partyLabel + ' · ' + c.party + ' aboard</span><br><span style="color:#c8d4e0">' + c.occasion + '</span></div>'
      + c.meet.map(l => '<div style="padding:7px 14px 0">' + l + '</div>').join('')
      + '<div style="padding:12px 14px 0"><button id="charterCardBtn" style="pointer-events:auto;cursor:pointer;background:#e07f2e;color:#14100b;border:0;border-radius:7px;padding:8px 14px;font:600 13px system-ui,sans-serif">See you aboard ✈</button></div>';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    const close = () => { el.style.opacity = '0'; setTimeout(() => el.remove(), 600); };
    el.querySelector('#charterCardBtn').onclick = close;
    setTimeout(() => { if (el.isConnected) close(); }, 45000); // never trap the captain behind a card
  } catch (e) { }
}

// Per-frame tick (called from the main frame loop, same env as Stories.frame): keep the
// marker bobbing while the client waits, and surface the one cruise beat — wall-clock
// timed, twenty real seconds into a continuous cruise stretch, exactly once, and only
// if the captain stopped to meet them.
export function frame(dt, env) {
  if (S.marker && S.fig && !S.met) {
    const bp = S.fig.bp;
    if (bp && bp.state === 'gone') S.marker.visible = false;
    else { S.marker.visible = true; S.marker.position.set(S.fig.x, S.markerBaseY + Math.sin(performance.now() / 480) * 0.07, S.fig.z); }
  }
  if (!S.contract || !S.met || S.beatShown || S.done) { S.cruiseSince = 0; return; }
  if (env && env.phase === 'cruise' && !env.onGround) {
    const now = performance.now();
    if (!S.cruiseSince) S.cruiseSince = now;
    else if (now - S.cruiseSince >= 20000) { S.beatShown = true; if (env.toast) env.toast(S.contract.beat, 9000); }
  } else S.cruiseSince = 0;
}

// Trip completion (from finishTrip): the contract is consumed either way; the clients'
// note lands either way too (they booked the captain — a thank-you is part of the
// service), carrying the landing as their satisfaction. Returns the note written.
export function completeTrip(info) {
  if (!S.contract || S.done) return null;
  S.done = true;
  const c = S.contract; consume(c.id);
  const note = {
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    route: info.from + '→' + info.to, flight: 'Charter',
    id: c.id, name: c.partyLabel, title: c.title,
    score: info.score != null ? info.score : null, grade: info.grade || null, fpm: info.fpm != null ? info.fpm : null,
    text: c.note.slice(),
  };
  const all = notes(); all.unshift(note); lsSet('fox.charterNotes', all.slice(0, 60));
  return note;
}

// The logbook's Charter Book section (rendered by main.js renderLog under the Letters).
export function charterBookHtml() {
  const all = notes(); if (!all.length) return '';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return '<div class="sechead" style="margin-top:28px"><h3 style="margin:0">✦ The Charter Book</h3></div>'
    + '<p style="color:var(--mute);margin:4px 0 14px">From the people who booked you. They keep too.</p>'
    + all.map(n => '<div style="border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:14px 16px;margin:0 0 12px;background:rgba(255,255,255,.03)">'
      + '<div style="margin-bottom:6px"><b>' + esc(n.name) + '</b> <span style="color:var(--mute)">· ' + esc(n.date) + ' · ' + esc(n.route) + '</span></div>'
      + (n.score != null ? '<div style="margin-bottom:6px;color:var(--fox2)">Client satisfaction — landing ' + esc(n.score) + '/100 · ' + esc(n.grade || '') + (n.fpm != null ? ' · ' + esc(n.fpm) + ' fpm' : '') + '</div>' : '')
      + n.text.map(p => '<p style="margin:0 0 6px">' + esc(p) + '</p>').join('') + '</div>').join('');
}

export function state() {
  return {
    armed: !!S.contract, id: S.contract ? S.contract.id : null, name: S.contract ? S.contract.name : null,
    party: S.contract ? S.contract.party : null,
    met: S.met, beatShown: S.beatShown, done: S.done,
    figGroup: S.fig && S.fig.bp ? S.fig.bp.group : null,
    figState: S.fig && S.fig.bp ? S.fig.bp.state : null,
    figLocal: S.fig ? { x: +S.fig.x.toFixed(2), z: +S.fig.z.toFixed(2) } : null,
    notes: notes().length, used: usedIds(),
  };
}
