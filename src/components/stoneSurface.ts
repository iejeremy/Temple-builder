import * as THREE from "three";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

type StoneMaps={color:THREE.Texture;normal:THREE.Texture;roughness:THREE.Texture};

/** A single lazy, renderer-local scanned finish. Procedural maps stay visible
 * until the complete set is ready, and remain the fallback on any load failure. */
export function createStoneSurface(renderer:THREE.WebGLRenderer,redraw:()=>void){
  let disposed=false,started=false,settled=false,maps:StoneMaps|null=null;
  let materials=new Set<THREE.MeshStandardMaterial>();
  // Relative URLs also work in Echoes' /temple-studio/ static iframe.
  const loader=new KTX2Loader().setTranscoderPath("./basis/").setWorkerLimit(1);
  loader.detectSupport(renderer);
  const anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const apply=(material:THREE.MeshStandardMaterial)=>{
    if(!maps)return;
    material.map=maps.color;material.normalMap=maps.normal;
    material.normalScale.set(.55,.55);material.roughnessMap=maps.roughness;
    // Preserve the fallback bump map: Three uses the normal map when available.
    material.userData.scannedStone=true;material.needsUpdate=true;
  };
  const start=async()=>{
    started=true;
    const results=await Promise.allSettled(["color","normal","roughness"].map(name=>loader.loadAsync(`./materials/stone-wall-02/${name}.ktx2`)));
    settled=true;
    const textures=results.flatMap(result=>result.status==="fulfilled"?[result.value]:[]);
    if(disposed||textures.length!==3){textures.forEach(texture=>texture.dispose());loader.dispose();return;}
    textures.forEach((texture,index)=>{
      texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;
      texture.colorSpace=index===0?THREE.SRGBColorSpace:THREE.NoColorSpace;
    });
    maps={color:textures[0],normal:textures[1],roughness:textures[2]};
    materials.forEach(apply);loader.dispose();redraw();
  };
  return {
    bind(root:THREE.Object3D){
      if(disposed)return;
      const current=new Set<THREE.MeshStandardMaterial>();
      root.traverse(object=>{
        if(!(object instanceof THREE.Mesh))return;
        for(const material of Array.isArray(object.material)?object.material:[object.material]){
          if(material instanceof THREE.MeshStandardMaterial&&material.userData.surfaceKind==="stone")current.add(material);
        }
      });
      materials=current;
      if(maps)materials.forEach(material=>{if(!material.userData.scannedStone)apply(material);});
      else if(materials.size&&!started)void start();
    },
    dispose(){
      if(disposed)return;disposed=true;materials.clear();
      // Let in-flight decoding settle, then release every result. Terminating
      // a worker mid-decode would leave its load promise unresolved.
      if(maps){Object.values(maps).forEach(texture=>texture.dispose());maps=null;}
      if(!started||settled)loader.dispose();
    }
  };
}
