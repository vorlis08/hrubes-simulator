'use strict';
// ═══════════════════════════════════════════
//  KONFIGURACE & STATICKÁ DATA
// ═══════════════════════════════════════════

const KRATOM_DOSE_G   = 10;
const SCARED_SEC      = 0; // unused
const FREEZE_MS       = 8000;
const PROX_R          = 90;
const ENERGY_DRAIN_MS = 2000;
const CIHALOVA_TIMER  = 90; // sekund na doručení pika

const REP_LEVELS = [
  {min:0,   label:'🎒 Trapná nula',        color:'#94a3b8'},
  {min:10,  label:'🚬 Nikdo důležitý',     color:'#a3e635'},
  {min:22,  label:'🍺 Místní problém',      color:'#fb923c'},
  {min:38,  label:'💊 Frajer Fanda',        color:'#f43f5e'},
  {min:55,  label:'👑 Křemžská legenda',    color:'#a855f7'},
  {min:72,  label:'🔥 Boss',               color:'#f97316'},
  {min:90,  label:'💀 UltraMegaBoss',      color:'#f0c040'},
  {min:120, label:'🌋 Apokalypsa v Křemži', color:'#ff2222'},
  {min:160, label:'👹 Absolutní Degenerát', color:'#ff00ff'},
  {min:200, label:'🛸 Mimozemská hrozba',   color:'#00ffff'},
  {min:300, label:'💎 Diamantový Fanda',    color:'#00ff88'},
  {min:500, label:'🌌 Vesmírný Bůh Křemže', color:'#ffffff'},
];
function getRepLevel(r){ let l=REP_LEVELS[0]; for(const x of REP_LEVELS) if(r>=x.min) l=x; return l; }

// ─── NPC definice ───────────────────────────────────────────────────────────

