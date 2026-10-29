const {test}=require('node:test');
const assert=require('node:assert/strict');
const createPicker=require('../integrations/clawd-idle-picker');
const theme=require('../themes/dsh-whale-chan/theme.json');
test('weighted categories are chosen independently of group size and do not repeat',()=>{
 const t={autoIdleCategoryWeights:{A:1,B:3},manualAnimations:[{file:'a',category:['A']},{file:'b',category:['A']},{file:'c',category:['B']}]};
 const pool=['a','b','c'].map(svg=>({svg,duration:1000}));
 const pick=createPicker();assert.equal(pick(pool,t,()=>0).svg,'a');assert.equal(pick(pool,t,()=>0).svg,'b');
 assert.equal(createPicker()(pool,t,()=>.5).svg,'c');
});
test('current theme expands idle pool without work, balance, speech or drag actions',()=>{
 assert(theme.idleAnimations.length>60);
 const files=new Set(theme.idleAnimations.map(a=>a.file));
 for(const f of ['working.webp','drag.webp','qian-dai-man-yi.webp','wave.webp','sleeping.webp','idle.webp'])assert(!files.has(f),f);
 assert(files.has('cube.webp'));assert(files.has('flute.webp'));
 const pick=createPicker(),pool=theme.idleAnimations.map(a=>({svg:a.file,duration:a.duration}));
 let last;for(let i=0;i<100;i++){const next=pick(pool,theme,()=>.5);assert.notEqual(next.svg,last);last=next.svg;}
});
