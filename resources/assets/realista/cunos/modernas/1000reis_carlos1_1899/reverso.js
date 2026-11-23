// NCG V18.18.0 · dibujo del manto real de 1000 réis (KM#540).
// Referencia de composición y leyenda: https://en.numista.com/17841
(() => {
 const {curvePts, dot, ell, emboss, iline, legend, poly, rline} = window.NCGVector.legacyTools;

 function grabar(ctx, p) {
  const volumen = (path, off = 1.7) => {
   const metal = new Path2D(path);
   // La misma ruta Bézier delimita el metal, la sombra y el borde.
   const base = ctx.createLinearGradient(-110, 135, 105, -130);
   base.addColorStop(0, p.deep);
   base.addColorStop(.42, p.base);
   base.addColorStop(1, p.light);
   ctx.save();
   ctx.fillStyle = p.shadow;
   ctx.globalAlpha = .48;
   ctx.translate(-off, off);
   ctx.fill(metal);
   ctx.restore();
   ctx.save();
   ctx.fillStyle = base;
   ctx.fill(metal);
   ctx.lineWidth = .9;
   ctx.strokeStyle = p.deep;
   ctx.globalAlpha = .72;
   ctx.stroke(metal);
   ctx.restore();
  };
  const relieve = (points, width = 2.1) => rline(ctx, curvePts(points), p, width);
  const surco = (points, width = 1.0) => iline(ctx, curvePts(points), p, width);

  ctx.save();
  ctx.scale(2.08, 2.08);

  // Los cordones separan los dos paños del campo.
  for (const sign of [-1, 1]) {
   ctx.save();
   ctx.scale(sign, 1);
   volumen('M-19 -69 C-35 -69 -47 -83 -68 -77 C-79 -73 -87 -57 -106 -61 C-118 -49 -115 -22 -116 2 C-117 32 -117 70 -100 87 C-75 111 -43 108 -17 95 L-8 -43 Z');
   relieve([[-79,-67],[-98,-57],[-107,-31],[-109,3],[-106,31]],3.6);
   surco([[-89,-63],[-96,-31],[-96,7],[-90,37]]);
   surco([[-80,-67],[-83,-26],[-78,14],[-74,61]],1.3);
   surco([[-72,-66],[-67,-37],[-70,-11],[-61,19]]);
   relieve([[-109,27],[-99,20],[-87,22],[-76,28]],2.8);
   relieve([[-111,52],[-99,47],[-89,49],[-81,62]],2.5);
   relieve([[-99,76],[-82,80],[-63,91],[-40,95]],2.3);
   volumen('M-81 -74 C-90 -93 -107 -91 -112 -81 C-120 -68 -108 -61 -95 -65 C-109 -59 -125 -67 -129 -54 C-133 -46 -126 -42 -119 -45 C-109 -46 -101 -56 -94 -59 Z');
   surco([[-112,-80],[-104,-73],[-93,-73]]);
   relieve([[-109,-59],[-120,-41],[-124,-25],[-130,-14]],2.9);
   volumen('M-132 -18 Q-125 -15 -124 -9 L-123 1 Q-130 5 -135 1 L-135 -9 Z',1.1);
   for (const x of [-132,-129,-126]) relieve([[x,-10],[x-1,0]],.8);
   ctx.restore();
  }

  // Manto de hombros, cuerpo del escudo y cinco quinas.
  volumen('M0 -86 C-12 -72 -25 -62 -46 -60 Q-64 -59 -86 -64 C-73 -47 -52 -45 -33 -48 Q-10 -51 0 -65 Q10 -51 33 -48 C52 -45 73 -47 86 -64 Q64 -59 46 -60 C25 -62 12 -72 0 -86 Z');
  volumen('M-73 -49 Q-38 -45 0 -48 Q38 -45 73 -49 L70 64 C70 89 45 88 27 92 Q8 96 0 110 Q-8 96 -27 92 C-45 88 -70 89 -70 64 Z',2.5);
  relieve([[-67,-44],[-65,45],[-59,74],[-29,85],[-11,91],[0,101],[11,91],[29,85],[59,74],[65,45],[67,-44]],2.3);
  for (const x of [-57,-51,-45,-39,-33,33,39,45,51,57]) surco([[x,-44],[x,68]],.75);
  for (const [x,y] of [[-46,-33],[0,-33],[46,-33],[-46,14],[46,14],[-44,60],[44,60]]) {
   ctx.save();
   ctx.translate(x,y);
   emboss(ctx,c=>poly(c,[[-7,-6],[-7,-11],[-3,-11],[-3,-8],[-2,-8],[-2,-11],[2,-11],[2,-8],[3,-8],[3,-11],[7,-11],[7,-6],[5,-4],[5,7],[-5,7],[-5,-4]]),p,{off:1});
   surco([[0,6],[0,0]],1.3);
   ctx.restore();
  }
  volumen('M-31 -15 L31 -15 L31 48 C29 60 15 57 0 65 C-15 57 -29 60 -31 48 Z',1.6);
  for (const [x,y] of [[0,-1],[-17,17],[0,17],[17,17],[0,35]]) {
   ctx.save();
   ctx.translate(x,y);
   volumen('M-6 -7 L6 -7 L6 4 Q5 9 0 10 Q-5 9 -6 4 Z',.85);
   for (const [dx,dy] of [[-3,-3],[3,-3],[0,0],[-3,3],[3,3]]) dot(ctx,dx,dy,1.5,p);
   ctx.restore();
  }
  for (const sign of [-1,1]) {
   ctx.save();
   ctx.scale(sign,1);
   relieve([[-5,97],[-18,88],[-28,86],[-41,93],[-32,101],[-22,99]],3.1);
   relieve([[-16,78],[-35,75],[-51,77],[-59,72]],2.4);
   ctx.restore();
  }

  // Corona cerrada y remate de cruz.
  volumen('M-44 -86 C-49 -94 -58 -105 -53 -116 Q-49 -126 -28 -122 Q-16 -133 0 -123 Q16 -133 28 -122 Q49 -126 53 -116 C58 -105 49 -94 44 -86 L34 -78 L-34 -78 Z',2.4);
  volumen('M-44 -89 Q0 -101 44 -89 L37 -76 Q0 -82 -37 -76 Z');
  for (const sign of [-1, 1]) {
   ctx.save();
   ctx.scale(sign,1);
   relieve([[-43,-93],[-48,-108],[-40,-118],[-21,-119],[-9,-123],[0,-126]],2.5);
   relieve([[-23,-95],[-29,-109],[-19,-120],[-6,-126]],2.6);
   for (let i=0;i<5;i++) dot(ctx,-42+i*8,-86-i*.6,2.6,p);
   ctx.restore();
  }
  relieve([[0,-99],[-2,-116],[0,-130]],3);
  emboss(ctx,c=>ell(c,0,-131,4.2,4.8,0),p,{off:1.2});
  relieve([[0,-148],[0,-135]],2.9);
  relieve([[-5,-143],[5,-143]],2.9);
  ctx.restore();
  legend(ctx,'1000 REIS',317,Math.PI,42,p,{bottom:true,span:1.22});
 }
 grabar.relieveDocumentado = true;
 window.NCGMonedas.registrarDibujoLegacy("1000reis_carlos1_1899","rev",grabar);
 window.NCGVector.editarCunho('1000reis_carlos1_1899',1,{scale:.97,x:0,y:0,depth:.58,glare:.39,field:.17});
})();
