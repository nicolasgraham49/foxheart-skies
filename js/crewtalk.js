// [Crew conversations] The captain can talk to his ground crew. On foot at the stand
// (the apron is reachable by the service stair at the jet-bridge rotunda — see
// onfoot.js), walking up to any working crew member offers "E · Talk to <name>".
// E opens a short conversation card in the crew sign-in card idiom: the crew member
// speaks first, the captain gets a reply line, they close it out. Lines are
// PHASE-AWARE — they are picked from the live turnaround state (which vehicle is
// docked, working, leaving) and the GroundCrew state machine, so the fueler talks
// fuel while he is fueling and the ramp lead gives a real stand status. Several
// variants per person/phase rotate by talk count, so repeat visits differ.
// PUSHBACK: the captain is in the cockpit for pushback by design, so the pushback
// conversation comes to him — an interphone card (bottom-left, same card family)
// carries the headset operator's calls as the GroundCrew state machine moves
// parked -> prep -> pushing -> release, plus a welcome call after an arrival.
// Conversation is a pure overlay: nothing here writes to the turnaround, the
// vehicles, the crew poses or any gameplay state. Lines are English (the speech/
// PA language pattern would be the way to localize; noted as a residual).
// The marshaller's on-foot windows are brief by the existing choreography (he
// works while the captain is flying: guiding in, and the pushback send-off) —
// his lines exist for those windows and he is named in the interphone calls.

// ---------------------------------------------------------------- the roster
// src: 'proxy' = the three Object3D proxies on GroundCrew (headset/wing/marsh),
//      'slot'  = a RampCrew instance slot driven by the turnaround (crew.crew.p).
const PEOPLE = [
  { id: 'ray', slot: 0, src: 'proxy', name: 'Ray Delgado', role: 'Headset operator' },
  { id: 'chris', slot: 1, src: 'proxy', name: 'Chris Novak', role: 'Wing walker' },
  { id: 'sam', slot: 2, src: 'proxy', name: 'Sam Okafor', role: 'Marshaller' },
  { id: 'tommy', slot: 3, src: 'slot', name: 'Tommy Reyes', role: 'Baggage · forward hold' },
  { id: 'priya', slot: 4, src: 'slot', name: 'Priya Nair', role: 'Baggage · aft hold' },
  { id: 'yusuf', slot: 5, src: 'slot', name: 'Yusuf Ali', role: 'Cargo loader operator' },
  { id: 'marcus', slot: 6, src: 'slot', name: 'Marcus Webb', role: 'Fueler' },
  { id: 'lucia', slot: 7, src: 'slot', name: 'Lucia Ferrer', role: 'Catering lead · front' },
  { id: 'ben', slot: 8, src: 'slot', name: 'Ben Achebe', role: 'Catering · aft' },
  { id: 'hank', slot: 9, src: 'slot', name: 'Hank Doyle', role: 'Lavatory service' },
  { id: 'sara', slot: 10, src: 'slot', name: 'Sara Lindqvist', role: 'Potable water' },
  { id: 'eddie', slot: 11, src: 'slot', name: 'Eddie Kowalski', role: 'Baggage train driver' },
  { id: 'rosa', slot: 12, src: 'slot', name: 'Rosa Jimenez', role: 'Cabin cleaning' },
  { id: 'ken', slot: 13, src: 'slot', name: 'Ken Watanabe', role: 'Cabin cleaning' },
  { id: 'dana', slot: 14, src: 'slot', name: 'Dana Whitfield', role: 'Ramp lead' },
];

