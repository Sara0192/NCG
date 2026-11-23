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
  const flip=d.perfil==='izquierda'?-1:1;
  c.save();c.scale(flip,1);
  const shift=(d.rastro-1.5)*5,spread=d.retrato==='infantil'? .70:1;
  for(let j=0;j<14;j++){
    const a=-.12+j*.14+shift*.004;
    const cx=-23+Math.cos(a)*104,cy=-91+Math.sin(a)*83;
    line(c,p,[[cx-10*spread,cy+11],[cx-2,cy-2-(j%3)*4],[cx+10*spread,cy-11]],1.35,w*.47);
  }
  for(let j=0;j<5;j++){
    const x=37+j*7+shift*.2;
    line(c,p,[[x,-68-j*2],[x+8,-70-j*2],[x+12,-66-j*2]],1.1,.49);
  }
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
  ctx.globalCompositeOperation='source-atop';
  ctx.globalAlpha=(quality==='low'?.77:1)*clamp(1-wear*.8,.15,1);
  ctx.translate((d.taller-2)*3,(d.rastro-1.5)*2);
  ctx.rotate(d.angulo);ctx.scale(d.escala,d.escala);
  fn(ctx,p,d,r,1);
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
