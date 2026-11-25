/* ============================================================
   DATA: the board, the colour groups and the tokens
   ============================================================ */
import type {BoardId, Game, Group, GroupId, Space, Token} from './types';

const pad2=(n: number)=>String(n).padStart(2,'0');
const ART=(id: string)=>`assets/card-${id}.webp`;
/** the colour band of the squares that are not properties, as on their cards */
/** the band on squares that are not streets. Utilities, Mektoub, Baraka and the taxes get patterns, not solid colours,
    so they cannot be taken for a city: a fine grid on slate for the utilities, small gold dots on charcoal for the card
    squares, a cream and stone hatch for taxes */
export const BAND: Record<string, string>={rail:'#3d434c',
  util:'repeating-linear-gradient(0deg,rgba(255,255,255,.4) 0 1px,transparent 1px 5px),repeating-linear-gradient(90deg,rgba(255,255,255,.4) 0 1px,transparent 1px 5px),#3f5b68',
  tax:'repeating-linear-gradient(135deg,#efe4cb 0 4px,#b9a77f 4px 7px)',
  mektoub:'radial-gradient(circle,#e3b34a 0 22%,transparent 26%) 0 0/7px 7px,#23252b',
  baraka:'radial-gradient(circle,#e3b34a 0 22%,transparent 26%) 0 0/7px 7px,#23252b'};
