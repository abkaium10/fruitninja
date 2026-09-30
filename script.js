const canvas=document.getElementById("game");

const W=800,H=600;
const dpr=Math.min(3,Math.max(1,window.devicePixelRatio||1));

canvas.width=Math.round(W*dpr);
canvas.height=Math.round(H*dpr);

// Mobile Responsive & Touch setup
canvas.style.width="100%";
canvas.style.maxWidth=W+"px";
canvas.style.height="auto";
canvas.style.aspectRatio="4/3";
canvas.style.touchAction="none"; // Mobile e swipe korle page scroll hobe na

const ctx=canvas.getContext("2d",{
  alpha:false,
  desynchronized:true
});

ctx.setTransform(dpr,0,0,dpr,0,0);
ctx.imageSmoothingEnabled=true;
ctx.imageSmoothingQuality="high";
ctx.textRendering="geometricPrecision";

const MAX_FRUITS=9,NUM_FRUITS=9,MAX_PLAYERS=50,MAX_PLAYER_NAME=20;
const BOMB_MIN=3,BOMB_MAX=7,COMBO_TIME=.25,COMBO_DISPLAY_TIME=.8,CRITICAL_DISPLAY_TIME=1,CRITICAL_CHANCE=10;
const TRAIL_POINTS=18,MAX_PARTICLES=200;

const assets={};

const imgNames={
  background:"fruit_Ninja_Bg2.png",
  aftergame:"fruit_Ninja_Bg.png",
  gameover:"gameovertxt.png",
  menu:"menu.png",
  loading:"load.png",
  covertxt:"thumbnail.png",
  special:"Frenzy_Banana.png",
  fire:"fire.png",
  tushar:"tushar.png",
  kaium:"kaium.png",
  sir:"sir.png"
};

for(const [k,v] of Object.entries(imgNames)){
  const im=new Image();
  im.src="assets/"+v;
  assets[k]=im;
}

const fruits=Array.from({length:NUM_FRUITS},()=>Array(4));

for(let i=0;i<NUM_FRUITS;i++)
  for(let j=0;j<4;j++){
    const im=new Image();
    im.src=`assets/${i+1}${j}.png`;
    fruits[i][j]=im;
  }

const sounds={};

for(const n of [
  "slicing",
  "respawn",
  "gameover",
  "losingpoint",
  "bombBlast",
  "specialFruit",
  "combo"
]){
  const a=new Audio(
    `assets/${n}.`+
    (
      n==="slicing"||
      n==="gameover"||
      n==="losingpoint"||
      n==="combo"
        ?"mp3"
        :"wav"
    )
  );

  if(n==="bombBlast")
    a.src="assets/bombBlast.mp3";

  if(n==="specialFruit")
    a.src="assets/specialFruit.wav";

  sounds[n]=a;
}

const theme=new Audio("assets/Themesong.mp3");
const bombMusic=new Audio("assets/bomb.wav");

theme.loop=true;
bombMusic.loop=true;
theme.volume=.5;

let musicStarted=false;
function unlockAudio(){
  if(!musicStarted){
    if(musicEnabled){
      playMusic(true);
    }
    musicStarted=true;
  }
}
window.addEventListener("pointerdown",unlockAudio,{once:true});
window.addEventListener("touchstart",unlockAudio,{once:true});

let players=[];

try{
  players=JSON.parse(
    localStorage.getItem("fruitNinjaScores")||"[]"
  );
}catch{
  players=[];
}

function saveScores(){
  localStorage.setItem(
    "fruitNinjaScores",
    JSON.stringify(players)
  );
}

function findPlayer(name){
  return players.findIndex(
    p=>p.name===name
  );
}

function getOrCreatePlayer(name){
  let i=findPlayer(name);

  if(i!==-1)
    return i;

  if(players.length>=MAX_PLAYERS){
    const ranking=players
      .map((_,i)=>i)
      .sort(
        (a,b)=>
          players[b].highScore-
          players[a].highScore
      );

    const top=new Set(
      ranking.slice(0,10)
    );

    const remove=players.findIndex(
      (_,i)=>!top.has(i)
    );

    if(remove>=0){
      players.splice(remove,1);
      saveScores();
    }
  }

  players.push({
    name,
    highScore:0
  });

  saveScores();

  return players.length-1;
}

function overallPlayer(){
  if(!players.length)
    return -1;

  return players.reduce(
    (b,p,i)=>
      b<0||
      p.highScore>players[b].highScore
        ?i
        :b,
    -1
  );
}

function overallScore(){
  const i=overallPlayer();

  return i<0
    ?0
    :players[i].highScore;
}

function playSfx(name,enabled=true){
  if(!enabled||!sounds[name])
    return;

  try{
    sounds[name].currentTime=0;
    sounds[name].play().catch(()=>{});
  }catch{}
}

function playMusic(enabled){
  if(enabled)
    theme.play().catch(()=>{});
  else
    theme.pause();
}

function stopBombMusic(){
  bombMusic.pause();
  bombMusic.currentTime=0;
}

function fitText(text,size,maxW){
  let s=size;

  while(
    s>8&&
    ctx.measureText(text).width>maxW
  )
    s--;

  return s;
}

function roundedRect(x,y,w,h,r,fill,stroke,sw=1){
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);

  if(fill){
    ctx.fillStyle=fill;
    ctx.fill();
  }

  if(stroke){
    ctx.lineWidth=sw;
    ctx.strokeStyle=stroke;
    ctx.stroke();
  }
}

