(function(window){
/* NCG V18.6.0 — Helvetia sentada. Reconstrucción vectorial de tipo 1860–61.
 * Iconografía: figura femenina de perfil, brazo derecho extendido sobre los Alpes,
 * mano izquierda en el escudo helvético y firma KORN; no copia de un cuño.
 */
(function(){'use strict';
const T=window.NCGVector.legacyTools;
const ID='1fr_helvetia_1861';
const paths=new Map(),path=d=>{if(!paths.has(d))paths.set(d,new Path2D(d));return paths.get(d)};
function relief(c,p,d,w=1.5){const q=path(d);c.save();c.translate(2,3);c.globalAlpha=.67;c.fillStyle=p.shadow;c.fill(q);c.restore();c.save();let g=c.createLinearGradient(-120,-180,180,170);g.addColorStop(0,p.light);g.addColorStop(.45,p.mid);g.addColorStop(1,p.deep);c.fillStyle=g;c.fill(q);c.lineWidth=w;c.strokeStyle=p.deep;c.stroke(q);c.restore();}
function cut(c,p,d,w=1.5){const q=path(d);c.save();c.lineJoin=c.lineCap='round';c.lineWidth=w;c.strokeStyle=p.deep;c.stroke(q);c.translate(-1,-1.2);c.globalAlpha=.62;c.strokeStyle=p.light;c.lineWidth=w*.7;c.stroke(q);c.restore();}
function figure(c,p){
 // Paisaje alpino, labrado bajo; dejar libre el campo central.
 cut(c,p,'M -265 175 L -232 148 L -217 154 L -179 106 L -157 120 L -139 98 L -105 127 L -83 122',1.8);
 cut(c,p,'M -262 188 Q -197 173 -138 174 M 181 164 L 202 126 L 226 127 L 251 157',1.3);
 // Banco de piedra y pedestal.
 relief(c,p,'M -161 164 L 162 164 L 168 182 L -158 184 Z',2.6);
 cut(c,p,'M -149 169 L 141 169',1.1);
 // Silueta del vestido clásico, regazo y rodillas anatómicos.
 relief(c,p,'M -21 -46 C 3 -61 37 -62 71 -38 L 93 15 Q 91 46 67 69 C 20 93 -25 81 -65 94 C -94 104 -110 130 -124 156 L -158 167 Q -185 156 -174 139 C -163 117 -139 112 -130 91 Q -121 54 -72 38 C -57 18 -49 -28 -21 -46 Z',3.0);
 relief(c,p,'M -32 17 Q -59 10 -92 48 C -116 61 -118 93 -109 114 Q -98 137 -132 158 L -169 160 Q -171 151 -155 135 C -143 107 -147 72 -112 42 C -82 17 -60 0 -32 17 Z',1.3);
 // Cuerpo y hombros — ambas caderas se alinean con el banco.
 relief(c,p,'M 13 -112 Q 35 -121 59 -105 Q 76 -88 85 -55 L 66 -18 Q 57 8 36 17 Q 8 -4 -10 -38 Q -25 -66 -6 -97 Z',2.6);
 cut(c,p,'M 18 -103 Q 25 -80 23 -58 Q 40 -33 38 -7 M 69 -93 Q 54 -64 62 -38',1.2);
 // Perfil de la cabeza girado a izquierda, cuello y nariz.
 relief(c,p,'M 17 -115 L 13 -138 Q 1 -156 2 -181 Q 10 -206 37 -210 Q 58 -206 68 -184 Q 65 -172 50 -163 L 41 -143 L 45 -119 Z',2.4);
 relief(c,p,'M 9 -186 L -10 -172 L -16 -164 L -7 -155 L 6 -159 L 11 -146 Q 18 -136 29 -136 L 37 -154 Z',1.2);
 cut(c,p,'M 0 -171 Q 11 -178 20 -174 M 5 -159 L 19 -157',1.1);
 T.dot(c,13,-177,2.1,p);
 // Corona de laurel y cabello recogido en ondas.
 for(let i=0;i<10;i++){let a=-Math.PI*.90+i*.18,x=31+34*Math.cos(a),y=-182+26*Math.sin(a);
  c.save();c.translate(x,y);c.rotate(a-.3);T.emboss(c,z=>T.ell(z,0,-7,4.0,10),p,{off:.6,lw:.6});c.restore();}
 cut(c,p,'M 37 -198 Q 66 -183 51 -155 Q 57 -146 48 -137',1.3);
 // Brazo derecho horizontal dirigido a la izquierda sobre los Alpes.
 relief(c,p,'M 12 -99 C -40 -112 -92 -120 -136 -129 Q -174 -140 -206 -135 L -220 -133 L -222 -121 Q -176 -118 -140 -113 C -90 -99 -44 -88 -5 -78 Z',1.5);
 relief(c,p,'M -211 -137 L -238 -144 L -256 -143 L -263 -136 L -245 -135 L -222 -122 Z',1.1);
 for(let i=0;i<4;i++)cut(c,p,`M ${-246+i*8} -139 L ${-259+i*7} -136`,.8);
 cut(c,p,'M -23 -96 Q -85 -112 -154 -126',1.0);
 // Brazo izquierdo flexionado hacia el escudo.
 relief(c,p,'M 70 -96 C 96 -96 117 -68 115 -44 Q 112 -18 84 6 L 72 12 L 56 2 Q 85 -29 93 -52 Q 83 -77 62 -78 Z',1.9);
 relief(c,p,'M 56 0 Q 72 -9 81 -3 Q 87 8 73 15 L 58 17 Z',.9);
 // Escudo ovalado suizo apoyado en el suelo (cruz sobre campo de líneas).
 relief(c,p,'M 81 -9 Q 127 -22 169 -2 L 179 40 L 171 155 Q 141 193 106 155 L 84 63 Z',3.2);
 cut(c,p,'M 95 0 Q 130 -9 161 4 L 164 147 Q 137 174 114 148 L 97 52 Z',1.5);
 for(let i=0;i<13;i++)cut(c,p,`M ${106+i*4} 13 L ${110+i*4} 143`,.67);
 relief(c,p,'M 121 41 L 145 40 L 146 67 L 164 67 L 165 95 L 146 96 L 146 126 L 119 126 L 119 98 L 101 98 L 101 70 L 121 69 Z',2.0);
 // Drapeados con pliegues centrales y volumen sobre ambas rodillas.
 for(const d of [
  'M -11 -16 C -9 40 -57 72 -93 84 Q -69 99 -51 126',
  'M 12 -8 Q -12 63 -77 91 Q -51 108 -44 143',
  'M -44 26 Q -88 41 -107 65 Q -101 98 -82 124',
  'M -59 45 Q -26 52 -8 80 L 24 131',
  'M 38 6 Q 5 61 36 113 L 56 150',
  'M -132 141 Q -116 151 -84 157',
  'M -165 157 Q -131 170 -109 162'
 ])cut(c,p,d,1.9);
 // Arado a la derecha, integrado con el paisaje.
 cut(c,p,'M 175 124 Q 203 74 232 60 M 180 132 Q 209 92 244 76 M 208 125 L 237 164',1.8);
 T.text(c,'KORN',0,222,16,p,{pitch:.69});
}
window.NCGMonedas.registrarDibujoLegacy(ID,'obv',(c,p)=>{figure(c,p);T.LTOP(c,'HELVETIA',p,{span:1.22,size:31,r:320});});
})();

})(window.NCGClassicContext);
