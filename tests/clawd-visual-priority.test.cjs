const {test}=require('node:test');
const assert=require('node:assert/strict');
const resolve=require('../integrations/clawd-visual-priority');

test('drag takes over a manual clip without flashing the old state',()=>{
  const stopped=[];
  const result=resolve({options:{source:'reaction',dragReaction:true},
    manualPlayer:{stop:restore=>stopped.push(restore),isActive:()=>true}});
  assert.equal(result,null);
  assert.deepEqual(stopped,[false]);
});

test('state updates cannot cut off the held drag animation; release allows them',()=>{
  const visual={source:'reaction',file:'drag.webp',visualGeneration:12};
  const manualPlayer={isActive:()=>false};
  assert.deepEqual(resolve({options:{},dragLocked:true,visual,manualPlayer}),{request:visual});
  assert.equal(resolve({options:{},dragLocked:false,visual,manualPlayer}),null);
  assert.equal(resolve({options:{source:'reaction'},dragLocked:true,visual,manualPlayer}),null);
});

test('ordinary live events still preserve complete manual playback',()=>{
  const request={file:'flute.webp'};
  const manualPlayer={isActive:()=>true,getRequest:()=>request};
  assert.deepEqual(resolve({options:{},manualPlayer}),{request});
  assert.equal(resolve({options:{manualPlayback:true},manualPlayer}),null);
});
test('airborne visual is held against ordinary restores but explicit physics and drag requests can replace it',()=>{
 const visual={source:'reaction',file:'drag.webp'},manualPlayer={isActive:()=>false,stop(){}};
 assert.deepEqual(resolve({options:{},physicsActive:true,visual,manualPlayer}),{request:visual});
 assert.equal(resolve({options:{physicsPlayback:true},physicsActive:true,visual,manualPlayer}),null);
 assert.equal(resolve({options:{dragReaction:true},physicsActive:true,visual,manualPlayer}),null);
});

test('live work visual requests do not cut off a user throw and can resume after landing',()=>{
 const visual={source:'reaction',file:'drag.webp'},manualPlayer={isActive:()=>false};
 assert.deepEqual(resolve({options:{source:'state'},physicsActive:true,visual,manualPlayer}),{request:visual});
 assert.equal(resolve({options:{source:'state'},physicsActive:false,visual,manualPlayer}),null);
});
