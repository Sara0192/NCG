'use strict';
let dayBook=null;
let menuView='home';

function isMenuVisible(){const layer=document.getElementById('campaignScreen');return !!(layer&&!layer.hidden);}
function newCampaignId(){return 'C-'+newSeed()+'-'+Date.now().toString(36);}
function snapshotForDay(s){return {
 day:s.day,seed:s.seed,startMoney:Number.isFinite(Number(s.startMoney))?Number(s.startMoney):Number(s.money??400),startReputation:Number.isFinite(Number(s.startReputation))?Number(s.startReputation):Number(s.reputation??50),
 upgrades:{...(s.startUpgrades||s.upgrades||{})},beginnerAid:!!s.beginnerAid,
 completed:false,completedAt:null
};}
function saveDayBook(){return storeWithWarning(DAY_BOOK_KEY,dayBook);}
function ensureCampaignState(){
 if(!session)return;
 if(!session.campaignId)session.campaignId=newCampaignId();
 if(!dayBook){
  const candidates=[loadJSON('ncg_v647_campaign_days',null),loadJSON(DAY_BOOK_KEY,null)];
  dayBook=candidates.find(saved=>saved&&saved.campaignId===session.campaignId&&saved.days&&typeof saved.days==='object'&&!Array.isArray(saved.days))||null;
 }
 if(!dayBook||dayBook.campaignId!==session.campaignId)dayBook={schema:1,campaignId:session.campaignId,days:{}};
 const k=String(session.day);
 if(!dayBook.days[k])dayBook.days[k]=snapshotForDay(session);
 if(session.index>=session.cases.length)markDayCompleted();
 saveDayBook();
}
function markDayCompleted(){
 if(!session||session.index<session.cases.length||!dayBook)return;
 const k=String(session.day);
 if(!dayBook.days[k])dayBook.days[k]=snapshotForDay(session);
 const entry=dayBook.days[k];
 if(!entry.completed){entry.completed=true;entry.completedAt=new Date().toISOString();}
 saveDayBook();
}
function resetCampaignForNewSession(){
 if(!session)return;
 NCGLog.event('CAMPAÑA_REINICIADA',{seed:session.seed,day:session.day});
 session.campaignId=newCampaignId();
 dayBook={schema:1,campaignId:session.campaignId,days:{[session.day]:snapshotForDay(session)}};
 saveDayBook();
}
function campaignStats(){
 const done=Math.min(30,Math.max(0,session?.day-1||0)+(session?.day===CAMPAIGN_LENGTH&&session?.index===session?.cases.length?1:0));
 return {done,progress:Math.round(done/CAMPAIGN_LENGTH*100)};
}
function menuHeader(tag='UNA VIDA ENTRE MONEDAS'){
 const {progress}=campaignStats();
 return `<div class="ncg-menu-bar"><div class="ncg-menu-mark"><div class="ncg-menu-mini-seal">NCG</div><span>NUMISMATIC CERTIFICATION GUILD</span></div><div class="ncg-menu-top-right"><span>CAMPAÑA · 30 JORNADAS</span><b>${progress}%</b></div></div>`;
}
function showMenuScreen(content,kind='home'){
 const layer=$('campaignScreen');if(!layer)return;
 menuView=kind;
 $('modal').classList.remove('show');
 layer.innerHTML=content;
 layer.hidden=false;
 document.body.classList.add('ncg-in-menu');
 const shell=$('shell');
 if(shell){shell.inert=true;shell.setAttribute('aria-hidden','true');}
 const first=layer.querySelector('[data-autofocus]');if(first)first.focus({preventScroll:true});
 window.NCGQoL?.localizeMenu();
}
function closeCampaignMenu(){
 const layer=$('campaignScreen');if(!layer)return;
 layer.hidden=true;document.body.classList.remove('ncg-in-menu');
 const shell=$('shell');
 if(shell){shell.inert=false;shell.removeAttribute('aria-hidden');}
 menuView='game';
}
function showMainMenu(){
 if(!sessionReady)return;
 const exhausted=session.money<=0&&session.index>=session.cases.length;
 const complete=session.day===CAMPAIGN_LENGTH&&session.index>=session.cases.length;
 const done=session.index>=session.cases.length;
 const current=String(session.day).padStart(2,'0');
 showMenuScreen(`${menuHeader()}<div class="ncg-home">
 <div class="ncg-menu-hero"><p class="ncg-kicker">ARCHIVO DE LOS TREINTA DÍAS · EDICIÓN PC</p>
 <div class="ncg-hero-rule"></div><h1>El gabinete<br><em>de certificación</em></h1>
 <p class="ncg-menu-intro">Treinta jornadas. Cientos de dictámenes posibles. Cada expediente pone a prueba tu criterio; el desenlace solo se descubre al completar la campaña.</p>
 <div class="ncg-menu-hallmark"><div class="ncg-menu-hallmark-ring"><span>NCG</span><small>EST. MMXXVI</small></div><span>LA VERDAD<br>ESTÁ EN EL METAL</span></div></div>
 <div class="ncg-home-panel"><small class="ncg-panel-eyebrow">${session.modifiedByDeveloper?'PARTIDA MODIFICADA · DESARROLLADOR':'TU EXPEDIENTE'}</small><h2>${complete?'Campaña terminada':exhausted?'Gabinete cerrado':'Jornada '+current}</h2>
 <p>${complete?'El dictamen final está disponible.':exhausted?'Has cerrado el día sin fondos suficientes. Puedes consultar tus días y comenzar otra campaña.':session.money<=0?'Tienes un descubierto temporal: completa los expedientes restantes para intentar salvar el gabinete.':done?'Jornada terminada · preparado para el siguiente turno.':`Expediente ${String(session.index+1).padStart(2,'0')} de ${session.cases.length} · guardado automáticamente.`}</p>
 <div class="ncg-resume-details"><div><small>FONDOS</small><strong>${money(session.money)}</strong></div><div><small>REPUTACIÓN</small><strong>${session.reputation}</strong></div><div><small>SEMILLA</small><strong>${esc(session.seed)}</strong></div></div>
 <button class="ncg-menu-primary" data-menu-action="days" data-autofocus>${complete?'VER CAMPAÑA Y FINAL':'JUGAR · ELEGIR JORNADA'} <span>›</span></button>
 <button class="ncg-menu-secondary" data-menu-action="continue">${complete?'Ver desenlace':exhausted?'Ver estado de quiebra':done?'Ver informe de la jornada':'Continuar expediente'} <span>→</span></button>
 <div class="ncg-menu-separator"></div><div class="ncg-menu-links"><button data-menu-action="rules">Cómo jugar</button><button data-menu-action="backup">Exportar</button><button data-menu-action="import">Importar</button><button data-menu-action="new">Nueva campaña</button>${window.NCGDesktop?.saveAndExit?'<button data-menu-action="exit">Guardar y salir</button>':''}</div>
 <p class="ncg-menu-foot">La partida se guarda localmente. Recomendamos exportar un respaldo cada cinco jornadas.</p>
 </div></div><footer class="ncg-menu-footer"><span>NCG Desktop ${NCG_VERSION.core} · ${NCG_VERSION.release} · ${NCG_VERSION.catalogueSize} TIPOS</span><span>HECHO PARA EXAMINAR, NO PARA ADIVINAR</span></footer>`,'home');
 wireMenuActions();
}
function showDayMenu(){
 if(!sessionReady)return;
 const current=Math.min(CAMPAIGN_LENGTH,Math.max(1,session.day));
 const cards=[];
 for(let d=1;d<=CAMPAIGN_LENGTH;d++){
  const snap=dayBook?.days?.[d];
  const previous=d<current,now=d===current,locked=d>current;
  const replayable=previous&&!!snap;
  const complete=(previous||now&&session.index>=session.cases.length);
  const flag=locked?'BLOQUEADO':now?(session.index>=session.cases.length?'COMPLETO':'EN CURSO'):replayable?'COMPLETADO':'SIN PUNTO DE CONTROL';
  const title=d===30?'ÚLTIMA JORNADA':d===1?'PRIMER TURNO':d%5===0?'BALANCE':'EXPEDIENTES';
  cards.push(`<button class="ncg-day-card ${now?'is-current':''} ${complete?'is-complete':''} ${locked?'is-locked':''} ${replayable?'is-replay':''}" data-day="${d}" ${locked||previous&&!replayable?'disabled':''} aria-label="Día ${d}, ${flag.toLowerCase()}">
   <span class="ncg-day-card-top"><b>${String(d).padStart(2,'0')}</b><span>${complete?'✓':locked?'–':now?'●':'↺'}</span></span>
   <span class="ncg-day-card-title">${title}</span><span class="ncg-day-card-state">${flag}</span></button>`);
 }
 showMenuScreen(`${menuHeader()}<div class="ncg-day-shell"><div class="ncg-day-intro">
 <button class="ncg-back" data-menu-action="home">← VOLVER AL MENÚ</button><div class="ncg-kicker">ARCHIVO / SELECCIÓN DE JORNADA</div><h1>Tu recorrido</h1>
 <p>Selecciona el día que tienes en curso. Los días completados con punto de control pueden repetirse, creando una rama nueva desde aquel día.</p>
 <div class="ncg-progress-track"><span style="width:${campaignStats().progress}%"></span></div><p class="ncg-progress-caption">JORNADA ${String(current).padStart(2,'0')} / 30</p>
 <div class="ncg-day-legend"><span><i class="ncg-dot current"></i> Actual</span><span><i class="ncg-dot passed"></i> Completado</span><span><i class="ncg-dot locked"></i> Bloqueado</span></div>
 
 <small>Si vienes de V6.45, los días anteriores al guardado no tienen punto de control; se muestran como completados, pero no se pueden repetir.</small>
 </div><div class="ncg-day-grid" aria-label="Calendario de treinta jornadas">${cards.join('')}</div></div>
 <footer class="ncg-menu-footer"><span>FONDOS ${money(session.money)} · REPUTACIÓN ${session.reputation}</span><span>CERTIFICADOS HISTÓRICOS: ${history.length}</span></footer>`,'days');
 wireMenuActions();
 $('campaignScreen').querySelectorAll('[data-day]').forEach(btn=>btn.addEventListener('click',()=>selectCampaignDay(Number(btn.dataset.day))));
}
function selectCampaignDay(day){
 if(!Number.isInteger(day)||day<1||day>CAMPAIGN_LENGTH||day>session.day)return;
 if(day===session.day){continueCampaign();return;}
 const snap=dayBook?.days?.[day];if(!snap)return;
 showMenuScreen(`${menuHeader()}<div class="ncg-confirm-wrap"><p class="ncg-kicker">VOLVER AL ARCHIVO</p><h1>¿Repetir el día ${String(day).padStart(2,'0')}?</h1>
 <p>Volverás al estado económico y al taller que tenías al <b>empezar</b> ese día. Se perderá el avance de campaña posterior y se generará una <b>nueva semilla</b>. Tus certificados históricos se conservarán, incluso los de la rama anterior.</p>
 <div class="ncg-confirm-facts"><span>FONDOS AL INICIO <b>${money(snap.startMoney)}</b></span><span>REPUTACIÓN <b>${snap.startReputation}</b></span><span>JORNADAS DESBLOQUEADAS <b>${day}/30</b></span></div>
 <div class="ncg-confirm-actions"><button class="ncg-menu-secondary" data-menu-action="days">Cancelar</button><button class="ncg-menu-primary" id="confirmCampaignReplay">Sí, repetir día ${day}</button></div></div>`,'confirm');
 wireMenuActions();$('confirmCampaignReplay').onclick=()=>replayCampaignDay(day);
}
function replayCampaignDay(day){
 NCGLog.event('REPETIR_JORNADA',{day,from:session?.day});
 const snap=dayBook?.days?.[day];if(!snap||day>=session.day)return;
 const prior=dayBook.campaignId;
 const keep=Object.fromEntries(Object.entries(dayBook.days).filter(([k])=>Number(k)<day));
 session=makeSession(day,snap.startMoney,snap.startReputation,'',newSeed(),{...snap.upgrades});
 session.campaignId=prior;session.beginnerAid=!!snap.beginnerAid;
 session.storySeen=day!==1;
 dayBook.days=keep;dayBook.days[day]=snapshotForDay(session);
 saveDayBook();saveSession();
 showDayMenu();notify('Nueva rama de campaña creada desde la jornada '+day+'. Se conservaron los certificados de la anterior.','success',8);
}
function continueCampaign(){
 if(!sessionReady)return;
 closeCampaignMenu();
 if(session.day>=CAMPAIGN_LENGTH&&session.index>=session.cases.length){showCampaignFinale();return;}
 if(session.index>=session.cases.length){showEndDay();return;}
 if(normalizeInterruptedBankruptcy(session))saveSession();
 openCase();
 if(session.day===CAMPAIGN_LENGTH&&!session.finalBriefingSeen)showFinalDayBriefing();
 else if(session.day===1&&session.index===0&&!session.storySeen&&!active.variant.isFake)showStoryIntro();
}
function showFinalDayBriefing(){
 if(!session||session.day!==CAMPAIGN_LENGTH||session.finalBriefingSeen)return;
 session.finalBriefingSeen=true;saveSession();
 showModal(`<div class="modalHead"><h2>30 · Operación Último Cuño</h2><button class="close" onclick="NCG.hide()">Comenzar</button></div>
 <div class="ncg-story"><div class="ncg-story__tag">MADRID · ÚLTIMA JORNADA</div><h3>La remesa intervenida</h3><p>Una remesa extraordinaria ha llegado al gabinete para poner a prueba tu criterio. No tienes ninguna información fiable sobre la autenticidad de sus piezas.</p>
 <p>Cada moneda debe evaluarse por separado. La masa, el XRF, el canto y los relieves deben valorarse juntos; ningún resultado aislado decide el dictamen.</p><p><b>Tu objetivo:</b> justificar cada dictamen y completar la investigación. El resultado de la remesa se conocerá al final.</p>
 <div class="modalActions"><button class="submit" onclick="NCG.hide()">Abrir el primer expediente</button></div></div>`);
}
function finalDayRecords(){return history.filter(r=>r.day===CAMPAIGN_LENGTH&&r.sessionSeed===session.seed&&r.caseIndex>=0).sort((a,b)=>a.caseIndex-b.caseIndex);}
function showCampaignFinale(){
 if(!session||session.day!==CAMPAIGN_LENGTH||session.index<session.cases.length){showDayMenu();return;}
 markDayCompleted();
 const records=finalDayRecords();const real=records.find(r=>!r.wasFake);
 const fakes=records.filter(r=>r.wasFake);
 const correctlyRejected=fakes.filter(r=>r.auth==='fake').length;
 const fakeApproved=fakes.filter(r=>r.auth==='real').length;
 const authenticFound=!!(real&&real.auth==='real');
 const flawless=authenticFound&&correctlyRejected===fakes.length&&fakes.length===11&&records.length===12;
 const gradeOk=authenticFound&&(real?.gradeAssessment?.withinMargin===true || (real?.gradeAssessment?.marginLow==null && Number(real?.gradeAssessment?.difference)<=2));
 const points=correctlyRejected*7+(authenticFound?23:0)+(gradeOk?7:0)-fakeApproved*12;
 const award=flawless?(gradeOk?'MAESTRA DEL GABINETE':'INVESTIGADORA DE ÉLITE'):(points>=60?'DICTAMEN MERITORIO':points>=35?'ARCHIVO RESUELTO CON RESERVAS':'EXPEDIENTE BAJO REVISIÓN');
 const word=flawless?'Has distinguido la moneda auténtica de las once falsificaciones. El gabinete cierra su historia con el prestigio intacto.':
  authenticFound?'Encontraste la moneda auténtica, pero algunas copias consiguieron pasar o quedaron sin resolver.':'La pieza auténtica no recibió el certificado correcto. La red de falsificadores dejó dudas importantes.';
 const verdict=real?`${esc(coins.find(c=>c.id===real.id)?.name||real.id)}`:'No consta en el historial';
 showMenuScreen(`${menuHeader()}<div class="ncg-ending"><div class="ncg-ending-stamp">ARCHIVO<br>CONCLUIDO</div><p class="ncg-kicker">JORNADA TREINTA · FIN DE CAMPAÑA</p>
 <h1>El último <em>dictamen.</em></h1><h2>${award}</h2><p>${word}</p>
 <div class="ncg-ending-metrics"><div><small>FALSAS RECHAZADAS</small><strong>${correctlyRejected} / 11</strong></div><div><small>AUTÉNTICA IDENTIFICADA</small><strong>${authenticFound?'SÍ':'NO'}</strong></div><div><small>FALSAS APROBADAS</small><strong>${fakeApproved}</strong></div><div><small>PUNTOS FINALES</small><strong>${Math.max(0,points)}</strong></div></div>
 <div class="ncg-ending-proof"><b>LA MONEDA AUTÉNTICA ERA</b><p>${verdict}</p><small>${real?'Decisión: '+(real.auth==='real'?'certificada':real.auth==='fake'?'rechazada':'puesta en revisión'):'Los datos de una partida antigua no permiten identificarla con certeza.'}</small></div>
 <div class="ncg-ending-actions"><button data-menu-action="days" class="ncg-menu-primary">Ver calendario completo</button><button data-menu-action="home" class="ncg-menu-secondary">Menú principal</button><button data-menu-action="new" class="ncg-menu-secondary">Otra campaña</button></div>
 <small class="ncg-ending-foot">Fondos finales ${money(session.money)} · Reputación ${session.reputation} · Semilla ${esc(session.seed)} · Historial firmado conservado.</small>
 </div>`,'ending');wireMenuActions();
}
function showCampaignRules(){
 showMenuScreen(`${menuHeader()}<div class="ncg-rules"><button data-menu-action="home" class="ncg-back">← VOLVER</button><p class="ncg-kicker">MANUAL DEL GABINETE</p><h1>Observa. Decide. Certifica.</h1>
 <div class="ncg-rules-grid"><section><b>01 / INSPECCIONA</b><p>Gira con F, pesa la pieza, usa el calibre, la densidad, el imán y el XRF. La lupa es la única herramienta de ampliación.</p></section><section><b>02 / EMITE UN DICTAMEN</b><p>Decide si la moneda es auténtica, falsa o necesita revisión. En las auténticas indica grado Sheldon o, en antiguas, Strike y Surface.</p></section><section><b>03 / ADMINISTRA</b><p>Gana fondos y reputación, compra herramientas y supera los gastos diarios. Los errores tienen consecuencias.</p></section><section><b>04 / LLEGA AL DÍA 30</b><p>Cada jornada queda reflejada en el calendario. El contenido de la remesa final se mantiene reservado hasta terminar la campaña.</p></section></div>
 <div class="ncg-confirm-actions"><button data-menu-action="days" class="ncg-menu-primary">Empezar a jugar</button><button data-menu-action="home" class="ncg-menu-secondary">Volver</button></div></div>`,'rules');wireMenuActions();
}
function showNewCampaignConfirm(){
 showMenuScreen(`${menuHeader()}<div class="ncg-confirm-wrap"><p class="ncg-kicker">REINICIO DE EMPRESA</p><h1>¿Abrir un gabinete nuevo?</h1>
 <p>La campaña y las mejoras actuales se reiniciarán en la jornada 1 con 400 € y reputación 50. Se generará otra semilla. <b>Los certificados ya firmados no se borrarán</b>. Exporta un respaldo si quieres guardar la campaña anterior.</p>
 <div class="ncg-confirm-actions"><button data-menu-action="home" class="ncg-menu-secondary">Cancelar</button><button id="confirmNewCampaign" class="ncg-menu-primary">Crear nueva campaña</button></div></div>`,'confirm');wireMenuActions();
 $('confirmNewCampaign').onclick=()=>{session=makeSession(1,400,50,'',newSeed(),{});resetCampaignForNewSession();active=null;saveSession();showDayMenu();};
}
function wireMenuActions(){
 const screen=$('campaignScreen');screen.querySelectorAll('[data-menu-action]').forEach(btn=>btn.onclick=()=>{
  const action=btn.dataset.menuAction;
  if(action==='exit')window.NCGDesktop.saveAndExit();else if(action==='home')showMainMenu();else if(action==='days')showDayMenu();else if(action==='continue')continueCampaign();else if(action==='rules')showCampaignRules();else if(action==='backup')exportFullBackup();else if(action==='import')$('backupImportFile').click();else if(action==='new')showNewCampaignConfirm();
 });
}
