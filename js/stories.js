// [Stories era] Flights that carry people's moments. On a terminal (on-foot) departure, one of the
// 121 passengers waiting in the lounge is a STORY passenger: a named person with a small, real
// reason for flying today. The captain can walk up and say hello before boarding (optional,
// never forced). They board with their group like everyone else. In cruise, one quiet beat
// surfaces as a toast. When the trip completes, their letter lands in the logbook (fox.letters).
// Rotation: stories are offered in roster order without repetition until the roster is exhausted
// (fox.storyCycle), then the cycle restarts; letters already collected stay collected. A story is
// consumed when its flight completes — met or not — so skipping the hello costs the letter, never
// the flight. All letter text is route-neutral: a diversion changes where they land, not what
// they needed to say. Story text stays English at every airport (the heart is not machine-
// translated). State here is per-flight only; storage is plain localStorage, fox.-prefixed.
//
// [Continuing stories] People's moments keep going. When a met passenger's letter lands, they
// join a persistent THREADS pool (fox.threads — who, first/last flight dates, flight count,
// stage). Once the fresh roster has been exhausted once, thread-holders with a second chapter
// (RETURNS, below) begin coming back: the marked encounter is them again — they recognise the
// captain, there is a new beat, and a SECOND letter lands (marked "— again" in the logbook),
// taking their thread to stage 2. Returns interleave with fresh stories (never two return
// flights in a row while a fresh story is available, and the same passenger never returns
// back-to-back), drawn no-repeat from fox.returnCycle. While any return is still pending, a
// thread-holder sits out the fresh rotation — nobody replays a first meeting mid-story.
// Threads and letters both survive "Clear logbook" (it only clears flights/bests, as before).
import * as THREE from 'three';

