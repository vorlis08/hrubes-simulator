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

// ─── Utilitky ─────────────────────────────────────────────────────────────

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
  // Pája v hospodě – nezobrazuj na ulici
  if(gs.story.paja_in_hospoda) currentNPCs = currentNPCs.filter(n => n.id !== 'paja');
  // Pája v hospodě – přidat ho tam
  if(gs.room === 'hospoda' && gs.story.paja_in_hospoda && !gs.story.paja_fabie_told){
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
    if(!currentNPCs.find(n => n.id === 'figurova'))
      currentNPCs.push({...figNPC, id:'figurova', x:gs.player.x - 55, y:gs.player.y, bob:0, bobDir:1});
  }
  // Figurová skopnuta – schovat v Bille, zobrazit v sklepě na zemi (log při vstupu)
  if(gs.room === 'sklep' && gs.story.figurova_kicked && !gs.story.figurova_dead_sklep){
    setTimeout(() => addLog('*Na podlaze sklepa... Figurová. Pochroumána. Ještě se hýbe.*', 'lw'), 600);
  }
  // Jana v hospodě na rande
  if(gs.room === 'hospoda' && gs.story.jana_in_hospoda && !gs.story.johnny_took_jana){
    const jn = NPCS['jana_kosova'];
    currentNPCs.push({...jn, id:'jana_kosova', x:jn.rx*canvas.width, y:(jn.ry+0.28)*canvas.height, bob:0, bobDir:1});
  }

  currentItems = [];
  if(rm.spawns.kratom && Math.random() < rm.spawns.kratom)
    currentItems.push({type:'kratom', x:rr(.15,.85)*canvas.width, y:rr(.18,.82)*canvas.height, p:0});
  if(rm.spawns.zemle  && Math.random() < rm.spawns.zemle)
    currentItems.push({type:'zemle',  x:rr(.15,.85)*canvas.width, y:rr(.18,.82)*canvas.height, p:0});

  gs.player.x = (spawnX !== undefined) ? spawnX : canvas.width  / 2;
  gs.player.y = (spawnY !== undefined) ? spawnY : canvas.height / 2;
  addLog(`→ ${rm.name}`, 'ls');
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

  // Villa – šuplík (prášek)
  if(gs.room === 'johnny_vila' && !gs.story.villa_powder_taken && !gs.story.johnny_cuffed){
    const dx = canvas.width * 0.22, dy = canvas.height * 0.72;
    if(dist2(p, {x:dx, y:dy}) < PROX_R){ best = {isVillaDrawer:true}; }
  }
  // Villa – kuchyňská linka (nasypat prášek do drinku)
  if(gs.room === 'johnny_vila' && gs.inv.prasek && !gs.story.jana_drugged_villa && !gs.story.johnny_cuffed){
    const kx = canvas.width * 0.83, ky = canvas.height * 0.59;
    if(dist2(p, {x:kx, y:ky}) < PROX_R){ best = {isVillaKitchen:true}; }
  }
  // Villa – dveře do koupelny
  if(gs.room === 'johnny_vila' && gs.story.jana_hint_given && !gs.story.johnny_cuffed){
    const bx = canvas.width * 0.92, by = canvas.height * 0.35;
    if(dist2(p, {x:bx, y:by}) < PROX_R){ best = {isVillaBathroom:true}; }
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
    const sdx = canvas.width * 0.40, sdy = canvas.height * 0.55;
    if(dist2(p, {x:sdx, y:sdy}) < PROX_R){ best = {isBathroomDrawer:true}; }
  }
  // Koupelna – umyvadlo
  if(gs.room === 'koupelna' && !gs.story.sink_used){
    const ux = canvas.width * 0.40, uy = canvas.height * 0.38;
    if(dist2(p, {x:ux, y:uy}) < PROX_R){ best = {isBathroomSink:true}; }
  }
  // Johnny spoutaný – vzít klíče
  if(gs.room === 'johnny_vila' && gs.story.johnny_cuffed && !gs.inv.klice_vila){
    const jx = canvas.width * 0.65, jy = canvas.height * 0.55;
    if(dist2(p, {x:jx, y:jy}) < PROX_R * 1.5){ best = {isJohnnyKeys:true}; }
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

  // Dveře doma (exit ven)
  if(gs.room === 'doma'){
    const doorCX = canvas.width * 0.50, doorCY = canvas.height * 0.05;
    if(dist2(p, {x:doorCX, y:doorCY}) < PROX_R * 1.5){ best = {isDoor:true}; }
  }

  // Artefakty na bustách doma
  if(gs.room === 'doma' && activeProfile){
    const ART_KEYS = ['screenshot','hlasovka','foto_kubatova','c2_cert','voodoo','fig_nuz','fig_gun','milan_phone','zelizka','podprsenka','klice_vila','pytel_cihalova','klice_fabie','saman_hlava','maturita','cibule','membership_vaza','foto_figurova'];
    const acx = canvas.width * 0.42, acy = canvas.height * 0.38;
    const arx = Math.min(canvas.width * 0.22, 200), ary = Math.min(canvas.height * 0.20, 130);
    for(let i = 0; i < ART_KEYS.length; i++){
      const key = ART_KEYS[i];
      const unlocked = activeProfile.artifacts[key];
      const taken = gs.pregame_artifacts && gs.pregame_artifacts[key];
      if(unlocked && !taken){
        const angle = (i / ART_KEYS.length) * Math.PI * 2 - Math.PI / 2;
        const ax = acx + Math.cos(angle) * arx;
        const ay = acy + Math.sin(angle) * ary;
        if(dist2(p, {x:ax, y:ay}) < PROX_R * 0.9){
          best = {isArtifact:true, artKey:key, artIndex:i};
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
    } else if(best.isVillaKitchen){
      document.getElementById('ptxt').textContent = 'Nasypat prášek do drinku';
    } else if(best.isVillaBathroom){
      document.getElementById('ptxt').textContent = 'Vstoupit do koupelny';
    } else if(best.isBathroomDrawer){
      document.getElementById('ptxt').textContent = 'Otevřít šuplík';
    } else if(best.isBathroomSink){
      document.getElementById('ptxt').textContent = 'Pustit vodu';
    } else if(best.isJohnnyKeys){
      document.getElementById('ptxt').textContent = 'Vzít klíče od Johnnyho';
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
    } else if(best.isDoor){
      document.getElementById('ptxt').textContent = 'Otevřít dveře – jít ven';
    } else if(best.isArtifact){
      const artNames = {screenshot:'Screenshot',hlasovka:'Hlasovka',foto_kubatova:'Fotka',c2_cert:'C2 Cert.',voodoo:'Voodoo',fig_nuz:'Nůž†',fig_gun:'Pistole',milan_phone:'Tel. Milan',zelizka:'Želízka',podprsenka:'Artefakt',klice_vila:'Klíče',pytel_cihalova:'Číhalová',klice_fabie:'Fábie',saman_hlava:'Šam. hlava',maturita:'Maturita',cibule:'Cibule',membership_vaza:'Vaza Systems'};
      document.getElementById('ptxt').textContent = 'Vzít ' + (artNames[best.artKey] || best.artKey);
    } else if(best.isSamanBody){
      document.getElementById('ptxt').textContent = 'Vzít šamanovu hlavu';
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
        // Návrat po varování – Johnny a Jana v ložnici
        if(gs.story.johnny_return_visit && gs.story.johnny_return_left && gs.johnny_stay_deadline === 0){
          gs.story.johnny_bedroom = true;
          addLog('Johnnyho vila je tichá. Johnny s Janou nejsou v obýváku.', 'ls');
        }
        gs.room = 'johnny_vila'; initRoom(canvas.width * 0.5, canvas.height * 0.7);
        // Při návratu start 20s timer
        if(gs.story.johnny_return_visit && !gs.story.johnny_bedroom && gs.johnny_stay_deadline === 0){
          gs.johnny_stay_deadline = gs.ts + 20000;
        }
        return;
      }
    }
  }
  // Villa – šuplík (prášek)
  if(gs.room === 'johnny_vila' && !gs.story.villa_powder_taken && !gs.story.johnny_cuffed){
    const dx = canvas.width * 0.22, dy = canvas.height * 0.72;
    if(dist2(gs.player, {x:dx, y:dy}) < PROX_R){ runQF('q_villa_drawer'); return; }
  }
  // Villa – kuchyňská linka (nasypat prášek)
  if(gs.room === 'johnny_vila' && gs.inv.prasek && !gs.story.jana_drugged_villa && !gs.story.johnny_cuffed){
    const kx = canvas.width * 0.83, ky = canvas.height * 0.59;
    if(dist2(gs.player, {x:kx, y:ky}) < PROX_R){
      gs.inv.prasek = 0; updateInv();
      runQF('q_villa_drug_drink'); return;
    }
  }
  // Villa – dveře do koupelny
  if(gs.room === 'johnny_vila' && gs.story.jana_hint_given && !gs.story.johnny_cuffed){
    const bx = canvas.width * 0.92, by = canvas.height * 0.35;
    if(dist2(gs.player, {x:bx, y:by}) < PROX_R){
      gs.room = 'koupelna'; initRoom(canvas.width * 0.5, canvas.height * 0.7); return;
    }
  }
  // Koupelna – šuplík
  if(gs.room === 'koupelna' && !gs.story.koupelna_drawer_opened){
    const sdx = canvas.width * 0.40, sdy = canvas.height * 0.55;
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

  // Figurová sleduje – zastavit u dveří sklepa
  if(gs.room === 'billa' && gs.story.figurova_following && !gs.story.figurova_at_door){
    const dx = canvas.width * 0.63, dy = canvas.height * 0.72;
    if(dist2(gs.player, {x:dx, y:dy}) < PROX_R * 2){ runQF('q_figurova_arrive_door'); return; }
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

  // Regál mléka – tajný vchod do sklepa
  if(gs.room === 'billa' && gs.story.sklep_unlocked && !gs.shelf_sliding){
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

  // Artefakty na bustách doma
  if(gs.room === 'doma' && activeProfile){
    const ART_KEYS = ['screenshot','hlasovka','foto_kubatova','c2_cert','voodoo','fig_nuz','fig_gun','milan_phone','zelizka','podprsenka','klice_vila','pytel_cihalova','klice_fabie','saman_hlava','maturita','cibule','membership_vaza','foto_figurova'];
    const acx = canvas.width * 0.42, acy = canvas.height * 0.38;
    const arx = Math.min(canvas.width * 0.22, 200), ary = Math.min(canvas.height * 0.20, 130);
    for(let i = 0; i < ART_KEYS.length; i++){
      const key = ART_KEYS[i];
      const unlocked = activeProfile.artifacts[key];
      const taken = gs.pregame_artifacts && gs.pregame_artifacts[key];
      if(unlocked && !taken){
        const angle = (i / ART_KEYS.length) * Math.PI * 2 - Math.PI / 2;
        const ax = acx + Math.cos(angle) * arx;
        const ay = acy + Math.sin(angle) * ary;
        if(dist2(gs.player, {x:ax, y:ay}) < PROX_R * 0.9){
          gs.pregame_artifacts[key] = true;
          // Přenést artefakt do inventáře
          const artNames = {screenshot:'Screenshot',hlasovka:'Hlasovka',foto_kubatova:'Fotka Kubátové',c2_cert:'C2 Certifikát',voodoo:'Voodoo panenka',fig_nuz:'Nůž od Figurové',fig_gun:'Pistole od Figurové',milan_phone:'Telefon Milana',zelizka:'Želízka',podprsenka:'Podprsenka',klice_vila:'Klíče od vily',pytel_cihalova:'Pytel s Číhalovou',klice_fabie:'Klíčky Fandovy Fábie',saman_hlava:'Šamanova hlava',maturita:'Maturita',cibule:'Cibule',membership_vaza:'Členská karta Vaza'};
          if(key === 'pytel_cihalova'){
            gs.inv.pytel = 1; gs.cihalova_in_bag = true;
          } else if(gs.inv[key] !== undefined){
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
        const spd = 2.6 * dt / 16.667;
        fig.x += (dx / d) * spd;
        fig.y += (dy / d) * spd;
      }
    }
  }

  // Šaman OBÍDEK – pobíhá nahý po hospodě
  if(gs.saman_naked_anim && gs.room === 'hospoda' && gs.saman_naked_anim.phase === 'running'){
    const a = gs.saman_naked_anim;
    const W = canvas.width, H = canvas.height;
    const k = dt / 16.667;
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
    const spd = p.spd * (inHeaven ? 0.38 : 1) * dt / 16.667; // frame-rate nezávislý pohyb
    if(keys['w'] || keys['ArrowUp'])    p.y -= spd;
    if(keys['s'] || keys['ArrowDown'])  p.y += spd;
    if(keys['a'] || keys['ArrowLeft'])  { p.x -= spd; p.face = 'l'; }
    if(keys['d'] || keys['ArrowRight']) { p.x += spd; p.face = 'r'; }
  } else {
    p.mv = false;
  }

  if(gs.room === 'johnny_vila'){
    const W2 = canvas.width, H2 = canvas.height;
    p.x = Math.max(30, Math.min(W2 - 30, p.x));
    p.y = Math.max(30, p.y);
    if(p.y > H2){
      // Odchod z vily – zastavit stay timer a nastavit flag
      if(gs.story.johnny_villa_rewards && !gs.story.johnny_return_left){
        gs.story.johnny_return_left = true;
      }
      if(gs.johnny_stay_deadline > 0){
        gs.johnny_stay_deadline = 0; // zrušit timer při odchodu
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
    n.bob += n.bobDir * dt * 0.00075;
    if(Math.abs(n.bob) > 0.08) n.bobDir *= -1;
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
    const speed = 2.8 * dt / 16.667;
    const dx = vm.fnX - vm.x, dy = vm.fnY - vm.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist > 18){
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
  if(!gs.running && !gs.ca_active && !gs.voodoo_anim) return;
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;
  if(gs.ca_active && gs.ca) updateCihalovaCA(dt);
  if(gs.voodoo_anim) updateVoodooAnim(dt);
  if(gs.running) update(dt);
  // Throttle rendering to ~60fps (16.67ms) to avoid unnecessary GPU work
  if(ts - _lastRenderTs >= 15){ render(); _lastRenderTs = ts; }
  requestAnimationFrame(gameLoop);
}
