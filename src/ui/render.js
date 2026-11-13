// The game screen after each change. The board, turn card, side tabs and banner are React (src/react/).
import {app, noBoardFx} from '../app/state';
import {tl} from '../i18n/core';
import {refresh} from '../react/store';
import {setEvent} from './anim';
import {layoutPawns, setDice} from './board';

/* ---------- render ---------- */
/** the seats this device plays: every human seat in a local game, otherwise the ones that are this player's */
export function mySeats(){
  if(!app.V||!app.V.players) return [];
  if(app.MODE==='local') return app.V.players.filter(p=>p.human).map(p=>p.id);
  return app.V.players.filter(p=>p.human&&p.cid&&p.cid===app.myCid).map(p=>p.id);
}
export const iControl=id=>mySeats().includes(id);
/** after the animations: the board and side panels show the game as it is now */
export function renderAll(){
  if(!app.V||app.V.status!=='play') return;
  app.boardFx=noBoardFx(); refresh();
  setDice(app.V.dice,false); layoutPawns(); setEvent(tl(app.V.event));
}
// the React parts redraw together
export const renderBanner=refresh, renderTurn=refresh, renderTab=refresh;
export function setTab(tab){app.tab=tab; refresh();}
