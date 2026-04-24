'use strict';
// ═══════════════════════════════════════════
//  DIALOGOVÝ SYSTÉM & HÁDANKA
// ═══════════════════════════════════════════

// ─── Šamanova hesla ──────────────────────────────────────────────────────────
const SAMAN_PASSWORDS = {
  // Quest heslo — Mates ti ho řekne po darování žemle
  johnny_dneska_platí: {
    reward:'money', val:300,
    msg:'"Johnny dneska platí?!" *Šaman se rozřehtá* "To je dobrý! Tady máš tři stovky, to zní jako Johnny!"',
    notif:'+300 Kč 🍺', rep:5
  },
  // Graffiti v Křemži — viditelné na zdi
  kremze4life: {
    reward:'money', val:300,
    msg:'"KŘEMŽE4LIFE..." *Šaman přivře oči* "Vidím, že znáš ulice." Hodí ti 300 Kč.',
    notif:'+300 Kč 💰', rep:3
  },
  // Vyryté v podlaze sklepa — jen pokud Milan zemřel (dark path)
  mraz: {
    reward:'rep', val:25,
    msg:'"MRÁZ..." *Šamanovi ztuhne obličej* "Odkud to znáš?! ...Radši nechci vědět."',
    notif:'+25 REP 🌟', rep:25
  },
  // Klíčky od Fábie
  fábie: {
    reward:'item', item:'klice_fabie', val:1,
    msg:'"FÁBIE..." *Šaman sáhne do kapsy* "Jo, to měl Pája u mě. Tady máš, jen si to vem." *hodí ti klíčky*',
    notif:'🔑 Klíčky od Fábie!', rep:0, special:'fabie'
  },
  fabie: {
    reward:'item', item:'klice_fabie', val:1,
    msg:'"FÁBIE..." *Šaman sáhne do kapsy* "Jo, to měl Pája u mě. Tady máš, jen si to vem." *hodí ti klíčky*',
    notif:'🔑 Klíčky od Fábie!', rep:0, special:'fabie'
  },
};

// Šaman – reakce na špatná hesla (eskalace)
const SAMAN_WRONG_RESPONSES = [
  '"' + 'To slovo neznám, kamaráde. Zkus znovu.' + '"',
  '"' + 'Hele, to fakt není ono. Přemýšlej víc.' + '"',
  '"' + 'Začínáš mě štvát. Přestaň plýtvat mým časem.' + '"',
  '"' + '*zaťne pěsti* "Ještě JEDNO blbé slovo a..."' + '"',
  '"' + '*vyvalí oči, žíla na čele mu pulzuje* "NAPOSLEDY TI TO ŘÍKÁM..."' + '"',
];

function openPassword(){
  document.getElementById('riddle-q').textContent = '"Šeptej mi tajné slovo a já ti za něj dám dar. Každé slovo funguje jen jednou..."';
  document.getElementById('riddle-in').value = '';
  const h = document.getElementById('riddle-hint');
  h.textContent = ''; h.style.color = '';
  document.getElementById('riddle-ov').classList.add('on');
  setTimeout(() => document.getElementById('riddle-in').focus(), 120);
}
function closeRiddle(){ document.getElementById('riddle-ov').classList.remove('on'); }
function submitPassword(){
  const raw = document.getElementById('riddle-in').value.trim();
  const ans = raw.toLowerCase();
  const h   = document.getElementById('riddle-hint');
  if(!ans){ h.textContent = '...ticho. Řekni něco.'; return; }

  // Kontrola, zda heslo existuje a nebylo už použito
  if(!gs.story.used_passwords) gs.story.used_passwords = [];

  // === Speciální kódy ===
  if(ans === 'god'){
    closeRiddle();
    triggerGodMode();
    return;
  }
  if(ans === 'obídek' || ans === 'obidek'){
    closeRiddle();
    closeDialog();
    triggerObidek();
    return;
  }

  const pw = SAMAN_PASSWORDS[ans];
  if(!pw){
    // Špatné heslo – eskalace
    gs.saman_wrong++;
    if(gs.saman_wrong > 5){
      // Šaman se nasere a podřízne ti držku
      closeRiddle();
      setTimeout(() => {
        addLog('*Šaman vytáhl nůž* "ŘIKAL JSEM TI, ABYS PŘESTAL!" *rychlý pohyb*', 'lw');
        setTimeout(() => triggerDeath(
          'Šamanův nůž ti přejel přes krk. Rychle. Efektivně.\nMěl jsi přestat hádat.',
          'PODŘÍZNUT ŠAMANEM',
          'KONEC HRY · ŠAMAN NEODPOUŠTÍ',
          'death_saman_throat'
        ), 800);
      }, 300);
      return;
    }
    h.style.color = 'var(--red)';
    const respIdx = Math.min(gs.saman_wrong - 1, SAMAN_WRONG_RESPONSES.length - 1);
    h.textContent = SAMAN_WRONG_RESPONSES[respIdx];
    return;
  }
  if(gs.story.used_passwords.includes(ans)){
    h.style.color = 'var(--red)';
    h.textContent = '"Tohle slovo jsi už říkal. Každé funguje jen jednou."';
    return;
  }
  // Úspěch — dát odměnu
  gs.story.used_passwords.push(ans);
  switch(pw.reward){
    case 'kratom': gs.inv.kratom += pw.val; updateInv(); break;
    case 'money':  gs.money += pw.val; break;
    case 'energy': gs.energy = gs.maxEnergy; break;
    case 'rep':    gainRep(pw.val, 'Šamanovo heslo: ' + ans); break;
    case 'item':   gs.inv[pw.item] = pw.val; updateInv(); break;
  }
  if(pw.rep && pw.reward !== 'rep') gainRep(pw.rep, 'Šamanovo heslo: ' + ans);
  if(pw.special === 'fabie'){
    addObj('quest_fabie');
    gs.story.fabie_promised = true;
    addLog('Máš klíčky od Fábie! Najdi ji v Křemži a jeď domů!', 'lm');
  }
  updateHUD();
  if(!gs.story.saman_stage) gs.story.saman_stage = 1;
  closeRiddle();
  addLog(pw.msg, 'lm');
  fnotif(pw.notif, 'itm');
}

