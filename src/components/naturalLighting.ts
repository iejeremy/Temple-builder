import * as THREE from "three";

export type LandscapeTheme="garden"|"desert"|"twilight";
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const blend=(a:number,b:number,t:number)=>a+(b-a)*t;
const hash=(x:number,z:number)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
function noise(x:number,z:number){
  const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
  const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
  return blend(blend(hash(ix,iz),hash(ix+1,iz),u),blend(hash(ix,iz+1),hash(ix+1,iz+1),u),v);
}
const palettes={
  garden:{grass:[116,135,84],earth:[125,110,84],dry:[150,143,96],gravel:[146,142,124]},
  desert:{grass:[173,145,105],earth:[146,115,81],dry:[192,162,117],gravel:[166,151,124]},
  twilight:{grass:[116,135,84],earth:[125,110,84],dry:[150,143,96],gravel:[146,142,124]}
};

/** World-space material variation; geometry stays flat and usable for building. */
export function groundColor(x:number,z:number,theme:LandscapeTheme):[number,number,number]{
  const p=palettes[theme];
  const soil=clamp((noise(x*.075+31,z*.075-17)-.43)*1.6);
  const dry=clamp((noise(x*.19-8,z*.19+24)-.48)*1.2);
  const gravel=clamp((noise(x*.33+18,z*.33+5)-.65)*1.35);
  const grain=(hash(x*29,z*29)-.5)*7+(noise(x*.8,z*.8)-.5)*9;
  return p.grass.map((value,i)=>Math.round(Math.max(0,Math.min(255,blend(blend(blend(value,p.earth[i],soil),p.dry[i],dry),p.gravel[i],gravel)+grain)))) as [number,number,number];
}

/** Macro color plus reusable fine surface maps, without downloading large assets. */
export function createGroundSurface(anisotropy:number){
  const colorMaps=new Map<LandscapeTheme,THREE.CanvasTexture>();
  const canvas=(size:number)=>{const c=document.createElement("canvas");c.width=c.height=size;return c;};
  const texture=(c:HTMLCanvasElement,srgb=false,repeat=1)=>{
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.anisotropy=Math.min(4,anisotropy);
    t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;return t;
  };
  const height=canvas(128),rough=canvas(128),detail=canvas(128),hc=height.getContext("2d")!,rc=rough.getContext("2d")!,dc=detail.getContext("2d")!;
  const hi=hc.createImageData(128,128),ri=rc.createImageData(128,128),di=dc.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    // Periodic microhabitat: scattered short blades over granular earth. Wrap the
    // blade lattice itself, so color AND relief meet at every repeated tile edge.
    const i=(y*128+x)*4,grain=hash(x,y),cx=Math.floor(x/8),cy=Math.floor(y/8);
    let cover=0,dryness=0;
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
      const gx=cx+ox,gy=cy+oy,wx=(gx+16)%16,wy=(gy+16)%16;
      const a=hash(wx+71,wy+13)*Math.PI*2,length=3+hash(wx+22,wy+51)*4;
      const dx=x-(gx*8+hash(wx+5,wy+9)*8),dy=y-(gy*8+hash(wx+19,wy+3)*8);
      const along=dx*Math.cos(a)+dy*Math.sin(a),across=Math.abs(-dx*Math.sin(a)+dy*Math.cos(a));
      const t=clamp(along/length),width=(.7+hash(wx+33,wy+27)*.5)*(1-t);
      const blade=along>=0&&along<length?clamp((width-across)*1.4):0;
      if(blade>cover){cover=blade;dryness=hash(wx+99,wy+41);}
    }
    const earth=.79+grain*.32,leaf=.85+grain*.2+dryness*.18;
    di.data[i]=127*blend(earth,leaf*(dryness>.75?1.1:.87),cover);
    di.data[i+1]=127*blend(earth,leaf*1.07,cover);
    di.data[i+2]=127*blend(earth,leaf*.75,cover);
    di.data[i+3]=Math.round(127*earth); // neutral soil detail, independent of leaf hue
    const h=112+grain*18+cover*27;
    for(let c=0;c<3;c++){hi.data[i+c]=h;ri.data[i+c]=225+grain*28;}hi.data[i+3]=ri.data[i+3]=255;
  }
  hc.putImageData(hi,0,0);rc.putImageData(ri,0,0);dc.putImageData(di,0,0);
  const bump=texture(height,false,96),roughness=texture(rough,false,96),micro=texture(detail,false);
  const map=(theme:LandscapeTheme)=>{
    const key=theme==="twilight"?"garden":theme;let cached=colorMaps.get(key);if(cached)return cached;
    const c=canvas(256),ctx=c.getContext("2d")!,pixels=ctx.createImageData(256,256);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const i=(y*256+x)*4,color=groundColor(x-128,y-128,key);
      pixels.data[i]=color[0];pixels.data[i+1]=color[1];pixels.data[i+2]=color[2];pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);cached=texture(c,true);colorMaps.set(key,cached);return cached;
  };
  return {map,bump,roughness,detail:micro,dispose(){colorMaps.forEach(t=>t.dispose());bump.dispose();roughness.dispose();micro.dispose();}};
}

