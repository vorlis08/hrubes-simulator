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
    case 'cibulka_lab':  drawCibulkaLab(W,H,t);  break;
    case 'maze_escape':  drawMazeEscape(W,H,t);  break;
    case 'bandage_cutscene': drawBandageCutscene(W,H,t); break;
    case 'johnny_stalking': drawJohnnyStalking(W,H,t); break;
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
    // loužička (šedá – elektrická)
    ctx.fillStyle='rgba(71,85,105,0.38)';
    ctx.beginPath(); ctx.ellipse(fx+8,fy+10,W*0.040,W*0.017,0.2,0,Math.PI*2); ctx.fill();
    // tělo
    ctx.save(); ctx.translate(fx,fy); ctx.rotate(Math.PI/2.3);
    ctx.fillStyle='rgba(0,0,0,0.38)'; ctx.beginPath(); ctx.ellipse(5,5,W*0.038,H*0.055,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#475569'; ctx.beginPath(); ctx.ellipse(0,0,W*0.038,H*0.055,0,0,Math.PI*2); ctx.fill();
    // hlava
    ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(-W*0.030,-H*0.005,W*0.022,0,Math.PI*2); ctx.fill();
    // vlasy
    ctx.fillStyle='#7c6a52';
    ctx.beginPath(); ctx.ellipse(-W*0.030,-H*0.015,W*0.020,W*0.010,0,0,Math.PI*2); ctx.fill();
    // brýle
    ctx.strokeStyle='rgba(80,80,80,0.8)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(-W*0.030-W*0.008,-H*0.005,W*0.007,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(-W*0.030+W*0.008,-H*0.005,W*0.007,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-W*0.030-W*0.015,-H*0.005); ctx.lineTo(-W*0.030-W*0.001,-H*0.005); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-W*0.030+W*0.001,-H*0.005); ctx.lineTo(-W*0.030+W*0.015,-H*0.005); ctx.stroke();
    // zkřížené oči
    ctx.strokeStyle='rgba(0,0,0,0.75)'; ctx.lineWidth=1.5;
    [[-W*0.030-W*0.008,-H*0.005],[-W*0.030+W*0.008,-H*0.005]].forEach(([ex,ey])=>{
      ctx.beginPath(); ctx.moveTo(ex-W*0.006,ey-H*0.006); ctx.lineTo(ex+W*0.006,ey+H*0.006); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex+W*0.006,ey-H*0.006); ctx.lineTo(ex-W*0.006,ey+H*0.006); ctx.stroke();
    });
    // miniaturní blesk (propiska v ruce)
    ctx.strokeStyle='rgba(255,220,80,0.65)'; ctx.lineWidth=1.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(W*0.020,H*0.016); ctx.lineTo(W*0.028,H*0.008); ctx.lineTo(W*0.024,H*0.011); ctx.lineTo(W*0.033,H*0.002); ctx.stroke();
    ctx.restore();
    // popisek
    ctx.save(); ctx.font=`bold ${Math.floor(W*0.011)}px JetBrains Mono,monospace`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(71,85,105,0.50)'; ctx.fillText('Figurová ⚡', fx, fy+H*0.082);
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
  // plameny – pokud krb_open, prostřední plameny zhasnou (Mojžíš efekt)
  const krbOpening = !!gs.saman_to_krb && gs.saman_to_krb.phase === 'opening';
  const krbFullyOpen = !!gs.krb_open;
  // Animace otevírání: 0→1 v průběhu fáze 'opening' (cca 1.8s)
  let openProg = 0;
  if(krbFullyOpen){ openProg = 1; }
  else if(krbOpening){
    const dt = (gs.ts - gs.saman_to_krb.phaseStart) / 1800;
    openProg = Math.max(0, Math.min(1, dt));
  }
  for(let i=0;i<10;i++){
    const fi=i/10;
    let flx=fx-fbw*0.42+fi*fbw*0.84;
    // Vzdálenost od středu (0 = střed, 1 = okraj)
    const distFromMid = Math.abs(i - 4.5) / 4.5;
    // Mojžíšův efekt – plameny se odsouvají ke stranám
    if(openProg > 0){
      const side = i < 5 ? -1 : 1;
      const push = (1 - distFromMid) * openProg * fbw * 0.22;
      flx += side * push;
    }
    // Při plném otevření střední plameny úplně zmizí
    const flameAlive = krbFullyOpen ? distFromMid > 0.45 : (krbOpening ? distFromMid > openProg * 0.5 : true);
    if(!flameAlive) continue;
    const flh=fbh*(0.22+0.58*Math.abs(Math.sin(ft+fi*3.8+i*0.7)));
    // Plameny blíž ke středu se při otvírání zmenšují
    const scaleDown = openProg > 0 ? Math.max(0.3, distFromMid + (1 - openProg) * 0.5) : 1;
    const adjH = flh * scaleDown;
    const flG=ctx.createLinearGradient(flx,fy+fbh,flx,fy+fbh-adjH);
    flG.addColorStop(0,'rgba(255,60,0,0.95)'); flG.addColorStop(0.35,'rgba(255,140,0,0.8)'); flG.addColorStop(0.7,'rgba(255,210,30,0.5)'); flG.addColorStop(1,'rgba(255,230,80,0)');
    ctx.fillStyle=flG; ctx.beginPath(); ctx.ellipse(flx,fy+fbh-adjH/2,fbw/13,adjH/2,0,0,Math.PI*2); ctx.fill();
  }
  // Tajný průchod uprostřed krbu – klenutý oblouk (ne ovál)
  if(krbFullyOpen || (krbOpening && openProg > 0.15)){
    const maxW = fbw * 0.38;
    const passW = maxW * openProg;
    const passH = fbh * 0.70;
    const passX = fx - passW/2;
    const passY = fy + fbh * 0.26;
    const archR = passW / 2;
    // Kresli archu: obdélník + půlkruh nahoře
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(passX, passY + passH);
    ctx.lineTo(passX, passY + archR);
    ctx.arc(fx, passY + archR, archR, Math.PI, 0);
    ctx.lineTo(passX + passW, passY + passH);
    ctx.closePath();
    const passG = ctx.createLinearGradient(fx, passY, fx, passY + passH);
    passG.addColorStop(0, 'rgba(5,0,15,0.98)');
    passG.addColorStop(0.6, 'rgba(10,3,25,0.95)');
    passG.addColorStop(1, 'rgba(20,8,40,0.85)');
    ctx.fillStyle = passG;
    ctx.fill();
    // Záře z hloubky tunelu
    if(openProg > 0.5){
      const glAlpha = (openProg - 0.5) * 2;
      const pulse = 0.3 + 0.15 * Math.sin(ft * 1.8);
      const depthGlow = ctx.createRadialGradient(fx, passY + passH * 0.5, 0, fx, passY + passH * 0.5, passW * 0.7);
      depthGlow.addColorStop(0, `rgba(255,80,0,${pulse * glAlpha * 0.6})`);
      depthGlow.addColorStop(0.5, `rgba(180,40,0,${pulse * glAlpha * 0.2})`);
      depthGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = depthGlow;
      ctx.fill();
    }
    // Okraje oblouku – kamenné ostění
    ctx.strokeStyle = `rgba(80,50,20,${openProg * 0.9})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(passX, passY + passH);
    ctx.lineTo(passX, passY + archR);
    ctx.arc(fx, passY + archR, archR, Math.PI, 0);
    ctx.lineTo(passX + passW, passY + passH);
    ctx.stroke();
    ctx.restore();
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
  } else if(gs.krb_open){
    ctx.fillStyle='rgba(80,160,255,0.95)'; ctx.font=`bold ${Math.floor(W*0.009)}px JetBrains Mono,monospace`;
    ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillText('[E] VSTOUPIT DO LABORATOŘE',fx,fy-33);
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
  // Šaman – jde / stojí u krbu (Cibulkův příkaz)
  if(gs.saman_to_krb){
    drawSamanAtKrb(gs.saman_to_krb, t);
  }
  // Jana – jde / stojí u krbu (po "Johnny je v pohodě")
  if(gs.jana_to_fireplace_anim || (gs.story.jana_at_johnny && !gs.story.johnny_took_jana)){
    drawJanaAtFireplace(t);
  }
}

// ─── Generický pixel render Jany ────────────────────────────────────────────
function drawJanaPixel(x, bY, t, flip){
  flip = flip || 1;
  ctx.save();
  ctx.translate(x, bY);
  ctx.scale(flip, 1);
  // Šaty (růžové)
  const dressG = ctx.createLinearGradient(0, -10, 0, 28);
  dressG.addColorStop(0, '#e91e63'); dressG.addColorStop(1, '#9c1148');
  ctx.fillStyle = dressG;
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.bezierCurveTo(-18, 8, -16, 22, -14, 28);
  ctx.lineTo(14, 28);
  ctx.bezierCurveTo(16, 22, 18, 8, 12, -8);
  ctx.closePath();
  ctx.fill();
  // Hlava
  ctx.fillStyle = '#fde8c8';
  ctx.beginPath(); ctx.arc(0, -22, 12, 0, Math.PI * 2); ctx.fill();
  // Vlasy boky
  ctx.fillStyle = '#f5d97a';
  ctx.beginPath();
  ctx.moveTo(-12, -28); ctx.lineTo(-14, -8); ctx.lineTo(-9, -10); ctx.lineTo(-9, -32);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -28); ctx.lineTo(14, -8); ctx.lineTo(9, -10); ctx.lineTo(9, -32);
  ctx.closePath(); ctx.fill();
  // Vlasy nahoře
  ctx.beginPath();
  ctx.arc(0, -30, 11, Math.PI, 0); ctx.fill();
  // Oči
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-3, -22, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -22, 1.2, 0, Math.PI * 2); ctx.fill();
  // Rty
  ctx.fillStyle = '#c62b6c';
  ctx.fillRect(-2.5, -17, 5, 1.5);
  ctx.restore();
  // Stín
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(x, bY + 22, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
}

// ─── Jana s katanou (death animace) ────────────────────────────────────────
function drawJanaKatana(anim, t){
  const W = canvas.width, H = canvas.height;
  const phase = anim.phase;
  const elapsed = (gs.ts - anim.t0) / 1000;
  let x = anim.x, y = anim.y;
  const flip = anim.flipX || 1;

  // Animace přiblížení
  if(phase === 'approach' || phase === 'strike' || phase === 'cuts' || phase === 'fall_apart' || phase === 'pool'){
    const dx = anim.targetX - anim.x, dy = anim.targetY - anim.y;
    const d = Math.hypot(dx, dy);
    if(d > 4){
      anim.x += (dx / d) * 6;
      anim.y += (dy / d) * 4;
    }
    x = anim.x; y = anim.y;
  }

  drawJanaPixel(x, y, t, flip);

  // Ruce (přidá pravou ruku držící katanu)
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);

  // Levá ruka (idle při těle)
  if(phase === 'realize' || phase === 'rage'){
    ctx.strokeStyle = '#fde8c8';
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -2); ctx.lineTo(-14, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, -2); ctx.lineTo(14, 12);
    ctx.stroke();
  }

  // Po tasení katany: pravá ruka drží katanu nahoře, příprava sek
  if(phase === 'draw' || phase === 'wind_up' || phase === 'approach' || phase === 'strike'){
    // Levá ruka stále dolů
    ctx.strokeStyle = '#fde8c8';
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -2); ctx.lineTo(-16, 14);
    ctx.stroke();

    // Pravá ruka držící katanu
    let armAng = -0.4; // basic raised
    if(phase === 'wind_up') armAng = -1.0; // úplné napřahnutí
    if(phase === 'approach') armAng = -1.2;
    if(phase === 'strike') armAng = 0.6 + (elapsed % 0.3) * 4; // sek dolů

    const ax = 12, ay = -2;
    const armEx = ax + Math.cos(armAng) * 22;
    const armEy = ay + Math.sin(armAng) * 22;
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(armEx, armEy);
    ctx.stroke();

    // Katana
    const kx0 = armEx, ky0 = armEy;
    const katanaAng = armAng + 0.3;
    const kEndX = kx0 + Math.cos(katanaAng) * 50;
    const kEndY = ky0 + Math.sin(katanaAng) * 50;
    // Hilta (rudá)
    ctx.strokeStyle = '#c41818';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(kx0, ky0);
    ctx.lineTo(kx0 + Math.cos(katanaAng)*8, ky0 + Math.sin(katanaAng)*8);
    ctx.stroke();
    // Garda
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(kx0 + Math.cos(katanaAng)*8, ky0 + Math.sin(katanaAng)*8, 3, 0, Math.PI*2);
    ctx.fill();
    // Čepel (stříbrná, lehce zakřivená)
    ctx.strokeStyle = '#e8eef2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const blStart = { x: kx0 + Math.cos(katanaAng)*10, y: ky0 + Math.sin(katanaAng)*10 };
    ctx.moveTo(blStart.x, blStart.y);
    // mírně ohnutá čepel
    ctx.bezierCurveTo(
      blStart.x + Math.cos(katanaAng+0.1)*22, blStart.y + Math.sin(katanaAng+0.1)*22,
      kEndX - Math.cos(katanaAng-0.1)*4, kEndY - Math.sin(katanaAng-0.1)*4,
      kEndX, kEndY
    );
    ctx.stroke();
    // Lesk čepele
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(blStart.x, blStart.y);
    ctx.lineTo(kEndX*0.9 + blStart.x*0.1, kEndY*0.9 + blStart.y*0.1);
    ctx.stroke();
  }

  ctx.restore();

  // Speech bubble pro hlášky
  const phaseToText = {
    realize: '"Tys mi to fakt chtěl...?"',
    rage: '"PO VŠEM CO JSME PROŽILI?!"',
    draw: '*tasí katanu*',
    wind_up: '"PRO TUHLE PŘÍLEŽITOST!"',
  };
  if(phaseToText[phase] && elapsed > 0.2){
    const text = phaseToText[phase];
    ctx.font = 'bold 14px Outfit,sans-serif';
    const tw = ctx.measureText(text).width;
    const bw = tw + 22, bh = 28;
    const bx = x - bw/2, by = y - 70;
    ctx.fillStyle = 'rgba(255,250,235,0.95)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = 'rgba(180,80,80,0.85)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#1a0808';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + bh/2);
  }

  // Bílý flash při strike
  if(phase === 'strike' && anim.flashT){
    const fT = (gs.ts - anim.flashT) / 200;
    if(fT < 1){
      ctx.fillStyle = `rgba(255,255,255,${1 - fT})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

// ─── Render hráčových řezů + rozpadu těla (po katana strike) ───────────────
function drawPlayerCuts(t){
  if(!gs.player_cuts_anim) return;
  const c = gs.player_cuts_anim;
  const px = gs.player.x, py = gs.player.y;

  // Jen řezy (před fall_apart)
  if(!c.parts){
    if(c.cuts){
      ctx.save();
      ctx.translate(px, py);
      // Krvavé linie přes tělo
      ctx.strokeStyle = '#c41818';
      ctx.lineWidth = 2.5;
      c.cuts.forEach(cut => {
        ctx.save();
        ctx.rotate(cut.ang);
        ctx.beginPath();
        ctx.moveTo(-22, cut.y);
        ctx.lineTo(22, cut.y);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
      // Kapky krve padají
      const elapsed = (gs.ts - c.startTime) / 1000;
      for(let d=0; d<5; d++){
        const dropT = (elapsed*1.5 + d*0.3) % 1.5;
        const dy = py + dropT * 60;
        const dx = px + (Math.sin(d*7.3)*15);
        if(dy < py + 60){
          ctx.fillStyle = `rgba(196,24,24,${0.85 - dropT*0.5})`;
          ctx.beginPath(); ctx.arc(dx, dy, 1.5 + dropT, 0, Math.PI*2); ctx.fill();
        }
      }
    }
  } else {
    // Tělo se rozpadlo na kostky
    c.parts.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.w/2, p.y - p.h/2, p.w, p.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x - p.w/2, p.y - p.h/2, p.w, p.h);
      // Krev po hranách
      ctx.fillStyle = '#8b0000';
      ctx.fillRect(p.x - p.w/2, p.y - p.h/2 - 1, p.w, 2);
      ctx.fillRect(p.x - p.w/2, p.y + p.h/2 - 1, p.w, 2);
      ctx.restore();
    });
    // Krevní loužička
    if(c.bloodPool > 0){
      const r = c.bloodPool * 60;
      const bg = ctx.createRadialGradient(px, py + 20, 0, px, py + 20, r);
      bg.addColorStop(0, 'rgba(140,0,0,0.85)');
      bg.addColorStop(0.6, 'rgba(180,0,0,0.65)');
      bg.addColorStop(1, 'rgba(140,0,0,0)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.ellipse(px, py + 20, r, r*0.45, 0, 0, Math.PI*2); ctx.fill();
    }
  }
}

// ─── Jana u krbu / jde ke krbu ──────────────────────────────────────────────
function drawJanaAtFireplace(t){
  let x, y, flip = 1, walking = false;
  if(gs.jana_to_fireplace_anim){
    x = gs.jana_to_fireplace_anim.x;
    y = gs.jana_to_fireplace_anim.y;
    flip = gs.jana_to_fireplace_anim.flipX || 1;
    walking = gs.jana_to_fireplace_anim.phase === 'walking';
  } else {
    // Stojí u Johnnyho u krbu (po dokončení animace)
    const fp = ROOMS.hospoda.fireplace;
    x = fp.rx * canvas.width - 35;
    y = fp.ry * canvas.height + canvas.height * 0.30;
    flip = 1;
  }
  const bob = walking ? Math.abs(Math.sin(t * 0.012)) * 4 : Math.sin(t * 0.003) * 1.2;
  const bY = y - bob;

  // Stín
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(x, bY + 22, 18, 4, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(x, bY);
  ctx.scale(flip, 1);

  // Šaty (růžové)
  const dressG = ctx.createLinearGradient(0, -10, 0, 28);
  dressG.addColorStop(0, '#e91e63'); dressG.addColorStop(1, '#9c1148');
  ctx.fillStyle = dressG;
  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.bezierCurveTo(-18, 8, -16, 22, -14, 28);
  ctx.lineTo(14, 28);
  ctx.bezierCurveTo(16, 22, 18, 8, 12, -8);
  ctx.closePath();
  ctx.fill();

  // Hlava
  ctx.fillStyle = '#fde8c8';
  ctx.beginPath(); ctx.arc(0, -22, 12, 0, Math.PI * 2); ctx.fill();
  // Vlasy (blond, dlouhé)
  ctx.fillStyle = '#f5d97a';
  ctx.beginPath();
  ctx.moveTo(-12, -28); ctx.lineTo(-14, -8); ctx.lineTo(-9, -10); ctx.lineTo(-9, -32);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, -28); ctx.lineTo(14, -8); ctx.lineTo(9, -10); ctx.lineTo(9, -32);
  ctx.closePath(); ctx.fill();
  // Vlasy nahoře
  ctx.beginPath();
  ctx.arc(0, -30, 11, Math.PI, 0); ctx.fill();
  // Oči
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-3, -22, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -22, 1.2, 0, Math.PI * 2); ctx.fill();
  // Rty
  ctx.fillStyle = '#c62b6c';
  ctx.fillRect(-2.5, -17, 5, 1.5);

  ctx.restore();

  // Jméno
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 11px Outfit,sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Jana', x, bY - 38);

  // Při proximity ukázat [E]
  if(!walking && dist2(gs.player, {x: x, y: y}) < PROX_R){
    ctx.fillStyle = 'rgba(240,192,64,.78)';
    ctx.font = 'bold 10px JetBrains Mono,monospace';
    ctx.fillText('[E] MLUVIT', x, bY + 50);
  }
}

