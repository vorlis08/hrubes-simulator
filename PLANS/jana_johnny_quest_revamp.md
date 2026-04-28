# PLÁN: Jana × Johnny rande quest – kompletní přepis

**Stav:** PŘIPRAVENO K IMPLEMENTACI – čeká na schválení uživatelem
**Verze:** 1.0
**Autor:** Claude Opus 4.7
**Datum:** 2026-04-28

---

## 0) MOTIVACE & CÍLE

### 0.1 Aktuální problémy
1. V hospodě hráč mluví s Janou na rande s Johnnym → tlačítko **„Pojď, jdeme odtud"** je červeně (`cls:'danger'`) → naznačuje že nic neudělá
2. Po stisknutí ve skutečnosti spustí `q_jana_rescue` ALE pak hráč může s Janou znovu promluvit, dostane **stejný dialog** (žádný stage advance) → opět iluze nicnedělání
3. **Cena rozhodnutí není znát** – kde je punishment / reward za morální volby?
4. Quest má pouze **2 jednoduché větve** (zachránit / nechat jí Johnnymu) – nuda

### 0.2 Cíle revampu
- **Jasně viditelné konsekvence** každého rozhodnutí
- **Více variací** – minimálně 5 kompletně odlišných výsledků
- **Kreativní animace** s vlastními NPC interakcemi (ruce, pohyb)
- **Nový death screen** za nejtemnější selhání
- **Reputační systém s tabulkou** - každá akce má jasný gain/loss
- **Zachovat všechny existující quest gating** (ničemu se nesmí zlomit jiný quest)

---

## 1) MASTER STATE MACHINE

### 1.1 Hlavní fáze
```
HOSPODA_PHASE (Jana na rande)
    ↓
    ├─→ A. Pojď Jano → JANA_REJECTS_PLAYER
    │       └→ pár pivních dialogů u krbu → VILLA_GHOSTED
    │           └→ -25 REP, žádný klíček, Johnny+Jana ve vile
    │
    ├─→ B. Vzít její drink → JANA_TRUSTS_PATH
    │       ├→ B.1 Bez drogy → PLAYER_NEUTRAL
    │       └→ B.2 Otrávit (po Janině toaletě) → JOHNNY_PATH
    │
    ├─→ C. Bez akce → DEFAULT
    │       (Jana s Johnnym jdou normálně domů)
    │
    └─→ D. Ihned otrávit pití (Jana je u krbu s Johnnym)
            → JANA_NOTICES → KATANA_DEATH

VILLA_PHASE (Johnny + Jana ve vile)
    ↓
    ├─→ E. Najít hadr v koupelně → BATHROOM_PLAN_AVAILABLE
    │       ├→ E.1 Dát Janě hadr (BATHROOM_PLAN)
    │       │       └→ Jana zamčená v koupelně
    │       │           ├→ E.1.a Bez drogy → BATHROOM_FLOOD → JANA_RESCUED
    │       │           └→ E.1.b Otrávit pití pak → JOHNNY_PATH (alt)
    │       │
    │       └→ E.2 Nedat Janě → BATHROOM_PLAN_UNUSED
    │
    ├─→ F. Otrávit pití bez plánu → JANA_NOTICES → KATANA_DEATH
    │
    └─→ G. Quest „Pojď Jano" branch → VILLA_GHOSTED
              (žádné možnosti, jen -25 REP po promluvě s Janou)
```

### 1.2 Outcome tabulka
| Kód | Název | REP gain | REP loss | Net | Artefakt | Endingy unlock |
|-----|-------|---------:|---------:|----:|----------|----------------|
| `OUT_RESCUE_HOSPODA` | "Pojď Jano" – odešla s hráčem | +5 | 0 | **+5** | – | – |
| `OUT_DATE_GHOSTED` | "Johnny v pohodě" – Jana k němu | 0 | -25 (villa) | **-25** | – | – |
| `OUT_FLOOD_RESCUE` | Villa: bathroom plán zachránil Janu | +18 | -10 (Johnny) | **+8** | 👙 podprsenka | – |
| `OUT_DRINK_HELP` | Villa: drug přes WC trick → Johnny path | +5 | -10 morálka | **-5** | 💳 vaza_membership | – |
| `OUT_FLOOD_DRUG` | Villa: hadr + drug → Jana usne | +5 | -20 | **-15** | 💳 vaza_membership | – |
| `OUT_KATANA_DEATH` | DEATH – Janu otrávil přímo | – | – | – | – | `death_jana_katana` |

---

## 2) BUG FIXES (před hlavní implementací)

### 2.1 Fix #1: „Pojď Jano" červeně + repeat dialog
- **Soubor:** `js/config.js`, `js/quests.js`, `js/dialog.js`
- **Aktuální stav:**
  ```js
  // dialogs[3] (jana_kosova v hospodě)
  choices:[
    {label:'Pohoda Jano, Johnnny je v pohodě', cls:'danger', fn:'close'},
    {label:'Pojď, jdeme odtud',                 cls:'prim',   fn:'q_jana_rescue'},
  ]
  ```
- **Problém:** `cls:'prim'` (zelená) je správně, ALE po `q_jana_rescue` Jana zůstává v `currentNPCs` a `getStage` ji vrací zpět na stage 3 → nekonečný loop
- **Oprava:**
  - Po `q_jana_rescue` nastavit `gs.story.jana_rescue_started = true`
  - V `getStage` přidat: `if(s.jana_rescue_started) return 5` (nový stage – Jana ne v hospodě, ale u krbu s Johnnym)
  - Přidat dialog stage 5 (níže)
  - Spustit animaci přesunu Jany ke krbu

### 2.2 Fix #2: Pája dialog repeat ✅ (už hotovo)
Hotové v této session.

---

