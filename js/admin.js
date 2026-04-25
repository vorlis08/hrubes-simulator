'use strict';
// ═══════════════════════════════════════════
//  ADMIN PANEL – správa profilů
//  František Hrubeš Simulator 2026
// ═══════════════════════════════════════════

const ADMIN_PASSWORD = 'obidek';

// _uid nebo localStorage key editovaného profilu
let adminSelectedKey = null;
let adminSelectedUid = null; // jen Firebase mód

// ─── Otevření / zavření ───────────────────────────────────────────────────────

function openAdminPanel(){
  document.getElementById('admin-ov').classList.add('on');
  adminShowList();
  adminLoadProfiles();
}

function closeAdminPanel(){
  document.getElementById('admin-ov').classList.remove('on');
  adminSelectedKey = null;
  adminSelectedUid = null;
}

function adminShowList(){
  document.getElementById('admin-list-view').style.display = '';
  document.getElementById('admin-edit-view').style.display = 'none';
}

function adminShowEdit(){
  document.getElementById('admin-list-view').style.display = 'none';
  document.getElementById('admin-edit-view').style.display = '';
}

// ─── Načtení profilů ─────────────────────────────────────────────────────────

async function adminLoadProfiles(){
  const listEl = document.getElementById('admin-profile-list');
  listEl.innerHTML = '<div class="adm-loading">Načítám profily...</div>';

  if(FB_CONFIGURED){
    // Zkontroluj admin oprávnění
    const uid = fbAuth.currentUser && fbAuth.currentUser.uid;
    if(!uid){
      listEl.innerHTML = '<div class="adm-notice">⚠️ Pro správu Firebase profilů musíš být přihlášen ve hře.</div>';
      adminRenderLocalProfiles(listEl, true);
      return;
    }

    let isAdmin = false;
    try {
      const snap = await fbDb.collection('admins').doc(uid).get();
      isAdmin = snap.exists;
    } catch(e){ /* pravidla neumožňují čtení = není admin */ }

    if(!isAdmin){
      const uidEl = document.createElement('div');
      uidEl.className = 'adm-notice';
      uidEl.innerHTML =
        '⚠️ Tvůj účet nemá admin oprávnění.<br>' +
        'Přidej svůj UID do kolekce <b>admins</b> ve Firebase Console.<br><br>' +
        '📋 Tvůj UID: <code class="adm-uid" id="adm-my-uid">' + uid + '</code>' +
        ' <button class="adm-copy-uid" onclick="navigator.clipboard.writeText(\'' + uid + '\').then(()=>showToast(\'Zkopírováno\',\'ok\'))">📋 Kopírovat</button><br><br>' +
        'Také aktualizuj Firestore pravidla – viz komentář v js/admin.js.';
      listEl.innerHTML = '';
      listEl.appendChild(uidEl);
      adminRenderLocalProfiles(listEl, true);
      return;
    }

    // Načti všechny profily z Firebase
    try {
      const snap = await fbDb.collection('profiles').get();
      const fbProfiles = [];
      snap.forEach(doc => fbProfiles.push({ _uid: doc.id, ...doc.data() }));
      listEl.innerHTML = '';
      const badge = document.createElement('div');
      badge.className = 'adm-section-title';
      badge.textContent = `Firebase profily (${fbProfiles.length})`;
      listEl.appendChild(badge);
      if(fbProfiles.length === 0){
        const empty = document.createElement('div');
        empty.className = 'adm-empty';
        empty.textContent = 'Žádné profily v databázi.';
        listEl.appendChild(empty);
      } else {
        fbProfiles.forEach(p => adminAppendRow(listEl, p, 'fb'));
      }
    } catch(e){
      listEl.innerHTML = '<div class="adm-notice">Chyba načítání Firebase profilů: ' + e.message + '</div>';
    }

    adminRenderLocalProfiles(listEl, true);
  } else {
    listEl.innerHTML = '';
    adminRenderLocalProfiles(listEl, false);
  }
}

function adminRenderLocalProfiles(container, addLabel){
  const profiles = getAllProfilesLocal();
  const keys = Object.keys(profiles);
  if(addLabel || keys.length > 0){
    const badge = document.createElement('div');
    badge.className = 'adm-section-title';
    badge.style.marginTop = addLabel ? '18px' : '0';
    badge.textContent = `Lokální profily (${keys.length})`;
    container.appendChild(badge);
  }
  if(keys.length === 0){
    const empty = document.createElement('div');
    empty.className = 'adm-empty';
    empty.textContent = 'Žádné lokální profily.';
    container.appendChild(empty);
    return;
  }
  keys.forEach(key => {
    const p = profiles[key];
    adminAppendRow(container, p, 'local', key);
  });
}

