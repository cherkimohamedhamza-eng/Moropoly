// Every piece of text in the game, in English, French and Arabic.
import {S} from './core';

/* ---------- log lines ---------- */
S('log.start','Bismillah. {n} players set off from Al Inṭilāq with {a} each.','Bismillah. {n} joueurs partent d’Al Inṭilāq avec {a} chacun.','بسم الله. ينطلق {n} لاعبين من الانطلاق، ومع كل واحد {a}.');
S('log.collect','{p} collects {a}.','{p} reçoit {a}.','{p} يحصل على {a}.');
S('log.payShort','{p} owes {a} to {to} for {why} but only has {b}, so only {b} is paid for now.','{p} doit {a} à {to} pour {why} mais n’a que {b} : seuls {b} sont payés pour l’instant.','{p} مدين بـ{a} إلى {to} مقابل {why} لكنه لا يملك سوى {b}، فيُدفع {b} فقط الآن.');
S('log.debtPaid','{p} pays {a} more to {to} toward the debt.','{p} verse encore {a} à {to} pour sa dette.','{p} يدفع {a} إضافية إلى {to} من دينه.');
S('log.liquidated','{p}’s buildings are sold and properties mortgaged to pay the debt.','Les bâtiments de {p} sont vendus et ses propriétés hypothéquées pour payer la dette.','تُباع مباني {p} وتُرهن ممتلكاته لتسديد الدين.');
S('log.saved','{p} manages to pay everything and stays in the game.','{p} parvient à tout payer et reste dans la partie.','{p} يتمكن من دفع كل شيء ويبقى في اللعبة.');
S('log.timeUp','Time’s up for {p}. The game plays for them.','Temps écoulé pour {p}. Le jeu joue à sa place.','انتهى الوقت لـ{p}. اللعبة تلعب مكانه.');
S('opt.timer','Turn timer','Minuteur de tour','مؤقت الدور'); S('opt.timerD','When time runs out, the game moves for the player: roll, skip buying, end the turn, or leave the auction.','Quand le temps est écoulé, le jeu joue à la place du joueur : lancer, ne pas acheter, finir le tour ou quitter l’enchère.','عند انتهاء الوقت تلعب اللعبة مكان اللاعب: رمي النرد، عدم الشراء، إنهاء الدور أو مغادرة المزاد.');
S('opt.off','Off','Désactivé','متوقف'); S('opt.sec','{n} seconds','{n} secondes','{n} ثانية'); S('opt.min','{n} minutes','{n} minutes','{n} دقائق');
S('log.pay','{p} pays {a} to {to} for {why}.','{p} paie {a} à {to} pour {why}.','{p} يدفع {a} إلى {to} مقابل {why}.');
S('w.bank','the bank','la banque','البنك'); S('w.daret','the Daret','la Daret','الدارت');
S('why.rent','rent at {s}','le loyer de {s}','كراء {s}');
S('why.incomeTax','income tax','l’impôt sur le revenu','الضريبة على الدخل');
S('why.wedding','wedding season','la saison des mariages','موسم الأعراس');
S('why.fuel','fuel prices','les prix du carburant','أسعار المحروقات'); S('why.parking','parking at Morocco Mall','le parking du Morocco Mall','موقف موروكو مول'); S('why.fiber','the fibre repair','la réparation de la fibre','إصلاح الألياف'); S('why.mqaddem','the mqaddem’s coffee','le café du moqaddem','قهوة المقدّم');
S('why.speeding','a speeding fine','un excès de vitesse','مخالفة السرعة');
S('why.eid','the Eid sheep','le mouton de l’Aïd','حولي العيد');
S('why.henna','henna night','la soirée du henné','ليلة الحناء');
S('why.birthday','a birthday gift','un cadeau d’anniversaire','هدية عيد الميلاد');
S('why.hammam','the hammam','le hammam','الحمّام');
S('why.doctor','doctor’s fees','les frais de médecin','مصاريف الطبيب');
S('why.ftour','ftour','le ftour','الفطور');
S('why.couscous','Friday couscous','le couscous du vendredi','كسكس الجمعة');
S('why.assoc','association dues','la cotisation de l’association','واجب الجمعية');
S('why.jail','release from 3okacha','sortir de 3okacha','الخروج من عكاشة');
S('why.repairs','{d} dar and {r} riad repairs','les réparations ({d} dar, {r} riad)','إصلاح {d} دار و{r} رياض');
S('log.passGo','{p} passes Al Inṭilāq and collects {a}.','{p} passe par Al Inṭilāq et reçoit {a}.','{p} يمرّ بالانطلاق ويحصل على {a}.');
S('log.toJail','{p} is sent to 3okacha.','{p} est envoyé à 3okacha.','{p} يُرسَل إلى عكاشة.');
S('log.forSale','{p} lands on {s}. It is for sale at {a}.','{p} arrive sur {s}, à vendre pour {a}.','{p} يصل إلى {s}. معروض للبيع بـ {a}.');
S('log.home','{p} is home at {s}.','{p} est chez lui à {s}.','{p} في ملكه: {s}.');
S('log.mortNoRent','{s} is mortgaged, so {o} collects no rent.','{s} est hypothéqué : {o} ne touche pas de loyer.','{s} مرهون، فلا يقبض {o} أي كراء.');
S('log.daret','{p} sits down at the Qahwa and takes the Daret: {a}.','{p} s’assoit à la Qahwa et rafle la Daret : {a}.','{p} يجلس في القهوة ويأخذ الدارت: {a}.');
S('log.tea','{p} takes a mint tea break at the Qahwa.','{p} prend un thé à la menthe à la Qahwa.','{p} يستريح مع كأس أتاي في القهوة.');
S('log.landGo','{p} lands on Al Inṭilāq.','{p} s’arrête sur Al Inṭilāq.','{p} يتوقف عند الانطلاق.');
S('log.visit','{p} is just visiting 3okacha.','{p} est en simple visite à 3okacha.','{p} في زيارة فقط لعكاشة.');
S('log.draw','{p} draws {deckN}: {card}','{p} tire {deckN} : {card}','{p} يسحب {deckN}: {card}');
S('deck.mektoub','Mektoub','Mektoub','مكتوب'); S('deck.baraka','Baraka','Baraka','بركة');
S('log.noBuild','{p} owns no buildings and pays nothing.','{p} n’a aucun bâtiment et ne paie rien.','{p} لا يملك أي بناء ولا يدفع شيئًا.');
S('log.bankTo','{p} is bankrupt. {o} gets only what {p} could pay, plus {p}’s mortgaged properties.','{p} fait faillite. {o} ne reçoit que ce que {p} pouvait payer, plus ses propriétés hypothéquées.','{p} أفلس. يحصل {o} فقط على ما استطاع {p} دفعه، إضافة إلى ممتلكاته المرهونة.');
S('log.bankBank','{p} is bankrupt. Their properties return to the bank.','{p} fait faillite. Ses propriétés reviennent à la banque.','{p} أفلس. ممتلكاته تعود إلى البنك.');
S('log.win','{p} wins Moropoly with a net worth of {a}. Mabrouk!','{p} remporte Moropoly avec une fortune de {a}. Mabrouk !','{p} يفوز بموروبولي بثروة قدرها {a}. مبروك!');
S('log.turn','{p}’s turn.','Au tour de {p}.','دور {p}.');
S('log.jailDouble','{p} rolls a double and walks out of 3okacha.','{p} fait un double et sort de 3okacha.','{p} يرمي دوبل ويخرج من عكاشة.');
S('log.jailStay','{p} rolls {d1} and {d2} and stays in 3okacha ({n} of 3).','{p} fait {d1} et {d2} et reste à 3okacha ({n} sur 3).','{p} يرمي {d1} و{d2} ويبقى في عكاشة ({n} من 3).');
S('log.threeDoubles','{p} rolls three doubles in a row.','{p} fait trois doubles d’affilée.','{p} يرمي ثلاث دوبلات متتالية.');
S('log.rolls','{p} rolls {d1} and {d2}.','{p} fait {d1} et {d2}.','{p} يرمي {d1} و{d2}.');
S('log.buys','{p} buys {s} for {a}.','{p} achète {s} pour {a}.','{p} يشتري {s} بـ {a}.');
S('log.dlalaOpen','The dlal opens the auction for {s}.','Le dlal ouvre les enchères pour {s}.','الدلّال يفتح المزاد على {s}.');
S('log.passOn','{p} passes on {s}.','{p} laisse passer {s}.','{p} يتخلى عن {s}.');
S('log.bids','{p} bids {a} for {s}.','{p} enchérit {a} pour {s}.','{p} يزايد بـ {a} على {s}.');
S('log.leaveAuc','{p} leaves the auction.','{p} quitte les enchères.','{p} ينسحب من المزاد.');
S('log.sold','Sold! {p} takes {s} at the Dlala for {a}.','Adjugé ! {p} remporte {s} à la Dlala pour {a}.','بيع! {p} يأخذ {s} في الدلالة بـ {a}.');
S('log.noBids','Nobody bids. {s} stays with the bank.','Personne n’enchérit. {s} reste à la banque.','لا أحد زايد. {s} يبقى عند البنك.');
S('log.useCard','{p} uses a get-out card and leaves 3okacha.','{p} utilise sa carte et sort de 3okacha.','{p} يستعمل بطاقة الخروج ويغادر عكاشة.');
S('log.buildDar','{p} builds a dar on {s}.','{p} construit une dar sur {s}.','{p} يبني دارًا في {s}.');
S('log.buildRiad','{p} builds a riad on {s}.','{p} construit un riad sur {s}.','{p} يبني رياضًا في {s}.');
S('log.sellB','{p} sells a building on {s} for {a}.','{p} vend un bâtiment sur {s} pour {a}.','{p} يبيع بناءً في {s} بـ {a}.');
S('log.mort','{p} mortgages {s} (rahn) for {a}.','{p} hypothèque {s} (rahn) pour {a}.','{p} يرهن {s} مقابل {a}.');
S('log.unmort','{p} lifts the mortgage on {s}.','{p} lève l’hypothèque sur {s}.','{p} يفكّ رهن {s}.');
S('log.botBuild',p=>`${p.p} builds ${p.n} ${p.n==1?'building':'buildings'}.`,p=>`${p.p} construit ${p.n} bâtiment${p.n>1?'s':''}.`,p=>`${p.p} يبني ${p.n} ${p.n==1?'بناية':'بنايات'}.`);
S('log.offer','{p} offers {o} a trade.','{p} propose un échange à {o}.','{p} يعرض على {o} تبادلًا.');
S('log.deal','Tbadel! {p} and {o} shake hands on a trade.','Tbadel ! {p} et {o} topent pour un échange.','تبادل! {p} و{o} يتصافحان على الصفقة.');
S('log.tradeVoid','The trade no longer adds up and is cancelled.','L’échange n’est plus possible : il est annulé.','لم تعد الصفقة ممكنة فأُلغيت.');
S('log.refuse','{p} refuses the trade.','{p} refuse l’échange.','{p} يرفض التبادل.');
S('log.withdraw','{p} withdraws the offer.','{p} retire son offre.','{p} يسحب عرضه.');
S('log.tableSet','The table is set. Waiting for players.','La table est prête. En attente des joueurs.','الطاولة جاهزة. في انتظار اللاعبين.');
S('log.joins','{p} joins the table.','{p} rejoint la table.','{p} ينضم إلى الطاولة.');
S('log.back','{p} is back at the table.','{p} est de retour à la table.','{p} عاد إلى الطاولة.');
S('log.botPlays','The computer plays for {p} for now.','L’ordinateur joue pour {p} pour l’instant.','الحاسوب يلعب مكان {p} مؤقتًا.');

