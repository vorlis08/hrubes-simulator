# Plánovaná vylepšení – František Hrubeš Simulator 2026

Tohle je seznam věcí, co by šly do hry přidat. Některé jsou hotové, některé rozpracované, některé zatím jen nápady. U každého bodu je napsáno co to je, proč to tam patří a jak by se to technicky řešilo.

---

## 1. NOVÉ QUESTY

### 1.1 Maturitní týden ✅ IMPLEMENTOVÁNO

Jakmile zmizí Číhalová (collapsed/dead/burned), objeví se v učebně pan Novák — starý učitel, co tady dělá celý život a dávno ho to přestalo bavit. Školu má v paži, ředitelku nemůže ani cítit, ale vtipkovat umí a za sprostý slovo nejde daleko. Přebírá zkoušení po Číhalové.

**Jak to funguje:**
- Novák se ukáže až po zmizení Číhalové (filtr v `game.js`, řádek ~98)
- Po prvním rozhovoru nabídne 3 cesty k maturitě:

**Cesta 1 – Taháky (podvod)**
- Koupíš taháky od Milana za 200 Kč (nebo od Mikuláše, pokud je Milan mrtvý)
- Prodáš je Novákovi – ten je dá třídě za 800 Kč
- 50% šance že tě Novák načapá → přijdeš o taháky i prachy
- Pokud projde: +8 REP, vysvědčení, maturita hotová

**Cesta 2 – Legitimní zkouška (kvíz)**
- 5 otázek z českých reálií (Máj, Brno, 14 krajů, 1918, Havel)
- Stačí 3/5 správně → +15 REP, vysvědčení
- Propadák → -5 REP, můžeš to zkusit znovu
- Technicky: quiz objekt sdílený přes `gs._maturita_quiz`, closure bug opraven (otázky se posouvají přes `quiz.current` na objektu, ne přes lokální proměnnou)

**Cesta 3 – Donášení (Krejčí)**
- Nahlásíš podvádějící spolužáky Krejčí
- Pokud máš splněný Krejčí quest (`s.krejci >= 2`) A vyhranou KGB minihru (`s.kgb_won`): Krejčí to vyřídí po svém — KGB styl eliminace, spolužáci záhadně zmizí, +20 REP, vysvědčení
- Pokud NE: normální byrokratická cesta, Krejčí ti pomůže úředně, -8 REP protože tě třída nesnáší, ale maturitu dostaneš
- Pokud odmítneš spolupracovat: death screen "VYLOUČEN ZE ŠKOLY"

**Kde v kódu:**
- NPC definice: `config.js` (novak s 4 dialog stages)
- Dialog logika: `dialog.js` (getStage case 'novak', dynamické volby v showDialog)
- Quest handlery: `quests.js` (q_novak_intro, q_maturita_tahaky/legit/donaseni, q_maturita_quiz, _maturita_answer, _maturita_quiz_result, q_maturita_report_krejci)
- Artefakt: `maturita` key v ART_KEYS_DISPLAY, ART_DEFS_DISPLAY, ART_DEFS

---

### 1.2 Šamanova minulost ✅ IMPLEMENTOVÁNO

Po 5 nákupech kratomu se Šaman rozpovídá. Býval učitel matiky na téhle škole, vyhodili ho za "alternativní výukové metody" (učil přes meditaci a byliny). Teď chce uvařit elixír mládí — ale potřebuje ingredience z celé mapy.

**Jak to funguje:**
- Počítadlo `saman_buys` v `quests.js` (inkrementuje se při každém nákupu 50g/200g)
- Při 5+ nákupech se odemkne dialog stage 3 (nabídka elixír questu)
- Hráč musí sebrat 3 ingredience z různých lokací:
  - **Bylina** – Cibulkova laboratoř (`cibulka_lab`, pozice 0.30/0.45)
  - **Voda** – Koupelna Johnnyho vily (`koupelna`, pozice 0.40/0.38)
  - **Prach z pentagramu** – Mikulášův sklep (`sklep`, pozice 0.50/0.72)
- Sběr přes proximity system v `checkProx()` a `interact()` v `game.js`
- Po donesení všech 3: Šaman vytvoří elixír + recepturu, +12 REP

**Elixír mládí (použitelný item):**
- Kliknutím v inventáři se aktivuje 60sekundový trip
- CSS animace `elixirTrip`: hue-rotate 0→360°, saturace 1.8×, periodický Y-flip (svět vzhůru nohama)
- Canvas overlay: duhové rotující kruhy, ghost dvojité vidění, countdown timer vpravo nahoře
- NPC mluví pozpátku (text se reversne v `dialog.js` při `gs.elixir_active`)
- Po 60s automaticky skončí (timer v game loop)