// === GOD MODE ===
function triggerGodMode(){
  addLog('🔮 *Šaman přivře oči* "GOD...?" *ticho* "Tak ty jsi... TEN." *ukloní se*', 'lr');
  fnotif('GOD MODE ACTIVATED!', 'rep');
  // Unlock all artifacts on profile
  if(activeProfile){
    for(const key in activeProfile.artifacts) activeProfile.artifacts[key] = true;
    for(const key in activeProfile.questsCompleted) activeProfile.questsCompleted[key] = true;
    for(const key in activeProfile.endings) activeProfile.endings[key] = true;
    profileSaveProgress();
  }
  // In-game bonuses
  gs.money += 99999;
  gs.rep += 999;
  gs.inv.kratom += 999;
  gs.story.god_mode = true;
  updateInv(); updateHUD();
  addLog('Všechny artefakty, questy a achievementy odemčeny!', 'lr');
  addLog('...a dostal jsi obrovský penis. Gratulujeme.', 'lr');
  fnotif('🍆 OBROVSKÝ PENIS!', 'itm');
}

// === OBÍDEK – šaman zešílí, sundá si kalhoty, běhá nahý a zastřelí se ===
function triggerObidek(){
  addLog('*Šamanovi ztuhne obličej* "...obídek?"', 'lw');

  // Zachyť pozici šamana, odeber ho z NPC – od teď ho renderujeme my
  const samanNPC = currentNPCs.find(n => n.id === 'kratom_saman');
  const startX = samanNPC ? samanNPC.x : canvas.width * 0.80;
  const startY = samanNPC ? samanNPC.y : canvas.height * 0.62;
  currentNPCs = currentNPCs.filter(n => n.id !== 'kratom_saman');

  gs.saman_naked_anim = {
    x: startX, y: startY,
    vx: 0, vy: 0,
    startTime: gs.ts,
    phaseStart: gs.ts,
    phase: 'reaction',   // reaction → undressing → running → aiming
    flipX: 1,
    pantsX: 0, pantsY: 0,
  };

  const seq = [
    { delay: 1200, log:'*ROZTRHNE oči* "OBÍDEK?! KDO ŘEKL OBÍDEK?!"', cls:'lw' },
    { delay: 1500, log:'"OBÍÍÍÍDEEEK!! OBÍÍÍÍDEEEK!! TADY JE OBÍDEK!!!"', cls:'lw' },
    { delay: 1600, log:'*Strhne si kalhoty a kope je do kouta* "JE TADY HORKO, KURVA!!"', cls:'lw', phase:'undressing' },
    { delay: 1800, log:'*Začne nahý pobíhat po hospodě a řvát "OBÍDEK"*', cls:'lw', phase:'running' },
    { delay: 2200, log:'*Skáče přes stoly, mává péro na všechny strany, slzy mu tečou*', cls:'lw' },
    { delay: 2400, log:'*Zastaví se uprostřed místnosti, oči navrch hlavy, dýchá ztěžka*', cls:'lw', phase:'aiming' },
    { delay: 2000, log:'"Tohle... tohle už neunesu... OBÍDEK..." *vytáhne revolver a přiloží si ho ke spánku*', cls:'lw' },
  ];

  let i = 0;
  function nextLine(){
    if(!gs.saman_naked_anim){ return; } // safety – pokud něco zruší animaci
    if(i < seq.length){
      const ln = seq[i];
      addLog(ln.log, ln.cls);
      if(ln.phase){
        gs.saman_naked_anim.phase = ln.phase;
        gs.saman_naked_anim.phaseStart = gs.ts;
        if(ln.phase === 'undressing'){
          // Hodí kalhoty někam do rohu
          gs.saman_naked_anim.pantsX = canvas.width * (0.10 + Math.random() * 0.08);
          gs.saman_naked_anim.pantsY = canvas.height * 0.80;
        }
        if(ln.phase === 'running'){
          const ang = Math.random() * Math.PI * 2;
          gs.saman_naked_anim.vx = Math.cos(ang) * 5.5;
          gs.saman_naked_anim.vy = Math.sin(ang) * 3.5;
          gs.saman_naked_anim.flipX = gs.saman_naked_anim.vx >= 0 ? 1 : -1;
        }
        if(ln.phase === 'aiming'){
          gs.saman_naked_anim.vx = 0;
          gs.saman_naked_anim.vy = 0;
        }
      }
      i++;
      setTimeout(nextLine, ln.delay);
    } else {
      // Zastřelí se
      addLog('💥 *VÝSTŘEL* Šaman se zastřelil. Nahé tělo dopadlo na zem.', 'lw');
      fnotif('Šaman je mrtvý 💀', 'rep');
      screenShake(700);
      gs.saman_dead = true;
      const fx = gs.saman_naked_anim.x, fy = gs.saman_naked_anim.y;
      gs.saman_death_anim = { x: fx, y: fy, startTime: gs.ts, naked: true };
      gs.saman_naked_anim = null;
    }
  }
  setTimeout(nextLine, 700);
}

