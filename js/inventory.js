'use strict';
// ═══════════════════════════════════════════
//  INVENTÁŘ OVERLAY + KEYBOARD NAV
// ═══════════════════════════════════════════

const GRID_SLOTS = 20; // 4×5 grid – fixed

const INV_EMOJIS = {
  kratom:'🌿', blend:'🍃', zemle:'🍕', piko:'💊', pivo:'🍺', kratom_kava:'☕',
  cert:'📋', pytel:'🗑️', cibule:'🧅', voodoo:'🪆', nuz:'🔪', screenshot:'📱',
  hlasovka:'🎙️', c2_cert:'📜', fig_nuz:'🗡️', fig_gun:'🔫', milan_phone:'📲',
  zelizka:'⛓️', prasek:'💊', klice_vila:'🔑', podprsenka:'👙', klice_fabie:'🔑',
  klice_fabie_fig:'🗝️', saman_hlava:'🩸', membership_vaza:'💳', propiska:'✏️',
  foto_figurova:'🧐', foto_kubatova:'📸', masturbator:'💦', kgb_detector:'🔍',
  pytel_penez:'💰', kgb_prukaz:'🪪', klic_supliku:'🗝️', cibulka_papirek:'📄',
  maturita:'🏆', hadr:'🧻', sklenice_jana:'🥃', tahaky:'📝', bylina_lab:'🌿',
  voda_koupelna:'💧', prach_pentagram:'⭐', elixir:'🧪', receptura:'📜', vysvedceni:'🎓'
};

const INV_SHORT = {
  kratom:'Kratom', blend:'Blend', zemle:'Žemle', piko:'Piko', pivo:'Démon',
  kratom_kava:'Kafe', cert:'Certifikát', pytel:'Pytel', cibule:'Cibule',
  voodoo:'Voodoo', nuz:'Nůž', screenshot:'Screenshot', hlasovka:'Hlasovka',
  c2_cert:'C2 Cert.', fig_nuz:'Nůž†', fig_gun:'Pistole', milan_phone:'Tel.',
  zelizka:'Želízka', prasek:'Prášek', klice_vila:'Klíče', podprsenka:'Artefakt',
  klice_fabie:'Fábie', klice_fabie_fig:'Klíčky', saman_hlava:'Hlava',
  membership_vaza:'Vaza', propiska:'Propiska', foto_figurova:'Fotka',
  foto_kubatova:'Fotka', masturbator:'Obídek', kgb_detector:'Detektor',
  pytel_penez:'Prachy', kgb_prukaz:'Průkaz', klic_supliku:'Klíček',
  cibulka_papirek:'Papírek', maturita:'Maturita', hadr:'Hadr',
  sklenice_jana:'Sklenice', tahaky:'Taháky', bylina_lab:'Bylina',
  voda_koupelna:'Voda', prach_pentagram:'Prach', elixir:'Elixír',
  receptura:'Receptura', vysvedceni:'Vysvědčení'
};

const INV_USABLE = {
  kratom: () => useKratom(),
  blend: () => useBlend(),
  zemle: () => useZemle(),
  piko: () => { if(typeof usePikoSelf === 'function') usePikoSelf(); },
  masturbator: () => useMasturbator(),
  kgb_detector: () => useKGBDetector(),
  elixir: () => { if(typeof useElixir === 'function') useElixir(); },
  nuz: () => { if(typeof useNuz === 'function') useNuz(); },
  screenshot: () => { if(typeof showScreenshot === 'function') showScreenshot(); },
  hlasovka: () => { if(typeof playHlasovka === 'function') playHlasovka(); },
  foto_kubatova: () => { if(typeof showFotoKubatova === 'function') showFotoKubatova(); },
  c2_cert: () => { if(typeof showC2Cert === 'function') showC2Cert(); },
  cibulka_papirek: () => { if(typeof showCibulkaPapirek === 'function') showCibulkaPapirek(); },
  sklenice_jana: () => { if(typeof useGlassDrug === 'function') useGlassDrug(); },
};

const COMBO_FOODS = ['zemle','pivo','kratom_kava'];
const COMBO_DRUGS = ['kratom','blend'];