function mousePos(e){
  const r=canvas.getBoundingClientRect();

  return {
    x:(e.clientX-r.left)*W/r.width,
    y:(e.clientY-r.top)*H/r.height
  };
}

let mouse={
  x:0,
  y:0,
  down:false,
  pressed:false
};

canvas.addEventListener("pointermove",e=>{
  e.preventDefault();
  mouse=Object.assign(
    mouse,
    mousePos(e),
    {down:mouse.down}
  );
});

canvas.addEventListener("pointerdown",e=>{
  e.preventDefault();

  mouse=Object.assign(
    mouse,
    mousePos(e),
    {
      down:true,
      pressed:true
    }
  );

  canvas.setPointerCapture?.(
    e.pointerId
  );
});

canvas.addEventListener("pointerup",e=>{
  mouse=Object.assign(
    mouse,
    mousePos(e),
    {down:false}
  );
});

const keys={};

window.addEventListener("keydown",e=>{
  keys[e.code]=true;

  if(e.code==="Backspace")
    e.preventDefault();
});

window.addEventListener("keyup",e=>{
  keys[e.code]=false;
});

function button(text,x,y,w,h){
  const hover=
    mouse.x>=x&&
    mouse.x<=x+w&&
    mouse.y>=y&&
    mouse.y<=y+h;

  roundedRect(
    x,y,w,h,
    8,
    hover
      ?"rgb(124,69,40)"
      :"rgb(105,57,34)",
    hover
      ?"#ffd700"
      :"rgb(177,94,45)",
    2
  );

  ctx.font="600 24px Arial";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillStyle=
    hover
      ?" #fff"
      :"rgb(245,238,228)";

  ctx.fillText(
    text,
    x+w/2,
    y+h/2
  );

  return hover&&mouse.pressed;
}

function smallButton(text,x,y,w,h){
  const hover=
    mouse.x>=x&&
    mouse.x<=x+w&&
    mouse.y>=y&&
    mouse.y<=y+h;

  roundedRect(
    x,y,w,h,
    8,
    hover
      ?"rgb(115,72,47)"
      :"rgba(69,43,31,.96)",
    hover
      ?"#ffd700"
      :"rgb(92,59,42)",
    1.5
  );

  ctx.font="600 18px Arial";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillStyle="#fff";

  ctx.fillText(
    text,
    x+w/2,
    y+h/2
  );

  return hover&&mouse.pressed;
}

function menuBackground(){
  if(
    assets.menu.complete&&
    assets.menu.naturalWidth
  ){
    ctx.drawImage(
      assets.menu,
      0,
      0,
      W,
      H
    );
  }
  else{
    ctx.fillStyle="#24150d";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );

    ctx.fillStyle="#0008";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );
  }

  ctx.fillStyle="rgba(0,0,0,.20)";

  ctx.fillRect(
    0,
    0,
    W,
    H
  );
}

function header(title,subtitle){
  ctx.font="600 42px Arial";

  const tw=
    ctx.measureText(title).width;

  ctx.font="600 18px Arial";

  const sw=
    subtitle
      ?ctx.measureText(subtitle).width
      :0;

  const bw=
    Math.max(tw,sw)+50;

  const bh=
    subtitle
      ?95
      :65;

  const bx=
    (W-bw)/2;

  roundedRect(
    bx,
    60,
    bw,
    bh,
    12,
    "rgba(0,0,0,.61)",
    "rgba(255,255,255,.27)",
    1.5
  );

  ctx.font="600 42px Arial";
  ctx.fillStyle="lightgray";
  ctx.textAlign="center";

  ctx.fillText(
    title,
    W/2,
    101
  );

  if(subtitle){
    ctx.font="600 18px Arial";
    ctx.fillStyle="rgb(210,205,198)";

    ctx.fillText(
      subtitle,
      W/2,
      135
    );
  }
}

function text(t,x,y,size,color="#fff",align="left"){
  ctx.save();

  ctx.font=`600 ${size}px Arial`;
  ctx.fillStyle=color;
  ctx.textAlign=align;
  ctx.textBaseline="alphabetic";
  ctx.textRendering="geometricPrecision";

  ctx.fillText(
    t,
    x,
    y
  );

  ctx.restore();
}

let loading=true;
let loadingTimer=0;
let menuScreen=0;
let musicEnabled=true;
let soundEnabled=true;

let playerName="";
let currentPlayer=-1;
let score=0;
let maxScore=0;
let life=3;
let startgame=false;
let gameover=false;

let scoreScroll=0;
let showPlayerScores=false;

const fruitsState=Array.from(
  {length:MAX_FRUITS},
  ()=>({
    active:false,
    sliced:false,
    type:0,
    x:0,
    y:0,
    vx:0,
    vy:0,
    s1x:0,
    s1y:0,
    s2x:0,
    s2y:0,
    s1vx:0,
    s1vy:0,
    s2vx:0,
    s2vy:0,
    juice:0,
    rotation:0,
    rotationSpeed:0
  })
);

const particles=Array.from(
  {length:MAX_PARTICLES},
  ()=>({
    active:false,
    x:0,
    y:0,
    vx:0,
    vy:0,
    r:0,
    life:0,
    color:"#fff"
  })
);

let specialT=false;
let specialX=-100;
let specialY=100;
let specialVX=0;
let specialVY=0;
let specialTimer=0;
let specialNext=3+Math.random()*3;

let fireActive=false;
let fireX=-100;
let fireY=-100;
let fireVX=0;
let fireVY=0;
let fireTimer=0;

let fireNext=
  BOMB_MIN+
  Math.random()*
  (BOMB_MAX-BOMB_MIN);