## 3) NPC RUCE (nová mechanika)

### 3.1 Proč
Pro Janin katana útok potřebujeme zviditelnit ruce/zbraň. Aktuálně NPC je jen kruh + hlava.

### 3.2 Spec
- **Soubor:** `js/render.js` – nový rendering helper `drawNPCArms(n, t, opts)`
- **Default NPC:** ruce **nezobrazené** (zachovat retro pixel look)
- **Animační režimy přes `n.armsState`:**
  - `'hidden'` (default) – nic
  - `'idle'` – ruce při těle
  - `'pointing'` – ukázat na hráče
  - `'wielding'` – držet objekt (předmět z `n.armsItem`)
  - `'swinging'` – animace seknutí (úhel od `n.armsSwingT`)
- **Item registry** v `n.armsItem`:
  - `'katana'` – zakřivená čepel s rudou hilcí
  - `'fists'` – jen pěsti
- **Pozice ruček:** vychází z `n.x`, `n.y - n.size*15` (rameno) → délka 18px

### 3.3 Použití
- Jana v aktivních animacích
- Možno použít i pro Johnnyho v jiných scénách (rozšiřitelné)

---

## 4) NOVÉ STATE FLAGY (gs.story)

```js
// Hospoda fáze
jana_rescue_started:    false,  // hráč zvolil "Pojď Jano"
jana_at_fireplace:      false,  // Jana je u krbu s Johnnym (po rescue)
jana_drink_taken:       false,  // hráč si vzal Janin drink (do inventáře)
jana_drink_returned:    false,  // hráč drink vrátil zpět
jana_at_toilet:         false,  // Jana je teď na WC (krátké okno pro otrávení)
jana_drank_potion:      false,  // Jana se napila otráveného pití (před gauč fází)
johnny_charm_phase:     false,  // Johnny předvádí svůj „šarm"
jana_asleep_gauc:       false,  // Jana usnula na gauči (dokončení Johnny path)

// Villa fáze
villa_ghosted:          false,  // varianta po "Pojď Jano" – Johnny+Jana spolu, bez interakce
bathroom_rag_found:     false,  // hráč našel hadr v koupelně
bathroom_rag_in_inv:    false,  // hráč má hadr (gs.inv.hadr)
bathroom_plan_briefed:  false,  // hráč Janě vysvětlil plán
jana_in_bathroom_locked: false, // Jana se zamkla v koupelně
bathroom_flooding:      false,  // začala potopa
bathroom_door_broken:   false,  // Johnny prokopl dveře
johnny_in_bathroom:     false,  // Johnny je teď v koupelně
jana_handcuffed_johnny: false,  // Jana spoutala Johnnyho

// Drink + drug
drink_in_inv:           false,  // hráč drží sklenici
drink_drugged:          false,  // do drinku byl nasypán prášek
jana_noticed_drug:      false,  // Jana to zpozorovala (= death)

// Penalty timer
relationship_advice_used: false, // pro -25 REP scénu, jen jednou
```

**Inventory:**
```js
hadr: 0,   // bílý hadr z koupelnového šuplíku
sklenice_jana: 0, // Janin drink (jen 1)
katana_milan: 0, // Janina ukradená katana (jen pro animaci, neuložená v inv)
```

---

## 5) DETAILNÍ DIALOG SPEC

### 5.1 Jana_kosova – nové stages

#### Stage 5: po `q_jana_rescue` (Jana u krbu s Johnnym, „nemá zájem")
```
text: '*Jana stojí těsně u Johnnyho u krbu. Když k nim přijdeš, Jana
       vrhne přes Johnnyho rameno mrazivý pohled.* "Tohle si s tebou
       ještě vyřídím, Hrubeši." *Johnny se otočí, lehce se ušklíbne.*'
choices: [
  {label:'(Odejít)', cls:'danger', fn:'close'}
]
```
**Aktivováno:** `s.jana_rescue_started && gs.room === 'hospoda'`

#### Stage 6: ve vile po `villa_ghosted` (rescue selhal, -25 REP)
```
text: '"Hrubeš, jsem strašně naštvaná." *Jana si založí ruce na prsou*
       "Tys mi tohle dohodil. A když jsem chtěla pomoct, řekl jsi mi
       to nahlas přede všema. Ten Johnny je úplnej slizak a tys mě
       sem dotáhl. Tobě já už při výběru chlapa věřit nemůžu."'
choices: [
  {label:'(Polknout. Odejít.)', cls:'danger', fn:'q_jana_blame_player'}
]
```
**Aktivováno:** `s.villa_ghosted && !s.relationship_advice_used`
**Po stisknutí:** `gs.rep -= 25`, `s.relationship_advice_used = true`, log: „Jana ti přestala věřit. -25 REP"

#### Stage 7: po dání hadru (BATHROOM_PLAN)
```
text: '"Pánu Bohu díky, Hrubeši! Já tu zamknu. Děkuju ti." *Jana přitiskne
       ruku na tvoji.*'
choices: [
  {label:'(Pohlédnout na ni naposledy.)', cls:'prim', fn:'close'}
]
```
**Aktivováno:** `s.bathroom_plan_briefed && !s.jana_in_bathroom_locked`
**Po close:** spustit animaci přesunu Jany do koupelny (Phase 8.2)

#### Stage 8: po napití pití (drink trust)
```
text: '"Mmm, díky, Hrubeši. Aspoň jeden chlap se o mě dneska zajímá
       jak by měl." *upije velký lok* "Jsi dobrej kámoš. I když jsi
       mi ten rande tedy vybral horšího, než si dovedu představit."
       *odloží sklenici na stůl* "Zacvaknu si na záchod, jo? Hned jsem
       zpátky. Udělej mi mezitím dalšího Démona."'
choices: [
  {label:'(Vzít sklenici)', cls:'prim', fn:'q_jana_take_glass_back'}
]
```
**Aktivováno:** `s.jana_drink_taken && !s.drink_drugged && !s.jana_drank_potion && gs.room === 'johnny_vila'`

