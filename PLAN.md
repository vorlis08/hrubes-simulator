# PLÁN IMPLEMENTACE – Figurová linka, Johnny/Jana rozšíření

## STATUS LEGEND
- [ ] TODO
- [x] HOTOVO
- [~] ROZPRACOVÁNO

---

## 1. MILAN – ODSTRANĚNÍ PRODEJE KRATOMU

Milan už neprodává kratom. Prodej zůstává jen u Šamana a Mikuláše.

- [ ] Odstranit volby `💸 10g za 30 Kč` a `💸 100g za 300 Kč` z Milanova dialogu (stage 0 i stage 1) v `config.js`
- [ ] Odstranit funkce `q_milan_10g` a `q_milan_100g` z `quests.js`
- [ ] Přepsat Milanův stage 0 dialog – nový text bez nabídky kratomu (zachovat příběh o mrtvém psovi, ale bez obchodu)
- [ ] Přepsat Milanův stage 1 dialog – nový text (Milan jako postava, ne dealer)
- [ ] Zkontrolovat, že `gs.story.milan_met` se stále správně nastavuje (potřeba pro jiné questy)
- [ ] Otestovat, že žádná jiná funkce nezávisí na `q_milan_10g` / `q_milan_100g`

---

## 2. PÁJA – ODSTRANĚNÍ KRATOM ZA REP

- [ ] Odstranit dynamickou volbu `🌿 Nabídnout 10g kratomu (+REP)` z `dialog.js` (řádek ~146)
- [ ] Odstranit funkci `q_paja_kratom` z `quests.js`
- [ ] Odstranit `gs.story.paja_kratom` ze všech kontrol

---

## 3. FIGUROVÁ – DŮKAZY OD MILANA: SCREENSHOT + HLASOVKA

Místo neviditelného flagu hráč získá fyzický item – screenshot zprávy.

### 3a. Nový item: screenshot
- [ ] Přidat `screenshot: 0` do `gs.inv` v `state.js`
- [ ] Přidat zobrazení screenshotu v inventáři v `ui.js` / `index.html` (ikona 📱)
- [ ] Vytvořit overlay pro zobrazení obrázku screenshotu (stejný mechanismus jako `note-ov` pro Krejčí dopis)
- [ ] Přidat HTML pro overlay screenshotu do `index.html` (id: `screenshot-ov`)
- [ ] Přidat funkce `showScreenshot()` / `closeScreenshot()` do `dialog.js`
- [ ] Placeholder obrázek `game/img/screenshot.png` – uživatel nahraje vlastní

### 3b. Nový item: hlasovka
- [ ] Přidat `hlasovka: 0` do `gs.inv` v `state.js`
- [ ] Přidat audio element pro přehrání hlasovky v `index.html`
- [ ] Placeholder audio `game/audio/hlasovka.mp3` – uživatel nahraje vlastní
- [ ] Tlačítko na přehrání hlasovky v overlay screenshotu (nebo v inventáři)

### 3c. Milanův dialog – předání screenshotu
- [ ] Nová dynamická volba u Milana: `🕵️ Důkazy pro Figurovou` (podmínka: `figurova === 1 && !milan_fig_evidence && !milan_protiutok_asked`)
- [ ] Nová funkce `q_milan_fig_screenshot()`:
  - Nastaví `gs.story.milan_fig_evidence = true`
  - Nastaví `gs.inv.screenshot = 1`, `gs.inv.hlasovka = 1`
  - Zobrazí overlay se screenshotem
  - Log: Milan ti ukáže screenshot zprávy kde Figurová domlouvá něco nelegálního
  - Přidá i hlasovku jako item
- [ ] Přepsat stávající `q_milan_fig` na novou verzi se screenshotem

### 3d. Obsah screenshotu (lore)
- [ ] Screenshot ukazuje: Mates měl na Figurovou špínu – dává lajny koksu na záchodech
- [ ] Hlasovka: Figurová vyhrožuje Matesovi – najme Tadeáše, zlomí mu kosti, udusí jeho rodinu
- [ ] Tyto texty zobrazit jako popis v logu při prohlížení screenshotu

---

## 4. FIGUROVÁ – DŮKAZ: FOTKA S KUBÁTOVOU

