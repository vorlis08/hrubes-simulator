# PLÁN: Figurová Quest – Přepis & Nový Obsah
> Stav: DOKONČENO ✅  
> Poslední aktualizace: 2026-04-15

---

## PŘEHLED ZMĚN

### Co se mění/opravuje
- Dva překrývající se questy (milan_protiutok + milan_told_figurova_spy) → sjednotit do jednoho
- Milan nově odpoví popup dialogem (ne addLog)
- Milan už **neposílá** hráče za Honzou pro fent kafe
- Stará fent_kava/q_honza_fent path → deaktivovat z Milan triggeru (kód může zůstat)

### Co se přidává
1. **Mechanika: Promluva hráče** (player-speech dialog – jiný vizuál)
2. **Možnost 1** – Figurová zavést do sklepa, Kubátová sežere hlavu
3. **Možnost 2** – Honzova propiska se šokem, Figurová podepíše + zemře
4. **Artefakt** – foto_figurova
5. **Fail stav** – omluvenka bez propisky (zmařen quest, Figurová posílá za Martou)

---

## FÁZE A – Oprava duplicitního Milan triggeru
**Soubory: `dialog.js`, `quests.js`**

### [x] A1 – Smazat q_milan_told_figurova_spy z dialog.js
- Řádek cca 379–381 v `dialog.js`:
  ```javascript
  if(gs.story.milan_explained_figurova && gs.story.figurova === 1 && !gs.story.milan_knows_fig_spy && !gs.story.milan_protiutok_asked)
    choices.push({label:'🕵️ "Figurová mě na tebe poslala špiclovat."', ...fn:'q_milan_told_figurova_spy'});
  ```
  → **Smazat celý tento blok.** Zbyde jen `q_milan_protiutok`.

### [x] A2 – Podmínku `q_milan_protiutok` rozšířit
- Aktuálně podmínka: `gs.story.figurova === 1 && gs.story.milan_met && !gs.story.milan_protiutok_asked && !gs.story.milan_fig_evidence && gs.rep < 50`
- Nová podmínka (odstranit `gs.rep < 50` – má být dostupné vždy po prvním setkání):
  ```javascript
  if(gs.story.figurova === 1 && gs.story.milan_met && !gs.story.milan_protiutok_asked && !gs.story.milan_fig_evidence)
    choices.push({label:'🕵️ "Figurová mě na tebe poslala..."', cls:'danger', fn:'q_milan_protiutok', sub:'Říct Milanovi pravdu'});
  ```

### [x] A3 – Přepsat q_milan_protiutok v quests.js (řádek 749)
Nová verze:
```javascript
q_milan_protiutok(){
  gs.story.milan_protiutok_asked = true;
  gs.story.milan_knows_fig_spy = true;
  closeDialog();
  setTimeout(() => {
    showNPCLine('milan',
      '"Takže ona tě na mě poslala?!" *zaskřípe zubama, pak se uklidní* "Dobrej. Díky, že mi to říkáš." *chvíli přemýšlí* "Poslouchej – já ti říct, co máš dělat, nemůžu. To musíš vyřešit sám. Ale Figurová se musí přestat motat do mých věcí. Nějak to zařiď." *mávne rukou* "Já ti věřím, že na něco přijdeš."',
      () => { addObj('quest_figurova_vyres'); }
    );
  }, 200);
},
```
- **Odstranit** `gs.story.honza_mission = true` a `addObj('quest_honza_fent')`
- Přidat nový quest objective `quest_figurova_vyres`

### [x] A4 – Přidat nový quest objective do config.js (OBJ_DEFS, cca řádek 688+)
```javascript
{id:'quest_figurova_vyres', tag:'Tajné', text:'Vyřeš situaci s Figurovou'},
```

### [x] A5 – Přidat quest do profile.js (questsCompleted + QUEST_DEFS)
- `questsCompleted`: `quest_figurova_vyres: false`
- `QUEST_DEFS`: `{ id:'quest_figurova_vyres', tag:'Tajné', name:'Vyřeš situaci s Figurovou' }`

---

