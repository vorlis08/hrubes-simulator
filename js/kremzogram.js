/* ── Křemžogram – fake Instagram pro Křemži ─────────────────────────── */
const KREMZOGRAM = (function(){

const POSTS = [
  {
    user:'jana_kosova', nick:'jana.k 💕', avatar:'🛒',
    text:'Dneska nová směna v Bille 😩 aspoň slevy na jogurty #billalife #kremze',
    likes:23, time:'2h', drawFn: drawBillaShelf
  },
  {
    user:'johnny', nick:'johnny_bigpoppa 🔥', avatar:'🍺',
    text:'Kdo dneska přijde do Big Poppy, první rundu platím já 🍻💪',
    likes:47, time:'3h', drawFn: drawBeerCheers
  },
  {
    user:'mikulas', nick:'mikulas.420 🌿', avatar:'🌿',
    text:'Nový strain dorazil, kluci. Kdo ví, ten ví 😏 #organic #kremze',
    likes:69, time:'1h', drawFn: drawKratomLeaf
  },
  {
    user:'milan', nick:'milan_kremze 🏠', avatar:'🏠',
    text:'Západ slunce nad Křemží. Tenhle výhled nikdy neomrzí 🌅',
    likes:34, time:'5h', drawFn: drawSunsetKremze
  },
  {
    user:'mates', nick:'mates.bp 🎱', avatar:'🎱',
    text:'Kulečník masterclass dneska v hospodě, kdo se přidá? 🎱🍺',
    likes:18, time:'4h', drawFn: drawPoolTable
  },
  {
    user:'cihalova', nick:'cihalova_official 📚', avatar:'👩‍🏫',
    text:'Kdo zase nesplnil domácí úkol, ať se ani neotáčí do třídy!! 😤📖',
    likes:5, time:'6h', drawFn: drawClassroom
  },
  {
    user:'figurova', nick:'mrs.figurova 🇬🇧', avatar:'🧐',
    text:'Another beautiful day to teach English. Sit down, everyone. 🇬🇧✨',
    likes:12, time:'7h', drawFn: drawEnglishBook
  },
  {
    user:'bezdak', nick:'bezdak_dealer 💊', avatar:'💊',
    text:'Za Billou jak vždycky. Kdo potřebuje, ví kde mě najde 😶‍🌫️',
    likes:31, time:'30m', drawFn: drawAlley
  },
  {
    user:'paja', nick:'paja.kremze 🔍', avatar:'🔍',
    text:'Dneska jsem viděl něco divnýho u hospody… budu to sledovat 👀',
    likes:8, time:'45m', drawFn: drawMystery
  },
  {
    user:'honza', nick:'honza_chill 😎', avatar:'😎',
    text:'Kremžský náměstí v noci >> cokoliv v Budějovicích. Změňte mi názor 🌙',
    likes:42, time:'8h', drawFn: drawNightSquare
  },
  {
    user:'kratom_saman', nick:'saman_spiritual ✨', avatar:'🧙',
    text:'Duch předků mi dnes zašeptal nové recepty. Kdo je hoden, nechť přijde. 🌿🔮',
    likes:15, time:'2h', drawFn: drawMysticBrew
  },
  {
    user:'lenka', nick:'lenka.billa 🎀', avatar:'🎀',
    text:'Pauza v Bille = čas na selfíčko 💅✨ #worklife #girlboss',
    likes:56, time:'1h', drawFn: drawSelfieMirror
  },
  {
    user:'krejci', nick:'krejci.eko 📊', avatar:'📊',
    text:'Ekonomika je věda o volbách. Některé volby ale nemají správnou odpověď. 📈',
    likes:9, time:'10h', drawFn: drawGraph
  },
  {
    user:'johnny', nick:'johnny_bigpoppa 🔥', avatar:'🍺',
    text:'Nový playlist v Big Poppě, samý bangeryyy 🔊🎵 přijďte',
    likes:38, time:'6h', drawFn: drawSpeaker
  },
  {
    user:'mikulas', nick:'mikulas.420 🌿', avatar:'🌿',
    text:'Ráno, káva, kratom. Životní filozofie 🧘‍♂️☕',
    likes:77, time:'9h', drawFn: drawMorningCoffee
  },
];

function drawBillaShelf(ctx,w,h){
  ctx.fillStyle='#1a2744'; ctx.fillRect(0,0,w,h);
  for(let r=0;r<3;r++){
    ctx.fillStyle='#8B4513'; ctx.fillRect(10,20+r*40,w-20,6);
    for(let i=0;i<5;i++){
      const hue=Math.random()*360;
      ctx.fillStyle=`hsl(${hue},60%,55%)`;
      ctx.fillRect(18+i*(w-36)/5, 26+r*40-28, (w-36)/5-6, 26);
      ctx.fillStyle='rgba(255,255,255,.15)';
      ctx.fillRect(18+i*(w-36)/5+2, 26+r*40-26, (w-36)/5-10, 8);
    }
  }
  ctx.fillStyle='#f59e0b'; ctx.font='bold 11px sans-serif';
  ctx.fillText('BILLA',w/2-15,h-8);
}

function drawBeerCheers(ctx,w,h){
  ctx.fillStyle='#1a0e00'; ctx.fillRect(0,0,w,h);
  for(let i=0;i<2;i++){
    const x=w*0.25+i*w*0.3, bw=22, bh=40;
    const rot=i===0?-0.15:0.15;
    ctx.save(); ctx.translate(x+bw/2,h*0.55); ctx.rotate(rot);
    ctx.fillStyle='#f59e0b'; ctx.fillRect(-bw/2,-bh,bw,bh);
    ctx.fillStyle='#fff8dc'; ctx.fillRect(-bw/2,-bh,bw,10);
    ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(-bw/2+3,-bh+12,4,bh-14);
    ctx.fillStyle='#8B4513'; ctx.fillRect(-bw/2-4,-bh+bh*0.3,4,bh*0.4);
    ctx.restore();
  }
  ctx.fillStyle='#fbbf24'; ctx.font='16px sans-serif'; ctx.fillText('🍻',w/2-10,h*0.35);
}

function drawKratomLeaf(ctx,w,h){
  ctx.fillStyle='#0a1a0a'; ctx.fillRect(0,0,w,h);
  ctx.save(); ctx.translate(w/2,h/2);
  for(let i=0;i<6;i++){
    ctx.rotate(Math.PI/3);
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.quadraticCurveTo(15,-30,0,-50);
    ctx.quadraticCurveTo(-15,-30,0,0);
    ctx.fillStyle=`hsl(${120+i*8},65%,${30+i*3}%)`;
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle='rgba(255,255,100,.06)';
  ctx.beginPath(); ctx.arc(w/2,h/2,35,0,Math.PI*2); ctx.fill();
}

function drawSunsetKremze(ctx,w,h){
  const grd=ctx.createLinearGradient(0,0,0,h);
  grd.addColorStop(0,'#ff6b35'); grd.addColorStop(0.4,'#f7931e');
  grd.addColorStop(0.6,'#1a0a2e'); grd.addColorStop(1,'#050510');
  ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#ff4500';
  ctx.beginPath(); ctx.arc(w/2,h*0.42,20,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#111'; ctx.fillRect(0,h*0.65,w,h*0.35);
  for(let i=0;i<4;i++){
    ctx.fillStyle='#1a1a2e';
    ctx.fillRect(15+i*28,h*0.5,16,h*0.15+Math.random()*10);
    ctx.fillStyle='#f59e0b';
    ctx.fillRect(19+i*28,h*0.54,3,3);
  }
}

function drawPoolTable(ctx,w,h){
  ctx.fillStyle='#1a0800'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#5b3a1a'; ctx.fillRect(15,15,w-30,h-30);
  ctx.fillStyle='#0f6b30'; ctx.fillRect(20,20,w-40,h-40);
  const balls=[[0.3,0.4,'#fff'],[0.5,0.5,'#e11d48'],[0.55,0.35,'#2563eb'],[0.6,0.55,'#7c3aed'],[0.45,0.6,'#f59e0b']];
  balls.forEach(([rx,ry,c])=>{
    ctx.fillStyle=c; ctx.beginPath();
    ctx.arc(20+(w-40)*rx,20+(h-40)*ry,5,0,Math.PI*2); ctx.fill();
  });
  ctx.strokeStyle='#ccc'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(w*0.2,h*0.7); ctx.lineTo(w*0.45,h*0.5); ctx.stroke();
}

function drawClassroom(ctx,w,h){
  ctx.fillStyle='#0a1a12'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#2d5016'; ctx.fillRect(w*0.1,10,w*0.8,h*0.35);
  ctx.fillStyle='#fff'; ctx.font='9px sans-serif';
  ctx.fillText('DOMÁCÍ ÚKOL !!!',w*0.2,35);
  for(let r=0;r<2;r++) for(let c=0;c<3;c++){
    ctx.fillStyle='#8B4513';
    ctx.fillRect(10+c*35,h*0.52+r*28,28,18);
    ctx.fillStyle='#666';
    ctx.beginPath(); ctx.arc(24+c*35,h*0.48+r*28,5,0,Math.PI*2); ctx.fill();
  }
}

function drawEnglishBook(ctx,w,h){
  ctx.fillStyle='#0e1a2e'; ctx.fillRect(0,0,w,h);
  ctx.save(); ctx.translate(w/2,h/2); ctx.rotate(-0.1);
  ctx.fillStyle='#dc2626'; ctx.fillRect(-30,-35,60,70);
  ctx.fillStyle='#fff'; ctx.font='bold 10px sans-serif';
  ctx.textAlign='center';
  ctx.fillText('ENGLISH',0,-10);
  ctx.fillText('A1→C2',0,8);
  ctx.fillStyle='#1e40af'; ctx.fillRect(-25,16,50,3);
  ctx.restore();
  ctx.fillStyle='#3b82f6'; ctx.font='20px sans-serif'; ctx.fillText('🇬🇧',w-30,25);
}

function drawAlley(ctx,w,h){
  ctx.fillStyle='#0a0a15'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,w*0.15,h);
  ctx.fillStyle='#1a1a2e'; ctx.fillRect(w*0.85,0,w*0.15,h);
  const grd=ctx.createRadialGradient(w/2,15,3,w/2,15,50);
  grd.addColorStop(0,'rgba(255,200,50,.35)'); grd.addColorStop(1,'transparent');
  ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#333'; ctx.fillRect(w/2-8,8,16,6);
  ctx.fillStyle='#555';
  ctx.fillRect(w*0.2,h*0.7,w*0.12,h*0.3);
  ctx.fillRect(w*0.65,h*0.6,w*0.15,h*0.4);
}

function drawMystery(ctx,w,h){
  ctx.fillStyle='#0a0a18'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#fbbf24'; ctx.font='30px sans-serif';
  ctx.fillText('👁',w/2-14,h/2+5);
  for(let i=0;i<8;i++){
    ctx.fillStyle=`rgba(255,200,50,${0.03+Math.random()*0.04})`;
    ctx.beginPath();
    ctx.arc(Math.random()*w,Math.random()*h,10+Math.random()*20,0,Math.PI*2);
    ctx.fill();
  }
  ctx.strokeStyle='rgba(255,50,50,.2)'; ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(w*0.2,h*0.8); ctx.lineTo(w*0.5,h*0.3); ctx.lineTo(w*0.8,h*0.8);
  ctx.closePath(); ctx.stroke();
}

function drawNightSquare(ctx,w,h){
  ctx.fillStyle='#050510'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#0a0a22';
  ctx.fillRect(0,h*0.6,w,h*0.4);
  for(let i=0;i<20;i++){
    ctx.fillStyle=`rgba(255,255,255,${0.3+Math.random()*0.5})`;
    ctx.beginPath(); ctx.arc(Math.random()*w,Math.random()*h*0.5,0.8,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle='#fbbf24';
  ctx.beginPath(); ctx.arc(w*0.8,h*0.15,8,0,Math.PI*2); ctx.fill();
  for(let i=0;i<3;i++){
    const grd=ctx.createRadialGradient(20+i*40,h*0.55,2,20+i*40,h*0.55,12);
    grd.addColorStop(0,'rgba(255,200,80,.4)'); grd.addColorStop(1,'transparent');
    ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);
  }
  for(let i=0;i<4;i++){
    ctx.fillStyle='#111'; ctx.fillRect(10+i*26,h*0.45,18,h*0.2);
    ctx.fillStyle='#f59e0b55'; ctx.fillRect(14+i*26,h*0.48,4,5);
  }
}

function drawMysticBrew(ctx,w,h){
  ctx.fillStyle='#0e0a1a'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#2d1a4e';
  ctx.beginPath(); ctx.moveTo(w*0.3,h*0.35); ctx.lineTo(w*0.7,h*0.35);
  ctx.lineTo(w*0.65,h*0.8); ctx.lineTo(w*0.35,h*0.8); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#6b21a8';
  ctx.fillRect(w*0.36,h*0.5,w*0.28,h*0.28);
  for(let i=0;i<5;i++){
    ctx.fillStyle=`rgba(${150+Math.random()*100},50,255,${0.3+Math.random()*0.3})`;
    ctx.beginPath();
    ctx.arc(w*0.38+Math.random()*w*0.24,h*0.55+Math.random()*h*0.2,3+Math.random()*4,0,Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle='rgba(200,150,255,.15)';
  for(let i=0;i<3;i++){
    ctx.beginPath(); ctx.arc(w*0.45+i*8,h*0.42-i*8,4-i,0,Math.PI*2); ctx.fill();
  }
}

function drawSelfieMirror(ctx,w,h){
  ctx.fillStyle='#1a1028'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#c084fc';
  ctx.beginPath(); ctx.arc(w/2,h*0.3,14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#c084fc'; ctx.fillRect(w/2-8,h*0.42,16,25);
  ctx.strokeStyle='#e879f9'; ctx.lineWidth=2;
  ctx.strokeRect(w*0.15,5,w*0.7,h-10);
  ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fillRect(w*0.15,5,w*0.35,h-10);
  ctx.fillStyle='#f0abfc'; ctx.font='10px sans-serif'; ctx.fillText('✌️',w/2+10,h*0.45);
  ctx.fillStyle='#fbbf24'; ctx.font='8px sans-serif'; ctx.fillText('💅',w*0.7,h*0.85);
}

function drawGraph(ctx,w,h){
  ctx.fillStyle='#0a1020'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#334155'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(20,h-15); ctx.lineTo(20,10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20,h-15); ctx.lineTo(w-10,h-15); ctx.stroke();
  ctx.strokeStyle='#22c55e'; ctx.lineWidth=2; ctx.beginPath();
  const pts=[[20,h*0.7],[40,h*0.5],[55,h*0.55],[70,h*0.3],[85,h*0.35],[w-15,h*0.15]];
  pts.forEach(([x,y],i)=>{ i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.stroke();
  pts.forEach(([x,y])=>{
    ctx.fillStyle='#22c55e'; ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
  });
  ctx.fillStyle='#64748b'; ctx.font='7px sans-serif'; ctx.fillText('EKO 📊',25,18);
}

function drawSpeaker(ctx,w,h){
  ctx.fillStyle='#1a0a1a'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#333'; ctx.fillRect(w*0.3,h*0.2,w*0.4,h*0.6);
  ctx.fillStyle='#111';
  ctx.beginPath(); ctx.arc(w/2,h*0.4,12,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(w/2,h*0.65,8,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#444'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(w/2,h*0.4,12,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(w/2,h*0.65,8,0,Math.PI*2); ctx.stroke();
  for(let i=1;i<4;i++){
    ctx.strokeStyle=`rgba(139,92,246,${0.4-i*0.1})`;
    ctx.beginPath(); ctx.arc(w/2,h/2,25+i*10,Math.PI*1.3,Math.PI*1.7); ctx.stroke();
  }
}

function drawMorningCoffee(ctx,w,h){
  ctx.fillStyle='#1a1408'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#8B6914'; ctx.fillRect(w*0.3,h*0.35,w*0.3,h*0.4);
  ctx.fillStyle='#5c3d0a'; ctx.fillRect(w*0.33,h*0.4,w*0.24,h*0.15);
  ctx.fillStyle='#fff'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(w*0.65,h*0.5,6,Math.PI*1.5,Math.PI*0.5); ctx.stroke();
  for(let i=0;i<3;i++){
    ctx.strokeStyle=`rgba(255,255,255,${0.1+i*0.05})`;
    ctx.beginPath();
    ctx.moveTo(w*0.38+i*8,h*0.35);
    ctx.quadraticCurveTo(w*0.4+i*8,h*0.2,w*0.38+i*8,h*0.12);
    ctx.stroke();
  }
  ctx.fillStyle='#22c55e'; ctx.font='12px sans-serif'; ctx.fillText('🌿',w*0.15,h*0.75);
  ctx.fillStyle='#fbbf24'; ctx.font='8px sans-serif'; ctx.fillText('☕',w*0.7,h*0.3);
}

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.random()*i|0;[arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

function open(){
  const ov=document.getElementById('kremzogram-ov');
  if(!ov) return;
  const feed=document.getElementById('kg-feed');
  feed.innerHTML='';
  const shown = shuffle([...POSTS]).slice(0,8);
  shown.forEach(p=>{
    const post=document.createElement('div');
    post.className='kg-post';

    const cvs=document.createElement('canvas');
    cvs.width=360; cvs.height=280; cvs.className='kg-post-img';
    const c=cvs.getContext('2d');
    c.save(); c.scale(3,2.8);
    try{ p.drawFn(c,120,100); }catch(e){}
    c.restore();

    const liked={v:false};
    const heart=document.createElement('span');
    heart.className='kg-heart';
    heart.textContent='♡';
    heart.onclick=function(e){
      e.stopPropagation();
      liked.v=!liked.v;
      heart.textContent=liked.v?'♥':'♡';
      heart.style.color=liked.v?'#e11d48':'#888';
      lc.textContent=(p.likes+(liked.v?1:0))+' líbí se';
    };

    const lc=document.createElement('div');
    lc.className='kg-likes';
    lc.textContent=p.likes+' líbí se';

    const head=document.createElement('div');
    head.className='kg-post-head';
    head.innerHTML=`<span class="kg-av">${p.avatar}</span><span class="kg-nick">${p.nick}</span><span class="kg-time">${p.time}</span>`;
    const body=document.createElement('div');
    body.className='kg-post-body';
    body.innerHTML=`<span class="kg-text">${p.text}</span>`;
    const acts=document.createElement('div');
    acts.className='kg-actions';
    acts.appendChild(heart);
    acts.appendChild(lc);
    post.appendChild(head);
    post.appendChild(cvs);
    post.appendChild(body);
    post.appendChild(acts);
    feed.appendChild(post);
  });
  ov.classList.add('on');
}

function close(){
  document.getElementById('kremzogram-ov')?.classList.remove('on');
}

return {open,close};
})();

function openKremzogram(){ KREMZOGRAM.open(); }
function closeKremzogram(){ KREMZOGRAM.close(); }
