// Cabin PA: ready-made captain/crew announcements (EN, with ES/KO versions of most), typed custom
// announcements, ding-dong chime and PA hiss via Web Audio, speech via speechSynthesis.
// Announcement language follows the airport (owner rule): automatic announcements lead with the local
// language of the airport they belong to — the departure airport, or the arrival airport for arrival-side
// lines — and the language picked in the PA menu follows when it differs. aptLang is ATC's mapping, reused.
import { aptLang } from './atc.js';
const ES_CITY = { KTPA: 'Tampa', KMIA: 'Miami', RKSI: 'Incheon', RKSS: 'Gimpo', KLAX: 'Los Ángeles', MPTO: 'Ciudad de Panamá', KJFK: 'Nueva York', KSFO: 'San Francisco', RJTT: 'Tokio', EGLL: 'Londres', OMDB: 'Dubái', WSSS: 'Singapur' };
const KO_CITY = { KTPA: '탬파', KMIA: '마이애미', RKSI: '인천', RKSS: '김포', KLAX: '로스앤젤레스', MPTO: '파나마시티', KJFK: '뉴욕', KSFO: '샌프란시스코', RJTT: '도쿄', EGLL: '런던', OMDB: '두바이', WSSS: '싱가포르' };
const WX = { clear: ['clear skies', 'cielo despejado', '맑은 날씨'], scattered: ['a few clouds', 'algunas nubes', '구름 조금'], overcast: ['overcast skies', 'cielo nublado', '흐린 날씨'], rain: ['some rain', 'algo de lluvia', '비'], fog: ['fog', 'niebla', '안개'] };
const hm = m => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return { h, mm }; };
export const PA_LINES = [
  { id: 'welcome', who: 'captain', label: 'Welcome aboard', boost: 4,
    en: c => `Ladies and gentlemen, ${c.greet}, this is your captain speaking. Welcome aboard Nicofoxheart Air flight four one two from ${c.o} to ${c.d}. Our flight time today will be ${c.ftEn}, and we'll be cruising at ${c.cruiseEn}. Please sit back, relax, and enjoy the flight.`,
    es: c => `Señoras y señores, ${c.greetEs}, les habla su capitán. Bienvenidos a bordo del vuelo cuatro uno dos de Nicofoxheart Air, de ${c.oEs} a ${c.dEs}. Nuestro tiempo de vuelo será de ${c.ftEs}. Relájense y disfruten del vuelo.`,
    ko: c => `손님 여러분, 안녕하십니까. 기장입니다. ${c.oKo}에서 ${c.dKo}까지 가는 니코폭스하트 항공 412편에 탑승해 주셔서 감사합니다. 비행 시간은 약 ${c.ftKo}입니다. 편안한 여행 되십시오.` },
  { id: 'belt_on', who: 'crew', label: 'Seatbelt sign on', boost: 2, sign: true,
    en: () => 'Ladies and gentlemen, the captain has turned on the fasten seatbelt sign. Please return to your seats and keep your seatbelts securely fastened.',
    es: () => 'Señoras y señores, el capitán ha encendido la señal de abrocharse los cinturones. Por favor regresen a sus asientos y mantengan sus cinturones abrochados.',
    ko: () => '손님 여러분, 좌석벨트 표시등이 켜졌습니다. 자리로 돌아가셔서 좌석벨트를 단단히 매 주시기 바랍니다.' },
  { id: 'belt_off', who: 'captain', label: 'Seatbelt sign off', boost: 2, sign: false,
    en: () => 'Ladies and gentlemen, the captain has turned off the seatbelt sign. You are now free to move about the cabin, but we recommend keeping your seatbelt fastened while seated.',
    es: () => 'Señoras y señores, el capitán ha apagado la señal de cinturones. Pueden moverse por la cabina, pero les recomendamos mantener el cinturón abrochado mientras estén sentados.',
    ko: () => '손님 여러분, 좌석벨트 표시등이 꺼졌습니다. 기내에서 자유롭게 이동하실 수 있지만, 앉아 계실 때는 좌석벨트를 매 주시기 바랍니다.' },
  { id: 'crew_takeoff', who: 'captain', label: 'Cabin crew, prepare for takeoff', boost: 1,
    en: () => 'Cabin crew, please be seated for takeoff.', es: () => 'Tripulación de cabina, tomen asiento para el despegue.', ko: () => '승무원은 이륙을 위해 착석해 주십시오.' },
  { id: 'cruise', who: 'captain', label: 'Cruise altitude reached', boost: 2,
    en: c => `Ladies and gentlemen, we've reached our cruising altitude of ${c.cruiseEn}. The weather in ${c.d} is ${c.wxEn}, and we expect to arrive on time. The crew will be coming through the cabin shortly with drinks and snacks.`,
    es: c => `Señoras y señores, hemos alcanzado nuestra altitud de crucero. En ${c.dEs} hay ${c.wxEs} y esperamos llegar a tiempo.`,
    ko: c => `손님 여러분, 순항 고도에 도달했습니다. ${c.dKo}의 날씨는 ${c.wxKo}이며, 정시에 도착할 예정입니다.` },
  { id: 'turbulence', who: 'captain', label: 'Turbulence ahead', boost: 3, sign: true,
    en: () => 'Ladies and gentlemen, we are expecting some turbulence ahead. Please return to your seats and fasten your seatbelts. Cabin crew, please be seated.',
    es: () => 'Señoras y señores, esperamos algo de turbulencia. Por favor regresen a sus asientos y abróchense el cinturón.',
    ko: () => '손님 여러분, 잠시 후 기류가 불안정한 지역을 통과할 예정입니다. 자리에 앉아 좌석벨트를 매 주십시오.' },
  { id: 'descent', who: 'captain', label: 'Beginning our descent', boost: 2,
    en: c => `Ladies and gentlemen, we have begun our descent into ${c.d}. Please make sure your seat backs and tray tables are in their upright position and your seatbelt is fastened.`,
    es: c => `Señoras y señores, hemos iniciado el descenso hacia ${c.dEs}. Por favor coloquen el respaldo y la mesa en posición vertical.`,
    ko: c => `손님 여러분, 우리 비행기는 ${c.dKo}을 향해 강하를 시작했습니다. 좌석 등받이와 테이블을 제자리로 해 주십시오.` },
  { id: 'crew_landing', who: 'captain', label: 'Cabin crew, prepare for landing', boost: 1,
    en: () => 'Cabin crew, please prepare the cabin for landing.', es: () => 'Tripulación de cabina, preparen la cabina para el aterrizaje.', ko: () => '승무원은 착륙 준비를 해 주십시오.' },
  { id: 'arrival', who: 'crew', label: 'Welcome to the destination', boost: 3,
    en: c => `Ladies and gentlemen, welcome to ${c.d}. The local time is ${c.timeEn} and the temperature is ${c.temp} degrees Celsius with ${c.wxEn}. Please remain seated until the seatbelt sign is turned off. Thank you for flying Nicofoxheart Air.`,
    es: c => `Señoras y señores, bienvenidos a ${c.dEs}. La hora local es ${c.timeEs} y la temperatura es de ${c.temp} grados con ${c.wxEs}. Gracias por volar con Nicofoxheart Air.`,
    ko: c => `손님 여러분, ${c.dKo}에 오신 것을 환영합니다. 현지 시각은 ${c.timeKo}이며 기온은 섭씨 ${c.temp}도, ${c.wxKo}입니다. 니코폭스하트 항공을 이용해 주셔서 감사합니다.` },
  { id: 'meal', who: 'captain', label: 'Cabin crew, prepare for meal service', boost: 2,
    en: () => 'Cabin crew, please prepare for the meal service.', es: () => 'Tripulación de cabina, preparen el servicio de comidas.', ko: () => '승무원은 기내식 서비스를 준비해 주십시오.' },
];
// emergency lines (not in the numbered menu): the captain's briefing, brace, evacuate, oxygen masks
export const PA_EMERG = [
  { id: 'emerg', who: 'captain', label: 'Emergency: prepare the cabin', boost: 0, sign: true,
    en: c => `Ladies and gentlemen, this is the captain. We have a technical problem and we are diverting to ${c.d || 'the nearest airport'}. The crew is trained for this. Please listen carefully to the cabin crew, keep your seat belt fastened and follow their instructions. Cabin crew, prepare the cabin for an emergency landing.`,
    es: c => `Señoras y señores, les habla el capitán. Tenemos un problema técnico y nos desviamos a ${c.dEs || 'el aeropuerto más cercano'}. Escuchen a la tripulación, mantengan el cinturón abrochado y sigan sus instrucciones.`,
    ko: c => `손님 여러분, 기장입니다. 기술적인 문제로 ${c.dKo || '가까운 공항'}으로 회항합니다. 승무원의 안내에 따라 좌석벨트를 매고 지시를 따라 주십시오.` },
  { id: 'brace', who: 'captain', label: 'Brace for impact', boost: 0, sign: true,
    en: () => 'Brace! Brace! Brace! Heads down, stay down!', es: () => '¡Cabeza abajo! ¡Agáchense! ¡Agáchense!', ko: () => '충격 대비! 충격 대비! 머리 숙여!' },
  { id: 'evac', who: 'captain', label: 'Evacuate', boost: 0,
    en: () => 'Evacuate! Evacuate! Unfasten your seat belts and get out! Leave everything behind!', es: () => '¡Evacuar! ¡Evacuar! ¡Desabróchense los cinturones y salgan! ¡Dejen todo!', ko: () => '탈출하십시오! 탈출하십시오! 좌석벨트를 풀고 짐은 두고 나가십시오!' },
  { id: 'masks', who: 'crew', label: 'Oxygen masks', boost: 0,
    en: () => 'Put on your oxygen mask! Pull the mask toward you, place it over your nose and mouth and breathe normally. Secure your own mask before helping others.', es: () => '¡Pónganse la máscara de oxígeno! Colóquenla sobre la nariz y la boca y respiren normalmente.', ko: () => '산소마스크를 착용하십시오! 마스크를 당겨 코와 입에 대고 정상적으로 호흡하십시오.' },
];
export class PA {
  constructor(audio) { this.audio = audio; this.lang = 'en'; this.last = {}; this.log = []; this.org = null; this.dst = null; }
  context(c) { // c: { origin, dest (apt objects), distNm, cruiseFt, destLocalMin, temp, wx, localMin }
    this.org = c.origin || null; this.dst = c.dest || null;
    const ft = Math.round((c.distNm || 200) / 450 * 60 + 25); const { h, mm } = hm(ft);
    const ftEn = h ? `${h} hour${h > 1 ? 's' : ''}${mm ? ` and ${mm} minutes` : ''}` : `${mm} minutes`, ftEs = h ? `${h} hora${h > 1 ? 's' : ''}${mm ? ` y ${mm} minutos` : ''}` : `${mm} minutos`, ftKo = h ? `${h}시간${mm ? ` ${mm}분` : ''}` : `${mm}분`;
    const t = hm(((c.destLocalMin % 1440) + 1440) % 1440); const ampm = t.h >= 12 ? 'p.m.' : 'a.m.'; const h12 = ((t.h + 11) % 12) + 1;
    const greet = c.localMin < 690 ? 'good morning' : c.localMin < 1050 ? 'good afternoon' : 'good evening', greetEs = c.localMin < 720 ? 'buenos días' : c.localMin < 1140 ? 'buenas tardes' : 'buenas noches';
    const w = WX[c.wx] || WX.clear; const cruiseEn = c.cruiseFt >= 18000 ? `flight level ${Math.round(c.cruiseFt / 100)}, or ${Math.round(c.cruiseFt / 1000)} thousand feet` : `${Math.round(c.cruiseFt / 1000)} thousand feet`;
    this.c = { o: short(c.origin), d: short(c.dest), oEs: ES_CITY[c.origin.icao] || short(c.origin), dEs: ES_CITY[c.dest.icao] || short(c.dest), oKo: KO_CITY[c.origin.icao] || short(c.origin), dKo: KO_CITY[c.dest.icao] || short(c.dest),
      ftEn, ftEs, ftKo, cruiseEn, greet, greetEs, temp: c.temp, wxEn: w[0], wxEs: w[1], wxKo: w[2], timeEn: `${h12}:${String(t.mm).padStart(2, '0')} ${ampm}`, timeEs: `${t.h}:${String(t.mm).padStart(2, '0')}`, timeKo: `${t.h >= 12 ? '오후' : '오전'} ${h12}시 ${t.mm}분` };
    return this.c;
  }
  voiceFor(lang) { let vs = []; try { vs = speechSynthesis.getVoices(); } catch (e) { }
    // reliability first, same rule as the ATC auto picker: local voices outrank network ones — the old ranking put
    // "online / natural" network voices on top, and those silently fail on real Windows Chrome lists (that is why
    // the English and Korean PAs were mute while the local-only Spanish pool worked). speech.js re-validates the
    // pick at speak time and substitutes / retries if it still fails.
    const rank = v => (v.localService ? 100 : 0) + (/natural|neural/i.test(v.name) ? 30 : 0) + (/online|google/i.test(v.name) ? 15 : 0) + (/microsoft/i.test(v.name) ? 8 : 0);
    const pool = vs.filter(v => v.lang.toLowerCase().replace(/_/g, '-').startsWith(lang)).sort((a, b) => rank(b) - rank(a));
    const bad = v => this.speech && this.speech.voiceBad && this.speech.voiceBad(v);
    return pool.find(v => !bad(v)) || pool[0] || null; }
  localLang(arr) { return aptLang(arr ? this.dst : this.org); } // the language an airport speaks (ATC's mapping)
  langName(l) { return l === 'es' ? 'Spanish' : l === 'ko' ? 'Korean' : 'English'; }
  // The automatic gate / purser calls are composed in English by the session conductor in main.js. When this
  // airport's language is not English, render the same call in the local language so it can lead and let the
  // English original follow. Returns { text, who } for a known automatic call, else null (typed text etc.).
  autoLocal(text) {
    const lg = this.localLang(false); if (lg === 'en' || !text) return null;
    const city = (lg === 'es' ? ES_CITY[this.dst?.icao] : KO_CITY[this.dst?.icao]) || (this.dst ? short(this.dst) : '');
    let m;
    if (m = text.match(/^Ladies and gentlemen, Nicofoxheart Air flight four one two to .+ is now boarding at gate (.+)\. Please have your boarding pass ready/))
      return { who: 'PA · GATE', text: lg === 'es' ? `Señoras y señores, el vuelo cuatro uno dos de Nicofoxheart Air con destino a ${city} está abordando ahora en la puerta ${m[1]}. Tengan listo su pase de abordar y escuchen el número de su grupo.` : `손님 여러분, ${city}행 니코폭스하트 항공 412편 탑승을 시작합니다. ${m[1]}번 탑승구로 와 주시기 바랍니다. 탑승권을 준비하시고 그룹 번호 안내를 잘 들어 주십시오.` };
    if (m = text.match(/^Group (\d+), all remaining passengers, now boarding at gate (.+)\. This is the final call/))
      return { who: 'PA · GATE', text: lg === 'es' ? `Grupo ${m[1]}, todos los pasajeros restantes, abordando ahora en la puerta ${m[2]}. Esta es la última llamada del vuelo cuatro uno dos.` : `${m[1]}그룹, 아직 탑승하지 않은 모든 손님께서는 지금 ${m[2]}번 탑승구에서 탑승해 주십시오. 412편 마지막 탑승 안내입니다.` };
    if (m = text.match(/^Group (\d+), passengers seated in rows (\d+) to (\d+), now boarding at gate (.+)\./))
      return { who: 'PA · GATE', text: lg === 'es' ? `Grupo ${m[1]}, pasajeros de las filas ${m[2]} a ${m[3]}, abordando ahora en la puerta ${m[4]}.` : `${m[1]}그룹, ${m[2]}열부터 ${m[3]}열에 앉으신 손님께서는 지금 ${m[4]}번 탑승구에서 탑승해 주십시오.` };
    if (/^Ladies and gentlemen, welcome aboard Nicofoxheart Air flight four one two to .+\. Boarding is complete\./.test(text))
      return { who: 'PA · PURSER', text: lg === 'es' ? `Señoras y señores, bienvenidos a bordo del vuelo cuatro uno dos de Nicofoxheart Air con destino a ${city}. El abordaje ha finalizado. Por favor abróchense el cinturón de seguridad y guarden su equipaje. Les deseamos un vuelo agradable.` : `손님 여러분, ${city}행 니코폭스하트 항공 412편에 오신 것을 환영합니다. 탑승이 완료되었습니다. 좌석벨트를 매 주시고 짐은 선반이나 앞좌석 아래에 보관해 주십시오. 즐거운 비행 되시기 바랍니다.` };
    return null;
  }
  // Speak an announcement as one or more parts, in order. Part: { lang, text, enText, swap, who, missing? }.
  // A swap part falls back to its English rendering (text AND speech tag) when the browser has no voice for
  // its language — the speech-pass rule; a non-swap part (typed text) keeps its language and goes out
  // lang-only on the robust resolver instead. Identical consecutive spoken parts collapse into one.
  // returns { text, lang actually used, note }
  emit(id, L, parts, place) {
    let note = '';
    const out = [];
    for (const p of parts) {
      let spokenLang = p.lang, spokenText = p.text;
      if (p.missing) note = 'No ' + this.langName(p.missing) + ' version of this line; spoken in English.';
      if (p.swap && spokenLang !== 'en' && !this.voiceFor(spokenLang)) { note = `No ${this.langName(spokenLang)} voice is installed in this browser; shown in ${this.langName(spokenLang)}, spoken in English.`; spokenLang = 'en'; spokenText = p.enText || p.text; }
      const prev = out[out.length - 1];
      if (prev && prev.spokenText === spokenText && prev.spokenLang === spokenLang) continue;
      out.push({ ...p, spokenLang, spokenText });
    }
    if (out.length > 1 && out[0].spokenLang !== out[1].spokenLang)
      note = ((note ? note + ' ' : '') + `Announced in ${this.langName(out[0].spokenLang)} first — ${place ? place + "'s own language" : 'the local language'} — then ${this.langName(out[1].spokenLang)}.`).trim();
    const lead = out[0], combined = out.map(p => p.spokenText).join(' ');
    this.log.push({ id: id || 'custom', text: lead.text, lang: lead.lang, t: Date.now() }); if (this.log.length > 30) this.log.shift();
    const A = this.audio; A && A.paChime && A.paChime();
    const pitch = L?.who === 'crew' ? 1.15 : 0.95, vol = Math.min(1, (A?.vol ?? 0.7) + 0.2);
    if (this.speech) { // shared speech manager: PA outranks ATC / ATIS / chatter and is never cancelled by them
      out.forEach((p, i) => { const vl = p.spokenLang;
        this.speech.say({ channel: 'pa', text: p.spokenText, display: p.text, who: p.who, delay: 1.3 + i * 0.1, voice: () => this.voiceFor(vl), lang: vl === 'ko' ? 'ko-KR' : vl === 'es' ? 'es-ES' : 'en-US',
          rate: 0.95, pitch, volume: vol, mute: A?.voice === false,
          onstart: i === 0 ? () => A && A.paHiss && A.paHiss(true) : undefined, onend: i === out.length - 1 ? () => A && A.paHiss && A.paHiss(false) : undefined });
      });
      return { text: lead.text, spokenText: combined, lang: lead.lang, note, boost: L ? L.boost : 1, sign: L ? L.sign : undefined };
    }
    setTimeout(() => {
      A && A.paHiss && A.paHiss(true); let done = false; const fin = () => { if (done) return; done = true; A && A.paHiss && A.paHiss(false); };
      try {
        if (A?.voice !== false && 'speechSynthesis' in window) {
          let lastU = null;
          for (const p of out) {
            const v = this.voiceFor(p.spokenLang), tag = p.spokenLang === 'ko' ? 'ko-KR' : p.spokenLang === 'es' ? 'es-ES' : 'en-US';
            p.spokenText.split(/(?<=[.。])\s*/).filter(Boolean).forEach(c => { const u = new SpeechSynthesisUtterance(c); try { if (v && String(v.lang || '').toLowerCase().slice(0, 2) === p.spokenLang) u.voice = v; } catch (e) { } u.lang = tag; u.rate = 0.95; u.pitch = pitch; u.volume = vol; lastU = u; speechSynthesis.speak(u); });
          }
          if (lastU) { lastU.onend = fin; lastU.onerror = fin; }
        }
      } catch (e) { }
      setTimeout(fin, Math.min(30000, 1500 + combined.length * 70));
    }, 1300);
    return { text: lead.text, spokenText: combined, lang: lead.lang, note, boost: L ? L.boost : 1, sign: L ? L.sign : undefined };
  }
  // returns { text, lang actually used, note }
  announce(id, custom) {
    const L = PA_LINES.find(l => l.id === id) || PA_EMERG.find(l => l.id === id);
    if (custom != null) {
      const auto = this.autoLocal(custom); // an automatic gate / purser call: the local language leads, English follows
      if (auto) return this.emit(id, null, [
        { lang: this.localLang(false), text: auto.text, enText: custom, swap: true, who: auto.who },
        { lang: 'en', text: custom, enText: custom, swap: true, who: auto.who }], short(this.org || {}));
      let lang = this.lang; // typed text: pick the voice from the script, as before
      if (/[\uac00-\ud7af]/.test(custom)) lang = 'ko'; else if (/[ñáéíóú¿¡]/i.test(custom)) lang = 'es'; else if (lang === 'ko') lang = 'en';
      return this.emit(id, null, [{ lang, text: custom, enText: custom, swap: false, who: 'PA · YOU' }], '');
    }
    // Prepared lines lead with the airport's own language — the departure airport's, except arrival-side
    // lines ('arrival'), which speak the destination's. The language picked in the PA menu follows when it
    // differs; all three stay selectable in the menu exactly as before.
    const arrSide = id === 'arrival', lead = this.localLang(arrSide), c = this.c || {};
    const who = L.who === 'crew' ? 'PA · PURSER' : 'PA · CAPTAIN';
    const mk = lg => L[lg] ? { lang: lg, text: L[lg](c), enText: L.en(c), swap: true, who } : { lang: 'en', text: L.en(c), enText: L.en(c), swap: true, missing: lg, who };
    const parts = [mk(lead)]; if (this.lang !== lead) parts.push(mk(this.lang));
    return this.emit(id, L, parts, short((arrSide ? this.dst : this.org) || {}));
  }
}
function short(a) { return ({ KTPA: 'Tampa', KMIA: 'Miami', RKSI: 'Seoul Incheon', RKSS: 'Seoul Gimpo', KLAX: 'Los Angeles', MPTO: 'Panama City', KJFK: 'New York', KSFO: 'San Francisco', RJTT: 'Tokyo Haneda', EGLL: 'London Heathrow', OMDB: 'Dubai', WSSS: 'Singapore' })[a.icao] || a.city || a.name; }