## FÁZE B – Nová mechanika: Promluva hráče (Player Speech Dialog)
**Soubory: `dialog.js`, `style.css`**

### [x] B1 – CSS třída `player-mode` na `#dbox` (style.css)
Přidat do sekce dialogu (hledat `#dbox`):
```css
#dbox.player-mode {
  border-color: var(--gold);
  background: linear-gradient(135deg, rgba(20,12,0,0.97), rgba(30,18,2,0.97));
}
#dbox.player-mode #dmeta {
  flex-direction: row-reverse;
}
#dbox.player-mode #dname {
  text-align: right;
  color: var(--gold);
}
#dbox.player-mode #drole {
  text-align: right;
}
```

### [x] B2 – Funkce showPlayerLine() v dialog.js (za closeNPCLine, cca řádek 493)
```javascript
function showPlayerLine(text, callback) {
  const box = document.getElementById('dbox');
  box.classList.add('player-mode');
  document.getElementById('dav').textContent   = '🎒';
  document.getElementById('dname').textContent = 'FANDA';
  document.getElementById('drole').textContent = '';
  typeText(document.getElementById('dtxt'), text, 16);
  document.getElementById('dchoices').innerHTML =
    `<button class="db prim" onclick="closePlayerLine()">Pokračovat</button>`;
  gs._playerLineCallback = callback || null;
  document.getElementById('dov').classList.add('on');
}
function closePlayerLine() {
  document.getElementById('dbox').classList.remove('player-mode');
  document.getElementById('dov').classList.remove('on');
  for(const k in keys) keys[k] = false;
  gs.player.mv = false;
  const cb = gs._playerLineCallback;
  gs._playerLineCallback = null;
  if(cb) setTimeout(cb, 150);
}
```

---

## FÁZE C – Možnost 2: Honza + propiska (nový content)
**Soubory: `dialog.js`, `quests.js`, `state.js`, `config.js`, `index.html`, `style.css`**

### [x] C1 – Přidat `propiska: 0` do gs.inv v state.js

### [x] C2 – Přidat ITEM_DESCS.propiska v config.js
```javascript
propiska: 'Speciální propiska koupená na Temu. Zmáčkni a projede tě elektrický šok. Původně koupená s Mikulášem na Fandu.',
```

### [x] C3 – Přidat slot propisky do index.html (sekce inventáře, za fent_kava)
```html
<div class="isl" id="sl-propiska" title="✏️ Speciální propiska ze šoku" style="display:none">
  <span class="ik">⚡</span><span class="ii">✏️</span><span class="ic" id="ic-propiska">1</span><span class="ilbl">Propiska</span>
</div>
```

### [x] C4 – Dynamické volby u Honzy v dialog.js (do bloku `if(npc.id === 'honza')`)
Přidat za existující Honza bloky:
```javascript
// Honza – hráč hledá pomoc s Figurovou (po Milan protiutok)
if(npc.id === 'honza' && gs.story.milan_knows_fig_spy && !gs.story.figurova_killed
   && !gs.story.honza_propiska_asked && !gs.story.figurova_kratomed && !gs.story.figurova_fent)
  choices.push({label:'🤔 "Ty máš vždycky u sebe různé píčovinky. Neměl bys něco i pro mě?"', cls:'special', fn:'q_honza_propiska_ask'});
// Honza – prohledat kapsy
if(npc.id === 'honza' && gs.story.honza_propiska_asked && !gs.story.honza_kapsy_prohledany)
  choices.push({label:'👃 "Prohledej kapsy"', cls:'special', fn:'q_honza_kapsy'});
// Honza – zeptat se na propisku
if(npc.id === 'honza' && gs.story.honza_kapsy_prohledany && !gs.story.honza_propiska_info_given)
  choices.push({label:'✏️ "Hele, ta propiska..."', cls:'special', fn:'q_honza_propiska_info'});
// Honza – vzít propisku (po zjištění info)
if(npc.id === 'honza' && gs.story.honza_propiska_info_given && !gs.inv.propiska)
  choices.push({label:'✏️ "Dáš mi ji?"', cls:'prim', fn:'q_honza_get_propiska'});
```

