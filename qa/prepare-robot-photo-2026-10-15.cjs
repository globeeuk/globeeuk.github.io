const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('/Users/bag-yewon/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..');
const clean=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
async function get(url){const r=await fetch(url,{headers:{'User-Agent':'GlobeeDirectory/1.0 (licensed photo attribution; https://globeeuk.github.io/)'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${r.status} ${url}`);return r;}
(async()=>{
 const title='File:Lego Mindstorms EV3 Robot.jpg',url=new URL('https://commons.wikimedia.org/w/api.php');
 Object.entries({action:'query',format:'json',titles:title,prop:'imageinfo',iiprop:'url|extmetadata'}).forEach(([k,v])=>url.searchParams.set(k,v));
 const info=Object.values((await(await get(url)).json()).query.pages)[0].imageinfo[0],m=info.extmetadata;
 const licence=clean(m.LicenseShortName.value),creator=clean(m.Artist.value);
 if(licence!=='CC BY-SA 4.0'||!creator.includes('Javier Leiva'))throw Error('Licence/creator differs from reviewed Commons page');
 const original=Buffer.from(await(await get(info.url)).arrayBuffer());
 await fs.writeFile(path.join(__dirname,'robot-photo-original-2026-10-15.jpg'),original);
 const image='assets/images/robotics-activity.webp';
 const bytes=await sharp(original).rotate().resize({width:960,withoutEnlargement:true}).webp({quality:80}).toBuffer();
 await fs.writeFile(path.join(root,image),bytes);
 const meta=await sharp(bytes).metadata();
 const record={key:'robotics-activity',image,source:info.descriptionurl,creator,licence,licenceUrl:m.LicenseUrl.value,originalUrl:info.url,date:clean(m.DateTimeOriginal.value),checked:'2026-10-15',imageKind:'activity',description:'A real LEGO Mindstorms EV3 educational robot; an activity reference, not the Sidmouth workshop, its venue or promised equipment.',changes:'Resized to 960 pixels wide and converted to WebP; layout crop only. The derivative retains CC BY-SA 4.0. No AI-generated or altered scene.',bytes:bytes.length,pixels:[meta.width,meta.height],originalSha256:crypto.createHash('sha256').update(original).digest('hex')};
 await fs.writeFile(path.join(__dirname,'robot-photo-metadata-2026-10-15.json'),JSON.stringify(record,null,2)+'\n');
 console.log(JSON.stringify(record));
})().catch(e=>{console.error(e);process.exitCode=1});
