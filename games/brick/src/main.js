import './style.css';
import { mountBrand, setFavicon, svgFavicon } from '@wg/ui';
setFavicon(svgFavicon('0 0 100 100', `<rect width='100' height='100' rx='20' fill='#0d0a08'/><rect x='14' y='20' width='18' height='10' rx='2' fill='#f59e0b'/><rect x='36' y='20' width='18' height='10' rx='2' fill='#ef4444'/><rect x='58' y='20' width='18' height='10' rx='2' fill='#fbbf24'/><rect x='28' y='36' width='34' height='8' rx='4' fill='#f97316'/><circle cx='45' cy='68' r='6' fill='#fff'/>`));
mountBrand();
(function(){
  const canvas=document.getElementById('game');
  const ctx=canvas.getContext('2d');
  const scoreEl=document.getElementById('score'),levelEl=document.getElementById('level'),livesEl=document.getElementById('lives');
  const overlay=document.getElementById('overlay'),ovTitle=document.getElementById('ovTitle'),ovText=document.getElementById('ovText');

  const W=440,H=520;
  let scale=1;
  function fit(){
    const maxW=Math.min(window.innerWidth-28,460);
    const maxH=window.innerHeight-200;
    scale=Math.min(maxW/W,maxH/H);
    if(scale<0.5)scale=0.5;
    canvas.style.width=(W*scale)+'px';
    canvas.style.height=(H*scale)+'px';
    canvas.width=W;canvas.height=H;
    draw();
  }
  window.addEventListener('resize',fit);

  // 熔岩暖色谱：金黄 → 橙 → 红 → 琥珀 → 珊瑚
  const BRICK_COLORS=['#fbbf24','#f97316','#ef4444','#d97706','#fb7185','#f59e0b'];

  const PADDLE_W=92,PADDLE_H=14,BALL_R=7;
  const COLS=10,BRICK_W=40,BRICK_H=18,BRICK_GAP=2,BRICK_TOP=50,BRICK_LEFT=(W-COLS*(BRICK_W+BRICK_GAP)+BRICK_GAP)/2;

  let paddle={x:0,y:0,w:PADDLE_W,h:PADDLE_H},ball={x:0,y:0,vx:0,vy:0,stuck:true},bricks=[],score=0,level=1,lives=3,state='idle',rAF=null,lastTime=0;
  state='idle';

  function resetBall(){
    ball={x:paddle.x+PADDLE_W/2,y:paddle.y-BALL_R-1,vx:0,vy:0,stuck:true};
  }
  function launch(){
    if(!ball.stuck)return;
    ball.stuck=false;
    const ang=(-Math.PI/2)+(Math.random()*0.6-0.3);
    const spd=4.6+level*0.35;
    ball.vx=Math.cos(ang)*spd;ball.vy=Math.sin(ang)*spd;
  }

  function buildBricks(){
    bricks=[];
    const rows=Math.min(4+level,6);
    for(let r=0;r<rows;r++){
      for(let c=0;c<COLS;c++){
        bricks.push({x:BRICK_LEFT+c*(BRICK_W+BRICK_GAP),y:BRICK_TOP+r*(BRICK_H+BRICK_GAP),w:BRICK_W,h:BRICK_H,color:BRICK_COLORS[r%BRICK_COLORS.length],alive:true});
      }
    }
  }

  function newGame(){
    score=0;level=1;lives=3;
    startLevel();
  }
  function startLevel(){
    paddle={x:W/2-PADDLE_W/2,y:H-30,w:PADDLE_W,h:PADDLE_H};
    buildBricks();resetBall();updateHUD();
    state='ready';
    ovTitle.textContent='第 '+level+' 关';
    ovText.textContent='按 空格 发射小球';
    document.getElementById('ovBtn').textContent='发射';
    document.getElementById('ovBtn').className='primary';
    overlay.classList.add('show');
  }

  function updateHUD(){scoreEl.textContent=score;levelEl.textContent=level;livesEl.textContent=lives;}

  function loseLife(){
    lives--;
    updateHUD();
    if(lives<=0){gameOver(false);return;}
    paddle.x=W/2-PADDLE_W/2;resetBall();state='ready';
    ovTitle.textContent='还剩 '+lives+' 条命';
    ovText.textContent='按 空格 重新发射';
    document.getElementById('ovBtn').textContent='发射';
    document.getElementById('ovBtn').className='primary';
    overlay.classList.add('show');stopLoop();
  }
  function gameOver(won){
    state=won?'win':'over';stopLoop();
    ovTitle.textContent=won?'通关!':'游戏结束';
    ovText.textContent='得分 '+score+' · 等级 '+level;
    document.getElementById('ovBtn').textContent='再来一局';
    document.getElementById('ovBtn').className='primary';
    overlay.classList.add('show');
  }

  function nextLevel(){level++;startLevel();}

  function pointerMove(clientX){
    if(state==='idle'||state==='over'||state==='win')return;
    const rect=canvas.getBoundingClientRect();
    const x=(clientX-rect.left)/rect.width*W;
    paddle.x=Math.max(0,Math.min(W-PADDLE_W,x-PADDLE_W/2));
    if(ball.stuck)ball.x=paddle.x+PADDLE_W/2;
    if(state==='ready'||state==='play')draw();
  }
  canvas.addEventListener('mousemove',e=>pointerMove(e.clientX));
  canvas.addEventListener('touchstart',e=>{e.preventDefault();pointerMove(e.touches[0].clientX);},{passive:false});
  canvas.addEventListener('touchmove',e=>{e.preventDefault();pointerMove(e.touches[0].clientX);},{passive:false});

  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();
    const step=26;
    if(e.key==='ArrowLeft'){if(state==='play'||state==='ready'){paddle.x=Math.max(0,paddle.x-step);if(ball.stuck)ball.x=paddle.x+PADDLE_W/2;draw();}}
    else if(e.key==='ArrowRight'){if(state==='play'||state==='ready'){paddle.x=Math.min(W-PADDLE_W,paddle.x+step);if(ball.stuck)ball.x=paddle.x+PADDLE_W/2;draw();}}
    else if(e.key===' '){
      if(state==='ready'){state='play';overlay.classList.remove('show');launch();startLoop();}
      else if(state==='play'&&ball.stuck){launch();}
    }
    else if(e.key==='p'||e.key==='P'){togglePause();}
    else if(e.key==='r'||e.key==='R'){overlay.classList.remove('show');newGame();}
  });

  document.getElementById('ovBtn').onclick=()=>{
    if(state==='idle'){newGame();return;}
    if(state==='ready'){state='play';overlay.classList.remove('show');launch();startLoop();return;}
    if(state==='over'||state==='win'){newGame();return;}
  };

  function togglePause(){
    if(state==='play'){state='pause';stopLoop();ovTitle.textContent='已暂停';ovText.textContent='按 P 继续';document.getElementById('ovBtn').textContent='继续';document.getElementById('ovBtn').className='';overlay.classList.add('show');}
    else if(state==='pause'){state='play';overlay.classList.remove('show');startLoop();}
  }

  function step(){
    if(state!=='play')return;
    const steps=2;
    for(let s=0;s<steps;s++){
      ball.x+=ball.vx/steps;ball.y+=ball.vy/steps;
      if(ball.x-BALL_R<0){ball.x=BALL_R;ball.vx=Math.abs(ball.vx);}
      if(ball.x+BALL_R>W){ball.x=W-BALL_R;ball.vx=-Math.abs(ball.vx);}
      if(ball.y-BALL_R<0){ball.y=BALL_R;ball.vy=Math.abs(ball.vy);}
      if(ball.vy>0 && ball.y+BALL_R>=paddle.y && ball.y+BALL_R<=paddle.y+paddle.h+6 &&
         ball.x>=paddle.x-BALL_R && ball.x<=paddle.x+paddle.w+BALL_R){
        ball.y=paddle.y-BALL_R;
        const rel=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2);
        const ang=rel*(Math.PI/3);
        const spd=Math.hypot(ball.vx,ball.vy);
        ball.vx=Math.sin(ang)*spd;ball.vy=-Math.abs(Math.cos(ang)*spd);
      }
      for(const b of bricks){
        if(!b.alive)continue;
        if(ball.x+BALL_R>b.x && ball.x-BALL_R<b.x+b.w && ball.y+BALL_R>b.y && ball.y-BALL_R<b.y+b.h){
          b.alive=false;score+=10;
          updateHUD();
          const prevX=ball.x-ball.vx/steps,prevY=ball.y-ball.vy/steps;
          const fromX=prevX+BALL_R<=b.x||prevX-BALL_R>=b.x+b.w;
          if(fromX)ball.vx=-ball.vx;else ball.vy=-ball.vy;
          break;
        }
      }
      if(ball.y-BALL_R>H){loseLife();return;}
    }
    draw();
    if(bricks.every(b=>!b.alive)){
      if(level>=8){gameOver(true);}
      else{stopLoop();state='between';setTimeout(nextLevel,300);}
    }
  }
  function loop(){step();if(state==='play')rAF=requestAnimationFrame(loop);}
  function startLoop(){if(!rAF)rAF=requestAnimationFrame(loop);}
  function stopLoop(){if(rAF){cancelAnimationFrame(rAF);rAF=null;}}

  // 渲染
  function draw(){
    ctx.clearRect(0,0,W,H);
    // 砖块（暖色渐变 + 高光）
    for(const b of bricks){
      if(!b.alive)continue;
      const g=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);
      g.addColorStop(0,shade(b.color,1.25));
      g.addColorStop(1,shade(b.color,0.7));
      ctx.fillStyle=g;
      roundRect(b.x,b.y,b.w,b.h,3);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.35)';
      ctx.fillRect(b.x+2,b.y+2,b.w-4,2);
      ctx.fillStyle='rgba(0,0,0,.25)';
      ctx.fillRect(b.x+2,b.y+b.h-3,b.w-4,2);
    }
    // 挡板（金红渐变 + 发光）
    ctx.save();
    ctx.shadowColor='#f97316';ctx.shadowBlur=12;
    const pg=ctx.createLinearGradient(paddle.x,paddle.y,paddle.x,paddle.y+paddle.h);
    pg.addColorStop(0,'#fbbf24');pg.addColorStop(.5,'#f97316');pg.addColorStop(1,'#dc2626');
    ctx.fillStyle=pg;
    roundRect(paddle.x,paddle.y,paddle.w,paddle.h,7);ctx.fill();
    ctx.restore();
    ctx.fillStyle='rgba(255,255,255,.45)';
    ctx.fillRect(paddle.x+4,paddle.y+2,paddle.w-8,2);
    // 球（白热 + 暖光晕）
    ctx.save();
    ctx.shadowColor='#fbbf24';ctx.shadowBlur=14;
    const bg=ctx.createRadialGradient(ball.x-1,ball.y-1,1,ball.x,ball.y,BALL_R);
    bg.addColorStop(0,'#fff');bg.addColorStop(1,'#fed7aa');
    ctx.fillStyle=bg;
    ctx.beginPath();ctx.arc(ball.x,ball.y,BALL_R,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function shade(hex,f){
    const n=parseInt(hex.slice(1),16);
    let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    r=Math.min(255,Math.round(r*f));g=Math.min(255,Math.round(g*f));b=Math.min(255,Math.round(b*f));
    return 'rgb('+r+','+g+','+b+')';
  }
  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function showIdle(){
    paddle={x:W/2-PADDLE_W/2,y:H-30,w:PADDLE_W,h:PADDLE_H};
    ball={x:W/2,y:H-30-BALL_R-1,vx:0,vy:0,stuck:true};
    bricks=[];score=0;level=1;lives=3;updateHUD();
    ovTitle.textContent='打砖块';
    ovText.textContent='移动挡板接住小球 · 击碎全部砖块过关';
    document.getElementById('ovBtn').textContent='开始游戏';
    document.getElementById('ovBtn').className='primary';
    overlay.classList.add('show');
    draw();
  }

  fit();showIdle();
})();