#### Stage 9: pomoc po flood (Jana si Johnnyho spoutala)
```
text: '*Jana k tobě přijde, lehce dýchá. V ruce drží Johnnyho klíče.*
       "Hrubeši. Tos byl ty. Děkuju ti, vážně. Měl ses snad ozvat
       předtím, ale tos byl ty kdo mi pomohl, když jsem tě potřebovala
       nejvíc. Tady. Podprsenka. Vím, že to zní bizarně, ale vem si ji.
       Vrátím se do Billy. Až tě uvidím, koupím ti pizzu žemli."'
choices: [
  {label:'(Vzít podprsenku)', cls:'prim', fn:'q_jana_thanks'}  // existující
]
```
**Aktivováno:** `s.jana_handcuffed_johnny`

### 5.2 Johnny_vila – nové stages

#### Stage 5: po Janině zamčení v koupelně (před povodní)
```
text: '*Johnny mrkne na zavřené dveře koupelny.* "Hele, kámo, tohle se
       mi nelíbí. Měl jsem doma už pár holek a vždycky když se zamkly
       v koupelně, tak volaly nějaké kámošce a vymýšlely výmluvy, jak
       odsud zdrhnout. Snad to není tenhle případ, jo?"'
choices: [
  {label:'"Zvláštní... Odejdu radši."', cls:'special', fn:'close'}
]
```
**Aktivováno:** `s.jana_in_bathroom_locked && !s.bathroom_flooding`

#### Stage 6: po napití Jany otráveného (Johnny dává vaza)
**EXISTUJE** – jen kontext: musí se spustit AŽ po Janině napití

#### Stage 7: během flood, Johnny kouká na vodu
```
text: '"Co to kurva...?!" *Johnny zírá na podlahu, kde se rozlévá voda
       zpod dveří.* "JANO?! JANO! OTEVŘI!"'
choices: [
  {label:'(Odejít)', cls:'danger', fn:'close'}
]
```
**Aktivováno:** `s.bathroom_flooding && !s.bathroom_door_broken`
**Auto-trigger:** Po 4 sekundách flood Johnny vystartuje a rozrazí dveře (Phase 8.3)

#### Stage 8: po spoutání Johnnyho
```
text: '"HRUBEŠ! ROZVAŽ MĚ! TY MALEJ ZMRDE! AŽ SE DOSTANU VEN, TAK..."
       *cuká s pouty, ale nedaří se mu* "ROZVAŽ MĚ KURVA!"'
choices: [
  {label:'(Pousmát se a odejít.)', cls:'special', fn:'close'}
]
```
**Aktivováno:** `s.jana_handcuffed_johnny && gs.room === 'johnny_vila'`

#### Stage 9: po Janině usnutí na gauči (Johnny path končí)
```
text: '"LEEEETS GOOOO!" *Johnny zvedne palce vzhůru, na obličeji má
       chtíčný úsměv* "Jdi domů, kámo. A nezapomeň – jsme kámoši na
       život i na smrt. Tahle jednorázovka nikdy neexistovala. Děkuju
       ti." *mrkne*'
choices: [
  {label:'(Odejít z vily)', cls:'danger', fn:'q_johnny_help_done'}
]
```
**Aktivováno:** `s.jana_asleep_gauc`
**Po close:** kompletace „johnny_help" objective, +5 REP, +💳 vaza_membership (pokud ještě nemá)

---

## 6) NOVÉ QF FUNKCE (`js/quests.js`)