function adminAppendRow(container, p, mode, localKey){
  const tier = getProfileTier(p);
  const avatar = (p.avatar && !p.avatar.startsWith('data:')) ? p.avatar : tier.emoji;
  const uid = p._uid || '';
  const row = document.createElement('div');
  row.className = 'adm-row';
  row.innerHTML = `
    <span class="adm-row-avatar">${avatar}</span>
    <div class="adm-row-info">
      <div class="adm-row-name">${escHtml(p.displayName || p.username || '???')}</div>
      <div class="adm-row-sub">${escHtml(p.username || uid)} · ${p.stats ? p.stats.totalGames : '?'} her · ${p.stats ? p.stats.totalWins : '?'} výher${mode === 'fb' ? ' · 🌐 Firebase' : ' · 💾 Local'}</div>
    </div>
    <div class="adm-row-actions">
      <button class="adm-btn-edit">✏️ Upravit</button>
      <button class="adm-btn-del">🗑️</button>
    </div>`;
  row.querySelector('.adm-btn-edit').addEventListener('click', () => adminEditProfile(p, mode, localKey));
  row.querySelector('.adm-btn-del').addEventListener('click', () => adminDeleteProfile(p, mode, localKey));
  container.appendChild(row);
}

// ─── Smazání profilu ──────────────────────────────────────────────────────────