export const GROUPS: Record<GroupId, Group>={
  brown :{city:'Salé',ar:'سلا',color:'#8B4513',house:500},
  lblue :{city:'Chefchaouen',ar:'شفشاون',color:'#7cc8ee',house:500},
  pink  :{city:'Fès',ar:'فاس',color:'#e48aab',house:1000},
  orange:{city:'Agadir',ar:'أكادير',color:'#f28c1b',house:1000},
  red   :{city:'Tangier',ar:'طنجة',color:'#d9302a',house:1500},
  yellow:{city:'Rabat',ar:'الرباط',color:'#f2c400',house:1500},
  green :{city:'Marrakech',ar:'مراكش',color:'#00873f',house:2000},
  dblue :{city:'Casablanca',ar:'الدار البيضاء',color:'#1f3a93',house:2000}
};
const R=(...a: number[])=>a.map(x=>x*10);
export const SP: Space[]=[
 {t:'go',name:'Al Inṭilāq',ar:'الانطلاق'},
 {t:'prop',g:'brown',name:'Sidi Moussa',ar:'سيدي موسى',price:400,rent:R(2,10,30,90,160,250),note:'Historic neighbour of Rabat, looking over the Bouregreg.'},
 {t:'baraka',name:'Baraka',ar:'بركة'},
 {t:'prop',g:'brown',name:'Tabriket',ar:'تابريكت',price:450,rent:R(4,20,60,180,320,450),note:'Quiet residential streets and market stalls.'},
 {t:'tax',name:'Impôts',ar:'الضرائب',amount:2000,why:'incomeTax'},
 {t:'rail',name:'Tanger TGV',ar:'محطة طنجة',price:2000},
 {t:'prop',g:'lblue',name:'Blue Medina',ar:'المدينة الزرقاء',price:600,rent:R(6,30,90,270,400,550),note:'Iconic blue alleys of the Rif.'},
 {t:'mektoub',name:'Mektoub',ar:'مكتوب'},
 {t:'prop',g:'lblue',name:'Kasbah',ar:'قصبة شفشاون',price:600,rent:R(6,30,90,270,400,550),note:'Historic fortress at the heart of the medina.'},
 {t:'prop',g:'lblue',name:'Ras El Maa',ar:'رأس الماء',price:650,rent:R(8,40,100,300,450,600),note:'The spring and waterfall above the town.'},
 {t:'jail',name:'3okacha',ar:'عكاشة'},
 {t:'prop',g:'pink',name:'Fès El Bali',ar:'فاس البالي',price:1000,rent:R(10,50,150,450,625,750),note:'The ancient medina, a maze of souks.'},
 {t:'util',name:'Daw w Lma',ar:'الضو والما',price:1500,kind:'Electricity and water',glyph:'⚡'},
 {t:'prop',g:'pink',name:'Al Qarawiyyin',ar:'القرويين',price:1100,rent:R(10,50,150,450,625,750),note:'The oldest continuously operating university in the world.'},
 {t:'prop',g:'pink',name:'Chouara Tannery',ar:'مدابغ شوارة',price:1200,rent:R(12,60,180,500,700,900),note:'Leather dyeing pits seen from the terraces.'},
 {t:'rail',name:'Rabat Ville',ar:'محطة الرباط المدينة',price:2000},
 {t:'prop',g:'orange',name:'Souk El Had',ar:'سوق الأحد',price:1400,rent:R(14,70,200,550,750,950),note:'The city’s biggest market.'},
 {t:'baraka',name:'Baraka',ar:'بركة'},
 {t:'prop',g:'orange',name:'Talborjt',ar:'تالبورجت',price:1500,rent:R(14,70,200,550,750,950),note:'Central district of cafés and palm avenues.'},
 {t:'prop',g:'orange',name:'Agadir Oufella',ar:'أكادير أوفلا',price:1600,rent:R(16,80,220,600,800,1000),note:'Hilltop kasbah over the bay.'},
 {t:'parking',name:'Qahwa',ar:'القهوة'},
 {t:'prop',g:'red',name:'Marshan',ar:'مرشان',price:1800,rent:R(18,90,250,700,875,1050),note:'Historic quarter of villas above the strait.'},
 {t:'mektoub',name:'Mektoub',ar:'مكتوب'},
 {t:'prop',g:'red',name:'Malabata',ar:'ملاباطا',price:1900,rent:R(18,90,250,700,875,1050),note:'Modern seafront on Tangier Bay.'},
 {t:'prop',g:'red',name:'Iberia',ar:'إيبيريا',price:2000,rent:R(20,100,300,750,925,1100),note:'Elegant tree-lined residential avenues.'},
 {t:'rail',name:'Casa Oasis',ar:'محطة الواحة',price:2000},
 {t:'prop',g:'yellow',name:'Hassan Tower',ar:'برج الحسن',price:2200,rent:R(22,110,330,800,975,1150),note:'The unfinished minaret and its esplanade.'},
 {t:'prop',g:'yellow',name:'Agdal',ar:'أكدال',price:2300,rent:R(22,110,330,800,975,1150),note:'Cafés, tramline and greenery.'},
 {t:'util',name:'Maroc Tilikom',ar:'ماروك تيليكوم',price:1500,kind:'Telecoms',glyph:'📡'},
 {t:'prop',g:'yellow',name:'Hay Riad',ar:'حي الرياض',price:2400,rent:R(24,120,360,850,1025,1200),note:'Ministries, embassies and palm avenues.'},
 {t:'gojail',name:'Go to 3okacha',ar:'سير لعكاشة'},
 {t:'prop',g:'green',name:'Koutoubia',ar:'الكتبية',price:2600,rent:R(26,130,390,900,1100,1275),note:'The minaret and gardens at sunset.'},
 {t:'prop',g:'green',name:'Jemaa el-Fna',ar:'جامع الفنا',price:2800,rent:R(26,130,390,900,1100,1275),note:'The square at night: lanterns, musicians, crowds.'},
 {t:'baraka',name:'Baraka',ar:'بركة'},
 {t:'prop',g:'green',name:'Gueliz',ar:'كليز',price:3000,rent:R(28,150,450,1000,1200,1400),note:'Palm boulevards, art deco cafés and shops.'},
 {t:'rail',name:'Marrakech Gare',ar:'محطة مراكش',price:2000},
 {t:'mektoub',name:'Mektoub',ar:'مكتوب'},
 {t:'prop',g:'dblue',name:'Maarif',ar:'المعاريف',price:3800,rent:R(35,175,500,1100,1300,1500),note:'The Twin Center and the business district.'},
 {t:'tax',name:"L'3ers",ar:'العرس',amount:1000,why:'wedding'},
 {t:'prop',g:'dblue',name:'Ain Diab',ar:'عين الذياب',price:4000,rent:R(50,200,600,1400,1700,2000),note:'The corniche at sunset.'}
];
/* every square that is a card has its picture: the properties, stations, utilities and taxes their own card, the
   Mektoub and Baraka squares the card of their deck (scripts/cards/cards.html) */
function hydrate(spaces: Space[]): Space[]{
  spaces.forEach((s,i)=>{
    if(!s.id) s.id=s.t==='mektoub'||s.t==='baraka'?s.t:['go','jail','parking','gojail'].includes(s.t)?s.t:pad2(i);
    if(['prop','rail','util','tax','mektoub','baraka'].includes(s.t)){
      const id=s.t==='mektoub'||s.t==='baraka'?s.t:s.id;
      s.art=ART(id); s.tile=`assets/art-${id}.webp`; s.tileSet=`assets/art-${id}-112.webp 112w, ${s.tile} 224w`;
    } else if(s.t==='jail'||s.t==='gojail') s.art=ART('30');
  });
  return spaces;
}
hydrate(SP);

