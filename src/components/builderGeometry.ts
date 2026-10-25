import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Batch only the building shell. Interactive attachments keep their own identity. */
export function batchBuildingShell(group:THREE.Group,material:THREE.Material){
  const batches=new Map<string,THREE.Mesh[]>();
  for(const child of group.children){
    if(!(child instanceof THREE.Mesh)||child.material!==material||child.userData.detailCategory)continue;
    const key=Object.keys(child.geometry.attributes).sort().map(name=>`${name}:${child.geometry.attributes[name].itemSize}`).join(",")+`:${!!child.geometry.index}`;
    const batch=batches.get(key)||[];batch.push(child);batches.set(key,batch);
  }
  for(const meshes of batches.values()){
    if(meshes.length<3)continue;
    const geometries=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});
    const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());
    if(!merged)continue;
    merged.userData.architecturalSurface=meshes.every(mesh=>mesh.geometry.userData.architecturalSurface);
    for(const mesh of meshes){group.remove(mesh);mesh.geometry.dispose();}
    const mesh=new THREE.Mesh(merged,material);mesh.userData.levelIndex=group.userData.levelIndex;
    group.add(mesh);
  }
}

/** Enclose rotated, translated buildings instead of assuming a site centered at zero. */
export function perimeterPlan(levels:Array<{width:number;depth:number;x:number;z:number;rotation:number}>,margin:number,style:string){
  const bounds=new THREE.Box2();
  for(const level of levels){
    const a=THREE.MathUtils.degToRad(level.rotation||0),c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
    const hx=(level.width*c+level.depth*s)/14,hz=(level.width*s+level.depth*c)/14;
    bounds.expandByPoint(new THREE.Vector2(level.x-hx,level.z-hz));bounds.expandByPoint(new THREE.Vector2(level.x+hx,level.z+hz));
  }
  const center=bounds.getCenter(new THREE.Vector2()),size=bounds.getSize(new THREE.Vector2());
  const hx=size.x/2+margin,hz=size.y/2+margin,radius=Math.hypot(hx,hz);
  let local:Array<[number,number]>;
  if(style==="rectangle")local=[[-hx,-hz],[hx,-hz],[hx,hz],[-hx,hz]];
  else{
    const count=style==="star"?10:style==="octagon"?8:32;
    const r=style==="star"?radius/.72:radius/Math.cos(Math.PI/count);
    local=Array.from({length:count},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/count,scale=style==="star"&&i%2?.72:1;return [Math.cos(a)*r*scale,Math.sin(a)*r*scale];});
  }
  const points=local.map(([x,z])=>[x+center.x,z+center.y] as [number,number]);
  let frontEdge=0;
  for(let i=1;i<points.length;i++)if(points[i][1]+points[(i+1)%points.length][1]>points[frontEdge][1]+points[(frontEdge+1)%points.length][1])frontEdge=i;
  const a=points[frontEdge],b=points[(frontEdge+1)%points.length];
  return {points,center,frontEdge,gate:{x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,rotation:-Math.atan2(b[1]-a[1],b[0]-a[0])}};
}
