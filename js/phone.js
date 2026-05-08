'use strict';
// ═══════════════════════════════════════════
//  TELEFON – SMS, Křemžogram, Deník
// ═══════════════════════════════════════════

const Phone = {
  messages: [],
  kremzogram: [],
  diary: [],
  _unreadSms: 0,
  _unreadKg: 0,
  _activeTab: 'sms',
  _selectedIdx: -1,       // klávesová navigace – vybraný index v aktuálním tabu
  _replyOpen: null,       // tag SMS, na kterou je otevřený reply
  _timedQueue: [],        // fronta časovaných zpráv {delay, fn}
  _timedRunning: false,
  _lastTimedCheck: 0,

  reset(){
    this.messages = [];
    this.kremzogram = [];
    this.diary = [];
    this._unreadSms = 0;
    this._unreadKg = 0;
    this._activeTab = 'sms';
    this._selectedIdx = -1;
    this._replyOpen = null;
    this._timedQueue = [];
    this._timedRunning = false;
    this._lastTimedCheck = 0;
    this._updateBadge();
  },

  // ── SMS ──────────────────────────────────
  // replies: [{label, text, effect}] – volitelné odpovědi hráče
  addSms(from, emoji, text, tag, replies){
    if(tag && this.messages.some(m => m.tag === tag)) return;
    this.messages.push({
      from, emoji, text, time: this._time(), tag: tag||null,
      replies: replies || null,
      replied: false,
      replyText: null
    });
    this._unreadSms++;
    this._updateBadge();
    this._phonePulse();
    this._playNotifSound();
  },

  // ── Křemžogram ───────────────────────────
  addPost(author, emoji, img, caption, likes, tag){
    if(tag && this.kremzogram.some(p => p.tag === tag)) return;
    this.kremzogram.push({
      author, emoji, img, caption,
      likes: likes||0,
      playerLiked: false,
      comments: [],
      time: this._time(), tag: tag||null
    });
    this._unreadKg++;
    this._updateBadge();
    this._phonePulse();
    this._playNotifSound();
  },

  addComment(postTag, author, text){
    const p = this.kremzogram.find(x => x.tag === postTag);
    if(p){
      // deduplikace komentáře
      if(p.comments.some(c => c.author === author && c.text === text)) return;
      p.comments.push({ author, text });
      if(this.isOpen() && this._activeTab === 'kg') this._renderKg();
    }
  },

  likePost(postTag){
    const p = this.kremzogram.find(x => x.tag === postTag);
    if(!p || p.playerLiked) return;
    p.playerLiked = true;
    p.likes++;
    if(this.isOpen() && this._activeTab === 'kg') this._renderKg();
  },

  // ── Deník ────────────────────────────────
  addDiary(title, text, tag){
    if(tag && this.diary.some(d => d.tag === tag)) return;
    this.diary.push({ title, text, time: this._time(), tag: tag||null });
  },

  // ── Časované zprávy ─────────────────────
  // delay v ms od gs.ts, fn se zavolá když gs.ts >= spawnTime
  scheduleSms(delayMs, fn){
    this._timedQueue.push({ fireAt: (gs.ts||0) + delayMs, fn, gen: gs._gen });
  },

  updateTimers(){
    if(!this._timedQueue.length) return;
    const now = gs.ts || 0;
    for(let i = this._timedQueue.length - 1; i >= 0; i--){
      const t = this._timedQueue[i];
      if(t.gen !== gs._gen){ this._timedQueue.splice(i, 1); continue; }
      if(now >= t.fireAt){
        this._timedQueue.splice(i, 1);
        try{ t.fn(); }catch(e){}
      }
    }
  },

  // ── Reply systém ────────────────────────
  _openReply(tag){
    this._replyOpen = tag;
    this._renderSms();
  },

  _sendReply(tag, replyIdx){
    const m = this.messages.find(x => x.tag === tag);
    if(!m || !m.replies || m.replied) return;
    const r = m.replies[replyIdx];
    if(!r) return;
    m.replied = true;
    m.replyText = r.text;
    this._replyOpen = null;
    // Efekt odpovědi
    if(r.effect && typeof r.effect === 'function'){
      try{ r.effect(); }catch(e){}
    }
    this._renderSms();
  },

  // ── UI ───────────────────────────────────
  open(tab){
    const ov = document.getElementById('phone-ov');
    ov.classList.add('on');
    this._activeTab = tab || 'sms';
    this._selectedIdx = -1;
    this._replyOpen = null;
    this.switchTab(this._activeTab);
  },

  close(){
    document.getElementById('phone-ov').classList.remove('on');
    this._selectedIdx = -1;
    this._replyOpen = null;
  },

  isOpen(){
    return document.getElementById('phone-ov').classList.contains('on');
  },

  switchTab(tab){
    this._activeTab = tab;
    this._selectedIdx = -1;
    this._replyOpen = null;
    document.querySelectorAll('.phone-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.phone-content').forEach(c => c.classList.toggle('active', c.id === 'phone-' + tab));
    if(tab === 'sms'){ this._unreadSms = 0; this._renderSms(); }
    if(tab === 'kg'){ this._unreadKg = 0; this._renderKg(); }
    if(tab === 'diary') this._renderDiary();
    this._updateBadge();
  },

  // ── Klávesová navigace ──────────────────
  handleKey(key){
    if(!this.isOpen()) return false;
    const tabs = ['sms','kg','diary'];
    const ti = tabs.indexOf(this._activeTab);

    if(key === 'Tab' || key === 'ArrowRight'){
      this.switchTab(tabs[(ti + 1) % 3]);
      return true;
    }
    if(key === 'shift+Tab' || key === 'ArrowLeft'){
      this.switchTab(tabs[(ti + 2) % 3]);
      return true;
    }

    // Navigace v seznamu
    const items = this._getActiveItems();
    if(key === 'ArrowDown'){
      this._selectedIdx = Math.min(this._selectedIdx + 1, items.length - 1);
      this._highlightSelected();
      return true;
    }
    if(key === 'ArrowUp'){
      this._selectedIdx = Math.max(this._selectedIdx - 1, -1);
      this._highlightSelected();
      return true;
    }

    // Enter – otevřít odpovědi (SMS) nebo lajknout (KG)
    if(key === 'Enter' && this._selectedIdx >= 0){
      if(this._activeTab === 'sms'){
        const msg = this.messages.slice().reverse()[this._selectedIdx];
        if(msg && msg.replies && !msg.replied) this._openReply(msg.tag);
      }
      if(this._activeTab === 'kg'){
        const post = this.kremzogram.slice().reverse()[this._selectedIdx];
        if(post) this.likePost(post.tag);
      }
      return true;
    }

    // 1/2/3 pro výběr odpovědi v reply menu
    if(this._replyOpen && (key === '1' || key === '2' || key === '3')){
      this._sendReply(this._replyOpen, parseInt(key) - 1);
      return true;
    }

    if(key === 'Escape'){
      if(this._replyOpen){ this._replyOpen = null; this._renderSms(); return true; }
      this.close();
      return true;
    }

    return false;
  },

  _getActiveItems(){
    if(this._activeTab === 'sms') return this.messages.slice().reverse();
    if(this._activeTab === 'kg') return this.kremzogram.slice().reverse();
    if(this._activeTab === 'diary') return this.diary.slice().reverse();
    return [];
  },

  _highlightSelected(){
    const container = document.getElementById('phone-' + this._activeTab);
    if(!container) return;
    const items = container.querySelectorAll('.sms-msg, .kg-post, .diary-entry');
    items.forEach((el, i) => {
      el.classList.toggle('phone-selected', i === this._selectedIdx);
      if(i === this._selectedIdx) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  },

  // ── Render SMS ──────────────────────────
  _renderSms(){
    const c = document.getElementById('phone-sms');
    if(!this.messages.length){
      c.innerHTML = '<div class="phone-empty">Žádné zprávy</div>';
      return;
    }
    c.innerHTML = this.messages.slice().reverse().map((m, i) => {
      let html = `<div class="sms-msg${i === this._selectedIdx ? ' phone-selected' : ''}" data-idx="${i}">`;
      html += `<div class="sms-head"><span class="sms-av">${m.emoji}</span><span class="sms-from">${m.from}</span><span class="sms-time">${m.time}</span></div>`;
      html += `<div class="sms-body">${m.text}</div>`;

      // Odpověď hráče (už odeslaná)
      if(m.replied && m.replyText){
        html += `<div class="sms-reply-sent"><span class="sms-reply-label">🎒 Ty:</span> ${m.replyText}</div>`;
      }
      // Reply menu (otevřené)
      else if(this._replyOpen === m.tag && m.replies && !m.replied){
        html += '<div class="sms-reply-menu">';
        m.replies.forEach((r, ri) => {
          html += `<button class="sms-reply-btn ${r.cls||''}" onclick="Phone._sendReply('${m.tag}',${ri})">[${ri+1}] ${r.label}</button>`;
        });
        html += '</div>';
      }
      // Tlačítko pro otevření odpovědí
      else if(m.replies && !m.replied){
        html += `<button class="sms-reply-open" onclick="Phone._openReply('${m.tag}')">💬 Odpovědět</button>`;
      }

      html += '</div>';
      return html;
    }).join('');
  },

  // ── Render Křemžogram ───────────────────
  _renderKg(){
    const c = document.getElementById('phone-kg');
    if(!this.kremzogram.length){
      c.innerHTML = '<div class="phone-empty">Žádné příspěvky</div>';
      return;
    }
    c.innerHTML = this.kremzogram.slice().reverse().map((p, i) => {
      const cmts = p.comments.map(cm => `<div class="kg-comment"><b>${cm.author}</b> ${cm.text}</div>`).join('');
      const heartCls = p.playerLiked ? 'kg-liked' : '';
      const heartClick = p.playerLiked ? '' : `onclick="Phone.likePost('${p.tag}')"`;
      return `<div class="kg-post${i === this._selectedIdx ? ' phone-selected' : ''}" data-idx="${i}">` +
        `<div class="kg-head"><span class="kg-av">${p.emoji}</span><span class="kg-author">${p.author}</span><span class="sms-time">${p.time}</span></div>` +
        (p.img ? `<div class="kg-img">${p.img}</div>` : '') +
        `<div class="kg-caption">${p.caption}</div>` +
        `<div class="kg-likes ${heartCls}" ${heartClick}>❤️ ${p.likes}</div>` +
        cmts + '</div>';
    }).join('');
  },

  // ── Render Deník ────────────────────────
  _renderDiary(){
    const c = document.getElementById('phone-diary');
    if(!this.diary.length){
      c.innerHTML = '<div class="phone-empty">Deník je prázdný</div>';
      return;
    }
    c.innerHTML = this.diary.slice().reverse().map((d, i) =>
      `<div class="diary-entry${i === this._selectedIdx ? ' phone-selected' : ''}" data-idx="${i}">` +
      `<div class="diary-head"><span class="diary-title">${d.title}</span><span class="sms-time">${d.time}</span></div>` +
      `<div class="diary-body">${d.text}</div></div>`
    ).join('');
  },

  _time(){
    const h = Math.floor(8 + (gs.ts || 0) / 60000) % 24;
    const m = Math.floor(((gs.ts || 0) % 60000) / 1000);
    return h.toString().padStart(2,'0') + ':' + m.toString().padStart(2,'0');
  },

  _updateBadge(){
    const b = document.getElementById('phone-badge');
    const total = this._unreadSms + this._unreadKg;
    if(b){
      b.textContent = total;
      b.style.display = total > 0 ? '' : 'none';
    }
  },

  _phonePulse(){
    const btn = document.getElementById('phone-btn');
    if(!btn) return;
    btn.classList.remove('phone-pulse');
    void btn.offsetWidth;
    btn.classList.add('phone-pulse');
  },

  _playNotifSound(){
    // Krátký notifikační bleep
    try{
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ac.currentTime);
      osc.frequency.setValueAtTime(1100, ac.currentTime + 0.06);
      gain.gain.setValueAtTime(0.08, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.15);
    }catch(e){}
  }
};

function openPhone(tab){ Phone.open(tab); }
function closePhone(){ Phone.close(); }
function togglePhone(){
  if(Phone.isOpen()) Phone.close();
  else Phone.open();
}

// ── Úvodní zprávy – jen máma, nic spoilerového ──
function phoneInitStartMessages(){
  Phone.addSms('Máma', '👩', 'Fando, nezapomeň si vzít svačinu. A neděl bordel!', 'intro_mama', [
    {label:'Pošli prachy na svačinu 💸', text:'Jo mami, a pošli mi prachy na svačinu 💸', cls:'sms-r-good'},
    {label:'Nech mě žít můj sen 🙄', text:'Mami, já mám 17, nech mě žít svůj křemžskej sen 🙄', cls:'sms-r-bad',
      effect(){ if(typeof addLog==='function') addLog('Máma: *přečteno, žádná odpověď*','ls'); }},
  ]);
  Phone.addPost('kremze_info', '🏠', '🌅🏘️', 'Křemže Info: Krásné ráno v Křemži! Dnes bude teplo ☀️ #kremze #rano', 15, 'kg_kremze_rano');
}

// ── Časované zprávy – spustit po startu hry ──
function phoneStartTimedMessages(){
  const gen = gs._gen;
  const safe = (fn) => () => { if(gs._gen === gen) fn(); };

  // 45s – Honza pošle random zprávu
  Phone.scheduleSms(45000, safe(() => {
    Phone.addSms('Honza', '🧑‍🦱', 'Fando, co děláš? Dneska bude nuda nebo se něco stane? 😂', 'sms_honza_random', [
      {label:'Přežít do oběda 💀', text:'Dneska? Plán je přežít do oběda 💀', cls:'sms-r-good'},
      {label:'Hledám Fábii 🚗', text:'Nemluv na mě, snažím se najít Fábii 🚗', cls:'sms-r-bad'},
    ]);
  }));

  // 90s – Mates filozofuje
  Phone.scheduleSms(90000, safe(() => {
    Phone.addSms('Mates', '😌', 'Víš co mě napadlo... co kdybychom otevřeli hospodu na Měsíci? 🌙🍺', 'sms_mates_random', [
      {label:'Geniální a mimo 🚀🍺', text:'Matesi, ty jsi geniální a zároveň totálně mimo 🚀🍺', cls:'sms-r-good'},
      {label:'Půjč mi stovku 💸', text:'Zavři hubu a radši mi půjč stovku 💸', cls:'sms-r-bad'},
    ]);
    Phone.addPost('mates_chill', '😌', '🌙🍺', 'Mates: Hospoda na Měsíci. Kdo je se mnou? 🚀 #moonbeer #entrepreneur', 8, 'kg_mates_moon');
  }));

  // 150s – Jana selfie
  Phone.scheduleSms(150000, safe(() => {
    Phone.addPost('jana_kosova', '💃', '💅✨', 'Jana: Coffee, sunshine, good vibes only ☀️ #morningvibes #kremze', 45, 'kg_jana_morning');
    Phone.addComment('kg_jana_morning', 'johnny_rich', 'Krásná jako vždy 😍');
    Phone.addComment('kg_jana_morning', 'mates_chill', '☕👍');
  }));

  // 200s – Milan business post
  Phone.scheduleSms(200000, safe(() => {
    Phone.addPost('milan_dealer', '😎', '💰🌿', 'Milan: Grind never stops. Nový stock právě dorazil 💪 #hustle #kremze', 23, 'kg_milan_grind');
    Phone.addComment('kg_milan_grind', 'mates_chill', 'Dej slevu brácho 😂');
  }));

  // 270s – kremze_info zprávy
  Phone.scheduleSms(270000, safe(() => {
    Phone.addPost('kremze_info', '🏠', '🏫📚', 'Křemže Info: Na místní škole probíhá hospitace. Učitelé nervózní. #kremze #skola', 11, 'kg_kremze_hospitace');
  }));

  // 350s – Máma se ptá jestli jí
  Phone.scheduleSms(350000, safe(() => {
    Phone.addSms('Máma', '👩', 'Fando, jíš vůbec? Kup si něco v Bille! 🥪', 'sms_mama_jis', [
      {label:'Snídal jsem kratom 🌿', text:'Mami, snídal jsem kratom od Milana, počítá se to? 🌿', cls:'sms-r-good'},
      {label:'Zachraňuju Křemži 🦸', text:'Nemám čas jíst, zachraňuju Křemži 🦸', cls:'sms-r-bad'},
    ]);
  }));

  // 500s – Mikuláš inzerát
  Phone.scheduleSms(500000, safe(() => {
    Phone.addPost('mikulas_herbs', '🌿', '🌿✨', 'Mikuláš: Čerstvý blend k dispozici. Přírodní, kvalitní, bez chemie. DM pro info 🌿 #herbs #natural', 7, 'kg_mik_herbs');
    Phone.addComment('kg_mik_herbs', 'milan_dealer', 'Konkurence? 😤');
    Phone.addComment('kg_mik_herbs', 'jana_kosova', 'Potřebuju! 💚');
  }));

  // 650s – Johnny flex
  Phone.scheduleSms(650000, safe(() => {
    Phone.addPost('johnny_rich', '🤵', '🥃🏠', 'Johnny: Another day, another deal. Vila life hits different. #luxury #grind #VazaSystems', 92, 'kg_johnny_flex');
    Phone.addComment('kg_johnny_flex', 'mates_chill', 'Pozvánka kdy? 🍺');
    Phone.addComment('kg_johnny_flex', 'kremze_info', '📸 Nejlajkovanější post tohoto týdne!');
  }));
}
