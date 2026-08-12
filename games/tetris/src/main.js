import './style.css';
import { mountBrand, setFavicon, svgFavicon } from '@wg/ui';
setFavicon(svgFavicon('0 0 100 100', `<rect width='100' height='100' rx='20' fill='#c4b89c'/><rect x='14' y='14' width='72' height='50' rx='4' fill='#9bbc0f'/><rect x='22' y='22' width='14' height='14' fill='#0f380f'/><rect x='40' y='22' width='14' height='14' fill='#306230'/><rect x='58' y='22' width='14' height='14' fill='#8bac0f'/><rect x='22' y='40' width='14' height='14' fill='#8bac0f'/><rect x='58' y='40' width='14' height='14' fill='#0f380f'/><circle cx='30' cy='80' r='6' fill='#8a3b2e'/><rect x='46' y='76' width='34' height='8' rx='4' fill='#4a4a4a'/>`));
mountBrand();
(function(){
  const COLS=10,ROWS=20;
  // Game Boy 四阶绿屏配色：不同方块用不同深浅区分
  // Game Boy 四阶绿屏配色：拉开方块与屏幕底色的间距，避免过黑/过浅
  const COLORS={I:'#2a5a2a',J:'#3d7a2e',L:'#5a8f3a',O:'#7aa845',S:'#5a8f3a',T:'#3d7a2e',Z:'#2a5a2a'};
  // 形状定义（矩阵）
  const SHAPES={
    I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O:[[1,1],[1,1]],
    T:[[0,1,0],[1,1,1],[0,0,0]],
    S:[[0,1,1],[1,1,0],[0,0,0]],
    Z:[[1,1,0],[0,1,1],[0,0,0]],
    J:[[1,0,0],[1,1,1],[0,0,0]],
    L:[[0,0,1],[1,1,1],[0,0,0]]
  };
  const TYPES=Object.keys(SHAPES);

  const board=document.getElementById('board');
  const ctx=board.getContext('2d');
  const nextC=document.getElementById('next');
  const nctx=nextC.getContext('2d');
  const scoreEl=document.getElementById('score'),levelEl=document.getElementById('level'),linesEl=document.getElementById('lines'),bestEl=document.getElementById('best');
  const overlay=document.getElementById('overlay'),ovTitle=document.getElementById('ovTitle'),ovText=document.getElementById('ovText');

  let CELL=30;
  function fit(){
    const mobile=window.matchMedia('(max-width:560px)').matches;
    // 移动机壳纵向布局：高度要留给 顶部条+信息栏+底部按钮
    const reservedH=mobile?300:220;
    const maxH=Math.min(window.innerHeight-reservedH,640);
    const maxW=Math.min(window.innerWidth-(mobile?40:30),mobile?280:340);
    CELL=Math.floor(Math.max(14,Math.min(maxH/ROWS,maxW/COLS)));
    board.width=COLS*CELL;board.height=ROWS*CELL;
    // 同步 next 预览 canvas 内部分辨率 = 显示尺寸，避免 CSS 拉伸变形
    syncNextCanvas();
    draw();
    drawNext();
  }
  function syncNextCanvas(){
    const rect=nextC.getBoundingClientRect();
    if(rect.width>0){nextC.width=Math.round(rect.width);nextC.height=Math.round(rect.height);}
  }
  window.addEventListener('resize',fit);

  let grid,cur,next,score,level,lines,best=+localStorage.getItem('bestTetris')||0,dropAcc,lastTime,dropInt,over,paused,rAF;
  bestEl.textContent=best;

  function newGrid(){grid=[];for(let r=0;r<ROWS;r++)grid[r]=new Array(COLS).fill(null);}

  function clone(t){return SHAPES[t].map(row=>row.slice());}
  function rotate(mat){
    const N=mat.length,res=mat.map(()=>new Array(N).fill(0));
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)res[c][N-1-r]=mat[r][c];
    return res;
  }

  function spawn(){
    const t=next||randType();next=randType();
    cur={type:t,mat:clone(t),x:Math.floor((COLS-SHAPES[t][0].length)/2),y:t==='I'?-1:0};
    drawNext();
    if(collides(cur.mat,cur.x,cur.y)){gameOver();}
  }
  function randType(){return TYPES[Math.floor(Math.random()*TYPES.length)];}

  function collides(mat,px,py){
    for(let r=0;r<mat.length;r++)for(let c=0;c<mat[r].length;c++){
      if(!mat[r][c])continue;
      const x=px+c,y=py+r;
      if(x<0||x>=COLS||y>=ROWS)return true;
      if(y>=0&&grid[y][x])return true;
    }
    return false;
  }

  function merge(){
    for(let r=0;r<cur.mat.length;r++)for(let c=0;c<cur.mat[r].length;c++){
      if(cur.mat[r][c]){const y=cur.y+r;if(y>=0)grid[y][cur.x+c]=cur.type;}
    }
  }

  function clearLines(){
    let cleared=0;
    for(let r=ROWS-1;r>=0;r--){
      if(grid[r].every(v=>v)){grid.splice(r,1);grid.unshift(new Array(COLS).fill(null));cleared++;r++;}
    }
    if(cleared){
      const pts=[0,100,300,500,800][cleared]*level;
      score+=pts;lines+=cleared;
      const nl=Math.floor(lines/10)+1;
      if(nl!==level){level=nl;dropInt=Math.max(80,800-(level-1)*70);}
      update();
    }
  }

  function update(){
    scoreEl.textContent=score;levelEl.textContent=level;linesEl.textContent=lines;
    if(score>best){best=score;localStorage.setItem('bestTetris',best);}
    bestEl.textContent=best;
  }

  function ghostY(){
    let y=cur.y;while(!collides(cur.mat,cur.x,y+1))y++;return y;
  }

  // Game Boy 像素描边：每格深色底 + 中间亮块，营造点阵感
  function drawCell(c,x,y,color,alpha){
    const px=x*CELL,py=y*CELL;
    if(py+CELL<0)return;
    c.globalAlpha=alpha==null?1:alpha;
    // 深底（描边）— 软化深绿，避免纯黑感
    c.fillStyle='#1f3a1f';
    c.fillRect(px,py,CELL,CELL);
    // 内部亮块
    c.fillStyle=color;
    c.fillRect(px+2,py+2,CELL-4,CELL-4);
    // 右下阴影（像素感）
    c.fillStyle='#1f3a1f';
    c.fillRect(px+CELL-4,py+2,2,CELL-4);
    c.fillRect(px+2,py+CELL-4,CELL-4,2);
    c.globalAlpha=1;
  }

  function draw(){
    ctx.clearRect(0,0,board.width,board.height);
    // 网格线（绿屏点阵感）
    ctx.strokeStyle='rgba(31,58,31,.18)';ctx.lineWidth=1;
    for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*CELL,0);ctx.lineTo(x*CELL,board.height);ctx.stroke();}
    for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*CELL);ctx.lineTo(board.width,y*CELL);ctx.stroke();}
    // 已固定方块
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(grid[r][c])drawCell(ctx,c,r,COLORS[grid[r][c]]);
    if(cur){
      // 影子
      const gy=ghostY();
      for(let r=0;r<cur.mat.length;r++)for(let c=0;c<cur.mat[r].length;c++){
        if(cur.mat[r][c]){const y=gy+r;if(y>=0)drawCell(ctx,cur.x+c,y,COLORS[cur.type],0.22);}
      }
      // 当前方块
      for(let r=0;r<cur.mat.length;r++)for(let c=0;c<cur.mat[r].length;c++){
        if(cur.mat[r][c]){const y=cur.y+r;if(y>=0)drawCell(ctx,cur.x+c,y,COLORS[cur.type]);}
      }
    }
  }

  function drawNext(){
    nctx.clearRect(0,0,nextC.width,nextC.height);
    if(!next)return;
    const mat=SHAPES[next];
    // 计算实际边界
    let minR=99,maxR=-1,minC=99,maxC=-1;
    for(let r=0;r<mat.length;r++)for(let c=0;c<mat[r].length;c++)if(mat[r][c]){minR=Math.min(minR,r);maxR=Math.max(maxR,r);minC=Math.min(minC,c);maxC=Math.max(maxC,c);}
    const w=maxC-minC+1,h=maxR-minR+1;
    const cs=Math.floor(Math.min(nextC.width/(w+1),nextC.height/(h+1)));
    const ox=(nextC.width-w*cs)/2,oy=(nextC.height-h*cs)/2;
    for(let r=minR;r<=maxR;r++)for(let c=minC;c<=maxC;c++){
      if(mat[r][c]){
        const px=ox+(c-minC)*cs,py=oy+(r-minR)*cs;
        nctx.fillStyle='#1f3a1f';nctx.fillRect(px,py,cs,cs);
        nctx.fillStyle=COLORS[next];nctx.fillRect(px+2,py+2,cs-4,cs-4);
      }
    }
  }

  function move(dx,dy){if(over||paused||!cur)return false;if(!collides(cur.mat,cur.x+dx,cur.y+dy)){cur.x+=dx;cur.y+=dy;draw();return true;}return false;}
  function rot(){
    if(over||paused||!cur)return;
    if(cur.type==='O')return;
    const r=rotate(cur.mat);
    // 类 SRS 墙踢：原位 → 水平 → 向上 → 斜上（y 向下为正,向上=-1）
    const kicks=[[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0],[0,-2]];
    for(const [kx,ky] of kicks){
      if(!collides(r,cur.x+kx,cur.y+ky)){cur.mat=r;cur.x+=kx;cur.y+=ky;draw();return;}
    }
  }
  function softDrop(){if(move(0,1))score+=1;update();}
  function hardDrop(){if(over||paused||!cur)return;let d=0;while(!collides(cur.mat,cur.x,cur.y+1)){cur.y++;d++;}score+=d*2;lock();}
  function lock(){merge();clearLines();spawn();draw();update();}

  function step(ts){
    if(over||paused){rAF=null;return;}
    if(!lastTime)lastTime=ts;
    const dt=ts-lastTime;lastTime=ts;dropAcc+=dt;
    if(dropAcc>=dropInt){dropAcc=0;if(!collides(cur.mat,cur.x,cur.y+1)){cur.y++;draw();}else lock();}
    rAF=requestAnimationFrame(step);
  }
  function startLoop(){if(!rAF){lastTime=0;dropAcc=0;rAF=requestAnimationFrame(step);}}
  function stopLoop(){if(rAF){cancelAnimationFrame(rAF);rAF=null;}}

  function gameOver(){
    over=true;stopLoop();
    ovTitle.textContent='游戏结束';ovText.textContent='得分 '+score+' · 等级 '+level;
    overlay.classList.add('show');
  }

  function togglePause(){
    if(over||!cur)return;
    paused=!paused;
    document.getElementById('pauseBtn').textContent=paused?'继续':'暂停';
    if(paused){stopLoop();ovTitle.textContent='已暂停';ovText.textContent='按 P 或点击继续';overlay.classList.add('show');}
    else{overlay.classList.remove('show');startLoop();}
  }

  function showStart(){
    over=false;paused=false;score=0;level=1;lines=0;cur=null;next=randType();
    document.getElementById('pauseBtn').textContent='暂停';
    newGrid();update();drawNext();draw();
    ovTitle.textContent='俄罗斯方块';
    ovText.textContent='方向键移动 · ↑ 旋转 · 空格硬降';
    document.getElementById('ovBtn').textContent='开始游戏';
    document.getElementById('newBtn').textContent='开始';
    overlay.classList.add('show');
  }

  function newGame(){
    over=false;paused=false;score=0;level=1;lines=0;dropInt=800;next=null;
    document.getElementById('pauseBtn').textContent='暂停';
    document.getElementById('ovBtn').textContent='再来一局';
    document.getElementById('newBtn').textContent='重开';
    overlay.classList.remove('show');
    newGrid();spawn();update();draw();startLoop();
  }

  // 输入
  document.getElementById('newBtn').onclick=newGame;
  document.getElementById('ovBtn').onclick=newGame;
  document.getElementById('pauseBtn').onclick=togglePause;
  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();
    switch(e.key){
      case 'ArrowLeft':move(-1,0);break;
      case 'ArrowRight':move(1,0);break;
      case 'ArrowDown':softDrop();break;
      case 'ArrowUp':case 'x':case 'X':rot();break;
      case ' ':hardDrop();break;
      case 'p':case 'P':togglePause();break;
      case 'r':case 'R':newGame();break;
    }
  });
  document.getElementById('dpad').addEventListener('click',e=>{
    const a=e.target.dataset.act;if(!a)return;
    if(a==='left')move(-1,0);else if(a==='right')move(1,0);
    else if(a==='rot')rot();else if(a==='down')softDrop();else if(a==='drop')hardDrop();
  });

  fit();showStart();
})();