const Inventory = {
  _open: false,
  _items: [],
  _sel: 0,

  isOpen(){ return this._open; },
  toggle(){ this._open ? this.close() : this.open(); },

  open(){
    this._open = true;
    this._sel = 0;
    this._rebuild();
    document.getElementById('inv-ov').classList.add('on');
  },

  close(){
    this._open = false;
    document.getElementById('inv-ov').classList.remove('on');
    for(const k in keys) keys[k] = false;
  },

  _rebuild(){
    this._items = Object.keys(gs.inv).filter(k => {
      return (gs.inv[k] || 0) > 0 || (k === 'pytel' && gs.cihalova_in_bag);
    });
    if(this._sel >= this._items.length) this._sel = Math.max(0, this._items.length - 1);

    const grid = document.getElementById('inv-ov-grid');
    let html = '';

    for(let i = 0; i < GRID_SLOTS; i++){
      const k = this._items[i];
      if(k){
        const cnt = gs.inv[k] || 0;
        const pytelSpec = k === 'pytel' && gs.cihalova_in_bag;
        const qty = k === 'kratom' ? cnt + 'g' : (pytelSpec ? '👩‍🏫' : (cnt > 1 ? cnt : ''));
        const sel = i === this._sel ? ' sel' : '';
        const usable = INV_USABLE[k] ? ' usable' : '';
        html += `<div class="inv-slot${sel}${usable}" data-i="${i}" data-k="${k}">
          <span class="inv-qty">${qty}</span>
          <span class="inv-ico">${INV_EMOJIS[k] || '❓'}</span>
          <span class="inv-lbl">${INV_SHORT[k] || k}</span>
        </div>`;
      } else {
        html += `<div class="inv-slot empty" data-i="${i}"></div>`;
      }
    }
    grid.innerHTML = html;

    // Tooltip for selected
    const tip = document.getElementById('inv-ov-tip');
    const selKey = this._items[this._sel];
    if(selKey){
      const usable = INV_USABLE[selKey];
      tip.innerHTML = `<span class="inv-tip-name">${INV_EMOJIS[selKey]} ${INV_SHORT[selKey] || selKey}</span>` +
        (usable ? `<span class="inv-tip-hint">[Enter] použít</span>` : '');
      tip.style.display = '';
    } else {
      tip.style.display = 'none';
    }

    // Combo bar
    this._refreshCombo();

    // Click handlers
    grid.querySelectorAll('.inv-slot:not(.empty)').forEach(sl => {
      sl.addEventListener('click', () => { this._sel = +sl.dataset.i; this._rebuild(); });
      sl.addEventListener('dblclick', () => {
        const k = sl.dataset.k;
        if(INV_USABLE[k]){ this.close(); INV_USABLE[k](); }
      });
    });
  },

  _refreshCombo(){
    const bar = document.getElementById('inv-combo-bar');
    const selKey = this._items[this._sel];
    const isFood = selKey && COMBO_FOODS.includes(selKey);
    const isDrug = selKey && COMBO_DRUGS.includes(selKey);
    bar.style.display = (isFood || isDrug) ? '' : 'none';
    if(isFood || isDrug){
      bar.innerHTML = `<button class="inv-combo-go" onclick="Inventory._quickCombo()">[C] Combo: ${INV_EMOJIS[selKey]} + ?</button>`;
    }
  },

  _quickCombo(){
    const selKey = this._items[this._sel];
    if(!selKey) return;
    const isFood = COMBO_FOODS.includes(selKey);
    const isDrug = COMBO_DRUGS.includes(selKey);

    if(isFood){
      const drug = this._items.find(k => COMBO_DRUGS.includes(k) && (k === 'kratom' ? gs.inv.kratom >= 5 : gs.inv[k] > 0));
      if(!drug){ addLog('Nemáš kratom ani blend na combo.', 'lw'); return; }
      this._doCombo(selKey, drug);
    } else if(isDrug){
      const food = this._items.find(k => COMBO_FOODS.includes(k) && gs.inv[k] > 0);
      if(!food){ addLog('Nemáš jídlo na combo.', 'lw'); return; }
      this._doCombo(food, selKey);
    }
  },

  _doCombo(food, drug){
    if(gs.inv[food] <= 0) return;
    if(drug === 'kratom' && gs.inv.kratom < 5) return;
    if(drug === 'blend' && gs.inv.blend <= 0) return;

    gs.inv[food]--;
    if(drug === 'kratom') gs.inv.kratom -= 5; else gs.inv.blend--;

    const gain = food === 'zemle' ? 30 : (food === 'pivo' ? 15 : 20);
    gs.energy = Math.min(100, gs.energy + gain);
    const isBlend = drug === 'blend';

    addLog(`🍕🌿 Combo! +${gain} energie + ${isBlend ? 'blend' : 'kratom'} trip`, 'lm');
    fnotif('COMBO!', 'itm');

    if(!gs.kratom_on){
      gs.kratom_on = true;
      gs.kratom_blend_on = isBlend;
      gs.kratom_t = isBlend ? 15000 : 8000;
      gs.kratom_freeze = 0;
      canvas.classList.add('kratom-on');
      if(isBlend) canvas.classList.add('kratom-blend');
      document.getElementById('kh').classList.add('on');
    }

    updateInv(); updateHUD();
    this._rebuild();
  },

  handleKey(k){
    if(!this._open) return false;

    if(k === 'Escape' || k === 'e' || k === 'i'){
      this.close();
      return true;
    }

    const COLS = 5;
    if(k === 'ArrowRight' || k === 'd'){
      this._sel = Math.min(this._items.length - 1, this._sel + 1);
      this._rebuild(); return true;
    }
    if(k === 'ArrowLeft' || k === 'a'){
      this._sel = Math.max(0, this._sel - 1);
      this._rebuild(); return true;
    }
    if(k === 'ArrowDown' || k === 's'){
      this._sel = Math.min(this._items.length - 1, this._sel + COLS);
      this._rebuild(); return true;
    }
    if(k === 'ArrowUp' || k === 'w'){
      this._sel = Math.max(0, this._sel - COLS);
      this._rebuild(); return true;
    }
    if(k === 'Enter' || k === ' '){
      const item = this._items[this._sel];
      if(item && INV_USABLE[item]){ this.close(); INV_USABLE[item](); }
      return true;
    }
    if(k === 'c'){
      this._quickCombo();
      return true;
    }
    return true;
  }
};