// ---------------------------------------------------------------- the lines
// exchange: { c: [crew lines], y: captain reply (optional), c2: [crew closer] }
const LINES = {
  ray: {
    standby: [
      { c: ["Morning, Captain. Ray — I'm your headset man today.", "GPU's on, chocks are in, and she's all yours. We'll be down here till you're ready to go."], y: "Thanks, Ray. Keep me posted.", c2: ["Will do. Anything you need, just flash me — or holler."] },
      { c: ["Everything's quiet on the ramp, Captain.", "Fuel and food are still working. I'll be on the headset when it's time to push."] },
      { c: ["Walkaround looks good from down here — no drips, no dings, tyres are healthy.", "She's ready when you are."] },
    ],
    after: [
      { c: ["Welcome in, Captain. Chocks are in and the GPU's coming up.", "Bags are already moving. We'll have her turned around in no time."] },
      { c: ["Nice parking. Right on the line — Sam barely had to lift a wand."] },
    ],
    default: [
      { c: ["Ray, headset. Say the word and it happens, Captain."] },
    ],
  },
  chris: {
    standby: [
      { c: ["Chris, wingtip watch. I keep an eye on this wing so nothing out here kisses it."], y: "Good to have you on it.", c2: ["Always. This wing and me, we're in a long-term relationship."] },
      { c: ["Quiet wing, happy wing, Captain. Nothing's come near her all morning."] },
    ],
    push: [
      { c: ["Walking her out with you, Captain. Wing's clear behind us — keep her coming."] },
    ],
    default: [
      { c: ["Chris. Eyes on the wingtip, always."] },
    ],
  },
  sam: {
    guiding: [
      { c: ["Sam — wands are mine. Nice and slow now, Captain… there. That's the spot."], y: "Thanks, Sam.", c2: ["Any time. Cut her loose and we'll take it from here."] },
    ],
    sendoff: [
      { c: ["That's from all of us down here, Captain.", "Have a good flight. We'll be watching her climb out."] },
    ],
    default: [
      { c: ["Sam, marshaller. I talk in orange sticks so you don't have to guess."] },
    ],
  },
  tommy: {
    loading: [
      { c: ["Tommy — forward hold. Bags are going up in order, heavy ones low, like always."], y: "Anything fragile I should know about?", c2: ["A wedding cake, believe it or not. It's riding like royalty."] },
      { c: ["Count's matching the paperwork so far, Captain.", "That's a beautiful sentence in my line of work."] },
    ],
    default: [
      { c: ["Tommy, bags. If it fits through the door, I've loaded it."] },
    ],
  },
  priya: {
    loading: [
      { c: ["Priya, aft hold. We're stacking her like a puzzle back here."] },
      { c: ["Somebody's checked a guitar, a plant, and what I think is a traffic cone.", "People are wonderful, Captain."] },
    ],
    default: [
      { c: ["Priya — aft hold. Tetris champion of the ramp."] },
    ],
  },
  yusuf: {
    container: [
      { c: ["Yusuf, on the loader. Cans are locked and the net's coming down, Captain."] },
      { c: ["She takes the big cans sweet as you like. No wrestling today."] },
    ],
    default: [
      { c: ["Yusuf, cargo. Heavy things, gently — that's the whole job."] },
    ],
  },
  marcus: {
    fueling: [
      { c: ["Marcus, fuel. She's drinking nicely, Captain — no spills, no drama.", "I'll call it up to the deck when we hit the number on the slip."], y: "Thanks, Marcus.", c2: ["Mind how you go up there."] },
      { c: ["Bonding's on, deadman in my hand the whole time.", "Safest seat in the house is under this wing."] },
    ],
    'fuel-done': [
      { c: ["Fuel's done and dusted, Captain. Panel's closed, hose is away.", "She's all yours."] },
    ],
    default: [
      { c: ["Marcus, fuel. I put it in, you burn it. Fair trade."] },
    ],
  },
  lucia: {
    catering: [
      { c: ["Lucia — catering lead. Front galley's stocked, Captain: meals, ice, and the good coffee."], y: "The good coffee matters.", c2: ["That's why I mentioned it first."] },
      { c: ["Everything's sealed and counted.", "Your passengers will eat better than I will today."] },
    ],
    done: [
      { c: ["Front truck's done, Captain. Galley's yours again."] },
    ],
    default: [
      { c: ["Lucia, catering. Nobody flies hungry on my watch."] },
    ],
  },
  ben: {
    catering: [
      { c: ["Ben, aft catering. We're just topping up the back galley, Captain."] },
      { c: ["Somebody ordered extra pastries for this flight.", "Somebody has excellent taste."] },
    ],
    done: [
      { c: ["Aft truck's away as soon as I latch this door, Captain."] },
    ],
    default: [
      { c: ["Ben, catering. Yes, the pastries are real. No, I can't spare one."] },
    ],
  },
  hank: {
    lav: [
      { c: ["Hank. Lav service. The glamorous end of aviation, Captain."], y: "Rather you than me, Hank.", c2: ["Everyone says that. Everyone's right."] },
    ],
    default: [
      { c: ["Hank, lav. Somebody has to love the blue juice. It's me."] },
    ],
  },
  sara: {
    water: [
      { c: ["Sara — potable water. Fresh tank, Captain, tested and clean."] },
      { c: ["Water's the one nobody applauds and everybody notices.", "Top her up, always."] },
    ],
    default: [
      { c: ["Sara, water. Hydration is a safety feature."] },
    ],
  },
  eddie: {
    train: [
      { c: ["Eddie. I drive the little train that could, Captain.", "Carts are chained, dollies are behaving. Mostly."] },
      { c: ["You fly her at four hundred knots; I do the important twelve feet at walking pace."] },
    ],
    default: [
      { c: ["Eddie, baggage train. All aboard that's coming aboard."] },
    ],
  },
  rosa: {
    cleaning: [
      { c: ["Rosa — cleaning crew. Give us ten minutes and she'll smell like new, Captain."] },
      { c: ["You'd be amazed what people leave behind. Phones, rings… one time, a whole wedding dress."] },
    ],
    default: [
      { c: ["Rosa, cleaning. We make it look like nobody was ever here."] },
    ],
  },
  ken: {
    cleaning: [
      { c: ["Ken, cleaning. Seat pockets are my whole personality today, Captain."] },
      { c: ["We race the clock so you don't have to. Nearly done in there."] },
    ],
    default: [
      { c: ["Ken, cleaning. Gloves on, standards high."] },
    ],
  },
  dana: {
    stand: [
      { c: ["Dana Whitfield — I run this stand, Captain.", "{status}"], y: "How are we looking for an on-time push?", c2: ["On time, if the bags behave. You fly her — I'll fight the clock down here."] },
      { c: ["Captain. {status}", "Anything you need before we close her up, you come to me."] },
      { c: ["Quick brief from the ramp: {status}"] },
    ],
    'stand-arr': [
      { c: ["Dana — ramp lead. Welcome in, Captain.", "{status}", "We'll turn her around quick and gentle."] },
      { c: ["{status}", "You get yourself a coffee. The stand's mine till she's ready again."] },
    ],
    default: [
      { c: ["Dana, ramp lead. This stand runs on coffee and checklists, in that order."] },
    ],
  },
};

