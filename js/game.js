'use strict';
// ═══════════════════════════════════════════
//  HERNÍ ENGINE – SMYČKA, POHYB, MÍSTNOSTI
// ═══════════════════════════════════════════

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
resize();
window.addEventListener('resize', () => { resize(); if(gs.running) initRoom(); });

let currentNPCs = [], currentItems = [], keys = {}, lastTime = 0;

// ─── Artefakty na trofejní stěně doma ────────────────────────────────────
// Všechny artefakty zobrazené v kruhu doma (i ty, co se nedají vzít):
const ART_KEYS_DISPLAY = ['c2_cert','milan_phone','podprsenka','klice_vila','klice_fabie','saman_hlava','maturita','foto_figurova','membership_vaza','webovky','kgb_detector','klic_supliku'];
// Pouze tyto artefakty si lze vzít před hrou do inventáře:
const PICKABLE_ART_KEYS = new Set(['saman_hlava','milan_phone','podprsenka','foto_figurova','membership_vaza','maturita','klic_supliku']);

// ─── Utilitky ─────────────────────────────────────────────────────────────

const FRAME_MS = 1000 / 60;

function rr(a, b){ return a + Math.random() * (b - a); }
function dist2(a, b){ return Math.hypot(a.x - b.x, a.y - b.y); }

// ─── Inicializace místnosti ───────────────────────────────────────────────

function initRoom(spawnX, spawnY){
  const rm = ROOMS[gs.room];
  gs.visited.add(gs.room);
  gs.roomFadeAlpha = 1;  // fade-in při vstupu do místnosti

  // Minimalistický název místnosti místo banner
  const rname = document.getElementById('room-name');
  if(rname) rname.textContent = rm.icon + ' ' + rm.name.toUpperCase();

  // Šipky navigace
  const isSklep  = gs.room === 'sklep';
  const isHeaven = gs.room === 'heaven' || gs.room === 'heaven_gate';
  const isDoma   = gs.room === 'doma';
  const idx = (isSklep || isHeaven || isDoma) ? -1 : RORDER.indexOf(gs.room);

  // Schovat L/R šipky v místnostech, kde nelze jít do stran
  const canLR = idx >= 0 && !isDoma;
  document.getElementById('cL').style.display = canLR ? '' : 'none';
  document.getElementById('cR').style.display = canLR ? '' : 'none';

  if(isDoma){
    document.getElementById('cLn').textContent = '?';
    document.getElementById('cRn').textContent = '?';
    document.getElementById('cUn').textContent = 'Křemže';
    document.getElementById('cDn').textContent = '?';
  } else if(isHeaven){
    document.getElementById('cLn').textContent = '?';
    document.getElementById('cRn').textContent = '?';
    document.getElementById('cUn').textContent = gs.room === 'heaven' ? 'Boží brána' : '?';
    document.getElementById('cDn').textContent = gs.room === 'heaven_gate' ? 'Nebeské schody' : '?';
  } else if(!isSklep){
    document.getElementById('cLn').textContent = ROOMS[RORDER[(idx - 1 + 5) % 5]].name;
    document.getElementById('cRn').textContent = ROOMS[RORDER[(idx + 1) % 5]].name;
    document.getElementById('cUn').textContent = '?';
    document.getElementById('cDn').textContent = '?';
  } else {
    document.getElementById('cLn').textContent = '?';
    document.getElementById('cRn').textContent = '?';
    document.getElementById('cUn').textContent = '?';
    document.getElementById('cDn').textContent = 'Billa';
  }

  document.querySelectorAll('.rmpip').forEach(p => {
    p.classList.toggle('cur', p.dataset.r === gs.room);
    p.classList.toggle('vis', gs.visited.has(p.dataset.r) && p.dataset.r !== gs.room);
  });

  currentNPCs = rm.npcs.map(id => {
    const n = NPCS[id]; if(!n) return null;
    return { ...n, id, x:n.rx * canvas.width, y:n.ry * canvas.height, bob:0, bobDir:1 };
  }).filter(Boolean);
  // Cibulka odešel – nezobrazuj ho
  if(gs.story.cibulka_left) currentNPCs = currentNPCs.filter(n => n.id !== 'bezdak');
  // Pláteníková – zobrazit jen po hlasovce a screenshotu
  if(!gs.platenikova_in) currentNPCs = currentNPCs.filter(n => n.id !== 'platenikova');
  // Šaman mrtvý nebo právě běhá nahý – nezobrazuj normální verzi
  if(gs.saman_dead || gs.saman_naked_anim) currentNPCs = currentNPCs.filter(n => n.id !== 'kratom_saman');
  // Šaman jde / stojí u krbu (Cibulkův příkaz) – budeme ho renderovat sami
  if(gs.saman_to_krb) currentNPCs = currentNPCs.filter(n => n.id !== 'kratom_saman');
  // Pája v hospodě – nezobrazuj na ulici
  if(gs.story.paja_in_hospoda) currentNPCs = currentNPCs.filter(n => n.id !== 'paja');
  // Pája v hospodě – přidat ho tam
  if(gs.room === 'hospoda' && gs.story.paja_in_hospoda && !gs.story.paja_quest_done){
    const pNPC = NPCS['paja'];
    if(!currentNPCs.find(n => n.id === 'paja'))
      currentNPCs.push({...pNPC, id:'paja', x:pNPC.rx*canvas.width*0.55, y:pNPC.ry*canvas.height*1.4, bob:0, bobDir:1});
  }
  // Číhalová mrtvá / v pytli / spálená / po skolabování – nezobrazuj ji
  if(gs.cihalova_in_bag || gs.story.cihalova_burned)
    currentNPCs = currentNPCs.filter(n => n.id !== 'cihalova');
  // Milan mrtvý, utekl nebo čeká v hospodě – nezobrazuj ho v Křemži
  if(gs.story.milan_voodoo_dead || gs.story.milan_fled || gs.story.milan_going_to_sklep || gs.story.milan_waiting_mates || gs.story.milan_shot)
    currentNPCs = currentNPCs.filter(n => n.id !== 'milan');
  // Milan čeká na Matese v hospodě
  if(gs.room === 'hospoda' && gs.story.milan_in_hospoda && !gs.story.milan_fled){
    const mNPC = NPCS['milan'];
    const alreadyIn = currentNPCs.find(n => n.id === 'milan');
    if(!alreadyIn) currentNPCs.push({...mNPC, id:'milan', x:mNPC.rx*canvas.width*0.55, y:mNPC.ry*canvas.height*1.1, bob:0, bobDir:1});
  }
  // Vstup do sklepa – Milan šel sám za Kubátovou
  if(gs.room === 'sklep' && gs.story.milan_going_to_sklep && !gs.story.milan_dead_sklep){
    gs.story.milan_dead_sklep = true;
    gs.story.mraz_done = true;
    setTimeout(() => {
      addLog('*Ticho. Pak to vidíš.*', 'lw');
      addLog('*Na podlaze sklepa... krev. Všude. Části těla po celé místnosti.*', 'lw');
      addLog('Kubátová stojí uprostřed klidně. Jako by se nic nestalo.', 'lw');
      fnotif('Milan... 🩸', 'rep');
    }, 900);
  }
  // Jana – skrýt v Bille pokud je v hospodě/vile (ale ne po záchraně – vrací se do Billy)
  const janaAway = gs.story.jana_in_hospoda || (gs.story.johnny_took_jana && !gs.story.jana_rescued_villa) || gs.story.jana_drugged_villa;
  if(janaAway)
    currentNPCs = currentNPCs.filter(n => n.id !== 'jana_kosova');
  // Lenka zaskakuje za Janu v Bille – zobrazí se jen když Jana chybí
  if(gs.room === 'billa' && !janaAway)
    currentNPCs = currentNPCs.filter(n => n.id !== 'lenka');
  // Jana z vily – po spoutání Johnnyho nebo v ložnici se neobjevuje ve vile
  if(gs.room === 'johnny_vila' && (gs.story.johnny_cuffed || gs.story.johnny_bedroom))
    currentNPCs = currentNPCs.filter(n => n.id !== 'jana_vila');
  // Johnny vila – schovat v ložnici
  if(gs.room === 'johnny_vila' && gs.story.johnny_bedroom)
    currentNPCs = currentNPCs.filter(n => n.id !== 'johnny_vila');
  // Sad Johnny / Dead Johnny – skrýt normální NPC (renderuje se custom)
  if(gs.room === 'johnny_vila' && (gs.story.johnny_sad_couch || gs.story.johnny_dead))
    currentNPCs = currentNPCs.filter(n => n.id !== 'johnny_vila' && n.id !== 'jana_vila');
  // Gun scene / dodge – Johnny a Jana jsou v koupelně, ne ve vile
  if(gs.room === 'koupelna' && gs.story.gun_scene_done && !gs.story.jana_fleeing)
    currentNPCs = currentNPCs.filter(n => n.id !== 'johnny_vila' && n.id !== 'jana_vila');
  if(gs.dodge || (gs.story.jana_fleeing && !gs.story.jana_escaped_success && !gs.story.jana_escape_failed))
    currentNPCs = currentNPCs.filter(n => n.id !== 'johnny_vila' && n.id !== 'jana_vila');
  // Johnny – schovat v hospodě pokud je spoutaný, je vila hotová, nebo odešel s Janou domů
  if(gs.story.johnny_cuffed || gs.story.johnny_villa_rewards || gs.story.johnny_took_jana)
    currentNPCs = currentNPCs.filter(n => n.id !== 'johnny');
  // Mates zabit – navždy pryč
  if(gs.story.mates_dead)
    currentNPCs = currentNPCs.filter(n => n.id !== 'mates');
  // Figurová zabita / parayzovaná / skopnuta – skrýt v učebně
  if(gs.story.figurova_killed || gs.story.figurova_kicked || gs.story.figurova_kratomed || gs.story.figurova_fent)
    currentNPCs = currentNPCs.filter(n => n.id !== 'figurova');
  // Figurová sleduje hráče – přidat ji do aktuální místnosti (přechody mezi místnostmi)
  if(gs.story.figurova_following && !gs.story.figurova_at_door){
    const figNPC = NPCS['figurova'];
    if(!currentNPCs.find(n => n.id === 'figurova')){
      // V Bille vychází vždy zleva (spawnX je správná pozice hráče, ne stará)
      const figX = gs.room === 'billa'
        ? (spawnX !== undefined ? spawnX - 55 : -55)
        : gs.player.x - 55;
      currentNPCs.push({...figNPC, id:'figurova', x:figX, y:gs.player.y, bob:0, bobDir:1});
    }
  }
  // Figurová skopnuta – schovat v Bille, zobrazit v sklepě na zemi (log při vstupu)
  if(gs.room === 'sklep' && gs.story.figurova_kicked && !gs.story.figurova_dead_sklep){
    setTimeout(() => addLog('*Na podlaze sklepa... Figurová. Pochroumána. Ještě se hýbe.*', 'lw'), 600);
  }
  // Jana v hospodě na rande
  if(gs.room === 'hospoda' && gs.story.jana_in_hospoda && !gs.story.johnny_took_jana && !gs.story.jana_at_johnny){
    const jn = NPCS['jana_kosova'];
    currentNPCs.push({...jn, id:'jana_kosova', x:jn.rx*canvas.width, y:(jn.ry+0.28)*canvas.height, bob:0, bobDir:1});
  }

  // Spustit cutscenu v koupelně po prokopnutí dveří
  if(gs.room === 'koupelna' && gs.story.bathroom_door_broken && !gs.story.gun_scene_done && !gs.story.jana_handcuffed_johnny){
    setTimeout(() => triggerJohnnyGunScene(), 600);
  }

  // Render Johnny spoutaný u radiátoru ve villce
  if(gs.room === 'johnny_vila' && gs.story.jana_handcuffed_johnny){
    currentNPCs = currentNPCs.filter(n => n.id !== 'johnny_vila' && n.id !== 'jana_vila');
  }

  currentItems = [];
  if(rm.spawns.kratom && Math.random() < rm.spawns.kratom)
    currentItems.push({type:'kratom', x:rr(.15,.85)*canvas.width, y:rr(.18,.82)*canvas.height, p:0});
  if(rm.spawns.zemle  && Math.random() < rm.spawns.zemle)
    currentItems.push({type:'zemle',  x:rr(.15,.85)*canvas.width, y:rr(.18,.82)*canvas.height, p:0});

  gs.player.x = (spawnX !== undefined) ? spawnX : canvas.width  / 2;
  gs.player.y = (spawnY !== undefined) ? spawnY : canvas.height / 2;
}

