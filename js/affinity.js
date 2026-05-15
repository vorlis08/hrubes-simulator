'use strict';
// ═══════════════════════════════════════════
//  NPC VZTAHOVÝ SYSTÉM (AFFINITY)
// ═══════════════════════════════════════════

const Affinity = (() => {
  const CLAMP_MIN = -100;
  const CLAMP_MAX = 100;

  const LABELS = [
    { min: -100, label: '☠️ Nepřítel',    color: '#ff2222' },
    { min: -50,  label: '😡 Nenávist',    color: '#ff6644' },
    { min: -20,  label: '😒 Nedůvěra',    color: '#ff9944' },
    { min: -5,   label: '😐 Chlad',       color: '#aaaaaa' },
    { min: 5,    label: '🙂 Neutrální',   color: '#cccccc' },
    { min: 20,   label: '😊 Sympatický',  color: '#66dd66' },
    { min: 50,   label: '💚 Přítel',      color: '#22cc88' },
    { min: 80,   label: '❤️ Věrný spojenec', color: '#ff66aa' },
  ];

  const TRACKED_NPCS = [
    'cihalova','krejci','figurova','jana','johnny','milan',
    'saman','bezdak','paja','honza','mikulas','mates',
    'lenka','novak','kubatova'
  ];

  function init() {
    if (!gs.affinity) gs.affinity = {};
    for (const npc of TRACKED_NPCS) {
      if (gs.affinity[npc] === undefined) gs.affinity[npc] = 0;
    }
  }

  function change(npc, delta, reason) {
    if (!gs.affinity) init();
    if (gs.affinity[npc] === undefined) return;
    const old = gs.affinity[npc];
    gs.affinity[npc] = Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, old + delta));
    const actual = gs.affinity[npc] - old;
    if (actual !== 0 && reason) {
      const sign = actual > 0 ? '+' : '';
      fnotif(`${sign}${actual} ${_npcName(npc)}`, actual > 0 ? 'pos' : 'lw');
    }
    return gs.affinity[npc];
  }

  function get(npc) {
    if (!gs.affinity) init();
    return gs.affinity[npc] || 0;
  }

  function getLabel(npc) {
    const v = get(npc);
    let lbl = LABELS[0];
    for (const l of LABELS) if (v >= l.min) lbl = l;
    return lbl;
  }

  function modifiesPrice(npc) {
    const v = get(npc);
    if (v >= 50) return 0.8;
    if (v >= 20) return 0.9;
    if (v <= -50) return 1.3;
    if (v <= -20) return 1.15;
    return 1;
  }

  function willTalk(npc) {
    return get(npc) > -60;
  }

  function _npcName(id) {
    const map = {
      cihalova:'Číhalová', krejci:'Krejčí', figurova:'Figurová',
      jana:'Jana', johnny:'Johnny', milan:'Milan', saman:'Šaman',
      bezdak:'Bezďák', paja:'Pája', honza:'Honza', mikulas:'Mikuláš',
      mates:'Mateš', lenka:'Lenka', novak:'Novák', kubatova:'Kubátová'
    };
    return map[id] || id;
  }

  function reset() {
    gs.affinity = {};
    init();
  }

  return { init, change, get, getLabel, modifiesPrice, willTalk, reset, TRACKED_NPCS, LABELS };
})();