const cloneClassic=(i: number): Space=>({...SP[i]});
/** the 52-square Grand Map: +1 street in each of the 8 cities, a 3rd utility (Mazot w Gaz), a 3rd tax (Péage),
    plus 1 extra Mektoub and 1 extra Baraka so every side has 12 squares and both card decks. */
export const SP_GRAND: Space[]=hydrate([
  // Side 0 — Bottom (0..12)
  cloneClassic(0),
  cloneClassic(1),
  cloneClassic(2),
  cloneClassic(3),
  {t:'prop',id:'marina',g:'brown',name:'Marina Bouregreg',ar:'مارينا أبي رقراق',price:500,rent:R(5,25,75,225,360,500),note:'Modern waterfront promenade, yachts and cafés facing Rabat.'},
  cloneClassic(4),
  cloneClassic(5),
  cloneClassic(6),
  cloneClassic(7),
  cloneClassic(8),
  cloneClassic(9),
  {t:'tax',id:'peage',name:'Péage',ar:'الطريق السيار',amount:1500,why:'peage'},
  {t:'prop',id:'outa',g:'lblue',name:'Outa El Hammam',ar:'وطاء الحمام',price:700,rent:R(8,40,105,320,475,650),note:'Chefchaouen’s lively cobbled square beneath the Kasbah.'},
  // Side 1 — Left (13..25)
  cloneClassic(10),
  cloneClassic(11),
  cloneClassic(12),
  cloneClassic(13),
  cloneClassic(14),
  {t:'prop',id:'boujeloud',g:'pink',name:'Bab Bou Jeloud',ar:'باب بوجلود',price:1300,rent:R(12,60,180,500,725,925),note:'The iconic Blue Gate opening onto Fès’s medina.'},
  cloneClassic(15),
  cloneClassic(16),
  cloneClassic(17),
  cloneClassic(18),
  cloneClassic(19),
  {t:'mektoub',name:'Mektoub',ar:'مكتوب'},
  {t:'prop',id:'taghazout',g:'orange',name:'Taghazout',ar:'تغازوت',price:1700,rent:R(16,80,230,625,825,1025),note:'Surf village of white terraces and Atlantic waves.'},
  // Side 2 — Top (26..38)
  cloneClassic(20),
  cloneClassic(21),
  cloneClassic(22),
  cloneClassic(23),
  cloneClassic(24),
  {t:'prop',id:'spartel',g:'red',name:'Cap Spartel',ar:'رأس سبارتيل',price:2100,rent:R(20,100,310,775,950,1125),note:'The lighthouse where the Atlantic meets the Strait of Gibraltar.'},
  cloneClassic(25),
  cloneClassic(26),
  cloneClassic(27),
  cloneClassic(28),
  cloneClassic(29),
  {t:'baraka',name:'Baraka',ar:'بركة'},
  {t:'prop',id:'oudayas',g:'yellow',name:'Kasbah des Oudayas',ar:'قصبة الأوداية',price:2500,rent:R(24,120,370,875,1050,1225),note:'Blue-and-white fortress alleys overlooking the ocean.'},
  // Side 3 — Right (39..51)
  cloneClassic(30),
  cloneClassic(31),
  cloneClassic(32),
  cloneClassic(33),
  cloneClassic(34),
  {t:'prop',id:'majorelle',g:'green',name:'Jardin Majorelle',ar:'حديقة ماجوريل',price:3200,rent:R(30,160,475,1050,1250,1450),note:'Cobalt-blue villa, cacti and tranquil pools in Marrakech.'},
  cloneClassic(35),
  cloneClassic(36),
  {t:'prop',id:'anfa',g:'dblue',name:'Anfa',ar:'أنفا',price:3600,rent:R(32,165,480,1075,1275,1475),note:'Palm-lined avenues and modernist coastal villas.'},
  {t:'util',id:'fuel',name:'Mazot w Gaz',ar:'المازوط والغاز',price:1500,kind:'Fuel and gas',glyph:'⛽'},
  cloneClassic(37),
  cloneClassic(38),
  cloneClassic(39),
]);

