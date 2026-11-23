'use strict';

/**
 * Registro local de diagnóstico de NCG.
 *
 * Antes esta interfaz era un objeto vacío: las llamadas NCGLog.error y
 * NCGLog.event no conservaban nada. El registro ahora es un búfer circular
 * en memoria. No realiza solicitudes de red ni modifica los guardados.
 *
 * Se limita tanto el número de entradas como el tamaño de cada dato para
 * no agravar bloqueos de WebKitGTK durante sesiones largas.
 */
(function installDiagnosticLog(root){
 const MAX_ENTRIES=350;
 const MAX_DETAIL_CHARS=1800;
 const entries=[];
 let total=0;
 let dropped=0;
 let renderCount=0;
 let totalRenderTime=0;
 let maximumRenderTime=0;

 function safeDetail(detail){
  if(detail==null)return null;
  try{
   const seen=new WeakSet();
   const text=JSON.stringify(detail,(key,value)=>{
    if(typeof value==='bigint')return String(value);
    if(typeof value==='function')return '[función]';
    if(value&&typeof value==='object'){
     if(seen.has(value))return '[referencia circular]';
     seen.add(value);
    }
    return value;
   });
   return (text||'').slice(0,MAX_DETAIL_CHARS);
  }catch(_error){return String(detail).slice(0,MAX_DETAIL_CHARS);}
 }

 function add(level,name,details){
  const entry={
   at:new Date().toISOString(),
   level,
   name:String(name||'Sin nombre').slice(0,140),
   detail:safeDetail(details)
  };
  total++;
  if(entries.length>=MAX_ENTRIES){entries.shift();dropped++;}
  entries.push(entry);
 }

 function event(name,details){add('event',name,details);}
 function error(cause,context){
  const name=String(cause?.message||cause||'Error desconocido');
  const stack=typeof cause?.stack==='string'?cause.stack.slice(0,900):null;
  add('error',name,{context,stack});
 }
 function sampledRender(details){
  const ms=Number(details?.ms);
  if(!Number.isFinite(ms)||ms<0)return;
  renderCount++;
  totalRenderTime+=ms;
  maximumRenderTime=Math.max(maximumRenderTime,ms);
  // Muestreo por bloques: no registrar cada fotograma/redibujado individual.
  if(renderCount%20===0){
   add('render','Rendimiento del renderizador',{
    renders:renderCount,
    averageMs:Math.round(totalRenderTime/renderCount*10)/10,
    maximumMs:maximumRenderTime,
    last:details
   });
  }
 }
 function textFile(){
  return entries.map(e=>{
   const info=e.detail?' '+e.detail:'';
   return `[${e.at}] ${e.level.toUpperCase()} ${e.name}${info}`;
  }).join('\n');
 }
 function exportTxt(){
  const blob=new Blob([textFile()+'\n'],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download='NCG_diagnostico.txt';
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  return true;
 }
 function clear(){
  entries.length=0;
  total=0;dropped=0;renderCount=0;totalRenderTime=0;maximumRenderTime=0;
 }
 function stats(){
  return {
   count:entries.length,total,dropped,storageOK:true,fileLinked:false,
   renders:renderCount,
   meanRenderMs:renderCount?Math.round(totalRenderTime/renderCount*10)/10:0,
   maxRenderMs:maximumRenderTime
  };
 }

 root.NCGLog=Object.freeze({
  event,error,sampledRender,exportTxt,textFile,clear,stats,
  snapshot:()=>entries.map(entry=>({...entry})),
  // Métodos heredados sin persistencia a disco. El usuario exporta el TXT.
  panel:()=>null,
  closePanel:()=>{},
  linkFile:()=>false,
  saveFile:async()=>false
 });
})(window);
