// Table view: the game seen from a seat at a real table. A three.js scene holds a wooden table, the board's body,
// and live 3D models of the pieces, the dars and riads and the dice, with real light and shadows.
//
// The board's face is NOT redrawn: it stays the same HTML board (src/react/Board.tsx), laid into the scene with
// three.js's CSS3DRenderer so its tiles, text and clicks keep working. The WebGL picture lies over it and is
// see-through wherever the board shows; an invisible plane at the board's surface (`mask`) keeps the table from
// being drawn over it.
//
// Nothing here decides anything about the game. Each frame the scene copies what the flat board already knows:
// where each pawn element is (ui/board.js places them, ui/anim.js moves them), how many buildings each
// property has, and which dice were rolled.
import {app} from '../app/state';
import {SP, TOKENS} from '../engine/data';
import {isOwnable} from '../engine/util';
import {cellBox, layoutPawns, pawnSize} from './board';
import {$} from './dom';

const ELEV=52*Math.PI/180, FOV=30;               // the seat: how high above the table the eye is, and the lens
const THICK=.022;                                 // the board's thickness, as a share of its width
const FACE={1:[0,1,0],6:[0,-1,0],2:[1,0,0],5:[-1,0,0],3:[0,0,-1],4:[0,0,1]};   // which way each number faces on the die model
const HOPS=[[0,.62,3.1],[.62,.86,.85],[.86,1,.22]];
const hop=t=>{for(const [a,b,h] of HOPS) if(t<=b){const u=(t-a)/(b-a); return h*4*u*(1-u);} return 0;};
const lerp=(a,b,t)=>a+(b-a)*t;

let T=null, lib=null, loading=null, failed=false;   // three.js, its add-ons
let S=null;                                          // the running scene
const models={};                                     // loaded models by file name (promises)

async function load(){
  const [three,gltf,css3d,room]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/renderers/CSS3DRenderer.js'),import('three/addons/environments/RoomEnvironment.js')]);
  const loader=new gltf.GLTFLoader();      // the models are plain .glb: the site's security policy rules out the decoders compressed ones need
  T=three; lib={loader,CSS3DRenderer:css3d.CSS3DRenderer,CSS3DObject:css3d.CSS3DObject,Room:room.RoomEnvironment};
}
function model(file){
  return models[file]??=lib.loader.loadAsync('assets/'+file).then(g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true; o.receiveShadow=true;}}); return g.scene;});
}

/* a picture of wooden planks, drawn once, for the table top */
function wood(){
  const c=document.createElement('canvas'); c.width=c.height=1024; const g=c.getContext('2d');
  let seed=7; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const planks=6, h=c.height/planks;
  for(let p=0;p<planks;p++){
    const tone=19+rnd()*7; g.fillStyle=`hsl(22,46%,${tone}%)`; g.fillRect(0,p*h,c.width,h);
    for(let k=0;k<160;k++){                       // the grain: long faint streaks that wander a little
      const y=p*h+rnd()*h, len=200+rnd()*700, x=rnd()*c.width-100;
      g.strokeStyle=`hsla(${20+rnd()*10},50%,${rnd()<.5?tone-9:tone+7}%,${.10+rnd()*.22})`; g.lineWidth=.6+rnd()*1.8;
      g.beginPath(); g.moveTo(x,y); g.bezierCurveTo(x+len*.3,y+rnd()*8-4,x+len*.7,y+rnd()*8-4,x+len,y+rnd()*6-3); g.stroke();
    }
    g.fillStyle='rgba(0,0,0,.45)'; g.fillRect(0,p*h,c.width,2);                      // the gap between planks
    g.fillStyle='rgba(255,255,255,.05)'; g.fillRect(0,p*h+2,c.width,1.5);
  }
  const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.colorSpace=T.SRGBColorSpace; t.anisotropy=8; return t;
}
function roundRect(w,r){
  const s=new T.Shape(), h=w/2;
  s.moveTo(-h+r,-h); s.lineTo(h-r,-h); s.quadraticCurveTo(h,-h,h,-h+r); s.lineTo(h,h-r); s.quadraticCurveTo(h,h,h-r,h);
  s.lineTo(-h+r,h); s.quadraticCurveTo(-h,h,-h,h-r); s.lineTo(-h,-h+r); s.quadraticCurveTo(-h,-h,-h+r,-h); return s;
}

