'use strict';
// ═══════════════════════════════════════════
//  PROFIL HRÁČE – Firebase (online) + localStorage (offline fallback)
//  František Hrubeš Simulator 2026
// ═══════════════════════════════════════════

const ART_DEFS_DISPLAY = [
  { key:'c2_cert',         emoji:'📜', name:'C2 Cert.',         desc:'Zfalšovaný certifikát C2 z angličtiny. Mistrovské dílo byrokracie.',         img:'img/cert_c2.png' },
  { key:'milan_phone',     emoji:'📲', name:'Tel. Milan',        desc:'Milanův telefon. Plný důkazů, které by Figurovou pohřbily.' },
  { key:'podprsenka',      emoji:'👙', name:'Janina podprsenka', desc:'Janina podprsenka. Dala ti ji za odvahu. Vzácný artefakt.' },
  { key:'klice_vila',      emoji:'🔑', name:'Klíče od vily',     desc:'Klíče od Johnnyho vily. Teď se tam dostaneš kdykoliv.' },
  { key:'klice_fabie',     emoji:'🔑', name:'Fábie',             desc:'Klíčky od Fandovy staré Fábie. Nasedni a vypadni z Křemže.' },
  { key:'saman_hlava',     emoji:'🩸', name:'Šam. hlava',        desc:'Šamanova hlava. Celá od krve. Proč ji vlastně máš?' },
  { key:'maturita',        emoji:'🏆', name:'Maturita',          desc:'Maturitní vysvědčení. Konečně. I Křemže má svůj Harvard.',                   img:'img/maturita.png' },
  { key:'foto_figurova',   emoji:'📸', name:'Fotka Fig.',        desc:'Fotografie Figurové v Mikulášově sklepě. Trochu morbidní, ale co naplat.' },
  { key:'membership_vaza', emoji:'💳', name:'Vaza Systems',      desc:'Vaza Systems membership kartička. Ultimátní členství – neomezený počet webů.' },
  { key:'webovky',         emoji:'🌐', name:'Webovky od Johnnyho', desc:'Fanta Hrubeš – osobní web. Navržen Johnnym za nula korun. Otevřít?', url:'https://fanta-hrubes.webnode.cz/' },
  { key:'kgb_detector',   emoji:'🔍', name:'KGB Detektor',         desc:'Cibulkův detektor KGB/GRU agentů. Dvacet let práce v garáži. Odhalil Krejčí.' },
  { key:'klic_supliku',   emoji:'🗝️', name:'Klíček od šuplíku',    desc:'Malý klíček od šuplíku v Cibulkově tajné laboratoři. Pája ho dostal s nějakým motivem.' },
];

const PROFILE_STORAGE_KEY = 'kremze_profiles';
const ACTIVE_PROFILE_KEY  = 'kremze_active_profile';

let activeProfile = null;

// Fake email pro Firebase Auth (hra používá username, ne email)
function toFakeEmail(username){
  return username.toLowerCase().replace(/[^a-z0-9]/g,'_') + '@hrubessim.game';
}

// ─── Vytvoření prázdného profilu ──────────────────────────────────────────────