export interface BoardDef {
  id: BoardId;
  spaces: Space[];
  size: number;
  side: number;
  rails: number[];
  utils: number[];
  jail: number;
  parking: number;
  gojail: number;
}
function makeBoard(id: BoardId, spaces: Space[]): BoardDef {
  const size = spaces.length, side = size / 4;
  return {
    id, spaces, size, side,
    rails: spaces.map((s, i) => s.t === 'rail' ? i : -1).filter(i => i >= 0),
    utils: spaces.map((s, i) => s.t === 'util' ? i : -1).filter(i => i >= 0),
    jail: spaces.findIndex(s => s.t === 'jail'),
    parking: spaces.findIndex(s => s.t === 'parking'),
    gojail: spaces.findIndex(s => s.t === 'gojail'),
  };
}
export const CLASSIC_BOARD = makeBoard('classic', SP);
export const GRAND_BOARD = makeBoard('grand', SP_GRAND);
export const boardOf = (G?: Pick<Game, 'settings'> | {settings?: {board?: BoardId}} | null): BoardDef =>
  G && typeof G === 'object' && G.settings?.board === 'grand' ? GRAND_BOARD : CLASSIC_BOARD;
export const spacesOf = (G?: Pick<Game, 'settings'> | {settings?: {board?: BoardId}} | null): Space[] => boardOf(G).spaces;

export const RAILS=CLASSIC_BOARD.rails, UTILS=CLASSIC_BOARD.utils, RAIL_RENT=[250,500,1000,2000];
export const SALARY=2000, JAIL_FINE=500, START_CASH=15000;
/** house rule "credit": borrow in steps of LOAN_STEP up to LOAN_MAX; LOAN_RATE of what is owed is charged at each pass of Al Inṭilāq */
export const LOAN_MAX=5000, LOAN_STEP=500, LOAN_RATE=0.1;
/** house rule "bills": what a player pays each utility's owner at Al Inṭilāq, per dar and per riad they have built */
export const BILL_DAR=250, BILL_RIAD=1000;
/** house rule "train": a station's rent goes up by this share of the rents of the dars and riads on its side of the
    board, whoever owns them: busy streets bring travellers, and dearer streets more of them */
export const RAIL_SIDE=0.1;
/** house rule "shufa": the price of a forced purchase, as a multiple of the property's price */
export const SHUFA_MARKUP=1.5;
/** house rule "shufa": the first round it can be used in. Before then everyone's worth is within a rent or two of
    everyone else's, so "furthest behind" would only mean "paid the last rent". */
export const SHUFA_FROM=6;
/** house rule "chrika": share of combined street + building value paid by the bank on a Clean Exit or L'Ghedr */
export const CHRIKA_PAYOUT=0.8;
/** house rule "fairStart": the extra starting money for each seat after the first, by number of players
    (found by simulating thousands of games, so that every seat wins about equally often) */
export const FAIR_STEP: Record<number, number>={2:300,3:300,4:300,5:350,6:400,7:400,8:450};
/** the choices the house rules offer for the starting money, the Al Inṭilāq salary and the 3okacha fine */
export const CASH_CHOICES=[10000,15000,20000,30000], SALARY_CHOICES=[1000,2000,3000,4000], FINE_CHOICES=[250,500,1000];
export const RIAD_PREMIUM=0.5; // the extra share paid for building a riad in one go ("Riad now"), on top of the missing dars
export const TOKENS: Token[]=['Red petit taxi','Blue petit taxi','Al Boraq','Camel','Koutoubia','Berrad teapot','Ferry','Post scooter','Courier scooter','Fishing boat','Hassan Tower'].map((n,k)=>({name:n,img:`assets/tok-${k}.webp`,set:`assets/tok-${k}-96.webp 96w, assets/tok-${k}-192.webp 192w, assets/tok-${k}.webp 288w`,piece:`assets/piece-${k}.webp`,pieceSet:[80,112,160,224].map(w=>`assets/piece-${k}-${w}.webp ${w}w`).join(', ')+`, assets/piece-${k}.webp 320w`,g:['🚕','🚙','🚄','🐪','🕌','🫖','⛴️','🛵','📦','🚤','🗼'][k]}));
export const COLORS=['#e5484d','#3e9be0','#c9cfd8','#e3b34a','#17a862','#9b7bf0','#f07fb0','#2fc2c2'];
export const BOT_NAMES=['Salma','Youssef','Imane','Karim','Nadia','Omar','Zineb','Mehdi','Hiba','Anas'];