// The interphone beats (cockpit surface; speaker is always Ray on the headset).
const BEATS = {
  connect: { title: 'GROUND · INTERPHONE', lines: ["Ground on the interphone, Captain.", "Tug's coming up to the nose now. Chocks are away, GPU's off, everybody's clear of the stand.", "Keep the brakes set — I'll call you when we're hooked up."] },
  hooked: { title: 'GROUND · INTERPHONE', lines: ["Interphone — we're connected, bypass pin's in.", "Release the brakes when you're ready and we'll take her back nice and easy."] },
  mid: { title: 'GROUND · INTERPHONE', lines: ["Pushing back… wingtip's clear, tail's clear of the stand behind us.", "You're looking good, Captain."] },
  complete: { title: 'GROUND · INTERPHONE', lines: ["Pushback complete. Set the brakes, Captain.", "…Brakes set, thank you. Towbar's off, pin's out, headset's disconnected.", "Sam's on your left for the salute. Have a good flight — we'll see you when you're back."] },
  welcome: { title: 'GROUND · INTERPHONE', lines: ["Welcome in, Captain. Chocks are in fore and aft, GPU's connecting now.", "You can shut her down and let the brakes off. The team will take it from here."] },
};

// ---------------------------------------------------------------- state
const S = {
  crew: null, foot: null,      // last env seen by frame()
  near: null,                  // the talkable in prompt range right now
  card: null,                  // open talk card { id, el }
  iphone: null,                // interphone card element
  iphoneAt: 0,                 // performance.now() of the last beat shown
  counts: {},                  // per-person talk counts (variant rotation)
  beats: {},                   // interphone beats fired this turnaround
  prevState: 'off',
  pushClock: 0,
  lastBeat: null,
};

