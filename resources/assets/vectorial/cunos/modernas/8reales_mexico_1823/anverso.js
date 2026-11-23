(function(window){
/* NCG V18.6.0 · 8 reales México, águila de perfil «Hookneck» (1823).
 * Reconstrucción vectorial del tipo; no reproduce un cuño individual.
 * Cuerpo de perfil a izquierda, ala alta hacia la derecha, serpiente curvada,
 * nopal, garras y guirnalda. No reutilizar el águila frontal federal.
 */
(function(){'use strict';
const T=window.NCGVector.legacyTools;
const paths=new Map();function P(d){if(!paths.has(d))paths.set(d,new Path2D(d));return paths.get(d);}
function raise(ctx,p,d,stroke=1.5){
 const v=P(d);ctx.save();ctx.translate(2.3,2.5);ctx.globalAlpha=.64;
 ctx.fillStyle=p.shadow;ctx.fill(v);ctx.restore();
 ctx.save();const g=ctx.createLinearGradient(-80,-180,110,170);
 g.addColorStop(0,p.light);g.addColorStop(.32,p.mid);g.addColorStop(.72,p.base);g.addColorStop(1,p.deep);
 ctx.fillStyle=g;ctx.fill(v);ctx.lineWidth=stroke;ctx.strokeStyle=p.deep;ctx.globalAlpha=.9;ctx.stroke(v);
 ctx.translate(-1.2,-1.2);ctx.strokeStyle=p.light;ctx.globalAlpha=.68;ctx.lineWidth=Math.max(.6,stroke*.60);ctx.stroke(v);ctx.restore();
}
function inc(ctx,p,d,w=1.7){const v=P(d);ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
 ctx.strokeStyle=p.deep;ctx.lineWidth=w;ctx.stroke(v);ctx.translate(-.9,-.9);
 ctx.globalAlpha=.65;ctx.strokeStyle=p.light;ctx.lineWidth=w*.64;ctx.stroke(v);ctx.restore();}
function eagle(ctx,p){
 // Ala posterior: un ala extendida a la derecha y no dos abanicos simétricos.
 raise(ctx,p,'M 10 -55 C 70 -142 122 -181 181 -173 C 163 -151 146 -130 113 -111 C 158 -105 180 -98 197 -83 C 162 -78 139 -78 114 -79 C 164 -53 188 -41 207 -20 C 174 -16 145 -22 103 -35 C 74 -38 37 -32 10 -10 Z',2.8);
 for(let i=0;i<13;i++){
  let y=-145+i*9;
  inc(ctx,p,`M ${24+i*2} ${-65+i*3} Q ${74+i*2} ${y-24} ${169-i*1.7} ${y}`,1.2);
 }
 // Ala más cercana, cresta alta y plumas individualizadas.
 raise(ctx,p,'M -27 -44 C -14 -105 30 -158 89 -182 C 118 -191 158 -184 176 -177 C 145 -161 129 -149 111 -128 C 145 -134 164 -122 171 -111 C 135 -103 111 -100 86 -96 C 114 -88 124 -74 131 -66 C 81 -59 40 -42 7 -10 Z',3.0);
 for(let i=0;i<17;i++){
  const x=-12+i*6,y=-41-i*5;
  inc(ctx,p,`M ${x} ${y} Q ${46+i*5} ${-156+i*3} ${155-i*2.0} ${-171+i*5.3}`,1.0);
 }
 // Cuerpo en relieve, pecho voluminoso y cuello curvado en perfil.
 raise(ctx,p,'M -79 -114 C -88 -130 -73 -155 -53 -163 C -34 -173 -15 -167 -4 -155 C 0 -145 -6 -134 -17 -122 C -23 -111 -29 -96 -27 -85 C -10 -63 20 -36 32 -2 C 46 40 24 86 -9 105 C -40 93 -58 62 -62 22 C -72 -16 -77 -62 -69 -88 Z',3.3);
 // Cabeza hacia izquierda, pico inequívocamente ganchudo, nunca vista frontal.
 raise(ctx,p,'M -61 -163 Q -81 -166 -94 -157 Q -110 -149 -110 -129 L -99 -116 Q -100 -128 -91 -130 L -75 -121 Q -64 -126 -61 -142 Z',1.4);
 raise(ctx,p,'M -109 -132 Q -137 -125 -132 -115 Q -118 -108 -111 -125 L -107 -132 Z',1.2);
 inc(ctx,p,'M -91 -151 q 10 -8 20 -1 M -93 -145 l 12 2',1.8);
 T.dot(ctx,-85,-146,2.7,p);
 // Barbas, plumaje del cuello y pecho.
 for(let i=0;i<16;i++){
  const y=-110+i*11,x=-65+(i>8?2*(i-8):0);
  inc(ctx,p,`M ${x} ${y} q 14 -8 25 -4`,1.15);
 }
 for(let i=0;i<10;i++){let a=i/10*Math.PI*.9;
  inc(ctx,p,`M ${-23+Math.sin(a)*18} ${0+i*7} q 20 9 26 22`,1.2);}
 // Plumas caudales hacia la derecha.
 for(let i=0;i<9;i++)raise(ctx,p,`M 19 ${25+i*5} Q 83 ${27+i*6} ${163-i*2} ${30+i*8} Q ${161-i*3} ${42+i*9} 40 ${43+i*4} Z`,1.0);
 // Serpiente en forma de gancho característica del tipo.
 inc(ctx,p,'M -132 -118 C -154 -104 -142 -84 -118 -85 C -91 -86 -81 -65 -97 -53 C -113 -43 -137 -50 -133 -73 C -126 -98 -99 -96 -84 -77 C -71 -61 -78 -47 -88 -35',8.2);
 inc(ctx,p,'M -131 -115 C -151 -101 -135 -83 -115 -87 M -121 -66 C -119 -57 -108 -51 -100 -52',1.3);
 // Nopal y garras, ambas articuladas.
 raise(ctx,p,'M -26 110 Q -30 96 -26 84 L 17 80 Q 29 103 19 117 Z',2);
 for(const sign of [-1,1]){
  raise(ctx,p,`M ${sign*9} 102 Q ${sign*34} 93 ${sign*43} 102 Q ${sign*53} 119 ${sign*39} 130 Q ${sign*18} 130 ${sign*9} 114 Z`,1.1);
  for(let i=0;i<5;i++)T.dot(ctx,sign*(24+i*4),112+(i%2)*4,1.0,p);
 }
 for(let i=0;i<2;i++){
  const x=-22+i*45;
  raise(ctx,p,`M ${x} 73 Q ${x-6} 91 ${x-7} 106 Q ${x-19} 115 ${x-37} 109 L ${x-31} 119 Q ${x-5} 127 ${x+1} 107 L ${x+12} 91 Z`,1.3);
  for(let j=0;j<3;j++)inc(ctx,p,`M ${x-13+j*7} 112 q -2 10 ${-5+j*4} 11`,1.8);
 }
 // Base de la peña y los tallos de laurel y encina en la zona baja.
 raise(ctx,p,'M -58 139 Q -3 129 58 139 L 84 157 Q 15 170 -74 159 Z',1.4);
 for(const sign of [-1,1]){
  T.rline(ctx,[[0,193],[sign*75,204],[sign*141,164],[sign*170,112]],p,2.1);
  for(let i=0;i<11;i++){
   const x=sign*(29+i*13),y=196-i*6;
   ctx.save();ctx.translate(x,y);ctx.rotate(sign*(-.7+i*.035));
   T.emboss(ctx,c=>T.ell(c,0,-11,6,14),p,{off:.65,lw:.7});ctx.restore();
  }
 }
 T.rline(ctx,[[-16,194],[0,203],[19,194]],p,3.0);
}
window.NCGMonedas.registrarDibujoLegacy('8reales_mexico_1823','obv',(ctx,p)=>{
 eagle(ctx,p);
 T.LTOP(ctx,'REPUBLICA MEXICANA',p,{r:320,size:28,span:2.44});
});
})();

// V18.6: planos antiguos anulados porque correspondían al águila frontal.

})(window.NCGClassicContext);
