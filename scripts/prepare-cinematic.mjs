import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reference = path.join(root, 'website/website');
const read = name => readFile(path.join(reference, name), 'utf8');
const source = await read('public/landing-pages/void.html');
const between = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < a) throw new Error(`Reference boundary missing: ${start}`);
  return source.slice(a, b);
};
const scope = await read('public/void/void-runtime.js');
const basics = between('const Q      =', 'function mulberry32')
  .replace(/^const easeIO.*\r?\n/m, '')
  .replace(/^const TAU.*\r?\n/m, '');
const gl = between("const canvas = document.getElementById('gl');", 'function tx(')
  .replace('let renderer, scene, camera, maxAniso = 1;', 'let renderer, scene, camera;')
  .replace(/^  maxAniso = .*\r?\n/m, '');
const post = between('const POST =', '/* ================================================= 8');
let camera = between('const CAM =', '/* ============================================== 9');
camera = camera.replace('let curveP, curveT, tmpCam;', 'let curveP, curveT;')
  .replace(/^  tmpCam = .*\r?\n/m, '');
camera = camera.replace(/const CAM = \[[\s\S]*?\];/, `const CAM = [
  {p:[9,17,43],t:[-6,12,-63],fov:53},
  {p:[2,14,33],t:[-2,11,-63],fov:54},
  {p:[-5,11,24],t:[4,11,-63],fov:55},
  {p:[1,9,12],t:[-4,12,-68],fov:54},
  {p:[4,8,4],t:[-9,12,-74],fov:54},
  {p:[-8,12,-18],t:[16,18,-94],fov:56},
  {p:[-3,16,-30],t:[13,20,-111],fov:56},
  {p:[1,19,-41],t:[9,21,-126],fov:56},
  {p:[2,27,-59],t:[3,13,-140],fov:55}
];`);
let machine = between('let running = false, tPrev =', '/* ======================================================== 14');
machine = machine.replace(/^let skipOpening = .*\r?\n/m, '')
  .replace('TIMER ? clearTimeout(frameHandle) : cancelAnimationFrame(frameHandle);', 'if (TIMER) clearTimeout(frameHandle); else cancelAnimationFrame(frameHandle);');
machine = machine.replace('RIG.prog = progressFor(scrollY);', 'RIG.prog = hostProgress;');
machine = machine.replace('WORLD.landscape.update(RIG.smooth, RIG.focusAmt)', 'WORLD.landscape.update(RIG.smooth * 5 / 8, RIG.focusAmt)');
const cleanup = between('LIFE.add(() => {\n  stopFrames();', "if (document.readyState === 'complete'");
const runtime = `/* Adapted from the supplied Void/Kage reference. Original post passes,
   water/sky/foliage renderer, interpolation and resolution governor retained. */
(() => {
'use strict';
const LIFE = window.createVoidRuntimeScope();
const requestAnimationFrame=LIFE.requestFrame, cancelAnimationFrame=LIFE.cancelFrame;
const setTimeout=LIFE.setTimer, clearTimeout=LIFE.clearTimer;
${basics.replace("const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;", "const REDUCE = qs('reduce','0') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches;")}
let hostProgress=0, hostActive=true, initialized=false;
window.__voidPreview={ready:false,renderMode:'pending'};
${gl}
const WORLD={}, WORD={group:null,glyphs:[],reveal:0}, CARDS=[];
const layoutWord=()=>{}, measure=()=>{}, placeMoon=()=>{}, updateLeaves=()=>{}, renderCards=()=>{};
${post}
${camera}
${machine}
function resume() {
  if (LIFE.disposed || contextLost || document.hidden || !hostActive || !initialized) return;
  if (!running) { running=true; tPrev=performance.now(); queue(); }
  else if (REDUCE && !frameHandle) queue();
}
window.__voidScene={
  setChapter(value) {hostProgress=clamp(Number(value)||0,0,8); resume();},
  setPointer(x,y) {RIG.tmx=clamp(x,-1,1);RIG.tmy=clamp(y,-1,1);},
  setActive(active) {hostActive=Boolean(active); if(!hostActive)stopFrames(); else resume();},
  dispose:()=>LIFE.dispose(),
  get state(){return {ready:window.__voidPreview.ready,mode:window.__voidPreview.renderMode,
    progress:RIG.smooth,target:hostProgress,frame:FRAME,running,quality:PERF.scale,
    time:WORLD.uT?.value,position:camera?.position.toArray(),resources:LIFE.stats,
    reflectionUpdates:WORLD.landscape?.reflectionUpdates,meshSource:WORLD.landscape?.meshSource};}
};
async function boot() {
  try {
    initGL(); WORLD.uT={value:0}; buildRig();
    const meshData=await window.loadVoidWorldMesh();
    if(LIFE.disposed)return;
    const landscape=window.createVoidMinecraftWorld({THREE,scene,renderer,camera,world:WORLD,low:LOW,shadows:WANT_SHADOW,meshData});
    await landscape.ready; if(LIFE.disposed)return;
    initPost();
    if(POST.comp){const u=POST.comp.uniforms;u.uExp.value=.90;u.uBloom.value=.12;u.uSat.value=1.04;u.uVig.value=.22;u.uGrain.value=.003;u.uCA.value=.06;POST.bright.uniforms.uThr.value=1.1;}
    if(WORLD.key){WORLD.key.shadow.autoUpdate=false;WORLD.key.shadow.needsUpdate=true;}
    await window.warmVoidPrograms(renderer,()=>{
      renderer.compile(scene,camera); WORLD.landscape.compileSky();
      const material=POST.quad?.material;
      for(const pass of [POST.up,POST.bright,POST.blur,POST.comp].filter(Boolean)){POST.quad.material=pass;renderer.compile(POST.qScene,POST.cam);}
      if(POST.quad)POST.quad.material=material;
    },LIFE);
    if(LIFE.disposed)return;
    RIG.smooth=RIG.prog=hostProgress;RIG.intro=1;fadeIn=1;
    window.__voidPreview.renderMode='webgl';resize();initialized=true;
    LIFE.on(window,'resize',()=>{resize();resume();},{passive:true});
    LIFE.on(document,'visibilitychange',()=>{if(document.hidden)stopFrames();else resume();});
    LIFE.on(canvas,'webglcontextlost',event=>{event.preventDefault();contextLost=true;stopFrames();document.documentElement.classList.add('scene-lost');});
    LIFE.on(canvas,'webglcontextrestored',()=>{contextLost=false;document.documentElement.classList.remove('scene-lost');WORLD.landscape.invalidate();resize();resume();});
    resume();
  } catch(error) {
    stopFrames();document.documentElement.classList.add('no-webgl');document.documentElement.classList.remove('scene-pending');
    window.__voidPreview={ready:true,renderMode:'fallback'};
    if(qs('nogl','0')==='0')console.warn('Void landscape fallback:',error.message);
  }
}
${cleanup}
boot();
})();
`;