// ─── getStage ─────────────────────────────────────────────────────────────

function getStage(id){
  const s = gs.story;
  switch(id){
    case 'cihalova':
      if(gs.cihalova_collapsed || s.cihalova >= 2) return 2;
      if(s.cihalova === 1) return 1;
      return 0;
    case 'krejci':
      if(s.krejci >= 2) return 2;
      if(s.krejci === 1 && s.krejci_resolved) return 1;
      return 0;
    case 'figurova':
      if(s.figurova_dead_sklep || s.figurova_propiska_kill) return 3;
      if(s.figurova_kratomed) return 3;
      if(s.figurova_dark_done) return 3;
      if(s.figurova_dark_started && s.mates_dead && (s.milan_shot || s.milan_voodoo_dead)) return 6;
      if(s.figurova_dark_contract) return 5;
      if(s.figurova_dark_started) return 4;
      if(s.figurova >= 2) return 2;
      if(s.figurova === 1 && s.milan_fig_evidence) return 2;
      if(s.figurova === 1) return 1;
      return 0;
    case 'jana_kosova':
      if(s.jana_rescued) return 4;
      if(s.jana_in_hospoda) return 3;
      if(s.jana >= 2) return 2;
      if(s.jana === 1) return 1;
      return 0;
    case 'mates':
      if((s.mates || 0) >= 2) return 2;
      if(s.mates) return 1;
      return 0;
    case 'johnny':
      if(s.jana_rescued) return 4;
      if(s.jana_in_hospoda) return 3;
      if(s.johnny >= 2) return 2;
      if(s.johnny === 1) return 1;
      return 0;
    case 'kratom_saman':
      if(s.saman_stage >= 2) return 2;
      if(s.saman_stage >= 1) return 1;
      return 0;
    case 'bezdak':
      if(s.kgb_won) return 3;
      if(s.bezdak_cibulka) return 2;
      if((s.bezdak || 0) >= 1) return 1;
      return 0;
    case 'kratom_buh': return s.god_line || 0;
    case 'paja':
      if(s.paja_quest_done) return 4;
      if(s.paja_stolen) return 3;
      if(s.paja_in_hospoda) return 2;
      if(s.paja === 2) return 1;
      return 0;
    case 'platenikova':
      if(s.platenikova_rewarded) return 2;
      if(gs.story.cihalova_burned || gs.cihalova_collapsed) return 1;
      return 0;
    case 'honza':
      return 0;
    case 'mikulas':
      if(s.mikulas_reveal_line !== undefined && !s.mikulas_reveal_done) return 4 + (s.mikulas_reveal_line || 0);
      if(s.mikulas_pressed && !s.krejci_resolved) return 3;
      if(s.mikulas_confronting && !s.krejci_resolved) return 2;
      if((s.honza || 0) >= 2) return 1;
      return 0;
    case 'milan':
      if(s.milan_fled || s.milan_going_to_sklep || s.milan_voodoo_dead || s.milan_shot) return 5;
      if(s.milan_waiting_mates) return 6;
      if((s.milan_warn_count || 0) >= 3) return 4;
      if((s.milan_warn_count || 0) === 2)  return 3;
      if((s.milan_warn_count || 0) === 1)  return 2;
      return s.milan_met ? 1 : 0;
    case 'kubatova':
      if(s.milan_dead_sklep) return s.mraz_reward_given ? 4 : 6;
      if(s.milan_fled)       return s.mraz_reward_given ? 4 : 7;
      if(s.mraz_done)        return s.mraz_reward_given ? 4 : 5;
      if(s.kubatova_quest)   return 4;
      if(s.mraz_explain_line === 2) return 3;
      if(s.mraz_explain_line === 1) return 2;
      if(s.mraz_explain_line === 0) return 1;
      return 0;
    case 'johnny_vila':
      if(s.johnny_webovka_ready && !s.johnny_webovka_done) return 4;
      if(s.johnny_return_visit) return 3;
      if(s.jana_drugged_villa && !s.johnny_villa_rewards) return 2;
      if(s.johnny_cuffed) return 1;
      return 0;
    case 'jana_vila':
      if(s.johnny_return_visit) return 2;
      if(s.johnny_cuffed) return 1;
      return 0;
    default: return 0;
  }
}

