import * as THREE from "three";

/** Single owner of camera state and projection. Scene meshes and picking stay in the preview. */
export class TempleCameraController {
  orbit={theta:0,phi:0.90,radius:30,lastX:0,lastY:0,dragging:false,pinch:0};
  pan={x:0,y:0,z:0,manual:false};
  focus={x:0,z:0};
  targetY=0.6;
  fit={initialized:false,lastSpan:0,fitRadius:13,buildingCount:0,userFramed:false};
  allBounds=new THREE.Box3();
  selectedBounds=new THREE.Box3();
  allRadius=0;
  selectedRadius=0;

  distance(radius:number,camera:THREE.PerspectiveCamera){
    const virtualHeight=camera.view?.fullHeight||1;
    const visibleHeight=camera.view?.height||virtualHeight;
    const halfV=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*visibleHeight/virtualHeight);
    const halfH=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect);
    const half=Math.atan(Math.tan(Math.min(halfV,halfH))*.75);
    return Math.max(5,radius/Math.sin(half)*1.38);
  }

  clamp(radius:number){
    return THREE.MathUtils.clamp(radius,Math.max(2,this.fit.fitRadius*.18),Math.max(45,this.fit.fitRadius*3));
  }

  apply(camera:THREE.PerspectiveCamera){
    const {theta,phi,radius}=this.orbit;
    const target=new THREE.Vector3(this.focus.x+this.pan.x,this.targetY+this.pan.y,this.focus.z+this.pan.z);
    camera.position.set(target.x+Math.sin(theta)*Math.sin(phi)*radius,target.y+Math.cos(phi)*radius,target.z+Math.cos(theta)*Math.sin(phi)*radius);
    camera.up.set(0,1,0);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
  }

  center(camera:THREE.PerspectiveCamera){
    const selected=!this.selectedBounds.isEmpty();
    const bounds=selected?this.selectedBounds:this.allBounds;
    this.pan={x:0,y:0,z:0,manual:false};
    if(bounds.isEmpty()){
      this.focus={x:0,z:0};this.targetY=.6;
      this.orbit.radius=this.fit.fitRadius=30;
      return;
    }
    const center=bounds.getCenter(new THREE.Vector3());
    this.focus={x:center.x,z:center.z};this.targetY=center.y;
    this.orbit.radius=this.fit.fitRadius=this.distance(selected?this.selectedRadius:this.allRadius,camera);
  }

  resize(camera:THREE.PerspectiveCamera,width:number,height:number,top:number,bottom:number){
    const virtualHeight=height+top+bottom;
    camera.aspect=width/virtualHeight;
    camera.setViewOffset(width,virtualHeight,0,bottom,width,height);
    camera.updateProjectionMatrix();
  }
}
