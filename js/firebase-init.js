'use strict';
// ═══════════════════════════════════════════
//  FIREBASE KONFIGURACE
//  František Hrubeš Simulator 2026
// ═══════════════════════════════════════════
//
//  SETUP:
//  1. Jdi na https://console.firebase.google.com
//  2. Vytvoř projekt "hrubes-simulator"
//  3. Přidej Web app → zkopíruj firebaseConfig
//  4. Vlož config níže (přepiš placeholder hodnoty)
//  5. V Firebase konzoli:
//     – Build → Firestore Database → Create database (europe-west3, test mode)
//     – Build → Authentication → Email/Password → Enable
//  6. Nastav Firestore Rules (viz README nebo komentář níže)
//
// ═══════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCTBUbLe7mNGL2plMzCpOVbYYsWB-blhF4",
  authDomain:        "hrubes-simulator-28adc.firebaseapp.com",
  projectId:         "hrubes-simulator-28adc",
  storageBucket:     "hrubes-simulator-28adc.firebasestorage.app",
  messagingSenderId: "787033070737",
  appId:             "1:787033070737:web:5f83a0f1aa23db9eb37330"
};

// ─── Detekce konfigurace ──────────────────────────────────────────────────────
const FB_CONFIGURED = FIREBASE_CONFIG.apiKey !== "VLOZ_SVUJ_API_KEY";

let fbAuth = null;
let fbDb   = null;

if (FB_CONFIGURED) {
  try {
    const app = firebase.initializeApp(FIREBASE_CONFIG);
    fbAuth = firebase.auth();
    fbDb   = firebase.firestore();
    fbDb.settings({ ignoreUndefinedProperties: true });
    console.log('[Firebase] Inicializováno ✓ – online mód');
  } catch(e) {
    console.error('[Firebase] Chyba inicializace:', e.message);
  }
} else {
  console.warn('[Firebase] Není nakonfigurováno – funguje v OFFLINE módu (localStorage).');
  console.warn('[Firebase] Vyplň FIREBASE_CONFIG v js/firebase-init.js pro online funkce.');
}

// ─── FIRESTORE PRAVIDLA (vlož do Firebase Console → Firestore → Rules) ────────
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Profil – jen vlastník může číst/psát
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Žebříček – čtení pro všechny, zápis jen vlastník
    match /leaderboard/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
*/