function start(box,board){
  const stage=document.createElement('div'); stage.className='table-stage'; box.appendChild(stage);
  let gl;
  try{gl=new T.WebGLRenderer({alpha:true,antialias:true});}catch(e){stage.remove(); failed=true; return;}
  gl.toneMapping=T.NeutralToneMapping; gl.toneMappingExposure=1.2; gl.shadowMap.enabled=true; gl.shadowMap.type=T.PCFShadowMap;
  gl.domElement.className='table-gl';
  const css=new lib.CSS3DRenderer(); css.domElement.className='table-dom';
  stage.append(css.domElement,gl.domElement);
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(FOV,1.3,10,20000);
  const pm=new T.PMREMGenerator(gl); scene.environment=pm.fromScene(new lib.Room(),.04).texture; scene.environmentIntensity=1.25; pm.dispose();
  const sun=new T.DirectionalLight(0xfff1dc,3.1); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.radius=6; sun.shadow.bias=-.0004; sun.shadow.normalBias=.6;
  scene.add(sun,sun.target,new T.HemisphereLight(0xdfe6ff,0x5a4630,.8));
  const face=new lib.CSS3DObject(board); face.rotation.x=-Math.PI/2; scene.add(face);     // the HTML board, lying on the table
  S={box,board,stage,gl,css,scene,camera,sun,face,W:0,pawns:new Map(),houses:new Map(),dice:[],look:{x:0,y:0,tx:0,ty:0},raf:0,
    table:null,body:null,mask:null,shade:null,sig:''};
  S.onMove=e=>{const r=box.getBoundingClientRect(); S.look.tx=((e.clientX-r.left)/r.width-.5)*2; S.look.ty=((e.clientY-r.top)/r.height-.5)*2;};
  S.onOut=()=>{S.look.tx=S.look.ty=0;};
  box.addEventListener('pointermove',S.onMove); box.addEventListener('pointerleave',S.onOut);
  S.ro=new ResizeObserver(()=>size()); S.ro.observe(box);
  size();
  model('die.glb').then(m=>{if(!S||S.gl!==gl) return; S.dice=[0,1].map(()=>{const o=m.clone(); o.visible=false; scene.add(o); return o;}); if(app.V) dice(app.V.dice||[3,4],false,1);});
  box.classList.add('live3d');
  S.raf=requestAnimationFrame(frame);
}
function stop(){
  if(!S) return;
  const {box,board,stage,gl,ro}=S;
  cancelAnimationFrame(S.raf); ro.disconnect(); box.removeEventListener('pointermove',S.onMove); box.removeEventListener('pointerleave',S.onOut);
  box.insertBefore(board,stage); stage.remove(); box.classList.remove('live3d');
  for(const k of ['position','transform','width','height','pointerEvents','userSelect']) board.style[k]='';
  gl.dispose(); S=null;
}

