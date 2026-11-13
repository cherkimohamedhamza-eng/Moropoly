// Measuring the board, placing the pawns and turning the dice. The board itself is React (src/react/Board.tsx).
import {app, noBoardFx} from '../app/state';
import {refresh} from '../react/store';
import {showDice3d} from './dice3d';
import {$} from './dom';

/* ---------- board ---------- */
/** draws the board for the current game (also after a language change) and puts the dice back */
export function buildBoard(){
  app.boardFx=noBoardFx(); refresh();
  setDice(app.V.dice||[3,4],false);
}
/* The dice are 3D cubes seen from above at an angle (TILT). DIE_ROT turns a die so the rolled number faces the
   front; the view then lays that face on top and turns the die a little to one side (its yaw), a new angle on
   every roll. FACE_N are the directions the faces 1 to 6 point in, used to shade them for a light from the upper left. */
const DIE_ROT={1:[0,0],2:[0,-90],3:[-90,0],4:[90,0],5:[0,90],6:[0,180]};
const FACE_N=[[0,0,1],[1,0,0],[0,-1,0],[0,1,0],[-1,0,0],[0,0,-1]];
const TILT=-58, LIGHT=[-.36,-.62,.7];
const spins=[[0,0],[0,0]], yaws=[-22,22];
/** shows the dice `d`; with `anim` they tumble there, `speed` scaling how long it takes */
export function setDice(d,anim,speed=1){
  const di=$('dice'); if(!di) return;
  di.style.setProperty('--dt',(.9*speed).toFixed(2)+'s');
  d.forEach((v,k)=>{
    const el=$('d'+k), view=$('dv'+k); if(!el||!view) return;
    if(anim){spins[k][0]+=1+Math.floor(Math.random()*2); spins[k][1]+=2+Math.floor(Math.random()*2); yaws[k]=(k?1:-1)*(12+Math.random()*22);}
    const [x,y]=DIE_ROT[v];
    const turn=`rotateX(${x+spins[k][0]*360}deg) rotateY(${y+spins[k][1]*360}deg)`;
    const cam=`rotateX(${TILT}deg) rotateY(${yaws[k].toFixed(1)}deg) rotateX(90deg)`;
    view.style.transform=cam; el.style.transform=turn;
    const m=new DOMMatrix(cam+' '+turn);
    el.querySelectorAll('.face').forEach((f,j)=>{
      const n=m.transformPoint(new DOMPoint(FACE_N[j][0],FACE_N[j][1],FACE_N[j][2],0));
      const lit=Math.max(0,n.x*LIGHT[0]+n.y*LIGHT[1]+n.z*LIGHT[2]);
      f.style.setProperty('--sh',(.52*(1-lit)).toFixed(3));
    });
  });
  if(anim){di.classList.remove('jump'); void di.offsetWidth; di.classList.add('jump');}
  showDice3d(d,anim,speed);
}
export function cellBox(i){const c=$('c'+i); if(!c) return {x:0,y:0,w:0,h:0}; return {x:c.offsetLeft+c.offsetWidth/2,y:c.offsetTop+c.offsetHeight/2,w:c.offsetWidth,h:c.offsetHeight};}
export function pawnSize(){const b=$('board'); if(!b) return 30; const w=b.offsetWidth; return w*(w<480?0.06:0.047);}
export function syncDpos(){app.dpos={}; if(app.V&&app.V.players) app.V.players.forEach(p=>app.dpos[p.id]=p.pos);}
/* Where a pawn stands. Pieces are standing figures on a round base as wide as the pawn's box, so pieces sharing a
   square are set out in rows, side by side, and all shrunk by the same factor `k` until they fit the square. Of the
   possible arrangements the one that keeps them biggest wins. `row` orders the drawing: back rows first. */
export function slotXY(pid,pos){
  const here=app.V.players.filter(p=>!p.bankrupt&&app.dpos[p.id]===pos).map(p=>p.id);
  const i=Math.max(0,here.indexOf(pid)), n=Math.max(1,here.length), b=cellBox(pos), s=pawnSize();
  const ACROSS=1.04, DOWN=.95;                     // room a piece takes, in base widths: beside its neighbour, and behind it
  let cols=1, rows=1, k=0;
  for(let c=n;c>=1;c--){const r=Math.ceil(n/c), fit=Math.min(1,b.w*.96/(c*s*ACROSS),b.h*.82/((r-1)*s*DOWN+s)); if(fit>k+.001){cols=c; rows=r; k=fit;}}
  const col=i%cols, row=Math.floor(i/cols), inRow=row<rows-1?cols:n-cols*(rows-1);   // a shorter last row is centred
  const cx=b.x+(col-(inRow-1)/2)*s*k*ACROSS, cy=b.y+b.h*.08+(row-(rows-1)/2)*s*k*DOWN;   // a little low: the figure rises above its base
  return {x:cx-s/2,y:cy-s/2,k,row};
}
/** puts every pawn on its square (the pawns themselves are drawn by React, src/react/Board.tsx) */
export function layoutPawns(){
  const layer=$('pawns'); if(!layer||!app.V||!app.V.players) return;
  const s=pawnSize(); layer.style.setProperty('--ps',s+'px');
  app.V.players.forEach(p=>{
    const el=$('pw'+p.id); if(!el||p.bankrupt) return;
    const {x,y,k,row}=slotXY(p.id,app.dpos[p.id]);
    const img=el.querySelector('img'), wide=Math.ceil(s*2.13*k)+'px'; if(img&&img.sizes!==wide) img.sizes=wide;   // how wide the picture is shown: the browser picks the nearest size
    if(!el.style.transform){el.style.transition='none'; requestAnimationFrame(()=>{el.style.transition='';});}   // no glide in from the corner the first time
    el.style.transform=`translate(${x}px,${y}px) scale(${k.toFixed(3)})`; el.style.zIndex=String(1+row);
  });
  if(app.tableSync) app.tableSync();          // the 3D table (ui/table3d.js) starts with the first board and follows the pawns from here on
}
addEventListener('resize',()=>{clearTimeout(window.__rz); window.__rz=setTimeout(()=>{if(app.V&&app.V.status==='play') layoutPawns();},120);});