function changeRoom(dir){
  const isSklep  = gs.room === 'sklep';
  const p = gs.player;
  const W = canvas.width, H = canvas.height;
  const EDGE = 60;

  // Nebe – přechod mezi schodami a bránou
  if(gs.room === 'heaven' && dir === 'up'){
    gs.room = 'heaven_gate'; initRoom(p.x, H - EDGE); return;
  }
  if(gs.room === 'heaven_gate' && dir === 'down'){
    gs.room = 'heaven'; initRoom(p.x, EDGE); return;
  }
  if(gs.room === 'heaven' || gs.room === 'heaven_gate') return; // žádný jiný odchod z nebe

  if(dir === 'up'){
    // Doma – dveře nahoru vedou zpět do hry (Křemže)
    if(gs.room === 'doma'){ gs.room = 'kremze'; initRoom(canvas.width * 0.50, canvas.height * 0.80); return; }
    return;
  }
  if(dir === 'down'){
    if(isSklep){ gs.room = 'billa'; initRoom(Math.floor(canvas.width*0.63), Math.floor(canvas.height*0.65)); return; }
    return;
  }

  if(isSklep) return;

  const idx = RORDER.indexOf(gs.room); let ni;
  if(dir === 'prev'){      ni = (idx - 1 + 5) % 5; gs.room = RORDER[ni]; initRoom(W - EDGE, p.y); }
  else if(dir === 'next'){ ni = (idx + 1) % 5;     gs.room = RORDER[ni]; initRoom(EDGE,     p.y); }
}

// ─── Proximity check ──────────────────────────────────────────────────────

