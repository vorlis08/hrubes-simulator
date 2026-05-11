'use strict';
// ═══════════════════════════════════════════
//  NASTAVENÍ HRY
// ═══════════════════════════════════════════

const Settings = (() => {
  const STORAGE_KEY = 'hrubes_settings';

  // ── Obtížnosti ─────────────────────────────
  const DIFFICULTIES = {
    noob: {
      label:'🍼 Noob', desc:'Pro začátečníky. Pomalý drain, víc času, levnější zboží.',
      energyMult:0.5, cihalovaMult:2.0, priceMult:0.7, rewardMult:1.3, repMult:1.5,
      deathTimerMult:2.0, quizThreshold:2, quizRetry:true,
      zemleGain:40, samanThreshold:3,
      kgbKillWin:10, kgbMaxPass:5, kgbAgentSpd:0.7, kgbSpdScale:0.08, kgbAmmo:80, kgbSpawnMult:1.4,
      dodgeWindow1:2400, dodgeWindow2:2000, dodgePenalty:100, dodgeAimTime:2000,
    },
    pro: {
      label:'😎 Pro', desc:'Standardní obtížnost. Tak jak to má být.',
      energyMult:1.0, cihalovaMult:1.0, priceMult:1.0, rewardMult:1.0, repMult:1.0,
      deathTimerMult:1.0, quizThreshold:3, quizRetry:true,
      zemleGain:30, samanThreshold:5,
      kgbKillWin:18, kgbMaxPass:2, kgbAgentSpd:1.1, kgbSpdScale:0.15, kgbAmmo:50, kgbSpawnMult:1.0,
      dodgeWindow1:1600, dodgeWindow2:1200, dodgePenalty:300, dodgeAimTime:1200,
    },
    hacker: {
      label:'💀 Hacker', desc:'Pro zkušené. Rychlý drain, méně času, dražší zboží.',
      energyMult:1.5, cihalovaMult:0.7, priceMult:1.3, rewardMult:0.8, repMult:0.8,
      deathTimerMult:0.7, quizThreshold:4, quizRetry:false,
      zemleGain:22, samanThreshold:8,
      kgbKillWin:25, kgbMaxPass:1, kgbAgentSpd:1.6, kgbSpdScale:0.22, kgbAmmo:35, kgbSpawnMult:0.7,
      dodgeWindow1:1000, dodgeWindow2:800, dodgePenalty:500, dodgeAimTime:800,
    },
    god: {
      label:'🔥 God', desc:'Nemožné. Brutální drain, minimum času, astronomické ceny.',
      energyMult:2.5, cihalovaMult:0.4, priceMult:2.0, rewardMult:0.5, repMult:0.5,
      deathTimerMult:0.4, quizThreshold:5, quizRetry:false,
      zemleGain:15, samanThreshold:12,
      kgbKillWin:35, kgbMaxPass:0, kgbAgentSpd:2.2, kgbSpdScale:0.30, kgbAmmo:20, kgbSpawnMult:0.5,
      dodgeWindow1:600, dodgeWindow2:400, dodgePenalty:9999, dodgeAimTime:400,
    },
  };

  // ── Kvalita grafiky ────────────────────────
  const QUALITY_LEVELS = {
    brambora: { label:'🥔 Brambora', tier:0, particles:0.3, scanlines:false, ao:false,  bloom:false, desc:'Minimum efektů. Pro slabé počítače.' },
    normal:   { label:'🖥 Normál',   tier:2, particles:0.8, scanlines:true,  ao:true,   bloom:true,  desc:'Vyvážená kvalita. Většina efektů zapnuta.' },
    ultra:    { label:'🔮 Ultra',    tier:3, particles:1.0, scanlines:true,  ao:true,   bloom:true,  desc:'Plná paráda. Všechny efekty na maximum.' },
  };

  // ── Defaults ───────────────────────────────
  const _defaults = {
    musicVolume: 45,
    difficulty: 'pro',
    quality: 'normal',
    qualityOverride: false,
    dialogSpeed: 'normal',
    fontSize: 'normal',
    highlightObjects: false,
    reducedFlash: false,
    screenShake: 100,
  };

  let _cfg = { ..._defaults };

  function _save(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_cfg)); } catch(e){}
  }
  function _load(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) _cfg = { ..._defaults, ...JSON.parse(raw) };
    } catch(e){}
  }

  function get(key){ return _cfg[key]; }
  function set(key, val){ _cfg[key] = val; _save(); }

  function getDifficulty(){ return DIFFICULTIES[_cfg.difficulty] || DIFFICULTIES.pro; }
  function getQuality(){ return QUALITY_LEVELS[_cfg.quality] || QUALITY_LEVELS.normal; }

  function getEnergyDrainMs(){
    return 2000 / getDifficulty().energyMult;
  }
  function getCihalovaTimer(){
    return 90 * getDifficulty().cihalovaMult;
  }
  function getPriceMult(){
    return getDifficulty().priceMult;
  }
  function getRepMult(){
    return getDifficulty().repMult;
  }
  function getDeathTimerMult(){
    return getDifficulty().deathTimerMult;
  }
  function getQuizThreshold(){
    return getDifficulty().quizThreshold;
  }
  function canQuizRetry(){
    return getDifficulty().quizRetry;
  }
  function getZemleGain(){
    return getDifficulty().zemleGain;
  }
  function getSamanThreshold(){
    return getDifficulty().samanThreshold;
  }
  function getRewardMult(){
    return getDifficulty().rewardMult;
  }
  function getKgbParams(){
    const d = getDifficulty();
    return { killWin:d.kgbKillWin, maxPass:d.kgbMaxPass, agentSpd:d.kgbAgentSpd, spdScale:d.kgbSpdScale, ammo:d.kgbAmmo, spawnMult:d.kgbSpawnMult };
  }
  function getDodgeParams(){
    const d = getDifficulty();
    return { window1:d.dodgeWindow1, window2:d.dodgeWindow2, penalty:d.dodgePenalty, aimTime:d.dodgeAimTime };
  }

  function getQualityTierOverride(){
    if(!_cfg.qualityOverride) return null;
    return getQuality().tier;
  }
  function getParticleMult(){
    if(!_cfg.qualityOverride) return 1.0;
    return getQuality().particles;
  }
  function hasScanlines(){
    if(!_cfg.qualityOverride) return true;
    return getQuality().scanlines;
  }
  function hasAO(){
    if(!_cfg.qualityOverride) return true;
    return getQuality().ao;
  }

  function getShakeIntensity(){
    return _cfg.screenShake / 100;
  }

  function applyPrice(base){
    return Math.round(base * getDifficulty().priceMult);
  }
  function applyReward(base){
    return Math.round(base * getDifficulty().rewardMult);
  }
  function applyRep(base){
    return Math.round(base * getDifficulty().repMult);
  }

  // ── Render settings overlay ────────────────
  function renderUI(){
    const body = document.getElementById('settings-body');
    if(!body) return;
    const d = _cfg.difficulty;
    const q = _cfg.quality;
    const diff = getDifficulty();
    const qual = getQuality();

    const diffButtons = Object.entries(DIFFICULTIES).map(([k,v]) => {
      return `<button class="set-opt${d===k?' active':''}" onclick="Settings.setDifficulty('${k}')">${v.label}</button>`;
    }).join('');

    const qualButtons = Object.entries(QUALITY_LEVELS).map(([k,v]) => {
      return `<button class="set-opt${q===k?' active':''}" onclick="Settings.setQuality('${k}')">${v.label}</button>`;
    }).join('');

    const dspeed = _cfg.dialogSpeed;
    const dspeedBtns = [['slow','🐌 Pomalu'],['normal','⚡ Normálně'],['instant','💨 Okamžitě']].map(([k,l]) => {
      return `<button class="set-opt${dspeed===k?' active':''}" onclick="Settings.setDialogSpeed('${k}')">${l}</button>`;
    }).join('');

    const fsize = _cfg.fontSize;
    const fsizeBtns = [['small','A'],['normal','A'],['large','A']].map(([k,l],i) => {
      const sizes = ['12px','14px','18px'];
      return `<button class="set-opt${fsize===k?' active':''}" style="font-size:${sizes[i]}" onclick="Settings.setFontSize('${k}')">${l}</button>`;
    }).join('');

    body.innerHTML = `
      <div class="set-section">
        <div class="set-label">🔊 Hlasitost hudby</div>
        <input type="range" class="set-slider" min="0" max="100" value="${_cfg.musicVolume}"
          oninput="Settings.setVolume(this.value)">
        <span class="set-val">${_cfg.musicVolume}%</span>
      </div>

      <div class="set-section">
        <div class="set-label">🎮 Obtížnost</div>
        <div class="set-opts">${diffButtons}</div>
        <div class="set-desc">${diff.desc}</div>
      </div>

      <div class="set-section">
        <div class="set-label">🖥 Kvalita grafiky</div>
        <div class="set-opts">${qualButtons}</div>
        <div class="set-desc">${qual.desc}</div>
      </div>

      <div class="set-section">
        <div class="set-label">💬 Rychlost dialogů</div>
        <div class="set-opts">${dspeedBtns}</div>
      </div>

      <div class="set-section">
        <div class="set-label">📳 Screen shake</div>
        <input type="range" class="set-slider" min="0" max="100" value="${_cfg.screenShake}"
          oninput="Settings.setShake(this.value)">
        <span class="set-val">${_cfg.screenShake}%</span>
      </div>

      <div class="set-section">
        <div class="set-label">♿ Přístupnost</div>
        <div class="set-opts">${fsizeBtns}</div>
        <label class="set-check"><input type="checkbox" ${_cfg.highlightObjects?'checked':''}
          onchange="Settings.setHighlight(this.checked)"> Zvýraznit interaktivní objekty</label>
        <label class="set-check"><input type="checkbox" ${_cfg.reducedFlash?'checked':''}
          onchange="Settings.setReducedFlash(this.checked)"> Snížené blikání</label>
      </div>
    `;
  }

  function setVolume(v){
    _cfg.musicVolume = parseInt(v);
    if(typeof audio !== 'undefined') audio.volume = _cfg.musicVolume / 100;
    _save(); renderUI();
  }
  function setDifficulty(d){
    _cfg.difficulty = d;
    _save(); renderUI();
  }
  function setQuality(q){
    _cfg.quality = q;
    _cfg.qualityOverride = true;
    _save(); renderUI();
  }
  function setDialogSpeed(s){
    _cfg.dialogSpeed = s;
    _save(); renderUI();
  }
  function setShake(v){
    _cfg.screenShake = parseInt(v);
    _save(); renderUI();
  }
  function setFontSize(s){
    _cfg.fontSize = s;
    document.documentElement.setAttribute('data-fontsize', s);
    _save(); renderUI();
  }
  function setHighlight(b){
    _cfg.highlightObjects = b;
    _save(); renderUI();
  }
  function setReducedFlash(b){
    _cfg.reducedFlash = b;
    _save(); renderUI();
  }

  // Init
  _load();
  if(typeof audio !== 'undefined') audio.volume = _cfg.musicVolume / 100;
  if(_cfg.fontSize !== 'normal') document.documentElement.setAttribute('data-fontsize', _cfg.fontSize);

  return {
    get, set, getDifficulty, getQuality,
    getEnergyDrainMs, getCihalovaTimer, getPriceMult, getRepMult, getRewardMult,
    getDeathTimerMult, getQuizThreshold, canQuizRetry, getZemleGain, getSamanThreshold,
    getKgbParams, getDodgeParams,
    applyPrice, applyReward, applyRep,
    getQualityTierOverride, getParticleMult, hasScanlines, hasAO,
    getShakeIntensity,
    renderUI,
    setVolume, setDifficulty, setQuality, setDialogSpeed,
    setShake, setFontSize, setHighlight, setReducedFlash,
    DIFFICULTIES, QUALITY_LEVELS,
  };
})();