const NPCS = {

  cihalova: {
    name:'Číhalová', role:'Učitelka ČJ & FRJ', emoji:'👩‍🏫',
    room:'ucebna', rx:.27, ry:.40, color:'#ec4899', size:1,
    dialogs:[
      {
        text:'"Hrubeši! Už ZASE chrápete?! Že já se na Vás všechny nevyseru! Myslíte si snad, že mě to tu s vámi baví?! Potřebuju něco na nervy.. Kde je ten můj xanax? HRUBEŠI! Skoč za bezďákem za Billu, on by pro mě měl mít něco dobrého. A pohni!"',
        choices:[
          {label:'Přijmout úkol',       cls:'prim',   fn:'q_cihalova_start'},
          {label:'Odmítnout',           cls:'danger', fn:'close'},
        ]
      },
      {
        text:'"Tak už to máš? Už jsem se začínala klepat. No tak dělej, na co čekáš? Davaj!"',
        choices:[
          {label:'💊 Předat zásilku Číhalové', cls:'prim',   fn:'q_cihalova_deliver'},
          {label:'☠️ "Tady máš celou dávku."', cls:'danger', fn:'q_cihalova_overdose', sub:'Předávkuje se'},
          {label:'💊 Vzít si piko sám',        cls:'danger', fn:'q_piko_self', sub:'Číhalová kouká'},
          {label:'Ještě ho nemám',             cls:'danger', fn:'close'},
        ]
      },
      {
        text:'*Číhalová se předávkovala.*',
        choices:[{label:'(Odejít)', fn:'close'}]
      }
    ]
  },

  krejci: {
    name:'Krejčí', role:'Učitelka EKO & ÚČT', emoji:'📊',
    room:'ucebna', rx:.72, ry:.50, color:'#8b5cf6', size:1,
    dialogs:[
      {
        text:'"Hrubeši..." *ztišuje hlas, rozhlédne se* "Dostávám anonymní výhružné vzkazy. Víte, co to znamená – kdybych to nahlásila, bylo by to divné. Proč by mě někdo vydíral, že?" *podává zmačkaný papír* "Zjistěte, kdo za tím stojí. Přesvědčte ho, ať toho nechá. Diskrétně."',
        choices:[
          {label:'🔍 Přijmout úkol', cls:'prim',  fn:'q_krejci_start'},
          {label:'To není moje starost', cls:'danger', fn:'close'},
        ]
      },
      {
        text:'"Tak co, Hrubeši? Přišli jste na něco?"',
        choices:[
          {label:'✅ Vyřídil jsem to', cls:'prim',   fn:'q_krejci_reward'},
          {label:'Pracuju na tom',     cls:'danger', fn:'close'},
        ]
      },
      {
        text:'"Děkuji, Hrubeši." *chvíli mlčí* "Říká se, že ekonomika je věda o volbách. Dnes jste udělal správnou volbu."',
        choices:[{label:'(Odejít)', fn:'close'}]
      }
    ]
  },

  figurova: {
    name:'Figurová', role:'Uč. angličtiny & obchodní AJ', emoji:'🧐',
    room:'ucebna', rx:.50, ry:.68, color:'#475569', size:1.45,
    dialogs:[
      {
        text:'"Sit DOWN, Hrubeš. I have been watching you. I know about Milan. Bring me proof. Your absences will disappear. Plus four hundred crowns. Do we have a deal?"',
        choices:[
          {label:'🕵️ Přijmout – špehovat Milana', cls:'special', fn:'q_figurova_start', sub:'Morálně pochybné'},
          {label:'No deal, miss.',                  cls:'danger',  fn:'close'},
        ]
      },
      {
        text:'"I need EVIDENCE, Hrubeš. Not words." *skříží ruce*',
        choices:[{label:'(Odejít)', fn:'close'}]
      },
      {
        text:'"Výborně. You were never here. 400 crowns. Absences: deleted." *mrkne*',
        choices:[{label:'💰 Vzít odměnu', cls:'prim', fn:'q_figurova_reward'}]
      },
      // stage 3 – po kratom kafe
      {
        text:'*Figurová se potácí, drží se stolu* "Já... já se... necítím dobře..." *padá na stoličku* *v dálce sirény*',
        choices:[{label:'(Tiše odejít)', fn:'close'}]
      },
      // stage 4 – dark path: přečetla screenshot, dává kontrakt
      {
        text:'"..." *Figurová chvíli mlčí. Zvuk kazety, jak se přehraje do konce.* "Mates." *řekne tiše* "Milan." *odloží telefon* "Oba vědí příliš mnoho, Hrubeš. Oba musí zmizet. Ty to zařídíš." *vytáhne z tašky nůž* "Mates je v hospodě. Milan na náměstí. Pistoli dostaneš po Matesovi." *pohled studený jako kámen*',
        choices:[
          {label:'🗡️ Přijmout kontrakt', cls:'danger', fn:'q_figurova_dark_accept'},
          {label:'📜 "Chci jen certifikát. Ať se u maturity nepotkáme."', cls:'special', fn:'q_figurova_dark_cert_leave'},
        ]
      },
      // stage 5 – čeká na výsledek (oba ještě nenamrtvi)
      {
        text:'"Práce ještě není hotová, Hrubeš." *nepodívá se na tebe* "Jdi."',
        choices:[{label:'(Odejít)', fn:'close'}]
      },
      // stage 6 – hotovo, dává odměnu
      {
        text:'"Efficiency." *přepočítá bankovky* "3 000 Kč. A Fábie bude na náměstí do večera." *mlčí* "We were never here."',
        choices:[]
      }
    ]
  },

  lenka: {
    name:'Lenka', role:'Prodavačka pizzy', emoji:'🍕',
    room:'billa', rx:.32, ry:.45, color:'#ea580c', size:1,
    dialogs:[
      {
        text:'"Ahooj, Jana dneska není – zaskakuju. Co si dáš? Pizza žemle za 35 Kč, anebo mám i fresh margheritu za 80 Kč."',
        choices:[
          {label:'🍕 Pizza žemle (35 Kč)',    cls:'prim',   fn:'q_lenka_zemle'},
          {label:'🍕 Margherita (80 Kč)',    cls:'prim',   fn:'q_lenka_margherita', sub:'+45 energie'},
          {label:'"Kde je Jana?"',           cls:'special', fn:'q_lenka_kde_jana'},
          {label:'Později',                  cls:'danger', fn:'close'},
        ]
      },
      {
        text:'"Jana? Slyšela jsem něco s Johnnym v hospodě... Chudák holka. Kdybys ji viděl, pozdravuj!"',
        choices:[{label:'Jasně', fn:'close'}]
      }
    ]
  },

  jana_kosova: {
    name:'Jana Kosová', role:'Spolužačka / Pokladní', emoji:'💅',
    room:'billa', rx:.32, ry:.45, color:'#be185d', size:1,
    dialogs:[
      {
        text:'"Ugh, Fanda. Mám hrozně dlouhou směnu. Dones mi 20g kratomu, ať to přežiju. Dám ti 400 Kč."',
        choices:[
          {label:'✔ Přijmout úkol (20g)', cls:'prim',  fn:'q_jana_start'},
          {label:'Nemám zájem, Jano',      cls:'danger', fn:'close'},
        ]
      },
      {
        text:'"Tak co, máš ten kratom? Fakt tu umírám."',
        choices:[
          {label:'🌿 Předat 20g kratomu',      cls:'prim',   fn:'q_jana_deliver'},
          {label:'💀 Dát fejkový kratom',       cls:'danger', fn:'q_jana_fake', sub:'Velmi špatný nápad'},
          {label:'Ještě nemám',                 cls:'danger', fn:'close'}
        ]
      },
      {
        text:'"Dík. Jsi docela fajn... na to, co se o tobě říká."',
        choices:[{label:'(Odejít)', fn:'close'}]
      },
      // stage 3 – v hospodě na rande, nepohodlná
      {
        text:'"Fando... Ráda jsem, že jsi tady." *sklopí oči* "Ten Johnny je... divný. Pořád se ke mně mačká a říká věci, co mi nejsou příjemný. Nevím jestli to zvládnu."',
        choices:[
          {label:'Pohoda Jano, Johnnny je v pohodě', cls:'danger', fn:'close'},
          {label:'Pojď, jdeme odtud',                 cls:'prim',   fn:'q_jana_rescue'},
        ]
      },
      // stage 4 – po záchraně
      {
        text:'"Díky, Fando. Vážně." *podívá se na tebe jinak než dřív* "Tady je moje číslo. A... kdybys potřeboval někdy pomoc s čímkoliv, řekni."',
        choices:[{label:'(Vzít číslo)', cls:'prim', fn:'q_jana_thanks'}]
      },
    ]
  },

  mates: {
    name:'Mates', role:'Kamarád / Chill guy', emoji:'😌',
    room:'hospoda', rx:.23, ry:.65, color:'#6b7280', size:1,
    dialogs:[
      {
        text:'"Nazdar Fanouši, nedáme jednoho rychlýho démona? Mám žízeň jak africký domorodec. "',
        choices:[
          {label:'🍺 Dát démona (100 Kč)', cls:'prim', fn:'q_mates_pivo'},
          {label:'Možná později',          fn:'close'},
        ]
      },
      {
        text:'"Díky Fando, rád jsem pokecal." *odfrknul si* "Nemám teď čím bych ti to oplatil... ale tady máš tenhle pytel." *postrčí po stole igelitový pytel* "Snad se ti bude na něco hodit."',
        choices:[{label:'Vzít pytel', cls:'prim', fn:'q_mates_take_pytel'}]
      },
      {
        text:'"Teď mě neruš, přemýšlím nad Kubátovou. Dlouho jsem jí ve škole neviděl, nevíš kde je?"',
        choices:[{label:'Netušim bro', fn:'close'}]
      }
    ]
  },

  johnny: {
    name:'Johnny', role:'Businessman', emoji:'🤵',
    room:'hospoda', rx:.55, ry:.35, color:'#0ea5e9', size:1,
    dialogs:[
      {
        text:'"Fando, pojď sem." *nakloní se* "Viděl jsem tamtu Janu Kosovou z Billy. Naprostý zjevení. Zařiď mi s ní rande – jen ať přijde dneska večer. Dám ti 300 Kč. Prostě to zařiď."',
        choices:[
          {label:'🤝 Domluvit rande s Janou', cls:'prim',  fn:'q_johnny_start'},
          {label:'To si vyřeš sám',            cls:'danger', fn:'close'},
        ]
      },
      {
        text:'"Tak co? Mluvil jsi s Janou? Sedím tu jak blbec a čekám."',
        choices:[
          {label:'Ještě ne',         cls:'danger', fn:'close'},
        ]
      },
      {
        text:'"BOMBA. Jsi naprostý bůh, Fanda. Tady tvých 300 Kč." *strčí ti bankovky a spěchá pryč*',
        choices:[{label:'💰 Vzít 300 Kč', cls:'prim', fn:'q_johnny_reward'}]
      },
      // stage 3 – rande probíhá, čeká na výsledek
      {
        text:'"Jo Fando, dobrý večer. Jana je tady." *leží pohodlně, vůbec se neohlíží na Janu* "Zařídil jsi to dobře. Můžeš jít."',
        choices:[
          {label:'(Odejít)', fn:'close'},
        ]
      },
      // stage 4 – po záchraně Jany, naštvaný
      {
        text:'"Ty vole, TY jsi ji odvlekl?!" *vstane* "To je celý tvůj problém, Hrubeši. Vždycky musíš hrát hrdinu. Nedostaneš ani korunu."',
        choices:[{label:'(Odejít)', fn:'close'}]
      },
    ]
  },

  kratom_saman: {
    name:'Kratom Šaman', role:'Mystický dealer', emoji:'🔮',
    room:'hospoda', rx:.80, ry:.62, color:'#10b981', size:1,
    dialogs:[
      {
        text:'"Nejsem zvědavej na nějakého malého parchanta! Táhni mi z očí! *čuchne si k Fandovi* "Hmm.. To voní jako.. kratom! Ty máš kratom? No tak to budeme kámoši! Bez kratomu nedám ani ránu, to mi věř. Chceš trochu bláta? Mám nejlepší ceny v Křemži! Teda kromě toho zmrda Milana. Otrávil jsem mu kočku, snad už dá pokoj. Chceš teda? Nebo znáš nějaké tajné heslo? Za správný slovo dám dáreček..."',
        choices:[
          {label:'🔮 Znám tajné heslo!',  cls:'special', fn:'q_saman_password'},
          {label:'💸 50g za 150 Kč',        fn:'q_saman_50g'},
          {label:'💸 200g za 600 Kč',       cls:'prim',    fn:'q_saman_200g'},
          {label:'Asi jindy bráško',                cls:'danger',  fn:'close'},
        ]
      },
      {
        text:'"Vidím, že znáš cestičky..." *přikývne* "Stále mám zásoby. A stále přijímám hesla."',
        choices:[
          {label:'🔮 Znám další heslo!', cls:'special', fn:'q_saman_password'},
          {label:'💸 50g za 150 Kč',  fn:'q_saman_50g'},
          {label:'💸 200g za 600 Kč', cls:'prim', fn:'q_saman_200g'},
          {label:'Asi jindy bráško',  cls:'danger',  fn:'close'},
        ]
      },
      {
        text:'"Zlatá aura, Fanda. Zlatá." *s úsměvem* "Máš ještě nějaké tajné slovo?"',
        choices:[
          {label:'🔮 Znám heslo!', cls:'special', fn:'q_saman_password'},
          {label:'💸 50g za 150 Kč', fn:'q_saman_50g'},
          {label:'(Odejít)',          cls:'danger', fn:'close'},
        ]
      }
    ]
  },

  bezdak: {
    name:'Bezďák', role:'Dealer / Záhadná minulost', emoji:'🧥',
    room:'ulice', rx:.28, ry:.58, color:'#4b5563', size:1,
    dialogs:[
      {
        text:'"NEPŘIBLIŽUJ SE KE MNĚ, TY ZASRANEJ RUSKEJ ŠPIONE! Moje siderické kyvadlo mě před tebou varovalo! Počkat - FRANTIŠEK HRUBEŠ?!?! Poslouchám tě na SoundCloudu, kámo! Nepřestávej, fakt je to dobrý. Ty jsi ten, co má vzít za Číhalovou ten balík, co? Dej mi buď šest stovek, nebo něco k jídlu. Nejedl jsem ani nepamatuju.',
        choices:[
          {label:'💸 Koupit piko za 600 Kč', cls:'prim',  fn:'q_bezdak_buy'},
          {label:'🍕 Vyměnit za 2 žemle',    fn:'q_bezdak_trade'},
          {label:'Ještě ne',                  cls:'danger', fn:'close'},
        ]
      },
      {
        text:'"Rád s tebou obchoduju, přijď zas někdy. A pozdravuj tu starou zdechlinu! Ta už to má taky za pár, chuděra.."',
        choices:[{label:'(Odejít)', fn:'close'}]
      },
      {
        text:'"Cibule..." *bezďák se zastaví a pomalu se otočí, sundá si kapuci* "Kde jsi to vzal?" *tichý hlas, jiný člověk* "Jmenuji se Petr Cibulka. Byl jsem odhalen." *vytáhne z hlubokých kapes malou krabičku* "Zkus tohle. Hned. Nebudeš litovat."',
        choices:[
          {label:'💊 Vzít prášek', cls:'danger', fn:'q_bezdak_pill', sub:'Nevíš co to je...'},
        ]
      },
      {
        text:'"*Cibulka se tiše usmívá a podá ti ruku* Věděl jsem, že jsi správný člověk, Hrubši. Křemže je teď v bezpečí... aspoň na chvíli." *pohlédne ke dveřím* "Musím zmizet. Příliš mnoho lidí ví, kde jsem. Byl to honor." *vytáhne si kapuci, otočí se a kráčí ke dveřím bez ohlédnutí*',
        choices:[
          {label:'(Nechat ho odejít)', cls:'prim', fn:'q_cibulka_farewell'},
        ]
      }
    ]
  },

  paja: {
    name:'Pája', role:'Kamarád ze školy', emoji:'🚗',
    room:'ulice', rx:.68, ry:.45, color:'#10b981', size:1,
    dialogs:[
      {
        text:'"To mám štěstí, že jdeš kolem, Fando! Potřebuju půjčit 300 Kč, došli mi spiny. Hnedka to zase vydělám, věř mi. Mám na to strategii. Vrátim ti to i úrokama."',
        choices:[
          {label:'💰 Půjčit 300 Kč', cls:'prim',  fn:'q_paja_loan'},
          {label:'Naser si, socko',      cls:'danger', fn:'close'},
        ]
      },
      {
        text:'"Ty magore! Co jsem ti říkal? Že to vytočim! Tady máš nazpátek i s úrokama, kup si za to něco hezkého na sebe."',
        choices:[{label:'💰 Vzít 500 Kč', cls:'prim', fn:'q_paja_collect'}]
      },
      // stage 2 – v hospodě, opilý po jackpotu
      {
        text:'"FANDAAA! *zvedne sklenici* Mám JACKPOT brácho! Pět tisíc! PĚĚT TISÍÍC!" *škytne* "Hele... nemůžu řídit, jsem na šrot. Klíčky od Fábie si vem zpátky. Ale... nemám je u sebe." *zamyslí se* "Půjčil jsem je tomu šamanovi v hospodě, on chtěl jet na nákup... ale samozřejmě nikam nejel." *škytne* "Dojdi za ním a řekni mu heslo: FÁBIE. Jinak ti to nedá. A DÁVEJ BACHA, je agresivní, když mu řekneš blbost!"',
        choices:[
          {label:'OK, dojdu za šamanem', cls:'prim', fn:'q_paja_fabie_info'},
          {label:'(Odejít)', fn:'close'},
        ]
      }
    ]
  },

  // ─── Pláteníková – zástupkyně ředitelky ──────────────────────────────────
  platenikova: {
    name:'Pláteníková', role:'Zástupkyně ředitelky', emoji:'👩‍💼',
    room:'ucebna', rx:.85, ry:.35, color:'#7c3aed', size:1.1,
    dialogs:[
      {
        text:'"Dobrý den, jsem tu na hospitaci. Budu pozorovat průběh dnešní hodiny." *usadí se dozadu a vytáhne notes*',
        choices:[
          {label:'📢 Říct jí o všem, co se tu děje', cls:'special', fn:'q_platenikova_tell'},
          {label:'(Ignorovat)', fn:'close'},
        ]
      },
      // stage 1 – po dramatické scéně (Číhalová mrtvá)
      {
        text:'"CO TO... CO SE TU STALO?!" *Pláteníková vidí, že Číhalová chybí, a Figurová vypadá podezřele*',
        choices:[
          {label:'📢 Říct jí pravdu', cls:'special', fn:'q_platenikova_dramatic'},
          {label:'(Nic neříkat)', fn:'close'},
        ]
      },
      // stage 2 – odměna dána
      {
        text:'"Hrubeši, jste statečný mladý muž. Tohle se cení." *zapisuje si poznámky*',
        choices:[{label:'(Odejít)', fn:'close'}]
      }
    ]
  },

  honza: {
    name:'Honza', role:'Kamarád ze školy', emoji:'🤪',
    room:'kremze', rx:.28, ry:.42, color:'#3b82f6', size:1,
    dialogs:[
      {
        text:'"Fanda, brácha." *nakloní se blíž, mluví potichu* "Ta Číhalová... bylo by velice nemilé, kdyby se jí něco stalo. VELICE nemilé." *odmlčí se a zapije pivem* "Ale kdybys se o to někdo postaral... já bych byl nesmírně vděčnej. Chapeš co myslim?"',
        choices:[{label:'(Odejít)', fn:'close'}]
      }
    ]
  },

  mikulas: {
    name:'Mikuláš', role:'Kamarád / Kratom nadšenec', emoji:'🌿',
    room:'kremze', rx:.62, ry:.32, color:'#7c3aed', size:1,
    dialogs:[
      {
        text:'"Nazdar Fanouši, nechceš trochu kratomu? Koupil jsem to od Milana – bude ho to mrzet, takovej šunt mi prodal."',
        choices:[
          {label:'💸 10g za 30 Kč',                  fn:'q_mik_10g'},
          {label:'🌿 Speciální blend (10g)',           cls:'special', fn:'q_mik_blend', sub:'30–50 Kč · Intenzivní trip'},
          {label:'Nechci',                             cls:'danger',  fn:'close'},
        ]
      },
      {
        text:'"Nezdá se ti, kámo. Co potřebuješ?"',
        choices:[
          {label:'💸 10g za 30 Kč',                  fn:'q_mik_10g'},
          {label:'🌿 Speciální blend (10g)',           cls:'special', fn:'q_mik_blend', sub:'30–50 Kč · Intenzivní trip'},
          {label:'Nechci',                             cls:'danger',  fn:'close'},
        ]
      },
      {
        // stage 2 – popírá, klidný
        text:'"Jo, Fanouši?" *ani se neohlédne* "Jaký papír? Nevím o čem mluvíš. Asi jsi viděl špatně."',
        choices:[
          {label:'🔍 "Bude ho to mrzet." Tohle říká jen jeden člověk.', cls:'special', fn:'q_mik_press'},
        ]
      },
      {
        // stage 3 – přizná se, arogantní
        text:'"*pomalu se otočí* Hm. Fajn. Jo, napsal jsem to." *pokrčí rameny* "A co? Ona mě chce nechat propadnout – já jí chci pokazit náladu. Přijde mi to fair."',
        choices:[
          {label:'😳 "Jdeš se jí omluvit. Teď."',       cls:'prim',    fn:'q_mik_apologize'},
          {label:'🤫 "Co víš o Kubátové?"',               cls:'special', fn:'q_mik_secret'},
          {label:'👊 "Špatná odpověď, Mikuláši."',        cls:'danger',  fn:'q_mik_beat', sub:'Fanda řeší věci rukama'},
        ]
      },
      {
        // stage 4 – reveal 1: blend do kafe
        text:'"Kubátová..." *otočí se k tobě a přimhouří oči* "Dobře. Řeknu ti to – je to lepší příběh než ten papír." *opře se o zeď* "Nasypal jsem jí do kafe speciální blend. Takový... silnější verze. Před dvěma týdny."',
        choices:[{label:'(Naslouchat)', fn:'q_mik_reveal_next'}]
      },
      {
        // stage 5 – reveal 2: pentagram
        text:'"Pak jsem jí odnesl do sklepa. Mýho sklepa. Připravil jsem pentagram – Honza mi přinesl knížky, on o tom něco ví. Záměr byl jednoduchý: skrze Kubátovou zaklít Číhalovou. Ta má prý démonické predispozice."',
        choices:[{label:'(Naslouchat)', fn:'q_mik_reveal_next'}]
      },
      {
        // stage 6 – reveal 3: démon posedl Kubátovou
        text:'"Jenže jsem to trochu přepálil." *pauza* "Démon přišel. Ale nesedl si na Číhalovou." *krátce mrkne* "Posedl Kubátovou. Přímo tam v pentagramu. Bylo to..." *hledá slova* "...nečekané."',
        choices:[{label:'(Naslouchat)', fn:'q_mik_reveal_next'}]
      },
      {
        // stage 7 – reveal 4: pořád tam je + kde to najít
        text:'"Je tam dodnes. Pentagram jí drží – funguje to vlastně docela stabilně." *pokrčí rameny* "Teď tam dělám experimenty. Vědecké." *zadívá se na tebe* "Vchod je v Bille. Za regálem s mlékem. Zmáčkni E – regál se posune. Pak schody dolů. Přehlédnout se to nedá."',
        choices:[{label:'(Dobře. Krejčí je vyřešená.)', cls:'prim', fn:'q_mik_secret_done'}]
      }
    ]
  },

  milan: {
    name:'Milan', role:'Kamarád / Podnikavý typ', emoji:'😎',
    room:'kremze', rx:.78, ry:.58, color:'#06b6d4', size:1,
    dialogs:[
      {
        text:'"Čus Fando, co potřebuješ? Teď mě prosím neruš. Umřel mi můj pes." *začne brečet* "Přitom tak náhle! Nic nenaznačovalo, že by byl nemocnej."',
        choices:[
          {label:'To je mi líto, Milane.', cls:'danger', fn:'close'},
        ]
      },
      {
        text:'"Čau Fando. Co je?"',
        choices:[
          {label:'(Odejít)', cls:'danger', fn:'close'},
        ]
      },
      {
        // stage 2 – 1. varování, odmítá
        text:'"Kubátová?" *zastaví se, přestane počítat peníze* "Ty to myslíš vážně? Fando, ona je prostě bláznivá ředitelka. Já nikam nejdu."',
        choices:[
          {label:'🗣️ "Byl jsem tam. Pentagram. Démon. Dávám ti vědět."', cls:'special', fn:'q_milan_warn_again'},
          {label:'(Nechat to být)', cls:'danger', fn:'close'},
        ]
      },
      {
        // stage 3 – 2. varování, zaváhá
        text:'"Znovu s tím..." *zastaví se, trochu přestane roztřídit sáčky* "Sklepě... jo, byl jsem tam jednou s Mikulášem. Ale tohle je přehnaný, ne? Kubátová je prostě... divná. Víc ne."',
        choices:[
          {label:'🗣️ "Milan, naposledy. Seber se."', cls:'special', fn:'q_milan_warn_again'},
          {label:'(Nechat to být)', cls:'danger', fn:'close'},
        ]
      },
      {
        // stage 4 – 3. varování, konečná volba
        text:'"Třikrát..." *dlouhé ticho, odloží váček* "Proč by sis vymýšlel? Co z toho máš?" *dívá se na tebe jinak, poprvé skutečně zaváhá* "Možná bych mohl... jet domů do Plané na chvíli."',
        choices:[
          {label:'🙏 "Jdi. Prosím. Teď."',                    cls:'prim',   fn:'q_milan_finally_leave'},
          {label:'😤 "Jdi si kam chceš, je mi u prdele."',    cls:'danger', fn:'q_milan_go_kub'},
        ]
      },
      {
        // stage 5 – pryč (neměl by být viditelný, Milan je odstraněn z NPCs)
        text:'"..."',
        choices:[{label:'(Odejít)', fn:'close'}]
      },
      {
        // stage 6 – čeká na Matese v hospodě
        text:'"Čau Fando." *sedí u stolu s pivem, taška sbalená u nohy* "Čekám na Matese. Říkal, že přijede do hodiny." *rozhlédne se* "Dobrý, že si dal vědět."',
        choices:[
          {label:'(Pokývnout)', cls:'danger', fn:'close'},
        ]
      },
    ]
  },

  johnny_vila: {
    name:'Johnny', role:'Hostitel / Přesvědčen o opaku', emoji:'🤵',
    room:'johnny_vila', rx:.65, ry:.55, color:'#c0a030', size:1,
    dialogs:[
      {
        // stage 0 – neústupný, vše je prý skvělé
        text:'"Fando! Rád tě vidím." *leží na pohovce, drink v ruce* "Je to tady super. Oba si to užíváme. Jana je prostě trochu nesmělá, víš jak to je." *mávne rukou*',
        choices:[
          {label:'😐 "Janě se to prý nelíbí."', cls:'special', fn:'q_johnny_deny'},
          {label:'(Odejít)', cls:'danger', fn:'close'},
        ]
      },
      {
        // stage 1 – spoutaný
        text:'"CO DĚLÁŠ?! PUSŤ MĚ! JÁ TĚ... JÁ TĚ ZNIČÍM!" *řve, škube sebou, ale želízka drží*',
        choices:[{label:'(Ignorovat ho)', fn:'close'}]
      },
      {
        // stage 2 – po zdrogování Jany, dává odměny
        text:'"Tys to zvládnul, Fando." *poklepe ti na rameno* "Tady máš – membership kartičku od Vaza Systems. Ultimátní členství. Neomezený počet webů, design, cokoliv budeš chtít." *hodí ti klíčky* "A tady máš klíče od baráku. Klidně se stav, kdykoli."',
        choices:[{label:'💳 Vzít kartičku a klíče', cls:'prim', fn:'q_johnny_villa_rewards'}]
      },
      {
        // stage 3 – návrat, Johnny s Janou na gauči
        text:'"Fando..." *sedí na gauči vedle Jany, ruka kolem ní* "Hele, teď není nejlepší čas. Mám tu něco rozpracovanýho, víš jak to myslím." *mrkne* "Běž. Vrať se jindy."',
        choices:[
          {label:'(Odejít)', cls:'prim', fn:'q_johnny_return_leave'},
          {label:'🤔 (Zůstat)', cls:'danger', fn:'close'},
        ]
      },
    ]
  },

  jana_vila: {
    name:'Jana Kosová', role:'Nešťastná', emoji:'💅',
    room:'johnny_vila', rx:.35, ry:.55, color:'#be185d', size:1,
    dialogs:[
      {
        // stage 0 – stěžuje si na Johnnyho
        text:'"Fando..." *šeptá* "Ten chlap je úplně slizkej. Je na mě hrozně hrr na věc a já prostě nechci. Pomoz mi, prosím."',
        choices:[
          {label:'🚿 "Jak ti mám pomoct?"', cls:'special', fn:'q_jana_help_hint'},
          {label:'(Nechat ji tady)', cls:'danger', fn:'close'},
        ]
      },
      {
        // stage 1 – Johnny spoutaný, Jana vděčná
        text:'"Díky, Fando." *vydechne s úlevou* "Pojďme odtud, prosím. Hned."',
        choices:[{label:'Odejít z vily', cls:'prim', fn:'q_villa_leave'}]
      },
      {
        // stage 2 – při návratu, zdrogovaná, na gauči s Johnnym
        text:'"Hmm... Fando..." *oči přivřené, mluví pomalu* "...asi budu blinkat..."',
        choices:[{label:'(Nechat ji)', fn:'close'}]
      },
    ]
  },

  kubatova: {
    name:'Kubátová', role:'Ředitelka školy / Hostitel démona', emoji:'👁️',
    room:'sklep', rx:.50, ry:.72, color:'#dc2626', size:1.2,
    dialogs:[
      {
        // stage 0 – první setkání
        text:'"*obrátí k tobě prázdné oči* Františku Hrubeš. Přišel jsi." *démon promlouvá skrze ni klidně* "MRÁZ MUSÍ ZEMŘÍT. Víš, o kom mluvím?"',
        choices:[
          {label:'🩸 "Co se stalo s Mrázem?"', cls:'special', fn:'q_kub_mraz_start'},
          {label:'(Odejít)',                   cls:'danger',  fn:'close'},
        ]
      },
      {
        // stage 1 – lore 1: kratom na pentagram
        text:'"Milan Mráz..." *plameny na pentagramu prasknou* "Před třemi měsíci. Přinesl zásoby do sklepa. Chlap nevidí kam šlape." *hlas se zvýší* "Vylil kratom. PŘÍMO PŘES STŘED PENTAGRAMU. Kratom démona oslabuje – to každý ví. Každý, kdo není IDIOT."',
        choices:[{label:'(Naslouchat)', fn:'q_kub_explain_next'}]
      },
      {
        // stage 2 – lore 2: musí zemřít
        text:'"Cítil jsem jak spojení slábne..." *Kubátová se na vteřinu prolomí – její vlastní hlas* "...prosím..." *démon ji přehlušní* "MUSÍ ZEMŘÍT. Před zimou. Nebo zůstanu uvězněn navždy. A ona taky." *šeptá* "A to by bylo škoda."',
        choices:[{label:'(Naslouchat)', fn:'q_kub_explain_next'}]
      },
      {
        // stage 3 – dá voodoo + nůž
        text:'"*ze vzduchu materialisuje voodoo panenku a rezavý nůž* Vezmi. Najdi Milana Mráze v Křemži. V inventáři klikni na nůž – on vykrvácí na místě, nikdo nic nevidí." *nakloní hlavu o 90 stupňů* "Nebo ho varuj, ať zmizí. Ale pokud přijde za mnou sám..." *démonický úsměv* "...taky to zařídím. Lépe."',
        choices:[{label:'🪆 Vzít panenku a nůž', cls:'prim', fn:'q_kub_give_items'}]
      },
      {
        // stage 4 – čeká (kubatova_quest=1) / odměna vybrána
        text:'"Mráz ještě chodí po Křemži. Cítím ho." *oči zčervenají* "Použi panenku. Nebo ho přemluv, ať zmizí. Nebo ho pošli ke mně. Ať si vybere."',
        choices:[{label:'(Odejít)', fn:'close'}]
      },
      {
        // stage 5 – mraz_done (voodoo/fled), odměna
        text:'"Splněno." *démon promlouvá klidně, skoro důstojně* "Mráz je pryč. Moc se vrací." *mírně nakloní hlavu přes Kubátovou* "Děkuji ti, Hrubši. Dluh je splacen."',
        choices:[{label:'(Přijmout poděkování)', cls:'prim', fn:'q_kub_mraz_reward'}]
      },
      {
        // stage 6 – milan_dead_sklep: Kubátová stojí nad tělem
        text:'"*stojí zády k tobě nad rozřezaným tělem* Přišel sám. Tvrdil, že tě nepotřebuje." *pomalu se otočí, krev na tváři* "Byl statečný člověk. Škoda, že byl hloupý." *v oku rudě hoří* "Děkuji, Hrubši."',
        choices:[{label:'(Přijmout poděkování)', cls:'prim', fn:'q_kub_mraz_reward'}]
      },
      {
        // stage 7 – milan_fled: Kubátová nespokojená, nepřišel
        text:'"*obrátí k tobě oči, prázdné a chladné* Cítím ho. Ještě žije." *hlas ztvrdne* "Varoval jsi ho. Uprchl." *plameny na pentagramu pohasnou o trochu* "To nebylo to, co jsem chtěla, Hrubši." *ticho* "Ale... přesto odešel. Démon je... částečně spokojen." *oči zůstanou studené*',
        choices:[{label:'(Přijmout výtku)', cls:'danger', fn:'q_kub_mraz_reward'}]
      },
    ]
  },

  kratom_buh: {
    name:'Kratom Bůh', role:'Pán Zelené Věčnosti', emoji:'🌿',
    room:'heaven_gate', rx:0.50, ry:0.30, color:'#d4a830', size:1,
    dialogs:[
      { text:'"Aha. Fanda Hrubeš. Čekal jsem tě... ale ne tak brzy."',
        choices:[{label:'(Naslouchat)', fn:'q_god_next'}] },
      { text:'"Prášek od Cibulky, že? Ten chlap vždycky přimíchá trochu navíc. Říkal jsem mu to. Neposlouchal."',
        choices:[{label:'(Naslouchat)', fn:'q_god_next'}] },
      { text:'"Každý, kdo vzal dost zeleného, mě vidí aspoň na chvíli.\nTy ses předávkoval – takže tě tady mám trochu déle."',
        choices:[{label:'(Naslouchat)', fn:'q_god_next'}] },
      { text:'"*listuje velkou zlatou knihou* Hmm... máš u sebe kratom?" *hledá* "...Ne. Nic. Prázdné kapsy.\nTo je problém, Fanouši."',
        choices:[{label:'(Naslouchat)', fn:'q_god_next'}] },
      { text:'"Bez kratomu tě nemůžu nechat tady nahoře. Pravidla jsou pravidla." *ukloní se* "Sbohem, Fanouši."',
        choices:[{label:'Sbohem...', cls:'danger', fn:'q_god_death'}] },
    ]
  },

};

