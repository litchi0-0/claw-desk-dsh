const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
function fixture(){let callback,cancelled=0;const frames=[],style={transform:'translateX(10px)'};
 const stage={style,animate:(...args)=>{frames.push(args);return {cancel(){cancelled++}}}};
 vm.runInNewContext(fs.readFileSync('integrations/clawd-feedback-renderer.js','utf8'),{document:{getElementById:()=>stage},window:{electronAPI:{onPetFeedback:f=>{callback=f}}},Math});
 return {callback,frames,style,get cancelled(){return cancelled}};
}
test('Q feedback animates scale separately and preserves the existing motion transform',()=>{const f=fixture();f.callback({kind:'tap'});assert.equal(f.frames.length,1);assert(f.frames[0][0].some(k=>k.scale!=='1 1'));assert.equal(f.style.transform,'translateX(10px)');f.callback({kind:'reset'});assert.equal(f.style.scale,'');assert.equal(f.cancelled,1)});
test('slingshot stretch remains bounded and collision feedback uses the actual hit axis',()=>{const f=fixture();f.callback({kind:'stretch',dx:10000,dy:0});assert.equal(f.style.scale,'1.2 0.9');f.callback({kind:'impact',axis:'x',strength:1});assert.equal(f.frames.at(-1)[0][1].scale,'0.8 1.1')});
