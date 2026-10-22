"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { BuildingLevel, RoofStyle, WallFace, Perimeter, BuilderMaterial, Statue, SiteColumn, LandscapeItem } from "@/app/page";
import { getProceduralMaps } from "./builderMaterialMaps";

const COLORS: Record<BuilderMaterial, number> = { marble:0xe7e2da,sandstone:0xb98b5b,limestone:0xcbbd9d,obsidian:0x17191d,granite:0x62636a,travertine:0xc7a77d,brick:0x884838,stone:0x77736b,concrete:0x92908a,stucco:0xd8ccb8,plaster:0xe0d9ca,timber:0x70472f,bronze:0x8a5b32,gold:0xc39a36 };

const MATERIAL_PROPS: Record<BuilderMaterial,{roughness:number;metalness:number}> = {
  marble:{roughness:.34,metalness:0}, sandstone:{roughness:.92,metalness:0}, limestone:{roughness:.82,metalness:0},
  obsidian:{roughness:.22,metalness:.03}, granite:{roughness:.62,metalness:0}, travertine:{roughness:.86,metalness:0},
  brick:{roughness:.94,metalness:0}, stone:{roughness:.9,metalness:0}, concrete:{roughness:.96,metalness:0},
  stucco:{roughness:.98,metalness:0}, plaster:{roughness:.84,metalness:0}, timber:{roughness:.72,metalness:0},
  bronze:{roughness:.3,metalness:.86}, gold:{roughness:.24,metalness:.95}
};
/** Geometry helpers are deliberately independent of camera and gesture state. */
const addArchitecturalMesh=(parent:THREE.Group,geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number)=>{
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.set(x,y,z);
  parent.add(mesh);
  return mesh;
};

const makeMaterial=(kind:BuilderMaterial,color=COLORS[kind],selected=false)=>{
  const p=MATERIAL_PROPS[kind];
  const maps=getProceduralMaps(kind);
  return new THREE.MeshStandardMaterial({
    color:maps?0xffffff:(selected?new THREE.Color(color).offsetHSL(0,0,.06):color),
    map:maps?.color||null,
    roughnessMap:maps?.roughness||null,
    bumpMap:maps?.bump||null,
    bumpScale:maps?(kind==="marble"?.012:.045):0,
    roughness:p.roughness, metalness:p.metalness,
    emissive:selected?0x211b08:0x000000, emissiveIntensity:selected?.1:0
  });
};

// Shared by initial framing, viewport resize, and the explicit Center Temple action.
function templeFitDistance(radius:number,camera:THREE.PerspectiveCamera){
  const viewportHeight=camera.view?.fullHeight||1;
  const reserved=camera.userData.builderVerticalReserve||0;
  const halfVertical=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*Math.max(.25,1-reserved/viewportHeight));
  // The vertical reserve is already excluded above; horizontal FOV must use
  // the full camera projection, not a second reduction from the toolbar reserve.
  const halfHorizontal=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect);
  const usableHalfAngle=Math.atan(Math.tan(Math.min(halfVertical,halfHorizontal))*.75);
  return Math.max(3,radius/Math.sin(usableHalfAngle)*1.05);
}

/** Camera math is pure and independent of the renderer and pointer handlers. */
const orbitCameraPosition=(target:THREE.Vector3,theta:number,phi:number,radius:number)=>{
  const sinPhi=Math.sin(phi);
  return new THREE.Vector3(
    target.x+Math.sin(theta)*sinPhi*radius,
    target.y+Math.cos(phi)*radius,
    target.z+Math.cos(theta)*sinPhi*radius
  );
};

const clampCameraRadius=(radius:number,fitRadius:number)=>{
  const min=Math.max(2,fitRadius*.18);
  const max=Math.max(20,fitRadius*2.2);
  return THREE.MathUtils.clamp(radius,min,max);
};

/** Convert pointer coordinates into normalized device coordinates for scene picking. */
const pointerToNdc=(clientX:number,clientY:number,rect:DOMRect)=>new THREE.Vector2(
  ((clientX-rect.left)/rect.width)*2-1,
  -((clientY-rect.top)/rect.height)*2+1
);

/** Compute two-touch separation for pinch zoom without coupling it to camera state. */
const pointerSeparation=(points:Iterable<{x:number;y:number}>)=>{
  const pair=Array.from(points);
  return pair.length<2?0:Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);
};

