import * as THREE from "three";
import { addSceneryTree } from "./sceneryTrees";
import { addNaturalScenery } from "./naturalScenery";
import { contactShadowTexture } from "./naturalLighting";
import { waterGeometry, bankGeometry, createWaterMaterials, rippleGeometry } from "./sceneryWater";
import { shadeBoulderSurface, shadeGrassSurface } from "./scenerySurfaces";

const random=(n:number)=>{const x=Math.sin(n*127.1+41.7)*43758.5453;return x-Math.floor(x);};
type Course={curve:THREE.CatmullRomCurve3;width:number;bank:THREE.Mesh;water:THREE.Mesh};
/** Decorative environment only: never participates in selection, saving or camera fitting. */
export function createEnvironmentLandscape(){
  const root=new THREE.Group();root.name="environment-landscape";
  const contactMap=contactShadowTexture();
  const contactMaterial=new THREE.MeshBasicMaterial({color:0x27281d,map:contactMap,transparent:true,opacity:.28,depthWrite:false});
  const contactGeometry=new THREE.PlaneGeometry(1,1);contactGeometry.rotateX(-Math.PI/2);
  const treeContacts=new THREE.InstancedMesh(contactGeometry,contactMaterial,54),rockContacts=new THREE.InstancedMesh(contactGeometry,contactMaterial,64);
  treeContacts.name="tree-contact-shadows";rockContacts.name="rock-contact-shadows";root.add(treeContacts,rockContacts);
  const woodland=new THREE.Group();woodland.name="environment-trees";root.add(woodland);
  for(let i=0;i<54;i++){
    const tree=addSceneryTree(new THREE.Group(),(["broadleaf","broadleaf","pine","cypress"] as const)[i%4],i*101+1);
    tree.rotation.y=random(i+91)*Math.PI*2;tree.scale.setScalar(.74+random(i+51)*.6);woodland.add(tree);
  }
  const stoneMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,vertexColors:true});
  const rocks=new THREE.InstancedMesh(shadeBoulderSurface(new THREE.IcosahedronGeometry(1,1)),stoneMaterial,64);rocks.name="environment-boulders";rocks.castShadow=true;rocks.receiveShadow=true;root.add(rocks);
  const blade=new THREE.BufferGeometry();blade.setAttribute("position",new THREE.Float32BufferAttribute([-.035,0,0,.035,0,0,.075,.45,.025],3));blade.computeVertexNormals();
  shadeGrassSurface(blade);
  const grass=new THREE.InstancedMesh(blade,new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide,vertexColors:true}),5600);grass.name="environment-grass";grass.receiveShadow=true;root.add(grass);
  const hillSource=new THREE.Group();addNaturalScenery(hillSource,{id:"environment-hill",kind:"hill",x:0,z:0,scale:1,rotation:0});
  const hillMesh=hillSource.children[0] as THREE.Mesh;
  const hills=new THREE.InstancedMesh(hillMesh.geometry,hillMesh.material,8);hills.name="environment-near-hills";hills.receiveShadow=true;root.add(hills);
  const waterMaterials=createWaterMaterials(),bankMaterial=waterMaterials.bank,waterMaterial=waterMaterials.water;
  const courses:Course[]=[];
  for(const width of [2.6,1.05]){
    const bank=new THREE.Mesh(new THREE.BufferGeometry(),bankMaterial),water=new THREE.Mesh(new THREE.BufferGeometry(),waterMaterial);
    bank.receiveShadow=true;water.receiveShadow=true;root.add(bank,water);
    courses.push({curve:new THREE.CatmullRomCurve3(),width,bank,water});
  }
  courses[0].water.name="environment-river";courses[1].water.name="environment-creek";
  const ripples=new THREE.InstancedMesh(rippleGeometry(),waterMaterials.ripple,44);root.add(ripples);
  const dummy=new THREE.Object3D(),color=new THREE.Color();let lastLayout="";
  const setBounds=(bounds:THREE.Box3)=>{
    const center=bounds.isEmpty()?new THREE.Vector3():bounds.getCenter(new THREE.Vector3());
    const size=bounds.isEmpty()?new THREE.Vector3(10,0,10):bounds.getSize(new THREE.Vector3());
    // Leave the entire editable site and its perimeter flat, open and unobstructed.
    const hx=Math.max(5,size.x/2)+2,hz=Math.max(5,size.z/2)+2;
    root.position.set(center.x,0,center.z);
    const key=`${hx.toFixed(2)},${hz.toFixed(2)}`;if(key===lastLayout)return;lastLayout=key;
    root.userData.clearing={hx,hz};
    const point=(i:number,clearance:number,spread:number)=>{
      const side=i%4,along=random(i*13+7)*2-1,out=clearance+random(i*13+9)*spread;
      return new THREE.Vector3(side<2?(side===0?-1:1)*(hx+out):along*(hx+spread),0,side<2?along*(hz+spread):(side===2?-1:1)*(hz+out));
    };
    const junction=new THREE.Vector3(-hx-5,0,hz+3.5);
    courses[0].curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-hx-8,0,-58),new THREE.Vector3(-hx-5,0,-28),new THREE.Vector3(-hx-6,0,-8),junction,new THREE.Vector3(-hx-9,0,hz+28),new THREE.Vector3(-hx-7,0,hz+54)]);
    courses[1].curve=new THREE.CatmullRomCurve3([junction,new THREE.Vector3(-hx-1,0,hz+3),new THREE.Vector3(3,0,hz+4),new THREE.Vector3(hx+17,0,hz+3),new THREE.Vector3(hx+35,0,hz+18)]);
    for(const [index,course] of courses.entries()){course.bank.geometry.dispose();course.water.geometry.dispose();course.bank.geometry=bankGeometry(course.curve,course.width,.035+index*.003);course.water.geometry=waterGeometry(course.curve,course.width,.065+index*.003);}
    const wetSamples=courses.map(c=>({points:c.curve.getPoints(128),width:c.width}));
    // Distance to the sampled segments, rather than just their endpoints. This
    // keeps dry vegetation out of the water even on long or enlarged sites.
    // Only habitats within five units of a bank need a distance: spatial cells
    // avoid scanning both complete courses for every blade after a site edit.
    type BankSegment={x:number;z:number;dx:number;dz:number;inverseLength:number;halfWidth:number};
    const cells=new Map<string,BankSegment[]>(),segments:BankSegment[]=[],cellSize=6;
    for(const c of wetSamples)for(let i=1;i<c.points.length;i++){
      const a=c.points[i-1],b=c.points[i],dx=b.x-a.x,dz=b.z-a.z,padding=c.width*.5+5;
      const segment={x:a.x,z:a.z,dx,dz,inverseLength:1/(dx*dx+dz*dz||1),halfWidth:c.width*.5};
      segments.push(segment);
      for(let x=Math.floor((Math.min(a.x,b.x)-padding)/cellSize);x<=Math.floor((Math.max(a.x,b.x)+padding)/cellSize);x++)
        for(let z=Math.floor((Math.min(a.z,b.z)-padding)/cellSize);z<=Math.floor((Math.max(a.z,b.z)+padding)/cellSize);z++){
          const key=`${x},${z}`,list=cells.get(key);if(list)list.push(segment);else cells.set(key,[segment]);
        }
    }
    const bankDistance=(p:THREE.Vector3,fullCourse=false)=>{
      let distance=Infinity;
      for(const s of fullCourse?segments:cells.get(`${Math.floor(p.x/cellSize)},${Math.floor(p.z/cellSize)}`)||[]){
        const t=THREE.MathUtils.clamp(((p.x-s.x)*s.dx+(p.z-s.z)*s.dz)*s.inverseLength,0,1);
        distance=Math.min(distance,Math.hypot(p.x-s.x-s.dx*t,p.z-s.z-s.dz*t)-s.halfWidth);
      }
      return distance;
    };
    const outsideClearing=(p:THREE.Vector3,padding:number)=>{
      if(Math.abs(p.x)<hx+padding&&Math.abs(p.z)<hz+padding){
        if(hx+padding-Math.abs(p.x)<hz+padding-Math.abs(p.z))p.x=(p.x<0?-1:1)*(hx+padding);
        else p.z=(p.z<0?-1:1)*(hz+padding);
      }
      return p;
    };
    const groves=Array.from({length:9},(_,i)=>point(i+400,7,19));
    const occupied:THREE.Vector3[]=[];
    woodland.children.forEach((tree,i)=>{
      // Six differently sized trees per loose grove, with air between crowns.
      const grove=groves[Math.floor(i/6)],scale=.66+random(i+51)*.7;
      let p=grove.clone(),placed=false;
      for(let attempt=0;attempt<24;attempt++){
        const angle=random(i*31+attempt*13+12)*Math.PI*2,r=Math.sqrt(random(i*23+attempt*17+15))*(3.8+attempt*.2);
        p=outsideClearing(new THREE.Vector3(grove.x+Math.cos(angle)*r,0,grove.z+Math.sin(angle)*r),2.5);
        if(bankDistance(p)>2.2&&occupied.every(q=>q.distanceToSquared(p)>4)){placed=true;break;}
      }
      tree.scale.setScalar(scale);tree.position.copy(p);tree.visible=placed;if(placed)occupied.push(p);
      dummy.position.set(p.x,.018,p.z);dummy.rotation.set(0,tree.rotation.y,0);dummy.scale.setScalar(tree.visible?tree.scale.x*1.65:0);dummy.updateMatrix();treeContacts.setMatrixAt(i,dummy.matrix);
    });
    const rockPositions:THREE.Vector3[]=[];
    for(let i=0;i<64;i++){
      const cluster=Math.floor((i-32)/4),scale=.22+Math.pow(random(i+19),1.4)*1.02;
      let p=point(cluster+72,3,16);
      if(i<32){
        const c=courses[i%2],t=(Math.floor(i/4)+.18+random(i+401)*.6)/8;p=c.curve.getPoint(t);const tangent=c.curve.getTangent(t);
        p.add(new THREE.Vector3(tangent.z,0,-tangent.x).multiplyScalar((Math.floor(i/2)%2?1:-1)*(c.width*.5+.5+scale*.7)));
      }else{
        const a=random(i+12)*Math.PI*2,r=Math.sqrt(random(i+15))*1.7;p.x+=Math.cos(a)*r;p.z+=Math.sin(a)*r;
      }
      outsideClearing(p,scale*1.6+.25);
      rockPositions.push(p);
      dummy.position.copy(p);dummy.position.y=scale*(.18+random(i+56)*.15);dummy.rotation.set(random(i)*.5,random(i+6)*6.28,random(i+7)*.4);dummy.scale.set(scale*1.3,scale*.65,scale);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
      color.setHSL(.12+random(i+20)*.05,.07, .38+random(i+3)*.17-(bankDistance(p)<1.5?.055:0)).convertSRGBToLinear();rocks.setColorAt(i,color);
      dummy.position.set(p.x,.019,p.z);dummy.rotation.set(0,random(i+6)*6.28,0);dummy.scale.set(scale*2,1,scale*1.6);dummy.updateMatrix();rockContacts.setMatrixAt(i,dummy.matrix);
    }
    // Generate patch centers once; individual blades reuse their local habitat.
    const patches=Array.from({length:80},(_,cluster)=>{
      let p=point(cluster+210,1.5,17);
      if(cluster<40){
        const c=courses[cluster%2],t=(Math.floor(cluster/2)+.2+random(cluster+840)*.6)/20;
        p=c.curve.getPoint(t);const d=c.curve.getTangent(t);
        p.add(new THREE.Vector3(d.z,0,-d.x).multiplyScalar((Math.floor(cluster/2)%2?1:-1)*(c.width*.5+1+random(cluster+850)*1.6)));
      }
      return p;
    });
    for(let i=0;i<5600;i++){
      // Half the patches follow banks; the rest leave dry, open soil between groves.
      const cluster=Math.floor(i/70),p=patches[cluster].clone(),a=random(i+12)*6.28,patchRadius=.8+random(cluster+901)*1.6;
      const r=Math.sqrt(random(i+15))*patchRadius;
      p.x+=Math.cos(a)*r;p.z+=Math.sin(a)*r;
      const distance=bankDistance(p),moisture=THREE.MathUtils.clamp(1-distance/5,0,1);
      const hidden=(Math.abs(p.x)<hx+.45&&Math.abs(p.z)<hz+.45)||distance<.35||random(i+607)>.96-r/patchRadius*.23;
      dummy.position.copy(p);dummy.position.y=.015;dummy.rotation.set(0,random(i+8)*6.28,0);
      const height=.38+random(i+18)*(.65+moisture*.9);
      dummy.scale.set(hidden?0:.65+random(i+71)*.55,hidden?0:height,hidden?0:1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
      color.setHSL(.19+moisture*.045+random(i+4)*.045,.25+moisture*.12,.34+random(i+11)*.12-moisture*.035).convertSRGBToLinear();grass.setColorAt(i,color);
    }
    for(let i=0;i<8;i++){
      const sx=1.8+random(i)*1.1,sz=1.6+random(i+9),radius=4*Math.max(sx,sz);
      let p=point(i+302,16,16);
      // Keep the flat watercourses and grounded grove/rock assets uncovered.
      for(let attempt=0;attempt<24;attempt++){
        p=point(i+302+attempt*8,16+attempt*2,16);
        if(bankDistance(p,true)>radius+.5&&occupied.every(q=>q.distanceTo(p)>radius+2.2)&&rockPositions.every(q=>q.distanceTo(p)>radius+1.5))break;
      }
      dummy.position.copy(p);dummy.rotation.set(0,random(i+6)*6.28,0);dummy.scale.set(sx,.45+random(i+3)*.55,sz);dummy.updateMatrix();hills.setMatrixAt(i,dummy.matrix);
    }
    for(let i=0;i<44;i++){
      const c=courses[i%2],t=(Math.floor(i/2)+.5)/22,p=c.curve.getPoint(t),d=c.curve.getTangent(t);
      dummy.position.set(p.x,.075,p.z);dummy.rotation.set(0,Math.atan2(-d.x,d.z),0);dummy.scale.set(c.width*(.22+random(i)*.28),1,1);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix);
    }
    for(const mesh of [rocks,grass,hills,ripples,treeContacts,rockContacts]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
  };
  const setTheme=(theme:"garden"|"desert"|"twilight")=>{
    woodland.visible=theme!=="desert";treeContacts.visible=woodland.visible;grass.visible=theme!=="desert";
    for(const c of courses){c.bank.visible=theme!=="desert";c.water.visible=theme!=="desert";}ripples.visible=theme!=="desert";
    waterMaterial.color.setHex(theme==="twilight"?0xc5d0de:0xffffff);
    (hills.material as THREE.MeshStandardMaterial).color.setHex(theme==="desert"?0xd5b78a:0xffffff);
  };
  setBounds(new THREE.Box3());return {root,setBounds,setTheme,dispose(){contactMap.dispose();}};
}
