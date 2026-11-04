import * as THREE from "three";
import type { BuildingShape, TrimAttachment, WallFace } from "@/app/page";

type Point=[number,number];
type Rectangle=[number,number,number,number];

/** The local wall outlines, using the renderer's existing dimensions and tessellation.
 * Rectangle unions expose only real walls: no overlapping-part seams or spans across courtyards. */
export function buildingTrimLoops(shape:BuildingShape,w:number,d:number):Point[][]{
  const radial=(count:number,r:number,inner?:number)=>Array.from({length:inner?count*2:count},(_,i)=>{
    const a=-Math.PI/2+i*Math.PI*2/(inner?count*2:count),radius=inner&&i%2?inner:r;
    return [Math.cos(a)*radius,Math.sin(a)*radius] as Point;
  });
  if(shape==="star"||shape==="six-star"){const r=Math.min(w,d)*.52;return [radial(shape==="star"?5:6,r,r*.46)];}
  if(shape==="triangle"||shape==="diamond"||shape==="hexagon"){
    const points=radial(shape==="triangle"?3:shape==="diamond"?4:6,Math.min(w,d)*.52);
    if(shape==="diamond")points.forEach(p=>p[0]*=w/d);return [points];
  }
  if(["circle","rotunda","oval","octagon","ring"].includes(shape)){
    const r=Math.min(w,d)*.5;
    // absarc + ExtrudeGeometry uses 24 edges for the existing ring walls.
    if(shape==="ring"){
      const contour=new THREE.Shape();contour.absarc(0,0,r,0,Math.PI*2,false);
      const hole=new THREE.Path();hole.absarc(0,0,r*.55,0,Math.PI*2,true);contour.holes.push(hole);
      const points=contour.extractPoints(12);
      const open=(loop:THREE.Vector2[])=>loop.slice(0,-1).map(p=>[p.x,p.y] as Point);
      return [open(points.shape),...points.holes.map(open)];
    }
    const points=radial(shape==="octagon"?8:32,r);if(shape==="oval")points.forEach(p=>p[0]*=w/d);return [points];
  }
  const rectangles:Rectangle[]=shape==="l-shape"?[[w*.42,d,-w*.29,0],[w*.72,d*.42,w*.14,d*.29]]:
    shape==="t-shape"?[[w,d*.38,0,d*.30],[w*.36,d*.76,0,-d*.12]]:
    shape==="u-shape"?[[w*.28,d,-w*.36,0],[w*.28,d,w*.36,0],[w*.72,d*.28,0,-d*.36]]:
    shape==="cross"?[[w*.34,d,0,0],[w,d*.34,0,0]]:
    shape==="x-shape"?[[w*.28,d,0,0],[w,d*.28,0,0]]:
    shape==="horseshoe"?[[w*.25,d,-w*.38,0],[w*.25,d,w*.38,0],[w*.75,d*.26,0,-d*.37]]:
    shape==="courtyard"?[[w,d*.24,0,-d*.38],[w,d*.24,0,d*.38],[w*.24,d*.58,-w*.38,0],[w*.24,d*.58,w*.38,0]]:[[w,d,0,0]];
  // Snap only arithmetic noise at shared rectangle edges, not the footprint itself.
  const unique=(values:number[])=>values.sort((a,b)=>a-b).filter((v,i,a)=>!i||v-a[i-1]>1e-9);
  const xs=unique(rectangles.flatMap(([rw,,x])=>[x-rw/2,x+rw/2]));
  const zs=unique(rectangles.flatMap(([,rd,,z])=>[z-rd/2,z+rd/2]));
  const filled=(i:number,j:number)=>i>=0&&j>=0&&i<xs.length-1&&j<zs.length-1&&rectangles.some(([rw,rd,x,z])=>Math.abs((xs[i]+xs[i+1])/2-x)<rw/2&&Math.abs((zs[j]+zs[j+1])/2-z)<rd/2);
  const edges=new Map<string,{a:Point;b:Point}>(),key=(p:Point)=>p.join(":");
  const edge=(a:Point,b:Point)=>edges.set(key(a),{a,b});
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++)if(filled(i,j)){
    if(!filled(i,j-1))edge([xs[i],zs[j]],[xs[i+1],zs[j]]);
    if(!filled(i+1,j))edge([xs[i+1],zs[j]],[xs[i+1],zs[j+1]]);
    if(!filled(i,j+1))edge([xs[i+1],zs[j+1]],[xs[i],zs[j+1]]);
    if(!filled(i-1,j))edge([xs[i],zs[j+1]],[xs[i],zs[j]]);
  }
  const loops:Point[][]=[];
  while(edges.size){
    const start=edges.values().next().value!,loop:Point[]=[];let current=start;
    do{loop.push(current.a);edges.delete(key(current.a));const next=edges.get(key(current.b));if(!next)break;current=next;}while(current!==start);
    // Remove collinear grid cuts so face selection and corners are independent of the union grid.
    loops.push(loop.filter((p,i)=>{const a=loop[(i+loop.length-1)%loop.length],b=loop[(i+1)%loop.length];return Math.abs((p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0]))>1e-9;}));
  }
  return loops;
}

