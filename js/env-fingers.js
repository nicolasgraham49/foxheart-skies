// Era Four — FINGERS · Slice 1 "First Contact" (free-talk radio).
// Proximity chat with the pilots of the sky: the captain tunes AIR 123.450,
// hails an airborne aircraft inside radio range, and TYPES FREELY. A local,
// hand-authored conversation engine answers — it composes from the live sky
// (his type, his altitude against yours, the weather you share, the ground
// below, the hour) and never generates. There is no AI in this feature and
// nothing here pretends otherwise (spec §0).
//
// STANDING LAWS (spec §5, Nicolas's): pilots are colleagues, not quest-givers;
// nothing is scored, unlocked, collected or recorded as failure; a pilot may
// be busy, terse or silent; silence is always free; ATC always wins the
// speaker (replies wait for a gap — the host's atcBusy()); the Quiet Rule is
// untouched because S1 pilots NEVER initiate — the captain always speaks
// first. Sterile cockpit is law: free-talk opens above 10,000 ft only, and a
// descent through ten thousand earns a warm authored sign-off, never a cut.
//
// MODULE SHAPE: this file is deliberately dependency-free (no imports, no
// DOM, no THREE) so the engine can be driven headlessly by the harness
// (fsim-harness/fingers-engine-test.mjs) and wired into the sim by a thin
// host adapter. Everything sim-shaped arrives through the host contract:
//
//   host = {
//     traffic()  -> atcCtx.traffic() rows: {cs?, kind:'arr'|'dep', phase,
//                    type:[id, spokenName], clock:'1'..'12', distNm, dAltFt,
//                    vs, altFt?, fromDir?, toDir?, destCity?, origCity?,
//                    busyNearField?}
//     state()    -> {altFt, vsFpm, onGround}          (the captain)
//     weather()  -> {kind:'clear'|'rain'|'fog'|'snow'|..., ride:'smooth'|
//                    'light chop'|'chop'|'rough', windD:'210 at 8',
//                    windS:'two one zero at eight'}
//     me()       -> {csD:'Foxheart 412', csS:'Foxheart four one two',
//                    typeS:'Airbus three fifty', destCity, origCity}
//     geo()      -> name of the place below, or null  (nearest city/airport)
//     tod()      -> local minutes at the captain's position
//     quiet()    -> per-flight radio-quiet setting (silences nothing in S1 —
//                    pilots never initiate — but honoured by contract)
//     atcBusy()  -> true while ATC / the captain's queue owns the speaker
//     emit(ev)   -> {who:'ME'|'PILOT'|'NOTE', cs?, d, s, edge?} one radio
//                    line, display + spoken forms, ready for atc.other()/log
//   }
//
// PHASE B INTEGRATION NOTES (for when the Amend build has left the tree):
//   - atc.js: FAC needs an AIR entry and facility() must pin 123.45 exactly
//     (the hash jitter would wander it); AIR_FACILITY below is the descriptor
//     the panel should show. Pilot lines ride atc.other('AIR', cs, M(d, s))
//     so voices hash per callsign exactly like ambient chatter; the captain's
//     typed lines go to the log as ME without dropChatter() side effects.
//   - main.js renderRadio(): add 'AIR' to the facility row (label from
//     AIR_FACILITY, count badge from engine.inRange().length, dimmed +
//     sterile note below 10,000 ft); when tuned to AIR, #rOpts renders the
//     in-range hail list + engine.quickLines(), and a text input row (new
//     DOM under #rOpts) forwards Enter -> engine.say(text). Esc must return
//     focus to the canvas; the input must suspend sim hotkeys while focused,
//     like every form field the sim already respects.
//   - main.js loop: engine.tick(dt) at ~1 Hz beside the ATC update; engine
//     constructed once per flight setup with the host adapter over atcCtx.
//   - index.html: only the input row markup + a little CSS (.rfac badge,
//     .rinput) — or build the row from main.js; either is one small edit.
//
// S1 HONESTY RULE for facts: traffic aircraft are local to the built airport
// — an arrival's true destination IS that airport and a departure's true
// origin is too, but their far ends are unknown to the sim. Where the host
// cannot supply destCity/origCity, the engine answers with DIRECTION
// (fromDir/toDir — the compass point his track truly makes) and never
// invents a city. Fragments that need a fact are only eligible when the
// slot exists (see compose()).

// ---------------------------------------------------------------- constants
export const FINGERS_FREQ = 123.45;
export const AIR_FACILITY = { kind: 'AIR', mhz: FINGERS_FREQ, name: 'Air to Air', real: false };
export const STERILE_FT = 10000;

// VHF line-of-sight flavour (spec §2.2): 40 NM at cruise, shrinking with
// altitude, floored at 8 so the climb-out band is quiet but not dead.
export function hailRangeNm(altFt) { return Math.max(8, Math.min(40, (altFt / 1000) * 1.2)); }

// ---------------------------------------------------------------- tiny utils
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const FL_SPOKEN = { 180: 'one eight zero', 190: 'one niner zero', 200: 'two zero zero', 210: 'two one zero', 220: 'two two zero', 230: 'two three zero', 240: 'two four zero', 250: 'two five zero', 260: 'two six zero', 270: 'two seven zero', 280: 'two eight zero', 290: 'two niner zero', 300: 'three zero zero', 310: 'three one zero', 320: 'three two zero', 330: 'three three zero', 340: 'three four zero', 350: 'three five zero', 360: 'three six zero', 370: 'three seven zero', 380: 'three eight zero', 390: 'three niner zero', 400: 'four zero zero', 410: 'four one zero' };
export function flPair(altFt) { const fl = Math.max(30, Math.round(altFt / 1000) * 10); const d = 'FL' + fl; const s = 'flight level ' + (FL_SPOKEN[fl] || String(fl).split('').join(' ')); return { d, s }; }
const NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export function numW(n) { return NUMW[n] || String(n); }
export function dAltPair(dAltFt) {
  const r = Math.round(Math.abs(dAltFt) / 100) * 100;
  if (r < 150) return { d: 'right at your altitude', s: 'right at your altitude' };
  const dir = dAltFt > 0 ? 'above you' : 'below you';
  const dN = r >= 1000 ? (r / 1000).toLocaleString('en-US') + ',000' : String(r);
  const sN = r >= 1000 ? numW(r / 1000) + ' thousand' : numW(r) + ' hundred';
  return { d: dN + ' ' + dir, s: sN + ' ' + dir };
}
export function todPart(min) { const h = ((min % 1440) + 1440) % 1440 / 60; return h < 4.5 || h >= 22 ? 'night' : h < 11 ? 'morning' : h < 16 ? 'midday' : h < 19.5 ? 'golden hour' : 'evening'; }
export function greetWord(min) { const p = todPart(min); return p === 'morning' ? 'Good morning' : p === 'midday' ? 'Good afternoon' : p === 'golden hour' || p === 'evening' ? 'Good evening' : 'Evening'; }

// ---------------------------------------------------------------- personas (S1: generic-but-personable; the authored cast is S2)
export const TEMPERAMENTS = ['warm', 'dry', 'quiet', 'eager', 'tired'];
const TEMP_WEIGHT = { warm: 3, dry: 2, quiet: 2, eager: 2, tired: 1 };
const PILOT_NAMES = ['Marcus', 'Elena', 'Tomás', 'Priya', 'Jonas', 'Walter', 'June', 'Henry', 'Sofia', 'Anders', 'Ruth', 'Diego', 'Amara', 'Felix', 'Ingrid', 'Noah', 'Clara', 'Owen', 'Marta', 'Silas', 'Ana', 'Victor', 'Lena', 'Hugo'];
const CS_WORDS_DEFAULT = ['Pelican', 'Coral', 'Osprey', 'Skylark', 'Seabird', 'Palmetto', 'Manatee', 'Bayhawk', 'Redtail', 'Nimbus'];

