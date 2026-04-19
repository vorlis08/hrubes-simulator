'use strict';
// ═══════════════════════════════════════════
//  HERNÍ STAV
// ═══════════════════════════════════════════

const gs = {
  running: false,
  dead: false,
  money: 150,
  energy: 100,
  rep: 0,
  inv: { kratom:0, blend:0, zemle:1, piko:0, pivo:0, note:0, cert:0, pytel:0, fake_kratom:0, cibule:0, jana_cislo:0, kratom_kava:0, voodoo:0, nuz:0, screenshot:0, hlasovka:0, foto_kubatova:0, c2_cert:0, fig_nuz:0, fig_gun:0, milan_phone:0, zelizka:0, prasek:0, klice_vila:0, podprsenka:0, klice_fabie:0, klice_fabie_fig:0, saman_hlava:0, membership_vaza:0, maturita:0, propiska:0, foto_figurova:0 },

  kratom_on:      false,
  kratom_t:       0,
  kratom_max:     13000,
  kratom_freeze:  0,
  kratom_history: [],
  kratom_blend_on: false,
  blend_boost_until: 0,

  // Číhalová timer
  cihalova_deadline: 0,   // timestamp kdy vyprší čas (ms), 0 = neaktivní
  cihalova_coming:   false,
  ca_active:         false,  // probíhá canvas animace útoku
  ca:                null,   // stav animace { phase, x, y, phaseT, flash }

  // Tělo Číhalové
  cihalova_in_bag: false, // je v pytli

  // Regál mléka – tajný vchod do sklepa
  shelf_sliding: false,
  shelf_anim:    0,

  // Voodoo animace
  voodoo_anim: false,
  voodoo_t:    0,
  voodoo_tx:   0,
  voodoo_ty:   0,
  vm:          null,   // stav animace Milana { x, y, phase, phaseT, trail, fnX, fnY }
  kubatova_bite_anim: null, // { startTime, figX, figY } – Kubátová jde k Figurové
  kasna_red:   false,  // kašna je červená od krve

  // Šaman – špatná hesla tracker
  saman_wrong: 0,
  // Šaman mrtvý
  saman_dead: false,
  saman_death_anim: null,
  // Šaman OBÍDEK – nahá běhací animace
  saman_naked_anim: null,
  // Pláteníková
  platenikova_in: false,
  // Pre-game artefakty vzaté do hry
  pregame_artifacts: {},
  // Kasička doma
  kasicka_taken: false,

  room: 'ucebna',
  player: { x:0, y:0, spd:4.4, face:'r', mv:false },

  story:  {},
  quests: {},
  visited: new Set(['ucebna']),
  objectives: [],

  ts: 0,
  lastDrain: 0,
  cihalova_collapsed: false,
  won: false,
  villa_deadline: 0,
  milan_leave_deadline: 0,
  johnny_stay_deadline: 0,

  // Room transition fade
  roomFadeAlpha: 0,   // 1 = plně černé, klesá k 0

  // Smrti NPC – animace
  mates_death_anim: null,   // { x, y, startTime }
  milan_death_anim: null,   // { x, y, startTime }
  // Figurová – sanitka v učebně
  // (nastaveno přes gs.story.figurova_sanitka)
};

function resetGameState(){
  gs.running = false;
  gs.dead    = false;
  gs.money   = 150;
  gs.energy  = 100;
  gs.rep     = 0;

  Object.assign(gs.inv, {
    kratom:0, blend:0, zemle:1, piko:0, pivo:0, note:0, cert:0, pytel:0,
    fake_kratom:0, cibule:0, jana_cislo:0, kratom_kava:0, voodoo:0, nuz:0,
    screenshot:0, hlasovka:0, foto_kubatova:0, c2_cert:0, fig_nuz:0, fig_gun:0,
    milan_phone:0, zelizka:0, prasek:0, klice_vila:0, klice_fabie:0,
    klice_fabie_fig:0, saman_hlava:0, membership_vaza:0, maturita:0,
    propiska:0, foto_figurova:0,
  });

  gs.kratom_on        = false;
  gs.kratom_t         = 0;
  gs.kratom_max       = 13000;
  gs.kratom_freeze    = 0;
  gs.kratom_history   = [];
  gs.kratom_blend_on  = false;
  gs.blend_boost_until = 0;

  gs.cihalova_deadline  = 0;
  gs.cihalova_coming    = false;
  gs.ca_active          = false;
  gs.ca                 = null;
  gs.cihalova_in_bag    = false;
  gs.cihalova_collapsed = false;

  gs.shelf_sliding = false;
  gs.shelf_anim    = 0;

  gs.voodoo_anim        = false;
  gs.voodoo_t           = 0;
  gs.voodoo_tx          = 0;
  gs.voodoo_ty          = 0;
  gs.vm                 = null;
  gs.kubatova_bite_anim = null;
  gs.kasna_red          = false;

  gs.saman_wrong      = 0;
  gs.saman_dead       = false;
  gs.saman_death_anim = null;
  gs.saman_naked_anim = null;
  gs.platenikova_in   = false;
  gs.pregame_artifacts = {};
  gs.kasicka_taken    = false;

  gs.room    = 'ucebna';
  gs.player  = { x:0, y:0, spd:4.4, face:'r', mv:false };
  gs.story   = {};
  gs.quests  = {};
  gs.visited = new Set(['ucebna']);
  gs.objectives = [];

  gs.ts                   = 0;
  gs.lastDrain            = 0;
  gs.won                  = false;
  gs.villa_deadline       = 0;
  gs.milan_leave_deadline = 0;
  gs.johnny_stay_deadline = 0;
  gs.roomFadeAlpha        = 0;
  gs.mates_death_anim     = null;
  gs.milan_death_anim     = null;
  delete gs._deathFlash;
}

function gainRep(amount, reason){
  if(amount <= 0) return;
  gs.rep += amount;
  updateHUD();
  if(reason) addLog(`+${amount} REP: ${reason}`, 'lr');
  fnotif(`+${amount} REP`, 'rep');
  if(gs.money >= 2000) doneObj('main_money');
}
