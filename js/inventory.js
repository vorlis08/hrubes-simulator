'use strict';
// ═══════════════════════════════════════════
//  INVENTÁŘ OVERLAY + KAPSA + KEYBOARD NAV
// ═══════════════════════════════════════════

const GRID_SLOTS = 20; // 4×5 grid
const POCKET_SLOTS = 4;

const INV_EMOJIS = {
  kratom:'🌿', blend:'🍃', zemle:'🍕', piko:'💊', pivo:'🍺', kratom_kava:'☕',
  cert:'📋', pytel:'🗑️', cibule:'🧅', voodoo:'🪆', nuz:'🔪', screenshot:'📱',
  hlasovka:'🎙️', c2_cert:'📜', fig_nuz:'🗡️', fig_gun:'🔫', milan_phone:'📲',
  zelizka:'⛓️', prasek:'💊', klice_vila:'🔑', podprsenka:'👙', klice_fabie:'🔑',
  klice_fabie_fig:'🗝️', saman_hlava:'🩸', membership_vaza:'💳', propiska:'✏️',
  foto_figurova:'🧐', foto_kubatova:'📸', masturbator:'💦', kgb_detector:'🔍',
  pytel_penez:'💰', kgb_prukaz:'🪪', klic_supliku:'🗝️', cibulka_papirek:'📄',
  maturita:'🏆', hadr:'🧻', sklenice_jana:'🥃', tahaky:'📝', bylina_lab:'🌿',
  voda_koupelna:'💧', prach_pentagram:'⭐', elixir:'🧪', receptura:'📜', vysvedceni:'🎓', datapad:'📊'
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
  receptura:'Receptura', vysvedceni:'Vysvědčení', datapad:'Datapad'
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
  datapad: () => { if(gs.story.gru_scanning && typeof useDatapadGRU === 'function') useDatapadGRU(); else if(typeof useDatapad === 'function') useDatapad(); },
};

const COMBO_FOODS = ['zemle','pivo','kratom_kava'];
const COMBO_DRUGS = ['kratom','blend'];

