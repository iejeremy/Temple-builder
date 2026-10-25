import * as THREE from "three";

/** Apply a consistent texture size without moving vertices, changing bounds or picking.
 * Flat faces use local physical distances; curved primitives keep their continuous UVs.
 * Each cached geometry is processed once, independently of the camera and saved model. */
export function finishArchitecturalSurfaces(root:THREE.Object3D){
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh)return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    if(!materials.some(m=>m.userData.architecturalSurface))return;
    const geometry=object.geometry;
    if(geometry.userData.architecturalSurface)return;
    const positions=geometry.getAttribute("position"),normals=geometry.getAttribute("normal");
    if(!positions||!normals)return;
    const tileSize=2.4,uv=new Float32Array(positions.count*2);
    const planar=geometry.type==="BoxGeometry"||geometry.type==="ExtrudeGeometry"||geometry.type==="BufferGeometry";
    if(planar){
      object.updateMatrix();
      const point=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3().getNormalMatrix(object.matrix);
      for(let i=0;i<positions.count;i++){
        point.fromBufferAttribute(positions,i).applyMatrix4(object.matrix);
        normal.fromBufferAttribute(normals,i).applyMatrix3(normalMatrix);
        const ax=Math.abs(normal.x),ay=Math.abs(normal.y),az=Math.abs(normal.z);
        uv[i*2]=(ay>ax&&ay>az?point.x:ax>az?point.z:point.x)/tileSize;
        uv[i*2+1]=(ay>ax&&ay>az?point.z:point.y)/tileSize;
      }
    }else{
      const original=geometry.getAttribute("uv");if(!original)return;
      geometry.computeBoundingBox();const size=geometry.boundingBox!.getSize(new THREE.Vector3());
      const horizontal=Math.max(size.x,size.z)*Math.PI/tileSize,vertical=Math.max(size.y,.01)/tileSize;
      for(let i=0;i<positions.count;i++){uv[i*2]=original.getX(i)*horizontal;uv[i*2+1]=original.getY(i)*vertical;}
    }
    geometry.setAttribute("uv",new THREE.BufferAttribute(uv,2));
    geometry.userData.architecturalSurface=true;
  });
}
