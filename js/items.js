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

  // Spustí rovnou intenzivní kratom trip (delší trvání)
  gs.kratom_on = true;
  gs.kratom_blend_on = true;
  gs.kratom_t = gs.blend_max;
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

// ─── Elixír mládí ─────────────────────────────────────────────────────────
function useElixir(){
  if(!gs.inv.elixir){ addLog('Nemáš elixír!','lw'); return; }
  if(gs.elixir_active){ addLog('Elixír ještě účinkuje!','lw'); return; }
  gs.inv.elixir = 0; updateInv();
  gs.elixir_active = true;
  gs.elixir_end = gs.ts + 60000; // 60 sekund trip
  canvas.classList.add('elixir-trip');
  addLog('🧪 Vypil jsi elixír mládí! Svět se obrátil vzhůru nohama...', 'lm');
  fnotif('🧪 ELIXÍR MLÁDÍ!', 'itm');
  gainRep(5, 'Ochutnal šamanův elixír');
}

function endElixir(){
  gs.elixir_active = false;
  canvas.classList.remove('elixir-trip');
  addLog('Účinky elixíru vyprchaly. Cítíš se... jiný.', 'ls');
  fnotif('🧪 Elixír vyprchal', 'info');
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
  Phone.addSms('Honza', '🧑‍🦱', 'Tak co? Hotovo? Přijď za mnou 🔥', 'sms_honza_burn');
  Phone.addDiary('Číhalová spálena', 'Hodil jsem Číhalovou v pytli do krbu v hospodě. Důkazy zničeny. Honza čeká na zprávu v Křemži.', 'diary_cihalova_burn');
  Phone.addPost('kremze_info', '🏠', '🔥🏫', 'Křemže Info: V místní hospodě cítit podivný zápach. Hasiči zatím nepovoláni. #kremze #wtf', 37, 'kg_cihalova_burn');
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

// Johnny dožene hráče – animace útoku před death screenem
function triggerJohnnyKillAnim(){
  gs.running = false;
  gs.johnny_kill_anim = { t0: gs.ts, phase: 1 };
  screenShake(300);
  addLog('*Johnny tě dohnal!* "TAK TY SI ZDE MYSLÍŠ..."', 'lw');
  setTimeout(() => {
    screenShake(500);
    addLog('💥 *BUM!* Johnny tě praštil pistolí do hlavy.', 'lw');
    gs.johnny_kill_anim.phase = 2;
  }, 900);
  setTimeout(() => {
    screenShake(600);
    gs.johnny_kill_anim.phase = 3;
  }, 1400);
  setTimeout(() => {
    gs.johnny_kill_anim = null;
    triggerDeath('Johnny tě dohnal a praštil pistolí do hlavy.\nMěl jsi utéct rychleji.', 'DOSTIŽEN JOHNNYM', 'KONEC HRY · KŘEMŽE PLÁČE', 'death_johnny');
  }, 2400);
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


// ─── Janina sklenice – nasypání prášku ───────────────────────────────────

function useGlassDrug(){
  if(!gs.inv.sklenice_jana){ addLog('Nemáš sklenici.','lw'); return; }
  if(!gs.inv.prasek){
    addLog('Nemáš prášek na nasypání. Najdi ho v šuplíku ve villce.','lw');
    return;
  }
  gs.story.drink_drugged = true;
  gs.inv.prasek -= 1; updateInv();
  addLog('*Opatrně vysypeš prášek do sklenice. Rozpustí se okamžitě.*', 'lw');
  fnotif('💊 Drink otrávený', 'rep');
}

// ─── Janina × Johnny questline animace ──────────────────────────────────

function triggerJanaToFireplace(){
  const jana = currentNPCs.find(n => n.id === 'jana_kosova');
  const fp = ROOMS.hospoda.fireplace;
  const krbX = fp.rx * canvas.width, krbY = fp.ry * canvas.height + canvas.height * 0.30;
  if(jana){
    gs.jana_to_fireplace_anim = {
      phase: 'walking',
      x: jana.x, y: jana.y,
      targetX: krbX - 35, targetY: krbY,
      flipX: krbX < jana.x ? -1 : 1,
      t0: gs.ts,
    };
    // Odebrat Janu z normálního NPC pole – budeme ji renderovat sami
    currentNPCs = currentNPCs.filter(n => n.id !== 'jana_kosova');
  }
}

function triggerJanaToBathroom(){
  // Jana odejde do koupelny s hadrem, zamkne se
  const W = canvas.width, H = canvas.height;
  const jana = currentNPCs.find(n => n.id === 'jana_vila');
  const startX = jana ? jana.x : W * 0.35, startY = jana ? jana.y : H * 0.55;
  gs.jana_to_bathroom_anim = {
    phase: 'walking',
    x: startX, y: startY,
    targetX: W * 0.92, targetY: H * 0.40,
    t0: gs.ts,
  };
  currentNPCs = currentNPCs.filter(n => n.id !== 'jana_vila');
  setTimeout(() => {
    gs.story.jana_in_bathroom_locked = true;
    gs.jana_to_bathroom_anim = null;
    fnotif('🔒 Koupelna zamčená', 'pos');
    showNPCLine('jana_vila', '*Cvak.* Dveře koupelny se zamknou zevnitř. Slyšíš šplouchání vody.', () => {
      setTimeout(() => triggerBathroomFlood(), 2500);
    });
  }, 3000);
}

function triggerBathroomFlood(){
  if(gs.bathroom_flood_anim) return;
  gs.bathroom_flood_anim = { progress: 0, startTime: gs.ts, johnnyBroke: false };
  fnotif('💧 Povodeň začíná', 'rep');
  showNPCLine('jana_vila', '*Pod dveřmi koupelny se začíná rozlévat voda...* 💧 Slyšíš Janin smích za dveřmi.');
}

// Johnny vstoupí do koupelny se zbraní – gun scene (voláno když hráč vstoupí do koupelny po johnnyBroke)
function triggerJohnnyGunScene(){
  if(gs.story.gun_scene_done) return;
  gs.story.gun_scene_done = true;
  gs.running = false;
  gs.cutscene_active = true;

  // Dodge minigame state
  gs.dodge = {
    phase: 'intro',        // intro → aim1 → dodge1 → result1 → aim2 → dodge2 → result2 → flee
    t0: gs.ts,
    shotNum: 0,
    dodgeDir: null,        // 'left' or 'right' — required direction
    dodgeWindow: 1600,     // ms to react (1st shot)
    dodgeStart: 0,         // timestamp when dodge window opens
    playerDodged: false,
    playerPos: 0,          // -1 left, 0 center, 1 right
    hitFlash: 0,
    successFlash: 0,
    slowmo: 0,             // slowmo timestamp for dramatic effect
    hitCount: 0,           // 0=clean, 1=wounded, 2=dead
  };

  setTimeout(() => {
    showNPCLine('johnny_vila',
      '*Johnny stojí uprostřed zatopené koupelny. Pomalu vytáhne pistoli zpod saka. Ruce se mu třesou.*',
      () => setTimeout(() => {
        showNPCLine('johnny_vila',
          '"TY KURVA JANO! Tys mi tady schválně vytopila celý barák?!"',
          () => setTimeout(() => {
            showNPCLine('johnny_vila',
              '*Namíří pistoli na tebe.* "Já tě naučím úctu, zlatíčko."',
              () => setTimeout(() => _startDodgeRound(1), 400)
            );
          }, 300)
        );
      }, 300)
    );
  }, 600);
}

function _startDodgeRound(shotNum){
  const d = gs.dodge;
  if(!d) return;
  d.shotNum = shotNum;
  d.dodgeDir = Math.random() < 0.5 ? 'left' : 'right';
  d.dodgeWindow = shotNum === 1 ? 1600 : 1200; // 2. výstřel těžší
  d.playerDodged = false;
  d.playerPos = 0;
  d.phase = 'aim' + shotNum;
  d.t0 = gs.ts;

  setTimeout(() => {
    d.phase = 'dodge' + shotNum;
    d.dodgeStart = gs.ts;
    d.playerDodged = false;
    d.playerPos = 0;
    // Input listener
    const onDodge = (e) => {
      if(d.phase !== 'dodge' + shotNum) return;
      const k = e.key.toLowerCase();
      const pressedLeft = k === 'a' || k === 'arrowleft';
      const pressedRight = k === 'd' || k === 'arrowright';
      if(!pressedLeft && !pressedRight) return;
      d.playerPos = pressedLeft ? -1 : 1;
      const correct = (pressedLeft && d.dodgeDir === 'left') || (pressedRight && d.dodgeDir === 'right');
      if(correct){
        d.playerDodged = true;
        window.removeEventListener('keydown', onDodge);
      } else {
        // Špatný směr – krátký trest (ztráta času + vizuální feedback)
        d.dodgeStart -= 300; // urychlí countdown
        screenShake(150);
      }
    };
    window.addEventListener('keydown', onDodge);
    d._dodgeListener = onDodge;
  }, 1200);
}

function _dodgeEndFlee(){
  const d = gs.dodge;
  if(!d) return;
  d.phase = 'flee';
  if(d.hitCount > 0){
    showNPCLine('johnny_vila',
      '*Noha tě pálí, ale stojíš. Johnny mrští pistolí o zeď.*',
      () => setTimeout(() => {
        showNPCLine('jana_vila',
          '"UTÍKEJ, HRUBEŠI!!!" *Jana tě chytí za ruku*',
          () => {
            fnotif('🏃 UTÍKEJ! (postřelená noha)', 'rep');
            setTimeout(() => triggerJanaFleeVilla(), 500);
          }
        );
      }, 400)
    );
  } else {
    showNPCLine('johnny_vila',
      '*Johnny mrští pistolí o zeď. Došly mu náboje.*',
      () => setTimeout(() => {
        showNPCLine('jana_vila',
          '"UTÍKEJ, HRUBEŠI!!!" *Jana tě chytí za ruku*',
          () => {
            fnotif('🏃 UTÍKEJ Z VILY!', 'pos');
            setTimeout(() => triggerJanaFleeVilla(), 500);
          }
        );
      }, 400)
    );
  }
}

function _dodgeUpdate(){
  const d = gs.dodge;
  if(!d) return;
  const shotNum = d.shotNum;

  if(d.phase === 'dodge' + shotNum && d.dodgeStart > 0){
    const elapsed = gs.ts - d.dodgeStart;

    if(d.playerDodged){
      d.phase = 'result' + shotNum;
      d.successFlash = gs.ts;
      d.slowmo = gs.ts;
      if(d._dodgeListener) window.removeEventListener('keydown', d._dodgeListener);
      screenShake(400);
      if(shotNum === 1){
        gs.story.gun_shot1 = true; gs._shot1t = gs.ts;
      } else {
        gs.story.gun_shot2 = true; gs._shot2t = gs.ts;
      }
      setTimeout(() => {
        if(shotNum === 1){
          showNPCLine('johnny_vila',
            '"STŮJ, KURVA!" *Johnny přebíjí, ruce se mu třesou vzteky*',
            () => setTimeout(() => _startDodgeRound(2), 600)
          );
        } else {
          _dodgeEndFlee();
        }
      }, 1400);
      return;
    }

    if(elapsed > d.dodgeWindow){
      d.hitCount++;
      if(d._dodgeListener) window.removeEventListener('keydown', d._dodgeListener);
      screenShake(500);
      d.hitFlash = gs.ts;
      if(shotNum === 1){
        gs.story.gun_shot1 = true; gs._shot1t = gs.ts;
      } else {
        gs.story.gun_shot2 = true; gs._shot2t = gs.ts;
      }

      if(d.hitCount >= 2){
        d.phase = 'dead';
        setTimeout(() => {
          gs.cutscene_active = false;
          gs.dodge = null;
          triggerDeath(
            'Johnnyho kulky tě zasáhly obě. Neměl jsi šanci.\nKřemže tě bude postrádat. Možná.',
            'ZASTŘELEN JOHNNYM',
            'KONEC HRY · UHÝBEJ PŘÍŠTĚ',
            'death_johnny_gun'
          );
        }, 1500);
        return;
      }

      d.phase = 'hit' + shotNum;
      gs.story.leg_shot = true;
      setTimeout(() => {
        if(shotNum === 1){
          showNPCLine('johnny_vila',
            '*Kulka tě škrábla do nohy! Koleno ti hoří bolestí, ale stojíš.* Johnny přebíjí.',
            () => {
              fnotif('🩸 Postřelená noha!', 'rep');
              setTimeout(() => _startDodgeRound(2), 600);
            }
          );
        } else {
          _dodgeEndFlee();
        }
      }, 1400);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAZE ESCAPE MINIGAME – top-down bludiště, hráč utíká z vily
// ═══════════════════════════════════════════════════════════════════

// Mapa bludiště – 1=zeď, 0=cesta(tečka), 2=start, 3=exit, 7=power pellet
const MAZE_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,1],
  [1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1],
  [1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,1,0,1],
  [1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,0,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,0,1,1,1,1,1,0,1,1,1,0,1],
  [1,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,0,0,3],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
const MAZE_ROWS = MAZE_MAP.length;
const MAZE_COLS = MAZE_MAP[0].length;

function _mazeHideUI(hide){
  const ids = ['rpanel','map-card','inv','lpanel','room-name','cL','cR','cU','cD','music-btn'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = hide ? 'none' : '';
  });
}

function triggerJanaFleeVilla(){
  gs.story.jana_fleeing = true;
  gs.story.johnny_chasing = true;
  gs.cutscene_active = false;
  gs.dodge = null;
  gs.running = true;

  _mazeHideUI(true);

  let startR=7, startC=1, exitR=7, exitC=14;
  for(let r=0;r<MAZE_ROWS;r++) for(let c=0;c<MAZE_COLS;c++){
    if(MAZE_MAP[r][c]===2){startR=r;startC=c;}
    if(MAZE_MAP[r][c]===3){exitR=r;exitC=c;}
  }

  gs.maze = {
    t0: gs.ts,
    px: startC + 0.5, py: startR + 0.5,
    jx: 33.5, jy: 1.5,
    jDelay: gs.ts + 3000,
    exitR, exitC,
    bullets: [],
    lastShot: gs.ts + 4000,
    won: false,
    dead: false,
    jPath: [],
    jPathT: 0,
    shakeT: 0,
    intro: true,
    introEnd: gs.ts + 2200,
    introDoorX: 33.5, introDoorY: 0.5,
  };

  gs.room = 'maze_escape';
  screenShake(400);
}

function _mazeWall(r,c){
  if(r<0||r>=MAZE_ROWS||c<0||c>=MAZE_COLS) return true;
  return MAZE_MAP[r][c] === 1;
}

// BFS pathfinding pro Johnnyho
function _mazeBFS(sr,sc,er,ec){
  const q=[[sr,sc]], visited=new Set(), prev=new Map();
  visited.add(sr+','+sc);
  const dirs=[[0,1],[0,-1],[1,0],[-1,0]];
  while(q.length){
    const [r,c]=q.shift();
    if(r===er&&c===ec){
      const path=[];
      let cur=er+','+ec;
      while(cur){path.unshift(cur.split(',').map(Number));cur=prev.get(cur);}
      return path;
    }
    for(const [dr,dc] of dirs){
      const nr=r+dr,nc=c+dc,k=nr+','+nc;
      if(!visited.has(k)&&!_mazeWall(nr,nc)){
        visited.add(k);prev.set(k,r+','+c);q.push([nr,nc]);
      }
    }
  }
  return [];
}

function _mazeUpdate(dt){
  const m = gs.maze;
  if(!m || m.won || m.dead) return;
  const FRAME_MS = 16.67;
  const tNorm = dt / FRAME_MS;
  const wounded = gs.story.leg_shot;

  // Intro fáze – Johnny vyběhne z koupelny
  if(m.intro){
    const ip = Math.min(1, (gs.ts - m.t0) / 2000);
    m.jx = m.introDoorX + (23.5 - m.introDoorX) * ip;
    m.jy = m.introDoorY + (1.5 - m.introDoorY) * ip;
    if(gs.ts >= m.introEnd) m.intro = false;
    return;
  }

  // Hráč pohyb
  const baseSpd = wounded ? 0.055 : 0.075;
  const spd = baseSpd * tNorm;
  let nx = m.px, ny = m.py;
  if(keys['w']||keys['ArrowUp'])    ny -= spd;
  if(keys['s']||keys['ArrowDown'])  ny += spd;
  if(keys['a']||keys['ArrowLeft'])  nx -= spd;
  if(keys['d']||keys['ArrowRight']) nx += spd;

  // Wobble při postřelení
  if(wounded){
    nx += Math.sin(gs.ts * 0.005) * 0.008 * tNorm;
  }

  // Kolize se zdí (kruh r=0.3)
  const pr = 0.3;
  if(!_mazeWall(Math.floor(ny), Math.floor(nx-pr)) &&
     !_mazeWall(Math.floor(ny), Math.floor(nx+pr)) &&
     !_mazeWall(Math.floor(ny-pr), Math.floor(nx)) &&
     !_mazeWall(Math.floor(ny+pr), Math.floor(nx)) &&
     !_mazeWall(Math.floor(ny-pr), Math.floor(nx-pr)) &&
     !_mazeWall(Math.floor(ny+pr), Math.floor(nx+pr)) &&
     !_mazeWall(Math.floor(ny-pr), Math.floor(nx+pr)) &&
     !_mazeWall(Math.floor(ny+pr), Math.floor(nx-pr))){
    m.px = nx; m.py = ny;
  } else {
    // Zkus osy zvlášť
    if(!_mazeWall(Math.floor(m.py),Math.floor(nx-pr)) &&
       !_mazeWall(Math.floor(m.py),Math.floor(nx+pr)) &&
       !_mazeWall(Math.floor(m.py-pr),Math.floor(nx)) &&
       !_mazeWall(Math.floor(m.py+pr),Math.floor(nx))){
      m.px = nx;
    }
    if(!_mazeWall(Math.floor(ny),Math.floor(m.px-pr)) &&
       !_mazeWall(Math.floor(ny),Math.floor(m.px+pr)) &&
       !_mazeWall(Math.floor(ny-pr),Math.floor(m.px)) &&
       !_mazeWall(Math.floor(ny+pr),Math.floor(m.px))){
      m.py = ny;
    }
  }

  // Exit check
  const exitDx = m.px-(m.exitC+0.5), exitDy = m.py-(m.exitR+0.5);
  if(exitDx*exitDx+exitDy*exitDy < 0.6){
    m.won = true;
    fnotif('🚪 UNIKL JSI!', 'pos');
    setTimeout(() => _mazeFinish(true), 600);
    return;
  }

  const jActive = !m.jDelay || gs.ts >= m.jDelay;

  if(jActive){
    // Johnny pathfinding (every 500ms)
    if(gs.ts - m.jPathT > 500){
      m.jPathT = gs.ts;
      m.jPath = _mazeBFS(Math.floor(m.jy),Math.floor(m.jx),Math.floor(m.py),Math.floor(m.px));
    }

    // Johnny movement
    const jSpd = (wounded ? 0.025 : 0.035) * tNorm;
    if(m.jPath.length > 1){
      const [tr,tc] = m.jPath[1];
      const tdx = (tc+0.5)-m.jx, tdy = (tr+0.5)-m.jy;
      const td = Math.sqrt(tdx*tdx+tdy*tdy);
      if(td > 0.1){
        m.jx += (tdx/td)*jSpd;
        m.jy += (tdy/td)*jSpd;
      } else {
        m.jPath.shift();
      }
    }
  }

  // Johnny catch check
  const cdx=m.px-m.jx, cdy=m.py-m.jy;
  if(cdx*cdx+cdy*cdy < 0.5){
    m.dead = true;
    m.shakeT = gs.ts;
    screenShake(500);
    fnotif('☠️ Johnny tě chytil!', 'rep');
    setTimeout(() => _mazeFinish(false), 800);
    return;
  }

  // Johnny střílí kulky (každé 3.5s, pokud vidí hráče)
  if(jActive && gs.ts - m.lastShot > 3500){
    const jr=Math.floor(m.jy), jc=Math.floor(m.jx);
    const prr=Math.floor(m.py), prc=Math.floor(m.px);
    let shootDir = null;
    if(jr===prr){
      // Stejná řada – kontrola přímé viditelnosti
      const minC=Math.min(jc,prc), maxC=Math.max(jc,prc);
      let clear=true;
      for(let c=minC+1;c<maxC;c++) if(_mazeWall(jr,c)){clear=false;break;}
      if(clear) shootDir = prc>jc ? [0,1] : [0,-1];
    } else if(jc===prc){
      const minR=Math.min(jr,prr), maxR=Math.max(jr,prr);
      let clear=true;
      for(let r=minR+1;r<maxR;r++) if(_mazeWall(r,jc)){clear=false;break;}
      if(clear) shootDir = prr>jr ? [1,0] : [-1,0];
    }
    if(shootDir){
      m.lastShot = gs.ts;
      m.bullets.push({x:m.jx, y:m.jy, dx:shootDir[1]*0.12, dy:shootDir[0]*0.12, t0:gs.ts});
      m.shakeT = gs.ts;
      screenShake(150);
    }
  }

  // Bullet update
  for(let i=m.bullets.length-1;i>=0;i--){
    const b = m.bullets[i];
    b.x += b.dx * tNorm;
    b.y += b.dy * tNorm;
    // Zeď = smazat
    if(_mazeWall(Math.floor(b.y),Math.floor(b.x))){
      m.bullets.splice(i,1); continue;
    }
    // Zásah hráče
    const bdx=b.x-m.px, bdy=b.y-m.py;
    if(bdx*bdx+bdy*bdy < 0.25){
      m.dead = true; m.shakeT = gs.ts;
      m.bullets.splice(i,1);
      screenShake(500);
      fnotif('💥 Zasažen kulkou!', 'rep');
      setTimeout(() => _mazeFinish(false), 800);
      return;
    }
    // Mimo mapu
    if(gs.ts - b.t0 > 3000) m.bullets.splice(i,1);
  }
}

function _mazeFinish(success){
  gs.maze = null;
  _mazeHideUI(false);
  if(success){
    gs.story.jana_escaped_success = true;
    gs.jana_escape_deadline = 0;
    gs.johnny_chase_pos = null;

    if(gs.story.leg_shot){
      gs.room = 'bandage_cutscene';
      gs.bandage_anim = { t0: gs.ts, phase: 'sit', done: false };
      addLog('*Vyběhls z vily. Koleno ti krvácí.*', 'lm');
      setTimeout(() => {
        addLog('*Jana si všimne krve na nohavici.* "Ježíši, on tě trefil! Sedni si."', 'lw');
        gs.bandage_anim.phase = 'bandage';
        gs.bandage_anim.t1 = gs.ts;
      }, 1500);
      setTimeout(() => {
        addLog('*Jana ti strhne kus látky z košile a pevně ovine nohu.*', 'lm');
        gs.bandage_anim.phase = 'wrap';
        gs.bandage_anim.t2 = gs.ts;
      }, 3500);
      setTimeout(() => {
        addLog('*"Tak. Vydrží to. Pojď, Hrubeši."*', 'lw');
        fnotif('🩹 Jana obvázala nohu', 'pos');
        gs.story.leg_bandaged = true;
        gs.bandage_anim.phase = 'done';
      }, 5500);
      setTimeout(() => {
        gs.bandage_anim = null;
        gs.room = 'kremze';
        initRoom(canvas.width*0.50, canvas.height*0.60);
        _mazeFinishCommon();
      }, 7000);
    } else {
      gs.room = 'kremze';
      initRoom(canvas.width*0.50, canvas.height*0.60);
      setTimeout(() => {
        addLog('*Vyběhls z vily. Jana stojí opodál, oddychuje.* "Díky... díky ti, Hrubeši."', 'lm');
        _mazeFinishCommon();
      }, 800);
    }
  } else {
    gs.cutscene_active = false;
    triggerDeath(
      'Johnny tě dostihl v chodbách vily. Měl jsi být rychlejší.\nKřemže tě bude postrádat. Možná.',
      'CHYCEN VE VILE',
      'KONEC HRY · PŘÍŠTĚ UTÍKEJ RYCHLEJI',
      'death_maze_escape'
    );
  }
}

function _mazeFinishCommon(){
  gainRep(12, 'Utekl s Janou z Johnnyho vily');
  gs.inv.klice_vila = 1; updateInv();
  gs.story.jana_rescued_villa = true;
  gs.story.johnny_villa_done = true;
  doneObj('side_johnny');
  fnotif('+12 REP','rep'); fnotif('Jana zachráněna 💅','pos'); fnotif('🔑 Klíče od vily','itm');
  addLog('Jana se vydá do Billy. Můžeš ji tam potkat.', 'ls');
}

// ═══════════════════════════════════════════════════════════════════
// RUSKÁ RULETA + JOHNNY MONOLOG
// ═══════════════════════════════════════════════════════════════════

function _showRouletteChoice(){
  const npc = NPCS.johnny_vila;
  document.getElementById('dav').textContent = npc.emoji;
  document.getElementById('dname').textContent = npc.name.toUpperCase();
  document.getElementById('drole').textContent = 'Ruská ruleta';
  document.getElementById('dtxt').textContent = '*Johnny ti podal revolver. Jedna kulka v bubínku. Co uděláš?*';
  document.getElementById('dchoices').innerHTML =
    `<button class="db danger" onclick="QF.q_roulette_refuse()">🚫 "Tohle dělat nebudu."</button>` +
    `<button class="db special" onclick="QF.q_roulette_shoot()">🔫 Sebrat koule a vystřelit</button>`;
  document.getElementById('dov').classList.add('on');
}

const _JOHNNY_MONOLOGUE = [
  {who:'j', text:'"Fando..." *přijde k tobě, revolver v ruce* "Myslel jsem, že jsme kamarádi."'},
  {who:'p', text:'"Johnny, uklidni se—"'},
  {who:'j', text:'"UKLIDNIT?!" *kopne do stolu, sklenice se roztříští* "Já jsem se UKLIDNIL! Celej život se kurva uklidňuju!"'},
  {who:'j', text:'"Víš co to je, mít firmu v Křemži? Vaza Systems?" *divoce gestikuluje revolverem* "Každej den vstaneš, sedneš si k počítači, a předstíráš, že tvůj e-shop s doplňky výživy je budoucnost."'},
  {who:'p', text:'"Johnny, polož tu zbraň. Můžeme si promluvit—"'},
  {who:'j', text:'"PROMLUVIT?!" *zasměje se, ale oči jsou mrtvé* "S kým? S tebou? S Janou, co utekla? S těma lidma v hospodě, co se mi smějou za zádama?"'},
  {who:'j', text:'"Víš proč jsem chtěl to rande? Protože Jana... ona se na mě podívala. Jednou. V Bille. A já jsem si myslel—" *hlas se mu zlomí* "—že možná nejsem úplně sám."'},
  {who:'p', text:'"Nejsi sám, Johnny. Já jsem tady—"'},
  {who:'j', text:'"TY JSI TADY PROTOŽE JSI MI VYTOPIL BARÁK!" *namíří na tebe, pak zase sklop* "Protože jsi mi zničil koupelnu. Protože jsi mě ponížil před jedinou ženskou, která se na mě podívala." *kroutí hlavou*'},
  {who:'p', text:'"To nebyla moje vina. Jana—"'},
  {who:'j', text:'"Jana nic! To jsi byl TY, Fando! TY jsi jí dal ten hadr! TY jsi to naplánoval!" *klepe se mu ruka* "A víš co je nejhorší? Že máš pravdu. Že jsem se choval jak debil. Ale to neznamená, že to nebolí."'},
  {who:'p', text:'"Máš pravdu, choval jsem se taky blbě. Ale zabít se? Tím nic nevyřešíš."'},
  {who:'j', text:'"ŘEŠIT?!" *zuří* "Co je tu k řešení?! Vaza Systems generuje tržby jak mrtvolnej e-shop! Jana utekla! Koupelna je pod vodou! A teď mi říkáš, že mám ŘEŠIT?!"'},
  {who:'j', text:'"Hele... hele..." *sedne si, dýchá zrychleně* "Já jsem měl plány, Fando. Měl jsem byznys plán. Expanze do Budějovic. Affiliate marketing. Dropshipping." *hořký smích* "A teď sedím v rozbité vile a hraju ruskou ruletu sám se sebou."'},
  {who:'p', text:'"Byznys plány můžeš přepsat. Koupelnu opravit. Ale tohle—" *ukážeš na revolver* "—tohle se neopraví."'},
  {who:'j', text:'*dlouhé ticho* "..." *oči mu těkají* "Víš co... víš co je taky divný?" *vstane, přechází po místnosti* "Že mě ty argumenty vůbec nezajímají."'},
  {who:'j', text:'"Protože já vím, Fando. Já VŽDYCKY věděl, že Vaza Systems je šrot. Že ten dropshipping je podvod. Že Jana mě nemiluje. Že nikdo mě nemiluje." *otočí se k tobě* "Ale hrál jsem tu hru. Každej den. Protože co jinýho ti zbývá v Křemži?"'},
  {who:'p', text:'"Johnny—"'},
  {who:'j', text:'"NE!" *pozvedne revolver ke spánku* "Dost! Dost řečí! Dost argumentů! Dost kurva VŠEHO!"'},
];

function _startJohnnyMonologue(){
  gs.johnny_monologue_anim = { phase:'talking', t0:gs.ts, lineIndex:0 };
  _playMonologueLine(0);
}

function _playMonologueLine(idx){
  if(idx >= _JOHNNY_MONOLOGUE.length){
    _endJohnnyMonologue();
    return;
  }
  const line = _JOHNNY_MONOLOGUE[idx];
  gs.johnny_monologue_anim.lineIndex = idx;
  const delay = line.text.length * 28 + 800;
  if(line.who === 'j'){
    showNPCLine('johnny_vila', line.text, () => {
      setTimeout(() => _playMonologueLine(idx+1), 400);
    });
  } else {
    showPlayerLine(line.text, () => {
      setTimeout(() => _playMonologueLine(idx+1), 400);
    });
  }
}

function _endJohnnyMonologue(){
  screenShake(600);
  addLog('💥 *BANG.*', 'lw');
  setTimeout(() => {
    addLog('*Johnny padá. Revolver klouže po podlaze. Ticho.*', 'lw');
    gs.story.johnny_dead = true;
    gs.johnny_monologue_anim = { phase:'dead', t0:gs.ts };
    setTimeout(() => {
      if(gs.story.leg_shot){
        addLog('*Ležíš na zemi. Obě rány v noze pulzují bolestí. Johnny leží vedle tebe. Navždy.*', 'lw');
      } else {
        addLog('*Ležíš na zemi s prostřeleným kolenem. Johnny leží vedle tebe. Navždy.*', 'lw');
      }
      fnotif('Johnny je mrtvý', 'rep');
      setTimeout(() => {
        gs.cutscene_active = false;
        gs.running = true;
        gs.story.johnny_monologue_over = true;
        addLog('Zvedneš se. Noha bolí, ale jdeš. Musíš jít.', 'ls');
      }, 3000);
    }, 2000);
  }, 1500);
}

// Render bludiště – Pac-Man styl
function drawMazeEscape(W,H,t){
  const m = gs.maze;
  if(!m) return;
  const cellW = W / MAZE_COLS;
  const cellH = H / MAZE_ROWS;
  const cs = Math.min(cellW, cellH);

  // Shake
  let sx=0,sy=0;
  if(m.shakeT && gs.ts - m.shakeT < 300){
    const sp = 1-(gs.ts-m.shakeT)/300;
    sx = (Math.random()-0.5)*8*sp;
    sy = (Math.random()-0.5)*8*sp;
  }
  ctx.save();
  ctx.translate(sx,sy);

  // Černé pozadí
  ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);

  // Zdi
  const wallCol = '#1a1aff';
  for(let r=0;r<MAZE_ROWS;r++) for(let c=0;c<MAZE_COLS;c++){
    if(MAZE_MAP[r][c]!==1) continue;
    const x=c*cellW, y=r*cellH;
    ctx.fillStyle='#0a0a30'; ctx.fillRect(x,y,cellW+1,cellH+1);
    // Hrany zdí – svítící okraje jen tam, kde sousedí s cestou
    ctx.strokeStyle=wallCol; ctx.lineWidth=1.5;
    if(r>0&&MAZE_MAP[r-1][c]!==1){ ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+cellW,y); ctx.stroke(); }
    if(r<MAZE_ROWS-1&&MAZE_MAP[r+1][c]!==1){ ctx.beginPath(); ctx.moveTo(x,y+cellH); ctx.lineTo(x+cellW,y+cellH); ctx.stroke(); }
    if(c>0&&MAZE_MAP[r][c-1]!==1){ ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+cellH); ctx.stroke(); }
    if(c<MAZE_COLS-1&&MAZE_MAP[r][c+1]!==1){ ctx.beginPath(); ctx.moveTo(x+cellW,y); ctx.lineTo(x+cellW,y+cellH); ctx.stroke(); }
  }

  // Exit dveře – výrazné
  const ex=m.exitC*cellW, ey=m.exitR*cellH;
  const exitPulse = 0.6+0.4*Math.sin(t*0.005);
  ctx.fillStyle=`rgba(0,255,80,${exitPulse*0.2})`;
  ctx.fillRect(ex,ey,cellW,cellH);
  ctx.strokeStyle=`rgba(0,255,80,${exitPulse})`; ctx.lineWidth=2;
  ctx.strokeRect(ex+2,ey+2,cellW-4,cellH-4);
  ctx.fillStyle=`rgba(0,255,80,${exitPulse})`; ctx.font=`bold ${cs*0.4}px monospace`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('EXIT',ex+cellW/2,ey+cellH/2);

  // Kulky
  for(const b of m.bullets){
    const bx=b.x*cellW, by=b.y*cellH;
    ctx.fillStyle='#ff4444';
    ctx.beginPath(); ctx.arc(bx,by,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,120,40,0.4)';
    ctx.beginPath(); ctx.arc(bx-b.dx*cellW*0.5,by-b.dy*cellH*0.5,3,0,Math.PI*2); ctx.fill();
  }

  // Johnny – červená postava
  const jx=m.jx*cellW, jy=m.jy*cellH;
  const jR = cs*0.35;
  ctx.fillStyle='#ff2020';
  ctx.beginPath(); ctx.arc(jx,jy-jR*0.1,jR,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,60,60,0.7)'; ctx.font=`bold ${cs*0.28}px Outfit,sans-serif`;
  ctx.textAlign='center'; ctx.fillText('JOHNNY',jx,jy-jR-4);

  // Hráč – žlutá postava
  const px=m.px*cellW, py=m.py*cellH;
  const pR = cs*0.32;
  const legW = gs.story.leg_shot;
  ctx.fillStyle = '#ffdd00';
  ctx.beginPath(); ctx.arc(px,py,pR,0,Math.PI*2); ctx.fill();
  if(legW){
    const wobble = Math.sin(t*0.005)*2;
    ctx.fillStyle='rgba(200,40,40,0.7)';
    ctx.beginPath(); ctx.arc(px+pR*0.2+wobble,py+pR*0.3,3,0,Math.PI*2); ctx.fill();
  }

  // Minimap
  const mmS = 3;
  const mmX = W - MAZE_COLS*mmS - 8, mmY = 32;
  ctx.fillStyle='rgba(0,0,0,0.8)';
  ctx.fillRect(mmX-2, mmY-2, MAZE_COLS*mmS+4, MAZE_ROWS*mmS+4);
  for(let r=0;r<MAZE_ROWS;r++) for(let c=0;c<MAZE_COLS;c++){
    ctx.fillStyle = MAZE_MAP[r][c]===1 ? '#1a1aff' : '#000';
    ctx.fillRect(mmX+c*mmS, mmY+r*mmS, mmS, mmS);
  }
  ctx.fillStyle='#ff0';
  ctx.fillRect(mmX+Math.floor(m.px)*mmS, mmY+Math.floor(m.py)*mmS, mmS, mmS);
  ctx.fillStyle='#f00';
  ctx.fillRect(mmX+Math.floor(m.jx)*mmS, mmY+Math.floor(m.jy)*mmS, mmS, mmS);
  ctx.fillStyle='#0f0';
  ctx.fillRect(mmX+m.exitC*mmS, mmY+m.exitR*mmS, mmS, mmS);

  // Exit direction arrow
  if(!m.intro && !m.won && !m.dead){
    const aDx = (m.exitC+0.5)-m.px, aDy = (m.exitR+0.5)-m.py;
    const aAng = Math.atan2(aDy, aDx);
    ctx.save(); ctx.translate(px, py - cs*0.6); ctx.rotate(aAng);
    ctx.fillStyle='rgba(0,255,80,0.8)';
    ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(-5,-6); ctx.lineTo(-5,6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // HUD – arcade styl
  ctx.fillStyle='rgba(0,0,0,0.85)';
  ctx.fillRect(0,0,W,26);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.font='bold 13px "Courier New",monospace';
  if(m.intro){
    ctx.fillStyle='#ff4'; ctx.fillText('READY!',10,18);
    ctx.fillStyle='#f44'; ctx.textAlign='right'; ctx.fillText('JOHNNY IS COMING',W-10,18);
    // Intro overlay
    const iAlpha = Math.min(1, Math.max(0, 1 - (gs.ts - m.t0)/2000));
    ctx.fillStyle=`rgba(0,0,0,${0.75*iAlpha})`;
    ctx.fillRect(0,H*0.28,W,H*0.44);
    ctx.textAlign='center';
    ctx.fillStyle=`rgba(255,255,0,${iAlpha})`; ctx.font='bold 26px "Courier New",monospace';
    ctx.fillText('ÚTĚK Z VILY',W/2,H*0.38);
    ctx.fillStyle=`rgba(255,255,255,${iAlpha})`; ctx.font='16px "Courier New",monospace';
    ctx.fillText('WASD / šipky = pohyb',W/2,H*0.46);
    ctx.fillText('Doběhni k EXIT',W/2,H*0.52);
    ctx.fillStyle=`rgba(255,50,50,${iAlpha})`; ctx.font='bold 14px "Courier New",monospace';
    ctx.fillText('Johnny tě pronásleduje!',W/2,H*0.60);
    if(legW){
      ctx.fillStyle=`rgba(255,130,130,${iAlpha})`; ctx.font='bold 13px "Courier New",monospace';
      ctx.fillText('⚠ Postřelená noha — jdeš pomaleji!',W/2,H*0.68);
    }
  } else {
    ctx.fillStyle='#ff4'; ctx.fillText('ÚTĚK Z VILY',10,18);
    ctx.fillStyle=legW?'#f88':'#fff'; ctx.textAlign='right';
    ctx.fillText(legW?'🩸 POSTŘELEN':'WASD/↑↓←→',W-10,18);
  }
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';

  ctx.restore();
}

function drawBandageCutscene(W,H,t){
  const ba = gs.bandage_anim;
  if(!ba) return;
  ctx.fillStyle='#1a1a2e'; ctx.fillRect(0,0,W,H);

  // Vila v pozadí
  ctx.fillStyle='#222'; ctx.fillRect(W*0.3, H*0.15, W*0.4, H*0.45);
  ctx.fillStyle='#444'; ctx.fillRect(W*0.45, H*0.5, W*0.1, H*0.1);

  const cx = W*0.5, cy = H*0.72;

  // Hráč sedí
  ctx.fillStyle='#ffdd00';
  ctx.beginPath(); ctx.arc(cx-30, cy-20, 14, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#aa8800'; ctx.fillRect(cx-40, cy-6, 20, 30);
  // Noha s krví
  ctx.fillStyle='#cc3333'; ctx.fillRect(cx-38, cy+20, 16, 4);

  // Jana
  if(ba.phase === 'bandage' || ba.phase === 'wrap' || ba.phase === 'done'){
    ctx.fillStyle='#ff69b4';
    ctx.beginPath(); ctx.arc(cx+20, cy-22, 12, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#cc5599'; ctx.fillRect(cx+12, cy-10, 16, 26);
    // Ruce k noze
    if(ba.phase === 'wrap' || ba.phase === 'done'){
      ctx.strokeStyle='#fff'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(cx+14, cy+4); ctx.lineTo(cx-30, cy+20); ctx.stroke();
      // Obvaz
      ctx.strokeStyle='#eee'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(cx-30, cy+22, 8, 0, Math.PI*2); ctx.stroke();
    }
  }

  // Text
  ctx.fillStyle='#fff'; ctx.font='bold 18px Outfit,sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  if(ba.phase==='sit') ctx.fillText('Před vilou...', W/2, H*0.12);
  else if(ba.phase==='bandage') ctx.fillText('Jana ošetřuje ránu...', W/2, H*0.12);
  else if(ba.phase==='wrap') ctx.fillText('Obvazuje nohu...', W/2, H*0.12);
  else if(ba.phase==='done') ctx.fillText('🩹 Hotovo.', W/2, H*0.12);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
}

// (katana death odstraněna – nahrazena gun scene)

// Jana spoutá Johnnyho – animace
function triggerJanaHandcuffs(){
  if(gs.jana_handcuffs_anim) return;
  gs.jana_handcuffs_anim = { phase:'rush', t0: gs.ts };
  addLog('*Jana se rozeběhne k Johnnymu!*', 'lw');
  screenShake(300);
  setTimeout(() => {
    addLog('*BUM! Johnny padl k zemi.* Jana ho táhne k radiátoru.', 'lw');
    screenShake(400);
  }, 1200);
  setTimeout(() => {
    addLog('*CVAK!* Jana spoutala Johnnyho želízkama k radiátoru.', 'lm');
    fnotif('⛓️ Johnny spoutaný', 'pos');
    gs.story.jana_handcuffed_johnny = true;
    gs.story.johnny_cuffed = true; // existující flag pro villa
    gs.jana_handcuffs_anim = null;
    // Spusti dialog s Janou (díky + podprsenka) za chvilku
    setTimeout(() => {
      const jvNPC = NPCS['jana_vila'];
      if(jvNPC){
        const j = {...jvNPC, id:'jana_vila', x:canvas.width*0.5, y:canvas.height*0.65, bob:0, bobDir:1};
        currentNPCs.push(j);
        showDialog(j);
      }
    }, 1500);
  }, 2800);
}

// (triggerBathroomCutscene odstraněna – nahrazena triggerJohnnyGunScene)

function triggerCharmGauc(){
  if(gs.charm_gauc_anim) return;
  gs.charm_gauc_anim = {
    phase: 'flirt',
    t0: gs.ts,
    jana_x: canvas.width * 0.55,
    jana_y: canvas.height * 0.60,
    johnny_x: canvas.width * 0.62,
    johnny_y: canvas.height * 0.60,
  };
  // Schovat normální NPCy
  currentNPCs = currentNPCs.filter(n => n.id !== 'johnny_vila' && n.id !== 'jana_vila');

  const seq = [
    { delay: 2500, log:'*Johnny zašeptá Hrubešovi:* "Sleduj, jak na ni jdu."', cls:'ls' },
    { delay: 2800, log:'Johnny: "Janičko, ta dnešní noc se ti zalíbí. Pojď na gauč."', cls:'ls' },
    { delay: 3000, log:'*Jana s ospalýma očima souhlasí, sedají si těsně k sobě.*', cls:'ls', phase:'gauc' },
    { delay: 8000, log:'*Po chvíli Jana usne na Johnnyho rameni.*', cls:'lw', phase:'asleep' },
    { delay: 1500, log:'Johnny: "LEEEETS GOOOO! Jdi domů, Hrubeši." *mrkne*', cls:'lm', phase:'done' },
  ];
  let i = 0;
  function nextLine(){
    if(!gs.charm_gauc_anim) return;
    if(i >= seq.length){
      // Konec – obnovit Johnnyho jako NPC s novým dialogem
      gs.story.jana_asleep_gauc = true;
      const jhNPC = NPCS['johnny_vila'];
      if(jhNPC) currentNPCs.push({...jhNPC, id:'johnny_vila', x:canvas.width*0.62, y:canvas.height*0.60, bob:0, bobDir:1});
      gs.charm_gauc_anim = null;
      // Spustit q_johnny_help_done po krátké pauze
      setTimeout(() => {
        showNPCLine('johnny_vila',
          '"LEEEETS GOOOO!" *Johnny zvedne palce vzhůru* "Tady máš kartu Vaza Systems – jsme bratři teď. Jdi domů, kámo."',
          () => runQF('q_johnny_help_done')
        );
      }, 800);
      return;
    }
    const ln = seq[i];
    addLog(ln.log, ln.cls);
    if(ln.phase) gs.charm_gauc_anim.phase = ln.phase;
    i++;
    setTimeout(nextLine, ln.delay);
  }
  setTimeout(nextLine, 500);
}

// ─── Cibulkův papírek – jednorázové heslo ────────────────────────────────

const CIBULKA_PWD_WORDS = [
  'medvědí','tichý','rudý','šedý','půlnoční','východní','tajný','poslední','starý','severní',
  'jasný','rychlý','horský','lesní','křemžský','zlatý','černý','bílý','divoký','nový',
];
const CIBULKA_PWD_NOUNS = [
  'fenykl','obušek','vodopád','jelen','úsvit','kosatec','prach','svit','potok','vítr',
  'oheň','kámen','vlk','kruh','sníh','déšť','mráz','vlna','strom','kovář',
];
function generateCibulkaPassword(){
  const w = CIBULKA_PWD_WORDS[Math.floor(Math.random()*CIBULKA_PWD_WORDS.length)];
  const n = CIBULKA_PWD_NOUNS[Math.floor(Math.random()*CIBULKA_PWD_NOUNS.length)];
  const num = Math.floor(Math.random()*90 + 10); // dvouciferné číslo
  return `${w}-${n}-${num}`;
}

function showCibulkaPapirek(){
  if(!gs.inv.cibulka_papirek || !gs.cibulka_password) return;
  const pwd = gs.cibulka_password;
  const used = gs.cibulka_used;
  const ov = document.getElementById('cibulka-papirek-ov');
  const inner = document.getElementById('cibulka-papirek-inner');
  if(!ov || !inner){
    // Fallback – vytvoř overlay dynamicky pokud chybí v HTML
    let dyn = document.getElementById('cibulka-papirek-ov');
    if(!dyn){
      dyn = document.createElement('div');
      dyn.id = 'cibulka-papirek-ov';
      dyn.className = 'art-detail-ov';
      dyn.innerHTML = `<div id="cibulka-papirek-inner" class="cibulka-papirek-paper" onclick="event.stopPropagation()"></div>`;
      dyn.addEventListener('click', () => dyn.classList.remove('on'));
      document.body.appendChild(dyn);
    }
    return showCibulkaPapirek();
  }
  inner.innerHTML = `
    <div class="cp-header">📄 Papírek od Petra Cibulky</div>
    <div class="cp-instructions">"Šeptej tohle heslo Šamanovi v hospodě.<br>Funguje JEN JEDNOU. Nezapomeň."</div>
    <div class="cp-pwd" id="cp-pwd-text">${pwd}</div>
    <div class="cp-actions">
      <button class="cp-btn" onclick="copyCibulkaPwd()">📋 Zkopírovat</button>
      <button class="cp-btn" onclick="document.getElementById('cibulka-papirek-ov').classList.remove('on')">Schovat</button>
    </div>
    ${used ? '<div class="cp-used">⚠️ Tohle heslo už bylo použito.</div>' : '<div class="cp-fresh">✨ Heslo zatím nebylo použito.</div>'}
  `;
  ov.classList.add('on');
}

function copyCibulkaPwd(){
  if(!gs.cibulka_password) return;
  const txt = gs.cibulka_password;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(
      () => fnotif('📋 Heslo zkopírováno!', 'pos'),
      () => fnotif('Kopírování se nezdařilo', 'neg')
    );
  } else {
    // Fallback pro starší prohlížeče
    const ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    fnotif('📋 Heslo zkopírováno!', 'pos');
  }
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
  let ammo=50;
  let noAmmoSince=0; // timestamp kdy došly náboje
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
    kctx.fillText('Klikni nebo stiskni libovolnou klávesu pro návrat',W/2,H*0.68);
    mc.onclick=()=>endKGBMinigame(won);
    document.getElementById('kgb-ov').onclick=()=>endKGBMinigame(won);
    const onAnyKey=e=>{ window.removeEventListener('keydown',onAnyKey); endKGBMinigame(won); };
    window.addEventListener('keydown',onAnyKey);
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

    // Auto-fail: pokud nemáš náboje a nestíháš, po 3s prohra
    if(ammo<=0 && kills<KILL_WIN){
      if(!noAmmoSince) noAmmoSince=ts;
      else if(ts-noAmmoSince>3000){ passed=MAX_PASS+1; }
    }

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
    // Cibulka dá hráči papírek s jednorázovým heslem
    if(!gs.cibulka_password){
      gs.cibulka_password = generateCibulkaPassword();
      gs.inv.cibulka_papirek = 1;
      updateInv();
      setTimeout(() => {
        addLog('📄 Cibulka ti vstrčil do kapsy malý papírek. "Schovej to. Až to budeš potřebovat, budeš vědět."', 'lm');
        fnotif('📄 Papírek od Cibulky', 'itm');
      }, 1200);
    }
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
