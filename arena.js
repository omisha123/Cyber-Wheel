// CYBER ARENA shared helper: player details, normalized scoring, overall leaderboard.
const Arena=(()=>{
 const KEY="cyberArenaLB";
 const WEIGHT={caesar:1,memory:.8,domain:1,phish:1.1,password:1.1,packet:1};
 const NAMES={caesar:"Caesar Cracker",memory:"Memory Match",domain:"Domain Detective",phish:"Two Truths One Phish",password:"Password Duel",packet:"Packet Ninja"};
 const BRANCHES=["Computer","IT","EXTC","Electronics","Production","civil","textile","mechanical","electrical","Masters"];
 const g=id=>document.getElementById(id);
 let player=null;
 function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch(e){return[]}}
 function store(a){try{localStorage.setItem(KEY,JSON.stringify(a.slice(-1000)))}catch(e){}}
 const css=document.createElement("style");
 css.textContent=`.pform{max-width:700px;margin:12px auto;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
 .pform input{font:bold 18px "Courier New",monospace;padding:10px 12px;background:#00140d;color:#00ff9c;border:2px solid #00ff9c;outline:none;width:min(46%,300px);min-width:200px}
 .pform input:focus{box-shadow:0 0 16px #00ff9c}#perr{width:100%;color:#ff3860;min-height:1.3em;font-size:15px}`;
 document.head.appendChild(css);
 return{
  get player(){return player},
  mountForm(){
   const go=g("go");if(!go||g("pn"))return;
   const f=document.createElement("div");f.className="pform";
   f.innerHTML='<input id="pn" maxlength="30" placeholder="YOUR NAME" autocomplete="off"><input id="pb" maxlength="20" list="brs" placeholder="BRANCH" autocomplete="off"><datalist id="brs">'+BRANCHES.map(b=>"<option value='"+b+"'>").join("")+'</datalist><div id="perr"></div>';
   go.parentNode.insertBefore(f,go);g("pn").focus();
  },
  ready(){
   const n=(g("pn").value||"").trim(),b=(g("pb").value||"").trim();
   if(n.length<2){g("perr").textContent="Enter your name to start.";g("pn").focus();return false}
   if(!b){g("perr").textContent="Enter your branch to start.";g("pb").focus();return false}
   player={name:n,branch:b};g("perr").textContent="";return true;
  },
  calc(game,timeLeft,total,mistakes,limit){
   const acc=Math.max(0,Math.min(1,1-mistakes/limit)),spd=Math.max(0,Math.min(1,timeLeft/total));
   return Math.round(1000*(.4+.35*acc+.25*spd)*(WEIGHT[game]||1));
  },
  save(game,score){
   if(!player)return;const a=load();a.push({n:player.name,b:player.branch,g:game,s:score,t:Date.now()});store(a);
  },
  top(n){
   const best={};load().forEach(e=>{const k=(e.n+"|"+e.b).toLowerCase();if(!best[k]||e.s>best[k].s)best[k]=e});
   return Object.values(best).sort((x,y)=>y.s-x.s||x.t-y.t).slice(0,n||10);
  },
  gameName(id){return NAMES[id]||id},
  clear(){store([])}
 };
})();