export function reset() {
  closeCard(); closeIphone();
  S.near = null; S.counts = {}; S.beats = {}; S.prevState = 'off'; S.pushClock = 0; S.lastBeat = null;
  if (S.foot) S.foot.crewPrompt = null;
}

// ---------------------------------------------------------------- live stand state
function vstate(crew, id) { const T = crew.turn; return T && T.mode ? T.vstate(T.V[id]) : 'away'; }

function standStatus(crew) {
  const groups = [['fuel', ['fuel']], ['catering', ['cat1', 'cat2']], ['the bags', ['belt1', 'belt2', 'train', 'cont']], ['cleaning', ['van']], ['the lav and water trucks', ['lav', 'water']]];
  const busy = [];
  for (const [name, ids] of groups) { const sts = ids.map(id => vstate(crew, id)); if (sts.some(s => s === 'working' || s === 'coming')) busy.push(name); }
  if (!busy.length) return "Everything's wrapped up down here — she's your aeroplane again, Captain.";
  const list = busy.length === 1 ? busy[0] : busy.slice(0, -1).join(', ') + ' and ' + busy[busy.length - 1];
  return 'Still working: ' + list + '. The rest is done.';
}

function phaseOf(crew, id) {
  const gs = crew.state, T = crew.turn, mode = T && T.mode;
  switch (id) {
    case 'ray': return gs === 'parked' ? (mode === 'arr' ? 'after' : 'standby') : gs;
    case 'chris': return gs === 'pushing' ? 'push' : 'standby';
    case 'sam': return gs === 'arrive' ? 'guiding' : gs === 'release' ? 'sendoff' : 'standby';
    case 'dana': return mode === 'arr' ? 'stand-arr' : 'stand';
    case 'marcus': return T && T.mode && T.V.fuel.out != null && T.t >= T.V.fuel.out ? 'fuel-done' : 'fueling';
    case 'lucia': return T && T.mode && T.V.cat1.out != null && T.t >= T.V.cat1.out ? 'done' : 'catering';
    case 'ben': return T && T.mode && T.V.cat2.out != null && T.t >= T.V.cat2.out ? 'done' : 'catering';
    case 'tommy': case 'priya': return 'loading';
    case 'yusuf': return 'container';
    case 'hank': return 'lav';
    case 'sara': return 'water';
    case 'eddie': return 'train';
    case 'rosa': case 'ken': return 'cleaning';
    default: return 'default';
  }
}

// Every crew member currently standing on the ramp, with world position + phase.
export function talkables(crew) {
  if (!crew || !crew.g || !crew.g.visible || crew.state === 'off') return [];
  const out = [];
  for (const P of PEOPLE) {
    let pos = null, vis = false;
    if (P.src === 'proxy') { const o = [crew.headset, crew.wing, crew.marsh][P.slot]; if (o) { pos = o.position; vis = !!o.visible; } }
    else { const p = crew.crew && crew.crew.p[P.slot]; if (p) { pos = p.pos; vis = !!p.vis; } }
    if (!vis || !pos) continue;
    out.push({ id: P.id, slot: P.slot, name: P.name, role: P.role, phase: phaseOf(crew, P.id), x: pos.x, y: pos.y, z: pos.z });
  }
  return out;
}

// ---------------------------------------------------------------- the cards (crew sign-in card idiom)
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function cardShell(id, w) {
  const old = document.getElementById(id); if (old) old.remove();
  const el = document.createElement('div'); el.id = id;
  el.style.cssText = 'position:fixed;left:18px;top:64px;width:' + w + 'px;background:#10161f;color:#eef2f6;border-radius:10px;box-shadow:0 10px 34px rgba(0,0,0,.45);font:13px/1.55 system-ui,sans-serif;padding:0 0 12px;overflow:hidden;opacity:0;transition:opacity .45s;pointer-events:none;z-index:60;border-top:3px solid #e07f2e';
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  return el;
}
function fadeOut(el, then) { if (!el) return; el.style.opacity = '0'; setTimeout(() => { el.remove(); if (then) then(); }, 600); }

