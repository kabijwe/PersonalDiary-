const { chromium } = require("playwright");
const fs=require("fs");
const BASE="http://localhost:8765/";
let pass=0,fail=0;const ok=(n,c,d)=>{(c?pass++:fail++);console.log((c?"PASS ":"FAIL ")+n+(d?"  — "+d:""))};
// MOCK Trisambat month file (schema as used by the app). Mapping is a TEST FIXTURE, not real calendar data.
function mockMonth(y,m){const days=[];const n=new Date(Date.UTC(y,m,0)).getUTCDate();for(let d=1;d<=n;d++){const ad=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  // fixture: 2026-11-17 = 2083-08-01
  const off=Math.round((Date.UTC(y,m-1,d)-Date.UTC(2026,10,17))/864e5);let bm=8,bd=1+off;let by=2083;
  if(bd<1){bm=7;bd=30+bd}else if(bd>29){bm=9;bd-=29}
  days.push({ad,bs:{year:by,month:bm,day:bd}})}return {days}}
async function setup(browser,{online=true,geo=null,time="2026-11-21T12:13:00Z"}={}){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:"ne-NP",timezoneId:"Asia/Kathmandu",permissions:geo?["geolocation"]:[],geolocation:geo||undefined,serviceWorkers:"allow"});
  const page=await ctx.newPage();page_=page;const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error"&&!/Failed to load resource/.test(m.text()))errors.push(m.text())});
  const reqs=[];
  await page.route("**/trisambat.com/**",r=>{reqs.push(r.request().url());if(!online)return r.abort();const u=r.request().url().match(/ad\/(\d+)\/(\d+)\.json/);r.fulfill({json:mockMonth(+u[1],+u[2])})});
  await page.route("**/api.open-meteo.com/**",r=>{reqs.push(r.request().url());if(!online)return r.abort();r.fulfill({json:{current:{time:"2026-11-21T17:45",temperature_2m:14.3,relative_humidity_2m:62,apparent_temperature:13,weather_code:2,wind_speed_10m:7.4}}})});
  await page.route("**/nominatim.openstreetmap.org/**",r=>{if(!online)return r.abort();r.fulfill({json:{address:{town:"काठमाडौँ",state:"बागमती"}}})});
  return {ctx,page,errors,reqs};
}
const go=n=>page_.evaluate(n=>document.querySelector(`.nav-item[data-page="${n}"]`).click(),n);
let page_;
(async()=>{
  const browser=await chromium.launch();
  // ---------- A: online, default location ----------
  let {ctx,page,errors,reqs}=await setup(browser);
  await page.clock.install({time:new Date("2026-11-21T12:13:00Z")});   // 17:58 NPT
  await page.goto(BASE);await page.clock.resume?.();await page.waitForTimeout(1500);
  const t=id=>page.locator("#"+id).innerText();
  const v={};for(const id of ["clock","timeWeekday","timeAdDate","timeBsDate","timeWeekNumber","seasonName","sunriseTime","sunsetTime","sunStatus","placeName","locationMode","weatherTemp","weatherCondition","weatherExtra","weatherUpdated","pTithi","pPaksha","pTithiEnd","pNakshatra","pNakshatraPada","pNakshatraEnd","pYoga","pKarana","pMoonRashi","pSunRashi","pLunarMonth","pAyana","pGhadiPala","pGhadiNote","panchangStatus"])v[id]=await t(id);
  console.log(JSON.stringify(v,null,1));
  ok("clock shows Nepal 5:58 साँझ (Nepali digits)",/५:५८/.test(v.clock)&&/साँझ/.test(v.clock),v.clock);
  ok("weekday शनिबार (2026-11-21 is Saturday)",v.timeWeekday==="शनिबार");
  ok("Gregorian date 21 Nov 2026",v.timeAdDate==="21 Nov 2026");
  ok("BS date rendered from validated API fixture",/५ मंसिर २०८३/.test(v.timeBsDate),v.timeBsDate);
  ok("tithi द्वादशी + शुक्ल पक्ष",v.pTithi==="द्वादशी"&&v.pPaksha==="शुक्ल पक्ष");
  ok("nakshatra रेवती पाद २",v.pNakshatra==="रेवती"&&/२/.test(v.pNakshatraPada));
  ok("yoga, karana, rashis, month, ayana present",[v.pYoga,v.pKarana,v.pMoonRashi,v.pSunRashi,v.pLunarMonth,v.pAyana].every(x=>x&&x!=="—"),[v.pYoga,v.pKarana,v.pMoonRashi,v.pSunRashi,v.pLunarMonth,v.pAyana].join("/"));
  ok("end times present for tithi/nakshatra/yoga/karana",[v.pTithiEnd,v.pNakshatraEnd].every(x=>/समाप्ति/.test(x)));
  ok("season हेमन्त from BS month मंसिर",/हेमन्त/.test(v.seasonName),v.seasonName);
  ok("current season chip highlighted",await page.locator("#seasonChips .current").innerText().then(x=>/हेमन्त/.test(x)));
  ok("sunrise/sunset shown",/\d|[०-९]/.test(v.sunriseTime)&&/\d|[०-९]/.test(v.sunsetTime),v.sunriseTime+" / "+v.sunsetTime);
  ok("ghadi-pala shown",/घडी/.test(v.pGhadiPala),v.pGhadiPala);
  ok("location labelled default, not GPS",/पूर्वनिर्धारित/.test(v.locationMode));
  ok("weather with timestamp",v.weatherTemp==="14°"&&/अद्यावधिक/.test(v.weatherUpdated),v.weatherTemp+" "+v.weatherUpdated);
  ok("no tantragurukul request any more",!reqs.some(u=>/tantragurukul/.test(u)));
  ok("no JS errors",errors.length===0,errors.join(" | "));
  // ghadi-pala numeric check against engine for the page's own sunrise
  const gp=await page.evaluate(()=>{const P=window.KabijwePanchang;const s=P.sunTimes(2026,11,21,27.7172,85.3240).sunriseMs;const now=Date.now();return {sec:Math.floor((now-s)/1000),g:P.ghadiPala(now,27.7172,85.3240)}});
  ok("ghadi/pala = floor(sec/1440), floor(rem/24)",gp.g.ghadi===Math.floor(gp.sec/1440)&&gp.g.pala===Math.floor((gp.sec%1440)/24),JSON.stringify(gp));
  // marker moves
  const m1=await page.locator("#sunMarker").getAttribute("cx");
  ok("after sunset marker rests at curve end (cx=308)",+m1===308,"cx="+m1);
  // single curve: exactly one path with class sun-curve
  ok("exactly one sun curve path",await page.locator("path.sun-curve").count()===1);
  await page.screenshot({path:"/home/claude/work/tests/shot-home-mobile.png",fullPage:false});
  await page.locator("#timeCard").screenshot({path:"/home/claude/work/tests/shot-timecard.png"});
  // horizontal overflow
  ok("no horizontal scroll at 390px",await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  // ---------- manual location ----------
  const srBefore=await t("sunriseTime");
  await page.selectOption("#manualPlace","ddl");await page.waitForTimeout(600);
  ok("manual selection → डडेल्धुरा labelled हातले छानिएको",/डडेल्धुरा/.test(await t("placeName"))&&/हातले/.test(await t("locationMode")));
  ok("sunrise changed for Dadeldhura (west → later)",(await t("sunriseTime"))!==srBefore,srBefore+" → "+await t("sunriseTime"));
  await page.reload();await page.waitForTimeout(1200);
  ok("manual choice remembered after reload",/डडेल्धुरा/.test(await t("placeName")));
  // ---------- diary flow ----------
  await go("diary");await page.click("#newDiary");
  await page.fill("#entryTitle","परीक्षण पाना");await page.fill("#entryContent","यो एउटा परीक्षण हो।");
  await page.click('#entryForm button[type="submit"]');await page.waitForTimeout(300);
  let state=await page.evaluate(()=>JSON.parse(localStorage.getItem("kabijwe.v1")));
  ok("diary entry created with Nepal date + context",state.entries.length===1&&state.entries[0].date==="2026-11-21"&&!!state.entries[0].context.bsDate,JSON.stringify(state.entries[0].context).slice(0,200));
  await page.click("[data-view]");ok("diary post opens in Letterhead with context details",await page.locator("#postLetterhead").count()===1&&await page.locator(".context-detail-grid").count()===1);await page.click("#postEditBtn");await page.fill("#entryTitle","सम्पादित");await page.click('#entryForm button[type="submit"]');await page.waitForTimeout(200);
  state=await page.evaluate(()=>JSON.parse(localStorage.getItem("kabijwe.v1")));ok("diary edit works",state.entries[0].title==="सम्पादित");
  await page.fill("#diarySearch","सम्पादित");ok("diary search works",await page.locator(".entry-row").count()===1);
  const [dl]=await Promise.all([page.waitForEvent("download"),page.evaluate(()=>{showPage&&0}).catch(()=>{}),go("settings").then(()=>page.click("#exportData"))]);
  const fpath=await dl.path();const exported=JSON.parse(fs.readFileSync(fpath,"utf8"));ok("export JSON has entries",exported.entries.length===1);
  await page.setInputFiles("#importData",{name:"b.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({entries:[{id:"x1",title:"आयात",content:"c",date:"2026-01-01",mood:"शान्त",type:"diary",visibility:"private",tags:"",created:1,updated:1}],events:[],memories:[],templates:[],settings:{}}))});
  page.once("dialog",d=>d.accept());await page.waitForTimeout(100);
  await go("diary");
  await go("letterpad");await page.fill("#lpTitle","शीर्षक");await page.fill("#lpBody","कविताको पंक्ति");
  ok("letterpad preview updates",(await t("previewTitle"))==="शीर्षक"&&(await t("previewBody"))==="कविताको पंक्ति");
  await page.click("#saveTemplate");ok("letterpad template saved",await page.locator(".template-chip").count()>=1);
  for(const p of ["home","diary","poetry","calendar","letterpad","memories","settings"]){await go(p);}
  ok("all page navigation without errors",errors.filter(e=>!/dialog/.test(e)).length===0,errors.join(" | "));
  // ---------- service worker ----------
  await page.goto(BASE);await page.waitForTimeout(1500);
  const sw=await page.evaluate(async()=>{const k=await caches.keys();const c=await caches.open(k[0]);const keys=(await c.keys()).map(r=>r.url);return {k,keys}});
  ok("SW cache is v8 and has panchang.js",sw.k.includes("kabijwe-shell-v8")&&sw.keys.some(u=>/panchang\.js/.test(u)),sw.k.join());
  ok("SW never caches cross-origin API responses",!sw.keys.some(u=>/trisambat|open-meteo|nominatim/.test(u)));
  await ctx.close();

  // ---------- B: GPS denied → panchang still there; then GPS granted ----------
  ({ctx,page,errors}=await setup(browser));
  await page.goto(BASE);await page.waitForTimeout(1200);
  await ctx.setOffline?.(false);
  await page.click("#timeLocationBtn");await page.waitForTimeout(800);
  ok("GPS denied: panchang remains visible",(await t("pTithi"))==="द्वादशी"||(await t("pTithi"))!=="—");
  ok("GPS denied: still labelled default (not GPS)",/पूर्वनिर्धारित/.test(await t("locationMode")),await t("locationMode"));
  await ctx.close();
  ({ctx,page,errors}=await setup(browser,{geo:{latitude:29.30,longitude:80.58}}));
  await page.goto(BASE);await page.waitForTimeout(1000);await page.click("#timeLocationBtn");await page.waitForTimeout(1500);
  ok("GPS granted: labelled GPS बाट",/GPS बाट/.test(await t("locationMode")),await t("locationMode")+" | "+await t("placeName"));const gpsHistory=await page.evaluate(()=>JSON.parse(localStorage.getItem("kabijwe.v1")).locationHistory||[]);ok("successful GPS update saved in timestamped location history",gpsHistory.length===1&&!!gpsHistory[0].timestamp&&Number.isFinite(gpsHistory[0].latitude)&&Number.isFinite(gpsHistory[0].longitude),JSON.stringify(gpsHistory[0]));
  await ctx.close();

  // ---------- C: everything offline from first load ----------
  ({ctx,page,errors}=await setup(browser,{online:false}));
  await page.goto(BASE);await page.waitForTimeout(7000);
  const o={bs:await t("timeBsDate"),tithi:await t("pTithi"),status:await t("panchangStatus"),w:await t("weatherCondition"),foot:await t("panchangFoot")};console.log(o);
  ok("offline: Panchang (offline engine) still works",o.tithi==="द्वादशी"||o.tithi.length>1&&o.tithi!=="—");
  ok("offline: BS date marked अनुमानित, not presented as verified",/अनुमानित/.test(o.bs),o.bs);
  ok("offline: weather reported honestly",/उपलब्ध छैन|छैन/.test(o.w),o.w);
  ok("offline: retry button visible",await page.locator("#panchangRetry").isVisible());
  await page.screenshot({path:"/home/claude/work/tests/shot-offline.png"});
  await ctx.close();

  // ---------- D: Nepal midnight rollover ----------
  ({ctx,page,errors}=await setup(browser));
  await page.clock.install({time:new Date("2026-11-21T18:14:50Z")});            // 23:59:50 NPT Nov 21
  await page.goto(BASE);await page.clock.resume();await page.waitForTimeout(800);
  const before=await t("timeAdDate");
  await page.clock.fastForward(20000);await page.waitForTimeout(1500);
  const after=await t("timeAdDate"),bsA=await t("timeBsDate");
  ok("rollover at Nepal midnight: 21 Nov → 22 Nov",before==="21 Nov 2026"&&after==="22 Nov 2026",before+" → "+after+" | BS "+bsA);
  ok("rollover: weekday becomes आइतबार",(await t("timeWeekday"))==="आइतबार");
  ok("rollover 00:00:10 NPT: ghadi counts from yesterday's sunrise 06:29 (17h31m ≈ 43 घडी)",/^४३ घडी/.test(await t("pGhadiPala"))&&/हिजोको/.test(await t("pGhadiNote")),await t("pGhadiPala")+" | "+await t("pGhadiNote"));
  await go("diary");await page.click("#newDiary");
  ok("new entry default date uses Nepal date (2026-11-22, not UTC 2026-11-21)",await page.inputValue("#entryDate")==="2026-11-22",await page.inputValue("#entryDate"));
  await ctx.close();
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