export const ROSTER = [
  {
    id: 'maya', name: 'Maya', desc: '7 years old · flying alone, to her dad',
    meet: [
      '“I’m going to my dad’s. He moved for work and I haven’t seen him since summer.”',
      '“This is Biscuit. He’s a fox. He doesn’t get scared, so I hold him when I do.”',
      '“The lady at the desk said the captain flies the plane. Is that you? …Okay. Then I’m not scared.”',
    ],
    beat: 'Maya, 7 — asleep at last, hugging the little stuffed fox like she’s done it a hundred times.',
    letter: [
      'Dear Captain,',
      'Dad was waiting right at the door, like he promised. I told him the fox wasn’t scared one bit, so I wasn’t either.',
      'Thank you for flying careful.',
      '— Maya (and Biscuit)',
    ],
  },
  {
    id: 'walter-rose', name: 'Walter & Rose', desc: 'married 51 years · one more trip to the sea',
    meet: [
      'Rose: “Fifty-one years ago we honeymooned down there. One suitcase, no money, best week of our lives.”',
      'Walter: “The doctor says take it easy. So we’re taking it easy — at the beach where we started.”',
      'Rose: “One more time, together. That’s the whole plan.”',
    ],
    beat: 'Walter and Rose — holding hands across the armrest, both asleep before the drinks cart came.',
    letter: [
      'Dear Captain —',
      'The water is the same blue. We sat where we sat all those years ago, and Walter cried a little and blamed the salt air.',
      'Thank you for bringing us back.',
      '— Rose & Walter',
    ],
  },
  {
    id: 'daniel', name: 'Daniel', desc: 'flying home to say goodbye',
    meet: [
      '“My grandma raised me. She’s in the hospital, and they say… they say I should come now.”',
      '“I keep rehearsing what to say. Nothing sounds right.”',
      '“Just get me there in time, Captain. Please.”',
    ],
    beat: 'Daniel — awake the whole way, phone face-up on the tray, waiting for it not to ring.',
    letter: [
      'Captain —',
      'I made it. She knew my voice. I got to say everything, and she squeezed my hand.',
      'You got me there in time. I’ll never forget that.',
      '— Daniel',
    ],
  },
  {
    id: 'june', name: 'June', desc: 'a musician · her first real gig',
    meet: [
      '“First real gig. A little room, forty chairs, and they actually booked ME.”',
      '“I’ve played these songs to my bedroom wall for three years.”',
      '“If I throw up, it’ll be after we land. Promise.”',
    ],
    beat: 'June — humming through her setlist with her eyes closed, fingers drumming the tray table.',
    letter: [
      'Captain!!',
      'Forty chairs, and every one of them full. My hands stopped shaking by the second song.',
      'You carried me to the start of it.',
      '— June',
    ],
  },
  {
    id: 'angela', name: 'Angela', desc: 'a nurse · finally going home',
    meet: [
      '“I’m a nurse. Thirteen months of night shifts, holding everybody else up.”',
      '“My mom kept my room exactly how I left it. Even the posters.”',
      '“I think I might sleep the whole flight. Don’t take it personal.”',
    ],
    beat: 'Angela — asleep before we reached the clouds. Shoes off. Finally off duty.',
    letter: [
      'Dear Captain,',
      'I slept nine hours in my old bed and ate my mom’s cooking in my pajamas.',
      'I feel like a person again. Thank you.',
      '— Angela',
    ],
  },
  {
    id: 'henry', name: 'Henry', desc: 'a grandpa · meeting his grandson',
    meet: [
      '“My grandson was born four days ago. Four days old, and I’ve only seen pictures.”',
      '“His name is Samuel. He has my ears, poor kid.”',
      '“I’ve been practicing holding a baby on a pillow all week.”',
    ],
    beat: 'Henry — showing the passenger beside him the same photo for the third time. She doesn’t mind.',
    letter: [
      'Captain,',
      'I held him. Four days old, and he grabbed my finger and wouldn’t let go.',
      'Neither would I.',
      '— Henry',
    ],
  },
  {
    id: 'priya', name: 'Priya', desc: 'one suitcase, one plant, a new life',
    meet: [
      '“Everything I own is in that suitcase. New job, new city, nobody I know.”',
      '“The plant’s name is Hope. Seemed smart to bring my own.”',
      '“Tell me it gets easier, Captain. Even if you have to lie a little.”',
    ],
    beat: 'Priya — watering a small plant with a plastic cup, like it’s the most normal thing in the world.',
    letter: [
      'Dear Captain,',
      'The apartment is small and the city is loud, and Hope is on the windowsill doing fine.',
      'So am I, mostly. It does get easier. You were right not to lie.',
      '— Priya',
    ],
  },
  {
    id: 'marcus', name: 'Marcus', desc: 'a soldier · coming home early',
    meet: [
      '“I was supposed to be gone four more months. They let me come home early.”',
      '“Mom doesn’t know. Nobody told her. I’m just going to knock on the door.”',
      '“I’ve been strong all year, Captain. I might not be strong at that door.”',
    ],
    beat: 'Marcus — sitting up straight as a board, quietly rehearsing a knock on the armrest.',
    letter: [
      'Captain —',
      'She screamed, then she cried, then she hit my arm for scaring her. Then she made pancakes.',
      'Best door I ever knocked on.',
      '— Marcus',
    ],
  },
  {
    id: 'elena', name: 'Elena', desc: 'meeting her sister halfway',
    meet: [
      '“My sister and I haven’t spoken in three years. Over something neither of us can even say right anymore.”',
      '“She’s flying in from the other side. We’re meeting in the middle, like when we were kids.”',
      '“I don’t know what I’ll say first. Probably something dumb. She’ll laugh. That’s how it always starts.”',
    ],
    beat: 'Elena — reading old photos on her phone, smiling at some, wincing at others.',
    letter: [
      'Dear Captain,',
      'She said something dumb first. I laughed so hard in that airport, people stared.',
      'Three years, gone in one laugh. We’re okay. We’re really okay.',
      '— Elena',
    ],
  },
  {
    id: 'adaeze', name: 'Adaeze', desc: 'a teacher · retired after 38 years',
    meet: [
      '“Thirty-eight years of fourth grade. That’s about nine hundred children who learned fractions from me.”',
      '“Every summer I said: next year, the ocean. Next year always had a reason.”',
      '“Well. It’s next year. I’m going to put my feet in the water and NOT grade anything.”',
    ],
    beat: 'Adaeze — reading a novel, a bookmark in it that says: Chapter One of the Rest of My Life.',
    letter: [
      'Dear Captain,',
      'The water was cold and perfect. I stood in it up to my knees like a schoolgirl.',
      'Nine hundred children, and I finally raised myself.',
      '— Adaeze',
    ],
  },
  {
    id: 'tomas', name: 'Tomás', desc: 'a dad · a drawing in his notebook, a promise to keep',
    meet: [
      '“Business trip. Four nights. My daughter thinks that’s forever, and honestly? Same.”',
      '“She drew our family and taped it inside my notebook. See — I’m the tall one. Artistic license.”',
      '“Four nights, then I keep my promise: pancakes, Saturday, no phone.”',
    ],
    beat: 'Tomás — notebook open on the tray, a crayon family watching him work.',
    letter: [
      'Captain,',
      'Home in time for Saturday pancakes. She checked the drawing hadn’t faded, and approved.',
      'Thanks for the on-time arrival. A promise is a promise.',
      '— Tomás',
    ],
  },
  {
    id: 'grace', name: 'Grace', desc: 'a bride · the dress is in the garment bag',
    meet: [
      '“The dress is in that garment bag, and I have checked on it eleven times.”',
      '“Saturday, I marry the kindest man alive. He’s terrible at dancing. I can’t wait.”',
      '“I’m not nervous about him. I’m nervous about tripping. Priorities, right?”',
    ],
    beat: 'Grace — smiling out the window at nothing at all, like the clouds were invited too.',
    letter: [
      'Dear Captain,',
      'I did not trip. He cried. The dancing was terrible and perfect.',
      'Thank you for carrying the dress — and the girl in it — so carefully.',
      '— Grace',
    ],
  },
  {
    id: 'frank', name: 'Frank', desc: '68 · going fishing with an old friend',
    meet: [
      '“Eddie and I were best friends from age six to eighteen. Then life did what life does.”',
      '“Forty years. Then out of nowhere he writes: ‘The dock’s still here. So am I.’”',
      '“Two old men fishing like no time passed. That’s the whole trip.”',
    ],
    beat: 'Frank — asleep with a letter in his lap, folded and refolded a hundred times.',
    letter: [
      'Captain,',
      'The dock is still there. So is he. We caught nothing and talked about everything.',
      'Forty years felt like a long weekend.',
      '— Frank',
    ],
  },
  {
    id: 'noah', name: 'Noah', desc: 'about to be a dad · the baby has other plans',
    meet: [
      '“My wife’s due in three weeks. The baby has other plans — she’s at the hospital now.”',
      '“Everything I own is in this backpack. I bought the ticket standing in a grocery store.”',
      '“Fly fast, Captain. I have someone to meet.”',
    ],
    beat: 'Noah — grinning at an ultrasound photo like it owes him money.',
    letter: [
      'CAPTAIN.',
      'Her name is Elena. Seven pounds, all lungs, perfect. I was there. I WAS THERE.',
      'Thank you thank you thank you.',
      '— Noah',
    ],
  },
];