### [x] C5 – Quest funkce v quests.js (za q_honza_cibule_reward, sekce Honza)

```javascript
q_honza_propiska_ask(){
  gs.story.honza_propiska_asked = true;
  showNPCLine('honza', '"Hmm..." *zamyslí se a pokrčí rameny* "Teď u sebe nic nemám. Upřímně." *odmlčí se* "...počkej. Hele – zkusím prohledat kapsy, možná tam něco je."');
},
q_honza_kapsy(){
  gs.story.honza_kapsy_prohledany = true;
  showNPCLine('honza', '"Tak... tady mám dvě pětikoruny." *cinknou o stůl* "Pablo nikotinový sáčky – čili pytel, nebo puk, jak chceš." *vytáhne kapesník* "Kapesník. A..." *podívá se s překvapením* "...propisku. Hele, to jsem ani nevěděl, že ji mám."');
},
q_honza_propiska_info(){
  gs.story.honza_propiska_info_given = true;
  closeDialog();
  setTimeout(() => {
    showNPCLine('honza',
      '"Ta propiska?" *mírně se uculí* "To je speciální věc. Koupil jsem ji na Temu – když ji někdo zmáčkne, proběhne elektrický šok." *pauza* "Původně jsem ji koupil spolu s Mikulášem na tebe, abysme si z tebe udělali prdel."',
      () => {
        // Fanda reaguje – player speech
        showPlayerLine('"Jste magoři."', () => {
          showNPCLine('honza',
            '"Jsem si toho vědom." *odfrknul si* "Ale je to pro prdel. Jestli tě tohle překvapilo, tak se máš na co těšit." *přikloní se blíž* "Kdybys jen viděl Mikulášovu sbírku..."'
          );
        });
      }
    );
  }, 200);
},
q_honza_get_propiska(){
  gs.inv.propiska = 1; updateInv();
  gs.story.honza_propiska_got = true;
  addLog('Dostal jsi propisku od Honzy. ✏️⚡', 'lm');
  fnotif('✏️ Propiska +1','itm');
  closeDialog();
},
```

---

## FÁZE D – Možnost 2: Figurová + omluvenka + propiska
**Soubory: `dialog.js`, `quests.js`**

### [x] D1 – Dynamické volby u Figurové v dialog.js

Přidat do bloku `if(npc.id === 'figurova')`:
```javascript
// Omluvenka – poprvé (dostupná kdykoli po milan_knows_fig_spy a POKUD není sklep option aktivní)
if(npc.id === 'figurova' && gs.story.milan_knows_fig_spy
   && !gs.story.figurova_killed && !gs.story.figurova_omluvenka_asked
   && !gs.story.figurova_sklep_started)
  choices.push({label:'📝 "Mohla byste mi podepsat omluvenku?"', cls:'special', fn:'q_figurova_omluvenka_ask'});

// Omluvenka – znovu po zmaru (Figurová odpoví "jdi za Martou")
if(npc.id === 'figurova' && gs.story.figurova_omluvenka_failed && !gs.story.figurova_killed)
  choices.push({label:'📝 "Mohla byste mi podepsat omluvenku?"', cls:'special', fn:'q_figurova_omluvenka_fail2'});

// Nabídnout propisku (jen pokud sahá pro tužku + hráč ji má)
if(npc.id === 'figurova' && gs.story.figurova_omluvenka_asking && gs.inv.propiska > 0)
  choices.push({label:'✏️ "Přinesl jsem propisku ze Švýcarska – musíte zkusit."', cls:'danger', fn:'q_figurova_propiska_offer', sub:'Šok'});

// Nechat ji podepsat vlastní (zmarnění questu)
if(npc.id === 'figurova' && gs.story.figurova_omluvenka_asking && !gs.story.figurova_killed)
  choices.push({label:'(Nechat ji podepsat vlastní)', cls:'danger', fn:'q_figurova_omluvenka_no_propiska'});
```

### [x] D2 – Quest funkce v quests.js

