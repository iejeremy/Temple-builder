"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { BuildingShape, BuilderMaterial, RoofStyle } from "@/app/page";

const COLORS: Record<BuilderMaterial, number> = {
  marble: 0xd9d4cc, sandstone: 0xb98b5b, limestone: 0xc6b898, obsidian: 0x25262b,
};

export default function Temple3DPreview({ shape, material, width, depth, height, roof, levels }: {
  shape: BuildingShape | null; material: BuilderMaterial; width: number; depth: number; height: number; roof: RoofStyle; levels: number;
}) {
  const hostRef = useRef<HTMLDivElement|null>(null);
  const groupRef = useRef<THREE.Group|null>(null);
  const sceneRef = useRef<THREE.Scene|null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer|null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera|null>(null);
  const orbitRef = useRef({ theta: .72, phi: .92, radius: 13, lastX: 0, lastY: 0, dragging: false, pinch: 0 });

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
      camera.lookAt(0,1.4,0); renderer.render(scene,camera);
    };
    const resize=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);render();};
    const canvas=renderer.domElement; canvas.style.touchAction="none";
    const pointers=new Map<number,{x:number,y:number}>();
    const distance=()=>{const pts=[...pointers.values()];return pts.length<2?0:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);};
    const down=(e:PointerEvent)=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const o=orbitRef.current;if(pointers.size===1){o.dragging=true;o.lastX=e.clientX;o.lastY=e.clientY;}else if(pointers.size===2){o.dragging=false;o.pinch=distance();}canvas.setPointerCapture?.(e.pointerId);};
    const move=(e:PointerEvent)=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const o=orbitRef.current;if(pointers.size===2){const next=distance();if(o.pinch>0){const scale=o.pinch/next;o.radius=Math.max(6,Math.min(24,o.radius*scale));}o.pinch=next;render();return;}if(!o.dragging)return;const dx=e.clientX-o.lastX,dy=e.clientY-o.lastY;o.lastX=e.clientX;o.lastY=e.clientY;o.theta-=dx*.008;o.phi=Math.max(.35,Math.min(1.45,o.phi+dy*.006));render();};
    const up=(e:PointerEvent)=>{pointers.delete(e.pointerId);const o=orbitRef.current;o.pinch=0;if(pointers.size===1){const pt=[...pointers.values()][0];o.dragging=true;o.lastX=pt.x;o.lastY=pt.y;}else{o.dragging=false;}};
    const wheel=(e:WheelEvent)=>{e.preventDefault();const o=orbitRef.current;o.radius=Math.max(6,Math.min(24,o.radius+e.deltaY*.012));render();};
    canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);canvas.addEventListener("wheel",wheel,{passive:false});
    window.addEventListener("resize",resize); resize();
    return()=>{window.removeEventListener("resize",resize);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("wheel",wheel);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});renderer.dispose();canvas.remove();};
  },[]);

  useEffect(()=>{
    const group=groupRef.current,scene=sceneRef.current,renderer=rendererRef.current,camera=cameraRef.current;if(!group||!scene||!renderer||!camera)return;
    while(group.children.length){const o=group.children.pop()!;if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}}
    if(shape){
      const w=width/7,d=depth/7,h=height/7,color=COLORS[material],count=Math.max(1,Math.min(4,levels));
      const mat=()=>new THREE.MeshStandardMaterial({color,roughness:.78});
      const roofMat=()=>new THREE.MeshStandardMaterial({color,roughness:.7});
      const addMesh=(geometry:THREE.BufferGeometry,x:number,y:number,z:number,m=mat())=>{const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
      const box=(sx:number,sy:number,sz:number,x:number,y:number,z:number,m=mat())=>addMesh(new THREE.BoxGeometry(sx,sy,sz),x,y,z,m);

      const addRoof=(rw:number,rd:number,x:number,z:number,top:number)=>{
        if(roof==="none") return;
        if(roof==="flat"){ box(rw+.22,.18,rd+.22,x,top+.09,z,roofMat()); return; }
        if(roof==="pyramid"){
          const rh=Math.max(.7,Math.min(1.5,rw*.18));const g=new THREE.CylinderGeometry(0,1,rh,4,1,false);g.rotateY(Math.PI/4);g.scale(rw*.72,1,rd*.72);addMesh(g,x,top+rh/2,z,roofMat());return;
        }
        if(roof==="dome"){
          const r=Math.min(rw,rd)*.53;const g=new THREE.SphereGeometry(r,24,12,0,Math.PI*2,0,Math.PI/2);addMesh(g,x,top,z,roofMat());return;
        }
        const r=Math.min(rw,rd)*.52;
        const rh=roof==="steeple"?Math.max(2.2,r*2.6):Math.max(1.3,r*1.25);
        addMesh(new THREE.ConeGeometry(r,rh,roof==="cone"?32:8),x,top+rh/2,z,roofMat());
      };

      const masses:(level:number)=>Array<[number,number,number,number]> = (level)=>{
        const shrink=Math.pow(.84,level),sw=w*shrink,sd=d*shrink;
        if(shape==="l-shape") return [[sw*.42,sd,-sw*.29,0],[sw*.72,sd*.42,sw*.14,sd*.29]];
        if(shape==="t-shape") return [[sw,sd*.38,0,sd*.30],[sw*.36,sd*.76,0,-sd*.12]];
        if(shape==="u-shape") return [[sw*.28,sd,-sw*.36,0],[sw*.28,sd,sw*.36,0],[sw*.72,sd*.28,0,-sd*.36]];
        if(shape==="cross") return [[sw*.34,sd,0,0],[sw,sd*.34,0,0]];
        if(shape==="courtyard") return [[sw,sd*.24,0,-sd*.38],[sw,sd*.24,0,sd*.38],[sw*.24,sd*.58,-sw*.38,0],[sw*.24,sd*.58,sw*.38,0]];
        return [[sw,sd,0,0]];
      };

      for(let level=0;level<count;level++){
        const baseY=level*h;
        if(shape==="octagon"||shape==="rotunda"){
          const shrink=Math.pow(.84,level),radius=Math.min(w,d)*.5*shrink,sides=shape==="rotunda"?32:8;
          addMesh(new THREE.CylinderGeometry(radius*1.04,radius*1.04,.18,sides),0,baseY+.09,0);
          addMesh(new THREE.CylinderGeometry(radius,radius,h,sides),0,baseY+h/2,0);
          if(level===count-1) addRoof(radius*2,radius*2,0,0,baseY+h);
        } else {
          const parts=masses(level);
          for(const [rw,rd,x,z] of parts){box(rw+.12,.18,rd+.12,x,baseY+.09,z);box(rw,h,rd,x,baseY+h/2,z);}
          if(level===count-1){
            if(parts.length===1) addRoof(parts[0][0],parts[0][1],parts[0][2],parts[0][3],baseY+h);
            else { const shrink=Math.pow(.84,level); addRoof(w*shrink,d*shrink,0,0,baseY+h); }
          }
        }
      }
    }
    const o=orbitRef.current;camera.position.set(Math.sin(o.theta)*Math.sin(o.phi)*o.radius,Math.cos(o.phi)*o.radius,Math.cos(o.theta)*Math.sin(o.phi)*o.radius);camera.lookAt(0,1.4,0);renderer.render(scene,camera);
  },[shape,material,width,depth,height,roof,levels]);

  return <div ref={hostRef} className="absolute inset-0"><div className="pointer-events-none absolute bottom-[128px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-2 text-xs text-white/70">Drag to look around • pinch to zoom</div></div>;
}