// ---------------------------------------------------------------- the second chapters
// [Continuing stories] Eight of the fourteen have a RETURN: the same person, some life
// later, recognising the captain. Same fields as a roster entry (desc/meet/beat/letter),
// keyed by roster id. The other six rest after their first letter — their stories were
// complete as told.
export const RETURNS = {
  maya: {
    desc: 'flying back to her mom · Biscuit still on duty',
    meet: [
      '“You’re my captain! From before! I told everybody at school and nobody believed me.”',
      '“Biscuit remembers you too. He isn’t scared of flying anymore. Neither am I. Mostly.”',
      '“I go back and forth now, Dad’s then Mom’s. I’m basically a professional traveller.”',
    ],
    beat: 'Maya — reading Biscuit the safety card like a bedtime story, doing all the voices.',
    letter: [
      'Dear Captain,',
      'Mom was waiting right at the door this time. Back and forth isn’t so bad when the same captain does the flying.',
      'Biscuit sat up straighter when you talked on the speaker. He knew your voice.',
      '— Maya (and Biscuit)',
    ],
  },
  'walter-rose': {
    desc: '52 years married · back to the sea',
    meet: [
      'Rose: “We told you it was one more trip. We may have lied a little — the beach wasn’t finished with us.”',
      'Walter: “Fifty-two years now. She still takes the window, I still take the middle. That’s the whole secret, Captain.”',
      'Rose: “You brought us back last time. We thought we’d let you do it again.”',
    ],
    beat: 'Walter and Rose — sharing one pair of earbuds, watching the clouds like a film they still love.',
    letter: [
      'Dear Captain —',
      'The water was the same blue. Again. We sat in our spot, and Walter cried a little and blamed the salt air. Again.',
      'Some people get one great trip in a whole life. We’re on our second helping.',
      '— Rose & Walter',
    ],
  },
  june: {
    desc: 'a musician · on tour with the band',
    meet: [
      '“Forty chairs, that first room. This one seats four hundred, Captain. FOUR HUNDRED.”',
      '“The band’s in the back. We have a van with our name spelled wrong on the side. We made it.”',
      '“I still might throw up before the show. After we land, like always. Some things don’t change.”',
    ],
    beat: 'June — setlist on the tray table, writing a new song in the margins instead.',
    letter: [
      'Captain!!',
      'Four hundred chairs. My hands shook till the second song, like always, then it was just music.',
      'The van broke down twice on the way to the airport and I still wouldn’t trade a mile of it.',
      'You carried me to the start of it. It still starts there.',
      '— June',
    ],
  },
  henry: {
    desc: 'a grandpa · Samuel is walking now',
    meet: [
      '“Samuel’s walking now, Captain. Walking INTO things, mostly. Gets that from my side.”',
      '“I have photos. Seventeen of them. I will show the whole cabin if nobody stops me.”',
      '“You flew me to him when he was four days old and grabbed my finger. He’s been improving his grip ever since.”',
    ],
    beat: 'Henry — showing the row a photo of a small boy standing at a fence. The row has agreed he is a genius.',
    letter: [
      'Captain,',
      'He said “Papa” this week. At the dog first, then at me. We’re counting it.',
      'You were there at the start of him, in a manner of speaking. Seemed right you should hear how it’s going.',
      '— Henry',
    ],
  },
  priya: {
    desc: 'settled now · Hope is thriving',
    meet: [
      '“Hope has three new leaves, Captain. She’s basically a tree now. I am unbearable about it.”',
      '“The apartment is still small, but it’s mine now. There’s a rug. Apparently a rug makes it a home.”',
      '“I own a kettle. I have a neighbour who waters Hope when I travel. It got easier — you were right not to lie.”',
    ],
    beat: 'Priya — watering Hope with a plastic cup, same as ever, but humming this time.',
    letter: [
      'Dear Captain,',
      'Hope outgrew her pot. She’s on the windowsill facing the street now, showing off to the whole neighbourhood.',
      'I have people now. Imagine that — I’m somebody’s person to call when THEY travel.',
      'It got easier. Slower than I wanted, faster than I feared.',
      '— Priya',
    ],
  },
  marcus: {
    desc: 'home for good · going to show up for a friend',
    meet: [
      '“No surprise this time, Captain. Mom knows I’m travelling. She’s making pancakes anyway — she’s decided that’s just what she does now.”',
      '“I’m flying to see a guy from my unit. He’s in a hard stretch. You show up — that’s the whole doctrine.”',
      '“Home is home now. Took me a while to believe it. I believe it.”',
    ],
    beat: 'Marcus — asleep at last, easy in a way he wasn’t the first time you carried him.',
    letter: [
      'Captain —',
      'He laughed. That was the whole mission, and the mission got done. We didn’t fix everything. We showed up.',
      'You brought me home once. Now I get to go and bring somebody else. Funny how it travels.',
      '— Marcus',
    ],
  },
  elena: {
    desc: 'travelling with her sister this time',
    meet: [
      '“See her, by the window? That’s my sister. The one from the story. She’s real — check her ticket.”',
      '“Three years we didn’t talk. Now she steals my window seat and I let her. Everything came back, plus interest.”',
      '“We’re taking a sisters’ trip. No occasion. That’s the occasion.”',
    ],
    beat: 'Elena and her sister — two heads over one phone, laughing at something only they can see.',
    letter: [
      'Dear Captain,',
      'She stole my window seat the whole way home and I didn’t say a word. Some things you don’t get back. That one I did.',
      'Last time you flew me toward her. This time we flew together. Less scary, with company.',
      '— Elena',
    ],
  },
  noah: {
    desc: 'a dad · Elena’s first flight',
    meet: [
      '“Captain. CAPTAIN. You got me there in time, that day. I never did thank you properly.”',
      '“Elena’s four months old now. She’s down the cabin eating her own foot. That’s her whole act so far.”',
      '“First flight for her. I told her the captain’s an old friend of the family.”',
    ],
    beat: 'Noah — walking the aisle with a wide-awake Elena, pointing out the lights like a tour guide.',
    letter: [
      'CAPTAIN.',
      'She slept through takeoff and woke up for the clouds. Four months old and already a better traveller than her dad.',
      'Last time you carried me to meet her. This time you carried us both. Full circle, at 38,000 feet.',
      '— Noah (and Elena)',
    ],
  },
};

