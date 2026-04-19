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
  initObj(); initRoom(canvas.width * 0.5, canvas.height * 0.7); updateHUD(); updateInv();
  requestAnimationFrame(gameLoop);

  addLog('=== KŘEMŽE TĚ VÍTÁ ===', 'ls');
  addLog('Probouzíš se doma. Prohlédni si sbírku artefaktů.', 'lp');
  addLog('Vybrat kasičku a jít ven dveřmi.', 'lm');
  addLog('Cíl: Nastartuj Fábii a jeď domů.', 'lr');
}

// ─── Pre-game vitrines rendering ─────────────────────────────────────────

function renderPregameVitrines(){
  const container = document.getElementById('pregame-vitrines');
  if(!container || !activeProfile) return;
  container.innerHTML = '';

  const artDefs = [
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

  artDefs.forEach(a => {
    const unlocked = activeProfile.artifacts[a.key];
    const d = document.createElement('div');
    d.className = 'pregame-vitrine' + (unlocked ? '' : ' empty');
    if(unlocked){
      d.innerHTML = `<div class="pv-emoji">${a.emoji}</div><div class="pv-name">${a.name}</div>`;
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
  keys[nk] = true;
  if(MOVE_KEYS.has(nk)) e.preventDefault();

  if(nk === 'q'){
    document.getElementById('quest-ov').classList.toggle('on');
  }

  if(!gs.running || gs.dead) return;

  if(nk === 'e'){ e.preventDefault(); interact(); }
  if(nk === '1') useKratom();
  if(nk === '2') useZemle();
  if(nk === 'Escape'){ closeAllOverlays(); }
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

// ─── Safety: Escape zavře VŠECHNY overlaye ─────────────────────────────
function closeAllOverlays(){
  document.getElementById('dov').classList.remove('on');
  document.getElementById('riddle-ov').classList.remove('on');
  document.getElementById('note-ov').classList.remove('on');
  document.getElementById('screenshot-ov').classList.remove('on');
  document.getElementById('foto-kubatova-ov').classList.remove('on');
  document.getElementById('c2-cert-ov').classList.remove('on');
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
