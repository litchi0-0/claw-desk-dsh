const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const crypto=require('node:crypto');
test('bundled click sound is the original pinned upstream WAV with provenance intact',()=>{
 const source=JSON.parse(fs.readFileSync('integrations/dsh-click-duck.source.json','utf8'));
 const data=fs.readFileSync('integrations/dsh-click-duck.wav');
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),source.sha256);
 assert.equal(crypto.createHash('sha1').update(Buffer.from(`blob ${data.length}\0`)).update(data).digest('hex'),source.gitBlobSha);
 assert.equal(source.revision,'34cf7ec4dd1ca99a9a9ac5bcb4571d887862e226');
 assert.equal(source.path,'dsh-pet/assets/sound/click-duck.wav');
 assert.equal(source.sha256,'f1dafe05dfaa696b190e127800c48513e192d3efb521c246d1eaf86a4589b617');
});