function showTalk(person, crew) {
  closeCard();
  const book = LINES[person.id] || {};
  const variants = book[person.phase] && book[person.phase].length ? book[person.phase] : (book.default || [{ c: ["…" ] }]);
  const n = S.counts[person.id] || 0; S.counts[person.id] = n + 1;
  const ex = variants[n % variants.length];
  const fill = s => s.replace('{status}', standStatus(crew));
  const el = cardShell('talkCard', 316);
  el.innerHTML = '<div style="background:#0d2b4c;color:#fff;padding:7px 12px;font-weight:700;letter-spacing:.06em">' + esc(person.name.toUpperCase()) + ' <span style="float:right;font-weight:400;color:#e8a35c">' + esc(person.role) + '</span></div>'
    + ex.c.map(l => '<div style="padding:8px 14px 0">“' + esc(fill(l)) + '”</div>').join('')
    + (ex.y ? '<div style="padding:10px 14px 0"><span style="color:#7f96ab;font-size:11px;letter-spacing:.08em">YOU</span><div style="color:#cfe0ee">“' + esc(fill(ex.y)) + '”</div></div>' : '')
    + (ex.c2 ? ex.c2.map(l => '<div style="padding:8px 14px 0">“' + esc(fill(l)) + '”</div>').join('') : '')
    + '<div style="padding:12px 14px 0"><button id="talkCardBtn" style="pointer-events:auto;cursor:pointer;background:#e07f2e;color:#14100b;border:0;border-radius:7px;padding:8px 14px;font:600 13px system-ui,sans-serif">✈ Back to it</button></div>';
  S.card = { id: person.id, el };
  el.querySelector('#talkCardBtn').onclick = () => closeCard();
  setTimeout(() => { if (S.card && S.card.el === el) closeCard(); }, 40000); // never trap the captain behind a card
}
function closeCard() { if (S.card) { const el = S.card.el; S.card = null; fadeOut(el); } else { const el = document.getElementById('talkCard'); if (el) el.remove(); } }

function showBeat(key) {
  const B = BEATS[key]; if (!B) return;
  S.beats[key] = true; S.lastBeat = key; S.iphoneAt = performance.now();
  let el = document.getElementById('iphoneCard');
  if (!el) {
    el = document.createElement('div'); el.id = 'iphoneCard';
    el.style.cssText = 'position:fixed;left:18px;bottom:84px;width:344px;background:#10161f;color:#eef2f6;border-radius:10px;box-shadow:0 10px 34px rgba(0,0,0,.45);font:13px/1.55 system-ui,sans-serif;padding:0 0 10px;overflow:hidden;opacity:0;transition:opacity .45s;pointer-events:none;z-index:60;border-top:3px solid #57b7e8';
    document.body.appendChild(el);
  }
  el.innerHTML = '<div style="background:#0d2b4c;color:#fff;padding:7px 12px;font-weight:700;letter-spacing:.06em">🎧 ' + B.title + ' <span style="float:right;font-weight:400;color:#9fd8f5">RAY DELGADO</span></div>'
    + B.lines.map(l => '<div style="padding:7px 14px 0">“' + esc(l) + '”</div>').join('');
  S.iphone = el;
  requestAnimationFrame(() => { el.style.opacity = '1'; });
}
function closeIphone() { if (S.iphone) { const el = S.iphone; S.iphone = null; fadeOut(el); } else { const el = document.getElementById('iphoneCard'); if (el) el.remove(); } }

