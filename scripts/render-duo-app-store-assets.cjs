const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const {base,svg,text,route,device,save,themes,slides}=require('./render-app-store-assets.cjs');
(async()=>{
 const validation=[];
 for(const inner of [false,true]){
  const W=inner?2007:1398,H=inner?2853:2034,kind=inner?'inner':'outer';
  const folder=`iphone-duo-${kind}-${W}x${H}`;
  for(let i=0;i<slides.length;i++){
   const s=slides[i],t=themes[s.tone],left=inner?140:104,size=inner?140:100;
   let body=`<rect width="${W}" height="${H}" fill="${t.bg}"/>`;
   body+=route(left,75,t.accent,.7)+text(left+80,104,'TapMiles',inner?46:38,t.ink,700);
   body+=text(left,inner?280:245,s.title[0],size,t.ink,800,'letter-spacing="-4"');
   body+=text(left,inner?438:360,s.title[1],size,t.accent,800,'letter-spacing="-4"');
   body+=text(left,inner?530:440,s.sub,inner?42:34,t.muted,500);
   const sw=inner?1450:900,sh=sw*H/W;
   const d=device(path.join(base,`raw/duo-${kind}`,s.key+'.png'),(W-sw-40)/2,inner?650:590,sw+40,sh+40,`duo-${kind}-${i}`,inner);
   await save(`${folder}/${s.key}-${W}x${H}.png`,svg(W,H,body+d.body,d.defs));
   const file=path.join(base,folder,`${s.key}-${W}x${H}.png`),m=await sharp(file).metadata();
   if(m.width!==W||m.height!==H||m.hasAlpha||m.space!=='srgb')throw Error(`Invalid ${file}`);
   validation.push({file:path.relative(base,file),width:W,height:H,hasAlpha:m.hasAlpha});
  }
 }
 fs.writeFileSync(path.join(base,'DUO-VALIDATION.json'),JSON.stringify(validation,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
