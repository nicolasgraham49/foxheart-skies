// One speech manager for everything that talks: cabin PA, ATC to you (and your readbacks), ATIS, background
// chatter and GPWS callouts. Only ever one utterance is handed to the browser at a time, so cancelling one
// item never kills another. Priorities: GPWS 5 (never over a PA) > PA 4 > ATC 3 > ATIS 2 > chatter 1.
// Text is split into short chunks (sentences, then commas, max ~180 chars) to dodge Chrome's ~15 s cut-off.
// Subtitles are shown for everything; if speech is missing or silent the subtitles carry on by themselves.
export const PRIO = { gpws: 5, pa: 4, crew: 3.5, atc: 3, atis: 2, chatter: 1 }; // crew: the first officer's checklist callouts on the flight deck
export function chunkText(t, max = 180) {
  const out = []; const sentences = String(t).replace(/\s+/g, ' ').trim().split(/(?<=[.!?。])\s+/);
  for (let s of sentences) {
    while (s.length > max) {
      let cut = -1; for (const re of [/[,;:]\s/g, /\s/g]) { let m; re.lastIndex = 0; while ((m = re.exec(s)) && m.index < max) cut = m.index + 1; if (cut > max * 0.35) break; }
      if (cut <= 0) cut = max; out.push(s.slice(0, cut).trim()); s = s.slice(cut).trim();
    }
    if (s) out.push(s);
  }
  // merge very short neighbours so the voice keeps its flow
  const merged = []; for (const c of out) { const last = merged[merged.length - 1]; if (last && last.length + c.length < 70) merged[merged.length - 1] = last + ' ' + c; else merged.push(c); }
  return merged;
}
const est = (text, rate = 1) => 0.5 + text.length * 0.062 / rate; // seconds
export class Speech {
  constructor() {
    this.items = []; this.cur = null; this.n = 0; this.tok = 0; this.timer = null; this.watch = null; this.wait = null;
    this.enabled = true; this.available = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    this.silent = false; this.quick = 0; this.listeners = []; this.log = []; this.badVoices = new Set(); // voices that failed on this machine (session only)
    if (this.available) { try { const v = () => this.emit('voices'); speechSynthesis.addEventListener ? speechSynthesis.addEventListener('voiceschanged', v) : (speechSynthesis.onvoiceschanged = v); } catch (e) { } }
  }
  on(f) { this.listeners.push(f); } emit(ev, it) { for (const f of this.listeners) try { f(ev, it, this); } catch (e) { } }
  voices() { try { return this.available ? speechSynthesis.getVoices() : []; } catch (e) { return []; } }
  canSpeak() { return this.enabled && this.available && !this.silent; }
  busyWith(ch) { return !!(this.cur && this.cur.channel === ch) || this.items.some(i => i.channel === ch); }
  // o: { text, display, who, channel, prio, voice (fn or voice), lang, accent (ordered locale tags — ATC controllers only, see resolveVoice), rate, pitch, volume, delay (s), onstart, onend, maxWait (s) }
  say(o) {
    const channel = o.channel || 'atc', prio = o.prio ?? PRIO[channel] ?? 3, now = performance.now();
    if (channel === 'gpws' && this.cur && this.cur.channel === 'pa') return null; // never talk over the captain's PA
    const it = { id: ++this.n, channel, prio, o, chunks: chunkText(o.text || o.display || ''), i: 0, ready: now + (o.delay || 0) * 1000, born: now, started: false };
    if (!it.chunks.length) it.chunks = ['']; this.items.push(it); this.items.sort((a, b) => b.prio - a.prio || a.id - b.id);
    const c = this.cur;
    if (c && it.prio > c.prio && (c.prio <= PRIO.atis || channel === 'gpws')) this.interrupt(c.channel === 'chatter'); // chatter is dropped; ATIS / ATC resume
    this.pump(); return it.id;
  }
  cancel(channel) {
    const drop = this.items.filter(i => i.channel === channel); this.items = this.items.filter(i => i.channel !== channel);
    if (this.cur && this.cur.channel === channel) { const c = this.cur; this.stopUtt(); this.cur = null; this.end(c, true); }
    for (const d of drop) if (d !== this.cur && d.started) d.o.onend && d.o.onend(true);
    this.pump();
  }
  interrupt(drop) { const c = this.cur; if (!c) return; this.stopUtt(); this.cur = null; if (drop) { this.items = this.items.filter(i => i !== c); this.end(c, true); } }
  stopUtt() { this.tok++; clearTimeout(this.timer); clearTimeout(this.watch); if (this.available) try { speechSynthesis.cancel(); } catch (e) { } }
  pump() {
    clearTimeout(this.wait); if (this.cur) return; const now = performance.now();
    this.items = this.items.filter(i => !(i.channel === 'chatter' && !i.started && now - i.born > 12000) && !(i.o.maxWait && !i.started && now - i.born > i.o.maxWait * 1000));
    const it = this.items[0]; if (!it) return;
    if (it.ready > now) { this.wait = setTimeout(() => this.pump(), it.ready - now + 5); return; }
    this.speak(it);
  }
  // ---------------------------------------------------------------- voice resolution: never hand the browser a voice that
  // cannot speak. Callers (ATC personas, the PA) pick voices from lists that can go stale, and on real machines the
  // top-ranked "natural / online" voices are network voices that can fail silently — that is what muted the
  // controllers on Auto while a hand-picked Settings voice worked. So at speak time every request is re-validated
  // against a FRESH getVoices() (matched by name + lang, never a cached object), skipped if it already failed this
  // session, and only used when its language matches the utterance's; otherwise the best same-language voice is
  // substituted (local voices first — they cannot die with the network), and failing that the utterance goes out
  // lang-only on the browser's default voice. A voice that errors or ends instantly is blocklisted and the chunk is
  // re-spoken once with the next candidate, so one dead voice can never mute a channel.
  // ACCENT EXCEPTION — narrow and opt-in: a caller may pass o.accent, an ordered list of locale tags (BCP-47,
  // lowercase, e.g. ['es'] or ['ar', 'en-gb', 'en-in']). ONLY ATC passes it, and only for controller speech, so a
  // facility at a foreign airport can speak English with that place's voice — a Spanish voice reading English IS
  // the Latin accent. When (and only when) accent tags are present, resolveVoice may return a voice whose language
  // differs from the utterance's, provided the voice's locale matches one of the tags: the caller's own pick wins
  // when it already carries the accent, else the best matching voice per tag in preference order. The utterance's
  // lang tag is still set from o.lang exactly as always (it, not the voice, declares what is being pronounced).
  // Every safety above still applies inside the accent branch: fresh list, blocklist skipped, local-first ranking,
  // and if no accent voice exists (or all are blocklisted) resolution falls through to the normal same-language
  // path — an accent can never cause silence. Callers who pass no accent get byte-identical behaviour to before.
  voiceKey(v) { return v ? String(v.name || v.voiceURI || '') + '|' + String(v.lang || '') : ''; }
  voiceBad(v) { return !!(v && this.badVoices.has(this.voiceKey(v))); }
  markBad(v) { if (v) this.badVoices.add(this.voiceKey(v)); }
  static rankV(v) { return (v.localService ? 100 : 0) + (/natural|neural/i.test(v.name) ? 30 : 0) + (/google/i.test(v.name) ? 15 : 0) + (/microsoft/i.test(v.name) ? 8 : 0) + (v.default ? 4 : 0) - (/compact|espeak/i.test(v.name) ? 60 : 0); }
  resolveVoice(req, lang, accent) {
    const list = this.voices(); if (!list.length) return null;
    const norm = s => String(s || '').toLowerCase().replace(/_/g, '-');
    const l2 = s => norm(s).slice(0, 2);
    const tgt = l2(lang || (req && req.lang) || 'en');
    const fresh = req && typeof req === 'object' && req.name ? list.find(x => x.name === req.name && l2(x.lang) === l2(req.lang)) : null;
    if (fresh && !this.voiceBad(fresh) && l2(fresh.lang) === tgt) return fresh;
    if (Array.isArray(accent) && accent.length) { // accent branch (see contract above): pick, then per-tag pools
      const hit = t => { const tg = norm(t); return v => { const vl = norm(v.lang); return vl === tg || vl.startsWith(tg + '-') || (tg.length === 2 && l2(vl) === tg); }; };
      if (fresh && !this.voiceBad(fresh) && accent.some(t => hit(t)(fresh))) return fresh;
      for (const t of accent) { const p = list.filter(v => hit(t)(v) && !this.voiceBad(v)).sort((a, b) => Speech.rankV(b) - Speech.rankV(a)); if (p.length) return p[0]; }
    }
    const pool = list.filter(v => l2(v.lang) === tgt && !this.voiceBad(v)).sort((a, b) => Speech.rankV(b) - Speech.rankV(a));
    return pool[0] || null;
  }
  speak(it) {
    this.cur = it; if (!it.started) { it.started = true; it.o.onstart && it.o.onstart(); this.log.push({ ch: it.channel, text: it.o.text, t: performance.now() }); if (this.log.length > 60) this.log.shift(); this.emit('start', it); }
    const text = it.chunks[it.i] || ''; const tok = ++this.tok;
    const fin1 = (x, d) => { const n = Number(x); return Number.isFinite(n) ? n : d; };
    const rate = Math.min(2, Math.max(0.5, fin1(it.o.rate, 1))), pitch = Math.min(2, Math.max(0, fin1(it.o.pitch, 1))), volume = Math.min(1, Math.max(0, fin1(it.o.volume, 1)));
    const t0 = performance.now();
    const next = () => { if (tok !== this.tok) return; clearTimeout(this.timer); clearTimeout(this.watch); it.i++; if (it.i >= it.chunks.length) { this.cur = null; this.items = this.items.filter(i => i !== it); this.end(it, false); this.pump(); } else this.timer = setTimeout(() => { if (tok === this.tok) this.speak(it); }, 60); };
    this.emit('chunk', it);
    if (!text || !this.canSpeak() || it.o.mute) { this.timer = setTimeout(next, est(text, rate) * 1000); return; }
    try {
      const u = new SpeechSynthesisUtterance(text);
      const want = typeof it.o.voice === 'function' ? it.o.voice() : it.o.voice;
      const v = this.resolveVoice(want, it.o.lang, it.o.accent); it.curVoice = v || null;
      u.lang = it.o.lang || (v && v.lang) || 'en-US'; // the requested language rules; a voice never overrides it
      try { if (v) u.voice = v; } catch (e) { }
      u.rate = rate; u.pitch = pitch; u.volume = volume;
      const retry = () => { if (it.retried) return false; it.retried = true; this.markBad(it.curVoice); clearTimeout(this.watch); this.speak(it); return true; };
      u.onend = () => { if (tok !== this.tok) return; if (performance.now() - t0 < 60 && text.length > 25) { if (it.curVoice && retry()) return; if (++this.quick >= 3) this.goSilent('speech ends instantly'); } else this.quick = 0; next(); };
      u.onerror = e => { if (tok !== this.tok) return; const er = e && e.error; if (er === 'interrupted' || er === 'canceled') return; if (er === 'not-allowed') { this.goSilent('not allowed yet'); next(); return; } if (it.curVoice && /synthesis|network|voice|language|audio/.test(er || '') && retry()) return; next(); };
      this.watch = setTimeout(() => { if (tok === this.tok) { try { speechSynthesis.cancel(); } catch (e) { } next(); } }, est(text, rate) * 2200 + 3000);
      speechSynthesis.speak(u);
    } catch (e) { this.timer = setTimeout(next, est(text, rate) * 1000); }
  }
  end(it, aborted) { this.emit('end', it); it.o.onend && it.o.onend(aborted); }
  goSilent(why) { if (this.silent) return; this.silent = why !== 'not allowed yet'; this.emit('silent', null); if (!this.silent) { this.silentSoft = true; } }
  // called when the user interacts again (speech may now be allowed); also the recovery from the instant-end
  // latch, which used to be one-way and could mute every channel for the rest of the session
  unlock() { this.silent = false; this.quick = 0; if (this.silentSoft) { this.silentSoft = false; } }
}