let timer=0;
let spawnTime=1;
let gameTime=0;
let fruitAmount=1;

let comboCount=0;
let comboDisplayCount=0;
let comboTimer=0;
let showCombo=false;
let comboDisplayTimer=0;

let showCritical=false;
let criticalTimer=0;
let criticalX=0;
let criticalY=0;

let showScorePopup=false;
let scorePopupTimer=0;
let scorePopupX=0;
let scorePopupY=0;

function resetGame(){
  score=0;
  life=3;
  timer=0;
  fireTimer=0;
  fireActive=false;
  gameTime=0;
  fruitAmount=1;

  fireNext=
    BOMB_MIN+
    Math.random()*
    (BOMB_MAX-BOMB_MIN);

  comboCount=0;
  comboTimer=0;
  showCombo=false;
  comboDisplayTimer=0;

  showCritical=false;
  criticalTimer=0;

  specialT=false;
  specialTimer=0;

  for(const f of fruitsState){
    f.active=false;
    f.sliced=false;
    f.juice=0;

    f.rotation=
      Math.random()*360;

    f.rotationSpeed=
      -2+
      Math.random()*4;
  }
}

function spawnJuice(x,y,color){
  for(let n=0;n<35;n++){
    const p=
      particles.find(
        p=>!p.active
      );

    if(!p)
      break;

    const a=
      Math.random()*
      Math.PI*2;

    p.active=true;
    p.x=x;
    p.y=y;

    p.vx=
      Math.cos(a)*
      (2+Math.random()*4);

    p.vy=
      Math.sin(a)*
      (2+Math.random()*4);

    p.r=
      3+
      Math.random()*5;

    p.life=1;
    p.color=color;
  }
}

const juiceColors=[
  "#f7ddcb",
  "#ffe900",
  "#ff8a00",
  "#e52339",
  "#83c346",
  "#fff",
  "#de2339",
  "#ff8000",
  "#fff"
];

function startPlayer(){
  if(!playerName.length)
    return;

  currentPlayer=
    getOrCreatePlayer(
      playerName
    );

  maxScore=
    players[currentPlayer].highScore;

  resetGame();

  gameover=false;
  startgame=true;

  playMusic(
    musicEnabled
  );
}

function spawnFruits(){
  for(let n=0;n<fruitAmount;n++){
    const f=
      fruitsState.find(
        f=>!f.active
      );

    if(!f)
      continue;

    f.type=
      Math.floor(
        Math.random()*NUM_FRUITS
      );

    f.active=true;
    f.sliced=false;

    f.x=
      Math.random()*600;

    f.y=H;

    f.vx=
      f.x<300
        ?2+
          Math.random()*
          (4-f.x/150)
        :-f.x/150+
          Math.random()*
          (-2+f.x/150);

    f.vy=
      -5.2+
      Math.random()*.7;

    f.rotation=
      Math.random()*360;

    f.rotationSpeed=
      -2+
      Math.random()*4;

    f.juice=0;
  }
}

function pointRect(p,x,y,img){
  const w=
    img.naturalWidth||80;

  const h=
    img.naturalHeight||80;

  return (
    p.x>=x&&
    p.x<=x+w&&
    p.y>=y&&
    p.y<=y+h
  );
}

function sliceFruit(f){
  f.sliced=true;

  spawnJuice(
    f.x,
    f.y,
    juiceColors[f.type]
  );

  f.juice=0;

  playSfx(
    "slicing",
    soundEnabled
  );

  f.s1x=f.x;
  f.s1y=f.y;

  f.s2x=f.x;
  f.s2y=f.y;

  f.s1vx=f.vx;
  f.s1vy=f.vy;

  f.s2vx=f.vx;
  f.s2vy=f.vy;

  comboCount=
    comboTimer>0
      ?comboCount+1
      :1;

  comboTimer=COMBO_TIME;

  criticalX=f.x;
  criticalY=f.y;
}

