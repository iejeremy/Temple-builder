import * as THREE from "three";
import { addCompanion } from "./companionModels";
import type { LandscapeItem } from "@/app/page";
import { placedWaterCurve, waterGeometry, bankGeometry, createWaterMaterials, rippleGeometry } from "./sceneryWater";
import { groundColor } from "./naturalLighting";
import { shadeBoulderSurface, shadeGrassSurface } from "./scenerySurfaces";

const noise=(n:number)=>{const x=Math.sin(n*127.1+41.7)*43758.5453;return x-Math.floor(x);};

/** Compatibility helper for the established placed-water ribbon API. */
export function waterRibbon(width:number,length:number,height:number){
  return waterGeometry(placedWaterCurve(length),width,height,64);
}

/** Deterministic scenery assets. No downloads or continuous animation loop. */
export function addNaturalScenery(group:THREE.Group,item:LandscapeItem):boolean{
  const material=(color:number,roughness=.95)=>new THREE.MeshStandardMaterial({color,roughness});
  const add=(geometry:THREE.BufferGeometry,mat:THREE.Material,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
  if(item.kind==='companion'){addCompanion(group,item.companionStyle||'dog');return true;}
  if(item.kind==='boulder'){
    const geo=new THREE.IcosahedronGeometry(1,2),position=geo.getAttribute('position');
    for(let i=0;i<position.count;i++){
      const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
      // Coordinate-based distortion keeps duplicated face vertices together.
      const bump=1+.12*Math.sin(x*5+z*3)*Math.cos(y*6);
      position.setXYZ(i,x*bump*1.3,Math.max(0,(y+1)*.76)*bump,z*bump*.95);
    }
    geo.computeVertexNormals();shadeBoulderSurface(geo);const stone=material(0x858378);stone.vertexColors=true;add(geo,stone);
    const moss=add(new THREE.IcosahedronGeometry(.45,1),material(0x626f48),-.3,1.32,.05);moss.scale.set(1.3,.14,.8);
    return true;
  }
  if(item.kind==='grass'){
    const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.035,0,0,.035,0,0,.07,.38,0],3));blade.computeVertexNormals();
    shadeGrassSurface(blade);
    const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide,vertexColors:true});
    const grass=new THREE.InstancedMesh(blade,mat,240),dummy=new THREE.Object3D(),color=new THREE.Color();
    for(let i=0;i<240;i++){
      const a=noise(i+1)*Math.PI*2,r=Math.sqrt(noise(i+511))*1.7;
      dummy.position.set(Math.cos(a)*r,.025,Math.sin(a)*r);dummy.rotation.y=noise(i+101)*Math.PI*2;dummy.scale.setScalar(.55+noise(i+305)*.9);dummy.updateMatrix();
      grass.setMatrixAt(i,dummy.matrix);color.setHSL(.21+noise(i+33)*.06,.29,.23+noise(i+45)*.13).convertSRGBToLinear();grass.setColorAt(i,color);
    }
    grass.computeBoundingSphere();group.add(grass);
    const pick=add(new THREE.CylinderGeometry(1.7,1.7,.018,32),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,.012,0);
    pick.userData.pickSurface=true;return true;
  }
  if(item.kind==='hill'){
    const segments=48,rings=16,vertices:number[]=[],colors:number[]=[],indices:number[]=[];
    for(let ring=0;ring<=rings;ring++)for(let i=0;i<=segments;i++){
      const t=ring/rings,a=i/segments*Math.PI*2,r=t*4;
      // Broad, asymmetric slopes ease to a level edge instead of a perfect mound.
      const h=Math.pow(Math.max(0,1-t*t),3)*2*(1+.24*t*Math.cos(a)+.12*t*t*Math.sin(a*2));
      vertices.push(Math.cos(a)*r,h+.012,Math.sin(a)*r*.8);
      const rgb=groundColor(Math.cos(a)*r,Math.sin(a)*r*.8,"garden");
      const color=new THREE.Color().setRGB(rgb[0]/255,rgb[1]/255,rgb[2]/255,THREE.SRGBColorSpace).multiplyScalar(1-h*.025);
      const fade=THREE.MathUtils.smoothstep(t,.68,1);colors.push(color.r,color.g,color.b,1-fade);
      if(ring<rings&&i<segments){const k=ring*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));geo.setIndex(indices);geo.computeVertexNormals();
    add(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,transparent:true,depthWrite:false}));return true;
  }
  if(item.kind==='river'||item.kind==='creek'){
    const width=item.kind==='river'?1.6:.55,length=item.kind==='river'?14:10;
    const curve=placedWaterCurve(length),materials=createWaterMaterials();
    const bank=add(bankGeometry(curve,width,.035,64),materials.bank);bank.name="water-bank";bank.userData.noShadow=true;
    const water=add(waterGeometry(curve,width,.065,64),materials.water);water.name="water-surface";water.userData.noShadow=true;
    const ripples=new THREE.InstancedMesh(rippleGeometry(),materials.ripple,10),dummy=new THREE.Object3D();
    ripples.name="water-ripples";ripples.userData.noShadow=true;
    for(let i=0;i<10;i++){
      const t=(i+.5)/10,p=curve.getPoint(t),d=curve.getTangent(t);
      dummy.position.set(p.x,.075,p.z);dummy.rotation.y=Math.atan2(-d.x,d.z);dummy.scale.set(width*(.22+noise(i+3)*.2),1,1);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix);
    }
    ripples.computeBoundingSphere();group.add(ripples);
    const stone=material(0x777d74);
    for(let i=0;i<12;i++){
      const t=(i+.5)/12,z=(t-.5)*length,x=Math.sin(t*Math.PI*2)*length*.11+Math.sin(t*Math.PI*4)*length*.025;
      add(new THREE.DodecahedronGeometry(.08+noise(i+5)*.09,0),stone,x+(i%2?1:-1)*(width*.65+.12),.16,z);
    }
    return true;
  }
  return false;
}
