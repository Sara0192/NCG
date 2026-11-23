'use strict';

// Normalización defensiva de JSON ajeno: claves peligrosas, tamaños y valores primitivos.
function sanitizeImportedRecord(raw){
 const forbidden=new Set(['__proto__','prototype','constructor']);
 let budget=12000;
 function copy(v,depth=0){
  if(--budget<0)throw Error('El registro excede el límite de 12000 elementos; no se importó.');
  if(depth>12)throw Error('El registro supera la profundidad permitida; no se importó.');
  if(typeof v==='string')return v.slice(0,8192).replace(/[\u0000-\u001f\u007f<>]/g,c=>c==='<'?'‹':c==='>'?'›':' ');
  if(typeof v==='number')return Number.isFinite(v)?v:null;
  if(typeof v==='boolean'||v===null)return v;
  if(Array.isArray(v))return v.slice(0,512).map(x=>copy(x,depth+1));
  if(v&&typeof v==='object'){const clean=Object.create(null);for(const [k,item] of Object.entries(v).slice(0,250)){
   if(!forbidden.has(k)&&k.length<=80)clean[k]=copy(item,depth+1);
  }return clean;}
  return null;
 }
 return copy(raw);
}
function ensureRecordIds(records){
 if(!Array.isArray(records))return [];
 const seen=new Set();
 for(const [index,r] of records.entries()){
  if(!r||typeof r!=='object')continue;
  let id=String(r.recordId||'');
  if(!id||seen.has(id))id='legacy-'+seedHash(String(r.certNumber||'')+'|'+String(r.date||'')+'|'+index).toString(36)+'-'+index;
  r.recordId=id;seen.add(id);
 }
 return records;
}

function newRecordId(){return 'r-'+Date.now().toString(36)+'-'+randomToken().toLowerCase().slice(0,9);}

function nextCertificateNumber(){
 const year=new Date().getFullYear();let serial=Math.max(1,Number(session?.certSerial||0)+1);
 const existing=new Set(history.map(r=>String(r.certNumber||'')));
 while(existing.has(`NCG-${year}-${String(serial).padStart(6,'0')}`))serial++;
 session.certSerial=serial;
 return `NCG-${year}-${String(serial).padStart(6,'0')}`;
}

function exportFullBackup(){
 const backup={format:BACKUP_FORMAT,exported:new Date().toISOString(),session,history,dayBook};
 const filename=`NCG_respaldo_jornada_${String(session?.day||1).padStart(2,'0')}.json`;
 const json=JSON.stringify(backup,null,2);
 const confirmed=()=>{
  if(session&&session.finished&&session.day%5===0){session.lastBackupExportDay=session.day;saveSession();}
  NCGLog.event('RESPALDO_EXPORTADO',{day:session?.day,records:history.length,format:BACKUP_FORMAT});
  refreshBackupIndicator();
  if(session?.finished&&session.day%5===0&&$('backupEndDay'))showEndDay();
 };
 if(window.NCGDesktop?.native){
  window.NCGDesktop.backup(json,filename).then(path=>{
   confirmed();notify('Respaldo guardado en '+path,'success',12);
  }).catch(err=>{
   NCGLog.error(err,{operation:'respaldo_nativo'});
   download(new Blob([json],{type:'application/json'}),filename);
   notify('Falló la copia nativa. Se ha solicitado la descarga del respaldo JSON. Comprueba el archivo.','warning',12);
   refreshBackupIndicator();
  });
 }else{
  try{
   download(new Blob([json],{type:'application/json'}),filename);
   confirmed(); // Inicio de descarga: el usuario debe comprobar el archivo.
   notify('Descarga del respaldo JSON iniciada. Comprueba que se haya guardado.','success',9);
  }catch(err){NCGLog.error(err,{operation:'respaldo_descarga'});notify('No se pudo iniciar la descarga: '+err.message,'error',12);}
 }
}

function loadJSON(key,fallback){
 try{const raw=window.NCGDesktop?.readValue?.(key)??localStorage.getItem(key);return raw==null?fallback:JSON.parse(raw);}catch(e){
  showFileWarning('No puedo leer los guardados locales. Exporta un respaldo antes de cerrar.',true);return fallback;
 }
}

