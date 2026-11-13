// Table view: an optional look, the board seen from a seat at a real table, in 3D (ui/table3d.js), instead of flat from above.
// It is a look only: the board, its squares and everything the game does stay exactly the same, so the two
// views can be switched at any time. The .table class on .board-box asks for it; .live3d is there while it runs.
import {app} from '../app/state';
import {lsGet, lsSet} from '../lib/storage';
import {setDice} from './board';
import {tableSync} from './table3d';

const KEY='moropoly.view';
/** true when the player has asked for the 3D table view; the flat board is what everyone starts with */
export function tableView(){return lsGet(KEY)==='table';}
export function applyView(){
  const box=document.querySelector('.board-box'); if(!box) return;
  box.classList.toggle('table',tableView());
  tableSync();
  if(app.V&&app.V.status==='play'&&app.V.dice) setDice(app.V.dice,false);     // the dice move between the two pictures
}
export function toggleView(){lsSet(KEY,tableView()?'flat':'table'); applyView();}
applyView();
