/* Queue shader linking together, then yield while the driver compiles them. */
window.warmVoidPrograms = async (renderer, compile, life) => {
  const gl=renderer.getContext(),parallel=gl.getExtension('KHR_parallel_shader_compile');
  if(!parallel)return; // The unchanged synchronous path remains supported.
  renderer.__voidCompiling=true;
  try {compile();} finally {renderer.__voidCompiling=false;}
  const programs=renderer.info.programs.slice();
  const completed=await new Promise(resolve=>{
    let settled=false;
    const finish=value=>{if(!settled){settled=true;resolve(value);}};
    life.add(()=>finish(false));
    const poll=()=>{
      if(life.disposed||gl.isContextLost()){finish(false);return;}
      if(programs.every(p=>gl.getProgramParameter(p.program,parallel.COMPLETION_STATUS_KHR))){finish(true);return;}
      life.setTimer(poll,16);
    };
    poll();
  });
  if(!completed)return;
  for(const p of programs){
    if(!gl.getProgramParameter(p.program,gl.LINK_STATUS))throw new Error('World shader failed: '+gl.getProgramInfoLog(p.program));
  }
};
