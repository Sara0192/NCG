'use strict';

/**
 * Control de la vista de la moneda en un expediente.
 *
 * Responsabilidades:
 *   1. Evitar dibujos obsoletos al cambiar de expediente, cara o modo.
 *   2. Cargar el grabado bajo demanda, sin bloquear el inicio del juego.
 *   3. Componer diseño, daños de la partida y estado de la superficie.
 *   4. Ofrecer la imagen segura de referencia como alternativa explícita.
 *
 * La geometría histórica está en vector_monedas.js / motor-clasico.js;
 * aquí no se definen ni se modifican grabados.
 */
const COIN_RENDER_SETTLE_MS=130;
const coinDrawRetries=new Map();
let coinRenderTimer=null;
let coinRenderTicket=0;
let coinLastDisplayedKey='';
let coinLastDisplayedCase=null;
let ncgCoinSafeMode=false;
let ncgFallbackGeneration=0;

const ncgWebkitGTK=/AppleWebKit\//.test(navigator.userAgent) &&
 !/Chrome\/|Chromium\/|Edg\//.test(navigator.userAgent);
if(ncgWebkitGTK)document.body.classList.add('ncg-webkitgtk');

function coinRenderingPaused(){
 return Boolean(document.getElementById('modal')?.classList.contains('show')||
  document.body.classList.contains('ncg-guide-open'));
}
function coinModel(view){
 return view==='vectorial'?window.NCGClassic:window.NCGMonedas;
}
function coinStateMatches(ticket,caseRecord,side,view){
 return ticket===coinRenderTicket && active===caseRecord &&
  face===side && visualMode===view && !coinRenderingPaused();
}
function coinRenderKey(coin,side,view){
 return `${coin.id}|${side}|${view}`;
}

// --------------------------- Imagen estática -------------------------------
function updateCoinSafeButton(){
 const button=$('coinSafeModeBtn');
 const token=$('coinToken');
 if(token)token.classList.toggle('ncg-static-coin',ncgCoinSafeMode);
 if(button){
  button.setAttribute('aria-pressed',String(ncgCoinSafeMode));
  button.textContent=ncgCoinSafeMode?'Volver a la vista interactiva':'Imagen segura';
 }
}
function toggleCoinSafeMode(){
 ncgCoinSafeMode=!ncgCoinSafeMode;
 coinLastDisplayedCase=null;
 updateCoinSafeButton();
 clearCoinError();
 setCoinFallbackVisible(false);
 if(!active)return;
 if(ncgCoinSafeMode&&tool==='micro')selectTool('view');
 const help=$('deskHelp');
 if(help){
  help.textContent=ncgCoinSafeMode?
   'IMAGEN DE REFERENCIA · Sin defectos de la partida. Pulsa Volver a la vista interactiva para el examen completo.':
   HINTS[tool]||HINTS.view;
 }
 window.NCGGraphics.refresh();
}
function coinFallbackPath(coin,side,view='vectorial'){
 const id=String(coin?.id||'').replace(/[^a-zA-Z0-9_\-]/g,'');
 return `assets/${view}/ligera/${id}_${side===1?'reverso':'anverso'}.webp`;
}
function setCoinFallbackVisible(visible){
 const image=$('coinFallback');
 if(!image)return;
 const show=Boolean(visible&&image.complete&&image.naturalWidth>0);
 image.hidden=!show;
 image.style.display=show?'block':'none';
}
function prepareCoinFallback(coin,side,retry=false){
 const image=$('coinFallback');
 if(!image||!coin)return;
 const path=coinFallbackPath(coin,side,visualMode);
 const generation=++ncgFallbackGeneration;
 const current=()=>generation===ncgFallbackGeneration && ncgCoinSafeMode &&
  active?.id===coin.id && face===side && coinFallbackPath(coin,side,visualMode)===path;
 image.onerror=()=>{
  if(!current())return;
  setCoinFallbackVisible(false);
  NCGLog.event('RESPALDO_IMAGEN_FALLIDO',{coin:coin.id,side,path});
  coinErrorLabel('Falta la imagen de esta cara. Pulsa Reintentar moneda.');
 };
 image.onload=()=>{
  if(!current())return;
  setCoinFallbackVisible(true);
  clearCoinError();
 };
 if(retry||image.getAttribute('src')!==path){
  setCoinFallbackVisible(false);
  image.src=path;
 }else if(image.complete){
  if(image.naturalWidth)image.onload();
  else image.onerror();
 }
}

