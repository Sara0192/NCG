// Noruega 2 coronas 1900: escudo con león armado, corona y marca de Kongsberg.
// https://en.numista.com/15295
(() => {
 const V=window.NCGVector;
 const grabar=V.relieveManual(({ctx,p,pieza,linea,punto,texto,arco})=>{
  for(let i=0;i<108;i++){
   const a=i*Math.PI/54;
   punto(141*Math.sin(a),141*Math.cos(a),1.27);
  }
  arco('2 KRONER',119,26,false,1.16);
  pieza('M-53 -37H53L51 29Q48 60 0 76Q-48 60 -51 29Z',.83);
  linea('M-48 -32H48L46 29Q43 56 0 70Q-43 56 -46 29Z',1.5,false);
  ctx.save();
  ctx.clip(new Path2D('M-47 -31H47L45 29Q42 55 0 69Q-42 55 -45 29Z'));
  for(let x=-42;x<=42;x+=4)linea(`M${x} -31V70`,.67);
  ctx.restore();
  V.parts.royalCrown(ctx,0,-46,.54,p);
  // El blasón noruego lleva un hacha de asta larga entre ambas garras.
  linea('M-23 -21L-20 44',2.6,false);
  pieza('M-22 -21Q-37 -29 -40 -9Q-33 -12 -23 -11Z',1.03);
  V.parts.lion(ctx,7,13,.43,p,false,{crown:true});
  for(const sign of [-1,1]){
   ctx.save();ctx.scale(sign,1);
   linea('M-5 105Q-53 96 -78 56Q-101 15 -88 -40',2.15,false);
   for(let j=0;j<=10;j++){
    const a=j*.183,x=-10-82*Math.sin(a),y=101-94*(1-Math.cos(a));
    ctx.save();
    ctx.translate(x,y);ctx.rotate(-.22*j);
    pieza('M0 0Q-13 -2 -23 -15Q-12 -18 -4 -10L0 0 M0 0Q-2 -16 7 -26Q17 -15 0 0',.85);
    linea('M0 0L-18 -14 M0 0Q4 -8 7 -22',.77);
    ctx.restore();
   }
   ctx.restore();
  }
  pieza('M-18 103Q-11 99 -4 104L0 102 4 104Q11 99 18 103L16 112 9 111 3 108 0 114 -3 108 -9 111 -16 112Z',.90);
  texto('19',-31,125,19);
  texto('00',31,125,19);
  linea('M-7 118L7 131 M7 118L-7 131 M-10 123l6 -6 M4 117l6 6',2,false);
 },{suave:true});
 window.NCGMonedas.registrarDibujoLegacy("2kroner_noruega_1900","rev",grabar);
 V.editarCunho("2kroner_noruega_1900",1,{scale:1.025,x:0,y:0,depth:.62,glare:.39,field:.13});
})();
