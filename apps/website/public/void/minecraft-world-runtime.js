/* A continuous Minecraft river valley. Geometry is local; the small vanilla
   texture tiles come from Mojang's published Bedrock sample resource pack. */
window.createVoidMinecraftWorld = function ({ THREE: T, scene, renderer, camera, world, low, shadows, meshData }) {
  const root = new T.Group();
  root.name = 'VoidMinecraftLandscape';
  scene.add(root);
  scene.background = null;
  scene.fog = new T.FogExp2(0xabc4c9, .0024);
  camera.far = 650; camera.updateProjectionMatrix();
  world.fg = []; world.ripples = [];
  const resources = new Set();
  let disposed = false;
  const pendingTextures = [];
  const sunDirection = new T.Vector3(.42, .48, -.77).normalize();
  const track = value => { resources.add(value); return value; };
  let seed = 81721;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const fract = x => x - Math.floor(x);
  const hash = (x, z) => fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453);
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function noise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    return mix(mix(hash(ix, iz), hash(ix + 1, iz), u), mix(hash(ix, iz + 1), hash(ix + 1, iz + 1), u), v);
  }
  function fbm(x, z) { return noise(x, z) * .58 + noise(x * 2.07, z * 2.07) * .28 + noise(x * 4.1, z * 4.1) * .14; }
  const river = z => 5 + Math.sin(z * .025) * 12 + Math.sin(z * .009) * 6;
  const riverWidth = z => 11 + 6 * Math.exp(-Math.pow((z + 25) / 55, 2));
  const waterY = 3.25;
  function terrainHeight(x, z) {
    const distance = Math.abs(x - river(z)) - riverWidth(z);
    if (distance < -2) return 1;
    if (distance < .5) return 2;
    const foothill = Math.max(0, distance - 3);
    const broad = fbm(x * .023 + 41, z * .023 + 19);
    const peakRight = 53 * Math.exp(-Math.pow((x - 63) / 38, 2) - Math.pow((z + 128) / 56, 2));
    const peakLeft = 42 * Math.exp(-Math.pow((x + 66) / 44, 2) - Math.pow((z + 180) / 58, 2));
    const distantRidge = 47 * Math.exp(-Math.pow((x - 24) / 94, 2) - Math.pow((z + 264) / 43, 2));
    const mountain = Math.max(peakRight, peakLeft, distantRidge) * (.49 + fbm(x*.058+8,z*.058+5)*.88);
    return Math.floor(4 + foothill * .10 + broad * Math.min(10, foothill * .36) + mountain);
  }
  const heightCache = new Map();
  function height(x, z) {
    x = Math.floor(x); z = Math.floor(z);
    const key = (x + 512) * 1024 + z + 512;
    if (!heightCache.has(key)) heightCache.set(key, terrainHeight(x, z));
    return heightCache.get(key);
  }

  function pixelTexture(kind) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const colors = { grass: [135, 164, 90], side: [120, 91, 59], dirt: [119, 89, 64], stone: [137, 139, 134], sand: [212, 205, 158], bark: [97, 79, 51], leaves: [77, 117, 43], spruce: [55, 88, 56], birch: [204, 205, 180], snow: [230, 236, 239] };
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      let base = colors[kind];
      if (kind === 'side' && y < 3 + Math.floor(hash(x, 4) * 3)) base = colors.grass;
      let tint = .89 + random() * .21;
      if (kind === 'bark') tint *= .72 + noise(x * 1.4, y * .2) * .55;
      if (kind === 'birch' && hash(Math.floor(x / 3), Math.floor(y / 2)) > .81) tint = .24;
      ctx.fillStyle = `rgb(${base.map(c => Math.round(c * tint)).join(',')})`;
      ctx.fillRect(x, y, 1, 1);
      if (kind === 'leaves' && random() > .95) ctx.clearRect(x, y, 1, 1);
    }
    const texture = track(new T.CanvasTexture(canvas));
    texture.magFilter = T.NearestFilter;
    texture.minFilter = T.NearestMipmapLinearFilter;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.encoding = T.sRGBEncoding;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const materials = {};
  const textureLoader = new T.TextureLoader();
  function loadTexture(name, apply) {
    const promise = textureLoader.loadAsync('/void/textures/' + name + '.png').then(texture => {
      if (disposed) { texture.dispose(); return texture; }
      track(texture); texture.magFilter = T.NearestFilter; texture.minFilter = T.NearestMipmapLinearFilter;
      texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.encoding = T.sRGBEncoding;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      apply(texture); return texture;
    });
    pendingTextures.push(promise); return promise;
  }
  function foliageMotion(material, amplitude, rooted = false) {
    material.onBeforeCompile = shader => {
      shader.uniforms.uWorldTime = world.uT;
      shader.uniforms.uLeafSun = { value: sunDirection };
      shader.vertexShader = 'uniform float uWorldTime; varying vec3 vLeafWorld;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vec4 leafWorld = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          leafWorld = instanceMatrix * leafWorld;
        #endif
        vLeafWorld = (modelMatrix * leafWorld).xyz;
        float tip = ${rooted ? 'uv.y * uv.y' : '1.0'};
        transformed.x += (sin(vLeafWorld.z * .32 + uWorldTime * .72) + sin(vLeafWorld.x * .51 + uWorldTime * 1.1) * .35) * ${amplitude.toFixed(3)} * tip;
        transformed.z += sin(vLeafWorld.x * .25 + uWorldTime * .61) * ${(amplitude * .4).toFixed(3)} * tip;
      `);
      shader.fragmentShader = 'uniform vec3 uLeafSun; varying vec3 vLeafWorld;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
        float throughLight = pow(max(0., dot(normalize(cameraPosition - vLeafWorld), -uLeafSun)), 3.);
        gl_FragColor.rgb += diffuseColor.rgb * throughLight * .24;
        #include <dithering_fragment>
      `);
    };
    material.customProgramCacheKey = () => 'void-foliage-' + amplitude + '-' + rooted;
  }
  for (const kind of ['grass', 'side', 'dirt', 'stone', 'sand', 'bark', 'leaves', 'spruce', 'birch', 'snow']) {
    const leafy = kind === 'leaves' || kind === 'spruce';
    materials[kind] = track(new T.MeshStandardMaterial({ map: pixelTexture(kind), roughness: leafy ? .86 : .94, metalness: 0, vertexColors: true, alphaTest: leafy ? .45 : 0, side: leafy ? T.DoubleSide : T.FrontSide }));
    if (kind === 'grass') materials[kind].color.setHex(0x95bb66);
    if (kind === 'leaves') materials[kind].color.setHex(0xb8bd98);
    if (kind === 'spruce') materials[kind].color.setHex(0xc4c6b3);
    loadTexture(kind, texture => { materials[kind].map = texture; materials[kind].needsUpdate = true; });
  }

  const grassCanvas = document.createElement('canvas'); grassCanvas.width = grassCanvas.height = 16;
  const gc = grassCanvas.getContext('2d');
  [[3,9,2,7],[6,5,2,11],[9,8,2,8],[12,10,2,6],[5,12,7,4]].forEach(([x,y,w,h],i)=>{ gc.fillStyle=['#6f8a35','#8da549','#a6b75a'][i%3]; gc.fillRect(x,y,w,h); });
  const grassMap = track(new T.CanvasTexture(grassCanvas)); grassMap.magFilter=T.NearestFilter; grassMap.encoding=T.sRGBEncoding;

  const loadedMaterials = new Map();
  const materialFor = name => {
    if (loadedMaterials.has(name)) return loadedMaterials.get(name);
    let material;
    if (name.startsWith('Voxel terrain: ')) material = materials[name.slice(15)];
    else if (name.startsWith('Voxel forest')) {
      const kind = name.split(': ')[1], source = materials[kind];
      material = track(source.clone());
      material.vertexColors = name.includes('canopy');
      if (material.vertexColors) foliageMotion(material, .055);
      pendingTextures.push(Promise.all([...pendingTextures]).then(() => { material.map = source.map; material.needsUpdate = true; }));
    } else {
      const kind = name === 'Voxel grass' ? 'grassTuft' : name.split(': ')[1];
      material = track(new T.MeshStandardMaterial({map:grassMap,alphaTest:.5,side:T.DoubleSide,roughness:1}));
      loadTexture(kind, texture => {material.map = texture;material.needsUpdate = true;});
      foliageMotion(material, kind === 'grassTuft' ? .10 : .045, true);
    }
    if (!material) throw new Error('Unknown baked world material: ' + name);
    loadedMaterials.set(name,material);return material;
  };
  window.restoreVoidWorldMeshes(T, root, track, materialFor, meshData);

  // Cache the noise lattice; the shader still animates and shades the clouds,
  // but no longer recomputes dozens of sine hashes per sky pixel every frame.
  const cloudCanvas = document.createElement('canvas'); cloudCanvas.width = cloudCanvas.height = 256;
  const cloudContext = cloudCanvas.getContext('2d'), cloudPixels = cloudContext.createImageData(256,256);
  for (let y=0;y<256;y++) for (let x=0;x<256;x++) {
    const i=(y*256+x)*4, value=Math.round(hash(x,y)*255);
    cloudPixels.data[i]=cloudPixels.data[i+1]=cloudPixels.data[i+2]=value; cloudPixels.data[i+3]=255;
  }
  cloudContext.putImageData(cloudPixels,0,0);
  const cloudNoise = track(new T.CanvasTexture(cloudCanvas));
  cloudNoise.wrapS=cloudNoise.wrapT=T.RepeatWrapping; cloudNoise.minFilter=cloudNoise.magFilter=T.LinearFilter; cloudNoise.generateMipmaps=false;
  // Clouds drift by a fraction of a pixel between frames. Shade the sky into
  // one shared HDR panorama, then sample it in the world and water reflection.
  // Camera movement still renders every frame; only the slow sky calculation
  // is cached, with immediate refreshes during a chapter's lighting change.
  const skyCache = track(new T.WebGLRenderTarget(1536, 768, {
    minFilter:T.LinearFilter, magFilter:T.LinearFilter, type:T.HalfFloatType,
    depthBuffer:false, stencilBuffer:false
  }));
  skyCache.texture.wrapS = T.RepeatWrapping;
  const skyUniforms = {uTime:world.uT,uSun:{value:sunDirection},uWarmth:{value:0},uCloudNoise:{value:cloudNoise}};
  const skyShader = track(new T.ShaderMaterial({
    depthTest:false, depthWrite:false, fog:false,
    uniforms:skyUniforms,
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
    fragmentShader:`
      precision highp float;
      varying vec2 vUv; uniform vec3 uSun; uniform float uTime, uWarmth;
      uniform sampler2D uCloudNoise;
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return texture2D(uCloudNoise,(i+f+.5)/256.).r;}
      float fbm(vec2 p){return noise(p)*.52+noise(p*2.03)*.27+noise(p*4.1)*.14+noise(p*8.21)*.07;}
      void main(){
        float phi=vUv.x*6.28318530718, theta=(1.-vUv.y)*3.14159265359;
        vec3 d=vec3(-cos(phi)*sin(theta),cos(theta),sin(phi)*sin(theta));
        float h=max(0.,d.y);
        vec3 sky=mix(vec3(.60,.74,.83),vec3(.055,.24,.48),pow(h,.45));
        float sun=clamp(dot(d,uSun),0.,1.);
        sky+=vec3(.61,.32,.10)*pow(sun,8.)+vec3(1.1,.66,.27)*pow(sun,80.);
        sky+=vec3(.06,.019,0.)*uWarmth*(1.-h);
        vec2 cloud=d.xz/(.13+max(.01,d.y))*2.8+vec2(uTime*.009,0.);
        float density=fbm(cloud+fbm(cloud*.31)*1.4);
        float c=smoothstep(.52,.72,density)*smoothstep(.025,.16,d.y);
        float shade=fbm(cloud+vec2(-.34,.12));
        vec3 litCloud=mix(vec3(.38,.47,.58),vec3(1.15,1.13,1.02),smoothstep(.43,.70,shade));
        litCloud+=vec3(.40,.22,.06)*pow(sun,8.);
        sky=mix(sky,litCloud,c*.93);
        vec3 right=normalize(cross(uSun,vec3(0.,1.,0.)));vec3 up=cross(right,uSun);
        float square=max(abs(dot(d,right)),abs(dot(d,up)));
        sky+=vec3(5.0,4.0,2.3)*(1.-smoothstep(.013,.015,square))*step(.9,sun);
        gl_FragColor=vec4(sky,1.);
      }`
  }));
  const skyStage = new T.Scene();
  skyStage.add(new T.Mesh(track(new T.PlaneGeometry(2, 2)), skyShader));
  const skyCamera = new T.Camera();
  const sky = new T.Mesh(track(new T.SphereGeometry(500, 32, 20)),track(new T.ShaderMaterial({
    side:T.BackSide, depthWrite:false, fog:false,
    uniforms:{uSky:{value:skyCache.texture}},
    vertexShader:'varying vec3 vDirection; void main(){ vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader:`
      varying vec3 vDirection; uniform sampler2D uSky;
      void main(){
        vec3 d=normalize(vDirection);
        vec2 uv=vec2(atan(d.z,-d.x)/6.28318530718,1.-acos(clamp(d.y,-1.,1.))/3.14159265359);
        gl_FragColor=texture2D(uSky,uv);
      }`
  })));
  let skyTime = -1, skyWarmth = -1, skyUpdates = 0;
  function refreshSky() {
    const time = world.uT.value, warmth = skyUniforms.uWarmth.value;
    if (skyTime >= 0 && time - skyTime < .15 && Math.abs(warmth - skyWarmth) < .02) return;
    const target = renderer.getRenderTarget(), viewport = new T.Vector4();
    renderer.getViewport(viewport);
    try { renderer.setRenderTarget(skyCache); renderer.render(skyStage,skyCamera); }
    finally { renderer.setRenderTarget(target); renderer.setViewport(viewport); }
    skyTime = time; skyWarmth = warmth; skyUpdates++;
  }
  sky.name='Daylight sky with animated clouds'; sky.renderOrder=-10; scene.add(sky);

  const hemisphere = new T.HemisphereLight(0xc1dcff,0x354728,.85); scene.add(hemisphere);
  const sun = new T.DirectionalLight(0xffe1ad,3.1);
  sun.target.position.set(0,0,-64); sun.position.copy(sun.target.position).addScaledVector(sunDirection,190); scene.add(sun.target);
  if(shadows){
    sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-104,right:104,top:120,bottom:-112,near:1,far:355});
    sun.shadow.bias=-.00013; sun.shadow.normalBias=.025; sun.shadow.radius=3;
    sun.shadow.autoUpdate=false; sun.shadow.needsUpdate=true;
  }
  world.key=sun; scene.add(sun);
  const ambient = new T.AmbientLight(0xb8c8af,.065); scene.add(ambient);

  const reflection = track(new T.WebGLRenderTarget(768,512,{ minFilter:T.LinearFilter,magFilter:T.LinearFilter,type:T.HalfFloatType,depthBuffer:true }));
  const reflectionCamera = new T.PerspectiveCamera();
  const reflectionMatrix = new T.Matrix4();
  const textureMatrix = new T.Matrix4();
  const waterMat = track(new T.ShaderMaterial({
    transparent:false,side:T.DoubleSide,
    uniforms:{uTime:world.uT,uReflection:{value:reflection.texture},uTextureMatrix:{value:textureMatrix},uSun:{value:sunDirection},uFog:{value:scene.fog.color}},
    vertexShader:`
      varying vec3 vWorld; varying vec4 vReflection; uniform mat4 uTextureMatrix;
      void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;vReflection=uTextureMatrix*world;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`
      precision highp float;
      varying vec3 vWorld; varying vec4 vReflection;
      uniform sampler2D uReflection; uniform float uTime; uniform vec3 uSun; uniform vec3 uFog;
      float river(float z){return 5.+sin(z*.025)*12.+sin(z*.009)*6.;}
      void main(){
        vec2 p=vWorld.xz; float t=uTime;
        float a=sin(p.x*.71+p.y*.33+t*.44),b=sin(p.x*1.37-p.y*.59-t*.60);
        float c=sin(p.x*2.17+p.y*1.67+t*.72);
        vec3 n=normalize(vec3(a*.030+b*.014,1.,b*.025+c*.012));
        vec3 view=normalize(cameraPosition-vWorld);
        float fresnel=.10+.86*pow(1.-max(0.,dot(n,view)),3.8);
        vec2 uv=vReflection.xy/vReflection.w+n.xz*.018;
        vec3 reflected=texture2D(uReflection,clamp(uv,.002,.998)).rgb;
        float bank=abs(p.x-river(p.y))-(11.+6.*exp(-pow((p.y+25.)/55.,2.)));
        float shallow=smoothstep(-6.,1.,bank);
        vec3 water=mix(vec3(.012,.14,.13),vec3(.20,.33,.20),shallow*.87);
        vec3 col=mix(water,reflected,fresnel);
        float spec=pow(max(0.,dot(reflect(-uSun,n),view)),260.);
        col+=vec3(4.0,2.9,1.3)*spec;
        float ripple=pow(max(0.,sin(p.x*1.4+p.y*.8+t*.65)*sin(p.y*3.-t*.4)),18.);
        col+=vec3(.15,.23,.17)*ripple*shallow*.14;
        float mist=1.-exp(-pow(length(cameraPosition-vWorld)*.0024,2.));
        col=mix(col,uFog,mist*.68);
        gl_FragColor=vec4(col,1.);
      }`
  }));
  const water=new T.Mesh(track(new T.PlaneGeometry(330,380)),waterMat);
  water.rotation.x=-Math.PI/2; water.position.set(0,waterY,-113); water.name='Reflective river with animated surface';
  root.add(water); world.water=water;
  let reflectedFrame=-1, isReflecting=false, lastWidth=0,lastHeight=0, lastReflectionTime=-1, reflectionQuality=1, reflectionUpdates=0;
  const lastReflectionPosition = new T.Vector3(1e6,1e6,1e6), lastReflectionRotation = new T.Quaternion();
  const look=new T.Vector3(), reflectionViewport=new T.Vector4();
  water.onBeforeRender=(r,s,cameraForPass)=>{
    if(isReflecting || cameraForPass.position.y<waterY || reflectedFrame===r.info.render.frame) return;
    const w=Math.max(320,Math.round(Math.min(low?640:960,r.domElement.width*.6)*reflectionQuality));
    const h=Math.max(128,Math.round(w/r.domElement.width*r.domElement.height));
    // Reproject the cached reflection between updates. Small camera drift should
    // not redraw the entire valley every frame; large moves and resizes refresh immediately.
    const now=performance.now(), interval=reflectionQuality < .8 ? 100 : 50;
    if (w===lastWidth && h===lastHeight && lastReflectionTime>=0 && now-lastReflectionTime<interval
      && lastReflectionPosition.distanceToSquared(cameraForPass.position)<4
      && Math.abs(lastReflectionRotation.dot(cameraForPass.quaternion))>.999) return;
    reflectedFrame=r.info.render.frame;
    lastReflectionTime=now; lastReflectionPosition.copy(cameraForPass.position); lastReflectionRotation.copy(cameraForPass.quaternion);
    if(w!==lastWidth||h!==lastHeight){reflection.setSize(w,h);lastWidth=w;lastHeight=h;}
    reflectionCamera.copy(cameraForPass);
    reflectionCamera.layers.set(0);
    reflectionCamera.position.y=waterY*2-cameraForPass.position.y;
    cameraForPass.getWorldDirection(look); look.add(cameraForPass.position); look.y=waterY*2-look.y;
    reflectionCamera.up.set(0,-1,0); reflectionCamera.lookAt(look); reflectionCamera.updateMatrixWorld();
    reflectionMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
    textureMatrix.copy(reflectionMatrix).multiply(reflectionCamera.projectionMatrix).multiply(reflectionCamera.matrixWorldInverse);
    const target=r.getRenderTarget(), xr=r.xr.enabled, shadowUpdate=r.shadowMap.autoUpdate;
    r.getViewport(reflectionViewport);
    isReflecting=true;water.visible=false;r.xr.enabled=false;r.shadowMap.autoUpdate=false;
    try{r.setRenderTarget(reflection);r.clear();r.render(s,reflectionCamera);reflectionUpdates++;}finally{
      water.visible=true;r.xr.enabled=xr;r.shadowMap.autoUpdate=shadowUpdate;r.setRenderTarget(target);r.setViewport(reflectionViewport);isReflecting=false;
    }
  };

  world.landscape={root,water,sky,treeCount:meshData.meta.treeCount,blockCount:meshData.meta.blockCount,meshSource:"baked",reflection,
    heightAt: height,
    ready: Promise.all(pendingTextures),
    compileSky() { renderer.compile(skyStage, skyCamera); },
    get skyUpdates() { return skyUpdates; },
    get reflectionUpdates() { return reflectionUpdates; },
    setQuality(scale) { reflectionQuality = Math.max(.6, scale); },
    update(progress, focus) {
      skyUniforms.uWarmth.value = progress / 5;
      refreshSky();
      sun.intensity = 3.1 - progress * .055 + focus * .09;
    },
    invalidate() { skyTime = -1; lastReflectionTime = -1; reflectedFrame = -1; lastReflectionPosition.set(1e6,1e6,1e6); },
    dispose(){ if (disposed) return; disposed = true; water.onBeforeRender=()=>{};resources.forEach(r=>r.dispose());scene.remove(root,sky,sun,sun.target,hemisphere,ambient); }
  };
  return world.landscape;
};
