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

  reset(){
    this.messages = [];
    this.kremzogram = [];
    this.diary = [];
    this._unreadSms = 0;
    this._unreadKg = 0;
    this._updateBadge();
  },

  // ── SMS ──────────────────────────────────
  addSms(from, emoji, text, tag){
    if(tag && this.messages.some(m => m.tag === tag)) return;
    this.messages.push({ from, emoji, text, time: this._time(), tag: tag||null });
    this._unreadSms++;
    this._updateBadge();
    this._phonePulse();
  },

  // ── Křemžogram ───────────────────────────
  addPost(author, emoji, img, caption, likes, tag){
    if(tag && this.kremzogram.some(p => p.tag === tag)) return;
    this.kremzogram.push({ author, emoji, img, caption, likes: likes||0, comments: [], time: this._time(), tag: tag||null });
    this._unreadKg++;
    this._updateBadge();
    this._phonePulse();
  },

  addComment(postTag, author, text){
    const p = this.kremzogram.find(x => x.tag === postTag);
    if(p) p.comments.push({ author, text });
  },

  // ── Deník ────────────────────────────────
  addDiary(title, text, tag){
    if(tag && this.diary.some(d => d.tag === tag)) return;
    this.diary.push({ title, text, time: this._time(), tag: tag||null });
  },

  // ── UI ───────────────────────────────────
  open(tab){
    const ov = document.getElementById('phone-ov');
    ov.classList.add('on');
    this.switchTab(tab || 'sms');
  },

  close(){
    document.getElementById('phone-ov').classList.remove('on');
  },

  isOpen(){
    return document.getElementById('phone-ov').classList.contains('on');
  },

  switchTab(tab){
    document.querySelectorAll('.phone-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.phone-content').forEach(c => c.classList.toggle('active', c.id === 'phone-' + tab));
    if(tab === 'sms'){ this._unreadSms = 0; this._renderSms(); }
    if(tab === 'kg'){ this._unreadKg = 0; this._renderKg(); }
    if(tab === 'diary') this._renderDiary();
    this._updateBadge();
  },

  _renderSms(){
    const c = document.getElementById('phone-sms');
    if(!this.messages.length){
      c.innerHTML = '<div class="phone-empty">Žádné zprávy</div>';
      return;
    }
    c.innerHTML = this.messages.slice().reverse().map(m =>
      `<div class="sms-msg"><div class="sms-head"><span class="sms-av">${m.emoji}</span><span class="sms-from">${m.from}</span><span class="sms-time">${m.time}</span></div><div class="sms-body">${m.text}</div></div>`
    ).join('');
  },

  _renderKg(){
    const c = document.getElementById('phone-kg');
    if(!this.kremzogram.length){
      c.innerHTML = '<div class="phone-empty">Žádné příspěvky</div>';
      return;
    }
    c.innerHTML = this.kremzogram.slice().reverse().map(p => {
      const cmts = p.comments.map(cm => `<div class="kg-comment"><b>${cm.author}</b> ${cm.text}</div>`).join('');
      return `<div class="kg-post"><div class="kg-head"><span class="kg-av">${p.emoji}</span><span class="kg-author">${p.author}</span><span class="sms-time">${p.time}</span></div>${p.img ? `<div class="kg-img">${p.img}</div>` : ''}<div class="kg-caption">${p.caption}</div><div class="kg-likes">❤️ ${p.likes}</div>${cmts}</div>`;
    }).join('');
  },

  _renderDiary(){
    const c = document.getElementById('phone-diary');
    if(!this.diary.length){
      c.innerHTML = '<div class="phone-empty">Deník je prázdný</div>';
      return;
    }
    c.innerHTML = this.diary.slice().reverse().map(d =>
      `<div class="diary-entry"><div class="diary-head"><span class="diary-title">${d.title}</span><span class="sms-time">${d.time}</span></div><div class="diary-body">${d.text}</div></div>`
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
  Phone.addSms('Máma', '👩', 'Fando, nezapomeň si vzít svačinu. A neděl bordel!', 'intro_mama');
  Phone.addPost('kremze_info', '🏠', '🌅🏘️', 'Křemže Info: Krásné ráno v Křemži! Dnes bude teplo ☀️ #kremze #rano', 15, 'kg_kremze_rano');
}
