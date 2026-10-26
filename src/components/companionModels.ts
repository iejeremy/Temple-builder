import * as THREE from 'three';
export type CompanionStyle = 'dog' | 'cat' | 'rabbit' | 'fox' | 'bird' | 'tortoise';
/** Small original procedural models. Local geometry only; no camera or gesture state. */
export function addCompanion(parent: THREE.Group, style: CompanionStyle = 'dog') {
  const colors = { dog: 0x9b7956, cat: 0x8c8780, rabbit: 0xc7bdb0, fox: 0xb96335, bird: 0x839eaa, tortoise: 0x637548 };
  const coat = new THREE.MeshStandardMaterial({ color: colors[style], roughness: .88 }), dark = new THREE.MeshStandardMaterial({ color: 0x292a26, roughness: .5 });
  const sphere = (x:number,y:number,z:number,sx:number,sy:number,sz:number,material=coat) => { const mesh = new THREE.Mesh(new THREE.SphereGeometry(1,12,8),material); mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh; };
  const bodyY = style === 'bird' ? .43 : style === 'tortoise' ? .22 : .4;
  sphere(0,bodyY,0,style==='tortoise'?.42:.24,style==='tortoise'?.19:.28,style==='bird'?.24:.45);
  const headY = style==='tortoise'?.22:style==='bird'?.72:.66, headZ = style==='tortoise'?.48:.39;
  sphere(0,headY,headZ,.19,.19,.21);
  for(const side of [-1,1]) sphere(side*.105,headY+.055,headZ+.17,.025,.03,.025,dark);
  if(style==='bird') {
    for(const side of [-1,1]) {const wing=sphere(side*.23,.48,-.03,.065,.2,.27);wing.rotation.z=side*.25;}
    const beak=new THREE.Mesh(new THREE.ConeGeometry(.07,.2,6),new THREE.MeshStandardMaterial({color:0xc5a268}));beak.rotation.x=Math.PI/2;beak.position.set(0,.7,.66);parent.add(beak);
  } else if(style!=='tortoise') {
    for(const side of [-1,1]) {const ear=sphere(side*.13,style==='rabbit'?1:.84,.36,.07,style==='rabbit'?.25:.15,.055);ear.rotation.z=side*.18;}
    const tail=sphere(0,.48,-.51,style==='fox'?.12:.065,style==='cat'?.3:.09,style==='fox'?.29:.13);tail.rotation.x=-.35;
    sphere(0,.59,.6,.045,.035,.045,dark);
  }
  for(const x of [-.16,.16])for(const z of [-.25,.25])sphere(x,style==='tortoise'?.075:.15,z,.075,style==='tortoise'?.075:.15,.1);
  parent.userData.companionStyle=style;
}