async function adminDeleteProfile(p, mode, localKey){
  const name = p.username || p.displayName || '???';
  const confirmed = await showConfirm('🗑️', 'Smazat profil?',
    `Opravdu smazat "${name}"? Tato akce je nevratná.`, 'Smazat', 'Zrušit');
  if(!confirmed) return;

  if(mode === 'fb' && FB_CONFIGURED){
    const uid = p._uid;
    try {
      const batch = fbDb.batch();
      batch.delete(fbDb.collection('profiles').doc(uid));
      batch.delete(fbDb.collection('leaderboard').doc(uid));
      if(p.username) batch.delete(fbDb.collection('usernames').doc(p.username.toLowerCase()));
      await batch.commit();
      showToast('Profil smazán z Firebase (Auth účet zůstává).', 'ok');
    } catch(e){
      showToast('Chyba: ' + e.message, 'err'); return;
    }
  } else {
    const profiles = getAllProfilesLocal();
    delete profiles[localKey];
    saveAllProfilesLocal(profiles);
    if(activeProfile && activeProfile.username && activeProfile.username.toLowerCase() === localKey){
      activeProfile = null;
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
    showToast('Profil smazán.', 'ok');
  }
  adminLoadProfiles();
}

// ─── Editor profilu ───────────────────────────────────────────────────────────

function adminEditProfile(p, mode, localKey){
  adminSelectedKey  = mode === 'local' ? localKey : null;
  adminSelectedUid  = mode === 'fb'    ? p._uid   : null;
  // Ulož celý objekt pro save (deep copy)
  window._adminEditData = { profile: JSON.parse(JSON.stringify(p)), mode };

  document.getElementById('adm-edit-title').textContent = `Editace: ${p.username || p._uid}`;
  document.getElementById('adm-displayname').value = p.displayName || p.username || '';

  const s = p.stats || {};
  ['totalGames','totalDeaths','totalWins','bestRep','mostMoney','totalKratom','killCount'].forEach(f => {
    const el = document.getElementById('adm-stat-' + f);
    if(el) el.value = s[f] || 0;
  });
  const fwEl = document.getElementById('adm-stat-fastestWin');
  if(fwEl) fwEl.value = s.fastestWin || '';

  const art = p.artifacts || {};
  Object.keys(art).forEach(k => {
    const el = document.getElementById('adm-art-' + k);
    if(el) el.checked = !!art[k];
  });

  const end = p.endings || {};
  Object.keys(end).forEach(k => {
    const el = document.getElementById('adm-end-' + k);
    if(el) el.checked = !!end[k];
  });

  const qst = p.questsCompleted || {};
  Object.keys(qst).forEach(k => {
    const el = document.getElementById('adm-qst-' + k);
    if(el) el.checked = !!qst[k];
  });

  adminShowEdit();
}

async function adminSaveEdit(){
  const { profile, mode } = window._adminEditData || {};
  if(!profile) return;

  const dn = document.getElementById('adm-displayname').value.trim();
  if(dn) profile.displayName = dn;

  const s = profile.stats || {};
  ['totalGames','totalDeaths','totalWins','bestRep','mostMoney','totalKratom','killCount'].forEach(f => {
    const el = document.getElementById('adm-stat-' + f);
    if(el) s[f] = parseInt(el.value) || 0;
  });
  const fwEl = document.getElementById('adm-stat-fastestWin');
  if(fwEl) s.fastestWin = fwEl.value ? (parseInt(fwEl.value) || null) : null;
  profile.stats = s;

  const art = profile.artifacts || {};
  Object.keys(art).forEach(k => {
    const el = document.getElementById('adm-art-' + k);
    if(el) art[k] = el.checked;
  });
  profile.artifacts = art;

  const end = profile.endings || {};
  Object.keys(end).forEach(k => {
    const el = document.getElementById('adm-end-' + k);
    if(el) end[k] = el.checked;
  });
  profile.endings = end;

  const qst = profile.questsCompleted || {};
  Object.keys(qst).forEach(k => {
    const el = document.getElementById('adm-qst-' + k);
    if(el) qst[k] = el.checked;
  });
  profile.questsCompleted = qst;

  const btn = document.getElementById('adm-save-btn');
  btn.disabled = true; btn.textContent = '...';

  if(mode === 'fb' && FB_CONFIGURED && adminSelectedUid){
    try {
      const data = Object.assign({}, profile);
      delete data._uid;
      await fbDb.collection('profiles').doc(adminSelectedUid).set(data);
      showToast('Uloženo do Firebase.', 'ok');
    } catch(e){
      showToast('Chyba Firebase: ' + e.message, 'err');
      btn.disabled = false; btn.textContent = '💾 Uložit'; return;
    }
  } else if(mode === 'local' && adminSelectedKey){
    const profiles = getAllProfilesLocal();
    profiles[adminSelectedKey] = profile;
    saveAllProfilesLocal(profiles);
    if(activeProfile && activeProfile.username && activeProfile.username.toLowerCase() === adminSelectedKey){
      Object.assign(activeProfile, profile);
    }
    showToast('Uloženo lokálně.', 'ok');
  }

  btn.disabled = false; btn.textContent = '💾 Uložit';
  adminShowList();
  adminLoadProfiles();
}

// ─── Klávesová zkratka ────────────────────────────────────────────────────────

function initAdminShortcut(){
  document.addEventListener('keydown', e => {
    if(e.ctrlKey && e.shiftKey && e.key === 'A'){
      e.preventDefault();
      if(document.getElementById('admin-ov').classList.contains('on')){
        closeAdminPanel(); return;
      }
      showPromptModal('🔑', 'Admin přístup', 'Zadej admin heslo:', '••••••')
        .then(pw => {
          if(pw === ADMIN_PASSWORD) openAdminPanel();
          else if(pw !== null) showToast('Špatné heslo.', 'err');
        });
    }
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initAdminShortcut();

  document.getElementById('admin-close').addEventListener('click', closeAdminPanel);
  document.getElementById('admin-ov').addEventListener('click', e => {
    if(e.target === document.getElementById('admin-ov')) closeAdminPanel();
  });
  document.getElementById('adm-back-btn').addEventListener('click', () => {
    adminShowList();
    adminLoadProfiles();
  });
  document.getElementById('adm-save-btn').addEventListener('click', adminSaveEdit);

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

/*
 ═══════════════════════════════════════════════════════
  FIRESTORE PRAVIDLA – vlož do Firebase Console → Firestore → Rules
  (nahraď stávající pravidla)
 ═══════════════════════════════════════════════════════

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // Admin kolekce – jen vlastník vidí svůj záznam
    match /admins/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
    }

    // Profily – vlastník nebo admin
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read, write: if isAdmin();
    }

    // Žebříček – čtení pro všechny, zápis vlastník nebo admin
    match /leaderboard/{userId} {
      allow read: if true;
      allow write: if request.auth != null &&
                      (request.auth.uid == userId || isAdmin());
    }

    // Usernames – čtení pro přihlášené, mazání pro admina
    match /usernames/{username} {
      allow read:   if request.auth != null;
      allow create: if request.auth != null;
      allow delete: if isAdmin();
    }
  }
}

 POSTUP NASTAVENÍ ADMINA:
 1. Otevři Firebase Console → Firestore → Rules → vlož pravidla výše → Publish
 2. Ve Firestore → Data → vytvoř kolekci "admins"
 3. Přidej dokument s ID = tvůj UID (zobrazí se ti v admin panelu při prvním otevření)
 4. Dokument může být prázdný nebo mít pole např. { "name": "Jan" }
 5. Hotovo – panel načte všechny profily.
*/