// ---------------------------------------------------------------- storage (fox.-prefixed)
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
export function letters() { const L = lsGet('fox.letters', []); return Array.isArray(L) ? L : []; }
function cycle() { const c = lsGet('fox.storyCycle', null); return c && Array.isArray(c.used) ? c : { used: [], cycles: 0, lastKind: null }; }
function threads() { const t = lsGet('fox.threads', null); return t && typeof t === 'object' && !Array.isArray(t) ? t : {}; }
function returnCycle() { const c = lsGet('fox.returnCycle', null); return c && Array.isArray(c.used) ? c : { used: [], last: null }; }
// A passenger is a PENDING RETURN when their first story completed (thread, stage 1)
// and they have a second chapter written.
function pendingReturn(s, th) { return !!(RETURNS[s.id] && th[s.id] && th[s.id].stage === 1); }
function returnCandidates() {
  const th = threads();
  const pool = ROSTER.filter(s => pendingReturn(s, th));
  if (!pool.length) return [];
  const rc = returnCycle();
  let avail = pool.filter(s => !rc.used.includes(s.id) && s.id !== rc.last);
  if (!avail.length) {
    // every pending return has been offered this round: a new round begins — but the
    // most recent return still never repeats back-to-back
    lsSet('fox.returnCycle', { used: [], last: rc.last });
    avail = pool.filter(s => s.id !== rc.last);
  }
  return avail;
}
// Pick today's encounter: { base (roster entry), isReturn }. First cycle: pure roster
// order, exactly as shipped. Once the roster has been exhausted once (the cycle rolls),
// pending returns join the rotation — interleaved with fresh stories, never offered
// twice in a row while a fresh story is available.
function pickStory() {
  let cyc = cycle();
  if (cyc.used.length >= ROSTER.length) { // roster exhausted: the cycle restarts, letters + threads stay
    cyc = { used: [], cycles: (cyc.cycles || 0) + 1, lastKind: cyc.lastKind || null };
    lsSet('fox.storyCycle', cyc);
  }
  const th = threads();
  const anyPending = ROSTER.some(s => pendingReturn(s, th));
  const skipFresh = s => anyPending && !!RETURNS[s.id] && !!th[s.id]; // mid-story or told: no first-meeting replay
  let fresh = ROSTER.filter(s => !cyc.used.includes(s.id) && !skipFresh(s));
  if (!fresh.length && cyc.used.length) { // the fresh sub-pool drained mid-cycle: reopen it
    cyc = { used: [], cycles: cyc.cycles || 0, lastKind: cyc.lastKind || null };
    lsSet('fox.storyCycle', cyc);
    fresh = ROSTER.filter(s => !skipFresh(s));
  }
  const ret = (cyc.cycles || 0) >= 1 ? returnCandidates() : [];
  let base = null, isReturn = false;
  if (ret.length && cyc.lastKind !== 'return') { base = ret[0]; isReturn = true; }
  else if (fresh.length) base = fresh[0];
  else if (ret.length) { base = ret[0]; isReturn = true; }
  if (!base) base = ROSTER[0]; // unreachable safety: the six without second chapters are never skipped
  cyc.lastKind = isReturn ? 'return' : 'fresh';
  lsSet('fox.storyCycle', cyc);
  return { base, isReturn };
}
function consume(id, isReturn) {
  if (isReturn) {
    const rc = returnCycle();
    if (!rc.used.includes(id)) rc.used.push(id);
    rc.last = id;
    lsSet('fox.returnCycle', rc);
  } else {
    const c = cycle(); if (!c.used.includes(id)) { c.used.push(id); lsSet('fox.storyCycle', c); }
  }
}

