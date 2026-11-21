// The online lobby. The screen itself is React (src/react/LobbyScreen.tsx).
import {app} from '../app/state';
import {refresh} from '../react/store';

/* ============================================================
   LOBBY (online)
   ============================================================ */
export function renderLobby(){app.lobbyPanel={kind:'table'}; refresh();}
