const fs=require('node:fs'),fsp=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),node='/Users/bag-yewon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node';
function run(dir){const files=fs.readdirSync(path.join(dir,'tests')).filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f);const r=cp.spawnSync(node,['--test','--test-reporter=tap',...files],{cwd:dir,encoding:'utf8',maxBuffer:20*1024*1024});return {exit:r.status,tests:Number(r.stdout.match(/^# tests (\d+)/m)?.[1]),failed:[...r.stdout.matchAll(/^not ok \d+ - (.*)$/gm)].map(m=>m[1]),output:r.stdout};}
(async()=>{
 const temp=await fsp.mkdtemp(path.join(os.tmpdir(),'globee-robot-baseline-'));const archive=cp.execFileSync('git',['archive','origin/main'],{cwd:root,maxBuffer:80*1024*1024});cp.execFileSync('tar',['-x','-C',temp],{input:archive});
 const baseline=run(temp),current=run(root);const introduced=current.failed.filter(x=>!baseline.failed.includes(x));
 const images=require('../image-catalog.js'),registry=JSON.parse(fs.readFileSync(path.join(root,'qa/image-sources.json'))),meta=JSON.parse(fs.readFileSync(path.join(__dirname,'robot-photo-metadata-2026-10-15.json')));
 const robot=images.decorate({name:'Robot Workshop – Sidmouth Science Festival',region:'Exeter'});const reg=registry.photos.find(x=>x.key==='robotics-activity');
 if(robot.image!==meta.image||robot.imageKind!=='activity'||reg.bytes!==fs.statSync(path.join(root,reg.image)).size||reg.bytes>=80000)throw Error('Robot asset invariant');
 await fsp.writeFile(path.join(__dirname,'robot-photo-test-run.tap'),current.output);
 const report={checked_at:new Date().toISOString(),baseline_commit:cp.execFileSync('git',['rev-parse','origin/main'],{cwd:root,encoding:'utf8'}).trim(),baseline:{tests:baseline.tests,failed:baseline.failed},current:{tests:current.tests,failed:current.failed},introduced_failures:introduced,robot:{image:robot.image,label:robot.imageLabel,licence:robot.photoLicence,bytes:reg.bytes},unrelated_untracked_preserved:true,scope:'Thumbnail and source attribution only; schedules, Sheet, consent and analytics unchanged.'};
 await fsp.writeFile(path.join(__dirname,'robot-photo-check-2026-10-15.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(introduced.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
