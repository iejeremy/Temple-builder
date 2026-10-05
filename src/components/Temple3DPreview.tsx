"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { BuildingLevel, RoofStyle, WallFace, SitePiece } from "@/app/page";

const COLORS: Record<BuilderMaterial, number> = {
  marble: 0xd9d4cc, sandstone: 0xb98b5b, limestone: 0xc6b898, obsidian: 0x25262b,
};

export default function Temple3DPreview({ levels, sitePieces, selectedLevel, selectedPieceId, onSelectLevel, onSelectFace, onMoveLevel, onPatioChange, onMoveWindow, onSelectPiece, onMovePiece }: {
  levels: BuildingLevel[];
  sitePieces: SitePiece[];
  selectedLevel: number;
  selectedPieceId?: string | null;
  onSelectLevel?: (index: number) => void;
  onSelectFace?: (index: number, face: WallFace) => void;
  onMoveLevel?: (index: number, x: number, z: number) => void;
  onPatioChange?: (index: number, patio: boolean) => void;
  onMoveWindow?: (levelIndex: number, id: string, u: number, v: number) => void;
  onSelectPiece?: (id: string) => void;
  onMovePiece?: (id: string, x: number, z: number) => void;
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
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0,1,0),0));
  const siteGroupsRef = useRef<THREE.Group[]>([]);
  const movingPieceRef = useRef<string|null>(null);
  const liveRef = useRef({levels,selectedLevel,selectedPieceId,onSelectLevel,onSelectFace,onMoveLevel,onSelectPiece,onMovePiece});
  liveRef.current={levels,selectedLevel,selectedPieceId,onSelectLevel,onSelectFace,onMoveLevel,onSelectPiece,onMovePiece};

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
    const down=(e:PointerEvent)=>{pointerDownRef.current={x:e.clientX,y:e.clientY};const rect=canvas.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycasterRef.current.setFromCamera(mouse,camera);const siteHits=raycasterRef.current.intersectObjects(siteGroupsRef.current,true);if(siteHits.length){let so:THREE.Object3D|null=siteHits[0].object;while(so&&so.userData.sitePieceId===undefined)so=so.parent;if(so){const id=so.userData.sitePieceId as string;liveRef.current.onSelectPiece?.(id);if(id===liveRef.current.selectedPieceId){movingPieceRef.current=id;dragPlaneRef.current.set(new THREE.Vector3(0,1,0),0);}}}const hits=siteHits.length?[]:raycasterRef.current.intersectObjects(levelGroupsRef.current,true);if(hits.length){let obj:THREE.Object3D|null=hits[0].object;while(obj&&obj.userData.levelIndex===undefined)obj=obj.parent;if(obj&&obj.userData.levelIndex!==undefined){const idx=obj.userData.levelIndex as number;onSelectLevel?.(idx);if(idx>0&&idx===selectedLevel){movingLevelRef.current=idx;const y=levels.slice(0,idx).reduce((s,l)=>s+l.height/7,0);dragPlaneRef.current.set(new THREE.Vector3(0,1,0),-y);}}}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const o=orbitRef.current;if(pointers.size===1){o.dragging=true;o.lastX=e.clientX;o.lastY=e.clientY;}else if(pointers.size===2){o.dragging=false;o.pinch=distance();}canvas.setPointerCapture?.(e.pointerId);};
    const move=(e:PointerEvent)=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const o=orbitRef.current;if(pointers.size===2){movingLevelRef.current=null;const next=distance();if(o.pinch>0){const scale=o.pinch/next;o.radius=Math.max(6,Math.min(24,o.radius*scale));}o.pinch=next;render();return;}if(movingPieceRef.current!==null&&pointers.size===1){const rect=canvas.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycasterRef.current.setFromCamera(mouse,camera);const hit=new THREE.Vector3();if(raycasterRef.current.ray.intersectPlane(dragPlaneRef.current,hit)){let x=Math.round(hit.x/.25)*.25,z=Math.round(hit.z/.25)*.25;for(const other of siteGroupsRef.current){if(other.userData.sitePieceId===movingPieceRef.current)continue;if(Math.hypot(x-other.position.x,z-other.position.z)<.65){x=other.position.x;z=other.position.z;break;}}liveRef.current.onMovePiece?.(movingPieceRef.current,x,z);}return;}if(movingLevelRef.current!==null&&pointers.size===1){const rect=canvas.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycasterRef.current.setFromCamera(mouse,camera);const hit=new THREE.Vector3();if(raycasterRef.current.ray.intersectPlane(dragPlaneRef.current,hit)){const snap=.25;onMoveLevel?.(movingLevelRef.current,Math.round(hit.x/snap)*snap,Math.round(hit.z/snap)*snap);}return;}if(!o.dragging)return;const dx=e.clientX-o.lastX,dy=e.clientY-o.lastY;o.lastX=e.clientX;o.lastY=e.clientY;o.theta-=dx*.008;o.phi=Math.max(.16,Math.min(1.56,o.phi+dy*.006));render();};
    const up=(e:PointerEvent)=>{movingLevelRef.current=null;movingPieceRef.current=null;const start=pointerDownRef.current;pointerDownRef.current=null;if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<8&&pointers.size===1){const rect=canvas.getBoundingClientRect();const mouse=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);raycasterRef.current.setFromCamera(mouse,camera);const hits=raycasterRef.current.intersectObjects(levelGroupsRef.current,true);if(hits.length){let obj:THREE.Object3D|null=hits[0].object;while(obj&&obj.userData.levelIndex===undefined)obj=obj.parent;if(obj&&obj.userData.levelIndex!==undefined){const idx=obj.userData.levelIndex as number;onSelectLevel?.(idx);const hit=hits[0];if(hit.face){const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);const ax=Math.abs(n.x),az=Math.abs(n.z);const face:WallFace=ax>az?(n.x>0?"right":"left"):(n.z>0?"front":"back");onSelectFace?.(idx,face);}}}}pointers.delete(e.pointerId);const o=orbitRef.current;o.pinch=0;if(pointers.size===1){const pt=[...pointers.values()][0];o.dragging=true;o.lastX=pt.x;o.lastY=pt.y;}else{o.dragging=false;}};
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
      if(level.shape==="star"||level.shape==="six-star"){
        const n=level.shape==="star"?5:6,r=Math.min(w,d)*.52;add(polygonShape(radialPoints(n,r,r*.46)),0,0,0);addRoof(lg,level.roof,w,d,0,0,baseY+h,color);
      }else if(level.shape==="triangle"||level.shape==="diamond"||level.shape==="hexagon"){
        const n=level.shape==="triangle"?3:level.shape==="diamond"?4:6,r=Math.min(w,d)*.52;const pts=radialPoints(n,r);if(level.shape==="diamond")pts.forEach(p=>p[0]*=w/d);add(polygonShape(pts),0,0,0);addRoof(lg,level.roof,w,d,0,0,baseY+h,color);
      }else if(level.shape==="circle"||level.shape==="oval"||level.shape==="ring"||level.shape==="octagon"||level.shape==="rotunda"){
        const sides=level.shape==="octagon"?8:32,r=Math.min(w,d)*.5;
        if(level.shape==="ring"){
          const s=new THREE.Shape();s.absarc(0,0,r,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,r*.55,0,Math.PI*2,true);s.holes.push(hole);add(polygonShape(s.getPoints(48).map(p=>[p.x,p.y] as [number,number])),0,0,0);
        }else{const body=new THREE.CylinderGeometry(r,r,h,sides);if(level.shape==="oval")body.scale(w/d,1,1);add(body,0,baseY+h/2,0);}
        addRoof(lg,level.roof,w,d,0,0,baseY+h,color);
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
        const arched=door.style==="arched"||door.style==="temple"||door.style==="portico";
        const dg=arched?new THREE.CapsuleGeometry(dw*.5,Math.max(.2,dh-dw),6,12):new THREE.BoxGeometry(dw,dh,.1);
        const dc=door.style==="bronze"?0x7b552e:door.style==="temple"||door.style==="portico"?0x6b4a2d:0x4b3527;
        const mesh=new THREE.Mesh(dg,new THREE.MeshStandardMaterial({color:dc,roughness:.72,metalness:door.style==="bronze"?.5:.08}));
        const y=baseY+dh/2+.08;
        if(door.face==="front"||door.face==="back"){mesh.position.set((door.u||0)*(w*.38),y,door.face==="front"?d/2+edge:-d/2-edge);if(door.face==="back")mesh.rotation.y=Math.PI;}
        else{mesh.position.set(door.face==="right"?w/2+edge:-w/2-edge,y,(door.u||0)*(d*.38));mesh.rotation.y=Math.PI/2;}
        mesh.userData.levelIndex=index;mesh.userData.doorId=door.id;lg.add(mesh);
        if(door.style==="portico"){
          const colMat=new THREE.MeshStandardMaterial({color:0xd9d4cc,roughness:.75});
          for(const side of [-1,1]){const col=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,dh,10),colMat.clone());if(door.face==="front"||door.face==="back")col.position.set(mesh.position.x+side*(dw*.72),y,mesh.position.z+(door.face==="front"?.08:-.08));else col.position.set(mesh.position.x+(door.face==="right"?.08:-.08),y,mesh.position.z+side*(dw*.72));lg.add(col);}
        }
      }
      baseY+=h;
      if(index>0){
        const below=levels[index-1];
        const exposed=Math.abs(level.x||0)>.15||Math.abs(level.z||0)>.15||level.width<below.width-4||level.depth<below.depth-4;
        if(exposed!==level.patio) queueMicrotask(()=>onPatioChange?.(index,exposed));
      }
    });
    const siteMat=(m:SitePiece["material"],selected=false)=>new THREE.MeshStandardMaterial({color:selected?new THREE.Color(COLORS[m]).offsetHSL(0,0,.1):COLORS[m],roughness:.78,emissive:selected?0x493d13:0,emissiveIntensity:selected?.18:0});
    siteGroupsRef.current=[];
    sitePieces.forEach(piece=>{
      const pg=new THREE.Group();pg.userData.sitePieceId=piece.id;pg.position.set(piece.x,0,piece.z);siteGroupsRef.current.push(pg);pg.rotation.y=THREE.MathUtils.degToRad(piece.rotation);group.add(pg);
      const addSite=(geo:THREE.BufferGeometry,x:number,y:number,z:number)=>{const mesh=new THREE.Mesh(geo,siteMat(piece.material,piece.id===selectedPieceId));mesh.position.set(x,y,z);pg.add(mesh);};
      if(piece.type==="wall") addSite(new THREE.BoxGeometry(piece.width,piece.height,.28),0,piece.height/2,0);
      if(piece.type==="pillar") addSite(new THREE.BoxGeometry(.55,piece.height,.55),0,piece.height/2,0);
      if(piece.type==="columns"){for(const x of [-.7,.7])addSite(new THREE.CylinderGeometry(.18,.22,piece.height,12),x,piece.height/2,0);}
      if(piece.type==="corner"){addSite(new THREE.BoxGeometry(piece.width,piece.height,.28),0,piece.height/2,0);addSite(new THREE.BoxGeometry(.28,piece.height,piece.width),-piece.width/2+.14,piece.height/2,piece.width/2-.14);}
      if(piece.type==="balustrade"){addSite(new THREE.BoxGeometry(piece.width,.18,.32),0,.18,0);addSite(new THREE.BoxGeometry(piece.width,.16,.32),0,piece.height,0);for(let x=-piece.width/2+.25;x<piece.width/2;x+=.45)addSite(new THREE.BoxGeometry(.12,piece.height-.2,.12),x,piece.height/2,0);}
      if(piece.type==="gate"||piece.type==="archway"){const side=.48,gap=piece.width*.5;addSite(new THREE.BoxGeometry(side,piece.height,.45),-gap/2-side/2,piece.height/2,0);addSite(new THREE.BoxGeometry(side,piece.height,.45),gap/2+side/2,piece.height/2,0);addSite(new THREE.BoxGeometry(piece.width+side*2,.42,.45),0,piece.height-.2,0);if(piece.type==="gate"){const gm=new THREE.MeshStandardMaterial({color:0x4b3527,roughness:.65,metalness:.18});for(const x of [-.45,0,.45]){const bar=new THREE.Mesh(new THREE.BoxGeometry(.08,piece.height*.72,.12),gm);bar.position.set(x,piece.height*.36,.02);pg.add(bar);}}}
      if(piece.type==="tower"){const r=piece.width/2,s=piece.towerShape;let geo:THREE.BufferGeometry;if(s==="square")geo=new THREE.BoxGeometry(piece.width,piece.height,piece.width);else if(s==="star"){const sh=new THREE.Shape();for(let i=0;i<10;i++){const rr=i%2===0?r:r*.48,a=-Math.PI/2+i*Math.PI/5;i?sh.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):sh.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}sh.closePath();geo=new THREE.ExtrudeGeometry(sh,{depth:piece.height,bevelEnabled:false});geo.rotateX(Math.PI/2);geo.translate(0,piece.height,0);}else geo=new THREE.CylinderGeometry(r,r,piece.height,s==="octagon"?8:s==="hexagon"?6:s==="spire"?16:24);addSite(geo,0,s==="star"?0:piece.height/2,0);if(s==="spire")addSite(new THREE.ConeGeometry(r*1.05,piece.height*.55,16),0,piece.height*1.275,0);}
    });
    const o=orbitRef.current;camera.position.set(Math.sin(o.theta)*Math.sin(o.phi)*o.radius,Math.cos(o.phi)*o.radius,Math.cos(o.theta)*Math.sin(o.phi)*o.radius);camera.lookAt(0,targetYRef.current,0);renderer.render(scene,camera);
  },[levels,sitePieces,selectedLevel,selectedPieceId]);

  return <div ref={hostRef} className="absolute inset-0"><div className="pointer-events-none absolute bottom-[128px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-2 text-xs text-white/70">Drag to look around • pinch to zoom</div></div>;
}
