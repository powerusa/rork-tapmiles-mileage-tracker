/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const base = path.resolve(__dirname, '../store-assets/app-store/v3.0');
const sets = {
  'iphone-medium-1206x2622':[1206,2622],
  'iphone-large-1320x2868':[1320,2868],
  'ipad-13-2064x2752':[2064,2752],
};
(async()=>{
  const report={version:'3.0.0',locale:'en-US',screenshots:[],metadata:{},status:'passed'};
  for(const [folder,[width,height]] of Object.entries(sets)) {
    const names=fs.readdirSync(path.join(base,folder)).filter(name=>name.endsWith('.png')).sort();
    assert.equal(names.length,6,`Expected six screenshots in ${folder}`);
    for(const name of names){
      const file=path.join(base,folder,name), info=await sharp(file).metadata();
      assert.equal(info.width,width);assert.equal(info.height,height);
      assert.equal(info.hasAlpha,false);assert.equal(info.space,'srgb');assert.equal(info.format,'png');
      report.screenshots.push({file:`${folder}/${name}`,width,height,alpha:false,colorSpace:info.space});
    }
  }
  const icon=await sharp(path.join(base,'App-Icon-1024.png')).metadata();
  assert.equal(icon.width,1024);assert.equal(icon.height,1024);assert.equal(icon.hasAlpha,false);
  const metadata=JSON.parse(fs.readFileSync(path.join(base,'metadata/en-US.json'),'utf8'));
  const limits={name:30,subtitle:30,keywords:100,promotional_text:170,description:4000,whats_new:4000,review_notes:4000};
  for(const [field,limit] of Object.entries(limits)){
    const length=Array.from(metadata[field]).length;assert.ok(length<=limit,field);
    report.metadata[field]={length,limit};
  }
  report.captureSizes={};
  for(const kind of ['iphone','ipad']){
    const files=fs.readdirSync(path.join(base,'raw',kind)).filter(name=>name.endsWith('.png'));
    assert.equal(files.length,6);
    const info=await sharp(path.join(base,'raw',kind,files[0])).metadata();
    report.captureSizes[kind]={width:info.width,height:info.height};
  }
  fs.writeFileSync(path.join(base,'VALIDATION.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Validated ${report.screenshots.length} RGB screenshots, 1024px icon and all listing field limits.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