// ─── Typing efekt ────────────────────────────────────────────────────────
let _typeTimer = null;
function typeText(el, text, speed = 18){
  if(_typeTimer) clearInterval(_typeTimer);
  el.textContent = '';
  let i = 0;
  _typeTimer = setInterval(() => {
    if(i < text.length){
      el.textContent += text[i];
      i++;
    } else {
      clearInterval(_typeTimer);
      _typeTimer = null;
    }
  }, speed);
}

// ─── showDialog ───────────────────────────────────────────────────────────

function showDialog(npc){
  // Figurová nás sleduje – nelze s ní mluvit
  if(npc.id === 'figurova' && gs.story.figurova_following && !gs.story.figurova_at_door){
    addLog('Figurová tě sleduje. Zaveď ji ke sklepu v Bille.', 'ls');
    return;
  }
  const stage = getStage(npc.id);
  const d     = NPCS[npc.id].dialogs[stage];
  if(!d) return;

  document.getElementById('dav').textContent   = npc.emoji;
  document.getElementById('dname').textContent = npc.name.toUpperCase();
  document.getElementById('drole').textContent = npc.role;
  typeText(document.getElementById('dtxt'), d.text, 16);

  let choices = [...d.choices];

  // ─ Nastavit milan_met při prvním setkání ──────────────────────────────
  if(npc.id === 'milan' && !gs.story.milan_met) gs.story.milan_met = true;

  // ─ Pája v hospodě – spustit 180s timer na krádež ──────────────────────
  if(npc.id === 'paja' && stage === 2 && !gs.story.paja_jackpot_timer_started){
    gs.story.paja_jackpot_timer_started = true;
    setTimeout(() => {
      if(!gs.story.paja_stolen){
        gs.story.paja_stolen = true;
        addLog('📱 SMS od Páji: "Fando, dojdi za mnou prosím, stalo se něco."', 'lw');
        fnotif('Pája volá! 📱', 'lw');
      }
    }, 180000);
  }

  // ─ Dynamické volby ────────────────────────────────────────────────────
  if(npc.id === 'milan'){
    // Milan – proč ho Figurová nemá ráda (nový flow)
    if(gs.story.figurova === 1 && !gs.story.milan_explained_figurova && !gs.story.milan_fig_evidence && !gs.story.milan_protiutok_asked)
      choices.push({label:'🤔 "Proč tě Figurová nemá ráda?"', cls:'special', fn:'q_milan_explain_figurova'});
    // Po vysvětlení – "Vyhrožovala Matesovi?"
    if(gs.story.milan_explained_figurova && !gs.story.milan_showed_threats && !gs.story.milan_fig_evidence)
      choices.push({label:'😳 "Vyhrožovala Matesovi?"', cls:'special', fn:'q_milan_threats'});
    // Po ukázání hrozeb – nabídne důkazy
    if(gs.story.milan_showed_threats && !gs.story.milan_fig_evidence && !gs.story.milan_protiutok_asked)
      choices.push({label:'🕵️ "Ukaž mi ty důkazy"', cls:'special', fn:'q_milan_fig'});
    // Protiútok – říct pravdu Milanovi
    if(gs.story.figurova === 1 && gs.story.milan_met && !gs.story.milan_protiutok_asked
        && !gs.story.milan_fig_evidence)
      choices.push({label:'🕵️ Figurová mě na tebe poslala...', cls:'danger', fn:'q_milan_protiutok', sub:'Říct Milanovi pravdu'});
    if(gs.story.figurova_kratomed && !gs.story.milan_protiutok_done)
      choices.push({label:'✅ Figurová vyřízena', cls:'prim', fn:'q_milan_protiutok_reward'});
  }
  if(npc.id === 'mates'){
    if(!gs.story.mates_zemle && !gs.story.mates_dead)
      choices.push({label:'🍕 Dát Matesovi žemli', cls:'prim', fn:'q_mates_zemle'});
    if(gs.story.figurova_dark_contract && gs.inv.fig_nuz && !gs.story.mates_dead)
      choices.push({label:'🗡️ (Použít nůž)', cls:'danger', fn:'q_mates_kill', sub:'Kontrakt od Figurové'});
  }
  if(npc.id === 'mikulas' && gs.story.krejci === 1 && !gs.story.krejci_resolved && !gs.story.mikulas_confronting)
    choices.push({label:'📄 "Bude ho to mrzet...?"', cls:'special', fn:'q_mik_confront', sub:'Povědomá fráze'});
  // Johnny rande – potvrdit Janu (zobraz jen když Jana souhlasila)
  if(npc.id === 'johnny' && gs.story.johnny === 1 && gs.story.jana_rande_ok)
    choices.push({label:'✅ Jana souhlasí', cls:'prim', fn:'q_johnny_confirm'});
  // Jana – koupit žemli v Bille
  if(npc.id === 'jana_kosova' && gs.room === 'billa')
    choices.push({label:'🍕 Koupit žemli (35 Kč)', cls:'prim', fn:'q_jana_buy_zemle', sub:'Billa freshness guarantee'});
  // Jana – poděkování po záchraně z vily
  if(npc.id === 'jana_kosova' && gs.room === 'billa' && gs.story.jana_rescued_villa && !gs.story.jana_thanked)
    choices.push({label:'💅 "Jak se máš po tom, co se stalo?"', cls:'special', fn:'q_jana_thank'});
  // Jana – domluvit rande s Johnym
  if(npc.id === 'jana_kosova' && gs.story.johnny === 1 && !gs.story.jana_rande_ok){
    if(!gs.story.jana_rande_asked)
      choices.push({label:'🤝 Johnny tě chce vidět...', cls:'special', fn:'q_jana_rande'});
    if(gs.story.jana_rande_asked && gs.inv.blend > 0)
      choices.push({label:'🌿 Tady je ten blend', cls:'prim', fn:'q_jana_rande_confirm', sub:'Speciální blend od Mikuláše'});
  }
  // Honza – práce ještě není hotová (Číhalová skolabovala ale nespálena)
  if(npc.id === 'honza' && gs.cihalova_collapsed && !gs.story.cihalova_burned)
    choices.push({label:'💀 "Číhalová leží..."', cls:'danger', fn:'q_honza_not_done'});
  // Honza – vyzvednout cibuli (po spálení)
  if(npc.id === 'honza' && gs.story.cihalova_burned && !gs.story.honza_cibule_given)
    choices.push({label:'🔥 "Práce je hotová."', cls:'prim', fn:'q_honza_cibule_reward'});
  // Honza – propiska quest (po Milan protiutok, Figurová ještě naživu)
  if(npc.id === 'honza' && gs.story.milan_knows_fig_spy && !gs.story.figurova_killed
     && !gs.story.honza_propiska_asked && !gs.story.figurova_kratomed && !gs.story.figurova_dead_sklep)
    choices.push({label:'🤔 "Ty máš vždycky u sebe různé píčovinky..."', cls:'special', fn:'q_honza_propiska_ask'});
  if(npc.id === 'honza' && gs.story.honza_propiska_asked && !gs.story.honza_kapsy_prohledany)
    choices.push({label:'👜 "Prohledej kapsy"', cls:'special', fn:'q_honza_kapsy'});
  if(npc.id === 'honza' && gs.story.honza_kapsy_prohledany && !gs.story.honza_propiska_info_given)
    choices.push({label:'✏️ "Hele, ta propiska..."', cls:'special', fn:'q_honza_propiska_info'});
  if(npc.id === 'honza' && gs.story.honza_propiska_info_given && !gs.inv.propiska)
    choices.push({label:'✏️ "Dáš mi ji?"', cls:'prim', fn:'q_honza_get_propiska'});
  // Figurová – zeptat se na motiv (proč chce dostat Milana)
  if(npc.id === 'figurova' && gs.story.figurova === 1 && !gs.story.figurova_motive_explained
     && !gs.story.figurova_killed && !gs.story.figurova_kratomed)
    choices.push({label:'🤔 "Proč vám tak záleží na Milanovi?"', cls:'special', fn:'q_figurova_motive_ask', sub:'Osobní motiv'});
  // Figurová – certifikát jako důkaz (starý fallback)
  if(npc.id === 'figurova' && gs.story.figurova === 1 && gs.inv.cert && !gs.story.milan_fig_evidence && !gs.story.figurova_kratomed)
    choices.push({label:'📋 Předložit certifikát jako důkaz', cls:'special', fn:'q_figurova_cert', sub:'Figurová to nějak uzná'});
  // Figurová – předat screenshot (dark path)
  if(npc.id === 'figurova' && gs.story.figurova === 1 && gs.inv.screenshot && !gs.story.figurova_dark_started && !gs.story.figurova_kratomed)
    choices.push({label:'📱 Tady je váš důkaz.', cls:'special', fn:'q_figurova_deliver_screenshot', sub:'Screenshot + hlasovka'});
  // Figurová – odměna po dark path vraždách
  if(npc.id === 'figurova' && gs.story.figurova_dark_started && gs.story.mates_dead && (gs.story.milan_shot || gs.story.milan_voodoo_dead) && !gs.story.figurova_dark_done)
    choices.push({label:'✅ Práce hotová.', cls:'prim', fn:'q_figurova_dark_reward'});
  // Figurová – kratom do kafe (jen REP < 50)
  if(npc.id === 'figurova' && gs.story.figurova === 1 && gs.inv.kratom_kava && !gs.story.figurova_kratomed && gs.rep < 50)
    choices.push({label:'☕ Přimíchat kratom do kafe', cls:'danger', fn:'q_figurova_kratom', sub:'Milan by byl potěšen'});
  // Figurová – sklep lákadlo (Možnost 1, odemčeno po Kubátová questu)
  if(npc.id === 'figurova' && gs.story.milan_knows_fig_spy
     && (gs.story.mraz_done || gs.story.sklep_unlocked)
     && !gs.story.figurova_sklep_started && !gs.story.figurova_killed
     && !gs.story.figurova_kratomed && !gs.story.figurova_dark_done)
    choices.push({label:'🕳️ "Špicloval jsem Milana. Mám pro tebe dobrou zprávu."', cls:'special', fn:'q_figurova_sklep_start', sub:'Odemčeno – byl jsi v sklepě'});
  // Figurová – omluvenka (Možnost 2, po Milan protiutok, Figurová ještě naživu)
  if(npc.id === 'figurova' && gs.story.milan_knows_fig_spy
     && !gs.story.figurova_killed && !gs.story.figurova_omluvenka_asked
     && !gs.story.figurova_sklep_started && !gs.story.figurova_kratomed && !gs.story.figurova_dark_done)
    choices.push({label:'📝 "Mohla byste mi podepsat omluvenku?"', cls:'special', fn:'q_figurova_omluvenka_ask'});
  // Figurová – znovu omluvenka (po zmaru)
  if(npc.id === 'figurova' && gs.story.figurova_omluvenka_failed && !gs.story.figurova_killed)
    choices.push({label:'📝 "Mohla byste mi podepsat omluvenku?"', cls:'special', fn:'q_figurova_omluvenka_fail2'});
  // Figurová – nabídnout propisku (když sahá pro tužku)
  if(npc.id === 'figurova' && gs.story.figurova_omluvenka_asking && gs.inv.propiska > 0)
    choices.push({label:'✏️ "Přinesl jsem propisku ze Švýcarska – musíte zkusit."', cls:'danger', fn:'q_figurova_propiska_offer', sub:'Šoková propiska'});
  if(npc.id === 'figurova' && gs.story.figurova_omluvenka_asking && !gs.story.figurova_killed && !(gs.inv.propiska > 0))
    choices.push({label:'📝 Podepsat omluvenku', fn:'q_figurova_omluvenka_no_propiska'});
  // Bezďák – dát cibuli (odkrytí Cibulky)
  if(npc.id === 'bezdak' && (gs.story.bezdak||0) >= 1 && gs.inv.cibule > 0 && !gs.story.bezdak_cibulka)
    choices.push({label:'🧅 Dát cibuli', cls:'special', fn:'q_bezdak_give_cibule'});
  // Villa – spoutat Johnnyho želízky
  if(npc.id === 'johnny_vila' && gs.inv.zelizka && !gs.story.johnny_cuffed)
    choices.push({label:'⛓️ Spoutat Johnnyho', cls:'prim', fn:'q_johnny_cuff'});
  // Villa – požádat o webovky (jen stage 3, kartička v inventáři, ještě nepožádáno)
  if(npc.id === 'johnny_vila' && gs.story.johnny_return_visit && gs.inv.membership_vaza && !gs.story.johnny_webovka_asked && !gs.story.johnny_webovka_done)
    choices.push({label:'💻 "Johny, udělej mi webovky."', cls:'special', fn:'q_johnny_webovka', sub:'Vaza Systems membership'});

  // Milan – 1. varování (dynamic, zobrazí se jen při stage 0/1)
  if(npc.id === 'milan' && gs.story.kubatova_quest && !gs.story.milan_warn_count && !gs.story.mraz_done && !gs.story.milan_voodoo_dead)
    choices.push({label:'⚠️ "Milan, musíš zmizet z Křemže"', cls:'special', fn:'q_milan_warn'});
  // Milan – požádat o telefon (dark path)
  if(npc.id === 'milan' && gs.story.figurova_dark_contract && gs.story.mates_dead && !gs.story.milan_phone_taken && !gs.story.milan_shot)
    choices.push({label:'📲 "Půjč mi na chvíli mobil."', cls:'special', fn:'q_milan_give_phone', sub:'Kvůli důkazům'});
  // Milan – zastřelit (dark path, po Matesovi)
  if(npc.id === 'milan' && gs.story.figurova_dark_contract && gs.story.mates_dead && gs.inv.fig_gun && !gs.story.milan_shot)
    choices.push({label:'🔫 (Použít zbraň)', cls:'danger', fn:'q_milan_shoot', sub:'Kontrakt od Figurové'});

  // ─ Pája theft quest – dynamické volby ─────────────────────────────────
  // Pája – dát pytel peněz
  if(npc.id === 'paja' && gs.inv.pytel_penez > 0 && gs.story.paja_stolen && !gs.story.paja_quest_done)
    choices.push({label:'💰 Dát Pájovi pytel peněz', cls:'prim', fn:'q_paja_give_pytel'});
  // Johnny – zeptat se na krádež
  if(npc.id === 'johnny' && gs.story.paja_stolen && !gs.story.paja_johnny_asked)
    choices.push({label:'🤔 "Víš náhodou o Pájových penězích?"', cls:'special', fn:'q_paja_ask_johnny'});
  // Mates – zeptat se o Pájových penězích
  if(npc.id === 'mates' && gs.story.paja_stolen && !gs.story.paja_mates_done && !gs.story.mates_dead)
    choices.push({label:'🍺 "Víš o Pájových penězích?"', cls:'special', fn:'q_paja_ask_mates'});
  // Mikuláš – konfrontovat o bundě
  if(npc.id === 'mikulas' && gs.story.paja_mates_done && !gs.story.paja_mik_confronted)
    choices.push({label:'👊 "Viděli tě u Pájovy bundy."', cls:'danger', fn:'q_paja_confront_mik'});
  // Bezďák – zeptat se o Mikulášovi (jen pokud je hotová KGB minihra – Cibulka ti věří až po testu)
  if(npc.id === 'bezdak' && gs.story.paja_mik_confessed && gs.story.kgb_won && !gs.story.paja_cibulka_detector){
    if(gs.story.bezdak_cibulka)
      choices.push({label:'🔍 "Posílal jsi Mikuláše krást Pájovy prachy."', cls:'danger', fn:'q_paja_ask_cibulka'});
    else
      choices.push({label:'🔍 "Posílal jsi Mikuláše?"', cls:'special', fn:'q_paja_ask_bezdak'});
  }
  // Bezďák – promluvit po KGB vítězství (jen jednou)
  if(npc.id === 'bezdak' && gs.story.kgb_won && !gs.story.kgb_cibulka_talked)
    choices.push({label:'🤝 "Co ty na to KGB, Cibulka?"', cls:'prim', fn:'q_cibulka_farewell'});

  // Krejčí – konfrontovat po skenování
  if(npc.id === 'krejci' && gs.story.paja_krejci_red && !gs.story.paja_pytel_taken)
    choices.push({label:'🔴 "Odhalil jsem vás, Krejčí."', cls:'danger', fn:'q_paja_confront_krejci'});

  document.getElementById('dchoices').innerHTML = choices.map(c => `
    <button class="db ${c.cls || ''}" onclick="runQF('${c.fn}')">
      ${c.label}${c.sub ? `<span class="dc">${c.sub}</span>` : ''}
    </button>`).join('');

  document.getElementById('dov').classList.add('on');
}

