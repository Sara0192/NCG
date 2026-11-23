(function(){
 'use strict';
 const SAVE_FILES={
   'ncg_v6_session':'partida.json',
   'ncg_v6_history':'historial.json',
   'ncg_v646_campaign_days':'campana.json',
   'ncg_v647_campaign_days':'campana_anterior.json',
   'ncg_desktop_qol_v1':'preferencias.json',
   'ncg_desktop_qol_v2':'preferencias_v2.json',
   'ncg_v64_visual_mode':'modo_visual.json',
   'ncg_gallery_visual_mode':'modo_galeria.json',
   'ncg_shader_visual_mode':'modo_shaders.json',
   'ncg_v6_sfx_enabled':'sfx_activado.json',
   'ncg_v16_sfx_volume':'volumen_sfx.json'
 };
 const values=new Map();
 const progressKeys=['ncg_v6_history','ncg_v6_session','ncg_v646_campaign_days'];
 const progressFile='progreso-v17.json';
 const recoveryFile='progreso-v17-anterior.json';
 const autoFiles=['autocopia-01.json','autocopia-02.json','autocopia-03.json'];
 let lastAutoTime=0,lastAutoDay=0;
 let confirmedManifest=null, recovered=false;
 const historyKey='ncg_v6_history';
 const historyFiles=['historial-v17-a.json','historial-v17-b.json'];
 let currentHistoryFile=null;
 async function atomicWrite(file,data){
   const tmp=full(file+'.tmp');
   await Neutralino.filesystem.writeFile(tmp,data);
   await Neutralino.filesystem.move(tmp,full(file));
 }
 const GAME_SCRIPTS=[
   'js/version.js','js/trazos.js','js/registro.js','js/creditos_inventario.js','js/creditos.js','js/tutorial_inicio.js',
   'datos/indice_monedas.js', 'js/metales.js', 'js/catalogo_extra.js',
   'js/config.js','js/utilidades.js','js/medicion.js','js/sfx.js','js/music.js',
   'js/shaders_monedas.js','js/vector_monedas.js','js/arte_cunhos_individuales.js','js/cunhos_v1817.js','js/cargador_monedas.js',
   'js/peritaje.js','js/economia.js','js/guardado.js','js/calibre.js',
   'js/render_base.js','js/visualizacion.js',
   'js/interfaz.js','js/campana.js','js/desktop_guides.js','js/quality_of_life.js','js/localization_extended.js','js/manual_english.js','js/debug_mode.js','js/juego.js'
 ];
 let dir='', native=false, ready=false, pending=new Map(), timer=null;
 let unsafe=false, flushCount=0;
 const portable=window.NCGPortable||null;
 async function portableRequest(route,body){
   const response=await fetch('/__ncg/'+route,{
     method:body?'POST':'GET',headers:{'Content-Type':'application/json','Authorization':'Bearer '+portable.token},
     body:body?JSON.stringify(body):undefined,cache:'no-store'
   });
   if(!response.ok)throw Error('Almacenamiento portable: HTTP '+response.status);
   return response.json();
 }
 async function portableLoad(){
   const data=await portableRequest('state');
   for(const [key,value] of Object.entries(data))if(key in SAVE_FILES&&typeof value==='string'){
     values.set(key,value);if(!progressKeys.includes(key))try{localStorage.setItem(key,value);}catch(_e){}
   }
   ready=true;
 }
 let portableFlushBusy=null;
 function portableWrite(key,value){
   if(!portable||!ready||!(key in SAVE_FILES))return false;
   values.set(key,String(value));pending.set(key,String(value));queueFlush(0);return true;
 }
 function portableFlush(){
   if(timer!==null){clearTimeout(timer);timer=null;}
   if(portableFlushBusy)return portableFlushBusy;
   if(!pending.size)return Promise.resolve(true);
   const batch=Object.fromEntries(pending);
   portableFlushBusy=portableRequest('save',batch).then(()=>{
     for(const [key,value] of Object.entries(batch))if(pending.get(key)===value)pending.delete(key);
     return true;
   }).catch(error=>{storageFailure(error);return false;}).finally(()=>{
     portableFlushBusy=null;if(pending.size)queueFlush(1000);
   });
   return portableFlushBusy;
 }
 const label = document.getElementById('ncgDesktopLoader');
 function status(t){if(label)label.textContent=t;}
 function norm(v){return String(v||'').replace(/[\\/]+$/,'');}
 function full(name){return dir+'/'+name;}
 function msg(err){return String(err?.message||err||'Desconocido').slice(0,360);}
 function fileMissing(e){return /NE_FS_FILRDER|NE_FS_NOPATHE|not found|No such file|does not exist/i.test(String(e?.code||'')+' '+msg(e));}
 function throwIfBadJSON(value,kind){JSON.parse(value);return value;}
 async function readProgress(file){
   let raw;
   try{raw=await Neutralino.filesystem.readFile(full(file));}
   catch(error){if(fileMissing(error))return null;throw error;}
   const data=JSON.parse(raw);
   const historyFile=historyFiles.includes(data.historyFile)?data.historyFile:null;
   if(historyFile)data[historyKey]=await Neutralino.filesystem.readFile(full(historyFile));
   const loaded=new Map();
   for(const key of progressKeys){
     if(typeof data[key]!=='string')throw Error('Progreso incompleto: '+file);
     JSON.parse(data[key]);
     loaded.set(key,data[key]);
   }
   return {raw,historyFile,loaded};
 }
 const resetMarker='reinicio-en-curso.json';
 const saveKeys=[...progressKeys,'ncg_v647_campaign_days'];
 async function removeIfPresent(name){
   try{await Neutralino.filesystem.remove(full(name));}
   catch(error){if(!fileMissing(error)&&error.code!=='NE_FS_REMVERR')throw error;
     // Some engines return a generic removal error. Distinguish absence from failure.
     const entries=await Neutralino.filesystem.readDirectory(dir);
     if(entries.some(entry=>entry.entry===name))throw error;
   }
 }
 async function purgeNativeProgress(){
   const names=[progressFile,recoveryFile,...autoFiles,...historyFiles,...saveKeys.map(key=>SAVE_FILES[key])];
   const targets=new Set(names.flatMap(name=>[name,name+'.tmp']));
   const entries=await Neutralino.filesystem.readDirectory(dir);
   for(const entry of entries)if(targets.has(entry.entry))await removeIfPresent(entry.entry);
   confirmedManifest=null;currentHistoryFile=null;lastAutoTime=0;lastAutoDay=0;
 }
 async function resetProgress(){
   if(native||portable){
     if(retryTimer!==null){clearTimeout(retryTimer);retryTimer=null;}
     if(timer!==null){clearTimeout(timer);timer=null;}
     await Promise.all([flushInProgress,portableFlushBusy]);
     if(timer!==null){clearTimeout(timer);timer=null;}
     if(retryTimer!==null){clearTimeout(retryTimer);retryTimer=null;}
   }
   if(native){
     await atomicWrite(resetMarker,'true');
     await purgeNativeProgress();
   }
   if(portable)await portableRequest('save',Object.fromEntries(saveKeys.map(key=>[key,key===historyKey?'[]':'null'])));
   for(const key of saveKeys){
     values.delete(key);pending.delete(key);localStorage.removeItem(key);
   }
   if(native)await removeIfPresent(resetMarker);
 }
 async function readData(){
   if(typeof NL_DATAPATH!=='string'||!NL_DATAPATH)throw Error('Neutralino no facilito NL_DATAPATH.');
   dir=norm(NL_DATAPATH)+'/NCG';
   try{await Neutralino.filesystem.createDirectory(dir);}catch(e){
     try{await Neutralino.filesystem.readDirectory(dir);}catch(_e){throw Error('No es posible abrir '+dir+': '+msg(e));}
   }
   const entries=await Neutralino.filesystem.readDirectory(dir);
   if(entries.some(entry=>entry.entry===resetMarker)){
     await purgeNativeProgress();
     for(const key of saveKeys)localStorage.removeItem(key);
     await removeIfPresent(resetMarker);
   }
   let snapshot=null, primaryError=null;
   try{snapshot=await readProgress(progressFile);}catch(error){primaryError=error;}
   if(!snapshot){
     try{snapshot=await readProgress(recoveryFile);}catch(error){primaryError=primaryError||error;}
     if(!snapshot){
       for(const file of autoFiles){try{snapshot=await readProgress(file);if(snapshot)break;}catch(_e){}}
     }
     if(!snapshot&&primaryError)throw primaryError;
     recovered=!!snapshot;
   }
   if(recovered&&snapshot){
     try{await atomicWrite(progressFile,snapshot.raw);}catch(_e){}
   }
   if(snapshot){
     confirmedManifest=snapshot.raw;
     currentHistoryFile=snapshot.historyFile;
     for(const [key,raw] of snapshot.loaded)values.set(key,raw);
   }
   for(const [key,file] of Object.entries(SAVE_FILES)){
     if(values.has(key))continue;
     let raw;
     try{raw=await Neutralino.filesystem.readFile(full(file));}
     catch(e){if(fileMissing(e))continue;throw Error('No se pudo leer '+file+': '+msg(e));}
     if(!raw)continue;
     try{throwIfBadJSON(raw,file);}catch(e){
       if(!progressKeys.includes(key)){
         continue;
       }
       throw Error('El archivo '+file+' esta dañado. No se ha sobrescrito. Revisa '+dir+' antes de continuar.');
     }
     values.set(key,raw);
     if(!progressKeys.includes(key)){try{localStorage.setItem(key,raw);}catch(_){} }
   }
   ready=true;
 }
 let flushInProgress=null, consecutiveWriteFailures=0, retryTimer=null;
 function queueFlush(delay=450){
   if(timer!==null)return;
   timer=setTimeout(()=>{timer=null;(portable?portableFlush():flush()).catch(storageFailure);},delay);
 }
 function write(key,value){
   if(!native||!ready||!(key in SAVE_FILES))return false;
   values.set(key,String(value));
   pending.set(key,String(value));
   queueFlush(0);
   return true;
 }
 function storageFailure(error){
   const message=msg(error);
   window.NCGDesktop.storageError=message;
   const alertBox=document.getElementById('storageAlert');
   if(alertBox){alertBox.hidden=false;const t=alertBox.querySelector('[data-alert-text]');if(t)t.textContent='ERROR DE GUARDADO NATIVO: '+message+' · Reintenta o exporta el respaldo JSON.';}
 }
 function flush(){
   if(portable)return portableFlush();
   if(!native||!ready)return Promise.resolve(false);
   if(timer!==null){clearTimeout(timer);timer=null;}
   if(flushInProgress)return flushInProgress;
   if(!pending.size)return Promise.resolve(true);
   flushInProgress=(async()=>{
     let didFail=false, failure=null;
     const batch=new Map(pending);
     if(progressKeys.some(key=>batch.has(key))){
       const data={};
       for(const key of progressKeys){
         const fallback=key==='ncg_v6_history'?'[]':'null';
         let prior=values.get(key);
         if(prior==null){try{prior=localStorage.getItem(key);}catch(_){} }
         data[key]=prior??fallback;
       }
       try{
         let nextHistoryFile=currentHistoryFile;
         if(!nextHistoryFile||batch.has(historyKey)){
           nextHistoryFile=currentHistoryFile===historyFiles[0]?historyFiles[1]:historyFiles[0];
           await atomicWrite(nextHistoryFile,data[historyKey]);
         }
         delete data[historyKey];
         data.historyFile=nextHistoryFile;
         if(confirmedManifest!==null)await atomicWrite(recoveryFile,confirmedManifest);
         const nextManifest=JSON.stringify(data);
         await atomicWrite(progressFile,nextManifest);
         confirmedManifest=nextManifest;
         currentHistoryFile=nextHistoryFile;
         // Tres copias completas, rotación cada cinco minutos o cambio de jornada.
         const day=JSON.parse(data['ncg_v6_session']||'null')?.day||0;
         if(!lastAutoTime||Date.now()-lastAutoTime>=300000||(day&&day!==lastAutoDay)){
           try{
             for(let n=autoFiles.length-1;n>0;n--){
               try{const older=await Neutralino.filesystem.readFile(full(autoFiles[n-1]));
                 await atomicWrite(autoFiles[n],older);
               }catch(error){if(!fileMissing(error))throw error;}
             }
             await atomicWrite(autoFiles[0],JSON.stringify({...data,[historyKey]:values.get(historyKey)||'[]',historyFile:null}));
             lastAutoTime=Date.now();lastAutoDay=day;
           }catch(error){storageFailure(Error('No se creó una autocopia: '+msg(error)));}
         }
         for(const key of progressKeys){
           if(pending.get(key)===batch.get(key))pending.delete(key);
         }
       }catch(err){didFail=true;failure=err;}
     }
     for(const [key,raw] of batch){
       if(didFail)break;
       if(progressKeys.includes(key))continue;
       let ok=false;
       for(let attempt=0;attempt<3;attempt++){
         try{await atomicWrite(SAVE_FILES[key],raw);ok=true;break;}
         catch(e){failure=e;if(attempt<2)await new Promise(r=>setTimeout(r,180*(attempt+1)));}
       }
       if(!ok){didFail=true;break;}
       if(pending.get(key)===raw)pending.delete(key);
     }
     if(didFail){
       consecutiveWriteFailures++;
       storageFailure(failure||Error('No se pudo escribir en disco'));
       if(consecutiveWriteFailures<3 && retryTimer===null){
         retryTimer=setTimeout(()=>{retryTimer=null;flush().catch(storageFailure);},850*consecutiveWriteFailures);
       }
       return false;
     }
     consecutiveWriteFailures=0;
     if(window.NCGDesktop.storageError){
       const alertBox=document.getElementById('storageAlert');
       const notice=alertBox?.querySelector('[data-alert-text]');
       if(notice?.textContent.startsWith('ERROR DE GUARDADO NATIVO:'))alertBox.hidden=true;
     }
     window.NCGDesktop.storageError='';
     flushCount++;
     return true;
   })().finally(()=>{
     flushInProgress=null;
     if(pending.size&&consecutiveWriteFailures===0)queueFlush(250);
   });
   return flushInProgress;
 }
 async function saveAndExit(){
   try{
     if(typeof flushDraft==='function')flushDraft();
     do{if(!await flush())return;}while(pending.size);
     await Neutralino.app.exit();
   }catch(error){storageFailure(error);}
 }
 async function backup(text,filename){
   if(!native||!ready||unsafe)throw Error('No esta disponible el sistema de archivos nativo.');

   const name=String(filename||'NCG_respaldo.json').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,110);
   const path=full(name);
   await Neutralino.filesystem.writeFile(path,String(text));
   return path;
 }
 function withDeadline(work,message,ms=12000){
   let timeout;
   const elapsed=new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error(message)),ms);});
   return Promise.race([Promise.resolve().then(work),elapsed]).finally(()=>clearTimeout(timeout));
 }
 function loadScript(src){
   return new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     const timeout=setTimeout(()=>{
       script.remove?.();
       finish(Error('tiempo de espera agotado'));
     },12000);
     function onRuntimeError(event){
       if(event.filename?.split('?')[0].endsWith('/'+src))finish(event.error||Error(event.message));
     }
     function finish(error){
       clearTimeout(timeout);
       window.removeEventListener?.('error',onRuntimeError);
       script.onload=script.onerror=null;
       if(error)reject(Error(src+' · '+msg(error)));else resolve();
     }
     window.addEventListener?.('error',onRuntimeError);
     script.src=src;
     script.async=false;
     script.onload=()=>finish();
     script.onerror=()=>finish(Error('archivo no disponible'));
     document.body.appendChild(script);
   });
 }
 let classicLoad;
 function classicModel(){
   if(window.NCGClassic!==classicProxy)return Promise.resolve(window.NCGClassic);
   if(!classicLoad)classicLoad=loadScript('assets/vectorial/motor-clasico.js').then(()=>{
     if(window.NCGClassic===classicProxy)throw Error('El motor vectorial no se registró.');
     return window.NCGClassic;
   }).catch(error=>{classicLoad=null;throw error;});
   return classicLoad;
 }
 const classicProxy={
   estaLista:()=>false,
   cargarCara:(...args)=>classicModel().then(model=>model.cargarCara(...args)),
   reintentar:(...args)=>classicModel().then(model=>model.reintentar(...args))
 };
 window.NCGClassic=classicProxy;
 async function openGame(){
   const holder=document.getElementById('ncgDesktopLoaderWrap');
   for(const src of GAME_SCRIPTS){
     status('Cargando '+src+'…');
     if(src==='js/config.js')await window.NCGExtras.load();
     await loadScript(src);
   }
   if(!window.NCGStartup)throw Error('El motor del juego no terminó de registrarse.');
   status('Abriendo el gabinete…');
   await withDeadline(()=>window.NCGStartup,'El gabinete no terminó de iniciar.');
   if(holder)holder.remove();
   if(recovered){
     const box=document.getElementById('storageAlert');
     const text=box?.querySelector('[data-alert-text]');
     if(text)text.textContent='Se recuperó el guardado confirmado anterior. Las últimas acciones podrían faltar. Puedes exportar un respaldo.';
     if(box)box.hidden=false;
   }
 }
 function showFatal(message){
   status('ERROR: '+message+' Reabre NCG desde el ejecutable o el lanzador de Linux.');
   const h=document.getElementById('ncgDesktopLoaderWrap');
   if(h){h.style.background='#311c1d';h.style.color='#fff';h.style.padding='30px';}
 }
 async function start(){
   native=typeof window.Neutralino==='object'&&typeof window.Neutralino.init==='function'&&typeof NL_VERSION!=='undefined';
   window.NCGDesktop={
     resetProgress,saveAndExit:native?saveAndExit:null,native:native||!!portable,storageError:'',getPath:()=>dir,queueWrite:portable?portableWrite:write,flush:portable?portableFlush:flush,readValue:key=>values.get(key),
     backup:portable?(text,filename)=>portableRequest('backup',{text,filename}).then(x=>x.path):backup,
     stats:()=>({native,ready,unsafe,pending:pending.size,flushCount,consecutiveWriteFailures,path:dir}),
     _debug:{SAVE_FILES,openGame}
   };
   if(native){
     if(!(typeof NL_TOKEN==='string'&&NL_TOKEN&&NL_TOKEN!=='undefined') && !sessionStorage.getItem('NL_TOKEN')){
       showFatal('No fue posible conectar con el escritorio. Comprueba la instalación y vuelve a abrir NCG.');
       return;
     }
     status('Iniciando Neutralinojs…');
     try{
       Neutralino.init();
       status('Leyendo partidas…');
       await withDeadline(readData,'El sistema de archivos tardó demasiado en abrir las partidas.',20000);
     }catch(e){showFatal(msg(e));try{await Neutralino.app.exit();}catch(_exitError){}return;}
   }else{
     if(portable){
       status('Recuperando las partidas del ejecutable portable…');
       try{await withDeadline(portableLoad,'No se pudieron leer las partidas portables.');}
       catch(e){showFatal(msg(e));return;}
     }
     if(typeof NL_VERSION!=='undefined'){
       showFatal('Las variables de Neutralinojs se han cargado, pero no la biblioteca de cliente. Revisa /js/neutralino.js.');
       return;
     }
     if(!portable)status('Modo de compatibilidad HTML (sin guardado nativo)…');
   }
   if(portable)window.addEventListener('pagehide',()=>{if(typeof flushDraft==='function')flushDraft();portableFlush();});
   try{await openGame();}catch(e){showFatal(msg(e));}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
