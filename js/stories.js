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

// ---------------------------------------------------------------- storage (fox.-prefixed)
function lsGet(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
export function letters() { const L = lsGet('fox.letters', []); return Array.isArray(L) ? L : []; }
function cycle() { const c = lsGet('fox.storyCycle', null); return c && Array.isArray(c.used) ? c : { used: [] }; }
function nextStory() {
  const used = cycle().used;
  for (const s of ROSTER) if (!used.includes(s.id)) return s;
  lsSet('fox.storyCycle', { used: [] }); // roster exhausted: the cycle restarts, letters stay
  return ROSTER[0];
}
function consume(id) { const c = cycle(); if (!c.used.includes(id)) { c.used.push(id); lsSet('fox.storyCycle', c); } }

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
  S.story = nextStory(); S.foot = foot; S.fig = fig; S.met = false; S.beatShown = false; S.cruiseSince = 0; S.done = false;
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
// if the captain met them. Returns the letter written, or null.
export function completeTrip(info) {
  if (!S.story || S.done) return null;
  S.done = true;
  const story = S.story; consume(story.id);
  if (!S.met) return null;
  const letter = {
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    route: info.from + '→' + info.to, flight: 'NF 412',
    id: story.id, name: story.name, text: story.letter.slice(),
  };
  const all = letters(); all.unshift(letter); lsSet('fox.letters', all.slice(0, 60));
  return letter;
}

// The logbook's Letters section (rendered by main.js renderLog alongside the flights table).
export function lettersHtml() {
  const all = letters(); if (!all.length) return '';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return '<div class="sechead" style="margin-top:28px"><h3 style="margin:0">✉ Letters</h3></div>'
    + '<p style="color:var(--mute);margin:4px 0 14px">From the people you carried. They keep.</p>'
    + all.map(l => '<div style="border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:14px 16px;margin:0 0 12px;background:rgba(255,255,255,.03)">'
      + '<div style="margin-bottom:6px"><b>' + esc(l.name) + '</b> <span style="color:var(--mute)">· ' + esc(l.date) + ' · ' + esc(l.flight) + ' · ' + esc(l.route) + '</span></div>'
      + l.text.map(p => '<p style="margin:0 0 6px">' + esc(p) + '</p>').join('') + '</div>').join('');
}

export function state() {
  return {
    armed: !!S.story, id: S.story ? S.story.id : null, name: S.story ? S.story.name : null,
    met: S.met, beatShown: S.beatShown, done: S.done,
    figGroup: S.fig && S.fig.bp ? S.fig.bp.group : null,
    figState: S.fig && S.fig.bp ? S.fig.bp.state : null,
    figLocal: S.fig ? { x: +S.fig.x.toFixed(2), z: +S.fig.z.toFixed(2) } : null,
    letters: letters().length, used: cycle().used.slice(),
  };
}
