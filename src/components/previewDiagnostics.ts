import type * as THREE from "three";

/** Opt-in read-only counters. No render hook, animation loop, camera mutation,
 * scene helpers, picking targets, or persistence changes. */
export function attachPreviewDiagnostics(host:HTMLElement,renderer:THREE.WebGLRenderer){
  if(new URLSearchParams(window.location.search).get("diagnostics")!=="1")return ()=>{};
  const panel=document.createElement("output");
  panel.setAttribute("aria-label","3D rendering diagnostics");
  panel.dataset.previewDiagnostics="true";
  Object.assign(panel.style,{position:"absolute",left:"12px",top:"100px",zIndex:"30",pointerEvents:"none",whiteSpace:"pre",font:"11px/1.6 monospace",color:"#e2e8f0",background:"#020617db",padding:"8px 12px",borderRadius:"8px"});
  host.parentElement?.appendChild(panel);
  const sample=()=>{
    if(document.hidden)return;
    const {render,memory}=renderer.info;
    panel.textContent=`Last rendered frame\nDraw calls: ${render.calls}\nTriangles: ${render.triangles.toLocaleString()}\nGPU geometries: ${memory.geometries}\nGPU textures: ${memory.textures}\nBuffer: ${renderer.domElement.width} × ${renderer.domElement.height}`;
  };
  sample();const timer=window.setInterval(sample,1000);
  return ()=>{window.clearInterval(timer);panel.remove();};
}
