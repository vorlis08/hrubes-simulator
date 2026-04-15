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
    addLog('Přijal jsi úkol od Číhalové – máš 90 sekund!', 'lw');
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
      addLog('*Číhalová se chytá za hrudník. Dýchá mělce. Upadá na zem.*','lw');
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
    addLog('Číhalová si vzala zásilku... a skolabovala. +800 Kč 💰', 'lm');
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
  q_figurova_blackmail_money(){
    if(!gs.inv.foto_kubatova){ addLog('Nemáš fotku!','lw'); closeDialog(); return; }
    gs.inv.foto_kubatova = 0; updateInv();
    gs.money += 2000; updateHUD();
    gs.story.figurova = 2;
    addLog('Figurová zaplatila 2 000 Kč za mlčení. Ruka se jí třásla.', 'lm');
    fnotif('+2 000 Kč 💰','pos');
    doneObj('side_figurova'); closeDialog();
  },
  q_figurova_blackmail_cert(){
    if(!gs.inv.foto_kubatova){ addLog('Nemáš fotku!','lw'); closeDialog(); return; }
    gs.inv.foto_kubatova = 0; updateInv();
    gs.inv.c2_cert = 1; updateInv();
    gs.story.figurova = 2;
    addLog('Figurová: "Fine." *vytáhne razítko* "Certified C2. Highest score." *podá ti padělek*', 'lm');
    fnotif('📜 C2 Certifikát!','itm');
    // Achievement
    if(typeof unlockAchievement === 'function') unlockAchievement('cert_c2','Certified Bullshitter','C2 certifikát z angličtiny – zfalšovaný Figurovou');
    doneObj('side_figurova'); closeDialog();
    setTimeout(() => showC2Cert(), 400);
  },
  q_figurova_dark_accept(){
    gs.inv.fig_nuz = 1; updateInv();
    gs.story.figurova_dark_contract = true;
    addLog('Figurová ti podala nůž. Studená ocel. Žádné slova navíc.', 'lw');
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
  q_jana_fake(){
    if(!gs.inv.fake_kratom){ addLog('Nemáš fejkový kratom!','lw'); closeDialog(); return; }
    gs.inv.fake_kratom = 0; updateInv();
    addLog('Podal jsi Janě fejkový kratom...', 'lw');
    closeDialog();
    setTimeout(() => triggerStabDeath(), 800);
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
    addLog('Koupil jsi pytel na odpadky od Matese. 🗑️ Teď jdi k Číhalové.', 'lm');
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
    fnotif('+200 Kč', 'pos');
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
    setTimeout(() => {
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
    gainRep(15, 'Jana ti důvěřuje');
    addLog('Dostal jsi Janino číslo. +15 REP 📱', 'lm');
    fnotif('+15 REP 📱', 'rep');
    closeDialog();
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
  q_cibulka_farewell(){
    gs.story.cibulka_left = true;
    addLog('Petr Cibulka odešel do tmy. Překvapivě ti bude chybět.', 'ls');
    fnotif('Cibulka odešel 🚶', 'rep');
    closeDialog();
    const idx = currentNPCs.findIndex(n => n.id === 'bezdak');
    if(idx !== -1) currentNPCs.splice(idx, 1);
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
  q_johnny_return_leave(){
    gs.story.johnny_return_left = true;
    gs.room = 'kremze'; initRoom();
    closeDialog();
    addLog('Odešel jsi z Johnnyho vily.', 'ls');
  },
  // Koupelna – šuplík se želízky
  q_koupelna_drawer(){
    if(gs.story.koupelna_drawer_opened){ addLog('Šuplík je prázdný.','lw'); return; }
    gs.story.koupelna_drawer_opened = true;
    gs.inv.zelizka = 1; updateInv();
    addLog('V šuplíku pod umyvadlem – želízka. Johnnyho "hračky".', 'lw');
    fnotif('⛓️ Želízka','itm');
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
    setTimeout(() => {
      gs.story.paja = 2;
      addLog('Pája tě hledá – vrátil peníze! Jdi na ulici.','lm');
      fnotif('Pája volá! 📞','pos');
      // Po 15s navíc – Pája vyhraje jackpot a jde do hospody
      setTimeout(() => {
        gs.story.paja_jackpot = true;
        gs.story.paja_in_hospoda = true;
        addLog('📱 SMS od Páji: "FANDAAA! JACKPOT 5000 Kč!! Jsem v hospodě, slavím!!"', 'lm');
        fnotif('Pája vyhrál JACKPOT! 🎰', 'pos');
      }, 15000);
    }, 35000);
    closeDialog();
  },
  q_paja_collect(){
    if(gs.story.paja !== 2){ closeDialog(); return; }
    gs.money += 500; gs.story.paja = 3; updateHUD();
    addLog('Pája vrátil 500 Kč! Zisk +200 Kč 🎉','lm');
    fnotif('+500 Kč','pos'); doneObj('side_paja'); closeDialog();
  },
  q_paja_fabie_info(){
    gs.story.paja_fabie_told = true;
    addLog('Pája: "Heslo pro šamana je FÁBIE. Dávej bacha na něj!"', 'ls');
    fnotif('Heslo: FÁBIE 🔑', 'itm');
    closeDialog();
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
  // q_mik_fake – odstraněno, fejkový kratom už Mikuláš neprodává
  // ─── Honza – fentanyl kafe pro Figurovou ────────────────────────────────
  q_honza_fent(){
    if(gs.money < 400){ addLog('Nemáš 400 Kč!','lw'); closeDialog(); return; }
    if(gs.inv.fent_kava){ addLog('Už máš fentanyl kafe!','lw'); closeDialog(); return; }
    gs.money -= 400; gs.inv.fent_kava = 1; updateInv(); updateHUD();
    gs.story.honza_fent_bought = true;
    addLog('Honza ti pod stolem podal kelímek. "Studený, ale nic si toho nevšimne." ☕', 'lw');
    fnotif('☕ Fentanyl kafe','itm');
    addObj('quest_figurova_kafe');
    closeDialog();
  },
  q_figurova_fent(){
    if(!gs.inv.fent_kava){ addLog('Nemáš fentanyl kafe!','lw'); closeDialog(); return; }
    gs.inv.fent_kava = 0; updateInv();
    gs.story.figurova_fent = true;
    gs.story.figurova_sanitka = true;
    addLog('Figurová vypila kafe. Za chvíli se chytila za hrudník. Dýchání zpomalilo.', 'lw');
    setTimeout(() => {
      addLog('*Sanitka přijela. Odvezli ji. "We were never here." – poslední, co řekla.*','lw');
      currentNPCs = currentNPCs.filter(n => n.id !== 'figurova');
      doneObj('quest_figurova_kafe');
      doneObj('side_figurova');
      fnotif('Figurová paralyzovaná ☕','rep');
    }, 2500);
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
    gs.inv.kratom_kava = 1; updateInv();
    addObj('quest_milan_protiutok');
    addLog('Milan: "Takže ona tě na mě poslala... Výborně." *sáhne do tašky* "Tady je kratom blend. Přimíchej jí ho do kafe. Stůl vlevo od tabule." 🕵️', 'lw');
    fnotif('☕ kratom_kava +1','itm'); closeDialog();
  },
  q_milan_protiutok_reward(){
    if(!gs.story.figurova_kratomed){ closeDialog(); return; }
    gs.story.milan_protiutok_done = true;
    gs.money += 300; updateHUD();
    gainRep(6, 'Zneškodnil Figurovou pro Milana');
    addLog('Milan: "Sanitka přijela rychle. Bylo to... efektivní." *strkuje ti peníze* "Nikdy jsme se neviděli. +300 Kč" 💰', 'lm');
    fnotif('+300 Kč','pos'); closeDialog();
  },
  q_milan_note(){
    if(!gs.inv.note){ addLog('Nemáš dopis!','lw'); closeDialog(); return; }
    gs.inv.note = 0; gs.inv.kratom += 100; updateInv(); updateHUD();
    gs.story.milan_met = true;
    gainRep(3,'Dal Milanovi dopis místo na poštu');
    addLog('Dal jsi dopis Milanovi. 100g zdarma! 🌿','lm');
    fnotif('+100g 🌿','itm');
    if(gs.story.krejci === 1) gs.story.krejci_delivered = true;
    closeDialog();
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
  q_milan_told_figurova_spy(){
    gs.story.milan_knows_fig_spy = true;
    closeDialog();
    showNPCLine('milan', '"Takže ona tě na mě poslala?!" *zaskřípe zubama* "Dobrý. Víš co? Běž za Honzou. Má fentanylový kafe. Dej ho Figurové, a má klid. Tu svini. Řekni mu, že jsem tě poslal." 😡');
    gs.story.honza_mission = true;
    addObj('quest_honza_fent');
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
  q_milan_fig_foto(){
    // Fotka Milan + Kubátová jako alternativní důkaz
    gs.story.milan_fig_evidence = true; gs.story.milan_met = true;
    gs.story.milan_fig_foto = true;
    gs.inv.foto_kubatova = 1; updateInv();
    addLog('Milan ti ukázal fotku. Je na ní on a Kubátová v sklepě. Figurová by za tohle zaplatila hodně...','ls');
    fnotif('📸 Fotka +1','itm');
    closeDialog();
    setTimeout(() => showFotoKubatova(), 400);
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