/* ---------- board ---------- */
S('b.goLat','AL INṬILĀQ','AL INṬILĀQ',''); S('b.goTiny','Collect 2,000 DH','Recevez 2 000 DH','احصل على 2,000 درهم');
S('b.jailLat','3OKACHA','3OKACHA',''); S('b.jailTiny','Ziyara · just visiting','Ziyara · simple visite','زيارة فقط');
S('b.parkLat','QAHWA','QAHWA',''); S('b.parkTiny','Daret pot','Cagnotte Daret','صندوق الدارت');
S('b.gojailLat','GO TO 3OKACHA','ALLEZ À 3OKACHA',''); S('b.gojailTiny','No salary','Pas de salaire','بدون راتب');
S('b.mektoub','Mektoub','Mektoub',''); S('b.baraka','Baraka','Baraka','');
S('b.pay','Pay {n}','Payez {n}','ادفع {n}');
S('ev.double',' Double!',' Double !',' دوبل!');
S('ev.draws','{p} draws {deckN}','{p} tire {deckN}','{p} يسحب {deckN}');
S('ev.dlala','The dlal opens the auction','Le dlal ouvre les enchères','الدلّال يفتح المزاد');
S('fl.sold','SOLD','VENDU','مُباع'); S('fl.daret','DARET','DARET','الدارت'); S('fl.deal','TBADEL · TRADE','TBADEL · ÉCHANGE','تبادل'); S('fl.bankrupt','BANKRUPT','FAILLITE','إفلاس');
S('fl.jail','3okacha!','3okacha !','عكاشة!');
S('fate.mektoub','Mektoub · fate','Mektoub · le destin','مكتوب · القدر'); S('fate.baraka','Baraka · blessing','Baraka · la bénédiction','بركة · الخير');