**Kde v kódu:**
- State: `gs.elixir_active`, `gs.elixir_end` v `state.js`
- Funkce: `useElixir()`, `endElixir()` v `items.js`
- Vizuály: `render.js` (elixír overlay blok), `style.css` (@keyframes elixirTrip)
- Dialog efekt: `dialog.js` (reverse text při elixir_active)
- Ingredience proximity: `game.js` checkProx/interact
- Artefakt: `receptura` v ART_KEYS_DISPLAY, ART_DEFS_DISPLAY, ART_DEFS

---

### 1.3 Bezďákova poslední mise 📋 NÁPAD

Bezďák (správce/školník) dostane od Cibulky tajný úkol. Hráč s KGB badge ho může doprovázet do Cibulkovy laboratoře, kde odhalí, že jeden z učitelů je agent GRU (ruská vojenská rozvědka). Musíš ho identifikovat pomocí KGB detektoru a rozhodnout co s ním.

**Možné větve:**
- Nahlásit Cibulkovi → agent zmizí, +REP, nový dialog s Bezďákem
- Vydírat agenta → peníze, ale risk odhalení
- Ignorovat → agent začne sabotovat školu (nové random eventy)

**Proč to tam patří:**
Propojuje Cibulku, Bezďáka a KGB linku do jednoho questu. Dává smysl KGB detektoru mimo Krejčí quest.

---

### 1.4 Lenčina pomsta 📋 NÁPAD

Lenka pracuje v Bille a je Milanova ex. Pokud Milan žije, chce se mu pomstít. Pokud je mrtvý, chce pomstu na tom kdo ho zabil.

**Možné větve:**
- Pomoct Lence → série úkolů (ukrást Milanův telefon, nahrát ho, veřejně zostudit)
- Zradit Lenku → říct Milanovi, získat jeho důvěru
- Využít situaci → vydírat oba

**Proč to tam patří:**
Billa je zatím jen obchod. Lenka by jí dala příběhový důvod k existenci.

---

## 2. NOVÉ MECHANIKY

### 2.1 Rozšířená ekonomika

Momentálně se dá vydělat hlavně prodejem kratomu a jednorázovými quest odměnami. Chybí průběžný příjem a výdaje.

**Co přidat:**
- **Brigáda v Bille** – opakovaný minigame (skenování zboží), 50-100 Kč za směnu, ale stojí to energii
- **Černý trh u Šamana** – dynamické ceny kratomu (nabídka/poptávka), bulk slevy
- **Sázení u Páji** – jednoduché gambling minigames (kostky, karta vyšší/nižší)
- **Dluhový systém** – půjčit si od Johnnyho, ale nesplatit = problém (deadline, násilné vymáhání)
- **Cena žemlí roste** – inflace, čím déle hraješ tím dražší je jídlo

### 2.2 Denní/noční cyklus

Herní čas běží (1 reálná minuta = 1 herní hodina). Ráno jsou NPC ve škole, odpoledne ve městě, v noci doma nebo v hospodě.

**Technicky:**
- `gs.gameHour` (0-23), inkrementuje se v update loopu
- Render: postupné ztmavení canvasu (multiply overlay), pouliční světla v noci
- NPC mají `schedule` pole: `[{hour:8, room:'ucebna'}, {hour:15, room:'kremze'}, ...]`
- Některé questy jdou dělat jen v noci (vloupání) nebo jen ve dne (škola)

### 2.3 Telefon

Nový UI element (ikona v HUD), otevře overlay s:
- **SMS** – NPC ti píšou (quest hinty, varování, vtípky)
- **Křemžogram** – fake Instagram, NPC postují fotky s komentáři
- **Poznámky** – automatické zápisky z questů (nahrazuje nutnost pamatovat si co dělat)
- **Fotoaparát** – vyfotit NPC/místa pro quest důkazy

### 2.4 NPC vztahový systém

Každé NPC má skryté `affinity` skóre (-100 až +100). Ovlivňuje dialogy, ceny, dostupné questy.

**Jak to funguje:**
- Pozitivní akce (pomoc, dárky, splnění úkolů) → +affinity
- Negativní akce (krádež, donášení, ignorování) → -affinity
- Při affinity < -50: NPC odmítá mluvit, případně aktivně škodí
- Při affinity > 50: speciální dialogy, slevy, exkluzivní questy

