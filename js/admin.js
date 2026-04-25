'use strict';
// ═══════════════════════════════════════════
//  ADMIN PANEL – správa profilů
//  František Hrubeš Simulator 2026
// ═══════════════════════════════════════════

// ── Změň toto heslo dle libosti ──────────────────────────────────────────────
const ADMIN_PASSWORD = 'obidek';

// ─────────────────────────────────────────────────────────────────────────────

let adminSelectedProfile = null; // klíč (lowercase username)

function openAdminPanel(){
  document.getElementById('admin-ov').classList.add('on');
  adminRenderProfileList();
  adminShowList();
}

function closeAdminPanel(){
  document.getElementById('admin-ov').classList.remove('on');
  adminSelectedProfile = null;
}

function adminShowList(){
  document.getElementById('admin-list-view').style.display = '';
  document.getElementById('admin-edit-view').style.display = 'none';
}

function adminShowEdit(){
  document.getElementById('admin-list-view').style.display = 'none';
  document.getElementById('admin-edit-view').style.display = '';
}

// ─── Render seznamu profilů ───────────────────────────────────────────────────

function adminRenderProfileList(){
  const listEl = document.getElementById('admin-profile-list');
  listEl.innerHTML = '';

  if(FB_CONFIGURED){
    listEl.innerHTML = '<div class="adm-notice">⚠️ Online mód – profily jsou v Firebase.<br>Správa probíhá přes <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a>.<br><br>Níže jsou profily uložené lokálně (pokud nějaké existují).</div>';
  }

  const profiles = getAllProfilesLocal();
  const keys = Object.keys(profiles);

  if(keys.length === 0){
    const empty = document.createElement('div');
    empty.className = 'adm-empty';
    empty.textContent = 'Žádné lokální profily.';
    listEl.appendChild(empty);
    return;
  }

  keys.forEach(key => {
    const p = profiles[key];
    const tier = getProfileTier(p);
    const row = document.createElement('div');
    row.className = 'adm-row';
    row.innerHTML = `
      <span class="adm-row-avatar">${p.avatar && !p.avatar.startsWith('data:') ? p.avatar : tier.emoji}</span>
      <div class="adm-row-info">
        <div class="adm-row-name">${escHtml(p.displayName || p.username)}</div>
        <div class="adm-row-sub">${escHtml(p.username)} · ${p.stats.totalGames} her · ${p.stats.totalWins} výher</div>
      </div>
      <div class="adm-row-actions">
        <button class="adm-btn-edit" data-key="${key}">✏️ Upravit</button>
        <button class="adm-btn-del"  data-key="${key}">🗑️</button>
      </div>`;
    listEl.appendChild(row);
  });

  listEl.querySelectorAll('.adm-btn-edit').forEach(btn => {
    btn.addEventListener('click', () => adminEditProfile(btn.dataset.key));
  });
  listEl.querySelectorAll('.adm-btn-del').forEach(btn => {
    btn.addEventListener('click', () => adminDeleteProfile(btn.dataset.key));
  });
}

// ─── Smazání profilu ──────────────────────────────────────────────────────────