function checkProx(){
  const p = gs.player;
  let best = null, bd = PROX_R;

  currentNPCs.forEach(n => {
    const d = dist2(p, {x:n.x, y:n.y}); if(d < bd){ bd = d; best = {...n, isNPC:true}; }
  });
  currentItems.forEach(i => {
    const d = dist2(p, i); if(d < bd){ bd = d; best = {...i, isItem:true}; }
  });

  // Krb v hospodě – interakční zóna je větší a posunuta níž (krb je nahoře)
  if(gs.room === 'hospoda' && gs.cihalova_in_bag){
    const fp = ROOMS.hospoda.fireplace;
    const fx = fp.rx*canvas.width, fy = fp.ry*canvas.height + canvas.height*0.18;
    const fd = dist2(p, {x:fx, y:fy});
    if(fd < PROX_R * 1.7){ best = {isFireplace:true}; }
  }

  // Johnnyho vila v Křemži (přístupná během questu nebo po dokončení s klíči)
  if(gs.room === 'kremze'){
    const villaAccessible = (gs.story.johnny_took_jana && !gs.story.jana_rescued_villa && !gs.story.jana_drugged_villa) || gs.inv.klice_vila;
    if(villaAccessible && !gs.story.johnny_bedroom){
      const vx = canvas.width * 0.50, vy = canvas.height * 0.50;
      if(dist2(p, {x:vx, y:vy}) < PROX_R){ best = {isVilla:true}; }
    }
  }

  // Villa – dveře do koupelny
  if(gs.room === 'johnny_vila' && !gs.story.johnny_cuffed){
    const bx = canvas.width * 0.92, by = canvas.height * 0.35;
    if(dist2(p, {x:bx, y:by}) < PROX_R){
      if(gs.story.jana_in_bathroom_locked && !gs.story.bathroom_door_broken){
        best = {isVillaBathroomLocked:true};
      } else {
        best = {isVillaBathroom:true};
      }
    }
  }
  // Ložnice – dveře (pouze vizuální, ne skutečná místnost)
  if(gs.room === 'johnny_vila'){
    const lx = canvas.width * 0.08, ly = canvas.height * 0.35;
    if(dist2(p, {x:lx, y:ly}) < PROX_R){
      if(gs.story.johnny_bedroom){
        best = {isLozniceListen:true};
      } else {
        best = {isLoznice:true};
      }
    }
  }
  // Koupelna – šuplík (želízka)
  if(gs.room === 'koupelna' && !gs.story.koupelna_drawer_opened){
    const sdx = canvas.width * 0.50, sdy = canvas.height * 0.64;
    if(dist2(p, {x:sdx, y:sdy}) < PROX_R){ best = {isBathroomDrawer:true}; }
  }
  // Koupelna – hadr na topení
  if(gs.room === 'koupelna' && !gs.inv.hadr){
    const hrx = canvas.width * 0.89, hry = canvas.height * 0.35;
    if(dist2(p, {x:hrx, y:hry}) < PROX_R){ best = {isBathroomRag:true}; }
  }
  // Koupelna – umyvadlo
  if(gs.room === 'koupelna' && !gs.story.sink_used){
    const ux = canvas.width * 0.40, uy = canvas.height * 0.38;
    if(dist2(p, {x:ux, y:uy}) < PROX_R){ best = {isBathroomSink:true}; }
  }
  // Villa – šuplík u pohovky (prášek)
  if(gs.room === 'johnny_vila' && !gs.story.villa_powder_taken && !gs.story.johnny_cuffed){
    const drx = canvas.width * 0.23, dry = canvas.height * 0.75;
    if(dist2(p, {x:drx, y:dry}) < PROX_R){ best = {isVillaPowder:true}; }
  }
  // Johnny spoutaný – vzít klíče
  if(gs.room === 'johnny_vila' && gs.story.johnny_cuffed && !gs.inv.klice_vila){
    const jx = canvas.width * 0.65, jy = canvas.height * 0.55;
    if(dist2(p, {x:jx, y:jy}) < PROX_R * 1.5){ best = {isJohnnyKeys:true}; }
  }
  // Sad Johnny on couch – interakce
  if(gs.room === 'johnny_vila' && gs.story.johnny_sad_couch && !gs.story.johnny_roulette_done && !gs.story.johnny_dead){
    const jx = canvas.width * 0.28, jy = canvas.height * 0.60;
    if(dist2(p, {x:jx, y:jy}) < PROX_R * 1.5){
      best = {isNPC:true, ...NPCS.johnny_vila, id:'johnny_vila', x:jx, y:jy};
    }
  }
  // Sad Johnny – dveře z vily (trap)
  if(gs.room === 'johnny_vila' && gs.story.johnny_sad_tried_leave && !gs.story.johnny_knee_shot && !gs.story.johnny_monologue_over){
    const exitX = canvas.width * 0.5, exitY = canvas.height * 0.92;
    if(dist2(p, {x:exitX, y:exitY}) < PROX_R * 1.5){ best = {isVillaExitTrap:true}; }
  }
  // Stalking room door (po želízka path, po roulette)
  if(gs.room === 'johnny_vila' && gs.story.johnny_roulette_played && !gs.story.johnny_stalking_revealed){
    const sdx = canvas.width * 0.08, sdy = canvas.height * 0.55;
    if(dist2(p, {x:sdx, y:sdy}) < PROX_R * 1.2){ best = {isStalkingDoor:true}; }
  }

  // Regál mléka v Bille – tajný vchod
  if(gs.room === 'billa' && gs.story.sklep_unlocked && !gs.shelf_sliding){
    const mx = canvas.width * 0.63, my = canvas.height * 0.55;
    if(dist2(p, {x:mx, y:my}) < PROX_R * 1.5){ best = {isMilkShelf:true}; }
  }
  // Figurová sleduje – interakce u dveří sklepa
  if(gs.room === 'billa' && gs.story.figurova_following && !gs.story.figurova_at_door){
    const dx = canvas.width * 0.63, dy = canvas.height * 0.72;
    if(dist2(p, {x:dx, y:dy}) < PROX_R * 2) best = {isFigurovaDoor:true};
  }
  // Figurová pochroumána v sklepě
  if(gs.room === 'sklep' && gs.story.figurova_kicked && !gs.story.figurova_dead_sklep){
    const fx = canvas.width * 0.22, fy = canvas.height * 0.78;
    if(dist2(p, {x:fx, y:fy}) < PROX_R * 1.5) best = {isFigurovaSklep:true};
  }
  // Figurová leží po výboji propisky (učebna)
  if(gs.room === 'ucebna' && gs.story.figurova_propiska_kill){
    const fx = canvas.width * 0.50, fy = canvas.height * 0.68;
    if(dist2(p, {x:fx, y:fy}) < PROX_R * 1.5) best = {isFigurovaPropBody:true};
  }

  // Fábie na náměstí v Křemži
  if(gs.room === 'kremze' && (gs.inv.klice_fabie || gs.inv.klice_fabie_fig)){
    const fab = ROOMS.kremze.fabie;
    if(fab){
      const fx = canvas.width * fab.rx, fy = canvas.height * fab.ry;
      if(dist2(p, {x:fx, y:fy}) < PROX_R * 1.3){ best = {isFabie:true}; }
    }
  }

  // Kasička doma (na stolku vlevo)
  if(gs.room === 'doma' && !gs.kasicka_taken){
    const kx = canvas.width * 0.06 + canvas.width * 0.055, ky = canvas.height * 0.58 - 22;
    if(dist2(p, {x:kx, y:ky}) < PROX_R){ best = {isKasicka:true}; }
  }

  // Postel doma – masturbátor pod postelí
  if(gs.room === 'doma' && !gs.story.masturbator_found){
    const bpx = canvas.width * 0.80, bpy = canvas.height * 0.68;
    if(dist2(p, {x:bpx, y:bpy}) < PROX_R * 1.8){ best = {isBed:true}; }
  }

  // Dveře doma (exit ven)
  if(gs.room === 'doma'){
    const doorCX = canvas.width * 0.50, doorCY = canvas.height * 0.05;
    if(dist2(p, {x:doorCX, y:doorCY}) < PROX_R * 1.5){ best = {isDoor:true}; }
  }

  // Artefakty na bustách doma – zobrazuj proximity hint jen pro vzatelné
  if(gs.room === 'doma' && activeProfile){
    const acx = canvas.width * 0.42, acy = canvas.height * 0.38;
    const arx = Math.min(canvas.width * 0.22, 200), ary = Math.min(canvas.height * 0.20, 130);
    for(let i = 0; i < ART_KEYS_DISPLAY.length; i++){
      const key = ART_KEYS_DISPLAY[i];
      const unlocked = activeProfile.artifacts[key];
      const taken = gs.pregame_artifacts && gs.pregame_artifacts[key];
      const pickable = PICKABLE_ART_KEYS.has(key);
      if(unlocked && !taken){
        const angle = (i / ART_KEYS_DISPLAY.length) * Math.PI * 2 - Math.PI / 2;
        const ax = acx + Math.cos(angle) * arx;
        const ay = acy + Math.sin(angle) * ary;
        if(dist2(p, {x:ax, y:ay}) < PROX_R * 0.9){
          best = {isArtifact:true, artKey:key, artIndex:i, pickable};
          break;
        }
      }
    }
  }

  // Šamanova mrtvola – vzít hlavu
  if(gs.room === 'hospoda' && gs.saman_dead && gs.saman_death_anim && !gs.inv.saman_hlava){
    const sx = gs.saman_death_anim.x, sy = gs.saman_death_anim.y;
    if(dist2(p, {x:sx, y:sy}) < PROX_R){ best = {isSamanBody:true}; }
  }

  // Jana u krbu (po "Johnny je v pohodě")
  if(gs.room === 'hospoda' && gs.story.jana_at_johnny && !gs.story.johnny_took_jana && !gs.jana_to_fireplace_anim){
    const fp = ROOMS.hospoda.fireplace;
    const jx = fp.rx * canvas.width - 35;
    const jy = fp.ry * canvas.height + canvas.height * 0.30;
    if(dist2(p, {x:jx, y:jy}) < PROX_R){ best = {isJanaFireplace:true}; }
  }


  // Krb v hospodě – vstup do Cibulkovy laboratoře
  if(gs.room === 'hospoda' && gs.krb_open){
    const fp = ROOMS.hospoda.fireplace;
    const kx = fp.rx * canvas.width, ky = fp.ry * canvas.height + canvas.height * 0.16;
    if(dist2(p, {x:kx, y:ky}) < PROX_R * 1.5){ best = {isKrbEntry:true}; }
  }

  // Cibulkova laboratoř – návrat krbem (nahoře uprostřed)
  if(gs.room === 'cibulka_lab'){
    const krbX = canvas.width * 0.50, krbY = canvas.height * 0.45;
    if(dist2(p, {x:krbX, y:krbY}) < PROX_R * 1.3){ best = {isLabExit:true}; }
    // Šíša antidote
    if(gs.shisha_effects && !gs.shisha_cured && gs.story.shisha_antidote_quest){
      const ampX = canvas.width * 0.60, ampY = canvas.height * 0.72;
      if(dist2(p, {x:ampX, y:ampY}) < PROX_R * 1.3){ best = {isShishaAntidote:true}; }
    }
    // Šuplík
    const supX = canvas.width * 0.75 + canvas.width * 0.05, supY = canvas.height * 0.72 + canvas.height * 0.03;
    if(!gs.story.kgb_detector_from_lab && dist2(p, {x:supX, y:supY}) < PROX_R * 1.2){
      best = {isCibulkaSuplik:true};
    }
  }

  const ph = document.getElementById('prox');
  if(best){
    ph.classList.add('show');
    if(best.isVilla){
      document.getElementById('ptxt').textContent = 'Vstoupit do Johnnyho vily';
    } else if(best.isLozniceListen){
      document.getElementById('ptxt').textContent = 'Naslouchat u dveří';
    } else if(best.isLoznice){
      document.getElementById('ptxt').textContent = 'Ložnice (zamčeno)';
    } else if(best.isVillaDrawer){
      document.getElementById('ptxt').textContent = 'Prohledat šuplík';
    } else if(best.isVillaBathroom){
      document.getElementById('ptxt').textContent = 'Vstoupit do koupelny';
    } else if(best.isVillaBathroomLocked){
      document.getElementById('ptxt').textContent = '🔒 Koupelna zamčená – Jana je uvnitř';
    } else if(best.isVillaPowder){
      document.getElementById('ptxt').textContent = 'Prohledat šuplík u pohovky';
    } else if(best.isBathroomRag){
      document.getElementById('ptxt').textContent = 'Vzít hadr z topení';
    } else if(best.isBathroomDrawer){
      document.getElementById('ptxt').textContent = 'Otevřít šuplík';
    } else if(best.isBathroomSink){
      document.getElementById('ptxt').textContent = 'Pustit vodu';
    } else if(best.isJohnnyKeys){
      document.getElementById('ptxt').textContent = 'Vzít klíče od Johnnyho';
    } else if(best.isVillaExitTrap){
      document.getElementById('ptxt').textContent = '[E] Odejít z vily';
    } else if(best.isStalkingDoor){
      document.getElementById('ptxt').textContent = '🚪 Otevřít tajné dveře';
    } else if(best.isFireplace){
      document.getElementById('ptxt').textContent = 'Hodit Číhalovou do krbu';
    } else if(best.isFigurovaDoor){
      document.getElementById('ptxt').textContent = 'Zastavit se u průchodu do sklepa';
    } else if(best.isFigurovaSklep){
      document.getElementById('ptxt').textContent = 'Promluvit s Figurovou';
    } else if(best.isFigurovaPropBody){
      document.getElementById('ptxt').textContent = 'Figurová... ⚡';
    } else if(best.isMilkShelf){
      document.getElementById('ptxt').textContent = gs.story.shelf_open ? 'Sestoupit do sklepa' : 'Otevřít průchod';
    } else if(best.isFabie){
      document.getElementById('ptxt').textContent = 'Nastartovat Fábii a jet domů!';
    } else if(best.isKasicka){
      document.getElementById('ptxt').textContent = 'Vybrat kasičku (100 Kč)';
    } else if(best.isBed){
      document.getElementById('ptxt').textContent = 'Prohledat pod postelí';
    } else if(best.isDoor){
      document.getElementById('ptxt').textContent = 'Otevřít dveře – jít ven';
    } else if(best.isArtifact){
      const artNames = {c2_cert:'C2 Cert.',milan_phone:'Tel. Milan',podprsenka:'Janina podprsenka',klice_vila:'Klíče od vily',klice_fabie:'Fábie',saman_hlava:'Šam. hlava',maturita:'Maturita',foto_figurova:'Fotka Fig.',membership_vaza:'Vaza Systems',webovky:'Webovky',kgb_detector:'KGB Detektor',klic_supliku:'Klíček od šuplíku'};
      const nm = artNames[best.artKey] || best.artKey;
      document.getElementById('ptxt').textContent = best.pickable ? ('Vzít ' + nm) : ('🔒 ' + nm + ' (nelze vzít)');
    } else if(best.isSamanBody){
      document.getElementById('ptxt').textContent = 'Vzít šamanovu hlavu';
    } else if(best.isJanaFireplace){
      document.getElementById('ptxt').textContent = 'Mluvit s Janou';
    } else if(best.isKrbEntry){
      document.getElementById('ptxt').textContent = '🔬 Vstoupit do Cibulkovy laboratoře';
    } else if(best.isLabExit){
      document.getElementById('ptxt').textContent = '🔥 Zpět do hospody';
    } else if(best.isShishaAntidote){
      document.getElementById('ptxt').textContent = '💚 Vzít zelenou ampulku (protilék)';
    } else if(best.isCibulkaSuplik){
      document.getElementById('ptxt').textContent = gs.inv.klic_supliku ? '🗝️ Otevřít šuplík klíčkem' : '🔒 Šuplík (potřebuješ klíček)';
    } else if(best.isItem){
      document.getElementById('ptxt').textContent = best.type === 'kratom' ? 'Sebrat kratom' : 'Sebrat pizza žemli';
    } else {
      document.getElementById('ptxt').textContent = `Mluvit s ${best.name}`;
    }
  } else {
    ph.classList.remove('show');
  }
}

// ─── Interakce (klávesa E) ────────────────────────────────────────────────

