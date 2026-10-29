const {test}=require('node:test');
const assert=require('node:assert/strict');
const build=require('../integrations/clawd-animation-menu');

test('manual selection cancels roaming and plays the selected full clip once',()=>{
  const calls=[];
  const menu=build({idleAnimations:[{file:'hotpot.webp',duration:10067}]},{
    cancelRoam:()=>calls.push('cancel-roam'),
    play:(file,duration)=>calls.push([file,duration]),
    stop:()=>calls.push('stop'),
  });
  assert.equal(menu.label,'播放动画');
  assert.equal(menu.submenu[0].label,'涮火锅');
  menu.submenu[0].click();
  assert.deepEqual(calls,['cancel-roam',['hotpot.webp',10067]]);
  menu.submenu.at(-1).click();
  assert.equal(calls.at(-1),'stop');
});

test('only safe unique theme entries are exposed, and unavailable modes are disabled',()=>{
  const theme={idleAnimations:[
    {file:'cat.webp',duration:10067},{file:'cat.webp',duration:10067},
    {file:'../other.webp',duration:1000},{file:'bad.webp',duration:NaN},
  ]};
  const menu=build(theme,{disabled:true,play(){},stop(){}});
  assert.equal(menu.enabled,false);
  assert.equal(menu.submenu.length,3);
  assert.equal(menu.submenu[0].label,'撸猫');
  assert.equal(build({idleAnimations:[]},{}),null);
});

test('all catalog animations occur exactly once in categorized submenus',()=>{
  const catalog=require('../themes/dsh-whale-chan/catalog.json');
  const theme={manualAnimations:catalog.assets.map(a=>({
    file:a.id+'.webp',label:a.label,category:a.category,duration:10067,
  }))};
  const menu=build(theme,{play(){},stop(){}});
  const labels=[];
  function walk(items,depth=0){
    for(const item of items){
      if(item.submenu)walk(item.submenu,depth+1);
      else if(item.type!=='separator' && !item.label.startsWith('停止播放')){
        assert.ok(depth>=1);labels.push(item.label);
      }
    }
  }
  walk(menu.submenu);
  assert.equal(labels.length,106);
  assert.equal(new Set(labels).size,106);
  assert.deepEqual(new Set(labels),new Set(catalog.assets.map(a=>a.label)));
  assert.ok(menu.submenu.some(x=>x.label==='节日庆祝'));
  assert.ok(menu.submenu.length<=12);
  assert.ok(menu.submenu.at(-1).label.startsWith('停止播放'));
});
