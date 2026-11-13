// Puts the React screens into the page. Each one takes over a whole element (a <section>, or part of the game screen); the old code still
// decides which section is visible (ui/view.js show()) and calls refresh() when the state changes.
import type {ComponentType} from 'react';
import {createRoot} from 'react-dom/client';
import {Board} from './Board';
import {Banner, GameBar, SideTabs, TurnCard} from './GamePanel';
import {HomeScreen} from './HomeScreen';
import {LobbyScreen} from './LobbyScreen';
import {MusicDock} from './MusicDock';
import {SetupScreen} from './SetupScreen';
import {Windows} from './Windows';

const SCREENS: [string, ComponentType][] = [
  ['home', HomeScreen],
  ['lobby', LobbyScreen],
  ['setup', SetupScreen],
  // the game screen
  ['gameBar', GameBar],
  ['board', Board],
  ['turnCard', TurnCard],
  ['sideTabs', SideTabs],
  ['bannerSlot', Banner],
  ['windows', Windows],
  ['dock', MusicDock],
];

export function mountScreens() {
  for (const [id, Screen] of SCREENS) {
    const el = document.getElementById(id)!;
    el.dataset.react = ''; // marks it as React's, so the old code's page-wide updates leave it alone
    el.replaceChildren();
    createRoot(el).render(<Screen />);
  }
}
