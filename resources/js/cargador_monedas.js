(function(root){
 'use strict';
 const pending=new Map(),failures=new Map();
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
  const coin=root.GAME_DATA?.coins?.find(c=>c.id===id);
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
 let preloadTimer=null,preloadGeneration=0;
 function precargar(coin){
  const generation=++preloadGeneration;
  if(preloadTimer!==null){clearTimeout(preloadTimer);preloadTimer=null;}
  if(!coin||estaLista(coin,0))return;
  preloadTimer=setTimeout(()=>{
   preloadTimer=null;
   if(generation!==preloadGeneration)return;
   cargarCara(coin,0).catch(e=>void e);
  },550);
 }
 root.NCGMonedas={cargarCara,cargarPar,estaLista,ruta,registrarCara,registrarDibujoLegacy,precargar,fallos:failures,reintentar:(coin,side)=>cargarCara(coin,side,true)};
})(window);
