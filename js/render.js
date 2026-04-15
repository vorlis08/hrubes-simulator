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
  ctx.fillStyle='#1e1a2e';
  ctx.beginPath(); ctx.arc(cx-6*sz,cy,er,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+6*sz,cy,er,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(cx-4.5*sz,cy-1.6*sz,er*0.42,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+7.5*sz,cy-1.6*sz,er*0.42,0,Math.PI*2); ctx.fill();
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

  // Tabule
  const bx=W*0.21,by=H*0.07,bw=W*0.58,bh=H*0.29;
  ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(bx+6,by+6,bw,bh);
  ctx.fillStyle='#4a3010'; ctx.fillRect(bx-10,by-10,bw+20,bh+20);
  ctx.strokeStyle='#6a4820'; ctx.lineWidth=2; ctx.strokeRect(bx-10,by-10,bw+20,bh+20);
  const bdG=ctx.createLinearGradient(bx,by,bx+bw*0.5,by+bh);
  bdG.addColorStop(0,'#0e3520'); bdG.addColorStop(0.5,'#0a2c18'); bdG.addColorStop(1,'#081e10');
  ctx.fillStyle=bdG; ctx.fillRect(bx,by,bw,bh);
  const bsh=ctx.createLinearGradient(bx,by,bx+bw*0.35,by+bh*0.5);
  bsh.addColorStop(0,'rgba(255,255,255,0.04)'); bsh.addColorStop(1,'transparent');
  ctx.fillStyle=bsh; ctx.fillRect(bx,by,bw,bh);
  // křída
  ctx.save(); ctx.globalAlpha=0.28;
  ctx.font=`bold ${Math.floor(W*0.018)}px Georgia,serif`; ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('ROZBOR MÁCHY – DÚ',bx+bw*0.5,by+bh*0.15);
  ctx.globalAlpha=0.16; ctx.font=`${Math.floor(W*0.010)}px Georgia,serif`;
  ctx.fillText('1) Životopis  •  2) Hlavní témata  •  3) Symbolika',bx+bw*0.5,by+bh*0.33);
  ctx.globalAlpha=0.13; ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.lineCap='round';
  [0.50,0.64,0.78].forEach((fy,i)=>{ ctx.beginPath(); ctx.moveTo(bx+bw*0.07,by+bh*fy); ctx.lineTo(bx+bw*(0.20+i*0.14),by+bh*fy); ctx.stroke(); });
  ctx.restore();
  ctx.fillStyle='#3a2008'; ctx.fillRect(bx,by+bh,bw,13);
  // křídové kousky
  [bx+bw*0.12,bx+bw*0.22,bx+bw*0.33].forEach(cx2=>{ ctx.fillStyle='rgba(240,235,220,0.8)'; ctx.fillRect(cx2,by+bh+2,20,6); });
  // houba
  ctx.fillStyle='#8a6040'; rrect(bx+bw-58,by+bh+1,34,9,3); ctx.fill();

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

  // Lavice žáků
  for(let r=0;r<3;r++) for(let c=0;c<4;c++){
    const sc=1-r*0.10;
    const lw=W*0.13*sc, lh=H*0.036*sc;
    const lx=W*0.10+c*W*0.22, ly=hor+H*0.06+r*H*0.16;
    ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.fillRect(lx+4,ly+lh,lw,H*0.026);
    const lvG=ctx.createLinearGradient(lx,ly,lx,ly+lh);
    lvG.addColorStop(0,shadeColor('#4a3215',12)); lvG.addColorStop(1,'#3a2510');
    ctx.fillStyle=lvG; ctx.fillRect(lx,ly,lw,lh);
    ctx.strokeStyle='#5a4020'; ctx.lineWidth=1; ctx.strokeRect(lx,ly,lw,lh);
    ctx.fillStyle='#2a1808'; ctx.fillRect(lx+4,ly+lh,5,H*0.025); ctx.fillRect(lx+lw-9,ly+lh,5,H*0.025);
    if((r+c)%3!==2){ const h2=(r*4+c)*38; ctx.fillStyle=`hsl(${h2},55%,35%)`; ctx.fillRect(lx+lw*0.08,ly-lh*0.6,lw*0.26,lh*0.55); ctx.fillStyle=`hsl(${h2},55%,50%)`; ctx.fillRect(lx+lw*0.08,ly-lh*0.6,lw*0.26,lh*0.12); }
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

  // ── Figurová – leží po výboji propisky ──────────────────────────────────
  if(gs.story.figurova_propiska_kill){
    const fx=W*0.50, fy=H*0.68;
    // stín pod tělem
    ctx.fillStyle='rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(fx,fy+12,W*0.052,H*0.022,0,0,Math.PI*2); ctx.fill();
    // tělo – padlá figura (rotace dozadu)
    ctx.save(); ctx.translate(fx,fy); ctx.rotate(Math.PI*0.52);
    ctx.fillStyle='#475569';
    ctx.beginPath(); ctx.ellipse(0,0,W*0.040,H*0.058,0,0,Math.PI*2); ctx.fill();
    // hlava
    ctx.fillStyle='#fde8c8';
    ctx.beginPath(); ctx.arc(-W*0.032,-H*0.002,W*0.022,0,Math.PI*2); ctx.fill();
    // vlasy (šedo-hnědé)
    ctx.fillStyle='#7c6a52';
    ctx.beginPath(); ctx.ellipse(-W*0.032,-H*0.012,W*0.020,W*0.010,0,Math.PI,Math.PI*2); ctx.fill();
    // brýle
    ctx.strokeStyle='rgba(60,60,60,0.85)'; ctx.lineWidth=1.4;
    [[-W*0.040,-H*0.001],[-W*0.024,-H*0.001]].forEach(([ex,ey])=>{
      ctx.beginPath(); ctx.arc(ex,ey,W*0.007,0,Math.PI*2); ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(-W*0.040+W*0.007,-H*0.001); ctx.lineTo(-W*0.024-W*0.007,-H*0.001); ctx.stroke();
    // zkřížené oči
    ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.lineWidth=1.3;
    [[-W*0.040,-H*0.001],[-W*0.024,-H*0.001]].forEach(([ex,ey])=>{
      ctx.beginPath(); ctx.moveTo(ex-W*0.005,ey-H*0.005); ctx.lineTo(ex+W*0.005,ey+H*0.005); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex+W*0.005,ey-H*0.005); ctx.lineTo(ex-W*0.005,ey+H*0.005); ctx.stroke();
    });
    // drobný šleh opálení na ruce (drží propisku)
    ctx.strokeStyle='rgba(255,200,60,0.55)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(W*0.022,H*0.018); ctx.lineTo(W*0.038,H*0.005); ctx.stroke();
    ctx.restore();
    // popisek
    ctx.save();
    ctx.font=`${Math.floor(W*0.011)}px JetBrains Mono,monospace`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(71,85,105,0.5)'; ctx.fillText('Figurová  ⚡', fx, fy+H*0.085);
    ctx.restore();
  }
}

// ─── Billa ────────────────────────────────────────────────────────────────────
function drawBilla(W,H,t){
  const hor=H*0.46, vpX=W*0.55;

  // ── Strop – světle šedý, kazetový ─────────────────────────────────────────
  const cg=ctx.createLinearGradient(0,0,0,hor);
  cg.addColorStop(0,'#c8d4dc'); cg.addColorStop(1,'#b8c8d2');
  ctx.fillStyle=cg; ctx.fillRect(0,0,W,hor);
  // kazetový strop – mřížka
  ctx.strokeStyle='rgba(140,158,168,0.55)'; ctx.lineWidth=1;
  const cTileW=W*0.085, cTileH=H*0.055;
  for(let cx2=0;cx2<W;cx2+=cTileW){ ctx.beginPath(); ctx.moveTo(cx2,0); ctx.lineTo(cx2,hor); ctx.stroke(); }
  for(let cy2=0;cy2<hor;cy2+=cTileH){ ctx.beginPath(); ctx.moveTo(0,cy2); ctx.lineTo(W,cy2); ctx.stroke(); }
  // Stropní fluorescenty – bílé pásy s blikáním
  [W*0.12,W*0.35,W*0.60,W*0.82].forEach((lx,li)=>{
    // Třetí lampa mírně bliká (typické pro supermarket)
    const flk = li===2 ? (Math.sin(t*0.018)*Math.sin(t*0.007+2.1) > 0.88 ? 0.55+Math.random()*0.3 : 0.95) : 0.95;
    ctx.fillStyle=`rgba(255,255,255,${flk})`; ctx.fillRect(lx-W*0.048,H*0.022,W*0.095,H*0.013);
    ctx.fillStyle=`rgba(255,255,255,${flk*0.19})`; ctx.beginPath();
    ctx.moveTo(lx-W*0.048,H*0.035); ctx.lineTo(lx+W*0.047,H*0.035);
    ctx.lineTo(lx+W*0.20,hor); ctx.lineTo(lx-W*0.20,hor); ctx.closePath(); ctx.fill();
  });

  // ── Zadní zeď – teplá oranžová/žlutá (jako referenční obrázek) ───────────
  const wallG=ctx.createLinearGradient(0,0,0,hor);
  wallG.addColorStop(0,'#f0a030'); wallG.addColorStop(0.5,'#e89020'); wallG.addColorStop(1,'#d07818');
  ctx.fillStyle=wallG; ctx.fillRect(0,0,W,hor);
  // znovu strop PŘES zeď – zeď jen ve spodní části za regály
  cg.addColorStop(0,'#c8d4dc'); cg.addColorStop(1,'#b8c8d2');
  ctx.fillStyle=ctx.createLinearGradient(0,0,0,hor*0.38);
  const cg2=ctx.createLinearGradient(0,0,0,hor*0.40);
  cg2.addColorStop(0,'#c8d4dc'); cg2.addColorStop(1,'#b8c8d2');
  ctx.fillStyle=cg2; ctx.fillRect(0,0,W,hor*0.40);
  // zední lišta SALE! bannery (červeno-zelená akční páska)
  ctx.fillStyle='#d42020'; ctx.fillRect(0,hor*0.40,W,H*0.030);
  ctx.fillStyle='#1a8a1a'; ctx.fillRect(0,hor*0.40+H*0.030,W,H*0.012);
  // SALE texty
  ctx.font=`bold ${Math.floor(W*0.022)}px Impact,Arial Black,sans-serif`;
  ctx.textBaseline='middle';
  [W*0.08,W*0.25,W*0.48,W*0.70,W*0.88].forEach((sx,i)=>{
    ctx.fillStyle='#fff'; ctx.textAlign='center';
    ctx.strokeStyle='#800'; ctx.lineWidth=3;
    ctx.strokeText(i%2===0?'SALE!':'AKCE!',sx,hor*0.40+H*0.015);
    ctx.fillStyle=i%2===0?'#ffe020':'#fff'; ctx.fillText(i%2===0?'SALE!':'AKCE!',sx,hor*0.40+H*0.015);
  });
  // strop – fluorescenty znovu (přes zeď)
  [W*0.12,W*0.35,W*0.60,W*0.82].forEach(lx=>{
    ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.fillRect(lx-W*0.048,H*0.022,W*0.095,H*0.013);
    const lG=ctx.createRadialGradient(lx,H*0.029,0,lx,H*0.029,W*0.26);
    lG.addColorStop(0,'rgba(255,255,235,0.28)'); lG.addColorStop(0.6,'rgba(255,255,235,0.07)'); lG.addColorStop(1,'transparent');
    ctx.fillStyle=lG; ctx.beginPath();
    ctx.moveTo(lx-W*0.048,H*0.035); ctx.lineTo(lx+W*0.047,H*0.035);
    ctx.lineTo(lx+W*0.22,hor); ctx.lineTo(lx-W*0.22,hor); ctx.closePath(); ctx.fill();
  });

  // ── Podlaha – světlé šedé dlaždice v perspektivě ─────────────────────────
  const flG=ctx.createLinearGradient(0,hor,0,H);
  flG.addColorStop(0,'#d8dce0'); flG.addColorStop(0.4,'#c8ccd0'); flG.addColorStop(1,'#b8bcc0');
  ctx.fillStyle=flG; ctx.fillRect(0,hor,W,H-hor);
  perspGrid(vpX,hor,W,H,18,14,'rgba(140,148,158,0.50)',1);
  // odlesk světla na podlaze
  [W*0.12,W*0.35,W*0.60,W*0.82].forEach(lx=>{
    const rfG=ctx.createRadialGradient(lx,H*0.75,0,lx,H*0.75,W*0.20);
    rfG.addColorStop(0,'rgba(255,255,230,0.14)'); rfG.addColorStop(1,'transparent');
    ctx.fillStyle=rfG; ctx.fillRect(0,hor,W,H-hor);
  });

  // ── REGÁL VLEVO – modrý vysoký (jako na obrázku) ─────────────────────────
  const shelfProducts = [
    // [color, highlight]
    ['#2255cc','#4488ff'], ['#cc2020','#ff5555'], ['#22aa22','#55ee55'],
    ['#ddaa00','#ffdd44'], ['#882299','#bb44dd'], ['#dd7700','#ffaa33'],
    ['#115588','#3399cc'], ['#cc3344','#ff6677'], ['#228855','#44cc88'],
    ['#bb8800','#ffcc22'], ['#553399','#8855cc'], ['#cc5500','#ff8833'],
  ];
  function drawShelf(sx, sy, sw, sh, label, floors){
    // tloušťka a rám
    const frameG=ctx.createLinearGradient(sx,0,sx+sw,0);
    frameG.addColorStop(0,'#2a3a5a'); frameG.addColorStop(0.5,'#3a4e70'); frameG.addColorStop(1,'#2a3a5a');
    ctx.fillStyle=frameG; ctx.fillRect(sx,sy,sw,sh);
    // svislé sloupky
    ctx.fillStyle='#1a2840'; ctx.fillRect(sx,sy,sw*0.035,sh); ctx.fillRect(sx+sw-sw*0.035,sy,sw*0.035,sh);
    ctx.strokeStyle='#4a6080'; ctx.lineWidth=1; ctx.strokeRect(sx,sy,sw,sh);
    // štítek regálu nahoře
    ctx.fillStyle='#cc2020'; ctx.fillRect(sx,sy,sw,sh*0.08);
    ctx.strokeStyle='#229922'; ctx.lineWidth=2; ctx.strokeRect(sx,sy+sh*0.08,sw,2);
    ctx.fillStyle='#ffe020'; ctx.font=`bold ${Math.floor(sw*0.13)}px Impact,Arial Black,sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label,sx+sw/2,sy+sh*0.04);

    // police a produkty
    const flH=sh*(1-0.08)/floors;
    for(let fi=0;fi<floors;fi++){
      const policeY=sy+sh*0.08+(fi+1)*flH;
      // police (deska)
      const polG=ctx.createLinearGradient(sx,policeY-4,sx,policeY+4);
      polG.addColorStop(0,'#8898b8'); polG.addColorStop(1,'#5a6880');
      ctx.fillStyle=polG; ctx.fillRect(sx,policeY-4,sw,8);
      ctx.strokeStyle='#aabbd0'; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(sx,policeY-4); ctx.lineTo(sx+sw,policeY-4); ctx.stroke();

      // produkty na polici
      const prodH=flH*0.78, prodAreaY=policeY-4-prodH;
      const cnt=Math.max(3,Math.floor(sw/28));
      for(let i=0;i<cnt;i++){
        const pw=(sw-6)/cnt, px2=sx+3+i*pw;
        const [pc,ph2]=shelfProducts[(fi*cnt+i)%shelfProducts.length];
        // tělo produktu
        rrect(px2+1,prodAreaY+2,pw-2,prodH-2,3); ctx.fillStyle=pc; ctx.fill();
        // odlesk na produktu
        ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.beginPath();
        ctx.moveTo(px2+2,prodAreaY+3); ctx.lineTo(px2+pw*0.55,prodAreaY+3);
        ctx.lineTo(px2+pw*0.40,prodAreaY+prodH*0.40); ctx.lineTo(px2+2,prodAreaY+prodH*0.40); ctx.closePath(); ctx.fill();
        // etiketa
        ctx.fillStyle='rgba(255,255,255,0.70)'; ctx.fillRect(px2+1,prodAreaY+prodH*0.55,pw-2,prodH*0.25);
      }
    }
  }

  // Levý vysoký regál – modrý
  drawShelf(W*0.01, H*0.06, W*0.195, H*0.56, 'NÁPOJE & DROGERIE', 4);
  // Střední regál – perspektivní (za ním vidíme zadní zeď)
  drawShelf(W*0.24, H*0.10, W*0.155, H*0.46, 'POTRAVINY', 3);
  drawShelf(W*0.41, H*0.12, W*0.140, H*0.42, 'PEČIVO', 3);
  // MLÉKO – tajný vchod do sklepa (animovaný posun)
  const mShift = gs.story.shelf_open ? W*0.17 : (gs.shelf_sliding ? gs.shelf_anim*W*0.17 : 0);
  if(gs.story.sklep_unlocked && mShift > 0){
    const dX=W*0.57, dW2=W*0.12;
    const dTop=H*0.18, dBot=H*0.52, dH2=dBot-dTop;
    const revealed=Math.min(mShift, dW2);

    // Clip na odhalený otvor (regál se šoupá → postupně odhaluje vchod)
    ctx.save();
    ctx.beginPath(); ctx.rect(dX, dTop-H*0.02, revealed+W*0.015, dH2+H*0.06); ctx.clip();

    // Kamenný rám – boky a překlad
    ctx.fillStyle='#22180c';
    ctx.fillRect(dX-W*0.013, dTop-H*0.018, W*0.013, dH2+H*0.02); // levý sloupek
    ctx.fillRect(dX+dW2,     dTop-H*0.018, W*0.013, dH2+H*0.02); // pravý sloupek
    ctx.fillRect(dX-W*0.013, dTop-H*0.018, dW2+W*0.026, H*0.018); // překlad
    // 3D zvýraznění rámu
    ctx.fillStyle='#3a2a14';
    ctx.fillRect(dX-W*0.013, dTop-H*0.018, W*0.004, dH2+H*0.02);
    ctx.fillRect(dX-W*0.013, dTop-H*0.018, dW2+W*0.026, H*0.004);

    // Tma uvnitř
    ctx.fillStyle='#06030a'; ctx.fillRect(dX, dTop, dW2, dH2);

    // Záře svíčky z hloubky
    const glG=ctx.createRadialGradient(dX+dW2/2,dBot,2,dX+dW2/2,dBot,dW2*1.4);
    glG.addColorStop(0,'rgba(160,65,8,0.70)'); glG.addColorStop(0.4,'rgba(90,28,4,0.30)'); glG.addColorStop(1,'transparent');
    ctx.fillStyle=glG; ctx.fillRect(dX-W*0.02,dTop+dH2*0.25,dW2+W*0.04,dH2*0.8);

    // Perspektivní schody dolů
    for(let si=0;si<6;si++){
      const t=si/6;
      const sY=dTop+dH2*(0.28+t*0.52), mg=dW2*(0.04+t*0.18);
      const sX2=dX+mg, sW2=dW2-mg*2, sH2=dH2*0.065;
      ctx.fillStyle=`hsl(22,28%,${13+(5-si)*2}%)`; ctx.fillRect(sX2,sY,sW2,sH2);
      ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(sX2,sY+sH2-H*0.003,sW2,H*0.003);
      ctx.fillStyle='rgba(160,65,8,0.12)'; ctx.fillRect(sX2,sY,sW2,H*0.002);
    }

    // Otevřené dveře – jedno křídlo přihozené vlevo v perspektivě
    ctx.fillStyle='#3a2208';
    ctx.beginPath();
    ctx.moveTo(dX,        dTop);
    ctx.lineTo(dX-dW2*0.55, dTop+dH2*0.06);
    ctx.lineTo(dX-dW2*0.55, dBot-dH2*0.06);
    ctx.lineTo(dX,        dBot);
    ctx.closePath(); ctx.fill();
    // Prkna na dveřích
    ctx.strokeStyle='#261606'; ctx.lineWidth=1.5;
    for(let pi=1;pi<3;pi++){
      const py=dTop+dH2*pi/3;
      ctx.beginPath(); ctx.moveTo(dX,py); ctx.lineTo(dX-dW2*0.55,py+dH2*0.015*(pi-1.5)); ctx.stroke();
    }
    // Klika
    ctx.fillStyle='#c89828';
    ctx.beginPath(); ctx.arc(dX-dW2*0.09, dTop+dH2*0.5, 4, 0, Math.PI*2); ctx.fill();

    ctx.restore();

    // Popisek pod vchodem
    if(gs.story.shelf_open){
      ctx.fillStyle='rgba(170,70,15,0.92)';
      ctx.font=`bold ${Math.floor(W*0.009)}px Outfit,sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('▼ SCHODY DOLŮ', dX+dW2/2, dBot+H*0.028);
    }
  }
  drawShelf(W*0.57+mShift, H*0.14, W*0.120, H*0.38, 'MLÉKO', 3);

  // ── POKLADNA VPRAVO ───────────────────────────────────────────────────────
  const ckX=W*0.74, ckY=H*0.40, ckW=W*0.25, ckH=H*0.46;
  // stěna pokladny – světlá žlutá
  const ckWG=ctx.createLinearGradient(ckX,0,W,0);
  ckWG.addColorStop(0,'#e8b840'); ckWG.addColorStop(1,'#d8a830');
  ctx.fillStyle=ckWG; ctx.fillRect(ckX,0,W-ckX,H);
  // červený pruh nahoře
  ctx.fillStyle='#cc2020'; ctx.fillRect(ckX,0,W-ckX,H*0.06);
  ctx.fillStyle='#1a8a1a'; ctx.fillRect(ckX,H*0.06,W-ckX,H*0.015);
  // horní police v pokladně
  ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fillRect(ckX+W*0.01,H*0.10,W*0.23,H*0.012);
  ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fillRect(ckX+W*0.01,H*0.20,W*0.23,H*0.012);
  // produkty na policích pokladny
  for(let pi=0;pi<5;pi++){
    const [pc]=shelfProducts[(pi+6)%shelfProducts.length];
    ctx.fillStyle=pc; rrect(ckX+W*0.015+pi*W*0.042,H*0.076,W*0.038,H*0.026,3); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(ckX+W*0.015+pi*W*0.042,H*0.076,W*0.018,H*0.008);
  }
  for(let pi=0;pi<5;pi++){
    const [pc]=shelfProducts[(pi+2)%shelfProducts.length];
    ctx.fillStyle=pc; rrect(ckX+W*0.015+pi*W*0.042,H*0.168,W*0.038,H*0.026,3); ctx.fill();
  }
  // pult pokladny
  const counterY=H*0.50;
  ctx.fillStyle='#8a6a30'; ctx.fillRect(ckX-W*0.01,counterY,W*0.025+ckW,H*0.12);
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(ckX-W*0.01,counterY+H*0.12,W*0.025+ckW,H*0.005);
  // deska pulty – světlá
  const ctrTopG=ctx.createLinearGradient(0,counterY-6,0,counterY+6);
  ctrTopG.addColorStop(0,'#c8a848'); ctrTopG.addColorStop(1,'#a88830');
  ctx.fillStyle=ctrTopG; ctx.fillRect(ckX-W*0.015,counterY-6,W*0.03+ckW,12);
  // monitor pokladny (zelená obrazovka)
  ctx.fillStyle='#1a1a2a'; rrect(ckX+W*0.04,counterY-H*0.10,W*0.09,H*0.09,5); ctx.fill();
  ctx.fillStyle='#00cc60'; ctx.fillRect(ckX+W*0.048,counterY-H*0.092,W*0.074,H*0.074);
  ctx.fillStyle='#00ff80'; ctx.font=`${Math.floor(W*0.007)}px JetBrains Mono,monospace`; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText('BILLA',ckX+W*0.052,counterY-H*0.088);
  ctx.fillText('245 KČ',ckX+W*0.052,counterY-H*0.073);
  ctx.fillText('DĚKUJEME',ckX+W*0.052,counterY-H*0.058);
  // dveře napravo
  const doorX=W*0.935, doorY=H*0.10, doorW=W*0.065, doorH=H*0.58;
  ctx.fillStyle='#8898b8'; ctx.fillRect(doorX,doorY,doorW,doorH);
  ctx.fillStyle='rgba(140,180,230,0.30)'; ctx.fillRect(doorX+doorW*0.08,doorY+doorH*0.05,doorW*0.84,doorH*0.88);
  ctx.strokeStyle='#6a7888'; ctx.lineWidth=2; ctx.strokeRect(doorX,doorY,doorW,doorH);
  ctx.fillStyle='#c8a030'; ctx.beginPath(); ctx.arc(doorX+doorW*0.18,doorY+doorH*0.52,5,0,Math.PI*2); ctx.fill();
  // EXIT nápis
  ctx.fillStyle='#00cc44'; ctx.font=`bold ${Math.floor(W*0.009)}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('EXIT',doorX+doorW/2,doorY-H*0.025);

  // ── Produkty u paty předního regálu (přepadlé) ───────────────────────────
  for(let i=0;i<6;i++){
    const [pc]=shelfProducts[(i*3)%shelfProducts.length];
    const bx=W*0.02+i*W*0.025, by=H*0.62+Math.sin(i)*H*0.01;
    ctx.fillStyle=pc; rrect(bx,by,W*0.022,H*0.030,2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fillRect(bx+2,by+2,W*0.008,H*0.010);
  }

  // BILLA logo na zdi
  ctx.font=`bold ${Math.floor(W*0.032)}px Impact,Arial Black,sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.strokeStyle='#800'; ctx.lineWidth=4; ctx.strokeText('BILLA',W*0.38,H*0.052);
  ctx.fillStyle='#ee1111'; ctx.fillText('BILLA',W*0.38,H*0.052);

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

  // Základ – tma
  ctx.fillStyle='#0e0804'; ctx.fillRect(0,0,W,H);

  // Dřevěné stropní trámy
  const stropG=ctx.createLinearGradient(0,0,0,hor*0.6);
  stropG.addColorStop(0,'#1a1208'); stropG.addColorStop(1,'#241808');
  ctx.fillStyle=stropG; ctx.fillRect(0,0,W,hor);
  [W*0.18,W*0.38,W*0.62,W*0.82].forEach(tx=>{
    ctx.fillStyle='#120e06'; ctx.fillRect(tx-W*0.025,0,W*0.05,hor*0.85);
    ctx.strokeStyle='#2a1e0a'; ctx.lineWidth=1; ctx.strokeRect(tx-W*0.025,0,W*0.05,hor*0.85);
    ctx.fillStyle='rgba(255,255,255,0.02)'; ctx.fillRect(tx-W*0.025,0,W*0.012,hor*0.85);
  });

  // Zadní zeď – tmavé dřevo s lištami
  const zg=ctx.createLinearGradient(0,H*0.05,0,hor);
  zg.addColorStop(0,'#2e1c0a'); zg.addColorStop(1,'#1a1006');
  ctx.fillStyle=zg; ctx.fillRect(0,H*0.05,W,hor-H*0.05);
  ctx.strokeStyle='rgba(80,45,10,0.35)'; ctx.lineWidth=1;
  for(let x=0;x<W;x+=W*0.12){ ctx.beginPath(); ctx.moveTo(x,H*0.05); ctx.lineTo(x,hor); ctx.stroke(); }
  [H*0.15,H*0.30,H*0.44].forEach(ly=>{ ctx.beginPath(); ctx.moveTo(0,ly); ctx.lineTo(W,ly); ctx.stroke(); });

  // ── KRBY NAHOŘE UPROSTŘED ──────────────────────────────────────────────
  const fp=ROOMS.hospoda.fireplace;
  const fx=fp.rx*W, fy=fp.ry*H, fbw=W*0.15, fbh=H*0.24;
  // kamenná fasáda
  ctx.fillStyle='#3a2a18'; rrect(fx-fbw/2-22,fy-26,fbw+44,fbh+32,8); ctx.fill();
  ctx.strokeStyle='#6a4a28'; ctx.lineWidth=3; rrect(fx-fbw/2-22,fy-26,fbw+44,fbh+32,8); ctx.stroke();
  // kamenné cihly
  for(let bri=0;bri<4;bri++){ ctx.fillStyle=`hsl(25,${30+bri*3}%,${14+bri}%)`; ctx.fillRect(fx-fbw/2-22+bri*((fbw+44)/4),fy-26,(fbw+44)/4-1,10); }
  // oblouk otvoru
  ctx.fillStyle='#080404';
  ctx.beginPath(); ctx.arc(fx,fy+fbh*0.12,fbw*0.53,Math.PI,0); ctx.lineTo(fx+fbw/2,fy+fbh); ctx.lineTo(fx-fbw/2,fy+fbh); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#120808'; ctx.fillRect(fx-fbw/2,fy+fbh*0.6,fbw,fbh*0.4);
  // plameny
  for(let i=0;i<10;i++){
    const fi=i/10, flx=fx-fbw*0.42+fi*fbw*0.84;
    const flh=fbh*(0.22+0.58*Math.abs(Math.sin(ft+fi*3.8+i*0.7)));
    const flG=ctx.createLinearGradient(flx,fy+fbh,flx,fy+fbh-flh);
    flG.addColorStop(0,'rgba(255,60,0,0.95)'); flG.addColorStop(0.35,'rgba(255,140,0,0.8)'); flG.addColorStop(0.7,'rgba(255,210,30,0.5)'); flG.addColorStop(1,'rgba(255,230,80,0)');
    ctx.fillStyle=flG; ctx.beginPath(); ctx.ellipse(flx,fy+fbh-flh/2,fbw/13,flh/2,0,0,Math.PI*2); ctx.fill();
  }
  // záře krbu na scénu
  const glowG=ctx.createRadialGradient(fx,fy+fbh*0.6,0,fx,fy+fbh*0.6,W*0.38);
  glowG.addColorStop(0,`rgba(255,110,0,${0.18+0.08*Math.sin(ft*1.3)})`);
  glowG.addColorStop(0.4,`rgba(255,70,0,${0.06+0.03*Math.sin(ft)})`);
  glowG.addColorStop(1,'transparent');
  ctx.fillStyle=glowG; ctx.fillRect(0,0,W,H);
  // polička + svíčky
  ctx.fillStyle='#5a3010'; ctx.fillRect(fx-fbw/2-26,fy-30,fbw+52,10);
  [fx-fbw/2-10,fx+fbw/2+8].forEach(cx=>{
    ctx.fillStyle='#f0e090'; ctx.fillRect(cx-3,fy-54,6,24);
    const cG=ctx.createRadialGradient(cx,fy-56,0,cx,fy-56,20);
    cG.addColorStop(0,`rgba(255,200,50,${0.6+0.2*Math.sin(ft*2+cx)})`); cG.addColorStop(1,'transparent');
    ctx.fillStyle=cG; ctx.fillRect(cx-20,fy-76,40,40);
    ctx.fillStyle=`rgba(255,150,0,0.9)`; ctx.beginPath(); ctx.arc(cx,fy-54,3,0,Math.PI*2); ctx.fill();
  });
  // nápis pro hráče
  if(gs.cihalova_in_bag){
    ctx.fillStyle='rgba(255,150,50,0.9)'; ctx.font=`bold ${Math.floor(W*0.009)}px JetBrains Mono,monospace`;
    ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillText('[E] HODIT DO KRBU',fx,fy-33);
  }

  // ── LUSTER ───────────────────────────────────────────────────────────
  const luX=W*0.5,luY=H*0.11;
  ctx.strokeStyle='#777'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(luX,0); ctx.lineTo(luX,luY); ctx.stroke();
  ctx.fillStyle='#5a3a10'; ctx.beginPath(); ctx.ellipse(luX,luY,W*0.048,H*0.022,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#7a5a20'; ctx.lineWidth=1; ctx.stroke();
  for(let i=-2;i<=2;i++){
    const cx=luX+i*W*0.033, ca=0.55+0.2*Math.sin(ft*1.4+i);
    const lG=ctx.createRadialGradient(cx,luY+H*0.018,0,cx,luY+H*0.018,W*0.09);
    lG.addColorStop(0,`rgba(255,200,80,${ca*0.55})`); lG.addColorStop(1,'transparent');
    ctx.fillStyle=lG; ctx.fillRect(cx-W*0.09,luY-H*0.04,W*0.18,H*0.14);
    ctx.fillStyle=`rgba(255,160,30,${ca})`; ctx.beginPath(); ctx.arc(cx,luY+H*0.018,3,0,Math.PI*2); ctx.fill();
  }

  // Podlaha – tmavé parkety, odraz krbu
  const flG=ctx.createLinearGradient(0,hor,0,H);
  flG.addColorStop(0,'#2e1808'); flG.addColorStop(0.4,'#3a2210'); flG.addColorStop(1,'#1e1006');
  ctx.fillStyle=flG; ctx.fillRect(0,hor,W,H-hor);
  perspGrid(vpX,hor,W,H,12,10,'rgba(10,5,2,0.55)',1);
  // teplý odraz ohně na podlaze
  const fireRef=ctx.createRadialGradient(fx,H*0.7,0,fx,H*0.7,W*0.35);
  fireRef.addColorStop(0,`rgba(255,90,0,${0.07+0.04*Math.sin(ft*1.2)})`); fireRef.addColorStop(1,'transparent');
  ctx.fillStyle=fireRef; ctx.fillRect(0,hor,W,H-hor);

  // ── BAR DOLE UPROSTŘED ─────────────────────────────────────────────────
  const brX=W*0.24,brY=H*0.74,brW=W*0.52,brH=H*0.10;
  ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(brX+5,brY+brH,brW,H*0.02);
  // tělo baru – tmavé dřevo
  ctx.fillStyle='#2e1608'; rrect(brX,brY,brW,brH,8); ctx.fill();
  ctx.strokeStyle='#6a3a18'; ctx.lineWidth=2.5; rrect(brX,brY,brW,brH,8); ctx.stroke();
  // deska baru – lesklá
  const brTG=ctx.createLinearGradient(brX,brY-10,brX,brY+H*0.018);
  brTG.addColorStop(0,'#6a3820'); brTG.addColorStop(1,'#3a1e08');
  ctx.fillStyle=brTG; rrect(brX-5,brY-12,brW+10,H*0.022,6); ctx.fill();
  ctx.strokeStyle='#8a5028'; ctx.lineWidth=1.5; rrect(brX-5,brY-12,brW+10,H*0.022,6); ctx.stroke();
  // police za barem
  ctx.fillStyle='rgba(15,6,2,0.75)'; ctx.fillRect(brX,brY-H*0.22,brW,H*0.20);
  [0,H*0.07,H*0.13].forEach(off=>{ ctx.strokeStyle='rgba(70,35,8,0.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(brX,brY-H*0.22+off); ctx.lineTo(brX+brW,brY-H*0.22+off); ctx.stroke(); });
  // lahve
  const bCols=['#8b1a1a','#1a5a1a','#1a1a6a','#6a3a0a','#4a1a6a','#1a4a4a','#8a6a00','#5a1a1a'];
  for(let i=0;i<13;i++){
    const blx=brX+brW*0.04+i*(brW*0.92/13), bly=brY-H*0.205;
    ctx.fillStyle=bCols[i%bCols.length]; ctx.fillRect(blx,bly,brW*0.05,H*0.060);
    ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.fillRect(blx+1,bly+2,2,H*0.042);
    ctx.fillStyle=bCols[i%bCols.length]; ctx.fillRect(blx+brW*0.010,bly-H*0.020,brW*0.028,H*0.022);
  }
  // kohoutky
  for(let i=0;i<4;i++){
    const tx=brX+brW*0.14+i*brW*0.21;
    ctx.fillStyle='#888'; ctx.fillRect(tx-4,brY-H*0.06,8,H*0.048);
    ctx.fillStyle='#aaa'; ctx.beginPath(); ctx.arc(tx,brY-H*0.06,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ccc'; ctx.fillRect(tx-2,brY-H*0.04,4,H*0.028);
  }
  // skleničky piva
  [brX+brW*0.08,brX+brW*0.46,brX+brW*0.84].forEach(gx=>{
    ctx.strokeStyle='rgba(150,220,255,0.5)'; ctx.lineWidth=1.5; ctx.strokeRect(gx-8,brY-H*0.054,16,H*0.046);
    ctx.fillStyle='rgba(180,220,255,0.07)'; ctx.fillRect(gx-8,brY-H*0.054,16,H*0.046);
    ctx.fillStyle='rgba(255,255,215,0.38)'; ctx.beginPath(); ctx.ellipse(gx,brY-H*0.054,8,4,0,0,Math.PI*2); ctx.fill();
  });
  // barové stoličky
  [brX-W*0.058,brX+brW+W*0.018].forEach(sx=>{
    ctx.fillStyle='#4a2a10'; ctx.beginPath(); ctx.arc(sx,brY-H*0.03,W*0.024,0,Math.PI); ctx.fill();
    ctx.strokeStyle='#888'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(sx-W*0.018,brY-H*0.03); ctx.lineTo(sx-W*0.009,brY+H*0.048); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx+W*0.018,brY-H*0.03); ctx.lineTo(sx+W*0.009,brY+H*0.048); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx-W*0.018,brY+H*0.014); ctx.lineTo(sx+W*0.018,brY+H*0.014); ctx.stroke();
  });
  // stoly v místnosti
  [[W*0.12,H*0.61],[W*0.76,H*0.60],[W*0.44,H*0.64]].forEach(([tx,ty])=>{
    ctx.fillStyle='#3a2010'; ctx.beginPath(); ctx.ellipse(tx,ty,W*0.062,H*0.032,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#6a3a18'; ctx.lineWidth=1.5; ctx.stroke();
    ctx.strokeStyle='rgba(150,220,255,0.4)'; ctx.lineWidth=1; ctx.strokeRect(tx-7,ty-H*0.028,14,H*0.024);
    ctx.fillStyle='rgba(180,220,255,0.07)'; ctx.fillRect(tx-7,ty-H*0.028,14,H*0.024);
  });

  // ── Jiskry/žhavé uhlíky z krbu – stoupají nahoru — VÝRAZNÉ ──
  ctx.save();
  const fpx=fp.rx*W, fpy=fp.ry*H+H*0.24;
  for(let i=0;i<15;i++){
    const life=((t*0.0008+i*0.14)%1);
    const sx2=fpx+(Math.sin(i*7.3+t*0.001)*W*0.08);
    const sy2=fpy-life*H*0.40;
    const sparkA=(1-life)*0.65;
    const sparkSz=1.0+Math.abs(Math.sin(i*3.1))*(1-life)*1.5;
    const r=255, g=Math.floor(160-life*120), b=Math.floor(30-life*30);
    ctx.fillStyle=`rgba(${r},${g},${b},${sparkA})`;
    ctx.beginPath(); ctx.arc(sx2,sy2,sparkSz,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Kouřový opar ──
  ctx.save();
  for(let i=0;i<8;i++){
    const smokeLife=((t*0.00015+i*0.18)%1);
    const smX=W*0.15+Math.sin(i*43.7)*W*0.7+(Math.sin(t*0.0004+i)*W*0.06);
    const smY=H*0.65-smokeLife*H*0.45;
    const smR=W*0.04+smokeLife*W*0.06;
    const smA=0.04*(1-smokeLife)*(1-smokeLife);
    ctx.fillStyle=`rgba(160,140,120,${smA})`;
    ctx.beginPath(); ctx.arc(smX,smY,smR,0,Math.PI*2); ctx.fill();
  }
  // Jemný opar pod stropem
  const smokeG=ctx.createLinearGradient(0,0,0,H*0.20);
  smokeG.addColorStop(0,'rgba(80,60,40,0.08)'); smokeG.addColorStop(1,'transparent');
  ctx.fillStyle=smokeG; ctx.fillRect(0,0,W,H*0.20);
  ctx.restore();

  // ── Prachové částice ve světle lustru ──
  ctx.save();
  for(let i=0;i<14;i++){
    const dx=W*0.2+Math.sin(i*137.508)*W*0.6;
    const dy=H*0.08+((t*0.0001+i*0.14)%1)*H*0.45;
    const da=0.10+0.15*Math.abs(Math.sin(t*0.0014+i*1.3));
    const sz2=0.7+Math.abs(Math.sin(i*5))*0.5;
    ctx.fillStyle=`rgba(255,200,100,${da})`;
    ctx.beginPath(); ctx.arc(dx,dy,sz2,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Mates – tělo a krvácení z krku ──
  if(gs.mates_death_anim){
    drawDeathBody(gs.mates_death_anim, t, '#e87040', 'mates');
  }
  // Milan může zemřít i v hospodě (čeká na Matese)
  if(gs.milan_death_anim){
    drawDeathBody(gs.milan_death_anim, t, '#06b6d4', 'milan');
  }
  // Šaman – mrtvé tělo po OBÍDEK cheatu
  if(gs.saman_death_anim){
    drawDeathBody(gs.saman_death_anim, t, '#8b5cf6', 'saman');
  }
  // Šaman – nahý po OBÍDEK, před zastřelením
  if(gs.saman_naked_anim){
    drawNakedSaman(gs.saman_naked_anim, t);
  }
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

  // ── Déšť — vrstvený, s gradientními kapkami a cáknutím ──
  ctx.save();
  ctx.lineCap='round';
  // Zadní vrstva – menší, světlejší kapky (pozadí)
  for(let i=0;i<90;i++){
    const speed=0.24;
    const rx=((i*91.3+t*speed)%(W*1.2))-W*0.1;
    const ry=((i*57.7+t*speed*1.9)%(H*1.2))-H*0.1;
    const rLen=H*0.022+Math.sin(i*3.1)*H*0.006;
    const rA=0.12+0.06*Math.sin(i*7.1);
    const g=ctx.createLinearGradient(rx,ry,rx-2,ry+rLen);
    g.addColorStop(0,`rgba(200,215,240,0)`);
    g.addColorStop(1,`rgba(200,215,240,${rA})`);
    ctx.strokeStyle=g; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-2,ry+rLen); ctx.stroke();
  }
  // Přední vrstva – delší, ostřejší kapky s hlavou
  for(let i=0;i<140;i++){
    const speed=0.42;
    const rx=((i*73.7+t*speed)%(W*1.2))-W*0.1;
    const ry=((i*41.3+t*speed*1.75)%(H*1.2))-H*0.1;
    const rLen=H*0.045+Math.sin(i*2.3)*H*0.012;
    const rA=0.28+0.14*Math.sin(i*5.1);
    // ocásek kapky – gradient
    const g=ctx.createLinearGradient(rx,ry,rx-4,ry+rLen);
    g.addColorStop(0,`rgba(220,230,250,0)`);
    g.addColorStop(0.4,`rgba(180,200,235,${rA*0.5})`);
    g.addColorStop(1,`rgba(220,235,255,${rA})`);
    ctx.strokeStyle=g; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx-4,ry+rLen); ctx.stroke();
    // hlava kapky – malý jasný bod na konci
    ctx.fillStyle=`rgba(235,245,255,${rA*0.9})`;
    ctx.beginPath(); ctx.arc(rx-4,ry+rLen,0.9,0,Math.PI*2); ctx.fill();
  }
  // Cáknutí na dlažbě – malé elipsy na náhodných místech u země
  for(let i=0;i<22;i++){
    const sx=((i*137.2+t*0.04)%(W*1.1))-W*0.05;
    const sy=H*0.82+Math.sin(i*4.7)*H*0.08;
    const life=((t*0.0018+i*0.31)%1);
    if(life<0.5){
      const sz=1.5+life*8;
      const sA=(1-life*2)*0.35;
      ctx.strokeStyle=`rgba(200,220,245,${sA})`;
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.ellipse(sx,sy,sz,sz*0.25,0,0,Math.PI*2); ctx.stroke();
      // Malé odlétající kapičky
      if(life<0.3){
        const spA=(0.3-life)/0.3*0.5;
        ctx.fillStyle=`rgba(220,235,255,${spA})`;
        ctx.beginPath(); ctx.arc(sx-sz*0.7,sy-life*8,0.7,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx+sz*0.7,sy-life*8,0.7,0,Math.PI*2); ctx.fill();
      }
    }
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

}

// ─── Šaman OBÍDEK – nahý šílený šaman ───────────────────────────────────────
function drawNakedSaman(anim, t){
  const x = anim.x, y = anim.y;
  const phase = anim.phase;
  const isRunning = phase === 'running';
  // Bouncing krok při běhu
  const bob = isRunning ? Math.abs(Math.sin(t * 0.022)) * 7 : 0;
  const bY = y - bob;
  const flip = anim.flipX || 1;

  // Odhozené kalhoty v rohu (jakmile se svléká)
  if(phase !== 'reaction' && anim.pantsX){
    ctx.save();
    ctx.translate(anim.pantsX, anim.pantsY);
    ctx.rotate(0.4);
    // stín
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath(); ctx.ellipse(2, 6, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
    // kalhoty
    ctx.fillStyle = '#3a2c5a';
    ctx.fillRect(-18, -8, 36, 14);
    ctx.fillStyle = '#241a3e';
    ctx.fillRect(-15, -6, 13, 12);
    ctx.fillRect(2, -6, 13, 12);
    // pásek
    ctx.fillStyle = '#1a0f08';
    ctx.fillRect(-18, -10, 36, 4);
    ctx.restore();
  }

  // Stín pod tělem
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(x + 3, y + 28, 22, 8, 0.05, 0, Math.PI * 2); ctx.fill();

  // Tělo (nahá kůže místo fialového roucha)
  const skin = '#fde0b8';
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(x, bY, 25, 0, Math.PI * 2); ctx.fill();
  // chlupy na hrudi
  ctx.fillStyle = 'rgba(60,30,10,0.55)';
  for(let i = 0; i < 8; i++){
    const hx = x - 10 + Math.sin(i * 1.7) * 9;
    const hy = bY - 4 + Math.cos(i * 2.1) * 6;
    ctx.beginPath(); ctx.arc(hx, hy, 1.2, 0, Math.PI * 2); ctx.fill();
  }

  // Nohy (běh – ploutvení)
  ctx.fillStyle = skin;
  if(isRunning){
    const lphase = Math.sin(t * 0.025);
    ctx.save(); ctx.translate(x - 8, bY + 18); ctx.rotate(lphase * 0.5);
    ctx.fillRect(-4, 0, 8, 16); ctx.restore();
    ctx.save(); ctx.translate(x + 8, bY + 18); ctx.rotate(-lphase * 0.5);
    ctx.fillRect(-4, 0, 8, 16); ctx.restore();
  } else {
    ctx.fillRect(x - 12, bY + 18, 8, 16);
    ctx.fillRect(x + 4,  bY + 18, 8, 16);
  }

  // Genitálie (cenzurované rozmazaným pixelem) – jen v naked fázích
  ctx.fillStyle = '#7a5a38';
  ctx.fillRect(x - 5 * flip, bY + 14, 10, 8);
  // pixelace přes
  ctx.fillStyle = 'rgba(40,25,15,0.55)';
  for(let i = 0; i < 3; i++) for(let j = 0; j < 2; j++)
    ctx.fillRect(x - 5 + i * 4, bY + 14 + j * 4, 3, 3);

  // Ruce (mávají při běhu)
  ctx.strokeStyle = skin; ctx.lineWidth = 6; ctx.lineCap = 'round';
  if(isRunning){
    const aphase = Math.sin(t * 0.025 + Math.PI);
    ctx.beginPath();
    ctx.moveTo(x - 18, bY); ctx.lineTo(x - 28, bY - 12 + aphase * 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 18, bY); ctx.lineTo(x + 28, bY - 12 - aphase * 18);
    ctx.stroke();
  } else if(phase === 'aiming'){
    // jedna ruka drží pistoli u hlavy
    ctx.beginPath();
    ctx.moveTo(x + 18, bY - 4); ctx.lineTo(x + 18, bY - 28);
    ctx.stroke();
    // druhá visí
    ctx.beginPath();
    ctx.moveTo(x - 18, bY); ctx.lineTo(x - 22, bY + 14);
    ctx.stroke();
  } else {
    // undressing/reaction – ruce nahoru
    const wave = Math.sin(t * 0.012) * 6;
    ctx.beginPath();
    ctx.moveTo(x - 18, bY); ctx.lineTo(x - 26, bY - 22 + wave);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 18, bY); ctx.lineTo(x + 26, bY - 22 - wave);
    ctx.stroke();
  }

  // Hlava
  ctx.fillStyle = '#fde8c8';
  ctx.beginPath(); ctx.arc(x, bY - 24, 20, 0, Math.PI * 2); ctx.fill();

  // Šílený obličej
  if(phase === 'aiming'){
    // přivřené šílené oči
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 7, bY - 24, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 7, bY - 24, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x - 7, bY - 24, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 7, bY - 24, 2.5, 0, Math.PI * 2); ctx.fill();
    // smutná ústa
    ctx.strokeStyle = '#1a0606'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, bY - 14, 5, 0.2, Math.PI - 0.2); ctx.stroke();
    // pistole u spánku
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 14, bY - 28, 16, 6);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(x + 22, bY - 24, 4, 10);
    // hlaveň lesk
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 14, bY - 28, 16, 1.5);
  } else {
    // vyboulené šílené oči
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 7, bY - 24, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 7, bY - 24, 8, 0, Math.PI * 2); ctx.fill();
    // zorničky se hýbou náhodně
    const tw = Math.sin(t * 0.015) * 2;
    const ty = Math.cos(t * 0.013) * 1.5;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x - 7 + tw, bY - 24 + ty, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 7 + tw, bY - 24 + ty, 3, 0, Math.PI * 2); ctx.fill();
    // řičící otevřená ústa
    ctx.fillStyle = '#1a0606';
    ctx.beginPath(); ctx.ellipse(x, bY - 12, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
    // jazyk
    ctx.fillStyle = '#c83040';
    ctx.beginPath(); ctx.ellipse(x, bY - 10, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
    // zuby
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 6, bY - 16, 2.5, 2);
    ctx.fillRect(x + 3.5, bY - 16, 2.5, 2);
  }

  // Vlasy/divoké chlupy na hlavě
  ctx.strokeStyle = '#3a2008'; ctx.lineWidth = 2;
  for(let i = 0; i < 7; i++){
    const ang = (i / 7) * Math.PI - Math.PI;
    const sway = Math.sin(t * 0.01 + i) * 3;
    const hx1 = x + Math.cos(ang) * 18;
    const hy1 = bY - 24 + Math.sin(ang) * 18;
    const hx2 = x + Math.cos(ang) * 26 + sway;
    const hy2 = bY - 24 + Math.sin(ang) * 26 - 5;
    ctx.beginPath(); ctx.moveTo(hx1, hy1); ctx.lineTo(hx2, hy2); ctx.stroke();
  }

  // "OBÍDEK!" balónek nad hlavou
  if(phase === 'running' || phase === 'undressing'){
    const txts = ['OBÍDEK!', 'OBÍÍÍDEK!!', 'OBÍDEK!!!'];
    const txt = txts[Math.floor(t / 350) % 3];
    ctx.font = `bold 18px Outfit,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const tw2 = ctx.measureText(txt).width + 16;
    const bx = x - tw2 / 2, by = bY - 70;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    rrect(bx, by, tw2, 24, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(220,30,30,0.95)'; ctx.lineWidth = 2;
    rrect(bx, by, tw2, 24, 6); ctx.stroke();
    ctx.fillStyle = '#ff4040';
    ctx.fillText(txt, x, by + 18);
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

// ─── Johnnyho vila – obývák (propracovaný) ───────────────────────────────────
function drawJohnnyVila(W,H,t){
  const ft = t * 0.001;
  // ── Podlaha – parketový vzor ──
  ctx.fillStyle='#2a2028'; ctx.fillRect(0,0,W,H);
  const floorG=ctx.createLinearGradient(0,H*0.48,0,H);
  floorG.addColorStop(0,'#483a50'); floorG.addColorStop(1,'#352840');
  ctx.fillStyle=floorG; ctx.fillRect(0,H*0.48,W,H*0.52);
  // Parkety
  for(let px=0;px<W;px+=40) for(let py=H*0.48;py<H;py+=18){
    const off=(Math.floor(py/18)%2)*20;
    ctx.strokeStyle='rgba(90,60,80,0.30)'; ctx.lineWidth=0.5;
    ctx.strokeRect(px+off,py,40,18);
  }
  // ── Tapeta – vínová s ornamentem ──
  ctx.fillStyle='#302540'; ctx.fillRect(0,0,W,H*0.48);
  for(let rx=0;rx<W;rx+=60) for(let ry=0;ry<H*0.48;ry+=60){
    ctx.strokeStyle='rgba(100,60,130,0.12)'; ctx.lineWidth=0.5;
    ctx.strokeRect(rx,ry,60,60);
    // Diamantový ornament
    ctx.beginPath();
    ctx.moveTo(rx+30,ry+8); ctx.lineTo(rx+52,ry+30); ctx.lineTo(rx+30,ry+52); ctx.lineTo(rx+8,ry+30);
    ctx.closePath(); ctx.strokeStyle='rgba(140,80,170,0.10)'; ctx.stroke();
  }
  // Lišta na zdi
  ctx.fillStyle='rgba(100,65,90,0.35)'; ctx.fillRect(0,H*0.46,W,H*0.04);
  ctx.strokeStyle='rgba(140,90,120,0.25)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,H*0.46); ctx.lineTo(W,H*0.46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,H*0.50); ctx.lineTo(W,H*0.50); ctx.stroke();

  // ── Koberec pod pohovkou ──
  ctx.fillStyle='rgba(120,50,70,0.18)';
  rrect(W*0.10,H*0.55,W*0.45,H*0.30,4); ctx.fill();
  ctx.strokeStyle='rgba(160,70,90,0.15)'; ctx.lineWidth=1;
  rrect(W*0.12,H*0.57,W*0.41,H*0.26,3); ctx.stroke();

  // ── Pohovka – detailnější ──
  const sx=W*0.14, sy=H*0.58;
  // Opěradlo
  ctx.fillStyle='#5a3560'; rrect(sx,sy-H*0.04,W*0.32,H*0.08,5); ctx.fill();
  // Sedák
  ctx.fillStyle='#6a4070'; rrect(sx,sy+H*0.02,W*0.32,H*0.14,5); ctx.fill();
  // Polštáře
  ctx.fillStyle='#7a4880'; rrect(sx+6,sy+H*0.03,W*0.09,H*0.08,3); ctx.fill();
  ctx.fillStyle='#724078'; rrect(sx+W*0.12,sy+H*0.03,W*0.09,H*0.08,3); ctx.fill();
  ctx.fillStyle='#7a4880'; rrect(sx+W*0.22,sy+H*0.03,W*0.09,H*0.08,3); ctx.fill();
  // Nožičky
  ctx.fillStyle='#3a2530'; ctx.fillRect(sx+4,sy+H*0.16,5,H*0.04);
  ctx.fillRect(sx+W*0.32-9,sy+H*0.16,5,H*0.04);
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

  // ── Kuchyňská linka – propracovaná ──
  const kx=W*0.72, ky=H*0.48;
  // Spodní skříňky
  ctx.fillStyle='#3a3248'; ctx.fillRect(kx,ky+H*0.10,W*0.24,H*0.18);
  ctx.strokeStyle='#5a4878'; ctx.lineWidth=1; ctx.strokeRect(kx,ky+H*0.10,W*0.24,H*0.18);
  // Dvířka
  for(let d=0;d<3;d++){
    const ddx=kx+W*0.02+d*W*0.075;
    ctx.strokeStyle='rgba(120,90,150,0.30)'; ctx.lineWidth=0.5;
    rrect(ddx,ky+H*0.12,W*0.065,H*0.14,2); ctx.stroke();
    ctx.fillStyle='rgba(170,120,200,0.20)'; ctx.fillRect(ddx+W*0.025,ky+H*0.17,W*0.015,H*0.03);
  }
  // Deska
  ctx.fillStyle='#4a3a55'; ctx.fillRect(kx-2,ky+H*0.08,W*0.248,H*0.04);
  ctx.strokeStyle='rgba(120,90,150,0.35)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(kx-2,ky+H*0.08); ctx.lineTo(kx+W*0.246,ky+H*0.08); ctx.stroke();
  // Horní police
  ctx.fillStyle='#342848'; ctx.fillRect(kx+W*0.02,ky,W*0.20,H*0.06);
  ctx.strokeStyle='rgba(120,90,150,0.25)'; ctx.lineWidth=0.5; ctx.strokeRect(kx+W*0.02,ky,W*0.20,H*0.06);
  // Talíře na polici
  for(let tp=0;tp<4;tp++){
    ctx.fillStyle='rgba(200,200,210,0.25)'; ctx.beginPath();
    ctx.arc(kx+W*0.05+tp*W*0.05,ky+H*0.04,4,0,Math.PI*2); ctx.fill();
  }
  // Drink na lince
  if(!gs.story.jana_drugged_villa){
    ctx.fillStyle='rgba(200,230,255,0.7)'; rrect(kx+W*0.08,ky+H*0.09,W*0.025,H*0.07,2); ctx.fill();
    ctx.strokeStyle='rgba(150,180,220,0.5)'; ctx.lineWidth=1; rrect(kx+W*0.08,ky+H*0.09,W*0.025,H*0.07,2); ctx.stroke();
    // Brčko
    ctx.strokeStyle='rgba(255,100,150,0.6)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(kx+W*0.09,ky+H*0.05); ctx.lineTo(kx+W*0.093,ky+H*0.10); ctx.stroke();
  }
  // Dřez
  ctx.fillStyle='rgba(80,90,100,0.4)'; rrect(kx+W*0.15,ky+H*0.09,W*0.05,H*0.04,1); ctx.fill();
  ctx.fillStyle='rgba(150,160,170,0.3)'; ctx.fillRect(kx+W*0.17,ky+H*0.06,W*0.01,H*0.04);

  // ── Okno – větší, s závěsy ──
  const wx=W*0.38, wy=H*0.06;
  // Závěsy
  ctx.fillStyle='rgba(100,30,50,0.25)'; ctx.fillRect(wx-W*0.04,wy-H*0.02,W*0.06,H*0.26);
  ctx.fillRect(wx+W*0.20,wy-H*0.02,W*0.06,H*0.26);
  // Sklo
  ctx.fillStyle='rgba(30,50,90,0.35)'; ctx.fillRect(wx,wy,W*0.22,H*0.20);
  // Noční obloha
  ctx.fillStyle='rgba(20,25,60,0.5)'; ctx.fillRect(wx+2,wy+2,W*0.22-4,H*0.20-4);
  // Hvězdy
  for(let s=0;s<6;s++){
    const stx=wx+4+Math.sin(s*2.1)*W*0.08+W*0.11;
    const sty=wy+4+Math.cos(s*1.7)*H*0.07+H*0.10;
    const sb=Math.sin(ft*2+s)*0.3+0.7;
    ctx.fillStyle=`rgba(255,255,200,${sb*0.6})`;
    ctx.fillRect(stx,sty,2,2);
  }
  // Rám okna
  ctx.strokeStyle='rgba(120,100,80,0.5)'; ctx.lineWidth=2; ctx.strokeRect(wx,wy,W*0.22,H*0.20);
  ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(wx+W*0.11,wy); ctx.lineTo(wx+W*0.11,wy+H*0.20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wx,wy+H*0.10); ctx.lineTo(wx+W*0.22,wy+H*0.10); ctx.stroke();

  // ── Obraz na zdi ──
  ctx.fillStyle='rgba(55,40,65,0.7)'; rrect(W*0.08,H*0.10,W*0.12,H*0.16,2); ctx.fill();
  ctx.strokeStyle='rgba(200,160,80,0.45)'; ctx.lineWidth=2; rrect(W*0.08,H*0.10,W*0.12,H*0.16,2); ctx.stroke();
  ctx.fillStyle='rgba(60,100,60,0.3)'; ctx.fillRect(W*0.09,H*0.12,W*0.10,H*0.10);
  ctx.fillStyle='rgba(80,130,80,0.2)'; ctx.beginPath();
  ctx.moveTo(W*0.09,H*0.22); ctx.lineTo(W*0.12,H*0.14); ctx.lineTo(W*0.15,H*0.18); ctx.lineTo(W*0.19,H*0.12); ctx.lineTo(W*0.19,H*0.22);
  ctx.closePath(); ctx.fill();

  // ── TV na stěně ──
  ctx.fillStyle='#0a0a0a'; rrect(W*0.65,H*0.08,W*0.18,H*0.12,2); ctx.fill();
  ctx.strokeStyle='rgba(60,60,60,0.4)'; ctx.lineWidth=1.5; rrect(W*0.65,H*0.08,W*0.18,H*0.12,2); ctx.stroke();
  // TV svit
  const tvglow=Math.sin(ft*3)*0.1+0.2;
  ctx.fillStyle=`rgba(40,80,140,${tvglow})`; ctx.fillRect(W*0.655,H*0.085,W*0.17,H*0.11);

  // ── Lampa v rohu ──
  ctx.fillStyle='#4a3a30'; ctx.fillRect(W*0.04,H*0.56,W*0.02,H*0.22);
  ctx.fillStyle='rgba(255,210,120,0.25)'; ctx.beginPath();
  ctx.arc(W*0.05,H*0.54,14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#6a5040'; rrect(W*0.03,H*0.50,W*0.04,H*0.06,2); ctx.fill();

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

  // ── Kapající voda z baterie – jen krátké kapky padající do dřezu ──
  ctx.save();
  const dripX=W*0.40, dripStartY=H*0.36;
  const dripLen=H*0.06; // kapky padají jen krátce – do dřezu, ne na zem
  for(let d=0;d<4;d++){
    const dPhase=((ft*0.6+d*0.27)%1);
    const dY=dripStartY+dPhase*dripLen;
    const dA=(1-dPhase*0.4)*0.85;
    // kapka
    const dG=ctx.createLinearGradient(dripX,dY-4,dripX,dY+4);
    dG.addColorStop(0,`rgba(180,210,255,${dA*0.5})`); dG.addColorStop(1,`rgba(100,150,220,${dA})`);
    ctx.fillStyle=dG;
    ctx.beginPath(); ctx.ellipse(dripX,dY,1.6,4,0,0,Math.PI*2); ctx.fill();
    // lesk
    ctx.fillStyle=`rgba(255,255,255,${dA*0.6})`;
    ctx.beginPath(); ctx.arc(dripX-0.5,dY-1.5,0.5,0,Math.PI*2); ctx.fill();
    // mikro-cáknutí v dřezu
    if(dPhase>0.85){
      const spA=(dPhase-0.85)/0.15;
      ctx.strokeStyle=`rgba(150,180,220,${(1-spA)*0.55})`;
      ctx.lineWidth=0.7;
      ctx.beginPath(); ctx.ellipse(dripX,dripStartY+dripLen,1.5+spA*3,0.6+spA*1,0,0,Math.PI*2); ctx.stroke();
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

  // ─── Figurová – leží po skopnutí (vlevo od pentagramu) ──────────────────
  if(gs.story.figurova_kicked){
    const fx=W*0.22, fy=H*0.78;
    const dead=gs.story.figurova_dead_sklep;
    // loužička krve (roste po smrti)
    const poolR = dead ? W*0.055 : W*0.030;
    const poolAlpha = dead ? 0.65 : 0.38;
    const poolColor = dead ? `rgba(140,0,0,${poolAlpha})` : `rgba(71,85,105,${poolAlpha})`;
    ctx.fillStyle=poolColor;
    ctx.beginPath(); ctx.ellipse(fx+8,fy+10,poolR,poolR*0.42,0.2,0,Math.PI*2); ctx.fill();
    // tělo
    ctx.save(); ctx.translate(fx,fy); ctx.rotate(Math.PI/2.3);
    ctx.fillStyle='rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(5,5,W*0.038,H*0.055,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#475569'; ctx.beginPath(); ctx.ellipse(0,0,W*0.038,H*0.055,0,0,Math.PI*2); ctx.fill();
    if(!dead){
      // hlava s brýlemi a zkříženýma očima
      ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(-W*0.030,-H*0.005,W*0.022,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(80,80,80,0.8)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(-W*0.030-W*0.008,-H*0.005,W*0.007,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(-W*0.030+W*0.008,-H*0.005,W*0.007,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-W*0.030-W*0.015,-H*0.005); ctx.lineTo(-W*0.030-W*0.001,-H*0.005); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-W*0.030+W*0.001,-H*0.005); ctx.lineTo(-W*0.030+W*0.015,-H*0.005); ctx.stroke();
      ctx.strokeStyle='rgba(0,0,0,0.75)'; ctx.lineWidth=1.5;
      [[-W*0.030-W*0.008,-H*0.005],[-W*0.030+W*0.008,-H*0.005]].forEach(([ex,ey])=>{
        ctx.beginPath(); ctx.moveTo(ex-W*0.006,ey-H*0.006); ctx.lineTo(ex+W*0.006,ey+H*0.006); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex+W*0.006,ey-H*0.006); ctx.lineTo(ex-W*0.006,ey+H*0.006); ctx.stroke();
      });
    } else {
      // bez hlavy – krvavý pahýl krku
      const ng=ctx.createRadialGradient(-W*0.030,-H*0.005,0,-W*0.030,-H*0.005,W*0.020);
      ng.addColorStop(0,'rgba(200,0,0,0.95)'); ng.addColorStop(1,'rgba(100,0,0,0)');
      ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(-W*0.030,-H*0.005,W*0.020,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    // popisek
    ctx.save(); ctx.font=`bold ${Math.floor(W*0.011)}px JetBrains Mono,monospace`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=dead?'rgba(140,0,0,0.45)':'rgba(71,85,105,0.50)';
    ctx.fillText('Figurová', fx, fy+H*0.082);
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

  // ── Pozadí – stěna s texturou ──────────────────────────────────────────
  const wG = ctx.createLinearGradient(0, 0, 0, flY);
  wG.addColorStop(0, '#12101c'); wG.addColorStop(0.5, '#1a1630'); wG.addColorStop(1, '#1e1a2e');
  ctx.fillStyle = wG; ctx.fillRect(0, 0, W, H);

  // Podlaha – dřevěná
  const flG = ctx.createLinearGradient(0, flY, 0, H);
  flG.addColorStop(0, '#2a1e14'); flG.addColorStop(0.5, '#221810'); flG.addColorStop(1, '#1a120c');
  ctx.fillStyle = flG; ctx.fillRect(0, flY, W, H - flY);
  // Prkna podlahy
  ctx.strokeStyle = 'rgba(60,40,20,0.4)'; ctx.lineWidth = 1;
  for(let i = 0; i < 12; i++){
    const ly = flY + (H - flY) * (i / 12);
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
  }
  // Lišta
  ctx.fillStyle = '#3a2a20'; ctx.fillRect(0, flY - 3, W, 6);

  // ── Okno (vpravo nahoře) – noční výhled ────────────────────────────────
  const wx = W * 0.78, wy = H * 0.08, ww = W * 0.16, wh = H * 0.28;
  // Výhled
  const skyG = ctx.createLinearGradient(wx, wy, wx, wy + wh);
  skyG.addColorStop(0, '#050820'); skyG.addColorStop(1, '#0a1040');
  ctx.fillStyle = skyG; ctx.fillRect(wx, wy, ww, wh);
  // Měsíc
  ctx.fillStyle = 'rgba(255,240,200,0.8)';
  ctx.beginPath(); ctx.arc(wx + ww * 0.7, wy + wh * 0.25, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#050820';
  ctx.beginPath(); ctx.arc(wx + ww * 0.7 + 3, wy + wh * 0.25 - 2, 7, 0, Math.PI * 2); ctx.fill();
  // Hvězdy
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for(let s = 0; s < 8; s++){
    const sx = wx + 8 + s * (ww - 16) / 7;
    const sy = wy + 6 + Math.sin(s * 3.7 + t * 0.0008) * 6 + (s % 3) * 10;
    const sz = 0.6 + 0.4 * Math.sin(s * 5 + t * 0.003);
    ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI * 2); ctx.fill();
  }
  // Rám okna
  ctx.strokeStyle = '#4a3a50'; ctx.lineWidth = 4; ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2); ctx.stroke();
  // Záclony
  ctx.fillStyle = 'rgba(80,60,100,0.3)';
  ctx.fillRect(wx - 10, wy - 5, 14, wh + 10);
  ctx.fillRect(wx + ww - 4, wy - 5, 14, wh + 10);

  // ── Postel (vpravo) ────────────────────────────────────────────────────
  const bx = W * 0.72, by = flY + 6;
  // Rám
  ctx.fillStyle = '#2a1a12'; ctx.fillRect(bx, by, W * 0.24, H * 0.16);
  // Matrace
  ctx.fillStyle = '#2a2050'; ctx.fillRect(bx + 3, by + 3, W * 0.24 - 6, H * 0.16 - 6);
  // Deka
  const dekaG = ctx.createLinearGradient(bx, by, bx + W * 0.24, by);
  dekaG.addColorStop(0, '#3a2860'); dekaG.addColorStop(1, '#4a3078');
  ctx.fillStyle = dekaG; ctx.fillRect(bx + 3, by + 8, W * 0.24 - 6, H * 0.12);
  // Čelo postele
  ctx.fillStyle = '#3a2218'; ctx.fillRect(bx + W * 0.21, by - 14, W * 0.03, H * 0.16 + 14);
  // Polštář
  ctx.fillStyle = '#e8e0f4';
  ctx.beginPath(); ctx.ellipse(bx + W * 0.19, by + 12, 16, 10, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d8d0e8';
  ctx.beginPath(); ctx.ellipse(bx + W * 0.19, by + 12, 14, 8, -0.15, 0, Math.PI * 2); ctx.fill();

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

      // ── Bite animation: Kubátová jde k Figurové a vrátí se ──
      let kx=pcx2, ky=pcy2, kneeling=false;
      if(gs.kubatova_bite_anim){
        const el=(gs.ts-gs.kubatova_bite_anim.startTime)/1000;
        const bfx=gs.kubatova_bite_anim.figX, bfy=gs.kubatova_bite_anim.figY;
        if(el<0.7){
          const p2=el/0.7, ep=p2*p2;
          kx=pcx2+(bfx-pcx2)*ep; ky=pcy2+(bfy-pcy2)*ep;
        } else if(el<3.7){
          kx=bfx; ky=bfy; kneeling=true;
        } else if(el<4.5){
          const p2=(el-3.7)/0.8, ep=1-(1-p2)*(1-p2);
          kx=bfx+(pcx2-bfx)*ep; ky=bfy+(pcy2-bfy)*ep;
        } else {
          kx=pcx2; ky=pcy2;
        }
      }
      const inPentagram=!gs.kubatova_bite_anim||(kx===pcx2&&ky===pcy2);

      // řetězy jen v pentagramu
      if(inPentagram){
        const ka=Math.sin(t*0.001)*0.08;
        [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx,dy])=>{
          ctx.strokeStyle='rgba(90,70,40,0.85)'; ctx.lineWidth=2.5;
          ctx.beginPath(); ctx.moveTo(pcx2+dx*55,pcy2+dy*40); ctx.lineTo(pcx2+dx*20,pcy2+dy*16); ctx.stroke();
          ctx.strokeStyle='rgba(120,90,50,0.6)'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.ellipse(pcx2+dx*55,pcy2+dy*40,6,4,ka,0,Math.PI*2); ctx.stroke();
        });
      }

      // záře
      const kag=ctx.createRadialGradient(kx,ky,0,kx,ky,55*ksz);
      kag.addColorStop(0,'rgba(220,0,0,0.35)'); kag.addColorStop(1,'transparent');
      ctx.fillStyle=kag; ctx.beginPath(); ctx.arc(kx,ky,55*ksz,0,Math.PI*2); ctx.fill();

      if(kneeling){
        // Kleká nad tělem – přikrčená (squash+rotate)
        ctx.save(); ctx.translate(kx,ky+10*ksz); ctx.rotate(0.25);
        ctx.fillStyle=n.color; ctx.beginPath(); ctx.ellipse(0,0,30*ksz,16*ksz,0,0,Math.PI*2); ctx.fill();
        // ruce dolů k tělu
        ctx.strokeStyle=n.color; ctx.lineWidth=7*ksz; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-20*ksz,-2*ksz); ctx.lineTo(-32*ksz,14*ksz); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20*ksz,-2*ksz); ctx.lineTo(30*ksz,14*ksz); ctx.stroke();
        ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(0,-22*ksz,18*ksz,0,Math.PI*2); ctx.fill();
        drawPixelFace(0,-22*ksz,ksz);
        ctx.restore();
      } else {
        // Normální stoj
        ctx.fillStyle=n.color; ctx.beginPath(); ctx.ellipse(kx,ky,30*ksz,26*ksz,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=n.color; ctx.lineWidth=8*ksz; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(kx-28*ksz,ky); ctx.lineTo(kx-52*ksz,ky-12*ksz); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(kx+28*ksz,ky); ctx.lineTo(kx+52*ksz,ky-12*ksz); ctx.stroke();
        ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(kx,ky-22*ksz,20*ksz,0,Math.PI*2); ctx.fill();
        drawPixelFace(kx,ky-22*ksz,ksz);
        // třesoucí se efekt (jen v pentagramu)
        if(inPentagram){
          const shk=Math.sin(t*0.018)*2.5;
          ctx.fillStyle='rgba(255,0,0,0.18)'; ctx.beginPath(); ctx.arc(kx+shk,ky-22*ksz,22*ksz,0,Math.PI*2); ctx.fill();
        }
      }

      ctx.textBaseline='alphabetic';
      ctx.fillStyle='#dc2626'; ctx.font=`bold ${13*Math.min(ksz,1.3)}px Outfit,sans-serif`;
      ctx.textAlign='center'; ctx.fillText(n.name,kx,ky-(46+16*(ksz-1)));
      ctx.fillStyle='rgba(255,80,80,0.55)'; ctx.font=`${9*Math.min(ksz,1.3)}px JetBrains Mono,monospace`;
      ctx.fillText(n.role.toUpperCase(),kx,ky-(32+14*(ksz-1)));
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
      ctx.restore(); return;
    }

    const ag=ctx.createRadialGradient(n.x,bY,0,n.x,bY,55*sz);
    ag.addColorStop(0,n.color+'3a'); ag.addColorStop(1,'transparent');
    ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(n.x,bY,55*sz,0,Math.PI*2); ctx.fill();

    ctx.fillStyle=n.color;
    if(sz>1){ ctx.beginPath(); ctx.ellipse(n.x,bY,30*sz,26*sz,0,0,Math.PI*2); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(n.x,bY,27,0,Math.PI*2); ctx.fill(); }

    ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(n.x,bY-22*sz,20*sz,0,Math.PI*2); ctx.fill();
    drawPixelFace(n.x, bY-22*sz, sz);

    const stage=getStage(n.id), maxSt=NPCS[n.id].dialogs.length-1, done=(stage>=maxSt&&stage>0);
    const qBaseY=bY-(68+20*(sz-1));
    if(!done){
      const qy=qBaseY+Math.sin(t*0.004)*3.5;
      ctx.fillStyle='#f0c040'; ctx.beginPath(); ctx.moveTo(n.x,qy+9); ctx.lineTo(n.x-7,qy); ctx.lineTo(n.x+7,qy); ctx.fill();
      ctx.fillStyle='#000'; ctx.font='bold 8.5px Outfit,sans-serif'; ctx.textBaseline='middle'; ctx.fillText('!',n.x,qy+4);
    } else {
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
  const px=p.x;
  // Jemný walk-bob (konzistentní s drawNakedSaman / NPC gait)
  const walkBob = p.mv ? Math.abs(Math.sin(t * 0.018)) * 3.2 : 0;
  const py=p.y - walkBob;
  let pc = '#7c6ff7';
  if(gs.kratom_on) pc = gs.kratom_blend_on ? `hsl(${(t*0.2)%360},90%,58%)` : '#10b981';
  ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(px,py+29,17,7,0,0,Math.PI*2); ctx.fill();
  const pg=ctx.createRadialGradient(px,py,0,px,py,42);
  pg.addColorStop(0,pc+'4a'); pg.addColorStop(1,'transparent');
  ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(px,py,42,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=pc; ctx.beginPath(); ctx.arc(px,py,23,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(px,py-17,18,0,Math.PI*2); ctx.fill();
  const ef=p.face==='l'?-1:1;
  ctx.fillStyle='#1e293b';
  ctx.beginPath(); ctx.arc(px+ef*5,    py-19,4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(px+ef*5+11, py-19,4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(px+ef*5.5,    py-20,1.8,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(px+ef*5.5+11, py-20,1.8,0,Math.PI*2); ctx.fill();

  if(gs.kratom_on&&gs.kratom_t>0){
    const kpct=gs.kratom_t/gs.kratom_max;
    if(gs.kratom_blend_on){
      // Rainbow/gold duhový oblouk při kombinaci s blendem
      const hueBase = (t*0.25) % 360;
      const seg = 24;
      ctx.lineWidth = 4; ctx.lineCap='round';
      for(let s=0;s<seg;s++){
        const a0 = -Math.PI/2 + (s/seg)*kpct*Math.PI*2;
        const a1 = -Math.PI/2 + ((s+1)/seg)*kpct*Math.PI*2;
        ctx.strokeStyle = `hsl(${(hueBase + s*15)%360},95%,60%)`;
        ctx.beginPath(); ctx.arc(px,py,32,a0,a1); ctx.stroke();
      }
      // Vnější aureola
      ctx.strokeStyle = `hsla(${(hueBase+180)%360},90%,65%,0.35)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px,py,36 + Math.sin(t*0.006)*2,-Math.PI/2,-Math.PI/2+kpct*Math.PI*2); ctx.stroke();
    } else {
      ctx.strokeStyle='#10b981'; ctx.lineWidth=3; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(px,py,32,-Math.PI/2,-Math.PI/2+kpct*Math.PI*2); ctx.stroke();
    }
  }
  if(p.mv){
    for(let i=0;i<3;i++){
      ctx.fillStyle=`rgba(255,255,255,${.04+Math.random()*.07})`;
      ctx.beginPath(); ctx.arc(px+(Math.random()-.5)*30,py+23+Math.random()*10,2+Math.random()*3.5,0,Math.PI*2); ctx.fill();
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
  //  BLEND × KRATOM – extra vizuály (pulzující fraktály, vlny, oči)
  // ══════════════════════════════════════════════════════════════════════════
  if(gs.kratom_on && gs.kratom_blend_on){
    const bt = t * 0.001;
    // Pulzující barevný overlay
    const pulse = 0.5 + 0.5*Math.sin(bt*1.6);
    ctx.fillStyle = `rgba(${120+80*Math.sin(bt*0.7)},${60+40*Math.sin(bt*1.1)},${200-40*Math.cos(bt*0.9)},${0.06+0.05*pulse})`;
    ctx.fillRect(0,0,W,H);
    // Soustředné kruhy vibrace kolem hráče
    const pp = gs.player;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for(let r=0; r<6; r++){
      const rr = 80 + r*60 + 18*Math.sin(bt*2 + r*0.8);
      const al = 0.08 - r*0.012;
      ctx.strokeStyle = `rgba(${150+20*r},${80+30*r},${220-20*r},${al})`;
      ctx.lineWidth = 2 + Math.sin(bt*3+r)*0.8;
      ctx.beginPath(); ctx.arc(pp.x, pp.y, rr, 0, Math.PI*2); ctx.stroke();
    }
    ctx.restore();
    // Plovoucí fraktální oči
    for(let i=0;i<5;i++){
      const ex = W*(0.15 + (i*0.18 + Math.sin(bt*0.4+i*1.3)*0.08));
      const ey = H*(0.22 + Math.sin(bt*0.7+i*2.1)*0.12 + i*0.05);
      const es = 6 + 3*Math.sin(bt*1.2+i);
      const ea = 0.25 + 0.15*Math.sin(bt*0.9+i*1.7);
      ctx.fillStyle = `rgba(255,${200-i*20},${80+i*30},${ea})`;
      ctx.beginPath(); ctx.ellipse(ex, ey, es*2, es, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(20,10,40,${ea*1.2})`;
      ctx.beginPath(); ctx.arc(ex, ey, es*0.55, 0, Math.PI*2); ctx.fill();
    }
    // Horizontální vlnové deformace (chromatic lines)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for(let y=0; y<H; y+=28){
      const wobble = Math.sin(bt*2.3 + y*0.04)*8;
      ctx.strokeStyle = `rgba(${180+30*Math.sin(y*0.01+bt)},${80},${220},0.05)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0,y+wobble); ctx.lineTo(W,y-wobble); ctx.stroke();
    }
    ctx.restore();
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
