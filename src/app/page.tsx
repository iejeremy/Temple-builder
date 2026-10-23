"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const TempleWorld = dynamic(() => import("@/components/Temple3DPreview"), {
  ssr: false,
  loading: () => <div className="flex h-[100dvh] items-center justify-center bg-[#b9c4cb] text-black/50">Opening building site…</div>,
});

export type BuildingShape = "rectangle" | "square" | "wide" | "l-shape" | "t-shape" | "u-shape" | "cross" | "octagon" | "rotunda" | "courtyard" | "star" | "six-star" | "circle" | "triangle" | "hexagon" | "diamond" | "oval" | "horseshoe" | "x-shape" | "ring";
export type BuilderMaterial = "marble" | "sandstone" | "limestone" | "obsidian" | "granite" | "travertine" | "brick" | "stone" | "concrete" | "stucco" | "plaster" | "timber" | "bronze" | "gold";
export type RoofStyle = "flat" | "pyramid" | "dome" | "cone" | "steeple" | "tiered" | "curved" | "ornate" | "none";
export type WallFace = "front" | "back" | "left" | "right";
export type WindowStyle = "classic" | "tall" | "arched" | "round" | "double" | "rose" | "stained" | "narrow" | "twin" | "ornate";
export type DoorStyle = "single" | "double" | "arched" | "bronze" | "temple" | "portico" | "wood-arch" | "stone-arch" | "grand-arch" | "carved-stone" | "metal-gate";
export type WindowAttachment = { id: string; face: WallFace; u: number; v: number; width: number; height: number; style: WindowStyle; };
export type DoorAttachment = { id: string; face: WallFace; u: number; width: number; height: number; style: DoorStyle; };
export type ArchStyle = "flat"|"round"|"segmental"|"horseshoe"|"pointed"|"three-pointed"|"pointed-segmental"|"parabolic"|"inflected"|"round-rampant"|"ogee"|"oriental"|"trefoil"|"pointed-trefoil"|"three-centered"|"four-centered"|"tudor"|"keyhole"|"reverse-ogee"|"cinquefoil"|"pointed-cinquefoil"|"multifoil"|"lancet"|"venetian"|"florentine";
export type ColumnStyle = "doric"|"ionic"|"corinthian"|"composite"|"tuscan"|"fluted"|"square"|"twisted"|"gothic"|"roman-esque";
export type TrimStyle = "base"|"crown"|"dentils"|"frieze"|"greek-fret"|"acanthus"|"rosette"|"baroque-scroll"|"antefix"|"gargoyle";
export type StairStyle = "straight"|"wide"|"curved"|"spiral"|"split"|"corner";
export type PedimentStyle = "straight"|"triangular"|"segmental"|"broken-triangular"|"broken-segmental"|"swan-neck"|"stepped"|"ornate";
export type ArchAttachment = { id:string; face:WallFace; u:number; style:ArchStyle; };
export type ColumnAttachment = { id:string; face:WallFace; u:number; style:ColumnStyle; };
export type TrimAttachment = { id:string; face:WallFace; u:number; style:TrimStyle; };
export type StairAttachment = { id:string; face:WallFace; u:number; style:StairStyle; rotation?:number; };
export type PedimentAttachment = { id:string; face:WallFace; u:number; style:PedimentStyle; };
export type PerimeterStyle = "rectangle"|"circle"|"octagon"|"star";
export type PerimeterFeature = "towers"|"gate"|"arches"|"columns";
export type TowerShape = "round"|"square"|"octagon"|"hexagon"|"star"|"spire";
export type Perimeter = { style:PerimeterStyle; material:BuilderMaterial; margin:number; height:number; thickness:number; towerShape:TowerShape; towers:boolean; gate:boolean; arches:boolean; columns:boolean; };
export type StatueKind = "guardian"|"angel"|"lion";
export type StatueFinish = "marble"|"bronze"|"gold"|"obsidian";
export type LandscapeKind = "tree"|"garden"|"path"|"fountain"|"pond"|"rock";
export type LandscapeItem = {id:string;kind:LandscapeKind;x:number;z:number;scale:number;rotation:number};
export type SiteColumn = { id:string; style:ColumnStyle; material:BuilderMaterial; x:number; z:number; height:number; radius:number; rotation:number; };
export type Statue = { id:string; kind:StatueKind; finish:StatueFinish; x:number; z:number; rotation:number; scale:number; };
export type BuildingLevel = { architecture?: "maya"|"egyptian"|"hindu"|"greek"|"gothic"|"echoes";
  id: string;
  shape: BuildingShape;
  material: BuilderMaterial;
  width: number;
  depth: number;
  height: number;
  roof: RoofStyle;
  patio: boolean;
  x: number;
  z: number;
  rotation: number;
  /** Height above the ground in builder units. 0 = a separate ground-floor building/wing. */
  elevation: number;
  windows: WindowAttachment[];
  doors: DoorAttachment[];
  arches: ArchAttachment[];
  columns: ColumnAttachment[];
  trims: TrimAttachment[];
  stairs: StairAttachment[];
  pediments: PedimentAttachment[];
};

