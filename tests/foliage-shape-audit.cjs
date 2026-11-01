const {readFileSync,existsSync}=require("node:fs");
const vm=require("node:vm");
const test=require("node:test");
const assert=require("node:assert/strict");
const ts=require("typescript");
const THREE=require("three");
const source=["src/components/sceneryTrees.ts","src/components/temple3d/sceneryTrees.ts"].find(existsSync);
const mod={exports:{}};
vm.runInNewContext(ts.transpile(readFileSync(source,"utf8"),{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}),{module:mod,exports:mod.exports,require});
const {addSceneryTree}=mod.exports;
for(const [style,count] of [["broadleaf",360],["pine",320],["cypress",340]])test(style+" leaves remain thin, small, deterministic and within budget",()=>{
  for(const seed of [1,4,707]){
    const a=addSceneryTree(new THREE.Group(),style,seed),b=addSceneryTree(new THREE.Group(),style,seed);
    assert.equal(a.children.length,2);
    const leaf=a.children[1],geometry=leaf.geometry;
    assert.equal(leaf.count,count);
    assert.equal(leaf.material.side,THREE.DoubleSide);
    geometry.computeBoundingBox();
    const size=geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(size.z<size.x*.1,"Leaves must be blades, not solid canopy clumps");
    assert.ok(size.y>size.x,"Keep the elongated pointed silhouette");
    assert.ok(geometry.attributes.position.count/3<=4,"Retain a low triangle budget");
    assert.deepEqual(leaf.instanceMatrix.array,b.children[1].instanceMatrix.array);
    assert.deepEqual(leaf.instanceColor.array,b.children[1].instanceColor.array);
    const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
    for(let i=0;i<leaf.count;i++){
      leaf.getMatrixAt(i,matrix);matrix.decompose(p,q,s);
      assert.ok([...matrix.elements].every(Number.isFinite));
      assert.ok(Math.max(s.x,s.y,s.z)<=.19);
      assert.ok(size.z*s.z<.01,"World-space leaf thickness must stay below 0.01 scene units");
    }
    const bounds=new THREE.Box3().setFromObject(a);
    assert.ok(bounds.min.y>=-.02&&bounds.max.y>3.5);
  }
});
