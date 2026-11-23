(function(){
 'use strict';
 const TAU=Math.PI*2, CLAMP=(x,a,b)=>Math.min(b,Math.max(a,x));
 const DAMAGE={
  golpe_canto:'Golpe de canto: impacto con hendidura, deformación local y reborde de metal desplazado.',
  limado_canto:'Canto limado: estrías paralelas y una zona alisada donde se ha perdido la textura original.',
  recortado_canto:'Recorte o cercén: pérdida localizada de metal en el perímetro y borde seccionado irregular.',
  rayas_canto:'Rayas profundas: incisiones que atraviesan las estrías del canto.',
  costura_canto:'Costura: línea longitudinal o junta que puede sugerir un molde o una unión.',
  desgaste_canto:'Cordoncillo gastado: estrías aplanadas, menos definidas y con brillo de roce.'
 };
 const ANGLE_DEFECT=118;
 const metalColors={
  oro:{light:'#fff0b2',mid:'#cf9f44',dark:'#6b481b',line:'#704616'},
  plata:{light:'#f0f2f4',mid:'#aeb8c0',dark:'#56616d',line:'#505a64'},
  cobre:{light:'#eebc8a',mid:'#aa6949',dark:'#583625',line:'#60402d'}
 };
 const palettes={oro:metalColors.oro,plata:metalColors.plata,cobre:metalColors.cobre,aluminio:metalColors.plata,cuproniquel:metalColors.plata,niquel:metalColors.plata,bronce_aluminio:metalColors.oro,laton:metalColors.oro};
 function wrapDelta(a,b){return (a-b+540)%360-180;}
 function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
 function metallic(ctx,x,y,w,h,colors,wear){
  const base=ctx.createLinearGradient(0,y,0,y+h);
  base.addColorStop(0,colors.dark);base.addColorStop(.08,colors.light);base.addColorStop(.24,colors.mid);base.addColorStop(.51,colors.mid);base.addColorStop(.76,colors.dark);base.addColorStop(.91,colors.mid);base.addColorStop(1,colors.light);
  ctx.fillStyle=base;ctx.fillRect(x,y,w,h);
  const shine=ctx.createLinearGradient(x,0,x+w,0);
  shine.addColorStop(0,'rgba(0,0,0,.25)');shine.addColorStop(.18,'rgba(255,255,255,.10)');shine.addColorStop(.5,'rgba(255,255,255,.03)');shine.addColorStop(.79,'rgba(255,255,255,.14)');shine.addColorStop(1,'rgba(0,0,0,.28)');
  ctx.fillStyle=shine;ctx.fillRect(x,y,w,h);
  if(wear){ctx.globalAlpha=wear*.18;ctx.fillStyle='#e4c7a2';ctx.fillRect(x,y,w,h);ctx.globalAlpha=1;}
 }
 function grooves(ctx,x,y,w,h,angle,colors,period=12,slant=0){
  const shift=((angle*period/7.5)%period+period)%period;
  for(let i=x-period;i<x+w+period;i+=period){const xx=i-shift;
   ctx.strokeStyle=colors.dark;ctx.lineWidth=2.6;
   ctx.beginPath();ctx.moveTo(xx+slant,y+4);ctx.lineTo(xx-slant,y+h-4);ctx.stroke();
   ctx.strokeStyle=colors.light;ctx.lineWidth=1.2;
   ctx.beginPath();ctx.moveTo(xx+slant+3,y+4);ctx.lineTo(xx-slant+3,y+h-4);ctx.stroke();
  }
 }
 function ornament(ctx,type,x,y,w,h,angle,colors,coin){
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  const motif=type==='flores_lis'?'⚜':type==='estrellas'?'★':null;
  if(type==='leyenda'||type==='leyenda_estriado'){
   ctx.font='bold 27px Georgia,serif';
   ctx.fillStyle=colors.dark;
   const message=String(coin?.edgeInscription||coin?.edgeLabel||'CANTO INSCRITO')+'   ✦   ';
   const spacing=ctx.measureText(message).width;
   const shift=((angle*1.8)%spacing+spacing)%spacing;
   for(let xx=x-spacing;xx<x+w+spacing;xx+=spacing){ctx.fillText(message,xx-shift,y+h/2+2);ctx.fillStyle=colors.light;ctx.fillText(message,xx-shift-1,y+h/2);ctx.fillStyle=colors.dark;}
  }else if(motif){
   ctx.font='30px Georgia,serif';
   const period=48,shift=(angle*2)%period;
   for(let xx=x-50;xx<x+w+50;xx+=period){ctx.fillStyle=colors.dark;ctx.fillText(motif,xx-shift,y+h/2+2);ctx.fillStyle=colors.light;ctx.fillText(motif,xx-shift-1,y+h/2);}
  }
  ctx.restore();
 }
 function drawDefect(ctx,type,x,y,h,colors,fade){
  ctx.save();ctx.globalAlpha=fade;ctx.translate(x,y);ctx.lineJoin='round';ctx.lineCap='round';
  if(type==='golpe_canto'){
   ctx.fillStyle='rgba(22,22,19,.55)';ctx.beginPath();ctx.ellipse(0,h*.56,23,29,-.28,0,TAU);ctx.fill();
   ctx.strokeStyle=colors.light;ctx.lineWidth=4.2;ctx.beginPath();ctx.ellipse(5,h*.53,22,28,-.28,-1.2,.8);ctx.stroke();
   ctx.strokeStyle=colors.dark;ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(-17,h*.26);ctx.lineTo(-10,h*.47);ctx.lineTo(-17,h*.74);ctx.stroke();
  }else if(type==='limado_canto'){
   const g=ctx.createLinearGradient(-38,0,42,0);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.23,colors.mid);g.addColorStop(.72,colors.mid);g.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=g;ctx.fillRect(-36,6,72,h-12);
   for(let i=-31;i<34;i+=5){ctx.strokeStyle=i%2===0?colors.light:colors.dark;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(i+4,10);ctx.lineTo(i-7,h-8);ctx.stroke();}
  }else if(type==='recortado_canto'){
   ctx.fillStyle='#101b18';ctx.beginPath();ctx.moveTo(-35,-4);ctx.lineTo(34,-4);ctx.lineTo(17,18);ctx.lineTo(2,25);ctx.lineTo(-16,15);ctx.closePath();ctx.fill();
   ctx.strokeStyle=colors.light;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-34,1);ctx.lineTo(-16,15);ctx.lineTo(2,25);ctx.lineTo(17,18);ctx.lineTo(34,0);ctx.stroke();
   ctx.strokeStyle=colors.dark;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-19,14);ctx.lineTo(-13,24);ctx.moveTo(14,18);ctx.lineTo(20,29);ctx.stroke();
  }else if(type==='rayas_canto'){
   for(let i=-3;i<=3;i++){
    const xx=i*10;
    ctx.strokeStyle='rgba(35,30,25,.8)';ctx.lineWidth=i%3===0?4.5:2.8;ctx.beginPath();ctx.moveTo(xx-10,h*.13);ctx.lineTo(xx+17,h*.88);ctx.stroke();
    ctx.strokeStyle=colors.light;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(xx-13,h*.13);ctx.lineTo(xx+14,h*.88);ctx.stroke();
   }
  }else if(type==='costura_canto'){
   ctx.strokeStyle=colors.dark;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(2,h-3);ctx.stroke();
   ctx.strokeStyle=colors.light;ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(4,3);ctx.lineTo(6,h-3);ctx.stroke();
   for(let i=13;i<h-9;i+=17){ctx.strokeStyle=colors.dark;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,i);ctx.lineTo(11,i+2);ctx.stroke();}
  }else if(type==='desgaste_canto'){
   const g=ctx.createLinearGradient(-39,0,39,0);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.18,colors.mid);g.addColorStop(.76,colors.mid);g.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=g;ctx.fillRect(-42,5,84,h-10);
   ctx.strokeStyle='rgba(255,255,255,.26)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-32,h*.43);ctx.lineTo(33,h*.43);ctx.stroke();
  }
  ctx.restore();
 }
 function draw(canvas,coin,options={}){
  if(!canvas||!coin)throw new Error('Faltan el lienzo o la moneda del tutorial de canto');
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D no disponible');
  const w=canvas.width,h=canvas.height,angle=Number(options.angle)||0,defect=options.defect||'';
  const type=coin.edgeType||'liso';
  const colors=palettes[options.metal]||metalColors.cobre;
  const wear=CLAMP(Number(options.wear)||0,0,1);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
  const x=27,y=62,bw=w-54,bh=106;
  ctx.fillStyle='#0c1715';rounded(ctx,9,25,w-18,178,13);ctx.fill();
  ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=24;ctx.shadowOffsetY=9;
  rounded(ctx,x,y,bw,bh,15);ctx.fillStyle=colors.dark;ctx.fill();
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.save();rounded(ctx,x,y,bw,bh,15);ctx.clip();
  metallic(ctx,x,y,bw,bh,colors,wear);
  const lighting=(Math.sin((Number(options.lightAngle)||0)*Math.PI/180)+1)/2;
  const beamX=x+bw*(.18+.64*lighting),beam=ctx.createLinearGradient(beamX-110,0,beamX+110,0);
  beam.addColorStop(0,'rgba(255,255,255,0)');beam.addColorStop(.5,'rgba(255,255,255,.13)');beam.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=beam;ctx.fillRect(x,y,bw,bh);
  if(type==='estriado'||type==='leyenda_estriado')grooves(ctx,x,y,bw,bh,angle,colors,12);
  else if(type==='cordoncillo')grooves(ctx,x,y,bw,bh,angle,colors,13,8);
  else if(type==='rayado')grooves(ctx,x,y,bw,bh,angle,colors,17,11);
  else if(type==='martillado_irregular'){
   grooves(ctx,x,y,bw,bh,angle,colors,28,5);
   ctx.globalAlpha=.14;ctx.fillStyle='#282222';for(let i=0;i<65;i++){
    const xx=x+((i*113+angle*7)%bw),yy=y+8+((i*43)%Math.round(bh-16));
    ctx.beginPath();ctx.arc(xx,yy,1.2+(i%4),0,TAU);ctx.fill();
   }ctx.globalAlpha=1;
  }
  if(['flores_lis','estrellas','leyenda','leyenda_estriado'].includes(type))ornament(ctx,type,x,y,bw,bh,angle,colors,coin);
  const delta=wrapDelta(ANGLE_DEFECT,angle),visible=!!DAMAGE[defect]&&Math.abs(delta)<74;
  if(visible){const dx=w/2+delta/74*(bw*.46);drawDefect(ctx,defect,dx,y,bh,colors,CLAMP((74-Math.abs(delta))/20,0,1));}
  ctx.restore();
  ctx.strokeStyle=colors.light;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(x+19,y+2);ctx.lineTo(x+bw-18,y+2);ctx.stroke();
  ctx.strokeStyle='rgba(0,0,0,.37)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+18,y+bh-3);ctx.lineTo(x+bw-18,y+bh-3);ctx.stroke();
  ctx.fillStyle='#f0d5a2';ctx.textAlign='center';ctx.font='bold 15px system-ui, sans-serif';ctx.fillText('SIMULACIÓN DEL CANTO · VISTA LATERAL',w/2,45);
  ctx.textAlign='left';ctx.font='13px system-ui, sans-serif';ctx.fillStyle='#b7c7bc';
  ctx.fillText('0°–360°: desplaza la moneda para ver qué zona queda frente a ti',x,224);
  ctx.restore();
  let description=(coin.edgeLabel||'Canto '+type)+'. '+(coin.edgeNote||'Reconstrucción didáctica del canto, no copia exacta de un ejemplar.');
  if(defect&&DAMAGE[defect])description+=' '+(visible?DAMAGE[defect]:'El defecto seleccionado queda fuera del ángulo visible. Sigue girando para encontrarlo.');
  else if(defect)description+=' El defecto elegido pertenece a las caras, no al canto.';
  else description+=' Selecciona un defecto de canto para practicar su identificación.';
  return {visible,description,angle,type,defect};
 }
 window.NCGEdgeLab=Object.freeze({draw,isEdgeDefect:value=>!!DAMAGE[value]});
})();
