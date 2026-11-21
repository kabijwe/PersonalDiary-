/*
 * Kabijwe Panchang engine — offline, deterministic, no network, no API key.
 *
 * Method (all formulas are from Jean Meeus, "Astronomical Algorithms", 2nd ed.):
 *   - Sun apparent longitude: Ch. 25 (accuracy ≈ 0.01°)
 *   - Moon longitude: Ch. 47, full 60-term longitude series + additive terms (≈ 0.003°)
 *   - Sidereal zodiac: Lahiri (Chitrapaksha) ayanamsa, the Nepali Rashtriya Panchang convention
 *   - Sunrise / sunset: Sun's upper limb + standard refraction (altitude −0°50′), sea level
 *   - Tithi / Nakshatra / Yoga / Karana boundaries are solved by bisection (to the millisecond
 *     of the model), so end times come from the same longitudes as the displayed value.
 *
 * Expected agreement with printed drik panchangs: tithi/nakshatra/yoga end times within a few
 * minutes; sunrise/sunset within ~1 minute. It is NOT a replacement for the official
 * Nepal Panchang Nirnayak Samiti calendar for religious decisions.
 *
 * Works in the browser (window.KabijwePanchang) and in Node (module.exports).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KabijwePanchang = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const RAD = Math.PI / 180;
  const NPT_OFFSET_MS = 5.75 * 3600e3;          // UTC+05:45
  const NPT_MERIDIAN = 86.25;                   // standard meridian of Nepal Time
  const norm360 = x => ((x % 360) + 360) % 360;
  const sinD = x => Math.sin(x * RAD);
  const cosD = x => Math.cos(x * RAD);

  /* ---------- Time ---------- */
  const jdUTC = ms => ms / 86400000 + 2440587.5;
  function deltaT(year) {                       // seconds, Espenak–Meeus polynomial, 2005–2050
    const t = year - 2000;
    if (year < 2005) return 64.0;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  function jdTT(ms) {
    const y = new Date(ms).getUTCFullYear();
    return jdUTC(ms) + deltaT(y) / 86400;
  }
  const centuries = jd => (jd - 2451545.0) / 36525;

  /* ---------- Sun ---------- */
  function sunApparentLongitude(jd) {           // tropical, degrees
    const T = centuries(jd);
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sinD(M)
            + (0.019993 - 0.000101 * T) * sinD(2 * M)
            + 0.000289 * sinD(3 * M);
    const omega = 125.04 - 1934.136 * T;
    return norm360(L0 + C - 0.00569 - 0.00478 * sinD(omega));
  }

  /* ---------- Moon (Meeus ch. 47) ---------- */
  // [D, M, M', F, coefficient (1e-6 degree)]
  const MOON_L = [
    [0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],[0,1,0,0,-185116],
    [0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],[2,0,1,0,53322],[2,-1,0,0,45758],
    [0,1,-1,0,-40923],[1,0,0,0,-34720],[0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],
    [0,0,1,-2,10980],[4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],
    [2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],[2,0,2,0,3994],
    [4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],[2,0,-1,2,-2602],[2,-1,-2,0,2390],
    [1,0,1,0,-2348],[2,-2,0,0,2236],[0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],
    [2,0,1,-2,-1773],[2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],
    [2,1,1,0,-810],[4,-1,-2,0,759],[0,2,-1,0,-713],[2,2,-1,0,-700],[2,1,-2,0,691],
    [2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],[4,-1,0,0,520],[1,0,-2,0,-487],
    [2,1,0,-2,-399],[0,0,2,-2,-381],[1,1,1,0,351],[3,0,-2,0,-340],[4,0,-3,0,330],
    [2,-1,2,0,327],[0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294]
  ];
  function moonApparentLongitude(jd) {          // tropical, degrees
    const T = centuries(jd), T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
    const D  = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;
    const M  = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
    const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;
    const F  = 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;
    const A1 = 119.75 + 131.849 * T, A2 = 53.09 + 479264.290 * T;
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    let sum = 0;
    for (const [d, m, mp, f, c] of MOON_L) {
      const e = m === 0 ? 1 : (Math.abs(m) === 1 ? E : E * E);
      sum += c * e * sinD(d * D + m * M + mp * Mp + f * F);
    }
    sum += 3958 * sinD(A1) + 1962 * sinD(Lp - F) + 318 * sinD(A2);
    const lon = Lp + sum / 1e6;
    const omega = 125.04452 - 1934.136261 * T;
    const nut = -0.004778 * sinD(omega) - 0.000367 * sinD(2 * (280.4665 + 36000.7698 * T)) - 0.000064 * sinD(2 * Lp);
    return norm360(lon + nut);
  }

  /* ---------- Lahiri ayanamsa ---------- */
  function lahiriAyanamsa(jd) {
    const T = centuries(jd);
    return 23.85306 + 1.396971 * T + 0.000308 * T * T;
  }

  /* ---------- Names (Nepali) ---------- */
  const TITHI = ["प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी"];
  const NAKSHATRA = ["अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","आश्लेषा","मघा","पूर्वफाल्गुनी","उत्तरफाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा","मूल","पूर्वाषाढा","उत्तराषाढा","श्रवण","धनिष्ठा","शतभिषा","पूर्वभाद्रपदा","उत्तरभाद्रपदा","रेवती"];
  const YOGA = ["विष्कम्भ","प्रीति","आयुष्मान","सौभाग्य","शोभन","अतिगण्ड","सुकर्मा","धृति","शूल","गण्ड","वृद्धि","ध्रुव","व्याघात","हर्षण","वज्र","सिद्धि","व्यतीपात","वरीयान","परिघ","शिव","सिद्ध","साध्य","शुभ","शुक्ल","ब्रह्म","ऐन्द्र","वैधृति"];
  const KARANA_REPEAT = ["बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि (भद्रा)"];
  const KARANA_FIXED = {0:"किंस्तुघ्न",57:"शकुनि",58:"चतुष्पद",59:"नाग"};
  const RASHI = ["मेष","वृष","मिथुन","कर्कट","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुम्भ","मीन"];
  // Lunar months by the Sun's sidereal rashi at the preceding new moon (amānta naming).
  const LUNAR_MONTH = ["वैशाख","ज्येष्ठ","आषाढ","श्रावण","भाद्रपद","आश्विन","कार्तिक","मार्गशीर्ष","पौष","माघ","फाल्गुन","चैत्र"];
  const BS_MONTH = ["बैशाख","जेठ","असार","साउन","भदौ","असोज","कात्तिक","मंसिर","पुष","माघ","फागुन","चैत"];

  /* ---------- Longitudes at an instant ---------- */
  function longitudes(ms) {
    const jd = jdTT(ms);
    const ay = lahiriAyanamsa(jd);
    const sunT = sunApparentLongitude(jd), moonT = moonApparentLongitude(jd);
    return { sunTrop: sunT, moonTrop: moonT, ayanamsa: ay, sun: norm360(sunT - ay), moon: norm360(moonT - ay) };
  }
  const elongation = ms => { const l = longitudes(ms); return norm360(l.moonTrop - l.sunTrop); };
  const moonSid   = ms => longitudes(ms).moon;
  const yogaAngle = ms => { const l = longitudes(ms); return norm360(l.sun + l.moon); };

  // Next time (after ms) that the increasing angle f(t) reaches the next multiple of `unit`.
  function nextBoundary(f, ms, unit, spanH) {
    const a0 = f(ms);
    const need = unit - (a0 % unit);                       // degrees still to go (0 < need ≤ unit)
    let lo = ms, hi = ms + spanH * 3600e3;
    const d = t => norm360(f(t) - a0);
    if (d(hi) < need && d(hi) > 0) hi += spanH * 3600e3;   // safety: extend once
    for (let i = 0; i < 48; i++) {
      const mid = (lo + hi) / 2;
      (d(mid) >= need && d(mid) < 300) ? (hi = mid) : (lo = mid);
    }
    return (lo + hi) / 2;
  }
  function prevBoundary(f, ms, unit, spanH) {              // last time angle crossed a multiple of unit
    const a0 = f(ms);
    const since = a0 % unit;                               // degrees travelled since last boundary
    let lo = ms - spanH * 3600e3, hi = ms;
    const d = t => norm360(a0 - f(t));                     // degrees between t and now
    for (let i = 0; i < 48; i++) {
      const mid = (lo + hi) / 2;
      (d(mid) >= since && d(mid) < 300) ? (lo = mid) : (hi = mid);
    }
    return (lo + hi) / 2;
  }

  function karanaName(k) {                                 // k = 0..59
    if (KARANA_FIXED[k]) return KARANA_FIXED[k];
    return KARANA_REPEAT[(k - 1) % 7];
  }

  /* ---------- Panchang at an instant ---------- */
  function panchang(ms) {
    const l = longitudes(ms);
    const el = norm360(l.moonTrop - l.sunTrop);
    const tNum = Math.floor(el / 12) + 1;                  // 1..30
    const shukla = tNum <= 15;
    const tName = tNum === 15 ? "पूर्णिमा" : tNum === 30 ? "औँसी" : TITHI[(tNum - 1) % 15];
    const nakWidth = 360 / 27;
    const nIdx = Math.floor(l.moon / nakWidth);
    const pada = Math.floor((l.moon % nakWidth) / (nakWidth / 4)) + 1;
    const yAng = norm360(l.sun + l.moon);
    const yIdx = Math.floor(yAng / nakWidth);
    const kIdx = Math.floor(el / 6);                       // 0..59

    const tithiEnd = nextBoundary(elongation, ms, 12, 40);
    const nakEnd   = nextBoundary(moonSid, ms, nakWidth, 40);
    const yogaEnd  = nextBoundary(yogaAngle, ms, nakWidth, 40);
    const karanaEnd = nextBoundary(elongation, ms, 6, 20);

    return {
      ms,
      ayanamsa: l.ayanamsa,
      tithi: { number: tNum, name: tName, paksha: shukla ? "शुक्ल पक्ष" : "कृष्ण पक्ष", shukla, endMs: tithiEnd },
      nakshatra: { index: nIdx, name: NAKSHATRA[nIdx], pada, endMs: nakEnd },
      yoga: { index: yIdx, name: YOGA[yIdx], endMs: yogaEnd },
      karana: { index: kIdx, name: karanaName(kIdx), endMs: karanaEnd },
      moonRashi: { index: Math.floor(l.moon / 30), name: RASHI[Math.floor(l.moon / 30)] },
      sunRashi:  { index: Math.floor(l.sun / 30),  name: RASHI[Math.floor(l.sun / 30)] },
      sunLongitudeSidereal: l.sun, moonLongitudeSidereal: l.moon,
      ayana: (norm360(l.sunTrop) >= 270 || norm360(l.sunTrop) < 90) ? "उत्तरायण" : "दक्षिणायन",
      lunarMonth: lunarMonth(ms, shukla)
    };
  }

  /* Lunar month (amānta, named by the Sun's rashi at the preceding new moon);
     Nepali printed panchangs name Krishna paksha by the purnimānta month, so both are returned. */
  function lunarMonth(ms, shukla) {
    const newMoon = prevBoundary(elongation, ms, 360, 31 * 24);  // last time elongation = 0
    const sunRashiAtNew = Math.floor(longitudes(newMoon).sun / 30);
    const amanta = LUNAR_MONTH[sunRashiAtNew];
    const purnimanta = shukla === false ? LUNAR_MONTH[(sunRashiAtNew + 1) % 12] : amanta;
    return { amanta, purnimanta, newMoonMs: newMoon, isAdhika: false };
  }

  /* ---------- Sunrise / sunset ---------- */
  function sunAltitude(ms, lat, lon) {
    const jd = jdUTC(ms);                                   // UT for sidereal time
    const jt = jdTT(ms);
    const T = centuries(jt);
    const lam = sunApparentLongitude(jt);
    const eps = 23.439291 - 0.0130042 * T + 0.00256 * cosD(125.04 - 1934.136 * T);
    const ra = norm360(Math.atan2(cosD(eps) * sinD(lam), cosD(lam)) / RAD);
    const dec = Math.asin(sinD(eps) * sinD(lam)) / RAD;
    const Tu = (jd - 2451545.0) / 36525;
    const gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * Tu * Tu);
    const H = norm360(gmst + lon - ra);
    return Math.asin(sinD(lat) * sinD(dec) + cosD(lat) * cosD(dec) * cosD(H)) / RAD;
  }
  function nptMidnightMs(y, m, d) { return Date.UTC(y, m - 1, d) - NPT_OFFSET_MS; }

  /* Sunrise/sunset for the Nepal-time civil date y-m-d at (lat, lon). Returns {sunriseMs, sunsetMs}
     or {polar:"day"|"night"} when the Sun never crosses the horizon. */
  function sunTimes(y, m, d, lat, lon) {
    const H0 = -0.8333;
    const noon = nptMidnightMs(y, m, d) + 12 * 3600e3 + (NPT_MERIDIAN - lon) * 240e3;
    const f = t => sunAltitude(t, lat, lon) - H0;
    const lo = noon - 12 * 3600e3, hi = noon + 12 * 3600e3;
    if (f(noon) < 0) return { polar: "night" };
    if (f(lo) > 0 && f(hi) > 0) return { polar: "day" };
    const solve = (a, b, rising) => {
      for (let i = 0; i < 45; i++) {
        const mid = (a + b) / 2;
        const up = f(mid) > 0;
        (rising ? up : !up) ? (b = mid) : (a = mid);
      }
      return (a + b) / 2;
    };
    return { sunriseMs: solve(lo, noon, true), sunsetMs: solve(noon, hi, false) };
  }
  function nptDateParts(ms) {
    const d = new Date(ms + NPT_OFFSET_MS);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), hh: d.getUTCHours(), mm: d.getUTCMinutes(), ss: d.getUTCSeconds() };
  }

  /* ---------- Ghadi–Pala ---------- */
  // 1 ghadi = 24 min = 1440 s ; 1 pala = 24 s. Counted from the most recent local sunrise,
  // so before today's sunrise the count continues from yesterday's sunrise (can reach ~60 ghadi).
  function ghadiPala(nowMs, lat, lon) {
    const p = nptDateParts(nowMs);
    const today = sunTimes(p.y, p.m, p.d, lat, lon);
    if (today.polar) return null;
    let sunrise = today.sunriseMs, which = "today";
    if (nowMs < sunrise) {
      const yp = nptDateParts(nowMs - 86400e3);
      const y = sunTimes(yp.y, yp.m, yp.d, lat, lon);
      if (y.polar) return null;
      sunrise = y.sunriseMs; which = "yesterday";
    }
    const sec = Math.floor((nowMs - sunrise) / 1000);
    return { ghadi: Math.floor(sec / 1440), pala: Math.floor((sec % 1440) / 24), vipala: Math.floor((sec % 24) / 0.4), sunriseMs: sunrise, which };
  }

  /* ---------- Bikram Sambat estimate (fallback only) ----------
     Month starts are derived from the Sun's entry into each sidereal rashi (sankranti).
     The official Nepali calendar applies additional rules that this does NOT reproduce
     exactly, so the result can differ by ±1 day. The UI labels it "अनुमानित". */
  function sankrantiBefore(ms) {                           // last instant the Sun entered a rashi, ≤ ms
    return prevBoundary(ms2 => longitudes(ms2).sun, ms, 30, 33 * 24);
  }
  function bsEstimate(ms, cutoffHour) {
    const cut = cutoffHour == null ? 24 : cutoffHour;      // sankranti before this NPT hour → same civil day starts month
    let t = ms;
    for (let i = 0; i < 3; i++) {
      const s = sankrantiBefore(t);
      const sp = nptDateParts(s);
      const frac = sp.hh + sp.mm / 60;
      const startDayMs = Date.UTC(sp.y, sp.m - 1, sp.d) + (frac >= cut ? 86400e3 : 0);
      const nowP = nptDateParts(ms);
      const nowDayMs = Date.UTC(nowP.y, nowP.m - 1, nowP.d);
      if (startDayMs <= nowDayMs) {
        const idx = Math.floor(longitudes(s + 3600e3).sun / 30);   // rashi just entered = BS month index
        const startYear = new Date(startDayMs).getUTCFullYear();
        const year = startYear + (idx <= 8 ? 57 : 56);
        return { year, month: idx + 1, day: Math.round((nowDayMs - startDayMs) / 86400e3) + 1, monthName: BS_MONTH[idx], estimated: true };
      }
      t = s - 3600e3;
    }
    return null;
  }

  /* ---------- Nepali six seasons (ऋतु) by Bikram Sambat month ---------- */
  // Traditional Nepali reckoning, two BS months per season:
  //   वसन्त चैत–बैशाख · ग्रीष्म जेठ–असार · वर्षा साउन–भदौ · शरद असोज–कात्तिक · हेमन्त मंसिर–पुष · शिशिर माघ–फागुन
  const SEASONS = [
    { name: "वसन्त", months: [12, 1],  desc: "फूल फुल्ने, नयाँ पालुवा पलाउने र न्यानो हुँदै जाने समय।" },
    { name: "ग्रीष्म", months: [2, 3], desc: "घाम चर्कने, दिन लामो हुने र गर्मी बढ्ने समय।" },
    { name: "वर्षा", months: [4, 5],  desc: "मनसुनको झरी, हरियाली र खेतीपातीको समय।" },
    { name: "शरद",  months: [6, 7],   desc: "खुला आकाश, सफा हिमाल र चाडपर्वको समय।" },
    { name: "हेमन्त", months: [8, 9], desc: "चिसो बढ्दै जाने, बिहान कुहिरो लाग्ने र न्यानो घामको समय।" },
    { name: "शिशिर", months: [10, 11], desc: "कठ्यांग्रिने जाडो र पातहरू झर्ने समय।" }
  ];
  function seasonForBsMonth(m) { return SEASONS.find(s => s.months.includes(m)) || null; }

  return {
    longitudes, panchang, sunTimes, ghadiPala, bsEstimate, lunarMonth, sankrantiBefore,
    seasonForBsMonth, SEASONS, BS_MONTH, RASHI, nptDateParts, nptMidnightMs, elongation,
    _internals: { sunApparentLongitude, moonApparentLongitude, lahiriAyanamsa, sunAltitude, nextBoundary, prevBoundary }
  };
});