/* fits the scene to the box: everything is measured in the board's own pixels, the board W wide and centred on the table */
function size(){
  const {board,stage,gl,css,scene,camera,sun}=S, W=Math.round(stage.clientWidth), H=Math.round(W*.74); if(!W) return;   // the stage, not the box: the box has padding
  if(W!==S.W){
    S.W=W; board.style.width=board.style.height=W+'px';
    for(const k of ['table','body','mask','shade']) if(S[k]){scene.remove(S[k]); S[k].geometry.dispose();}
    const t=W*THICK, flat=m=>{m.rotation.x=-Math.PI/2; return m;}, shape=roundRect(W,W*.02);
    const top=wood(); top.repeat.set(5,5);
    S.table=flat(new T.Mesh(new T.PlaneGeometry(W*12,W*12),new T.MeshStandardMaterial({map:top,roughness:.58,metalness:0}))); S.table.position.y=-t; S.table.receiveShadow=true;
    S.body=flat(new T.Mesh(new T.ExtrudeGeometry(shape,{depth:t,bevelEnabled:false}),new T.MeshStandardMaterial({color:0xaab0ba,metalness:.9,roughness:.32}))); S.body.position.y=-t-.6; S.body.castShadow=true;
    S.mask=flat(new T.Mesh(new T.ShapeGeometry(shape),new T.MeshBasicMaterial({colorWrite:false}))); S.mask.renderOrder=-1;     // the board's face: holds the table back, shows the HTML
    S.shade=flat(new T.Mesh(new T.ShapeGeometry(shape),new T.ShadowMaterial({opacity:.5}))); S.shade.position.y=.4; S.shade.receiveShadow=true;   // catches the shadows that fall on the board
    scene.add(S.table,S.body,S.mask,S.shade);
    sun.position.set(-W*.7,W*1.05,W*.55); sun.target.position.set(0,0,0);
    Object.assign(sun.shadow.camera,{left:-W*.9,right:W*.9,top:W*.9,bottom:-W*.9,near:W*.2,far:W*3}); sun.shadow.camera.updateProjectionMatrix();
    // the board has a new size: put the pawns and the dice where they belong on it
    layoutPawns(); for(const o of S.dice) o.userData.x=o.userData.z=undefined;
    if(app.V&&S.dice.length) dice(app.V.dice||[3,4],false,1);
  }
  stage.style.height=H+'px'; css.setSize(W,H); gl.setPixelRatio(Math.min(devicePixelRatio||1,2)); gl.setSize(W,H,false);
  camera.aspect=W/H; S.sig=''; aim(true);
}
/* points the camera: from the seat, turned a little towards wherever the pointer is; `fit` also backs it off until the board fills the view */
function aim(fit){
  const {camera,look,W}=S, yaw=look.x*.07, el=ELEV-look.y*.035, to=new T.Vector3(0,0,W*.045);
  const from=d=>camera.position.set(to.x+d*Math.cos(el)*Math.sin(yaw),d*Math.sin(el),to.z+d*Math.cos(el)*Math.cos(yaw));
  if(fit){
    let d=W*2;
    for(let k=0;k<8;k++){
      from(d); camera.lookAt(to); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      let wide=0, tall=0;
      for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const p=new T.Vector3(x*W/2,0,z*W/2).project(camera); wide=Math.max(wide,Math.abs(p.x)); tall=Math.max(tall,Math.abs(p.y)*(p.y>0?1.14:1.0));}
      d*=Math.max(wide/.985,tall/.985);
    }
    S.dist=d;
  }
  from(S.dist); camera.lookAt(to); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  S.css.render(S.scene,camera);
}