function storeWithWarning(key,data){
 let str;try{str=JSON.stringify(data);}catch(err){showFileWarning('No se puede preparar el JSON de guardado: '+err.message,true);return false;}
 // El escritorio usa una cola nativa; el navegador solo es respaldo si la cola no funciona.
 // No confundir «en cola» con «persistido», ni afirmar que se escribió en localStorage.
 let nativeQueued=false;
 let browserSaved=false;
 try{nativeQueued=window.NCGDesktop?.queueWrite?.(key,str)===true;}catch(error){
   NCGLog.error(error,{phase:'save-native-queue',key});
 }
 if(!nativeQueued){
   try{localStorage.setItem(key,str);browserSaved=true;}catch(error){
     NCGLog.error(error,{phase:'save-local-storage',key});
   }
 }
 if(!nativeQueued&&!browserSaved){
   showFileWarning('ATENCIÓN: fallaron los almacenamientos web y nativo. Exporta un respaldo JSON ahora.',true);
   return false;
 }
 if(!window.NCGDesktop?.native&&!storageWarningShown&&str.length>3_000_000){
   storageWarningShown=true;showFileWarning('El historial se acerca al límite del almacenamiento local. Exporta una copia JSON para no perder expedientes.',true);
 }
 return true;
}

function saveSession(){return storeWithWarning(SESSION_KEY,session);}

function saveHistory(){return storeWithWarning(HISTORY_KEY,history);}

let draftTimer=null;
function flushDraft(){if(draftTimer!==null){clearTimeout(draftTimer);draftTimer=null;saveSession();}}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)flushDraft();});
function saveCaseDraft(defer=false){
 if(!sessionReady||!session||!active||session.finished)return;
 const values={};for(const name of DRAFT_FIELDS)values[name]=$(name)?.value||'';
 active.draft={auth:selectedAuth,service:$('serviceSel').value,fields:values};
 if(selectedAuth||Object.values(values).some(Boolean))$('labelStatus').textContent='BORRADOR GUARDADO';
 if(defer&&!window.NCGDesktop?.native){clearTimeout(draftTimer);draftTimer=setTimeout(flushDraft,220);}
 else saveSession();
}

function restoreCaseDraft(){
 const draft=active?.draft;if(!draft)return;
 if(draft.service&&[...$('serviceSel').options].some(o=>o.value===draft.service))$('serviceSel').value=draft.service;
 updateServiceUI();
 for(const [name,value] of Object.entries(draft.fields||{})){
  const el=$(name);if(!el)continue;
  if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===value))continue;
  el.value=value;
 }
 selectedAuth=['real','fake','review'].includes(draft.auth)?draft.auth:'';
 for(const one of $('authButtons').querySelectorAll('button'))one.classList.toggle('selected',one.dataset.auth===selectedAuth);
 $('signBtn').textContent=selectedAuth==='real'?'Emitir etiqueta y encapsular':selectedAuth?'Cerrar expediente sin encapsular':'Firmar dictamen';
 if(selectedAuth||Object.values(draft.fields||{}).some(Boolean))$('labelStatus').textContent='BORRADOR GUARDADO';
}

/** Una sola fuente de verdad para los respaldos históricos soportados. */
function isCompatibleBackupFormat(format){
 if(format===BACKUP_FORMAT)return true;
 if(typeof format!=='string')return false;
 const version=format.match(/^NCG_PARTIDA_V(\d{3})$/)?.[1];
 if(!version)return false;
 return SUPPORTED_SAVE_VERSIONS.has(version[0]+'.'+version.slice(1));
}

function isCompatibleSession(s){
 const goodVariant=v=>!!(v&&typeof v==='object'&&!Array.isArray(v)&&
  Array.isArray(v.defects)&&v.defects.length===2&&v.defects.every(side=>Array.isArray(side)&&side.length<=128&&side.every(d=>d&&typeof d==='object'&&typeof d.name==='string'))&&
  v.shader&&typeof v.shader==='object'&&!Array.isArray(v.shader)&&
  Number.isFinite(Number(v.mass))&&Number(v.mass)>0&&
  Number.isFinite(Number(v.dia))&&Number(v.dia)>0&&
  Number.isFinite(Number(v.density))&&Number(v.density)>0);
 return !!(s&&SUPPORTED_SAVE_VERSIONS.has(String(s.version))&&Number.isInteger(s.day)&&s.day>=1&&s.day<=CAMPAIGN_LENGTH&&
  Array.isArray(s.cases)&&s.cases.length>0&&s.cases.length<=coins.length&&Number.isInteger(s.index)&&s.index>=0&&s.index<=s.cases.length&&
  Number.isFinite(s.money)&&Number.isFinite(s.reputation)&&s.reputation>=0&&
  s.cases.every(item=>item&&typeof item.id==='string'&&coins.some(c=>c.id===item.id)&&goodVariant(item.variant)));
}

