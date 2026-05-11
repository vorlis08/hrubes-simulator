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
  Inventory.initPocket();
  initObj(); initNotebook(); initRoom(canvas.width * 0.5, canvas.height * 0.7); updateHUD(); updateInv();
  addStoryEntry('prolog', 'Nový den v Křemži. Musím vydělat prachy a nastartovat Fábii.', '🏠');
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
      'c2-cert-ov','phone-ov','kremzogram-ov','quest-ov','settings-ov']
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

  if(nk === 'q'){
    document.getElementById('quest-ov').classList.toggle('on');
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
  activeProfile.statsUnlocked = true;
  profileSaveProgressLocal();
  gs.inv.datapad = 0;
  updateInv();
  addLog('*Aktivuješ datapad. Cibulkův sledovací systém se napojuje na tvůj profil. Statistiky odemčeny!*', 'lm');
  fnotif('📊 Statistiky odemčeny!', 'pos');
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
  const visited = gs.visited ? gs.visited.size : 0;
  const totalRooms = Object.keys(ROOMS).length;
  const quests = gs.quests ? Object.values(gs.quests).filter(q => q === 'done').length : 0;
  const totalQuests = gs.quests ? Object.keys(gs.quests).length : 0;
  const invCount = gs.inv ? Object.values(gs.inv).filter(v => v > 0).length : 0;

  const bar = (val, max, color) => {
    const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
    return `<div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
  };

  body.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card stat-card-hero">
        <div class="stat-card-icon">⏱</div>
        <div class="stat-card-val">${mins}:${secs.toString().padStart(2,'0')}</div>
        <div class="stat-card-label">Herní čas</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">💰</div>
        <div class="stat-card-val">${gs.money} Kč</div>
        <div class="stat-card-label">Peníze</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">⭐</div>
        <div class="stat-card-val">${gs.rep}</div>
        <div class="stat-card-label">REP</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon">⚡</div>
        <div class="stat-card-val">${gs.energy}%</div>
        <div class="stat-card-label">Energie</div>
      </div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">💸 Ekonomika</div>
      <div class="stat-row"><span>Celkem vyděláno</span><span class="stat-num">${s.moneyEarned} Kč</span></div>
      <div class="stat-row"><span>Celkem utraceno</span><span class="stat-num">${s.moneySpent} Kč</span></div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">🗺 Průzkum</div>
      <div class="stat-row"><span>Navštívené místnosti</span><span class="stat-num">${visited} / ${totalRooms}</span></div>
      ${bar(visited, totalRooms, '#4ecdc4')}
      <div class="stat-row"><span>Přechody mezi místnostmi</span><span class="stat-num">${s.roomChanges}</span></div>
      <div class="stat-row"><span>Kroky</span><span class="stat-num">${s.steps}</span></div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">📋 Questy</div>
      <div class="stat-row"><span>Splněné questy</span><span class="stat-num">${quests} / ${totalQuests}</span></div>
      ${bar(quests, totalQuests, '#f7b731')}
      <div class="stat-row"><span>Dialogy / volby</span><span class="stat-num">${s.dialogChoices}</span></div>
      <div class="stat-row"><span>Rozhovory s NPC</span><span class="stat-num">${s.npcTalks}</span></div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">🧪 Substance</div>
      <div class="stat-row"><span>🌿 Kratom</span><span class="stat-num">${s.kratomUses}×</span></div>
      <div class="stat-row"><span>🍃 Blend</span><span class="stat-num">${s.blendUses}×</span></div>
      <div class="stat-row"><span>💊 Piko</span><span class="stat-num">${s.pikoUses}×</span></div>
      <div class="stat-row"><span>🍕 Žemle</span><span class="stat-num">${s.zemleEaten}×</span></div>
      <div class="stat-row"><span>🍺 Piva</span><span class="stat-num">${s.pivosDrunk}×</span></div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">🎮 Minihry</div>
      <div class="stat-row"><span>Odehráno</span><span class="stat-num">${s.minigamesPlayed}</span></div>
      <div class="stat-row"><span>Vyhráno</span><span class="stat-num">${s.minigamesWon}</span></div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">📦 Inventář</div>
      <div class="stat-row"><span>Aktuální předměty</span><span class="stat-num">${invCount}</span></div>
      <div class="stat-row"><span>Celkem sebráno</span><span class="stat-num">${s.itemsCollected}</span></div>
      <div class="stat-row"><span>Celkem REP</span><span class="stat-num">${s.repEarned}</span></div>
      <div class="stat-row"><span>Energie spotřebována</span><span class="stat-num">${s.energyDrained}</span></div>
    </div>
  `;
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
