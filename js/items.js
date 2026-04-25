'use strict';
// ═══════════════════════════════════════════
//  PŘEDMĚTY, SMRT, VÝHRA, OBÍDEK
// ═══════════════════════════════════════════

function useKratom(){
  if(gs.kratom_on){ addLog('Kratom ještě funguje!','lw'); return; }
  if(gs.inv.kratom < KRATOM_DOSE_G){
    addLog(`Potřebuješ alespoň ${KRATOM_DOSE_G}g. Máš ${gs.inv.kratom}g.`,'lw'); return;
  }
  activateKratom(gs.kratom_max, KRATOM_DOSE_G);
}

function activateKratom(duration, dose_amount){
  const dose = Math.min(dose_amount, gs.inv.kratom);
  gs.inv.kratom -= dose; updateInv();
  gs.kratom_on    = true;
  gs.kratom_t     = duration;
  gs.kratom_freeze = 0; // freeze odstraněn

  canvas.classList.add('kratom-on');
  document.getElementById('kh').classList.add('on');

  gainRep(gs.story.kratom_used ? 1 : 4, gs.story.kratom_used ? 'Opět kratom' : 'První kratom trip!');
  gs.story.kratom_used = true;
  addLog(`🌿 Vzal jsi ${dose}g kratomu – svět se rozpadá...`, 'lw');
  fnotif('🌿 KRATOM!', 'itm');
  updateHUD();

  gs.kratom_history.push({ dose, ts: gs.ts });
  gs.kratom_history = gs.kratom_history.filter(x => gs.ts - x.ts < 100000);
  if(gs.kratom_history.reduce((a,b) => a + b.dose, 0) > 30){
    triggerDeath(
      'Tvoje srdce nevydrželo masivní nápor zeleného prachu. Šaman tě varoval.',
      'PŘEDÁVKOVAL SES KRATOMEM', 'ZELENÁ TMA TĚ POHLTILA', 'death_kratom_od'
    );
  }
}

function endKratom(){
  gs.kratom_on     = false;
  gs.kratom_freeze = 0;
  gs.kratom_blend_on = false;
  canvas.classList.remove('kratom-on');
  canvas.classList.remove('kratom-blend');
  document.getElementById('kh').classList.remove('on');
  addLog('Kratom vyprchal. Realita se vrací.', 'ls');
}

function useZemle(){
  if(gs.inv.zemle <= 0){ addLog('Nemáš žádnou žemli.','lw'); return; }
  gs.inv.zemle--;
  const gain = Math.min(30, 100 - gs.energy);
  gs.energy  = Math.min(100, gs.energy + 30);
  addLog(`🍕 Snědl jsi žemli! +${gain} energie`, 'ls');
  fnotif(`+${gain} ⚡`, 'pos');
  updateInv(); updateHUD();
}

// ─── Blend – konzumace (intenzivnější kratom trip) ───────────────────────
function useBlend(){
  if(gs.inv.blend <= 0){ addLog('Nemáš žádný blend.','lw'); return; }
  _consumeBlend();
}

function _consumeBlend(){
  if(gs.inv.blend <= 0) return;
  document.getElementById('dov').classList.remove('on');
  gs.inv.blend -= 1; updateInv();
  gs.story.blend_consumed = (gs.story.blend_consumed || 0) + 1;
  addLog('🍃 Zkouřil jsi blend. Geometrie tančí, stěny dýchají...', 'lw');
  fnotif('🌿🔥 BLEND TRIP', 'itm');

  // Spustí rovnou intenzivní kratom trip (stejná délka jako klasický kratom)
  gs.kratom_on = true;
  gs.kratom_blend_on = true;
  gs.kratom_t = gs.kratom_max;
  gs.kratom_freeze = 0;
  canvas.classList.add('kratom-on');
  canvas.classList.add('kratom-blend');
  document.getElementById('kh').classList.add('on');

  if(!gs.story.kratom_used){
    gainRep(4, 'První trip!');
    gs.story.kratom_used = true;
  }
  updateHUD();
}

function useMasturbator(){
  if(!gs.inv.masturbator) return;
  gs.inv.masturbator = 0; updateInv();
  gs.energy = 100; updateHUD();
  gs.obidek_t = gs.ts;
  const off = gs.player.face === 'l' ? -55 : 55;
  gs.semen_puddle = { x: gs.player.x + off, y: gs.player.y + 28, room: gs.room };
}

function usePikoSelf(){
  if(!gs.inv.piko){ addLog('Nemáš piko!','lw'); return; }
  closeDialog();
  gs.inv.piko = 0; updateInv();
  document.getElementById('piko-badge').classList.remove('on');
  setTimeout(() => triggerDeath(
    'Vzal sis piko sám. Bylo to čisté. Pak přišla tma.\nAni Křemže tě neoplakala.',
    'SMRT Z PIKA', 'KONEC HRY · KŘEMŽE PLÁČE', 'death_piko'
  ), 500);
}