// ---------------------------------------------------------------- per-flight state
const S = {
  story: null,      // the roster entry offered on this flight
  foot: null,       // the OnFoot instance it was armed on
  fig: null,        // the lounge figure carrying the story (term-local coords)
  marker: null,     // the little heart sprite over their head
  markerBaseY: 0,
  met: false,       // the captain said hello
  beatShown: false, // the cruise beat already surfaced
  cruiseSince: 0,   // wall-clock start of the current continuous cruise stretch
  done: false,      // trip completed / consumed
};

export function reset() {
  S.story = null; S.foot = null; S.fig = null; S.marker = null; S.met = false; S.beatShown = false; S.cruiseSince = 0; S.done = false;
  const el = document.getElementById('storyCard'); if (el) el.remove();
}

// Arm the story for a departures on-foot session: pick the next story in the rotation and mark
// one lounge figure — from the LAST boarding group, so the captain has the whole pre-boarding
// window to find them. The figure is an ordinary flightPax member: it boards with its group,
// one-for-one at the door, exactly like the other 120.
export function arm(foot) {
  if (!foot || !foot.parts || !foot.parts.term) return false;
  if (S.story && S.foot === foot) return true; // already armed on this terminal build
  const term = foot.parts.term, figs = term.flightPax || [];
  if (!figs.length) return false;
  let maxG = 0; for (const p of figs) if (p.bp && p.bp.group > maxG) maxG = p.bp.group;
  const fig = figs.find(p => p.bp && p.bp.group === maxG) || figs[figs.length - 1];
  if (!fig) return false;
  const pick = pickStory();
  S.story = pick.isReturn
    ? { id: pick.base.id, name: pick.base.name, desc: RETURNS[pick.base.id].desc, meet: RETURNS[pick.base.id].meet, beat: RETURNS[pick.base.id].beat, letter: RETURNS[pick.base.id].letter, isReturn: true }
    : pick.base;
  S.foot = foot; S.fig = fig; S.met = false; S.beatShown = false; S.cruiseSince = 0; S.done = false;
  foot.storyFig = fig; foot.storyName = S.story.name; foot.storyMet = false;
  // the marker: a small fox-orange heart floating over their head (a sprite — no people-system cost)
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d'); cx.font = '104px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    // deep fox-orange with a dark edge: the hall's bright tone mapping washes a pale fill to cream
    cx.shadowColor = 'rgba(120,50,5,.95)'; cx.shadowBlur = 7; cx.fillStyle = '#e8721c'; cx.fillText('♥', 64, 70); cx.fillText('♥', 64, 70);
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    S.marker = new THREE.Sprite(mat); S.marker.scale.set(0.36, 0.36, 1);
    S.markerBaseY = fig.y + 2.05; S.marker.position.set(fig.x, S.markerBaseY, fig.z);
    term.group.add(S.marker);
  } catch (e) { S.marker = null; }
  return true;
}