function closeDialog(){
  document.getElementById('dov').classList.remove('on');
  // Reset kláves aby pohyb nezůstal zamrzlý po zavření dialogu
  for(const k in keys) keys[k] = false;
  // Zajistit, že hráč se může hýbat
  gs.player.mv = false;
}
function runQF(fn){
  if(typeof QF[fn] === 'function') QF[fn]();
  else addLog('Bug: ' + fn, 'lw');
}

// ─── NPC linka – dialogové okno s tlačítkem Pokračovat ───────────────────────
function showNPCLine(npcId, text, callback){
  const npc = NPCS[npcId];
  if(!npc){ if(callback) callback(); return; }
  document.getElementById('dav').textContent   = npc.emoji;
  document.getElementById('dname').textContent = npc.name.toUpperCase();
  document.getElementById('drole').textContent = npc.role;
  typeText(document.getElementById('dtxt'), text, 16);
  document.getElementById('dchoices').innerHTML =
    `<button class="db prim" onclick="closeNPCLine()">Pokračovat</button>`;
  gs._npcLineCallback = callback || null;
  document.getElementById('dov').classList.add('on');
}
function closeNPCLine(){
  document.getElementById('dov').classList.remove('on');
  for(const k in keys) keys[k] = false;
  gs.player.mv = false;
  const cb = gs._npcLineCallback;
  gs._npcLineCallback = null;
  if(cb) setTimeout(cb, 150);
}

