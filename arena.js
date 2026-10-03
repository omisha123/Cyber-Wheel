// CYBER ARENA shared helper: player details, scoring, shared (server-side) leaderboard, QR lock.
const Arena=(()=>{
 const API="/api/scores";
 const PENDING="cyberArenaPending";   // scores that could not be sent yet (bad wifi), retried later
 const LOCK="cyberArenaQRLock";       // set on a device that played via QR
 const WEIGHT={caesar:1,memory:1.15,domain:1,phish:1.1,password:1.1};
 const NAMES={caesar:"Caesar Cracker",memory:"Memory Match",domain:"Domain Detective",phish:"Two Truths One Phish",password:"Password Duel",packet:"Packet Ninja"};
 // keep in sync with api/scores.js
 const BRANCHES=["Computer","IT","EXTC","Electronics","Production","Civil","Textile","Mechanical","Electrical","Diploma","Masters"];
 const g=id=>document.getElementById(id);
 // Opened from the wheel's PLAY button => ?from=wheel. Opened from the QR code => no param.
 const viaWheel=new URLSearchParams(location.search).get("from")==="wheel";
 let player=null;
 const ls={
  get(k){try{return localStorage.getItem(k)}catch(e){return null}},
  set(k,v){try{localStorage.setItem(k,v)}catch(e){}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
 };
 function pending(){try{return JSON.parse(ls.get(PENDING)||"[]")}catch(e){return[]}}
 async function send(e){
  const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e),keepalive:true});
  if(!r.ok&&r.status>=500)throw new Error("server");
 }
 async function flush(){
  const q=pending();if(!q.length)return;
  const left=[];
  for(const e of q){try{await send(e)}catch(err){left.push(e)}}
  ls.set(PENDING,JSON.stringify(left.slice(-50)));
 }
 const css=document.createElement("style");
 css.textContent=`.pform{max-width:700px;margin:12px auto;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
 .pform input,.pform select{font:bold 18px "Courier New",monospace;padding:10px 12px;background:#00140d;color:#00ff9c;border:2px solid #00ff9c;outline:none;width:min(46%,300px);min-width:200px;border-radius:0}
 .pform select{cursor:pointer}.pform select option{background:#00140d;color:#00ff9c}
 .pform input:focus,.pform select:focus{box-shadow:0 0 16px #00ff9c}#perr{width:100%;color:#ff3860;min-height:1.3em;font-size:15px}
 .qrnote{max-width:520px;margin:14px auto;padding:12px 16px;border:1px solid #00ff9c;background:#00140d99;color:#ffe600;line-height:1.5}`;
 document.head.appendChild(css);
 flush();
 return{
  get player(){return player},
  get viaWheel(){return viaWheel},
  BRANCHES,
  mountForm(){
   const go=g("go");if(!go||g("pn"))return;
   const f=document.createElement("div");f.className="pform";
   f.innerHTML='<input id="pn" maxlength="30" placeholder="YOUR NAME" autocomplete="off"><select id="pb"><option value="" selected disabled>SELECT BRANCH</option>'+BRANCHES.map(b=>'<option value="'+b+'">'+b+'</option>').join("")+'</select><div id="perr"></div>';
   go.parentNode.insertBefore(f,go);g("pn").focus();
   // QR players cannot go back to the wheel from here
   const again=g("again");
   if(again&&!viaWheel){
    again.style.display="none";
    const n=document.createElement("div");n.className="qrnote";
    n.textContent="Thanks for playing! Your score is on the leaderboard. To play again, visit the stall and spin the wheel.";
    again.parentNode.insertBefore(n,again);
   }
  },
  ready(){
   const n=(g("pn").value||"").trim(),b=g("pb").value;
   if(n.length<2){g("perr").textContent="Enter your name to start.";g("pn").focus();return false}
   if(!BRANCHES.includes(b)){g("perr").textContent="Select your branch from the list to start.";g("pb").focus();return false}
   player={name:n,branch:b};g("perr").textContent="";
   if(!viaWheel)ls.set(LOCK,String(Date.now()));   // QR play locks the wheel on this device
   return true;
  },
  goWheel(){if(viaWheel)location.href="../index.html"},
  isLocked(){return !!ls.get(LOCK)},
  unlock(){ls.del(LOCK)},
  calc(game,timeLeft,total,mistakes,limit){
   const acc=Math.max(0,Math.min(1,1-mistakes/limit)),spd=Math.max(0,Math.min(1,timeLeft/total));
   return Math.round(1000*(.4+.35*acc+.25*spd)*(WEIGHT[game]||1));
  },
  save(game,score){
   if(!player||score<=0)return;
   const e={n:player.name,b:player.branch,g:game,s:score};
   send(e).catch(()=>{const q=pending();q.push(e);ls.set(PENDING,JSON.stringify(q.slice(-50)))});
  },
  async top(){
   const r=await fetch(API,{cache:"no-store"});
   if(!r.ok)throw new Error("fetch failed");
   return r.json();   // {scores:[{n,b,g,s,t}], ttl}
  },
  gameName(id){return NAMES[id]||id}
 };
})();