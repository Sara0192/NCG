(function(root){
'use strict';
const TAU=Math.PI*2, R=398, C=430;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,Number(v)||0));
function hash(v){let h=2166136261;for(const c of String(v)){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;}
function random(seed){let x=seed>>>0;return()=>((x=Math.imul(x,1664525)+1013904223>>>0)/4294967296);}
const PRESETS={
 FDC:{specularGain:4.4,wearLevel:.025,lustre:.94,grime:.01,patinaStrength:.01,texture:.14,contrast:.95},
 SC: {specularGain:2.2,wearLevel:.095,lustre:.74,grime:.035,patinaStrength:.07,texture:.22,contrast:.91},
 EBC:{specularGain:1.55,wearLevel:.28,lustre:.52,grime:.12,patinaStrength:.24,texture:.38,contrast:.82},
 MBC:{specularGain:.95,wearLevel:.56,lustre:.27,grime:.23,patinaStrength:.48,texture:.62,contrast:.64},
 BC: {specularGain:.55,wearLevel:.83,lustre:.08,grime:.37,patinaStrength:.70,texture:.79,contrast:.42}
};
const METALS={
 oro:{shine:'255,235,169',shade:'104,70,21',edge:'130,96,42',patina:'127,89,40',specks:'85,59,30'},
 plata:{shine:'245,252,255',shade:'60,75,92',edge:'94,103,128',patina:'86,96,113',specks:'55,70,80'},
 cobre:{shine:'255,213,165',shade:'79,49,32',edge:'69,99,84',patina:'59,100,81',specks:'65,61,45'}
};
const reliefSurfaces=new Map();
let textureCanvas=null,specularCanvas=null;
function specularScratch(){if(!specularCanvas){specularCanvas=document.createElement('canvas');specularCanvas.width=specularCanvas.height=860;}return specularCanvas;}
function microTile(){
 if(textureCanvas)return textureCanvas;
 const t=document.createElement('canvas');t.width=t.height=112;const ct=t.getContext('2d');
 const pixels=ct.createImageData(112,112),r=random(2913917);
 for(let i=0;i<pixels.data.length;i+=4){const v=Math.floor(90+r()*160);pixels.data[i]=v;pixels.data[i+1]=v;pixels.data[i+2]=v;pixels.data[i+3]=Math.floor(25+r()*68);}
 ct.putImageData(pixels,0,0);textureCanvas=t;return t;
}
function options(shader){
 const o=shader||{};return {
  wear:clamp(o.wearLevel??.2),lustre:clamp(o.lustre??.45),grime:clamp(o.grime??.10),
  patina:clamp(o.patinaStrength??(o.grime??.10)*1.25),texture:clamp(o.texture??.4),
  metallic:clamp(o.metallic??.91),contrast:clamp(o.contrast??1.05,0,1.5),
  specularGain:clamp(o.specularGain??1.65,0,5),contactBoost:clamp(o.contactBoost??1,0,2),textureBoost:clamp(o.textureBoost??1,0,2),
  contactDensity:clamp(o.contactDensity??o.wearLevel??.3),surfaceSeed:Number(o.surfaceSeed??0)>>>0,dieWeakness:clamp(o.dieWeakness??.1),
  inspection:o.inspection||'normal',
  angle:(Number(o.lightAngle??-48)%360)*Math.PI/180,
  mode:o.mode||'realista',finish:o.finish||'',fx:o.fx||{},
  grade:o.gradePreview||'',
 };
}
function enabled(s,k){return s.fx[k]!==false&&s.fx.all!==false;}
function rgba(rgb,a){return `rgba(${rgb},${clamp(a).toFixed(4)})`;}
function smoothHeight(source, target, intermediate, size, radius){
 const span=2*radius+1;
 for(let y=0;y<size;y++){
  const row=y*size;
  let sum=source[row]*(radius+1);
  for(let x=1;x<=radius;x++)sum+=source[row+x];
  for(let x=0;x<size;x++){
   intermediate[row+x]=sum/span;
   sum+=source[row+Math.min(size-1,x+radius+1)]-source[row+Math.max(0,x-radius)];
  }
 }
 for(let x=0;x<size;x++){
  let sum=intermediate[x]*(radius+1);
  for(let y=1;y<=radius;y++)sum+=intermediate[x+y*size];
  for(let y=0;y<size;y++){
   target[x+y*size]=sum/span;
   sum+=intermediate[x+Math.min(size-1,y+radius+1)*size]-intermediate[x+Math.max(0,y-radius)*size];
  }
 }
}

function reliefBuffers(size){
 const cached=reliefSurfaces.get(size);
 if(cached)return cached;
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=size;
 const context=canvas.getContext('2d',{willReadFrequently:true});
 const buffer=()=>new Float32Array(size*size);
 const surface={canvas,context,heights:buffer(),fine:buffer(),broad:buffer(),intermediate:buffer()};
 reliefSurfaces.set(size,surface);
 return surface;
}

function drawRelief(ctx,design,coin,shader,quality,profile,documented){
 const s=options(shader);
 if(!enabled(s,'relief')||!design)return;
 const size=quality==='low'?172:256;
 const {canvas,context,heights,fine,broad,intermediate}=reliefBuffers(size);
 context.clearRect(0,0,size,size);
 context.drawImage(design,0,0,size,size);
 const image=context.getImageData(0,0,size,size),pixels=image.data;
 for(let i=0,j=0;i<heights.length;i++,j+=4){
  const luminance=(.2126*pixels[j]+.7152*pixels[j+1]+.0722*pixels[j+2])/255;
  heights[i]=(pixels[j+3]/255)*(.30+.70*luminance);
 }
 smoothHeight(heights,fine,intermediate,size,quality==='low'?1:2);
 smoothHeight(fine,broad,intermediate,size,quality==='low'?4:6);
 const intensity=(1-s.wear*.78)*(1-s.dieWeakness*.45)*(documented ? .64 : 1);
 const angle=s.angle;
 const lx=Math.cos(angle),ly=Math.sin(angle);
 const m=METALS[metalFamilia(coin)]||METALS.plata;
 const light=m.shine.split(',').map(Number),shadow=m.shade.split(',').map(Number);
 const depth=1+(profile?.depth??.5)*.55;
 pixels.fill(0);
 for(let y=1;y<size-1;y++){
  for(let x=1;x<size-1;x++){
   const i=y*size+x;
   if(fine[i]<.005&&broad[i]<.005)continue;
   const near=lx*(fine[i+1]-fine[i-1])+ly*(fine[i+size]-fine[i-size]);
   const far=lx*(broad[i+1]-broad[i-1])+ly*(broad[i+size]-broad[i-size]);
   const slope=-(near*1.85+far*2.8)*depth;
   const tint=slope>=0?light:shadow;
   const opacity=Math.min(.47,Math.abs(slope)*.73)*intensity*(.32+.68*Math.min(1,fine[i]*2.3));
   const j=i*4;
   pixels[j]=tint[0];pixels[j+1]=tint[1];pixels[j+2]=tint[2];pixels[j+3]=opacity*255;
  }
 }
 context.putImageData(image,0,0);
 ctx.save();
 ctx.imageSmoothingEnabled=true;
 ctx.drawImage(canvas,-C,-C,2*C,2*C);
 ctx.restore();
}
function renderSurface(ctx,coin,side,shader,quality,planchet,design){
 const s=options(shader),m=METALS[metalFamilia(coin)]||METALS.plata;
 if(s.fx.all===false)return;
 const r=random(hash(`${coin.id}|${side}|${s.surfaceSeed}|${s.finish}`));
 ctx.save();planchet(ctx);ctx.clip();
 if(enabled(s,'light')){
  const lightLayer=design?specularScratch():null;
  const paint=lightLayer?lightLayer.getContext('2d'):ctx;
  if(lightLayer){paint.setTransform(1,0,0,1,0,0);paint.clearRect(0,0,860,860);paint.translate(C,C);}
  const cos=Math.cos(s.angle),sin=Math.sin(s.angle);
  const dir=paint.createLinearGradient(-cos*R,-sin*R,cos*R,sin*R);
  const energy=(.035+.49*s.lustre)*s.metallic*s.specularGain*(1-s.wear*.50);
  const shine=.77*(1-Math.exp(-energy*1.45));
  const focus=clamp((s.specularGain-1.6)/2.8);
  const shoulder=.065-.027*focus;
  const shade=ctx.createLinearGradient(-cos*R,-sin*R,cos*R,sin*R);
  shade.addColorStop(0,rgba(m.shade,shine*.29));shade.addColorStop(.32,'transparent');
  shade.addColorStop(.66,'transparent');shade.addColorStop(1,rgba(m.shade,shine*.24));
  ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle=shade;ctx.fillRect(-R,-R,2*R,2*R);ctx.restore();
  dir.addColorStop(0,'rgba(0,0,0,0)');
  dir.addColorStop(.31,rgba(m.shine,shine*.08));
  dir.addColorStop(.49-shoulder,rgba(m.shine,shine*.36));dir.addColorStop(.49,rgba(m.shine,shine));
  dir.addColorStop(.49+shoulder,rgba(m.shine,shine*.54));dir.addColorStop(.61,rgba(m.shine,shine*.11));
  dir.addColorStop(.74,'rgba(0,0,0,0)');dir.addColorStop(1,'rgba(0,0,0,0)');
  paint.save();paint.globalCompositeOperation='screen';paint.fillStyle=dir;paint.fillRect(-R,-R,2*R,2*R);paint.restore();
  if(s.lustre>.32){
   const a=s.angle+Math.PI*.25,band=paint.createLinearGradient(-Math.sin(a)*R,-Math.cos(a)*R,Math.sin(a)*R,Math.cos(a)*R);
   band.addColorStop(0,'rgba(255,255,255,0)');band.addColorStop(.45,rgba(m.shine,s.lustre*.034*s.specularGain));
   band.addColorStop(.51,rgba(m.shine,s.lustre*.12*s.specularGain));band.addColorStop(.57,rgba(m.shine,s.lustre*.03*s.specularGain));band.addColorStop(1,'rgba(255,255,255,0)');
   paint.save();paint.globalCompositeOperation='screen';paint.fillStyle=band;paint.fillRect(-R,-R,R*2,R*2);paint.restore();
  }
  if(lightLayer){
   paint.save();paint.setTransform(1,0,0,1,0,0);paint.globalCompositeOperation='destination-out';
   paint.globalAlpha=shader?.documentedRelief ? .56 : .80;
   paint.drawImage(design,0,0);paint.restore();
   ctx.save();ctx.globalCompositeOperation='screen';ctx.drawImage(lightLayer,-C,-C);ctx.restore();
  }
 }
 if(s.inspection==='raking'&&enabled(s,'light')){
  const rim=ctx.createRadialGradient(0,0,R*.65,0,0,R);
  rim.addColorStop(0,'rgba(0,0,0,0)');rim.addColorStop(.82,rgba(m.shine,.06*s.lustre));
  rim.addColorStop(.98,rgba(m.shine,.26*s.lustre*s.specularGain));rim.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=rim;ctx.fillRect(-R,-R,2*R,2*R);ctx.restore();
 }
 if(enabled(s,'patina')){
  let p=s.patina;
  if(s.finish==='historic')p=Math.max(p,.18);
  if(s.finish==='rainbow_toning'&&metalFamilia(coin)==='plata')p=Math.max(p,.19);
  if(metalFamilia(coin)==='oro')p*=.35;
  const g=ctx.createRadialGradient(0,0,R*.39,0,0,R);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.62,'rgba(0,0,0,0)');
  g.addColorStop(.87,rgba(m.patina,p*.15));g.addColorStop(1,rgba(m.patina,p*.37));
  ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle=g;ctx.fillRect(-R,-R,R*2,R*2);ctx.restore();
  if(quality!=='low'&&p>.10){
   const spotCount=Math.round(3+p*14);ctx.save();ctx.globalCompositeOperation='multiply';
   for(let i=0;i<spotCount;i++){
    const a=r()*TAU,rr=Math.sqrt(r())*R*.88,x=Math.cos(a)*rr,y=Math.sin(a)*rr,rad=8+r()*50;
    const fg=ctx.createRadialGradient(x,y,0,x,y,rad);
    fg.addColorStop(0,rgba(m.patina,p*(.07+r()*.11)));fg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=fg;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);
   }
   ctx.restore();
  }
 }
 if(enabled(s,'texture')&&quality!=='low'&&s.texture>.02){
  ctx.save();ctx.globalCompositeOperation='overlay';ctx.globalAlpha=(.06+.15*s.texture)*s.textureBoost;
  ctx.drawImage(microTile(),-R,-R,R*2,R*2);ctx.restore();
 }
 if(enabled(s,'contact')&&quality!=='low'){
  const count=Math.round((3+s.contactDensity*45)*s.contactBoost);
  ctx.save();ctx.lineCap='round';
  for(let i=0;i<count;i++){
   const a=r()*TAU,rr=Math.sqrt(r())*R*.86,x=Math.cos(a)*rr,y=Math.sin(a)*rr;
   const length=(2+r()*15)*(1+s.wear*.7),tilt=r()*TAU;
   ctx.lineWidth=.3+r()*1.2;ctx.strokeStyle=rgba(i%3===0?m.shine:m.specks,(.032+.22*s.contactDensity)*(.6+r()*.45));
   ctx.beginPath();ctx.moveTo(x-Math.cos(tilt)*length/2,y-Math.sin(tilt)*length/2);
   ctx.lineTo(x+Math.cos(tilt)*length/2,y+Math.sin(tilt)*length/2);ctx.stroke();
  }
  ctx.restore();
 }
 ctx.restore();
}
function afterDefects(){/* Reservado: los defectos Details no reciben filtros que los oculten. */}
root.NCGShaders={version:'2.1',PRESETS,options,drawRelief,renderSurface,afterDefects};
})(window);
