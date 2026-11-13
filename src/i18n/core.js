// Languages: the string table, t(), and the names of squares, tokens and cards in English, French and Arabic.
import {app} from '../app/state';
import {BARAKA, MEKTOUB} from '../engine/cards';
import {GROUPS, SP, TOKENS} from '../engine/data';

/* ============================================================
   LANGUAGES: English, Français, العربية
   ============================================================ */
export const LANGS=[['en','EN','English'],['fr','FR','Français'],['ar','ع','العربية']];

const STR={en:{},fr:{},ar:{}};
export function S(k,en,fr,ar){STR.en[k]=en; STR.fr[k]=fr; STR.ar[k]=ar;}
export function t(k,p){
  let s=STR[app.LANG][k]; if(s==null) s=STR.en[k]; if(s==null) return k;
  if(typeof s==='function') return s(p||{});
  return p?String(s).replace(/\{(\w+)\}/g,(m,x)=>p[x]!=null?p[x]:''):s;
}
export const num=n=>app.LANG==='fr'?Math.round(n).toLocaleString('fr-FR'):Math.round(n).toLocaleString('en-US');
export const fmt=n=>(n<0?'−':'')+num(Math.abs(n))+(app.LANG==='ar'?' درهم':' DH');
/* names */
const SP_FR={6:'Médina bleue',14:'Tannerie Chouara',26:'Tour Hassan',30:'Allez à 3okacha',35:'Gare de Marrakech',39:'Aïn Diab'};
const CITY_FR={red:'Tanger'};
export const spN=i=>{const s=SP[i]; if(!s) return ''; if(app.LANG==='ar') return s.ar; if(app.LANG==='fr'&&SP_FR[i]) return SP_FR[i]; return s.name;};
export const cityN=g=>app.LANG==='ar'?GROUPS[g].ar:(app.LANG==='fr'&&CITY_FR[g])||GROUPS[g].city;
const TOK_FR=['Petit taxi rouge','Petit taxi bleu','Al Boraq','Chameau','Koutoubia','Théière berrad','Ferry','Scooter de la poste','Scooter coursier','Barque de pêche','Tour Hassan'];
const TOK_AR=['طاكسي صغير أحمر','طاكسي صغير أزرق','البراق','جمل','الكتبية','برّاد الشاي','عبّارة','دراجة البريد','دراجة التوصيل','قارب صيد','صومعة حسان'];
export const tokN=k=>app.LANG==='fr'?TOK_FR[k]:app.LANG==='ar'?TOK_AR[k]:TOKENS[k].name;
const NOTE_FR={1:'Voisine historique de Rabat, face au Bouregreg.',3:'Rues résidentielles calmes et étals du marché.',6:'Les ruelles bleues emblématiques du Rif.',8:'Forteresse historique au cœur de la médina.',9:'La source et la cascade au-dessus de la ville.',11:'L’ancienne médina, un labyrinthe de souks.',13:'La plus ancienne université encore en activité au monde.',14:'Les cuves de teinture vues depuis les terrasses.',16:'Le plus grand marché de la ville.',18:'Quartier central de cafés et d’avenues de palmiers.',19:'La kasbah perchée au-dessus de la baie.',21:'Quartier historique de villas au-dessus du détroit.',23:'Front de mer moderne sur la baie de Tanger.',24:'Élégantes avenues résidentielles bordées d’arbres.',26:'Le minaret inachevé et son esplanade.',27:'Cafés, tramway et verdure.',29:'Ministères, ambassades et avenues de palmiers.',31:'Le minaret et ses jardins au coucher du soleil.',32:'La place la nuit : lanternes, musiciens, foule.',34:'Boulevards de palmiers, cafés art déco et boutiques.',37:'Le Twin Center et le quartier des affaires.',39:'La corniche au coucher du soleil.',12:'Électricité et eau',28:'Télécommunications'};
const NOTE_AR={1:'الجارة التاريخية للرباط، مطلّة على أبي رقراق.',3:'أزقة سكنية هادئة وطاولات السوق.',6:'الأزقة الزرقاء الشهيرة في الريف.',8:'قلعة تاريخية في قلب المدينة القديمة.',9:'العين والشلال فوق المدينة.',11:'المدينة العتيقة، متاهة من الأسواق.',13:'أقدم جامعة ما زالت تعمل في العالم.',14:'أحواض الصباغة كما تُرى من السطوح.',16:'أكبر سوق في المدينة.',18:'حي مركزي بمقاهيه وشوارع النخيل.',19:'القصبة المطلّة على الخليج.',21:'حي تاريخي من الفيلات فوق المضيق.',23:'واجهة بحرية حديثة على خليج طنجة.',24:'شوارع سكنية أنيقة تحفّها الأشجار.',26:'الصومعة غير المكتملة وساحتها.',27:'مقاهٍ وترامواي ومساحات خضراء.',29:'وزارات وسفارات وشوارع نخيل.',31:'الصومعة وحدائقها عند الغروب.',32:'الساحة ليلًا: فوانيس وموسيقيون وجموع.',34:'شوارع النخيل ومقاهي الآرت ديكو والمتاجر.',37:'التوين سنتر وحي الأعمال.',39:'الكورنيش عند الغروب.',12:'الكهرباء والماء',28:'الاتصالات'};
export const noteN=i=>app.LANG==='fr'?NOTE_FR[i]:app.LANG==='ar'?NOTE_AR[i]:(SP[i].note||SP[i].kind||'');
const CARD_TX={
 mektoub:{
  fr:['Avancez jusqu’à Al Inṭilāq. Recevez 2 000 DH.','Grand taxi pour Marrakech. Avancez jusqu’à Jemaa el-Fna.','Week-end à Tanger. Avancez jusqu’à Marshan.','Prenez Al Boraq. Avancez jusqu’à la gare la plus proche et payez le double du loyer au propriétaire.','Prenez Al Boraq. Avancez jusqu’à la gare la plus proche et payez le double du loyer au propriétaire.','L’été sur la corniche. Avancez jusqu’à Aïn Diab.','Coupure de courant. Avancez jusqu’au service public le plus proche. S’il a un propriétaire, payez 100 × les dés.','Radar sur l’autoroute. Payez une amende de 300 DH.','Vous avez oublié votre CIN à la maison. Reculez de 3 cases.','Allez directement à 3okacha. Ne passez pas par Al Inṭilāq.','Votre cousin est avocat. Vous êtes libéré de 3okacha.','Vous avez revendu vos billets pour Mawazine. Recevez 500 DH.','Votre étal au souk a fait une belle saison. Recevez 1 500 DH.','La commune repeint la médina. Payez 250 DH par dar et 1 000 DH par riad.','Vous êtes élu président de l’association du quartier. Payez 200 DH à chaque joueur.','Un touriste a payé votre tapis au prix fort. Recevez 1 000 DH.','Akhannouch a encore augmenté le prix du carburant ! Payez 2 100 DH.','Parking du Morocco Mall. Payez 100 DH.','La fibre de Maroc Tilikom est encore en panne… Payez 500 DH de réparation.','Le moqaddem vous a surpris en travaux sans autorisation. 1 000 DH de pot-de-vin ou 2 000 DH d’amende. Vous payez les 1 000 DH.'],
  ar:['تقدّم إلى الانطلاق. احصل على 2,000 درهم.','طاكسي كبير إلى مراكش. تقدّم إلى جامع الفنا.','عطلة نهاية الأسبوع في طنجة. تقدّم إلى مرشان.','اركب البراق. تقدّم إلى أقرب محطة وادفع للمالك ضعف الكراء.','اركب البراق. تقدّم إلى أقرب محطة وادفع للمالك ضعف الكراء.','الصيف على الكورنيش. تقدّم إلى عين الذياب.','انقطع الضوء. تقدّم إلى أقرب مرفق. إن كان له مالك، ادفع 100 × مجموع النرد.','رادار في الطريق السيار. ادفع غرامة 300 درهم.','نسيت البطاقة الوطنية في الدار. ارجع 3 خانات.','اذهب مباشرة إلى عكاشة. لا تمرّ بالانطلاق.','ابن عمك محامٍ. اخرج من عكاشة مجانًا.','بعت تذاكر موازين. احصل على 500 درهم.','حانوتك في السوق عرف موسمًا ممتازًا. احصل على 1,500 درهم.','الجماعة تعيد صباغة المدينة القديمة. ادفع 250 درهمًا عن كل دار و1,000 درهم عن كل رياض.','انتُخبت رئيسًا لجمعية الحي. ادفع 200 درهم لكل لاعب.','سائح اشترى زربيتك بثمنها الكامل. احصل على 1,000 درهم.','أخنوش رفع أسعار المحروقات مرة أخرى! ادفع 2,100 درهم.','موقف السيارات في موروكو مول. ادفع 100 درهم.','ألياف ماروك تيليكوم معطّلة مرة أخرى… ادفع 500 درهم للإصلاح.','المقدّم ضبطك تُصلح بيتك بلا رخصة. 1,000 درهم رشوة أو 2,000 درهم غرامة. تدفع 1,000 درهم.']},
 baraka:{
  fr:['La baraka de votre grand-mère. Recevez 2 000 DH.','Votre cousin à l’étranger envoie de l’argent. Recevez 1 000 DH.','Aïd al-Adha. Achetez le mouton. Payez 1 500 DH.','Soirée du henné pour votre sœur. Payez 500 DH.','C’est votre anniversaire. Chaque joueur vous donne 100 DH.','Votre coopérative d’argan a vendu sa récolte. Recevez 1 000 DH.','Hammam et gommage. Payez 100 DH.','Frais de médecin. Payez 500 DH.','Erreur de la banque en votre faveur. Recevez 2 000 DH.','Votre oncle connaît le juge. Vous êtes libéré de 3okacha.','Allez directement à 3okacha. Ne passez pas par Al Inṭilāq.','Avancez jusqu’à Al Inṭilāq. Recevez 2 000 DH.','Ftour pour toute la famille. Payez 400 DH.','Couscous du vendredi chez vous. Chaque joueur apporte 150 DH.','Remboursement d’impôts. Recevez 200 DH.','Réparation du toit après la pluie. Payez 400 DH par dar et 1 150 DH par riad.'],
  ar:['بركة جدّتك. احصل على 2,000 درهم.','ابن عمك في الخارج أرسل حوالة. احصل على 1,000 درهم.','عيد الأضحى. اشترِ الحولي. ادفع 1,500 درهم.','ليلة الحناء لأختك. ادفع 500 درهم.','عيد ميلادك. كل لاعب يعطيك 100 درهم.','تعاونية الأركان باعت المحصول. احصل على 1,000 درهم.','حمّام وتكسال. ادفع 100 درهم.','مصاريف الطبيب. ادفع 500 درهم.','خطأ بنكي لصالحك. احصل على 2,000 درهم.','عمّك يعرف القاضي. اخرج من عكاشة مجانًا.','اذهب مباشرة إلى عكاشة. لا تمرّ بالانطلاق.','تقدّم إلى الانطلاق. احصل على 2,000 درهم.','فطور رمضان للعائلة كلها. ادفع 400 درهم.','كسكس الجمعة عندك. كل لاعب يجلب 150 درهمًا.','استرجاع الضريبة. احصل على 200 درهم.','إصلاح السطح بعد الأمطار. ادفع 400 درهم عن كل دار و1,150 درهمًا عن كل رياض.']}
};
export function cardText(deck,id,fallback){
  if(id==null) return fallback||'';
  if(app.LANG==='en') return ((deck==='mektoub'?MEKTOUB:BARAKA)[id]||{}).text||fallback||'';
  return (CARD_TX[deck][app.LANG]||[])[id]||fallback||'';
}
/* render a structured log entry [key, params] in the viewer's language */
export function tl(e){
  if(!e) return ''; if(typeof e==='string') return e;
  const [k,p0]=e; const p=Object.assign({},p0||{});
  if(p.a!=null) p.a=fmt(p.a);
  if(p.b!=null) p.b=fmt(p.b);
  if(p.s!=null) p.s=spN(p.s);
  if(p.to!=null) p.to=p.to==='@daret'?t('w.daret'):p.to==='@bank'?t('w.bank'):p.to;
  if(p.why!=null) p.why=t('why.'+p.why,{s:p.s,d:p.d,r:p.r});
  if(p.deck!=null) p.deckN=t('deck.'+p.deck);
  if(p.card!=null) p.card=cardText(p.card[0],p.card[1],p.cardEn);
  return t('log.'+k,p);
}
export const _t=(k,p)=>t(k,p);
