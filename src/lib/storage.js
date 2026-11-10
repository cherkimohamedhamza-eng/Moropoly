// localStorage reads and writes that never throw.

export function lsGet(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}}
export function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