function interact(){
  // Cibulkova laboratoř – šuplík (klíček od Páji)
  // Cibulkova laboratoř – šíša protilék (zelená ampulka)
  if(gs.room === 'cibulka_lab' && gs.shisha_effects && !gs.shisha_cured && gs.story.shisha_antidote_quest){
    const ampX = canvas.width * 0.60, ampY = canvas.height * 0.72;
    if(dist2(gs.player, {x:ampX, y:ampY}) < PROX_R * 1.3){
      gs.shisha_cured = true;
      gs.shisha_effects = false;
      gs.shisha_deadline = 0;
      addLog('*Otevřeš šuplík pod monitorem. Uvnitř je zelená ampulka s nápisem "АНТИДОТ".*', 'lm');
      setTimeout(() => {
        addLog('*Rozlomíš ampulku a spolkneš obsah. Chuť je odporná, ale po pár sekundách se svět zaostří.*', 'lm');
        screenShake(200);
        fnotif('💚 Protilék zaúčinkoval!', 'pos');
        gainRep(5, 'Přežil otravu Milanovou šíšou');
      }, 800);
      return;
    }
  }
  if(gs.room === 'cibulka_lab' && !gs.story.kgb_detector_from_lab){
    const supX = canvas.width * 0.75 + canvas.width * 0.05, supY = canvas.height * 0.72 + canvas.height * 0.03;
    if(dist2(gs.player, {x:supX, y:supY}) < PROX_R * 1.2){
      if(!gs.inv.klic_supliku){
        addLog('🔒 Šuplík je zamčený. Potřebuješ klíček.', 'lw');
        return;
      }
      gs.story.kgb_detector_from_lab = true;
      gs.inv.kgb_detector = 1;
      gs.inv.klic_supliku = 0;
      updateInv();
      addLog('*Otočíš klíčkem v zámku. Šuplík povolí.* 🗝️', 'lm');
      setTimeout(() => {
        addLog('Uvnitř leží KGB Detektor. Cibulkův mistrovský kus. Bereš ho.', 'lm');
        fnotif('🔍 KGB Detektor!', 'itm');
        if(activeProfile){ activeProfile.artifacts.kgb_detector = true; }
      }, 600);
      return;
    }
  }
  // Ložnice dveře – naslouchání
  if(gs.room === 'johnny_vila'){
    const lx = canvas.width * 0.08, ly = canvas.height * 0.35;
    if(dist2(gs.player, {x:lx, y:ly}) < PROX_R){
      if(gs.story.johnny_bedroom){
        addLog('*Přiložíš ucho ke dveřím...*', 'ls');
        setTimeout(() => addLog('"Ahhh... AHHH..." *hlasité vzdychání Johnnyho za dveřmi*', 'lw'), 800);
        setTimeout(() => addLog('*Bylo ti jasné, že tam nemáš co dělat.*', 'ls'), 2000);
        return;
      } else {
        addLog('Dveře do ložnice. Zamčeno.', 'ls');
        return;
      }
    }
  }
  // Johnnyho vila – vstup v Křemži (quest nebo klíče)
  if(gs.room === 'kremze'){
    const villaAccessible = (gs.story.johnny_took_jana && !gs.story.jana_rescued_villa && !gs.story.jana_drugged_villa) || gs.inv.klice_vila;
    if(villaAccessible && !gs.story.johnny_bedroom){
      const vx = canvas.width * 0.50, vy = canvas.height * 0.50;
      if(dist2(gs.player, {x:vx, y:vy}) < PROX_R){
        // Návrat po získání odměn – return visit
        if(gs.story.johnny_villa_rewards && gs.story.johnny_return_left && !gs.story.johnny_return_visit){
          gs.story.johnny_return_visit = true;
          gs.johnny_stay_deadline = gs.ts + 20000; // 20s timer
        }
        // Webovky hotové – vrátil se po požádání
        if(gs.story.johnny_webovka_asked && gs.story.johnny_return_left && !gs.story.johnny_webovka_ready && !gs.story.johnny_webovka_done){
          gs.story.johnny_webovka_ready = true;
          addLog('Johnny ti mává od gauče. Vypadá to, že webovky jsou hotové.', 'lm');
        }
        // Návrat po varování – Johnny a Jana v ložnici
        if(gs.story.johnny_return_visit && gs.story.johnny_return_left && gs.johnny_stay_deadline === 0){
          gs.story.johnny_bedroom = true;
          addLog('Johnnyho vila je tichá. Johnny s Janou nejsou v obýváku.', 'ls');
        }
        // Návrat po vytopení – smutný Johnny
        if(gs.story.jana_escaped_success && !gs.story.johnny_sad_couch && !gs.story.johnny_dead){
          gs.story.johnny_sad_couch = true;
          if(gs.story.leg_shot){
            addLog('*Vila je tichá. Všude díry od zbraně. Johnny sedí sám na gauči.* Kulháš dovnitř – noha stále bolí.', 'lw');
          } else {
            addLog('*Vila je tichá. Všude díry od zbraně. Johnny sedí sám na gauči.*', 'lw');
          }
        }
        gs.room = 'johnny_vila'; initRoom(canvas.width * 0.5, canvas.height * 0.7);
        // Šíša – povinná při prvním vstupu
        if(!gs.story.shisha_smoked && !gs.story.jana_escaped_success && !gs.story.johnny_dead){
          gs.story.shisha_smoked = true;
          gs.cutscene_active = true;
          setTimeout(() => {
            showNPCLine('johnny_vila', '"Hrubeši! Sedni si. Dáme si šíšu." *Johnny vytáhne pochybnou dýmku* "Tohle je Johnnyho divná šíša. Milan mi ji sehnal. Dva tahy a jsi v ráji."', () => {
              addLog('*Natáhneš se k dýmce a potáhneš. Dým je hustý a sladce pálí v krku.*', 'lm');
              setTimeout(() => {
                addLog('*Druhý potah. Svět se trochu roztřese...*', 'lm');
                screenShake(200);
                setTimeout(() => {
                  showNPCLine('johnny_vila', '"Vidíš? Ráj. Milan říkal, že to je z Thajska. Nebo z garáže. Kdo ví." *zasmání*', () => {
                    gs.cutscene_active = false;
                    addLog('Šíša má divnou příchuť. Asi to přejde...', 'ls');
                  });
                }, 800);
              }, 1200);
            });
          }, 600);
        }
        // Při návratu start 20s timer
        if(gs.story.johnny_return_visit && !gs.story.johnny_bedroom && gs.johnny_stay_deadline === 0){
          gs.johnny_stay_deadline = gs.ts + 20000;
        }
        return;
      }
    }
  }
  // Villa – dveře do koupelny
  if(gs.room === 'johnny_vila' && !gs.story.johnny_cuffed){
    const bx = canvas.width * 0.92, by = canvas.height * 0.35;
    if(dist2(gs.player, {x:bx, y:by}) < PROX_R){
      if(gs.story.jana_in_bathroom_locked && !gs.story.bathroom_door_broken){
        addLog('🔒 Koupelna zamčená zevnitř. Jana je tam.', 'lw');
        return;
      }
      // Pokud Johnny právě vtrhl do koupelny – spustit gun scene
      if(gs.story.johnny_in_bathroom && !gs.story.gun_scene_done){
        gs.room = 'koupelna'; initRoom(canvas.width * 0.5, canvas.height * 0.7);
        setTimeout(() => triggerJohnnyGunScene(), 600);
        return;
      }
      gs.room = 'koupelna'; initRoom(canvas.width * 0.5, canvas.height * 0.7); return;
    }
  }
  // Villa – šuplík u pohovky (prášek pro Janin drink)
  if(gs.room === 'johnny_vila' && !gs.story.villa_powder_taken && !gs.story.johnny_cuffed){
    const drx = canvas.width * 0.23, dry = canvas.height * 0.75;
    if(dist2(gs.player, {x:drx, y:dry}) < PROX_R){
      gs.story.villa_powder_taken = true;
      gs.inv.prasek = 1; updateInv();
      addLog('V šuplíku u pohovky jsi našel sáček s bílým práškem. Tohle by mohlo Janu uspat.', 'lw');
      fnotif('💊 Prášek','itm'); return;
    }
  }
  // Koupelna – hadr na topení
  if(gs.room === 'koupelna' && !gs.inv.hadr){
    const hrx = canvas.width * 0.89, hry = canvas.height * 0.35;
    if(dist2(gs.player, {x:hrx, y:hry}) < PROX_R){
      gs.inv.hadr = 1; updateInv();
      showPlayerLine('*Stáhneš mokrý hadr z topení.* Ještě teplý. K něčemu se hodí.');
      fnotif('🧻 Hadr','itm'); return;
    }
  }
  // Koupelna – šuplík
  if(gs.room === 'koupelna' && !gs.story.koupelna_drawer_opened){
    const sdx = canvas.width * 0.50, sdy = canvas.height * 0.64;
    if(dist2(gs.player, {x:sdx, y:sdy}) < PROX_R){ runQF('q_koupelna_drawer'); return; }
  }
  // Koupelna – umyvadlo
  if(gs.room === 'koupelna' && !gs.story.sink_used){
    const ux = canvas.width * 0.40, uy = canvas.height * 0.38;
    if(dist2(gs.player, {x:ux, y:uy}) < PROX_R){ runQF('q_koupelna_sink'); return; }
  }
  // Johnny spoutaný – vzít klíče pomocí E
  if(gs.room === 'johnny_vila' && gs.story.johnny_cuffed && !gs.inv.klice_vila){
    const jx = canvas.width * 0.65, jy = canvas.height * 0.55;
    if(dist2(gs.player, {x:jx, y:jy}) < PROX_R * 1.5){
      gs.inv.klice_vila = 1; updateInv();
      addLog('Vzal jsi Johnnymu klíče od baráku. Nemůže se bránit.', 'lw');
      fnotif('🔑 Klíče od vily','itm'); return;
    }
  }

  // Villa exit trap – Johnny střílí do kolene
  if(gs.room === 'johnny_vila' && gs.story.johnny_sad_tried_leave && !gs.story.johnny_knee_shot && !gs.story.johnny_monologue_over){
    const exitX = canvas.width * 0.5, exitY = canvas.height * 0.92;
    if(dist2(gs.player, {x:exitX, y:exitY}) < PROX_R * 1.5){
      runQF('q_johnny_knee_shot'); return;
    }
  }
  // Stalking door
  if(gs.room === 'johnny_vila' && gs.story.johnny_roulette_played && !gs.story.johnny_stalking_revealed){
    const sdx = canvas.width * 0.08, sdy = canvas.height * 0.55;
    if(dist2(gs.player, {x:sdx, y:sdy}) < PROX_R * 1.2){
      gs.story.johnny_stalking_revealed = true;
      addLog('*Otevřeš dveře, které tu předtím nebyly...*', 'lw');
      fnotif('🚪 Tajné dveře!', 'rep');
      // Johnny NPC se přesune do stalking roomu
      const johnny = currentNPCs.find(n => n.id === 'johnny_vila');
      if(johnny) showDialog(johnny);
      return;
    }
  }

  // Figurová sleduje – zastavit u dveří sklepa
  if(gs.room === 'billa' && gs.story.figurova_following && !gs.story.figurova_at_door){
    const dx = canvas.width * 0.63, dy = canvas.height * 0.72;
    if(dist2(gs.player, {x:dx, y:dy}) < PROX_R * 2){ runQF('q_figurova_arrive_door'); return; }
  }
  // Figurová váhá u průchodu – znovu zobrazit volbu (i po "Nechat ji, ať se rozmyslí")
  if(gs.room === 'billa' && gs.story.figurova_at_door && !gs.story.figurova_kicked){
    const fig = currentNPCs.find(n => n.id === 'figurova');
    if(fig && dist2(gs.player, {x:fig.x, y:fig.y}) < PROX_R * 1.5){
      if(document.getElementById('dov').classList.contains('on')) return;
      QF._figurova_door_choices(); return;
    }
  }
  // Figurová leží v učebně – výboj propisky
  if(gs.room === 'ucebna' && gs.story.figurova_propiska_kill){
    const fx = canvas.width * 0.50, fy = canvas.height * 0.68;
    if(dist2(gs.player, {x:fx, y:fy}) < PROX_R * 1.5){
      addLog('⚡ *bzzzt*', 'lw');
      setTimeout(() => addLog('...', 'ls'), 500);
      return;
    }
  }
  // Figurová pochroumána v sklepě – promluvit
  if(gs.room === 'sklep' && gs.story.figurova_kicked && !gs.story.figurova_dead_sklep && !gs.story.figurova_plea_done){
    const fx = canvas.width * 0.22, fy = canvas.height * 0.78;
    if(dist2(gs.player, {x:fx, y:fy}) < PROX_R * 1.5){ runQF('q_figurova_sklep_plea'); return; }
  }

  // Regál mléka – tajný vchod do sklepa (zablokováno pokud Figurová sleduje)
  if(gs.room === 'billa' && gs.story.sklep_unlocked && !gs.shelf_sliding && !gs.story.figurova_following){
    const mx = canvas.width * 0.63, my = canvas.height * 0.55;
    if(dist2(gs.player, {x:mx, y:my}) < PROX_R * 1.5){
      if(gs.story.shelf_open){
        gs.room = 'sklep'; initRoom(canvas.width * 0.5, canvas.height * 0.12); return;
      } else {
        gs.shelf_sliding = true; gs.shelf_anim = 0;
        addLog('Regál se pomalu šoupá doprava...', 'ls'); return;
      }
    }
  }

  // Krb – interakční zóna níž a větší
  if(gs.room === 'hospoda' && gs.cihalova_in_bag){
    const fp = ROOMS.hospoda.fireplace;
    const fx = fp.rx*canvas.width, fy = fp.ry*canvas.height + canvas.height*0.18;
    if(dist2(gs.player, {x:fx, y:fy}) < PROX_R * 1.7){
      burnCihalova(); return;
    }
  }

  // Fábie – nastartovat a jet domů
  if(gs.room === 'kremze' && (gs.inv.klice_fabie || gs.inv.klice_fabie_fig)){
    const fab = ROOMS.kremze.fabie;
    if(fab){
      const fx = canvas.width * fab.rx, fy = canvas.height * fab.ry;
      if(dist2(gs.player, {x:fx, y:fy}) < PROX_R * 1.3){
        runQF('q_fabie_drive'); return;
      }
    }
  }

  // Kasička doma (na stolku vlevo)
  if(gs.room === 'doma' && !gs.kasicka_taken){
    const kx = canvas.width * 0.06 + canvas.width * 0.055, ky = canvas.height * 0.58 - 22;
    if(dist2(gs.player, {x:kx, y:ky}) < PROX_R){
      runQF('q_kasicka'); return;
    }
  }

  // Postel doma – masturbátor pod postelí
  if(gs.room === 'doma' && !gs.story.masturbator_found){
    const bpx = canvas.width * 0.80, bpy = canvas.height * 0.68;
    if(dist2(gs.player, {x:bpx, y:bpy}) < PROX_R * 1.8){
      gs.story.masturbator_found = true;
      gs.inv.masturbator = 1;
      gs.energy = Math.min(100, gs.energy + 100);
      updateInv(); updateHUD();
      const mSlot = document.getElementById('sl-masturbator');
      if(mSlot) mSlot.style.display = '';
      return;
    }
  }

  // Dveře doma – potvrzovací dialog
  if(gs.room === 'doma'){
    const doorCX = canvas.width * 0.50, doorCY = canvas.height * 0.05;
    if(dist2(gs.player, {x:doorCX, y:doorCY}) < PROX_R * 1.5){
      document.getElementById('dav').textContent   = '🚪';
      document.getElementById('dname').textContent = 'DVEŘE';
      document.getElementById('drole').textContent = 'východ ven';
      document.getElementById('dtxt').textContent  = 'Jsem připraven na nový den?';
      document.getElementById('dchoices').innerHTML =
        `<button class="db prim" onclick="closeDialog();changeRoom('up')">To si piš!</button>` +
        `<button class="db" onclick="closeDialog()">Ještě ne</button>`;
      document.getElementById('dov').classList.add('on');
      return;
    }
  }

  // Artefakty na bustách doma – pouze vzatelné lze přenést do hry
  if(gs.room === 'doma' && activeProfile){
    const acx = canvas.width * 0.42, acy = canvas.height * 0.38;
    const arx = Math.min(canvas.width * 0.22, 200), ary = Math.min(canvas.height * 0.20, 130);
    for(let i = 0; i < ART_KEYS_DISPLAY.length; i++){
      const key = ART_KEYS_DISPLAY[i];
      const unlocked = activeProfile.artifacts[key];
      const taken = gs.pregame_artifacts && gs.pregame_artifacts[key];
      if(unlocked && !taken){
        const angle = (i / ART_KEYS_DISPLAY.length) * Math.PI * 2 - Math.PI / 2;
        const ax = acx + Math.cos(angle) * arx;
        const ay = acy + Math.sin(angle) * ary;
        if(dist2(gs.player, {x:ax, y:ay}) < PROX_R * 0.9){
          // Nevzatelné artefakty – jen trofej, jednorázová hláška
          if(!PICKABLE_ART_KEYS.has(key)){
            const artNames = {c2_cert:'C2 Certifikát',klice_vila:'Klíče od vily',klice_fabie:'Klíčky Fábie',webovky:'Webovky',kgb_detector:'KGB Detektor'};
            addLog(`🔒 ${artNames[key] || key} – tenhle artefakt si do hry vzít nemůžeš.`, 'ls');
            return;
          }
          gs.pregame_artifacts[key] = true;
          // Přenést artefakt do inventáře
          const artNames = {milan_phone:'Telefon Milana',podprsenka:'Podprsenka',saman_hlava:'Šamanova hlava',maturita:'Maturita',foto_figurova:'Fotka Figurové',membership_vaza:'Členská karta Vaza',klic_supliku:'Klíček od šuplíku'};
          if(gs.inv[key] !== undefined){
            gs.inv[key] = 1;
          }
          updateInv();
          addLog(`Sebral jsi artefakt: ${artNames[key] || key}`, 'lm');
          fnotif('Artefakt sebrán!', 'itm');
          return;
        }
      }
    }
  }

  // Vstup do Cibulkovy laboratoře (krb v hospodě, otevřený)
  if(gs.room === 'hospoda' && gs.krb_open){
    const fp = ROOMS.hospoda.fireplace;
    const kx = fp.rx * canvas.width, ky = fp.ry * canvas.height + canvas.height * 0.16;
    if(dist2(gs.player, {x:kx, y:ky}) < PROX_R * 1.5){
      gs.room = 'cibulka_lab';
      initRoom(canvas.width * 0.50, canvas.height * 0.55);
      addLog('*Projdeš plameny. Cítíš jen chlad. Vstoupil jsi do tajné laboratoře.*', 'lm');
      return;
    }
  }

  // Návrat z laboratoře krbem
  if(gs.room === 'cibulka_lab'){
    const krbX = canvas.width * 0.50, krbY = canvas.height * 0.45;
    if(dist2(gs.player, {x:krbX, y:krbY}) < PROX_R * 1.3){
      gs.room = 'hospoda';
      const fp = ROOMS.hospoda.fireplace;
      initRoom(fp.rx * canvas.width, fp.ry * canvas.height + canvas.height * 0.30);
      return;
    }
  }

  // Jana u krbu (po "Johnny je v pohodě") – mluvit s ní
  if(gs.room === 'hospoda' && gs.story.jana_at_johnny && !gs.story.johnny_took_jana && !gs.jana_to_fireplace_anim){
    const fp = ROOMS.hospoda.fireplace;
    const jx = fp.rx * canvas.width - 35;
    const jy = fp.ry * canvas.height + canvas.height * 0.30;
    if(dist2(gs.player, {x:jx, y:jy}) < PROX_R){
      const janaNPC = NPCS['jana_kosova'];
      if(janaNPC) showDialog({...janaNPC, id:'jana_kosova'});
      return;
    }
  }

  // Sklenice na stole ve villce – vrátit
  if(gs.room === 'johnny_vila' && gs.inv.sklenice_jana && gs.story.jana_at_toilet){
    const tx = canvas.width * 0.50, ty = canvas.height * 0.62;
    if(dist2(gs.player, {x:tx, y:ty}) < PROX_R * 1.2){
      runQF('q_return_glass_to_table');
      return;
    }
  }

  // Šamanova mrtvola – vzít hlavu
  if(gs.room === 'hospoda' && gs.saman_dead && gs.saman_death_anim && !gs.inv.saman_hlava){
    const sx = gs.saman_death_anim.x, sy = gs.saman_death_anim.y;
    if(dist2(gs.player, {x:sx, y:sy}) < PROX_R){
      runQF('q_saman_pickup_head'); return;
    }
  }

  for(let i = currentItems.length - 1; i >= 0; i--){
    const it = currentItems[i];
    if(dist2(gs.player, it) < PROX_R){
      if(it.type === 'kratom'){
        gs.inv.kratom += 10; updateInv();
        addLog('Sebral jsi kratom! (+10g) 🌿', 'ls'); fnotif('+10g 🌿', 'itm');
      } else {
        gs.inv.zemle++; updateInv();
        addLog('Sebral jsi pizza žemli! 🍕', 'ls'); fnotif('+1 🍕', 'itm');
      }
      currentItems.splice(i, 1); updateHUD(); return;
    }
  }

  for(const n of currentNPCs){
    if(dist2(gs.player, {x:n.x, y:n.y}) < PROX_R){
      if(document.getElementById('dov').classList.contains('on')) return;
      if(n.id === 'cihalova' && gs.cihalova_collapsed){
        pickupCihalova(); return;
      }
      showDialog(n); return;
    }
  }
}