### 2.5 Stealth mechanika

Pro questy typu vloupání, špionáž, KGB mise.
- NPC mají kužel viditelnosti (vizualizovaný na canvasu)
- Hráč se schová za objekty (regál, auto, strom)
- Detekce = alarm → útěk nebo boj

---

## 3. NOVÉ MINIGAMES

### 3.1 Vaření blendu
Cooking mama styl — správné pořadí ingrediencí, timing míchání, teplota. Kvalita výsledku ovlivňuje sílu tripu.

### 3.2 Hacking
Wordle-like — hádáš heslo, systém ti říká kolik písmen sedí. Pro questy s počítači (Cibulkova lab, školní systém).

### 3.3 Honička ve Fábii
Side-scrolling jízda — uhýbáš autům, policii, krávám na silnici. Pro útěkový ending nebo quest doručování.

### 3.4 Exorcismus
Rhythm game — ťukáš ve správný moment při šamanově rituálu. Přesnost ovlivňuje výsledek.

---

## 4. OPTIMALIZACE ✅ HOTOVO

Render pipeline byl hlavní bottleneck — 194 gradient creací za frame.

**Co se udělalo:**
- **OverlayCache** (`optimization.js`) – vigneta, scanlines a ambient occlusion se renderují jednou do offscreen canvasu, pak jen `drawImage`. Auto-invalidace při změně rozlišení.
- **FPS quality tiers** – `FPSMonitor` měří průměrné FPS a nastavuje tier 0-3. Tier 0 = minimum (žádné scanlines/AO), tier 3 = plná kvalita.
- **GradientCache invalidace** – `gradientCache.clear()` při resize okna, aby se nepoužívaly gradienty se starými rozměry.
- **SpatialHash** – připravená třída pro prostorové dotazy (kolize, proximity), zatím nenapojená ale ready k použití.

---

## 5. NOVÉ LOKACE

### 5.1 Hřbitov
Za městem. Hrobník (nové NPC) — ví věci, co nikdo jiný. KGB dokumenty ukryté v hrobce. Noční atmosféra, mlha, zvuky.

### 5.2 Benzínka
Na kraji Křemže. Prodavač prodává jídlo (dražší než Billa ale otevřeno v noci). Rádio hraje a občas vysílá "zprávy z Křemže" — dynamicky generované podle herního stavu.

### 5.3 Střecha školy
Tajný přístup přes chodbu. Místo pro:
- Schůzky s NPC co nechtějí být viděni
- Zbavení se důkazů (hodit z okna)
- Kouření s Milanem (bonus dialog)
- Panorama Křemže (easter egg)

---

## 6. SYSTÉM KONCOVEK

8 různých endingů podle toho co hráč udělal:

| # | Název | Podmínka | Popis |
|---|-------|----------|-------|
| 1 | Král Křemže | REP 200+, žádné vraždy | Fanda se stane legendou města. Všichni ho respektují. |
| 2 | Stín | Všechny vraždy, REP 100+ | Nikdo neví co jsi udělal, ale všichni se tě bojí. |
| 3 | Útěk | Fábie + benzín + REP < 50 | Nasedneš do Fábie a zmizíš z Křemže navždy. |
| 4 | Vězení | 2+ vraždy, důkazy nezničeny | Policie tě dostane. Cutscene v cele. |
| 5 | Transcendence | Všechny kratom questy | Šaman tě zasvětí. Fanda transcenduje realitu. |
| 6 | Double agent | KGB badge + Pláteníková quest | Pracuješ pro obě strany. Nikdo ti nevěří, ale všichni tě potřebují. |
| 7 | Láska | Jana affinity 80+ | Fanda a Jana spolu. Wholesome ending (relativně). |
| 8 | True ending | Všechny questy + artefakty | 4th wall break. Fanda zjistí že je ve hře. |

---

## 7. QUALITY OF LIFE

- **Rychlé cestování** – po návštěvě lokace se odemkne fast travel (mapa s kliknutím)
- **Nastavení** – hlasitost, obtížnost (ovlivňuje energy drain, ceny, šance na úspěch)
- **Statistiky** – počet kroků, zabitých NPC, sněžených žemlí, utracených peněz
- **New Game+** – po dokončení hry začni znovu s bonusy (více peněz, rychlejší pohyb, speciální dialog)
- **Achievements overlay** – 30-50 achievementů (vtipné názvy, skryté podmínky)
