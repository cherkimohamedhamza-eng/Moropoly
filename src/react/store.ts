// The bridge between the app state (src/app/state.ts, changed in place by the existing code) and React.
// Wherever the old code redrew a screen by hand, it now calls refresh(), and every React screen that
// called useRefresh() draws again from the current state, straight away (the animation code looks up
// the board's elements right after asking for a redraw).
import {useSyncExternalStore} from 'react';
import {flushSync} from 'react-dom';

let version = 0;
const listeners = new Set<() => void>();

export function refresh() {
  version++;
  flushSync(() => { for (const l of listeners) l(); });
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useRefresh() {
  return useSyncExternalStore(subscribe, () => version);
}