// ─── Update (logika) ──────────────────────────────────────────────────────

function update(dt){
  gs.ts += dt;
  const p = gs.player;

  // Room transition fade decay
  if(gs.roomFadeAlpha > 0) gs.roomFadeAlpha = Math.max(0, gs.roomFadeAlpha - dt * 0.003);

  // Figurová sleduje hráče
  if(gs.story.figurova_following && !gs.story.figurova_at_door){
    const fig = currentNPCs.find(n => n.id === 'figurova');
    if(fig){
      const dx = p.x - fig.x, dy = p.y - fig.y;
      const d = Math.hypot(dx, dy);
      if(d > 65){
        const spd = 2.6 * dt / FRAME_MS;
        fig.x += (dx / d) * spd;
        fig.y += (dy / d) * spd;
      }
    }
  }

  // ── Jana × Johnny revamp animace ────────────────────────────
  // Jana jde ke krbu (po "Johnny je v pohodě")
  if(gs.jana_to_fireplace_anim && gs.room === 'hospoda'){
    const a = gs.jana_to_fireplace_anim;
    if(a.phase === 'walking'){
      const dx = a.targetX - a.x, dy = a.targetY - a.y;
      const d = Math.hypot(dx, dy);
      if(d > 4){
        if(!a.startDist) a.startDist = d;
        const progress = 1 - d / a.startDist;
        const ease = progress < 0.3 ? progress / 0.3 : (progress > 0.7 ? (1 - progress) / 0.3 : 1);
        const spd = 2.6 * Math.max(0.3, ease) * dt / FRAME_MS;
        a.x += (dx / d) * spd;
        a.y += (dy / d) * spd;
        a.flipX = dx < 0 ? -1 : 1;
      } else {
        a.phase = 'arrived';
        gs.jana_to_fireplace_anim = null;
      }
    }
  }
  // Jana jde do koupelny ve ville
  if(gs.jana_to_bathroom_anim && gs.room === 'johnny_vila'){
    const a = gs.jana_to_bathroom_anim;
    if(a.phase === 'walking'){
      const dx = a.targetX - a.x, dy = a.targetY - a.y;
      const d = Math.hypot(dx, dy);
      if(d > 4){
        if(!a.startDist) a.startDist = d;
        const progress = 1 - d / a.startDist;
        const ease = progress < 0.3 ? progress / 0.3 : (progress > 0.7 ? (1 - progress) / 0.3 : 1);
        const spd = 2.8 * Math.max(0.3, ease) * dt / FRAME_MS;
        a.x += (dx / d) * spd;
        a.y += (dy / d) * spd;
        a.flipX = dx < 0 ? -1 : 1;
      } else {
        a.phase = 'arrived';
      }
    }
  }
  // Jana jde na WC ve ville (drink path)
  if(gs.jana_to_toilet_anim && gs.room === 'johnny_vila'){
    const a = gs.jana_to_toilet_anim;
    const dx = a.targetX - a.x, dy = a.targetY - a.y;
    const d = Math.hypot(dx, dy);
    if(a.phase === 'walking'){
      if(d > 4){
        if(!a.startDist) a.startDist = d;
        const progress = 1 - d / a.startDist;
        const ease = progress < 0.3 ? progress / 0.3 : (progress > 0.7 ? (1 - progress) / 0.3 : 1);
        const spd = 2.5 * Math.max(0.3, ease) * dt / FRAME_MS;
        a.x += (dx / d) * spd; a.y += (dy / d) * spd;
        a.flipX = dx < 0 ? -1 : 1;
      } else {
        a.phase = 'in_toilet';
      }
    }
    if(a.phase === 'in_toilet' && gs.ts >= a.returnAt){
      a.phase = 'returning';
      a.targetX = canvas.width * 0.55;
      a.targetY = canvas.height * 0.60;
      a.startDist = 0;
    }
    if(a.phase === 'returning'){
      if(d > 4){
        if(!a.startDist) a.startDist = d;
        const progress = 1 - d / a.startDist;
        const ease = progress < 0.3 ? progress / 0.3 : (progress > 0.7 ? (1 - progress) / 0.3 : 1);
        const spd = 2.5 * Math.max(0.3, ease) * dt / FRAME_MS;
        a.x += (dx / d) * spd; a.y += (dy / d) * spd;
        a.flipX = dx < 0 ? -1 : 1;
      } else {
        // Návrat dokončen – Jana zase do currentNPCs jako jana_vila
        gs.story.jana_at_toilet = false;
        const jvNPC = NPCS['jana_vila'];
        if(jvNPC && !currentNPCs.find(n => n.id === 'jana_vila')){
          currentNPCs.push({...jvNPC, id:'jana_vila', x:a.x, y:a.y, bob:0, bobDir:1});
        }
        gs.jana_to_toilet_anim = null;
        // Pokud je drink otrávený a vrácený → Jana se napije
        if(gs.story.drink_drugged && !gs.inv.sklenice_jana && !gs.story.jana_drank_potion){
          setTimeout(() => triggerJanaDrinksPotion(), 1500);
        }
      }
    }
  }
  // Bathroom flood progres (kaluž se rozlévá pod dveřmi do villa místnosti)
  if(gs.bathroom_flood_anim && gs.room === 'johnny_vila'){
    const f = gs.bathroom_flood_anim;
    f.progress = Math.min(1, f.progress + (dt / 1000) * 0.14);
    if(!f.johnnyBroke && f.progress > 0.6){
      f.johnnyBroke = true;
      gs.story.bathroom_door_broken = true;
      showNPCLine('johnny_vila', '"CO TO SAKRA...?!" *Johnny vstane ze sedačky a míří ke koupelně.*', () => {
        screenShake(600);
        const splinters = [];
        for(let i=0;i<30;i++){
          const big = i < 4;
          splinters.push({
            t0: gs.ts, x: canvas.width*0.5 + (Math.random()-0.5)*canvas.width*0.12,
            y: canvas.height*0.84 + Math.random()*canvas.height*0.02,
            vx: (Math.random()-0.5)*(big ? 300 : 180),
            vy: -60 - Math.random()*(big ? 250 : 160),
            rot: Math.random()*Math.PI*2, rotV: (Math.random()-0.5)*10,
            w: big ? 12+Math.random()*18 : 3+Math.random()*10,
            h: big ? 4+Math.random()*8 : 2+Math.random()*4,
            life: 0.8 + Math.random()*0.8,
            col: ['#5a3a50','#4a2a40','#6a4060','#7a5070','#3a1a30','#8a6078'][Math.floor(Math.random()*6)]
          });
        }
        gs.door_kick_anim = { t0: gs.ts, splinters };
        gs.story.johnny_in_bathroom = true;
        currentNPCs = currentNPCs.filter(n => n.id !== 'johnny_vila');
        showNPCLine('johnny_vila', '💥 *Johnny vykopl dveře koupelny!* Rána otřásla celou místností. Vejdi za ním nebo uteč z vily!', () => {
          fnotif('🚪 Koupelna – vstoupit?', 'rep');
        });
      });
    }
  }
  // Johnny chase – sleduje hráče ve vile během útěku
  if(gs.jana_escape_deadline && gs.room === 'johnny_vila' && !gs.story.jana_escape_failed){
    if(!gs.johnny_chase_pos){
      gs.johnny_chase_pos = { x: canvas.width*0.88, y: canvas.height*0.42 };
    }
    const jc = gs.johnny_chase_pos;
    const dx2 = gs.player.x - jc.x, dy2 = gs.player.y - jc.y;
    const dist3 = Math.sqrt(dx2*dx2+dy2*dy2);
    if(dist3 > 5){
      const chaseSpd = 2.2 * dt / 16.67; // pomalejší – hráč kulhá ale stihne utéct
      jc.x += (dx2/dist3)*chaseSpd;
      jc.y += (dy2/dist3)*chaseSpd;
    }
  }
  // Escape timer – Jana utíká, hráč musí dostat ven z vily
  if(gs.jana_escape_deadline && gs.ts > gs.jana_escape_deadline && !gs.story.jana_escape_failed){
    gs.story.jana_escape_failed = true;
    gs.jana_escape_deadline = 0;
    gs.johnny_chase_pos = null;
    if(gs.room === 'johnny_vila' || gs.room === 'koupelna'){
      triggerJohnnyKillAnim();
    }
  }
  // Katana animace (Jana zabíjí hráče)
  if(gs.jana_katana_anim){
    const a = gs.jana_katana_anim;
    a.t = gs.ts - a.t0;
    // Fáze řízeny v triggerJanaKatanaKill (setTimeout chain)
  }
  // Player cuts (po katana hit)
  if(gs.player_cuts_anim){
    const c = gs.player_cuts_anim;
    const elapsed = (gs.ts - c.startTime) / 1000;
    if(c.parts && c.parts.length){
      c.parts.forEach(p => {
        p.x += p.vx * dt / FRAME_MS;
        p.y += p.vy * dt / FRAME_MS;
        p.vy += 0.4 * dt / FRAME_MS; // gravitace
      });
    }
    c.bloodPool = Math.min(1, elapsed / 3);
  }

  // Šaman jde ke krbu (Cibulkův příkaz)
  if(gs.saman_to_krb && gs.room === 'hospoda' && gs.saman_to_krb.phase === 'walking'){
    const a = gs.saman_to_krb;
    const dx = a.targetX - a.x, dy = a.targetY - a.y;
    const d = Math.hypot(dx, dy);
    if(d > 4){
      if(!a.startDist) a.startDist = d;
      const progress = 1 - d / a.startDist;
      const ease = progress < 0.3 ? progress / 0.3 : (progress > 0.7 ? (1 - progress) / 0.3 : 1);
      const spd = 3.8 * Math.max(0.3, ease) * dt / FRAME_MS;
      a.x += (dx / d) * spd;
      a.y += (dy / d) * spd;
      a.flipX = dx < 0 ? -1 : 1;
    }
  }

  // Šaman OBÍDEK – pobíhá nahý po hospodě
  if(gs.saman_naked_anim && gs.room === 'hospoda' && gs.saman_naked_anim.phase === 'running'){
    const a = gs.saman_naked_anim;
    const W = canvas.width, H = canvas.height;
    const k = dt / FRAME_MS;
    a.x += a.vx * k;
    a.y += a.vy * k;
    // odraz od krajů místnosti (zhruba podlaha hospody)
    const ml = 60, mr = W - 60, mt = H * 0.32, mb = H * 0.86;
    if(a.x < ml){ a.x = ml; a.vx = Math.abs(a.vx); a.flipX = 1; }
    if(a.x > mr){ a.x = mr; a.vx = -Math.abs(a.vx); a.flipX = -1; }
    if(a.y < mt){ a.y = mt; a.vy = Math.abs(a.vy); }
    if(a.y > mb){ a.y = mb; a.vy = -Math.abs(a.vy); }
    // občas chaotická změna směru
    if(Math.random() < 0.025){
      const ang = Math.random() * Math.PI * 2;
      a.vx = Math.cos(ang) * 5.5;
      a.vy = Math.sin(ang) * 3.5;
      a.flipX = a.vx >= 0 ? 1 : -1;
    }
  }

  // Animace posouváni regálu mléka
  if(gs.shelf_sliding){
    gs.shelf_anim = Math.min(1, gs.shelf_anim + dt / 1200);
    if(gs.shelf_anim >= 1){
      gs.shelf_sliding = false; gs.story.shelf_open = true;
      addLog('Za regálem: schody dolů. 🕯️', 'lm');
      fnotif('Vchod odemčen 🕯️', 'pos');
    }
  }

  if(gs.kratom_freeze > 0) gs.kratom_freeze = Math.max(0, gs.kratom_freeze - dt);

  // Šíša timer
  if(gs.shisha_deadline > 0 && gs.shisha_effects && !gs.shisha_cured && !gs.dead){
    if(gs.ts >= gs.shisha_deadline){
      gs.shisha_deadline = 0;
      triggerDeath(
        'Účinky pofidérní šíši od Milana tě dostihly.\nMěl jsi najít protilék včas.\nCibulka by ti pomohl... kdybys věděl, kde ho hledat.',
        'OTRAVA ŠÍŠOU',
        'KONEC HRY · NAJDI CIBULKU PŘÍŠTĚ',
        'death_shisha'
      );
      return;
    }
  }

  // Číhalová timer
  if(gs.cihalova_deadline > 0 && !gs.cihalova_collapsed && !gs.dead){
    if(gs.ts >= gs.cihalova_deadline){
      gs.cihalova_deadline = 0;
      triggerCihalovaAttack();
      return;
    }
    updateHUD();
  }

  const dialogOpen = document.getElementById('dov').classList.contains('on');
  const riddleOpen = document.getElementById('riddle-ov').classList.contains('on');
  const noteOpen   = document.getElementById('note-ov').classList.contains('on');
  const ssOpen     = document.getElementById('screenshot-ov').classList.contains('on');
  const fotoOpen   = document.getElementById('foto-kubatova-ov').classList.contains('on');
  const certOpen   = document.getElementById('c2-cert-ov').classList.contains('on');
  const anyOverlay = dialogOpen || riddleOpen || noteOpen || ssOpen || fotoOpen || certOpen;
  const frozen = (gs.kratom_freeze > 0) || anyOverlay;
  if(!frozen){
    const anyKey = keys['w']||keys['s']||keys['a']||keys['d']||
                   keys['ArrowUp']||keys['ArrowDown']||keys['ArrowLeft']||keys['ArrowRight'];
    p.mv = !!anyKey;
    const inHeaven = gs.room === 'heaven' || gs.room === 'heaven_gate';
    const legWounded = gs.story.leg_shot && !gs.story.leg_bandaged;
    const spd = p.spd * (inHeaven ? 0.38 : legWounded ? 0.55 : 1) * dt / FRAME_MS;
    if(keys['w'] || keys['ArrowUp'])    p.y -= spd;
    if(keys['s'] || keys['ArrowDown'])  p.y += spd;
    if(keys['a'] || keys['ArrowLeft'])  { p.x -= spd; p.face = 'l'; }
    if(keys['d'] || keys['ArrowRight']) { p.x += spd; p.face = 'r'; }
    // Postřelená noha – hráč se kymácí do stran při chůzi
    if(legWounded && p.mv){
      p.x += Math.sin(gs.ts * 0.006) * 1.2 * dt / FRAME_MS;
    }
  } else {
    p.mv = false;
  }

  if(gs.room === 'johnny_vila'){
    const W2 = canvas.width, H2 = canvas.height;
    p.x = Math.max(30, Math.min(W2 - 30, p.x));
    p.y = Math.max(30, p.y);
    // Sad Johnny – hráč chce odejít, musí stisknout E u dveří → Johnny střílí
    if(gs.story.johnny_sad_tried_leave && !gs.story.johnny_knee_shot && !gs.story.johnny_monologue_over){
      const exitX = W2 * 0.5, exitY = H2 * 0.92;
      if(dist2(p, {x:exitX, y:exitY}) < PROX_R * 1.5){
        // Blokuj odchod - počkej na E
        p.y = Math.min(p.y, H2 * 0.92);
      }
    }
    if(p.y > H2){
      // Sad Johnny knee shot trap
      if(gs.story.johnny_sad_tried_leave && !gs.story.johnny_knee_shot && !gs.story.johnny_monologue_over){
        p.y = H2 - 5;
        return;
      }
      // Odchod z vily – zastavit stay timer a nastavit flag
      if(gs.story.johnny_villa_rewards && !gs.story.johnny_return_left){
        gs.story.johnny_return_left = true;
      }
      if(gs.johnny_stay_deadline > 0){
        gs.johnny_stay_deadline = 0; // zrušit timer při odchodu
      }
      // Pokud hráč uteče z vily včas s Janou prchající
      if(gs.jana_escape_deadline && gs.ts < gs.jana_escape_deadline && !gs.story.jana_escaped_success){
        gs.story.jana_escaped_success = true;
        gs.jana_escape_deadline = 0;
        gs.johnny_chase_pos = null;
        setTimeout(() => {
          addLog('*Vyběhls z vily. Jana stojí opodál, oddychuje.* "Díky... díky ti, Hrubeši."', 'lm');
          if(gs.story.leg_shot){
            setTimeout(() => {
              addLog('*Jana si všimne krve na nohavici.* "Ježíši, on tě trefil! Sedni si."', 'lw');
              setTimeout(() => {
                addLog('*Jana ti strhne kus látky z košile a pevně ovine nohu.*', 'lm');
                fnotif('🩹 Jana obvázala nohu', 'pos');
                gs.story.leg_bandaged = true;
              }, 1500);
            }, 1200);
          }
          gainRep(12, 'Utekl s Janou z Johnnyho vily');
          gs.inv.klice_vila = 1; updateInv();
          gs.story.jana_rescued_villa = true;
          gs.story.johnny_villa_done = true;
          doneObj('side_johnny');
          fnotif('+12 REP','rep'); fnotif('Jana zachráněna 💅','pos'); fnotif('🔑 Klíče od vily','itm');
          addLog('Jana se vydá do Billy. Můžeš ji tam potkat.', 'ls');
        }, 800);
      } else if(gs.jana_escape_deadline && !gs.story.jana_escaped_success){
        gs.jana_escape_deadline = 0;
      }
      // Šíša efekty – aktivují se po odchodu z vily
      if(gs.story.shisha_smoked && !gs.shisha_effects && !gs.shisha_cured && !gs.story.jana_escaped_success){
        gs.shisha_effects = true;
        gs.shisha_deadline = gs.ts + 300000; // 5 minut
        setTimeout(() => {
          addLog('*Hlavou ti projede ostrá bolest. Svět se roztřese.* Ty účinky z tý šíši...', 'lw');
          screenShake(300);
          setTimeout(() => {
            addLog('*Žaludek se ti obrací. Vidíš dvojitě.* Toto není normální šíša. Milan to vzal bůhvíkde...', 'lw');
            fnotif('⚠ OTRAVA ŠÍŠOU – najdi protilék!', 'rep');
          }, 1500);
        }, 800);
      }
      gs.room = 'kremze'; initRoom(canvas.width * 0.50, canvas.height * 0.60); return;
    }
  } else if(gs.room === 'koupelna'){
    const W2 = canvas.width, H2 = canvas.height;
    p.x = Math.max(30, Math.min(W2 - 30, p.x));
    p.y = Math.max(30, p.y);
    if(p.y > H2){ gs.room = 'johnny_vila'; initRoom(canvas.width * 0.90, canvas.height * 0.40); return; }
  } else if(gs.room === 'sklep'){
    // Sklep – pouze dolní výstup dovolen, vše ostatní zamčeno
    const W2 = canvas.width, H2 = canvas.height;
    p.x = Math.max(30, Math.min(W2 - 30, p.x));
    p.y = Math.max(30, p.y);
    if(p.y > H2) { changeRoom('down'); return; }
  } else if(gs.room === 'johnny_stalking'){
    const W2 = canvas.width, H2 = canvas.height;
    p.x = Math.max(30, Math.min(W2 - 30, p.x));
    p.y = Math.max(H2 * 0.35, Math.min(H2 - 30, p.y));
    if(p.y >= H2 - 35){ gs.room = 'johnny_vila'; initRoom(canvas.width * 0.10, canvas.height * 0.55); return; }
  } else if(gs.room === 'cibulka_lab'){
    // Cibulkova laboratoř – pohyb omezen, exit pouze krbem (interakce)
    const W2 = canvas.width, H2 = canvas.height;
    p.x = Math.max(30, Math.min(W2 - 30, p.x));
    p.y = Math.max(canvas.height * 0.52, Math.min(H2 - 30, p.y));
  } else if(gs.room === 'doma'){
    const W2 = canvas.width, H2 = canvas.height;
    p.x = Math.max(30, Math.min(W2 - 30, p.x));
    p.y = Math.max(30, p.y);
    if(p.y < 0){ changeRoom('up'); return; }
    if(p.y > H2) p.y = H2;
  } else if(gs.room !== 'heaven' && gs.room !== 'heaven_gate'){
    if(p.x < 0)             { changeRoom('prev'); return; }
    if(p.x > canvas.width)  { changeRoom('next'); return; }
    if(p.y < 0)             { changeRoom('up');   return; }
    if(p.y > canvas.height) { changeRoom('down'); return; }
  } else {
    // V nebi – vlevo/vpravo zamknout, nahoru/dolů přepnout místnost
    p.x = Math.max(0, Math.min(canvas.width, p.x));
    if(p.y < 0)             { changeRoom('up');   return; }
    if(p.y > canvas.height) { changeRoom('down'); return; }
  }

  // Milan – Mates přijede a odjede s Milanem
  if(gs.milan_leave_deadline > 0 && gs.ts >= gs.milan_leave_deadline && gs.story.milan_in_hospoda && !gs.story.milan_shot){
    gs.milan_leave_deadline = 0;
    gs.story.milan_fled = true;
    gs.story.milan_in_hospoda = false;
    currentNPCs = currentNPCs.filter(n => n.id !== 'milan');
    addLog('Mates přijel. Milan nasedl do Fabie a odjeli směrem na Planou.', 'lm');
    fnotif('Milan odjel ✈️','pos');
  }

  // Johnny return visit – 20s timer, pak zastřelí hráče
  if(gs.johnny_stay_deadline > 0 && gs.ts >= gs.johnny_stay_deadline && !gs.dead){
    gs.johnny_stay_deadline = 0;
    addLog('*Johnny vstane z gauče. Oči mu planou vztekem.*', 'lw');
    addLog('"ŘIKAL JSEM TI, ABY SES VYPAŘIL!" *vytáhne pistoli*', 'lw');
    screenShake(500);
    setTimeout(() => triggerDeath(
      'Johnny stiskl spoušť. Jednou stačilo.\n"Říkal jsem ti, ať jdeš." *odloží zbraň a vrátí se na gauč*',
      'ZASTŘELEN JOHNNYM',
      'KONEC HRY · NEMĚL JSI ZŮSTÁVAT',
      'death_johnny_shot'
    ), 800);
    return;
  }

  // Villa časovač – pokud hráč nepomohl Janě včas, Johnny ji odvede
  if(gs.villa_deadline > 0 && gs.ts >= gs.villa_deadline && !gs.story.jana_rescued && !gs.story.johnny_took_jana){
    gs.villa_deadline = 0;
    gs.story.johnny_took_jana = true;
    gs.story.jana_in_hospoda = false;
    currentNPCs = currentNPCs.filter(n => n.id !== 'jana_kosova' && n.id !== 'johnny');
    addLog('Johnny a Jana zmizeli z hospody. Johnny vypadal nadšeně. Jana... ne.', 'lw');
    addLog('Jsou teď u Johnnyho doma. Johnnyho vila je na náměstí v Křemži.', 'ls');
    fnotif('Jana odešla s Johnnym 😬','rep');
    doneObj('side_johnny');
  }

  if(gs.kratom_on){
    gs.kratom_t -= dt;
    const pct = Math.max(0, (gs.kratom_t / gs.kratom_max) * 100);
    document.getElementById('kh-fill').style.width = pct + '%';
    if(gs.kratom_t <= 0) endKratom();
  }

  if(gs.room !== 'heaven' && gs.room !== 'heaven_gate' && gs.ts - gs.lastDrain > ENERGY_DRAIN_MS){
    gs.energy = Math.max(0, gs.energy - 1);
    gs.lastDrain = gs.ts;
    if(gs.energy <= 0 && !gs.dead){
      triggerDeath(
        'Byl jsi naprosto na prášky z toho, že jsi dlouho neměl pizza žemli. Tělo zkolabovalo.',
        'VYČERPÁNÍ',
        'SMRT NA NEDOSTATEK ŽEMLÍ',
        'death_energy'
      );
      return;
    }
    if(gs.energy <= 20 && gs.energy > 0) addLog(`⚠️ Energie ${Math.floor(gs.energy)}%`, 'lw');
    updateHUD();
  }

  // Pláteníková – vchází do učebny po zjištění hlasovky (persistní flag, aby fungovalo i po předání Figurové)
  if(!gs.platenikova_in && (gs.inv.hlasovka || gs.story.hlasovka_known) && gs.story.milan_fig_evidence){
    gs.platenikova_in = true;
    addLog('*Dveře se otevřou. Do učebny vchází zástupkyně ředitelky paní Pláteníková.*', 'lw');
    fnotif('Pláteníková! 👩‍💼', 'rep');
    if(gs.room === 'ucebna'){
      const plNPC = NPCS['platenikova'];
      if(plNPC && !currentNPCs.find(n => n.id === 'platenikova'))
        currentNPCs.push({...plNPC, id:'platenikova', x:plNPC.rx*canvas.width, y:plNPC.ry*canvas.height, bob:0, bobDir:1});
    }
  }

  // Figurová – zavolá hráče na začátku hry
  if(!gs.story.figurova_called && gs.ts > 3000 && gs.ts < 4000){
    gs.story.figurova_called = true;
    addLog('Figurová: "Hrubeš! Come here. NOW." *mávne na tebe od svého stolu*', 'lw');
    fnotif('Figurová tě volá! 🧐', 'rep');
  }

  currentNPCs.forEach(n => {
    n.bobT = (n.bobT || 0) + dt * 0.002;
    n.bob = Math.sin(n.bobT) * 0.08;
  });

  currentItems.forEach(i => { i.p = (i.p + dt * 0.004) % (Math.PI * 2); });

  checkProx();
}