```js
// ─── HOSPODA: rescue Jana ──────────────────────────────────────
q_jana_rescue(){
  // OPRAVA současné: nepřesouvat hráče, ale spustit Janinu animaci ke krbu
  gs.story.jana_rescue_started = true;
  closeDialog();
  setTimeout(() => {
    addLog('Jana se na tebe ostře podívá, otočí se a důstojně odkráčí
           ke krbu k Johnnymu.', 'lw');
    fnotif('Jana tě odmítla 💔', 'rep');
    triggerJanaToFireplace();  // Phase 7.1
  }, 400);
},

// ─── HOSPODA: vzít Janin drink ─────────────────────────────────
q_take_jana_drink(){
  if(gs.story.jana_drink_taken){ closeDialog(); return; }
  gs.story.jana_drink_taken = true;
  gs.inv.sklenice_jana = 1; updateInv();
  closeDialog();
  setTimeout(() => {
    showNPCLine('jana_kosova',
      '*Jana se mírně usměje.* "Aha, dík. Jakože... pitný režim?
      Dobrý nápad. Sem tam mi tu sklenici drbni do ruky, jo?"',
      () => addLog('Vzal jsi Janině sklenici. Můžeš ji vrátit nebo ne...', 'ls')
    );
  }, 200);
},

// ─── VILLA: vrátit drink Janě ──────────────────────────────────
q_jana_take_glass_back(){
  // Po Stage 8 dialogu – hráč drží sklenici, Jana jde na WC
  closeDialog();
  gs.story.jana_at_toilet = true;
  gs.inv.sklenice_jana = 1; updateInv();
  setTimeout(() => {
    addLog('Jana odešla na záchod. Sklenici máš v ruce. Můžeš ji vrátit
           na stůl, nebo do ní něco hodit...', 'ls');
    triggerJanaToToilet();  // Phase 7.5
  }, 300);
},

// ─── VILLA: nasypat prášek do drinku ───────────────────────────
q_drug_jana_drink(){
  if(!gs.inv.prasek){ addLog('Nemáš prášek!','lw'); closeDialog(); return; }
  if(!gs.inv.sklenice_jana){ addLog('Nemáš sklenici!','lw'); closeDialog(); return; }
  gs.inv.prasek = 0;
  gs.story.drink_drugged = true;

  // Otrávení během rande (bez WC tricku) → Jana to vidí → DEATH
  if(!gs.story.jana_at_toilet && !gs.story.jana_in_bathroom_locked){
    closeDialog();
    setTimeout(() => triggerJanaKatanaKill(), 800);  // Phase 7.6
    return;
  }

  // Bezpečná chvíle – Jana je pryč, otrávení projde
  closeDialog();
  addLog('Nasypal jsi prášek do Janiny sklenice. Teď ji jen vrátit zpět...', 'ls');
},

// ─── VILLA: vrátit (otrávenou) sklenici na stůl ────────────────
q_return_glass_to_table(){
  if(!gs.inv.sklenice_jana){ closeDialog(); return; }
  gs.inv.sklenice_jana = 0; updateInv();
  closeDialog();
  addLog('Vrátil jsi sklenici na stůl. Vypadá to nenápadně.', 'ls');
},

// ─── VILLA: dát Janě hadr (bathroom plan brief) ───────────────
q_give_jana_rag(){
  if(!gs.inv.hadr){ addLog('Nemáš hadr!','lw'); closeDialog(); return; }
  gs.inv.hadr = 0; updateInv();
  gs.story.bathroom_plan_briefed = true;
  closeDialog();
  setTimeout(() => {
    showNPCLine('jana_kosova',
      '*Šeptáš Janě plán. Jí pomalu rozšíří úsměv...* "Vážně? Vytopit
      Johnnyho? Hrubeši, ty jsi génius! Hned tam jdu."',
      () => triggerJanaToBathroom()  // Phase 7.4
    );
  }, 200);
},

// ─── VILLA: -25 REP (Jana viní hráče) ─────────────────────────
q_jana_blame_player(){
  if(gs.story.relationship_advice_used){ closeDialog(); return; }
  gs.story.relationship_advice_used = true;
  gs.rep = Math.max(0, gs.rep - 25);
  updateHUD();
  closeDialog();
  addLog('Jana ti přestala věřit. -25 REP 💔','lw');
  fnotif('-25 REP', 'rep');
},

// ─── VILLA: koupelnový šuplík (najít hadr) ────────────────────
q_bathroom_drawer(){
  // EXISTUJE q_koupelna_drawer pro želízka. Rozšířit:
  // 1× najde hadr i želízka (železka už jsou)
  // Logika: pokud želízka už má, dá místo nich hadr.
  if(!gs.story.koupelna_drawer_opened){
    gs.story.koupelna_drawer_opened = true;
    gs.inv.zelizka = 1;
    gs.inv.hadr = 1;
    gs.story.bathroom_rag_found = true;
    updateInv();
    addLog('Otevřel jsi šuplík. Nahoře leží želízka, vespod čistý
           bílý hadr. Bereš obojí.', 'lm');
    fnotif('+ ⛓️ Želízka, 🧻 Hadr','itm');
  }
  closeDialog();
},

// ─── JOHNNY GAUČ: timer + Jana usne ───────────────────────────
q_johnny_charm_start(){
  gs.story.johnny_charm_phase = true;
  closeDialog();
  setTimeout(() => triggerCharmGauc(), 400);  // Phase 7.7
},

q_johnny_help_done(){
  closeDialog();
  doneObj('side_johnny_help');
  if(!gs.inv.membership_vaza){
    gs.inv.membership_vaza = 1;
    if(activeProfile) activeProfile.artifacts.membership_vaza = true;
    updateInv();
    fnotif('💳 Vaza Systems','itm');
  }
  gainRep(5, 'Pomohl Johnnymu');
},
```

---

## 7) ANIMACE – DETAILNÍ SPEC

### 7.1 `triggerJanaToFireplace()` – Hospoda
**Stav:** Nový animační stav `gs.jana_to_fireplace`
**Trvání:** ~3.5s
**Fáze:**
1. `'walking'` (3s) – Jana přejde od baru ke krbu, mírně rychle
   - Z aktuální `jana.x, jana.y` k cíli `W*0.36, H*0.74`
   - V update tick interpolace 2.5px/16ms
2. `'arrived'` – Jana je u Johnnyho, mírně se k němu nakloní
   - Přidá Johnnymu hover efekt (přitulení)
   - Po fázi: `gs.story.jana_at_fireplace = true`, `currentNPCs` Janu nechá
3. Zachová `getStage(jana_kosova) = 5`

**Render:**
- V `drawHospoda` přidat speciální párový render Jana+Johnny u krbu
- Subtilní animace přibližování ramenou (`bob` cyklus)
- Po Johnnyho boku tu Jana zůstane natrvalo

### 7.2 `triggerVillaGhosting()` – Villa intro
**Trigger:** Když hráč vstoupí do villy s `villa_ghosted` nebo `jana_at_fireplace`
- Standardní vstup: Johnny+Jana sedí na gauči blízko sebe
- Render: gauč se 2 NPC obrázky, mírně se k sobě naklánějí
- **Hráč nemůže s Janou normálně mluvit** – ukáže se Stage 6 dialog (-25 REP) jen JEDNOU
- Po +25 REP loss: Jana tam zůstává němá, hráč jí může jen ignorovat

### 7.3 `triggerJanaKatanaKill()` – DEATH
**Trvání:** ~6.5s
**Fáze:**
1. `'realize'` (1.5s) – Jana ztuhne, otočí se k hráči
   - Speech bubble: *„Tys... tys mi to FAKT chtěl dát do toho... ty kreténe jeden..."*
2. `'rage'` (1.0s) – screen shake
   - Speech bubble: *„Po VŠEM CO JSME SPOLU PROŽILI?! Přejes ti drsnou smrt, ty zmrde!"*