// ─── KGB Detektor ─────────────────────────────────────────────────────────

function useKGBDetector(){
  if(!gs.inv.kgb_detector){ addLog('Nemáš detektor!','lw'); return; }
  if(gs.detector_scanning){ addLog('Skenování právě probíhá!','lw'); return; }

  gs.detector_scanning = true;
  gs.detector_scan_t   = gs.ts + 5000;
  addLog('🔍 Detektor aktivní – skenuju místnost...', 'ls');
  fnotif('🔍 Skenování...', 'itm');

  setTimeout(() => {
    gs.detector_scanning = false;
    const krejciPresent = currentNPCs.find(n => n.id === 'krejci');
    if(gs.room === 'ucebna' && krejciPresent){
      gs.story.paja_krejci_red = true;
      addLog('⚠️ AGENT DETEKOVÁN: Krejčí. Jdi ji konfrontovat v učebně.', 'lw');
      fnotif('🔴 AGENT!', 'lw');
    } else {
      addLog('✅ Skenování dokončeno – v této místnosti jsou normální lidé.', 'ls');
      fnotif('✅ Místnost čistá', 'pos');
    }
  }, 5000);
}

// ─── Číhalová v pytli ─────────────────────────────────────────────────────

function pickupCihalova(){
  if(!gs.cihalova_collapsed){ addLog('Číhalová nestojí o tvou pomoc.','lw'); return; }
  if(!gs.inv.pytel){ addLog('Potřebuješ pytel na odpadky – kup ho od Matese.','lw'); return; }
  if(gs.cihalova_in_bag){ addLog('Číhalová už v pytli je.','lw'); return; }
  gs.inv.pytel       = 0;
  gs.cihalova_in_bag = true;
  // Odstraň Číhalovou z místnosti – zmizí ze scény
  currentNPCs = currentNPCs.filter(n => n.id !== 'cihalova');
  updateInv();
  addLog('Nacpal jsi Číhalovou do pytle. V inventáři máš... zvláštní zátěž. 🗑️','lm');
  fnotif('🗑️ Číhalová v pytli!','itm');
  doneObj('quest_cihalova_burn');
}

function burnCihalova(){
  if(!gs.cihalova_in_bag){ addLog('V pytli nic nemáš.','lw'); return; }
  gs.cihalova_in_bag       = false;
  gs.inv.pytel             = 0;
  gs.story.cihalova_burned = true;
  updateInv();
  addLog('🔥 Hodil jsi Číhalovou do krbu. Oheň začal jásat.', 'lm');
  addLog('Honza v Křemži čeká na zprávu... 🗡️', 'lp');
  addObj('quest_honza_cibule');
  screenShake(600);
}

// ─── Smrt – výhra ─────────────────────────────────────────────────────────

function triggerDeath(msg, title = 'SMRT', sub = 'KONEC HRY · KŘEMŽE PLÁČE', deathType = null){
  gs.running = false; gs.dead = true;
  screenShake(400);
  // Red flash on canvas before death screen
  gs._deathFlash = { t: gs.ts };
  setTimeout(()=>{
    document.getElementById('death-title').textContent = title;
    document.getElementById('death-sub').textContent   = sub;
    document.getElementById('death-msg').textContent   = msg;
    document.getElementById('death').classList.add('on');
    profileSaveDeath(deathType);
  }, 350);
}

function triggerStabDeath(){
  gs.running = false; gs.dead = true;
  const ov = document.getElementById('stab-death');
  ov.classList.add('on');
  profileSaveDeath('death_stab');
}

function triggerCihalovaAttack(){
  if(gs.cihalova_coming) return;
  gs.cihalova_coming   = true;
  gs.cihalova_deadline = 0;

  // Číhalová vstoupí do místnosti jako canvas postava
  // gs.ca = stav animace útoku
  gs.ca = {
    phase: 1,
    x: canvas.width + 60,
    y: gs.player.y,
    phaseT: 0,
    flash: 0,
    speech: '',
  };
  // Hráč se nemůže hýbat, ale game loop běží dál (pro animaci)
  gs.ca_active = true;
}

function showWin(){
  gs.running = false;

  const repLevel = getRepLevel(gs.rep);
  document.getElementById('win-body').innerHTML =
    `Nastartoval jsi Fábii a jel domů. Křemže je za tebou.<br>` +
    `Reputace: <strong style="color:${repLevel.color}">${repLevel.label} (${gs.rep})</strong>`;

  document.getElementById('win-stats').innerHTML =
    `<div class="wstat"><div class="wv">${gs.money}</div><div class="wl">Kč zbývá</div></div>` +
    `<div class="wstat"><div class="wv">${gs.rep}</div><div class="wl">Reputace</div></div>` +
    `<div class="wstat"><div class="wv">${gs.ts > 0 ? Math.floor(gs.ts/1000) : 0}</div><div class="wl">Sekund přežito</div></div>`;

  const win = document.getElementById('win');
  win.classList.add('on');
  setTimeout(() => win.classList.add('visible'), 50);
  profileSaveWin();
}


