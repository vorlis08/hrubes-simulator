'use strict';
// ═══════════════════════════════════════════
//  START HRY & EVENT LISTENERY
// ═══════════════════════════════════════════

// ─── Hudba ────────────────────────────────────────────────────────────────

const audio = new Audio('audio/music.mp3');
audio.loop = true; audio.volume = 0.45;
let musicPlaying = false;

function toggleMusic(){
  const btn = document.getElementById('music-btn');
  if(musicPlaying){ audio.pause(); musicPlaying = false; btn.textContent = '🔇'; }
  else { audio.play().catch(()=>{}); musicPlaying = true; btn.textContent = '🎵'; }
}

// ─── Heslo → Login screen ────────────────────────────────────────────────

(function initPassword(){
  const ov = document.getElementById('pw-ov');
  const inp = document.getElementById('pw-in');
  const err = document.getElementById('pw-err');
  const btn = document.getElementById('pw-btn');

  function tryPassword(){
    if(inp.value.trim() === 'oacb'){
      ov.style.display = 'none';
      // Intro (1× za session), poté auto-login nebo login screen
      runIntro(() => {
        checkAutoLogin(() => showLoadingScreen(showHomescreen));
      });
    } else {
      err.textContent = 'Špatné heslo.';
      inp.value = '';
      inp.focus();
    }
  }
  btn.addEventListener('click', tryPassword);
  inp.addEventListener('keydown', e => { if(e.key === 'Enter') tryPassword(); });
})();

// ─── Init profile UI ─────────────────────────────────────────────────────

(function(){
  // Init tab switching, buttons, import zone
  initProfileUI();

  // Start screen is hidden by default (homescreen shows first, then play → start → game)
  document.getElementById('start').style.display = 'none';
})();

// ─── Start hry ────────────────────────────────────────────────────────────

function startGame(){
  resetGameState();
  document.getElementById('start').style.display = 'none';
  document.getElementById('lpanel').style.display = '';
  // Zavři overlaye z předchozí hry
  ['death','win','stab-death','dov','riddle-ov','kgb-ov'].forEach(id => {
    const el = document.getElementById(id);
    if(el){ el.classList.remove('on'); el.classList.remove('visible'); }
  });
  document.getElementById('logc').innerHTML = '';
  document.getElementById('piko-badge').classList.remove('on');
  keys = {};

  gs.running   = true;
  gs.ts        = 0;
  gs.lastDrain = 0;
  gs.pregame_artifacts = {};
  lastTime     = performance.now();

  // Hráč začíná v učebně (intro quest)
  gs.room = 'ucebna';
  gs.story.map_unlocked = false;
  gs.story.intro_done = false;
  Inventory.initPocket();
  initObj(); initNotebook(); initRoom(canvas.width * 0.5, canvas.height * 0.7); updateHUD(); updateInv();
  addStoryEntry('prolog', 'Další nuda v učebně. Hodina se vleče. Snad mě pustí...', '✏️');
  // Hide minimap and map key until intro is done
  const mapCard = document.getElementById('map-card');
  if(mapCard) mapCard.style.display = 'none';
  phoneInitStartMessages();
  phoneStartTimedMessages();
  // Stats button visibility
  const statsBtn = document.getElementById('stats-pause-btn');
  if(statsBtn) statsBtn.style.display = (activeProfile && activeProfile.statsUnlocked) ? '' : 'none';
  requestAnimationFrame(gameLoop);

}

// ─── Pre-game vitrines rendering ─────────────────────────────────────────

