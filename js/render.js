'use strict';
// ═══════════════════════════════════════════
//  VYKRESLOVACÍ ENGINE
// ═══════════════════════════════════════════

function shadeColor(hex, pct){
  const n=parseInt(hex.replace('#',''),16), f=pct/100;
  const r=Math.min(255,Math.max(0,(n>>16)+Math.round(255*f)));
  const g=Math.min(255,Math.max(0,((n>>8)&0xff)+Math.round(255*f)));
  const b=Math.min(255,Math.max(0,(n&0xff)+Math.round(255*f)));
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

function rrect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

// ─── Animace smrti NPC – tělo + krvácení ──────────────────────────────────
function drawDeathBody(anim, t, bodyColor, type){
  const elapsed = (gs.ts - anim.startTime) / 1000; // v sekundách
  const bx = anim.x, by = anim.y;
  const progress = Math.min(elapsed / 10, 1); // 0→1 přes 10s

  // ── Loužička krve – postupně roste ──
  const poolR = 8 + progress * 35;
  const poolAlpha = 0.3 + progress * 0.5;
  ctx.fillStyle = `rgba(120,0,0,${poolAlpha})`;
  ctx.beginPath(); ctx.ellipse(bx + 8, by + 12, poolR, poolR * 0.45, 0.15, 0, Math.PI * 2); ctx.fill();
  // Odraz na loužičce
  ctx.fillStyle = `rgba(180,0,0,${poolAlpha * 0.3})`;
  ctx.beginPath(); ctx.ellipse(bx + 5, by + 8, poolR * 0.5, poolR * 0.2, 0.1, 0, Math.PI * 2); ctx.fill();

  // ── Tělo na zemi (otočené na bok) ──
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(Math.PI / 2.5);
  // Tělo
  ctx.fillStyle = bodyColor;
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 20, 0, 0, Math.PI * 2); ctx.fill();
  // Hlava
  ctx.fillStyle = '#fde8c8';
  ctx.beginPath(); ctx.arc(-22, -8, 16, 0, Math.PI * 2); ctx.fill();
  // Zavřené oči
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-26, -10); ctx.lineTo(-22, -8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-16, -8); ctx.stroke();
  ctx.restore();

  if(type === 'mates'){
    // ── Mates – krev kape z krku ──
    if(progress < 1){
      const neckX = bx - 6, neckY = by - 4;
      // Kapky padající z krku
      for(let d = 0; d < 3; d++){
        const dropPhase = ((t * 0.003 + d * 1.2) % 2);
        if(dropPhase < 1.5){
          const dy = neckY + dropPhase * 20;
          const dropAlpha = (1 - dropPhase / 1.5) * 0.8;
          ctx.fillStyle = `rgba(180,0,0,${dropAlpha})`;
          ctx.beginPath(); ctx.arc(neckX + d * 3 - 3, dy, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Stékání po krku
      ctx.strokeStyle = `rgba(160,0,0,${0.6 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(neckX, neckY);
      ctx.quadraticCurveTo(neckX + 4, neckY + 8, neckX + 6, neckY + 14);
      ctx.stroke();
    }
  } else {
    // ── Milan – krev stříká jako fontána ──
    if(progress < 1){
      const sprayX = bx + 2, sprayY = by - 6;
      const sprayStrength = 1 - progress;
      // Stříkající paprsky krve
      for(let ji = 0; ji < 5; ji++){
        const ang = (ji / 5) * Math.PI - Math.PI * 0.5;
        const jH = 25 * sprayStrength * (0.6 + 0.4 * Math.abs(Math.sin(t * 0.005 + ji * 1.3)));
        const endX = sprayX + Math.cos(ang) * 18 * sprayStrength;
        const endY = sprayY - jH;
        const sG = ctx.createLinearGradient(sprayX, sprayY, endX, endY);
        sG.addColorStop(0, `rgba(200,0,0,${0.85 * sprayStrength})`);
        sG.addColorStop(0.5, `rgba(150,0,0,${0.5 * sprayStrength})`);
        sG.addColorStop(1, `rgba(80,0,0,${0.1 * sprayStrength})`);
        ctx.strokeStyle = sG; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sprayX, sprayY);
        ctx.quadraticCurveTo(sprayX + Math.cos(ang) * 10, sprayY - jH * 0.7, endX, endY);
        ctx.stroke();
      }
      // Kapky kolem
      for(let k = 0; k < 4; k++){
        const kPhase = ((t * 0.004 + k * 0.8) % 1.5);
        const kAng = (k / 4) * Math.PI * 2 + t * 0.001;
        const kDist = kPhase * 22 * sprayStrength;
        const kx2 = sprayX + Math.cos(kAng) * kDist;
        const ky2 = sprayY - kPhase * 15 * sprayStrength + kPhase * kPhase * 8;
        ctx.fillStyle = `rgba(180,0,0,${(1 - kPhase / 1.5) * 0.6 * sprayStrength})`;
        ctx.beginPath(); ctx.arc(kx2, ky2, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

// ─── Sdílený helper: kreslení očí na hlavě ────────────────────────────────
function drawPixelFace(cx, cy, sz){
  const er=3.6*sz;
  // Blink cycle: every ~4s, blink lasts ~150ms
  const blinkPhase = ((gs.ts * 0.001 + cx*0.1) % 4.0);
  const isBlinking = blinkPhase > 3.85;
  ctx.fillStyle='#1e1a2e';
  if(isBlinking){
    // Closed eyes – horizontal lines
    ctx.fillRect(cx-8.5*sz,cy-1*sz,5*sz,2*sz);
    ctx.fillRect(cx+3.5*sz,cy-1*sz,5*sz,2*sz);
  } else {
    ctx.beginPath(); ctx.arc(cx-6*sz,cy,er,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+6*sz,cy,er,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(cx-4.5*sz,cy-1.6*sz,er*0.42,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+7.5*sz,cy-1.6*sz,er*0.42,0,Math.PI*2); ctx.fill();
  }
}
function drawAngryFace(cx, cy, sz){
  drawPixelFace(cx,cy,sz);
  ctx.strokeStyle='#3a1010'; ctx.lineWidth=1.8*sz; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(cx-10.5*sz,cy-6.5*sz); ctx.lineTo(cx-2.5*sz,cy-4.5*sz); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+10.5*sz,cy-6.5*sz); ctx.lineTo(cx+2.5*sz,cy-4.5*sz); ctx.stroke();
}
function drawDazedFace(cx, cy, sz){
  ctx.strokeStyle='rgba(50,20,20,0.75)'; ctx.lineWidth=2.2*sz; ctx.lineCap='round';
  for(const ox of [-6*sz,6*sz]){
    ctx.beginPath(); ctx.moveTo(cx+ox-3*sz,cy-3*sz); ctx.lineTo(cx+ox+3*sz,cy+3*sz); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+ox+3*sz,cy-3*sz); ctx.lineTo(cx+ox-3*sz,cy+3*sz); ctx.stroke();
  }
}

function perspGrid(vpX, hor, W, H, cols, rows, col, lw){
  ctx.strokeStyle=col; ctx.lineWidth=lw;
  for(let i=0;i<=cols;i++){
    const bx=(i/cols)*W;
    const tx=vpX+(bx-vpX)*0.04;
    ctx.beginPath(); ctx.moveTo(tx,hor); ctx.lineTo(bx,H); ctx.stroke();
  }
  for(let j=1;j<=rows;j++){
    const d=j/rows;
    const fy=hor+Math.pow(d,1.35)*(H-hor);
    ctx.beginPath(); ctx.moveTo(0,fy); ctx.lineTo(W,fy); ctx.stroke();
  }
}

function drawRoom(rm,W,H,t){
  switch(gs.room){
    case 'ucebna':  drawUcebna(W,H,t);  break;
    case 'billa':   drawBilla(W,H,t);   break;
    case 'hospoda': drawHospoda(W,H,t); break;
    case 'ulice':   drawUlice(W,H,t);   break;
    case 'kremze':       drawKremze(W,H,t);      break;
    case 'johnny_vila':  drawJohnnyVila(W,H,t);  break;
    case 'koupelna':     drawKoupelna(W,H,t);    break;
    case 'sklep':   drawSklep(W,H,t);   break;
    case 'heaven':       drawHeavenRoom(W,H,t);  break;
    case 'heaven_gate':  drawHeavenGate(W,H,t);  break;
    case 'doma':         drawDoma(W,H,t);        break;
    default: ctx.fillStyle=rm.bg; ctx.fillRect(0,0,W,H);
  }
}

// ─── Učebna ───────────────────────────────────────────────────────────────────
function drawUcebna(W,H,t){
  const hor=H*0.50, vpX=W*0.50;

  // Strop
  const cg=ctx.createLinearGradient(0,0,0,hor*0.55);
  cg.addColorStop(0,'#141c2c'); cg.addColorStop(1,'#1c2438');
  ctx.fillStyle=cg; ctx.fillRect(0,0,W,hor);

  // Stropní lampy (3 fluorescenty) — s občasným blikáním
  [W*0.22,W*0.50,W*0.78].forEach((lx,li)=>{
    // Blikání — každá lampa má vlastní rytmus
    const flicker = Math.sin(t*0.012+li*97)*Math.sin(t*0.0037+li*53);
    const isFlickering = flicker > 0.92; // občasný mikro-blik
    const lAlpha = isFlickering ? 0.45+Math.random()*0.3 : 0.90;
    const coneAlpha = isFlickering ? 0.06 : 0.18;

    ctx.fillStyle='#161e30'; ctx.fillRect(lx-W*0.055,0,W*0.11,H*0.022);
    ctx.fillStyle=`rgba(215,232,255,${lAlpha})`; ctx.fillRect(lx-W*0.05,H*0.005,W*0.10,H*0.012);
    const cone=ctx.createRadialGradient(lx,H*0.016,0,lx,H*0.016,W*0.3);
    cone.addColorStop(0,`rgba(205,225,255,${coneAlpha})`); cone.addColorStop(0.5,`rgba(205,225,255,${coneAlpha*0.33})`); cone.addColorStop(1,'transparent');
    ctx.fillStyle=cone;
    ctx.beginPath(); ctx.moveTo(lx-W*0.05,H*0.017); ctx.lineTo(lx+W*0.05,H*0.017); ctx.lineTo(lx+W*0.30,hor); ctx.lineTo(lx-W*0.30,hor); ctx.closePath(); ctx.fill();
  });

  // Zadní zeď
  const wg=ctx.createLinearGradient(0,0,0,hor);
  wg.addColorStop(0,'#1e2840'); wg.addColorStop(1,'#141828');
  ctx.fillStyle=wg; ctx.fillRect(0,H*0.10,W,hor-H*0.10);
  ctx.fillStyle='#1a2235'; ctx.fillRect(0,hor-H*0.06,W,H*0.06);
  ctx.fillStyle='#242e45'; ctx.fillRect(0,hor-H*0.064,W,H*0.008);

  // Okna – světelné šachty
  [[W*0.02,H*0.10],[W*0.83,H*0.10]].forEach(([wx,wy])=>{
    const ww=W*0.12, wh=H*0.28;
    // šachta světla na podlaze
    const shG=ctx.createLinearGradient(wx+ww/2,wy+wh,wx+ww/2,H);
    shG.addColorStop(0,'rgba(190,220,255,0.11)'); shG.addColorStop(1,'rgba(190,220,255,0)');
    ctx.fillStyle=shG;
    ctx.beginPath(); ctx.moveTo(wx,wy+wh); ctx.lineTo(wx+ww,wy+wh); ctx.lineTo(wx+ww+W*0.12,H); ctx.lineTo(wx-W*0.02,H); ctx.closePath(); ctx.fill();
    // sklo
    const winG=ctx.createLinearGradient(wx,wy,wx,wy+wh);
    winG.addColorStop(0,'rgba(180,215,255,0.88)'); winG.addColorStop(1,'rgba(150,200,245,0.72)');
    ctx.fillStyle=winG; ctx.fillRect(wx,wy,ww,wh);
    ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.moveTo(wx+2,wy+2); ctx.lineTo(wx+ww*0.55,wy+2); ctx.lineTo(wx+ww*0.35,wy+wh*0.44); ctx.lineTo(wx+2,wy+wh*0.44); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(200,225,255,0.4)'; ctx.lineWidth=2; ctx.strokeRect(wx,wy,ww,wh);
    ctx.strokeStyle='rgba(200,225,255,0.18)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(wx+ww/2,wy); ctx.lineTo(wx+ww/2,wy+wh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx,wy+wh/2); ctx.lineTo(wx+ww,wy+wh/2); ctx.stroke();
    ctx.fillStyle='#262040'; ctx.fillRect(wx-3,wy+wh,ww+6,H*0.018);
  });

  // ── MAPA ČR na zdi vlevo od tabule ──
  {
    const mx=W*0.02, my=H*0.12, mw=W*0.16, mh=H*0.18;
    // Papír
    ctx.fillStyle='rgba(240,235,220,0.15)'; rrect(mx,my,mw,mh,2); ctx.fill();
    ctx.strokeStyle='rgba(200,190,170,0.20)'; ctx.lineWidth=1; rrect(mx,my,mw,mh,2); ctx.stroke();
    // Obrys ČR – zjednodušený
    ctx.save();
    ctx.strokeStyle='rgba(40,100,60,0.35)'; ctx.lineWidth=1.5; ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(mx+mw*0.15,my+mh*0.35);
    ctx.lineTo(mx+mw*0.25,my+mh*0.20); ctx.lineTo(mx+mw*0.45,my+mh*0.18);
    ctx.lineTo(mx+mw*0.60,my+mh*0.25); ctx.lineTo(mx+mw*0.80,my+mh*0.30);
    ctx.lineTo(mx+mw*0.90,my+mh*0.45); ctx.lineTo(mx+mw*0.85,my+mh*0.60);
    ctx.lineTo(mx+mw*0.70,my+mh*0.70); ctx.lineTo(mx+mw*0.50,my+mh*0.65);
    ctx.lineTo(mx+mw*0.30,my+mh*0.70); ctx.lineTo(mx+mw*0.15,my+mh*0.55);
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle='rgba(60,120,80,0.12)'; ctx.fill();
    // Puntík – Praha
    ctx.fillStyle='rgba(200,40,40,0.40)'; ctx.beginPath(); ctx.arc(mx+mw*0.38,my+mh*0.40,2.5,0,Math.PI*2); ctx.fill();
    // Nápis
    ctx.fillStyle='rgba(40,30,20,0.25)'; ctx.font=`bold ${Math.floor(mw*0.08)}px Georgia,serif`;
    ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText('ČESKÁ REPUBLIKA',mx+mw/2,my+mh*0.92);
    ctx.restore();
    // Připínáček
    ctx.fillStyle='rgba(200,50,50,0.50)'; ctx.beginPath(); ctx.arc(mx+mw/2,my-2,3,0,Math.PI*2); ctx.fill();
  }

  // ── DVEŘE třídy (vpravo) ──
  {
    const dx=W*0.85, dy=H*0.08, dw=W*0.10, dh=H*0.36;
    ctx.fillStyle='#3a2818'; rrect(dx,dy,dw,dh,3); ctx.fill();
    ctx.strokeStyle='#5a4020'; ctx.lineWidth=2; rrect(dx,dy,dw,dh,3); ctx.stroke();
    // Panely
    ctx.strokeStyle='rgba(80,55,25,0.3)'; ctx.lineWidth=1;
    ctx.strokeRect(dx+dw*0.1,dy+dh*0.05,dw*0.8,dh*0.25);
    ctx.strokeRect(dx+dw*0.1,dy+dh*0.40,dw*0.8,dh*0.25);
    // Okénko ve dveřích
    ctx.fillStyle='rgba(160,200,240,0.20)'; ctx.fillRect(dx+dw*0.15,dy+dh*0.08,dw*0.7,dh*0.18);
    ctx.strokeStyle='rgba(120,100,70,0.25)'; ctx.lineWidth=0.5; ctx.strokeRect(dx+dw*0.15,dy+dh*0.08,dw*0.7,dh*0.18);
    // Klika
    ctx.fillStyle='rgba(200,200,200,0.35)'; ctx.beginPath(); ctx.arc(dx+dw*0.82,dy+dh*0.55,3,0,Math.PI*2); ctx.fill();
    // Cedulka
    ctx.fillStyle='rgba(255,255,255,0.15)'; rrect(dx+dw*0.15,dy+dh*0.72,dw*0.7,dh*0.08,1); ctx.fill();
    ctx.fillStyle='rgba(30,30,50,0.30)'; ctx.font=`bold ${Math.floor(dw*0.14)}px Outfit,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('4.B',dx+dw/2,dy+dh*0.76);
    ctx.textAlign='left';
  }

  // Tabule – větší a detailnější
  const bx=W*0.21,by=H*0.07,bw=W*0.58,bh=H*0.29;
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(bx+6,by+6,bw,bh);
  // Dřevěný rám – vícenásobný
  ctx.fillStyle='#5a3810'; ctx.fillRect(bx-12,by-12,bw+24,bh+24);
  ctx.fillStyle='#4a3010'; ctx.fillRect(bx-8,by-8,bw+16,bh+16);
  ctx.strokeStyle='#6a4820'; ctx.lineWidth=2; ctx.strokeRect(bx-12,by-12,bw+24,bh+24);
  // Zelená plocha tabule
  const bdG=ctx.createLinearGradient(bx,by,bx+bw*0.5,by+bh);
  bdG.addColorStop(0,'#0e3520'); bdG.addColorStop(0.5,'#0a2c18'); bdG.addColorStop(1,'#081e10');
  ctx.fillStyle=bdG; ctx.fillRect(bx,by,bw,bh);
  const bsh=ctx.createLinearGradient(bx,by,bx+bw*0.35,by+bh*0.5);
  bsh.addColorStop(0,'rgba(255,255,255,0.05)'); bsh.addColorStop(1,'transparent');
  ctx.fillStyle=bsh; ctx.fillRect(bx,by,bw,bh);
  // Otisky houby (čistěné oblasti)
  ctx.fillStyle='rgba(20,60,35,0.15)'; ctx.fillRect(bx+bw*0.55,by+bh*0.40,bw*0.35,bh*0.50);
  // křída – více textu
  ctx.save(); ctx.globalAlpha=0.30;
  ctx.font=`bold ${Math.floor(W*0.018)}px Georgia,serif`; ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('ROZBOR MÁCHY – DÚ',bx+bw*0.5,by+bh*0.12);
  ctx.globalAlpha=0.18; ctx.font=`${Math.floor(W*0.010)}px Georgia,serif`;
  ctx.fillText('1) Životopis  •  2) Hlavní témata  •  3) Symbolika',bx+bw*0.5,by+bh*0.26);
  // Matematika v rohu
  ctx.globalAlpha=0.12; ctx.font=`${Math.floor(W*0.008)}px Georgia,serif`; ctx.textAlign='right';
  ctx.fillText('∫ f(x)dx = F(x) + C',bx+bw-10,by+bh*0.88);
  ctx.fillText('a² + b² = c²',bx+bw-10,by+bh*0.78);
  // Doodle – smajlík v rohu
  ctx.textAlign='left'; ctx.globalAlpha=0.10;
  ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(bx+bw*0.08,by+bh*0.82,8,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(bx+bw*0.065,by+bh*0.80,1.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx+bw*0.095,by+bh*0.80,1.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx+bw*0.08,by+bh*0.84,4,0,Math.PI); ctx.stroke();
  ctx.globalAlpha=0.15; ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.lineCap='round';
  [0.44,0.54,0.64].forEach((fy,i)=>{ ctx.beginPath(); ctx.moveTo(bx+bw*0.07,by+bh*fy); ctx.lineTo(bx+bw*(0.22+i*0.14),by+bh*fy); ctx.stroke(); });
  ctx.restore();
  // Pult pod tabulí
  ctx.fillStyle='#3a2008'; ctx.fillRect(bx,by+bh,bw,13);
  // křídové kousky – barevná
  [[bx+bw*0.10,'rgba(240,235,220,0.8)'],[bx+bw*0.18,'rgba(240,235,220,0.7)'],[bx+bw*0.25,'rgba(255,220,100,0.6)'],[bx+bw*0.32,'rgba(200,100,100,0.5)']].forEach(([cx2,col])=>{
    ctx.fillStyle=col; ctx.fillRect(cx2,by+bh+2,18,5);
  });
  // houba
  ctx.fillStyle='#8a6040'; rrect(bx+bw-58,by+bh+1,34,9,3); ctx.fill();
  ctx.fillStyle='#7a5030'; ctx.fillRect(bx+bw-56,by+bh+2,30,3);

  // ── Radiátor pod oknem (vlevo) ──
  {
    const rx=W*0.02, ry=H*0.40, rw=W*0.12, rh=H*0.08;
    ctx.fillStyle='rgba(200,200,210,0.12)'; ctx.fillRect(rx,ry,rw,rh);
    for(let ri=0;ri<6;ri++){
      ctx.fillStyle='rgba(210,210,220,0.10)'; ctx.fillRect(rx+ri*rw/6,ry,rw/6-1,rh);
      ctx.strokeStyle='rgba(180,180,190,0.08)'; ctx.lineWidth=0.5; ctx.strokeRect(rx+ri*rw/6,ry,rw/6-1,rh);
    }
  }

  // Hodiny
  const ckX=W*0.5,ckY=H*0.044,ckR=W*0.025;
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(ckX+2,ckY+2,ckR,0,Math.PI*2); ctx.fill();
  const ckfG=ctx.createRadialGradient(ckX-ckR*0.3,ckY-ckR*0.3,0,ckX,ckY,ckR);
  ckfG.addColorStop(0,'#f5f0e8'); ckfG.addColorStop(1,'#ddd0b8');
  ctx.fillStyle=ckfG; ctx.beginPath(); ctx.arc(ckX,ckY,ckR,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#2a1808'; ctx.lineWidth=2; ctx.stroke();
  for(let i=0;i<12;i++){ const a=(i/12)*Math.PI*2-Math.PI/2, ir=i%3===0?ckR*0.82:ckR*0.88, il=i%3===0?ckR*0.08:ckR*0.045; ctx.strokeStyle='#1a0808'; ctx.lineWidth=i%3===0?2:1; ctx.beginPath(); ctx.moveTo(ckX+Math.cos(a)*ir,ckY+Math.sin(a)*ir); ctx.lineTo(ckX+Math.cos(a)*(ir+il),ckY+Math.sin(a)*(ir+il)); ctx.stroke(); }
  ctx.strokeStyle='#1a0808'; ctx.lineWidth=2.5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(ckX,ckY); ctx.lineTo(ckX+Math.cos(t*0.0001-Math.PI/2)*ckR*0.55,ckY+Math.sin(t*0.0001-Math.PI/2)*ckR*0.55); ctx.stroke();
  ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(ckX,ckY); ctx.lineTo(ckX+Math.cos(t*0.001-Math.PI/2)*ckR*0.8,ckY+Math.sin(t*0.001-Math.PI/2)*ckR*0.8); ctx.stroke();
  ctx.fillStyle='#c02010'; ctx.beginPath(); ctx.arc(ckX,ckY,3,0,Math.PI*2); ctx.fill();

  // Podlaha – perspektivní parkety
  const flG=ctx.createLinearGradient(0,hor,0,H);
  flG.addColorStop(0,'#2e2010'); flG.addColorStop(0.3,'#3a2814'); flG.addColorStop(1,'#261608');
  ctx.fillStyle=flG; ctx.fillRect(0,hor,W,H-hor);
  perspGrid(vpX,hor,W,H,14,12,'rgba(12,6,2,0.50)',1);
  // světlo z oken na podlaze
  [[W*0.08,H*0.15],[W*0.89,H*0.14]].forEach(([lx,ly])=>{
    const slG=ctx.createRadialGradient(lx,H*0.7,0,lx,H*0.7,W*0.28);
    slG.addColorStop(0,'rgba(190,220,255,0.08)'); slG.addColorStop(1,'transparent');
    ctx.fillStyle=slG; ctx.fillRect(0,hor,W,H-hor);
  });

  // Učitelský stůl
  const dkX=W*0.35,dkY=hor-H*0.07,dkW=W*0.30,dkH=H*0.052;
  ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(dkX+5,dkY+dkH,dkW,H*0.04);
  const dkG2=ctx.createLinearGradient(dkX,dkY,dkX,dkY+dkH);
  dkG2.addColorStop(0,'#5a3a18'); dkG2.addColorStop(1,'#3a2208');
  ctx.fillStyle=dkG2; ctx.fillRect(dkX,dkY,dkW,dkH);
  ctx.strokeStyle='#6a4820'; ctx.lineWidth=1.5; ctx.strokeRect(dkX,dkY,dkW,dkH);
  ctx.fillStyle='#2a1808'; ctx.fillRect(dkX+10,dkY+dkH,8,H*0.04); ctx.fillRect(dkX+dkW-18,dkY+dkH,8,H*0.04);
  ctx.fillStyle='#c8401a'; ctx.fillRect(dkX+dkW*0.1,dkY-H*0.030,dkW*0.18,H*0.032);
  ctx.fillStyle='#e85020'; ctx.fillRect(dkX+dkW*0.1,dkY-H*0.030,dkW*0.18,H*0.006);
  ctx.fillStyle='#f0c040'; ctx.fillRect(dkX+dkW*0.36,dkY-H*0.038,4,H*0.044);
  ctx.fillStyle='#eee'; rrect(dkX+dkW*0.64,dkY-H*0.032,W*0.020,H*0.034,3); ctx.fill();
  ctx.fillStyle='#5a2010'; ctx.fillRect(dkX+dkW*0.64+2,dkY-H*0.030,W*0.016,H*0.015);

  // Lavice žáků – s detaily
  for(let r=0;r<3;r++) for(let c=0;c<4;c++){
    const sc=1-r*0.10;
    const lw=W*0.13*sc, lh=H*0.036*sc;
    const lx=W*0.10+c*W*0.22, ly=hor+H*0.06+r*H*0.16;
    // Stín lavice
    ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(lx+4,ly+lh,lw,H*0.026);
    // Deska lavice s texturou
    const lvG=ctx.createLinearGradient(lx,ly,lx,ly+lh);
    lvG.addColorStop(0,shadeColor('#4a3215',12)); lvG.addColorStop(1,'#3a2510');
    ctx.fillStyle=lvG; ctx.fillRect(lx,ly,lw,lh);
    ctx.strokeStyle='#5a4020'; ctx.lineWidth=1; ctx.strokeRect(lx,ly,lw,lh);
    // Vyřezané iniciály na některých lavicích
    if((r+c)%4===0){
      ctx.fillStyle='rgba(0,0,0,0.06)'; ctx.font=`${Math.floor(lh*0.50)}px monospace`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      const initials=['F+J','♥','KH','ZŠ'];
      ctx.fillText(initials[(r*4+c)%initials.length],lx+lw*0.75,ly+lh*0.5);
      ctx.textAlign='left';
    }
    // Nohy
    ctx.fillStyle='#2a1808'; ctx.fillRect(lx+4,ly+lh,5,H*0.025); ctx.fillRect(lx+lw-9,ly+lh,5,H*0.025);
    // Sešity/učebnice na lavici
    if((r+c)%3!==2){
      const h2=(r*4+c)*38;
      ctx.fillStyle=`hsl(${h2},55%,35%)`; ctx.fillRect(lx+lw*0.08,ly-lh*0.6,lw*0.26,lh*0.55);
      ctx.fillStyle=`hsl(${h2},55%,50%)`; ctx.fillRect(lx+lw*0.08,ly-lh*0.6,lw*0.26,lh*0.12);
      // Tužka
      ctx.fillStyle='rgba(220,200,60,0.5)'; ctx.save();
      ctx.translate(lx+lw*0.50,ly-lh*0.2); ctx.rotate(0.15);
      ctx.fillRect(0,0,lw*0.20,2); ctx.restore();
    }
    // Guma na některých lavicích
    if((r+c)%5===1){
      ctx.fillStyle='rgba(200,180,190,0.25)'; ctx.fillRect(lx+lw*0.60,ly-lh*0.15,lw*0.08,lh*0.30);
    }
  }
  // Koš u katedry
  {
    const kox=W*0.56, koy=hor-H*0.04;
    ctx.fillStyle='rgba(80,70,60,0.20)';
    ctx.beginPath(); ctx.moveTo(kox-8,koy+H*0.06); ctx.lineTo(kox+10,koy+H*0.06);
    ctx.lineTo(kox+8,koy); ctx.lineTo(kox-6,koy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(100,90,80,0.15)'; ctx.lineWidth=0.5; ctx.stroke();
    // Zmuchlaný papír v koši
    ctx.fillStyle='rgba(240,235,220,0.12)';
    ctx.beginPath(); ctx.arc(kox+1,koy+H*0.02,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(kox-3,koy+H*0.01,3,0,Math.PI*2); ctx.fill();
  }

  // Sanitka – zobrazí se po kratom incidentu tam, kde stávala Figurová
  if(gs.story.figurova_sanitka){
    const sw=180, sh=56, sx=W*0.50-sw/2, sy=H*0.68-sh/2;
    // Stín
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx+sw*0.5,sy+sh+8,sw*0.52,12,0,0,Math.PI*2); ctx.fill();
    // Karoserie – bílá
    const sG=ctx.createLinearGradient(sx,sy,sx,sy+sh);
    sG.addColorStop(0,'#f4f8fc'); sG.addColorStop(1,'#d4dde8');
    ctx.fillStyle=sG; rrect(sx,sy,sw,sh,6); ctx.fill();
    ctx.strokeStyle='#90a8c0'; ctx.lineWidth=2; rrect(sx,sy,sw,sh,6); ctx.stroke();
    // Kabina řidiče (přední část)
    ctx.fillStyle='#dde6f0'; rrect(sx+sw*0.68,sy-22,sw*0.32,28,4); ctx.fill();
    ctx.strokeStyle='#90a8c0'; ctx.lineWidth=1.5; rrect(sx+sw*0.68,sy-22,sw*0.32,28,4); ctx.stroke();
    // Čelní sklo
    ctx.fillStyle='rgba(130,185,240,0.65)'; rrect(sx+sw*0.70,sy-19,sw*0.28,20,3); ctx.fill();
    // Červený pruh podél boku
    ctx.fillStyle='rgba(210,25,25,0.72)'; ctx.fillRect(sx,sy+sh*0.14,sw,sh*0.16);
    // Červený kříž
    ctx.fillStyle='#dd1818';
    ctx.fillRect(sx+sw*0.18,sy+sh*0.22,36,8); ctx.fillRect(sx+sw*0.18+14,sy+sh*0.07,8,36);
    // Boční okno sanitní části
    ctx.fillStyle='rgba(130,185,240,0.5)'; rrect(sx+sw*0.06,sy+8,sw*0.10,sh*0.42,3); ctx.fill();
    ctx.strokeStyle='rgba(100,150,200,0.4)'; ctx.lineWidth=1; rrect(sx+sw*0.06,sy+8,sw*0.10,sh*0.42,3); ctx.stroke();
    // Kola (4 – dvojitá náprava vzadu)
    ctx.fillStyle='#181820';
    [sx+32, sx+sw-36, sx+sw-52].forEach(wx=>{ ctx.beginPath(); ctx.arc(wx,sy+sh,16,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle='#444';
    [sx+32, sx+sw-36, sx+sw-52].forEach(wx=>{ ctx.beginPath(); ctx.arc(wx,sy+sh,9,0,Math.PI*2); ctx.fill(); });
    // Přední kolo
    ctx.fillStyle='#181820'; ctx.beginPath(); ctx.arc(sx+sw*0.82,sy+sh,16,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#444';    ctx.beginPath(); ctx.arc(sx+sw*0.82,sy+sh,9,0,Math.PI*2); ctx.fill();
    // Maják – blikající modrý/červený
    const mBlink = Math.floor(t*0.006) % 2 === 0;
    ctx.fillStyle = mBlink ? 'rgba(30,90,255,0.95)' : 'rgba(210,20,20,0.90)';
    ctx.beginPath(); ctx.arc(sx+sw*0.82,sy-28,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = mBlink ? 'rgba(30,90,255,0.18)' : 'rgba(210,20,20,0.15)';
    ctx.beginPath(); ctx.arc(sx+sw*0.82,sy-28,22,0,Math.PI*2); ctx.fill();
    // Popisek
    ctx.fillStyle='rgba(20,20,50,0.60)'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText('ZÁCHRANNÁ SLUŽBA', sx+sw*0.5, sy-34);
    ctx.textAlign='left';
  }

  // ── Prachové částice ve světelných paprscích z oken ──
  ctx.save();
  for(let i=0;i<30;i++){
    const seed=i*137.508;
    const baseX=Math.sin(seed)*0.5+0.5;
    const baseY=Math.sin(seed*0.618)*0.5+0.5;
    const dx=baseX*W*0.40+(Math.sin(t*0.0006+i*1.7)*W*0.06);
    const dy=H*0.08+baseY*H*0.80+(Math.sin(t*0.0004+i*2.3)*H*0.04);
    const inLeftBeam = dx < W*0.32 && dy > H*0.08;
    const inRightBeam = dx > W*0.68 && dy > H*0.08;
    if(!inLeftBeam && !inRightBeam) continue;
    const shimmer=0.15+0.25*Math.abs(Math.sin(t*0.002+i*0.9));
    const sz=0.8+Math.abs(Math.sin(i*3.7))*0.7;
    ctx.fillStyle=`rgba(220,235,255,${shimmer})`;
    ctx.beginPath(); ctx.arc(dx,dy,sz,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Křídový prach u tabule ──
  ctx.save();
  for(let i=0;i<10;i++){
    const cx=W*0.21+Math.sin(i*47.3)*W*0.58;
    const fallSpeed=((t*0.00025+i*0.33)%1);
    const cy=H*0.07+fallSpeed*H*0.35;
    const al=0.10+0.15*(1-fallSpeed);
    const csz=0.6+Math.abs(Math.sin(i*11.1))*0.5;
    ctx.fillStyle=`rgba(240,235,210,${al})`;
    ctx.beginPath(); ctx.arc(cx,cy,csz,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ─── Billa ────────────────────────────────────────────────────────────────────
function drawBilla(W,H,t){
  const hor=H*0.46, vpX=W*0.52;
  const BILLA_YELLOW='#FDCD25', BILLA_RED='#E30613', BILLA_DARK='#1a1a1a';
  const ft=t*0.001;

  // ══════════════════════════════════════════════════════════════════════════
  //  STROP – moderní bílý podhled s LED panely
  // ══════════════════════════════════════════════════════════════════════════
  const cg=ctx.createLinearGradient(0,0,0,hor*0.42);
  cg.addColorStop(0,'#f0f2f5'); cg.addColorStop(1,'#e4e8ec');
  ctx.fillStyle=cg; ctx.fillRect(0,0,W,hor*0.42);
  // Kazetový strop – jemná mřížka
  ctx.strokeStyle='rgba(180,185,195,0.40)'; ctx.lineWidth=0.5;
  for(let cx2=0;cx2<W;cx2+=W*0.08){ ctx.beginPath(); ctx.moveTo(cx2,0); ctx.lineTo(cx2,hor*0.42); ctx.stroke(); }
  for(let cy2=0;cy2<hor*0.42;cy2+=H*0.05){ ctx.beginPath(); ctx.moveTo(0,cy2); ctx.lineTo(W,cy2); ctx.stroke(); }
  // LED světelné panely – bílé obdélníky se záři
  [W*0.10,W*0.32,W*0.54,W*0.78].forEach((lx,li)=>{
    const flk = li===2 ? (Math.sin(t*0.018)*Math.sin(t*0.007+2.1) > 0.90 ? 0.6+Math.random()*0.2 : 1.0) : 1.0;
    // LED panel
    ctx.fillStyle=`rgba(255,255,255,${flk*0.95})`; rrect(lx-W*0.055,H*0.012,W*0.11,H*0.018,2); ctx.fill();
    ctx.strokeStyle=`rgba(200,205,215,${flk*0.5})`; ctx.lineWidth=0.5; rrect(lx-W*0.055,H*0.012,W*0.11,H*0.018,2); ctx.stroke();
    // Kužel světla dolů
    const lG=ctx.createLinearGradient(lx,H*0.030,lx,hor);
    lG.addColorStop(0,`rgba(255,255,248,${flk*0.14})`); lG.addColorStop(1,'transparent');
    ctx.fillStyle=lG; ctx.beginPath();
    ctx.moveTo(lx-W*0.055,H*0.030); ctx.lineTo(lx+W*0.055,H*0.030);
    ctx.lineTo(lx+W*0.22,hor); ctx.lineTo(lx-W*0.22,hor); ctx.closePath(); ctx.fill();
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  ZADNÍ ZEĎ – Billa branded: bílá s žlutým pruhem
  // ══════════════════════════════════════════════════════════════════════════
  const wallG=ctx.createLinearGradient(0,0,0,hor);
  wallG.addColorStop(0,'#f8f9fa'); wallG.addColorStop(0.5,'#f0f1f3'); wallG.addColorStop(1,'#e6e8ec');
  ctx.fillStyle=wallG; ctx.fillRect(0,hor*0.42,W,hor*0.58);
  // Billa žlutý branding pruh nahoře
  const stripeY=hor*0.42;
  ctx.fillStyle=BILLA_YELLOW; ctx.fillRect(0,stripeY,W,H*0.040);
  // Červený akcent pruh pod žlutým
  ctx.fillStyle=BILLA_RED; ctx.fillRect(0,stripeY+H*0.040,W,H*0.008);
  // Akční cenovky na žlutém pruhu
  ctx.font=`bold ${Math.floor(W*0.014)}px sans-serif`; ctx.textBaseline='middle';
  ['ČERSTVÉ PEČIVO','🥖 -20%','AKCE TÝDNE','🧀 SÝRY','OVOCE & ZELENINA'].forEach((txt,i)=>{
    const tx=W*0.08+i*W*0.19;
    ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.textAlign='center';
    ctx.fillText(txt,tx,stripeY+H*0.020);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  PODLAHA – lesklá bílá dlažba
  // ══════════════════════════════════════════════════════════════════════════
  const flG=ctx.createLinearGradient(0,hor,0,H);
  flG.addColorStop(0,'#e8eaee'); flG.addColorStop(0.3,'#dfe2e6'); flG.addColorStop(1,'#d0d4d8');
  ctx.fillStyle=flG; ctx.fillRect(0,hor,W,H-hor);
  perspGrid(vpX,hor,W,H,16,12,'rgba(170,178,188,0.30)',1);
  // Lesklé odlesky na podlaze – zrcadlení LED panelů
  [W*0.10,W*0.32,W*0.54,W*0.78].forEach(lx=>{
    const rfG=ctx.createRadialGradient(lx,H*0.72,0,lx,H*0.72,W*0.18);
    rfG.addColorStop(0,'rgba(255,255,250,0.18)'); rfG.addColorStop(0.5,'rgba(255,255,250,0.06)'); rfG.addColorStop(1,'transparent');
    ctx.fillStyle=rfG; ctx.beginPath(); ctx.ellipse(lx,H*0.72,W*0.18,H*0.08,0,0,Math.PI*2); ctx.fill();
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  BILLA LOGO – velké, na zadní zdi, autentická podoba
  // ══════════════════════════════════════════════════════════════════════════
  {
    const logoX=W*0.38, logoY=hor*0.42-H*0.055;
    const logoW=W*0.16, logoH=H*0.065;
    // Červený podklad loga
    ctx.fillStyle=BILLA_RED; rrect(logoX-logoW/2-6,logoY-logoH/2-4,logoW+12,logoH+8,4); ctx.fill();
    // Záře za logem
    const logoGl=ctx.createRadialGradient(logoX,logoY,0,logoX,logoY,W*0.18);
    logoGl.addColorStop(0,'rgba(253,205,37,0.12)'); logoGl.addColorStop(1,'transparent');
    ctx.fillStyle=logoGl; ctx.fillRect(logoX-W*0.18,logoY-H*0.08,W*0.36,H*0.16);
    // Text BILLA – žlutý na červeném
    ctx.font=`900 ${Math.floor(W*0.042)}px "Bebas Neue",Impact,Arial Black,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=BILLA_YELLOW; ctx.fillText('BILLA',logoX,logoY+1);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  REGÁLY – moderní Billa styl (bílé rámy, dřevěné akcenty)
  // ══════════════════════════════════════════════════════════════════════════
  const shelfProducts = [
    '#2563eb','#dc2626','#16a34a','#eab308','#9333ea','#ea580c',
    '#0284c7','#e11d48','#15803d','#ca8a04','#7c3aed','#c2410c',
  ];
  function drawShelf(sx, sy, sw, sh, label, floors, catColor){
    catColor = catColor || BILLA_RED;
    // Rám regálu – světle šedý kovový
    const frameG=ctx.createLinearGradient(sx,sy,sx+sw,sy);
    frameG.addColorStop(0,'#d0d4d8'); frameG.addColorStop(0.5,'#e4e8ec'); frameG.addColorStop(1,'#d0d4d8');
    ctx.fillStyle=frameG; ctx.fillRect(sx,sy,sw,sh);
    // Svislé sloupky
    ctx.fillStyle='#b8bcc2'; ctx.fillRect(sx,sy,3,sh); ctx.fillRect(sx+sw-3,sy,3,sh);
    ctx.strokeStyle='rgba(160,165,175,0.5)'; ctx.lineWidth=1; ctx.strokeRect(sx,sy,sw,sh);
    // Kategorie štítek – barevný dle sekce
    ctx.fillStyle=catColor; rrect(sx,sy-2,sw,sh*0.065,2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font=`bold ${Math.floor(sw*0.10)}px "Bebas Neue",Impact,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.letterSpacing='2px';
    ctx.fillText(label,sx+sw/2,sy+sh*0.028);

    // Police a produkty
    const flH=sh*(1-0.065)/floors;
    for(let fi=0;fi<floors;fi++){
      const policeY=sy+sh*0.065+(fi+1)*flH;
      // Police – kovová deska
      ctx.fillStyle='#c8ccd2'; ctx.fillRect(sx+2,policeY-3,sw-4,5);
      ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fillRect(sx+2,policeY-3,sw-4,1);
      // Cenovky pod policí
      if(fi<floors-1){
        ctx.fillStyle='rgba(253,205,37,0.85)'; ctx.fillRect(sx+3,policeY+1,sw-6,3);
      }

      // Produkty
      const prodH=flH*0.80, prodAreaY=policeY-3-prodH;
      const cnt=Math.max(3,Math.floor(sw/24));
      for(let i=0;i<cnt;i++){
        const pw=(sw-8)/cnt, px2=sx+4+i*pw;
        const pc=shelfProducts[(fi*cnt+i)%shelfProducts.length];
        // Tělo produktu – zaoblené
        rrect(px2+1,prodAreaY+2,pw-2,prodH-2,2); ctx.fillStyle=pc; ctx.fill();
        // Plastický odlesk – lesklý highlight
        const hlG=ctx.createLinearGradient(px2,prodAreaY,px2+pw*0.5,prodAreaY+prodH*0.5);
        hlG.addColorStop(0,'rgba(255,255,255,0.30)'); hlG.addColorStop(1,'transparent');
        ctx.fillStyle=hlG;
        ctx.beginPath(); ctx.moveTo(px2+2,prodAreaY+3); ctx.lineTo(px2+pw*0.6,prodAreaY+3);
        ctx.lineTo(px2+pw*0.4,prodAreaY+prodH*0.45); ctx.lineTo(px2+2,prodAreaY+prodH*0.45); ctx.closePath(); ctx.fill();
        // Etiketa
        ctx.fillStyle='rgba(255,255,255,0.80)'; rrect(px2+1,prodAreaY+prodH*0.60,pw-2,prodH*0.22,1); ctx.fill();
        // Cena na etiketě
        ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.font=`bold ${Math.max(5,Math.floor(pw*0.30))}px sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(`${(fi*cnt+i)%30+12}Kč`,px2+pw/2,prodAreaY+prodH*0.72);
      }
    }
  }

  // Levý regál – nápoje (modrý)
  drawShelf(W*0.01, H*0.08, W*0.195, H*0.54, 'NÁPOJE', 4, '#0369a1');
  // Střední regály
  drawShelf(W*0.24, H*0.12, W*0.155, H*0.44, 'POTRAVINY', 3, '#15803d');
  drawShelf(W*0.41, H*0.14, W*0.140, H*0.40, 'PEČIVO', 3, '#b45309');
  // MLÉKO – tajný vchod do sklepa (animovaný posun)
  const mShift = gs.story.shelf_open ? W*0.17 : (gs.shelf_sliding ? gs.shelf_anim*W*0.17 : 0);
  if(gs.story.sklep_unlocked && mShift > 0){
    const dX=W*0.57, dW2=W*0.12;
    const dTop=H*0.18, dBot=H*0.52, dH2=dBot-dTop;
    const revealed=Math.min(mShift, dW2);
    ctx.save();
    ctx.beginPath(); ctx.rect(dX, dTop-H*0.02, revealed+W*0.015, dH2+H*0.06); ctx.clip();
    ctx.fillStyle='#22180c';
    ctx.fillRect(dX-W*0.013, dTop-H*0.018, W*0.013, dH2+H*0.02);
    ctx.fillRect(dX+dW2,     dTop-H*0.018, W*0.013, dH2+H*0.02);
    ctx.fillRect(dX-W*0.013, dTop-H*0.018, dW2+W*0.026, H*0.018);
    ctx.fillStyle='#3a2a14';
    ctx.fillRect(dX-W*0.013, dTop-H*0.018, W*0.004, dH2+H*0.02);
    ctx.fillRect(dX-W*0.013, dTop-H*0.018, dW2+W*0.026, H*0.004);
    ctx.fillStyle='#06030a'; ctx.fillRect(dX, dTop, dW2, dH2);
    const glG=ctx.createRadialGradient(dX+dW2/2,dBot,2,dX+dW2/2,dBot,dW2*1.4);
    glG.addColorStop(0,'rgba(160,65,8,0.70)'); glG.addColorStop(0.4,'rgba(90,28,4,0.30)'); glG.addColorStop(1,'transparent');
    ctx.fillStyle=glG; ctx.fillRect(dX-W*0.02,dTop+dH2*0.25,dW2+W*0.04,dH2*0.8);
    for(let si=0;si<6;si++){
      const st=si/6;
      const sY=dTop+dH2*(0.28+st*0.52), mg=dW2*(0.04+st*0.18);
      ctx.fillStyle=`hsl(22,28%,${13+(5-si)*2}%)`; ctx.fillRect(dX+mg,sY,dW2-mg*2,dH2*0.065);
      ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(dX+mg,sY+dH2*0.065-H*0.003,dW2-mg*2,H*0.003);
    }
    ctx.fillStyle='#3a2208'; ctx.beginPath();
    ctx.moveTo(dX,dTop); ctx.lineTo(dX-dW2*0.55,dTop+dH2*0.06); ctx.lineTo(dX-dW2*0.55,dBot-dH2*0.06); ctx.lineTo(dX,dBot); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#261606'; ctx.lineWidth=1.5;
    for(let pi=1;pi<3;pi++){ const py=dTop+dH2*pi/3; ctx.beginPath(); ctx.moveTo(dX,py); ctx.lineTo(dX-dW2*0.55,py+dH2*0.015*(pi-1.5)); ctx.stroke(); }
    ctx.fillStyle='#c89828'; ctx.beginPath(); ctx.arc(dX-dW2*0.09,dTop+dH2*0.5,4,0,Math.PI*2); ctx.fill();
    ctx.restore();
    if(gs.story.shelf_open){
      ctx.fillStyle='rgba(170,70,15,0.92)'; ctx.font=`bold ${Math.floor(W*0.009)}px Outfit,sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('▼ SCHODY DOLŮ', dX+dW2/2, dBot+H*0.028);
    }
  }
  drawShelf(W*0.57+mShift, H*0.16, W*0.120, H*0.36, 'MLÉKO', 3, '#0ea5e9');

  // ══════════════════════════════════════════════════════════════════════════
  //  POKLADNA – moderní samoobslužná
  // ══════════════════════════════════════════════════════════════════════════
  const ckX=W*0.74;
  // Stěna pokladny – čistě bílá s Billa brandem
  ctx.fillStyle='#f0f2f5'; ctx.fillRect(ckX,0,W-ckX,H);
  // Žlutý Billa pruh na stěně pokladny
  ctx.fillStyle=BILLA_YELLOW; ctx.fillRect(ckX,H*0.02,W-ckX,H*0.050);
  ctx.fillStyle=BILLA_RED; ctx.fillRect(ckX,H*0.070,W-ckX,H*0.006);
  // Mini BILLA logo na stěně pokladny
  ctx.font=`900 ${Math.floor(W*0.018)}px "Bebas Neue",Impact,sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=BILLA_RED; ctx.fillText('BILLA',ckX+(W-ckX)/2,H*0.045);
  // Regál impulzních nákupů (sladkosti/žvýkačky)
  for(let row=0;row<2;row++){
    ctx.fillStyle='rgba(220,222,228,0.8)'; ctx.fillRect(ckX+W*0.008,H*(0.12+row*0.10),W*0.22,H*0.065);
    ctx.strokeStyle='rgba(180,184,192,0.4)'; ctx.lineWidth=0.5;
    ctx.strokeRect(ckX+W*0.008,H*(0.12+row*0.10),W*0.22,H*0.065);
    for(let pi=0;pi<7;pi++){
      const pc=shelfProducts[(pi+row*5)%shelfProducts.length];
      const px=ckX+W*0.012+pi*W*0.030;
      ctx.fillStyle=pc; rrect(px,H*(0.125+row*0.10),W*0.026,H*0.050,2); ctx.fill();
      // Mini odlesk
      ctx.fillStyle='rgba(255,255,255,0.22)';
      ctx.fillRect(px+1,H*(0.125+row*0.10)+1,W*0.010,H*0.015);
    }
  }
  // Pásový dopravník
  const beltY=H*0.52;
  ctx.fillStyle='#2a2a2e'; ctx.fillRect(ckX-W*0.01,beltY,W*0.27,H*0.035);
  // Pohyblivé pásky na dopravníku
  ctx.save();
  ctx.beginPath(); ctx.rect(ckX-W*0.01,beltY,W*0.27,H*0.035); ctx.clip();
  ctx.strokeStyle='rgba(60,60,65,0.6)'; ctx.lineWidth=1;
  for(let bi=0;bi<20;bi++){
    const bx=ckX-W*0.01+((t*0.03+bi*W*0.028)%(W*0.30))-W*0.01;
    ctx.beginPath(); ctx.moveTo(bx,beltY); ctx.lineTo(bx,beltY+H*0.035); ctx.stroke();
  }
  ctx.restore();
  // Tělo pokladny/pultu
  const ctrG=ctx.createLinearGradient(0,beltY+H*0.035,0,beltY+H*0.14);
  ctrG.addColorStop(0,'#3a3a40'); ctrG.addColorStop(1,'#28282e');
  ctx.fillStyle=ctrG; ctx.fillRect(ckX-W*0.01,beltY+H*0.035,W*0.27,H*0.10);
  ctx.strokeStyle='rgba(80,80,88,0.3)'; ctx.lineWidth=1;
  ctx.strokeRect(ckX-W*0.01,beltY+H*0.035,W*0.27,H*0.10);
  // POS terminál (moderní touchscreen)
  const posX=ckX+W*0.06, posY=beltY-H*0.12;
  ctx.fillStyle='#1a1a20'; rrect(posX,posY,W*0.10,H*0.11,4); ctx.fill();
  ctx.strokeStyle='rgba(100,100,110,0.4)'; ctx.lineWidth=1; rrect(posX,posY,W*0.10,H*0.11,4); ctx.stroke();
  // Obrazovka POS – tmavě modrá s Billa interface
  const scrG=ctx.createLinearGradient(posX+4,posY+4,posX+W*0.10-4,posY+H*0.11-4);
  scrG.addColorStop(0,'#1e3a5a'); scrG.addColorStop(1,'#0a1e3a');
  ctx.fillStyle=scrG; rrect(posX+4,posY+4,W*0.10-8,H*0.11-8,2); ctx.fill();
  // Billa logo na obrazovce
  ctx.fillStyle=BILLA_YELLOW; ctx.font=`bold ${Math.floor(W*0.008)}px sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('BILLA',posX+W*0.05,posY+H*0.02);
  ctx.fillStyle='#4ae080'; ctx.font=`${Math.floor(W*0.010)}px "JetBrains Mono",monospace`;
  ctx.fillText('245,00 Kč',posX+W*0.05,posY+H*0.05);
  ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font=`${Math.floor(W*0.006)}px sans-serif`;
  ctx.fillText('DĚKUJEME ZA NÁKUP',posX+W*0.05,posY+H*0.08);
  // Čtečka čárových kódů (červený laser)
  ctx.fillStyle='#222'; rrect(posX+W*0.11,posY+H*0.03,W*0.03,H*0.05,2); ctx.fill();
  const laserA=0.4+0.3*Math.sin(t*0.006);
  ctx.fillStyle=`rgba(255,0,0,${laserA})`; ctx.fillRect(posX+W*0.115,posY+H*0.053,W*0.02,H*0.003);

  // Automatické dveře (skleněné, vpravo)
  const doorX=W*0.935, doorY=H*0.04, doorW=W*0.065, doorH=H*0.62;
  // Rám dveří
  ctx.fillStyle='#808890'; ctx.fillRect(doorX-2,doorY-2,doorW+4,doorH+4);
  // Sklo dveří
  const dGlass=ctx.createLinearGradient(doorX,doorY,doorX+doorW,doorY);
  dGlass.addColorStop(0,'rgba(180,210,240,0.35)'); dGlass.addColorStop(0.5,'rgba(200,230,255,0.45)'); dGlass.addColorStop(1,'rgba(180,210,240,0.30)');
  ctx.fillStyle=dGlass; ctx.fillRect(doorX,doorY,doorW,doorH);
  // Odlesk na skle
  ctx.fillStyle='rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.moveTo(doorX+2,doorY+2); ctx.lineTo(doorX+doorW*0.4,doorY+2);
  ctx.lineTo(doorX+doorW*0.2,doorY+doorH*0.5); ctx.lineTo(doorX+2,doorY+doorH*0.5); ctx.closePath(); ctx.fill();
  // Madlo
  ctx.fillStyle='#a0a8b0'; ctx.fillRect(doorX+doorW*0.15,doorY+doorH*0.35,3,doorH*0.18);
  // EXIT nápis – zelený LED
  ctx.save();
  ctx.shadowColor='rgba(0,200,80,0.6)'; ctx.shadowBlur=8;
  ctx.fillStyle='#00dd55'; ctx.font=`bold ${Math.floor(W*0.008)}px sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('EXIT',doorX+doorW/2,doorY-H*0.018);
  ctx.shadowBlur=0;
  ctx.restore();

  // ── Nákupní košíky u dveří ──
  for(let bi=0;bi<3;bi++){
    const bkx=doorX-W*0.04+bi*W*0.012, bky=H*0.58;
    ctx.fillStyle=BILLA_RED; rrect(bkx,bky,W*0.018,H*0.04,1); ctx.fill();
    ctx.strokeStyle='rgba(180,20,20,0.5)'; ctx.lineWidth=0.5; rrect(bkx,bky,W*0.018,H*0.04,1); ctx.stroke();
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(bkx+1,bky+H*0.005,W*0.016,H*0.002);
  }

  // ── Produkty spadlé u regálů (realistické) ──
  for(let i=0;i<4;i++){
    const pc=shelfProducts[(i*3+5)%shelfProducts.length];
    const bx=W*0.02+i*W*0.028, by=H*0.63+Math.sin(i*1.7)*H*0.008;
    const rot=Math.sin(i*2.3)*0.15;
    ctx.save(); ctx.translate(bx+W*0.010,by+H*0.015); ctx.rotate(rot);
    ctx.fillStyle=pc; rrect(-W*0.010,-H*0.015,W*0.020,H*0.028,2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.fillRect(-W*0.010+1,-H*0.015+1,W*0.008,H*0.008);
    ctx.restore();
  }

  // ── Podlahová navigační čára (žlutá, typická pro supermarkety) ──
  ctx.strokeStyle='rgba(253,205,37,0.25)'; ctx.lineWidth=2; ctx.setLineDash([12,8]);
  ctx.beginPath(); ctx.moveTo(W*0.22,hor+H*0.02); ctx.lineTo(W*0.22,H*0.95); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W*0.72,hor+H*0.02); ctx.lineTo(W*0.72,H*0.95); ctx.stroke();
  ctx.setLineDash([]);

  // ── Podlahové odlesky — lesklé skvrny pod zářivkami ──
  ctx.save();
  [W*0.12,W*0.35,W*0.60,W*0.82].forEach((rx,i)=>{
    const ry=H*0.72+Math.sin(i*2.8)*H*0.04;
    const rG=ctx.createRadialGradient(rx,ry,0,rx,ry,W*0.14);
    rG.addColorStop(0,'rgba(255,255,240,0.22)'); rG.addColorStop(0.4,'rgba(255,255,240,0.08)'); rG.addColorStop(1,'transparent');
    ctx.fillStyle=rG; ctx.beginPath(); ctx.ellipse(rx,ry,W*0.14,H*0.05,0,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();

  // ── Prachové částice ve světle zářivek — výrazné ──
  ctx.save();
  for(let i=0;i<40;i++){
    const px=Math.sin(i*137.508)*0.5*W+W*0.5;
    const py=H*0.06+((t*0.00012+i*0.12)%1)*H*0.55;
    const al=0.25+0.35*Math.abs(Math.sin(t*0.0015+i*1.1));
    const sz2=0.8+Math.sin(i*7)*0.7;
    ctx.fillStyle=`rgba(255,255,255,${al})`;
    ctx.beginPath(); ctx.arc(px,py,sz2,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ─── Hospoda ──────────────────────────────────────────────────────────────────
function drawHospoda(W,H,t){
  const hor=H*0.50, vpX=W*0.50;
  const ft=t*0.003;

  // Základ – teplá tma
  ctx.fillStyle='#120a04'; ctx.fillRect(0,0,W,H);

  // Dřevěné stropní trámy – tmavý dub s texturou
  const stropG=ctx.createLinearGradient(0,0,0,hor*0.6);
  stropG.addColorStop(0,'#1e1408'); stropG.addColorStop(1,'#281a0c');
  ctx.fillStyle=stropG; ctx.fillRect(0,0,W,hor);
  [W*0.18,W*0.38,W*0.62,W*0.82].forEach(tx=>{
    const tG=ctx.createLinearGradient(tx-W*0.025,0,tx+W*0.025,0);
    tG.addColorStop(0,'#1a1408'); tG.addColorStop(0.3,'#221a0e'); tG.addColorStop(0.7,'#1e160a'); tG.addColorStop(1,'#161008');
    ctx.fillStyle=tG; ctx.fillRect(tx-W*0.025,0,W*0.05,hor*0.85);
    ctx.strokeStyle='#2e200c'; ctx.lineWidth=1; ctx.strokeRect(tx-W*0.025,0,W*0.05,hor*0.85);
    // Letokruhy na čele trámu
    ctx.fillStyle='rgba(255,255,255,0.025)'; ctx.fillRect(tx-W*0.025,0,W*0.012,hor*0.85);
    ctx.strokeStyle='rgba(50,35,15,0.4)'; ctx.lineWidth=0.5;
    for(let ly=0;ly<hor*0.85;ly+=H*0.08){ ctx.beginPath(); ctx.moveTo(tx-W*0.025,ly); ctx.lineTo(tx+W*0.025,ly); ctx.stroke(); }
  });
  // Visící hrnce a pánve na trámech
  [W*0.20,W*0.35,W*0.65,W*0.80].forEach((px,pi)=>{
    const py=hor*0.65+Math.sin(pi*2.1)*H*0.02;
    ctx.strokeStyle='rgba(90,70,50,0.5)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(px,hor*0.85); ctx.lineTo(px,py); ctx.stroke();
    ctx.fillStyle=pi%2===0?'#2a2220':'#3a2a18';
    if(pi%2===0){ ctx.beginPath(); ctx.ellipse(px,py,W*0.015,H*0.008,0,0,Math.PI*2); ctx.fill(); ctx.fillRect(px-W*0.015,py,W*0.030,H*0.015); }
    else { ctx.beginPath(); ctx.arc(px,py+H*0.005,W*0.012,0,Math.PI); ctx.fill(); ctx.fillRect(px-1,py-H*0.012,2,H*0.017); }
    ctx.fillStyle='rgba(255,200,100,0.06)'; ctx.beginPath(); ctx.arc(px,py,W*0.012,0,Math.PI*2); ctx.fill();
  });

  // Zadní zeď – tmavé dřevěné panely s viditelnými dřevěnými lištami
  const zg=ctx.createLinearGradient(0,H*0.05,0,hor);
  zg.addColorStop(0,'#321e0c'); zg.addColorStop(0.5,'#281808'); zg.addColorStop(1,'#1e1208');
  ctx.fillStyle=zg; ctx.fillRect(0,H*0.05,W,hor-H*0.05);
  ctx.strokeStyle='rgba(90,55,18,0.40)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=W*0.12){ ctx.beginPath(); ctx.moveTo(x,H*0.05); ctx.lineTo(x,hor); ctx.stroke(); }
  [H*0.15,H*0.30,H*0.44].forEach(ly=>{ ctx.beginPath(); ctx.moveTo(0,ly); ctx.lineTo(W,ly); ctx.stroke(); });

  // ── NEONOVÝ NÁPIS "PLZEŇ" na zdi vlevo ──
  {
    const nx=W*0.10, ny=H*0.15;
    // Záře nápisu
    const nG=ctx.createRadialGradient(nx,ny,0,nx,ny,W*0.12);
    const nPulse=0.6+0.2*Math.sin(ft*0.8);
    nG.addColorStop(0,`rgba(0,200,255,${nPulse*0.20})`); nG.addColorStop(0.5,`rgba(0,150,220,${nPulse*0.06})`); nG.addColorStop(1,'transparent');
    ctx.fillStyle=nG; ctx.fillRect(nx-W*0.12,ny-H*0.08,W*0.24,H*0.16);
    // Text
    ctx.save();
    ctx.shadowColor='rgba(0,200,255,0.8)'; ctx.shadowBlur=12;
    ctx.fillStyle=`rgba(0,220,255,${nPulse*0.95})`; ctx.font=`bold ${Math.floor(W*0.022)}px "Bebas Neue",Impact,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('PLZEŇ',nx,ny);
    ctx.shadowBlur=0; ctx.restore();
    // Trubice
    ctx.strokeStyle=`rgba(0,180,230,${nPulse*0.35})`; ctx.lineWidth=2;
    ctx.strokeRect(nx-W*0.038,ny-H*0.022,W*0.076,H*0.044);
  }

  // ── ŠIPKOVÝ TERČ na zdi vpravo ──
  {
    const dtx=W*0.88, dty=H*0.18, dtr=W*0.032;
    // Záda terče
    ctx.fillStyle='#1a1208'; ctx.beginPath(); ctx.arc(dtx,dty,dtr+4,0,Math.PI*2); ctx.fill();
    // Kroužky terče
    const dCols=[['#1a1a1a','#e8e0d0'],['#cc2020','#2a8a2a'],['#cc2020','#2a8a2a']];
    for(let r=3;r>=0;r--){
      ctx.fillStyle=r%2===0?'#cc2020':'#2a8a2a';
      if(r===0) ctx.fillStyle='#cc2020';
      ctx.beginPath(); ctx.arc(dtx,dty,dtr*(r+1)/4,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='#e8e0d0'; ctx.beginPath(); ctx.arc(dtx,dty,dtr*0.12,0,Math.PI*2); ctx.fill();
    // Drátky
    ctx.strokeStyle='rgba(200,200,200,0.15)'; ctx.lineWidth=0.5;
    for(let a=0;a<Math.PI*2;a+=Math.PI/10){ ctx.beginPath(); ctx.moveTo(dtx,dty); ctx.lineTo(dtx+Math.cos(a)*dtr,dty+Math.sin(a)*dtr); ctx.stroke(); }
    // Šipky zapíchnuté
    [[0.4,-0.3],[0.15,0.5],[-0.2,-0.1]].forEach(([ox,oy])=>{
      const sx=dtx+ox*dtr, sy=dty+oy*dtr;
      ctx.fillStyle='#c0c0c0'; ctx.fillRect(sx-1,sy-6,2,8);
      ctx.fillStyle='#dd3030'; ctx.beginPath(); ctx.moveTo(sx,sy-6); ctx.lineTo(sx-3,sy-10); ctx.lineTo(sx+3,sy-10); ctx.closePath(); ctx.fill();
    });
  }

  // ── JELENÍ PAROHY nad krbem ──
  {
    const ahx=W*0.50, ahy=H*0.04;
    // Dřevěná deska
    ctx.fillStyle='#4a2a10'; rrect(ahx-W*0.02,ahy,W*0.04,H*0.015,2); ctx.fill();
    // Parohy (zrcadlově)
    ctx.strokeStyle='#d4c4a0'; ctx.lineWidth=2.5; ctx.lineCap='round';
    [-1,1].forEach(dir=>{
      ctx.beginPath(); ctx.moveTo(ahx,ahy); ctx.quadraticCurveTo(ahx+dir*W*0.04,ahy-H*0.04,ahx+dir*W*0.06,ahy-H*0.06); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ahx+dir*W*0.03,ahy-H*0.025); ctx.lineTo(ahx+dir*W*0.045,ahy-H*0.05); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ahx+dir*W*0.05,ahy-H*0.045); ctx.lineTo(ahx+dir*W*0.055,ahy-H*0.065); ctx.stroke();
    });
  }

  // ── KRBY NAHOŘE UPROSTŘED ──────────────────────────────────────────────
  const fp=ROOMS.hospoda.fireplace;
  const fx=fp.rx*W, fy=fp.ry*H, fbw=W*0.15, fbh=H*0.24;
  // kamenná fasáda – detailnější
  ctx.fillStyle='#3a2a18'; rrect(fx-fbw/2-22,fy-26,fbw+44,fbh+32,8); ctx.fill();
  ctx.strokeStyle='#6a4a28'; ctx.lineWidth=3; rrect(fx-fbw/2-22,fy-26,fbw+44,fbh+32,8); ctx.stroke();
  // kamenné cihly na fasádě
  for(let bri=0;bri<4;bri++) for(let brj=0;brj<3;brj++){
    const bw2=(fbw+44)/4, bh2=10;
    ctx.fillStyle=`hsl(25,${28+Math.sin(bri*3+brj*7)*8}%,${13+bri+brj}%)`;
    ctx.fillRect(fx-fbw/2-22+bri*bw2,fy-26+brj*bh2,bw2-1,bh2-1);
  }
  // oblouk otvoru
  ctx.fillStyle='#080404';
  ctx.beginPath(); ctx.arc(fx,fy+fbh*0.12,fbw*0.53,Math.PI,0); ctx.lineTo(fx+fbw/2,fy+fbh); ctx.lineTo(fx-fbw/2,fy+fbh); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#120808'; ctx.fillRect(fx-fbw/2,fy+fbh*0.6,fbw,fbh*0.4);
  // Žhavá polena
  ctx.fillStyle='#3a1808'; ctx.fillRect(fx-fbw*0.35,fy+fbh*0.82,fbw*0.25,fbh*0.12);
  ctx.fillStyle='#4a2010'; ctx.fillRect(fx+fbw*0.08,fy+fbh*0.78,fbw*0.30,fbh*0.14);
  // Žhavé uhlíky na polenech
  for(let u=0;u<8;u++){
    const ux=fx-fbw*0.3+u*fbw*0.08, uy=fy+fbh*0.85+Math.sin(u*2.3)*fbh*0.04;
    const ua=0.6+0.3*Math.sin(ft*1.5+u);
    ctx.fillStyle=`rgba(255,${80+Math.floor(80*Math.sin(ft+u))},0,${ua})`;
    ctx.beginPath(); ctx.arc(ux,uy,2+Math.sin(u)*1,0,Math.PI*2); ctx.fill();
  }
  // plameny – výraznější a dynamičtější
  for(let i=0;i<14;i++){
    const fi=i/14, flx=fx-fbw*0.42+fi*fbw*0.84;
    const flh=fbh*(0.24+0.62*Math.abs(Math.sin(ft+fi*3.8+i*0.7)));
    const flG=ctx.createLinearGradient(flx,fy+fbh,flx,fy+fbh-flh);
    flG.addColorStop(0,'rgba(255,60,0,0.95)'); flG.addColorStop(0.25,'rgba(255,120,0,0.85)'); flG.addColorStop(0.5,'rgba(255,180,30,0.60)'); flG.addColorStop(0.8,'rgba(255,220,60,0.30)'); flG.addColorStop(1,'rgba(255,240,100,0)');
    ctx.fillStyle=flG; ctx.beginPath(); ctx.ellipse(flx,fy+fbh-flh/2,fbw/12,flh/2,0,0,Math.PI*2); ctx.fill();
  }
  // záře krbu na celou scénu – silnější amber glow
  const glowG=ctx.createRadialGradient(fx,fy+fbh*0.6,0,fx,fy+fbh*0.6,W*0.45);
  glowG.addColorStop(0,`rgba(255,120,20,${0.24+0.10*Math.sin(ft*1.3)})`);
  glowG.addColorStop(0.3,`rgba(255,80,0,${0.10+0.05*Math.sin(ft)})`);
  glowG.addColorStop(0.6,`rgba(200,60,0,${0.04+0.02*Math.sin(ft*0.8)})`);
  glowG.addColorStop(1,'transparent');
  ctx.fillStyle=glowG; ctx.fillRect(0,0,W,H);
  // polička + svíčky
  ctx.fillStyle='#5a3010'; ctx.fillRect(fx-fbw/2-26,fy-30,fbw+52,10);
  [fx-fbw/2-10,fx+fbw/2+8].forEach(cx=>{
    ctx.fillStyle='#f0e090'; ctx.fillRect(cx-3,fy-54,6,24);
    const cG=ctx.createRadialGradient(cx,fy-56,0,cx,fy-56,24);
    cG.addColorStop(0,`rgba(255,200,50,${0.7+0.2*Math.sin(ft*2+cx)})`); cG.addColorStop(0.5,`rgba(255,150,20,${0.15+0.05*Math.sin(ft*2+cx)})`); cG.addColorStop(1,'transparent');
    ctx.fillStyle=cG; ctx.fillRect(cx-24,fy-80,48,48);
    ctx.fillStyle=`rgba(255,160,30,0.95)`; ctx.beginPath(); ctx.ellipse(cx,fy-56,2,4+Math.sin(ft*3+cx)*1,0,0,Math.PI*2); ctx.fill();
  });
  // nápis pro hráče
  if(gs.cihalova_in_bag){
    ctx.fillStyle='rgba(255,150,50,0.9)'; ctx.font=`bold ${Math.floor(W*0.009)}px JetBrains Mono,monospace`;
    ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillText('[E] HODIT DO KRBU',fx,fy-33);
  }

  // ── LUSTER – detailnější s železným kruhem ───────────────────────────
  const luX=W*0.5,luY=H*0.11;
  // Řetěz
  ctx.strokeStyle='#5a4a30'; ctx.lineWidth=2;
  for(let ch=0;ch<5;ch++){
    const cy=ch*luY/5;
    ctx.beginPath(); ctx.ellipse(luX,cy+luY/10,3,5,0,0,Math.PI*2); ctx.stroke();
  }
  // Železný kruh lustru
  ctx.strokeStyle='#4a3820'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.ellipse(luX,luY,W*0.052,H*0.014,0,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle='#6a5a38'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(luX,luY,W*0.048,H*0.012,0,0,Math.PI*2); ctx.stroke();
  for(let i=-2;i<=2;i++){
    const cx=luX+i*W*0.033, ca=0.60+0.22*Math.sin(ft*1.4+i);
    // Svíčka na lustru
    ctx.fillStyle='#e8d8a0'; ctx.fillRect(cx-2,luY-H*0.005,4,H*0.018);
    // Záře svíčky
    const lG=ctx.createRadialGradient(cx,luY-H*0.008,0,cx,luY-H*0.008,W*0.10);
    lG.addColorStop(0,`rgba(255,200,80,${ca*0.60})`); lG.addColorStop(0.4,`rgba(255,160,40,${ca*0.15})`); lG.addColorStop(1,'transparent');
    ctx.fillStyle=lG; ctx.fillRect(cx-W*0.10,luY-H*0.06,W*0.20,H*0.16);
    // Plamínek
    ctx.fillStyle=`rgba(255,180,40,${ca})`; ctx.beginPath(); ctx.ellipse(cx,luY-H*0.008,2,3+Math.sin(ft*3+i)*1,0,0,Math.PI*2); ctx.fill();
  }

  // Podlaha – kamenná dlažba (flagstone) místo parket
  const flG=ctx.createLinearGradient(0,hor,0,H);
  flG.addColorStop(0,'#2a1e12'); flG.addColorStop(0.3,'#342614'); flG.addColorStop(1,'#221608');
  ctx.fillStyle=flG; ctx.fillRect(0,hor,W,H-hor);
  // Kamenné dlaždice
  ctx.strokeStyle='rgba(15,8,2,0.60)'; ctx.lineWidth=1.5;
  const stones=[[0,0,W*0.18,H*0.14],[W*0.18,0,W*0.22,H*0.12],[W*0.40,0,W*0.20,H*0.15],[W*0.60,0,W*0.18,H*0.13],[W*0.78,0,W*0.22,H*0.14],
    [0,H*0.14,W*0.20,H*0.13],[W*0.20,H*0.12,W*0.24,H*0.14],[W*0.44,H*0.15,W*0.18,H*0.12],[W*0.62,H*0.13,W*0.20,H*0.14],[W*0.82,H*0.14,W*0.18,H*0.13],
    [0,H*0.27,W*0.22,H*0.14],[W*0.22,H*0.26,W*0.20,H*0.15],[W*0.42,H*0.27,W*0.22,H*0.13],[W*0.64,H*0.27,W*0.18,H*0.14],[W*0.82,H*0.27,W*0.18,H*0.15]];
  stones.forEach(([sx,sy,sw,sh],si)=>{
    const fy2=hor+sy;
    ctx.fillStyle=`hsl(28,${18+Math.sin(si*3)*5}%,${11+Math.sin(si*7)*3}%)`;
    ctx.fillRect(sx+1,fy2+1,sw-2,sh-2);
    ctx.strokeRect(sx,fy2,sw,sh);
  });
  // teplý odraz ohně na podlaze – silnější
  const fireRef=ctx.createRadialGradient(fx,H*0.72,0,fx,H*0.72,W*0.40);
  fireRef.addColorStop(0,`rgba(255,100,10,${0.12+0.06*Math.sin(ft*1.2)})`);
  fireRef.addColorStop(0.5,`rgba(255,60,0,${0.04+0.02*Math.sin(ft)})`);
  fireRef.addColorStop(1,'transparent');
  ctx.fillStyle=fireRef; ctx.fillRect(0,hor,W,H-hor);

  // ── JUKEBOX v rohu (vpravo dole) ──
  {
    const jx=W*0.88, jy=H*0.54, jw=W*0.08, jh=H*0.14;
    // Tělo jukeboxu
    const jG=ctx.createLinearGradient(jx,jy,jx+jw,jy);
    jG.addColorStop(0,'#4a2a18'); jG.addColorStop(0.5,'#5a3a28'); jG.addColorStop(1,'#3a2010');
    ctx.fillStyle=jG; rrect(jx,jy,jw,jh,4); ctx.fill();
    ctx.strokeStyle='#c0a040'; ctx.lineWidth=1.5; rrect(jx,jy,jw,jh,4); ctx.stroke();
    // Oblouk nahoře
    ctx.fillStyle='#3a1e0e'; ctx.beginPath(); ctx.arc(jx+jw/2,jy,jw/2,Math.PI,0); ctx.fill();
    ctx.strokeStyle='#c0a040'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(jx+jw/2,jy,jw/2,Math.PI,0); ctx.stroke();
    // Barevné světla (blikající)
    const jCols=['#ff2040','#40ff40','#4080ff','#ffff40','#ff40ff'];
    jCols.forEach((jc,ji)=>{
      const ja=0.5+0.4*Math.sin(ft*2+ji*1.3);
      // Barevné kolečko s průhledností
      ctx.globalAlpha=ja;
      ctx.fillStyle=jc; ctx.beginPath(); ctx.arc(jx+jw*0.15+ji*jw*0.175,jy-jw*0.15,2.5,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    });
    // Mřížka reproduktoru
    ctx.fillStyle='#1a0e06'; ctx.fillRect(jx+jw*0.15,jy+jh*0.5,jw*0.70,jh*0.35);
    for(let gi=0;gi<5;gi++){
      ctx.strokeStyle='rgba(100,70,30,0.3)'; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(jx+jw*0.15,jy+jh*0.5+gi*jh*0.07); ctx.lineTo(jx+jw*0.85,jy+jh*0.5+gi*jh*0.07); ctx.stroke();
    }
    // Záře jukeboxu
    const jGlow=ctx.createRadialGradient(jx+jw/2,jy+jh/2,0,jx+jw/2,jy+jh/2,W*0.08);
    jGlow.addColorStop(0,'rgba(255,200,100,0.06)'); jGlow.addColorStop(1,'transparent');
    ctx.fillStyle=jGlow; ctx.beginPath(); ctx.arc(jx+jw/2,jy+jh/2,W*0.08,0,Math.PI*2); ctx.fill();
  }

  // ── BAR DOLE UPROSTŘED – vylepšený ─────────────────────────────────────
  const brX=W*0.24,brY=H*0.74,brW=W*0.52,brH=H*0.10;
  ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(brX+5,brY+brH,brW,H*0.02);
  // tělo baru – masivní tmavé dřevo s texturou
  const barG=ctx.createLinearGradient(brX,brY,brX,brY+brH);
  barG.addColorStop(0,'#361c0a'); barG.addColorStop(0.5,'#2e1608'); barG.addColorStop(1,'#241008');
  ctx.fillStyle=barG; rrect(brX,brY,brW,brH,8); ctx.fill();
  ctx.strokeStyle='#6a3a18'; ctx.lineWidth=2.5; rrect(brX,brY,brW,brH,8); ctx.stroke();
  // Vyřezávaný panel na baru
  ctx.strokeStyle='rgba(100,60,20,0.3)'; ctx.lineWidth=1;
  for(let bp=0;bp<5;bp++){
    const bpx=brX+brW*0.08+bp*brW*0.19;
    rrect(bpx,brY+brH*0.15,brW*0.14,brH*0.70,3); ctx.stroke();
  }
  // Mosazná opěrka na nohy
  ctx.strokeStyle='#c0a040'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(brX+10,brY+brH-3); ctx.lineTo(brX+brW-10,brY+brH-3); ctx.stroke();
  ctx.strokeStyle='#e0c060'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(brX+10,brY+brH-4); ctx.lineTo(brX+brW-10,brY+brH-4); ctx.stroke();
  // deska baru – lesklá s odleskem
  const brTG=ctx.createLinearGradient(brX,brY-12,brX,brY+H*0.020);
  brTG.addColorStop(0,'#7a4228'); brTG.addColorStop(0.4,'#5a3018'); brTG.addColorStop(1,'#3a1e08');
  ctx.fillStyle=brTG; rrect(brX-5,brY-12,brW+10,H*0.024,6); ctx.fill();
  ctx.strokeStyle='#8a5028'; ctx.lineWidth=1.5; rrect(brX-5,brY-12,brW+10,H*0.024,6); ctx.stroke();
  // Odlesk na desce
  ctx.fillStyle='rgba(255,200,100,0.06)';
  ctx.fillRect(brX,brY-11,brW*0.6,H*0.008);
  // police za barem – viditelnější
  const backG=ctx.createLinearGradient(brX,brY-H*0.22,brX,brY-H*0.02);
  backG.addColorStop(0,'rgba(18,8,4,0.80)'); backG.addColorStop(1,'rgba(25,12,6,0.70)');
  ctx.fillStyle=backG; ctx.fillRect(brX,brY-H*0.22,brW,H*0.20);
  // Zrcadlo za barem
  ctx.fillStyle='rgba(60,80,100,0.12)'; ctx.fillRect(brX+brW*0.30,brY-H*0.21,brW*0.40,H*0.18);
  ctx.strokeStyle='rgba(180,150,100,0.25)'; ctx.lineWidth=1.5; ctx.strokeRect(brX+brW*0.30,brY-H*0.21,brW*0.40,H*0.18);
  // Police dřevěné
  [0,H*0.07,H*0.13].forEach(off=>{ ctx.fillStyle='rgba(80,45,15,0.5)'; ctx.fillRect(brX,brY-H*0.22+off,brW,3); });
  // lahve – detailnější s etiketami
  const bCols=['#8b1a1a','#1a5a1a','#1a1a6a','#6a3a0a','#4a1a6a','#1a4a4a','#8a6a00','#5a1a1a'];
  for(let i=0;i<13;i++){
    const blx=brX+brW*0.04+i*(brW*0.92/13), bly=brY-H*0.205;
    // Stín lahve
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(blx+2,bly+2,brW*0.05,H*0.060);
    // Tělo lahve
    ctx.fillStyle=bCols[i%bCols.length]; ctx.fillRect(blx,bly,brW*0.05,H*0.060);
    // Odlesk
    ctx.fillStyle='rgba(255,255,255,0.10)'; ctx.fillRect(blx+1,bly+2,3,H*0.042);
    // Hrdlo
    ctx.fillStyle=bCols[i%bCols.length]; ctx.fillRect(blx+brW*0.010,bly-H*0.020,brW*0.028,H*0.022);
    // Etiketa
    ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(blx+2,bly+H*0.020,brW*0.05-4,H*0.018);
  }
  // kohoutky – leštěná mosaz
  for(let i=0;i<4;i++){
    const tx=brX+brW*0.14+i*brW*0.21;
    ctx.fillStyle='#a08030'; ctx.fillRect(tx-4,brY-H*0.06,8,H*0.048);
    ctx.fillStyle='#c0a040'; ctx.beginPath(); ctx.arc(tx,brY-H*0.06,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#e0c060'; ctx.beginPath(); ctx.arc(tx,brY-H*0.06,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#c0a040'; ctx.fillRect(tx-3,brY-H*0.04,6,H*0.028);
    // Kapka z kohoutku (animovaná)
    const dripPhase=((ft*0.4+i*0.7)%1);
    if(dripPhase<0.3){
      ctx.fillStyle=`rgba(255,220,120,${0.4*(1-dripPhase/0.3)})`;
      ctx.beginPath(); ctx.ellipse(tx,brY-H*0.01+dripPhase*H*0.03,1.5,2.5,0,0,Math.PI*2); ctx.fill();
    }
  }
  // skleničky piva – detailnější
  [brX+brW*0.08,brX+brW*0.46,brX+brW*0.84].forEach((gx,gi)=>{
    // Sklo půllitru
    ctx.strokeStyle='rgba(150,220,255,0.5)'; ctx.lineWidth=1.5; ctx.strokeRect(gx-8,brY-H*0.054,16,H*0.046);
    ctx.fillStyle='rgba(180,220,255,0.07)'; ctx.fillRect(gx-8,brY-H*0.054,16,H*0.046);
    // Pivo uvnitř
    ctx.fillStyle='rgba(220,180,50,0.35)'; ctx.fillRect(gx-6,brY-H*0.044,12,H*0.034);
    // Pěna
    ctx.fillStyle='rgba(255,255,230,0.45)'; ctx.beginPath(); ctx.ellipse(gx,brY-H*0.044,7,3,0,0,Math.PI*2); ctx.fill();
    // Ouško
    ctx.strokeStyle='rgba(150,220,255,0.3)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(gx+10,brY-H*0.030,4,Math.PI*1.5,Math.PI*0.5); ctx.stroke();
  });
  // Pivní podtácky na baru
  [brX+brW*0.22,brX+brW*0.58,brX+brW*0.76].forEach(cx=>{
    ctx.fillStyle='rgba(200,180,140,0.15)'; ctx.beginPath(); ctx.arc(cx,brY-H*0.004,8,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(160,140,100,0.2)'; ctx.lineWidth=0.5; ctx.stroke();
  });
  // barové stoličky – vylepšené
  [brX-W*0.058,brX+brW+W*0.018].forEach(sx=>{
    // Sedák – kůže
    ctx.fillStyle='#5a3018'; ctx.beginPath(); ctx.arc(sx,brY-H*0.03,W*0.024,0,Math.PI); ctx.fill();
    ctx.fillStyle='#4a2810'; ctx.beginPath(); ctx.arc(sx,brY-H*0.025,W*0.020,0,Math.PI); ctx.fill();
    // Nohy – kov
    ctx.strokeStyle='#888'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(sx-W*0.018,brY-H*0.03); ctx.lineTo(sx-W*0.009,brY+H*0.048); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx+W*0.018,brY-H*0.03); ctx.lineTo(sx+W*0.009,brY+H*0.048); ctx.stroke();
    // Příčka
    ctx.beginPath(); ctx.moveTo(sx-W*0.014,brY+H*0.014); ctx.lineTo(sx+W*0.014,brY+H*0.014); ctx.stroke();
  });
  // stoly – s pivními sklenicemi a podtácky a svíčkami
  [[W*0.12,H*0.61],[W*0.76,H*0.60],[W*0.44,H*0.64]].forEach(([tx,ty],ti)=>{
    // Stín stolu
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(tx+3,ty+3,W*0.065,H*0.035,0,0,Math.PI*2); ctx.fill();
    // Deska stolu
    const tG=ctx.createRadialGradient(tx-W*0.02,ty-H*0.01,0,tx,ty,W*0.065);
    tG.addColorStop(0,'#4a2a14'); tG.addColorStop(1,'#3a2010');
    ctx.fillStyle=tG; ctx.beginPath(); ctx.ellipse(tx,ty,W*0.062,H*0.032,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#6a3a18'; ctx.lineWidth=1.5; ctx.stroke();
    // Svíčka na stole
    ctx.fillStyle='#e0d0a0'; ctx.fillRect(tx-2,ty-H*0.025,4,H*0.018);
    const ca2=0.5+0.3*Math.sin(ft*2.5+ti*2);
    const scG=ctx.createRadialGradient(tx,ty-H*0.030,0,tx,ty-H*0.030,W*0.04);
    scG.addColorStop(0,`rgba(255,190,60,${ca2*0.40})`); scG.addColorStop(1,'transparent');
    ctx.fillStyle=scG; ctx.beginPath(); ctx.arc(tx,ty-H*0.030,W*0.04,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgba(255,170,40,${ca2})`; ctx.beginPath(); ctx.ellipse(tx,ty-H*0.028,1.5,3,0,0,Math.PI*2); ctx.fill();
    // Podtácek + sklenice
    ctx.fillStyle='rgba(200,180,140,0.12)'; ctx.beginPath(); ctx.arc(tx+W*0.025,ty-H*0.005,6,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(150,210,240,0.3)'; ctx.lineWidth=1; ctx.strokeRect(tx+W*0.020,ty-H*0.025,10,H*0.020);
  });

  // ── Jiskry/žhavé uhlíky z krbu – stoupají nahoru — VÝRAZNÉ ──
  ctx.save();
  const fpx=fp.rx*W, fpy=fp.ry*H+H*0.24;
  for(let i=0;i<20;i++){
    const life=((t*0.0008+i*0.14)%1);
    const sx2=fpx+(Math.sin(i*7.3+t*0.001)*W*0.10);
    const sy2=fpy-life*H*0.45;
    const sparkA=(1-life)*0.75;
    const sparkSz=1.2+Math.abs(Math.sin(i*3.1))*(1-life)*1.8;
    const r=255, g=Math.floor(170-life*130), b=Math.floor(40-life*40);
    ctx.fillStyle=`rgba(${r},${g},${b},${sparkA})`;
    ctx.beginPath(); ctx.arc(sx2,sy2,sparkSz,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Kouřový opar – hustší ──
  ctx.save();
  for(let i=0;i<12;i++){
    const smokeLife=((t*0.00012+i*0.15)%1);
    const smX=W*0.10+Math.sin(i*43.7)*W*0.8+(Math.sin(t*0.0003+i)*W*0.05);
    const smY=H*0.60-smokeLife*H*0.50;
    const smR=W*0.05+smokeLife*W*0.07;
    const smA=0.05*(1-smokeLife)*(1-smokeLife);
    ctx.fillStyle=`rgba(180,150,110,${smA})`;
    ctx.beginPath(); ctx.arc(smX,smY,smR,0,Math.PI*2); ctx.fill();
  }
  // Opar pod stropem
  const smokeG=ctx.createLinearGradient(0,0,0,H*0.22);
  smokeG.addColorStop(0,'rgba(90,70,45,0.10)'); smokeG.addColorStop(1,'transparent');
  ctx.fillStyle=smokeG; ctx.fillRect(0,0,W,H*0.22);
  ctx.restore();

  // ── Celková teplá ambientní záře ──
  const ambG=ctx.createRadialGradient(W*0.5,H*0.45,0,W*0.5,H*0.45,W*0.6);
  ambG.addColorStop(0,'rgba(255,180,80,0.06)'); ambG.addColorStop(1,'transparent');
  ctx.fillStyle=ambG; ctx.fillRect(0,0,W,H);

  // ── Prachové částice ve světle ──
  ctx.save();
  for(let i=0;i<20;i++){
    const dx=W*0.1+Math.sin(i*137.508)*W*0.8;
    const dy=H*0.06+((t*0.00008+i*0.12)%1)*H*0.50;
    const da=0.12+0.18*Math.abs(Math.sin(t*0.0014+i*1.3));
    const sz2=0.8+Math.abs(Math.sin(i*5))*0.6;
    ctx.fillStyle=`rgba(255,210,120,${da})`;
    ctx.beginPath(); ctx.arc(dx,dy,sz2,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ─── Ulice ────────────────────────────────────────────────────────────────────
function drawUlice(W,H,t){
  const hor=H*0.48;

  // Noční obloha
  const skyG=ctx.createLinearGradient(0,0,0,hor);
  skyG.addColorStop(0,'#020208'); skyG.addColorStop(1,'#08081a');
  ctx.fillStyle=skyG; ctx.fillRect(0,0,W,hor);
  // hvězdy
  for(let i=0;i<70;i++){
    const sx=(Math.sin(i*137.5)*0.5+0.5)*W, sy=(Math.sin(i*97.3)*0.5+0.5)*hor*0.9;
    const sa=0.35+Math.abs(Math.sin(t*0.0015+i*0.7))*0.55;
    ctx.fillStyle=`rgba(255,255,255,${sa})`; ctx.beginPath(); ctx.arc(sx,sy,0.4+Math.abs(Math.sin(i*5))*1.0,0,Math.PI*2); ctx.fill();
  }
  // měsíc
  const mG=ctx.createRadialGradient(W*0.88,hor*0.15,0,W*0.88,hor*0.15,W*0.04);
  mG.addColorStop(0,'rgba(255,248,200,0.95)'); mG.addColorStop(0.5,'rgba(255,240,160,0.4)'); mG.addColorStop(1,'transparent');
  ctx.fillStyle=mG; ctx.fillRect(W*0.84,0,W*0.08,hor*0.32);
  ctx.fillStyle='rgba(255,248,200,0.92)'; ctx.beginPath(); ctx.arc(W*0.88,hor*0.15,W*0.022,0,Math.PI*2); ctx.fill();

  // Budovy po stranách (fasády vytvářejí uliční tunel)
  [
    {x:0,     w:W*0.20, h:H*0.46, col:'#07070e', wins:3},
    {x:W*0.80,w:W*0.22, h:H*0.44, col:'#06060c', wins:3},
    {x:W*0.18,w:W*0.12, h:H*0.40, col:'#050508', wins:2},
    {x:W*0.70,w:W*0.11, h:H*0.38, col:'#060608', wins:2},
  ].forEach(b=>{
    const by=hor-b.h;
    ctx.fillStyle=b.col; ctx.fillRect(b.x,by,b.w,b.h);
    ctx.strokeStyle='rgba(25,25,40,0.6)'; ctx.lineWidth=1; ctx.strokeRect(b.x,by,b.w,b.h);
    // okna
    for(let wy=by+b.h*0.06; wy<by+b.h-b.h*0.12; wy+=b.h*0.22)
      for(let wi=0;wi<b.wins;wi++){
        const wx=b.x+b.w*(0.10+wi*(0.80/b.wins)), ww=b.w*0.22, wh=b.h*0.14;
        const litVal=Math.sin(wi*7.3+b.x*0.01)>0.1;
        ctx.fillStyle=litVal?'rgba(255,210,90,0.38)':'rgba(20,20,35,0.65)';
        ctx.fillRect(wx,wy,ww,wh);
        if(litVal){ ctx.fillStyle='rgba(255,180,50,0.08)'; ctx.fillRect(b.x,wy-5,b.w,wh+10); }
        ctx.strokeStyle='rgba(80,80,120,0.3)'; ctx.lineWidth=0.5; ctx.strokeRect(wx,wy,ww,wh);
      }
  });

  // Chodník
  ctx.fillStyle='#1c1c26'; ctx.fillRect(0,hor-H*0.02,W,H*0.08);
  ctx.strokeStyle='rgba(40,40,60,0.5)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=52) ctx.strokeRect(x,hor-H*0.02,52,H*0.08);
  ctx.fillStyle='#161620'; ctx.fillRect(0,hor+H*0.06,W,H*0.016); // obrubník

  // Silnice – mokrý asfalt
  const roadG=ctx.createLinearGradient(0,hor+H*0.07,0,H);
  roadG.addColorStop(0,'#151518'); roadG.addColorStop(1,'#101012');
  ctx.fillStyle=roadG; ctx.fillRect(0,hor+H*0.076,W,H-hor-H*0.076);
  // mokrý lesklý odraz lamp
  const wetG=ctx.createLinearGradient(0,hor+H*0.08,0,H*0.75);
  wetG.addColorStop(0,'rgba(255,200,80,0.06)'); wetG.addColorStop(1,'transparent');
  ctx.fillStyle=wetG; ctx.fillRect(0,hor+H*0.08,W,H*0.2);
  // čáry silnice
  ctx.strokeStyle='rgba(255,180,0,0.25)'; ctx.lineWidth=3; ctx.setLineDash([44,32]);
  ctx.beginPath(); ctx.moveTo(0,H*0.72); ctx.lineTo(W,H*0.72); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,H*0.86); ctx.lineTo(W,H*0.86); ctx.stroke();
  ctx.setLineDash([]);

  // ── AUTA ──────────────────────────────────────────────────────────────
  const carDefs=[
    [H*0.63,0.055,'#cc2222',0.0,  1, W*0.07,H*0.050],
    [H*0.63,0.038,'#2244cc',0.55, 1, W*0.065,H*0.046],
    [H*0.76,0.048,'#22aa44',0.2, -1, W*0.075,H*0.052],
    [H*0.76,0.065,'#aaaa22',0.7, -1, W*0.070,H*0.050],
    [H*0.89,0.042,'#aa4422',0.1,  1, W*0.068,H*0.046],
    [H*0.89,0.055,'#336699',0.75,-1, W*0.072,H*0.050],
  ];
  const ct=t*0.001;
  carDefs.forEach(([ly,spd,col,off,dir,cw,ch])=>{
    const rawX=((ct*spd+off)%1.2)-0.1;
    const cx=dir===1?rawX*W:W-rawX*W, cy=ly-ch/2;
    // karoserie
    ctx.fillStyle=col; rrect(cx,cy,cw,ch,ch*0.22); ctx.fill();
    // střecha
    ctx.fillStyle=shadeColor(col,-28); rrect(cx+cw*0.18,cy-ch*0.34,cw*0.64,ch*0.38,ch*0.14); ctx.fill();
    // okna
    ctx.fillStyle='rgba(140,200,255,0.35)'; ctx.fillRect(cx+cw*0.21,cy-ch*0.28,cw*0.26,ch*0.22); ctx.fillRect(cx+cw*0.52,cy-ch*0.28,cw*0.26,ch*0.22);
    // světla
    const hC=dir===1?'rgba(255,255,170,0.9)':'rgba(255,55,55,0.8)';
    const hX=dir===1?cx+cw-4:cx+4;
    ctx.fillStyle=hC; ctx.beginPath(); ctx.arc(hX,cy+ch*0.25,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(hX,cy+ch*0.75,3,0,Math.PI*2); ctx.fill();
    // světelný kužel
    const cG=ctx.createRadialGradient(hX,cy+ch/2,0,hX+(dir===1?1:-1)*W*0.1,cy+ch/2,W*0.10);
    cG.addColorStop(0,'rgba(255,255,150,0.10)'); cG.addColorStop(1,'transparent');
    ctx.fillStyle=cG; ctx.fillRect(hX+(dir===1?0:-W*0.10),cy,W*0.10,ch);
    // kola
    [cx+cw*0.20,cx+cw*0.80].forEach(kx=>{ ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(kx,cy+ch,cw*0.10,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#444'; ctx.beginPath(); ctx.arc(kx,cy+ch,cw*0.056,0,Math.PI*2); ctx.fill(); });
  });

  // Pouliční lampy
  [[W*0.13,hor-H*0.01],[W*0.47,hor-H*0.01],[W*0.81,hor-H*0.01]].forEach(([lx,ly])=>{
    ctx.strokeStyle='#666'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx,ly-H*0.17); ctx.lineTo(lx+W*0.028,ly-H*0.17); ctx.stroke();
    const la=0.72+0.15*Math.sin(t*0.0008+lx);
    const lG=ctx.createRadialGradient(lx+W*0.028,ly-H*0.17,0,lx+W*0.028,ly-H*0.17,W*0.16);
    lG.addColorStop(0,`rgba(255,215,90,${la})`); lG.addColorStop(1,'transparent');
    ctx.fillStyle=lG; ctx.fillRect(lx-W*0.12,ly-H*0.31,W*0.30,H*0.22);
    ctx.fillStyle=`rgba(255,215,90,${la})`; ctx.beginPath(); ctx.arc(lx+W*0.028,ly-H*0.17,W*0.009,0,Math.PI*2); ctx.fill();
  });

  // Kaluže s odrazy
  [[W*0.26,H*0.67],[W*0.62,H*0.80],[W*0.78,H*0.65]].forEach(([px,py])=>{
    ctx.fillStyle='rgba(20,30,55,0.55)'; ctx.beginPath(); ctx.ellipse(px,py,W*0.043,H*0.017,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(80,115,175,0.18)'; ctx.lineWidth=1; ctx.stroke();
  });
  // popelnice
  [[W*0.035,hor+H*0.04],[W*0.955,hor+H*0.045]].forEach(([tx,ty])=>{
    ctx.fillStyle='#2a2a2a'; ctx.fillRect(tx-W*0.016,ty,W*0.032,H*0.05);
    ctx.fillStyle='#333'; ctx.fillRect(tx-W*0.020,ty-H*0.01,W*0.040,H*0.012);
    ctx.strokeStyle='#3a3a3a'; ctx.lineWidth=1; ctx.strokeRect(tx-W*0.016,ty,W*0.032,H*0.05);
  });

  // ── Můry/hmyz kolem pouličních lamp — větší a jasnější ──
  ctx.save();
  [[W*0.158,hor-H*0.18],[W*0.498,hor-H*0.18],[W*0.838,hor-H*0.18]].forEach(([lx,ly],li)=>{
    for(let m=0;m<10;m++){
      const ang=t*0.004*(1+m*0.12)+m*Math.PI*0.25+li*2.1;
      const orbitR=W*0.018+Math.sin(t*0.002+m*1.7)*W*0.010;
      const mx=lx+Math.cos(ang)*orbitR;
      const my=ly+Math.sin(ang*0.7)*orbitR*0.6;
      const ma=0.5+0.3*Math.sin(t*0.008+m);
      ctx.fillStyle=`rgba(230,210,160,${ma})`;
      ctx.beginPath(); ctx.arc(mx,my,1.2+Math.sin(m*3)*0.4,0,Math.PI*2); ctx.fill();
    }
  });
  ctx.restore();

  // ── Přízemní mlha — hustá, pomalá ──
  ctx.save();
  for(let i=0;i<16;i++){
    const fogX=Math.sin(i*47.7+t*0.00008)*W*0.6+W*0.4;
    const fogY=H*0.82+Math.sin(i*23.1)*H*0.12;
    const fogR=W*0.14+Math.sin(i*11.3+t*0.0001)*W*0.06;
    const fogA=0.10+0.05*Math.sin(t*0.0003+i*1.8);
    ctx.fillStyle=`rgba(100,120,160,${fogA})`;
    ctx.beginPath(); ctx.ellipse(fogX,fogY,fogR,H*0.04,0,0,Math.PI*2); ctx.fill();
  }
  // Mlžný gradient dole
  const fogG=ctx.createLinearGradient(0,H*0.80,0,H);
  fogG.addColorStop(0,'transparent'); fogG.addColorStop(0.4,'rgba(80,100,140,0.08)'); fogG.addColorStop(1,'rgba(80,100,140,0.18)');
  ctx.fillStyle=fogG; ctx.fillRect(0,H*0.80,W,H*0.20);
  ctx.restore();

  // ── Déšť — výrazný, šikmý ──
  ctx.save();
  ctx.lineWidth=1.0;
  for(let i=0;i<180;i++){
    const rx=((i*73.7+t*0.12)%(W*1.2))-W*0.1;
    const ry=((i*41.3+t*0.35)%(H*1.2))-H*0.1;
    const rLen=H*0.035+Math.sin(i*3)*H*0.01;
    const rA=0.15+0.10*Math.sin(i*7.1);
    ctx.strokeStyle=`rgba(170,190,230,${rA})`;
    ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-3,ry+rLen); ctx.stroke();
  }
  ctx.restore();

  // ── Odrazy ve vodě na silnici (mokrý efekt) ──
  ctx.save();
  [[W*0.13,hor-H*0.18],[W*0.47,hor-H*0.18],[W*0.81,hor-H*0.18]].forEach(([lx,ly])=>{
    const refG=ctx.createRadialGradient(lx,H*0.78,0,lx,H*0.78,W*0.12);
    refG.addColorStop(0,'rgba(255,215,90,0.12)'); refG.addColorStop(0.5,'rgba(255,200,80,0.04)'); refG.addColorStop(1,'transparent');
    ctx.fillStyle=refG; ctx.beginPath(); ctx.ellipse(lx,H*0.78,W*0.12,H*0.06,0,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();

  // GRAFFITI KŘEMŽE4LIFE
  ctx.save();
  ctx.translate(W*0.37,hor-H*0.055); ctx.rotate(-0.04);
  ctx.font=`bold ${Math.floor(W*0.028)}px Impact,Arial Black,Arial`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.lineWidth=6; ctx.strokeStyle='rgba(0,0,0,0.65)'; ctx.strokeText('KŘEMŽE4LIFE',0,0);
  ctx.fillStyle='rgba(215,28,28,0.70)'; ctx.fillText('KŘEMŽE4LIFE',0,0);
  ctx.fillStyle='rgba(215,28,28,0.28)';
  for(let i=0;i<18;i++) ctx.beginPath(), ctx.arc((Math.sin(i*53.7)*0.5+0.5)*W*0.35-W*0.175+5,(Math.sin(i*41.3)*0.5+0.5)*H*0.04-H*0.02,1+Math.abs(Math.sin(i*7))*2,0,Math.PI*2), ctx.fill();
  ctx.restore();

  // ── Mates – tělo a krvácení z krku ──
  if(gs.mates_death_anim && gs.room === 'hospoda'){
    drawDeathBody(gs.mates_death_anim, t, '#e87040', 'mates');
  }
  // Milan může zemřít i v hospodě (čeká na Matese)
  if(gs.milan_death_anim && gs.room === 'hospoda'){
    drawDeathBody(gs.milan_death_anim, t, '#06b6d4', 'milan');
  }
  // Šaman – mrtvé tělo po OBÍDEK cheatu
  if(gs.saman_death_anim && gs.room === 'hospoda'){
    drawDeathBody(gs.saman_death_anim, t, '#8b5cf6', 'saman');
  }
}

// ─── Křemže ───────────────────────────────────────────────────────────────────
function drawKremze(W,H,t){
  const hor=H*0.46;

  // Obloha
  const skyG=ctx.createLinearGradient(0,0,0,hor);
  skyG.addColorStop(0,'#3a6fa8'); skyG.addColorStop(0.55,'#6da0cc'); skyG.addColorStop(1,'#c0d8ee');
  ctx.fillStyle=skyG; ctx.fillRect(0,0,W,hor);

  // Slunce
  const sunG=ctx.createRadialGradient(W*0.83,H*0.08,0,W*0.83,H*0.08,W*0.14);
  sunG.addColorStop(0,'rgba(255,250,200,1)'); sunG.addColorStop(0.1,'rgba(255,240,150,0.85)'); sunG.addColorStop(0.3,'rgba(255,220,90,0.22)'); sunG.addColorStop(1,'transparent');
  ctx.fillStyle=sunG; ctx.fillRect(W*0.69,0,W*0.28,H*0.24);
  ctx.fillStyle='rgba(255,255,220,0.96)'; ctx.beginPath(); ctx.arc(W*0.83,H*0.08,W*0.022,0,Math.PI*2); ctx.fill();

  // Mraky (4 vrstvy, různé rychlosti)
  function cloud(cx,cy,sc,al){
    ctx.save(); ctx.globalAlpha=al; ctx.fillStyle='#fff';
    [[0,0,38],[-28,8,26],[28,6,30],[-14,-14,20],[16,-12,18],[44,10,22],[-46,12,20]].forEach(([ox,oy,r])=>{ ctx.beginPath(); ctx.arc(cx+ox*sc,cy+oy*sc,r*sc,0,Math.PI*2); ctx.fill(); });
    ctx.restore();
  }
  const co=(t*0.000014*W)%W;
  [[W*0.08+co,H*0.07,1.0,0.90],[W*0.40+co*1.35,H*0.10,0.75,0.78],[W*0.63+co*0.80,H*0.06,0.88,0.82],[W*0.12+co*1.65-W,H*0.09,0.62,0.68]].forEach(args=>cloud(...args));

  // Vzdálené kopce
  ctx.fillStyle='#6a8862';
  ctx.beginPath(); ctx.moveTo(0,hor);
  for(let i=0;i<=20;i++) ctx.lineTo(i/20*W,hor-(H*0.06+H*0.05*Math.abs(Math.sin(i*1.9+0.7))));
  ctx.lineTo(W,hor); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#507848';
  ctx.beginPath(); ctx.moveTo(0,hor);
  for(let i=0;i<=20;i++) ctx.lineTo(i/20*W,hor-(H*0.03+H*0.03*Math.abs(Math.sin(i*2.3+1.2))));
  ctx.lineTo(W,hor); ctx.closePath(); ctx.fill();

  // Dlažba – perspektiva
  const cobG=ctx.createLinearGradient(0,hor,0,H);
  cobG.addColorStop(0,'#c8b888'); cobG.addColorStop(0.3,'#baa878'); cobG.addColorStop(1,'#a89868');
  ctx.fillStyle=cobG;
  ctx.beginPath(); ctx.moveTo(W*0.06,hor); ctx.lineTo(W*0.94,hor); ctx.lineTo(W*1.15,H); ctx.lineTo(-W*0.15,H); ctx.closePath(); ctx.fill();
  perspGrid(W*0.5,hor,W,H,18,13,'rgba(88,72,45,0.32)',0.8);

  // Budovy
  [
    {x:0,     by2:H*0.10,w:W*0.20,h:H*0.36,col:'#d4a060',rc:'#7a3a18',name:'Hospoda'},
    {x:W*0.22,by2:H*0.07,w:W*0.19,h:H*0.39,col:'#c88860',rc:'#6a3010',name:'Billa'},
    {x:W*0.42,by2:H*0.12,w:W*0.16,h:H*0.34,col:'#e0c898',rc:'#5a2808',name:'Johnnyho vila'},
    {x:W*0.59,by2:H*0.08,w:W*0.22,h:H*0.38,col:'#c8c098',rc:'#486028',name:'Radnice',tower:true},
    {x:W*0.83,by2:H*0.11,w:W*0.19,h:H*0.35,col:'#c8a060',rc:'#703818',name:'Škola'},
  ].forEach(b=>{
    // stín
    ctx.fillStyle='rgba(0,0,0,0.14)'; ctx.beginPath(); ctx.moveTo(b.x,b.by2+b.h); ctx.lineTo(b.x+b.w,b.by2+b.h); ctx.lineTo(b.x+b.w+H*0.05,b.by2+b.h+H*0.035); ctx.lineTo(b.x+H*0.05,b.by2+b.h+H*0.035); ctx.closePath(); ctx.fill();
    // zeď
    const wG=ctx.createLinearGradient(b.x,b.by2,b.x+b.w,b.by2);
    wG.addColorStop(0,shadeColor(b.col,-12)); wG.addColorStop(0.4,b.col); wG.addColorStop(1,shadeColor(b.col,-18));
    ctx.fillStyle=wG; ctx.fillRect(b.x,b.by2,b.w,b.h);
    ctx.strokeStyle=shadeColor(b.col,-20); ctx.lineWidth=1.5; ctx.strokeRect(b.x,b.by2,b.w,b.h);
    // římsová lišta
    ctx.fillStyle=shadeColor(b.col,10); ctx.fillRect(b.x-3,b.by2+b.h*0.33-4,b.w+6,8); ctx.fillRect(b.x-3,b.by2+b.h*0.66-4,b.w+6,8);
    // okna
    const flH=b.h/3;
    for(let fl=0;fl<3;fl++) for(let wi=0;wi<Math.floor(b.w/55);wi++){
      const wx=b.x+b.w*(0.12+wi*(0.80/Math.floor(b.w/55))),wy=b.by2+fl*flH+flH*0.18;
      const ww=26,wh=flH*0.50;
      ctx.fillStyle=shadeColor(b.col,-12); ctx.fillRect(wx-4,wy-4,ww+8,wh+8);
      const gG=ctx.createLinearGradient(wx,wy,wx+ww,wy+wh);
      gG.addColorStop(0,'rgba(140,190,240,0.75)'); gG.addColorStop(0.5,'rgba(180,220,255,0.55)'); gG.addColorStop(1,'rgba(60,110,180,0.70)');
      ctx.fillStyle=gG; ctx.fillRect(wx,wy,ww,wh);
      ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.moveTo(wx+2,wy+2); ctx.lineTo(wx+ww*0.55,wy+2); ctx.lineTo(wx+ww*0.35,wy+wh*0.46); ctx.lineTo(wx+2,wy+wh*0.46); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=shadeColor(b.col,-5); ctx.lineWidth=0.8; ctx.strokeRect(wx,wy,ww,wh);
    }
    // dveře
    const dw=b.w*0.14,dh=flH*0.68,dx=b.x+b.w*0.5-dw/2,dy=b.by2+b.h-dh;
    ctx.fillStyle=shadeColor(b.col,-22); ctx.fillRect(dx-7,dy-7,dw+14,dh+7);
    ctx.fillStyle='#1e0e04'; rrect(dx,dy,dw,dh,dw*0.5); ctx.fill();
    ctx.strokeStyle=shadeColor(b.col,15); ctx.lineWidth=1.5; rrect(dx,dy,dw,dh,dw*0.5); ctx.stroke();
    ctx.strokeStyle='rgba(80,40,8,0.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(dx,dy+dh*0.55); ctx.lineTo(dx+dw,dy+dh*0.55); ctx.stroke();
    ctx.fillStyle='#c8a030'; ctx.beginPath(); ctx.arc(dx+dw*0.75,dy+dh*0.72,3.5,0,Math.PI*2); ctx.fill();
    // střecha
    ctx.fillStyle=b.rc;
    ctx.beginPath(); ctx.moveTo(b.x-6,b.by2); ctx.lineTo(b.x+b.w/2,b.by2-b.h*0.16); ctx.lineTo(b.x+b.w+6,b.by2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=shadeColor(b.rc,-25); ctx.lineWidth=1; ctx.stroke();
    if(b.name){ ctx.font=`bold ${Math.floor(b.w*0.075)}px Georgia,serif`; ctx.textAlign='center'; ctx.fillStyle='rgba(30,20,5,0.65)'; ctx.textBaseline='middle'; ctx.fillText(b.name,b.x+b.w/2+1,b.by2+b.h*0.1+1); ctx.fillStyle=shadeColor(b.col,42); ctx.fillText(b.name,b.x+b.w/2,b.by2+b.h*0.1); }
    if(b.tower){
      const twX=b.x+b.w*0.5-18,twY=b.by2-b.h*0.42;
      ctx.fillStyle=shadeColor(b.col,-8); ctx.fillRect(twX,twY,36,b.by2-twY);
      ctx.strokeStyle=shadeColor(b.col,-18); ctx.lineWidth=1; ctx.strokeRect(twX,twY,36,b.by2-twY);
      const ckG=ctx.createRadialGradient(twX+18,twY+16,0,twX+18,twY+16,13);
      ckG.addColorStop(0,'#f8f0e0'); ckG.addColorStop(1,'#e0d0b0');
      ctx.fillStyle=ckG; ctx.beginPath(); ctx.arc(twX+18,twY+16,13,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#2a1a08'; ctx.lineWidth=1.5; ctx.stroke();
    }
  });

  // Fontána
  const fnX=W*0.50,fnY=H*0.66,fnR=W*0.082;
  ctx.fillStyle='rgba(0,0,0,0.14)'; ctx.beginPath(); ctx.ellipse(fnX+8,fnY+7,fnR*1.08,fnR*0.56,0,0,Math.PI*2); ctx.fill();
  const rimG=ctx.createRadialGradient(fnX-fnR*0.3,fnY-fnR*0.3,fnR*0.5,fnX,fnY,fnR*1.12);
  rimG.addColorStop(0,'#c8b898'); rimG.addColorStop(0.6,'#b0a080'); rimG.addColorStop(1,'#887860');
  ctx.fillStyle=rimG; ctx.beginPath(); ctx.ellipse(fnX,fnY,fnR*1.08,fnR*0.60,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(80,60,30,0.35)'; ctx.lineWidth=1.5; ctx.stroke();
  const waterG=ctx.createRadialGradient(fnX-fnR*0.2,fnY-fnR*0.15,0,fnX,fnY,fnR*0.95);
  if(gs.kasna_red){
    waterG.addColorStop(0,'rgba(180,0,0,0.95)'); waterG.addColorStop(0.5,'rgba(130,0,0,0.88)'); waterG.addColorStop(1,'rgba(80,0,0,0.78)');
  } else {
    waterG.addColorStop(0,'rgba(120,180,230,0.92)'); waterG.addColorStop(0.5,'rgba(80,150,210,0.85)'); waterG.addColorStop(1,'rgba(40,90,150,0.75)');
  }
  ctx.fillStyle=waterG; ctx.beginPath(); ctx.ellipse(fnX,fnY,fnR*0.93,fnR*0.50,0,0,Math.PI*2); ctx.fill();
  if(gs.kasna_red){
    // krvavé vlny
    for(let wi=0;wi<4;wi++){ const wp=(t*0.0004+wi*0.25)%1,wr=fnR*(0.10+wp*0.82)*0.93; ctx.strokeStyle=`rgba(160,0,0,${(1-wp)*0.38})`; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(fnX,fnY,wr,wr*0.52,0,0,Math.PI*2); ctx.stroke(); }
  } else {
    ctx.fillStyle='rgba(255,250,200,0.18)'; ctx.beginPath(); ctx.ellipse(fnX-fnR*0.28,fnY-fnR*0.14,fnR*0.32,fnR*0.11,-0.3,0,Math.PI*2); ctx.fill();
    for(let wi=0;wi<4;wi++){ const wp=(t*0.0004+wi*0.25)%1,wr=fnR*(0.10+wp*0.82)*0.93; ctx.strokeStyle=`rgba(180,220,255,${(1-wp)*0.32})`; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(fnX,fnY,wr,wr*0.52,0,0,Math.PI*2); ctx.stroke(); }
  }
  // sloup fontány
  ctx.fillStyle='#a89878'; ctx.beginPath(); ctx.moveTo(fnX-7,fnY); ctx.bezierCurveTo(fnX-8,fnY-H*0.06,fnX-5,fnY-H*0.13,fnX-4,fnY-H*0.17); ctx.lineTo(fnX+4,fnY-H*0.17); ctx.bezierCurveTo(fnX+5,fnY-H*0.13,fnX+8,fnY-H*0.06,fnX+7,fnY); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#b8a888'; ctx.beginPath(); ctx.ellipse(fnX,fnY-H*0.17,20,9,0,0,Math.PI*2); ctx.fill();
  // vodní paprsky (krvavé pokud kasna_red)
  const fft=t*0.002;
  for(let ji=0;ji<6;ji++){
    const ang=(ji/6)*Math.PI*2,jH=H*(0.08+0.018*Math.abs(Math.sin(fft+ji*0.4)));
    const jEndR=fnR*(0.40+0.05*Math.abs(Math.sin(fft*0.7+ji)));
    const jG=ctx.createLinearGradient(fnX,fnY-H*0.17,fnX+Math.cos(ang)*jEndR,fnY);
    if(gs.kasna_red){
      jG.addColorStop(0,'rgba(200,0,0,0.92)'); jG.addColorStop(0.5,'rgba(150,0,0,0.65)'); jG.addColorStop(1,'rgba(80,0,0,0.20)');
    } else {
      jG.addColorStop(0,'rgba(180,220,255,0.9)'); jG.addColorStop(0.5,'rgba(140,200,255,0.6)'); jG.addColorStop(1,'rgba(100,170,240,0.2)');
    }
    ctx.strokeStyle=jG; ctx.lineWidth=2.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(fnX+Math.cos(ang)*5,fnY-H*0.17-7); ctx.quadraticCurveTo(fnX+Math.cos(ang)*jEndR*0.7,fnY-H*0.17-jH*0.3,fnX+Math.cos(ang)*jEndR,fnY-fnR*0.08); ctx.stroke();
  }

  // Tělo Milana plovoucí v kašně (trvale po animaci)
  if(gs.kasna_red && gs.story.milan_voodoo_dead){
    const bodyWobble = Math.sin(t*0.0014)*0.035;
    const bodyFloat  = Math.sin(t*0.0019)*2.5;
    const bx = fnX, by = fnY - fnR*0.07 + bodyFloat;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(bodyWobble);
    ctx.fillStyle='rgba(0,0,0,0.20)'; ctx.beginPath(); ctx.ellipse(3,3,28,12,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#06b6d4'; ctx.beginPath(); ctx.ellipse(0,0,28,12,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(160,0,0,0.80)'; ctx.lineWidth=2.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-12,-3); ctx.lineTo(8,3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5,-6); ctx.lineTo(-8,8); ctx.stroke();
    ctx.restore();
    drawFloatHead(bx + 36, by, 0.88);
  }

  // Stromy
  function tree(tx,ty,sc){
    const trH=H*0.10*sc;
    ctx.fillStyle='rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(tx+trH*0.3,ty+5,trH*0.6*sc,trH*0.15*sc,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#5a3a18'; ctx.beginPath(); ctx.moveTo(tx-W*0.007*sc,ty); ctx.lineTo(tx-W*0.003*sc,ty-trH); ctx.lineTo(tx+W*0.003*sc,ty-trH); ctx.lineTo(tx+W*0.007*sc,ty); ctx.closePath(); ctx.fill();
    [[0.60,'#2a4a18','#1e3810'],[0.38,'#3a5a22','#2a4418'],[0.18,'#4a6a2c','#3a5420']].forEach(([yo,c1,c2])=>{
      const lr=H*0.12*sc, lx=tx, ly=ty-trH*(1+yo*0.5);
      const lG=ctx.createRadialGradient(lx-lr*0.22,ly-lr*0.22,0,lx,ly,lr);
      lG.addColorStop(0,shadeColor(c1,18)); lG.addColorStop(0.5,c1); lG.addColorStop(1,c2);
      ctx.fillStyle=lG; ctx.beginPath();
      for(let a=0;a<Math.PI*2;a+=0.28){ const jr=1+0.16*Math.sin(a*5.3+tx*0.05)+0.09*Math.sin(a*8.1+sc*10); a<0.01?ctx.moveTo(lx+Math.cos(a)*lr*jr,ly+Math.sin(a)*lr*0.9*jr):ctx.lineTo(lx+Math.cos(a)*lr*jr,ly+Math.sin(a)*lr*0.9*jr); }
      ctx.closePath(); ctx.fill();
    });
  }
  [[W*0.08,H*0.52,1.0],[W*0.93,H*0.53,0.95],[W*0.39,H*0.56,0.80],[W*0.61,H*0.55,0.78]].forEach(([tx,ty,sc])=>tree(tx,ty,sc));

  // Lavičky
  [[W*0.30,H*0.58,0.05],[W*0.70,H*0.58,-0.05],[W*0.44,H*0.75,0.02],[W*0.56,H*0.75,-0.02]].forEach(([lbx,lby,rot])=>{
    ctx.save(); ctx.translate(lbx,lby); ctx.rotate(rot);
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(-36,5,72,8);
    const sG=ctx.createLinearGradient(-38,0,38,0); sG.addColorStop(0,'#7a5a28'); sG.addColorStop(0.5,'#9a7240'); sG.addColorStop(1,'#6a4a20');
    ctx.fillStyle=sG; ctx.fillRect(-38,-5,76,10); ctx.strokeStyle='#4a3010'; ctx.lineWidth=1; ctx.strokeRect(-38,-5,76,10);
    ctx.fillStyle='#3a2808'; [-28,28].forEach(nx=>{ ctx.fillRect(nx-3,-5,6,18); ctx.fillRect(nx-3,-18,6,13); });
    ctx.restore();
  });

  // Vzduchová mlžka u horizontu
  const hazeG=ctx.createLinearGradient(0,hor-H*0.02,0,hor+H*0.06);
  hazeG.addColorStop(0,'rgba(180,210,240,0.14)'); hazeG.addColorStop(1,'transparent');
  ctx.fillStyle=hazeG; ctx.fillRect(0,hor-H*0.02,W,H*0.10);

  // ── Sluneční paprsky (god rays) ze slunce – výraznější ──
  ctx.save();
  const sunX=W*0.83, sunY=H*0.08;
  // bloom halo kolem slunce
  const sunHalo=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,W*0.22);
  sunHalo.addColorStop(0,'rgba(255,245,180,0.35)'); sunHalo.addColorStop(0.3,'rgba(255,230,120,0.14)'); sunHalo.addColorStop(1,'transparent');
  ctx.fillStyle=sunHalo; ctx.fillRect(W*0.60,0,W*0.40,H*0.32);
  for(let r=0;r<14;r++){
    const rayAng=-Math.PI*0.40+r*Math.PI*0.075+Math.sin(t*0.0003+r*0.7)*0.05;
    const rayLen=W*0.55+Math.sin(t*0.0005+r)*W*0.10;
    const rG=ctx.createLinearGradient(sunX,sunY,sunX+Math.cos(rayAng)*rayLen,sunY+Math.sin(rayAng)*rayLen);
    rG.addColorStop(0,'rgba(255,240,150,0.28)'); rG.addColorStop(0.4,'rgba(255,225,110,0.12)'); rG.addColorStop(1,'transparent');
    ctx.fillStyle=rG;
    ctx.beginPath();
    ctx.moveTo(sunX+Math.cos(rayAng-0.025)*10,sunY+Math.sin(rayAng-0.025)*10);
    ctx.lineTo(sunX+Math.cos(rayAng-0.022)*rayLen,sunY+Math.sin(rayAng-0.022)*rayLen);
    ctx.lineTo(sunX+Math.cos(rayAng+0.022)*rayLen,sunY+Math.sin(rayAng+0.022)*rayLen);
    ctx.lineTo(sunX+Math.cos(rayAng+0.025)*10,sunY+Math.sin(rayAng+0.025)*10);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // ── Atmosférický prach ve vzduchu ──
  ctx.save();
  for(let i=0;i<55;i++){
    const ax=(Math.sin(i*91.3)*0.5+0.5)*W;
    const ay=(Math.sin(i*47.1)*0.5+0.5)*H*0.55+H*0.05+Math.sin(t*0.0003+i*0.4)*H*0.015;
    const aA=0.18+0.22*Math.abs(Math.sin(t*0.0008+i*1.7));
    ctx.fillStyle=`rgba(255,235,160,${aA})`;
    ctx.beginPath(); ctx.arc(ax,ay,0.8+Math.abs(Math.sin(i*3))*0.6,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Ptáci na obloze – více a výraznější ──
  ctx.save();
  ctx.strokeStyle='rgba(25,20,15,0.75)'; ctx.lineWidth=1.8; ctx.lineCap='round';
  for(let b=0;b<10;b++){
    const bx=((t*0.014+b*W*0.14)%(W*1.3))-W*0.15;
    const by=H*0.05+Math.sin(b*3.7)*H*0.11+Math.sin(t*0.003+b*2.1)*H*0.018;
    const wingAng=Math.sin(t*0.008+b*1.5)*0.45;
    const bsz=0.85+Math.sin(b*2.3)*0.35;
    ctx.beginPath(); ctx.moveTo(bx-8*bsz,by+wingAng*5); ctx.quadraticCurveTo(bx-3*bsz,by-4*bsz-Math.abs(wingAng)*3,bx,by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx+8*bsz,by+wingAng*5); ctx.quadraticCurveTo(bx+3*bsz,by-4*bsz-Math.abs(wingAng)*3,bx,by); ctx.stroke();
  }
  ctx.restore();

  // ── Poryvy větru – šikmé pruhy ──
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=1;
  const windPhase = Math.sin(t*0.0004)*0.5+0.5; // 0-1 pulzace intenzity
  if(windPhase > 0.6){
    const windA = (windPhase-0.6)*0.15;
    for(let wi=0;wi<12;wi++){
      const wx = ((t*0.08+wi*W*0.12)%(W*1.4))-W*0.2;
      const wy = H*0.2+Math.sin(wi*3.7)*H*0.4;
      ctx.strokeStyle=`rgba(255,255,255,${windA*(0.5+Math.sin(wi)*0.5)})`;
      ctx.beginPath(); ctx.moveTo(wx,wy); ctx.lineTo(wx+W*0.08,wy-H*0.02); ctx.stroke();
    }
  }
  ctx.restore();

  // ── Padající listí – hodně, výraznější ──
  ctx.save();
  const leafCols=['rgba(200,110,15,','rgba(220,70,20,','rgba(150,170,40,','rgba(230,150,20,','rgba(180,60,30,'];
  for(let i=0;i<32;i++){
    const leafLife=((t*0.00009+i*0.11)%1);
    const lx=W*0.02+Math.sin(i*47.3)*W*0.96+Math.sin(t*0.0006+i*2.7)*W*0.05+Math.cos(t*0.001+i)*W*0.02;
    const ly=-H*0.06+leafLife*(H*1.15);
    const leafRot=t*0.003+i*1.4+Math.sin(t*0.002+i)*0.4;
    const leafA=0.65+0.20*Math.sin(t*0.001+i);
    const leafSz=0.9+Math.sin(i*2.7)*0.5;
    ctx.save();
    ctx.translate(lx,ly); ctx.rotate(leafRot); ctx.scale(leafSz,leafSz);
    // stín listu
    ctx.fillStyle='rgba(60,40,10,0.28)';
    ctx.beginPath();
    ctx.moveTo(1,-4); ctx.quadraticCurveTo(7,0,1,7); ctx.quadraticCurveTo(-5,0,1,-4);
    ctx.closePath(); ctx.fill();
    // samotný list
    ctx.fillStyle=leafCols[i%leafCols.length]+leafA+')';
    ctx.beginPath();
    ctx.moveTo(0,-5); ctx.quadraticCurveTo(6,0,0,6); ctx.quadraticCurveTo(-6,0,0,-5);
    ctx.closePath(); ctx.fill();
    // žilka
    ctx.strokeStyle='rgba(60,30,5,0.5)'; ctx.lineWidth=0.6;
    ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(0,6); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // ── Milan – tělo a stříkající krev ──
  if(gs.milan_death_anim && gs.room === 'kremze'){
    drawDeathBody(gs.milan_death_anim, t, '#06b6d4', 'milan');
  }

  // Fábie – červená, zaparkovaná u Johnnyho baráku
  if(gs.story.fabie_promised){
    const fx=W*0.56, fy=H*0.54;
    // Stín
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(fx+7,fy+10,48,12,0,0,Math.PI*2); ctx.fill();
    // Karoserie – červená
    const fG=ctx.createLinearGradient(fx-46,fy-22,fx+46,fy+18);
    fG.addColorStop(0,'#b82020'); fG.addColorStop(0.3,'#e03030'); fG.addColorStop(0.6,'#d02828'); fG.addColorStop(1,'#901818');
    ctx.fillStyle=fG; rrect(fx-46,fy-22,92,36,6); ctx.fill();
    ctx.strokeStyle='#701010'; ctx.lineWidth=1.5; rrect(fx-46,fy-22,92,36,6); ctx.stroke();
    // Střecha
    const rG=ctx.createLinearGradient(fx-28,fy-42,fx+28,fy-20);
    rG.addColorStop(0,'#c02828'); rG.addColorStop(1,'#a01818');
    ctx.fillStyle=rG; rrect(fx-28,fy-42,56,24,5); ctx.fill();
    ctx.strokeStyle='#701010'; ctx.lineWidth=1; rrect(fx-28,fy-42,56,24,5); ctx.stroke();
    // Okna
    ctx.fillStyle='rgba(120,180,230,0.55)'; rrect(fx-24,fy-39,20,17,2); ctx.fill(); rrect(fx+4,fy-39,20,17,2); ctx.fill();
    // Světla přední
    ctx.fillStyle='rgba(255,255,180,0.7)'; ctx.beginPath(); ctx.arc(fx-42,fy-8,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,180,0.5)'; ctx.beginPath(); ctx.arc(fx-42,fy+2,3,0,Math.PI*2); ctx.fill();
    // Světla zadní
    ctx.fillStyle='rgba(255,50,30,0.6)'; ctx.beginPath(); ctx.arc(fx+42,fy-8,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,50,30,0.4)'; ctx.beginPath(); ctx.arc(fx+42,fy+2,3,0,Math.PI*2); ctx.fill();
    // Kola – větší
    ctx.fillStyle='#1a1a1a'; [-30,26].forEach(ox=>{ ctx.beginPath(); ctx.arc(fx+ox,fy+16,11,0,Math.PI*2); ctx.fill(); });
    ctx.fillStyle='#666'; [-30,26].forEach(ox=>{ ctx.beginPath(); ctx.arc(fx+ox,fy+16,6,0,Math.PI*2); ctx.fill(); });
    // Logo Škoda (čárka)
    ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='bold 7px monospace'; ctx.textAlign='center';
    ctx.fillText('Š', fx, fy-6);
    // Popisek
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='bold 10px monospace';
    ctx.fillText('FÁBIE', fx, fy-48);
    ctx.textAlign='left';
  }

  // Johnnyho vila – svítící efekt na budově pokud je Jana uvnitř
  // Záře kolem Johnnyho vily (během questu nebo s klíči)
  const villaGlow = (gs.story.johnny_took_jana && !gs.story.jana_rescued_villa && !gs.story.jana_drugged_villa) || gs.inv.klice_vila;
  if(villaGlow){
    const vilX=W*0.50, vilY=H*0.46;
    ctx.save();
    ctx.fillStyle = gs.inv.klice_vila ? 'rgba(200,200,255,0.10)' : 'rgba(255,200,80,0.18)';
    ctx.beginPath(); ctx.arc(vilX, vilY, 28, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ─── Johnnyho vila – luxusní obývák ───────────────────────────────────────────
function drawJohnnyVila(W,H,t){
  const ft = t * 0.001;
  // ── Podlaha – tmavý leštěný parket ──
  ctx.fillStyle='#2a2028'; ctx.fillRect(0,0,W,H);
  const floorG=ctx.createLinearGradient(0,H*0.48,0,H);
  floorG.addColorStop(0,'#4a3848'); floorG.addColorStop(0.5,'#3e2e40'); floorG.addColorStop(1,'#302438');
  ctx.fillStyle=floorG; ctx.fillRect(0,H*0.48,W,H*0.52);
  // Parkety – tmavý dub, herringbone vzor
  for(let px=-20;px<W+20;px+=36) for(let py=H*0.48;py<H;py+=16){
    const off=(Math.floor(py/16)%2)*18;
    const shade=`rgba(${80+Math.sin(px*0.05)*10},${55+Math.sin(py*0.06)*8},${70+Math.sin(px*0.04+py*0.03)*8},0.30)`;
    ctx.strokeStyle=shade; ctx.lineWidth=0.5;
    ctx.strokeRect(px+off,py,36,16);
  }
  // Podlahový odlesk – lesklý parket
  const flRef=ctx.createLinearGradient(0,H*0.48,0,H*0.60);
  flRef.addColorStop(0,'rgba(255,255,255,0.03)'); flRef.addColorStop(1,'transparent');
  ctx.fillStyle=flRef; ctx.fillRect(0,H*0.48,W,H*0.12);

  // ── Tapeta – luxusní burgundy s VIDITELNÝM zlato-damaškovým vzorem ──
  const wallG=ctx.createLinearGradient(0,0,0,H*0.48);
  wallG.addColorStop(0,'#2a1a30'); wallG.addColorStop(0.5,'#321e38'); wallG.addColorStop(1,'#281830');
  ctx.fillStyle=wallG; ctx.fillRect(0,0,W,H*0.48);
  // Damašek – výrazný zlatý ornament
  for(let rx=0;rx<W;rx+=50) for(let ry=0;ry<H*0.48;ry+=50){
    const ornA=0.08+0.04*Math.sin(rx*0.03+ry*0.02);
    // Velký diamant
    ctx.strokeStyle=`rgba(200,170,80,${ornA})`; ctx.lineWidth=0.8;
    ctx.beginPath();
    ctx.moveTo(rx+25,ry+4); ctx.lineTo(rx+46,ry+25); ctx.lineTo(rx+25,ry+46); ctx.lineTo(rx+4,ry+25);
    ctx.closePath(); ctx.stroke();
    // Vnitřní ornament – lilie
    ctx.beginPath();
    ctx.moveTo(rx+25,ry+12); ctx.quadraticCurveTo(rx+35,ry+20,rx+25,ry+28);
    ctx.quadraticCurveTo(rx+15,ry+20,rx+25,ry+12); ctx.stroke();
    // Malý diamant
    ctx.strokeStyle=`rgba(200,170,80,${ornA*0.6})`; ctx.lineWidth=0.5;
    ctx.beginPath();
    ctx.moveTo(rx+25,ry+18); ctx.lineTo(rx+32,ry+25); ctx.lineTo(rx+25,ry+32); ctx.lineTo(rx+18,ry+25);
    ctx.closePath(); ctx.stroke();
  }
  // Zlatá lišta nahoře a dole
  ctx.fillStyle='rgba(200,170,80,0.20)'; ctx.fillRect(0,0,W,H*0.008);
  ctx.fillStyle='rgba(200,170,80,0.25)'; ctx.fillRect(0,H*0.46,W,H*0.008);
  // Lišta/obrubník na zdi
  ctx.fillStyle='rgba(120,80,100,0.40)'; ctx.fillRect(0,H*0.46,W,H*0.04);
  ctx.strokeStyle='rgba(200,170,80,0.20)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,H*0.46); ctx.lineTo(W,H*0.46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,H*0.50); ctx.lineTo(W,H*0.50); ctx.stroke();

  // ── KŘIŠŤÁLOVÝ LUSTR ──────────────────────────────────────────────────
  {
    const clx=W*0.38, cly=H*0.08;
    // Řetěz
    ctx.strokeStyle='rgba(200,180,120,0.4)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(clx,0); ctx.lineTo(clx,cly-H*0.01); ctx.stroke();
    // Zlatý rám
    ctx.strokeStyle='rgba(200,180,100,0.50)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(clx,cly,W*0.04,H*0.012,0,0,Math.PI*2); ctx.stroke();
    // Křišťálové přívěsky (visí dolů)
    for(let ci=0;ci<12;ci++){
      const ca=ci/12*Math.PI*2;
      const cr=W*0.035;
      const cx2=clx+Math.cos(ca)*cr, cy2=cly+H*0.008;
      const cLen=H*0.04+Math.sin(ci*2.3)*H*0.01;
      // Nitka
      ctx.strokeStyle='rgba(200,200,220,0.2)'; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(cx2,cy2); ctx.lineTo(cx2,cy2+cLen); ctx.stroke();
      // Křišťál – malý duhový odlesk
      const sparkle=0.3+0.3*Math.sin(ft*2.5+ci*1.7);
      ctx.fillStyle=`rgba(255,255,255,${sparkle*0.7})`; ctx.beginPath(); ctx.arc(cx2,cy2+cLen,2,0,Math.PI*2); ctx.fill();
    }
    // Záře lustru
    const lustG=ctx.createRadialGradient(clx,cly+H*0.02,0,clx,cly+H*0.02,W*0.15);
    lustG.addColorStop(0,'rgba(255,240,200,0.12)'); lustG.addColorStop(0.5,'rgba(255,220,150,0.04)'); lustG.addColorStop(1,'transparent');
    ctx.fillStyle=lustG; ctx.beginPath(); ctx.arc(clx,cly+H*0.02,W*0.15,0,Math.PI*2); ctx.fill();
    // Duhové odlesky na stěně/stropě
    const rainbowCols=['rgba(255,100,100,','rgba(255,200,100,','rgba(100,255,100,','rgba(100,200,255,','rgba(200,100,255,'];
    for(let ri=0;ri<8;ri++){
      const rAng=ft*0.3+ri*0.8;
      const rx2=clx+Math.cos(rAng)*W*(0.06+ri*0.03);
      const ry2=cly+Math.sin(rAng)*H*(0.04+ri*0.02)-H*0.02;
      const ra=0.04+0.03*Math.sin(ft*1.5+ri);
      ctx.fillStyle=rainbowCols[ri%rainbowCols.length]+ra+')';
      ctx.beginPath(); ctx.ellipse(rx2,ry2,4,2,rAng,0,Math.PI*2); ctx.fill();
    }
  }

  // ── Perský koberec pod pohovkou – s viditelným vzorem ──
  {
    const rx=W*0.10, ry=H*0.55, rw=W*0.45, rh=H*0.30;
    // Hlavní plocha koberce
    ctx.fillStyle='rgba(130,30,40,0.22)'; rrect(rx,ry,rw,rh,4); ctx.fill();
    // Vnější bordura – zlatá
    ctx.strokeStyle='rgba(200,170,80,0.20)'; ctx.lineWidth=3; rrect(rx+2,ry+2,rw-4,rh-4,3); ctx.stroke();
    // Vnitřní bordura
    ctx.strokeStyle='rgba(200,170,80,0.12)'; ctx.lineWidth=1.5; rrect(rx+8,ry+8,rw-16,rh-16,2); ctx.stroke();
    // Středový motiv – medailon
    ctx.strokeStyle='rgba(200,170,80,0.15)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.ellipse(rx+rw/2,ry+rh/2,rw*0.18,rh*0.25,0,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(rx+rw/2,ry+rh/2,rw*0.12,rh*0.16,0,0,Math.PI*2); ctx.stroke();
    // Rohové ornamenty
    [[rx+15,ry+15],[rx+rw-15,ry+15],[rx+15,ry+rh-15],[rx+rw-15,ry+rh-15]].forEach(([cx2,cy2])=>{
      ctx.beginPath(); ctx.arc(cx2,cy2,8,0,Math.PI*2); ctx.stroke();
    });
  }

  // ── Kožená pohovka – Chesterfield styl ──
  const sx=W*0.14, sy=H*0.58;
  // Stín
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(sx+W*0.16,sy+H*0.18,W*0.18,H*0.03,0,0,Math.PI*2); ctx.fill();
  // Opěradlo – tmavá kůže s kapitonáží
  const backG=ctx.createLinearGradient(sx,sy-H*0.04,sx,sy+H*0.02);
  backG.addColorStop(0,'#4a2040'); backG.addColorStop(0.5,'#5a2850'); backG.addColorStop(1,'#4a2040');
  ctx.fillStyle=backG; rrect(sx,sy-H*0.04,W*0.32,H*0.08,6); ctx.fill();
  // Kapitonáž – knoflíky
  for(let bi=0;bi<5;bi++){
    const bx2=sx+W*0.03+bi*W*0.065, by2=sy-H*0.01;
    ctx.fillStyle='rgba(200,170,80,0.25)'; ctx.beginPath(); ctx.arc(bx2,by2,2,0,Math.PI*2); ctx.fill();
    // Záhyby kolem knoflíku
    ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(bx2-8,by2); ctx.lineTo(bx2,by2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx2+8,by2); ctx.lineTo(bx2,by2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx2,by2-6); ctx.lineTo(bx2,by2); ctx.stroke();
  }
  // Sedák – tmavá kůže
  const seatG=ctx.createLinearGradient(sx,sy+H*0.02,sx,sy+H*0.16);
  seatG.addColorStop(0,'#5a3058'); seatG.addColorStop(0.3,'#6a3868'); seatG.addColorStop(1,'#5a2858');
  ctx.fillStyle=seatG; rrect(sx,sy+H*0.02,W*0.32,H*0.14,6); ctx.fill();
  // Odlesk na kůži
  ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(sx+3,sy+H*0.025,W*0.32-6,H*0.02);
  // Polštáře s texturou
  [[sx+6,0.09,'#7a4880'],[sx+W*0.12,0.09,'#6e3c72'],[sx+W*0.22,0.09,'#7a4880']].forEach(([px,pw,pc])=>{
    ctx.fillStyle=pc; rrect(px,sy+H*0.03,W*pw,H*0.08,4); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.03)'; ctx.fillRect(px+2,sy+H*0.032,W*pw-4,H*0.015);
  });
  // Nožičky – zlaté/mosazné
  ctx.fillStyle='#c0a040'; ctx.fillRect(sx+3,sy+H*0.16,6,H*0.04);
  ctx.fillRect(sx+W*0.32-9,sy+H*0.16,6,H*0.04);
  // Šuplík u pohovky (prášek)
  if(!gs.story.villa_powder_taken && !gs.story.johnny_cuffed){
    const drx=W*0.18, dry=H*0.72;
    ctx.fillStyle='#5a4038'; rrect(drx,dry,W*0.10,H*0.06,2); ctx.fill();
    ctx.strokeStyle='rgba(220,170,120,0.35)'; ctx.lineWidth=1; rrect(drx,dry,W*0.10,H*0.06,2); ctx.stroke();
    ctx.fillStyle='rgba(220,170,120,0.5)'; ctx.fillRect(drx+W*0.04,dry+H*0.02,W*0.02,H*0.02);
  }

  // ── Konferenční stolek ──
  const tx2=W*0.30, ty2=H*0.72;
  ctx.fillStyle='#6a5030'; rrect(tx2,ty2,W*0.12,H*0.06,2); ctx.fill();
  ctx.strokeStyle='#5a4020'; ctx.lineWidth=1; rrect(tx2,ty2,W*0.12,H*0.06,2); ctx.stroke();
  // Svíčka na stolku
  ctx.fillStyle='#e8d8b0'; ctx.fillRect(tx2+W*0.05,ty2-H*0.03,W*0.015,H*0.035);
  const flicker=Math.sin(ft*6)*0.3+0.7;
  ctx.fillStyle=`rgba(255,180,40,${flicker*0.8})`; ctx.beginPath();
  ctx.arc(tx2+W*0.0575,ty2-H*0.035,3,0,Math.PI*2); ctx.fill();

  // ── Stůl s židlemi (kde Johnny sedí/je spoutaný) ──
  const jtx=W*0.55, jty=H*0.60;
  ctx.fillStyle='#7a5a38'; rrect(jtx,jty,W*0.20,H*0.12,3); ctx.fill();
  ctx.strokeStyle='#5a4020'; ctx.lineWidth=2; rrect(jtx,jty,W*0.20,H*0.12,3); ctx.stroke();
  // Nohy stolu
  ctx.fillStyle='#5a4020';
  ctx.fillRect(jtx+3,jty+H*0.12,4,H*0.04); ctx.fillRect(jtx+W*0.20-7,jty+H*0.12,4,H*0.04);
  // Židle
  ctx.fillStyle='#6a4a30'; rrect(jtx-W*0.03,jty+H*0.02,W*0.06,H*0.06,2); ctx.fill();
  ctx.fillRect(jtx-W*0.025,jty-H*0.02,W*0.05,H*0.04);
  ctx.fillStyle='#6a4a30'; rrect(jtx+W*0.17,jty+H*0.02,W*0.06,H*0.06,2); ctx.fill();
  ctx.fillRect(jtx+W*0.175,jty-H*0.02,W*0.05,H*0.04);
  // Věci na stole – sklenice
  ctx.fillStyle='rgba(200,180,100,0.5)'; rrect(jtx+W*0.04,jty+H*0.02,W*0.025,H*0.06,1); ctx.fill();
  ctx.fillStyle='rgba(180,160,80,0.3)'; rrect(jtx+W*0.12,jty+H*0.02,W*0.025,H*0.06,1); ctx.fill();
  // Johnny spoutaný
  if(gs.story.johnny_cuffed){
    ctx.fillStyle='rgba(180,140,40,0.6)'; ctx.font='18px monospace'; ctx.textAlign='center';
    ctx.fillText('⛓️', jtx+W*0.10, jty+H*0.08);
    ctx.textAlign='left';
  }

  // ── Kuchyňská linka – mramorová deska ──
  const kx=W*0.72, ky=H*0.48;
  // Spodní skříňky – tmavé dřevo
  const kcG=ctx.createLinearGradient(kx,ky+H*0.10,kx,ky+H*0.28);
  kcG.addColorStop(0,'#3a3048'); kcG.addColorStop(1,'#2a2238');
  ctx.fillStyle=kcG; ctx.fillRect(kx,ky+H*0.10,W*0.24,H*0.18);
  ctx.strokeStyle='#5a4878'; ctx.lineWidth=1; ctx.strokeRect(kx,ky+H*0.10,W*0.24,H*0.18);
  // Dvířka s mosazným kováním
  for(let d=0;d<3;d++){
    const ddx=kx+W*0.02+d*W*0.075;
    ctx.strokeStyle='rgba(120,90,150,0.30)'; ctx.lineWidth=0.5;
    rrect(ddx,ky+H*0.12,W*0.065,H*0.14,2); ctx.stroke();
    // Mosazná úchytka
    ctx.fillStyle='rgba(200,170,80,0.35)'; ctx.fillRect(ddx+W*0.025,ky+H*0.17,W*0.015,H*0.025);
    ctx.fillStyle='rgba(220,190,100,0.25)'; ctx.fillRect(ddx+W*0.026,ky+H*0.171,W*0.013,H*0.004);
  }
  // Mramorová deska
  const mrbG=ctx.createLinearGradient(kx,ky+H*0.08,kx+W*0.248,ky+H*0.12);
  mrbG.addColorStop(0,'#5a4a5e'); mrbG.addColorStop(0.3,'#4e405a'); mrbG.addColorStop(0.7,'#564858'); mrbG.addColorStop(1,'#4a3a55');
  ctx.fillStyle=mrbG; ctx.fillRect(kx-2,ky+H*0.08,W*0.248,H*0.04);
  // Mramorové žilky
  ctx.strokeStyle='rgba(200,200,220,0.08)'; ctx.lineWidth=0.8;
  for(let v=0;v<4;v++){
    ctx.beginPath();
    ctx.moveTo(kx+v*W*0.06,ky+H*0.08);
    ctx.quadraticCurveTo(kx+v*W*0.06+W*0.03,ky+H*0.10+Math.sin(v*3)*H*0.008,kx+v*W*0.06+W*0.06,ky+H*0.12);
    ctx.stroke();
  }
  ctx.strokeStyle='rgba(120,90,150,0.35)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(kx-2,ky+H*0.08); ctx.lineTo(kx+W*0.246,ky+H*0.08); ctx.stroke();
  // Horní police – skříňky se sklem
  ctx.fillStyle='#342848'; ctx.fillRect(kx+W*0.02,ky,W*0.20,H*0.06);
  ctx.strokeStyle='rgba(120,90,150,0.25)'; ctx.lineWidth=0.5; ctx.strokeRect(kx+W*0.02,ky,W*0.20,H*0.06);
  // Skleničky za sklem
  for(let tp=0;tp<4;tp++){
    ctx.fillStyle='rgba(200,200,210,0.20)'; ctx.beginPath();
    ctx.arc(kx+W*0.05+tp*W*0.05,ky+H*0.04,4,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(200,200,210,0.10)'; ctx.lineWidth=0.5; ctx.stroke();
  }
  // Drink na lince
  if(!gs.story.jana_drugged_villa){
    ctx.fillStyle='rgba(200,230,255,0.7)'; rrect(kx+W*0.08,ky+H*0.09,W*0.025,H*0.07,2); ctx.fill();
    ctx.strokeStyle='rgba(150,180,220,0.5)'; ctx.lineWidth=1; rrect(kx+W*0.08,ky+H*0.09,W*0.025,H*0.07,2); ctx.stroke();
    ctx.strokeStyle='rgba(255,100,150,0.6)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(kx+W*0.09,ky+H*0.05); ctx.lineTo(kx+W*0.093,ky+H*0.10); ctx.stroke();
  }
  // Dřez – kovový
  ctx.fillStyle='rgba(90,95,105,0.45)'; rrect(kx+W*0.15,ky+H*0.09,W*0.05,H*0.04,1); ctx.fill();
  ctx.fillStyle='rgba(170,175,185,0.35)'; ctx.fillRect(kx+W*0.17,ky+H*0.06,W*0.01,H*0.04);

  // ── Okno – luxusní s těžkými závěsy ──
  const wx=W*0.38, wy=H*0.06;
  // Těžké sametové závěsy – burgundy
  const curtL=ctx.createLinearGradient(wx-W*0.05,wy,wx-W*0.01,wy);
  curtL.addColorStop(0,'rgba(80,20,35,0.40)'); curtL.addColorStop(0.5,'rgba(100,30,45,0.30)'); curtL.addColorStop(1,'rgba(60,15,25,0.15)');
  ctx.fillStyle=curtL; ctx.fillRect(wx-W*0.05,wy-H*0.03,W*0.07,H*0.30);
  const curtR=ctx.createLinearGradient(wx+W*0.19,wy,wx+W*0.26,wy);
  curtR.addColorStop(0,'rgba(60,15,25,0.15)'); curtR.addColorStop(0.5,'rgba(100,30,45,0.30)'); curtR.addColorStop(1,'rgba(80,20,35,0.40)');
  ctx.fillStyle=curtR; ctx.fillRect(wx+W*0.19,wy-H*0.03,W*0.07,H*0.30);
  // Záhyby závěsů
  ctx.strokeStyle='rgba(50,10,20,0.15)'; ctx.lineWidth=0.5;
  for(let cf=0;cf<3;cf++){
    ctx.beginPath(); ctx.moveTo(wx-W*0.04+cf*W*0.015,wy-H*0.03); ctx.lineTo(wx-W*0.04+cf*W*0.015,wy+H*0.27); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx+W*0.20+cf*W*0.015,wy-H*0.03); ctx.lineTo(wx+W*0.20+cf*W*0.015,wy+H*0.27); ctx.stroke();
  }
  // Zlatá záclonová tyč
  ctx.fillStyle='rgba(200,170,80,0.30)'; ctx.fillRect(wx-W*0.06,wy-H*0.035,W*0.34,H*0.008);
  // Sklo okna
  const winG=ctx.createLinearGradient(wx,wy,wx,wy+H*0.20);
  winG.addColorStop(0,'rgba(15,20,50,0.50)'); winG.addColorStop(1,'rgba(25,35,70,0.45)');
  ctx.fillStyle=winG; ctx.fillRect(wx,wy,W*0.22,H*0.20);
  // Hvězdy
  for(let s=0;s<10;s++){
    const stx=wx+4+Math.sin(s*2.1)*W*0.08+W*0.11;
    const sty=wy+4+Math.cos(s*1.7)*H*0.06+H*0.08;
    const sb=0.4+0.4*Math.sin(ft*2+s);
    ctx.fillStyle=`rgba(255,255,220,${sb})`;
    ctx.beginPath(); ctx.arc(stx,sty,0.8+Math.sin(s*3)*0.4,0,Math.PI*2); ctx.fill();
  }
  // Rám okna – zlatý
  ctx.strokeStyle='rgba(180,150,80,0.40)'; ctx.lineWidth=2.5; ctx.strokeRect(wx,wy,W*0.22,H*0.20);
  ctx.strokeStyle='rgba(160,130,60,0.25)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(wx+W*0.11,wy); ctx.lineTo(wx+W*0.11,wy+H*0.20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wx,wy+H*0.10); ctx.lineTo(wx+W*0.22,wy+H*0.10); ctx.stroke();

  // ── Obraz na zdi – zlatý rám, olejomalba ──
  {
    const px=W*0.08, py=H*0.10, pw=W*0.12, ph=H*0.16;
    // Stín rámu
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(px+3,py+3,pw,ph);
    // Zlatý rám – vícenásobný
    ctx.fillStyle='rgba(180,150,60,0.45)'; ctx.fillRect(px-4,py-4,pw+8,ph+8);
    ctx.fillStyle='rgba(200,170,80,0.35)'; ctx.fillRect(px-2,py-2,pw+4,ph+4);
    ctx.strokeStyle='rgba(220,190,100,0.30)'; ctx.lineWidth=1; ctx.strokeRect(px-4,py-4,pw+8,ph+8);
    // Plátno – západ slunce nad krajinou
    const artG=ctx.createLinearGradient(px,py,px,py+ph);
    artG.addColorStop(0,'rgba(200,120,40,0.40)'); artG.addColorStop(0.4,'rgba(180,100,30,0.35)'); artG.addColorStop(0.6,'rgba(60,100,50,0.30)'); artG.addColorStop(1,'rgba(40,80,40,0.30)');
    ctx.fillStyle=artG; ctx.fillRect(px,py,pw,ph);
    // Slunce na obraze
    ctx.fillStyle='rgba(255,220,100,0.40)'; ctx.beginPath(); ctx.arc(px+pw*0.6,py+ph*0.25,pw*0.08,0,Math.PI*2); ctx.fill();
    // Hory
    ctx.fillStyle='rgba(50,80,50,0.25)'; ctx.beginPath();
    ctx.moveTo(px,py+ph*0.65); ctx.lineTo(px+pw*0.25,py+ph*0.40); ctx.lineTo(px+pw*0.45,py+ph*0.55);
    ctx.lineTo(px+pw*0.65,py+ph*0.38); ctx.lineTo(px+pw,py+ph*0.60); ctx.lineTo(px+pw,py+ph); ctx.lineTo(px,py+ph); ctx.closePath(); ctx.fill();
  }

  // ── AKVÁRIUM na stojanu (u stěny) ──
  {
    const ax=W*0.84, ay=H*0.28, aw=W*0.12, ah=H*0.14;
    // Stojan
    ctx.fillStyle='#2a2030'; ctx.fillRect(ax+aw*0.1,ay+ah,aw*0.3,H*0.16);
    ctx.fillRect(ax+aw*0.6,ay+ah,aw*0.3,H*0.16);
    // Nádrž – sklo
    ctx.fillStyle='rgba(30,60,100,0.35)'; rrect(ax,ay,aw,ah,2); ctx.fill();
    // Voda
    const waterG=ctx.createLinearGradient(ax,ay,ax,ay+ah);
    waterG.addColorStop(0,'rgba(40,100,180,0.30)'); waterG.addColorStop(1,'rgba(20,60,120,0.40)');
    ctx.fillStyle=waterG; ctx.fillRect(ax+2,ay+ah*0.1,aw-4,ah*0.88);
    // Bubliny
    for(let b=0;b<6;b++){
      const bPhase=((ft*0.5+b*0.3)%1);
      const bx2=ax+aw*0.2+Math.sin(b*4.3)*aw*0.3;
      const by2=ay+ah*(0.85-bPhase*0.70);
      const bA=(1-bPhase)*0.30;
      ctx.strokeStyle=`rgba(150,200,255,${bA})`; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.arc(bx2,by2,1.5+Math.sin(b*2)*0.5,0,Math.PI*2); ctx.stroke();
    }
    // Rybky – siluety
    for(let f=0;f<3;f++){
      const fPhase=((ft*0.3+f*0.5)%(1));
      const fx2=ax+aw*0.1+fPhase*aw*0.75;
      const fy2=ay+ah*(0.3+f*0.2)+Math.sin(ft+f*3)*ah*0.05;
      const fDir=f%2===0?1:-1;
      ctx.fillStyle=f===0?'rgba(255,140,40,0.50)':f===1?'rgba(255,80,80,0.45)':'rgba(80,200,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(fx2+fDir*6,fy2); ctx.lineTo(fx2-fDir*3,fy2-2); ctx.lineTo(fx2-fDir*3,fy2+2); ctx.closePath(); ctx.fill();
      // Ocásek
      ctx.beginPath(); ctx.moveTo(fx2-fDir*3,fy2); ctx.lineTo(fx2-fDir*6,fy2-2); ctx.lineTo(fx2-fDir*6,fy2+2); ctx.closePath(); ctx.fill();
    }
    // LED světlo akvária
    ctx.fillStyle='rgba(60,140,255,0.08)'; ctx.fillRect(ax+2,ay+2,aw-4,ah*0.08);
    // Záře akvária na okolí
    const aqG=ctx.createRadialGradient(ax+aw/2,ay+ah/2,0,ax+aw/2,ay+ah/2,W*0.08);
    aqG.addColorStop(0,'rgba(40,100,200,0.06)'); aqG.addColorStop(1,'transparent');
    ctx.fillStyle=aqG; ctx.beginPath(); ctx.arc(ax+aw/2,ay+ah/2,W*0.08,0,Math.PI*2); ctx.fill();
    // Rám skla
    ctx.strokeStyle='rgba(120,130,140,0.30)'; ctx.lineWidth=1.5; rrect(ax,ay,aw,ah,2); ctx.stroke();
  }

  // ── Velký flatscreen TV ──
  {
    const tvx=W*0.65, tvy=H*0.06, tvw=W*0.20, tvh=H*0.14;
    // Rám TV – tenký
    ctx.fillStyle='#0a0a0e'; rrect(tvx,tvy,tvw,tvh,3); ctx.fill();
    ctx.strokeStyle='rgba(50,50,55,0.5)'; ctx.lineWidth=1.5; rrect(tvx,tvy,tvw,tvh,3); ctx.stroke();
    // Obsah – fotbal/sport
    const tvA=0.5+0.15*Math.sin(ft*3)+0.08*Math.sin(ft*7);
    const tvBG=ctx.createLinearGradient(tvx+3,tvy+3,tvx+tvw-3,tvy+tvh-3);
    tvBG.addColorStop(0,`rgba(30,80,30,${tvA})`); tvBG.addColorStop(0.5,`rgba(40,100,40,${tvA})`); tvBG.addColorStop(1,`rgba(25,70,25,${tvA})`);
    ctx.fillStyle=tvBG; ctx.fillRect(tvx+3,tvy+3,tvw-6,tvh-6);
    // Čáry hřiště
    ctx.strokeStyle=`rgba(255,255,255,${tvA*0.3})`; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(tvx+tvw/2,tvy+5); ctx.lineTo(tvx+tvw/2,tvy+tvh-5); ctx.stroke();
    ctx.beginPath(); ctx.arc(tvx+tvw/2,tvy+tvh/2,tvh*0.2,0,Math.PI*2); ctx.stroke();
    // Skóre v rohu
    ctx.fillStyle=`rgba(255,255,255,${tvA*0.5})`; ctx.font=`${Math.floor(tvh*0.10)}px monospace`;
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText('SPA 2:1 CZE',tvx+5,tvy+5);
    // Stojánek TV
    ctx.fillStyle='#1a1a20'; ctx.fillRect(tvx+tvw*0.4,tvy+tvh,tvw*0.2,H*0.01);
    ctx.fillRect(tvx+tvw*0.3,tvy+tvh+H*0.008,tvw*0.4,H*0.005);
  }

  // ── Stojací lampa v rohu – luxusnější ──
  {
    // Základna – mosaz
    ctx.fillStyle='#c0a040'; ctx.beginPath(); ctx.ellipse(W*0.05,H*0.78,W*0.018,H*0.008,0,0,Math.PI*2); ctx.fill();
    // Tyč
    ctx.fillStyle='#a08030'; ctx.fillRect(W*0.047,H*0.52,W*0.006,H*0.26);
    // Stínítko – hedvábné
    const shadeG=ctx.createLinearGradient(W*0.03,H*0.48,W*0.07,H*0.52);
    shadeG.addColorStop(0,'rgba(180,140,90,0.50)'); shadeG.addColorStop(0.5,'rgba(220,180,120,0.45)'); shadeG.addColorStop(1,'rgba(160,120,70,0.45)');
    ctx.fillStyle=shadeG;
    ctx.beginPath(); ctx.moveTo(W*0.03,H*0.52); ctx.lineTo(W*0.07,H*0.52); ctx.lineTo(W*0.065,H*0.48); ctx.lineTo(W*0.035,H*0.48); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(200,170,80,0.25)'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(W*0.03,H*0.52); ctx.lineTo(W*0.07,H*0.52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W*0.035,H*0.48); ctx.lineTo(W*0.065,H*0.48); ctx.stroke();
  }

  // ── Dveře do koupelny ──
  if(gs.story.jana_hint_given && !gs.story.johnny_cuffed){
    const bdr=W*0.90, bdy=H*0.26;
    ctx.fillStyle='#4a3540'; rrect(bdr,bdy,W*0.08,H*0.22,2); ctx.fill();
    ctx.strokeStyle='rgba(180,130,110,0.5)'; ctx.lineWidth=1.5; rrect(bdr,bdy,W*0.08,H*0.22,2); ctx.stroke();
    ctx.fillStyle='rgba(200,160,60,0.5)'; ctx.beginPath();
    ctx.arc(bdr+W*0.065,bdy+H*0.12,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.font='8px monospace'; ctx.textAlign='center';
    ctx.fillText('🚿',bdr+W*0.04,bdy-4); ctx.textAlign='left';
  }

  // ── Dveře do ložnice (vždy viditelné, fiktivní místnost) ──
  {
    const ldx=W*0.02, ldy=H*0.22, ldw=W*0.07, ldh=H*0.26;
    ctx.fillStyle='#3a2838'; rrect(ldx,ldy,ldw,ldh,3); ctx.fill();
    ctx.strokeStyle='rgba(160,110,90,0.5)'; ctx.lineWidth=1.5; rrect(ldx,ldy,ldw,ldh,3); ctx.stroke();
    // Klika
    ctx.fillStyle='rgba(200,160,60,0.6)'; ctx.beginPath();
    ctx.arc(ldx+ldw-8,ldy+ldh*0.52,3.5,0,Math.PI*2); ctx.fill();
    // Nápis
    ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.font='bold 8px Outfit,sans-serif'; ctx.textAlign='center';
    ctx.fillText('LOŽNICE',ldx+ldw/2,ldy-4);
    // Pokud Johnny+Jana v ložnici, světlo pod dveřmi + zvuk
    if(gs.story.johnny_bedroom){
      const glowA=0.15+0.08*Math.sin(ft*2);
      ctx.fillStyle=`rgba(255,200,100,${glowA})`; ctx.fillRect(ldx+2,ldy+ldh-3,ldw-4,4);
      // Zvuková vlna ikona
      const waveA=0.3+0.2*Math.sin(ft*4);
      ctx.fillStyle=`rgba(255,100,100,${waveA})`; ctx.font='14px serif'; ctx.textAlign='center';
      ctx.fillText('♪',ldx+ldw/2,ldy+ldh/2);
    }
    ctx.textAlign='left';
  }

  // ── Nápis ──
  ctx.fillStyle='rgba(120,80,160,0.20)'; ctx.font='bold 11px monospace'; ctx.textAlign='center';
  ctx.fillText('JOHNNYHO VILA', W*0.5, H*0.44);
  ctx.textAlign='left';
  // ── Východ ──
  ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.font='10px monospace'; ctx.textAlign='center';
  ctx.fillText('↓ ODEJÍT', W*0.5, H*0.97);
  ctx.textAlign='left';

  // ── Záře svíčky na stolku – teplý kruhový ambient, výraznější ──
  ctx.save();
  const candleX=W*0.36, candleY=H*0.69;
  const cFlk=0.32+0.10*Math.sin(ft*6.5)+0.05*Math.sin(ft*11.3);
  // vnější velká záře
  const cG=ctx.createRadialGradient(candleX,candleY,0,candleX,candleY,W*0.28);
  cG.addColorStop(0,`rgba(255,200,80,${cFlk})`); cG.addColorStop(0.35,`rgba(255,150,30,${cFlk*0.45})`); cG.addColorStop(0.7,`rgba(180,70,10,${cFlk*0.15})`); cG.addColorStop(1,'transparent');
  ctx.fillStyle=cG; ctx.fillRect(candleX-W*0.28,candleY-H*0.28,W*0.56,H*0.56);
  // teplý světelný kruh na podlaze
  const cFloorG=ctx.createRadialGradient(candleX,candleY+H*0.03,0,candleX,candleY+H*0.03,W*0.16);
  cFloorG.addColorStop(0,`rgba(255,180,60,${cFlk*0.5})`); cFloorG.addColorStop(1,'transparent');
  ctx.fillStyle=cFloorG; ctx.beginPath(); ctx.ellipse(candleX,candleY+H*0.03,W*0.16,H*0.06,0,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // ── Záře lampy v rohu ──
  ctx.save();
  const lmpX=W*0.05, lmpY=H*0.54;
  const lmpFlk=0.25+0.04*Math.sin(ft*2.3);
  const lmpG=ctx.createRadialGradient(lmpX,lmpY,0,lmpX,lmpY,W*0.22);
  lmpG.addColorStop(0,`rgba(255,210,120,${lmpFlk})`); lmpG.addColorStop(0.4,`rgba(255,170,60,${lmpFlk*0.35})`); lmpG.addColorStop(1,'transparent');
  ctx.fillStyle=lmpG; ctx.fillRect(0,H*0.30,W*0.30,H*0.50);
  ctx.restore();

  // ── TV ambient — modravý odlesk, mnohem silnější a blikavý ──
  ctx.save();
  const tvFlk=0.22+0.12*Math.sin(ft*3.2)+0.08*Math.sin(ft*7.7)+0.06*Math.sin(ft*13.1);
  const tvG=ctx.createRadialGradient(W*0.74,H*0.14,0,W*0.74,H*0.14,W*0.45);
  tvG.addColorStop(0,`rgba(80,140,220,${tvFlk})`); tvG.addColorStop(0.3,`rgba(50,90,180,${tvFlk*0.55})`); tvG.addColorStop(0.7,`rgba(30,60,140,${tvFlk*0.18})`); tvG.addColorStop(1,'transparent');
  ctx.fillStyle=tvG; ctx.fillRect(W*0.35,0,W*0.65,H*0.7);
  // TV odlesk na podlaze
  const tvFloorG=ctx.createRadialGradient(W*0.74,H*0.55,0,W*0.74,H*0.55,W*0.28);
  tvFloorG.addColorStop(0,`rgba(60,110,200,${tvFlk*0.5})`); tvFloorG.addColorStop(1,'transparent');
  ctx.fillStyle=tvFloorG; ctx.beginPath(); ctx.ellipse(W*0.74,H*0.58,W*0.28,H*0.10,0,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // ── Kouř ze svíčky ──
  ctx.save();
  for(let i=0;i<8;i++){
    const smLife=((t*0.00012+i*0.32)%1);
    const smX=candleX-W*0.005+Math.sin(smLife*Math.PI*2+i)*W*0.012*(1+smLife);
    const smY=candleY-H*0.04-smLife*H*0.22;
    const smR=W*0.008+smLife*W*0.022;
    const smA=0.12*(1-smLife);
    ctx.fillStyle=`rgba(220,200,180,${smA})`;
    ctx.beginPath(); ctx.arc(smX,smY,smR,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Prachové částice v místnosti – mnohem víc a viditelnější ──
  ctx.save();
  for(let i=0;i<42;i++){
    const dx=W*0.05+(Math.sin(i*137.508)*0.5+0.5)*W*0.9+Math.sin(t*0.0004+i)*W*0.015;
    const dy=H*0.05+((t*0.00006+i*0.15)%1)*H*0.82;
    const da=0.22+0.28*Math.abs(Math.sin(t*0.0012+i*1.5));
    const sz=0.8+Math.abs(Math.sin(i*5))*0.7;
    // náhodný náhled – blíže ke svíčce teplejší odlesk
    const distCandle=Math.hypot(dx-candleX,dy-candleY);
    if(distCandle<W*0.25){
      ctx.fillStyle=`rgba(255,200,120,${da*1.2})`;
    } else if(dx>W*0.5 && dy<H*0.5){
      ctx.fillStyle=`rgba(140,180,230,${da*0.9})`;
    } else {
      ctx.fillStyle=`rgba(220,200,230,${da*0.8})`;
    }
    ctx.beginPath(); ctx.arc(dx,dy,sz,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ─── Koupelna ────────────────────────────────────────────────────────────────
function drawKoupelna(W,H,t){
  const ft=t*0.001;
  // ── Podlaha – dlaždice ──
  ctx.fillStyle='#18161e'; ctx.fillRect(0,0,W,H);
  const flG=ctx.createLinearGradient(0,H*0.45,0,H);
  flG.addColorStop(0,'#242030'); flG.addColorStop(1,'#1a1624');
  ctx.fillStyle=flG; ctx.fillRect(0,H*0.45,W,H*0.55);
  // Dlaždice na podlaze
  for(let tx=0;tx<W;tx+=32) for(let ty=H*0.45;ty<H;ty+=32){
    ctx.strokeStyle='rgba(80,70,100,0.15)'; ctx.lineWidth=0.5;
    ctx.strokeRect(tx,ty,32,32);
  }
  // ── Stěna – bílé obklady ──
  ctx.fillStyle='#201c28'; ctx.fillRect(0,0,W,H*0.45);
  for(let tx=0;tx<W;tx+=28) for(let ty=0;ty<H*0.45;ty+=20){
    const off=(Math.floor(ty/20)%2)*14;
    ctx.strokeStyle='rgba(100,95,120,0.12)'; ctx.lineWidth=0.5;
    ctx.strokeRect(tx+off,ty,28,20);
  }

  // ── Sprchový kout (vlevo) ──
  const spx=W*0.04, spy=H*0.25;
  ctx.fillStyle='rgba(60,70,90,0.2)'; ctx.fillRect(spx,spy,W*0.20,H*0.55);
  ctx.strokeStyle='rgba(100,110,130,0.3)'; ctx.lineWidth=1.5;
  ctx.strokeRect(spx,spy,W*0.20,H*0.55);
  // Skleněná stěna sprchy
  ctx.fillStyle='rgba(150,180,220,0.08)'; ctx.fillRect(spx+W*0.19,spy,W*0.02,H*0.55);
  // Sprchová hlavice
  ctx.fillStyle='rgba(180,180,190,0.5)'; ctx.fillRect(spx+W*0.09,spy+H*0.02,W*0.03,H*0.02);
  ctx.fillStyle='rgba(160,160,170,0.4)'; ctx.fillRect(spx+W*0.095,spy+H*0.04,W*0.02,H*0.04);
  // Kapky (animované)
  for(let d=0;d<4;d++){
    const dy2=((ft*40+d*25)%40)+spy+H*0.08;
    const dx2=spx+W*0.07+d*W*0.03;
    ctx.fillStyle='rgba(150,180,220,0.2)';
    ctx.fillRect(dx2,dy2,1.5,4);
  }
  // Odtok
  ctx.fillStyle='rgba(80,80,90,0.4)'; ctx.beginPath();
  ctx.arc(spx+W*0.10,spy+H*0.48,5,0,Math.PI*2); ctx.fill();

  // ── Umyvadlo (střed) ──
  const ux=W*0.32, uy=H*0.30;
  // Umyvadlo – mísa
  ctx.fillStyle='rgba(200,200,210,0.3)';
  ctx.beginPath(); ctx.ellipse(ux+W*0.08,uy+H*0.10,W*0.07,H*0.06,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(180,180,190,0.4)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.ellipse(ux+W*0.08,uy+H*0.10,W*0.07,H*0.06,0,0,Math.PI*2); ctx.stroke();
  // Vnitřek
  ctx.fillStyle='rgba(40,50,60,0.4)';
  ctx.beginPath(); ctx.ellipse(ux+W*0.08,uy+H*0.10,W*0.05,H*0.04,0,0,Math.PI*2); ctx.fill();
  // Baterie
  ctx.fillStyle='rgba(180,180,190,0.5)'; ctx.fillRect(ux+W*0.07,uy,W*0.02,H*0.06);
  ctx.fillStyle='rgba(200,200,210,0.4)';
  ctx.beginPath(); ctx.arc(ux+W*0.08,uy,4,0,Math.PI*2); ctx.fill();
  // Voda teče (pokud použito)
  if(gs.story.sink_used){
    ctx.fillStyle='rgba(100,150,220,0.15)';
    ctx.fillRect(ux+W*0.075,uy+H*0.05,W*0.01,H*0.05);
  }
  // Skříňka pod umyvadlem (šuplík se želízky)
  const sdx=ux, sdy=uy+H*0.18;
  ctx.fillStyle='#2a2030'; rrect(sdx,sdy,W*0.16,H*0.14,2); ctx.fill();
  ctx.strokeStyle='rgba(100,80,120,0.3)'; ctx.lineWidth=1; rrect(sdx,sdy,W*0.16,H*0.14,2); ctx.stroke();
  // Úchytka šuplíku
  if(!gs.story.koupelna_drawer_opened){
    ctx.fillStyle='rgba(200,180,140,0.4)'; ctx.fillRect(sdx+W*0.06,sdy+H*0.05,W*0.04,H*0.02);
  } else {
    // Otevřený šuplík
    ctx.fillStyle='#1a1520'; rrect(sdx+W*0.02,sdy+H*0.02,W*0.12,H*0.10,1); ctx.fill();
    ctx.fillStyle='rgba(100,80,120,0.15)'; ctx.font='8px monospace'; ctx.textAlign='center';
    ctx.fillText('prázdný',sdx+W*0.08,sdy+H*0.08); ctx.textAlign='left';
  }

  // ── Zrcadlo nad umyvadlem ──
  const mx=ux-W*0.01, my=H*0.04;
  ctx.fillStyle='rgba(140,160,200,0.15)'; rrect(mx,my,W*0.18,H*0.22,3); ctx.fill();
  ctx.strokeStyle='rgba(180,180,190,0.35)'; ctx.lineWidth=2; rrect(mx,my,W*0.18,H*0.22,3); ctx.stroke();
  // Odraz – hráčova silueta
  ctx.fillStyle='rgba(200,210,230,0.08)';
  ctx.beginPath(); ctx.arc(mx+W*0.09,my+H*0.10,8,0,Math.PI*2); ctx.fill();
  ctx.fillRect(mx+W*0.08,my+H*0.13,W*0.02,H*0.06);
  // Lesk zrcadla
  ctx.fillStyle='rgba(255,255,255,0.04)';
  ctx.beginPath(); ctx.moveTo(mx+W*0.02,my); ctx.lineTo(mx+W*0.08,my);
  ctx.lineTo(mx+W*0.02,my+H*0.12); ctx.closePath(); ctx.fill();

  // ── Toaleta (vpravo) ──
  const tox=W*0.62, toy=H*0.50;
  // Nádržka
  ctx.fillStyle='rgba(200,200,210,0.25)'; rrect(tox,toy-H*0.08,W*0.08,H*0.08,2); ctx.fill();
  ctx.strokeStyle='rgba(180,180,190,0.3)'; ctx.lineWidth=1; rrect(tox,toy-H*0.08,W*0.08,H*0.08,2); ctx.stroke();
  // Mísa
  ctx.fillStyle='rgba(210,210,220,0.25)';
  ctx.beginPath(); ctx.ellipse(tox+W*0.04,toy+H*0.08,W*0.05,H*0.08,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(180,180,190,0.3)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(tox+W*0.04,toy+H*0.08,W*0.05,H*0.08,0,0,Math.PI*2); ctx.stroke();
  // Sedátko
  ctx.strokeStyle='rgba(200,200,210,0.2)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.ellipse(tox+W*0.04,toy+H*0.06,W*0.04,H*0.06,0,0,Math.PI*2); ctx.stroke();
  // Splachovátko
  ctx.fillStyle='rgba(180,180,190,0.4)'; ctx.beginPath();
  ctx.arc(tox+W*0.04,toy-H*0.04,3,0,Math.PI*2); ctx.fill();

  // ── Radiátor na ručníky (vpravo nahoře) ──
  const rdx=W*0.78, rdy=H*0.20;
  for(let r=0;r<5;r++){
    ctx.fillStyle='rgba(160,160,170,0.25)';
    ctx.fillRect(rdx,rdy+r*H*0.06,W*0.14,H*0.03);
    ctx.strokeStyle='rgba(140,140,150,0.2)'; ctx.lineWidth=0.5;
    ctx.strokeRect(rdx,rdy+r*H*0.06,W*0.14,H*0.03);
  }
  // Svislé trubky
  ctx.fillStyle='rgba(160,160,170,0.3)'; ctx.fillRect(rdx,rdy,W*0.01,H*0.27);
  ctx.fillRect(rdx+W*0.13,rdy,W*0.01,H*0.27);
  // Ručník
  ctx.fillStyle='rgba(200,120,80,0.25)'; ctx.fillRect(rdx+W*0.02,rdy+H*0.01,W*0.10,H*0.04);
  ctx.fillStyle='rgba(200,120,80,0.15)'; ctx.fillRect(rdx+W*0.03,rdy+H*0.07,W*0.08,H*0.03);

  // ── Koupelnový koberec ──
  ctx.fillStyle='rgba(80,60,100,0.15)';
  rrect(ux-W*0.02,uy+H*0.34,W*0.20,H*0.08,3); ctx.fill();

  // ── Malé okénko (matné sklo) ──
  const wox=W*0.80, woy=H*0.04;
  ctx.fillStyle='rgba(60,80,100,0.2)'; rrect(wox,woy,W*0.10,H*0.10,2); ctx.fill();
  ctx.strokeStyle='rgba(120,120,130,0.3)'; ctx.lineWidth=1.5; rrect(wox,woy,W*0.10,H*0.10,2); ctx.stroke();

  // ── Háčky na zdi ──
  for(let h=0;h<3;h++){
    ctx.fillStyle='rgba(160,160,170,0.3)'; ctx.beginPath();
    ctx.arc(W*0.58+h*W*0.04,H*0.28,2.5,0,Math.PI*2); ctx.fill();
  }

  // ── Nápis ──
  ctx.fillStyle='rgba(100,90,120,0.20)'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
  ctx.fillText('KOUPELNA', W*0.5, H*0.44);
  ctx.textAlign='left';
  // ── Východ ──
  ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.font='10px monospace'; ctx.textAlign='center';
  ctx.fillText('↓ ZPĚT DO VILY', W*0.5, H*0.97);
  ctx.textAlign='left';

  // ── Kapající voda z baterie – víc kapek, výraznější ──
  ctx.save();
  const dripX=W*0.40, dripStartY=H*0.36;
  for(let d=0;d<10;d++){
    const dPhase=((ft*0.8+d*0.17)%1);
    const dY=dripStartY+dPhase*H*0.32;
    const dA=(1-dPhase*0.6)*0.80;
    // kapka
    const dG=ctx.createLinearGradient(dripX+d*3,dY-4,dripX+d*3,dY+4);
    dG.addColorStop(0,`rgba(180,210,255,${dA*0.5})`); dG.addColorStop(1,`rgba(100,150,220,${dA})`);
    ctx.fillStyle=dG;
    ctx.beginPath(); ctx.ellipse(dripX+(d%3-1)*4,dY,1.6,4,0,0,Math.PI*2); ctx.fill();
    // lesk
    ctx.fillStyle=`rgba(255,255,255,${dA*0.6})`;
    ctx.beginPath(); ctx.arc(dripX+(d%3-1)*4-0.5,dY-1.5,0.5,0,Math.PI*2); ctx.fill();
    // splash na podlaze
    if(dPhase>0.88){
      const spA=(dPhase-0.88)/0.12;
      ctx.strokeStyle=`rgba(150,180,220,${(1-spA)*0.5})`;
      ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.ellipse(dripX+(d%3-1)*4,dripStartY+H*0.32,2+spA*10,0.8+spA*2,0,0,Math.PI*2); ctx.stroke();
    }
  }
  ctx.restore();

  // ── Kapající voda ze sprchy – víc kapek ──
  ctx.save();
  const spxC=W*0.04+W*0.10;
  for(let d=0;d<14;d++){
    const sdPh=((ft*1.2+d*0.09)%1);
    const sdy=H*0.29+sdPh*H*0.50;
    const sdA=(1-sdPh*0.5)*0.55;
    ctx.fillStyle=`rgba(160,195,235,${sdA})`;
    ctx.fillRect(spxC-W*0.03+(d%5)*W*0.015,sdy,1.2,5);
  }
  ctx.restore();

  // ── Opar/pára – husté, viditelné ──
  ctx.save();
  for(let i=0;i<22;i++){
    const steamLife=((t*0.00010+i*0.13)%1);
    const smX=W*0.03+Math.abs(Math.sin(i*37.7+t*0.0002))*W*0.35+Math.sin(t*0.0005+i)*W*0.02;
    const smY=H*0.38-steamLife*H*0.36;
    const smR=W*0.05+steamLife*W*0.08;
    const smA=0.16*(1-steamLife*0.8);
    // měkký pár – dva bloby pro objem
    const sG=ctx.createRadialGradient(smX,smY,0,smX,smY,smR);
    sG.addColorStop(0,`rgba(220,235,250,${smA})`); sG.addColorStop(0.6,`rgba(180,200,220,${smA*0.45})`); sG.addColorStop(1,'transparent');
    ctx.fillStyle=sG;
    ctx.beginPath(); ctx.arc(smX,smY,smR,0,Math.PI*2); ctx.fill();
  }
  // obecný nádech páry u stropu
  const topSteam=ctx.createLinearGradient(0,0,0,H*0.18);
  topSteam.addColorStop(0,'rgba(200,220,235,0.18)'); topSteam.addColorStop(1,'transparent');
  ctx.fillStyle=topSteam; ctx.fillRect(0,0,W,H*0.18);
  ctx.restore();

  // ── Mokré odlesky na dlaždicích – mnohem viditelnější ──
  ctx.save();
  [[W*0.12,H*0.70],[W*0.28,H*0.62],[W*0.45,H*0.78],[W*0.58,H*0.66],[W*0.72,H*0.74],[W*0.88,H*0.68]].forEach(([rx,ry],i)=>{
    const ryA=ry+Math.sin(i*2.1+ft*0.3)*H*0.02;
    const rG=ctx.createRadialGradient(rx,ryA,0,rx,ryA,W*0.06);
    rG.addColorStop(0,'rgba(180,210,255,0.25)'); rG.addColorStop(0.5,'rgba(140,170,220,0.12)'); rG.addColorStop(1,'transparent');
    ctx.fillStyle=rG; ctx.beginPath(); ctx.ellipse(rx,ryA,W*0.07,H*0.022,0,0,Math.PI*2); ctx.fill();
    // odlesk – bílý pruh
    ctx.fillStyle='rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(rx-W*0.01,ryA-H*0.004,W*0.02,H*0.004,0,0,Math.PI*2); ctx.fill();
  });
  // obecná vrstva vlhkosti na podlaze
  const wetG=ctx.createLinearGradient(0,H*0.55,0,H);
  wetG.addColorStop(0,'transparent'); wetG.addColorStop(1,'rgba(120,160,210,0.10)');
  ctx.fillStyle=wetG; ctx.fillRect(0,H*0.55,W,H*0.45);
  ctx.restore();

  // ── Zamlžené zrcadlo – efekt orosení ──
  ctx.save();
  const mx2=W*0.32-W*0.01, my2=H*0.04;
  ctx.fillStyle='rgba(220,230,245,0.22)';
  ctx.fillRect(mx2,my2,W*0.18,H*0.22);
  // stíraní prstem – čisté pruhy
  ctx.strokeStyle='rgba(100,120,160,0.20)'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(mx2+W*0.03,my2+H*0.06); ctx.quadraticCurveTo(mx2+W*0.09,my2+H*0.10,mx2+W*0.15,my2+H*0.08); ctx.stroke();
  ctx.restore();

  // ── Kapající kohoutek ──
  ctx.save();
  const faucX=W*0.48, faucY=H*0.32;
  const dripPhase = ((t*0.0012)%1);
  if(dripPhase < 0.7){
    // Growing drop
    const dropSize = dripPhase/0.7 * 4;
    ctx.fillStyle=`rgba(140,180,220,${0.5+dripPhase*0.3})`;
    ctx.beginPath(); ctx.arc(faucX, faucY+dropSize*2, dropSize, 0, Math.PI*2); ctx.fill();
    // Water highlight
    ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(faucX-1, faucY+dropSize*2-1, dropSize*0.3, 0, Math.PI*2); ctx.fill();
  } else {
    // Falling drop
    const fallProg = (dripPhase-0.7)/0.3;
    const fallY = faucY + 8 + fallProg * H*0.15;
    const fallAlpha = (1-fallProg)*0.6;
    ctx.fillStyle=`rgba(140,180,220,${fallAlpha})`;
    ctx.beginPath(); ctx.ellipse(faucX, fallY, 2, 3+fallProg*2, 0, 0, Math.PI*2); ctx.fill();
    // Splash at bottom
    if(fallProg > 0.8){
      const splProg = (fallProg-0.8)/0.2;
      ctx.strokeStyle=`rgba(140,180,220,${(1-splProg)*0.4})`;
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.ellipse(faucX, faucY+H*0.15+8, 3+splProg*8, 1+splProg*2, 0, 0, Math.PI*2); ctx.stroke();
    }
  }
  ctx.restore();
}

// ─── Sklep ────────────────────────────────────────────────────────────────────
function drawSklep(W,H,t){
  const ft=t*0.0008;
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);

  // Cihlová zeď
  const wG=ctx.createLinearGradient(0,0,0,H*0.57);
  wG.addColorStop(0,'#1a1208'); wG.addColorStop(0.65,'#100c06'); wG.addColorStop(1,'#080604');
  ctx.fillStyle=wG; ctx.fillRect(0,0,W,H*0.57);
  const brickH=22, brickW=62;
  for(let row=0;row*brickH<H*0.56;row++){
    const off=(row%2)*brickW/2;
    for(let col=-1;col*brickW<W+brickW;col++){
      const bx=col*brickW+off, by=row*brickH;
      ctx.fillStyle=`hsl(15,${22+Math.sin(bx*0.08+by*0.06)*7}%,${6+Math.sin(bx*0.04+by*0.05)*2.5}%)`;
      ctx.fillRect(bx+1,by+1,brickW-2,brickH-2);
      ctx.strokeStyle='rgba(0,0,0,0.75)'; ctx.lineWidth=1; ctx.strokeRect(bx+1,by+1,brickW-2,brickH-2);
    }
  }
  // trhliny
  ctx.strokeStyle='rgba(0,0,0,0.65)'; ctx.lineWidth=1.5; ctx.lineCap='round';
  [[W*0.15,H*0.05,W*0.23,H*0.19],[W*0.63,H*0.02,W*0.71,H*0.15],[W*0.42,H*0.10,W*0.38,H*0.23]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2+W*0.018,y2+H*0.038); ctx.stroke();
  });
  // vlhkostní skvrny
  const moistCoords=[[W*0.08,H*0.06,W*0.10,H*0.14],[W*0.65,H*0.03,W*0.12,H*0.18],[W*0.42,H*0.18,W*0.07,H*0.10]];
  const moistCols=['rgba(0,20,5,0.6)','rgba(10,15,0,0.5)','rgba(0,15,10,0.4)'];
  moistCoords.forEach(([sx,sy,sw,sh],i)=>{ ctx.fillStyle=moistCols[i]; ctx.beginPath(); ctx.ellipse(sx+sw/2,sy+sh/2,sw/2,sh/2,0.2,0,Math.PI*2); ctx.fill(); });

  // Podlaha
  ctx.fillStyle='#0c0a08'; ctx.fillRect(0,H*0.56,W,H*0.44);
  ctx.strokeStyle='rgba(30,25,20,0.45)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=80) ctx.strokeRect(x,H*0.56,80,H*0.44);
  for(let y=H*0.56;y<H;y+=80){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Pentagram – hořící, s Kubátovou uvnitř
  const pcx=W*0.50,pcy=H*0.72,pr=Math.min(W*0.20,H*0.24);

  // Záře pod pentagramem
  const pglow=ctx.createRadialGradient(pcx,pcy,0,pcx,pcy,pr*1.4);
  pglow.addColorStop(0,`rgba(255,60,0,${0.22+0.10*Math.sin(ft*1.5)})`);
  pglow.addColorStop(0.5,`rgba(180,0,0,${0.10+0.05*Math.sin(ft)})`);
  pglow.addColorStop(1,'transparent');
  ctx.fillStyle=pglow; ctx.fillRect(pcx-pr*1.6,pcy-pr*1.6,pr*3.2,pr*3.2);

  // Vnější kruh
  ctx.strokeStyle=`rgba(220,40,0,${0.55+0.2*Math.sin(ft*2)})`; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(pcx,pcy,pr,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle='rgba(255,120,0,0.25)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(pcx,pcy,pr*1.04,0,Math.PI*2); ctx.stroke();

  // Vnitřní kruh
  ctx.strokeStyle='rgba(180,0,0,0.35)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(pcx,pcy,pr*0.42,0,Math.PI*2); ctx.stroke();

  // Hvězda pentagramu
  ctx.strokeStyle=`rgba(255,${40+Math.floor(30*Math.abs(Math.sin(ft)))},0,0.70)`;
  ctx.lineWidth=2.5;
  const ptPts=[];
  for(let i=0;i<5;i++){ const a=(i*4/5)*Math.PI*2-Math.PI/2; ptPts.push([pcx+Math.cos(a)*pr*0.94,pcy+Math.sin(a)*pr*0.94]); }
  ctx.beginPath(); ptPts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.closePath();
  ctx.fillStyle='rgba(140,0,0,0.12)'; ctx.fill(); ctx.stroke();

  // Plameny na vrcholech hvězdy (5 hořících bodů)
  ptPts.forEach(([fx2,fy2],pi)=>{
    for(let fi2=0;fi2<5;fi2++){
      const flh=pr*(0.10+0.08*Math.abs(Math.sin(ft*1.8+pi*1.3+fi2*0.7)));
      const flG=ctx.createLinearGradient(fx2,fy2,fx2,fy2-flh);
      flG.addColorStop(0,'rgba(255,50,0,0.85)'); flG.addColorStop(0.4,'rgba(255,140,0,0.60)'); flG.addColorStop(1,'rgba(255,220,0,0)');
      ctx.fillStyle=flG; ctx.beginPath(); ctx.ellipse(fx2+(fi2-2)*4,fy2-flh/2,4,flh/2,0,0,Math.PI*2); ctx.fill();
    }
    // Svíčka na každém cípu pentagramu
    const cH=pr*0.10, cW=pr*0.025;
    // záře svíčky
    const cGl=ctx.createRadialGradient(fx2,fy2-cH,0,fx2,fy2-cH,pr*0.12);
    cGl.addColorStop(0,`rgba(255,200,60,${0.35+0.12*Math.sin(ft*1.4+pi)})`); cGl.addColorStop(1,'transparent');
    ctx.fillStyle=cGl; ctx.beginPath(); ctx.arc(fx2,fy2-cH,pr*0.12,0,Math.PI*2); ctx.fill();
    // tělo svíčky
    ctx.fillStyle='#e8e0c8'; ctx.fillRect(fx2-cW,fy2-cH,cW*2,cH);
    ctx.fillStyle='rgba(200,190,150,0.6)'; ctx.fillRect(fx2-cW,fy2-cH,cW*2,cH*0.15);
    // knot
    ctx.strokeStyle='#2a1a08'; ctx.lineWidth=1; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(fx2,fy2-cH); ctx.lineTo(fx2,fy2-cH-pr*0.025); ctx.stroke();
    // plamen
    const fA2=0.7+0.25*Math.abs(Math.sin(ft*2.2+pi));
    const fpG=ctx.createRadialGradient(fx2,fy2-cH-pr*0.03,0,fx2,fy2-cH-pr*0.03,pr*0.055);
    fpG.addColorStop(0,`rgba(255,240,180,${fA2})`); fpG.addColorStop(0.5,`rgba(255,120,0,${fA2*0.7})`); fpG.addColorStop(1,'transparent');
    ctx.fillStyle=fpG; ctx.beginPath(); ctx.ellipse(fx2,fy2-cH-pr*0.04,pr*0.018,pr*0.05,Math.sin(ft*1.8+pi)*0.2,0,Math.PI*2); ctx.fill();
  });

  // Řetězy ke Kubátové (4 řetězy ze stran scény k středu)
  const chainAnchors=[[W*0.05,H*0.30],[W*0.95,H*0.30],[W*0.05,H*0.75],[W*0.95,H*0.75]];
  chainAnchors.forEach(([ax,ay],ci)=>{
    const swing2=Math.sin(ft*0.6+ci)*0.05, links2=Math.floor(Math.hypot(ax-pcx,ay-pcy)/14);
    for(let li=0;li<links2;li++){
      const lp=li/links2;
      const lx2=ax+(pcx-ax)*lp+Math.sin(lp*Math.PI+swing2)*15*(lp*(1-lp));
      const ly2=ay+(pcy-ay)*lp+Math.sin(lp*Math.PI*1.5+swing2*2)*8*(lp*(1-lp));
      ctx.strokeStyle=`rgba(80,65,45,${0.65+0.12*Math.sin(li*0.4)})`; ctx.lineWidth=3;
      if(li%2===0){ ctx.beginPath(); ctx.ellipse(lx2,ly2,5,7,swing2,0,Math.PI*2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.ellipse(lx2,ly2,7,5,0,0,Math.PI*2); ctx.stroke(); }
    }
    // hák u stěny
    ctx.strokeStyle='rgba(110,90,60,0.75)'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(ax,ay,8,0,Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ax,ay-18); ctx.stroke();
  });

  // Řetězy ze stropu
  [W*0.10,W*0.27,W*0.50,W*0.73,W*0.90].forEach((cx,ci)=>{
    const swing=Math.sin(ft+ci*0.7)*0.06, cLen=H*(0.15+ci%2*0.05), links=Math.floor(cLen/14);
    for(let li=0;li<links;li++){
      const lp=li/links, lx=cx+Math.sin(swing)*cLen*lp, ly=li*14;
      ctx.strokeStyle=`rgba(75,65,55,${0.55+0.1*Math.sin(li*0.5)})`; ctx.lineWidth=2.5;
      if(li%2===0){ ctx.beginPath(); ctx.ellipse(lx,ly+7,5,7,swing,0,Math.PI*2); ctx.stroke(); }
      else { ctx.beginPath(); ctx.ellipse(lx,ly+7,7,5,0,0,Math.PI*2); ctx.stroke(); }
    }
    // hák
    const hookX=cx+Math.sin(swing)*cLen, hookY=cLen;
    ctx.strokeStyle='rgba(95,85,65,0.65)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(hookX,hookY,5,0,Math.PI); ctx.stroke();
  });

  // Krvavé kapky
  [[W*0.20,H*0.10],[W*0.65,H*0.05],[W*0.88,H*0.08]].forEach(([dx,dy])=>{
    const dLen=H*(0.07+0.05*Math.abs(Math.sin(ft*0.3+dx)));
    ctx.fillStyle='rgba(140,0,0,0.7)'; ctx.beginPath(); ctx.arc(dx,dy,4,0,Math.PI*2); ctx.fill();
    const dG=ctx.createLinearGradient(dx,dy,dx,dy+dLen);
    dG.addColorStop(0,'rgba(140,0,0,0.7)'); dG.addColorStop(1,'rgba(100,0,0,0)');
    ctx.fillStyle=dG; ctx.fillRect(dx-2,dy,4,dLen);
    ctx.fillStyle='rgba(120,0,0,0.8)'; ctx.beginPath(); ctx.arc(dx,dy+dLen,3,0,Math.PI*2); ctx.fill();
  });

  // Vyryté texty
  ctx.font=`bold ${Math.floor(W*0.013)}px JetBrains Mono,monospace`; ctx.textAlign='center'; ctx.textBaseline='middle';
  [[W*0.19,H*0.28,'POMOC','rgba(120,0,0,0.42)',-0.06],[W*0.79,H*0.22,'VYJDI','rgba(100,0,0,0.32)',0.05],[W*0.50,H*0.38,'ON PŘIJDE','rgba(140,0,0,0.38)',0]].forEach(([tx,ty,txt,col,rot])=>{
    ctx.save(); ctx.translate(tx,ty); ctx.rotate(rot);
    ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=3; ctx.strokeText(txt,0,0);
    ctx.fillStyle=col; ctx.fillText(txt,0,0); ctx.restore();
  });

  // Mlha na podlaze
  for(let mi=0;mi<5;mi++){
    const mx=((Math.sin(mi*1.7+ft*0.4)*0.5+0.5))*W, my=H*(0.70+mi*0.06);
    const mr=W*(0.14+0.05*Math.abs(Math.sin(mi*2.3+ft*0.5)));
    const mG=ctx.createRadialGradient(mx,my,0,mx,my,mr);
    mG.addColorStop(0,'rgba(20,30,20,0.17)'); mG.addColorStop(1,'transparent');
    ctx.fillStyle=mG; ctx.fillRect(mx-mr,my-mr*0.4,mr*2,mr*0.8);
  }

  // Červené oči
  const eyT=ft*0.7;
  [[W*0.07,H*0.44],[W*0.83,H*0.42],[W*0.47,H*0.50]].forEach(([ex,ey],ei)=>{
    if(Math.sin(eyT+ei*2.1)<=0.85){
      const ea=0.5+0.4*Math.abs(Math.sin(eyT*0.3+ei));
      [-8,8].forEach(ox=>{
        const eG=ctx.createRadialGradient(ex+ox,ey,0,ex+ox,ey,7);
        eG.addColorStop(0,`rgba(255,0,0,${ea})`); eG.addColorStop(0.4,`rgba(180,0,0,${ea*0.6})`); eG.addColorStop(1,'transparent');
        ctx.fillStyle=eG; ctx.fillRect(ex+ox-8,ey-8,16,16);
        ctx.fillStyle=`rgba(255,20,20,${ea})`; ctx.beginPath(); ctx.arc(ex+ox,ey,2.5,0,Math.PI*2); ctx.fill();
      });
    }
  });

  // Blikající žárovka
  const bx=W*0.50,byb=H*0.07;
  ctx.strokeStyle='rgba(155,135,75,0.52)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(bx,0); ctx.lineTo(bx,byb-W*0.012); ctx.stroke();
  const fl1=Math.sin(t*0.018)*Math.sin(t*0.047)*Math.sin(t*0.031);
  const flkI=Math.sin(t*0.008)*0.5+0.5;
  const ba=Math.max(0.04,flkI*(0.55+fl1*0.35));
  const blG=ctx.createRadialGradient(bx,byb,0,bx,byb,W*0.32);
  blG.addColorStop(0,`rgba(255,230,150,${ba})`); blG.addColorStop(0.18,`rgba(255,190,60,${ba*0.45})`); blG.addColorStop(0.5,`rgba(200,120,0,${ba*0.12})`); blG.addColorStop(1,'transparent');
  ctx.fillStyle=blG; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=`rgba(255,235,160,${ba})`; ctx.beginPath(); ctx.arc(bx,byb,W*0.013,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,245,190,0.9)'; ctx.beginPath(); ctx.arc(bx,byb,W*0.006,0,Math.PI*2); ctx.fill();

  // Pavučiny
  ctx.strokeStyle='rgba(175,165,145,0.11)'; ctx.lineWidth=0.6;
  [[0,0,Math.PI/2],[W,0,Math.PI],[0,H*0.55,0],[W,H*0.52,-Math.PI/2]].forEach(([wx,wy,sA])=>{
    for(let a=sA;a<sA+Math.PI/2;a+=0.22){
      for(let r=W*0.03;r<W*0.16;r+=W*0.04){ ctx.beginPath(); ctx.arc(wx,wy,r,a,a+0.22); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(wx,wy); ctx.lineTo(wx+Math.cos(a)*W*0.16,wy+Math.sin(a)*W*0.16); ctx.stroke();
    }
  });

  // ─── Gore scéna – Milanovo tělo ───────────────────────────────────────────
  if(gs.story.milan_dead_sklep){
    const gcx=W*0.30, gcy=H*0.62;

    // Velké krevní kaluže (větší než dřív)
    [[gcx,gcy,W*0.28,H*0.16],[gcx+W*0.15,gcy-H*0.08,W*0.14,H*0.09],
     [gcx-W*0.12,gcy+H*0.07,W*0.13,H*0.08],[W*0.58,H*0.70,W*0.10,H*0.07],
     [gcx-W*0.02,gcy-H*0.15,W*0.09,H*0.06]].forEach(([bx,by,bw,bh])=>{
      const bg=ctx.createRadialGradient(bx,by,0,bx,by,Math.max(bw,bh));
      bg.addColorStop(0,'rgba(150,0,0,0.98)'); bg.addColorStop(0.5,'rgba(100,0,0,0.82)'); bg.addColorStop(1,'rgba(50,0,0,0)');
      ctx.fillStyle=bg; ctx.beginPath(); ctx.ellipse(bx,by,bw,bh,0,0,Math.PI*2); ctx.fill();
    });

    // Torzo (hlavní část) – větší a viditelnější
    ctx.save(); ctx.translate(gcx,gcy); ctx.rotate(0.25);
    // stín pod torzo
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(6,6,W*0.055,H*0.065,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#0a0505'; ctx.beginPath(); ctx.ellipse(0,0,W*0.055,H*0.065,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#06b6d4'; ctx.globalAlpha=0.35; ctx.beginPath(); ctx.ellipse(0,0,W*0.052,H*0.062,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    // žebra
    ctx.strokeStyle='rgba(160,0,0,0.60)'; ctx.lineWidth=2; ctx.lineCap='round';
    for(let ri=0;ri<4;ri++){
      const ry=(ri-1.5)*H*0.015;
      ctx.beginPath(); ctx.moveTo(-W*0.032,ry); ctx.lineTo(W*0.032,ry); ctx.stroke();
    }
    ctx.restore();

    // Hlava – odtržená, před Kubátovou (pcx=W*0.50, pcy=H*0.72 → před ní)
    ctx.save(); ctx.translate(W*0.50, H*0.62); ctx.rotate(0.9);
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(5,5,W*0.033,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#c8a878'; ctx.beginPath(); ctx.arc(0,0,W*0.033,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#2a1a0a'; ctx.beginPath(); ctx.ellipse(0,-W*0.018,W*0.028,W*0.014,0,0,Math.PI*2); ctx.fill();
    drawDazedFace(0, 0, 1.0);
    // krev z krku
    const hg=ctx.createRadialGradient(0,W*0.025,0,0,W*0.025,W*0.038);
    hg.addColorStop(0,'rgba(180,0,0,0.98)'); hg.addColorStop(1,'rgba(100,0,0,0)');
    ctx.fillStyle=hg; ctx.beginPath(); ctx.ellipse(0,W*0.025,W*0.025,W*0.016,0,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // Pravá ruka (nahoře vpravo) – výraznější
    ctx.save(); ctx.translate(gcx+W*0.17,gcy-H*0.10); ctx.rotate(1.0);
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(4,4,W*0.018,H*0.048,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#0a0505'; ctx.beginPath(); ctx.ellipse(0,0,W*0.018,H*0.048,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#06b6d4'; ctx.globalAlpha=0.4; ctx.beginPath(); ctx.ellipse(0,0,W*0.016,H*0.046,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    ctx.fillStyle='#c8a878'; ctx.beginPath(); ctx.ellipse(0,H*0.042,W*0.016,H*0.015,0,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // Levá ruka (vlevo nahoře) – výraznější
    ctx.save(); ctx.translate(gcx-W*0.08,gcy-H*0.14); ctx.rotate(-1.7);
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(4,4,W*0.016,H*0.044,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#0a0505'; ctx.beginPath(); ctx.ellipse(0,0,W*0.016,H*0.044,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#06b6d4'; ctx.globalAlpha=0.4; ctx.beginPath(); ctx.ellipse(0,0,W*0.014,H*0.042,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    ctx.fillStyle='#c8a878'; ctx.beginPath(); ctx.ellipse(0,-H*0.040,W*0.015,H*0.013,0,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // Pravá noha (vpravo dole) – výraznější
    ctx.save(); ctx.translate(gcx+W*0.10,gcy+H*0.13); ctx.rotate(2.0);
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(4,4,W*0.024,H*0.060,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#0e0404'; ctx.beginPath(); ctx.ellipse(0,0,W*0.024,H*0.060,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#06b6d4'; ctx.globalAlpha=0.35; ctx.beginPath(); ctx.ellipse(0,0,W*0.022,H*0.058,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    // topánka
    ctx.fillStyle='#1a0808'; ctx.beginPath(); ctx.ellipse(0,H*0.055,W*0.026,H*0.015,0.3,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // Levá noha (vlevo dole) – výraznější
    ctx.save(); ctx.translate(gcx-W*0.14,gcy+H*0.06); ctx.rotate(-0.6);
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(4,4,W*0.024,H*0.058,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#0e0404'; ctx.beginPath(); ctx.ellipse(0,0,W*0.024,H*0.058,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#06b6d4'; ctx.globalAlpha=0.35; ctx.beginPath(); ctx.ellipse(0,0,W*0.022,H*0.056,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    ctx.fillStyle='#1a0808'; ctx.beginPath(); ctx.ellipse(0,-H*0.053,W*0.026,H*0.015,-0.3,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // Stříkance krve po podlaze
    for(let i=0;i<26;i++){
      const sx=gcx+(Math.sin(i*1.6)*0.5)*W*0.42, sy=gcy+(Math.cos(i*2.1)*0.5)*H*0.28;
      ctx.fillStyle=`rgba(${120+Math.floor(Math.sin(i)*40)},0,0,${0.72+Math.sin(i*3)*0.22})`;
      ctx.beginPath(); ctx.ellipse(sx,sy,W*0.009*(0.5+Math.abs(Math.sin(i))),H*0.004,i*0.38,0,Math.PI*2); ctx.fill();
    }

    // Stopy krve na zdi (vlevo)
    [[W*0.07,H*0.30],[W*0.13,H*0.24],[W*0.04,H*0.40],[W*0.10,H*0.16],[W*0.17,H*0.33]].forEach(([wx,wy],i)=>{
      const wg=ctx.createLinearGradient(wx,wy,wx,wy+H*0.16);
      wg.addColorStop(0,'rgba(160,0,0,0.82)'); wg.addColorStop(1,'rgba(80,0,0,0)');
      ctx.fillStyle=wg; ctx.fillRect(wx-3,wy,5+i,H*0.16);
      ctx.fillStyle='rgba(160,0,0,0.88)'; ctx.beginPath(); ctx.arc(wx,wy,6,0,Math.PI*2); ctx.fill();
    });

    // Nápis "MRÁZ" vyryté do podlahy
    ctx.save();
    ctx.font=`bold ${Math.floor(W*0.026)}px JetBrains Mono,monospace`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.translate(gcx+W*0.04,gcy+H*0.22); ctx.rotate(-0.06);
    ctx.strokeStyle='rgba(0,0,0,0.90)'; ctx.lineWidth=6; ctx.strokeText('MRÁZ',0,0);
    ctx.fillStyle='rgba(180,0,0,0.62)'; ctx.fillText('MRÁZ',0,0);
    ctx.restore();
  }

  // ── Kapající voda ze stropu – výraznější, víc kapek ──
  ctx.save();
  for(let i=0;i<18;i++){
    const dropX=W*0.04+Math.abs(Math.sin(i*73.7))*W*0.92;
    const dropPhase=((t*0.0009+i*0.13)%1);
    const dropY=dropPhase*H*0.56;
    const dropA=(1-dropPhase*0.3)*0.85;
    // vizuální protáhlá kapka
    const dG=ctx.createLinearGradient(dropX,dropY-5,dropX,dropY+3);
    dG.addColorStop(0,`rgba(160,180,200,${dropA*0.4})`); dG.addColorStop(1,`rgba(80,100,130,${dropA})`);
    ctx.fillStyle=dG;
    ctx.beginPath(); ctx.ellipse(dropX,dropY,1.6,4.5,0,0,Math.PI*2); ctx.fill();
    // lesk
    ctx.fillStyle=`rgba(255,255,255,${dropA*0.5})`;
    ctx.beginPath(); ctx.arc(dropX-0.6,dropY-2,0.6,0,Math.PI*2); ctx.fill();
    // Splash na podlaze – výraznější
    if(dropPhase>0.86){
      const splA=(dropPhase-0.86)/0.14;
      ctx.strokeStyle=`rgba(130,150,180,${(1-splA)*0.65})`;
      ctx.lineWidth=1.3;
      ctx.beginPath(); ctx.ellipse(dropX,H*0.56,4+splA*14,1.5+splA*4,0,0,Math.PI*2); ctx.stroke();
      // krůpěje splash
      for(let sp=0;sp<4;sp++){
        const spAng=sp*Math.PI/2+i;
        ctx.fillStyle=`rgba(130,160,190,${(1-splA)*0.55})`;
        ctx.beginPath(); ctx.arc(dropX+Math.cos(spAng)*(4+splA*6),H*0.56-splA*3+Math.sin(spAng)*1.5,0.8,0,Math.PI*2); ctx.fill();
      }
    }
  }
  ctx.restore();

  // ── Stoupající popel/prach z pentagramu – mnohem viditelnější ──
  ctx.save();
  for(let i=0;i<38;i++){
    const ashLife=((t*0.00040+i*0.08)%1);
    const ax=pcx+Math.sin(i*7.3+t*0.0008)*pr*(0.5+ashLife*0.4);
    const ay=pcy-ashLife*H*0.55;
    const ashA=(1-ashLife*0.7)*0.75;
    const ashSz=1.2+Math.sin(i*3.1)*0.8+ashLife*0.6;
    // proměna barvy od červeno-oranžové po šedou (chladne)
    const r=Math.floor(255-ashLife*180);
    const g=Math.floor(110-ashLife*80);
    const b=Math.floor(20+ashLife*30);
    ctx.fillStyle=`rgba(${r},${g},${b},${ashA})`;
    ctx.beginPath(); ctx.arc(ax,ay,ashSz,0,Math.PI*2); ctx.fill();
    // glow kolem žhavých částic
    if(ashLife<0.4){
      const gG=ctx.createRadialGradient(ax,ay,0,ax,ay,ashSz*4);
      gG.addColorStop(0,`rgba(255,120,30,${ashA*0.35})`); gG.addColorStop(1,'transparent');
      ctx.fillStyle=gG;
      ctx.beginPath(); ctx.arc(ax,ay,ashSz*4,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();

  // ── Další jiskry a plamenové částice nad pentagramem ──
  ctx.save();
  for(let i=0;i<22;i++){
    const skLife=((t*0.00065+i*0.11)%1);
    const skAng=i*0.68+t*0.0003;
    const skR=pr*(0.2+skLife*0.8);
    const sx=pcx+Math.cos(skAng)*skR;
    const sy=pcy+Math.sin(skAng)*skR*0.5-skLife*H*0.30;
    const skA=(1-skLife)*0.90;
    ctx.fillStyle=`rgba(255,${180-Math.floor(skLife*120)},30,${skA})`;
    ctx.beginPath(); ctx.arc(sx,sy,1.4+Math.sin(i*2.3)*0.6,0,Math.PI*2); ctx.fill();
    // světelná stopa
    ctx.strokeStyle=`rgba(255,120,20,${skA*0.5})`;
    ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx,sy+4); ctx.stroke();
  }
  ctx.restore();

  // ── Plovoucí runové symboly kolem pentagramu ──
  ctx.save();
  const runeSyms = ['ᛟ','ᚠ','ᛗ','ᛉ','ᚨ','ᛊ','ᚦ','ᛃ'];
  ctx.font='bold 14px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(let ri=0;ri<runeSyms.length;ri++){
    const rAng = ft*0.3 + ri*Math.PI*2/runeSyms.length;
    const rOrbit = pr*1.25 + Math.sin(ft*0.5+ri)*10;
    const rx = pcx + Math.cos(rAng)*rOrbit;
    const ry = pcy + Math.sin(rAng)*rOrbit*0.5;
    const rAlpha = 0.3 + 0.2*Math.sin(ft+ri*1.3);
    // glow behind rune
    const rG=ctx.createRadialGradient(rx,ry,0,rx,ry,14);
    rG.addColorStop(0,`rgba(255,50,0,${rAlpha*0.5})`); rG.addColorStop(1,'transparent');
    ctx.fillStyle=rG; ctx.beginPath(); ctx.arc(rx,ry,14,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgba(255,${80+Math.floor(Math.sin(ft*0.8+ri)*40)},20,${rAlpha})`;
    ctx.fillText(runeSyms[ri],rx,ry);
  }
  ctx.restore();

  // ── Hustá atmosférická mlha pod stropem ──
  ctx.save();
  const topFog=ctx.createLinearGradient(0,0,0,H*0.25);
  topFog.addColorStop(0,'rgba(20,10,5,0.45)'); topFog.addColorStop(1,'transparent');
  ctx.fillStyle=topFog; ctx.fillRect(0,0,W,H*0.25);
  // valící se mlha z rohů
  for(let mi=0;mi<8;mi++){
    const mfX=((Math.sin(mi*1.3+ft*0.15)*0.5+0.5))*W;
    const mfY=H*0.04+Math.abs(Math.sin(mi*2.7+ft*0.2))*H*0.10;
    const mfR=W*(0.12+0.06*Math.abs(Math.sin(mi*1.9+ft*0.25)));
    const mfG=ctx.createRadialGradient(mfX,mfY,0,mfX,mfY,mfR);
    mfG.addColorStop(0,'rgba(40,20,15,0.18)'); mfG.addColorStop(1,'transparent');
    ctx.fillStyle=mfG;
    ctx.beginPath(); ctx.ellipse(mfX,mfY,mfR,mfR*0.45,0,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // Těžká vigneta
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.10,W/2,H/2,Math.max(W,H)*0.84);
  vig.addColorStop(0,'transparent'); vig.addColorStop(0.5,'rgba(0,0,0,0.30)'); vig.addColorStop(1,'rgba(0,0,0,0.90)');
  ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
}

// ─── Voodoo animace ───────────────────────────────────────────────────────────
// Pohled shora na plovoucí hlavu (3D efekt)
function drawFloatHead(hx, hy, sc){
  sc = sc || 1;
  // stín pod hlavou
  ctx.fillStyle='rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(hx+4*sc,hy+5*sc,17*sc,14*sc,0,0,Math.PI*2); ctx.fill();
  // základ hlavy – mírně oválný z perspektivy
  ctx.fillStyle='#c8a878';
  ctx.beginPath(); ctx.ellipse(hx,hy,16*sc,13*sc,0,0,Math.PI*2); ctx.fill();
  // vlasy (viditelné shora – zabírají horní ~60%)
  ctx.fillStyle='#2a1a0a';
  ctx.beginPath(); ctx.ellipse(hx,hy-3*sc,14*sc,9*sc,0,0,Math.PI*2); ctx.fill();
  // ucho levé a pravé (boční výčnělky)
  ctx.fillStyle='#b89060';
  ctx.beginPath(); ctx.ellipse(hx-14*sc,hy+2*sc,4*sc,5*sc,0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx+14*sc,hy+2*sc,4*sc,5*sc,-0.3,0,Math.PI*2); ctx.fill();
  // oči (pohled shora – elipsy)
  ctx.fillStyle='#1e1a2e';
  ctx.beginPath(); ctx.ellipse(hx-5*sc,hy+3*sc,3.5*sc,2.5*sc,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx+5*sc,hy+3*sc,3.5*sc,2.5*sc,0,0,Math.PI*2); ctx.fill();
  // odlesk
  ctx.fillStyle='rgba(255,255,255,0.28)';
  ctx.beginPath(); ctx.ellipse(hx-4*sc,hy-4*sc,6*sc,4*sc,-0.4,0,Math.PI*2); ctx.fill();
  // krev z krku (vlevo od hlavy)
  const bG=ctx.createRadialGradient(hx-16*sc,hy,0,hx-16*sc,hy,12*sc);
  bG.addColorStop(0,'rgba(170,0,0,0.85)'); bG.addColorStop(1,'rgba(90,0,0,0)');
  ctx.fillStyle=bG; ctx.beginPath(); ctx.arc(hx-16*sc,hy,12*sc,0,Math.PI*2); ctx.fill();
}

function drawMilanAt(cx, cy, rot, alpha, dazed){
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  if(rot) ctx.rotate(rot);
  const ag = ctx.createRadialGradient(0,0,0,0,0,55);
  ag.addColorStop(0,'rgba(6,182,212,0.28)'); ag.addColorStop(1,'transparent');
  ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0,0,55,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(0,0,27,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fde8c8'; ctx.beginPath(); ctx.arc(0,-22,20,0,Math.PI*2); ctx.fill();
  if(dazed) drawDazedFace(0,-22,1); else drawPixelFace(0,-22,1);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawVoodooAnim(W, H){
  const t = gs.voodoo_t;
  const vm = gs.vm;
  if(!vm) return;

  const fnX = W*0.50, fnY = H*0.66, fnR = W*0.082;

  // Rudá vigneta
  const vigA = Math.min(0.40, t / 2000);
  const vg = ctx.createRadialGradient(W/2,H/2,H*0.05,W/2,H/2,Math.max(W,H)*0.85);
  vg.addColorStop(0,`rgba(60,0,0,${vigA*0.3})`);
  vg.addColorStop(1,`rgba(50,0,0,${vigA})`);
  ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);

  // Krvavý trail (phase 2+)
  vm.trail.forEach(pt => {
    ctx.globalAlpha = Math.max(0, pt.a) * 0.8;
    ctx.fillStyle = '#8b0000';
    ctx.beginPath(); ctx.ellipse(pt.x, pt.y, 6, 4, 0, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  if(vm.phase === 1){
    // Stojí nehybně – žádné třesení
    const cx = vm.x, cy = vm.y;
    drawMilanAt(cx, cy, 0, 1.0, false);

    // ── Rána 1: nadpřirozený řez přes břicho (t=450→820) ──
    const w1start=450, w1end=820;
    if(t > w1start){
      const p1 = Math.min(1,(t-w1start)/(w1end-w1start));
      // otevírání rány – šířka roste s progresem
      const w1ax=cx-20, w1ay=cy+3, w1bx=cx+16, w1by=cy-4;
      const curX1=w1ax+(w1bx-w1ax)*p1, curY1=w1ay+(w1by-w1ay)*p1;
      ctx.strokeStyle='#cc0000'; ctx.lineWidth=3+p1*2; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(w1ax,w1ay); ctx.lineTo(curX1,curY1); ctx.stroke();
      // špička nože (svítící bod) pohybující se po ráně
      if(p1 < 1){
        const tipG=ctx.createRadialGradient(curX1,curY1,0,curX1,curY1,7);
        tipG.addColorStop(0,'rgba(255,80,80,0.95)'); tipG.addColorStop(1,'transparent');
        ctx.fillStyle=tipG; ctx.beginPath(); ctx.arc(curX1,curY1,7,0,Math.PI*2); ctx.fill();
      }
      // krev stéká po dokončení rány
      if(t > w1end){
        const dL=Math.min(40,(t-w1end)*0.05);
        const dg=ctx.createLinearGradient(cx-4,cy+3,cx-2,cy+3+dL);
        dg.addColorStop(0,'rgba(180,0,0,0.92)'); dg.addColorStop(1,'rgba(100,0,0,0)');
        ctx.fillStyle=dg; ctx.fillRect(cx-5,cy+3,5,dL);
      }
    }

    // ── Rána 2: druhý řez (t=900→1270) ──
    const w2start=900, w2end=1270;
    if(t > w2start){
      const p2 = Math.min(1,(t-w2start)/(w2end-w2start));
      const w2ax=cx+10, w2ay=cy-10, w2bx=cx-12, w2by=cy+10;
      const curX2=w2ax+(w2bx-w2ax)*p2, curY2=w2ay+(w2by-w2ay)*p2;
      ctx.strokeStyle='#cc0000'; ctx.lineWidth=3+p2*2; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(w2ax,w2ay); ctx.lineTo(curX2,curY2); ctx.stroke();
      if(p2 < 1){
        const tipG2=ctx.createRadialGradient(curX2,curY2,0,curX2,curY2,7);
        tipG2.addColorStop(0,'rgba(255,80,80,0.95)'); tipG2.addColorStop(1,'transparent');
        ctx.fillStyle=tipG2; ctx.beginPath(); ctx.arc(curX2,curY2,7,0,Math.PI*2); ctx.fill();
      }
      if(t > w2end){
        const dL2=Math.min(35,(t-w2end)*0.045);
        const dg2=ctx.createLinearGradient(cx-1,cy+10,cx,cy+10+dL2);
        dg2.addColorStop(0,'rgba(160,0,0,0.88)'); dg2.addColorStop(1,'rgba(80,0,0,0)');
        ctx.fillStyle=dg2; ctx.fillRect(cx-3,cy+10,4,dL2);
      }
    }
    if(t > 500 && t < 1400){
      const bA = Math.min(1, Math.min((t-500)/200, (1400-t)/200));
      ctx.globalAlpha = bA;
      ctx.fillStyle='rgba(18,18,18,0.88)'; ctx.strokeStyle='rgba(180,0,0,0.7)'; ctx.lineWidth=1.5;
      rrect(cx+30,cy-56,88,26,5); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#ddd'; ctx.font=`${Math.floor(W*0.013)}px JetBrains Mono,monospace`;
      ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText('Co...?!',cx+38,cy-43);
      ctx.globalAlpha=1;
    }
    if(t > 1500 && t < 2000){
      const bA = Math.min(1, Math.min((t-1500)/180, (2000-t)/180));
      ctx.globalAlpha = bA;
      ctx.fillStyle='rgba(18,18,18,0.88)'; ctx.strokeStyle='rgba(180,0,0,0.7)'; ctx.lineWidth=1.5;
      rrect(cx+30,cy-56,105,26,5); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#ddd'; ctx.font=`${Math.floor(W*0.013)}px JetBrains Mono,monospace`;
      ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText('je mi nějak zle...',cx+38,cy-43);
      ctx.globalAlpha=1;
    }
  }

  if(vm.phase === 2){
    // Běží ke kašně
    const runWobble = Math.sin(t * 0.018) * 0.12;
    drawMilanAt(vm.x, vm.y, runWobble, 1.0, false);
    ctx.strokeStyle = '#cc0000'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(vm.x-15, vm.y+4); ctx.lineTo(vm.x+15, vm.y-3); ctx.stroke();
  }

  if(vm.phase === 3){
    // Padá do kašny
    const fp = Math.min(1, vm.phaseT / 900);
    ctx.save();
    ctx.translate(fnX, fnY - fnR*0.4);
    ctx.rotate(-Math.PI*0.55 * fp);
    ctx.globalAlpha = 1 - fp*0.6;
    ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(0, fp*30, 27*(1-fp*0.3), 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fde8c8'; ctx.beginPath(); ctx.arc(0, fp*30-22*(1-fp*0.3), 20*(1-fp*0.3), 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle='#cc0000'; ctx.lineWidth=4; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-15,fp*30+4); ctx.lineTo(15,fp*30-3); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
    if(vm.phaseT > 400){
      const sp = Math.min(1, (vm.phaseT-400)/500);
      for(let i=0;i<3;i++){
        const sr = fnR*(0.25+i*0.22)*sp;
        ctx.strokeStyle=`rgba(160,0,0,${(1-sp)*0.55*(1-i*0.28)})`; ctx.lineWidth=2;
        ctx.beginPath(); ctx.ellipse(fnX,fnY,sr,sr*0.52,0,0,Math.PI*2); ctx.stroke();
      }
    }
  }

  if(vm.phase === 4){
    // Tělo se vznáší na hladině – leží na zádech, pomalu se kolébá
    const wobble = Math.sin(t * 0.0018) * 0.04;
    const floatOff = Math.sin(t * 0.0022) * 3; // jemné výkyvy nahoru-dolů

    // červená voda přes tělo (spodní vrstva)
    const rwG = ctx.createRadialGradient(fnX,fnY,0,fnX,fnY,fnR*1.0);
    rwG.addColorStop(0,'rgba(160,0,0,0.55)'); rwG.addColorStop(0.6,'rgba(100,0,0,0.35)'); rwG.addColorStop(1,'rgba(60,0,0,0)');
    ctx.fillStyle=rwG; ctx.beginPath(); ctx.ellipse(fnX,fnY,fnR*0.93,fnR*0.52,0,0,Math.PI*2); ctx.fill();

    // Tělo Milana ležící na hladině (otočené o 90° – horizontal)
    ctx.save();
    ctx.translate(fnX, fnY - fnR*0.08 + floatOff);
    ctx.rotate(wobble);
    // stín pod tělem
    ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(3,3,28,12,0,0,Math.PI*2); ctx.fill();
    // tělo (ležící horizontálně)
    ctx.fillStyle='#06b6d4'; ctx.beginPath(); ctx.ellipse(0,0,28,12,0,0,Math.PI*2); ctx.fill();
    // rány na těle
    ctx.strokeStyle='rgba(180,0,0,0.85)'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-12,-3); ctx.lineTo(8,3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5,-6); ctx.lineTo(-8,8); ctx.stroke();
    ctx.restore();
    // 3D hlava (vpravo od těla, ve světových souřadnicích)
    drawFloatHead(fnX + 36, fnY - fnR*0.08 + floatOff, 0.88);

    // krev se rozpíjí kolem těla
    const bSpread = Math.min(1, vm.phaseT / 1200);
    const bG = ctx.createRadialGradient(fnX,fnY,0,fnX,fnY,fnR*0.85*bSpread);
    bG.addColorStop(0,'rgba(140,0,0,0.45)'); bG.addColorStop(1,'rgba(80,0,0,0)');
    ctx.fillStyle=bG; ctx.beginPath(); ctx.ellipse(fnX,fnY,fnR*0.85*bSpread,fnR*0.46*bSpread,0,0,Math.PI*2); ctx.fill();

    // fade out
    if(vm.phaseT > 1500){
      const fA = Math.min(0.65,(vm.phaseT-1500)/500);
      ctx.fillStyle=`rgba(0,0,0,${fA})`; ctx.fillRect(0,0,W,H);
    }
  }
}

// ─── Doma (hráčův byt) ────────────────────────────────────────────────────

function drawDoma(W,H,t){
  const flY = H * 0.58;
  const ft = t * 0.001;

  // ── Pozadí – stěna s texturou, teplejší ───────────────────────────────
  const wG = ctx.createLinearGradient(0, 0, 0, flY);
  wG.addColorStop(0, '#181428'); wG.addColorStop(0.5, '#201a34'); wG.addColorStop(1, '#241e36');
  ctx.fillStyle = wG; ctx.fillRect(0, 0, W, H);

  // ── STRING LIGHTS podél stropu ─────────────────────────────────────────
  {
    const slY = H * 0.03;
    // Drát
    ctx.strokeStyle = 'rgba(60,50,40,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, slY);
    for(let sx2 = 0; sx2 <= W; sx2 += W * 0.06){
      ctx.lineTo(sx2, slY + Math.sin(sx2 * 0.008) * H * 0.008);
    }
    ctx.stroke();
    // Žárovičky
    const lColors = ['#ff6060','#60ff60','#6080ff','#ffff60','#ff60ff','#60ffff','#ffaa40','#aa60ff'];
    for(let li = 0; li < 16; li++){
      const lx = W * 0.03 + li * W * 0.06;
      const ly = slY + Math.sin(lx * 0.008) * H * 0.008 + H * 0.008;
      const lc = lColors[li % lColors.length];
      const la = 0.5 + 0.3 * Math.sin(ft * 1.5 + li * 0.8);
      // Záře
      const lG = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.025);
      const lr=parseInt(lc.slice(1,3),16), lg2=parseInt(lc.slice(3,5),16), lb=parseInt(lc.slice(5,7),16);
      lG.addColorStop(0, `rgba(${lr},${lg2},${lb},${la*0.30})`);
      lG.addColorStop(1, 'transparent');
      ctx.fillStyle = lG; ctx.beginPath(); ctx.arc(lx, ly, W * 0.025, 0, Math.PI * 2); ctx.fill();
      // Žárovička
      ctx.fillStyle = lc; ctx.globalAlpha = la;
      ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ── Plakáty na zdi ─────────────────────────────────────────────────────
  // Metal plakát vlevo
  {
    const px = W * 0.04, py = H * 0.10, pw = W * 0.10, ph = H * 0.14;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = '#cc2020'; ctx.font = `bold ${Math.floor(pw * 0.20)}px Impact,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SLAYER', px + pw / 2, py + ph * 0.3);
    ctx.fillStyle = '#666'; ctx.font = `${Math.floor(pw * 0.10)}px sans-serif`;
    ctx.fillText('TOUR 2025', px + pw / 2, py + ph * 0.6);
    // Pentagram
    ctx.strokeStyle = '#cc2020'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px + pw / 2, py + ph * 0.78, pw * 0.12, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,200,0.15)'; ctx.lineWidth = 0.5; ctx.strokeRect(px, py, pw, ph);
  }
  // Gaming plakát
  {
    const px = W * 0.16, py = H * 0.08, pw = W * 0.08, ph = H * 0.12;
    const pgG = ctx.createLinearGradient(px, py, px, py + ph);
    pgG.addColorStop(0, '#0a2040'); pgG.addColorStop(1, '#102060');
    ctx.fillStyle = pgG; ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = '#40ff80'; ctx.font = `bold ${Math.floor(pw * 0.18)}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('GTA VI', px + pw / 2, py + ph * 0.4);
    ctx.fillStyle = '#ffffff'; ctx.font = `${Math.floor(pw * 0.10)}px sans-serif`;
    ctx.fillText('VICE CITY', px + pw / 2, py + ph * 0.65);
    ctx.strokeStyle = 'rgba(200,200,200,0.15)'; ctx.lineWidth = 0.5; ctx.strokeRect(px, py, pw, ph);
  }

  // ── Police s knihami/trofejemi na zdi ──────────────────────────────────
  {
    const shx = W * 0.28, shy = H * 0.18, shw = W * 0.14, shh = H * 0.03;
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(shx, shy, shw, shh);
    ctx.fillStyle = '#4a3a28'; ctx.fillRect(shx, shy, shw, 2);
    // Knihy na polici
    const bookCols = ['#8a2020','#204080','#208040','#806020','#602080','#208080'];
    for(let b = 0; b < 6; b++){
      const bw = shw * 0.08 + Math.sin(b * 3) * shw * 0.02;
      const bx2 = shx + 3 + b * (shw * 0.15);
      const bh = shh * 1.2 + Math.sin(b * 7) * shh * 0.3;
      ctx.fillStyle = bookCols[b]; ctx.fillRect(bx2, shy - bh, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx2 + 1, shy - bh + 1, 2, bh - 2);
    }
    // Mini trofej
    ctx.fillStyle = '#c0a030'; ctx.fillRect(shx + shw * 0.82, shy - shh * 1.2, shw * 0.06, shh * 1.2);
    ctx.beginPath(); ctx.arc(shx + shw * 0.85, shy - shh * 1.4, shw * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#e0c040'; ctx.fill();
  }

  // Podlaha – dřevěná s detailem
  const flG = ctx.createLinearGradient(0, flY, 0, H);
  flG.addColorStop(0, '#2e2016'); flG.addColorStop(0.5, '#261a10'); flG.addColorStop(1, '#1e140c');
  ctx.fillStyle = flG; ctx.fillRect(0, flY, W, H - flY);
  // Prkna podlahy s suky
  ctx.strokeStyle = 'rgba(60,40,20,0.45)'; ctx.lineWidth = 1;
  for(let i = 0; i < 12; i++){
    const ly = flY + (H - flY) * (i / 12);
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
    // Suky ve dřevě
    if(i % 3 === 0){
      const kx = W * (0.2 + i * 0.06);
      ctx.fillStyle = 'rgba(40,25,10,0.3)'; ctx.beginPath(); ctx.ellipse(kx, ly + (H - flY) / 24, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Lišta
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(0, flY - 3, W, 6);

  // ── Rozházené věci na podlaze ──────────────────────────────────────────
  // Tričko
  ctx.fillStyle = 'rgba(60,60,80,0.25)'; ctx.beginPath();
  ctx.moveTo(W * 0.30, flY + H * 0.10); ctx.lineTo(W * 0.35, flY + H * 0.08);
  ctx.lineTo(W * 0.38, flY + H * 0.14); ctx.lineTo(W * 0.32, flY + H * 0.16); ctx.closePath(); ctx.fill();
  // Boty
  ctx.fillStyle = 'rgba(40,30,20,0.3)';
  ctx.beginPath(); ctx.ellipse(W * 0.58, flY + H * 0.06, 8, 5, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(W * 0.61, flY + H * 0.08, 8, 5, -0.2, 0, Math.PI * 2); ctx.fill();

  // ── Okno (vpravo nahoře) – noční výhled s vesničkou ────────────────────
  const wx = W * 0.78, wy = H * 0.08, ww = W * 0.16, wh = H * 0.28;
  // Výhled – hlubší obloha
  const skyG = ctx.createLinearGradient(wx, wy, wx, wy + wh);
  skyG.addColorStop(0, '#030618'); skyG.addColorStop(0.7, '#0a1038'); skyG.addColorStop(1, '#101830');
  ctx.fillStyle = skyG; ctx.fillRect(wx, wy, ww, wh);
  // Měsíc s detailem
  ctx.fillStyle = 'rgba(255,245,210,0.85)';
  ctx.beginPath(); ctx.arc(wx + ww * 0.7, wy + wh * 0.20, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#030618';
  ctx.beginPath(); ctx.arc(wx + ww * 0.7 + 3, wy + wh * 0.20 - 2, 9, 0, Math.PI * 2); ctx.fill();
  // Záře měsíce
  const moonHalo = ctx.createRadialGradient(wx + ww * 0.7, wy + wh * 0.20, 0, wx + ww * 0.7, wy + wh * 0.20, ww * 0.35);
  moonHalo.addColorStop(0, 'rgba(200,220,255,0.12)'); moonHalo.addColorStop(1, 'transparent');
  ctx.fillStyle = moonHalo; ctx.beginPath(); ctx.arc(wx + ww * 0.7, wy + wh * 0.20, ww * 0.35, 0, Math.PI * 2); ctx.fill();
  // Hvězdy – více
  for(let s = 0; s < 16; s++){
    const stx = wx + 4 + Math.sin(s * 2.1) * (ww - 8) * 0.5 + ww * 0.5;
    const sty = wy + 4 + Math.cos(s * 1.7) * (wh - 8) * 0.3 + wh * 0.3;
    const sz = 0.5 + 0.5 * Math.sin(s * 5 + t * 0.003);
    const sa = 0.4 + 0.4 * Math.sin(t * 0.002 + s * 1.3);
    ctx.fillStyle = `rgba(255,255,220,${sa})`;
    ctx.beginPath(); ctx.arc(stx, sty, sz, 0, Math.PI * 2); ctx.fill();
  }
  // Vzdálená vesnice – malé oranžové body
  for(let v = 0; v < 5; v++){
    const vx = wx + ww * 0.1 + v * ww * 0.18;
    const vy = wy + wh * 0.82 + Math.sin(v * 4) * wh * 0.04;
    ctx.fillStyle = `rgba(255,200,100,${0.3 + 0.2 * Math.sin(ft * 0.5 + v)})`;
    ctx.fillRect(vx, vy, 2, 1.5);
  }
  // Horizont s kopečky
  ctx.fillStyle = '#0a0e20';
  ctx.beginPath(); ctx.moveTo(wx, wy + wh * 0.78);
  for(let hi = 0; hi <= 10; hi++) ctx.lineTo(wx + hi * ww / 10, wy + wh * (0.76 - 0.04 * Math.sin(hi * 1.8)));
  ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx, wy + wh); ctx.closePath(); ctx.fill();
  // Rám okna
  ctx.strokeStyle = '#4a3a50'; ctx.lineWidth = 4; ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
  // Záclony – sametové
  const curtG1 = ctx.createLinearGradient(wx - 14, wy, wx, wy);
  curtG1.addColorStop(0, 'rgba(70,40,90,0.45)'); curtG1.addColorStop(1, 'rgba(60,35,80,0.20)');
  ctx.fillStyle = curtG1; ctx.fillRect(wx - 14, wy - 5, 18, wh + 10);
  const curtG2 = ctx.createLinearGradient(wx + ww, wy, wx + ww + 14, wy);
  curtG2.addColorStop(0, 'rgba(60,35,80,0.20)'); curtG2.addColorStop(1, 'rgba(70,40,90,0.45)');
  ctx.fillStyle = curtG2; ctx.fillRect(wx + ww - 4, wy - 5, 18, wh + 10);

  // ── PC stůl s monitorem (vlevo uprostřed) ─────────────────────────────
  {
    const dkx = W * 0.22, dky = flY - 4, dkw = W * 0.16, dkh = H * 0.04;
    // Nohy
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(dkx + 3, dky + 4, 5, H * 0.10); ctx.fillRect(dkx + dkw - 8, dky + 4, 5, H * 0.10);
    // Deska stolu
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(dkx, dky, dkw, dkh);
    ctx.fillStyle = '#4a3a28'; ctx.fillRect(dkx, dky, dkw, 2);
    // Monitor
    const mx = dkx + dkw * 0.25, my = dky - H * 0.12, mw = dkw * 0.55, mh = H * 0.10;
    ctx.fillStyle = '#0a0a0e'; rrect(mx, my, mw, mh, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(80,80,90,0.4)'; ctx.lineWidth = 1.5; rrect(mx, my, mw, mh, 3); ctx.stroke();
    // Stojánek monitoru
    ctx.fillStyle = '#1a1a20'; ctx.fillRect(mx + mw * 0.4, my + mh, mw * 0.2, H * 0.015);
    ctx.fillRect(mx + mw * 0.3, my + mh + H * 0.012, mw * 0.4, H * 0.006);
    // Obsah obrazovky – kód/hra
    const scrA = 0.6 + 0.15 * Math.sin(ft * 2);
    const scrG = ctx.createLinearGradient(mx + 3, my + 3, mx + mw - 3, my + mh - 3);
    scrG.addColorStop(0, `rgba(15,25,40,${scrA})`); scrG.addColorStop(1, `rgba(10,18,30,${scrA})`);
    ctx.fillStyle = scrG; ctx.fillRect(mx + 3, my + 3, mw - 6, mh - 6);
    // Řádky kódu na monitoru
    ctx.fillStyle = `rgba(80,200,120,${scrA * 0.6})`; ctx.font = `${Math.floor(mh * 0.08)}px monospace`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    for(let cl = 0; cl < 6; cl++){
      const cw = mw * (0.3 + Math.sin(cl * 7) * 0.2);
      ctx.fillStyle = cl % 3 === 0 ? `rgba(80,200,120,${scrA * 0.5})` : cl % 3 === 1 ? `rgba(200,150,60,${scrA * 0.4})` : `rgba(120,160,255,${scrA * 0.4})`;
      ctx.fillRect(mx + 6, my + 6 + cl * mh * 0.13, cw, mh * 0.06);
    }
    // Záře monitoru na stěnu
    const monGlow = ctx.createRadialGradient(mx + mw / 2, my + mh / 2, 0, mx + mw / 2, my + mh / 2, W * 0.10);
    monGlow.addColorStop(0, `rgba(60,120,200,${0.06 + 0.03 * Math.sin(ft * 2)})`); monGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = monGlow; ctx.beginPath(); ctx.arc(mx + mw / 2, my + mh / 2, W * 0.10, 0, Math.PI * 2); ctx.fill();
    // Klávesnice
    ctx.fillStyle = '#1a1a20'; ctx.fillRect(dkx + dkw * 0.15, dky - H * 0.008, dkw * 0.45, H * 0.012);
    ctx.strokeStyle = 'rgba(60,60,70,0.3)'; ctx.lineWidth = 0.5;
    for(let ki = 0; ki < 6; ki++) for(let kj = 0; kj < 3; kj++){
      ctx.strokeRect(dkx + dkw * 0.16 + ki * dkw * 0.07, dky - H * 0.007 + kj * H * 0.003, dkw * 0.06, H * 0.003);
    }
    // Myš
    ctx.fillStyle = '#1a1a20'; ctx.beginPath(); ctx.ellipse(dkx + dkw * 0.72, dky - H * 0.002, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left';
  }

  // ── Postel (vpravo) ────────────────────────────────────────────────────
  const bx = W * 0.72, by = flY + 6;
  // Stín
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(bx + 3, by + 3, W * 0.24, H * 0.16);
  // Rám – dřevěný
  ctx.fillStyle = '#2a1a12'; ctx.fillRect(bx, by, W * 0.24, H * 0.16);
  // Matrace
  ctx.fillStyle = '#2a2050'; ctx.fillRect(bx + 3, by + 3, W * 0.24 - 6, H * 0.16 - 6);
  // Deka – s texturou
  const dekaG = ctx.createLinearGradient(bx, by, bx + W * 0.24, by + H * 0.12);
  dekaG.addColorStop(0, '#3a2860'); dekaG.addColorStop(0.5, '#422e6a'); dekaG.addColorStop(1, '#4a3078');
  ctx.fillStyle = dekaG; ctx.fillRect(bx + 3, by + 8, W * 0.24 - 6, H * 0.12);
  // Přehoz – záhyby
  ctx.strokeStyle = 'rgba(80,50,120,0.25)'; ctx.lineWidth = 1;
  for(let fi = 0; fi < 4; fi++){
    ctx.beginPath();
    ctx.moveTo(bx + 3, by + 8 + fi * H * 0.03);
    ctx.quadraticCurveTo(bx + W * 0.12, by + 10 + fi * H * 0.03 + Math.sin(fi * 2) * 3, bx + W * 0.24 - 3, by + 8 + fi * H * 0.03);
    ctx.stroke();
  }
  // Čelo postele
  ctx.fillStyle = '#3a2218'; ctx.fillRect(bx + W * 0.21, by - 14, W * 0.03, H * 0.16 + 14);
  // Polštář – dva
  ctx.fillStyle = '#e8e0f4';
  ctx.beginPath(); ctx.ellipse(bx + W * 0.17, by + 10, 14, 9, -0.10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ddd8ea';
  ctx.beginPath(); ctx.ellipse(bx + W * 0.19, by + 14, 13, 8, 0.10, 0, Math.PI * 2); ctx.fill();

  // ── Noční lampička na stolku u postele ─────────────────────────────────
  {
    const nlx = W * 0.70, nly = flY - 2;
    // Stolek
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(nlx - W * 0.02, nly, W * 0.04, H * 0.06);
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(nlx - W * 0.025, nly - 2, W * 0.05, 4);
    // Lampa – stojánek
    ctx.fillStyle = '#4a3a30'; ctx.fillRect(nlx - 2, nly - H * 0.06, 4, H * 0.06);
    // Stínítko
    const lampA = 0.6 + 0.15 * Math.sin(ft * 0.8);
    ctx.fillStyle = `rgba(220,180,120,${lampA * 0.7})`;
    ctx.beginPath(); ctx.moveTo(nlx - 10, nly - H * 0.06); ctx.lineTo(nlx + 10, nly - H * 0.06);
    ctx.lineTo(nlx + 14, nly - H * 0.03); ctx.lineTo(nlx - 14, nly - H * 0.03); ctx.closePath(); ctx.fill();
    // Teplá záře lampy
    const lampG = ctx.createRadialGradient(nlx, nly - H * 0.04, 0, nlx, nly - H * 0.04, W * 0.12);
    lampG.addColorStop(0, `rgba(255,210,130,${lampA * 0.15})`);
    lampG.addColorStop(0.5, `rgba(255,180,80,${lampA * 0.05})`);
    lampG.addColorStop(1, 'transparent');
    ctx.fillStyle = lampG; ctx.beginPath(); ctx.arc(nlx, nly - H * 0.04, W * 0.12, 0, Math.PI * 2); ctx.fill();
  }

  // ── Stolek s kasičkou (vlevo) ──────────────────────────────────────────
  const sx = W * 0.06, sy = flY - 6;
  // Nohy stolku
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(sx + 4, sy + 6, 5, H * 0.10);
  ctx.fillRect(sx + W * 0.10 - 4, sy + 6, 5, H * 0.10);
  // Deska
  ctx.fillStyle = '#3a2a18'; ctx.fillRect(sx, sy - 2, W * 0.11, 8);
  ctx.fillStyle = '#4a3a28'; ctx.fillRect(sx, sy - 4, W * 0.11, 4);

  // Kasička na stolku
  if(!gs.kasicka_taken){
    const kx = sx + W * 0.055, ky = sy - 16;
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.004);
    // Záře
    const kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, 30);
    kg.addColorStop(0, `rgba(240,192,64,${0.25 * pulse})`); kg.addColorStop(1, 'transparent');
    ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(kx, ky, 30, 0, Math.PI * 2); ctx.fill();
    // Kasička tvar
    ctx.fillStyle = '#c0a040';
    ctx.beginPath();
    ctx.moveTo(kx - 12, ky + 8); ctx.lineTo(kx - 10, ky - 6);
    ctx.lineTo(kx + 10, ky - 6); ctx.lineTo(kx + 12, ky + 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a08030'; ctx.fillRect(kx - 5, ky - 8, 10, 3);
    ctx.fillStyle = '#806020'; ctx.fillRect(kx - 3, ky - 4, 6, 1.5);
    ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🐷', kx, ky + 1);
    ctx.fillStyle = `rgba(240,192,64,${0.6 + 0.3 * pulse})`; ctx.font = 'bold 8px JetBrains Mono,monospace';
    ctx.textBaseline = 'alphabetic'; ctx.fillText('100 Kč', kx, ky - 14);
  }

  // ── Artefakty na bustách v kruhu (střed místnosti) ─────────────────────
  if(activeProfile){
    const ART_DEFS = [
      { key:'screenshot',      emoji:'📱', name:'Screenshot' },
      { key:'hlasovka',        emoji:'🎙️', name:'Hlasovka' },
      { key:'foto_kubatova',   emoji:'📸', name:'Fotka' },
      { key:'c2_cert',         emoji:'📜', name:'C2 Cert.' },
      { key:'voodoo',          emoji:'🪆', name:'Voodoo' },
      { key:'fig_nuz',         emoji:'🗡️', name:'Nůž†' },
      { key:'fig_gun',         emoji:'🔫', name:'Pistole' },
      { key:'milan_phone',     emoji:'📲', name:'Tel. Milan' },
      { key:'zelizka',         emoji:'⛓️', name:'Želízka' },
      { key:'podprsenka',      emoji:'👙', name:'Artefakt' },
      { key:'klice_vila',      emoji:'🔑', name:'Klíče' },
      { key:'pytel_cihalova',  emoji:'🗑️', name:'Číhalová' },
      { key:'klice_fabie',     emoji:'🔑', name:'Fábie' },
      { key:'saman_hlava',     emoji:'🩸', name:'Šam. hlava' },
      { key:'maturita',        emoji:'🏆', name:'Maturita' },
    ];
    const cx = W * 0.42, cy = H * 0.38;
    const radiusX = Math.min(W * 0.22, 200);
    const radiusY = Math.min(H * 0.20, 130);
    const count = ART_DEFS.length;

    // Podstavec – kruhová platforma
    ctx.fillStyle = 'rgba(30,20,40,0.6)';
    ctx.beginPath(); ctx.ellipse(cx, cy + radiusY + 10, radiusX + 20, 14, 0, 0, Math.PI * 2); ctx.fill();

    for(let i = 0; i < count; i++){
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const ax = cx + Math.cos(angle) * radiusX;
      const ay = cy + Math.sin(angle) * radiusY;
      const art = ART_DEFS[i];
      const unlocked = activeProfile.artifacts[art.key];
      const taken = gs.pregame_artifacts && gs.pregame_artifacts[art.key];

      // Busta (podstavec)
      const bustH = 28, bustW = 18;
      // Stín busty
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(ax, ay + bustH / 2 + 4, bustW * 0.7, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Podstavec
      const bustG = ctx.createLinearGradient(ax - bustW / 2, ay - bustH / 2, ax + bustW / 2, ay + bustH / 2);
      if(unlocked && !taken){
        bustG.addColorStop(0, '#4a3a60'); bustG.addColorStop(1, '#2a1a40');
      } else {
        bustG.addColorStop(0, '#2a2230'); bustG.addColorStop(1, '#1a1220');
      }
      ctx.fillStyle = bustG;
      // Tvar busty – trapézoid
      ctx.beginPath();
      ctx.moveTo(ax - bustW / 2 + 2, ay - bustH / 2);
      ctx.lineTo(ax + bustW / 2 - 2, ay - bustH / 2);
      ctx.lineTo(ax + bustW / 2 + 3, ay + bustH / 2);
      ctx.lineTo(ax - bustW / 2 - 3, ay + bustH / 2);
      ctx.closePath(); ctx.fill();
      // Okraj busty
      ctx.strokeStyle = unlocked && !taken ? 'rgba(240,192,64,0.4)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1; ctx.stroke();
      // Horní deska
      ctx.fillStyle = unlocked && !taken ? '#3a2a50' : '#1e1620';
      ctx.fillRect(ax - bustW / 2 - 1, ay - bustH / 2 - 3, bustW + 2, 5);

      if(unlocked && !taken){
        // Záře kolem artefaktu
        const glow = 0.3 + 0.2 * Math.sin(t * 0.003 + i * 0.8);
        const ag = ctx.createRadialGradient(ax, ay - bustH / 2 - 10, 0, ax, ay - bustH / 2 - 10, 22);
        ag.addColorStop(0, `rgba(240,192,64,${glow})`); ag.addColorStop(1, 'transparent');
        ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(ax, ay - bustH / 2 - 10, 22, 0, Math.PI * 2); ctx.fill();
        // Emoji artefaktu – vznáší se nad bustou
        const hover = Math.sin(t * 0.003 + i * 1.2) * 3;
        ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(art.emoji, ax, ay - bustH / 2 - 12 + hover);
        // Jméno
        ctx.fillStyle = 'rgba(240,192,64,0.7)'; ctx.font = '7px JetBrains Mono,monospace';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(art.name, ax, ay + bustH / 2 + 12);
      } else if(taken){
        // Prázdná busta – artefakt sebrán
        ctx.fillStyle = 'rgba(100,200,100,0.3)'; ctx.font = '10px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✓', ax, ay - 4);
        ctx.fillStyle = 'rgba(100,200,100,0.4)'; ctx.font = '7px JetBrains Mono,monospace';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(art.name, ax, ay + bustH / 2 + 12);
      } else {
        // Zamčený – šedý otazník
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.font = '14px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', ax, ay - 4);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.font = '7px JetBrains Mono,monospace';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('???', ax, ay + bustH / 2 + 12);
      }
    }
  }

  // ── Dveře nahoře (exit ven) ────────────────────────────────────────────
  const dx = W * 0.42, dw = W * 0.16, dh = H * 0.10;
  // Rám dveří
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(dx - 4, 0, dw + 8, dh + 4);
  // Dveře
  const dG = ctx.createLinearGradient(dx, 0, dx + dw, 0);
  dG.addColorStop(0, '#5a4030'); dG.addColorStop(0.5, '#6a5040'); dG.addColorStop(1, '#5a4030');
  ctx.fillStyle = dG; ctx.fillRect(dx, 0, dw, dh);
  // Panely na dveřích
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
  ctx.strokeRect(dx + 6, 4, dw / 2 - 10, dh / 2 - 6);
  ctx.strokeRect(dx + dw / 2 + 4, 4, dw / 2 - 10, dh / 2 - 6);
  ctx.strokeRect(dx + 6, dh / 2 + 2, dw - 12, dh / 2 - 6);
  // Klika
  ctx.fillStyle = '#c0a040';
  ctx.beginPath(); ctx.arc(dx + dw - 14, dh * 0.5, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a08030';
  ctx.beginPath(); ctx.arc(dx + dw - 14, dh * 0.5, 2.5, 0, Math.PI * 2); ctx.fill();
  // Nápis
  const doorPulse = 0.5 + 0.3 * Math.sin(t * 0.003);
  ctx.fillStyle = `rgba(240,192,64,${doorPulse})`; ctx.font = 'bold 11px JetBrains Mono,monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('↑ VEN', W * 0.50, dh + 18);

  // ── Koberec pod kruhem artefaktů ───────────────────────────────────────
  const cx = W * 0.42, cy = H * 0.38;
  const rugRx = Math.min(W * 0.26, 220), rugRy = Math.min(H * 0.24, 150);
  ctx.fillStyle = 'rgba(40,20,50,0.3)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 20, rugRx, rugRy, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(100,60,120,0.15)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(cx, cy + 20, rugRx - 8, rugRy - 6, 0, 0, Math.PI * 2); ctx.stroke();

  // ── Měsíční paprsek z okna ──
  ctx.save();
  const mwx = W*0.78, mwy = H*0.08, mww = W*0.16, mwh = H*0.28;
  const moonG = ctx.createLinearGradient(mwx, mwy+mwh, mwx-W*0.15, H);
  moonG.addColorStop(0,'rgba(180,200,255,0.06)');
  moonG.addColorStop(0.5,'rgba(160,180,240,0.03)');
  moonG.addColorStop(1,'transparent');
  ctx.fillStyle = moonG;
  ctx.beginPath();
  ctx.moveTo(mwx,mwy+mwh); ctx.lineTo(mwx+mww,mwy+mwh);
  ctx.lineTo(mwx+mww-W*0.10,H); ctx.lineTo(mwx-W*0.20,H);
  ctx.closePath(); ctx.fill();
  // Dust motes in moonlight
  for(let di=0;di<12;di++){
    const dlife = ((t*0.00008+di*0.16)%1);
    const ddx = mwx+mww*0.3 + Math.sin(di*4.7+t*0.0004)*W*0.08 - dlife*W*0.12;
    const ddy = mwy+mwh + dlife*(H-mwy-mwh)*0.8;
    const dda = 0.15+0.12*Math.sin(t*0.002+di*1.3);
    ctx.fillStyle=`rgba(200,210,255,${dda})`;
    ctx.beginPath(); ctx.arc(ddx,ddy,0.7+Math.sin(di*2.3)*0.4,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// ─── Hlavní render ─────────────────────────────────────────────────────────

function render(){
  const rm=ROOMS[gs.room];
  const W=canvas.width, H=canvas.height;
  const t=gs.ts, p=gs.player;
  drawRoom(rm,W,H,t);

  // Voodoo animace (overlay přes Křemži)
  if(gs.voodoo_anim) drawVoodooAnim(W,H);

  // Scanlines
  ctx.fillStyle='rgba(0,0,0,0.04)';
  for(let y=0;y<H;y+=3) ctx.fillRect(0,y,W,1);

  // Vigneta (všechny místnosti)
  const vigAll=ctx.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,Math.max(W,H)*0.78);
  vigAll.addColorStop(0,'transparent'); vigAll.addColorStop(1,'rgba(0,0,0,0.38)');
  ctx.fillStyle=vigAll; ctx.fillRect(0,0,W,H);

  // Sběratelské kartičky – zářivé body v místnostech
  const rarityGlow = { common:'rgba(148,163,184,', uncommon:'rgba(34,197,94,', rare:'rgba(59,130,246,', legendary:'rgba(245,158,11,' };
  for(const card of CARDS){
    if(card.room !== gs.room || gs.cards[card.id]) continue;
    const cx=W*card.rx, cy=H*card.ry;
    const pulse=0.5+0.5*Math.sin(t*0.003+card.rx*10);
    const glow=rarityGlow[card.rarity]||rarityGlow.common;
    // Vnější záře
    const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,38);
    cg.addColorStop(0,glow+(0.35+pulse*0.25)+')'); cg.addColorStop(0.5,glow+(0.10+pulse*0.08)+')'); cg.addColorStop(1,'transparent');
    ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,38,0,Math.PI*2); ctx.fill();
    // Vnitřní jádro
    ctx.fillStyle=glow+(0.7+pulse*0.3)+')';
    ctx.beginPath(); ctx.arc(cx,cy,6+pulse*2,0,Math.PI*2); ctx.fill();
    // Kartička emoji (rotuje)
    ctx.save(); ctx.translate(cx,cy-18-pulse*4);
    ctx.font='16px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(card.emoji,0,0);
    ctx.restore();
    // Nápis při přiblížení
    if(dist2(p,{x:cx,y:cy})<PROX_R){
      ctx.fillStyle='rgba(240,192,64,.85)'; ctx.font='bold 10px JetBrains Mono,monospace';
      ctx.textAlign='center'; ctx.textBaseline='alphabetic';
      ctx.fillText('[E] SEBRAT KARTIČKU',cx,cy-42);
    }
  }

  // Items
  currentItems.forEach(item=>{
    const s=Math.sin(item.p), r=24+s*3;
    const col=item.type==='kratom'?'#10b981':'#f97316';
    const g=ctx.createRadialGradient(item.x,item.y,0,item.x,item.y,r*2.5);
    g.addColorStop(0,col+'4a'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(item.x,item.y,r*2.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(item.x,item.y,r*.65,0,Math.PI*2); ctx.fill();
    ctx.font=`${17+s}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(item.type==='kratom'?'🌿':'🍕',item.x,item.y);
    if(dist2(p,{x:item.x,y:item.y})<PROX_R){
      ctx.fillStyle='rgba(240,192,64,.75)'; ctx.font='bold 10px JetBrains Mono,monospace';
      ctx.textBaseline='alphabetic'; ctx.fillText('[E] SEBRAT',item.x,item.y-r-12); ctx.textBaseline='middle';
    }
  });

  // ── NPC stíny – vykreslí se PŘED NPC ──
  currentNPCs.forEach(n=>{
    if(n.id==='kubatova'&&gs.room==='sklep') return; // pentagram má vlastní
    if(n.id==='cihalova'&&gs.cihalova_collapsed) return;
    const bY=n.y+Math.sin(t*0.003+n.x*0.01)*3.5;
    const sz=n.size||1;
    ctx.fillStyle='rgba(0,0,0,0.30)';
    ctx.beginPath(); ctx.ellipse(n.x+3,bY+28*sz,22*sz,8*sz,0.05,0,Math.PI*2); ctx.fill();
  });

  // NPCs
  currentNPCs.forEach(n=>{
    // Kubátová – speciální rendering v pentagramu (sklep)
    if(n.id==='kubatova' && gs.room==='sklep'){
      const pcx2=W*0.50, pcy2=H*0.72;
      const ksz=n.size||1.2;
      // řetězy přímo k tělu (4 krátké)
      const ka=Math.sin(t*0.001)*0.08;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx,dy])=>{
        ctx.strokeStyle='rgba(90,70,40,0.85)'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(pcx2+dx*55,pcy2+dy*40); ctx.lineTo(pcx2+dx*20,pcy2+dy*16); ctx.stroke();
        ctx.strokeStyle='rgba(120,90,50,0.6)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.ellipse(pcx2+dx*55,pcy2+dy*40,6,4,ka,0,Math.PI*2); ctx.stroke();
      });
      // záře kolem postavy
      const kag=ctx.createRadialGradient(pcx2,pcy2,0,pcx2,pcy2,55*ksz);
      kag.addColorStop(0,'rgba(220,0,0,0.35)'); kag.addColorStop(1,'transparent');
      ctx.fillStyle=kag; ctx.beginPath(); ctx.arc(pcx2,pcy2,55*ksz,0,Math.PI*2); ctx.fill();
      // tělo
      ctx.fillStyle=n.color; ctx.beginPath(); ctx.ellipse(pcx2,pcy2,30*ksz,26*ksz,0,0,Math.PI*2); ctx.fill();
      // ruce roztažené
      ctx.strokeStyle=n.color; ctx.lineWidth=8*ksz; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(pcx2-28*ksz,pcy2); ctx.lineTo(pcx2-52*ksz,pcy2-12*ksz); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pcx2+28*ksz,pcy2); ctx.lineTo(pcx2+52*ksz,pcy2-12*ksz); ctx.stroke();
      // hlava
      ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(pcx2,pcy2-22*ksz,20*ksz,0,Math.PI*2); ctx.fill();
      ctx.font=`${13*ksz}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      const demonFace=Math.sin(t*0.003)>0?'😈':'👁️';
      ctx.fillText(demonFace,pcx2,pcy2-22*ksz);
      // třesoucí se efekt
      const shk=Math.sin(t*0.018)*2.5;
      ctx.fillStyle='rgba(255,0,0,0.18)'; ctx.beginPath(); ctx.arc(pcx2+shk,pcy2-22*ksz,22*ksz,0,Math.PI*2); ctx.fill();
      // jméno
      ctx.textBaseline='alphabetic';
      ctx.fillStyle='#dc2626'; ctx.font=`bold ${13*Math.min(ksz,1.3)}px Outfit,sans-serif`;
      ctx.textAlign='center'; ctx.fillText(n.name,pcx2,pcy2-(46+16*(ksz-1)));
      ctx.fillStyle='rgba(255,80,80,0.55)'; ctx.font=`${9*Math.min(ksz,1.3)}px JetBrains Mono,monospace`;
      ctx.fillText(n.role.toUpperCase(),pcx2,pcy2-(32+14*(ksz-1)));
      if(dist2(p,{x:pcx2,y:pcy2})<PROX_R){
        ctx.fillStyle='rgba(240,192,64,.78)'; ctx.font='bold 10px JetBrains Mono,monospace';
        ctx.fillText('[E] MLUVIT',pcx2,pcy2+(50*ksz));
      }
      return;
    }

    const bY=n.y+Math.sin(t*0.003+n.x*0.01)*3.5;
    const sz=n.size||1;

    // ── Kratom Bůh – speciální vykreslení ──────────────────────────────────
    if(n.id==='kratom_buh'){
      const headR=22*sz, bodyH=58*sz;
      const headY=bY-bodyH-headR*0.5;
      // aureola záře
      const haloGl=ctx.createRadialGradient(n.x,headY,0,n.x,headY,headR*3.6);
      haloGl.addColorStop(0,`rgba(255,215,45,${0.45+0.12*Math.sin(t*0.0019)})`);
      haloGl.addColorStop(0.5,`rgba(255,195,25,${0.15+0.05*Math.sin(t*0.0019)})`);
      haloGl.addColorStop(1,'transparent');
      ctx.fillStyle=haloGl; ctx.beginPath(); ctx.arc(n.x,headY,headR*3.6,0,Math.PI*2); ctx.fill();
      // aureola kroužek
      ctx.strokeStyle=`rgba(255,200,38,${0.82+0.10*Math.sin(t*0.002)})`; ctx.lineWidth=3*sz;
      ctx.beginPath(); ctx.arc(n.x,headY,headR*1.9,0,Math.PI*2); ctx.stroke();
      // roucho
      const robeG2=ctx.createLinearGradient(n.x-bodyH*0.4,headY+headR,n.x+bodyH*0.4,bY);
      robeG2.addColorStop(0,'#f8f4de'); robeG2.addColorStop(0.5,'#fffcee'); robeG2.addColorStop(1,'#e6deb8');
      ctx.fillStyle=robeG2;
      ctx.beginPath();
      ctx.moveTo(n.x-headR*0.38,headY+headR*0.84);
      ctx.bezierCurveTo(n.x-bodyH*0.50,headY+bodyH*0.38,n.x-bodyH*0.58,headY+bodyH*0.72,n.x-bodyH*0.44,bY);
      ctx.lineTo(n.x+bodyH*0.44,bY);
      ctx.bezierCurveTo(n.x+bodyH*0.58,headY+bodyH*0.72,n.x+bodyH*0.50,headY+bodyH*0.38,n.x+headR*0.38,headY+headR*0.84);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(200,175,70,0.20)'; ctx.lineWidth=1.2; ctx.stroke();
      // paže
      ctx.strokeStyle='#ede8c8'; ctx.lineWidth=headR*0.48; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(n.x,headY+bodyH*0.28); ctx.lineTo(n.x-bodyH*0.52,headY+bodyH*0.58); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(n.x,headY+bodyH*0.28); ctx.lineTo(n.x+bodyH*0.52,headY+bodyH*0.58); ctx.stroke();
      // kratom
      ctx.font=`${Math.floor(18*sz)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🌿',n.x-bodyH*0.56,headY+bodyH*0.55);
      // hlava
      ctx.fillStyle='#f0d5a8'; ctx.beginPath(); ctx.arc(n.x,headY,headR,0,Math.PI*2); ctx.fill();
      // vous
      ctx.fillStyle='rgba(242,238,222,0.92)';
      ctx.beginPath();
      ctx.moveTo(n.x-headR*0.7,headY+headR*0.38);
      ctx.bezierCurveTo(n.x-headR*0.96,headY+headR*1.12,n.x-headR*0.55,headY+headR*1.78,n.x,headY+headR*1.98);
      ctx.bezierCurveTo(n.x+headR*0.55,headY+headR*1.78,n.x+headR*0.96,headY+headR*1.12,n.x+headR*0.7,headY+headR*0.38);
      ctx.closePath(); ctx.fill();
      // oči
      const eyeR2=headR*0.21, eyeY2=headY-headR*0.10;
      ctx.fillStyle='#2a1808';
      ctx.beginPath(); ctx.arc(n.x-headR*0.34,eyeY2,eyeR2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(n.x+headR*0.34,eyeY2,eyeR2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.88)';
      ctx.beginPath(); ctx.arc(n.x-headR*0.34+eyeR2*0.5,eyeY2-eyeR2*0.5,eyeR2*0.38,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(n.x+headR*0.34+eyeR2*0.5,eyeY2-eyeR2*0.5,eyeR2*0.38,0,Math.PI*2); ctx.fill();
      // obočí moudré
      ctx.strokeStyle='#8a6038'; ctx.lineWidth=headR*0.11; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(n.x-headR*0.60,eyeY2-headR*0.30); ctx.quadraticCurveTo(n.x-headR*0.34,eyeY2-headR*0.46,n.x-headR*0.10,eyeY2-headR*0.30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(n.x+headR*0.10,eyeY2-headR*0.30); ctx.quadraticCurveTo(n.x+headR*0.34,eyeY2-headR*0.46,n.x+headR*0.60,eyeY2-headR*0.30); ctx.stroke();
      // popisek
      ctx.textBaseline='alphabetic';
      ctx.fillStyle='rgba(160,120,8,0.92)'; ctx.font=`bold ${Math.max(11,13*sz)}px Outfit,sans-serif`;
      ctx.textAlign='center'; ctx.fillText(n.name,n.x,headY-headR*2.1);
      ctx.fillStyle='rgba(130,95,6,0.55)'; ctx.font=`${Math.max(8,9*sz)}px JetBrains Mono,monospace`;
      ctx.fillText(n.role.toUpperCase(),n.x,headY-headR*1.8);
      // [E] proximity
      if(dist2(p,{x:n.x,y:n.y})<PROX_R){
        ctx.fillStyle='rgba(240,192,64,.78)'; ctx.font='bold 10px JetBrains Mono,monospace';
        ctx.fillText('[E] MLUVIT',n.x,bY+50*sz);
      }
      return; // přeskočit normální NPC kreslení
    }

    if(n.id==='cihalova'&&gs.cihalova_collapsed){
      ctx.save(); ctx.translate(n.x,n.y+22); ctx.rotate(Math.PI/2);
      ctx.fillStyle=n.color; ctx.beginPath(); ctx.arc(0,-14,26*sz,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(0,-32,20*sz,0,Math.PI*2); ctx.fill();
      drawDazedFace(0,-32,sz);
      // Dazed spirals above head
      for(let sp=0;sp<3;sp++){
        const spAng = t*0.004 + sp*Math.PI*2/3;
        const spR = 12 + Math.sin(t*0.003+sp)*4;
        const spx = Math.cos(spAng)*spR;
        const spy = -42 + Math.sin(spAng)*spR*0.3 - sp*5;
        ctx.fillStyle=`rgba(255,255,100,${0.4+Math.sin(t*0.005+sp)*0.2})`;
        ctx.font='8px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('⭐',spx,spy);
      }
      ctx.restore(); return;
    }

    // Breathing animation – subtle scale pulse
    const breathe = 1.0 + Math.sin(t*0.002 + n.x*0.005) * 0.018;
    const bodySz = sz * breathe;

    // Proximity glow – brighter when player is near
    const npcDist = dist2(p, {x:n.x, y:n.y});
    const proxGlow = npcDist < PROX_R ? 0.25 + (1 - npcDist/PROX_R) * 0.35 : 0.22;

    const ag=ctx.createRadialGradient(n.x,bY,0,n.x,bY,55*sz);
    ag.addColorStop(0,n.color + (npcDist < PROX_R ? '5a' : '3a')); ag.addColorStop(1,'transparent');
    ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(n.x,bY,55*sz,0,Math.PI*2); ctx.fill();

    // Body
    ctx.fillStyle=n.color;
    if(sz>1){ ctx.beginPath(); ctx.ellipse(n.x,bY,30*bodySz,26*bodySz,0,0,Math.PI*2); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(n.x,bY,27*breathe,0,Math.PI*2); ctx.fill(); }

    // Arms – subtle sway
    const armSway = Math.sin(t*0.0015 + n.x*0.01) * 4;
    const armLen = 18 * sz;
    ctx.strokeStyle = n.color; ctx.lineWidth = 6*sz; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(n.x - 20*sz, bY - 4*sz); ctx.lineTo(n.x - 20*sz - armLen, bY + armSway); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(n.x + 20*sz, bY - 4*sz); ctx.lineTo(n.x + 20*sz + armLen, bY - armSway); ctx.stroke();

    // ── NPC-specific effects ──
    // Šaman – mystická aura s rotujícími symboly
    if(n.id==='saman' && !gs.saman_dead){
      ctx.save();
      const auraR = 40*sz;
      const auraG = ctx.createRadialGradient(n.x,bY,0,n.x,bY,auraR);
      auraG.addColorStop(0,`rgba(139,92,246,${0.12+0.06*Math.sin(t*0.002)})`);
      auraG.addColorStop(1,'transparent');
      ctx.fillStyle=auraG; ctx.beginPath(); ctx.arc(n.x,bY,auraR,0,Math.PI*2); ctx.fill();
      // rotating rune symbols
      const runes = ['☽','✦','◈','⚶'];
      ctx.font='9px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      for(let ri=0;ri<runes.length;ri++){
        const rAng = t*0.0015 + ri*Math.PI/2;
        const rr = 35*sz;
        const rx = n.x + Math.cos(rAng)*rr;
        const ry = bY + Math.sin(rAng)*rr*0.5;
        ctx.fillStyle=`rgba(180,140,255,${0.3+0.15*Math.sin(t*0.003+ri)})`;
        ctx.fillText(runes[ri],rx,ry);
      }
      ctx.restore();
    }
    // Johnny vila – cigaretový dým
    if(n.id==='johnny_vila'){
      ctx.save();
      for(let si=0;si<5;si++){
        const sLife=((t*0.00015+si*0.25)%1);
        const smX=n.x+15*sz+Math.sin(sLife*Math.PI+si)*8;
        const smY=bY-18*sz-sLife*40*sz;
        const smR=2+sLife*6;
        const smA=0.15*(1-sLife);
        ctx.fillStyle=`rgba(180,180,180,${smA})`;
        ctx.beginPath(); ctx.arc(smX,smY,smR,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
    // Figurová – nervous fidget (hand shake)
    if(n.id==='figurova' && !gs.story.figurova_sanitka){
      const fidget = Math.sin(t*0.012+n.x)*1.5;
      ctx.strokeStyle='rgba(236,72,153,0.25)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(n.x,bY-22*sz,24*sz,0,Math.PI*2); ctx.stroke();
    }
    // Pláteníková – books floating
    if(n.id==='platenikova'){
      ctx.save();
      ctx.font='10px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      const bookY = bY-55*sz + Math.sin(t*0.003)*4;
      ctx.fillStyle=`rgba(255,255,255,${0.3+0.1*Math.sin(t*0.004)})`;
      ctx.fillText('📚',n.x-10*sz,bookY);
      ctx.restore();
    }

    // Head
    ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(n.x,bY-22*sz,20*sz,0,Math.PI*2); ctx.fill();
    drawPixelFace(n.x, bY-22*sz, sz);

    const stage=getStage(n.id), maxSt=NPCS[n.id].dialogs.length-1, done=(stage>=maxSt&&stage>0);
    const qBaseY=bY-(68+20*(sz-1));
    if(!done){
      const qy=qBaseY+Math.sin(t*0.004)*3.5;
      // Quest marker glow
      const qGlowA = 0.15 + 0.10*Math.sin(t*0.005);
      const qG=ctx.createRadialGradient(n.x,qy+4,0,n.x,qy+4,16);
      qG.addColorStop(0,`rgba(240,192,64,${qGlowA})`); qG.addColorStop(1,'transparent');
      ctx.fillStyle=qG; ctx.beginPath(); ctx.arc(n.x,qy+4,16,0,Math.PI*2); ctx.fill();
      // Marker triangle
      ctx.fillStyle='#f0c040'; ctx.beginPath(); ctx.moveTo(n.x,qy+9); ctx.lineTo(n.x-7,qy); ctx.lineTo(n.x+7,qy); ctx.fill();
      ctx.fillStyle='#000'; ctx.font='bold 8.5px Outfit,sans-serif'; ctx.textBaseline='middle'; ctx.fillText('!',n.x,qy+4);
    } else {
      // Done marker glow
      const dGlowA = 0.12 + 0.06*Math.sin(t*0.003);
      const dG=ctx.createRadialGradient(n.x,qBaseY,0,n.x,qBaseY,14);
      dG.addColorStop(0,`rgba(34,197,94,${dGlowA})`); dG.addColorStop(1,'transparent');
      ctx.fillStyle=dG; ctx.beginPath(); ctx.arc(n.x,qBaseY,14,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#22c55e'; ctx.beginPath(); ctx.arc(n.x,qBaseY,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font='8px sans-serif'; ctx.textBaseline='middle'; ctx.fillText('✓',n.x,qBaseY);
    }

    ctx.textBaseline='alphabetic';
    ctx.fillStyle='#fff'; ctx.font=`bold ${13*Math.min(sz,1.2)}px Outfit,sans-serif`;
    ctx.textAlign='center'; ctx.fillText(n.name,n.x,bY-(46+16*(sz-1)));
    ctx.fillStyle='rgba(255,255,255,.38)'; ctx.font=`${9*Math.min(sz,1.2)}px JetBrains Mono,monospace`;
    ctx.fillText(n.role.toUpperCase(),n.x,bY-(32+14*(sz-1)));

    if(dist2(p,{x:n.x,y:n.y})<PROX_R){
      ctx.fillStyle='rgba(240,192,64,.78)'; ctx.font='bold 10px JetBrains Mono,monospace';
      ctx.fillText('[E] MLUVIT',n.x,bY+(50*sz));
    }
  });

  // Hráč
  const px=p.x,py=p.y,pc=gs.kratom_on?'#10b981':'#7c6ff7';
  // Stín – mění se při pohybu
  const shadowStretch = p.mv ? 1.15 : 1.0;
  ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(px,py+29,17*shadowStretch,7,0,0,Math.PI*2); ctx.fill();
  // Aura glow
  const pg=ctx.createRadialGradient(px,py,0,px,py,42);
  pg.addColorStop(0,pc+'4a'); pg.addColorStop(1,'transparent');
  ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(px,py,42,0,Math.PI*2); ctx.fill();
  // Body – subtle tilt when walking
  const walkTilt = p.mv ? Math.sin(t*0.008)*0.06 : 0;
  const walkBob = p.mv ? Math.sin(t*0.01)*2.5 : 0;
  ctx.save(); ctx.translate(px, py+walkBob); ctx.rotate(walkTilt);
  ctx.fillStyle=pc; ctx.beginPath(); ctx.arc(0,0,23,0,Math.PI*2); ctx.fill();
  // Arms
  const pArmSway = p.mv ? Math.sin(t*0.008)*8 : Math.sin(t*0.002)*2;
  ctx.strokeStyle=pc; ctx.lineWidth=5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-18,-4); ctx.lineTo(-28,pArmSway); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18,-4); ctx.lineTo(28,-pArmSway); ctx.stroke();
  // Head
  ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(0,-17,18,0,Math.PI*2); ctx.fill();
  const ef=p.face==='l'?-1:1;
  // Eye blinking
  const pBlinkPhase = ((t * 0.001) % 3.5);
  const pIsBlinking = pBlinkPhase > 3.35;
  // Eyes
  if(pIsBlinking){
    ctx.fillStyle='#1e293b';
    ctx.fillRect(ef*5-4,-20,8,2);
    ctx.fillRect(ef*5+7,-20,8,2);
  } else {
    ctx.fillStyle='#1e293b';
    ctx.beginPath(); ctx.arc(ef*5,-19,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ef*5+11,-19,4,0,Math.PI*2); ctx.fill();
    // Pupil follows movement direction
    const pupilOff = p.mv ? ef*1.2 : 0;
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(ef*5.5+pupilOff,-20,1.8,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(ef*5.5+11+pupilOff,-20,1.8,0,Math.PI*2); ctx.fill();
  }
  // Mouth – expression changes with energy
  ctx.strokeStyle='rgba(80,40,40,0.4)'; ctx.lineWidth=1.5; ctx.lineCap='round';
  if(gs.energy > 50){
    // Slight smile
    ctx.beginPath(); ctx.arc(ef*8,-12,3,0.1,Math.PI-0.1); ctx.stroke();
  } else if(gs.energy > 20){
    // Neutral line
    ctx.beginPath(); ctx.moveTo(ef*5,-11); ctx.lineTo(ef*11,-11); ctx.stroke();
  } else {
    // Frown
    ctx.beginPath(); ctx.arc(ef*8,-9,3,Math.PI+0.1,Math.PI*2-0.1); ctx.stroke();
  }
  ctx.restore();

  if(gs.kratom_on&&gs.kratom_t>0){
    const kpct=gs.kratom_t/gs.kratom_max;
    // Outer glow
    const kGlow=ctx.createRadialGradient(px,py+walkBob,28,px,py+walkBob,45);
    kGlow.addColorStop(0,`rgba(16,185,129,${0.08+0.04*Math.sin(t*0.004)})`);
    kGlow.addColorStop(1,'transparent');
    ctx.fillStyle=kGlow; ctx.beginPath(); ctx.arc(px,py+walkBob,45,0,Math.PI*2); ctx.fill();
    // Progress ring
    ctx.strokeStyle='rgba(16,185,129,0.25)'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(px,py+walkBob,32,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle='#10b981'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(px,py+walkBob,32,-Math.PI/2,-Math.PI/2+kpct*Math.PI*2); ctx.stroke();
    // Floating green particles
    for(let ki=0;ki<5;ki++){
      const kAng = t*0.003 + ki*Math.PI*2/5;
      const kR = 35 + Math.sin(t*0.004+ki)*8;
      const kx = px + Math.cos(kAng)*kR;
      const ky = py + walkBob + Math.sin(kAng)*kR*0.5 - Math.sin(t*0.005+ki)*5;
      ctx.fillStyle=`rgba(16,185,129,${0.3+0.15*Math.sin(t*0.006+ki)})`;
      ctx.beginPath(); ctx.arc(kx,ky,1.5,0,Math.PI*2); ctx.fill();
    }
  }
  if(p.mv){
    // Dust particles when walking – more detailed
    for(let i=0;i<4;i++){
      const dustAge = ((t*0.003+i*0.7)%1);
      const dustAlpha = (1-dustAge)*0.12;
      const dustX = px + (p.face==='l'?1:-1)*10 + (Math.random()-.5)*20;
      const dustY = py + 25 - dustAge*15;
      const dustR = 1.5 + dustAge*3;
      ctx.fillStyle=`rgba(200,200,200,${dustAlpha})`;
      ctx.beginPath(); ctx.arc(dustX,dustY,dustR,0,Math.PI*2); ctx.fill();
    }
  }

  // GOD mode – obrovský penis
  if(gs.story.god_mode){
    ctx.save(); ctx.translate(px,py+28);
    const godPulse=0.9+0.1*Math.sin(t*0.005);
    ctx.scale(godPulse,godPulse);
    // Shaft
    ctx.fillStyle='#e8b88a'; ctx.beginPath(); rrect(-8,0,16,45,4); ctx.fill();
    ctx.strokeStyle='#c49070'; ctx.lineWidth=1; rrect(-8,0,16,45,4); ctx.stroke();
    // Tip
    ctx.fillStyle='#d4827a'; ctx.beginPath(); ctx.arc(0,48,10,0,Math.PI*2); ctx.fill();
    // Balls
    ctx.fillStyle='#e8b88a';
    ctx.beginPath(); ctx.arc(-10,0,9,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10,0,9,0,Math.PI*2); ctx.fill();
    // Glow
    const godG=ctx.createRadialGradient(0,25,0,0,25,40);
    godG.addColorStop(0,'rgba(255,215,0,0.15)'); godG.addColorStop(1,'transparent');
    ctx.fillStyle=godG; ctx.beginPath(); ctx.arc(0,25,40,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Číhalová útok – canvas animace
  if(gs.ca_active&&gs.ca){
    const ca=gs.ca, cax=ca.x, cay=ca.y;
    ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(cax,cay+32,22,9,0,0,Math.PI*2); ctx.fill();
    if(ca.phase===1){
      ctx.strokeStyle='rgba(236,72,153,.4)'; ctx.lineWidth=2.5;
      for(let i=0;i<5;i++){ const lx=cax+45+i*22,ly=cay-8+i*7; ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx+35,ly); ctx.stroke(); }
    }
    const tilt=ca.phase===1?-0.15:0;
    ctx.save(); ctx.translate(cax,cay); ctx.rotate(tilt);
    ctx.fillStyle='#ec4899'; ctx.beginPath(); ctx.arc(0,0,27,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(0,-22,20,0,Math.PI*2); ctx.fill();
    if(ca.phase>=3) drawAngryFace(0,-22,1); else drawPixelFace(0,-22,1);
    ctx.restore();
    ctx.fillStyle='rgba(236,72,153,0.9)'; ctx.font='bold 11px Outfit,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillText('ČÍHALOVÁ',cax,cay-54);
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='8px JetBrains Mono,monospace'; ctx.fillText('UČITELKA',cax,cay-44);
    if(ca.phase>=2){
      ctx.save(); ctx.translate(cax-34,cay-8);
      ctx.font=(ca.phase===3&&ca.flash>0.3?'34px':'28px')+' serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      if(ca.phase===3&&ca.flash>0.3){ ctx.globalAlpha=ca.flash; ctx.font='38px serif'; ctx.fillText('💥',-22,-12); ctx.globalAlpha=1; }
      ctx.fillText('🔫',0,0); ctx.restore();
    }
    if(ca.phase===2&&ca.speech){
      const lines=ca.speech.split('\n'), bw2=W*0.22, lh=16, bh2=lines.length*lh+18;
      const bx2=cax-bw2-20, by2=cay-80;
      ctx.fillStyle='rgba(255,255,240,0.95)'; rrect(bx2,by2,bw2,bh2,8); ctx.fill();
      ctx.strokeStyle='rgba(200,100,100,0.7)'; ctx.lineWidth=1.5; rrect(bx2,by2,bw2,bh2,8); ctx.stroke();
      ctx.fillStyle='rgba(255,255,240,0.95)'; ctx.beginPath(); ctx.moveTo(bx2+bw2-10,by2+bh2); ctx.lineTo(bx2+bw2+5,by2+bh2+14); ctx.lineTo(bx2+bw2-24,by2+bh2); ctx.fill();
      ctx.fillStyle='#1a0505'; ctx.font=`bold ${Math.floor(W*0.0085)}px Outfit,sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='top';
      lines.forEach((ln,li)=>ctx.fillText(ln,bx2+bw2/2,by2+9+li*lh));
    }
    if(ca.phase===3&&ca.flash>0){ ctx.fillStyle=`rgba(255,210,0,${ca.flash*0.6})`; ctx.fillRect(0,0,W,H); }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  POST-PROCESSING: Color grading + Ambient overlay per místnost
  // ══════════════════════════════════════════════════════════════════════════
  const roomFX = {
    ucebna:      { tint:'rgba(180,210,255,0.06)', vigR:0.82, vigA:0.48 },
    billa:       { tint:'rgba(230,240,255,0.05)', vigR:0.85, vigA:0.35 },
    hospoda:     { tint:'rgba(255,140,40,0.08)',  vigR:0.72, vigA:0.55 },
    ulice:       { tint:'rgba(80,120,200,0.07)',  vigR:0.78, vigA:0.50 },
    kremze:      { tint:'rgba(255,240,180,0.04)', vigR:0.88, vigA:0.32 },
    johnny_vila: { tint:'rgba(120,60,180,0.07)',  vigR:0.72, vigA:0.52 },
    koupelna:    { tint:'rgba(100,130,180,0.06)', vigR:0.70, vigA:0.50 },
    sklep:       { tint:'rgba(255,30,0,0.06)',    vigR:0.55, vigA:0.75 },
  };
  const fx = roomFX[gs.room];
  if(fx){
    // Barevný tint přes celou scénu
    ctx.fillStyle=fx.tint; ctx.fillRect(0,0,W,H);
    // Silnější room-specific vigneta
    const vigR=ctx.createRadialGradient(W/2,H/2,H*0.18,W/2,H/2,Math.max(W,H)*fx.vigR);
    vigR.addColorStop(0,'transparent');
    vigR.addColorStop(0.6,'rgba(0,0,0,0.08)');
    vigR.addColorStop(1,`rgba(0,0,0,${fx.vigA})`);
    ctx.fillStyle=vigR; ctx.fillRect(0,0,W,H);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ROOM TRANSITION FADE
  // ══════════════════════════════════════════════════════════════════════════
  if(gs.roomFadeAlpha > 0){
    ctx.fillStyle=`rgba(0,0,0,${gs.roomFadeAlpha})`;
    ctx.fillRect(0,0,W,H);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DEATH RED FLASH
  // ══════════════════════════════════════════════════════════════════════════
  if(gs._deathFlash){
    const elapsed = t - gs._deathFlash.t;
    const dur = 500;
    if(elapsed < dur){
      const prog = elapsed / dur;
      const alpha = (1 - prog) * 0.7;
      ctx.fillStyle=`rgba(200,0,0,${alpha})`;
      ctx.fillRect(0,0,W,H);
      // desaturate/darken
      ctx.fillStyle=`rgba(0,0,0,${prog * 0.6})`;
      ctx.fillRect(0,0,W,H);
    } else {
      gs._deathFlash = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ITEM PICKUP FLASH RING
  // ══════════════════════════════════════════════════════════════════════════
  if(gs._pickupFlash){
    const pf = gs._pickupFlash;
    const elapsed = t - pf.t;
    const dur = 400;
    if(elapsed < dur){
      const prog = elapsed / dur;
      const radius = 15 + prog * 50;
      const alpha = (1 - prog) * 0.6;
      ctx.strokeStyle = `rgba(${pf.r},${pf.g},${pf.b},${alpha})`;
      ctx.lineWidth = 3 * (1 - prog);
      ctx.beginPath(); ctx.arc(pf.x, pf.y, radius, 0, Math.PI*2); ctx.stroke();
      // rising particles
      for(let i = 0; i < 6; i++){
        const angle = (i / 6) * Math.PI * 2 + prog * 2;
        const pr = radius * 0.6;
        const px = pf.x + Math.cos(angle) * pr;
        const py = pf.y + Math.sin(angle) * pr - prog * 20;
        ctx.fillStyle = `rgba(${pf.r},${pf.g},${pf.b},${alpha * 0.7})`;
        ctx.beginPath(); ctx.arc(px, py, 2 * (1-prog), 0, Math.PI*2); ctx.fill();
      }
    } else {
      gs._pickupFlash = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  REP GAIN SHIMMER
  // ══════════════════════════════════════════════════════════════════════════
  if(gs._repShimmer){
    const rs = gs._repShimmer;
    const elapsed = t - rs.t;
    const dur = 600;
    if(elapsed < dur){
      const prog = elapsed / dur;
      const alpha = (1 - prog) * 0.4;
      const radius = 30 + prog * 25;
      // golden ring around player
      ctx.strokeStyle = `rgba(255,200,50,${alpha})`;
      ctx.lineWidth = 2.5 * (1 - prog);
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI*2); ctx.stroke();
      // sparkles
      for(let i = 0; i < 8; i++){
        const ang = (i / 8) * Math.PI * 2 + prog * 3;
        const sr = radius * (0.8 + Math.sin(i*2.1)*0.3);
        const sx = p.x + Math.cos(ang) * sr;
        const sy = p.y + Math.sin(ang) * sr - prog * 15;
        const sa = alpha * (0.5 + Math.sin(i*3)*0.5);
        ctx.fillStyle = `rgba(255,215,0,${sa})`;
        ctx.beginPath(); ctx.arc(sx, sy, 1.5*(1-prog*0.5), 0, Math.PI*2); ctx.fill();
      }
    } else {
      gs._repShimmer = null;
    }
  }

}

// ─── Místnost: Nebe ───────────────────────────────────────────────────────────
function drawHeavenRoom(W,H,t){
  // Čistě bílé pozadí
  ctx.fillStyle='#fffef8'; ctx.fillRect(0,0,W,H);

  // Teplé světlo shora
  const topG=ctx.createRadialGradient(W/2,0,0,W/2,0,H*0.9);
  topG.addColorStop(0,'rgba(255,238,160,0.28)'); topG.addColorStop(0.5,'rgba(255,245,200,0.10)'); topG.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=topG; ctx.fillRect(0,0,W,H);

  // Jemné taneční částice světla
  for(let i=0;i<10;i++){
    const px=W*(0.1+((Math.sin(t*0.00035+i*1.9)*0.5+0.5)*0.8));
    const py=H*(0.08+((Math.sin(t*0.00028+i*2.4)*0.5+0.5)*0.80));
    const pr=2.5+1.8*Math.sin(t*0.0012+i);
    ctx.fillStyle=`rgba(255,220,80,${0.07+0.04*Math.sin(t*0.0009+i)})`;
    ctx.beginPath(); ctx.arc(px,py,pr,0,Math.PI*2); ctx.fill();
  }

  // Schodiště (8 schodů, šířka roste dolů = perspektiva)
  const stairCount=8, botY=H*0.76, stepH=H*0.066;
  for(let i=0;i<stairCount;i++){
    const prog=i/(stairCount-1);
    const sw=W*(0.10+prog*0.16); // nahoře úzké, dole širší
    const sx=W*0.5-sw/2;
    const sy=botY-i*stepH;
    const surfH=stepH*0.72, riserH=stepH*0.28;
    // stín
    ctx.fillStyle='rgba(200,175,70,0.10)'; ctx.fillRect(sx+4,sy+4,sw,surfH);
    // povrch schodu
    const sg=ctx.createLinearGradient(sx,sy,sx,sy+surfH);
    sg.addColorStop(0,'rgba(255,248,195,0.72)'); sg.addColorStop(1,'rgba(238,215,120,0.60)');
    ctx.fillStyle=sg; ctx.fillRect(sx,sy,sw,surfH);
    // čelo schodu
    ctx.fillStyle='rgba(210,178,65,0.38)'; ctx.fillRect(sx,sy+surfH,sw,riserH);
    // obrys
    ctx.strokeStyle='rgba(195,162,52,0.22)'; ctx.lineWidth=1;
    ctx.strokeRect(sx,sy,sw,surfH);
  }

  // Záře na vrcholu schodů (kde stojí Bůh)
  const godY=H*0.16*canvas.height/H; // skutečná y pozice
  const glowG=ctx.createRadialGradient(W*0.5,H*0.10,0,W*0.5,H*0.10,W*0.28);
  glowG.addColorStop(0,`rgba(255,220,60,${0.18+0.06*Math.sin(t*0.0015)})`);
  glowG.addColorStop(0.5,`rgba(255,230,100,${0.07+0.03*Math.sin(t*0.0015)})`);
  glowG.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=glowG; ctx.fillRect(0,0,W,H*0.35);

  // Indikátor – jdi nahoru
  const pulse=0.45+0.3*Math.sin(t*0.003);
  ctx.fillStyle=`rgba(200,170,50,${pulse})`; ctx.font='bold 11px JetBrains Mono,monospace';
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.fillText('▲  BOŽÍ BRÁNA  ▲', W*0.5, H*0.08);
}

// ─── Místnost: Boží brána ─────────────────────────────────────────────────────
function drawHeavenGate(W,H,t){
  // Teplé bílé pozadí
  ctx.fillStyle='#fffef0'; ctx.fillRect(0,0,W,H);

  // Záře shora
  const topG=ctx.createRadialGradient(W*0.5,0,0,W*0.5,0,H*0.85);
  topG.addColorStop(0,`rgba(255,228,80,${0.22+0.06*Math.sin(t*0.0011)})`);
  topG.addColorStop(0.4,'rgba(255,240,180,0.10)');
  topG.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=topG; ctx.fillRect(0,0,W,H);

  // Zlatá brána – sloupy + oblouk
  const gx=W*0.50, gy=H*0.88, gh=H*0.62, gw=Math.min(W*0.38,320);
  const pilW=Math.max(14, gw*0.055);
  const lx=gx-gw/2, rx=gx+gw/2;

  // záře za bránou
  const gl=ctx.createRadialGradient(gx,gy-gh*0.5,H*0.02,gx,gy-gh*0.5,gw*0.88);
  gl.addColorStop(0,`rgba(255,215,55,${0.20+0.06*Math.sin(t*0.0013)})`);
  gl.addColorStop(0.5,`rgba(255,200,30,${0.08+0.03*Math.sin(t*0.0013)})`);
  gl.addColorStop(1,'transparent');
  ctx.fillStyle=gl; ctx.fillRect(gx-gw,gy-gh*1.1,gw*2,gh*1.2);

  // paprsky světla
  ctx.save(); ctx.translate(gx, gy-gh*0.78);
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2+t*0.00018;
    const len=Math.max(W,H)*1.2;
    ctx.fillStyle=`rgba(255,225,70,${0.018+0.006*Math.sin(t*0.001+i)})`;
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a-0.04)*len, Math.sin(a-0.04)*len);
    ctx.lineTo(Math.cos(a+0.04)*len, Math.sin(a+0.04)*len);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  function pillarGrad(px){
    const g=ctx.createLinearGradient(px,0,px+pilW,0);
    g.addColorStop(0,'#a07010'); g.addColorStop(0.35,'#f0d050'); g.addColorStop(0.65,'#e8c030'); g.addColorStop(1,'#886008');
    return g;
  }
  // sloupy
  ctx.fillStyle=pillarGrad(lx-pilW/2); ctx.fillRect(lx-pilW/2, gy-gh, pilW, gh);
  ctx.fillStyle=pillarGrad(rx-pilW/2); ctx.fillRect(rx-pilW/2, gy-gh, pilW, gh);
  // čepičky
  ctx.fillStyle='#c09020';
  ctx.fillRect(lx-pilW*0.85, gy-gh-H*0.022, pilW*1.7, H*0.022);
  ctx.fillRect(rx-pilW*0.85, gy-gh-H*0.022, pilW*1.7, H*0.022);
  // oblouk
  const archG=ctx.createLinearGradient(lx,0,rx,0);
  archG.addColorStop(0,'#a07010'); archG.addColorStop(0.5,'#f0d050'); archG.addColorStop(1,'#a07010');
  ctx.strokeStyle=archG; ctx.lineWidth=pilW*1.1;
  ctx.beginPath(); ctx.arc(gx, gy-gh, gw/2+pilW/2, Math.PI, 0); ctx.stroke();
  // tyče brány
  ctx.strokeStyle='rgba(200,162,32,0.42)'; ctx.lineWidth=2.5;
  for(let i=1;i<=6;i++){
    const bx=lx+pilW/2+(gw-pilW)*i/7;
    ctx.beginPath(); ctx.moveTo(bx,gy); ctx.lineTo(bx,gy-gh*0.88); ctx.stroke();
  }
  // vrcholový ornament
  ctx.font=`${Math.floor(Math.min(H,W)*0.046)}px serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('🌿', gx, gy-gh-H*0.048);

  // Indikátor – zpět dolů
  const pulse=0.45+0.3*Math.sin(t*0.003);
  ctx.fillStyle=`rgba(180,145,30,${pulse})`; ctx.font='bold 11px JetBrains Mono,monospace';
  ctx.textBaseline='alphabetic';
  ctx.fillText('▼  NEBESKÉ SCHODY  ▼', W*0.5, H*0.97);
}