3. `'draw_katana'` (0.8s) – Jana vytáhne katanu (`armsState='wielding'`, `armsItem='katana'`)
   - Speech bubble: *„Tu katanu jsem ukradla Milanovi. Pro tuhle příležitost!"*
4. `'wind_up'` (0.4s) – Jana se napřahá (`armsSwingT` od -0.6 rad)
5. `'strike'` (0.2s) – velký bílý flash, screen shake 600ms
   - Sound effect (pokud existuje audio): bodnutí
6. `'cuts'` (1.5s) – hráč stojí, na těle 4-6 symetrických ran
   - Render hráče s liniemi v render.js
   - Z ran kape krev (částice)
7. `'fall_apart'` (0.6s) – tělo se rozpadne na ~6 kostek
   - Každá kostka má vlastní `vx, vy` rozlétne se
   - Velká loužička krve roste
8. `'death_screen'` (po 6s) – `triggerDeath(...)` s novým názvem

**Death screen:**
- Text: „Jana Kosová tě rozsekala katanou na šest dílů.\nMěls jí věřit. Měls.""
- Title: **„ROZSEKÁN KATANOU"**
- Subtitle: „KONEC HRY · ZRADA SE NEVYPLÁCÍ"
- DeathType key: `death_jana_katana`

**Update profile.js:**
- `endings.death_jana_katana: false` přidat
- Endings render: `{ key:'death_jana_katana', emoji:'⚔️', name:'Rozsekán Katanou' }`

### 7.4 `triggerJanaToBathroom()` – Villa
**Trvání:** ~2.5s
**Fáze:**
1. `'walking'` – Jana z gauče dojde k dveřím koupelny (W*0.92, H*0.35)
2. `'enter'` – Jana zmizí (`currentNPCs` ji odeber)
3. `'lock'` – addLog: „Slyšíš cvaknutí zámku."
4. **Stav po:** `gs.story.jana_in_bathroom_locked = true`
   - Hráč nemůže vejít do koupelny (interact() check)
   - Spustí se 12s timer pro povodeň

### 7.5 `triggerJanaToToilet()` – Villa (drink path)
**Trvání:** ~6s
**Fáze:**
1. `'standup'` – Jana vstane z gauče
2. `'walking'` – jde k dveřím koupelny
3. `'in_bathroom'` (4s timer)
4. `'returning'` – Jana se vrátí, sedne k Johnnymu
5. **Po:** `gs.story.jana_at_toilet = false` (vrácena)

### 7.6 `triggerBathroomFlood()` – Villa
**Trvání:** ~12s + animace prokopnutí
**Fáze:**
1. **Voda zpod dveří** (gradual) – `gs.flood_anim = { progress: 0..1 }`
   - V `drawJohnnyVila` render kaluže před dveřmi koupelny
   - Kaluž roste v čase: `progress * W*0.30` šířka
2. **Johnny notice** (~6s do floodu) – Johnny screen shake
   - Johnny dialog stage 7 spustí jednorázově (pokud k němu hráč přijde)
3. **Door break** (~12s do floodu)
   - Johnny rozběhne se ke dveřím
   - Animace prokopnutí dveří (door explodes outward, particles)
   - `gs.story.bathroom_door_broken = true`
   - Johnny zmizí z living roomu, je v koupelně
4. **Hráč může jít za nima do koupelny**
   - Spustí se cutscena: dialog Jana ↔ Johnny (Phase 7.6.b)

### 7.6.b `triggerBathroomCutscene()` – v koupelně
**Trvání:** ~14s
**Účast:** Johnny + Jana, hráč je posluchač
**Fáze (každá ~2-3s):**
1. Johnny: *„JANO! CO TO MÁŠ ZA ZRŮDNOSTI?! VYSVĚTLI MI TO!"*
2. Jana: *„Ty... TY MI POŘÁD HARAŠÍŠ! Kámoška měla pravdu, ŘÍKALA MI ABYCH SEM NECHODILA!"*
3. Jana: *„HRUBEŠ JE ZMRD CO MI TO TADY DOHODIL! Nikdy mu to neodpustím!"*
4. **Hráč má volbu:**
   - „(Naslouchat dál)" – pokračovat
   - „💬 Bránit se" → 5
5. Johnny+Jana naráz: *„TEĎ DRŽ HUBU, HRUBEŠ! TADY SE HÁDAJÍ DOSPĚLÍ!"*
6. Jana: *„VÍŠ CO?! TADY MÁŠ!"* → animace 7.6.c
7. Naopak pokud naslouchal: Jana: *„VÍŠ CO?! PŘÍŠEL ČAS NA ÚČTOVÁNÍ!"* → animace 7.6.c

### 7.6.c `triggerJanaHandcuffs()` – Villa kuchyně/koupelna
**Trvání:** ~4s
**Fáze:**
1. Jana: rychle k Johnnymu, `armsState='swinging'`
2. Johnny padne k zemi (animace pádu)
3. Jana ho táhne k radiátoru (~2s)
4. Spoutá ho (`gs.inv.zelizka = 0` pokud měl)
5. **Po:** `gs.story.jana_handcuffed_johnny = true`
6. Render: Johnny leží spoutaný u radiátoru
   - Custom render: Johnny x: W*0.10, y: H*0.65, ležící
   - Přidat řetěz (zelizka) k jeho ruce + radiator (W*0.05, H*0.50, 8x40)

### 7.7 `triggerCharmGauc()` – Villa (Johnny path končí)
**Trvání:** ~12s
**Fáze:**
1. Johnny mrkne na hráče: *„Sleduj, jak na ní jdu."* (k němu mluví) - whisper bubble
2. Johnny+Jana flirtují u stolu (~3s) – Jana mírně se zachichá
3. Johnny: *„Pij napij, dáme to spolu na gauči."* – Jana nekriticky souhlasí
4. **Animace přesunu na gauč** (~2s)
   - Johnny i Jana se přesunou k W*0.65, H*0.55
