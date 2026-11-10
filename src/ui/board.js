// Measuring the board, placing the pawns and turning the dice. The board itself is React (src/react/Board.tsx).
import {app, noBoardFx} from '../app/state';
import {refresh} from '../react/store';
import {$} from './dom';

/* ---------- board ---------- */
/** draws the board for the current game (also after a language change) and puts the dice back */
export function buildBoard(){
  app.boardFx=noBoardFx(); refresh();
  setDice(app.V.dice||[3,4],false);
}
const DIE_ROT={1:[0,0],2:[0,-90],3:[-90,0],4:[90,0],5:[0,90],6:[0,180]};
const spins=[0,0];
export function setDice(d,anim){
  d.forEach((v,k)=>{const el=$('d'+k); if(!el) return; if(anim) spins[k]+=2+Math.floor(Math.random()*2); const [x,y]=DIE_ROT[v]; el.style.transform=`rotateX(${x+spins[k]*360}deg) rotateY(${y+spins[k]*360+(k?360:0)}deg)`;});
  if(anim){const di=$('dice'); di.classList.remove('jump'); void di.offsetWidth; di.classList.add('jump');}
}
export function cellBox(i){const c=$('c'+i); if(!c) return {x:0,y:0,w:0,h:0}; return {x:c.offsetLeft+c.offsetWidth/2,y:c.offsetTop+c.offsetHeight/2,w:c.offsetWidth,h:c.offsetHeight};}
export function pawnSize(){const b=$('board'); if(!b) return 30; const w=b.offsetWidth; return w*(w<480?0.06:0.047);}
export function syncDpos(){app.dpos={}; if(app.V&&app.V.players) app.V.players.forEach(p=>app.dpos[p.id]=p.pos);}
export function slotXY(pid,pos){
  const here=app.V.players.filter(p=>!p.bankrupt&&app.dpos[p.id]===pos).map(p=>p.id);
  const k=Math.max(0,here.indexOf(pid)), n=Math.max(1,here.length), b=cellBox(pos), s=pawnSize();
  const cols=n<=2?n:n<=4?2:n<=6?3:4, rows=Math.ceil(n/cols);
  const gap=s*0.62;
  return {x:b.x+((k%cols)-(cols-1)/2)*gap-s/2, y:b.y+(Math.floor(k/cols)-(rows-1)/2)*gap-s/2};
}
/** puts every pawn on its square (the pawns themselves are drawn by React, src/react/Board.tsx) */
export function layoutPawns(){
  const layer=$('pawns'); if(!layer||!app.V||!app.V.players) return;
  const s=pawnSize(); layer.style.setProperty('--ps',s+'px');
  app.V.players.forEach(p=>{
    const el=$('pw'+p.id); if(!el||p.bankrupt) return;
    const {x,y}=slotXY(p.id,app.dpos[p.id]); el.style.transform=`translate(${x}px,${y}px)`;
  });
}
addEventListener('resize',()=>{clearTimeout(window.__rz); window.__rz=setTimeout(()=>{if(app.V&&app.V.status==='play') layoutPawns();},120);});