```javascript
q_figurova_omluvenka_ask(){
  gs.story.figurova_omluvenka_asked = true;
  gs.story.figurova_omluvenka_asking = true;
  closeDialog();
  setTimeout(() => {
    showNPCLine('figurova',
      '"Omluvenka." *zvedne obočí* "Fine. Dám ti ji." *sahá do tašky pro tužku*',
      () => {
        const f = currentNPCs.find(n => n.id === 'figurova');
        if(f) showDialog(f);
      }
    );
  }, 200);
},
q_figurova_propiska_offer(){
  if(!gs.inv.propiska){ addLog('Nemáš propisku!','lw'); closeDialog(); return; }
  gs.inv.propiska = 0; updateInv();
  gs.story.figurova_omluvenka_asking = false;
  gs.story.figurova_killed = true;
  gs.story.figurova_propiska_kill = true;
  closeDialog();
  setTimeout(() => {
    showNPCLine('figurova',
      '"Ze Švýcarska?" *pochybovačně zvedne obočí* "Fine. Ukažte." *bere propisku, zkusí ji zmáčknout*',
      () => {
        addLog('*Prošlehlo to. Figurová ani nevydala zvuk. Padla k zemi.*','lw');
        fnotif('Figurová zemřela ⚡','rep');
        currentNPCs = currentNPCs.filter(n => n.id !== 'figurova');
        gs.story.figurova_sanitka = true;
        doneObj('side_figurova');
        doneObj('quest_figurova_vyres');
      }
    );
  }, 200);
},
q_figurova_omluvenka_no_propiska(){
  gs.story.figurova_omluvenka_asking = false;
  gs.story.figurova_omluvenka_failed = true;
  closeDialog();
  setTimeout(() => {
    showNPCLine('figurova', '"Good." *podepíše a hodí papír* "Hotovo."');
    addLog('Figurová podepsala omluvenku. Quest zmařen – bez propisky se nic nestalo.','lw');
    fnotif('Quest zmařen','lw');
  }, 200);
},
q_figurova_omluvenka_fail2(){
  closeDialog();
  setTimeout(() => {
    showNPCLine('figurova',
      '"Já jsem ti přece něco podepisovala, Hrubeši. Nemám celý den na tvoje píčoviny." *nepodívá se na tebe* "Jestli mě chceš otravovat s každou píčovinou, jdi si za Martou. Ta už mě taky začíná pomalu srát."'
    );
  }, 200);
},
```

---

## FÁZE E – Možnost 1: Sklep + Kubátová (HLAVNÍ NOVÁ VĚTEV)
**Soubory: `dialog.js`, `quests.js`, `game.js`, `render.js`, `config.js`, `state.js`**

### [x] E1 – Dynamická volba u Figurové v dialog.js

```javascript
// Sklep – dostupné jen pokud je Kubátová quest dokončen (sklep_unlocked nebo mraz_done)
if(npc.id === 'figurova' && gs.story.milan_knows_fig_spy
   && (gs.story.mraz_done || gs.story.sklep_unlocked)
   && !gs.story.figurova_sklep_started && !gs.story.figurova_killed
   && !gs.story.figurova_kratomed && !gs.story.figurova_fent && !gs.story.figurova_dark_done)
  choices.push({label:'🕳️ "Špicloval jsem Milana. Mám pro tebe dobrou zprávu."', cls:'special', fn:'q_figurova_sklep_start', sub:'Odemčeno – byl jsi v sklepě'});
```

### [x] E2 – Quest funkce q_figurova_sklep_start

```javascript
q_figurova_sklep_start(){
  gs.story.figurova_sklep_started = true;
  closeDialog();
  setTimeout(() => {
    showNPCLine('figurova',
      '"Dobrou zprávu?" *přimhouří oči* "O čem mluvíte, Hrubeši?"',
      () => {
        showPlayerLine(
          '"Špicloval jsem Milana. Našel jsem skrytou místnost – schovává tam všechno svoje zboží. Hory kratomu, šňupací tabák, dokonce pár nakradených počítačů od Boxanový."',
          () => {
            showNPCLine('figurova',
              '"Evidence..." *vstane* "I do NOT want to hear it. I want to SEE it. Ukažte mi tu místnost." *sbírá tašku*',
              () => {
                gs.story.figurova_following = true;
                addLog('Figurová tě následuje. Zaveď ji ke vchodu do sklepa (v Bille).', 'ls');
                fnotif('Figurová tě sleduje 🧐','pos');
                // Zamknout normální dialog s Figurovou během sledování
              }
            );
          }
        );
      }
    );
  }, 200);
},
```

