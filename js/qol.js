'use strict';
// ═══════════════════════════════════════════
//  QUALITY OF LIFE – Fast Travel, Stats, Achievements
// ═══════════════════════════════════════════

// ─── FAST TRAVEL ─────────────────────────────────────────────────────────────

const FastTravel = (() => {
  const LOCATIONS = [
    { id: 'ucebna',  name: 'Učebna 12',        icon: '✏️' },
    { id: 'billa',   name: 'Billa',             icon: '🛒' },
    { id: 'hospoda', name: 'Hospoda Big Poppa', icon: '🍺' },
    { id: 'ulice',   name: 'Ulice',             icon: '🌆' },
    { id: 'kremze',  name: 'Křemže náměstí',    icon: '🏠' },
    { id: 'doma',    name: 'Doma',              icon: '🏡' },
    { id: 'sklep',   name: 'Mikulášův sklep',   icon: '🕯️' },
  ];

  function open() {
    const ov = document.getElementById('fasttravel-ov');
    if (!ov) return;

    const list = document.getElementById('ft-list');
    list.innerHTML = '';
    for (const loc of LOCATIONS) {
      const unlocked = gs.visited.has(loc.id);
      const isCurrent = gs.room === loc.id;
      const btn = document.createElement('button');
      btn.className = 'ft-btn' + (unlocked ? '' : ' locked') + (isCurrent ? ' current' : '');
      btn.innerHTML = `<span class="ft-icon">${loc.icon}</span><span class="ft-name">${loc.name}</span>` +
        (!unlocked ? '<span class="ft-lock">🔒</span>' : isCurrent ? '<span class="ft-lock">📍</span>' : '');
      if (unlocked && !isCurrent) {
        btn.onclick = () => { _travelTo(loc.id); close(); };
      }
      list.appendChild(btn);
    }

    ov.classList.add('on');
    gs.running = false;
  }

  function close() {
    const ov = document.getElementById('fasttravel-ov');
    if (ov) ov.classList.remove('on');
    gs.running = true;
  }

  function _travelTo(roomId) {
    gs.room = roomId;
    gs.roomFadeAlpha = 1;
    if (typeof initRoom === 'function') initRoom();
    fnotif(`🚶 Cestoval jsi do: ${LOCATIONS.find(l => l.id === roomId)?.name || roomId}`, 'pos');
    if (gs.stats) gs.stats.roomChanges++;
  }

  return { open, close, LOCATIONS };
})();


// ─── GAME STATS OVERLAY ─────────────────────────────────────────────────────

const GameStats = (() => {
  function open() {
    const ov = document.getElementById('stats-ov');
    if (!ov) return;

    const s = gs.stats;
    const time = gs.ts > 0 ? Math.floor(gs.ts / 1000) : 0;
    const mins = Math.floor(time / 60);
    const secs = time % 60;

    document.getElementById('stats-body').innerHTML = `
      <div class="srow"><span>⏱️ Čas ve hře</span><span>${mins}m ${secs}s</span></div>
      <div class="srow"><span>👣 Kroků</span><span>${s.steps}</span></div>
      <div class="srow"><span>💰 Vyděláno</span><span>${s.moneyEarned} Kč</span></div>
      <div class="srow"><span>💸 Utraceno</span><span>${s.moneySpent} Kč</span></div>
      <div class="srow"><span>🍃 Kratomů</span><span>${s.kratomUses}</span></div>
      <div class="srow"><span>💨 Blendů</span><span>${s.blendUses}</span></div>
      <div class="srow"><span>🍕 Žemlí snědeno</span><span>${s.zemleEaten}</span></div>
      <div class="srow"><span>🍺 Piv</span><span>${s.pivosDrunk}</span></div>
      <div class="srow"><span>💬 Rozhovorů</span><span>${s.npcTalks}</span></div>
      <div class="srow"><span>✅ Questů splněno</span><span>${s.questsDone}</span></div>
      <div class="srow"><span>🚪 Změn místností</span><span>${s.roomChanges}</span></div>
      <div class="srow"><span>🎮 Miniher</span><span>${s.minigamesPlayed} (${s.minigamesWon} vyhráno)</span></div>
      <div class="srow"><span>⭐ Reputace celkem</span><span>${s.repEarned}</span></div>
      <div class="srow"><span>💀 Smrtí</span><span>${s.deaths}</span></div>
    `;

    ov.classList.add('on');
    gs.running = false;
  }

  function close() {
    const ov = document.getElementById('stats-ov');
    if (ov) ov.classList.remove('on');
    gs.running = true;
  }

  return { open, close };
})();


