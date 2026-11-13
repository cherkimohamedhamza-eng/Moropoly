// The 3D dice: the die modelled in Blender (scripts/dice/make-die.py -> public/assets/die.glb), drawn with
// three.js on a see-through canvas over the board's centre (#diceGl, src/react/Board.tsx).
// three.js is only fetched the first time dice are shown. Until it has loaded, and on devices without
// WebGL, the plain CSS dice underneath stay visible (ui/board.js setDice turns those).
import {app} from '../app/state';
import {$} from './dom';

/* the direction each number faces in the model (glTF axes, Y up; see make-die.py) */
const FACE={1:[0,1,0],6:[0,-1,0],2:[1,0,0],5:[-1,0,0],3:[0,0,-1],4:[0,0,1]};
/* the die is 2 units across. HOME: where the two dice rest; VIEW_W: how many units the canvas shows across */
const HOME=[-1.75,1.75], VIEW_W=11.6, ELEV=56*Math.PI/180, FOV=26, LOOK_Y=1.5;
/* a roll, as parts of its length: a throw, a bounce and a last small hop, each [from, to, height] */
const HOPS=[[0,.62,3.1],[.62,.86,.85],[.86,1,.22]];
const hop=t=>{for(const [a,b,h] of HOPS) if(t<=b){const u=(t-a)/(b-a); return h*4*u*(1-u);} return 0;};

let THREE=null, Room=null, model=null, loading=null, failed=false;
let S=null;        // the scene, tied to the canvas it draws on
let last=null;     // the dice last asked for, shown as soon as the library has loaded
let raf=0;

async function load(){
  const [three,{GLTFLoader},{RoomEnvironment}]=await Promise.all([
    import('three'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/environments/RoomEnvironment.js')]);
  const gltf=await new GLTFLoader().loadAsync('assets/die.glb');
  gltf.scene.traverse(o=>{if(o.isMesh) o.castShadow=true;});
  THREE=three; Room=RoomEnvironment; model=gltf.scene;
}

/** makes sure there is a scene for the canvas now on the page (a new game brings a new canvas) */
function bind(){
  const cv=$('diceGl'), box=$('dice'); if(!cv||!box) return false;
  if(S&&S.cv===cv) return true;
  if(S){cancelAnimationFrame(raf); S.ro.disconnect(); S.renderer.dispose(); S=null;}
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true});}catch(e){failed=true; return false;}
  renderer.toneMapping=THREE.NeutralToneMapping;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();
  const pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(new Room(),.04).texture; scene.environmentIntensity=.85;
  pmrem.dispose();
  // one light from the upper left, so each die drops a soft shadow on the felt
  const sun=new THREE.DirectionalLight(0xffffff,2.1); sun.position.set(-3.5,9,4.5); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024); sun.shadow.radius=5; sun.shadow.bias=-.0006;
  Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.5,far:25});
  scene.add(sun);
  const felt=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.62}));
  felt.rotation.x=-Math.PI/2; felt.receiveShadow=true; scene.add(felt);
  const dice=[0,1].map(k=>{const o=model.clone(); o.position.set(HOME[k],1,0); scene.add(o); return o;});
  const camera=new THREE.PerspectiveCamera(FOV,2,.1,100);
  S={cv,renderer,scene,camera,dice,ro:new ResizeObserver(()=>{size(); draw();})};
  S.ro.observe(cv); size();
  box.classList.add('gl');
  return true;
}
function size(){
  const {cv,renderer,camera}=S, w=cv.clientWidth, h=cv.clientHeight; if(!w||!h) return;
  renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio||1,2),3));   // at least 2: the dice are small, extra pixels keep their edges clean renderer.setSize(w,h,false);
  camera.aspect=w/h;
  const d=VIEW_W/camera.aspect/(2*Math.tan(FOV*Math.PI/360));   // far enough back to show VIEW_W units across
  camera.position.set(0,LOOK_Y+d*Math.sin(ELEV),d*Math.cos(ELEV)); camera.lookAt(0,LOOK_Y,0);
  camera.updateProjectionMatrix();
}
const draw=()=>{if(S) S.renderer.render(S.scene,S.camera);};

function place(d,anim,speed){
  if(!bind()) return;
  const up=new THREE.Vector3(0,1,0), now=performance.now();
  S.dice.forEach((o,k)=>{
    const u=o.userData;
    // which way the die ends up: the rolled number on top, turned to a new side on every roll
    if(anim||u.yaw==null) u.yaw=(Math.floor(Math.random()*4)*90+Math.random()*56-28)*Math.PI/180;
    const q1=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...FACE[d[k]]),up)
      .premultiply(new THREE.Quaternion().setFromAxisAngle(up,u.yaw));
    if(!anim){u.roll=null; o.quaternion.copy(q1); o.position.set(u.x??HOME[k],1,u.z??0); return;}
    u.x=HOME[k]+(Math.random()-.5)*.4; u.z=(Math.random()-.5)*.7;
    const a=Math.random()*Math.PI*2;
    u.roll={t0:now+k*45, dur:Math.max(120,900*speed-k*45), q0:o.quaternion.clone(), q1, p0:o.position.clone(),
      axis:new THREE.Vector3(Math.cos(a),.3,Math.sin(a)).normalize(), turns:(2+Math.floor(Math.random()*2))*Math.PI*2};
  });
  cancelAnimationFrame(raf);
  if(anim) raf=requestAnimationFrame(frame); else draw();
}
const qa={}, lerp=(a,b,t)=>a+(b-a)*t;
function frame(now){
  if(!S) return;
  qa.turn??=new THREE.Quaternion(); qa.spin??=new THREE.Quaternion();
  let busy=false;
  for(const o of S.dice){
    const u=o.userData, r=u.roll; if(!r) continue;
    const t=Math.min(1,Math.max(0,(now-r.t0)/r.dur)), e=1-Math.pow(1-t,3);
    // turn towards the resting pose while a tumble about a sideways axis dies away
    qa.turn.slerpQuaternions(r.q0,r.q1,e); qa.spin.setFromAxisAngle(r.axis,r.turns*(1-e));
    o.quaternion.multiplyQuaternions(qa.spin,qa.turn);
    o.position.set(lerp(r.p0.x,u.x,e),1+hop(t),lerp(r.p0.z,u.z,e));
    if(t<1) busy=true; else u.roll=null;
  }
  draw();
  if(busy) raf=requestAnimationFrame(frame);
}

/** shows the dice `d` in 3D; with `anim` they are thrown and tumble there, `speed` scaling how long it takes */
export function showDice3d(d,anim,speed=1){
  last=d;
  if(app.tableDice&&app.tableDice(d,anim,speed)) return;      // in table view the dice are part of that scene (ui/table3d.js)
  if(failed) return;
  if(THREE){place(d,anim,speed); return;}
  loading??=load().then(()=>{if(last) place(last,false,1);}).catch(()=>{failed=true;});
}