const edgeNormal=(a:Point,b:Point):Point=>{const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);return [dz/length,-dx/length];};
const edgeFace=(normal:Point):WallFace=>Math.abs(normal[0])>Math.abs(normal[1])+1e-9?(normal[0]>0?"right":"left"):(normal[1]>0?"front":"back");

/** A face-owned band with shared mitered corners. Each saved trim stays one pickable mesh.
 * Bands stay attached to walls; u phases ornaments along the band instead of displacing it. */
export function createBuildingTrim(shape:BuildingShape,w:number,d:number,trim:TrimAttachment):THREE.BufferGeometry{
  const vertices:number[]=[],height=trim.style==="frieze"?.28:.12;
  const quad=(a:number[],b:number[],c:number[],d:number[])=>vertices.push(...a,...b,...c,...a,...c,...d);
  const ornamentEdges:{a:Point;b:Point;normal:Point;length:number}[]=[];
  const outlines=buildingTrimLoops(shape,w,d);
  const hx=Math.max(...outlines.flat().map(p=>Math.abs(p[0]))),hz=Math.max(...outlines.flat().map(p=>Math.abs(p[1])));
  for(const outline of outlines){
    // Divide edges at compass-sector boundaries. A triangle still has four usable
    // face choices; each saved face owns a disjoint part instead of disappearing.
    const loop:Point[]=[];
    for(let i=0;i<outline.length;i++){
      const a=outline[i],b=outline[(i+1)%outline.length],cuts=[0];
      for(const sign of [-1,1]){const start=a[0]/hx+sign*a[1]/hz,end=b[0]/hx+sign*b[1]/hz,t=start/(start-end);if(t>1e-9&&t<1-1e-9)cuts.push(t);}
      for(const t of [...new Set(cuts)].sort((a,b)=>a-b))loop.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
    }
    const face=loop.map((p,i)=>{const b=loop[(i+1)%loop.length];return edgeFace([(p[0]+b[0])/(2*hx),(p[1]+b[1])/(2*hz)]);});
    const normal=loop.map((p,i)=>edgeNormal(p,loop[(i+1)%loop.length]));
    const offset=(i:number,distance:number):Point=>{
      const p=loop[i],a=normal[(i+loop.length-1)%loop.length],b=normal[i],mx=a[0]+b[0],mz=a[1]+b[1],denom=mx*b[0]+mz*b[1];
      return [p[0]+mx*distance/denom,p[1]+mz*distance/denom];
    };
    for(let i=0;i<loop.length;i++){
      if(face[i]!==trim.face)continue;
      const j=(i+1)%loop.length,a=offset(i,-.015),b=offset(j,-.015),c=offset(j,.135),e=offset(i,.135);
      const low=(p:Point)=>[p[0],-height/2,p[1]],high=(p:Point)=>[p[0],height/2,p[1]];
      quad(low(a),low(b),high(b),high(a));quad(low(c),low(e),high(e),high(c));
      quad(high(a),high(b),high(c),high(e));quad(low(e),low(c),low(b),low(a));
      if(face[(i+loop.length-1)%loop.length]!==trim.face)quad(low(e),low(a),high(a),high(e));
      if(face[j]!==trim.face)quad(low(b),low(c),high(c),high(b));
      const pa=loop[i],pb=loop[j];ornamentEdges.push({a:pa,b:pb,normal:normal[i],length:Math.hypot(pb[0]-pa[0],pb[1]-pa[1])});
    }
  }
  if(["dentils","greek-fret","acanthus","rosette"].includes(trim.style)){
    const length=ornamentEdges.reduce((sum,e)=>sum+e.length,0),phase=Math.max(-1,Math.min(1,trim.u||0))*.045;
    for(let k=0;k<9&&length>0;k++){
      let distance=length*((k+1)/10+phase),edge=ornamentEdges[0];
      for(const candidate of ornamentEdges){edge=candidate;if(distance<=candidate.length)break;distance-=candidate.length;}
      const t=Math.max(0,Math.min(1,distance/edge.length)),x=edge.a[0]+(edge.b[0]-edge.a[0])*t+edge.normal[0]*.13,z=edge.a[1]+(edge.b[1]-edge.a[1])*t+edge.normal[1]*.13;
      const box=new THREE.BoxGeometry(.12,.12,.08).toNonIndexed();box.rotateY(Math.atan2(edge.normal[0],edge.normal[1]));box.translate(x,-height/2-.045,z);
      vertices.push(...box.getAttribute("position").array);box.dispose();
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
