(function(){
 'use strict';
 const PASSWORD='PASSWORD';
 const MAX_LINES=85;
 let unlocked=false, checkpoint=null, transcript=[], lastCommand='';
 let busy=false;
 const $d=id=>document.getElementById(id);
 const clone=data=>JSON.parse(JSON.stringify(data));
 const fmt=e=>String(e?.message||e||'Error');
 function print(msg,kind='info'){
   const time=new Date().toLocaleTimeString('es-ES');
   transcript.push({time,kind,text:String(msg)});if(transcript.length>MAX_LINES)transcript=transcript.slice(-MAX_LINES);
   paintLog();
 }
 function paintLog(){const el=$d('ncgDebugLog');if(!el)return;
   el.textContent=transcript.map(r=>`[${r.time}] ${r.kind==='error'?'ERROR':r.kind==='ok'?'OK':'·'} ${r.text}`).join('\n');
   el.scrollTop=el.scrollHeight;
 }
 function ready(){if(!unlocked)throw Error('Modo desarrollador bloqueado.');if(typeof session==='undefined'||!session||!sessionReady)throw Error('La partida aún no está cargada.');}
 function checkpointNeeded(){
   ready();if(checkpoint)return;
   if(!window.confirm('MODO DEBUG: los comandos de escritura modifican el guardado real de NCG. Se guardará un punto de restauración solo EN MEMORIA (se pierde al cerrar el programa). Exporta antes un respaldo JSON. ¿Continuar?'))throw Error('Operación cancelada; no se modificó la partida.');
   checkpoint={session:clone(session),dayBook:clone(dayBook),history:clone(history),created:new Date().toISOString()};
   session.modifiedByDeveloper=true;session.modifiedAt=new Date().toISOString();
 print('Partida marcada MODIFICADA. Usa "restaurar" para recuperar el estado anterior.','ok');
 }
 function persist(){
   if(!saveSession()||!saveDayBook())throw Error('Guardado pendiente o fallido. Exporta un respaldo JSON y comprueba el aviso de guardado.');
 }
 function refresh(){
   // Cierra solo el modal del juego: hideModal() tiene navegación propia y
   // podría abrir otro expediente antes de que el modo debug actualice el estado.
   const modal=$d('modal');
   if(modal?.classList.contains('show')){
     modal.classList.remove('show');
     window.NCGGraphics?.refresh();
   }
   if(isMenuVisible())closeCampaignMenu();
   if(session.index>=session.cases.length){
     active=null;
     if(session.day>=CAMPAIGN_LENGTH)showCampaignFinale();
     else showEndDay();
     return;
   }
   openCase();
 }
 function resultStatus(){const done=session.index>=session.cases.length;
   return `${session.modifiedByDeveloper?'[PARTIDA MODIFICADA POR DESARROLLADOR] · ':''}Jornada ${session.day}/${CAMPAIGN_LENGTH} · ${done?'sin expedientes pendientes':`expediente ${session.index+1}/${session.cases.length}`} · fondos ${session.money} € · reputación ${session.reputation} · historial ${history.length} · semilla ${session.seed}\nMejoras: ${Object.keys(session.upgrades||{}).filter(x=>session.upgrades[x]).join(', ')||'ninguna'}`;}
 function currentTruth(){
   if(!active||session.index>=session.cases.length)return 'No hay un expediente activo.';
   const c=coins.find(x=>x.id===active.id),v=active.variant;
   return `${c?.name||active.id}\nEstado real simulado: ${v.isFake?'FALSA ('+(v.fakeType||'tipo no declarado')+')':'AUTÉNTICA'}${v.subtleFake?' · camuflada':''}\nConservación: ${v.hiddenGrade?.grade||v.baseGrade||'sin asignar'} · Details: ${v.hiddenDetails||'ninguno'}\nPeso ${v.mass} g · diámetro ${v.dia} mm · densidad ${v.density} g/cm³\nCanto: ${v.edgeProfile?.label||'sin incidencia especial'} · imán ${v.magnet?'atracción':'sin atracción'}`;
 }
 function doSkipCases(count=1){
   if(session.index>=session.cases.length){refresh();return 'La jornada ya está completada. Se ha recuperado la pantalla correspondiente.';}
   if(!Number.isInteger(count)||count<1||count>16)throw Error('Puedes saltar entre 1 y 16 monedas.');
   const first=session.index;
   const skipped=Math.min(count,session.cases.length-first);
   for(let i=first;i<first+skipped;i++)delete session.cases[i].draft;
   session.index=first+skipped;
   session.finished=session.index>=session.cases.length;
   if(session.finished)markDayCompleted();
   persist();
   refresh();
   return `${skipped} moneda(s) omitida(s) para pruebas, sin dictamen. ${resultStatus()}`;
 }
 function doFinishDay(){
   if(session.index>=session.cases.length)return 'Esta jornada ya estaba completada. '+resultStatus();
   const skipped=session.cases.length-session.index;
   for(let i=session.index;i<session.cases.length;i++)delete session.cases[i].draft;
   session.index=session.cases.length;session.finished=true;
   markDayCompleted();persist();refresh();
   return `Jornada ${session.day} finalizada para pruebas: ${skipped} expediente(s) omitidos, SIN certificados ni ingresos. ${resultStatus()}`;
 }
 function doAuto(days){
   let completed=0,skipped=0,reason='';
   for(let i=0;i<days;i++){
     if(session.day===CAMPAIGN_LENGTH&&session.index>=session.cases.length){reason='Campaña de pruebas ya completada.';break;}
     let next=null;
     if(session.day<CAMPAIGN_LENGTH){
       const cost=nextDayOverhead(session);
       if(!Number.isFinite(cost)||cost<0)throw Error('Coste de jornada inválido.');
       if(session.money-cost<=0){
         reason=`Fondos insuficientes para el día ${session.day+1} (gastos ${cost} €). Jornada ${session.day} intacta.`;
         break;
       }
       next=makeNextSession(session);
       if(!next||!isCompatibleSession(next))throw Error('No se pudo generar la siguiente jornada. No se ha cerrado la actual.');
     }
     const remaining=session.cases.length-session.index;
     for(let j=session.index;j<session.cases.length;j++)delete session.cases[j].draft;
     session.index=session.cases.length;session.finished=true;
     markDayCompleted();completed++;skipped+=remaining;
     if(next){session=next;ensureCampaignState();}
     else{reason='Se completó la jornada 30 sin emitir certificados.';break;}
   }
   persist();refresh();
   return `${completed} jornada(s) completadas en automático, ${skipped} expedientes omitidos (sin certificados). ${reason} ${resultStatus()}`;
 }
 function verifyIntegrity(){
   const issues=[];
   const fail=msg=>{if(issues.length<20)issues.push(msg);};
   if(coins.length!==129||new Set(coins.map(c=>c.id)).size!==coins.length)fail('Catálogo: número o IDs duplicados.');
   if(!isCompatibleSession(session))fail('La sesión no cumple el formato de guardado.');
   if(!Array.isArray(history))fail('Historial ausente.');
   else{
     const ids=new Set(),certs=new Set();
     for(let i=0;i<history.length;i++){
       const record=history[i];
       if(!record||typeof record!=='object'){fail('Registro '+i+' inválido.');continue;}
       if(record.recordId){if(ids.has(record.recordId))fail('recordId duplicado: '+record.recordId);ids.add(record.recordId);}
       if(record.certNumber){if(certs.has(record.certNumber))fail('Certificado duplicado: '+record.certNumber);certs.add(record.certNumber);}
       if(!coins.some(c=>c.id===record.id))fail('Moneda del historial no encontrada: '+record.id);
     }
   }
   if(dayBook&&dayBook.campaignId!==session.campaignId)fail('El libro de jornadas pertenece a otra campaña.');
   if(dayBook?.days){
     for(const [day,entry] of Object.entries(dayBook.days)){
       if(!/^\d+$/.test(day)||Number(day)<1||Number(day)>CAMPAIGN_LENGTH||!entry||Number(entry.day)!==Number(day))fail('Punto de control inválido: '+day);
     }
   }
   if(session.cases.some(item=>!coins.some(c=>c.id===item.id)))fail('Expediente con moneda inexistente.');
   const result=issues.length?issues.join('\n'):'Ninguna anomalía estructural detectada.';
   return `Auditoría local (sin modificar la partida): ${issues.length} anomalía(s). ${result} Revisión estructural, no equivale a una prueba integral de WebKitGTK.`;
 }
 function doGoto(day){
   if(day<1||day>CAMPAIGN_LENGTH)throw Error('Día fuera de rango (1–30).');
   const prior= session;
   const next=makeSession(day,prior.money,prior.reputation,'','',{...(prior.upgrades||{})});
   next.campaignId=prior.campaignId;next.beginnerAid=!!prior.beginnerAid;
   next.storySeen=true;next.finalBriefingSeen=true;
   session=next;
   if(day<prior.day){session.campaignId=newCampaignId();dayBook=null;}
   ensureCampaignState();
   dayBook.days[String(day)]=snapshotForDay(session);
   persist();refresh();
   return `Salto directo al día ${day} (sin cobrar jornadas intermedias). Nueva semilla ${session.seed}.`;
 }
 function doAdvance(days){
   if(days<1||days>30)throw Error('Permito avanzar de 1 a 30 jornadas por comando.');
   let advanced=0,stopped='';
   for(let i=0;i<days;i++){
     if(session.day>=CAMPAIGN_LENGTH){stopped='Ya estás en la última jornada.';break;}
     const nextDay=session.day+1;
     const cost=nextDayOverhead(session);
     if(!Number.isFinite(cost)||cost<0)throw Error('Coste de jornada inválido; no se modificó el día actual.');
     if(session.money-cost<=0){stopped=`Fondos insuficientes para abrir el día ${nextDay} (coste ${cost} €). No se ha cerrado la jornada ${session.day}. Usa "fondos 5000" para pruebas.`;break;}
     const previous=session;
     const next=makeNextSession(previous);
     if(!next||!isCompatibleSession(next))throw Error('No se pudo generar el día siguiente. La jornada actual se ha conservado.');
     next.storySeen=true;next.finalBriefingSeen=true;
     previous.index=previous.cases.length;previous.finished=true;markDayCompleted();
     session=next;ensureCampaignState();advanced++;
   }
   persist();refresh();
   return `${advanced} jornada(s) avanzadas con gastos ordinarios. ${stopped} ${resultStatus()}`;
 }
 function reopenDay(){
   if(session.index<session.cases.length)return 'La jornada sigue abierta; no hace falta reabrirla.';
   const signed=history.some(r=>r&&r.day===session.day&&r.sessionSeed===session.seed);
   if(signed)throw Error('Esta jornada contiene certificados firmados. No se reabrirá para evitar duplicados. Usa "dia '+session.day+'" para generar una jornada de pruebas distinta.');
   if(!window.confirm('¿Reabrir los '+session.cases.length+' expedientes de esta jornada de pruebas? No se borrará el historial ni se cobrarán gastos.'))return 'Recuperación cancelada.';
   if(!session.cases.length)throw Error('La jornada no tiene expedientes; no se puede reabrir.');
   session.index=0;session.finished=false;
   for(const c of session.cases){delete c.draft;delete c.debugExam;delete c.readings;}
   const entry=dayBook?.days?.[String(session.day)];
   if(entry){entry.completed=false;entry.completedAt=null;}
   persist();refresh();
   return 'Jornada de pruebas reabierta sin alterar certificados ni economía. '+resultStatus();
 }
 function fillExam(){
   if(session.index>=session.cases.length)throw Error('No hay expediente que examinar.');
   const v=active.variant,r=active.readings||(active.readings={});
   r.mass=Number(v.mass).toFixed(3)+' g [DEBUG]';
   r.dia=Number(v.dia).toFixed(1)+' mm [DEBUG]';
   r.magnet=(v.magnet?'Atracción':'Sin atracción')+' [DEBUG]';
   r.edge=(v.edgeProfile?.label||'Canto examinado')+' [DEBUG]';
   r.density=Number(v.density).toFixed(2)+' g/cm³ [DEBUG]';
   active.debugExam=true;
   renderReadings();refreshMinimumExamUI();saveSession();
   return 'Pruebas simuladas: balanza, calibre, imán, densidad y canto. XRF no usado; firmas aún con tu criterio.';
 }
 function doSmoke(){
   let passes=0,failures=[];
   function check(label,fn){try{if(fn()===false)throw Error('resultado falso');passes++;}catch(e){failures.push(label+': '+fmt(e));}}
   check('129 fichas únicas',()=>coins.length===129&&new Set(coins.map(c=>c.id)).size===coins.length);
   check('monedas con medidas',()=>coins.every(c=>Number(c.mass)>0&&Number(c.diameter)>0&&Number(c.rho)>0));
   check('jornada compatible',()=>isCompatibleSession(session));
   check('índice de expediente',()=>session.index>=0&&session.index<=session.cases.length);
   check('IDs de catálogo presentes',()=>coins.every(c=>!!c.id));
   check('UI de expediente',()=>!!$d('gradeSel')&&!!$d('signBtn')&&!!$d('desk'));
   check('historial válido',()=>Array.isArray(history)&&history.every(x=>x&&typeof x.id==='string'));
   check('costes de jornada',()=>Number.isFinite(nextDayOverhead(session))&&nextDayOverhead(session)>=0);
   check('control de certificados',()=>typeof minimumExamStatus==='function');
   check('motor gráfico',()=>typeof NCGVector?.render==='function');
   check('motor de audio',()=>typeof window.NCGSound?.play==='function');
   check('guardado nativo/web',()=>typeof window.NCGDesktop?.queueWrite==='function');
   const readOnly=!!session&&!!active; // solo informe, no toques el canvas actual
   check('expediente actual / jornada terminada',()=>session.index>=session.cases.length || (readOnly&&coins.some(c=>c.id===active.id)));
   return `${passes}/${passes+failures.length} pruebas de integridad superadas.${failures.length?'\n'+failures.join('\n'):'\nSin anomalías en estas pruebas. No equivale a una prueba completa de WebKitGTK.'}`;
 }
 function runCampaignQA(seed, targetDay, targetIndex){
   const originalRandom=seededRandom;
   let test=null, cases=0, selected=null;
   const daySeed=day=>`QA-${seed}-D${String(day).padStart(2,'0')}`;
   try{
     test=makeSession(1,400,50,'',daySeed(1));
     test.beginnerAid=true;
     for(let day=1;day<=(targetDay||CAMPAIGN_LENGTH);day++){
       if(!test||test.day!==day)throw Error('No se pudo abrir la jornada '+day);
       const raw=JSON.stringify(test);
       test=JSON.parse(raw);
       if(!isCompatibleSession(test)||JSON.stringify(test)!==raw)throw Error('Guardado inválido en jornada '+day);
       const replay=makeSession(day,test.startMoney,test.startReputation,'',daySeed(day),test.upgrades);
       if(JSON.stringify(replay.cases)!==JSON.stringify(test.cases))throw Error('La semilla produjo expedientes distintos en jornada '+day);
       for(const item of test.cases){
         const index=test.index+1;
         const coin=coins.find(c=>c.id===item.id);
         const variant=item.variant;
         if(!coin||![variant.mass,variant.dia,variant.density].every(x=>Number.isFinite(x)&&x>0)){
           throw Error(`Ficha o medidas inválidas. Repite: qa ${seed} ${day} ${index}`);
         }
         if(targetDay===day&&targetIndex===index){
           selected={jornada:day,expediente:index,semilla:test.seed,id:item.id,
             falsa:variant.isFake,grado:variant.hiddenGrade?.grade,peso:variant.mass,diametro:variant.dia,densidad:variant.density};
         }
         const auth=variant.isFake?'fake':'real';
         const report={auth,variant,grade:variant.hiddenGrade?.grade,details:variant.hiddenDetails,
           institutional:item.institutional,clientReputation:test.startReputation,strike:'3',surface:'3'};
         const score=trainingResult(calculatePeritaje(coin,report,auth==='real',test.reviewCount),test);
         if(!Number.isFinite(score.change)||!Number.isFinite(score.repChange))throw Error(`Dictamen inválido. Repite: qa ${seed} ${day} ${index}`);
         test.money+=score.change;
         test.reputation=Math.max(0,test.reputation+score.repChange);
         test.reviewCount=score.reviewCount;
         test.index++;
         cases++;
       }
       test.finished=true;
       if(!isCompatibleSession(JSON.parse(JSON.stringify(test))))throw Error('Cierre inválido de jornada '+day);
       if(day<(targetDay||CAMPAIGN_LENGTH))test=makeNextSession(test,{seed:daySeed(day+1)});
     }
     if(targetDay&&!selected)throw Error('Ese número de expediente no existe en la jornada indicada.');
     NCGLog.event('DEBUG_QA_OK',{seed,day:test.day,cases});
     return selected?JSON.stringify(selected,null,2):
       `Semilla ${seed} · ${test.day} jornadas · ${cases} expedientes · saldo ${test.money} €. Repite un expediente con qa ${seed} JORNADA EXPEDIENTE.`;
   }catch(error){
     NCGLog.event('DEBUG_QA_FALLO',{seed,day:test?.day,index:test?.index,message:fmt(error)});
     throw error;
   }finally{seededRandom=originalRandom;}
 }
 function parse(raw){
   ready();const input=String(raw||'').trim();if(!input)return '';
   lastCommand=input;const [cmd,...args]=input.split(/\s+/);const arg=args.join(' ');
   const n=Number(arg),validInt=Number.isInteger(n)&&arg!=='';
   if(['ayuda','help','?'].includes(cmd.toLowerCase()))return 'COMANDOS DISPONIBLES\nestado · verdad · casos · probar · integridad\nqa [SEMILLA [JORNADA EXPEDIENTE]] — recorre una campaña aislada o reproduce un expediente\nbuscar texto — localizar una moneda del catálogo\ngaleria N — abrir sus caras sin cambiar el expediente\nexamen — simular pruebas mínimas\nsaltar [N] — omitir 1 moneda (o N monedas) sin dictamen\ncaso — alias para saltar 1 moneda\nfin — terminar jornada sin certificar\nauto N — completar N jornadas sin certificar, con gastos y parada segura\nreabrir — recuperar un día de pruebas cerrado sin certificados\nadelantar 1..30 — avanzar días cobrando gastos\ndia 1..30 — salto directo sin costes intermedios\nfondos N · reputacion N — fijar saldos\nmejoras — activar equipamiento del taller\nrespaldo — exportar JSON · restaurar — deshacer desde el punto temporal\nlimpiar — borrar solo esta consola · bloquear — cerrar el modo.\nLos comandos de escritura requieren confirmación inicial; no usan eval.';
   if(cmd.toLowerCase()==='qa'){
     const [seed='NCG188',day,index]=args;
     if(!/^[a-z0-9_-]{1,25}$/i.test(seed)||
        (args.length!==0&&args.length!==1&&(args.length!==3||!/^\d+$/.test(day)||!/^\d+$/.test(index)||+day<1||+day>CAMPAIGN_LENGTH||+index<1||+index>16))){
       throw Error('Uso: qa SEMILLA o qa SEMILLA JORNADA EXPEDIENTE.');
     }
     return runCampaignQA(seed,Number(day),Number(index));
   }
   if(cmd.toLowerCase()==='buscar'){
     const normalizar=valor=>String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
     if(!arg.trim())throw Error('Escribe un nombre, país o identificador. Ejemplo: buscar yen');
     const consulta=normalizar(arg);
     const filas=coins.flatMap((coin,i)=>normalizar([coin.id,coin.name,coin.country].join(' ')).includes(consulta)?[(i+1)+'. '+coin.name]:[]);
     return filas.join('\n')||'Sin coincidencias en el catálogo.';
   }
   if(cmd.toLowerCase()==='galeria'){
     if(!validInt || n<1 || n>coins.length)throw Error('Escribe el número de una moneda. Usa buscar para localizarla.');
     if(!window.NCGGuides?.open)throw Error('Galería no disponible.');
     window.NCGQoL?.close?.();
     window.NCGGuides.open('GALERIA_VECTORIAL.html',n);
     return 'Galería abierta: '+coins[n-1].name;
   }
   if(['estado','status'].includes(cmd.toLowerCase()))return resultStatus();
   if(['verdad','truth','inspeccionar'].includes(cmd.toLowerCase()))return currentTruth();
   if(cmd.toLowerCase()==='casos')return session.cases.map((v,i)=>`${i+1===session.index+1?'→':' '} ${i+1}. ${coins.find(c=>c.id===v.id)?.name||v.id} [${i<session.index?'omitido o firmado':i===session.index?'actual':'pendiente'}]`).join('\n');
   if(['probar','test','smoke'].includes(cmd.toLowerCase()))return doSmoke();
   if(['integridad','verificar'].includes(cmd.toLowerCase()))return verifyIntegrity();
   if(['respaldo','backup'].includes(cmd.toLowerCase())){exportFullBackup();return 'Se solicitó exportar el respaldo JSON. Comprueba que se haya creado correctamente.';}
   if(cmd.toLowerCase()==='limpiar'){transcript=[];paintLog();return 'Consola limpiada.';}
   if(cmd.toLowerCase()==='bloquear'){lock();return 'Modo debug bloqueado.';}
   if(cmd.toLowerCase()==='restaurar'){
     if(!checkpoint)throw Error('No hay punto temporal de restauración.');
     if(!window.confirm('¿Restaurar sesión, jornadas e historial al estado anterior al primer cambio de debug? Se perderán también los dictámenes realizados desde entonces.'))return 'Restauración cancelada.';
     session=clone(checkpoint.session);dayBook=clone(checkpoint.dayBook);history=clone(checkpoint.history);checkpoint=null;
     if(!saveHistory()||!saveDayBook()||!saveSession())throw Error('No se pudo guardar la restauración; exporta inmediatamente un respaldo.');
     refresh();return 'Restauración aplicada. '+resultStatus();
   }
   if(!['examen','caso','saltar','fin','auto','reabrir','adelantar','dia','fondos','reputacion','reputación','mejoras'].includes(cmd.toLowerCase()))throw Error('Comando desconocido. Escribe ayuda.');
   if(['adelantar','dia','auto'].includes(cmd.toLowerCase())&&(!validInt||n<1||n>30))throw Error('Escribe un número entero de 1 a 30.');
   if(cmd.toLowerCase()==='saltar'&&(args.length>1||(args.length===1&&(!validInt||n<1||n>16))))throw Error('Uso: saltar [N], con N entre 1 y 16.');
   if(['fondos','reputacion','reputación'].includes(cmd.toLowerCase())&&(!validInt||n<0||n>1000000))throw Error('Escribe una cantidad entera entre 0 y 1.000.000.');
   checkpointNeeded();
   switch(cmd.toLowerCase()){
    case 'examen':return fillExam();
    case 'fin':return doFinishDay();
    case 'auto':return doAuto(n);
    case 'caso':return doSkipCases(1);
    case 'saltar':return doSkipCases(args.length?n:1);
    case 'reabrir':return reopenDay();
    case 'adelantar':return doAdvance(n);
    case 'dia':return doGoto(n);
    case 'fondos':session.money=n;persist();renderCaseTop();return `Fondos establecidos: ${n} €.`;
    case 'reputacion':case 'reputación':session.reputation=n;persist();renderCaseTop();return `Reputación establecida: ${n}.`;
    case 'mejoras':session.upgrades=session.upgrades||{};WORKSHOP_ITEMS.forEach(x=>session.upgrades[x.id]=true);persist();return 'Equipamiento del taller habilitado. Se cobrarán sus costes de mantenimiento en jornadas posteriores.';
   }
   return '';
 }
 function execute(raw){
   if(busy)return;busy=true;try{
     const out=parse(raw);print('> '+String(raw||'').slice(0,120));if(out)print(out,'ok');
   }catch(e){print(fmt(e),'error');}finally{busy=false;paintLog();}
 }
 function unlock(value){
   if(value!==PASSWORD)return false;
   unlocked=true;print('Modo desarrollador desbloqueado. Introduce ayuda para ver los comandos.','ok');return true;
 }
 function lock(){unlocked=false;checkpoint=null;transcript=[];}
 function panelHTML(){
   if(!unlocked)return `<div class="ncg-dev-panel"><h3>Modo desarrollador · bloqueado</h3><p>Herramientas locales para comprobar jornadas, economía, expedientes y conservación. No se inicia automáticamente.</p><label class="ncg-dev-field">Contraseña de desarrollador<input type="password" autocomplete="off" data-dev-password placeholder="Contraseña" aria-label="Contraseña de desarrollador"></label><button type="button" class="ncg-qol-primary" data-dev-action="unlock">Desbloquear</button><p class="ncg-dev-error" data-dev-error role="status"></p><small>La clave protege la interfaz, no cifra la partida. Los cambios afectan al guardado; exporta primero un respaldo.</small></div>`;
   return `<div class="ncg-dev-panel"><h3>Modo desarrollador · ACTIVO</h3><p class="ncg-dev-warning">PRUEBAS: las acciones de escritura pueden modificar tu partida guardada. Usa «Respaldo» antes de probar; «Restaurar» solo funciona hasta que cierres la aplicación.</p>
   <div class="ncg-dev-actions"><button type="button" data-dev-command="estado">Estado</button><button type="button" data-dev-command="verdad">Ver datos ocultos</button><button type="button" data-dev-command="probar">Comprobar</button><button type="button" data-dev-command="integridad">Integridad</button><button type="button" data-dev-command="examen">Simular examen</button><button type="button" data-dev-command="saltar">Saltar 1 moneda</button><button type="button" data-dev-command="reabrir">Reabrir jornada</button><button type="button" data-dev-command="adelantar 1">Día +1</button><button type="button" data-dev-command="adelantar 5">Día +5</button><button type="button" data-dev-command="fin">Terminar día</button><button type="button" data-dev-command="auto 5">Automático 5 días</button><button type="button" data-dev-command="fondos 5000">Fondos 5.000 €</button><button type="button" data-dev-command="reputacion 500">Reputación 500</button><button type="button" data-dev-command="mejoras">Todas las mejoras</button><button type="button" data-dev-command="respaldo">Exportar respaldo</button><button type="button" data-dev-command="restaurar">Restaurar</button></div>
   <label class="ncg-dev-field">Consola de pruebas<input type="text" data-dev-input spellcheck="false" autocomplete="off" maxlength="100" placeholder="ayuda · qa NCG188 · buscar yen"></label><div class="ncg-dev-console-actions"><button type="button" data-dev-action="run">Ejecutar</button><button type="button" data-dev-command="limpiar">Limpiar</button><button type="button" data-dev-action="lock">Bloquear</button></div><pre id="ncgDebugLog" class="ncg-dev-log" role="log" aria-live="polite"></pre></div>`;
 }
 function handleClick(ev){const btn=ev.target.closest('[data-dev-action],[data-dev-command]');if(!btn)return false;
   if(btn.dataset.devAction==='unlock'){
     const input=$d('ncgQolOverlay')?.querySelector('[data-dev-password]');
     if(unlock(input?.value||'')){window.NCGQoL?.open?.('debug');}
     else{if(input){input.value='';input.focus();}const msg=$d('ncgQolOverlay')?.querySelector('[data-dev-error]');if(msg)msg.textContent='Contraseña incorrecta.';}
   }else if(btn.dataset.devAction==='run'){
     const inp=$d('ncgQolOverlay')?.querySelector('[data-dev-input]');if(inp){execute(inp.value);inp.value='';inp.focus();}
   }else if(btn.dataset.devAction==='lock'){lock();window.NCGQoL?.open?.('debug');}
   else if(btn.hasAttribute('data-dev-command'))execute(btn.dataset.devCommand);
   return true;
 }
 function handleKey(ev){if(ev.key!=='Enter')return false;
   if(ev.target.matches('[data-dev-password]')){
     ev.preventDefault();const btn=ev.target.closest('#ncgQolOverlay')?.querySelector('[data-dev-action="unlock"]');btn?.click();return true;
   }
   if(ev.target.matches('[data-dev-input]')){
     ev.preventDefault();const inp=ev.target;execute(inp.value);inp.value='';return true;
   }
   return false;
 }
 window.NCGDev={panelHTML,handleClick,handleKey,execute,unlock,lock,unlocked:()=>unlocked,checkpoint:()=>!!checkpoint,lastCommand:()=>lastCommand};
})();