### [x] E3 – Following mechanic v game.js (herní smyčka)

V hlavní update funkci (hledat `function gameLoop` nebo kde se hýbe hráč) přidat:
```javascript
// Figurová sleduje hráče
if(gs.story.figurova_following && !gs.story.figurova_at_door) {
  const fig = currentNPCs.find(n => n.id === 'figurova');
  if(fig) {
    const dx = gs.player.x - fig.x;
    const dy = gs.player.y - fig.y;
    const d = Math.hypot(dx, dy);
    if(d > 60) { // min vzdálenost aby nešla přesně na hráče
      const spd = 2.5;
      fig.x += (dx / d) * spd;
      fig.y += (dy / d) * spd;
    }
  }
}
```

Blokovanie dialogu s Figurovou při sledování – v `showDialog()`:
```javascript
// Na začátku showDialog():
if(npc.id === 'figurova' && gs.story.figurova_following && !gs.story.figurova_at_door) {
  addLog('Figurová tě sleduje. Zaveď ji ke vchodu do sklepa.', 'ls');
  return;
}
```

### [x] E4 – Interakce u dveří sklepa v checkProx() (game.js)

V Bille, poblíž souřadnic sklepního vchodu (rx: 0.63, ry: 0.65 z changeRoom kódu):
```javascript
// Figurová following – dveře do sklepa
if(gs.room === 'billa' && gs.story.figurova_following && !gs.story.figurova_at_door) {
  const doorX = canvas.width * 0.63, doorY = canvas.height * 0.75;
  if(dist2(p, {x:doorX, y:doorY}) < PROX_R * 2) best = {isFigurovaSklep: true};
}
```

### [x] E5 – Proximity label + interact() pro isFigurovaSklep (game.js)

V bloku proximity labeling:
```javascript
} else if(best.isFigurovaSklep) {
  document.getElementById('ptxt').textContent = 'Zastavit se u dveří';
}
```

V interact():
```javascript
if(best.isFigurovaSklep) { QF.q_figurova_arrive_door(); return; }
```

### [x] E6 – Quest funkce q_figurova_arrive_door

```javascript
q_figurova_arrive_door(){
  gs.story.figurova_at_door = true;
  gs.story.figurova_following = false;
  // Posunout Figurovou na souřadnice dveří
  const fig = currentNPCs.find(n => n.id === 'figurova');
  if(fig) { fig.x = canvas.width * 0.63; fig.y = canvas.height * 0.75; }
  closeDialog();
  setTimeout(() => {
    showNPCLine('figurova',
      '"Zde?" *kouká na dveře, zaváhá* "Je tam... strašná tma." *přikročí těsně ke dveřím a zastaví se* "Já se... sklepů bojím."',
      () => {
        // Zobrazit volby pro hráče
        document.getElementById('dav').textContent   = '🧐';
        document.getElementById('dname').textContent = 'FIGUROVÁ';
        document.getElementById('drole').textContent = 'Stojí u dveří';
        document.getElementById('dtxt').textContent  = 'Figurová se zastavila. Nervy. Přesně tak, jak jsi čekal.';
        document.getElementById('dchoices').innerHTML = `
          <button class="db danger" onclick="runQF('q_figurova_kick')">👟 Skopnout ji dolů</button>
          <button class="db" onclick="closeDialog()">Nechat ji, ať se rozmyslí</button>`;
        document.getElementById('dov').classList.add('on');
      }
    );
  }, 300);
},
```

### [x] E7 – Quest funkce q_figurova_kick

