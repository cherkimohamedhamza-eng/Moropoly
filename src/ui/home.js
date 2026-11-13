// Going back to the home page. The page itself is React (src/react/HomeScreen.tsx).
import {teardownNet} from '../app/online';
import {app} from '../app/state';
import {listMyGames} from '../net/transport';
import {closeModal} from './modals';
import {show} from './view';

export function goHome(){
  teardownNet(); clearTimeout(app.botTimer); closeModal(); app.MODE=null; app.G=null; app.V=null; app.Q=[]; app.playing=false;
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  show('home'); listMyGames();
}
