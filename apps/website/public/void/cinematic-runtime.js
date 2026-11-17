/* Adapted from the supplied Void/Kage reference. Original post passes,
   water/sky/foliage renderer, interpolation and resolution governor retained. */
(() => {
'use strict';
const LIFE = window.createVoidRuntimeScope();
const requestAnimationFrame=LIFE.requestFrame, cancelAnimationFrame=LIFE.cancelFrame;
const setTimeout=LIFE.setTimer, clearTimeout=LIFE.clearTimer;
const Q      = new URLSearchParams(location.search);
const qs     = (k, d) => { const v = Q.get(k); return v === null ? d : v; };
const qn     = (k, d) => { const v = Q.get(k); return v === null ? d : parseFloat(v); };
const REDUCE = qs('reduce','0') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(hover: none)').matches;

const clamp  = (v, a, b) => v < a ? a : (v > b ? b : v);
const sat    = v => clamp(v, 0, 1);
const lerp   = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = sat((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const easeOut= t => 1 - Math.pow(1 - t, 3);
/* frame-rate independent damping */
const damp   = (cur, to, rate, dt) => lerp(cur, to, 1 - Math.exp(-rate * dt));


let hostProgress=0, hostActive=true, initialized=false;
window.__voidPreview={ready:false,renderMode:'pending'};
const canvas = document.getElementById('gl');
/* The layout viewport, not the window. On mobile `innerWidth` follows the
   initial containing block, which can run wider than the visual viewport —
   measured at 437 against a 390 screen — while `clientWidth` tracks what CSS
   actually lays out against. Sizing the canvas from `innerWidth` therefore
   renders a frame wider than the phone shows and drops the right edge of the
   scene off-screen, which is how the wordmark lost its last letter. Every
   size, aspect and pointer mapping below goes through these. */
const vpW = () => document.documentElement.clientWidth  || innerWidth;
const vpH = () => document.documentElement.clientHeight || innerHeight;
let renderer, scene, camera;
const HI = qs('q', COARSE ? 'low' : 'high');
const LOW = HI === 'low';
const WANT_POST    = qs('post', '1') !== '0';
const WANT_SHADOW  = qs('shadow', LOW ? '0' : '1') !== '0';
const DPR_CAP      = qn('dpr', LOW ? 1.4 : 2);
/* the renderer trades resolution for frame rate on its own — the scene is
   fill-bound (five big alpha-blended veils plus a bloom chain), so pixels
   are the only knob worth turning on unknown hardware */
const PERF = { scale: 1, acc: 0, n: 0, locked: qs('adapt', '1') === '0' };
const qualityKey = 'void-scene-quality-v1-' + [LOW, WANT_POST, WANT_SHADOW].join('-');
const pixelArea = () => vpW() * vpH() * Math.pow(Math.min(devicePixelRatio || 1, DPR_CAP), 2);
try {
  const saved = JSON.parse(sessionStorage.getItem(qualityKey));
  if (!PERF.locked && !REDUCE && saved && saved.scale >= .5 && saved.scale <= 1 && Math.abs(saved.area / pixelArea() - 1) < .2) PERF.scale = saved.scale;
} catch {}

function initGL() {
  if (qs('nogl', '0') !== '0' || !window.THREE) throw new Error('webgl disabled');
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !WANT_POST, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.max(.5, Math.min(devicePixelRatio || 1, DPR_CAP) * PERF.scale));
  /* updateStyle stays on: the stylesheet sizes the canvas at 100% of the
     initial containing block, which is the very box that runs wide on a
     phone. Writing the CSS size in pixels pins the element to the layout
     viewport the buffer was built for. */
  renderer.setSize(vpW(), vpH(), true);
  renderer.outputEncoding = WANT_POST ? THREE.LinearEncoding : THREE.sRGBEncoding;
  renderer.toneMapping = WANT_POST ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.info.autoReset = false;
  renderer.setClearColor(0x05070a, 1);
  if (WANT_SHADOW) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
  scene = new THREE.Scene();
    /* Density puts the hall back in the air; the colour is what decides how
     dark it is back there. At this depth most of the building's pixel is
     fog rather than its own material — darkening the timber and the tiles
     moved the hall by 0.18 of a luminance unit, the fog colour moves it
     properly. And it reaches by distance, so the foreground does not
     follow it down. */
  scene.fog = new THREE.FogExp2(0x050a0e, 0.0168);
  scene.background = new THREE.Color(0x060a0d);
  camera = new THREE.PerspectiveCamera(36, vpW() / vpH(), .35, 220);
  scene.add(camera);
}


const WORLD={}, WORD={group:null,glyphs:[],reveal:0}, CARDS=[];
const layoutWord=()=>{}, measure=()=>{}, placeMoon=()=>{}, updateLeaves=()=>{}, renderCards=()=>{};
const POST = { levels: [] };
const QUAD_VS = 'varying vec2 vUv;\nvoid main(){ vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';

function initPost() {
  POST.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  POST.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  POST.quad.frustumCulled = false;
  POST.qScene = new THREE.Scene(); POST.qScene.add(POST.quad);
  POST.up = new THREE.ShaderMaterial({
    uniforms: { tS: { value: null }, uAmt: { value: 1 } }, vertexShader: QUAD_VS,
    fragmentShader: 'uniform sampler2D tS; uniform float uAmt; varying vec2 vUv;\nvoid main(){ gl_FragColor = vec4(texture2D(tS,vUv).rgb*uAmt, 1.0); }',
    blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false
  });
  if (!WANT_POST) return;
  const w = renderer.domElement.width, h = renderer.domElement.height;
  const O = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false };
  POST.scene = new THREE.WebGLRenderTarget(w, h, Object.assign({}, O, { depthBuffer: true, samples: LOW ? 0 : 2 }));
  let lw = Math.max(2, w >> 1), lh = Math.max(2, h >> 1);
  const N = 4;
  for (let i = 0; i < N; i++) {
    POST.levels.push({ a: new THREE.WebGLRenderTarget(lw, lh, O), b: new THREE.WebGLRenderTarget(lw, lh, O), w: lw, h: lh });
    lw = Math.max(2, lw >> 1); lh = Math.max(2, lh >> 1);
  }
  POST.bright = new THREE.ShaderMaterial({
    uniforms: { tS: { value: null }, uThr: { value: .86 }, uKnee: { value: .50 } },
    vertexShader: QUAD_VS,
    fragmentShader:
      'uniform sampler2D tS; uniform float uThr; uniform float uKnee; varying vec2 vUv;\n' +
      'void main(){ vec3 c = texture2D(tS, vUv).rgb;\n' +
      ' float l = dot(c, vec3(0.2126,0.7152,0.0722));\n' +
      ' float k = smoothstep(uThr, uThr+uKnee, l);\n' +
      ' gl_FragColor = vec4(c*k, 1.0); }'
  });
  POST.blur = new THREE.ShaderMaterial({
    uniforms: { tS: { value: null }, uDir: { value: new THREE.Vector2(1, 0) } },
    vertexShader: QUAD_VS,
    fragmentShader:
      'uniform sampler2D tS; uniform vec2 uDir; varying vec2 vUv;\n' +
      'void main(){ vec3 c = texture2D(tS, vUv).rgb * 0.2270270270;\n' +
      ' c += texture2D(tS, vUv + uDir*1.3846153846).rgb * 0.3162162162;\n' +
      ' c += texture2D(tS, vUv - uDir*1.3846153846).rgb * 0.3162162162;\n' +
      ' c += texture2D(tS, vUv + uDir*3.2307692308).rgb * 0.0702702703;\n' +
      ' c += texture2D(tS, vUv - uDir*3.2307692308).rgb * 0.0702702703;\n' +
      ' gl_FragColor = vec4(c, 1.0); }'
  });
  POST.comp = new THREE.ShaderMaterial({
    uniforms: {
      tS: { value: null }, tB: { value: null }, uRes: { value: new THREE.Vector2(w, h) },
      uT: { value: 0 }, uBloom: { value: .34 }, uCA: { value: 1 }, uGrain: { value: .020 },
      uVig: { value: 1 }, uExp: { value: .62 }, uFade: { value: 1 }, uSat: { value: 1.05 }
    },
    vertexShader: QUAD_VS,
    fragmentShader:
      'uniform sampler2D tS; uniform sampler2D tB; uniform vec2 uRes;\n' +
      'uniform float uT, uBloom, uCA, uGrain, uVig, uExp, uFade, uSat;\n' +
      'varying vec2 vUv;\n' +
      'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }\n' +
      'void main(){\n' +
      ' vec2 d = vUv - 0.5; float r2 = dot(d,d);\n' +
      ' float ca = uCA * (0.30 + r2*2.6) * 0.0013;\n' +
      ' vec3 c;\n' +
      ' c.r = texture2D(tS, vUv + d*ca).r;\n' +
      ' c.g = texture2D(tS, vUv).g;\n' +
      ' c.b = texture2D(tS, vUv - d*ca).b;\n' +
      ' c += texture2D(tB, vUv).rgb * uBloom;\n' +
      ' c *= uExp;\n' +
      ' c = aces(c);\n' +
      ' float l = dot(c, vec3(0.2126,0.7152,0.0722));\n' +
      ' c = mix(vec3(l), c, uSat);\n' +
      ' c = mix(c, c*vec3(0.74,1.03,1.11), smoothstep(0.55,0.0,l)*0.80);\n' +    /* teal shadows */
      ' c = mix(c, c*vec3(1.035,0.995,0.968), smoothstep(0.50,1.0,l)*0.26);\n' + /* warm highs   */
      ' float v = smoothstep(1.22, 0.26, length(d*vec2(1.0,0.94))*1.42);\n' +
      ' c *= mix(1.0, v, uVig);\n' +
      ' float g = fract(sin(dot(vUv*uRes + uT*137.0, vec2(12.9898,78.233)))*43758.5453);\n' +
      ' c += (g-0.5)*uGrain;\n' +
      ' c *= uFade;\n' +
      ' vec3 e = pow(max(c,0.0), vec3(1.0/2.2));\n' +
      /* A touch of contrast, applied after the encode rather than before it:
         in linear the same curve mostly crushes the shadows, and this frame is
         nearly all shadow. Pivoted low, at 0.30, so it deepens the night
         without pulling the lit paper of the hall down with it. */
      ' e = clamp((e - 0.30) * 1.00 + 0.30, 0.0, 1.0);\n' +
      ' gl_FragColor = vec4( e, 1.0 );\n' +
      '}'
  });
}
function pass(mat, target, additive) {
  POST.quad.material = mat;
  renderer.setRenderTarget(target || null);
  if (!additive) renderer.clear(true, false, false);
  renderer.render(POST.qScene, POST.cam);
}
function renderPost() {
  const L = POST.levels;
  POST.bright.uniforms.tS.value = POST.scene.texture;
  pass(POST.bright, L[0].a);
  for (let i = 0; i < L.length; i++) {
    if (i > 0) { POST.up.blending = THREE.NoBlending; POST.up.uniforms.uAmt.value = 1; POST.up.uniforms.tS.value = L[i - 1].a; pass(POST.up, L[i].a); }
    POST.blur.uniforms.tS.value = L[i].a; POST.blur.uniforms.uDir.value.set(1 / L[i].w, 0); pass(POST.blur, L[i].b);
    POST.blur.uniforms.tS.value = L[i].b; POST.blur.uniforms.uDir.value.set(0, 1 / L[i].h); pass(POST.blur, L[i].a);
  }
  POST.up.blending = THREE.AdditiveBlending; POST.up.uniforms.uAmt.value = .52;
  for (let i = L.length - 1; i > 0; i--) { POST.up.uniforms.tS.value = L[i].a; pass(POST.up, L[i - 1].a, true); }
  POST.comp.uniforms.tS.value = POST.scene.texture;
  POST.comp.uniforms.tB.value = L[0].a;
  pass(POST.comp, null);
}


const CAM = [
  {p:[9,17,43],t:[-6,12,-63],fov:53},
  {p:[2,14,33],t:[-2,11,-63],fov:54},
  {p:[-5,11,24],t:[4,11,-63],fov:55},
  {p:[1,9,12],t:[-4,12,-68],fov:54},
  {p:[4,8,4],t:[-9,12,-74],fov:54},
  {p:[-8,12,-18],t:[16,18,-94],fov:56},
  {p:[-3,16,-30],t:[13,20,-111],fov:56},
  {p:[1,19,-41],t:[9,21,-126],fov:56},
  {p:[2,27,-59],t:[3,13,-140],fov:55}
];

const RIG = { prog: 0, smooth: 0, mx: 0, my: 0, tmx: 0, tmy: 0, intro: 0, focus: -1, focusAmt: 0 };
let curveP, curveT;

function buildRig() {
  curveP = new THREE.CatmullRomCurve3(CAM.map(c => new THREE.Vector3(c.p[0], c.p[1], c.p[2])), false, 'catmullrom', .42);
  curveT = new THREE.CatmullRomCurve3(CAM.map(c => new THREE.Vector3(c.t[0], c.t[1], c.t[2])), false, 'catmullrom', .42);
  camera.layers.enable(1); camera.layers.enable(2);
}
const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _d = new THREE.Vector3();
/* Every waypoint is composed for a wide frame. On a tall one the same
   numbers crop the gate in half, so the rig steps back along its own view
   axis and opens up a little instead of letting the sides fall away. */
function aspectFix() { return clamp((1.62 - vpW() / vpH()) / 1.05, 0, 1); }
function fitAspect(p, t, fov) {
  const nf = aspectFix();
  if (nf <= 0) return fov;
  _d.subVectors(p, t).normalize();
  p.addScaledVector(_d, nf * 8.2);
  p.y += nf * 1.1;
  return fov * (1 + nf * .40);
}
function applyCamera() {
  const N = CAM.length - 1;
  const u = clamp(RIG.smooth / N, 0, 1);
  curveP.getPoint(u, _p); curveT.getPoint(u, _t);
  const i = clamp(Math.floor(RIG.smooth), 0, N - 1), f = clamp(RIG.smooth - i, 0, 1);
  let fov = lerp(CAM[i].fov, CAM[i + 1].fov, f);

  fov = fitAspect(_p, _t, fov);

  /* the opening dolly: a long lens easing in from further back */
  const io = 1 - RIG.intro;
  _p.z += io * 5.6; _p.y += io * 0.65; fov += io * 8;

  /* parallax — a hand-held drift, never enough to break the frame */
  const par = 1 - smooth(0, 1.6, RIG.smooth) * .55;
  _p.x += RIG.mx * 0.62 * par; _p.y += RIG.my * 0.34 * par;
  _t.x -= RIG.mx * 0.20 * par; _t.y -= RIG.my * 0.12 * par;

  camera.position.copy(_p);
  camera.lookAt(_t);
  if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
}


let running = false, tPrev = 0, clock = 0, fadeIn = 0, frameHandle = 0, contextLost = false;
const INTRO = { t0: 0 };

function resize() {
  const w = vpW(), h = vpH();
  if (document.documentElement.style.getPropertyValue('--vw') !== w + 'px') document.documentElement.style.setProperty('--vw', w + 'px');
  const ratio = Math.max(.5, Math.min(devicePixelRatio || 1, DPR_CAP) * PERF.scale);
  if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
  const size = renderer.getSize(new THREE.Vector2());
  if (size.x !== w || size.y !== h) renderer.setSize(w, h, true);
  if (!PERF.locked && !REDUCE) { try { sessionStorage.setItem(qualityKey, JSON.stringify({ scale: PERF.scale, area: pixelArea() })); } catch {} }
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const pw = renderer.domElement.width, ph = renderer.domElement.height;
  if (WANT_POST && POST.scene) {
    POST.scene.setSize(pw, ph);
    POST.comp.uniforms.uRes.value.set(pw, ph);
    let lw = Math.max(2, pw >> 1), lh = Math.max(2, ph >> 1);
    POST.levels.forEach(L => { L.a.setSize(lw, lh); L.b.setSize(lw, lh); L.w = lw; L.h = lh; lw = Math.max(2, lw >> 1); lh = Math.max(2, lh >> 1); });
  }
  /* multisampling is the first thing to go when the budget tightens */
  if (POST.scene) {
    const want = (!LOW && PERF.scale > .78) ? 2 : 0;
    if (POST.scene.samples !== want) { POST.scene.samples = want; POST.scene.dispose(); }
  }
  WORLD.landscape?.setQuality(PERF.scale);
  CARDS.forEach(C => { C.dirty = true; });
  if (WANT_SHADOW && WORLD.key) WORLD.key.shadow.needsUpdate = true;
  if (WORLD.embers) WORLD.embers.material.uniforms.uSize.value = h * renderer.getPixelRatio() * .5;

  placeMoon();
  layoutWord();
  measure();
}

function updateWorld(dt) {
  WORLD.uT.value = REDUCE ? 0 : clock;
  if (WORLD.landscape) WORLD.landscape.update(RIG.smooth * 5 / 8, RIG.focusAmt);

  /* the focused chapter warms the lanterns and swells the disc */
  RIG.focusAmt = damp(RIG.focusAmt, RIG.focus >= 0 ? 1 : 0, 5, dt);
  const pulse = Math.sin(clock * 1.9) * .5 + .5;
  const f = RIG.focusAmt;
  if (WORLD.hallHalo) WORLD.hallHalo.material.opacity = .30 + f * .14 + Math.sin(clock * .6) * .035;
  if (WORLD.hallLight) WORLD.hallLight.intensity = 3.4 * (1 + f * .30) * (1 + Math.sin(clock * .43) * .045);
  /* the moon only breathes — the haze in front of it is what actually moves */
  if (WORLD.moonHalo) WORLD.moonHalo.material.opacity = .44 + f * .10 + Math.sin(clock * .34) * .05;
  if (WORLD.lanternLights) WORLD.lanternLights.forEach((l, i) => {
    l.intensity = 2.6 * (1 + f * .55) * (.86 + .22 * Math.sin(clock * (2.3 + i * .7) + i * 2.1) + .1 * pulse);
  });
  if (WORLD.lanternGlows) WORLD.lanternGlows.forEach(g => { g.quaternion.copy(camera.quaternion); });

  /* haze slides across the courtyard */
  if (WORLD.haze) WORLD.haze.forEach(h => {
    h.position.x = h.userData.x0 + Math.sin(clock * h.userData.sp + h.userData.ph) * 5.5;
    h.quaternion.copy(camera.quaternion);
  });

  /* ripples on the standing water */
  if (WORLD.ripples) WORLD.ripples.forEach(r => {
    const u = r.userData;
    u.t += dt * u.sp;
    if (u.t > 4) { u.t = 0; u.x = (Math.random() - .5) * 22; u.z = -8 + Math.random() * 22; }
    const k = u.t / 4;
    const s = .3 + k * 4.2;
    r.scale.set(s, s, 1);
    r.position.set(u.x, .02, u.z);
    r.material.opacity = Math.sin(k * Math.PI) * .16;
  });

  /* the type rises from behind the grass, then dissolves as you close on it */
  if (WORD.group) {
    const near = smooth(0.02, 0.92, RIG.smooth);
    WORD.glyphs.forEach((g, i) => {
      const st = clamp((WORD.reveal - i * .075) / .62, 0, 1);
      const e = easeOut(st);
      g.position.y = g.userData.baseY - (1 - e) * (WORD.ink.asc * 1.15);
      g.material.opacity = e * (1 - near);
      g.visible = g.material.opacity > .004;
    });
  }
  /* the cut-out layers dissolve as the camera reaches them, so the path can
     walk straight through the garden instead of steering around the veil */
  if (WORLD.fg) WORLD.fg.forEach(m => {
    const a = smooth(.9, 4.6, camera.position.z - m.position.z);
    m.material.opacity = a;
    m.visible = a > .006;
  });
  updateLeaves(dt);

  if (CARDS.length) CARDS.forEach(C => { const u = C.cam.userData; u.push = damp(u.push, u.want, 3.4, dt); });
}

let FRAME = 0;
function render() {
  FRAME++;
  renderer.info.reset();
  renderer.setRenderTarget(WANT_POST ? POST.scene : null);
  renderer.clear(true, true, false);
  renderer.render(scene, camera);
  renderCards(WANT_POST ? POST.scene : null);
  renderer.setRenderTarget(null);
  if (WANT_POST) {
    POST.comp.uniforms.uT.value = clock;
    POST.comp.uniforms.uFade.value = fadeIn;
    renderPost();
  }
}

function frame(now) {
  if (!running) return;
  const raw = (now - tPrev) / 1000 || 0;
  const dt = Math.min(raw, .05);              /* animation never jumps … */
  tPrev = now; clock += dt;
  fadeIn = INTRO.t0 ? sat((now - INTRO.t0) / 700) : 1;

  if (!PERF.locked && !REDUCE && FRAME > 2) {
    PERF.acc += raw; PERF.n++;      /* … but the governor reads the truth */
    if (PERF.n >= 40 || PERF.acc > .9) {
      const avg = PERF.acc / PERF.n; PERF.acc = 0; PERF.n = 0;
      if (avg > .0230 && PERF.scale > .5) { PERF.scale = Math.max(.5, PERF.scale * (avg > .05 ? .64 : .85)); resize(); }
      else if (avg < .0138 && PERF.scale < 1) { PERF.scale = Math.min(1, PERF.scale + .08); resize(); }
    }
  }
  RIG.prog = hostProgress;
  RIG.smooth = REDUCE ? RIG.prog : damp(RIG.smooth, RIG.prog, 5.2, dt);
  RIG.mx = REDUCE ? 0 : damp(RIG.mx, RIG.tmx, 2.6, dt);
  RIG.my = REDUCE ? 0 : damp(RIG.my, RIG.tmy, 2.6, dt);
  if (INTRO.t0) {
    const el = (now - INTRO.t0) / 1000;
    RIG.intro = sat(el / 2.4);
    WORD.reveal = Math.min(1.2, el / 1.5);
  }

  applyCamera();
  updateWorld(dt);
  render();
  if (!window.__voidPreview.ready) {
    window.__voidPreview.ready = true;
    document.documentElement.classList.remove('scene-pending');
    window.dispatchEvent(new Event('void-scene-ready'));
  }
  if (!REDUCE) queue();
}
const TIMER = qs('driver', 'raf') === 'timer';
function queue() {
  if (!running || LIFE.disposed) return;
  frameHandle = TIMER ? setTimeout(() => { frameHandle = 0; frame(performance.now()); }, 16)
    : requestAnimationFrame(now => { frameHandle = 0; frame(now); });
}
function stopFrames() {
  running = false;
  if (TIMER) clearTimeout(frameHandle); else cancelAnimationFrame(frameHandle);
  frameHandle = 0;
}


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
LIFE.add(() => {
  stopFrames();
  const owned = new Set();
  const release = object => { if (object && !owned.has(object)) { owned.add(object); object.dispose?.(); } };
  scene?.traverse(object => {
    release(object.geometry);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach(material => {
      Object.values(material).forEach(value => { if (value?.isTexture) release(value); });
      Object.values(material.uniforms || {}).forEach(uniform => {
        if (uniform.value?.isTexture && !uniform.value.isRenderTargetTexture) release(uniform.value);
      });
      release(material);
    });
    release(object.shadow?.map);
  });
  WORLD.landscape?.dispose();
  CARDS.forEach(card => release(card.rt));
  POST.levels.forEach(level => { release(level.a); release(level.b); });
  [POST.scene, POST.up, POST.bright, POST.blur, POST.comp, POST.quad?.geometry].forEach(release);
  if (renderer) { renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
  window.__voidPreview.ready = false;
});


boot();
})();
