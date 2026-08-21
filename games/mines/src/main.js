(function(global){
'use strict';
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function neighborsOf(rows,cols,i,fn){var r=(i/cols)|0,c=i%cols;for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;var nr=r+dr,nc=c+dc;if(nr<0||nr>=rows||nc<0||nc>=cols)continue;fn(nr*cols+nc)}}
function numsFromMines(rows,cols,mine){var num=new Uint8Array(rows*cols);for(var i=0;i<mine.length;i++){if(mine[i])neighborsOf(rows,cols,i,function(j){num[j]++})}return num}
function randomMines(rows,cols,count,exclude,rnd){
  var pool=[],i;
  for(i=0;i<rows*cols;i++)if(!exclude.has(i))pool.push(i);
  for(i=pool.length-1;i>0;i--){var j=(rnd()*(i+1))|0,t=pool[i];pool[i]=pool[j];pool[j]=t}
  var mine=new Uint8Array(rows*cols);
  for(i=0;i<count&&i<pool.length;i++)mine[pool[i]]=1;
  return mine;
}
function floodSim(state,num,rows,cols,start){
  if(state[start]!==0)return;
  var stack=[start];
  while(stack.length){
    var j=stack.pop();
    if(state[j]!==0)continue;
    state[j]=1;
    if(num[j]===0)neighborsOf(rows,cols,j,function(k){if(state[k]===0)stack.push(k)});
  }
}
function deduceOnce(state,num,rows,cols,minesTotal){
  var i,k,hiddenCount=0,flagCount=0;
  for(i=0;i<state.length;i++){if(state[i]===0)hiddenCount++;else if(state[i]===2)flagCount++}
  var frontier=[],backfield=[],frontierSet={};
  var cons=[];
  for(i=0;i<state.length;i++){
    if(state[i]!==1||num[i]===0)continue;
    var hidden=[],flags=0;
    neighborsOf(rows,cols,i,function(j){if(state[j]===0)hidden.push(j);else if(state[j]===2)flags++});
    if(!hidden.length)continue;
    var need=num[i]-flags;
    if(need<0||need>hidden.length)continue;
    cons.push({cells:hidden,need:need});
  }
  var safe=[],toFlag=[],safeSet={},flagSet={};
  function addSafe(x){if(state[x]===0&&!safeSet[x]){safeSet[x]=1;safe.push(x)}}
  function addFlag(x){if(state[x]===0&&!flagSet[x]){flagSet[x]=1;toFlag.push(x)}}
  var minesLeft=minesTotal-flagCount;
  if(minesLeft===0){for(i=0;i<state.length;i++)if(state[i]===0)addSafe(i)}
  else if(minesLeft===hiddenCount&&hiddenCount>0){for(i=0;i<state.length;i++)if(state[i]===0)addFlag(i)}
  if(!safe.length&&!toFlag.length){
    for(k=0;k<cons.length;k++){
      var c=cons[k];
      if(c.need===0){for(var q=0;q<c.cells.length;q++)addSafe(c.cells[q])}
      else if(c.need===c.cells.length){for(var w=0;w<c.cells.length;w++)addFlag(c.cells[w])}
    }
  }
  if(!safe.length&&!toFlag.length){
    var a,b;
    for(a=0;a<cons.length;a++)for(b=0;b<cons.length;b++){
      if(a===b)continue;
      var A=cons[a],B=cons[b];
      if(A.cells.length>=B.cells.length)continue;
      var inA={},inB={},z;
      for(z=0;z<A.cells.length;z++)inA[A.cells[z]]=1;
      for(z=0;z<B.cells.length;z++)inB[B.cells[z]]=1;
      var subset=true;
      for(z=0;z<A.cells.length;z++)if(!inB[A.cells[z]]){subset=false;break}
      if(!subset)continue;
      var need2=B.need-A.need,diff=[];
      for(z=0;z<B.cells.length;z++)if(!inA[B.cells[z]])diff.push(B.cells[z]);
      if(need2===0){for(z=0;z<diff.length;z++)addSafe(diff[z])}
      else if(need2===diff.length){for(z=0;z<diff.length;z++)addFlag(diff[z])}
    }
  }
  for(k=0;k<cons.length;k++)for(var y=0;y<cons[k].cells.length;y++){var f=cons[k].cells[y];if(!frontierSet[f]){frontierSet[f]=1;frontier.push(f)}}
  for(i=0;i<state.length;i++)if(state[i]===0&&!frontierSet[i])backfield.push(i);
  return{safe:safe,toFlag:toFlag,frontier:frontier,backfield:backfield};
}
function simulate(rows,cols,mine,firstIdx){
  var num=numsFromMines(rows,cols,mine);
  var state=new Uint8Array(rows*cols);
  floodSim(state,num,rows,cols,firstIdx);
  var guard=0,i;
  while(guard++<20000){
    var remaining=false;
    for(i=0;i<state.length;i++)if(state[i]===0){remaining=true;break}
    if(!remaining)return{solved:true};
    var d=deduceOnce(state,num,rows,cols,mine.reduce(function(s,v){return s+v},0));
    if(!d.safe.length&&!d.toFlag.length)return{solved:false,frontier:d.frontier,backfield:d.backfield};
    for(i=0;i<d.toFlag.length;i++)state[d.toFlag[i]]=2;
    for(i=0;i<d.safe.length;i++)floodSim(state,num,rows,cols,d.safe[i]);
  }
  return{solved:false};
}
function perturb(mine,frontier,backfield,rnd){
  function pick(arr){return arr[(rnd()*arr.length)|0]}
  var i;
  if(frontier&&frontier.length){
    var f=pick(frontier);
    if(mine[f]){
      var spots=[];
      for(i=0;i<backfield.length;i++)if(!mine[backfield[i]])spots.push(backfield[i]);
      if(spots.length){var b=pick(spots);mine[f]=0;mine[b]=1;return}
    }else{
      var ms=[];
      for(i=0;i<backfield.length;i++)if(mine[backfield[i]])ms.push(backfield[i]);
      if(ms.length){var b2=pick(ms);mine[b2]=0;mine[f]=1;return}
    }
    var fm=[],fs=[];
    for(i=0;i<frontier.length;i++)(mine[frontier[i]]?fm:fs).push(frontier[i]);
    if(fm.length&&fs.length){var a=pick(fm),c=pick(fs);mine[a]=0;mine[c]=1;return}
  }
}
function generateSolvable(rows,cols,count,excludeSet,firstIdx,rnd,deadlineMs){
  var t0=Date.now();
  var mine=randomMines(rows,cols,count,excludeSet,rnd);
  var iter=0;
  while(iter++<2000){
    var sim=simulate(rows,cols,mine,firstIdx);
    if(sim.solved)return mine;
    if(Date.now()-t0>deadlineMs)return null;
    if(iter%50===0){mine=randomMines(rows,cols,count,excludeSet,rnd);continue}
    perturb(mine,sim.frontier,sim.backfield,rnd);
  }
  return null;
}
global.MinesCore={mulberry32:mulberry32,hashStr:hashStr,neighborsOf:neighborsOf,numsFromMines:numsFromMines,randomMines:randomMines,deduceOnce:deduceOnce,simulate:simulate,generateSolvable:generateSolvable};
})(typeof window!=='undefined'?window:globalThis);

