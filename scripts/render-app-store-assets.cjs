/* global __dirname */
/** Render vector layouts containing unretouched simulator screenshots.
 * Usage: NODE_PATH=/path/to/node_modules node scripts/render-app-store-assets.cjs
 * Dependency: sharp. Source captures live in store-assets/app-store/v3.0/raw.
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'store-assets/app-store/v3.0');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const data = (file) => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
const slides = [
  { key:'01-track', title:['Every mile.','Clearly logged.'], sub:'One tap to start. Stop when you arrive.', tag:'START A DRIVE', tone:'paper' },
  { key:'02-live-tracking', title:['Your drive.','Live on screen.'], sub:'Distance, time and speed at a glance.', tag:'LIVE TRACKING', tone:'dark' },
  { key:'03-reports', title:['Your mileage.','Made clear.'], sub:'Review totals. Export PDF or CSV.', tag:'MILEAGE REPORTS', tone:'mint' },
  { key:'04-trips', title:['Every drive.','In its place.'], sub:'Sort by purpose, project and vehicle.', tag:'TRIP HISTORY', tone:'paper' },
  { key:'05-details', title:['Small details.','A clearer record.'], sub:'Add notes, review timing and share a trip.', tag:'TRIP DETAILS', tone:'dark' },
  { key:'06-settings', title:['Your setup.','Your way.'], sub:'Choose units and distance rounding.', tag:'MAKE IT YOURS', tone:'mint' },
];
const themes = {
  paper:{ bg:'#F0F4ED', ink:'#102B23', accent:'#007C56', muted:'#51665B', line:'#C7D5CA' },
  mint:{ bg:'#D9F3DF', ink:'#102B23', accent:'#007C56', muted:'#476454', line:'#B5DCC0' },
  dark:{ bg:'#082019', ink:'#F0F7EE', accent:'#59E7A2', muted:'#A5C5B3', line:'#264A3C' },
};
function svg(w,h,body,defs='') {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
}
function text(x,y,str,size,fill,weight=600,extra='') {
  return `<text x="${x}" y="${y}" font-family="Avenir Next,Arial,sans-serif" font-weight="${weight}" font-size="${size}" fill="${fill}" ${extra}>${esc(str)}</text>`;
}
function route(x,y,color,scale=1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"><path d="M4 33h22c18 0 18-26 35-26h15"/><circle cx="3" cy="33" r="7" fill="${color}" stroke="none"/><circle cx="78" cy="7" r="7"/></g>`;
}
function device(raw,x,y,w,h,id,tablet=false) {
  const pad=tablet?21:20, radius=tablet?48:80;
  return { defs:`<clipPath id="${id}"><rect x="${x+pad}" y="${y+pad}" width="${w-pad*2}" height="${h-pad*2}" rx="${radius-pad}"/></clipPath><filter id="shadow-${id}" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#001A10" flood-opacity="0.20"/></filter>`, body:`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="#14221D" stroke="#688174" stroke-width="3" filter="url(#shadow-${id})"/><image href="${data(raw)}" x="${x+pad}" y="${y+pad}" width="${w-pad*2}" height="${h-pad*2}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${id})"/>` };
}
async function save(name,source) {
  const sourcePath=path.join(base,'design',name.replace(/\.png$/,'.svg').replaceAll('/','--'));
  fs.writeFileSync(sourcePath,source);
  const output=path.join(base,name);fs.mkdirSync(path.dirname(output),{recursive:true});
  await sharp(Buffer.from(source),{limitInputPixels:false}).flatten({background:'#ffffff'}).toColourspace('srgb').removeAlpha().png({compressionLevel:9}).toFile(output);
  console.log(name);
}
async function renderSlide(slide,index,kind) {
  const tablet=kind==='ipad', t=themes[slide.tone];
  const W=tablet?2064:1320,H=tablet?2752:2868;
  let body=`<rect width="${W}" height="${H}" fill="${t.bg}"/>`;
  // Deliberately restrained route motif, kept outside the application UI.
  body+=`<path d="M${W+90} 80 C${W-360} 80 ${W+180} 660 ${W-150} 740" fill="none" stroke="${t.line}" stroke-width="3"/>`;
  const left=tablet?140:104;
  body+=route(left,88,t.accent,.62)+text(left+72,112,'TapMiles',38,t.ink,700);
  body+=text(W-left,110,`${String(index+1).padStart(2,'0')} / 06`,24,t.muted,600,'text-anchor="end" letter-spacing="3"');
  const titleY=tablet?280:286, titleSize=tablet?133:112, line=tablet?150:129;
  body+=text(left,titleY,slide.title[0],titleSize,t.ink,800,'letter-spacing="-4"');
  body+=text(left,titleY+line,slide.title[1],titleSize,t.accent,800,'letter-spacing="-4"');
  body+=text(left,titleY+line+81,slide.sub,tablet?42:34,t.muted,500);
  body+=`<line x1="${left}" y1="${tablet?610:571}" x2="${W-left}" y2="${tablet?610:571}" stroke="${t.line}" stroke-width="2"/>`;
  let frame;
  if(tablet){
    const sw=1455, sh=sw*2752/2064;
    frame=device(path.join(base,'raw/ipad',`${slide.key}.png`),(W-sw-42)/2,690,sw+42,sh+42,`pad${index}`,true);
  }else{
    const sw=980, sh=sw*2622/1206;
    frame=device(path.join(base,'raw/iphone',`${slide.key}.png`),(W-sw-40)/2,632,sw+40,sh+40,`phone${index}`);
  }
  body+=frame.body;
  const filename=`${tablet?'ipad-13-2064x2752':'iphone-large-1320x2868'}/${slide.key}.png`;
  await save(filename,svg(W,H,body,frame.defs));
  if(!tablet){
    // Same vector composition, rendered natively at Apple's medium-display size.
    await save(`iphone-medium-1206x2622/${slide.key}.png`,svg(1206,2622,`<g transform="scale(${1206/1320} ${2622/2868})">${body}</g>`,frame.defs));
  }
}
async function extras(){
  const W=2400,H=1200,t=themes.paper;
  let body=`<rect width="${W}" height="${H}" fill="${t.bg}"/>`;
  body+=route(130,100,t.accent,.8)+text(224,132,'TapMiles',46,t.ink,700);
  body+=text(130,390,'Every mile.',146,t.ink,800,'letter-spacing="-5"');
  body+=text(130,550,'Clearly logged.',146,t.accent,800,'letter-spacing="-5"');
  body+=text(135,670,'Track drives. Keep details.',43,t.muted,500)+text(135,732,'Share clear mileage reports.',43,t.muted,500);
  body+=`<rect x="130" y="880" width="600" height="76" rx="38" fill="#102B23"/>`+text(430,931,'MILEAGE TRACKER · iPhone + iPad',22,'#F0F4ED',700,'text-anchor="middle" letter-spacing="2"');
  const a=device(path.join(base,'raw/iphone/03-reports.png'),1740,245,440,(440-40)*2622/1206+40,'banner-report');
  const b=device(path.join(base,'raw/iphone/01-track.png'),1280,120,500,(500-40)*2622/1206+40,'banner-track');
  body+=a.body+b.body;
  await save('extras/TapMiles-promotional-header-2400x1200.png',svg(W,H,body,a.defs+b.defs));
  // This is an editorial contact sheet of the first three store images, not a fabricated Apple ranking.
  let preview=`<rect width="1800" height="1510" fill="#FFFFFF"/>`;
  preview+=text(80,92,'TapMiles · first three search-result screenshots',42,'#102B23',700);
  preview+=text(80,150,'Preview of the visual sequence. Not an App Store upload asset.',25,'#51665B',500);
  for(let i=0;i<3;i++)preview+=`<image href="${data(path.join(base,'iphone-medium-1206x2622',slides[i].key+'.png'))}" x="${80+i*555}" y="210" width="530" height="1152"/>`;
  await save('extras/Search-results-screenshot-preview.png',svg(1800,1510,preview));
  const icon=path.join(root,'expo/assets/images/icon.png');
  await sharp(icon).resize(1024,1024).flatten({background:'#000000'}).toColourspace('srgb').removeAlpha().png().toFile(path.join(base,'App-Icon-1024.png'));
  let contact=`<rect width="2100" height="1780" fill="#F0F4ED"/>`+text(60,76,'TapMiles 3.0 — App Store screenshot set',43,'#102B23',700);
  for(let i=0;i<6;i++)contact+=`<image href="${data(path.join(base,'iphone-medium-1206x2622',slides[i].key+'.png'))}" x="${60+(i%3)*690}" y="${125+Math.floor(i/3)*800}" width="350" height="761"/>`+text(435+(i%3)*690,190+Math.floor(i/3)*800,`${i+1}. ${slides[i].tag.split(' ')[0]}`,22,'#102B23',700);
  await save('extras/Contact-sheet-iPhone.png',svg(2100,1780,contact));
}
if (require.main === module) (async()=>{
  fs.mkdirSync(path.join(base,'design'),{recursive:true});
  for(let i=0;i<slides.length;i++){await renderSlide(slides[i],i,'iphone');if(fs.existsSync(path.join(base,'raw/ipad',slides[i].key+'.png')))await renderSlide(slides[i],i,'ipad');}
  await extras();
})().catch(error=>{console.error(error);process.exitCode=1;});

module.exports={base,svg,text,route,device,save,themes,slides};
