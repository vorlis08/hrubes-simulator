'use strict';
// ═══════════════════════════════════════════
//  ZÁPISNÍK – Fandův telefon (R)
// ═══════════════════════════════════════════

const NOTEBOOK_CHAPTERS = {
  prolog:    { title: '📖 Prolog',             icon: '🏫', order: 0 },
  figurova:  { title: '🕵️ Figurová',           icon: '🕵️', order: 1 },
  milan:     { title: '💪 Milan & Kubátová',    icon: '💪', order: 2 },
  johnny:    { title: '🎸 Johnny & Jana',       icon: '🎸', order: 3 },
  krejci:    { title: '📚 Krejčí & Mikuláš',    icon: '📚', order: 4 },
  temne:     { title: '🩸 Temné cesty',         icon: '🩸', order: 5 },
  saman:     { title: '🔮 Šaman & okultismus',  icon: '🔮', order: 6 },
  byznys:    { title: '💰 Byznys & hustles',    icon: '💰', order: 7 },
  maturita:  { title: '🏆 Maturita',            icon: '🏆', order: 8 },
  ruzne:     { title: '📝 Různé',               icon: '📝', order: 9 },
};

function initNotebook(){
  if(!gs.notebook) gs.notebook = [];
}

function addStoryEntry(chapter, text, emoji){
  if(!gs.notebook) gs.notebook = [];
  if(gs.notebook.some(e => e.text === text)) return;
  gs.notebook.push({
    chapter: chapter,
    text: text,
    emoji: emoji || '•',
    ts: Date.now()
  });
  renderNotebook();
  _flashPhoneHint();
}

function _flashPhoneHint(){
  const hint = document.getElementById('phone-hint-r');
  if(!hint) return;
  hint.classList.add('flash');
  setTimeout(() => hint.classList.remove('flash'), 2200);
}

function toggleNotebook(){
  const ov = document.getElementById('notebook-ov');
  if(!ov) return;
  if(ov.classList.contains('on')){
    ov.classList.remove('on');
  } else {
    renderNotebook();
    ov.classList.add('on');
  }
}

function closeNotebook(){
  const ov = document.getElementById('notebook-ov');
  if(ov) ov.classList.remove('on');
}

function renderNotebook(){
  const body = document.getElementById('notebook-body');
  if(!body) return;
  if(!gs.notebook || !gs.notebook.length){
    body.innerHTML = '<div class="nb-empty">Zatím nic zajímavého...</div>';
    return;
  }

  const grouped = {};
  for(const e of gs.notebook){
    if(!grouped[e.chapter]) grouped[e.chapter] = [];
    grouped[e.chapter].push(e);
  }

  const sortedChapters = Object.keys(grouped).sort((a, b) => {
    const oa = NOTEBOOK_CHAPTERS[a] ? NOTEBOOK_CHAPTERS[a].order : 99;
    const ob = NOTEBOOK_CHAPTERS[b] ? NOTEBOOK_CHAPTERS[b].order : 99;
    return oa - ob;
  });

  let html = '';
  for(const ch of sortedChapters){
    const def = NOTEBOOK_CHAPTERS[ch] || { title: ch, icon: '📝' };
    const entries = grouped[ch];
    html += `<div class="nb-chapter">
      <div class="nb-ch-title">${def.icon} ${def.title} <span class="nb-ch-count">${entries.length}</span></div>
      <div class="nb-entries">`;
    for(const e of entries){
      html += `<div class="nb-entry"><span class="nb-emoji">${e.emoji}</span><span class="nb-text">${e.text}</span></div>`;
    }
    html += '</div></div>';
  }
  body.innerHTML = html;
}