function download(blob,name){window.NCGSound?.play('export');const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

function backupDue(){return !!(session&&session.finished&&session.day%5===0&&session.lastBackupExportDay!==session.day);}
function refreshBackupIndicator(){
 const btn=$('backupTop');if(!btn)return;
 const due=backupDue();
 btn.classList.toggle('ncg-backup-due',due);
 btn.textContent=due?'↑ Respaldo pendiente':'↑ Respaldo';
 btn.title=due?'Jornada múltiplo de cinco: exporta un archivo JSON fuera de la carpeta del juego.':'Exportar o importar partida e historial';
}

function setupBackupUI(){
 const btn=$('backupExport');if(btn)btn.onclick=exportFullBackup;const top=$('backupTop');if(top)top.onclick=()=>{$('storageAlert').hidden=false;showFileWarning('Exporta o importa una copia JSON con el historial y la jornada actual.',false);};
 const input=$('backupImportFile');const importBtn=$('backupImport');
 if(importBtn&&input)importBtn.onclick=()=>input.click();
 if(input)input.onchange=async(e)=>{
  const f=e.target.files?.[0];if(!f)return;
  try{
   const obj=JSON.parse(await f.text());
   if(!isCompatibleBackupFormat(obj.format)||!Array.isArray(obj.history))throw Error('No es un respaldo compatible de NCG.');
   if(obj.session&&!isCompatibleSession(obj.session))throw Error('La jornada del respaldo tiene datos incompatibles o dañados; no se reemplazó tu partida.');
   if(obj.history.length>50000||!obj.history.every(r=>r&&typeof r==='object'&&!Array.isArray(r)&&typeof r.id==='string'&&typeof r.date==='string'&&(!r.variant||!r.variant.defects||(Array.isArray(r.variant.defects)&&r.variant.defects.every(a=>Array.isArray(a)&&a.every(d=>d&&typeof d==='object'&&typeof d.name==='string'))))))throw Error('El historial contiene expedientes inválidos.');
   if(!confirm(`¿Importar ${obj.history.length} expedientes y recuperar la partida guardada? Se reemplazará el historial local.`))return;
   const cleanHistory=ensureRecordIds(obj.history.map(sanitizeImportedRecord));
   const cleanSession=obj.session?sanitizeImportedRecord(obj.session):null;
   const cleanDayBook=obj.dayBook?sanitizeImportedRecord(obj.dayBook):null;
   const priorHistory=history,priorSession=session,priorDayBook=dayBook;
   history=cleanHistory;
   NCGLog.event('RESPALDO_IMPORTADO',{records:history.length,format:obj.format,day:obj.session?.day});
   if(obj.session){session=cleanSession;session.version=GAME_VERSION;normalizeInterruptedBankruptcy(session);session.certSerial=Math.max(Number(session.certSerial)||0,history.length);}
   dayBook=(obj.dayBook&&typeof obj.dayBook==='object'&&!Array.isArray(obj.dayBook)&&obj.dayBook.campaignId===session?.campaignId)?cleanDayBook:null;
   ensureCampaignState();
   if(!saveHistory()||(obj.session&&!saveSession())||!saveDayBook()){
    history=priorHistory;session=priorSession;dayBook=priorDayBook;saveHistory();saveSession();saveDayBook();
    throw Error('No se pudo guardar la importación. Tu partida anterior sigue activa; comprueba el almacenamiento o exporta los datos.');
   }
   $('storageAlert').hidden=true;
   hideModal();showMainMenu();
   notify('Respaldo importado. Jornada, lecturas, mejoras e historial recuperados.','success',10);
  }catch(err){notify('Error al importar: '+err.message,'error',12);}
  finally{input.value='';}
 };
 const close=$('backupClose');if(close)close.onclick=()=>{$('storageAlert').hidden=true;};
 const noticeClose=$('ncgNoticeClose');if(noticeClose)noticeClose.onclick=hideNotice;
}