```javascript
q_figurova_kick(){
  gs.story.figurova_kicked = true;
  gs.story.figurova_following = false;
  gs.story.figurova_at_door = false;
  currentNPCs = currentNPCs.filter(n => n.id !== 'figurova');
  closeDialog();
  addLog('*Figurová vykřikla.* "HRUB–" *pak ticho. Temné, hluboké ticho.*','lw');
  fnotif('Figurová letí dolů 🕳️','rep');
  addLog('Jdi do sklepa za ní.','ls');
},
```

### [x] E8 – Sklep: Figurová leží (initRoom v game.js, sklep sekce)

V `initRoom()`, za existujícím kódem pro `sklep`:
```javascript
// Figurová skopnuta – leží v sklepě, ale ještě žije
if(gs.room === 'sklep' && gs.story.figurova_kicked && !gs.story.figurova_dead_sklep) {
  setTimeout(() => {
    addLog('*Na zemi sklepa... Figurová. Pochroumaná. Ještě se hýbe.*', 'lw');
  }, 600);
}
```

### [x] E9 – Interakce s Figurovou v sklepě (checkProx + interact)

V `checkProx()`, sekce sklep:
```javascript
if(gs.room === 'sklep' && gs.story.figurova_kicked && !gs.story.figurova_dead_sklep) {
  const fx = canvas.width * 0.50, fy = canvas.height * 0.85;
  if(dist2(p, {x:fx, y:fy}) < PROX_R * 1.5) best = {isFigurovaSklep_body: true};
}
```

Proximity label:
```javascript
} else if(best.isFigurovaSklep_body) {
  document.getElementById('ptxt').textContent = 'Promluvit s Figurovou';
}
```

Interact:
```javascript
if(best.isFigurovaSklep_body) { QF.q_figurova_sklep_plea(); return; }
```

### [x] E10 – Quest funkce q_figurova_sklep_plea (player speech mechanic)

```javascript
q_figurova_sklep_plea(){
  // Figurová prosí o pomoc
  showNPCLine('figurova',
    '"Hrubeši..." *hlas se láme* "Prosím... zavolejte pomoc. Nemůžu se pohnout. Prosím vás." *oči se jí zalévají slzami* "Já... já si to nezasloužím..."',
    () => {
      // Fanda odpoví – player speech
      showPlayerLine(
        '"Neměla ses srát do Milana."',
        () => {
          // Zavřít dialog, spustit Kubátová animaci
          gs.story.figurova_plea_done = true;
          QF._start_kubatova_attack();
        }
      );
    }
  );
},
```

### [x] E11 – Kubátová útok + sežrání hlavy

Animace: jednoduchá verze – Kubátová se pohne k Figurové, pak zmizí obě, objeví se animace.

```javascript
_start_kubatova_attack(){
  const kub = currentNPCs.find(n => n.id === 'kubatova');
  const figX = canvas.width * 0.50, figY = canvas.height * 0.85;
  addLog('*Ticho. Pak – svist. Kubátová se pohla.*','lw');
  setTimeout(() => {
    addLog('*Přesun byl bleskový. Ani jsi nestačil zareagovat.*','lw');
    // Animace: Kubátová lunge → pak smrť Figurové
    gs.figurova_death_anim = { x: figX, y: figY, startTime: gs.ts };
    currentNPCs = currentNPCs.filter(n => n.id !== 'figurova'); // pryč
  }, 800);
  setTimeout(() => {
    addLog('*Křik. Krátký. Pak ticho.*','lw');
    addLog('*Kubátová se vzpřímí. Otočí se k tobě. Na tváři krev.*','lw');
    gs.story.figurova_dead_sklep = true;
    fnotif('Figurová... 💀','rep');
    // Malá pauza, pak Kubátová dialog
    setTimeout(() => {
      const kub2 = currentNPCs.find(n => n.id === 'kubatova');
      if(kub2) {
        // Kubátová poděkuje
        showNPCLine('kubatova',
          '"Děkuji ti, Hrubši." *klidný hlas. Jako by se nic nestalo.* "Zařídil jsi to výtečně."',
          () => {
            // Fanda reaguje – player speech
            showPlayerLine(
              '"To bylo možná až moc kruté. Je mi jí trochu líto."',
              () => {
                showNPCLine('kubatova',
                  '"Líto?" *mírně nakloní hlavu* "Ta svině všem vyžrávala obědy z lednice. Každý den. Bez výjimky." *pauza* "Zasloužila si to."',
                  () => {
                    // Reward – foto_figurova
                    gs.inv.foto_figurova = 1; updateInv();
                    addLog('Na památku ti Kubátová podala fotku Figurové. 📸','lm');
                    fnotif('📸 Fotka Figurové!','itm');
                    if(activeProfile){
                      activeProfile.artifacts.foto_figurova = true;
                      profileSaveProgress();
                    }
                    doneObj('side_figurova');
                    doneObj('quest_figurova_vyres');
                  }
                );
              }
            );
          }
        );
      }
    }, 2000);
  }, 1800);
},
```

