'use strict';
// ═══════════════════════════════════════════
//  INVENTÁŘ OVERLAY + KEYBOARD NAV
// ═══════════════════════════════════════════

const INV_CATEGORIES = {
  consumable: {
    keys: ['kratom','blend','zemle','pivo','kratom_kava','piko','elixir','masturbator'],
    label: 'Jídlo & Drogy'
  },
  quest: {
    keys: ['pytel','cert','voodoo','tahaky','receptura','vysvedceni','maturita','membership_vaza','pytel_penez','kgb_prukaz'],
    label: 'Questové'
  },
  evidence: {
    keys: ['screenshot','hlasovka','foto_kubatova','foto_figurova','c2_cert','milan_phone','cibulka_papirek'],
    label: 'Důkazy'
  },
  keys: {
    keys: ['nuz','fig_nuz','fig_gun','zelizka','prasek','klice_vila','klice_fabie','klice_fabie_fig',
           'klic_supliku','kgb_detector','propiska','hadr','sklenice_jana','podprsenka','saman_hlava',
           'cibule','bylina_lab','voda_koupelna','prach_pentagram'],
    label: 'Klíče & Nástroje'
  }
};

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

const INV_NAMES = {
  kratom:'Kratom', blend:'Blend', zemle:'Pizza žemle', piko:'Piko', pivo:'Pivo Démon',
  kratom_kava:'Kratom kafe', cert:'Certifikát', pytel:'Pytel', cibule:'Cibule',
  voodoo:'Voodoo panenka', nuz:'Nůž', screenshot:'Screenshot', hlasovka:'Hlasovka',
  c2_cert:'C2 Certifikát', fig_nuz:'Nůž (Fig.)', fig_gun:'Pistole', milan_phone:'Tel. Milan',
  zelizka:'Želízka', prasek:'Prášek', klice_vila:'Klíče vila', podprsenka:'Podprsenka',
  klice_fabie:'Klíčky Fábie', klice_fabie_fig:'Klíčky Fig.', saman_hlava:'Šamanova hlava',
  membership_vaza:'Vaza Membership', propiska:'Propiska', foto_figurova:'Fotka Figurové',
  foto_kubatova:'Fotka Kubátové', masturbator:'Masturbátor', kgb_detector:'KGB Detektor',
  pytel_penez:'Pytel peněz', kgb_prukaz:'KGB průkaz', klic_supliku:'Klíček šuplíku',
  cibulka_papirek:'Cibulkův papírek', maturita:'Maturita', hadr:'Hadr',
  sklenice_jana:'Janina sklenice', tahaky:'Taháky', bylina_lab:'Bylina',
  voda_koupelna:'Voda', prach_pentagram:'Prach pentagramu', elixir:'Elixír mládí',
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
  _cat: 'all',
  _items: [],
  _sel: 0,
  _comboFood: null,
  _comboDrug: null,
  _comboFocus: null, // null | 'food' | 'drug' | 'btn'

  isOpen(){ return this._open; },

  toggle(){
    if(this._open) this.close();
    else this.open();
  },

  open(){
    this._open = true;
    this._cat = 'all';
    this._sel = 0;
    this._comboFood = null;
    this._comboDrug = null;
    this._comboFocus = null;
    this._refreshCats();
    this._refreshGrid();
    this._refreshCombo();
    document.getElementById('inv-ov').classList.add('on');
  },

  close(){
    this._open = false;
    document.getElementById('inv-ov').classList.remove('on');
    for(const k in keys) keys[k] = false;
  },

  _getVisibleItems(){
    const all = Object.keys(gs.inv).filter(k => {
      const cnt = gs.inv[k] || 0;
      const pytelSpec = k === 'pytel' && gs.cihalova_in_bag;
      return cnt > 0 || pytelSpec;
    });
    if(this._cat === 'all') return all;
    const catKeys = INV_CATEGORIES[this._cat]?.keys || [];
    return all.filter(k => catKeys.includes(k));
  },

  _refreshCats(){
    document.querySelectorAll('.inv-cat').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === this._cat);
    });
  },

  _refreshGrid(){
    const grid = document.getElementById('inv-ov-grid');
    this._items = this._getVisibleItems();
    if(this._sel >= this._items.length) this._sel = Math.max(0, this._items.length - 1);

    grid.innerHTML = this._items.map((k, i) => {
      const cnt = gs.inv[k] || 0;
      const pytelSpec = k === 'pytel' && gs.cihalova_in_bag;
      const qtyText = k === 'kratom' ? cnt + 'g' : (pytelSpec ? '👩‍🏫' : cnt);
      const usable = INV_USABLE[k] ? ' usable' : '';
      const focus = i === this._sel ? ' kb-focus' : '';
      return `<div class="inv-cell${usable}${focus}" data-idx="${i}" data-key="${k}">
        <span class="inv-cell-qty">${qtyText}</span>
        <span class="inv-cell-emoji">${INV_EMOJIS[k] || '❓'}</span>
        <span class="inv-cell-name">${INV_NAMES[k] || k}</span>
      </div>`;
    }).join('');

    grid.querySelectorAll('.inv-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        this._sel = parseInt(cell.dataset.idx);
        this._refreshGrid();
      });
      cell.addEventListener('dblclick', () => {
        const k = cell.dataset.key;
        if(INV_USABLE[k]){ this.close(); INV_USABLE[k](); }
      });
    });

    this._refreshDetail();
  },

  _refreshDetail(){
    const k = this._items[this._sel];
    const emoji = document.getElementById('inv-ov-detail-emoji');
    const name = document.getElementById('inv-ov-detail-name');
    const desc = document.getElementById('inv-ov-detail-desc');
    const actions = document.getElementById('inv-ov-detail-actions');

    if(!k){
      emoji.textContent = '🎒';
      name.textContent = 'PRÁZDNO';
      desc.textContent = 'Nemáš žádné předměty v této kategorii.';
      actions.innerHTML = '';
      return;
    }

    emoji.textContent = INV_EMOJIS[k] || '❓';
    name.textContent = (INV_NAMES[k] || k).toUpperCase();
    desc.textContent = ITEM_DESCS[k] || '';

    let btns = '';
    if(INV_USABLE[k]){
      const label = ['screenshot','hlasovka','foto_kubatova','c2_cert','cibulka_papirek'].includes(k)
        ? 'Zobrazit' : 'Použít';
      btns += `<button class="db prim" onclick="Inventory.close();Inventory._useItem('${k}')">${label} [Enter]</button>`;
    }
    if(COMBO_FOODS.includes(k)){
      btns += `<button class="db" onclick="Inventory._setComboFood('${k}')">→ Do combo slotu</button>`;
    }
    if(COMBO_DRUGS.includes(k)){
      btns += `<button class="db" onclick="Inventory._setComboDrug('${k}')">→ Do combo slotu</button>`;
    }
    actions.innerHTML = btns;
  },

  _useItem(k){
    if(INV_USABLE[k]) INV_USABLE[k]();
  },

  _setComboFood(k){
    this._comboFood = k;
    this._refreshCombo();
  },

  _setComboDrug(k){
    this._comboDrug = k;
    this._refreshCombo();
  },

  _refreshCombo(){
    const foodSlot = document.getElementById('combo-slot-food');
    const drugSlot = document.getElementById('combo-slot-kratom');
    const resultSlot = document.getElementById('combo-slot-result');
    const btn = document.getElementById('inv-combo-btn');

    if(this._comboFood && gs.inv[this._comboFood] > 0){
      foodSlot.innerHTML = `<span>${INV_EMOJIS[this._comboFood]}</span>`;
      foodSlot.classList.add('filled');
    } else {
      this._comboFood = null;
      foodSlot.innerHTML = '<span class="combo-empty">Jídlo / pití</span>';
      foodSlot.classList.remove('filled');
    }

    if(this._comboDrug && gs.inv[this._comboDrug] > 0){
      drugSlot.innerHTML = `<span>${INV_EMOJIS[this._comboDrug]}</span>`;
      drugSlot.classList.add('filled');
    } else {
      this._comboDrug = null;
      drugSlot.innerHTML = '<span class="combo-empty">Kratom / blend</span>';
      drugSlot.classList.remove('filled');
    }

    const canCombo = this._comboFood && this._comboDrug &&
      gs.inv[this._comboFood] > 0 && (this._comboDrug === 'kratom' ? gs.inv.kratom >= 5 : gs.inv[this._comboDrug] > 0);

    if(canCombo){
      const resultName = this._comboFood === 'zemle' ? '🍕🌿 Kratom žemle' :
        this._comboFood === 'pivo' ? '🍺🌿 Kratom pivo' : '☕🌿 Double kratom kafe';
      resultSlot.innerHTML = `<span style="font-size:12px;color:var(--gold);font-family:var(--fm)">${resultName}</span>`;
      btn.disabled = false;
    } else {
      resultSlot.innerHTML = '<span class="combo-empty">???</span>';
      btn.disabled = true;
    }
  },

  doCombo(){
    if(!this._comboFood || !this._comboDrug) return;
    if(gs.inv[this._comboFood] <= 0) return;
    if(this._comboDrug === 'kratom' && gs.inv.kratom < 5) return;
    if(this._comboDrug === 'blend' && gs.inv.blend <= 0) return;

    // Consume ingredients
    if(this._comboFood === 'zemle') gs.inv.zemle--;
    else if(this._comboFood === 'pivo') gs.inv.pivo--;
    else if(this._comboFood === 'kratom_kava') gs.inv.kratom_kava--;

    if(this._comboDrug === 'kratom') gs.inv.kratom -= 5;
    else gs.inv.blend--;

    // Effect: food heal + kratom trip (shorter)
    const foodGain = this._comboFood === 'zemle' ? 30 : (this._comboFood === 'pivo' ? 15 : 20);
    gs.energy = Math.min(100, gs.energy + foodGain);

    const isBlend = this._comboDrug === 'blend';
    const tripDur = isBlend ? 15000 : 8000;

    addLog(`🍕🌿 Combo! +${foodGain} energie + ${isBlend ? 'blend' : 'kratom'} trip`, 'lm');
    fnotif('COMBO!', 'itm');

    if(!gs.kratom_on){
      gs.kratom_on = true;
      gs.kratom_blend_on = isBlend;
      gs.kratom_t = tripDur;
      gs.kratom_freeze = 0;
      canvas.classList.add('kratom-on');
      if(isBlend) canvas.classList.add('kratom-blend');
      document.getElementById('kh').classList.add('on');
    }

    updateInv(); updateHUD();
    this._comboFood = null;
    this._comboDrug = null;
    this._refreshCombo();
    this._refreshGrid();
  },

  handleKey(k){
    if(!this._open) return false;

    if(k === 'Escape'){
      this.close();
      return true;
    }

    // Tab cycles categories
    if(k === 'Tab' || k === 'shift+Tab'){
      const cats = ['consumable','quest','evidence','keys','all'];
      let idx = cats.indexOf(this._cat);
      idx = k === 'Tab' ? (idx + 1) % cats.length : (idx - 1 + cats.length) % cats.length;
      this._cat = cats[idx];
      this._sel = 0;
      this._refreshCats();
      this._refreshGrid();
      return true;
    }

    // Grid navigation
    const cols = Math.max(1, Math.floor(document.getElementById('inv-ov-grid').clientWidth / 80));

    if(k === 'ArrowRight' || k === 'd'){
      this._sel = Math.min(this._items.length - 1, this._sel + 1);
      this._refreshGrid();
      return true;
    }
    if(k === 'ArrowLeft' || k === 'a'){
      this._sel = Math.max(0, this._sel - 1);
      this._refreshGrid();
      return true;
    }
    if(k === 'ArrowDown' || k === 's'){
      this._sel = Math.min(this._items.length - 1, this._sel + cols);
      this._refreshGrid();
      return true;
    }
    if(k === 'ArrowUp' || k === 'w'){
      this._sel = Math.max(0, this._sel - cols);
      this._refreshGrid();
      return true;
    }

    // Enter = use selected item
    if(k === 'Enter'){
      const item = this._items[this._sel];
      if(item && INV_USABLE[item]){
        this.close();
        INV_USABLE[item]();
      }
      return true;
    }

    // C = combo with selected
    if(k === 'c'){
      const item = this._items[this._sel];
      if(item && COMBO_FOODS.includes(item)) this._setComboFood(item);
      else if(item && COMBO_DRUGS.includes(item)) this._setComboDrug(item);
      return true;
    }

    // X = execute combo
    if(k === 'x'){
      this.doCombo();
      return true;
    }

    return true; // consume all keys when inventory is open
  }
};

// Category button clicks
document.querySelectorAll('.inv-cat').forEach(btn => {
  btn.addEventListener('click', () => {
    Inventory._cat = btn.dataset.cat;
    Inventory._sel = 0;
    Inventory._refreshCats();
    Inventory._refreshGrid();
  });
});

// Combo button click
document.getElementById('inv-combo-btn').addEventListener('click', () => Inventory.doCombo());

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

  // Number keys 1-9 select choice directly
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

// Reset dialog focus when dialog opens
const _origDovAdd = Element.prototype.classList.add;
const _dovEl = document.getElementById('dov');
new MutationObserver(() => {
  if(_dovEl.classList.contains('on')){
    _dialogFocusIdx = 0;
    const btns = Array.from(document.querySelectorAll('#dchoices .db'));
    _highlightDialogBtn(btns);
  }
}).observe(_dovEl, { attributes: true, attributeFilter: ['class'] });
