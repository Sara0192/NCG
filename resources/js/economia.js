'use strict';

function institutionalTier(rep){return INSTITUTIONAL_TIERS.find(t=>rep>=t.min)||null;}

function institutionalCandidate(c){return coinAccessLevel(c)>=165||(metalFamilia(c)==='oro'&&Number(c.mass)>=6);}

function coinAccessLevel(coin){const byId=COIN_ACCESS_LEVEL[coin.id];if(byId!==undefined)return byId;const a=Number(coin.access);return Number.isFinite(a)?a:0;}

function eligibleCoins(reputation){return coins.filter(c=>reputation>=coinAccessLevel(c));}

function accessTitle(reputation){return reputation>=2200?`Maestro numismático · grado ${Math.floor((reputation-2200)/500)+1}`:reputation>=1600?'Grandes colecciones públicas':reputation>=1200?'Patrimonio internacional':reputation>=900?'Alta especialización':reputation>=750?'Archivo de grandes colecciones':reputation>=650?'Patrimonio de excepción':reputation>=500?'Gabinete de museos':reputation>=350?'Clientes institucionales':reputation>=225?'Gabinete de élite':reputation>=165?'Contratos de prestigio':reputation>=115?'Licencia de oro':reputation>=95?'Peritaje internacional':'Gabinete general';}

function hasUpgrade(id){return !!session?.upgrades?.[id];}

function upgradeUpkeep(upgrades){return WORKSHOP_ITEMS.reduce((n,item)=>n+(upgrades?.[item.id]?item.upkeep:0),0);}

function businessScaleFee(day){
 const d=Math.max(1,Math.floor(Number(day)||1));
 return d<=8?0:Math.min(176,(d-8)*8);
}
function professionalLicenseFee(reputation){
 const r=Math.max(0,Number(reputation)||0);
 return r>=1200?85:r>=900?70:r>=650?55:r>=500?40:r>=350?25:r>=225?15:0;
}
function capacityOperatingFee(day,reputation,previousCases=9,upgrades={}){
 const d=Math.max(1,Math.floor(Number(day)||1));
 if(d<=10)return 0;
 const r=Math.max(0,Number(reputation)||0);
 const count=Number.isFinite(Number(previousCases))?Math.max(9,Math.min(16,Math.floor(Number(previousCases)))):9;
 const variablePerCase=16+4*Math.min(5,Math.floor((d-11)/4));
 const workload=(count-9)*variablePerCase;
 const specialist=r>=2200?280:r>=1600?260:r>=1200?215:r>=900?175:r>=650?135:r>=500?110:r>=350?75:r>=225?45:r>=115?20:0;
 const workstations=['balance','micro','xrf'].filter(id=>upgrades?.[id]).length;
 const stations=workstations*(d>=20?18:12);
 return Math.min(525,workload+specialist+stations);
}
function dailyOverhead(upgrades,day=1,reputation=0,previousCases=9){
 return OFFICE_FIXED_COST+upgradeUpkeep(upgrades)+businessScaleFee(day)+professionalLicenseFee(reputation)
   +capacityOperatingFee(day,reputation,previousCases,upgrades);
}
function nextDayOverhead(state){
 const nextDay=Number(state?.day||0)+1;
 const currentCases=Array.isArray(state?.cases)?state.cases.length:9;
 const total=dailyOverhead(state?.upgrades,nextDay,state?.reputation,currentCases);
 return total-openingSupport(state,nextDay);
}


const TRAINING_DAYS=3;
function openingSupport(state,day){return day>=2&&day<=TRAINING_DAYS?(state?.beginnerAid?OFFICE_FIXED_COST:50):0;}

function xrfFee(state=session,item=null,side=0){
 const other=item?.readings?.['xrf'+(1-side)];
 return state?.beginnerAid&&state.day<=TRAINING_DAYS&&!other?XRF_FEE/2:XRF_FEE;
}

function trainingResult(result,state){
 if(!state.beginnerAid||state.day>TRAINING_DAYS)return result;
 const {change:originalChange,repChange:originalRep}=result;
 const change=Math.max(-25,originalChange),repChange=Math.max(-4,originalRep);
 if(change===originalChange&&repChange===originalRep)return result;
 const trainingAid={subsidy:change-originalChange,reputationProtected:repChange-originalRep,originalChange,originalRep};
 return {...result,change,repChange,trainingAid,judgment:result.judgment+' · protección de aprendizaje'};
}