5. Hráč se může připojit – Johnny: *„Neruš nás, kámo."*
6. **Timer 10s** spustí
   - Po čase: Jana usne (`gs.story.jana_asleep_gauc = true`)
   - Render: Jana s `'sleep_zzz'` mód, hlava skloněná
7. Johnny: Stage 9 dialog (LETS GOO)

---

## 8) NOVÉ INVENTORY ITEMY

### 8.1 `hadr` (bílý hadr)
- HTML: `<div class="isl" id="sl-hadr" title="🧻 Bílý hadr – pro ucpání odtoku">`
- Emoji: 🧻
- Label: „Hadr"
- Display only, žádný onclick (předává se Janě v dialogu)

### 8.2 `sklenice_jana` (Janina sklenice)
- HTML: `<div class="isl" id="sl-sklenice_jana" onclick="useGlassDrug()" title="🥃 Janina sklenice – kliknutím nasypat prášek">`
- Emoji: 🥃
- Label: „Sklenice"
- onclick: pokud má prášek → q_drug_jana_drink, jinak addLog("Nemáš co tam dát.")

### 8.3 `useGlassDrug()` (`js/items.js`)
```js
function useGlassDrug(){
  if(!gs.inv.sklenice_jana){ addLog('Nemáš sklenici.','lw'); return; }
  if(!gs.inv.prasek){ addLog('Nemáš prášek na nasypání.','lw'); return; }
  if(gs.story.drink_drugged){ addLog('Už jsi do toho jednou sypal.','lw'); return; }
  runQF('q_drug_jana_drink');
}
```

---

## 9) UI / ÚKOLY

### 9.1 Nové objectives
```js
{ id:'side_johnny_help',     tag:'Byznys',    name:'Pomoct Johnnymu uspět' },
{ id:'side_jana_flood',      tag:'Tajné',     name:'Vytopit Johnnyho s Janou' },
{ id:'side_jana_revenge',    tag:'Šedá',      name:'Pomoct Janě se pomstít' },
```

### 9.2 Quest log eventy (nové addLog/fnotif)
- „Jana má v sobě prášek. Brzy usne." (po q_drug_jana_drink + safe path)
- „Bathroom je pod vodou. Slyšíš křik."
- „Johnny prokopl dveře."
- „Jana ti dala podprsenku!" (existuje)

---

## 10) MENU ROZHODNUTÍ – kde se rozhodnutí dělá

### 10.1 Hospoda – Janin dialog stage 3 (rande)
```
"Fando... Ten Johnny je divný..." (původní)
choices:
  [A] Pojď, jdeme odtud (prim)            → q_jana_rescue       [SKUTEČNÝ rescue, +5 REP]
  [B] Pohoda Jano, Johnny je v pohodě    → q_jana_to_johnny    [Jana → krb → villa → -25 REP later]
```
**Pozn.:** Drink možnost přesunuta do villy (10.5).

### 10.2 Villa – Johnny dialog (před vším)
**EXISTUJE STAGE 0 (initial)** – ponechat
- Po něm hráč může:
  - Jít do koupelny → najít hadr
  - Vrátit se za Johnnym
  - Nesypat prášek, čekat → DEFAULT
  - Sypat prášek do drinku (bez safe situace) → DEATH

### 10.3 Villa – Janin dialog (po flood plan, hadr v ruce)
```
text: '*Jana zírá do sklenice. Johnny telefonuje na vedlejším*'
choices:
  [A] *podat hadr a šeptem říct plán*  → q_give_jana_rag
  [B] (Nedělat nic.)                    → close
```

### 10.4 Villa – Šuplík v koupelně (E na šuplíku)
**EXISTUJE q_koupelna_drawer** – rozšířit aby dal i hadr
*(viz Phase 6 q_bathroom_drawer)*

### 10.5 Villa – Sklenice v inventáři (klik)
- Pokud má prášek → spustí q_drug_jana_drink
- Pokud Jana je v koupelně → SAFE (drug projde)
- Pokud Jana je u stolu → DEATH (Phase 7.6 katana)

### 10.6 Villa – po vrácení (otrávené) sklenice na stůl
**Co spustí Janino napití:**
- Jana se vrátí z WC (existuje triggerJanaToToilet)
- Po jejím návratu si jde sednout, drink popíjí
- `gs.story.jana_drank_potion = true`
- Spustí se Johnny dialog stage 6 (vaza membership)
- Pak spustit triggerCharmGauc

---

## 11) EDGE CASES & GUARDRAILS

### 11.1 Edge: Hráč nemá prášek
- Klik na sklenici → `addLog('Nemáš co tam dát.')`

### 11.2 Edge: Hráč má prášek ale nikdy nezačne s Janou
- Default flow – Johnny ji odvede, žádný drug

### 11.3 Edge: Hráč zlomí Johnny quest před tímhle
- Pokud `s.johnny_cuffed` (z villa rescue questu už existuje), tahle větev nedostupná
- Guard: před spuštěním Johnny stage 5+ checkovat `!s.johnny_cuffed`

### 11.4 Edge: Hráč se vrátí do hospody po villa pošla
- Jana není v hospodě (`janaAway` flag) – ✅ funguje
- Johnny tam taky není – ✅ funguje

### 11.5 Edge: Hráč zemře jinde, pokračuje
- Po smrti game restart – flagy se resetnou
- ✅ funguje díky resetGameState

### 11.6 Edge: Hráč odejde z koupelny po flood
- Johnny stage 7 stále aktivní
- Po 12s flood → Johnny prokopne dveře
- Hráč může klidně sledovat z obýváku (čistě atmosférické)