function updateGame(dt){
  gameTime+=dt;
  timer+=dt;
  fireTimer+=dt;
  specialTimer+=dt;

  if(gameTime>10)
    fruitAmount=1;

  if(gameTime>30){
    fruitAmount=
      1+
      Math.floor(
        Math.random()*3
      );

    fireNext=
      2+
      Math.random()*3.5;
  }

  if(gameTime>60){
    fruitAmount=
      2+
      Math.floor(
        Math.random()*5
      );

    fireNext=
      .5+
      Math.random()*2.5;

    spawnTime=.5;
  }

  for(const p of particles){
    if(p.active){
      p.x+=p.vx;
      p.y+=p.vy;
      p.vy+=.15;
      p.life-=dt;

      if(p.life<=0)
        p.active=false;
    }
  }

  if(showScorePopup){
    scorePopupTimer-=dt;

    if(scorePopupTimer<=0)
      showScorePopup=false;
  }

  if(comboTimer>0){
    comboTimer-=dt;

    if(comboTimer<=0){
      let comboScore=
        comboCount*10;

      if(
        Math.floor(
          Math.random()*100
        )+1<=CRITICAL_CHANCE
      ){
        comboScore+=20;

        showCritical=true;

        criticalTimer=
          CRITICAL_DISPLAY_TIME;
      }

      if(comboCount>=2){
        comboScore*=2;

        comboDisplayCount=
          comboCount;

        showCombo=true;

        comboDisplayTimer=
          COMBO_DISPLAY_TIME;

        playSfx(
          "combo",
          soundEnabled
        );
      }
      else{
        comboScore=10;
      }

      score+=comboScore;

      if(score>maxScore)
        maxScore=score;

      comboCount=0;
    }
  }

  if(showCombo){
    comboDisplayTimer-=dt;

    if(comboDisplayTimer<=0)
      showCombo=false;
  }

  if(showCritical){
    criticalTimer-=dt;

    if(criticalTimer<=0)
      showCritical=false;
  }

  if(
    !specialT&&
    specialTimer>=specialNext
  ){
    specialTimer=0;

    specialNext=
      5+
      Math.random()*5;

    specialT=true;

    specialX=
      40+
      Math.random()*
      (W-120);

    specialY=H;

    specialVX=
      -2.5+
      Math.random()*5;

    specialVY=-8.5;
  }

  if(specialT){
    specialX+=specialVX;
    specialY+=specialVY*2.5;
    specialVY+=dt*5;

    if(specialY>H)
      specialT=false;

    if(
      mouse.down&&
      pointRect(
        mouse,
        specialX,
        specialY,
        assets.special
      )
    ){
      playSfx(
        "specialFruit",
        soundEnabled
      );

      score+=20;

      showScorePopup=true;
      scorePopupTimer=1;
      scorePopupX=specialX;
      scorePopupY=specialY;

      specialT=false;
    }
  }

  if(
    !fireActive&&
    fireTimer>=fireNext
  ){
    fireTimer=0;

    fireNext=
      BOMB_MIN+
      Math.random()*
      (BOMB_MAX-BOMB_MIN);

    fireActive=true;

    fireX=
      40+
      Math.random()*
      (W-100);

    fireY=H;

    fireVX=
      -2.5+
      Math.random()*5;

    fireVY=
      -5.2+
      Math.random()*.7;

    bombMusic.play().catch(()=>{});
  }

  if(fireActive){
    fireY+=fireVY*2.5;
    fireX+=fireVX;
    fireVY+=dt*5;

    if(
      mouse.down&&
      pointRect(
        mouse,
        fireX,
        fireY,
        assets.fire
      )
    ){
      stopBombMusic();

      playSfx(
        "bombBlast",
        soundEnabled
      );

      life=0;
      fireActive=false;
    }

    if(
      fireY>H||
      fireX<
        -(assets.fire.naturalWidth||80)||
      fireX>W
    ){
      stopBombMusic();
      fireActive=false;
    }
  }

  if(timer>=spawnTime){
    timer=0;
    spawnFruits();
  }

  if(mouse.down){
    for(const f of fruitsState){
      if(!f.active||f.sliced)
        continue;

      const img=
        fruits[f.type][0];

      if(
        pointRect(
          mouse,
          f.x,
          f.y,
          img
        )
      ){
        sliceFruit(f);
      }
    }
  }

  for(const f of fruitsState){
    if(!f.active)
      continue;

    f.rotation+=
      f.rotationSpeed;

    if(!f.sliced){
      f.x+=f.vx;
      f.y+=f.vy*2.5;
      f.vy+=dt*5;

      if(f.y>H){
        f.active=false;

        playSfx(
          "losingpoint",
          soundEnabled
        );

        life--;
      }
    }
    else{
      if(f.vx>0){
        f.s1x-=f.s1vx;
        f.s1y+=f.s1vy*2.5;
        f.s1vy+=dt*5;

        f.s2x+=f.s2vx;
        f.s2y+=f.s2vy*2.5;
        f.s2vy+=dt*5;
      }
      else{
        f.s1x+=f.s1vx;
        f.s1y+=f.s1vy*2.5;
        f.s1vy+=dt*5;

        f.s2x-=f.s2vx;
        f.s2y+=f.s2vy*2.5;
        f.s2vy+=dt*5;
      }

      if(
        f.s1y>H||
        f.s2y>H
      ){
        f.active=false;
      }
    }
  }
}

/* =========================================================
   THIN REFERENCE-STYLE BLADE
   ========================================================= */

let trail=[];
let lastMouse={
  x:0,
  y:0
};

let trailStarted=false;
let smoothSpeed=0;
let powerForBlade=0;

function bladeSmoothstep(t){
  t=Math.max(0,Math.min(1,t));
  return t*t*(3-2*t);
}

function bladeProfile(p){
  if(p<.10){
    const t=p/.10;
    return .18+
      bladeSmoothstep(t)*3.2;
  }

  if(p<.30){
    const t=
      (p-.10)/.20;
    return 3.38+
      bladeSmoothstep(t)*4.2;
  }

  if(p<.52){
    const t=
      (p-.30)/.22;
    return 7.58-
      bladeSmoothstep(t)*.65;
  }

  if(p<.72){
    const t=
      (p-.52)/.20;
    return 6.93-
      bladeSmoothstep(t)*3.0;
  }

  if(p<.88){
    const t=
      (p-.72)/.16;
    return 3.93-
      bladeSmoothstep(t)*2.55;
  }

  const t=
    (p-.88)/.12;

  return 1.38-
    bladeSmoothstep(t)*1.18;
}