// Is the captain standing close enough to say hello? (term-local distance, like the flow gates)
export function nearFig(foot) {
  if (!S.story || S.met || !S.fig || !foot || !foot.parts || !foot.parts.term) return false;
  const bp = S.fig.bp; if (bp && bp.state !== 'wait') return false; // they've been called — the moment has passed
  const lp = foot.parts.term.group.worldToLocal(foot.pos.clone());
  return Math.hypot(lp.x - S.fig.x, lp.z - S.fig.z) < 2.4;
}

// E pressed near the story passenger: open the hello card. True = the press was used.
export function tryMeet(foot) {
  if (!nearFig(foot)) return false;
  S.met = true; if (foot) foot.storyMet = true;
  if (S.marker) { S.marker.visible = false; }
  showCard(S.story);
  return true;
}

function showCard(story) {
  try {
    const old = document.getElementById('storyCard'); if (old) old.remove();
    const el = document.createElement('div'); el.id = 'storyCard';
    el.style.cssText = 'position:fixed;left:18px;top:64px;width:308px;background:#10161f;color:#eef2f6;border-radius:10px;box-shadow:0 10px 34px rgba(0,0,0,.45);font:13px/1.55 system-ui,sans-serif;padding:0 0 12px;overflow:hidden;opacity:0;transition:opacity .45s;pointer-events:none;z-index:60;border-top:3px solid #e07f2e';
    el.innerHTML = '<div style="background:#0d2b4c;color:#fff;padding:7px 12px;font-weight:700;letter-spacing:.06em">AT THE GATE <span style="float:right;font-weight:400;color:#e8a35c">NF 412</span></div>'
      + '<div style="padding:10px 14px 0"><b style="font-size:16px">' + story.name + '</b><br><span style="color:#9fb2c3">' + story.desc + '</span></div>'
      + story.meet.map(l => '<div style="padding:7px 14px 0">' + l + '</div>').join('')
      + '<div style="padding:12px 14px 0"><button id="storyCardBtn" style="pointer-events:auto;cursor:pointer;background:#e07f2e;color:#14100b;border:0;border-radius:7px;padding:8px 14px;font:600 13px system-ui,sans-serif">See you up there ✈</button></div>';
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    const close = () => { el.style.opacity = '0'; setTimeout(() => el.remove(), 600); };
    el.querySelector('#storyCardBtn').onclick = close;
    setTimeout(() => { if (el.isConnected) close(); }, 45000); // never trap the captain behind a card
  } catch (e) { }
}