export default function Temple3DPreview({ levels, pendingLevelIndex, perimeter, statues, siteColumns, scenery, landscapeItems, selectedStatueId, selectedLevel, onSelectLevel, onSelectFace, onMoveLevel, onPatioChange, onMoveWindow, onMoveDoor, onMoveArch, onMoveDetail, onResizePerimeter, onSelectDetail, onSelectPerimeter, onSelectStatue, onMoveStatue, onSelectSiteColumn, onMoveSiteColumn, onSelectLandscape, onMoveLandscape }: {
  levels: BuildingLevel[];
  pendingLevelIndex?: number|null;
  perimeter: Perimeter | null;
  statues: Statue[];
  siteColumns: SiteColumn[];
  landscapeItems: LandscapeItem[];
  scenery: "garden"|"desert"|"twilight";
  selectedStatueId?: string | null;
  selectedLevel: number;
  onSelectLevel?: (index: number) => void;
  onSelectFace?: (index: number, face: WallFace) => void;
  onMoveLevel?: (index: number, x: number, z: number) => void;
  onPatioChange?: (index: number, patio: boolean) => void;
  onMoveWindow?: (levelIndex: number, id: string, u: number, v: number) => void;
  onMoveDoor?: (levelIndex: number, id: string, u: number) => void;
  onMoveArch?: (levelIndex: number, id: string, u: number) => void;
  onMoveDetail?: (levelIndex:number, category:"windows"|"columns"|"stairs"|"pediments"|"trim", id:string, u:number, v?:number) => void;
  onResizePerimeter?: (margin: number) => void;
  onSelectDetail?: (index:number, face:WallFace|null, category:"windows"|"doors"|"arches"|"columns"|"stairs"|"pediments"|"trim"|"roof"|"material"|"levels") => void;
  onSelectPerimeter?: () => void;
  onSelectStatue?: (id:string) => void;
  onMoveStatue?: (id:string,x:number,z:number) => void;
  onSelectSiteColumn?: (id:string)=>void;
  onMoveSiteColumn?: (id:string,x:number,z:number)=>void;
  onSelectLandscape?: (id:string)=>void;
  onMoveLandscape?: (id:string,x:number,z:number)=>void;
}) {
  const hostRef = useRef<HTMLDivElement|null>(null);
  const sceneryApplyRef=useRef<((kind:"garden"|"desert"|"twilight")=>void)|null>(null);
  const groupRef = useRef<THREE.Group|null>(null);
  const sceneRef = useRef<THREE.Scene|null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer|null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera|null>(null);
  const orbitRef = useRef({ theta: 0, phi: 1.28, radius: 13, lastX: 0, lastY: 0, dragging: false, pinch: 0 });
  const targetYRef = useRef(1.4);
  const cameraPanRef = useRef({x:0,y:0,z:0,manual:false});
  const cameraFocusRef = useRef({x:0,z:0});
  const cameraFitRef = useRef({initialized:false,lastSpan:0,fitRadius:13,buildingCount:0,userFramed:false});
  const lastBoundsRef=useRef(new THREE.Box3());
  const framingRadiusRef=useRef(0);
  const resetCameraRef = useRef<()=>void>(()=>{});
  const gestureRef = useRef({midX:0,midY:0});
  const renderCameraRef=useRef<()=>void>(()=>{});
  const levelGroupsRef = useRef<THREE.Group[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerDownRef = useRef<{x:number;y:number}|null>(null);
  const movingLevelRef = useRef<number|null>(null);
  const movingDoorRef = useRef<{levelIndex:number;id:string;face:WallFace}|null>(null);
  const movingArchRef = useRef<{levelIndex:number;id:string;face:WallFace}|null>(null);
  const movingDetailRef = useRef<{levelIndex:number;id:string;face:WallFace;category:"windows"|"columns"|"stairs"|"pediments"|"trim"}|null>(null);
  const resizingPerimeterRef = useRef<{pinch:number;margin:number}|null>(null);
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0,1,0),0));
  const perimeterGroupRef = useRef<THREE.Group | null>(null);
  const statueGroupsRef = useRef<THREE.Group[]>([]);
  const movingStatueRef = useRef<string | null>(null);
  const siteObjectGroupsRef=useRef<THREE.Group[]>([]);
  const movingSiteObjectRef=useRef<{kind:"column"|"landscape";id:string}|null>(null);
  const liveRef = useRef({levels,perimeter,selectedLevel,onSelectLevel,onSelectFace,onMoveLevel,onMoveDoor,onMoveArch,onMoveDetail,onResizePerimeter,onSelectDetail,onSelectPerimeter,onSelectStatue,onMoveStatue,selectedStatueId,onSelectSiteColumn,onMoveSiteColumn,onSelectLandscape,onMoveLandscape});
  liveRef.current={levels,perimeter,selectedLevel,onSelectLevel,onSelectFace,onMoveLevel,onMoveDoor,onMoveArch,onMoveDetail,onResizePerimeter,onSelectDetail,onSelectPerimeter,onSelectStatue,onMoveStatue,selectedStatueId,onSelectSiteColumn,onMoveSiteColumn,onSelectLandscape,onMoveLandscape};

  useEffect(() => {
    const host=hostRef.current; if(!host) return;
    const scene=new THREE.Scene(); scene.background=new THREE.Color(0xb9c4cb); scene.fog=new THREE.Fog(0xb9c4cb,220,420);
    const camera=new THREE.PerspectiveCamera(42,1,.1,600);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.05;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.domElement.style.imageRendering="auto";
    host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff,0x6f6b5e,2));
    const sun=new THREE.DirectionalLight(0xfff4df,2.35); sun.position.set(8,12,7); sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.near=.5;sun.shadow.camera.far=42;
    sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;
    sun.shadow.bias=-.00035;sun.shadow.normalBias=.025;sun.shadow.radius=2;scene.add(sun);
    const fill=new THREE.DirectionalLight(0xbfd7ff,.55);fill.position.set(-7,6,-5);scene.add(fill);
    // Low-cost hemisphere bounce keeps recesses readable without flattening the sun shadows.
    const bounce=new THREE.HemisphereLight(0xdde8f2,0x554b3e,.32);scene.add(bounce);
    // Subtle repeating terrain variation gives the site depth without downloading textures.
    const terrainCanvas=document.createElement("canvas");terrainCanvas.width=128;terrainCanvas.height=128;
    const terrainCtx=terrainCanvas.getContext("2d");
    if(terrainCtx){
      const pixels=terrainCtx.createImageData(128,128);
      for(let y=0;y<128;y++)for(let x=0;x<128;x++){
        const n=Math.sin(x*12.9898+y*78.233)*43758.5453;
        const grain=(n-Math.floor(n))-.5;
        const broad=Math.sin(x*.14)*Math.cos(y*.11)*8;
        const value=Math.max(0,Math.min(255,190+grain*27+broad));
        const k=(y*128+x)*4;pixels.data[k]=value;pixels.data[k+1]=Math.min(255,value+5);pixels.data[k+2]=Math.max(0,value-8);pixels.data[k+3]=255;
      }
      terrainCtx.putImageData(pixels,0,0);
    }
    const terrainTexture=new THREE.CanvasTexture(terrainCanvas);
    terrainTexture.wrapS=THREE.RepeatWrapping;terrainTexture.wrapT=THREE.RepeatWrapping;
    terrainTexture.repeat.set(10,10);terrainTexture.colorSpace=THREE.SRGBColorSpace;
    terrainTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshStandardMaterial({color:0x878777,map:terrainTexture,roughness:1}));ground.receiveShadow=true;
    ground.rotation.x=-Math.PI/2; scene.add(ground);
    const grid=new THREE.GridHelper(40,24,0x66685e,0x7b7d70); grid.position.y=.01; scene.add(grid);
    // Scenery sits outside the primary building area so site editing remains unobstructed.
    const landscape=new THREE.Group();scene.add(landscape);
    // Fine-grained tree crowns use instancing: hundreds of small leaf clusters per tree
    // without hundreds of draw calls. No new dependencies or builder-data changes.
    const leafColors=[0x42683d,0x54753e,0x365b46,0x698049,0x7c8650,0x315b40];
    const leafMats=leafColors.map(color=>new THREE.MeshStandardMaterial({color,roughness:.94,side:THREE.DoubleSide}));
    const barkMats=[0x65503a,0x594b39,0x756044].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
    const leafGeometry=new THREE.IcosahedronGeometry(1,0);
    const trunkGeometry=new THREE.CylinderGeometry(.09,.17,1.55,7);
    const rand=(seed:number)=>{const v=Math.sin(seed*127.1+78.233)*43758.5453;return v-Math.floor(v);};
    const leafDummy=new THREE.Object3D();
    for(let i=0;i<26;i++){
      const angle=i*Math.PI*2/26+(rand(i+17)-.5)*.19;
      const radius=17+(i%4)*1.2+(rand(i+32)-.5)*1.25;
      const tree=new THREE.Group();tree.position.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius);
      tree.rotation.y=rand(i+91)*Math.PI*2;
      const height=.76+rand(i+51)*.7;
      tree.scale.set(height*(.9+rand(i+6)*.2),height,height*(.9+rand(i+9)*.2));
      landscape.add(tree);
      const type=i%5;
      const trunk=new THREE.Mesh(trunkGeometry,barkMats[i%barkMats.length]);
      trunk.position.y=.775;trunk.castShadow=true;tree.add(trunk);
      // Narrow conifers, columnar cypress, oval ornamentals and wide woodland crowns.
      const count=type===0?170:type===2?180:260;
      const instances=leafMats.map(mat=>new THREE.InstancedMesh(leafGeometry,mat,Math.ceil(count/leafMats.length)));
      const counts=new Array(instances.length).fill(0);
      for(let j=0;j<count;j++){
        const u=rand(i*701+j*19+1),v=rand(i*701+j*19+2),w=rand(i*701+j*19+3);
        const theta=u*Math.PI*2;
        const radial=Math.sqrt(v);
        let rx=1,rz=.85,cy=2.05,ry=.72;
        if(type===0){rx=.68;rz=.68;cy=2.04;ry=1.15;}
        if(type===2){rx=.35;rz=.35;cy=2.13;ry=1.25;}
        if(type===3){rx=.86;rz=.8;cy=1.96;ry=.63;}
        if(type===4){rx=1.2;rz=.94;cy=2.06;ry=.62;}
        // Multi-lobed density variation prevents a single spherical silhouette.
        const lobe=.82+.18*Math.sin(theta*(type===4?5:7)+i);
        const layer=(w-.5)*2;
        const taper=type===0||type===2?Math.max(.14,1-(layer+.8)*.48):Math.sqrt(Math.max(.12,1-layer*layer));
        const x=Math.cos(theta)*radial*rx*lobe*taper;
        const z=Math.sin(theta)*radial*rz*lobe*taper;
        const y=cy+layer*ry+.10*Math.sin(theta*4+i);
        const size=(type===2?.075:.09)*(0.7+rand(i*503+j*7)*.7);
        leafDummy.position.set(x,y,z);
        leafDummy.rotation.set(u*6.28,v*6.28,w*6.28);
        leafDummy.scale.set(size*.7,size*1.2,size*.65);
        leafDummy.updateMatrix();
        const slot=j%instances.length;
        instances[slot].setMatrixAt(counts[slot]++,leafDummy.matrix);
      }
      for(let j=0;j<instances.length;j++){
        const mesh=instances[j];mesh.count=counts[j];mesh.instanceMatrix.needsUpdate=true;
        mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();tree.add(mesh);
      }
    }
    const applyScenery=(kind:"garden"|"desert"|"twilight")=>{
      const bg=kind==="twilight"?0x29334c:kind==="desert"?0xd8b98b:0xb9c4cb;
      scene.background=new THREE.Color(bg);if(scene.fog instanceof THREE.Fog)scene.fog.color.setHex(bg);
      (ground.material as THREE.MeshStandardMaterial).color.setHex(kind==="desert"?0xbda079:kind==="twilight"?0x454d51:0x878777);
      grid.visible=kind!=="twilight";landscape.visible=kind==="garden";
      sun.color.setHex(kind==="twilight"?0xffad75:kind==="desert"?0xffe4b2:0xfff4df);
      sun.intensity=kind==="twilight"?1.45:2.35;
    };
    sceneryApplyRef.current=applyScenery;applyScenery(scenery);
    const group=new THREE.Group(); scene.add(group);
    sceneRef.current=scene; rendererRef.current=renderer; cameraRef.current=camera; groupRef.current=group;

    // Single authoritative camera transform for orbit, touch, reset and redraw.
    const render=()=>{
      const o=orbitRef.current,p=cameraPanRef.current;
      const target=new THREE.Vector3(cameraFocusRef.current.x+p.x,targetYRef.current+p.y,cameraFocusRef.current.z+p.z);
      camera.position.copy(orbitCameraPosition(target,o.theta,o.phi,o.radius));
      camera.up.set(0,1,0);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      renderer.render(scene,camera);
    };
    renderCameraRef.current=render;
    const clampZoom=(radius:number)=>clampCameraRadius(radius,cameraFitRef.current.fitRadius);
    // A sphere about the structural pivot encloses roofs and attached details at every orbit angle.
    const centerTemple=()=>{
      const bounds=lastBoundsRef.current;if(bounds.isEmpty())return;
      const center=bounds.getCenter(new THREE.Vector3());
      cameraFocusRef.current={x:center.x,z:center.z};targetYRef.current=center.y;
      cameraPanRef.current={x:0,y:0,z:0,manual:false};
      orbitRef.current.radius=cameraFitRef.current.fitRadius=templeFitDistance(framingRadiusRef.current,camera);
    };
    let previousWidth=0,previousHeight=0;
    let previousOrientation: "portrait"|"landscape"|null=null;
    const resize=()=>{
      const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
      if(w===previousWidth&&h===previousHeight)return;
      previousWidth=w;previousHeight=h;
      const orientation: "portrait"|"landscape"=w>=h?"landscape":"portrait";
      const orientationChanged=previousOrientation!==null&&orientation!==previousOrientation;
      previousOrientation=orientation;
      const bottom=Math.min(128,h*.34),top=Math.min(112,h*.25);
      camera.userData.builderVerticalReserve=top+bottom;
      // A negative view offset shifts the temple UP, clear of the bottom toolbar.
      camera.aspect=w/h;camera.setViewOffset(w,h,0,(top-bottom)/2,w,h);camera.updateProjectionMatrix();renderer.setSize(w,h,false);
      // Reframe on an actual portrait/landscape rotation; ordinary resize preserves manual orbit.
      // The old logic retained stale pan/zoom across orientation changes, hiding the temple.
      if(cameraFitRef.current.initialized && orientationChanged){
        cameraFitRef.current.userFramed=false;
        centerTemple();
      }else if(cameraFitRef.current.initialized && !cameraFitRef.current.userFramed) centerTemple();
      render();
    };
    const canvas=renderer.domElement; canvas.style.touchAction="none";
    const pointers=new Map<number,{x:number,y:number}>();
    const distance=()=>pointerSeparation(pointers.values());
    // Resolve one frontmost scene hit before classifying its object type.
    // Independent raycasts per category allowed hidden doors/statues to steal touches.
    const visibleHits=(objects:THREE.Object3D[],_recursive=true):THREE.Intersection[]=>{
      const roots:THREE.Object3D[]=[...levelGroupsRef.current,...statueGroupsRef.current,...siteObjectGroupsRef.current];
      if(perimeterGroupRef.current)roots.push(perimeterGroupRef.current);
      const hit=raycasterRef.current.intersectObjects(roots,true)[0];
      if(!hit)return [];
      let object:THREE.Object3D|null=hit.object;
      while(object){if(objects.includes(object))return [hit];object=object.parent;}
      return [];
    };
    const down=(e:PointerEvent)=>{pointerDownRef.current={x:e.clientX,y:e.clientY};const rect=canvas.getBoundingClientRect();const mouse=pointerToNdc(e.clientX,e.clientY,rect);raycasterRef.current.setFromCamera(mouse,camera);const doorHits=visibleHits(levelGroupsRef.current,true).filter(h=>h.object.userData.doorId!==undefined);if(doorHits.length){const d=doorHits[0].object.userData;movingDoorRef.current={levelIndex:d.levelIndex as number,id:d.doorId as string,face:d.doorFace as WallFace};}const archHits=doorHits.length?[]:visibleHits(levelGroupsRef.current,true).filter(h=>h.object.userData.archId!==undefined);if(archHits.length){const a=archHits[0].object.userData;movingArchRef.current={levelIndex:a.levelIndex as number,id:a.archId as string,face:a.archFace as WallFace};}const detailHits=(doorHits.length||archHits.length)?[]:visibleHits(levelGroupsRef.current,true).filter(h=>["windows","columns","stairs","pediments","trim"].includes(h.object.userData.detailCategory)&&h.object.userData.detailId);if(detailHits.length){const d=detailHits[0].object.userData;movingDetailRef.current={levelIndex:d.levelIndex as number,id:d.detailId as string,face:d.detailFace as WallFace,category:d.detailCategory};}const statueHits=(doorHits.length||archHits.length)?[]:visibleHits(statueGroupsRef.current,true);if(statueHits.length){let so:THREE.Object3D|null=statueHits[0].object;while(so&&so.userData.statueId===undefined)so=so.parent;if(so){const id=so.userData.statueId as string;movingStatueRef.current=id;}}const siteHits=statueHits.length?[]:visibleHits(siteObjectGroupsRef.current,true);if(siteHits.length){let o:THREE.Object3D|null=siteHits[0].object;while(o&&!o.userData.siteObjectId)o=o.parent;if(o){const id=o.userData.siteObjectId as string;if(o.userData.siteObjectKind==="column")liveRef.current.onSelectSiteColumn?.(id);else liveRef.current.onSelectLandscape?.(id);}}if(siteHits.length){let obj:THREE.Object3D|null=siteHits[0].object;while(obj&&!obj.userData.siteObjectId)obj=obj.parent;if(obj)movingSiteObjectRef.current={kind:obj.userData.siteObjectKind as "column"|"landscape",id:obj.userData.siteObjectId as string};}const perimeterHits=(statueHits.length||siteHits.length)?[]:(perimeterGroupRef.current?visibleHits(perimeterGroupRef.current.children,true):[]);const hits=(statueHits.length||perimeterHits.length)?[]:visibleHits(levelGroupsRef.current,true);if(hits.length){let obj:THREE.Object3D|null=hits[0].object;while(obj&&obj.userData.levelIndex===undefined)obj=obj.parent;if(obj&&obj.userData.levelIndex!==undefined){/* A normal touch only selects/inspects the building. Movement is intentionally not armed here. */}}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const o=orbitRef.current;if(pointers.size===1){o.dragging=true;o.lastX=e.clientX;o.lastY=e.clientY;}else if(pointers.size===2){o.dragging=false;o.pinch=distance();{const ps=[...pointers.values()];gestureRef.current.midX=(ps[0].x+ps[1].x)/2;gestureRef.current.midY=(ps[0].y+ps[1].y)/2;}if(perimeterGroupRef.current&&liveRef.current.perimeter){const rect=canvas.getBoundingClientRect();const cx=[...pointers.values()].reduce((s,p)=>s+p.x,0)/2,cy=[...pointers.values()].reduce((s,p)=>s+p.y,0)/2;const mouse=new THREE.Vector2(((cx-rect.left)/rect.width)*2-1,-((cy-rect.top)/rect.height)*2+1);raycasterRef.current.setFromCamera(mouse,camera);if(visibleHits(perimeterGroupRef.current.children,true).length)resizingPerimeterRef.current={pinch:o.pinch,margin:liveRef.current.perimeter.margin};}}canvas.setPointerCapture?.(e.pointerId);};
    const wallTransform=(level:BuildingLevel)=>new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(level.rotation||0)).setPosition(level.x||0,0,level.z||0);
    const wallLocalPoint=(level:BuildingLevel,point:THREE.Vector3)=>point.clone().applyMatrix4(wallTransform(level).invert());
    const wallDragPlane=(level:BuildingLevel,face:WallFace)=>{
      const frontBack=face==="front"||face==="back";
      const offset=frontBack?(face==="front"?level.depth/14:-level.depth/14):(face==="right"?level.width/14:-level.width/14);
      return new THREE.Plane(frontBack?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0),-offset).applyMatrix4(wallTransform(level));
    };
    const move=(e:PointerEvent)=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const o=orbitRef.current;if(pointers.size===2){movingLevelRef.current=null;const pts=[...pointers.values()];const midX=(pts[0].x+pts[1].x)/2,midY=(pts[0].y+pts[1].y)/2;const dx=midX-gestureRef.current.midX,dy=midY-gestureRef.current.midY;gestureRef.current.midX=midX;gestureRef.current.midY=midY;const panScale=2*o.radius*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/Math.max(1,canvas.clientHeight);
      const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
      const upAxis=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
      const pan=cameraPanRef.current;
      pan.x+=(-right.x*dx+upAxis.x*dy)*panScale;
      pan.y+=(-right.y*dx+upAxis.y*dy)*panScale;
      pan.z+=(-right.z*dx+upAxis.z*dy)*panScale;
      if(Math.abs(dx)+Math.abs(dy)>0){pan.manual=true;cameraFitRef.current.userFramed=true;}const next=distance();if(resizingPerimeterRef.current&&next>0){const ratio=next/Math.max(1,resizingPerimeterRef.current.pinch);const margin=Math.max(.25,Math.min(10,resizingPerimeterRef.current.margin*ratio));liveRef.current.onResizePerimeter?.(Math.round(margin*4)/4);}else if(o.pinch>0){const scale=o.pinch/next;o.radius=clampZoom(o.radius*scale);cameraFitRef.current.userFramed=true;}o.pinch=next;render();return;}if(movingDetailRef.current&&pointers.size===1){const md=movingDetailRef.current,level=liveRef.current.levels[md.levelIndex];if(level){const rect=canvas.getBoundingClientRect();const mouse=pointerToNdc(e.clientX,e.clientY,rect);raycasterRef.current.setFromCamera(mouse,camera);const plane=wallDragPlane(level,md.face);const hit=new THREE.Vector3();if(raycasterRef.current.ray.intersectPlane(plane,hit)){const local=wallLocalPoint(level,hit);const center=0;const span=(md.face==="front"||md.face==="back"?level.width:level.depth)/7*.38;const axis=md.face==="front"||md.face==="back"?local.x:local.z;const u=Math.max(-1,Math.min(1,(axis-center)/Math.max(.1,span)));const base=(level.elevation||0)/7;const h=level.height/7;const v=md.category==="windows"?Math.max(.12,Math.min(.9,(hit.y-base)/Math.max(.1,h))):undefined;liveRef.current.onMoveDetail?.(md.levelIndex,md.category,md.id,Math.round(u*20)/20,v===undefined?undefined:Math.round(v*20)/20);}}return;}if(movingArchRef.current&&pointers.size===1){const ma=movingArchRef.current,level=liveRef.current.levels[ma.levelIndex];if(level){const rect=canvas.getBoundingClientRect();const mouse=pointerToNdc(e.clientX,e.clientY,rect);raycasterRef.current.setFromCamera(mouse,camera);const plane=wallDragPlane(level,ma.face);const hit=new THREE.Vector3();if(raycasterRef.current.ray.intersectPlane(plane,hit)){const local=wallLocalPoint(level,hit);const center=0;const span=(ma.face==="front"||ma.face==="back"?level.width:level.depth)/7*.38;const axis=ma.face==="front"||ma.face==="back"?local.x:local.z;const u=Math.max(-1,Math.min(1,(axis-center)/Math.max(.1,span)));liveRef.current.onMoveArch?.(ma.levelIndex,ma.id,Math.round(u*20)/20);}}return;}if(movingDoorRef.current&&pointers.size===1){const md=movingDoorRef.current,level=liveRef.current.levels[md.levelIndex];if(level){const rect=canvas.getBoundingClientRect();const mouse=pointerToNdc(e.clientX,e.clientY,rect);raycasterRef.current.setFromCamera(mouse,camera);const y=liveRef.current.levels.slice(0,md.levelIndex).reduce((s,l)=>s+l.height/7,0)+.5;const plane=wallDragPlane(level,md.face);const hit=new THREE.Vector3();if(raycasterRef.current.ray.intersectPlane(plane,hit)){const local=wallLocalPoint(level,hit);const center=0;const span=(md.face==="front"||md.face==="back"?level.width:level.depth)/7*.38;const axis=md.face==="front"||md.face==="back"?local.x:local.z;const u=Math.max(-1,Math.min(1,(axis-center)/Math.max(.1,span)));liveRef.current.onMoveDoor?.(md.levelIndex,md.id,Math.round(u*20)/20);} }return;}if(movingSiteObjectRef.current&&pointers.size===1){const rect=canvas.getBoundingClientRect();const mouse=pointerToNdc(e.clientX,e.clientY,rect);raycasterRef.current.setFromCamera(mouse,camera);const hit=new THREE.Vector3();if(raycasterRef.current.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),hit)){const item=movingSiteObjectRef.current,x=Math.round(hit.x*4)/4,z=Math.round(hit.z*4)/4;if(item.kind==="column")liveRef.current.onMoveSiteColumn?.(item.id,x,z);else liveRef.current.onMoveLandscape?.(item.id,x,z);}return;}if(movingStatueRef.current!==null&&pointers.size===1){const rect=canvas.getBoundingClientRect();const mouse=pointerToNdc(e.clientX,e.clientY,rect);raycasterRef.current.setFromCamera(mouse,camera);const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();if(raycasterRef.current.ray.intersectPlane(plane,hit))liveRef.current.onMoveStatue?.(movingStatueRef.current,Math.round(hit.x*4)/4,Math.round(hit.z*4)/4);return;}if(movingLevelRef.current!==null&&pointers.size===1){const rect=canvas.getBoundingClientRect();const mouse=pointerToNdc(e.clientX,e.clientY,rect);raycasterRef.current.setFromCamera(mouse,camera);const hit=new THREE.Vector3();if(raycasterRef.current.ray.intersectPlane(dragPlaneRef.current,hit)){const snap=.25;onMoveLevel?.(movingLevelRef.current,Math.round(hit.x/snap)*snap,Math.round(hit.z/snap)*snap);}return;}if(!o.dragging)return;const dx=e.clientX-o.lastX,dy=e.clientY-o.lastY;o.lastX=e.clientX;o.lastY=e.clientY;if(e.shiftKey||e.button===1){const scale=2*o.radius*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/Math.max(1,canvas.clientHeight);const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),upAxis=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),pan=cameraPanRef.current;pan.x+=(-right.x*dx+upAxis.x*dy)*scale;pan.y+=(-right.y*dx+upAxis.y*dy)*scale;pan.z+=(-right.z*dx+upAxis.z*dy)*scale;pan.manual=true;}else{o.theta-=dx*.008;o.phi=Math.max(.2,Math.min(Math.PI/2-.08,o.phi+dy*.0055));}cameraFitRef.current.userFramed=true;render();};
    const up=(e:PointerEvent)=>{movingLevelRef.current=null;movingStatueRef.current=null;movingSiteObjectRef.current=null;movingDoorRef.current=null;movingArchRef.current=null;movingDetailRef.current=null;resizingPerimeterRef.current=null;const start=pointerDownRef.current;pointerDownRef.current=null;if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<8&&pointers.size===1){const rect=canvas.getBoundingClientRect();const mouse=pointerToNdc(e.clientX,e.clientY,rect);raycasterRef.current.setFromCamera(mouse,camera);const statueTap=visibleHits(statueGroupsRef.current,true);if(statueTap.length){let so:THREE.Object3D|null=statueTap[0].object;while(so&&so.userData.statueId===undefined)so=so.parent;if(so)liveRef.current.onSelectStatue?.(so.userData.statueId as string);}const siteTap=statueTap.length?[]:visibleHits(siteObjectGroupsRef.current,true);if(siteTap.length){let obj:THREE.Object3D|null=siteTap[0].object;while(obj&&!obj.userData.siteObjectId)obj=obj.parent;if(obj){const id=obj.userData.siteObjectId as string;if(obj.userData.siteObjectKind==="column")liveRef.current.onSelectSiteColumn?.(id);else liveRef.current.onSelectLandscape?.(id);}}const perimeterTap=(statueTap.length||siteTap.length)?[]:(perimeterGroupRef.current?visibleHits(perimeterGroupRef.current.children,true):[]);if(perimeterTap.length)liveRef.current.onSelectPerimeter?.();const hits=(statueTap.length||siteTap.length||perimeterTap.length)?[]:visibleHits(levelGroupsRef.current,true);if(hits.length){const tagged=hits[0].object.userData.detailCategory?hits[0]:undefined;if(tagged){const d=tagged.object.userData;liveRef.current.onSelectDetail?.(d.levelIndex as number,(d.detailFace||null) as WallFace|null,d.detailCategory);}else{let obj:THREE.Object3D|null=hits[0].object;while(obj&&obj.userData.levelIndex===undefined)obj=obj.parent;if(obj&&obj.userData.levelIndex!==undefined){const idx=obj.userData.levelIndex as number;liveRef.current.onSelectLevel?.(idx);const hit=hits[0];if(hit.face){const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld).transformDirection(new THREE.Matrix4().extractRotation(levelGroupsRef.current[idx].matrixWorld).invert());const ax=Math.abs(n.x),az=Math.abs(n.z);const face:WallFace=ax>az?(n.x>0?"right":"left"):(n.z>0?"front":"back");liveRef.current.onSelectFace?.(idx,face);}}}}}pointers.delete(e.pointerId);const o=orbitRef.current;o.pinch=0;if(pointers.size===1){const pt=[...pointers.values()][0];o.dragging=true;o.lastX=pt.x;o.lastY=pt.y;}else{o.dragging=false;}};
    const wheel=(e:WheelEvent)=>{e.preventDefault();const o=orbitRef.current;o.radius=clampZoom(o.radius+e.deltaY*.012);cameraFitRef.current.userFramed=true;render();};
    canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);canvas.addEventListener("wheel",wheel,{passive:false});
    window.addEventListener("resize",resize); const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(host); resize();
    resetCameraRef.current=()=>{const o=orbitRef.current;o.theta=0;o.phi=1.28;cameraFitRef.current.userFramed=false;centerTemple();render();};
    return()=>{sizeObserver.disconnect();window.removeEventListener("resize",resize);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("wheel",wheel);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});terrainTexture.dispose();renderer.dispose();canvas.remove();};
  },[]);

  useEffect(()=>{
    const group=groupRef.current,scene=sceneRef.current,renderer=rendererRef.current,camera=cameraRef.current;if(!group||!scene||!renderer||!camera)return;
    while(group.children.length){const o=group.children[0];group.remove(o);o.traverse(child=>{if(child instanceof THREE.Mesh){child.geometry.dispose();const m=child.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});}
    levelGroupsRef.current=[];
    let baseY=0;

    const enableShadows=(root:THREE.Object3D)=>root.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    const addRoof=(parent:THREE.Group,roof:RoofStyle,rw:number,rd:number,x:number,z:number,top:number,color:number)=>{
      // Roof pieces share a single material rather than allocating one per cornice or tier.
      const roofMaterial=new THREE.MeshStandardMaterial({color,roughness:.58,metalness:0});
      const add=(g:THREE.BufferGeometry,px:number,py:number,pz:number)=>addArchitecturalMesh(parent,g,roofMaterial,px,py,pz);
      if(roof==="none")return;
      // Tiered stone cornices establish a visible roof silhouette from ground-level cameras.
      const lip=Math.min(.15,Math.max(.045,Math.min(rw,rd)*.025));
      const cornice=(spread:number,y:number,thickness:number)=>add(new THREE.BoxGeometry(rw+spread,thickness,rd+spread),x,y,z);
      if(roof==="flat"){
        cornice(.32,top+.055,.11);
        cornice(.22,top+.15,.075);
        cornice(.10,top+.215,.055);
        return;
      }
      if(roof==="pyramid"){
        cornice(.34,top+.05,.10);
        cornice(.20,top+.135,.065);
        const rh=Math.max(.7,Math.min(1.5,rw*.18));
        const g=new THREE.CylinderGeometry(0,1,rh,4,1,false);g.rotateY(Math.PI/4);g.scale(rw*.72,1,rd*.72);
        add(g,x,top+rh/2+.16,z);
        // Small gilded finial visually finishes ceremonial pyramid roofs.
        add(new THREE.SphereGeometry(lip*1.15,10,8),x,top+rh+.20,z);
        return;
      }
      if(roof==="dome"){
        const r=Math.min(rw,rd)*.53;
        const drum=Math.max(.16,r*.16);
        add(new THREE.CylinderGeometry(r*.91,r*.94,drum,32),x,top+drum/2,z);
        add(new THREE.TorusGeometry(r*.93,Math.max(.035,r*.035),8,40),x,top+drum,z);
        add(new THREE.SphereGeometry(r,40,20,0,Math.PI*2,0,Math.PI/2),x,top+drum,z);
        // Meridional ribs are separate thin curved meshes, not painted-on lines.
        for(let i=0;i<12;i++){
          const angle=i*Math.PI/6;
          const points:THREE.Vector3[]=[];
          for(let j=0;j<=12;j++){
            const a=j*Math.PI/24;
            points.push(new THREE.Vector3(x+Math.cos(angle)*r*Math.cos(a)*1.008,top+drum+r*Math.sin(a),z+Math.sin(angle)*r*Math.cos(a)*1.008));
          }
          add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,Math.max(.012,r*.012),5,false),0,0,0);
        }
        add(new THREE.CylinderGeometry(r*.10,r*.14,Math.max(.12,r*.16),12),x,top+drum+r+Math.max(.06,r*.08),z);
        add(new THREE.SphereGeometry(Math.max(.06,r*.095),12,10),x,top+drum+r+Math.max(.12,r*.16),z);
        return;
      }
      // Each roof type gets its own recognizable silhouette.
      const r=Math.min(rw,rd)*.52;
      if(roof==="tiered"){
        for(let i=0;i<4;i++){const scale=1-i*.19;add(new THREE.BoxGeometry(rw*scale,.18,rd*scale),x,top+.12+i*.38,z);}
        add(new THREE.ConeGeometry(r*.42,.72,4),x,top+1.65,z);return;
      }
      if(roof==="curved"){
        const curve=new THREE.Shape();curve.moveTo(-rw*.5,0);curve.quadraticCurveTo(-rw*.24,Math.max(.45,rd*.22),0,Math.max(.65,rd*.29));curve.quadraticCurveTo(rw*.24,Math.max(.45,rd*.22),rw*.5,0);
        curve.lineTo(rw*.5,-.08);curve.lineTo(-rw*.5,-.08);curve.closePath();
        const g=new THREE.ExtrudeGeometry(curve,{depth:rd,bevelEnabled:false});g.translate(0,top,-rd/2);add(g,x,0,z);return;
      }
      if(roof==="ornate"){
        cornice(.4,top+.10,.2);cornice(.24,top+.28,.12);
        const h=Math.max(.8,r*.6);
        add(new THREE.ConeGeometry(r,h,8),x,top+.35+h/2,z);
        for(const side of [-1,1])add(new THREE.ConeGeometry(.2,.55,8),x+side*rw*.38,top+.56,z);
        return;
      }
      const rh=roof==="steeple"?Math.max(2.2,r*2.6):Math.max(1.3,r*1.25);
      add(new THREE.CylinderGeometry(r*1.05,r*1.08,Math.max(.10,r*.12),roof==="cone"?32:8),x,top+.05,z);
      add(new THREE.ConeGeometry(r,rh,roof==="cone"?32:8),x,top+rh/2+.12,z);
      if(roof==="steeple")add(new THREE.SphereGeometry(Math.max(.055,r*.09),12,8),x,top+rh+.16,z);
    };

    levels.forEach((level,index)=>{
      baseY=(level.elevation||0)/7;
      const lg=new THREE.Group();lg.userData.levelIndex=index;lg.position.set(level.x||0,0,level.z||0);lg.rotation.y=THREE.MathUtils.degToRad(level.rotation||0);group.add(lg);levelGroupsRef.current.push(lg);
      const w=level.width/7,d=level.depth/7,h=level.height/7,color=COLORS[level.material];
      const selected=index===selectedLevel;
      const mat=()=>makeMaterial(level.material,color,selected);
      const add=(g:THREE.BufferGeometry,x:number,y:number,z:number)=>{const m=new THREE.Mesh(g,mat());m.position.set(x,y,z);lg.add(m);};
      const box=(rw:number,rh:number,rd:number,x:number,y:number,z:number)=>add(new THREE.BoxGeometry(rw,rh,rd),x,y,z);
      const parts:Array<[number,number,number,number]>=level.shape==="l-shape"?[[w*.42,d,-w*.29,0],[w*.72,d*.42,w*.14,d*.29]]:level.shape==="t-shape"?[[w,d*.38,0,d*.30],[w*.36,d*.76,0,-d*.12]]:level.shape==="u-shape"?[[w*.28,d,-w*.36,0],[w*.28,d,w*.36,0],[w*.72,d*.28,0,-d*.36]]:level.shape==="cross"?[[w*.34,d,0,0],[w,d*.34,0,0]]:level.shape==="x-shape"?[[w*.28,d,0,0],[w,d*.28,0,0]]:level.shape==="horseshoe"?[[w*.25,d,-w*.38,0],[w*.25,d,w*.38,0],[w*.75,d*.26,0,-d*.37]]:level.shape==="courtyard"?[[w,d*.24,0,-d*.38],[w,d*.24,0,d*.38],[w*.24,d*.58,-w*.38,0],[w*.24,d*.58,w*.38,0]]:[[w,d,0,0]];
      const polygonShape=(points:Array<[number,number]>)=>{const s=new THREE.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,z):s.moveTo(x,z));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false});g.rotateX(Math.PI/2);g.translate(0,baseY+h,0);return g;};
      const radialPoints=(count:number,outer:number,inner?:number)=>Array.from({length:inner?count*2:count},(_,i)=>{const r=inner?(i%2===0?outer:inner):outer;const a=-Math.PI/2+i*Math.PI/(inner?count:count/2);return [Math.cos(a)*r,Math.sin(a)*r] as [number,number];});
      const addFootprintRoof=(points:Array<[number,number]>,top:number)=>{
        if(["dome","cone","steeple","tiered","curved","ornate"].includes(level.roof)){addRoof(lg,level.roof,w,d,0,0,top,color);return;}
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
      // Architectural structural geometry from the reference plans.
      // These are true meshes in the temple's local coordinates, not image overlays.
      const structural=(geometry:THREE.BufferGeometry,x:number,y:number,z:number)=>{
        const mesh=new THREE.Mesh(geometry,mat());mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;lg.add(mesh);return mesh;
      };
      if(level.architecture==="maya" && level.shape==="square" && level.width>=30){
        // Receding stone terraces: tapered sloped side faces and pronounced tier bands.
        const upperW=w*.86,upperD=d*.86;
        const verts:number[]=[];
        const bottom:[number,number,number][]=[[-w/2,baseY,-d/2],[w/2,baseY,-d/2],[w/2,baseY,d/2],[-w/2,baseY,d/2]];
        const top:[number,number,number][]=[[-upperW/2,baseY+h,-upperD/2],[upperW/2,baseY+h,-upperD/2],[upperW/2,baseY+h,upperD/2],[-upperW/2,baseY+h,upperD/2]];
        for(let i=0;i<4;i++){const j=(i+1)%4;verts.push(...bottom[i],...bottom[j],...top[i],...bottom[j],...top[j],...top[i]);}
        const geom=new THREE.BufferGeometry();geom.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));geom.computeVertexNormals();
        const tapered=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color:COLORS[level.material],side:THREE.DoubleSide,roughness:.95}));lg.add(tapered);
        for(const t of [.12,.88])structural(new THREE.BoxGeometry(w*(1-t*.12),.09,d*(1-t*.12)),0,baseY+h*t,0);
      }
      if(level.architecture==="hindu" && level.roof==="tiered" && level.width<=26){
        // Shikhara: stacked shrinking sculptural roof courses with a vertical crown.
        const courses=7;
        for(let i=0;i<courses;i++){
          const fraction=i/courses,scale=1-fraction*.63;
          structural(new THREE.BoxGeometry(w*scale+.08,.16,d*scale+.08),0,baseY+h+.16+i*.23,0);
          if(i%2===0)for(const side of [-1,1])structural(new THREE.BoxGeometry(.12,.13,d*scale*.78),side*w*scale*.46,baseY+h+.26+i*.23,0);
        }
        structural(new THREE.SphereGeometry(.25,12,8),0,baseY+h+1.92,0);
      }
      if(level.architecture==="gothic" && level.shape==="wide"){
        // Exterior flying buttresses: solid piers plus curved stone arch ribs.
        const stone=new THREE.MeshStandardMaterial({color:COLORS[level.material],roughness:.88});
        for(const side of [-1,1])for(const fraction of [-.36,-.12,.12,.36]){
          const z=fraction*d*2,wallX=side*w*.5,pierX=wallX+side*1.2;
          structural(new THREE.BoxGeometry(.36,h*.73,.45),pierX,baseY+h*.365,z);
          structural(new THREE.ConeGeometry(.23,.72,4),pierX,baseY+h*.73+.36,z);
          const points:THREE.Vector3[]=[];
          for(let j=0;j<=12;j++){const t=j/12;points.push(new THREE.Vector3(wallX+side*1.2*t,baseY+h*.68+.62*Math.sin(t*Math.PI),z));}
          const curve=new THREE.CatmullRomCurve3(points);
          const rib=new THREE.Mesh(new THREE.TubeGeometry(curve,18,.10,6,false),stone);rib.castShadow=true;lg.add(rib);
        }
        // Ridge ribs mark the nave's vault bays without filling the interior.
        for(const fraction of [-.36,-.12,.12,.36]){
          const z=fraction*d*2;
          const pts=[new THREE.Vector3(-w*.27,baseY+h*.79,z),new THREE.Vector3(0,baseY+h*1.08,z),new THREE.Vector3(w*.27,baseY+h*.79,z)];
          lg.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),14,.075,6,false),stone));
        }
      }
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
        for(const [rw,rd,x,z] of parts){
          box(rw+.12,.18,rd+.12,x,baseY+.09,z);
          // For single rectangular footprints, assemble wall panels around genuine openings.
          // Compound footprints retain their original solid-body representation.
          if(parts.length===1 && ["rectangle","square","wide"].includes(level.shape)){
            const thickness=Math.min(.23,Math.max(.12,Math.min(rw,rd)*.045));
            const buildWall=(face:WallFace)=>{
              const span=face==="front"||face==="back"?rw:rd;
              type Opening={left:number;right:number;bottom:number;top:number};
              const openings:Opening[]=[];
              for(const door of level.doors||[]){
                if(door.face!==face)continue;
                const center=(door.u||0)*span*.38,half=Math.min(span*.2,Math.max(.55,door.width*h/18));
                openings.push({left:Math.max(-span/2,center-half),right:Math.min(span/2,center+half),bottom:0,top:Math.min(h*.8,Math.max(2.8,door.height*h/7))});
              }
              for(const win of level.windows||[]){
                if(win.face!==face)continue;
                const center=(win.u||0)*span*.38,cy=h*(win.v||.55),half=Math.min(span*.18,Math.max(.45,win.width*h/22)),hh=Math.max(.65,win.height*h/12);
                openings.push({left:Math.max(-span/2,center-half),right:Math.min(span/2,center+half),bottom:Math.max(0,cy-hh),top:Math.min(h,cy+hh)});
              }
              const cuts=[-span/2,span/2,...openings.flatMap(o=>[o.left,o.right])].sort((a,b)=>a-b);
              const xs=cuts.filter((v,i)=>i===0||v-cuts[i-1]>.0001);
              const makePanel=(a:number,b:number,low:number,high:number)=>{
                if(b-a<.015||high-low<.015)return;
                const m=new THREE.Mesh(new THREE.BoxGeometry(b-a,high-low,thickness),mat());
                m.position.set((a+b)/2,baseY+(low+high)/2,face==="front"?rd/2-thickness/2:-rd/2+thickness/2);
                if(face==="left"||face==="right"){
                  m.position.set(face==="right"?rw/2-thickness/2:-rw/2+thickness/2,baseY+(low+high)/2,(a+b)/2);
                  m.rotation.y=Math.PI/2;
                }
                lg.add(m);
              };
              for(let i=0;i<xs.length-1;i++){
                const a=xs[i],b=xs[i+1],mid=(a+b)/2;
                const blocked=openings.filter(o=>mid>o.left+.0001&&mid<o.right-.0001).sort((a,b)=>a.bottom-b.bottom);
                let cursor=0;
                for(const o of blocked){if(o.bottom>cursor)makePanel(a,b,cursor,o.bottom);cursor=Math.max(cursor,o.top);}
                if(cursor<h)makePanel(a,b,cursor,h);
              }
              // Four return surfaces around each cut give the opening real wall depth.
              const revealMat=new THREE.MeshStandardMaterial({color:new THREE.Color(color).multiplyScalar(.77),roughness:.86});
              for(const o of openings){
                for(const side of [o.left,o.right]){
                  const jamb=new THREE.Mesh(new THREE.BoxGeometry(thickness*.95,o.top-o.bottom,.055),revealMat.clone());
                  jamb.position.set(side,baseY+(o.top+o.bottom)/2,face==="front"?rd/2-thickness/2:-rd/2+thickness/2);
                  if(face==="left"||face==="right"){jamb.position.set(face==="right"?rw/2-thickness/2:-rw/2+thickness/2,baseY+(o.top+o.bottom)/2,side);jamb.rotation.y=Math.PI/2;}
                  lg.add(jamb);
                }
                const lintel=new THREE.Mesh(new THREE.BoxGeometry(o.right-o.left,.055,thickness),revealMat.clone());
                lintel.position.set((o.left+o.right)/2,baseY+o.top,face==="front"?rd/2-thickness/2:-rd/2+thickness/2);
                if(face==="left"||face==="right"){lintel.position.set(face==="right"?rw/2-thickness/2:-rw/2+thickness/2,baseY+o.top,(o.left+o.right)/2);lintel.rotation.y=Math.PI/2;}
                lg.add(lintel);
              }
            };
            for(const face of ["front","back","left","right"] as WallFace[])buildWall(face);
            box(rw,h*.06,rd,x,baseY+h*.97,z);
          }else box(rw,h,rd,x,baseY+h/2,z);
        }
        for(const [rw,rd,x,z] of parts)addRoof(lg,level.roof,rw,rd,x,z,baseY+h,color);
      }
      // Visible connecting course at the junction between stacked levels.
      // Use the same material maps as the level so this reads as architecture, not a pasted-on shape.
      if((level.elevation||0)>0){
        const transition=mat();
        const circular=["circle","rotunda","octagon","hexagon","oval","ring"].includes(level.shape);
        const geometry=circular?new THREE.CylinderGeometry(Math.min(w,d)*.54,Math.min(w,d)*.57,.20,circular?32:12):new THREE.BoxGeometry(w+.22,.20,d+.22);
        const plinth=new THREE.Mesh(geometry,transition);
        plinth.position.set(0,baseY+.10,0);plinth.castShadow=true;plinth.receiveShadow=true;lg.add(plinth);
      }
      // Low-poly masonry courses: staggered individual blocks with visible mortar gaps.
      // Applied to the four exterior faces of rectangular building footprints.
      if(["rectangle","square","wide"].includes(level.shape) && !["stucco","plaster","timber","bronze","gold"].includes(level.material)){
        const rows=Math.min(12,Math.max(3,Math.round(h/.48)));
        const course=h/rows;
        for(const face of ["front","back","left","right"] as WallFace[]){
          const length=face==="front"||face==="back"?w:d;
          const count=Math.min(22,Math.max(4,Math.ceil(length/.68)));
          const unit=length/count;
          for(let row=0;row<rows;row++){
            const offset=row%2?unit/2:0;
            for(let i=0;i<=count;i++){
              const center=-length/2+(i+.5)*unit+offset;
              if(Math.abs(center)>length/2-unit*.3)continue;
              const y=baseY+(row+.5)*course;
              // Keep masonry off glazed and doorway surfaces.
              const opening=(level.windows||[]).some(win=>win.face===face&&Math.abs(center-(win.u||0)*length*.38)<Math.max(.45,win.width*h/22)+unit*.45&&Math.abs(y-(baseY+h*(win.v||.55)))<Math.max(.65,win.height*h/12)+course*.5)||
                (level.doors||[]).some(door=>door.face===face&&Math.abs(center-(door.u||0)*length*.38)<Math.max(.55,door.width*h/18)+unit*.45&&y<Math.min(h*.8,Math.max(2.8,door.height*h/7))+course*.5);
              if(opening)continue;
              const stone=new THREE.Mesh(new THREE.BoxGeometry(unit*.965,course*.94,.065),mat());
              if(face==="front"||face==="back")stone.position.set(center,y,(face==="front"?1:-1)*(d/2+.028));
              else {stone.position.set((face==="right"?1:-1)*(w/2+.028),y,center);stone.rotation.y=Math.PI/2;}
              lg.add(stone);
            }
          }
        }
      }
      for(const win of level.windows||[]){
        const ww=Math.max(.9,win.width*h/11),wh=Math.max(1.3,win.height*h/6),edge=.018;
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
          // Keep the front-facing geometry; the rotation below aligns it with the side wall.
          frame.position.set(win.face==="right"?w/2+edge:-w/2-edge,baseY+h*(win.v||.55),(win.u||0)*(d*.38));
          frame.rotation.y+=Math.PI/2;
        }
        if(win.style==="double"){
          const mullion=new THREE.Mesh(new THREE.BoxGeometry(.035,wh*.92,.1),new THREE.MeshStandardMaterial({color:0xd8c9a8,roughness:.65}));mullion.position.copy(frame.position);mullion.rotation.copy(frame.rotation);lg.add(mullion);
        }
        // Window casing adds architectural depth while leaving the glass selectable.
        if(win.style!=="round"&&win.style!=="rose"&&win.style!=="arched"){
          const casing=new THREE.Group();
          casing.position.copy(frame.position);casing.rotation.copy(frame.rotation);
          const trimMaterial=new THREE.MeshStandardMaterial({color:0xc5b9a4,roughness:.78});
          const rail=(width:number,height:number,px:number,py:number)=>{
            const piece=new THREE.Mesh(new THREE.BoxGeometry(width,height,.085),trimMaterial);
            piece.position.set(px,py,.012);piece.castShadow=true;casing.add(piece);
          };
          rail(ww+.18,.075,0,wh/2+.045);rail(ww+.18,.09,0,-wh/2-.05);
          rail(.075,wh+.14,-ww/2-.045,0);rail(.075,wh+.14,ww/2+.045,0);
          lg.add(casing);
        }
        frame.userData.levelIndex=index;frame.userData.windowId=win.id;frame.userData.detailCategory="windows";frame.userData.detailId=win.id;frame.userData.detailFace=win.face;lg.add(frame);
      }
      for(const door of level.doors||[]){
        const dw=Math.max(1.1,door.width*h/9),dh=Math.min(h*.8,Math.max(2.8,door.height*h/7)),edge=.018;
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
        // A shallow stone sill and lintel visually anchor rectangular doors in the wall.
        if(!arched){
          const surround=new THREE.Group();surround.position.copy(mesh.position);surround.rotation.copy(mesh.rotation);
          const trimMaterial=new THREE.MeshStandardMaterial({color:0xaaa092,roughness:.83});
          for(const side of [-1,1]){
            const jamb=new THREE.Mesh(new THREE.BoxGeometry(.09,dh+.12,.1),trimMaterial);
            jamb.position.set(side*(dw/2+.045),0,.01);jamb.castShadow=true;surround.add(jamb);
          }
          const lintel=new THREE.Mesh(new THREE.BoxGeometry(dw+.22,.11,.11),trimMaterial);
          lintel.position.set(0,dh/2+.055,.01);lintel.castShadow=true;surround.add(lintel);
          lg.add(surround);
        }
        mesh.userData.levelIndex=index;mesh.userData.doorId=door.id;mesh.userData.doorFace=door.face;mesh.userData.detailCategory="doors";mesh.userData.detailFace=door.face;lg.add(mesh);
        if(door.style==="portico"){
          const colMat=new THREE.MeshStandardMaterial({color:0xd9d4cc,roughness:.75});
          for(const side of [-1,1]){const col=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,dh,10),colMat.clone());if(door.face==="front"||door.face==="back")col.position.set(mesh.position.x+side*(dw*.72),baseY+dh/2,mesh.position.z+(door.face==="front"?.08:-.08));else col.position.set(mesh.position.x+(door.face==="right"?.08:-.08),baseY+dh/2,mesh.position.z+side*(dw*.72));lg.add(col);}
        }
      }
      // Architectural detail system: references supplied for arches, classical/Gothic columns,
      // pediments, stairs and ornamental trim are rendered as procedural 3D pieces.
      // Reuse one material for identical details within a level.
      const detailMaterial=makeMaterial(level.material,color,false);
      const detailMat=()=>detailMaterial;
      const facePlace=(face:WallFace,u:number,y:number,out:number)=>{
        if(face==="front"||face==="back") return {x:u*(w*.38),y,z:face==="front"?d/2+out:-d/2-out,rot:face==="back"?Math.PI:0};
        return {x:face==="right"?w/2+out:-w/2-out,y,z:u*(d*.38),rot:face==="right"?Math.PI/2:-Math.PI/2};
      };
      for(const col of level.columns||[]){
        const pos=facePlace(col.face,col.u,baseY+h*.48,.13),ch=h*.9;
        const cg=col.style==="square"?new THREE.BoxGeometry(.28,ch,.28):new THREE.CylinderGeometry((col.style==="corinthian"||col.style==="composite") ? .18 : .14,.17,ch,col.style==="fluted"?20:14);
        const cm=new THREE.Mesh(cg,detailMat());cm.position.set(pos.x,pos.y,pos.z);cm.rotation.y=pos.rot;cm.userData.levelIndex=index;cm.userData.detailCategory="columns";cm.userData.detailId=col.id;cm.userData.detailFace=col.face;lg.add(cm);
        const cap=new THREE.Mesh(new THREE.BoxGeometry(.42,.16,.42),detailMat());cap.position.set(pos.x,baseY+h*.93,pos.z);cap.rotation.y=pos.rot;lg.add(cap);
        // Capital abacus, neck rings and vertical fluting on wall-attached columns.
        for(const ringY of [baseY+.18,baseY+h*.84,baseY+h*.89]){
          const ring=new THREE.Mesh(new THREE.CylinderGeometry(.215,.215,.045,16),detailMat());ring.position.set(pos.x,ringY,pos.z);lg.add(ring);
        }
        if(["doric","ionic","corinthian","composite","fluted","gothic"].includes(col.style)){
          for(let j=0;j<12;j++){const angle=j*Math.PI/6;const rib=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,ch*.82,5),detailMat());rib.position.set(pos.x+Math.cos(angle)*.155,baseY+h*.49,pos.z+Math.sin(angle)*.155);lg.add(rib);}
        }
        if(["corinthian","composite"].includes(col.style)){
          for(let j=0;j<8;j++){const angle=j*Math.PI/4;const leaf=new THREE.Mesh(new THREE.ConeGeometry(.055,.23,5),detailMat());leaf.position.set(pos.x+Math.cos(angle)*.20,baseY+h*.84,pos.z+Math.sin(angle)*.20);lg.add(leaf);}
        }
        if(["ionic","composite"].includes(col.style)){
          for(const side of [-1,1]){const spiral=new THREE.Mesh(new THREE.TorusGeometry(.075,.023,7,18),detailMat());spiral.position.set(pos.x+side*.19,baseY+h*.91,pos.z);lg.add(spiral);}
        }
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
        am.userData.levelIndex=index;am.userData.archId=arch.id;am.userData.archFace=arch.face;am.userData.detailCategory="arches";am.userData.detailFace=arch.face;lg.add(am);
        for(const side of [-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.12,h*.48,.14),detailMat());const offset=side*radius;if(arch.face==="front"||arch.face==="back")leg.position.set(pos.x+offset,baseY+h*.31,pos.z);else leg.position.set(pos.x,baseY+h*.31,pos.z+offset);lg.add(leg);}
      }
      for(const trim of level.trims||[]){
        const pos=facePlace(trim.face,trim.u||0,trim.style==="base"?baseY+.12:trim.style==="crown"||trim.style==="dentils"||trim.style==="frieze"?baseY+h-.16:baseY+h*.72,.11);
        const len=(trim.face==="front"||trim.face==="back")?w:d;
        const tg=new THREE.BoxGeometry(len,trim.style==="frieze"?.28:.12,.12);
        const tm=new THREE.Mesh(tg,detailMat());tm.position.set(pos.x,pos.y,pos.z);tm.rotation.y=pos.rot;tm.userData.levelIndex=index;tm.userData.detailCategory="trim";tm.userData.detailId=trim.id;tm.userData.detailFace=trim.face;lg.add(tm);
        if(["dentils","greek-fret","acanthus","rosette"].includes(trim.style)){for(let k=-4;k<=4;k++){const deco=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.08),detailMat());const du=k*len/10;if(trim.face==="front"||trim.face==="back")deco.position.set(du,pos.y-.13,pos.z);else deco.position.set(pos.x,pos.y-.13,du);lg.add(deco);}}
      }
      for(const stair of level.stairs||[]){
        const pos=facePlace(stair.face,stair.u,baseY,.22),sw=stair.style==="wide"||stair.style==="split"?1.8:1.15;
        for(let k=0;k<5;k++){const step=new THREE.Mesh(new THREE.BoxGeometry(sw,.12,.34+k*.12),detailMat());const outward=.28+k*.25;const angle=pos.rot;step.position.set(pos.x+Math.sin(angle)*outward,baseY+.06+(4-k)*.1,pos.z+Math.cos(angle)*outward);step.rotation.y=angle;step.userData.levelIndex=index;step.userData.detailCategory="stairs";step.userData.detailId=stair.id;step.userData.detailFace=stair.face;lg.add(step);}
      }
      for(const ped of level.pediments||[]){
        const pos=facePlace(ped.face,ped.u,baseY+h*.9,.17),pw=1.55;
        if(ped.style==="segmental"||ped.style==="broken-segmental"||ped.style==="swan-neck"){const pg=new THREE.TorusGeometry(pw/2,.1,8,24,Math.PI);const pm=new THREE.Mesh(pg,detailMat());pm.position.set(pos.x,pos.y,pos.z);pm.rotation.z=Math.PI;pm.rotation.y=pos.rot;pm.userData.levelIndex=index;pm.userData.detailCategory="pediments";pm.userData.detailId=ped.id;pm.userData.detailFace=ped.face;lg.add(pm);}
        else {for(const side of [-1,1]){const bar=new THREE.Mesh(new THREE.BoxGeometry(pw*.58,.11,.13),detailMat());bar.position.set(pos.x+(ped.face==="front"||ped.face==="back"?side*.34:0),pos.y+.22,pos.z+(ped.face==="left"||ped.face==="right"?side*.34:0));bar.rotation.y=pos.rot;bar.rotation.z=side*.5;bar.userData.levelIndex=index;bar.userData.detailCategory="pediments";bar.userData.detailId=ped.id;bar.userData.detailFace=ped.face;lg.add(bar);}}
      }
      if((level.elevation||0)>0){
        const below=levels.filter((candidate,i)=>i!==index && (candidate.elevation||0)<(level.elevation||0)).sort((a,b)=>(b.elevation||0)-(a.elevation||0))[0];
        const exposed=!!below&&(Math.abs((level.x||0)-(below.x||0))>.15||Math.abs((level.z||0)-(below.z||0))>.15||level.width<below.width-4||level.depth<below.depth-4);
        if(exposed!==level.patio) queueMicrotask(()=>onPatioChange?.(index,exposed));
      }
    });
    // Independent site columns can be arranged around any temple without a wall attachment.
    siteObjectGroupsRef.current=[];
    for(const column of siteColumns){
      const g=new THREE.Group();g.position.set(column.x,0,column.z);g.rotation.y=THREE.MathUtils.degToRad(column.rotation);g.userData.siteObjectId=column.id;g.userData.siteObjectKind="column";siteObjectGroupsRef.current.push(g);group.add(g);
      const cm=makeMaterial(column.material,COLORS[column.material]);
      const h=column.height,r=column.radius;
      const mesh=(geo:THREE.BufferGeometry,y:number)=>{const m=new THREE.Mesh(geo,cm.clone());m.position.y=y;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
      mesh(new THREE.CylinderGeometry(r*.94,r*1.12,h*.83,column.style==="square"?4:24),h*.51);
      mesh(new THREE.CylinderGeometry(r*1.4,r*1.55,h*.075,24),h*.065);
      mesh(new THREE.CylinderGeometry(r*1.35,r*1.1,h*.075,24),h*.9);
      mesh(new THREE.BoxGeometry(r*3.3,h*.075,r*3.3),h*.97);
      if(["ionic","corinthian","composite","fluted","gothic"].includes(column.style)){
        for(let i=0;i<12;i++){const a=i*Math.PI/6;const rib=new THREE.Mesh(new THREE.CylinderGeometry(r*.085,r*.085,h*.77,5),cm.clone());rib.position.set(Math.cos(a)*r*.97,h*.51,Math.sin(a)*r*.97);g.add(rib);}
      }
      if(["corinthian","composite"].includes(column.style)){
        for(let i=0;i<8;i++){const a=i*Math.PI/4;const leaf=new THREE.Mesh(new THREE.ConeGeometry(r*.23,h*.13,5),cm.clone());leaf.position.set(Math.cos(a)*r*1.08,h*.87,Math.sin(a)*r*1.08);g.add(leaf);}
      }
      if(column.style==="ionic"||column.style==="composite")for(const side of [-1,1]){const volute=new THREE.Mesh(new THREE.TorusGeometry(r*.36,r*.10,8,20),cm.clone());volute.position.set(side*r*.9,h*.93,0);g.add(volute);}
    }
    // User-placeable landscaping is separate from the fixed environmental backdrop.
    for(const item of landscapeItems){
      const g=new THREE.Group();g.position.set(item.x,0,item.z);g.rotation.y=THREE.MathUtils.degToRad(item.rotation);g.scale.setScalar(Math.max(.3,Math.min(4,item.scale||1)));g.userData.siteObjectId=item.id;g.userData.siteObjectKind="landscape";siteObjectGroupsRef.current.push(g);group.add(g);
      const material=(color:number)=>new THREE.MeshStandardMaterial({color,roughness:.85});
      const add=(geo:THREE.BufferGeometry,x:number,y:number,z:number,color:number)=>{const m=new THREE.Mesh(geo,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);};
      if(item.kind==="tree"){
        add(new THREE.CylinderGeometry(.12,.19,1.6,8),0,.8,0,0x695039);
        for(let i=0;i<4;i++)add(new THREE.ConeGeometry(.93-i*.15,1.25,12),0,1.45+i*.48,0,i%2?0x416b40:0x537d4b);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;add(new THREE.SphereGeometry(.13,8,6),Math.cos(a)*.47,1.7+(i%3)*.38,Math.sin(a)*.47,0x8f7440);}
      }else if(item.kind==="garden"){
        add(new THREE.CylinderGeometry(1.15,1.2,.16,24),0,.08,0,0x776c56);
        add(new THREE.CylinderGeometry(1.05,1.05,.04,24),0,.18,0,0x394b2f);
        for(let i=0;i<12;i++){const a=i*Math.PI/6;const x=Math.cos(a)*.76,z=Math.sin(a)*.76;add(new THREE.ConeGeometry(.11,.34,7),x,.36,z,0x4d7846);add(new THREE.SphereGeometry(.14,9,7),x,.56,z,i%3===0?0xd8b454:i%3===1?0x9b5a9c:0xc86d65);}
      }else if(item.kind==="path"){
        for(let i=0;i<8;i++){const z=(i-3.5)*.53;add(new THREE.BoxGeometry(.79,.08,.47),0,.04,z,i%3===0?0x9d8d76:0xb4a58c);add(new THREE.BoxGeometry(.07,.025,.44),-.29,.095,z,0xc4b69d);}
      }else if(item.kind==="fountain"){
        add(new THREE.CylinderGeometry(1.05,1.1,.32,32),0,.16,0,0xbbb6aa);
        add(new THREE.CylinderGeometry(.91,.91,.025,32),0,.335,0,0x5f9faf);
        add(new THREE.CylinderGeometry(.13,.2,.95,16),0,.8,0,0xc4c0b8);
        add(new THREE.SphereGeometry(.23,12,10),0,1.34,0,0x80c4d5);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;const m=new THREE.Mesh(new THREE.TorusGeometry(.035,.012,5,10),new THREE.MeshStandardMaterial({color:0x9cdae6,metalness:.25,roughness:.18}));m.position.set(Math.cos(a)*.75,.37,Math.sin(a)*.75);m.rotation.x=Math.PI/2;g.add(m);}
        add(new THREE.TorusGeometry(1.02,.075,8,40),0,.33,0,0xe0d8c9);
      }else if(item.kind==="pond"){
        add(new THREE.CylinderGeometry(1.7,1.75,.10,32),0,.05,0,0x8c8779);
        add(new THREE.CylinderGeometry(1.58,1.58,.025,32),0,.115,0,0x4b8792);
        for(let i=0;i<11;i++){const a=i*2.4,r=.45+(i%4)*.28;add(new THREE.CylinderGeometry(.11,.11,.015,10),Math.cos(a)*r,.14,Math.sin(a)*r,0x5d9870);}
        for(let i=0;i<18;i++){const a=i*Math.PI/9;add(new THREE.DodecahedronGeometry(.12+(i%3)*.04,0),Math.cos(a)*1.67,.13,Math.sin(a)*1.67,0x97918a);}
      }else{
        add(new THREE.DodecahedronGeometry(.8,1),0,.52,0,0x817e75);
        add(new THREE.DodecahedronGeometry(.42,0),.52,.28,-.25,0xaaa49a);
        add(new THREE.DodecahedronGeometry(.27,0),-.48,.18,.30,0x696e68);
      }
    }
    statueGroupsRef.current=[];
    const statueColor=(f:Statue["finish"])=>f==="bronze"?0x8a6038:f==="gold"?0xc9a84f:f==="obsidian"?0x25252b:0xd9d4cc;
    for(const statue of statues){
      const sg=new THREE.Group();sg.userData.statueId=statue.id;sg.position.set(statue.x,0,statue.z);sg.rotation.y=THREE.MathUtils.degToRad(statue.rotation);sg.scale.setScalar(statue.scale);group.add(sg);statueGroupsRef.current.push(sg);
      const sm=new THREE.MeshStandardMaterial({color:statueColor(statue.finish),roughness:(statue.finish==="gold"||statue.finish==="bronze")?.42:.72,metalness:statue.finish==="gold"?.65:statue.finish==="bronze"?.45:.05,emissive:statue.id===selectedStatueId?0x241d08:0,emissiveIntensity:.22});
      const mesh=(g:THREE.BufferGeometry,x:number,y:number,z:number)=>{const m=new THREE.Mesh(g,sm.clone());m.position.set(x,y,z);sg.add(m);return m;};
      mesh(new THREE.CylinderGeometry(.42,.5,.22,18),0,.11,0);
      if(statue.kind==="lion"){
        mesh(new THREE.SphereGeometry(.42,16,10),0,.72,0);
        for(let i=0;i<10;i++){const a=i*Math.PI/5;mesh(new THREE.ConeGeometry(.11,.30,5),Math.cos(a)*.35,.76+Math.sin(a)*.32,.10);}
        mesh(new THREE.ConeGeometry(.12,.23,6),-.18,1.12,.14);mesh(new THREE.ConeGeometry(.12,.23,6),.18,1.12,.14);
        const body=mesh(new THREE.CapsuleGeometry(.34,.8,6,12),0,.55,-.25);body.rotation.x=Math.PI/2;for(const x of [-.25,.25])for(const z of [-.48,.05])mesh(new THREE.CylinderGeometry(.07,.09,.48,10),x,.3,z);
      }else{
        mesh(new THREE.CapsuleGeometry(.24,.9,6,12),0,.8,0);mesh(new THREE.SphereGeometry(.2,16,10),0,1.52,0);
        if(statue.kind==="angel"){for(const side of [-1,1]){const wing=mesh(new THREE.ConeGeometry(.38,1.35,7),side*.43,1.15,.08);wing.rotation.z=side*.55;for(let j=0;j<4;j++){const feather=mesh(new THREE.ConeGeometry(.09,.54,5),side*(.47+j*.11),.77+j*.18,.12);feather.rotation.z=side*.42;}}mesh(new THREE.TorusGeometry(.23,.025,6,24),0,1.84,0); }
        else {for(const side of [-1,1]){const arm=mesh(new THREE.CylinderGeometry(.065,.075,.65,10),side*.32,.9,0);arm.rotation.z=side*.25;}mesh(new THREE.CylinderGeometry(.12,.18,.7,12),0,.42,0);}
      }
    }
    perimeterGroupRef.current=null;
    if(perimeter && levels.length){
      const pg=new THREE.Group();pg.userData.perimeter=true;group.add(pg);perimeterGroupRef.current=pg;
      const mat=makeMaterial(perimeter.material);
      const addWall=(len:number,x:number,z:number,rot:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(len,perimeter.height,perimeter.thickness),mat.clone());m.position.set(x,perimeter.height/2,z);m.rotation.y=rot;pg.add(m);};
      const maxW=Math.max(...levels.map(l=>l.width/7+Math.abs(l.x||0)*2))+perimeter.margin*2;
      const maxD=Math.max(...levels.map(l=>l.depth/7+Math.abs(l.z||0)*2))+perimeter.margin*2;
      const points:Array<[number,number]>=perimeter.style==="circle"?Array.from({length:32},(_,i)=>{const a=i*Math.PI*2/32;return [Math.cos(a)*maxW/2,Math.sin(a)*maxD/2] as [number,number];}):perimeter.style==="octagon"?Array.from({length:8},(_,i)=>{const a=-Math.PI/8+i*Math.PI*2/8;return [Math.cos(a)*maxW/2,Math.sin(a)*maxD/2] as [number,number];}):perimeter.style==="star"?Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2===0?1:.72;return [Math.cos(a)*maxW/2*r,Math.sin(a)*maxD/2*r] as [number,number];}):[[-maxW/2,-maxD/2],[maxW/2,-maxD/2],[maxW/2,maxD/2],[-maxW/2,maxD/2]];
      points.forEach((a,i)=>{const b=points[(i+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1];addWall(Math.hypot(dx,dz),(a[0]+b[0])/2,(a[1]+b[1])/2,-Math.atan2(dz,dx));});
      if(perimeter.gate){const front=points.reduce((best,p)=>p[1]>best[1]?p:best,points[0]);const gate=new THREE.Mesh(new THREE.BoxGeometry(1.4,perimeter.height*.82,.16),new THREE.MeshStandardMaterial({color:0x4b3527,roughness:.65,metalness:.18}));gate.position.set(front[0],perimeter.height*.41,front[1]);pg.add(gate);}
      if(perimeter.towers){const towerMat=mat.clone();points.forEach(([x,z])=>{const r=.38;let g:THREE.BufferGeometry;if(perimeter.towerShape==="square")g=new THREE.BoxGeometry(.8,perimeter.height*1.5,.8);else if(perimeter.towerShape==="star"){const sh=new THREE.Shape();for(let i=0;i<10;i++){const rr=i%2===0?r:r*.48,a=-Math.PI/2+i*Math.PI/5;i?sh.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):sh.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}sh.closePath();g=new THREE.ExtrudeGeometry(sh,{depth:perimeter.height*1.5,bevelEnabled:false});g.rotateX(Math.PI/2);g.translate(0,perimeter.height*1.5,0);}else g=new THREE.CylinderGeometry(r,r,perimeter.height*1.5,perimeter.towerShape==="octagon"?8:perimeter.towerShape==="hexagon"?6:20);const t=new THREE.Mesh(g,towerMat.clone());t.position.set(x,perimeter.towerShape==="star"?0:perimeter.height*.75,z);pg.add(t);});}
      if(perimeter.columns||perimeter.arches){const frontZ=Math.max(...points.map(p=>p[1]));for(const x of [-1.1,1.1]){if(perimeter.columns){const col=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,perimeter.height*1.1,12),mat.clone());col.position.set(x,perimeter.height*.55,frontZ);pg.add(col);}}if(perimeter.arches){const arch=new THREE.Mesh(new THREE.TorusGeometry(.75,.12,8,20,Math.PI),mat.clone());arch.rotation.z=Math.PI;arch.position.set(0,perimeter.height*.78,frontZ);pg.add(arch);}}
    }
    // Render the unconfirmed building as a translucent blue ghost, preserving its geometry.
    if(pendingLevelIndex!==null && pendingLevelIndex!==undefined){
      const pendingGroup=levelGroupsRef.current[pendingLevelIndex];
      pendingGroup?.traverse(object=>{
        if(!(object instanceof THREE.Mesh))return;
        object.material=new THREE.MeshBasicMaterial({color:0x48a9ff,transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide});
        object.castShadow=false;
      });
    }
    enableShadows(group);if(perimeterGroupRef.current)enableShadows(perimeterGroupRef.current);statueGroupsRef.current.forEach(enableShadows);
    // Structural bounds define the orbit pivot; site decorations never move it.
    group.updateMatrixWorld(true);
    const buildingBounds=new THREE.Box3();
    const renderedBounds=new THREE.Box3();
    levelGroupsRef.current.forEach((levelGroup,index)=>{
      const level=levels[index],bottom=(level.elevation||0)/7;
      const shell=new THREE.Box3(
        new THREE.Vector3(-level.width/14,bottom,-level.depth/14),
        new THREE.Vector3(level.width/14,bottom+level.height/7,level.depth/14)
      ).applyMatrix4(levelGroup.matrixWorld);
      buildingBounds.union(shell);
      renderedBounds.union(new THREE.Box3().setFromObject(levelGroup));
    });
    const fit=cameraFitRef.current;
    if(!buildingBounds.isEmpty()){
      const center=buildingBounds.getCenter(new THREE.Vector3());
      let radius=0;
      for(const x of [renderedBounds.min.x,renderedBounds.max.x])
        for(const y of [renderedBounds.min.y,renderedBounds.max.y])
          for(const z of [renderedBounds.min.z,renderedBounds.max.z])
            radius=Math.max(radius,center.distanceTo(new THREE.Vector3(x,y,z)));
      const geometryChanged=!buildingBounds.equals(lastBoundsRef.current)||Math.abs(radius-framingRadiusRef.current)>1e-6;
      lastBoundsRef.current.copy(buildingBounds);framingRadiusRef.current=radius;
      const needed=templeFitDistance(radius,camera);
      const firstBuild=fit.buildingCount===0;
      fit.fitRadius=needed;
      // Keep the user's orbit and pan during ordinary edits. Only a first build
      // or a substantial scene-size change may automatically adjust framing.
      const substantialSizeChange=fit.lastSpan>0 && (radius>fit.lastSpan*1.35 || radius<fit.lastSpan*.70);
      if(firstBuild){
        cameraFocusRef.current={x:center.x,z:center.z};targetYRef.current=center.y;
        orbitRef.current.radius=needed;
        cameraPanRef.current={x:0,y:0,z:0,manual:false};
        orbitRef.current.theta=0;orbitRef.current.phi=1.28;
      }else if(geometryChanged && substantialSizeChange && !fit.userFramed){
        cameraFocusRef.current={x:center.x,z:center.z};targetYRef.current=center.y;
        orbitRef.current.radius=needed;
        cameraPanRef.current={x:0,y:0,z:0,manual:false};
      }
      fit.initialized=true;fit.lastSpan=radius;
    }else{
      lastBoundsRef.current.makeEmpty();framingRadiusRef.current=0;fit.initialized=false;
    }
    fit.buildingCount=levels.length;
    renderCameraRef.current();

  },[levels,perimeter,statues,siteColumns,landscapeItems]);

  useEffect(()=>{sceneryApplyRef.current?.(scenery);renderCameraRef.current();},[scenery]);

  // Selection highlighting does not require rebuilding geometry or reframing the camera.
  useEffect(()=>{
    levelGroupsRef.current.forEach((group,index)=>group.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      materials.forEach(material=>{if(material instanceof THREE.MeshStandardMaterial){material.emissive.setHex(index===selectedLevel?0x211b08:0x000000);material.emissiveIntensity=index===selectedLevel?.1:0;}});
    }));
    const scene=sceneRef.current,renderer=rendererRef.current,camera=cameraRef.current;
    if(scene&&renderer&&camera)renderCameraRef.current();
  },[selectedLevel,levels]);

  return <div className="absolute inset-0"><div ref={hostRef} className="absolute inset-0" /><button type="button" onClick={()=>resetCameraRef.current()} className="absolute right-3 top-20 z-30 rounded-xl bg-black/70 px-3 py-2 text-xs font-semibold text-white shadow-lg">Center Temple</button><div className="pointer-events-none absolute bottom-[128px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-2 text-xs text-white/70">Drag to look around • pinch wall to resize • pinch empty space to zoom</div></div>;
}
