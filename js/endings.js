'use strict';
// ═══════════════════════════════════════════
//  SYSTÉM KONCOVEK (8 ENDINGŮ)
// ═══════════════════════════════════════════

const Endings = (() => {

  const ENDINGS = [
    {
      id: 'kral_kremze',
      name: '👑 Král Křemže',
      condition: () => gs.rep >= 200 && !_anyMurder(),
      desc: 'Fanda se stal legendou města. Všichni ho respektují. Nikdo nezemřel — prostě frajer.',
      color: '#ffd700',
      priority: 7,
    },
    {
      id: 'stin',
      name: '🌑 Stín',
      condition: () => _allMurders() && gs.rep >= 100,
      desc: 'Nikdo neví co jsi udělal, ale všichni se tě bojí. Křemže šeptá tvoje jméno ve tmě.',
      color: '#444466',
      priority: 8,
    },
    {
      id: 'utek',
      name: '🚗 Útěk',
      condition: () => (gs.inv.klice_fabie || gs.inv.klice_fabie_fig) && gs.rep < 50,
      desc: 'Nasedl jsi do Fábie a zmizel z Křemže navždy. Nikdo tě nehledal.',
      color: '#33aa55',
      priority: 3,
    },
    {
      id: 'vezeni',
      name: '⛓️ Vězení',
      condition: () => _murderCount() >= 2 && !gs.story.evidence_destroyed,
      desc: 'Policie tě dostala. Důkazy mluvily jasně. Cela 4×3 metrů je tvůj nový domov.',
      color: '#888888',
      priority: 4,
    },
    {
      id: 'transcendence',
      name: '🍃 Transcendence',
      condition: () => gs.story.saman_elixir_done && gs.inv.receptura && gs.stats.kratomUses >= 10,
      desc: 'Šaman tě zasvětil. Fanda transcendoval realitu. Barvy nikdy nepřestanou pulsovat.',
      color: '#aa44ff',
      priority: 6,
    },
    {
      id: 'double_agent',
      name: '🕵️ Double Agent',
      condition: () => gs.inv.kgb_prukaz && gs.story.kgb_won && gs.story.figurova_dark_done,
      desc: 'Pracuješ pro obě strany. Nikdo ti nevěří, ale všichni tě potřebují.',
      color: '#cc2244',
      priority: 5,
    },
    {
      id: 'laska',
      name: '💕 Láska',
      condition: () => typeof Affinity !== 'undefined' && Affinity.get('jana') >= 80,
      desc: 'Fanda a Jana spolu. Wholesome ending. Relativně.',
      color: '#ff66aa',
      priority: 6,
    },
    {
      id: 'true_ending',
      name: '🌌 True Ending',
      condition: () => _allQuestsDone() && _allArtifacts(),
      desc: 'Fanda se zastavil. Podíval se přímo na tebe. "Ty víš, že tohle je jen hra, ne?" 4th wall broken.',
      color: '#ffffff',
      priority: 10,
    },
  ];

  function _anyMurder() {
    return gs.story.mraz_done || gs.story.mates_killed || gs.story.saman_dead || gs.story.figurova_dead;
  }

  function _allMurders() {
    return gs.story.mraz_done && gs.story.mates_killed;
  }

  function _murderCount() {
    let c = 0;
    if (gs.story.mraz_done) c++;
    if (gs.story.mates_killed) c++;
    if (gs.story.saman_dead) c++;
    if (gs.story.figurova_dead) c++;
    return c;
  }

  function _allQuestsDone() {
    return gs.stats.questsDone >= 8;
  }

  function _allArtifacts() {
    return gs.inv.receptura && gs.inv.vysvedceni && gs.inv.kgb_prukaz && gs.inv.membership_vaza;
  }

  function evaluate() {
    const matched = ENDINGS.filter(e => {
      try { return e.condition(); } catch(_) { return false; }
    });
    if (matched.length === 0) return ENDINGS[2]; // default: Útěk
    matched.sort((a, b) => b.priority - a.priority);
    return matched[0];
  }

  function triggerEnding() {
    const ending = evaluate();
    gs.running = false;

    const ov = document.getElementById('ending-ov');
    if (!ov) { showWin(); return; }

    document.getElementById('ending-title').textContent = ending.name;
    document.getElementById('ending-desc').textContent = ending.desc;
    document.getElementById('ending-title').style.color = ending.color;

    // Stats
    const statsEl = document.getElementById('ending-stats');
    if (statsEl) {
      const s = gs.stats;
      statsEl.innerHTML = `
        <div class="estat"><span class="ev">${gs.money}</span><span class="el">Kč</span></div>
        <div class="estat"><span class="ev">${gs.rep}</span><span class="el">Reputace</span></div>
        <div class="estat"><span class="ev">${Math.floor(gs.ts/1000)}s</span><span class="el">Čas</span></div>
        <div class="estat"><span class="ev">${s.questsDone}</span><span class="el">Questů</span></div>
        <div class="estat"><span class="ev">${s.kratomUses}</span><span class="el">Kratomů</span></div>
        <div class="estat"><span class="ev">${_murderCount()}</span><span class="el">Mrtvol</span></div>
      `;
    }

    ov.classList.add('on');
    setTimeout(() => ov.classList.add('visible'), 50);

    // Save ending to profile
    if (typeof activeProfile !== 'undefined' && activeProfile.endings) {
      activeProfile.endings[ending.id] = true;
      if (typeof profileSaveProgress === 'function') profileSaveProgress();
    }
  }

  function getAll() { return ENDINGS; }
  function getUnlocked() {
    if (typeof activeProfile === 'undefined') return [];
    const e = activeProfile.endings || {};
    return ENDINGS.filter(en => e[en.id]);
  }

  return { evaluate, triggerEnding, getAll, getUnlocked, ENDINGS };
})();