### [x] E12 – Render animace: figurova_death_anim (render.js)

Podobně jako `mates_death_anim` nebo `milan_death_anim` – krvavá skvrna na místě.
Hledat v render.js kde se kreslí `gs.mates_death_anim` a přidat analogický kód pro `gs.figurova_death_anim`.

### [x] E13 – Render: Figurová leží v sklepě (render.js)

Pokud `gs.story.figurova_kicked && !gs.story.figurova_dead_sklep && gs.room === 'sklep'`:
- Kreslit Figurovou na zemi (padlá postava, barva #475569, šedá/modrá)
- Pozice: canvas.width * 0.50, canvas.height * 0.85

---

## FÁZE F – Artefakt: foto_figurova
**Soubory: `state.js`, `config.js`, `index.html`, `profile.js`**

### [x] F1 – state.js: Přidat `foto_figurova: 0` do gs.inv

### [x] F2 – config.js ITEM_DESCS: 
```javascript
foto_figurova: 'Fotografie Figurové. Pochroumané tělo v sklepě. Trochu morbidní, ale co naplat.',
```

### [x] F3 – index.html: Slot v inventáři (za foto_kubatova):
```html
<div class="isl" id="sl-foto_figurova" title="📸 Fotka Figurové" style="display:none">
  <span class="ik">🧐</span><span class="ii">📸</span><span class="ic" id="ic-foto_figurova">1</span><span class="ilbl">Figurová</span>
</div>
```

### [x] F4 – profile.js: 
- `artifacts`: přidat `foto_figurova: false`
- `ARTIFACT_DEFS` (nebo ekvivalent): přidat popis

---

## FÁZE G – Cleanup a getStage update
**Soubory: `dialog.js`, `quests.js`**

### [x] G1 – getStage 'figurova' v dialog.js: Přidat nové stavy
Přidat podmínky před existujícími (nebo upravit logiku):
```javascript
case 'figurova':
  if(s.figurova_dead_sklep) return 3;         // Kubátová ji sežrala
  if(s.figurova_propiska_kill) return 3;      // Šokem ze švihlé propisky
  if(s.figurova_kratomed) return 3;           // původní kratom path
  if(s.figurova_fent) return 3;               // původní fent path
  // ... zbytek beze změny
```

### [x] G2 – Deaktivovat starý q_milan_told_figurova_spy v quests.js
- Funkci ponechat ale přidat komentář `// DEPRECATED – nahrazeno q_milan_protiutok`
- Nebo přesměrovat na novou: `q_milan_told_figurova_spy(){ this.q_milan_protiutok(); },`

### [x] G3 – Zamezit q_honza_fent být triggerován skrz Milan
- Funkce `q_honza_fent` zůstane (pro případ budoucího použití), ale nesmí být zobrazena z Milan dialogu
- Ověřit, že nikde v dialog.js není `fn:'q_honza_fent'` bez správné podmínky

---

## STAV IMPLEMENTACE

| Fáze | Úkol | Stav |
|------|------|------|
| A | Smazat duplicitní Milan trigger | ✅ |
| A | Rozšířit podmínku q_milan_protiutok | ✅ |
| A | Přepsat q_milan_protiutok (popup) | ✅ |
| A | Nový objective quest_figurova_vyres | ✅ |
| A | Přidat do profile.js | ✅ |
| B | CSS .player-mode | ✅ |
| B | showPlayerLine() + closePlayerLine() | ✅ |
| C | propiska do inv (state.js) | ⬜ |
| C | ITEM_DESCS.propiska | ⬜ |
| C | Slot propisky (index.html) | ⬜ |
| C | Honza dynamic choices | ⬜ |
| C | Quest funkce Honza (ask/kapsy/info/get) | ⬜ |
| D | Figurová omluvenka dynamic choices | ⬜ |
| D | Quest funkce D (ask/offer/no_propiska/fail2) | ⬜ |
| E | Figurová sklep dynamic choice | ⬜ |
| E | q_figurova_sklep_start | ⬜ |
| E | Following mechanic (game.js loop) | ⬜ |
| E | checkProx – dveře sklepa (Billa) | ⬜ |
| E | Proximity label + interact() | ⬜ |
| E | q_figurova_arrive_door | ⬜ |
| E | q_figurova_kick | ⬜ |
| E | Figurová v sklepě (initRoom log) | ⬜ |
| E | checkProx + interact – tělo Figurové | ⬜ |
| E | q_figurova_sklep_plea (player speech) | ⬜ |
| E | _start_kubatova_attack | ⬜ |
| E | Render: figurova_death_anim | ⬜ |
| E | Render: Figurová leží v sklepě | ⬜ |
| F | foto_figurova – state.js | ⬜ |
| F | foto_figurova – ITEM_DESCS | ⬜ |
| F | foto_figurova – index.html slot | ⬜ |
| F | foto_figurova – profile.js | ⬜ |
| G | Deaktivovat duplicitní path | ⬜ |
| G | getStage update | ⬜ |
| G | Ověřit honza_fent trigger | ⬜ |

---

## POZNÁMKY K IMPLEMENTACI

### Souřadnice dveří sklepa (Billa)
Z changeRoom(): `initRoom(Math.floor(canvas.width*0.63), Math.floor(canvas.height*0.65))`
→ Interakční zóna u dveří: `x = canvas.width * 0.63, y = canvas.height * 0.75` (trochu níž)

### updateInv() pro nové itemy
Funkce `updateInv()` v ui.js dynamicky zobrazuje/schovává sloty podle `gs.inv[key] > 0`.
Slot je hledán jako `#sl-{key}` a counter jako `#ic-{key}`. Stačí přidat HTML slot – zbytek funguje automaticky.

### Figurová following – přechod do Billa
Pokud hráč změní místnost (učebna → Billa), Figurová musí:
- Buď "teleportovat" (jednoduché: při changeRoom překreslit ji do nové místnosti)
- Nebo zastavit following (hráč musí jít sám a pak se vrátit)
**Doporučení:** Při changeRoom, pokud `figurova_following`, přidat ji do currentNPCs v nové místnosti na pozici hráče + offset.

Přidat do `initRoom()`:
```javascript
// Figurová sleduje hráče skrz místnosti
if(gs.story.figurova_following && !gs.story.figurova_at_door) {
  const figNPC = NPCS['figurova'];
  if(!currentNPCs.find(n => n.id === 'figurova'))
    currentNPCs.push({...figNPC, id:'figurova', x:gs.player.x + 50, y:gs.player.y, bob:0, bobDir:1});
}
```

### Renderování Figurové v sklepě
Pozice: `canvas.width * 0.50, canvas.height * 0.85`
Barva: `#475569` (originální barva Figurové) ale s opacity/tint pro "pochroumané"
Jednoduchá varianta: nakreslit emoji 🧐 o 90 stupňů otočené (ctx.rotate), nebo prostě menší/tmavší

### Kubátová animation
Nejjednodušší varianta: Kubátová se pohne k Figurové (lerp přes 800ms), pak se obě vykreslí jako animace smrti (blood_pool). Není třeba složitá animace sežrání hlavy – stačí rychlý pohyb a pak zmizení Figurové + krvavá skvrna + log zpráva.
