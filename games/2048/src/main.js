import './style.css';
import './2048-core.js'; // side-effect：挂载 globalThis.Core2048（与服务端共用引擎）
import { mountBrand, setFavicon, svgFavicon } from '@wg/ui';
import { mountGameApi } from '@wg/ui/gameapi';
const C = globalThis.Core2048;
setFavicon(svgFavicon('0 0 100 100', `<rect width='100' height='100' rx='20' fill='#f65e3b'/><text x='50' y='52' font-size='40' font-weight='800' fill='#fff' font-family='Arial' text-anchor='middle' dominant-baseline='central'>2048</text>`));
mountBrand();
(function(){
  const SIZE=4;
  const SLIDE_MS=130;
  const boardEl=document.getElementById('board');
  const tilesEl=document.getElementById('tiles');
  const scoreEl=document.getElementById('score');
  const bestEl=document.getElementById('best');
  const overlay=document.getElementById('overlay');
  const ovTitle=document.getElementById('ovTitle');
  const ovText=document.getElementById('ovText');
  const confettiEl=document.getElementById('confetti');
  const scoreBox=scoreEl.closest('.score-box');
  document.getElementById('newBtn').onclick=newGame;
  document.getElementById('ovBtn').onclick=newGame;

  // 云端战绩（gameapi：账号 + 排行榜 + 服务端重放验证）
  const gapi=mountGameApi({
    game:'2048', lsKey:'g2048',
    modes:[{id:'classic',label:'经典'}],
    chip:document.getElementById('userChip'),
    lbBtn:document.getElementById('lbBtn')
  });

  // 背景格子
  for(let i=0;i<SIZE*SIZE;i++){const c=document.createElement('div');c.className='cell';boardEl.appendChild(c);}

  // 每级方块皮肤:[渐变起, 渐变止, 文字色](经典暖米色系)
  const SKIN={
    2:['#f5efe6','#eee4da','#776e65'],
    4:['#f2e8d0','#ede0c8','#776e65'],
    8:['#f5bd8d','#f2b179','#f9f6f2'],
    16:['#f7a377','#f59563','#ffffff'],
    32:['#f78d6d','#f67c5f','#ffffff'],
    64:['#f76b4e','#f65e3b','#ffffff'],
    128:['#efd47f','#edcf72','#f9f6f2'],
    256:['#eed36e','#edcc61','#f9f6f2'],
    512:['#eed157','#edc850','#f9f6f2'],
    1024:['#edce45','#edc53f','#f9f6f2'],
    2048:['#edc72f','#edc22e','#f9f6f2'],
    4096:['#6b675f','#3c3a32','#f9f6f2'],
    8192:['#55514a','#2e2c26','#ffd700']
  };
  function skinFor(v){return SKIN[v]||['#55514a','#2e2c26','#ffd700'];}
  function glowFor(v){
    const c=skinFor(v)[1];
    if(v>=2048)return`0 0 26px ${c}88,0 6px 16px rgba(150,125,100,.3)`;
    if(v>=128)return`0 0 14px ${c}66,0 5px 12px rgba(150,125,100,.28)`;
    return'0 4px 10px rgba(150,125,100,.3)';
  }
  function fontFor(v){return Math.round(tileSize*(v<100?.44:v<1000?.37:v<10000?.3:.24));}

  let G,dirs,startTs,best=+localStorage.getItem('best2048')||0,cells,tileSize,gap,pad,won;
  let tileEls=new Map(),animating=false,pendingNew=null,resolveTimer=null,submitted=false;
  bestEl.textContent=best;

  function genSeed(){
    const b=new Uint8Array(8);(self.crypto||self.msCrypto).getRandomValues(b);
    return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
  }

  function measure(){
    // offsetWidth 不受入场动画 transform 影响,getBoundingClientRect 会读到缩放中的尺寸
    const bw=boardEl.offsetWidth;
    pad=12;gap=12;
    tileSize=(bw-pad*2-gap*(SIZE-1))/SIZE;
    cells=[];
    for(let r=0;r<SIZE;r++){
      cells[r]=[];
      for(let c=0;c<SIZE;c++){
        cells[r][c]={x:pad+c*(tileSize+gap),y:pad+r*(tileSize+gap)};
      }
    }
  }

  function place(el,r,c){el.style.transform=`translate(${cells[r][c].x}px,${cells[r][c].y}px)`;}

  function makeTileEl(t){
    const el=document.createElement('div');
    el.className='tile';
    const [g1,g2,fg]=skinFor(t.v);
    el.style.width=el.style.height=tileSize+'px';
    el.style.background=`linear-gradient(145deg,${g1},${g2})`;
    el.style.color=fg;
    el.style.fontSize=fontFor(t.v)+'px';
    el.style.boxShadow=glowFor(t.v);
    if(t.v>=128)el.classList.add('shine');
    if(t.v>=2048)el.classList.add('max');
    el.textContent=t.v;
    return el;
  }

  function spawnTile(r,c,v,cls,delay){
    const el=makeTileEl({v});
    place(el,r,c);
    if(delay)el.style.animationDelay=delay+'ms';
    if(cls)el.classList.add(cls);
    el.addEventListener('animationend',()=>{el.classList.remove('new','merged');el.style.animationDelay='';},{once:true});
    tilesEl.appendChild(el);
    return el;
  }

  // 从 grid 全量重建 DOM(用于开局/窗口变化)
  function rebuild(staggerNew){
    tilesEl.innerHTML='';tileEls.clear();
    let n=0;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      const t=G.grid[r][c];if(!t)continue;
      const el=spawnTile(r,c,t.v,staggerNew?'new':null,staggerNew?(n++)*70:0);
      tileEls.set(t.id,el);
    }
  }

  function cancelAnim(){clearTimeout(resolveTimer);animating=false;pendingNew=null;}
  window.addEventListener('resize',()=>{cancelAnim();measure();rebuild(false);});

  function newGame(){
    cancelAnim();
    G=C.createGame(genSeed());C.startGame(G);
    dirs=[];startTs=performance.now();won=false;submitted=false;
    scoreEl.textContent=G.score;
    overlay.classList.remove('show');
    confettiEl.innerHTML='';
    measure();rebuild(true);
  }

  function draw(gained){
    scoreEl.textContent=G.score;
    if(G.score>best){best=G.score;localStorage.setItem('best2048',best);}
    bestEl.textContent=best;
    if(gained>0){
      scoreBox.classList.remove('bump');void scoreBox.offsetWidth;scoreBox.classList.add('bump');
      const f=document.createElement('div');
      f.className='score-float';f.textContent='+'+gained;
      scoreBox.appendChild(f);
      f.addEventListener('animationend',()=>f.remove(),{once:true});
    }
  }

  function nudge(dir){
    const cls=['nudge-up','nudge-right','nudge-down','nudge-left'][dir];
    boardEl.classList.remove('nudge-up','nudge-right','nudge-down','nudge-left');
    void boardEl.offsetWidth;
    boardEl.classList.add(cls);
  }

  function resolveAnims(anims){
    for(const a of anims){
      if(a.type!=='merge')continue;
      const ea=tileEls.get(a.srcId),eb=tileEls.get(a.dstId);
      if(ea)ea.remove();if(eb)eb.remove();
      tileEls.delete(a.srcId);tileEls.delete(a.dstId);
      tileEls.set(a.newId,spawnTile(a.r,a.c,a.v,'merged'));
    }
    if(pendingNew){
      const el=spawnTile(pendingNew.r,pendingNew.c,pendingNew.v,'new');
      tileEls.set(pendingNew.id,el);
      pendingNew=null;
    }
    animating=false;
  }

  function move(dir){
    if(!G||G.over||animating)return;
    // 引擎推进（确定性：种子出块 + 重放同构），返回动画描述
    const r=C.move(G,dir);
    if(!r.moved)return;
    dirs.push(dir);
    const anims=r.anims;
    animating=true;
    nudge(dir);
    // 阶段一:滑动现有元素(CSS transition 接管)
    for(const a of anims){
      if(a.type==='slide')place(tileEls.get(a.id),a.r,a.c);
      else place(tileEls.get(a.srcId),a.r,a.c);
    }
    pendingNew=r.spawn;
    resolveTimer=setTimeout(()=>resolveAnims(anims),SLIDE_MS);
    draw(r.gained);
    checkEnd(r);
  }

  function submitPlay(){
    if(submitted)return;
    submitted=true;
    gapi.submitPlay({
      mode:'classic',won:true,score:G.score,
      detail:{seed:G.seed,moves:C.serializeMoves(dirs),timeMs:Math.round(performance.now()-startTs),score:G.score}
    });
  }

  function checkEnd(r){
    if(r.over){
      submitPlay();
      ovTitle.textContent='游戏结束';
      ovText.textContent='得分 '+G.score;
      setTimeout(()=>overlay.classList.add('show'),300);
    }else if(r.won2048&&won!==true&&won!=='shown'){
      won=true;
      ovTitle.textContent='达成 2048!';
      ovText.textContent='得分 '+G.score+' · 可继续挑战';
      setTimeout(()=>{overlay.classList.add('show');confettiBurst();},300);
    }
  }

  function confettiBurst(){
    const colors=['#f65e3b','#edc22e','#f2b179','#f67c5f','#edc53f','#8f7a66'];
    for(let i=0;i<48;i++){
      const p=document.createElement('i');
      p.style.left=Math.random()*100+'%';
      p.style.background=colors[i%colors.length];
      p.style.width=(6+Math.random()*5)+'px';
      p.style.height=(10+Math.random()*8)+'px';
      p.style.animationDuration=(.9+Math.random()*.9)+'s';
      p.style.animationDelay=(Math.random()*.35)+'s';
      p.style.setProperty('--dx',(Math.random()*140-70)+'px');
      p.style.setProperty('--rot',(360+Math.random()*540)+'deg');
      p.addEventListener('animationend',()=>p.remove(),{once:true});
      confettiEl.appendChild(p);
    }
  }

  // 键盘
  const KEYMAP={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3,w:0,d:1,s:2,a:3,W:0,D:1,S:2,A:3};
  window.addEventListener('keydown',e=>{
    if(e.key in KEYMAP){e.preventDefault();move(KEYMAP[e.key]);}
  });

  // 触摸
  let tx,ty;
  boardEl.addEventListener('touchstart',e=>{const t=e.touches[0];tx=t.clientX;ty=t.clientY;},{passive:true});
  boardEl.addEventListener('touchend',e=>{
    if(tx==null)return;const t=e.changedTouches[0];
    const dx=t.clientX-tx,dy=t.clientY-ty,ax=Math.abs(dx),ay=Math.abs(dy);
    if(Math.max(ax,ay)<24)return;
    if(ax>ay)move(dx>0?1:3);else move(dy>0?2:0);
    tx=null;
  },{passive:true});

  newGame();
})();