// ─── Šaman u krbu (Cibulkův příkaz) ──────────────────────────────────────────
function drawSamanAtKrb(anim, t){
  const x = anim.x, y = anim.y;
  const flip = anim.flipX || 1;
  const isWalking = anim.phase === 'walking';
  const bob = isWalking ? Math.abs(Math.sin(t * 0.012)) * 4 : Math.sin(t * 0.003) * 1.5;
  const bY = y - bob;

  // Stín
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(x, bY + 22, 22, 5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.translate(x, bY);
  ctx.scale(flip, 1);

  // Plášť šamana – tmavě zelený
  const robeG = ctx.createLinearGradient(0, -18, 0, 28);
  robeG.addColorStop(0, '#1a4030'); robeG.addColorStop(1, '#0a1d18');
  ctx.fillStyle = robeG;
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.bezierCurveTo(-22, 6, -24, 18, -20, 28);
  ctx.lineTo(20, 28);
  ctx.bezierCurveTo(24, 18, 22, 6, 16, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2a6048'; ctx.lineWidth = 1.2; ctx.stroke();

  // Kapuce
  ctx.fillStyle = '#0a1d18';
  ctx.beginPath();
  ctx.moveTo(-14, -22); ctx.lineTo(-10, -36); ctx.lineTo(10, -36); ctx.lineTo(14, -22);
  ctx.bezierCurveTo(8, -18, -8, -18, -14, -22);
  ctx.closePath(); ctx.fill();

  // Obličej (z větší části zastíněný kapucí)
  ctx.fillStyle = '#5a3a18';
  ctx.beginPath(); ctx.arc(0, -22, 9, 0, Math.PI * 2); ctx.fill();

  // Oči – zelená záře (mystické)
  const eyeP = 0.7 + 0.3 * Math.sin(t * 0.005);
  ctx.fillStyle = `rgba(80,255,140,${eyeP})`;
  ctx.beginPath(); ctx.arc(-3, -23, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -23, 1.2, 0, Math.PI * 2); ctx.fill();

  // Vous (dlouhý, šedý)
  ctx.fillStyle = '#a0a098';
  ctx.beginPath();
  ctx.moveTo(-5, -16); ctx.lineTo(-2, -2); ctx.lineTo(2, -2); ctx.lineTo(5, -16);
  ctx.closePath(); ctx.fill();

  // Ruce
  ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  if(anim.phase === 'incantation' || anim.phase === 'opening'){
    const armRaise = Math.min(1, (gs.ts - anim.phaseStart) / 800);
    ctx.beginPath();
    ctx.moveTo(-12, -2);
    ctx.lineTo(-22, -2 - armRaise * 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, -2);
    ctx.lineTo(22, -2 - armRaise * 18);
    ctx.stroke();
  } else {
    const swing = isWalking ? Math.sin(t * 0.012) * 6 : 0;
    ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(-18, 8 + swing); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, -2); ctx.lineTo(18, 8 - swing); ctx.stroke();
  }

  ctx.restore();

  // Speech bubble s zaklínadlem
  if(anim.speech && (gs.ts - anim.speech.t) < 2200){
    const elapsed = gs.ts - anim.speech.t;
    const fade = elapsed > 1700 ? Math.max(0, 1 - (elapsed - 1700) / 500) : 1;
    ctx.font = 'bold 16px Outfit,sans-serif';
    const text = anim.speech.text;
    const tw = ctx.measureText(text).width;
    const bw = tw + 24, bh = 32;
    const bx = x - bw/2, by = bY - 70;
    ctx.fillStyle = `rgba(255,250,235,${0.95 * fade})`;
    ctx.beginPath();
    ctx.moveTo(bx + 8, by);
    ctx.lineTo(bx + bw - 8, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + 8);
    ctx.lineTo(bx + bw, by + bh - 8);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 8, by + bh);
    ctx.lineTo(x + 8, by + bh);
    ctx.lineTo(x, by + bh + 8);
    ctx.lineTo(x - 8, by + bh);
    ctx.lineTo(bx + 8, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 8);
    ctx.lineTo(bx, by + 8);
    ctx.quadraticCurveTo(bx, by, bx + 8, by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(180,140,60,${fade})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = `rgba(40,20,10,${fade})`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + bh/2);
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
  {
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
// ── Offscreen cache pro statické pozadí johnny_vila ──
let _vilaBgCanvas = null, _vilaBgW = 0, _vilaBgH = 0;
function getVilaBg(W, H){
  if(_vilaBgCanvas && _vilaBgW === W && _vilaBgH === H) return _vilaBgCanvas;
  const oc = document.createElement('canvas');
  oc.width = W; oc.height = H;
  const ox = oc.getContext('2d');
  // Podlaha – světlejší
  ox.fillStyle='#3a3038'; ox.fillRect(0,0,W,H);
  const floorG=ox.createLinearGradient(0,H*0.48,0,H);
  floorG.addColorStop(0,'#685870'); floorG.addColorStop(1,'#4a3c55');
  ox.fillStyle=floorG; ox.fillRect(0,H*0.48,W,H*0.52);
  // Parkety – krok 40×18
  ox.strokeStyle='rgba(120,85,110,0.35)'; ox.lineWidth=0.5;
  for(let px=0;px<W;px+=40) for(let py=H*0.48;py<H;py+=18){
    const off=(Math.floor(py/18)%2)*20;
    ox.strokeRect(px+off,py,40,18);
    ox.fillStyle='rgba(140,100,130,0.04)';
    ox.fillRect(px+off,py,40,18);
  }
  // Tapeta – světlejší
  ox.fillStyle='#403555'; ox.fillRect(0,0,W,H*0.48);
  ox.lineWidth=0.5;
  for(let rx=0;rx<W;rx+=60) for(let ry=0;ry<H*0.48;ry+=60){
    ox.strokeStyle='rgba(130,80,160,0.15)';
    ox.strokeRect(rx,ry,60,60);
    ox.beginPath();
    ox.moveTo(rx+30,ry+8); ox.lineTo(rx+52,ry+30); ox.lineTo(rx+30,ry+52); ox.lineTo(rx+8,ry+30);
    ox.closePath(); ox.strokeStyle='rgba(170,110,200,0.12)'; ox.stroke();
  }
  // Stropní lampy – světelné kužely
  const lampPositions = [W*0.22, W*0.55, W*0.82];
  for(const lx of lampPositions){
    const coneG = ox.createLinearGradient(lx, 0, lx, H*0.55);
    coneG.addColorStop(0,'rgba(255,220,160,0.18)');
    coneG.addColorStop(0.5,'rgba(255,200,130,0.08)');
    coneG.addColorStop(1,'transparent');
    ox.fillStyle=coneG;
    ox.beginPath();
    ox.moveTo(lx-8, 0); ox.lineTo(lx+8, 0);
    ox.lineTo(lx+W*0.10, H*0.55); ox.lineTo(lx-W*0.10, H*0.55);
    ox.closePath(); ox.fill();
    // Lampa na stropě
    ox.fillStyle='#5a4a3a'; ox.fillRect(lx-12, 0, 24, 6);
    ox.fillStyle='#8a7a60'; ox.fillRect(lx-8, 6, 16, 4);
    // Žárovka
    ox.fillStyle='rgba(255,230,170,0.7)';
    ox.beginPath(); ox.arc(lx, 14, 5, 0, Math.PI*2); ox.fill();
  }
  _vilaBgCanvas = oc; _vilaBgW = W; _vilaBgH = H;
  return oc;
}

function drawJohnnyVila(W,H,t){
  const ft = t * 0.001;
  // ── Statické pozadí z cache ──
  ctx.drawImage(getVilaBg(W, H), 0, 0);
  // Lišta na zdi
  ctx.fillStyle='rgba(130,85,110,0.40)'; ctx.fillRect(0,H*0.46,W,H*0.04);
  ctx.strokeStyle='rgba(170,110,140,0.30)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,H*0.46); ctx.lineTo(W,H*0.46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,H*0.50); ctx.lineTo(W,H*0.50); ctx.stroke();

  // ── Koberec pod pohovkou ──
  ctx.fillStyle='rgba(140,65,85,0.22)';
  rrect(W*0.10,H*0.55,W*0.45,H*0.30,4); ctx.fill();
  ctx.strokeStyle='rgba(180,90,110,0.18)'; ctx.lineWidth=1;
  rrect(W*0.12,H*0.57,W*0.41,H*0.26,3); ctx.stroke();

  // ── Pohovka – detailnější ──
  const sx=W*0.14, sy=H*0.58;
  // Opěradlo
  ctx.fillStyle='#7a4878'; rrect(sx,sy-H*0.04,W*0.32,H*0.08,5); ctx.fill();
  // Sedák
  ctx.fillStyle='#8a5890'; rrect(sx,sy+H*0.02,W*0.32,H*0.14,5); ctx.fill();
  // Polštáře
  ctx.fillStyle='#9a68a0'; rrect(sx+6,sy+H*0.03,W*0.09,H*0.08,3); ctx.fill();
  ctx.fillStyle='#926098'; rrect(sx+W*0.12,sy+H*0.03,W*0.09,H*0.08,3); ctx.fill();
  ctx.fillStyle='#9a68a0'; rrect(sx+W*0.22,sy+H*0.03,W*0.09,H*0.08,3); ctx.fill();
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
  ctx.fillStyle='#504868'; ctx.fillRect(kx,ky+H*0.10,W*0.24,H*0.18);
  ctx.strokeStyle='#7a6898'; ctx.lineWidth=1; ctx.strokeRect(kx,ky+H*0.10,W*0.24,H*0.18);
  // Dvířka
  for(let d=0;d<3;d++){
    const ddx=kx+W*0.02+d*W*0.075;
    ctx.strokeStyle='rgba(120,90,150,0.30)'; ctx.lineWidth=0.5;
    rrect(ddx,ky+H*0.12,W*0.065,H*0.14,2); ctx.stroke();
    ctx.fillStyle='rgba(170,120,200,0.20)'; ctx.fillRect(ddx+W*0.025,ky+H*0.17,W*0.015,H*0.03);
  }
  // Deska
  ctx.fillStyle='#6a5878'; ctx.fillRect(kx-2,ky+H*0.08,W*0.248,H*0.04);
  ctx.strokeStyle='rgba(150,120,180,0.40)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(kx-2,ky+H*0.08); ctx.lineTo(kx+W*0.246,ky+H*0.08); ctx.stroke();
  // Horní police
  ctx.fillStyle='#4a3c60'; ctx.fillRect(kx+W*0.02,ky,W*0.20,H*0.06);
  ctx.strokeStyle='rgba(140,110,170,0.30)'; ctx.lineWidth=0.5; ctx.strokeRect(kx+W*0.02,ky,W*0.20,H*0.06);
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
  ctx.fillStyle='rgba(75,55,85,0.7)'; rrect(W*0.08,H*0.10,W*0.12,H*0.16,2); ctx.fill();
  ctx.strokeStyle='rgba(220,180,90,0.55)'; ctx.lineWidth=2; rrect(W*0.08,H*0.10,W*0.12,H*0.16,2); ctx.stroke();
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
  ctx.fillStyle='#5a4a40'; ctx.fillRect(W*0.04,H*0.56,W*0.02,H*0.22);
  ctx.fillStyle='rgba(255,220,140,0.45)'; ctx.beginPath();
  ctx.arc(W*0.05,H*0.54,18,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,200,100,0.15)'; ctx.beginPath();
  ctx.arc(W*0.05,H*0.54,40,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#7a6050'; rrect(W*0.03,H*0.50,W*0.04,H*0.06,2); ctx.fill();

  // ── Výstupní dveře (dole) ──
  {
    const edx=W*0.44, edy=H*0.90, edw=W*0.12, edh=H*0.10;
    ctx.fillStyle='#3a2838'; rrect(edx,edy,edw,edh,3); ctx.fill();
    ctx.strokeStyle='rgba(160,120,100,0.5)'; ctx.lineWidth=1.5; rrect(edx,edy,edw,edh,3); ctx.stroke();
    ctx.fillStyle='rgba(200,160,60,0.5)'; ctx.beginPath(); ctx.arc(edx+edw*0.8,edy+edh*0.4,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.font='8px monospace'; ctx.textAlign='center';
    ctx.fillText('🚪 VEN',edx+edw/2,edy-4); ctx.textAlign='left';
  }

  // ── Dveře do ložnice (vlevo) ──
  {
    const ldx=W*0.02, ldy=H*0.26, ldw=W*0.06, ldh=H*0.22;
    ctx.fillStyle='#3a2838'; rrect(ldx,ldy,ldw,ldh,2); ctx.fill();
    ctx.strokeStyle='rgba(160,120,100,0.4)'; ctx.lineWidth=1; rrect(ldx,ldy,ldw,ldh,2); ctx.stroke();
    ctx.fillStyle='rgba(200,160,60,0.4)'; ctx.beginPath(); ctx.arc(ldx+ldw*0.75,ldy+ldh*0.5,2.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.font='8px monospace'; ctx.textAlign='center';
    ctx.fillText('🔒',ldx+ldw/2,ldy-4); ctx.textAlign='left';
  }

  // ── Dveře do koupelny – výrazné ──
  {
    const bdr=W*0.88, bdy=H*0.24, bdw=W*0.10, bdh=H*0.26;
    if(gs.story.bathroom_door_broken){
      // Rozbitý rám
      ctx.fillStyle='#0a0810'; rrect(bdr,bdy,bdw,bdh,2); ctx.fill();
      ctx.strokeStyle='rgba(80,40,60,0.8)'; ctx.lineWidth=2.5; rrect(bdr,bdy,bdw,bdh,2); ctx.stroke();
      // Praskliny v rámu
      ctx.strokeStyle='rgba(60,30,45,0.5)'; ctx.lineWidth=0.8;
      ctx.beginPath();
      ctx.moveTo(bdr,bdy+bdh*0.3); ctx.lineTo(bdr+3,bdy+bdh*0.15);
      ctx.moveTo(bdr+bdw,bdy+bdh*0.7); ctx.lineTo(bdr+bdw-3,bdy+bdh*0.8);
      ctx.stroke();
      // Panty
      ctx.fillStyle='#777'; ctx.fillRect(bdr-1,bdy+3,4,6); ctx.fillRect(bdr-1,bdy+bdh-9,4,6);
      // Třísky na zemi
      ctx.fillStyle='#5a3a50'; ctx.save(); ctx.translate(bdr+bdw*0.3,bdy+bdh+4); ctx.rotate(0.2);
      ctx.fillRect(-6,-2,12,3); ctx.restore();
      ctx.fillStyle='#4a2a40'; ctx.save(); ctx.translate(bdr+bdw*0.7,bdy+bdh+6); ctx.rotate(-0.3);
      ctx.fillRect(-4,-1,8,2); ctx.restore();
      // Kus dveří opřený o stěnu
      ctx.save(); ctx.translate(bdr+bdw+3,bdy+bdh*0.5); ctx.rotate(0.12);
      ctx.fillStyle='#3a2a38'; ctx.fillRect(0,-bdh*0.3,bdw*0.35,bdh*0.5);
      ctx.strokeStyle='rgba(100,70,90,0.3)'; ctx.lineWidth=0.5;
      ctx.strokeRect(0,-bdh*0.3,bdw*0.35,bdh*0.5);
      ctx.restore();
      // Světlo zevnitř
      const brG = ctx.createRadialGradient(bdr+bdw*0.5,bdy+bdh*0.5,0,bdr+bdw*0.5,bdy+bdh*0.5,bdw*0.7);
      brG.addColorStop(0,'rgba(100,60,160,0.15)'); brG.addColorStop(1,'transparent');
      ctx.fillStyle=brG; ctx.fillRect(bdr+2,bdy+2,bdw-4,bdh-4);
    } else {
      // Rám dveří
      ctx.fillStyle='#6a4a50'; rrect(bdr-3,bdy-3,bdw+6,bdh+6,4); ctx.fill();
      // Dveře
      ctx.fillStyle='#5a3a45'; rrect(bdr,bdy,bdw,bdh,3); ctx.fill();
      ctx.strokeStyle='rgba(200,150,130,0.6)'; ctx.lineWidth=2; rrect(bdr,bdy,bdw,bdh,3); ctx.stroke();
      // Panel na dveřích
      ctx.strokeStyle='rgba(180,120,100,0.3)'; ctx.lineWidth=1;
      rrect(bdr+bdw*0.15,bdy+bdh*0.1,bdw*0.7,bdh*0.35,2); ctx.stroke();
      rrect(bdr+bdw*0.15,bdy+bdh*0.55,bdw*0.7,bdh*0.35,2); ctx.stroke();
      // Klika
      ctx.fillStyle='#d4a030'; ctx.beginPath();
      ctx.arc(bdr+bdw*0.82,bdy+bdh*0.5,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,200,60,0.4)'; ctx.beginPath();
      ctx.arc(bdr+bdw*0.82,bdy+bdh*0.5,8,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='bold 10px Outfit,sans-serif'; ctx.textAlign='center';
    ctx.fillText('🚿 Koupelna',bdr+bdw*0.5,bdy-6); ctx.textAlign='left';
  }

  // ── Johnny chase – běží za hráčem ──
  if(gs.johnny_chase_pos && gs.jana_escape_deadline && !gs.story.jana_escape_failed){
    const jc = gs.johnny_chase_pos;
    const jcBob = Math.abs(Math.sin(t*0.014))*5;
    const jcFace = jc.x < (gs.player ? gs.player.x : W*0.5) ? 1 : -1;
    ctx.save(); ctx.translate(jc.x, jc.y - jcBob);
    // Zuřivá červená aura
    const chaseP = 0.3+0.15*Math.sin(t*0.008);
    const chaseG = ctx.createRadialGradient(0,0,0,0,0,55);
    chaseG.addColorStop(0,`rgba(200,40,0,${chaseP})`);
    chaseG.addColorStop(0.6,`rgba(160,20,0,${chaseP*0.3})`);
    chaseG.addColorStop(1,'transparent');
    ctx.fillStyle=chaseG; ctx.beginPath(); ctx.arc(0,0,55,0,Math.PI*2); ctx.fill();
    // Stín
    ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0,jcBob+22,18,6,0,0,Math.PI*2); ctx.fill();
    // Nohy (běh animace)
    const legPhase = t*0.018;
    ctx.fillStyle='#3a3040';
    ctx.fillRect(-8+Math.sin(legPhase)*4, 10, 5, 14);
    ctx.fillRect(3-Math.sin(legPhase)*4, 10, 5, 14);
    // Tělo
    ctx.fillStyle='#c0a030'; ctx.beginPath(); ctx.arc(0,0,22,0,Math.PI*2); ctx.fill();
    // Hlava
    ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(0,-18,16,0,Math.PI*2); ctx.fill();
    // Naštvaný obličej
    ctx.fillStyle='#1a1a2e';
    // Oči - úzké, zuřivé
    ctx.fillRect(-7*jcFace-3,-20,6,2);
    ctx.fillRect(7*jcFace-3,-20,6,2);
    // Zuby
    ctx.fillStyle='#fff'; ctx.fillRect(-4,-10,8,3);
    ctx.fillStyle='#1a1a2e'; ctx.fillRect(-1,-10,2,3);
    // Pistole v ruce
    ctx.fillStyle='#3a3a3a';
    ctx.save(); ctx.translate(jcFace*18, -2); ctx.rotate(jcFace*-0.3);
    ctx.fillRect(0,-3,jcFace*22,6);
    ctx.restore();
    // Jméno
    ctx.fillStyle='rgba(255,60,60,0.9)'; ctx.font='bold 11px Outfit,sans-serif';
    ctx.textAlign='center'; ctx.fillText('JOHNNY',0,-40);
    ctx.fillStyle='rgba(255,150,150,0.6)'; ctx.font='8px JetBrains Mono,monospace';
    ctx.fillText('PRONÁSLEDUJE TĚ',0,-28);
    ctx.restore();
    // Stopy (prachové oblaky za Johnnym)
    for(let fi=0;fi<4;fi++){
      const fpLife = ((t*0.003+fi*0.25)%1);
      const fpX = jc.x - jcFace*15 - jcFace*fpLife*20 + Math.sin(fi*3)*5;
      const fpY = jc.y + 20;
      const fpA = 0.15*(1-fpLife);
      const fpR = 3+fpLife*6;
      ctx.fillStyle=`rgba(180,160,140,${fpA})`;
      ctx.beginPath(); ctx.arc(fpX,fpY,fpR,0,Math.PI*2); ctx.fill();
    }
  }

  // ── Door burst efekt (vyběhnutí z koupelny) ──
  if(gs.villa_door_burst){
    const dbEl = (gs.ts - gs.villa_door_burst) * 0.001;
    if(dbEl < 1.5){
      // Bílý záblesk od dveří koupelny
      const dbA = Math.max(0, 0.5 - dbEl*0.4);
      const dbG = ctx.createRadialGradient(W*0.92,H*0.38,0,W*0.92,H*0.38,W*0.5);
      dbG.addColorStop(0,`rgba(255,255,220,${dbA})`);
      dbG.addColorStop(0.3,`rgba(200,180,140,${dbA*0.4})`);
      dbG.addColorStop(1,'transparent');
      ctx.fillStyle=dbG; ctx.fillRect(0,0,W,H);
    } else {
      gs.villa_door_burst = 0;
    }
  }

  // ── Nápis ──
  ctx.fillStyle='rgba(120,80,160,0.20)'; ctx.font='bold 11px monospace'; ctx.textAlign='center';
  ctx.fillText('JOHNNYHO VILA', W*0.5, H*0.44);
  ctx.textAlign='left';
  // ── Východ ──
  ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.font='10px monospace'; ctx.textAlign='center';
  ctx.fillText('↓ ODEJÍT', W*0.5, H*0.97);
  ctx.textAlign='left';

  // ── Záře svíčky – multi-vrstvý plamen ──
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
  // Animovaný plamen – 3 vrstvy
  const flameX = tx2+W*0.0575, flameBase = ty2-H*0.033;
  for(let fl=0;fl<3;fl++){
    const fPhase = ft*8+fl*2.1;
    const fSway = Math.sin(fPhase)*2 + Math.sin(fPhase*2.3)*0.8;
    const fH = 6+fl*2.5+Math.sin(fPhase*1.5)*1.5;
    const fW2 = 2.5-fl*0.5+Math.sin(fPhase*0.7)*0.5;
    const fAlpha = [0.9,0.6,0.35][fl];
    const fColors = ['rgba(255,220,80,','rgba(255,140,30,','rgba(255,80,10,'][fl];
    ctx.fillStyle=fColors+fAlpha+')';
    ctx.beginPath();
    ctx.moveTo(flameX-fW2+fSway*0.3, flameBase);
    ctx.quadraticCurveTo(flameX+fSway, flameBase-fH, flameX+fW2+fSway*0.3, flameBase);
    ctx.fill();
  }
  ctx.restore();

  // ── Záře lampy v rohu ──
  ctx.save();
  const lmpX=W*0.05, lmpY=H*0.54;
  const lmpFlk=0.25+0.04*Math.sin(ft*2.3);
  const lmpG=ctx.createRadialGradient(lmpX,lmpY,0,lmpX,lmpY,W*0.22);
  lmpG.addColorStop(0,`rgba(255,210,120,${lmpFlk})`); lmpG.addColorStop(0.4,`rgba(255,170,60,${lmpFlk*0.35})`); lmpG.addColorStop(1,'transparent');
  ctx.fillStyle=lmpG; ctx.fillRect(0,H*0.30,W*0.30,H*0.50);
  ctx.restore();

  // ── TV – animovaný obsah + ambient ──
  ctx.save();
  const tvFlk=0.22+0.12*Math.sin(ft*3.2)+0.08*Math.sin(ft*7.7)+0.06*Math.sin(ft*13.1);
  // TV obsah – šum a pruhy
  const tvX=W*0.655, tvY2=H*0.085, tvW2=W*0.17, tvH2=H*0.11;
  // Pozadí šumu
  const tvHue = (ft*40)%360;
  ctx.fillStyle=`hsla(${tvHue},30%,20%,0.6)`; ctx.fillRect(tvX,tvY2,tvW2,tvH2);
  // Horizontální pruhy (jako zprávy)
  for(let ti=0;ti<4;ti++){
    const tpy = tvY2+4+ti*(tvH2/4);
    const tpw = tvW2*0.3+Math.sin(ft*2+ti*1.7)*tvW2*0.25;
    const tpA = 0.15+0.1*Math.sin(ft*5+ti);
    ctx.fillStyle=`rgba(180,200,255,${tpA})`; ctx.fillRect(tvX+4,tpy,tpw,2);
  }
  // Scanline efekt
  for(let tsl=0;tsl<tvH2;tsl+=2){
    ctx.fillStyle='rgba(0,0,0,0.08)'; ctx.fillRect(tvX,tvY2+tsl,tvW2,1);
  }
  // Rolling scan bar
  const scanY = tvY2 + ((ft*30)%tvH2);
  ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(tvX,scanY,tvW2,8);
  // TV ambient záře
  const tvG=ctx.createRadialGradient(W*0.74,H*0.14,0,W*0.74,H*0.14,W*0.45);
  tvG.addColorStop(0,`rgba(80,140,220,${tvFlk})`); tvG.addColorStop(0.3,`rgba(50,90,180,${tvFlk*0.55})`); tvG.addColorStop(0.7,`rgba(30,60,140,${tvFlk*0.18})`); tvG.addColorStop(1,'transparent');
  ctx.fillStyle=tvG; ctx.fillRect(W*0.35,0,W*0.65,H*0.7);
  // TV odlesk na podlaze
  const tvFloorG=ctx.createRadialGradient(W*0.74,H*0.55,0,W*0.74,H*0.55,W*0.28);
  tvFloorG.addColorStop(0,`rgba(60,110,200,${tvFlk*0.5})`); tvFloorG.addColorStop(1,'transparent');
  ctx.fillStyle=tvFloorG; ctx.beginPath(); ctx.ellipse(W*0.74,H*0.58,W*0.28,H*0.10,0,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // ── Stíny pod nábytkem ──
  ctx.fillStyle='rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(W*0.30,H*0.80,W*0.20,H*0.02,0,0,Math.PI*2); ctx.fill(); // pohovka
  ctx.beginPath(); ctx.ellipse(W*0.65,H*0.78,W*0.13,H*0.015,0,0,Math.PI*2); ctx.fill(); // stůl
  ctx.beginPath(); ctx.ellipse(W*0.36,H*0.80,W*0.08,H*0.012,0,0,Math.PI*2); ctx.fill(); // stolek

  // ── Měsíční svit z okna ──
  ctx.save();
  const moonA = 0.06+0.02*Math.sin(ft*0.5);
  const moonG = ctx.createLinearGradient(W*0.38,H*0.26,W*0.60,H*0.90);
  moonG.addColorStop(0,`rgba(180,200,255,${moonA})`);
  moonG.addColorStop(0.4,`rgba(140,170,230,${moonA*0.5})`);
  moonG.addColorStop(1,'transparent');
  ctx.fillStyle=moonG;
  ctx.beginPath();
  ctx.moveTo(W*0.38,H*0.26); ctx.lineTo(W*0.60,H*0.26);
  ctx.lineTo(W*0.70,H*0.95); ctx.lineTo(W*0.28,H*0.95);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // ── Kouř ze svíčky – realistický ──
  const smokeCount = getParticleCount(8, fpsMonitor);
  ctx.save();
  for(let i=0;i<smokeCount;i++){
    const smLife=((t*0.00012+i*0.32)%1);
    const smX=candleX-W*0.005+Math.sin(smLife*Math.PI*2+i)*W*0.015*(1+smLife);
    const smY=candleY-H*0.04-smLife*H*0.26;
    const smR=W*0.006+smLife*W*0.025;
    const smA=0.14*(1-smLife)*(1-smLife);
    ctx.fillStyle=`rgba(200,190,170,${smA})`;
    ctx.beginPath(); ctx.arc(smX,smY,smR,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Prachové částice – rozdělen podle světelných zón ──
  const dustCount = getParticleCount(35, fpsMonitor);
  ctx.save();
  for(let i=0;i<dustCount;i++){
    const dx=W*0.05+(Math.sin(i*137.508)*0.5+0.5)*W*0.9+Math.sin(t*0.0004+i)*W*0.015;
    const dy=H*0.05+((t*0.00006+i*0.15)%1)*H*0.82;
    const da=0.18+0.22*Math.abs(Math.sin(t*0.0012+i*1.5));
    const sz=0.7+Math.abs(Math.sin(i*5))*0.6;
    const distCandle=Math.hypot(dx-candleX,dy-candleY);
    if(distCandle<W*0.25){
      ctx.fillStyle=`rgba(255,200,120,${da*1.3})`;
    } else if(dx>W*0.5 && dy<H*0.5){
      ctx.fillStyle=`rgba(140,180,230,${da*0.8})`;
    } else {
      ctx.fillStyle=`rgba(220,200,230,${da*0.7})`;
    }
    ctx.beginPath(); ctx.arc(dx,dy,sz,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ── Díry od zbraně + smutný Johnny na gauči (po vytopení) ──
  if(gs.story.johnny_sad_couch && !gs.story.johnny_dead){
    // Díry od střelby všude po místnosti
    const bulletHoles = [
      [W*0.20, H*0.32], [W*0.35, H*0.28], [W*0.68, H*0.25], [W*0.82, H*0.30],
      [W*0.15, H*0.42], [W*0.55, H*0.38], [W*0.78, H*0.44], [W*0.42, H*0.34],
      [W*0.90, H*0.36], [W*0.28, H*0.40], [W*0.60, H*0.26], [W*0.48, H*0.42],
      [W*0.72, H*0.48], [W*0.12, H*0.35], [W*0.88, H*0.28],
    ];
    bulletHoles.forEach(([bx2, by2], bi2) => {
      const bSize = 2.5 + Math.sin(bi2*3.7)*1;
      ctx.fillStyle = 'rgba(5,3,2,0.8)'; ctx.beginPath(); ctx.arc(bx2, by2, bSize, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(40,25,15,0.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(bx2, by2, bSize+1.5, 0, Math.PI*2); ctx.stroke();
      // Praskliny kolem díry
      for(let cr2 = 0; cr2 < 3; cr2++){
        const cAng = bi2*1.5 + cr2*Math.PI*0.7;
        ctx.strokeStyle = 'rgba(30,20,10,0.3)'; ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(bx2+Math.cos(cAng)*bSize, by2+Math.sin(cAng)*bSize);
        ctx.lineTo(bx2+Math.cos(cAng)*(bSize+5+Math.sin(bi2*2+cr2)*3), by2+Math.sin(cAng)*(bSize+5+Math.sin(bi2*2+cr2)*3));
        ctx.stroke();
      }
    });
    // Rozbitá sklenice na zemi
    for(let gi2 = 0; gi2 < 6; gi2++){
      ctx.fillStyle = `rgba(180,200,220,${0.15+Math.sin(gi2*4)*0.05})`;
      const gx2 = W*0.34 + gi2*W*0.03, gy2 = H*0.78 + Math.sin(gi2*5)*H*0.02;
      ctx.beginPath(); ctx.moveTo(gx2, gy2); ctx.lineTo(gx2+3, gy2-4); ctx.lineTo(gx2+6, gy2+1); ctx.closePath(); ctx.fill();
    }
    // Johnny – smutně sedí na gauči
    const jx2 = W*0.28, jy2 = H*0.60;
    // Tělo (shrbeně)
    ctx.fillStyle = 'rgba(140,120,70,0.35)';
    ctx.beginPath(); ctx.arc(jx2, jy2-18, 9, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(100,80,50,0.30)'; ctx.fillRect(jx2-7, jy2-10, 14, 20);
    // Ruce svěšené
    ctx.strokeStyle = 'rgba(160,130,80,0.25)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(jx2-7, jy2-4); ctx.lineTo(jx2-12, jy2+10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(jx2+7, jy2-4); ctx.lineTo(jx2+12, jy2+10); ctx.stroke();
    // Skloněná hlava
    ctx.fillStyle = 'rgba(50,40,30,0.3)'; ctx.beginPath(); ctx.arc(jx2, jy2-16, 4, 0, Math.PI*2); ctx.fill();
  }
  // Johnny mrtvý na zemi
  if(gs.story.johnny_dead){
    const jdx = W*0.30, jdy = H*0.72;
    ctx.fillStyle = 'rgba(120,100,60,0.25)'; ctx.fillRect(jdx-12, jdy, 24, 8);
    ctx.beginPath(); ctx.arc(jdx-14, jdy+2, 7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(120,15,15,0.35)';
    ctx.beginPath(); ctx.ellipse(jdx-18, jdy+1, 12, 6, 0.3, 0, Math.PI*2); ctx.fill();
    // Revolver na zemi
    ctx.fillStyle = 'rgba(80,80,90,0.4)'; ctx.fillRect(jdx+15, jdy+3, 10, 3);
    ctx.fillRect(jdx+18, jdy+3, 3, 6);
  }
  // Tajné dveře (po roulette, želízka path)
  if(gs.story.johnny_roulette_played && !gs.story.johnny_dead){
    const sdX = W*0.02, sdY = H*0.45, sdW2 = W*0.08, sdH2 = H*0.18;
    ctx.fillStyle = 'rgba(30,20,45,0.7)'; rrect(sdX, sdY, sdW2, sdH2, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(80,60,120,0.5)'; ctx.lineWidth = 1.5; rrect(sdX, sdY, sdW2, sdH2, 2); ctx.stroke();
    ctx.fillStyle = 'rgba(200,160,60,0.4)'; ctx.beginPath(); ctx.arc(sdX+sdW2*0.85, sdY+sdH2*0.5, 2, 0, Math.PI*2); ctx.fill();
    // Světlo za dveřmi
    const dlG = ctx.createRadialGradient(sdX+sdW2*0.5, sdY+sdH2*0.5, 0, sdX+sdW2*0.5, sdY+sdH2*0.5, sdW2);
    dlG.addColorStop(0, `rgba(40,80,160,${0.08+0.03*Math.sin(ft*2)})`); dlG.addColorStop(1, 'transparent');
    ctx.fillStyle = dlG; ctx.fillRect(sdX, sdY, sdW2, sdH2);
  }

  // ── Bathroom flood – propracovaná povodeň ──
  if(gs.bathroom_flood_anim){
    const f = gs.bathroom_flood_anim;
    const doorX = W * 0.92, doorY = H * 0.40;
    const progress = f.progress;
    const ft2 = t * 0.001;

    // Celoplošná vodní hladina na podlaze – stoupá s progressem
    const waterLevel = H * (0.92 - progress * 0.22);
    const waterH = H - waterLevel;
    if(waterH > 0){
      ctx.save();
      // Hlavní vodní plocha
      const wG = ctx.createLinearGradient(0, waterLevel, 0, H);
      wG.addColorStop(0, `rgba(60,120,200,${0.15 + progress * 0.35})`);
      wG.addColorStop(0.3, `rgba(50,100,180,${0.20 + progress * 0.30})`);
      wG.addColorStop(1, `rgba(35,70,140,${0.30 + progress * 0.35})`);
      ctx.fillStyle = wG; ctx.fillRect(0, waterLevel, W, waterH);
      // Vlny na hladině
      ctx.beginPath(); ctx.moveTo(0, waterLevel);
      for(let wx2=0; wx2<=W; wx2+=14){
        const waveY = waterLevel + Math.sin(wx2*0.025 + ft2*2.5)*2.5 + Math.sin(wx2*0.05 + ft2*4)*1.2;
        ctx.lineTo(wx2, waveY);
      }
      ctx.lineTo(W, waterLevel+8); ctx.lineTo(0, waterLevel+8); ctx.closePath();
      ctx.fillStyle = `rgba(100,170,240,${0.25 + progress*0.25})`; ctx.fill();
      // Odlesky na hladině
      for(let ri=0; ri<12; ri++){
        const rx2 = W*0.05 + (Math.sin(ri*2.7+0.3)*0.5+0.5)*W*0.88;
        const ry2 = waterLevel + 3 + Math.sin(ft2*1.5+ri*1.3)*2;
        const rw2 = 12 + Math.sin(ft2*2+ri)*6;
        const ra = 0.15 + 0.10*Math.sin(ft2*3+ri*2.1);
        ctx.fillStyle = `rgba(180,220,255,${ra})`;
        ctx.beginPath(); ctx.ellipse(rx2, ry2, rw2, 1.5, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
    // Pruh vody zpod dveří koupelny – hlavní proud
    const streamW = 8 + progress * 18;
    const streamG = ctx.createLinearGradient(doorX-60, doorY+25, doorX, doorY+25);
    streamG.addColorStop(0, 'rgba(80,150,210,0)');
    streamG.addColorStop(0.3, `rgba(100,170,230,${0.6+progress*0.3})`);
    streamG.addColorStop(1, `rgba(120,190,240,${0.8+progress*0.15})`);
    ctx.fillStyle = streamG;
    ctx.fillRect(doorX - 60 - progress*W*0.3, doorY+22, 60 + progress*W*0.3, streamW);
    // Kapky ze stropu (kondenzace)
    if(progress > 0.2){
      const dropCount = Math.floor(progress * 10);
      for(let di=0; di<dropCount; di++){
        const dx2 = W*0.1 + (Math.sin(di*137.508)*0.5+0.5)*W*0.75;
        const dropCycle = ((ft2*0.6 + di*0.37) % 1);
        const dy2 = H*0.02 + dropCycle * (waterLevel - H*0.02);
        const da2 = dropCycle < 0.85 ? 0.6 : (1-dropCycle)/0.15*0.6;
        const dSize = 1.5 + Math.sin(di*3)*0.5;
        ctx.fillStyle = `rgba(140,200,255,${da2})`;
        ctx.beginPath(); ctx.arc(dx2, dy2, dSize, 0, Math.PI*2); ctx.fill();
        // Kapka natahující se dolů
        if(dropCycle < 0.85){
          ctx.fillStyle = `rgba(140,200,255,${da2*0.5})`;
          ctx.fillRect(dx2-0.5, dy2-dSize*2, 1, dSize*2);
        }
        // Splash ring na hladině
        if(dropCycle > 0.85){
          const splashT = (dropCycle - 0.85) / 0.15;
          const splashR = 4 + splashT * 12;
          ctx.strokeStyle = `rgba(180,220,255,${(1-splashT)*0.5})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.ellipse(dx2, waterLevel+2, splashR, splashR*0.3, 0, 0, Math.PI*2); ctx.stroke();
        }
      }
    }
    // Plovoucí předměty (při vyšším progressu)
    if(progress > 0.4){
      const floatY = waterLevel + 1;
      // Polštář
      const pxF = W*0.25 + Math.sin(ft2*0.7)*W*0.04;
      const pyF = floatY + Math.sin(ft2*1.3)*1.5;
      const pRot = Math.sin(ft2*0.5)*0.12;
      ctx.save(); ctx.translate(pxF, pyF); ctx.rotate(pRot);
      ctx.fillStyle = `rgba(122,72,128,${0.4+progress*0.3})`; rrect(-12,-5,24,10,3); ctx.fill();
      ctx.restore();
      // Sklenice
      if(progress > 0.55){
        const gxF = W*0.48 + Math.sin(ft2*0.9+1)*W*0.03;
        const gyF = floatY + Math.sin(ft2*1.6+2)*1.2;
        ctx.fillStyle = `rgba(200,230,255,${0.3+progress*0.2})`;
        ctx.fillRect(gxF-4, gyF-8, 8, 10);
        ctx.strokeStyle = `rgba(180,220,255,${0.3+progress*0.2})`; ctx.lineWidth=0.8;
        ctx.strokeRect(gxF-4, gyF-8, 8, 10);
      }
    }
    // Blikání světla (lampa se zkratuje)
    if(progress > 0.5){
      const flicker2 = Math.sin(ft2*15)*Math.sin(ft2*23) > 0.5 ? 0.15 : 0;
      if(flicker2 > 0){
        ctx.fillStyle = `rgba(0,0,0,${flicker2})`; ctx.fillRect(0, 0, W, H);
      }
    }
    // Status HUD
    if(!f.johnnyBroke){
      const pctText = Math.floor(progress*100) + '%';
      const hudW2 = 170, hudH2 = 30;
      ctx.fillStyle = `rgba(20,50,100,${0.65+progress*0.2})`;
      rrect(W*0.5-hudW2/2, 6, hudW2, hudH2, 8); ctx.fill();
      ctx.strokeStyle = `rgba(100,180,255,${0.5+progress*0.3})`; ctx.lineWidth=1.2;
      rrect(W*0.5-hudW2/2, 6, hudW2, hudH2, 8); ctx.stroke();
      // Progress bar
      const barW = hudW2-20, barFill = barW * progress;
      ctx.fillStyle = 'rgba(40,80,140,0.5)'; rrect(W*0.5-barW/2, 26, barW, 5, 2); ctx.fill();
      ctx.fillStyle = progress>0.7 ? 'rgba(220,80,80,0.8)' : 'rgba(100,180,255,0.7)';
      rrect(W*0.5-barW/2, 26, barFill, 5, 2); ctx.fill();
      ctx.fillStyle = 'rgba(200,230,255,0.9)';
      ctx.font = 'bold 11px JetBrains Mono,monospace'; ctx.textAlign = 'center';
      ctx.fillText('💧 POVODEŇ  ' + pctText, W*0.5, 21);
    }
  }

  // ── Jana animace (procházky ve villce) ──
  if(gs.jana_to_bathroom_anim && gs.room === 'johnny_vila'){
    const a = gs.jana_to_bathroom_anim;
    const bob = Math.abs(Math.sin(t*0.012))*4;
    drawJanaPixel(a.x, a.y - bob, t, a.flipX || 1);
    // Jméno
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 11px Outfit,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Jana', a.x, a.y - 38 - bob);
  }
  if(gs.jana_to_toilet_anim && gs.room === 'johnny_vila' && gs.jana_to_toilet_anim.phase !== 'in_toilet'){
    const a = gs.jana_to_toilet_anim;
    const bob = Math.abs(Math.sin(t*0.012))*4;
    drawJanaPixel(a.x, a.y - bob, t, a.flipX || 1);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 11px Outfit,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Jana', a.x, a.y - 38 - bob);
  }

  // ── Sklenice na stole (když je Jana na WC) ──
  if(gs.story.jana_at_toilet && !gs.inv.sklenice_jana){
    const tx = W*0.50, ty = H*0.62;
    // Podstavec
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(tx, ty+8, 14, 4, 0, 0, Math.PI*2); ctx.fill();
    // Sklenice
    ctx.strokeStyle = 'rgba(180,220,255,0.85)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(tx-9, ty-12, 18, 18);
    ctx.fillStyle = gs.story.drink_drugged ? 'rgba(140,90,160,0.55)' : 'rgba(80,40,20,0.55)';
    ctx.fillRect(tx-8, ty-7, 16, 12);
    // Pěna nahoře
    ctx.fillStyle = 'rgba(255,255,220,0.55)';
    ctx.beginPath(); ctx.ellipse(tx, ty-7, 8, 2, 0, 0, Math.PI*2); ctx.fill();
    // Otrávení indikátor (subtilní)
    if(gs.story.drink_drugged){
      const pulse = 0.4 + 0.3*Math.sin(t*0.008);
      ctx.fillStyle = `rgba(180,80,200,${pulse*0.5})`;
      ctx.beginPath(); ctx.arc(tx-3, ty-2, 1.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(tx+4, ty-1, 1.2, 0, Math.PI*2); ctx.fill();
    }
  }

  // ── Charm gauč render (Johnny+Jana na gauči) ──
  if(gs.charm_gauc_anim){
    const a = gs.charm_gauc_anim;
    // Render Johnny – správný vzhled NPC
    const jBobY = a.johnny_y + Math.sin(t*0.003)*3;
    ctx.save();
    ctx.translate(a.johnny_x, jBobY);
    // Aura
    const jaG = ctx.createRadialGradient(0,0,0,0,0,55);
    jaG.addColorStop(0,'#c0a0303a'); jaG.addColorStop(1,'transparent');
    ctx.fillStyle=jaG; ctx.beginPath(); ctx.arc(0,0,55,0,Math.PI*2); ctx.fill();
    // Tělo
    ctx.fillStyle = '#c0a030';
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI*2); ctx.fill();
    // Hlava
    ctx.fillStyle = '#fde8c8';
    ctx.beginPath(); ctx.arc(0, -22, 20, 0, Math.PI*2); ctx.fill();
    drawPixelFace(0, -22, 1);
    // Jméno
    ctx.fillStyle='#fff'; ctx.font='bold 13px Outfit,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    ctx.fillText('Johnny',0,-54);
    ctx.fillStyle='rgba(255,255,255,0.38)'; ctx.font='9px JetBrains Mono,monospace';
    ctx.fillText('MAJITEL VILY',0,-40);
    ctx.restore();
    // Stín
    ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(a.johnny_x+3,jBobY+30,17,7,0,0,Math.PI*2); ctx.fill();
    // Render Jana
    const sleeping = a.phase === 'asleep' || a.phase === 'done';
    const janaY = sleeping ? a.jana_y + 5 : a.jana_y;
    drawJanaPixel(a.jana_x, janaY, t, 1);
    if(sleeping){
      // Z's nad Janou
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 14px Outfit,sans-serif';
      ctx.textAlign = 'center';
      const zOff = (t*0.001) % 1;
      ctx.fillText('Z', a.jana_x - 14 + zOff*4, a.jana_y - 35 - zOff*8);
      ctx.fillText('z', a.jana_x - 8 + zOff*3, a.jana_y - 28 - zOff*6);
    }
  }
}

// ── Offscreen cache pro statické pozadí koupelny ──
let _koupelnaBgCanvas = null, _koupelnaBgW = 0, _koupelnaBgH = 0;
function getKoupelnaBg(W, H){
  if(_koupelnaBgCanvas && _koupelnaBgW === W && _koupelnaBgH === H) return _koupelnaBgCanvas;
  const oc = document.createElement('canvas');
  oc.width = W; oc.height = H;
  const ox = oc.getContext('2d');
  const hor = H * 0.40;

  // ── Podlaha – světlý mramor s žilkami ──
  const flG=ox.createLinearGradient(0,hor,0,H);
  flG.addColorStop(0,'#2a2538'); flG.addColorStop(0.5,'#252035'); flG.addColorStop(1,'#201b30');
  ox.fillStyle=flG; ox.fillRect(0,hor,W,H-hor);
  const tW=58, tH2=44;
  for(let tx=0;tx<W;tx+=tW) for(let ty=Math.floor(hor/tH2)*tH2;ty<H;ty+=tH2){
    const seed=tx*73+ty*137;
    // Dlaždice s jemným gradientem
    const tileG=ox.createLinearGradient(tx,ty,tx+tW,ty+tH2);
    tileG.addColorStop(0,`rgba(160,145,180,${0.08+Math.abs(Math.sin(seed*0.013))*0.06})`);
    tileG.addColorStop(1,`rgba(140,125,165,${0.05+Math.abs(Math.cos(seed*0.017))*0.04})`);
    ox.fillStyle=tileG; ox.fillRect(tx+1,ty+1,tW-2,tH2-2);
    // Mramorové žilky
    ox.strokeStyle=`rgba(180,160,210,${0.06+Math.abs(Math.sin(seed*0.02))*0.05})`; ox.lineWidth=0.6;
    ox.beginPath();
    ox.moveTo(tx+Math.sin(seed)*tW*0.3, ty);
    ox.bezierCurveTo(tx+tW*0.3+Math.cos(seed*2)*12, ty+tH2*0.3, tx+tW*0.6+Math.sin(seed*3)*8, ty+tH2*0.7, tx+tW-Math.sin(seed*4)*tW*0.2, ty+tH2);
    ox.stroke();
    // Druhá žilka
    ox.strokeStyle=`rgba(200,180,230,${0.03+Math.abs(Math.cos(seed*0.03))*0.03})`; ox.lineWidth=0.4;
    ox.beginPath();
    ox.moveTo(tx+tW*0.8, ty+Math.sin(seed*5)*tH2*0.2);
    ox.quadraticCurveTo(tx+tW*0.4, ty+tH2*0.5, tx+tW*0.1, ty+tH2);
    ox.stroke();
    // Spára
    ox.strokeStyle='rgba(60,50,80,0.40)'; ox.lineWidth=0.8;
    ox.strokeRect(tx,ty,tW,tH2);
  }
  // Mokrý odlesk na podlaze
  const wetG=ox.createRadialGradient(W*0.4,H*0.62,0,W*0.4,H*0.62,W*0.45);
  wetG.addColorStop(0,'rgba(140,170,230,0.10)'); wetG.addColorStop(1,'transparent');
  ox.fillStyle=wetG; ox.fillRect(0,hor,W,H-hor);

  // ── Stěny – velkoformátové obklady (světlejší) ──
  const wallG=ox.createLinearGradient(0,0,0,hor);
  wallG.addColorStop(0,'#252040'); wallG.addColorStop(0.5,'#2a2445'); wallG.addColorStop(1,'#302850');
  ox.fillStyle=wallG; ox.fillRect(0,0,W,hor);
  const owW=55, owH=28;
  for(let row=0;row<Math.ceil(hor/owH);row++){
    const ry=row*owH, off=row%2?owW/2:0;
    for(let cx=-owW+off;cx<W+owW;cx+=owW){
      const tileL=0.04+Math.abs(Math.sin(cx*0.04+row*1.2))*0.05;
      ox.fillStyle=`rgba(180,170,220,${tileL})`;
      ox.fillRect(cx+1,ry+1,owW-2,owH-2);
      // Lesk na obkladačce
      const glintA=Math.abs(Math.sin(cx*0.08+row*2.1))*0.03;
      ox.fillStyle=`rgba(220,210,250,${glintA})`;
      ox.fillRect(cx+2,ry+2,owW*0.4,owH*0.3);
      ox.strokeStyle='rgba(40,35,65,0.45)'; ox.lineWidth=0.6;
      ox.strokeRect(cx,ry,owW,owH);
    }
  }
  // Lišta přechodu stěna/podlaha
  ox.fillStyle='rgba(120,100,160,0.35)'; ox.fillRect(0,hor-H*0.01,W,H*0.02);
  ox.strokeStyle='rgba(80,65,120,0.40)'; ox.lineWidth=1;
  ox.beginPath(); ox.moveTo(0,hor-H*0.01); ox.lineTo(W,hor-H*0.01); ox.stroke();
  ox.beginPath(); ox.moveTo(0,hor+H*0.01); ox.lineTo(W,hor+H*0.01); ox.stroke();

  // ── Vlhkostní skvrny / plíseň ──
  [[W*0.06,H*0.06,35],[W*0.90,H*0.10,30],[W*0.48,H*0.03,25],[W*0.12,H*0.32,20]].forEach(([sx,sy,r])=>{
    const sG=ox.createRadialGradient(sx,sy,0,sx,sy,r);
    sG.addColorStop(0,'rgba(20,40,70,0.30)'); sG.addColorStop(0.6,'rgba(25,45,75,0.10)'); sG.addColorStop(1,'transparent');
    ox.fillStyle=sG; ox.beginPath(); ox.arc(sx,sy,r,0,Math.PI*2); ox.fill();
  });

  _koupelnaBgCanvas = oc; _koupelnaBgW = W; _koupelnaBgH = H;
  return oc;
}

// ─── Koupelna (luxusní, zanedbaná – Johnnyho vila) ──────────────────────────
function drawKoupelna(W,H,t){
  const ft=t*0.001;
  const hor=H*0.40;

  // ══ POZADÍ z cache ══════════════════════════════════════════════════
  ctx.drawImage(getKoupelnaBg(W, H), 0, 0);

  // ══ STROPNÍ LAMPY (3ks – teplé bodovky) ════════════════════════════
  [{x:W*0.15,y:6,on:true},{x:W*0.50,y:6,on:true},{x:W*0.82,y:6,on:true,flicker:true}].forEach((lp,idx)=>{
    const flick=lp.flicker?(0.65+0.35*Math.abs(Math.sin(t*0.018+idx*4))):1;
    const lit=lp.on?flick:0.05;
    // Kabel
    ctx.strokeStyle='rgba(60,55,80,0.50)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(lp.x,0); ctx.lineTo(lp.x,lp.y+8); ctx.stroke();
    // Stínítko
    ctx.fillStyle='rgba(50,45,70,0.65)';
    ctx.beginPath(); ctx.moveTo(lp.x-12,lp.y+5); ctx.lineTo(lp.x+12,lp.y+5); ctx.lineTo(lp.x+8,lp.y+14); ctx.lineTo(lp.x-8,lp.y+14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(100,90,140,0.40)'; ctx.lineWidth=1; ctx.stroke();
    // Žárovka
    const bG=ctx.createRadialGradient(lp.x,lp.y+12,0,lp.x,lp.y+12,5);
    bG.addColorStop(0,`rgba(255,230,170,${lit*0.90})`); bG.addColorStop(1,`rgba(255,200,100,${lit*0.25})`);
    ctx.fillStyle=bG; ctx.beginPath(); ctx.arc(lp.x,lp.y+12,4,0,Math.PI*2); ctx.fill();
    // Kužel světla dolů
    const cG=ctx.createLinearGradient(lp.x,lp.y+14,lp.x,hor+H*0.10);
    cG.addColorStop(0,`rgba(255,220,150,${lit*0.16})`); cG.addColorStop(0.4,`rgba(255,210,140,${lit*0.06})`); cG.addColorStop(1,'transparent');
    ctx.fillStyle=cG;
    ctx.beginPath(); ctx.moveTo(lp.x-10,lp.y+14); ctx.lineTo(lp.x+10,lp.y+14); ctx.lineTo(lp.x+W*0.12,hor+H*0.10); ctx.lineTo(lp.x-W*0.12,hor+H*0.10); ctx.closePath(); ctx.fill();
  });

  // ══ LED PÁSEK PO OBVODU STROPU ═════════════════════════════════════
  const ledFlick = 0.85 + 0.15 * Math.abs(Math.sin(ft * 4.1));
  const ledGlitch = Math.sin(ft*17.3) > 0.97 ? 0.4 : 1;
  const ledA = ledFlick * ledGlitch;
  ctx.fillStyle=`rgba(100,160,255,${ledA*0.70})`; ctx.fillRect(0,0,W,2);
  const ledGlow=ctx.createLinearGradient(0,0,0,H*0.18);
  ledGlow.addColorStop(0,`rgba(100,160,255,${ledA*0.15})`); ledGlow.addColorStop(1,'transparent');
  ctx.fillStyle=ledGlow; ctx.fillRect(0,0,W,H*0.18);
  ctx.fillStyle=`rgba(100,160,255,${ledA*0.40})`; ctx.fillRect(0,0,2,hor); ctx.fillRect(W-2,0,2,hor);

  // ══ VANA S JACUZZI (vlevo nahoře) ═══════════════════════════════════
  const vx=W*0.02, vy=H*0.08, vW=W*0.28, vH=H*0.52;
  // Vnější tělo vany
  const vanaG=ctx.createLinearGradient(vx,vy,vx,vy+vH);
  vanaG.addColorStop(0,'rgba(210,210,225,0.28)'); vanaG.addColorStop(1,'rgba(180,180,200,0.18)');
  ctx.fillStyle=vanaG; rrect(vx,vy,vW,vH,8); ctx.fill();
  ctx.strokeStyle='rgba(190,195,215,0.40)'; ctx.lineWidth=2; rrect(vx,vy,vW,vH,8); ctx.stroke();
  // Okraj vany (lesklý)
  ctx.fillStyle='rgba(220,220,235,0.25)'; ctx.fillRect(vx+2,vy,vW-4,4);
  // Vnitřek
  ctx.fillStyle='rgba(25,22,40,0.55)'; rrect(vx+5,vy+5,vW-10,vH-10,6); ctx.fill();
  // Voda ve vaně
  const waterLvl=vy+vH*0.22;
  const bathG=ctx.createLinearGradient(vx,waterLvl,vx,vy+vH-5);
  bathG.addColorStop(0,'rgba(80,130,200,0.30)'); bathG.addColorStop(0.5,'rgba(60,110,180,0.35)'); bathG.addColorStop(1,'rgba(45,85,150,0.40)');
  ctx.fillStyle=bathG; rrect(vx+6,waterLvl,vW-12,vy+vH-5-waterLvl,5); ctx.fill();
  // Vodní hladina – zvlnění
  ctx.beginPath(); ctx.moveTo(vx+6,waterLvl);
  for(let wx=vx+6;wx<=vx+vW-6;wx+=3){
    ctx.lineTo(wx,waterLvl+Math.sin(wx*0.06+ft*2.2)*1.5+Math.sin(wx*0.12+ft*3.5)*0.8);
  }
  ctx.lineTo(vx+vW-6,waterLvl+4); ctx.lineTo(vx+6,waterLvl+4); ctx.closePath();
  ctx.fillStyle='rgba(120,170,240,0.20)'; ctx.fill();
  // Odlesky na hladině
  for(let ri=0;ri<4;ri++){
    const rx=vx+12+ri*(vW-24)/3, ry=waterLvl+2+Math.sin(ft*1.5+ri*1.8)*1;
    ctx.fillStyle=`rgba(200,230,255,${0.10+0.06*Math.sin(ft*2.5+ri*2)})`;
    ctx.beginPath(); ctx.ellipse(rx,ry,8+Math.sin(ft*1.8+ri)*3,1,0,0,Math.PI*2); ctx.fill();
  }
  // Bubliny jacuzzi
  for(let b=0;b<8;b++){
    const bPhase=((ft*0.5+b*0.31)%1);
    const bx2=vx+12+b*(vW-24)/7;
    const by2=vy+vH-12-bPhase*(vH*0.50);
    const bA2=bPhase<0.65?(0.35-bPhase*0.25):0;
    if(bA2>0){
      ctx.strokeStyle=`rgba(170,210,255,${bA2})`; ctx.lineWidth=0.6;
      ctx.beginPath(); ctx.arc(bx2+Math.sin(ft*1.3+b*2)*3,by2,1.8+Math.sin(b*1.3)*0.6,0,Math.PI*2); ctx.stroke();
    }
  }
  // Baterie vany (chromová, stojánková)
  ctx.fillStyle='rgba(200,205,220,0.55)'; ctx.fillRect(vx+vW-20,vy+vH*0.12,6,vH*0.15);
  ctx.fillStyle='rgba(210,210,225,0.50)'; ctx.beginPath(); ctx.arc(vx+vW-17,vy+vH*0.12,5,0,Math.PI*2); ctx.fill();
  // Výtok baterie (oblouk)
  ctx.strokeStyle='rgba(195,200,215,0.45)'; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(vx+vW-17,vy+vH*0.12); ctx.quadraticCurveTo(vx+vW-10,vy+vH*0.06,vx+vW-22,vy+vH*0.18); ctx.stroke();
  ctx.lineCap='butt';
  // Svíčky kolem vany (4ks – 2 hoří, 2 vyhořelé)
  const candles=[[vx-4,vy+vH*0.03,12],[vx+vW*0.18,vy-8,10],[vx+vW*0.50,vy-6,14],[vx+vW-6,vy+vH*0.01,9]];
  candles.forEach(([cx2,cy2,cH2],ci)=>{
    // Vosk (zbytky nateklé)
    if(ci < 2){
      ctx.fillStyle='rgba(240,220,170,0.35)'; ctx.beginPath(); ctx.ellipse(cx2,cy2+cH2+2,5,2,0,0,Math.PI*2); ctx.fill();
    }
    // Svíčka tělo
    ctx.fillStyle=ci<2?'rgba(230,210,160,0.55)':'rgba(170,160,150,0.30)';
    ctx.fillRect(cx2-2.5,cy2,5,cH2);
    // Knot
    ctx.fillStyle='rgba(40,30,20,0.7)'; ctx.fillRect(cx2-0.5,cy2-3,1,3);
    if(ci < 2){
      // Plamen
      const flameH=5+Math.sin(ft*9+ci*4)*2;
      const flameA=0.70+Math.sin(ft*14+ci*6)*0.15;
      // Vnitřní plamen (bílý)
      ctx.fillStyle=`rgba(255,240,180,${flameA*0.8})`; ctx.beginPath(); ctx.ellipse(cx2,cy2-flameH*0.3,1.5,flameH*0.5,0,0,Math.PI*2); ctx.fill();
      // Vnější plamen (oranžový)
      ctx.fillStyle=`rgba(255,180,50,${flameA*0.6})`; ctx.beginPath(); ctx.ellipse(cx2,cy2-flameH*0.4,2.5,flameH,0,0,Math.PI*2); ctx.fill();
      // Záře
      const cG=ctx.createRadialGradient(cx2,cy2-2,0,cx2,cy2-2,25);
      cG.addColorStop(0,`rgba(255,190,60,${flameA*0.18})`); cG.addColorStop(0.5,`rgba(255,150,40,${flameA*0.06})`); cG.addColorStop(1,'transparent');
      ctx.fillStyle=cG; ctx.beginPath(); ctx.arc(cx2,cy2-2,25,0,Math.PI*2); ctx.fill();
    }
  });
  // Pěnová koupel (povrch)
  for(let fi=0;fi<10;fi++){
    const fx=vx+10+fi*(vW-20)/9, fy=waterLvl+1+Math.sin(ft*0.8+fi*1.3)*0.5;
    const fr=4+Math.sin(fi*2.1)*2;
    ctx.fillStyle=`rgba(240,240,250,${0.08+0.04*Math.sin(ft+fi)})`;
    ctx.beginPath(); ctx.ellipse(fx,fy,fr,fr*0.4,0,0,Math.PI*2); ctx.fill();
  }

  // ══ DVOJITÉ UMYVADLO + VELKÉ ZRCADLO (střed nahoře) ════════════════
  const mX=W*0.32, mY=H*0.02, mW=W*0.40, mH=H*0.24;
  // LED podsvícení zrcadla (výrazné)
  const mirLedA = ledA * 0.7;
  // Záře kolem zrcadla
  const mirLedG=ctx.createRadialGradient(mX+mW/2,mY+mH/2,mW*0.25,mX+mW/2,mY+mH/2,mW*0.65);
  mirLedG.addColorStop(0,`rgba(180,210,255,${mirLedA*0.18})`); mirLedG.addColorStop(1,'transparent');
  ctx.fillStyle=mirLedG; ctx.fillRect(mX-20,mY-20,mW+40,mH+40);
  // LED pásy kolem rámu
  ctx.fillStyle=`rgba(160,200,255,${mirLedA*0.50})`; ctx.fillRect(mX-3,mY-3,mW+6,2); ctx.fillRect(mX-3,mY+mH+1,mW+6,2);
  ctx.fillRect(mX-3,mY-3,2,mH+6); ctx.fillRect(mX+mW+1,mY-3,2,mH+6);
  // Rám (chromový)
  ctx.strokeStyle=`rgba(180,190,220,${0.40+mirLedA*0.20})`; ctx.lineWidth=2;
  rrect(mX-2,mY-2,mW+4,mH+4,5); ctx.stroke();
  // Plocha zrcadla
  ctx.save();
  ctx.beginPath(); rrect(mX,mY,mW,mH,4); ctx.clip();
  const mirG=ctx.createLinearGradient(mX,mY,mX,mY+mH);
  mirG.addColorStop(0,'#252a3a'); mirG.addColorStop(0.5,'#1e2230'); mirG.addColorStop(1,'#181c28');
  ctx.fillStyle=mirG; ctx.fillRect(mX,mY,mW,mH);
  // Odraz místnosti (schematický)
  ctx.fillStyle='rgba(160,170,200,0.06)'; ctx.fillRect(mX+mW*0.1,mY+mH*0.6,mW*0.8,mH*0.35);
  // Odraz hráče (silueta)
  ctx.fillStyle='rgba(200,210,230,0.12)';
  ctx.beginPath(); ctx.arc(mX+mW*0.5,mY+mH*0.32,10,0,Math.PI*2); ctx.fill();
  ctx.fillRect(mX+mW*0.5-6,mY+mH*0.45,12,mH*0.35);
  // Orosení
  ctx.fillStyle='rgba(210,225,245,0.12)'; ctx.fillRect(mX,mY,mW,mH);
  // Stíraný pruh (průhledné okénko)
  ctx.save(); ctx.globalCompositeOperation='destination-out'; ctx.fillStyle='rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(mX+mW*0.15,mY+mH*0.22);
  ctx.bezierCurveTo(mX+mW*0.35,mY+mH*0.12,mX+mW*0.65,mY+mH*0.14,mX+mW*0.82,mY+mH*0.25);
  ctx.bezierCurveTo(mX+mW*0.78,mY+mH*0.40,mX+mW*0.25,mY+mH*0.42,mX+mW*0.12,mY+mH*0.32);
  ctx.closePath(); ctx.fill(); ctx.restore();
  // LED odraz v zrcadle (nahoře i dole)
  ctx.fillStyle=`rgba(120,180,255,${mirLedA*0.15})`; ctx.fillRect(mX,mY,mW,4); ctx.fillRect(mX,mY+mH-4,mW,4);
  // Rohový lesk
  ctx.fillStyle='rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.moveTo(mX,mY); ctx.lineTo(mX+mW*0.22,mY); ctx.lineTo(mX,mY+mH*0.25); ctx.closePath(); ctx.fill();
  ctx.restore();

  // ── Mramorová deska pod umyvadly ──
  const cntY=H*0.27;
  const cntG=ctx.createLinearGradient(mX-W*0.02,cntY,mX-W*0.02,cntY+H*0.13);
  cntG.addColorStop(0,'rgba(60,55,85,0.55)'); cntG.addColorStop(1,'rgba(45,40,70,0.40)');
  ctx.fillStyle=cntG; rrect(mX-W*0.02,cntY,mW+W*0.04,H*0.13,3); ctx.fill();
  ctx.strokeStyle='rgba(100,90,140,0.35)'; ctx.lineWidth=1.5; rrect(mX-W*0.02,cntY,mW+W*0.04,H*0.13,3); ctx.stroke();
  // Žilky v mramoru desky
  ctx.strokeStyle='rgba(140,120,180,0.12)'; ctx.lineWidth=0.5;
  ctx.beginPath(); ctx.moveTo(mX,cntY+H*0.03); ctx.bezierCurveTo(mX+mW*0.3,cntY+H*0.01,mX+mW*0.7,cntY+H*0.05,mX+mW,cntY+H*0.02); ctx.stroke();

  // Umyvadlo levé (čisté)
  const u1x=mX+mW*0.03, u1y=cntY+H*0.01;
  ctx.fillStyle='rgba(210,210,225,0.30)'; rrect(u1x,u1y,mW*0.40,H*0.10,4); ctx.fill();
  ctx.strokeStyle='rgba(190,195,215,0.35)'; ctx.lineWidth=1.5; rrect(u1x,u1y,mW*0.40,H*0.10,4); ctx.stroke();
  ctx.fillStyle='rgba(25,22,40,0.50)'; rrect(u1x+4,u1y+4,mW*0.40-8,H*0.06,3); ctx.fill();
  // Odtok
  ctx.fillStyle='rgba(70,65,100,0.55)'; ctx.beginPath(); ctx.arc(u1x+mW*0.20,u1y+H*0.07,3.5,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(100,95,130,0.40)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(u1x+mW*0.20,u1y+H*0.07,6,0,Math.PI*2); ctx.stroke();
  // Baterie levá (moderní, oblouková)
  ctx.fillStyle='rgba(200,205,220,0.55)'; ctx.fillRect(u1x+mW*0.17,u1y-H*0.05,W*0.015,H*0.05);
  ctx.strokeStyle='rgba(195,200,215,0.45)'; ctx.lineWidth=2.5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(u1x+mW*0.175,u1y-H*0.05); ctx.quadraticCurveTo(u1x+mW*0.22,u1y-H*0.07,u1x+mW*0.20,u1y-H*0.01); ctx.stroke();
  ctx.lineCap='butt';

  // ── Voda stříká z umyvadla (po aktivaci) ──
  if(gs.sink_water_anim){
    const sinkT = (t - gs.sink_water_anim.t0) * 0.001;
    const faucetX = u1x + mW*0.20, faucetY = u1y - H*0.01;
    const pressure = Math.min(1, sinkT * 2);
    // Hlavní proud vody (oblouk do umyvadla)
    for(let si=0; si<12; si++){
      const sp = (si/12 + ft*3.5) % 1;
      const sx2 = faucetX + sp * mW*0.08 * (Math.sin(si*2.3+ft*8)*0.3);
      const sy2 = faucetY + sp * H*0.06;
      const sA = pressure * (1-sp) * 0.7;
      ctx.fillStyle = `rgba(140,200,255,${sA})`;
      ctx.beginPath(); ctx.ellipse(sx2, sy2, 1.5+sp*2, 1, 0, 0, Math.PI*2); ctx.fill();
    }
    // Kapky stříkající do stran (tlak)
    for(let di=0; di<16; di++){
      const dPhase = ((ft*2.5 + di*0.19) % 1);
      const angle = (di/16) * Math.PI - Math.PI*0.5 + Math.sin(ft*5+di)*0.4;
      const dist = dPhase * W*0.06 * pressure;
      const dx = faucetX + Math.cos(angle) * dist;
      const dy = faucetY + Math.sin(angle) * dist * 0.6 + dPhase * dPhase * H*0.08;
      const dA = pressure * (1-dPhase) * 0.55;
      if(dA > 0.02){
        ctx.fillStyle = `rgba(160,215,255,${dA})`;
        ctx.beginPath(); ctx.arc(dx, dy, 1+Math.sin(di*3)*0.5, 0, Math.PI*2); ctx.fill();
      }
    }
    // Mlha/pára od stříkající vody
    for(let mi=0; mi<6; mi++){
      const mPhase = ((ft*0.3 + mi*0.17) % 1);
      const mx = faucetX + Math.sin(mi*4+ft*2)*mW*0.12;
      const my = faucetY - mPhase*H*0.12;
      const mR = 6+mPhase*12;
      const mA2 = pressure * (1-mPhase) * 0.08;
      ctx.fillStyle = `rgba(200,230,255,${mA2})`;
      ctx.beginPath(); ctx.arc(mx, my, mR, 0, Math.PI*2); ctx.fill();
    }
    // Voda přetéká z umyvadla na podlahu
    if(sinkT > 3){
      const overflow = Math.min(1, (sinkT-3)/8);
      const oY = u1y + H*0.10;
      for(let oi=0; oi<4; oi++){
        const oPhase = ((ft*0.6+oi*0.25)%1);
        const ox2 = u1x + mW*0.10 + oi*mW*0.08;
        const oy2 = oY + oPhase*H*0.25*overflow;
        ctx.fillStyle = `rgba(120,180,240,${(1-oPhase)*overflow*0.4})`;
        ctx.beginPath(); ctx.ellipse(ox2, oy2, 1.5, 4, 0, 0, Math.PI*2); ctx.fill();
      }
      // Kaluž pod umyvadlem
      const puddleA = overflow * 0.25;
      ctx.fillStyle = `rgba(80,140,210,${puddleA})`;
      ctx.beginPath(); ctx.ellipse(u1x+mW*0.20, cntY+H*0.20, mW*0.25*overflow, H*0.02*overflow, 0, 0, Math.PI*2); ctx.fill();
    }
  }

  // Umyvadlo pravé (špinavé – Johnnyho)
  const u2x=mX+mW*0.57, u2y=cntY+H*0.01;
  ctx.fillStyle='rgba(195,190,205,0.25)'; rrect(u2x,u2y,mW*0.40,H*0.10,4); ctx.fill();
  ctx.strokeStyle='rgba(175,170,190,0.30)'; ctx.lineWidth=1.5; rrect(u2x,u2y,mW*0.40,H*0.10,4); ctx.stroke();
  ctx.fillStyle='rgba(25,22,40,0.50)'; rrect(u2x+4,u2y+4,mW*0.40-8,H*0.06,3); ctx.fill();
  // Špinavé skvrny
  ctx.fillStyle='rgba(140,100,60,0.20)'; ctx.beginPath(); ctx.arc(u2x+mW*0.12,u2y+H*0.05,6,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(120,85,50,0.15)'; ctx.beginPath(); ctx.arc(u2x+mW*0.28,u2y+H*0.04,4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(100,70,40,0.10)'; ctx.beginPath(); ctx.arc(u2x+mW*0.18,u2y+H*0.03,3,0,Math.PI*2); ctx.fill();
  // Baterie pravá
  ctx.fillStyle='rgba(185,190,205,0.45)'; ctx.fillRect(u2x+mW*0.17,u2y-H*0.05,W*0.015,H*0.05);
  // Kapající voda z pravé baterie
  for(let d=0;d<4;d++){
    const dPh=((ft*0.45+d*0.28)%1);
    const dY=u2y-H*0.01+dPh*H*0.08;
    ctx.fillStyle=`rgba(170,210,250,${(1-dPh)*0.65})`;
    ctx.beginPath(); ctx.ellipse(u2x+mW*0.18,dY,1.2,3.5,0,0,Math.PI*2); ctx.fill();
  }
  // Dávkovač mýdla (mezi umyvadly)
  const spx2=mX+mW*0.46, spy2=cntY+H*0.02;
  ctx.fillStyle='rgba(180,180,200,0.35)'; rrect(spx2,spy2,W*0.025,H*0.06,2); ctx.fill();
  ctx.fillStyle='rgba(200,200,220,0.40)'; ctx.beginPath(); ctx.arc(spx2+W*0.0125,spy2,4,0,Math.PI*2); ctx.fill();
  // Pumpička
  ctx.fillStyle='rgba(180,185,200,0.45)'; ctx.fillRect(spx2+W*0.008,spy2-H*0.025,W*0.008,H*0.025);

  // ══ SKŘÍŇKA POD UMYVADLY (šuplík) ═════════════════════════════════
  const sdx=mX-W*0.01, sdy=cntY+H*0.13;
  const sdG=ctx.createLinearGradient(sdx,sdy,sdx,sdy+H*0.10);
  sdG.addColorStop(0,'rgba(45,38,65,0.60)'); sdG.addColorStop(1,'rgba(35,28,55,0.50)');
  ctx.fillStyle=sdG; rrect(sdx,sdy,mW+W*0.02,H*0.10,3); ctx.fill();
  ctx.strokeStyle='rgba(80,70,115,0.35)'; ctx.lineWidth=1; rrect(sdx,sdy,mW+W*0.02,H*0.10,3); ctx.stroke();
  // Dvířka
  ctx.strokeStyle='rgba(75,65,110,0.25)'; ctx.lineWidth=0.8;
  ctx.strokeRect(sdx+4,sdy+3,mW*0.47,H*0.10-6);
  ctx.strokeRect(sdx+mW*0.49,sdy+3,mW*0.47,H*0.10-6);
  if(!gs.story.koupelna_drawer_opened){
    // Úchytky (2ks chromové)
    [sdx+mW*0.22, sdx+mW*0.72].forEach(hx=>{
      const hy=sdy+H*0.045;
      ctx.fillStyle='rgba(200,200,215,0.40)'; rrect(hx,hy,mW*0.08,H*0.010,2); ctx.fill();
      ctx.strokeStyle='rgba(230,230,240,0.20)'; ctx.lineWidth=0.8; rrect(hx,hy,mW*0.08,H*0.010,2); ctx.stroke();
    });
  } else {
    ctx.fillStyle='rgba(15,12,25,0.50)'; rrect(sdx+4,sdy+3,mW*0.47,H*0.10-6,2); ctx.fill();
    ctx.fillStyle='rgba(100,90,135,0.25)'; ctx.font='8px monospace'; ctx.textAlign='center';
    ctx.fillText('prázdný',sdx+mW*0.25,sdy+H*0.06); ctx.textAlign='left';
  }

  // ══ WC + BIDET (vpravo) ════════════════════════════════════════════
  const tox=W*0.74, toy=H*0.48;
  // Závěsný záchod – nádržka zapuštěná ve stěně
  ctx.fillStyle='rgba(55,48,80,0.45)'; rrect(tox-W*0.01,toy-H*0.12,W*0.10,H*0.12,2); ctx.fill();
  ctx.strokeStyle='rgba(80,70,115,0.30)'; ctx.lineWidth=1; rrect(tox-W*0.01,toy-H*0.12,W*0.10,H*0.12,2); ctx.stroke();
  // Splachovací tlačítko (dvojité – chromové)
  const flushX=tox+W*0.015, flushY=toy-H*0.09;
  ctx.fillStyle='rgba(200,200,215,0.45)'; rrect(flushX,flushY,W*0.05,H*0.04,3); ctx.fill();
  ctx.strokeStyle='rgba(220,220,235,0.30)'; ctx.lineWidth=1; rrect(flushX,flushY,W*0.05,H*0.04,3); ctx.stroke();
  ctx.strokeStyle='rgba(180,185,200,0.30)'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(flushX+W*0.025,flushY+2); ctx.lineTo(flushX+W*0.025,flushY+H*0.04-2); ctx.stroke();
  // Mísa – elipsa
  ctx.fillStyle='rgba(210,210,225,0.25)';
  ctx.beginPath(); ctx.ellipse(tox+W*0.04,toy+H*0.08,W*0.048,H*0.08,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(190,195,215,0.30)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.ellipse(tox+W*0.04,toy+H*0.08,W*0.048,H*0.08,0,0,Math.PI*2); ctx.stroke();
  // Sedátko
  ctx.strokeStyle='rgba(205,210,230,0.25)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(tox+W*0.04,toy+H*0.06,W*0.040,H*0.06,0,0,Math.PI*2); ctx.stroke();

  // Bidet (menší, vedle WC)
  const bix=W*0.74, biy=H*0.68;
  ctx.fillStyle='rgba(200,200,215,0.18)';
  ctx.beginPath(); ctx.ellipse(bix+W*0.04,biy+H*0.04,W*0.035,H*0.045,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(180,185,205,0.22)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(bix+W*0.04,biy+H*0.04,W*0.035,H*0.045,0,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='rgba(190,195,210,0.35)'; ctx.fillRect(bix+W*0.03,biy-H*0.01,W*0.02,H*0.02);
  // Toaletní papír (na držáku vedle WC)
  const tpx=W*0.70, tpy=toy+H*0.02;
  ctx.fillStyle='rgba(160,155,180,0.35)'; ctx.fillRect(tpx,tpy,2,H*0.06); // držák
  ctx.fillStyle='rgba(240,235,225,0.35)'; ctx.beginPath(); ctx.arc(tpx+7,tpy+H*0.03,6,0,Math.PI*2); ctx.fill(); // role
  ctx.fillStyle='rgba(220,215,205,0.25)'; ctx.beginPath(); ctx.arc(tpx+7,tpy+H*0.03,2.5,0,Math.PI*2); ctx.fill(); // dutinka
  // Svislý pruh papíru visící dolů
  ctx.fillStyle='rgba(235,230,220,0.25)'; ctx.fillRect(tpx+5,tpy+H*0.03+6,4,H*0.04);

  // ══ RADIÁTOR NA RUČNÍKY (pravá stěna) ══════════════════════════════
  const rdx=W*0.87, rdy=H*0.08, rdW=W*0.10, rdH=H*0.30;
  // Teplá záře od radiátoru
  const radG=ctx.createRadialGradient(rdx+rdW/2,rdy+rdH/2,0,rdx+rdW/2,rdy+rdH/2,rdW*1.5);
  radG.addColorStop(0,'rgba(255,180,120,0.06)'); radG.addColorStop(1,'transparent');
  ctx.fillStyle=radG; ctx.beginPath(); ctx.arc(rdx+rdW/2,rdy+rdH/2,rdW*1.5,0,Math.PI*2); ctx.fill();
  // Trubky
  ctx.strokeStyle='rgba(175,180,200,0.35)'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(rdx,rdy); ctx.lineTo(rdx,rdy+rdH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(rdx+rdW,rdy); ctx.lineTo(rdx+rdW,rdy+rdH); ctx.stroke();
  ctx.lineWidth=2.5;
  for(let r=0;r<7;r++){
    const ry2=rdy+r*(rdH/6);
    ctx.strokeStyle=`rgba(170,175,195,${0.30+Math.sin(r*0.8)*0.05})`;
    ctx.beginPath(); ctx.moveTo(rdx,ry2); ctx.lineTo(rdx+rdW,ry2); ctx.stroke();
  }
  // Mokrý ručník (tmavý, teplý)
  ctx.fillStyle='rgba(180,110,80,0.25)'; ctx.fillRect(rdx+2,rdy+rdH*0.10,rdW-4,rdH*0.22);
  // Hadr – interaktivní item
  if(!gs.inv.hadr){
    const hadPulse=0.25+0.12*Math.sin(t*0.005);
    ctx.fillStyle=`rgba(230,220,200,${hadPulse+0.18})`; ctx.fillRect(rdx+2,rdy+rdH*0.40,rdW-4,rdH*0.18);
    const hadG=ctx.createRadialGradient(rdx+rdW/2,rdy+rdH*0.49,0,rdx+rdW/2,rdy+rdH*0.49,rdW);
    hadG.addColorStop(0,`rgba(255,245,210,${hadPulse*0.35})`); hadG.addColorStop(1,'transparent');
    ctx.fillStyle=hadG; ctx.beginPath(); ctx.arc(rdx+rdW/2,rdy+rdH*0.49,rdW,0,Math.PI*2); ctx.fill();
  } else {
    ctx.fillStyle='rgba(160,90,60,0.12)'; ctx.fillRect(rdx+2,rdy+rdH*0.40,rdW-4,rdH*0.18);
  }

  // ══ MATNÉ OKÉNKO (pravá stěna nahoře) ══════════════════════════════
  const wox=W*0.87, woy=H*0.01, woW=W*0.09, woH=H*0.05;
  ctx.fillStyle='rgba(70,90,130,0.25)'; rrect(wox,woy,woW,woH,2); ctx.fill();
  ctx.strokeStyle='rgba(110,130,170,0.35)'; ctx.lineWidth=1.5; rrect(wox,woy,woW,woH,2); ctx.stroke();
  const wGl=ctx.createRadialGradient(wox+woW/2,woy+woH/2,0,wox+woW/2,woy+woH/2,woW*0.6);
  wGl.addColorStop(0,'rgba(140,175,230,0.18)'); wGl.addColorStop(1,'transparent');
  ctx.fillStyle=wGl; ctx.fillRect(wox,woy,woW,woH);
  ctx.strokeStyle='rgba(90,105,145,0.30)'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.moveTo(wox+woW/2,woy); ctx.lineTo(wox+woW/2,woy+woH); ctx.stroke();

  // ══ PRÁDELNÍ KOŠ (vlevo dole) ═════════════════════════════════════
  const pkx=W*0.04, pky=H*0.64, pkW=W*0.09, pkH=H*0.16;
  // Košíkový pletený vzor
  ctx.fillStyle='rgba(100,80,55,0.30)'; rrect(pkx,pky,pkW,pkH,4); ctx.fill();
  ctx.strokeStyle='rgba(120,100,70,0.35)'; ctx.lineWidth=1.2; rrect(pkx,pky,pkW,pkH,4); ctx.stroke();
  for(let pr=0;pr<5;pr++){
    ctx.strokeStyle='rgba(130,110,75,0.18)'; ctx.lineWidth=0.6;
    const pry=pky+4+pr*(pkH-8)/4;
    ctx.beginPath(); ctx.moveTo(pkx+2,pry); ctx.lineTo(pkx+pkW-2,pry); ctx.stroke();
  }
  // Diagonální pletení
  for(let pd=0;pd<3;pd++){
    ctx.strokeStyle='rgba(125,105,72,0.12)'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(pkx+pd*(pkW/3),pky); ctx.lineTo(pkx+pkW,pky+pkH-pd*(pkH/3)); ctx.stroke();
  }
  // Oblečení trčící z koše
  ctx.fillStyle='rgba(70,110,170,0.30)';
  ctx.beginPath(); ctx.moveTo(pkx+pkW*0.15,pky-1); ctx.bezierCurveTo(pkx+pkW*0.20,pky-10,pkx+pkW*0.40,pky-12,pkx+pkW*0.50,pky-2); ctx.lineTo(pkx+pkW*0.15,pky+3); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(200,70,70,0.25)';
  ctx.beginPath(); ctx.moveTo(pkx+pkW*0.65,pky); ctx.bezierCurveTo(pkx+pkW*0.80,pky-12,pkx+pkW*0.95,pky-8,pkx+pkW*0.85,pky-3); ctx.lineTo(pkx+pkW*0.60,pky+2); ctx.closePath(); ctx.fill();

  // ══ PODLAHOVÁ VPUSŤ (chromová, uprostřed) ═════════════════════════
  const drainX=W*0.48, drainY=H*0.63;
  ctx.fillStyle='rgba(75,70,100,0.45)'; ctx.beginPath(); ctx.arc(drainX,drainY,8,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(150,145,180,0.35)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(drainX,drainY,8,0,Math.PI*2); ctx.stroke();
  for(let gi=0;gi<4;gi++){
    ctx.strokeStyle='rgba(140,135,170,0.30)'; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(drainX-6,drainY-4+gi*2.5); ctx.lineTo(drainX+6,drainY-4+gi*2.5); ctx.stroke();
  }
  // Křížová mřížka
  ctx.strokeStyle='rgba(140,135,170,0.25)'; ctx.lineWidth=0.6;
  ctx.beginPath(); ctx.moveTo(drainX,drainY-6); ctx.lineTo(drainX,drainY+6); ctx.stroke();

  // ══ PÁRA ══════════════════════════════════════════════════════════
  ctx.save();
  for(let i=0;i<14;i++){
    const sl=((t*0.00007+i*0.14)%1);
    const smX=W*0.06+Math.abs(Math.sin(i*31+t*0.00013))*W*0.68;
    const smY=hor-sl*H*0.38;
    const smR=W*0.03+sl*W*0.045;
    const smA=0.07*(1-sl);
    const sG=ctx.createRadialGradient(smX,smY,0,smX,smY,smR);
    sG.addColorStop(0,`rgba(210,225,245,${smA})`); sG.addColorStop(1,'transparent');
    ctx.fillStyle=sG; ctx.beginPath(); ctx.arc(smX,smY,smR,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // ══ VODNÍ ANIMACE (povodeň v koupelně) ═════════════════════════════
  if(gs.bathroom_flood_anim && gs.room === 'koupelna'){
    const fp=gs.bathroom_flood_anim.progress;
    const floodH2=H*0.25*fp;
    const waterTop=H-floodH2;
    const floodG2=ctx.createLinearGradient(0,waterTop,0,H);
    floodG2.addColorStop(0,`rgba(60,120,210,${0.28+fp*0.30})`);
    floodG2.addColorStop(0.4,`rgba(50,100,190,${0.32+fp*0.25})`);
    floodG2.addColorStop(1,`rgba(40,80,160,${0.42+fp*0.25})`);
    ctx.fillStyle=floodG2; ctx.fillRect(0,waterTop,W,floodH2);
    ctx.beginPath(); ctx.moveTo(0,waterTop);
    for(let wx3=0;wx3<=W;wx3+=4){
      ctx.lineTo(wx3,waterTop+Math.sin(wx3*0.03+ft*2.8)*3+Math.sin(wx3*0.07+ft*4.5)*1.5);
    }
    ctx.lineTo(W,waterTop+10); ctx.lineTo(0,waterTop+10); ctx.closePath();
    ctx.fillStyle=`rgba(100,175,245,${0.22+fp*0.22})`; ctx.fill();
    for(let ri2=0;ri2<8;ri2++){
      const rx3=W*0.08+ri2*W*0.11, ry3=waterTop+2+Math.sin(ft*1.8+ri2*1.5)*1.5;
      ctx.fillStyle=`rgba(195,235,255,${0.14+0.08*Math.sin(ft*3+ri2*2)})`;
      ctx.beginPath(); ctx.ellipse(rx3,ry3,10+Math.sin(ft*2+ri2)*4,1.2,0,0,Math.PI*2); ctx.fill();
    }
    if(fp > 0.2){
      for(let bi=0;bi<Math.floor(fp*8);bi++){
        const bx2=W*0.1+(Math.sin(bi*4.7)*0.5+0.5)*W*0.7;
        const bCycle=((ft*0.4+bi*0.29)%1);
        const by2=H-bCycle*floodH2*0.8;
        ctx.strokeStyle=`rgba(190,230,255,${bCycle<0.8?0.35:0.35*(1-(bCycle-0.8)/0.2)})`; ctx.lineWidth=0.6;
        ctx.beginPath(); ctx.arc(bx2+Math.sin(ft*2+bi)*3,by2,1.5+Math.sin(bi*3)*0.8,0,Math.PI*2); ctx.stroke();
      }
    }
    for(let di2=0;di2<4;di2++){
      const dPh2=((ft*1.2+di2*0.2)%1);
      ctx.fillStyle=`rgba(130,195,250,${(1-dPh2)*0.5})`;
      ctx.beginPath(); ctx.arc(vx+vW*0.7+di2*5,vy+vH*0.3+dPh2*(waterTop-vy-vH*0.3),1.5,0,Math.PI*2); ctx.fill();
    }
  }

  // ══ DVEŘE (vstup ze vily, dole uprostřed) ══════════════════════════
  const doorW = W*0.14, doorH = H*0.18;
  const doorX = W*0.5 - doorW*0.5, doorY = H*0.82;
  if(gs.door_kick_anim){
    const el = (t - gs.door_kick_anim.t0) * 0.001;

    // ── Shockwave – dvojitá vlna ──
    if(el < 0.5){
      const shockT = el / 0.5;
      // Vnější vlna
      const shockR1 = shockT * W * 0.55, shockA1 = (1 - shockT) * 0.3;
      ctx.strokeStyle = `rgba(255,200,120,${shockA1})`; ctx.lineWidth = 3 + (1-shockT)*6;
      ctx.beginPath(); ctx.arc(doorX+doorW*0.5, doorY+doorH*0.5, shockR1, 0, Math.PI*2); ctx.stroke();
      // Vnitřní vlna
      if(el > 0.08){
        const shockT2 = (el-0.08) / 0.42;
        const shockR2 = shockT2 * W * 0.35, shockA2 = (1 - shockT2) * 0.2;
        ctx.strokeStyle = `rgba(255,160,80,${shockA2})`; ctx.lineWidth = 2 + (1-shockT2)*3;
        ctx.beginPath(); ctx.arc(doorX+doorW*0.5, doorY+doorH*0.5, shockR2, 0, Math.PI*2); ctx.stroke();
      }
    }

    // ── Flash ──
    if(el < 0.12){
      const flashA = (0.12 - el) / 0.12;
      ctx.fillStyle = `rgba(255,240,180,${flashA * 0.7})`; ctx.fillRect(0, 0, W, H);
    }

    // ── Dveře se rozlomí na dvě půlky ──
    const flyT = Math.min(el / 0.7, 1);
    const flyEase = 1 - (1 - flyT) * (1 - flyT); // ease-out
    const doorAlpha = el > 2.0 ? Math.max(0, 1 - (el - 2.0) * 0.8) : 1;

    // Levá půlka – letí doleva a rotuje
    ctx.save(); ctx.globalAlpha = doorAlpha;
    const lx = doorX + doorW*0.25 - flyEase * W * 0.12;
    const ly = doorY + doorH*0.5 - flyEase * H * 0.15 + (flyT > 0.5 ? (flyT-0.5)*200*(flyT-0.5) : 0);
    ctx.translate(lx, ly);
    ctx.rotate(-flyEase * 0.7 + (el > 0.7 ? Math.sin(el*6)*0.04*(1-Math.min((el-0.7)/0.5,1)) : 0));
    // Stín
    ctx.fillStyle = `rgba(0,0,0,${doorAlpha*0.25})`;
    ctx.beginPath(); ctx.ellipse(4, doorH*0.55, doorW*0.35, 5, 0.1, 0, Math.PI*2); ctx.fill();
    // Panel
    ctx.fillStyle = '#3a2a38'; ctx.fillRect(-doorW*0.25, -doorH*0.5, doorW*0.5, doorH);
    ctx.strokeStyle = 'rgba(180,130,110,0.5)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(-doorW*0.25, -doorH*0.5, doorW*0.5, doorH);
    // Výplň
    ctx.strokeStyle = 'rgba(100,70,90,0.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(-doorW*0.2, -doorH*0.4, doorW*0.4, doorH*0.35);
    // Zlomená hrana – zubaté dřevo
    ctx.fillStyle = '#5a3a48';
    for(let zi=0; zi<6; zi++){
      const zy = -doorH*0.5 + zi*doorH/6;
      const zw = 3 + Math.sin(zi*2.1)*3;
      ctx.fillRect(doorW*0.25-zw, zy, zw, doorH/6);
    }
    // Pant nahoře
    ctx.fillStyle = '#888'; ctx.fillRect(-doorW*0.25-2, -doorH*0.45, 6, 8);
    ctx.restore();

    // Pravá půlka – letí doprava
    ctx.save(); ctx.globalAlpha = doorAlpha;
    const rx = doorX + doorW*0.75 + flyEase * W * 0.10;
    const ry = doorY + doorH*0.5 - flyEase * H * 0.08 + (flyT > 0.4 ? (flyT-0.4)*250*(flyT-0.4) : 0);
    ctx.translate(rx, ry);
    ctx.rotate(flyEase * 0.55 + (el > 0.7 ? Math.sin(el*5)*0.03*(1-Math.min((el-0.7)/0.4,1)) : 0));
    ctx.fillStyle = `rgba(0,0,0,${doorAlpha*0.2})`;
    ctx.beginPath(); ctx.ellipse(-2, doorH*0.55, doorW*0.3, 4, -0.1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3a2a38'; ctx.fillRect(-doorW*0.25, -doorH*0.5, doorW*0.5, doorH);
    ctx.strokeStyle = 'rgba(180,130,110,0.5)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(-doorW*0.25, -doorH*0.5, doorW*0.5, doorH);
    ctx.strokeStyle = 'rgba(100,70,90,0.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(-doorW*0.15, -doorH*0.4, doorW*0.35, doorH*0.35);
    // Klika (odlétlá)
    ctx.fillStyle = 'rgba(200,160,60,0.5)'; ctx.beginPath();
    ctx.arc(doorW*0.15, 0, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#5a3a48';
    for(let zi=0; zi<6; zi++){
      const zy = -doorH*0.5 + zi*doorH/6;
      const zw = 2 + Math.cos(zi*1.8)*3;
      ctx.fillRect(-doorW*0.25, zy, zw, doorH/6);
    }
    ctx.restore();

    // ── Třísky – více, variovanější ──
    if(gs.door_kick_anim.splinters){
      let allDead = true;
      gs.door_kick_anim.splinters.forEach(sp => {
        const spEl2 = (t - sp.t0) * 0.001;
        const spLife = sp.life || 1.2;
        const spA2 = Math.max(0, 1 - spEl2/spLife);
        if(spA2 <= 0) return; allDead = false;
        ctx.save(); ctx.globalAlpha = spA2;
        const grav = 180 * spEl2 * spEl2;
        ctx.translate(sp.x + sp.vx * spEl2, sp.y + sp.vy * spEl2 + grav);
        ctx.rotate(sp.rot + spEl2 * sp.rotV); ctx.fillStyle = sp.col;
        ctx.fillRect(-sp.w*0.5, -sp.h*0.5, sp.w, sp.h);
        // Světelný odlesk na třískách
        if(sp.w > 8){
          ctx.fillStyle = 'rgba(255,220,180,0.15)';
          ctx.fillRect(-sp.w*0.3, -sp.h*0.5, sp.w*0.3, sp.h*0.4);
        }
        ctx.restore();
      });
      if(allDead) gs.door_kick_anim.splinters = null;
    }

    // ── Prach – objemnější oblaky ──
    if(el < 2.5){
      const dustT = Math.min(el / 0.6, 1), dustFade = el > 1.2 ? Math.max(0, 1 - (el-1.2)/1.3) : 1;
      for(let di3=0; di3<18; di3++){
        const dAngle = di3 * 0.35 + el * 1.5;
        const dDist = dustT * (W*0.06 + di3*W*0.005);
        const dx3 = doorX + doorW*0.5 + Math.sin(dAngle)*dDist;
        const dy3 = doorY + doorH*0.5 + Math.cos(dAngle)*dDist*0.7 - dustT*H*0.03;
        const dSize = 4 + dustT*14 + di3*1.2;
        const dAlpha = dustFade * (0.15 - di3*0.006);
        if(dAlpha > 0){
          const dCol = di3 % 3 === 0 ? '180,160,140' : '140,120,110';
          ctx.fillStyle = `rgba(${dCol},${dAlpha})`;
          ctx.beginPath(); ctx.arc(dx3, dy3, dSize, 0, Math.PI*2); ctx.fill();
        }
      }
    }

    // ── Prázdný rám (díra) – vidět skrz do chodby ──
    ctx.fillStyle = '#050308'; rrect(doorX, doorY, doorW, doorH, 2); ctx.fill();
    // Rám s popraskáním
    ctx.strokeStyle = 'rgba(80,40,60,0.9)'; ctx.lineWidth = 3;
    rrect(doorX, doorY, doorW, doorH, 2); ctx.stroke();
    // Praskliny v rámu
    ctx.strokeStyle = 'rgba(60,30,45,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(doorX, doorY+doorH*0.3); ctx.lineTo(doorX+5, doorY+doorH*0.2);
    ctx.moveTo(doorX+doorW, doorY+doorH*0.6); ctx.lineTo(doorX+doorW-4, doorY+doorH*0.7);
    ctx.moveTo(doorX+doorW*0.3, doorY); ctx.lineTo(doorX+doorW*0.35, doorY+4);
    ctx.stroke();
    // Světlo z chodby
    const holeG = ctx.createRadialGradient(doorX+doorW*0.5, doorY+doorH*0.5, 0, doorX+doorW*0.5, doorY+doorH*0.5, doorW*0.8);
    holeG.addColorStop(0, 'rgba(120,60,180,0.2)'); holeG.addColorStop(1, 'rgba(80,30,120,0.05)');
    ctx.fillStyle = holeG; rrect(doorX+3, doorY+3, doorW-6, doorH-6, 2); ctx.fill();
    // Odlomené panty
    ctx.fillStyle = '#777';
    ctx.fillRect(doorX-1, doorY+4, 5, 10);
    ctx.fillRect(doorX-1, doorY+doorH-14, 5, 10);
    ctx.fillStyle = '#555';
    ctx.fillRect(doorX, doorY+6, 3, 6);
    ctx.fillRect(doorX, doorY+doorH-12, 3, 6);

  } else if(gs.story.bathroom_door_broken){
    // ── Trvale rozbitý rám ──
    ctx.fillStyle = '#050308'; rrect(doorX, doorY, doorW, doorH, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(80,40,60,0.8)'; ctx.lineWidth = 3;
    rrect(doorX, doorY, doorW, doorH, 2); ctx.stroke();
    // Praskliny
    ctx.strokeStyle = 'rgba(60,30,45,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(doorX, doorY+doorH*0.3); ctx.lineTo(doorX+5, doorY+doorH*0.15);
    ctx.moveTo(doorX+doorW, doorY+doorH*0.6); ctx.lineTo(doorX+doorW-4, doorY+doorH*0.75);
    ctx.moveTo(doorX+doorW*0.3, doorY); ctx.lineTo(doorX+doorW*0.35, doorY+5);
    ctx.stroke();
    // Světlo z chodby
    const holeG2 = ctx.createRadialGradient(doorX+doorW*0.5, doorY+doorH*0.5, 0, doorX+doorW*0.5, doorY+doorH*0.5, doorW*0.8);
    holeG2.addColorStop(0, 'rgba(120,60,180,0.18)'); holeG2.addColorStop(1, 'rgba(80,30,120,0.06)');
    ctx.fillStyle = holeG2; rrect(doorX+3, doorY+3, doorW-6, doorH-6, 2); ctx.fill();
    // Odlomené panty
    ctx.fillStyle = '#777';
    ctx.fillRect(doorX-1, doorY+4, 5, 10);
    ctx.fillRect(doorX-1, doorY+doorH-14, 5, 10);
    // Třísky na zemi
    const debrisData = [
      [doorX-W*0.04, doorY+doorH+6, -0.25, 14, 5, '#5a3a50'],
      [doorX+doorW+W*0.01, doorY+doorH+3, 0.35, 10, 4, '#4a2a40'],
      [doorX+doorW*0.3, doorY+doorH+10, 0.15, 18, 4, '#6a4060'],
      [doorX-W*0.02, doorY+doorH+14, -0.4, 8, 3, '#3a1a30'],
      [doorX+doorW*0.7, doorY+doorH+8, 0.5, 12, 3, '#5a3a50'],
      [doorX+doorW*0.1, doorY+doorH+16, 0.1, 6, 3, '#7a5070'],
    ];
    debrisData.forEach(([x,y,rot,w,h,c])=>{
      ctx.fillStyle=c; ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
      ctx.fillRect(-w/2,-h/2,w,h); ctx.restore();
    });
    // Větší kus dveří opřený o zeď vlevo
    ctx.save();
    ctx.translate(doorX - W*0.06, doorY + doorH*0.7);
    ctx.rotate(-0.15);
    ctx.fillStyle = '#3a2a38'; ctx.fillRect(0, -doorH*0.35, doorW*0.35, doorH*0.55);
    ctx.strokeStyle = 'rgba(100,70,90,0.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(0, -doorH*0.35, doorW*0.35, doorH*0.55);
    ctx.strokeRect(3, -doorH*0.30, doorW*0.3, doorH*0.2);
    ctx.restore();
    // Prachové stopy na podlaze
    ctx.fillStyle = 'rgba(140,120,110,0.06)';
    ctx.beginPath(); ctx.ellipse(doorX+doorW*0.5, doorY+doorH+8, doorW*0.8, 12, 0, 0, Math.PI*2); ctx.fill();
    // Nápis
    ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.font='10px monospace'; ctx.textAlign='center';
    ctx.fillText('↓ ZPĚT DO VILY', W*0.5, doorY + doorH + 28); ctx.textAlign='left';
  } else {
    ctx.fillStyle = '#4a3540'; rrect(doorX, doorY, doorW, doorH, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(180,130,110,0.45)'; ctx.lineWidth = 1.5; rrect(doorX, doorY, doorW, doorH, 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(100,70,90,0.4)'; ctx.lineWidth = 1;
    rrect(doorX+4, doorY+4, doorW-8, doorH*0.42, 2); ctx.stroke();
    rrect(doorX+4, doorY+doorH*0.44, doorW-8, doorH*0.42, 2); ctx.stroke();
    ctx.fillStyle='rgba(200,160,60,0.5)'; ctx.beginPath(); ctx.arc(doorX+doorW-8,doorY+doorH*0.5,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.font='10px monospace'; ctx.textAlign='center';
    ctx.fillText('↓ ZPĚT DO VILY', W*0.5, doorY + doorH + 18); ctx.textAlign='left';
  }

  // ══ JOHNNY + JANA V KOUPELNĚ (gun scene – propracovaný) ══════
  if(gs.story.johnny_in_bathroom && !gs.story.jana_fleeing){
    const jbx = W*0.28, jby = H*0.62;
    const jbBob = Math.sin(t*0.002)*2;
    const gunTense2 = Math.sin(t*0.008) * 0.03;
    // Dramatické osvětlení
    const dramG2 = ctx.createRadialGradient(W*0.48, H*0.55, W*0.12, W*0.48, H*0.55, W*0.55);
    dramG2.addColorStop(0, 'transparent'); dramG2.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = dramG2; ctx.fillRect(0, 0, W, H);
    // Stín
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(jbx+3,jby+32,20,8,0,0,Math.PI*2); ctx.fill();
    // Pulzující aura hněvu
    const jAP = 0.25 + 0.12*Math.sin(t*0.006);
    const jaG3b = ctx.createRadialGradient(jbx,jby+jbBob,0,jbx,jby+jbBob,60);
    jaG3b.addColorStop(0,`rgba(200,100,0,${jAP})`); jaG3b.addColorStop(0.5,`rgba(180,60,0,${jAP*0.4})`); jaG3b.addColorStop(1,'transparent');
    ctx.fillStyle=jaG3b; ctx.beginPath(); ctx.arc(jbx,jby+jbBob,60,0,Math.PI*2); ctx.fill();
    // Tělo + Hlava
    ctx.fillStyle='#c0a030'; ctx.beginPath(); ctx.arc(jbx,jby+jbBob,27,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(jbx,jby+jbBob-22,20,0,Math.PI*2); ctx.fill();
    drawAngryFace(jbx, jby+jbBob-22, 1);
    // Pistole
    ctx.save(); ctx.translate(jbx+22, jby+jbBob-4); ctx.rotate(-0.15 + gunTense2);
    ctx.fillStyle='#3a3a3a'; ctx.fillRect(0,-4,32,8);
    ctx.fillStyle='#2a2a2a'; ctx.fillRect(20,-7,6,14);
    ctx.fillStyle='#4a4a4a'; ctx.fillRect(-2,-2.5,5,5);
    if(gs.story.gun_shot1||gs.story.gun_shot2){
      const shotT2 = gs.story.gun_shot2 ? gs._shot2t : gs._shot1t;
      const mA3=Math.max(0,0.8-((gs.ts-shotT2)||999)*0.003);
      if(mA3>0){
        ctx.fillStyle=`rgba(255,200,40,${mA3*0.7})`; ctx.beginPath(); ctx.arc(34,0,12+mA3*8,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=`rgba(255,255,200,${mA3})`; ctx.beginPath(); ctx.arc(34,0,5,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=`rgba(255,240,150,${mA3*0.3})`; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(34,0); ctx.lineTo(34+W*0.35,Math.sin(shotT2*0.01)*20); ctx.stroke();
      }
      // Dým z hlavně
      const smkEl = (gs.ts - shotT2) * 0.001;
      if(smkEl > 0 && smkEl < 2){
        for(let si3=0;si3<4;si3++){
          const smx2 = 34 + smkEl*12 + si3*5 + Math.sin(t*0.003+si3)*3;
          const smy2 = -smkEl*8 - si3*4;
          const smr2 = 2 + smkEl*5 + si3*2;
          const sma2 = Math.max(0, 0.3 - smkEl*0.15 - si3*0.05);
          ctx.fillStyle=`rgba(180,180,180,${sma2})`; ctx.beginPath(); ctx.arc(smx2,smy2,smr2,0,Math.PI*2); ctx.fill();
        }
      }
    }
    ctx.restore();
    // Jméno
    ctx.fillStyle='rgba(220,140,0,0.9)'; ctx.font='bold 13px Outfit,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    ctx.fillText('Johnny',jbx,jby+jbBob-56);
    ctx.fillStyle='rgba(255,255,255,0.38)'; ctx.font='9px JetBrains Mono,monospace';
    ctx.fillText('MAJITEL VILY',jbx,jby+jbBob-43);
    // Kulkové díry
    if(gs.story.gun_shot1){
      const bh1x2=W*0.72, bh1y2=H*0.60;
      ctx.fillStyle='rgba(20,15,25,0.8)'; ctx.beginPath(); ctx.arc(bh1x2,bh1y2,4,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(80,60,70,0.6)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(bh1x2,bh1y2,6,0,Math.PI*2); ctx.stroke();
      for(let ci3=0;ci3<5;ci3++){
        const ca3=ci3*1.25+0.3;
        ctx.strokeStyle='rgba(60,40,50,0.5)'; ctx.lineWidth=0.8;
        ctx.beginPath(); ctx.moveTo(bh1x2+Math.cos(ca3)*5,bh1y2+Math.sin(ca3)*5);
        ctx.lineTo(bh1x2+Math.cos(ca3)*(10+ci3*3),bh1y2+Math.sin(ca3)*(8+ci3*2)); ctx.stroke();
      }
    }
    if(gs.story.gun_shot2){
      const bh2x2=W*0.45, bh2y2=H*0.15;
      ctx.fillStyle='rgba(20,15,25,0.8)'; ctx.beginPath(); ctx.arc(bh2x2,bh2y2,3.5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(80,60,70,0.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(bh2x2,bh2y2,5.5,0,Math.PI*2); ctx.stroke();
      for(let ci4=0;ci4<4;ci4++){
        const ca4=ci4*1.5+0.8;
        ctx.strokeStyle='rgba(60,40,50,0.4)'; ctx.lineWidth=0.7;
        ctx.beginPath(); ctx.moveTo(bh2x2+Math.cos(ca4)*4,bh2y2+Math.sin(ca4)*4);
        ctx.lineTo(bh2x2+Math.cos(ca4)*(8+ci4*2),bh2y2+Math.sin(ca4)*(6+ci4*2)); ctx.stroke();
      }
    }
    // Jana – vpravo, třesoucí se po výstřelech
    const janx2 = W*0.68, jany2 = H*0.62;
    const janaShk = gs.story.gun_shot1 ? Math.sin(t*0.02)*2 : 0;
    drawJanaPixel(janx2 + janaShk, jany2, t, -1);
    ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.font='bold 11px Outfit,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    ctx.fillText('Jana', janx2, jany2-56);
  }

  // ══ DODGE MINIHRA HUD ══════════════════════════════════════════
  if(gs.dodge){
    const d = gs.dodge;
    const phase = d.phase;
    const cx = W*0.5, cy = H*0.78;
    const jx = W*0.65, jy = H*0.50;
    // ── Heartbeat vignette (aim + dodge) ──
    if(phase.startsWith('aim') || phase.startsWith('dodge')){
      const hbRate = phase.startsWith('dodge') ? 0.014 : 0.008;
      const hb = Math.pow(Math.abs(Math.sin(t*hbRate)), 3);
      const hbG = ctx.createRadialGradient(cx,H*0.5,W*0.05,cx,H*0.5,W*0.8);
      hbG.addColorStop(0,'transparent');
      hbG.addColorStop(0.6,'transparent');
      hbG.addColorStop(1,`rgba(60,0,0,${hb*0.35})`);
      ctx.fillStyle=hbG; ctx.fillRect(0,0,W,H);
    }

    // ── Muzzle flash (z pozice Johnnyho NPC) ──
    if(d.successFlash > 0 || d.hitFlash > 0){
      const flashTS = d.successFlash || d.hitFlash;
      if(gs.ts - flashTS < 250){
        const mfP = 1 - (gs.ts - flashTS)/250;
        const mfX = W*0.65, mfY = H*0.50;
        const mfG = ctx.createRadialGradient(mfX,mfY,0,mfX,mfY,50*mfP);
        mfG.addColorStop(0,`rgba(255,255,200,${mfP*0.9})`);
        mfG.addColorStop(0.3,`rgba(255,180,60,${mfP*0.6})`);
        mfG.addColorStop(1,'transparent');
        ctx.fillStyle=mfG; ctx.fillRect(mfX-60,mfY-60,120,120);
        for(let sp=0;sp<10;sp++){
          const spAng = (sp/10)*Math.PI*2 + gs.ts*0.01;
          const spDist = (1-mfP)*70;
          ctx.fillStyle=`rgba(255,220,100,${mfP*0.5})`;
          ctx.beginPath(); ctx.arc(mfX+Math.cos(spAng)*spDist, mfY+Math.sin(spAng)*spDist, 2.5*mfP, 0, Math.PI*2); ctx.fill();
        }
      }
    }

    // ── Laser sight od pistole k hráči ──
    if(phase.startsWith('aim') || phase.startsWith('dodge')){
      const crossT = gs.ts*0.003;
      const sway = phase.startsWith('dodge') ? 0.03 : 0.08;
      const crossX = cx + Math.sin(crossT*1.7)*W*sway + (d.playerPos||0)*W*0.12;
      const crossY = cy + Math.sin(crossT*2.3)*H*0.02;
      const lsA = phase.startsWith('dodge') ? 0.5 : 0.2+0.15*Math.sin(t*0.008);

      // Laser linie
      ctx.save();
      ctx.strokeStyle=`rgba(255,0,0,${lsA*0.3})`; ctx.lineWidth=1;
      ctx.setLineDash([4,6]);
      ctx.beginPath(); ctx.moveTo(jx+40,jy+4); ctx.lineTo(crossX,crossY); ctx.stroke();
      ctx.setLineDash([]);

      // Laser dot
      const ldG = ctx.createRadialGradient(crossX,crossY,0,crossX,crossY,8);
      ldG.addColorStop(0,`rgba(255,0,0,${lsA})`);
      ldG.addColorStop(1,'transparent');
      ctx.fillStyle=ldG; ctx.beginPath(); ctx.arc(crossX,crossY,8,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=`rgba(255,50,50,${lsA})`; ctx.beginPath(); ctx.arc(crossX,crossY,2,0,Math.PI*2); ctx.fill();

      // Zaměřovač
      ctx.strokeStyle=`rgba(255,40,40,${lsA*0.8})`; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(crossX,crossY,16,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(crossX-22,crossY); ctx.lineTo(crossX-8,crossY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(crossX+8,crossY); ctx.lineTo(crossX+22,crossY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(crossX,crossY-22); ctx.lineTo(crossX,crossY-8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(crossX,crossY+8); ctx.lineTo(crossX,crossY+22); ctx.stroke();
      ctx.restore();
    }

    // ── Hráčská figura ──
    if(phase.startsWith('dodge') || phase.startsWith('result') || phase.startsWith('hit')){
      const px = cx + d.playerPos * W*0.20;
      const py = cy;
      const hitShake = (phase.startsWith('hit') && d.hitFlash > 0) ? Math.max(0,1-(gs.ts-d.hitFlash)*0.003)*6 : 0;
      const shX = hitShake*(Math.random()-0.5)*2;

      ctx.save(); ctx.translate(px+shX, py);
      // Stín
      ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0,24,20,5,0,0,Math.PI*2); ctx.fill();
      // Nohy
      const legBob = phase.startsWith('dodge') ? Math.sin(t*0.02)*2 : 0;
      ctx.fillStyle='#2a2848'; ctx.fillRect(-8,8+legBob,6,16); ctx.fillRect(2,8-legBob,6,16);
      // Trup
      const tCol = d.playerDodged ? '#2a7a40' : phase.startsWith('hit') ? '#6a2020' : '#4a3868';
      ctx.fillStyle=tCol; rrect(-12,-8,24,18,4); ctx.fill();
      // Hlava
      ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(0,-16,10,0,Math.PI*2); ctx.fill();
      // Vlasy
      ctx.fillStyle='#5a3a20'; ctx.beginPath(); ctx.arc(0,-20,9,Math.PI,0); ctx.fill();
      // Oči
      const eyeW = phase.startsWith('dodge') ? 3.5 : 2.5;
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-3.5,-16,eyeW,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(3.5,-16,eyeW,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#1a1a2e'; ctx.beginPath(); ctx.arc(-3.5,-16,1.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(3.5,-16,1.5,0,Math.PI*2); ctx.fill();
      // Ústa (strach)
      if(phase.startsWith('dodge')){
        ctx.strokeStyle='#a06040'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(0,-11,3,0,Math.PI); ctx.stroke();
      }
      // Blood on hit
      if(phase.startsWith('hit') && d.hitFlash > 0){
        const bp = Math.min(1,(gs.ts-d.hitFlash)*0.002);
        ctx.fillStyle=`rgba(180,20,20,${0.8-bp*0.3})`;
        ctx.beginPath(); ctx.arc(4,12,4+bp*3,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-2,16,2+bp*2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8,18,1.5+bp,0,Math.PI*2); ctx.fill();
      }
      // Label
      ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='bold 10px Outfit,sans-serif';
      ctx.textAlign='center'; ctx.fillText('HRUBEŠ',0,-32);
      ctx.restore();

      // Dodge direction indicator
      if(phase.startsWith('dodge') && !d.playerDodged){
        const targetX = cx + (d.dodgeDir==='left' ? -1 : 1) * W*0.20;
        const arrBob = Math.sin(t*0.014)*6;
        const arrP = 0.6 + 0.4*Math.sin(t*0.016);
        // Trail
        ctx.fillStyle=`rgba(255,220,60,${arrP*0.08})`;
        ctx.beginPath(); ctx.arc(targetX,py,40,0,Math.PI*2); ctx.fill();
        // Big arrow
        ctx.save(); ctx.translate(targetX+arrBob, py);
        if(d.dodgeDir==='right') ctx.scale(-1,1);
        ctx.fillStyle=`rgba(255,220,60,${arrP})`;
        ctx.beginPath(); ctx.moveTo(-24,0); ctx.lineTo(0,-18); ctx.lineTo(0,-10); ctx.lineTo(16,-10); ctx.lineTo(16,10); ctx.lineTo(0,10); ctx.lineTo(0,18); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }

    // ── Aim phase – varovný nápis ──
    if(phase === 'aim1' || phase === 'aim2'){
      const pulse = 0.6 + 0.4*Math.sin(t*0.010);
      ctx.fillStyle='rgba(0,0,0,0.55)';
      rrect(cx-W*0.24, H*0.26, W*0.48, H*0.14, 10); ctx.fill();
      ctx.strokeStyle=`rgba(255,60,60,${pulse*0.7})`; ctx.lineWidth=2;
      rrect(cx-W*0.24, H*0.26, W*0.48, H*0.14, 10); ctx.stroke();
      ctx.fillStyle=`rgba(255,80,80,${pulse})`; ctx.font='bold 26px Outfit,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(phase==='aim1' ? '⚠️  JOHNNY MÍŘÍ!' : '⚠️  MÍŘÍ ZNOVU!', cx, H*0.31);
      ctx.fillStyle=`rgba(255,180,180,${pulse*0.6})`; ctx.font='13px Outfit,sans-serif';
      ctx.fillText(phase==='aim1' ? 'Připrav se uhýbat!' : 'Tentokrát rychleji!', cx, H*0.37);
      ctx.textBaseline='alphabetic';
    }

    // ── Dodge phase – pokyny + countdown ──
    if(phase === 'dodge1' || phase === 'dodge2'){
      const elapsed = gs.ts - d.dodgeStart;
      const remaining = Math.max(0, 1 - elapsed / d.dodgeWindow);

      // Panel
      ctx.fillStyle='rgba(0,0,0,0.65)';
      rrect(cx-W*0.30, H*0.22, W*0.60, H*0.26, 12); ctx.fill();

      const dirLabel = d.dodgeDir === 'left' ? 'DOLEVA' : 'DOPRAVA';
      const pulse2 = 0.8 + 0.2*Math.sin(t*0.018);

      // Title
      ctx.fillStyle=`rgba(255,220,60,${pulse2})`; ctx.font='bold 24px Outfit,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('UHNI ' + dirLabel + '!', cx, H*0.28);

      // Velká šipka
      const keyX = cx, keyY = H*0.36;
      const keyPulse = 0.85+0.15*Math.sin(t*0.015);
      // Glow circle
      const glowR = 42 + Math.sin(t*0.01)*4;
      const glowG = ctx.createRadialGradient(keyX,keyY,0,keyX,keyY,glowR+20);
      glowG.addColorStop(0,`rgba(255,220,60,${keyPulse*0.15})`);
      glowG.addColorStop(1,'transparent');
      ctx.fillStyle=glowG; ctx.fillRect(keyX-70,keyY-70,140,140);
      // Circle
      ctx.strokeStyle=`rgba(255,220,60,${keyPulse})`; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(keyX,keyY,glowR,0,Math.PI*2); ctx.stroke();
      // Countdown arc
      ctx.strokeStyle=`rgba(255,${Math.floor(remaining*200)},40,0.9)`; ctx.lineWidth=5;
      ctx.beginPath(); ctx.arc(keyX,keyY,glowR,-Math.PI/2,-Math.PI/2+remaining*Math.PI*2); ctx.stroke();
      // Arrow inside
      ctx.save(); ctx.translate(keyX, keyY);
      if(d.dodgeDir==='right') ctx.scale(-1,1);
      ctx.fillStyle=`rgba(255,255,255,${keyPulse})`;
      ctx.beginPath(); ctx.moveTo(-22,0); ctx.lineTo(6,-18); ctx.lineTo(6,-9); ctx.lineTo(22,-9); ctx.lineTo(22,9); ctx.lineTo(6,9); ctx.lineTo(6,18); ctx.closePath(); ctx.fill();
      ctx.restore();
      // Key hint
      ctx.fillStyle=`rgba(255,220,60,${keyPulse*0.7})`; ctx.font='bold 13px Outfit,sans-serif';
      ctx.fillText(d.dodgeDir==='left'?'← nebo A':'→ nebo D', keyX, keyY+58);

      // Timer text
      const timeLeft = Math.max(0, (d.dodgeWindow - elapsed)/1000);
      ctx.fillStyle = remaining < 0.3 ? `rgba(255,60,60,${pulse2})` : `rgba(255,255,255,${pulse2*0.7})`;
      ctx.font='bold 16px "Courier New",monospace';
      ctx.fillText(timeLeft.toFixed(1)+'s', cx, H*0.455);

      ctx.textBaseline='alphabetic';

      // Danger vignette
      const vigA = (1-remaining)*0.5;
      const vigG = ctx.createRadialGradient(cx,H*0.5,W*0.08,cx,H*0.5,W*0.7);
      vigG.addColorStop(0,'transparent'); vigG.addColorStop(1,`rgba(180,0,0,${vigA})`);
      ctx.fillStyle=vigG; ctx.fillRect(0,0,W,H);

      // Pulsing border at low time
      if(remaining < 0.4){
        const bInt = 1-remaining;
        const bPulse = Math.sin(t*0.025)*0.35+0.5;
        ctx.strokeStyle=`rgba(255,0,0,${bPulse*bInt})`; ctx.lineWidth=4;
        ctx.strokeRect(2,2,W-4,H-4);
        // Corner flashes
        const cf = bPulse*bInt*0.6;
        ctx.fillStyle=`rgba(255,0,0,${cf})`;
        ctx.fillRect(0,0,30,30); ctx.fillRect(W-30,0,30,30);
        ctx.fillRect(0,H-30,30,30); ctx.fillRect(W-30,H-30,30,30);
      }
    }

    // ── Bullet tracer + impact ──
    if(d.successFlash > 0 || d.hitFlash > 0){
      const flashT = d.successFlash || d.hitFlash;
      const bElapsed = (gs.ts - flashT)*0.003;
      if(bElapsed < 1.5){
        const fromX = jx+40, fromY = jy+4;
        const hit = d.hitFlash > 0 && d.hitFlash === flashT;
        const toX = hit ? cx + (d.playerPos||0)*W*0.20 : (cx + (d.dodgeDir==='left'?1:-1)*W*0.25);
        const toY = cy;
        // Tracer
        const trP = Math.min(1, bElapsed*5);
        const trA = Math.max(0, 0.8-bElapsed*0.6);
        const trLenP = Math.min(1, bElapsed*3);
        const trX = fromX + (toX-fromX)*trLenP;
        const trY = fromY + (toY-fromY)*trLenP;
        ctx.strokeStyle=`rgba(255,220,80,${trA})`; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(fromX,fromY); ctx.lineTo(trX,trY); ctx.stroke();
        // Glow trail
        ctx.strokeStyle=`rgba(255,180,40,${trA*0.3})`; ctx.lineWidth=6;
        ctx.beginPath(); ctx.moveTo(fromX,fromY); ctx.lineTo(trX,trY); ctx.stroke();

        // Impact sparks
        if(bElapsed > 0.15){
          const impP = (bElapsed-0.15)/1.2;
          for(let sp=0;sp<12;sp++){
            const spAng = (sp/12)*Math.PI*2 + bElapsed*3;
            const spR = impP*50;
            const spA = Math.max(0, 0.7-impP);
            const col = hit ? `rgba(200,40,40,${spA})` : `rgba(255,200,100,${spA})`;
            ctx.fillStyle=col;
            ctx.beginPath(); ctx.arc(toX+Math.cos(spAng)*spR, toY+Math.sin(spAng)*spR, 3-impP*2, 0, Math.PI*2); ctx.fill();
          }
          // Impact flash
          if(impP < 0.3){
            const ifG = ctx.createRadialGradient(toX,toY,0,toX,toY,30);
            const ifCol = hit ? '200,40,40' : '255,200,100';
            ifG.addColorStop(0,`rgba(${ifCol},${0.6-impP*2})`);
            ifG.addColorStop(1,'transparent');
            ctx.fillStyle=ifG; ctx.fillRect(toX-40,toY-40,80,80);
          }
        }
      }
    }

    // ── Flash efekty ──
    if(d.successFlash > 0){
      const sf = Math.max(0, 1 - (gs.ts - d.successFlash)*0.003);
      if(sf > 0){
        ctx.fillStyle=`rgba(255,255,255,${sf*0.4})`; ctx.fillRect(0,0,W,H);
        ctx.fillStyle=`rgba(80,255,120,${sf*0.2})`; ctx.fillRect(0,0,W,H);
      }
    }
    if(d.hitFlash > 0 && (phase === 'dead' || phase.startsWith('hit'))){
      const hf = Math.max(0, 1 - (gs.ts - d.hitFlash)*0.0015);
      if(hf > 0){
        ctx.fillStyle=`rgba(255,0,0,${hf*0.5})`; ctx.fillRect(0,0,W,H);
        // Blood drip particles
        const bpT = (gs.ts - d.hitFlash)*0.001;
        for(let bp=0;bp<6;bp++){
          const bpX = cx + (bp-3)*W*0.06 + Math.sin(bp*7)*20;
          const bpY = cy + bpT*40*bp*0.5;
          const bpA = Math.max(0, hf-bp*0.1);
          ctx.fillStyle=`rgba(160,20,20,${bpA*0.6})`;
          ctx.beginPath(); ctx.arc(bpX, bpY, 3-bp*0.3, 0, Math.PI*2); ctx.fill();
        }
      }
    }

    // ── Výsledkový text ──
    if(phase === 'result1' || phase === 'result2'){
      const resT = (gs.ts - d.successFlash)*0.002;
      const resScale = Math.min(1.1, resT*4);
      const resA = resT < 2 ? 1 : Math.max(0, 1-(resT-2));
      ctx.save(); ctx.translate(cx, H*0.34); ctx.scale(resScale,resScale);
      // Glow bg
      ctx.fillStyle=`rgba(40,180,60,${resA*0.15})`;
      ctx.beginPath(); ctx.arc(0,0,60,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=`rgba(80,255,120,${resA})`; ctx.font='bold 28px Outfit,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('✓ UHNUL JSI!', 0, 0);
      if(phase === 'result1'){
        ctx.fillStyle=`rgba(255,200,200,${resA*0.7})`; ctx.font='15px Outfit,sans-serif';
        ctx.fillText('Ještě jeden výstřel...', 0, 30);
      }
      ctx.restore();
    }

    // ── Hit text (wounded, not dead) ──
    if(phase === 'hit1' || phase === 'hit2'){
      const hitT = (gs.ts - d.hitFlash)*0.002;
      const hitA = hitT < 2 ? 1 : Math.max(0, 1-(hitT-2));
      ctx.save(); ctx.translate(cx, H*0.34);
      ctx.fillStyle=`rgba(255,60,60,${hitA})`; ctx.font='bold 26px Outfit,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🩸 ZASAŽEN!', 0, 0);
      ctx.fillStyle=`rgba(255,180,180,${hitA*0.7})`; ctx.font='14px Outfit,sans-serif';
      ctx.fillText('Kulka škrábla nohu...', 0, 28);
      ctx.restore();
    }

    // ── Flee overlay ──
    if(phase === 'flee'){
      const pulse3 = 0.7 + 0.3*Math.sin(t*0.012);
      ctx.fillStyle='rgba(0,0,0,0.45)';
      rrect(cx-W*0.22, H*0.26, W*0.44, H*0.16, 12); ctx.fill();
      ctx.fillStyle=`rgba(255,200,60,${pulse3})`; ctx.font='bold 34px Outfit,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🏃 UTÍKEJ!', cx, H*0.34);
      ctx.textBaseline='alphabetic';
    }

    // ── Death overlay ──
    if(phase === 'dead'){
      const da = Math.min(1, (gs.ts - d.hitFlash)*0.0012);
      ctx.fillStyle=`rgba(60,0,0,${da*0.7})`; ctx.fillRect(0,0,W,H);
      // Screen crack effect
      if(da > 0.1){
        ctx.save();
        ctx.strokeStyle=`rgba(255,255,255,${Math.min(0.3,da*0.4)})`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx-80,cy-120); ctx.lineTo(cx-140,cy-200); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+60,cy-90); ctx.lineTo(cx+120,cy-180); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx-30,cy-150); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+100,cy-50); ctx.lineTo(cx+180,cy-100); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx-50,cy+60); ctx.stroke();
        ctx.restore();
      }
      if(da > 0.3){
        ctx.fillStyle=`rgba(255,50,50,${Math.min(1,da)})`; ctx.font='bold 30px Outfit,sans-serif';
        ctx.textAlign='center'; ctx.fillText('💀 ZASAŽEN', cx, H*0.38);
        ctx.fillStyle=`rgba(255,150,150,${Math.min(0.7,da*0.7)})`; ctx.font='15px Outfit,sans-serif';
        ctx.fillText('Nebyls dost rychlý...', cx, H*0.44);
      }
    }

    ctx.textAlign='left';
  }

  // ══ VÝCHOD ══════════════════════════════════════════════════════
  if(!gs.story.bathroom_door_broken && !gs.door_kick_anim){
    ctx.fillStyle='rgba(255,255,255,0.10)'; ctx.font='10px monospace'; ctx.textAlign='center';
    ctx.fillText('↓ ZPĚT DO VILY', W*0.5, H*0.97);
    ctx.textAlign='left';
  }
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
    }
    // dead=true: hlava zmizela – Kubátová ji sežrala, krk zamazán krví
    if(dead){
      const neckX=-W*0.030, neckY=-H*0.005;
      const ng=ctx.createRadialGradient(neckX,neckY,0,neckX,neckY,W*0.018);
      ng.addColorStop(0,'rgba(160,0,0,0.95)'); ng.addColorStop(1,'rgba(80,0,0,0)');
      ctx.fillStyle=ng; ctx.beginPath(); ctx.arc(neckX,neckY,W*0.018,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    // popisek
    ctx.save(); ctx.font=`bold ${Math.floor(W*0.011)}px JetBrains Mono,monospace`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=dead?'rgba(140,0,0,0.45)':'rgba(71,85,105,0.50)';
    ctx.fillText('Figurová', fx, fy+H*0.082);
    ctx.restore();
  }

  // ── Kapající voda ze stropu – výraznější, víc kapek – dynamicky optimalizována ──
  const waterDropCount = getParticleCount(18, fpsMonitor);
  ctx.save();
  for(let i=0;i<waterDropCount;i++){
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
    if(!fpsMonitor || fpsMonitor.fps > 40){
      ctx.fillStyle=`rgba(255,255,255,${dropA*0.5})`;
      ctx.beginPath(); ctx.arc(dropX-0.6,dropY-2,0.6,0,Math.PI*2); ctx.fill();
    }
    // Splash na podlaze – výraznější (ale omezit na výkonnější PC)
    if(dropPhase>0.86 && (!fpsMonitor || fpsMonitor.fps > 45)){
      const splA=(dropPhase-0.86)/0.14;
      ctx.strokeStyle=`rgba(130,150,180,${(1-splA)*0.65})`;
      ctx.lineWidth=1.3;
      ctx.beginPath(); ctx.ellipse(dropX,H*0.56,4+splA*14,1.5+splA*4,0,0,Math.PI*2); ctx.stroke();
      // krůpěje splash – jen někde
      if(i % 2 === 0){
        for(let sp=0;sp<4;sp++){
          const spAng=sp*Math.PI/2+i;
          ctx.fillStyle=`rgba(130,160,190,${(1-splA)*0.55})`;
          ctx.beginPath(); ctx.arc(dropX+Math.cos(spAng)*(4+splA*6),H*0.56-splA*3+Math.sin(spAng)*1.5,0.8,0,Math.PI*2); ctx.fill();
        }
      }
    }
  }
  ctx.restore();

  // ── Stoupající popel/prach z pentagramu – dynamicky optimalizován ──
  const ashCount = getParticleCount(38, fpsMonitor);
  ctx.save();
  for(let i=0;i<ashCount;i++){
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
    // glow kolem žhavých částic – renderuj jen všechny N-té částice na slabých PC
    if(ashLife<0.4 && (!fpsMonitor || fpsMonitor.fps > 40 || i % 2 === 0)){
      const gG=ctx.createRadialGradient(ax,ay,0,ax,ay,ashSz*4);
      gG.addColorStop(0,`rgba(255,120,30,${ashA*0.35})`); gG.addColorStop(1,'transparent');
      ctx.fillStyle=gG;
      ctx.beginPath(); ctx.arc(ax,ay,ashSz*4,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();

  // ── Další jiskry a plamenové částice nad pentagramem – dynamicky optimalizován ──
  const sparkCount = getParticleCount(22, fpsMonitor);
  ctx.save();
  for(let i=0;i<sparkCount;i++){
    const skLife=((t*0.00065+i*0.11)%1);
    const skAng=i*0.68+t*0.0003;
    const skR=pr*(0.2+skLife*0.8);
    const sx=pcx+Math.cos(skAng)*skR;
    const sy=pcy+Math.sin(skAng)*skR*0.5-skLife*H*0.30;
    const skA=(1-skLife)*0.90;
    ctx.fillStyle=`rgba(255,${180-Math.floor(skLife*120)},30,${skA})`;
    ctx.beginPath(); ctx.arc(sx,sy,1.4+Math.sin(i*2.3)*0.6,0,Math.PI*2); ctx.fill();
    // světelná stopa – pouze na výkonnějších PC
    if(!fpsMonitor || fpsMonitor.fps > 45){
      ctx.strokeStyle=`rgba(255,120,20,${skA*0.5})`;
      ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx,sy+4); ctx.stroke();
    }
  }
  ctx.restore();

  // ── Hustá atmosférická mlha pod stropem ──
  ctx.save();
  const topFog=ctx.createLinearGradient(0,0,0,H*0.25);
  topFog.addColorStop(0,'rgba(20,10,5,0.45)'); topFog.addColorStop(1,'transparent');
  ctx.fillStyle=topFog; ctx.fillRect(0,0,W,H*0.25);
  // valící se mlha z rohů – dynamicky optimalizována
  const fogCount = getParticleCount(8, fpsMonitor);
  for(let mi=0;mi<fogCount;mi++){
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
    // Pořadí MUSÍ odpovídat ART_KEYS_DISPLAY v game.js (kvůli pickup logice)
    const ART_DEFS = [
      { key:'c2_cert',         emoji:'📜', name:'C2 Cert.' },
      { key:'milan_phone',     emoji:'📲', name:'Tel. Milan' },
      { key:'podprsenka',      emoji:'👙', name:'Janina podprsenka' },
      { key:'klice_vila',      emoji:'🔑', name:'Klíče od vily' },
      { key:'klice_fabie',     emoji:'🔑', name:'Fábie' },
      { key:'saman_hlava',     emoji:'🩸', name:'Šam. hlava' },
      { key:'maturita',        emoji:'🏆', name:'Maturita' },
      { key:'foto_figurova',   emoji:'📸', name:'Fotka Fig.' },
      { key:'membership_vaza', emoji:'💳', name:'Vaza Systems' },
      { key:'webovky',         emoji:'🌐', name:'Webovky' },
      { key:'kgb_detector',    emoji:'🔍', name:'KGB Detektor' },
      { key:'klic_supliku',    emoji:'🗝️', name:'Klíček' },
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
        // Vzatelné = zlatá, Nevzatelné = stříbrná (jen trofej)
        const pickable = typeof PICKABLE_ART_KEYS !== 'undefined' && PICKABLE_ART_KEYS.has(art.key);
        const glow = 0.3 + 0.2 * Math.sin(t * 0.003 + i * 0.8);
        const glowCol = pickable ? `rgba(240,192,64,${glow})` : `rgba(180,200,220,${glow*0.7})`;
        const ag = ctx.createRadialGradient(ax, ay - bustH / 2 - 10, 0, ax, ay - bustH / 2 - 10, 22);
        ag.addColorStop(0, glowCol); ag.addColorStop(1, 'transparent');
        ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(ax, ay - bustH / 2 - 10, 22, 0, Math.PI * 2); ctx.fill();
        // Emoji artefaktu – vznáší se nad bustou
        const hover = Math.sin(t * 0.003 + i * 1.2) * 3;
        ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(art.emoji, ax, ay - bustH / 2 - 12 + hover);
        // Zámeček nad nevzatelnými artefakty
        if(!pickable){
          ctx.font = '8px serif';
          ctx.fillText('🔒', ax + 8, ay - bustH / 2 - 18 + hover);
        }
        // Jméno
        ctx.fillStyle = pickable ? 'rgba(240,192,64,0.7)' : 'rgba(180,200,220,0.55)';
        ctx.font = '7px JetBrains Mono,monospace';
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
  ctx.setTransform(1,0,0,1,0,0); // reset accumulated transforms between frames
  const rm=ROOMS[gs.room];
  const W=canvas.width, H=canvas.height;
  const t=gs.ts, p=gs.player;

  // Monitor FPS pro dynamickou optimalizaci
  if(fpsMonitor) fpsMonitor.update();

  drawRoom(rm,W,H,t);

  // Voodoo animace (overlay přes Křemži)
  if(gs.voodoo_anim) drawVoodooAnim(W,H);

  // Scanlines – dynamicky snížit na slabších PC
  if(!fpsMonitor || !fpsMonitor.shouldReduceEffects()){
    ctx.fillStyle='rgba(0,0,0,0.04)';
    for(let y=0;y<H;y+=3) ctx.fillRect(0,y,W,1);
  }

  // Vigneta (všechny místnosti)
  const vigAll=ctx.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,Math.max(W,H)*0.78);
  vigAll.addColorStop(0,'transparent'); vigAll.addColorStop(1,'rgba(0,0,0,0.38)');
  ctx.fillStyle=vigAll; ctx.fillRect(0,0,W,H);

  // Ambient occlusion v rozích pro lepší vzhled
  if(!fpsMonitor || fpsMonitor.fps > 45){
    drawAmbientOcclusion(ctx, W, H, 0.08);
  }

  // Šíša efekty – vizuální distortion + budík timer
  if(gs.shisha_effects && !gs.shisha_cured && gs.shisha_deadline > 0){
    const sRem = Math.max(0, gs.shisha_deadline - gs.ts);
    const sProg = 1 - sRem / 300000;
    // Zelenkavý nádech
    ctx.fillStyle=`rgba(60,120,40,${0.06 + sProg*0.08})`;
    ctx.fillRect(0,0,W,H);
    // Vlnění
    const wAmp = 2 + sProg*4;
    ctx.save();
    ctx.translate(Math.sin(t*0.002)*wAmp, Math.cos(t*0.003)*wAmp);
    ctx.restore();
    // Dvojité vidění (ghost overlay)
    if(sProg > 0.3){
      ctx.globalAlpha = 0.08 + (sProg-0.3)*0.12;
      ctx.drawImage(canvas, 4+Math.sin(t*0.004)*3, 2+Math.cos(t*0.005)*2);
      ctx.globalAlpha = 1;
    }
    // Digitální rýžový budík – malý widget v rohu
    const secs = Math.ceil(sRem / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    const timeStr = mins + ':' + (s<10?'0':'') + s;
    const bW = 96, bH = 44;
    const bX = W/2 - bW/2, bY = 6;
    // Budík pozadí – béžový plast
    ctx.fillStyle='#d4c8a0'; rrect(bX,bY,bW,bH,5); ctx.fill();
    ctx.strokeStyle='#8a7e5a'; ctx.lineWidth=1.5; rrect(bX,bY,bW,bH,5); ctx.stroke();
    // LCD pozadí
    ctx.fillStyle='#a8bf8a'; rrect(bX+6,bY+6,bW-12,bH-20,3); ctx.fill();
    // Čas
    const timeFlash = secs <= 30 ? (Math.sin(t*0.01)>0 ? 1 : 0.3) : 1;
    ctx.fillStyle=`rgba(30,50,20,${timeFlash})`; ctx.font='bold 18px "Courier New",monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(timeStr, bX+bW/2, bY+16);
    // Nápis pod LCD
    ctx.fillStyle='rgba(80,60,30,0.7)'; ctx.font='7px sans-serif';
    ctx.fillText('⚠ JOHNNYHO ŠÍŠA', bX+bW/2, bY+36);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    // Červený rámeček při málo času
    if(secs <= 60){
      const rPulse = 0.3+0.3*Math.sin(t*0.008);
      ctx.strokeStyle=`rgba(255,0,0,${rPulse})`; ctx.lineWidth=2;
      ctx.strokeRect(0,0,W,H);
    }
  }

  // Maze – skip normal game rendering
  if(gs.room === 'maze_escape' || gs.room === 'bandage_cutscene'){ ctx.restore && 0; return; }

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

      // záře – demonická aura (větší, vícevrstvá)
      const kag=ctx.createRadialGradient(kx,ky-8*ksz,0,kx,ky,90*ksz);
      kag.addColorStop(0,'rgba(180,0,30,0.55)'); kag.addColorStop(0.4,'rgba(90,0,20,0.25)'); kag.addColorStop(1,'transparent');
      ctx.fillStyle=kag; ctx.beginPath(); ctx.arc(kx,ky,90*ksz,0,Math.PI*2); ctx.fill();
      // pulsující vnější záblesk
      const auraP=0.12+0.08*Math.sin(t*0.0028);
      const kag2=ctx.createRadialGradient(kx,ky,60*ksz,kx,ky,110*ksz);
      kag2.addColorStop(0,`rgba(140,0,40,${auraP})`); kag2.addColorStop(1,'transparent');
      ctx.fillStyle=kag2; ctx.beginPath(); ctx.arc(kx,ky,110*ksz,0,Math.PI*2); ctx.fill();

      // Helper: demonická hlava
      function _kubHead(cx,cy,hr,tilt){
        ctx.save(); ctx.translate(cx,cy); if(tilt) ctx.rotate(tilt);
        // hlava – tmavá protáhlá
        const hg=ctx.createRadialGradient(0,-hr*0.1,0,0,0,hr);
        hg.addColorStop(0,'#2e0d1c'); hg.addColorStop(1,'#0c0008');
        ctx.fillStyle=hg; ctx.beginPath(); ctx.ellipse(0,0,hr*0.82,hr,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#5a001a'; ctx.lineWidth=1.2; ctx.stroke();
        // rohy
        ctx.fillStyle='#180008';
        [-1,1].forEach(s=>{
          ctx.beginPath();
          ctx.moveTo(s*hr*0.32,-hr*0.72); ctx.lineTo(s*hr*0.72,-hr*1.75); ctx.lineTo(s*hr*0.52,-hr*0.88);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle='#6b001e'; ctx.lineWidth=1.2; ctx.stroke();
        });
        // oči – pulsující červená záře
        const ep=0.7+0.3*Math.sin(t*0.0042);
        [-1,1].forEach(s=>{
          const ex=s*hr*0.37, ey=-hr*0.1;
          const eg=ctx.createRadialGradient(ex,ey,0,ex,ey,hr*0.32);
          eg.addColorStop(0,`rgba(255,60,0,${ep})`);
          eg.addColorStop(0.55,`rgba(180,0,0,${ep*0.5})`);
          eg.addColorStop(1,'rgba(100,0,0,0)');
          ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(ex,ey,hr*0.32,0,Math.PI*2); ctx.fill();
          // svislá štěrbina – zornice
          ctx.fillStyle=`rgba(255,160,0,${ep*0.75})`;
          ctx.beginPath(); ctx.ellipse(ex,ey,hr*0.055,hr*0.15,0,0,Math.PI*2); ctx.fill();
        });
        // ústa – zuby
        const mY=hr*0.45;
        ctx.beginPath(); ctx.moveTo(-hr*0.52,mY);
        for(let i=0;i<=6;i++){ ctx.lineTo(-hr*0.52+(i/6)*hr*1.04, mY+(i%2===0?hr*0.14:-hr*0.03)); }
        ctx.lineTo(hr*0.52,mY);
        ctx.strokeStyle='rgba(220,20,20,0.9)'; ctx.lineWidth=1.6; ctx.stroke();
        for(let i=0;i<5;i++){
          ctx.fillStyle='rgba(235,215,215,0.88)';
          ctx.beginPath(); ctx.rect(-hr*0.44+(i/4.2)*hr*0.86, mY, hr*0.1, hr*0.12); ctx.fill();
        }
        ctx.restore();
      }

      if(kneeling){
        // Kleká nad tělem – demonická přikrčená poloha
        ctx.save(); ctx.translate(kx,ky+10*ksz); ctx.rotate(0.22);
        // Tělo – zmačknutá rouška
        const rbg=ctx.createLinearGradient(-20*ksz,-10*ksz,20*ksz,16*ksz);
        rbg.addColorStop(0,'#200012'); rbg.addColorStop(1,'#0c0008');
        ctx.fillStyle=rbg; ctx.beginPath(); ctx.ellipse(0,5*ksz,26*ksz,13*ksz,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#5a001a'; ctx.lineWidth=1.5; ctx.stroke();
        // Ruce dolů – tenké, spárovité
        ctx.strokeStyle='#1c0010'; ctx.lineWidth=5*ksz; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-15*ksz,0); ctx.bezierCurveTo(-30*ksz,10*ksz,-36*ksz,18*ksz,-28*ksz,24*ksz); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(15*ksz,0); ctx.bezierCurveTo(30*ksz,8*ksz,38*ksz,18*ksz,28*ksz,24*ksz); ctx.stroke();
        // Drápy
        ctx.strokeStyle='rgba(200,0,40,0.75)'; ctx.lineWidth=1.8*ksz;
        [[-28*ksz,24*ksz],[28*ksz,24*ksz]].forEach(([bx,by])=>{
          for(let c=-1;c<=1;c++){ ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+c*4*ksz,by+8*ksz); ctx.stroke(); }
        });
        // Hlava – nakloněná dopředu při kousání
        _kubHead(2*ksz,-22*ksz,17*ksz,0.38);
        ctx.restore();
      } else {
        // Normální stoj – demonická Kubátová
        ctx.save(); ctx.translate(kx,ky);
        const rH=48*ksz, rW=22*ksz;
        const hem=2.5*ksz*Math.sin(t*0.0019);
        // Roucho – tmavý plášť
        const rbg2=ctx.createLinearGradient(0,-rH*0.7,0,rH*0.5);
        rbg2.addColorStop(0,'#230014'); rbg2.addColorStop(1,'#0c0008');
        ctx.fillStyle=rbg2;
        ctx.beginPath();
        ctx.moveTo(-rW*0.48,-rH*0.62);
        ctx.lineTo(-rW*0.68,rH*0.42+hem);
        ctx.quadraticCurveTo(0,rH*0.62,rW*0.68,rH*0.42-hem);
        ctx.lineTo(rW*0.48,-rH*0.62);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle='#5a001a'; ctx.lineWidth=1.5; ctx.stroke();
        // Bocní křídla pláště
        ctx.fillStyle='rgba(28,0,18,0.72)';
        [-1,1].forEach(s=>{
          ctx.beginPath();
          ctx.moveTo(s*rW*0.45,-rH*0.35);
          ctx.bezierCurveTo(s*rW*1.7,-rH*0.05,s*rW*1.8,rH*0.3,s*rW*0.65,rH*0.42);
          ctx.lineTo(s*rW*0.45,rH*0.05);
          ctx.closePath(); ctx.fill();
        });
        // Dlouhé ruce – visí dolů s drápy
        const aS=Math.sin(t*0.0017)*5*ksz;
        ctx.strokeStyle='#1c0010'; ctx.lineWidth=5*ksz; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(-rW*0.45,-rH*0.22); ctx.bezierCurveTo(-rW*1.4,rH*0.08+aS,-rW*1.6,rH*0.42,-rW*1.25,rH*0.68); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rW*0.45,-rH*0.22); ctx.bezierCurveTo(rW*1.4,rH*0.08-aS,rW*1.6,rH*0.42,rW*1.25,rH*0.68); ctx.stroke();
        // Drápy na konci rukou
        ctx.strokeStyle='rgba(200,0,40,0.75)'; ctx.lineWidth=1.8*ksz;
        [[-rW*1.25,rH*0.68],[rW*1.25,rH*0.68]].forEach(([bx,by])=>{
          for(let c=-1;c<=1;c++){ ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+c*5*ksz,by+9*ksz); ctx.stroke(); }
        });
        // Hlava
        _kubHead(0,-rH*0.72-16*ksz,19*ksz,0);
        // Třesoucí se obrys (jen v pentagramu)
        if(inPentagram){
          const shk=Math.sin(t*0.019)*2.2;
          ctx.strokeStyle=`rgba(160,0,40,${0.18+0.1*Math.sin(t*0.006)})`;
          ctx.lineWidth=2*ksz;
          ctx.beginPath(); ctx.arc(shk,0,46*ksz,0,Math.PI*2); ctx.stroke();
        }
        ctx.restore();
      }

      // jmenovka – nad rohy (hlava je ~60px nad středem, rohy přidají ~40px)
      ctx.textBaseline='alphabetic';
      ctx.fillStyle='#dc2626'; ctx.font=`bold ${13*Math.min(ksz,1.3)}px Outfit,sans-serif`;
      ctx.textAlign='center'; ctx.fillText(n.name,kx,ky-(112+10*(ksz-1)));
      ctx.fillStyle='rgba(255,80,80,0.55)'; ctx.font=`${9*Math.min(ksz,1.3)}px JetBrains Mono,monospace`;
      ctx.fillText(n.role.toUpperCase(),kx,ky-(98+10*(ksz-1)));
      if(dist2(p,{x:pcx2,y:pcy2})<PROX_R){
        ctx.fillStyle='rgba(240,192,64,.78)'; ctx.font='bold 10px JetBrains Mono,monospace';
        ctx.fillText('[E] MLUVIT',pcx2,pcy2+(68*ksz));
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

  // KGB detektor – scan overlay (5s barevné aury nad NPC)
  if(gs.detector_scanning && gs.ts < gs.detector_scan_t){
    currentNPCs.forEach(n => {
      if(n.id === 'kubatova') return;
      const bY2 = n.y + Math.sin(t * 0.003 + n.x * 0.01) * 3.5;
      const sz2 = n.size || 1;
      const isAgent = (n.id === 'krejci');
      const pulse = 0.35 + 0.25 * Math.sin(gs.ts * 0.015);
      ctx.fillStyle = isAgent ? `rgba(220,40,40,${pulse})` : `rgba(40,220,80,${pulse})`;
      ctx.beginPath(); ctx.arc(n.x, bY2, 28 * sz2, 0, Math.PI * 2); ctx.fill();
      if(isAgent){
        ctx.strokeStyle = `rgba(255,60,60,${0.7 + 0.3 * Math.sin(gs.ts * 0.025)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(n.x, bY2, 36 * sz2, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,60,60,0.95)';
        ctx.font = 'bold 11px JetBrains Mono,monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('▲ AGENT', n.x, bY2 - 55 * sz2);
      }
    });
  }

  // Kaluž spermatu
  if(gs.semen_puddle && gs.semen_puddle.room === gs.room){
    const sp = gs.semen_puddle;
    const sg = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 26);
    sg.addColorStop(0, 'rgba(255,255,230,0.95)');
    sg.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(245,245,210,0.75)';
    ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Hráč
  const px=p.x??W/2;
  // Jemný walk-bob (konzistentní s drawNakedSaman / NPC gait)
  const walkBob = p.mv ? Math.abs(Math.sin(t * 0.018)) * 3.2 : 0;
  let py=p.y - walkBob;
  let pc = '#7c6ff7';
  let pcAura = '#7c6ff74a';
  let playerScale = 1;

  if(gs.kratom_on){
    if(gs.kratom_blend_on){
      const hue = Math.floor((t*0.2)%360);
      pc = `hsl(${hue},90%,58%)`;
      pcAura = `hsla(${hue},90%,58%,0.29)`;
      // Blend mechaniky – bláznivé efekty
      const blendProgress = Math.max(0, 1 - gs.kratom_t / gs.blend_max);
      // Pulzování velikosti hráče
      playerScale = 1 + Math.sin(t * 0.006) * 0.15;
      // Gravitační oscilace – hráč se vznáší nahoru a dolů
      py += Math.sin(t * 0.004) * 12;
      // Laterální vibrace (šílenství se zesiluje ke konci)
      py += Math.sin(t * 0.011 + blendProgress * 10) * (3 + blendProgress * 8);
    } else {
      pc = '#10b981'; pcAura = '#10b9814a';
    }
  }
  if(playerScale !== 1){
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(playerScale, playerScale);
    ctx.translate(-px, -py);
  }
  ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(px,py+29,17,7,0,0,Math.PI*2); ctx.fill();
  if(!gs.kratom_on){
    const pg=ctx.createRadialGradient(px,py,0,px,py,42);
    pg.addColorStop(0,pcAura); pg.addColorStop(1,'transparent');
    ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(px,py,42,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle=pc; ctx.beginPath(); ctx.arc(px,py,23,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fde8c8'; ctx.beginPath(); ctx.arc(px,py-17,18,0,Math.PI*2); ctx.fill();
  const ef=p.face==='l'?-1:1;
  ctx.fillStyle='#1e293b';
  ctx.beginPath(); ctx.arc(px+ef*5,    py-19,4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(px+ef*5+11, py-19,4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(px+ef*5.5,    py-20,1.8,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(px+ef*5.5+11, py-20,1.8,0,Math.PI*2); ctx.fill();
  if(playerScale !== 1) ctx.restore();

  // Monokl – hráč dostal po hubě od Johnnyho
  if(gs.story.player_monokl){
    ctx.fillStyle = 'rgba(60,10,120,0.70)';
    ctx.beginPath(); ctx.ellipse(px + ef*12, py - 15, 7, 4, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(90,30,160,0.40)';
    ctx.beginPath(); ctx.ellipse(px + ef*11, py - 16, 5, 3, 0.2, 0, Math.PI * 2); ctx.fill();
  }

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

  // Hráč OBÍDEK (po použití masturbátoru)
  if(gs.obidek_t > 0 && gs.ts - gs.obidek_t < 3500){
    const txts = ['OBÍDEK!', 'OBÍÍÍDEK!!', 'OBÍDEK!!!'];
    const oTxt = txts[Math.floor(t / 350) % 3];
    ctx.font = 'bold 20px Outfit,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const otw = ctx.measureText(oTxt).width + 18;
    const obx = px - otw / 2, oby = py - 62;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    rrect(obx, oby, otw, 28, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(220,30,30,0.95)'; ctx.lineWidth = 2.2;
    rrect(obx, oby, otw, 28, 7); ctx.stroke();
    ctx.fillStyle = '#ff4040';
    ctx.fillText(oTxt, px, oby + 21);
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.beginPath(); ctx.moveTo(px - 7, oby + 28); ctx.lineTo(px + 7, oby + 28); ctx.lineTo(px, oby + 42); ctx.closePath(); ctx.fill();
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

  // Johnny kill animace – útok na hráče při vypršení escape timeru
  if(gs.johnny_kill_anim){
    const jka = gs.johnny_kill_anim;
    const el = (gs.ts - jka.t0) * 0.001;
    const phase = jka.phase;

    // Červenající se vignette – narůstá s fázemi
    const vigA = phase === 1 ? 0.15 : (phase === 2 ? 0.35 : 0.5);
    const vigG = ctx.createRadialGradient(W*0.5, H*0.5, W*0.15, W*0.5, H*0.5, W*0.65);
    vigG.addColorStop(0, 'transparent');
    vigG.addColorStop(1, `rgba(120,0,0,${vigA})`);
    ctx.fillStyle = vigG; ctx.fillRect(0, 0, W, H);

    // Johnny přibíhá zprava
    const rushT = Math.min(el / 0.7, 1);
    const rushEase = 1 - (1 - rushT) * (1 - rushT);
    const jx = W + 60 - rushEase * (W * 0.42 + 60);
    const jy = p.y;

    // Pohybová stopa (motion blur) při běhu
    if(phase === 1 && rushT < 1){
      for(let gi=1; gi<=4; gi++){
        const gx = jx + gi * 28;
        const ga = (1 - rushT) * 0.08 * (5-gi);
        ctx.fillStyle = `rgba(192,160,48,${ga})`;
        ctx.beginPath(); ctx.arc(gx, jy, 27-gi*2, 0, Math.PI*2); ctx.fill();
      }
    }

    // Stín
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(jx+3, jy+30, 26, 10, 0, 0, Math.PI*2); ctx.fill();

    const bodyTilt = phase === 1 ? 0.18 + Math.sin(el * 12) * 0.06 : (phase === 2 ? -0.35 : 0);
    ctx.save();
    ctx.translate(jx, jy);
    ctx.rotate(bodyTilt);

    // Pulzující aura hněvu
    const auraPulse = 0.35 + 0.15 * Math.sin(el * 8);
    const auraR = 55 + (phase >= 2 ? 15 : 0);
    const auraG2 = ctx.createRadialGradient(0, 0, 0, 0, 0, auraR);
    auraG2.addColorStop(0, `rgba(220,60,0,${auraPulse})`);
    auraG2.addColorStop(0.5, `rgba(180,30,0,${auraPulse*0.4})`);
    auraG2.addColorStop(1, 'transparent');
    ctx.fillStyle = auraG2; ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI*2); ctx.fill();

    // Tělo
    ctx.fillStyle = '#c0a030';
    ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI*2); ctx.fill();
    // Hlava
    ctx.fillStyle = '#fde8c8';
    ctx.beginPath(); ctx.arc(0, -22, 20, 0, Math.PI*2); ctx.fill();
    drawAngryFace(0, -22, 1);

    // Pistole
    if(phase >= 1){
      ctx.save();
      ctx.translate(-28, -4);
      const gunRot = phase === 2 ? -0.4 + Math.sin(el*15)*0.05 : -0.1;
      ctx.rotate(gunRot);
      // Tělo pistole
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-18, -4, 32, 8);
      ctx.fillStyle = '#2a2a2a'; ctx.fillRect(10, -7, 6, 14);
      // Hlaveň – světlejší
      ctx.fillStyle = '#4a4a4a'; ctx.fillRect(-20, -2.5, 5, 5);
      if(phase === 2){
        const muzzleA2 = Math.max(0, 1 - (el - 0.9) * 2.5);
        if(muzzleA2 > 0){
          // Vnější záblesk
          ctx.fillStyle = `rgba(255,200,40,${muzzleA2 * 0.7})`;
          ctx.beginPath(); ctx.arc(-20, 0, 14 + muzzleA2 * 10, 0, Math.PI*2); ctx.fill();
          // Jádro
          ctx.fillStyle = `rgba(255,255,220,${muzzleA2})`;
          ctx.beginPath(); ctx.arc(-20, 0, 5, 0, Math.PI*2); ctx.fill();
          // Paprsek
          ctx.strokeStyle = `rgba(255,240,150,${muzzleA2*0.5})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-22-40, 2); ctx.stroke();
        }
        // Dým z hlavně
        const smokeT = Math.max(0, el - 0.9);
        if(smokeT > 0 && smokeT < 1.5){
          for(let si=0; si<5; si++){
            const sx3 = -22 - smokeT*25 - si*8 + Math.sin(el*4+si)*3;
            const sy3 = -smokeT*10 - si*5 + Math.sin(el*3+si*2)*2;
            const sr = 3 + smokeT*6 + si*2;
            const sa = Math.max(0, 0.25 - smokeT*0.15 - si*0.04);
            ctx.fillStyle = `rgba(180,180,180,${sa})`;
            ctx.beginPath(); ctx.arc(sx3, sy3, sr, 0, Math.PI*2); ctx.fill();
          }
        }
      }
      ctx.restore();
    }
    ctx.restore();

    // Jméno
    ctx.fillStyle = 'rgba(220,140,0,0.92)';
    ctx.font = 'bold 11px Outfit,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('JOHNNY', jx, jy - 55);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '8px JetBrains Mono,monospace';
    ctx.fillText('MAJITEL VILY', jx, jy - 44);

    // Phase 2: výstřel – dramatické efekty
    if(phase === 2){
      const hitT = Math.min((el - 0.9) / 0.4, 1);
      if(hitT > 0){
        // Celoplošný červený flash
        ctx.fillStyle = `rgba(220,20,20,${hitT * 0.45})`;
        ctx.fillRect(0, 0, W, H);
        // Krev – stříkance kolem hráče
        ctx.fillStyle = `rgba(160,0,0,${hitT * 0.65})`;
        ctx.beginPath(); ctx.arc(px, py - 15, 18 + hitT * 12, 0, Math.PI*2); ctx.fill();
        // Krevní stříkance – rozptylovací
        for(let bi2=0; bi2<8; bi2++){
          const bAng = bi2 * Math.PI * 0.25 + 0.3;
          const bDist = hitT * (20 + bi2 * 8);
          const bx3 = px + Math.cos(bAng) * bDist;
          const by3 = py - 15 + Math.sin(bAng) * bDist * 0.6;
          const br = 3 + hitT * 5 * (1 - bi2*0.08);
          ctx.fillStyle = `rgba(140,0,0,${hitT * 0.5 * (1-bi2*0.1)})`;
          ctx.beginPath(); ctx.arc(bx3, by3, br, 0, Math.PI*2); ctx.fill();
        }
      }
    }

    // Phase 3: tmavnutí + červená filmová zrnka
    if(phase === 3){
      const fadeT2 = Math.min((el - 1.4) / 0.8, 1);
      ctx.fillStyle = `rgba(0,0,0,${fadeT2 * 0.92})`;
      ctx.fillRect(0, 0, W, H);
      // Filmový grain effect
      if(fadeT2 < 0.8){
        for(let gi2=0; gi2<30; gi2++){
          const gx2 = Math.random() * W, gy2 = Math.random() * H;
          ctx.fillStyle = `rgba(${100+Math.random()*60},0,0,${(1-fadeT2)*0.08})`;
          ctx.fillRect(gx2, gy2, 2, 2);
        }
      }
    }

    // Řečová bublina s animací
    if(phase === 1 && el < 1.1){
      const bubbleT = Math.min(el * 3, 1);
      const speech2 = '"TAK TY SI MYSLÍŠ, ŽE UTEČEŠ?!"';
      ctx.font = 'bold 10px Outfit,sans-serif';
      const sw2 = ctx.measureText(speech2).width + 24;
      const sx4 = jx - sw2 - 10, sy4 = jy - 82;
      ctx.save();
      ctx.globalAlpha = bubbleT;
      ctx.fillStyle = 'rgba(255,240,200,0.96)'; rrect(sx4, sy4, sw2, 32, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(200,80,0,0.8)'; ctx.lineWidth = 1.5; rrect(sx4, sy4, sw2, 32, 8); ctx.stroke();
      // Šipka k Johnnymu
      ctx.fillStyle = 'rgba(255,240,200,0.96)';
      ctx.beginPath(); ctx.moveTo(sx4+sw2-10, sy4+32); ctx.lineTo(sx4+sw2+5, sy4+38); ctx.lineTo(sx4+sw2-20, sy4+32); ctx.fill();
      ctx.fillStyle = '#1a0800';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(speech2, sx4 + sw2/2, sy4 + 16);
      ctx.restore();
    }
  }

  // Escape timer HUD – blikající odpočet na obrazovce
  if(gs.jana_escape_deadline && !gs.story.jana_escaped_success && !gs.johnny_kill_anim){
    const remaining = Math.max(0, gs.jana_escape_deadline - gs.ts);
    const secs = Math.ceil(remaining / 1000);
    const urgency = 1 - remaining / 10000;
    const pulse = 0.7 + 0.3 * Math.sin(gs.ts * (0.006 + urgency * 0.02));
    // Narůstající červená vignette
    const escVigG = ctx.createRadialGradient(W*0.5, H*0.5, W*0.2, W*0.5, H*0.5, W*0.6);
    escVigG.addColorStop(0, 'transparent');
    escVigG.addColorStop(1, `rgba(160,0,0,${urgency * 0.30 * pulse})`);
    ctx.fillStyle = escVigG; ctx.fillRect(0, 0, W, H);
    // HUD panel
    const hudW3 = 180, hudH3 = 52;
    ctx.fillStyle = `rgba(60,0,0,${0.6 + urgency * 0.3})`;
    rrect(W*0.5 - hudW3/2, 8, hudW3, hudH3, 10); ctx.fill();
    ctx.strokeStyle = `rgba(220,40,40,${0.5 + urgency * 0.4 + pulse*0.1})`;
    ctx.lineWidth = 2; rrect(W*0.5 - hudW3/2, 8, hudW3, hudH3, 10); ctx.stroke();
    // Odpočítávací bar
    const barW2 = hudW3 - 16, barFill2 = barW2 * (1 - urgency);
    ctx.fillStyle = 'rgba(40,0,0,0.5)'; rrect(W*0.5 - barW2/2, 46, barW2, 7, 3); ctx.fill();
    const barCol = urgency > 0.7 ? `rgba(220,40,40,0.9)` : `rgba(220,${Math.floor(180-urgency*200)},40,0.8)`;
    ctx.fillStyle = barCol; rrect(W*0.5 - barW2/2, 46, barFill2, 7, 3); ctx.fill();
    // Čas
    ctx.fillStyle = `rgba(255,${Math.floor(220 - urgency*200)},0,${pulse})`;
    ctx.font = `bold ${Math.floor(26 + urgency * 10)}px Outfit,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`⏱ ${secs}s`, W*0.5, 32);
    // Label
    ctx.fillStyle = `rgba(255,200,200,${0.5+urgency*0.4})`; ctx.font = '8px JetBrains Mono,monospace';
    ctx.fillText('UTÍKEJ Z VILY!', W*0.5, 58);
    // Červený border flash + screen shake vibes při posledních 3s
    if(secs <= 3){
      const borderA2 = pulse * (0.3 + urgency * 0.3);
      ctx.strokeStyle = `rgba(255,0,0,${borderA2})`;
      ctx.lineWidth = 4 + urgency * 4;
      ctx.strokeRect(2, 2, W-4, H-4);
      // Scanlines effect
      ctx.fillStyle = `rgba(255,0,0,${0.03 + urgency * 0.04})`;
      for(let sl=0; sl<H; sl+=3) ctx.fillRect(0, sl, W, 1);
    }
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
  //  BLEND × KRATOM – CSS animace je postačující
  // ══════════════════════════════════════════════════════════════════════════
  // Blend – CSS tripCanvasBlend animace zajišťuje efekt bez lag

  // ══════════════════════════════════════════════════════════════════════════
  //  NOVÉ EFEKTY – BLOOM A AMBIENT EFFECTS
  // ══════════════════════════════════════════════════════════════════════════

  // Bloom efekt na světlech – pouze na výkonnějších zařízeních
  if(!fpsMonitor || fpsMonitor.fps > 50){
    if(gs.room === 'johnny_vila'){
      // Bloom na lampě
      drawBloom(ctx, W*0.05, H*0.54, 'rgba(255,200,120,0.2)', 40, t);
      // Bloom na TV
      drawBloom(ctx, W*0.74, H*0.14, 'rgba(80,140,220,0.15)', 35, t);
    }
    if(gs.room === 'hospoda'){
      // Bloom na svíčce (ze sklepa jsem si zkopíroval coordinates)
      drawBloom(ctx, W*0.36, H*0.69, 'rgba(255,180,80,0.18)', 50, t);
    }
  }

  // Nové vizuální efekty na speciální prvky
  if(gs.story.figurova_following && !gs.story.figurova_at_door){
    // Electric aura kolem Figurové (subtilní)
    const fig = currentNPCs.find(n => n.id === 'figurova');
    if(fig && (!fpsMonitor || fpsMonitor.fps > 45)){
      drawPulsingAura(ctx, fig.x, fig.y, 35, 'rgba(100,200,255,0.3)', t, 0.004);
    }
  }

  // Katana death animace + hráčovy řezy/rozpad těla (přes celou scénu)
  if(gs.jana_katana_anim){
    drawJanaKatana(gs.jana_katana_anim, t);
  }
  if(gs.player_cuts_anim){
    drawPlayerCuts(t);
  }

  // Pulsující aura vypnuta během blend – CSS animace je postačující

}

// ─── Cibulkova tajná laboratoř (za krbem) ────────────────────────────────────
function drawCibulkaLab(W,H,t){
  const ft = t * 0.001;
  const hor = H * 0.52;

  // PODLAHA
  const flG = ctx.createLinearGradient(0,hor,0,H);
  flG.addColorStop(0,'#0c0f18'); flG.addColorStop(1,'#080a12');
  ctx.fillStyle = flG; ctx.fillRect(0,hor,W,H-hor);
  ctx.strokeStyle='rgba(30,40,60,0.55)'; ctx.lineWidth=0.8;
  for(let x=0;x<W;x+=W*0.14){ ctx.beginPath(); ctx.moveTo(x,hor); ctx.lineTo(x,H); ctx.stroke(); }
  [hor+(H-hor)*0.5,H-8].forEach(y=>{ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); });
  [[W*0.15,H-50],[W*0.60,H-35],[W*0.85,H-70]].forEach(([sx,sy])=>{
    const sG=ctx.createRadialGradient(sx,sy,0,sx,sy,38);
    sG.addColorStop(0,'rgba(20,40,80,0.55)'); sG.addColorStop(1,'transparent');
    ctx.fillStyle=sG; ctx.beginPath(); ctx.arc(sx,sy,38,0,Math.PI*2); ctx.fill();
  });

  // STROP
  const cg=ctx.createLinearGradient(0,0,0,hor);
  cg.addColorStop(0,'#060810'); cg.addColorStop(1,'#0e1220');
  ctx.fillStyle=cg; ctx.fillRect(0,0,W,hor);
  ctx.strokeStyle='rgba(30,45,70,0.40)'; ctx.lineWidth=0.8;
  for(let row=0;row<3;row++){
    const ry=(row+1)*(hor*0.28), off=row%2?W*0.07:0;
    ctx.beginPath(); ctx.moveTo(0,ry); ctx.lineTo(W,ry); ctx.stroke();
    for(let col=0;col<9;col++){ const cx=off+col*W*0.12; ctx.beginPath(); ctx.moveTo(cx,ry-hor*0.28); ctx.lineTo(cx,ry); ctx.stroke(); }
  }
  for(let i=0;i<5;i++){
    const dx=W*(0.10+i*0.20), dy=hor*(0.05+(i%2)*0.20), dr=22+i*9;
    const dG=ctx.createRadialGradient(dx,dy,0,dx,dy,dr);
    dG.addColorStop(0,'rgba(15,35,60,0.65)'); dG.addColorStop(1,'transparent');
    ctx.fillStyle=dG; ctx.beginPath(); ctx.arc(dx,dy,dr,0,Math.PI*2); ctx.fill();
  }

  // ZADNI ZED
  const wallY=hor*0.28;
  const wg=ctx.createLinearGradient(0,wallY,0,hor);
  wg.addColorStop(0,'#14182a'); wg.addColorStop(1,'#0e1222');
  ctx.fillStyle=wg; ctx.fillRect(0,wallY,W,hor-wallY);
  ctx.strokeStyle='rgba(0,0,0,0.45)'; ctx.lineWidth=1;
  [wallY+10,wallY+(hor-wallY)*0.5,hor-6].forEach(yy=>{ ctx.beginPath(); ctx.moveTo(0,yy); ctx.lineTo(W,yy); ctx.stroke(); });
  ctx.fillStyle='#080a14';
  [W*0.05,W*0.35,W*0.65,W*0.88].forEach(cx=>{
    ctx.fillRect(cx-3,wallY,6,hor-wallY);
    ctx.fillStyle='#2a1505'; ctx.fillRect(cx-2,wallY+8,1.5,hor-wallY-16);
    ctx.fillStyle='#051a05'; ctx.fillRect(cx,wallY+8,1.5,hor-wallY-16);
    ctx.fillStyle='#080a14';
  });
  ctx.strokeStyle='rgba(150,75,28,0.50)'; ctx.lineWidth=1.2;
  for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(16+i*4,wallY); ctx.lineTo(16+i*4,hor-2); ctx.stroke(); }
  ctx.fillStyle='rgba(35,18,6,0.55)'; ctx.fillRect(4,wallY,28,hor-wallY);

  // KABELY
  ctx.strokeStyle='#141420'; ctx.lineWidth=1.5;
  [W*0.20,W*0.46,W*0.66,W*0.84].forEach((cx,idx)=>{
    const sw=Math.sin(t*0.0007+idx)*2.5;
    ctx.beginPath(); ctx.moveTo(cx,0); ctx.bezierCurveTo(cx+sw,hor*0.10,cx-sw,hor*0.22,cx+sw*0.4,hor*0.32); ctx.stroke();
  });

  // LAMPY
  [{x:W*0.18,y:hor*0.20,on:true},{x:W*0.46,y:hor*0.16,on:true},{x:W*0.72,y:hor*0.20,on:true,flicker:true}].forEach((lp,idx)=>{
    const flick=lp.flicker?(0.55+0.45*Math.abs(Math.sin(t*0.022+idx*3))):1;
    const lit=lp.on?flick:0.05;
    ctx.strokeStyle='#080812'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(lp.x,0); ctx.lineTo(lp.x,lp.y-8); ctx.stroke();
    ctx.fillStyle='#181c2c';
    ctx.beginPath(); ctx.moveTo(lp.x-15,lp.y-8); ctx.lineTo(lp.x+15,lp.y-8); ctx.lineTo(lp.x+10,lp.y+5); ctx.lineTo(lp.x-10,lp.y+5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#282e3e'; ctx.lineWidth=1; ctx.stroke();
    const bG=ctx.createRadialGradient(lp.x,lp.y+1,0,lp.x,lp.y+1,8);
    bG.addColorStop(0,`rgba(255,235,175,${lit*0.95})`); bG.addColorStop(1,`rgba(255,180,80,${lit*0.28})`);
    ctx.fillStyle=bG; ctx.beginPath(); ctx.arc(lp.x,lp.y+1,5,0,Math.PI*2); ctx.fill();
    const cG=ctx.createLinearGradient(lp.x,lp.y+5,lp.x,hor+H*0.06);
    cG.addColorStop(0,`rgba(255,210,140,${lit*0.18})`); cG.addColorStop(0.5,`rgba(255,200,140,${lit*0.07})`); cG.addColorStop(1,'transparent');
    ctx.fillStyle=cG;
    ctx.beginPath(); ctx.moveTo(lp.x-12,lp.y+5); ctx.lineTo(lp.x+12,lp.y+5); ctx.lineTo(lp.x+W*0.14,hor+H*0.08); ctx.lineTo(lp.x-W*0.14,hor+H*0.08); ctx.closePath(); ctx.fill();
  });

  // CRT MONITORY
  const monBaseY=wallY+14, monH=(hor-wallY)*0.60, monW=W*0.14;
  for(let i=0;i<3;i++){
    const mx=W*0.09+i*W*0.18;
    ctx.fillStyle='#08090e'; rrect(mx-6,monBaseY-6,monW+12,monH+12,4); ctx.fill();
    const bezG=ctx.createLinearGradient(mx-6,monBaseY-6,mx-6,monBaseY+monH+6);
    bezG.addColorStop(0,'#28303e'); bezG.addColorStop(0.5,'#181c26'); bezG.addColorStop(1,'#0e1018');
    ctx.strokeStyle=bezG; ctx.lineWidth=2; rrect(mx-6,monBaseY-6,monW+12,monH+12,4); ctx.stroke();
    ctx.save(); ctx.beginPath(); rrect(mx,monBaseY,monW,monH,8); ctx.clip();
    const phG=ctx.createRadialGradient(mx+monW/2,monBaseY+monH/2,0,mx+monW/2,monBaseY+monH/2,monW*0.7);
    phG.addColorStop(0,'#021008'); phG.addColorStop(1,'#000402');
    ctx.fillStyle=phG; ctx.fillRect(mx,monBaseY,monW,monH);
    if(i===0){
      ctx.strokeStyle='rgba(40,255,120,0.95)'; ctx.lineWidth=1.2; ctx.beginPath();
      const cy2=monBaseY+monH/2;
      for(let xx=0;xx<monW;xx+=2){ const ph=(xx/monW)*Math.PI*4+t*0.008; const yy=cy2+Math.sin(ph)*monH*0.25+Math.sin(ph*2.7)*monH*0.06; if(xx===0) ctx.moveTo(mx+xx,yy); else ctx.lineTo(mx+xx,yy); }
      ctx.stroke();
      ctx.strokeStyle='rgba(40,120,60,0.18)'; ctx.lineWidth=0.5;
      for(let g=1;g<5;g++){ ctx.beginPath(); ctx.moveTo(mx,monBaseY+(g/5)*monH); ctx.lineTo(mx+monW,monBaseY+(g/5)*monH); ctx.stroke(); ctx.beginPath(); ctx.moveTo(mx+(g/5)*monW,monBaseY); ctx.lineTo(mx+(g/5)*monW,monBaseY+monH); ctx.stroke(); }
      ctx.fillStyle='rgba(40,255,120,0.60)'; ctx.font='6px JetBrains Mono,monospace'; ctx.textAlign='left';
      ctx.fillText('OSC-7M  2.4MHz',mx+4,monBaseY+9);
    } else if(i===1){
      ctx.strokeStyle='rgba(80,200,255,0.55)'; ctx.lineWidth=0.8;
      const mxc=mx+monW/2, myc=monBaseY+monH/2;
      [[-1,-1,1,1],[1,-1,-1,1],[-1,0,1,0],[0,-1,0,1]].forEach(([x1,y1,x2,y2])=>{ ctx.beginPath(); ctx.moveTo(mxc+x1*monW*0.35,myc+y1*monH*0.30); ctx.lineTo(mxc+x2*monW*0.35,myc+y2*monH*0.30); ctx.stroke(); });
      for(let p=0;p<4;p++){ const ang=t*0.001+p*Math.PI*0.5; const px=mxc+Math.cos(ang)*monW*0.25, py=myc+Math.sin(ang*1.3)*monH*0.18; const pls=0.5+0.5*Math.sin(t*0.005+p); ctx.fillStyle=p===0?`rgba(255,80,80,${pls})`:`rgba(255,180,80,${pls*0.7})`; ctx.beginPath(); ctx.arc(px,py,2,0,Math.PI*2); ctx.fill(); }
      ctx.fillStyle='rgba(80,200,255,0.60)'; ctx.font='6px JetBrains Mono,monospace'; ctx.textAlign='left';
      ctx.fillText('KŘEMŽE TARGETS:4',mx+4,monBaseY+9);
    } else {
      ctx.font='8px JetBrains Mono,monospace';
      const cyrChars=['А','Б','В','Г','Д','Ж','З','И','К','Л','М','Н','П','Р','С','Т'];
      const cols=Math.floor(monW/9);
      for(let c=0;c<cols;c++){ const off2=(t*0.03+c*23.7)%(monH*1.5); for(let r=0;r<10;r++){ const yy=monBaseY+((off2+r*10)%(monH+10))-5; if(yy<monBaseY||yy>monBaseY+monH) continue; const ch=cyrChars[(c*7+r+Math.floor(t*0.001))%cyrChars.length]; ctx.fillStyle=`rgba(40,255,120,${r===0?0.95:Math.max(0,0.80-r*0.10)})`; ctx.fillText(ch,mx+3+c*9,yy); } }
      ctx.fillStyle='rgba(40,255,120,0.60)'; ctx.font='6px JetBrains Mono,monospace'; ctx.textAlign='left';
      ctx.fillText('DEKÓDOVÁNÍ...',mx+4,monBaseY+9);
    }
    ctx.fillStyle='rgba(0,0,0,0.20)';
    for(let sy=monBaseY+1;sy<monBaseY+monH;sy+=2) ctx.fillRect(mx,sy,monW,1);
    const reflG=ctx.createLinearGradient(mx,monBaseY,mx+monW*0.4,monBaseY+monH*0.5);
    reflG.addColorStop(0,'rgba(255,255,255,0.06)'); reflG.addColorStop(1,'transparent');
    ctx.fillStyle=reflG; ctx.fillRect(mx,monBaseY,monW,monH);
    const crtG=ctx.createRadialGradient(mx+monW/2,monBaseY+monH/2,monW*0.3,mx+monW/2,monBaseY+monH/2,monW*0.65);
    crtG.addColorStop(0,'transparent'); crtG.addColorStop(1,'rgba(0,0,0,0.48)');
    ctx.fillStyle=crtG; ctx.fillRect(mx,monBaseY,monW,monH);
    ctx.restore();
    const ledOn=Math.sin(t*0.01+i)*0.5+0.5>0.3;
    ctx.fillStyle=ledOn?'rgba(80,255,140,0.95)':'rgba(40,80,50,0.5)';
    ctx.beginPath(); ctx.arc(mx+monW-8,monBaseY+monH-8,1.8,0,Math.PI*2); ctx.fill();
    const lbls=['ОСЦИЛЛОГРАФ-7М','СЛЕЖКА-К3','РАСШИФРОВКА-9'];
    ctx.fillStyle='rgba(120,140,180,0.40)'; ctx.font='5px JetBrains Mono,monospace'; ctx.textAlign='center';
    ctx.fillText(lbls[i],mx+monW/2,monBaseY+monH+10);
  }

  // REGAL S VYBAVENIM (pravý)
  const shX=W*0.63, shY=wallY+8, shW=W*0.28, shH=(hor-wallY)*0.75;
  ctx.fillStyle='#0e1018'; rrect(shX,shY,shW,shH,2); ctx.fill();
  ctx.strokeStyle='rgba(50,60,80,0.55)'; ctx.lineWidth=1.5; rrect(shX,shY,shW,shH,2); ctx.stroke();
  for(let s=0;s<4;s++){
    const sy2=shY+s*(shH/4);
    ctx.strokeStyle='rgba(40,50,70,0.50)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(shX,sy2); ctx.lineTo(shX+shW,sy2); ctx.stroke();
    if(s===0){
      for(let z=0;z<6;z++){ const zx=shX+12+z*W*0.04, zy=sy2+6; ctx.fillStyle=`rgba(${z%2?120:60},${z%3?200:100},${z%2?80:160},0.55)`; ctx.fillRect(zx,zy,6,shH*0.18); ctx.strokeStyle='rgba(200,210,230,0.25)'; ctx.lineWidth=0.7; ctx.strokeRect(zx,zy,6,shH*0.18); }
    } else if(s===1){
      for(let f=0;f<4;f++){ const fx=shX+8+f*W*0.065; const fClr=['#1a2a1a','#2a1a1a','#1a1a2a','#2a1a12'][f]; ctx.fillStyle=fClr; ctx.fillRect(fx,sy2+4,W*0.055,shH*0.22); ctx.strokeStyle='rgba(100,110,140,0.25)'; ctx.lineWidth=0.8; ctx.strokeRect(fx,sy2+4,W*0.055,shH*0.22); ctx.fillStyle='rgba(150,160,180,0.35)'; ctx.fillRect(fx,sy2+4,W*0.055,4); }
    } else if(s===2){
      ctx.fillStyle='rgba(20,50,25,0.60)'; ctx.fillRect(shX+8,sy2+5,W*0.08,shH*0.17); ctx.strokeStyle='rgba(40,200,60,0.25)'; ctx.lineWidth=0.7; ctx.strokeRect(shX+8,sy2+5,W*0.08,shH*0.17);
      for(let c2=0;c2<5;c2++){ ctx.fillStyle='rgba(200,180,40,0.50)'; ctx.beginPath(); ctx.arc(shX+14+c2*W*0.015,sy2+shH*0.07,2.5,0,Math.PI*2); ctx.fill(); }
      ctx.fillStyle='rgba(30,35,55,0.70)'; ctx.fillRect(shX+W*0.13,sy2+5,W*0.12,shH*0.18); ctx.strokeStyle='rgba(60,70,100,0.40)'; ctx.lineWidth=0.8; ctx.strokeRect(shX+W*0.13,sy2+5,W*0.12,shH*0.18);
      ctx.fillStyle='rgba(255,80,60,0.90)'; ctx.beginPath(); ctx.arc(shX+W*0.13+6,sy2+10,2,0,Math.PI*2); ctx.fill();
    } else {
      if(!gs.story.kgb_detector_from_lab){
        ctx.fillStyle='#181420'; rrect(shX+6,sy2+5,shW-12,shH*0.20,2); ctx.fill();
        ctx.strokeStyle='rgba(200,180,60,0.40)'; ctx.lineWidth=1; rrect(shX+6,sy2+5,shW-12,shH*0.20,2); ctx.stroke();
        const kx=shX+shW/2, ky=sy2+shH*0.12;
        ctx.fillStyle='rgba(200,180,60,0.60)'; ctx.beginPath(); ctx.arc(kx,ky,5,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(220,200,80,0.70)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(kx,ky+5); ctx.lineTo(kx,ky+14); ctx.moveTo(kx,ky+9); ctx.lineTo(kx+4,ky+9); ctx.stroke();
      } else {
        ctx.fillStyle='rgba(80,80,100,0.25)'; ctx.font='8px monospace'; ctx.textAlign='center'; ctx.fillText('prazdny',shX+shW/2,sy2+shH*0.12); ctx.textAlign='left';
      }
    }
  }

  // MAGNETOFON
  const tapeX2=shX+shW-W*0.12-2, tapeY2=hor-50, tapeW2=W*0.12, tapeH2=40;
  ctx.fillStyle='#222818'; rrect(tapeX2,tapeY2,tapeW2,tapeH2,3); ctx.fill();
  ctx.strokeStyle='#303c22'; ctx.lineWidth=1.5; rrect(tapeX2,tapeY2,tapeW2,tapeH2,3); ctx.stroke();
  const reelR2=Math.min(tapeW2*0.22,14);
  [{cx:tapeX2+tapeW2*0.28,cy:tapeY2+tapeH2*0.48},{cx:tapeX2+tapeW2*0.72,cy:tapeY2+tapeH2*0.48}].forEach((rl,idx)=>{
    const rot=t*0.002+idx*Math.PI;
    ctx.fillStyle='#0a0c08'; ctx.beginPath(); ctx.arc(rl.cx,rl.cy,reelR2+1,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#181c12'; ctx.beginPath(); ctx.arc(rl.cx,rl.cy,reelR2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#404830'; ctx.lineWidth=2;
    for(let s=0;s<3;s++){ const ang=rot+s*Math.PI*2/3; ctx.beginPath(); ctx.moveTo(rl.cx,rl.cy); ctx.lineTo(rl.cx+Math.cos(ang)*reelR2*0.85,rl.cy+Math.sin(ang)*reelR2*0.85); ctx.stroke(); }
    ctx.fillStyle='#888'; ctx.beginPath(); ctx.arc(rl.cx,rl.cy,2,0,Math.PI*2); ctx.fill();
  });

  // LABORATORNI STUL
  const dskX=W*0.15, dskY=hor+4, dskW=W*0.44, dskH=H*0.20;
  const dskG=ctx.createLinearGradient(dskX,dskY,dskX,dskY+dskH);
  dskG.addColorStop(0,'#181c28'); dskG.addColorStop(1,'#0e1018');
  ctx.fillStyle=dskG; rrect(dskX,dskY,dskW,dskH,4); ctx.fill();
  ctx.strokeStyle='rgba(50,65,100,0.55)'; ctx.lineWidth=1.5; rrect(dskX,dskY,dskW,dskH,4); ctx.stroke();
  [[dskX+12,dskY+dskH],[dskX+dskW-12,dskY+dskH]].forEach(([lx,ly])=>{ ctx.fillStyle='#0e1018'; ctx.fillRect(lx-5,ly,10,H-ly-10); });
  // Mikroskop
  ctx.fillStyle='rgba(160,165,185,0.40)'; ctx.fillRect(dskX+18,dskY-28,12,28);
  ctx.fillStyle='rgba(140,145,165,0.30)'; ctx.beginPath(); ctx.ellipse(dskX+24,dskY-30,16,5,0,0,Math.PI*2); ctx.fill();
  ctx.fillRect(dskX+8,dskY-10,32,10);
  // Notebook
  ctx.fillStyle='#0a0c10'; rrect(dskX+W*0.12,dskY+5,W*0.16,dskH-14,2); ctx.fill();
  ctx.strokeStyle='rgba(50,65,100,0.40)'; ctx.lineWidth=1; rrect(dskX+W*0.12,dskY+5,W*0.16,dskH-14,2); ctx.stroke();
  ctx.font='7px JetBrains Mono,monospace'; ctx.textAlign='left'; ctx.fillStyle='rgba(40,255,100,0.70)';
  ['> SLEDOVANI: AKTIVNI','> KGB: IDENTIFIKOVANO','> CIBULKA: ONLINE'].forEach((ln,i)=>{ ctx.fillText(ln,dskX+W*0.13,dskY+14+i*10); });
  // Kelimky
  for(let k=0;k<3;k++){
    const kx=dskX+dskW-40+k*14, ky=dskY+5;
    ctx.fillStyle=`rgba(${k===0?30:k===1?60:120},${k===0?100:k===1?180:60},${k===0?200:k===1?30:80},0.45)`;
    ctx.fillRect(kx,ky,10,dskH-14); ctx.strokeStyle='rgba(180,185,210,0.20)'; ctx.lineWidth=0.8; ctx.strokeRect(kx,ky,10,dskH-14);
  }

  // VYCHOD – OTVOR VE STENE (prava strana, kruhovy tunel)
  const exitX=W*0.96, exitY=hor*0.50, exitRX=W*0.055, exitRY=H*0.12;
  // Tma tunelu
  ctx.fillStyle='#040101';
  ctx.beginPath(); ctx.ellipse(exitX,exitY,exitRX,exitRY,0,0,Math.PI*2); ctx.fill();
  // Zar od krbu uvnitr
  const tunnelG=ctx.createRadialGradient(exitX,exitY,0,exitX,exitY,exitRY);
  tunnelG.addColorStop(0,'rgba(255,100,20,0.22)'); tunnelG.addColorStop(0.55,'rgba(10,4,2,0.90)'); tunnelG.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=tunnelG; ctx.beginPath(); ctx.ellipse(exitX,exitY,exitRX,exitRY,0,0,Math.PI*2); ctx.fill();
  // Zave hrany
  const emberG=ctx.createRadialGradient(exitX,exitY,exitRY*0.4,exitX,exitY,exitRY*0.85);
  emberG.addColorStop(0,'rgba(255,120,20,0.28)'); emberG.addColorStop(0.6,'rgba(180,55,8,0.15)'); emberG.addColorStop(1,'transparent');
  ctx.fillStyle=emberG; ctx.beginPath(); ctx.ellipse(exitX,exitY,exitRX*1.3,exitRY*1.25,0,0,Math.PI*2); ctx.fill();
  // Blikajici uhliky
  for(let e=0;e<10;e++){
    const ea=e/10*Math.PI*2;
    const erx=exitRX*(0.85+0.15*Math.sin(t*0.003+e));
    const ery=exitRY*(0.85+0.15*Math.sin(t*0.003+e));
    const ex2=exitX+Math.cos(ea)*erx, ey2=exitY+Math.sin(ea)*ery;
    const ep=0.4+0.6*Math.abs(Math.sin(t*0.009+e*1.7));
    ctx.fillStyle=`rgba(255,${60+e*12},10,${ep*0.80})`;
    ctx.beginPath(); ctx.arc(ex2,ey2,1.5+Math.sin(t*0.01+e)*0.7,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle='rgba(255,160,60,0.48)'; ctx.font='bold 9px monospace'; ctx.textAlign='center';
  ctx.fillText('ZPET KE KRBU', exitX, exitY+exitRY+16);

  // SUPLÍK LEVA STENA
  if(!gs.story.kgb_detector_from_lab && gs.inv.klic_supliku){
    const supX=W*0.02, supY=hor+H*0.08, supW=W*0.08, supH=H*0.12;
    ctx.fillStyle='#12101e'; rrect(supX,supY,supW,supH,2); ctx.fill();
    ctx.strokeStyle='rgba(200,180,60,0.45)'; ctx.lineWidth=1.5; rrect(supX,supY,supW,supH,2); ctx.stroke();
    ctx.fillStyle='rgba(200,180,60,0.35)'; ctx.font='14px monospace'; ctx.textAlign='center';
    ctx.fillText('🗝',supX+supW/2,supY+supH*0.60); ctx.textAlign='left';
  }

  // Ambient
  ctx.fillStyle='rgba(20,50,120,0.04)'; ctx.fillRect(0,0,W,H);
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

// ═══════════════════════════════════════════════════════════════════════════
// JOHNNYHO STALKOVACÍ MÍSTNOST – propracovaná surveillance room
// ═══════════════════════════════════════════════════════════════════════════
function drawJohnnyStalking(W,H,t){
  const ft = t * 0.001;
  const hor = H * 0.35;

  // Strop – temně kovový
  const cG = ctx.createLinearGradient(0, 0, 0, hor);
  cG.addColorStop(0, '#020308'); cG.addColorStop(1, '#080c15');
  ctx.fillStyle = cG; ctx.fillRect(0, 0, W, hor);

  // Podlaha – tmavý beton s jemnými skvrnami
  const fG = ctx.createLinearGradient(0, hor, 0, H);
  fG.addColorStop(0, '#0c0e18'); fG.addColorStop(0.5, '#0a0c14'); fG.addColorStop(1, '#080a10');
  ctx.fillStyle = fG; ctx.fillRect(0, hor, W, H - hor);
  for(let si = 0; si < 20; si++){
    const sx2 = (Math.sin(si*47.3)*0.5+0.5)*W, sy2 = hor + (Math.sin(si*23.7)*0.5+0.5)*(H-hor);
    ctx.fillStyle = `rgba(${si%2?'40,50,70':'30,35,50'},0.15)`;
    ctx.beginPath(); ctx.ellipse(sx2, sy2, 15+Math.sin(si*3)*8, 5+Math.sin(si*5)*3, si*0.3, 0, Math.PI*2); ctx.fill();
  }

  // Stěna – tmavě modrá/černá, zvukově izolační panely
  const wG = ctx.createLinearGradient(0, 0, 0, hor);
  wG.addColorStop(0, '#0a1020'); wG.addColorStop(1, '#060a15');
  ctx.fillStyle = wG; ctx.fillRect(0, 0, W, hor);
  // Zvuková izolace – pěnové panely na stěně
  for(let px = 0; px < 12; px++){
    const panX = px * (W/12), panW = W/12 - 2;
    const panG = ctx.createLinearGradient(panX, 0, panX, hor*0.9);
    panG.addColorStop(0, 'rgba(20,30,50,0.6)'); panG.addColorStop(0.5, 'rgba(15,22,40,0.5)'); panG.addColorStop(1, 'rgba(20,30,50,0.6)');
    ctx.fillStyle = panG; ctx.fillRect(panX+1, 2, panW, hor*0.9);
    ctx.strokeStyle = 'rgba(40,55,80,0.25)'; ctx.lineWidth = 0.5; ctx.strokeRect(panX+1, 2, panW, hor*0.9);
    // Vlnkový vzor izolace
    for(let wy = 0; wy < 6; wy++){
      const wyPos = 4 + wy*(hor*0.15);
      ctx.strokeStyle = 'rgba(30,45,70,0.2)'; ctx.lineWidth = 0.5;
      ctx.beginPath();
      for(let wx = panX+3; wx < panX+panW-1; wx += 3){
        ctx.lineTo(wx, wyPos + Math.sin(wx*0.15+wy)*2);
      }
      ctx.stroke();
    }
  }

  // ══ VELKÁ STĚNA MONITORŮ (5x3 grid) ═══════════════════════════════
  const mGridX = W*0.10, mGridY = hor*0.05;
  const mGridW = W*0.80, mGridH = hor*0.85;
  const mCols = 5, mRows = 3;
  const mGap = 3;
  const mW = (mGridW - (mCols-1)*mGap) / mCols;
  const mH2 = (mGridH - (mRows-1)*mGap) / mRows;

  for(let mr = 0; mr < mRows; mr++){
    for(let mc = 0; mc < mCols; mc++){
      const mx = mGridX + mc*(mW+mGap), my = mGridY + mr*(mH2+mGap);
      const mIdx = mr*mCols + mc;
      // Rámeček monitoru
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(mx-1, my-1, mW+2, mH2+2);
      // Obrazovka – různý obsah podle indexu
      const scanline = Math.sin(ft*8 + mIdx*2) > 0.92 ? 0.15 : 0;
      const flicker = 0.85 + 0.15*Math.sin(ft*6+mIdx*3);

      if(mIdx === 0){
        // CCTV – učebna (zelený noční vidění)
        ctx.fillStyle = `rgba(0,30,10,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.fillStyle = `rgba(0,180,60,${0.08*flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.font = '7px monospace'; ctx.fillStyle = `rgba(0,255,80,${0.7*flicker})`;
        ctx.fillText('CAM-01 UČEBNA', mx+3, my+8);
        ctx.fillText(new Date().toLocaleTimeString(), mx+3, my+mH2-4);
        // Siluety
        for(let fi = 0; fi < 3; fi++){
          ctx.fillStyle = `rgba(0,200,60,${0.15*flicker})`;
          ctx.fillRect(mx+mW*0.2+fi*mW*0.22, my+mH2*0.4, mW*0.08, mH2*0.35);
          ctx.beginPath(); ctx.arc(mx+mW*0.24+fi*mW*0.22, my+mH2*0.35, mW*0.04, 0, Math.PI*2); ctx.fill();
        }
      } else if(mIdx === 1){
        // CCTV – Billa
        ctx.fillStyle = `rgba(15,10,25,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.font = '7px monospace'; ctx.fillStyle = `rgba(200,200,255,${0.6*flicker})`;
        ctx.fillText('CAM-02 BILLA', mx+3, my+8);
        // Regály
        for(let ri = 0; ri < 4; ri++){
          ctx.fillStyle = `rgba(100,90,130,${0.15*flicker})`;
          ctx.fillRect(mx+5+ri*mW*0.22, my+mH2*0.25, mW*0.18, mH2*0.55);
        }
      } else if(mIdx === 2){
        // CCTV – hospoda
        ctx.fillStyle = `rgba(20,8,0,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.font = '7px monospace'; ctx.fillStyle = `rgba(255,180,100,${0.6*flicker})`;
        ctx.fillText('CAM-03 HOSPODA', mx+3, my+8);
        // Bar shape
        ctx.fillStyle = `rgba(180,120,60,${0.12*flicker})`;
        ctx.fillRect(mx+mW*0.1, my+mH2*0.6, mW*0.8, mH2*0.15);
      } else if(mIdx === 3){
        // CCTV – ulice
        ctx.fillStyle = `rgba(5,5,8,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.font = '7px monospace'; ctx.fillStyle = `rgba(150,170,200,${0.6*flicker})`;
        ctx.fillText('CAM-04 ULICE', mx+3, my+8);
        // Lampa glow
        const lampA = 0.3+0.1*Math.sin(ft*2+4);
        ctx.fillStyle = `rgba(255,200,100,${lampA*flicker})`;
        ctx.beginPath(); ctx.arc(mx+mW*0.5, my+mH2*0.3, mW*0.15, 0, Math.PI*2); ctx.fill();
      } else if(mIdx === 4){
        // CCTV – Křemže náměstí
        ctx.fillStyle = `rgba(6,10,20,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.font = '7px monospace'; ctx.fillStyle = `rgba(100,150,220,${0.6*flicker})`;
        ctx.fillText('CAM-05 KŘEMŽE', mx+3, my+8);
        // Kašna
        ctx.strokeStyle = `rgba(100,140,200,${0.15*flicker})`; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(mx+mW*0.5, my+mH2*0.55, mW*0.2, mH2*0.12, 0, 0, Math.PI*2); ctx.stroke();
      } else if(mIdx === 5){
        // Audio waveform – odposlech
        ctx.fillStyle = `rgba(0,0,0,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.font = '7px monospace'; ctx.fillStyle = `rgba(0,255,200,${0.7*flicker})`;
        ctx.fillText('AUDIO-01', mx+3, my+8);
        // Waveform
        ctx.strokeStyle = `rgba(0,255,180,${0.5*flicker})`; ctx.lineWidth = 1;
        ctx.beginPath();
        for(let wx = 0; wx < mW-6; wx++){
          const wy = my+mH2*0.5 + Math.sin(wx*0.3+ft*12)*mH2*0.25*Math.sin(wx*0.05+ft*3);
          wx === 0 ? ctx.moveTo(mx+3+wx, wy) : ctx.lineTo(mx+3+wx, wy);
        }
        ctx.stroke();
      } else if(mIdx === 6){
        // GPS tracker – mapa
        ctx.fillStyle = `rgba(5,15,5,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.font = '7px monospace'; ctx.fillStyle = `rgba(0,200,100,${0.7*flicker})`;
        ctx.fillText('GPS TRACK', mx+3, my+8);
        // Cestičky mapy
        ctx.strokeStyle = `rgba(0,150,80,${0.2*flicker})`; ctx.lineWidth = 0.5;
        for(let li = 0; li < 5; li++){
          ctx.beginPath();
          ctx.moveTo(mx+Math.sin(li*3)*mW*0.3+mW*0.5, my+mH2*0.2);
          ctx.lineTo(mx+Math.cos(li*2)*mW*0.3+mW*0.5, my+mH2*0.8);
          ctx.stroke();
        }
        // Blikající bod – "subjekt"
        const dotA = 0.5 + 0.5*Math.sin(ft*5);
        ctx.fillStyle = `rgba(255,50,50,${dotA*flicker})`;
        ctx.beginPath(); ctx.arc(mx+mW*0.55+Math.sin(ft*0.5)*mW*0.15, my+mH2*0.5+Math.cos(ft*0.3)*mH2*0.2, 3, 0, Math.PI*2); ctx.fill();
      } else if(mIdx === 7){
        // Hráčův profil – fotka + data
        ctx.fillStyle = `rgba(10,10,20,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.font = '7px monospace'; ctx.fillStyle = `rgba(255,100,100,${0.7*flicker})`;
        ctx.fillText('SUBJEKT: HRUBEŠ', mx+3, my+8);
        ctx.fillStyle = `rgba(200,200,220,${0.4*flicker})`;
        ctx.fillRect(mx+3, my+12, mW*0.35, mH2*0.55);
        ctx.font = '6px monospace'; ctx.fillStyle = `rgba(180,180,200,${0.5*flicker})`;
        ctx.fillText('VĚK: 18', mx+mW*0.42, my+20);
        ctx.fillText('ŠKOLA: OA', mx+mW*0.42, my+28);
        ctx.fillText('STATUS: AKTIV', mx+mW*0.42, my+36);
        ctx.fillText('RISK: VYSOKÝ', mx+mW*0.42, my+44);
      } else if(mIdx === 8){
        // Janin profil
        ctx.fillStyle = `rgba(10,5,15,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.font = '7px monospace'; ctx.fillStyle = `rgba(255,100,180,${0.7*flicker})`;
        ctx.fillText('SUBJEKT: KOSOVÁ', mx+3, my+8);
        ctx.fillStyle = `rgba(200,180,210,${0.4*flicker})`;
        ctx.fillRect(mx+3, my+12, mW*0.35, mH2*0.55);
        ctx.font = '6px monospace'; ctx.fillStyle = `rgba(190,170,200,${0.5*flicker})`;
        ctx.fillText('STAV: UTEKLA', mx+mW*0.42, my+20);
        ctx.fillText('POSL.POZICE:', mx+mW*0.42, my+28);
        ctx.fillText('  BILLA', mx+mW*0.42, my+36);
      } else if(mIdx === 9){
        // Log soubor – text scrolling
        ctx.fillStyle = `rgba(0,0,5,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.font = '6px monospace'; ctx.fillStyle = `rgba(0,200,255,${0.5*flicker})`;
        const logs = ['[LOG] Hrubeš vstoupil Billa','[LOG] Kontakt: Kosová','[LOG] Nákup: kratom 50g','[LOG] Přesun: hospoda','[LOG] Kontakt: Johnny','[LOG] Podezřelá aktivita'];
        const scrollOff = Math.floor(ft*0.8) % logs.length;
        for(let li = 0; li < Math.min(6, mH2/8); li++){
          const logIdx = (scrollOff + li) % logs.length;
          ctx.fillText(logs[logIdx], mx+2, my+8+li*8);
        }
      } else if(mIdx === 10){
        // Finanční data – Vaza Systems
        ctx.fillStyle = `rgba(8,5,0,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        ctx.font = '7px monospace'; ctx.fillStyle = `rgba(255,180,50,${0.7*flicker})`;
        ctx.fillText('VAZA SYSTEMS', mx+3, my+8);
        ctx.font = '6px monospace'; ctx.fillStyle = `rgba(255,80,80,${0.6*flicker})`;
        ctx.fillText('TRŽBY: -87%', mx+3, my+18);
        ctx.fillText('ZISK: -142K', mx+3, my+26);
        ctx.fillStyle = `rgba(255,50,50,${0.5*flicker})`;
        // Graf padající dolů
        ctx.beginPath(); ctx.moveTo(mx+3, my+mH2*0.45);
        for(let gx = 0; gx < mW-6; gx++){
          ctx.lineTo(mx+3+gx, my+mH2*0.45 + gx*gx*0.003 + Math.sin(gx*0.3)*2);
        }
        ctx.strokeStyle = `rgba(255,60,60,${0.5*flicker})`; ctx.lineWidth = 1; ctx.stroke();
      } else {
        // Šum / static
        ctx.fillStyle = `rgba(10,10,15,${flicker})`; ctx.fillRect(mx, my, mW, mH2);
        for(let ni = 0; ni < 30; ni++){
          const nx2 = mx + Math.random()*mW, ny2 = my + Math.random()*mH2;
          ctx.fillStyle = `rgba(${Math.floor(Math.random()*60)},${Math.floor(Math.random()*60)},${Math.floor(Math.random()*80)},${0.3*flicker})`;
          ctx.fillRect(nx2, ny2, 2, 1);
        }
        ctx.font = '8px monospace'; ctx.fillStyle = `rgba(200,50,50,${0.6+0.3*Math.sin(ft*4)})`;
        ctx.fillText('NO SIGNAL', mx+mW*0.15, my+mH2*0.55);
      }

      // Scanline overlay
      if(scanline > 0){
        ctx.fillStyle = `rgba(255,255,255,${scanline})`; ctx.fillRect(mx, my, mW, 1);
      }
      // CRT scanlines
      for(let sl = 0; sl < mH2; sl += 2){
        ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(mx, my+sl, mW, 1);
      }
    }
  }

  // ══ OVLÁDACÍ PULT (stůl pod monitory) ══════════════════════════════
  const deskY = hor*0.92, deskH = H*0.12;
  const deskG = ctx.createLinearGradient(0, deskY, 0, deskY+deskH);
  deskG.addColorStop(0, '#1a1828'); deskG.addColorStop(0.5, '#141220'); deskG.addColorStop(1, '#100e18');
  ctx.fillStyle = deskG; ctx.fillRect(W*0.05, deskY, W*0.90, deskH);
  ctx.strokeStyle = 'rgba(60,50,90,0.4)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(W*0.05, deskY, W*0.90, deskH);
  // Hrana desky
  ctx.fillStyle = 'rgba(80,65,110,0.3)'; ctx.fillRect(W*0.05, deskY, W*0.90, 3);

  // Klávesnice
  const kbX = W*0.35, kbY = deskY+deskH*0.25;
  ctx.fillStyle = 'rgba(25,22,35,0.8)'; rrect(kbX, kbY, W*0.18, deskH*0.45, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(60,55,80,0.4)'; ctx.lineWidth = 0.8; rrect(kbX, kbY, W*0.18, deskH*0.45, 2); ctx.stroke();
  for(let kr = 0; kr < 3; kr++){
    for(let kc = 0; kc < 10; kc++){
      ctx.fillStyle = `rgba(40,35,55,${0.5+0.1*Math.sin(ft*2+kr*3+kc*5)})`;
      ctx.fillRect(kbX+3+kc*(W*0.017), kbY+3+kr*(deskH*0.13), W*0.014, deskH*0.10);
    }
  }

  // Myš
  ctx.fillStyle = 'rgba(30,25,40,0.7)';
  ctx.beginPath(); ctx.ellipse(kbX+W*0.22, kbY+deskH*0.2, W*0.015, deskH*0.18, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(55,50,70,0.4)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.ellipse(kbX+W*0.22, kbY+deskH*0.2, W*0.015, deskH*0.18, 0, 0, Math.PI*2); ctx.stroke();

  // Dokumenty/složky na stole (rozházené papíry)
  const papers = [
    {x:W*0.08, y:deskY+deskH*0.15, w:W*0.06, h:deskH*0.55, rot:-0.12, col:'rgba(200,195,180,0.25)'},
    {x:W*0.16, y:deskY+deskH*0.20, w:W*0.05, h:deskH*0.50, rot:0.08, col:'rgba(210,200,170,0.20)'},
    {x:W*0.73, y:deskY+deskH*0.10, w:W*0.07, h:deskH*0.55, rot:0.15, col:'rgba(190,185,170,0.22)'},
    {x:W*0.82, y:deskY+deskH*0.25, w:W*0.05, h:deskH*0.45, rot:-0.20, col:'rgba(255,220,180,0.18)'},
  ];
  papers.forEach(pp => {
    ctx.save(); ctx.translate(pp.x+pp.w/2, pp.y+pp.h/2); ctx.rotate(pp.rot);
    ctx.fillStyle = pp.col; ctx.fillRect(-pp.w/2, -pp.h/2, pp.w, pp.h);
    ctx.strokeStyle = 'rgba(100,90,70,0.15)'; ctx.lineWidth = 0.5; ctx.strokeRect(-pp.w/2, -pp.h/2, pp.w, pp.h);
    // Textové řádky na papíru
    for(let tl = 0; tl < 4; tl++){
      ctx.fillStyle = 'rgba(40,30,20,0.12)'; ctx.fillRect(-pp.w/2+2, -pp.h/2+3+tl*(pp.h/5), pp.w*0.8, 1);
    }
    ctx.restore();
  });

  // Šálek kávy (poloplný, studená)
  const cupX = W*0.62, cupY = deskY+deskH*0.15;
  ctx.fillStyle = 'rgba(200,190,180,0.35)';
  ctx.beginPath(); ctx.ellipse(cupX, cupY+deskH*0.2, W*0.018, deskH*0.15, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(60,40,25,0.30)';
  ctx.beginPath(); ctx.ellipse(cupX, cupY+deskH*0.18, W*0.014, deskH*0.08, 0, 0, Math.PI*2); ctx.fill();
  // Ucho
  ctx.strokeStyle = 'rgba(190,180,170,0.25)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cupX+W*0.02, cupY+deskH*0.18, deskH*0.08, -0.5, 1.5); ctx.stroke();

  // ══ SERVEROVÝ RACK (vpravo) ═══════════════════════════════════════
  const rackX = W*0.88, rackY = hor+H*0.02, rackW = W*0.10, rackH = H*0.55;
  ctx.fillStyle = '#0a0a14'; ctx.fillRect(rackX, rackY, rackW, rackH);
  ctx.strokeStyle = 'rgba(50,45,70,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(rackX, rackY, rackW, rackH);
  // Jednotky v racku
  for(let ru = 0; ru < 8; ru++){
    const ruY = rackY + 4 + ru*(rackH/8);
    ctx.fillStyle = ru % 2 === 0 ? 'rgba(20,18,30,0.8)' : 'rgba(15,13,25,0.7)';
    ctx.fillRect(rackX+3, ruY, rackW-6, rackH/8-3);
    ctx.strokeStyle = 'rgba(45,40,65,0.35)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(rackX+3, ruY, rackW-6, rackH/8-3);
    // LED diody
    for(let led = 0; led < 3; led++){
      const isOn = Math.sin(ft*3+ru*2+led*4) > -0.3;
      const ledCol = led === 0 ? (isOn ? 'rgba(0,255,80,0.7)' : 'rgba(0,60,20,0.3)') :
                     led === 1 ? (isOn ? 'rgba(255,180,0,0.6)' : 'rgba(60,40,0,0.2)') :
                                 (isOn ? 'rgba(0,150,255,0.5)' : 'rgba(0,30,60,0.2)');
      ctx.fillStyle = ledCol;
      ctx.beginPath(); ctx.arc(rackX+8+led*6, ruY+rackH/16, 1.5, 0, Math.PI*2); ctx.fill();
      // Glow
      if(isOn){
        const glowCol = led === 0 ? 'rgba(0,255,80,0.08)' : led === 1 ? 'rgba(255,180,0,0.06)' : 'rgba(0,150,255,0.06)';
        ctx.fillStyle = glowCol;
        ctx.beginPath(); ctx.arc(rackX+8+led*6, ruY+rackH/16, 5, 0, Math.PI*2); ctx.fill();
      }
    }
    // Větrák symbol
    if(ru < 4){
      const fanA = 0.3;
      ctx.strokeStyle = `rgba(80,75,100,${fanA})`; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(rackX+rackW-12, ruY+rackH/16, 5, 0, Math.PI*2); ctx.stroke();
      // Lopatky
      for(let bl = 0; bl < 3; bl++){
        const bAng = ft*15 + bl*Math.PI*2/3;
        ctx.beginPath();
        ctx.moveTo(rackX+rackW-12, ruY+rackH/16);
        ctx.lineTo(rackX+rackW-12+Math.cos(bAng)*4, ruY+rackH/16+Math.sin(bAng)*4);
        ctx.stroke();
      }
    }
  }
  // Kabely ze serveru
  ctx.strokeStyle = 'rgba(40,35,60,0.3)'; ctx.lineWidth = 1;
  for(let ci = 0; ci < 4; ci++){
    ctx.beginPath();
    ctx.moveTo(rackX, rackY+rackH*0.2+ci*rackH*0.18);
    ctx.bezierCurveTo(rackX-W*0.04, rackY+rackH*0.2+ci*rackH*0.18+10, rackX-W*0.06, hor+H*0.3, rackX-W*0.08, hor+H*0.5);
    ctx.stroke();
  }

  // ══ NÁSTĚNKA S FOTKAMI (levá stěna, corková tabule) ════════════════
  const boardX = W*0.01, boardY = hor*0.10, boardW = W*0.07, boardH = hor*0.80;
  ctx.fillStyle = 'rgba(140,110,70,0.15)'; ctx.fillRect(boardX, boardY, boardW, boardH);
  ctx.strokeStyle = 'rgba(100,80,50,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(boardX, boardY, boardW, boardH);
  // Fotky + provázky
  const photos = [
    {y:0.1, label:'J.K.', col:'rgba(255,150,180,0.3)'},
    {y:0.35, label:'F.H.', col:'rgba(150,200,255,0.3)'},
    {y:0.60, label:'M.V.', col:'rgba(200,255,150,0.3)'},
    {y:0.80, label:'???', col:'rgba(255,255,150,0.3)'},
  ];
  photos.forEach((ph2, pi) => {
    const phX = boardX+boardW*0.15, phY = boardY+boardH*ph2.y;
    ctx.fillStyle = ph2.col; ctx.fillRect(phX, phY, boardW*0.65, boardH*0.18);
    ctx.strokeStyle = 'rgba(80,60,40,0.2)'; ctx.lineWidth = 0.5; ctx.strokeRect(phX, phY, boardW*0.65, boardH*0.18);
    ctx.font = '5px monospace'; ctx.fillStyle = 'rgba(200,180,150,0.5)';
    ctx.fillText(ph2.label, phX+2, phY+boardH*0.16);
    // Červený provázek
    if(pi < photos.length-1){
      ctx.strokeStyle = 'rgba(255,50,50,0.2)'; ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(phX+boardW*0.3, phY+boardH*0.18);
      ctx.lineTo(boardX+boardW*0.3, boardY+boardH*photos[pi+1].y);
      ctx.stroke();
    }
    // Špendlík
    ctx.fillStyle = 'rgba(255,50,50,0.5)';
    ctx.beginPath(); ctx.arc(phX+boardW*0.3, phY-1, 2, 0, Math.PI*2); ctx.fill();
  });

  // ══ AMBIENTNÍ OSVĚTLENÍ ════════════════════════════════════════════
  // Modré monitor glow na strop a podlahu
  const monGlow = ctx.createRadialGradient(W*0.5, hor*0.5, 0, W*0.5, hor*0.5, W*0.6);
  monGlow.addColorStop(0, `rgba(40,80,160,${0.06+0.02*Math.sin(ft*2)})`);
  monGlow.addColorStop(0.5, `rgba(30,60,120,${0.03+0.01*Math.sin(ft*2)})`);
  monGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = monGlow; ctx.fillRect(0, 0, W, H);

  // Odraz monitorů na podlaze
  ctx.fillStyle = `rgba(30,60,140,${0.04+0.02*Math.sin(ft*1.5)})`;
  ctx.fillRect(W*0.10, hor, W*0.80, H*0.05);

  // ══ JOHNNY (stojí v místnosti pokud je živý) ═══════════════════════
  if(!gs.story.johnny_dead && gs.story.johnny_stalking_entered){
    const jx = W*0.5, jy = hor + (H-hor)*0.4;
    // Silueta
    ctx.fillStyle = 'rgba(180,160,100,0.25)';
    ctx.beginPath(); ctx.arc(jx, jy-20, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(jx-5, jy-12, 10, 25);
    // Odlesk monitoru na obličeji
    ctx.fillStyle = `rgba(60,100,200,${0.15+0.05*Math.sin(ft*3)})`;
    ctx.beginPath(); ctx.arc(jx, jy-20, 7, 0, Math.PI*2); ctx.fill();
  }

  // ══ DVEŘE ZPĚT (dole uprostřed) ═══════════════════════════════════
  const doorW2 = W*0.12, doorH2 = H*0.14;
  const doorX2 = W*0.5-doorW2/2, doorY2 = H*0.88;
  ctx.fillStyle = '#1a1525'; rrect(doorX2, doorY2, doorW2, doorH2, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(80,60,120,0.4)'; ctx.lineWidth = 1.5; rrect(doorX2, doorY2, doorW2, doorH2, 2); ctx.stroke();
  ctx.fillStyle = 'rgba(200,160,60,0.3)'; ctx.beginPath(); ctx.arc(doorX2+doorW2*0.85, doorY2+doorH2*0.5, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(120,100,160,0.5)'; ctx.textAlign = 'center';
  ctx.fillText('▼ ZPĚT', W*0.5, H*0.97); ctx.textAlign = 'left';
}
