'use strict';
// ═══════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════

const REP_TIERS = [
  { min:90, emoji:'🏆', title:'Naprostý frajer'     },
  { min:75, emoji:'👑', title:'Křemžský kníže'      },
  { min:60, emoji:'💀', title:'Nebezpečný element'  },
  { min:45, emoji:'🔥', title:'Legenda ulice'       },
  { min:30, emoji:'😎', title:'Křemžský harcovník'  },
  { min:15, emoji:'🤝', title:'Respektovaný'        },
  { min:5,  emoji:'😏', title:'Místní znalec'       },
  { min:0,  emoji:'🤙', title:'Křemžský outsider'   },
];
function getRepTier(rep){ return REP_TIERS.find(t => rep >= t.min) || REP_TIERS[REP_TIERS.length-1]; }

let _prevMoney = null;
function animateValue(el, start, end, suffix){
  if(start === end) return;
  const dur = 400;
  const t0 = performance.now();
  const diff = end - start;
  function step(now){
    const p = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + diff * ease) + suffix;
    if(p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateHUD(){
  const moneyEl = document.getElementById('sm');
  if(_prevMoney !== null && _prevMoney !== gs.money){
    animateValue(moneyEl, _prevMoney, gs.money, ' Kč');
    moneyEl.style.transform = 'scale(1.1)';
    setTimeout(() => moneyEl.style.transform = '', 300);
  } else {
    moneyEl.textContent = gs.money + ' Kč';
  }
  _prevMoney = gs.money;

  if(gs.money >= 2000) doneObj('main_money');

  const pct = gs.energy;
  const ef  = document.getElementById('se');
  ef.style.width      = pct + '%';
  ef.style.background = pct > 60 ? 'var(--green)' : pct > 25 ? '#eab308' : 'var(--red)';
  document.getElementById('set').textContent = Math.floor(pct) + '%';

  // Rep bar – zobrazuje se vůči dalšímu ranku
  const repLvl = getRepLevel(gs.rep);
  const nextLvl = REP_LEVELS.find(x => x.min > gs.rep);
  const rpPct = nextLvl ? ((gs.rep - repLvl.min) / (nextLvl.min - repLvl.min)) * 100 : 100;
  document.getElementById('rep-fill').style.width = Math.min(100, rpPct) + '%';
  document.getElementById('rep-fill').style.background = repLvl.color;
  document.getElementById('rept').textContent = gs.rep;
  const rankEl = document.getElementById('rep-rank');
  if(rankEl){ rankEl.textContent = repLvl.label; rankEl.style.color = repLvl.color; }

  const tier = getRepTier(gs.rep);
  document.getElementById('hud-av').textContent    = tier.emoji;
  document.getElementById('hud-title').textContent = tier.title;
}

function updateInv(){
  const map = {
    kratom:'ic-kratom', blend:'ic-blend', zemle:'ic-zemle', piko:'ic-piko',
    pivo:'ic-pivo', kratom_kava:'ic-kava', cert:'ic-cert',
    pytel:'ic-pytel', fake_kratom:'ic-fake', cibule:'ic-cibule',
    voodoo:'ic-voodoo', nuz:'ic-nuz',
    screenshot:'ic-screenshot', hlasovka:'ic-hlasovka',
    foto_kubatova:'ic-foto_kubatova', c2_cert:'ic-c2_cert',
    fig_nuz:'ic-fig_nuz', fig_gun:'ic-fig_gun', milan_phone:'ic-milan_phone',
    zelizka:'ic-zelizka', prasek:'ic-prasek', klice_vila:'ic-klice_vila', podprsenka:'ic-podprsenka',
    klice_fabie:'ic-klice_fabie', klice_fabie_fig:'ic-klice_fabie_fig', saman_hlava:'ic-saman_hlava',
    membership_vaza:'ic-membership_vaza', propiska:'ic-propiska',
  };
  for(const [k, id] of Object.entries(map)){
    const cnt = gs.inv[k] || 0;
    const el  = document.getElementById(id);
    const pytelSpec = k === 'pytel' && gs.cihalova_in_bag;
    const visible = cnt > 0 || pytelSpec;
    if(el) el.textContent = (k === 'kratom' || k === 'fake_kratom') ? cnt + 'g' : (pytelSpec ? '👩‍🏫' : cnt);
    const sl = document.getElementById('sl-' + k);
    if(sl){
      const wasHidden = sl.style.display === 'none';
      sl.style.display = visible ? '' : 'none';
      // Pop animation when item first appears
      if(wasHidden && visible){
        sl.classList.remove('new-item');
        void sl.offsetWidth; // force reflow
        sl.classList.add('new-item');
        setTimeout(()=> sl.classList.remove('new-item'), 550);
      }
    }
  }

  // Oddělovače – schovat pokud jsou obě sousední skupiny prázdné
  const g1 = ['kratom','blend','zemle'];
  const g2 = ['piko','fake_kratom','pytel'];
  const g3 = ['pivo','cibule','kratom_kava','cert','voodoo','nuz','screenshot','hlasovka','foto_kubatova','c2_cert','fig_nuz','fig_gun','milan_phone','zelizka','prasek','klice_vila','klice_fabie','klice_fabie_fig','podprsenka','membership_vaza','propiska'];
  function grpVisible(keys){ return keys.some(k => (gs.inv[k]||0) > 0 || (k==='pytel' && gs.cihalova_in_bag)); }
  const seps = document.querySelectorAll('.isep');
  if(seps[0]) seps[0].style.display = (grpVisible(g1) && grpVisible(g2)) ? '' : 'none';
  if(seps[1]) seps[1].style.display = (grpVisible(g2) && grpVisible(g3)) ? '' : 'none';
}

function addLog(txt, cls = ''){
  const c   = document.getElementById('logc');
  const d   = document.createElement('div');
  const now = new Date();
  const ts  = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  d.className = 'le' + (cls ? ' ' + cls : '');
  d.innerHTML = `<span class="lts">${ts}</span>${txt}`;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
  while(c.children.length > 50) c.removeChild(c.firstChild);
}

function fnotif(txt, type = 'pos'){
  // Zápis do deníku místo levitujících notifikací
  const clsMap = {pos:'lr', neg:'lw', itm:'lm', rep:'lp', lw:'lw'};
  addLog(txt, clsMap[type] || 'ls');
}

function screenShake(ms){
  const gc = document.getElementById('gc');
  let t    = 0;
  const iv = setInterval(() => {
    gc.style.transform = `translate(${(Math.random()-.5)*12}px,${(Math.random()-.5)*12}px)`;
    t += 50;
    if(t >= ms){ clearInterval(iv); gc.style.transform = ''; }
  }, 50);
}

// ── Dialog button mouse-follow glow ──────────────────────────────────────
document.addEventListener('mousemove', e => {
  const btns = document.querySelectorAll('.db:not(.prim)');
  btns.forEach(btn => {
    const r = btn.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    btn.style.setProperty('--mx', x + '%');
    btn.style.setProperty('--my', y + '%');
  });
});