// ─── Promluva hráče ──────────────────────────────────────────────────────────
function showPlayerLine(text, callback){
  const box = document.getElementById('dbox');
  box.classList.add('player-mode');
  document.getElementById('dav').textContent   = '🎒';
  document.getElementById('dname').textContent = 'FANDA';
  document.getElementById('drole').textContent = '';
  typeText(document.getElementById('dtxt'), text, 16);
  document.getElementById('dchoices').innerHTML =
    `<button class="db prim" onclick="closePlayerLine()">Pokračovat</button>`;
  gs._playerLineCallback = callback || null;
  document.getElementById('dov').classList.add('on');
}
function closePlayerLine(){
  document.getElementById('dbox').classList.remove('player-mode');
  document.getElementById('dov').classList.remove('on');
  for(const k in keys) keys[k] = false;
  gs.player.mv = false;
  const cb = gs._playerLineCallback;
  gs._playerLineCallback = null;
  if(cb) setTimeout(cb, 150);
}

function showNote(){ document.getElementById('note-ov').classList.add('on'); }
function closeNote(){ document.getElementById('note-ov').classList.remove('on'); }

function showArtDetail(emoji, name, desc, url, imgSrc, audioSrc){
  document.getElementById('art-detail-emoji').textContent = emoji;
  document.getElementById('art-detail-name').textContent = name;
  document.getElementById('art-detail-desc').textContent = desc;

  // Obrázek
  const img = document.getElementById('art-detail-img');
  if(imgSrc){ img.src = imgSrc; img.style.display = 'block'; img.onclick = e => e.stopPropagation(); }
  else { img.style.display = 'none'; img.src = ''; }

  // Audio nahrávka
  const aud = document.getElementById('art-detail-audio');
  if(audioSrc){ aud.src = audioSrc; aud.style.display = 'block'; aud.onclick = e => e.stopPropagation(); }
  else { aud.style.display = 'none'; aud.src = ''; if(aud.pause) aud.pause(); }

  // Webový odkaz
  const btn = document.getElementById('art-detail-open-btn');
  if(url){
    btn.style.display = 'inline-block';
    btn.onclick = (e) => { e.stopPropagation(); window.open(url, '_blank'); };
  } else {
    btn.style.display = 'none';
  }
  document.getElementById('art-detail-ov').classList.add('on');
}
function closeArtDetail(){
  const aud = document.getElementById('art-detail-audio');
  if(aud && aud.pause) aud.pause();
  document.getElementById('art-detail-ov').classList.remove('on');
}

function showScreenshot(){ document.getElementById('screenshot-ov').classList.add('on'); }
function closeScreenshot(){ document.getElementById('screenshot-ov').classList.remove('on'); }
function playHlasovka(){
  const a = document.getElementById('hlasovka-audio');
  if(a.paused){ a.play().catch(()=>{}); document.getElementById('screenshot-play-btn').textContent = '⏸ Pauza'; }
  else { a.pause(); document.getElementById('screenshot-play-btn').textContent = '▶ Přehrát hlasovku'; }
}

function showFotoKubatova(){ document.getElementById('foto-kubatova-ov').classList.add('on'); }
function closeFotoKubatova(){ document.getElementById('foto-kubatova-ov').classList.remove('on'); }

function showC2Cert(){ document.getElementById('c2-cert-ov').classList.add('on'); }
function closeC2Cert(){ document.getElementById('c2-cert-ov').classList.remove('on'); }

function showMaturita(){ document.getElementById('maturita-ov').classList.add('on'); }
function closeMaturita(){ document.getElementById('maturita-ov').classList.remove('on'); }
