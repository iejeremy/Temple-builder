import * as THREE from "three";

type WaterCurve=THREE.Curve<THREE.Vector3>;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

/** Preserve the established winding course and dimensions of placed water pieces. */
export function placedWaterCurve(length:number):WaterCurve{
  return new class extends THREE.Curve<THREE.Vector3>{
    constructor(){super();}
    getPoint(t:number,target=new THREE.Vector3()){
      return target.set(Math.sin(t*Math.PI*2)*length*.11+Math.sin(t*Math.PI*4)*length*.025,0,(t-.5)*length);
    }
    getTangent(t:number,target=new THREE.Vector3()){
      const dx=Math.cos(t*Math.PI*2)*length*.11*Math.PI*2+Math.cos(t*Math.PI*4)*length*.025*Math.PI*4;
      return target.set(dx,0,length).normalize();
    }
  }();
}

function courseGeometry(curve:WaterCurve,width:number,height:number,bank:boolean,steps:number){
  const across=bank?[-1,-.8,-.58,-.32,0,.32,.58,.8,1]:[-1,-.8,-.4,0,.4,.8,1];
  const positions:number[]=[],colors:number[]=[],uvs:number[]=[],indices:number[]=[],length=curve.getLength();
  const deep=new THREE.Color(width<1.2?0x41665b:0x2d5355),shallow=new THREE.Color(width<1.2?0x9ba087:0x8a9a7f);
  const wet=new THREE.Color(0x696b53),dry=new THREE.Color(0x9b977e),color=new THREE.Color();
  for(let i=0;i<=steps;i++){
    const t=i/steps,p=curve.getPoint(t),d=curve.getTangent(t),normal=new THREE.Vector3(d.z,0,-d.x).normalize();
    const half=width*.5*(1+.045*Math.sin(t*19)+.025*Math.sin(t*43));
    const padding=bank?.32+width*.12:0,outer=half+padding;
    for(let j=0;j<across.length;j++){
      const s=across[j],distance=Math.abs(s)*outer,edge=bank?clamp((distance-half)/Math.max(.01,padding)):Math.abs(s);
      positions.push(p.x+normal.x*s*outer,height,p.z+normal.z*s*outer);
      // World-sized UVs keep ripple spacing consistent between short creeks and long rivers.
      uvs.push(s*outer,t*length);
      if(bank){
        color.copy(wet).lerp(dry,edge);const alpha=1-edge*edge*(3-2*edge);
        colors.push(color.r,color.g,color.b,alpha);
      }else{
        const shallowness=Math.pow(edge,2.3),pool=.88+.1*Math.sin(t*17)+.035*Math.sin(t*41);
        color.copy(deep).multiplyScalar(pool).lerp(shallow,shallowness);colors.push(color.r,color.g,color.b);
      }
      if(i<steps&&j<across.length-1){const k=i*across.length+j;indices.push(k,k+across.length,k+1,k+1,k+across.length,k+across.length+1);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,bank?4:3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export const waterGeometry=(curve:WaterCurve,width:number,height=.065,steps=128)=>courseGeometry(curve,width,height,false,steps);
export const bankGeometry=(curve:WaterCurve,width:number,height=.035,steps=128)=>courseGeometry(curve,width,height,true,steps);

/** Periodic tangent-space ripple normals, generated once per water material. */
function rippleNormal(){
  const size=64,pixels=new Uint8Array(size*size*4),normal=new THREE.Vector3();
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
    const dx=1.8*Math.cos(u*3+v)+.6*Math.cos(u+v*5),dy=.6*Math.cos(u*3+v)+3*Math.cos(u+v*5);
    normal.set(-dx*.22,-dy*.22,1).normalize();const i=(y*size+x)*4;
    pixels[i]=(normal.x*.5+.5)*255;pixels[i+1]=(normal.y*.5+.5)*255;pixels[i+2]=(normal.z*.5+.5)*255;pixels[i+3]=255;
  }
  const texture=new THREE.DataTexture(pixels,size,size);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

export function createWaterMaterials(){
  const normal=rippleNormal();
  const water=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.19,metalness:0,normalMap:normal,normalScale:new THREE.Vector2(.07,.07),envMapIntensity:1.1});
  // The owning material's disposal releases its small private texture on deletion/rebuild.
  let released=false;water.addEventListener("dispose",()=>{if(!released){released=true;normal.dispose();}});
  const bank=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,transparent:true,depthWrite:false});
  const ripple=new THREE.MeshBasicMaterial({color:0xcbdcd1,transparent:true,opacity:.2,depthWrite:false});
  return {water,bank,ripple};
}

/** Thin curved surface highlights replace the former rectangular white ripple blocks. */
export function rippleGeometry(){
  const positions:number[]=[],indices:number[]=[];
  for(let i=0;i<=6;i++){
    const t=i/6,x=t-.5,z=Math.sin(t*Math.PI)*.1,w=Math.sin(t*Math.PI)*.022+.002;
    positions.push(x,0,z-w,x,0,z+w);
    if(i<6){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
