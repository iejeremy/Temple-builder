"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { BuildingLevel, RoofStyle, WallFace, Perimeter, BuilderMaterial, Statue } from "@/app/page";

const COLORS: Record<BuilderMaterial, number> = { marble:0xd9d4cc,sandstone:0xb98b5b,limestone:0xc6b898,obsidian:0x25262b,granite:0x77777b,travertine:0xc8ad87,brick:0x8b4938,stone:0x77736b,concrete:0x92908a,stucco:0xd8ccb8,plaster:0xe0d9ca,timber:0x765137,bronze:0x7f5d3f,gold:0xb8912f };

export default function Temple3DPreview({ levels, perimeter, statues, selectedStatueId, selectedLevel, onSelectLevel, onSelectFace, onMoveLevel, onPatioChange, onMoveWindow, onMoveDoor, onSelectPerimeter, onSelectStatue, onMoveStatue }: {
  levels: BuildingLevel[];
  perimeter: Perimeter | null;
  statues: Statue[];
  selectedStatueId?: string | null;
  selectedLevel: number;
  onSelectLevel?: (index: number) => void;
  onSelectFace?: (index: number, face: WallFace) => void;
  onMoveLevel?: (index: number, x: number, z: number) => void;
  onPatioChange?: (index: number, patio: boolean) => void;
  onMoveWindow?: (levelIndex: number, id: string, u: number, v: number) => void;
  onMoveDoor?: (levelIndex: number, id: string, u: number) => void;
  onSelectPerimeter?: () => void;
  onSelectStatue?: (id:string) => void;
  onMoveStatue?: (id:string,x:number,z:number) => void;
}) {
  const hostRef = useRef<HTMLDivElement|null>(null);
  const groupRef = useRef<THREE.Group|null>(null);
  const sceneRef = useRef<THREE.Scene|null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer|null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera|null>(null);
  const orbitRef = useRef({ theta: .72, phi: .72, radius: 13, lastX: 0, lastY: 0, dragging: false, pinch: 0 });
  const targetYRef = useRef(1.4);
  const levelGroupsRef = useRef<THREE.Group[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerDownRef = useRef<{x:number;y:number}|null>(null);
  const movingLevelRef = useRef<number|null>(null);
  const movingDoorRef = useRef<{levelIndex:number;id:string;face:WallFace}|null>(null);
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0,1,0),0));
  const perimeterGroupRef = useRef<THREE.Group | null>(null);
  const statueGroupsRef = useRef<THREE.Group[]>([]);
  const movingStatueRef = useRef<string | null>(null);
  const liveRef = useRef({levels,selectedLevel,onSelectLevel,onSelectFace,onMoveLevel,onSelectPerimeter,onSelectStatue,onMoveStatue,selectedStatueId});
  liveRef.current={levels,selectedLevel,onSelectLevel,onSelectFace,onMoveLevel,onSelectPerimeter,onSelectStatue,onMoveStatue,selectedStatueId};

  useEffect(() => {
    const host=hostRef.current; if(!host) return;
    const scene=new THREE.Scene(); scene.background=new THREE.Color(0xb9c4cb); scene.fog=new THREE.Fog(0xb9c4cb,24,44);
    const camera=new THREE.PerspectiveCamera(42,1,.1,100);
    const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:"default"}); renderer.setPixelRatio(1); host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff,0x6f6b5e,2));
    const sun=new THREE.DirectionalLight(0xffffff,2.2); sun.position.set(8,12,7); scene.add(sun);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshStandardMaterial({color:0x878777,roughness:1}));
    ground.rotation.x=-Math.PI/2; scene.add(ground);
    const grid=new THREE.GridHelper(40,24,0x66685e,0x7b7d70); grid.position.y=.01; scene.add(grid);
    const group=new THREE.Group(); scene.add(group);
    sceneRef.current=scene; rendererRef.current=renderer; cameraRef.current=camera; groupRef.current=group;

    const render=()=>{
      const o=orbitRef.current;
      camera.position.set(Math.sin(o.theta)*Math.sin(o.phi)*o.radius,Math.cos(o.phi)*o.radius,Math.cos(o.theta)*Math.sin(o.phi)*o.radius);
      camera.lookAt(0,targetYRef.current,0); renderer.render(scene,camera);
    };
    const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);render();};
    const canvas=renderer.domElement; canvas.style.touchAction="none";
    const pointers=new Map<number,{x:number,y:number}>();
    const distance=()=>{const pts=[...pointers.values()];return pts.length<2?0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);};
    const down=(e:PointerEvent)=>{pointerDownRef.current={x:e.clientX,y:e.clientY};const rect=canvas.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycasterRef.current.setFromCamera(mouse,camera);const doorHits=raycasterRef.current.intersectObjects(levelGroupsRef.current,true).filter(h=>h.object.userData.doorId!==undefined);if(doorHits.length){const d=doorHits[0].object.userData;movingDoorRef.current={levelIndex:d.levelIndex as number,id:d.doorId as string,face:d.doorFace as WallFace};}const statueHits=doorHits.length?[]:raycasterRef.current.intersectObjects(statueGroupsRef.current,true);if(statueHits.length){let so:THREE.Object3D|null=statueHits[0].object;while(so&&so.userData.statueId===undefined)so=so.parent;if(so){const id=so.userData.statueId as string;if(id===liveRef.current.selectedStatueId)movingStatueRef.current=id;}}const perimeterHits=statueHits.length?[]:(perimeterGroupRef.current?raycasterRef.current.intersectObjects(perimeterGroupRef.current.children,true):[]);const hits=(statueHits.length||perimeterHits.length)?[]:raycasterRef.current.intersectObjects(levelGroupsRef.current,true);if(hits.length){let obj:THREE.Object3D|null=hits[0].object;while(obj&&obj.userData.levelIndex===undefined)obj=obj.parent;if(obj&&obj.userData.levelIndex!==undefined){const idx=obj.userData.levelIndex as number;if(idx>0&&idx===liveRef.current.selectedLevel){movingLevelRef.current=idx;const y=liveRef.current.levels.slice(0,idx).reduce((s,l)=>s+l.height/7,0);dragPlaneRef.current.set(new THREE.Vector3(0,1,0),-y);}}}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const o=orbitRef.current;if(pointers.size===1){o.dragging=true;o.lastX=e.clientX;o.lastY=e.clientY;}else if(pointers.size===2){o.dragging=false;o.pinch=distance();}canvas.setPointerCapture?.(e.pointerId);};
    const move=(e:PointerEvent)=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const o=orbitRef.current;if(pointers.size===2){movingLevelRef.current=null;const next=distance();if(o.pinch>0){const scale=o.pinch/next;o.radius=Math.max(6,Math.min(24,o.radius*scale));}o.pinch=next;render();return;}if(movingDoorRef.current&&pointers.size===1){const md=movingDoorRef.current,level=liveRef.current.levels[md.levelIndex];if(level){const rect=canvas.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycasterRef.current.setFromCamera(mouse,camera);const y=liveRef.current.levels.slice(0,md.levelIndex).reduce((s,l)=>s+l.height/7,0)+.5;const plane=md.face==="front"||md.face==="back"?new THREE.Plane(new THREE.Vector3(0,0,1),-(level.z+(md.face==="front"?level.depth/14:-level.depth/14))):new THREE.Plane(new THREE.Vector3(1,0,0),-(level.x+(md.face==="right"?level.width/14:-level.width/14)));const hit=new THREE.Vector3();if(raycasterRef.current.ray.intersectPlane(plane,hit)){const center=md.face==="front"||md.face==="back"?level.x:level.z;const span=(md.face==="front"||md.face==="back"?level.width:level.depth)/7*.38;const axis=md.face==="front"||md.face==="back"?hit.x:hit.z;const u=Math.max(-1,Math.min(1,(axis-center)/Math.max(.1,span)));onMoveDoor?.(md.levelIndex,md.id,Math.round(u*20)/20);} }return;}if(movingStatueRef.current!==null&&pointers.size===1){const rect=canvas.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycasterRef.current.setFromCamera(mouse,camera);const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();if(raycasterRef.current.ray.intersectPlane(plane,hit))liveRef.current.onMoveStatue?.(movingStatueRef.current,Math.round(hit.x*4)/4,Math.round(hit.z*4)/4);return;}if(movingLevelRef.current!==null&&pointers.size===1){const rect=canvas.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycasterRef.current.setFromCamera(mouse,camera);const hit=new THREE.Vector3();if(raycasterRef.current.ray.intersectPlane(dragPlaneRef.current,hit)){const snap=.25;onMoveLevel?.(movingLevelRef.current,Math.round(hit.x/snap)*snap,Math.round(hit.z/snap)*snap);}return;}if(!o.dragging)return;const dx=e.clientX-o.lastX,dy=e.clientY-o.lastY;o.lastX=e.clientX;o.lastY=e.clientY;o.theta-=dx*.008;o.phi=Math.max(.16,Math.min(1.56,o.phi+dy*.006));render();};
    const up=(e:PointerEvent)=>{movingLevelRef.current=null;movingStatueRef.current=null;movingDoorRef.current=null;const start=pointerDownRef.current;pointerDownRef.current=null;if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<8&&pointers.size===1){const rect=canvas.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycasterRef.current.setFromCamera(mouse,camera);const statueTap=raycasterRef.current.intersectObjects(statueGroupsRef.current,true);if(statueTap.length){let so:THREE.Object3D|null=statueTap[0].object;while(so&&so.userData.statueId===undefined)so=so.parent;if(so)liveRef.current.onSelectStatue?.(so.userData.statueId as string);}const perimeterTap=statueTap.length?[]:(perimeterGroupRef.current?raycasterRef.current.intersectObjects(perimeterGroupRef.current.children,true):[]);if(perimeterTap.length)liveRef.current.onSelectPerimeter?.();const hits=(statueTap.length||perimeterTap.length)?[]:raycasterRef.current.intersectObjects(levelGroupsRef.current,true);if(hits.length){let obj:THREE.Object3D|null=hits[0].object;while(obj&&obj.userData.levelIndex===undefined)obj=obj.parent;if(obj&&obj.userData.levelIndex!==undefined){const idx=obj.userData.levelIndex as number;onSelectLevel?.(idx);const hit=hits[0];if(hit.face){const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);const ax=Math.abs(n.x),az=Math.abs(n.z);const face:WallFace=ax>az?(n.x>0?"right":"left"):(n.z>0?"front":"back");onSelectFace?.(idx,face);}}}}pointers.delete(e.pointerId);const o=orbitRef.current;o.pinch=0;if(pointers.size===1){const pt=[...pointers.values()][0];o.dragging=true;o.lastX=pt.x;o.lastY=pt.y;}else{o.dragging=false;}};
    const wheel=(e:WheelEvent)=>{e.preventDefault();const o=orbitRef.current;o.radius=Math.max(6,Math.min(24,o.radius+e.deltaY*.012));render();};
    canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);canvas.addEventListener("wheel",wheel,{passive:false});
    window.addEventListener("resize",resize); resize();
    return()=>{window.removeEventListener("resize",resize);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("wheel",wheel);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});renderer.dispose();canvas.remove();};
  },[]);

  useEffect(()=>{
    const group=groupRef.current,scene=sceneRef.current,renderer=rendererRef.current,camera=cameraRef.current;if(!group||!scene||!renderer||!camera)return;
    const totalWorldHeight=levels.reduce((sum,l)=>sum+l.height/7,0);
    targetYRef.current=Math.max(1.4,totalWorldHeight*.52);
    orbitRef.current.radius=Math.max(orbitRef.current.radius,Math.min(24,10+totalWorldHeight*.72));
    while(group.children.length){const o=group.children.pop()!;o.traverse(child=>{if(child instanceof THREE.Mesh){child.geometry.dispose();const m=child.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});}
    levelGroupsRef.current=[];
    let baseY=0;

    const addRoof=(parent:THREE.Group,roof:RoofStyle,rw:number,rd:number,x:number,z:number,top:number,color:number)=>{
      const roofMat=()=>new THREE.MeshStandardMaterial({color,roughness:.7});
      const add=(g:THREE.BufferGeometry,px:number,py:number,pz:number)=>{const m=new THREE.Mesh(g,roofMat());m.position.set(px,py,pz);parent.add(m);};
      if(roof==="none")return;
      if(roof==="flat"){add(new THREE.BoxGeometry(rw+.22,.18,rd+.22),x,top+.09,z);return;}
      if(roof==="pyramid"){const rh=Math.max(.7,Math.min(1.5,rw*.18));const g=new THREE.CylinderGeometry(0,1,rh,4,1,false);g.rotateY(Math.PI/4);g.scale(rw*.72,1,rd*.72);add(g,x,top+rh/2,z);return;}
      if(roof==="dome"){const r=Math.min(rw,rd)*.53;add(new THREE.SphereGeometry(r,24,12,0,Math.PI*2,0,Math.PI/2),x,top,z);return;}
      const r=Math.min(rw,rd)*.52,rh=roof==="steeple"?Math.max(2.2,r*2.6):Math.max(1.3,r*1.25);add(new THREE.ConeGeometry(r,rh,roof==="cone"?32:8),x,top+rh/2,z);
    };

    levels.forEach((level,index)=>{
      const lg=new THREE.Group();lg.userData.levelIndex=index;lg.position.set(level.x||0,0,level.z||0);lg.rotation.y=THREE.MathUtils.degToRad(level.rotation||0);group.add(lg);levelGroupsRef.current.push(lg);
      const w=level.width/7,d=level.depth/7,h=level.height/7,color=COLORS[level.material];
      const selected=index===selectedLevel;
      const mat=()=>new THREE.MeshStandardMaterial({color:selected?new THREE.Color(color).offsetHSL(0,0,.08):color,roughness:.78,emissive:selected?0x2b2410:0x000000,emissiveIntensity:selected?.16:0});
      const add=(g:THREE.BufferGeometry,x:number,y:number,z:number)=>{const m=new THREE.Mesh(g,mat());m.position.set(x,y,z);lg.add(m);};
      const box=(rw:number,rh:number,rd:number,x:number,y:number,z:number)=>add(new THREE.BoxGeometry(rw,rh,rd),x,y,z);
      const parts:Array<[number,number,number,number]>=level.shape==="l-shape"?[[w*.42,d,-w*.29,0],[w*.72,d*.42,w*.14,d*.29]]:level.shape==="t-shape"?[[w,d*.38,0,d*.30],[w*.36,d*.76,0,-d*.12]]:level.shape==="u-shape"?[[w*.28,d,-w*.36,0],[w*.28,d,w*.36,0],[w*.72,d*.28,0,-d*.36]]:level.shape==="cross"?[[w*.34,d,0,0],[w,d*.34,0,0]]:level.shape==="x-shape"?[[w*.28,d,0,0],[w,d*.28,0,0]]:level.shape==="horseshoe"?[[w*.25,d,-w*.38,0],[w*.25,d,w*.38,0],[w*.75,d*.26,0,-d*.37]]:level.shape==="courtyard"?[[w,d*.24,0,-d*.38],[w,d*.24,0,d*.38],[w*.24,d*.58,-w*.38,0],[w*.24,d*.58,w*.38,0]]:[[w,d,0,0]];
      const polygonShape=(points:Array<[number,number]>)=>{const s=new THREE.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false});g.rotateX(Math.PI/2);g.translate(0,baseY+h,0);return g;};
      const radialPoints=(count:number,outer:number,inner?:number)=>Array.from({length:inner?count*2:count},(_,i)=>{const r=inner?(i%2===0?outer:inner):outer;const a=-Math.PI/2+i*Math.PI/(inner?count:count/2);return [Math.cos(a)*r,Math.sin(a)*r] as [number,number];});
      const addFootprintRoof=(points:Array<[number,number]>,top:number)=>{
        if(level.roof==="none")return;
        if(level.roof==="flat"){
          const s=new THREE.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();
          const g=new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:false});g.rotateX(Math.PI/2);g.translate(0,top+.18,0);add(g,0,0,0);return;
        }
        // Non-flat roofs keep the same footprint by tapering every perimeter edge to a centered apex.
        const rh=Math.max(.7,Math.min(1.8,Math.min(w,d)*.28));
        const vertices:number[]=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];vertices.push(a[0],top,a[1],b[0],top,b[1],0,top+rh,0);}
        const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();add(g,0,0,0);
      };
      if(level.shape==="star"||level.shape==="six-star"){
        const n=level.shape==="star"?5:6,r=Math.min(w,d)*.52,pts=radialPoints(n,r,r*.46);add(polygonShape(pts),0,0,0);addFootprintRoof(pts,baseY+h);
      }else if(level.shape==="triangle"||level.shape==="diamond"||level.shape==="hexagon"){
        const n=level.shape==="triangle"?3:level.shape==="diamond"?4:6,r=Math.min(w,d)*.52;const pts=radialPoints(n,r);if(level.shape==="diamond")pts.forEach(p=>p[0]*=w/d);add(polygonShape(pts),0,0,0);addFootprintRoof(pts,baseY+h);
      }else if(level.shape==="circle"||level.shape==="oval"||level.shape==="ring"||level.shape==="octagon"||level.shape==="rotunda"){
        const sides=level.shape==="octagon"?8:32,r=Math.min(w,d)*.5;
        const pts=Array.from({length:sides},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/sides;return [Math.cos(a)*r*(level.shape==="oval"?w/d:1),Math.sin(a)*r] as [number,number];});
        if(level.shape==="ring"){
          const s=new THREE.Shape();s.absarc(0,0,r,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,r*.55,0,Math.PI*2,true);s.holes.push(hole);const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false});g.rotateX(Math.PI/2);g.translate(0,baseY+h,0);add(g,0,0,0);
          if(level.roof==="flat"){const cap=new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:false});cap.rotateX(Math.PI/2);cap.translate(0,baseY+h+.18,0);add(cap,0,0,0);}else if(level.roof!=="none")addFootprintRoof(pts,baseY+h);
        }else{const body=new THREE.CylinderGeometry(r,r,h,sides);if(level.shape==="oval")body.scale(w/d,1,1);add(body,0,baseY+h/2,0);addFootprintRoof(pts,baseY+h);}
      }else{
        for(const [rw,rd,x,z] of parts){box(rw+.12,.18,rd+.12,x,baseY+.09,z);box(rw,h,rd,x,baseY+h/2,z);}
        for(const [rw,rd,x,z] of parts)addRoof(lg,level.roof,rw,rd,x,z,baseY+h,color);
      }
      for(const win of level.windows||[]){
        const ww=win.width/2.4,wh=win.height/2.4,edge=.04;
        let geometry:THREE.BufferGeometry;
        if(win.style==="round"||win.style==="rose") geometry=new THREE.CylinderGeometry(ww*.55,ww*.55,.08,24);
        else if(win.style==="arched") geometry=new THREE.CapsuleGeometry(ww*.5,Math.max(.15,wh-ww),6,12);
        else geometry=new THREE.BoxGeometry(ww,wh,.08);
        const glassColor=win.style==="stained"?0x6d4d8b:win.style==="rose"?0x7a3f4f:0x273746;
        const frame=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:glassColor,roughness:.3,metalness:.15}));
        if(win.style==="round"||win.style==="rose") frame.rotation.x=Math.PI/2;
        if(win.face==="front"||win.face==="back"){
          frame.position.set((win.u||0)*(w*.38),baseY+h*(win.v||.55),win.face==="front"?d/2+edge:-d/2-edge);
          if(win.face==="back") frame.rotation.y+=Math.PI;
        }else{
          if(win.style!=="round"&&win.style!=="rose"){frame.geometry.dispose();frame.geometry=win.style==="arched"?new THREE.CapsuleGeometry(ww*.5,Math.max(.15,wh-ww),6,12):new THREE.BoxGeometry(.08,wh,ww);}
          frame.position.set(win.face==="right"?w/2+edge:-w/2-edge,baseY+h*(win.v||.55),(win.u||0)*(d*.38));
          frame.rotation.y+=Math.PI/2;
        }
        if(win.style==="double"){
          const mullion=new THREE.Mesh(new THREE.BoxGeometry(.035,wh*.92,.1),new THREE.MeshStandardMaterial({color:0xd8c9a8,roughness:.65}));mullion.position.copy(frame.position);mullion.rotation.copy(frame.rotation);lg.add(mullion);
        }
        frame.userData.levelIndex=index;frame.userData.windowId=win.id;lg.add(frame);
      }
      for(const door of level.doors||[]){
        const dw=door.width/2.2,dh=door.height/2.2,edge=.055;
        const arched=door.style==="arched"||door.style==="temple"||door.style==="portico"||door.style==="wood-arch"||door.style==="stone-arch"||door.style==="grand-arch"||door.style==="carved-stone"||door.style==="metal-gate";
        let dg:THREE.BufferGeometry;
        if(arched){
          // Doorway profile: straight sides + flat floor + curved top (never a capsule).
          const radius=dw/2,straight=Math.max(.18,dh-radius);
          const profile=new THREE.Shape();
          profile.moveTo(-radius,0);profile.lineTo(radius,0);profile.lineTo(radius,straight);
          profile.absarc(0,straight,radius,0,Math.PI,false);
          profile.lineTo(-radius,0);profile.closePath();
          dg=new THREE.ExtrudeGeometry(profile,{depth:.08,bevelEnabled:false});
          dg.translate(0,0,-.04);
        }else dg=new THREE.BoxGeometry(dw,dh,.08);
        const dc=door.style==="bronze"||door.style==="metal-gate"?0x7b552e:door.style==="stone-arch"||door.style==="carved-stone"?0x77736b:door.style==="temple"||door.style==="portico"||door.style==="grand-arch"?0x6b4a2d:0x4b3527;
        const mesh=new THREE.Mesh(dg,new THREE.MeshStandardMaterial({color:dc,roughness:.72,metalness:door.style==="bronze"||door.style==="metal-gate"?.5:.08}));
        const y=arched?baseY:baseY+dh/2;
        if(door.face==="front"||door.face==="back"){mesh.position.set((door.u||0)*(w*.38),y,door.face==="front"?d/2+edge:-d/2-edge);if(door.face==="back")mesh.rotation.y=Math.PI;}
        else{mesh.position.set(door.face==="right"?w/2+edge:-w/2-edge,y,(door.u||0)*(d*.38));mesh.rotation.y=Math.PI/2;}
        mesh.userData.levelIndex=index;mesh.userData.doorId=door.id;mesh.userData.doorFace=door.face;lg.add(mesh);
        if(door.style==="portico"){
          const colMat=new THREE.MeshStandardMaterial({color:0xd9d4cc,roughness:.75});
          for(const side of [-1,1]){const col=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,dh,10),colMat.clone());if(door.face==="front"||door.face==="back")col.position.set(mesh.position.x+side*(dw*.72),y,mesh.position.z+(door.face==="front"?.08:-.08));else col.position.set(mesh.position.x+(door.face==="right"?.08:-.08),y,mesh.position.z+side*(dw*.72));lg.add(col);}
        }
      }
      // Architectural detail system: references supplied for arches, classical/Gothic columns,
      // pediments, stairs and ornamental trim are rendered as procedural 3D pieces.
      const detailMat=()=>new THREE.MeshStandardMaterial({color:color,roughness:.7,metalness:(level.material==="bronze"||level.material==="gold") ? .45 : .03});
      const facePlace=(face:WallFace,u:number,y:number,out:number)=>{
        if(face==="front"||face==="back") return {x:u*(w*.38),y,z:face==="front"?d/2+out:-d/2-out,rot:face==="back"?Math.PI:0};
        return {x:face==="right"?w/2+out:-w/2-out,y,z:u*(d*.38),rot:face==="right"?Math.PI/2:-Math.PI/2};
      };
      for(const col of level.columns||[]){
        const pos=facePlace(col.face,col.u,baseY+h*.48,.13),ch=h*.9;
        const cg=col.style==="square"?new THREE.BoxGeometry(.28,ch,.28):new THREE.CylinderGeometry((col.style==="corinthian"||col.style==="composite") ? .18 : .14,.17,ch,col.style==="fluted"?20:14);
        const cm=new THREE.Mesh(cg,detailMat());cm.position.set(pos.x,pos.y,pos.z);cm.rotation.y=pos.rot;lg.add(cm);
        const cap=new THREE.Mesh(new THREE.BoxGeometry(.42,.16,.42),detailMat());cap.position.set(pos.x,baseY+h*.93,pos.z);cap.rotation.y=pos.rot;lg.add(cap);
        const foot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.25,.12,16),detailMat());foot.position.set(pos.x,baseY+.08,pos.z);lg.add(foot);
        if(col.style==="twisted") cm.rotation.y+=Math.PI/4;
      }
      for(const arch of level.arches||[]){
        const pos=facePlace(arch.face,arch.u,baseY+h*.55,.15);
        const pointed=["pointed","three-pointed","pointed-segmental","lancet","ogee","oriental","pointed-trefoil","pointed-cinquefoil"].includes(arch.style);
        const wide=["segmental","three-centered","four-centered","tudor","venetian","florentine"].includes(arch.style);
        const radius=wide?.8:.62;
        const ag=new THREE.TorusGeometry(radius,.09,8,28,Math.PI);
        const am=new THREE.Mesh(ag,detailMat());am.position.set(pos.x,pos.y,pos.z);am.rotation.z=Math.PI;am.rotation.y=pos.rot;
        if(pointed) am.scale.set(1,.72,1);
        if(arch.style==="horseshoe"||arch.style==="keyhole") am.scale.set(.85,1.12,1);
        lg.add(am);
        for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.12,h*.48,.14),detailMat());const offset=side*radius;if(arch.face==="front"||arch.face==="back")leg.position.set(pos.x+offset,baseY+h*.31,pos.z);else leg.position.set(pos.x,baseY+h*.31,pos.z+offset);lg.add(leg);}
      }
      for(const trim of level.trims||[]){
        const pos=facePlace(trim.face,0,trim.style==="base"?baseY+.12:trim.style==="crown"||trim.style==="dentils"||trim.style==="frieze"?baseY+h-.16:baseY+h*.72,.11);
        const len=(trim.face==="front"||trim.face==="back")?w:d;
        const tg=new THREE.BoxGeometry(len,trim.style==="frieze"?.28:.12,.12);
        const tm=new THREE.Mesh(tg,detailMat());tm.position.set(pos.x,pos.y,pos.z);tm.rotation.y=pos.rot;lg.add(tm);
        if(["dentils","greek-fret","acanthus","rosette"].includes(trim.style)){for(let k=-4;k<=4;k++){const deco=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.08),detailMat());const du=k*len/10;if(trim.face==="front"||trim.face==="back")deco.position.set(du,pos.y-.13,pos.z);else deco.position.set(pos.x,pos.y-.13,du);lg.add(deco);}}
      }
      for(const stair of level.stairs||[]){
        const pos=facePlace(stair.face,stair.u,baseY,.22),sw=stair.style==="wide"||stair.style==="split"?1.8:1.15;
        for(let k=0;k<5;k++){const step=new THREE.Mesh(new THREE.BoxGeometry(sw,.12,.34+k*.12),detailMat());const outward=.28+k*.13;step.position.set(pos.x,baseY+.06+k*.1,pos.z);if(stair.face==="front")step.position.z+=outward;else if(stair.face==="back")step.position.z-=outward;else if(stair.face==="right")step.position.x+=outward;else step.position.x-=outward;step.rotation.y=pos.rot;lg.add(step);}
      }
      for(const ped of level.pediments||[]){
        const pos=facePlace(ped.face,ped.u,baseY+h*.9,.17),pw=1.55;
        if(ped.style==="segmental"||ped.style==="broken-segmental"||ped.style==="swan-neck"){const pg=new THREE.TorusGeometry(pw/2,.1,8,24,Math.PI);const pm=new THREE.Mesh(pg,detailMat());pm.position.set(pos.x,pos.y,pos.z);pm.rotation.z=Math.PI;pm.rotation.y=pos.rot;lg.add(pm);}
        else {for(const side of [-1,1]){const bar=new THREE.Mesh(new THREE.BoxGeometry(pw*.58,.11,.13),detailMat());bar.position.set(pos.x+(ped.face==="front"||ped.face==="back"?side*.34:0),pos.y+.22,pos.z+(ped.face==="left"||ped.face==="right"?side*.34:0));bar.rotation.y=pos.rot;bar.rotation.z=side*.5;lg.add(bar);}}
      }
      baseY+=h;
      if(index>0){
        const below=levels[index-1];
        const exposed=Math.abs(level.x||0)>.15||Math.abs(level.z||0)>.15||level.width<below.width-4||level.depth<below.depth-4;
        if(exposed!==level.patio) queueMicrotask(()=>onPatioChange?.(index,exposed));
      }
    });
    statueGroupsRef.current=[];
    const statueColor=(f:Statue["finish"])=>f==="bronze"?0x8a6038:f==="gold"?0xc9a84f:f==="obsidian"?0x25252b:0xd9d4cc;
    for(const statue of statues){
      const sg=new THREE.Group();sg.userData.statueId=statue.id;sg.position.set(statue.x,0,statue.z);sg.rotation.y=THREE.MathUtils.degToRad(statue.rotation);sg.scale.setScalar(statue.scale);group.add(sg);statueGroupsRef.current.push(sg);
      const sm=new THREE.MeshStandardMaterial({color:statueColor(statue.finish),roughness:(statue.finish==="gold"||statue.finish==="bronze")?.42:.72,metalness:statue.finish==="gold"?.65:statue.finish==="bronze"?.45:.05,emissive:statue.id===selectedStatueId?0x241d08:0,emissiveIntensity:.22});
      const mesh=(g:THREE.BufferGeometry,x:number,y:number,z:number)=>{const m=new THREE.Mesh(g,sm.clone());m.position.set(x,y,z);sg.add(m);return m;};
      mesh(new THREE.CylinderGeometry(.42,.5,.22,18),0,.11,0);
      if(statue.kind==="lion"){
        mesh(new THREE.SphereGeometry(.42,16,10),0,.72,0);const body=mesh(new THREE.CapsuleGeometry(.34,.8,6,12),0,.55,-.25);body.rotation.x=Math.PI/2;for(const x of [-.25,.25])for(const z of [-.48,.05])mesh(new THREE.CylinderGeometry(.07,.09,.48,10),x,.3,z);
      }else{
        mesh(new THREE.CapsuleGeometry(.24,.9,6,12),0,.8,0);mesh(new THREE.SphereGeometry(.2,16,10),0,1.52,0);
        if(statue.kind==="angel"){for(const side of [-1,1]){const wing=mesh(new THREE.ConeGeometry(.32,1.15,5),side*.38,1.05,.08);wing.rotation.z=side*.55;}}
        else {for(const side of [-1,1]){const arm=mesh(new THREE.CylinderGeometry(.065,.075,.65,10),side*.32,.9,0);arm.rotation.z=side*.25;}mesh(new THREE.CylinderGeometry(.12,.18,.7,12),0,.42,0);}
      }
    }
    perimeterGroupRef.current=null;
    if(perimeter && levels.length){
      const pg=new THREE.Group();pg.userData.perimeter=true;group.add(pg);perimeterGroupRef.current=pg;
      const mat=new THREE.MeshStandardMaterial({color:COLORS[perimeter.material],roughness:.78});
      const addWall=(len:number,x:number,z:number,rot:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(len,perimeter.height,perimeter.thickness),mat.clone());m.position.set(x,perimeter.height/2,z);m.rotation.y=rot;pg.add(m);};
      const maxW=Math.max(...levels.map(l=>l.width/7+Math.abs(l.x||0)*2))+perimeter.margin*2;
      const maxD=Math.max(...levels.map(l=>l.depth/7+Math.abs(l.z||0)*2))+perimeter.margin*2;
      const points:Array<[number,number]>=perimeter.style==="circle"?Array.from({length:32},(_,i)=>{const a=i*Math.PI*2/32;return [Math.cos(a)*maxW/2,Math.sin(a)*maxD/2] as [number,number];}):perimeter.style==="octagon"?Array.from({length:8},(_,i)=>{const a=-Math.PI/8+i*Math.PI*2/8;return [Math.cos(a)*maxW/2,Math.sin(a)*maxD/2] as [number,number];}):perimeter.style==="star"?Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2===0?1:.72;return [Math.cos(a)*maxW/2*r,Math.sin(a)*maxD/2*r] as [number,number];}):[[-maxW/2,-maxD/2],[maxW/2,-maxD/2],[maxW/2,maxD/2],[-maxW/2,maxD/2]];
      points.forEach((a,i)=>{const b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1];addWall(Math.hypot(dx,dz),(a[0]+b[0])/2,(a[1]+b[1])/2,-Math.atan2(dz,dx));});
      if(perimeter.gate){const front=points.reduce((best,p)=>p[1]>best[1]?p:best,points[0]);const gate=new THREE.Mesh(new THREE.BoxGeometry(1.4,perimeter.height*.82,.16),new THREE.MeshStandardMaterial({color:0x4b3527,roughness:.65,metalness:.18}));gate.position.set(front[0],perimeter.height*.41,front[1]);pg.add(gate);}
      if(perimeter.towers){const towerMat=mat.clone();points.forEach(([x,z])=>{const r=.38;let g:THREE.BufferGeometry;if(perimeter.towerShape==="square")g=new THREE.BoxGeometry(.8,perimeter.height*1.5,.8);else if(perimeter.towerShape==="star"){const sh=new THREE.Shape();for(let i=0;i<10;i++){const rr=i%2===0?r:r*.48,a=-Math.PI/2+i*Math.PI/5;i?sh.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):sh.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}sh.closePath();g=new THREE.ExtrudeGeometry(sh,{depth:perimeter.height*1.5,bevelEnabled:false});g.rotateX(Math.PI/2);g.translate(0,perimeter.height*1.5,0);}else g=new THREE.CylinderGeometry(r,r,perimeter.height*1.5,perimeter.towerShape==="octagon"?8:perimeter.towerShape==="hexagon"?6:20);const t=new THREE.Mesh(g,towerMat.clone());t.position.set(x,perimeter.towerShape==="star"?0:perimeter.height*.75,z);pg.add(t);});}
      if(perimeter.columns||perimeter.arches){const frontZ=Math.max(...points.map(p=>p[1]));for(const x of [-1.1,1.1]){if(perimeter.columns){const col=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,perimeter.height*1.1,12),mat.clone());col.position.set(x,perimeter.height*.55,frontZ);pg.add(col);}}if(perimeter.arches){const arch=new THREE.Mesh(new THREE.TorusGeometry(.75,.12,8,20,Math.PI),mat.clone());arch.rotation.z=Math.PI;arch.position.set(0,perimeter.height*.78,frontZ);pg.add(arch);}}
    }
    const o=orbitRef.current;camera.position.set(Math.sin(o.theta)*Math.sin(o.phi)*o.radius,Math.cos(o.phi)*o.radius,Math.cos(o.theta)*Math.sin(o.phi)*o.radius);camera.lookAt(0,targetYRef.current,0);renderer.render(scene,camera);
  },[levels,perimeter,statues,selectedStatueId,selectedLevel]);

  return <div ref={hostRef} className="absolute inset-0"><div className="pointer-events-none absolute bottom-[128px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-2 text-xs text-white/70">Drag to look around • pinch to zoom</div></div>;
}