// ---------------------------- Estados de carga -----------------------------
function coinErrorLabel(message){
 const box=$('coinFailureNotice');
 if(!box)return;
 const lang=window.NCGLocale?.language?.()||'es';
 const prefix=!ncgCoinSafeMode?
  (lang==='eu'?'Txanpona':lang==='en'?'Coin':'Moneda'):
  (lang==='eu'?'Irudi estatikoa (ez da peritaje osoa)':
   lang==='en'?'Static reference (not a full inspection)':
   'Imagen de referencia (no es un peritaje completo)');
 box.textContent=prefix+' · '+(window.NCGLocale?.translate?.(message,lang)||message);
 box.hidden=false;
}
function clearCoinError(){
 const box=$('coinFailureNotice');
 if(box){box.hidden=true;box.textContent='';}
}
function paintCoinStatus(message,failed=false){
 coinLastDisplayedCase=null;
 const canvas=$('coinCanvas');
 const ctx=canvas?.getContext('2d');
 if(ctx){
  try{
   ctx.setTransform(1,0,0,1,0,0);
   ctx.clearRect(0,0,canvas.width,canvas.height);
  }catch(_error){}
 }
 if(canvas)canvas.style.opacity='0';
 setCoinFallbackVisible(false);
 if(ctx){
  try{
   ctx.save();
   ctx.fillStyle='#b8b1a0';
   ctx.beginPath();ctx.arc(430,430,337,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#25342d';
   ctx.textAlign='center';ctx.font='bold 34px Georgia';
   ctx.fillText('NCG',430,434);
   ctx.restore();
   canvas.style.opacity='1';
  }catch(_error){}
 }
 if(failed)coinErrorLabel(message);
 else clearCoinError();
}

// ---------------------------- Programador ----------------------------------
window.NCGGraphics={
 refresh(){
  cancelQueuedRender();
  ++coinRenderTicket; // También invalida promesas pendientes de la vista anterior.
  if(!coinRenderingPaused()&&active)drawCoin();
 }
};
function cancelQueuedRender(){
 if(coinRenderTimer!==null){
  clearTimeout(coinRenderTimer);
  coinRenderTimer=null;
 }
}
function hidePreviousCoin(){
 const loupe=$('loupe');
 if(loupe)loupe.style.display='none';
 const canvas=$('coinCanvas');
 if(canvas)canvas.style.opacity='0';
 setCoinFallbackVisible(false);
}
function drawCoin(){
 if(!active||coinRenderingPaused())return;
 const key=coinRenderKey(active,face,visualMode);
 if(active!==coinLastDisplayedCase||key!==coinLastDisplayedKey)hidePreviousCoin();
 const ticket=++coinRenderTicket;
 cancelQueuedRender();
 coinRenderTimer=setTimeout(()=>{
  coinRenderTimer=null;
  if(ticket===coinRenderTicket)renderCoinSettled(ticket);
 },COIN_RENDER_SETTLE_MS);
}

// ----------------------- Carga y composición -------------------------------
function loadCoinForRender(model,coin,side,view,ticket,caseRecord){
 paintCoinStatus('Cargando moneda…');
 model.cargarCara(coin,side).then(()=>{
  if(coinStateMatches(ticket,caseRecord,side,view))drawCoin();
 }).catch(error=>{
  if(!coinStateMatches(ticket,caseRecord,side,view))return;
  paintCoinStatus('Error al cargar · Reintentar',true);
  NCGLog.error(error,{phase:'coin-load',coin:coin.id,side});
  showFileWarning(error.message+' · Usa el botón Reintentar moneda.',false);
 });
}
function renderCoinDefects(ctx,defects,coin){
 const metal=metalFamilia(coin);
 for(const defect of defects){
  if(defect.name==='chopmark')continue;
  ctx.save();
  try{
   ctx.globalCompositeOperation='source-atop';
   NCGVector.renderDefect(ctx,defect,metal);
  }finally{ctx.restore();}
 }
 for(const defect of defects){
  if(defect.name!=='chopmark')continue;
  ctx.save();
  try{
   ctx.globalCompositeOperation='source-atop';
   ctx.translate(430+(defect.x||0)*.55,430+(defect.y||0)*.55);
   ctx.rotate((defect.rot||0)*Math.PI/180);
   ctx.font=`bold ${Math.round(110*(defect.size||1))}px serif`;
   ctx.textAlign='center';
   ctx.textBaseline='middle';
   ctx.fillStyle='rgba(33,40,43,.62)';
   ctx.strokeStyle='rgba(245,240,220,.38)';
   ctx.lineWidth=3;
   ctx.fillText('又',2,3);
   ctx.strokeText('又',0,0);
  }finally{ctx.restore();}
 }
}
function composeCoin(ctx,coin,side,view){
 const performance=window.NCGQoL?.getActivePerformance?.();
 const quality=view==='realista'&&performance!=='safe'?'high':'low';
 const base=renderVectorBase(coin,side,active.variant?.shader,quality);
 if(!base)throw Error('El motor vectorial no generó '+coin.id);
 ctx.setTransform(1,0,0,1,0,0);
 ctx.globalCompositeOperation='source-over';
 ctx.globalAlpha=1;
 ctx.filter='none';
 ctx.shadowBlur=0;
 ctx.shadowColor='transparent';
 ctx.clearRect(0,0,860,860);
 ctx.drawImage(base,0,0,860,860);
 renderCoinDefects(ctx,active.variant?.defects?.[side]||[],coin);
 ctx.globalCompositeOperation='source-over';
 ctx.globalAlpha=1;
 // El shader ya se aplica en render_base.js → NCGVector.render.
}
function renderCoinSettled(ticket){
 if(ticket!==coinRenderTicket||!active||coinRenderingPaused())return;
 const canvas=$('coinCanvas');
 const ctx=canvas?.getContext('2d');
 if(!ctx)return;
 const coin=currentCoin();
 const side=face;
 const view=visualMode;
 const caseRecord=active;
 if(!coin){paintCoinStatus('Moneda no encontrada',true);return;}
 if(ncgCoinSafeMode){
  prepareCoinFallback(coin,side);
  updateCoinSafeButton();
  return;
 }
 updateCoinSafeButton();
 const model=coinModel(view);
 if(!model){paintCoinStatus('Motor de monedas no disponible',true);return;}
 if(!model.estaLista(coin,side)){
  loadCoinForRender(model,coin,side,view,ticket,caseRecord);
  return;
 }
 try{
  composeCoin(ctx,coin,side,view);
  if(!coinStateMatches(ticket,caseRecord,side,view))return;
  canvas.style.opacity='1';
  coinLastDisplayedCase=active;
  coinLastDisplayedKey=coinRenderKey(coin,side,view);
  setCoinFallbackVisible(false);
  clearCoinError();
  coinDrawRetries.delete(coinLastDisplayedKey);
 }catch(error){
  NCGLog.error(error,{phase:'coin-render',coin:coin.id,side});
  paintCoinStatus('Error al dibujar · Reintentar',true);
  const key=coinRenderKey(coin,side,view);
  const attempts=coinDrawRetries.get(key)||0;
  if(attempts<1){
   coinDrawRetries.set(key,attempts+1);
   setTimeout(()=>{
    if(coinStateMatches(ticket,caseRecord,side,view))drawCoin();
   },850);
  }else{
   showFileWarning('No se pudo dibujar '+coin.name+
    '. Reintenta la moneda desde la bandeja o abre el registro.',false);
  }
 }
}
function retryCurrentCoin(){
 if(!active)return;
 const caseRecord=active;
 const coin=currentCoin();
 const side=face;
 const view=visualMode;
 if(!coin)return;
 if(ncgCoinSafeMode){
  clearCoinError();
  prepareCoinFallback(coin,side,true);
  return;
 }
 const model=coinModel(view);
 if(!model){coinErrorLabel('Motor de monedas no disponible');return;}
 coinDrawRetries.delete(coinRenderKey(coin,side,view));
 _vectorScratch=null;
 model.reintentar(coin,side).then(()=>{
  if(active===caseRecord&&face===side&&visualMode===view&&!ncgCoinSafeMode)drawCoin();
 }).catch(error=>{
  if(active!==caseRecord||face!==side||visualMode!==view||ncgCoinSafeMode)return;
  paintCoinStatus('Error al cargar · Reintentar',true);
  NCGLog.error(error,{phase:'coin-manual-retry',coin:coin.id,side});
  showFileWarning(error.message,false);
 });
}
