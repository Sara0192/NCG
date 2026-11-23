/* Motor de cuños de NCG V18.6.0, aislado del registro actual. */
(function(root){
const window={dispatchEvent(){}};
/* NCG V6.37 — shaders procedimentales 2D para monedas vectoriales.
 * No requiere WebGL, GPU, librerías ni conexión: Canvas 2D con capas de
 * iluminación, relieve acuñado, metal, pátina y microtextura.
 * Son aproximaciones artísticas, NO un motor físico de clasificación numismática.
 */
(function(root){
'use strict';
const TAU=Math.PI*2, R=398, C=430;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,Number(v)||0));
function hash(v){let h=2166136261;for(const c of String(v)){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;}
function random(seed){let x=seed>>>0;return()=>((x=Math.imul(x,1664525)+1013904223>>>0)/4294967296);}
// Los nombres comerciales de conservación no se equiparan exactamente a Sheldon.
const PRESETS={
 FDC:{wearLevel:.025,lustre:.94,grime:.01,patinaStrength:.01,texture:.14,contrast:.95},
 SC: {wearLevel:.095,lustre:.74,grime:.035,patinaStrength:.07,texture:.22,contrast:.91},
 EBC:{wearLevel:.28,lustre:.52,grime:.12,patinaStrength:.24,texture:.38,contrast:.82},
 MBC:{wearLevel:.56,lustre:.27,grime:.23,patinaStrength:.48,texture:.62,contrast:.64},
 BC: {wearLevel:.83,lustre:.08,grime:.37,patinaStrength:.70,texture:.79,contrast:.42}
};
const METALS={
 oro:{shine:'255,235,169',shade:'104,70,21',edge:'130,96,42',patina:'127,89,40',specks:'85,59,30'},
 plata:{shine:'245,252,255',shade:'60,75,92',edge:'94,103,128',patina:'86,96,113',specks:'55,70,80'},
 cobre:{shine:'255,213,165',shade:'79,49,32',edge:'69,99,84',patina:'59,100,81',specks:'65,61,45'}
};
let reliefScratch=null,textureCanvas=null,specularCanvas=null;
function specularScratch(){if(!specularCanvas){specularCanvas=document.createElement('canvas');specularCanvas.width=specularCanvas.height=860;}return specularCanvas;}
function scratch(){if(!reliefScratch){reliefScratch=document.createElement('canvas');reliefScratch.width=reliefScratch.height=860;}return reliefScratch;}
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
  specularGain:clamp(o.specularGain??1.65,0,3),contactBoost:clamp(o.contactBoost??1,0,2),textureBoost:clamp(o.textureBoost??1,0,2),
  contactDensity:clamp(o.contactDensity??o.wearLevel??.3),surfaceSeed:Number(o.surfaceSeed??0)>>>0,dieWeakness:clamp(o.dieWeakness??.1),
  inspection:o.inspection||'normal',
  angle:(Number(o.lightAngle??-48)%360)*Math.PI/180,
  mode:o.mode||'realista',finish:o.finish||'',fx:o.fx||{},
  grade:o.gradePreview||'',
 };
}
function enabled(s,k){return s.fx[k]!==false&&s.fx.all!==false;}
function rgba(rgb,a){return `rgba(${rgb},${clamp(a).toFixed(4)})`;}
/* Luz de borde: diferencia de siluetas (NO destello en screen a lo ancho).
 * La máscara sólo afecta a los bordes reales del dibujo, no a los cuarteles.
 */
function drawRelief(ctx,design,coin,side,shader,quality){
 const s=options(shader);
 if(!enabled(s,'relief')||!design)return;
 const m=METALS[coin.metal]||METALS.plata;
 const relief=(1-s.wear*.78)*(1-s.dieWeakness*.45);
 const dx=Math.cos(s.angle)*(1+1.6*relief);
 const dy=Math.sin(s.angle)*(1+1.6*relief);
 const mask=scratch(), brush=mask.getContext('2d');
 function edge(x,y,tint,opacity){
  brush.setTransform(1,0,0,1,0,0);
  brush.clearRect(0,0,860,860);
  brush.globalCompositeOperation='source-over';
  brush.drawImage(design,x,y);
  brush.globalCompositeOperation='destination-out';
  brush.drawImage(design,0,0);
  brush.globalCompositeOperation='source-in';
  brush.fillStyle=rgba(tint,1);
  brush.fillRect(0,0,860,860);
  brush.globalCompositeOperation='source-over';
  ctx.globalAlpha=opacity*relief;
  ctx.drawImage(mask,-C,-C);
 }
 ctx.save();
 edge(-dx,-dy,m.shade,.42);
 edge(dx,dy,m.shine,.48);
 ctx.restore();
}
function renderSurface(ctx,coin,side,shader,quality,planchet,design){
 const s=options(shader),m=METALS[coin.metal]||METALS.plata;
 if(s.fx.all===false)return;
 const r=random(hash(`${coin.id}|${side}|${s.surfaceSeed}|${s.finish}`));
 ctx.save();planchet(ctx);ctx.clip();
 if(enabled(s,'light')){
  // El brillo especular pertenece al campo: ocultamos el destello bajo el relieve acuñado.
  // La máscara es una capa Canvas reutilizada para no volver a los desenfoques costosos.
  const lightLayer=design&&quality!=='low'?specularScratch():null;
  const paint=lightLayer?lightLayer.getContext('2d'):ctx;
  if(lightLayer){paint.setTransform(1,0,0,1,0,0);paint.clearRect(0,0,860,860);paint.translate(C,C);}
  const cos=Math.cos(s.angle),sin=Math.sin(s.angle);
  const dir=paint.createLinearGradient(-cos*R,-sin*R,cos*R,sin*R);
  const shine=clamp((.035+.44*s.lustre)*s.metallic*s.specularGain*(1-s.wear*.50),0,.62);
  dir.addColorStop(0,'rgba(0,0,0,0)');
  dir.addColorStop(.31,rgba(m.shine,shine*.08));
  dir.addColorStop(.42,rgba(m.shine,shine*.42));dir.addColorStop(.49,rgba(m.shine,shine));
  dir.addColorStop(.54,rgba(m.shine,shine*.72));dir.addColorStop(.61,rgba(m.shine,shine*.11));
  dir.addColorStop(.74,'rgba(0,0,0,0)');dir.addColorStop(1,'rgba(0,0,0,0)');
  paint.save();paint.globalCompositeOperation='screen';paint.fillStyle=dir;paint.fillRect(-R,-R,2*R,2*R);paint.restore();
  // Brillo radial de acuñación. Mayor en SC/MS, casi nulo en MBC/BC.
  if(s.lustre>.32){
   const a=s.angle+Math.PI*.25,band=paint.createLinearGradient(-Math.sin(a)*R,-Math.cos(a)*R,Math.sin(a)*R,Math.cos(a)*R);
   band.addColorStop(0,'rgba(255,255,255,0)');band.addColorStop(.45,rgba(m.shine,s.lustre*.034*s.specularGain));
   band.addColorStop(.51,rgba(m.shine,s.lustre*.12*s.specularGain));band.addColorStop(.57,rgba(m.shine,s.lustre*.03*s.specularGain));band.addColorStop(1,'rgba(255,255,255,0)');
   paint.save();paint.globalCompositeOperation='screen';paint.fillStyle=band;paint.fillRect(-R,-R,R*2,R*2);paint.restore();
  }
  if(lightLayer){
   paint.setTransform(1,0,0,1,0,0);paint.globalCompositeOperation='destination-out';
   paint.drawImage(design,0,0);paint.globalCompositeOperation='source-over';
   ctx.save();ctx.globalCompositeOperation='screen';ctx.drawImage(lightLayer,-C,-C);ctx.restore();
  }
 }
 if(s.inspection==='raking'&&enabled(s,'light')){
  // Luz rasante: reflejo tangencial en el borde y banda que gira al mover el foco.
  const rim=ctx.createRadialGradient(0,0,R*.65,0,0,R);
  rim.addColorStop(0,'rgba(0,0,0,0)');rim.addColorStop(.82,rgba(m.shine,.06*s.lustre));
  rim.addColorStop(.98,rgba(m.shine,.26*s.lustre*s.specularGain));rim.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=rim;ctx.fillRect(-R,-R,2*R,2*R);ctx.restore();
 }
 if(enabled(s,'patina')){
  let p=s.patina;
  if(s.finish==='historic')p=Math.max(p,.18);
  if(s.finish==='rainbow_toning'&&coin.metal==='plata')p=Math.max(p,.19);
  if(coin.metal==='oro')p*=.35;
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
root.NCGShaders={version:'2.0',PRESETS,options,drawRelief,renderSurface,afterDefects};
})(window);

/* NCG · Motor de arte vectorial V4.4 · iluminación coordinada · revisión artística 2026
 * Monedas dibujadas por completo en Canvas 2D: cospel, metal, relieve acuñado,
 * leyendas, desgaste y pátina. Sin fotografías ni IA. Diseños históricos
 * reconocibles por tipo (no calcos periciales de cuños concretos).
 * API: NCGVector.render(ctx, coin, side, shader[, quality])
 *      NCGVector.renderDefect(ctx, def, metal)
 * Espacio de coordenadas: 860 x 860, centro (430,430), radio de cospel ~398.
 */
(function(root){
'use strict';
const TAU=Math.PI*2, CX=430, CY=430, R=398;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(s){let x=2166136261;for(const ch of String(s)){x^=ch.charCodeAt(0);x=Math.imul(x,16777619);}return x>>>0;}
function rng(seed){let z=seed>>>0;return()=>{z=(Math.imul(z,1664525)+1013904223)>>>0;return z/4294967296;};}

/* ---- Paletas de metal (campo y relieve) ---- */
const PAL={
 oro:{light:'#ffeaa6',mid:'#e9c469',base:'#c89a3e',deep:'#8a6420',shadow:'#57401a',
      f1:'#f2d488',f2:'#bd8f36',f3:'#9a7128',tone:'#d8a83f',patina:'#7a5a20'},
 plata:{light:'#f4ede0',mid:'#cdc8b9',base:'#a19c90',deep:'#655f56',shadow:'#393731',
      f1:'#c2c1b8',f2:'#93938c',f3:'#646661',tone:'#cdbf9d',patina:'#59574b'},
 cobre:{light:'#f2c4a2',mid:'#d09468',base:'#a96c44',deep:'#6f4128',shadow:'#472a1b',
      f1:'#dc9c6c',f2:'#8f5836',f3:'#6e4226',tone:'#b06a3a',patina:'#4e6a52'}
};
// V18.6: aleación histórica independiente de la familia de guardado/economía.
PAL.aluminio={...PAL.plata,light:'#fffefd',mid:'#dce1e4',base:'#b9c3c8',deep:'#77868e',shadow:'#4d5b61',f1:'#e9edf0',f2:'#b7c0c7',f3:'#77858c'};
PAL.cuproniquel={...PAL.plata,light:'#edf0ed',mid:'#c8cfcd',base:'#a0aaa8',deep:'#687371',shadow:'#404946',f1:'#ced7d3',f2:'#a1aba7',f3:'#6a7571'};
PAL.niquel={...PAL.cuproniquel,light:'#f4f3e7',mid:'#c9c6b6',base:'#a9a695'};
PAL.bronce_aluminio={...PAL.oro,light:'#ffe5a5',mid:'#d9b35e',base:'#b98936',deep:'#785421',shadow:'#573d20',f1:'#e7c27b',f2:'#b48b3f',f3:'#845d26'};
PAL.laton={...PAL.bronce_aluminio,base:'#c89b40',mid:'#e3ba6e',deep:'#83632c'};
const pal=m=>PAL[m]||PAL.plata;

/* ---- Ruido de metal reutilizable (textura microscópica) ---- */
let _noise=null;
function noiseTile(){
 if(_noise)return _noise;
 const c=document.createElement('canvas');c.width=c.height=160;const x=c.getContext('2d');
 const id=x.createImageData(160,160);const r=rng(777);
 for(let i=0;i<id.data.length;i+=4){const v=110+r()*90;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255;}
 x.putImageData(id,0,0);_noise=c;return c;
}

/* ---- Helpers de trazado ---- */
function poly(ctx,pts){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();}
function smooth(ctx,pts){ // curva cerrada suave por puntos (catmull-rom -> bezier)
 ctx.beginPath();const n=pts.length;ctx.moveTo((pts[0][0]+pts[n-1][0])/2,(pts[0][1]+pts[n-1][1])/2);
 for(let i=0;i<n;i++){const p=pts[i],q=pts[(i+1)%n];ctx.quadraticCurveTo(p[0],p[1],(p[0]+q[0])/2,(p[1]+q[1])/2);}
 ctx.closePath();
}
function circle(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,TAU);}
function ell(ctx,x,y,rx,ry,rot=0){ctx.beginPath();ctx.ellipse(x,y,Math.abs(rx),Math.abs(ry),rot,0,TAU);}

/* ---- Iluminación coherente para metal, bisel, contornos y letras ----
 * Un solo vector para todos los sistemas. Se recalcula por render, no se
 * persiste; mover la lámpara no altera datos, economía ni semilla de partida.
 */
let _LX=Math.cos(-48*Math.PI/180),_LY=Math.sin(-48*Math.PI/180);
const setLightFromShader=s=>{
 const degrees=Number(s&&s.lightAngle);
 const a=(Number.isFinite(degrees)?degrees:-48)*Math.PI/180;
 _LX=Math.cos(a);_LY=Math.sin(a);
};
const lightGradient=(ctx,scale=210)=>ctx.createLinearGradient(-_LX*scale,-_LY*scale,_LX*scale,_LY*scale);
/* Relieve: sombra de contacto fina, cuerpo de metal y bisel recortado.
 * No se duplican siluetas iluminadas completas fuera de su contorno. */
function emboss(ctx,trace,p,o={}){
 const off=(o.off??4.5)*(1-_W*.55);
 const hi=(o.hi??1)*(1-_W*.7),sh=(o.sh??1)*(1-_W*.35),body=(o.body??true);
 // La sombra se coloca al lado opuesto de la única dirección de luz.
 ctx.save();ctx.translate(-_LX*off,-_LY*off);
 ctx.globalAlpha=.64*sh;ctx.fillStyle=p.shadow;trace(ctx);ctx.fill();ctx.restore();
 if(!body)return;
 ctx.save();
 const g=lightGradient(ctx,245);
 g.addColorStop(0,p.deep);g.addColorStop(.39,p.base);g.addColorStop(.71,p.mid);g.addColorStop(1,p.light);
 ctx.fillStyle=g;trace(ctx);ctx.fill();
 // Bisel iluminado sólo dentro del motivo y del lado de la lámpara.
 ctx.save();trace(ctx);ctx.clip();
 ctx.translate(_LX*Math.min(off,3.5),_LY*Math.min(off,3.5));
 ctx.globalAlpha=.28*hi;ctx.lineWidth=(o.lw??2)*2.0;
 ctx.strokeStyle=p.light;ctx.lineJoin='round';ctx.lineCap='round';trace(ctx);ctx.stroke();
 ctx.restore();
 ctx.globalAlpha=o.outer?.67:.48;
 ctx.strokeStyle=p.deep;ctx.lineWidth=o.outer?(o.lw??2)*1.75:(o.lw??2)*.85;
 ctx.lineJoin='round';ctx.lineCap='round';trace(ctx);ctx.stroke();
 ctx.restore();
}
/* Línea positiva: un lado oscuro, el opuesto claro (según lámpara). */
function rline(ctx,pts,p,w=4,o={}){
 if(!pts.length)return;
 const fine=clamp(1-Math.max(0,_W-.14)*1.33,.06,1);
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 const stroke=(x,y,width,color,alpha)=>{
  ctx.beginPath();ctx.moveTo(pts[0][0]+x,pts[0][1]+y);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0]+x,pts[i][1]+y);
  ctx.lineWidth=width;ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.stroke();
 };
 stroke(-_LX*1.65,-_LY*1.65,w+1.25,p.shadow,.60*fine);
 stroke(_LX*1.25,_LY*1.25,w*.66,p.light,.87*(o.hi??1)*fine);
 stroke(0,0,w*.55,p.mid,.89*fine);
 ctx.restore();
}
/* Línea incusa, con luz al lado opuesto del relieve positivo. */
function iline(ctx,pts,p,w=2.5){
 if(!pts.length)return;
 const fine=clamp(1-Math.max(0,_W-.18)*1.45,.04,1);
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 const draw=(x,y,color,width,alpha)=>{
  ctx.beginPath();ctx.moveTo(pts[0][0]+x,pts[0][1]+y);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0]+x,pts[i][1]+y);
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.stroke();
 };
 draw(-_LX*1.05,-_LY*1.05,p.light,w*.65,.6*fine);
 draw(0,0,p.deep,w,.85*fine);
 ctx.restore();
}
/* curva abierta suave (catmull-rom muestreada) para detalles incusos */
function curvePts(pts,seg=7){
 const P=[pts[0],...pts,pts[pts.length-1]],out=[];
 for(let i=1;i<P.length-2;i++){const p0=P[i-1],p1=P[i],p2=P[i+1],p3=P[i+2];
  for(let j=0;j<seg;j++){const t=j/seg,t2=t*t,t3=t2*t;
   out.push([.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
             .5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}
 out.push(pts[pts.length-1]);return out;
}
const icurve=(ctx,pts,p,w)=>iline(ctx,curvePts(pts),p,w);
function dot(ctx,x,y,r,p){emboss(ctx,c=>circle(c,x,y,r),p,{off:1.6,blur:.7});}

/* ---- Texto en relieve con espaciado óptico basado en ancho real ---- */
const _glyphWidths=new Map();
function glyphFont(size,weight){return `${weight??700} ${size}px Georgia, 'Times New Roman', 'Noto Serif CJK JP', 'Yu Mincho', 'MS Mincho', serif`;}
function measureGlyph(ctx,ch,size,weight){
 const key=`${size}|${weight??700}|${ch}`;
 if(_glyphWidths.has(key))return _glyphWidths.get(key);
 ctx.font=glyphFont(size,weight);
 const width=Math.max(size*.18,ctx.measureText(ch).width||size*.55);
 if(_glyphWidths.size>3000)_glyphWidths.clear();
 _glyphWidths.set(key,width);return width;
}
function glyph(ctx,ch,x,y,size,p,rot=0,o={}){
 ctx.save();ctx.translate(x,y);ctx.rotate(rot);
 ctx.font=glyphFont(size,o.weight);
 ctx.textAlign='center';ctx.textBaseline='middle';
 const wear=clamp(1-Math.max(0,_W-.22)*(1.04+((hash(ch+':'+Math.round(x)+':'+Math.round(y))%17)/100)),.20,1);
 const off=(o.off??2.0)*(1-_W*.55);
 ctx.fillStyle=p.shadow;ctx.globalAlpha=.65*wear;
 ctx.fillText(ch,-_LX*off,-_LY*off);
 ctx.fillStyle=p.light;ctx.globalAlpha=.83*(o.hi??1)*(1-_W*.7)*wear;
 ctx.fillText(ch,_LX*off*.65,_LY*off*.65);
 const g=lightGradient(ctx,size*.62);
 g.addColorStop(0,p.deep);g.addColorStop(.45,p.base);g.addColorStop(1,p.light);
 ctx.fillStyle=g;ctx.globalAlpha=wear;ctx.fillText(ch,0,0);
 ctx.restore();
}
/* Arco óptico: la I y la M no consumen el mismo ángulo.
 * Se respeta la anchura relativa y se limita la expansión excesiva de o.span.
 * Un texto muy largo conserva suficiente espacio, sin solapar letras. */
function legend(ctx,str,radius,start,size,p,o={}){
 const chars=Array.from(String(str||'')),n=chars.length;if(!n)return;
 ctx.save();
 const widths=chars.map(ch=>measureGlyph(ctx,ch,size,o.weight));
 const glyphTotal=widths.reduce((a,b)=>a+b,0),space=Math.max(size*.065,.8);
 const minSpan=(glyphTotal+space*(n-1))/Math.max(80,radius);
 const desired=o.span??Math.min(2.9,n*(o.pitch??.082));
 const span=clamp(desired,minSpan*1.035,Math.max(minSpan*1.28,minSpan+.045));
 const extra=Math.max(0,(span*radius-glyphTotal)/(Math.max(1,n-1)));
 const orientation=o.bottom?-1:1;
 let cursor=-span*radius/2;
 for(let i=0;i<n;i++){
  const ar=(cursor+widths[i]*.5)/Math.max(radius,80),a=start+orientation*ar;
  glyph(ctx,chars[i],Math.sin(a)*radius,-Math.cos(a)*radius,size,p,o.bottom?a+Math.PI:a,{hi:o.hi,off:o.off,weight:o.weight});
  cursor+=widths[i]+extra;
 }
 ctx.restore();
}
function text(ctx,str,x,y,size,p,o={}){
 const chars=Array.from(String(str||''));
 const widths=chars.map(ch=>measureGlyph(ctx,ch,size,o.weight));
 const tracking=size*Math.max(.022,(o.pitch??.62)-.57);
 const width=widths.reduce((sum,val)=>sum+val,0)+tracking*Math.max(0,chars.length-1);
 let cursor=x-width/2;
 for(let i=0;i<chars.length;i++){
  glyph(ctx,chars[i],cursor+widths[i]/2,y,size,p,0,o);
  cursor+=widths[i]+tracking;
 }
}

/* ---- Estado global de render (calidad y desgaste) ---- */
let _Q=1, _W=0;
const ANCIENT=new Set(['denario_elephante_Cesar','denario_m_marcius_134ac','athens_tetradrachm','byzantium_solidus_justinian','aureo_adriano','8_reales_macuquina_Carlos_II','real_reyes_catolicos_1497']);
const isHammered=c=>ANCIENT.has(c.id)||!!c.ancient||c.edgeType==='martillado_irregular';

/* Desgaste mecánico de puntos altos del cuño: erosión de la capa de
 * relieve VECTORIAL, antes de componerla sobre el campo. Los huecos dejan
 * ver el metal sin borrar pátina ni la silueta del cospel. Semilla estable.
 * No representa una medición física del relieve de una moneda real. */
function abradeRelief(ctx,coin,side,w){
 if(w<.27)return;
 const intensity=clamp((w-.27)/.73,0,1);
 const r=rng(hash(coin.id+':'+side+':abrasion-v3'));
 ctx.save();ctx.globalCompositeOperation='destination-out';
 const count=Math.round(10+intensity*65);
 for(let k=0;k<count;k++){
  const a=r()*TAU,rr=Math.sqrt(r())*(k%4===0?310:210);
  const x=Math.cos(a)*rr,y=Math.sin(a)*rr;
  const radius=(2.5+r()*(7+intensity*10))*(k%4===0?1.15:1);
  ctx.globalAlpha=(.03+.21*intensity)*(.65+r()*.35);
  ctx.save();ctx.translate(x,y);ctx.rotate(r()*TAU);
  ctx.beginPath();ctx.ellipse(0,0,radius*(.65+r()*.65),radius*(.42+r()*.37),0,0,TAU);ctx.fill();ctx.restore();
 }
 // Zona de rozamiento continua por contacto en los altos (centro y leyendas).
 for(const [x,y,rx,ry,weight] of [[0,-45,115,90,.13],[0,85,110,75,.13],[-200,-215,60,27,.10],[200,-215,60,27,.10]]){
  const grad=ctx.createRadialGradient(x,y,4,x,y,rx);
  grad.addColorStop(0,`rgba(0,0,0,${(intensity*weight).toFixed(3)})`);
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=1;ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);ctx.fillStyle=grad;
  ctx.fillRect(-410,-410,820,820);ctx.restore();
 }
 ctx.restore();
}

/* ---- Cospel (contorno) ---- */
function makePlanchet(rnd,hammered){
 const pts=[],radii=[];const n=hammered?30:64;
 const irr=hammered?.094:.006;
 const ph=rnd()*TAU, ph2=rnd()*TAU;
 for(let i=0;i<n;i++){const a=i/n*TAU;
  const r=R*(1+irr*(Math.sin(a*3+ph)*.6+Math.sin(a*5+ph2)*.4)+(hammered?(rnd()-.5)*.022:0));
  radii.push(r);pts.push([Math.cos(a)*r,Math.sin(a)*r]);}
 const trace=ctx=>smooth(ctx,pts);
 // radio real del cospel en un ángulo: la gráfila debe seguir el contorno, no un círculo
 trace.radiusAt=a=>{let t=((a%TAU)+TAU)%TAU/TAU*n;const i0=Math.floor(t)%n,i1=(i0+1)%n,f=t-Math.floor(t);
  return radii[i0]*(1-f)+radii[i1]*f;};
 return trace;
}
/* ---- Campo metálico ---- */
function drawField(ctx,p,planchet,shader,rnd){
 ctx.save();planchet(ctx);ctx.clip();
 const g=ctx.createRadialGradient(_LX*R*.26,_LY*R*.26,R*.045,-_LX*R*.18,-_LY*R*.18,R*1.35);
 g.addColorStop(0,p.f1);g.addColorStop(.56,p.f2);g.addColorStop(1,p.f3);
 ctx.fillStyle=g;ctx.fillRect(-CX,-CY,CX*2,CY*2);
 const s=lightGradient(ctx,R);
 s.addColorStop(0,'rgba(0,0,0,.14)');s.addColorStop(.28,'rgba(0,0,0,.04)');
 s.addColorStop(.59,'rgba(255,255,255,.045)');s.addColorStop(1,'rgba(255,255,255,.10)');
 ctx.fillStyle=s;ctx.fillRect(-CX,-CY,CX*2,CY*2);
 // Resplandor de acuñación que gira exactamente con el foco.
 const lu=clamp(shader.lustre??.4,0,1);
 if(lu>.2){ctx.save();ctx.rotate(Math.atan2(_LY,_LX));ctx.globalCompositeOperation='screen';ctx.globalAlpha=lu*.045;
  for(let k=0;k<6;k++){ctx.rotate(TAU/6);const wg=ctx.createLinearGradient(0,0,R,0);
   wg.addColorStop(0,'rgba(255,255,255,0)');wg.addColorStop(.55,'rgba(255,255,255,.50)');wg.addColorStop(1,'rgba(255,255,255,0)');
   ctx.fillStyle=wg;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(R,-R*.12);ctx.lineTo(R,R*.12);ctx.closePath();ctx.fill();}
  ctx.restore();}
 ctx.restore();
}
/* ---- Borde / gráfila ---- */
function drawRim(ctx,p,coin,hammered,rnd,w,planchet){
 ctx.save();
 const ring=(inset)=>{const k=(R-inset)/R;ctx.save();ctx.scale(k,k);planchet(ctx);ctx.restore();};
 // anillo de borde elevado, siguiendo el contorno real del cospel
 ctx.lineWidth=hammered?3.8:7.4;const rg=lightGradient(ctx,R);
 rg.addColorStop(0,p.light);rg.addColorStop(.5,p.mid);rg.addColorStop(1,p.deep);
 ctx.strokeStyle=rg;ring(hammered?3:5);ctx.stroke();
 ctx.lineWidth=2;ctx.strokeStyle=p.shadow;ctx.globalAlpha=.5;ring(hammered?7:12);ctx.stroke();
 ctx.globalAlpha=1;
 const et=coin.edgeType||'liso';
 const yearNumber=parseInt(String(coin.year||''),10);
 const oldDotted=coin.ancient===true || (Number.isFinite(yearNumber)&&yearNumber<1790&&!/estriado|cordoncillo|flores_lis/i.test(et));
 const rAt=a=>planchet&&planchet.radiusAt?planchet.radiusAt(a):R;
 if(!hammered&&!oldDotted){
  const n= et==='estriado'?150:120;
  for(let i=0;i<n;i++){const a=i/n*TAU,rr=rAt(a)-26;
   ctx.save();ctx.translate(Math.cos(a)*rr,Math.sin(a)*rr);ctx.rotate(a);
   if(_Q)emboss(ctx,c=>{c.beginPath();c.rect(-2.2,-7,4.4,14);},p,{off:1.2,blur:.5});else {ctx.fillStyle=p.deep;ctx.fillRect(-1,-5,2,10);}
   ctx.restore();}
 } else {
  const n=hammered?54:84;for(let i=0;i<n;i++){if(hammered&&rnd()<.28)continue;const a=i/n*TAU+(hammered?(rnd()-.5)*.065:0),rr=rAt(a)-(hammered?22:27);
   dot(ctx,Math.cos(a)*rr,Math.sin(a)*rr,hammered?2.1:2.0,p);}
 }
 ctx.restore();
}
/* ---- Pátina / suciedad ligera (el juego añade más encima) ---- */
function drawPatina(ctx,p,shader,rnd,planchet){
 const gr=clamp(shader.grime??0,0,.65);
 ctx.save();planchet(ctx);ctx.clip();
 if(gr>.02){ctx.globalCompositeOperation='multiply';ctx.globalAlpha=gr*.5;
  const g=ctx.createRadialGradient(R*.2,R*.25,R*.1,0,0,R);
  g.addColorStop(0,'rgba(120,100,70,.5)');g.addColorStop(.7,'rgba(90,75,55,.25)');g.addColorStop(1,'rgba(60,50,40,.5)');
  ctx.fillStyle=g;ctx.fillRect(-CX,-CY,CX*2,CY*2);}
 // toning periférico en plata histórica
 if(shader.finish==='historic'||shader.finish==='washed_silver'){
  ctx.globalCompositeOperation='overlay';ctx.globalAlpha=.18;
  const t=ctx.createRadialGradient(0,0,R*.6,0,0,R);
  t.addColorStop(0,'rgba(0,0,0,0)');t.addColorStop(.8,p.tone);t.addColorStop(1,p.patina);
  ctx.fillStyle=t;ctx.fillRect(-R,-R,R*2,R*2);}
 ctx.restore();
}
/* ---- Grano de metal ---- */
function drawGrain(ctx,planchet,alpha){
 ctx.save();planchet(ctx);ctx.clip();
 ctx.globalCompositeOperation='overlay';ctx.globalAlpha=alpha;
 const n=noiseTile();ctx.drawImage(n,-R,-R,R*2,R*2);
 ctx.restore();
}

/* Micrograbado direccional dependiente de cada cuño digital. No modifica el
 * contorno, las leyendas ni la aleatoriedad económica. Se limita a la opacidad
 * ya existente con source-atop; rendimiento constante y sin filtros. */
function engraveRelief(ctx,coin,side,w,quality){
 if(w>.73)return;
 const random=rng(hash(coin.id+':'+side+':buril-2026'));
 const n=quality==='low'?8:21;
 ctx.save();ctx.globalCompositeOperation='source-atop';
 ctx.lineCap='round';ctx.lineWidth=quality==='low'?.72:.9;
 for(let i=0;i<n;i++){
  const a=random()*TAU, r=Math.sqrt(random())*244;
  const x=Math.cos(a)*r,y=Math.sin(a)*r;
  const len=6+random()*13, rot=a+.8+(random()-.5)*.6;
  ctx.strokeStyle=i%3===0?'rgba(255,255,255,.13)':'rgba(12,20,23,.12)';
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+len*Math.cos(rot),y+len*Math.sin(rot));ctx.stroke();
 }
 ctx.restore();
}

// Cada cara conserva sus rutas de talla en su propio módulo. Las máscaras
// representan las pendientes del relieve en cuatro direcciones y siguen la luz.
const dieFaces=new Map(), compiledFaces=new Map();
let motifCanvas=null;
function registerDie(id,side,data){dieFaces.set(id+'|'+side,data);}
function finishDie(ctx,p,id,side,wear,lx,ly){
 const key=id+'|'+side, data=dieFaces.get(key);
 if(!data)return;
 let paths=compiledFaces.get(key);
 if(!paths){
  paths=data[0].map(d=>new Path2D(d));
  if(compiledFaces.size>=12)compiledFaces.delete(compiledFaces.keys().next().value);
  compiledFaces.set(key,paths);
 }
 ctx.save();ctx.globalCompositeOperation='source-atop';
 const weights=[lx,-lx,ly,-ly];
 for(let i=0;i<4;i++){
  const weight=weights[i];
  ctx.fillStyle=weight>0?p.light:p.shadow;
  ctx.globalAlpha=Math.abs(weight)*(weight>0?.49:.40)*(1-wear*.75);
  ctx.fill(paths[i],'evenodd');
 }
 ctx.restore();
 const frame=data[1];
 if(!frame)return;
 // Agrandar el motivo solo cuando hay un anillo vacío medido hasta la leyenda.
 const [radius,scale]=frame;
 if(!motifCanvas){motifCanvas=document.createElement('canvas');motifCanvas.width=motifCanvas.height=860;}
 const copy=motifCanvas.getContext('2d');
 copy.clearRect(0,0,860,860);
 copy.save();circle(copy,430,430,radius);copy.clip();copy.drawImage(ctx.canvas,0,0);copy.restore();
 ctx.save();circle(ctx,0,0,radius);ctx.clip();ctx.clearRect(-430,-430,860,860);ctx.restore();
 ctx.drawImage(motifCanvas,-430*scale,-430*scale,860*scale,860*scale);
}
root.NCGDieFinish={register:registerDie,draw:finishDie};


/* NCG V18.6 · Motivos de restauración histórica (vectores, no bitmaps).
 * Se añaden únicamente a tipos cuya ornamentación está documentada en su ficha.
 * Los motivos quedan en su propio plano y respetan el relieve/desgaste del motor.
 */
const HISTORIC_WREATHS={
 '1fr_helvetia_1861':{kind:'oakAlpine',side:1},
 '2fr_helvetia_1860':{kind:'oakAlpine',side:1},
 '5fr_luisfelipe_1831':{kind:'laurelOlive',side:1},
 '20fr_ceres_1851':{kind:'laurelOlive',side:1},
 '1lira_vittorio2_1863':{kind:'oak',side:1},
 '5lire_vittorio2_1873':{kind:'laurel',side:1,scale:.92},
 '5lire_umberto1_1879':{kind:'laurel',side:1,scale:.91},
 'india_rupee_1840':{kind:'laurel',side:1},
 'rupia_victoria_reina_1862':{kind:'laurel',side:1},
 '500reis_carlos1_1892':{kind:'laurel',side:1,scale:.84},
 '5fr_leopoldo2_1870':{kind:'laurel',side:1,scale:.91},
 '5fr_helvetia_1907':{kind:'oakAlpine',side:1,scale:.90},
};
function historicBotanicalWreath(ctx,p,kind='laurel',scale=1){
 ctx.save();ctx.scale(scale,scale);
 // Dos tallos separados, no un óvalo de óvalos: cada hoja sigue la tangente.
 const signed=[-1,1];
 for(const sign of signed){
  const nodes=[];
  for(let i=0;i<=22;i++){const t=i/22;
   const x=sign*(7+212*Math.sin(t*1.25));
   const y=225-421*t;
   nodes.push([x,y]);
  }
  rline(ctx,nodes,p,4.3);
  for(let i=1;i<=18;i++){
   const t=i/19,ang=sign*(-.47-.65*t),x=sign*(7+212*Math.sin(t*1.25)),y=225-421*t;
   const oak=kind==='oak'||(kind==='oakAlpine'&&sign===-1),
    leafLen=oak?(22+(i%4)*2.5):(27+(i%3)*2.5);
   for(const branch of [-1,1]){
    const px=x+sign*branch*(12+(i%2)*2),py=y+(branch*6),theta=ang+(branch>0?1:-1)*.58;
    ctx.save();ctx.translate(px,py);ctx.rotate(theta);
    const trace=c=>{c.beginPath();c.moveTo(0,0);
     if(oak){c.bezierCurveTo(-leafLen*.56,-6,-leafLen*.50,-leafLen*.62,-1,-leafLen);
      c.bezierCurveTo(7,-leafLen*.78,7,-leafLen*.58,9,-leafLen*.48);
      c.bezierCurveTo(17,-leafLen*.47,10,-leafLen*.20,0,0);}
     else{c.bezierCurveTo(-13,-leafLen*.23,-13,-leafLen*.75,0,-leafLen);
      c.bezierCurveTo(12,-leafLen*.84,14,-leafLen*.27,0,0);}
     c.closePath();};
    emboss(ctx,trace,p,{off:1.2,lw:.8});
    rline(ctx,[[0,-3],[0,-leafLen*.78]],p,.8);
    if(oak){for(let q=1;q<=3;q++){const yy=-leafLen*(.2+q*.16);
      rline(ctx,[[0,yy],[(-1)**q*8,yy-6]],p,.6);}}
    ctx.restore();
   }
   if(kind==='oakAlpine'&&sign===1&&i%4===0){
    // Roseta alpina de cinco pétalos, alternada con laurel.
    const xx=x+sign*16, yy=y-15;
    for(let k=0;k<5;k++){ctx.save();ctx.translate(xx,yy);ctx.rotate(k*TAU/5);
     emboss(ctx,z=>ell(z,0,-9,4.0,7.1,-.1),p,{off:.6,lw:.6});ctx.restore();}
    dot(ctx,xx,yy,2.6,p);
   }
  }
 }
 // Lazo en relieve, nudo y extremos, separado del campo del valor.
 emboss(ctx,z=>{z.beginPath();z.moveTo(-4,223);z.bezierCurveTo(-27,205,-55,201,-45,229);
  z.bezierCurveTo(-28,241,-15,235,0,226);z.bezierCurveTo(20,234,40,239,49,224);
  z.bezierCurveTo(44,205,18,208,4,221);z.closePath();},p,{off:1.3,lw:1.2});
 for(const sig of [-1,1]){emboss(ctx,z=>poly(z,[[sig*2,233],[sig*17,239],[sig*28,258],[sig*11,250]]),p,{off:1.0,lw:.6});}
 ctx.restore();
}
function historicVisualCorrection(ctx,p,id,side){
 const wreath=HISTORIC_WREATHS[id];
 if(wreath&&wreath.side===side)historicBotanicalWreath(ctx,p,wreath.kind,wreath.scale||1);
}

/* ---- Render principal ---- */
/* Lienzo de trabajo reutilizado: evita crear 3 MB por cada moneda dibujada
   (con 129 miniaturas seguidas el navegador se quedaba sin memoria). */
let _design=null;
function designLayer(){
 if(!_design){_design=document.createElement('canvas');_design.width=_design.height=860;}
 return _design;
}
function render(ctx,coin,side,shader={},quality='high'){
 if(!coin)return;
 const p=pal(coin.metalVisual||coin.metal);
 const rnd=rng(hash(coin.id+':'+side));
 const w=clamp(Number(shader.wearLevel??.2),0,1);
 const hammered=isHammered(coin);
 _Q=quality==='low'?0:1; _W=w;
 setLightFromShader(shader);
 ctx.save();
 ctx.clearRect(0,0,860,860);
 ctx.translate(CX,CY);
 const planchet=makePlanchet(rnd,hammered);
 drawField(ctx,p,planchet,shader,rnd);
 ctx.save();planchet(ctx);ctx.clip();
 drawRim(ctx,p,coin,hammered,rnd,w,planchet);
 // capa de diseño en offscreen
 const design=designLayer();
 const dctx=design.getContext('2d');
 dctx.setTransform(1,0,0,1,0,0);dctx.clearRect(0,0,860,860);dctx.translate(CX,CY);
 if(coin.ancient&&shader.dieOffset){
  const offset=shader.dieOffset;
  dctx.translate(Math.max(-10,Math.min(10,Number(offset.x)||0)),Math.max(-10,Math.min(10,Number(offset.y)||0)));
 }
 const D=DESIGNS[coin.id];const fn=D?D[side]:null;
 if(fn)fn(dctx,p,{w,rnd,coin,shader});
 else if(coin.vec){const sp=coin.vec[side?'rev':'obv'];if(sp)renderSpec(dctx,p,sp,{w,rnd,coin,shader});}
 historicVisualCorrection(dctx,p,coin.id,side);
 // El relieve pierde geometría y líneas finas; no se desenfoca la moneda.
 // La geometría de cada cara define por sí sola los motivos del cuño.
 // Refuerzo de trama incusa solo SOBRE el relieve existente, sin añadir marcas en el campo.
 // 129 diseños reciben textura específica estable; no altera las pistas de autenticidad.
 if(root.NCGDieFinish)root.NCGDieFinish.draw(dctx,p,coin.id,side,w,_LX,_LY);
 abradeRelief(dctx,coin,side,w);
 ctx.drawImage(design,-CX,-CY);
 if(root.NCGShaders)root.NCGShaders.drawRelief(ctx,design,coin,side,shader,quality);
 drawPatina(ctx,p,shader,rnd,planchet);
 if(root.NCGShaders)root.NCGShaders.renderSurface(ctx,coin,side,shader,quality,planchet,design);
 ctx.restore();
 if(_Q&&!root.NCGShaders)drawGrain(ctx,planchet,.05);
 if(coin.hole)punchHole(ctx,p,coin);
 ctx.restore();
 _Q=1;_W=0;
}

/* ================= COMPONENTES ================= */
/* ---- Busto de perfil paramétrico (mira a la derecha; mirror para izquierda) ----
 cfg: {nose, chin, brow, skull, neck, jaw, lip, ear, hair, beard, moustache,
       laurel, diadem, crown, veil, wig, braid, helmet, feathers, drape, armor, female} */
function head(ctx,p,cfg={}){
 const c=Object.assign({nose:1,chin:1,brow:1,skull:1,neck:1,jaw:1,lip:1,hair:'short',drape:'toga'},cfg);
 ctx.save();
 if(c.mirror)ctx.scale(-1,1);
 const N=c.nose,Ch=c.chin,B=c.brow;
 const beardDepth=c.franzPortrait?0:({short:4,full:13,long:25,pointed:17}[c.beard]||0);
 const tip=86+N*26, chin=76+Ch*16, brow=76+B*4;
 // busto completo: nuca, cráneo, perfil, mandíbula, cuello y truncamiento
 const face=x=>{
  x.beginPath();
  x.moveTo(-100,182);
  x.bezierCurveTo(-92,150,-80,124,-74,100);
  x.bezierCurveTo(-70,60,-72,20,-88,-20);
  x.bezierCurveTo(-100,-40,-110,-40,-108,-56);
  x.bezierCurveTo(-100,-118,-58,-162,-4,-168);
  x.bezierCurveTo(42,-172,70,-142,brow,-108);
  x.bezierCurveTo(brow+4,-96,brow+2,-88,brow+4,-82);
  x.bezierCurveTo(brow+8,-74,84,-68,86,-62);
  x.bezierCurveTo(92,-54,tip-8,-44,tip,-34);
  x.bezierCurveTo(tip+4,-30,tip-2,-25,tip-10,-24);
  x.bezierCurveTo(96,-22,90,-22,88,-18);
  x.bezierCurveTo(94,-14,96,-8,92,-4);
  x.bezierCurveTo(88,0,88,2,92,6);
  x.bezierCurveTo(96,10,94,16,88,20);
  x.bezierCurveTo(84,24,chin-6,30,chin,36);
  x.bezierCurveTo(chin+4,44+beardDepth*.35,chin-4,52+beardDepth,chin-16,56+beardDepth);
  x.bezierCurveTo(56,64+beardDepth*.65,36,72+beardDepth*.28,30,92);
  x.bezierCurveTo(30,104,42,112,58,120);
  x.bezierCurveTo(82,130,104,150,118,182);
  x.closePath();
 };
 emboss(ctx,face,p,{off:3.6});
 // Planos de sien, mejilla y cuello recortados al perfil del busto.
 ctx.save();face(ctx);ctx.clip();
 for(const [x,y,rx,ry,light,alpha] of [[39,-43,51,38,true,.34],[-1,-73,43,48,false,.23],[20,44,56,26,false,.30],[66,-114,30,39,true,.24],[18,111,43,57,true,.22]]){
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
  const plane=ctx.createRadialGradient(0,0,0,0,0,1);
  plane.addColorStop(0,light?p.light:p.deep);plane.addColorStop(1,light?'rgba(245,237,221,0)':'rgba(48,39,28,0)');
  ctx.fillStyle=plane;ctx.globalAlpha=alpha*(1-_W*.6);ctx.fillRect(-1,-1,2,2);ctx.restore();
 }
 ctx.restore();
 // drapeado o coraza sobre el truncamiento
 if(!c.armor){
  icurve(ctx,[[-66,156],[-24,130],[22,144]],p,2.4);
  icurve(ctx,[[6,174],[40,146],[76,164]],p,2.4);
  rline(ctx,[[-34,116],[10,130],[48,120]],p,3);
 } else {
  rline(ctx,[[-72,132],[0,120],[82,136]],p,4);
  icurve(ctx,[[-40,156],[0,144],[52,158]],p,2.4);
  dot(ctx,0,154,5,p);
 }
 // ceja y ojo almendrado
 icurve(ctx,[[42,-84],[58,-88],[74,-80]],p,2.4);
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.5;
 ctx.beginPath();ctx.moveTo(48,-68);ctx.quadraticCurveTo(60,-78,72,-68);
 ctx.quadraticCurveTo(60,-60,48,-68);ctx.closePath();ctx.fill();ctx.restore();
 icurve(ctx,[[48,-68],[60,-77],[72,-68]],p,1.8);
 icurve(ctx,[[50,-67],[60,-61],[71,-67]],p,1.2);
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.8;circle(ctx,61,-69,3.1);ctx.fill();ctx.restore();
 dot(ctx,60.2,-70,1.3,p);
 // Buril retratístico: pómulo, pliegue nasolabial, párpado y masa malar.
 // Grabado ligero que diferencia volúmenes sin recurrir a filtros de desenfoque.
 if(_W<.58){
  icurve(ctx,[[36,-53],[44,-45],[43,-33]],p,1.0);
  icurve(ctx,[[29,-36],[43,-30],[51,-19]],p,1.0);
  icurve(ctx,[[40,-11],[49,-6],[53,5]],p,.9);
  icurve(ctx,[[67,-82],[76,-80],[79,-76]],p,.9);
  icurve(ctx,[[-49,27],[-44,66],[-20,94]],p,.9);
 }
 // nariz, labios y mentón
 icurve(ctx,[[84,-58],[94,-44],[tip-4,-35]],p,1.4);
 iline(ctx,[[tip-12,-28],[tip-4,-27]],p,1.8);
 icurve(ctx,[[86,-14],[94,-6],[88,0],[93,7],[86,13]],p,1.7);
 icurve(ctx,[[66,26],[78,30],[84,26]],p,1.4);
 icurve(ctx,[[52,58],[68,54],[78,48]],p,1.3);
 // oreja
 emboss(ctx,x=>{x.beginPath();x.moveTo(-26,-46);
  x.bezierCurveTo(-8,-52,-2,-38,-6,-24);
  x.bezierCurveTo(-9,-12,-16,-6,-24,-12);
  x.bezierCurveTo(-30,-18,-32,-38,-26,-46);x.closePath();},p,{off:1.6,blur:.6});
 icurve(ctx,[[-23,-40],[-13,-36],[-14,-24],[-20,-18]],p,1.5);
 iline(ctx,[[-24,-30],[-18,-28]],p,1.2);
 // pelo, barba y tocados
 hair(ctx,p,c);
 if(c.sideburns){emboss(ctx,x=>smooth(x,[[-36,-45],[-13,-43],[-16,-6],[-35,7],[-43,-9]]),p,{off:1.5});for(let i=0;i<3;i++)iline(ctx,[[-32+i*6,-21],[-33+i*6,-4]],p,1);}
 if(beardDepth){ctx.save();face(ctx);ctx.clip();beard(ctx,p,c);ctx.restore();}
 if(c.moustache)moustache(ctx,p,c);
 if(c.laurel)laurelWreathHead(ctx,p);
 if(c.diadem)diadem(ctx,p);
 if(c.crown)crownHead(ctx,p,c.crown);
 if(c.veil)veil(ctx,p);
 if(c.franzPortrait){
  // Francisco José I: patillas extensas, barba imperial bifurcada, nariz larga
  // y uniforme con galones. Abstracción vectorial, no reproducción del cuño.
  // La barba imperial real cae desde las patillas; el mentón queda más despejado.
  // Patilla continua delante de la oreja. El mentón queda libre.
  ctx.save();face(ctx);ctx.clip();
  for(let i=0;i<9;i++){
   const start=-37+i*2.8;
   icurve(ctx,[[start,-17],[start+2,-2],[start+6,15],[start+14,29],[start+18,43-i*.6]],p,2.1);
  }
  ctx.restore();
  icurve(ctx,[[44,-55],[61,-59],[81,-51]],p,1.9);
  icurve(ctx,[[64,-12],[94,-23],[105,-9]],p,2.6);
  icurve(ctx,[[38,118],[4,144],[-41,137]],p,3.1);
  for(const sg of [-1,1]){
   const x=sg*63;
   emboss(ctx,z=>ell(z,x,151,16,10,sg*.38),p,{off:1.3});
   for(let j=0;j<3;j++)iline(ctx,[[x-8+j*8,149],[x-8+j*8,159]],p,1.1);
  }
 }
 ctx.restore();
}
function hair(ctx,p,c){
 const s=c.hair;
 if(s==='wig'){ // peluquín largo con rizos (s. XVIII)
  emboss(ctx,x=>smooth(x,[[-112,-20],[-118,-80],[-92,-138],[-40,-168],[20,-160],[52,-130],[40,-110],[10,-128],[-30,-120],[-70,-90],[-84,-30],[-92,40],[-108,60]]),p,{off:3});
  for(let i=0;i<7;i++){const y=-30+i*16;emboss(ctx,x=>ell(x,-96+(i%2)*8,y,15,11),p,{off:1.6,blur:.7});}
  for(let i=0;i<5;i++){const a=-2.4+i*.5;emboss(ctx,x=>ell(x,-30+70*Math.cos(a),-120+40*Math.sin(a),14,10),p,{off:1.4,blur:.6});}
  // coleta
  emboss(ctx,x=>smooth(x,[[-100,40],[-120,70],[-110,100],[-88,90],[-92,60]]),p,{off:2});
 } else if(s==='curly'){ // pelo rizado corto (Alfonso XIII joven)
  emboss(ctx,x=>smooth(x,[[-110,-10],[-114,-70],[-88,-130],[-36,-162],[24,-152],[58,-120],[44,-104],[8,-124],[-36,-116],[-72,-84],[-86,-30]]),p,{off:2.8});
  for(let i=0;i<9;i++){const a=-2.6+i*.42;emboss(ctx,x=>ell(x,-28+78*Math.cos(a),-96+62*Math.sin(a),12,9),p,{off:1.3,blur:.6});}
 } else if(s==='infant'){ // 'pelón': cráneo infantil, mechones mínimos; evita cabello adulto
  emboss(ctx,x=>smooth(x,[[-111,-18],[-112,-78],[-82,-145],[-20,-169],[39,-153],[62,-122],[42,-122],[5,-138],[-43,-123],[-77,-81],[-89,-30]]),p,{off:2.1});
  for(let i=0;i<4;i++)icurve(ctx,[[-15+i*17,-143+i*4],[-31+i*15,-125+i*5],[-48+i*12,-113+i*5]],p,1);
 } else if(s==='tupe'){ // Alfonso XIII adolescente: tupé elevado y ondas hacia delante
  emboss(ctx,x=>smooth(x,[[-112,-14],[-114,-76],[-88,-129],[-29,-160],[17,-165],[46,-149],[68,-139],[58,-119],[34,-121],[0,-132],[-43,-114],[-80,-78],[-90,-25]]),p,{off:3});
  emboss(ctx,x=>smooth(x,[[-21,-158],[14,-180],[56,-174],[72,-150],[49,-136],[21,-145]]),p,{off:1.9});
  for(let i=0;i<6;i++)icurve(ctx,[[-36+i*17,-153+i%2*6],[-22+i*16,-137],[0+i*13,-124]],p,1.6);
 } else if(s==='bun'){ // moño + raya (Victoria / Liberty)
  emboss(ctx,x=>smooth(x,[[-108,-16],[-112,-72],[-86,-132],[-32,-162],[26,-150],[56,-118],[42,-102],[6,-122],[-38,-112],[-74,-80],[-86,-28]]),p,{off:2.8});
  emboss(ctx,x=>ell(x,-96,-72,24,26,-.2),p,{off:2.4}); // moño
  icurve(ctx,[[-108,-84],[-92,-92],[-80,-76],[-90,-58],[-106,-62]],p,1.6);
  icurve(ctx,[[-102,-78],[-92,-82],[-86,-72],[-94,-64]],p,1.2);
  icurve(ctx,[[-16,-152],[-38,-116],[-58,-84]],p,1.8);
  for(let i=0;i<4;i++)icurve(ctx,[[-26+i*15,-144+i*7],[-44+i*12,-112+i*8],[-60+i*9,-84+i*7]],p,1.4);
 } else if(s==='braid'){ // trenzas recogidas (Helvetia)
  emboss(ctx,x=>smooth(x,[[-108,-14],[-112,-72],[-86,-132],[-32,-162],[26,-150],[56,-118],[42,-102],[6,-122],[-38,-112],[-74,-80],[-86,-28]]),p,{off:2.8});
  for(let i=0;i<6;i++){emboss(ctx,x=>ell(x,-70+i*4,-120+i*20,13,9,.5),p,{off:1.4,blur:.6});}
  rline(ctx,[[-40,-150],[0,-158],[40,-138]],p,4); // cinta
 } else if(s==='feathers'){ // tocado de plumas (Indian Head)
  emboss(ctx,x=>smooth(x,[[-108,-16],[-112,-72],[-86,-132],[-32,-162],[26,-150],[56,-118],[42,-102],[6,-122],[-38,-112],[-74,-80],[-86,-28]]),p,{off:2.8});
  for(let i=0;i<7;i++){const a=-2.9+i*.34;const bx=-20+92*Math.cos(a),by=-100+78*Math.sin(a);
   ctx.save();ctx.translate(bx,by);ctx.rotate(a+Math.PI/2);
   emboss(ctx,x=>smooth(x,[[0,0],[-9,-30],[-4,-62],[0,-72],[4,-62],[9,-30]]),p,{off:1.6,blur:.7});
   iline(ctx,[[0,-6],[0,-64]],p,1.4);ctx.restore();}
  rline(ctx,[[-60,-120],[0,-150],[50,-120]],p,5); // banda
 } else if(s==='helmet'){ // casco ático con cresta (Athena)
  emboss(ctx,x=>smooth(x,[[-112,-20],[-116,-80],[-88,-140],[-30,-170],[30,-158],[62,-120],[58,-96],[20,-116],[-30,-112],[-76,-80],[-90,-20]]),p,{off:3});
  // cresta
  emboss(ctx,x=>smooth(x,[[-70,-150],[-30,-196],[30,-196],[70,-150],[40,-160],[0,-172],[-40,-160]]),p,{off:2.6});
  for(let i=0;i<6;i++)iline(ctx,[[-50+i*18,-186],[-44+i*18,-158]],p,1.6);
  // carrillera
  emboss(ctx,x=>smooth(x,[[-40,-40],[-20,-20],[-10,20],[-30,30],[-46,0]]),p,{off:1.8});
  rline(ctx,[[-80,-90],[0,-120],[56,-96]],p,4);
 } else if(s==='crownhair'){ // pelo bajo corona
  emboss(ctx,x=>smooth(x,[[-108,-16],[-110,-66],[-84,-120],[-30,-146],[26,-138],[54,-110],[40,-96],[6,-114],[-38,-104],[-74,-74],[-86,-24]]),p,{off:2.6});
 } else { // short / bare
  emboss(ctx,x=>smooth(x,[[-108,-16],[-112,-70],[-86,-128],[-32,-158],[26,-148],[56,-116],[42,-100],[6,-120],[-38,-110],[-74,-78],[-86,-26]]),p,{off:2.6});
  for(let i=0;i<5;i++)icurve(ctx,[[-16+i*15,-142+i*5],[-36+i*12,-112+i*6],[-56+i*10,-82+i*6]],p,1.5);
 }
 // Mechones grabados dentro de la masa capilar, más ricos en zonas altas.
 if(_W<.60 && s!=='helmet' && s!=='feathers' && s!=='infant'){
  for(let k=0;k<7;k++){
   const x=-73+k*17, y=-114+Math.abs(k-3)*6;
   icurve(ctx,[[x-7,y-11],[x+4,y-22],[x+14,y-18]],p,.85);
  }
 }
}
/* Retrato laureado de Napoleón III. La mandíbula y la perilla forman una
   silueta continua. Las incisiones del pelo siguen el giro de cada mechón. */
function napoleonLaureate(ctx,p,rightFacing){
 ctx.save();
 ctx.scale(rightFacing?-1.68:1.68,1.68);
 ctx.translate(-228,-226);
 function shape(start,curves,off,tint=0){
  const trace=x=>{
   x.beginPath();x.moveTo(...start);
   for(const curve of curves)x.bezierCurveTo(...curve);
   x.closePath();
  };
  emboss(ctx,trace,p,{off,lw:.78});
  if(tint){ctx.save();trace(ctx);ctx.fillStyle=p.deep;ctx.globalAlpha=tint;ctx.fill();ctx.restore();}
 }
 function cut(points,width=1){icurve(ctx,points,p,width);}
 // Frente, nariz, labios, punta de la perilla, garganta y truncamiento del cuello.
 shape([175,96],[
  [192,77,224,65,249,73],[280,75,311,94,324,120],[341,151,339,192,323,223],
  [314,242,305,253,302,261],[296,286,291,323,301,362],[304,378,312,389,325,397],
  [303,394,281,384,261,373],[235,359,202,350,167,350],[191,342,203,324,205,305],
  [203,299,193,302,185,300],[178,299,171,298,164,301],[156,306,148,310,139,311],
  [145,305,148,296,151,289],[152,286,148,282,149,277],[149,273,152,270,155,268],
  [153,267,149,267,148,265],[147,262,149,259,153,256],[151,253,147,253,146,250],
  [146,246,152,243,154,239],[156,234,154,231,150,231],[144,232,137,232,132,229],
  [129,226,132,223,135,219],[141,212,149,201,153,194],[156,188,155,184,153,182],
  [150,178,153,174,154,169],[156,163,154,157,155,149],[157,131,163,108,175,96]
 ],1.7);
 // Gradaciones cortas de medalla para pómulo, sien y mandíbula.
 for(const [x,y,rx,ry,strength,light] of [[194,218,31,19,.37,true],[217,188,25,30,.24,false],[194,252,27,16,.24,false],[257,313,32,29,.24,true]]){
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
  const g=ctx.createRadialGradient(0,0,.02,0,0,1);
  g.addColorStop(0,light?p.light:p.shadow);g.addColorStop(1,light?'rgba(220,210,177,0)':'rgba(58,48,35,0)');
  ctx.globalAlpha=strength;ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
 }
 // Cabello, patilla y mechones detrás de la oreja.
 shape([158,149],[[155,117,176,88,207,78],[240,60,279,76,301,95],[328,110,341,142,338,170],
  [338,192,327,213,323,230],[317,246,310,253,298,265],[297,254,302,245,297,244],
  [293,250,289,258,281,265],[284,255,282,247,278,244],[275,249,271,252,266,255],
  [270,242,266,228,266,217],[270,199,264,187,252,185],[245,185,241,192,241,204],
  [237,217,238,229,233,240],[228,233,225,222,225,209],[219,216,217,221,215,224],
  [217,208,213,194,210,188],[202,178,203,163,196,155],[187,148,179,143,176,127],
  [170,130,163,138,158,149]],1.3,.23);
 const locks=[
 [[160,137],[173,111],[193,96],[212,86]],[[174,125],[183,112],[197,105],[211,94]],
 [[179,121],[181,137],[194,149],[201,162]],[[188,120],[192,133],[205,147],[210,160]],
 [[198,119],[203,132],[212,146],[218,161]],[[208,120],[218,137],[222,152],[225,165]],
 [[202,155],[215,171],[218,190],[216,207]],[[213,151],[225,172],[230,193],[228,214]],
 [[233,151],[240,165],[240,183],[236,198]],[[245,152],[250,164],[253,181]],
 [[270,140],[278,149],[273,170],[265,179]],[[284,136],[292,151],[284,173],[274,187]],
 [[301,128],[307,148],[297,174],[283,187]],[[311,127],[320,150],[308,175],[292,193]],
 [[325,143],[325,165],[312,188],[298,203]],[[330,162],[320,186],[302,211],[295,226]],
 [[327,182],[319,202],[309,215],[301,234]],[[312,208],[299,226],[291,247]],
 [[300,210],[286,224],[283,245]],[[286,209],[278,225],[274,242]]];
 for(const line of locks)cut(line,1.15);
 // Párpado bajo el arco superciliar, aleta de la nariz y pabellón de la oreja.
 cut([[155,177],[161,175],[170,176],[178,181]],1.8);
 cut([[155,187],[162,181],[168,182],[174,185]],1.25);
 cut([[156,187],[164,187],[173,185]],.95);
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.77;ell(ctx,160.8,185,1.6,1.75);ctx.fill();ctx.restore();
 cut([[169,188],[173,190],[178,188]],.75);
 cut([[134,228],[141,229],[147,226],[152,225],[155,227]],1.2);
 cut([[157,220],[161,226],[161,231]],.8);
 cut([[240,199],[246,188],[256,186],[263,193],[260,205],[249,218],[241,218]],1.65);
 cut([[246,201],[248,196],[255,193],[257,198],[251,204],[249,211]],1.05);
 // Bigote que parte del labio superior y se afina hacia la mejilla.
 shape([143,247],[[148,240,152,235,157,235],[165,236,173,242,182,243],
 [188,245,197,245,207,237],[202,248,189,254,178,250],[169,249,163,244,157,245],
 [152,246,147,249,143,247]],1.05,.32);
 for(const line of [[[150,244],[157,239],[167,242],[179,246],[193,247]],[[156,242],[169,246],[182,249],[196,246]]])cut(line,.72);
 cut([[150,258],[155,258],[162,256],[168,255]],1.1);
 // Mechones abiertos: continúan la silueta, sin contorno oval ni relleno separado.
 for(const line of [[[156,275],[158,282],[154,292],[142,308]],[[161,273],[163,282],[157,296],[149,305]],
 [[167,275],[167,285],[160,296],[151,304]],[[173,278],[172,286],[164,296],[157,301]],
 [[178,280],[177,287],[170,295]],[[184,281],[182,288],[175,295]]])cut(line,.98);
 cut([[185,296],[200,295],[212,287],[221,279]],.95);
 cut([[209,313],[218,323],[236,333]],.82);
 // Rama de laurel con hojas puntiagudas unidas al tallo y cinta anudada.
 rline(ctx,[[166,123],[188,119],[211,116],[239,118],[266,122],[295,127],[318,133]],p,2.1);
 for(const [x,y,tx,ty,bend] of [[176,122,181,102,3],[186,120,194,94,4],[196,118,208,94,4],
 [205,117,228,96,4],[219,117,246,100,4],[234,118,263,107,3],[252,121,278,112,3],
 [270,124,296,117,3],[283,126,308,122,3],[188,119,175,132,-3],[207,117,188,132,-3],
 [223,118,204,133,-3],[241,119,222,134,-3],[259,122,240,135,-3],[279,125,260,137,-3],[299,129,280,140,-3]]){
  const dx=tx-x,dy=ty-y,len=Math.hypot(dx,dy),nx=-dy/len*bend,ny=dx/len*bend;
  shape([x,y],[[x+dx*.24+nx,y+dy*.24+ny,x+dx*.7+nx,y+dy*.7+ny,tx,ty],
   [x+dx*.63-nx,y+dy*.63-ny,x+dx*.2-nx,y+dy*.2-ny,x,y]],.75);
  cut([[x,y],[x+dx*.53,y+dy*.53]],.55);
 }
 shape([314,131],[[325,130,338,134,339,141],[334,140,326,138,322,137],[338,153,344,175,342,199],
 [341,217,339,233,339,246],[334,230,334,212,337,192],[339,171,327,152,314,131]],.9);
 cut([[322,136],[335,157],[339,178],[338,195]],.85);
 ctx.restore();
}

/* Busto de Carlos I. Frente amplia, bigote y truncamiento inclinado del cuello. */
function carlosPortugal(ctx,p){
 ctx.save();ctx.scale(2.68,2.68);ctx.translate(-146,-145);
 function relief(start,curves,depth,tone=0){
  const trace=x=>{x.beginPath();x.moveTo(...start);for(const row of curves)x.bezierCurveTo(...row);x.closePath();};
  emboss(ctx,trace,p,{off:depth,lw:.54});
  if(tone){ctx.save();trace(ctx);ctx.fillStyle=p.deep;ctx.globalAlpha=tone;ctx.fill();ctx.restore();}
 }
 // La silueta une el mentón a la garganta con una sola curva.
 relief([68,106],[[61,85,76,67,94,59],[119,44,144,42,164,49],[180,49,194,60,202,72],
 [208,83,209,96,209,106],[208,109,204,112,205,115],[206,122,213,130,217,136],
 [220,140,216,143,210,144],[207,144,205,144,205,146],[205,148,210,150,211,153],
 [212,156,207,158,204,158],[204,160,207,161,207,164],[207,168,203,169,202,171],
 [202,174,205,176,205,180],[205,189,198,195,190,198],[185,202,183,210,184,217],
 [185,221,187,225,190,228],[173,220,161,218,149,222],[128,227,109,233,90,239],
 [82,241,74,242,65,242],[76,233,85,218,88,206],[93,192,89,182,82,171],
 [74,159,69,141,69,125],[69,116,67,112,68,106]],1.15);
 // Cabello corto peinado hacia atrás, con entradas y patilla delante de la oreja.
 relief([69,105],[[63,89,73,70,92,61],[112,49,129,45,144,46],[158,44,178,51,193,59],
 [186,59,179,57,176,58],[182,60,185,61,189,63],[173,61,165,63,160,68],
 [155,75,151,86,147,91],[143,96,145,106,138,112],[133,118,130,123,126,125],
 [125,114,122,108,117,106],[108,102,101,109,100,118],[98,134,106,144,105,151],
 [99,162,96,173,94,183],[87,175,84,165,81,161],[80,163,79,166,80,170],
 [74,160,74,153,72,149],[69,139,67,125,68,118],[66,112,68,109,69,105]],.82,.22);
 const waves=[
 [[73,96],[77,79],[90,70],[109,62]],[[72,107],[79,89],[93,80],[109,68],[123,60]],
 [[75,111],[79,99],[93,88],[111,78],[128,61],[144,54]],[[77,120],[84,106],[99,98],[118,80],[130,71]],
 [[80,128],[88,111],[101,104],[114,95],[130,78],[143,68]],[[81,139],[86,130],[91,116],[104,106]],
 [[83,149],[89,139],[93,127]],[[88,161],[94,152],[97,140]],[[120,99],[128,88],[137,78],[148,72]],
 [[125,111],[131,104],[136,91]],[[93,66],[105,58],[124,53],[142,53]],[[111,60],[131,53],[149,51],[167,54]]];
 for(const line of waves)icurve(ctx,line,p,.83);
 for(const [x,y,rx,ry,light] of [[175,139,23,15,true],[161,112,18,21,false],[165,173,23,12,false],[140,198,24,15,true]]){
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const g=ctx.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,light?p.light:p.deep);g.addColorStop(1,'rgba(110,102,90,0)');
  ctx.fillStyle=g;ctx.globalAlpha=light?.33:.22;ctx.fillRect(-1,-1,2,2);ctx.restore();
 }
 const cut=(a,w=1)=>icurve(ctx,a,p,w);
 cut([[183,110],[193,105],[203,105],[207,108]],1.5);
 cut([[186,118],[194,112],[199,112],[203,115]],1.15);
 cut([[189,118],[195,119],[202,116]],.8);
 ctx.save();ctx.fillStyle=p.deep;ell(ctx,198,115,1.4,1.9);ctx.fill();ctx.restore();
 cut([[195,140],[199,138],[203,139],[208,142]],1);
 cut([[103,125],[105,115],[112,111],[119,114],[120,121]],1.2);
 cut([[107,127],[110,118],[115,117],[114,123],[111,128],[114,134],[110,138]],.83);
 // Bigote curvado desde debajo de la nariz hasta la comisura.
 relief([211,152],[[207,145,204,143,199,143],[190,143,180,150,172,155],
 [169,157,167,157,164,157],[169,162,176,162,181,158],[187,154,191,151,197,150],
 [201,150,205,152,208,154],[211,156,213,156,211,152]],.88,.38);
 cut([[172,158],[184,153],[196,146],[205,148]],.74);
 cut([[191,163],[198,161],[204,161]],.85);
 cut([[199,182],[195,189],[186,194],[178,195]],.7);
 cut([[98,217],[111,205],[122,194]],.75);
 ctx.restore();
}

// Las incisiones quedan dentro de la silueta de la mandíbula. No hay una segunda
// pieza en relieve bajo la barbilla. Solo se alarga la silueta para barba larga.
function beard(ctx,p,c){
 const long=c.beard==='long', short=c.beard==='short', pointed=c.beard==='pointed';
 const hairLength=short?4:(long?15:9);
 const locks=pointed?[[57,39],[62,44],[71,39],[76,36],[82,33],[85,42]]:
  [[-20,-9],[-15,-5],[-16,3],[-9,0],[-10,12],[-3,8],[-2,19],[3,14],[6,23],[14,20],
   [16,29],[23,24],[25,34],[32,28],[35,38],[42,30],[44,42],[50,34],[51,47],
   [60,39],[59,51],[68,44],[72,53],[77,40],[80,48],[85,36],[86,27]];
 for(const [x,y] of locks){
  const sweep=x<36?5:-3;
  const len=hairLength+(Math.cos(x*.2)+1)*2;
  icurve(ctx,[[x,y],[x+sweep*.15,y+len*.50],[x+sweep,y+len]],p,short?1.2:1.65);
 }
}
function moustache(ctx,p,c){
 const high=c.moustache==='up';
 const tailY=high?-21:-4;
 // Los pelos parten del filtrum y se afinan sobre la mejilla, hasta la comisura.
 const trace=x=>{x.beginPath();x.moveTo(91,-16);
  x.bezierCurveTo(84,-20,76,-17,66,-12);x.bezierCurveTo(58,-8,51,-4,43,tailY);
  x.bezierCurveTo(47,tailY+9,58,-1,70,-6);x.bezierCurveTo(81,-12,91,-10,95,-7);
  x.bezierCurveTo(95,-11,93,-14,91,-16);x.closePath();};
 ctx.save();trace(ctx);ctx.fillStyle=p.deep;ctx.globalAlpha=.78;ctx.fill();ctx.restore();
 icurve(ctx,[[93,-12],[83,-15],[72,-12],[60,-7],[51,tailY+3]],p,1.2);
}
function laurelWreathHead(ctx,p){
 for(let sgn of [-1,1]){for(let i=0;i<6;i++){const a=-2.2+i*.34;
  const x=-20+86*Math.cos(a)*1, y=-104+70*Math.sin(a);
  ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);
  emboss(ctx,x2=>ell(x2,0,0,6,13),p,{off:1.2,blur:.5});ctx.restore();}}
 rline(ctx,[[-70,-120],[-20,-150],[40,-128]],p,3);
 dot(ctx,-20,-152,4,p);
}
function diadem(ctx,p){
 rline(ctx,[[-78,-108],[-20,-146],[48,-116]],p,6);
 for(let i=0;i<5;i++)dot(ctx,-60+i*26,-128+Math.sin(i)*6,3,p);
}
function crownHead(ctx,p,style){
 ctx.save();ctx.translate(-14,-150);
 if(style==='small'){ // coronita con florones y perlas (Isabel II / Victoria)
  emboss(ctx,x=>poly(x,[[-42,12],[42,12],[38,-8],[-38,-8]]),p,{off:2});
  for(let i=0;i<5;i++)dot(ctx,-32+i*16,2,3,p);
  for(let i=0;i<5;i++){const x=-32+i*16;
   emboss(ctx,x2=>smooth(x2,[[x-7,-8],[x-4,-20],[x,-29],[x+4,-20],[x+7,-8]]),p,{off:1.4});
   dot(ctx,x,-32,3.2,p);}
 } else { // corona real con arcos
  emboss(ctx,x=>poly(x,[[-52,12],[52,12],[46,-8],[-46,-8]]),p,{off:2.4});
  for(let i=0;i<5;i++){const x=-40+i*20;emboss(ctx,x2=>poly(x2,[[x-7,-8],[x,-34],[x+7,-8]]),p,{off:1.6});dot(ctx,x,-36,3.4,p);}
  emboss(ctx,x=>{x.beginPath();x.moveTo(-44,-10);x.quadraticCurveTo(0,-58,44,-10);x.lineTo(36,-10);x.quadraticCurveTo(0,-46,-36,-10);x.closePath();},p,{off:1.8});
  dot(ctx,0,-52,5,p);emboss(ctx,x=>poly(x,[[-2,-58],[2,-58],[2,-66],[-2,-66]]),p,{off:1});
 }
 ctx.restore();
}
function veil(ctx,p){
 emboss(ctx,x=>smooth(x,[[-112,-30],[-120,-90],[-80,-150],[-10,-172],[40,-150],[30,-120],[-20,-140],[-70,-110],[-92,-50],[-104,30],[-120,80],[-96,70]]),p,{off:2.6});
 for(let i=0;i<4;i++)iline(ctx,[[-100,-40+i*24],[-116,-20+i*24]],p,1.5);
}

/* ---- Heráldica ---- */
/* ---- Heráldica hispánica correcta ---- */
function fleurDeLis(ctx,x,y,s,p){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(0,-27);c2.bezierCurveTo(8,-14,8,-4,3,4);c2.lineTo(-3,4);c2.bezierCurveTo(-8,-4,-8,-14,0,-27);c2.closePath();},p,{off:1.4});
 for(const sg of [-1,1]){ctx.save();ctx.scale(sg,1);
  emboss(ctx,c2=>{c2.beginPath();c2.moveTo(3,-7);c2.bezierCurveTo(15,-13,21,-4,18,4);c2.bezierCurveTo(15,11,9,10,5,4);c2.closePath();},p,{off:1.3});
  ctx.restore();}
 emboss(ctx,c2=>poly(c2,[[-12,4],[12,4],[12,11],[-12,11]]),p,{off:1.2});
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(-4,11);c2.bezierCurveTo(-11,17,-13,23,-8,27);c2.lineTo(8,27);c2.bezierCurveTo(13,23,11,17,4,11);c2.closePath();},p,{off:1.3});
 ctx.restore();
}
/* Castillo de Castilla: tres torres almenadas sobre lienzo, puerta y ventanas
   de medio punto aclaradas. Cada torre es UNA silueta almenada (no bloques sueltos). */
function merlonPath(c2,hw,top,bot,n,mh){
 const step=(hw*2)/n, mw=step*.60;
 c2.beginPath();c2.moveTo(-hw,bot);c2.lineTo(-hw,top);
 for(let i=0;i<n;i++){const x0=-hw+i*step, xm=x0+(step-mw)/2;
  c2.lineTo(xm,top);c2.lineTo(xm,top-mh);c2.lineTo(xm+mw,top-mh);c2.lineTo(xm+mw,top);}
 c2.lineTo(hw,top);c2.lineTo(hw,bot);c2.closePath();
}
function archVoid(ctx,x,y,w,h,p,lw){
 // vano de medio punto: y = arranque del arco, h = altura del fuste
 const pts=[[x-w,y+h],[x-w,y]];
 for(let i=0;i<=10;i++){const a=Math.PI+i/10*Math.PI;pts.push([x+w*Math.cos(a),y+w*Math.sin(a)]);}
 pts.push([x+w,y+h],[x-w,y+h]);
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.6;poly(ctx,pts);ctx.fill();ctx.restore();
 iline(ctx,pts,p,lw||1.2);
}
function castle(ctx,x,y,s,p){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 // lienzo almenado
 emboss(ctx,c2=>merlonPath(c2,40,-6,48,7,12),p,{off:2.4});
 // torres laterales
 for(const sx of [-1,1]){ctx.save();ctx.translate(sx*31,-4);
  emboss(ctx,c2=>merlonPath(c2,12,-32,6,3,11),p,{off:2});
  ctx.restore();}
 // torre del homenaje, más alta y ancha
 emboss(ctx,c2=>merlonPath(c2,14,-54,-8,3,12),p,{off:2.2});
 // puerta de medio punto
 archVoid(ctx,0,20,10,28,p,2);
 const av=[[-12,48],[-12,20]];
 for(let i=0;i<=12;i++){const a=Math.PI+i/12*Math.PI;av.push([12*Math.cos(a),20+12*Math.sin(a)]);}
 av.push([12,48]);rline(ctx,av,p,1.4);
 // ventanas: una por torre y dos en el lienzo
 archVoid(ctx,-31,-24,4,11,p,1.2);
 archVoid(ctx,31,-24,4,11,p,1.2);
 archVoid(ctx,0,-44,4.4,13,p,1.2);
 archVoid(ctx,-25,10,4,12,p,1.1);
 archVoid(ctx,25,10,4,12,p,1.1);
 // sillares del lienzo
 for(let i=0;i<3;i++){const yy=26+i*7;
  iline(ctx,[[-40,yy],[-13,yy]],p,.9);iline(ctx,[[13,yy],[40,yy]],p,.9);}
 iline(ctx,[[-40,-2],[-16,-2]],p,.8);iline(ctx,[[16,-2],[40,-2]],p,.8);
 ctx.restore();
}
/* --- utilidades de silueta unificada ---
   Todas las subtrayectorias se añaden con el mismo sentido de giro para que la
   unión (regla nonzero) no abra huecos donde las formas se solapan. */
function areaPts(pts){let a=0;for(let i=0;i<pts.length;i++){const q=pts[(i+1)%pts.length];a+=pts[i][0]*q[1]-q[0]*pts[i][1];}return a/2;}
const cwPts=pts=>areaPts(pts)<0?pts.slice().reverse():pts;
function polyU(c2,pts){const q=cwPts(pts);c2.moveTo(q[0][0],q[0][1]);for(let i=1;i<q.length;i++)c2.lineTo(q[i][0],q[i][1]);c2.closePath();}
function smoothU(c2,pts){const q=cwPts(pts),n=q.length;c2.moveTo((q[0][0]+q[n-1][0])/2,(q[0][1]+q[n-1][1])/2);
 for(let i=0;i<n;i++){const a=q[i],b=q[(i+1)%n];c2.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);}c2.closePath();}
function ellU(c2,x,y,rx,ry,rot=0){c2.moveTo(x+Math.cos(rot)*rx,y+Math.sin(rot)*rx);c2.ellipse(x,y,Math.abs(rx),Math.abs(ry),rot,0,TAU,false);}
function taperPts(pts,w0,w1){
 const n=pts.length,L=[],R=[];
 for(let i=0;i<n;i++){
  const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)];
  let dx=b[0]-a[0],dy=b[1]-a[1];const m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;
  const w=(w0+(w1-w0)*(n===1?0:i/(n-1)))/2;
  L.push([pts[i][0]-dy*w,pts[i][1]+dx*w]);R.push([pts[i][0]+dy*w,pts[i][1]-dx*w]);
 }
 return L.concat(R.reverse());
}
const taperU=(c2,pts,w0,w1)=>polyU(c2,taperPts(pts,w0,w1));
function taper(ctx,pts,w0,w1){ctx.beginPath();polyU(ctx,taperPts(pts,w0,w1));}
/* Garras: tres uñas que salen de la pezuña, formadas parte de la silueta */
function clawsU(c2,px,py,dir,sz){
 for(let i=-1;i<=1;i++){const a=dir+i*.44;
  const bx=px+Math.cos(a)*sz*.7,by=py+Math.sin(a)*sz*.7;
  const tx=px+Math.cos(a)*(sz+4.5),ty=py+Math.sin(a)*(sz+4.5);
  const nx=-Math.sin(a)*2.6,ny=Math.cos(a)*2.6;
  polyU(c2,[[bx+nx,by+ny],[tx,ty],[bx-nx,by-ny]]);}
}
/* León rampante heráldico (reino de León). Una sola silueta en relieve con
   detalles incusos: melena, fauces con lengua bífida, garras y cola anudada. */
function lion(ctx,x,y,s,p,flip=false,o={}){
 ctx.save();ctx.translate(x,y);ctx.scale(flip?-s:s,s);
 const paws=[[2,79,2.45,8],[46,52,1.15,6.4],[-55,-28,3.45,7],[-48,14,3.05,6.4]];
 const silhouette=c2=>{
  c2.beginPath();
  // cola en S y mechón
  taperU(c2,curvePts([[22,16],[44,8],[60,-12],[58,-38],[44,-52],[33,-47]],5),14,7);
  smoothU(c2,[[37,-41],[25,-47],[19,-62],[29,-64],[38,-53]]);
  // miembros lejanos
  taperU(c2,curvePts([[26,16],[44,26],[46,46]],5),15,9);
  taperU(c2,curvePts([[-10,-4],[-28,4],[-44,12]],5),13,8);
  // cuerpo, anca y pata de apoyo
  smoothU(c2,[[-24,-34],[-2,-32],[16,-16],[26,6],[28,28],[16,40],[-4,32],[-16,10],[-22,-12]]);
  ellU(c2,20,24,20,22,-.3);
  taperU(c2,curvePts([[18,42],[10,58],[6,72]],5),17,10);
  // pata delantera alzada y hombro
  ellU(c2,-12,-22,14,16,-.2);
  taperU(c2,curvePts([[-14,-24],[-32,-34],[-50,-30]],5),15,9);
  // cuello y melena ondulada
  taperU(c2,[[-14,-24],[-24,-40]],28,25);
  const mx=-26,my=-44,lob=[],a0=-1.95,a1=2.65,nl=16;
  for(let i=0;i<=nl;i++){const a=a0+(a1-a0)*i/nl,r=(i%2?21:31);
   lob.push([mx+Math.cos(a)*r,my+Math.sin(a)*r*1.05]);}
  lob.push([mx-4,my+4]);
  polyU(c2,lob);
  // cabeza
  ellU(c2,-42,-56,14,13,-.15);
  polyU(c2,[[-52,-64],[-63,-60],[-64,-51],[-52,-48]]);
  polyU(c2,[[-52,-48],[-59,-44],[-56,-37],[-46,-40]]);
  polyU(c2,[[-38,-68],[-34,-79],[-27,-66]]);
  taperU(c2,curvePts([[-56,-43],[-65,-38],[-70,-31]],5),5.5,2.6);
  // pezuñas y garras
  for(const [px,py,dir,sz] of paws){ellU(c2,px,py,sz,sz*.66,dir);clawsU(c2,px,py,dir,sz);}
 };
 emboss(ctx,silhouette,p,{off:2.8,outer:true});
 // --- detalles incusos ---
 icurve(ctx,[[8,6],[26,14],[28,30],[18,42]],p,1.3);    // anca
 icurve(ctx,[[-22,-30],[-10,-22],[-8,-8]],p,1.2);      // hombro
 for(let i=0;i<6;i++){const a=-1.9+i*.44;              // mechones de la melena
  iline(ctx,[[-26+Math.cos(a)*12,-44+Math.sin(a)*12],[-26+Math.cos(a)*24,-44+Math.sin(a)*25]],p,1);}
 iline(ctx,[[-34,-72],[-31,-67]],p,.9);                // oreja
 // fauces abiertas
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.6;
 poly(ctx,[[-62,-51],[-50,-47],[-55,-41]]);ctx.fill();ctx.restore();
 icurve(ctx,[[-62,-51],[-55,-49],[-50,-47]],p,1.3);
 iline(ctx,[[-60,-51],[-58,-46]],p,1.5);               // colmillo superior
 iline(ctx,[[-55,-42],[-53,-47]],p,1.4);               // colmillo inferior
 iline(ctx,[[-50,-63],[-42,-64]],p,1.3);               // ceja
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.8;circle(ctx,-45,-58,2.8);ctx.fill();ctx.restore();
 dot(ctx,-45.8,-58.8,1.4,p);
 iline(ctx,[[-63,-56],[-59,-57]],p,1.1);               // nariz
 iline(ctx,[[-67,-34],[-73,-32]],p,1);iline(ctx,[[-68,-32],[-71,-26]],p,1); // lengua bífida
 for(const [px,py,dir,sz] of paws)for(let i=-1;i<=1;i++){const a=dir+i*.44;
  iline(ctx,[[px+Math.cos(a)*sz*.3,py+Math.sin(a)*sz*.3],[px+Math.cos(a)*sz*.9,py+Math.sin(a)*sz*.9]],p,.9);}
 iline(ctx,[[33,-46],[26,-56]],p,.9);iline(ctx,[[36,-48],[31,-58]],p,.9);
 if(o.crown)royalCrown(ctx,-41,-84,.19,p);
 ctx.restore();
}
function navarraChains(ctx,x,y,w,h,p){
 ctx.save();ctx.translate(x,y);
 const chain=(x1,y1,x2,y2)=>{
  const ang=Math.atan2(y2-y1,x2-x1),n=Math.max(2,Math.round(Math.hypot(x2-x1,y2-y1)/8.5));
  for(let i=0;i<=n;i++){const t=i/n,cx=x1+(x2-x1)*t,cy=y1+(y2-y1)*t;
   emboss(ctx,c2=>ell(c2,cx,cy,3.4,2.1,ang),p,{off:.9,blur:.4});}};
 const hw=w/2,hh=h/2;
 chain(-hw,-hh,hw,-hh);chain(hw,-hh,hw,hh);chain(hw,hh,-hw,hh);chain(-hw,hh,-hw,-hh);
 chain(-hw,-hh,hw,hh);chain(hw,-hh,-hw,hh);chain(0,-hh,0,hh);chain(-hw,0,hw,0);
 emboss(ctx,c2=>ell(c2,0,0,7,9),p,{off:1.6}); // esmeralda central
 ctx.restore();
}
function pomegranate(ctx,x,y,s,p){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 // hojas nacidas de la base, a los lados
 for(const sg of [-1,1]){
  emboss(ctx,c2=>smooth(c2,[[sg*7,17],[sg*19,12],[sg*27,-3],[sg*16,5],[sg*9,13]]),p,{off:1.3});
  iline(ctx,[[sg*10,15],[sg*23,-1]],p,1);}
 // fruto
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(0,-15);c2.bezierCurveTo(17,-15,22,-1,17,12);
  c2.bezierCurveTo(13,25,-13,25,-17,12);c2.bezierCurveTo(-22,-1,-17,-15,0,-15);c2.closePath();},p,{off:2});
 // corona de sépalos
 emboss(ctx,c2=>poly(c2,[[-8,-13],[-11,-26],[-4,-20],[0,-29],[4,-20],[11,-26],[8,-13]]),p,{off:1.3});
 // raja con los granos a la vista
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.5;poly(ctx,[[-7,-7],[7,-7],[4,17],[-4,17]]);ctx.fill();ctx.restore();
 for(const [gx,gy] of [[-3,-2],[3,-2],[0,4],[-3,9],[3,9],[0,14]])dot(ctx,gx,gy,2,p);
 icurve(ctx,[[-13,-8],[-15,4],[-11,16]],p,1.1);
 icurve(ctx,[[13,-8],[15,4],[11,16]],p,1.1);
 ctx.restore();
}
function royalCrown(ctx,x,y,s,p){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 // aro con pedrería
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(-78,22);c2.lineTo(78,22);c2.lineTo(72,-8);
  c2.quadraticCurveTo(0,-16,-72,-8);c2.closePath();},p,{off:2.6});
 for(let i=0;i<9;i++)emboss(ctx,c2=>ell(c2,-64+i*16,7,5,6),p,{off:1.1,blur:.4});
 rline(ctx,[[-72,-8],[0,-14],[72,-8]],p,2);
 // florones de acanto con perla
 for(let i=0;i<5;i++){const cx=-64+i*32;
  ctx.save();ctx.translate(cx,-10);
  emboss(ctx,c2=>{c2.beginPath();c2.moveTo(0,0);c2.bezierCurveTo(-12,-10,-10,-26,0,-34);
   c2.bezierCurveTo(10,-26,12,-10,0,0);c2.closePath();},p,{off:1.7});
  iline(ctx,[[0,-5],[0,-28]],p,1.1);dot(ctx,0,-38,3.4,p);
  ctx.restore();}
 for(let i=0;i<4;i++){const cx=-48+i*32;rline(ctx,[[cx,-10],[cx,-22]],p,1.6);dot(ctx,cx,-26,3,p);}
 // diademas con perlas
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(-70,-10);c2.bezierCurveTo(-40,-70,40,-70,70,-10);
  c2.lineTo(58,-10);c2.bezierCurveTo(34,-58,-34,-58,-58,-10);c2.closePath();},p,{off:2});
 for(let i=0;i<9;i++){const t=i/8;dot(ctx,-62+124*t,-14-Math.sin(t*Math.PI)*44,2.8,p);}
 // mundo y cruz
 dot(ctx,0,-66,7,p);iline(ctx,[[-7,-66],[7,-66]],p,1.2);
 emboss(ctx,c2=>poly(c2,[[-2.5,-72],[2.5,-72],[2.5,-90],[-2.5,-90]]),p,{off:1});
 emboss(ctx,c2=>poly(c2,[[-8,-84],[8,-84],[8,-79],[-8,-79]]),p,{off:1});
 ctx.restore();
}
/* Escudo español: cuartelado en cruz de Castilla y León, Aragón y Navarra,
   entado en punta Granada y escusón de Borbón (tres lises). */
function spanishShield(ctx,x,y,s,p,escutcheon='lilies',o={}){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 const outline=c2=>{c2.beginPath();c2.moveTo(-100,-110);c2.lineTo(100,-110);c2.lineTo(100,36);
  c2.bezierCurveTo(100,86,64,116,0,134);c2.bezierCurveTo(-64,116,-100,86,-100,36);c2.closePath();};
 emboss(ctx,outline,p,{off:3.2});
 ctx.save();outline(ctx);ctx.clip();
 // divisiones (trazos finos, no una cruz gruesa)
 iline(ctx,[[0,-110],[0,134]],p,1.8);
 iline(ctx,[[-100,12],[100,12]],p,1.8);
 // entado en punta: Granada
 iline(ctx,[[-54,74],[0,134]],p,1.6);iline(ctx,[[54,74],[0,134]],p,1.6);
 // 1º Castilla
 castle(ctx,-50,-50,.92,p);
 // 2º León
 lion(ctx,54,-46,.80,p,false,{crown:true});
 // 3º Aragón: cuatro palos
 for(let i=0;i<4;i++){const bx=-92+i*23;
  ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.42;ctx.fillRect(bx,14,10,120);ctx.restore();
  iline(ctx,[[bx,14],[bx,134]],p,1.4);iline(ctx,[[bx+10,14],[bx+10,134]],p,1.4);}
 // 4º Navarra: cadenas en orla, aspa y cruz con esmeralda
 navarraChains(ctx,52,62,84,96,p);
 // Granada
 pomegranate(ctx,0,96,.72,p);
 ctx.restore();
 // escusón central
 if(escutcheon!=='none'){
  emboss(ctx,c2=>{c2.beginPath();c2.ellipse(0,10,31,40,0,0,TAU);},p,{off:2.4});
  if(escutcheon==='lilies'){fleurDeLis(ctx,-12,-4,.46,p);fleurDeLis(ctx,12,-4,.46,p);fleurDeLis(ctx,0,24,.46,p);}
  else if(escutcheon==='cross'){iline(ctx,[[0,-14],[0,38]],p,5);iline(ctx,[[-20,12],[20,12]],p,5);}
  else if(escutcheon==='bands'){for(let i=0;i<3;i++)iline(ctx,[[-22,-4+i*14],[22,-4+i*14]],p,3);}
 }
 // collar de orden alrededor del escudo (piezas de oro)
 if(o.collar){
  const rx=118,ry=150;
  for(let i=0;i<44;i++){const a=i/44*TAU;
   emboss(ctx,c2=>ell(c2,Math.sin(a)*rx,12-Math.cos(a)*ry,4.6,3,a),p,{off:1.1,blur:.4});}
  emboss(ctx,c2=>smooth(c2,[[-9,168],[9,168],[7,182],[0,190],[-7,182]]),p,{off:1.5});
  dot(ctx,0,196,5,p);
 }
 ctx.restore();
}
function pillars(ctx,p,o={}){
 const crowned=o.crowned!==false, dx=o.dx??150;
 for(const sgn of [-1,1]){
  ctx.save();ctx.translate(sgn*dx,20);
  // columna
  emboss(ctx,c2=>poly(c2,[[-16,-120],[16,-120],[13,120],[-13,120]]),p,{off:2.6});
  emboss(ctx,c2=>poly(c2,[[-24,-120],[24,-120],[20,-136],[-20,-136]]),p,{off:1.8});
  emboss(ctx,c2=>poly(c2,[[-24,120],[24,120],[28,138],[-28,138]]),p,{off:1.8});
  for(let i=0;i<3;i++)iline(ctx,[[-8+i*8,-116],[-8+i*8,116]],p,1.4);
  if(crowned){ctx.save();ctx.translate(0,-150);royalCrown(ctx,0,0,.34,p);ctx.restore();}
  if(o.ribbon!==false){
  // cinta PLUS / ULTRA arrollada al fuste, con cola hacia fuera
  ctx.save();ctx.translate(0,-30);
  const ou=sgn;
  emboss(ctx,c2=>poly(c2,[[-40,-13],[-52,-19],[-52,3],[-40,9]]),p,{off:1.1});
  emboss(ctx,c2=>poly(c2,[[40,-13],[52,-19],[52,3],[40,9]]),p,{off:1.1});
  emboss(ctx,c2=>poly(c2,[[ou*46,-15],[ou*76,-6],[ou*66,8],[ou*80,22],[ou*46,15]]),p,{off:1.5});
  emboss(ctx,c2=>smooth(c2,[[-40,-14],[0,-18],[40,-14],[40,10],[0,14],[-40,10]]),p,{off:2.1});
  text(ctx,sgn<0?'PLUS':(o.latin?'VLTRA':'ULTRA'),0,-2,17,p,{pitch:.5});
  ctx.restore();
  }
  // olas
  for(let i=0;i<3;i++)rline(ctx,[[-30,146+i*8],[-10,142+i*8],[10,146+i*8],[30,142+i*8]],p,2.5);
  ctx.restore();
 }
}
/* ---- Corona de laurel / roble / olivo (dos ramas) ---- */
function wreath(ctx,p,o={}){
 const r=o.r??250, leaf=o.leaf??'laurel', span=o.span??2.5, gap=o.gap??.28;
 for(const sgn of [-1,1]){
  const n=13;
  // tallo
  ctx.save();ctx.strokeStyle=p.mid;ctx.lineWidth=5;ctx.globalAlpha=.9;ctx.lineCap='round';
  ctx.beginPath();
  for(let i=0;i<=n;i++){const phi=gap+(i/n)*span;const x=sgn*Math.sin(phi)*r,y=Math.cos(phi)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
  ctx.stroke();ctx.restore();
  for(let i=0;i<n;i++){
   const phi=gap+((i+.5)/n)*span;
   const x=sgn*Math.sin(phi)*r, y=Math.cos(phi)*r;
   const inclination=(i%2===0?.42:-.32)*sgn;
   ctx.save();ctx.translate(x,y);ctx.rotate(-sgn*phi+inclination);
   if(leaf==='oak'){emboss(ctx,c2=>smooth(c2,[[0,0],[-8,-4],[-14,-9],[-8,-14],[-19,-20],[-10,-24],[-14,-32],[-5,-32],[0,-45],[5,-32],[14,-34],[9,-24],[17,-21],[9,-14],[14,-9],[6,-4]]),p,{off:1.7,blur:.6});dot(ctx,11,-3,4,p);}
   else if(leaf==='olive'){emboss(ctx,c2=>ell(c2,0,-21,7,22),p,{off:1.4,blur:.5});dot(ctx,10,-4,4,p);}
   else {emboss(ctx,c2=>smooth(c2,[[0,0],[-12,-18],[0,-43],[12,-18]]),p,{off:1.6,blur:.5});
    iline(ctx,[[0,-6],[0,-36]],p,1.1);}
   if(_W<.65){
    iline(ctx,[[0,-4],[0,-31]],p,.95);
    for(let k=0;k<3;k++){
     const yy=-11-k*7;
     iline(ctx,[[0,yy],[(k%2?1:-1)*6,yy-5]],p,.7);
    }
   }
   ctx.restore();
  }
 }
 // lazo abajo
 emboss(ctx,c2=>smooth(c2,[[-16,r-4],[0,r+8],[16,r-4],[10,r+20],[-10,r+20]]),p,{off:1.8});
 rline(ctx,[[-10,r+18],[-22,r+34]],p,3);rline(ctx,[[10,r+18],[22,r+34]],p,3);
}

/* ---- Águilas ---- */
/* Pluma individual: raquis incuso y limbo en relieve */
function feather(ctx,p,len,w,off){
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(0,-w);
  c2.quadraticCurveTo(len*.55,-w*1.25,len-7,-w*.55);
  c2.quadraticCurveTo(len+5,0,len-7,w*.55);
  c2.quadraticCurveTo(len*.55,w*1.25,0,w);c2.closePath();},p,{off:off??1.8});
 iline(ctx,[[7,0],[len-12,0]],p,1.1);
 if(_W<.55){for(let k=1;k<=4;k++){
  const x=8+(len-22)*k/5;
  iline(ctx,[[x,-1],[x+8,-w*.68]],p,.75);
  iline(ctx,[[x,1],[x+8,w*.68]],p,.75);
 }}
}
/* Ala explayada construida pluma a pluma: rémiges + cobertoras */
function wing(ctx,p,sgn,spread=1){
 ctx.save();ctx.scale(sgn,1);
 const n=10,a0=-.95,a1=.55,L=122*spread;
 for(let i=0;i<n;i++){const a=a0+(a1-a0)*i/(n-1),len=L-i*4.2*spread;
  ctx.save();ctx.translate(14,-14);ctx.rotate(a);feather(ctx,p,len,7.6);ctx.restore();}
 for(let i=0;i<6;i++){const a=a0+.1+(a1-a0-.1)*i/5,len=60*spread-i*2.8;
  ctx.save();ctx.translate(13,-10);ctx.rotate(a);feather(ctx,p,len,6.4,1.4);ctx.restore();}
 ctx.restore();
}
function eagleUS(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 wing(ctx,p,-1);wing(ctx,p,1);
 // cola en abanico
 for(let i=-2;i<=2;i++){ctx.save();ctx.translate(0,42);ctx.rotate(Math.PI/2+i*.17);
  feather(ctx,p,54-Math.abs(i)*4,6.6,1.6);ctx.restore();}
 // cuerpo
 emboss(ctx,c2=>smooth(c2,[[-20,-24],[20,-24],[24,14],[14,46],[-14,46],[-24,14]]),p,{off:2.4});
 for(let i=0;i<3;i++)iline(ctx,[[-9+i*9,-16],[-11+i*9,10]],p,1.1);
 // cuello y cabeza vuelta a diestra, pico ganchudo
 emboss(ctx,c2=>smooth(c2,[[-8,-26],[-16,-44],[-27,-54],[-41,-52],[-44,-40],[-30,-32],[-14,-22]]),p,{off:2});
 emboss(ctx,c2=>poly(c2,[[-42,-49],[-60,-43],[-53,-38],[-42,-39]]),p,{off:1.3});
 iline(ctx,[[-58,-43],[-46,-42]],p,1.1);
 dot(ctx,-34,-46,2.3,p);
 // escudo del pecho: jefe liso y seis palos
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(-17,-16);c2.lineTo(17,-16);c2.lineTo(17,12);
  c2.bezierCurveTo(17,26,9,33,0,37);c2.bezierCurveTo(-9,33,-17,26,-17,12);c2.closePath();},p,{off:1.8});
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.38;ctx.fillRect(-17,-16,34,11);ctx.restore();
 iline(ctx,[[-17,-5],[17,-5]],p,1.6);
 for(let i=0;i<6;i++)iline(ctx,[[-14+i*5.6,-3],[-14+i*5.6,29]],p,1.2);
 // patas y garras
 for(const sg of [-1,1]){
  rline(ctx,[[sg*12,44],[sg*22,60]],p,3.4);
  for(let i=-1;i<=1;i++)rline(ctx,[[sg*22,60],[sg*22+i*6,70]],p,1.8);}
 // flechas en la garra siniestra (derecha del espectador)
 for(let i=0;i<3;i++){const dy=i*4-4;
  rline(ctx,[[24,60+dy],[66,50+dy]],p,2);
  emboss(ctx,c2=>poly(c2,[[66,46+dy],[76,49+dy],[66,54+dy]]),p,{off:1});
  rline(ctx,[[26,58+dy],[32,54+dy]],p,1.4);}
 // rama de olivo en la garra diestra
 icurve(ctx,[[-24,60],[-44,56],[-66,46]],p,2.6);
 for(let i=0;i<5;i++)emboss(ctx,c2=>ell(c2,-32-i*8,54-i*2.4,3.2,6.4,-.7),p,{off:1,blur:.4});
 for(let i=0;i<3;i++)dot(ctx,-36-i*11,60-i*2.6,2.6,p);
 // gloria de estrellas
 if(o.stars)for(let i=0;i<o.stars;i++){const a=-Math.PI/2+(i-(o.stars-1)/2)*.28;
  star(ctx,Math.cos(a)*72,-76+Math.sin(a)*22,6,p);}
 // cinta en el pico
 if(o.banner){
  emboss(ctx,c2=>smooth(c2,[[-64,-70],[0,-76],[64,-70],[66,-56],[0,-62],[-66,-56]]),p,{off:1.6});
  text(ctx,o.banner,0,-66,12,p,{pitch:.5});}
 ctx.restore();
}
function star(ctx,x,y,r,p){
 const pts=[];for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5;const rr=k%2?r*.45:r;pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr]);}
 emboss(ctx,c2=>poly(c2,pts),p,{off:1.2,blur:.5});
}
function eaglePrussian(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 wing(ctx,p,-1,1.1);wing(ctx,p,1,1.1);
 for(let i=-2;i<=2;i++){ctx.save();ctx.translate(0,50);ctx.rotate(Math.PI/2+i*.18);
  feather(ctx,p,52-Math.abs(i)*4,6.6,1.6);ctx.restore();}
 // cuerpo
 emboss(ctx,c2=>smooth(c2,[[-22,-22],[22,-22],[26,14],[16,52],[-16,52],[-26,14]]),p,{off:2.4});
 for(let i=0;i<3;i++)iline(ctx,[[-9+i*9,-14],[-11+i*9,12]],p,1.1);
 // cabeza a diestra, sin corona (águila imperial alemana)
 emboss(ctx,c2=>smooth(c2,[[-8,-24],[-16,-44],[-28,-54],[-42,-52],[-45,-40],[-30,-32],[-14,-22]]),p,{off:2});
 emboss(ctx,c2=>poly(c2,[[-43,-49],[-61,-43],[-54,-38],[-43,-39]]),p,{off:1.3});
 iline(ctx,[[-59,-43],[-47,-42]],p,1.1);
 dot(ctx,-35,-46,2.3,p);
 // escudo coronado del pecho
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(-17,-10);c2.lineTo(17,-10);c2.lineTo(17,16);
  c2.bezierCurveTo(17,30,9,36,0,40);c2.bezierCurveTo(-9,36,-17,30,-17,16);c2.closePath();},p,{off:1.8});
 iline(ctx,[[0,-10],[0,40]],p,1.5);iline(ctx,[[-17,14],[17,14]],p,1.5);
 for(let i=0;i<3;i++)iline(ctx,[[-14+i*5,-8],[-14+i*5,12]],p,1);
 ctx.save();ctx.translate(0,-16);royalCrown(ctx,0,0,.22,p);ctx.restore();
 // patas
 for(const sg of [-1,1]){rline(ctx,[[sg*12,50],[sg*24,64]],p,3.2);
  for(let i=-1;i<=1;i++)rline(ctx,[[sg*24,64],[sg*24+i*6,73]],p,1.7);}
 // cetro y orbe
 rline(ctx,[[-24,64],[-60,48]],p,3);
 emboss(ctx,c2=>poly(c2,[[-60,42],[-54,48],[-60,54],[-66,48]]),p,{off:1.2});
 rline(ctx,[[24,64],[54,52]],p,3);
 dot(ctx,60,48,7,p);rline(ctx,[[60,38],[60,44]],p,2);rline(ctx,[[56,41],[64,41]],p,2);
 // collar de la orden
 for(let i=0;i<9;i++){const a=Math.PI*.12+i/8*Math.PI*.76;dot(ctx,Math.cos(a)*48,16+Math.sin(a)*42,2.6,p);}
 ctx.restore();
}
function eagleDouble(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 wing(ctx,p,-1,1.05);wing(ctx,p,1,1.05);
 for(let i=-3;i<=3;i++){ctx.save();ctx.translate(0,52);ctx.rotate(Math.PI/2+i*.15);
  feather(ctx,p,54-Math.abs(i)*3.5,6.4,1.6);ctx.restore();}
 // cuerpo
 emboss(ctx,c2=>smooth(c2,[[-24,-18],[24,-18],[28,16],[18,54],[-18,54],[-28,16]]),p,{off:2.4});
 // dos cuellos y cabezas afrontadas
 for(const sgn of [-1,1]){
  ctx.save();ctx.scale(sgn,1);
  emboss(ctx,c2=>smooth(c2,[[4,-18],[12,-40],[24,-52],[38,-50],[41,-38],[26,-30],[14,-16]]),p,{off:2});
  emboss(ctx,c2=>poly(c2,[[39,-47],[57,-41],[50,-36],[39,-37]]),p,{off:1.3});
  iline(ctx,[[55,-41],[43,-40]],p,1.1);
  dot(ctx,31,-44,2.2,p);
  ctx.save();ctx.translate(28,-58);royalCrown(ctx,0,0,.19,p);ctx.restore();
  ctx.restore();
 }
 // corona imperial central
 ctx.save();ctx.translate(0,-70);royalCrown(ctx,0,0,.26,p);ctx.restore();
 // escudo del pecho
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(-18,-6);c2.lineTo(18,-6);c2.lineTo(18,20);
  c2.bezierCurveTo(18,34,10,40,0,44);c2.bezierCurveTo(-10,40,-18,34,-18,20);c2.closePath();},p,{off:1.8});
 iline(ctx,[[0,-6],[0,44]],p,1.8);iline(ctx,[[-18,16],[18,16]],p,1.8);
 dot(ctx,0,16,4,p);
 // patas, cetro y orbe
 for(const sg of [-1,1]){rline(ctx,[[sg*13,52],[sg*26,66]],p,3.2);
  for(let i=-1;i<=1;i++)rline(ctx,[[sg*26,66],[sg*26+i*6,75]],p,1.7);}
 rline(ctx,[[-26,66],[-58,52]],p,3);
 emboss(ctx,c2=>poly(c2,[[-58,46],[-52,52],[-58,58],[-64,52]]),p,{off:1.2});
 rline(ctx,[[26,66],[54,56]],p,3);dot(ctx,60,52,7,p);
 rline(ctx,[[60,42],[60,48]],p,2);rline(ctx,[[56,45],[64,45]],p,2);
 ctx.restore();
}
function eagleMexican(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // alas alzadas, pluma a pluma
 for(const sgn of [-1,1]){ctx.save();ctx.scale(sgn,1);ctx.rotate(-.26);wing(ctx,p,1,1.02);ctx.restore();}
 // cuerpo de perfil
 emboss(ctx,c2=>smooth(c2,[[-16,-10],[16,-14],[24,20],[10,44],[-12,40],[-22,14]]),p,{off:2.2});
 for(let i=0;i<3;i++)iline(ctx,[[-10+i*9,-4],[-12+i*9,26]],p,1.1);
 // cabeza y serpiente en el pico
 emboss(ctx,c2=>smooth(c2,[[6,-14],[14,-40],[28,-50],[40,-46],[42,-34],[28,-28],[20,-16]]),p,{off:1.8});
 emboss(ctx,c2=>poly(c2,[[40,-44],[56,-38],[49,-33],[40,-34]]),p,{off:1.2});
 dot(ctx,32,-42,2.2,p);
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(54,-38);c2.quadraticCurveTo(76,-30,72,-10);
  c2.quadraticCurveTo(68,4,52,0);c2.quadraticCurveTo(64,-8,64,-18);
  c2.quadraticCurveTo(62,-30,52,-32);c2.closePath();},p,{off:1.4});
 dot(ctx,70,-14,1.8,p);
 // nopal sobre la peña
 emboss(ctx,c2=>smooth(c2,[[-10,44],[10,44],[14,66],[-14,66]]),p,{off:1.6});
 for(const sgn of [-1,1]){emboss(ctx,c2=>ell(c2,sgn*22,58,13,9,sgn*.3),p,{off:1.2});
  for(let i=0;i<3;i++)dot(ctx,sgn*22-6+i*6,56,1.4,p);}
 rline(ctx,[[-40,78],[-10,86],[20,80],[44,86]],p,3);
 ctx.restore();
}
/* ---- Figuras ---- */
/* San Jorge y el dragón (soberano, tipo Pistucci): caballo al galope a la
   derecha, jinete con yelmo y capa que clava la lanza en el dragón. */
function stGeorge(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??10);ctx.scale(o.s??1,o.s??1);
 rline(ctx,[[-120,112],[120,112]],p,2.5);
 // dragón derribado
 emboss(ctx,c2=>{c2.beginPath();
  smoothU(c2,[[26,110],[54,96],[86,100],[104,110],[80,120],[42,118]]);
  smoothU(c2,[[100,104],[118,96],[126,104],[112,112]]);
  smoothU(c2,[[66,98],[58,74],[78,80],[80,96]]);
  smoothU(c2,[[30,110],[8,114],[2,124],[20,118],[36,116]]);},p,{off:2,outer:true});
 dot(ctx,116,102,2.2,p);
 iline(ctx,[[112,108],[124,106]],p,1.2);
 // caballo y jinete: silueta unificada
 const grp=c2=>{
  c2.beginPath();
  // cola
  taperU(c2,curvePts([[-56,20],[-84,42],[-96,80],[-88,104]],5),17,6);
  // patas traseras
  taperU(c2,curvePts([[-28,50],[-20,78],[-26,102]],5),14,7);
  ellU(c2,-25,107,7,4.5);
  taperU(c2,curvePts([[-44,44],[-52,74],[-44,100]],5),16,8);
  ellU(c2,-43,105,7.5,4.5);
  // patas delanteras
  taperU(c2,curvePts([[24,40],[36,72],[34,100]],5),13,7);
  ellU(c2,34,105,7,4.5);
  taperU(c2,curvePts([[36,30],[56,44],[48,66]],5),15,8);
  ellU(c2,46,71,7,4.5,.4);
  // cuerpo
  smoothU(c2,[[-58,18],[-30,4],[10,0],[38,10],[44,34],[20,52],[-20,56],[-50,44]]);
  // cuello y cabeza
  taperU(c2,curvePts([[30,10],[48,-16],[64,-38]],5),34,22);
  smoothU(c2,[[60,-46],[80,-40],[97,-27],[92,-17],[74,-22],[58,-28]]);
  polyU(c2,[[64,-46],[69,-62],[77,-44]]);
  // crin
  polyU(c2,[[26,2],[34,-14],[40,-6],[48,-26],[54,-16],[62,-40],[68,-34],[58,-8],[44,8],[32,14]]);
  // jinete
  smoothU(c2,[[-4,-46],[-40,-38],[-64,-8],[-44,-16],[-18,-20]]);   // capa
  smoothU(c2,[[-14,-2],[-6,-30],[6,-48],[20,-44],[18,-18],[6,0]]); // torso
  taperU(c2,curvePts([[-6,-2],[2,20],[12,32]],5),13,8);            // pierna
  ellU(c2,15,35,7,4.5,.3);
  ellU(c2,14,-60,11,12,-.1);                                       // cabeza
  smoothU(c2,[[2,-66],[14,-77],[27,-66],[24,-56],[4,-56]]);        // yelmo
  polyU(c2,[[13,-77],[17,-95],[25,-90],[20,-72]]);                 // penacho
  taperU(c2,curvePts([[16,-44],[32,-26],[44,-8]],5),11,8);         // brazo de la lanza
  ellU(c2,46,-6,5.5,4.5,.6);
  taperU(c2,curvePts([[8,-44],[26,-38],[40,-30]],5),10,7);         // brazo de las riendas
  ellU(c2,42,-29,5,4.2,.2);
 };
 emboss(ctx,grp,p,{off:2.8,outer:true});
 // detalles incusos
 icurve(ctx,[[-46,22],[-20,12],[14,10],[36,20]],p,1.3);   // lomo
 icurve(ctx,[[-40,44],[-10,50],[18,46]],p,1.2);           // vientre
 icurve(ctx,[[34,4],[48,-14],[62,-34]],p,1.2);            // cuello
 iline(ctx,[[86,-24],[94,-22]],p,1.1);                    // boca
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.75;circle(ctx,76,-32,2.4);ctx.fill();ctx.restore();
 dot(ctx,75.4,-32.6,1.2,p);
 iline(ctx,[[67,-52],[71,-46]],p,.9);                     // oreja
 for(let i=0;i<4;i++)icurve(ctx,[[-60-i*8,26+i*16],[-80-i*5,48+i*14],[-88-i*2,80+i*6]],p,1);
 icurve(ctx,[[-6,-28],[4,-40],[14,-44]],p,1.1);           // torso
 iline(ctx,[[4,-58],[24,-58]],p,1.1);                     // visera
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.7;circle(ctx,19,-60,1.8);ctx.fill();ctx.restore();
 icurve(ctx,[[-8,-42],[-34,-34],[-56,-12]],p,1.1);        // capa
 // lanza y riendas
 rline(ctx,[[16,-54],[98,102]],p,3.6);
 emboss(ctx,c2=>poly(c2,[[92,94],[104,108],[88,102]]),p,{off:1.2});
 icurve(ctx,[[42,-29],[60,-30],[76,-24]],p,2);
 ctx.restore();
}
function horseman(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // caballo al galope
 emboss(ctx,c2=>smooth(c2,[[-70,20],[-40,0],[-10,-6],[30,-4],[56,10],[60,30],[40,40],[50,66],[30,66],[20,44],[-20,44],[-30,68],[-50,68],[-44,40],[-66,36]]),p,{off:2.6});
 emboss(ctx,c2=>smooth(c2,[[50,4],[70,-20],[86,-26],[94,-14],[84,0],[66,16]]),p,{off:2});
 emboss(ctx,c2=>poly(c2,[[94,-18],[108,-12],[92,-6]]),p,{off:1.2});
 // patas extendidas
 rline(ctx,[[-60,30],[-86,52]],p,5);rline(ctx,[[-40,36],[-58,64]],p,5);
 rline(ctx,[[44,36],[70,56]],p,5);rline(ctx,[[56,28],[84,40]],p,5);
 // cola
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(-68,16);c2.quadraticCurveTo(-96,20,-98,48);c2.quadraticCurveTo(-90,56,-84,48);c2.quadraticCurveTo(-86,28,-62,26);c2.closePath();},p,{off:1.6});
 // jinete con antorcha
 emboss(ctx,c2=>smooth(c2,[[-10,-6],[-2,-40],[12,-48],[24,-40],[18,-12],[6,0]]),p,{off:2});
 emboss(ctx,c2=>ell(c2,10,-56,9,11),p,{off:1.6});
 rline(ctx,[[18,-40],[40,-64]],p,4); // brazo antorcha
 emboss(ctx,c2=>smooth(c2,[[38,-64],[46,-84],[52,-64],[46,-58]]),p,{off:1.4}); // llama
 // rayos de sol detrás
 if(o.rays){ctx.save();ctx.globalAlpha=.5;for(let i=0;i<9;i++){const a=-Math.PI*.85+i/8*Math.PI*.7;rline(ctx,[[Math.cos(a)*70,Math.sin(a)*70-20],[Math.cos(a)*110,Math.sin(a)*110-20]],p,2);}ctx.restore();}
 ctx.restore();
}
function seatedLiberty(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // peña
 emboss(ctx,c2=>smooth(c2,[[-70,60],[-42,40],[18,44],[60,60],[50,86],[-60,86]]),p,{off:2.4});
 const fig=c2=>{c2.beginPath();
  // ropaje y piernas recogidas hacia la izquierda
  smoothU(c2,[[-56,54],[-34,30],[-8,20],[16,26],[26,48],[6,62],[-30,64]]);
  ellU(c2,-56,56,9,5,-.2);
  // torso erguido
  smoothU(c2,[[4,26],[2,-8],[10,-28],[26,-26],[32,-2],[26,26]]);
  taperU(c2,curvePts([[16,-28],[18,-36]],4),11,10);
  ellU(c2,18,-46,10.5,12,-.1);
  ellU(c2,27,-48,6,7);
  // brazo derecho alzado con el asta
  taperU(c2,curvePts([[26,-24],[36,-38],[40,-52]],5),10,7);
  ellU(c2,41,-54,5,4.2,-.5);
  // brazo izquierdo sobre el escudo
  taperU(c2,curvePts([[8,-22],[-6,-6],[-16,8]],5),10,7);
  ellU(c2,-18,10,5,4.2,.5);
 };
 emboss(ctx,fig,p,{off:2.6,outer:true});
 // asta y gorro frigio
 rline(ctx,[[48,-74],[34,-18]],p,3);
 emboss(ctx,c2=>smooth(c2,[[40,-76],[48,-94],[58,-80],[48,-72]]),p,{off:1.4});
 // escudo con LIBERTY
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(-48,6);c2.lineTo(-20,4);c2.lineTo(-19,34);
  c2.bezierCurveTo(-19,46,-27,52,-34,56);c2.bezierCurveTo(-42,50,-48,42,-48,30);c2.closePath();},p,{off:1.8});
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.35;poly(ctx,[[-48,14],[-20,12],[-20,24],[-48,26]]);ctx.fill();ctx.restore();
 iline(ctx,[[-48,14],[-20,12]],p,1.4);iline(ctx,[[-48,26],[-20,24]],p,1.4);
 text(ctx,'LIBERTY',-34,19,8,p,{pitch:.52});
 // pliegues y rostro
 for(let i=0;i<5;i++)icurve(ctx,[[-40+i*13,30],[-30+i*13,44],[-24+i*13,58]],p,1.2);
 icurve(ctx,[[8,-20],[16,-6],[14,14]],p,1.1);
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.75;circle(ctx,12,-48,1.9);ctx.fill();ctx.restore();
 iline(ctx,[[9,-46],[7,-42],[11,-41]],p,.9);
 icurve(ctx,[[10,-56],[18,-58],[26,-55]],p,1);
 ctx.restore();
}
function herculesGroup(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 const grp=c2=>{c2.beginPath();
  const body=(x,drape)=>{
   if(drape){smoothU(c2,[[x-11,-26],[x+11,-26],[x+13,-2],[x+17,34],[x+9,56],[x-9,56],[x-17,34],[x-13,-2]]);
    ellU(c2,x-7,58,5,3);ellU(c2,x+7,58,5,3);}
   else{smoothU(c2,[[x-13,-26],[x+13,-26],[x+9,-4],[x+11,12],[x-11,12],[x-9,-4]]);
    taperU(c2,curvePts([[x-6,10],[x-7,36],[x-8,56]],4),11,7);
    taperU(c2,curvePts([[x+6,10],[x+7,36],[x+8,56]],4),11,7);
    ellU(c2,x-9,58,5.5,3);ellU(c2,x+9,58,5.5,3);}
   taperU(c2,curvePts([[x,-28],[x,-34]],4),9,8);
   ellU(c2,x,-42,8.5,10);
  };
  body(-46,true);body(46,true);body(0,false);
  // Hércules: maza y brazo sobre Libertad
  taperU(c2,curvePts([[11,-24],[22,-6],[24,14]],4),9,6);
  taperU(c2,curvePts([[-11,-24],[-26,-20],[-38,-22]],4),9,6);
  // piel de león sobre el hombro
  smoothU(c2,[[-14,-28],[-4,-32],[6,-26],[2,-8],[-12,-10]]);
  // Libertad: pica y mano tendida
  taperU(c2,curvePts([[-36,-24],[-24,-22],[-16,-24]],4),8,5);
  taperU(c2,curvePts([[-56,-24],[-62,-6],[-60,10]],4),8,5);
  // Igualdad: nivel y mano tendida
  taperU(c2,curvePts([[36,-24],[24,-22],[16,-24]],4),8,5);
  taperU(c2,curvePts([[56,-24],[66,-14],[72,-16]],4),8,5);
 };
 emboss(ctx,grp,p,{off:2.2,outer:true});
 // maza
 emboss(ctx,c2=>taper(c2,curvePts([[25,14],[29,36],[31,58]],4),7,11),p,{off:1.6});
 // pica y gorro frigio
 rline(ctx,[[-62,-72],[-59,16]],p,2.6);
 emboss(ctx,c2=>smooth(c2,[[-70,-72],[-62,-88],[-54,-74],[-62,-68]]),p,{off:1.2});
 // nivel de la Igualdad
 rline(ctx,[[62,-18],[86,-18]],p,2.6);
 iline(ctx,[[74,-18],[74,-4]],p,1.4);dot(ctx,74,-2,3,p);
 // pliegues y detalles
 for(const x of [-46,46])for(let i=0;i<4;i++)icurve(ctx,[[x-10+i*7,-4],[x-13+i*8,26],[x-15+i*8,52]],p,1);
 icurve(ctx,[[-9,-22],[0,-14],[9,-22]],p,1.1);
 iline(ctx,[[-8,-4],[8,-4]],p,1);
 for(const x of [-46,0,46]){ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.7;circle(ctx,x+3,-43,1.6);ctx.fill();ctx.restore();}
 rline(ctx,[[-72,62],[74,62]],p,3);
 ctx.restore();
}
function romaSeated(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 emboss(ctx,c2=>smooth(c2,[[-50,60],[-20,44],[30,48],[56,62],[46,86],[-44,86]]),p,{off:2.2});
 emboss(ctx,c2=>smooth(c2,[[-24,44],[-18,-6],[-6,-34],[12,-36],[24,-8],[28,34],[40,52],[10,60],[-14,56]]),p,{off:2.2});
 emboss(ctx,c2=>ell(c2,0,-48,11,13),p,{off:1.8});
 emboss(ctx,c2=>smooth(c2,[[-10,-58],[2,-64],[12,-56],[2,-52]]),p,{off:1.2}); // yelmo
 // lanza
 rline(ctx,[[-26,-30],[-34,-80]],p,3);
 // Victoria en mano
 rline(ctx,[[18,-24],[44,-34]],p,3.5);
 emboss(ctx,c2=>smooth(c2,[[44,-34],[50,-50],[56,-34],[50,-28]]),p,{off:1.2});
 // escudo
 emboss(ctx,c2=>ell(c2,-30,30,14,20),p,{off:1.6});
 for(let i=0;i<3;i++)iline(ctx,[[-12+i*10,0],[-16+i*10,50]],p,1.5);
 ctx.restore();
}
function angelVictory(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // alas explayadas, pluma a pluma
 for(const sgn of [-1,1]){ctx.save();ctx.scale(.52,.52);ctx.rotate(-sgn*.42);wing(ctx,p,sgn,1);ctx.restore();}
 const fig=c2=>{c2.beginPath();
  // túnica larga
  smoothU(c2,[[-15,-30],[15,-30],[19,4],[22,44],[12,66],[-12,66],[-22,44],[-19,4]]);
  smoothU(c2,[[-12,-32],[12,-32],[14,-12],[-14,-12]]);
  taperU(c2,curvePts([[0,-32],[0,-40]],4),10,9);
  ellU(c2,0,-48,10,11.5);
  ellU(c2,-8,-50,5.5,6.5);
  // brazo derecho alzado con la corona de laurel
  taperU(c2,curvePts([[12,-28],[24,-46],[28,-62]],5),9,6);
  ellU(c2,29,-64,4.6,4,-.5);
  // brazo izquierdo con la cadena rota
  taperU(c2,curvePts([[-12,-26],[-22,-10],[-24,6]],5),9,6);
  ellU(c2,-25,8,4.6,4,.4);
 };
 emboss(ctx,fig,p,{off:2.2,outer:true});
 // nimbo
 ctx.save();ctx.strokeStyle=p.light;ctx.globalAlpha=.65;ctx.lineWidth=2;circle(ctx,0,-50,16);ctx.stroke();ctx.restore();
 // corona de laurel en la diestra
 ctx.save();ctx.translate(31,-76);
 for(let i=0;i<12;i++){const a=i/12*TAU;
  emboss(ctx,c2=>ell(c2,Math.cos(a)*11,Math.sin(a)*11,2.6,5,a+1.57),p,{off:.9,blur:.4});}
 ctx.restore();
 // cadena rota
 for(let i=0;i<4;i++)emboss(ctx,c2=>ell(c2,-26-i*2.4,14+i*6,3,2.2,.5),p,{off:.9});
 // pliegues y rostro
 for(let i=0;i<5;i++)icurve(ctx,[[-14+i*7,-6],[-17+i*8,26],[-19+i*8,60]],p,1.1);
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.7;circle(ctx,4,-50,1.7);ctx.fill();ctx.restore();
 iline(ctx,[[7,-48],[9,-44],[5,-43]],p,.9);
 // pedestal
 emboss(ctx,c2=>poly(c2,[[-20,66],[20,66],[24,76],[-24,76]]),p,{off:1.8});
 ctx.restore();
}
function owl(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // cuerpo
 emboss(ctx,c2=>smooth(c2,[[-30,-20],[30,-20],[36,30],[20,66],[-20,66],[-36,30]]),p,{off:2.6});
 // cabeza con ojos grandes
 emboss(ctx,c2=>smooth(c2,[[-30,-20],[-26,-52],[0,-62],[26,-52],[30,-20]]),p,{off:2.2});
 for(const sgn of [-1,1]){emboss(ctx,c2=>circle(c2,sgn*14,-40,11),p,{off:1.6});dot(ctx,sgn*14,-40,4,p);}
 emboss(ctx,c2=>poly(c2,[[-4,-30],[4,-30],[0,-18]]),p,{off:1.2}); // pico
 // plumaje
 for(let i=0;i<5;i++)for(let j=0;j<3;j++)iline(ctx,[[-20+i*10,-6+j*20],[-14+i*10,2+j*20]],p,1.3);
 // alas plegadas
 rline(ctx,[[-30,-10],[-34,40],[-20,60]],p,3);rline(ctx,[[30,-10],[34,40],[20,60]],p,3);
 // patas
 rline(ctx,[[-12,66],[-12,84]],p,3);rline(ctx,[[12,66],[12,84]],p,3);
 for(const sgn of [-1,1])for(let i=0;i<3;i++)rline(ctx,[[sgn*12,84],[sgn*12+sgn*i*4-4,92]],p,2);
 // ramita olivo + creciente
 rline(ctx,[[-52,-40],[-66,-60]],p,2.5);dot(ctx,-60,-52,3,p);dot(ctx,-68,-62,3,p);
 emboss(ctx,c2=>{c2.beginPath();c2.arc(-58,-20,10,Math.PI*.2,Math.PI*1.4);c2.arc(-54,-20,7,Math.PI*1.4,Math.PI*.2,true);c2.closePath();},p,{off:1.2});
 ctx.restore();
}
function athenaHead(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 head(ctx,p,{mirror:false,hair:'helmet',nose:1.1,chin:1.1,drape:'none'});
 ctx.restore();
}
function dragonJP(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // cuerpo serpenteante en espiral
 const body=[];for(let i=0;i<=40;i++){const t=i/40;const a=t*TAU*1.6-Math.PI/2;const r=120-t*70;body.push([Math.cos(a)*r,Math.sin(a)*r]);}
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.strokeStyle=p.shadow;ctx.globalAlpha=.5;ctx.lineWidth=30;ctx.beginPath();ctx.moveTo(body[0][0]+2,body[0][1]+2);for(const q of body)ctx.lineTo(q[0]+2,q[1]+2);ctx.stroke();
 ctx.strokeStyle=p.light;ctx.globalAlpha=.7;ctx.lineWidth=24;ctx.beginPath();ctx.moveTo(body[0][0]-2,body[0][1]-2);for(const q of body)ctx.lineTo(q[0]-2,q[1]-2);ctx.stroke();
 const g=ctx.createLinearGradient(-120,-120,120,120);g.addColorStop(0,p.light);g.addColorStop(.5,p.mid);g.addColorStop(1,p.base);
 ctx.strokeStyle=g;ctx.globalAlpha=1;ctx.lineWidth=22;ctx.beginPath();ctx.moveTo(body[0][0],body[0][1]);for(const q of body)ctx.lineTo(q[0],q[1]);ctx.stroke();
 ctx.restore();
 // Escamas superpuestas, no simples puntos: cada escama incorpora lomo y vientre.
 // La orientación se calcula a partir de la tangente de la espiral.
 if(_W<.7){for(let i=2;i<body.length-2;i++){
  const q=body[i],prev=body[i-1],next=body[i+1];
  const ang=Math.atan2(next[1]-prev[1],next[0]-prev[0]);
  ctx.save();ctx.translate(q[0],q[1]);ctx.rotate(ang);
  iline(ctx,[[-4,-8],[1,-5],[5,0],[1,5],[-4,8]],p,1.15);
  if(i%3===0)iline(ctx,[[-2,10],[3,12]],p,.7);
  ctx.restore();
 }}
 // cabeza (exterior espiral)
 const h=body[0];
 ctx.save();ctx.translate(h[0],h[1]);
 emboss(ctx,c2=>smooth(c2,[[-16,-10],[16,-16],[34,-6],[30,10],[10,16],[-12,12]]),p,{off:2});
 emboss(ctx,c2=>poly(c2,[[30,-8],[48,-2],[30,4]]),p,{off:1.4}); // hocico
 // cuernos y bigotes
 rline(ctx,[[-6,-14],[-16,-34]],p,3);rline(ctx,[[6,-16],[2,-38]],p,3);
 rline(ctx,[[40,0],[58,8],[64,20]],p,2);rline(ctx,[[38,6],[54,18]],p,2);
 dot(ctx,16,-6,3,p);
 // melena
 for(let i=0;i<4;i++)rline(ctx,[[-14+i*4,-8],[-30+i*4,-20-i*4]],p,2);
 ctx.restore();
 // Patas anteriores y posteriores con articulaciones y garras separadas.
 for(const [gx,gy,sgn] of [[-60,60,-1],[70,40,1],[-25,-66,-1],[52,-46,1]]){
  rline(ctx,[[gx,gy],[gx+sgn*14,gy+15],[gx+sgn*17,gy+25]],p,4.2);
  dot(ctx,gx+sgn*14,gy+15,5,p);
  for(let i=-1;i<=1;i++)rline(ctx,[[gx+sgn*17,gy+25],[gx+sgn*(28+i*4),gy+34+(i%2)*3]],p,1.7);
 }
 // Filamentos de las crines, barbas y llama alrededor de la perla.
 for(let i=0;i<9;i++){
  const a=(i/9)*TAU;
  const x=Math.cos(a)*122,y=Math.sin(a)*122;
  iline(ctx,[[x,y],[x+Math.cos(a+.3)*9,y+Math.sin(a+.3)*9]],p,1.2);
 }
 // perla flamígera
 dot(ctx,0,0,10,p);for(let i=0;i<6;i++){const a=i/6*TAU;rline(ctx,[[Math.cos(a)*12,Math.sin(a)*12],[Math.cos(a)*20,Math.sin(a)*20]],p,2);}
 ctx.restore();
}
function elephant(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // cuerpo
 emboss(ctx,c2=>smooth(c2,[[-70,-10],[-50,-40],[-10,-50],[40,-44],[70,-20],[74,10],[60,30],[40,34],[-40,34],[-66,20]]),p,{off:2.8});
 // cabeza
 emboss(ctx,c2=>smooth(c2,[[60,-30],[86,-34],[100,-16],[96,6],[80,14],[64,6]]),p,{off:2.2});
 // oreja
 emboss(ctx,c2=>smooth(c2,[[58,-26],[76,-22],[74,4],[58,8],[50,-8]]),p,{off:1.8});
 // trompa
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(96,4);c2.quadraticCurveTo(112,30,104,56);c2.quadraticCurveTo(100,68,90,64);c2.quadraticCurveTo(98,40,86,16);c2.closePath();},p,{off:1.8});
 // colmillo
 emboss(ctx,c2=>poly(c2,[[84,12],[98,26],[92,30],[80,18]]),p,{off:1.2});
 dot(ctx,84,-16,3,p);
 // Patas de distinta profundidad, articulaciones y uñas (no cuatro barras lisas).
 for(const [i,px] of [-50,-20,20,50].entries()){
  const y=i%2?58:65;
  emboss(ctx,c2=>smooth(c2,[[px-11,19],[px+11,21],[px+12,y-7],[px+16,y],[px-14,y],[px-10,y-11]]),p,{off:1.7});
  for(let u=-1;u<=1;u++)iline(ctx,[[px+u*6-3,y-4],[px+u*6-1,y-1]],p,.8);
 }
 // Pliegues del vientre, frente, trompa y oreja, grabados al buril.
 icurve(ctx,[[-56,6],[-22,17],[23,13],[51,4]],p,1.6);
 for(let i=0;i<4;i++)icurve(ctx,[[67+i*3,-22],[69+i*2,-12],[64+i*2,0]],p,1.05);
 for(let i=0;i<4;i++)icurve(ctx,[[91+i*3,14+i*8],[100+i*2,19+i*8],[103+i,26+i*8]],p,1.05);
 for(let i=0;i<4;i++)icurve(ctx,[[-38+i*26,-34],[-19+i*21,-38],[0+i*18,-34]],p,.85);
 // cola
 rline(ctx,[[-70,-6],[-86,16],[-82,34]],p,3);
 // Serpiente aplastada, con cabeza, lengua y escamas incusas.
 emboss(ctx,c2=>{c2.beginPath();c2.moveTo(-65,76);c2.bezierCurveTo(-30,66,10,82,41,76);
  c2.quadraticCurveTo(65,66,87,78);c2.quadraticCurveTo(91,88,79,90);
  c2.bezierCurveTo(39,83,-15,81,-66,84);c2.closePath();},p,{off:1.3});
 dot(ctx,81,78,2,p);iline(ctx,[[88,83],[101,88],[105,85]],p,1.2);
 for(let k=0;k<10;k++){const x=-54+k*13;iline(ctx,[[x,75],[x+4,81]],p,.7);}
 ctx.restore();
}
function pontificalTools(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // simpulum (cucharón)
 rline(ctx,[[-60,-60],[-60,20]],p,4);
 emboss(ctx,c2=>{c2.beginPath();c2.arc(-60,34,16,0,Math.PI);c2.closePath();},p,{off:1.8});
 // aspergillum (hisopo)
 rline(ctx,[[-20,-60],[-20,10]],p,4);
 emboss(ctx,c2=>smooth(c2,[[-30,10],[-10,10],[-12,44],[-28,44]]),p,{off:1.6});
 for(let i=0;i<4;i++)iline(ctx,[[-26+i*4,14],[-26+i*4,40]],p,1.3);
 // secespita (cuchillo)
 rline(ctx,[[20,-60],[20,-10]],p,4);
 emboss(ctx,c2=>poly(c2,[[14,-10],[26,-10],[24,44],[18,44]]),p,{off:1.6});
 // apex (gorro)
 emboss(ctx,c2=>smooth(c2,[[50,-20],[70,-40],[90,-20],[86,10],[54,10]]),p,{off:1.8});
 rline(ctx,[[70,-40],[70,-58]],p,3);dot(ctx,70,-60,4,p);
 ctx.restore();
}
function quadriga(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // cuatro caballos (siluetas escalonadas)
 for(let i=0;i<4;i++){const ox=-30+i*16, oy=-i*4;
  ctx.save();ctx.translate(ox,oy);ctx.globalAlpha=1-i*.12;
  emboss(ctx,c2=>smooth(c2,[[-30,20],[-10,0],[20,-6],[40,4],[44,24],[30,30],[36,52],[20,52],[14,34],[-14,34],[-22,54],[-36,54],[-30,30]]),p,{off:2});
  emboss(ctx,c2=>smooth(c2,[[36,0],[52,-20],[64,-24],[70,-14],[60,-2],[46,10]]),p,{off:1.6});
  rline(ctx,[[-24,30],[-34,52]],p,3);rline(ctx,[[30,28],[42,50]],p,3);
  ctx.restore();}
 // carro
 emboss(ctx,c2=>smooth(c2,[[-70,20],[-40,10],[-30,40],[-60,50]]),p,{off:2});
 emboss(ctx,c2=>circle(c2,-52,52,16),p,{off:1.8});
 for(let i=0;i<6;i++){const a=i/6*TAU;rline(ctx,[[-52+Math.cos(a)*6,52+Math.sin(a)*6],[-52+Math.cos(a)*15,52+Math.sin(a)*15]],p,1.6);}
 // auriga
 emboss(ctx,c2=>smooth(c2,[[-58,10],[-52,-20],[-42,-26],[-34,-18],[-38,8]]),p,{off:1.8});
 emboss(ctx,c2=>ell(c2,-46,-34,8,10),p,{off:1.4});
 rline(ctx,[[-40,-16],[-10,-24]],p,3); // riendas
 ctx.restore();
}
function swissShield(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 emboss(ctx,c2=>smooth(c2,[[-50,-60],[50,-60],[48,20],[0,60],[-48,20]]),p,{off:2.6});
 // cruz
 emboss(ctx,c2=>poly(c2,[[-12,-40],[12,-40],[12,-12],[40,-12],[40,12],[12,12],[12,40],[-12,40],[-12,12],[-40,12],[-40,-12],[-12,-12]]),p,{off:2});
 ctx.restore();
}
function yokeArrows(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // yugo: viga curva con dos anillas
 emboss(ctx,c2=>{c2.beginPath();
  c2.moveTo(-78,-34);c2.quadraticCurveTo(0,-84,78,-34);
  c2.lineTo(72,-16);c2.quadraticCurveTo(0,-62,-72,-16);c2.closePath();},p,{off:2.4});
 for(const sg of [-1,1]){
  emboss(ctx,c2=>{c2.beginPath();c2.arc(sg*74,-26,13,0,TAU);c2.arc(sg*74,-26,6,0,TAU,true);},p,{off:1.6});}
 // haz de cinco flechas
 for(let i=-2;i<=2;i++){const x=i*15;
  emboss(ctx,c2=>poly(c2,[[x-2.2,-20],[x+2.2,-20],[x+2.2,54],[x-2.2,54]]),p,{off:1.2});
  emboss(ctx,c2=>poly(c2,[[x-5.5,54],[x,74],[x+5.5,54]]),p,{off:1.4});
  for(const sg of [-1,1])emboss(ctx,c2=>poly(c2,[[x+sg*1.5,-22],[x+sg*6,-13],[x+sg*6,-3],[x+sg*1.5,-9]]),p,{off:1});}
 // cinta del haz
 emboss(ctx,c2=>poly(c2,[[-38,16],[38,16],[38,28],[-38,28]]),p,{off:1.8});
 for(const sg of [-1,1])emboss(ctx,c2=>poly(c2,[[sg*38,16],[sg*50,10],[sg*46,22],[sg*52,32],[sg*38,28]]),p,{off:1.3});
 ctx.restore();
}
function crossJerusalem(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // cruz potenzada
 emboss(ctx,c2=>poly(c2,[[-14,-90],[14,-90],[14,-14],[90,-14],[90,14],[14,14],[14,90],[-14,90],[-14,14],[-90,14],[-90,-14],[-14,-14]]),p,{off:2.4});
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){
  ctx.save();ctx.translate(sx*52,sy*52);
  if(sx*sy<0)castle(ctx,0,0,.4,p);else lion(ctx,0,0,.4,p);
  ctx.restore();}
 ctx.restore();
}
function plainPotentCross(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 emboss(ctx,c2=>poly(c2,[[-14,-90],[14,-90],[14,-14],[90,-14],[90,14],[14,14],[14,90],[-14,90],[-14,14],[-90,14],[-90,-14],[-14,-14]]),p,{off:2.4});
 ctx.restore();
}
function chrysanthemum(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 for(let i=0;i<16;i++){const a=i/16*TAU;
  ctx.save();ctx.rotate(a);emboss(ctx,c2=>ell(c2,0,-26,8,18),p,{off:1.4,blur:.6});ctx.restore();}
 dot(ctx,0,0,12,p);
 ctx.restore();
}
function frenchMantle(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // manto imperial
 emboss(ctx,c2=>smooth(c2,[[-80,-60],[80,-60],[96,40],[60,90],[0,100],[-60,90],[-96,40]]),p,{off:2.8});
 // armiños
 for(let i=0;i<6;i++)for(let j=0;j<3;j++){const x=-60+i*24,y=-30+j*36;dot(ctx,x,y,2.4,p);rline(ctx,[[x-3,y+4],[x,y+8],[x+3,y+4]],p,1.2);}
 // escudo con águila
 emboss(ctx,c2=>smooth(c2,[[-40,-40],[40,-40],[38,30],[0,52],[-38,30]]),p,{off:2.2});
 eagleUS(ctx,p,{x:0,y:-6,s:.42,stars:0});
 // corona encima
 ctx.save();ctx.translate(0,-78);royalCrown(ctx,0,0,.5,p);ctx.restore();
 // cetros cruzados
 rline(ctx,[[-70,-50],[60,80]],p,4);rline(ctx,[[70,-50],[-60,80]],p,4);
 dot(ctx,-70,-52,6,p);dot(ctx,70,-52,6,p);
 // collar de orden
 emboss(ctx,c2=>circle(c2,0,72,12),p,{off:1.6});star(ctx,0,72,8,p);
 ctx.restore();
}
function justinianFront(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // Coraza / busto frontal hierático de Justiniano I, no silueta mecánica.
 emboss(ctx,z=>smooth(z,[[-83,101],[-78,49],[-52,19],[-29,6],[30,6],[56,20],[80,54],[83,105],[23,112],[-25,112]]),p,{off:2.8,outer:true});
 // Clámide, hombros y placas de coraza
 emboss(ctx,z=>smooth(z,[[-73,29],[-52,13],[-20,27],[-8,69],[-35,109],[-84,96]]),p,{off:1.4});
 emboss(ctx,z=>smooth(z,[[34,21],[69,26],[77,91],[30,107],[13,54]]),p,{off:1.5});
 for(let i=0;i<6;i++){
  iline(ctx,[[-40+i*15,40],[-37+i*15,95]],p,1.2);
 }
 // Cuello y rostro con mejillas, mandíbula, labios y párpados
 emboss(ctx,z=>smooth(z,[[-36,-51],[-33,-72],[-15,-81],[17,-81],[33,-62],[35,-26],[28,0],[13,13],[-12,13],[-28,0],[-37,-25]]),p,{off:2.4});
 for(const x of [-15,15]){
  iline(ctx,[[x-10,-43],[x-3,-48],[x+8,-43]],p,1.2);
  dot(ctx,x,-42,2.2,p);
  iline(ctx,[[x-11,-51],[x,-55],[x+10,-52]],p,1.0);
 }
 iline(ctx,[[0,-41],[3,-30],[0,-17]],p,1.6);
 icurve(ctx,[[-10,-8],[0,-12],[10,-8]],p,1.05);
 iline(ctx,[[-8,-1],[9,-1]],p,1);
 // Yelmo frontal con diadema perlada, orejeras y penacho
 emboss(ctx,z=>smooth(z,[[-38,-53],[-41,-88],[-21,-107],[0,-110],[24,-104],[39,-84],[38,-55]]),p,{off:2.2,outer:true});
 emboss(ctx,z=>poly(z,[[-43,-63],[43,-63],[38,-53],[-38,-53]]),p,{off:1.7});
 for(let i=0;i<9;i++)dot(ctx,-32+i*8,-59,2.7,p);
 for(const sg of [-1,1]){
  emboss(ctx,z=>smooth(z,[[sg*35,-58],[sg*49,-51],[sg*46,-17],[sg*32,-4]]),p,{off:1.1});
  for(let k=0;k<4;k++)dot(ctx,sg*44,-49+k*12,2.5,p);
 }
 for(const [x,y] of [[-10,-113],[0,-120],[10,-113]])dot(ctx,x,y,5.1,p);
 // Fíbula, colgantes del manto y refuerzo de clámide
 emboss(ctx,z=>ell(z,-48,34,10,12),p,{off:1.5});
 for(let i=0;i<4;i++)rline(ctx,[[-55+i*6,45],[-58+i*6,75]],p,1.5);
 // Globo crucígero sostenido delante del torso
 emboss(ctx,z=>circle(z,53,44,18),p,{off:2.0});
 rline(ctx,[[53,27],[53,9]],p,2.8);rline(ctx,[[43,16],[63,16]],p,2.3);
 // Escudo circular con jinete esquemático
 emboss(ctx,z=>ell(z,-57,77,24,31),p,{off:1.9});
 rline(ctx,[[-70,86],[-60,70],[-47,80]],p,1.8);
 dot(ctx,-56,59,3.4,p);
 rline(ctx,[[-56,65],[-54,77]],p,2.1);
 ctx.restore();
}

/* Casa de Trastámara sin lises borbónicas: síntesis vectorial de Castilla-León,
   Aragón-Sicilia y granada de la heráldica de los Reyes Católicos. */
function catholicArms1497(ctx,p){
 ctx.save();ctx.translate(0,18);ctx.scale(1.35,1.35);
 royalCrown(ctx,0,-155,.82,p);
 emboss(ctx,c=>smooth(c,[[-108,-108],[108,-108],[99,40],[68,102],[0,133],[-68,102],[-99,40]]),p,{off:2.8});
 // cuarteles de Castilla-León / Aragón-Sicilia, sin escusón de Borbón
 iline(ctx,[[0,-105],[0,120]],p,3.4);iline(ctx,[[-100,0],[100,0]],p,3.4);
 castle(ctx,-54,-54,.75,p);lion(ctx,50,-50,.75,p);
 for(let i=0;i<4;i++)rline(ctx,[[-90+i*15,16],[-90+i*15,72]],p,3);
 // Figura heráldica simplificada de Sicilia; NO usar águila mexicana.
 ctx.save();ctx.translate(50,49);ctx.scale(.49,.49);
 emboss(ctx,c=>smooth(c,[[-112,-40],[-58,-83],[-8,-42],[15,-29],[58,-78],[106,-50],
   [85,-15],[40,-3],[22,35],[44,86],[0,68],[-44,88],[-29,22],[-76,7]]),p,{off:2.2});
 emboss(ctx,c=>smooth(c,[[8,-61],[36,-71],[53,-52],[45,-35],[22,-33]]),p,{off:1.6});
 emboss(ctx,c=>poly(c,[[46,-58],[67,-50],[43,-44]]),p,{off:1.1});
 for(const d of [-1,1])for(let k=0;k<3;k++)iline(ctx,[[d*(26+k*19),-39+k*10],[d*(29+k*17),-9+k*7]],p,1.8);
 ctx.restore();
 pomegranate(ctx,0,105,.6,p);ctx.restore();
}
/* 8 maravedís segovianos, escudo coronado y cargo distinto en cada cara. */
function segoviaCharge(ctx,p,which){
 ctx.save();ctx.translate(0,22);royalCrown(ctx,0,-165,.8,p);
 emboss(ctx,c=>smooth(c,[[-120,-100],[120,-100],[114,62],[0,152],[-114,62]]),p,{off:2.9});
 ctx.save();ctx.translate(0,6);if(which==='castle')castleCharge(ctx,p,{s:2.15});else lionCharge(ctx,p,{s:2.1});ctx.restore();ctx.restore();
}
/* Potosí ca. 1690: columnas/olas frente a cruz con castillos y leones.
   Énfasis en el tipo VR 1690: no calco ni inspección de cuño específico. */
function potosiCob1690(ctx,p,side){
 if(side===0){
  plainPotentCross(ctx,p,{s:1.32});
  castleCharge(ctx,p,{x:-112,y:-108,s:.54});
  lionCharge(ctx,p,{x:112,y:-108,s:.54});
  lionCharge(ctx,p,{x:-112,y:108,s:.54});
  castleCharge(ctx,p,{x:112,y:108,s:.54});
  text(ctx,'8',0,-245,29,p);text(ctx,'P',-228,18,27,p);
  text(ctx,'VR',215,18,25,p);text(ctx,'690',0,248,27,p);
 }else{
  pillars(ctx,p,{crowned:false,dx:174,latin:true});
  // triple franja inscrita característica de macuquinas de Potosí.
  text(ctx,'P   8   VR',0,-68,24,p,{pitch:.74});
  text(ctx,'PLVS VLTRA',0,40,29,p,{pitch:.65});
  text(ctx,'VR 690 P',0,129,27,p,{pitch:.72});
  for(let i=0;i<3;i++)rline(ctx,[[-180,186+i*9],[-70,180+i*9],[45,186+i*9],[173,180+i*9]],p,2.4);
 }
}
/* ================= DISEÑOS POR MONEDA ================= */
function bust(ctx,p,cfg,o={}){ctx.save();ctx.translate(o.x??0,o.y??12);ctx.scale(o.s??1.16,o.s??1.16);head(ctx,p,cfg);ctx.restore();}
const LTOP=(ctx,t,p,o={})=>legend(ctx,t,o.r??330,0,o.size??33,p,{span:o.span??2.7,hi:o.hi,pitch:o.pitch});
// Una fecha corta se coloca junta: longitud × paso en radianes. Un span explícito se respeta.
const LBOT=(ctx,t,p,o={})=>legend(ctx,t,o.r??332,Math.PI,o.size??30,p,
 {span:o.span??Math.min(1.2,Math.max(0,Array.from(t).length-1)*(o.pitch??.082)),bottom:true});

/* ---- Motivos específicos cotejados del quinto lote (V6.31) ---- */
function doubleBustPrussia1901(ctx,p){
 ctx.save();ctx.translate(-71,31);ctx.scale(.69,.78);
 bust(ctx,p,{hair:'wig',mirror:true,nose:1.18,chin:1.12,armor:true},{s:1});
 ctx.restore();
 ctx.save();ctx.translate(78,37);ctx.scale(.82,.87);
 bust(ctx,p,{hair:'short',mirror:true,nose:1.1,chin:1.08,moustache:'up',armor:true},{s:1});
 // Pickelhaube con pico, placa y penacho estilizados.
 emboss(ctx,c=>smooth(c,[[-113,-132],[-100,-158],[-53,-173],[-11,-158],[23,-128],[20,-113],[-55,-119]]),p,{off:2.2});
 emboss(ctx,c=>poly(c,[[-58,-169],[-50,-216],[-41,-169]]),p,{off:2.3});
 rline(ctx,[[-108,-123],[-60,-125],[16,-116]],p,4);
 royalCrown(ctx,-41,-139,.21,p);
 ctx.restore();
 // Bordado y charreteras diferenciados en los dos uniformes.
 for(let j=0;j<6;j++){
  iline(ctx,[[-165+j*15,168],[-159+j*15,182]],p,1.2);
  iline(ctx,[[19+j*17,172],[27+j*17,188]],p,1.0);
 }
 // Águila emblemática pequeña entre las dos fechas.
 ctx.save();ctx.translate(0,-178);ctx.scale(.44,.44);eaglePrussian(ctx,p,{s:.35});ctx.restore();
}
function byzantineAngel(ctx,p){
 ctx.save();ctx.translate(0,4);
 // Alas, cabeza nimbrada y túnica: Victoria tardoantigua, no alegoría moderna.
 for(const side of [-1,1]){
  emboss(ctx,c=>smooth(c,[[side*22,-70],[side*90,-125],[side*128,-60],[side*83,-7],[side*31,-15]]),p,{off:2.1});
  for(let i=0;i<6;i++)rline(ctx,[[side*(28+i*10),-55],[side*(54+i*9),-88+i*13]],p,2.2);
 }
 emboss(ctx,c=>smooth(c,[[-31,-48],[31,-48],[53,47],[46,142],[-46,142],[-53,47]]),p,{off:2.6,outer:true});
 emboss(ctx,c=>ell(c,0,-83,26,32),p,{off:2.5});
 ctx.save();ctx.strokeStyle=p.light;ctx.globalAlpha=.7;ctx.lineWidth=3;circle(ctx,0,-84,38);ctx.stroke();ctx.restore();
 // cruz larga sostenida en una mano
 rline(ctx,[[78,-170],[78,140]],p,9);rline(ctx,[[45,-119],[111,-119]],p,7);
 rline(ctx,[[30,-33],[76,-7],[78,-32]],p,10);
 // globus cruciger en la otra mano.
 rline(ctx,[[-28,-35],[-98,6],[-108,-15]],p,9);
 dot(ctx,-116,-23,22,p);rline(ctx,[[-116,-65],[-116,-45]],p,5);rline(ctx,[[-131,-56],[-101,-56]],p,5);
 for(let i=0;i<5;i++)iline(ctx,[[-30+i*15,34],[-35+i*18,135]],p,1.7);
 text(ctx,'CONOB',0,194,31,p,{pitch:.65});ctx.restore();
}
function persianRupeeInscription(ctx,p){
 // Escritura del valor en persa/urdu, con tipografía vectorial del sistema.
 // No se pretende reproducir la caligrafía ni las variantes de cuño.
 ctx.save();ctx.direction='rtl';ctx.font='bold 34px "Noto Naskh Arabic", "DejaVu Sans", serif';
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle=p.deep;ctx.globalAlpha=.73;ctx.fillText('یک روپیه',0,54,240);
 ctx.fillStyle=p.light;ctx.globalAlpha=.72;ctx.fillText('یک روپیه',-1,52,240);
 ctx.restore();
}
function stampedTradeStars(ctx,p){
 for(let i=0;i<13;i++){
  const a=-Math.PI*.87+i/12*Math.PI*1.74;
  const x=Math.sin(a)*268,y=-Math.cos(a)*268;
  star(ctx,x,y,8,p);
 }
}

/* Lote 06: blasones británicos, motivos helvéticos y tipos clásicos.
   Construcciones interpretativas, con jerarquía de elementos cotejada.
   No son calcos de cuño ni una fuente de autentificación pericial. */
function britannicQuarter(ctx,p,x,y,mode,scale=.72){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 emboss(ctx,c=>smooth(c,[[-60,-55],[60,-55],[55,37],[0,65],[-55,37]]),p,{off:1.8,blur:.6});
 if(mode==='harp'){
  rline(ctx,[[-23,-36],[-28,40],[27,40]],p,4);
  for(let i=0;i<6;i++)rline(ctx,[[-15+i*6,-25],[0+i*4,34]],p,1.4);
  emboss(ctx,c=>ell(c,-22,-37,8,4,.2),p,{off:1});
 }else if(mode==='scotland'){
  lion(ctx,0,0,.54,p); // símbolo del león rampante simplificado
 }else if(mode==='france'){
  for(const [a,b] of [[-27,-20],[23,-20],[0,25]]){
   emboss(ctx,c=>smooth(c,[[a-8,b+7],[a-4,b-13],[a,b-22],[a+4,b-13],[a+8,b+7],[a,b+12]]),p,{off:1});
   dot(ctx,a,b+14,3,p);
  }
 }else{
  for(const [a,b] of [[-25,-22],[22,-22],[0,23]]){
   lion(ctx,a,b,.26,p);
  }
 }
 ctx.restore();
}
function guineaCross1717(ctx,p){
 // Cuatro escudos coronados, estrella central de la Jarretera y cuatro cetros.
 for(const [x,y,mode] of [[0,-138,'england'],[143,0,'france'],[0,138,'harp'],[-143,0,'scotland']]){
  britannicQuarter(ctx,p,x,y,mode,1.17);
  royalCrown(ctx,x,y-82,.33,p);
 }
 star(ctx,0,0,21,p);
 for(const sign of [-1,1])for(const sy of [-1,1]){
  rline(ctx,[[sign*28,sy*28],[sign*104,sy*100]],p,3);
  dot(ctx,sign*107,sy*105,5,p);
 }
 text(ctx,'17',-77,-262,27,p);text(ctx,'17',78,-262,27,p);
}
function florinCross1849(ctx,p){
 // Escudos cruciformes de Inglaterra, Escocia e Irlanda, rosa Tudor central.
 for(const [x,y,m] of [[0,-140,'england'],[142,0,'scotland'],[0,140,'harp'],[-142,0,'england']]){
  britannicQuarter(ctx,p,x,y,m,1.32);royalCrown(ctx,x,y-98,.46,p);
 }
 // Rosa Tudor de cinco lóbulos, símbolo inglés: NO crisantemo imperial.
 ctx.save();ctx.translate(0,0);
 for(let i=0;i<5;i++){
  ctx.save();ctx.rotate(i*TAU/5);
  emboss(ctx,c=>smooth(c,[[-4,-6],[-24,-21],[-22,-40],[-10,-50],[10,-50],[22,-40],[24,-21],[4,-6]]),p,{off:1.15});
  iline(ctx,[[0,-14],[0,-39]],p,.9);
  ctx.restore();
 }
 for(let i=0;i<5;i++){
  const a=(i+.5)*TAU/5;
  emboss(ctx,c=>ell(c,Math.sin(a)*16,-Math.cos(a)*16,6,9,a),p,{off:.8});
 }
 emboss(ctx,c=>circle(c,0,0,11),p,{off:1.1});
 for(let i=0;i<5;i++){const a=i*TAU/5;dot(ctx,Math.sin(a)*7,-Math.cos(a)*7,1.9,p);}
 ctx.restore();
 for(const [x,y] of [[-118,-120],[120,-120],[-121,120],[119,122]]){
  emboss(ctx,c=>ell(c,x,y,12,8,(x+y)*.003),p,{off:1});
  rline(ctx,[[x-11,y+8],[x+11,y-8]],p,1.5);
 }
}
function hadrianRoma136(ctx,p){
 romaSeated(ctx,p,{s:1.8});
 // Esculturas del Sol y la Luna, atributos de RIC II.3 2230.
 dot(ctx,103,-64,14,p);dot(ctx,151,-58,12,p);
 for(let j=0;j<7;j++){const a=j*TAU/7;rline(ctx,[[103+Math.cos(a)*17,-64+Math.sin(a)*17],[103+Math.cos(a)*23,-64+Math.sin(a)*23]],p,1.9);}
 emboss(ctx,c=>{c.beginPath();c.arc(151,-58,13,.3,4.8);c.arc(156,-60,9,4.8,.3,true);c.closePath();},p,{off:1.1});
 rline(ctx,[[-76,-188],[-78,130]],p,3); // lanza
}
function marciusVictoryBiga(ctx,p){
 ctx.save();ctx.scale(1.8,1.8);ctx.translate(0,-4);
 for(let i=0;i<2;i++){
  ctx.save();ctx.translate(8+i*24,-i*9);
  emboss(ctx,c=>smooth(c,[[-35,12],[-14,-8],[23,-8],[42,7],[30,28],[-15,26]]),p,{off:1.3});
  emboss(ctx,c=>smooth(c,[[27,-5],[44,-28],[59,-30],[62,-13],[45,-8]]),p,{off:1});
  rline(ctx,[[-25,21],[-36,59]],p,3);rline(ctx,[[24,20],[40,51]],p,3);
  ctx.restore();
 }
 emboss(ctx,c=>smooth(c,[[-75,23],[-34,22],[-33,43],[-64,41]]),p,{off:1.4});
 emboss(ctx,c=>circle(c,-53,52,16),p,{off:1.2});
 for(let i=0;i<5;i++){const a=TAU*i/5;rline(ctx,[[-53,52],[-53+Math.cos(a)*15,52+Math.sin(a)*15]],p,1.2);}
 // Victoria alada conduciendo la biga con látigo y riendas.
 emboss(ctx,c=>smooth(c,[[-73,10],[-63,-37],[-47,-35],[-41,8]]),p,{off:1.6});
 emboss(ctx,c=>ell(c,-55,-46,10,12),p,{off:1.1});
 emboss(ctx,c=>poly(c,[[-62,-25],[-91,-75],[-84,-19]]),p,{off:1});
 for(let i=0;i<4;i++)iline(ctx,[[-72-i*4,-31-i*9],[-84-i*3,-24-i*7]],p,1.2);
 rline(ctx,[[-45,-19],[-10,-33]],p,2);rline(ctx,[[-45,-19],[-16,-60]],p,2); // riendas y látigo
 ctx.restore();
}
function marciusGrainLegend(ctx,p){
 for(const dx of [-110,110]){
  rline(ctx,[[dx,50],[dx,185]],p,3);
  for(let j=0;j<5;j++)for(const sign of [-1,1]){
   emboss(ctx,c=>ell(c,dx+sign*9,70+j*21,5.5,14,-sign*.5),p,{off:1});
  }
 }
 text(ctx,'M·MAR·C',0,115,28,p,{pitch:.67});
 text(ctx,'RO·MA',0,160,28,p,{pitch:.66});
}
function vreneliMountains(ctx,p){
 for(const [x,y,s] of [[-104,-40,1],[30,-68,1],[137,-30,.8]]){
  rline(ctx,[[x-48*s,y+43*s],[x,y-15*s],[x+50*s,y+43*s]],p,2.6);
 }
}
function vreneliOak(ctx,p){
 // Rama de roble con bellotas detrás del escudo, no corona de laurel.
 for(const sign of [-1,1]){
  rline(ctx,[[sign*32,139],[sign*98,41],[sign*135,-57]],p,4);
  for(let i=0;i<6;i++){
   const x=sign*(60+i*13),y=115-i*32;
   emboss(ctx,c=>ell(c,x+sign*16,y,15,7,sign*.55),p,{off:1.1});
   if(i%2===0)dot(ctx,x-sign*9,y-13,5.3,p);
  }
 }
}
function meijiWreath(ctx,p){
 // Tipo floral del yen Meiji: ramas densas de paulonia y crisantemo,
 // diferenciadas de las simples coronas europeas. Diseñado para bajo consumo.
 for(const sign of [-1,1]){
  const stem=[];
  for(let i=0;i<=32;i++){
   const a=.19+i/32*2.32;
   stem.push([sign*(218*Math.sin(a)),194*Math.cos(a)-12]);
  }
  rline(ctx,stem,p,3.6);
  for(let i=1;i<15;i++){
   const q=stem[Math.floor(i*2.05)],outside=sign*(i%2?1:-1);
   ctx.save();ctx.translate(q[0],q[1]);ctx.rotate(sign*(-.95+i*.12));
   emboss(ctx,c=>smooth(c,[[0,6],[outside*13,-6],[outside*13,-32],
    [outside*3,-47],[outside*-3,-23],[outside*-13,-31],[outside*-12,-5]]),p,{off:1.15});
   iline(ctx,[[0,0],[outside*3,-35]],p,.9);
   for(let k=0;k<3;k++)iline(ctx,[[outside*2,-12-k*7],[outside*9,-15-k*7]],p,.65);
   ctx.restore();
   if(i%4===0){
    const cx=q[0]+sign*14,cy=q[1]-14;
    for(let j=0;j<5;j++){
     ctx.save();ctx.translate(cx,cy);ctx.rotate(j*TAU/5);
     emboss(ctx,c=>ell(c,0,-7,4,7),p,{off:.8});ctx.restore();
    }
    dot(ctx,cx,cy,2.8,p);
   }
  }
 }
 // Nudo inferior de cinta imperial, sin textos ni símbolos añadidos.
 emboss(ctx,c=>smooth(c,[[-19,196],[0,185],[19,196],[14,213],[0,204],[-14,213]]),p,{off:1.8});
 for(const s of [-1,1]){
  emboss(ctx,c=>smooth(c,[[s*2,209],[s*21,220],[s*37,246],[s*24,237],[s*10,228]]),p,{off:1.4});
  icurve(ctx,[[s*4,213],[s*18,226],[s*30,242]],p,1);
 }
}
function athensIncuse(ctx,p){
 rline(ctx,[[-246,-237],[245,-237],[245,230],[-246,230],[-246,-237]],p,8);
 rline(ctx,[[-230,-217],[228,-217],[228,215],[-230,215],[-230,-217]],p,2.5);
}
function britanniaPenny1860(ctx,p){
 // Britannia orientada a derecha; atributos de la edición de bronce (1860).
 emboss(ctx,c=>smooth(c,[[-90,112],[-66,61],[-15,49],[69,63],[86,102]]),p,{off:2});
 emboss(ctx,c=>smooth(c,[[-70,83],[-52,22],[-5,9],[33,18],[58,76]]),p,{off:2.6});
 emboss(ctx,c=>smooth(c,[[0,17],[-2,-54],[38,-66],[49,-10],[32,21]]),p,{off:2});
 emboss(ctx,c=>ell(c,27,-85,20,26,-.1),p,{off:2});
 emboss(ctx,c=>poly(c,[[12,-105],[42,-105],[55,-93],[10,-91]]),p,{off:1.2});
 iline(ctx,[[40,-88],[47,-80],[37,-72]],p,2.3);
 rline(ctx,[[-7,-31],[-83,-12]],p,4); // brazo y escudo
 emboss(ctx,c=>smooth(c,[[-97,-35],[-26,-34],[-35,55],[-64,94],[-97,44]]),p,{off:2});
 rline(ctx,[[-65,-27],[-65,73]],p,2);rline(ctx,[[-96,22],[-29,22]],p,2);
 rline(ctx,[[-91,-16],[-40,68]],p,2);rline(ctx,[[-42,-18],[-89,64]],p,2);
 // Tridente y astil en su mano izquierda.
 rline(ctx,[[53,-51],[101,-190]],p,5);
 rline(ctx,[[91,-169],[81,-196],[79,-209]],p,3);
 rline(ctx,[[91,-169],[106,-194],[112,-212]],p,3);
 rline(ctx,[[91,-169],[99,-214]],p,3);
 // Faro a izquierda y barco a derecha en el horizonte.
 emboss(ctx,c=>poly(c,[[-200,-16],[-164,-16],[-176,-114],[-190,-114]]),p,{off:1});
 emboss(ctx,c=>poly(c,[[-197,-115],[-156,-115],[-176,-132]]),p,{off:1});
 for(let i=0;i<3;i++)iline(ctx,[[-197,-92+i*30],[-162,-92+i*30]],p,1.6);
 rline(ctx,[[116,29],[211,29],[191,53],[135,53],[116,29]],p,2.5);
 rline(ctx,[[167,26],[167,-87]],p,2.8);
 emboss(ctx,c=>poly(c,[[166,-79],[166,23],[206,21]]),p,{off:1});
 rline(ctx,[[-212,104],[-127,108],[98,107],[221,105]],p,2);
}

// Los 29 tipos originales se registran por cara al cargarse sus archivos.
const DESIGNS=Object.create(null);
function registerLegacy(id,side,fn){
 if(typeof id!=='string'||(side!==0&&side!==1)||typeof fn!=='function')throw Error('Dibujo legacy inválido');
 if(!DESIGNS[id])DESIGNS[id]=[];
 DESIGNS[id][side]=fn;
}
function hasLegacy(id,side){return typeof DESIGNS[id]?.[side]==='function';}


/* ================= DEFECTOS VECTORIALES ================= */
function defect(ctx,def,metal='plata'){
 if(!def||def.name==='chopmark')return;
 const p=pal(metal),name=def.name||'';
 const r=rng(hash([name,def.x,def.y,def.rot,def.size].join('|')));
 ctx.save();
 ctx.translate(430+(Number(def.x)||0),430+(Number(def.y)||0));
 ctx.rotate((Number(def.rot)||0)*Math.PI/180);
 const s=clamp(Number(def.size)||.7,.15,1.5);ctx.scale(s,s);
 ctx.globalAlpha=clamp(Number(def.opacity)||.7,.1,1);
 const scratch=(x,y,len,ang,w)=>{const dx=Math.cos(ang)*len/2,dy=Math.sin(ang)*len/2;
  ctx.save();ctx.lineCap='round';
  ctx.strokeStyle=p.shadow;ctx.globalAlpha*=.6;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x-dx,y-dy);ctx.lineTo(x+dx,y+dy);ctx.stroke();
  ctx.strokeStyle=p.light;ctx.globalAlpha*=.8;ctx.lineWidth=w*.5;ctx.beginPath();ctx.moveTo(x-dx-1,y-dy-1);ctx.lineTo(x+dx-1,y+dy-1);ctx.stroke();
  ctx.restore();};
 if(name==='rayas_finas'||name==='rayas_cruzadas'||name==='limpieza_paralela'){
  const cleaned=name==='limpieza_paralela',n=cleaned?30:name==='rayas_finas'?8:13;
  for(let i=0;i<n;i++){const x=(r()-.5)*240,y=(r()-.5)*(cleaned?160:240),len=40+r()*130;
   const ang=cleaned?.1+r()*.06:(name==='rayas_cruzadas'&&i%3===0?Math.PI*.45:(r()-.5)*1.4);
   scratch(x,y,len,ang,cleaned?1.1:1.6);}
 } else if(name==='poros_fundicion'){
  const n=14+Math.floor(r()*14);
  for(let i=0;i<n;i++){const x=(r()-.5)*220,y=(r()-.5)*220,rad=2+r()*6;
   ctx.save();ctx.fillStyle=p.shadow;ctx.globalAlpha*=.7;circle(ctx,x,y,rad);ctx.fill();
   ctx.strokeStyle=p.light;ctx.globalAlpha*=.6;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,rad,Math.PI*.9,Math.PI*1.7);ctx.stroke();ctx.restore();}
 } else if(name.startsWith('corrosion')){
  const col=metal==='cobre'?'#3f6a4e':metal==='oro'?'#6a5a2a':'#4a5a52';
  for(let i=0;i<22;i++){const x=(r()-.5)*240,y=(r()-.5)*240,rad=6+r()*22;
   ctx.save();ctx.globalAlpha*=.16+r()*.2;ctx.fillStyle=col;circle(ctx,x,y,rad);ctx.fill();ctx.restore();}
  for(let i=0;i<30;i++){const x=(r()-.5)*240,y=(r()-.5)*240;ctx.save();ctx.globalAlpha*=.5;ctx.fillStyle=p.shadow;circle(ctx,x,y,1+r()*2.5);ctx.fill();ctx.restore();}
 } else if(name.startsWith('grieta_bano')){
  // grieta que revela núcleo distinto
  const core=metal==='oro'?'#9a8a6a':metal==='plata'?'#8a6a4a':'#7a7a7a';
  const pts=[];let x=-120,y=(r()-.5)*60;pts.push([x,y]);
  for(let i=0;i<8;i++){x+=30;y+=(r()-.5)*40;pts.push([x,y]);}
  ctx.save();ctx.lineJoin='round';ctx.strokeStyle=core;ctx.lineWidth=7;ctx.globalAlpha*=.8;
  ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(const q of pts)ctx.lineTo(q[0],q[1]);ctx.stroke();
  ctx.strokeStyle=p.shadow;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]-3);for(const q of pts)ctx.lineTo(q[0],q[1]-3);ctx.stroke();
  ctx.strokeStyle=p.light;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]+3);for(const q of pts)ctx.lineTo(q[0],q[1]+3);ctx.stroke();
  ctx.restore();
 } else if(name==='perforacion'){
  // Marca de perforación deliberada, con reborde aplastado e interior sombrío.
  ctx.save();ctx.fillStyle=p.shadow;ctx.globalAlpha*=.95;
  ell(ctx,0,0,23,27,.16);ctx.fill();
  ctx.lineWidth=7;ctx.strokeStyle=p.light;ctx.globalAlpha*=.8;
  ctx.beginPath();ctx.ellipse(0,0,25,29,.16,-2.75,.05);ctx.stroke();
  ctx.lineWidth=3;ctx.strokeStyle=p.deep;ctx.beginPath();ctx.ellipse(0,0,23,27,.16,.12,2.95);ctx.stroke();ctx.restore();
 } else if(name==='reparacion'){
  // Antigua unión de una grieta reparada y metal de aportación.
  const pts=[[-90,-23],[-62,-16],[-36,-29],[-12,-12],[21,-18],[47,-5],[84,1]];
  ctx.save();ctx.strokeStyle=p.deep;ctx.lineWidth=8;ctx.globalAlpha*=.38;
  ctx.beginPath();ctx.moveTo(...pts[0]);for(const pt of pts.slice(1))ctx.lineTo(...pt);ctx.stroke();
  ctx.strokeStyle=p.light;ctx.lineWidth=4;ctx.globalAlpha*=.7;
  ctx.beginPath();ctx.moveTo(-87,-20);for(const [x,y] of pts.slice(1))ctx.lineTo(x+2,y+2);ctx.stroke();
  for(const x of [-40,8,53]){ctx.beginPath();ctx.ellipse(x,-12,11,6,.1,0,TAU);ctx.fillStyle=p.mid;ctx.fill();}
  ctx.restore();
 } else if(name==='graffiti'){
  // Dos trazos incusos que no pertenecen al cuño original.
  const pts=[[[-56,-50],[25,65]],[[-47,66],[35,-57]],[[50,-38],[53,51]]];
  for(const line of pts){ctx.save();ctx.strokeStyle=p.deep;ctx.lineWidth=5;ctx.globalAlpha*=.62;
   ctx.beginPath();ctx.moveTo(...line[0]);ctx.lineTo(...line[1]);ctx.stroke();
   ctx.strokeStyle=p.light;ctx.globalAlpha*=.65;ctx.lineWidth=1.7;
   ctx.beginPath();ctx.moveTo(line[0][0]-2,line[0][1]-2);ctx.lineTo(line[1][0]-2,line[1][1]-2);ctx.stroke();ctx.restore();}
 } else if(name==='pulido_espejo'){
  // Zona de lustrado artificial con abrasión repetitiva y brillo desigual.
  const g=ctx.createRadialGradient(-12,-14,9,0,0,145);
  g.addColorStop(0,'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.save();ctx.fillStyle=g;ctx.fillRect(-155,-155,310,310);ctx.restore();
  for(let i=0;i<30;i++)scratch((r()-.5)*235,(r()-.5)*185,35+r()*85,Math.PI*.09+(r()-.5)*.08,.8);
 } else if(name==='alteracion_superficie'){
  // Parche de textura regrabada / modificada, bordes irregulares.
  for(let i=0;i<11;i++){
   const x=(r()-.5)*148,y=(r()-.5)*128;
   ctx.save();ctx.fillStyle=i%2?p.light:p.deep;ctx.globalAlpha*=.07+r()*.1;
   ell(ctx,x,y,12+r()*22,8+r()*19,r()*TAU);ctx.fill();ctx.restore();
  }
  for(let i=0;i<18;i++)scratch((r()-.5)*140,(r()-.5)*120,18+r()*58,.55+(r()-.5)*.9,1.1);
 } else if(name==='golpe_canto'){
  ctx.save();ctx.fillStyle=p.shadow;ctx.globalAlpha*=.5;
  ctx.beginPath();ctx.moveTo(-60,-20);ctx.quadraticCurveTo(0,-46,60,-20);ctx.quadraticCurveTo(0,-8,-60,-20);ctx.closePath();ctx.fill();
  ctx.strokeStyle=p.light;ctx.globalAlpha*=.7;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-58,-16);ctx.quadraticCurveTo(0,-40,58,-16);ctx.stroke();ctx.restore();
 } else if(name==='doblado_sombra'){
  const g=ctx.createLinearGradient(-120,0,120,0);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.5,'rgba(0,0,0,.35)');g.addColorStop(.55,'rgba(255,255,255,.25)');g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();ctx.fillStyle=g;ctx.fillRect(-130,-130,260,260);ctx.restore();
 } else if(name==='manchas_uv'){
  for(let i=0;i<8;i++){const x=(r()-.5)*200,y=(r()-.5)*200,rad=8+r()*20;
   ctx.save();ctx.globalAlpha*=.12+r()*.12;ctx.fillStyle='#cfd8c0';circle(ctx,x,y,rad);ctx.fill();ctx.restore();}
 }
 ctx.restore();
}

/* ================= PRESETS DE GOBERNANTES ================= */
const RULERS={
 otto_baviera:{hair:'short',beard:'full',moustache:true,nose:1.07,chin:1.1},
 carlos3:{hair:'wig',armor:true,nose:1.2,chin:1.1},
 carlos4:{hair:'wig',armor:true,nose:1.25,chin:1.15},
 fernando7:{hair:'short',armor:true,nose:1.15,chin:1.2,beard:'short'},
 felipe5:{hair:'wig',armor:true,nose:1.2,chin:1.1},
 fernando6:{hair:'wig',armor:true,nose:1.1,chin:1.0},
 isabel2:{hair:'bun',female:true,nose:.9,chin:.9,crown:'small'},
 alfonso12:{hair:'short',nose:1.0,chin:1.0,beard:'short'},
 alfonso13:{hair:'curly',nose:.9,chin:.9},
 alfonso13b:{hair:'short',nose:1.0,chin:1.0,moustache:true},
 amadeo:{hair:'short',beard:'full',moustache:true,nose:1.15,chin:1.1},
 franco:{hair:'short',nose:1.1,chin:1.1,moustache:true},
 juancarlos:{hair:'short',nose:1.05,chin:1.0},
 victoria:{hair:'bun',veil:true,female:true,nose:.95,chin:.9,crown:'small'},
 victoriaJ:{hair:'bun',female:true,nose:.9,chin:.9,crown:'small'},
 jorge5:{hair:'short',beard:'full',moustache:true,nose:1.1,chin:1.1,mirror:true},
 jorge6:{hair:'short',nose:1.0,chin:1.0,mirror:true},
 guillermo2:{hair:'short',moustache:'up',nose:1.1,chin:1.1},
 napoleon3:{hair:'short',laurel:true,moustache:true,beard:'goatee',nose:1.1},
 napoleon1:{hair:'short',laurel:true,nose:1.1,chin:1.1},
 franciscoJose:{hair:'short',beard:'full',moustache:true,nose:1.05},
 victorEmmanuel:{hair:'short',beard:'pointed',moustache:'up',nose:1.15,chin:1.1},
 pedro2:{hair:'short',beard:'full',nose:1.1,chin:1.1},
 oscar2:{hair:'short',beard:'full',moustache:true,nose:1.05},
 christian9:{hair:'short',beard:'full',nose:1.05},
 leopold2:{hair:'short',beard:'full',nose:1.1},
 luisFelipe:{hair:'short',nose:1.1,chin:1.1},
 carlosX:{hair:'short',nose:1.1,chin:1.1},
 helvetia:{hair:'braid',female:true,nose:.9,chin:.9,mirror:true},
 liberty:{hair:'feathers',female:true,nose:.95,chin:.9,mirror:true},
 libertyCap:{hair:'bun',female:true,nose:.9,chin:.9},
 hispania:{hair:'bun',female:true,nose:.9,chin:.9}
};

/* ================= MOTIVOS NUEVOS ================= */
/* ================= MOTIVOS DE FIGURA (versión mejorada) ================= */
function hispaniaSeated(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??18);ctx.scale((o.mirror?-1:1)*(o.s??2.9),o.s??2.9);
 // montañas al fondo, a la derecha
 rline(ctx,[[34,28],[54,-2],[68,16],[84,-14],[96,28]],p,2.4);
 // peñas
 emboss(ctx,c2=>smooth(c2,[[46,60],[62,34],[86,30],[96,52],[92,64],[50,66]]),p,{off:2});
 emboss(ctx,c2=>smooth(c2,[[-92,62],[-78,46],[-58,52],[-52,64],[-88,66]]),p,{off:1.8});
 // figura: una sola silueta en relieve
 const fig=c2=>{
  c2.beginPath();
  // manto y piernas extendidas a la izquierda
  smoothU(c2,[[30,24],[12,40],[-28,46],[-66,52],[-86,58],[-78,64],[-26,62],[22,58],[38,44]]);
  ellU(c2,-86,56,8,5,-.2);                       // pie
  // torso erguido a la derecha
  smoothU(c2,[[18,48],[14,20],[24,-6],[40,-22],[56,-16],[58,10],[48,34],[34,50]]);
  taperU(c2,curvePts([[50,-20],[56,-30]],4),13,11);
  ellU(c2,58,-37,12.5,13.5,-.1);                  // cabeza
  ellU(c2,49,-40,6,7);                           // moño
  // corona mural (se omite en la peseta republicana 1933)
  if(!o.noCrown){
  const cx=58,cy=-50,hw=12,top=-4,bot=5,n=3,mh=7,st=(hw*2)/n,mw=st*.6;
  c2.moveTo(cx-hw,cy+bot);c2.lineTo(cx-hw,cy+top);
  for(let i=0;i<n;i++){const x0=cx-hw+i*st,xm=x0+(st-mw)/2;
   c2.lineTo(xm,cy+top);c2.lineTo(xm,cy+top-mh);c2.lineTo(xm+mw,cy+top-mh);c2.lineTo(xm+mw,cy+top);}
  c2.lineTo(cx+hw,cy+top);c2.lineTo(cx+hw,cy+bot);c2.closePath();}
  // brazos
  taperU(c2,curvePts([[44,-16],[16,-20],[-8,-28],[-26,-30]],5),12,7);
  ellU(c2,-30,-31,5.4,4.4,-.2);
  taperU(c2,curvePts([[52,-8],[46,16],[32,34]],5),10,7);
  ellU(c2,30,36,5.4,4.4,.3);
 };
 emboss(ctx,fig,p,{off:2.6,outer:true});
 // pliegues del manto
 for(let i=0;i<5;i++)icurve(ctx,[[16-i*16,34+i*2],[2-i*16,46+i*2],[-14-i*16,56+i]],p,1.2);
 icurve(ctx,[[26,-2],[34,16],[30,36]],p,1.2);
 icurve(ctx,[[42,-14],[48,4],[44,22]],p,1.1);
 iline(ctx,[[46,-46],[70,-46]],p,1.1);
 // rostro de perfil
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.75;circle(ctx,63,-38,1.9);ctx.fill();ctx.restore();
 iline(ctx,[[67,-36],[69,-32],[65,-31]],p,1);
 iline(ctx,[[64,-27],[68,-27]],p,.9);
 icurve(ctx,[[52,-46],[58,-48],[64,-45]],p,1);
 // rama de olivo
 icurve(ctx,[[-28,-30],[-50,-38],[-72,-46]],p,2.4);
 for(let i=0;i<7;i++){const t=i/6,bx=-30-t*42,by=-31-t*15;
  emboss(ctx,c2=>ell(c2,bx-3,by-6,3.2,6.6,-.6),p,{off:1,blur:.4});
  if(i%2)emboss(ctx,c2=>ell(c2,bx+2,by+4,3,6,.5),p,{off:1,blur:.4});}
 for(let i=0;i<3;i++)dot(ctx,-40-i*12,-30-i*5,2.2,p);
 // línea del exergue
 rline(ctx,[[-88,66],[88,66]],p,2.4);
 ctx.restore();
}
/* Figura femenina drapeada en marcha: silueta unificada + pliegues incusos.
   Base común de la Semeuse francesa y la Libertad americana. */
function walkerBody(c2,o={}){
 c2.beginPath();
 // manto al viento por detrás
 smoothU(c2,[[-12,-32],[-36,-14],[-54,14],[-52,36],[-36,28],[-22,8],[-14,-8]]);
 // piernas
 taperU(c2,curvePts([[-8,6],[-18,28],[-28,46]],5),16,8);
 smoothU(c2,[[-34,44],[-16,50],[-18,58],[-38,52]]);
 taperU(c2,curvePts([[8,6],[18,28],[24,48]],5),18,9);
 smoothU(c2,[[14,48],[34,52],[34,60],[12,58]]);
 // túnica hasta la rodilla
 smoothU(c2,[[-14,-32],[8,-36],[18,-18],[24,4],[18,28],[0,32],[-16,26],[-20,2]]);
 // torso
 smoothU(c2,[[-11,-36],[6,-40],[17,-26],[15,-10],[-2,-8],[-13,-20]]);
 // cuello y cabeza de perfil
 taperU(c2,curvePts([[2,-38],[4,-46]],4),11,10);
 ellU(c2,5,-52,9.5,11,-.1);
 ellU(c2,-3,-53,6,7);
 if(o.cap==='phrygian')smoothU(c2,[[-7,-58],[-3,-71],[9,-67],[15,-57],[2,-54]]);
 else if(o.cap==='rays'){for(let i=0;i<7;i++){const a=-2.5+i*.36;
   polyU(c2,[[5+Math.cos(a-.09)*10,-54+Math.sin(a-.09)*10],[5+Math.cos(a)*22,-54+Math.sin(a)*22],[5+Math.cos(a+.09)*10,-54+Math.sin(a+.09)*10]]);}}
 else smoothU(c2,[[-6,-60],[4,-64],[13,-58],[2,-55]]);
}
function walkerFolds(ctx,p){
 for(let i=0;i<5;i++)icurve(ctx,[[-10+i*7,-8],[-14+i*8,10],[-16+i*9,28]],p,1.1);
 icurve(ctx,[[-8,-32],[2,-22],[0,-10]],p,1.1);
 icurve(ctx,[[-30,-6],[-44,16],[-44,30]],p,1);
 icurve(ctx,[[10,10],[16,26],[20,44]],p,1);
}
function faceProfile(ctx,p,x,y){
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.75;circle(ctx,x+5,y-2,1.8);ctx.fill();ctx.restore();
 iline(ctx,[[x+8,y],[x+10,y+4],[x+6,y+5]],p,.9);
 iline(ctx,[[x+6,y+8],[x+9,y+8]],p,.8);
}
function sower(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??8);ctx.scale(o.s??3.2,o.s??3.2);
 if(o.sun){ctx.save();ctx.globalAlpha=.5;
  for(let i=0;i<11;i++){const a=-Math.PI*.94+i/10*Math.PI*.88;
   rline(ctx,[[Math.cos(a)*40,Math.sin(a)*40-30],[Math.cos(a)*86,Math.sin(a)*86-30]],p,1.8);}
  ctx.restore();}
 const fig=c2=>{walkerBody(c2,{cap:'phrygian'});
  // brazo que siembra, extendido atrás
  taperU(c2,curvePts([[12,-34],[34,-30],[52,-36]],5),11,7);
  ellU(c2,55,-37,5.2,4.2,-.3);
  // brazo del saco
  taperU(c2,curvePts([[-8,-32],[-22,-20],[-26,-4]],5),10,7);
  ellU(c2,-27,-2,5,4.2,.4);
  smoothU(c2,[[-36,-12],[-16,-6],[-14,16],[-34,14]]);
 };
 emboss(ctx,fig,p,{off:2.4,outer:true});
 walkerFolds(ctx,p);
 // Pliegues longitudinales, cabello y detalles del saco de semillas.
 for(let k=0;k<5;k++)icurve(ctx,[[-15+k*6,-25],[-16+k*8,-4],[-31+k*9,44]],p,.85);
 for(let k=0;k<5;k++)iline(ctx,[[-28+k*4,-5],[-26+k*5,9]],p,.75);
 faceProfile(ctx,p,5,-52);
 iline(ctx,[[-6,-57],[13,-57]],p,1);
 icurve(ctx,[[-34,-10],[-24,-2],[-22,12]],p,1.1);
 // grano esparcido
 for(let i=0;i<8;i++)dot(ctx,56+i*3.4,-32+i*5.4,1.9-i*.08,p);
 // suelo
 rline(ctx,[[-56,62],[62,62]],p,2);
 ctx.restore();
}
/* Adolph A. Weinman, Walking Liberty 1943. La figura no lleva antorcha:
 * avanza hacia la izquierda, con ramas de laurel y roble y sol naciente.
 * Estilización vectorial supervisable, no reproducción exacta de cuño. */
function walkingLiberty1943(ctx,p){
 ctx.save();ctx.translate(0,12);
 // Sol bajo el horizonte a la izquierda y rayos labrados (ningún filtro pesado).
 dot(ctx,-180,178,43,p);
 for(let i=0;i<12;i++){
  const a=-2.91+i*.21;
  rline(ctx,[[-180+Math.cos(a)*55,178+Math.sin(a)*55],
              [-180+Math.cos(a)*(164+(i%2)*16),178+Math.sin(a)*(164+(i%2)*16)]],p,1.9);
 }
 // Paño gigantesco al viento, desde los hombros hasta el pie de Liberty.
 emboss(ctx,c=>smooth(c,[[-30,-96],[-108,-121],[-167,-105],[-196,-60],[-155,-39],
  [-108,-47],[-61,-15],[-103,49],[-165,140],[-102,164],[-40,132],[22,163],
  [86,158],[116,140],[51,60],[46,-23],[19,-72]]),p,{off:3,outer:true});
 // Cuerpo de cintura, piernas en marcha y pies definidos.
 emboss(ctx,c=>smooth(c,[[-23,-96],[27,-108],[47,-69],[38,-14],[16,13],[-7,9],[-34,-40]]),p,{off:2.8});
 emboss(ctx,c=>smooth(c,[[-12,0],[19,0],[35,102],[67,149],[61,165],[41,164],[4,100]]),p,{off:2.1});
 emboss(ctx,c=>smooth(c,[[-22,12],[4,10],[-37,95],[-48,142],[-71,150],[-78,136],[-61,92]]),p,{off:2.2});
 // Cabeza hacia izquierda, moño y peinado de la alegoría.
 emboss(ctx,c=>smooth(c,[[-4,-103],[-22,-116],[-20,-149],[5,-163],[24,-146],
  [27,-126],[15,-114],[5,-111]]),p,{off:2.2});
 emboss(ctx,c=>smooth(c,[[8,-158],[17,-165],[29,-153],[25,-138],[17,-133]]),p,{off:1.6});
 iline(ctx,[[-20,-138],[-37,-126],[-21,-122]],p,1.7);dot(ctx,-12,-141,1.6,p);
 // Brazo extendido al frente, con dedos diferenciados.
 emboss(ctx,c=>smooth(c,[[-19,-88],[-55,-104],[-91,-129],[-124,-136],[-153,-135],
  [-156,-126],[-130,-126],[-104,-111],[-74,-77],[-34,-67]]),p,{off:2});
 for(let i=0;i<4;i++)iline(ctx,[[-153,-132+i*3],[-163,-131+i*3]],p,.85);
 // Ramas de laurel / roble sobre el hombro derecho.
 icurve(ctx,[[10,-92],[48,-127],[83,-165],[107,-213]],p,3.6);
 icurve(ctx,[[3,-89],[51,-99],[91,-115],[119,-151]],p,3.2);
 for(let i=0;i<12;i++){
  const x=36+i*6.3,y=-110-i*8.1;
  emboss(ctx,c=>ell(c,x+(i%2?8:-8),y,6.5,14,(i%2?.45:-.4)),p,{off:1.1});
  if(i%3===0)dot(ctx,x+12,y+13,2.6,p);
 }
 // Pliegues diagonales, capas de tejido y línea de exergue.
 for(let i=0;i<10;i++){
  const dx=-96+i*19;
  icurve(ctx,[[0,-80],[dx*.47,24+i*3],[dx,130+i*1.5]],p,1.5);
 }
 icurve(ctx,[[-150,-70],[-109,-91],[-68,-51]],p,1.3);
 icurve(ctx,[[-94,152],[-34,164],[36,163]],p,1.0);
 rline(ctx,[[-223,179],[222,179]],p,2.2);
 ctx.restore();
}
function standingLiberty(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??6);ctx.scale(o.s??3.1,o.s??3.1);
 const fig=c2=>{walkerBody(c2,{cap:o.cap||'hair'});
  // brazo de la antorcha, alzado
  taperU(c2,curvePts([[12,-34],[28,-50],[36,-66]],5),11,7);
  ellU(c2,37,-68,5,4.4,-.6);
  // brazo de la rama de olivo
  taperU(c2,curvePts([[-8,-32],[-28,-22],[-42,-26]],5),10,7);
  ellU(c2,-44,-27,5,4.2,.2);
 };
 emboss(ctx,fig,p,{off:2.4,outer:true});
 walkerFolds(ctx,p);
 // Tela drapeada con diagonales y malla de pliegues; corrige el aspecto plano.
 for(let k=0;k<7;k++){
  const x=-27+k*7;
  icurve(ctx,[[x,-25],[x+5,8],[x-8,43]],p,.85);
 }
 icurve(ctx,[[-53,16],[-43,31],[-31,30]],p,1.1);
 faceProfile(ctx,p,5,-52);
 // antorcha
 rline(ctx,[[33,-62],[41,-80]],p,3.4);
 emboss(ctx,c2=>smooth(c2,[[34,-80],[40,-104],[48,-80],[41,-74]]),p,{off:1.5});
 iline(ctx,[[38,-84],[41,-96]],p,1);
 // rama de olivo
 icurve(ctx,[[-44,-27],[-58,-30],[-70,-36]],p,2.2);
 for(let i=0;i<6;i++)emboss(ctx,c2=>ell(c2,-48-i*4.4,-29-i*1.6,3,5.8,.6),p,{off:1,blur:.4});
 for(let i=0;i<3;i++)dot(ctx,-50-i*9,-24-i*2,2.1,p);
 rline(ctx,[[-56,62],[62,62]],p,2);
 ctx.restore();
}
function sunFace(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??2.5,o.s??2.5);
 for(let i=0;i<16;i++){const a=i/16*TAU;
  ctx.save();ctx.rotate(a);
  if(i%2)emboss(ctx,c2=>poly(c2,[[-5,-40],[0,-95],[5,-40]]),p,{off:1.4});
  else emboss(ctx,c2=>{c2.beginPath();c2.moveTo(-5,-40);c2.quadraticCurveTo(-11,-65,0,-90);c2.quadraticCurveTo(11,-65,5,-40);c2.closePath();},p,{off:1.4});
  ctx.restore();}
 dot(ctx,0,0,40,p);
 iline(ctx,[[-16,-10],[-6,-10]],p,2);iline(ctx,[[6,-10],[16,-10]],p,2);
 dot(ctx,-11,-9,2.6,p);dot(ctx,11,-9,2.6,p);
 iline(ctx,[[-18,-16],[-8,-19]],p,1.4);iline(ctx,[[8,-19],[18,-16]],p,1.4);
 iline(ctx,[[0,-6],[-3,6],[3,8]],p,1.8);
 iline(ctx,[[-10,18],[0,22],[10,18]],p,2);
 iline(ctx,[[-12,14],[-8,20]],p,1.2);iline(ctx,[[12,14],[8,20]],p,1.2);
 ctx.restore();
}
function eagleFly(ctx,p,o={}){
 ctx.save();ctx.translate((o.x??0)-20,o.y??16);ctx.scale(o.s??1.5,o.s??1.5);
 // resplandor solar
 ctx.save();ctx.globalAlpha=.4;
 for(let i=0;i<11;i++){const a=Math.PI*.14+i/10*Math.PI*.72;
  rline(ctx,[[Math.cos(a)*66,-Math.sin(a)*66+16],[Math.cos(a)*152,-Math.sin(a)*152+16]],p,2);}
 ctx.restore();
 // alas en vuelo, pluma a pluma
 ctx.save();ctx.rotate(-.34);wing(ctx,p,-1,1.28);ctx.restore();
 ctx.save();ctx.rotate(.30);wing(ctx,p,1,1.22);ctx.restore();
 // cola
 ctx.save();ctx.translate(42,6);ctx.rotate(.32);
 for(let i=-2;i<=2;i++){ctx.save();ctx.rotate(i*.17);feather(ctx,p,54-Math.abs(i)*4,6.4,1.5);ctx.restore();}
 ctx.restore();
 // cuerpo en vuelo
 emboss(ctx,c2=>smooth(c2,[[-28,-8],[18,-14],[46,0],[30,18],[-10,22],[-32,10]]),p,{off:2.2});
 for(let i=0;i<4;i++)iline(ctx,[[-16+i*12,-6],[-18+i*12,14]],p,1.1);
 // cabeza y pico
 emboss(ctx,c2=>ell(c2,-36,-12,12,10,-.15),p,{off:1.8});
 emboss(ctx,c2=>poly(c2,[[-46,-16],[-63,-9],[-46,-4]]),p,{off:1.2});
 iline(ctx,[[-61,-9],[-49,-8]],p,1);
 dot(ctx,-40,-15,2.2,p);
 // patas recogidas
 rline(ctx,[[6,20],[14,34]],p,2.4);rline(ctx,[[-6,20],[-2,34]],p,2.4);
 for(const q of [[14,34],[-2,34]])for(let i=-1;i<=1;i++)rline(ctx,[[q[0],q[1]],[q[0]+i*5,q[1]+7]],p,1.5);
 ctx.restore();
}
function condor(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1.55,o.s??1.55);
 wing(ctx,p,-1,1.15);wing(ctx,p,1,1.15);
 emboss(ctx,c2=>smooth(c2,[[-20,-14],[20,-14],[24,34],[0,58],[-24,34]]),p,{off:2.2});
 emboss(ctx,c2=>smooth(c2,[[-8,-14],[-12,-38],[-2,-48],[8,-42],[4,-26],[8,-16]]),p,{off:1.6});
 emboss(ctx,c2=>poly(c2,[[-12,-40],[-28,-35],[-12,-31]]),p,{off:1.2});
 dot(ctx,-4,-40,2.2,p);
 rline(ctx,[[-14,-13],[14,-13]],p,3.4);
 for(let i=0;i<4;i++)iline(ctx,[[-12+i*8,-4],[-14+i*8,34]],p,1.4);
 emboss(ctx,c2=>poly(c2,[[-16,52],[16,52],[22,78],[-22,78]]),p,{off:1.6});
 rline(ctx,[[-10,78],[-14,94]],p,2.4);rline(ctx,[[10,78],[14,94]],p,2.4);
 if(o.shield){emboss(ctx,c2=>smooth(c2,[[-15,-2],[15,-2],[13,26],[0,38],[-13,26]]),p,{off:1.4});
  iline(ctx,[[-15,8],[15,8]],p,1.2);}
 ctx.restore();
}
function crownedCoat(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??10);ctx.scale(o.s??2,o.s??2);
 royalCrown(ctx,0,-104,.8,p);
 const sh=[[-80,-70],[80,-70],[76,40],[50,84],[0,104],[-50,84],[-76,40]];
 emboss(ctx,c2=>smooth(c2,sh),p,{off:2.8});
 ctx.save();smooth(ctx,sh);ctx.clip();
 if(o.cross){iline(ctx,[[0,-70],[0,104]],p,6);iline(ctx,[[-80,16],[80,16]],p,6);}
 else if(o.stripes){for(let i=0;i<6;i++)iline(ctx,[[-60+i*24,-70],[-60+i*24,104]],p,3);}
 else {
  iline(ctx,[[0,-70],[0,104]],p,3);iline(ctx,[[-80,16],[80,16]],p,3);
  const q=o.quarters||'iberian';
  const fleur=(x,y,sc)=>{ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
   emboss(ctx,c2=>smooth(c2,[[0,-16],[-11,4],[-5,4],[-7,16],[7,16],[5,4],[11,4]]),p,{off:1.3});
   rline(ctx,[[-8,6],[8,6]],p,2);ctx.restore();};
  if(q==='iberian'){
   // Cuartelado correcto: Castilla en 1 y 4; León en 2 y 3.
   castle(ctx,-40,-28,.62,p);
   lion(ctx,40,-24,.62,p);
   lion(ctx,-40,60,.5,p);
   castle(ctx,40,58,.5,p);
  }
  else if(q==='lilies'){fleur(-40,-28,1.5);fleur(40,-28,1.5);fleur(-40,58,1.5);fleur(40,58,1.5);}
  else if(q==='lions'){lion(ctx,-40,-24,.6,p);lion(ctx,40,-24,.6,p,true);lion(ctx,-40,60,.5,p);lion(ctx,40,60,.5,p,true);}
  else if(q==='british'){ // Royal Arms 1887: Inglaterra 3 leones en I y IV, Escocia en II, arpa irlandesa en III
    for(const [bx,by] of [[-40,-27],[40,62]]){for(let j=0;j<3;j++){rline(ctx,[[bx-18,by-18+j*15],[bx+18,by-18+j*15]],p,2.2);emboss(ctx,c=>ell(c,bx-4,by-18+j*15,12,3.8),p,{off:1});}}
    lion(ctx,39,-24,.48,p,false,{crown:false});
    // Arpa con marco curvado y cuerdas visibles.
    rline(ctx,[[-60,48],[-50,34],[-42,42],[-33,73],[-55,85]],p,3.6);
    rline(ctx,[[-60,48],[-33,73]],p,2.8);
    for(let j=0;j<5;j++)rline(ctx,[[-54+j*3,51],[-46+j*2,79]],p,1.5);
  }
  else if(q==='crowns'){royalCrown(ctx,-38,-24,.34,p);royalCrown(ctx,38,-24,.34,p);royalCrown(ctx,0,62,.34,p);}
  else if(q==='quinas'){for(const [qx,qy] of [[0,-30],[-38,16],[38,16],[0,62],[0,16]]){
    emboss(ctx,c2=>smooth(c2,[[qx-15,qy-18],[qx+15,qy-18],[qx+13,qy+8],[qx,qy+22],[qx-13,qy+8]]),p,{off:1.4});
    for(const [dx,dy] of [[-6,-8],[6,-8],[0,0],[-6,8],[6,8]])dot(ctx,qx+dx,qy+dy,2.2,p);}}
  else if(q==='sphere'){emboss(ctx,c2=>circle(c2,0,16,44),p,{off:1.8});
   for(const a of [.35,.7]){const pts=[];for(let i=0;i<=24;i++){const t=i/24*TAU;pts.push([a*44*Math.cos(t),44*Math.sin(t)+16]);}iline(ctx,pts,p,1.4);}
   iline(ctx,[[-44,16],[44,16]],p,1.6);iline(ctx,[[-38,-6],[38,-6]],p,1.2);iline(ctx,[[-38,38],[38,38]],p,1.2);
   rline(ctx,[[-50,58],[50,-26]],p,2.4);}
 }
 ctx.restore();
 if(o.esc){emboss(ctx,c2=>smooth(c2,[[-22,-12],[22,-12],[20,24],[0,38],[-20,24]]),p,{off:1.8});
  for(const [lx,ly] of [[-10,0],[10,0],[0,20]])emboss(ctx,c2=>smooth(c2,[[lx,ly-7],[lx-5,ly+2],[lx-2,ly+2],[lx-3,ly+7],[lx+3,ly+7],[lx+2,ly+2],[lx+5,ly+2]]),p,{off:1});}
 ctx.restore();
}
function lionShield(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??10);ctx.scale(o.s??2,o.s??2);
 if(o.crown)royalCrown(ctx,0,-104,.75,p);
 emboss(ctx,c2=>smooth(c2,[[-80,-70],[80,-70],[76,40],[50,84],[0,104],[-50,84],[-76,40]]),p,{off:2.8});
 lion(ctx,0,14,1.25,p);
 ctx.restore();
}

/* Dólar Peace (1922) · estilización del águila naturalista en reposo.
 * Reverso diferenciado del águila heráldica con escudo de otros dólares. */
function peaceEagle(ctx,p,o={}){
 ctx.save();ctx.scale(o.s??1,o.s??1);
 // Luz del amanecer tras el águila, sin ocupar la leyenda.
 for(let i=-8;i<=8;i++){
  const a=-Math.PI/2+i*.169;
  const p1=[Math.cos(a)*72,187+Math.sin(a)*72];
  const p2=[Math.cos(a)*290,187+Math.sin(a)*290];
  if(p2[1]>145)continue;
  rline(ctx,[p1,p2],p,i%2?2.0:3.2,{hi:.50});
 }
 // Pedestal rocoso y palabra PEACE, característica inequívoca de este reverso.
 emboss(ctx,c=>smooth(c,[[-175,172],[-133,147],[-72,158],[-12,141],[72,159],[149,142],[177,186],[135,225],[-157,225]]),p,{off:2.8,outer:true});
 for(let j=0;j<4;j++)iline(ctx,[[-145+j*72,172+j%2*8],[-105+j*69,183+j%2*6]],p,1.5);
 text(ctx,'PEACE',0,204,28,p,{pitch:.72});
 // Ala larga, recogida: tres hileras de plumas superpuestas y orientadas abajo.
 emboss(ctx,c=>smooth(c,[[-4,-130],[-51,-134],[-91,-104],[-125,-34],[-178,67],[-185,102],[-148,103],[-98,63],[-44,10],[14,-65]]),p,{off:3.2,outer:true});
 for(let row=0;row<3;row++){
  for(let i=0;i<6;i++){
   const x=-54-row*27-i*8, y=-94+i*22+row*13;
   icurve(ctx,[[x,y],[x-18,y+23],[x-33+row*7,y+57]],p,1.55+(row===2?.2:0));
  }
 }
 // Cola de remeras puntiagudas, sin listas transversales artificiales.
 for(let i=0;i<5;i++){
  emboss(ctx,c=>poly(c,[[-106+i*14,72],[-142+i*12,135],[-111+i*13,126],[-70+i*8,43]]),p,{off:1.1});
  iline(ctx,[[-95+i*13,80],[-125+i*12,123]],p,1.1);
 }
 // Cuerpo voluminoso y pecho cubierto por escamas de pluma diagonales.
 emboss(ctx,c=>smooth(c,[[-39,-128],[-9,-146],[38,-134],[66,-101],[57,-56],[70,3],[56,88],[23,140],[-13,151],[-47,104],[-63,18],[-56,-66]]),p,{off:3.6,outer:true});
 for(let row=0;row<7;row++){
  const yy=-74+row*26, shift=row%2?13:0;
  for(let col=0;col<3;col++){
   const xx=-32+col*27+shift;
   if(xx>51||row>5&&col===2)continue;
   icurve(ctx,[[xx-8,yy-10],[xx+3,yy+10],[xx+13,yy+18]],p,1.15);
   if(row<4)iline(ctx,[[xx+9,yy+6],[xx+3,yy+19]],p,.8);
  }
 }
 // Cuello firme, testa angulosa y pico ganchudo inequívoco de rapaz.
 emboss(ctx,c=>poly(c,[[13,-124],[20,-153],[42,-184],[66,-188],[91,-177],[109,-159],[105,-147],[91,-134],[83,-115],[63,-101],[33,-106]]),p,{off:2.6,outer:true});
 // Plumas nucales acuminadas, en vez de un cuello liso o redondeado.
 for(let i=0;i<5;i++){
  const y=-145+i*11;
  iline(ctx,[[29+i*2,y],[42-i*2,y+10],[32-i*3,y+19]],p,1.4);
 }
 // Puente en pendiente fuerte, pico ganchudo descendente y extremo puntiagudo.
 emboss(ctx,c=>poly(c,[[102,-160],[117,-158],[140,-143],[143,-134],[135,-129],[129,-111],[120,-105],[119,-127],[109,-137],[94,-140]]),p,{off:2.1,outer:true});
 iline(ctx,[[105,-141],[124,-137],[135,-134]],p,2.2); // comisura bajo el pico
 iline(ctx,[[58,-165],[74,-170],[92,-157]],p,3.5); // ceño rapaz angular
 iline(ctx,[[79,-161],[94,-155]],p,1.7); // frente inclinada
 dot(ctx,80,-155,3.4,p);dot(ctx,120,-147,1.6,p); // ojo y narina
 iline(ctx,[[135,-128],[129,-113],[120,-105]],p,2.8); // gancho terminal del pico
 // Tarsos y garras aferrados a la rama de olivo, por encima de PEACE.
 for(const x of [-1,43]){
  rline(ctx,[[x,127],[x+9,159],[x+3,172]],p,4);
  for(let j=-1;j<=1;j++)rline(ctx,[[x+5,169],[x+j*10+4,177]],p,2.2);
 }
 icurve(ctx,[[-92,180],[-24,171],[45,177],[98,165]],p,2.4);
 for(let i=0;i<9;i++){
  const px=-82+i*22,py=177+Math.sin(i*.6)*2;
  emboss(ctx,c=>ell(c,px,py+(i%2?9:-9),12,4,(i%2?.5:-.5)),p,{off:1.0,blur:.3});
 }
 ctx.restore();
}
/* Anverso Peace: Libertad mirando a izquierda con tiara de rayos.
 * El cabello recogido la distingue de un busto monárquico. */
function peaceLiberty(ctx,p){
 ctx.save();ctx.translate(0,2);ctx.scale(1.31,1.31);
 for(let i=0;i<8;i++){
  const a=-2.6+i*.285;
  const sx=20+Math.cos(a)*120,sy=-82+Math.sin(a)*120;
  const ex=20+Math.cos(a)*198,ey=-82+Math.sin(a)*198;
  const nx=-Math.sin(a),ny=Math.cos(a);
  emboss(ctx,c=>poly(c,[[sx+nx*12,sy+ny*12],[ex,ey],[sx-nx*12,sy-ny*12]]),p,{off:1.4});
 }
 head(ctx,p,{hair:'bun',mirror:true,drape:'toga',female:true,nose:.70,chin:.74,jaw:.82,lip:1.12});
 // Cinta de diadema que sujeta los rayos; mechones y cuello del retrato femenino.
 icurve(ctx,[[88,-118],[51,-147],[5,-158],[-52,-130]],p,4.5);
 icurve(ctx,[[-96,-66],[-112,-28],[-102,19],[-87,37]],p,1.8);
 icurve(ctx,[[-64,100],[-29,113],[12,126]],p,1.4);
 ctx.restore();
}
/* Walking Liberty 1943: águila naturalista con alas extendidas en roca;
 * sin el escudo pectoral del sello oficial. */
function walkingEagle(ctx,p){
 ctx.save();ctx.scale(1.48,1.48);
 emboss(ctx,c=>smooth(c,[[-158,154],[-110,136],[-50,155],[15,139],[84,154],[146,144],[158,186],[-147,190]]),p,{off:2.5});
 // Ala elevada a la izquierda y ala replegada hacia la derecha.
 emboss(ctx,c=>smooth(c,[[-36,-92],[-70,-141],[-117,-168],[-143,-141],[-135,-71],[-112,-7],[-85,51],[-35,60]]),p,{off:3,outer:true});
 emboss(ctx,c=>smooth(c,[[22,-97],[74,-144],[143,-157],[148,-121],[118,-66],[85,5],[41,57]]),p,{off:3,outer:true});
 for(let i=0;i<6;i++){
  icurve(ctx,[[-66-i*8,-102-i*5],[-107-i*4,-31],[-83-i*2,34]],p,1.9);
  icurve(ctx,[[57+i*10,-108-i*3],[109+i*5,-58],[81+i*5,20]],p,1.9);
 }
 emboss(ctx,c=>smooth(c,[[-30,-102],[28,-110],[59,-55],[53,61],[12,115],[-36,89],[-52,5]]),p,{off:3.1});
 emboss(ctx,c=>smooth(c,[[30,-103],[34,-139],[69,-151],[97,-138],[87,-112],[60,-99]]),p,{off:2});
 emboss(ctx,c=>poly(c,[[86,-137],[109,-129],[92,-119]]),p,{off:1.2});
 dot(ctx,66,-133,2.8,p);
 for(const x of [-16,31]){rline(ctx,[[x,96],[x+8,145]],p,4);for(let j=-1;j<=1;j++)rline(ctx,[[x+8,145],[x+j*9+8,153]],p,2);}
 // Rama de pino a la izquierda del pedestal.
 rline(ctx,[[-133,162],[-96,116],[-69,78]],p,3);
 for(let i=0;i<7;i++){
  const x=-128+i*9,y=155-i*12;
  for(const sg of [-1,1])rline(ctx,[[x,y],[x+sg*16,y-20]],p,1.2);
 }
 ctx.restore();
}


/* Diseños contrastados: centavo Lincoln 1909 (espigas), Mercury dime 1942
 * (fasces), níquel español 1949, 25 céntimos 1927 y 5 pesetas 1989. */
function wheatLincoln(ctx,p){
 text(ctx,'ONE',0,-100,65,p);text(ctx,'CENT',0,-14,68,p);
 text(ctx,'UNITED STATES',0,79,31,p,{pitch:.55});text(ctx,'OF AMERICA',0,118,31,p,{pitch:.58});
 LTOP(ctx,'E PLURIBUS UNUM',p,{size:29,span:2.0,r:318});
 for(const sg of [-1,1]){
   icurve(ctx,[[sg*185,224],[sg*240,125],[sg*262,-15],[sg*240,-196]],p,4);
   for(let i=0;i<12;i++){
     const y=172-i*29,x=sg*(210+35*Math.sin((i+1)*.18));
     emboss(ctx,c=>ell(c,x+sg*11,y,8,22,-sg*.6),p,{off:1.0});
     emboss(ctx,c=>ell(c,x-sg*7,y+4,8,20,sg*.6),p,{off:1.0});
   }
 }
 text(ctx,'V.D.B.',0,275,16,p);
}
function mercuryFasces(ctx,p){
 LTOP(ctx,'UNITED STATES OF AMERICA',p,{size:28,span:2.75,r:319});
 LBOT(ctx,'ONE DIME',p,{size:36,span:1.04,r:319});
 // Haz de varillas unido por tres bandas, hacha lateral y rama de olivo.
 for(let i=-5;i<=5;i++)rline(ctx,[[i*12-37,-172],[i*12-37,173]],p,4);
 for(const y of [-149,-12,150]){
   emboss(ctx,c=>poly(c,[[-110,y-12],[61,y-12],[61,y+14],[-110,y+14]]),p,{off:2.1});
   for(let i=0;i<15;i++)iline(ctx,[[-107+i*11,y-9],[-107+i*11,y+11]],p,.8);
 }
 emboss(ctx,c=>smooth(c,[[-44,-166],[-79,-187],[-124,-190],[-155,-161],[-154,-111],[-114,-110],[-97,-132],[-44,-139]]),p,{off:3,outer:true});
 icurve(ctx,[[42,198],[104,82],[134,-25],[112,-144]],p,4);
 for(let i=0;i<11;i++){
   const y=145-i*25,x=105+24*Math.sin(i*.25);
   emboss(ctx,c=>ell(c,x-19,y,12,5,-.45),p,{off:1.2});
   emboss(ctx,c=>ell(c,x+19,y-8,12,5,.45),p,{off:1.2});
 }
 text(ctx,'E PLURIBUS',193,32,18,p,{pitch:.52});text(ctx,'UNUM',205,60,20,p);
}
function franco1949Reverse(ctx,p){
 // Escudo nacional antiguo: águila de San Juan con escudo y columnas.
 ctx.save();ctx.scale(.87,.87);eagleSanJuan(ctx,p,{s:1.0});ctx.restore();
 ctx.save();ctx.translate(0,55);pillars(ctx,p,{crowned:false,dx:186});spanishShield(ctx,0,0,1.0,p,'none');royalCrown(ctx,0,-133,.63,p);ctx.restore();
 LTOP(ctx,'CINCO',p,{size:44,span:.80,r:317});
 LBOT(ctx,'PESETAS',p,{size:46,span:1.12,r:314});
}
function joanCarlosFive(ctx,p){
 // Abstracción lineal del monograma JCI. No es una imagen de la moneda.
 emboss(ctx,c=>smooth(c,[[-195,-125],[-119,-170],[-107,89],[-122,140],[-176,169],[-199,139]]),p,{off:3.5});
 emboss(ctx,c=>smooth(c,[[88,-155],[17,-173],[-23,-121],[-40,-18],[-30,92],[24,154],[89,135]]),p,{off:3.1});
 emboss(ctx,c=>poly(c,[[128,-169],[162,-169],[155,172],[123,168]]),p,{off:2.6});
 rline(ctx,[[-190,187],[187,-173]],p,7);
 // Numista KM 833: anverso con monograma JCI, ESPAÑA y la fecha; la leyenda JUAN CARLOS I no figura en este tipo.
 text(ctx,'ESPAÑA',0,236,33,p,{pitch:.6});text(ctx,'1989',0,292,30,p,{pitch:.6});
}
function sailsFive(ctx,p){
 // Doble vela triangular geométrica y valor 5 PTAS.
 emboss(ctx,c=>poly(c,[[-149,142],[-47,-184],[-47,142]]),p,{off:3.3,outer:true});
 emboss(ctx,c=>poly(c,[[-20,142],[62,-180],[118,142]]),p,{off:3.3,outer:true});
 rline(ctx,[[-194,151],[157,151]],p,5);
 icurve(ctx,[[-207,186],[-111,201],[-29,177],[77,197],[168,181]],p,3);
 text(ctx,'5',-18,24,129,p);text(ctx,'PTAS',0,231,47,p);
 text(ctx,'1989',0,300,30,p);
}
function coin1927Face(ctx,p,reverse){
 // Diseño agujereado de 1927: composición didáctica con corona y plantas.
 if(!reverse){
   LTOP(ctx,'ESPAÑA',p,{size:40,span:1.26,r:305});
   text(ctx,'1927',0,-186,54,p);
   // Rama de olivo a derecha y gavilla a izquierda, centradas alrededor del hueco.
   for(const sg of [-1,1]){icurve(ctx,[[sg*95,183],[sg*178,77],[sg*163,-79]],p,4);
     for(let i=0;i<7;i++){
      const yy=150-i*33,xx=sg*(120+24*Math.sin(i*.4));
      emboss(ctx,c=>ell(c,xx+sg*20,yy,18,8,-sg*.6),p,{off:1.2});
     }
   }
 } else {
   royalCrown(ctx,0,-194,.86,p);
   text(ctx,'25',0,-70,113,p);text(ctx,'CÉNTIMOS',0,140,44,p);
   LBOT(ctx,'1927',p,{size:36,span:.64,r:324});
   wreath(ctx,p,{r:253,leaf:'laurel'});
 }
}


/* Motivos adicionales verificados en referencias numismáticas. */
function capRaysMex(ctx,p,o={}){
 // Resplandor tras gorro frigio. Evita confundir el peso republicano con un reverso de laureles.
 for(let i=0;i<29;i++){
  const a=i/28*Math.PI*1.86-.93*Math.PI;
  const x=Math.cos(a),y=Math.sin(a);
  rline(ctx,[[x*138,y*138-10],[x*(i%2?238:265),y*(i%2?238:265)-10]],p,i%2?2.0:3.1);
 }
 emboss(ctx,c=>smooth(c,[[-90,7],[-116,-77],[-64,-138],[12,-162],[100,-120],[111,-80],[61,-73],[-11,-89],[-36,-41]]),p,{off:3.4,outer:true});
 icurve(ctx,[[-90,7],[-31,15],[76,-17]],p,5);
 text(ctx,'LIBERTAD',-8,-97,20,p);
 text(ctx,o.value||'8 R',0,174,48,p);
 text(ctx,`${o.mint||'Mo'} · ${o.date||'1823'}`,0,247,32,p);
}
function saintGaudensFly(ctx,p,o={}){
 // Águila de perfil volando hacia la izquierda, con alas barridas y rayos inferiores.
 for(let i=-11;i<=11;i++){
  const a=-Math.PI/2+i*.11;
  const p1=[Math.cos(a)*54,234+Math.sin(a)*54],p2=[Math.cos(a)*285,234+Math.sin(a)*285];
  if(p2[1]>243)continue;
  rline(ctx,[p1,p2],p,i%2?1.5:2.6);
 }
 emboss(ctx,c=>smooth(c,[[-175,35],[-110,-20],[-62,-88],[27,-153],[133,-168],[203,-138],[140,-112],[56,-95],[-24,-21]]),p,{off:3.4,outer:true});
 // Filas de plumas largas, curvadas hacia la derecha.
 for(let i=0;i<9;i++){
  const y=-103+i*14;
  icurve(ctx,[[28,y],[121+i*6,y-14],[168+i*4,y-23]],p,2.0);
 }
 emboss(ctx,c=>smooth(c,[[-118,22],[-149,-4],[-196,-8],[-209,12],[-201,27],[-157,29],[-85,67],[-5,83],[85,29],[55,-14],[-36,-22]]),p,{off:3.7,outer:true});
 // Cabeza a izquierda y pico curvo.
 emboss(ctx,c=>smooth(c,[[-172,-1],[-194,-23],[-213,-18],[-224,-7],[-236,-4],[-239,8],[-222,5],[-208,14],[-183,23]]),p,{off:2});
 dot(ctx,-199,-8,3.2,p);
 for(let i=0;i<8;i++)icurve(ctx,[[-96+i*20,26],[-34+i*18,85],[32+i*15,69]],p,1.3);
}
function soviet1923(ctx,p){
 // Escudo RSFSR: espigas, sol, martillo/hoz; tratamiento esquemático vectorial.
 for(let i=-9;i<=9;i++){
  const a=-Math.PI/2+i*.17;
  rline(ctx,[[Math.cos(a)*76,30+Math.sin(a)*76],[Math.cos(a)*214,30+Math.sin(a)*214]],p,1.8);
 }
 for(const sg of [-1,1]){
  icurve(ctx,[[sg*80,213],[sg*167,49],[sg*110,-166]],p,3.3);
  for(let i=0;i<10;i++){
    const y=153-i*31,x=sg*(134+17*Math.sin(i*.3));
    emboss(ctx,c=>ell(c,x+sg*18,y,9,19,-sg*.65),p,{off:1.3});
  }
 }
 emboss(ctx,c=>smooth(c,[[-110,-110],[111,-110],[112,137],[0,176],[-110,137]]),p,{off:2.7});
 rline(ctx,[[-68,88],[74,-51]],p,13);
 emboss(ctx,c=>poly(c,[[18,-85],[84,-85],[84,-59],[28,-59]]),p,{off:2.0});
 icurve(ctx,[[68,-42],[86,0],[57,46],[5,59],[-35,38]],p,10);
 text(ctx,'РСФСР',0,251,35,p);
}
function argentina1881(ctx,p){
 // Escudo nacional y 14 banderas representadas por haces simplificados.
 for(const sg of [-1,1]){
  for(let i=0;i<7;i++){
   const x=sg*(112+i*18);rline(ctx,[[sg*40,128],[x,-185+i*15]],p,4);
   emboss(ctx,c=>poly(c,[[x,-185+i*15],[x+sg*51,-180+i*15],[x+sg*28,-153+i*15]]),p,{off:1.2});
  }
  icurve(ctx,[[sg*15,208],[sg*179,100],[sg*154,-143]],p,3);
 }
 emboss(ctx,c=>smooth(c,[[-109,-116],[109,-116],[106,81],[48,142],[-48,142],[-106,81]]),p,{off:2.7});
 // manos entrelazadas y pica coronada por gorro
 rline(ctx,[[-68,40],[-8,22],[58,55]],p,13);
 rline(ctx,[[0,125],[0,-75]],p,6);
 emboss(ctx,c=>smooth(c,[[-20,-78],[-37,-122],[0,-152],[42,-122],[40,-80]]),p,{off:2.1});
 sunFace(ctx,p,{s:.47,y:-221});
}
function mercuryWinged(ctx,p){
 ctx.save();ctx.scale(1.18,1.18);
 head(ctx,p,{hair:'helmet',female:true,mirror:true,nose:.87,chin:.83,drape:'toga'});
 // Aletas aladas fijadas sobre el casco de Libertad.
 for(let i=0;i<5;i++){
  const x=27+i*18,y=-129-i*4;
  emboss(ctx,c=>smooth(c,[[x-4,y+18],[x-6,y-10],[x+16,y-26],[x+28,y-18],[x+13,y+4]]),p,{off:1.2});
 }
 ctx.restore();
 LTOP(ctx,'LIBERTY',p,{size:42,span:1.12,r:316});
 text(ctx,'1942',164,258,36,p);
}
function sowerChervonets(ctx,p,o={}){
 // Sol, fábrica y arado detrás del campesino, silueta de siembra.
 for(let i=-7;i<=7;i++){
  const a=-Math.PI/2+i*.18;
  rline(ctx,[[Math.cos(a)*60-100,Math.sin(a)*60+92],[Math.cos(a)*175-100,Math.sin(a)*175+92]],p,2.2);
 }
 for(const x of [117,153,193]){
  emboss(ctx,c=>poly(c,[[x-18,158],[x+18,158],[x+18,-22],[x-18,-22]]),p,{off:1.5});
  icurve(ctx,[[x,-35],[x+21,-62],[x+3,-95]],p,1.9);
 }
 rline(ctx,[[-183,169],[15,169],[86,202]],p,3.5);
 sower(ctx,p,{s:1.35,sun:true});
 LTOP(ctx,'ОДИН ЧЕРВОНЕЦ',p,{size:30,span:2.5,r:318});
 text(ctx,'1923',0,268,32,p);
}


/* ---- V6.25: referencias verificadas para monedas de Bolivia, Perú, Chile, China y Roma ---- */
function yuanWheat1914(ctx,p){
 // Dos tallos con espigas de trigo y tallos cruzados, anudados al pie.
 for(const sg of [-1,1]){
  icurve(ctx,[[sg*17,220],[sg*168,110],[sg*203,-96],[sg*160,-208]],p,4);
  for(let i=0;i<12;i++){
   const y=154-i*30,x=sg*(135+46*Math.sin((i+2)*.21));
   emboss(ctx,c=>ell(c,x+sg*12,y,10,22,sg*.4),p,{off:1.4});
   rline(ctx,[[x,y+13],[x+sg*21,y-17]],p,1.7);
  }
 }
 emboss(ctx,c=>smooth(c,[[-51,210],[2,223],[56,206],[43,235],[-38,240]]),p,{off:1.7});
 text(ctx,'壹',0,-48,115,p);text(ctx,'圓',0,95,115,p);
}
function boliviaTreeLlamas(ctx,p,s={}){
 // Árbol de la libertad, seis estrellas y dos alpacas a sus pies; medalla en geometría esquemática.
 rline(ctx,[[0,124],[9,-181]],p,19);
 for(const sg of [-1,1]){
  rline(ctx,[[0,-120],[sg*90,-184]],p,8);
  rline(ctx,[[sg*5,-82],[sg*125,-131]],p,8);
  for(const [x,y] of [[65,-183],[106,-129],[42,-124],[17,-213]])
   emboss(ctx,c=>ell(c,sg*x,y,35,17,sg*.25),p,{off:2.1});
  // Alpaca sentada de cuello alto y cabeza ovalada.
  emboss(ctx,c=>smooth(c,[[sg*30,160],[sg*75,130],[sg*145,141],[sg*158,182],[sg*98,204],[sg*34,195]]),p,{off:2.4,outer:true});
  emboss(ctx,c=>poly(c,[[sg*112,138],[sg*119,62],[sg*148,62],[sg*145,145]]),p,{off:2.2});
  emboss(ctx,c=>ell(c,sg*132,51,24,17,0),p,{off:2});
  rline(ctx,[[sg*112,182],[sg*115,216]],p,6);
  // Nuevos trazos: lana incusa, orejas y crin del camélido andino.
  emboss(ctx,c=>poly(c,[[sg*142,42],[sg*150,20],[sg*154,43]]),p,{off:1.1});
  dot(ctx,sg*146,47,2.2,p);
  for(let j=0;j<10;j++){
    const x=sg*(47+j*10),y=151+(j%3)*9;
    icurve(ctx,[[x,y],[x+sg*7,y+7],[x,y+18]],p,1.35);
  }
  for(let j=0;j<7;j++){
    const x=sg*(118+(j%2)*6),y=67+j*9;
    icurve(ctx,[[x,y],[x+sg*8,y+3],[x,y+11]],p,1.3);
  }
 }
 // Hojas de la palmera/patagua histórica: relieve vectorial diferenciado.
 for(let j=-6;j<=6;j++){
   const x=9+j*18,y=-184-Math.sin((j+6)*.3)*13;
   emboss(ctx,c=>ell(c,x,y,8.4,20,j*.12),p,{off:1.0});
 }
 for(let i=0;i<6;i++){
  let a=Math.PI+i*Math.PI/5,x=Math.cos(a)*195,y=Math.sin(a)*195-55;
  emboss(ctx,c=>poly(c,Array.from({length:12},(_,k)=>{let q=-Math.PI/2+k*Math.PI/6;let r=k%2?7:15;return [x+r*Math.cos(q),y+r*Math.sin(q)];})),p,{off:1.2});
 }
 LTOP(ctx,'REPUBLICA BOLIVIANA',p,{size:29,span:2.45,r:322});
 text(ctx,'8 S · PTS · '+(s.date||'1835'),0,281,30,p);
}
function peruArms1872(ctx,p,s={}){
 // Escudo tripartito: vicuña, árbol de quina y cornucopia estilizada.
 emboss(ctx,c=>smooth(c,[[-164,-136],[164,-136],[155,109],[54,190],[-57,190],[-157,109]]),p,{off:3.0,outer:true});
 rline(ctx,[[0,-136],[0,54]],p,5);rline(ctx,[[-159,54],[153,54]],p,5);
 rline(ctx,[[-88,-12],[-85,-70],[-48,-90],[-10,-66]],p,8); // vicuña
 for(let i=0;i<6;i++){
  rline(ctx,[[94,-31],[85+i*3,-118+i*9]],p,3);
 }
 emboss(ctx,c=>smooth(c,[[-68,83],[-48,68],[-12,83],[29,121],[56,100],[75,130],[24,160],[-56,141]]),p,{off:2});
 for(const sg of [-1,1]){icurve(ctx,[[sg*10,235],[sg*209,70],[sg*175,-178]],p,3.5);}
 LTOP(ctx,'REPUBLICA PERUANA',p,{size:34,span:2.10,r:330});
 text(ctx,s.date||'1872',0,278,32,p);
}
function peruLiberty1872(ctx,p,s={}){
 seatedLiberty(ctx,p,{s:1.56});
 // Gorro frigio elevado sobre asta como distintivo peruano.
 rline(ctx,[[155,150],[156,-158]],p,7);
 emboss(ctx,c=>smooth(c,[[139,-156],[146,-201],[178,-217],[192,-176],[183,-157]]),p,{off:2});
 LTOP(ctx,s.legend||'FIRME Y FELIZ POR LA UNION',p,{size:29,span:2.7,r:328});
}
function chilePlumed1883(ctx,p,s={}){
 wreath(ctx,p,{r:262,leaf:'laurel'});
 emboss(ctx,c=>smooth(c,[[-123,-112],[130,-112],[129,105],[0,173],[-128,105]]),p,{off:2.9});
 rline(ctx,[[-95,1],[96,1]],p,5);
 for(const sg of [-1,1]){for(let i=0;i<3;i++){
  icurve(ctx,[[sg*9,-144],[sg*(32+i*22),-224-i*10],[sg*(62+i*17),-243+i*6]],p,6);
 }}
 text(ctx,'★',0,-168,38,p);
 LTOP(ctx,s.legend||'REPUBLICA DE CHILE',p,{size:32,span:2.3,r:328});
 LBOT(ctx,s.value||'UN PESO',p,{size:32,span:1.25,r:318});
}
function chileCondor1883(ctx,p,s={}){
 ctx.save();ctx.translate(0,-13);condor(ctx,p,{s:1.38,shield:true});ctx.restore();
 LTOP(ctx,s.legend||'POR LA RAZON O LA FUERZA',p,{size:26,span:2.8,r:328});
 text(ctx,s.date||'1883',0,279,34,p);
}
function romanRadiate240(ctx,p,s={}){
 const cfg=Object.assign({},RULERS[s.ruler]||{},s.cfg||{});
 bust(ctx,p,cfg,{s:s.bs||1.15});
 // Corona radiada sobre la frente y coronilla: atributo del antoniniano.
 for(let i=0;i<8;i++){
  const a=-2.65+i*.27,x=Math.cos(a)*177+28,y=Math.sin(a)*170-60;
  rline(ctx,[[x,y],[x+Math.cos(a)*54,y+Math.sin(a)*54]],p,8);
 }
 LTOP(ctx,s.legend,p,{size:s.ls||29,span:s.lspan||2.2,r:326});
}
function romanConcordia240(ctx,p,s={}){
 // Personificación sentada en trono, pátera en mano y doble cornucopia.
 emboss(ctx,c=>poly(c,[[88,-58],[143,-58],[143,169],[88,169]]),p,{off:2.4});
 emboss(ctx,c=>ell(c,-15,-105,43,48,0),p,{off:2.4});
 emboss(ctx,c=>smooth(c,[[-41,-64],[35,-58],[77,84],[0,132],[-95,80]]),p,{off:2.5});
 rline(ctx,[[-48,-43],[-156,2],[-190,-24]],p,13);
 ell(ctx,-202,-19,34,9,0);ctx.strokeStyle=p.light;ctx.lineWidth=4;ctx.stroke();
 rline(ctx,[[62,-38],[141,-87],[176,-187]],p,16);
 icurve(ctx,[[178,-191],[191,-133],[157,-80]],p,7);
 emboss(ctx,c=>poly(c,[[-102,91],[54,111],[132,163],[92,176],[-85,149]]),p,{off:2.1});
 rline(ctx,[[-120,169],[165,169]],p,6);
 LTOP(ctx,s.legend||'CONCORDIA AVG',p,{size:35,span:1.7,r:326});
}


/* V6.28/V6.29 — Motivos específicos. Las geometrías son estilizadas; los símbolos
   y las leyendas principales siguen los tipos numismáticos citados en la ficha. */
function isabelFourQuarterShield(ctx,p,s=1,opts={}){
 ctx.save();ctx.scale(s,s);
 const trace=c=>{c.beginPath();c.moveTo(-92,-100);c.lineTo(92,-100);c.lineTo(91,46);
  c.bezierCurveTo(90,91,37,118,0,128);c.bezierCurveTo(-37,118,-90,91,-91,46);c.closePath();};
 emboss(ctx,trace,p,{off:3.1});
 ctx.save();trace(ctx);ctx.clip();
 iline(ctx,[[0,-98],[0,111]],p,3);iline(ctx,[[-92,3],[92,3]],p,3);
 castle(ctx,-45,-49,.77,p);lion(ctx,44,-49,.62,p,false,{crown:true});
 lion(ctx,-45,49,.62,p,true,{crown:true});castle(ctx,45,48,.77,p);
 pomegranate(ctx,0,103,.72,p);
 ctx.restore();
 emboss(ctx,c=>ell(c,0,6,28,37),p,{off:2.1});
 fleurDeLis(ctx,-11,-5,.36,p);fleurDeLis(ctx,11,-5,.36,p);fleurDeLis(ctx,0,17,.36,p);
 if(opts.collar){
  for(let i=0;i<38;i++){const a=i/38*TAU;dot(ctx,Math.sin(a)*111,9-Math.cos(a)*144,2.25,p);}
  emboss(ctx,c=>smooth(c,[[-10,151],[10,151],[7,169],[0,181],[-7,169]]),p,{off:1.2});
 }
 ctx.restore();
}
function muralCrown(ctx,p,x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 emboss(ctx,c=>poly(c,[[-86,4],[86,4],[74,43],[-74,43]]),p,{off:2.2});
 const wall=[[-83,-42],[-63,-42],[-63,-26],[-40,-26],[-40,-43],[-16,-43],[-16,-26],
              [16,-26],[16,-43],[40,-43],[40,-26],[63,-26],[63,-42],[83,-42],[83,2],[-83,2]];
 emboss(ctx,c=>poly(c,wall),p,{off:2.5});
 for(let i=-2;i<=2;i++){iline(ctx,[[i*32,-14],[i*32+12,-14]],p,2.2);}
 for(let i=-2;i<=2;i++){iline(ctx,[[i*27,-1],[i*27,10]],p,1.8);}
 ctx.restore();
}
function isabelArms1850(ctx,p,s){
 ctx.save();ctx.translate(0,-5);
 isabelFourQuarterShield(ctx,p,s,{collar:true});
 royalCrown(ctx,0,-145*s,Math.max(.6,s*.48),p);
 ctx.restore();
}
function isabelArmsLater(ctx,p,s,mode){
 ctx.save();ctx.translate(0,8);
 if(mode==='columnas')pillars(ctx,p,{dx:188,crowned:true});
 if(mode==='oro'){
  // Cortinajes esquemáticos de la armería de los escudos de oro.
  for(const sg of [-1,1]){
   emboss(ctx,c=>smooth(c,[[sg*128,-163],[sg*180,-113],[sg*163,74],[sg*118,120],[sg*153,31]]),p,{off:1.8});
   for(let k=0;k<3;k++)rline(ctx,[[sg*(132+k*8),-100],[sg*(137+k*9),50],[sg*(130+k*7),96]],p,2.2);
  }
 }
 isabelFourQuarterShield(ctx,p,s,{collar:false});
 royalCrown(ctx,0,-145*s,Math.max(.55,s*.47),p);
 ctx.restore();
}
function provisionalArms(ctx,p,s){
 ctx.save();ctx.translate(0,10);
 pillars(ctx,p,{dx:189,crowned:false});
 spanishShield(ctx,0,3,s,p,'none');
 muralCrown(ctx,p,0,-120*s,.75);
 ctx.restore();
}
function renderIsabelArms(ctx,p,s){
 const mode=s.mode||'later';
 if(mode==='transicion1850')isabelArms1850(ctx,p,s.ss||1.14);
 else isabelArmsLater(ctx,p,s.ss||1.28,mode);
 LTOP(ctx,s.legend||'REINA DE LAS ESPAÑAS',p,{size:s.ls||29,span:s.lspan||2.35,r:332});
 LBOT(ctx,s.value||'',p,{size:30,span:s.vspan||1.0,r:333});
 if(s.mint)text(ctx,s.mint,-236,211,20,p);
 if(s.assayer)text(ctx,s.assayer,236,211,20,p);
}
function renderProvisionalArms(ctx,p,s){
 provisionalArms(ctx,p,s.ss||1.16);
 LTOP(ctx,s.legend||'100 PIEZAS EN KILOGRAMO',p,{size:s.ls||24,span:s.lspan||3.2,r:332});
 LBOT(ctx,s.value||'',p,{size:29,span:s.vspan||1.2,r:337});
 const marks=s.marks||[];
 if(marks[0])text(ctx,marks[0],-224,205,20,p);
 if(marks[1])text(ctx,marks[1],224,205,20,p);
}

/* V6.29 · Gobierno Provisional: el reverso de 5/10 céntimos lleva un león
   tenante y escudo ovalado. No es una corona vegetal. Figuras esquemáticas. */
function provisionalLionShield(ctx,p,s={}){
 ctx.save();ctx.translate(0,8);
 // Ovalo con cuarteles españoles sin escusón borbónico ni corona monárquica.
 ctx.save();ctx.translate(96,34);ctx.scale(.67,.75);
 emboss(ctx,c=>ell(c,0,0,114,142),p,{off:2.5});
 spanishShield(ctx,0,2,1.03,p,'none');
 ctx.restore();
 // León rampante/tenante abrazando el óvalo.
 lion(ctx,-87,31,1.78,p,!!s.pattern,{crown:false});
 rline(ctx,[[-50,170],[25,172],[146,163]],p,2.2);
 for(let i=0;i<68;i++){const a=i/68*TAU;dot(ctx,Math.cos(a)*286,Math.sin(a)*286,1.45,p);}
 ctx.restore();
}
/* Escudo español de 25/10 pesetas oro, sin columnas: collar del Toisón sobre
   manto de armiño y corona real. Esquema vectorial, no cuño calcado. */
function alfonsoGoldMantle(ctx,p,s={}){
 const ss=s.ss??1.13;
 ctx.save();ctx.translate(0,7);
 emboss(ctx,c=>smooth(c,[[-156,-160],[-95,-202],[0,-205],[98,-200],[156,-160],[177,-72],[166,68],[149,147],[109,186],[0,191],[-111,184],[-150,148],[-166,65],[-174,-74]]),p,{off:3.5});
 for(const d of [-1,1]){
  emboss(ctx,c=>smooth(c,[[d*151,-162],[d*193,-112],[d*186,42],[d*166,143],[d*117,163],[d*124,63],[d*116,-112]]),p,{off:1.5});
  for(let i=0;i<4;i++)rline(ctx,[[d*(145+i*8),-122],[d*(164+i*7),25],[d*(145+i*5),127]],p,2);
  for(let i=0;i<6;i++)dot(ctx,d*(142+i*3),-108+i*38,2.7,p);
 }
 spanishShield(ctx,0,6,ss,p,'lilies',{collar:true});
 royalCrown(ctx,0,-171, .78,p);
 ctx.restore();
}

/* V6.30 — 1 peseta 1944: escudo estatal, sin retrato de Franco.
   El anverso usa pesetaOrnament existente (1 PESETA y seis emblemas). */
function franco44Shield(ctx,p){
 ctx.save();ctx.translate(0,-7);
 pillars(ctx,p,{crowned:false,dx:199});
 spanishShield(ctx,0,-10,1.24,p,'none');
 royalCrown(ctx,0,-155,.68,p);
 ctx.save();ctx.translate(0,208);yokeArrows(ctx,p,{s:.47});ctx.restore();
 ctx.restore();
 LTOP(ctx,'ESPAÑA · 1944',p,{size:34,span:2.04,r:333});
 LBOT(ctx,'UNA · GRANDE · LIBRE',p,{size:26,span:2.1,r:325});
}
/* Peseta de aluminio de 1989, «lenteja»: busto desplazado a la izquierda,
   1 PESETA a la derecha; al dorso el escudo constitucional con columnas. */
function jcLentilObv(ctx,p,s={}){
 ctx.save();ctx.translate(-127,11);bust(ctx,p,{hair:'short',mirror:true,nose:1.01,chin:1.0},{s:.93});ctx.restore();
 text(ctx,'JUAN CARLOS I',106,-189,35,p,{pitch:.48});
 text(ctx,'1',192,-37,112,p,{pitch:.62});
 text(ctx,'PESETA',160,57,45,p,{pitch:.52});
 text(ctx,'ESPAÑA',138,170,40,p,{pitch:.54});
}
function jcLentilRev(ctx,p,s={}){
 ctx.save();ctx.translate(0,-24);
 pillars(ctx,p,{dx:180,crowned:true});
 spanishShield(ctx,0,0,1.09,p,'lilies');
 royalCrown(ctx,0,-135,.67,p);
 ctx.restore();
 text(ctx,s.date||'1989',0,262,40,p,{pitch:.62});
}
/* Vellón 1600 (Cuenca): octolóbulo, castillo / león, no retrato.
   Son esquemas de tipo, NO un cuño exacto de una variedad de ensayador. */
function cuencaOctolobe(ctx,p){
 const pts=[];for(let i=0;i<=144;i++){
   const a=i*TAU/144,rad=268+14*Math.cos(8*a);pts.push([Math.cos(a)*rad,Math.sin(a)*rad]);
 }
 rline(ctx,pts,p,5.2);
 for(let j=0;j<8;j++){
  const a=j*TAU/8;dot(ctx,Math.cos(a)*286,Math.sin(a)*286,3,p);
 }
}
function cuencaVellon(ctx,p,isLion){
 ctx.save();ctx.translate(0,10);cuencaOctolobe(ctx,p);
 if(isLion)lionCharge(ctx,p,{s:3.9});else castleCharge(ctx,p,{s:4.0});
 ctx.restore();
}

/* ===== LOTE 07 · emblemas diferenciados, no plantillas genéricas ===== */
function georgianLionPassant(ctx,p){
 ctx.save();ctx.translate(0,-10);ctx.scale(1.18,1.18);
 // León caminando hacia la derecha, horizontal, sobre la corona.
 emboss(ctx,c=>smooth(c,[[-96,-24],[-76,-55],[-40,-64],[7,-55],[54,-46],[67,-10],[41,16],[-17,17],[-60,3],[-88,8]]),p,{off:2.8,outer:true});
 // Cuatro patas y garras separadas.
 for(const [x,dx,y] of [[-60,-14,55],[-24,11,52],[24,-7,47],[51,15,43]]){
  emboss(ctx,c=>poly(c,[[x-10,-7],[x+7,-4],[x+dx+6,y],[x+dx-11,y]]),p,{off:1.8});
  rline(ctx,[[x+dx-10,y],[x+dx+9,y]],p,3);
 }
 // Melena, cabeza cuadrangular, hocico y cola alta.
 emboss(ctx,c=>smooth(c,[[42,-55],[67,-82],[91,-73],[98,-50],[85,-32],[56,-28],[44,-41]]),p,{off:2.1});
 emboss(ctx,c=>poly(c,[[89,-69],[109,-62],[100,-53],[83,-52]]),p,{off:1.5});
 emboss(ctx,c=>smooth(c,[[-95,-25],[-113,-50],[-122,-81],[-139,-97],[-148,-80],[-147,-58]]),p,{off:1.9});
 dot(ctx,81,-66,3,p);
 for(let j=0;j<6;j++)iline(ctx,[[45+j*3,-53],[50+j*3,-35]],p,1.2);
 ctx.restore();
}
function georgianSixpence(ctx,p,s){
 // Emblema distinto de la antigua corona vegetal de los seis peniques.
 royalCrown(ctx,0,122,1.08,p);
 georgianLionPassant(ctx,p);
 royalCrown(ctx,42,-103,.43,p);
 LTOP(ctx,'FID DEF IND IMP',p,{size:31,span:2.2});
 text(ctx,s.date?.slice(0,2)||'19',-238,28,40,p);text(ctx,s.date?.slice(2)||'20',238,28,40,p);
 LBOT(ctx,'SIXPENCE',p,{size:33,span:1.35});
}
function scottishShilling1940(ctx,p){
 // El reverso escocés NO es el simple león heráldico sobre escudo.
 ctx.save();ctx.translate(0,-8);ctx.scale(1.55,1.55);
 lion(ctx,0,-27,1.22,p,true,{crown:true});
 royalCrown(ctx,1,-108,.43,p);
 // Espada larga levantada por la garra derecha.
 rline(ctx,[[-72,21],[-85,-142]],p,4.6);rline(ctx,[[-98,-89],[-72,-89]],p,4);
 emboss(ctx,c=>poly(c,[[-91,-145],[-85,-164],[-79,-145]]),p,{off:1});
 // Cetro con flor de lis, en la otra garra.
 rline(ctx,[[75,24],[89,-126]],p,4.2);
 emboss(ctx,c=>smooth(c,[[89,-126],[80,-137],[83,-151],[90,-145],[98,-151],[99,-137]]),p,{off:1});
 ctx.restore();
 // Escudetes: aspa de san Andrés y cardo.
 for(const sg of [-1,1]){
  const x=sg*214,y=103;
  emboss(ctx,c=>smooth(c,[[x-40,y-30],[x+40,y-30],[x+37,y+18],[x,y+50],[x-37,y+18]]),p,{off:1.8});
  if(sg<0){rline(ctx,[[x-23,y-20],[x+23,y+24]],p,3);rline(ctx,[[x+23,y-20],[x-23,y+24]],p,3);}
  else {rline(ctx,[[x,y+25],[x,y-18]],p,3);dot(ctx,x,y-24,10,p);for(const dd of [-1,1])rline(ctx,[[x,y],[x+dd*20,y-9]],p,2);}
 }
 royalCrown(ctx,0,190,.87,p);
 text(ctx,'19',-253,20,39,p);text(ctx,'40',255,20,39,p);
 LTOP(ctx,'FID DEF IND IMP',p,{span:2.35,size:32});
 LBOT(ctx,'ONE SHILLING',p,{span:1.94,size:30});
}
function franceWreathDate(ctx,p,s){
 wreath(ctx,p,{r:244,leaf:s.leaf||'laurel'});
 text(ctx,s.amount||'5',0,-78,65,p);
 text(ctx,'FRANCS',0,-1,43,p);
 text(ctx,s.year||'1831',0,92,42,p);
 text(ctx,s.mint||'A',0,146,30,p);
 if(s.legend)LTOP(ctx,s.legend,p,{size:27,span:2.55});
}
function napoleonicMantle1867(ctx,p){
 frenchMantle(ctx,p,{s:2.08});
 LTOP(ctx,'EMPIRE FRANÇAIS',p,{size:30,span:2.28});
 text(ctx,'5',-237,72,44,p);text(ctx,'F',237,72,44,p);
 text(ctx,'1867 A',0,282,32,p);
}
function ceresBust1851(ctx,p){
 bust(ctx,p,{hair:'bun',female:true,laurel:true,nose:.95,chin:1.0},{s:1.46});
 // Espigas de Ceres en la cabeza.
 for(let i=0;i<6;i++){const x=-95+i*18,y=-200+Math.sin(i*.8)*15;
  emboss(ctx,c=>ell(c,x,y,7,18,-.8),p,{off:1.2});}
 // Haz de lictores a izquierda y mano de la Justicia.
 for(let i=-2;i<=2;i++)rline(ctx,[[-206+i*4,-90],[-206+i*4,102]],p,2);
 rline(ctx,[[-228,-35],[-174,8]],p,3);
 emboss(ctx,c=>smooth(c,[[-205,-117],[-177,-116],[-169,-96],[-180,-84],[-195,-92]]),p,{off:1.4});
 // Estrella de seis rayos bajo la leyenda.
 star(ctx,0,-241,17,p);
 LTOP(ctx,'REPUBLIQUE FRANÇAISE',p,{size:27,span:2.79});
}
function semeuseBouquet1960(ctx,p,s){
 // Ramo cruzado: espigas, olivo y roble, distinto de la corona completa.
 text(ctx,'5',0,-171,79,p);text(ctx,'FRANCS',0,-97,44,p);
 rline(ctx,[[-21,147],[0,76],[6,-31]],p,4.5);
 // Espigas al centro.
 for(let j=0;j<7;j++)for(const sign of [-1,1]){
  emboss(ctx,c=>ell(c,6+sign*(9+j*1.8),-34+j*16,6.8,14,sign*.5),p,{off:1.2});
 }
 // Olivo izquierda, roble derecha.
 for(const sign of [-1,1]){
  rline(ctx,[[0,143],[sign*62,48],[sign*123,0]],p,4);
  for(let j=0;j<7;j++){
   const x=sign*(43+j*14),y=87-j*14;
   if(sign<0)emboss(ctx,c=>ell(c,x,y,10,19,.6),p,{off:1.3});
   else emboss(ctx,c=>smooth(c,[[x,y+8],[x-16,y-7],[x-12,y-20],[x,y-27],[x+12,y-20],[x+16,y-7]]),p,{off:1.3});
   if(sign>0&&j%2===0)dot(ctx,x+7,y+10,6,p);
  }
 }
 emboss(ctx,c=>smooth(c,[[-23,141],[23,141],[14,167],[-14,167]]),p,{off:1.6});
 text(ctx,s.year||'1960',0,218,41,p);
 LTOP(ctx,'LIBERTÉ ÉGALITÉ FRATERNITÉ',p,{size:25,span:2.75});
}
function prussianThaler1830(ctx,p,s){
 // Escudo real con águila y collar del Águila Negra.
 emboss(ctx,c=>smooth(c,[[-118,-106],[118,-106],[112,65],[0,135],[-112,65]]),p,{off:3.2});
 eaglePrussian(ctx,p,{s:.90});
 royalCrown(ctx,0,-160,.99,p);
 for(let i=0;i<15;i++){
  const a=Math.PI*.08+i/14*Math.PI*.84;
  const x=Math.cos(a)*158,y=Math.sin(a)*155-12;
  emboss(ctx,c=>ell(c,x,y,8,10,a),p,{off:1.0});
 }
 star(ctx,0,171,15,p);
 LTOP(ctx,'EIN THALER XIV EINE F M',p,{size:27,span:2.83});
 LBOT(ctx,(s.year||'1830')+' A',p,{size:31,span:.78});
}
function saxonyThaler1854(ctx,p){
 // Manto de armiño, escudo sajón de barras y corona.
 emboss(ctx,c=>smooth(c,[[-136,-115],[-175,-48],[-164,86],[-124,154],[0,183],[124,154],[164,86],[175,-48],[136,-115]]),p,{off:2.7,outer:true});
 for(let i=-3;i<=3;i++)for(let j=0;j<2;j++)dot(ctx,i*33,-4+j*58,4.2,p);
 emboss(ctx,c=>smooth(c,[[-105,-112],[105,-112],[101,62],[0,126],[-101,62]]),p,{off:3.2});
 for(let j=0;j<7;j++)rline(ctx,[[-94,-92+j*27],[94,-92+j*27]],p,4);
 // Crancelín (corona de ruda diagonal) sajona.
 rline(ctx,[[-87,-89],[82,94]],p,9);
 for(let i=0;i<8;i++){
  const x=-81+i*23,y=-79+i*24;
  emboss(ctx,c=>smooth(c,[[x-8,y-6],[x+4,y-17],[x+12,y-12],[x+8,y+8],[x-7,y+13]]),p,{off:1.2});
 }
 royalCrown(ctx,0,-167,1.0,p);
 LTOP(ctx,'EIN THALER XIV EINE F M',p,{span:2.85,size:26});
 LBOT(ctx,'18 54 · F',p,{span:1.0,size:30});
}

/* V6.34 — lote 08: motivos históricos estilizados, NO calcos de cuño. */
function v634Prussia1900(ctx,p,rev){
 if(!rev){
  bust(ctx,p,{...RULERS.guillermo2,mirror:false},{s:1.31});
  LTOP(ctx,'WILHELM II DEUTSCHER KAISER KÖNIG V PREUSSEN',p,{size:24,span:3.11});
  text(ctx,'A',0,244,29,p);
 } else {
  eaglePrussian(ctx,p,{s:1.47});royalCrown(ctx,0,-192,.43,p);
  LTOP(ctx,'DEUTSCHES REICH 1900',p,{size:29,span:2.24});
  LBOT(ctx,'20 MARK',p,{size:36,span:1.07});
 }
}
function v634Ducat1915(ctx,p,rev){
 if(!rev){
  bust(ctx,p,{...RULERS.franciscoJose,beard:'full',franzPortrait:true,sideburns:true,laurel:true,mirror:false,nose:1.17},{s:1.30});
  LTOP(ctx,'FRANC IOS I D G AVSTRIAE IMPERATOR',p,{size:27,span:3.06});
 } else {
  eagleDouble(ctx,p,{s:1.43});royalCrown(ctx,0,-191,.47,p);
  LTOP(ctx,'HVNGAR BOHEM GAL LOD ILL REX',p,{size:26,span:2.72});
  text(ctx,'A A',0,208,27,p,{pitch:.75});
  LBOT(ctx,'1915 (4)',p,{size:32,span:1.20});
 }
}
function v634Krone1908(ctx,p,rev){
 if(!rev){
  bust(ctx,p,{...RULERS.franciscoJose,beard:'full',franzPortrait:true,sideburns:true,laurel:true,nose:1.17},{s:1.36});
  LTOP(ctx,'FRANC IOS I D G IMP AVSTR REX BOH GAL',p,{size:24,span:3.05});
  LBOT(ctx,'ET AP REX HVNG',p,{size:23,span:1.7});
 } else {
  royalCrown(ctx,0,-133,1.33,p);
  rline(ctx,[[-158,-80],[-156,80]],p,3);rline(ctx,[[158,-80],[156,80]],p,3);
  text(ctx,'1848',-180,25,37,p,{pitch:.55});text(ctx,'1908',180,25,37,p,{pitch:.55});
  emboss(ctx,c=>smooth(c,[[-72,85],[0,126],[72,85],[53,143],[0,164],[-53,143]]),p,{off:1.6});
  text(ctx,'FJ I',0,117,42,p,{pitch:.56});
  text(ctx,'1 COR.',0,220,37,p,{pitch:.65});
  LTOP(ctx,'DVODECIM LVSTRIS GLORIOSE PERACTIS',p,{size:25,span:3.06});
 }
}
function v634SavoyShield(ctx,p,o={}){
 const inWreath=o.wreath!==false;
 if(inWreath){wreath(ctx,p,{r:245,leaf:'laurel'});}
 royalCrown(ctx,0,-153,.71,p);
 emboss(ctx,c=>smooth(c,[[-91,-95],[91,-95],[85,40],[0,111],[-85,40]]),p,{off:2.4});
 // Cruz de Saboya dentro de escudo redondeado.
 emboss(ctx,c=>poly(c,[[-15,-82],[15,-82],[15,-19],[69,-19],[69,11],[15,11],[15,78],[-15,78],[-15,11],[-69,11],[-69,-19],[-15,-19]]),p,{off:1.7});
 // Collar de la Annunziata, enlazado al blasón.
 for(let i=0;i<13;i++){
  let a=.15+i/12*Math.PI*.90;let x=Math.cos(a)*114,y=Math.sin(a)*121+12;
  dot(ctx,x,y,7,p);
 }
 star(ctx,0,166,19,p);
 if(o.star!==false)star(ctx,0,-241,16,p);
 if(o.value){text(ctx,'L',-214,5,44,p);text(ctx,String(o.value),214,5,44,p);}
 if(o.mint)text(ctx,o.mint,0,221,27,p,{pitch:.60});
}
function v634ItalyFive(ctx,p,s){
 if(s.rev){
  v634SavoyShield(ctx,p,{wreath:true,value:5,mint:s.mint||'M BN'});
  LTOP(ctx,"REGNO D'ITALIA",p,{size:31,span:2.22});
 }else{
  const cfg=s.umberto?{hair:'short',moustache:'up',nose:1.12,chin:1.10}:RULERS.victorEmmanuel;
  bust(ctx,p,cfg,{s:1.38});
  LTOP(ctx,s.umberto?"UMBERTO I RE D'ITALIA":'VITTORIO EMANUELE II',p,{size:27,span:2.92});
  text(ctx,'FERRARIS',0,223,20,p);
  LBOT(ctx,s.umberto?'1879':'1873',p,{size:32,span:.76});
 }
}
function v634ItalyLira1863(ctx,p,rev){
 if(!rev){
  bust(ctx,p,RULERS.victorEmmanuel,{s:1.37});
  LTOP(ctx,'VITTORIO EMANUELE II',p,{size:29,span:2.81});
  text(ctx,'FERRARIS',0,223,19,p);
  LBOT(ctx,'1863',p,{size:33,span:.71});
 }else{
  wreath(ctx,p,{r:236,leaf:'laurel'});
  text(ctx,'1 LIRA',0,-25,54,p,{pitch:.72});
  text(ctx,'M BN',0,213,30,p,{pitch:.70});
  LTOP(ctx,"REGNO D'ITALIA",p,{size:31,span:2.12});
 }
}
function v634RussiaEagle(ctx,p,denom,year){
 eagleDouble(ctx,p,{s:1.48});royalCrown(ctx,0,-189,.43,p);
 // Escusón central: San Jorge venciendo al dragón, reducido al lenguaje minimalista.
 emboss(ctx,c=>smooth(c,[[-62,-69],[62,-69],[58,29],[0,72],[-58,29]]),p,{off:2.0});
 ctx.save();ctx.translate(-6,3);ctx.scale(.34,.34);
 stGeorge(ctx,p,{s:.85});ctx.restore();
 for(const sg of [-1,1]){
  for(let i=0;i<4;i++){
   const x=sg*(70+i*15),y=-67+i*24;
   emboss(ctx,c=>ell(c,x,y,12,8),p,{off:1.0});
  }
 }
 text(ctx,denom,0,229,41,p,{pitch:.73});
 LBOT(ctx,year+' Г.',p,{size:34,span:.85});
}
function v634Nicholas(ctx,p,rev,s){
 if(!rev){
  bust(ctx,p,{hair:'short',beard:'short',moustache:true,nose:1.04,mirror:true},{s:1.39});
  LTOP(ctx,'Б М НИКОЛАЙ II ИМПЕРАТОРЪ',p,{size:27,span:3.00});
  LBOT(ctx,'И САМОДЕРЖЕЦЪ ВСЕРОСС',p,{size:27,span:2.05});
 }else v634RussiaEagle(ctx,p,s.gold?'5 РУБЛЕЙ':'РУБЛЬ',s.gold?'1899':'1897');
}
function v634Swiss5(ctx,p,rev){
 if(!rev){
  bust(ctx,p,{...RULERS.helvetia,laurel:true,mirror:true},{s:1.38});
  LTOP(ctx,'CONFOEDERATIO HELVETICA',p,{size:29,span:2.91});
  text(ctx,'B',0,227,23,p);
 }else{
  wreath(ctx,p,{r:242,leaf:'laurel'});
  swissShield(ctx,p,{s:1.53});
  star(ctx,0,-232,20,p);
  text(ctx,'5',-186,-12,47,p);text(ctx,'F',186,-12,47,p);
  text(ctx,'1907',0,225,35,p,{pitch:.65});
  text(ctx,'B',0,263,20,p);
 }
}
function v634HelvetiaSeated(ctx,p){
 // 1860: alegoría sentada, ante los Alpes, no la Helvetia erguida posterior a 1874.
 ctx.save();ctx.translate(0,38);ctx.scale(1.74,1.74);
 rline(ctx,[[-104,43],[-77,8],[-58,33],[-31,-8],[-5,36],[27,3],[52,34],[76,5],[104,41]],p,2.8);
 emboss(ctx,c=>smooth(c,[[-56,48],[41,48],[74,73],[24,82],[-81,81]]),p,{off:2.3});
 // túnica, tronco, piernas, cabeza, pelo y brazo levantado.
 emboss(ctx,c=>smooth(c,[[-18,46],[-30,8],[-17,-41],[15,-58],[40,-28],[43,4],[21,35],[83,54],[85,67],[-24,66]]),p,{off:2.7});
 emboss(ctx,c=>ell(c,15,-73,16,20,-.1),p,{off:2.2});
 emboss(ctx,c=>ell(c,4,-84,10,12),p,{off:1.5});
 rline(ctx,[[5,-30],[-23,-56],[-40,-98]],p,8);dot(ctx,-40,-100,6,p);
 rline(ctx,[[29,-28],[61,-10],[70,30]],p,9);
 swissShield(ctx,p,{x:73,y:37,s:.63});
 for(let i=0;i<5;i++)iline(ctx,[[-13+i*12,12],[-28+i*18,57]],p,1.9);
 ctx.restore();
 LTOP(ctx,'HELVETIA',p,{size:35,span:1.20});
}
function v634Swiss2(ctx,p,rev){
 if(!rev){v634HelvetiaSeated(ctx,p);}
 else{
  wreath(ctx,p,{r:253,leaf:'laurel'});
  text(ctx,'2 Fr.',0,-67,61,p,{pitch:.74});text(ctx,'1860',0,111,53,p,{pitch:.67});
  text(ctx,'B',0,236,25,p);
 }
}

/* V6.35 · Lote final de 19 tipos contrastados. Cada composición es vectorial,
   didáctica y estilizada: ningún contorno se presenta como calco de un cuño. */
function v635Label(ctx,p,up='',low='',size=27){
 if(up)LTOP(ctx,up,p,{size,span:Math.min(3.15,.065*Array.from(up).length+1)});
 if(low)LBOT(ctx,low,p,{size:Math.min(33,size+3),span:Math.min(2.35,.105*Array.from(low).length+.3)});
}
function v635Year(ctx,p,yr,y=244){text(ctx,String(yr),0,y,36,p,{pitch:.66});}
function v635Vines(ctx,p,scale=1){ctx.save();ctx.scale(scale,scale);wreath(ctx,p,{r:240,leaf:'oak'});ctx.restore();}
function v635RoyalShield(ctx,p,scale=1,kind='lilies'){
 ctx.save();ctx.scale(scale,scale);
 crownedCoat(ctx,p,{s:1.15,quarters:kind==='portugal'?'quinas':kind==='sweden'?'crowns':undefined});
 ctx.restore();
}
function v635WingsDove(ctx,p,x,y,s=.7){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 emboss(ctx,c=>smooth(c,[[-10,-2],[-77,-48],[-41,-44],[-3,-20],[37,-56],[73,-54],[22,-7],[0,15]]),p,{off:2});
 emboss(ctx,c=>ell(c,8,0,24,15,-.2),p,{off:1.5});
 emboss(ctx,c=>circle(c,31,-7,9),p,{off:1.2});emboss(ctx,c=>poly(c,[[38,-9],[53,-2],[38,0]]),p,{off:1});
 rline(ctx,[[12,9],[36,27]],p,2.2);ctx.restore();
}
function v635Sun(ctx,p,s=1){
 ctx.save();ctx.scale(s,s);
 for(let i=0;i<52;i++){const a=i*TAU/52,rr=i%2?175:184;
  rline(ctx,[[Math.cos(a)*76,Math.sin(a)*76],[Math.cos(a)*rr,Math.sin(a)*rr]],p,i%2?2.1:3.1);}
 emboss(ctx,c=>circle(c,0,0,78),p,{off:2.8});
 ctx.restore();
}
function v635Floral(ctx,p,r=233){
 for(const sign of [-1,1]){
  for(let i=0;i<11;i++){
   const a=.18+(i/11)*2.82,x=sign*Math.sin(a)*r,y=Math.cos(a)*r;
   emboss(ctx,c=>ell(c,x,y,11,24,sign*.4+a*sign*.4),p,{off:1.2,blur:.5});
   if(i%3===0){dot(ctx,x+sign*13,y-14,7,p);}
  }
 }
 rline(ctx,[[-18,229],[0,245],[18,229]],p,2.8);
}
function v635EaglePerched(ctx,p,s=1){
 ctx.save();ctx.scale(s,s);
 emboss(ctx,c=>smooth(c,[[0,-104],[-34,-91],[-53,-54],[-52,18],[-28,69],[20,70],[51,26],[52,-51],[27,-86]]),p,{off:3});
 emboss(ctx,c=>smooth(c,[[-5,-109],[3,-149],[25,-158],[40,-135],[35,-116],[13,-103]]),p,{off:1.9});
 emboss(ctx,c=>poly(c,[[36,-143],[59,-136],[40,-125],[34,-132]]),p,{off:1.2});dot(ctx,22,-139,3,p);
 for(let i=0;i<7;i++)rline(ctx,[[-39+i*12,-69],[-36+i*12,17],[-25+i*10,61]],p,2);
 for(let i=-2;i<=2;i++)rline(ctx,[[i*6,51],[i*10,112]],p,2.6);
 for(const x of [-25,25])rline(ctx,[[x,66],[x,89],[x-10,102]],p,3.5);
 ctx.restore();
}
function v635ShieldRound(ctx,p,x=0,y=0,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 emboss(ctx,c=>smooth(c,[[-54,-75],[54,-75],[53,30],[34,65],[0,88],[-35,65],[-53,30]]),p,{off:2.3});
 iline(ctx,[[-54,-13],[54,-13]],p,2.2);
 ctx.restore();
}
function v635Zeus(ctx,p){
 ctx.save();ctx.translate(0,28);ctx.scale(1.42,1.42);
 rline(ctx,[[45,-93],[77,-93],[77,81],[16,81]],p,8);rline(ctx,[[40,80],[40,120]],p,8);
 emboss(ctx,c=>ell(c,7,-110,21,23),p,{off:2.1});
 emboss(ctx,c=>smooth(c,[[-19,-89],[27,-88],[47,-13],[26,71],[-52,67],[-43,-19]]),p,{off:3.2});
 emboss(ctx,c=>smooth(c,[[-40,15],[11,13],[24,55],[65,76],[46,94],[-42,76]]),p,{off:2.2});
 rline(ctx,[[23,-60],[58,-42],[87,-47]],p,7); // brazo con águila
 emboss(ctx,c=>ell(c,93,-57,16,10),p,{off:1.5});
 for(let i=0;i<4;i++)rline(ctx,[[92,-50],[89+i*5,-37]],p,2);
 rline(ctx,[[-25,-65],[-55,-32],[-69,-18]],p,7);
 rline(ctx,[[-70,135],[-70,-156]],p,4.4);dot(ctx,-70,-156,7,p);
 for(const x of [-10,25])rline(ctx,[[x,67],[x+31,118]],p,8);
 ctx.restore();
}
function v635Roma(ctx,p){
 ctx.save();ctx.translate(0,24);ctx.scale(1.55,1.55);
 emboss(ctx,c=>smooth(c,[[-58,60],[54,58],[64,95],[-78,98]]),p,{off:2.1});
 emboss(ctx,c=>smooth(c,[[-27,-90],[26,-86],[45,-35],[29,38],[-34,49],[-59,-12]]),p,{off:3});
 emboss(ctx,c=>ell(c,0,-113,23,22),p,{off:1.9});
 emboss(ctx,c=>poly(c,[[-28,-125],[-8,-148],[23,-139],[30,-124]]),p,{off:2});
 rline(ctx,[[-15,-100],[-51,-40],[-75,-18]],p,7);
 rline(ctx,[[32,-65],[62,-80],[83,-107]],p,7);
 // Victoria pequeña sostenida por Roma.
 dot(ctx,79,-130,9,p);rline(ctx,[[79,-119],[81,-96]],p,3);rline(ctx,[[77,-116],[67,-109]],p,2);
 for(const x of [-20,12])rline(ctx,[[x,32],[x+22,96]],p,8);
 // escudos y armas del campo.
 for(const [x,y] of [[-91,68],[95,75]]){emboss(ctx,c=>ell(c,x,y,21,30),p,{off:1.4});iline(ctx,[[x,y-22],[x,y+22]],p,1.5);}
 rline(ctx,[[115,89],[128,-128]],p,2.8);
 ctx.restore();
}
function v635Face(ctx,p,k){
 const rev=k.endsWith('_rev');
 const l=(x,y,z,sz=28)=>text(ctx,z,x,y,sz,p,{pitch:.61});
 switch(k){
 case 'v635_helvetia_obv':v634HelvetiaSeated(ctx,p);l(0,240,'KORN',16);break;
 case 'v635_helvetia_rev':wreath(ctx,p,{r:253,leaf:'laurel'});l(0,-60,'1 Fr.',61);l(0,105,'1861',53);l(0,230,'B',24);break;
 case 'v635_bel5_obv':bust(ctx,p,{hair:'short',beard:'long',moustache:true,mirror:true},{s:1.36});v635Label(ctx,p,'LEOPOLD II ROI DES BELGES','',28);l(0,236,'LEOP WIENER',16);break;
 case 'v635_bel20_obv':bust(ctx,p,{hair:'short',beard:'long',moustache:true},{s:1.36});v635Label(ctx,p,'LEOPOLD II ROI DES BELGES','',28);l(0,231,'L WIENER',17);break;
 case 'v635_bel5_rev':case 'v635_bel20_rev':{
  const gold=k==='v635_bel20_rev',n=gold?'20':'5';
  wreath(ctx,p,{r:262,leaf:'laurel'});lionShield(ctx,p,{s:1.18,crown:true});
  v635Label(ctx,p,'L’UNION FAIT LA FORCE',gold?'':'1870',28);
  l(-216,42,n,42);l(219,42,'F',42);if(gold)l(0,211,'1875',34);
  break;}
 case 'v635_dutch_obv':bust(ctx,p,{hair:'short',beard:'full',moustache:true},{s:1.45});v635Label(ctx,p,'WILLEM III KONING DER NED','G H V L',25);break;
 case 'v635_dutch_rev':wreath(ctx,p,{r:260,leaf:'oak'});v635RoyalShield(ctx,p,.96);v635Label(ctx,p,'MUNT VAN HET KONINGRYK DER NEDERLANDEN','',22);l(0,-250,'1870',30);l(-188,35,'2½',48);l(195,35,'G',46);break;
 case 'v635_danish_obv':bust(ctx,p,{hair:'short',moustache:true,armor:true},{s:1.4});v635Label(ctx,p,'CHRISTIAN IX KONGE AF DANMARK','15 NOVBR 1863 · 1903',25);break;
 case 'v635_danish_rev':seatedLiberty(ctx,p,{s:1.68});v635WingsDove(ctx,p,-128,-142,.7);rline(ctx,[[-122,110],[-87,44]],p,7);for(let i=0;i<4;i++)rline(ctx,[[-118+i*15,84],[-136+i*14,31]],p,2);
  ctx.save();ctx.translate(120,80);ctx.scale(.76,.76);v635RoyalShield(ctx,p,.85);ctx.restore();v635Label(ctx,p,'MED GVD FOR ÆRE OG RET','2 KR',27);break;
 case 'v635_swedish_obv':bust(ctx,p,{hair:'short',beard:'full',moustache:true,crown:'small',armor:true,mirror:true},{s:1.39});v635Label(ctx,p,'OSCAR II SVERIGES NORGES G O V KONUNG','',23);l(0,245,'A · L',20);break;
 case 'v635_swedish_rev':v635RoyalShield(ctx,p,1,'sweden');for(const sign of [-1,1]){ctx.save();ctx.translate(sign*165,70);ctx.scale(.60,.69);lion(ctx,0,0,1.0,p,sign===1);ctx.restore();}v635Label(ctx,p,'MINNE AF TJUGUFEMÅRIG REGERING','1872 · 1897',24);l(0,171,'TVÅ KR',30);break;
 case 'v635_norway_obv':bust(ctx,p,{hair:'short',beard:'full',moustache:true,mirror:true},{s:1.44});v635Label(ctx,p,'OSCAR II NORGES O. SVER. KONGE','BRODERFOLKENES VEL',25);break;
 case 'v635_norway_rev':wreath(ctx,p,{r:255,leaf:'oak'});lionShield(ctx,p,{s:1.30,crown:true});v635Label(ctx,p,'2 KRONER','1900',31);break;
 case 'v635_pt500_obv':case 'v635_pt1000_obv':{const yr=k.includes('1000')?'1899':'1892';carlosPortugal(ctx,p);v635Label(ctx,p,'CARLOS I REI DE PORTUGAL',yr,28);break;}
 case 'v635_pt500_rev':wreath(ctx,p,{r:252,leaf:'laurel'});v635RoyalShield(ctx,p,1,'portugal');l(0,211,'500 REIS',31);break;
 case 'v635_pt1000_rev':{
  // Manto diferenciado del tipo menor, con cinco quinas portuguesas.
  emboss(ctx,c=>smooth(c,[[-218,-72],[-160,-191],[0,-164],[159,-192],[216,-72],[158,201],[-155,200]]),p,{off:2.7});
  v635RoyalShield(ctx,p,1.1,'portugal');l(0,223,'1000 REIS',33);break;}
 case 'v635_brazil_obv':v635Label(ctx,p,'PETRUS II D G CONST IMP ET PERP BRAS DEF','',23);l(0,-75,'2000',108);l(0,40,'RÉIS',42);l(0,148,'1857',55);break;
 case 'v635_brazil_rev':v635RoyalShield(ctx,p,1,'sphere');v635Label(ctx,p,'IN HOC SIGNO VINCES','',30);break;
 case 'v635_chile_obv':{
  v635ShieldRound(ctx,p,0,12,1.3);
  ctx.save();ctx.translate(-164,60);condor(ctx,p,{s:.43});ctx.restore();
  ctx.save();ctx.translate(158,65);ctx.scale(.8,.8);
  emboss(ctx,c=>smooth(c,[[-58,24],[-31,-28],[25,-34],[56,11],[41,55],[-41,55]]),p,{off:2});
  rline(ctx,[[23,-28],[39,-85],[52,-110]],p,5);rline(ctx,[[30,-80],[10,-110]],p,4);
  for(const x of [-30,-2,26,45])rline(ctx,[[x,49],[x-8,92]],p,5);ctx.restore();
  v635Label(ctx,p,'REPUBLICA DE CHILE','1840',31);break;}
 case 'v635_chile_rev':{
  ctx.save();ctx.translate(65,25);ctx.scale(1.1,1.1);standingLiberty(ctx,p,{s:1.5});ctx.restore();
  emboss(ctx,c=>poly(c,[[-215,110],[-100,110],[-111,-142],[-198,-142]]),p,{off:3});
  l(-154,-30,'CONSTI',18);l(-154,-6,'TUCION',18);
  v635Label(ctx,p,'IGUALDAD ANTE LA LEI','8 E · 21 Qs',30);break;}
 case 'v635_morgan_obv':{
  bust(ctx,p,{female:true,mirror:true,hair:'bun',laurel:true},{s:1.39});
  v635Label(ctx,p,'E PLURIBUS UNUM','1881',32);
  for(let i=0;i<13;i++){const a=.16+(i/12)*Math.PI*1.02;const x=Math.cos(a)*258,y=165*Math.sin(a)+35;star(ctx,x,y,8,p);}
  break;}
 case 'v635_morgan_rev':wreath(ctx,p,{r:244,leaf:'olive'});eagleUS(ctx,p,{s:1.48});v635Label(ctx,p,'UNITED STATES OF AMERICA','ONE DOLLAR',29);l(0,136,'IN GOD WE TRUST',20);break;
 case 'v635_washington_obv':bust(ctx,p,{hair:'wig',mirror:true,nose:1.08,chin:1.08},{s:1.40});v635Label(ctx,p,'LIBERTY','1936',39);l(-170,98,'IN GOD',20);l(-170,129,'WE TRUST',20);break;
 case 'v635_washington_rev':{
  eagleUS(ctx,p,{s:1.72});
  for(const sg of [-1,1]){rline(ctx,[[sg*15,153],[sg*133,174]],p,4);for(let i=0;i<4;i++)rline(ctx,[[sg*(64+i*19),166+i*1.6],[sg*(74+i*19),147]],p,2);}
  v635Label(ctx,p,'UNITED STATES OF AMERICA','QUARTER DOLLAR',28);l(0,-213,'E PLURIBUS UNUM',18);break;}
 case 'v635_taisho_obv':{
  v635Sun(ctx,p,.98);v635Label(ctx,p,'大日本 · 大正六年','50 SEN',31);
  for(let sgn of [-1,1])for(let i=0;i<4;i++){
   const x=sgn*(135+i*24),y=150+(i%2)*12;
   for(let a=0;a<5;a++){ctx.save();ctx.translate(x,y);ctx.rotate(a*TAU/5);emboss(ctx,c=>ell(c,0,-9,4.3,8),p,{off:.8});ctx.restore();}
   dot(ctx,x,y,2.7,p);
  }
  break;}

 case 'v635_taisho_rev':{
  ctx.save();ctx.translate(0,-160);chrysanthemum(ctx,p,{s:.83});ctx.restore();
  v635Floral(ctx,p,239);l(0,-14,'五十',87);l(0,85,'銭',79);
  // Guirnaldas botánicas: capullos y nervaduras en rosetas simétricas.
  for(let side of [-1,1])for(let i=0;i<10;i++){
   const a=.25+i*.25,xx=side*Math.sin(a)*239,yy=Math.cos(a)*239;
   ctx.save();ctx.translate(xx,yy);ctx.rotate(side*a);
   emboss(ctx,c=>ell(c,0,-13,7,15),p,{off:1.1});
   iline(ctx,[[0,-2],[0,-20]],p,.7);ctx.restore();
  }
  break;}

 case 'v635_rupee_obv':bust(ctx,p,{female:true,mirror:true,hair:'bun',crown:'small',veil:true},{s:1.50});v635Label(ctx,p,'VICTORIA QUEEN','',38);break;
 case 'v635_rupee_rev':v635Floral(ctx,p,261);l(0,-86,'ONE',44);l(0,-19,'RUPEE',54);l(0,62,'INDIA',44);l(0,140,'1862',47);break;
 case 'v635_alex_obv':{
  // Heracles con piel leonina: mandíbula superior, orejas y garras del pellejo.
  bust(ctx,p,{hair:'helmet',nose:1.07,chin:1.05,beard:false},{s:1.62});
  emboss(ctx,c=>smooth(c,[[-134,-156],[-84,-197],[-23,-212],[45,-193],[70,-162],[26,-158],[-35,-171],[-88,-144]]),p,{off:2.2});
  for(const sg of [-1,1]){const x=sg*93;
    emboss(ctx,c=>poly(c,[[x,-178],[x+sg*24,-207],[x+sg*17,-164]]),p,{off:1.25});
  }
  rline(ctx,[[-122,-141],[-142,-100],[-151,-66],[-128,-37]],p,6);
  for(let k=0;k<9;k++){
    const x=-87+k*16,y=-164+Math.sin(k*.8)*13;
    dot(ctx,x,y,3.1,p);
  }
  for(let k=0;k<7;k++){
    const x=-143+k*7,y=-33+k*8;
    rline(ctx,[[x,y],[x-7,y+15],[x-2,y+20]],p,2.1);
  }
  break;
 }
 case 'v635_alex_rev':v635Zeus(ctx,p);v635Label(ctx,p,'ΑΛΕΞΑΝΔΡΟΥ','',32);break;
 case 'v635_ptol_obv':bust(ctx,p,{hair:'curly',diadem:true,beard:false},{s:1.59});l(-185,88,'Δ',37);break;
 case 'v635_ptol_rev':{
  // Águila ptolemaica con rayo de Zeus; mantener leyenda sin duplicaciones.
  v635EaglePerched(ctx,p,1.46);
  emboss(ctx,c=>poly(c,[[-113,158],[-72,148],[-24,160],[23,144],[76,158],[120,151],[87,166],[38,171],[-18,164],[-65,175]]),p,{off:1.7});
  rline(ctx,[[-117,178],[-77,162],[-29,174],[26,156],[75,171],[117,166]],p,3.0);
  v635Label(ctx,p,'ΠΤΟΛΕΜΑΙΟΥ ΒΑΣΙΛΕΩΣ','',28);
  break;
 }
 case 'v635_augustus_obv':bust(ctx,p,{hair:'short',laurel:false},{s:1.62});v635Label(ctx,p,'CAESAR AVGVSTVS','',31);break;
 case 'v635_augustus_rev':v635Vines(ctx,p);v635ShieldRound(ctx,p,0,-8,1.1);l(0,-60,'S P Q R',37);l(0,18,'CL V',60);break;
 case 'v635_nero_obv':bust(ctx,p,{hair:'short',laurel:true,chin:1.3,neck:1.2},{s:1.55});v635Label(ctx,p,'NERO CLAVD CAESAR AVG GER P M TR P IMP P P','',24);break;
 case 'v635_nero_rev':v635Roma(ctx,p);v635Label(ctx,p,'ROMA','S · C',34);break;
 }
}

/* ================= INTÉRPRETE DE DISEÑOS (monedas nuevas) ================= */
function renderSpec(ctx,p,s,o={}){
 if(!s)return;
 const k=s.kind;
 const top=(t,sz,span)=>{if(t)LTOP(ctx,t,p,{size:sz??28,span:span??2.7,r:s.lr});};
 const bot=(t,sz,span)=>{if(t)LBOT(ctx,t,p,{size:sz??28,span:span??s.dspan,r:s.lr});};
 const eag=(v,sc)=>{const f={us:eagleUS,plain:eagleUS,fly:eagleFly,pr:eaglePrussian,double:eagleDouble,mx:eagleMexican,condor:condor}[v]||eagleUS;f(ctx,p,{s:sc??1.5,stars:v==='us'?13:0,banner:v==='us'?'E PLURIBUS UNUM':undefined,shield:v==='condor'});};
 if(k==='v635_helvetia_obv'||k==='v635_helvetia_rev'||k==='v635_bel5_obv'||k==='v635_bel5_rev'||k==='v635_bel20_obv'||k==='v635_bel20_rev'||k==='v635_dutch_obv'||k==='v635_dutch_rev'||k==='v635_danish_obv'||k==='v635_danish_rev'||k==='v635_swedish_obv'||k==='v635_swedish_rev'||k==='v635_norway_obv'||k==='v635_norway_rev'||k==='v635_pt500_obv'||k==='v635_pt500_rev'||k==='v635_pt1000_obv'||k==='v635_pt1000_rev'||k==='v635_brazil_obv'||k==='v635_brazil_rev'||k==='v635_chile_obv'||k==='v635_chile_rev'||k==='v635_morgan_obv'||k==='v635_morgan_rev'||k==='v635_washington_obv'||k==='v635_washington_rev'||k==='v635_taisho_obv'||k==='v635_taisho_rev'||k==='v635_rupee_obv'||k==='v635_rupee_rev'||k==='v635_alex_obv'||k==='v635_alex_rev'||k==='v635_ptol_obv'||k==='v635_ptol_rev'||k==='v635_augustus_obv'||k==='v635_augustus_rev'||k==='v635_nero_obv'||k==='v635_nero_rev') {v635Face(ctx,p,k);
 } else if(k==='prussia1900_obv'||k==='prussia1900_rev'){v634Prussia1900(ctx,p,k==='prussia1900_rev');
 } else if(k==='austria1915_obv'||k==='austria1915_rev'){v634Ducat1915(ctx,p,k==='austria1915_rev');
 } else if(k==='krone1908_obv'||k==='krone1908_rev'){v634Krone1908(ctx,p,k==='krone1908_rev');
 } else if(k==='italy5_ve_obv'||k==='italy5_ve_rev'||k==='italy5_umberto_obv'||k==='italy5_umberto_rev'){
  v634ItalyFive(ctx,p,{rev:k.endsWith('_rev'),umberto:k.includes('umberto'),mint:k.includes('umberto')?'R':'M BN'});
 } else if(k==='italy1_1863_obv'||k==='italy1_1863_rev'){v634ItalyLira1863(ctx,p,k.endsWith('_rev'));
 } else if(k==='nicholas1r_obv'||k==='nicholas1r_rev'||k==='nicholas5r_obv'||k==='nicholas5r_rev'){
  v634Nicholas(ctx,p,k.endsWith('_rev'),{gold:k.includes('5r')});
 } else if(k==='swiss5_1907_obv'||k==='swiss5_1907_rev'){v634Swiss5(ctx,p,k.endsWith('_rev'));
 } else if(k==='swiss2_1860_obv'||k==='swiss2_1860_rev'){v634Swiss2(ctx,p,k.endsWith('_rev'));
 } else if(k==='prussian_1913_obv'){
  bust(ctx,p,Object.assign({},RULERS.guillermo2,{armor:true}),{s:1.43});
  LTOP(ctx,'WILHELM II DEUTSCHER KAISER KÖNIG VON PREUSSEN',p,{size:23,span:3.04});
  LBOT(ctx,'1888 1913 A',p,{size:27,span:1.24});
 } else if(k==='prussian_1913_rev'){
  eaglePrussian(ctx,p,{s:1.54});royalCrown(ctx,0,-189,.62,p);
  LTOP(ctx,'DEUTSCHES REICH 1913',p,{size:29,span:2.5});
  LBOT(ctx,'DREI MARK',p,{size:31,span:1.24});
 } else if(k==='scottish_shilling'){scottishShilling1940(ctx,p);
 } else if(k==='sixpence_lion'){georgianSixpence(ctx,p,s);
 } else if(k==='france_wreath_date'){franceWreathDate(ctx,p,s);
 } else if(k==='napoleon3_mantle_1867'){napoleonicMantle1867(ctx,p);
 } else if(k==='ceres_1851'){ceresBust1851(ctx,p);
 } else if(k==='semeuse_bouquet'){semeuseBouquet1960(ctx,p,s);
 } else if(k==='prussian_thaler_1830'){prussianThaler1830(ctx,p,s);
 } else if(k==='saxony_thaler_1854'){saxonyThaler1854(ctx,p);
 } else if(k==='florin_godless_obv'){
  bust(ctx,p,{hair:'bun',crown:'small',mirror:true,female:true,veil:false,nose:.95,chin:.93}, {s:1.5});
  LTOP(ctx,'VICTORIA REGINA 1849',p,{span:2.47,size:29});text(ctx,'WW',-189,-9,20,p);
 } else if(k==='florin_godless_rev'){
  florinCross1849(ctx,p);LTOP(ctx,'ONE FLORIN',p,{span:1.6,size:29});
  LBOT(ctx,'ONE TENTH OF A POUND',p,{span:2.28,size:25});
 } else if(k==='penny_victoria_obv'){
  bust(ctx,p,{hair:'bun',laurel:true,mirror:true,female:true,nose:.96,chin:.95},{s:1.48});
  LTOP(ctx,'VICTORIA D G BRITT REG F D',p,{span:2.95,size:27});
 } else if(k==='britannia_1860'){
  britanniaPenny1860(ctx,p);LTOP(ctx,'ONE PENNY',p,{span:1.65,size:33});
  text(ctx,'1860',0,256,36,p);
 } else if(k==='franco44_shield'){franco44Shield(ctx,p);
 } else if(k==='jc_lentil_obv'){jcLentilObv(ctx,p,s);
 } else if(k==='jc_lentil_rev'){jcLentilRev(ctx,p,s);
 } else if(k==='cuenca_castle'||k==='cuenca_lion'){cuencaVellon(ctx,p,k==='cuenca_lion');top(s.legend,s.ls??24,s.lspan??2.75);
 } else if(k==='provisional_lion'){
  provisionalLionShield(ctx,p,s);top(s.legend,s.ls??25,s.lspan??2.95);bot(s.value,s.ds??29,s.dspan??1.2);
  if(s.maker)text(ctx,s.maker,0,217,19,p);
 } else if(k==='spanish_mantle'){
  alfonsoGoldMantle(ctx,p,s);top(s.legend,s.ls??29,s.lspan??2.1);bot(s.value,s.ds??29,s.dspan??1.28);
  if(s.marks){if(s.marks.left)text(ctx,s.marks.left,-218,171,23,p);if(s.marks.right)text(ctx,s.marks.right,218,171,23,p);}
 } else if(k==='isabel_arms'){renderIsabelArms(ctx,p,s);
 } else if(k==='provisional_arms'){renderProvisionalArms(ctx,p,s);
 } else if(k==='yuan_1914_wheat'){yuanWheat1914(ctx,p);
 } else if(k==='bolivia_tree_llamas'){boliviaTreeLlamas(ctx,p,s);
 } else if(k==='peru_arms'){peruArms1872(ctx,p,s);
 } else if(k==='peru_liberty'){peruLiberty1872(ctx,p,s);
 } else if(k==='chile_plumed_arms'){chilePlumed1883(ctx,p,s);
 } else if(k==='chile_condor'){chileCondor1883(ctx,p,s);
 } else if(k==='roman_radiate'){romanRadiate240(ctx,p,s);
 } else if(k==='roman_concordia'){romanConcordia240(ctx,p,s);
 } else if(k==='cap_rays'){
  capRaysMex(ctx,p,s);
 } else if(k==='saint_eagle'){
  saintGaudensFly(ctx,p);top(s.legend,s.ls??28,s.lspan??2.8);bot(s.value||'TWENTY DOLLARS',s.ds??30,1.45);
 } else if(k==='soviet_arms'){
  soviet1923(ctx,p);
 } else if(k==='sower_1923'){
  sowerChervonets(ctx,p,s);
 } else if(k==='argentina_arms'){
  argentina1881(ctx,p);top(s.legend,s.ls??32,s.lspan??2.2);bot(s.date,s.ds??32,1.0);
 } else if(k==='mercury_head'){
  mercuryWinged(ctx,p);
 } else if(k==='wheat_1909'){
  wheatLincoln(ctx,p);
 } else if(k==='mercury_fasces'){
  mercuryFasces(ctx,p);
 } else if(k==='franco49'){
  franco1949Reverse(ctx,p);
 } else if(k==='jc1989'){
  joanCarlosFive(ctx,p);
 } else if(k==='sails1989'){
  sailsFive(ctx,p);
 } else if(k==='coin1927_a'||k==='coin1927_b'){
  coin1927Face(ctx,p,k==='coin1927_b');
 } else if(k==='peace_liberty'){
  peaceLiberty(ctx,p);top(s.legend,s.ls??38,s.lspan??1.1);
  text(ctx,'IN GOD',-225,96,27,p,{pitch:.62});text(ctx,'WE TRVST',212,96,27,p,{pitch:.60});
  text(ctx,s.date||'1922',177,282,s.ds??35,p,{pitch:.65});
 } else if(k==='peace_eagle'){
  peaceEagle(ctx,p,{s:1.38});top(s.legend,s.ls??31,s.lspan??2.5);
  LTOP(ctx,s.legend2||'E PLURIBUS UNUM',p,{r:281,size:28,span:1.36});
  text(ctx,'ONE',-242,95,33,p,{pitch:.62});text(ctx,'DOLLAR',242,95,33,p,{pitch:.60});
 } else if(k==='walking_eagle'){
  walkingEagle(ctx,p);top(s.legend,s.ls??30,s.lspan??2.4);
  LTOP(ctx,s.legend2||'E PLURIBUS UNUM',p,{r:282,size:26,span:1.38});
  bot(s.value||'HALF DOLLAR',s.ds??30,1.5);
 } else if(k==='bust'||k==='head'){
  const cfg=Object.assign({},RULERS[s.ruler]||{},s.cfg||{});if(s.mirror)cfg.mirror=true;
  bust(ctx,p,cfg,{s:s.bs});top(s.legend,s.ls,s.lspan);bot(s.date||s.legend2,s.ds);
 } else if(k==='eagle'){
  ctx.save();ctx.translate(0,10);eag(s.eagle,s.es);ctx.restore();top(s.legend,s.ls);bot(s.date||s.value,s.ds);
 } else if(k==='hispania'){
  ctx.save();hispaniaSeated(ctx,p,{s:s.es,mirror:!!s.mirror,noCrown:!!s.noCrown});ctx.restore();top(s.legend,s.ls);bot(s.date||s.value,s.ds);
 } else if(k==='sower'){
  ctx.save();sower(ctx,p,{s:s.es,sun:s.sun});ctx.restore();top(s.legend,s.ls);bot(s.date||s.value,s.ds);
 } else if(k==='liberty'){
  ctx.save();standingLiberty(ctx,p,{s:s.es});ctx.restore();top(s.legend,s.ls);bot(s.date||s.value,s.ds);
 } else if(k==='sun'){
  ctx.save();sunFace(ctx,p,{s:s.es});ctx.restore();top(s.legend,s.ls);bot(s.date||s.value,s.ds);
 } else if(k==='arms'){
  ctx.save();crownedCoat(ctx,p,{s:s.es,cross:s.cross,stripes:s.stripes,esc:s.esc,quarters:s.quarters});ctx.restore();top(s.legend,s.ls);bot(s.date||s.value,s.ds);
 } else if(k==='shield'){
  const ss=s.ss??1.2;
  ctx.save();ctx.translate(0,10);
  if(s.pillars)pillars(ctx,p,{crowned:s.pc!==false,dx:s.pdx??176});
  spanishShield(ctx,0,10,ss,p,s.esc||'lilies',{collar:!!s.collar});
  if(s.crown!==false)royalCrown(ctx,0,10-110*ss-18,clamp(ss*.46,.5,.9),p);
  ctx.restore();
  top(s.legend,s.ls,s.lspan);bot(s.value||s.date,s.ds,s.vspan);
  if(s.marks){
   const m=s.marks;
   if(m.leftTop)text(ctx,m.leftTop,-220,55,30,p);
   if(m.leftBottom)text(ctx,m.leftBottom,-220,155,26,p);
   if(m.rightTop)text(ctx,m.rightTop,220,55,30,p);
   if(m.rightBottom)text(ctx,m.rightBottom,220,155,25,p);
  }else{if(s.mint)text(ctx,s.mint,-205,150,20,p);if(s.mint2)text(ctx,s.mint2,205,150,20,p);} 
 } else if(k==='coat'){
  ctx.save();crownedCoat(ctx,p,{s:s.es,cross:s.cross,stripes:s.stripes,esc:s.esc,quarters:s.quarters});ctx.restore();top(s.legend,s.ls);bot(s.value||s.date,s.ds);
 } else if(k==='lion'){
  ctx.save();lionShield(ctx,p,{s:s.es,crown:s.crown});ctx.restore();top(s.legend,s.ls);bot(s.value||s.date,s.ds);
 } else if(k==='wreath'){
  wreath(ctx,p,{r:s.wr??270,leaf:s.leaf||'laurel'});
  const lines=s.lines||[s.value];const n=lines.length;
  lines.forEach((t,i)=>{if(t)text(ctx,t,0,(i-(n-1)/2)*(s.lh??52)+(s.dy??0),s.vs??36,p,{pitch:s.pitch});});
  if(s.date)text(ctx,s.date,0,(n-(n-1)/2)*(s.lh??52)+(s.dy??0)+10,s.ds??26,p);
  top(s.legend,s.ls,s.lspan);bot(s.legend2,s.ds,s.l2span);
 } else if(k==='cross'){
  ctx.save();crossJerusalem(ctx,p,{s:s.es??1.4});ctx.restore();top(s.legend,s.ls);bot(s.date||s.value,s.ds);
 } else if(k==='swiss'){
  ctx.save();ctx.translate(0,-20);swissShield(ctx,p,{s:s.es??1.3});ctx.restore();wreath(ctx,p,{r:s.wr??280,leaf:s.leaf||'laurel'});
  if(s.value)text(ctx,s.value,0,150,s.vs??30,p);bot(s.date,s.ds);top(s.legend,s.ls);
 } else if(k==='dragon'){
  ctx.save();dragonJP(ctx,p,{s:s.es??1.6});ctx.restore();top(s.legend,s.ls,s.lspan);
 } else if(k==='owl'){
  ctx.save();ctx.translate(20,10);owl(ctx,p,{s:s.es??1.6});ctx.restore();if(s.value)text(ctx,s.value,-180,-60,36,p);
 } else if(k==='sanjuan'){
  sanJuanFace(ctx,p,{s:s.es??1,num:s.num,unit:s.unit,star:s.star});
  if(s.legend)top(s.legend,s.ls,s.lspan);if(s.value)bot(s.value,s.ds,s.dspan);
 } else if(k==='filigree'){
  pesetaOrnament(ctx,p,{s:s.es??1,num:s.num,unit:s.unit});
  if(s.legend)top(s.legend,s.ls,s.lspan);if(s.value)bot(s.value,s.ds,s.dspan);
 } else if(k==='castle'){
  ctx.save();castleCharge(ctx,p,{s:s.es??2.2,crown:!!s.crown});ctx.restore();top(s.legend,s.ls,s.lspan);bot(s.value||s.date,s.ds,s.dspan);
 } else if(k==='lioncharge'){
  ctx.save();lionCharge(ctx,p,{s:s.es??2.2,crown:!!s.crown});ctx.restore();top(s.legend,s.ls,s.lspan);bot(s.value||s.date,s.ds,s.dspan);
 } else if(k==='george'){
  ctx.save();stGeorge(ctx,p,{s:s.es??1.5});ctx.restore();top(s.legend,s.ls,s.lspan);bot(s.date||s.value,s.ds);
 } else if(k==='worlds'){
  ctx.save();twoWorlds(ctx,p,{s:s.es});ctx.restore();top(s.legend,s.ls,s.lspan);bot(s.value||s.date,s.ds,s.vspan);
  if(s.mint)text(ctx,s.mint,-215,120,22,p);if(s.mint2)text(ctx,s.mint2,215,120,22,p);
 } else if(k==='seated'){
  ctx.save();seatedLiberty(ctx,p,{s:s.es??1.6});ctx.restore();top(s.legend,s.ls,s.lspan);bot(s.date||s.value,s.ds);
 } else if(k==='mantle'){
  ctx.save();frenchMantle(ctx,p,{s:s.es??1.3});ctx.restore();top(s.legend,s.ls);bot(s.value||s.date,s.ds);
 } else if(k==='chrys'){
  ctx.save();ctx.translate(0,-140);chrysanthemum(ctx,p,{s:s.es??.9});ctx.restore();
  if(s.wreath!==false)wreath(ctx,p,{r:s.wr??250,leaf:s.leaf||'laurel'});
  const ln=s.lines||[s.value];ln.forEach((t,i)=>{if(t)text(ctx,t,0,(s.dy??30)+(i-(ln.length-1)/2)*(s.lh??52),s.vs??34,p,{pitch:s.pitch});});
  top(s.legend,s.ls,s.lspan);bot(s.date,s.ds);
 } else if(k==='walking_liberty_1943'){
  walkingLiberty1943(ctx,p);
  if(s.legend)top('LIBERTY',s.ls??37,s.lspan??1.50);
  text(ctx,'IN GOD WE TRUST',155,47,18,p,{pitch:.55});
  bot('1943',s.ds??34,.62);
 } else if(k==='angel'){
  ctx.save();angelVictory(ctx,p,{s:s.es??1.7});ctx.restore();top(s.legend,s.ls,s.lspan);bot(s.date||s.value,s.ds);
 } else if(k==='yoke'){
  ctx.save();yokeArrows(ctx,p,{s:s.es??1.4});ctx.restore();top(s.legend,s.ls);bot(s.date||s.value,s.ds);
 } else if(k==='hercules'){
  ctx.save();herculesGroup(ctx,p,{s:s.es??1.5});ctx.restore();top(s.legend,s.ls,s.lspan);bot(s.date||s.value,s.ds);
 } else if(k==='athena'){
  ctx.save();athenaHead(ctx,p,{s:s.es??1.1});ctx.restore();top(s.legend,s.ls);
 } else if(k==='value'){
  if(s.wreath)wreath(ctx,p,{r:s.wr??270,leaf:s.leaf||'laurel'});
  text(ctx,s.value||'',0,-10,s.vs??50,p);top(s.legend,s.ls);bot(s.date,s.ds);
 }
}

/* Águila de San Juan (Estado Español): explayada, nimbo, escudo sobre el pecho.
   Las alas se construyen pluma a pluma, no como una superficie lisa. */
/* ---- Águila de San Juan estilizada (5 pesetas 1957, tipo art déco) ----
   Cabeza a diestra con nimbo, ala derecha en banda barrida con acanaladuras y
   ala izquierda con borde interno en zigzag. El escudo va sobre el pecho. */
function eagleSanJuan(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??0);ctx.scale(o.s??1,o.s??1);
 // nimbo
 ctx.save();ctx.lineWidth=3.4;ctx.strokeStyle=p.light;ctx.globalAlpha=.55;circle(ctx,-167,-175,47);ctx.stroke();
 ctx.lineWidth=1.8;ctx.strokeStyle=p.deep;ctx.globalAlpha=.4;circle(ctx,-167,-175,52);ctx.stroke();ctx.restore();
 // ala izquierda: banda con borde interno en zigzag
 emboss(ctx,c2=>poly(c2,[[-70,-125],[-115,-52],[-160,22],[-205,95],[-227,81],[-209,-9],[-182,8],[-164,-82],[-137,-65],[-119,-155]]),p,{off:2.6,outer:true});
 for(let i=0;i<3;i++)icurve(ctx,[[-84-i*40,-104+i*62],[-116-i*40,-52+i*62],[-150-i*36,10+i*58]],p,2);
 // ala derecha: banda larga barrida
 emboss(ctx,c2=>poly(c2,curvePts([[-72,-142],[46,-126],[152,-38],[236,54]],6).concat(curvePts([[248,106],[150,22],[52,-38],[-46,-58]],6))),p,{off:2.6,outer:true});
 const P0=[-40,-100],P1=[240,90],nx=-.56,ny=.83;
 for(let k=1;k<=5;k++){const of=k*13-39;
  rline(ctx,[[P0[0]+.30*(P1[0]-P0[0])+nx*of,P0[1]+.30*(P1[1]-P0[1])+ny*of],
             [P0[0]+.97*(P1[0]-P0[0])+nx*of*.45,P0[1]+.97*(P1[1]-P0[1])+ny*of*.45]],p,2.4);}
 // cola bajo el pecho
 emboss(ctx,c2=>poly(c2,[[-44,140],[-16,214],[-2,176],[14,214],[44,140]]),p,{off:2.2,outer:true});
 for(let i=-1;i<=1;i++)rline(ctx,[[i*16,150],[i*15,196]],p,2);
 // cabeza y cuello
 emboss(ctx,c2=>{c2.beginPath();
  polyU(c2,[[-224,-203],[-176,-222],[-140,-196],[-112,-146],[-68,-80],[-106,-58],[-152,-130],[-196,-179]]);
  polyU(c2,[[-217,-192],[-194,-181],[-190,-192]]);},p,{off:2.6,outer:true});
 ctx.save();ctx.fillStyle=p.deep;ctx.globalAlpha=.8;circle(ctx,-180,-198,3.8);ctx.fill();ctx.restore();
 dot(ctx,-181,-199,1.8,p);
 iline(ctx,[[-216,-203],[-192,-194]],p,1.6);
 ctx.restore();
}
/* Reverso completo: águila + escudo coronado entre columnas, cintas UNA GRANDE
   LIBRE, valor grande, estrella con el año y yugo con flechas. */
function sanJuanFace(ctx,p,o={}){
 ctx.save();ctx.scale(o.s??1,o.s??1);
 eagleSanJuan(ctx,p,{s:1});
 // columnas y escudo sobre el pecho
 ctx.save();ctx.translate(10,40);ctx.scale(.62,.62);pillars(ctx,p,{crowned:false,dx:196});ctx.restore();
 ctx.save();ctx.translate(10,58);
 spanishShield(ctx,0,0,.72,p,'none');
 royalCrown(ctx,0,-95,.42,p);
 ctx.restore();
 // cintas diagonales
 const ribbon=(t,cx,cy,sz)=>{
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-.5);
  const w=t.length*sz*.62+22;
  emboss(ctx,c2=>poly(c2,[[-w/2,-17],[w/2,-19],[w/2+9,-4],[w/2,17],[-w/2,19],[-w/2-9,4]]),p,{off:2});
  text(ctx,t,0,0,sz,p,{pitch:.62});
  ctx.restore();
 };
 ribbon('UNA',-266,-24,26);ribbon('GRANDE',-236,-82,26);ribbon('LIBRE',-202,-140,26);
 // valor
 text(ctx,o.num||'5',118,-196,120,p,{pitch:.6});
 text(ctx,o.unit||'PTAS',214,-116,46,p,{pitch:.62});
 // estrella de seis puntas con el año
 ctx.save();ctx.translate(-238,112);
 emboss(ctx,c2=>{c2.beginPath();const st=[];
  for(let i=0;i<12;i++){const a=i/12*TAU-Math.PI/2,r=i%2?15:34;st.push([Math.cos(a)*r,Math.sin(a)*r]);}
  polyU(c2,st);},p,{off:2});
 text(ctx,o.star||'57',0,1,22,p,{pitch:.58});
 ctx.restore();
 // yugo y flechas
 ctx.save();ctx.translate(158,208);yokeArrows(ctx,p,{s:.46});ctx.restore();
 ctx.restore();
}
/* ---- 1 peseta 1944: orla de labor filigranada con los seis emblemas ---- */
function pesetaOrnament(ctx,p,o={}){
 ctx.save();ctx.scale(o.s??1,o.s??1);
 const R=202,lob=(cx,cy,r)=>{
  const pts=[];for(let i=0;i<=72;i++){const a=i/72*TAU,rr=r+Math.cos(a*6)*7;pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}
  rline(ctx,pts,p,7);
 };
 const scroll=(cx,cy,rot,sc)=>{
  ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.scale(sc,sc);
  for(const sg of [-1,1]){ctx.save();ctx.scale(sg,1);
   rline(ctx,curvePts([[0,28],[18,12],[28,-8],[19,-26],[4,-21],[3,-8],[13,-7]],6),p,5);ctx.restore();}
  rline(ctx,[[0,28],[0,-4]],p,5);
  ctx.restore();
 };
 const az=[-.62,.62,-1.57,1.57,-2.52,2.52];
 const at=a=>[Math.sin(a)*R,-Math.cos(a)*R];
 // filigrana entre cartelas
 scroll(0,-214,0,1.45);scroll(0,214,Math.PI,1.45);
 for(const a of [-1.095,1.095,-2.045,2.045]){const q=at(a);scroll(q[0],q[1],a,1.15);}
 // cartelas con los emblemas
 const kinds=['castle','lion','bars','chains','grana','yoke'];
 az.forEach((a,i)=>{const q=at(a);lob(q[0],q[1],64);
  ctx.save();ctx.translate(q[0],q[1]);
  const k=kinds[i];
  if(k==='castle')castle(ctx,0,2,.66,p);
  else if(k==='lion')lion(ctx,2,0,.58,p);
  else if(k==='bars'){for(let j=-3;j<=3;j++)rline(ctx,[[-44,j*12],[44,j*12]],p,5);}
  else if(k==='chains')navarraChains(ctx,0,0,86,96,p);
  else if(k==='grana')pomegranate(ctx,0,2,1.05,p);
  else yokeArrows(ctx,p,{s:.50});
  ctx.restore();});
 // valor central
 text(ctx,o.num||'1',0,-6,390,p,{pitch:.6});
 text(ctx,o.unit||'PESETA',0,18,74,p,{pitch:.58});
 ctx.restore();
}
/* Cargos sueltos del vellón: castillo y león sin cuartelar */
function castleCharge(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??10);ctx.scale(o.s??2.2,o.s??2.2);
 if(o.crown)royalCrown(ctx,0,-84,.5,p);
 castle(ctx,0,0,1,p);
 ctx.restore();
}
function lionCharge(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??10);ctx.scale(o.s??2.2,o.s??2.2);
 if(o.crown)royalCrown(ctx,0,-86,.5,p);
 lion(ctx,4,0,1,p);
 ctx.restore();
}

/* ---- Dos mundos coronados entre columnas (columnaria) ---- */
function twoWorlds(ctx,p,o={}){
 ctx.save();ctx.translate(o.x??0,o.y??10);ctx.scale(o.s??1.25,o.s??1.25);
 pillars(ctx,p,{crowned:true,dx:o.dx??157,latin:true});
 for(const sgn of [-1,1]){
  ctx.save();ctx.translate(sgn*56,16);
  const r=54;
  dot(ctx,0,0,r,p);
  ctx.save();circle(ctx,0,0,r);ctx.clip();
  // meridianos y paralelos
  for(const a of [.34,.7]){const pts=[];for(let i=0;i<=28;i++){const t=i/28*TAU;pts.push([a*r*Math.cos(t),r*Math.sin(t)]);}iline(ctx,pts,p,1.2);}
  iline(ctx,[[-r,0],[r,0]],p,1.5);
  for(const yy of [-27,27]){const hw=Math.sqrt(r*r-yy*yy);iline(ctx,[[-hw,yy],[hw,yy]],p,1.1);}
  // continentes: viejo mundo a la izquierda, nuevo mundo a la derecha
  if(sgn<0){
   // Europa con Escandinavia y el Mediterráneo recortado
   emboss(ctx,c2=>smooth(c2,[[-36,-28],[-30,-38],[-18,-42],[-8,-36],[-14,-30],[-4,-26],[-12,-20],[-22,-24],[-30,-22]]),p,{off:1.3});
   // África: costa norte ancha, golfo de Guinea y cabo al sur
   emboss(ctx,c2=>smooth(c2,[[-24,-12],[-8,-17],[8,-15],[18,-8],[23,2],[14,7],[10,19],[4,32],[-2,37],[-8,26],[-12,12],[-22,6],[-26,-4]]),p,{off:1.5});
   emboss(ctx,c2=>ell(c2,19,22,3,7),p,{off:1}); // Madagascar
   // Asia con Arabia y la India
   emboss(ctx,c2=>smooth(c2,[[8,-38],[28,-42],[44,-32],[47,-18],[38,-13],[33,-2],[27,-12],[19,-8],[15,-21]]),p,{off:1.3});
  } else {
   // Norteamérica: golfo de México y Florida
   emboss(ctx,c2=>smooth(c2,[[-36,-32],[-22,-42],[-4,-41],[14,-34],[19,-26],[9,-23],[11,-13],[3,-10],[-5,-17],[-18,-18],[-30,-23]]),p,{off:1.5});
   // Sudamérica en pera con cabo de Hornos
   emboss(ctx,c2=>smooth(c2,[[-6,-8],[7,-11],[14,-2],[12,12],[6,26],[0,38],[-6,41],[-10,28],[-13,12],[-11,0]]),p,{off:1.5});
   emboss(ctx,c2=>smooth(c2,[[-9,-13],[0,-11],[3,-6],[-6,-6]]),p,{off:1}); // istmo de Panamá
   emboss(ctx,c2=>ell(c2,14,-14,6,2.4),p,{off:.9}); // Antillas
  }
  ctx.restore();
  royalCrown(ctx,0,-66,.34,p);
  ctx.restore();
 }
 for(let i=0;i<3;i++)rline(ctx,[[-124,86+i*11],[-84,80+i*11],[-44,86+i*11],[-4,80+i*11],[36,86+i*11],[76,80+i*11],[124,86+i*11]],p,2.5);
 ctx.restore();
}
/* ---- Agujero central (piezas perforadas) ---- */
function punchHole(ctx,p,coin){
 const hr=Number(coin.holeR||64);
 ctx.save();circle(ctx,0,0,hr);ctx.clip();ctx.clearRect(-hr-1,-hr-1,2*hr+2,2*hr+2);ctx.restore();
 ctx.save();
 ctx.strokeStyle=p.shadow;ctx.lineWidth=7;ctx.globalAlpha=.7;circle(ctx,0,0,hr+3);ctx.stroke();
 ctx.strokeStyle=p.light;ctx.lineWidth=2.5;ctx.globalAlpha=.55;circle(ctx,0,0,hr+8);ctx.stroke();
 ctx.restore();
}

/* Acceso a los componentes para el banco de pruebas de dibujo (no lo usa el juego). */
const PARTS={castle,lion,royalCrown,spanishShield,fleurDeLis,pomegranate,navarraChains,pillars,
 wreath,twoWorlds,eagleUS,eaglePrussian,eagleDouble,eagleMexican,eagleFly,condor,stGeorge,
 seatedLiberty,hispaniaSeated,sower,standingLiberty,sunFace,angelVictory,frenchMantle,owl,
 dragonJP,athenaHead,crossJerusalem,chrysanthemum,swissShield,yokeArrows,herculesGroup,
 horseman,quadriga,elephant,pontificalTools,justinianFront,romaSeated,bust,head,crownedCoat,lionShield,walkingLiberty1943,
 eagleSanJuan,castleCharge,lionCharge,sanJuanFace,pesetaOrnament,taper,curvePts};
const LEGACY_TOOLS={napoleonLaureate,hash,rng,noiseTile,poly,smooth,circle,ell,emboss,rline,iline,curvePts,dot,glyph,legend,text,abradeRelief,makePlanchet,drawField,drawRim,drawPatina,drawGrain,designLayer,head,hair,beard,moustache,laurelWreathHead,diadem,crownHead,veil,fleurDeLis,merlonPath,archVoid,castle,areaPts,polyU,smoothU,ellU,taperPts,taper,clawsU,lion,navarraChains,pomegranate,royalCrown,spanishShield,pillars,wreath,feather,wing,eagleUS,star,eaglePrussian,eagleDouble,eagleMexican,stGeorge,horseman,seatedLiberty,herculesGroup,romaSeated,angelVictory,owl,athenaHead,dragonJP,elephant,pontificalTools,quadriga,swissShield,yokeArrows,crossJerusalem,chrysanthemum,frenchMantle,justinianFront,catholicArms1497,segoviaCharge,potosiCob1690,bust,doubleBustPrussia1901,byzantineAngel,persianRupeeInscription,stampedTradeStars,britannicQuarter,guineaCross1717,florinCross1849,hadrianRoma136,marciusVictoryBiga,marciusGrainLegend,vreneliMountains,vreneliOak,meijiWreath,athensIncuse,britanniaPenny1860,hispaniaSeated,walkerBody,walkerFolds,faceProfile,sower,standingLiberty,sunFace,eagleFly,condor,crownedCoat,lionShield,peaceEagle,peaceLiberty,walkingLiberty1943,walkingEagle,wheatLincoln,mercuryFasces,franco1949Reverse,joanCarlosFive,sailsFive,coin1927Face,capRaysMex,saintGaudensFly,soviet1923,argentina1881,mercuryWinged,sowerChervonets,yuanWheat1914,boliviaTreeLlamas,peruArms1872,peruLiberty1872,chilePlumed1883,chileCondor1883,romanRadiate240,romanConcordia240,isabelFourQuarterShield,muralCrown,isabelArms1850,isabelArmsLater,provisionalArms,renderIsabelArms,renderProvisionalArms,provisionalLionShield,alfonsoGoldMantle,franco44Shield,jcLentilObv,jcLentilRev,cuencaOctolobe,cuencaVellon,georgianLionPassant,georgianSixpence,scottishShilling1940,franceWreathDate,napoleonicMantle1867,ceresBust1851,semeuseBouquet1960,prussianThaler1830,saxonyThaler1854,v634Prussia1900,v634Ducat1915,v634Krone1908,v634SavoyShield,v634ItalyFive,v634ItalyLira1863,v634RussiaEagle,v634Nicholas,v634Swiss5,v634HelvetiaSeated,v634Swiss2,v635Label,v635Year,v635Vines,v635RoyalShield,v635WingsDove,v635Sun,v635Floral,v635EaglePerched,v635ShieldRound,v635Zeus,v635Roma,v635Face,eagleSanJuan,sanJuanFace,pesetaOrnament,castleCharge,lionCharge,twoWorlds,punchHole,clamp,pal,icurve,isHammered,cwPts,taperU,LTOP,LBOT};
root.NCGVector={render,renderDefect:defect,renderSpec,parts:PARTS,pal,registerLegacy,hasLegacy,legacyTools:LEGACY_TOOLS,version:'4.4-luz-unica'};
})(typeof window!=='undefined'?window:globalThis);

/* NCG · Geometría de cuños, rondas 3–13 (2026). Sin timers, filtros ni GPU extra.
  Este es un retoque de relieve de tipo, no trazado facsimilar de cuño. */
(function(root){
'use strict';
const catalogo=new Map();
const PI=Math.PI, TAU=PI*2;
let FAST=false;
function k(id,side){return id+'|'+(side===1||side==='rev'?'rev':'obv');}
function registrar(id,side,d){catalogo.set(k(id,side),Object.freeze(d));}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rand(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function bez(ctx,points){
  if(points.length<2)return;
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length-1;i++){
    const a=points[i],b=points[i+1];
    ctx.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2);
  }
  const z=points[points.length-1];ctx.lineTo(z[0],z[1]);
}
function line(ctx,p,pts,w=2.1,alpha=.64){
   if(FAST){
     ctx.save();ctx.globalAlpha*=alpha*.63;ctx.strokeStyle=p.deep;ctx.lineWidth=w*.68;
     ctx.lineCap='round';ctx.lineJoin='round';bez(ctx,pts);ctx.stroke();ctx.restore();return;
   }
   ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
   ctx.globalAlpha*=alpha;
   ctx.strokeStyle=p.deep;ctx.lineWidth=w;
   bez(ctx,pts);ctx.stroke();
   ctx.translate(-.85,-.75);ctx.strokeStyle=p.light;ctx.lineWidth=w*.35;
   bez(ctx,pts);ctx.stroke();
   ctx.restore();
}
function ellipse(ctx,p,x,y,rx,ry,rot=0,alpha=.6){
 ctx.save();ctx.globalAlpha*=alpha;
 ctx.strokeStyle=p.deep;ctx.lineWidth=1.25;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,TAU);ctx.stroke();
 ctx.restore();
}
function retrato(c,p,d,r,w){
  // Cabello, franja temporal y pliegues diferenciados por busto/ceca.
  const flip=d.perfil==='izquierda'?-1:1;
  c.save();c.scale(flip,1);
  const shift=(d.rastro-1.5)*5,spread=d.retrato==='infantil'? .70:1;
  for(let j=0;j<14;j++){
    const a=-.12+j*.14+shift*.004;
    const cx=-23+Math.cos(a)*104,cy=-91+Math.sin(a)*83;
    line(c,p,[[cx-10*spread,cy+11],[cx-2,cy-2-(j%3)*4],[cx+10*spread,cy-11]],1.35,w*.47);
  }
  // Párpado, patilla y borde de mandíbula no idénticos para cada rey.
  for(let j=0;j<5;j++){
    const x=37+j*7+shift*.2;
    line(c,p,[[x,-68-j*2],[x+8,-70-j*2],[x+12,-66-j*2]],1.1,.49);
  }
  // Cuello de busto y cuero o tela en el truncamiento.
  for(let j=0;j<10;j++){
    const x=-95+j*19,y=132+(j%4)*8+(d.rastro-2)*3;
    line(c,p,[[x-7,y-12],[x,y],[x+8,y+8]],1.35,.47);
  }
  if(d.retrato==='maduro')for(let j=0;j<9;j++){
    const x=27+j*7,y=20+(j%3)*9;
    line(c,p,[[x,y],[x+4,y+8],[x+1,y+17]],1.25,.46);
  }
  c.restore();
}
function ave(c,p,d,r,w){
  // Primarias y cobertoras grabadas por separado, sin crear un águila genérica nueva.
  for(const side of [-1,1]){
    c.save();c.scale(side,1);
    for(let j=0;j<19;j++){
      const a=j/18, x=25+a*150, y=-66+Math.sin(a*PI)*25;
      line(c,p,[[x,y-35],[x+14,y-3],[x+38,y+36]],1.6,.55);
    }
    for(let j=0;j<8;j++){
      const x=28+j*12,y=28+j*4;
      line(c,p,[[x-4,y-6],[x+3,y+9],[x-2,y+22]],1.35,.50);
    }
    c.restore();
  }
  for(let j=0;j<10;j++){
    const x=-27+j*6,y=49+j*2;
    ellipse(c,p,x,y,5,13,j*.1,.42);
  }
}
function vegetal(c,p,d,r,w){
  // Nervaduras y volúmenes por hoja, siguiendo la corona que ya existe.
  for(const side of [-1,1]){
    for(let j=0;j<19;j++){
      const a=(j/18)*1.75-0.92;
      const x=side*(197+35*Math.cos(a)),y=176*Math.sin(a);
      line(c,p,[[x-side*14,y+12],[x,y],[x+side*15,y-13]],1.32,.64);
      ellipse(c,p,x+side*6,y-4,4.5,13,side*(a+.5),.38);
    }
  }
  for(let i=0;i<9;i++){
     const x=-42+i*11,y=22+Math.sin(i*1.9)*8;
     ellipse(c,p,x,y,5,8,i*.37,.32);
  }
}
function heraldica(c,p,d,r,w){
  // Perfiles de castillos, escudos, águilas y blasones; rayas solo sobre superficie ya elevada.
  for(const side of [-1,1]){
    c.save();c.scale(side,1);
    for(let i=0;i<11;i++){
       const x=12+i*13, y=-112+(i%4)*8;
       line(c,p,[[x,y],[x+2,y+19],[x,y+43]],1.5,.55);
    }
    for(let j=0;j<11;j++){
       const x=19+j*13, y=32+(j%3)*6;
       line(c,p,[[x-7,y],[x+9,y+13],[x-7,y+28]],1.3,.48);
    }
    c.restore();
  }
  for(let i=0;i<12;i++){
     const y=-97+i*16;
     line(c,p,[[-6,y],[6,y+2],[11,y]],1.45,.47);
  }
}
function alegoria(c,p,d,r,w){
  // Manto, extremidades y volutas de tela; incisiones limitadas al relieve preexistente.
  for(let j=0;j<17;j++){
    const t=j/16,x=-105+j*14;
    const y=-32+Math.sin(j*.46)*21;
    line(c,p,[[x-9,y],[x+12,y+40],[x+17+(t-.5)*20,y+122]],1.5,.54);
  }
  for(let j=0;j<10;j++){
    const x=-50+j*12,y=-88+(j%3)*8;
    line(c,p,[[x-6,y],[x+5,y-8],[x+10,y-16]],1.25,.52);
  }
  for(let j=0;j<13;j++){
    const x=-96+j*15,y=120+Math.sin(j*.7)*14;
    line(c,p,[[x-8,y-3],[x,y+7],[x+14,y+8]],1.3,.50);
  }
}
function arquitectura(c,p,d,r,w){
  // Aristas de pilastras/coronas/columna y motivos geométricos internos.
  for(const side of [-1,1]){
    c.save();c.scale(side,1);
    for(let j=0;j<13;j++){
      const x=70+j*8,y=-133+(j%4)*9;
      line(c,p,[[x,y],[x+2,0],[x+1,139]],1.25,.57);
    }
    for(let j=0;j<6;j++){
      const y=-105+j*45;
      line(c,p,[[61,y],[118,y+2],[165,y]],1.5,.47);
    }
    c.restore();
  }
}
function antiguo(c,p,d,r,w){
  // Buril de acuñación manual: surcos variables en motivos, no arañazos en campos.
  for(let j=0;j<32;j++){
    const a=(j/32)*TAU+(d.rastro-2)*.18;
    const rad=60+(j%5)*29, x=Math.cos(a)*rad, y=Math.sin(a)*rad;
    line(c,p,[[x-6,y-3],[x+3,y+2],[x+8,y+5]],1.35,.5);
  }
}
function geometrico(c,p,d,r,w){
   for(let j=0;j<15;j++){
      const a=j/15*TAU, x=130*Math.cos(a),y=130*Math.sin(a);
      line(c,p,[[x-9,y-3],[x+4,y+4],[x+10,y+9]],1.3,.52);
   }
}
function dragon(c,p,d,r,w){
  // Malla de escamas en forma serpentina; el trazado específico Meiji ya aporta cabeza y garras.
  // Las escamas se dibujan SOBRE el relieve levantado para no ocupar el campo liso.
  for(let i=0;i<56;i++){
    const a=i/56*PI*3.2-.7, rad=75+(i%7)*18;
    const x=Math.cos(a)*rad,y=Math.sin(a)*rad;
    line(c,p,[[x-4,y-7],[x+3,y+2],[x-4,y+11]],1.5,.65);
    ellipse(c,p,x+3,y-2,5,7,a/4,.38);
  }
}
const SHAPES={retrato,ave,dragon,vegetal,heraldica,alegoria,arquitectura,antiguo,geometrico};
function render(ctx,p,coin,side,wear=0,quality='high'){
  const d=catalogo.get(k(coin.id,side));if(!d||wear>.81)return false;
  const fn=SHAPES[d.familia]||geometrico;
  const r=rand(d.semilla);ctx.save();FAST=(quality==='low');
  // Capa de talla interior: no modifica textos de la leyenda ni añade símbolos anacrónicos.
  ctx.globalCompositeOperation='source-atop';
  ctx.globalAlpha=(quality==='low'?.77:1)*clamp(1-wear*.8,.15,1);
  ctx.translate((d.taller-2)*3,(d.rastro-1.5)*2);
  ctx.rotate(d.angulo);ctx.scale(d.escala,d.escala);
  fn(ctx,p,d,r,1);
  // Ajustes observados en pruebas visuales, delimitados a cinco cuños modernos.
  // No se reescriben las leyendas ni se introduce iconografía ajena al tipo.
  if(coin.id==='1_peseta_franco_1944'&&side===0){
    ctx.globalCompositeOperation='source-atop';
    for(let j=0;j<14;j++){
      const a=j*TAU/14;const x=242*Math.cos(a),y=238*Math.sin(a);
      line(ctx,p,[[x-8,y-12],[x-1,y],[x+8,y+10]],1.7,.46);
    }
  }
  if(coin.id==='1_peseta_juancarlos_1975'&&side===0){
    ctx.globalCompositeOperation='source-atop';
    for(let j=0;j<17;j++){
      const a=j*.20,x=-158+Math.sin(a)*60,y=-80+Math.cos(a)*57;
      line(ctx,p,[[x-7,y-4],[x+7,y+8],[x-5,y+15]],2.0,.62);
    }
  }
  if(coin.id==='1corona_austria_1908'&&side===1){
    ctx.globalCompositeOperation='source-atop';
    for(let i=-4;i<=4;i++){
      const x=i*15,y=-123-(4-Math.abs(i))*4;
      ellipse(ctx,p,x,y,5.6,6.6,.1,.7);
    }
    line(ctx,p,[[-76,-119],[-48,-158],[0,-163],[46,-158],[77,-119]],1.8,.58);
  }
  if(coin.id==='1lira_vittorio2_1863'&&side===1){
    ctx.globalCompositeOperation='source-atop';
    for(const side2 of [-1,1])for(let i=0;i<16;i++){
      const x=side2*(142+49*Math.cos(i*.12)),y=-166+i*21;
      ellipse(ctx,p,x+side2*(i%2?6:-6),y,7,12,side2*(i*.08),.46);
      line(ctx,p,[[x-side2*5,y-10],[x,y],[x+side2*6,y+10]],1.25,.48);
    }
  }
  if(coin.id==='25_centimos_alfonso13_1926'&&side===0){
    ctx.globalCompositeOperation='source-atop';
    for(const side2 of [-1,1])for(let i=0;i<9;i++){
      const y=-125+i*34,x=side2*(155+12*Math.sin(i*.8));
      line(ctx,p,[[x-side2*9,y-7],[x,y],[x+side2*8,y+10]],1.4,.54);
    }
  }
  ctx.restore();FAST=false;return true;
}
root.NCGArteCunhos={registrar,render,cantidad:()=>catalogo.size};
})(typeof window!=='undefined'?window:globalThis);

/* NCG V11 — carga de caras con registro coherente en anverso y reverso.
 * Sin dependencias ni fetch; compatible con NeutralinoJS y carga local. */
(function(root){
 'use strict';
 const pending=new Map(),failures=new Map();
 // Face files register with string labels ("obv"/"rev"); callers use numeric (0/1).
 // V10 accidentally treated "rev" as an obverse, silently corrupting 76 pairs.
 const cara=s=>{
  if(s===0||s==='obv')return 'obv';
  if(s===1||s==='rev')return 'rev';
  throw Error('Cara no válida: '+String(s));
 };
 const key=(coin,side)=>String(coin.id)+'|'+side;
 const ruta=(coin,side)=>coin?.archivo?String(coin.archivo)+'/'+(side===1?'reverso':'anverso')+'.js':null;
 function estaLista(coin,side){return !!coin&&(!!coin.vec?.[cara(side)]||!!root.NCGVector?.hasLegacy(coin.id,side));}
 function registrarCara(id,side,spec){
  const normalized=cara(side);
  const coin=classicCoinById(id);
  if(!coin)throw Error('Moneda desconocida al registrar: '+id);
  if(!spec||typeof spec!=='object'||typeof spec.kind!=='string')throw Error('Motivo vectorial inválido: '+id+'/'+side);
  if(!coin.vec)coin.vec={};coin.vec[normalized]=spec;
 }
 function registrarDibujoLegacy(id,side,fn){root.NCGVector.registerLegacy(id,cara(side)==='rev'?1:0,fn);}
 function loadOnce(coin,side,attempt){
  const url=ruta(coin,side);
  return new Promise((resolve,reject)=>{
   const el=document.createElement('script');
   const request=attempt?url+(url.includes('?')?'&':'?')+'ncgRetry='+Date.now():url;
   let done=false;const end=(err)=>{
    if(done)return;done=true;clearTimeout(timer);
    el.onload=null;el.onerror=null;el.remove();
    if(err)reject(err);else resolve(true);
   };
   const timer=setTimeout(()=>end(Error('Tiempo de carga agotado: '+url)),12000);
   el.src=request;el.async=true;el.dataset.ncgCoin=coin.id;
   el.onload=()=>{
    if(!estaLista(coin,side))end(Error('El archivo no registró '+coin.id+'/'+cara(side)));
    else end(null);
   };
   el.onerror=()=>end(Error('No se pudo cargar '+url+'; comprueba que la carpeta monedas está completa.'));
   document.head.appendChild(el);
  });
 }
 async function cargarCara(coin,side,force=false){
  if(!coin)return Promise.reject(Error('Moneda inexistente'));
  if(estaLista(coin,side))return true;
  const url=ruta(coin,side);if(!url)throw Error('No existe ruta vectorial para '+coin.id);
  const k=key(coin,side);
  if(pending.has(k))return pending.get(k);
  const task=(async()=>{
   let last;
   try{
    for(let attempt=0;attempt<2;attempt++){
     try{
      await loadOnce(coin,side,attempt||force);
      failures.delete(k);
      root.dispatchEvent?.(new CustomEvent('ncg:moneda-cargada',{detail:{id:coin.id,side}}));
      return true;
     }catch(e){last=e;if(attempt===0)await new Promise(r=>setTimeout(r,220));}
    }
    failures.set(k,last);throw last;
   }finally{pending.delete(k);}
  })();
  pending.set(k,task);return task;
 }
 const cargarPar=coin=>Promise.all([cargarCara(coin,0),cargarCara(coin,1)]);
 // Solo la próxima moneda sigue siendo relevante. Al saltar muchas fichas con
 // el modo desarrollador no debemos acumular docenas de scripts de precarga:
 // WebKitGTK puede procesarlos de golpe y dejar de responder.
 let preloadTimer=null,preloadGeneration=0;
 function precargar(coin){
  const generation=++preloadGeneration;
  if(preloadTimer!==null){clearTimeout(preloadTimer);preloadTimer=null;}
  if(!coin||estaLista(coin,0))return;
  preloadTimer=setTimeout(()=>{
   preloadTimer=null;
   if(generation!==preloadGeneration)return;
   cargarCara(coin,0).catch(e=>console.warn('NCG precarga:',e.message));
  },550);
 }
 root.NCGMonedas={cargarCara,cargarPar,estaLista,ruta,registrarCara,registrarDibujoLegacy,precargar,fallos:failures,reintentar:(coin,side)=>cargarCara(coin,side,true)};
})(window);

const coins=new Map();
function classicCoinById(id){
 const source=root.GAME_DATA?.coins?.find(coin=>coin.id===id);
 return source?classicCoin(source):undefined;
}
function classicCoin(coin){
 let entry=coins.get(coin.id);
 if(!entry){
  // Las monedas adicionales incluyen las dos caras en vec en lugar de archivos de cuño.
  entry=coin.archivo
   ? {...coin,vec:undefined,archivo:coin.archivo.replace('assets/realista/cunos/','assets/vectorial/cunos/')}
   : coin;
  coins.set(coin.id,entry);
 }
 return entry;
}
root.NCGClassicContext=window;
root.NCGClassic={
 cargarCara:(coin,side)=>window.NCGMonedas.cargarCara(classicCoin(coin),side),
 reintentar:(coin,side)=>window.NCGMonedas.reintentar(classicCoin(coin),side),
 estaLista:(coin,side)=>window.NCGMonedas.estaLista(classicCoin(coin),side),
 render:(ctx,coin,side,shade,quality)=>window.NCGVector.render(ctx,{...classicCoin(coin),metal:coin.metal,paleta:coin.paleta,metalVisual:coin.metalVisual},side,shade,quality)
};
})(window);
