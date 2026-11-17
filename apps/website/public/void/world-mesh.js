/* Compressed, lossless geometry from the same procedural world generator. */
(() => {
  const types = {Float32Array,Uint32Array,Uint16Array,Uint8Array,Int16Array,Int32Array};
  window.decodeVoidWorldMesh = buffer => {
    const length=new DataView(buffer).getUint32(0,true);
    const meta=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,length)));
    if(meta.version!==1)throw new Error('Unsupported world mesh version');
    const offset=(4+length+3)&~3;
    const attribute=spec => new types[spec.type](buffer,offset+spec.offset,spec.length);
    return {meta,attribute};
  };
  window.restoreVoidWorldMeshes = (T,root,track,materialFor,data) => {
    const attr=spec=>new T.BufferAttribute(data.attribute(spec),spec.itemSize,spec.normalized);
    const geometries=data.meta.geometries.map(spec=>{
      const geo=track(new T.BufferGeometry());
      for(const [name,value] of Object.entries(spec.attributes))geo.setAttribute(name,attr(value));
      if(spec.index)geo.setIndex(attr(spec.index));
      geo.boundingSphere=new T.Sphere(new T.Vector3(...spec.sphere.center),spec.sphere.radius);
      return geo;
    });
    for(const spec of data.meta.meshes){
      const geo=geometries[spec.geometry],material=materialFor(spec.name);
      const mesh=spec.instanceMatrix?new T.InstancedMesh(geo,material,spec.count):new T.Mesh(geo,material);
      if(spec.instanceMatrix){mesh.instanceMatrix=new T.InstancedBufferAttribute(data.attribute(spec.instanceMatrix),16);}
      if(spec.instanceColor){mesh.instanceColor=new T.InstancedBufferAttribute(data.attribute(spec.instanceColor),3);}
      mesh.name=spec.name;mesh.castShadow=spec.castShadow;mesh.receiveShadow=spec.receiveShadow;
      mesh.frustumCulled=spec.frustumCulled;mesh.layers.mask=spec.layers;
      mesh.matrix.fromArray(spec.matrix);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);
      root.add(mesh);
    }
  };
  let pending;
  window.loadVoidWorldMesh = () => pending ||= fetch('/void/world-mesh.bin.gz').then(async response=>{
    if(!response.ok)throw new Error('World mesh HTTP '+response.status);
    // Some static hosts mark .gz files with Content-Encoding; fetch has already
    // decompressed those responses. Others serve the gzip bytes unchanged.
    let buffer=await response.arrayBuffer();
    const signature=new Uint8Array(buffer,0,2);
    if(signature[0]===31 && signature[1]===139){
      buffer=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    return window.decodeVoidWorldMesh(buffer);
  }).catch(async error=>{
    // The original generator preserves the scene if a cached asset is unavailable.
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='/void/minecraft-world.js';
      script.onload=resolve;script.onerror=reject;document.head.append(script);
    });
    console.warn('Using the procedural world fallback:',error.message);
    return null;
  });
})();
