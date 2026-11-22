/* Shared local-network sync. localStorage is retained as a recoverable working copy. */
(() => {
  const API="/api/state", BASELINE="kabijwe.synced.v1";
  let revision=0,connected=false,initialized=false,conflict=false,timer=null,queue=Promise.resolve();
  let lastStatus="checking",lastMessage="LAN server जाँच हुँदैछ…";
  function announce(status,message){
    lastStatus=status;lastMessage=message;
    window.dispatchEvent(new CustomEvent("kabijwe:sync",{detail:{status,message,revision}}));
  }
  const encode=value=>JSON.stringify(value);
  const decode=value=>{try{return JSON.parse(value)}catch{return null}};
  function hasLocalData(s){
    return !!(s&&((s.entries||[]).length||(s.events||[]).length||(s.memories||[]).length||
      (s.templates||[]).length||(s.locationHistory||[]).length||(s.reminders||[]).length||
      (s.settings&&Object.keys(s.settings).length)));
  }
  function setBaseline(state){try{localStorage.setItem(BASELINE,encode(state))}catch{}}
  async function put(state){
    if(!connected||conflict)return false;
    const snapshot=JSON.parse(encode(state));
    const response=await fetch(API,{method:"PUT",cache:"no-store",headers:{"Content-Type":"application/json"},body:encode({revision,state:snapshot})});
    if(response.status===409){
      const detail=await response.json().catch(()=>({}));
      conflict=true;announce("conflict","अर्को उपकरणमा नयाँ परिवर्तन सुरक्षित भएको छ। यो उपकरणको local copy नहटाउनुहोस्। पहिले Export गर्नुहोस्, त्यसपछि Reload गरेर दुवै copy मिलाउनुहोस्। (Server revision "+(detail.revision??"?")+")");
      return false;
    }
    if(!response.ok)throw new Error("HTTP "+response.status);
    const result=await response.json();revision=result.revision;initialized=true;setBaseline(snapshot);
    announce("online","साझा database मा सुरक्षित भयो · revision "+revision);return true;
  }
  async function load(key,localLoader){
    const local=localLoader();
    try{
      const response=await fetch(API,{cache:"no-store",credentials:"same-origin"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const remote=await response.json();
      connected=true;initialized=!!remote.initialized;revision=remote.revision||0;
      if(!initialized){
        if(hasLocalData(local)){
          announce("migrating","यस browser को पुरानो data shared database मा सारिँदैछ…");
          await put(local);
        }else announce("empty","साझा database खाली छ। Laptop बाट पुरानो backup Import गर्नुहोस्।");
        return local;
      }
      const remoteState=remote.state;
      if(!remoteState||typeof remoteState!=="object")throw new Error("Invalid server state");
      const baseline=decode(localStorage.getItem(BASELINE));
      if(!baseline){
        if(hasLocalData(local)){
          conflict=true;announce("conflict","यो browser मा server सँग नमिलेको पुरानो local data छ। यसलाई नहटाउनुहोस्; पहिले Export गर्नुहोस्।");
          return local;
        }
        localStorage.setItem(key,encode(remoteState));setBaseline(remoteState);
        announce("online","साझा database जोडियो · revision "+revision);return remoteState;
      }
      const localChanged=encode(local)!==encode(baseline);
      const remoteChanged=encode(remoteState)!==encode(baseline);
      if(localChanged&&remoteChanged){
        conflict=true;announce("conflict","यो device र server दुवैमा फरक परिवर्तन छन्। कुनै data overwrite गरिएको छैन। पहिले local Export गर्नुहोस्।");
        return local;
      }
      if(localChanged&&!remoteChanged){
        announce("migrating","यस device का बाँकी local परिवर्तन server मा पठाइँदैछन्…");
        await put(local);return local;
      }
      localStorage.setItem(key,encode(remoteState));setBaseline(remoteState);
      announce("online","साझा database जोडियो · revision "+revision);return remoteState;
    }catch(error){
      connected=false;announce("offline","Server जोडिएन ("+error.message+") · हाल local browser मा मात्र सुरक्षित हुन्छ।");
      return local;
    }
  }
  function save(state){
    if(!connected||conflict)return;
    clearTimeout(timer);const snapshot=JSON.parse(encode(state));
    timer=setTimeout(()=>{
      queue=queue.then(()=>put(snapshot)).catch(error=>{
        connected=false;announce("offline","Sync असफल ("+error.message+") · local copy सुरक्षित छ; server जोडिएपछि Reload गर्नुहोस्।");
      });
    },450);
  }
  window.KabijweSync={load,save,getStatus:()=>({connected,initialized,revision,conflict,status:lastStatus,message:lastMessage})};
})();
