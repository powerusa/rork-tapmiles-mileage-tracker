/** Apple's separate Header and Search Results creative assets, not screenshots. */
const path=require('node:path');
const fs=require('node:fs');
const sharp=require('sharp');
const {base,svg,text,route,device,save}=require('./render-app-store-assets.cjs');
async function main(){
 fs.mkdirSync(path.join(base,'design'),{recursive:true});
 const bg='<rect width="3840" height="2560" fill="#082019"/><path d="M-200 1300C500 200 700 1800 1400 800S2600 100 4100 700" fill="none" stroke="#1B4936" stroke-width="10"/>';
 const a=device(path.join(base,'raw/iphone/01-track.png'),210,160,600,600*2622/1206,'header-home');
 const b=device(path.join(base,'raw/iphone/03-reports.png'),3030,160,600,600*2622/1206,'header-reports');
 let body=bg+a.body+b.body;
 body+=route(1760,510,'#59E7A2',1.1)+text(1880,550,'TapMiles',62,'#F0F7EE',700);
 body+=text(1920,770,'Every mile.',176,'#F0F7EE',800,'text-anchor="middle" letter-spacing="-6"');
 body+=text(1920,972,'Clearly logged.',176,'#59E7A2',800,'text-anchor="middle" letter-spacing="-6"');
 body+=text(1920,1090,'Track drives. Keep clear mileage records.',43,'#B9D8C6',500,'text-anchor="middle"');
 await save('creative-assets/TapMiles-APPLE-HEADER-3840x1646.png',svg(3840,1646,body,a.defs+b.defs));
 const c=device(path.join(base,'raw/iphone/03-reports.png'),2180,510,700,700*2622/1206,'search-report');
 body=bg+c.body+route(960,865,'#59E7A2',1)+text(1070,903,'TapMiles',62,'#F0F7EE',700);
 body+=text(960,1100,'Every mile.',130,'#F0F7EE',800,'letter-spacing="-4"')+text(960,1260,'Made clear.',130,'#59E7A2',800,'letter-spacing="-4"');
 body+=text(966,1400,'Track your drives.',48,'#B9D8C6',500)+text(966,1474,'Review your mileage.',48,'#B9D8C6',500)+text(966,1548,'Export PDF or CSV.',48,'#B9D8C6',500);
 await save('creative-assets/TapMiles-APPLE-SEARCH-RESULTS-3840x2560.png',svg(3840,2560,body,c.defs));
 const out=path.resolve(base,'../../../../outputs');
 fs.mkdirSync(out,{recursive:true});
 const validation=[];
 for(const name of fs.readdirSync(path.join(base,'creative-assets'))){
  if(!name.endsWith('.png'))continue;
  const src=path.join(base,'creative-assets',name), m=await sharp(src).metadata();
  if(m.hasAlpha||m.space!=='srgb')throw Error('Invalid color or alpha');
  if(name.includes('HEADER')?(m.width!==3840||m.height!==1646):(m.width!==3840||m.height!==2560))throw Error('Invalid size');
  fs.copyFileSync(src,path.join(out,name));validation.push({name,width:m.width,height:m.height,channels:m.channels,hasAlpha:m.hasAlpha});
 }
 fs.writeFileSync(path.join(base,'creative-assets/VALIDATION.json'),JSON.stringify(validation,null,2)+'\n');
 console.log(out);
}
main().catch(e=>{console.error(e);process.exitCode=1});
