import './style.css';
import { mountBrand, setFavicon, svgFavicon } from '@wg/ui';
setFavicon(svgFavicon('0 0 100 100', `<rect width='100' height='100' rx='20' fill='#7b2ff7'/><text x='50' y='52' font-size='40' font-weight='800' fill='#fff' font-family='Arial' text-anchor='middle' dominant-baseline='central'>2048</text>`));
mountBrand();
(function(){
  const SIZE=4;
  const boardEl=document.getElementById('board');
  const tilesEl=document.getElementById('tiles');
  const scoreEl=document.getElementById('score');
  const bestEl=document.getElementById('best');
  const overlay=document.getElementById('overlay');
  const ovTitle=document.getElementById('ovTitle');
  const ovText=document.getElementById('ovText');
  document.getElementById('newBtn').onclick=newGame;
  document.getElementById('ovBtn').onclick=newGame;

  // 背景格子
  for(let i=0;i<SIZE*SIZE;i++){const c=document.createElement('div');c.className='cell';boardEl.appendChild(c);}

  const COLORS={
    2:'#3a4374',4:'#4152a0',8:'#5a3fb5',16:'#7b2ff7',32:'#a32ff7',
    64:'#d62fae',128:'#f0537c',256:'#ff6b3d',512:'#ff9e2c',1024:'#ffc828',
    2048:'#29e06f',4096:'#00d4ff',8192:'#00ffd0'
  };
  function colorFor(v){return COLORS[v]||'#00ffd0';}
  function textColorFor(v){return v<=4?'#aeb6e6':'#0d1024';}
  function fontFor(v){return v<100?30:v<1000?26:v<10000?22:18;}

  let grid,score,best=+localStorage.getItem('best2048')||0,cells,tileSize,gap,pad,won,over,idSeq;
  bestEl.textContent=best;

  function measure(){
    const rect=boardEl.getBoundingClientRect();
    pad=12;gap=12;
    tileSize=(rect.width-pad*2-gap*(SIZE-1))/SIZE;
    cells=[];
    for(let r=0;r<SIZE;r++){
      cells[r]=[];
      for(let c=0;c<SIZE;c++){
        cells[r][c]={x:pad+c*(tileSize+gap),y:pad+r*(tileSize+gap)};
      }
    }
  }
  window.addEventListener('resize',()=>{measure();render(true);});

  function emptyGrid(){grid=[];for(let r=0;r<SIZE;r++)grid[r]=new Array(SIZE).fill(null);}

  function addRandom(){
    const spots=[];
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(!grid[r][c])spots.push([r,c]);
    if(!spots.length)return;
    const [r,c]=spots[Math.floor(Math.random()*spots.length)];
    const v=Math.random()<0.9?2:4;
    grid[r][c]={v,id:++idSeq,merged:false,isNew:true};
  }

  function newGame(){
    idSeq=0;score=0;won=false;over=false;
    emptyGrid();addRandom();addRandom();
    scoreEl.textContent=score;
    overlay.classList.remove('show');
    measure();render();draw();
  }

  function render(noanim){
    tilesEl.innerHTML='';
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      const t=grid[r][c];if(!t)continue;
      const el=document.createElement('div');
      el.className='tile';
      if(t.isNew)el.classList.add('new');
      if(t.merged)el.classList.add('merged');
      el.textContent=t.v;
      el.style.width=tileSize+'px';el.style.height=tileSize+'px';
      el.style.left=cells[r][c].x+'px';el.style.top=cells[r][c].y+'px';
      el.style.background=colorFor(t.v);
      el.style.color=textColorFor(t.v);
      el.style.fontSize=fontFor(t.v)+'px';
      tilesEl.appendChild(el);
    }
  }

  function draw(){
    scoreEl.textContent=score;
    if(score>best){best=score;localStorage.setItem('best2048',best);}
    bestEl.textContent=best;
  }

  function clearFlags(){for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){if(grid[r][c]){grid[r][c].isNew=false;grid[r][c].merged=false;}}}

  function move(dir){
    if(over)return;
    clearFlags();
    let moved=false,vec=getVec(dir),traversals=buildTraversals(vec);
    for(const r of traversals.rows){
      for(const c of traversals.cols){
        const t=grid[r][c];if(!t)continue;
        let nr=r,nc=c,far={r,nc:c}; // find farthest
        // step
        let cur={r,c};
        while(true){
          const tr2=cur.r+vec.r,tc2=cur.c+vec.c;
          if(tr2<0||tr2>=SIZE||tc2<0||tc2>=SIZE)break;
          cur={r:tr2,c:tc2};
        }
        // cur = farthest empty position before wall
        // walk back from cur to find farthest empty
        let fr=cur.r,fc=cur.c;
        // find farthest empty starting from r,c in direction
        let pr=r,pc=c;
        while(true){
          const tr2=pr+vec.r,tc2=pc+vec.c;
          if(tr2<0||tr2>=SIZE||tc2<0||tc2>=SIZE)break;
          if(grid[tr2][tc2]){break;}
          pr=tr2;pc=tc2;
        }
        // check merge target
        const mr=pr+vec.r,mc=pc+vec.c;
        if(mr>=0&&mr<SIZE&&mc>=0&&mc<SIZE){
          const tgt=grid[mr][mc];
          if(tgt&&tgt.v===t.v&&!tgt.merged){
            grid[r][c]=null;
            const merged={v:t.v*2,id:++idSeq,merged:true,isNew:false};
            grid[mr][mc]=merged;
            score+=merged.v;
            if(merged.v===2048&&!won)won=true;
            moved=true;
            continue;
          }
        }
        if(pr!==r||pc!==c){
          grid[r][c]=null;grid[pr][pc]=t;moved=true;
        }
      }
    }
    if(moved){
      addRandom();
      render();
      draw();
      if(isOver()){
        over=true;
        ovTitle.textContent='游戏结束';
        ovText.textContent='得分 '+score;
        setTimeout(()=>overlay.classList.add('show'),220);
      }else if(won){
        ovTitle.textContent='达成 2048!';
        ovText.textContent='得分 '+score+' · 可继续挑战';
        setTimeout(()=>overlay.classList.add('show'),220);
        won='shown';
      }
    }
  }

  function getVec(dir){return {0:{r:-1,c:0},1:{r:0,c:1},2:{r:1,c:0},3:{r:0,c:-1}}[dir];}
  function buildTraversals(v){
    const rows=[],cols=[];
    for(let i=0;i<SIZE;i++){rows.push(i);cols.push(i);}
    if(v.r===1)rows.reverse();
    if(v.c===1)cols.reverse();
    return {rows,cols};
  }
  function isOver(){
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      if(!grid[r][c])return false;
      const v=grid[r][c].v;
      if(r+1<SIZE&&grid[r+1][c]&&grid[r+1][c].v===v)return false;
      if(c+1<SIZE&&grid[r][c+1]&&grid[r][c+1].v===v)return false;
    }
    return true;
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