function makeNextSession(state,{seed='',fine=0}={}){
 const fee=nextDayOverhead(state),funds=state.money-fine-fee;
 if(state.day>=CAMPAIGN_LENGTH||funds<=0)return null;
 const rep=Math.max(0,state.reputation-(fine?2:0));
 const next=makeSession(state.day+1,funds,rep,'',seed,state.upgrades);
 Object.assign(next,{campaignId:state.campaignId,beginnerAid:!!state.beginnerAid,lastOverhead:fee});
 return next;
}

function makeSession(day=1,m=400,rep=50,avoidFirstId='',overrideSeed='',upgrades={}){
 const seed=overrideSeed||newSeed();useSeed(seed);
 const available=eligibleCoins(rep);
 const maxCount=Math.min(16,available.length);
 const minCount=Math.min(maxCount,9);
 const count=day===CAMPAIGN_LENGTH?Math.min(12,available.length):randInt(minCount,maxCount);
 let order=shuffled(available.map(c=>c.id)).slice(0,count);
 const institutional=institutionalTier(rep);
 const institutionals=new Set();
 if(institutional){
  const elite=shuffled(available.filter(institutionalCandidate).map(c=>c.id));
  const requested=Math.min(elite.length,rep>=900?5:rep>=650?4:rep>=500?3:2, count);
  const selected=elite.slice(0,requested);
  for(const id of selected)institutionals.add(id);
  order=shuffled([...selected,...order.filter(id=>!institutionals.has(id)).slice(0,count-requested)]);
  for(const id of shuffled(available.map(c=>c.id)))if(order.length<count&&!order.includes(id))order.push(id);
 }
 if(avoidFirstId&&order.length>1&&order[0]===avoidFirstId){const target=randInt(1,order.length-1);[order[0],order[target]]=[order[target],order[0]];}
 const fakeCount=day===CAMPAIGN_LENGTH?count-1:randInt(1,Math.min(4,count));
 const fakePool=day===1?order.slice(1):order;
 const fakeIds=new Set(shuffled(fakePool).slice(0,fakeCount));
 const detailsPlan=scheduleDetails(count);
 const cases=order.map((id,i)=>({id,institutional:institutionals.has(id),clientTier:institutionals.has(id)?institutional.title:null,variant:generateVariant(coins.find(c=>c.id===id),fakeIds.has(id),detailsPlan[i])}));
 NCGLog.event('JORNADA_GENERADA',{day,seed,count,details:cases.filter(c=>!!c.variant.hiddenDetails).length,fakes:fakeCount,initialFunds:m,initialReputation:rep});
 if(day===CAMPAIGN_LENGTH&&cases.filter(c=>!c.variant.isFake).length!==1)throw Error('El archivo final debe contener exactamente una moneda auténtica.');
 return {version:GAME_VERSION,seed,day,money:m,reputation:rep,startMoney:m,startReputation:rep,index:0,cases,finished:false,reviewCount:0,xrfSpent:0,clockStart:9,storySeen:false,upgrades:{...upgrades},startUpgrades:{...upgrades},lastOverhead:0,beginnerAid:false,firstGuidanceSeen:false};
}

function playDayTransition(day,callback){
 const overlay=$('dayTransition');if(changingDay)return;
 if(!overlay||window.NCGQoL?.getSettings?.().reduceMotion||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){callback();return;}
 changingDay=true;
 const num=$('dayTransitionNumber');if(num)num.textContent=String(day).padStart(2,'0');
 const message=$('dayTransitionMessage');if(message)message.textContent='El gabinete abre de nuevo';
 overlay.hidden=false;overlay.classList.remove('ncg-day-leave');
 requestAnimationFrame(()=>overlay.classList.add('ncg-day-active'));
 setTimeout(()=>{
  try{callback();}finally{
   overlay.classList.add('ncg-day-leave');
   setTimeout(()=>{overlay.classList.remove('ncg-day-active','ncg-day-leave');overlay.hidden=true;changingDay=false;},650);
  }
 },850);
}

function beginNewDay(){
 if(changingDay)return;
 if(session?.day>=CAMPAIGN_LENGTH){
  if(session.index>=session.cases.length)showCampaignFinale();
  else notify('Jornada 30: no se puede saltar el último expediente. Termina la investigación o vuelve al menú.','warning',7);
  return;
 }
 const pending=session&&!session.finished?session.cases.length-session.index:0;
 const fine=pending?15+Math.min(30,pending*2):0;
 if(pending&&!confirm(`La jornada tiene ${pending} expedientes pendientes. Abandonarla supone −${fine} € y −2 de reputación. ¿Cerrar el turno?`))return;
 const next=session?makeNextSession(session,{fine}):makeSession();
 if(!next){showBankruptcy();return;}
 const nextDay=next.day,actualFee=next.lastOverhead;
 playSfx('day');
 const beginnerSupport=openingSupport(session,nextDay);
 const sourceSession=session;
 playDayTransition(nextDay,()=>{
  if(session!==sourceSession)return;
  session=next;
  NCGLog.event('JORNADA_INICIADA',{day:nextDay,seed:session.seed,funds:session.money,rep:session.reputation,overhead:actualFee});
  ensureCampaignState();
  saveSession();openCase();refreshBackupIndicator();
  if(nextDay===CAMPAIGN_LENGTH)showFinalDayBriefing();
  addLog(`Inicio de jornada: costes ${actualFee+beginnerSupport} €${beginnerSupport?`, ayuda de formación +${beginnerSupport} €`:''}; neto −${actualFee} €.`);
 });
}

