const {test}=require('node:test');const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
test('ASAR repack adds nested media while preserving existing bytes and integrity',()=>{
 const result=JSON.parse(execFileSync('python3',['-c',`
import runpy,tempfile,pathlib,json,hashlib
m=runpy.run_path('scripts/install-clawd-animation-menu.py')
original=b'untouched'
header={'files':{'src':{'files':{'old.js':{'size':len(original),'offset':'0'}}}}}
archive,digest=m['repack'](original,header,0,{'src/new-media/picture.png':b'\\x89PNG\\x00\\xff'})
with tempfile.TemporaryDirectory() as d:
 p=pathlib.Path(d)/'app.asar';p.write_bytes(archive)
 raw,h,start,actual=m['read_archive'](p)
 print(json.dumps({'old':m['read_file'](raw,h,start,'src/old.js').decode(),
  'new':m['read_file'](raw,h,start,'src/new-media/picture.png').hex(),
  'integrity':m['leaf'](h,'src/new-media/picture.png')['integrity']['hash'],
  'digestMatches':actual==digest}))
`],{encoding:'utf8'}));
 assert.equal(result.old,'untouched');assert.equal(result.new,'89504e4700ff');assert(result.digestMatches);
 assert.equal(result.integrity,require('node:crypto').createHash('sha256').update(Buffer.from(result.new,'hex')).digest('hex'));
});