(function(){
'use strict';
var C=window.MinesCore;
var DIFFS={
  beginner:{r:9,c:9,m:10,label:'初级'},
  intermediate:{r:16,c:16,m:40,label:'中级'},
  expert:{r:16,c:30,m:99,label:'高级'}
};
var DIFF_KEYS=['beginner','intermediate','expert'];
var LS={theme:'mines.theme',sound:'mines.sound',noguess:'mines.noguess',diff:'mines.diff',custom:'mines.custom',stats:'mines.stats.v1',daily:'mines.daily'};
var store={
  get:function(k,d){try{var v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}},
  set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};
function todayKey(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function dayIndex(){var d=new Date();return Math.floor((d-new Date(d.getFullYear(),0,0))/864e5)}
function dailyDiffKey(){return DIFF_KEYS[dayIndex()%3]}
var S={diff:'beginner',mode:'beginner',rows:9,cols:9,mines:10,mine:null,num:null,state:null,openCount:0,flags:0,started:false,over:false,win:false,firstDone:false,time:0,timer:null,exploded:-1,hintsLeft:3,rng:null,dailyDone:false,fxTimers:[],seed:null,moves:[]};
var els={};
['board','boardCard','capL','noGuessPill','dailyPill','mineCount','timeVal','faceBtn','banner','bSeal','bTitle','bSub','bTime','bRecord','bAgain','toast','progBar','hintBtn','hintBadge','newBtn','noGuessSw','themeBtn','soundBtn','statsBtn','helpBtn','flagModeTile','flagModeVal','seg','statsBody','resetStats','customModal','customGo','cRows','cCols','cMines','fsWin','fsStreak','fsBest','fsPlayed','lbBtn','userChip','authModal','authUser','authPass','authErr','authGo','tabLogin','tabReg','authEmail','authCode','sendCodeBtn','emailField','codeField','lbModal','lbTabs','lbBody','lbMyRow','acctModal','acctName','acctSince','acctLb','acctLogout','acctRecent','acctUpgrade'].forEach(function(id){els[id]=document.getElementById(id)});
var noGuess=store.get(LS.noguess,true);
var flagMode=false;
var cellEls=[];
var suppressClick=0;

var ICONS={
  mine:'<svg viewBox="0 0 24 24"><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4v-2M12 22v-2M4 12H2M22 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4"/></g><circle cx="12" cy="12" r="5.6" fill="currentColor"/><circle cx="10" cy="10" r="1.5" fill="var(--bg0)"/></svg>',
  flag:'<svg viewBox="0 0 24 24"><path d="M8 21V4.5" stroke="var(--flagpole)" stroke-width="1.8" stroke-linecap="round"/><path d="M8 5l9 3.2L8 11.8Z" fill="var(--flag)" stroke="var(--flag)" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  sound:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10"/></svg>',
  mute:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-8M21 20H3"/></svg>',
  help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 1c0 1.7-2.5 2.2-2.5 3.6"/><circle cx="12" cy="17" r=".4" fill="currentColor"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  faceCalm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01" stroke-width="2.6"/><path d="M9 15.2c.9.9 1.9 1.3 3 1.3s2.1-.4 3-1.3"/></svg>',
  faceWin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M6.5 10.5h4l-2 2Z" fill="currentColor" stroke="none"/><path d="M13.5 10.5h4l-2 2Z" fill="currentColor" stroke="none"/><path d="M6.8 10.8 10.2 12M17.2 10.8 13.8 12"/><path d="M9 15.4c.9.9 1.9 1.3 3 1.3s2.1-.4 3-1.3"/></svg>',
  faceDead:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="m8.2 8.7 2.2 2.2m0-2.2-2.2 2.2M13.6 8.7l2.2 2.2m0-2.2-2.2 2.2"/><path d="M9 16c.9-.7 1.9-1 3-1s2.1.3 3 1"/></svg>',
  faceWow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="2.4"/><circle cx="12" cy="16.2" r="1.6"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4a1 1 0 0 0-1 1c0 2 1.5 3.5 4 4M17 6h3a1 1 0 0 1 1 1c0 2-1.5 3.5-4 4"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-3.5 4-5.5 8-5.5s7.2 2 8 5.5"/></svg>'
};
document.getElementById('mineIco').innerHTML=ICONS.mine;
document.getElementById('timeIco').innerHTML=ICONS.clock;
document.getElementById('flagIco').innerHTML=ICONS.flag;
document.getElementById('statsBtn').innerHTML=ICONS.chart;
document.getElementById('helpBtn').innerHTML=ICONS.help;
els.lbBtn.innerHTML=ICONS.trophy;

var API='https://gameapi.haoaiganfan.top';
var auth={token:null,user:null};
try{var saved=JSON.parse(localStorage.getItem('mines.auth')||'null');if(saved&&saved.token){auth.token=saved.token;auth.user=saved.user||null;auth.guest=!!saved.guest}}catch(e){}
function saveAuth(){try{localStorage.setItem('mines.auth',JSON.stringify({token:auth.token,user:auth.user,guest:!!auth.guest}))}catch(e){}}
function renderUserChip(){
  var logged=!!auth.token;
  els.userChip.classList.toggle('logged',logged);
  els.userChip.innerHTML='<span class="dot"></span>'+ICONS.user+'<span class="uname">'+(logged&&auth.user?auth.user.username:'游客')+'</span>';
  els.userChip.title=auth.guest?'游客账号 · 点击设置正式账号':'玩家账号';
}
renderUserChip();
if(auth.token){
  fetch(API+'/auth/me',{headers:{Authorization:'Bearer '+auth.token}}).then(function(r){return r.ok?r.json():Promise.reject()}).then(function(d){auth.user=d.user;saveAuth();renderUserChip()}).catch(function(){});
}else{
  api('/auth/guest',{method:'POST'}).then(function(d){
    auth.token=d.token;auth.user=d.user;auth.guest=true;saveAuth();renderUserChip();
  }).catch(function(){});
}
function api(path,opt){
  opt=opt||{};
  opt.headers=Object.assign({'Content-Type':'application/json'},opt.headers||{});
  if(auth.token)opt.headers.Authorization='Bearer '+auth.token;
  return fetch(API+path,opt).then(function(r){
    return r.json().catch(function(){return{}}).then(function(d){if(!r.ok)throw d;return d});
  });
}
document.querySelectorAll('.ghost.x').forEach(function(b){b.innerHTML=ICONS.x});

var audio={ctx:null,on:store.get(LS.sound,true),
  init:function(){if(!this.ctx){try{this.ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume()},
  tone:function(f,t,dur,type,vol){if(!this.on||!this.ctx)return;var o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type||'triangle';o.frequency.value=f;g.gain.setValueAtTime(vol||.06,this.ctx.currentTime+t);g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+t+dur);o.connect(g).connect(this.ctx.destination);o.start(this.ctx.currentTime+t);o.stop(this.ctx.currentTime+t+dur+.02)},
  open:function(){this.tone(640,0,.07,'triangle',.045)},
  flag:function(){this.tone(880,0,.09,'sine',.06)},
  boom:function(){
    if(!this.on||!this.ctx)return;
    var ctx=this.ctx,t=ctx.currentTime;
    var n1=ctx.createBufferSource();n1.buffer=this.noise();
    var f1=ctx.createBiquadFilter();f1.type='highpass';f1.frequency.value=1800;
    var g1=ctx.createGain();g1.gain.setValueAtTime(.32,t);g1.gain.exponentialRampToValueAtTime(.0001,t+.07);
    n1.connect(f1);f1.connect(g1);g1.connect(ctx.destination);n1.start(t);n1.stop(t+.1);
    var n2=ctx.createBufferSource();n2.buffer=this.noise();
    var f2=ctx.createBiquadFilter();f2.type='lowpass';f2.frequency.setValueAtTime(1000,t);f2.frequency.exponentialRampToValueAtTime(90,t+.9);
    var g2=ctx.createGain();g2.gain.setValueAtTime(.55,t+.01);g2.gain.exponentialRampToValueAtTime(.0001,t+1.15);
    n2.connect(f2);f2.connect(g2);g2.connect(ctx.destination);n2.start(t);n2.stop(t+1.2);
    var o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(26,t+.75);
    var og=ctx.createGain();og.gain.setValueAtTime(.5,t);og.gain.exponentialRampToValueAtTime(.0001,t+.95);
    o.connect(og);og.connect(ctx.destination);o.start(t);o.stop(t+1);
    var n3=ctx.createBufferSource();n3.buffer=this.noise();
    var f3=ctx.createBiquadFilter();f3.type='lowpass';f3.frequency.value=130;
    var g3=ctx.createGain();g3.gain.setValueAtTime(.001,t);g3.gain.exponentialRampToValueAtTime(.16,t+.12);g3.gain.exponentialRampToValueAtTime(.0001,t+2);
    n3.connect(f3);f3.connect(g3);g3.connect(ctx.destination);n3.start(t);n3.stop(t+2.1);
  },
  pop:function(){
    if(!this.on||!this.ctx)return;
    var ctx=this.ctx,t=ctx.currentTime;
    var n=ctx.createBufferSource();n.buffer=this.noise();
    var bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=300+Math.random()*500;bp.Q.value=1.2;
    var g=ctx.createGain();g.gain.setValueAtTime(.16,t);g.gain.exponentialRampToValueAtTime(.0001,t+.14);
    n.connect(bp);bp.connect(g);g.connect(ctx.destination);n.start(t);n.stop(t+.16);
    this.tone(100+Math.random()*60,0,.12,'sine',.18);
  },
  noise:function(){
    if(!this.noiseBuf){
      var len=Math.floor(this.ctx.sampleRate*1.2),buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=buf.getChannelData(0);
      for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
      this.noiseBuf=buf;
    }
    return this.noiseBuf;
  },
  win:function(){
    if(!this.on||!this.ctx)return;
    var seq=[523.25,659.25,783.99,1046.5],i;
    for(i=0;i<seq.length;i++){
      this.tone(seq[i],i*.13,.5,'triangle',.075);
      this.tone(seq[i]*1.5,i*.13+.02,.4,'sine',.03);
    }
    for(i=0;i<6;i++)this.tone(1568+i*160,.55+i*.08,.35,'sine',.024);
    [523.25,659.25,783.99,1046.5].forEach(function(f){this.tone(f,.6,1,'triangle',.045);this.tone(f/2,.6,1,'sine',.04)},this);
  },
  sparkle:function(){
    if(!this.on||!this.ctx)return;
    for(var i=0;i<5;i++)this.tone(1200+Math.random()*900,i*.06,.22,'sine',.03);
  },
};
document.addEventListener('pointerdown',function(){audio.init()},{once:true});

var fx={cv:null,cx:null,dpr:1,parts:[],rings:[],raf:0,last:0,
  init:function(){this.cv=document.getElementById('fxCanvas');this.cx=this.cv.getContext('2d')},
  size:function(){
    if(!this.cv||!this.cx)return;
    var r=this.cv.getBoundingClientRect();
    this.dpr=Math.min(window.devicePixelRatio||1,2);
    this.cv.width=Math.max(1,Math.round(r.width*this.dpr));
    this.cv.height=Math.max(1,Math.round(r.height*this.dpr));
    this.cx.setTransform(this.dpr,0,0,this.dpr,0,0);
  },
  center:function(i){
    var cr=cellEls[i].getBoundingClientRect(),br=this.cv.getBoundingClientRect();
    return[cr.left+cr.width/2-br.left,cr.top+cr.height/2-br.top];
  },
  blast:function(i){
    this.size();
    var p=this.center(i),x=p[0],y=p[1];
    this.parts.push({t:'core',x:x,y:y,r:4,vr:560,a:1,life:0,max:.5});
    var cols=['#fff3d6','#ffd97a','#ff9d3c','#ff5c33','#ffc46b'];
    for(var k=0;k<90;k++){
      var ang=Math.random()*Math.PI*2,sp=140+Math.random()*560;
      this.parts.push({t:Math.random()<.45?'spark':'ember',x:x,y:y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp-60,life:0,max:.6+Math.random()*.8,size:1.5+Math.random()*3,c:cols[(Math.random()*cols.length)|0]});
    }
    for(k=0;k<10;k++){
      this.parts.push({t:'smoke',x:x+(Math.random()-.5)*18,y:y+(Math.random()-.5)*14,vx:(Math.random()-.5)*40,vy:-30-Math.random()*50,life:0,max:1.6+Math.random()*1.2,size:8+Math.random()*14});
    }
    this.rings.push({x:x,y:y,r:6,vr:920,a:.9,lw:5,c:'#ffd97a'});
    this.rings.push({x:x,y:y,r:2,vr:520,a:.7,lw:3,c:'#ff9d3c'});
    this.start();
  },
  burstCell:function(i){
    var p=this.center(i),x=p[0],y=p[1];
    var cols=['#ffd97a','#ff9d3c','#ff5c33'];
    for(var k=0;k<14;k++){
      var ang=Math.random()*Math.PI*2,sp=60+Math.random()*220;
      this.parts.push({t:'ember',x:x,y:y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp-40,life:0,max:.4+Math.random()*.5,size:1.2+Math.random()*2,c:cols[(Math.random()*cols.length)|0]});
    }
    this.rings.push({x:x,y:y,r:4,vr:420,a:.55,lw:2.5,c:'#ff9d3c'});
    this.start();
  },
  firework:function(x,y){
    var cols=['#ffd97a','#ecd391','#ff9d3c','#fff3d6','#d8b45a'];
    for(var k=0;k<52;k++){
      var ang=Math.random()*Math.PI*2,sp=130+Math.random()*320;
      this.parts.push({t:'spark',x:x,y:y,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:0,max:.7+Math.random()*.6,size:1.5+Math.random()*2,c:cols[(Math.random()*cols.length)|0]});
    }
    this.rings.push({x:x,y:y,r:4,vr:620,a:.8,lw:3,c:'#ecd391'});
    this.start();
  },
  confetti:function(){
    this.size();
    var w=this.cv.width/this.dpr;
    var cols=['#d8b45a','#ecd391','#b3432b','#ece7df','#86d99c'];
    for(var i=0;i<130;i++){
      this.parts.push({t:'conf',x:Math.random()*w,y:-12-Math.random()*70,vx:(Math.random()-.5)*50,vy:70+Math.random()*130,life:0,max:2+Math.random()*1.4,size:3+Math.random()*4.5,rot:Math.random()*7,vrot:(Math.random()-.5)*11,sway:Math.random()*7,c:cols[(Math.random()*cols.length)|0]});
    }
    this.start();
  },
  celebrate:function(){
    this.size();
    var w=this.cv.width/this.dpr,h=this.cv.height/this.dpr;
    this.confetti();
    var self=this;
    for(var i=0;i<5;i++){
      (function(n){
        S.fxTimers.push(setTimeout(function(){
          self.firework(w*(.15+.7*Math.random()),h*(.12+.45*Math.random()));
          audio.sparkle();
        },n*260+Math.random()*140));
      })(i);
    }
  },
  start:function(){if(!this.raf){this.last=performance.now();this.raf=requestAnimationFrame(this.step.bind(this))}},
  step:function(now){
    var dt=Math.min((now-this.last)/1000,.05);this.last=now;
    var cx=this.cx,w=this.cv.width/this.dpr,h=this.cv.height/this.dpr,i,p;
    cx.clearRect(0,0,w,h);
    cx.globalCompositeOperation='lighter';
    for(i=0;i<this.parts.length;i++){
      p=this.parts[i];p.life+=dt;
      if(p.life>=p.max)continue;
      var k=1-p.life/p.max;
      if(p.t==='core'){
        p.r+=p.vr*dt;p.vr*=.9;
        var g=cx.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(1,p.r));
        g.addColorStop(0,'rgba(255,244,214,'+(.9*k)+')');
        g.addColorStop(.4,'rgba(255,160,60,'+(.55*k)+')');
        g.addColorStop(1,'rgba(255,90,40,0)');
        cx.fillStyle=g;cx.beginPath();cx.arc(p.x,p.y,Math.max(1,p.r),0,7);cx.fill();
      }else if(p.t==='smoke'){
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.size+=26*dt;
        cx.globalCompositeOperation='source-over';
        cx.fillStyle='rgba(120,110,100,'+(.16*k)+')';
        cx.beginPath();cx.arc(p.x,p.y,p.size,0,7);cx.fill();
        cx.globalCompositeOperation='lighter';
      }else{
        p.vy+=760*dt;p.vx*=.985;p.vy*=.985;
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        if(p.t==='spark'){
          cx.strokeStyle=p.c;cx.globalAlpha=k;cx.lineWidth=Math.max(.6,p.size*k);
          cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(p.x-p.vx*.028,p.y-p.vy*.028);cx.stroke();cx.globalAlpha=1;
      }else if(p.t==='conf'){
        p.vy+=140*dt;p.vx+=Math.sin(p.life*p.sway)*30*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vrot*dt;
        if(p.y>h+16)p.life=p.max;
        cx.globalCompositeOperation='source-over';
        cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);
        cx.globalAlpha=Math.min(1,k*2);cx.fillStyle=p.c;
        cx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.62);
        cx.restore();cx.globalAlpha=1;
        cx.globalCompositeOperation='lighter';
      }else{
          cx.fillStyle=p.c;cx.globalAlpha=k;
          cx.beginPath();cx.arc(p.x,p.y,Math.max(.4,p.size*k),0,7);cx.fill();cx.globalAlpha=1;
        }
      }
    }
    for(i=0;i<this.rings.length;i++){
      var r=this.rings[i];r.r+=r.vr*dt;r.vr*=.92;r.a-=dt*1.6;
      if(r.a<=0)continue;
      cx.strokeStyle=r.c;cx.globalAlpha=Math.max(0,r.a);cx.lineWidth=Math.max(.5,r.lw*r.a);
      cx.beginPath();cx.arc(r.x,r.y,r.r,0,7);cx.stroke();cx.globalAlpha=1;
    }
    this.parts=this.parts.filter(function(q){return q.life<q.max});
    this.rings=this.rings.filter(function(q){return q.a>0});
    if(this.parts.length||this.rings.length){this.raf=requestAnimationFrame(this.step.bind(this))}
    else{this.raf=0;cx.clearRect(0,0,w,h)}
  },
  reset:function(){
    this.parts=[];this.rings=[];
    if(this.raf){cancelAnimationFrame(this.raf);this.raf=0}
    if(this.cx)this.cx.clearRect(0,0,this.cv.width,this.cv.height);
  }
};
fx.init();
function screenFlash(){var f=document.getElementById('screenFlash');f.classList.remove('go');void f.offsetWidth;f.classList.add('go')}

function toast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){els.toast.classList.remove('show')},2600)}