async function adminDeleteProfile(key){
  const profiles = getAllProfilesLocal();
  const p = profiles[key];
  if(!p) return;

  const confirmed = await showConfirm(
    '🗑️',
    'Smazat profil?',
    `Opravdu smazat "${p.username}"? Tato akce je nevratná.`,
    'Smazat', 'Zrušit'
  );
  if(!confirmed) return;

  delete profiles[key];
  saveAllProfilesLocal(profiles);
  if(activeProfile && activeProfile.username.toLowerCase() === key){
    activeProfile = null;
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
  showToast('Profil smazán.', 'ok');
  adminRenderProfileList();
}

// ─── Editor profilu ───────────────────────────────────────────────────────────

function adminEditProfile(key){
  const profiles = getAllProfilesLocal();
  const p = profiles[key];
  if(!p) return;

  adminSelectedProfile = key;

  // Hlavička
  document.getElementById('adm-edit-title').textContent = `Editace: ${p.username}`;

  // Základní info
  document.getElementById('adm-displayname').value = p.displayName || p.username;

  // Stats
  const statsFields = ['totalGames','totalDeaths','totalWins','bestRep','mostMoney','totalKratom','killCount'];
  statsFields.forEach(f => {
    const el = document.getElementById('adm-stat-' + f);
    if(el) el.value = p.stats[f] || 0;
  });
  const fwEl = document.getElementById('adm-stat-fastestWin');
  if(fwEl) fwEl.value = p.stats.fastestWin || '';

  // Artefakty
  Object.keys(p.artifacts).forEach(k => {
    const el = document.getElementById('adm-art-' + k);
    if(el) el.checked = !!p.artifacts[k];
  });

  // Endingy
  Object.keys(p.endings).forEach(k => {
    const el = document.getElementById('adm-end-' + k);
    if(el) el.checked = !!p.endings[k];
  });

  // Questy
  Object.keys(p.questsCompleted).forEach(k => {
    const el = document.getElementById('adm-qst-' + k);
    if(el) el.checked = !!p.questsCompleted[k];
  });

  adminShowEdit();
}

function adminSaveEdit(){
  if(!adminSelectedProfile) return;
  const profiles = getAllProfilesLocal();
  const p = profiles[adminSelectedProfile];
  if(!p) return;

  // Základní info
  const dn = document.getElementById('adm-displayname').value.trim();
  if(dn) p.displayName = dn;

  // Stats
  const statsFields = ['totalGames','totalDeaths','totalWins','bestRep','mostMoney','totalKratom','killCount'];
  statsFields.forEach(f => {
    const el = document.getElementById('adm-stat-' + f);
    if(el) p.stats[f] = parseInt(el.value) || 0;
  });
  const fwEl = document.getElementById('adm-stat-fastestWin');
  if(fwEl) p.stats.fastestWin = fwEl.value ? (parseInt(fwEl.value) || null) : null;

  // Artefakty
  Object.keys(p.artifacts).forEach(k => {
    const el = document.getElementById('adm-art-' + k);
    if(el) p.artifacts[k] = el.checked;
  });

  // Endingy
  Object.keys(p.endings).forEach(k => {
    const el = document.getElementById('adm-end-' + k);
    if(el) p.endings[k] = el.checked;
  });

  // Questy
  Object.keys(p.questsCompleted).forEach(k => {
    const el = document.getElementById('adm-qst-' + k);
    if(el) p.questsCompleted[k] = el.checked;
  });

  profiles[adminSelectedProfile] = p;
  saveAllProfilesLocal(profiles);

  // Pokud editujeme aktivní profil, aktualizuj i v paměti
  if(activeProfile && activeProfile.username.toLowerCase() === adminSelectedProfile){
    Object.assign(activeProfile, p);
  }

  showToast('Profil uložen.', 'ok');
  adminShowList();
  adminRenderProfileList();
}

// ─── Klávesová zkratka pro otevření ──────────────────────────────────────────

function initAdminShortcut(){
  document.addEventListener('keydown', e => {
    if(e.ctrlKey && e.shiftKey && e.key === 'A'){
      e.preventDefault();
      // Pokud je panel otevřen, zavři
      if(document.getElementById('admin-ov').classList.contains('on')){
        closeAdminPanel();
        return;
      }
      // Jinak vyžádej heslo
      showPromptModal('🔑', 'Admin přístup', 'Zadej admin heslo:', '••••••')
        .then(pw => {
          if(pw === ADMIN_PASSWORD) openAdminPanel();
          else if(pw !== null) showToast('Špatné heslo.', 'err');
        });
    }
  });
}

// ─── Inicializace ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initAdminShortcut();

  document.getElementById('admin-close').addEventListener('click', closeAdminPanel);
  document.getElementById('admin-ov').addEventListener('click', e => {
    if(e.target === document.getElementById('admin-ov')) closeAdminPanel();
  });

  document.getElementById('adm-back-btn').addEventListener('click', () => {
    adminShowList();
    adminRenderProfileList();
  });
  document.getElementById('adm-save-btn').addEventListener('click', adminSaveEdit);

  // Tlačítka "vše zapnout/vypnout" v sekcích
  document.querySelectorAll('.adm-toggle-all').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      const state   = btn.dataset.state === 'on';
      document.querySelectorAll(`[data-section="${section}"].adm-chk`).forEach(cb => {
        cb.checked = state;
      });
    });
  });
});