function createBlankProfile(username){
  return {
    username,
    displayName: username,
    avatar: '🤙',
    createdAt: new Date().toISOString(),
    lastPlayed: null,

    stats: {
      totalGames:   0,
      totalDeaths:  0,
      totalWins:    0,
      totalPlaytime: 0,
      bestRep:      0,
      mostMoney:    0,
      fastestWin:   null,
      totalKratom:  0,
      killCount:    0,
    },

    artifacts: {
      screenshot:       false,
      hlasovka:         false,
      c2_cert:          false,
      voodoo:           false,
      fig_nuz:          false,
      fig_gun:          false,
      milan_phone:      false,
      zelizka:          false,
      podprsenka:       false,
      klice_vila:       false,
      pytel_cihalova:   false,
      klice_fabie:      false,
      saman_hlava:      false,
      maturita:         false,
      cibule:           false,
      membership_vaza:  false,
      foto_figurova:    false,
      webovky:          false,
      kgb_detector:     false,
      klic_supliku:     false,
    },

    endings: {
      win_fabie:                  false,
      death_energy:               false,
      death_kratom_od:            false,
      death_piko:                 false,
      death_cihalova:             false,
      death_stab:                 false,
      death_saman_throat:         false,
      death_figurova_shootout:    false,
      death_johnny_shot:          false,
      death_jana_katana:          false,
    },

    questsCompleted: {
      main_money:             false,
      main_rep:               false,
      main_cihalova:          false,
      side_krejci:            false,
      side_figurova:          false,
      side_jana:              false,
      side_johnny:            false,
      side_paja:              false,
      side_honza_ukol:        false,
      quest_cihalova_burn:    false,
      quest_honza_cibule:     false,
      side_bezdak_cibule:     false,
      quest_kgb:              false,
      quest_milan_protiutok:  false,
      quest_figurova_vyres:   false,
      quest_mraz:             false,
      quest_figurova_mates:   false,
      quest_figurova_milan:   false,
      quest_fabie:            false,
      quest_platenikova:      false,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  OFFLINE (localStorage) implementace
// ═══════════════════════════════════════════════════════════════════════════════

function hashPassword(pw){
  let h = 0;
  for(let i = 0; i < pw.length; i++){
    h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
  }
  return 'h_' + Math.abs(h).toString(36);
}

function getAllProfilesLocal(){
  try { return JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY)) || {}; }
  catch(e){ return {}; }
}

function saveAllProfilesLocal(profiles){
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
}

function profileRegisterLocal(username, password){
  username = username.trim();
  if(!username || username.length < 2) return { ok:false, msg:'Jméno musí mít alespoň 2 znaky.' };
  if(username.length > 20) return { ok:false, msg:'Jméno je příliš dlouhé (max 20).' };
  if(!password || password.length < 3) return { ok:false, msg:'Heslo musí mít alespoň 3 znaky.' };

  const profiles = getAllProfilesLocal();
  const key = username.toLowerCase();
  if(profiles[key]) return { ok:false, msg:'Toto jméno je už zabrané.' };

  const profile = createBlankProfile(username);
  profile.passwordHash = hashPassword(password);
  profiles[key] = profile;
  saveAllProfilesLocal(profiles);
  activeProfile = profile;
  localStorage.setItem(ACTIVE_PROFILE_KEY, key);
  return { ok:true };
}

function profileLoginLocal(username, password){
  username = username.trim();
  if(!username) return { ok:false, msg:'Zadej uživatelské jméno.' };
  if(!password)  return { ok:false, msg:'Zadej heslo.' };

  const profiles = getAllProfilesLocal();
  const key = username.toLowerCase();
  const profile = profiles[key];
  if(!profile) return { ok:false, msg:'Profil nenalezen.' };
  if(profile.passwordHash !== hashPassword(password)) return { ok:false, msg:'Špatné heslo.' };

  activeProfile = profile;
  localStorage.setItem(ACTIVE_PROFILE_KEY, key);
  return { ok:true };
}

function profileSaveProgressLocal(){
  if(!activeProfile) return;
  const profiles = getAllProfilesLocal();
  const key = activeProfile.username.toLowerCase();
  activeProfile.lastPlayed = new Date().toISOString();
  profiles[key] = activeProfile;
  saveAllProfilesLocal(profiles);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ONLINE (Firebase) implementace
// ═══════════════════════════════════════════════════════════════════════════════

async function profileRegisterFirebase(username, password){
  username = username.trim();
  if(!username || username.length < 2) return { ok:false, msg:'Jméno musí mít alespoň 2 znaky.' };
  if(username.length > 20) return { ok:false, msg:'Jméno je příliš dlouhé (max 20).' };
  if(!password || password.length < 3) return { ok:false, msg:'Heslo musí mít alespoň 3 znaky.' };

  // Zkontroluj zda username není obsazené
  try {
    const snap = await fbDb.collection('usernames').doc(username.toLowerCase()).get();
    if(snap.exists) return { ok:false, msg:'Toto jméno je už zabrané.' };
  } catch(e){
    return { ok:false, msg:'Chyba připojení: ' + e.message };
  }

  try {
    const email = toFakeEmail(username);
    const cred  = await fbAuth.createUserWithEmailAndPassword(email, password);
    const uid   = cred.user.uid;

    const profile = createBlankProfile(username);

    // Ulož profil + rezervuj username
    const batch = fbDb.batch();
    batch.set(fbDb.collection('profiles').doc(uid), profile);
    batch.set(fbDb.collection('usernames').doc(username.toLowerCase()), { uid });
    await batch.commit();

    activeProfile = profile;
    activeProfile._uid = uid;
    return { ok:true };
  } catch(e){
    const msgs = {
      'auth/email-already-in-use': 'Toto jméno je už zabrané.',
      'auth/weak-password':        'Heslo je příliš slabé (min. 6 znaků pro Firebase).',
      'auth/invalid-email':        'Neplatný formát jména.',
      'auth/network-request-failed': 'Chyba sítě – zkontroluj připojení.',
    };
    return { ok:false, msg: msgs[e.code] || e.message };
  }
}

async function profileLoginFirebase(username, password){
  username = username.trim();
  if(!username) return { ok:false, msg:'Zadej uživatelské jméno.' };
  if(!password)  return { ok:false, msg:'Zadej heslo.' };

  try {
    const email = toFakeEmail(username);
    const cred  = await fbAuth.signInWithEmailAndPassword(email, password);
    const uid   = cred.user.uid;

    const snap = await fbDb.collection('profiles').doc(uid).get();
    if(!snap.exists){
      return { ok:false, msg:'Profil nenalezen v databázi.' };
    }

    activeProfile = snap.data();
    activeProfile._uid = uid;
    return { ok:true };
  } catch(e){
    const msgs = {
      'auth/user-not-found':   'Profil nenalezen.',
      'auth/wrong-password':   'Špatné heslo.',
      'auth/invalid-email':    'Neplatné uživatelské jméno.',
      'auth/invalid-credential': 'Špatné jméno nebo heslo.',
      'auth/network-request-failed': 'Chyba sítě – zkontroluj připojení.',
      'auth/too-many-requests': 'Příliš mnoho pokusů. Zkus to za chvíli.',
    };
    return { ok:false, msg: msgs[e.code] || e.message };
  }
}

function makeLbAvatar(src){
  if(!src) return null;
  if(!src.startsWith('data:')) return src; // emoji nebo URL – použij přímo
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 48;
      c.getContext('2d').drawImage(img, 0, 0, 48, 48);
      res(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => res(null);
    img.src = src;
  });
}

async function profileSaveProgressFirebase(){
  if(!activeProfile || !activeProfile._uid) return;
  const uid = activeProfile._uid;

  // Sestav leaderboard záznam
  const DISPLAY_ART_KEYS = ['c2_cert','milan_phone','podprsenka','klice_vila','klice_fabie','saman_hlava','maturita','foto_figurova','membership_vaza','webovky'];
  const totalArtifacts = DISPLAY_ART_KEYS.filter(k => activeProfile.artifacts[k]).length;
  const totalEndings   = Object.values(activeProfile.endings).filter(Boolean).length;
  const lbAvatar = await makeLbAvatar(activeProfile.avatar) || getProfileTier(activeProfile).emoji;
  const lb = {
    username:       activeProfile.username,
    mostMoney:      activeProfile.stats.mostMoney    || 0,
    bestRep:        activeProfile.stats.bestRep      || 0,
    totalWins:      activeProfile.stats.totalWins    || 0,
    totalArtifacts: totalArtifacts,
    totalEndings:   totalEndings,
    fastestWin:     activeProfile.stats.fastestWin   || null,
    killCount:      activeProfile.stats.killCount    || 0,
    totalKratom:    activeProfile.stats.totalKratom  || 0,
    tier:           getProfileTier(activeProfile).emoji,
    avatar:         lbAvatar,
    displayName:    activeProfile.displayName || activeProfile.username,
    updatedAt:      firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    const batch = fbDb.batch();
    // Ulož profil (bez _uid – to je jen lokální)
    const profileData = Object.assign({}, activeProfile);
    delete profileData._uid;
    profileData.lastPlayed = new Date().toISOString();
    batch.set(fbDb.collection('profiles').doc(uid), profileData);
    // Ulož/aktualizuj žebříček
    batch.set(fbDb.collection('leaderboard').doc(uid), lb);
    await batch.commit();
  } catch(e){
    console.warn('[Firebase] Save failed:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UNIFIED API – volá se z hry
// ═══════════════════════════════════════════════════════════════════════════════

async function profileRegister(username, password){
  if(FB_CONFIGURED) return profileRegisterFirebase(username, password);
  return profileRegisterLocal(username, password);
}

async function profileLogin(username, password){
  if(FB_CONFIGURED) return profileLoginFirebase(username, password);
  return profileLoginLocal(username, password);
}

// ─── Sdílená logika výpočtu statistik (stejná pro oba módy) ──────────────────

function _computeStats(){
  if(!activeProfile) return;
  const s = activeProfile.stats;

  s.totalGames++;
  s.totalPlaytime += gs.ts > 0 ? Math.floor(gs.ts / 1000) : 0;
  s.bestRep   = Math.max(s.bestRep,   gs.rep);
  s.mostMoney = Math.max(s.mostMoney, gs.money);

  if(gs.story.kratom_used){
    const totalDosed = gs.kratom_history.reduce((a,b) => a + b.dose, 0);
    s.totalKratom += totalDosed;
  }

  if(gs.story.murder_mates) s.killCount = Math.max(s.killCount, 1);
  if(gs.story.murder_milan) s.killCount = Math.max(s.killCount, 2);

  // Artefakty
  const artMap = {
    screenshot:'screenshot', hlasovka:'hlasovka',
    c2_cert:'c2_cert', voodoo:'voodoo', fig_nuz:'fig_nuz', fig_gun:'fig_gun',
    milan_phone:'milan_phone', zelizka:'zelizka', podprsenka:'podprsenka',
    klice_vila:'klice_vila', klice_fabie:'klice_fabie', saman_hlava:'saman_hlava',
    membership_vaza:'membership_vaza', cibule:'cibule',
    klic_supliku:'klic_supliku', kgb_detector:'kgb_detector',
    maturita:'maturita', foto_figurova:'foto_figurova',
  };
  for(const [invKey, artKey] of Object.entries(artMap)){
    if(gs.inv[invKey] > 0) activeProfile.artifacts[artKey] = true;
  }
  if(gs.cihalova_in_bag) activeProfile.artifacts.pytel_cihalova = true;

  // Questy
  if(gs.objectives){
    for(const obj of gs.objectives){
      if(obj.done && activeProfile.questsCompleted.hasOwnProperty(obj.id)){
        activeProfile.questsCompleted[obj.id] = true;
      }
    }
  }
}

async function profileSaveProgress(){
  if(!activeProfile) return;
  _computeStats();
  if(FB_CONFIGURED) await profileSaveProgressFirebase();
  else profileSaveProgressLocal();
}

async function profileSaveWin(){
  if(!activeProfile) return;
  activeProfile.stats.totalWins++;
  activeProfile.endings.win_fabie = true;
  const timeSec = gs.ts > 0 ? Math.floor(gs.ts / 1000) : 0;
  if(!activeProfile.stats.fastestWin || timeSec < activeProfile.stats.fastestWin){
    activeProfile.stats.fastestWin = timeSec;
  }
  await profileSaveProgress();
}

async function profileSaveDeath(deathType){
  if(!activeProfile) return;
  activeProfile.stats.totalDeaths++;
  if(deathType && activeProfile.endings.hasOwnProperty(deathType)){
    activeProfile.endings[deathType] = true;
  }
  await profileSaveProgress();
}

// ─── Úprava profilu ───────────────────────────────────────────────────────────

async function updateProfile(changes){
  // changes = { displayName, avatar }
  if(!activeProfile) return { ok:false, msg:'Nejsi přihlášen.' };

  if(changes.displayName !== undefined){
    const dn = changes.displayName.trim();
    if(dn.length < 1)  return { ok:false, msg:'Jméno nesmí být prázdné.' };
    if(dn.length > 24) return { ok:false, msg:'Jméno je příliš dlouhé (max 24).' };
    activeProfile.displayName = dn;
  }
  if(changes.avatar !== undefined){
    activeProfile.avatar = changes.avatar;
  }

  // Ulož
  if(FB_CONFIGURED && activeProfile._uid){
    try {
      await fbDb.collection('profiles').doc(activeProfile._uid).update({
        displayName: activeProfile.displayName,
        avatar: activeProfile.avatar,
      });
      const lbAvatar = await makeLbAvatar(activeProfile.avatar) || getProfileTier(activeProfile).emoji;
      await fbDb.collection('leaderboard').doc(activeProfile._uid).set({
        displayName: activeProfile.displayName,
        avatar: lbAvatar,
      }, { merge: true });
    } catch(e){
      console.warn('[Firebase] updateProfile failed:', e.message);
    }
  } else {
    const profiles = getAllProfilesLocal();
    const key = activeProfile.username.toLowerCase();
    profiles[key] = activeProfile;
    saveAllProfilesLocal(profiles);
  }
  return { ok:true };
}

// ─── Export / Import ──────────────────────────────────────────────────────────

function profileExport(){
  if(!activeProfile) return;
  const data = JSON.stringify(activeProfile, null, 2);
  const blob = new Blob([data], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `hrubes_profil_${activeProfile.username}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function profileImport(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e){
      try {
        const data = JSON.parse(e.target.result);
        if(!data.username) { reject('Neplatný soubor profilu.'); return; }
        if(!FB_CONFIGURED){
          // Offline: ulož do localStorage
          const profiles = getAllProfilesLocal();
          profiles[data.username.toLowerCase()] = data;
          saveAllProfilesLocal(profiles);
          activeProfile = data;
          localStorage.setItem(ACTIVE_PROFILE_KEY, data.username.toLowerCase());
        } else {
          // Online: jen lokálně nastav, neuložíme do Firebase (bez ověření)
          activeProfile = data;
        }
        resolve(data);
      } catch(err){
        reject('Soubor nelze přečíst: ' + err.message);
      }
    };
    reader.onerror = () => reject('Chyba čtení souboru.');
    reader.readAsText(file);
  });
}

// ─── Smazání profilu ──────────────────────────────────────────────────────────

async function profileDelete(username, password){
  if(FB_CONFIGURED){
    // Firebase: znovu přihlas a smaž
    const email = toFakeEmail(username);
    try {
      await fbAuth.signInWithEmailAndPassword(email, password);
      const uid = fbAuth.currentUser.uid;
      // Smaž data z Firestore
      const batch = fbDb.batch();
      batch.delete(fbDb.collection('profiles').doc(uid));
      batch.delete(fbDb.collection('leaderboard').doc(uid));
      batch.delete(fbDb.collection('usernames').doc(username.toLowerCase()));
      await batch.commit();
      // Smaž Auth účet
      await fbAuth.currentUser.delete();
      activeProfile = null;
      return { ok:true };
    } catch(e){
      return { ok:false, msg: e.message };
    }
  } else {
    const profiles = getAllProfilesLocal();
    const key = username.toLowerCase();
    const profile = profiles[key];
    if(!profile) return { ok:false, msg:'Profil nenalezen.' };
    if(profile.passwordHash !== hashPassword(password)) return { ok:false, msg:'Špatné heslo.' };
    delete profiles[key];
    saveAllProfilesLocal(profiles);
    if(activeProfile && activeProfile.username.toLowerCase() === key){
      activeProfile = null;
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
    return { ok:true };
  }
}

function profileLogout(){
  activeProfile = null;
  if(FB_CONFIGURED && fbAuth.currentUser) fbAuth.signOut().catch(()=>{});
  else localStorage.removeItem(ACTIVE_PROFILE_KEY);

  document.getElementById('home-ov').classList.remove('on');
  document.getElementById('login-ov').classList.remove('hidden');
}

// ─── Auto-login ───────────────────────────────────────────────────────────────

function checkAutoLogin(onFound){
  if(FB_CONFIGURED){
    // Firebase persistence handles it via onAuthStateChanged
    fbAuth.onAuthStateChanged(async user => {
      if(user){
        try {
          const snap = await fbDb.collection('profiles').doc(user.uid).get();
          if(snap.exists){
            activeProfile = snap.data();
            activeProfile._uid = user.uid;
            if(onFound) onFound();
            return;
          }
        } catch(e){ console.warn('[Firebase] Auto-login load error:', e.message); }
      }
      // Žádný user – zobraz login
    });
  } else {
    const key = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if(key){
      const profiles = getAllProfilesLocal();
      if(profiles[key]){
        activeProfile = profiles[key];
        if(onFound) onFound();
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ŽEBŘÍČEK
// ═══════════════════════════════════════════════════════════════════════════════

const LB_CATEGORIES = [
  { key:'mostMoney',      label:'💰 Peníze',    format: v => v + ' Kč'  },
  { key:'bestRep',        label:'⭐ REP',        format: v => v + ''     },
  { key:'totalWins',      label:'👑 Výhry',      format: v => v + 'x'    },
  { key:'totalArtifacts', label:'🎒 Artefakty',  format: v => v + ' / 10'},
  { key:'totalEndings',   label:'💀 Endingy',    format: v => v + ' / 8' },
  { key:'fastestWin',     label:'⚡ Rychlost',   format: v => v ? formatPlaytime(v) : '—', asc: true },
  { key:'killCount',      label:'🗡️ Zabití',     format: v => v + ''     },
  { key:'totalKratom',    label:'🌿 Kratom',     format: v => v + 'g'    },
];

let lbCurrentSort = 'mostMoney';

async function loadLeaderboard(sortKey){
  sortKey = sortKey || lbCurrentSort;
  lbCurrentSort = sortKey;

  const listEl = document.getElementById('lb-list');
  if(!listEl) return;

  if(!FB_CONFIGURED){
    listEl.innerHTML = '<div class="lb-offline">🔌 Žebříček vyžaduje online mód.<br><small>Nastav Firebase v js/firebase-init.js</small></div>';
    return;
  }

  listEl.innerHTML = '<div class="lb-loading">Načítám žebříček...</div>';

  try {
    const cat = LB_CATEGORIES.find(c => c.key === sortKey);
    const dir = cat && cat.asc ? 'asc' : 'desc';

    let q = fbDb.collection('leaderboard').orderBy(sortKey, dir).limit(25);
    // Pro fastestWin filtruj null hodnoty
    if(sortKey === 'fastestWin'){
      q = fbDb.collection('leaderboard')
               .where('fastestWin', '!=', null)
               .orderBy('fastestWin', 'asc')
               .limit(25);
    }

    const snap = await q.get();
    const rows = [];
    snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
    renderLeaderboard(rows, sortKey);
  } catch(e){
    listEl.innerHTML = '<div class="lb-offline">Chyba načítání: ' + e.message + '</div>';
  }
}

function renderLeaderboard(rows, sortKey){
  const listEl = document.getElementById('lb-list');
  if(!listEl) return;

  const cat = LB_CATEGORIES.find(c => c.key === sortKey);
  const currentUid = FB_CONFIGURED && fbAuth.currentUser ? fbAuth.currentUser.uid : null;

  if(rows.length === 0){
    listEl.innerHTML = '<div class="lb-offline">Zatím nikdo nehrál. Buď první!</div>';
    return;
  }

  const rankEmojis = ['🥇','🥈','🥉'];

  listEl.innerHTML = rows.map((r, i) => {
    const isMe = currentUid && r.id === currentUid;
    const val  = cat ? cat.format(r[sortKey] != null ? r[sortKey] : 0) : r[sortKey];
    const rank = rankEmojis[i] || ('#' + (i + 1));
    const avatarSrc = r.avatar || r.tier || '🤙';
    const avatarHtml = avatarSrc.startsWith('data:')
      ? `<img class="lb-avatar-img" src="${avatarSrc}" alt="avatar"/>`
      : `<span class="lb-avatar">${avatarSrc}</span>`;
    const displayName = escHtml(r.displayName || r.username || '???');
    return `<div class="lb-row${isMe ? ' lb-me' : ''}">
      <span class="lb-rank">${rank}</span>
      ${avatarHtml}
      <span class="lb-name">${displayName}</span>
      <span class="lb-val">${val}</span>
    </div>`;
  }).join('');
}

function escHtml(str){
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function initLeaderboardFilters(){
  const wrap = document.getElementById('lb-filters');
  if(!wrap) return;
  wrap.innerHTML = '';
  LB_CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'lb-filter' + (cat.key === lbCurrentSort ? ' active' : '');
    btn.textContent = cat.label;
    btn.dataset.sort = cat.key;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadLeaderboard(cat.key);
    });
    wrap.appendChild(btn);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RENDER HOMESCREEN
// ═══════════════════════════════════════════════════════════════════════════════

function formatPlaytime(sec){
  if(!sec) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if(h > 0) return h + 'h ' + m + 'm';
  if(m > 0) return m + 'm ' + s + 's';
  return s + 's';
}

function animateCountUp(el, target, duration, suffix){
  suffix = suffix || '';
  const startTime = performance.now();
  function tick(now){
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    el.textContent = Math.round(target * ease) + suffix;
    if(progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function animateRing(unlocked, total){
  const ring = document.getElementById('hs-ring-fg');
  if(!ring) return;
  const circumference = 2 * Math.PI * 34;
  const target = total > 0 ? ((total - unlocked) / total) * circumference : circumference;
  ring.style.strokeDasharray  = circumference;
  ring.style.strokeDashoffset = circumference;
  setTimeout(() => { ring.style.strokeDashoffset = target; }, 100);
}

function getProfileTier(p){
  const w = p.stats.totalWins;
  const g = p.stats.totalGames;
  if(w >= 10) return { emoji:'👹', title:'Absolutní degenerát' };
  if(w >= 5)  return { emoji:'💀', title:'Křemžský boss' };
  if(w >= 3)  return { emoji:'🔥', title:'Místní legenda' };
  if(w >= 1)  return { emoji:'👑', title:'Frajer' };
  if(g >= 10) return { emoji:'🎭', title:'Věčný looser' };
  if(g >= 5)  return { emoji:'💊', title:'Pokusný králík' };
  if(g >= 1)  return { emoji:'🤙', title:'Začátečník' };
  return { emoji:'🌱', title:'Nováček' };
}

function renderProfileHome(){
  const p = activeProfile;
  if(!p) return;

  const tier = getProfileTier(p);
  // Avatar: buď vlastní (emoji / base64 obrázek), nebo tier emoji
  const avatarEl = document.getElementById('hs-avatar');
  const avatarVal = p.avatar || tier.emoji;
  if(avatarVal.startsWith('data:')){
    avatarEl.textContent = '';
    avatarEl.style.backgroundImage = `url(${avatarVal})`;
    avatarEl.style.backgroundSize = 'cover';
    avatarEl.style.backgroundPosition = 'center';
    avatarEl.style.fontSize = '0';
  } else {
    avatarEl.textContent = avatarVal;
    avatarEl.style.backgroundImage = '';
    avatarEl.style.fontSize = '';
  }
  document.getElementById('hs-title').textContent   = tier.title;
  document.getElementById('hs-username').textContent = p.displayName || p.username;

  const DUR = 1200;
  setTimeout(() => animateCountUp(document.getElementById('hs-games'),    p.stats.totalGames,  DUR), 100);
  setTimeout(() => animateCountUp(document.getElementById('hs-wins'),     p.stats.totalWins,   DUR), 180);
  setTimeout(() => animateCountUp(document.getElementById('hs-deaths'),   p.stats.totalDeaths, DUR), 260);
  document.getElementById('hs-playtime').textContent = formatPlaytime(p.stats.totalPlaytime);
  setTimeout(() => animateCountUp(document.getElementById('hs-best-rep'), p.stats.bestRep,     DUR), 340);
  document.getElementById('hs-money').textContent   = p.stats.mostMoney + ' Kč';
  document.getElementById('hs-kratom').textContent  = p.stats.totalKratom + 'g';
  setTimeout(() => animateCountUp(document.getElementById('hs-kills'),    p.stats.killCount,   DUR), 420);
  document.getElementById('hs-fastest').textContent = p.stats.fastestWin ? formatPlaytime(p.stats.fastestWin) : '—';

  // Online badge
  const badge = document.getElementById('hs-online-badge');
  if(badge) badge.style.display = FB_CONFIGURED ? 'flex' : 'none';

  // Artefakty
  const artC = document.getElementById('hs-artifacts');
  artC.innerHTML = '';
  ART_DEFS_DISPLAY.forEach((a, i) => {
    const unlocked = p.artifacts[a.key];
    const d = document.createElement('div');
    d.className = 'hs-art' + (unlocked ? '' : ' locked');
    d.style.animationDelay = (i * 60) + 'ms';
    d.innerHTML = `<span class="hs-art-emoji">${unlocked ? a.emoji : '?'}</span><span class="hs-art-name">${unlocked ? a.name : '???'}</span>`;
    if(unlocked) d.addEventListener('click', () => showArtDetail(a.emoji, a.name, a.desc, a.url, a.img, a.audio));
    artC.appendChild(d);
  });

  // Endingy
  const endDefs = [
    { key:'win_fabie',                  emoji:'🚗', name:'Odjel Fábií' },
    { key:'death_energy',               emoji:'💀', name:'Smrt hladem' },
    { key:'death_kratom_od',            emoji:'🌿', name:'Předávkování' },
    { key:'death_piko',                 emoji:'💊', name:'Piko sebevražda' },
    { key:'death_cihalova',             emoji:'🔫', name:'Popravila Číhalová' },
    { key:'death_stab',                 emoji:'🔪', name:'Bodnutí' },
    { key:'death_saman_throat',         emoji:'🩸', name:'Podříznut šamanem' },
    { key:'death_figurova_shootout',    emoji:'💥', name:'Hospitace masakr' },
    { key:'death_johnny_shot',          emoji:'🔫', name:'Zastřelen Johnnym' },
    { key:'death_jana_katana',          emoji:'⚔️', name:'Rozsekán Katanou' },
  ];
  const endC = document.getElementById('hs-endings');
  endC.innerHTML = '';
  let unlockedEndings = 0;
  endDefs.forEach((e, i) => {
    const unlocked = p.endings[e.key];
    if(unlocked) unlockedEndings++;
    const d = document.createElement('div');
    d.className = 'hs-ending' + (unlocked ? '' : ' locked');
    d.style.animationDelay = (i * 80) + 'ms';
    d.innerHTML = `<span class="hs-end-emoji">${unlocked ? e.emoji : '?'}</span><span class="hs-end-name">${unlocked ? e.name : '???'}</span>`;
    endC.appendChild(d);
  });
  document.getElementById('hs-ending-count').textContent = unlockedEndings + ' / ' + endDefs.length;
  animateRing(unlockedEndings, endDefs.length);

  // Questy
  renderProfileQuests(p);
}

function renderProfileQuests(p){
  const questDefs = [
    { id:'main_money',            tag:'Hlavní',    name:'Vydělej 2 000 Kč' },
    { id:'main_rep',              tag:'Hlavní',    name:'Dosáhni 90 reputace' },
    { id:'main_cihalova',         tag:'Hlavní',    name:'Zásilka pro Číhalovou' },
    { id:'side_krejci',           tag:'Vedlejší',  name:'Zjisti, kdo vydírá Krejčí' },
    { id:'side_figurova',         tag:'Šedá zóna', name:'Špehovat Milana pro Figurovou' },
    { id:'side_jana',             tag:'Vedlejší',  name:'Dones Janě 20g kratomu' },
    { id:'side_johnny',           tag:'Byznys',    name:'Domluvit Johnnymu rande' },
    { id:'side_paja',             tag:'Vedlejší',  name:'Založit Páju na Betanu' },
    { id:'side_honza_ukol',       tag:'Vedlejší',  name:'Zařídit Honzovi komot' },
    { id:'quest_cihalova_burn',   tag:'Tajné',     name:'Zbav se Číhalové v krbu' },
    { id:'quest_honza_cibule',    tag:'Tajné',     name:'Vyzvednout odměnu od Honzy' },
    { id:'side_bezdak_cibule',    tag:'Záhadné',   name:'Co chce bezďák s cibulí?' },
    { id:'quest_kgb',             tag:'Minihra',   name:'Postřílet agenty KGB a GRU' },
    { id:'quest_milan_protiutok', tag:'Tajné',     name:'Sabotovat Figurovou pro Milana' },
    { id:'quest_figurova_vyres',  tag:'Tajné',     name:'Vyřeš situaci s Figurovou' },
    { id:'quest_mraz',            tag:'Démonické', name:'Vyřiď Mrázův osud' },
    { id:'quest_figurova_mates',  tag:'Temné',     name:'Zlikviduj Matese' },
    { id:'quest_figurova_milan',  tag:'Temné',     name:'Zlikviduj Milana' },
    { id:'quest_fabie',           tag:'Hlavní',    name:'Získej Fábii a jeď domů' },
    { id:'quest_platenikova',     tag:'Speciální', name:'Řekni Pláteníkové pravdu' },
  ];
  const qC = document.getElementById('hs-quests');
  qC.innerHTML = '';
  questDefs.forEach((q, i) => {
    const done = p.questsCompleted[q.id];
    const d = document.createElement('div');
    d.className = 'hs-quest' + (done ? ' done' : ' locked');
    d.style.animationDelay = (i * 40) + 'ms';
    d.innerHTML = done
      ? `<div class="hsq-check">✓</div><div class="hsq-name">${q.name}</div><div class="hsq-tag">${q.tag}</div>`
      : `<div class="hsq-check">?</div><div class="hsq-name">???</div><div class="hsq-tag">???</div>`;
    qC.appendChild(d);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANIMOVANÉ INTRO (jen 1× za session)
// ═══════════════════════════════════════════════════════════════════════════════

function runIntro(onDone){
  const ov = document.getElementById('intro-ov');
  if(!ov){ onDone(); return; }

  // Jednou za session
  if(sessionStorage.getItem('kremze_intro_seen')){ ov.style.display='none'; onDone(); return; }
  sessionStorage.setItem('kremze_intro_seen','1');

  ov.style.display = 'flex';

  const show = (id, delay) => setTimeout(() => {
    const el = document.getElementById(id);
    if(el) el.classList.add('visible');
  }, delay);

  show('il-year',  400);
  show('il-name',  900);
  show('il-sub',  1800);
  show('il-icons',2600);
  show('il-tag',  3400);

  const finish = () => {
    ov.classList.add('intro-out');
    setTimeout(() => { ov.style.display='none'; onDone(); }, 700);
  };

  const skip = document.getElementById('intro-skip');
  if(skip) skip.addEventListener('click', finish);

  // Auto-konec po 5.2s
  setTimeout(finish, 5200);
}

// ─── Loading sekvence ─────────────────────────────────────────────────────────

function showLoadingScreen(callback){
  const ov  = document.getElementById('loading-ov');
  const bar = document.getElementById('load-bar');
  const sub = document.getElementById('load-sub');
  ov.classList.add('on');
  bar.style.width = '0%';

  const messages = ['Načítám profil...','Kontroluji artefakty...','Synchronizuji data...','Připravuji Křemži...'];
  let step = 0;
  const interval = setInterval(() => {
    step++;
    bar.style.width = Math.min((step / 20) * 100, 100) + '%';
    if(step === 5)  sub.textContent = messages[1];
    if(step === 10) sub.textContent = messages[2];
    if(step === 16) sub.textContent = messages[3];
    if(step >= 20){
      clearInterval(interval);
      setTimeout(() => { ov.classList.remove('on'); if(callback) callback(); }, 300);
    }
  }, 75);
}

function showHomescreen(){
  document.getElementById('login-ov').classList.add('hidden');
  renderProfileHome();
  document.getElementById('home-ov').classList.add('on');
  // Načti žebříček po zobrazení homescreen
  setTimeout(() => loadLeaderboard('mostMoney'), 600);
}

function hideHomescreenAndPlay(){
  document.getElementById('home-ov').classList.remove('on');
}

function returnToHomescreen(){
  ['death','win','stab-death'].forEach(id => {
    const el = document.getElementById(id);
    if(el){ el.classList.remove('on'); el.classList.remove('visible'); }
  });
  renderProfileHome();
  document.getElementById('home-ov').classList.add('on');
  setTimeout(() => loadLeaderboard('mostMoney'), 600);
}

// ─── Tab switching ────────────────────────────────────────────────────────────

function initHomeTabs(){
  document.querySelectorAll('.htab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.htab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.htab-body').forEach(b => b.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-htab');
      document.getElementById('htab-' + target).classList.add('active');
      // Lazy-load žebříčku při přepnutí na tab
      if(target === 'leaderboard') loadLeaderboard(lbCurrentSort);
    });
  });
}

function initLoginTabs(){
  document.querySelectorAll('.ltab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ltab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.ltab-body').forEach(b => b.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      document.getElementById('ltab-' + target).classList.add('active');
    });
  });
}

// ─── Init profile UI ──────────────────────────────────────────────────────────

// ─── Emoji pro picker ─────────────────────────────────────────────────────────

const AVATAR_EMOJIS = [
  '🤙','😎','🤓','😈','👹','💀','🤡','🥸','🤠','🧛','🥷','🤖','👾','🎭',
  '🦅','🐉','🐺','🦊','🐸','🦁','🐯','🦝','🐧','🦄',
  '👑','🔥','⚡','💊','🌿','🔪','🔫','💰','🍺','🚗','🏆','🎯','🎲','🃏',
  '✊','🤘','🙏','🫡','🤫','😤','🥶','🥵','😵','🫠',
];

function buildEmojiGrid(containerId, onPick, selectedVal){
  const grid = document.getElementById(containerId);
  if(!grid) return;
  grid.innerHTML = '';
  AVATAR_EMOJIS.forEach(em => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ep-emoji-btn' + (em === selectedVal ? ' selected' : '');
    btn.textContent = em;
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.ep-emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onPick(em);
    });
    grid.appendChild(btn);
  });
}

function setupAvatarUpload(fileInputId, previewId, onPick){
  const fileInput = document.getElementById(fileInputId);
  if(!fileInput) return;
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if(!file) return;
    if(file.size > 512 * 1024){
      showToast('Obrázek je příliš velký. Max 512 KB.', 'err');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      const prev = document.getElementById(previewId);
      if(prev){
        prev.textContent = '';
        prev.style.backgroundImage = `url(${dataUrl})`;
        prev.style.backgroundSize = 'cover';
        prev.style.backgroundPosition = 'center';
        prev.style.fontSize = '0';
      }
      // Odselektuj emoji
      const gridEl = prev && prev.closest('.login-field, .ep-card');
      if(gridEl) gridEl.querySelectorAll('.ep-emoji-btn').forEach(b => b.classList.remove('selected'));
      onPick(dataUrl);
    };
    reader.readAsDataURL(file);
  });
}

function setAvatarPreview(elId, val){
  const el = document.getElementById(elId);
  if(!el) return;
  if(val && val.startsWith('data:')){
    el.textContent = '';
    el.style.backgroundImage = `url(${val})`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.fontSize = '0';
  } else {
    el.textContent = val || '🤙';
    el.style.backgroundImage = '';
    el.style.fontSize = '';
  }
}

function initProfileUI(){
  initLoginTabs();
  initHomeTabs();
  initLeaderboardFilters();

  // ── Registrace: emoji picker + PNG upload ──
  let regSelectedAvatar = '🤙';
  buildEmojiGrid('reg-emoji-grid', em => {
    regSelectedAvatar = em;
    setAvatarPreview('reg-avatar-preview', em);
  }, regSelectedAvatar);
  document.getElementById('reg-avatar-upload-btn').addEventListener('click', () => {
    document.getElementById('reg-avatar-file').click();
  });
  setupAvatarUpload('reg-avatar-file', 'reg-avatar-preview', dataUrl => {
    regSelectedAvatar = dataUrl;
  });

  // ── Edit modal ──
  const epOv = document.getElementById('edit-profile-ov');
  let epSelectedAvatar = '🤙';

  document.getElementById('hs-edit-profile').addEventListener('click', () => {
    if(!activeProfile) return;
    epSelectedAvatar = activeProfile.avatar || '🤙';
    setAvatarPreview('ep-avatar-preview', epSelectedAvatar);
    buildEmojiGrid('ep-emoji-grid', em => {
      epSelectedAvatar = em;
      setAvatarPreview('ep-avatar-preview', em);
    }, epSelectedAvatar.startsWith('data:') ? null : epSelectedAvatar);
    document.getElementById('ep-displayname').value = activeProfile.displayName || activeProfile.username;
    document.getElementById('ep-err').textContent = '';
    epOv.classList.add('on');
  });

  document.getElementById('ep-close').addEventListener('click', () => {
    epOv.classList.remove('on');
  });
  epOv.addEventListener('click', e => {
    if(e.target === epOv) epOv.classList.remove('on');
  });

  document.getElementById('ep-avatar-upload-btn').addEventListener('click', () => {
    document.getElementById('ep-avatar-file').click();
  });
  setupAvatarUpload('ep-avatar-file', 'ep-avatar-preview', dataUrl => {
    epSelectedAvatar = dataUrl;
    buildEmojiGrid('ep-emoji-grid', em => {
      epSelectedAvatar = em;
      setAvatarPreview('ep-avatar-preview', em);
    }, null);
  });

  document.getElementById('ep-save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('ep-save-btn');
    btn.disabled = true; btn.textContent = '...';
    const dn = document.getElementById('ep-displayname').value;
    const res = await updateProfile({ displayName: dn, avatar: epSelectedAvatar });
    btn.disabled = false; btn.textContent = 'ULOŽIT ZMĚNY';
    if(!res.ok){ document.getElementById('ep-err').textContent = res.msg; return; }
    document.getElementById('ep-err').textContent = '';
    epOv.classList.remove('on');
    renderProfileHome();
  });

  // Login
  document.getElementById('li-btn').addEventListener('click', async () => {
    const btn  = document.getElementById('li-btn');
    const user = document.getElementById('li-user').value;
    const pass = document.getElementById('li-pass').value;
    btn.disabled = true;
    btn.textContent = '...';
    const res = await profileLogin(user, pass);
    btn.disabled = false;
    btn.textContent = 'PŘIHLÁSIT SE';
    if(!res.ok){ document.getElementById('li-err').textContent = res.msg; return; }
    document.getElementById('li-err').textContent = '';
    showLoadingScreen(showHomescreen);
  });

  ['li-user','li-pass'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if(e.key === 'Enter') document.getElementById('li-btn').click();
    });
  });

  // Register
  document.getElementById('reg-btn').addEventListener('click', async () => {
    const btn   = document.getElementById('reg-btn');
    const user  = document.getElementById('reg-user').value;
    const pass  = document.getElementById('reg-pass').value;
    const pass2 = document.getElementById('reg-pass2').value;
    if(pass !== pass2){
      document.getElementById('reg-err').textContent = 'Hesla se neshodují.';
      return;
    }
    btn.disabled = true;
    btn.textContent = '...';
    const res = await profileRegister(user, pass);
    btn.disabled = false;
    btn.textContent = 'VYTVOŘIT PROFIL';
    if(!res.ok){ document.getElementById('reg-err').textContent = res.msg; return; }
    // Ulož vybraný avatar
    if(activeProfile) activeProfile.avatar = regSelectedAvatar;
    if(FB_CONFIGURED) await profileSaveProgress(); else profileSaveProgressLocal && profileSaveProgressLocal();
    document.getElementById('reg-err').textContent = '';
    showLoadingScreen(showHomescreen);
  });

  ['reg-user','reg-pass','reg-pass2'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if(e.key === 'Enter') document.getElementById('reg-btn').click();
    });
  });

  // Export
  document.getElementById('hs-export').addEventListener('click', profileExport);

  // Logout
  document.getElementById('hs-logout').addEventListener('click', profileLogout);

  // Delete
  document.getElementById('hs-delete').addEventListener('click', async () => {
    if(!activeProfile) return;
    const confirmed = await showConfirm(
      '🗑️',
      'Smazat profil?',
      `Opravdu smazat "${activeProfile.username}"? Tato akce je nevratná.`,
      'Smazat navždy',
      'Radši ne'
    );
    if(!confirmed) return;
    const pw = await showPromptModal(
      '🔒',
      'Zadej heslo',
      'Potvrď svou totožnost heslem.',
      '••••••'
    );
    if(!pw) return;
    const res = await profileDelete(activeProfile.username, pw);
    if(!res.ok){ showToast(res.msg, 'err'); return; }
    profileLogout();
  });

  // Play – rovnou do hry (artefakty jsou v místnosti doma)
  document.getElementById('hs-play').addEventListener('click', () => {
    hideHomescreenAndPlay();
    if(typeof startGame === 'function') startGame();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UI MODAL SYSTÉM – toast / confirm / prompt (náhrada za alert/confirm/prompt)
// ═══════════════════════════════════════════════════════════════════════════════

let _uimResolve = null;

function _uimClose(){
  const ov = document.getElementById('ui-modal-ov');
  if(ov) ov.classList.remove('on');
  _uimResolve = null;
}

/**
 * showConfirm(icon, title, msg, btnYes, btnNo) → Promise<bool>
 */
function showConfirm(icon, title, msg, btnYes='Potvrdit', btnNo='Zrušit'){
  return new Promise(resolve => {
    const ov    = document.getElementById('ui-modal-ov');
    const input = document.getElementById('uim-input');
    input.style.display = 'none';
    document.getElementById('uim-icon').textContent  = icon  || '⚠️';
    document.getElementById('uim-title').textContent = title || 'Potvrď akci';
    document.getElementById('uim-msg').textContent   = msg   || '';
    const btns = document.getElementById('uim-btns');
    btns.innerHTML = '';
    const bYes = document.createElement('button');
    bYes.className = 'uim-btn danger'; bYes.textContent = btnYes;
    bYes.addEventListener('click', () => { _uimClose(); resolve(true); });
    const bNo  = document.createElement('button');
    bNo.className  = 'uim-btn secondary'; bNo.textContent = btnNo;
    bNo.addEventListener('click', () => { _uimClose(); resolve(false); });
    btns.appendChild(bNo);
    btns.appendChild(bYes);
    _uimResolve = resolve;
    ov.classList.add('on');
    bNo.focus();
  });
}

/**
 * showPromptModal(icon, title, msg, placeholder, inputType) → Promise<string|null>
 */
function showPromptModal(icon, title, msg, placeholder='', inputType='password'){
  return new Promise(resolve => {
    const ov    = document.getElementById('ui-modal-ov');
    const input = document.getElementById('uim-input');
    input.type        = inputType;
    input.placeholder = placeholder;
    input.value       = '';
    input.style.display = 'block';
    document.getElementById('uim-icon').textContent  = icon  || '🔒';
    document.getElementById('uim-title').textContent = title || 'Zadej hodnotu';
    document.getElementById('uim-msg').textContent   = msg   || '';
    const btns = document.getElementById('uim-btns');
    btns.innerHTML = '';
    const bOk  = document.createElement('button');
    bOk.className  = 'uim-btn gold'; bOk.textContent = 'Potvrdit';
    const bNo  = document.createElement('button');
    bNo.className  = 'uim-btn secondary'; bNo.textContent = 'Zrušit';
    const confirm = () => { const v = input.value; _uimClose(); resolve(v || null); };
    bOk.addEventListener('click', confirm);
    input.addEventListener('keydown', e => { if(e.key === 'Enter') confirm(); });
    bNo.addEventListener('click', () => { _uimClose(); resolve(null); });
    btns.appendChild(bNo);
    btns.appendChild(bOk);
    _uimResolve = resolve;
    ov.classList.add('on');
    setTimeout(() => input.focus(), 50);
  });
}

/**
 * showToast(msg, type) – type: 'ok' | 'err' | 'info'
 */
function showToast(msg, type='info'){
  const t = document.getElementById('ui-toast');
  if(!t) return;
  t.textContent = msg;
  t.className = 'ui-toast on ' + type;
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('on'), 3200);
}

// Klik mimo modal = zavřít (= zrušit)
document.addEventListener('DOMContentLoaded', () => {
  const ov = document.getElementById('ui-modal-ov');
  if(ov) ov.addEventListener('click', e => {
    if(e.target === ov){ _uimClose(); if(_uimResolve) _uimResolve(false); }
  });
});