### 11.7 Edge: Hráč po flood neopustí villu
- Po cutscene Jana opustí villu, jde do Billy
- Johnny zůstává spoutaný (nikdy se neuvolní) – ✅ ok pro endgame

---

## 12) REPUTAČNÍ TABULKA – master overview

### 12.1 Existující REP eventy (nedotknout, jen referovat)
| Akce | Δ REP | Zdroj |
|------|------:|-------|
| Koupit kratom 50g | +1 | šaman |
| Koupit kratom 200g | +3 | šaman |
| Šamanovo heslo MRÁZ | +25 | šaman |
| KGB minihra win | +20 | bezdák |
| Přesvědčit Janu na rande | +3 | jana |
| Zachránit Janu (hospoda rescue) | +5 | jana |

### 12.2 Nové REP eventy (jana×johnny revamp)
| Akce | Δ REP | Komentář |
|------|------:|----------|
| Pojď Jano (hospoda) | +0 | Naivní rescue – krátkodobě nic |
| -- později ve ville | **-25** | Jana viní hráče |
| Vzít hadr + plánovat (briefing) | +3 | "Jsi génius!" |
| Bathroom flood úspěch | **+15** | Velká odměna za chytrost |
| Bathroom flood + Jana spoutá Johnnyho | **+8** | Bonus |
| Bathroom flood s drogou (zradil Janu) | **-20** | Velký morální přešlap |
| Donést pití bez drogy | +2 | Slušnost |
| Otrávit Janin drink (safe = WC trick) | **-5** | Tajné, cítíš se zle |
| Pomoct Johnnymu (Jana usne) | +5 | Kámošský vztah |
| Otrávit drink přímo (bez tricků) | DEATH | Žádná REP – konec hry |

### 12.3 Tabulka outcomes (přehled net REP)
```
NET REP +18 → Bathroom flood, no drug
NET REP +15 → Flood s následným spoutáním
NET REP +5  → Help Johnny (drug v safe momentě)
NET REP -5  → Default (Johnny ji odvede, hráč nic)
NET REP -20 → Pojď Jano + následná villa scéna
NET DEATH   → Direct drug attempt
```

---

## 13) IMPLEMENTAČNÍ POŘADÍ (krok po kroku)

### Sprint 1: Foundation (~2h)
1. ✅ Pája fix (HOTOVÉ v této session)
2. ⏳ Nové state flagy v `state.js`
3. ⏳ Nové inventory itemy: `hadr`, `sklenice_jana`
4. ⏳ HTML inventory sloty + ui.js mapa + g3 group
5. ⏳ ART/profile.js endings: `death_jana_katana`

### Sprint 2: Bug fix #1 (~1h)
1. ⏳ Fix Pojď Jano repeat – nový stage 5 v jana_kosova
2. ⏳ getStage rozšířit
3. ⏳ Animace Jana → krb (`triggerJanaToFireplace`)
4. ⏳ Render párový Jana+Johnny u krbu
5. ⏳ Stage 6 villa „relationship_advice" + -25 REP

### Sprint 3: Bathroom plan (~3h)
1. ⏳ Šuplík dává hadr (rozšířit q_koupelna_drawer)
2. ⏳ Janin dialog stage 7 + q_give_jana_rag
3. ⏳ `triggerJanaToBathroom` animace
4. ⏳ Block pro koupelnové dveře (interact check)
5. ⏳ Johnny stage 5 ("zvláštní... odejdu")
6. ⏳ `triggerBathroomFlood` (voda zpod dveří)
7. ⏳ Johnny prokopnutí dveří
8. ⏳ `triggerBathroomCutscene` (dialog Jana×Johnny)
9. ⏳ Hráčova volba „naslouchat / bránit se"
10. ⏳ `triggerJanaHandcuffs` animace
11. ⏳ Render Johnny ležící spoutaný
12. ⏳ Stage 9 jana_kosova (díky + podprsenka)

### Sprint 4: Drink path (~2h)
1. ⏳ q_take_jana_drink + jana stage 8
2. ⏳ q_jana_take_glass_back + triggerJanaToToilet
3. ⏳ q_drug_jana_drink (safe vs unsafe varianty)
4. ⏳ q_return_glass_to_table
5. ⏳ Janin návrat + napití (auto-trigger)
6. ⏳ Johnny stage 6 (vaza – propojit s tímhle)
7. ⏳ `triggerCharmGauc` animace
8. ⏳ Janino spaní na gauči
9. ⏳ Johnny stage 9 LETS GOO

### Sprint 5: Death path (~3h)
1. ⏳ NPC ruce mechanika (`drawNPCArms`)
2. ⏳ Katana item render
3. ⏳ `triggerJanaKatanaKill` 8-fázová animace
4. ⏳ Tělní řezy + krev
5. ⏳ Rozpadnutí na kostky
6. ⏳ Krevní loužička render
7. ⏳ Death screen handler `death_jana_katana`
8. ⏳ Profile.js endings update

### Sprint 6: Polish & Test (~1h)
1. ⏳ Všechny edge cases otestovat
2. ⏳ Quest log entries správně formulované
3. ⏳ REP gainy/lossy ověřit
4. ⏳ Profile leaderboard funguje
5. ⏳ Žádné quest gating zlomené (Číhalová, Mraz, etc.)

**Total ETA: ~12-14h kódu**

---

## 14) TESTOVACÍ CHECKLIST

### 14.1 Path A: „Pojď Jano" (hospoda rescue → villa ghosting)
- [ ] V hospodě tlačítko stiskni
- [ ] Jana má spustit animaci ke krbu
- [ ] Po promluvě s Janou stage 5 (mrazivý pohled)
- [ ] Johnny+Jana přesun do villy automaticky (nebo manuální exit?)
- [ ] Ve ville Janin stage 6: -25 REP
- [ ] Po stisknutí close: již nic, Jana tichá