Dostupná jen pokud hráč dokončil linku s Kubátovou A Milan přežil.

### 4a. Nový item: fotka s Kubátovou
- [ ] Přidat `foto_kubatova: 0` do `gs.inv` v `state.js`
- [ ] Přidat overlay pro zobrazení fotky (id: `foto-kubatova-ov`)
- [ ] Placeholder obrázek `game/img/foto_kubatova.png` – uživatel nahraje vlastní

### 4b. Podmínky pro fotku
- [ ] Volba se zobrazí u Milana JEN pokud:
  - `gs.story.figurova === 1` (Figurová quest aktivní)
  - `gs.story.mraz_done === true` (Kubátová linka dokončena)
  - `gs.story.milan_fled === true` NEBO `gs.story.milan_voodoo_dead === false` (Milan přežil)
  - `!gs.story.milan_fig_evidence` (ještě nepředal důkaz)
- [ ] Nová funkce `q_milan_fig_foto()`:
  - Nastaví `gs.story.milan_fig_foto = true`
  - Nastaví `gs.story.milan_fig_evidence = true`
  - Nastaví `gs.inv.foto_kubatova = 1`
  - Log: Milan ti ukáže fotku s Kubátovou ve sklepě

### 4c. Milanova dynamická volba – fotka
- [ ] Přidat do `showDialog` dynamiku: pokud splněny podmínky z 4b, zobrazit volbu `📸 Ukázat fotku s Kubátovou`
- [ ] Fotka se zobrazí vedle volby screenshotu – hráč si vybere jeden nebo druhý důkaz

---

## 5. MILAN PO VAROVÁNÍ – NEZMIZÍ Z MAPY

Po varování (3× → uteče do Plané) Milan nezmizí okamžitě, ale čeká na Matese.

- [ ] Upravit `q_milan_finally_leave` – Milan NEodstraněn z `currentNPCs` ihned
- [ ] Milan se přesune do hospody (změnit `NPCS.milan.room` dynamicky nebo přidat ho do hospody NPC listu)
- [ ] Nový Milanův stage v hospodě: `"Čekám na Matese. Odjíždíme spolu do Plané."`
- [ ] Po určitém čase (nebo po interakci s Matesem) Milan skutečně zmizí
- [ ] Během čekání v hospodě je dostupná volba `📸 Fotka s Kubátovou` (pokud splněny podmínky)
- [ ] Upravit `initRoom` – neodstraňovat Milana pokud `gs.story.milan_waiting_mates === true`

---

## 6. FIGUROVÁ – VYDÍRÁNÍ

Pokud hráč má fotku (foto_kubatova), může Figurovou vydírat místo normálního odevzdání.

### 6a. Nové volby u Figurové
- [ ] Dynamická volba: `💰 Chci 2000 Kč, nebo to půjde ven` (podmínka: `foto_kubatova` v inventáři)
- [ ] Dynamická volba: `📋 Chci C2 certifikát z AJ` (podmínka: `foto_kubatova` v inventáři)
- [ ] Obě volby se zobrazí jen s fotkou, ne se screenshotem

### 6b. Funkce vydírání
- [ ] `q_figurova_blackmail_money()`:
  - `gs.money += 2000`
  - `gs.inv.foto_kubatova = 0`
  - `gs.story.figurova = 2`
  - `gs.taboo.blackmail = true`
  - Log: Figurová zaplatila 2000 Kč za mlčení
- [ ] `q_figurova_blackmail_cert()`:
  - `gs.inv.c2_cert = 1`
  - `gs.inv.foto_kubatova = 0`
  - `gs.story.figurova = 2`
  - `gs.taboo.blackmail = true`
  - Log: Figurová ti zfalšovala certifikát C2 z angličtiny
  - Achievement: unlocked (připravit systém achievementů)

### 6c. C2 certifikát
- [ ] Přidat `c2_cert: 0` do `gs.inv`
- [ ] Přidat overlay pro zobrazení certifikátu (id: `cert-c2-ov`)
- [ ] Placeholder obrázek `game/img/cert_c2.png` – uživatel nahraje vlastní
- [ ] Item je k ničemu gameplay-wise, ale dá achievement