function buildBladePath(extra=0){
  const left=[];
  const right=[];

  for(let i=0;i<trail.length;i++){
    const p=
      i/(trail.length-1);

    const point=
      trail[i];

    const prev=
      trail[
        Math.max(0,i-1)
      ];

    const next=
      trail[
        Math.min(
          trail.length-1,
          i+1
        )
      ];

    let dx=
      next.x-prev.x;

    let dy=
      next.y-prev.y;

    const len=
      Math.hypot(dx,dy)||1;

    dx/=len;
    dy/=len;

    const nx=-dy;
    const ny=dx;

    let width=
      bladeProfile(p);

    width+=
      powerForBlade*1.15;

    const leftWidth=
      width*1.04+
      extra;

    const rightWidth=
      width*.88+
      extra;

    const curveOffset=
      Math.sin(p*Math.PI)*.8;

    left.push({
      x:
        point.x+
        nx*leftWidth+
        dx*curveOffset,

      y:
        point.y+
        ny*leftWidth+
        dy*curveOffset
    });

    right.push({
      x:
        point.x-
        nx*rightWidth+
        dx*curveOffset,

      y:
        point.y-
        ny*rightWidth+
        dy*curveOffset
    });
  }

  ctx.beginPath();

  ctx.moveTo(
    left[0].x,
    left[0].y
  );

  for(let i=1;i<left.length;i++){
    const prev=left[i-1];
    const cur=left[i];

    const mx=
      (prev.x+cur.x)/2;

    const my=
      (prev.y+cur.y)/2;

    ctx.quadraticCurveTo(
      prev.x,
      prev.y,
      mx,
      my
    );
  }

  ctx.lineTo(
    left[left.length-1].x,
    left[left.length-1].y
  );

  for(
    let i=right.length-1;
    i>=0;
    i--
  ){
    const cur=right[i];

    const prev=
      right[
        Math.max(0,i-1)
      ];

    const mx=
      (cur.x+prev.x)/2;

    const my=
      (cur.y+prev.y)/2;

    ctx.quadraticCurveTo(
      cur.x,
      cur.y,
      mx,
      my
    );
  }

  ctx.lineTo(
    right[0].x,
    right[0].y
  );

  ctx.closePath();
}

function drawBlade(){
  if(!mouse.down){
    trail=[];
    trailStarted=false;
    smoothSpeed=0;
    powerForBlade=0;
    return;
  }

  if(!trailStarted){
    lastMouse={
      x:mouse.x,
      y:mouse.y
    };

    trail=Array.from(
      {length:TRAIL_POINTS},
      ()=>({
        x:mouse.x,
        y:mouse.y
      })
    );

    trailStarted=true;
  }

  const dx=
    mouse.x-lastMouse.x;

  const dy=
    mouse.y-lastMouse.y;

  const movement=
    Math.hypot(dx,dy);

  smoothSpeed=
    smoothSpeed*.82+
    movement*.18;

  powerForBlade=
    Math.min(
      1,
      smoothSpeed/22
    );

  trail.unshift({
    x:mouse.x,
    y:mouse.y
  });

  trail=
    trail.slice(
      0,
      TRAIL_POINTS
    );

  if(trail.length<2)
    return;

  ctx.save();

  buildBladePath(3.0);

  ctx.shadowColor=
    "rgba(90,180,230,.32)";

  ctx.shadowBlur=
    6+
    powerForBlade*3;

  ctx.fillStyle=
    "rgba(90,180,230,.07)";

  ctx.fill();

  ctx.shadowBlur=0;

  buildBladePath(1.5);

  const edgeGradient=
    ctx.createLinearGradient(
      trail[0].x,
      trail[0].y,
      trail[trail.length-1].x,
      trail[trail.length-1].y
    );

  edgeGradient.addColorStop(
    0,
    "rgba(255,255,255,.82)"
  );

  edgeGradient.addColorStop(
    .30,
    "rgba(185,225,245,.72)"
  );

  edgeGradient.addColorStop(
    .65,
    "rgba(120,190,220,.52)"
  );

  edgeGradient.addColorStop(
    1,
    "rgba(180,220,240,.08)"
  );

  ctx.fillStyle=
    edgeGradient;

  ctx.fill();

  buildBladePath(0);

  const bladeGradient=
    ctx.createLinearGradient(
      trail[0].x,
      trail[0].y,
      trail[trail.length-1].x,
      trail[trail.length-1].y
    );

  bladeGradient.addColorStop(
    0,
    "rgba(255,255,255,1)"
  );

  bladeGradient.addColorStop(
    .20,
    "rgba(255,255,255,.99)"
  );

  bladeGradient.addColorStop(
    .42,
    "rgba(235,249,255,.98)"
  );

  bladeGradient.addColorStop(
    .62,
    "rgba(200,231,247,.94)"
  );

  bladeGradient.addColorStop(
    .82,
    "rgba(225,244,252,.70)"
  );

  bladeGradient.addColorStop(
    1,
    "rgba(255,255,255,.12)"
  );

  ctx.fillStyle=
    bladeGradient;

  ctx.fill();

  buildBladePath(-.35);

  ctx.strokeStyle=
    "rgba(255,255,255,.92)";

  ctx.lineWidth=.85;

  ctx.lineJoin="round";
  ctx.lineCap="round";

  ctx.stroke();

  ctx.beginPath();

  for(let i=0;i<trail.length;i++){
    const p=trail[i];

    if(i===0)
      ctx.moveTo(
        p.x,
        p.y
      );
    else
      ctx.lineTo(
        p.x,
        p.y
      );
  }

  ctx.strokeStyle=
    "rgba(255,255,255,.42)";

  ctx.lineWidth=
    .45+
    powerForBlade*.35;

  ctx.lineCap="round";

  ctx.stroke();

  const tip=trail[0];

  ctx.beginPath();

  ctx.arc(
    tip.x,
    tip.y,
    .8+
    powerForBlade*.5,
    0,
    Math.PI*2
  );

  ctx.fillStyle=
    "rgba(255,255,255,.95)";

  ctx.fill();

  ctx.restore();

  lastMouse={
    x:mouse.x,
    y:mouse.y
  };
}

