'use strict';
// ═══════════════════════════════════════════
//  NASTAVENÍ HRY
// ═══════════════════════════════════════════

const Settings = (() => {
  const STORAGE_KEY = 'hrubes_settings';

  // ── Obtížnosti ─────────────────────────────
  const DIFFICULTIES = {
    noob:   { label:'🍼 Noob',   energyMult:0.5,  cihalovaMult:2.0, priceMult:0.7, repMult:1.5, deathTimerMult:2.0, quizForgiving:true,  desc:'Pro začátečníky. Pomalý drain, víc času, levnější zboží.' },
    pro:    { label:'😎 Pro',    energyMult:1.0,  cihalovaMult:1.0, priceMult:1.0, repMult:1.0, deathTimerMult:1.0, quizForgiving:false, desc:'Standardní obtížnost. Tak jak to má být.' },
    hacker: { label:'💀 Hacker', energyMult:1.5,  cihalovaMult:0.7, priceMult:1.3, repMult:0.8, deathTimerMult:0.7, quizForgiving:false, desc:'Pro zkušené. Rychlý drain, méně času, dražší zboží.' },
    god:    { label:'🔥 God',    energyMult:2.5,  cihalovaMult:0.4, priceMult:2.0, repMult:0.5, deathTimerMult:0.4, quizForgiving:false, desc:'Nemožné. Brutální drain, minimum času, astronomické ceny.' },
    secret: { label:'👁 ???',    energyMult:0.01, cihalovaMult:99,  priceMult:0.01,repMult:5.0, deathTimerMult:99,  quizForgiving:true,  desc:'Transcendence. Jsi nesmrtelný bůh Křemže.' },
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
    godCompleted: false,
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
  function isQuizForgiving(){
    return getDifficulty().quizForgiving;
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

  function isSecretUnlocked(){
    return _cfg.godCompleted === true;
  }
  function unlockSecret(){
    _cfg.godCompleted = true;
    _save();
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
      if(k === 'secret' && !isSecretUnlocked()) return '';
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
    getEnergyDrainMs, getCihalovaTimer, getPriceMult, getRepMult,
    getDeathTimerMult, isQuizForgiving,
    getQualityTierOverride, getParticleMult, hasScanlines, hasAO,
    getShakeIntensity, isSecretUnlocked, unlockSecret,
    renderUI,
    setVolume, setDifficulty, setQuality, setDialogSpeed,
    setShake, setFontSize, setHighlight, setReducedFlash,
    DIFFICULTIES, QUALITY_LEVELS,
  };
})();