// ─── Místnosti ───────────────────────────────────────────────────────────────

const ROOMS = {
  ucebna:  { name:'Učebna 12',       icon:'✏️', sub:'Obchodní akademie',    bg:'#06100e', npcs:['cihalova','krejci','figurova','platenikova'], spawns:{} },
  billa:   { name:'Billa',           icon:'🛒', sub:'Mariánské náměstí',    bg:'#0a0e1a', npcs:['jana_kosova','lenka'],          spawns:{} },
  hospoda: { name:'Hospoda',         icon:'🍺', sub:'Big Poppa',            bg:'#1a0800', npcs:['mates','johnny','kratom_saman'],  spawns:{},
             fireplace:{rx:.50, ry:.18} },
  ulice:   { name:'Ulice',           icon:'🌆', sub:'Pravá Křemže',         bg:'#050508', npcs:['bezdak','paja'],                 spawns:{} },
  kremze:  { name:'Křemže – náměstí',icon:'🏠', sub:'Domov',               bg:'#060b18', npcs:['honza','mikulas','milan'],        spawns:{},
             fabie:{rx:.88, ry:.75} },
  doma:    { name:'Doma',            icon:'🏡', sub:'Tvůj byt',            bg:'#0a0a12', npcs:[],                                spawns:{} },
  sklep:   { name:'Mikulášův sklep', icon:'🕯️', sub:'Pentagram. Červená. Ticho.',             bg:'#020202', npcs:['kubatova'],                    spawns:{} },
  johnny_vila: { name:'Johnnyho vila', icon:'🏠', sub:'Soukromý. Příliš soukromý.', bg:'#0d0a14', npcs:['johnny_vila','jana_vila'], spawns:{} },
  koupelna:    { name:'Koupelna',      icon:'🚿', sub:'Johnnyho koupelna',        bg:'#0e0d12', npcs:[], spawns:{} },
  heaven:      { name:'Nebeské schody', icon:'✨',  sub:'Věčnost',               bg:'#fffef8', npcs:[],              spawns:{} },
  heaven_gate: { name:'Boží brána',     icon:'🌟',  sub:'Vstup do věčnosti',    bg:'#fffef0', npcs:['kratom_buh'],  spawns:{} },
};