function setTheme(t){document.documentElement.setAttribute('data-theme',t);store.set(LS.theme,t);els.themeBtn.innerHTML=t==='dark'?ICONS.moon:ICONS.sun}
function setSound(on){audio.on=on;store.set(LS.sound,on);els.soundBtn.innerHTML=on?ICONS.sound:ICONS.mute;els.soundBtn.classList.toggle('on',on)}
setTheme(store.get(LS.theme,'dark'));
setSound(audio.on);

function statsBlank(){return{played:0,won:0,streak:0,best:0,bestTime:null}}
function loadStats(){var s=store.get(LS.stats,null);if(!s){s={};['beginner','intermediate','expert','daily'].forEach(function(k){s[k]=statsBlank()})}return s}
function saveStats(s){store.set(LS.stats,s)}
function statKey(){return S.mode==='daily'?'daily':S.mode}
function fmtTime(t){var m=(t/60)|0,s=t%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
var CLOUD_MODES={beginner:1,intermediate:1,expert:1,daily:1};
function submitPlay(){
  if(!CLOUD_MODES[S.mode])return;
  if(!auth.token)return;
  api('/plays',{method:'POST',body:JSON.stringify({
    game:'mines',mode:S.mode,won:S.win,score:S.time*1000,
    detail:{seed:S.seed,moves:S.moves,timeMs:S.time*1000,params:{rows:S.rows,cols:S.cols,mines:S.mines,noGuess:noGuess}}
  })}).then(function(d){
    if(S.win&&typeof d.rank==='number')toast('战绩已验证 · 当前第 '+d.rank+' 名');
    else if(S.win)toast('战绩已记录');
  }).catch(function(e){toast('战绩提交失败'+(e&&e.error?(' · '+e.error):''))});
}

function updateFoot(){
  var s=loadStats(),k=statKey(),d=s[k];
  els.fsWin.textContent=d.played?Math.round(d.won/d.played*100)+'%':'—';
  els.fsStreak.textContent=d.streak;
  els.fsBest.textContent=d.bestTime?fmtTime(d.bestTime):'—';
  var total=0,won=0;
  ['beginner','intermediate','expert','daily'].forEach(function(x){total+=s[x].played;won+=s[x].won});
  els.fsPlayed.textContent=total;
}

function pad3(n){return (n<0?'-':'')+String(Math.abs(n)).padStart(3,'0')}
function updateHUD(){
  els.mineCount.textContent=pad3(S.mines-S.flags);
  els.timeVal.textContent=fmtTime(S.time);
  var denom=S.rows*S.cols-S.mines;
  els.progBar.style.width=(denom?Math.min(100,S.openCount/denom*100):0)+'%';
}
function updateFace(st){
  var m={calm:ICONS.faceCalm,win:ICONS.faceWin,dead:ICONS.faceDead,wow:ICONS.faceWow};
  var html=m[st]||m.calm;
  els.faceBtn.innerHTML=html+'<span class="fl-label">新局</span>';
  els.faceBtn.dataset.face=st;
}
function updateNoGuessUI(){
  els.noGuessSw.classList.toggle('on',noGuess);
  els.noGuessSw.setAttribute('aria-checked',noGuess);
  els.noGuessPill.textContent=noGuess?'无猜':'无猜 · 关';
  els.noGuessPill.classList.toggle('dim',!noGuess);
}

function startTimer(){
  stopTimer();
  S.timer=setInterval(function(){S.time++;if(S.time>59999)S.time=59999;els.timeVal.textContent=fmtTime(S.time)},1000);
}
function stopTimer(){if(S.timer){clearInterval(S.timer);S.timer=null}}

function idxOf(r,c){return r*S.cols+c}
function forN(i,fn){C.neighborsOf(S.rows,S.cols,i,fn)}

function newGame(cfg){
  cfg=cfg||{};
  stopTimer();
  S.mode=cfg.mode||S.mode;
  S.diffLabel=cfg.diffLabel||S.diffLabel;
  S.rows=cfg.rows||S.rows;S.cols=cfg.cols||S.cols;S.mines=cfg.mines||S.mines;
  S.rng=cfg.rng||null;
  S.mine=null;S.num=null;S.state=new Uint8Array(S.rows*S.cols);
  S.openCount=0;S.flags=0;S.started=false;S.over=false;S.win=false;S.firstDone=false;
  S.time=0;S.exploded=-1;S.hintsLeft=3;
  S.moves=[];
  var sid='';
  for(var si=0;si<16;si++)sid+='0123456789abcdef'[Math.random()*16|0];
  S.seed=S.mode==='daily'?('mines-daily-'+todayKey()):('g:'+sid);
  S.rng=C.mulberry32(C.hashStr(S.seed));
  S.fxTimers.forEach(clearTimeout);S.fxTimers=[];
  fx.reset();
  els.boardCard.classList.remove('shake','won-glow');
  els.hintBadge.textContent='3';els.hintBadge.classList.remove('off');
  els.board.classList.remove('won');
  els.banner.classList.remove('show','win','lose');
  document.getElementById('board').style.setProperty('--cols',S.cols);
  var dk=S.mode==='daily'?dailyDiffKey():S.mode;
  if(dk in DIFFS)S.diffLabel=DIFFS[dk].label+(S.mode==='daily'?' · 每日':'');
  els.capL.textContent=S.diffLabel+' · '+S.rows+' × '+S.cols+' · '+S.mines+' 雷';
  els.dailyPill.style.display=S.mode==='daily'?'':'none';
  if(S.mode==='daily'){
    var dd=store.get(LS.daily,null);
    var done=dd&&dd.date===todayKey();
    els.dailyPill.textContent=done?'今日已完成':'#'+dayIndex();
    els.dailyPill.className='pill '+(done?'done':'dim');
    els.dailyPill.style.display='';
  }
  buildBoard();
  fitCells();
  updateHUD();updateFace('calm');updateFoot();
  if(cfg.toastMsg)toast(cfg.toastMsg);
}

function buildBoard(){
  var frag=document.createDocumentFragment();
  cellEls=new Array(S.rows*S.cols);
  els.board.innerHTML='';
  els.board.style.gridTemplateColumns='repeat('+S.cols+',var(--cell))';
  for(var i=0;i<S.rows*S.cols;i++){
    var b=document.createElement('button');
    b.className='cell';
    b.setAttribute('aria-label','第'+(((i/S.cols)|0)+1)+'行 第'+(i%S.cols+1)+'列');
    (function(idx,el){
      el.addEventListener('click',function(){onCellClick(idx)});
      el.addEventListener('contextmenu',function(e){e.preventDefault();if(!S.over)toggleFlag(idx)});
      el.addEventListener('dblclick',function(){onChord(idx)});
      el.addEventListener('auxclick',function(e){if(e.button===1){e.preventDefault();onChord(idx)}});
      var lp=null;
      el.addEventListener('pointerdown',function(e){
        if(e.pointerType!=='mouse'&&!S.over){
          lp=setTimeout(function(){lp=null;suppressClick=Date.now()+600;if(!S.over)toggleFlag(idx);if(navigator.vibrate)navigator.vibrate(30)},380);
        }
      });
      el.addEventListener('pointerup',function(){if(lp){clearTimeout(lp);lp='done'}});
      el.addEventListener('pointerleave',function(){if(lp&&lp!=='done')clearTimeout(lp)});
      el.addEventListener('pointercancel',function(){if(lp&&lp!=='done')clearTimeout(lp)});
    })(i,b);
    cellEls[i]=b;
    frag.appendChild(b);
  }
  els.board.appendChild(frag);
}

function fitCells(){
  var wrapW=Math.min(els.boardCard.parentElement.clientWidth,1040)-48;
  var size=Math.floor((wrapW-(S.cols-1)*2)/S.cols);
  size=Math.max(19,Math.min(34,size));
  document.documentElement.style.setProperty('--cell',size+'px');
}
window.addEventListener('resize',fitCells);

function placeMines(first){
  var exclude=new Set([first]);
  var zone=[];
  forN(first,function(j){zone.push(j)});
  if(S.mines<=S.rows*S.cols-9-zone.length)zone.forEach(function(j){exclude.add(j)});
  var rnd=S.rng||Math.random;
  var mine=null;
  if(noGuess){
    mine=C.generateSolvable(S.rows,S.cols,S.mines,exclude,first,rnd,3500);
    if(!mine)mine=C.randomMines(S.rows,S.cols,S.mines,exclude,rnd);
  }else{
    mine=C.randomMines(S.rows,S.cols,S.mines,exclude,rnd);
  }
  S.mine=mine;
  S.num=C.numsFromMines(S.rows,S.cols,mine);
}

function renderCell(i){
  var el=cellEls[i],st=S.state[i];
  if(st===2){
    el.className='cell';el.innerHTML=ICONS.flag;return;
  }
  if(st===1){
    var n=S.num[i];
    if(S.mine[i]){
      el.className='cell opened mine-show'+(i===S.exploded?' boom':'');
      el.innerHTML=ICONS.mine;return;
    }
    el.className='cell opened';
    el.innerHTML=n?'<span class="n'+n+'">'+n+'</span>':'';
    return;
  }
  el.className='cell';el.innerHTML='';
}

function floodOpenReal(start){
  var order=[],dist={},q=[[start,0]];
  dist[start]=0;
  var stack=[[start,0]];
  while(stack.length){
    var it=stack.pop(),j=it[0],d=it[1];
    if(S.state[j]!==0)continue;
    S.state[j]=1;S.openCount++;order.push(j);dist[j]=d;
    if(S.num[j]===0)forN(j,function(k){if(S.state[k]===0&&!(k in dist)){dist[k]=d+1;stack.push([k,d+1])}});
  }
  order.forEach(function(j){
    var el=cellEls[j];
    renderCell(j);
    el.style.setProperty('--d',dist[j]);
    el.classList.add('reveal');
    setTimeout(function(){el.classList.remove('reveal');el.style.removeProperty('--d')},dist[j]*16+400);
  });
}

function openCell(i){
  if(S.over||S.state[i]!==0)return;
  S.moves.push({t:'o',i:i});
  if(!S.firstDone){
    S.firstDone=true;S.started=true;
    placeMines(i);
    startTimer();
  }
  if(S.mine[i]){lose(i);return}
  audio.open();
  floodOpenReal(i);
  updateHUD();
  checkWin();
}

function toggleFlag(i){
  if(S.over)return;
  if(S.state[i]===1)return;
  S.moves.push({t:'f',i:i});
  if(S.state[i]===2){S.state[i]=0;S.flags--}
  else{S.state[i]=2;S.flags++;audio.flag()}
  renderCell(i);updateHUD();
}

function onChord(i){
  if(S.over||S.state[i]!==1||!S.num[i])return;
  var fl=0;
  forN(i,function(j){if(S.state[j]===2)fl++});
  if(fl!==S.num[i])return;
  S.moves.push({t:'c',i:i});
  var toOpen=[];
  forN(i,function(j){if(S.state[j]===0)toOpen.push(j)});
  for(var k=0;k<toOpen.length;k++){
    if(S.over)break;
    if(S.mine[toOpen[k]]){lose(toOpen[k]);return}
  }
  audio.open();
  toOpen.forEach(function(j){if(S.state[j]===0)floodOpenReal(j)});
  updateHUD();checkWin();
}

function onCellClick(i){
  if(Date.now()<suppressClick)return;
  if(S.over)return;
  if(flagMode&&S.state[i]===0){toggleFlag(i);return}
  if(S.state[i]===1){onChord(i);return}
  openCell(i);
}

function checkWin(){
  if(S.openCount>=S.rows*S.cols-S.mines)winGame();
}

function endStats(win){
  var s=loadStats(),k=statKey();
  if(!(k in s))s[k]=statsBlank();
  var d=s[k];
  d.played++;
  if(win){
    d.won++;d.streak++;if(d.streak>d.best)d.best=d.streak;
    if(d.bestTime===null||S.time<d.bestTime){d.bestTime=S.time;var rec=true}
    if(S.mode==='daily'){store.set(LS.daily,{date:todayKey(),time:S.time})}
  }else{d.streak=0}
  saveStats(s);updateFoot();
  return typeof rec!=='undefined'&&rec;
}

function winGame(){
  S.over=true;S.win=true;stopTimer();audio.win();
  for(var i=0;i<S.rows*S.cols;i++){
    if(S.mine[i]&&S.state[i]!==2){S.state[i]=2;S.flags++;renderCell(i)}
  }
  updateHUD();
  els.board.classList.add('won');
  els.boardCard.classList.add('won-glow');
  cellEls.forEach(function(el,r){el.style.setProperty('--r',(r/S.cols)|0);el.style.setProperty('--c',r%S.cols)});
  fx.celebrate();
  updateFace('win');
  var rec=endStats(true);
  els.bSeal.textContent='胜';
  els.bTitle.textContent=S.mode==='daily'?'每日挑战 · 达成':'完美通关';
  els.bSub.textContent=noGuess?'全程无猜 · 逻辑制胜':'-'+'';
  els.bTime.textContent=fmtTime(S.time);
  els.bRecord.style.display=rec?'':'none';
  els.banner.classList.remove('lose');els.banner.classList.add('show','win');
  submitPlay();
}

function lose(explode){
  S.over=true;S.win=false;S.exploded=explode;stopTimer();
  var er=(explode/S.cols)|0,ec=explode%S.cols;
  var late=[];
  for(var i=0;i<S.rows*S.cols;i++){
    if(S.mine[i]&&S.state[i]!==2)late.push(i);
    else if(!S.mine[i]&&S.state[i]===2)cellEls[i].classList.add('wrongflag');
  }
  fx.blast(explode);
  audio.boom();
  if(navigator.vibrate)navigator.vibrate([60,50,140]);
  screenFlash();
  els.boardCard.classList.remove('shake');void els.boardCard.offsetWidth;els.boardCard.classList.add('shake');
  renderCell(explode);
  requestAnimationFrame(function(){requestAnimationFrame(function(){cellEls[explode].classList.add('boom')})});
  var maxD=0;
  late.forEach(function(j){
    var dr=Math.abs(((j/S.cols)|0)-er),dc=Math.abs(j%S.cols-ec);
    var dd=Math.min(420+Math.max(dr,dc)*85+((dr*7+dc*13)%5)*45,1900);
    if(dd>maxD)maxD=dd;
    S.fxTimers.push(setTimeout(function(){
      if(S.over&&!S.win){S.state[j]=1;renderCell(j);cellEls[j].classList.add('mine-late')}
    },dd));
    S.fxTimers.push(setTimeout(function(){
      if(S.over&&!S.win){fx.burstCell(j);audio.pop()}
    },dd+40));
  });
  updateFace('dead');
  endStats(false);
  els.bSeal.textContent='败';
  els.bTitle.textContent='饮恨触雷';
  els.bSub.textContent='雷区无情 · 卷土重来';
  els.bTime.textContent=fmtTime(S.time);
  els.bRecord.style.display='none';
  els.banner.classList.remove('win');
  S.fxTimers.push(setTimeout(function(){if(S.over&&!S.win)els.banner.classList.add('show','lose')},Math.min(maxD+700,2600)));
  submitPlay();
}

function hint(){
  if(S.over){toast('本局已结束 · 按 R 开新局');return}
  if(!S.firstDone){toast('先翻开任意一格，再使用提示');return}
  if(S.hintsLeft<=0){toast('本局提示已用完');return}
  var state=new Uint8Array(S.rows*S.cols);
  for(var i=0;i<S.rows*S.cols;i++)state[i]=S.state[i];
  var mineTotal=0;for(i=0;i<S.mine.length;i++)mineTotal+=S.mine[i];
  var d=C.deduceOnce(state,S.num,S.rows,S.cols,mineTotal);
  var clearHint=function(idx){
    var el=cellEls[idx];
    el.classList.remove('hint-pulse');void el.offsetWidth;el.classList.add('hint-pulse');
    setTimeout(function(){el.classList.remove('hint-pulse')},3400);
  };
  S.hintsLeft--;
  els.hintBadge.textContent=S.hintsLeft;
  if(S.hintsLeft<=0)els.hintBadge.classList.add('off');
  if(d.safe.length){
    var pick=d.safe[0],best=-1;
    d.safe.forEach(function(x){
      var w=0;forN(x,function(j){if(S.state[j]===1)w++});
      if(w>best){best=w;pick=x}
    });
    if(S.mine[pick]){
      toast('存在误插的旗子 · 推理已被污染');
      audio.flag();
      return;
    }
    clearHint(pick);
    toast('此处可安全翻开 · 推理依据充分');
    audio.flag();
    return;
  }
  if(d.toFlag.length){
    var f=d.toFlag[0];
    if(!S.mine[f]){toast('存在误插的旗子 · 推理已被污染');audio.flag();return}
    if(S.state[f]===2){toast('旗子无误 · 继续推理剩余区域');return}
    clearHint(f);
    toast('此处必为雷 · 可放心插旗');
    audio.flag();
    return;
  }
  var hidden=[];
  for(i=0;i<S.rows*S.cols;i++)if(S.state[i]===0)hidden.push(i);
  if(!hidden.length)return;
  var guess=hidden[0],score=1e9;
  hidden.forEach(function(x){
    var adj=0;forN(x,function(j){if(S.state[j]===1&&S.num[j]>0)adj++});
    if(adj<score){score=adj;guess=x}
  });
  clearHint(guess);
  toast('逻辑已尽 · 建议在此处一搏');
  audio.flag();
}

function renderStatsTable(){
  var s=loadStats();
  var names={beginner:'初级',intermediate:'中级',expert:'高级',daily:'每日挑战'};
  var html='';
  ['beginner','intermediate','expert','daily'].forEach(function(k){
    var d=s[k]||statsBlank();
    html+='<tr><td>'+names[k]+'</td><td>'+(d.bestTime?fmtTime(d.bestTime):'—')+'</td><td>'+d.played+'</td><td>'+d.won+'</td><td>'+(d.played?Math.round(d.won/d.played*100)+'%':'—')+'</td><td>'+d.streak+'</td><td>'+d.best+'</td></tr>';
  });
  els.statsBody.innerHTML=html;
}

function openModal(m){m.classList.add('show')}
function closeModal(m){m.classList.remove('show')}
document.querySelectorAll('.modal').forEach(function(m){
  m.addEventListener('click',function(e){if(e.target===m)closeModal(m)});
  m.querySelectorAll('[data-close]').forEach(function(b){b.addEventListener('click',function(){closeModal(m)})});
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape')document.querySelectorAll('.modal.show').forEach(closeModal);
  var tag=(document.activeElement&&document.activeElement.tagName)||'';
  if(tag==='INPUT'||tag==='TEXTAREA')return;
  if(document.querySelector('.modal.show'))return;
  if(e.key==='r'||e.key==='R')restart();
  else if(e.key==='h'||e.key==='H')hint();
  else if(e.key==='f'||e.key==='F')setFlagMode(!flagMode);
  else if(e.key==='t'||e.key==='T')setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
});

function restart(){
  if(S.mode==='daily'){startDaily(false);return}
  if(S.mode==='custom'){var cu=store.get(LS.custom,{rows:12,cols:18,mines:30});newGame({mode:'custom',diffLabel:'自定义',rows:cu.rows,cols:cu.cols,mines:cu.mines});return}
  var d=DIFFS[S.mode]||DIFFS.beginner;
  newGame({mode:S.mode,rows:d.r,cols:d.c,mines:d.m});
}
function startDaily(fresh){
  var key=dailyDiffKey(),d=DIFFS[key];
  var rng=C.mulberry32(C.hashStr('mines-daily-'+todayKey()));
  var dd=store.get(LS.daily,null);
  newGame({mode:'daily',rows:d.r,cols:d.c,mines:d.m,rng:rng,diffLabel:d.label+' · 每日',toastMsg:fresh?'每日挑战 · '+todayKey():undefined});
  if(dd&&dd.date===todayKey())toast('今日已完成 · 最佳 '+fmtTime(dd.time));
}
function startCustom(){
  var r=parseInt(els.cRows.value,10),c=parseInt(els.cCols.value,10),m=parseInt(els.cMines.value,10);
  r=Math.max(5,Math.min(24,r||9));c=Math.max(5,Math.min(36,c||9));
  m=Math.max(1,Math.min(r*c-10,m||10));
  els.cRows.value=r;els.cCols.value=c;els.cMines.value=m;
  store.set(LS.custom,{rows:r,cols:c,mines:m});
  store.set(LS.diff,'custom');
  setSeg('custom');
  closeModal(els.customModal);
  newGame({mode:'custom',diffLabel:'自定义',rows:r,cols:c,mines:m});
}
function setSeg(k){
  document.querySelectorAll('#seg button').forEach(function(b){b.classList.toggle('on',b.dataset.diff===k)});
}
function setFlagMode(on){
  flagMode=on;
  els.flagModeTile.classList.toggle('on',on);
  els.flagModeVal.textContent=on?'开':'关';
}

els.seg.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  var k=b.dataset.diff;
  if(k==='custom'){openModal(els.customModal);return}
  if(k==='daily'){store.set(LS.diff,'daily');setSeg('daily');startDaily(true);return}
  store.set(LS.diff,k);
  setSeg(k);
  var d=DIFFS[k];
  newGame({mode:k,rows:d.r,cols:d.c,mines:d.m});
});
els.newBtn.addEventListener('click',restart);
els.bAgain.addEventListener('click',restart);
els.faceBtn.addEventListener('click',restart);
els.hintBtn.addEventListener('click',hint);
els.noGuessSw.addEventListener('click',function(){
  noGuess=!noGuess;store.set(LS.noguess,noGuess);updateNoGuessUI();
  toast(noGuess?'无猜模式已开启 · 新局生效':'无猜已关闭 · 新局生效');
});
els.themeBtn.addEventListener('click',function(){setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark')});
els.soundBtn.addEventListener('click',function(){audio.init();setSound(!audio.on)});
els.statsBtn.addEventListener('click',function(){renderStatsTable();openModal(document.getElementById('statsModal'))});
els.helpBtn.addEventListener('click',function(){openModal(document.getElementById('helpModal'))});
els.flagModeTile.addEventListener('click',function(){setFlagMode(!flagMode)});
els.resetStats.addEventListener('click',function(){
  var s={};['beginner','intermediate','expert','daily'].forEach(function(k){s[k]=statsBlank()});
  saveStats(s);renderStatsTable();updateFoot();toast('战绩已清空');
});
els.customGo.addEventListener('click',startCustom);
els.customModal.querySelectorAll('input').forEach(function(inp){
  inp.addEventListener('keydown',function(e){if(e.key==='Enter')startCustom()});
});
els.faceBtn.innerHTML=ICONS.faceCalm+'<span class="fl-label">新局</span>';

var authMode='login';
function setAuthMode(m){
  authMode=m;
  els.tabLogin.classList.toggle('on',m==='login');
  els.tabReg.classList.toggle('on',m==='reg');
  var isGuest=!!(auth.token&&auth.guest);
  if(m==='reg'&&isGuest){
    els.authGo.textContent='升 级 账 号';
    els.authUser.value=auth.user&&auth.user.username&&!/^游客/.test(auth.user.username)?auth.user.username:'';
  }else{
    els.authGo.textContent=m==='login'?'登 录':'注 册';
  }
  els.authErr.textContent='';
  els.emailField.style.display=m==='reg'?'':'none';
  els.codeField.style.display=m==='reg'?'':'none';
}
els.tabLogin.addEventListener('click',function(){setAuthMode('login')});
els.tabReg.addEventListener('click',function(){setAuthMode('reg')});
var codeCd=0,cdTimer=null;
function startCd(){
  codeCd=60;
  els.sendCodeBtn.textContent=codeCd+'s';
  els.sendCodeBtn.disabled=true;
  cdTimer=setInterval(function(){
    codeCd--;
    if(codeCd<=0){clearInterval(cdTimer);els.sendCodeBtn.textContent='发送验证码';els.sendCodeBtn.disabled=false;return}
    els.sendCodeBtn.textContent=codeCd+'s';
  },1000);
}
els.sendCodeBtn.addEventListener('click',function(){
  var em=els.authEmail.value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){els.authErr.textContent='请先填写正确的邮箱';return}
  els.sendCodeBtn.disabled=true;
  api('/auth/email/code',{method:'POST',body:JSON.stringify({email:em})})
    .then(function(d){els.authErr.textContent='';toast(d.message||'验证码已发送');startCd()})
    .catch(function(e){els.authErr.textContent=(e&&e.error)||'发送失败';els.sendCodeBtn.disabled=false});
});
function doAuth(){
  var u=els.authUser.value.trim(),p=els.authPass.value;
  els.authErr.textContent='';
  if(!u||!p){els.authErr.textContent='请输入用户名和密码';return}
  var body={username:u,password:p};
  var isGuest=!!(auth.token&&auth.guest);
  if(authMode==='reg'){
    var em=els.authEmail.value.trim(),cd=els.authCode.value.trim();
    if(em){
      if(!/^\d{6}$/.test(cd)){els.authErr.textContent='请输入 6 位邮箱验证码';return}
      body.email=em;body.code=cd;
    }
  }
  els.authGo.disabled=true;
  var path=authMode==='login'?'/auth/login':(isGuest?'/auth/upgrade':'/auth/register');
  api(path,{method:'POST',body:JSON.stringify(body)})
    .then(function(d){
      var wasGuest=isGuest;
      auth.token=d.token;auth.user=d.user;auth.guest=!!d.guest;saveAuth();renderUserChip();
      closeModal(els.authModal);
      toast(wasGuest?'账号升级成功 · 战绩已继承':'欢迎，'+d.user.username);
    })
    .catch(function(e){els.authErr.textContent=(e&&e.error)||'网络异常，稍后再试'})
    .then(function(){els.authGo.disabled=false});
}
els.authGo.addEventListener('click',doAuth);
els.authPass.addEventListener('keydown',function(e){if(e.key==='Enter')doAuth()});
els.authUser.addEventListener('keydown',function(e){if(e.key==='Enter')els.authPass.focus()});
els.userChip.addEventListener('click',function(){
  if(!auth.token){setAuthMode('login');openModal(els.authModal);setTimeout(function(){els.authUser.focus()},80);return}
  var u=auth.user||{};
  els.acctName.textContent=u.username||'';
  els.acctSince.textContent=(u.email?(u.email+' · '):'')+('注册于 '+(u.created_at||'').slice(0,10));
  if(auth.guest){
    els.acctRecent.innerHTML='<div style="text-align:center;padding:4px 0;color:var(--muted)">游客账号<br><span style="font-size:11px;color:var(--faint)">升级正式账号可自定义名字并继承战绩</span></div>';
    els.acctUpgrade.style.display='';
  }else{
    els.acctUpgrade.style.display='none';
    els.acctLb.style.display='';
    els.acctRecent.innerHTML='<div style="text-align:center;color:var(--faint)">登录状态加载中…</div>';
  }
  openModal(els.acctModal);
  if(!auth.guest){
    api('/auth/me/recent').then(function(d){
      var rows=(d.rows||[]).filter(function(r){return r.ok});
      if(!rows.length){els.acctRecent.innerHTML='<div style="text-align:center;color:var(--faint)">暂无登录记录</div>';return}
      var r=rows[0];
      els.acctRecent.innerHTML='<div style="text-align:center;padding:4px 0">'
        +'<span style="color:#86d99c">● 在线</span>'
        +'<span style="color:var(--faint);font-size:11px">　最近登录：'+esc(r.ua)+' · '+r.at+'</span>'
        +'</div>';
    }).catch(function(){els.acctRecent.innerHTML=''});
  }
});
els.acctLogout.addEventListener('click',function(){
  auth.token=null;auth.user=null;saveAuth();renderUserChip();
  closeModal(els.acctModal);toast('已退出 · 转为游客模式');
});
els.acctUpgrade.addEventListener('click',function(){
  closeModal(els.acctModal);
  setAuthMode('reg');
  openModal(els.authModal);
  setTimeout(function(){els.authUser.focus()},80);
});
els.acctLb.addEventListener('click',function(){closeModal(els.acctModal);openLb()});

var lbMode='beginner';
function fmtMs(ms){return fmtTime(Math.round(ms/1000))}
function openLb(){
  openModal(els.lbModal);
  document.querySelectorAll('#lbTabs button').forEach(function(b){b.classList.toggle('on',b.dataset.mode===lbMode)});
  loadLb();
}
function loadLb(){
  els.lbBody.innerHTML='<div class="lb-empty">加载中…</div>';
  els.lbMyRow.style.display='none';
  api('/leaderboard/mines?mode='+lbMode).then(function(d){
    if(!d.rows.length){els.lbBody.innerHTML='<div class="lb-empty">虚位以待 · 成为第一个上榜的人</div>';return}
    var html='<table class="lb"><thead><tr><th>#</th><th style="text-align:left">玩家</th><th>最佳用时</th><th>胜场</th><th>最近</th></tr></thead><tbody>';
    d.rows.forEach(function(r){
      var meCls=(auth.user&&r.username===auth.user.username)?' class="me"':'';
      html+='<tr'+meCls+'><td class="rk">'+r.rank+'</td><td class="user">'+esc(r.username)+'</td><td>'+fmtMs(r.best)+'</td><td>'+r.wins+'</td><td style="color:var(--faint)">'+r.lastDay+'</td></tr>';
    });
    html+='</tbody></table>';
    els.lbBody.innerHTML=html;
    if(d.me){
      els.lbMyRow.style.display='';
      els.lbMyRow.textContent='我的名次：第 '+d.me.rank+' 名 · 最佳 '+fmtMs(d.me.best)+' · '+d.me.wins+' 胜';
    }
  }).catch(function(){els.lbBody.innerHTML='<div class="lb-empty">加载失败 · 稍后再试</div>'});
}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
els.lbBtn.addEventListener('click',openLb);
els.lbTabs.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  lbMode=b.dataset.mode;
  document.querySelectorAll('#lbTabs button').forEach(function(x){x.classList.toggle('on',x===b)});
  loadLb();
});

updateNoGuessUI();
var lastDiff=store.get(LS.diff,'beginner');
if(lastDiff==='daily'){setSeg('daily');startDaily(false)}
else{
  if(lastDiff==='custom'){
    var cu=store.get(LS.custom,{rows:12,cols:18,mines:30});
    els.cRows.value=cu.rows;els.cCols.value=cu.cols;els.cMines.value=cu.mines;
    setSeg('custom');
    newGame({mode:'custom',diffLabel:'自定义',rows:cu.rows,cols:cu.cols,mines:cu.mines});
  }else{
    var ld=DIFFS[lastDiff]?lastDiff:'beginner';
    setSeg(ld);
    var dd2=DIFFS[ld];
    newGame({mode:ld,rows:dd2.r,cols:dd2.c,mines:dd2.m});
  }
}
window.addEventListener('contextmenu',function(e){if(e.target.closest('#board'))e.preventDefault()});
})();
