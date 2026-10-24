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
  const height=canvas(128),rough=canvas(128),hc=height.getContext("2d")!,rc=rough.getContext("2d")!;
  const hi=hc.createImageData(128,128),ri=rc.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const i=(y*128+x)*4,grain=hash(x,y),pebble=grain>.94?23:0,h=120+grain*32+pebble;
    for(let c=0;c<3;c++){hi.data[i+c]=h;ri.data[i+c]=225+grain*28;}hi.data[i+3]=ri.data[i+3]=255;
  }
  hc.putImageData(hi,0,0);rc.putImageData(ri,0,0);
  const bump=texture(height,false,96),roughness=texture(rough,false,96);
  const map=(theme:LandscapeTheme)=>{
    const key=theme==="twilight"?"garden":theme;let cached=colorMaps.get(key);if(cached)return cached;
    const c=canvas(256),ctx=c.getContext("2d")!,pixels=ctx.createImageData(256,256);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const i=(y*256+x)*4,color=groundColor(x-128,y-128,key);
      pixels.data[i]=color[0];pixels.data[i+1]=color[1];pixels.data[i+2]=color[2];pixels.data[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);cached=texture(c,true);colorMaps.set(key,cached);return cached;
  };
  return {map,bump,roughness,dispose(){colorMaps.forEach(t=>t.dispose());bump.dispose();roughness.dispose();}};
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