const RORDER = ['ucebna','billa','hospoda','ulice','kremze'];

// ─── Sběratelské kartičky – ODSTRANĚNY, princip zachován přes artefakty ─────
const CARDS = [];

// ─── Popisky inventáře (tooltipy) ────────────────────────────────────────────

const ITEM_DESCS = {
  kratom:       'Zelená substance z Bornea. 10g = jedna dávka, 13s trip. Pozor na předávkování (30g/100s)!',
  blend:        'Speciální mix od Mikuláše. Intenzivnější než běžný kratom.',
  zemle:        'Pizza žemle z Billy. Obnoví 30% energie. Základ přežití v Křemži.',
  piko:         'Pervitin pro Číhalovou. Snad nebudeš hloupý a nevezmeš si ho sám.',
  pivo:         'Démon – energetický nápoj. Mates ho miluje.',
  fake_kratom:  'Fejkový kratom. Pozor komu ho dáš – mohl by to poznat.',
  cibule:       'Cibule od Honzy. Bezďák za Billou ji prý potřebuje.',
  kratom_kava:  'Kratom zamíchaný do kafe. Speciální příprava.',
  cert:         'Certifikát. Úřední papír.',
  pytel:        'Igelitový pytel od Matese. Na co ho asi použiješ?',
  voodoo:       'Voodoo panenka od Kubátové. Použij s nožem na Milana.',
  nuz:          'Rezavý nůž od Kubátové. Klikni pro použití v Křemži.',
  screenshot:   'Screenshot kompromitující zprávy. Důkaz.',
  hlasovka:     'Nahrávka hlasovky Figurové. Přehrát = slyšet pravdu.',
  foto_kubatova:'Fotografie Milana a Kubátové. Kompromitující materiál.',
  c2_cert:      'Zfalšovaný certifikát C2 z angličtiny. Mistrovské dílo.',
  fig_nuz:      'Nůž od Figurové. Pro temné účely.',
  fig_gun:      'Revolver od Figurové. Ukryla ti ho do kapsy.',
  milan_phone:  'Milanův telefon. Plný důkazů.',
  zelizka:      'Želízka z Johnnyho koupelny. Poutací prostředek.',
  prasek:       'Podezřelý bílý prášek z Johnnyho šuplíku.',
  klice_vila:   'Klíče od Johnnyho vily. Teď se tam dostaneš kdykoliv.',
  podprsenka:   'Janina podprsenka. Vzácný artefakt.',
  klice_fabie:  'Fandovy klíčky od staré Fábie. Tyhle nastartují. Jeď domů!',
  klice_fabie_fig: 'Klíčky od Figurové. Slibovala novou Fábii – ale v zámku se otáčí naprázdno. Něco na tom nesedí.',
  saman_hlava:  'Šamanova hlava. Celá od krve. Proč ji máš?!',
  membership_vaza: 'Vaza Systems membership kartička. Ultimátní členství – neomezený počet webů.',
  propiska:     'Speciální propiska z Temu. Stisk = elektrický šok. Původně koupená Honzou a Mikulášem na Fandu.',
  foto_figurova:'Fotografie Figurové. Pochroumané tělo v Mikulášově sklepě. Trochu morbidní, ale co naplat.',
};