const Inventory = {
  _open: false,
  _items: [],      // all items (inventory grid)
  _sel: 0,
  _pocket: [],     // item keys in pocket slots (max POCKET_SLOTS)
  _selArea: 'inv', // 'inv' or 'pocket'
  _pocketSel: 0,
  _held: null,     // item key currently "held" for moving

  isOpen(){ return this._open; },
  toggle(){ this._open ? this.close() : this.open(); },

  hasBatoh(){ return !!(gs.story && gs.story.has_batoh); },

  open(){
    this._open = true;
    this._sel = 0;
    this._selArea = this.hasBatoh() ? 'inv' : 'pocket';
    this._pocketSel = 0;
    this._held = null;
    this._rebuildAll();
    const ov = document.getElementById('inv-ov');
    ov.classList.add('on');
    ov.classList.toggle('pocket-only', !this.hasBatoh());
    document.getElementById('inv-ov-title').textContent = this.hasBatoh() ? '🎒 BATOH' : '👖 KAPSA';
  },

  close(){
    this._open = false;
    this._held = null;
    document.getElementById('inv-ov').classList.remove('on');
    this._rebuildPocketBar();
    for(const k in keys) keys[k] = false;
  },

  // Initialize pocket from gs on game start
  initPocket(){
    if(!gs._pocket) gs._pocket = [];
    this._pocket = gs._pocket;
  },

  _getAllItems(){
    return Object.keys(gs.inv).filter(k => {
      return (gs.inv[k] || 0) > 0 || (k === 'pytel' && gs.cihalova_in_bag);
    });
  },

  _getInvItems(){
    const allItems = this._getAllItems();
    return allItems.filter(k => !this._pocket.includes(k));
  },

  _rebuildAll(){
    this._items = this._getInvItems();
    if(this._sel >= this._items.length) this._sel = Math.max(0, this._items.length - 1);
    this._renderGrid();
    this._renderPocket();
  },

  _renderGrid(){
    const grid = document.getElementById('inv-ov-grid');
    let html = '';

    for(let i = 0; i < GRID_SLOTS; i++){
      const k = this._items[i];
      if(k){
        const cnt = gs.inv[k] || 0;
        const pytelSpec = k === 'pytel' && gs.cihalova_in_bag;
        const qty = k === 'kratom' ? cnt + 'g' : (pytelSpec ? '👩‍🏫' : (cnt > 1 ? cnt : ''));
        const sel = (this._selArea === 'inv' && i === this._sel) ? ' sel' : '';
        const usable = INV_USABLE[k] ? ' usable' : '';
        const held = this._held === k ? ' held' : '';
        html += `<div class="inv-slot${sel}${usable}${held}" data-i="${i}" data-k="${k}">
          <span class="inv-qty">${qty}</span>
          <span class="inv-ico">${INV_EMOJIS[k] || '❓'}</span>
          <span class="inv-lbl">${INV_SHORT[k] || k}</span>
        </div>`;
      } else {
        const sel = (this._selArea === 'inv' && i === this._sel) ? ' sel' : '';
        html += `<div class="inv-slot empty${sel}" data-i="${i}"></div>`;
      }
    }
    grid.innerHTML = html;

    grid.querySelectorAll('.inv-slot').forEach(sl => {
      sl.addEventListener('click', () => {
        const i = +sl.dataset.i;
        const k = sl.dataset.k;
        this._selArea = 'inv';
        this._sel = i;

        if(this._held){
          if(!k){
            // Move held item to inventory (remove from pocket)
            this._pocket = this._pocket.filter(p => p !== this._held);
            gs._pocket = this._pocket;
            this._held = null;
            this._rebuildAll();
          } else if(k === this._held){
            this._held = null;
            this._rebuildAll();
          } else {
            this._held = k;
            this._rebuildAll();
          }
        } else if(k){
          this._held = k;
          this._rebuildAll();
        } else {
          this._rebuildAll();
        }
      });
      sl.addEventListener('dblclick', () => {
        const k = sl.dataset.k;
        if(k && INV_USABLE[k]){ this._held = null; this.close(); INV_USABLE[k](); }
      });
    });
  },

  _renderPocket(){
    const bar = document.getElementById('inv-ov-pocket');
    // Clean stale pocket items
    this._pocket = this._pocket.filter(k => (gs.inv[k] || 0) > 0 || (k === 'pytel' && gs.cihalova_in_bag));
    gs._pocket = this._pocket;

    let html = '<div class="inv-pocket-label">KAPSA</div><div class="inv-pocket-slots">';
    for(let i = 0; i < POCKET_SLOTS; i++){
      const k = this._pocket[i];
      if(k){
        const cnt = gs.inv[k] || 0;
        const pytelSpec = k === 'pytel' && gs.cihalova_in_bag;
        const qty = k === 'kratom' ? cnt + 'g' : (pytelSpec ? '👩‍🏫' : (cnt > 1 ? cnt : ''));
        const sel = (this._selArea === 'pocket' && i === this._pocketSel) ? ' sel' : '';
        const held = this._held === k ? ' held' : '';
        html += `<div class="inv-pocket-slot${sel}${held}" data-pi="${i}" data-k="${k}">
          <span class="inv-qty">${qty}</span>
          <span class="inv-ico">${INV_EMOJIS[k] || '❓'}</span>
          <span class="inv-lbl">${INV_SHORT[k] || k}</span>
        </div>`;
      } else {
        const sel = (this._selArea === 'pocket' && i === this._pocketSel) ? ' sel' : '';
        html += `<div class="inv-pocket-slot empty${sel}" data-pi="${i}"></div>`;
      }
    }
    html += '</div>';
    bar.innerHTML = html;

    bar.querySelectorAll('.inv-pocket-slot').forEach(sl => {
      sl.addEventListener('click', () => {
        const i = +sl.dataset.pi;
        const k = sl.dataset.k;
        this._selArea = 'pocket';
        this._pocketSel = i;

        if(this._held){
          if(!k && this._pocket.length <= i){
            // Move held item to this pocket slot
            if(!this._pocket.includes(this._held) && this._pocket.length < POCKET_SLOTS){
              this._pocket.push(this._held);
              gs._pocket = this._pocket;
            }
            this._held = null;
            this._rebuildAll();
          } else if(k === this._held){
            this._held = null;
            this._rebuildAll();
          } else if(!k){
            // Empty pocket slot, put held item here
            if(!this._pocket.includes(this._held) && this._pocket.length < POCKET_SLOTS){
              this._pocket.push(this._held);
              gs._pocket = this._pocket;
            }
            this._held = null;
            this._rebuildAll();
          } else {
            this._held = k;
            this._rebuildAll();
          }
        } else if(k){
          this._held = k;
          this._rebuildAll();
        } else {
          this._rebuildAll();
        }
      });
    });
  },

  // Render pocket bar during gameplay (outside inventory overlay)
  _rebuildPocketBar(){
    const bar = document.getElementById('inv-pocket-hud');
    if(!bar) return;
    this._pocket = (gs._pocket || []).filter(k => (gs.inv[k] || 0) > 0 || (k === 'pytel' && gs.cihalova_in_bag));
    gs._pocket = this._pocket;

    if(this._pocket.length === 0){
      bar.style.display = 'none';
      return;
    }
    bar.style.display = '';
    let html = '';
    for(let i = 0; i < this._pocket.length; i++){
      const k = this._pocket[i];
      const cnt = gs.inv[k] || 0;
      const pytelSpec = k === 'pytel' && gs.cihalova_in_bag;
      const qty = k === 'kratom' ? cnt + 'g' : (pytelSpec ? '👩‍🏫' : (cnt > 1 ? cnt : ''));
      const usable = INV_USABLE[k] ? ' usable' : '';
      html += `<div class="pocket-hud-slot${usable}" data-k="${k}" onclick="Inventory._pocketUse('${k}')">
        <span class="inv-qty">${qty}</span>
        <span class="inv-ico">${INV_EMOJIS[k] || '❓'}</span>
        <span class="inv-lbl">${INV_SHORT[k] || k}</span>
      </div>`;
    }
    bar.innerHTML = html;
  },

  _pocketUse(k){
    if(INV_USABLE[k]) INV_USABLE[k]();
  },

  // Combo: C key in inventory
  _quickCombo(){
    const selKey = this._selArea === 'inv' ? this._items[this._sel] : this._pocket[this._pocketSel];
    if(!selKey) return;
    const isFood = COMBO_FOODS.includes(selKey);
    const isDrug = COMBO_DRUGS.includes(selKey);

    if(isFood){
      const allItems = this._getAllItems();
      const drug = allItems.find(k => COMBO_DRUGS.includes(k) && (k === 'kratom' ? gs.inv.kratom >= 5 : gs.inv[k] > 0));
      if(!drug){ addLog('Nemáš kratom ani blend na combo.', 'lw'); return; }
      this._doCombo(selKey, drug);
    } else if(isDrug){
      const allItems = this._getAllItems();
      const food = allItems.find(k => COMBO_FOODS.includes(k) && gs.inv[k] > 0);
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

    const _zg = (typeof Settings !== 'undefined') ? Settings.getZemleGain() : 30;
    const gain = food === 'zemle' ? _zg : (food === 'pivo' ? Math.round(_zg*0.5) : Math.round(_zg*0.67));
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
    this._rebuildAll();
    this._rebuildPocketBar();
  },

  handleKey(k){
    if(!this._open) return false;

    if(k === 'Escape' || k === 'e' || k === 'i'){
      this.close();
      return true;
    }

    const COLS = 5;

    // Tab switches between inv and pocket (only with batoh)
    if(k === 'Tab'){
      if(this.hasBatoh()){
        if(this._selArea === 'inv'){
          this._selArea = 'pocket';
          this._pocketSel = 0;
        } else {
          this._selArea = 'inv';
        }
        this._rebuildAll();
      }
      return true;
    }

    if(this._selArea === 'inv'){
      if(k === 'ArrowRight' || k === 'd'){
        this._sel = Math.min(GRID_SLOTS - 1, this._sel + 1);
        this._rebuildAll(); return true;
      }
      if(k === 'ArrowLeft' || k === 'a'){
        this._sel = Math.max(0, this._sel - 1);
        this._rebuildAll(); return true;
      }
      if(k === 'ArrowDown' || k === 's'){
        const next = this._sel + COLS;
        if(next < GRID_SLOTS){
          this._sel = next;
        } else {
          // Jump to pocket
          this._selArea = 'pocket';
          this._pocketSel = Math.min(this._sel % COLS, POCKET_SLOTS - 1);
        }
        this._rebuildAll(); return true;
      }
      if(k === 'ArrowUp' || k === 'w'){
        this._sel = Math.max(0, this._sel - COLS);
        this._rebuildAll(); return true;
      }
    } else {
      // pocket navigation
      if(k === 'ArrowRight' || k === 'd'){
        this._pocketSel = Math.min(POCKET_SLOTS - 1, this._pocketSel + 1);
        this._rebuildAll(); return true;
      }
      if(k === 'ArrowLeft' || k === 'a'){
        this._pocketSel = Math.max(0, this._pocketSel - 1);
        this._rebuildAll(); return true;
      }
      if(k === 'ArrowUp' || k === 'w'){
        // Jump back to inv grid last row
        this._selArea = 'inv';
        this._sel = Math.min(GRID_SLOTS - 1, (Math.floor((GRID_SLOTS - 1) / COLS)) * COLS + this._pocketSel);
        this._rebuildAll(); return true;
      }
      if(k === 'ArrowDown' || k === 's'){
        return true; // nowhere to go
      }
    }

    // Enter/Space: use item or pick/place for moving
    if(k === 'Enter' || k === ' '){
      const item = this._selArea === 'inv' ? this._items[this._sel] : this._pocket[this._pocketSel];
      if(this._held){
        if(this._selArea === 'pocket'){
          // Place held item in pocket
          if(!this._pocket.includes(this._held) && this._pocket.length < POCKET_SLOTS){
            this._pocket.push(this._held);
            gs._pocket = this._pocket;
          }
          this._held = null;
        } else {
          // Place held item back in inventory (remove from pocket)
          this._pocket = this._pocket.filter(p => p !== this._held);
          gs._pocket = this._pocket;
          this._held = null;
        }
        this._rebuildAll();
      } else if(item){
        if(INV_USABLE[item]){ this.close(); INV_USABLE[item](); }
      }
      return true;
    }

    // Space to pick up / put down item for moving
    if(k === 'f'){
      const item = this._selArea === 'inv' ? this._items[this._sel] : this._pocket[this._pocketSel];
      if(this._held){
        if(this._selArea === 'pocket' && !this._pocket.includes(this._held) && this._pocket.length < POCKET_SLOTS){
          this._pocket.push(this._held);
          gs._pocket = this._pocket;
        } else if(this._selArea === 'inv' && this._pocket.includes(this._held)){
          this._pocket = this._pocket.filter(p => p !== this._held);
          gs._pocket = this._pocket;
        }
        this._held = null;
      } else if(item){
        this._held = item;
      }
      this._rebuildAll();
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
