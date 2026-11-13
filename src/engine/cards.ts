/* ============================================================
   MEKTOUB and BARAKA cards
   ============================================================ */
import {RAILS, UTILS} from './data';
import {gain, jumpTo, land, moveTo, pay, payTax, repairs, sendToJail} from './engine';
import {alive, nextOf} from './util';
import type {Card} from './types';

export const MEKTOUB: Card[]=[
 {text:'Advance to Al Inṭilāq. Collect 2,000 DH.',act:(G,p)=>moveTo(G,p,0)},
 {text:'Grand taxi to Marrakech. Advance to Jemaa el-Fna.',act:(G,p)=>{moveTo(G,p,32);land(G,p);}},
 {text:'Weekend in Tangier. Advance to Marshan.',act:(G,p)=>{moveTo(G,p,21);land(G,p);}},
 {text:'Take Al Boraq. Advance to the nearest station and pay the owner double rent.',act:(G,p)=>{moveTo(G,p,nextOf(p.pos,RAILS));land(G,p,{railDouble:true});}},
 {text:'Take Al Boraq. Advance to the nearest station and pay the owner double rent.',act:(G,p)=>{moveTo(G,p,nextOf(p.pos,RAILS));land(G,p,{railDouble:true});}},
 {text:'Summer on the corniche. Advance to Ain Diab.',act:(G,p)=>{moveTo(G,p,39);land(G,p);}},
 {text:'The power is out. Advance to the nearest utility. If it is owned, pay 100 × the dice.',act:(G,p)=>{moveTo(G,p,nextOf(p.pos,UTILS));land(G,p,{util100:true});}},
 {text:'Radar on the autoroute. Pay a 300 DH fine.',act:(G,p)=>payTax(G,p,300,'speeding')},
 {text:'You left your CIN at home. Go back 3 spaces.',act:(G,p)=>{jumpTo(G,p,(p.pos+37)%40);land(G,p);}},
 {text:'Go directly to 3okacha. Do not pass Al Inṭilāq.',act:(G,p)=>sendToJail(G,p)},
 {text:'Your cousin is a lawyer. Get out of 3okacha free.',goojf:true},
 {text:'You resold your Mawazine tickets. Collect 500 DH.',act:(G,p)=>gain(G,p,500)},
 {text:'Your stall in the souk had a great season. Collect 1,500 DH.',act:(G,p)=>gain(G,p,1500)},
 {text:'The commune repaints the medina. Pay 250 DH per dar and 1,000 DH per riad.',act:(G,p)=>repairs(G,p,250,1000)},
 {text:'You were elected head of the neighbourhood association. Pay each player 200 DH.',act:(G,p)=>alive(G).filter(o=>o.id!==p.id).forEach(o=>pay(G,p,o.id,200,'assoc'))},
 {text:'A tourist paid full price for your carpet. Collect 1,000 DH.',act:(G,p)=>gain(G,p,1000)},
 {text:'Akhannouch raised the fuel prices again! Pay 2,100 DH.',act:(G,p)=>payTax(G,p,2100,'fuel')},
 {text:'Parking at Morocco Mall. Pay 100 DH.',act:(G,p)=>payTax(G,p,100,'parking')},
 {text:'Maroc Tilikom fibre is down again… Pay 500 DH for the repair.',act:(G,p)=>payTax(G,p,500,'fiber')},
 {text:'The mqaddem caught you renovating without a permit. Pay 1,000 DH in bribes or a 2,000 DH fine. You pay the 1,000 DH.',act:(G,p)=>payTax(G,p,1000,'mqaddem')}
];
export const BARAKA: Card[]=[
 {text:'Your grandmother’s baraka. Collect 2,000 DH.',act:(G,p)=>gain(G,p,2000)},
 {text:'Your cousin abroad sends money home. Collect 1,000 DH.',act:(G,p)=>gain(G,p,1000)},
 {text:'Eid al-Adha. Buy the sheep. Pay 1,500 DH.',act:(G,p)=>payTax(G,p,1500,'eid')},
 {text:'Henna night for your sister. Pay 500 DH.',act:(G,p)=>payTax(G,p,500,'henna')},
 {text:'It is your birthday. Every player gives you 100 DH.',act:(G,p)=>alive(G).filter(o=>o.id!==p.id).forEach(o=>pay(G,o,p.id,100,'birthday'))},
 {text:'Your argan cooperative sold its harvest. Collect 1,000 DH.',act:(G,p)=>gain(G,p,1000)},
 {text:'Hammam and gommage. Pay 100 DH.',act:(G,p)=>payTax(G,p,100,'hammam')},
 {text:'Doctor’s fees. Pay 500 DH.',act:(G,p)=>payTax(G,p,500,'doctor')},
 {text:'Bank error in your favour. Collect 2,000 DH.',act:(G,p)=>gain(G,p,2000)},
 {text:'Your uncle knows the judge. Get out of 3okacha free.',goojf:true},
 {text:'Go directly to 3okacha. Do not pass Al Inṭilāq.',act:(G,p)=>sendToJail(G,p)},
 {text:'Advance to Al Inṭilāq. Collect 2,000 DH.',act:(G,p)=>moveTo(G,p,0)},
 {text:'Ftour for the whole family. Pay 400 DH.',act:(G,p)=>payTax(G,p,400,'ftour')},
 {text:'Friday couscous at your place. Every player brings 150 DH.',act:(G,p)=>alive(G).filter(o=>o.id!==p.id).forEach(o=>pay(G,o,p.id,150,'couscous'))},
 {text:'Tax refund. Collect 200 DH.',act:(G,p)=>gain(G,p,200)},
 {text:'Roof repairs after the rains. Pay 400 DH per dar and 1,150 DH per riad.',act:(G,p)=>repairs(G,p,400,1150)}
];