### 6d. Achievement systém (základ)
- [ ] Přidat `gs.achievements = []` do `state.js`
- [ ] Funkce `unlockAchievement(id, name, desc)` – přidá do pole, zobrazí notifikaci
- [ ] Achievement: `cert_c2` – "Certified Bullshitter" – C2 certifikát z angličtiny od Figurové
- [ ] Vykreslení achievementu jako notifikace (fnotif s jiným stylem)

---

## 7. MILAN KRATOM-KAFE (PROTIÚTOK)

Milan dá kratom do kafe JEN pokud REP < 50.

### 7a. Podmínka reputace
- [ ] Upravit dynamickou volbu `🕵️ Figurová mě na tebe poslala...` v `dialog.js`:
  - Přidat podmínku `gs.rep < 50`
  - Pokud REP >= 50, tato volba se vůbec nezobrazí
- [ ] Při REP >= 50 jsou dostupné jen screenshot/hlasovka (+ fotka při dokončené Kubátové)

### 7b. Sanitka po kratom-kafe
- [ ] Upravit `q_figurova_kratom` – po přimíchání kratom do kafe:
  - Spustit časovač (2.5s jako teď)
  - Přidat vizuální efekt příjezdu sanitky (log + notifikace – už existuje)
  - Ověřit, že text sanitky je dostatečně dramatický
  - Figurová zmizí z učebny (odstranit z currentNPCs)

---

## 8. FIGUROVÁ – TEMNÁ LINKA (VRAŽDY)

Pokud hráč předá screenshot BEZ vydírání, Figurová se zblázní z obsahu a najme hráče na dvě vraždy.

### 8a. Figurová zjistí obsah screenshotu
- [ ] Nový Figurová dialog stage po předání screenshotu (ne fotky!):
  - Figurová čte screenshot, zjistí že Mates má na ní špínu (kokain na záchodech)
  - Figurová slyší hlasovku (své vlastní výhružky Matesovi)
  - Reakce: "This is too much. TOO MUCH. Mates must go. And Milan... he knows."
- [ ] Nový quest objective: `quest_figurova_mates` – "Zlikviduj Matese pro Figurovou"
- [ ] Nový quest objective: `quest_figurova_milan` – "Zlikviduj Milana pro Figurovou"

### 8b. Vražda Matese
- [ ] Figurová dá hráči nůž: `gs.inv.fig_nuz = 1`
- [ ] Přidat `fig_nuz: 0` do `gs.inv`
- [ ] Nová dynamická volba u Matese: `🔪 (Použít nůž)` (podmínka: `fig_nuz` v inventáři + quest aktivní)
- [ ] Funkce `q_mates_kill()`:
  - Animace/text: Mates padá na zem, vykrvácí
  - `gs.story.mates_dead = true`
  - Odstranit Matese z `currentNPCs`
  - `gs.inv.fig_nuz = 0`
  - `gs.taboo.murder_mates = true`
  - Log: dramatický text
- [ ] Po vraždě Matese – Mates zmizí z hospody permanentně

### 8c. Vražda Milana
- [ ] Figurová dá hráči zbraň: `gs.inv.fig_gun = 1`
- [ ] Přidat `fig_gun: 0` do `gs.inv`
- [ ] PŘED střelbou: nová dynamická volba u Milana: `📱 Požádat o zapůjčení mobilu`
  - Funkce `q_milan_give_phone()`: `gs.inv.milan_phone = 1`, `gs.story.milan_phone_taken = true`
  - Důvod: v mobilu jsou důkazy, nechceme aby zůstaly u mrtvoly
- [ ] Přidat `milan_phone: 0` do `gs.inv`
- [ ] Dynamická volba u Milana: `🔫 (Použít zbraň)` (podmínka: `fig_gun` v inventáři + quest aktivní)
  - Podmínka: zobrazí se vždy, ale hráč může nejdřív vzít telefon
- [ ] Funkce `q_milan_shoot()`:
  - Animace/text: Milan zastřelen
  - `gs.story.milan_shot = true`
  - Odstranit Milana z `currentNPCs`
  - `gs.inv.fig_gun = 0`
  - `gs.taboo.murder_milan = true`
  - Log: dramatický text