function renderPregameVitrines(){
  const container = document.getElementById('pregame-vitrines');
  if(!container || !activeProfile) return;
  container.innerHTML = '';

  ART_DEFS_DISPLAY.forEach(a => {
    const unlocked = activeProfile.artifacts[a.key];
    const d = document.createElement('div');
    d.className = 'pregame-vitrine' + (unlocked ? '' : ' empty');
    if(unlocked){
      d.innerHTML = `<div class="pv-emoji">${a.emoji}</div><div class="pv-name">${a.name}</div>`;
      d.addEventListener('click', () => showArtDetail(a.emoji, a.name, a.desc, a.url, a.img, a.audio));
    } else {
      d.innerHTML = `<div class="pv-emoji pv-void">∅</div><div class="pv-name">???</div>`;
    }
    container.appendChild(d);
  });
}

document.getElementById('start-btn').addEventListener('click', startGame);

// ─── Klávesové zkratky ────────────────────────────────────────────────────

const MOVE_KEYS = new Set(['w','s','a','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);

function isTyping(){
  const ae = document.activeElement;
  return ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
}

// Normalizace kláves – CAPSLOCK/Shift nesmí rozbít pohyb
function normKey(k){ return (k && k.length === 1) ? k.toLowerCase() : k; }

window.addEventListener('keydown', e => {
  // Pokud hráč píše do inputu (hádanka, login, apod.), blokuj herní klávesy
  if(isTyping()){
    if(e.key === 'Escape'){ closeAllOverlays(); e.target.blur(); }
    if(e.key === 'Enter' && document.getElementById('riddle-ov').classList.contains('on'))
      submitPassword();
    return;
  }

  const nk = normKey(e.key);
  const shiftCombo = e.shiftKey && nk === 'Tab' ? 'shift+Tab' : nk;

  // Inventář má nejvyšší prioritu – překryje vše
  if(typeof Inventory !== 'undefined' && Inventory.isOpen()){
    e.preventDefault();
    Inventory.handleKey(shiftCombo);
    return;
  }

  // Dialog keyboard navigation (Enter, arrows, numbers)
  if(typeof dialogHandleKey === 'function' && document.getElementById('dov').classList.contains('on')){
    if(dialogHandleKey(shiftCombo)){ e.preventDefault(); return; }
  }

  if(Phone.isOpen()){
    if(Phone.handleKey(shiftCombo)){ e.preventDefault(); return; }
  }

  keys[nk] = true;
  if(MOVE_KEYS.has(nk)) e.preventDefault();

  if(nk === 'Escape'){
    e.preventDefault();
    if(Phone.isOpen()){ closePhone(); return; }
    // Check if any overlay is open
    const anyOpen = ['dov','riddle-ov','note-ov','screenshot-ov','foto-kubatova-ov',
      'c2-cert-ov','phone-ov','kremzogram-ov','quest-ov','settings-ov','map-ov','stats-ov']
      .some(id => document.getElementById(id)?.classList.contains('on'))
      || (typeof Inventory !== 'undefined' && Inventory.isOpen())
      || document.getElementById('notebook-ov')?.classList.contains('on');
    if(anyOpen){
      closeAllOverlays();
    } else if(gs.running && !gs.dead){
      togglePause();
    } else if(gs._paused){
      togglePause();
    }
    return;
  }

  if(nk === 'm' && gs.running && !gs.dead && gs.story.map_unlocked){
    toggleMap();
  }
  if(nk === 'q'){
    // legacy: keep Q as alias for map
    if(gs.running && !gs.dead && gs.story.map_unlocked) toggleMap();
  }
  if(nk === 't'){
    togglePhone();
  }

  if(!gs.running || gs.dead) return;

  if(nk === 'r'){ toggleNotebook(); }
  if(nk === 'e'){
    e.preventDefault();
    // E otvírá inventář, pokud není blízko NPC (prox není viditelný)
    const proxVisible = document.getElementById('prox').classList.contains('show');
    if(proxVisible){
      interact();
    } else {
      Inventory.toggle();
    }
  }
  if(nk === 'i'){ Inventory.toggle(); }
  if(nk === '1' && !Phone.isOpen()) useKratom();
  if(nk === '2' && !Phone.isOpen()) useZemle();
  if(nk === 'Enter' && document.getElementById('riddle-ov').classList.contains('on'))
    submitPassword();
});

window.addEventListener('keyup', e => { if(!isTyping()) keys[normKey(e.key)] = false; });

// ─── Reset kláves při ztrátě fokusu (zabrání "přilepeným" klávesám) ─────
window.addEventListener('blur', () => {
  for(const k in keys) keys[k] = false;
});
document.addEventListener('visibilitychange', () => {
  if(document.hidden) for(const k in keys) keys[k] = false;
});

// ─── Pauza ──────────────────────────────────────────────────────────────
function togglePause(){
  if(gs._paused){
    gs._paused = false;
    gs.running = true;
    lastTime = performance.now();
    document.getElementById('pause-ov').classList.remove('on');
    requestAnimationFrame(gameLoop);
  } else {
    gs._paused = true;
    gs.running = false;
    document.getElementById('pause-ov').classList.add('on');
  }
}

function useDatapad(){
  if(!activeProfile) return;
  if(activeProfile.statsUnlocked){
    openStats();
    return;
  }
  if(!activeProfile.artifacts || !activeProfile.artifacts.webovky){
    addLog('📊 *Datapad hlásí: "PŘÍSTUP ODEPŘEN – Chybí síťové připojení. Připoj se přes Vaza Systems."* Potřebuješ mít hotové webovky od Johnnyho.', 'lw');
    return;
  }
  activeProfile.statsUnlocked = true;
  profileSaveProgressLocal();
  gs.inv.datapad = 0;
  updateInv();
  addLog('*Datapad navázal spojení s Vaza Systems. Cibulkův analytický systém se napojuje na tvůj profil... Statistiky odemčeny!*', 'lm');
  fnotif('📊 ANALYTIKA ODEMČENA!', 'pos');
  screenShake(150);
  const btn = document.getElementById('stats-pause-btn');
  if(btn) btn.style.display = '';
  setTimeout(() => openStats(), 600);
}

function openStats(){
  if(!activeProfile || !activeProfile.statsUnlocked){
    addLog('📊 Statistiky nejsou odemčeny. Najdi Cibulkův datapad v jeho laboratoři.', 'lw');
    return;
  }
  renderStatsOverlay();
  document.getElementById('stats-ov').classList.add('on');
}
function renderStatsOverlay(){
  const body = document.getElementById('stats-body');
  if(!body) return;
  const s = gs.stats || {};
  const playtime = gs.ts ? Math.floor(gs.ts / 1000) : 0;
  const mins = Math.floor(playtime / 60);
  const secs = playtime % 60;
  const hrs = Math.floor(mins / 60);
  const visited = gs.visited ? gs.visited.size : 0;
  const totalRooms = Object.keys(ROOMS).length;
  const quests = gs.quests ? Object.values(gs.quests).filter(q => q === 'done').length : 0;
  const totalQuests = gs.quests ? Object.keys(gs.quests).length : 0;
  const invCount = gs.inv ? Object.values(gs.inv).filter(v => v > 0).length : 0;
  const efficiency = playtime > 0 ? ((s.moneyEarned / playtime) * 60).toFixed(1) : '0.0';
  const repRate = playtime > 0 ? ((s.repEarned / playtime) * 60).toFixed(1) : '0.0';
  const explorationPct = totalRooms > 0 ? ((visited / totalRooms) * 100).toFixed(1) : '0';
  const questPct = totalQuests > 0 ? ((quests / totalQuests) * 100).toFixed(1) : '0';
  const substTotal = s.kratomUses + s.blendUses + s.pikoUses;
  const foodTotal = s.zemleEaten + s.pivosDrunk;
  const balanceRatio = s.moneyEarned > 0 ? ((s.moneySpent / s.moneyEarned) * 100).toFixed(0) : '0';
  const avgStepsPerRoom = s.roomChanges > 0 ? Math.round(s.steps / s.roomChanges) : 0;
  const minigameWinRate = s.minigamesPlayed > 0 ? ((s.minigamesWon / s.minigamesPlayed) * 100).toFixed(0) : '—';
  const drainRate = playtime > 0 ? ((s.energyDrained / playtime) * 60).toFixed(2) : '0';
  const diff = (typeof Settings !== 'undefined') ? Settings.getDifficulty() : {};
  const diffLabel = diff.label || '—';
  const timestamp = new Date().toLocaleTimeString('cs-CZ');

  const bar = (val, max, color) => {
    const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
    return `<div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
  };
  const gauge = (val, label, unit, color) =>
    `<div class="sci-gauge"><div class="sci-gauge-val" style="color:${color}">${val}</div><div class="sci-gauge-unit">${unit}</div><div class="sci-gauge-label">${label}</div></div>`;

  body.innerHTML = `
    <div class="sci-header">
      <div class="sci-header-left">
        <div class="sci-terminal">CIBULKA ANALYTICS v2.7</div>
        <div class="sci-sub">Vaza Systems · Křemže Node · ${timestamp}</div>
      </div>
      <div class="sci-header-right">
        <div class="sci-diff">${diffLabel}</div>
        <div class="sci-session">SESSION ${hrs}h${(mins%60).toString().padStart(2,'0')}m${secs.toString().padStart(2,'0')}s</div>
      </div>
    </div>

    <div class="sci-panel sci-panel-primary">
      <div class="sci-panel-title">▸ PRIMÁRNÍ METRIKY</div>
      <div class="sci-gauges">
        ${gauge(gs.money, 'Kapitál', 'Kč', '#f0c040')}
        ${gauge(gs.rep, 'Reputace', 'REP', '#4ecdc4')}
        ${gauge(gs.energy + '%', 'Energie', 'PWR', gs.energy > 30 ? '#50fa7b' : '#ff5555')}
        ${gauge(invCount, 'Inventář', 'ITM', '#bd93f9')}
      </div>
    </div>

    <div class="sci-row">
      <div class="sci-panel sci-panel-half">
        <div class="sci-panel-title">▸ FINANČNÍ ANALÝZA</div>
        <div class="stat-row"><span class="sci-label">Příjmy</span><span class="stat-num sci-green">+${s.moneyEarned} Kč</span></div>
        <div class="stat-row"><span class="sci-label">Výdaje</span><span class="stat-num sci-red">−${s.moneySpent} Kč</span></div>
        <div class="stat-row"><span class="sci-label">Bilance</span><span class="stat-num">${s.moneyEarned - s.moneySpent} Kč</span></div>
        <div class="sci-divider"></div>
        <div class="stat-row"><span class="sci-label">Výdajový poměr</span><span class="stat-num">${balanceRatio}%</span></div>
        <div class="stat-row"><span class="sci-label">Efektivita</span><span class="stat-num">${efficiency} Kč/min</span></div>
      </div>
      <div class="sci-panel sci-panel-half">
        <div class="sci-panel-title">▸ VÝKONNOSTNÍ INDEX</div>
        <div class="stat-row"><span class="sci-label">REP/min</span><span class="stat-num">${repRate}</span></div>
        <div class="stat-row"><span class="sci-label">Energy drain</span><span class="stat-num">${drainRate}/min</span></div>
        <div class="stat-row"><span class="sci-label">Kroky celkem</span><span class="stat-num">${s.steps.toLocaleString('cs')}</span></div>
        <div class="sci-divider"></div>
        <div class="stat-row"><span class="sci-label">Ø kroky/místnost</span><span class="stat-num">${avgStepsPerRoom}</span></div>
        <div class="stat-row"><span class="sci-label">NPC interakce</span><span class="stat-num">${s.npcTalks}</span></div>
      </div>
    </div>

    <div class="sci-panel">
      <div class="sci-panel-title">▸ PRŮZKUM TERÉNU</div>
      <div class="stat-row"><span class="sci-label">Mapovaná oblast</span><span class="stat-num">${visited}/${totalRooms} (${explorationPct}%)</span></div>
      ${bar(visited, totalRooms, '#4ecdc4')}
      <div class="stat-row"><span class="sci-label">Přechody zón</span><span class="stat-num">${s.roomChanges}</span></div>
      <div class="stat-row"><span class="sci-label">Splněné mise</span><span class="stat-num">${quests}/${totalQuests} (${questPct}%)</span></div>
      ${bar(quests, totalQuests, '#f7b731')}
    </div>

    <div class="sci-row">
      <div class="sci-panel sci-panel-half">
        <div class="sci-panel-title">▸ TOXIKOLOGIE</div>
        <div class="stat-row"><span class="sci-label">Kratom</span><span class="stat-num">${s.kratomUses}× dávek</span></div>
        <div class="stat-row"><span class="sci-label">Blend</span><span class="stat-num">${s.blendUses}× dávek</span></div>
        <div class="stat-row"><span class="sci-label">Piko</span><span class="stat-num sci-red">${s.pikoUses}× letální</span></div>
        <div class="sci-divider"></div>
        <div class="stat-row"><span class="sci-label">Celkem substance</span><span class="stat-num">${substTotal}</span></div>
        <div class="stat-row"><span class="sci-label">Hazard index</span><span class="stat-num ${substTotal > 10 ? 'sci-red' : substTotal > 5 ? 'sci-yellow' : 'sci-green'}">${substTotal > 10 ? 'KRITICKÝ' : substTotal > 5 ? 'ZVÝŠENÝ' : 'NÍZKÝ'}</span></div>
      </div>
      <div class="sci-panel sci-panel-half">
        <div class="sci-panel-title">▸ VÝŽIVA & MINIHRY</div>
        <div class="stat-row"><span class="sci-label">Žemle</span><span class="stat-num">${s.zemleEaten}×</span></div>
        <div class="stat-row"><span class="sci-label">Piva</span><span class="stat-num">${s.pivosDrunk}×</span></div>
        <div class="stat-row"><span class="sci-label">Celkem strava</span><span class="stat-num">${foodTotal}</span></div>
        <div class="sci-divider"></div>
        <div class="stat-row"><span class="sci-label">Minihry</span><span class="stat-num">${s.minigamesPlayed} odehráno</span></div>
        <div class="stat-row"><span class="sci-label">Winrate</span><span class="stat-num">${minigameWinRate}%</span></div>
      </div>
    </div>

    <div class="sci-footer">
      <span>CIBULKA ANALYTICS · DATA CLASSIFICATION: TAJNÉ</span>
      <span>POWERED BY VAZA SYSTEMS NETWORK</span>
    </div>
  `;
}

function toggleMap(){
  const ov = document.getElementById('map-ov');
  if(!ov) return;
  if(ov.classList.contains('on')){
    ov.classList.remove('on');
  } else {
    renderMap();
    ov.classList.add('on');
  }
}

function renderMap(){
  const canvasEl = document.getElementById('map-ov-canvas');
  const locEl = document.getElementById('map-ov-location');
  const questsEl = document.getElementById('map-ov-quests');
  if(!canvasEl) return;

  const rm = ROOMS[gs.room];
  const roomName = rm ? (rm.icon + ' ' + rm.name) : gs.room;
  const roomSub = rm ? rm.sub : '';

  // Map nodes with positions
  const MAP_NODES = [
    {id:'doma',       x:85, y:18, icon:'🏡', name:'Doma',       sub:'Tvůj byt'},
    {id:'kremze',     x:70, y:35, icon:'🏠', name:'Křemže',     sub:'Náměstí'},
    {id:'ulice',      x:50, y:52, icon:'🌆', name:'Ulice',      sub:'Pravá Křemže'},
    {id:'hospoda',    x:30, y:40, icon:'🍺', name:'Hospoda',    sub:'Big Poppa'},
    {id:'billa',      x:50, y:28, icon:'🛒', name:'Billa',      sub:'Mariánské nám.'},
    {id:'ucebna',     x:20, y:22, icon:'✏️', name:'Učebna',     sub:'Obchodní akademie'},
    {id:'sklep',      x:50, y:70, icon:'🕯️', name:'Sklep',      sub:'Mikulášův sklep'},
    {id:'johnny_vila',x:85, y:55, icon:'🏠', name:'Johnnyho vila',sub:'Soukromý'},
    {id:'koupelna',   x:92, y:65, icon:'🚿', name:'Koupelna',   sub:'Ve vile'},
    {id:'cibulka_lab',x:20, y:55, icon:'🔬', name:'Cibulkova lab',sub:'Za krbem'},
  ];

  // Connections between rooms
  const MAP_EDGES = [
    ['ucebna','billa'],['billa','hospoda'],['hospoda','ulice'],['ulice','kremze'],
    ['kremze','ucebna'],['kremze','doma'],['billa','sklep'],['hospoda','cibulka_lab'],
    ['kremze','johnny_vila'],['johnny_vila','koupelna'],
  ];

  let mapHTML = '<svg viewBox="0 0 100 85" class="map-svg">';
  // Edges
  MAP_EDGES.forEach(([a,b]) => {
    const na = MAP_NODES.find(n=>n.id===a), nb = MAP_NODES.find(n=>n.id===b);
    if(!na||!nb) return;
    const visited = gs.visited.has(a) && gs.visited.has(b);
    mapHTML += `<line x1="${na.x}" y1="${na.y}" x2="${nb.x}" y2="${nb.y}" stroke="${visited ? 'rgba(240,192,64,.3)' : 'rgba(255,255,255,.06)'}" stroke-width=".5" ${visited?'stroke-dasharray="none"':'stroke-dasharray="1,1"'}/>`;
  });
  // Nodes
  MAP_NODES.forEach(n => {
    const isCurrent = gs.room === n.id;
    const isVisited = gs.visited.has(n.id);
    if(!isVisited && !isCurrent) return;
    const fill = isCurrent ? '#f0c040' : 'rgba(255,255,255,.25)';
    const r = isCurrent ? 3.5 : 2;
    mapHTML += `<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${fill}" ${isCurrent?'class="map-pulse"':''}/>`;
    mapHTML += `<text x="${n.x}" y="${n.y-4}" text-anchor="middle" fill="${isCurrent?'#f0c040':'rgba(255,255,255,.4)'}" font-size="${isCurrent?3.5:2.8}" font-family="var(--fm)">${n.name}</text>`;
  });
  mapHTML += '</svg>';
  canvasEl.innerHTML = mapHTML;

  // Location info
  locEl.innerHTML = `<div class="map-loc-name">${roomName}</div><div class="map-loc-sub">${roomSub}</div>`;

  // Quests
  const activeObjs = (gs.objectives || []).filter(o => o.active);
  if(activeObjs.length === 0){
    questsEl.innerHTML = '<div class="map-quest-empty">Žádné aktivní úkoly.</div>';
    return;
  }

  // Quest descriptions (player's voice)
  const QUEST_DESC = {
    main_money: 'Musím sehnat 2000 Kč a nastartovat tu zkurvenou Fábii. Jinak tu zkysnu navěky.',
    main_rep: 'Hlavní cíl – sehnat klíče od Fábie, nastartovat a vypadnout z Křemže.',
    main_cihalova: 'Číhalová se zase mohla posrat z toho, že jsem to s kratomem trochu přehnal a usnul. Teď je na mě dost nasraná a chce po mě, abych šel najít něco dobrého. Údajně by něco pro ní měl mít její kamarád, bezďák.',
    side_krejci: 'Krejčí je v háji – někdo ji vydírá. Musím přijít na to kdo.',
    side_figurova: 'Figurová chce, abych sledoval Milana. Špinavá práce, ale platí dobře.',
    side_jana: 'Jana chce kratom. 20 gramů. Dodám, ona zaplatí.',
    side_johnny: 'Johnny chce rande s Janou. Musím to domluvit.',
    side_paja: 'Pája chce založit Betanu. Potřebuje moji pomoc.',
    side_honza_ukol: 'Honza potřebuje komot z češtiny. Nějak to zařídím.',
    quest_cihalova_burn: 'Zbavit se Číhalové. Trvale. Krb v hospodě vypadá jako dobrý nápad...',
    quest_kgb: 'KGB a GRU agenti operují v Křemži. Musím je postřílet v minihře.',
    quest_maturita: 'Maturita se blíží. Přežít za každou cenu.',
    quest_saman_minulost: 'Šaman chce ingredience na elixír – bylinu, vodu a prach z pentagramu.',
    quest_fabie: 'Mám klíče (nebo vím kde jsou). Nastartovat Fábii a vypadnout!',
  };

  questsEl.innerHTML = activeObjs.map(o => {
    const desc = QUEST_DESC[o.id] || '';
    const expanded = gs._expandedQuest === o.id;
    return `<div class="map-quest ${o.done?'done':''} ${expanded?'expanded':''}" onclick="gs._expandedQuest=gs._expandedQuest==='${o.id}'?null:'${o.id}';renderMap()">
      <div class="map-quest-header">
        <span class="map-quest-check">${o.done?'✅':'◇'}</span>
        <span class="map-quest-tag">${o.tag}</span>
        <span class="map-quest-text">${o.text}</span>
      </div>
      ${expanded && desc ? '<div class="map-quest-desc">"'+desc+'"</div>' : ''}
    </div>`;
  }).join('');
}

function openSettings(){
  Settings.renderUI();
  document.getElementById('settings-ov').classList.add('on');
}

// ─── Safety: Escape zavře VŠECHNY overlaye ─────────────────────────────
function closeAllOverlays(){
  if(typeof Inventory !== 'undefined') Inventory.close();
  document.getElementById('dov').classList.remove('on');
  document.getElementById('riddle-ov').classList.remove('on');
  document.getElementById('note-ov').classList.remove('on');
  document.getElementById('screenshot-ov').classList.remove('on');
  document.getElementById('foto-kubatova-ov').classList.remove('on');
  document.getElementById('c2-cert-ov').classList.remove('on');
  closeNotebook();
  document.getElementById('phone-ov').classList.remove('on');
  document.getElementById('kremzogram-ov').classList.remove('on');
  document.getElementById('quest-ov').classList.remove('on');
  const mapOv = document.getElementById('map-ov');
  if(mapOv) mapOv.classList.remove('on');
  document.getElementById('settings-ov').classList.remove('on');
  const statsOv = document.getElementById('stats-ov');
  if(statsOv) statsOv.classList.remove('on');
  for(const k in keys) keys[k] = false;
  gs.player.mv = false;
}

// ─── Tooltipy inventáře ──────────────────────────────────────────────────

(function initTooltips(){
  const tip = document.createElement('div');
  tip.id = 'inv-tooltip';
  document.body.appendChild(tip);

  document.getElementById('inv-bar').addEventListener('mouseover', e => {
    const slot = e.target.closest('.isl');
    if(!slot) return;
    const id = slot.id.replace('sl-','');
    const desc = ITEM_DESCS[id];
    if(!desc) return;
    tip.textContent = desc;
    tip.classList.add('show');
  });
  document.getElementById('inv-bar').addEventListener('mouseout', e => {
    tip.classList.remove('show');
  });
  document.getElementById('inv-bar').addEventListener('mousemove', e => {
    tip.style.left = e.clientX + 'px';
    tip.style.top = (e.clientY - 42) + 'px';
  });
})();