// ---------------------------------------------------------------- per-frame
// Called from the main loop (same slot as Stories.frame). env: { crew, foot, onFoot, push }
export function frame(dt, env) {
  if (!env) return;
  const crew = env.crew; S.crew = crew || S.crew; S.foot = env.foot || S.foot;
  if (!crew) return;
  const gs = crew.state;
  // ---- interphone beats: watch the GroundCrew state machine.
  // Beat firing is level-based with catch-up, not edge-only: on a slow
  // machine a whole state can pass between two rendered frames, and the
  // captain must never lose a call. The record is NOT erased when the
  // crew clears the stand ('off') — it re-arms when a fresh stand begins
  // (parked straight out of 'off'); reset() clears it per flight anyway.
  if (gs === 'off') S.pushClock = 0;
  else {
    if (gs === 'parked' && S.prevState === 'off') { S.beats = {}; S.pushClock = 0; }
    if (gs === 'prep' && !S.beats.connect) showBeat('connect');
    if (gs === 'pushing') {
      if (!S.beats.connect) showBeat('connect');
      if (!S.beats.hooked) showBeat('hooked');
      S.pushClock += dt; if (S.pushClock > 6 && !S.beats.mid) showBeat('mid');
    }
    if (gs === 'release') {
      if (!S.beats.connect) showBeat('connect');
      if (!S.beats.hooked) showBeat('hooked');
      if (!S.beats.mid) showBeat('mid');
      if (!S.beats.complete) showBeat('complete');
    }
    if (gs === 'parked' && S.prevState === 'arrive' && crew.turn && crew.turn.mode === 'arr' && !S.beats.welcome) showBeat('welcome');
  }
  S.prevState = gs;
  if (S.iphone && performance.now() - S.iphoneAt > 16000) closeIphone();
  // ---- on-foot proximity + prompt + open-card upkeep
  // Proximity is APRON-ONLY (zone tag): the crew work on the apron, and a
  // captain inside the cabin must never "reach" the headset operator at the
  // nose through the fuselage — at the cockpit door his E press belongs to
  // the seat, not to a conversation. The open-card distance upkeep still
  // runs in every zone, so walking away always closes a card cleanly.
  const foot = env.foot;
  if (env.onFoot && foot && foot.active && gs !== 'off') {
    const list = talkables(crew);
    if (S.card) { // walked away (or the crew member left): close cleanly
      const P = list.find(p => p.id === S.card.id);
      if (!P || Math.hypot(foot.pos.x - P.x, foot.pos.z - P.z) > 4.5) closeCard();
    }
    if (foot.zoneTag && foot.zoneTag() === 'apron') {
      let best = null, bd = 2.5;
      for (const p of list) { const d = Math.hypot(foot.pos.x - p.x, foot.pos.z - p.z); if (d < bd) { bd = d; best = { ...p, d: +d.toFixed(2) }; } }
      S.near = best;
      foot.crewPrompt = best ? 'E  Talk to ' + best.name : null;
    } else { S.near = null; foot.crewPrompt = null; }
  } else {
    S.near = null;
    if (foot) foot.crewPrompt = null;
    if (S.card) closeCard();
  }
}

// E pressed on foot near a crew member: open the conversation (or close an open
// one). True = the press was used.
export function tryTalk(foot) {
  if (S.card) { closeCard(); return true; }
  if (!S.near || !S.crew) return false;
  showTalk(S.near, S.crew);
  return true;
}

export function state() {
  const tc = document.getElementById('talkCard'), ic = document.getElementById('iphoneCard');
  return {
    near: S.near ? { id: S.near.id, name: S.near.name, role: S.near.role, phase: S.near.phase, d: S.near.d } : null,
    people: S.crew ? talkables(S.crew).map(p => ({ id: p.id, slot: p.slot, name: p.name, role: p.role, phase: p.phase, pos: [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)] })) : [],
    cardOpen: !!S.card, cardId: S.card ? S.card.id : null,
    cardText: tc ? tc.textContent.replace(/\s+/g, ' ').trim() : null,
    iphoneText: ic ? ic.textContent.replace(/\s+/g, ' ').trim() : null,
    beats: { ...S.beats }, counts: { ...S.counts },
    services: S.crew && S.crew.services ? S.crew.services().map(s => ({ id: s.id, state: s.state })) : [],
    turnT: S.crew && S.crew.turn ? +S.crew.turn.t.toFixed(1) : null,
  };
}
