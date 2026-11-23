'use strict';

/**
 * Renderizado de una cara de moneda en el gabinete.
 *
 * Separado de juego.js: este módulo prepara una superficie temporal de
 * 860 × 860, selecciona la vista y delega todo el dibujo en NCGVector.
 * La superficie se reutiliza para no acumular canvases en memoria.
 *
 * El modo Vectorial y el modo Realista conservan sus controles y shaders.
 * Si falla la pasada normal, solo se intenta una pasada de rescate de baja
 * calidad, sin efectos pesados. Nunca se sustituyen los grabados históricos.
 */
const NCG_RENDER_SIZE=860;
let _vectorScratch=null;

function createCoinScratch(){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=NCG_RENDER_SIZE;
 return canvas;
}

function renderControls(view){
 if(view==='vectorial'){
  return {metallic:.85,specularGain:1.15,contrast:1.02,
   textureBoost:.65,contactBoost:1,patinaFactor:.72};
 }
 return {metallic:.91,specularGain:1.34,contrast:1.02,
  textureBoost:1,contactBoost:1,patinaFactor:.94};
}

function renderShader(coin,side,shader,view){
 const surface=shader||{};
 if(!window.NCGShaders)return surface;

 const controls=renderControls(view);
 const lustre=surface.lustre??.45;
 const grime=surface.grime??.1;
 const boost=view==='vectorial'?1:1+Math.max(0,Math.min(1,(lustre-.67)/.27));
 const simple=view==='vectorial'||window.NCGQoL?.getActivePerformance?.()==='safe';
 const raking=tool==='light';
 const lightSlider=document.getElementById('angleRange');

 return {
  ...surface,...controls,
  specularGain:controls.specularGain*boost,
  mode:view,
  fx:{all:!simple},
  lustre:Math.min(1,lustre),
  grime:Math.min(.65,grime),
  patinaStrength:(surface.grime??.12)*1.4*controls.patinaFactor,
  dieOffset:coin.ancient?active?.variant?.dieOffsets?.[side]:null,
  lightAngle:raking&&lightSlider?Number(lightSlider.value)-90:-48,
  inspection:raking?'raking':tool==='micro'?'micro':'normal'
 };
}

function renderVectorBase(coin,side,shader,quality='high'){
 const view=visualMode;
 const models=view==='vectorial'?window.NCGClassic:window.NCGMonedas;
 if(!coin||!window.NCGVector||!models?.estaLista(coin,side))return null;

 if(!_vectorScratch)_vectorScratch=createCoinScratch();
 const renderedShader=renderShader(coin,side,shader,view);
 const started=performance.now();
 try{
  window.NCGVector.render(_vectorScratch.getContext('2d'),coin,side,renderedShader,quality);
 }catch(primaryError){
  NCGLog.error(primaryError,{phase:'render-vector-primary',coin:coin.id,side});
  _vectorScratch=createCoinScratch();
  try{
   window.NCGVector.render(_vectorScratch.getContext('2d'),coin,side,
    {...renderedShader,fx:{all:false}},'low');
   NCGLog.event('VECTOR_RESCATE',{coin:coin.id,side});
  }catch(rescueError){
   _vectorScratch=null;
   NCGLog.error(rescueError,{phase:'render-vector-rescue',coin:coin.id,side});
   throw primaryError;
  }
 }
 NCGLog.sampledRender({id:coin.id,side,quality,mode:view,
  ms:Math.round((performance.now()-started)*10)/10});
 return _vectorScratch; // Consumir inmediatamente con drawImage; no almacenar la referencia.
}
