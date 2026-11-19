const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('The home, full results and seasonal page have no general Show map control',()=>{
  for(const file of ['index.html','plans.html','halloween.html']){
    const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    assert.doesNotMatch(html,/id="view-toggle"|aria-label="Show map"|>Show map</,file);
    assert.match(html,/id="map-return"[^>]*hidden/,file+' retains a return action for existing map links');
  }
});
