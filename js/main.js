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

  // Hráč začíná doma
  gs.room = 'doma';
  gs.story.map_unlocked = false;
  gs.story.intro_done = false;
  Inventory.initPocket();
  initObj(); initRoom(canvas.width * 0.5, canvas.height * 0.7); updateHUD(); updateInv();
  addStoryEntry('prolog', 'Další den v Křemži. Vstávám z postele a musím se dostat do školy...', '🏡');
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
;
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
  if(nk === 't' || nk === 'r'){
    togglePhone();
  }

  if(!gs.running || gs.dead) return;

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
  const navHint = document.getElementById('map-ov-nav-hint');
  if(!canvasEl) return;

  const rm = ROOMS[gs.room];
  const roomName = rm ? (rm.icon + ' ' + rm.name) : gs.room;
  const roomSub = rm ? rm.sub : '';

  // Main ring: RORDER cycle with positions along a horizontal path
  const MAIN = [
    {id:'ucebna',  x:10, y:40, label:'Učebna',   icon:'✏️'},
    {id:'billa',   x:30, y:40, label:'Billa',     icon:'🛒'},
    {id:'hospoda', x:50, y:40, label:'Hospoda',   icon:'🍺'},
    {id:'ulice',   x:70, y:40, label:'Ulice',     icon:'🌆'},
    {id:'kremze',  x:90, y:40, label:'Křemže',    icon:'🏠'},
  ];
  // Branch rooms that connect off the main path
  const BRANCHES = [
    {id:'doma',        x:90, y:15, label:'Doma',         icon:'🏡', parent:'kremze'},
    {id:'sklep',       x:30, y:68, label:'Sklep',        icon:'🕯️', parent:'billa'},
    {id:'johnny_vila', x:90, y:65, label:'Johnnyho vila', icon:'🏠', parent:'kremze'},
    {id:'koupelna',    x:90, y:82, label:'Koupelna',     icon:'🚿', parent:'johnny_vila'},
    {id:'cibulka_lab', x:50, y:68, label:'Cibulkova lab', icon:'🔬', parent:'hospoda'},
  ];
  const ALL = [...MAIN, ...BRANCHES];
  const pen = '#3a2a10';
  const penLight = '#8a7050';
  const penFog = '#c8b090';

  let svg = '<svg viewBox="0 0 100 95" class="map-svg">';
  // Paper fold lines
  svg += `<line x1="50" y1="0" x2="50" y2="95" stroke="${penFog}" stroke-width=".15" stroke-dasharray="1.5,1"/>`;
  svg += `<line x1="0" y1="47" x2="100" y2="47" stroke="${penFog}" stroke-width=".1" stroke-dasharray="1,1.5"/>`;

  // Draw main path connections with arrows showing direction
  // RORDER cycle: ucebna ←→ billa ←→ hospoda ←→ ulice ←→ kremze ←→ ucebna (wraps)
  for(let i = 0; i < MAIN.length; i++){
    const a = MAIN[i], b = MAIN[(i+1) % MAIN.length];
    const visited = gs.visited.has(a.id) && gs.visited.has(b.id);
    const col = visited ? pen : penFog;
    if(i < MAIN.length - 1){
      // Straight line between adjacent rooms
      const wobble = (i % 2 === 0) ? -1.5 : 1.5;
      svg += `<path d="M${a.x},${a.y} Q${(a.x+b.x)/2},${a.y+wobble} ${b.x},${b.y}" fill="none" stroke="${col}" stroke-width=".4"/>`;
      // Arrow pointing right (→ = next)
      const mx = (a.x+b.x)/2, my = a.y + wobble/2;
      svg += `<text x="${mx}" y="${my-2}" text-anchor="middle" font-size="2.5" fill="${col}">→</text>`;
      svg += `<text x="${mx}" y="${my+4}" text-anchor="middle" font-size="2.5" fill="${col}">←</text>`;
    } else {
      // Wrap-around: kremze → ucebna (drawn as a curve going above)
      svg += `<path d="M${b.x},${b.y-3} Q${95},${12} ${50},${10} Q${5},${12} ${a.x},${a.y-3}" fill="none" stroke="${col}" stroke-width=".3" stroke-dasharray=".8,.6"/>`;
      svg += `<text x="50" y="8" text-anchor="middle" font-size="2" fill="${col}" font-style="italic">cyklus</text>`;
    }
  }

  // Draw branch connections
  BRANCHES.forEach(br => {
    const p = ALL.find(n=>n.id===br.parent);
    if(!p) return;
    const visited = gs.visited.has(br.id) && gs.visited.has(br.parent);
    const col = visited ? pen : penFog;
    const wobble = (br.x > p.x) ? 2 : -2;
    svg += `<path d="M${p.x},${p.y} Q${p.x+wobble},${(p.y+br.y)/2} ${br.x},${br.y}" fill="none" stroke="${col}" stroke-width=".3" stroke-dasharray=".6,.4"/>`;
  });

  // Draw nodes
  ALL.forEach(n => {
    const isCurrent = gs.room === n.id;
    const isVisited = gs.visited.has(n.id);
    if(!isVisited && !isCurrent) return;
    const col = isCurrent ? '#c04000' : pen;
    const r = isCurrent ? 4 : 2.5;
    // Hand-drawn circle effect
    if(isCurrent){
      svg += `<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="none" stroke="#c04000" stroke-width=".6" ${isCurrent?'class="map-pulse"':''}/>`;
      svg += `<circle cx="${n.x}" cy="${n.y}" r="1.5" fill="#c04000"/>`;
    } else {
      svg += `<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="none" stroke="${pen}" stroke-width=".35" stroke-dasharray=".8,.3"/>`;
      svg += `<circle cx="${n.x}" cy="${n.y}" r="1" fill="${pen}" opacity=".4"/>`;
    }
    const above = n.y > 50;
    const ty = above ? n.y - r - 1.5 : n.y + r + 3.5;
    svg += `<text x="${n.x}" y="${ty}" text-anchor="middle" fill="${col}" font-size="${isCurrent?3.2:2.6}" font-weight="${isCurrent?'bold':'normal'}">${n.label}</text>`;
    svg += `<text x="${n.x}" y="${ty + (above ? -3 : 3)}" text-anchor="middle" font-size="3">${n.icon}</text>`;
  });

  svg += '</svg>';
  canvasEl.innerHTML = svg;

  locEl.innerHTML = `<div class="map-loc-name">${roomName}</div><div class="map-loc-sub">${roomSub}</div>`;

  // Nav hint: show what's left and right
  const idx = RORDER.indexOf(gs.room);
  if(idx >= 0){
    const leftRoom = ROOMS[RORDER[(idx - 1 + 5) % 5]];
    const rightRoom = ROOMS[RORDER[(idx + 1) % 5]];
    navHint.innerHTML = `← ${leftRoom.name} &nbsp;|&nbsp; ${rightRoom.name} →`;
  } else {
    navHint.innerHTML = '';
  }

  // Quests
  const activeObjs = (gs.objectives || []).filter(o => o.active);
  if(activeObjs.length === 0){
    questsEl.innerHTML = '<div class="map-quest-empty">Žádné aktivní úkoly.</div>';
    return;
  }

  const QUEST_DESC = {
    main_money: 'Dva litry. To je všechno, co mě dělí od svobody. Měl bych začít makat a sehnat tu zkurvenou dvoutisícovku, jinak tu v tý Křemži zkysnu navěky.',
    main_rep: 'Klíče od Fábie. To je mise číslo jedna. Asi bych měl obejít lidi a zjistit, kdo je má. Nastartovat, vypadnout, hotovo.',
    main_cihalova: 'Číhalová se mohla posrat z toho, že jsem na hodině usnul po kratomu. Teď je dost nasraná a chce po mně, abych jí sehnal něco pěkného. Prej má její kámoš, ten bezďák, něco pro ní. Měl bych ho najít, než se úplně rozjede.',
    side_krejci: 'Krejčí vypadá, že brečela. Někdo ji asi vydírá? Možná bych se měl zeptat, co se děje. Nebo ne. Ale platí fakt dobře...',
    side_figurova: 'Figurová mě zastavila a chce, abych sledoval Milana. Špinavá práce pro učitelku, ale platí za to. Asi bych měl zjistit, co ten Milan dělá, a pak jí to donést.',
    side_jana: 'Jana mi napsala, že chce kratom. 20 gramů. Dodám jí to a ona zaplatí. Kde ten kratom ale kurva seženu?',
    side_johnny: 'Johnny chce rande s Janou. Jako fakt, ten bohatej sígr to myslí vážně. Měl bych to nějak domluvit, třeba z toho něco kápne.',
    side_paja: 'Pája chce založit Betanu. Jako fakt, nějakej startup. Prej potřebuje moji pomoc. Co já vim o startupech? Ale říkal, že mi zaplatí, tak proč ne.',
    side_honza_ukol: 'Honza potřebuje komot z češtiny, jinak propadne. Asi bych mu měl pomoct, je to kámoš. Ale kde seženu komot?',
    quest_cihalova_burn: 'Dostal jsem od Matese pytel na odpadky, ještě trochu smrdí. Očekávej, že ti ještě někdy koupim démona ty zmrde! Možná bych ho ale mohl k něčemu využít? Ten krb v hospodě vypadá jako dobrý nápad...',
    quest_kgb: 'Kurva, agenti KGB a GRU operujou přímo v Křemži?! Asi bych je měl postřílet, než nás tu všechny pozavíraj.',
    quest_maturita: 'Maturita. Jak já to mám přežít? Neumim ani zapnout kalkulačku. Asi bych měl začít se učit... nebo ne.',
    quest_saman_minulost: 'Ten šaman ode mě chce bylinu, vodu a prach z pentagramu. Jako fakt. Prach z pentagramu. Kde to kurva najdu? Měl bych se asi podívat po Cibulkově labu, koupelně a sklepě.',
    quest_fabie: 'Mám klíče! Nebo aspoň vim, kde jsou. Zbývá jenom nastartovat tu Fábii a vypadnout z týhle díry!',
  };

  questsEl.innerHTML = activeObjs.map(o => {
    const desc = QUEST_DESC[o.id] || '';
    const expanded = gs._expandedQuest === o.id;
    const clickHint = desc && !expanded ? ' · klikni pro detail' : '';
    return `<div class="map-quest ${o.done?'done':''} ${expanded?'expanded':''}" onclick="gs._expandedQuest=gs._expandedQuest==='${o.id}'?null:'${o.id}';renderMap()">
      <div class="map-quest-header">
        <span class="map-quest-check">${o.done?'✅':'◻'}</span>
        <span class="map-quest-tag">${o.tag}</span>
        <span class="map-quest-text">${o.text}<span class="map-quest-hint">${clickHint}</span></span>
        <span class="map-quest-expand">${desc ? (expanded ? '▾' : '▸') : ''}</span>
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