/* ---------- copying the game into the scene ---------- */
const onBoard=(x,y,W)=>[x-W/2,y-W/2];           // board pixels -> the table's x and z
/** the middle of an element inside the board, in board pixels (layout positions: the 3D tilt does not change them) */
function inBoard(el){let x=el.offsetWidth/2, y=el.offsetHeight/2; for(let e=el;e&&e!==S.board;e=e.offsetParent){x+=e.offsetLeft; y+=e.offsetTop;} return [x,y];}
function pawns(){
  const {scene,W}=S, V=app.V, s=pawnSize(), seen=new Set();
  for(const p of V.players){
    const el=$('pw'+p.id); if(!el||p.bankrupt) continue;
    seen.add(p.id);
    let o=S.pawns.get(p.id);
    if(!o||o.userData.token!==p.token){
      if(o) scene.remove(o);
      o=new T.Group(); o.userData={token:p.token};
      // the player's colour: a solid spot the piece stands on, with a white rim
      const ring=new T.Mesh(new T.CircleGeometry(1.12,48),new T.MeshBasicMaterial({color:p.color})); ring.rotation.x=-Math.PI/2; ring.position.y=.03;
      const rim=new T.Mesh(new T.RingGeometry(1.12,1.24,48),new T.MeshBasicMaterial({color:0xffffff})); rim.rotation.x=-Math.PI/2; rim.position.y=.03; o.add(rim);
      const glow=new T.Mesh(new T.RingGeometry(1.3,1.8,48),new T.MeshBasicMaterial({color:0xe3b34a,transparent:true,opacity:0})); glow.rotation.x=-Math.PI/2; glow.position.y=.02;
      o.add(ring,glow); o.userData.ring=ring; o.userData.glow=glow;
      model(`models/piece-${TOKENS[p.token]?p.token:0}.glb`).then(m=>{if(S&&S.pawns.get(p.id)===o){const fig=m.clone(); o.add(fig); o.userData.fig=fig;}});
      scene.add(o); S.pawns.set(p.id,o);
    }
    // a resting pawn is scaled down to share its square (1 or less); a hopping one is scaled up, to 1.18 at the top of a step (ui/anim.js)
    const m=new DOMMatrixReadOnly(getComputedStyle(el).transform), sc=Math.hypot(m.a,m.b)||1, k=Math.min(1,sc), lift=Math.max(0,(sc-1)/.18);
    const [x,z]=onBoard(m.e+s/2,m.f+s/2,W), unit=s/2.16*k*1.15;
    o.position.set(x,1,z); o.scale.setScalar(unit);
    if(o.userData.fig) o.userData.fig.position.y=lift*1.5;                 // only the figure leaves the board; its ring stays down
    o.userData.ring.material.color.set(p.color);
    const cur=p.id===V.cur&&!V.over, pulse=(performance.now()%1400)/1400;
    o.userData.glow.material.opacity=cur?.75*(1-pulse):0; o.userData.glow.scale.setScalar(cur?.85+pulse*.5:1);
  }
  for(const [id,o] of S.pawns) if(!seen.has(id)){scene.remove(o); S.pawns.delete(id);}
}
function houses(){
  const {scene,W}=S, V=app.V, fx=app.boardFx, now=performance.now();
  for(let i=0;i<SP.length;i++){
    if(!isOwnable(i)||SP[i].t!=='prop') continue;
    const n=fx.houses[i]??V.props[i].houses, have=S.houses.get(i);
    if(have&&have.n===n){for(const o of have.list){const t=Math.min(1,(now-o.userData.born)/420), e=1-Math.pow(1-t,3); o.scale.setScalar(o.userData.size*(t<1?e*(1+.25*Math.sin(t*Math.PI)):1)); o.position.y=1+(1-e)*W*.05;} continue;}
    if(have) have.list.forEach(o=>scene.remove(o));
    const list=[]; S.houses.set(i,{n,list}); if(!n) continue;
    const b=cellBox(i), side=i<10?'b':i<20?'l':i<30?'t':'r', riad=n===5, count=riad?1:n;
    for(let k=0;k<count;k++){
      const along=(k-(count-1)/2)*(side==='b'||side==='t'?b.w:b.h)*.235;
      const [bx,by]=side==='b'?[b.x+along,b.y-b.h*.415]:side==='t'?[b.x+along,b.y+b.h*.415]:side==='l'?[b.x+b.w*.43,b.y+along]:[b.x-b.w*.43,b.y+along];
      const [x,z]=onBoard(bx,by,W), o=new T.Group();
      o.position.set(x,1,z); o.userData={size:(riad?W*.0062:W*.0098),born:have?now:0}; o.scale.setScalar(o.userData.size);
      model(riad?'models/riad.glb':'models/dar.glb').then(m=>{if(S&&S.houses.get(i)?.list.includes(o)) o.add(m.clone());});
      scene.add(o); list.push(o);
    }
  }
}
/* the dice: thrown from where they lie, tumbling towards the rolled numbers (the same throw as ui/dice3d.js) */
function dice(d,anim,speed){
  if(!S||!S.dice.length) return;                 // not loaded yet: start() shows the current dice once it is
  const {W}=S, box=$('dice'), up=new T.Vector3(0,1,0), now=performance.now(), size=W*.028;
  const mid=box?onBoard(...inBoard(box),W):[0,W*.06];
  S.dice.forEach((o,k)=>{
    const u=o.userData; o.visible=true; o.scale.setScalar(size);
    if(anim||u.yaw==null) u.yaw=(Math.floor(Math.random()*4)*90+Math.random()*56-28)*Math.PI/180;
    const q1=new T.Quaternion().setFromUnitVectors(new T.Vector3(...FACE[d[k]]),up).premultiply(new T.Quaternion().setFromAxisAngle(up,u.yaw));
    const home=[mid[0]+(k?1:-1)*size*1.75,mid[1]];
    if(!anim){u.roll=null; u.x??=home[0]; u.z??=home[1]; o.quaternion.copy(q1); o.position.set(u.x,size,u.z); return;}
    u.x=home[0]+(Math.random()-.5)*size*.4; u.z=home[1]+(Math.random()-.5)*size*.7;
    const a=Math.random()*Math.PI*2;
    u.roll={t0:now+k*45,dur:Math.max(120,900*speed-k*45),q0:o.quaternion.clone(),q1,p0:o.position.clone(),
      axis:new T.Vector3(Math.cos(a),.3,Math.sin(a)).normalize(),turns:(2+Math.floor(Math.random()*2))*Math.PI*2};
  });
}
function rollDice(now){
  const size=S.W*.028, qa=S.qa??={turn:new T.Quaternion(),spin:new T.Quaternion()}, card=$('stage')?.childElementCount>0;
  for(const o of S.dice){
    o.visible=!card;                              // a revealed card lies where the dice are: they step aside
    const u=o.userData, r=u.roll; if(!r) continue;
    const t=Math.min(1,Math.max(0,(now-r.t0)/r.dur)), e=1-Math.pow(1-t,3);
    qa.turn.slerpQuaternions(r.q0,r.q1,e); qa.spin.setFromAxisAngle(r.axis,r.turns*(1-e)); o.quaternion.multiplyQuaternions(qa.spin,qa.turn);
    o.position.set(lerp(r.p0.x,u.x,e),size*(1+hop(t)),lerp(r.p0.z,u.z,e));
    if(t>=1) u.roll=null;
  }
}
function frame(now){
  if(!S) return;
  S.raf=requestAnimationFrame(frame);
  if(!wanted()){stop(); return;}
  if(document.hidden) return;
  const l=S.look, dx=l.tx-l.x, dy=l.ty-l.y;
  if(Math.abs(dx)+Math.abs(dy)>.002){l.x+=dx*.06; l.y+=dy*.06; aim(false);}
  pawns(); houses(); rollDice(now);
  S.gl.render(S.scene,S.camera);
}

/* ---------- switching it on and off ---------- */
const wanted=()=>{const box=document.querySelector('.board-box'), b=$('board'); return !!(box&&b&&box.classList.contains('table')&&app.V&&app.V.status==='play'&&box.offsetParent!==null);};
/** starts or stops the 3D table to match what should be on screen now; safe to call at any time */
export function tableSync(){
  if(!wanted()){stop(); return;}
  if(S||failed) return;
  loading??=load().catch(()=>{failed=true;});
  loading.then(()=>{if(!S&&!failed&&wanted()) start(document.querySelector('.board-box'),$('board'));});
}
export const tableOn=()=>!!S;
app.tableSync=tableSync;
app.tableDice=(d,anim,speed)=>{if(!S) return false; dice(d,anim,speed); return true;};
