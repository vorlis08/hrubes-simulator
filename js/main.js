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
  initObj(); initRoom(canvas.width * 0.5, canvas.height * 0.7); updateHUD(); updateInv();
  phoneInitStartMessages();
  phoneStartTimedMessages();
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
    if(e.key === 'Escape'){ e.target.blur(); }
    if(e.key === 'Enter' && document.getElementById('riddle-ov').classList.contains('on'))
      submitPassword();
    return;
  }

  const nk = normKey(e.key);

  // Pokud je telefon otevřený, předej klávesy Phone handleru
  if(Phone.isOpen()){
    const shiftKey = e.shiftKey && nk === 'Tab' ? 'shift+Tab' : nk;
    if(Phone.handleKey(shiftKey)){ e.preventDefault(); return; }
  }

  keys[nk] = true;
  if(MOVE_KEYS.has(nk)) e.preventDefault();

  // ESC – musí být PŘED early return (gs.running=false při pauze)
  if(nk === 'Escape'){
    e.preventDefault();
    const pauseOv = document.getElementById('pause-ov');
    if(pauseOv.classList.contains('on')){
      if(!document.getElementById('pause-sub').classList.contains('pause-sub-hidden')){
        closePauseSub();
      } else {
        resumeGame();
      }
    } else if(Phone.isOpen()){
      closePhone();
    } else if(document.getElementById('dov').classList.contains('on') ||
              document.getElementById('riddle-ov').classList.contains('on') ||
              document.getElementById('note-ov').classList.contains('on')){
      closeAllOverlays();
    } else if(gs.running){
      openPause();
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

  if(nk === 'e'){ e.preventDefault(); interact(); }
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

// ─── Safety: Escape zavře VŠECHNY overlaye ─────────────────────────────
function closeAllOverlays(){
  document.getElementById('dov').classList.remove('on');
  document.getElementById('riddle-ov').classList.remove('on');
  document.getElementById('note-ov').classList.remove('on');
  document.getElementById('screenshot-ov').classList.remove('on');
  document.getElementById('foto-kubatova-ov').classList.remove('on');
  document.getElementById('c2-cert-ov').classList.remove('on');
  document.getElementById('phone-ov').classList.remove('on');
  document.getElementById('pause-ov').classList.remove('on');
  for(const k in keys) keys[k] = false;
  gs.player.mv = false;
}

// ─── Pause menu ──────────────────────────────────────────────────────────
let _pausedRunning = false;

function openPause(){
  if(!gs.running && !_pausedRunning) return;
  _pausedRunning = gs.running;
  gs.running = false;
  document.getElementById('pause-ov').classList.add('on');
  document.getElementById('pause-menu').style.display = '';
  document.getElementById('pause-sub').classList.add('pause-sub-hidden');
}

function resumeGame(){
  document.getElementById('pause-ov').classList.remove('on');
  gs.running = _pausedRunning;
  _pausedRunning = false;
}

function closePause(){
  resumeGame();
}

function _showPauseSub(html){
  document.getElementById('pause-menu').style.display = 'none';
  const sub = document.getElementById('pause-sub');
  sub.classList.remove('pause-sub-hidden');
  document.getElementById('pause-sub-content').innerHTML = html;
}

function closePauseSub(){
  document.getElementById('pause-menu').style.display = '';
  document.getElementById('pause-sub').classList.add('pause-sub-hidden');
}

function openPauseDiary(){
  const entries = Phone.diary.slice().reverse();
  if(!entries.length){
    _showPauseSub('<div style="text-align:center;color:#666;padding:30px 0;font-style:italic">Deníček je prázdný.<br>Příběh se teprve píše...</div>');
    return;
  }
  const html = entries.map(d =>
    `<div class="ps-diary-entry">
      <div class="ps-diary-time">${d.time}</div>
      <div class="ps-diary-title">${d.title}</div>
      <div class="ps-diary-text">${d.text}</div>
      ${d.hint ? '<div class="ps-diary-hint">💡 ' + d.hint + '</div>' : ''}
    </div>`
  ).join('');
  _showPauseSub(html);
}

function openPauseStats(){
  const time = gs.ts || 0;
  const mins = Math.floor(time / 60000);
  const secs = Math.floor((time % 60000) / 1000);
  const visited = gs.visited ? gs.visited.size : 0;
  const questsDone = gs.objectives ? gs.objectives.filter(o => o.done).length : 0;
  const questsActive = gs.objectives ? gs.objectives.filter(o => o.active && !o.done).length : 0;
  const itemCount = Object.values(gs.inv).filter(v => v > 0).length;
  const smsSent = Phone.messages.filter(m => m.replied).length;
  const kgLikes = Phone.kremzogram.filter(p => p.playerLiked).length;

  const stats = [
    ['💰 Peníze', gs.money + ' Kč'],
    ['⚡ Energie', Math.round(gs.energy) + '%'],
    ['👑 Reputace', gs.rep + ' REP'],
    ['⏱️ Herní čas', mins + ':' + secs.toString().padStart(2,'0')],
    ['🗺️ Navštíveno lokací', visited],
    ['✅ Splněné úkoly', questsDone],
    ['📋 Aktivní úkoly', questsActive],
    ['🎒 Předměty v inventáři', itemCount],
    ['💬 Odpovězené SMS', smsSent],
    ['❤️ Lajknuté příspěvky', kgLikes],
    ['🌿 Kratom užit', gs.story.kratom_used ? 'Ano' : 'Ne'],
    ['📍 Aktuální lokace', gs.room || '?'],
  ];

  _showPauseSub(stats.map(([l,v]) => `<div class="ps-stat"><span class="ps-stat-label">${l}</span><span class="ps-stat-val">${v}</span></div>`).join(''));
}

function openPauseObjectives(){
  const objs = gs.objectives ? gs.objectives.filter(o => o.active) : [];
  if(!objs.length){
    _showPauseSub('<div style="text-align:center;color:#666;padding:30px 0;font-style:italic">Žádné aktivní úkoly.</div>');
    return;
  }
  _showPauseSub(objs.map(o =>
    `<div class="ps-obj ${o.done ? 'ps-obj-done' : ''}">
      <span style="color:${o.done ? '#6a6' : 'var(--gold)'}">${o.done ? '✅' : '◇'}</span>
      <span style="color:var(--muted2);font-size:9px;margin:0 6px">[${o.tag}]</span>
      <span style="color:${o.done ? '#666' : '#ccc'};font-size:12px">${o.text}</span>
    </div>`
  ).join(''));
}

function openPauseControls(){
  const controls = [
    ['W A S D', 'Pohyb'],
    ['E', 'Interakce s NPC / objekty'],
    ['T', 'Otevřít telefon'],
    ['Q', 'Zobrazit úkoly'],
    ['1', 'Použít kratom'],
    ['2', 'Sníst žemli'],
    ['ESC', 'Pauza / Zavřít menu'],
    ['Tab / ←→', 'Přepínání tabů telefonu'],
    ['↑↓', 'Navigace v telefonu'],
    ['Enter', 'Odpovědět / Lajknout'],
    ['1-2', 'Vybrat odpověď na SMS'],
  ];
  _showPauseSub(controls.map(([k,d]) =>
    `<div class="ps-ctrl"><span class="ps-ctrl-key">${k}</span><span class="ps-ctrl-desc">${d}</span></div>`
  ).join(''));
}

function confirmQuit(){
  _showPauseSub(`<div class="ps-confirm">
    <p>Opravdu chceš opustit hru?<br><span style="font-size:11px;color:#888">Postup nebude uložen.</span></p>
    <button class="ps-confirm-yes" onclick="closePause();returnToHomescreen()">Ano, opustit hru</button>
  </div>`);
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
