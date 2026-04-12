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
  inv: { kratom:0, blend:0, zemle:1, piko:0, pivo:0, note:0, cert:0, pytel:0, fake_kratom:0, cibule:0, jana_cislo:0, kratom_kava:0, voodoo:0, nuz:0, screenshot:0, hlasovka:0, foto_kubatova:0, c2_cert:0, fig_nuz:0, fig_gun:0, milan_phone:0, zelizka:0, prasek:0, klice_vila:0, podprsenka:0, klice_fabie:0, saman_hlava:0, membership_vaza:0 },

  kratom_on:      false,
  kratom_t:       0,
  kratom_max:     13000,
  kratom_freeze:  0,
  kratom_history: [],

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
  kasna_red:   false,  // kašna je červená od krve

  // Šaman – špatná hesla tracker
  saman_wrong: 0,
  // Šaman mrtvý
  saman_dead: false,
  saman_death_anim: null,
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

function gainRep(amount, reason){
  if(amount <= 0) return;
  gs.rep += amount;
  updateHUD();
  if(reason) addLog(`+${amount} REP: ${reason}`, 'lr');
  fnotif(`+${amount} REP`, 'rep');
  if(gs.money >= 2000) doneObj('main_money');
}
