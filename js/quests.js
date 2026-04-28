'use strict';
// ═══════════════════════════════════════════
//  QUEST HANDLERY
// ═══════════════════════════════════════════

const QF = {
  close(){ closeDialog(); },

  // ─── Číhalová ─────────────────────────────────────────────────────────────
  q_cihalova_start(){
    gs.story.cihalova   = 1;
    gs.cihalova_deadline = gs.ts + CIHALOVA_TIMER * 1000;
    addLog('Přijal jsi úkol od Číhalové – hlavně pohni! Číhalová už se klepe', 'lw');
    addObj('main_cihalova');
    closeDialog();
  },
  q_piko_self(){
    closeDialog();
    setTimeout(() => triggerDeath(
      'Vzal jsi si piko sám. Dávka byla velkorysá. Svět se zatočil. Pak se zastavil.',
      'PŘEDÁVKOVAL SES', 'SMRT NA PIKO', 'death_piko'
    ), 600);
  },
  // Číhalová – dát jí celé balení → předávkování a smrt
  q_cihalova_overdose(){
    if(!gs.inv.piko){ addLog('Nemáš piko!','lw'); closeDialog(); return; }
    gs.inv.piko = 0; updateInv();
    document.getElementById('piko-badge').classList.remove('on');
    gs.story.cihalova_overdosed = true;
    gs.story.cihalova = 2;
    gs.cihalova_deadline = 0;
    gs.cihalova_collapsed = true;
    gs.cihalova_overdose_dead = true;
    gs.money += 800; updateHUD();
    addLog('Podal jsi Číhalové celou dávku naráz. "Díky, Hrubeš..." *polkne*', 'lw');
    fnotif('+800 Kč','pos');
    doneObj('main_cihalova');
    closeDialog();
    setTimeout(() => {
      addLog('*Číhalová se chytá za hrudník. Dýchá mělce. Padá na zem.*','lw');
      fnotif('💀 Číhalová OD','lw');
    }, 2000);
    setTimeout(() => {
      addLog('*Sípot přestává. Ticho. Číhalová je po smrti.*','lw');
      gs.story.cihalova_dead = true;
    }, 5500);
  },
  q_cihalova_deliver(){
    if(!gs.inv.piko){ addLog('Nemáš piko!','lw'); closeDialog(); return; }
    gs.inv.piko          = 0; updateInv();
    gs.money            += 800;
    gs.story.cihalova    = 2;
    gs.cihalova_collapsed = true;
    gs.cihalova_deadline  = 0;
    document.getElementById('piko-badge').classList.remove('on');
    addLog('Číhalová si vzala zásilku... a zkolabovala. +800 Kč 💰', 'lm');
    fnotif('+800 Kč','pos');
    doneObj('main_cihalova');
    addObj('quest_cihalova_burn');
    updateHUD(); closeDialog();
  },

  // ─── Krejčí ───────────────────────────────────────────────────────────────
  q_krejci_start(){
    gs.story.krejci = 1;
    addLog('Krejčí ti dala výhružný vzkaz – zjisti kdo za tím stojí.', 'ls');
    addObj('side_krejci'); closeDialog();
    setTimeout(showNote, 400);
  },
  q_krejci_reward(){
    if(!gs.story.krejci_resolved){ addLog('Ještě jsi nic nevyřídil.','lw'); closeDialog(); return; }
    gs.money += 300; updateHUD();
    gs.story.krejci = 2;
    gainRep(4, 'Ochránil Krejčí před vydíráním');
    addLog('Krejčí: +300 Kč 💰', 'lm');
    fnotif('+300 Kč','pos'); doneObj('side_krejci'); updateHUD(); closeDialog();
  },

  // ─── Figurová ─────────────────────────────────────────────────────────────
  q_figurova_start(){
    gs.story.figurova = 1;
    addLog('Figurová chce důkaz o Milanovi.', 'ls');
    addObj('side_figurova'); closeDialog();
  },
  q_figurova_reward(){
    if(gs.story.figurova >= 2){ closeDialog(); return; }
    gs.money += 400; gs.story.figurova = 2;
    gainRep(5, 'Prošpehoval Milana pro Figurovou');
    addLog('Figurová: absence smazány + 400 Kč 💰', 'lm');
    fnotif('+400 Kč','pos'); fnotif('+5 REP','rep');
    doneObj('side_figurova'); updateHUD(); closeDialog();
  },
  q_figurova_cert(){
    gs.story.milan_fig_evidence = true;
    addLog('Figurová: "Evidence is evidence. I do not ask how you got it." *přebírá certifikát*', 'ls');
    closeDialog();
    setTimeout(() => {
      const f = currentNPCs.find(n => n.id === 'figurova');
      if(f) showDialog(f);
    }, 300);
  },
  q_figurova_deliver_screenshot(){
    // Hráč předá screenshot Figurové → ona se zblázní → dark path
    gs.inv.screenshot = 0; gs.inv.hlasovka = 0; updateInv();
    gs.story.figurova_dark_started = true;
    gs.story.milan_fig_evidence = true;
    gs.story.hlasovka_known = true; // Pláteníková zjistí i bez fyzického itemu
    addLog('Figurová vzala telefon. Četla. Pak si pustila hlasovku.', 'ls');
    addLog('Výraz v její tváři se změnil. Nebyla to zlost. Bylo to... chladné rozhodnutí.', 'lw');
    closeDialog();
    setTimeout(() => {
      const f = currentNPCs.find(n => n.id === 'figurova');
      if(f) showDialog(f);
    }, 400);
  },
  q_figurova_dark_accept(){
    gs.inv.fig_nuz = 1; updateInv();
    gs.story.figurova_dark_contract = true;
    addLog('Figurová ti podala nůž. Vykuchej tu svini.', 'lw');
    addLog('Mates je v hospodě. Milan na náměstí. Figurová čeká.', 'lw');
    fnotif('🗡️ Nůž†  +1','itm');
    addObj('quest_figurova_mates');
    addObj('quest_figurova_milan');
    closeDialog();
  },
  q_figurova_dark_cert_leave(){
    // Hráč odchází s certifikátem, ale může se kdykoliv vrátit
    gs.inv.c2_cert = 1; updateInv();
    gs.story.figurova_cert_given = true;
    closeDialog();
    setTimeout(() => {
      showNPCLine('figurova', '"Fine." *vytáhne razítko, neochotně* "C2 – Highest Score. Ať se nepotkáme u maturity, Hrubeš." *podá ti certifikát* "A pokud si to rozmyslíš... víš, kde mě najdeš."');
    }, 200);
    fnotif('📜 C2 Certifikát!','itm');
    doneObj('side_figurova');
  },
  q_figurova_dark_reward(){
    const milanGone = gs.story.milan_shot || gs.story.milan_voodoo_dead;
    if(!gs.story.mates_dead || !milanGone){ closeDialog(); return; }
    gs.story.figurova_dark_done = true;
    gs.money += 3000; updateHUD();
    if(gs.inv.milan_phone){ gs.inv.milan_phone = 0; updateInv(); }
    gs.story.fabie_promised = true;
    // Figurová dá svoje klíčky – jsou ale falešné (neotevřou Fandovu Fábii)
    gs.inv.klice_fabie_fig = 1; updateInv();
    fnotif('+3 000 Kč 💰','pos');
    fnotif('🔑 Klíčky od Figurové','itm');
    closeDialog();
    setTimeout(() => {
      // Voodoo path – Figurová si všimne čistého nože
      if(gs.story.milan_voodoo_dead && gs.inv.fig_gun){
        showNPCLine('figurova',
          '"Milan je mrtvý, ale..." *prohlíží tvoji pistoli* "...tahle je čistá. Ani jeden vystřel." *prohlíží nůž* "A ten nůž? Taky čistý. Jak jsi to zvládl?"'
        );
        setTimeout(() => {
          document.getElementById('dname').textContent = 'FIGUROVÁ';
          document.getElementById('drole').textContent = 'Uč. AJ';
          document.getElementById('dtxt').textContent  = 'Figurová si tě pronikavě prohlíží.';
          document.getElementById('dchoices').innerHTML =
            `<button class="db prim" onclick="QF._fig_voodoo_explain()">"Nepotřeboval jsem je."</button>`;
          document.getElementById('dov').classList.add('on');
        }, 2500);
        return;
      }
      showNPCLine('figurova', '"Jsem ti strašně vděčná, Hrubeši. Na tu tvou starou sračku jsem se už nemohla koukat, tak jsem ti koupila nejnovější Fábii. Dokonce automat – s tím by se rozjel i Johnny Zahradník." *podá ti klíčky* "We were never here."');
    }, 200);
  },
  _fig_voodoo_explain(){
    closeDialog();
    setTimeout(() => {
      showNPCLine('figurova',
        '"Hm." *přikývne pomalu* "Je hustej, Hrubeš. Fakt hustej. Takovej klid a Milan je pod zemí." *usměje se nebezpečně* "Tady máš klíčky. Od Fábie. We were never here."'
      );
    }, 300);
  },
  q_figurova_kratom(){
    if(!gs.inv.kratom_kava){ addLog('Nemáš nic na přimíchání!','lw'); closeDialog(); return; }
    gs.inv.kratom_kava = 0; updateInv();
    gs.story.figurova_kratomed = true;
    addLog('Přimíchal jsi kratom do Figurové kávy. Tiše. Nikdo nic neviděl.', 'lw');
    doneObj('side_figurova');
    doneObj('quest_milan_protiutok');
    closeDialog();
    // Za 3s – Figurová se začne potácet (log)
    setTimeout(() => {
      addLog('*Figurová se chytí stolu, sklenice se kutálí* "I don\'t... feel..."', 'lw');
      fnotif('Figurová padá ☕','rep');
    }, 3000);
    // Za 30s – sanitka přijede a Figurová je odvezena
    setTimeout(() => {
      gs.story.figurova_sanitka = true;
      currentNPCs = currentNPCs.filter(n => n.id !== 'figurova');
      addLog('*Za oknem sirény. Záchranáři vcházejí do třídy.*', 'lm');
      addLog('"Odvézt. Rychle." *Figurová zmizí na nosítkách.*', 'ls');
      fnotif('🚑 Sanitka','rep');
    }, 30000);
  },

  // ─── Jana ─────────────────────────────────────────────────────────────────
  q_jana_start(){
    gs.story.jana = 1;
    addLog('Jana potřebuje 20g kratomu.', 'ls');
    addObj('side_jana'); closeDialog();
  },
  q_jana_deliver(){
    if(gs.inv.kratom < 20){ addLog('Nemáš dost kratomu! (20g)','lw'); closeDialog(); return; }
    gs.inv.kratom -= 20; gs.money += 200; gs.story.jana = 2;
    updateInv(); updateHUD();
    gainRep(10, 'Zachránil jsi Janu z únavy');
    addLog('Jana dostala kratom. +200 Kč 💰', 'lm');
    fnotif('+200 Kč','pos'); fnotif('+10 REP','rep');
    doneObj('side_jana'); closeDialog();
  },
  q_jana_buy_zemle(){
    if(gs.money < 35){ addLog('Nemáš 35 Kč!','lw'); closeDialog(); return; }
    gs.money -= 35; gs.inv.zemle++; updateInv(); updateHUD();
    addLog('Koupil jsi pizza žemli v Bille. 🍕','ls');
    fnotif('+1 🍕','itm'); closeDialog();
  },
  // ─── Lenka – záskok za Janu v Bille ──────────────────────────────────────
  q_lenka_zemle(){
    if(gs.money < 35){ addLog('Nemáš 35 Kč!','lw'); closeDialog(); return; }
    gs.money -= 35; gs.inv.zemle++; updateInv(); updateHUD();
    addLog('Lenka ti prodala pizza žemli. 🍕','ls');
    fnotif('+1 🍕','itm'); closeDialog();
  },
  q_lenka_margherita(){
    if(gs.money < 80){ addLog('Nemáš 80 Kč!','lw'); closeDialog(); return; }
    gs.money -= 80; updateHUD();
    const gain = Math.min(45, 100 - gs.energy);
    gs.energy = Math.min(100, gs.energy + 45);
    addLog(`🍕 Lenka ti ohřála margheritu. +${gain} energie`, 'ls');
    fnotif(`+${gain} ⚡`,'pos'); closeDialog();
  },
  q_lenka_kde_jana(){
    showNPCLine('lenka', '"Jana? Je v hospodě s tím Johnnym. Nevypadala šťastně, když odcházela. Kdybys ji viděl, pozdravuj." *podává ti účtenku*');
  },

  // ─── Mates ────────────────────────────────────────────────────────────────
  q_mates_kill(){
    if(!gs.inv.fig_nuz){ addLog('Nemáš nůž!','lw'); closeDialog(); return; }
    gs.inv.fig_nuz = 0; updateInv();
    gs.story.mates_dead = true;
    gs.story.murder_mates = true;
    // Mates padne k zemi – spustit animaci krvácení
    const matesNPC = currentNPCs.find(n => n.id === 'mates');
    if(matesNPC) gs.mates_death_anim = { x: matesNPC.x, y: matesNPC.y, startTime: gs.ts };
    currentNPCs = currentNPCs.filter(n => n.id !== 'mates');
    addLog('Nůž vstoupil do krku. Rychle. Čistě. Mates sklouznul ze stoličky.', 'lw');
    addLog('Nikdo se neotočil. Hospoda hrála dál.', 'lw');
    fnotif('Mates... 🩸','rep');
    doneObj('quest_figurova_mates');
    closeDialog();
    // SMS od Figurové – revolver na Milana
    setTimeout(() => {
      gs.inv.fig_gun = 1; updateInv();
      addLog('📱 SMS od Figurové: "Do kapsy jsem ti schovala revolver na Milana. Postarej se o tu svini."', 'lw');
      fnotif('🔫 Revolver +1','itm');
    }, 3000);
  },
  q_mates_pivo(){
    if(gs.money < 100){ addLog('Nemáš 100 Kč!','lw'); closeDialog(); return; }
    gs.money -= 100; gs.story.mates = (gs.story.mates || 0) + 1;
    gainRep(2, 'Koupil Matesovi démona');
    addLog('Koupil jsi Matesovi démona. 🍺', 'ls');
    updateHUD(); closeDialog();
  },
  q_mates_take_pytel(){
    gs.inv.pytel = 1; updateInv();
    gs.story.mates = 2; updateHUD();
    fnotif('🗑️ +1 pytel','itm');
    closeDialog();
  },
  q_mates_zemle(){
    if(gs.inv.zemle <= 0){ addLog('Nemáš žemli!','lw'); closeDialog(); return; }
    gs.inv.zemle--; gs.story.mates_zemle = true;
    updateInv(); updateHUD();
    gainRep(8, 'Daroval Matesovi žemli');
    addLog('Dal jsi Matesovi žemli. Byl vděčný!', 'lm');
    addLog('"Díky brácho! Hele, jestli chceš, na baru dneska můžeš dostat cokoliv zdarma. Stačí říct johnny_dneska_platí a nebudou ti účtovat ani korunu za démona."', 'ld');
    gs.story.mates_told_password = true;
    closeDialog();
  },
  q_mates_pytel(){
    if(!gs.cihalova_collapsed){ addLog('Číhalová ještě neleží.','lw'); closeDialog(); return; }
    if(gs.cihalova_in_bag){ addLog('Číhalová už v pytli je.','lw'); closeDialog(); return; }
    if(gs.money < 50){ addLog('Nemáš 50 Kč!','lw'); closeDialog(); return; }
    gs.money -= 50; gs.inv.pytel = 1; updateInv(); updateHUD();
    addLog('Koupil jsi pytel na odpadky od Matese. 🗑️', 'lm');
    fnotif('🗑️ +1 pytel','itm');
    closeDialog();
  },
  // ─── Honza – domácí úkol ──────────────────────────────────────────────────
  q_honza_ukol(){
    gs.story.honza_ukol = true;
    addLog('Honza: "Byl bych ti nesmírně vděčnej." *mrkne*', 'lp');
    addObj('side_honza_ukol');
    closeDialog();
  },
  q_honza_ukol_reward(){
    if(!gs.story.honza_ukol_done){ closeDialog(); return; }
    gs.money += 200; updateHUD();
    gainRep(6, 'Honzův domácí úkol zařízený');
    addLog('Honza: "Ty jsi borec, Fanda. Upřímně." +200 Kč 💰', 'lm');
    fnotif('+400 Kč', 'pos');
    doneObj('side_honza_ukol');
    gs.story.honza_ukol_rewarded = true;
    closeDialog();
  },

  // ─── Johnny ───────────────────────────────────────────────────────────────
  q_johnny_start(){
    gs.story.johnny = 1;
    addLog('Johnny: "Zařiď rande s Janou Kosovou." Jdi do Billy a přesvědč ji.', 'ls');
    addObj('side_johnny'); closeDialog();
  },
  q_johnny_confirm(){
    if(!gs.story.jana_rande_ok){ addLog('Jana ještě nesouhlasila!','lw'); closeDialog(); return; }
    gs.story.johnny = 2;
    addLog('Johnny: "Konečně! Bude tady za chvíli." *uhladí si sako*', 'lm');
    closeDialog();
    // Za 30 sekund Jana dorazí do hospody
    const _g = gs._gen;
    setTimeout(() => {
      if(gs._gen !== _g) return; // game was restarted, ignore stale timer
      gs.story.jana_in_hospoda = true;
      addLog('Jana dorazila do hospody... Cítíš, že něco není úplně v pořádku.', 'lw');
      fnotif('Jana v hospodě 💅', 'pos');
      if(gs.room === 'hospoda'){
        const janaExists = currentNPCs.find(n => n.id === 'jana_kosova');
        if(!janaExists){
          const n = NPCS['jana_kosova'];
          currentNPCs.push({...n, id:'jana_kosova', x:n.rx*canvas.width, y:(n.ry+0.25)*canvas.height, bob:0, bobDir:1});
        }
      }
      // Tajný časovač – pokud hráč nepomůže do 60s, Johnny a Jana zmizí do vily
      gs.story.villa_timer = true;
      gs.villa_deadline = gs.ts + 60000;
    }, 30000);
  },
  q_johnny_reward(){
    if(gs.story.johnny >= 3){ closeDialog(); return; }
    gs.money += 300; gs.story.johnny = 3;
    gainRep(6, 'Dohodil Johnnymu rande');
    addLog('Johnny: "Jsi bůh." +300 Kč 💰', 'lm');
    fnotif('+300 Kč','pos');
    doneObj('side_johnny'); updateHUD(); closeDialog();
  },
  q_jana_rescue(){
    gs.story.jana_rescued = true;
    gs.story.jana_in_hospoda = false;
    // Odstraň Janu z hospody
    currentNPCs = currentNPCs.filter(n => !(n.id === 'jana_kosova' && gs.room === 'hospoda'));
    addLog('Odvedl jsi Janu od Johnnyho. Je vidět, že je úlevou.', 'lm');
    addLog('Johnny na tebe zíral s rudou tváří. Odměna nebude.', 'lw');
    fnotif('Jana zachráněna 💅', 'rep');
    doneObj('side_johnny');
    closeDialog();
    // Zobraz Janin vděčný dialog po krátké pauze
    setTimeout(() => {
      const jana = currentNPCs.find(n => n.id === 'jana_kosova');
      if(jana) showDialog(jana);
    }, 500);
  },
  q_jana_thanks(){
    gs.story.jana_grateful = true;
    gs.inv.jana_cislo = 1; updateInv();
    // Po flood/handcuff path – dostane jen podprsenku a +15 REP (jana_handcuffed_johnny)
    if(gs.story.jana_handcuffed_johnny){
      gs.inv.podprsenka = 1; updateInv();
      gainRep(15, 'Jana ti důvěřuje – pomohl jsi jí utéct');
      addLog('Jana ti dala podprsenku a poděkovala. +15 REP 👙', 'lm');
      fnotif('👙 Podprsenka', 'itm');
    } else {
      gs.inv.podprsenka = 1; updateInv();
      gainRep(15, 'Jana ti důvěřuje');
      addLog('Dostal jsi Janino číslo + podprsenku. +15 REP 📱', 'lm');
      fnotif('+15 REP 📱', 'rep');
    }
    closeDialog();
  },

  // ─── JANA × JOHNNY REVAMP ─────────────────────────────────────────────
  // Hospoda: "Johnny je v pohodě" – Jana se přesune ke krbu k Johnnymu
  q_jana_to_johnny(){
    gs.story.jana_at_johnny = true;
    gs.story.jana_in_hospoda = false; // už není u baru, ale u krbu
    closeDialog();
    setTimeout(() => {
      addLog('Jana se na tebe naposledy podívá s lehkým rozčarováním a odejde k Johnnymu ke krbu.', 'lw');
      fnotif('Jana → Johnny 🍷', 'rep');
      triggerJanaToFireplace();
    }, 300);
    // Po nějakém čase je odvede do villy
    gs.villa_deadline = gs.ts + 60000; // 60s timer (existující systém)
  },

  // Villa: vzít Janin drink (kliknutím na drink v dialogu)
  q_take_jana_drink(){
    if(gs.story.jana_drink_taken){ closeDialog(); return; }
    gs.story.jana_drink_taken = true;
    gs.inv.sklenice_jana = 1; updateInv();
    closeDialog();
    setTimeout(() => {
      showNPCLine('jana_kosova',
        '*Jana se mírně usměje.* "Aha, dík. Sem tam mi tu sklenici drbni do ruky, jo? Pitnej režim je důležitej."',
        () => addLog('Vzal jsi Janině sklenici. Můžeš jí nasypat něco do nápoje, nebo ji vrátit zpět...', 'ls')
      );
    }, 200);
  },

  // Villa: po stage 10, hráč sleduje Janu jak jde na WC
  q_jana_take_glass_back(){
    closeDialog();
    gs.story.jana_at_toilet = true;
    setTimeout(() => {
      addLog('Jana odešla na záchod. Sklenici máš v ruce. Můžeš ji vrátit na stůl, nebo do ní něco hodit...', 'ls');
      triggerJanaToToilet();
    }, 300);
  },

  // Villa: vrátit (otrávenou) sklenici na stůl
  q_return_glass_to_table(){
    if(!gs.inv.sklenice_jana){ closeDialog(); return; }
    gs.inv.sklenice_jana = 0; updateInv();
    closeDialog();
    addLog('Vrátil jsi sklenici na stůl. Vypadá to nenápadně.', 'ls');
  },

  // Villa: nasypat prášek do drinku (ze sklenice v inventáři)
  q_drug_jana_drink(){
    if(!gs.inv.prasek){ addLog('Nemáš prášek!','lw'); closeDialog(); return; }
    if(!gs.inv.sklenice_jana){ addLog('Nemáš sklenici!','lw'); closeDialog(); return; }
    if(gs.story.drink_drugged){ addLog('Už jsi to jednou udělal.','lw'); closeDialog(); return; }
    gs.inv.prasek = 0;
    gs.story.drink_drugged = true;
    updateInv();
    closeDialog();

    // Bezpečná chvíle – Jana je pryč (na WC nebo v koupelně)
    if(gs.story.jana_at_toilet || gs.story.jana_in_bathroom_locked){
      addLog('💊 Nasypal jsi prášek do Janiny sklenice. Teď ji jen vrátit na stůl, ať se napije...', 'ls');
      fnotif('💊 Drink otráven', 'rep');
      return;
    }

    // Hráč otrávil drink přímo – Jana to vidí → DEATH
    addLog('*Jana se otočí v okamžiku, kdy sypeš prášek do sklenice...*', 'lw');
    setTimeout(() => triggerJanaKatanaKill(), 1200);
  },

  // Villa: dát Janě hadr → ona vyrazí do koupelny
  q_give_jana_rag(){
    if(!gs.inv.hadr){ addLog('Nemáš hadr!','lw'); closeDialog(); return; }
    gs.inv.hadr = 0; updateInv();
    gs.story.bathroom_plan_briefed = true;
    closeDialog();
    // Stage 8 dialog se zobrazí auto z getStage při dalším showDialog
    setTimeout(() => {
      const jana = currentNPCs.find(n => n.id === 'jana_kosova');
      if(jana) showDialog(jana);
    }, 300);
  },

  // Villa: po stage 8 dialogu Jana odejde do koupelny
  q_jana_go_bathroom(){
    closeDialog();
    triggerJanaToBathroom();
  },

  // Bathroom cutscene – hráč naslouchá
  q_bathroom_listen(){
    closeDialog();
    setTimeout(() => {
      addLog('*Necháš je hádat.*', 'ls');
      setTimeout(() => triggerJanaHandcuffs(), 1200);
    }, 300);
  },

  // Bathroom cutscene – hráč se brání → Johnny+Jana ho zařvou
  q_bathroom_defend(){
    closeDialog();
    setTimeout(() => {
      showNPCLine('johnny',
        '"TEĎ DRŽ HUBU, HRUBEŠ! TADY SE HÁDAJÍ DOSPĚLÍ!"',
        () => {
          setTimeout(() => showNPCLine('jana_kosova',
            '"DRŽ HUBU, HRUBEŠI! TY SE TADY NEPLEŤ!"',
            () => setTimeout(() => triggerJanaHandcuffs(), 800)
          ), 600);
        }
      );
    }, 300);
  },

  // Johnny pomoc – konec Johnny path (Jana usnula na gauči)
  q_johnny_help_done(){
    closeDialog();
    if(!gs.inv.membership_vaza){
      gs.inv.membership_vaza = 1;
      if(typeof activeProfile !== 'undefined' && activeProfile){
        activeProfile.artifacts.membership_vaza = true;
      }
      updateInv();
      fnotif('💳 Vaza Systems','itm');
    }
    gainRep(5, 'Pomohl Johnnymu (rituál bratrstva)');
    // Snížení REP za morálku (Janu omámil)
    if(gs.story.drink_drugged){
      gs.rep = Math.max(0, gs.rep - 10);
      updateHUD();
      addLog('-10 REP – něco v tobě hlodá. Janu jsi omámil.','lw');
    }
  },
  // ─── Jana – rande pro Johnnyho ────────────────────────────────────────────
  q_jana_rande(){
    gs.story.jana_rande_asked = true;
    showNPCLine('jana_kosova', '"S Johnnym? 💅 Přines mi speciální blend od Mikuláše. Pak uvidíme."');
  },
  q_jana_rande_confirm(){
    if(!gs.inv.blend){ addLog('Jana chce speciální blend od Mikuláše!','lw'); closeDialog(); return; }
    gs.inv.blend -= 1; updateInv();
    gs.story.jana_rande_ok = true;
    gainRep(3, 'Přesvědčil Janu na rande');
    fnotif('Jana souhlasí! 💅','pos');
    showNPCLine('jana_kosova', '"Jo, přijdu. Ale jen protože jsi ty, Fando." 💅');
  },
  q_jana_thank(){
    gs.story.jana_thanked = true;
    gs.inv.jana_cislo = 1;
    gs.inv.podprsenka = 1; updateInv();
    closeDialog();
    setTimeout(() => {
      showNPCLine('jana_kosova', '"Fando..." *chytne tě za ruku* "Díky. Vážně. Nevím, co by se stalo, kdybys nepřišel." *podá ti lísteček s číslem a pak se začervená* "A tohle... je za odvahu." *vytáhne z tašky podprsenku* "Artefakt. Neztrať ho." 💅');
    }, 150);
  },
  // ─── Mikuláš – blend pro Janu ────────────────────────────────────────────
  q_mik_blend_jana(){
    if(gs.money < 50){ addLog('Nemáš 50 Kč!','lw'); closeDialog(); return; }
    gs.money -= 50; gs.inv.blend += 1; updateInv(); updateHUD();
    addLog('Mikuláš ti dal speciální blend pro Janu. 🌿','ls');
    fnotif('Blend pro Janu 🌿','itm'); closeDialog();
  },
  // ─── Šaman ────────────────────────────────────────────────────────────────
  q_saman_password(){ closeDialog(); openPassword(); },
  q_saman_50g(){
    if(gs.money < 150){ addLog('Nemáš 150 Kč!','lw'); closeDialog(); return; }
    gs.money -= 150; gs.inv.kratom += 50; updateInv(); updateHUD();
    gainRep(1,'Koupil kratom');
    addLog('Koupil jsi 50g za 150 Kč. 🌿','ls'); fnotif('+50g 🌿','itm'); closeDialog();
  },
  q_saman_200g(){
    if(gs.money < 600){ addLog('Nemáš 600 Kč!','lw'); closeDialog(); return; }
    gs.money -= 600; gs.inv.kratom += 200; updateInv(); updateHUD();
    gainRep(3,'Koupil 200g kratomu');
    addLog('Koupil jsi 200g za 600 Kč. 🌿','ls'); fnotif('+200g 🌿','itm'); closeDialog();
  },
  // ─── Bezďák / Petr Cibulka ───────────────────────────────────────────────
  q_bezdak_give_cibule(){
    if(!gs.inv.cibule){ addLog('Nemáš cibuli!','lw'); closeDialog(); return; }
    gs.inv.cibule = 0; updateInv();
    gs.story.bezdak_cibulka = true;
    closeDialog();
    setTimeout(()=>{
      const n = currentNPCs.find(x=>x.id==='bezdak');
      if(n) showDialog(n);
    }, 300);
  },
  // ─── Kratom Bůh v nebi ────────────────────────────────────────────────────
  q_god_next(){
    gs.story.god_line = (gs.story.god_line || 0) + 1;
    closeDialog();
    setTimeout(() => {
      const n = currentNPCs.find(x => x.id === 'kratom_buh');
      if(n) showDialog(n);
    }, 280);
  },
  q_god_death(){
    closeDialog();
    setTimeout(() => triggerDeath(
      'Prášek od Cibulky byl příliš silný. Předávkoval ses.\nSvět se rozmázl, ztichl, zčernal.\nCibulka zmizel ještě před příjezdem záchranky.',
      'PŘEDÁVKOVÁNÍ', 'SMRT NA PRÁŠEK OD PETRA CIBULKY', 'death_kratom_od'
    ), 600);
  },
  q_cibulka_prukaz(){
    gs.story.kgb_prukaz_shown = true;
    gs.inv.kgb_prukaz = 0; updateInv();
    closeDialog();
    showNPCLine('bezdak',
      '"ГБ-7824." *Cibulka vezme průkazku, otočí ji, prohlíží* "Krejčí. Přesně jak jsem čekal." *schová ji do kapsy* "To potvrzuje operaci КРЕСТ. Měli tu čtyři agenty. Dva jsi odhalil detektorem. Jeden uprchnul před prohledáním."',
      () => showNPCLine('bezdak',
        '"A Krejčí si koupila mlčení průkazkou a pěti sty." *přikývne pomalu* "Chytrý tah od ní. Ví, že průkazka je pro mě cennější než hotovost." *odvrátí se* "Operace КРЕСТ je rozkryta. Aspoň tato buňka."',
        () => {
          gainRep(8, 'Předal průkazku Cibulkovi – odhalena operace КРЕСТ');
          addLog('Cibulka potvrdil: operace КРЕСТ v Křemži rozkryta. +8 REP', 'lm');
          fnotif('+8 REP 🔍', 'rep');
        }
      )
    );
  },
  q_bezdak_pill(){
    gs.story.bezdak_pill = true;
    addLog('Vzal jsi prášek od Petra Cibulky. Svět se zdeformoval...','lw');
    fnotif('💊 PRÁŠEK!','itm');
    addObj('quest_kgb');
    closeDialog();
    setTimeout(()=>startKGBMinigame(), 900);
  },
  q_bezdak_buy(){
    if(gs.money < 600){ addLog('Nemáš 600 Kč!','lw'); closeDialog(); return; }
    gs.money -= 600; gs.inv.piko = 1; updateInv(); updateHUD();
    gs.story.bezdak = 1;
    document.getElementById('piko-badge').classList.add('on');
    addLog('Koupil jsi piko za 600 Kč. 💊','lw');
    fnotif('+1 💊','itm'); closeDialog();
  },
  q_bezdak_trade(){
    if(gs.inv.zemle < 2){ addLog('Potřebuješ 2 žemle!','lw'); closeDialog(); return; }
    gs.inv.zemle -= 2; gs.inv.piko = 1; updateInv(); updateHUD();
    gs.story.bezdak = 1;
    document.getElementById('piko-badge').classList.add('on');
    addLog('Vyměnil jsi 2 žemle za piko. 💊','ls');
    fnotif('+1 💊','itm'); closeDialog();
  },

  // ─── Villa Johnnyho ───────────────────────────────────────────────────────
  q_johnny_deny(){
    closeDialog();
    showNPCLine('johnny_vila', '"Co? Ne ne ne. To určitě není pravda. Oba si to užíváme, Fando. Ona je prostě nesmělá, víš jak to je." *mávne rukou a napije se* "Neboj se o ni."');
  },
  q_jana_help_hint(){
    gs.story.jana_hint_given = true;
    closeDialog();
    showNPCLine('jana_vila', '"V koupelně... tam má šuplík. Jsou tam želízka. Přines je a spoutej ho, prosím." *rozhlédne se ke dveřím* "Dveře do koupelny jsou napravo."');
  },
  q_johnny_cuff(){
    if(!gs.inv.zelizka){ addLog('Nemáš želízka!','lw'); closeDialog(); return; }
    gs.inv.zelizka = 0; updateInv();
    gs.story.johnny_cuffed = true;
    addLog('Spoutal jsi Johnnyho ke stolu. Řve, ale nemůže se pohnout.', 'lw');
    addLog('Jana na tebe pohlédla jinak. Úlevou.', 'lm');
    fnotif('Johnny spoutaný ⛓️','pos');
    closeDialog();
    setTimeout(() => {
      const jana = currentNPCs.find(n => n.id === 'jana_vila');
      if(jana) showDialog(jana);
    }, 400);
  },
  q_villa_leave(){
    gs.story.jana_rescued_villa = true;
    gs.story.jana_in_hospoda = false;
    gs.story.johnny_villa_done = true;
    currentNPCs = currentNPCs.filter(n => n.id !== 'jana_vila');
    gainRep(15, 'Jana zachráněna z vily');
    gs.inv.jana_cislo = 1; updateInv();
    // Johnny dá klíče od domu
    gs.inv.klice_vila = 1; updateInv();
    addLog('"Díky, Fando. Vážně." *podá ti číslo* "Tohle si zasluhuj."', 'lm');
    addLog('Johnny ti hodil klíče od baráku. "Ber si je, stejně mě zavřou."', 'ls');
    fnotif('+15 REP','rep'); fnotif('Jana zachráněna 💅','pos'); fnotif('🔑 Klíče od vily','itm');
    doneObj('side_johnny');
    gs.room = 'kremze'; initRoom();
    closeDialog();
  },
  q_villa_drug_drink(){
    // Volá se z interact() po nasypání prášku do drinku
    gs.story.jana_drugged_villa = true;
    addLog('Nasypals prášek do Janina drinku. Za chvíli zmlkla.', 'lw');
    addLog('Johnny se otočil a kývl. "Díky, brácho."', 'ls');
    setTimeout(() => {
      gs.money += 500; updateHUD();
      gainRep(3, 'Pomohl Johnnymu');
      addLog('Johnny ti strčil 500 Kč do kapsy. Promluv s ním – má pro tebe víc.', 'lm');
      fnotif('+500 Kč 💰','pos'); fnotif('+3 REP','rep');
      doneObj('side_johnny');
    }, 2000);
  },
  q_johnny_villa_rewards(){
    gs.story.johnny_villa_rewards = true;
    gs.inv.membership_vaza = 1;
    gs.inv.klice_vila = 1;
    updateInv();
    addLog('Johnny ti dal Vaza Systems membership kartičku – ultimátní členství. 💳', 'lm');
    addLog('A klíče od baráku. "Klidně se stav, kdykoli, Fando."', 'ls');
    fnotif('💳 Vaza Systems Membership!','itm');
    fnotif('🔑 Klíče od vily','itm');
    if(activeProfile){
      activeProfile.artifacts.membership_vaza = true;
      profileSaveProgress();
    }
    closeDialog();
    // Po odchodu z vily se nastaví johnny_villa_done
  },
  q_johnny_webovka(){
    // Fáze 1 – hráč požádá, Johnny odmítne, pak uvidí kartičku a souhlasí
    gs.story.johnny_webovka_asked = true;
    closeDialog();
    showNPCLine('johnny_vila',
      '"Webovky?" *zamrká* "Hele, Fando, já mám business, mám schůzky, mám lidi na drátě. Na takovýhle kraviny fakt nemám čas." *odvrátí se* "Sorry."',
      () => {
        if(!gs.inv.membership_vaza){ return; }
        showNPCLine('johnny_vila',
          '"Co to je?" *vezme kartičku a otočí ji* "...Vaza Systems Gold Membership." *pozvedne obočí* "Ty máš TOHLE?" *vstal ze sedačky* "Fando... OK. Udělám ti to. Dej mi pár dní."',
          () => {
            addLog('Johnny se zaváže udělat webovky. Vrať se za chvíli.', 'lm');
            fnotif('💳 Johnny to udělá!', 'pos');
          }
        );
      }
    );
  },
  q_johnny_webovka_deliver(){
    // Fáze 2 – webovky hotové, hráč dostane artefakt
    gs.story.johnny_webovka_done = true;
    if(activeProfile){ activeProfile.artifacts.webovky = true; profileSaveProgress(); }
    closeDialog();
    showNPCLine('johnny_vila',
      '"Fando!" *vstane a natáhne ruku* "Hotovo. fanta-hrubes.webnode.cz – live od dneška." *poklepe ti na rameno* "Fifty grand by tě to stálo jinak. Ale pro tebe? Nula. Protože jsi kamarád."',
      () => {
        addLog('Dostal jsi webovky od Johnnyho. Otevři artefakt a podívej se! 🌐', 'lm');
        fnotif('🌐 Webovky hotové!', 'itm');
      }
    );
  },
  q_johnny_return_leave(){
    gs.story.johnny_return_left = true;
    gs.room = 'kremze'; initRoom();
    closeDialog();
    addLog('Odešel jsi z Johnnyho vily.', 'ls');
  },

  // ─── Webovky – hospoda ────────────────────────────────────────────────────
  q_johnny_hospoda_webovka(){
    gs.story.hospoda_webovka_asked = true;
    closeDialog();
    showNPCLine('johnny',
      '"Webovky?!" *usrkne pivo* "Fando, já nejsem tvůj ajťák. Mám business, mám schůzky, mám lidi na drátě. Táhni." *odvrátí se k baru*',
      () => {
        if(!gs.inv.membership_vaza) return;
        showPlayerLine('"Moment—" *vytáhne kartičku* "Mám tenhle lístek od tebe."',
          () => {
            showNPCLine('johnny',
              '"Co to je?" *vezme kartičku, otočí ji* "...Vaza Systems Gold Membership." *pozvedne obočí, téměř vstane ze stoličky* "Ty máš TOHLE?" *zamrká* "Fando... OK. Udělám ti to. Dej mi půl hodiny." *usadí se zpátky*',
              () => {
                addLog('Johnny souhlasí. Vrať se za ním za chvíli. ⏳', 'lm');
                fnotif('💻 Johnny to dělá!', 'pos');
                const gen = gs._gen;
                setTimeout(() => {
                  if(gs._gen !== gen) return;
                  gs.story.hospoda_webovka_timer_done = true;
                  addLog('💡 Webovky jsou hotové! Jdi za Johnnym do hospody.', 'lm');
                  fnotif('🌐 Webovky hotové!', 'itm');
                }, 30000);
              }
            );
          }
        );
      }
    );
  },
  q_johnny_hospoda_webovka_done(){
    gs.story.hospoda_webovka_done = true;
    if(activeProfile){ activeProfile.artifacts.webovky = true; profileSaveProgress(); }
    closeDialog();
    showNPCLine('johnny',
      '"Fando!" *otočí laptop* "fanta-hrubes.webnode.cz – live od dneška. Responsive design, dark theme, SEO optimalizovaný." *poklepe ti na rameno* "Fifty grand by tě to stálo jinak. Pro tebe? Zadarmo."',
      () => {
        const npc = NPCS.johnny;
        document.getElementById('dav').textContent   = npc.emoji;
        document.getElementById('dname').textContent = npc.name.toUpperCase();
        document.getElementById('drole').textContent = npc.role;
        document.getElementById('dtxt').textContent  = '"Tak co, chceš si to prohlédnout?"';
        document.getElementById('dchoices').innerHTML =
          `<button class="db prim" onclick="window.open('https://fanta-hrubes.webnode.cz','_blank')">🌐 Otevřít fanta-hrubes.webnode.cz</button>` +
          `<button class="db" onclick="closeDialog()">(Zavřít)</button>`;
        document.getElementById('dov').classList.add('on');
        addLog('Dostal jsi webovky od Johnnyho. 🌐', 'lm');
        fnotif('🌐 Webovky live!', 'itm');
      }
    );
  },
  // Koupelna – šuplík se želízky
  q_koupelna_drawer(){
    if(gs.story.koupelna_drawer_opened){ addLog('Šuplík je prázdný.','lw'); return; }
    gs.story.koupelna_drawer_opened = true;
    gs.inv.zelizka = 1; gs.inv.hadr = 1; updateInv();
    addLog('V šuplíku pod umyvadlem najdeš želízka (Johnnyho "hračky") a vespod čistý bílý hadr.', 'lw');
    fnotif('⛓️ Želízka, 🧻 Hadr','itm');
  },
  // Koupelna – umyvadlo
  q_koupelna_sink(){
    if(gs.story.sink_used) return;
    gs.story.sink_used = true;
    addLog('Pustil jsi vodu v umyvadle. Teče. Zase jsi ji zavřel.', 'ls');
    fnotif('🚰 Achievement!','pos');
  },
  // Villa – šuplík s práškem (obývák)
  q_villa_drawer(){
    if(gs.story.villa_powder_taken){ addLog('Šuplík je prázdný.','lw'); return; }
    gs.story.villa_powder_taken = true;
    gs.inv.prasek = 1; updateInv();
    addLog('V šuplíku jsi našel podezřelý bílý prášek.', 'lw');
    fnotif('💊 Prášek','itm');
  },

  // ─── Pája ─────────────────────────────────────────────────────────────────
  q_paja_loan(){
    if(gs.story.paja >= 1){ closeDialog(); return; }
    if(gs.money < 300){ addLog('Nemáš 300 Kč!','lw'); closeDialog(); return; }
    gs.money -= 300; gs.story.paja = 1; updateHUD();
    gainRep(3,'Půjčil kamarádovi peníze');
    addLog('Půjčil jsi Pájovi 300 Kč. Za 35s vrátí 500 Kč.','ls');
    addObj('side_paja');
    const _g = gs._gen;
    setTimeout(() => {
      if(gs._gen !== _g) return; // game was restarted, ignore stale timer
      gs.story.paja = 2;
      addLog('Pája tě hledá – vrátil peníze! Jdi na ulici.','lm');
      fnotif('Pája volá! 📞','pos');
      // Po 15s navíc – Pája vyhraje jackpot a jde do hospody
      setTimeout(() => {
        if(gs._gen !== _g) return; // game was restarted, ignore stale timer
        gs.story.paja_jackpot = true;
        gs.story.paja_in_hospoda = true;
        addLog('📱 SMS od Páji: "FANDAAA! JACKPOT 5000 Kč!! Jsem v hospodě, slavím!!"', 'lm');
        fnotif('Pája vyhrál JACKPOT! 🎰', 'pos');
        // Hráč je právě v hospodě – přidat Páju bez re-initRoom
        if(gs.room === 'hospoda' && !currentNPCs.find(n => n.id === 'paja')){
          const pNPC = NPCS['paja'];
          currentNPCs.push({...pNPC, id:'paja', x:pNPC.rx*canvas.width*0.55, y:pNPC.ry*canvas.height*1.4, bob:0, bobDir:1});
        }
      }, 15000);
    }, 35000);
    closeDialog();
  },
  q_paja_collect(){
    if(gs.story.paja !== 2){ closeDialog(); return; }
    gs.money += 500; gs.story.paja = 3; updateHUD();
    addLog('Pája vrátil 500 Kč! Zisk +200 Kč 🎉','lm');
    fnotif('+500 Kč','pos'); doneObj('side_paja');
    // Pája dá hráči klíček od šuplíku jako bonus (artefakt do dalších her)
    if(!gs.inv.klic_supliku){
      gs.inv.klic_supliku = 1; updateInv();
      if(activeProfile){ activeProfile.artifacts.klic_supliku = true; }
      setTimeout(() => {
        showNPCLine('paja',
          '"Hele... a něco bonusem." *vytáhne z kapsy malý zlatý klíček* "Neptej se, kde jsem ho vzal. Tobě bude k něčemu, mně už ne. Šuplík... budeš vědět."',
          () => {
            addLog('🗝️ Dostal jsi od Páji klíček od šuplíku!', 'lm');
            fnotif('🗝️ Klíček od šuplíku', 'itm');
          }
        );
      }, 600);
    } else {
      closeDialog();
    }
  },
  q_paja_fabie_info(){
    gs.story.paja_fabie_told = true;
    addLog('Pája: "Heslo pro šamana je FÁBIE. Dávej bacha na něj!"', 'ls');
    fnotif('Heslo: FÁBIE 🔑', 'itm');
    closeDialog();
  },

  // ─── Pája – krádež quest ──────────────────────────────────────────────
  q_paja_investigate(){
    gs.story.paja_investigating = true;
    addLog('Prošetříš krádež v hospodě. Zkus mluvit s Matesem nebo Johnnym.', 'ls');
    addObj('quest_paja_theft');
    closeDialog();
  },

  q_paja_ask_johnny(){
    gs.story.paja_johnny_asked = true;
    closeDialog();
    setTimeout(() => {
      screenShake(400);
      addLog('*Johnny tě bez varování praštil pěstí do oka* "NEZLOB MĚ, HRUBEŠI."', 'lw');
      addLog('*Bolest. Oko se dere. Monokl jako z učebnice.*', 'lw');
      fnotif('👁 Monokl!', 'lw');
      gs.story.player_monokl = true;
      setTimeout(() => showNPCLine('johnny', '"Chceš říct, že jsem zloděj?!" *nahlédne na tebe* "Táhni, dokud ti zbývají zuby."'), 600);
    }, 300);
  },

  q_paja_ask_mates(){
    closeDialog();
    showNPCLine('mates',
      '"Pájovy prachy?" *odloží sklenici* "Ty vole, ten dneska rozhazoval jak šílenec. Kupoval všem démony, vychloubal se výhrou... kurvy, chlast, chlebíčky – celá hospoda žila z jeho kapsy."',
      () => {
        document.getElementById('dav').textContent   = '😌';
        document.getElementById('dname').textContent = 'MATES';
        document.getElementById('drole').textContent = 'Kamarád / Chill guy';
        document.getElementById('dtxt').textContent  = '*Mates se odmlčel a pohlédl na tebe.*';
        document.getElementById('dchoices').innerHTML =
          `<button class="db special" onclick="runQF('q_paja_mates_ask_who')">🤔 "Kdo si myslíš, že to vzal?"</button>` +
          `<button class="db danger" onclick="runQF('q_paja_mates_accuse')">"Ty sis to vzal!"</button>`;
        document.getElementById('dov').classList.add('on');
      }
    );
  },

  q_paja_mates_ask_who(){
    closeDialog();
    setTimeout(() => {
      showNPCLine('mates',
        '"Kdo?" *zamyslí se* "Hele... viděl jsem Mikuláše, jak se motá kolem Pájovy bundy. Dvakrát. Přišlo mi to divný, ale říkal jsem si – Mikuláš prostě má divné koníčky." *pokrčí rameny* "No ale teď ti nevím..."',
        () => {
          gs.story.paja_mates_done = true;
          addLog('Mates viděl Mikuláše u Pájovy bundy. Jdi za Mikulášem v Křemži.', 'ls');
          fnotif('Stopa: Mikuláš 🌿', 'pos');
        }
      );
    }, 200);
  },

  q_paja_mates_accuse(){
    closeDialog();
    showNPCLine('mates',
      '"CO?! TY SI MYSLÍŠ, ŽE JÁ?!" *vstane, pak se zase posadí* "...Dobře. Chápu, proč bys to řekl. Ale ne, Fando. Přísahám." *položí ruce na stůl* "Byl jsem tu celou dobu. Ale víš co jsem viděl? Mikuláše. Jak se točí kolem Pájovy bundy. Podruhé."',
      () => {
        gs.story.paja_mates_done = true;
        addLog('Mates viděl Mikuláše u Pájovy bundy. Jdi za Mikulášem v Křemži.', 'ls');
        fnotif('Stopa: Mikuláš 🌿', 'pos');
      }
    );
  },

  q_paja_confront_mik(){
    closeDialog();
    showNPCLine('mikulas',
      '"Já?!" *otočí se* "Co blázníš, Fando. Stál jsem tam chvíli a šel dál. Nic jsem nevzal."',
      () => showPlayerLine('"Mates tě viděl. Dvakrát. Přestaň to hrát."',
        () => showNPCLine('mikulas',
          '"A co? I kdybych tam byl, neznamená to nic." *zaujme defenzivní postoj*',
          () => showPlayerLine('"Nechci se bavit o teorii."',
            () => {
              screenShake(500);
              addLog('*Fanda praštil Mikuláše. Dvakrát. Mikuláš sklouznul ke zdi.*', 'lw');
              addLog('*Mikuláš klečí. Ruka na tváři.*', 'lw');
              setTimeout(() => {
                showNPCLine('mikulas',
                  '"Dost! Dost..." *zvedne ruku* "Dobře. Já... já to vzal. Ale neposlal jsem si to do kapsy." *dýchá ztěžka* "Bezďák mě o to požádal. Řekl, že peníze potřebuje na důležitou věc. Dostal jsem za to blend."',
                  () => {
                    gs.story.paja_mik_confronted = true;
                    gs.story.paja_mik_confessed = true;
                    addLog('Mikuláš přiznal: Bezďák ho poslal ukrást peníze. Jdi za Bezďákem na ulici.', 'ls');
                    fnotif('Bezďák za vším stojí! 🧥', 'lw');
                  }
                );
              }, 800);
            }
          )
        )
      )
    );
  },

  q_paja_ask_bezdak(){
    closeDialog();
    showNPCLine('bezdak',
      '"Mikuláš..." *Bezďák se otočí pomalu, přimhouří oči* "A co ti řekl přesně?" *ticho* "Bez ohledu na to – pokud se něco stalo, stalo se to ze správných důvodů. Důvodů, kterým nerozumíš."',
      () => showNPCLine('bezdak',
        '"Tady v Křemži se dějou věci. Věci, o kterých se neučí ve škole." *přikrčí se, hlas se sníží* "Tvůj kamarád o ty prachy nepřijde. Mám to vyřešené." *otočí se zpět* "Teď táhni. A jestli víš víc než říkáš – dej mi vědět."',
        () => { addLog('Bezďák popírá vše, ale naznačuje víc. Možná o něm víš víc...', 'ls'); }
      )
    );
  },

  q_paja_ask_cibulka(){
    if(!gs.story.bezdak_cibulka){ closeDialog(); return; }
    closeDialog();
    showNPCLine('bezdak',
      '"Ty... ty víš." *Cibulka sundá kapuci, chvíli mlčí* "Jo. Poslal jsem Mikuláše. Ale neposlouchej Páju – poslouchej mě."',
      () => showNPCLine('bezdak',
        '"Potřeboval jsem КТ-361Б. Sovětský bipolární transkonduktor s diferenciální kvadraturní demodulací. Jediný komponent schopný zpracovat фазовую инверсию GRU frekvenčního pásma." *zaklepe si na spánek* "Bez něj byl detektor zaseknutý v pasivním SIGINT bypass módu – k ničemu pro real-time HUMINT detekci živých agentů."',
        () => showNPCLine('bezdak',
          '"A víš proč jsem nepočkal?" *narovná se* "Protože jsem POTŘEBOVAL chaos. Finanční disturbance v lokálním HUMINT uzlu aktivuje GRU Omega-3 protokol – agenti se začnou pohybovat, komunikovat, vystavují se." *přikývne* "Bez toho chaosu by detektor neměl co detekovat. Ta krádež nebyla krádež. Byl to spouštěč."',
          () => showNPCLine('bezdak',
            '"Šumann-Kamenev resonátor kalibrován. Zpětná subharmonická emise stabilní. Detektor je funkční." *sáhne pod pult* "A ty jsi prošel práškovým testem – kognitivní rezistence pod plnou SIGINT saturací v normě." *podá ti krabičku* "Prohledej každou místnost. Zezelená: čistý. Zčervená: GRU nebo KGB agent."',
            () => {
              gs.story.paja_cibulka_detector = true;
              gs.inv.kgb_detector = 1; updateInv();
              addObj('quest_paja_scan');
              addLog('Cibulka ti dal detektor KGB/GRU. Prohledej celou Křemži!', 'lm');
              fnotif('🔍 KGB Detektor +1', 'itm');
              if(activeProfile){
                activeProfile.artifacts.kgb_detector = true;
                profileSaveProgress();
              }
            }
          )
        )
      )
    );
  },

  q_paja_confront_krejci(){
    closeDialog();
    showNPCLine('krejci',
      '"Hrubeši..." *Krejčí si všimne přístroje v tvé ruce* "Jak jste..."',
      () => showPlayerLine('"Detektor KGB/GRU. Vy jste agent, Krejčí."',
        () => showNPCLine('krejci',
          '"..." *dlouhé ticho, pak si sedne* "Dobře." *otevře šuplík, vytáhne kovovou destičku* "Toto je série ГБ-7824. Moje identifikace. Vezmete si ji a půjdete." *položí ji na stůl* "A 500 Kč zpátky pro vašeho přítele. Tohle nikam nenesete."',
          () => showNPCLine('krejci',
            '"Jsem tu přes osm let. Nikomu jsem neublížila. Jen... sledovala jsem. Hlásila." *zapne kabát, vstane* "Pokud to odnesete výš, víte, co se stane." *míří ke dveřím* "Operace КРЕСТ se vás netýká. Nikdy netýkala."',
            () => {
              gs.story.paja_pytel_taken = true;
              gs.story.krejci_paid_back = true;
              gs.inv.kgb_prukaz = 1; updateInv();
              gs.money += 500; updateHUD();
              doneObj('quest_paja_scan');
              addLog('Krejčí ti dala svou KGB průkazku (ГБ-7824) a 500 Kč. Odhalena jako agent!', 'lm');
              addLog('Zmínila operaci КРЕСТ. Cibulka by to měl vědět...', 'ls');
              fnotif('🪪 KGB průkazka +1', 'itm');
              fnotif('+500 Kč 💰', 'pos');
            }
          )
        )
      )
    );
  },

  q_paja_give_pytel(){
    if(!gs.inv.pytel_penez){ addLog('Nemáš pytel peněz!','lw'); closeDialog(); return; }
    gs.inv.pytel_penez = 0; updateInv();
    closeDialog();
    showNPCLine('paja',
      '"Pytel peněz?" *Pája se podívá dovnitř* "Ty vole, Fando... je tu víc než jsem měl." *počítá* "Moc víc."',
      () => showNPCLine('paja',
        '"Já nevím, jak ses k tomu dostal, ale..." *zavrtí hlavou a uculí se* "Tady máš tisícovku. Jsi frajer, Fando. Normálně frajer."',
        () => {
          gs.story.paja_quest_done = true;
          gs.story.paja_pytel_given = true;
          gs.story.paja_in_hospoda = false;
          gs.money += 1000; updateHUD();
          gainRep(10, 'Vrátil Pájovi ukradené peníze');
          doneObj('quest_paja_theft');
          addLog('Pája ti dal 1000 Kč odměnu! +10 REP 💰', 'lm');
          fnotif('+1 000 Kč 💰', 'pos');
          fnotif('+10 REP', 'rep');
        }
      )
    );
  },
  q_paja_krejci_back(){
    closeDialog();
    showNPCLine('paja',
      '"Krejčí?" *Pája zamrká* "Tahle učitelka eko? Proč by mi vracela prachy?!" *rozevře ruce*',
      () => showPlayerLine('"Přesvědčil jsem ji. Zaplatila 500 Kč zpátky – tady jsou."',
        () => showNPCLine('paja',
          '"...Ty vole, Fando." *počítá* "Je to fakt." *zavrtí hlavou a uculí se* "Já fakt nevím, jak tohle děláš. Tady máš 200 Kč – zbyl mi bonus z jackpotu. Jsi frajer."',
          () => {
            gs.story.paja_quest_done = true;
            gs.story.paja_in_hospoda = false;
            gs.money += 200; updateHUD();
            gainRep(8, 'Vrátil Pájovi ukradené peníze');
            doneObj('quest_paja_theft');
            addLog('Pájův quest splněn. +200 Kč, +8 REP 💰', 'lm');
            fnotif('+200 Kč 💰', 'pos');
            fnotif('+8 REP', 'rep');
          }
        )
      )
    );
  },
  // ─── Honza – Číhalová quest ──────────────────────────────────────────────
  q_honza_not_done(){
    showNPCLine('honza', '"Ona ještě dýchá, brácho. Přijď, až bude práce hotová."');
  },
  q_honza_cibule_reward(){
    if(!gs.story.cihalova_burned){ closeDialog(); return; }
    gs.story.honza_cibule_given = true;
    gs.inv.cibule = 1; updateInv();
    gainRep(5, 'Honza se dozvěděl o Číhalové');
    fnotif('🧅 +1 Cibule','itm');
    if(activeProfile){
      activeProfile.artifacts.cibule = true;
      profileSaveProgress();
    }
    addObj('side_bezdak_cibule');
    doneObj('quest_honza_cibule');
    updateHUD();
    showNPCLine('honza', '"Věděl jsem, že se na tebe dá spolehnout." *podá cibuli* "Dones ji tomu bezďákovi za Billou. Věř mi, bude se ti hodit."');
  },

  // ─── Honza – propiska quest (Fáze C) ─────────────────────────────────────
  q_honza_propiska_ask(){
    gs.story.honza_propiska_asked = true;
    showNPCLine('honza', '"Hmm..." *zamyslí se a pokrčí rameny* "Teď u sebe nic nemám. Upřímně." *odmlčí se* "...počkej. Hele – zkusím prohledat kapsy, možná tam něco je."');
  },
  q_honza_kapsy(){
    gs.story.honza_kapsy_prohledany = true;
    showNPCLine('honza', '"Tak... tady mám dvě pětikoruny." *Pytel." *vytáhne kapesník* "Kapesník. A..." *podívá se s překvapením* "...propisku. Hele, to jsem ani nevěděl, že ji mám."');
  },
  q_honza_propiska_info(){
    gs.story.honza_propiska_info_given = true;
    closeDialog();
    setTimeout(() => {
      showNPCLine('honza',
        '"Ta propiska?" *mírně se uculí* "To je speciální věc. Koupil jsem ji na Temu – když ji někdo zmáčkne, proběhne elektrický šok." *pauza* "Původně jsem ji koupil spolu s Mikulášem na tebe, abysme si z tebe udělali prdel. Pak jsem si s tím rozhodl trochu pohrát, teď by to možná zabilo i koně."',
        () => {
          addLog('*Hrubeš se jen podívá* "...Jste magoři."', 'ls');
          setTimeout(() => showNPCLine('honza',
            '"Jsem si toho vědom." *odfrknul si* "Ale je to pro prdel. Jestli tě tohle překvapilo, tak se máš na co těšit." *přikloní se blíž* "Kdybys jen viděl Mikulášovu sbírku..."'
          ), 350);
        }
      );
    }, 200);
  },
  q_honza_get_propiska(){
    gs.inv.propiska = 1; updateInv();
    gs.story.honza_propiska_got = true;
    addLog('Dostal jsi propisku od Honzy. ✏️⚡', 'lm');
    fnotif('✏️ Propiska +1', 'itm');
    closeDialog();
  },

  // ─── Figurová – omluvenka + propiska (Fáze D) ────────────────────────────
  q_figurova_omluvenka_ask(){
    gs.story.figurova_omluvenka_asked = true;
    gs.story.figurova_omluvenka_asking = true;
    closeDialog();
    setTimeout(() => {
      showNPCLine('figurova',
        '"Omluvenka." *zvedne obočí* "Fine. Dám ti ji." *sahá do tašky pro tužku*',
        () => { const f = currentNPCs.find(n => n.id === 'figurova'); if(f) showDialog(f); }
      );
    }, 200);
  },
  q_figurova_propiska_offer(){
    if(!gs.inv.propiska){ addLog('Nemáš propisku!', 'lw'); closeDialog(); return; }
    gs.inv.propiska = 0; updateInv();
    gs.story.figurova_omluvenka_asking = false;
    gs.story.figurova_killed = true;
    gs.story.figurova_propiska_kill = true;
    closeDialog();
    setTimeout(() => {
      showNPCLine('figurova',
        '"Ze Švýcarska?" *pochybovačně zvedne obočí* "Fine. Ukažte." *bere propisku, zkusí ji zmáčknout*',
        () => {
          addLog('*Prošlehlo to. Ani nevydala zvuk. Tuhý výboj. Padla dozadu a zůstala ležet.*', 'lw');
          setTimeout(() => addLog('*Třída je tichá. Nikdo se nepohnul.*', 'ls'), 1200);
          fnotif('Figurová zemřela ⚡', 'rep');
          currentNPCs = currentNPCs.filter(n => n.id !== 'figurova');
          doneObj('side_figurova');
          doneObj('quest_figurova_vyres');
          gainRep(8, 'Zlikvidoval Figurovou');
          if(activeProfile){ activeProfile.artifacts.foto_figurova = true; profileSaveProgress(); }
        }
      );
    }, 200);
  },
  q_figurova_omluvenka_no_propiska(){
    gs.story.figurova_omluvenka_asking = false;
    gs.story.figurova_omluvenka_failed = true;
    closeDialog();
    setTimeout(() => {
      showNPCLine('figurova', '"Good." *podepíše a hodí papír* "Hotovo. Teď táhni."');
      addLog('Figurová podepsala omluvenku vlastní tužkou. Quest zmařen – propisku jsi neměl.', 'lw');
      fnotif('Quest zmařen 💀', 'lw');
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

  // ─── Figurová – sklep (Fáze E) ───────────────────────────────────────────
  q_figurova_sklep_start(){
    gs.story.figurova_sklep_started = true;
    closeDialog();
    setTimeout(() => {
      showNPCLine('figurova', '"Dobrou zprávu?" *přimhouří oči* "O čem mluvíte, Hrubeši?"',
        () => {
          setTimeout(() => showPlayerLine(
            '"Špicloval jsem Milana. Našel jsem skrytou místnost – schovává tam zboží. Hory kratomu, šňupací tabák, nakradené počítače od Boxanový."',
            () => {
              setTimeout(() => showNPCLine('figurova',
                '"Evidence..." *vstane, přehodí tašku* "Nechci to slyšet. Chci to vidět. Ukažte mi tu místnost." *skládá papíry*',
                () => {
                  gs.story.figurova_following = true;
                  if(!gs.dead) gs.running = true;
                  // Jistota: zavři dialog overlay pokud by zůstal otevřený
                  document.getElementById('dov').classList.remove('on');
                  addLog('Figurová tě následuje. Zaveď ji ke sklepu v Bille.', 'ls');
                  fnotif('Figurová tě sleduje 🧐', 'pos');
                }
              ), 300);
            }
          ), 200);
        }
      );
    }, 200);
  },
  q_figurova_arrive_door(){
    gs.story.figurova_at_door = true;
    gs.story.figurova_following = false;
    const fig = currentNPCs.find(n => n.id === 'figurova');
    // Figurová stojí vedle průchodu, ne na místě regálu mléka (0.63,0.55)
    if(fig){ fig.x = canvas.width * 0.58; fig.y = canvas.height * 0.68; }
    closeDialog();
    setTimeout(() => {
      showNPCLine('figurova',
        '"Zde?" *kouká na tmavý průchod za regálem, přišlápne nohu* "Je tam... strašná tma." *stojí na prahu, nehýbe se* "Já se... sklepů bojím."',
        () => {
          QF._figurova_door_choices();
        }
      );
    }, 300);
  },
  _figurova_door_choices(){
    document.getElementById('dav').textContent   = '🧐';
    document.getElementById('dname').textContent = 'FIGUROVÁ';
    document.getElementById('drole').textContent = 'stojí na prahu';
    document.getElementById('dtxt').textContent  = 'Figurová se zastavila. Nervy. Přesně jak jsi čekal.';
    document.getElementById('dchoices').innerHTML =
      `<button class="db danger" onclick="runQF('q_figurova_kick')">👟 Skopnout ji dolů</button>` +
      `<button class="db" onclick="closeDialog()">Nechat ji, ať se rozmyslí</button>`;
    document.getElementById('dov').classList.add('on');
  },
  q_figurova_kick(){
    gs.story.figurova_kicked = true;
    gs.story.figurova_following = false;
    gs.story.figurova_at_door = false;
    currentNPCs = currentNPCs.filter(n => n.id !== 'figurova');
    closeDialog();
    addLog('*Figurová vykřikla.* "HRUB–" *pak ticho. Temné, hluboké ticho.*', 'lw');
    fnotif('Figurová letí dolů 🕳️', 'rep');
    addLog('Jdi do sklepa.', 'ls');
  },
  q_figurova_sklep_plea(){
    showNPCLine('figurova',
      '"Hrubeši..." *hlas se láme* "Prosím... zavolejte pomoc. Nemůžu se pohnout." *oči se jí zalévají slzami* "Nezasloužím si to... prosím vás..."',
      () => {
        addLog('"Neměla ses srát do Milana." *říkáš tiše*', 'ls');
        setTimeout(() => {
          gs.story.figurova_plea_done = true;
          QF._kubatova_attack();
        }, 500);
      }
    );
  },
  _kubatova_attack(){
    const figX = canvas.width * 0.22, figY = canvas.height * 0.78;
    currentNPCs = currentNPCs.filter(n => n.id !== 'figurova');
    addLog('*Ticho. Pak – svist. Kubátová se pohnula.*', 'lw');
    gs.kubatova_bite_anim = { startTime: gs.ts, figX, figY };
    // hlava zmizí = dead_sklep flag při návratu Kubátové
    setTimeout(() => {
      addLog('*Křik. Krátký. Pak ticho.*', 'lw');
    }, 1200);
    setTimeout(() => {
      gs.story.figurova_dead_sklep = true;
      gs.story.figurova_killed = true;
      fnotif('Figurová... 💀', 'rep');
      doneObj('side_figurova');
      doneObj('quest_figurova_vyres');
      gainRep(10, 'Figurová skoncována v sklepě');
    }, 3700);
    setTimeout(() => {
      addLog('*Kubátová se vzpřímí. Otočí se k tobě.*', 'lw');
    }, 4600);
    setTimeout(() => {
      const kub = currentNPCs.find(n => n.id === 'kubatova');
      if(!kub) return;
      showNPCLine('kubatova',
        '"Děkuji ti, Hrubši." *klidný hlas, jako by se nic nestalo* "Zařídil jsi to výtečně."',
        () => showNPCLine('kubatova',
          '"Ta svině všem vyžrávala obědy z lednice. Každý den. Bez výjimky." *pauza* "Zasloužila si to."',
          () => {
            gs.inv.foto_figurova = 1; updateInv();
            if(activeProfile){ activeProfile.artifacts.foto_figurova = true; profileSaveProgress(); }
            addLog('Na památku ti Kubátová podala fotku Figurové. 📸', 'lm');
            fnotif('📸 Fotka Figurové!', 'itm');
          }
        )
      );
    }, 5000);
  },

  // ─── Mikuláš ──────────────────────────────────────────────────────────────
  q_mik_10g(){
    if(gs.money < 30){ addLog('Nemáš 30 Kč!','lw'); closeDialog(); return; }
    gs.money -= 30; gs.inv.kratom += 10; updateInv(); updateHUD();
    gainRep(1,'Koupil kratom');
    addLog('Koupil jsi 10g od Mikuláše za 30 Kč. 🌿','ls');
    fnotif('+10g 🌿','itm'); closeDialog();
  },
  q_mik_blend(){
    const forJana = gs.story.jana_rande_asked && !gs.story.jana_rande_ok;
    const price = forJana ? 50 : 30;
    if(gs.money < price){ addLog(`Nemáš ${price} Kč!`,'lw'); closeDialog(); return; }
    gs.money -= price; gs.inv.blend += 1; updateInv(); updateHUD();
    if(forJana){
      addLog('Speciální blend pro Janu. Svět vypadá jinak.','lw');
      fnotif('Blend pro Janu 🌿','itm');
    } else {
      addLog('Speciální blend – svět vypadá jinak.','lw');
    }
    closeDialog();
  },
  q_mik_free(){
    gs.inv.kratom += 50; updateInv(); updateHUD();
    gainRep(2,'Dostal kratom zdarma');
    addLog('Mikuláš ti dal 50g zdarma. 🌿','lm');
    fnotif('+50g 🌿','itm'); closeDialog();
  },
  q_mik_confront(){
    gs.story.mikulas_confronting = true;
    closeDialog();
    setTimeout(() => showDialog({id:'mikulas', ...NPCS.mikulas}), 150);
  },
  q_mik_press(){
    gs.story.mikulas_pressed = true;
    closeDialog();
    setTimeout(() => showDialog({id:'mikulas', ...NPCS.mikulas}), 150);
  },
  q_mik_apologize(){
    gs.story.krejci_resolved = true;
    gs.story.mikulas_apologized = true;
    addLog('Mikuláš šel za Krejčí – celý červený. Omluva proběhla před třídou.', 'ls');
    fnotif('Vyřešeno','pos'); closeDialog();
  },
  q_mik_beat(){
    gs.story.krejci_resolved = true;
    gainRep(3, 'Zmlátil Mikuláše');
    addLog('Mikuláš skončil na podlaze. Pak se šel omluvit. Rychle.', 'lw');
    fnotif('Vyřešeno','pos'); closeDialog();
  },
  q_mik_secret(){
    gs.story.mikulas_reveal_line = 0;
    closeDialog();
    setTimeout(() => showDialog({id:'mikulas', ...NPCS.mikulas}), 150);
  },
  q_mik_reveal_next(){
    gs.story.mikulas_reveal_line = (gs.story.mikulas_reveal_line || 0) + 1;
    closeDialog();
    setTimeout(() => showDialog({id:'mikulas', ...NPCS.mikulas}), 150);
  },
  q_mik_secret_done(){
    gs.story.krejci_resolved = true;
    gs.story.mikulas_reveal_done = true;
    gs.story.sklep_unlocked = true;
    addLog('Mikuláš: "Sklep je volný. Ale pentagram nerozbíjej." 🕯️', 'ls');
    fnotif('Sklep odemčen 🕯️','pos'); closeDialog();
  },

  // ─── Milan ────────────────────────────────────────────────────────────────
  q_milan_protiutok(){
    gs.story.milan_protiutok_asked = true;
    gs.story.milan_knows_fig_spy = true;
    gs.story.milan_met = true;
    closeDialog();
    setTimeout(() => {
      showNPCLine('milan',
        '"Takže ona tě na mě poslala?!" *zaskřípe zubama, pak se zastaví a vydechne* "Dobrej. Díky, že mi to říkáš." *chvíli přemýšlí* "Poslouchej – já ti říct, co máš dělat, nemůžu. To musíš vyřešit sám. Ale Figurová se musí přestat motat do mých věcí." *mávne rukou* "Nějak to zařiď. Věřím, že na něco přijdeš."',
        () => { addObj('quest_figurova_vyres'); }
      );
    }, 200);
  },
  q_milan_protiutok_reward(){
    if(!gs.story.figurova_kratomed){ closeDialog(); return; }
    gs.story.milan_protiutok_done = true;
    gs.money += 300; updateHUD();
    gainRep(6, 'Zneškodnil Figurovou pro Milana');
    addLog('Milan: "Sanitka přijela rychle. Bylo to... efektivní." *strkuje ti peníze* "Nikdy jsme se neviděli. +300 Kč" 💰', 'lm');
    fnotif('+300 Kč','pos'); closeDialog();
  },
  q_milan_honza(){
    gs.story.milan_honza_ok = true;
    addLog('Milan souhlasí s Honzovým plánem.','ls');
    closeDialog(); showDialog(NPCS.milan);
  },
  q_milan_explain_figurova(){
    gs.story.milan_explained_figurova = true;
    closeDialog();
    showNPCLine('milan', '"Figurová?" *odfoukne* "Upřímně, fakt netuším, co jsem jí udělal. Ale už mě to sere, hlavně teď po tom, co vyhrožovala Matesovi."');
  },
  q_milan_threats(){
    gs.story.milan_showed_threats = true;
    closeDialog();
    showNPCLine('milan', '"Jo, Matesovi vyhrožovala, že ho zabije. Přímo do očí, v hospodě, před lidma. Mates to má nahraný. Mám screenshot i hlasovku." *nakloní se* "Chceš to vidět? Mám důkazy."');
  },
  q_milan_fig(){
    // Screenshot + hlasovka jako důkaz
    gs.story.milan_fig_evidence = true; gs.story.milan_met = true;
    gs.story.hlasovka_known = true;
    gs.inv.screenshot = 1; gs.inv.hlasovka = 1; updateInv();
    addLog('Milan ti ukázal screenshot a pustil ti hlasovku.','ls');
    fnotif('📱 Screenshot +1','itm');
    fnotif('🎙️ Hlasovka +1','itm');
    showNPCLine('milan', '"Evidence is yours now, Fando. Jen se mě neptej, jak jsem k tomu přišel." *mrkne*',
      () => showScreenshot());
  },

  q_milan_fig_historia(){
    gs.story.milan_fig_historia_told = true;
    closeDialog();
    showNPCLine('milan',
      '"Víš co mě štvie?" *zapije pivo* "Ta ženská bere prachy od rodičů za individuální přípravu. Tři tisíce za hodinu, hotovost, bez dokladu. A ta příprava? Nikdy se nekoná. Rodiče se bojí stěžovat, protože jinak jejich dítě propadne nebo nedostane doporučení na vejšku."',
      () => showNPCLine('milan',
        '"Mates to ví. Já to vím. Proto mě chce dostat." *nakloní se* "Jenže já nekecám do vzduchu – Mates má hlasovky, já mám jméno jednoho táty, co mi to řekl přímo do telefonu. Figurová to tuší." *pauza* "A teď ses dozvěděl taky ty."'
      )
    );
  },
  q_figurova_motive_ask(){
    gs.story.figurova_motive_explained = true;
    closeDialog();
    showNPCLine('figurova',
      '"Proč Milan?" *odloží pero* "Milan Mráz není jenom dealer, Hrubeši. Tři z mých nejlepších studentů loni – kratom, absence, totálně vyhořeli. Mám zodpovědnost vůči téhle škole." *skříží ruce*',
      () => showNPCLine('figurova',
        '"A ví věci, které by vědět neměl." *chvíle ticha* "Věci o určitých... administrativních záležitostech. Pokud se ty informace dostanou na špatná místa, nejde jen o moji kariéru." *zahledí se na tebe* "Takže ano. Je to osobní i profesionální. Sežeňte mi důkazy."'
      )
    );
  },
  // ─── Kubátová ──────────────────────────────────────────────────────────────

  // ─── Kubátová – Mrázův quest ──────────────────────────────────────────────
  q_kub_mraz_start(){
    gs.story.mraz_explain_line = 0;
    closeDialog();
    setTimeout(() => {
      const n = currentNPCs.find(x => x.id === 'kubatova');
      if(n) showDialog(n);
    }, 150);
  },
  q_kub_explain_next(){
    gs.story.mraz_explain_line = (gs.story.mraz_explain_line || 0) + 1;
    closeDialog();
    setTimeout(() => {
      const n = currentNPCs.find(x => x.id === 'kubatova');
      if(n) showDialog(n);
    }, 150);
  },
  q_kub_give_items(){
    gs.story.kubatova_quest = 1;
    gs.inv.voodoo = 1; gs.inv.nuz = 1; updateInv();
    addObj('quest_mraz');
    addLog('Kubátová ti dala voodoo panenku a rezavý nůž. 🪆🔪', 'lw');
    fnotif('🪆 +1   🔪 +1', 'itm');
    closeDialog();
  },
  q_milan_give_phone(){
    gs.inv.milan_phone = 1; updateInv();
    gs.story.milan_phone_taken = true;
    addLog('Milan vytáhl telefon. "Tady, chvíli si ho drž." *nic nečeká*', 'ls');
    fnotif('📲 Milanův tel. +1','itm');
    closeDialog();
  },
  q_milan_shoot(){
    if(!gs.inv.fig_gun){ addLog('Nemáš zbraň!','lw'); closeDialog(); return; }
    gs.inv.fig_gun = 0; updateInv();
    gs.story.milan_shot = true;
    gs.story.murder_milan = true;
    // Milan padne – spustit animaci stříkající krve
    const milanNPC = currentNPCs.find(n => n.id === 'milan');
    if(milanNPC) gs.milan_death_anim = { x: milanNPC.x, y: milanNPC.y, startTime: gs.ts };
    currentNPCs = currentNPCs.filter(n => n.id !== 'milan');
    addLog('Výstřel. Milan padl k zemi. Krev stříkala po dlažbě.', 'lw');
    addLog('Křemžské náměstí bylo tiché. Pak se ticho rozpadlo.', 'lw');
    fnotif('Milan... 🩸','rep');
    doneObj('quest_figurova_milan');
    closeDialog();
  },
  q_milan_warn(){
    gs.story.milan_warn_count = 1;
    closeDialog();
    setTimeout(() => {
      const n = currentNPCs.find(x => x.id === 'milan');
      if(n) showDialog(n);
    }, 150);
  },
  q_milan_warn_again(){
    gs.story.milan_warn_count = (gs.story.milan_warn_count || 0) + 1;
    closeDialog();
    setTimeout(() => {
      const n = currentNPCs.find(x => x.id === 'milan');
      if(n) showDialog(n);
    }, 150);
  },
  q_milan_finally_leave(){
    gs.story.milan_waiting_mates = true;
    gs.story.mraz_done = true;
    gainRep(5, 'Varoval Milana – přijal varování');
    // Milan přejde do hospody – čeká na Matese
    currentNPCs = currentNPCs.filter(n => n.id !== 'milan');
    addLog('Milan zmizel z náměstí směrem k hospodě.', 'ls');
    fnotif('Milan v hospodě 🍺', 'pos');
    gs.story.milan_in_hospoda = true;
    gs.milan_leave_deadline = gs.ts + 60000;
    showNPCLine('milan', '"Dobrej. Zavolám Matesovi – on má auto. Počkám v hospodě, až přijde."');
  },
  q_milan_go_kub(){
    gs.story.milan_going_to_sklep = true;
    addLog('Milan: "Tak se s ní jdu pobavit osobně." *odejde směrem k Bille* 😤', 'lw');
    fnotif('Milan jde do sklepa...', 'rep');
    currentNPCs = currentNPCs.filter(n => n.id !== 'milan');
    closeDialog();
  },
  q_kub_mraz_reward(){
    if(gs.story.mraz_reward_given){ closeDialog(); return; }
    gs.story.mraz_reward_given = true;
    gainRep(12, 'Kubátová vděčná za Mrázův osud');
    addLog('*Démon se ukloní přes Kubátovou* "Dluh je splacen, Hrubši."', 'lm');
    fnotif('+12 REP 👁️', 'rep');
    doneObj('quest_mraz');
    updateHUD(); closeDialog();
  },

  // ─── Pláteníková ──────────────────────────────────────────────────────────
  q_platenikova_tell(){
    gs.story.platenikova_rewarded = true;
    gainRep(30, 'Nejvyšší pochvala ředitelky');
    gs.money += 1000;
    updateHUD();
    addObj('quest_platenikova');
    doneObj('quest_platenikova');
    closeDialog();
    setTimeout(() => {
      showNPCLine('platenikova',
        '"Hrubeši..." *Pláteníková odloží notes* "To, co jste mi právě řekl... to je nesmírně důležité." *vstane* "Dostanete nejvyšší pochvalu ředitelky školy. A vaše maturita?" *vytáhne razítko* "Maturita s nejlepším vyznamenáním. Zasloužíte si to." *podá ti diplom*',
        () => {
          addLog('🏆 Získal jsi MATURITU S NEJLEPŠÍM VYZNAMENÁNÍM!', 'lr');
          addLog('🏆 Získal jsi NEJVYŠŠÍ POCHVALU ŘEDITELKY!', 'lr');
          fnotif('🏆 MATURITA!', 'rep');
          fnotif('🏆 POCHVALA!', 'rep');
          showMaturita();
          // Artefakt + achievement
          if(activeProfile){
            activeProfile.artifacts.maturita = true;
            profileSaveProgress();
          }
        }
      );
    }, 300);
  },
  q_platenikova_dramatic(){
    // Číhalová je mrtvá, Pláteníková zjistí co se děje
    gs.story.platenikova_dramatic = true;
    closeDialog();
    setTimeout(() => {
      showNPCLine('platenikova',
        '"CO?! Figurová, vysvětlete mi, co se tu děje. OKAMŽITĚ!" *hlas se třese vztekem*',
        () => {
          addLog('Pláteníková konfrontuje Figurovou přede všemi studenty...', 'lw');
          setTimeout(() => {
            showNPCLine('platenikova',
              '"Figurová, jste PROPUŠTĚNA. Okamžitě. Sbalte si věci a odejděte." *Figurová zbledne*',
              () => {
                addLog('*Figurová se třese... pomalu sáhne do tašky...*', 'lw');
                setTimeout(() => {
                  addLog('💥 *Figurová vytáhla REVOLVER!*', 'lw');
                  screenShake(400);
                  setTimeout(() => {
                    addLog('💥 *VÝSTŘEL – Pláteníková padá k zemi!*', 'lw');
                    screenShake(600);
                    setTimeout(() => {
                      showNPCLine('figurova',
                        '"Ty ZMRDE." *otočí se na tebe, oči rudé* "Neměl jsi jí to říkat. NEMĚL JSI JÍ TO ŘÍKAT!" *namíří revolver na tebe*',
                        () => {
                          setTimeout(() => triggerDeath(
                            'Figurová stiskla spoušť. Dvakrát.\nPrvní kulka pro Pláteníkovou. Druhá pro tebe.\n"We were never here."',
                            'ZASTŘELEN FIGUROVOU',
                            'KONEC HRY · HOSPITACE SE ZVRHLA',
                            'death_figurova_shootout'
                          ), 600);
                        }
                      );
                    }, 1500);
                  }, 1500);
                }, 1500);
              }
            );
          }, 2000);
        }
      );
    }, 300);
  },

  // ─── Kasička doma ─────────────────────────────────────────────────────────
  q_kasicka(){
    if(gs.kasicka_taken){ addLog('Kasička je prázdná.','lw'); return; }
    gs.kasicka_taken = true;
    gs.money += 100; updateHUD();
    addLog('Vybral jsi 100 Kč z kasičky. 💰', 'ls');
    fnotif('+100 Kč', 'pos');
  },

  // ─── Šamanova hlava – pickup ──────────────────────────────────────────────
  q_saman_pickup_head(){
    gs.inv.saman_hlava = 1; updateInv();
    addLog('Vzal jsi si šamanovu hlavu. Celou od krve. Proč?!', 'lw');
    fnotif('🩸 Šamanova hlava!', 'itm');
    if(activeProfile){
      activeProfile.artifacts.saman_hlava = true;
      profileSaveProgress();
    }
  },

  // ─── Fábie – jet domů (WIN) ───────────────────────────────────────────────
  q_fabie_drive(){
    // Figurová klíčky = falešné, otáčí se naprázdno
    if(!gs.inv.klice_fabie && gs.inv.klice_fabie_fig){
      addLog('Zasuneš klíček od Figurové… otáčí se naprázdno. "We were never here." Ty klíčky nejsou od téhle Fábie.','lw');
      fnotif('🔑 Figurové klíčky nesedí!','lw');
      return;
    }
    if(!gs.inv.klice_fabie){ addLog('Nemáš klíčky od Fábie!','lw'); return; }
    // Potvrzení – chceš už to dneska zabalit?
    document.getElementById('dname').textContent = 'FÁBIE';
    document.getElementById('drole').textContent  = 'klíčky v ruce';
    document.getElementById('dtxt').textContent  = 'Chci už to dneska zabalit a jet domů?';
    document.getElementById('dchoices').innerHTML =
      `<button class="db prim" onclick="closeDialog();QF._fabie_drive_confirmed()">🚗 Ano, jedu domů</button>` +
      `<button class="db" onclick="closeDialog()">Ještě ne</button>`;
    document.getElementById('dov').classList.add('on');
  },
  _fabie_drive_confirmed(){
    doneObj('quest_fabie');
    doneObj('main_rep');
    setTimeout(showWin, 800);
  },
};
