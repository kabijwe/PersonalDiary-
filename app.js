(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const KEY = "kabijwe.v1";
  const today = new Date();
  const state = load();
  let selectedCalendar = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedLocation = null, memoryImage = null, letterImage = null;
  let currentContext = {};
  state.locationHistory ||= [];
  state.reminders ||= [];
  function getContextSnapshot(at=Date.now()){
    const now=at, p=nptP(now), read=id=>$("#"+id)?.textContent?.trim()||"";
    const wx=lsGet("kabijwe.weather")||{};
    const wxMatches=Number.isFinite(wx.lat)&&Number.isFinite(wx.lon)&&Math.abs(wx.lat-loc.lat)<0.05&&Math.abs(wx.lon-loc.lon)<0.05;
    const exactClock=format24Clock(now);
    const exactDate=`${pad2(p.d)} ${AD_MONTHS[p.m-1]} ${p.y}`;
    return {
      capturedAt:now,capturedAtISO:new Date(now).toISOString(),nepalTime:exactClock,adDate:exactDate,
      bsDate:bsText()||read("timeBsDate"),weekday:WEEKDAYS[dayOfWeek(now)],weekNumber:`हप्ता ${nepaliNumber(isoWeekNumber(now))}`,
      tithi:read("pTithi"),tithiEnd:read("pTithiEnd"),paksha:read("pPaksha"),
      nakshatra:read("pNakshatra"),nakshatraPada:read("pNakshatraPada"),nakshatraEnd:read("pNakshatraEnd"),
      yoga:read("pYoga"),yogaEnd:read("pYogaEnd"),karana:read("pKarana"),karanaEnd:read("pKaranaEnd"),
      moonRashi:read("pMoonRashi"),sunRashi:read("pSunRashi"),lunarMonth:read("pLunarMonth"),ayana:read("pAyana"),
      ghadiPala:read("pGhadiPala"),sunrise:read("sunriseTime"),sunset:read("sunsetTime"),
      season:read("seasonName"),seasonDescription:read("seasonDesc"),
      place:loc.name||read("placeName"),locationMode:modeLabel(),latitude:Number.isFinite(loc.lat)?loc.lat:null,
      longitude:Number.isFinite(loc.lon)?loc.lon:null,altitudeM:Number.isFinite(loc.altitude)?loc.altitude:null,
      accuracyM:Number.isFinite(loc.accuracy)?loc.accuracy:null,
      weatherTemp:wxMatches?read("weatherTemp"):"",apparentTemperature:wxMatches&&Number.isFinite(wx.apparent)?wx.apparent:null,
      weatherCondition:wxMatches?read("weatherCondition"):"",humidity:wxMatches&&Number.isFinite(wx.hum)?wx.hum:null,
      windKmh:wxMatches&&Number.isFinite(wx.wind)?wx.wind:null,weatherUpdated:wxMatches?read("weatherUpdated"):"",
      weatherFetchedAt:wxMatches?(wx.fetched||null):null,weatherCode:wxMatches&&Number.isFinite(wx.code)?wx.code:null
    };
  }
  function updateCurrentContextFromUI(){currentContext=getContextSnapshot();}
  function formatContextLine(ctx){if(!ctx)return"";const parts=[];if(ctx.bsDate&&!/लोड|उपलब्ध छैन/.test(ctx.bsDate))parts.push(ctx.bsDate);if(ctx.tithi&&ctx.tithi!=="—"&&!/गणना/.test(ctx.tithi))parts.push(ctx.tithi);if(ctx.place&&!/अनुमति|लोड/.test(ctx.place))parts.push(ctx.place);if(ctx.weatherTemp&&ctx.weatherTemp!=="--°")parts.push(ctx.weatherTemp+(ctx.weatherCondition&&!/स्थान/.test(ctx.weatherCondition)?" · "+ctx.weatherCondition:""));if(ctx.altitudeM!=null)parts.push("उचाइ "+Math.round(ctx.altitudeM)+" m");return parts.filter(Boolean).join(" · ");}
  function contextDetailsHTML(ctx){
    if(!ctx)return '<p class="muted">समय/स्थान विवरण उपलब्ध छैन।</p>';
    const rows=[["नेपाल समय",ctx.nepalTime],["ग्रेगोरियन मिति",ctx.adDate],["विक्रम संवत्",ctx.bsDate],["बार / हप्ता",[ctx.weekday,ctx.weekNumber].filter(Boolean).join(" · ")],
      ["तिथि / पक्ष",[ctx.tithi,ctx.paksha,ctx.tithiEnd].filter(Boolean).join(" · ")],["नक्षत्र / पाद",[ctx.nakshatra,ctx.nakshatraPada,ctx.nakshatraEnd].filter(Boolean).join(" · ")],
      ["योग",ctx.yoga],["करण",ctx.karana],["चन्द्र राशि",ctx.moonRashi],["सूर्य राशि",ctx.sunRashi],["चन्द्रमास",ctx.lunarMonth],["अयन",ctx.ayana],
      ["घडी / पला",ctx.ghadiPala],["सूर्योदय / सूर्यास्त",[ctx.sunrise,ctx.sunset].filter(Boolean).join(" / ")],["ऋतु",[ctx.season,ctx.seasonDescription].filter(Boolean).join(" · ")],
      ["स्थान",ctx.place],["स्थानको स्रोत",ctx.locationMode],["अक्षांश / देशान्तर",ctx.latitude!=null&&ctx.longitude!=null?ctx.latitude.toFixed(6)+", "+ctx.longitude.toFixed(6):""],
      ["समुद्री सतहबाट उचाइ",ctx.altitudeM!=null?Math.round(ctx.altitudeM)+" m":"उपलब्ध भएन"],["GPS शुद्धता",ctx.accuracyM!=null?Math.round(ctx.accuracyM)+" m":""],
      ["तापक्रम",ctx.weatherTemp],["महसुस हुने तापक्रम",ctx.apparentTemperature!=null?ctx.apparentTemperature+" °C":""],["मौसम",ctx.weatherCondition],
      ["आर्द्रता",ctx.humidity!=null?ctx.humidity+" %":""],["हावाको गति",ctx.windKmh!=null?ctx.windKmh+" km/h":""],["मौसम अद्यावधिक",ctx.weatherUpdated],
      ["रेकर्ड गरिएको (नेपाल समय)",ctx.nepalTime|| (ctx.capturedAt?new Date(ctx.capturedAt).toLocaleString("ne-NP",{timeZone:"Asia/Kathmandu",hour12:false,second:"2-digit"}):"")],
      ["रेकर्डको ISO समय",ctx.capturedAtISO]];
    return '<div class="context-detail-grid">'+rows.filter(r=>r[1]!==""&&r[1]!=null).map(r=>'<div class="context-detail"><small>'+esc(r[0])+'</small><b>'+esc(r[1])+'</b></div>').join("")+'</div>';
  }

  function load(){try{return JSON.parse(localStorage.getItem(KEY)) || {entries:[],events:[],memories:[],templates:[],settings:{}}}catch{return {entries:[],events:[],memories:[],templates:[],settings:{}}}}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(error){console.error("Mero diary local save failed:",error);try{toast("स्थानीय भण्डारण भरिएको वा रोकिएको छ। ठूलो media backup गरी ठाउँ खाली गर्नुहोस्।");}catch{}return false;}}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function dateText(d){return new Date(d+"T12:00:00").toLocaleDateString("ne-NP",{year:"numeric",month:"long",day:"numeric"})}
  function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}
  function showPage(name){
    if(name==="diary")name="poetry";
    const target=$("#page-"+name);
    if(!target){toast("यो मेनु उपलब्ध छैन।");return}
    $$(".page").forEach(p=>p.classList.toggle("active",p===target));
    $$("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
    const sidebar=$("#sidebar");sidebar.classList.remove("open");sidebar.style.display="";
    if(name==="calendar")renderCalendar();
    if(name==="records"){renderLocationHistory();setTimeout(()=>historyMap?.invalidateSize(),180)}
    if(name==="poetry")renderDiary();
    if(name==="memories")renderMemories();
    if(name==="letterpad")renderTemplates();
    $("#main").scrollTop=0;window.scrollTo({top:0,behavior:"instant"});
  }
  $$("[data-page],[data-goto]").forEach(nav=>{
    nav.addEventListener("click",e=>{
      e.preventDefault();e.stopPropagation();
      showPage(nav.dataset.page||nav.dataset.goto);
    });
  });
  $$("[data-record-target]").forEach(b=>b.addEventListener("click",()=>$("#"+b.dataset.recordTarget).scrollIntoView({behavior:"smooth",block:"start"})));
  const sidebar=$("#sidebar"),menuToggle=$("#menuToggle");
  menuToggle.setAttribute("aria-expanded","false");
  menuToggle.addEventListener("click",e=>{
    e.preventDefault();e.stopPropagation();
    const opened=sidebar.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded",String(opened));
  });
  document.addEventListener("pointerdown",e=>{
    if(!sidebar.classList.contains("open"))return;
    if(sidebar.contains(e.target)||menuToggle.contains(e.target))return;
    sidebar.classList.remove("open");
    menuToggle.setAttribute("aria-expanded","false");
  },true);
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&sidebar.classList.contains("open")){
      sidebar.classList.remove("open");menuToggle.setAttribute("aria-expanded","false");
    }
  });
  $("#panchangMore").addEventListener("click",()=>{
    const panel=$("#panchangPanel"),expanded=panel.classList.toggle("expanded");
    $("#panchangMore").setAttribute("aria-expanded",String(expanded));
    $("#panchangMore").textContent=expanded?"कम विवरण देखाउनुहोस् ↑":"थप विवरण देखाउनुहोस् ↓";
  });
  /* =====================================================================
     समयको अनुभूति — time card
     Data flow:
       clock / weekday / Gregorian date  → Intl-free, computed from UTC+05:45 (Asia/Kathmandu)
       Bikram Sambat date                → Trisambat month file (validated + cached) → else clearly
                                           labelled local estimate
       Panchang, sunrise/sunset, ghadi   → KabijwePanchang engine (panchang.js), offline
       Weather                           → Open-Meteo (timeout, timestamp, stale-cache label)
     ===================================================================== */
  const NEPAL_TZ="Asia/Kathmandu";
  const PX=window.KabijwePanchang;
  const nepaliNumber=n=>String(n).replace(/\d/g,d=>"०१२३४५६७८९"[Number(d)]);
  const WEEKDAYS=["आइतबार","सोमबार","मङ्गलबार","बुधबार","बिहीबार","शुक्रबार","शनिबार"];
  const AD_MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const BS_MONTHS=["बैशाख","जेठ","असार","साउन","भदौ","असोज","कात्तिक","मंसिर","पुष","माघ","फागुन","चैत"];
  const LOCATIONS=[
    {id:"ktm",name:"काठमाडौँ",lat:27.7172,lon:85.3240},{id:"pkr",name:"पोखरा",lat:28.2096,lon:83.9856},
    {id:"brt",name:"विराटनगर",lat:26.4525,lon:87.2718},{id:"brj",name:"वीरगञ्ज",lat:27.0104,lon:84.8770},
    {id:"btl",name:"बुटवल",lat:27.7006,lon:83.4483},{id:"npj",name:"नेपालगञ्ज",lat:28.0500,lon:81.6167},
    {id:"dhg",name:"धनगढी",lat:28.6833,lon:80.6000},{id:"mhn",name:"महेन्द्रनगर",lat:28.9640,lon:80.1780},
    {id:"ddl",name:"डडेल्धुरा",lat:29.3000,lon:80.5833},{id:"jnk",name:"जनकपुर",lat:26.7288,lon:85.9260},
    {id:"drn",name:"धरान",lat:26.8125,lon:87.2790},{id:"hth",name:"हेटौँडा",lat:27.4287,lon:85.0322},
    {id:"bhr",name:"भरतपुर",lat:27.6833,lon:84.4333},{id:"jml",name:"जुम्ला",lat:29.2747,lon:82.1838},
    {id:"ilm",name:"इलाम",lat:26.9090,lon:87.9280},{id:"lmb",name:"लुम्बिनी",lat:27.4833,lon:83.2760}
  ];
  const LS_LOC="kabijwe.location", LS_WX="kabijwe.weather", LS_BS="kabijwe.bsmonth.";
  const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}};
  const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};

  /* ---------- Nepal time helpers ---------- */
  const nptP=ms=>PX.nptDateParts(ms);
  const pad2=n=>String(n).padStart(2,"0");
  const nptKey=ms=>{const p=nptP(ms);return `${p.y}-${pad2(p.m)}-${pad2(p.d)}`};
  function nptISO(){return nptKey(Date.now())}                        // today's date in Nepal, YYYY-MM-DD
  function dayOfWeek(ms){const p=nptP(ms);return new Date(Date.UTC(p.y,p.m-1,p.d)).getUTCDay()}
  function periodWord(h){return h>=4&&h<12?"बिहान":h>=12&&h<16?"दिउँसो":h>=16&&h<19?"साँझ":"राति"}
  function clock12(ms){const p=nptP(ms),h12=p.hh%12||12;return {text:`${nepaliNumber(h12)}:${nepaliNumber(pad2(p.mm))}`,word:periodWord(p.hh)}}
  function format24Clock(ms){const p=nptP(ms);return `${nepaliNumber(pad2(p.hh))}:${nepaliNumber(pad2(p.mm))}:${nepaliNumber(pad2(p.ss))}`;}
  function fmtClock(ms){if(ms==null)return "--:--";const c=clock12(ms);return `${c.text} ${c.word}`}
  const dayNo=ms=>{const p=nptP(ms);return Date.UTC(p.y,p.m-1,p.d)/864e5};
  // End times: add "भोलि/हिजो" when the date differs from today (Nepal time).
  function fmtEnd(ms,nowMs){
    const c=clock12(ms),diff=Math.round(dayNo(ms)-dayNo(nowMs)),p=nptP(ms);
    const day=diff===0?"":diff===1?"भोलि ":diff===-1?"हिजो ":`${nepaliNumber(p.d)} ${AD_MONTHS[p.m-1]} `;
    return `${day}${c.word} ${c.text}`;
  }
  function isoWeekNumber(ms){const p=nptP(ms),d=new Date(Date.UTC(p.y,p.m-1,p.d));d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const y0=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-y0)/86400000)+1)/7)}
  function setText(id,v){const el=$("#"+id);if(el&&el.textContent!==v)el.textContent=v}
  function setServiceState(id,message,state="info"){const el=$("#"+id);if(el){el.textContent=message;el.dataset.state=state;}}

  /* ---------- Location (GPS only on click; manual always available) ---------- */
  const DEFAULT_LOC=LOCATIONS[0];
  let loc={mode:"default",id:DEFAULT_LOC.id,name:DEFAULT_LOC.name,lat:DEFAULT_LOC.lat,lon:DEFAULT_LOC.lon};
  (function restoreLocation(){
    const saved=lsGet(LS_LOC);
    if(saved&&saved.mode==="gps"&&Number.isFinite(saved.lat)&&Number.isFinite(saved.lon)&&Math.abs(saved.lat)<=90&&Math.abs(saved.lon)<=180){loc={mode:"gps",id:"",name:saved.name||"GPS स्थान",lat:saved.lat,lon:saved.lon,altitude:Number.isFinite(saved.altitude)?saved.altitude:null,accuracy:Number.isFinite(saved.accuracy)?saved.accuracy:null};return;}
    const hit=saved&&LOCATIONS.find(x=>x.id===saved.id);if(hit)loc={mode:"manual",id:hit.id,name:hit.name,lat:hit.lat,lon:hit.lon};
  })();
  function modeLabel(){return loc.mode==="gps"?"GPS बाट":loc.mode==="manual"?"हातले छानिएको":"पूर्वनिर्धारित (GPS होइन)"}
  function fillManualSelect(){
    const sel=$("#manualPlace");if(!sel)return;
    sel.innerHTML=`<option value="">— स्थान छान्नुहोस् —</option>`+LOCATIONS.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
    sel.value=loc.mode==="manual"?loc.id:"";
  }

  /* ---------- Season (from the Bikram Sambat month, traditional Nepali reckoning) ---------- */
  function renderSeason(bsMonth){
    const s=bsMonth?PX.seasonForBsMonth(bsMonth):null;
    setText("seasonName",s?`ऋतु · ${s.name}`:"ऋतु");
    setText("seasonDesc",s?s.desc:"नेपाली मिति पर्खँदै…");
    $$("#seasonChips [data-season]").forEach(c=>c.classList.toggle("current",!!s&&c.dataset.season===s.name));
  }

  /* ---------- Bikram Sambat date ---------- */
  let bs=null;              // {year,month,day,source:"trisambat"|"cache"|"estimate"}
  let bsKey="",bsSeq=0,bsFailed=false;
  function bsText(){return bs?`${nepaliNumber(bs.day)} ${BS_MONTHS[bs.month-1]} ${nepaliNumber(bs.year)}${bs.source==="estimate"?" (अनुमानित)":""}`:""}
  function validBs(b,adY){return b&&Number.isInteger(+b.year)&&Number.isInteger(+b.month)&&Number.isInteger(+b.day)&&
    +b.month>=1&&+b.month<=12&&+b.day>=1&&+b.day<=32&&(+b.year-adY===56||+b.year-adY===57)}
  function readBsCache(y,m){const c=lsGet(LS_BS+y+"-"+pad2(m));return c&&Date.now()-c.t<30*864e5&&Array.isArray(c.days)?c.days:null}
  async function fetchJson(url,{timeout=10000,retries=2}={}){
    let err;
    for(let i=0;i<=retries;i++){
      const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
      try{
        const r=await fetch(url,{signal:ctl.signal,cache:"no-store",headers:{Accept:"application/json"}});
        if(!r.ok)throw Error("HTTP "+r.status);
        return await r.json();
      }catch(e){err=e;if(i<retries)await new Promise(r=>setTimeout(r,1200*(i+1)))}
      finally{clearTimeout(timer)}
    }
    throw err;
  }
  async function fetchBsMonth(y,m){
    const data=await fetchJson(`https://trisambat.com/api/v1/ad/${y}/${pad2(m)}.json`);
    if(!data||!Array.isArray(data.days))throw Error("unexpected Trisambat response");
    const days=data.days.filter(d=>d&&typeof d.ad==="string"&&d.bs&&validBs(d.bs,y)).map(d=>({ad:d.ad,y:+d.bs.year,m:+d.bs.month,d:+d.bs.day}));
    if(days.length<27)throw Error("Trisambat month incomplete");
    lsSet(LS_BS+y+"-"+pad2(m),{t:Date.now(),days});
    return days;
  }
  function applyBsFromDays(days,key,source){
    const hit=days.find(x=>x.ad===key);if(!hit)return false;
    bs={year:hit.y,month:hit.m,day:hit.d,source};return true;
  }
  async function loadBsDate(force=false){
    const now=Date.now(),key=nptKey(now),p=nptP(now),seq=++bsSeq;
    setServiceState("bsServiceStatus","वि.सं. मिति जाँच हुँदैछ…","loading");
    if(!force&&key===bsKey&&bs&&bs.source!=="estimate")return;
    bsKey=key;
    // 1) instant answer from a cached month (so offline works after one online visit)
    const cached=readBsCache(p.y,p.m);
    if(cached&&applyBsFromDays(cached,key,"cache")){bsFailed=false;renderDate();setServiceState("bsServiceStatus","वि.सं. cache बाट","success");}
    else {bs=null;renderDate();}
    // 2) live validated fetch (refreshes cache; also upgrades "cache" → "trisambat")
    try{
      const days=await fetchBsMonth(p.y,p.m);
      if(seq!==bsSeq)return;
      if(!applyBsFromDays(days,key,"trisambat"))throw Error("date "+key+" missing in response");
      // sanity check against the independent astronomical estimate: must be within ±2 days
      const est=PX.bsEstimate(now,12);
      if(est&&est.month===bs.month&&Math.abs(est.day-bs.day)>2)console.warn("BS cross-check differs",est,bs);
      bsFailed=false;setServiceState("bsServiceStatus","वि.सं. मिति सेवा सफल","success");
      if(p.d>=24){const n=new Date(Date.UTC(p.y,p.m,1));fetchBsMonth(n.getUTCFullYear(),n.getUTCMonth()+1).catch(()=>{})}
    }catch(e){
      if(seq!==bsSeq)return;
      console.warn("Bikram Sambat date:",e);
      setServiceState("bsServiceStatus","वि.सं. सेवा असफल · "+(e.message||"नेटवर्क समस्या")+" · अनुमानित मिति","warning");
      if(!bs||bs.source==="estimate"){
        const est=PX.bsEstimate(now,12);
        bs=est?{year:est.year,month:est.month,day:est.day,source:"estimate"}:null;
      }
      bsFailed=true;
    }
    renderDate();refreshPanchang();
  }

  /* ---------- Date / clock rendering ---------- */
  function renderDate(){
    const now=Date.now(),p=nptP(now),c=clock12(now),wd=WEEKDAYS[dayOfWeek(now)];
    setText("clock",format24Clock(now));
    setText("timeWeekday",wd);
    const tithiName=$("#pTithi")?.textContent?.trim()||"";
    const pakshaName=$("#pPaksha")?.textContent?.trim()||"";
    setText("timeTithi",[tithiName,pakshaName].filter(x=>x&&x!=="—").join(" · ")||"तिथि गणना हुँदैछ…");
    setText("timeAdDate",`${pad2(p.d)} ${AD_MONTHS[p.m-1]} ${p.y}`);
    setText("timeWeekNumber",`हप्ता ${nepaliNumber(isoWeekNumber(now))}`);
    const t=bsText();
    setText("timeBsDate",t||(bsFailed?"वि.सं. मिति उपलब्ध भएन":"नेपाली मिति लोड हुँदै…"));
    setText("todayDay",wd);setText("todayAd",`${pad2(p.d)} ${AD_MONTHS[p.m-1]}`);
    setText("todayBs",t||(bsFailed?"मिति उपलब्ध भएन":"नेपाली मिति लोड हुँदै…"));
    setText("todayNepali",`आजको दिन · ${t||wd}`);
    renderSeason(bs?bs.month:null);
    updateCurrentContextFromUI();
  }

  /* ---------- Panchang, sunrise/sunset, ghadi-pala ---------- */
  let solar=null,pan=null,panError=null;
  function computeSolar(now){
    const p=nptP(now),t=PX.sunTimes(p.y,p.m,p.d,loc.lat,loc.lon);
    solar=t.polar?{polar:t.polar}:{sunriseMs:t.sunriseMs,sunsetMs:t.sunsetMs};
  }
  function refreshPanchang(){
    const now=Date.now();
    try{
      computeSolar(now);
      pan=PX.panchang(now);
      // the traditional "day's" tithi is the one prevailing at sunrise
      pan.atSunrise=solar.sunriseMs?PX.panchang(solar.sunriseMs):null;
      panError=null;
    }catch(e){pan=null;panError=e;console.error("Panchang engine:",e)}
    renderPanchang();drawSun();renderGhadiPala();
  }
  function renderPanchang(){
    const now=Date.now();
    if(!pan){
      setServiceState("panchangServiceStatus","पञ्चाङ्ग गणना असफल","error");setText("panchangStatus","गणना असफल");
      setText("panchangFoot","पञ्चाङ्ग विवरण अहिले उपलब्ध छैन। पछि स्वतः अद्यावधिक हुनेछ।");
      return;
    }
    const t=pan.tithi,n=pan.nakshatra,y=pan.yoga,k=pan.karana;
    setText("pTithi",t.name);
    setText("pPaksha",t.paksha);
    const sr=pan.atSunrise&&pan.atSunrise.tithi.number!==t.number?` · सूर्योदयमा ${pan.atSunrise.tithi.name}`:"";
    setText("pTithiEnd",`समाप्ति ${fmtEnd(t.endMs,now)}${sr}`);
    setText("pNakshatra",n.name);
    setText("pNakshatraPada",`पाद ${nepaliNumber(n.pada)}`);
    setText("pNakshatraEnd",`समाप्ति ${fmtEnd(n.endMs,now)}`);
    setText("pYoga",y.name);setText("pYogaEnd",`समाप्ति ${fmtEnd(y.endMs,now)}`);
    setText("pKarana",k.name);setText("pKaranaEnd",`समाप्ति ${fmtEnd(k.endMs,now)}`);
    setText("pMoonRashi",pan.moonRashi.name);
    setText("pSunRashi",pan.sunRashi.name);
    const lm=pan.lunarMonth;
    setText("pLunarMonth",t.shukla?lm.amanta:lm.purnimanta);
    setText("pLunarNote",t.shukla?"अमान्त = पूर्णिमान्त":`पूर्णिमान्त · अमान्त ${lm.amanta}`);
    setText("pAyana",pan.ayana);
    setText("panchangStatus","गणना उपलब्ध (अफलाइन इन्जिन)");
    setServiceState("panchangServiceStatus","पञ्चाङ्ग अफलाइन गणना सफल","success");
    let bsNote="";
    if(bs&&bs.source==="estimate")bsNote=" वि.सं. मिति सेवा नपाइएकाले अनुमानित हो (±१ दिन फरक पर्न सक्छ)।";
    else if(bs&&bs.source==="cache")bsNote=" वि.सं. मिति सुरक्षित प्रतिबाट देखाइएको छ।";
    else if(!bs&&bsFailed)bsNote=" वि.सं. मिति उपलब्ध भएन।";
    $("#panchangFoot").innerHTML=`पञ्चाङ्ग: Kabijwe को आफ्नै खगोलीय गणना (Meeus सूत्र, लाहिरी अयनांश), अफलाइन चल्छ · स्थान: ${esc(loc.name)} — ${esc(modeLabel())}। वि.सं. मिति: <a href="https://trisambat.com/developers?lang=ne" target="_blank" rel="noopener">Trisambat</a> (beta)।${bsNote} यो आधिकारिक पात्रो होइन।`;
    // Retry control was removed; report BS availability in the status and date fields.
    updateCurrentContextFromUI();
  }
  function renderGhadiPala(){
    const el=$("#pGhadiPala");if(!el)return;
    let g=null;
    try{g=PX.ghadiPala(Date.now(),loc.lat,loc.lon)}catch{}
    if(!g){el.textContent="—";setText("pGhadiNote","सूर्योदय गणना उपलब्ध छैन");return}
    const ghadiText=`${nepaliNumber(g.ghadi)} घडी · ${nepaliNumber(g.pala)} पला`;
    el.textContent=ghadiText;setText("sunGhadiDetail",ghadiText);
    setText("pGhadiNote",`${g.which==="yesterday"?"हिजोको":"आजको"} सूर्योदय ${fmtClock(g.sunriseMs)} देखि · १ घडी = २४ मिनेट, १ पला = २४ सेकेन्ड`);
  }

  /* ---------- Sunrise → sunset arc (one smooth curve) ---------- */
  function drawSun(){
    const marker=$("#sunMarker");if(!marker)return;
    if(!solar||solar.polar){setText("sunriseTime","--:--");setText("sunsetTime","--:--");setText("sunriseDetail","उपलब्ध छैन");setText("sunsetDetail","उपलब्ध छैन");setText("sunStatus",solar&&solar.polar?(solar.polar==="day"?"सूर्य अस्त हुँदैन":"सूर्य उदाउँदैन"):"गणना हुँदैछ…");marker.style.display="none";return}
    const sunrise=fmtClock(solar.sunriseMs),sunset=fmtClock(solar.sunsetMs);
    setText("sunriseTime",sunrise);setText("sunsetTime",sunset);setText("sunriseDetail",sunrise);setText("sunsetDetail",sunset);
    marker.style.display="";
    const now=Date.now(),a=solar.sunriseMs,b=solar.sunsetMs,t=Math.max(0,Math.min(1,(now-a)/(b-a)));
    // Bezier points match the full-width SVG curve exactly.
    const P=[[18,76],[132,76],[190,16],[320,16],[450,16],[508,76],[622,76]],bez=(q,u)=>{const v=1-u;return [0,1].map(i=>v*v*v*q[0][i]+3*v*v*u*q[1][i]+3*v*u*u*q[2][i]+u*u*u*q[3][i])};
    const [x,y]=t<=.5?bez(P.slice(0,4),t*2):bez(P.slice(3,7),(t-.5)*2);
    marker.setAttribute("cx",x.toFixed(1));marker.setAttribute("cy",y.toFixed(1));
    setText("sunStatus",now<a?"सूर्योदयअघि":now>b?"सूर्यास्तपछि":"अहिलेको समय");
  }

  /* ---------- Weather (Open-Meteo) ---------- */
  const WX_TEXT={0:"सफा आकाश",1:"मुख्यतः सफा",2:"आंशिक बादल",3:"बादल लागेको",45:"कुहिरो",48:"बाक्लो कुहिरो",51:"हल्का झरी",53:"झरी",55:"घना झरी",56:"चिसो झरी",57:"चिसो झरी",61:"हल्का वर्षा",63:"वर्षा",65:"भारी वर्षा",66:"चिसो वर्षा",67:"चिसो वर्षा",71:"हल्का हिमपात",73:"हिमपात",75:"भारी हिमपात",77:"हिउँका कण",80:"छिटफुट वर्षा",81:"वर्षा",82:"भारी वर्षा",85:"हिउँ वर्षा",86:"भारी हिउँ वर्षा",95:"मेघगर्जन",96:"असिनासहित मेघगर्जन",99:"असिनासहित मेघगर्जन"};
  let wxSeq=0;
  function showWeather(w,stale){
    setText("weatherTemp",`${Math.round(w.temp)}°`);
    setText("weatherCondition",WX_TEXT[w.code]||"मौसम विवरण");
    setText("weatherExtra",[Number.isFinite(w.apparent)?`महसुस हुने ${nepaliNumber(Math.round(w.apparent))}°`:"",Number.isFinite(w.hum)?`आर्द्रता ${nepaliNumber(Math.round(w.hum))}%`:"",Number.isFinite(w.wind)?`हावा ${nepaliNumber(Math.round(w.wind))} km/h`:"",Number.isFinite(w.cloud)?`बादल ${nepaliNumber(Math.round(w.cloud))}%`:"",Number.isFinite(w.precip)?`वर्षा ${nepaliNumber(w.precip)} mm`:""].filter(Boolean).join(" · "));
    const when=w.time?`${nepaliNumber(w.time.slice(11,16))}`:fmtClock(w.fetched);
    setText("weatherUpdated",stale?`⚠ पुरानो मौसम · ${when} को (इन्टरनेट/सेवा समस्या)`:`अद्यावधिक ${when}`);
  }
  async function loadWeather(){
    const seq=++wxSeq,{lat,lon}=loc;
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){setText("weatherCondition","स्थानको निर्देशाङ्क मान्य छैन");return}
    setText("weatherCondition","मौसम लोड हुँदैछ…");
    setServiceState("weatherServiceStatus","मौसम लोड हुँदैछ…","loading");try{
      const d=await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,cloud_cover,precipitation&timezone=Asia%2FKathmandu`,{timeout:10000,retries:1});
      if(seq!==wxSeq)return;
      const c=d&&d.current;
      if(!c||!Number.isFinite(c.temperature_2m))throw Error("weather fields missing");
      const w={temp:c.temperature_2m,hum:c.relative_humidity_2m,apparent:c.apparent_temperature,wind:c.wind_speed_10m,cloud:c.cloud_cover,precip:c.precipitation,code:c.weather_code,time:c.time,fetched:Date.now(),lat,lon};
      lsSet(LS_WX,w);showWeather(w,false);setServiceState("weatherServiceStatus","मौसम सेवा सफल","success");
      const history=state.locationHistory.find(x=>x.id===loc.historyId);if(history){
        history.weather={temp:w.temp,apparent:w.apparent,humidity:w.hum,windKmh:w.wind,condition:WX_TEXT[w.code]||"मौसम विवरण",updatedAt:w.fetched};
        history.context={...(history.context||{}),weatherTemp:`${Math.round(w.temp)}°`,apparentTemperature:w.apparent,weatherCondition:WX_TEXT[w.code]||"मौसम विवरण",humidity:w.hum,windKmh:w.wind,weatherUpdated:`अद्यावधिक ${w.time?nepaliNumber(w.time.slice(11,16)):format24Clock(w.fetched)}`,weatherFetchedAt:w.fetched,weatherCode:w.code};
        persist();renderLocationHistory();
      }
    }catch(e){
      if(seq!==wxSeq)return;
      console.warn("Weather:",e);
      const old=lsGet(LS_WX);
      if(old&&Math.abs(old.lat-lat)<.05&&Math.abs(old.lon-lon)<.05&&Date.now()-old.fetched<6*3600e3){showWeather(old,true);setServiceState("weatherServiceStatus","पुरानो मौसम · "+(e.message||"सेवा असफल"),"warning");}else{setText("weatherTemp","--°");setText("weatherCondition",navigator.onLine===false?"इन्टरनेट छैन — मौसम उपलब्ध छैन":"मौसम सेवा अहिले उपलब्ध छैन");setText("weatherExtra","");setText("weatherUpdated","");setServiceState("weatherServiceStatus","मौसम सेवा असफल · "+(e.message||"नेटवर्क समस्या"),"error");}
    }
    updateCurrentContextFromUI();
    const active=state.locationHistory.find(x=>x.id===loc.historyId);
    if(active&&active.source==="gps"&&active.status==="updated"){
      active.context={...(active.context||{}),...getContextSnapshot(active.timestamp),place:loc.name};
      active.weather=active.weather||null;persist();renderLocationHistory();
    }
  }
  async function reverseName(lat,lon,seq){
    setServiceState("placeServiceStatus","स्थानको नाम खोज्दै…","loading");try{
      const g=await fetchJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=ne,en`,{timeout:8000,retries:0});
      const a=g.address||{},name=[a.suburb||a.village||a.town||a.city||a.municipality||a.county,a.state].filter(Boolean).join(", ");
      if(seq===locSeq&&name){loc.name=name;lsSet(LS_LOC,{mode:"gps",lat:loc.lat,lon:loc.lon,name:loc.name,altitude:loc.altitude,accuracy:loc.accuracy,updatedAt:Date.now()});const h=state.locationHistory.find(x=>x.id===loc.historyId);if(h){h.place=name;h.context={...(h.context||{}),place:name,locationMode:"GPS बाट"};persist();renderLocationHistory()}renderLocation();refreshPanchang();setServiceState("placeServiceStatus","स्थान पहिचान सफल","success");updateCurrentContextFromUI();}else if(seq===locSeq)setServiceState("placeServiceStatus","निर्देशाङ्क प्राप्त भयो · नाम उपलब्ध भएन","warning");}catch(e){if(seq===locSeq)setServiceState("placeServiceStatus","स्थान नाम सेवा असफल · "+(e.message||"नेटवर्क समस्या"),"error");}}

  /* ---------- Applying a location ---------- */
  let locSeq=0;
  function renderLocation(){
    setText("placeName",loc.name||"स्थान उपलब्ध छैन");
    setText("locationMode",modeLabel());
    setText("locationCoordinates",Number.isFinite(loc.lat)&&Number.isFinite(loc.lon)?`⌖ ${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}`:"निर्देशाङ्क: उपलब्ध छैन");
    const alt=$("#locationAltitude");if(alt){alt.textContent=Number.isFinite(loc.altitude)?`▲ उचाइ ${Math.round(loc.altitude)} मिटर`:"▲ उचाइ: GPS बाट उपलब्ध छैन";alt.classList.toggle("altitude-known",Number.isFinite(loc.altitude));}
    setText("locationAccuracy",Number.isFinite(loc.accuracy)?`GPS शुद्धता ±${Math.round(loc.accuracy)} मिटर`:"");
    const badge=$("#locationMode");if(badge)badge.dataset.mode=loc.mode;
  }
  function recordLocationAttempt(){
    if(!Array.isArray(state.locationHistory))state.locationHistory=[];
    const stamp=Date.now(),record={id:uid(),timestamp:stamp,timestampISO:new Date(stamp).toISOString(),source:"gps",
      status:"pending",place:"GPS स्थान अनुरोध",latitude:null,longitude:null,altitudeM:null,accuracyM:null,weather:null,context:getContextSnapshot(stamp)};
    state.locationHistory.push(record);persist();return record.id;
  }
  function finishLocationAttempt(id,patch){
    const record=state.locationHistory.find(x=>x.id===id);if(!record)return;
    Object.assign(record,patch);
    if(patch.status==="updated"){
      const capturedAt=Date.now();
      record.timestamp=capturedAt;record.timestampISO=new Date(capturedAt).toISOString();
      record.context=getContextSnapshot(capturedAt);
    }
    persist();try{renderLocationHistory();}catch(error){console.warn("Location history render:",error);}
  }
  function recordLocationUpdate(){
    if(!Array.isArray(state.locationHistory))state.locationHistory=[];
    const stamp=Date.now(),record={id:uid(),timestamp:stamp,timestampISO:new Date(stamp).toISOString(),source:loc.mode,
      status:"updated",place:loc.name,latitude:loc.lat,longitude:loc.lon,altitudeM:Number.isFinite(loc.altitude)?loc.altitude:null,
      accuracyM:Number.isFinite(loc.accuracy)?loc.accuracy:null,weather:null,context:getContextSnapshot(stamp)};
    state.locationHistory.push(record);loc.historyId=record.id;persist();renderLocationHistory();
  }
  function applyLocation(next,{persist=false,historyId=null}={}){
    loc=next;locSeq++;
    if(loc.mode==="gps")lsSet(LS_LOC,{mode:"gps",lat:loc.lat,lon:loc.lon,name:loc.name,altitude:loc.altitude,accuracy:loc.accuracy,updatedAt:Date.now()});else if(persist&&loc.mode==="manual")lsSet(LS_LOC,{mode:"manual",id:loc.id});
    if(loc.mode==="gps"&&historyId){finishLocationAttempt(historyId,{status:"updated",place:loc.name,latitude:loc.lat,longitude:loc.lon,
      altitudeM:Number.isFinite(loc.altitude)?loc.altitude:null,accuracyM:Number.isFinite(loc.accuracy)?loc.accuracy:null});loc.historyId=historyId;}
    else if(loc.mode==="gps"||loc.mode==="manual")recordLocationUpdate();
    fillManualSelect();renderLocation();refreshPanchang();loadWeather();
    if(loc.mode==="gps")reverseName(loc.lat,loc.lon,locSeq);
  }
  $("#manualPlace").addEventListener("change",e=>{
    const hit=LOCATIONS.find(x=>x.id===e.target.value);if(!hit)return;
    applyLocation({mode:"manual",id:hit.id,name:hit.name,lat:hit.lat,lon:hit.lon},{persist:true});
    toast(`स्थान: ${hit.name} (हातले छानिएको)`);
  });
  $("#timeLocationBtn").addEventListener("click",()=>{
    const btn=$("#timeLocationBtn"),label=btn.querySelector(".loc-text");
    const status=(message,state="info")=>setServiceState("gpsServiceStatus",message,state);
    if(btn.disabled)return;
    if(!navigator.geolocation){status("यो browser मा GPS सुविधा उपलब्ध छैन","error");toast("Browser ले स्थान सेवा उपलब्ध गराएन।");return;}
    if(!window.isSecureContext){status("HTTPS वा localhost बाट खोल्नुहोस्","error");toast("GPS का लागि HTTPS वा http://127.0.0.1 आवश्यक छ।");return;}
    btn.disabled=true;if(label)label.textContent="GPS खोजिँदैछ…";
    status("GPS अनुरोध सुरु भयो · फोनको Location खुला राख्नुहोस्","loading");
    let attemptId=null,completed=false;
    try{attemptId=recordLocationAttempt();}catch(err){console.warn("GPS history start:",err);}
    const finishButton=()=>{btn.disabled=false;if(label)label.textContent="मेरो GPS स्थान पुनः लिनुहोस्";};
    const fail=(err)=>{
      if(completed)return;completed=true;finishButton();
      const code=err?.code,denied=code===1,timeout=code===3;
      const message=denied?"स्थान अनुमति अस्वीकृत":timeout?"GPS संकेत आउन समय लाग्यो":"फोनको स्थान उपलब्ध भएन";
      try{if(attemptId)finishLocationAttempt(attemptId,{status:denied?"denied":"failed",note:message,code:code||null});}catch(e){console.warn("GPS history update:",e);}
      status(denied?"अनुमति अस्वीकृत · Browser र Android मा Location Allow गर्नुहोस्":timeout?"समय सकियो · Location खोल्नुहोस् र खुला ठाउँमा पुनः प्रयास गर्नुहोस्":"GPS उपलब्ध भएन · Location setting जाँच्नुहोस्","error");
      toast(denied?"Browser Site settings र Android App permissions मा Location Allow गर्नुहोस्।":timeout?"GPS संकेत कमजोर छ। फोनको Location खोल्नुहोस् र खुला ठाउँमा प्रयास गर्नुहोस्।":"फोनको Location सेवा जाँचेर फेरि प्रयास गर्नुहोस्।");
    };
    const success=(position)=>{
      if(completed)return;
      const c=position?.coords,lat=c?.latitude,lon=c?.longitude;
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){fail({code:2});return;}
      if(!attemptId){try{attemptId=recordLocationAttempt();}catch(err){console.warn("GPS record creation:",err);}}
      completed=true;finishButton();
      const next={mode:"gps",id:"",name:"GPS स्थान",lat,lon,altitude:Number.isFinite(c.altitude)?c.altitude:null,accuracy:Number.isFinite(c.accuracy)?c.accuracy:null};
      try{applyLocation(next,{historyId:attemptId});}
      catch(err){console.error("GPS location apply:",err);loc=next;renderLocation();try{refreshPanchang();}catch{}try{loadWeather();}catch{}}
      status("GPS सफल · शुद्धता ±"+Math.round(c.accuracy||0)+" मिटर","success");
      toast("GPS स्थान प्राप्त भयो। मौसम र पञ्चाङ्ग अद्यावधिक हुँदैछन्।");
    };
    const fallback=(err)=>{
      if(err?.code===1){fail(err);return;}
      status("GPS संकेत कमजोर · नेटवर्क-सहायित स्थान खोजिँदैछ","loading");
      try{navigator.geolocation.getCurrentPosition(success,fail,{enableHighAccuracy:false,timeout:20000,maximumAge:60000});}
      catch(e){fail(e);}
    };
    try{navigator.geolocation.getCurrentPosition(success,fallback,{enableHighAccuracy:true,timeout:18000,maximumAge:0});}
    catch(err){fail(err);}
  });
  window.addEventListener("online",()=>{loadBsDate(true);loadWeather()});

  /* ---------- Main loop ---------- */
  let lastKey="",lastHeavy=0;
  function tick(){
    const now=Date.now(),key=nptKey(now);
    if(key!==lastKey){lastKey=key;bsKey="";loadBsDate();refreshPanchang();lastHeavy=now}   // Nepal midnight rollover
    else if(now-lastHeavy>=60000){lastHeavy=now;refreshPanchang()}
    renderDate();drawSun();renderGhadiPala();
  }
  fillManualSelect();renderLocation();
  lastKey=nptKey(Date.now());lastHeavy=Date.now();
  refreshPanchang();loadBsDate();loadWeather();if(loc.mode==="gps")reverseName(loc.lat,loc.lon,locSeq);tick();
  setInterval(tick,1000);
  setInterval(()=>loadWeather(),20*60*1000);
  function previewEntries(){const list=state.entries.slice().sort((a,b)=>b.updated-a.updated);$("#recentEntries").innerHTML=list.length?list.map(e=>{const ctx=formatContextLine(e.context);return `<article class="entry-card post-tap-card" data-entry-open="${e.id}" tabindex="0" role="button"><div class="entry-meta"><span>${dateText(e.date)}</span><span>${e.visibility==="private"?"🔒 निजी":e.visibility==="public"?"◉ प्रकाशनका लागि":"ड्राफ्ट"}</span></div>${ctx?`<div class="entry-context">${esc(ctx)}</div>`:""}<h3>${esc(e.title||"शीर्षकविहीन पाना")}</h3><p>${esc(e.content.slice(0,130))}</p><small class="tap-hint">Letterhead · खोल्न ट्याप गर्नुहोस्</small></article>`}).join(""):`<div class="empty-state">तपाईंको पहिलो डायरी यहाँ देखिनेछ।</div>`;$("#recentEntries").querySelectorAll("[data-entry-open]").forEach(card=>{const open=()=>openPostView(state.entries.find(e=>e.id===card.dataset.entryOpen));card.onclick=open;card.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open()}}})}

  let pendingEntryMedia=[];
  function readMediaFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({name:file.name,type:file.type,data:r.result,size:file.size});r.onerror=()=>reject(new Error("फाइल पढ्न सकिएन"));r.readAsDataURL(file)})}
  function mediaMarkup(media=[]){return media.map(m=>m.type?.startsWith("image/")?'<img src="'+m.data+'" alt="'+esc(m.name||"डायरी तस्वीर")+'">':m.type?.startsWith("audio/")?'<audio controls preload="metadata" src="'+m.data+'"></audio>':m.type?.startsWith("video/")?'<video controls playsinline preload="metadata" src="'+m.data+'"></video>':'').join("")}
  function updateMediaPreview(){const el=$("#entryMediaPreview");if(el)el.innerHTML=mediaMarkup(pendingEntryMedia)}
  function openEditor(entry=null){$("#entryForm").reset();pendingEntryMedia=(entry?.media||[]).slice();$("#entryId").value=entry?.id||"";$("#entryTitle").value=entry?.title||"";$("#entryDate").value=entry?.date||nptISO();$("#entryMood").value=entry?.mood||"शान्त";$("#entryContent").value=entry?.content||"";$("#entryType").value=entry?.type||"diary";$("#entryVisibility").value=entry?.visibility||"private";$("#privacyHelp").textContent=privacyHelpText($("#entryVisibility").value);$("#entryTags").value=entry?.tags||"";$("#editorEyebrow").textContent=entry?"LETTERHEAD · सम्पादन":"LETTERHEAD · नयाँ पोस्ट";$("#editorHeading").textContent=entry?(entry.title||"डायरीको पोस्ट"):"नयाँ पोस्ट";const detail=$("#entryContextDetails");if(detail)detail.innerHTML=contextDetailsHTML(entry?.context||getContextSnapshot());$("#deleteEntry").style.visibility=entry?"visible":"hidden";updateMediaPreview();$("#editorDialog").showModal()}
  $("#newDiary").onclick=()=>openEditor();$("#newPoem").onclick=()=>{openEditor();$("#entryType").value="poem"};
  ["entryPhotoCamera","entryPhoto","entryVideoCamera","entryVideo","entryAudio"].forEach(id=>$("#"+id).addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2*1024*1024){toast("प्रति मिडिया फाइल २ MB सम्म मात्र छान्नुहोस्।");e.target.value="";return}try{const item=await readMediaFile(file);const kind=item.type.split("/")[0];const next=pendingEntryMedia.filter(x=>!x.type?.startsWith(kind+"/"));if(next.reduce((n,x)=>n+(x.size||0),0)+item.size>3*1024*1024){toast("एउटा पोस्टमा मिडिया जम्मा ३ MB सम्म राख्नुहोस्।");e.target.value="";return}pendingEntryMedia=next;pendingEntryMedia.push(item);updateMediaPreview()}catch(err){toast(err.message)}}));
  let voiceRecorder=null,voiceChunks=[],voiceBlob=null,voiceStream=null,voiceElapsed=0,voiceStartAt=0,voiceTimerHandle=null,voiceAudioContext=null,voiceAnalyser=null,voiceVisualFrame=0;
  function voiceTime(ms){const t=Math.floor(ms/1000);return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0")}
  function voiceUpdate(label){$("#voiceStatus").textContent=label;$("#voiceTimer").textContent=voiceTime(voiceElapsed);$("#voiceProgress").style.width=Math.min(100,voiceElapsed/90000*100)+"%"}
  function animateVoice(){if(!voiceAnalyser)return;const bins=new Uint8Array(voiceAnalyser.frequencyBinCount);voiceAnalyser.getByteFrequencyData(bins);const bars=$("#voiceEqualizer i");bars.forEach((bar,i)=>{const v=bins[Math.floor(i*bins.length/Math.max(1,bars.length))]||0;bar.style.height=(4+Math.round(v/255*31))+"px"});voiceVisualFrame=requestAnimationFrame(animateVoice)}
  function startVoiceVisualizer(stream){const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;try{voiceAudioContext=new AudioCtx();voiceAnalyser=voiceAudioContext.createAnalyser();voiceAnalyser.fftSize=128;voiceAnalyser.smoothingTimeConstant=.78;voiceAudioContext.createMediaStreamSource(stream).connect(voiceAnalyser);voiceAudioContext.resume?.();animateVoice()}catch{voiceAnalyser=null}}
  function stopVoiceVisualizer(){cancelAnimationFrame(voiceVisualFrame);voiceVisualFrame=0;voiceAnalyser=null;$(".voice-equalizer i").forEach(bar=>bar.style.height="4px");if(voiceAudioContext){voiceAudioContext.close().catch(()=>{});voiceAudioContext=null}}
  $("#voiceStart").onclick=()=>{if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast("यो ब्राउजरमा आवाज रेकर्ड सुविधा उपलब्ध छैन।");return}if(!confirm("माइक्रोफोनबाट रेकर्ड गर्न अनुमति दिनुहुन्छ? अरू व्यक्तिको आवाज रेकर्ड गर्नुअघि उहाँको स्पष्ट अनुमति लिनुहोस्।"))return;navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{voiceStream=stream;voiceChunks=[];voiceBlob=null;voiceElapsed=0;voiceStartAt=Date.now();startVoiceVisualizer(stream);voiceRecorder=new MediaRecorder(stream);voiceRecorder.ondataavailable=ev=>{if(ev.data?.size)voiceChunks.push(ev.data)};voiceRecorder.onstop=()=>{voiceBlob=new Blob(voiceChunks,{type:voiceRecorder.mimeType||"audio/webm"});voiceStream?.getTracks().forEach(t=>t.stop());voiceStream=null;stopVoiceVisualizer();clearInterval(voiceTimerHandle);$("#voiceStart").disabled=false;$("#voicePause").disabled=true;$("#voiceStop").disabled=true;$("#voicePause").textContent="पज";$("#voiceSave").disabled=voiceBlob.size>2*1024*1024;voiceUpdate(voiceBlob.size>2*1024*1024?"रेकर्ड २ MB भन्दा ठूलो भयो":"रोकियो · सुरक्षित गर्न तयार")};voiceRecorder.start(400);$("#voiceStart").disabled=true;$("#voicePause").disabled=false;$("#voiceStop").disabled=false;$("#voiceSave").disabled=true;voiceTimerHandle=setInterval(()=>{if(voiceRecorder?.state==="recording"){voiceElapsed+=Date.now()-voiceStartAt;voiceStartAt=Date.now();voiceUpdate("रेकर्ड हुँदैछ")}if(voiceElapsed>=90000&&voiceRecorder?.state==="recording")voiceRecorder.stop()},250);voiceUpdate("रेकर्ड हुँदैछ")}).catch(err=>{toast(err.name==="NotAllowedError"?"माइक्रोफोन अनुमति दिइएन।":"माइक्रोफोन सुरु हुन सकेन।");$("#voiceStatus").textContent="रेकर्ड सुरु भएन"})};
  $("#voicePause").onclick=()=>{if(!voiceRecorder)return;if(voiceRecorder.state==="recording"){voiceElapsed+=Date.now()-voiceStartAt;voiceRecorder.pause();cancelAnimationFrame(voiceVisualFrame);clearInterval(voiceTimerHandle);$("#voicePause").textContent="फेरि सुरु";voiceUpdate("पज गरिएको")}else if(voiceRecorder.state==="paused"){voiceRecorder.resume();voiceAudioContext?.resume?.();animateVoice();voiceStartAt=Date.now();$("#voicePause").textContent="पज";voiceTimerHandle=setInterval(()=>{if(voiceRecorder?.state==="recording"){voiceElapsed+=Date.now()-voiceStartAt;voiceStartAt=Date.now();voiceUpdate("रेकर्ड हुँदैछ")}},250)}};
  $("#voiceStop").onclick=()=>{if(voiceRecorder&&voiceRecorder.state!=="inactive"){if(voiceRecorder.state==="recording")voiceElapsed+=Date.now()-voiceStartAt;voiceRecorder.stop()}};
  $("#voiceSave").onclick=()=>{if(!voiceBlob)return;if(pendingEntryMedia.reduce((n,x)=>n+(x.size||0),0)+voiceBlob.size>3*1024*1024){toast("एउटा पोस्टमा मिडिया जम्मा ३ MB सम्म राख्न सकिन्छ।");return}const fr=new FileReader();fr.onload=()=>{pendingEntryMedia.push({name:"voice-"+Date.now()+".webm",type:voiceBlob.type,data:fr.result,size:voiceBlob.size});updateMediaPreview();voiceBlob=null;$("#voiceSave").disabled=true;voiceUpdate("आवाज पोस्टमा जोडियो");toast("आवाज पोस्टमा जोडियो।")};fr.readAsDataURL(voiceBlob)};
  $("#entryForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("#entryId").value;const old=state.entries.find(x=>x.id===id);const ctx=getContextSnapshot();const title=$("#entryTitle").value.trim();const content=$("#entryContent").value.trim();if(!title&&!content&&!pendingEntryMedia.length){toast("शीर्षक, शब्द वा मिडिया मध्ये केही थप्नुहोस्।");return}const item={id:id||uid(),title:title||"मिडिया पोस्ट",date:$("#entryDate").value||nptISO(),mood:$("#entryMood").value,content,type:$("#entryType").value,visibility:$("#entryVisibility").value,tags:$("#entryTags").value,media:pendingEntryMedia,created:old?.created||Date.now(),updated:Date.now(),context:old?.context||ctx};try{if(old)Object.assign(old,item);else state.entries.push(item);persist()}catch(err){toast("स्थानीय भण्डारण भरिएको छ। सानो मिडिया फाइल छानेर पुनः प्रयास गर्नुहोस्।");return}$("#editorDialog").close();renderAll();toast("पोस्ट सुरक्षित भयो · My Records → डायरी।")});
  $("#deleteEntry").onclick=()=>{const id=$("#entryId").value;if(id&&confirm("यो पाना मेटाउने?")){state.entries=state.entries.filter(e=>e.id!==id);persist();$("#editorDialog").close();renderAll();toast("पाना मेटाइयो।")}};
  let activeBookEntries=[],activeBookIndex=0,bookTouchX=0;
  function bookMetaLine(ctx){if(!ctx)return "";const a=[];if(ctx.nepalTime)a.push("◷ "+ctx.nepalTime);if(ctx.adDate)a.push("▦ "+ctx.adDate);if(ctx.bsDate)a.push("वि.सं. "+ctx.bsDate);if(ctx.weekday)a.push(ctx.weekday);if(ctx.tithi)a.push("☾ "+ctx.tithi+(ctx.paksha?" "+ctx.paksha:""));if(ctx.nakshatra)a.push("✧ "+ctx.nakshatra+(ctx.nakshatraPada?" "+ctx.nakshatraPada:""));if(ctx.yoga)a.push("✺ "+ctx.yoga);if(ctx.karana)a.push("करण "+ctx.karana);if(ctx.moonRashi)a.push("चन्द्र "+ctx.moonRashi);if(ctx.sunRashi)a.push("सूर्य "+ctx.sunRashi);if(ctx.lunarMonth)a.push(ctx.lunarMonth);if(ctx.ayana)a.push(ctx.ayana);if(ctx.ghadiPala)a.push("घडी "+ctx.ghadiPala);if(ctx.sunrise||ctx.sunset)a.push("☀ "+[ctx.sunrise,ctx.sunset].filter(Boolean).join("/"));if(ctx.season)a.push(ctx.season);if(ctx.place)a.push("⌖ "+ctx.place);if(ctx.latitude!=null&&ctx.longitude!=null)a.push(Number(ctx.latitude).toFixed(4)+","+Number(ctx.longitude).toFixed(4));if(ctx.altitudeM!=null)a.push("उचाइ "+Math.round(ctx.altitudeM)+"m");if(ctx.accuracyM!=null)a.push("±"+Math.round(ctx.accuracyM)+"m");if(ctx.weatherTemp||ctx.weatherCondition)a.push("☼ "+[ctx.weatherTemp,ctx.weatherCondition].filter(Boolean).join(" "));if(ctx.humidity!=null)a.push("आर्द्रता "+ctx.humidity+"%");if(ctx.windKmh!=null)a.push("हावा "+ctx.windKmh+"km/h");return a.join(" · ")}
  function renderBookPage(){
    const e=activeBookEntries[activeBookIndex];if(!e)return;state.settings=state.settings||{};const p=state.settings.bookStyle||{paper:"cream",font:"normal",showMeta:true,showIcons:true};
    let meta=bookMetaLine(e.context);if(p.showIcons===false)meta=meta.replace(/[◷▦☾✧✺⌖☼↗]/g,"");
    const paper=p.paper||"cream",font=p.font||"normal",media=mediaMarkup(e.media||[]),context=e.context?contextDetailsHTML(e.context):"";
    const title=esc(e.title||"आजको डायरी"),body=esc(e.content||"").replace(/\n/g,"<br>");
    $("#postViewContent").innerHTML=
      '<div class="book-stage"><article class="book-page paper-'+esc(paper)+' font-'+esc(font)+'" id="activeBookPage">'+
      '<div class="book-binding"></div><div class="book-head"><span>kabijwe · व्यक्तिगत डायरी</span><span>~बिक्रमादित्य</span></div><div class="book-rule"></div>'+
      '<div class="book-date-row"><span>✧ '+esc(dateText(e.date))+'</span><span>◷ '+esc(e.context?.nepalTime||"")+'</span></div><div class="book-bs-date">'+esc(e.context?.bsDate||"")+'</div>'+
      ((e.context?.place||e.context?.weatherCondition||e.context?.weatherTemp||e.context?.season)?'<div class="book-auto-details">'+
        (e.context?.place?'<span><small>स्थान</small><b>⌖ '+esc(e.context.place)+'</b></span>':"")+
        ((e.context?.weatherCondition||e.context?.weatherTemp)?'<span><small>मौसम</small><b>☼ '+esc([e.context.weatherTemp,e.context.weatherCondition,e.context.humidity!=null?'आर्द्रता '+e.context.humidity+'%':'',e.context.windKmh!=null?'हावा '+e.context.windKmh+' km/h':''].filter(Boolean).join(" · "))+'</b></span>':"")+
        (e.context?.season?'<span><small>ऋतु</small><b>'+esc([e.context.season,e.context.seasonDescription].filter(Boolean).join(" · "))+'</b></span>':"")+
      '</div>':"")+
      '<h1 class="book-title">'+title+'</h1><div class="book-content">'+body+'</div><div class="book-media">'+media+'</div>'+
      (p.showMeta!==false&&meta?'<div class="book-context-line">'+esc(meta)+'</div>':"")+
      '<details class="book-more-context"><summary>समयको अनुभूति · सम्पूर्ण विवरण</summary>'+(context||'<p class="muted">विवरण छैन।</p>')+'</details>'+
      '<div class="book-sign">~बिक्रमादित्य</div><div class="book-page-number">'+(activeBookIndex+1)+' / '+activeBookEntries.length+'</div></article></div>'+
      '<div class="book-navigation"><button class="btn secondary" id="bookPrev" '+(activeBookIndex===0?"disabled":"")+ '>‹ अघिल्लो पाना</button><span>'+(activeBookIndex+1)+' / '+activeBookEntries.length+'</span><button class="btn secondary" id="bookNext" '+(activeBookIndex===activeBookEntries.length-1?"disabled":"")+ '>अर्को पाना ›</button></div>'+
      '<div class="book-actions"><button class="btn secondary" id="bookEdit">✎ सम्पादन</button><button class="btn secondary" id="bookCustomize">Aa पाना सजाउनुहोस्</button></div>'+
      '<details class="book-customize" id="bookCustomizePanel"><summary>Letterhead अनुकूलन</summary><label>पानाको रङ<select id="bookPaper"><option value="cream" '+(paper==="cream"?"selected":"")+ '>पुरानो डायरी क्रिम</option><option value="white" '+(paper==="white"?"selected":"")+ '>सफा सेतो</option><option value="blue" '+(paper==="blue"?"selected":"")+ '>हल्का निलो</option><option value="rose" '+(paper==="rose"?"selected":"")+ '>हल्का गुलाबी</option></select></label>'+
      '<label>अक्षर आकार<select id="bookFont"><option value="small" '+(font==="small"?"selected":"")+ '>सानो</option><option value="normal" '+(font==="normal"?"selected":"")+ '>सामान्य</option><option value="large" '+(font==="large"?"selected":"")+ '>ठूलो</option></select></label>'+
      '<label class="book-check"><input id="bookShowMeta" type="checkbox" '+(p.showMeta!==false?"checked":"")+ '> समयको विवरण देखाउने</label><label class="book-check"><input id="bookShowIcons" type="checkbox" '+(p.showIcons!==false?"checked":"")+ '> विवरणसँग आइकन देखाउने</label></details>';
    $("#bookPrev").onclick=()=>changeBookPage(-1);$("#bookNext").onclick=()=>changeBookPage(1);
    $("#bookEdit").onclick=()=>{const item=e;$("#postViewDialog").close();openEditor(item)};
    $("#bookCustomize").onclick=()=>{const d=$("#bookCustomizePanel");d.open=!d.open};
    const save=()=>{state.settings.bookStyle={paper:$("#bookPaper").value,font:$("#bookFont").value,showMeta:$("#bookShowMeta").checked,showIcons:$("#bookShowIcons").checked};persist();renderBookPage()};
    ["bookPaper","bookFont","bookShowMeta","bookShowIcons"].forEach(id=>$("#"+id).addEventListener("change",save));
    const page=$("#activeBookPage");$("#postViewDialog .post-view-shell").scrollTop=0;page.addEventListener("touchstart",ev=>{bookTouchX=ev.changedTouches[0].clientX},{passive:true});page.addEventListener("touchend",ev=>{const dx=ev.changedTouches[0].clientX-bookTouchX;if(Math.abs(dx)>65)changeBookPage(dx<0?1:-1)},{passive:true});
  }
  function changeBookPage(n){const next=activeBookIndex+n;if(next<0||next>=activeBookEntries.length)return;const page=$("#activeBookPage");if(page)page.classList.add(n>0?"page-turn-next":"page-turn-prev");setTimeout(()=>{activeBookIndex=next;renderBookPage()},130)}
  function openPostView(entry){if(!entry)return;activeBookEntries=state.entries.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.created-b.created);activeBookIndex=Math.max(0,activeBookEntries.findIndex(x=>x.id===entry.id));renderBookPage();$("#postViewDialog").showModal()}
  $("#bookClose").onclick=()=>$("#postViewDialog").close();
  function privacyHelpText(value){return ({private:"निजी: तपाईं मात्र। यो उपकरणको स्थानीय डाटामा सुरक्षित हुन्छ।",selected:"छानिएका साथी: रोजिएका व्यक्तिका लागि। साथी छनोट/सेयर सुविधा जोडिएपछि मात्र वास्तविक पहुँच खुल्नेछ।",friends:"साथीहरू: तपाईंका साथीहरूका लागि। हाल यो स्थानीय गोपनीयता लेबल मात्र हो।",public:"सार्वजनिक: सबैका लागि। अनलाइन प्रकाशन वा सेयर गर्न छुट्टै सुविधा आवश्यक हुन्छ।"})[value]||"ड्राफ्ट पोस्ट हाल स्थानीय रूपमा सुरक्षित हुन्छ।"}
  $("#entryVisibility").addEventListener("change",e=>{$("#privacyHelp").textContent=privacyHelpText(e.target.value)});
  function visibilityLabel(value){return ({private:"🔒 निजी",selected:"◉ छानिएका साथी",friends:"♧ साथीहरू",public:"◎ सार्वजनिक",draft:"ड्राफ्ट · पुरानो"})[value]||"🔒 निजी"}
  function renderDiary(){const q=$("#diarySearch").value.toLowerCase(),f=$("#diaryFilter").value;let arr=state.entries.filter(e=>(f==="all"||e.visibility===f)&&[e.title,e.content,e.tags,e.context?.tithi,e.context?.bsDate,e.context?.place].join(" ").toLowerCase().includes(q)).sort((x,y)=>y.updated-x.updated);$("#diaryList").innerHTML=arr.length?arr.map(e=>{const ctxLine=formatContextLine(e.context),count=e.media?.length||0,icons=(e.media||[]).map(m=>m.type?.startsWith("image/")?"▧ फोटो":m.type?.startsWith("video/")?"▷ भिडियो":m.type?.startsWith("audio/")?"♫ आवाज":"फाइल").join(" · ");return `<article class="entry-row post-tap-row" data-entry-open="${e.id}" tabindex="0" role="button"><div><div class="entry-meta"><span>▤ ${dateText(e.date)}</span><span>◷ ${esc(e.context?.nepalTime||"")}</span><span>${visibilityLabel(e.visibility)}</span><span>${icons||"✎ टेक्स्ट"}</span></div>${ctxLine?`<div class="entry-context">${esc(ctxLine)}</div>`:""}<h3>${esc(e.title||"शीर्षकविहीन पोस्ट")}</h3><p>${esc(e.content.slice(0,150))}</p></div><span class="tap-hint">Letterhead मा हेर्नुहोस् ↗</span></article>`}).join(""):`<div class="empty-state">यहाँ अझै कुनै पोस्ट छैन। नयाँ पोस्ट सुरु गर्नुहोस्।</div>`;$$("#diaryList [data-entry-open]").forEach(card=>{const open=()=>openPostView(state.entries.find(e=>e.id===card.dataset.entryOpen));card.onclick=open;card.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open()}}})}
  $("#diarySearch").oninput=renderDiary;$("#diaryFilter").onchange=renderDiary;
  let quickMedia=[];
  async function attachQuickMedia(input){const f=input.files?.[0];if(!f)return;if(f.size>2*1024*1024){toast("प्रति मिडिया फाइल २ MB सम्म छान्नुहोस्।");input.value="";return}try{const item=await readMediaFile(f),kind=item.type.split("/")[0];quickMedia=quickMedia.filter(x=>!x.type?.startsWith(kind+"/"));if(quickMedia.reduce((n,x)=>n+(x.size||0),0)+item.size>3*1024*1024)throw new Error("पोस्टमा मिडिया जम्मा ३ MB सम्म राख्न सकिन्छ।");quickMedia.push(item);$("#quickMediaPreview").innerHTML=mediaMarkup(quickMedia)}catch(err){toast(err.message)}input.value=""}
  ["quickPhotoCamera","quickPhoto","quickVideoCamera","quickVideo","quickAudio"].forEach(id=>$("#"+id).addEventListener("change",e=>attachQuickMedia(e.target)));
  $("#quickVoice").onclick=()=>{const draft=$("#quickEntry").value,media=quickMedia.slice(),visibility=$("#quickVisibility").value;openEditor();$("#entryContent").value=draft;$("#entryTitle").value="आजको डायरी";$("#entryVisibility").value=visibility;$("#privacyHelp").textContent=privacyHelpText(visibility);pendingEntryMedia=media;updateMediaPreview();$("#quickEntry").value="";$("#quickMediaPreview").innerHTML="";quickMedia=[];toast("ड्राफ्ट र मिडिया आवाज रेकर्डरसहित तयार छ।")};
  $("#saveQuick").onclick=()=>{const content=$("#quickEntry").value.trim();if(!content&&!quickMedia.length){toast("केही लेख्नुहोस् वा फोटो/भिडियो/अडियो थप्नुहोस्।");return}const ctx=getContextSnapshot(),item={id:uid(),title:"आजको डायरी",date:nptISO(),mood:"शान्त",content,type:"diary",visibility:$("#quickVisibility").value,tags:"",media:quickMedia,created:Date.now(),updated:Date.now(),context:ctx};state.entries.push(item);try{persist()}catch(err){state.entries.pop();toast("भण्डारण भरियो। सानो मिडिया फाइल प्रयोग गर्नुहोस्।");return}quickMedia=[];$("#quickEntry").value="";$("#quickMediaPreview").innerHTML="";renderAll();toast("पोस्ट सुरक्षित भयो।")};
  function renderPoetry(){const arr=state.entries.filter(e=>e.type==="poem").sort((a,b)=>b.updated-a.updated);$("#poetryList").innerHTML=arr.length?arr.map(e=>{const ctx=formatContextLine(e.context);return `<article class="poem-card post-tap-card" data-entry-open="${e.id}" tabindex="0" role="button"><div class="entry-meta">${dateText(e.date)} · ${e.visibility==="private"?"निजी":e.visibility==="public"?"प्रकाशनका लागि":"ड्राफ्ट"}</div>${ctx?`<div class="entry-context">${esc(ctx)}</div>`:""}<h3>${esc(e.title||"शीर्षकविहीन सिर्जना")}</h3><p class="poem-preview">${esc(e.content.slice(0,280))}</p><small class="tap-hint">Letterhead · खोल्न ट्याप गर्नुहोस्</small></article>`}).join(""):`<div class="empty-state">तपाईंका कविता र लेखहरू यहाँ सङ्ग्रहित हुनेछन्।</div>`;$$("#poetryList [data-entry-open]").forEach(card=>{const open=()=>openPostView(state.entries.find(e=>e.id===card.dataset.entryOpen));card.onclick=open;card.onkeydown=ev=>{if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();open()}}})}
  function renderCalendar(){const y=selectedCalendar.getFullYear(),m=selectedCalendar.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();$("#calendarMonth").textContent=selectedCalendar.toLocaleDateString("ne-NP",{month:"long",year:"numeric"});$("#calendarAd").textContent=selectedCalendar.toLocaleDateString("en-US",{month:"long",year:"numeric"});let html="";for(let i=0;i<first;i++)html+="<button disabled></button>";for(let d=1;d<=days;d++){const iso=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`,isToday=iso===nptISO(),has=state.events.some(e=>e.date===iso);html+=`<button class="${isToday?"today":""} ${has?"has-event":""}" data-date="${iso}">${d}</button>`}$("#calendarDays").innerHTML=html;$$("[data-date]").forEach(b=>b.onclick=()=>{const date=b.dataset.date;const events=state.events.filter(e=>e.date===date);toast(events.length?events.map(e=>e.title).join(" · "):dateText(date))});$("#eventList").innerHTML=state.events.length?state.events.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<div class="entry-row"><div><div class="entry-meta">${dateText(e.date)}</div><h3>${esc(e.title)}</h3><p>${esc(e.note||"")}</p></div><button class="small-btn" data-remove-event="${e.id}">हटाउनुहोस्</button></div>`).join(""):`<div class="empty-state">आफ्ना विशेष दिनहरू यहाँ थप्नुहोस्।</div>`;$$("[data-remove-event]").forEach(b=>b.onclick=()=>{state.events=state.events.filter(e=>e.id!==b.dataset.removeEvent);persist();renderCalendar()})}
  $("#prevMonth").onclick=()=>{selectedCalendar.setMonth(selectedCalendar.getMonth()-1);renderCalendar()};$("#nextMonth").onclick=()=>{selectedCalendar.setMonth(selectedCalendar.getMonth()+1);renderCalendar()};
  $("#addEvent").onclick=()=>{$("#eventForm").reset();$("#eventDialog").showModal()};$("#eventForm").onsubmit=e=>{e.preventDefault();state.events.push({id:uid(),title:$("#eventTitle").value,date:$("#eventDate").value,note:$("#eventNote").value});persist();$("#eventDialog").close();renderCalendar();toast("विशेष दिन सुरक्षित भयो।")};
  function renderMemories(){$("#memoryList").innerHTML=state.memories.length?state.memories.slice().reverse().map(m=>`<article class="memory-card">${m.image?`<img src="${m.image}" alt="">`:""}<div class="entry-meta">${dateText(m.date)} ${m.place?"· "+esc(m.place):""}</div><h3>${esc(m.title)}</h3><p>${esc(m.text||"")}</p></article>`).join(""):`<div class="empty-state">तपाईंका तस्वीर र यात्राका सम्झनाहरू यहाँ बस्नेछन्।</div>`}
  $("#addMemory").onclick=()=>{$("#memoryForm").reset();memoryImage=null;selectedLocation=null;$("#locationStatus").textContent="";$("#memoryDialog").showModal()};
  $("#memoryPhoto").onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>2*1024*1024){toast("कृपया २ MB भन्दा सानो तस्वीर छान्नुहोस्।");e.target.value="";return}const r=new FileReader();r.onload=()=>memoryImage=r.result;r.readAsDataURL(f)};
  $("#captureLocation").onclick=()=>{if(!navigator.geolocation){toast("यो उपकरणमा स्थान सेवा उपलब्ध छैन।");return}$("#locationStatus").textContent="अनुमति पर्खँदै...";navigator.geolocation.getCurrentPosition(p=>{selectedLocation={lat:p.coords.latitude,lon:p.coords.longitude};$("#locationStatus").textContent="स्थान सुरक्षित: "+p.coords.latitude.toFixed(3)+", "+p.coords.longitude.toFixed(3)},()=>{$("#locationStatus").textContent="स्थान अनुमति प्राप्त भएन।"},{enableHighAccuracy:true,timeout:10000})};
  $("#memoryForm").onsubmit=e=>{e.preventDefault();state.memories.push({id:uid(),title:$("#memoryTitle").value,text:$("#memoryText").value,date:nptISO(),image:memoryImage,place:selectedLocation?`${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lon.toFixed(5)}`:""});persist();$("#memoryDialog").close();renderMemories();toast("सम्झना सुरक्षित भयो।")};
  function updateLetter(){const title=$("#lpTitle").value||"कविताको शीर्षक";$("#previewTitle").textContent=title;$("#previewBody").textContent=$("#lpBody").value||"तपाईंका शब्दहरू यहाँ देखिनेछन्...";$("#previewSign").textContent=$("#lpSignature").value;$("#letterPreview").style.color=$("#lpColor").value;$("#letterPreview").style.background=$("#lpPaper").value;$("#letterPreview").className="letter-preview "+$("#lpSize").value;const ctxLine=formatContextLine(getContextSnapshot());let meta=$("#letterContextMeta");if(!meta){meta=document.createElement("div");meta.id="letterContextMeta";meta.className="letter-context-meta";const preview=$("#letterPreview");if(preview)preview.insertBefore(meta,preview.firstChild);}meta.textContent=ctxLine||"";}
  ["lpTitle","lpBody","lpSignature","lpColor","lpPaper","lpSize"].forEach(id=>$("#"+id).addEventListener("input",updateLetter));
  $("#lpImage").onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>3*1024*1024){toast("तस्वीर ३ MB भन्दा सानो हुनुपर्छ।");return}const r=new FileReader();r.onload=()=>{letterImage=r.result;$("#lpArt").innerHTML=`<img src="${letterImage}" alt="Letterpad artwork">`};r.readAsDataURL(f)};
  $("#printLetter").onclick=()=>{updateLetter();document.body.classList.add("print-letter");window.print();setTimeout(()=>document.body.classList.remove("print-letter"),500)};
  $("#saveTemplate").onclick=()=>{const ctx=getContextSnapshot();state.templates.push({id:uid(),name:$("#lpTitle").value||"मेरो ढाँचा",title:$("#lpTitle").value,body:$("#lpBody").value,signature:$("#lpSignature").value,color:$("#lpColor").value,paper:$("#lpPaper").value,size:$("#lpSize").value,image:letterImage,context:ctx,created:Date.now()});persist();renderTemplates();toast("ढाँचा सुरक्षित भयो · मिति/तिथि समावेश।")};
  let historyMap=null,historyLayer=null;
  function renderLocationMap(rows){
    const el=$("#locationMap");if(!el)return;
    const points=rows.filter(x=>Number.isFinite(x.latitude)&&Number.isFinite(x.longitude));
    if(!window.L){el.innerHTML='<p class="muted small">नक्सा लोड हुन इन्टरनेट चाहिन्छ। '+points.map(p=>'<a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat='+p.latitude+'&mlon='+p.longitude+'#map=16/'+p.latitude+'/'+p.longitude+'">स्थान नक्सामा खोल्नुहोस् ↗</a>').join(" · ")+'</p>';return}
    if(!historyMap){historyMap=L.map(el).setView(points.length?[points[0].latitude,points[0].longitude]:[28.3,84.0],points.length?10:7);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(historyMap);historyLayer=L.featureGroup().addTo(historyMap)}
    historyLayer.clearLayers();
    points.forEach((p,i)=>{const title=esc(p.place||"स्थान रेकर्ड"),when=esc(p.context?.nepalTime||new Date(p.timestamp).toLocaleString("ne-NP",{timeZone:"Asia/Kathmandu",hour12:false})),date=esc(p.context?.bsDate||""),coord=p.latitude.toFixed(6)+", "+p.longitude.toFixed(6),details=p.context?contextDetailsHTML(p.context):"";
      const marker=L.marker([p.latitude,p.longitude]).addTo(historyLayer);marker.bindPopup('<b>Landmark '+(i+1)+' · '+title+'</b><br>'+when+'<br>'+date+'<br>'+coord+'<br><details><summary>सबै विवरण</summary>'+details+'</details>');
    });
    if(points.length){historyMap.fitBounds(historyLayer.getBounds().pad(.18));setTimeout(()=>historyMap.invalidateSize(),120)}
  }
  function renderLocationHistory(){
    const list=$("#locationHistoryList");if(!list)return;
    const all=(state.locationHistory||[]).filter(h=>h.source==="gps");
    const rows=all.filter(h=>Number.isFinite(h.latitude)&&Number.isFinite(h.longitude)).slice().sort((a,b)=>b.timestamp-a.timestamp);
    const count=rows.length,latest=rows[0]||null,first=rows[rows.length-1]||null;
    const stats=$("#locationStats");
    if(stats)stats.innerHTML=[
      ["कुल GPS स्थान",count],
      ["पछिल्लो रेकर्ड",latest?(latest.context?.nepalTime||"सुरक्षित"):"—"],
      ["पहिलो रेकर्ड",first?(first.context?.bsDate||first.context?.adDate||"सुरक्षित"):"—"]
    ].map(([k,v])=>'<article class="location-stat"><small>'+esc(k)+'</small><b>'+esc(v)+'</b></article>').join("");
    const latestBox=$("#locationLatest");
    if(latestBox)latestBox.innerHTML=latest?'<div class="latest-place-head"><div><small>पछिल्लो GPS स्थान</small><h2>'+esc(latest.place||"GPS स्थान")+'</h2><p>'+esc([latest.context?.bsDate,latest.context?.adDate,latest.context?.weekday,latest.context?.nepalTime].filter(Boolean).join(" · "))+'</p></div><span class="gps-live-mark">GPS</span></div><div class="latest-place-grid"><span><small>निर्देशाङ्क</small><b>'+latest.latitude.toFixed(6)+', '+latest.longitude.toFixed(6)+'</b></span><span><small>उचाइ</small><b>'+(latest.altitudeM!=null?Math.round(latest.altitudeM)+" m":"उपलब्ध भएन")+'</b></span><span><small>शुद्धता</small><b>'+(latest.accuracyM!=null?"±"+Math.round(latest.accuracyM)+" m":"उपलब्ध भएन")+'</b></span><span><small>मौसम</small><b>'+esc([latest.context?.weatherTemp,latest.context?.weatherCondition].filter(Boolean).join(" · ")||"उपलब्ध भएन")+'</b></span></div>':'<div class="empty-state">अहिलेसम्म सफल GPS रेकर्ड छैन। गृहपृष्ठको GPS बटन थिचेपछि स्थान यहाँ सुरक्षित हुनेछ।</div>';
    renderLocationMap(rows);
    list.innerHTML=rows.length?rows.map((h,i)=>{
      const stamp=h.context?.nepalTime||new Date(h.timestamp).toLocaleString("ne-NP",{timeZone:"Asia/Kathmandu",hour12:false,second:"2-digit"});
      const date=h.context?.bsDate||h.context?.adDate||"";
      const details=h.context?contextDetailsHTML(h.context):'<p class="muted">यस पुरानो रेकर्डमा विस्तृत समय-स्न्यापसट उपलब्ध छैन।</p>';
      const weather=[h.context?.weatherTemp,h.context?.weatherCondition,h.context?.humidity!=null?"आर्द्रता "+h.context.humidity+"%":"",h.context?.windKmh!=null?"हावा "+h.context.windKmh+" km/h":""].filter(Boolean).join(" · ");
      return '<article class="location-history-item"><div class="history-index">'+String(count-i).padStart(2,"0")+'</div><div class="history-record-main"><div class="history-record-top"><div><b>'+esc(h.place||"अज्ञात स्थान")+'</b><small>'+esc([stamp,date,h.context?.weekday].filter(Boolean).join(" · "))+'</small></div><span class="history-source">GPS</span></div><div class="history-record-meta"><span>⌖ '+h.latitude.toFixed(6)+', '+h.longitude.toFixed(6)+'</span><span>'+(h.altitudeM!=null?"उचाइ "+Math.round(h.altitudeM)+" m":"उचाइ उपलब्ध भएन")+'</span><span>'+(h.accuracyM!=null?"शुद्धता ±"+Math.round(h.accuracyM)+" m":"शुद्धता उपलब्ध भएन")+'</span></div>'+(weather?'<p class="history-weather">'+esc(weather)+'</p>':"")+'<details class="history-context-details"><summary>समय, पञ्चाङ्ग र मौसमको पूरा विवरण</summary>'+details+'</details></div></article>';
    }).join(""):'<p class="empty-state">GPS बाट स्थान सुरक्षित भएपछि यहाँ तपाईंका पाइलाहरू क्रमबद्ध रूपमा देखिनेछन्।</p>';
  }
  function renderTemplates(){$("#templateList").innerHTML=state.templates.length?state.templates.map(t=>`<button class="template-chip" data-template="${t.id}">${esc(t.name)}</button>`).join(""):`<span class="muted tiny">अहिलेसम्म कुनै ढाँचा सुरक्षित छैन।</span>`;$$("[data-template]").forEach(b=>b.onclick=()=>{const t=state.templates.find(x=>x.id===b.dataset.template);$("#lpTitle").value=t.title;$("#lpBody").value=t.body;$("#lpSignature").value=t.signature;$("#lpColor").value=t.color;$("#lpPaper").value=t.paper;$("#lpSize").value=t.size;letterImage=t.image;$("#lpArt").innerHTML=letterImage?`<img src="${letterImage}" alt="">`:"";updateLetter()})}
  if(!state.settings.brand||state.settings.brand.toLowerCase()==="kabijwe")state.settings.brand="Mero diary";if(!state.settings.signature)state.settings.signature="~ बिक्रमादित्य";$("#settingBrand").value=state.settings.brand;$("#settingSignature").value=state.settings.signature;$("#settingAccent").value="#e21e1e";$("#settingLightBg").value="#ffffff";$("#settingLightCard").value="#ffffff";$("#settingDarkBg").value="#000000";$("#settingDarkCard").value="#000000";$("#settingTheme").value=state.settings.theme||"light";$("#settingFontScale").value=state.settings.fontScale||"normal";document.documentElement.dataset.fontScale=state.settings.fontScale||"normal";
  function syncBrand(){ const brand=state.settings.brand||"Mero diary";const signature=state.settings.signature||"~ बिक्रमादित्य";$("#brandName").textContent=brand;$("#brandSignature").textContent=signature;const identity=signature.replace(/^[~\s]+/,"").trim()||brand.trim();const initial=/^[\u0915-\u0939][\u093c\u093e-\u094c\u094d]*/u.exec(identity)?.[0]||[...identity][0]||"ब";$("#brandMark").textContent=initial;const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#080b10"/><text x="64" y="91" font-size="82" font-weight="700" text-anchor="middle" fill="#ffffff" font-family="Noto Sans Devanagari, sans-serif">${initial}</text></svg>`;const favicon=document.querySelector("link[rel=icon]");if(favicon)favicon.href="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg); }
  function applyPalette(){const root=document.documentElement.style;root.setProperty("--user-light-bg",$("#settingLightBg").value);root.setProperty("--user-light-card",$("#settingLightCard").value);root.setProperty("--user-dark-bg",$("#settingDarkBg").value);root.setProperty("--user-dark-card",$("#settingDarkCard").value);root.setProperty("--accent",$("#settingAccent").value);state.settings.lightBg=$("#settingLightBg").value;state.settings.lightCard=$("#settingLightCard").value;state.settings.darkBg=$("#settingDarkBg").value;state.settings.darkCard=$("#settingDarkCard").value;state.settings.accent=$("#settingAccent").value;syncBrand();persist();}
  $("#saveSettings").onclick=()=>{state.settings.brand=$("#settingBrand").value.trim()||"Mero diary";state.settings.signature=$("#settingSignature").value.trim()||"~ बिक्रमादित्य";syncBrand();persist();toast("पहिचानका सेटिङ्स सुरक्षित भए।")};
  function applyTheme(){const t=$("#settingTheme").value;document.body.classList.toggle("dark",t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches));state.settings.theme=t;applyPalette();persist();toast("रूप रङ लागू भए।")}
  applyPalette();syncBrand();
  $("#applyFontScale").onclick=()=>{const size=$("#settingFontScale").value;state.settings.fontScale=size;document.documentElement.dataset.fontScale=size;persist();toast("अक्षरको आकार सुरक्षित भयो।")};
  $("#applyTheme").onclick=applyTheme;$("#themeToggle").onclick=()=>{document.body.classList.toggle("dark");$("#settingTheme").value=document.body.classList.contains("dark")?"dark":"light";state.settings.theme=$("#settingTheme").value;persist()};
  if(state.settings.theme==="dark"||(state.settings.theme==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))document.body.classList.add("dark");applyPalette();syncBrand();
  $("#exportData").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="kabijwe-backup.json";a.click();URL.revokeObjectURL(url);toast("डाटा Export भयो।")};
  $("#importData").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d||!Array.isArray(d.entries))throw Error();if(!confirm("हालको स्थानीय डाटा बदल्ने?"))return;Object.assign(state,d);persist();renderAll();toast("डाटा Import भयो।")}catch{toast("यो Backup फाइल मान्य छैन।")}};r.readAsText(f)};
  $("#clearData").onclick=()=>{if(confirm("सबै स्थानीय डायरी, सम्झना र ढाँचा स्थायी रूपमा मेटाउने?")){localStorage.removeItem(KEY);location.reload()}};
  function renderAll(){renderDiary();renderPoetry();renderCalendar();renderMemories();renderTemplates();renderLocationHistory()}

  // Local-first reminders. They live inside the main state object and are included in JSON backups.
  let reminderAlertTimer = null;
  function renderReminders(){
    const list=$("#reminderList"), alertBox=$("#reminderAlert");
    if(!list||!alertBox)return;
    const pending=(state.reminders||[]).filter(r=>!r.dismissed).sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt));
    list.innerHTML=pending.length?pending.map(r=>{
      const due=new Date(r.dueAt), overdue=due.getTime()<=Date.now();
      return '<article class="reminder-item'+(overdue?' is-due':'')+'" data-reminder-id="'+esc(r.id)+'"><div><b>'+esc(r.title)+'</b><span>'+esc(due.toLocaleString("ne-NP",{dateStyle:"medium",timeStyle:"short"}))+'</span>'+(r.fired?'<small>सूचना पठाइएको</small>':'')+'</div><button type="button" class="small-btn reminder-dismiss" data-reminder-dismiss="'+esc(r.id)+'">हटाउनुहोस्</button></article>';
    }).join(""):'<p class="muted small">अहिलेसम्म कुनै रिमाइन्डर छैन।</p>';
    const dueNow=(state.reminders||[]).filter(r=>r.fired&&!r.dismissed&&r.dueAt&&new Date(r.dueAt).getTime()<=Date.now());
    if(dueNow.length){
      alertBox.hidden=false;
      alertBox.innerHTML='<b>सम्झनुपर्ने कुरा</b>'+dueNow.map(r=>'<p>'+esc(r.title)+'</p>').join('')+'<button type="button" class="reminder-alert-close" id="dismissDueReminders">ठीक छ</button>';
    }else{alertBox.hidden=true;alertBox.textContent="";}
  }
  function notifyReminder(reminder){
    const title="Mero diary · रिमाइन्डर";
    const options={body:reminder.title,tag:"kabijwe-reminder-"+reminder.id,renotify:false,data:{reminderId:reminder.id},icon:"./icons/icon.svg",badge:"./icons/icon.svg"};
    if(navigator.serviceWorker){
      navigator.serviceWorker.ready.then(reg=>{
        if(reg.active)reg.active.postMessage({type:"SHOW_REMINDER_NOTIFICATION",title,options});
        else if(reg.showNotification)reg.showNotification(title,options);
      }).catch(()=>{});
    }
  }
  function checkDueReminders(){
    const now=Date.now();let changed=false;
    (state.reminders||[]).forEach(r=>{
      if(!r.dismissed&&!r.fired&&Number.isFinite(new Date(r.dueAt).getTime())&&new Date(r.dueAt).getTime()<=now){
        r.fired=true;r.firedAt=new Date(now).toISOString();changed=true;notifyReminder(r);
      }
    });
    if(changed){persist();renderReminders();}
  }
  $("#reminderForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    const title=$("#reminderTitle").value.trim(), dueAt=$("#reminderDueAt").value;
    if(!title||!dueAt){toast("रिमाइन्डरको विवरण र समय भर्नुहोस्।");return;}
    const due=new Date(dueAt);
    if(!Number.isFinite(due.getTime())){toast("मिति र समय मान्य छैन।");return;}
    state.reminders.push({id:uid(),title,dueAt:due.toISOString(),createdAt:new Date().toISOString(),fired:false,dismissed:false});
    persist();e.target.reset();renderReminders();checkDueReminders();toast("रिमाइन्डर सुरक्षित भयो।");
  });
  $("#enableReminderNotifications")?.addEventListener("click",async()=>{
    if(!("Notification" in window)){toast("यो browser मा notification उपलब्ध छैन।");return;}
    try{
      const permission=await Notification.requestPermission();
      toast(permission==="granted"?"सूचना अनुमति सक्रिय भयो।":permission==="denied"?"सूचना अनुमति अस्वीकार भयो।":"सूचना अनुमति दिइएन।");
    }catch{toast("सूचना अनुमति लिन सकिएन।");}
  });
  $("#reminderList")?.addEventListener("click",e=>{
    const btn=e.target.closest("[data-reminder-dismiss]");if(!btn)return;
    const id=btn.dataset.reminderDismiss;
    state.reminders=state.reminders.filter(r=>r.id!==id);persist();renderReminders();
  });
  $("#reminderAlert")?.addEventListener("click",e=>{
    if(e.target.id!=="dismissDueReminders")return;
    state.reminders.forEach(r=>{if(r.fired)r.dismissed=true;});persist();renderReminders();
  });
  renderReminders();
  checkDueReminders();
  window.setInterval(checkDueReminders,15000);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkDueReminders();});

  updateLetter();renderAll();
  if("serviceWorker" in navigator && location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();