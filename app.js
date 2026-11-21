(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const KEY = "kabijwe.v1";
  const today = new Date();
  const state = load();
  let selectedCalendar = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedLocation = null, memoryImage = null, letterImage = null;
  let currentContext = {adDate:"",bsDate:"",weekday:"",tithi:"",paksha:"",nakshatra:"",yoga:"",karana:"",lunarMonth:"",weatherTemp:"",weatherCondition:"",place:"",sunrise:"",sunset:"",season:"",capturedAt:0};
  function getContextSnapshot(){return {adDate:$("#timeAdDate")?.textContent||currentContext.adDate||"",bsDate:$("#timeBsDate")?.textContent||currentContext.bsDate||"",weekday:$("#timeWeekday")?.textContent||currentContext.weekday||"",tithi:$("#pTithi")?.textContent||currentContext.tithi||"",paksha:$("#pPaksha")?.textContent||currentContext.paksha||"",nakshatra:[$("#pNakshatra")?.textContent,$("#pNakshatraPada")?.textContent].filter(x=>x&&x!=="—").join(" · ")||currentContext.nakshatra||"",yoga:$("#pYoga")?.textContent||currentContext.yoga||"",karana:$("#pKarana")?.textContent||currentContext.karana||"",lunarMonth:$("#pLunarMonth")?.textContent||currentContext.lunarMonth||"",weatherTemp:$("#weatherTemp")?.textContent||currentContext.weatherTemp||"",weatherCondition:$("#weatherCondition")?.textContent||currentContext.weatherCondition||"",place:$("#placeName")?.textContent||currentContext.place||"",sunrise:$("#sunriseTime")?.textContent||currentContext.sunrise||"",sunset:$("#sunsetTime")?.textContent||currentContext.sunset||"",season:$("#seasonName")?.textContent||currentContext.season||"",capturedAt:Date.now()};}
  function updateCurrentContextFromUI(){currentContext=getContextSnapshot();}
  function formatContextLine(ctx){if(!ctx)return"";const parts=[];if(ctx.bsDate&&!/लोड|उपलब्ध छैन/.test(ctx.bsDate))parts.push(ctx.bsDate);if(ctx.tithi&&ctx.tithi!=="—"&&!/गणना/.test(ctx.tithi))parts.push(ctx.tithi);if(ctx.place&&!/अनुमति|लोड/.test(ctx.place))parts.push(ctx.place.split("·")[0].trim());if(ctx.weatherTemp&&ctx.weatherTemp!=="--°")parts.push(ctx.weatherTemp+(ctx.weatherCondition&&!/स्थान/.test(ctx.weatherCondition)?" · "+ctx.weatherCondition:""));return parts.filter(Boolean).join(" · ");}

  function load(){try{return JSON.parse(localStorage.getItem(KEY)) || {entries:[],events:[],memories:[],templates:[],settings:{}}}catch{return {entries:[],events:[],memories:[],templates:[],settings:{}}}}
  function persist(){localStorage.setItem(KEY,JSON.stringify(state));}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
  function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function dateText(d){return new Date(d+"T12:00:00").toLocaleDateString("ne-NP",{year:"numeric",month:"long",day:"numeric"})}
  function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}
  function showPage(name){$$(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+name));$$("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===name));$("#sidebar").classList.remove("open");$("#main").focus();if(name==="calendar")renderCalendar();if(name==="diary")renderDiary();if(name==="poetry")renderPoetry();if(name==="memories")renderMemories();if(name==="letterpad")renderTemplates()}
  $$("[data-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
  $$("[data-goto]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.goto)));
  $("#menuToggle").addEventListener("click",()=>{const s=$("#sidebar");s.style.display=s.style.display==="flex"?"none":"flex";s.style.position="absolute";s.style.zIndex=40;s.style.top="60px";s.style.right="8px";s.style.width="230px";s.style.boxShadow="0 12px 35px #0002";});
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

  /* ---------- Location (GPS only on click; manual always available) ---------- */
  const DEFAULT_LOC=LOCATIONS[0];
  let loc={mode:"default",id:DEFAULT_LOC.id,name:DEFAULT_LOC.name,lat:DEFAULT_LOC.lat,lon:DEFAULT_LOC.lon};
  (function restoreLocation(){
    const saved=lsGet(LS_LOC),hit=saved&&LOCATIONS.find(x=>x.id===saved.id);
    if(hit)loc={mode:"manual",id:hit.id,name:hit.name,lat:hit.lat,lon:hit.lon};
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
    if(!force&&key===bsKey&&bs&&bs.source!=="estimate")return;
    bsKey=key;
    // 1) instant answer from a cached month (so offline works after one online visit)
    const cached=readBsCache(p.y,p.m);
    if(cached&&applyBsFromDays(cached,key,"cache")){bsFailed=false;renderDate();}
    else {bs=null;renderDate();}
    // 2) live validated fetch (refreshes cache; also upgrades "cache" → "trisambat")
    try{
      const days=await fetchBsMonth(p.y,p.m);
      if(seq!==bsSeq)return;
      if(!applyBsFromDays(days,key,"trisambat"))throw Error("date "+key+" missing in response");
      // sanity check against the independent astronomical estimate: must be within ±2 days
      const est=PX.bsEstimate(now,12);
      if(est&&est.month===bs.month&&Math.abs(est.day-bs.day)>2)console.warn("BS cross-check differs",est,bs);
      bsFailed=false;
      if(p.d>=24){const n=new Date(Date.UTC(p.y,p.m,1));fetchBsMonth(n.getUTCFullYear(),n.getUTCMonth()+1).catch(()=>{})}
    }catch(e){
      if(seq!==bsSeq)return;
      console.warn("Bikram Sambat date:",e);
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
    setText("clock",`${c.text} ${c.word}`);
    setText("timeWeekday",wd);
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
    const now=Date.now(),retry=$("#panchangRetry");
    if(!pan){
      setText("panchangStatus","गणना असफल");
      setText("panchangFoot","पञ्चाङ्ग गणना गर्न सकिएन। फेरि प्रयास गर्नुहोस्।");
      retry.hidden=false;return;
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
    let bsNote="";
    if(bs&&bs.source==="estimate")bsNote=" वि.सं. मिति सेवा नपाइएकाले अनुमानित हो (±१ दिन फरक पर्न सक्छ)।";
    else if(bs&&bs.source==="cache")bsNote=" वि.सं. मिति सुरक्षित प्रतिबाट देखाइएको छ।";
    else if(!bs&&bsFailed)bsNote=" वि.सं. मिति उपलब्ध भएन।";
    $("#panchangFoot").innerHTML=`पञ्चाङ्ग: Kabijwe को आफ्नै खगोलीय गणना (Meeus सूत्र, लाहिरी अयनांश), अफलाइन चल्छ · स्थान: ${esc(loc.name)} — ${esc(modeLabel())}। वि.सं. मिति: <a href="https://trisambat.com/developers?lang=ne" target="_blank" rel="noopener">Trisambat</a> (beta)।${bsNote} यो आधिकारिक पात्रो होइन।`;
    retry.hidden=!(bsFailed);
    updateCurrentContextFromUI();
  }
  function renderGhadiPala(){
    const el=$("#pGhadiPala");if(!el)return;
    let g=null;
    try{g=PX.ghadiPala(Date.now(),loc.lat,loc.lon)}catch{}
    if(!g){el.textContent="—";setText("pGhadiNote","सूर्योदय गणना उपलब्ध छैन");return}
    el.textContent=`${nepaliNumber(g.ghadi)} घडी · ${nepaliNumber(g.pala)} पला`;
    setText("pGhadiNote",`${g.which==="yesterday"?"हिजोको":"आजको"} सूर्योदय ${fmtClock(g.sunriseMs)} देखि · १ घडी = २४ मिनेट, १ पला = २४ सेकेन्ड`);
  }

  /* ---------- Sunrise → sunset arc (one smooth curve) ---------- */
  function drawSun(){
    const marker=$("#sunMarker");if(!marker)return;
    if(!solar||solar.polar){setText("sunriseTime","--:--");setText("sunsetTime","--:--");setText("sunStatus",solar&&solar.polar?(solar.polar==="day"?"सूर्य अस्त हुँदैन":"सूर्य उदाउँदैन"):"गणना हुँदैछ…");marker.style.display="none";return}
    setText("sunriseTime",fmtClock(solar.sunriseMs));setText("sunsetTime",fmtClock(solar.sunsetMs));
    marker.style.display="";
    const now=Date.now(),a=solar.sunriseMs,b=solar.sunsetMs,t=Math.max(0,Math.min(1,(now-a)/(b-a)));
    // Same path as the SVG: M12 58 C70 58,90 14,160 14 C230 14,250 58,308 58
    const P=[[12,58],[70,58],[90,14],[160,14],[230,14],[250,58],[308,58]],bez=(q,u)=>{const v=1-u;return [0,1].map(i=>v*v*v*q[0][i]+3*v*v*u*q[1][i]+3*v*u*u*q[2][i]+u*u*u*q[3][i])};
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
    setText("weatherExtra",[Number.isFinite(w.hum)?`आर्द्रता ${nepaliNumber(Math.round(w.hum))}%`:"",Number.isFinite(w.wind)?`हावा ${nepaliNumber(Math.round(w.wind))} km/h`:""].filter(Boolean).join(" · "));
    const when=w.time?`${nepaliNumber(w.time.slice(11,16))}`:fmtClock(w.fetched);
    setText("weatherUpdated",stale?`⚠ पुरानो मौसम · ${when} को (इन्टरनेट/सेवा समस्या)`:`अद्यावधिक ${when}`);
  }
  async function loadWeather(){
    const seq=++wxSeq,{lat,lon}=loc;
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){setText("weatherCondition","स्थानको निर्देशाङ्क मान्य छैन");return}
    setText("weatherCondition","मौसम लोड हुँदैछ…");
    try{
      const d=await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=Asia%2FKathmandu`,{timeout:10000,retries:1});
      if(seq!==wxSeq)return;
      const c=d&&d.current;
      if(!c||!Number.isFinite(c.temperature_2m))throw Error("weather fields missing");
      const w={temp:c.temperature_2m,hum:c.relative_humidity_2m,wind:c.wind_speed_10m,code:c.weather_code,time:c.time,fetched:Date.now(),lat,lon};
      lsSet(LS_WX,w);showWeather(w,false);
    }catch(e){
      if(seq!==wxSeq)return;
      console.warn("Weather:",e);
      const old=lsGet(LS_WX);
      if(old&&Math.abs(old.lat-lat)<.05&&Math.abs(old.lon-lon)<.05&&Date.now()-old.fetched<6*3600e3)showWeather(old,true);
      else{setText("weatherTemp","--°");setText("weatherCondition",navigator.onLine===false?"इन्टरनेट छैन — मौसम उपलब्ध छैन":"मौसम सेवा अहिले उपलब्ध छैन");setText("weatherExtra","");setText("weatherUpdated","")}
    }
    updateCurrentContextFromUI();
  }
  async function reverseName(lat,lon,seq){
    try{
      const g=await fetchJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=ne,en`,{timeout:8000,retries:0});
      const a=g.address||{},name=[a.suburb||a.village||a.town||a.city||a.municipality||a.county,a.state].filter(Boolean).join(", ");
      if(seq===locSeq&&name){loc.name=name;renderLocation();refreshPanchang()}
    }catch{}
  }

  /* ---------- Applying a location ---------- */
  let locSeq=0;
  function renderLocation(){
    setText("placeName",loc.mode==="gps"&&loc.name==="GPS स्थान"?`GPS स्थान (${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)})`:loc.name);
    setText("locationMode",modeLabel());
    const badge=$("#locationMode");if(badge)badge.dataset.mode=loc.mode;
  }
  function applyLocation(next,{persist=false}={}){
    loc=next;locSeq++;
    if(persist&&loc.mode==="manual")lsSet(LS_LOC,{id:loc.id});
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
    if(!navigator.geolocation){toast("यो ब्राउजरमा स्थान सेवा छैन। तलबाट स्थान छान्नुहोस्।");return}
    btn.disabled=true;label.textContent="स्थान पर्खँदै…";
    navigator.geolocation.getCurrentPosition(p=>{
      btn.disabled=false;label.textContent="GPS स्थान पुनः लिनुहोस्";
      applyLocation({mode:"gps",id:"",name:"GPS स्थान",lat:p.coords.latitude,lon:p.coords.longitude});
    },err=>{
      btn.disabled=false;label.textContent="मेरो GPS स्थान प्रयोग गर्नुहोस्";
      toast(err.code===1?"GPS अनुमति दिइएन। हालको स्थान नै प्रयोग भइरहेको छ — चाहे तलबाट हातले स्थान छान्नुहोस्।":"GPS स्थान प्राप्त भएन। तलबाट हातले स्थान छान्न सक्नुहुन्छ।");
    },{enableHighAccuracy:true,timeout:15000,maximumAge:300000});
  });
  $("#panchangRetry").addEventListener("click",()=>{setText("panchangStatus","पुनः प्रयास हुँदैछ…");loadBsDate(true);loadWeather()});
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
  refreshPanchang();loadBsDate();loadWeather();tick();
  setInterval(tick,1000);
  setInterval(()=>loadWeather(),20*60*1000);
  function previewEntries(){const list=state.entries.slice().sort((a,b)=>b.updated-a.updated).slice(0,3);$("#recentEntries").innerHTML=list.length?list.map(e=>{const ctx=formatContextLine(e.context);return `<article class="entry-card"><div class="entry-meta"><span>${dateText(e.date)}</span><span>${e.visibility==="private"?"🔒 निजी":e.visibility==="public"?"◉ प्रकाशनका लागि":"ड्राफ्ट"}</span></div>${ctx?`<div class="entry-context">${esc(ctx)}</div>`:""}<h3>${esc(e.title||"शीर्षकविहीन पाना")}</h3><p>${esc(e.content.slice(0,130))}</p></article>`}).join(""):`<div class="empty-state">तपाईंको पहिलो डायरी यहाँ देखिनेछ।</div>`}
  function openEditor(entry=null){$("#entryForm").reset();$("#entryId").value=entry?.id||"";$("#entryTitle").value=entry?.title||"";$("#entryDate").value=entry?.date||nptISO();$("#entryMood").value=entry?.mood||"शान्त";$("#entryContent").value=entry?.content||"";$("#entryType").value=entry?.type||"diary";$("#entryVisibility").value=entry?.visibility||"private";$("#entryTags").value=entry?.tags||"";$("#editorHeading").textContent=entry?"पाना सम्पादन":"नयाँ पाना";$("#deleteEntry").style.visibility=entry?"visible":"hidden";$("#editorDialog").showModal()}
  $("#newDiary").onclick=()=>openEditor();$("#newPoem").onclick=()=>{openEditor();$("#entryType").value="poem"};
  $("#entryForm").addEventListener("submit",e=>{e.preventDefault();const id=$("#entryId").value;const old=state.entries.find(x=>x.id===id);const ctx=getContextSnapshot();const item={id:id||uid(),title:$("#entryTitle").value.trim(),date:$("#entryDate").value||nptISO(),mood:$("#entryMood").value,content:$("#entryContent").value.trim(),type:$("#entryType").value,visibility:$("#entryVisibility").value,tags:$("#entryTags").value,created:old?.created||Date.now(),updated:Date.now(),context:old?.context||ctx};if(!item.content){toast("कृपया केही शब्द लेख्नुहोस्।");return}if(old){Object.assign(old,item);if(!old.context)old.context=ctx;}else state.entries.push(item);persist();$("#editorDialog").close();renderAll();toast("तपाईंको पाना सुरक्षित भयो · मिति/तिथि/मौसम रेकर्ड।")});
  $("#deleteEntry").onclick=()=>{const id=$("#entryId").value;if(id&&confirm("यो पाना मेटाउने?")){state.entries=state.entries.filter(e=>e.id!==id);persist();$("#editorDialog").close();renderAll();toast("पाना मेटाइयो।")}};
  function renderDiary(){const q=$("#diarySearch").value.toLowerCase(),f=$("#diaryFilter").value;let arr=state.entries.filter(e=>(f==="all"||e.visibility===f)&&[e.title,e.content,e.tags,e.context?.tithi,e.context?.bsDate,e.context?.place].join(" ").toLowerCase().includes(q)).sort((a,b)=>b.updated-a.updated);$("#diaryList").innerHTML=arr.length?arr.map(e=>{const ctxLine=formatContextLine(e.context);return `<div class="entry-row"><div><div class="entry-meta">${dateText(e.date)} · ${esc(e.mood)} · ${e.visibility==="private"?"🔒 निजी":e.visibility==="public"?"प्रकाशनका लागि":"ड्राफ्ट"}</div>${ctxLine?`<div class="entry-context">${esc(ctxLine)}</div>`:""}<h3>${esc(e.title||"शीर्षकविहीन पाना")}</h3><p>${esc(e.content.slice(0,150))}</p></div><div class="row-actions"><button class="small-btn" data-edit="${e.id}">खोल्नुहोस्</button></div></div>`}).join(""):`<div class="empty-state">यहाँ अझै कुनै पाना छैन। नयाँ पाना सुरु गर्नुहोस्।</div>`;$$("[data-edit]").forEach(b=>b.onclick=()=>openEditor(state.entries.find(e=>e.id===b.dataset.edit)))}
  $("#diarySearch").oninput=renderDiary;$("#diaryFilter").onchange=renderDiary;
  $("#saveQuick").onclick=()=>{const content=$("#quickEntry").value.trim();if(!content){toast("पहिले आफ्ना शब्दहरू लेख्नुहोस्।");return}const ctx=getContextSnapshot();state.entries.push({id:uid(),title:"आजको डायरी",date:nptISO(),mood:"शान्त",content,type:"diary",visibility:"private",tags:"",created:Date.now(),updated:Date.now(),context:ctx});persist();$("#quickEntry").value="";renderAll();toast("आजको डायरी सुरक्षित भयो · मिति/तिथि रेकर्ड।")};
  function renderPoetry(){const arr=state.entries.filter(e=>e.type==="poem");$("#poetryList").innerHTML=arr.length?arr.map(e=>{const ctx=formatContextLine(e.context);return `<article class="poem-card"><div class="entry-meta">${dateText(e.date)} · ${e.visibility==="private"?"निजी":e.visibility==="public"?"प्रकाशनका लागि":"ड्राफ्ट"}</div>${ctx?`<div class="entry-context">${esc(ctx)}</div>`:""}<h3>${esc(e.title||"शीर्षकविहीन सिर्जना")}</h3><p class="poem-preview">${esc(e.content.slice(0,280))}</p><button class="small-btn" data-edit="${e.id}">सम्पादन</button></article>`}).join(""):`<div class="empty-state">तपाईंका कविता र लेखहरू यहाँ सङ्ग्रहित हुनेछन्।</div>`;$$("[data-edit]").forEach(b=>b.onclick=()=>openEditor(state.entries.find(e=>e.id===b.dataset.edit)))}
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
  function renderTemplates(){$("#templateList").innerHTML=state.templates.length?state.templates.map(t=>`<button class="template-chip" data-template="${t.id}">${esc(t.name)}</button>`).join(""):`<span class="muted tiny">अहिलेसम्म कुनै ढाँचा सुरक्षित छैन।</span>`;$$("[data-template]").forEach(b=>b.onclick=()=>{const t=state.templates.find(x=>x.id===b.dataset.template);$("#lpTitle").value=t.title;$("#lpBody").value=t.body;$("#lpSignature").value=t.signature;$("#lpColor").value=t.color;$("#lpPaper").value=t.paper;$("#lpSize").value=t.size;letterImage=t.image;$("#lpArt").innerHTML=letterImage?`<img src="${letterImage}" alt="">`:"";updateLetter()})}
  $("#settingBrand").value=state.settings.brand||"kabijwe";$("#settingSignature").value=state.settings.signature||"~बिक्रमादित्य";$("#settingAccent").value=state.settings.accent||"#153b66";$("#settingTheme").value=state.settings.theme||"light";
  $("#saveSettings").onclick=()=>{state.settings.brand=$("#settingBrand").value;state.settings.signature=$("#settingSignature").value;persist();toast("पहिचानका सेटिङ्स सुरक्षित भए।")};
  function applyTheme(){const t=$("#settingTheme").value;document.body.classList.toggle("dark",t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches));document.documentElement.style.setProperty("--accent",$("#settingAccent").value);persist();state.settings.theme=t;state.settings.accent=$("#settingAccent").value;persist()}
  $("#applyTheme").onclick=applyTheme;$("#themeToggle").onclick=()=>{document.body.classList.toggle("dark");$("#settingTheme").value=document.body.classList.contains("dark")?"dark":"light";state.settings.theme=$("#settingTheme").value;persist()};
  if(state.settings.theme==="dark")document.body.classList.add("dark");
  $("#exportData").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="kabijwe-backup.json";a.click();URL.revokeObjectURL(url);toast("डाटा Export भयो।")};
  $("#importData").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d||!Array.isArray(d.entries))throw Error();if(!confirm("हालको स्थानीय डाटा बदल्ने?"))return;Object.assign(state,d);persist();renderAll();toast("डाटा Import भयो।")}catch{toast("यो Backup फाइल मान्य छैन।")}};r.readAsText(f)};
  $("#clearData").onclick=()=>{if(confirm("सबै स्थानीय डायरी, सम्झना र ढाँचा स्थायी रूपमा मेटाउने?")){localStorage.removeItem(KEY);location.reload()}};
  function renderAll(){previewEntries();renderDiary();renderPoetry();renderCalendar();renderMemories();renderTemplates()}
  updateLetter();renderAll();
  if("serviceWorker" in navigator && location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();