function isDayStillInProgress(s){return !!s&&s.index<s.cases.length;}
function normalizeInterruptedBankruptcy(s){
 if(s&&s.finished&&isDayStillInProgress(s)&&s.money<=0){
  s.finished=false;return true;
 }
 return false;
}

function showBankruptcy(){
 showModal(`<div class="modalHead"><h2>Gabinete en quiebra</h2><button class="close" onclick="NCG.hide()">Cerrar</button></div><div class="noteBlock"><p>${session?.index<session?.cases?.length?'El cierre anticipado de la jornada, con saldo insuficiente, impide abrir el siguiente turno.':'El saldo no cubre la apertura de la siguiente jornada. Los gastos de apertura siguen pendientes.'} El historial de certificados seguirá guardado.</p><p>Mientras existan expedientes pendientes, puedes continuar el día desde el menú y recuperar los fondos con dictámenes acertados. Reiniciar la empresa devuelve 400 € y reputación 50, sin borrar el historial.</p></div><div class="modalActions"><button id="reopenOffice">Reiniciar empresa</button><button onclick="NCG.hide()">Ver historial o cerrar</button></div>`);
 $('reopenOffice').onclick=()=>{session=makeSession(1,400,50,'','',{});resetCampaignForNewSession();saveSession();hideModal();showDayMenu();};
}

function showWorkshop(){
 const upgrades=session?.upgrades||{};
 const cards=WORKSHOP_ITEMS.map(item=>{
  const owned=!!upgrades[item.id];const canBuy=!owned&&session.money>=item.price;
  return `<div class="ncg-work-item"><div><h3>${esc(item.title)}</h3><p>${esc(item.desc)}</p><small>Precio ${item.price} € · Mantenimiento +${item.upkeep} €/jornada</small></div><button data-buy="${item.id}" data-ncg-sound="none" ${canBuy?'':'disabled'}>${owned?'Instalado':canBuy?'Comprar':'Fondos insuficientes'}</button></div>`;
 }).join('');
 showModal(`<div class="modalHead"><h2>Taller y mejoras del gabinete</h2><button class="close" onclick="NCG.hide()">Cerrar</button></div>
 <div class="ncg-work-summary"><b>Fondos disponibles: ${money(session.money)}</b> · Reputación ${session.reputation} · ${accessTitle(session.reputation)}<p>Al abrir cada jornada se cobran ${OFFICE_FIXED_COST} € de costes fijos de alquiler y salarios y ${upgradeUpkeep(upgrades)} € de mantenimiento. Crecimiento del gabinete: ${businessScaleFee((session?.day||1)+1)} €; licencias profesionales: ${professionalLicenseFee(session?.reputation)} €; capacidad y personal según ${session?.cases?.length||9} expedientes: ${capacityOperatingFee((session?.day||1)+1,session?.reputation,session?.cases?.length??9,upgrades)} € (todos incluidos en el próximo coste, ${nextDayOverhead(session)} €). La primera jornada está pagada.${session?.beginnerAid&&session.day<3?` <b>Modo aprendizaje:</b> el alquiler y los salarios de los primeros tres días están cubiertos; próximo turno: ${nextDayOverhead(session)} € de mantenimiento.`:''}</p></div>
 <div class="ncg-work-list">${cards}</div><div class="ncg-work-summary"><p>Progresión de licencias: 95 internacional, 115 oro, 165 prestigio, 225 élite; desde 350 llegan clientes institucionales, desde 500 museos, 650 patrimonio y rangos posteriores sin tope. Las mejoras se mantienen entre turnos, pero se pierden al reiniciar la empresa tras una quiebra.</p></div>`);
 $('modalBox').querySelectorAll('[data-buy]').forEach(btn=>btn.onclick=()=>buyUpgrade(btn.dataset.buy));
}

