"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { BuildingShape, BuilderMaterial } from "@/app/page";

const COLORS: Record<BuilderMaterial, number> = {
  marble: 0xd9d4cc, sandstone: 0xb98b5b, limestone: 0xc6b898, obsidian: 0x25262b,
};

export default function Temple3DPreview({ shape, material, width, depth, height }: {
  shape: BuildingShape | null; material: BuilderMaterial; width: number; depth: number; height: number;
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
      const w=width/7,d=depth/7,h=height/7,color=COLORS[material];
      const mat=()=>new THREE.MeshStandardMaterial({color,roughness:.78});
      const roofMat=()=>new THREE.MeshStandardMaterial({color,roughness:.72});
      const box=(sx:number,sy:number,sz:number,x:number,y:number,z:number,m=mat())=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),m);mesh.position.set(x,y,z);group.add(mesh);};
      const roofBox=(sx:number,sz:number,x:number,z:number)=>box(sx,.18,sz,x,h+.09,z,roofMat());
      const room=(rw:number,rd:number,x=0,z=0,roof=true)=>{
        box(rw+.12,.18,rd+.12,x,.09,z);
        // Solid massing makes each preset read as a complete building. Open/custom walls remain a separate tool.
        box(rw,h,rd,x,h/2,z);
        if(roof) roofBox(rw+.22,rd+.22,x,z);
      };
      const pyramidRoof=(rw:number,rd:number,x=0,z=0)=>{
        const rh=Math.max(.65,Math.min(1.25,rw*.17));
        const g=new THREE.CylinderGeometry(0,1,rh,4,1,false);g.rotateY(Math.PI/4);g.scale(rw*.72,1,rd*.72);
        const mesh=new THREE.Mesh(g,roofMat());mesh.position.set(x,h+rh/2,z);group.add(mesh);
      };

      if(shape==="rectangle"||shape==="square"){ room(w,d,0,0,false); pyramidRoof(w,d); }
      else if(shape==="wide"){ room(w,d); }
      else if(shape==="l-shape"){ room(w*.42,d, -w*.29,0); room(w*.72,d*.42,w*.14,d*.29); }
      else if(shape==="t-shape"){ room(w,d*.38,0,d*.30); room(w*.36,d*.76,0,-d*.12); }
      else if(shape==="u-shape"){ room(w*.28,d,-w*.36,0); room(w*.28,d,w*.36,0); room(w*.72,d*.28,0,-d*.36); }
      else if(shape==="cross"){ room(w*.34,d,0,0); room(w,d*.34,0,0); }
      else if(shape==="courtyard"){ room(w,d*.24,0,-d*.38); room(w,d*.24,0,d*.38); room(w*.24,d*.58,-w*.38,0); room(w*.24,d*.58,w*.38,0); }
      else if(shape==="octagon"||shape==="rotunda"){
        const sides=shape==="rotunda"?32:8;
        const radius=Math.min(w,d)*.5;
        const body=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,h,sides),mat());body.position.y=h/2;group.add(body);
        const roofHeight=shape==="rotunda"?radius*.42:radius*.34;
        const roof=new THREE.Mesh(new THREE.ConeGeometry(radius*1.04,roofHeight,sides),roofMat());roof.position.y=h+roofHeight/2;group.add(roof);
        const base=new THREE.Mesh(new THREE.CylinderGeometry(radius*1.06,radius*1.06,.18,sides),mat());base.position.y=.09;group.add(base);
      }
    }
    const o=orbitRef.current;camera.position.set(Math.sin(o.theta)*Math.sin(o.phi)*o.radius,Math.cos(o.phi)*o.radius,Math.cos(o.theta)*Math.sin(o.phi)*o.radius);camera.lookAt(0,1.4,0);renderer.render(scene,camera);
  },[shape,material,width,depth,height]);

  return <div ref={hostRef} className="absolute inset-0"><div className="pointer-events-none absolute bottom-[128px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-2 text-xs text-white/70">Drag to look around • pinch to zoom</div></div>;
}
