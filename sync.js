/* Shared local-network sync. Local browser storage remains a recoverable cache. */
(() => {
  const API="/api/state";
  let revision=0, connected=false, initialized=false, conflict=false, timer=null, queue=Promise.resolve(), lastStatus="checking", lastMessage="LAN server जाँच हुँदैछ…";
  const listeners=[];
  function announce(status,message){
    lastStatus=status; lastMessage=message;
    window.dispatchEvent(new CustomEvent("kabijwe:sync",{detail:{status,message,revision}}));
  }
  function hasLocalData(s){
    return !!(s && ((s.entries||[]).length || (s.events||[]).length || (s.memories||[]).length ||
      (s.templates||[]).length || (s.locationHistory||[]).length || (s.reminders||[]).length ||
      (s.settings && Object.keys(s.settings).length)));
  }
  async function put(state){
    if(!connected || conflict) return false;
    const snapshot=JSON.parse(JSON.stringify(state));
    const response=await fetch(API,{method:"PUT",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision,state:snapshot})});
    if(response.status===409){
      const detail=await response.json().catch(()=>({}));
      conflict=true; announce("conflict","अर्को उपकरणमा नयाँ परिवर्तन सुरक्षित भएको छ। यो उपकरणमा थप सम्पादन गर्नुअघि पृष्ठ Reload गर्नुहोस्। (Server revision "+(detail.revision??"?")+")");
      return false;
    }
    if(!response.ok) throw new Error("HTTP "+response.status);
    const result=await response.json(); revision=result.revision; initialized=true;
    announce("online","साझा database मा सुरक्षित भयो · revision "+revision);
    return true;
  }
  async function load(key,localLoader){
    const local=localLoader();
    try{
      const response=await fetch(API,{cache:"no-store",credentials:"same-origin"});
      if(!response.ok) throw new Error("HTTP "+response.status);
      const remote=await response.json();
      connected=true; initialized=!!remote.initialized; revision=remote.revision||0;
      if(initialized && remote.state && typeof remote.state==="object"){
        localStorage.setItem(key,JSON.stringify(remote.state));
        announce("online","साझा database जोडियो · revision "+revision);
        return remote.state;
      }
      if(hasLocalData(local)){
        announce("migrating","यस browser को पुरानो data shared database मा सारिँदैछ…");
        await put(local);
      } else {
        announce("empty","साझा database खाली छ। पहिले laptop बाट पुरानो backup Import गर्नुहोस्।");
      }
      return local;
    }catch(error){
      connected=false;
      announce("offline","Server जोडिएन ("+error.message+") · हाल local browser मा मात्र सुरक्षित हुन्छ।");
      return local;
    }
  }
  function save(state){
    if(!connected || conflict) return;
    clearTimeout(timer);
    const snapshot=JSON.parse(JSON.stringify(state));
    timer=setTimeout(()=>{
      queue=queue.then(()=>put(snapshot)).catch(error=>{
        connected=false;
        announce("offline","Sync असफल ("+error.message+") · local copy सुरक्षित छ; server जोडिएपछि Reload गर्नुहोस्।");
      });
    },450);
  }
  window.KabijweSync={load,save,getStatus:()=>({connected,initialized,revision,conflict,status:lastStatus,message:lastMessage})};
})();