// ─── ACHIEVEMENTS ────────────────────────────────────────────────────────────

const Achievements = (() => {
  const ACHS = [
    { id: 'first_kratom',     name: '🍃 První dávka',          desc: 'Poprvé jsi užil kratom',              check: () => gs.stats.kratomUses >= 1 },
    { id: 'kratom_10',        name: '🌿 Závislák',             desc: '10× kratom',                          check: () => gs.stats.kratomUses >= 10 },
    { id: 'kratom_50',        name: '☠️ Zelená smrt',          desc: '50× kratom',                          check: () => gs.stats.kratomUses >= 50 },
    { id: 'first_money',      name: '💰 První prachy',         desc: 'Vydělal jsi první peníze',            check: () => gs.stats.moneyEarned >= 1 },
    { id: 'rich',             name: '🤑 Křemžský oligarcha',   desc: 'Měl jsi 5000 Kč najednou',           check: () => gs.money >= 5000 },
    { id: 'broke',            name: '💸 Na dně',               desc: 'Měl jsi 0 Kč',                       check: () => gs.money <= 0 },
    { id: 'first_death',      name: '💀 Poprvé mrtvý',         desc: 'Poprvé jsi zemřel',                  check: () => gs.stats.deaths >= 1 },
    { id: 'survivor',         name: '🛡️ Přeživší',            desc: 'Přežij 10 minut',                    check: () => gs.ts >= 600000 },
    { id: 'explorer',         name: '🗺️ Průzkumník',          desc: 'Navštiv všech 5 hlavních lokací',     check: () => gs.visited.size >= 5 },
    { id: 'full_explorer',    name: '🧭 Kartograf',            desc: 'Navštiv všechny lokace',              check: () => gs.visited.size >= 7 },
    { id: 'talker',           name: '💬 Řečník',               desc: 'Mluv s 10 NPC',                      check: () => gs.stats.npcTalks >= 10 },
    { id: 'quest_master',     name: '📜 Questař',              desc: 'Splň 5 questů',                      check: () => gs.stats.questsDone >= 5 },
    { id: 'murderer',         name: '🔪 Vrah',                 desc: 'Zabil jsi někoho',                   check: () => gs.story.mraz_done || gs.story.mates_killed },
    { id: 'serial_killer',    name: '🩸 Sériový vrah',         desc: 'Zabil jsi 3+ lidi',                  check: () => { let c=0; if(gs.story.mraz_done)c++; if(gs.story.mates_killed)c++; if(gs.story.saman_dead)c++; return c>=3; } },
    { id: 'pacifist',         name: '☮️ Pacifista',            desc: 'Dokonči hru bez zabití',              check: () => gs.won && !gs.story.mraz_done && !gs.story.mates_killed && !gs.story.saman_dead },
    { id: 'speedrun',         name: '⚡ Speedrunner',           desc: 'Dokonči hru do 5 minut',             check: () => gs.won && gs.ts < 300000 },
    { id: 'glutton',          name: '🍕 Žrout',                desc: 'Sněz 20 žemlí',                      check: () => gs.stats.zemleEaten >= 20 },
    { id: 'drunk',            name: '🍺 Opilec',               desc: 'Vypij 10 piv',                       check: () => gs.stats.pivosDrunk >= 10 },
    { id: 'minigamer',        name: '🎮 Hráč miniher',         desc: 'Vyhraj 3 minihry',                   check: () => gs.stats.minigamesWon >= 3 },
    { id: 'rep_legend',       name: '👑 Legenda',              desc: 'Dosáhni 100 reputace',               check: () => gs.rep >= 100 },
    { id: 'rep_god',          name: '🌌 Bůh Křemže',           desc: 'Dosáhni 500 reputace',               check: () => gs.rep >= 500 },
    { id: 'fabie_driver',     name: '🚗 Řidič Fábie',          desc: 'Získej klíče od Fábie',              check: () => gs.inv.klice_fabie || gs.inv.klice_fabie_fig },
    { id: 'kgb_agent',        name: '🕵️ Agent KGB',           desc: 'Získej KGB průkaz',                  check: () => gs.inv.kgb_prukaz },
    { id: 'elixir_trip',      name: '🧪 Elixír mládí',         desc: 'Vypij elixír mládí',                 check: () => gs.story.saman_elixir_done },
    { id: 'dark_path',        name: '😈 Temná cesta',          desc: 'Přijmi Figurové temnou nabídku',     check: () => gs.story.figurova_dark_accepted },
    { id: 'first_quest',      name: '✅ První quest',           desc: 'Splň svůj první quest',              check: () => gs.stats.questsDone >= 1 },
    { id: 'walker',           name: '🚶 Chodec',               desc: 'Udělej 10000 kroků',                 check: () => gs.stats.steps >= 10000 },
    { id: 'gamer',            name: '🎯 Gamer',                desc: 'Zahraj 5 miniher',                   check: () => gs.stats.minigamesPlayed >= 5 },
    { id: 'maturant',         name: '🎓 Maturant',             desc: 'Získej maturitní vysvědčení',        check: () => gs.inv.vysvedceni },
    { id: 'voodoo_master',    name: '🪆 Voodoo',               desc: 'Použi voodoo panenku',               check: () => gs.story.milan_voodoo_dead },
    { id: 'kontrarozvedka',  name: '🕵️ Kontrarozvědka',     desc: 'Dokonči Bezďákovu poslední misi',    check: () => gs.story.gru_quest_done },
    { id: 'exorcist',        name: '🔥 Exorcista',            desc: 'Vyhraj exorcismus rituál',           check: () => gs.story.gru_exorcism_won },
    { id: 'chase_survivor',  name: '🚗 Honička',              desc: 'Přežij honičku ve Fábii',            check: () => gs.story.gru_blackmail_timer === 0 && gs.story.gru_route === 'blackmail' && !gs.dead },
  ];

  let _unlocked = new Set();
  let _notifQueue = [];

  function check() {
    for (const a of ACHS) {
      if (_unlocked.has(a.id)) continue;
      try {
        if (a.check()) {
          _unlocked.add(a.id);
          _notifQueue.push(a);
        }
      } catch(_) {}
    }
    _showNotifs();
  }

  function _showNotifs() {
    if (_notifQueue.length === 0) return;
    const a = _notifQueue.shift();
    fnotif(`🏆 ${a.name}`, 'pos');
    addLog(`🏆 Achievement: ${a.name} — ${a.desc}`, 'lr');
    if (_notifQueue.length > 0) setTimeout(_showNotifs, 1500);
  }

  function open() {
    const ov = document.getElementById('ach-ov');
    if (!ov) return;

    check();
    const body = document.getElementById('ach-body');
    body.innerHTML = '';
    for (const a of ACHS) {
      const done = _unlocked.has(a.id);
      const el = document.createElement('div');
      el.className = 'ach-item' + (done ? ' done' : '');
      el.innerHTML = `<span class="ach-name">${done ? a.name : '❓ ???'}</span>` +
        `<span class="ach-desc">${done ? a.desc : 'Zatím neodkryto'}</span>`;
      body.appendChild(el);
    }
    document.getElementById('ach-count').textContent = `${_unlocked.size} / ${ACHS.length}`;
    ov.classList.add('on');
    gs.running = false;
  }

  function close() {
    const ov = document.getElementById('ach-ov');
    if (ov) ov.classList.remove('on');
    gs.running = true;
  }

  function reset() { _unlocked = new Set(); _notifQueue = []; }

  return { check, open, close, reset, ACHS, getUnlocked: () => _unlocked };
})();