// ─── KGB Minihra ──────────────────────────────────────────────────────────

function startKGBMinigame(){
  gs.running = false;
  const ov = document.getElementById('kgb-ov');
  const mc = document.getElementById('kgb-canvas');
  if(!ov || !mc) return;
  ov.classList.add('on');
  mc.classList.add('kratom-on');
  const headH = document.getElementById('kgb-head').offsetHeight || 58;
  mc.width  = Math.min(920, innerWidth  - 12);
  mc.height = Math.min(520, innerHeight - headH - 18);
  const W = mc.width, H = mc.height;
  const kctx = mc.getContext('2d');

  const KILL_WIN = 18, MAX_PASS = 2;
  const AGENT_TYPES = [
    {label:'KGB', color:'#c0392b', hat:'#6a0000'},
    {label:'GRU', color:'#1a2a4a', hat:'#0a1020'},
    {label:'СВР', color:'#2a5a1a', hat:'#0a2a08'},
  ];

  // Hráč pohyb (W/S)
  let playerY = H * 0.52;
  let playerVY = 0;
  const kKeys = {};
  const onKey = e=>{ kKeys[e.key]=e.type==='keydown'; };
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
  mc._removeKKeys = ()=>{ window.removeEventListener('keydown',onKey); window.removeEventListener('keyup',onKey); };

  let agents=[], bullets=[], particles=[], flashAlpha=0;
  let kills=0, passed=0, gameOver=false, won=false;
  let ts2=0, lastT=0, spawnTimer=0;
  let ammo=40;
  // trippy effect state
  let hueShift=0, warpT=0;

  function spawnAgent(){
    const tp = AGENT_TYPES[Math.floor(Math.random()*AGENT_TYPES.length)];
    const lane = H*(0.18 + Math.random()*0.64);
    agents.push({
      x: W+55, y: lane,
      spd: 1.1 + Math.random()*0.6 + kills*0.15,
      color: tp.color, hat: tp.hat, label: tp.label,
      w:40, h:58, hit:false, hitT:0, id: Math.random(),
    });
  }

  function boom(x,y,col){
    for(let i=0;i<18;i++) particles.push({
      x,y, vx:(Math.random()-0.5)*9, vy:(Math.random()-0.75)*10,
      r:4+Math.random()*5, col, life:1,
    });
  }

  function drawBG(ts){
    hueShift = (hueShift+0.6)%360;
    warpT += 0.025;
    const groundY = H*0.66;

    // ══ VRSTVA 1: realistická Moskva ══════════════════════════════════════

    // Obloha – noční, tmavě modravá
    const sky=kctx.createLinearGradient(0,0,0,groundY);
    sky.addColorStop(0,'#05081a');
    sky.addColorStop(0.6,'#0d1530');
    sky.addColorStop(1,'#1a1020');
    kctx.fillStyle=sky; kctx.fillRect(0,0,W,groundY);

    // Hvězdy – statické body
    kctx.fillStyle='rgba(255,255,255,0.7)';
    const starSeeds=[[.06,.08],[.14,.05],[.22,.12],[.31,.04],[.38,.09],[.47,.06],
      [.55,.03],[.62,.11],[.70,.07],[.78,.04],[.85,.09],[.91,.05],[.97,.12],
      [.10,.18],[.28,.15],[.50,.16],[.74,.19],[.88,.14],[.40,.02],[.65,.01]];
    for(const [rx,ry] of starSeeds){
      kctx.beginPath(); kctx.arc(rx*W, ry*groundY, 0.9, 0, Math.PI*2); kctx.fill();
    }
    // Měsíc
    kctx.fillStyle='#f0e8c0';
    kctx.beginPath(); kctx.arc(W*0.88, groundY*0.14, 10, 0, Math.PI*2); kctx.fill();
    kctx.fillStyle='#0d1530'; // výkrojek
    kctx.beginPath(); kctx.arc(W*0.885, groundY*0.13, 8, 0, Math.PI*2); kctx.fill();

    // Rudé náměstí – dlažba
    const grd=kctx.createLinearGradient(0,groundY,0,H);
    grd.addColorStop(0,'#3a1a1a');
    grd.addColorStop(1,'#1a0a0a');
    kctx.fillStyle=grd; kctx.fillRect(0,groundY,W,H-groundY);
    // dlažební linie
    kctx.strokeStyle='rgba(80,40,40,0.5)'; kctx.lineWidth=1;
    for(let lx=0;lx<W;lx+=W/18){
      kctx.beginPath(); kctx.moveTo(lx,groundY); kctx.lineTo(lx,H); kctx.stroke();
    }
    for(let d=1;d<=5;d++){
      const ly=groundY+d*(H-groundY)/5;
      kctx.beginPath(); kctx.moveTo(0,ly); kctx.lineTo(W,ly); kctx.stroke();
    }

    // ── Chrám sv. Basila ────────────────────────────────────────────────────
    function onionDome(cx,baseY,tw,th,dw,dh,bodyCol,domeCol){
      // tělo věže
      kctx.fillStyle=bodyCol;
      kctx.fillRect(cx-tw/2, baseY-th, tw, th);
      // cibulovitá kopule
      kctx.fillStyle=domeCol;
      kctx.beginPath();
      kctx.moveTo(cx-dw/2, baseY-th);
      kctx.bezierCurveTo(cx-dw*.75, baseY-th-dh*.3, cx-dw*.45, baseY-th-dh*.85, cx, baseY-th-dh);
      kctx.bezierCurveTo(cx+dw*.45,  baseY-th-dh*.85, cx+dw*.75, baseY-th-dh*.3, cx+dw/2, baseY-th);
      kctx.closePath(); kctx.fill();
      // kříž
      kctx.fillStyle='#c8b060';
      kctx.fillRect(cx-1,baseY-th-dh-9,2,9);
      kctx.fillRect(cx-4.5,baseY-th-dh-6,9,1.5);
      kctx.fillRect(cx-3,baseY-th-dh-3.5,6,1);
    }
    const bx=W*0.72, by=groundY;
    // malé krajní věžičky
    onionDome(bx-68,by,  9,22, 12,18, '#8b3030','#c44c28');
    onionDome(bx+68,by,  9,22, 12,18, '#2a5a2a','#3a8a3a');
    // střední věžičky
    onionDome(bx-42,by, 10,32, 13,22, '#8a2a2a','#d4882a');
    onionDome(bx+42,by, 10,32, 13,22, '#2a4a8a','#4a7ac8');
    onionDome(bx-22,by, 12,40, 15,26, '#6a2a6a','#b44ab0');
    onionDome(bx+22,by, 12,40, 15,26, '#2a6a4a','#3ab878');
    // centrální hlavní věž
    onionDome(bx,   by, 20,58, 22,36, '#7a2020','#c8a030');
    // základna chrámu
    kctx.fillStyle='#5a2828';
    kctx.fillRect(bx-80,by-10,160,10);

    // ── Kreml – vlevo ──────────────────────────────────────────────────────
    // zeď
    kctx.fillStyle='#8a2020';
    kctx.fillRect(W*.12,groundY-24,W*.25,24);
    // cimbuří zdi
    kctx.fillStyle='#9a2828';
    const wallW=W*.25, wallX=W*.12;
    for(let c=0;c<=18;c++){
      kctx.fillRect(wallX+c*(wallW/18),groundY-32, wallW/22, 8);
    }
    // Spasskaya věž (hlavní, uprostřed)
    function kremlTower(cx,by2,tw,th,capH){
      kctx.fillStyle='#8a2020';
      kctx.fillRect(cx-tw/2,by2-th,tw,th);
      kctx.fillStyle='#7a1818';
      // oktagonální jehlice
      kctx.beginPath();
      kctx.moveTo(cx-tw*0.4,by2-th);
      kctx.lineTo(cx,by2-th-capH);
      kctx.lineTo(cx+tw*0.4,by2-th);
      kctx.closePath(); kctx.fill();
      // hodiny (Spasskaya)
      if(tw>18){
        kctx.strokeStyle='#e8d890'; kctx.lineWidth=1;
        kctx.beginPath(); kctx.arc(cx,by2-th*0.45,tw*0.28,0,Math.PI*2); kctx.stroke();
      }
      // cimbuří věže
      kctx.fillStyle='#9a2828';
      for(let m=0;m<6;m++){
        kctx.fillRect(cx-tw/2+m*(tw/5.5),by2-th-6,tw/7,6);
      }
      // Rudá hvězda
      kctx.save(); kctx.translate(cx,by2-th-capH-7); kctx.fillStyle='#cc2222';
      kctx.beginPath();
      for(let p=0;p<5;p++){
        const pa=(p*Math.PI*2/5)-Math.PI/2;
        const pb=pa+Math.PI/5;
        kctx.lineTo(Math.cos(pa)*6,Math.sin(pa)*6);
        kctx.lineTo(Math.cos(pb)*2.8,Math.sin(pb)*2.8);
      }
      kctx.closePath(); kctx.fill(); kctx.restore();
    }
    kremlTower(W*.19, groundY, 14,42, 22);
    kremlTower(W*.255, groundY, 24,62, 32); // Spasskaya
    kremlTower(W*.33, groundY, 14,46, 24);

    // Scanlines
    kctx.fillStyle='rgba(0,0,0,0.06)';
    for(let y2=0;y2<H;y2+=3) kctx.fillRect(0,y2,W,1);
  }

  function drawPlayer(){
    const px=W*0.09;
    // wobble hráče – jemnější než agenti
    const pwobY = Math.sin(warpT*1.3)*5 + Math.sin(warpT*2.7)*2;
    const pwobRot = Math.sin(warpT*0.8)*0.07;
    const pwobSc = 1 + Math.sin(warpT*2.1)*0.04;
    const pY = playerY + pwobY;
    kctx.save();
    kctx.translate(px, pY); kctx.rotate(pwobRot); kctx.scale(pwobSc, pwobSc); kctx.translate(-px, -pY);
    // aura – trippy pulsing
    const aR=42+8*Math.sin(warpT*2);
    const ag2=kctx.createRadialGradient(px,pY,0,px,pY,aR);
    ag2.addColorStop(0,`hsla(${hueShift},80%,60%,0.30)`);
    ag2.addColorStop(1,'transparent');
    kctx.fillStyle=ag2; kctx.fillRect(px-aR,pY-aR,aR*2,aR*2);
    // shadow
    kctx.fillStyle='rgba(0,0,0,0.30)'; kctx.beginPath(); kctx.ellipse(px,pY+26,16,6,0,0,Math.PI*2); kctx.fill();
    // body – color shifts with kratom
    kctx.fillStyle=`hsl(${(hueShift+260)%360},70%,55%)`;
    kctx.beginPath(); kctx.arc(px,pY,22,0,Math.PI*2); kctx.fill();
    // head
    kctx.fillStyle='#fde8c8'; kctx.beginPath(); kctx.arc(px,pY-16,16,0,Math.PI*2); kctx.fill();
    // oči – rozzlobené
    kctx.fillStyle='#1e1a2e';
    kctx.beginPath(); kctx.arc(px-5,pY-18,3.8,0,Math.PI*2); kctx.fill();
    kctx.beginPath(); kctx.arc(px+5,pY-18,3.8,0,Math.PI*2); kctx.fill();
    kctx.fillStyle='#fff';
    kctx.beginPath(); kctx.arc(px-3.4,pY-19.6,1.6,0,Math.PI*2); kctx.fill();
    kctx.beginPath(); kctx.arc(px+6.6,pY-19.6,1.6,0,Math.PI*2); kctx.fill();
    kctx.strokeStyle='#3a1010'; kctx.lineWidth=1.8; kctx.lineCap='round';
    kctx.beginPath(); kctx.moveTo(px-9,pY-23); kctx.lineTo(px-2,pY-21); kctx.stroke();
    kctx.beginPath(); kctx.moveTo(px+9,pY-23); kctx.lineTo(px+2,pY-21); kctx.stroke();
    // gun
    kctx.fillStyle='#444'; kctx.fillRect(px+18,pY-3,28,7);
    kctx.fillStyle='#777'; kctx.fillRect(px+43,pY-1,9,4);
    // muzzle flash
    if(flashAlpha>0){
      kctx.fillStyle=`rgba(255,220,50,${flashAlpha})`;
      kctx.beginPath(); kctx.arc(px+54,pY+1,10,0,Math.PI*2); kctx.fill();
      flashAlpha=Math.max(0,flashAlpha-0.12);
    }
    kctx.restore();
  }

  function drawAgents(dt){
    for(let i=agents.length-1;i>=0;i--){
      const a=agents[i];
      a.x -= a.spd;
      if(a.hit){
        a.hitT+=dt;
        if(a.hitT>260){ agents.splice(i,1); kills++; continue; }
      } else if(a.x < W*0.06){
        agents.splice(i,1); passed++;
        continue;
      }

      // wobble – věci se motají (kratom efekt)
      const wt = warpT + a.id * 3.7;
      const wobX = Math.sin(wt*1.4)*9 + Math.sin(wt*2.3)*4;
      const wobY = Math.cos(wt*1.1)*11 + Math.cos(wt*3.1)*5;
      const wobSc = 1 + Math.sin(wt*1.8)*0.06;
      const wobRot = Math.sin(wt*0.9)*0.12;
      const ax=a.x + wobX, ay=a.y + wobY;

      kctx.save();
      if(a.hit){ kctx.globalAlpha=Math.max(0,1-(a.hitT/260)); }
      kctx.translate(ax, ay);
      kctx.rotate(wobRot);
      kctx.scale(wobSc, wobSc);
      kctx.translate(-ax, -ay);

      // body
      const bG=kctx.createLinearGradient(ax-a.w/2,ay,ax+a.w/2,ay);
      bG.addColorStop(0,a.color); bG.addColorStop(1,`hsl(${(hueShift+200)%360},40%,20%)`);
      kctx.fillStyle=bG; kctx.fillRect(ax-a.w/2,ay-a.h*0.55,a.w,a.h*0.6);
      // legs
      kctx.fillStyle=a.hat;
      kctx.fillRect(ax-a.w*0.32,ay+a.h*0.06,a.w*0.28,a.h*0.28);
      kctx.fillRect(ax+a.w*0.04,ay+a.h*0.06,a.w*0.28,a.h*0.28);
      // head
      kctx.fillStyle='#c8905a'; kctx.beginPath(); kctx.arc(ax,ay-a.h*0.66,a.w*0.42,0,Math.PI*2); kctx.fill();
      // hat
      kctx.fillStyle=a.hat;
      kctx.fillRect(ax-a.w*0.55,ay-a.h*0.86,a.w*1.10,a.h*0.22);
      kctx.fillRect(ax-a.w*0.36,ay-a.h*1.12,a.w*0.72,a.h*0.28);
      // face – drawn eyes
      const aheadY=ay-a.h*0.66, aer=a.w*0.155;
      if(a.hit){
        kctx.strokeStyle='rgba(50,10,10,0.82)'; kctx.lineWidth=2.2; kctx.lineCap='round';
        for(const ox of [-a.w*0.2,a.w*0.2]){
          kctx.beginPath(); kctx.moveTo(ax+ox-3.5,aheadY-3.5); kctx.lineTo(ax+ox+3.5,aheadY+3.5); kctx.stroke();
          kctx.beginPath(); kctx.moveTo(ax+ox+3.5,aheadY-3.5); kctx.lineTo(ax+ox-3.5,aheadY+3.5); kctx.stroke();
        }
      } else {
        kctx.fillStyle='#1e1a2e';
        kctx.beginPath(); kctx.arc(ax-a.w*0.2,aheadY,aer,0,Math.PI*2); kctx.fill();
        kctx.beginPath(); kctx.arc(ax+a.w*0.2,aheadY,aer,0,Math.PI*2); kctx.fill();
        kctx.fillStyle='rgba(255,255,255,0.88)';
        kctx.beginPath(); kctx.arc(ax-a.w*0.2+aer*0.5,aheadY-aer*0.5,aer*0.42,0,Math.PI*2); kctx.fill();
        kctx.beginPath(); kctx.arc(ax+a.w*0.2+aer*0.5,aheadY-aer*0.5,aer*0.42,0,Math.PI*2); kctx.fill();
        kctx.strokeStyle=a.hat; kctx.lineWidth=1.6; kctx.lineCap='round';
        kctx.beginPath(); kctx.moveTo(ax-a.w*0.35,aheadY-a.w*0.21); kctx.lineTo(ax-a.w*0.08,aheadY-a.w*0.13); kctx.stroke();
        kctx.beginPath(); kctx.moveTo(ax+a.w*0.35,aheadY-a.w*0.21); kctx.lineTo(ax+a.w*0.08,aheadY-a.w*0.13); kctx.stroke();
      }
      // label badge
      kctx.fillStyle=`hsla(0,85%,50%,0.90)`;
      kctx.font='bold 9px JetBrains Mono,monospace';
      kctx.fillText(a.label,ax,ay-a.h*0.96);
      // speed lines (trippy)
      if(!a.hit){
        kctx.strokeStyle=`hsla(${(hueShift+30)%360},100%,60%,0.18)`;
        kctx.lineWidth=1;
        for(let li=0;li<3;li++){
          const ly=ay-a.h*0.3+li*a.h*0.3;
          kctx.beginPath(); kctx.moveTo(ax+a.w/2+5,ly); kctx.lineTo(ax+a.w/2+28+li*12,ly); kctx.stroke();
        }
      }
      kctx.restore();
    }
  }

  function drawBullets(dt){
    for(let i=bullets.length-1;i>=0;i--){
      const b=bullets[i];
      b.x+=22;
      if(b.x>W){ bullets.splice(i,1); continue; }
      // hit check
      let hit=false;
      for(const a of agents){
        if(!a.hit && Math.abs(b.x-a.x)<a.w*0.7 && Math.abs(b.y-a.y)<a.h*0.7){
          a.hit=true; boom(a.x,a.y,a.color); hit=true; break;
        }
      }
      if(hit){ bullets.splice(i,1); continue; }
      // draw – trippy color
      const bc=`hsl(${(hueShift+40)%360},100%,70%)`;
      kctx.fillStyle=bc; kctx.beginPath(); kctx.ellipse(b.x,b.y,9,3.5,0,0,Math.PI*2); kctx.fill();
      kctx.fillStyle=`hsla(${hueShift},100%,80%,0.4)`; kctx.beginPath(); kctx.ellipse(b.x-14,b.y,18,2,0,0,Math.PI*2); kctx.fill();
    }
  }

  function drawParticles(){
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.3; p.life-=0.028;
      if(p.life<=0){ particles.splice(i,1); continue; }
      kctx.globalAlpha=p.life;
      kctx.fillStyle=`hsl(${(hueShift+60)%360},100%,60%)`;
      kctx.beginPath(); kctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2); kctx.fill();
      kctx.globalAlpha=1;
    }
  }

  function drawHUD(){
    const hudH=46, fs=Math.max(11,Math.floor(W*0.014));
    kctx.fillStyle='rgba(0,0,0,0.70)'; kctx.fillRect(0,H-hudH,W,hudH);
    kctx.strokeStyle=`hsla(${hueShift},80%,50%,0.45)`; kctx.lineWidth=1.2;
    kctx.strokeRect(0,H-hudH,W,hudH);

    kctx.font=`bold ${fs}px JetBrains Mono,monospace`; kctx.textBaseline='middle';
    // kills – vlevo
    kctx.fillStyle=`hsl(${(hueShift+120)%360},90%,65%)`;
    kctx.textAlign='left'; kctx.fillText(`💀 ${kills} / ${KILL_WIN}`,10,H-hudH/2);
    // progress bar – střed
    const pbW=W*0.36, pbX=(W-pbW)/2;
    kctx.fillStyle='rgba(255,255,255,0.10)'; kctx.fillRect(pbX,H-hudH+8,pbW,12);
    kctx.fillStyle=`hsl(${(hueShift+120)%360},90%,55%)`;
    kctx.fillRect(pbX,H-hudH+8,pbW*(kills/KILL_WIN),12);
    kctx.strokeStyle='rgba(255,255,255,0.22)'; kctx.lineWidth=1; kctx.strokeRect(pbX,H-hudH+8,pbW,12);
    kctx.fillStyle='rgba(255,255,255,0.45)'; kctx.textAlign='center'; kctx.font=`${Math.max(9,Math.floor(W*0.010))}px JetBrains Mono,monospace`;
    kctx.fillText(`${kills} / ${KILL_WIN} agentů`,pbX+pbW/2,H-hudH+14);
    // prošlo – vpravo (krátce)
    kctx.font=`bold ${fs}px JetBrains Mono,monospace`;
    kctx.fillStyle= passed>0 ? 'rgba(255,60,60,0.95)' : 'rgba(100,255,120,0.7)';
    kctx.textAlign='right';
    kctx.fillText(passed>0 ? `❌ prošlo: ${passed}` : '✅ nikdo neprošel', W-10, H-hudH/2);
    // náboje – vpravo nad HUD
    kctx.font=`bold ${Math.max(10,Math.floor(W*0.012))}px JetBrains Mono,monospace`; kctx.textAlign='right';
    const ammoCol = ammo>10 ? 'rgba(255,220,80,0.9)' : ammo>0 ? 'rgba(255,80,80,0.95)' : 'rgba(255,40,40,0.7)';
    kctx.fillStyle=ammoCol;
    kctx.fillText(`🔫 ${ammo} nábojů`, W-10, H-hudH-7);
    // ovládání – vlevo nad HUD
    kctx.font=`${Math.max(9,Math.floor(W*0.0092))}px JetBrains Mono,monospace`; kctx.textAlign='left';
    kctx.fillStyle='rgba(255,255,255,0.28)';
    kctx.fillText('[W/S] pohyb   [MEZERNÍK / klik] střelba', 10, H-hudH-7);
  }

  function drawEndScreen(){
    kctx.fillStyle='rgba(0,0,0,0.82)'; kctx.fillRect(0,0,W,H);
    if(won){
      kctx.fillStyle=`hsl(${hueShift},90%,65%)`;
      kctx.font=`bold ${Math.floor(W*0.052)}px Bebas Neue,Impact,sans-serif`;
      kctx.textAlign='center'; kctx.textBaseline='middle';
      kctx.fillText('VŠICHNI AGENTI ZLIKVIDOVÁNI!',W/2,H*0.38);
      kctx.fillStyle='rgba(255,255,255,0.82)'; kctx.font=`${Math.floor(W*0.022)}px Outfit,sans-serif`;
      kctx.fillText('Petr Cibulka se spokojeně usmívá. +20 REP',W/2,H*0.52);
    } else {
      kctx.fillStyle='#ef4444';
      kctx.font=`bold ${Math.floor(W*0.052)}px Bebas Neue,Impact,sans-serif`;
      kctx.textAlign='center'; kctx.textBaseline='middle';
      kctx.fillText('AGENT PROŠEL – MISE SELHALA',W/2,H*0.38);
      kctx.fillStyle='rgba(255,255,255,0.72)'; kctx.font=`${Math.floor(W*0.022)}px Outfit,sans-serif`;
      kctx.fillText('Křemže kompromitována. Cibulka zmizel.',W/2,H*0.52);
    }
    kctx.fillStyle='rgba(255,255,255,0.40)'; kctx.font=`${Math.floor(W*0.016)}px JetBrains Mono,monospace`;
    kctx.fillText('Klikni nebo stiskni Enter pro návrat',W/2,H*0.68);
    mc.onclick=()=>endKGBMinigame(won);
    const onEnter=e=>{ if(e.key==='Enter'){ window.removeEventListener('keydown',onEnter); endKGBMinigame(won); } };
    window.addEventListener('keydown',onEnter);
  }

  function loop(ts){
    if(gameOver) return;
    const dt=Math.min(ts-lastT,50); lastT=ts; ts2=ts;

    // Player movement
    if(kKeys['w']||kKeys['ArrowUp'])   playerVY -= 0.6;
    if(kKeys['s']||kKeys['ArrowDown']) playerVY += 0.6;
    playerVY *= 0.85;
    playerY = Math.max(H*0.12, Math.min(H*0.88, playerY+playerVY));

    // Spawn – every 1.2–2.0s, gets faster
    spawnTimer -= dt;
    const interval = Math.max(750, 2300 - kills*22);
    if(spawnTimer<=0){ spawnAgent(); spawnTimer=interval*(0.8+Math.random()*0.4); }

    drawBG(ts);
    drawPlayer();
    drawAgents(dt);
    drawBullets(dt);
    drawParticles();
    drawHUD();

    // Vignette
    const vig=kctx.createRadialGradient(W/2,H/2,H*0.18,W/2,H/2,Math.max(W,H)*0.78);
    vig.addColorStop(0,'transparent'); vig.addColorStop(1,'rgba(0,0,0,0.58)');
    kctx.fillStyle=vig; kctx.fillRect(0,0,W,H);

    if(kills>=KILL_WIN){ gameOver=true; won=true; drawEndScreen(); return; }
    if(passed>MAX_PASS){
      gameOver=true; won=false;
      mc.onclick=null;
      window.removeEventListener('keydown',onKey); window.removeEventListener('keyup',onKey);
      if(mc._spaceShoot){ window.removeEventListener('keydown',mc._spaceShoot); mc._spaceShoot=null; }
      let fA=0, fLast=0;
      (function whiteFade(fts){
        if(!fLast) fLast=fts;
        fA=Math.min(1,fA+(fts-fLast)/1900); fLast=fts;
        kctx.fillStyle=`rgba(255,252,220,${fA})`; kctx.fillRect(0,0,W,H);
        if(fA<1) requestAnimationFrame(whiteFade);
        else setTimeout(()=>{ document.getElementById('kgb-ov').classList.remove('on'); startHeavenScene(); },300);
      })(ts2);
      return;
    }

    requestAnimationFrame(loop);
  }

  function shoot(){
    if(gameOver || ammo<=0) return;
    ammo--;
    flashAlpha=1;
    bullets.push({x:W*0.13, y:playerY});
  }

  mc.onclick=(e)=>{ shoot(); };

  // Mezerník = střelba
  const spaceShoot = e => {
    if(e.code==='Space'){ e.preventDefault(); shoot(); }
  };
  mc._spaceShoot = spaceShoot;
  window.addEventListener('keydown', spaceShoot);

  requestAnimationFrame(t=>{ lastT=t; loop(t); });
}