function buyUpgrade(id){
 const item=WORKSHOP_ITEMS.find(x=>x.id===id);if(!item||!session)return;
 if(!session.upgrades)session.upgrades={};
 if(session.upgrades[id]||session.money<item.price){showWorkshop();return;}
 session.money-=item.price;session.upgrades[id]=true;playSfx('purchase');saveSession();renderCaseTop();
 if(tool==='micro'){showTool();drawCoin();}
 if(tool==='scale')showTool();
 showWorkshop();
}

function renderCaseTop(){updateClock();refreshBackupIndicator();
 $('cash').textContent=money(session.money);$('reputation').textContent=session.reputation;
 $('cash').classList.toggle('ncg-debt-balance',session.money<=0);
 $('cash').title=session.money<=0&&isDayStillInProgress(session)
  ?`Descubierto temporal: puedes completar los ${session.cases.length-session.index} expedientes restantes sin XRF ni compras hasta recuperar fondos. Se comprueba la quiebra al cerrar la jornada.`
  :`XRF ${xrfFee()===XRF_FEE?XRF_FEE+' € por cara':'6 € la primera cara y 12 € la segunda por expediente'}. Próximo turno: ${nextDayOverhead(session)} € en gastos después de las ayudas aplicables.`;
 $('reputation').title=`${accessTitle(session.reputation)}. Escala sin tope: instituciones 350, museos 500, patrimonio 650, especialistas 900; maestros desde 2200.`;
}

function showEndDay(){
 if(session.day>=CAMPAIGN_LENGTH&&session.index>=session.cases.length){markDayCompleted();showCampaignFinale();return;}
 if(session.money<=0){showBankruptcy();return;}
 markDayCompleted();
 const dayRecords=history.filter(r=>r.day===session.day&&r.sessionSeed===session.seed);
 const mistakes=dayRecords.filter(r=>r.falseApproved).length;
 const missed=dayRecords.filter(r=>r.missedAncient).length;
 const closeGrades=dayRecords.filter(r=>r.auth==='real'&&!r.wasFake&&(r.gradeAssessment?.withinMargin===true || (r.gradeAssessment?.marginLow==null && Number(r.gradeAssessment?.difference)<=1))).length;
 const institutionalCases=dayRecords.filter(r=>r.institutional).length;
 const due=backupDue();
 refreshBackupIndicator();
 const reminder=due?`<div class="ncg-backup-reminder"><b>Respaldo recomendado · jornada ${session.day}</b><p>Han pasado cinco jornadas desde el recordatorio anterior. Al jugar mediante <code>file://</code>, algunos navegadores pueden perder los guardados locales al mover la carpeta o cambiar la configuración. Exporta una copia JSON con partida, taller e historial.</p><button id="backupEndDay" type="button">Exportar respaldo JSON ahora</button><small>El aviso seguirá visible al abrir el resumen hasta iniciar la descarga.</small></div>`:'';
 showModal(`<div class="modalHead"><h2>Jornada ${String(session.day).padStart(2,'0')} finalizada</h2><button class="close" onclick="NCG.hide()">Cerrar</button></div><div class="sideCard"><h3>${session.cases.length} monedas examinadas</h3><p>Fondos: <b>${money(session.money)}</b> · Reputación: <b>${session.reputation}</b> · ${accessTitle(session.reputation)} · Falsificaciones aprobadas: <b>${mistakes}</b> · Antiguas auténticas rechazadas como falsas: <b>${missed}</b> · Grados dentro del margen: <b>${closeGrades}</b></p><p class="smallText">XRF pagados: ${money(session.xrfSpent||0)}. Encargos institucionales: ${institutionalCases}. Licencia: ${accessTitle(session.reputation)}. Próximos hitos: 350, 500, 650, 900, 1200, 1600 y 2200. Después continúa el prestigio sin límite. Próximo turno: −${nextDayOverhead(session)} € de costes (incluye ${capacityOperatingFee(session.day+1,session.reputation,session.cases?.length??9,session.upgrades)} € de capacidad).</p><p class="smallText">Lote aleatorio: <b>${esc(session.seed||'NCG')}</b>.</p></div>${reminder}<div class="modalActions"><button id="viewHistEnd">Ver historial</button><button id="shopEnd">Abrir taller</button><button id="newDayEnd">Jugar otra jornada aleatoria</button></div>`);
 $('viewHistEnd').onclick=showHistory;$('shopEnd').onclick=showWorkshop;
 $('newDayEnd').onclick=()=>{hideModal({returnToMenu:false});beginNewDay();};
 const actions=$('newDayEnd').parentElement;const menuBtn=document.createElement('button');menuBtn.textContent='Calendario de campaña';menuBtn.onclick=()=>{hideModal();showDayMenu();};actions.prepend(menuBtn);
 if($('backupEndDay'))$('backupEndDay').onclick=exportFullBackup;
}

