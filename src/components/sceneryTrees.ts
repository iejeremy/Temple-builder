import * as THREE from "three";

export type TreeStyle = "broadleaf" | "pine" | "cypress";
const random=(n:number)=>{const x=Math.sin(n*127.1+78.233)*43758.5453;return x-Math.floor(x);};

// Approved foliage: small, numerous individual leaves, never large canopy blobs.
const leafColors=[0x42683d,0x54753e,0x365b46,0x698049,0x7c8650,0x315b40];

/** Two draw calls per tree: tapered timber and hundreds of fine instanced leaves. */
export function addSceneryTree(group:THREE.Group,style:TreeStyle="broadleaf",seed=1){
  group.userData.treeStyle=style;
  const timber=new THREE.InstancedMesh(new THREE.CylinderGeometry(.6,1,1,7),new THREE.MeshStandardMaterial({color:0x66513b,roughness:1}),style==="broadleaf"?9:5);
  const leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.94}),style==="broadleaf"?360:style==="pine"?320:340);
  const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),color=new THREE.Color();
  const branch=(i:number,start:THREE.Vector3,end:THREE.Vector3,radius:number)=>{
    const direction=end.clone().sub(start);dummy.position.copy(start).add(end).multiplyScalar(.5);
    dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());dummy.scale.set(radius,direction.length(),radius);dummy.updateMatrix();timber.setMatrixAt(i,dummy.matrix);
  };
  branch(0,new THREE.Vector3(),new THREE.Vector3(.08,style==="cypress"?4.3:3.1,-.05),.2);
  for(let i=1;i<timber.count;i++){
    const angle=i*2.4+seed,reach=style==="broadleaf"?1.12:.48;
    branch(i,new THREE.Vector3(0,1.5+i*.13,0),new THREE.Vector3(Math.cos(angle)*reach,2.7+random(seed+i)*.65,Math.sin(angle)*reach),.075);
  }
  for(let i=0;i<leaves.count;i++){
    const a=random(seed+i*11)*Math.PI*2,r=Math.sqrt(random(seed+i*11+1)),v=random(seed+i*11+2);
    let x:number,y:number,z:number,sx:number,sy:number,sz:number;
    if(style==="broadleaf"){
      const layer=(v-.5)*2,taper=Math.sqrt(1-layer*layer);
      const lobe=1+.13*Math.sin(a*5+seed);
      x=Math.cos(a)*r*1.4*taper*lobe;y=3.25+layer*.9;z=Math.sin(a)*r*1.25*taper*lobe;
      sx=.085+random(seed+i*7)*.055;sy=sx*1.3;sz=sx*.7;
    }else if(style==="pine"){
      const height=v*2.8,angle=i*2.4+seed,reach=(1-height/3.25)*(.3+r*.85);
      x=Math.cos(angle)*reach;y=1.5+height;z=Math.sin(angle)*reach;
      sx=.075+random(seed+i*7)*.05;sy=sx*1.4;sz=sx*.7;
    }else{
      const layer=(v-.5)*2,taper=Math.sqrt(1-layer*layer);
      x=Math.cos(a)*r*.48*taper;y=3.2+layer*1.65;z=Math.sin(a)*r*.48*taper;
      sx=.06+random(seed+i*7)*.04;sy=sx*1.65;sz=sx*.7;
    }
    dummy.position.set(x,y,z);dummy.rotation.set(random(i+seed)*Math.PI*2,a,random(i+seed+8)*Math.PI*2);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
    color.setHex(leafColors[i%leafColors.length]);leaves.setColorAt(i,color);
  }
  for(const mesh of [timber,leaves]){mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
  return group;
}