export default function TempleBuilderPage() {
  const [shape, setShape] = useState<BuildingShape | null>(null);
  const [material, setMaterial] = useState<BuilderMaterial>("marble");
  const [width, setWidth] = useState(32);
  const [depth, setDepth] = useState(26);
  const [height, setHeight] = useState(22);
  const [roof, setRoof] = useState<RoofStyle>("flat");
  const [levels, setLevels] = useState<BuildingLevel[]>([]);
  const [pendingBuilding,setPendingBuilding] = useState<BuildingLevel|null>(null);
  const [perimeter, setPerimeter] = useState<Perimeter | null>(null);
  const [statues, setStatues] = useState<Statue[]>([]);
  const [siteColumns,setSiteColumns] = useState<SiteColumn[]>([]);
  const [selectedSiteColumnId,setSelectedSiteColumnId] = useState<string|null>(null);
  const [selectedStatueId, setSelectedStatueId] = useState<string | null>(null);
  const [selectedLandscapeId,setSelectedLandscapeId]=useState<string|null>(null);
  const [activeObject,setActiveObject]=useState<"building"|"column"|"statue"|"landscape"|null>(null);
  const [wallStep, setWallStep] = useState<"main"|"features"|"options">("main");
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [selectedFace, setSelectedFace] = useState<WallFace | null>(null);
  const [viewerFace,setViewerFace]=useState<WallFace>("front");
  const [detailCategory, setDetailCategory] = useState<"levels"|"windows"|"doors"|"trim"|"columns"|"arches"|"stairs"|"pediments"|"roof"|"material"|null>(null);
  const [landscapeItems,setLandscapeItems] = useState<LandscapeItem[]>([]);
  const [scenery,setScenery] = useState<"garden"|"desert"|"twilight">("garden");
  const [panel, setPanel] = useState<"add" | "floors" | "walls" | "buildings" | "templates" | "fountains" | "statues" | "site-columns" | "stairs" | "scenery" | "more" | "edit" | null>(null);
  // Save the complete building site on this device without requiring an account.
  const [siteLoaded,setSiteLoaded] = useState(false);
  useEffect(()=>{
    try {
      const raw=window.localStorage.getItem("echoes-temple-builder-v1");
      if(raw){
        const saved=JSON.parse(raw);
        if(Array.isArray(saved.levels)){setLevels(saved.levels);if(saved.levels.length)setShape(saved.levels[0].shape);}
        if(saved.perimeter)setPerimeter(saved.perimeter);
        if(Array.isArray(saved.siteColumns))setSiteColumns(saved.siteColumns);
        if(Array.isArray(saved.statues))setStatues(saved.statues);
        if(Array.isArray(saved.landscapeItems))setLandscapeItems(saved.landscapeItems);
        if(["garden","desert","twilight"].includes(saved.scenery))setScenery(saved.scenery);
      }
    }catch(err){console.warn("Could not restore local temple design",err);}
    setSiteLoaded(true);
  },[]);
  useEffect(()=>{
    if(!siteLoaded)return;
    try{window.localStorage.setItem("echoes-temple-builder-v1",JSON.stringify({levels,perimeter,siteColumns,statues,landscapeItems,scenery}));}
    catch(err){console.warn("Could not save local temple design",err);}
  },[siteLoaded,levels,perimeter,siteColumns,statues,landscapeItems,scenery]);



  const addTemplate = (kind: number, greekOrder: ColumnStyle = "corinthian") => {
    // Detailed architectural templates adapted from Temple-builder-improved.zip.
    // Templates append to the site; no existing levels or user edits are deleted.
    const uid=()=>`${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const make=(shape:BuildingShape,material:BuilderMaterial,width:number,depth:number,height:number,x:number,z:number,elevation=0,roof:RoofStyle="flat"):BuildingLevel=>({
      id:`template-${uid()}`,shape,material,width,depth,height,x,z,elevation,roof,rotation:0,patio:false,
      windows:[],doors:[],arches:[],columns:[],trims:[],stairs:[],pediments:[]
    });
    const door=(l:BuildingLevel,face:WallFace,style:DoorStyle,u=0,width=1.8,height=2.3)=>l.doors.push({id:`door-${uid()}`,face,u,width,height,style});
    const window=(l:BuildingLevel,face:WallFace,style:WindowStyle,u:number,v=.55)=>l.windows.push({id:`win-${uid()}`,face,u,v,width:style==="double"?1.7:style==="narrow"?.7:1.1,height:style==="tall"||style==="arched"?1.8:1.2,style});
    const columns=(l:BuildingLevel,style:ColumnStyle,faces:WallFace[]=["front","back"],us:number[]=[-.75,-.4,.4,.75])=>{for(const face of faces)for(const u of us)l.columns.push({id:`col-${uid()}`,face,u,style});};
    const stairs=(l:BuildingLevel,face:WallFace="front",style:StairStyle="wide")=>l.stairs.push({id:`stair-${uid()}`,face,u:0,style});
    const arch=(l:BuildingLevel,face:WallFace,style:ArchStyle)=>l.arches.push({id:`arch-${uid()}`,face,u:0,style});
    const trim=(l:BuildingLevel,face:WallFace,style:TrimStyle)=>l.trims.push({id:`trim-${uid()}`,face,u:0,style});
    const pediment=(l:BuildingLevel,face:WallFace,style:PedimentStyle)=>l.pediments.push({id:`ped-${uid()}`,face,u:0,style});
    const decorate=(l:BuildingLevel,faces:WallFace[],style:TrimStyle)=>{for(const face of faces)trim(l,face,style);};
    let parts:BuildingLevel[]=[];
    if(kind===0){
      // Temple of the Sun · Maya: four stepped tiers, four stairways and summit shrine.
      const base=make("square","limestone",68,68,11,0,0);
      const mid=make("square","limestone",52,52,10,0,0,11);
      const upper=make("square","limestone",36,36,9,0,0,21);
      const shrine=make("rectangle","stone",20,16,16,0,0,30);
      for(const face of ["front","back","left","right"] as WallFace[])stairs(base,face);
      stairs(mid,"front","straight");
      door(shrine,"front","carved-stone",0,1.6,2.4);
      for(const face of ["back","left","right"] as WallFace[])window(shrine,face,"narrow",0);
      window(shrine,"front","narrow",-.55,.6);window(shrine,"front","narrow",.55,.6);
      columns(shrine,"square",["front"],[-.7,.7]);trim(shrine,"front","frieze");trim(shrine,"back","frieze");
      decorate(base,["front","back","left","right"],"base");
      decorate(mid,["front","back","left","right"],"greek-fret");
      decorate(upper,["front","back","left","right"],"frieze");
      pediment(shrine,"front","stepped");
      parts=[base,mid,upper,shrine];
    }else if(kind===1){
      // Eternal Courtyard · Egypt: court, hypostyle hall, sanctuary and twin pylons.
      const court=make("courtyard","sandstone",64,50,12,0,2);
      const hall=make("wide","sandstone",52,24,20,0,-6);
      const sanctuary=make("rectangle","sandstone",22,18,24,0,-12);
      const left=make("square","sandstone",14,16,36,-8,8,0,"pyramid");
      const right=make("square","sandstone",14,16,36,8,8,0,"pyramid");
      columns(hall,"square",["front","back"],[-.8,-.5,-.2,.2,.5,.8]);
      columns(hall,"square",["left","right"],[-.5,0,.5]);
      door(hall,"front","temple",0,2.2,2.8);arch(hall,"front","round");stairs(hall);
      door(sanctuary,"front","carved-stone",0,1.4,2.2);
      window(sanctuary,"left","narrow",0,.7);window(sanctuary,"right","narrow",0,.7);
      trim(sanctuary,"front","frieze");
      for(const t of [left,right]){door(t,"front","stone-arch",0,1.2,2);window(t,"front","tall",0,.7);}
      trim(court,"front","base");trim(court,"back","base");
      decorate(hall,["front","back"],"crown");
      decorate(sanctuary,["front","back","left","right"],"base");
      for(const t of [left,right]){trim(t,"front","frieze");pediment(t,"front","stepped");}
      parts=[court,hall,sanctuary,left,right];
    }else if(kind===2){
      // Celestial Shrine · Hindu: mandapa, rising shikhara and golden finial.
      const hall=make("wide","sandstone",42,28,16,0,6);
      const tower1=make("square","stone",26,26,22,0,-4,0,"tiered");
      const tower2=make("square","stone",18,18,16,0,-4,22,"tiered");
      const tower3=make("octagon","stone",12,12,10,0,-4,38,"tiered");
      const finial=make("octagon","gold",7,7,6,0,-4,48,"dome");
      columns(hall,"twisted",["front","back"],[-.7,-.35,.35,.7]);
      columns(hall,"twisted",["left","right"],[-.4,.4]);
      door(hall,"front","carved-stone",0,1.7,2.4);arch(hall,"front","trefoil");stairs(hall);
      for(const face of ["left","right"] as WallFace[]){window(hall,face,"ornate",-.3);window(hall,face,"ornate",.3);}
      trim(hall,"front","acanthus");trim(hall,"back","acanthus");
      for(const face of ["front","back","left","right"] as WallFace[])window(tower1,face,"narrow",0);
      trim(tower1,"front","frieze");window(tower2,"front","narrow",0);
      decorate(tower1,["front","back","left","right"],"acanthus");
      decorate(tower2,["front","back","left","right"],"rosette");
      pediment(hall,"front","ornate");
      parts=[hall,tower1,tower2,tower3,finial];
    }else if(kind===3){
      // Marble Pantheon · Greek: full colonnade, portico, pediments and ornament.
      const temple=make("rectangle","marble",52,28,22,0,0,0,"pyramid");
      columns(temple,greekOrder,["front","back"],[-.85,-.55,-.25,.25,.55,.85]);
      columns(temple,greekOrder,["left","right"],[-.7,-.35,0,.35,.7]);
      door(temple,"front","portico",0,2,2.6);stairs(temple);stairs(temple,"back","straight");
      pediment(temple,"front","triangular");pediment(temple,"back","triangular");
      for(const face of ["left","right"] as WallFace[]){window(temple,face,"classic",-.4);window(temple,face,"classic",.4);}
      trim(temple,"front","dentils");trim(temple,"back","dentils");trim(temple,"front","greek-fret");
      trim(temple,"left","base");trim(temple,"right","base");
      decorate(temple,["front","back","left","right"],"crown");
      for(const face of ["left","right"] as WallFace[])trim(temple,face,"dentils");
      parts=[temple];
    }else if(kind===4){
      // Cathedral of Echoes · Gothic: nave, crossing and twin towers.
      const nave=make("wide","stone",66,26,32,0,0,0,"steeple");
      const crossing=make("cross","stone",34,34,30,0,-3,0,"steeple");
      const left=make("square","stone",16,16,48,-7,7,0,"steeple");
      const right=make("square","stone",16,16,48,7,7,0,"steeple");
      door(nave,"front","grand-arch",0,2.2,3);arch(nave,"front","pointed");
      window(nave,"front","rose",0,.78);window(nave,"front","tall",-.55,.45);window(nave,"front","tall",.55,.45);
      stairs(nave);columns(nave,"gothic",["front","back"],[-.7,-.35,.35,.7]);
      for(const face of ["left","right"] as WallFace[])for(const u of [-.5,0,.5])window(nave,face,"tall",u,.6);
      trim(nave,"front","crown");
      columns(crossing,"gothic",["front","back","left","right"],[-.5,.5]);
      for(const face of ["left","right"] as WallFace[]){door(crossing,face,"stone-arch",0,1.5,2.3);window(crossing,face,"arched",0,.65);}
      for(const tower of [left,right]){
        window(tower,"front","narrow",0,.35);window(tower,"front","narrow",0,.65);
        for(const face of ["back","left","right"] as WallFace[])window(tower,face,"narrow",0);
        arch(tower,"front","pointed");trim(tower,"front","crown");
      }
      pediment(nave,"front","ornate");
      for(const tower of [left,right]){trim(tower,"front","dentils");pediment(tower,"front","triangular");}
      parts=[nave,crossing,left,right];
    }else{
      // Temple of Unity · Echoes: central domed rotunda, four wings and courtyard.
      const rotunda=make("rotunda","marble",34,34,30,0,0,0,"dome");
      const north=make("wide","marble",42,18,17,0,7);
      const south=make("wide","marble",42,18,17,0,-7);
      const east=make("rectangle","marble",18,38,17,7,0);
      const west=make("rectangle","marble",18,38,17,-7,0);
      const court=make("courtyard","travertine",48,42,8,0,14);
      columns(rotunda,"ionic",["front","back"],[-.6,-.2,.2,.6]);
      columns(rotunda,"ionic",["left","right"],[-.4,.4]);
      door(rotunda,"front","temple",0,2,2.6);arch(rotunda,"front","round");
      for(const face of ["back","left","right"] as WallFace[])window(rotunda,face,"arched",0);
      trim(rotunda,"front","dentils");
      columns(north,"ionic",["front"],[-.7,-.35,.35,.7]);
      door(north,"front","portico",0,1.9,2.4);stairs(north);pediment(north,"front","triangular");
      for(const face of ["left","right"] as WallFace[]){window(north,face,"classic",-.3);window(north,face,"classic",.3);}
      door(south,"back","double",0,1.6,2.2);window(south,"left","classic",0);window(south,"right","classic",0);
      for(const wing of [east,west]){
        window(wing,"front","classic",-.3);window(wing,"front","classic",.3);
        window(wing,"back","classic",0);trim(wing,"front","base");door(wing,"front","single");
      }
      trim(court,"front","base");trim(court,"back","base");stairs(court,"front","straight");
      decorate(rotunda,["front","back","left","right"],"rosette");
      decorate(north,["front","back"],"dentils");
      parts=[rotunda,north,south,east,west,court];
    }
    // Architectural plan enhancements: site features remain independent, editable objects.
    const extraColumns:SiteColumn[]=[];
    const addFreestanding=(style:ColumnStyle,material:BuilderMaterial,x:number,z:number,height=3.2,radius=.19)=>{
      extraColumns.push({id:`plan-column-${uid()}`,style,material,x,z,height,radius,rotation:0});
    };
    if(kind===0){
      // Maya: freestanding stelae and an axial approach to the stepped sanctuary.
      for(const x of [-5,5])addFreestanding("square","limestone",x,9,2.5,.34);
    }else if(kind===1){
      // Egyptian hypostyle: two interior rows of columns along the temple axis.
      for(const x of [-2.25,2.25])for(const z of [-6.8,-5.5,-4.2,-2.9])addFreestanding("square","sandstone",x,z,3.3,.3);
      for(const x of [-4.5,4.5])for(const z of [3,5,7])addFreestanding("square","sandstone",x,z,2.5,.23);
    }else if(kind===2){
      // Hindu mandapa: pillared approach and processional axis.
      for(const x of [-2.2,2.2])for(const z of [5.2,6.5,7.8])addFreestanding("twisted","stone",x,z,2.6,.21);
    }else if(kind===3){
      // Greek peristyle: freestanding colonnade on all four sides.
      const nx=9,nz=5,w=52/14+1.05,d=28/14+1.05;
      for(let i=0;i<nx;i++){const x=-w+i*2*w/(nx-1);addFreestanding(greekOrder,"marble",x,-d,3.25);addFreestanding(greekOrder,"marble",x,d,3.25);}
      for(let i=1;i<nz-1;i++){const z=-d+i*2*d/(nz-1);addFreestanding(greekOrder,"marble",-w,z,3.25);addFreestanding(greekOrder,"marble",w,z,3.25);}
    }else if(kind===4){
      // Gothic nave: regularly spaced external buttress-like square piers.
      for(const z of [-3,-1.5,0,1.5,3])for(const x of [-2.7,2.7])addFreestanding("gothic","stone",x,z,3.6,.28);
    }else{
      // Echoes: ceremonial entrance colonnade.
      for(const x of [-3,-1.8,-.6,.6,1.8,3])addFreestanding("ionic","marble",x,11,3,.2);
    }
    const architecture=(["maya","egyptian","hindu","greek","gothic","echoes"] as const)[kind]||"echoes";
    parts=parts.map(l=>({...l,architecture}));
    if(levels.length && parts.length){
      const rightEdge=Math.max(...levels.map(l=>(l.x||0)+l.width/14));
      const leftEdge=Math.min(...parts.map(l=>(l.x||0)-l.width/14));
      const shift=rightEdge-leftEdge+3;
      parts=parts.map(l=>({...l,x:l.x+shift}));
      for(const c of extraColumns)c.x+=shift;
    }
    setSiteColumns(current=>[...current,...extraColumns]);
    setLevels(current=>[...current,...parts]);
    setShape(parts[0].shape);
    setSelectedLevel(levels.length);
    setSelectedFace(null);setDetailCategory(null);setPanel("edit");
  };

  const chooseShape = (next: BuildingShape, floorWidth?: number) => {
    const dims: Record<BuildingShape,[number,number]> = {
      square:[28,28], rectangle:[34,26], wide:[46,24], "l-shape":[38,34], "t-shape":[40,34],
      "u-shape":[42,36], cross:[40,40], octagon:[28,28], rotunda:[28,28], courtyard:[46,40],
      star:[36,36], "six-star":[36,36], circle:[36,36], triangle:[36,34], hexagon:[36,36],
      diamond:[36,34], oval:[42,30], horseshoe:[40,38], "x-shape":[40,38], ring:[36,36]
    };
    const [nextWidth,nextDepth]=floorWidth ? [floorWidth,36] : dims[next];
    setShape(next); setWidth(nextWidth); setDepth(nextDepth); setHeight(22);

    const fresh: BuildingLevel = {
      id:`building-${Date.now()}`, shape:next, material, width:nextWidth, depth:nextDepth, height:floorWidth ? 1 : 22,
      roof:floorWidth ? "none" : "flat", patio:false, x:0, z:0, rotation:0, elevation:0,
      windows:[], doors:[], arches:[], columns:[], trims:[], stairs:[], pediments:[]
    };

    // New buildings are staged, not saved, until the user confirms placement.
    if(levels.length){
      const anchor=levels[selectedLevel] || levels[0];
      fresh.x=(anchor.x||0)+(anchor.width+nextWidth)/14+.35;
      fresh.z=anchor.z||0;
    }
    setPendingBuilding(fresh);
    setSelectedLevel(levels.length);
    setSelectedFace(null);
    setPanel(null);
    setDetailCategory(null);
  };

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#b9c4cb] text-white">
      <TempleWorld levels={pendingBuilding?[...levels,pendingBuilding]:levels} pendingLevelIndex={pendingBuilding?levels.length:null} perimeter={perimeter} statues={statues} siteColumns={siteColumns} scenery={scenery} landscapeItems={landscapeItems} onSelectSiteColumn={(id:string)=>{setSelectedSiteColumnId(id);setActiveObject("column");setPanel("site-columns");}} onMoveSiteColumn={(id:string,x:number,z:number)=>setSiteColumns(v=>v.map(c=>c.id===id?{...c,x,z}:c))} onSelectLandscape={(id:string)=>{setSelectedLandscapeId(id);setActiveObject("landscape");setPanel("scenery");}} onMoveLandscape={(id:string,x:number,z:number)=>setLandscapeItems(v=>v.map(c=>c.id===id?{...c,x,z}:c))} selectedStatueId={selectedStatueId} selectedLevel={selectedLevel}
        onSelectLevel={(index) => { setSelectedLevel(index); setSelectedFace(null); setDetailCategory(null); setActiveObject("building");setPanel("edit"); }}
        onSelectFace={(index,face) => { setSelectedLevel(index); setSelectedFace(face); }}
        onCameraFacingChange={setViewerFace}
        onSelectDetail={(index,face,category) => { setSelectedLevel(index); setSelectedFace(face); setDetailCategory(category); setActiveObject("building");setPanel("edit"); }}
        onMoveLevel={(index,x,z) => {
          if(pendingBuilding && index===levels.length){setPendingBuilding(p=>p?{...p,x,z}:p);return;}
          const currentLevel=levels[index];
          // Ground-floor buildings/wings can be dragged together into any footprint.
          // Elevated stories stay attached vertically.
          if ((currentLevel?.elevation ?? 0) > 0) return;
          setLevels(current => {
            const base=current[index];
            if(!base)return current;
            const dx=x-(base.x||0),dz=z-(base.z||0);
            if(dx===0&&dz===0)return current;
            // Move vertically stacked stories together; other ground-floor buildings stay put.
            return current.map((l,i)=>{
              const sameStack=i===index || ((l.elevation||0)>0 && Math.abs((l.x||0)-(base.x||0))<.01 && Math.abs((l.z||0)-(base.z||0))<.01);
              return sameStack?{...l,x:(l.x||0)+dx,z:(l.z||0)+dz}:l;
            });
          });
        }}
        onPatioChange={(index,patio) => setLevels(current => current.map((l,i)=>i===index?{...l,patio}:l))}
        onMoveWindow={(levelIndex,id,u,v) => setLevels(current => current.map((l,i)=>i===levelIndex?{...l,windows:l.windows.map(win=>win.id===id?{...win,u,v}:win)}:l))}
        onMoveDoor={(levelIndex,id,u) => setLevels(current => current.map((l,i)=>i===levelIndex?{...l,doors:l.doors.map(door=>door.id===id?{...door,u}:door)}:l))}
        onMoveArch={(levelIndex,id,u) => setLevels(current => current.map((l,i)=>i===levelIndex?{...l,arches:l.arches.map(arch=>arch.id===id?{...arch,u}:arch)}:l))}
        onMoveDetail={(levelIndex,category,id,u,v) => setLevels(current => current.map((l,i)=>{
          if(i!==levelIndex) return l;
          if(category==="windows") return {...l,windows:l.windows.map(x=>x.id===id?{...x,u,v:v??x.v}:x)};
          if(category==="columns") return {...l,columns:l.columns.map(x=>x.id===id?{...x,u}:x)};
          if(category==="stairs") return {...l,stairs:l.stairs.map(x=>x.id===id?{...x,u}:x)};
          if(category==="pediments") return {...l,pediments:l.pediments.map(x=>x.id===id?{...x,u}:x)};
          if(category==="trim") return {...l,trims:l.trims.map(x=>x.id===id?{...x,u}:x)};
          return l;
        }))}
        onResizePerimeter={(margin)=>setPerimeter(p=>p?{...p,margin}:p)}
        onSelectPerimeter={()=>{setPanel("walls");setWallStep("features");}}
        onSelectStatue={(id)=>{setSelectedStatueId(id);setActiveObject("statue");setPanel("statues");}}
        onMoveStatue={(id,x,z)=>setStatues(v=>v.map(s=>s.id===id?{...s,x,z}:s))} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3">
        <div className="rounded-2xl bg-black/50 px-4 py-2 backdrop-blur">
          <div className="text-[10px] uppercase tracking-[.22em] text-amber-200/80">Echoes</div>
          <div className="text-sm font-semibold">Temple Builder</div>
        </div>
        
      </div>

      {!shape && (
        <div className="pointer-events-none absolute inset-x-5 top-[20%] z-10 rounded-3xl bg-black/40 p-5 text-center backdrop-blur-sm">
          <div className="text-xl font-semibold">Choose your starting building</div>
          <div className="mt-1 text-sm text-white/70">It will be placed directly on the building site.</div>
        </div>
      )}

      {pendingBuilding && <div className="absolute right-3 top-16 z-40 flex items-center gap-2 rounded-2xl bg-[#0c1118]/90 p-2 shadow-xl">
        <span className="px-2 text-xs text-blue-100">Drag blue building to position</span>
        <button aria-label="Cancel placement" onClick={()=>{setPendingBuilding(null);setSelectedLevel(Math.max(0,levels.length-1));}} className="rounded-xl bg-white/15 px-3 py-2 text-lg">✕</button>
        <button aria-label="Confirm placement" onClick={()=>{setLevels(current=>[...current,pendingBuilding]);setPendingBuilding(null);setActiveObject("building");setPanel(null);}} className="rounded-xl bg-blue-500 px-4 py-2 text-lg font-bold text-white">✓</button>
      </div>}
      {/* Improved bottom menu from supplied design; existing builder actions remain intact. */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[24px] border-t border-white/10 bg-[#0c1118]/96 max-h-[34dvh] overflow-y-auto overscroll-contain pb-[max(8px,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex justify-center pb-1 pt-2.5"><div className="h-1 w-10 rounded-full bg-white/20" /></div>
        <div className="flex items-center gap-2 px-3 pb-2">
          {panel===null ? <>
            <button onClick={()=>{setPanel("add");setDetailCategory(null);}} className="flex-1 rounded-xl bg-amber-200 px-3 py-3 text-sm font-bold text-black">+ Add</button>
            {levels.length>0&&<button onClick={()=>{setActiveObject("building");setSelectedLevel(Math.min(selectedLevel,levels.length-1));setPanel("edit");setDetailCategory("levels");}} className="flex-1 rounded-xl bg-amber-200/20 border border-amber-200/30 px-2 py-3 text-sm font-semibold">Levels ({levels.length})</button>}
            <button onClick={()=>{if(!activeObject&&levels.length){setActiveObject("building");setSelectedLevel(Math.min(selectedLevel,levels.length-1));}if(activeObject==="building"||(!activeObject&&levels.length))setPanel("edit");else if(activeObject==="column")setPanel("site-columns");else if(activeObject==="statue")setPanel("statues");else if(activeObject==="landscape")setPanel("scenery");}} className="flex-1 rounded-xl bg-white/15 px-3 py-3 text-sm font-semibold">Edit</button>
            <button onClick={()=>{setPanel(null);setDetailCategory(null);setActiveObject(null);setSelectedSiteColumnId(null);setSelectedStatueId(null);setSelectedLandscapeId(null);}} className="flex-1 rounded-xl bg-white/15 px-3 py-3 text-sm font-semibold">Done</button>
          </> : <>
            <button onClick={()=>{setPanel(null);setDetailCategory(null);}} className="rounded-xl bg-white/15 px-4 py-2.5 text-xs">‹ Back</button>
            <div className="flex-1 text-center text-sm font-semibold capitalize">{panel==="site-columns"?"Columns":panel==="buildings"?"Shapes":panel}</div>
            <button onClick={()=>{setPanel(null);setDetailCategory(null);}} className="rounded-xl bg-amber-200 px-4 py-2.5 text-xs font-bold text-black">Done</button>
          </>}
        </div>
        {panel===null&&activeObject&&<div className="px-3 pb-2 text-center text-xs text-white/65">Selected: {activeObject==="building"?(levels[selectedLevel]?.shape||"building"):activeObject==="column"?siteColumns.find(c=>c.id===selectedSiteColumnId)?.style||"column":activeObject==="statue"?"statue":"scenery"} · Tap Edit for its controls</div>}
        {panel === "add" && (
          <div className="grid grid-cols-4 gap-2 px-3 pb-3">
            {([
              ["buildings","Shapes","▣","Choose a footprint"],
              ["templates","Templates","▤","Six complete temple designs"],
              ["walls","Walls","⬡","Courtyard walls"],
              ["floors","Floors","▱","Square & wide floors"],
              ["statues","Statue","♟","Guardians & figures"],
              ["site-columns","Columns","▥","Swipe styles"],
              ["scenery","Scenery","◈","Garden, desert & dusk"],
              ["scenery","Fountain","◉","Place a fountain"],
              ["edit","Stairs","▤","Add entrance stairs"],
              ["more","More","＋","Coming soon"]
            ] as const).map(([id,name,icon,sub])=>(
              <button key={name} onClick={()=>{setPanel(id);setActiveObject(null);if(id==="walls")setWallStep(perimeter?"features":"main");}} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] px-1 py-2 text-center transition active:bg-white/10">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-200/15 text-lg text-amber-100">{icon}</span>
                <span className="text-xs font-semibold text-white">{name}</span>
                <span className="text-[10px] leading-tight text-white/45">{sub}</span>
              </button>
            ))}
          </div>
        )}
        {panel === "floors" && <div className="flex gap-2 overflow-x-auto px-3 py-3">
          {([[36,"Square Floor"],[55,"Wide Floor"]] as const).map(([size,label])=><button key={size} onClick={()=>chooseShape("rectangle",size)} className="min-w-[110px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">{label}</button>)}
        </div>}
        {panel === "edit" && shape && levels[selectedLevel] && (
          <div className="border-t border-white/10">
            {!detailCategory && <div className="flex gap-2 overflow-x-auto px-3 py-3">
              {(["levels","doors","windows","arches","columns","stairs","pediments","trim","roof","material"] as const).map(cat=><button key={cat} onClick={()=>{setDetailCategory(cat);setSelectedFace(null);}} className="min-w-[96px] shrink-0 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs capitalize">{cat}</button>)}
              <button onClick={()=>setPanel(null)} className="min-w-[78px] shrink-0 rounded-2xl bg-white/10 p-3 text-xs">Done</button>
            </div>}
            {detailCategory && <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
              <button onClick={()=>setDetailCategory(null)} className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs">Back</button>
              <span className="text-xs font-semibold capitalize text-white/70">{detailCategory}</span>
              {detailCategory!=="levels"&&detailCategory!=="roof"&&detailCategory!=="material"&&<span className="text-[11px] text-white/60">Level {selectedLevel+1}</span>}
              {selectedFace&&detailCategory!=="levels"&&detailCategory!=="roof"&&detailCategory!=="material"&&<button onClick={()=>setSelectedFace(null)} className="ml-auto rounded-lg border border-amber-200/50 bg-amber-200/15 px-3 py-2 text-xs capitalize text-amber-100">Wall: {selectedFace} · Change</button>}

            </div>}
            {detailCategory==="levels" && <div className="flex gap-2 overflow-x-auto px-3 py-3">
              {levels.length<12 && <button onClick={()=>{const base=levels[selectedLevel];setLevels([...levels,{...base,id:`level-${levels.length+1}`,width:Math.max(16,Math.round(base.width*.84)),depth:Math.max(16,Math.round(base.depth*.84)),roof:"flat",patio:false,x:base.x,z:base.z,rotation:base.rotation,elevation:(base.elevation||0)+base.height,windows:[],doors:[],arches:[],columns:[],trims:[],stairs:[],pediments:[]}]);setSelectedLevel(levels.length);}} className="min-w-[100px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">+ Add Level</button>}
              {levels.map((_,i)=><button key={i} onClick={()=>setSelectedLevel(i)} className={`min-w-[90px] shrink-0 rounded-xl p-3 text-xs ${i===selectedLevel?"bg-amber-200 text-black":"bg-white/10"}`}>Level {i+1}</button>)}
              {([["star","Star"],["circle","Circle"],["six-star","6-Point Star"],["rectangle","Rectangle"],["square","Square"],["wide","Wide"],["l-shape","L Shape"],["t-shape","T Shape"],["u-shape","U Shape"],["cross","Cross"],["octagon","Octagon"],["rotunda","Rotunda"],["courtyard","Courtyard"],["triangle","Triangle"],["hexagon","Hexagon"],["diamond","Diamond"],["oval","Oval"],["horseshoe","Horseshoe"],["x-shape","X Shape"],["ring","Ring"]] as [BuildingShape,string][]).map(([id,name])=><button key={id} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,shape:id}:l))} className={`min-w-[100px] shrink-0 rounded-xl border p-3 text-xs ${levels[selectedLevel].shape===id?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{name}</button>)}
            </div>}
            {detailCategory==="roof" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{(["flat","pyramid","dome","tiered","curved","ornate","cone","steeple","none"] as RoofStyle[]).map(x=><button key={x} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,roof:x}:l))} className={`min-w-[100px] shrink-0 rounded-xl border p-3 text-xs capitalize ${levels[selectedLevel].roof===x?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{x==="none"?"No roof":x}</button>)}</div>}
            {detailCategory==="material" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{(["marble","sandstone","limestone","travertine","granite","obsidian","brick","stone","concrete","stucco","plaster","timber","bronze","gold"] as BuilderMaterial[]).map(m=><button key={m} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,material:m}:l))} className={`min-w-[110px] shrink-0 rounded-xl border p-3 text-xs capitalize ${levels[selectedLevel].material===m?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{m}</button>)}</div>}
            {detailCategory==="windows" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&(["front","back","left","right"] as WallFace[]).map(face=><button key={face} onClick={()=>setSelectedFace(face)} className="shrink-0 rounded-xl bg-amber-200 px-3 py-3 text-xs font-semibold capitalize text-black">{face} wall</button>)}{selectedFace&&([["narrow","Narrow"],["arched","Arch"],["twin","Twin Arch"],["rose","Rose Window"],["tall","Tall Window"],["ornate","Ornate"],["classic","Classic"],["double","Double"],["stained","Stained Glass"]] as [WindowStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,windows:[...l.windows,{id:`window-${Date.now()}`,face:selectedFace,u:0,v:.55,width:style==="double"?1.7:style==="round"||style==="rose"?1.25:1,height:style==="tall"||style==="arched"?1.7:1.25,style}]}:l))} className="min-w-[105px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">{name}</button>)}</div>}
            {detailCategory==="doors" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{([["wood-arch","Wood Arch"],["stone-arch","Stone Arch"],["grand-arch","Grand Arch"],["double","Double Door"],["carved-stone","Carved Stone"],["metal-gate","Metal Gate"],["single","Single"],["bronze","Bronze"],["temple","Temple"],["portico","Portico"]] as [DoorStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,doors:[...l.doors,{id:`door-${Date.now()}`,face:viewerFace,u:0,width:style==="double"||style==="temple"||style==="portico"||style==="grand-arch"||style==="metal-gate"?1.8:1.1,height:style==="temple"||style==="portico"||style==="grand-arch"?2.5:2,style}]}:l))} className="min-w-[105px] shrink-0 rounded-xl bg-amber-200/20 border border-amber-200/30 p-3 text-xs text-white active:bg-amber-200/40">{name}</button>)}</div>}
            {detailCategory==="trim" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="flex shrink-0 items-center gap-2 px-2 py-2 text-xs text-white/80"><span>Choose wall:</span>{(["front","back","left","right"] as WallFace[]).map(face=><button key={face} onClick={()=>setSelectedFace(face)} className="rounded-lg bg-amber-200 px-3 py-2 font-semibold capitalize text-black">{face}</button>)}<span className="sr-only">Tap a wall, then choose trim.</span></div>}{selectedFace&&([["base","Base"],["crown","Crown"],["dentils","Dentils"],["frieze","Frieze"],["greek-fret","Greek Fret"],["acanthus","Acanthus"],["rosette","Rosette"],["baroque-scroll","Baroque Scroll"],["antefix","Antefix"],["gargoyle","Gargoyle"]] as [TrimStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,trims:[...(l.trims||[]),{id:`trim-${Date.now()}`,face:selectedFace,u:0,style}]}:l))} className="min-w-[110px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">{name}</button>)}</div>}
            {detailCategory==="columns" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="flex shrink-0 items-center gap-2 px-2 py-2 text-xs text-white/80"><span>Choose wall:</span>{(["front","back","left","right"] as WallFace[]).map(face=><button key={face} onClick={()=>setSelectedFace(face)} className="rounded-lg bg-amber-200 px-3 py-2 font-semibold capitalize text-black">{face}</button>)}<span className="sr-only">Tap a wall, then place a column.</span></div>}{selectedFace&&([["doric","Doric"],["ionic","Ionic"],["corinthian","Corinthian"],["composite","Composite"],["tuscan","Tuscan"],["fluted","Fluted"],["square","Square"],["twisted","Twisted"],["gothic","Gothic"],["roman-esque","Romanesque"]] as [ColumnStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,columns:[...(l.columns||[]),{id:`column-${Date.now()}`,face:selectedFace,u:0,style}]}:l))} className="min-w-[110px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">{name}</button>)}</div>}
            {detailCategory==="arches" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="flex shrink-0 items-center gap-2 px-2 py-2 text-xs text-white/80"><span>Choose wall:</span>{(["front","back","left","right"] as WallFace[]).map(face=><button key={face} onClick={()=>setSelectedFace(face)} className="rounded-lg bg-amber-200 px-3 py-2 font-semibold capitalize text-black">{face}</button>)}<span className="sr-only">Tap a wall, then choose an arch profile.</span></div>}{selectedFace&&([["flat","Flat"],["round","Round"],["segmental","Segmental"],["horseshoe","Horseshoe"],["pointed","Pointed"],["three-pointed","Three Pointed"],["pointed-segmental","Pointed Segmental"],["parabolic","Parabolic"],["inflected","Inflected"],["round-rampant","Round Rampant"],["ogee","Ogee"],["oriental","Oriental"],["trefoil","Trefoil"],["pointed-trefoil","Pointed Trefoil"],["three-centered","Three Centered"],["four-centered","Four Centered"],["tudor","Tudor"],["keyhole","Keyhole"],["reverse-ogee","Reverse Ogee"],["cinquefoil","Cinquefoil"],["pointed-cinquefoil","Pointed Cinquefoil"],["multifoil","Multifoil"],["lancet","Lancet"],["venetian","Venetian"],["florentine","Florentine"]] as [ArchStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,arches:[...(l.arches||[]),{id:`arch-${Date.now()}`,face:selectedFace,u:0,style}]}:l))} className="min-w-[120px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">{name}</button>)}</div>}
            {detailCategory==="stairs" && levels[selectedLevel]?.stairs?.length>0 && (
              <div className="flex gap-2 overflow-x-auto px-3 pb-3">
                {levels[selectedLevel].stairs.map((stair,i)=>(
                  <div key={stair.id} className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
                    <span>Stairs {i+1} · {stair.face}</span>
                    <button aria-label="Move stairs left along wall" className="rounded-lg bg-white/15 px-3 py-2" onClick={()=>setLevels(v=>v.map((l,j)=>j===selectedLevel?{...l,stairs:l.stairs.map(t=>t.id===stair.id?{...t,u:Math.max(-.85,Math.round((t.u-.1)*100)/100)}:t)}:l))}>◀</button>
                    <span className="min-w-[35px] text-center">{Math.round(stair.u*100)}%</span>
                    <button aria-label="Move stairs right along wall" className="rounded-lg bg-white/15 px-3 py-2" onClick={()=>setLevels(v=>v.map((l,j)=>j===selectedLevel?{...l,stairs:l.stairs.map(t=>t.id===stair.id?{...t,u:Math.min(.85,Math.round((t.u+.1)*100)/100)}:t)}:l))}>▶</button>
                    <button className="rounded-lg bg-amber-200 px-3 py-2 font-semibold text-black" onClick={()=>setLevels(v=>v.map((l,j)=>j===selectedLevel?{...l,stairs:l.stairs.map(t=>t.id===stair.id?{...t,face:({front:"right",right:"back",back:"left",left:"front"} as Record<WallFace,WallFace>)[t.face],rotation:0}:t)}:l))}>Rotate 90° ↻</button>
                  </div>
                ))}
              </div>
            )}
            {detailCategory==="stairs" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="flex shrink-0 items-center gap-2 px-2 py-2 text-xs text-white/80"><span>Choose wall:</span>{(["front","back","left","right"] as WallFace[]).map(face=><button key={face} onClick={()=>setSelectedFace(face)} className="rounded-lg bg-amber-200 px-3 py-2 font-semibold capitalize text-black">{face}</button>)}<span className="sr-only">Tap the entrance wall, then choose stairs.</span></div>}{selectedFace&&(["straight","wide","curved","spiral","split","corner"] as StairStyle[]).map(style=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,stairs:[...(l.stairs||[]),{id:`stair-${Date.now()}`,face:selectedFace,u:0,style}]}:l))} className="min-w-[105px] shrink-0 rounded-xl bg-white/10 p-3 text-xs capitalize">{style}</button>)}</div>}
            {detailCategory==="pediments" && <div className="flex gap-2 overflow-x-auto px-3 py-3">{!selectedFace&&<div className="flex shrink-0 items-center gap-2 px-2 py-2 text-xs text-white/80"><span>Choose wall:</span>{(["front","back","left","right"] as WallFace[]).map(face=><button key={face} onClick={()=>setSelectedFace(face)} className="rounded-lg bg-amber-200 px-3 py-2 font-semibold capitalize text-black">{face}</button>)}<span className="sr-only">Tap a wall, then choose a pediment.</span></div>}{selectedFace&&([["straight","Straight"],["triangular","Triangular"],["segmental","Segmental"],["broken-triangular","Broken Triangular"],["broken-segmental","Broken Segmental"],["swan-neck","Swan Neck"],["stepped","Stepped"],["ornate","Ornate"]] as [PedimentStyle,string][]).map(([style,name])=><button key={style} onClick={()=>setLevels(v=>v.map((l,i)=>i===selectedLevel?{...l,pediments:[...(l.pediments||[]),{id:`pediment-${Date.now()}`,face:selectedFace,u:0,style}]}:l))} className="min-w-[125px] shrink-0 rounded-xl bg-white/10 p-3 text-xs">{name}</button>)}</div>}
          </div>
        )}
        {panel === "templates" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            {(["Temple of the Sun","Eternal Courtyard","Celestial Shrine","Marble Pantheon","Cathedral of Echoes","Temple of Unity"] as const).map((name,index)=>(
              <button key={name} onClick={()=>{addTemplate(index);setActiveObject("building");}}
                className="min-w-[155px] shrink-0 rounded-2xl border border-amber-200/30 bg-white/10 p-3 text-left">
                <span className="block text-sm font-semibold text-amber-100">{name}</span>
                <span className="mt-1 block text-[11px] text-white/65">Add complete design</span>
              </button>
            ))}
          </div>
        )}
        {panel === "buildings" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            {[["star","5-Point Star"],["circle","Circle"],["six-star","6-Point Star"],["rectangle","Rectangle"],["square","Square"],["wide","Wide Hall"],["l-shape","L Shape"],["t-shape","T Shape"],["u-shape","U Shape"],["cross","Cross"],["octagon","Octagon"],["rotunda","Rotunda"],["courtyard","Courtyard"],["triangle","Triangle"],["hexagon","Hexagon"],["diamond","Diamond"],["oval","Oval"],["horseshoe","Horseshoe"],["x-shape","X Shape"],["ring","Ring"]].map(([id,name])=>(
              <button key={id} onClick={()=>{chooseShape(id as BuildingShape);setActiveObject("building");setPanel(null);}} className="min-w-[118px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
                <div className="mb-2 h-10 rounded-md border-2 border-amber-100/60 bg-amber-100/10"/>
                <div className="text-sm font-medium">{name}</div>
              </button>
            ))}
          </div>
        )}
        {panel === "walls" && wallStep === "main" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            {([["rectangle","Classic"],["circle","Circle"],["octagon","Octagon"],["star","Star"]] as [PerimeterStyle,string][]).map(([style,name])=><button key={style} onClick={()=>{setPerimeter({style,material:"marble",margin:.65,height:1.25,thickness:.16,towerShape:"round",towers:false,gate:false,arches:false,columns:false});setWallStep("features");}} className="min-w-[112px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left"><div className="mb-2 h-9 rounded-md border-2 border-amber-100/60 bg-amber-100/10"/><div className="text-sm font-medium">{name}</div></button>)}
          </div>
        )}
        {panel === "walls" && perimeter && wallStep === "features" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            {([["towers","Towers"],["gate","Gate"],["arches","Arches"],["columns","Columns"]] as [PerimeterFeature,string][]).map(([key,name])=><button key={key} onClick={()=>setPerimeter(p=>p?{...p,[key]:!p[key]}:p)} className={`min-w-[104px] rounded-2xl border p-3 text-left ${perimeter[key]?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}><div className="mb-2 h-9 rounded-md border border-amber-100/40"/><div className="text-sm">{name}</div></button>)}
            <div className="min-w-[150px] shrink-0 rounded-2xl border border-amber-200/30 bg-amber-200/10 p-3 text-xs text-amber-100">Pinch the wall in/out to resize it</div>
            <button onClick={()=>setWallStep("options")} className="min-w-[92px] rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">Style</button>
            <button onClick={()=>setPanel(null)} className="min-w-[72px] rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">Done</button>
          </div>
        )}
        {panel === "walls" && perimeter && wallStep === "options" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            <button onClick={()=>setWallStep("features")} className="min-w-[74px] rounded-2xl bg-white/5 p-3 text-sm">‹ Back</button>
            {(["marble","sandstone","limestone","obsidian"] as BuilderMaterial[]).map(m=><button key={m} onClick={()=>setPerimeter(p=>p?{...p,material:m}:p)} className={`min-w-[100px] rounded-2xl border p-3 text-sm capitalize ${perimeter.material===m?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{m}</button>)}
            {perimeter.towers && (["round","square","octagon","hexagon","star","spire"] as TowerShape[]).map(t=><button key={t} onClick={()=>setPerimeter(p=>p?{...p,towerShape:t}:p)} className={`min-w-[100px] rounded-2xl border p-3 text-sm capitalize ${perimeter.towerShape===t?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{t} tower</button>)}
            <button onClick={()=>setPerimeter(p=>p?{...p,height:Math.max(.75,p.height-.25)}:p)} className="min-w-[88px] rounded-2xl bg-white/5 p-3 text-sm">Shorter</button>
            <button onClick={()=>setPerimeter(p=>p?{...p,height:Math.min(8,p.height+.25)}:p)} className="min-w-[88px] rounded-2xl bg-white/5 p-3 text-sm">Taller</button>
            <button onClick={()=>setPerimeter(p=>p?{...p,thickness:Math.max(.1,p.thickness-.05)}:p)} className="min-w-[88px] rounded-2xl bg-white/5 p-3 text-sm">Thinner</button>
            <button onClick={()=>setPerimeter(p=>p?{...p,thickness:Math.min(.8,p.thickness+.05)}:p)} className="min-w-[88px] rounded-2xl bg-white/5 p-3 text-sm">Thicker</button>
            <button onClick={()=>{setPerimeter(null);setWallStep("main");}} className="min-w-[100px] rounded-2xl bg-red-500/15 p-3 text-sm text-red-200">Remove</button>
          </div>
        )}
        {panel === "scenery" && <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-3">{([["garden","Garden","Green landscape"],["desert","Desert","Warm sandstone"],["twilight","Twilight","Evening light"]] as const).map(([id,name,sub])=><button key={id} aria-pressed={scenery===id} onClick={()=>setScenery(id)} className={`rounded-xl border p-3 text-left ${scenery===id?"border-amber-200 bg-amber-200/20":"border-white/10 bg-white/5"}`}><span className="block text-sm font-semibold">{name}</span><span className="text-[10px] text-white/60">{sub}</span></button>)}</div>}
        {panel === "scenery" && <div className="flex flex-wrap gap-2 border-t border-white/10 p-3">
          {(["tree","garden","path","fountain","pond","rock"] as LandscapeKind[]).map(kind=><button key={kind} className="rounded-lg bg-white/10 px-3 py-2 text-xs capitalize" onClick={()=>setLandscapeItems(v=>[...v,{id:`land-${Date.now()}-${v.length}`,kind,x:4,z:4,scale:1,rotation:0}])}>+ {kind}</button>)}
          {landscapeItems.map(item=><div key={item.id} className="flex w-full flex-wrap items-center gap-2 rounded-xl bg-white/5 p-2 text-xs">
            <span className="capitalize">{item.kind}</span>
            {(["x","z","scale","rotation"] as const).map(axis=><label key={axis}>{axis}<input type="number" aria-label={`${item.kind} ${axis}`} step={axis==="rotation"?15:.25} value={item[axis]} onChange={e=>setLandscapeItems(v=>v.map(q=>q.id===item.id?{...q,[axis]:Number(e.target.value)}:q))} className="ml-1 w-14 rounded bg-white/15 p-1"/></label>)}
            <button onClick={()=>setLandscapeItems(v=>[...v,{...item,id:`land-${Date.now()}`,x:item.x+1}])}>Duplicate</button>
            <button onClick={()=>setLandscapeItems(v=>v.filter(q=>q.id!==item.id))} className="text-red-200">Delete</button>
          </div>)}
        </div>}
        {panel === "site-columns" && (
          <div className="border-t border-white/10 px-3 py-3">
            <p className="mb-2 text-xs text-white/65">Swipe to choose a column. Tap one to add it, then drag it on the site.</p>
            <div className="flex snap-x gap-2 overflow-x-auto pb-2">
              {(["doric","ionic","corinthian","composite","tuscan","fluted","square","twisted","gothic","roman-esque"] as ColumnStyle[]).map(style=><button key={style} onClick={()=>{const id=`site-column-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;setSiteColumns(v=>[...v,{id,style,material:levels[selectedLevel]?.material||"marble",x:(levels[selectedLevel]?.x||0)+3,z:(levels[selectedLevel]?.z||0)+3,height:3.5,radius:.18,rotation:0}]);setSelectedSiteColumnId(id);setActiveObject("column");setPanel("site-columns");}} className="min-w-[112px] snap-start rounded-2xl border border-white/15 bg-white/5 p-3 text-center active:bg-amber-200/20">
                <div className="mx-auto mb-2 flex h-16 items-center justify-center"><div className={`relative h-12 w-3 rounded-t-sm bg-gradient-to-r from-stone-500 via-stone-100 to-stone-400 ${style==="square"?"rounded-none":""}`}><div className="absolute -left-2 -top-2 h-2 w-7 rounded-sm bg-stone-200"/><div className="absolute -left-1 bottom-0 h-1 w-5 bg-stone-300"/></div></div>
                <div className="text-xs capitalize">{style.replace("-"," ")}</div>
              </button>)}
            </div>
            {selectedSiteColumnId && siteColumns.filter(c=>c.id===selectedSiteColumnId).map(c=><div key={c.id} className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-white/10 p-2 text-xs">
              <span className="font-semibold capitalize">{c.style}</span>
              <label>Height <input type="range" min="1" max="10" step=".25" value={c.height} onChange={e=>setSiteColumns(v=>v.map(q=>q.id===c.id?{...q,height:Number(e.target.value)}:q))}/></label>
              <button className="rounded-lg bg-white/15 px-3 py-2" onClick={()=>setSiteColumns(v=>[...v,{...c,id:`site-column-${Date.now()}`,x:c.x+.75}])}>Duplicate</button>
              <button className="rounded-lg bg-red-900/50 px-3 py-2" onClick={()=>{setSiteColumns(v=>v.filter(q=>q.id!==c.id));setSelectedSiteColumnId(null);}}>Delete</button>
              <button className="rounded-lg bg-white/15 px-3 py-2" onClick={()=>setSelectedSiteColumnId(null)}>Done</button>
            </div>)}
            {!selectedSiteColumnId&&siteColumns.length>0&&<div className="flex gap-2 overflow-x-auto py-2">{siteColumns.map((c,i)=><button key={c.id} className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-xs" onClick={()=>setSelectedSiteColumnId(c.id)}>Edit {i+1}</button>)}</div>}
          </div>
        )}
        {panel === "statues" && (
          <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3">
            {!selectedStatueId && ([["guardian","Guardian"],["angel","Angel"],["lion","Lion"]] as [StatueKind,string][]).map(([kind,name])=><button key={kind} onClick={()=>{const id=`statue-${Date.now()}`;setStatues(v=>[...v,{id,kind,finish:"marble",x:3,z:3,rotation:0,scale:1}]);setSelectedStatueId(id);}} className="min-w-[112px] rounded-2xl border border-white/10 bg-white/5 p-3 text-left"><div className="mb-2 h-9 rounded-md border border-amber-100/40"/><div className="text-sm">{name}</div></button>)}
            {selectedStatueId && statues.find(s=>s.id===selectedStatueId) && (()=>{const statue=statues.find(s=>s.id===selectedStatueId)!;return <>
              {(["marble","bronze","gold","obsidian"] as StatueFinish[]).map(f=><button key={f} onClick={()=>setStatues(v=>v.map(s=>s.id===statue.id?{...s,finish:f}:s))} className={`min-w-[96px] rounded-2xl border p-3 text-sm capitalize ${statue.finish===f?"border-amber-200 bg-amber-200/15":"border-white/10 bg-white/5"}`}>{f}</button>)}
              <label className="min-w-[140px] rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">Rotate<input type="range" min="-180" max="180" step="5" value={statue.rotation} onChange={e=>setStatues(v=>v.map(s=>s.id===statue.id?{...s,rotation:Number(e.target.value)}:s))} className="mt-2 w-full"/></label>
              <label className="min-w-[140px] rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">Size<input type="range" min=".5" max="2.5" step=".1" value={statue.scale} onChange={e=>setStatues(v=>v.map(s=>s.id===statue.id?{...s,scale:Number(e.target.value)}:s))} className="mt-2 w-full"/></label>
              <button onClick={()=>{setStatues(v=>[...v,{...statue,id:`statue-${Date.now()}`,x:statue.x+.6,z:statue.z+.6}]);setSelectedStatueId(null);}} className="min-w-[92px] rounded-2xl bg-white/5 p-3 text-sm">Duplicate</button>
              <button onClick={()=>{setStatues(v=>v.filter(s=>s.id!==statue.id));setSelectedStatueId(null);}} className="min-w-[82px] rounded-2xl bg-red-500/15 p-3 text-sm text-red-200">Delete</button>
              <button onClick={()=>setSelectedStatueId(null)} className="min-w-[82px] rounded-2xl bg-white/5 p-3 text-sm">Done</button>
            </>})()}
          </div>
        )}
        {panel && panel !== "buildings" && panel !== "walls" && panel !== "statues" && panel !== "site-columns" && panel !== "scenery" && panel !== "edit" && (
          <div className="border-t border-white/10 px-4 py-4 text-center text-sm text-white/55">
            {panel === "fountains" ? "Place fountains as separate site pieces." :
             panel === "stairs" ? "Place stairs and entrances." :
             "More separate pieces will live here."}
          </div>
        )}
      </div>
    </main>
  );
}