/* =========================================================
   REST OF GAME
   ========================================================= */

function drawImageSafe(img,x,y){
  if(
    img.complete&&
    img.naturalWidth
  ){
    ctx.drawImage(
      img,
      x,
      y
    );
  }
}

function drawMenu(){
  menuBackground();

  if(
    smallButton(
      "?",
      W-142,
      20,
      48,
      42
    )
  ){
    menuScreen=2;
  }

  if(
    smallButton(
      musicEnabled
        ?"MUSIC"
        :"MUTE",
      W-88,
      20,
      80,
      42
    )
  ){
    musicEnabled=!musicEnabled;

    playMusic(
      musicEnabled
    );

    if(!musicEnabled)
      stopBombMusic();
  }

  if(menuScreen===0){

    ctx.strokeStyle="#dcebF5";
    ctx.lineWidth=5;

    ctx.beginPath();
    ctx.moveTo(475,115);
    ctx.lineTo(530,60);
    ctx.stroke();

    ctx.lineWidth=2;
    ctx.strokeStyle="#fff";

    ctx.beginPath();
    ctx.moveTo(478,119);
    ctx.lineTo(533,64);
    ctx.stroke();

    if(
      button(
        "PLAY",
        280,
        205,
        240,
        54
      )
    )
      menuScreen=1;

    if(
      button(
        "HOW TO PLAY",
        280,
        267,
        240,
        54
      )
    )
      menuScreen=2;

    if(
      button(
        "LEADERBOARD",
        280,
        329,
        240,
        54
      )
    )
      menuScreen=3;

    if(
      button(
        "CREDITS",
        280,
        391,
        240,
        54
      )
    )
      menuScreen=4;

    if(
      button(
        "SETTINGS",
        280,
        453,
        240,
        54
      )
    )
      menuScreen=5;

    text(
      "SLICE. SCORE. BE THE BEST.",
      40,
      572,
      17,
      "#beb8b2"
    );

    if(
      smallButton(
        soundEnabled
          ?"SFX ON"
          :"SFX OFF",
        W-150,
        552,
        118,
        34
      )
    ){
      soundEnabled=!soundEnabled;
    }
  }
  else if(menuScreen===1)
    drawPlayerMenu();
  else if(menuScreen===2)
    drawHow();
  else if(menuScreen===3)
    drawLeaderboard();
  else if(menuScreen===4)
    drawCredits();
  else
    drawSettings();
}

function drawPlayerMenu(){
  header(
    "READY TO SLICE",
    "Enter your player name"
  );

  roundedRect(
    205,
    190,
    390,
    56,
    8,
    "rgba(0,0,0,.55)",
    mouse.x>=205&&
    mouse.x<=595&&
    mouse.y>=190&&
    mouse.y<=246
      ?" #ffd700"
      :"rgba(255,255,255,.55)",
    2
  );

  text(
    playerName||
    "Type your name...",
    225,
    226,
    23,
    playerName
      ?" #fff"
      :"#ccc"
  );

  if(
    button(
      "START GAME",
      250,
      285,
      300,
      55
    )&&
    playerName.length
  ){
    startPlayer();
  }

  if(
    button(
      "BACK",
      250,
      355,
      300,
      50
    )
  ){
    menuScreen=0;
  }

  text(
    playerName.length
      ?"Press ENTER or click START GAME."
      :"Enter a name before starting.",
    400,
    435,
    16,
    playerName.length
      ?" #ccc"
      :"#55cc55",
    "center"
  );
}

function drawHow(){
  header(
    "HOW TO PLAY",
    "Become the fastest fruit ninja"
  );

  roundedRect(
    145,
    155,
    510,
    350,
    8,
    "rgba(0,0,0,.64)",
    "rgba(255,255,255,.35)",
    2
  );

  const rows=[
    ["1","Move your mouse over the fruit."],
    ["2","Hold LEFT MOUSE and slice the fruit."],
    ["3","+10 points for a normal fruit."],
    ["4","Special banana gives +20 points."],
    ["5","Missing fruit costs one life."],
    ["6","Never slice the bomb!"]
  ];

  rows.forEach((r,i)=>{
    text(
      r[0],
      180,
      190+i*50,
      28,
      i===5
        ?" #ff3333"
        :"#ffd700"
    );

    text(
      r[1],
      220,
      193+i*50,
      20,
      "#fff"
    );
  });

  if(
    button(
      "BACK",
      300,
      525,
      200,
      45
    )||
    keys.Escape
  ){
    menuScreen=0;
  }
}

function drawLeaderboard(){
  header(
    "LEADERBOARD",
    "Top local players"
  );

  roundedRect(
    160,
    150,
    480,
    370,
    8,
    "rgba(0,0,0,.68)",
    "rgba(255,255,255,.35)",
    2
  );

  text(
    "RANK",
    190,
    175,
    16,
    "#ccc"
  );

  text(
    "PLAYER",
    275,
    175,
    16,
    "#ccc"
  );

  text(
    "SCORE",
    530,
    175,
    16,
    "#ccc"
  );

  const rank=
    players
      .map((_,i)=>i)
      .sort(
        (a,b)=>
          players[b].highScore-
          players[a].highScore
      );

  const visible=
    Math.min(
      10,
      rank.length
    );

  if(!visible){
    text(
      "No scores saved yet.",
      400,
      285,
      20,
      "#ccc",
      "center"
    );
  }

  for(let i=0;i<visible;i++){
    const y=
      210+i*28;

    if(i===0){
      ctx.fillStyle=
        "rgba(255,215,0,.16)";

      ctx.fillRect(
        180,
        y-4,
        440,
        27
      );
    }

    text(
      String(i+1).padStart(2,"0"),
      195,
      y+14,
      18
    );

    text(
      players[rank[i]].name,
      275,
      y+14,
      18
    );

    text(
      players[rank[i]].highScore,
      530,
      y+14,
      18
    );
  }

  if(
    button(
      "BACK",
      300,
      535,
      200,
      45
    )||
    keys.Escape
  ){
    menuScreen=0;
  }
}

