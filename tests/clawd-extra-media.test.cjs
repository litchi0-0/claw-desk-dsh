const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const vm=require('node:vm');
const root=path.resolve('integrations/merzlin-media');
function fixture(){let now=1000,muted=false,enabled=true,theme={extraMedia:true,petInteractions:{clickSound:true}};const played=[],images=[],saved=[];
 const media=require('../integrations/clawd-extra-media')({now:()=>now,enabled:()=>enabled,muted:()=>muted,volume:()=>.4,theme:()=>theme,
 send:p=>played.push(p),showImage:p=>images.push(p),loadPrefs:()=>({}),savePrefs:p=>saved.push({...p})});
 return {media,played,images,saved,advance:ms=>{now+=ms},mute:v=>{muted=v},enable:v=>{enabled=v},theme:v=>{theme=v}};
}
function find(items,label){for(const item of items){if(item.label===label)return item;if(item.submenu){const match=find(item.submenu,label);if(match)return match}}}
test('imported registry contains 24 static memes and six original verified sounds',()=>{
 const catalog=require('../integrations/merzlin-media/catalog.json');assert.equal(catalog.images.length,24);assert.equal(catalog.sounds.length,6);
 for(const item of [...catalog.images,...catalog.sounds]){assert(/^[a-zA-Z0-9._-]+$/.test(item.file));const data=fs.readFileSync(path.join(root,item.file));
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),item.sha256);
  assert.equal(crypto.createHash('sha1').update(Buffer.from(`blob ${data.length}\0`)).update(data).digest('hex'),item.sourceGitBlobSha);
 }
});
test('animation audit matches renamed clips without inventing two extra animations',()=>{
 const audit=require('../themes/dsh-whale-chan/merzlin-audit.json');assert.equal(audit.animations.length,106);
 assert.equal(new Set(audit.animations.map(a=>a.localId)).size,106);assert.equal(audit.missingAnimations.length,0);
 assert.equal(audit.animations.filter(a=>a.identical).length,105);assert.equal(audit.animations.filter(a=>a.renamed).length,2);
});
test('extension menu exposes grouped static images, audio previews and persistent click choices',()=>{
 const f=fixture(),menu=f.media.menu();assert.equal(menu.label,'扩展素材');assert.equal(find(menu.submenu,'大肥鱼表情（静态）').submenu.length,24);
 find(menu.submenu,'可爱').click();assert.equal(f.images[0].title,'可爱');assert.match(f.images[0].url,/\.png$/);
 find(find(menu.submenu,'点击声音').submenu,'小鸭 Ya1').click();assert.equal(f.saved.at(-1).clickSound,'duck-ya1');f.advance(100);f.media.click();assert.match(f.played.at(-1).url,/duck-ya1\.mp3$/);
 assert.equal(find(menu.submenu,'任务提示音（开始／完成／出错）').checked,false);
});
test('extension audio shares master mute, DND eligibility, volume and click-sound gate',()=>{
 const f=fixture();f.media.preview('agent-done');assert.equal(f.played[0].volume,.2);
 f.mute(true);f.advance(100);f.media.preview('agent-error');assert.equal(f.played.length,1);
 f.mute(false);f.enable(false);f.advance(100);f.media.preview('agent-error');assert.equal(f.played.length,1);
 f.enable(true);f.theme({extraMedia:true,petInteractions:{clickSound:false}});f.advance(100);f.media.click();assert.equal(f.played.length,1);
});
test('collision sounds are opt-in and rapid impacts are throttled',()=>{
 const f=fixture();f.media.impact();assert.equal(f.played.length,0);
 find(f.media.menu().submenu,'屏幕碰撞音效').click({checked:true});f.media.impact();assert.equal(f.played.length,1);
 f.advance(50);f.media.impact();assert.equal(f.played.length,1);f.advance(150);f.media.impact();assert.equal(f.played.length,2);
});
test('task sounds are opt-in, ignore initial state and play once per real transition',()=>{
 const f=fixture(),snap=state=>({sessions:[{id:'a',state}]});f.media.poll(snap('working'));assert.equal(f.played.length,0);
 assert.equal(f.media.ownsTaskSounds(),false);
 f.media.poll(()=>{throw new Error('Disabled task sounds must not build a snapshot')});
 find(f.media.menu().submenu,'任务提示音（开始／完成／出错）').click({checked:true});f.media.poll(snap('working'));f.advance(500);
 assert.equal(f.media.ownsTaskSounds(),true);
 f.media.poll(snap('attention'));assert.match(f.played.at(-1).url,/agent-done\.wav$/);f.media.poll(snap('attention'));assert.equal(f.played.length,1);
 f.advance(500);f.media.poll(snap('working'));assert.match(f.played.at(-1).url,/agent-start\.wav$/);
 f.advance(500);f.media.poll(snap('error'));assert.match(f.played.at(-1).url,/agent-error\.wav$/);
});
test('image bubble renderer clears a prior image when a text notice replaces it',()=>{
 let handler;const nodes={title:{},body:{},picture:{style:{},removeAttribute(k){delete this[k]}}};
 vm.runInNewContext(fs.readFileSync('integrations/clawd-info-preload.js','utf8'),{require:()=>({ipcRenderer:{on:(_n,f)=>{handler=f}}}),document:{getElementById:id=>nodes[id]},URL});
 handler(null,{title:'表情',image:'file:///tmp/fish.png'});assert.equal(nodes.picture.src,'file:///tmp/fish.png');assert.equal(nodes.picture.style.display,'block');
 handler(null,{title:'余额',body:'剩余25%'});assert.equal(nodes.picture.style.display,'none');assert.equal(nodes.body.textContent,'剩余25%');
 handler(null,{image:'https://example.com/fish.png'});assert.equal(nodes.picture.style.display,'none');
});
test('click choice and optional switches survive a real preferences file round-trip',()=>{
 const os=require('node:os'),create=require('../integrations/clawd-extra-media'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'clawd-media-prefs-'));
 const controls={dataDir:dir,enabled:()=>true,muted:()=>false,volume:()=>1,theme:()=>({extraMedia:true}),send(){},showImage(){}};
 try{
  const first=create(controls);find(find(first.menu().submenu,'点击声音').submenu,'小鸭 Ya2').click();
  find(first.menu().submenu,'屏幕碰撞音效').click({checked:true});
  const second=create(controls);assert.equal(find(find(second.menu().submenu,'点击声音').submenu,'小鸭 Ya2').checked,true);
  assert.equal(find(second.menu().submenu,'屏幕碰撞音效').checked,true);
  fs.writeFileSync(path.join(dir,'clawd-extra-media-prefs.json'),'{broken');
  assert.equal(find(find(create(controls).menu().submenu,'点击声音').submenu,'原版嘎嘎').checked,true);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
