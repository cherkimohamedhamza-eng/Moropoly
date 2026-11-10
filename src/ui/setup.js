// Setting up a game on this device. The screen itself is React (src/react/SetupScreen.tsx).
import {commit} from '../app/authority';
import {teardownNet} from '../app/online';
import {app} from '../app/state';
import {freshGame} from '../engine/engine';
import {lsGet} from '../lib/storage';
import {refresh} from '../react/store';

/* ============================================================
   LOCAL SETUP
   ============================================================ */
export function renderSetup(){refresh();}
export function startLocal(list,opts){
  teardownNet(); app.MODE='local';
  app.G=freshGame(list.map(s=>({name:(s.name||'').trim()||'Player',token:s.token,human:s.human})),opts,{mode:'local'});
  app.V=null; commit();
}
/** picks up the last game played on this device */
export function resumeLocal(){const sv=lsGet('moropoly.local.v2'); if(sv){teardownNet(); app.MODE='local'; app.G=sv; app.V=null; commit();}}