// ─── Animace útoku Číhalové ───────────────────────────────────────────────

function updateCihalovaCA(dt){
  const ca = gs.ca;
  const W = canvas.width, H = canvas.height;
  ca.phaseT += dt;

  if(ca.phase === 1){
    const targetX = gs.player.x + 95;
    ca.x = Math.max(targetX, ca.x - 0.55 * dt);
    // sleduj y hráče
    ca.y += (gs.player.y - ca.y) * 0.04;
    if(ca.x <= targetX && ca.phaseT > 400){
      ca.phase = 2;
      ca.phaseT = 0;
      ca.speech = '"Hrubeši. Rozbor Máchy. Piko.\nDoba splatnosti vypršela."';
    }
  } else if(ca.phase === 2){
    if(ca.phaseT > 2600){
      ca.phase = 3;
      ca.phaseT = 0;
      ca.flash = 1;
      ca.speech = '';
    }
  } else if(ca.phase === 3){
    // Výstřel – záblesk
    ca.flash = Math.max(0, ca.flash - dt * 0.004);
    if(ca.phaseT > 800){
      ca.phase = 4;
      gs.dead = true;
      gs.running = false;
      // Zobraz smrt po krátkém čase
      setTimeout(() => triggerDeath(
        'Číhalová nenechává nic náhodě. Výstřel byl přesný.\nKřemže tě bude postrádat. Možná.',
        'ZASTŘELEN UČITELKOU',
        'KONEC HRY · MÁCHA BY PLAKAL',
        'death_cihalova'
      ), 600);
    }
  }
}