/* ---------- turn card ---------- */
S('tc.wins','<b>{p}</b> wins Moropoly. Mabrouk!','<b>{p}</b> remporte Moropoly. Mabrouk !','<b>{p}</b> يفوز بموروبولي. مبروك!');
S('btn.results','Results','Résultats','النتائج');
S('tc.offered','<b>{p}</b> offered <b>{o}</b> a trade.','<b>{p}</b> propose un échange à <b>{o}</b>.','<b>{p}</b> عرض على <b>{o}</b> تبادلًا.');
S('btn.seeOffer','See the offer','Voir l’offre','اطّلع على العرض'); S('btn.withdraw','Withdraw offer','Retirer l’offre','اسحب العرض');
S('tc.dlala','Dlala for <b>{s}</b>: {a}{by}.','Dlala pour <b>{s}</b> : {a}{by}.','الدلالة على <b>{s}</b>: {a}{by}.');
S('tc.by',' by {p}',' par {p}',' لصالح {p}');
S('btn.openAuc','Open the auction','Ouvrir les enchères','افتح المزاد');
S('tc.owes','{p} owes {a}. Sell buildings or mortgage in My deeds, trade, or declare bankruptcy.','{p} doit {a}. Vendez des bâtiments ou hypothéquez dans Mes titres, échangez, ou déclarez faillite.','{p} مدين بـ {a}. بع بنايات أو ارهن من «ممتلكاتي»، أو تبادل، أو أعلن الإفلاس.');
S('btn.myDeeds','My deeds','Mes titres','ممتلكاتي'); S('btn.tbadel','Tbadel · Trade','Tbadel · Échange','تبادل'); S('btn.bankrupt','Declare bankruptcy','Déclarer faillite','أعلن الإفلاس');
S('tc.forSale','For sale: <b>{s}</b>{c}','À vendre : <b>{s}</b>{c}','للبيع: <b>{s}</b>{c}');
S('btn.buy','Buy for {a}','Acheter pour {a}','اشترِ بـ {a}'); S('btn.dlala','Send to the Dlala','Mettre à la Dlala','إلى الدلالة'); S('btn.pass','Pass','Passer','تخلَّ');
S('tc.inJail','{p} is in 3okacha (try {n} of 3). Roll a double, pay {a} or use a card.','{p} est à 3okacha (essai {n} sur 3). Faites un double, payez {a} ou utilisez une carte.','{p} في عكاشة (المحاولة {n} من 3). ارمِ دوبل أو ادفع {a} أو استعمل بطاقة.');
S('tc.again','Double! Roll again.','Double ! Rejouez.','دوبل! ارمِ مرة أخرى.'); S('tc.toRoll','{p} to roll.','À {p} de lancer.','دور {p} في رمي النرد.');
S('btn.roll','🎲 Roll the dice','🎲 Lancer les dés','🎲 ارمِ النرد'); S('btn.payFine','Pay {a}','Payer {a}','ادفع {a}'); S('btn.useCard','Use get-out card','Utiliser la carte','استعمل بطاقة الخروج');
S('btn.seeBoard','See board','Voir le plateau','اعرض اللوحة');
S('pill.trade','Your trade offer · tap to finish','Votre offre d’échange · touchez pour finir','عرض التبادل · المس للإكمال');
S('pill.treply','Tbadel (trade) offer for you · tap to answer','Offre de Tbadel (échange) pour vous · touchez pour répondre','عرض تبادل لك · المس للرد');
S('pill.auction','Dlala (auction) · tap to open','Dlala (enchère) · touchez pour ouvrir','الدلالة · المس للفتح');
S('btn.riadNow','Riad now','Riad direct','رياض مباشرة');
S('log.riadNow','{p} builds a riad straight away on {s}.','{p} construit directement un riad sur {s}.','{p} يبني رياضًا مباشرة في {s}.');
S('fate.tap','Tap to continue','Touchez pour continuer','المس للمتابعة');
S('btn.end','End turn','Fin du tour','أنهِ الدور'); S('btn.build','Build','Construire','ابنِ');
S('pv.rentProp','Rent {a}, or {b} with all of {c}','Loyer {a}, ou {b} avec tout {c}','الكراء {a}، أو {b} مع كل {c}');
S('pv.rentRail','Station rent 250 to 2,000 DH','Loyer de gare : 250 à 2 000 DH','كراء المحطة من 250 إلى 2,000 درهم');
S('pv.rentUtil','Rent 40 or 100 × the dice','Loyer : 40 ou 100 × les dés','الكراء 40 أو 100 × النرد');
S('btn.viewDeed','View deed','Voir le titre','اعرض العقد');
S('tc.waiting','Waiting for {p}…','En attente de {p}…','في انتظار {p}…'); S('tc.thinking','Computer player is thinking…','L’ordinateur réfléchit…','الحاسوب يفكر…');
S('lbl.computer','computer','ordinateur','حاسوب'); S('lbl.you','you','vous','أنت'); S('lbl.host','host','hôte','المضيف');
/* tabs */
S('tab.players','Players','Joueurs','اللاعبون'); S('tab.deeds','My deeds','Mes titres','ممتلكاتي'); S('tab.log','Journal','Journal','السجل'); S('tab.book','Rules','Règles','القواعد');
S('btn.letBot','Let computer play','Laisser l’ordinateur jouer','دع الحاسوب يلعب'); S('btn.handBack','Hand back to player','Rendre au joueur','أعِده إلى اللاعب');
S('st.bankrupt','Bankrupt','En faillite','مفلس'); S('st.inJail','In 3okacha','À 3okacha','في عكاشة'); S('st.goojf','get-out card','carte de sortie','بطاقة خروج'); S('st.worth','worth {a}','fortune {a}','الثروة {a}');
S('dd.watching','You are watching this game.','Vous regardez cette partie.','أنت تتابع هذه اللعبة.');
S('dd.none','{p} owns no property yet. Buy a free tile when you land on it, or win one at the Dlala.','{p} n’a encore aucune propriété. Achetez une case libre en vous y arrêtant, ou gagnez-en une à la Dlala.','{p} لا يملك أي عقار بعد. اشترِ خانة حرة عندما تصل إليها، أو اربح واحدة في الدلالة.');
S('dd.help','Own a whole city to build a dar (house), then a riad (hotel). Build evenly across the city. In a hurry? “Riad now” builds the riad in one go, for {n}% more.','Possédez toute une ville pour construire une dar (maison), puis un riad (hôtel). Construisez de façon égale dans la ville. Pressé ? « Riad direct » construit le riad d’un coup, pour {n} % de plus.','امتلك مدينة كاملة لتبني دارًا ثم رياضًا. ابنِ بالتساوي في كل المدينة. مستعجل؟ «رياض مباشرة» يبني الرياض دفعة واحدة بزيادة {n}%.');
S('dd.notTurn','You can build, sell and mortgage on {p}’s turn.','Vous pouvez construire, vendre et hypothéquer pendant le tour de {p}.','يمكنك البناء والبيع والرهن خلال دور {p}.');
S('lv.station','Station','Gare','محطة'); S('lv.utility','Utility','Service public','مرفق'); S('lv.riad','Riad','Riad','رياض'); S('lv.dar','{n} dar','{n} dar','{n} دار'); S('lv.none','No buildings','Aucun bâtiment','بلا بنايات'); S('lv.mort','Mortgaged','Hypothéqué','مرهون');
S('dd.rent','Rent','Loyer','الكراء'); S('dd.part','{n} of {m} in {c}','{n} sur {m} à {c}','{n} من {m} في {c}'); S('btn.addRiad','+ Riad','+ Riad','+ رياض'); S('btn.addDar','+ Dar','+ Dar','+ دار'); S('btn.sell','Sell','Vendre','بع'); S('btn.lift','Lift rahn','Lever le rahn','فكّ الرهن'); S('btn.rahn','Rahn','Rahn','رهن');
/* deed */
S('dm.labels',()=>['Rent','With 1 dar','With 2 dars','With 3 dars','With 4 dars','With a riad'],()=>['Loyer','Avec 1 dar','Avec 2 dars','Avec 3 dars','Avec 4 dars','Avec un riad'],()=>['الكراء','مع دار واحدة','مع داريْن','مع 3 دور','مع 4 دور','مع رياض']);
S('dm.price','Price','Prix','الثمن'); S('dm.allCity','All of {c}, no buildings','Tout {c}, sans bâtiment','كل {c} بلا بنايات'); S('dm.each','Each dar or riad','Chaque dar ou riad','كل دار أو رياض'); S('dm.rahn','Rahn (mortgage)','Rahn (hypothèque)','الرهن');
S('dm.stations',p=>`Owner has ${p.n} station${p.n>1?'s':''}`,p=>`Le propriétaire a ${p.n} gare${p.n>1?'s':''}`,p=>`المالك لديه ${p.n==1?'محطة واحدة':p.n==2?'محطتان':p.n+' محطات'}`);
S('dm.railNote','Al Boraq and the national line, Tangier to Marrakech.','Al Boraq et la ligne nationale, de Tanger à Marrakech.','البراق والخط الوطني، من طنجة إلى مراكش.');
S('dm.util1','Owner has 1 utility','Le propriétaire a 1 service','المالك لديه مرفق واحد'); S('dm.util2','Owner has both','Le propriétaire a les deux','المالك لديه الاثنان');
S('dm.x40','40 × dice','40 × les dés','40 × النرد'); S('dm.x100','100 × dice','100 × les dés','100 × النرد');
S('info.go','Collect 2,000 DH every time you pass.','Recevez 2 000 DH à chaque passage.','احصل على 2,000 درهم كلما مررت من هنا.');
S('info.jail','Leave 3okacha by rolling a double, paying 500 DH, or using a get-out card. After three failed rolls you pay and move.','Sortez de 3okacha en faisant un double, en payant 500 DH ou avec une carte de sortie. Après trois essais ratés, vous payez et avancez.','اخرج من عكاشة برمي دوبل، أو بدفع 500 درهم، أو ببطاقة خروج. بعد ثلاث محاولات فاشلة تدفع وتتقدّم.');
S('info.parking','Mint tea at the café. With the Daret rule on, you take everything in the pot.','Un thé à la menthe au café. Avec la règle de la Daret, vous raflez toute la cagnotte.','أتاي في المقهى. مع قاعدة الدارت، تأخذ كل ما في الصندوق.');
S('info.gojail','Go directly to 3okacha. Do not pass Al Inṭilāq, do not collect 2,000 DH.','Allez directement à 3okacha. Ne passez pas par Al Inṭilāq, ne recevez pas 2 000 DH.','اذهب مباشرة إلى عكاشة. لا تمرّ بالانطلاق ولا تأخذ 2,000 درهم.');
S('info.tax','Pay {a}{d}.','Payez {a}{d}.','ادفع {a}{d}.'); S('info.taxDaret',' into the Daret pot',' dans la cagnotte Daret',' في صندوق الدارت');
S('info.mektoub','Mektoub, what is written: draw a fate card.','Mektoub, ce qui est écrit : tirez une carte du destin.','مكتوب، ما هو مقدَّر: اسحب بطاقة القدر.');
S('info.baraka','Baraka: blessings and family life. Draw a Baraka card.','Baraka : bénédictions et vie de famille. Tirez une carte Baraka.','بركة: الخير والحياة العائلية. اسحب بطاقة بركة.');
S('dm.owned','Owned by {p}{m}','Appartient à {p}{m}','ملك {p}{m}'); S('dm.mortSuffix',' · mortgaged',' · hypothéqué',' · مرهون'); S('dm.forSale','For sale','À vendre','للبيع');
S('aria.close','Close','Fermer','إغلاق');
/* auction */
S('au.title','Dlala · {s}','Dlala · {s}','الدلالة · {s}');
S('au.help','The dlal calls out the price. Raise the bid or leave. The last one standing buys.','Le dlal annonce le prix. Surenchérissez ou retirez-vous. Le dernier en lice achète.','الدلّال ينادي بالثمن. زِد في المزايدة أو انسحب. آخر من يبقى يشتري.');
S('au.held','held by {p}','tenue par {p}','لصالح {p}'); S('au.none','no bids yet','aucune enchère','لا مزايدة بعد'); S('au.list','list price {a}','prix affiché {a}','الثمن الأصلي {a}');
S('au.yourBid',', your bid. You have {a}.',', à vous d’enchérir. Vous avez {a}.',' ، دورك في المزايدة. لديك {a}.'); S('au.deciding',' is deciding…',' réfléchit…',' يفكر…');
S('btn.leaveAuc','Leave auction','Quitter les enchères','انسحب من المزاد');
/* bankrupt */
S('bk.title','Declare bankruptcy?','Déclarer faillite ?','إعلان الإفلاس؟');
S('bk.body','{p} owes {a}. First the game sells {p}’s buildings and mortgages their properties to pay as much as possible. If that is still not enough, {o} gets only that money and the mortgaged properties, and {p} leaves the game. This cannot be undone.','{p} doit {a}. Le jeu vend d’abord les bâtiments de {p} et hypothèque ses propriétés pour payer le plus possible. Si cela ne suffit pas, {o} ne reçoit que cet argent et les propriétés hypothéquées, et {p} quitte la partie. C’est définitif.','{p} مدين بـ{a}. تبيع اللعبة أولًا مباني {p} وترهن ممتلكاته لدفع أكبر قدر ممكن. إذا لم يكفِ ذلك، يحصل {o} فقط على هذا المال والممتلكات المرهونة، ويغادر {p} اللعبة. لا يمكن التراجع عن ذلك.');
S('btn.keep','Keep playing','Continuer à jouer','واصل اللعب');
/* trade */
S('tr.title','Tbadel · Trade','Tbadel · Échange','تبادل'); S('tr.with','Trade with','Échanger avec','تبادل مع'); S('tr.gives','{p} gives','{p} donne','{p} يعطي'); S('tr.cash','Cash','Argent','نقدًا');
S('tr.nothing','Nothing tradeable','Rien à échanger','لا شيء للتبادل'); S('btn.cancel','Cancel','Annuler','إلغاء'); S('btn.send','Send offer','Envoyer l’offre','أرسل العرض');
S('tr.pick','Pick something to trade.','Choisissez quelque chose à échanger.','اختر شيئًا للتبادل.'); S('tr.noCash','One side does not have that much cash.','L’un des deux n’a pas assez d’argent.','أحد الطرفين لا يملك هذا المبلغ.');
S('tr.sent','Offer sent to {p}.','Offre envoyée à {p}.','أُرسل العرض إلى {p}.'); S('tr.thinking','{p} is thinking it over…','{p} réfléchit…','{p} يفكر في العرض…');
S('trr.title','Tbadel (trade) offer for {p}','Offre de Tbadel (échange) pour {p}','عرض تبادل إلى {p}'); S('trr.pass','Pass the screen to <b>{p}</b>.','Passez l’écran à <b>{p}</b>.','سلّم الشاشة إلى <b>{p}</b>.');
S('trr.receive','You receive:','Vous recevez :','تحصل على:'); S('trr.give','You give:','Vous donnez :','تعطي:'); S('trr.from','Offer from {p}.','Offre de {p}.','عرض من {p}.'); S('tr.nothingW','nothing','rien','لا شيء');
S('btn.refuse','Refuse','Refuser','ارفض'); S('btn.accept','Accept','Accepter','اقبل');
/* game over */
S('go.title','Mabrouk, {p}!','Mabrouk, {p} !','مبروك يا {p}!'); S('go.props',p=>`${p.n} properties`,p=>`${p.n} propriété${p.n>1?'s':''}`,p=>`${p.n} عقارات`); S('go.nw','net worth','fortune','الثروة');
S('btn.look','Look at the board','Voir le plateau','انظر إلى اللوحة'); S('btn.backHome','Back to home','Retour à l’accueil','العودة إلى الرئيسية');
/* lobby */
S('back','← Home','← Accueil','→ الرئيسية'); S('chip.game','GAME {c}','PARTIE {c}','اللعبة {c}');
S('lb.hosting','You are hosting','Vous êtes l’hôte','أنت المضيف'); S('lb.invited','You are invited','Vous êtes invité','أنت مدعو'); S('lb.h2','The table is set','La table est prête','الطاولة جاهزة');
S('lb.invite','Invite players','Inviter des joueurs','ادعُ اللاعبين');
S('lb.send','Send this link on WhatsApp or anywhere. Everyone who opens it picks a name and a token here.','Envoyez ce lien par WhatsApp ou ailleurs. Chacun choisit ici un nom et un pion.','أرسل هذا الرابط عبر واتساب أو أي تطبيق. كل من يفتحه يختار هنا اسمًا وقطعة.');
S('lb.claude',' They need access to this page on Claude: share it with them from the Share menu.',' Ils doivent avoir accès à cette page sur Claude : partagez-la depuis le menu Partager.',' يحتاجون إلى صلاحية فتح هذه الصفحة على Claude: شاركها معهم من قائمة المشاركة.');
S('lb.keepOpen',' Keep this tab open while you play: your browser runs the game.',' Gardez cet onglet ouvert pendant la partie : c’est votre navigateur qui la fait tourner.',' أبقِ هذه الصفحة مفتوحة أثناء اللعب: متصفحك هو من يدير اللعبة.');
S('btn.copy','Copy link','Copier le lien','انسخ الرابط'); S('lb.atTable','At the table · {n} of 8','À table · {n} sur 8','على الطاولة · {n} من 8');
S('btn.remove','Remove','Retirer','أزِل'); S('lb.nobody','Nobody has sat down yet.','Personne n’est encore assis.','لم يجلس أحد بعد.'); S('btn.addBot','+ Computer player','+ Joueur ordinateur','+ لاعب حاسوب');
S('lb.yourSeat','Your seat','Votre place','مقعدك'); S('lb.takeSeat','Take a seat','Prenez place','اجلس'); S('lb.name','Your name','Votre nom','اسمك'); S('lb.namePh','Name shown on the board','Nom affiché sur le plateau','الاسم الذي يظهر في اللوحة'); S('lb.token','Your token','Votre pion','قطعتك');
S('btn.update','Update my seat','Mettre à jour ma place','حدّث مقعدي'); S('btn.sit','Sit down','S’asseoir','اجلس'); S('btn.leaveTable','Leave the table','Quitter la table','غادر الطاولة');
S('sec.rules','House rules','Règles maison','قواعد اللعب'); S('btn.start','Start the game','Lancer la partie','ابدأ اللعبة');
S('lb.need2','At least 2 players needed.','Il faut au moins 2 joueurs.','يلزم لاعبان على الأقل.'); S('lb.ready',p=>`${p.n} players ready.`,p=>`${p.n} joueurs prêts.`,p=>`${p.n} لاعبين جاهزون.`);
S('lb.hostStarts','The host starts the game when everyone is seated.','L’hôte lance la partie quand tout le monde est assis.','المضيف يبدأ اللعبة عندما يجلس الجميع.'); S('lb.waitHost','Waiting for the host to come back.','En attente du retour de l’hôte.','في انتظار عودة المضيف.');
S('toast.copied','Invite link copied.','Lien d’invitation copié.','نُسخ رابط الدعوة.'); S('toast.ctrlC','Press Ctrl+C to copy.','Appuyez sur Ctrl+C pour copier.','اضغط Ctrl+C للنسخ.');
S('toast.name','Type your name first.','Saisissez d’abord votre nom.','اكتب اسمك أولًا.'); S('toast.saved','Seat saved.','Place enregistrée.','حُفظ المقعد.'); S('toast.sitting','Sitting down…','Installation…','جارٍ الجلوس…');
/* options */
S('opt.daret','Daret pot','Cagnotte Daret','صندوق الدارت'); S('opt.daretD','Taxes and fines pool at the Qahwa.','Taxes et amendes s’accumulent à la Qahwa.','الضرائب والغرامات تتجمع في القهوة.');
S('opt.dlala','Dlala auctions','Enchères Dlala','مزادات الدلالة'); S('opt.dlalaD','Unbought property goes to auction.','Une propriété non achetée part aux enchères.','العقار غير المُشترى يذهب إلى المزاد.');
S('opt.len','Game length','Durée de la partie','مدة اللعبة'); S('opt.lenD','Richest player wins at the limit.','Le plus riche gagne à la fin.','الأغنى يفوز عند النهاية.');
S('opt.until','Until one player is left','Jusqu’au dernier joueur','حتى يبقى لاعب واحد'); S('opt.rounds','{n} rounds','{n} tours','{n} جولة');
S('opt.fast','Fast animations','Animations rapides','حركات سريعة'); S('opt.fastD','Quicker dice and token moves.','Dés et pions plus rapides.','نرد وقطع أسرع.');
/* setup */
S('setup.eyebrow','Play on this device','Jouer sur cet appareil','العب على هذا الجهاز'); S('setup.h2','Who’s playing?','Qui joue ?','من يلعب؟');
S('setup.p','Pass the screen around. Turn seats on or off, and let the computer take any empty chair.','Faites passer l’écran. Activez ou désactivez des places, et laissez l’ordinateur occuper les chaises vides.','مرّروا الشاشة بينكم. فعّلوا المقاعد أو عطّلوها، ودعوا الحاسوب يشغل أي كرسي فارغ.');
S('btn.startGame','Start game','Commencer','ابدأ'); S('btn.demo','Watch 8 computer players','Regarder 8 joueurs ordinateur','شاهد 8 لاعبين من الحاسوب'); S('btn.resume','Resume saved game','Reprendre la partie','تابع اللعبة المحفوظة');
S('setup.need2','Turn on at least 2 seats.','Activez au moins 2 places.','فعّل مقعدين على الأقل.'); S('setup.count','{n} players · {h} human','{n} joueurs · {h} humain(s)','{n} لاعبين · {h} بشر');
S('seg.human','Human','Humain','إنسان'); S('seg.computer','Computer','Ordinateur','حاسوب');
S('tok.choose','Choose a token','Choisir un pion','اختر قطعة'); S('tok.swap','Picking a token another seat has swaps the two.','Choisir le pion d’une autre place les échange.','اختيار قطعة مقعد آخر يبدّل بينهما.');
S('aria.seatTok','Choose token for seat {n}','Choisir le pion de la place {n}','اختر قطعة المقعد {n}'); S('aria.seatOn','Seat {n} playing','Place {n} active','المقعد {n} يلعب'); S('aria.seatName','Seat {n} name','Nom de la place {n}','اسم المقعد {n}');
/* home */
S('home.players','2–8 players · online or one screen','2 à 8 joueurs · en ligne ou sur un écran','من 2 إلى 8 لاعبين · عبر الإنترنت أو على شاشة واحدة');
S('home.eyebrow','لعبة العقارات المغربية · The Moroccan property game','لعبة العقارات المغربية · Le jeu immobilier marocain','لعبة العقارات المغربية');
S('home.h1','<span class="s">Buy Morocco,</span><br>from <span class="r">Tangier</span> to <span class="g">Lagouira</span>.','<span class="s">Achetez le Maroc,</span><br>de <span class="r">Tanger</span> à <span class="g">Lagouira</span>.','<span class="s">اشترِ المغرب،</span><br>من <span class="r">طنجة</span> إلى <span class="g">الكويرة</span>.');
S('home.lead','Host a game, send the invite link, and your friends join from their own screens. Each player picks a name and one of the ten silver tokens, then the dice decide.','Créez une partie, envoyez le lien d’invitation, et vos amis vous rejoignent depuis leur propre écran. Chacun choisit un nom et l’un des dix pions argentés, puis les dés décident.','أنشئ لعبة، وأرسل رابط الدعوة، فينضم أصدقاؤك من شاشاتهم. يختار كل لاعب اسمًا وواحدة من القطع الفضية العشر، ثم يقرر النرد.');
S('home.host','Host an online game','Créer une partie en ligne','استضف لعبة عبر الإنترنت'); S('home.local','Play on this device','Jouer sur cet appareil','العب على هذا الجهاز'); S('home.install','Install the app','Installer l’application','ثبّت التطبيق');
S('home.code','Game code (8 characters)','Code de la partie (8 caractères)','رمز اللعبة (8 رموز)'); S('home.join','Join','Rejoindre','انضم'); S('home.checking','Checking online play…','Vérification du jeu en ligne…','جارٍ التحقق من اللعب عبر الإنترنت…');
S('home.resume','Resume game {c} · {w}','Reprendre la partie {c} · {w}','تابع اللعبة {c} · {w}'); S('home.lobby','lobby','salon','الانتظار'); S('home.round','round {n}','tour {n}','الجولة {n}');
S('note.claudeOn','Online play is on. Players join with your invite link and need access to this page on Claude.','Le jeu en ligne est activé. Les joueurs rejoignent avec votre lien et doivent avoir accès à cette page sur Claude.','اللعب عبر الإنترنت مفعّل. ينضم اللاعبون برابط دعوتك، ويحتاجون إلى صلاحية فتح هذه الصفحة على Claude.');
S('note.claudeHostNo',' You can join games here, but hosting needs edit access.',' Vous pouvez rejoindre des parties ici, mais il faut un accès en modification pour en créer.',' يمكنك الانضمام إلى الألعاب هنا، لكن الاستضافة تتطلب صلاحية التعديل.');
S('note.claudeOff','Online play is not available in this view. You can still play on this device.','Le jeu en ligne n’est pas disponible ici. Vous pouvez quand même jouer sur cet appareil.','اللعب عبر الإنترنت غير متاح هنا. يمكنك مع ذلك اللعب على هذا الجهاز.');
S('note.secure','Online play needs the secure address: open https://moropoly.win','Le jeu en ligne nécessite l’adresse sécurisée : ouvrez https://moropoly.win','اللعب عبر الإنترنت يحتاج العنوان الآمن: افتح https://moropoly.win');
S('note.server','Online play works on any network, including mobile data. The game runs on the Moropoly server, so anyone can close the app and come back to the same table.','Le jeu en ligne fonctionne sur tous les réseaux, y compris les données mobiles. La partie tourne sur le serveur Moropoly : chacun peut fermer l’appli et revenir à la même table.','اللعب عبر الإنترنت يعمل على أي شبكة، بما فيها بيانات الهاتف. اللعبة تجري على خادم موروبولي، فيمكن لأي لاعب أن يغلق التطبيق ويعود إلى الطاولة نفسها.');S('conn.noRelay','Can’t reach the game server yet. Check your internet connection; this page keeps trying.','Impossible de joindre le serveur de jeu pour l’instant. Vérifiez votre connexion internet ; cette page réessaie.','تعذّر الوصول إلى خادم اللعبة حتى الآن. تحقق من اتصالك بالإنترنت؛ هذه الصفحة تواصل المحاولة.');S('conn.found','Table found. Joining…','Table trouvée. Connexion…','تم العثور على الطاولة. جارٍ الانضمام…');
S('feat.dlala','DLALA','DLALA','المزاد'); S('feat.dlalaP','Nobody buys a property? The souk auctioneer sells it to the highest bidder.','Personne n’achète une propriété ? Le crieur du souk la vend au plus offrant.','لم يشترِ أحد العقار؟ دلّال السوق يبيعه لمن يدفع أكثر.');
S('feat.daret','DARET','DARET','دارت'); S('feat.daretP','Taxes and fines pool into the Daret. Stop at the Qahwa and take it all.','Taxes et amendes alimentent la Daret. Arrêtez-vous à la Qahwa et raflez tout.','الضرائب والغرامات تتجمع في الدارت. توقّف في القهوة وخذها كلها.');
S('feat.cards','MEKTOUB & BARAKA','MEKTOUB & BARAKA','مكتوب وبركة'); S('feat.cardsP','Grand taxis, radars, the Eid sheep, Friday couscous and grandma’s baraka.','Grands taxis, radars, mouton de l’Aïd, couscous du vendredi et baraka de grand-mère.','الطاكسي الكبير، الرادار، حولي العيد، كسكس الجمعة وبركة الجدة.');
S('feat.jail','3OKACHA','3OKACHA','عكاشة'); S('feat.jailP','Roll a double, pay 500 DH, or hope your cousin really is a lawyer.','Faites un double, payez 500 DH, ou espérez que votre cousin soit vraiment avocat.','ارمِ دوبل، أو ادفع 500 درهم، أو تمنَّ أن يكون ابن عمك محاميًا فعلًا.');
S('sk.eyebrow','From the sketchbook','Le carnet de croquis','من دفتر الرسومات'); S('sk.h2','Every tile has its own painting','Chaque case a sa propre peinture','لكل خانة لوحتها الخاصة');
S('sk.p','22 property cards painted for Moropoly, from the riverside homes of Sidi Moussa to the Twin Center in Maarif, plus the 3okacha gate and ten silver tokens. They all appear in the game: on the board, in the deed cards and in the reveal when you land.','22 cartes de propriété peintes pour Moropoly, des maisons au bord du fleuve à Sidi Moussa jusqu’au Twin Center de Maarif, plus la porte de 3okacha et dix pions argentés. Toutes apparaissent dans le jeu : sur le plateau, dans les titres et quand vous vous arrêtez sur une case.','22 بطاقة عقار رُسمت لموروبولي، من بيوت سيدي موسى على ضفة النهر إلى التوين سنتر في المعاريف، إضافة إلى بوابة عكاشة وعشر قطع فضية. كلها تظهر في اللعبة: على اللوحة، وفي بطاقات العقود، وعند وصولك إلى الخانة.');
S('aria.map','Map of Morocco with the game’s cities','Carte du Maroc avec les villes du jeu','خريطة المغرب مع مدن اللعبة'); S('aria.flag','Flag of Morocco','Drapeau du Maroc','علم المغرب');
/* network */
S('err.lib','Could not load the connection library. Check your internet connection.','Impossible de charger la bibliothèque de connexion. Vérifiez votre connexion internet.','تعذّر تحميل مكتبة الاتصال. تحقق من اتصالك بالإنترنت.');
S('err.inUse','That game is already open in another tab or browser.','Cette partie est déjà ouverte dans un autre onglet ou navigateur.','هذه اللعبة مفتوحة في نافذة أو متصفح آخر.');
S('err.browser','This browser cannot make direct connections. Try Chrome, Edge, Firefox or Safari.','Ce navigateur ne peut pas établir de connexion directe. Essayez Chrome, Edge, Firefox ou Safari.','هذا المتصفح لا يدعم الاتصال المباشر. جرّب Chrome أو Edge أو Firefox أو Safari.');
S('err.conn','Could not connect. Check your internet connection and try again.','Connexion impossible. Vérifiez votre connexion internet et réessayez.','تعذّر الاتصال. تحقق من اتصالك بالإنترنت وحاول مجددًا.');
S('toast.noHost','Hosting is not available here.','Impossible de créer une partie ici.','الاستضافة غير متاحة هنا.'); S('toast.code','Game codes are 8 letters and numbers, at the end of the invite link.','Les codes de partie font 8 lettres et chiffres, à la fin du lien d’invitation.','رمز اللعبة 8 حروف وأرقام، في آخر رابط الدعوة.');
S('toast.noOnline','Online play is not available in this view.','Le jeu en ligne n’est pas disponible ici.','اللعب عبر الإنترنت غير متاح هنا.'); S('toast.noGame','No game found with code {c}.','Aucune partie trouvée avec le code {c}.','لا توجد لعبة بالرمز {c}.');
S('conn.opening','Opening your table…','Ouverture de votre table…','جارٍ فتح طاولتك…'); S('conn.reopen','Reopening your table…','Réouverture de votre table…','جارٍ إعادة فتح طاولتك…'); S('conn.connecting','Connecting to the host…','Connexion à l’hôte…','جارٍ الاتصال بالمضيف…');
S('conn.hint','The host needs to have the game open. This page keeps trying on its own.','L’hôte doit avoir la partie ouverte. Cette page réessaie toute seule.','يجب أن تكون اللعبة مفتوحة عند المضيف. هذه الصفحة تواصل المحاولة تلقائيًا.');
S('conn.joining','Joining the table…','Connexion à la table…','جارٍ الانضمام إلى الطاولة…');
S('conn.serverHint','If the connection is slow, this page keeps trying on its own.','Si la connexion est lente, cette page réessaie toute seule.','إذا كان الاتصال بطيئًا، تواصل هذه الصفحة المحاولة تلقائيًا.');
S('lb.server',' The game runs on the Moropoly server: anyone can close this page and come back with the same link.',' La partie tourne sur le serveur Moropoly : chacun peut fermer cette page et revenir avec le même lien.',' اللعبة تجري على خادم موروبولي: يمكن لأي لاعب أن يغلق هذه الصفحة ويعود بالرابط نفسه.');
S('banner.offline','Connection lost. Reconnecting… Your moves will be sent once you’re back.','Connexion perdue. Reconnexion… Vos coups seront envoyés dès votre retour.','انقطع الاتصال. جارٍ إعادة الاتصال… ستُرسل حركاتك بمجرد عودتك.');
S('toast.offline','You’re offline. Your move will be sent when you reconnect.','Vous êtes hors ligne. Votre coup sera envoyé à la reconnexion.','أنت غير متصل. ستُرسل حركتك عند عودة الاتصال.');
S('toast.hostOff','The host is offline. Your move will be sent when they are back.','L’hôte est hors ligne. Votre coup sera envoyé à son retour.','المضيف غير متصل. ستُرسل حركتك عند عودته.');
S('toast.taken','That token is taken.','Ce pion est déjà pris.','هذه القطعة مأخوذة.'); S('toast.noMove','That move is not possible right now.','Ce coup n’est pas possible pour l’instant.','هذه الحركة غير ممكنة الآن.');
S('banner.paused','Can’t reach the host, so the game is paused. It reconnects on its own when the host’s game is open again.','Impossible de joindre l’hôte : la partie est en pause. Elle se reconnecte toute seule quand l’hôte rouvre la partie.','تعذّر الوصول إلى المضيف، فاللعبة متوقفة مؤقتًا. ستعود تلقائيًا عندما يفتح المضيف اللعبة من جديد.');
S('meta.round','Round {n}{of} · Daret {a}','Tour {n}{of} · Daret {a}','الجولة {n}{of} · الدارت {a}'); S('meta.of',' of {m}',' sur {m}',' من {m}');
S('btn.leave','Leave','Quitter','غادر');
/* pwa */
S('pwa.installed','Moropoly is on your home screen.','Moropoly est sur votre écran d’accueil.','موروبولي الآن على شاشتك الرئيسية.'); S('pwa.title','Install Moropoly','Installer Moropoly','ثبّت موروبولي');
S('pwa.ios','<b>iPhone or iPad (Safari):</b> tap the Share button, then <b>Add to Home Screen</b>.','<b>iPhone ou iPad (Safari) :</b> touchez Partager, puis <b>Sur l’écran d’accueil</b>.','<b>آيفون أو آيباد (Safari):</b> اضغط زر المشاركة، ثم <b>إضافة إلى الشاشة الرئيسية</b>.');
S('pwa.android','<b>Android (Chrome):</b> open the ⋮ menu, then <b>Install app</b> or <b>Add to Home screen</b>.','<b>Android (Chrome) :</b> ouvrez le menu ⋮, puis <b>Installer l’application</b> ou <b>Ajouter à l’écran d’accueil</b>.','<b>أندرويد (Chrome):</b> افتح القائمة ⋮، ثم <b>تثبيت التطبيق</b> أو <b>إضافة إلى الشاشة الرئيسية</b>.');
S('pwa.note','It opens full screen like an app, and invite links still work.','Il s’ouvre en plein écran comme une application, et les liens d’invitation fonctionnent toujours.','يفتح بملء الشاشة مثل التطبيق، وتبقى روابط الدعوة تعمل.');
/* dock */
S('dk.music','Music','Musique','الموسيقى'); S('dk.pick','Choose the music','Choisir la musique','اختر الموسيقى');
S('trk.oud','Oud Nights','Nuits d’oud','ليالي العود'); S('trk.oud.d','Calm oud under the stars','Oud paisible sous les étoiles','عود هادئ تحت النجوم');
S('trk.guitar','Andalusian Sunset','Coucher de soleil andalou','غروب أندلسي'); S('trk.guitar.d','Slow guitar, Tangier evenings','Guitare lente, soirées de Tanger','قيثارة هادئة، أمسيات طنجة');
S('trk.chaabi','Chaabi Wedding','Mariage chaâbi','عرس شعبي'); S('trk.chaabi.d','Lively chaabi, everyone dances','Chaâbi entraînant, tout le monde danse','شعبي حماسي، الكل يرقص'); S('dk.loop','Plays on a loop','En boucle','تُعاد باستمرار'); S('dk.vol','Volume','Volume','الصوت'); S('dk.sfx','Sound effects','Effets sonores','المؤثرات الصوتية');
S('dk.m','Press M to turn the music on or off.','Appuyez sur M pour activer ou couper la musique.','اضغط M لتشغيل الموسيقى أو إيقافها.'); S('toast.musicOn','Music on','Musique activée','الموسيقى تعمل'); S('toast.musicOff','Music off','Musique coupée','الموسيقى متوقفة');
S('dk.aria','Open music controls','Ouvrir les réglages de la musique','افتح إعدادات الموسيقى'); S('dk.ariaOn','Music playing. Open music controls','Musique en cours. Ouvrir les réglages','الموسيقى تعمل. افتح الإعدادات');
S('lang.aria','Language','Langue','اللغة');
/* rules page */
S('book',
`<div class="book"><h3>How a turn works</h3><p>Roll, move, then buy what you land on or send it to the Dlala. Pay rent on other players’ property. Own a whole city to build dars, then a riad. Doubles roll again; three doubles send you to 3okacha.</p>
<h3>Moroccan rules</h3><div class="tw"><table><tr><th>Classic</th><th>Moropoly</th><th>What it does</th></tr>
<tr><td>GO</td><td><span class="k">الانطلاق</span> Al Inṭilāq</td><td>Collect 2,000 DH each pass</td></tr>
<tr><td>Jail</td><td><span class="k">عكاشة</span> 3okacha</td><td>Double, 500 DH, or a get-out card</td></tr>
<tr><td>Free Parking</td><td><span class="k">القهوة</span> Qahwa</td><td>Take the Daret pot</td></tr>
<tr><td>Chance</td><td><span class="k">مكتوب</span> Mektoub</td><td>Fate cards</td></tr>
<tr><td>Community Chest</td><td><span class="k">بركة</span> Baraka</td><td>Family and blessing cards</td></tr>
<tr><td>Auction</td><td><span class="k">الدلالة</span> Dlala</td><td>Bids in turn, last one standing buys</td></tr>
<tr><td>House · Hotel</td><td><span class="k">دار · رياض</span></td><td>Four dars, then a riad</td></tr>
<tr><td>Mortgage</td><td><span class="k">رهن</span> Rahn</td><td>Half the price, lift it for 55%</td></tr>
<tr><td>Trade</td><td><span class="k">تبادل</span> Tbadel</td><td>Properties and cash</td></tr></table></div>
<h3>Playing online</h3><ul><li>The game runs on the Moropoly server. Anyone can close the page and come back to the table with the invite link or from the home page.</li><li>If a player drops out, the host can let the computer play for them from the Players tab.</li></ul></div>`,
`<div class="book"><h3>Déroulement d’un tour</h3><p>Lancez les dés, avancez, puis achetez la case où vous tombez ou mettez-la à la Dlala. Payez un loyer sur les propriétés des autres. Possédez toute une ville pour construire des dars, puis un riad. Un double fait rejouer ; trois doubles vous envoient à 3okacha.</p>
<h3>Les règles marocaines</h3><div class="tw"><table><tr><th>Classique</th><th>Moropoly</th><th>Effet</th></tr>
<tr><td>Départ</td><td><span class="k">الانطلاق</span> Al Inṭilāq</td><td>Recevez 2 000 DH à chaque passage</td></tr>
<tr><td>Prison</td><td><span class="k">عكاشة</span> 3okacha</td><td>Double, 500 DH ou carte de sortie</td></tr>
<tr><td>Parc gratuit</td><td><span class="k">القهوة</span> Qahwa</td><td>Raflez la cagnotte Daret</td></tr>
<tr><td>Chance</td><td><span class="k">مكتوب</span> Mektoub</td><td>Cartes du destin</td></tr>
<tr><td>Caisse de communauté</td><td><span class="k">بركة</span> Baraka</td><td>Cartes de famille et de bénédiction</td></tr>
<tr><td>Enchères</td><td><span class="k">الدلالة</span> Dlala</td><td>On enchérit à tour de rôle, le dernier achète</td></tr>
<tr><td>Maison · Hôtel</td><td><span class="k">دار · رياض</span></td><td>Quatre dars, puis un riad</td></tr>
<tr><td>Hypothèque</td><td><span class="k">رهن</span> Rahn</td><td>La moitié du prix, levée pour 55 %</td></tr>
<tr><td>Échange</td><td><span class="k">تبادل</span> Tbadel</td><td>Propriétés et argent</td></tr></table></div>
<h3>Jouer en ligne</h3><ul><li>La partie tourne sur le serveur Moropoly. Chacun peut fermer la page et revenir à la table avec le lien d’invitation ou depuis l’accueil.</li><li>Si un joueur décroche, l’hôte peut laisser l’ordinateur jouer pour lui depuis l’onglet Joueurs.</li></ul></div>`,
`<div class="book"><h3>كيف يجري الدور</h3><p>ارمِ النرد وتقدّم، ثم اشترِ الخانة التي وصلتها أو أرسلها إلى الدلالة. ادفع الكراء في عقارات الآخرين. امتلك مدينة كاملة لتبني دورًا ثم رياضًا. الدوبل يمنحك رمية أخرى، وثلاثة دوبلات ترسلك إلى عكاشة.</p>
<h3>القواعد المغربية</h3><div class="tw"><table><tr><th>الأصل</th><th>موروبولي</th><th>ماذا تفعل</th></tr>
<tr><td>البداية</td><td><span class="k">الانطلاق</span></td><td>احصل على 2,000 درهم في كل مرور</td></tr>
<tr><td>السجن</td><td><span class="k">عكاشة</span></td><td>دوبل، أو 500 درهم، أو بطاقة خروج</td></tr>
<tr><td>موقف مجاني</td><td><span class="k">القهوة</span></td><td>خذ صندوق الدارت</td></tr>
<tr><td>الحظ</td><td><span class="k">مكتوب</span></td><td>بطاقات القدر</td></tr>
<tr><td>صندوق الجماعة</td><td><span class="k">بركة</span></td><td>بطاقات العائلة والخير</td></tr>
<tr><td>المزاد</td><td><span class="k">الدلالة</span></td><td>مزايدة بالدور، وآخر من يبقى يشتري</td></tr>
<tr><td>بيت · فندق</td><td><span class="k">دار · رياض</span></td><td>أربع دور ثم رياض</td></tr>
<tr><td>الرهن</td><td><span class="k">رهن</span></td><td>نصف الثمن، ويُفكّ بـ 55%</td></tr>
<tr><td>التبادل</td><td><span class="k">تبادل</span></td><td>عقارات ونقود</td></tr></table></div>
<h3>اللعب عبر الإنترنت</h3><ul><li>اللعبة تجري على خادم موروبولي. يمكن لأي لاعب أن يغلق الصفحة ويعود إلى الطاولة برابط الدعوة أو من الصفحة الرئيسية.</li><li>إذا انقطع لاعب، يمكن للمضيف أن يترك الحاسوب يلعب مكانه من تبويب اللاعبين.</li></ul></div>`);
S('store.full','The game store is full. Finish an old game first.','Le stockage des parties est plein. Terminez d’abord une ancienne partie.','مخزن الألعاب ممتلئ. أنهِ لعبة قديمة أولًا.');
S('store.retry','Could not save the game online. Retrying on the next move.','Impossible d’enregistrer la partie en ligne. Nouvel essai au prochain coup.','تعذّر حفظ اللعبة على الإنترنت. ستُعاد المحاولة في الحركة التالية.');
S('lbl.player','Player','Joueur','لاعب');
S('log.joinsMid','{p} joins the game and starts at Al Inṭilāq.','{p} rejoint la partie et commence à Al Inṭilāq.','{p} ينضم إلى اللعبة ويبدأ من الانطلاق.');
S('pin.title','This table has a code','Cette table a un code','لهذه الطاولة رمز');
S('pin.help','Ask the host for the code, then type it here.','Demandez le code à l’hôte, puis saisissez-le ici.','اطلب الرمز من المضيف ثم اكتبه هنا.');
S('pin.ph','Table code','Code de la table','رمز الطاولة');
S('pin.join','Join the table','Rejoindre la table','انضم إلى الطاولة');
S('pin.wrong','That code is not right. Try again.','Ce code n’est pas bon. Réessayez.','الرمز غير صحيح. حاول مجددًا.');
S('pin.checking','Checking the code…','Vérification du code…','جارٍ التحقق من الرمز…');
S('pin.set','Table code (optional)','Code de la table (facultatif)','رمز الطاولة (اختياري)');
S('pin.setHelp','Players who open the link must type this code to join.','Les joueurs qui ouvrent le lien devront saisir ce code pour rejoindre.','من يفتح الرابط يجب أن يكتب هذا الرمز للانضمام.');
S('pin.save','Set code','Définir le code','عيّن الرمز'); S('pin.remove','Remove code','Supprimer le code','أزل الرمز');
S('pin.on','Code: {c}','Code : {c}','الرمز: {c}'); S('pin.onOther','This table has a code.','Cette table a un code.','لهذه الطاولة رمز.');
S('pin.off','No code: anyone with the link can join.','Pas de code : toute personne qui a le lien peut rejoindre.','بدون رمز: كل من لديه الرابط يمكنه الانضمام.');
S('pin.bad','Use 4 to 6 digits.','Utilisez 4 à 6 chiffres.','استعمل من 4 إلى 6 أرقام.');
S('seat.joinedMid','You’re in! You start at Al Inṭilāq with {a} and play when your turn comes.','Vous êtes dans la partie ! Vous commencez à Al Inṭilāq avec {a} et jouez quand votre tour arrive.','أنت في اللعبة! تبدأ من الانطلاق ومعك {a} وتلعب عندما يحين دورك.');
S('seat.help','Pick your token and the name shown on the board.','Choisissez votre pion et le nom affiché sur le plateau.','اختر قطعتك والاسم الذي يظهر على اللوحة.');
S('btn.mySeat','My seat','Ma place','مقعدي'); S('btn.save','Save','Enregistrer','احفظ'); S('btn.done','Done','Terminé','تم');
S('lb.full','The table is full (8 players). You can watch the game.','La table est complète (8 joueurs). Vous pouvez regarder la partie.','الطاولة ممتلئة (8 لاعبين). يمكنك مشاهدة اللعبة.');
S('lb.joining','Taking your seat…','Installation à la table…','جارٍ إجلاسك…');
S('lb.autoNote','You are at the table. Pick your token and change your name if you like.','Vous êtes à la table. Choisissez votre pion et changez votre nom si vous voulez.','أنت على الطاولة. اختر قطعتك وغيّر اسمك إن أردت.');
S('lb.lateJoin',' Friends can still join with the link after the game starts.',' Vos amis peuvent rejoindre avec le lien même après le début de la partie.',' يمكن لأصدقائك الانضمام بالرابط حتى بعد بدء اللعبة.');
S('watching','You are watching. The table is full.','Vous regardez : la table est complète.','أنت تشاهد. الطاولة ممتلئة.');
