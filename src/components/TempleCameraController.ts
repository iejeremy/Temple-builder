import * as THREE from "three";

export type TempleView = "temple" | "site" | "front" | "plan" | "landscape";

/** The only owner of camera transforms, viewport projection and navigation limits. */
export class TempleCameraController {
  orbit={theta:0,phi:1.22,radius:30,lastX:0,lastY:0,dragging:false,pinch:0};
  pan={x:0,y:0,z:0,manual:false};
  focus={x:0,z:0};
  targetY=.6;
  focusedBuildingId:string|null=null;
  fit={initialized:false,lastSpan:0,fitRadius:30,buildingCount:0,userFramed:false};
  allBounds=new THREE.Box3();
  selectedBounds=new THREE.Box3();
  siteBounds=new THREE.Box3();
  allRadius=0;
  selectedRadius=0;
  viewport={width:1,height:1,top:0,bottom:0};
  private readonly target=new THREE.Vector3();
  private readonly offset=new THREE.Vector3();
  private readonly spherical=new THREE.Spherical();
  private readonly displayedTarget=new THREE.Vector3();
  private initialized=false;

  distance(radius:number,camera:THREE.PerspectiveCamera){
    const {width,height,top,bottom}=this.viewport;
    const fullHeight=height+top+bottom;
    const usableHeight=Math.max(24,height-top-bottom);
    const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2);
    const half=Math.atan(tangent*Math.min(width,usableHeight)/fullHeight);
    return Math.max(5,Math.max(.1,radius)/Math.sin(half)*1.12);
  }

  clamp(radius:number){
    return THREE.MathUtils.clamp(Number.isFinite(radius)?radius:30,1.5,Math.max(65,this.fit.fitRadius*3));
  }

  apply(camera:THREE.PerspectiveCamera,smooth=false,delta=1/60){
    const o=this.orbit;
    o.phi=THREE.MathUtils.clamp(o.phi,.16,Math.PI/2-.06);
    o.radius=this.clamp(o.radius);
    // Panning and zooming obey the ground constraint as well as orbiting.
    this.pan.y=Math.max(.08-this.targetY,this.pan.y);
    this.target.set(this.focus.x+this.pan.x,this.targetY+this.pan.y,this.focus.z+this.pan.z);
    this.offset.setFromSpherical(this.spherical.set(o.radius,o.phi,o.theta));
    const destination=this.offset.add(this.target);
    const alpha=1-Math.exp(-20*Math.min(.05,Math.max(.001,delta)));
    const settling=smooth&&this.initialized&&(camera.position.distanceToSquared(destination)+this.displayedTarget.distanceToSquared(this.target)>1e-6);
    if(settling){camera.position.lerp(destination,alpha);this.displayedTarget.lerp(this.target,alpha);}
    else{camera.position.copy(destination);this.displayedTarget.copy(this.target);}
    this.initialized=true;
    camera.up.set(0,1,0);camera.lookAt(this.displayedTarget);camera.updateMatrixWorld(true);
    return settling;
  }

  /** Follow structural changes to the building already framed, without zooming
   * or switching focus merely because a different object was selected. */
  followBuilding(owner:string,bounds:THREE.Box3){
    if(owner!==this.focusedBuildingId||bounds.isEmpty())return false;
    const center=bounds.getCenter(new THREE.Vector3());
    if(this.focus.x===center.x&&this.focus.z===center.z&&this.targetY===center.y)return false;
    this.focus={x:center.x,z:center.z};this.targetY=center.y;
    return true;
  }

  center(camera:THREE.PerspectiveCamera,view:TempleView="temple",buildingId:string|null=null){
    const scenic=view==="landscape",site=view==="site"||scenic;
    this.focusedBuildingId=site?null:buildingId;
    let bounds=site&&!this.siteBounds.isEmpty()?this.siteBounds:!this.selectedBounds.isEmpty()?this.selectedBounds:this.allBounds;
    if(scenic){
      bounds=bounds.isEmpty()?new THREE.Box3(new THREE.Vector3(-5,0,-5),new THREE.Vector3(5,4,5)):bounds.clone();
      bounds.expandByVector(new THREE.Vector3(10,0,10));
    }
    this.pan={x:0,y:0,z:0,manual:false};
    if(bounds.isEmpty()){
      this.focus={x:0,z:0};this.targetY=.6;this.orbit.radius=this.fit.fitRadius=30;
    }else{
      const center=bounds.getCenter(new THREE.Vector3());
      this.focus={x:center.x,z:center.z};this.targetY=center.y;
      const radius=site?bounds.getBoundingSphere(new THREE.Sphere()).radius:!this.selectedBounds.isEmpty()?this.selectedRadius:this.allRadius;
      this.orbit.radius=this.fit.fitRadius=this.distance(radius,camera);
    }
    this.orbit.theta=view==="front"?0:Math.PI/8;
    this.orbit.phi=view==="plan"?.16:view==="front"?1.4:1.22;
    this.fit.userFramed=false;
    this.apply(camera);
  }

  resize(camera:THREE.PerspectiveCamera,width:number,height:number,top:number,bottom:number){
    width=Math.max(1,width);height=Math.max(1,height);
    // Respect measured overlays in short landscape viewports as well. A fixed
    // percentage cap can put the optical center below the actual usable area.
    bottom=Math.max(0,Math.min(bottom,Math.max(0,height-24)));
    top=Math.max(0,Math.min(top,Math.max(0,height-bottom-24)));
    this.viewport={width,height,top,bottom};
    camera.setViewOffset(width,height+top+bottom,0,bottom,width,height);
    camera.updateProjectionMatrix();
  }
}
