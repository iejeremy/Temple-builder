import * as THREE from "three";

/** Mineral mottling in vertex colors adds no textures, triangles or draw calls.
 * Equal coordinates get equal colors, including duplicated vertices at seams. */
export function shadeBoulderSurface(geometry:THREE.BufferGeometry){
  const positions=geometry.getAttribute("position"),colors=new Float32Array(positions.count*3);
  geometry.computeBoundingBox();const min=geometry.boundingBox!.min.y,span=Math.max(.001,geometry.boundingBox!.max.y-min);
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const grain=Math.sin(x*19.7+y*13.1+z*31.7)*Math.sin(z*17.3-x*11.9);
    const band=Math.sin(x*6+z*9+Math.sin(y*8)*.7);
    const mineral=.86+grain*.09+Math.max(0,band)*.055,grounding=.89+.11*(y-min)/span;
    colors[i*3]=mineral*grounding;colors[i*3+1]=(mineral+.015)*grounding;colors[i*3+2]=(mineral-.025)*grounding;
  }
  geometry.setAttribute("color",new THREE.BufferAttribute(colors,3));return geometry;
}

/** A shaded stem and a sunlit, slightly drier tip keep instanced blades from
 * reading as identical dark needles. The original positions and picking remain intact. */
export function shadeGrassSurface(geometry:THREE.BufferGeometry){
  const positions=geometry.getAttribute("position"),colors=new Float32Array(positions.count*3);
  geometry.computeBoundingBox();const min=geometry.boundingBox!.min.y,span=Math.max(.001,geometry.boundingBox!.max.y-min);
  for(let i=0;i<positions.count;i++){
    const t=(positions.getY(i)-min)/span;
    colors[i*3]=.54+t*.5;colors[i*3+1]=.61+t*.47;colors[i*3+2]=.43+t*.38;
  }
  geometry.setAttribute("color",new THREE.BufferAttribute(colors,3));return geometry;
}