function endKGBMinigame(won){
  const ov = document.getElementById('kgb-ov');
  if(ov) ov.classList.remove('on');
  const mc = document.getElementById('kgb-canvas');
  mc.classList.remove('kratom-on');
  mc.onclick = null;
  // Odstraň všechny KGB keylistenery
  if(mc._spaceShoot){ window.removeEventListener('keydown', mc._spaceShoot); mc._spaceShoot = null; }
  if(mc._removeKKeys){ mc._removeKKeys(); mc._removeKKeys = null; }

  if(won){
    gs.running = true;
    gainRep(20,'KGB/GRU eliminácia! 🔫');
    addLog('Přežil jsi KGB a GRU. Petr Cibulka si tě váží. +20 REP 🔫','lm');
    fnotif('+20 REP 🔫','rep');
    doneObj('quest_kgb');
    gs.story.kgb_won = true;
    initRoom();
    lastTime = performance.now(); // resetuj timer aby dt nezaskoček
    requestAnimationFrame(gameLoop); // restartuj smyčku (zastavila se při KGB)
    setTimeout(() => {
      const n = currentNPCs.find(x => x.id === 'bezdak');
      if(n) showDialog(n);
    }, 500);
  } else {
    startHeavenScene();
  }
}

// ─── Nebe – přechod do herní místnosti ───────────────────────────────────

function startHeavenScene(){
  gs.story.god_line = 0;
  gs.room = 'heaven';
  gs.running = true;
  initRoom(canvas.width * 0.5, canvas.height * 0.82);
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  addLog('*bílé světlo... jsi v nebi*', 'ls');
}
