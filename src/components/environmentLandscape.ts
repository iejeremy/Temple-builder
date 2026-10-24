import * as THREE from "three";
import { addSceneryTree } from "./sceneryTrees";
import { addNaturalScenery } from "./naturalScenery";
import { contactShadowTexture } from "./naturalLighting";
import { waterGeometry, bankGeometry, createWaterMaterials, rippleGeometry } from "./sceneryWater";

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
  const stoneMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
  const rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),stoneMaterial,64);rocks.name="environment-boulders";rocks.castShadow=true;rocks.receiveShadow=true;root.add(rocks);
  const blade=new THREE.BufferGeometry();blade.setAttribute("position",new THREE.Float32BufferAttribute([-.035,0,0,.035,0,0,.075,.45,.025],3));blade.computeVertexNormals();
  const grass=new THREE.InstancedMesh(blade,new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,side:THREE.DoubleSide}),5600);grass.name="environment-grass";grass.receiveShadow=true;root.add(grass);
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
    const wetSamples=courses.map(c=>({points:c.curve.getPoints(100),width:c.width}));
    const wet=(p:THREE.Vector3,extra:number)=>wetSamples.some(c=>c.points.some(q=>q.distanceToSquared(p)<Math.pow(c.width*.5+extra,2)));
    woodland.children.forEach((tree,i)=>{
      let p=point(i,4,17);if(wet(p,2))p=point(i+102,6,19);tree.position.copy(p);tree.visible=!wet(p,2);
      dummy.position.set(p.x,.018,p.z);dummy.rotation.set(0,tree.rotation.y,0);dummy.scale.setScalar(tree.visible?tree.scale.x*1.65:0);dummy.updateMatrix();treeContacts.setMatrixAt(i,dummy.matrix);
    });
    for(let i=0;i<64;i++){
      let p=point(i+72,2,15);
      if(i<32){const c=courses[i%2],t=(Math.floor(i/2)+.5)/16;p=c.curve.getPoint(t);const tangent=c.curve.getTangent(t);p.add(new THREE.Vector3(tangent.z,0,-tangent.x).multiplyScalar((i%3?1:-1)*(c.width*.5+.6)));}
      const scale=.26+random(i+19)*.9;dummy.position.copy(p);dummy.position.y=scale*.7;dummy.rotation.set(random(i)*.3,random(i+6)*6.28,random(i+7)*.25);dummy.scale.set(scale*1.3,scale*.65,scale);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
      color.setHSL(.12+random(i+20)*.05,.07,.3+random(i+3)*.19).convertSRGBToLinear();rocks.setColorAt(i,color);
      dummy.position.set(p.x,.019,p.z);dummy.rotation.set(0,random(i+6)*6.28,0);dummy.scale.set(scale*2,1,scale*1.6);dummy.updateMatrix();rockContacts.setMatrixAt(i,dummy.matrix);
    }
    for(let i=0;i<5600;i++){
      // Small clumps leave open soil between patches instead of carpeting the whole site.
      const cluster=Math.floor(i/70),p=point(cluster+210,1.5,17),a=random(i+12)*6.28,r=Math.sqrt(random(i+15))*1.8;
      p.x+=Math.cos(a)*r;p.z+=Math.sin(a)*r;
      const hidden=(Math.abs(p.x)<hx+.35&&Math.abs(p.z)<hz+.35)||wet(p,.2);
      dummy.position.copy(p);dummy.position.y=.015;dummy.rotation.set(0,random(i+8)*6.28,0);dummy.scale.setScalar(hidden?0:.4+random(i+18)*1.2);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
      color.setHSL(.21+random(i+4)*.09,.3,.2+random(i+11)*.16).convertSRGBToLinear();grass.setColorAt(i,color);
    }
    for(let i=0;i<8;i++){
      const p=point(i+302,15,16);dummy.position.copy(p);dummy.rotation.set(0,random(i+6)*6.28,0);dummy.scale.set(1.5+random(i)*1.2,.7+random(i+3),1.4+random(i+9));dummy.updateMatrix();hills.setMatrixAt(i,dummy.matrix);
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