// ─── Definice úkolů ──────────────────────────────────────────────────────────

const OBJ_DEFS = [
  {id:'main_money',        tag:'Hlavní',    text:'Vydělej 2 000 Kč',                      alwaysShow:true},
  {id:'main_rep',          tag:'CÍLE',      text:'Nastartuj Fábii a jeď domů',            alwaysShow:true},
  {id:'main_cihalova',     tag:'Hlavní',    text:'Zásilka pro Číhalovou'},
  {id:'side_krejci',       tag:'Vedlejší',  text:'Zjisti, kdo vydírá Krejčí'},
  {id:'side_figurova',     tag:'Šedá zóna', text:'Špehovat Milana pro Figurovou'},
  {id:'side_jana',         tag:'Vedlejší',  text:'Dones Janě 20g kratomu'},
  {id:'side_johnny',        tag:'Byznys',    text:'Domluvit Johnnymu rande s Janou'},
  {id:'side_paja',          tag:'Vedlejší',  text:'Založit Páju na Betanu'},
  {id:'side_honza_ukol',    tag:'Vedlejší',  text:'Zařídit Honzovi komot z češtiny'},
  {id:'quest_cihalova_burn',tag:'Tajné',     text:'Zbav se Číhalové v krbu'},
  {id:'quest_honza_cibule', tag:'Tajné',     text:'Vyzvednout odměnu od Honzy'},
  {id:'side_bezdak_cibule', tag:'Záhadné',   text:'Co chce bezďák s tou cibulí?'},
  {id:'quest_kgb',          tag:'Minihra',   text:'Postřílet ruské agenty KGB a GRU'},
  {id:'quest_milan_protiutok',   tag:'Tajné',     text:'Sabotovat Figurovou pro Milana'},
  {id:'quest_figurova_vyres',    tag:'Tajné',     text:'Vyřeš situaci s Figurovou'},
  {id:'quest_mraz',              tag:'Démonické', text:'Vyřiď Mrázův osud pro Kubátovou'},
  {id:'quest_figurova_mates',    tag:'Temné',     text:'Zlikviduj Matese pro Figurovou'},
  {id:'quest_figurova_milan',    tag:'Temné',     text:'Zlikviduj Milana pro Figurovou'},
  {id:'quest_fabie',             tag:'Hlavní',    text:'Získej klíče od Fábie a jeď domů'},
  {id:'quest_platenikova',       tag:'Speciální', text:'Řekni Pláteníkové o celé akci'},
];
