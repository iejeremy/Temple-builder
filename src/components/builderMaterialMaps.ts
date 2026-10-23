import * as THREE from "three";
import type { BuilderMaterial } from "@/app/page";

/** Lightweight, deterministic, tileable procedural maps. These are placeholders
 * for scanned texture sets, not substitutes for photographic PBR assets. */
const cached=new Map<string,{color:THREE.CanvasTexture;roughness:THREE.CanvasTexture;bump:THREE.CanvasTexture}>();
const stoneKinds=new Set<BuilderMaterial>(["marble","sandstone","limestone","travertine","granite","stone","brick","concrete","stucco","plaster","timber","bronze","gold","obsidian"]);
const hash=(x:number,y:number,seed:number)=>{
  let n=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed,1442695041);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
};
const tileNoise=(x:number,y:number,cellSize:number,seed:number)=>{
  // Repeat the lattice over the 256px tile so no seam appears at UV boundaries.
  const cells=256/cellSize;
  const u=x/cellSize,v=y/cellSize,x0=Math.floor(u),y0=Math.floor(v);
  const fx=u-x0,fy=v-y0,tx=fx*fx*(3-2*fx),ty=fy*fy*(3-2*fy);
  const wrap=(a:number)=>((a%cells)+cells)%cells;
  const a=hash(wrap(x0),wrap(y0),seed),b=hash(wrap(x0+1),wrap(y0),seed);
  const c=hash(wrap(x0),wrap(y0+1),seed),d=hash(wrap(x0+1),wrap(y0+1),seed);
  return (a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty;
};
function create(kind:BuilderMaterial){
  const size=256;
  const canvas=()=>{const c=document.createElement("canvas");c.width=size;c.height=size;return c;};
  const cc=canvas(),rc=canvas(),bc=canvas();
  const ci=cc.getContext("2d")!.createImageData(size,size);
  const ri=rc.getContext("2d")!.createImageData(size,size);
  const bi=bc.getContext("2d")!.createImageData(size,size);
  const isMarble=kind==="marble",isGranite=kind==="granite",isTravertine=kind==="travertine",isTimber=kind==="timber",isMetal=kind==="bronze"||kind==="gold";
  const base:Record<string,[number,number,number]>={
    marble:[238,235,228],sandstone:[191,150,105],limestone:[204,190,159],travertine:[202,172,132],
    granite:[110,110,114],stone:[126,122,113],brick:[152,84,64],concrete:[156,153,148],
    stucco:[218,206,187],plaster:[227,218,201],timber:[116,77,46],bronze:[151,99,54],gold:[205,164,73],obsidian:[32,34,40]
  };
  const rgb=base[kind]||[180,175,165];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    const coarse=tileNoise(x,y,8,2),fine=tileNoise(x,y,64,8),grain=tileNoise(x,y,128,12);
    const wave=Math.sin((x/size)*Math.PI*8+(y/size)*Math.PI*4+coarse*5);
    const vein=isMarble?Math.pow(Math.max(0,wave*.5+.5),19)*(.45+fine*.55):0;
    const pits=isTravertine&&grain>.72?(grain-.72)*2.8:0;
    const woodGrain=isTimber?Math.sin(y*.21+coarse*4)*17+Math.sin(y*.055+fine*7)*12:0;
    // Staggered masonry courses: visible mortar and subtle per-block color variation.
    const masonry=kind==="stone"||kind==="brick"||kind==="limestone"||kind==="sandstone";
    const courseHeight=kind==="brick"?32:64;
    const blockWidth=kind==="brick"?64:128;
    const course=Math.floor(y/courseHeight);
    const stagger=course%2?blockWidth/2:0;
    const localX=((x+stagger)%blockWidth+blockWidth)%blockWidth;
    const localY=y%courseHeight;
    const joint=masonry&&(localY<2||localX<2);
    const blockVariation=masonry?(hash(Math.floor((x+stagger)/blockWidth),course,39)-.5)*18:0;
    const marbleFlow=Math.sin(x*.033+y*.016+tileNoise(x,y,64,31)*6);
    const secondaryVein=isMarble?Math.pow(Math.max(0,marbleFlow),26)*25:0;
    const graniteSpeckle=isGranite?(hash(x,y,77)-.5)*32:0;
    // Fine mineral grains, pores and layered deposits add close-up surface variation.
    // Stable hash noise remains tileable and does not require external texture downloads.
    const mineral=hash(x,y,101);
    const mineralGrain=(mineral-.5)*(isGranite?25:isMarble?5:isMetal?2:11);
    const pores=(kind==="limestone"||kind==="sandstone"||kind==="travertine")&&mineral>.975?(mineral-.975)*950:0;
    const stratification=(kind==="sandstone"||kind==="travertine")?
      Math.sin(y*.115+coarse*2.5)*4+Math.sin(y*.035+fine*4)*5:0;
    const variation=(coarse-.5)*(isGranite?95:kind==="sandstone"?48:22)+(fine-.5)*20-vein*95-secondaryVein-pits*95+woodGrain+blockVariation+graniteSpeckle+mineralGrain+stratification-pores-(joint?kind==="brick"?67:44:0);
    for(let c=0;c<3;c++)ci.data[i+c]=Math.max(0,Math.min(255,rgb[c]+variation));
    ci.data[i+3]=255;
    const rough=(isMetal?65:kind==="obsidian"?52:isMarble?110:kind==="granite"?175:235)
      +(fine-.5)*35+(mineral-.5)*(isMetal?7:24)+(joint?30:0)+pores*.25;
    for(let c=0;c<3;c++)ri.data[i+c]=Math.max(0,Math.min(255,rough));
    ri.data[i+3]=255;
    const height=Math.max(0,Math.min(255,128+(coarse-.5)*80+(fine-.5)*45+(mineral-.5)*26-pits*95-pores*.65-(joint?105:0)));
    for(let c=0;c<3;c++)bi.data[i+c]=height;
    bi.data[i+3]=255;
  }
  cc.getContext("2d")!.putImageData(ci,0,0);
  rc.getContext("2d")!.putImageData(ri,0,0);
  bc.getContext("2d")!.putImageData(bi,0,0);
  const texture=(c:HTMLCanvasElement,srgb=false)=>{
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;
    t.anisotropy=4;if(srgb)t.colorSpace=THREE.SRGBColorSpace;
    return t;
  };
  return {color:texture(cc,true),roughness:texture(rc),bump:texture(bc)};
}
export function getProceduralMaps(kind:BuilderMaterial){
  if(!stoneKinds.has(kind))return null;
  let maps=cached.get(kind);
  if(!maps){maps=create(kind);cached.set(kind,maps);}
  return maps;
}

// Keep procedural maps shared across active previews, and release their GPU
// allocations when the last preview unmounts (including React Strict Mode).
let activePreviewCount=0;
export function retainProceduralMaps(){
  activePreviewCount++;
  let released=false;
  return ()=>{
    if(released)return;
    released=true;
    activePreviewCount=Math.max(0,activePreviewCount-1);
    if(activePreviewCount!==0)return;
    for(const maps of cached.values()){
      maps.color.dispose();
      maps.roughness.dispose();
      maps.bump.dispose();
    }
    cached.clear();
  };
}
