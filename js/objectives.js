'use strict';
// ═══════════════════════════════════════════
//  SYSTÉM ÚKOLŮ
// ═══════════════════════════════════════════

function initObj(){
  gs.objectives = OBJ_DEFS.map(o => ({
    ...o,
    done:   false,
    active: o.alwaysShow === true,
  }));
  renderObj();
}

// Aktivuje quest v logu (zobrazí ho)
function addObj(id){
  const o = gs.objectives.find(x => x.id === id);
  if(o && !o.active){ o.active = true; renderObj(); }
}

// Označí quest jako splněný
function doneObj(id){
  const o = gs.objectives.find(x => x.id === id);
  if(o){ o.active = true; o.done = true; renderObj(); }
}

function renderObj(){
  const list = gs.objectives.filter(o => o.active);
  const el   = document.getElementById('objlist');
  if(!list.length){
    el.innerHTML = '<div style="color:rgba(255,255,255,.25);font-size:10px;font-family:var(--fm);padding:6px 0">Žádné aktivní úkoly.</div>';
    return;
  }
  el.innerHTML = list.map(o => `
    <div class="obj${o.done ? ' done' : ''}">
      <span class="oi">${o.done ? '✅' : '◇'}</span>
      <div><span class="tag">${o.tag}</span>${o.text}</div>
    </div>`).join('');
}
