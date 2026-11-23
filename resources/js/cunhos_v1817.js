(function(root){'use strict';
const work=new Map(),PI=Math.PI,TAU=2*PI;
function regKey(id,cara){return id+'|'+cara;}
function registrar(id,cara,style){
 if(!root.NCGMonedas||!root.NCGVector)throw Error('Motor numismático sin cargar');
 const key=regKey(id,cara);work.set(key,style);
 const dibujo=function(c,p,opt){
   c.save();c.beginPath();c.arc(0,0,407,0,TAU);c.arc(0,0,276,0,TAU,true);c.clip('evenodd');
   const orig=opt?.coin?.vec?.[cara]; if(orig)root.NCGVector.renderSpec(c,p,orig,opt);
   c.restore();
   c.save();c.beginPath();c.arc(0,0,273,0,TAU);c.clip();
   if(['alfonso','vittorio','umberto','nicholas','alfonsoRight','vittorioRight','umbertoRight'].includes(style)){
     const mir=style.endsWith('Right');
     if(mir){c.save();c.scale(-1,1);}
     portrait(c,p,style.replace('Right',''),opt);
     if(mir)c.restore();
   }
   else if(style==='savoyArms')savoyArms(c,p,opt);
   else if(style==='liraWreath')liraWreath(c,p,opt);
   else if(style==='russianArms')russianArms(c,p,opt);
   else if(style==='belgianArms')belgianArms(c,p,opt);
   else if(style==='spanishArms')spanishArms(c,p,opt);
   c.restore();
 };
 dibujo.relieveDocumentado=true;
 root.NCGMonedas.registrarDibujoLegacy(id,cara,dibujo);
 root.NCGVector.editarCunho(id,cara==='rev'?1:0,{scale:1,x:0,y:0,depth:.35,glare:.53});
}
const P=(x)=>new Path2D(x);
function bulge(c,p,d,depth=2.6){
 const path=P(d);c.save();c.translate(-depth,-depth*.75);c.fillStyle=p.shadow;c.globalAlpha=.64;c.fill(path);c.restore();
 const g=c.createLinearGradient(-125,-155,125,180);
 g.addColorStop(0,p.light);g.addColorStop(.27,p.mid);g.addColorStop(.58,p.base);g.addColorStop(.81,p.mid);g.addColorStop(1,p.deep);
 c.save();c.fillStyle=g;c.fill(path);c.strokeStyle=p.deep;c.lineWidth=1.8;c.globalAlpha=.9;c.stroke(path);c.restore();
}
function inc(c,p,d,w=2.1,a=.73){
 const path=P(d);
 c.save();c.globalAlpha=a;c.lineJoin='round';c.lineCap='round';
 c.lineWidth=w+1;c.strokeStyle=p.deep;c.stroke(path);
 c.translate(-.9,-1);c.lineWidth=Math.max(.65,w*.39);c.strokeStyle=p.light;c.stroke(path);c.restore();
}
function incP(c,p,points,w=1.7,a=.6){
 if(!points.length)return; c.save();
 c.beginPath();c.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length-1;i++)c.quadraticCurveTo(points[i][0],points[i][1],(points[i][0]+points[i+1][0])/2,(points[i][1]+points[i+1][1])/2);
 c.lineTo(...points.at(-1));
 c.lineWidth=w+1;c.lineCap='round';c.strokeStyle=p.deep;c.globalAlpha=a;c.stroke();
 c.translate(-1,-.8);c.lineWidth=w*.45;c.strokeStyle=p.light;c.stroke();c.restore();
}
function fill(c,p,d,col='mid',alpha=1){c.save();c.fillStyle=p[col]||col;c.globalAlpha*=alpha;c.fill(P(d));c.restore();}
function smoothFrame(c,p){
 c.save();c.strokeStyle=p.light;c.globalAlpha=.12;c.lineWidth=3;c.beginPath();c.arc(0,0,262,0,TAU);c.stroke();c.restore();
}
function portrait(c,p,style,opt){
 c.save();
 const invert=style==='vittorio'||style==='umberto';if(invert)c.scale(-1,1);
 bulge(c,p,'M-93 125 C-65 157 -47 181 -66 224 C-100 245 -129 257 -144 272 L204 272 C166 216 155 177 151 116 C86 140 13 143 -93 125 Z',2);
 if(style==='alfonso'){
  bulge(c,p,'M130 -208 C60 -238 -53 -229 -110 -187 C-153 -157 -166 -91 -162 -57 C-176 -29 -198 -13 -199 8 C-194 20 -168 27 -169 36 C-182 47 -174 54 -160 57 C-181 65 -181 81 -162 91 C-158 123 -128 133 -96 134 C-59 143 -29 140 -12 149 C-8 201 19 240 54 270 L203 270 C175 203 159 160 162 102 C192 49 189 -104 130 -208 Z');
  fill(c,p,'M-116 -190 Q-60 -227 39 -223 Q144 -223 166 -117 Q180 -75 176 -7 Q161 -45 125 -50 Q90 -82 87 -135 Q24 -151 -14 -151 Q-83 -131 -133 -92 Z','deep',.37);
  for(let i=0;i<24;i++){
   const u=i/23,x=-119+u*251, y=-174-26*Math.sin(u*PI)+19*u;
   incP(c,p,[[x-20,y+19],[x-4,y-16-i%4*4],[x+13,y-26],[x+33,y-17],[x+30,y+9]],1.25,.44+(i%4)*.06);
  }
  for(let i=0;i<9;i++){let y=-129+i*14;inc(c,p,`M105 ${y-12} Q154 ${y-18} 167 ${y+7} Q159 ${y+21} 131 ${y+26}`,1.2,.5);}
  for(let row=0;row<5;row++)for(let j=0;j<9-row;j++){
   const x=-64+j*24+row*8,y=-141+row*24;
   inc(c,p,`M${x-13} ${y+15} C${x-8} ${y-13} ${x+12} ${y-17} ${x+19} ${y-1} C${x+25} ${y+10} ${x+6} ${y+23} ${x+1} ${y+11}`,1.1,.43);
  }
  inc(c,p,'M-128 -15 Q-96 11 -77 16 Q-61 29 -71 45',1.65,.34);
  inc(c,p,'M-148 29 Q-126 42 -114 34 M-134 67 Q-118 61 -103 65',1.1,.41);
  inc(c,p,'M-97 106 Q-61 123 -27 106 Q-17 99 -12 96',1.5,.35);

  inc(c,p,'M-160 -58 Q-133 -85 -106 -68 Q-99 -60 -97 -52',3,.92);
  inc(c,p,'M-153 -48 Q-125 -66 -107 -48 Q-127 -32 -148 -39',2.3,.80);
  fill(c,p,'M-151 -44 Q-128 -54 -114 -46 Q-126 -35 -143 -37 Z','deep',.55);
  inc(c,p,'M-171 5 C-183 15 -168 22 -147 18',1.6,.78);
  inc(c,p,'M-173 49 Q-153 44 -135 53',1.6,.65);
  inc(c,p,'M-154 74 Q-127 85 -117 74',2,.78);
  inc(c,p,'M-153 86 Q-119 111 -88 104 Q-53 98 -41 83',1.3,.47);
  ear(c,p,48,-35,1);
  inc(c,p,'M-89 131 Q-25 139 24 127',1.8,.51);
  inc(c,p,'M-12 147 Q18 197 36 213 Q82 250 132 259',1.5,.50);
 }else if(style==='vittorio'){
  bulge(c,p,'M113 -203 C49 -239 -80 -233 -130 -178 C-155 -133 -168 -75 -165 -35 C-181 -15 -207 3 -196 17 C-180 22 -171 32 -159 41 C-179 56 -170 65 -150 67 C-176 83 -162 96 -138 101 C-133 126 -111 137 -67 143 C-41 148 -15 148 4 153 C8 199 18 239 39 274 L213 274 C177 203 166 157 155 113 C187 34 197 -115 113 -203 Z');
  fill(c,p,'M-135 -184 Q-84 -242 32 -232 Q141 -219 160 -128 Q168 -86 155 -52 Q118 -100 77 -106 Q20 -149 -58 -135 Q-121 -129 -147 -85Z','deep',.35);
  for(let i=0;i<29;i++){const t=i/28,x=-130+t*247,y=-163-47*Math.sin(t*PI)+20*t;
   incP(c,p,[[x-10,y+18],[x+4,y-12-i%5*3],[x+25,y-15],[x+31,y+14]],1.3,.57);}
  ear(c,p,38,-21,1);
  inc(c,p,'M-162 -44 Q-124 -64 -96 -46',2.8,.75);inc(c,p,'M-158 -35 Q-127 -47 -105 -32',1.6,.77);
  inc(c,p,'M-166 19 Q-177 26 -151 28',1.8,.58);
  bulge(c,p,'M-156 45 Q-121 29 -91 45 Q-60 37 -33 49 Q-24 69 -41 80 Q-73 91 -96 77 Q-126 91 -165 64 Q-171 57 -156 45Z',1.4);
  for(let i=0;i<11;i++){let x=-151+i*11;inc(c,p,`M${x} 54 Q${x+10} ${55+i%4*2} ${x+16} 67`,1.05,.67);}
  bulge(c,p,'M-103 94 C-75 109 -47 102 -25 116 Q-17 134 -31 142 C-19 169 -34 197 -54 216 C-70 188 -78 172 -82 146 Q-117 128 -103 94Z',1.5);
  for(let i=0;i<11;i++)inc(c,p,`M${-96+i*6} 117 Q${-92+i*5} 143 ${-53+i*2} ${174+i%4*9}`,1.0,.5);
 }else if(style==='umberto'){
  bulge(c,p,'M112 -205 Q13 -251 -95 -207 C-141 -176 -165 -117 -162 -54 C-174 -19 -195 8 -196 17 Q-184 28 -160 36 C-176 43 -172 58 -156 67 C-171 82 -150 88 -143 95 Q-121 132 -70 138 Q-23 143 -9 155 Q5 210 40 269 L195 269 Q174 183 161 112 Q199 32 183 -107 Q170 -173 112 -205Z');
  fill(c,p,'M-137 -176 Q-86 -244 33 -228 Q137 -217 161 -133 Q178 -71 161 -45 Q107 -107 49 -124 Q-35 -149 -127 -92Z','deep',.4);
  for(let i=0;i<26;i++){const x=-127+i*10,y=-187-18*Math.sin(i/26*PI);incP(c,p,[[x-12,y+9],[x-3,y-12],[x+12,y-16],[x+23,y+8]],1.35,.55);}
  ear(c,p,36,-22,1);inc(c,p,'M-150 -48 Q-121 -66 -105 -48',2.5,.75);
  inc(c,p,'M-154 -36 Q-128 -47 -107 -35',2,.65);
  bulge(c,p,'M-161 51 Q-133 31 -101 41 Q-70 29 -37 44 Q-12 30 8 17 Q-9 59 -43 77 Q-74 84 -99 64 Q-135 84 -178 69 Q-185 60 -161 51Z',1.6);
  for(let i=0;i<15;i++){let x=-169+i*11;inc(c,p,`M${x} 58 Q${x+11} 44 ${x+22} ${57-(i>8?6:0)}`,1.1,.62);}
  inc(c,p,'M-138 91 Q-99 118 -67 103',1.5,.45);
 }else{ // Nicolás II, hacia izquierda
  bulge(c,p,'M143 -196 Q59 -239 -61 -209 C-131 -183 -164 -130 -160 -68 C-176 -35 -189 -16 -185 3 Q-183 14 -157 19 C-172 33 -165 47 -153 52 C-170 61 -160 72 -148 83 Q-139 127 -91 142 Q-44 147 -21 145 Q4 212 39 266 L197 266 Q163 189 166 118 Q209 36 187 -97 Q175 -165 143 -196Z');
  fill(c,p,'M-144 -179 Q-58 -237 76 -211 Q167 -182 174 -84 L161 -31 Q115 -98 44 -116 Q-61 -128 -146 -86Z','deep',.37);
  for(let i=0;i<24;i++){const x=-135+i*12,y=-167-37*Math.sin(i/24*PI);incP(c,p,[[x-9,y+13],[x+3,y-13-i%3*2],[x+18,y-19],[x+21,y+13]],1.15,.43);}
  for(let i=0;i<7;i++)inc(c,p,`M${-20+i*23} -104 Q${1+i*18} -76 ${14+i*19} -49`,1.2,.38);
  ear(c,p,46,-10,1);inc(c,p,'M-153 -43 Q-125 -57 -109 -46',2.8,.82);
  inc(c,p,'M-153 -32 Q-130 -42 -109 -33',1.9,.8);
  inc(c,p,'M-169 20 Q-177 30 -151 31',1.8,.65);
  bulge(c,p,'M-165 46 Q-129 28 -98 43 Q-66 33 -44 47 Q-54 68 -84 67 Q-121 77 -159 61Z',1.5);
  bulge(c,p,'M-136 77 Q-113 96 -91 94 Q-57 101 -38 121 Q-37 156 -68 176 Q-100 155 -111 139 Q-144 121 -136 77Z',1.5);
  for(let i=0;i<16;i++){const x=-122+i*5;inc(c,p,`M${x} ${91+i%3*4} Q${x+7} 117 ${x+6} ${142+i%5*3}`,1.0,.55);}
 }
 c.restore();smoothFrame(c,p);
}
function ear(c,p,x,y,scale){
 c.save();c.translate(x,y);c.scale(scale,scale);
 bulge(c,p,'M0 -38 C17 -51 40 -40 42 -17 Q50 12 34 35 Q22 48 5 36 Q-9 19 -11 1 Q-14 -22 0 -38 Z',1.4);
 inc(c,p,'M8 -32 Q29 -32 34 -7 Q23 -17 13 -8 Q6 -1 13 15 Q20 30 30 13',2,.67);
 inc(c,p,'M13 -12 Q31 -9 22 4 Q13 10 22 17',2.4,.84);c.restore();
}
function leaf(c,p,x,y,a,s=1){c.save();c.translate(x,y);c.rotate(a);c.scale(s,s);bulge(c,p,'M0 0 C-13 -13 -13 -31 0 -43 C15 -29 14 -14 0 0Z',1);
 inc(c,p,'M0 -2 Q2 -22 0 -39',1.3,.65);for(const dir of [-1,1])for(let j=0;j<3;j++)inc(c,p,`M0 ${-9-j*7} Q${dir*7} ${-12-j*7} ${dir*8} ${-18-j*7}`,0.7,.5);c.restore();}
function wreath(c,p,kind='laurel'){
 for(let sig of [-1,1]){
  const pts=[];
  for(let i=0;i<=22;i++){const a=i/22;pts.push([sig*(115+96*Math.sin(a*1.23)),194-365*a]);}
  incP(c,p,pts,3.4,.83);
  for(let i=0;i<19;i++){
   const a=i/19,xx=sig*(115+96*Math.sin(a*1.23)),yy=194-365*a;
   leaf(c,p,xx+sig*7,yy-5,sig*(.5+.65*a),.71);
   leaf(c,p,xx-sig*7,yy+3,sig*(-.50-.42*a),.65);
   if(kind==='oak'&&i%5===0){bulge(c,p,`M${xx-4} ${yy-9} q7 -10 14 0 q-6 15 -14 0Z`,1.1);}
  }
 }
 inc(c,p,'M-31 192 Q0 204 31 190 M-25 203 Q-5 219 20 207',2.6,.7);
}
function crown(c,p,y=-125,scale=1){c.save();c.translate(0,y);c.scale(scale,scale);
 bulge(c,p,'M-71 10 Q-78 -14 -59 -36 L-47 -3 L-29 -46 L-12 -5 L0 -62 L14 -5 L30 -43 L46 -2 L59 -33 Q77 -14 68 10 Z');
 bulge(c,p,'M-75 8 L75 8 L73 32 L-73 32Z',1.1);
 inc(c,p,'M-65 15 Q0 26 65 15',1.8,.65);
 for(let i=-5;i<=5;i++)bulge(c,p,`M${i*13-3} 13 q3 -6 6 0 q-2 6 -6 0Z`,.6);c.restore();}
function shieldSavoy(c,p,x=0,y=7,s=1){c.save();c.translate(x,y);c.scale(s,s);
 bulge(c,p,'M-91 -92 L91 -92 L88 43 Q67 112 0 145 Q-68 117 -88 43 Z',2.6);
 fill(c,p,'M-76 -83 L76 -83 L73 36 Q58 96 0 123 Q-57 97 -73 36Z','deep',.15);
 bulge(c,p,'M-10 -66 L10 -66 L10 -9 L62 -9 L62 8 L10 8 L10 87 L-10 87 L-10 8 L-61 8 L-61 -9 L-10 -9Z',1);
 inc(c,p,'M-78 -82 L78 -82 L76 36 Q58 107 0 135 Q-58 107 -76 36 Z',3,.92);
 c.restore();}
function savoyArms(c,p){wreath(c,p,'oak');shieldSavoy(c,p,0,-17,.86);crown(c,p,-191,.75);
 for(let i=0;i<17;i++){const a=PI*.13+i/16*PI*.74,xx=121*Math.cos(a),yy=23+122*Math.sin(a);
  bulge(c,p,`M${xx-7} ${yy} a7 6 0 1 0 14 0 a7 6 0 1 0 -14 0 Z`,.75);}
 inc(c,p,'M-23 136 Q0 154 23 137 M-10 153 Q0 172 10 153',2.3,.67);
 smoothFrame(c,p);
}
function liraWreath(c,p,opt){wreath(c,p);c.save();c.textAlign='center';c.textBaseline='middle';c.fillStyle=p.deep;c.font='bold 60px Georgia,serif';c.fillText('1',0,-41);
 c.font='bold 41px Georgia,serif';c.fillText('LIRA',0,20);c.font='37px Georgia,serif';c.fillText('1863',0,83);c.restore();smoothFrame(c,p);}
function russianArms(c,p,opt){
 const L=root.NCGVector.legacyTools;
 c.save();c.translate(0,-6);L.eagleDouble(c,p,{s:1.69});L.royalCrown(c,0,-193,.48,p);
 bulge(c,p,'M-50 -50 L50 -50 L48 23 Q30 61 0 73 Q-30 61 -48 23Z',1.5);
 c.save();c.translate(0,6);c.scale(.30,.30);L.stGeorge(c,p,{s:.85});c.restore();
 for(const sig of [-1,1]){
  for(let j=0;j<4;j++){
   const x=sig*(64+(j%2)*49),y=-78+j*27;
   bulge(c,p,`M${x-11} ${y-9} L${x+11} ${y-9} L${x+10} ${y+8} Q${x} ${y+17} ${x-10} ${y+8}Z`,.55);
   inc(c,p,`M${x} ${y-6} L${x} ${y+8} M${x-8} ${y+1} L${x+8} ${y+1}`,1,.47);
  }
 }
 c.restore();smoothFrame(c,p);
}
function belgianArms(c,p){
 bulge(c,p,'M-172 -164 Q-117 -171 -80 -149 Q0 -194 80 -149 Q119 -167 174 -164 Q140 -57 175 157 Q94 186 0 210 Q-94 186 -175 157 Q-138 -57 -172 -164 Z',2);
 for(const sig of [-1,1])for(let i=0;i<7;i++){
  let xx=sig*(90+i*10);inc(c,p,`M${xx} -135 Q${sig*(134+i*8)} -5 ${sig*(118+i*8)} ${144-i*5}`,1.7,.56);
 }
 crown(c,p,-193,.91);
 bulge(c,p,'M-104 -105 L104 -105 L100 48 Q81 119 0 152 Q-81 119 -100 48Z',1.6);
 fill(c,p,'M-94 -95 L94 -95 L91 42 Q76 110 0 141 Q-76 110 -91 42Z','deep',.11);
 bulge(c,p,'M-15 70 C-52 47 -46 -7 -13 -15 Q-5 -35 -22 -49 Q12 -70 30 -43 Q58 -52 51 -24 L27 -12 C48 9 39 35 15 40 Q34 57 11 78 L-7 51Z',1.6);
 inc(c,p,'M-21 5 L-69 33 L-62 46 M10 44 L31 84 M37 -31 L69 -52 M-7 60 Q-42 92 -68 60',2.9,.72);
 for(let i=0;i<11;i++){const a=Math.PI*.13+i/10*Math.PI*.77;
  let x=128*Math.cos(a),y=38+133*Math.sin(a);bulge(c,p,`M${x-5} ${y-5} Q${x+6} ${y-11} ${x+8} ${y} Q${x+4} ${y+9} ${x-5} ${y-5}Z`,.7);}
 c.save();c.textAlign='center';c.textBaseline='middle';c.font='bold 41px Georgia,serif';c.fillStyle=p.deep;
 c.fillText('20',-134,188);c.fillText('FR',132,188);c.restore();smoothFrame(c,p);
}
function spanishArms(c,p){
 bulge(c,p,'M-187 -176 C-129 -158 -102 -157 -82 -176 Q0 -201 82 -176 C105 -158 140 -151 188 -174 Q156 -28 205 213 Q0 247 -205 213 Q-157 -28 -187 -176Z',2);
 for(const sig of [-1,1]){
  for(let i=0;i<10;i++)inc(c,p,`M${sig*(109+i*7)} ${-145+i*2} Q${sig*(154+i*5)} ${-20+i*19} ${sig*(158+i*3)} ${163+i*4}`,1.9,.51);
 }
 crown(c,p,-185,.83);
 bulge(c,p,'M-113 -124 L113 -124 L103 70 Q70 164 0 190 Q-67 163 -104 70Z',2);
 inc(c,p,'M0 -117 L0 165 M-97 2 L96 2',3.2,.73);
 for(const sx of [-1,1])for(const sy of [-1,1]){
  c.save();c.translate(sx*53,sy*52);c.scale(.53,.53);
  if(sx*sy===1){ // Castilla, torre triple
   bulge(c,p,'M-44 40 L-44 -10 L-56 -10 L-56 -27 L-31 -27 L-31 -47 L-10 -47 L-10 -27 L10 -27 L10 -47 L31 -47 L31 -27 L56 -27 L56 -10 L44 -10 L44 40 Z',1.1);
   inc(c,p,'M-17 40 L-17 2 Q0 -24 17 2 L17 40',2,.62);
  }else{ // León rampante heráldico esquemático
   bulge(c,p,'M-14 37 Q-43 -10 -18 -33 Q5 -51 13 -28 Q42 -39 34 -6 L9 8 Q31 32 18 46 L0 15Z',1.2);
   inc(c,p,'M-23 20 L-48 48 M5 26 L25 53 M12 -27 L38 -40',2,.67);
  }c.restore();
 }
 for(let i=0;i<11;i++){const a=.14+i*.28,x=97*Math.cos(a+PI*.15),y=129+45*Math.sin(a+PI*.15);inc(c,p,`M${x-3} ${y} Q${x+4} ${y-7} ${x+10} ${y+3}`,2,.73);}
 bulge(c,p,'M-20 182 Q0 203 20 182 L7 224 L-7 224Z',1.5);smoothFrame(c,p);
}
root.NCGArteV1817={registrar,estilos:work};
})(window);