/** Low-resolution linear sky/ground radiance for outdoor reflections and soft fill. */
export function outdoorRadiance(theme:LandscapeTheme,width=128,height=64){
  const top=new THREE.Color(theme==="twilight"?0x283650:theme==="desert"?0xb4c9d4:0x9dbbd4);
  const horizon=new THREE.Color(theme==="twilight"?0xcc8c6e:theme==="desert"?0xe3cda7:0xd8dfd8);
  const ground=new THREE.Color(theme==="desert"?0x8b7452:0x535c41);
  const pixels=new Float32Array(width*height*4),color=new THREE.Color();
  for(let y=0;y<height;y++){
    const elevation=Math.sin(((y+.5)/height-.5)*Math.PI);
    color.copy(elevation>=0?horizon:ground).lerp(top,Math.pow(Math.max(0,elevation),.45));
    color.multiplyScalar(theme==="twilight"?.6:.75);
    for(let x=0;x<width;x++){const i=(y*width+x)*4;pixels[i]=color.r;pixels[i+1]=color.g;pixels[i+2]=color.b;pixels[i+3]=1;}
  }
  const t=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat,THREE.FloatType);
  t.mapping=THREE.EquirectangularReflectionMapping;t.colorSpace=THREE.LinearSRGBColorSpace;t.needsUpdate=true;return t;
}

export const naturalLight={
  garden:{sun:1.8,exposure:.95,sky:0xced9d5,sunColor:0xffedd0,fill:.14,ambient:.38,environment:.65},
  desert:{sun:2.05,exposure:.92,sky:0xe3cda7,sunColor:0xffe3b8,fill:.12,ambient:.34,environment:.6},
  twilight:{sun:1.6,exposure:1.05,sky:0x9a8592,sunColor:0xffbd90,fill:.24,ambient:.48,environment:.85}
} as const;

/** A soft ground contact mark, shared by instanced tree and rock footprints. */
export function contactShadowTexture(){
  const size=64,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const r=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),t=clamp(1-r);
    const i=(y*size+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=Math.round(t*t*(3-2*t)*180);
  }
  const texture=new THREE.DataTexture(pixels,size,size);texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}

/** Keep macro habitat colors while adding metre-scaled surface detail. Both the
 * building plane and distant slopes use identical UVs and one shared tile. */
export function createTerrainMaterial(surface:ReturnType<typeof createGroundSurface>){
  const material=new THREE.MeshStandardMaterial({color:0xffffff,map:surface.map("garden"),roughnessMap:surface.roughness,bumpMap:surface.bump,bumpScale:.025,roughness:1});
  material.onBeforeCompile=shader=>{
    shader.uniforms.terrainDetail={value:surface.detail};
    shader.fragmentShader=shader.fragmentShader.replace("#include <map_pars_fragment>","#include <map_pars_fragment>\nuniform sampler2D terrainDetail;");
    shader.fragmentShader=shader.fragmentShader.replace("#include <map_fragment>",`#include <map_fragment>
      #ifdef USE_MAP
        vec4 closeDetail=texture2D(terrainDetail,vMapUv*96.0);
        // Preserve warm sand/soil in Desert; only green macro regions gain leaf hue.
        float living=smoothstep(-0.005,0.035,diffuseColor.g-diffuseColor.r);
        vec3 grain=mix(vec3(closeDetail.a*2.0),closeDetail.rgb*2.0,living);
        diffuseColor.rgb*=grain;
      #endif`);
  };
  material.customProgramCacheKey=()=>"echoes-terrain-detail-v1";
  return material;
}

/** Rolling, irregular relief beyond the original 48-unit building plane. The
 * first and final rings meet the ground; low passes avoid a continuous bowl rim. */
export function distantTerrainGeometry(){
  const sectors=128,rings=32,positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let ring=0;ring<=rings;ring++)for(let i=0;i<=sectors;i++){
    const a=(i===sectors?0:i)/sectors*Math.PI*2,t=ring/rings,r=48+t*72;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const envelope=Math.pow(Math.sin(t*Math.PI),2);
    const passes=.12+.88*Math.pow(.5+.5*Math.sin(a*3+.8),2);
    const relief=1.5+noise(x*.045,z*.045)*4.5+noise(x*.12+7,z*.12-3);
    positions.push(x,envelope*passes*relief-.04,z);uvs.push(x/256+.5,.5-z/256);
    if(ring<rings&&i<sectors){const k=ring*(sectors+1)+i;indices.push(k,k+1,k+sectors+1,k+1,k+sectors+2,k+sectors+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const normals=geometry.getAttribute("normal"),average=new THREE.Vector3();
  for(let ring=0;ring<=rings;ring++){
    const first=ring*(sectors+1),last=first+sectors;
    average.set(normals.getX(first)+normals.getX(last),normals.getY(first)+normals.getY(last),normals.getZ(first)+normals.getZ(last)).normalize();
    normals.setXYZ(first,average.x,average.y,average.z);normals.setXYZ(last,average.x,average.y,average.z);
  }
  return geometry;
}