function drawCredits(){
  ctx.fillStyle=
    "rgba(0,0,0,.68)";

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  ctx.strokeStyle=
    "rgba(255,255,255,.35)";

  ctx.lineWidth=2;

  ctx.strokeRect(
    0,
    0,
    W,
    H
  );

  text(
    "Fruit Ninja",
    300,
    38,
    28
  );

  text(
    "Developed By",
    320,
    65,
    20,
    "#ffd700"
  );

  drawImageSafe(
    assets.tushar,
    5,
    60
  );

  drawImageSafe(
    assets.kaium,
    550,
    60
  );

  text(
    "Tawsif Mollik Tushar",
    10,
    270,
    18
  );

  text(
    "Abdul kaium Mia",
    580,
    270,
    18
  );

  text(
    "ID:2505127",
    10,
    295,
    18
  );

  text(
    "ID:2505126",
    580,
    295,
    18
  );

  text(
    "Sources:",
    10,
    340,
    18,
    "#ffff00"
  );

  text(
    "Audio+Music : (Khinsider.com)+(mixkit.com)",
    10,
    370,
    18,
    "#ffff00"
  );

  text(
    "Photos : (fruitninja.fandom.com)+(Gemini)+(pexel.com)",
    10,
    400,
    18,
    "#ffff00"
  );

  text(
    "A Journey to be remembered",
    230,
    430,
    18,
    "#ffd700"
  );

  text(
    "forever",
    360,
    455,
    18,
    "#ffd700"
  );

  if(
    button(
      "BACK",
      300,
      535,
      200,
      45
    )||
    keys.Escape
  ){
    menuScreen=0;
  }
}

function drawSettings(){
  header(
    "SETTINGS",
    "Audio controls"
  );

  if(
    button(
      musicEnabled
        ?"MUSIC  ON"
        :"MUSIC  OFF",
      245,
      190,
      310,
      58
    )
  ){
    musicEnabled=!musicEnabled;

    playMusic(
      musicEnabled
    );

    if(!musicEnabled)
      stopBombMusic();
  }

  if(
    button(
      soundEnabled
        ?"SOUND  ON"
        :"SOUND  OFF",
      245,
      265,
      310,
      58
    )
  ){
    soundEnabled=!soundEnabled;
  }

  if(
    button(
      "BACK",
      300,
      370,
      200,
      50
    )||
    keys.Escape
  ){
    menuScreen=0;
  }
}

function drawGame(){
  if(
    assets.background.complete&&
    assets.background.naturalWidth
  ){
    ctx.drawImage(
      assets.background,
      0,
      0,
      W,
      H
    );
  }
  else{
    ctx.fillStyle="#315b31";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );
  }

  drawBlade();

  for(const f of fruitsState){
    if(!f.active)
      continue;

    const img=
      fruits[f.type][
        f.sliced
          ?3
          :0
      ];

    if(!f.sliced){
      ctx.save();

      ctx.translate(
        f.x+
        img.naturalWidth/2,
        f.y+
        img.naturalHeight/2
      );

      ctx.rotate(
        f.rotation*
        Math.PI/180
      );

      drawImageSafe(
        img,
        -img.naturalWidth/2,
        -img.naturalHeight/2
      );

      ctx.restore();
    }
    else{
      if(f.juice<1){
        drawImageSafe(
          img,
          f.x,
          f.y
        );

        f.juice+=1/60;
      }

      drawImageSafe(
        fruits[f.type][1],
        f.s1x,
        f.s1y
      );

      drawImageSafe(
        fruits[f.type][2],
        f.s2x,
        f.s2y
      );
    }
  }

  if(specialT)
    drawImageSafe(
      assets.special,
      specialX,
      specialY
    );

  if(showScorePopup){
    text(
      "+20",
      scorePopupX,
      scorePopupY+35,
      35,
      "#ffff00"
    );
  }

  if(
    showCombo&&
    comboDisplayCount>=2
  ){
    text(
      `${comboDisplayCount} COMBO!`,
      W/2,
      140,
      60,
      "#ffd700",
      "center"
    );
  }

  if(showCritical){
    text(
      "CRITICAL!",
      W/2,
      190,
      44,
      "#fff",
      "center"
    );

    text(
      "x2",
      criticalX,
      criticalY,
      38,
      "#ff3333"
    );
  }

  if(fireActive)
    drawImageSafe(
      assets.fire,
      fireX,
      fireY
    );

  for(const p of particles){
    if(p.active){
      ctx.globalAlpha=p.life;

      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y,
        p.r,
        0,
        Math.PI*2
      );

      ctx.fillStyle=p.color;
      ctx.fill();

      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y,
        p.r*.3,
        0,
        Math.PI*2
      );

      ctx.fillStyle="#fff";
      ctx.fill();
    }
  }

  ctx.globalAlpha=1;

  ctx.fillStyle=
    "rgba(0,0,0,.48)";

  ctx.fillRect(
    12,
    12,
    776,
    72
  );

  ctx.strokeStyle=
    "rgba(255,255,255,.30)";

  ctx.strokeRect(
    12,
    12,
    776,
    72
  );

  text(
    "PLAYER",
    28,
    35,
    13,
    "#ccc"
  );

  text(
    playerName,
    28,
    63,
    21
  );

  text(
    "SCORE",
    245,
    35,
    13,
    "#ccc"
  );

  text(
    score,
    245,
    64,
    25
  );

  text(
    "HIGH SCORE",
    410,
    35,
    13,
    "#ccc"
  );

  text(
    maxScore,
    410,
    64,
    25
  );

  text(
    "LIFE",
    675,
    35,
    13,
    "#ccc"
  );

  for(let i=0;i<3;i++){
    text(
      i<life
        ?"<3"
        :"x",
      675+i*28,
      63,
      20,
      i<life
        ?" #fff"
        :"rgba(255,255,255,.35)"
    );
  }

  if(life<=0)
    drawGameOver();
}

