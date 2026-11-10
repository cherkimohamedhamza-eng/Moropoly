// The online lobby.
import {commit, lobbyAct} from '../app/authority';
import {hostOnline, onlineCids} from '../app/online';
import {app, inClaude, inviteLink, myName, saveName} from '../app/state';
import {BOT_NAMES, TOKENS} from '../engine/data';
import {freshGame} from '../engine/engine';
import {range} from '../engine/util';
import {t, tokN} from '../i18n/core';
import {lsGet, lsSet} from '../lib/storage';
import {$, coinHTML, esc, toast} from './dom';
import {goHome} from './home';
import {renderLangSwitch} from './lang';

/* ============================================================
   LOBBY (online)
   ============================================================ */
const hostPin=()=>{const v=lsGet('moropoly.pin.'+(app.V&&app.V.code)); return v?String(v):'';};
export function renderLobby(){
  const el=$('lobby'); if(!app.V) return;
  const isHost=app.MODE==='host'; const on=onlineCids();
  const mine=app.V.players.find(p=>p.cid===app.myCid);
  if(mine) app.lobbyDraft.token=mine.token; else if(app.lobbyDraft.token<0||(app.V.players.some(p=>p.token===app.lobbyDraft.token&&p.cid!==app.myCid))) app.lobbyDraft.token=(range(10).find(k=>!app.V.players.some(p=>p.token===k))??0);
  if(mine&&document.activeElement&&document.activeElement.id!=='lbName') app.lobbyDraft.name=mine.name; else if(!app.lobbyDraft.name) app.lobbyDraft.name=myName();
  const link=inviteLink(app.V.code);
  const focusId=document.activeElement&&document.activeElement.id, selStart=focusId==='lbName'?document.activeElement.selectionStart:null;
  const small=x=>` <span class="muted">· ${x}</span>`;
  el.innerHTML=`<div class="bar-top"><button class="btn ghost sm" data-home>${t('back')}</button><div class="sp"></div><div class="langsw"></div><span class="chipcode" dir="ltr">${esc(t('chip.game',{c:app.V.code.toUpperCase()}))}</span></div>
   <div class="eyebrow">${isHost?t('lb.hosting'):t('lb.invited')}</div><h2 class="h2">${t('lb.h2')}</h2>
   <div class="lobby">
    <div class="card">
      <div class="eyebrow" style="margin-bottom:8px">${t('lb.invite')}</div>
      <div class="code">${esc(app.V.code.toUpperCase())}</div>
      <p class="muted" style="font-size:13px">${t('lb.send')}${t('lb.lateJoin')}${inClaude()?t('lb.claude'):t('lb.keepOpen')}</p>
      ${isHost?`<div class="opt" style="flex-direction:column;align-items:stretch;gap:8px;margin:4px 0 6px"><b>${t('pin.set')}</b><span>${t('pin.setHelp')}</span>
        <div class="invite"><input class="field" id="pinSet" inputmode="numeric" pattern="[0-9]*" maxlength="6" dir="ltr" placeholder="1234" value="${esc(hostPin()||'')}" aria-label="${esc(t('pin.set'))}" style="max-width:140px;font-family:var(--f-display);letter-spacing:.3em"><button class="btn sm" id="pinSave">${t('pin.save')}</button>${app.V.pinHash?`<button class="btn sm ghost" id="pinClear">${t('pin.remove')}</button>`:''}</div>
        <span class="muted" style="font-size:12px">${app.V.pinOn?esc(t('pin.on',{c:hostPin()||'••••'})):t('pin.off')}</span></div>`:(app.V.pinOn?`<p class="muted" style="font-size:12.5px">${t('pin.onOther')}</p>`:'')}
      <div class="invite"><input class="field" id="invLink" readonly dir="ltr" value="${esc(link)}" aria-label="${t('lb.invite')}"><button class="btn sm metal" id="copyLink">${t('btn.copy')}</button></div>
      <div class="sec" style="margin-top:18px">${t('lb.atTable',{n:app.V.players.length})}</div>
      <div class="roster">${app.V.players.length?app.V.players.map((p,k)=>`<div class="rrow">${coinHTML(p.token)}<div class="sp"><div class="n">${p.human&&on?`<span class="dotst ${on.has(p.cid)?'on':''}"></span>`:''}${esc(p.name)}${p.cid===app.myCid?small(t('lbl.you')):''}${p.cid===app.V.hostCid?small(t('lbl.host')):''}</div><div class="muted" style="font-size:12px">${esc(tokN(p.token))}${p.human?'':' · '+t('lbl.computer')}</div></div>${isHost&&p.cid!==app.myCid?`<button class="btn ghost sm" data-kick="${k}">${t('btn.remove')}</button>`:''}</div>`).join(''):`<div class="muted">${t('lb.nobody')}</div>`}</div>
      ${isHost?`<div class="ctas" style="margin-top:12px"><button class="btn sm" id="addBot" ${app.V.players.length>=8?'disabled':''}>${t('btn.addBot')}</button></div>`:''}
    </div>
    <div class="card">
      <div class="eyebrow" style="margin-bottom:8px">${mine?t('lb.yourSeat'):t('lb.takeSeat')}</div>
      <p class="muted" style="font-size:12.5px;margin:0 0 10px">${mine?t('lb.autoNote'):app.V.players.length>=8?t('lb.full'):t('lb.joining')}</p>
      <label class="muted" for="lbName" style="font-size:12.5px">${t('lb.name')}</label>
      <input class="field" id="lbName" maxlength="16" placeholder="${esc(t('lb.namePh'))}" value="${esc(app.lobbyDraft.name)}" style="width:100%;box-sizing:border-box;margin:6px 0 14px">
      <div class="muted" style="font-size:12.5px;margin-bottom:8px">${t('lb.token')}</div>
      <div class="tokgrid">${TOKENS.map((tk,k)=>{const taken=app.V.players.find(p=>p.token===k&&p.cid!==app.myCid); return `<button class="tok" data-tok="${k}" aria-pressed="${app.lobbyDraft.token===k}" ${taken?'disabled':''}>${coinHTML(k)}${taken?`<span class="taken">${esc(taken.name.slice(0,8))}</span>`:''}<span>${esc(tokN(k))}</span></button>`;}).join('')}</div>
      <div class="ctas" style="margin-top:16px"><button class="btn ${mine?'':'red'}" id="takeSeat" ${app.V.players.length>=8&&!mine?'disabled':''}>${mine?t('btn.save'):t('btn.sit')}</button>${mine&&!isHost?`<button class="btn ghost" id="leaveSeat">${t('btn.leaveTable')}</button>`:''}</div>
      ${isHost?`<div class="sec">${t('sec.rules')}</div><div class="opts">${optsHTML(app.V.settings,'lb')}</div>
        <div class="ctas" style="margin-top:16px"><button class="btn red" id="startOnline" ${app.V.players.length<2?'disabled':''}>${t('btn.start')}</button><span class="muted" style="font-size:12.5px">${app.V.players.length<2?t('lb.need2'):t('lb.ready',{n:app.V.players.length})}</span></div>`:`<p class="muted" style="margin-top:18px">${hostOnline()?t('lb.hostStarts'):t('lb.waitHost')}</p>`}
    </div>
   </div>`;
  el.querySelectorAll('.langsw').forEach(renderLangSwitch);
  if(focusId==='lbName'){const i=$('lbName'); i.focus(); if(selStart!=null) i.setSelectionRange(selStart,selStart);}
  el.querySelector('[data-home]').onclick=goHome;
  $('copyLink').onclick=()=>{const inp=$('invLink'); const done=()=>toast(t('toast.copied')); try{navigator.clipboard.writeText(link).then(done,()=>{inp.select();toast(t('toast.ctrlC'));});}catch(e){inp.select();}};
  $('lbName').oninput=e=>{app.lobbyDraft.name=e.target.value;};
  const saveSeat=quiet=>{const n=(app.lobbyDraft.name||'').trim(); if(!n){toast(t('toast.name')); $('lbName').focus(); return;} saveName(n); lobbyAct({t:'join',name:n,token:app.lobbyDraft.token}); if(!quiet) toast(mine?t('toast.saved'):t('toast.sitting'));};
  el.querySelectorAll('[data-tok]').forEach(b=>b.onclick=()=>{app.lobbyDraft.token=+b.dataset.tok; el.querySelectorAll('[data-tok]').forEach(x=>x.setAttribute('aria-pressed',x===b)); if(mine) saveSeat(true);});
  $('lbName').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault(); saveSeat();}};
  $('lbName').onchange=()=>{if(mine) saveSeat(true);};
  $('takeSeat').onclick=()=>saveSeat();
  if(isHost){
    $('pinSave').onclick=()=>{const v=($('pinSet').value||'').replace(/\D/g,''); if(v.length<4||v.length>6){toast(t('pin.bad')); return;} lsSet('moropoly.pin.'+app.G.code,v); app.G.pinOn=true; delete app.G.pinHash; commit(); toast(t('pin.on',{c:v}));};
    const pc=$('pinClear'); if(pc) pc.onclick=()=>{try{localStorage.removeItem('moropoly.pin.'+app.G.code);}catch(e){} app.G.pinOn=false; delete app.G.pinHash; commit();};
  }
  const ls=$('leaveSeat'); if(ls) ls.onclick=()=>lobbyAct({t:'leave'});
  if(isHost){
    el.querySelectorAll('[data-kick]').forEach(b=>b.onclick=()=>{app.G.players.splice(+b.dataset.kick,1); commit();});
    $('addBot').onclick=()=>{const used=new Set(app.G.players.map(p=>p.token)); const tok=range(10).find(k=>!used.has(k)); if(tok==null) return; const nm=BOT_NAMES.find(n=>!app.G.players.some(p=>p.name===n))||'Computer'; app.G.players.push({cid:null,name:nm,token:tok,human:false}); commit();};
    bindOpts('lb',st=>{app.G.settings=Object.assign(app.G.settings,st); commit();});
    $('startOnline').onclick=startOnline;
  }
}
function startOnline(){
  if(!app.G||app.G.status!=='lobby'||app.G.players.length<2) return;
  const seats=app.G.players.map(p=>({cid:p.cid,name:p.name,token:p.token,human:p.human}));
  const g=freshGame(seats,app.G.settings,{mode:'online',code:app.G.code,hostCid:app.G.hostCid,ack:app.G.ack});
  g.pinOn=!!app.G.pinOn; g.denied=app.G.denied||{}; ['nonce','hostKey','hostDh'].forEach(k=>{if(app.G[k]) g[k]=app.G[k];});
  app.G=g; commit();
}
export function optsHTML(s,pfx){
  return `<label class="opt"><input type="checkbox" id="${pfx}Daret" ${s.daret?'checked':''}><div><b>${t('opt.daret')}</b><span>${t('opt.daretD')}</span></div></label>
   <label class="opt"><input type="checkbox" id="${pfx}Dlala" ${s.dlala?'checked':''}><div><b>${t('opt.dlala')}</b><span>${t('opt.dlalaD')}</span></div></label>
   <label class="opt"><div style="flex:1"><b>${t('opt.len')}</b><span>${t('opt.lenD')}</span><div><select class="field" id="${pfx}Rounds">${[0,15,25,40].map(v=>`<option value="${v}" ${+s.rounds===v?'selected':''}>${v?t('opt.rounds',{n:v}):t('opt.until')}</option>`).join('')}</select></div></div></label>
   <label class="opt"><div style="flex:1"><b>${t('opt.timer')}</b><span>${t('opt.timerD')}</span><div><select class="field" id="${pfx}Timer">${[0,30,60,90,120].map(v=>`<option value="${v}" ${+(s.timer||0)===v?'selected':''}>${v===0?t('opt.off'):v<120?t('opt.sec',{n:v}):t('opt.min',{n:v/60})}</option>`).join('')}</select></div></div></label>
   <label class="opt"><input type="checkbox" id="${pfx}Fast" ${s.fast?'checked':''}><div><b>${t('opt.fast')}</b><span>${t('opt.fastD')}</span></div></label>`;
}
function readOpts(pfx){return {daret:$(pfx+'Daret').checked,dlala:$(pfx+'Dlala').checked,rounds:+$(pfx+'Rounds').value,fast:$(pfx+'Fast').checked,timer:$(pfx+'Timer')?+$(pfx+'Timer').value:0};}
export function bindOpts(pfx,cb){['Daret','Dlala','Rounds','Fast','Timer'].forEach(k=>{const e=$(pfx+k); if(e) e.onchange=()=>cb(readOpts(pfx));});}