// Per-frame tick (called from the main frame loop): keep the marker bobbing over the figure
// while they wait, and surface the one cruise beat. The beat is timed on the WALL clock, not on
// accumulated frame dt: frame dt is clamped (0.25 s), so on a slow renderer dt accumulation
// runs far behind real time and the beat would effectively never fire. Twenty real seconds
// into a continuous cruise stretch, the beat surfaces — once.
export function frame(dt, env) {
  if (S.marker && S.fig && !S.met) {
    const bp = S.fig.bp;
    if (bp && bp.state === 'gone') S.marker.visible = false;
    else { S.marker.visible = true; S.marker.position.set(S.fig.x, S.markerBaseY + Math.sin(performance.now() / 480) * 0.07, S.fig.z); }
  }
  if (!S.story || !S.met || S.beatShown || S.done) { S.cruiseSince = 0; return; }
  if (env && env.phase === 'cruise' && !env.onGround) {
    const now = performance.now();
    if (!S.cruiseSince) S.cruiseSince = now;
    else if (now - S.cruiseSince >= 20000) { S.beatShown = true; if (env.toast) env.toast(S.story.beat, 9000); }
  } else S.cruiseSince = 0;
}

// Trip completion (from finishTrip): the story is consumed either way; the letter lands only
// if the captain met them. A met completion also writes the THREAD: a first letter opens it
// (stage 1), a met return visit brings it to stage 2. Returns the letter written, or null.
export function completeTrip(info) {
  if (!S.story || S.done) return null;
  S.done = true;
  const story = S.story; consume(story.id, !!story.isReturn);
  if (!S.met) return null;
  const letter = {
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    route: info.from + '→' + info.to, flight: 'NF 412',
    id: story.id, name: story.name, text: story.letter.slice(),
    again: !!story.isReturn, stage: story.isReturn ? 2 : 1,
  };
  const all = letters(); all.unshift(letter); lsSet('fox.letters', all.slice(0, 60));
  const th = threads();
  const t = th[story.id] || (th[story.id] = { stage: 1, first: letter.date, last: letter.date, flights: 0 });
  t.last = letter.date; t.flights = (t.flights || 0) + 1;
  if (story.isReturn) t.stage = 2;
  lsSet('fox.threads', th);
  return letter;
}

// The logbook's Letters section (rendered by main.js renderLog alongside the flights table).
export function lettersHtml() {
  const all = letters(); if (!all.length) return '';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return '<div class="sechead" style="margin-top:28px"><h3 style="margin:0">✉ Letters</h3></div>'
    + '<p style="color:var(--mute);margin:4px 0 14px">From the people you carried. They keep.</p>'
    + all.map(l => '<div style="border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:14px 16px;margin:0 0 12px;background:rgba(255,255,255,.03)">'
      + '<div style="margin-bottom:6px"><b>' + esc(l.name) + (l.again ? ' — again' : '') + '</b> <span style="color:var(--mute)">· ' + esc(l.date) + ' · ' + esc(l.flight) + ' · ' + esc(l.route) + '</span></div>'
      + l.text.map(p => '<p style="margin:0 0 6px">' + esc(p) + '</p>').join('') + '</div>').join('');
}

export function state() {
  return {
    armed: !!S.story, id: S.story ? S.story.id : null, name: S.story ? S.story.name : null,
    isReturn: !!(S.story && S.story.isReturn),
    met: S.met, beatShown: S.beatShown, done: S.done,
    figGroup: S.fig && S.fig.bp ? S.fig.bp.group : null,
    figState: S.fig && S.fig.bp ? S.fig.bp.state : null,
    figLocal: S.fig ? { x: +S.fig.x.toFixed(2), z: +S.fig.z.toFixed(2) } : null,
    letters: letters().length, used: cycle().used.slice(),
    cycles: cycle().cycles || 0, threads: threads(), returnUsed: returnCycle().used.slice(),
  };
}