// ─── Voodoo animace ───────────────────────────────────────────────────────

function useNuz(){
  if(gs.room !== 'kremze'){ addLog('Tady nemáš na koho to použít.', 'lw'); return; }
  if(!gs.inv.voodoo || !gs.inv.nuz){ addLog('Nemáš voodoo panenku ani nůž!', 'lw'); return; }
  if(gs.story.mraz_done || gs.story.milan_voodoo_dead){ addLog('Mráz je pryč.', 'lw'); return; }
  const milan = currentNPCs.find(n => n.id === 'milan');
  if(!milan){ addLog('Milan v Křemži není.', 'lw'); return; }
  gs.inv.voodoo = 0; gs.inv.nuz = 0; updateInv();
  const W = canvas.width, H = canvas.height;
  gs.vm = {
    x: milan.x, y: milan.y,
    startX: milan.x, startY: milan.y,
    fnX: W * 0.50, fnY: H * 0.66,
    phase: 1, phaseT: 0,
    trail: [],
  };
  currentNPCs = currentNPCs.filter(n => n.id !== 'milan');
  gs.voodoo_anim = true; gs.voodoo_t = 0;
  gs.running = false;
  addLog('Pomalu vytáhneš nůž z kapsy...', 'lw');
}

function updateVoodooAnim(dt){
  gs.voodoo_t += dt;
  const vm = gs.vm;
  if(!vm) return;

  vm.phaseT += dt;

  // Vyblednutí trailů
  for(let i = vm.trail.length - 1; i >= 0; i--){
    vm.trail[i].a -= dt * 0.0008;
    if(vm.trail[i].a <= 0) vm.trail.splice(i, 1);
  }

  if(vm.phase === 1){
    // Čeká na místě, řezná rána se objeví – pak po 2000ms → běh
    if(vm.phaseT >= 2000){
      vm.phase = 2; vm.phaseT = 0;
    }
  } else if(vm.phase === 2){
    // Běh ke kašně – přidávej krvavý trail každých 40ms
    const dx = vm.fnX - vm.x, dy = vm.fnY - vm.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist > 18){
      if(!vm.startDist) vm.startDist = dist;
      const progress = 1 - dist / vm.startDist;
      const ease = progress < 0.2 ? progress / 0.2 : (progress > 0.8 ? (1 - progress) / 0.2 : 1);
      const speed = 2.8 * Math.max(0.3, ease) * dt / FRAME_MS;
      vm.x += (dx / dist) * speed;
      vm.y += (dy / dist) * speed;
      if(vm.phaseT % 40 < dt){ // přibližně každých 40ms
        vm.trail.push({ x: vm.x + (Math.random()-0.5)*8, y: vm.y + 10, a: 0.85 });
      }
    } else {
      vm.phase = 3; vm.phaseT = 0;
    }
  } else if(vm.phase === 3){
    // Padá do kašny
    if(vm.phaseT >= 1100){
      vm.phase = 4; vm.phaseT = 0;
      gs.kasna_red = true;
      addLog('Milan padl do kašny. Voda se zbarví červeně. 🩸', 'lw');
    }
  } else if(vm.phase === 4){
    // Tělo se vznáší hlavou dolů
    if(vm.phaseT >= 2200){
      gs.voodoo_anim = false;
      gs.running = true;
      gs.story.milan_voodoo_dead = true;
      gs.story.mraz_done = true;
      addLog('Milan Mráz. Nikdo nic neviděl. 🩸', 'lw');
      fnotif('Milan mrtev 🩸', 'rep');
    }
  }
}