### 8d. Návrat k Figurové po vraždách
- [ ] Nový Figurová dialog stage – obě vraždy hotové:
  - Podmínka: `mates_dead && milan_shot`
  - Pokud hráč má `milan_phone`: Figurová vezme telefon, dá 3000 Kč, slíbí Fábii
  - Pokud hráč NEMÁ telefon: Figurová dá 3000 Kč, ale je nervózní z důkazů u mrtvoly
- [ ] Funkce `q_figurova_dark_reward()`:
  - `gs.money += 3000`
  - `gs.inv.milan_phone = 0` (pokud měl)
  - `gs.story.figurova_dark_done = true`
  - `gs.story.fabie_promised = true`
  - Log: Figurová slíbila Fábii
  - fnotif: +3000 Kč

### 8e. Fábie na mapě
- [ ] Po dokončení temné linky se v Křemži objeví Fábie (vizuální artefakt)
- [ ] Přidat Fábii jako statický objekt v `render.js` – vykreslí se v Křemži
  - Podmínka: `gs.story.fabie_promised === true`
  - Pozice: někde na náměstí
  - Nelze interagovat, jen vizuální
- [ ] Vykreslení: jednoduchý pixel-art auto (obdélník + kola + text "FÁBIE")

---

## 9. JOHNNY/JANA – TAJNÝ ČASOVAČ + JOHNNYHO VILA

### 9a. Časovač v hospodě
- [ ] Pokud hráč v hospodě NEPOMŮŽE Janě (nezvolí `q_jana_rescue`), spustí se tajný časovač
- [ ] Časovač: ~60 sekund od zobrazení Jany v hospodě
- [ ] Po vypršení: Johnny + Jana zmizí z hospody
- [ ] `gs.story.johnny_took_jana = true`
- [ ] Log: "Johnny a Jana odešli z hospody. Johnny vypadal nadšeně. Jana... ne."

### 9b. Nová místnost: Johnnyho vila
- [ ] Přidat místnost `johnny_vila` do `ROOMS` v `config.js`:
  - name: "Johnnyho vila"
  - icon: "🏠"
  - bg: tmavá barva
  - npcs: ['johnny_vila_johnny', 'johnny_vila_jana'] (speciální verze postav)
- [ ] V Křemži – jeden z domů v pozadí přejmenovat na "Johnnyho vila"
- [ ] Vstup do vily: klávesa E u domu v Křemži (podmínka: `johnny_took_jana === true`)
- [ ] Přidat proximity check pro dům v `game.js`
- [ ] Přidat `johnny_vila` pozici domu v Křemži (rx, ry pro interakci)

### 9c. Render vily v Křemži
- [ ] V `render.js` – přidat jméno "Johnnyho vila" na jeden z domů v pozadí
- [ ] Upravit existující kreslení domů nebo přidat nový dům s popiskem

### 9d. Obývák Johnnyho – NPCs a dialogy
- [ ] Jana v obýváku – křičí, prosí o pomoc
  - Dialog: "Fando! Prosím, pomoz mi! Johnny je šílenej!"
- [ ] Johnny v obýváku – neústupný
  - Dialog: "Klid, brácho. Janě se to líbí. Podívej se na ni, je nadšená."
  - Žádná přímá volba ho zastavit dialogem

### 9e. Želízka v obýváku
- [ ] Přidat item spawn: želízka (pozice v rohu místnosti)
- [ ] Hráč musí projít místností a najít želízka (klávesa E)
- [ ] `gs.inv.zelizka = 1`
- [ ] Přidat `zelizka: 0` do `gs.inv`

### 9f. Spoutání Johnnyho
- [ ] Dynamická volba u Johnnyho: `⛓️ Použít želízka` (podmínka: `zelizka` v inventáři)
- [ ] Funkce `q_johnny_cuff()`:
  - `gs.inv.zelizka = 0`
  - `gs.story.johnny_cuffed = true`
  - Johnny uváže ke stolu
  - Log: "Spoutal jsi Johnnyho ke stolu. Řve na tebe, ale nemůže se pohnout."
  - Jana je zachráněna

