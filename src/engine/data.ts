/* ============================================================
   DATA: the board, the colour groups and the tokens
   ============================================================ */
import type {Group, GroupId, Space, Token} from './types';

const pad2=(n: number)=>String(n).padStart(2,'0');
const ART=(i: number)=>`assets/card-${pad2(i)}.webp`;
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
 {t:'util',name:'ONEE',ar:'الكهرباء والماء',price:1500,kind:'Electricity and water',glyph:'⚡'},
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
 {t:'util',name:'Maroc Telecom',ar:'اتصالات المغرب',price:1500,kind:'Telecoms',glyph:'📡'},
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
SP.forEach((s,i)=>{if(s.t==='prop') s.art=ART(i);}); SP[30].art=ART(30); SP[10].art=ART(30);
export const RAILS=[5,15,25,35], UTILS=[12,28], RAIL_RENT=[250,500,1000,2000];
export const SALARY=2000, JAIL_FINE=500, START_CASH=15000;
export const TOKENS: Token[]=['Red petit taxi','Blue petit taxi','Al Boraq','Camel','Koutoubia','Berrad teapot','Ferry','Post scooter','Courier scooter','Fishing boat'].map((n,k)=>({name:n,img:`assets/tok-${k}.webp`,g:['🚕','🚙','🚄','🐪','🕌','🫖','⛴️','🛵','📦','🚤'][k]}));
export const COLORS=['#e5484d','#3e9be0','#c9cfd8','#e3b34a','#17a862','#9b7bf0','#f07fb0','#2fc2c2'];
export const BOT_NAMES=['Salma','Youssef','Imane','Karim','Nadia','Omar','Zineb','Mehdi','Hiba','Anas'];
