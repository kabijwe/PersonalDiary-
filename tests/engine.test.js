const P=require("../panchang.js");
let pass=0,fail=0;
function check(name,cond,detail){ (cond?pass++:fail++); console.log((cond?"PASS ":"FAIL ")+name+(detail?"  "+detail:"")); }
const near=(a,b,tolMin)=>Math.abs(a-b)/60000<=tolMin;
const U=s=>Date.parse(s);
// 1. Known syzygies (UTC): new/full moon => elongation 0/180
const events=[["2025-10-21T12:25:00Z",0],["2025-09-07T18:09:00Z",180],["2025-03-14T06:55:00Z",180],["2024-04-08T18:21:00Z",0],["2024-10-17T11:26:00Z",180],["2026-02-17T12:01:00Z",0],["2026-03-03T11:38:00Z",180]];
for(const [t,e] of events){
  const ms=U(t); const el=P.elongation(ms); let diff=((el-e+540)%360)-180; // degrees
  const minutes=diff/12.19*24*60/ (1) ; // ~12.19 deg/day relative speed
  check("elongation at "+t+" ≈ "+e,Math.abs(minutes)<4,`diff=${diff.toFixed(3)}° (~${minutes.toFixed(1)} min)`);
}
// 2. Tithi end times vs printed (IST) panchang: Amavasya Oct 21 2025 ends 17:54 IST (12:24 UTC)
let pn=P.panchang(U("2025-10-21T06:00:00Z"));
check("2025-10-21 tithi = औँसी",pn.tithi.name==="औँसी",pn.tithi.name+" "+pn.tithi.paksha);
check("Amavasya end ≈ 12:24 UTC",near(pn.tithi.endMs,U("2025-10-21T12:24:00Z"),4),new Date(pn.tithi.endMs).toISOString());
// Vijaya Dashami 2025-10-02: tithi at Kathmandu sunrise = Dashami (shukla)
const st=P.sunTimes(2025,10,2,27.7172,85.3240);
pn=P.panchang(st.sunriseMs);
check("Dashami 2025-10-02 sunrise tithi",pn.tithi.name==="दशमी"&&pn.tithi.shukla,pn.tithi.name);
check("Dashami end ≈ 13:40 UTC (19:10 IST)",near(pn.tithi.endMs,U("2025-10-02T13:40:00Z"),6),new Date(pn.tithi.endMs).toISOString());
check("2025-10-02 sunrise nakshatra = उत्तराषाढा ending ≈ 03:43 UTC (09:13 IST, then श्रवण)",pn.nakshatra.name==="उत्तराषाढा"&&near(pn.nakshatra.endMs,U("2025-10-02T03:43:00Z"),6),pn.nakshatra.name+" "+new Date(pn.nakshatra.endMs).toISOString());
// Purnima Holi 2025-03-14 ends 12:23 IST = 06:53 UTC
pn=P.panchang(U("2025-03-14T01:00:00Z"));
check("2025-03-14 tithi = पूर्णिमा",pn.tithi.name==="पूर्णिमा",pn.tithi.name);
check("Purnima end ≈ 06:53 UTC",near(pn.tithi.endMs,U("2025-03-14T06:53:00Z"),4),new Date(pn.tithi.endMs).toISOString());
// Maha Shivaratri 2025-02-26: Chaturdashi 11:08 IST Feb26 -> 08:54 IST Feb27 (03:24 UTC)
pn=P.panchang(U("2025-02-26T12:00:00Z"));
check("Shivaratri tithi = चतुर्दशी कृष्ण",pn.tithi.name==="चतुर्दशी"&&!pn.tithi.shukla,pn.tithi.name+" "+pn.tithi.paksha);
check("Chaturdashi end ≈ 03:24 UTC Feb27",near(pn.tithi.endMs,U("2025-02-27T03:24:00Z"),5),new Date(pn.tithi.endMs).toISOString());
// 3. Sidereal sanity: Lahiri ayanamsa 2026 ≈ 24.2°, Mesha sankranti 2026 on Apr 14
const l=P.longitudes(U("2026-01-01T00:00:00Z"));
check("Lahiri ayanamsa 2026-01-01 ≈ 24.2°",Math.abs(l.ayanamsa-24.21)<0.05,l.ayanamsa.toFixed(4));
const mesha=P.sankrantiBefore(U("2026-04-20T00:00:00Z"));
check("Mesha sankranti 2026 on Apr 13-14 UTC",new Date(mesha).toISOString().startsWith("2026-04-14")||new Date(mesha).toISOString().startsWith("2026-04-13"),new Date(mesha).toISOString());
// 4. Sunrise/sunset: cross-check against an independent NOAA-style algorithm (the one used by the old app.js)
function noaa(y,m,d,lat,lon,isRise){const N=Math.floor((Date.UTC(y,m-1,d)-Date.UTC(y,0,0))/864e5),lh=lon/15,t=N+((isRise?6:18)-lh)/24,r=x=>x*Math.PI/180;const M=.9856*t-3.289;let L=M+1.916*Math.sin(r(M))+.02*Math.sin(2*r(M))+282.634;L=(L%360+360)%360;let RA=Math.atan(.91764*Math.tan(r(L)))/r(1);RA=(RA%360+360)%360;RA=(RA+(Math.floor(L/90)*90-Math.floor(RA/90)*90))/15;const sd=.39782*Math.sin(r(L)),cd=Math.cos(Math.asin(sd));const ch=(Math.cos(r(90.833))-sd*Math.sin(r(lat)))/(cd*Math.cos(r(lat)));const H=(isRise?360-Math.acos(ch)/r(1):Math.acos(ch)/r(1))/15;const T=H+RA-.06571*t-6.622;return Date.UTC(y,m-1,d)+((T-lh+24)%24)*36e5}
const hm=ms=>{const p=P.nptDateParts(ms);return String(p.hh).padStart(2,"0")+":"+String(p.mm).padStart(2,"0")};
let worst=0;
for(const [nm,lat,lon] of [["Kathmandu",27.7172,85.3240],["Dadeldhura",29.30,80.58],["Biratnagar",26.4525,87.2718],["Jumla",29.2747,82.1838]]){
  for(const [y,m,d] of [[2025,3,20],[2025,6,21],[2025,9,22],[2025,12,21],[2026,11,21]]){
    const a=P.sunTimes(y,m,d,lat,lon),rS=noaa(y,m,d,lat,lon,true),sS=noaa(y,m,d,lat,lon,false);
    const w=x=>{x=Math.abs(x)/6e4%1440;return Math.min(x,1440-x)};const e1=w(a.sunriseMs-rS),e2=w(a.sunsetMs-sS);worst=Math.max(worst,e1,e2);
    if(e1>2.5||e2>2.5)console.log("  diff",nm,y,m,d,hm(a.sunriseMs),hm(rS),hm(a.sunsetMs),hm(sS));
  }
}
check("sunrise/sunset agree with independent NOAA algorithm within 2.5 min (4 places × 5 dates)",worst<=2.5,"worst="+worst.toFixed(2)+" min");
let s=P.sunTimes(2025,12,21,27.7172,85.3240),d=P.sunTimes(2025,12,21,29.30,80.58);
console.log("  KTM 2025-12-21",hm(s.sunriseMs),hm(s.sunsetMs)," Dadeldhura",hm(d.sunriseMs),hm(d.sunsetMs));
check("Dadeldhura sunrise later than KTM (further west)",d.sunriseMs>s.sunriseMs+15*60e3);
check("day length KTM 2025-12-21 ≈ 10h23m (±3m)",Math.abs((s.sunsetMs-s.sunriseMs)/6e4-623.5)<3,((s.sunsetMs-s.sunriseMs)/36e5).toFixed(3)+"h");
// 5. Ghadi-Pala
const sr=P.sunTimes(2026,11,21,27.7172,85.3240).sunriseMs;
let g=P.ghadiPala(sr+3*3600e3+12*60e3+30e3,27.7172,85.3240); // 3h12m30s -> 11550s -> 8 ghadi (11520) rem 30s -> 1 pala
check("ghadi-pala 3h12m30s = 8 घडी 1 पला",g.ghadi===8&&g.pala===1,JSON.stringify(g));
g=P.ghadiPala(sr+1440e3-1000,27.7172,85.3240); check("just before 1 ghadi = 0 ghadi 59 pala",g.ghadi===0&&g.pala===59,JSON.stringify(g));
g=P.ghadiPala(sr-3600e3,27.7172,85.3240); check("before sunrise counts from yesterday (≥59 ghadi)",g.which==="yesterday"&&g.ghadi>=57&&g.ghadi<=60,JSON.stringify(g));
// 6. Seasons
check("Mangsir -> हेमन्त",P.seasonForBsMonth(8).name==="हेमन्त");
check("six seasons cover 12 months exactly once",P.SEASONS.flatMap(x=>x.months).sort((a,b)=>a-b).join()==="1,2,3,4,5,6,7,8,9,10,11,12");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
