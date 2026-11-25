/* Browser implementation of ClickGUIModules.cpp. No Minecraft connection. */
(() => {
  'use strict';
  const D = window.__voidNativeData;
  const copy = value => structuredClone(value);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const stepped = (s,v) => Number(((s.min??0)+Math.round((v-(s.min??0))/(s.step??1))*(s.step??1)).toPrecision(12));
  const rgba = c => `rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${c.a ?? 1})`;
  const hex = c => '#' + ['r','g','b'].map(k=>Math.round(clamp(c[k],0,1)*255).toString(16).padStart(2,'0')).join('');
  const fromHex = (s, a=1) => ({r:parseInt(s.slice(1,3),16)/255,g:parseInt(s.slice(3,5),16)/255,b:parseInt(s.slice(5,7),16)/255,a});
  function hsv(c){const max=Math.max(c.r,c.g,c.b),min=Math.min(c.r,c.g,c.b),d=max-min;let h=0;if(d)h=(max===c.r?(c.g-c.b)/d+(c.g<c.b?6:0):max===c.g?(c.b-c.r)/d+2:(c.r-c.g)/d+4)*60;return {h,s:max?d/max:0,v:max};}
  function rgb({h,s,v},a=1){const f=n=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1));};return {r:f(5),g:f(3),b:f(1),a};}
  const bool = (id,name,def,description='') => ({id,name,default:def,type:'bool',description});
  const num = (id,name,def,min,max,step,description='') => ({id,name,default:def,type:'float',min,max,step,description});
  const opt = (id,name,def,options) => ({id,name,default:def,type:'enum',options:options.map((name,value)=>({name,value}))});
  const G = [
    {id:'menuKey',name:'ClickGUI Menu Key',type:'key',default:77,section:'General'},
    {id:'ejectKey',name:'Emergency Eject Key',type:'key',default:35,section:'General'},
    {...bool('centerCursor','Center Cursor on Open',false,'Puts mouse in middle of window'),section:'General'},
    {...bool('snapLines','HUD Snapping',true),section:'General'},
    {...bool('useDX11','Force DirectX 11',false),section:'Graphics'},
    {...bool('forceDisableVSync','Disable VSync',false),section:'Graphics'},
    {...bool('menuBlurEnabled','Liquid Glass Backdrop Refraction',true),section:'Graphics'},
    {...num('menuIntensity','Backdrop Refraction Intensity',20,1,25,1),section:'Graphics'},
    {...bool('minViewBob','Minimal View Bobbing',false),section:'Graphics'},
    {...bool('minecraftRenderer','Use Minecraft Renderer',false),section:'Graphics'},
    {id:'secondaryFont',name:'Secondary Font',type:'text',default:'Segoe UI',section:'Language'},
    {...bool('textShadow','Text Drop Shadows',true),section:'Language'},
    {...opt('mcRendererFont','Minecraft Renderer Font',0,['Default','Noto Sans']),section:'Language'},
    {...num('rgbSpeed','RGB Speed',1,0,3,.1),section:'Theme'},
    {id:'accentColor',name:'Accent Color',section:'Theme',type:'color',default:{color1:{r:50/255,g:57/255,b:118/255,a:1},color2:{r:0,g:0,b:0,a:1},color3:{r:0,g:0,b:0,a:1},isRGB:false,isChroma:false,numColors:1,chromaSpeed:0,chromaDirection:180}},
  ];
  const E = [bool('engineEnabled','VOID Engine Enabled',true),
    num('budgetMs','VOID Work Budget',1,.5,5,.1,'Maximum optional work per frame (ms)'),
    bool('stutterReduction','Micro-Stutter Smoothing',true),bool('updateThrottling','Background Task Throttling',true),
    bool('framePacing','Frame Pacing',true),bool('batching','Draw Submission Batching',true),
    bool('stateCaching','VOID Vertex Color Reuse',true),bool('distanceCulling','Smart Entity Distance Culling',true),
    num('maxDist','Entity Culling Distance',64,16,256,1,'Blocks'),
    num('horizon','Distant Worlds Horizon',64,32,192,1,'Chunks'),
    num('memoryBudgetMb','Memory Budget',32,32,512,1,'MB'),bool('autoEviction','Automated Cache Eviction',true),
    num('statsIntervalMs','Statistics Update Interval',250,125,1000,25,'ms'),
    num('batchVertices','Batch Vertices',64,64,512,64),num('workers','Worker Limit',0,0,8,1),
    num('lodQuality','LOD Quality',1,0,2,1),num('generationSpeed','Generation Speed',1,1,4,1),
    bool('automaticProfile','Automatic Profile',true),
  ];
  const gear = Array.from({length:48},(_,i)=>{const a=i*Math.PI*2/48,r=[1,2,3].includes(i%6)?14:10.7;return `${i?'L':'M'}${16+Math.cos(a)*r} ${16+Math.sin(a)*r}`;}).join(' ')+'Z';
  const shapes = {
    Modules:'<rect x="5.5" y="5.5" width="8" height="8" rx="2.2"/><rect x="18.5" y="5.5" width="8" height="8" rx="2.2"/><rect x="5.5" y="18.5" width="8" height="8" rx="2.2"/><rect x="18.5" y="18.5" width="8" height="8" rx="2.2"/>',
    Settings:`<path d="${gear}"/><circle cx="16" cy="16" r="4.5"/>`,
    Cosmetics:'<path d="M16 4.5C23.5 4.5 27.5 8.5 27.5 15.5C27.5 20.5 24.5 26.5 18.5 27.5C15.5 27.5 13.5 24.5 14.5 21.5C15.5 18.5 12.5 19.5 8.5 22.5C4.5 21.5 4.5 14.5 6.5 9.5C8.5 4.5 12.5 4.5 16 4.5Z"/><circle cx="11" cy="11" r="1.3"/><circle cx="17" cy="9" r="1.3"/><circle cx="22" cy="13" r="1.3"/>',
    Configs:'<path d="M9 4.5H18L24.5 11V26Q24.5 27.5 23 27.5H9Q7.5 27.5 7.5 26V6Q7.5 4.5 9 4.5ZM18 4.5V11H24.5M11 16H21M11 21H21"/>',
    'HUD Editor':'<rect x="4" y="5.5" width="24" height="16" rx="2"/><path d="M16 21.5V25.5M11 25.5H21M8 9H14V13.5H8ZM18.5 13.5H24M21.25 11V16"/>',
    Close:'<path d="M10 10L22 22M22 10L10 22"/>',Search:'<circle cx="13" cy="13" r="8"/><path d="M19 19L27 27"/>',Back:'<path d="M19 8L11 16L19 24"/>',
  };
  const icon = name => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.Modules}</svg>`;
  const keyNames = {0:'None',1:'Mouse 1',2:'Mouse 2',4:'Mouse 3',5:'Mouse 4',6:'Mouse 5',9:'Tab',13:'Enter',16:'Shift',17:'Ctrl',18:'Alt',20:'Caps Lock',27:'Esc',32:'Space',33:'Page Up',34:'Page Down',35:'End',36:'Home',37:'Left',38:'Up',39:'Right',40:'Down',45:'Insert',46:'Delete',160:'L Shift',161:'R Shift',162:'L Ctrl',163:'R Ctrl'};
  const keyName = n => keyNames[n] || (n>=112 && n<=135 ? 'F'+(n-111) : n>=48 && n<=90 ? String.fromCharCode(n) : 'Key '+n);
  const defaults = () => ({modules:Object.fromEntries(D.modules.map(m=>[m.id,{enabled:m.enabled,values:Object.fromEntries(m.settings.filter(s=>s.type!=='action').map(s=>[s.id,copy(s.initial??s.default)]))}])),
    global:Object.fromEntries(G.map(s=>[s.id,copy(s.default)])),language:'en_US',theme:copy(D.themes[0]),engine:{...Object.fromEntries(E.map(s=>[s.id,s.default])),profile:3,distantWorldsEnabled:false},hud:{}});
  function sanitizeValue(s,v) {
    if (s.type==='bool') return typeof v==='boolean'?v:s.default;
    if (s.type==='text') return typeof v==='string'?v.slice(0,512):s.default;
    if (s.type==='enum') return s.options.some(o=>o.value===v)?v:s.default;
    if (['float','int','key'].includes(s.type)) return Number.isFinite(v)?clamp(s.type==='float'?v:Math.round(v),s.min ?? 0,s.max ?? (s.type==='key'?255:100000)):s.default;
    if (s.type==='color') {
      const out=copy(s.default);
      for (const key of ['color1','color2','color3']) for (const ch of ['r','g','b','a']) if(Number.isFinite(v?.[key]?.[ch]))out[key][ch]=clamp(v[key][ch],0,1);
      for (const key of ['isRGB','isChroma']) if(typeof v?.[key]==='boolean')out[key]=v[key];
      for(const [key,min,max] of [['numColors',1,3],['chromaSpeed',0,10],['chromaDirection',0,360]]) if(Number.isFinite(v?.[key]))out[key]=clamp(v[key],min,max);
      out.numColors=Math.round(out.numColors);return out;
    }
    if(s.type==='vec2')return {x:Number.isFinite(v?.x)?clamp(v.x,0,1):0,y:Number.isFinite(v?.y)?clamp(v.y,0,1):0};
    if(s.type==='snap')return {doSnapping:!!v?.doSnapping,type:Number.isInteger(v?.type)?clamp(v.type,0,4):0,pos:Number.isFinite(v?.pos)?clamp(v.pos,-10000,10000):0,idx:Number.isInteger(v?.idx)?clamp(v.idx,0,100):0,module:D.modules.some(m=>m.id===v?.module)?v.module:''};
    return copy(s.default);
  }
  function sanitize(raw) {
    const out=defaults();
    for(const m of D.modules){const incoming=raw?.modules?.[m.id];if(typeof incoming?.enabled==='boolean'&&!m.action&&!m.hold)out.modules[m.id].enabled=incoming.enabled;
      for(const s of m.settings)if(s.type!=='action'&&incoming?.values?.[s.id]!==undefined)out.modules[m.id].values[s.id]=sanitizeValue(s,incoming.values[s.id]);}
    for(const s of G)out.global[s.id]=sanitizeValue(s,raw?.global?.[s.id]);
    for(const s of E)out.engine[s.id]=sanitizeValue(s,raw?.engine?.[s.id]);
    if(Number.isInteger(raw?.engine?.profile))out.engine.profile=clamp(raw.engine.profile,0,5);
    if(D.languages.some(l=>l.id===raw?.language))out.language=raw.language;
    const preset=D.themes.find(t=>t.name===raw?.theme?.name);if(preset)out.theme=copy(preset);
    for(const [key,v] of Object.entries(out.theme)){
      if(typeof v==='object'){for(const ch of ['r','g','b','a'])if(Number.isFinite(raw?.theme?.[key]?.[ch]))out.theme[key][ch]=clamp(raw.theme[key][ch],0,1);}
      else if(typeof v==='number'&&Number.isFinite(raw?.theme?.[key]))out.theme[key]=clamp(raw.theme[key],0,1);
    }
    for(const m of D.modules.filter(m=>m.hud)){const p=raw?.hud?.[m.id];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))out.hud[m.id]={x:clamp(p.x,0,1),y:clamp(p.y,0,1)};}
    return out;
  }
  window.createVoidNativeUI = root => {
    const abort=new AbortController(),on=(el,type,fn,options={})=>el.addEventListener(type,fn,{...options,signal:abort.signal});
    const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)];
    let state=defaults(),configs=[{name:'default',state:defaults()}],active='default';
    try{const stored=JSON.parse(localStorage.getItem('void-native-ui-v1'));if(stored){state=sanitize(stored.state);if(Array.isArray(stored.configs)){configs=stored.configs.slice(0,50).filter(c=>typeof c?.name==='string').map(c=>({name:c.name.slice(0,60),state:sanitize(c.state)}));if(!configs.some(c=>c.name==='default'))configs.unshift({name:'default',state:defaults()});}if(configs.some(c=>c.name===stored.active))active=stored.active;}}catch{}
    let view='Modules',selected=null,category='All',query='',settingsTab='All',engineTab='Overview',engineOpen=true,closed=false,capture=null,colorEdit=null,colorDrag=false,drag=null,bench=null,benchRAF=0,toastTimer=0,visible=false;
    let saveTimer=0,layoutRAF=0,mounted=false,nearObserver=null,disposed=false;
    const persist=()=>{clearTimeout(saveTimer);saveTimer=0;try{localStorage.setItem('void-native-ui-v1',JSON.stringify({state,configs,active}));}catch{toast('Browser storage is full or unavailable. Export a config to keep your changes.');}};
    const save=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(persist,150);};
    const tr=(obj,field='name')=>D.languages.find(l=>l.id===state.language)?.translations?.[obj[field+'Key']] || obj[field] || '';
    const mod=id=>D.modules.find(m=>m.id===id),values=id=>id==='global'?state.global:id==='engine'?state.engine:state.modules[id].values;
    const schema=(owner,id)=>(owner==='global'?G:owner==='engine'?E:mod(owner)?.settings)?.find(s=>s.id===id);
    const button=(label,action,extra='',cls='')=>`<button type="button" class="n-button ${cls}" data-action="${action}" ${extra}>${label}</button>`;
    const tabs=(items,current,kind)=>`<div class="n-tabs" role="tablist" aria-label="${kind}">${items.map(c=>`<button type="button" role="tab" aria-selected="${c===current}" data-${kind}="${c}">${esc(c)}</button>`).join('')}</div>`;
    const keyButton=(owner,id,label)=>`<button type="button" class="n-button n-key" data-key-owner="${owner}" data-key-id="${id}" aria-label="${esc(label)} key binding">${esc(keyName(values(owner)[id]))}</button>`;
    function toast(text){const out=$('.n-toast');if(out){out.textContent=text;out.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{out.hidden=true;},5500);}}
    function toggle(m){if(m.action){message(tr(m),'This action opens the in-game player/skin picker. Join a Minecraft world to choose a player.');return;}if(m.hold){captureKey(m.id,'key');return;}state.modules[m.id].enabled=!state.modules[m.id].enabled;save();render();}
    function control(s,owner,global=false){
      if(s.internal||s.id==='key'&&!global||s.when&&values(owner)[s.when.id]!==s.when.equals)return '';
      const v=values(owner)[s.id],name=tr(s),attrs=`data-owner="${owner}" data-setting="${s.id}"`,label=`<span class="n-label">${esc(name)}${global&&s.description?`<small>${esc(tr(s,'description'))}</small>`:''}</span>`;
      let input='';
      if(s.type==='bool')input=`<label class="n-setting n-check ${global?'n-global-check':''}" title="${esc(tr(s,'description'))}"><input type="checkbox" ${attrs} ${v?'checked':''}><span class="n-checkmark"></span>${label}</label>`;
      else{
        if(s.type==='key')input=keyButton(owner,s.id,name);
        if(s.type==='text')input=`<input type="text" maxlength="512" value="${esc(v)}" aria-label="${esc(name)}" ${attrs}>`;
        if(s.type==='enum')input=`<select aria-label="${esc(name)}" ${attrs}>${s.options.map(o=>`<option value="${o.value}" ${v===o.value?'selected':''}>${esc(tr(o))}</option>`).join('')}</select>`;
        if(s.type==='float'||s.type==='int')input=`<span class="n-slider"><input type="range" min="${s.min??0}" max="${s.max??100}" step="any" value="${v}" aria-label="${esc(name)}" ${attrs}><input type="number" min="${s.min??0}" max="${s.max??100}" step="${s.step??1}" value="${v}" aria-label="${esc(name)} value" ${attrs}></span>`;
        if(s.type==='color')input=`<button type="button" class="n-color" data-color-owner="${owner}" data-color-id="${s.id}" aria-label="${esc(name)} color" style="--color:${rgba(v.color1)}"><span></span>${hex(v.color1).toUpperCase()}</button>`;
        if(s.type==='action')input=button(esc(name),'module-action',`data-module="${owner}" data-setting="${s.id}"`);
        input=`<div class="n-setting" title="${esc(tr(s,'description'))}">${label}${input}</div>`;
      }
      return input;
    }
    function card(m){const enabled=state.modules[m.id].enabled;
      return `<article class="n-module ${enabled?'is-enabled':''}" data-module-card="${m.id}"><button type="button" class="n-module-label" data-action="toggle" data-module="${m.id}" title="${esc(tr(m,'description'))}" aria-label="${esc(tr(m))}: ${enabled?'enabled':'disabled'}"><strong>${esc(tr(m))}</strong><span>${esc(tr(m,'description'))}</span></button><button type="button" class="n-gear" data-action="module" data-module="${m.id}" aria-label="${esc(tr(m))} settings">${icon('Settings')}</button>${m.hold?`<button type="button" class="n-hold n-button" data-key-owner="${m.id}" data-key-id="key" title="Hold this key while the preview is focused">${esc(keyName(values(m.id).key))}</button>`:m.action?button('Open','toggle',`data-module="${m.id}"`,'n-open-action'):`<button type="button" class="n-switch" data-action="toggle" data-module="${m.id}" role="switch" aria-checked="${enabled}" aria-label="${esc(tr(m))}"><span></span></button>`}</article>`;
    }
    function filtered(){return D.modules.filter(m=>(category==='All'||D.categories[m.category]===category)&&`${tr(m)} ${tr(m,'description')} ${m.id}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a,b)=>tr(a).localeCompare(tr(b)));}
    function grid(){const list=filtered();return list.length?list.map(card).join(''):`<div class="n-empty"><h4>No matching modules</h4>${button('Reset filters','reset-filters')}</div>`;}
    function modulesView(){if(selected){const m=mod(selected),s=state.modules[m.id];return `<div class="n-module-actions">${button('Back to modules','back')}${button('Reset settings','reset-module')}</div><section class="n-settings-panel"><header class="n-module-heading"><div><h4>${esc(tr(m))}</h4><p>${esc(tr(m,'description'))}</p></div><div class="n-module-state">${m.settings.some(s=>s.id==='key')?keyButton(m.id,'key',tr(m)):''}${button(m.action?'Open':m.hold?'Hold key':s.enabled?'Enabled':'Disabled','toggle',`data-module="${m.id}"`,s.enabled?'is-gold':'')}</div></header><div class="n-scroll n-module-settings">${m.settings.map(s=>control(s,m.id)).join('')||'<p class="n-muted">This module has no additional settings.</p>'}</div></section>`;}
      return `<div class="n-toolbar">${tabs(D.categories,category,'category')}<label class="n-search">${icon('Search')}<input type="search" placeholder="Search modules..." aria-label="Search modules" value="${esc(query)}" maxlength="128">${button('×','clear-search','aria-label="Clear search"')}</label></div><div class="n-scroll n-grid" aria-label="Modules">${grid()}</div>`;
    }
    function themeView(){
      const t=state.theme;
      const hasColor=c=>c&&['r','g','b'].every(key=>Number.isFinite(c[key]));
      const presets=D.themes.filter(theme=>hasColor(theme.accent));
      const palettes=presets.length?`<div class="n-presets">${presets.map(theme=>button(`<i style="background:${rgba(theme.accent)}"></i>${esc(theme.name)}`,'theme',`data-theme="${theme.name}" aria-pressed="${state.theme.name===theme.name}"`)).join('')}</div>`:'<p class="n-muted">Theme presets are unavailable in this website preview.</p>';
      const colors=Object.entries(t).filter(([,color])=>hasColor(color));
      const custom=colors.length?`<details class="n-theme-details"><summary>Customize theme colors</summary>${colors.map(([key,color])=>`<label class="n-setting"><span>${key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())}</span><input type="color" data-theme-color="${key}" value="${hex(color)}" aria-label="${key} color"><input type="number" data-theme-alpha="${key}" value="${color.a??1}" min="0" max="1" step=".05" aria-label="${key} opacity"></label>`).join('')}${['backgroundAlpha','buttonAlpha'].filter(key=>Number.isFinite(t[key])).map(key=>`<label class="n-setting">${key==='backgroundAlpha'?'Background opacity':'Button opacity'}<input type="range" data-theme-scalar="${key}" min="0" max="1" step=".01" value="${t[key]}"></label>`).join('')}</details>`:'';
      return `<section class="n-section"><h4>Theme</h4>${palettes}${custom}${G.filter(s=>s.section==='Theme').map(s=>control(s,'global',true)).join('')}</section>`;
    }
    function settingsView(){const section=(name,title,extra='')=>`<section class="n-section"><h4>${title}</h4>${G.filter(s=>s.section===name).map(s=>control(s,'global',true)).join('')}${extra}</section>`;
      return `<div class="n-toolbar">${tabs(['All','General','Graphics','Theme','Language','VOID Engine'],settingsTab,'settings-tab')}</div><div class="n-scroll n-general-settings">${settingsTab==='All'||settingsTab==='General'?section('General','General'):''}${settingsTab==='All'||settingsTab==='Graphics'?section('Graphics','Graphics'):''}${settingsTab==='All'||settingsTab==='Theme'?themeView():''}${settingsTab==='All'||settingsTab==='Language'?section('Language','Language & Fonts',`<label class="n-setting"><span>Language</span><select aria-label="Language" data-language>${D.languages.map(l=>`<option value="${l.id}" ${l.id===state.language?'selected':''}>${esc(l.name)}</option>`).join('')}</select></label>`):''}${settingsTab==='All'||settingsTab==='VOID Engine'?engineView():''}</div>`;
    }
    function engineView(){const controls=ids=>ids.map(id=>control(E.find(s=>s.id===id),'engine',true)).join('');
      const names=['Overview','Performance','Rendering','Distant Worlds','Memory','Diagnostics','Profiles'];
      let body='';
      if(engineTab==='Overview')body=controls(['engineEnabled'])+'<p class="n-muted">CPU / GPU: available in Minecraft</p><div class="n-metrics">'+['Average Framerate','1% Low','Delta (Median)','VOID Update / Present'].map(n=>`<div><b>—</b><small>${n}</small></div>`).join('')+'</div>';
      if(engineTab==='Performance')body=controls(['budgetMs','stutterReduction','updateThrottling','framePacing']);
      if(engineTab==='Rendering')body=controls(['batching','stateCaching','distanceCulling','maxDist']);
      if(engineTab==='Distant Worlds')body='<p class="n-unavailable">Distant Worlds — Unavailable in this build</p>'+controls(['horizon','lodQuality','generationSpeed'])+'<p class="n-muted">Cached chunks: — · Queued jobs: — · Memory: —</p>';
      if(engineTab==='Memory')body=controls(['memoryBudgetMb','autoEviction'])+button('Purge Engine Caches','purge');
      if(engineTab==='Diagnostics')body='<p class="n-muted">Browser frame benchmark · Game diagnostics require Minecraft.</p><canvas class="n-frame-chart" width="700" height="100" aria-label="Browser frame time history"></canvas><div class="n-benchmark" aria-live="polite">'+benchmarkText()+'</div>'+button(bench?.running?'Cancel benchmark':'Start 60s Benchmark',bench?.running?'cancel-benchmark':'benchmark')+' '+button('Reset results','reset-benchmark')+controls(['statsIntervalMs']);
      if(engineTab==='Profiles')body=controls(['automaticProfile'])+`<p class="n-muted">${state.engine.automaticProfile?'Automatic':'Manual'} profile · ${['Low-End','Smooth Game','Max FPS','Balanced','High Quality','Custom'][state.engine.profile]}</p><div class="n-presets">${['Low-End','Smooth Game','Max FPS','Balanced','High Quality'].map((name,i)=>button(name,'profile',`data-profile="${i}" aria-pressed="${state.engine.profile===i}"`)).join('')}</div>`+controls(['batchVertices','workers']);
      return `<section class="n-section n-engine"><header><div><h4>VOID Engine</h4><p>Hardware-adaptive VOID workload controls and diagnostics</p></div><span class="n-status-pill">${state.engine.engineEnabled?'Active':'Standby'}</span>${button(engineOpen?'Collapse':'Expand','engine-expand')}</header>${engineOpen?tabs(names,engineTab,'engine-tab')+`<div class="n-engine-body">${body}</div>`:''}</section>`;
    }
    function configsView(){return `<div class="n-config-toolbar">${button('+ New Config','new-config')}${button('Restore Defaults','defaults')}${button('Save Current State','save-config')}<label class="n-button n-import">Import<input type="file" accept=".json,application/json" data-import aria-label="Import configuration"></label></div><div class="n-scroll n-configs">${configs.map((c,i)=>`<article class="n-config"><div><strong>${esc(c.name)}</strong><span>${active===c.name?'ACTIVE':'Saved profile'}</span></div><div>${active===c.name?'':button('Load','load-config',`data-index="${i}"`)}${button('Export','export-config',`data-index="${i}"`)}${button('Duplicate','duplicate-config',`data-index="${i}"`)}${c.name==='default'?'':button('Delete','delete-config',`data-index="${i}"`)}</div></article>`).join('')}</div>`;}
    function hudSample(m){const v=values(m.id),sample={FPS:'60',CPS:v.Mode===2?'0 | 0':'0',Clock:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),CustomCoordinates:'X: 0  Y: 64  Z: 0',MovableCoordinates:'Position: 0, 64, 0',ComboCounter:'0',ReachDisplay:(0).toFixed(v.decimals??2),FrameTimeDisplay:'16.7',PingDisplay:'0',SpeedDisplay:'0.0',ServerDisplay:'World',ItemCounter:'64',BowIndicator:'0%',BreakProgress:'0%',PlayerList:'Player',MovableScoreboard:'Scoreboard\nPlayer  0'};
      if(m.id==='Keystrokes')return '<span class="n-keys-preview"><i>W</i><span><i>A</i><i>S</i><i>D</i></span><span><i>LMB</i><i>RMB</i></span><em>SPACE</em></span>';
      if(m.id==='Direction')return '<span class="n-compass">╵ ╵ ╵ N ╵ ╵ ╵ NE ╵ ╵ ╵ E</span>';
      if(m.id==='ArmorHUD')return '<span class="n-armor">♜ ◇ ♜ ♧ ⚔</span>';
      if(m.id==='MovableBossbar')return '<span class="n-bossbar">Boss<span></span></span>';
      if(m.id==='Paperdoll')return '<span class="n-paperdoll"><i></i><b></b><em></em></span>';
      if(m.id==='BlockGame')return '<span class="n-blockgame">▦<br>▟ ▙ ▛<br>▜▟▙▛</span>';
      return esc((v.prefix||'')+(sample[m.id]||tr(m))+(v.suffix||''));
    }
    function hudView(){const enabled=D.modules.filter(m=>m.hud&&state.modules[m.id].enabled);return `<div class="n-hud-tools">${button('Done / Return','hud-done')}${button('Snapping: '+(state.global.snapLines?'ON':'OFF'),'snap')}${button('Reset Layout','reset-layout')}<details class="n-hud-add"><summary class="n-button">HUD modules</summary><div>${D.modules.filter(m=>m.hud).map(m=>`<label><input type="checkbox" data-hud-toggle="${m.id}" ${state.modules[m.id].enabled?'checked':''}>${esc(tr(m))}</label>`).join('')}</div></details></div><div class="n-hud-canvas" tabindex="0" aria-label="HUD layout canvas"><div class="n-snap-x"></div><div class="n-snap-y"></div>${enabled.length?enabled.map((m,i)=>{const p=state.hud[m.id]||{x:.04+(i%4)*.24,y:.08+Math.floor(i/4)*.14};return `<button type="button" class="n-hud-widget" data-hud="${m.id}" aria-label="Move ${esc(tr(m))}" title="${esc(tr(m))}: drag to move, wheel to scale, R to reset, right-click to disable" style="left:${p.x*100}%;top:${p.y*100}%;--hud-scale:${Math.max(.1,values(m.id).scale??1)}">${hudSample(m)}</button>`;}).join(''):'<div class="n-empty"><h4>Choose your HUD modules</h4><p>Enable a module above, then drag it into place.</p></div>'}</div><div class="n-hud-info">Preview values · Drag to move · Wheel / + − to scale · Arrow keys to move · R to reset · Right-click to toggle</div>`;}
    function applyTheme(){const panel=$('.n-window');if(!panel)return;const t=state.theme;for(const [key,v] of Object.entries(t))if(v&&['r','g','b'].every(ch=>Number.isFinite(v[ch])))panel.style.setProperty('--n-'+key,rgba(v));if(t.mainBackground&&Number.isFinite(t.backgroundAlpha))panel.style.setProperty('--n-background',rgba({...t.mainBackground,a:Math.max(.28,t.backgroundAlpha)}));else panel.style.removeProperty('--n-background');if(t.buttonColor&&Number.isFinite(t.buttonAlpha))panel.style.setProperty('--n-button',rgba({...t.buttonColor,a:Math.max(.46,t.buttonAlpha)}));else panel.style.removeProperty('--n-button');panel.classList.toggle('n-dark',t.name!=='Champagne');panel.style.setProperty('--n-blur',state.global.menuBlurEnabled?Math.min(6,state.global.menuIntensity/4)+'px':'0px');root.dir=state.language.startsWith('ar')?'rtl':'ltr';}
    function render(){
      if(disposed)return;
      mounted=true;nearObserver?.disconnect();
      const focus=document.activeElement,focusKey=focus?.dataset?.setting,focusOwner=focus?.dataset?.owner,scroll=$('.n-scroll')?.scrollTop||0;
      capture=null;
      if(closed){root.innerHTML=`<div class="n-closed">${button('Open Void Client','open')}<p>Press ${esc(keyName(state.global.menuKey))} to reopen the preview.</p></div>`;return;}
      const nav=['Modules','Settings','Cosmetics','Configs','HUD Editor'];
      root.innerHTML=`<div class="n-window ${view==='HUD Editor'?'n-hud-window':''}" tabindex="-1" role="region" aria-label="Void Client interactive menu"><aside class="n-sidebar" aria-label="Client navigation">${nav.map(name=>`<button type="button" data-view="${name}" class="${view===name?'is-selected':''}" aria-label="${name}" title="${name}" aria-pressed="${view===name}">${icon(name)}</button>`).join('')}</aside><div class="n-main"><header class="n-header"><h3>Void Client</h3><p>${view==='Configs'?'Manage, switch, import, export and duplicate configurations':'Configure your modules and settings'}</p></header><button type="button" class="n-close" data-action="close" aria-label="Close client menu">${icon('Close')}</button>${view==='Modules'?modulesView():view==='Settings'?settingsView():view==='Configs'?configsView():view==='HUD Editor'?hudView():'<div class="n-cosmetics"><h4>Cosmetics</h4><p>VOID cosmetics are not available in this build.</p><p>Manage your Minecraft character in the Dressing Room.</p></div>'}</div><output class="n-toast" role="status" hidden></output><dialog class="n-dialog" aria-labelledby="n-dialog-title"></dialog></div><p class="n-caption"><span>All ${D.modules.length} modules · Native client controls</span><span>Interactive browser preview · Changes stay here</span></p>`;
      applyTheme();if($('.n-scroll'))$('.n-scroll').scrollTop=scroll;
      if(focusKey){const next=$$('[data-setting]').find(e=>e.dataset.setting===focusKey&&e.dataset.owner===focusOwner);next?.focus({preventScroll:true});}
      cancelAnimationFrame(layoutRAF);
      if(view==='HUD Editor')layoutRAF=requestAnimationFrame(()=>{layoutRAF=0;$$('[data-hud]').forEach(el=>{const m=mod(el.dataset.hud),v=values(m.id);if(m.textual){el.style.setProperty('font-family',state.global.secondaryFont,'important');el.style.setProperty('font-size',(v.textSize??30)*.55+'px','important');el.style.setProperty('color',rgba(v.textCol.color1),'important');el.style.background=v.fillBg?rgba(v.bgColor.color1):'transparent';el.style.padding=v.fillBg?`${v.padY??4}px ${(v.padX??22)*.5}px`:'0';el.style.borderRadius=(v.radius??0)*2+'px';el.style.textAlign=['center','start','end'][v.alignmnet??0];el.style.textShadow=state.global.textShadow?'1px 1px 1px #0009':'none';if(v.customSize){el.style.width=v.bgX*.6+'px';el.style.height=v.bgY*.6+'px';}if(v.showOutline)el.style.boxShadow=`0 0 0 ${v.outlineThickness*.5}px ${rgba(v.outlineCol.color1)}`;}boundWidget(el);});});
      if(view==='Settings'&&engineTab==='Diagnostics')drawChart();
    }
    function navigate(next){stopBenchmark();view=next;selected=null;category='All';query='';render();$('.n-window')?.focus({preventScroll:true});if($('.n-scroll'))$('.n-scroll').scrollTop=0;}
    function captureKey(owner,id){capture={owner,id};const b=$$('[data-key-owner]').find(b=>b.dataset.keyOwner===owner&&b.dataset.keyId===id);if(b){b.textContent='Press a key...';b.classList.add('n-capturing');b.focus();}toast('Press a key or mouse button. Esc cancels; Delete clears the binding.');}
    function finishCapture(code){if(!capture)return;values(capture.owner)[capture.id]=code;capture=null;save();render();}
    function message(title,text){const dialog=$('.n-dialog');dialog.innerHTML=`<h4 id="n-dialog-title">${esc(title)}</h4><p>${esc(text)}</p>${button('Done','dismiss')}`;dialog.showModal();}
    function openColor(owner,id){colorEdit={owner,id,slot:1};renderColor();$('.n-dialog').showModal();}
    function renderColor(){const {owner,id,slot}=colorEdit,s=schema(owner,id),v=values(owner)[id],c=v['color'+slot],h=hsv(c),dialog=$('.n-dialog');colorEdit.hue=h.h;dialog.classList.add('n-color-dialog');dialog.innerHTML=`<div class="n-dialog-head"><h4 id="n-dialog-title">Color Picker</h4>${button('×','dismiss','aria-label="Close color picker"')}</div><p>${esc(tr(s))}</p><div class="n-sv" tabindex="0" role="slider" aria-label="Color saturation and brightness" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(h.s*100)}" aria-valuetext="Saturation ${Math.round(h.s*100)}%, brightness ${Math.round(h.v*100)}%" style="--hue:${h.h}"><i style="left:${h.s*100}%;top:${(1-h.v)*100}%"></i></div><input type="range" class="n-hue" data-picker="hue" min="0" max="360" step="1" value="${h.h}" aria-label="Hue"><div class="n-color-channels"><label>Hex<input type="text" data-picker="hex" value="${hex(c).toUpperCase()}" maxlength="7" pattern="#[0-9a-fA-F]{6}" aria-label="Hex color"></label>${['r','g','b'].map(k=>`<label>${k.toUpperCase()}<input type="number" data-picker="${k}" value="${Math.round(c[k]*255)}" min="0" max="255" aria-label="${k.toUpperCase()} channel"></label>`).join('')}</div><label class="n-setting">Opacity<input type="range" data-picker="a" value="${c.a}" min="0" max="1" step=".01" aria-label="Color opacity"></label><label class="n-setting">RGB cycling<input type="checkbox" data-picker="isRGB" ${v.isRGB?'checked':''}></label><label class="n-setting">Chroma gradient<input type="checkbox" data-picker="isChroma" ${v.isChroma?'checked':''}></label>${v.isChroma?`<label class="n-setting">Colors<select data-picker="numColors" aria-label="Number of colors">${[1,2,3].map(n=>`<option ${v.numColors===n?'selected':''}>${n}</option>`).join('')}</select></label><div class="n-color-slots">${Array.from({length:v.numColors},(_,i)=>button('Color '+(i+1),'color-slot',`data-slot="${i+1}" aria-pressed="${slot===i+1}"`)).join('')}</div><label class="n-setting">Chroma speed<input type="range" data-picker="chromaSpeed" min="0" max="10" step=".1" value="${v.chromaSpeed}" aria-label="Chroma speed"></label><label class="n-setting">Direction<input type="range" data-picker="chromaDirection" min="0" max="360" value="${v.chromaDirection}" aria-label="Chroma direction"></label>`:''}<div class="n-color-preview"></div>${button('Done','dismiss')}`;paintColor();}
    function paintColor(skip){const v=values(colorEdit.owner)[colorEdit.id],c=v['color'+colorEdit.slot],h=hsv(c);const square=$('.n-sv');square.style.setProperty('--hue',colorEdit.hue);square.querySelector('i').style.cssText=`left:${h.s*100}%;top:${(1-h.v)*100}%`;square.setAttribute('aria-valuenow',Math.round(h.s*100));square.setAttribute('aria-valuetext',`Saturation ${Math.round(h.s*100)}%, brightness ${Math.round(h.v*100)}%`);$$('[data-picker]').forEach(other=>{if(other===skip)return;const k=other.dataset.picker;if(k==='hex')other.value=hex(c).toUpperCase();if(k==='hue')other.value=colorEdit.hue;if(['r','g','b'].includes(k))other.value=Math.round(c[k]*255);});$('.n-color-preview').style.background=v.isChroma&&v.numColors>1?`linear-gradient(${v.chromaDirection}deg,${Array.from({length:v.numColors},(_,i)=>rgba(v['color'+(i+1)])).join(',')})`:rgba(c);}
    function setSV(e){const r=$('.n-sv').getBoundingClientRect(),v=values(colorEdit.owner)[colorEdit.id],c=v['color'+colorEdit.slot];v['color'+colorEdit.slot]=rgb({h:colorEdit.hue,s:clamp((e.clientX-r.left)/r.width,0,1),v:1-clamp((e.clientY-r.top)/r.height,0,1)},c.a);paintColor();save();}
    function uniqueName(base){let name=base,index=2;while(configs.some(c=>c.name===name))name=base+'_'+index++;return name;}
    function nativeExport(s){const types={bool:0,float:1,int:2,key:3,color:4,vec2:5,enum:6,text:7,snap:8};return {version:2,settings:[{name:'global',settings:G.map(x=>({name:x.id,type:types[x.type],value:s.global[x.id]}))},...D.modules.map(m=>({name:m.id,settings:[{name:'enabled',type:0,value:s.modules[m.id].enabled},...m.settings.filter(x=>x.type!=='action').map(x=>({name:x.id,type:types[x.type],value:s.modules[m.id].values[x.id]}))]}))],theme:s.theme,voidWebsite:{schemaVersion:1,state:s}};}
    async function importConfig(file){try{if(!file||file.size>2_000_000)throw new Error('Choose a JSON configuration under 2 MB.');const data=JSON.parse(await file.text());let incoming;
      if(data.voidWebsite?.schemaVersion===1)incoming=sanitize(data.voidWebsite.state);
      else if(data.version===2&&Array.isArray(data.settings)){incoming=defaults();for(const group of data.settings){if(group?.name==='global'&&Array.isArray(group.settings)){for(const item of group.settings){const s=G.find(s=>s.id===item?.name);if(s)incoming.global[s.id]=sanitizeValue(s,item.value);}continue;}const m=mod(group?.name);if(!m||!Array.isArray(group.settings))continue;for(const item of group.settings){if(item?.name==='enabled'&&typeof item.value==='boolean')incoming.modules[m.id].enabled=item.value;else{const s=m.settings.find(s=>s.id===item?.name);if(s&&s.type!=='action')incoming.modules[m.id].values[s.id]=sanitizeValue(s,item.value);}}}incoming.theme=data.theme;incoming=sanitize(incoming);}
      else throw new Error('This file is not a Void configuration.');if(configs.length>=50)throw new Error('The preview supports up to 50 saved configs.');configs.push({name:uniqueName(file.name.replace(/\.json$/i,'').slice(0,50)||'Imported'),state:incoming});save();render();toast('Configuration imported. Select Load to use it.');
    }catch(error){toast(error instanceof SyntaxError?'Invalid JSON. Your current configuration was kept.':error.message);}}
    function benchmarkText(){if(!bench)return 'Ready · Samples browser animation frames for 60 seconds after a 3-second warm-up.';if(bench.running)return bench.elapsed<3000?'Warming up…':`Recording… ${Math.min(60,Math.floor((bench.elapsed-3000)/1000))} / 60 s · ${bench.samples.length} frames`;if(bench.cancelled)return 'Benchmark cancelled. Keep this panel visible while recording.';if(!bench.samples.length)return 'No browser frames recorded.';const sorted=[...bench.samples].sort((a,b)=>a-b);return `Browser results: ${(1000/(bench.samples.reduce((a,b)=>a+b,0)/bench.samples.length)).toFixed(1)} FPS · 1% low ${(1000/sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.99))]).toFixed(1)} FPS · Median ${sorted[Math.floor(sorted.length/2)].toFixed(1)} ms`;}
    function drawChart(){const canvas=$('.n-frame-chart');if(!canvas)return;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,700,100);ctx.strokeStyle=rgba(state.theme.mutedText);ctx.globalAlpha=.2;ctx.beginPath();for(const y of [25,50,75]){ctx.moveTo(0,y);ctx.lineTo(700,y);}ctx.stroke();ctx.globalAlpha=1;ctx.strokeStyle=rgba(state.theme.accent);ctx.beginPath();(bench?.samples||[]).slice(-140).forEach((v,i)=>{const x=i*5,y=100-Math.min(100,v*1.5);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.stroke();}
    function stopBenchmark(){if(bench?.running){bench.running=false;bench.cancelled=true;}cancelAnimationFrame(benchRAF);benchRAF=0;}
    function startBenchmark(){stopBenchmark();bench={running:true,samples:[],elapsed:0,start:performance.now(),last:0,lastPaint:0};render();const tick=t=>{if(!bench?.running)return;if(document.hidden||!visible||view!=='Settings'||!engineOpen||engineTab!=='Diagnostics'){stopBenchmark();return;}bench.elapsed=t-bench.start;if(bench.last&&bench.elapsed>3000)bench.samples.push(t-bench.last);bench.last=t;if(t-bench.lastPaint>250){bench.lastPaint=t;const out=$('.n-benchmark');if(out)out.textContent=benchmarkText();drawChart();}if(bench.elapsed>=63000){bench.running=false;benchRAF=0;render();return;}benchRAF=requestAnimationFrame(tick);};benchRAF=requestAnimationFrame(tick);}
    function boundWidget(el,p){const canvas=$('.n-hud-canvas');if(!canvas||!el)return;const r=canvas.getBoundingClientRect();el.style.setProperty('--hud-scale',Math.min(Math.max(.1,values(el.dataset.hud).scale??1),r.width/Math.max(1,el.offsetWidth),r.height/Math.max(1,el.offsetHeight)));const b=el.getBoundingClientRect();p=p||{x:parseFloat(el.style.left)/100,y:parseFloat(el.style.top)/100};p={x:clamp(p.x,0,Math.max(0,1-b.width/r.width)),y:clamp(p.y,0,Math.max(0,1-b.height/r.height))};el.style.left=p.x*100+'%';el.style.top=p.y*100+'%';return p;}
    function storeWidget(el,p){const id=el.dataset.hud;state.hud[id]=boundWidget(el,p);if(values(id).pos)values(id).pos=copy(state.hud[id]);}
    function scaleWidget(el,amount){const m=mod(el.dataset.hud);if(!m.resizable)return;values(m.id).scale=Number(clamp((values(m.id).scale??1)+amount,.1,4).toFixed(2));el.style.setProperty('--hud-scale',values(m.id).scale);storeWidget(el);save();}
    on(root,'click',e=>{
      const b=e.target.closest('button, [data-category], [data-settings-tab], [data-engine-tab]');if(!b)return;
      if(capture&&b.dataset.keyOwner===undefined&&!b.dataset.action){return;}
      if(b.dataset.view){navigate(b.dataset.view);return;}
      if(b.dataset.category){category=b.dataset.category;render();return;}
      if(b.dataset.settingsTab){stopBenchmark();settingsTab=b.dataset.settingsTab;render();if($('.n-scroll'))$('.n-scroll').scrollTop=0;return;}
      if(b.dataset.engineTab){stopBenchmark();engineTab=b.dataset.engineTab;render();return;}
      if(b.dataset.keyOwner){captureKey(b.dataset.keyOwner,b.dataset.keyId);return;}
      if(b.dataset.colorOwner){openColor(b.dataset.colorOwner,b.dataset.colorId);return;}
      const action=b.dataset.action,m=mod(b.dataset.module),i=Number(b.dataset.index);
      if(action==='toggle')toggle(m);
      else if(action==='module'){selected=m.id;render();$('.n-scroll').scrollTop=0;$('.n-module-heading h4')?.setAttribute('tabindex','-1');$('.n-module-heading h4')?.focus({preventScroll:true});}
      else if(action==='back'){selected=null;render();}
      else if(action==='reset-module'){const m=mod(selected);state.modules[m.id].values=Object.fromEntries(m.settings.filter(s=>s.type!=='action').map(s=>[s.id,copy(s.default)]));save();render();toast('Settings reset.');}
      else if(action==='clear-search'||action==='reset-filters'){query='';if(action==='reset-filters')category='All';render();$('.n-search input')?.focus();}
      else if(action==='close'){stopBenchmark();closed=true;render();$('[data-action="open"]')?.focus({preventScroll:true});}
      else if(action==='open'){closed=false;render();$('.n-window')?.focus();}
      else if(action==='theme'){state.theme=copy(D.themes.find(t=>t.name===b.dataset.theme));save();render();}
      else if(action==='engine-expand'){engineOpen=!engineOpen;if(!engineOpen)stopBenchmark();render();}
      else if(action==='profile'){const profile=Number(b.dataset.profile);Object.assign(state.engine,{profile,automaticProfile:false,budgetMs:.5,statsIntervalMs:500,memoryBudgetMb:32,batchVertices:64,workers:0,maxDist:profile===0?40:profile===2?48:profile===4?96:64,stutterReduction:true,updateThrottling:true,batching:true,stateCaching:true,framePacing:true,distanceCulling:true,autoEviction:true});save();render();toast('Profile selected. Hardware tuning is resolved by the client in Minecraft.');}
      else if(action==='purge')message('Purge Engine Caches','Engine caches are created inside Minecraft. This website has no game cache to purge.');
      else if(action==='module-action')message(tr(schema(m.id,b.dataset.setting)),b.dataset.setting==='calibrate'?'Connect your controller in Minecraft to calibrate its gyroscope.':'Controller sensor and connection diagnostics are available in Minecraft.');
      else if(action==='dismiss'){const d=$('.n-dialog');d.close();d.classList.remove('n-color-dialog');if(colorEdit){colorEdit=null;render();}}
      else if(action==='color-slot'){colorEdit.slot=Number(b.dataset.slot);renderColor();}
      else if(action==='new-config'){if(configs.length>=50){toast('The preview supports up to 50 saved configs.');return;}const name=uniqueName('Config_'+configs.length);configs.push({name,state:copy(state)});active=name;save();render();}
      else if(action==='defaults'){state=defaults();save();render();toast('Current state restored to native defaults. Saved configs are available to reload.');}
      else if(action==='save-config'){configs.find(c=>c.name===active).state=copy(state);save();toast('Current state saved to '+active+'.');}
      else if(action==='load-config'){state=sanitize(configs[i].state);active=configs[i].name;save();render();toast(active+' loaded.');}
      else if(action==='duplicate-config'){if(configs.length>=50){toast('The preview supports up to 50 saved configs.');return;}configs.push({name:uniqueName(configs[i].name+'_Copy'),state:copy(configs[i].state)});save();render();}
      else if(action==='delete-config'&&configs[i]?.name!=='default'){const name=configs[i].name;configs.splice(i,1);if(active===name)active='default';save();render();toast(name+' deleted.');}
      else if(action==='export-config'){const c=configs[i],url=URL.createObjectURL(new Blob([JSON.stringify(nativeExport(c.name===active?state:c.state),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=c.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
      else if(action==='hud-done')navigate('Modules');
      else if(action==='snap'){state.global.snapLines=!state.global.snapLines;save();render();}
      else if(action==='reset-layout'){state.hud={};D.modules.filter(m=>m.hud).forEach(m=>{if(values(m.id).scale!==undefined)values(m.id).scale=1;if(values(m.id).pos)values(m.id).pos={x:0,y:0};});save();render();}
      else if(action==='benchmark')startBenchmark();
      else if(action==='cancel-benchmark'){stopBenchmark();render();}
      else if(action==='reset-benchmark'){stopBenchmark();bench=null;render();}
    });
    function input(e){const el=e.target;
      if(el.matches('.n-search input')){query=el.value;$('.n-grid').innerHTML=grid();$('.n-grid').scrollTop=0;return;}
      if(el.dataset.setting&&el.dataset.owner){const s=schema(el.dataset.owner,el.dataset.setting);if(!s)return;const v=el.type==='checkbox'?el.checked:el.type==='range'||el.type==='number'||el.tagName==='SELECT'?Number(el.value):el.value;if(el.type==='number'&&el.value==='')return;values(el.dataset.owner)[s.id]=sanitizeValue(s,el.type==='range'?stepped(s,v):v);if(el.type==='range')el.value=values(el.dataset.owner)[s.id];$$('[data-setting]').filter(x=>x!==el&&x.dataset.setting===s.id&&x.dataset.owner===el.dataset.owner).forEach(x=>x.value=values(el.dataset.owner)[s.id]);if(el.dataset.owner==='engine'&&s.id!=='automaticProfile')state.engine.profile=5;save();if(s.type==='bool'||s.type==='enum'){render();}else if(el.dataset.owner==='global')applyTheme();return;}
      if(el.dataset.themeColor){state.theme[el.dataset.themeColor]=fromHex(el.value,state.theme[el.dataset.themeColor].a);save();applyTheme();}
      if(el.dataset.themeAlpha&&Number.isFinite(el.valueAsNumber)){state.theme[el.dataset.themeAlpha].a=clamp(el.valueAsNumber,0,1);save();applyTheme();}
      if(el.dataset.themeScalar){state.theme[el.dataset.themeScalar]=clamp(Number(el.value),0,1);save();applyTheme();}
      if(el.dataset.picker&&colorEdit){const v=values(colorEdit.owner)[colorEdit.id],c=v['color'+colorEdit.slot],key=el.dataset.picker;
        if(key==='color'||key==='hex'){if(!/^#[0-9a-f]{6}$/i.test(el.value))return;v['color'+colorEdit.slot]=fromHex(el.value,c.a);colorEdit.hue=hsv(v['color'+colorEdit.slot]).h;}
        else if(key==='hue'){colorEdit.hue=Number(el.value);v['color'+colorEdit.slot]=rgb({...hsv(c),h:colorEdit.hue},c.a);}
        else if(['r','g','b'].includes(key)){if(!Number.isFinite(el.valueAsNumber))return;c[key]=clamp(el.valueAsNumber,0,255)/255;}
        else if(key==='a')c.a=clamp(Number(el.value),0,1);
        else if(key==='isRGB'||key==='isChroma')v[key]=el.checked;
        else v[key]=clamp(Number(el.value),key==='numColors'?1:0,key==='numColors'?3:key==='chromaSpeed'?10:360);
        if(colorEdit.slot>v.numColors)colorEdit.slot=v.numColors;save();
        if(['isRGB','isChroma','numColors'].includes(key))renderColor();
        else {if(['r','g','b'].includes(key))colorEdit.hue=hsv(v['color'+colorEdit.slot]).h;paintColor(el);}
      }
    }
    on(root,'input',input);
    on(root,'change',e=>{const el=e.target;if(el.matches('[data-language]')){state.language=el.value;save();render();}if(el.dataset.hudToggle){state.modules[el.dataset.hudToggle].enabled=el.checked;save();render();$('.n-hud-add').open=true;}if(el.matches('[data-import]'))importConfig(el.files[0]);});
    on(root,'cancel',()=>{colorEdit=null;setTimeout(render,0);},{capture:true});
    on(root,'pointerdown',e=>{
      if(e.target.closest('.n-sv')&&colorEdit){e.preventDefault();colorDrag=true;$('.n-sv').setPointerCapture(e.pointerId);$('.n-sv').focus();setSV(e);return;}
      if(capture&&!e.target.closest('[data-key-owner]')){e.preventDefault();finishCapture(({0:1,1:4,2:2,3:5,4:6})[e.button]||0);return;}
      const el=e.target.closest('[data-hud]');if(!el||e.button!==0)return;e.preventDefault();el.focus({preventScroll:true});const r=$('.n-hud-canvas').getBoundingClientRect(),b=el.getBoundingClientRect();drag={el,dx:e.clientX-b.left,dy:e.clientY-b.top,rect:r};el.setPointerCapture(e.pointerId);el.classList.add('is-dragging');
    });
    on(root,'pointermove',e=>{if(colorDrag&&colorEdit){setSV(e);return;}if(!drag)return;let x=(e.clientX-drag.dx-drag.rect.left)/drag.rect.width,y=(e.clientY-drag.dy-drag.rect.top)/drag.rect.height;const sx=state.global.snapLines&&Math.abs(x-.5)<.015,sy=state.global.snapLines&&Math.abs(y-.5)<.015;if(sx)x=.5;if(sy)y=.5;$('.n-snap-x').classList.toggle('show',sx);$('.n-snap-y').classList.toggle('show',sy);storeWidget(drag.el,{x,y});});
    const endDrag=()=>{colorDrag=false;if(!drag)return;drag.el.classList.remove('is-dragging');drag=null;$$('.n-snap-x,.n-snap-y').forEach(el=>el.classList.remove('show'));save();};
    on(root,'pointerup',endDrag);on(root,'pointercancel',endDrag);
    on(root,'wheel',e=>{const el=e.target.closest('[data-hud]');if(el){e.preventDefault();scaleWidget(el,e.deltaY<0?.05:-.05);}},{passive:false});
    on(root,'contextmenu',e=>{if(capture){e.preventDefault();finishCapture(2);return;}const el=e.target.closest('[data-hud]');if(el){e.preventDefault();state.modules[el.dataset.hud].enabled=false;save();render();}});
    on(document,'keydown',e=>{
      if(colorEdit&&e.target.matches('.n-sv')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const v=values(colorEdit.owner)[colorEdit.id],c=v['color'+colorEdit.slot],h=hsv(c);h.h=colorEdit.hue;h.s=clamp(h.s+(e.key==='ArrowRight'?.01:e.key==='ArrowLeft'?-.01:0),0,1);h.v=clamp(h.v+(e.key==='ArrowUp'?.01:e.key==='ArrowDown'?-.01:0),0,1);v['color'+colorEdit.slot]=rgb(h,c.a);paintColor();save();return;}
      if(capture){e.preventDefault();e.stopPropagation();if(e.key==='Escape'){capture=null;render();}else finishCapture(e.key==='Delete'||e.key==='Backspace'?0:e.keyCode);return;}
      if(root.contains(e.target)&&e.target.type==='range'&&e.target.dataset.setting&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();const el=e.target,s=schema(el.dataset.owner,el.dataset.setting);el.value=e.key==='Home'?s.min:e.key==='End'?s.max:clamp(Number(el.value)+(s.step??1)*(e.key==='ArrowRight'||e.key==='ArrowUp'?1:-1),s.min,s.max);el.dispatchEvent(new Event('input',{bubbles:true}));return;}
      if(!root.contains(document.activeElement)||$('.n-dialog')?.open||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
      const el=e.target.closest('[data-hud]');if(el){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const p=state.hud[el.dataset.hud]||{x:parseFloat(el.style.left)/100,y:parseFloat(el.style.top)/100},step=e.shiftKey?.025:.005;storeWidget(el,{x:p.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),y:p.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)});save();return;}if(['+','=','-','_'].includes(e.key)){e.preventDefault();scaleWidget(el,['+','='].includes(e.key)?.05:-.05);return;}if(e.key.toLowerCase()==='r'){e.preventDefault();delete state.hud[el.dataset.hud];values(el.dataset.hud).scale=1;save();render();return;}}
      if(e.keyCode===state.global.menuKey||e.keyCode===state.global.ejectKey||e.key==='Escape'){e.preventDefault();closed=!closed;stopBenchmark();render();(closed?$('[data-action="open"]'):$('.n-window'))?.focus({preventScroll:true});return;}
      if(!e.repeat)for(const m of D.modules){if(values(m.id).key===e.keyCode){e.preventDefault();if(m.hold){state.modules[m.id].enabled=true;$$(`[data-module-card="${m.id}"]`).forEach(el=>el.classList.add('is-enabled'));}else toggle(m);}}
    });
    const releaseHolds=()=>D.modules.filter(m=>m.hold).forEach(m=>{state.modules[m.id].enabled=false;$$(`[data-module-card="${m.id}"]`).forEach(el=>el.classList.remove('is-enabled'));});
    on(document,'keyup',e=>{for(const m of D.modules.filter(m=>m.hold))if(values(m.id).key===e.keyCode){state.modules[m.id].enabled=false;$$(`[data-module-card="${m.id}"]`).forEach(el=>el.classList.remove('is-enabled'));}});
    on(window,'blur',releaseHolds);on(document,'visibilitychange',()=>{if(document.hidden){stopBenchmark();releaseHolds();}});
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){stopBenchmark();releaseHolds();}},{threshold:.15});observer.observe(root);
    // Reserve the exact responsive menu layout, but avoid building offscreen
    // controls while the hero's WebGL context and shaders are starting.
    if(window.IntersectionObserver && root.getBoundingClientRect().top>innerHeight+400) {
      root.innerHTML='<div class="n-window" aria-hidden="true" inert style="visibility:hidden"></div><p class="n-caption" aria-hidden="true"><span>Native client controls</span><span>Interactive browser preview</span></p>';
      nearObserver=new IntersectionObserver(entries=>{
        if(!mounted&&entries.some(entry=>entry.isIntersecting))render();
      },{rootMargin:'400px'});
      nearObserver.observe(root);
    } else render();
    const api={modules:D.modules,openCategory(c){closed=false;view='Modules';selected=null;query='';category=D.categories.includes(c)?c:'All';render();},openThemes(){closed=false;view='Settings';settingsTab='Theme';render();root.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},getState:()=>copy(state),getCatalog:()=>D,dispose(){disposed=true;if(saveTimer)persist();stopBenchmark();cancelAnimationFrame(layoutRAF);observer.disconnect();nearObserver?.disconnect();abort.abort();clearTimeout(toastTimer);},getDiagnostics:()=>({benchmarkRunning:!!bench?.running,visible,modules:D.modules.length,settings:D.modules.reduce((n,m)=>n+m.settings.length,0)})};
    return api;
  };
})();