const clothSource = between('const CLOTH_VERT =', '/* the plate:');
// Every card owns its event and GPU lifecycle. No global scope can overwrite the world.
const cloth = `/* Original reference cloth equations and shaders, isolated per card. */
${scope.replace('window.createVoidRuntimeScope', 'window.createVoidClothScope').replace('  window.__voidRuntime = scope;','')}
window.createVoidCloth=(output,plate,options={})=>{
const LIFE=window.createVoidClothScope();
const requestAnimationFrame=LIFE.requestFrame,cancelAnimationFrame=LIFE.cancelFrame;
const ResizeObserver=LIFE.observeWith(window.ResizeObserver),IntersectionObserver=LIFE.observeWith(window.IntersectionObserver);
const REDUCE=options.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches;
const PERF={locked:false,scale:matchMedia('(max-width:767px)').matches ? .65 : .8};
${clothSource}
const instance=createCloth(output,plate,options);
if(!instance){LIFE.dispose();return null;}
return {...instance,destroy:()=>LIFE.dispose()};
};
`;

const frame = `<!doctype html><html class="scene-pending" lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Void river valley</title><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#abc4c9}
body{background:url('/void/landscapes/river-valley.webp') center/cover}
#gl{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
.scene-pending #gl,.scene-lost #gl,.no-webgl #gl{visibility:hidden}
</style></head><body><canvas id="gl" aria-label="Animated Minecraft river valley"></canvas>
<script src="/void/world-mesh.js"></script><script src="/void/three-runtime.js"></script><script src="/void/void-runtime.js"></script><script src="/void/warm-programs.js"></script><script src="/void/minecraft-world-runtime.js"></script><script src="/void/cinematic-runtime.js"></script></body></html>`;

const shared = ['public/void/fonts/Monocraft.ttf','public/void/fonts/LICENSE-Monocraft.txt','public/void/fonts/NOTICE-Monocraft.txt',
  ...['river-valley','river-grove','river-light','river-highlands'].map(name=>`public/void/landscapes/${name}.webp`)];
for(const app of ['website','account','store'])for(const name of shared){
  const destination=path.join(root,'apps',app,name);await mkdir(path.dirname(destination),{recursive:true});await copyFile(path.join(reference,name),destination);
}
const destination=path.join(root,'apps/website/public/void');
for(const name of ['world-mesh.js','world-mesh.json','world-mesh.bin.gz','three-runtime.js','void-runtime.js','warm-programs.js','minecraft-world.js','minecraft-world-runtime.js','grain.png'])await copyFile(path.join(reference,'public/void',name),path.join(destination,name));
await mkdir(path.join(destination,'textures'),{recursive:true});
const {readdir}=await import('node:fs/promises');
for(const name of await readdir(path.join(reference,'public/void/textures')))if(/\.png$|LICENSE/.test(name))await copyFile(path.join(reference,'public/void/textures',name),path.join(destination,'textures',name));
await writeFile(path.join(destination,'cinematic-runtime.js'),runtime);
await writeFile(path.join(destination,'cloth-runtime.js'),cloth);
await writeFile(path.join(destination,'scene.html'),frame);
await writeFile(path.join(destination,'CREDITS.txt'),`Adapted from the user-supplied website/website reference. Camera, rendering passes and cloth: Kage by ThreeUI (https://threeui.com/landing-pages/kage-landing-page). Minecraft world geometry and shaders: supplied local Void adaptation. Three.js r149 retains its license header; see LICENSE-Three.txt for the full MIT license. Monocraft: Idrees Hassan, SIL Open Font License 1.1, see fonts/LICENSE-Monocraft.txt. Minecraft sample textures: Mojang/bedrock-samples, see textures/LICENSE-Minecraft.md.\n`);
await writeFile(path.join(destination,'adaptation-manifest.json'),JSON.stringify({reference:'website/website',sourceSha256:createHash('sha256').update(source).digest('hex'),chapters:9,preserved:['world geometry','water/sky/foliage shaders','post passes','Catmull-Rom interpolation','adaptive resolution','reflection cache','cloth equations'],runtimeBytes:Buffer.byteLength(runtime),clothBytes:Buffer.byteLength(cloth)},null,2));
console.log('Prepared reference world, nine camera waypoints, isolated cloth, landscapes and licensed Monocraft for the existing apps.');