### 14.2 Path B: Bathroom flood (Jana rescue)
- [ ] Najít hadr v šuplíku
- [ ] Mluvit s Janou ve ville → stage 7 (přijmout plán)
- [ ] Janina animace do koupelny
- [ ] Koupelna dveře zamčené (E nedělá nic)
- [ ] Johnny stage 5 (zvláštní)
- [ ] Po 12s flood spustit
- [ ] Johnny rozbije dveře
- [ ] Cutscena dialog
- [ ] Volba bránit se / naslouchat
- [ ] Janino spoutání Johnnyho
- [ ] Stage 9: podprsenka, +18 REP

### 14.3 Path C: Drink + drug (safe via WC) – Johnny help
- [ ] Vzít drink v hospodě nebo ve ville?
- [ ] Mluvit s Janou stage 8 (díky, jdu na WC)
- [ ] Vzít sklenici zpět
- [ ] Použít prášek na sklenici
- [ ] Vrátit sklenici na stůl
- [ ] Jana se vrátí z WC, napije se
- [ ] Johnny stage 6 (vaza)
- [ ] Charm gauč animace
- [ ] Jana usne, Johnny LETS GOO
- [ ] +5 REP, +💳 vaza

### 14.4 Path D: Bathroom flood + drug (zradit Janu)
- [ ] Stejně jako Path B do janina zamčení
- [ ] Místo čekat: vzít drink, sypnout prášek, vrátit
- [ ] Jana se napije (kdy? – po flood?)
- [ ] Konflikt: pokud Jana zamčená, jak se napije?
- [ ] **DESIGN ROZHODNUTÍ:** TUTO CESTU NEPODPOROVAT (technicky nemožná)
- [ ] Místo toho path D = pokud hráč VZAL hadr ale nedal Janě + drink + drug
- [ ] Outcome: Jana to vidí přímo (ne v koupelně), katana death

### 14.5 Path E: Direct drug → DEATH
- [ ] Vzít prášek z villa šuplíku
- [ ] Vzít drink od Jany
- [ ] Sypnout prášek bez WC tricku
- [ ] Animace katany (8 fází)
- [ ] Death screen „Rozsekán Katanou"
- [ ] Profile uloží `death_jana_katana = true`

### 14.6 Path F: Default (nic dělat)
- [ ] Nepouštět se do žádné akce
- [ ] Johnny ji odvede normálně
- [ ] Lze pak normálně rescue questem (existuje villa_deadline)

### 14.7 Quest gating ověřit
- [ ] Číhalová quest funguje
- [ ] Figurová quest funguje
- [ ] Mraz quest funguje
- [ ] Mates / Milan murder funguje
- [ ] Nic neblokuje výhru přes Pája/Fábii

---

## 15) NÁVRHY PRO JMÉNO DEATH SCREENU

Možnosti:
1. **„ROZSEKÁN KATANOU"** ✅ (default)
2. „NEUSTÁL ZRADU" – melancholický
3. „SUSHI A LA HRUBEŠ" – temný humor
4. „KATANA Z LÁSKY" – ironie
5. „SYMETRICKÝ ROZPAD" – technický
6. „BLOOD DAGGER PROTOKOL" – random sci-fi vibe

→ **Doporučeno:** „ROZSEKÁN KATANOU" + subtitle „SUSHI A LA HRUBEŠ"

---

## 16) ROZHODNUTÍ (uživatel potvrdil 2026-04-28)

1. **Jana ke krbu:** ✅ Trigger = volba **"Pohoda Jano, Johnny je v pohodě"** (ne "Pojď Jano!")
   - "Pojď Jano" = skutečný rescue (Jana odejde s hráčem, vrací se do Billy)
   - "Johnny je v pohodě" = Jana se odkloní k Johnnymu u krbu, později vila

2. **Villa ghosting (lépe nazváno "VILLA_DATE_CONTINUES"):** ✅
   - Po Janině přesunu ke krbu Johnny zůstane s ní
   - Časem (timer ~30s nebo po opuštění hospody hráčem) Johnny vezme Janu k sobě domů
   - Ve ville oba sedí na gauči těsně u sebe (custom render)
   - Když hráč mluví s Janou: stage 6 dialog → -25 REP

3. **Path D (flood + drug):** ✅ PODPOROVAT
   - Sekvence: hráč otráví drink → dá Janě → Jana se napije a jde na flood plán
   - Drug způsobí, že Jana usne v koupelně **před** dokončením flood plánu
   - Voda mírně teče (zamlžila pár dlaždic), pak ustane
   - Johnny vyrazí dveře (kratší timer než normální flood)
   - Najde Janu v bezvědomí, vezme si ji na gauč
   - Outcome: Johnny path success + -20 REP morálka

4. **Drink:** ✅ JEN VE VILLE (hospoda zákaz)

5. **Pizza žemle:** ❌ ZRUŠIT samostatný side quest, ponechat jen flavor text

6. **Flood timer:** ✅ NEKONEČNÝ – běží dokud hráč nezastaví vodu v koupelně
   - Voda se šíří přes celou podlahu (~30-40s do plné kaluže)
   - Johnny notice → breakdown automaticky když voda dosáhne ~60% pokrytí
   - Vstup do koupelny po breakdownu → cutscena
   - Player nemůže zastavit vodu sám (Jana zamčená) – jen Johnny breakdown to zastaví

---

## 17) KONEC PLÁNU

**Čeká na schválení uživatelem.**
Po schválení implementovat dle Sprint 1 → Sprint 6.
Mezi sprinty komitnout do gitu separately pro snadný rollback.