// ═══════════════════════════════════════════
//  DIALOG KEYBOARD NAVIGATION
// ═══════════════════════════════════════════

let _dialogFocusIdx = 0;

function dialogHandleKey(k){
  const dov = document.getElementById('dov');
  if(!dov.classList.contains('on')) return false;

  const btns = Array.from(document.querySelectorAll('#dchoices .db'));
  if(!btns.length) return false;

  if(k === 'ArrowDown' || k === 's' || k === 'Tab'){
    _dialogFocusIdx = (_dialogFocusIdx + 1) % btns.length;
    _highlightDialogBtn(btns);
    return true;
  }
  if(k === 'ArrowUp' || k === 'w' || k === 'shift+Tab'){
    _dialogFocusIdx = (_dialogFocusIdx - 1 + btns.length) % btns.length;
    _highlightDialogBtn(btns);
    return true;
  }
  if(k === 'Enter' || k === ' '){
    btns[_dialogFocusIdx]?.click();
    return true;
  }

  const num = parseInt(k);
  if(num >= 1 && num <= btns.length){
    btns[num - 1]?.click();
    return true;
  }

  return false;
}

function _highlightDialogBtn(btns){
  btns.forEach((b, i) => b.classList.toggle('kb-focus', i === _dialogFocusIdx));
}

const _dovEl = document.getElementById('dov');
new MutationObserver(() => {
  if(_dovEl.classList.contains('on')){
    _dialogFocusIdx = 0;
    const btns = Array.from(document.querySelectorAll('#dchoices .db'));
    _highlightDialogBtn(btns);
  }
}).observe(_dovEl, { attributes: true, attributeFilter: ['class'] });