// A pilot is seeded from the aircraft's own identity, so the same flight
// re-hailed after a frequency change is the same man (spec §4.2).
export function seedPilot(a, csWords) {
  const key = (a.cs || '') + '|' + (a.type ? a.type[0] : '') + '|' + (a.kind || '') + '|' + Math.round((a.distNm || 0) * 2);
  const rnd = mulberry(hashStr(key || 'fingers'));
  const cs = a.cs || (csWords || CS_WORDS_DEFAULT)[Math.floor(rnd() * (csWords || CS_WORDS_DEFAULT).length)] + ' ' + (100 + Math.floor(rnd() * 880));
  let acc = 0; const total = Object.values(TEMP_WEIGHT).reduce((x, y) => x + y, 0); let temp = 'warm'; const roll = rnd() * total;
  for (const t of TEMPERAMENTS) { acc += TEMP_WEIGHT[t]; if (roll <= acc) { temp = t; break; } }
  return { cs, name: PILOT_NAMES[Math.floor(rnd() * PILOT_NAMES.length)], temp, seed: key };
}

// ---------------------------------------------------------------- understanding (spec §3.1)
// Topic banks: most specific first. A message may carry two topics — the
// engine answers the first and banks the second. Weak hits (a single stray
// keyword) feed the partial-understanding fallback, never a confident reply.
const TOPICS = [
  ['goodbye', [/\b(bye|goodbye|good talking|see you|see ya|talk later|sign(ing)? off|gotta go|have to go|safe flight|fly safe|clear(ing)? (the )?frequency|i'?m out)\b/]],
  ['thanks', [/\b(thanks|thank you|appreciated|appreciate it|cheers)\b/]],
  ['name', [/\b(your name|who am i talking|who is this|who'?s this|call ?sign|your handle)\b/]],
  ['destination', [/\b(where.*(headed|heading|going|bound)|headed|heading to|destination|where to|off to)\b/]],
  ['origin', [/\b(where.*(from|coming)|coming from|out of|where did you|start(ed)? (from|in))\b/]],
  ['state', [/\b(descend|climb)/, /\b(level|altitude|how high|flight level)\b/]],
  ['geometry', [/\b(above me|below me|over me|under me|see you|in sight|got you|o'?clock|beside|next to|off my|near me|close to me|your (left|right)|my (left|right))\b/]],
  ['weather', [/\b(weather|chop|turbulen|smooth|ride|wind|bumpy|rough|gust|clear up here|bump)\b/]],
  ['compliment', [/\b(paint|livery|beautiful (plane|jet|bird|aircraft)|nice (paint|colors|colours)|love (your|the) (paint|livery|look)|pretty (plane|bird|jet)|gorgeous)\b/]],
  ['aircraft', [/\b(what are you (flying|in)|what'?re you (flying|in)|your (plane|aircraft|jet|bird|ride)|flying a|flying the|737|787|a ?3(20|50)|e ?175|airbus|boeing|embraer|nice (737|787|a ?3(20|50)|e ?175|airbus|boeing|plane|jet|bird))\b/]],
  ['routine', [/\b(often|route|every (day|week)|based|home base|this run|regular|schedule|how long.*flying|years.*flying)\b/]],
  ['feelings', [/\b(lonely|loneliness|tired|sleepy|exhausted|love (it|this|flying)|beautiful up here|beautiful (evening|sky|sunset|night|view)|sunset|miss (home|my|her|him|them)|long night|long day|happy|sad|peaceful|quiet up here|view)\b/]],
  ['howareyou', [/\b(how are you|how'?s it going|how you doing|how goes|how are things|how'?s your (day|flight|evening|night))\b/]],
  ['greeting', [/\b(hello|hey|hi there|good (morning|afternoon|evening)|anyone (on|up|there)|on fingers|radio check|loud and clear|you got me|hear me|copy)\b/, /(^|\s)(hi|hey|yo|hola)\b/]],
  ['banter', [/\b(lol|haha|hehe|joke|funny|race you|coffee|cold coffee|hungry|snack|boring)\b/]],
];
const FILLER = /^(yeah|yea|yep|yes|ok|okay|cool|nice|right|uh huh|mm ?hmm|sure|wow|oh|ah|ha|haha|lol|roger|copy|true|same|indeed|exactly)[\s.!]*$/i;

// Facts the captain volunteers (spec §3.3): held for the thread, never extracted.
function extractFacts(text) {
  const f = {};
  let m = text.match(/\b(?:i'?m|we'?re|i am|headed|heading|going|flying) (?:to|into) ([a-z][a-z ]{2,20})/i);
  if (m) f.myDest = m[1].trim().replace(/\s+(tonight|today|now)$/i, '');
  if (/\b(i'?m|feeling) (tired|sleepy|beat)\b/i.test(text) || /\blong (night|day)\b/i.test(text)) f.myMood = 'tired';
  if (/\blove (it|this|flying)\b/i.test(text)) f.myMood = 'happy';
  return f;
}

export function parseInput(raw) {
  const text = ' ' + String(raw || '').toLowerCase().replace(/['']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const topics = [], weak = [];
  for (const [id, pats] of TOPICS) for (const p of pats) { if (p.test(text)) { topics.push(id); break; } }
  if (!topics.length) { // weak pass: a lone content word still steers the partial fallback
    const words = text.trim().split(' ');
    for (const [id, pats] of TOPICS) for (const p of pats) { if (words.some(w => w.length > 3 && p.test(' ' + w + ' '))) { weak.push(id); break; } }
  }
  return { topics, weak, facts: extractFacts(text), filler: FILLER.test(text.trim()), text: text.trim() };
}

// ---------------------------------------------------------------- the library (spec §3.2, §8)
// Every line below was authored, not generated. A fragment is a string or a
// [display, spoken] pair; {slots} are filled truthfully from the live sky at
// compose time, and a fragment is only eligible when every slot it names
// exists in the current context — the engine would rather say less than lie.
// Banks: `any` for every pilot, plus one bank per temperament; composition
// prefers the temperament's own voice about three times in five.
export const FRAG = {
  // the captain's own hail (composed by the engine, spoken as ME)
  hailMe: [
    '{mycs} on fingers, {cs} at my {clock} o\'clock — you got me?',
    '{cs}, {mycs} on one two three four five. You on frequency?',
    '{mycs} calling {cs} on fingers — how do you read?',
    'Any station, {mycs} on fingers. {cs}, I\'ve got you at my {clock}, say hello if you hear me.',
  ],
  // CONTACT: his first answer
  open: {
    any: [
      '{mycs}, {cs}, loud and clear. {greet} for it.',
      '{cs} here, {mycs}. Got you five by five.',
      '{mycs}, {cs} — yeah, I\'m on fingers. Quiet night for company up here.',
      '{cs}, reading you, {mycs}. {rel}.',
      '{mycs}, {cs}. Well hello. Didn\'t expect another voice on this stretch.',
      '{cs} on fingers, {mycs}. Go ahead.',
      '{mycs}, {cs}, I hear you. Sky\'s all ours out here.',
      '{cs} — {mycs}, welcome to the quiet frequency.',
    ],
    warm: [
      '{mycs}! {cs}. Good to hear a friendly voice — {greetLower} indeed.',
      '{cs} here, {mycs}, and glad of the company. How\'s your evening treating you?',
      '{mycs}, {cs}. You just made this leg shorter. Go ahead.',
    ],
    dry: [
      '{cs}. Go ahead, {mycs}.',
      '{mycs}, {cs}. You\'re on fingers, I\'m on fingers. Talk.',
      '{cs}, reading you. Make it good, I\'m rationing words tonight.',
    ],
    quiet: [
      '{cs}. I hear you, {mycs}.',
      '{mycs}, {cs}. Go ahead.',
      '{cs}… go ahead, {mycs}.',
    ],
    eager: [
      '{mycs}, {cs}! Oh nice — somebody else actually uses this frequency!',
      '{cs} here! Reading you loud and clear, {mycs}. What\'s up?',
      '{mycs}! {cs}. Finally, a human. Go ahead, go ahead.',
    ],
    tired: [
      '{cs}… {mycs}, yeah, I got you. Sorry — long day up here.',
      '{mycs}, {cs}. Reading you. Forgive me if I\'m slow, it\'s been one of those rotations.',
      '{cs} here. Go ahead, {mycs} — company helps the hours.',
    ],
  },
  greeting: {
    any: [
      '{greet}, {mycs}.',
      '{greet} to you too. Fine {tod} for it.',
      'Hello yourself, {mycs}.',
      '{greet}. You picked a good piece of sky to say it in.',
      'Hey, {mycs}. {cs} here, same sky, same {tod}.',
      'And to you. Not many voices out here — glad of yours.',
    ],
    warm: ['{greet}, {mycs} — and it just got better.', 'Hello, hello. {cs}, pleased to share a sky.'],
    dry: ['Evening. Well — {tod}, technically.', '{greet}. That\'s the formalities done.'],
    quiet: ['{greet}, {mycs}.', 'Hello.'],
    eager: ['{greet}! Great to hear you!', 'Hey hey! {greet} from {cs}!'],
    tired: ['{greet}, {mycs}. Such as it is at this hour.', 'Hey. {greet} from the tired seats.'],
  },
  howareyou: {
    any: [
      'Can\'t complain — {ride} air, good airplane, and now company.',
      'Better than the folks in the back know. {rel}, and the coffee\'s still warm.',
      'Honestly? Good. This is the part of the job they can\'t put in a brochure.',
      'All the better for a voice on fingers. Yourself?',
      'Flying\'s fine, day\'s long. Net positive, {mycs}.',
      'Smooth sky, quiet radios — I\'ll take it and say thank you.',
    ],
    warm: ['Genuinely good, thanks for asking. Sky like this fixes most things.', 'Better now. A {tod} like this and a voice to share it — good.'],
    dry: ['Vertical, conscious, and the autopilot\'s doing the hard part. Thriving.', 'All my complaints are filed under "later". Fine up here.'],
    quiet: ['Fine. Quiet sky. Good.', 'Well enough.'],
    eager: ['Great! Honestly great. New route for me and it looks like THIS — can\'t beat it.', 'Living the dream, {mycs}, and I know how that sounds. Still true.'],
    tired: ['Running on coffee and habit, but the sky\'s kind tonight.', 'Tired, if I\'m honest. Third leg. But this part — this part\'s alright.'],
  },
  destination: {
    any: [
      '{dest} for us — {rel}.',
      'We\'re {dest}-bound. Should be there before the {tod} gives out.',
      '{dest}. {rel}, counting down quietly.',
      'Headed {dest} way. The {type} eats the miles, I just supervise.',
      '{dest} tonight. You?',
      'Down to {dest}, eventually. No hurry at this altitude.',
      '{dest} — and I\'ve got a window seat view the whole way, same as you.',
      '{dest}. Last leg of the day for this crew, thankfully.',
    ],
    dirOnly: [
      'Away {todir} tonight — long way yet, and the sky\'s in no rush.',
      'Headed {todir}. Where exactly is the company\'s business; the direction\'s mine.',
      '{todir}, eventually. {rel} for now.',
      'We\'re pointed {todir} and staying pointed. That\'s the whole plan.',
      '{todir} — the airplane knows more than it tells me.',
      'Off {todir}. Ask me again in an hour, I\'ll be poetic about it.',
    ],
    warm: ['{dest} for us — and honestly, one of my favourite runs. You headed anywhere good?', '{dest}. There\'s a coffee place by the gate I dream about at altitude.'],
    dry: ['{dest}. The schedule says so, and I never argue with paper.', '{dest}. Try to contain your excitement.'],
    quiet: ['{dest}.', '{dest} tonight.'],
    eager: ['{dest}! First time for me — anything I should know about the place?', '{dest}, and I cannot wait. New city, new runway.'],
    tired: ['{dest}, if the coffee holds out. Third leg talking.', '{dest}. Home is the leg after. One more after this.'],
  },
  origin: {
    any: [
      'Out of {orig} — left it in another {tod} entirely, feels like.',
      '{orig}, a few hours back. Sky\'s been kind since.',
      'We came up from {orig}. {rel} now.',
      '{orig}. You know how it is — the day starts before the sun does.',
      'From {orig}, with a full tank and a quiet cabin.',
      '{orig}. Left on time, which the crew is calling a miracle.',
    ],
    dirOnly: [
      'In from {fromdir} — that\'s where the day started, anyway.',
      'From {fromdir} way. Been in this seat a while.',
      'Came in {fromdir}. The sky behind us was worse than the sky ahead, so: progress.',
      '{fromdir} originally. Everything since has been this colour of beautiful.',
      'Out of {fromdir}, hours ago. Home feels far tonight.',
    ],
    warm: ['{orig} — and my favourite controller on the departure, so the day started right.', 'From {orig}. Small airport, big hearts, terrible coffee. Miss it already.'],
    dry: ['{orig}. It\'s behind us, which is where I like airports.', '{orig}. We left. That\'s the review.'],
    quiet: ['{orig}.', 'Up from {orig}.'],
    eager: ['{orig}! Great little field — ever been? The approach is a postcard.', '{orig}, bright and early. Well — early.'],
    tired: ['{orig}… feels like yesterday. It was today. That\'s the rotation talking.', '{orig}. Don\'t ask me the day, I\'ve lost it.'],
  },
  weather: {
    any: [
      '{wx}.',
      'Up here? {wx}.',
      '{wx} — the {type} doesn\'t even notice.',
      '{wx}. Wind\'s {wind} where I am.',
      '{wx}, and grateful. I\'ve flown this stretch in worse moods.',
      '{wx}. The folks in back are asleep on it, mostly.',
    ],
    smooth: [
      'Smooth as glass. You could balance a coffee on the glareshield.',
      'Like the sky ironed itself. Not a bump in an hour.',
      'Silk. The autopilot\'s bored and so am I, happily.',
      'Smooth — the kind of air that makes you forgive the schedule.',
    ],
    chop: [
      'A little chop where I am — nothing rude, just the sky clearing its throat.',
      'Light bumps. Coffee\'s wearing a lid tonight.',
      'Choppy in patches. The airplane shrugs; the passengers don\'t.',
      'Some chop. We\'re hunting a smoother level, slowly.',
    ],
    rough: [
      'Rough enough that the seatbelt sign\'s earning its keep.',
      'Proper bumps up here. The {type} takes it better than the crew does.',
      'It\'s a washing machine at this level. We\'ll move when Center lets us.',
    ],
    rain: [
      'Rain on the windscreen, smooth underneath it. Pretty, in its way.',
      'Wet out there. The lights below smear like watercolour.',
      'Rain where I am — the airplane doesn\'t care, and the view\'s all sparkle.',
    ],
    warm: ['{wx} — and a sky putting on a show besides. We\'re lucky tonight, {mycs}.', 'Lovely air. This is the weather I\'d order if they let me.'],
    dry: ['{wx}. I\'ve filed no complaints with the sky. Yet.', '{wx}. The sky\'s behaving. Suspicious, but I\'ll allow it.'],
    quiet: ['{wx}.', 'Fine air.'],
    eager: ['{wx} — perfect flying weather, honestly. Look at it!', '{wx}! Days like this are why I signed up.'],
    tired: ['{wx}. Even the weather\'s being gentle with us tonight. Needed that.', '{wx}. Calm sky, tired crew. Fair trade.'],
    repeat: [
      'Still {ride}, {mycs}. You\'re worrying at it.',
      'Same sky as a minute ago — {ride}. It\'ll keep.',
      '{ride}, still. I\'ll shout if it changes its mind.',
    ],
  },
  aircraft: {
    any: [
      'The {type}. She and I understand each other.',
      'I\'m in the {type} tonight. Good bones, this one.',
      '{type}. More airplane than I am pilot, some days.',
      'The {type} — company metal, my office, current favourite chair.',
      '{type}. She climbs like she means it and lands like she\'s sorry. Perfect.',
      'A {type}. And before you ask — yes, the legroom up front is excellent.',
      '{type} tonight. Yours?',
    ],
    warm: ['The {type}, and I love her a little. Don\'t tell the company.', '{type} — flown her sisters for years. She\'s family with wings.'],
    dry: ['{type}. It has wings and a coffee maker. Priorities met.', '{type}. The brochure says "advanced". I say "warm seat".'],
    quiet: ['{type}.', 'The {type}. Good airplane.'],
    eager: ['{type}! Still new to me — I grin at the checklist, it\'s embarrassing.', 'A {type}! Best seat in the sky, I swear it.'],
    tired: ['{type}. She\'s doing the flying; I\'m doing the sitting. Partnership.', '{type}. Reliable old friend on a long night.'],
  },
  compliment: {
    any: [
      'Well — thank you. She wears it well, this one.',
      'Kind of you. The paint shop outdid themselves; I just keep her clean.',
      'Appreciated, {mycs}. I\'ll pass it to the airplane — she\'s vain.',
      'Ha — heard it at altitude, it counts double. Thank you.',
      'Thank you. Yours isn\'t exactly hard to look at either, from this angle.',
      'That\'ll make the first officer\'s night. And mine.',
    ],
    warm: ['Oh, that\'s kind. She\'s my favourite sight on a ramp, too.', 'Thank you — truly. A pilot never gets tired of hearing his airplane praised.'],
    dry: ['Noted, and logged under "morale". Thank you.', 'She\'ll be insufferable now. Worth it.'],
    quiet: ['Thank you. She is.', 'Appreciated.'],
    eager: ['Right?! I stare at her on walkarounds like a teenager. Thank you!', 'Thank you! The tail especially, right? The tail!'],
    tired: ['That\'s a kind thing to say to a tired man\'s airplane. Thank you.', 'She\'s prettier than her crew tonight, that\'s certain. Thanks.'],
  },
  geometry: {
    any: [
      'I\'ve got you too — {dalt}, from where I sit.',
      'Saw you. You\'re {dalt} and holding it tidy.',
      'You\'re in my window, {mycs}. {dalt}.',
      'Copy that — I make you {dist} out from me, {dalt}.',
      'In sight. Two airplanes in all this sky and we found the same corner.',
      'Got you. Keep shining those lights, you look good out there.',
      'I see you — {clock} from me, near enough. Sky feels smaller, in a good way.',
    ],
    warm: ['Got you in sight, and it\'s a fine sight. {dalt}, steady as you go.', 'I see you! Wave a wing, I dare you.'],
    dry: ['In sight. Try not to be photogenic, it\'s distracting.', 'Copy. You\'re the blinking one. Everyone\'s the blinking one.'],
    quiet: ['In sight.', 'Got you. {dalt}.'],
    eager: ['I see you! Right there — {dalt}. This never gets old!', 'Visual! You look GREAT from here, {mycs}.'],
    tired: ['Got you. {dalt}. Even tired eyes can\'t miss those strobes.', 'In sight. Company in the dark.'],
  },
  state: {
    any: [
      '{rel} — that\'s the whole story right now.',
      'We\'re at {fl}, {relV}.',
      '{fl} for us, {relV}. The plan, such as it is.',
      '{rel}. Center owns our altitude; we just visit.',
      'Holding {fl}, {relV}. Quiet phase of the evening.',
      '{relV} at {fl}. Nothing dramatic, thankfully.',
    ],
  },

  name: {
    any: [
      '{name}. {cs} when the frequency\'s formal, {name} when it isn\'t.',
      'Name\'s {name}. The callsign\'s {cs} — sky knows me by both.',
      '{name}, at your service. Well — at the autopilot\'s service, technically.',
      '{name}. And you\'re the famous {mycs}, I take it.',
      '{name}. Pleased to be a person and not just a blip, {mycs}.',
    ],
    warm: ['{name} — and glad to be asked. We\'re all just callsigns till somebody asks.', '{name}. My mother\'s the only one who uses my full name; {name} does fine up here.'],
    dry: ['{name}. The headset hair is worse than the name, trust me.', '{name}. Don\'t spread it around; the mystery was working for me.'],
    quiet: ['{name}.', '{name}. {cs} on the paperwork.'],
    eager: ['{name}! And you are…? Wait — {mycs}, obviously. Hi!', 'I\'m {name}! Nobody ever asks. Hi, {mycs}!'],
    tired: ['{name}. If I forget yours mid-sentence, it\'s the rotation, not the company.', '{name}, third leg, no complaints that matter.'],
  },
  feelings: {
    any: [
      'Know that feeling. The sky\'s good company for it.',
      'That\'s the honest hour talking. I hear you, {mycs}.',
      'Up here\'s the place for it. Everything down there gets small and quiet.',
      'Amen to that. Some flights you fly; some flights you feel.',
      'Yeah. Yeah, I know exactly what you mean.',
      'The view does that. {geo} below us and not a worry in the world for one minute.',
      'It gets into you, this job. The altitude, the light. Wouldn\'t trade it.',
      'Say it on fingers and it\'s just between us pilots. Heard, {mycs}.',
    ],
    warm: ['That\'s beautifully put. This is why I fly — the feeling first, the job second.', 'You sound like a man in the right job, {mycs}. Hold onto that.'],
    dry: ['Careful — feelings at altitude, the company will tax us.', 'Noted. I\'ll pretend I didn\'t get a little misty at {fl}.'],
    quiet: ['Yeah. Same.', 'Heard. …It\'s a good sky.'],
    eager: ['YES. This! Nobody on the ground understands — it\'s just… this!', 'You get it! That\'s exactly it. That\'s the whole thing.'],
    tired: ['Long nights make philosophers of us all. True, though.', 'Tired men tell the truth at altitude. Heard, {mycs}.'],
    view: [
      'Look at it, though. {geo} all lit up below — tell me that\'s not worth the early alarms.',
      'The {tod} light on the clouds right now… I\'d bottle it if I could.',
      'Every time I think I\'m used to the view, it does something like this.',
    ],
  },
  banter: {
    any: [
      'Ha! Careful, you\'ll make the autopilot jealous.',
      'That\'s the spirit. The sky\'s better with a grin in it.',
      'Ha — noted and logged in the unofficial book.',
      'You\'re trouble, {mycs}. Good trouble.',
      'If Center heard us, we\'d be famous. Briefly.',
      'That\'s going in my report as "morale: excellent".',
      'Ha! Alright, you win this frequency.',
    ],
    warm: ['Ha! You\'re good company, {mycs}. The miles are shorter already.', 'That\'s the best laugh I\'ve had at {fl}, and I keep count.'],
    dry: ['Humour at altitude. Bold. I approve.', 'I\'ll allow it. This once. And every other time.'],
    quiet: ['Heh.', '…Ha. Okay, that one landed.'],
    eager: ['HA! Yes! Okay you\'re my favourite traffic today, official.', 'That\'s it, we\'re friends now. The sky has decided.'],
    tired: ['Ha — needed that. The coffee wasn\'t cutting it.', 'You just bought me another hour of awake. Thank you.'],
  },
  routine: {
    any: [
      'This corridor? Often enough that the controllers know my voice. Not sure that\'s fame.',
      'I fly this stretch most weeks. It never quite looks the same twice.',
      'Years on these routes. The sky keeps the seniority list, I just show up.',
      'Regular run for me. I could find the coffee at every stop blindfolded.',
      'Often. It\'s a good route — honest weather, pretty arrivals.',
      'This one\'s home turf, more or less. You?',
    ],
  },
  thanks: {
    any: [
      'Any time, {mycs}. That\'s what the frequency\'s for.',
      'Don\'t mention it. The sky gave us the same minute; we just used it.',
      'My pleasure. Truly.',
      'You\'re welcome. Fly good tonight.',
      'Any time. Voices are free up here.',
    ],
  },
  filler: [
    'Mm-hm.',
    'Yeah.',
    'Right there with you.',
    'Copy that.',
    'Ha — yeah.',
    'True words.',
    'Uh-huh.',
    'Same from over here.',
  ],
  // reactions when the captain volunteers a fact about himself (spec §3.3)
  factDest: [
    '{mydest}, huh — good run. Race you there. Kidding. Mostly.',
    '{mydest} — nice. Tell it {cs} says hello when you land.',
    '{mydest} tonight? Good flying to you, then. The sky\'s cooperating.',
    '{mydest}. We\'ll compare notes at the other end of the evening.',
  ],
  factMood: [
    'Then let the sky do the carrying for a while. That\'s allowed.',
    'Heard. The quiet up here\'s medicinal. Doctor\'s orders.',
    'Same medicine, different cockpit. It helps, the talking.',
  ],
  factGeneric: [
    'Copy that, {mycs}. Filed under "the man behind the callsign".',
    'Good to know the voice has a story.',
    'Noted. See — this is why fingers beats the other frequencies.',
  ],
  // EXCHANGE: every few exchanges the pilot carries his half (spec §3.4) —
  // a question (expects a short answer) or a remark (expects nothing).
  offers: [
    { q: 'dest', t: 'Where are you bound tonight, {mycs}?' },
    { q: 'dest', t: 'And where\'s {mycs} headed, if the sky can ask?' },
    { q: 'wx', t: 'How\'s the air on your side of the sky? Smooth over there?' },
    { q: 'wx', t: 'You getting the same {ride} ride I am, or is your corner kinder?' },
    { q: 'day', t: 'How\'s your day been treating you, {mycs}? Honest answer.' },
    { q: 'day', t: 'Long one for you too, or did the schedule smile on you?' },
    { q: 'type', t: 'What are you flying tonight, {mycs}? I\'m guessing from the silhouette and losing.' },
    { q: 'home', t: 'You based where the run ends, or is home another leg away?' },
    { q: null, t: 'Look at that light on the cloud tops. Some evenings the job pays in this.' },
    { q: null, t: '{geo} below us right now, all lit. Never gets old, that.' },
    { q: null, t: 'Quiet frequency, good airplane, sky like this. I\'ve had worse offices.' },
    { q: null, t: 'My first officer just pointed out we\'re the only two voices for a hundred miles. Cozy.' },
  ],
  // his reaction when the captain answers one of his questions
  offerAns: {
    dest: ['{mydest} — good. May your arrival be as kind as your cruise.', '{mydest}, copy. We\'re practically neighbours tonight, then.', '{mydest}. Fine place to end a {tod}.'],
    wx: ['Good — same sky, same story, then.', 'Copy. Two airplanes, one weather. Fair enough.', 'Ha — so it\'s not just me. Comforting.'],
    day: ['Heard. The sky\'s the best part of most days, I find.', 'Copy that. Well — this bit\'s ours, at least.', 'Then let this leg be the gentle one.'],
    type: ['A {mytype} — fine machine. Silhouette gave you away in the end.', '{mytype}, nice. Good company in any sky.', 'The {mytype}! Respect. She wears the {tod} well.'],
    home: ['Copy. Home\'s a runway away, one way or another.', 'Heard. We\'re all just commuting through the beautiful part.', 'Then here\'s to short last legs, {mycs}.'],
    generic: ['Copy that.', 'Ha — fair enough.', 'Good answer. The honest ones always are.'],
  },
  // the fallback ladder (spec §3.1): a miss is a radio moment, never an error
  sayAgain: [
    '…{mycs}, you were a little garbled — say again?',
    'Say again, {mycs}? You broke up on my end.',
    '…missed that one. Once more, {mycs}?',
    'You came in scratchy — say again?',
    'Say again? The frequency ate half of that.',
  ],
  partial: [
    'Caught something about {topicWord} — {topicAnswer}',
    'I got the edge of that. If it\'s {topicWord} you\'re after: {topicAnswer}',
    'Partial copy — sounded like {topicWord}. {topicAnswer}',
  ],
  steer: [
    'My radio brain\'s not keeping up tonight. Tell me this instead — where are you headed, {mycs}?',
    'Let\'s blame the frequency. New subject: how\'s the ride on your side?',
    'We\'ll let that one go to the static. So — {geo} below us. You fly this way often?',
    'Scratch that transmission. Tell me about your evening instead, {mycs}.',
    'The sky garbled us. Happens. What\'s your airplane tonight, {mycs}?',
  ],
  standby: [
    '{mycs}, {cs} — standby one, we\'re busy in this cockpit.',
    '{cs}, standby, {mycs}. Working something over here.',
    'Standby, {mycs} — {cs} is heads-down for a minute.',
  ],
  descentWarn: [
    'We\'ll lose the light chatter soon — they\'ll want us quiet below ten.',
    'Sounds like we\'re both about to get busy. Sterile below ten, as ever.',
    'Descent\'s coming for one of us — the quiet rules apply soon, {mycs}.',
  ],
  freqReturn: [
    '{mycs}, you\'re back — thought I\'d lost you to Center.',
    'There you are. Frequency\'s kept your seat warm.',
    '{mycs} returns. We were just saying — well. Sky things.',
  ],
  signoff: {
    any: [
      'Good talking, {mycs}. Fly safe — see you up here.',
      'This is where I leave you, {mycs}. Fine sky to share.',
      '{mycs}, a pleasure. The frequency\'s quieter already — worse luck for it.',
      'Talk above ten sometime, {mycs}. I\'ll keep the channel warm.',
      'Goodnight from {cs} — well, good {tod}. You know what I mean.',
      'See you in another sky, {mycs}.',
    ],
    warm: ['This was the best part of my leg, {mycs}. Truly. Fly safe.', 'Hate to end it — good company\'s rare at altitude. See you up here.'],
    dry: ['And that\'s the show. Fly safe, {mycs}.', 'Signing off before I get sentimental. Goodnight, {mycs}.'],
    quiet: ['Good talking. …Fly safe, {mycs}.', 'See you up here.'],
    eager: ['This was GREAT. Okay. Fly safe, {mycs} — same time next sky!', 'Best frequency, best company. See you up here, {mycs}!'],
    tired: ['Thanks for keeping a tired man company. Fly safe, {mycs}.', 'Goodnight, {mycs}. The sky\'s in good hands — yours.'],
    sterile: [
      'Sounds like you\'re getting busy. Good talking, {mycs} — see you up here.',
      'Below ten we go quiet — rules are rules. A pleasure, {mycs}.',
      'That\'s our cue, {mycs}. Sterile cockpit. Fine talking with you.',
      'Work calls us both downstairs. Good talking — fly the arrival well.',
    ],
    range: [
      '…copy… {mycs}… nice talk— …up here…',
      '…{mycs}, you\'re… fading… good talk…',
      '…say… {mycs}… see you… sky…',
    ],
    busy: [
      'We\'re getting busy down here, {mycs}. Good talking — another sky.',
      'Work\'s calling, {mycs}. Thanks for the company.',
      'They need me on the other radio. Fly safe, {mycs}.',
    ],
    lull: [
      'Frequency\'s going quiet on us — that\'s the sky\'s way of signing off. Fly safe, {mycs}.',
      'I\'ll let the quiet have the channel. Good sharing it with you, {mycs}.',
    ],
  },
  sterileNote: 'Sterile below ten thousand — fingers opens in the climb.',
  // last-resort acknowledgment: the engine would rather say little than lie
  // (a topic whose every fragment needs a fact this sky doesn't have).
  deflect: [
    'Copy that, {mycs}.',
    'Heard, {mycs}. Some things the frequency keeps to itself.',
    'Mm — go on, {mycs}. I\'m listening.',
  ],
};

// ---------------------------------------------------------------- the engine (spec §3: understand, remember, compose, conduct)
// Conversation state machine: idle → hail → open → (standby | closing) → idle.
// All pilot transmissions are scheduled on the engine clock and released by
// tick() only when the host says the speaker is free (ATC always wins).
const STEER_Q = ['dest', 'wx', null, 'day', 'type']; // FRAG.steer order → the question each steer asks
const TOPIC_WORD = { weather: 'the weather', destination: 'where you\'re headed', origin: 'where you\'re from', aircraft: 'the airplane', name: 'names', feelings: 'how it feels up here', geometry: 'the geometry of us', state: 'altitudes', routine: 'the route', greeting: 'a hello', howareyou: 'how you are', compliment: 'the paint', banter: 'a laugh', thanks: 'thanks', goodbye: 'goodbyes' };
const CHAT = { // chattiness presets (spec §9.2) — 'company' is the approved default
  quiet: { offerEvery: 99, noAnswer: 0.22, standby: 0.10 },
  company: { offerEvery: 3, noAnswer: 0.15, standby: 0.08 },
  warm: { offerEvery: 2, noAnswer: 0.08, standby: 0.05 },
};

export class FingersEngine {
  constructor(host, opts = {}) {
    this.host = host;
    this.cfg = CHAT[opts.chattiness || 'company'] || CHAT.company;
    this.csWords = opts.csWords || null;
    this.rng = mulberry(hashStr('fingers|' + (opts.seed ?? 'live')));
    this.t = 0;
    this.state = 'idle';           // idle | hail | open | standby
    this.thread = null;            // the open conversation (see _newThread)
    this.due = [];                 // scheduled pilot transmissions {at, fn}
    this.lastClosed = null;        // {key, t} — frequency-return recognition
    this.pulseFired = false;       // the one soft in-range pulse per cruise
  }

  // ------------------------------------------------------------ sky queries
  sterile() { const s = this.host.state(); return !s || s.onGround || s.altFt <= STERILE_FT; }
  range() { const s = this.host.state(); return hailRangeNm(s ? s.altFt : 0); }
  inRange() {
    const s = this.host.state(); if (!s || s.onGround) return [];
    const r = this.range();
    return (this.host.traffic() || []).filter(a => (!a.phase || a.phase === 'air') && a.distNm != null && a.distNm <= r)
      .sort((x, y) => x.distNm - y.distNm);
  }
  snapshot() {
    return { state: this.state, sterile: this.sterile(), rangeNm: Math.round(this.range() * 10) / 10, inRange: this.inRange().length,
      partner: this.thread ? { cs: this.thread.pilot.cs, name: this.thread.pilot.name, temp: this.thread.pilot.temp } : null,
      exchanges: this.thread ? this.thread.exchanges : 0 };
  }

  // ------------------------------------------------------------ context: the live sky, as slots
  _ctx(a, pilot) {
    const H = this.host, me = H.me(), st = H.state(), wx = H.weather() || {};
    const altHim = (st ? st.altFt : 0) + (a.dAltFt || 0);
    const fl = flPair(altHim);
    const vs = a.vs || 0;
    const relV = vs < -100 ? 'descending' : vs > 100 ? 'climbing' : 'level';
    const destCity = a.destCity || (a.kind === 'arr' ? (H.arrCity ? H.arrCity() : null) : null);
    const origCity = a.origCity || (a.kind === 'dep' ? (H.depCity ? H.depCity() : null) : null);
    const relBase = relV === 'descending' ? (destCity ? 'descending into ' + destCity : 'on the way down into the murk') : relV === 'climbing' ? (origCity ? 'climbing out of ' + origCity : 'climbing out, up into the blue') : 'level at ' + fl.d;
    const relBaseS = relV === 'descending' ? (destCity ? 'descending into ' + destCity : 'on the way down') : relV === 'climbing' ? (origCity ? 'climbing out of ' + origCity : 'climbing out') : 'level at ' + fl.s;
    const wxRide = { smooth: 'smooth as glass', 'light chop': 'a little light chop', chop: 'choppy in patches', rough: 'properly rough' }[wx.ride] || 'smooth as glass';
    const tod = H.tod ? H.tod() : 1080;
    const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    const slots = {
      cs: { d: pilot.cs, s: pilot.cs }, name: { d: pilot.name, s: pilot.name },
      mycs: { d: me.csD, s: me.csS }, type: { d: a.type ? a.type[1] : 'jet', s: a.type ? a.type[1] : 'jet' },
      mytype: { d: me.typeS, s: me.typeS }, fl, dalt: dAltPair(a.dAltFt || 0),
      clock: { d: (a.clock || '12') + ' o\'clock', s: numW(parseInt(a.clock || '12', 10)) + ' o\'clock' },
      dist: { d: Math.max(1, Math.round(a.distNm || 0)) + ' NM', s: numW(Math.max(1, Math.round(a.distNm || 0))) + ' miles' },
      rel: { d: relBase, s: relBaseS }, relV: { d: relV, s: relV },
      greet: { d: greetWord(tod), s: greetWord(tod) }, greetLower: { d: greetWord(tod).toLowerCase(), s: greetWord(tod).toLowerCase() },
      tod: { d: todPart(tod), s: todPart(tod) }, ride: { d: wx.ride || 'smooth', s: wx.ride || 'smooth' },
      wx: { d: wxRide, s: wxRide }, wind: { d: wx.windD || 'calm', s: wx.windS || 'calm' },
    };
    if (destCity) slots.dest = { d: destCity, s: destCity };
    if (origCity) slots.orig = { d: origCity, s: origCity };
    if (a.fromDir) slots.fromdir = { d: 'the ' + a.fromDir, s: 'the ' + a.fromDir };
    if (a.toDir) slots.todir = { d: a.toDir, s: a.toDir };
    const geo = H.geo ? H.geo() : null; if (geo) slots.geo = { d: geo, s: geo };
    const myDest = (this.thread && this.thread.facts.myDest) || me.destCity;
    if (myDest) slots.mydest = { d: cap(myDest), s: cap(myDest) };
    if (me.origCity) slots.myorig = { d: me.origCity, s: me.origCity };
    return { slots, wxKind: wx.kind || 'clear', ride: wx.ride || 'smooth' };
  }
  _resolve(tpl, form, slots) {
    return tpl.replace(/\{(\w+)\}/g, (m, k) => slots[k] ? slots[k][form] : m);
  }
  _eligible(tpl, slots) { let ok = true; tpl.replace(/\{(\w+)\}/g, (m, k) => { if (!slots[k]) ok = false; return m; }); return ok; }
  // pick one fragment from a bank ({any, <temp>...} or a plain array), truthfully
  // slotted, never repeated within the thread while alternatives live.
  _pick(bank, ctx, thread, tag) {
    const th = thread || this.thread;
    const used = th ? th.used : new Set();
    const arr = Array.isArray(bank) ? bank : null;
    const anyB = arr || bank.any || [];
    const tempB = arr ? [] : (bank[th ? th.pilot.temp : 'warm'] || []);
    const build = (list, src) => list.map((f, i) => ({ f, id: tag + ':' + src + ':' + i })).filter(x => {
      const tpl = Array.isArray(x.f) ? x.f[0] : x.f; return this._eligible(tpl, ctx.slots);
    });
    let poolT = build(tempB, 't').filter(x => !used.has(x.id));
    let poolA = build(anyB, 'a').filter(x => !used.has(x.id));
    let pick = null;
    if (poolT.length && (this.rng() < 0.62 || !poolA.length)) pick = poolT[Math.floor(this.rng() * poolT.length)];
    else if (poolA.length) pick = poolA[Math.floor(this.rng() * poolA.length)];
    else if (poolT.length) pick = poolT[0];
    if (!pick) { const all = build(anyB, 'a'); if (!all.length) return null; pick = all[Math.floor(this.rng() * all.length)]; }
    if (th) used.add(pick.id);
    const f = pick.f;
    return { d: this._resolve(Array.isArray(f) ? f[0] : f, 'd', ctx.slots), s: this._resolve(Array.isArray(f) ? f[1] : f, 's', ctx.slots), id: pick.id };
  }
  _emitPilot(line, opt = {}) { if (line) this.host.emit({ who: 'PILOT', cs: this.thread ? this.thread.pilot.cs : undefined, d: line.d, s: line.s, edge: !!opt.edge }); }
  _emitMe(d, s) { this.host.emit({ who: 'ME', d, s: s || d }); }
  _note(d) { this.host.emit({ who: 'NOTE', d, s: d }); }
  _after(sec, fn) { this.due.push({ at: this.t + sec, fn }); }
  _replyIn(fn) { this._after(1.3 + this.rng() * 2.1, fn); } // a human pause before he keys the mic

  // ------------------------------------------------------------ the arc (spec §3.4)
  _newThread(a, pilot) {
    return { a, pilot, key: pilot.seed, used: new Set(), topicCounts: {}, exchanges: 0, miss: 0,
      facts: {}, pendingQ: null, sinceOffer: 0, lastActT: this.t, lullStage: 0, warnedDesc: false,
      descT: 0, queuedTexts: [], openedT: this.t };
  }
  hail(a) {
    if (!a) return { ok: false, why: 'no-target' };
    if (this.sterile()) { this._note(FRAG.sterileNote); return { ok: false, why: 'sterile' }; }
    if (this.thread && this.thread.a === a && (this.state === 'open' || this.state === 'hail')) return { ok: true, why: 'already' };
    if (this.thread) this._closeSilent();
    const pilot = seedPilot(a, this.csWords);
    const th = this._newThread(a, pilot); this.thread = th; this.state = 'hail';
    const ctx = this._ctx(a, pilot);
    const hailLine = this._pick(FRAG.hailMe, ctx, th, 'hail');
    if (hailLine) this._emitMe(hailLine.d, hailLine.s);
    const returned = this.lastClosed && this.lastClosed.key === th.key && (this.t - this.lastClosed.t) < 300;
    this._after(2.1 + this.rng() * 2.0, () => {
      if (this.thread !== th || this.state !== 'hail') return;
      const now = this._partnerNow(th);
      if (!now || now.busyNearField) { this._noAnswer(th); return; }
      const roll = this.rng();
      const noAns = this.cfg.noAnswer + (pilot.temp === 'quiet' ? 0.13 : pilot.temp === 'warm' ? -0.06 : 0);
      if (roll < noAns) { this._after(3.5, () => { if (this.thread === th && this.state === 'hail') this._noAnswer(th); }); return; }
      if (roll < noAns + this.cfg.standby) {
        this.state = 'standby'; th.lastActT = this.t;
        const ctx2 = this._ctx(now, pilot); this._emitPilot(this._pick(FRAG.standby, ctx2, th, 'standby'));
        this._after(25, () => { if (this.thread === th && this.state === 'standby') this._closeSilent(); });
        return;
      }
      this.state = 'open'; th.lastActT = this.t; th.a = now;
      const ctx2 = this._ctx(now, pilot);
      this._emitPilot(this._pick(returned ? FRAG.freqReturn : FRAG.open, ctx2, th, returned ? 'freqReturn' : 'open'));
      const queued = th.queuedTexts.splice(0); for (const q of queued) this._after(0.8, () => this.say(q));
    });
    return { ok: true };
  }
  _noAnswer(th) { if (this.thread === th) { this.thread = null; this.state = 'idle'; } } // silence is a valid outcome (spec §3.4) — no scolding, no record
  _closeSilent() { if (this.thread) this.lastClosed = { key: this.thread.key, t: this.t }; this.thread = null; this.state = 'idle'; this.due = []; }
  endThread() { this._closeSilent(); } // the captain tuned away: closes without ceremony (spec §2.4)
  _signOff(kind) {
    const th = this.thread; if (!th) return;
    const now = this._partnerNow(th) || th.a;
    const ctx = this._ctx(now, th.pilot);
    const bank = kind === 'normal' ? { any: FRAG.signoff.any, [th.pilot.temp]: FRAG.signoff[th.pilot.temp] } : FRAG.signoff[kind];
    this._emitPilot(this._pick(bank, ctx, th, 'signoff-' + kind), { edge: kind === 'range' });
    this._closeSilent();
  }
  _partnerNow(th) {
    const list = this.host.traffic() || [];
    return list.find(x => x === th.a) || list.find(x => (x.cs && x.cs === th.pilot.cs) || (x.type && th.a.type && x.type[0] === th.a.type[0] && x.kind === th.a.kind && Math.abs((x.distNm || 99) - (th.a.distNm || 0)) < 6)) || null;
  }

  // ------------------------------------------------------------ the captain speaks
  quickLines() {
    if (this.state !== 'open') return [];
    return ['Where are you headed?', 'How\'s the ride up there?', 'What are you flying?', 'Nice paint.', 'Good talking — see you around.'];
  }
  say(raw) {
    const text = String(raw || '').trim(); if (!text) return { ok: false, why: 'empty' };
    if (this.state === 'idle') {
      const cands = this.inRange();
      if (!cands.length) { this._note('No one in range on fingers.'); return { ok: false, why: 'no-range' }; }
      if (cands.length > 1) { this._note('More than one in range — pick who you\'re calling first.'); return { ok: false, why: 'many' }; }
      const h = this.hail(cands[0]);
      if (h.ok && this.thread) this.thread.queuedTexts.push(text);
      return h;
    }
    if (this.state === 'hail' || this.state === 'standby') { if (this.thread) this.thread.queuedTexts.push(text); return { ok: true, why: 'queued' }; }
    if (this.state !== 'open' || !this.thread) return { ok: false, why: 'no-thread' };
    const th = this.thread;
    this._emitMe(text);
    th.lastActT = this.t; th.lullStage = 0;
    const parsed = parseInput(text);
    const newDest = parsed.facts.myDest && parsed.facts.myDest.toLowerCase() !== (th.facts.myDest || '').toLowerCase();
    Object.assign(th.facts, parsed.facts);
    const now = this._partnerNow(th) || th.a; th.a = now;
    const ctx = this._ctx(now, th.pilot);
    const primary = parsed.topics[0];

    // he asked a question and the captain's short reply IS the answer
    if (th.pendingQ && text.split(/\s+/).length <= 6 && primary !== 'goodbye') {
      const q = th.pendingQ; th.pendingQ = null;
      if (q === 'dest' && !primary) { th.facts.myDest = text.replace(/\.+$/, ''); }
      const ctx2 = this._ctx(now, th.pilot);
      const bank = FRAG.offerAns[q] || FRAG.offerAns.generic;
      this._replyIn(() => { if (this.thread === th) { this._emitPilot(this._pick(bank, ctx2, th, 'offerAns')); th.exchanges++; th.lastActT = this.t; } });
      return { ok: true, topic: 'answer' };
    }
    th.pendingQ = null;

    if (primary === 'goodbye') { this._replyIn(() => { if (this.thread === th) this._signOff('normal'); }); return { ok: true, topic: 'goodbye' }; }
    if (newDest) { // "I'm headed to Miami" — a fact volunteered, met as one (spec §3.3)
      this._replyIn(() => { if (this.thread === th) { this._emitPilot(this._pick(FRAG.factDest, ctx, th, 'factDest')); this._afterExchange(th); } });
      return { ok: true, topic: 'fact' };
    }
    if (!primary && parsed.facts.myMood) {
      this._replyIn(() => { if (this.thread === th) { this._emitPilot(this._pick(FRAG.factMood, ctx, th, 'factMood')); this._afterExchange(th); } });
      return { ok: true, topic: 'fact' };
    }
    if (!primary && parsed.filler) {
      this._replyIn(() => { if (this.thread === th) { this._emitPilot(this._pick(FRAG.filler, ctx, th, 'filler')); th.lastActT = this.t; } });
      return { ok: true, topic: 'filler' };
    }
    if (!primary) { // the fallback ladder — a miss is a radio moment (spec §3.1)
      th.miss++;
      if (th.miss === 1) this._replyIn(() => { if (this.thread === th) this._emitPilot(this._pick(FRAG.sayAgain, ctx, th, 'sayAgain')); });
      else if (th.miss === 2 && parsed.weak.length) {
        const w = parsed.weak[0];
        const ans = this._topicLine(w, ctx, th);
        if (ans) { const slots = { ...ctx.slots, topicWord: { d: TOPIC_WORD[w] || 'that', s: TOPIC_WORD[w] || 'that' }, topicAnswer: ans }; const ctxP = { ...ctx, slots };
          this._replyIn(() => { if (this.thread === th) this._emitPilot(this._pick(FRAG.partial, ctxP, th, 'partial')); }); }
        else this._steer(th, ctx);
      } else this._steer(th, ctx);
      return { ok: true, topic: 'fallback' };
    }
    th.miss = 0;
    th.topicCounts[primary] = (th.topicCounts[primary] || 0) + 1;
    this._replyIn(() => {
      if (this.thread !== th) return;
      let line;
      if (primary === 'weather' && th.topicCounts.weather >= 3) line = this._pick(FRAG.weather.repeat, ctx, th, 'wxRepeat');
      else line = this._topicLine(primary, ctx, th);
      if (!line) line = this._pick(FRAG.deflect, ctx, th, 'deflect'); // never leave a transmission unanswered in silence
      this._emitPilot(line); this._afterExchange(th);
    });
    return { ok: true, topic: primary };
  }
  _steer(th, ctx) {
    const idx = Math.floor(this.rng() * FRAG.steer.length);
    const slots = { ...ctx.slots }; const ctxS = { ...ctx, slots };
    this._replyIn(() => { if (this.thread === th) { this._emitPilot(this._pick([FRAG.steer[idx]], ctxS, th, 'steer' + idx)); th.pendingQ = STEER_Q[idx]; th.miss = 0; th.lastActT = this.t; } });
  }
  _topicLine(topic, ctx, th) {
    switch (topic) {
      case 'greeting': return this._pick(FRAG.greeting, ctx, th, 'greeting');
      case 'howareyou': return this._pick(FRAG.howareyou, ctx, th, 'howareyou');
      case 'destination': return this._pick(ctx.slots.dest ? FRAG.destination : { any: FRAG.destination.dirOnly, [th.pilot.temp]: FRAG.destination[th.pilot.temp] }, ctx, th, 'destination');
      case 'origin': return this._pick(ctx.slots.orig ? FRAG.origin : { any: FRAG.origin.dirOnly, [th.pilot.temp]: FRAG.origin[th.pilot.temp] }, ctx, th, 'origin');
      case 'weather': {
        const sub = ctx.wxKind === 'rain' && this.rng() < 0.5 ? FRAG.weather.rain : ctx.ride === 'smooth' ? FRAG.weather.smooth : ctx.ride === 'rough' ? FRAG.weather.rough : FRAG.weather.chop;
        return this._pick({ any: [...FRAG.weather.any, ...sub], [th.pilot.temp]: FRAG.weather[th.pilot.temp] }, ctx, th, 'weather');
      }
      case 'aircraft': return this._pick(FRAG.aircraft, ctx, th, 'aircraft');
      case 'compliment': return this._pick(FRAG.compliment, ctx, th, 'compliment');
      case 'geometry': return this._pick(FRAG.geometry, ctx, th, 'geometry');
      case 'state': return this._pick(FRAG.state, ctx, th, 'state');
      case 'name': return this._pick(FRAG.name, ctx, th, 'name');
      case 'feelings': return this._pick({ any: [...FRAG.feelings.any, ...FRAG.feelings.view], [th.pilot.temp]: FRAG.feelings[th.pilot.temp] }, ctx, th, 'feelings');
      case 'banter': return this._pick(FRAG.banter, ctx, th, 'banter');
      case 'routine': return this._pick(FRAG.routine, ctx, th, 'routine');
      case 'thanks': return this._pick(FRAG.thanks, ctx, th, 'thanks');
      default: return null;
    }
  }
  _afterExchange(th) {
    th.exchanges++; th.lastActT = this.t; th.sinceOffer++;
    if (th.sinceOffer >= this.cfg.offerEvery && this.state === 'open') {
      th.sinceOffer = 0;
      this._after(2.6 + this.rng() * 2.6, () => {
        if (this.thread !== th || this.state !== 'open') return;
        const now = this._partnerNow(th) || th.a; const ctx = this._ctx(now, th.pilot);
        const offer = FRAG.offers[Math.floor(this.rng() * FRAG.offers.length)];
        const line = this._pick([offer.t], ctx, th, 'offer');
        if (line) { this._emitPilot(line); th.pendingQ = offer.q; th.lastActT = this.t; }
      });
    }
  }

  // ------------------------------------------------------------ the clock: drift, sterile, range, lulls
  tick(dt) {
    this.t += dt;
    // scheduled transmissions release only into a gap on the frequency
    for (let i = this.due.length - 1; i >= 0; i--) {
      if (!this.due[i]) continue;
      if (this.due[i].at <= this.t) {
        if (this.host.atcBusy && this.host.atcBusy()) { this.due[i].at = this.t + 0.7; continue; }
        const d = this.due.splice(i, 1)[0]; d.fn();
      }
    }
    const th = this.thread; if (!th) return;
    if (this.state === 'hail' && this.t - th.openedT > 14) { this._noAnswer(th); return; } // the answer window closes in silence
    if (this.state !== 'open') return;
    const st = this.host.state(); if (!st) return;
    const now = this._partnerNow(th);
    // sterile cockpit: a descent through ten thousand closes the thread warmly
    if (st.altFt <= STERILE_FT) { this._signOff(st.vsFpm < -100 ? 'sterile' : 'normal'); return; }
    // descent beginning above ten: one warning line, then the sterile close lands it
    if (st.vsFpm < -700) { th.descT += dt; if (th.descT > 4 && !th.warnedDesc) { th.warnedDesc = true; const ctx = this._ctx(now || th.a, th.pilot); const line = this._pick(FRAG.descentWarn, ctx, th, 'descWarn'); this._after(0.1, () => { if (this.thread === th && this.state === 'open') this._emitPilot(line); }); } }
    else th.descT = 0;
    if (!now) { this._signOff('range'); return; }
    th.a = now;
    if (now.busyNearField) { this._signOff('busy'); return; }
    if (now.distNm > this.range() * 1.05) { this._signOff('range'); return; }
    // lulls: at ~55 s he offers a topic; at the next, he lets the quiet have the channel
    if (this.t - th.lastActT > 55) {
      if (th.lullStage === 0) { th.lullStage = 1; th.lastActT = this.t; th.sinceOffer = 0;
        const ctx = this._ctx(now, th.pilot); const offer = FRAG.offers[Math.floor(this.rng() * FRAG.offers.length)];
        const line = this._pick([offer.t], ctx, th, 'offer'); if (line) { this._emitPilot(line); th.pendingQ = offer.q; } }
      else this._signOff('lull');
    }
  }
}