### 9g. Janina vděčnost (v obýváku)
- [ ] Po spoutání Johnnyho – Jana dialog:
  - "Fando... Ty jsi... Díky." *podívá se na tebe* "Tady je moje číslo. A kdybys potřeboval cokoliv..."
  - Odměna: `gs.inv.jana_cislo = 1`, REP +15
  - `gs.story.jana_rescued_villa = true`

---

## 10. JOHNNY/JANA – TEMNÁ CESTA V OBÝVÁKU

Hráč se rozhodne Janě NEPOMOCI v obýváku.

### 10a. Odejít
- [ ] Volba u Jany nebo obecná: `(Odejít)` – hráč prostě odejde z vily
- [ ] Žádná odměna, žádný trest
- [ ] `gs.story.jana_abandoned = true`

### 10b. Hodit něco do pití
- [ ] V kuchyňské lince najít drink/sklenici (item v místnosti)
- [ ] Dynamická volba: `💊 Hodit něco do pití` (podmínka: hráč je u kuchyňské linky)
  - Otázka: co přesně hráč hodí? (kratom? prášek? – nechat na uživateli, zatím generický)
- [ ] Funkce `q_johnny_drug_drink()`:
  - Jana usne / ztichne
  - `gs.story.jana_drugged = true`
  - `gs.taboo.drugged_jana = true`
  - Johnny: "Díky brácho, jsi frajer!" → 500 Kč + REP
  - `gs.money += 500`
  - `gainRep(X, 'Pomohl Johnnymu')`
- [ ] Morální důsledky: taboo flag pro ending

---

## 11. TECHNICKÉ ÚPRAVY

### 11a. Nové soubory (pokud potřeba)
- [ ] `game/js/achievements.js` – systém achievementů
- [ ] Přidat `<script>` tag do `index.html` pro nové JS soubory
- [ ] Nové obrázky (placeholdery): `screenshot.png`, `foto_kubatova.png`, `cert_c2.png`
- [ ] Nové audio (placeholder): `hlasovka.mp3`

### 11b. Úpravy existujících souborů
- [ ] `state.js` – nové inventory itemy, achievement pole, nové story flagy
- [ ] `config.js` – nové/upravené dialogy Milan, Figurová, Johnny, Jana; nová místnost
- [ ] `dialog.js` – nové dynamické volby, nové overlay funkce
- [ ] `quests.js` – nové quest funkce
- [ ] `game.js` – proximity check pro Johnnyho dům, vstup do vily
- [ ] `render.js` – Fábie na mapě, Johnnyho vila popisek, želízka v obýváku
- [ ] `index.html` – nové overlay HTML elementy
- [ ] `objectives.js` / `config.js` OBJ_DEFS – nové quest objectives

### 11c. Nové quest objectives
- [ ] `quest_figurova_screenshot` – "Předat screenshot Figurové"
- [ ] `quest_figurova_blackmail` – "Vydírat Figurovou"
- [ ] `quest_figurova_mates` – "Zlikviduj Matese pro Figurovou"
- [ ] `quest_figurova_milan` – "Zlikviduj Milana pro Figurovou"
- [ ] `quest_figurova_dark` – "Vrať se k Figurové po vykonání práce"
- [ ] `quest_johnny_vila` – "Najdi Janu v Johnnyho vile"
- [ ] `achievement_c2` – achievement, ne quest

---

## POŘADÍ IMPLEMENTACE

1. **Milan – odebrat kratom prodej** (jednoduchý, základ)
2. **Pája – odebrat kratom za REP** (jednoduchý)
3. **Screenshot + hlasovka systém** (overlay, itemy)
4. **Milan – předání screenshotu** (nový dialog)
5. **Fotka s Kubátovou** (podmíněný důkaz)
6. **Milan po varování – čeká na Matese** (úprava odchodu)
7. **Figurová – vydírání** (nové volby + certifikát)
8. **Kratom-kafe podmínka REP < 50** (jednoduchá úprava)
9. **Figurová temná linka** (vraždy + Fábie)
10. **Johnny/Jana časovač + vila** (nová místnost)
11. **Johnny/Jana obývák mechaniky** (želízka, temná cesta)
12. **Achievement systém** (základ)