function drawGameOver(){
  if(
    assets.aftergame.complete&&
    assets.aftergame.naturalWidth
  ){
    ctx.drawImage(
      assets.aftergame,
      0,
      0,
      W,
      H
    );
  }

  ctx.fillStyle=
    "rgba(0,0,0,.42)";

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  if(!gameover){
    stopBombMusic();
    theme.pause();

    playSfx(
      "gameover",
      soundEnabled
    );

    if(
      currentPlayer>=0&&
      score>
      players[currentPlayer].highScore
    ){
      players[currentPlayer].highScore=
        score;

      maxScore=score;
    }

    saveScores();

    gameover=true;
  }

  ctx.fillStyle=
    "rgba(0,0,0,.72)";

  ctx.fillRect(
    170,
    105,
    460,
    390
  );

  ctx.strokeStyle=
    "rgba(255,255,255,.75)";

  ctx.lineWidth=3;

  ctx.strokeRect(
    170,
    105,
    460,
    390
  );

  text(
    "GAME OVER",
    400,
    193,
    48,
    "#fff",
    "center"
  );

  text(
    `PLAYER  ${playerName}`,
    400,
    237,
    22,
    "#ccc",
    "center"
  );

  text(
    "FINAL SCORE",
    400,
    283,
    18,
    "#ccc",
    "center"
  );

  text(
    score,
    400,
    338,
    48,
    "#fff",
    "center"
  );

  text(
    `HIGH SCORE  ${maxScore}`,
    400,
    376,
    21,
    "#fff",
    "center"
  );

  if(
    button(
      "RESTART",
      205,
      405,
      180,
      55
    )||
    keys.KeyR
  ){
    resetGame();

    gameover=false;

    playMusic(
      musicEnabled
    );
  }

  if(
    button(
      "MENU",
      415,
      405,
      180,
      55
    )||
    keys.KeyM
  ){
    score=0;
    life=3;
    startgame=false;
    gameover=false;
    playerName="";
    currentPlayer=-1;
    menuScreen=0;

    resetGame();

    playMusic(
      musicEnabled
    );
  }
}

function drawLoading(){
  if(
    assets.loading.complete&&
    assets.loading.naturalWidth
  ){
    ctx.drawImage(
      assets.loading,
      0,
      0,
      W,
      H
    );
  }
  else{
    ctx.fillStyle="#000";

    ctx.fillRect(
      0,
      0,
      W,
      H
    );
  }

  ctx.fillStyle=
    "rgba(0,0,0,.28)";

  ctx.fillRect(
    0,
    H-105,
    W,
    105
  );

  text(
    "LOADING...",
    W/2,
    H-82,
    28,
    "#fff",
    "center"
  );

  const p=
    Math.min(
      1,
      loadingTimer/2.8
    );

  const bw=W*.39;
  const bh=24;
  const bx=(W-bw)/2;
  const by=H-48;

  roundedRect(
    bx,
    by,
    bw,
    bh,
    10,
    "rgba(0,0,0,.78)",
    "#fff",
    2
  );

  if(bw*p>0){
    roundedRect(
      bx+3,
      by+3,
      (bw-6)*p,
      bh-6,
      8,
      "#ffd700"
    );
  }

  text(
    `${Math.floor(p*100)}%`,
    W/2,
    H-22,
    16,
    "#fff",
    "center"
  );
}

function frame(ts){
  const dt=
    Math.min(
      .033,
      (frame.last
        ?ts-frame.last
        :16)/1000
    );

  frame.last=ts;

  if(loading){
    loadingTimer+=dt;

    drawLoading();

    mouse.pressed=false;

    if(loadingTimer>=2.8)
      loading=false;

    requestAnimationFrame(frame);

    return;
  }

  if(!startgame){
    drawMenu();

    mouse.pressed=false;

    requestAnimationFrame(frame);

    return;
  }

  if(life>0)
    updateGame(dt);

  drawGame();

  mouse.pressed=false;

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

/* Player name keyboard input */

window.addEventListener("keydown",e=>{
  if(
    !startgame&&
    menuScreen===1
  ){
    if(
      e.code==="Enter"&&
      playerName.length
    ){
      startPlayer();
      return;
    }

    if(e.code==="Escape"){
      menuScreen=0;
      return;
    }

    if(e.code==="Backspace"){
      playerName=
        playerName.slice(
          0,
          -1
        );
      return;
    }

    if(
      e.key&&
      e.key.length===1&&
      e.key.charCodeAt(0)>=32&&
      e.key.charCodeAt(0)<=125&&
      playerName.length<
        MAX_PLAYER_NAME
    ){
      playerName+=e.key;
    }
  }
});