// ─── Herní smyčka ─────────────────────────────────────────────────────────

let _lastRenderTs = 0;
function gameLoop(ts){
  const active = gs.running || gs.ca_active || gs.voodoo_anim || gs.johnny_kill_anim || gs.cutscene_active;
  const gc = document.getElementById('gc');
  if(gc) gc.classList.toggle('game-paused', !active);
  if(!active){ requestAnimationFrame(gameLoop); return; }
  try {
    const dt = Math.min(ts - lastTime, 50);
    lastTime = ts;
    if(gs.ca_active && gs.ca) updateCihalovaCA(dt);
    if(gs.voodoo_anim) updateVoodooAnim(dt);
    if(gs.johnny_kill_anim) gs.ts += dt;
    if(gs.cutscene_active){
      // Slowmo efekt po úspěšném dodge
      let cdt = dt;
      if(gs.dodge && gs.dodge.slowmo > 0){
        const smElapsed = gs.ts - gs.dodge.slowmo;
        if(smElapsed < 600) cdt = dt * 0.3; // dramatické zpomalení
        else gs.dodge.slowmo = 0;
      }
      gs.ts += cdt;
      if(gs.dodge) _dodgeUpdate();
    }
    if(gs.maze){ gs.ts += dt; _mazeUpdate(dt); }
    else if(gs.running) update(dt);
    // Throttle rendering to ~60fps (16.67ms) to avoid unnecessary GPU work
    if(ts - _lastRenderTs >= 15){ render(); _lastRenderTs = ts; }
  } catch(e) {
    console.error('[gameLoop] chyba:', e);
    // Zobrazit chybu v herním deníku – pomáhá ladit bez otvírání konzole
    try {
      const msg = e && e.message ? e.message : String(e);
      if(typeof addLog === 'function') addLog('🔴 CHYBA: ' + msg.slice(0, 120), 'lw');
    } catch(_){}
  }
  requestAnimationFrame(gameLoop);
}
