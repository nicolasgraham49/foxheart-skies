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
  // ---- cabin life: the safety briefing (four beats, in order, played by the session conductor after
  // boarding completes and the door closes) and the cruise service announcements. All crew lines, so the
  // purser speaks them; like every prepared line they lead with the departure airport's own language.
  { id: 'brief_belt', who: 'crew', label: 'Safety briefing: seat belts', boost: 1,
    en: () => 'Ladies and gentlemen, welcome aboard. Please watch as we demonstrate the safety features of this aircraft. To fasten your seat belt, insert the metal tip into the buckle until it clicks, then pull the strap to tighten it. To release it, simply lift the buckle flap. Please keep your seat belt fastened whenever the seat belt sign is on, and whenever you are seated.',
    es: () => 'Señoras y señores, bienvenidos a bordo. Por favor presten atención mientras les mostramos las medidas de seguridad de este avión. Para abrocharse el cinturón, inserten la punta metálica en la hebilla hasta que haga clic y tiren de la correa para ajustarlo. Para soltarlo, levanten la tapa de la hebilla. Mantengan el cinturón abrochado siempre que la señal esté encendida, y siempre que estén sentados.',
    ko: () => '손님 여러분, 탑승을 환영합니다. 지금부터 이 항공기의 안전 장비를 안내해 드리겠습니다. 좌석벨트는 금속 팁을 버클에 딸깍 소리가 날 때까지 끼운 뒤 끈을 당겨 조여 주십시오. 풀 때는 버클 덮개를 들어 올리면 됩니다. 좌석벨트 표시등이 켜져 있을 때와 자리에 앉아 계실 때는 항상 벨트를 매 주시기 바랍니다.' },
  { id: 'brief_exit', who: 'crew', label: 'Safety briefing: exits', boost: 1,
    en: () => 'There are eight emergency exits on this aircraft: two at the front, four over the wings, and two at the rear. Please take a moment now to locate the exit nearest to you — remembering that your nearest exit may be behind you. In an emergency, lighting at floor level will guide you to an exit.',
    es: () => 'Este avión tiene ocho salidas de emergencia: dos al frente, cuatro sobre las alas y dos en la parte trasera. Tómense un momento para localizar la salida más cercana, recordando que podría estar detrás de ustedes. En caso de emergencia, las luces a nivel del suelo les guiarán hasta una salida.',
    ko: () => '이 항공기에는 비상구가 모두 여덟 개 있습니다. 앞쪽에 두 개, 날개 위에 네 개, 뒤쪽에 두 개입니다. 지금 가장 가까운 비상구를 확인해 주십시오. 가장 가까운 출구는 뒤쪽에 있을 수도 있습니다. 비상시에는 바닥의 유도등이 출구로 안내합니다.' },
  { id: 'brief_oxy', who: 'crew', label: 'Safety briefing: oxygen masks', boost: 1,
    en: () => 'If there is a change in cabin pressure, oxygen masks will drop automatically from the panel above your seat. Pull the mask firmly toward you to start the flow of oxygen, place it over your nose and mouth, and breathe normally. Please secure your own mask first, before helping anyone else — including children.',
    es: () => 'Si cambia la presión de la cabina, las máscaras de oxígeno caerán automáticamente del panel sobre su asiento. Tiren firmemente de la máscara hacia ustedes para iniciar el flujo de oxígeno, colóquenla sobre la nariz y la boca, y respiren con normalidad. Pónganse primero su propia máscara, antes de ayudar a cualquier otra persona, incluidos los niños.',
    ko: () => '기내 압력이 변하면 좌석 위 패널에서 산소마스크가 자동으로 떨어집니다. 마스크를 세게 당겨 산소가 나오게 한 뒤 코와 입에 대고 평소대로 호흡하십시오. 다른 분이나 어린이를 돕기 전에 먼저 본인의 마스크를 착용하십시오.' },
  { id: 'brief_vest', who: 'crew', label: 'Safety briefing: life vests', boost: 1,
    en: () => 'Your life vest is stowed in a pouch under your seat. To use it, remove it from the pouch, slip it over your head, and fasten and tighten the straps around your waist. Inflate the vest only as you leave the aircraft, by pulling the red tabs. Thank you for your attention — the crew will be at their stations for takeoff, and we wish you a very pleasant flight.',
    es: () => 'Su chaleco salvavidas está guardado en una bolsa debajo de su asiento. Para usarlo, sáquenlo de la bolsa, pásenlo por la cabeza y abrochen y ajusten las correas alrededor de la cintura. Inflen el chaleco solo al salir del avión, tirando de las lengüetas rojas. Gracias por su atención; la tripulación ocupará sus puestos para el despegue y les deseamos un vuelo muy agradable.',
    ko: () => '구명조끼는 좌석 아래 주머니에 보관되어 있습니다. 사용하실 때는 주머니에서 꺼내 머리로 착용하고 허리 끈을 매어 조여 주십시오. 조끼는 항공기를 나갈 때 빨간 손잡이를 당겨 부풀리십시오. 경청해 주셔서 감사합니다. 승무원은 이륙을 위해 착석하겠습니다. 즐거운 비행 되십시오.' },
  { id: 'svc_meal', who: 'crew', label: 'Meal service starting', boost: 1,
    en: () => 'Ladies and gentlemen, we will now be coming through the cabin with drinks and a meal. Please make sure your tray table is down and your drinks are clear of the aisle. If you need anything at all, just let one of the crew know. Enjoy.',
    es: () => 'Señoras y señores, ahora pasaremos por la cabina con bebidas y una comida. Por favor bajen su mesa y mantengan el pasillo despejado. Si necesitan cualquier cosa, avisen a un miembro de la tripulación. Buen provecho.',
    ko: () => '손님 여러분, 지금부터 음료와 기내식을 서비스하겠습니다. 테이블을 내려 주시고 통로를 비워 주시기 바랍니다. 필요하신 것이 있으면 승무원에게 말씀해 주십시오. 맛있게 드십시오.' },
  { id: 'svc_drinks', who: 'crew', label: 'Drinks service starting', boost: 1,
    en: () => 'Ladies and gentlemen, on this shorter flight we will be coming through the cabin with drinks. Please make sure your tray table is down. If you need anything else, just let one of the crew know.',
    es: () => 'Señoras y señores, en este vuelo más corto pasaremos por la cabina con bebidas. Por favor bajen su mesa. Si necesitan cualquier otra cosa, avisen a un miembro de la tripulación.',
    ko: () => '손님 여러분, 이 짧은 비행에서는 음료 서비스를 하겠습니다. 테이블을 내려 주시기 바랍니다. 다른 필요하신 것이 있으면 승무원에게 말씀해 주십시오.' },
  { id: 'svc_collect', who: 'crew', label: 'Collecting rubbish', boost: 1,
    en: () => 'Ladies and gentlemen, we will shortly be coming through the cabin to collect any rubbish. Please pass any trays, cups and wrappers out to the aisle, and let us know if there is anything else we can take for you. Thank you.',
    es: () => 'Señoras y señores, en breve pasaremos por la cabina para recoger la basura. Por favor entreguen las bandejas, los vasos y los envoltorios hacia el pasillo, y avísennos si hay algo más que podamos llevarnos. Gracias.',
    ko: () => '손님 여러분, 잠시 후 기내를 돌며 쓰레기를 수거하겠습니다. 쟁반과 컵, 포장지는 통로 쪽으로 건네 주시고, 그 밖에 치울 것이 있으면 말씀해 주십시오. 감사합니다.' },
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
