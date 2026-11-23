'use strict';

// Coordinación de la partida y la interfaz del gabinete.
// Los efectos visuales se aplican exclusivamente en shaders_monedas.js.

const NCG_SOUND_KEY='ncg_v6_sfx_enabled';
const NCG_VISUAL_KEY='ncg_v64_visual_mode';
let sfxOn=true;try{const saved=window.NCGDesktop?.readValue?.(NCG_SOUND_KEY)??localStorage.getItem(NCG_SOUND_KEY);sfxOn=saved!==false&&saved!=='false';}catch(_e){}
function storedCoinView(value){
 // Las ediciones antiguas guardaban texto plano en el navegador y JSON en disco.
 return value==='vectorial'||value==='"vectorial"'?'vectorial':'realista';
}
let visualMode='realista';
try{
 const saved=window.NCGDesktop?.readValue?.(NCG_VISUAL_KEY)??localStorage.getItem(NCG_VISUAL_KEY);
 visualMode=storedCoinView(saved);
}catch(_e){}
window.addEventListener('storage',event=>{
 if(event.key===NCG_VISUAL_KEY)setCoinView(storedCoinView(event.newValue),false);
});
let audioContext=null;

function playSfx(kind,detail){return window.NCGSound?.play(kind,detail)||false;}

// Preparación del lienzo: render_base.js.

function safeReportPortrait(record,side=0){
 const c=coins.find(one=>one.id===record?.id);
 return c ? coinFallbackPath(c,side) : '';
}
let historyMode='gallery',historyPage=0,historyQuery='',historyFilter='all';

let history=[];
let session=null;
let active=null;
let tool='view';
let face=0;
let selectedAuth='';

let cx=0,cy=0;
let draggingCoin=null;
let draggingMag=null;
let uvCount=0,microCount=0;
let lastUVPointerUpdate=0; // Protección de CPU/GPU: UV máximo 20 actualizaciones/s.

let lastMicroPointerAt=0;

let logLines=[];
let sessionReady=false;
let externalTest={};
let edgeRotation=0;
let edgeReadDone=false;

let noticeTimer=null;

let storageWarningShown=false;

const GRADE_BANDS=[{limit:1,rep:2,money:12,label:'Grado preciso'},{limit:2,rep:0,money:0,label:'Margen aceptable'},{limit:4,rep:-2,money:-10,label:'Desajuste moderado'},{limit:7,rep:-4,money:-22,label:'Error de conservación importante'},{limit:11,rep:-7,money:-45,label:'Grado muy distinto'},{limit:Infinity,rep:-11,money:-80,label:'Fallo grave en el grado'}];

let changingDay=false;

function currentCoin(){return coins.find(c=>c.id===active.id);}
const DRAFT_FIELDS=['gradeSel','finishSel','detailsSel','notes','strikeSel','surfaceSel'];

// Abre el expediente y restaura cualquier borrador guardado de esa moneda.
function openCase(){
 if(!session)return;
 if(session.index<session.cases.length&&session.finished&&session.money<=0)session.finished=false;
 if($('ncgMissingField'))clearSigningError();
 if(session.index>=session.cases.length){showEndDay();return;}

 active=session.cases[session.index];
 NCGLog.event('EXPEDIENTE_ABIERTO',{day:session.day,index:session.index+1,total:session.cases.length,coin:active.id});
 tool='view';
 face=0;
 selectedAuth='';
 uvCount=0;
 microCount=0;
 lastUVPointerUpdate=0;
 logLines=[];
 edgeRotation=0;
 edgeReadDone=false;

 for(const name of DRAFT_FIELDS)if($(name))$(name).value='';
 $('serviceSel').value=currentCoin().ancient?'ancients':'standard';
 updateServiceUI();
 for(const button of $('authButtons').querySelectorAll('button'))button.classList.remove('selected');
 $('labelStatus').textContent='SIN FIRMAR';
 $('signBtn').disabled=false;
 $('signBtn').textContent='Firmar dictamen';
 restoreCaseDraft();
 updateGradeMarginHelp();
 resetCaliper();
 renderTools();
 renderCase();
 renderReadings();
 refreshMinimumExamUI();
 resetCoinPosition();
 updateTutorial();

 playSfx('case');
 const token=$('coinToken');
 token.classList.remove('ncg-coin-arrival');
 void token.offsetWidth;
 token.classList.add('ncg-coin-arrival');
 addLog(`Expediente recibido. Lote ${session.seed||'NCG'}. ${accessTitle(session.reputation)}. XRF: ${xrfFee()===XRF_FEE?XRF_FEE+' € por cara':'6 € la primera cara de cada expediente y 12 € la segunda'}. Las falsificaciones y grados se distribuyen aleatoriamente. Un informe de laboratorio completo se factura a 15 € solo si la certificación resulta correcta.`);
 if(session.index>0&&session.index%3===0)addLog('NOTICIAS DEL GABINETE · '+STORY_EVENTS[Math.floor(session.index/3-1)%STORY_EVENTS.length]);
}

function resetCoinPosition(){const d=$('desk');recalibrateSceneScale();applyCoinScale(currentCoin());cx=d.clientWidth*.50;cy=d.clientHeight*.51;updateCoinPosition();if(tool==='caliper')centerCaliper();}
function updateCoinPosition(){$('coinToken').style.left=cx+'px';$('coinToken').style.top=cy+'px';$('coinToken').style.transform=`translate(-50%,-50%)`;}

function read(k,value,log){
 if(!active.readings)active.readings={};if(active.readings[k])return;
 active.readings[k]=value;updateTutorial();renderReadings();refreshMinimumExamUI();addLog(log||`${k}: ${value}`);saveSession();
 const cues={mass:'scale',dia:'caliper',magnet:'magnet',micro:'micro',uv:'uv',light:'light',edge:'edge'};
 if(cues[k])playSfx(cues[k]);
}
function inspectMetalReference(){
 if(!active)return;
 const c=currentCoin(),[,hz,decay,brightness]=sonidoMetal(c);
 const ratio=Math.sqrt(Math.max(.7,Math.min(1.45,28/Math.max(15,Number(c.diameter)||28))));
 const ref={hz:Math.round(hz*ratio),decay,brightness,dissonance:false};
 playSfx('ring',ref);
 if(!sfxOn)addLog('El sonido está silenciado: activa SFX para comparar con la referencia del metal.');
}
function inspectCoinResonance(){
 if(!active)return;
 const profile=active.variant.acoustic||createAcousticProfile(currentCoin(),active.variant);
 active.variant.acoustic=profile; // compatible con partidas guardadas antes de V16
 playSfx('ring',profile);
 const value=profile.label+' · pista orientativa, no concluyente';
 read('tap',value,'Prueba de toque: '+value+'. Comparar con el metal declarado y otras mediciones.');
}

function addLog(s){NCGLog.event('MENSAJE_JUEGO',{text:s});logLines.unshift(s);$('log').innerHTML=logLines.slice(0,12).map((t)=>`<div>${esc(t)}</div>`).join('');}
function lightObservation(){
 const s=active?.variant?.shader||{};
 const l=Number(s.lustre??.4),w=Number(s.wearLevel??.3);
 if(l>.68&&w<.24)return 'Destellos radiales persistentes y puntos altos definidos; contrastar con marcas de contacto';
 if(l>.43)return 'Brillo residual discontinuo; examina los relieves más expuestos';
 if(l>.23)return 'Lustre escaso, interrumpido sobre puntos altos; no determina por sí solo el grado';
 return 'Reflejo débil o mate; posible desgaste, acabado original o alteración superficial';
}


function selectTool(id){
 if(id==='micro'&&ncgCoinSafeMode){
  notify('Para usar el microscopio, pulsa «Volver a la vista interactiva». La imagen segura no contiene los defectos de la partida.','warning',6);
  return;
 }
 if(id==='micro' && tool==='micro')id='view';
 if(id===tool && id==='view')return; // Evitar redibujar a 860 px al clicar repetidamente Vista; otras herramientas conservan la repetición intencionada.
 NCGLog.event('HERRAMIENTA_ACTIVADA',{tool:id,coin:active?.id,side:face});
 if(id==='flip'){flip();return;}
 playSfx('ui');
 tool=id;
 if(id==='caliper'){resetCoinPosition();resetCaliper();}
 if(id==='micro'||id==='view'){lastMicroPointerAt=0;}
 renderTools();showTool();updateTutorial();
 if(id==='micro'||id==='light'||id==='view')drawCoin();
 if(id==='edge')renderEdgeTool(true);
}
function hitCoin(e){const rect=$('coinToken').getBoundingClientRect();const x=e.clientX-(rect.left+rect.width/2),y=e.clientY-(rect.top+rect.height/2);return Math.hypot(x,y)<rect.width*.455;}
function getHitPosition(e){const r=$('desk').getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function edgePalette(metal){if(metal==='oro'||metal==='bronce_aluminio'||metal==='laton')return {base:'#cfa847',shadow:'#7e5d1c',highlight:'#f8e6a0'};if(['plata','aluminio','cuproniquel','niquel'].includes(metal))return {base:'#bcc4ca',shadow:'#6d767f',highlight:'#eef2f4'};return {base:'#ba6d43',shadow:'#6a3c24',highlight:'#e6af87'};}
function edgeProfileData(){return active?.variant?.edgeProfile||{type:'normal',label:'Canto regular',note:currentCoin()?.edgeNote||'Inspección visual no concluyente por sí sola.',visual:'none',suspicious:false,severe:false};}
function edgeDescription(){const v=active.variant,c=currentCoin(),base=c.edgeLabel||'Canto sin especificar',ep=edgeProfileData();if(ep&&ep.type&&ep.type!=='normal')return base+'. '+ep.note;if(v.isFake&&!v.subtleFake){return base+'. '+(v.fakeType==='chapada'?'Se aprecia una transición sospechosa del baño o recubrimiento.':'El canto presenta una lectura sospechosa; la vista 360° no decide por sí sola.');}return base+'. '+(c.edgeNote||'Inspección visual no concluyente por sí sola.');}
function edgeVisualLayers(ep){
 if(!ep||!ep.visual||ep.visual==='none')return [];
 const layers={
  scratches:'repeating-linear-gradient(90deg,transparent 0 14px,rgba(255,255,255,.20) 14px 15px,rgba(0,0,0,.20) 15px 16px,transparent 16px 30px)',
  deep_scratches:'repeating-linear-gradient(90deg,transparent 0 10px,rgba(0,0,0,.34) 10px 14px,rgba(255,255,255,.18) 14px 16px,transparent 16px 28px)',
  filed:'repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0 8px,rgba(70,48,22,.22) 8px 12px,rgba(255,255,255,.26) 12px 13px,rgba(0,0,0,.18) 13px 16px,transparent 16px 24px)',
  clipped:'radial-gradient(circle at 14% 48%, rgba(0,0,0,.34) 0 18px, transparent 19px),radial-gradient(circle at 15% 50%, rgba(255,255,255,.14) 0 10px, transparent 11px)',
  bump:'radial-gradient(circle at 70% 40%, rgba(255,255,255,.24) 0 14px, transparent 15px),radial-gradient(circle at 72% 58%, rgba(0,0,0,.28) 0 18px, transparent 19px)',
  bent:'linear-gradient(180deg,transparent 0 22%, rgba(255,255,255,.22) 22% 30%, transparent 30% 66%, rgba(0,0,0,.22) 66% 77%, transparent 77% 100%)',
  seam:'repeating-linear-gradient(90deg,transparent 0 36px,rgba(255,255,255,.28) 36px 38px,rgba(70,70,70,.22) 38px 40px,transparent 40px 70px)',
  ragged:'repeating-linear-gradient(90deg,transparent 0 18px,rgba(0,0,0,.18) 18px 22px,rgba(255,255,255,.10) 22px 24px,transparent 24px 37px),linear-gradient(180deg,transparent 0 16%, rgba(0,0,0,.16) 16% 21%, transparent 21% 78%, rgba(255,255,255,.10) 78% 84%, transparent 84% 100%)',
  flattened:'linear-gradient(180deg, rgba(255,255,255,.18) 0 12%, transparent 12% 40%, rgba(0,0,0,.14) 40% 63%, transparent 63% 100%)'
 };
 return (layers[ep.visual]? [layers[ep.visual]]: []).filter(Boolean);
}
function renderEdgeTool(force=false){
 const host=$('edgeView');
 if(force||!host.dataset.ready){
  host.innerHTML=`<div class="edgeHead"><span id="edgeTypeTitle">Vista del canto</span><span id="edgeAngle">0°</span></div><div class="edgeRing"><div class="edgeStrip" id="edgeStrip"></div></div><div class="edgeControls"><button type="button" id="edgeLeft">◀ 15°</button><input id="edgeRotate" type="range" min="0" max="360" value="0" step="1"><button type="button" id="edgeRight">15° ▶</button></div><div class="edgeNote" id="edgeNote"></div>`;
  host.dataset.ready='1';
  $('edgeRotate').addEventListener('input',e=>{edgeRotation=+e.target.value;updateEdgeStrip();});
  $('edgeLeft').onclick=()=>{edgeRotation=(edgeRotation+345)%360;$('edgeRotate').value=edgeRotation;updateEdgeStrip();};
  $('edgeRight').onclick=()=>{edgeRotation=(edgeRotation+15)%360;$('edgeRotate').value=edgeRotation;updateEdgeStrip();};
 }
 const c=currentCoin(),type=c.edgeType||'liso',p=edgePalette(paletaMoneda(c)),strip=$('edgeStrip'),ep=edgeProfileData();
 const metallic=`linear-gradient(180deg,${p.highlight} 0%,${p.base} 22%,${p.shadow} 48%,${p.base} 72%,${p.highlight} 100%)`;
 const patterns={
  liso:metallic,
  estriado:`repeating-linear-gradient(90deg,${p.shadow} 0 3px,${p.base} 3px 7px,${p.highlight} 7px 8px,${p.base} 8px 11px),${metallic}`,
  cordoncillo:`repeating-linear-gradient(118deg,${p.shadow} 0 3px,${p.base} 3px 7px,${p.highlight} 7px 9px,${p.base} 9px 13px),repeating-linear-gradient(62deg,transparent 0 7px,#ffffff22 7px 9px,transparent 9px 14px),${metallic}`,
  rayado:`repeating-linear-gradient(112deg,${p.shadow} 0 2px,${p.base} 2px 10px,${p.highlight} 10px 12px,${p.base} 12px 18px),${metallic}`,
  martillado_irregular:`repeating-linear-gradient(87deg,${p.shadow} 0 7px,${p.base} 7px 12px,${p.highlight} 12px 14px,${p.base} 14px 24px),repeating-linear-gradient(4deg,transparent 0 7px,#0003 7px 9px,transparent 9px 17px),${metallic}`
 };
 strip.dataset.type=type;strip.style.setProperty('--edge-highlight',p.highlight);strip.style.backgroundImage=patterns[type]||metallic;strip.style.backgroundSize=type==='martillado_irregular'?'31px 100%,100% 100%,100% 100%':'auto,100% 100%';
 strip.style.backgroundRepeat='repeat,no-repeat,no-repeat';strip.style.borderRadius=type==='martillado_irregular'?'12px 20px 14px 17px':'999px';strip.style.clipPath=type==='martillado_irregular'?'polygon(0 14%,5% 8%,10% 16%,16% 7%,22% 15%,29% 9%,36% 16%,43% 8%,50% 15%,57% 7%,64% 14%,71% 8%,78% 16%,85% 8%,92% 15%,100% 9%,100% 90%,94% 84%,88% 92%,80% 85%,73% 93%,66% 86%,58% 92%,50% 85%,42% 93%,34% 86%,27% 92%,19% 85%,12% 93%,5% 86%,0 92%)':'none';
 if(type==='estrellas'){strip.style.backgroundImage=metallic;strip.innerHTML=`<span class="edgeMotifs">${Array(44).fill('★').join('　')}</span>`;}
 else if(type==='flores_lis'){strip.style.backgroundImage=metallic;strip.innerHTML=`<span class="edgeMotifs">${Array(27).fill('⚜').join('　')}</span>`;}
 else if(type==='leyenda'||type==='leyenda_estriado'){strip.style.backgroundImage=type==='leyenda_estriado'?patterns.estriado:metallic;strip.innerHTML='<span class="edgeMotifs edgeLettering">'+esc(Array(4).fill(c.edgeInscription||c.edgeLabel||'CANTO INSCRITO').join(' · '))+'</span>';strip.querySelector('.edgeLettering').classList.toggle('incuse',!!c.edgeIncuse);}
 else strip.textContent='';
 const overlays=edgeVisualLayers(ep);
 if(active.variant.isFake&&active.variant.fakeType==='chapada'&&(!ep||ep.visual!=='seam'))overlays.push('repeating-linear-gradient(90deg,transparent 0 36px,rgba(255,255,255,.28) 36px 38px,rgba(70,70,70,.22) 38px 40px,transparent 40px 70px)');
 if(overlays.length)strip.style.backgroundImage=[strip.style.backgroundImage,...overlays].join(',');
 $('edgeTypeTitle').textContent=(c.edgeLabel||'Vista del canto')+(ep&&ep.type!=='normal'?' · '+ep.label:'');$('edgeNote').textContent=edgeDescription();updateEdgeStrip();
 if(!edgeReadDone){read('edge',active.variant.edgeIssue?('Incidencia: '+(ep?.label||'Canto alterado')):(c.edgeLabel||'Compatible a simple vista'),'Canto: '+edgeDescription());edgeReadDone=true;}
}
function updateEdgeStrip(){const strip=$('edgeStrip');if(!strip)return;strip.style.backgroundPosition=`${-edgeRotation*1.6}px 0, 0 0, ${-edgeRotation*.7}px 0, ${-edgeRotation*.4}px 0, ${-edgeRotation*1.1}px 0`;const motif=strip.querySelector('.edgeMotifs');if(motif)motif.style.transform=`translateX(${-edgeRotation/360*(motif.scrollWidth/2)}px)`;$('edgeAngle').textContent=Math.round(edgeRotation)+'°';}
function dropCoin(){const center=$('coinToken').getBoundingClientRect(),px=center.left+center.width/2,py=center.top+center.height/2;const st=tool==='scale'?$('scaleStation'):tool==='hydro'?$('hydroStation'):null;if(!st){return;}const r=st.getBoundingClientRect(),sx=r.left+r.width/2,sy=r.top+r.height/2;if(Math.hypot(px-sx,py-sy)<135){if(tool==='scale'){const digits=hasUpgrade('balance')?3:2;const value=active.variant.mass.toFixed(digits)+' g';
 const delta=Number(active.variant.mass)-Number(currentCoin().mass);
 const tol=isHammeredCoin(currentCoin())?Number(currentCoin().mass)*hammeredWeightTolerance(currentCoin()):Math.max(.07,Number(currentCoin().mass)*.016);
 const audit=hasUpgrade('balance')?` · Metrología: desviación ${delta>=0?'+':''}${delta.toFixed(3)} g; ${Math.abs(delta)>tol?'FUERA':'dentro'} de tolerancia orientativa ±${tol.toFixed(3)} g. No determina autenticidad.`:'';
 const compact=hasUpgrade('balance')?`${value} · Δ ${delta>=0?'+':''}${delta.toFixed(3)} g · ${Math.abs(delta)>tol?'revisar masa':'tolerancia orientativa'}`:value;read('mass',compact,'Pesaje en seco: '+value+audit);$('scaleDigital').textContent=value;}else if(tool==='hydro'){playSfx('hydro');if(!active.readings?.mass){addLog('Antes de la prueba hidrostática debes pesar en seco la moneda.');}else{read('density',active.variant.density.toFixed(2)+' g/cm³','Densidad hidrostática simulada: '+active.variant.density.toFixed(2)+' g/cm³.');}}}resetCoinPosition();}
function detectMagnet(){const m=$('magnetObject').getBoundingClientRect(),c=$('coinToken').getBoundingClientRect(),mx=m.left+m.width/2,my=m.top+m.height/2,cx1=c.left+c.width/2,cy1=c.top+c.height/2;if(Math.hypot(mx-cx1,my-cy1)<(c.width*.46+50)){read('magnet',active.variant.magnet?'Atracción':'Sin atracción',active.variant.magnet?'Imán: se observa atracción.':'Imán: no se observa atracción.');}}
function resizeMicroPanel(){
 const desk=$('desk'),panel=$('loupe'),glass=panel?.querySelector('.loupeGlass');
 if(!desk||!panel||!glass)return;
 const diameter=Math.max(160,Math.min(384,desk.clientHeight-100,(desk.clientWidth-60)*.47));
 panel.style.width=(diameter+42)+'px';
 panel.style.height=(diameter+89)+'px';
 glass.style.width=diameter+'px';glass.style.height=diameter+'px';
}
function scanMicro(e){
 if(ncgCoinSafeMode)return;
 const l=$('loupe');
 if(!hitCoin(e))return;
 const now=performance.now();if(now-lastMicroPointerAt<40)return;lastMicroPointerAt=now;
 if(coinLastDisplayedCase!==active||$('coinCanvas').style.opacity!=='1')return;
 microCount++;
 const coin=$('coinToken').getBoundingClientRect();
 const localX=e.clientX-coin.left,localY=e.clientY-coin.top;
 const glass=l.querySelector('.loupeGlass');
 l.style.display='block';
 const f=(hasUpgrade('micro')&&window.NCGQoL?.isMicro5xEnabled?.()!==false)?5:3,width=coin.width*f,height=coin.height*f;
 const source=$('coinCanvas'), lens=glass.querySelector('canvas');
 const context=lens.getContext('2d');
 if(!context)return;
 const sampleWidth=glass.clientWidth*source.width/width;
 const sampleHeight=glass.clientHeight*source.height/height;
 const sx=localX*source.width/coin.width-sampleWidth/2;
 const sy=localY*source.height/coin.height-sampleHeight/2;
 context.clearRect(0,0,lens.width,lens.height);
 context.drawImage(source,sx,sy,sampleWidth,sampleHeight,0,0,lens.width,lens.height);
 if(microCount>(hasUpgrade('micro')?5:12)&&!active.readings?.micro){
  let desc='Campos y relieve examinados';
  const pores=active.variant.defects.flat().filter(a=>a.name==='poros_fundicion');
  if(active.variant.fakeType==='chapada'&&!active.variant.subtleFake)desc='Discontinuidad de superficie: posible recubrimiento, no diagnóstico';
  else if(pores.length)desc=pores.length>1?'Cavidades y porosidad superficial; pueden deberse a corrosión, cospel o fundición':'Pequeñas cavidades superficiales; pueden proceder del cospel, corrosión o fundición';
  else if(active.variant.defects.flat().some(a=>a.name==='limpieza_paralela'))desc='Líneas paralelas compatibles con limpieza';
  desc+=' · '+microscopeSurfaceObservation();
  if(hasUpgrade('micro')){
   const evid=active.variant.microEvidence||'normal';
   desc+=' · '+(f===5?'METALOGRAFÍA ×5: ':'METALOGRAFÍA (equipo mejorado): ')+(evid==='cast'?'microestructura compatible con colada; contraste con otras pruebas':evid==='plating'?'indicios de límite de recubrimiento; contraste con canto/XRF':evid==='ambiguous'?'microtextura irregular inespecífica; podría ser desgaste o cospel':'sin anomalías metalográficas evidentes; no excluye falsificación');
  }
  read('micro',desc,'Microscopio: '+desc+'.');
 }
}
function scanUV(e){
 if(tool!=='uv'||!active)return;
 const now=performance.now();
 if(now-lastUVPointerUpdate<(typeof window!=='undefined'&&window.NCGQoL?.uvThrottleMs?.()||50))return;
 lastUVPointerUpdate=now;
 const p=getHitPosition(e);
 const beam=$('uvBeam');
 beam.style.left=p.x+'px';
 beam.style.top=p.y+'px';
 if(!hitCoin(e))return;
 uvCount++;
 if(uvCount>12&&!active.readings?.uv){
  const residue=active.variant.defects.flat().some(d=>d.name==='manchas_uv');
  const txt=residue?'Residuos fluorescentes localizados':'Sin fluorescencia concluyente';
  read('uv',txt,'UV: '+txt+'.');
 }
}

function readXRF(){
 if(!active || !session)return;
 active.readings=active.readings||{};
 const k='xrf'+face;
 if(active.readings[k]){addLog(`XRF de cara ${face+1} ya registrado: consulta su lectura.`);return;}
 const fee=xrfFee(session,active,face);
 if(session.money<fee){addLog(`Fondos insuficientes para XRF (${fee} €). Utiliza las pruebas gratuitas.`);return;}
 session.money-=fee;
 session.xrfSpent=(session.xrfSpent||0)+fee;
 active.analysisSpent=(active.analysisSpent||0)+fee;
 const c=currentCoin(),val=xrfResultForFace(active.variant,c,face);
 active.readings[k]=val;
 active.readings.xrf=[0,1].filter(i=>active.readings['xrf'+i]).map(i=>`C${i+1}: ${active.readings['xrf'+i]}`).join(' | ');refreshMinimumExamUI();
 renderReadings();playSfx('xrf');addLog(`XRF cara ${face+1} (−${fee} €): ${val}`);
 renderCaseTop();saveSession();
}

function handleDeskMove(e){if(tool==='uv')scanUV(e);if(tool==='micro')scanMicro(e);}
function setupInteractions(){
 $('coinSafeModeBtn')?.addEventListener('click',toggleCoinSafeMode);
 updateCoinSafeButton();
 $('coinToken').addEventListener('pointerdown',e=>{if(e.button!==0)return;if(tool==='caliper')return;if(tool==='xrf'){readXRF();return;}if(tool==='tap'){inspectCoinResonance();e.preventDefault();return;}const p=getHitPosition(e);draggingCoin={x:p.x,y:p.y,cx,cy};$('coinToken').setPointerCapture(e.pointerId);$('coinToken').classList.add('dragging');e.preventDefault();});
 $('coinToken').addEventListener('pointermove',e=>{if(!draggingCoin)return;const p=getHitPosition(e);cx=Math.max(30,Math.min($('desk').clientWidth-20,draggingCoin.cx+p.x-draggingCoin.x));cy=Math.max(25,Math.min($('desk').clientHeight-25,draggingCoin.cy+p.y-draggingCoin.y));updateCoinPosition();});
 $('coinToken').addEventListener('pointerup',()=>{if(!draggingCoin)return;draggingCoin=null;$('coinToken').classList.remove('dragging');dropCoin();});
 $('coinToken').addEventListener('pointercancel',()=>{draggingCoin=null;$('coinToken').classList.remove('dragging');});
 $('desk').addEventListener('pointermove',handleDeskMove);
 const microHeader=$('loupe').querySelector('.loupeHeader');let movingMicro=null;
 microHeader.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('#loupeClose'))return;
  const r=$('loupe').getBoundingClientRect();movingMicro={pointer:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};
  microHeader.setPointerCapture(e.pointerId);e.preventDefault();});
 $('loupeClose').addEventListener('click',e=>{e.stopPropagation();if(tool==='micro')selectTool('view');});
 microHeader.addEventListener('pointermove',e=>{if(!movingMicro)return;
  const d=$('desk').getBoundingClientRect(),l=$('loupe');
  l.style.left=Math.max(0,Math.min(d.width-l.offsetWidth,e.clientX-d.left-movingMicro.dx))+'px';
  l.style.top=Math.max(0,Math.min(d.height-l.offsetHeight,e.clientY-d.top-movingMicro.dy))+'px';
  l.style.right='auto';});
 microHeader.addEventListener('pointerup',()=>{movingMicro=null;});
 microHeader.addEventListener('pointercancel',()=>{movingMicro=null;});

 $('desk').addEventListener('wheel',e=>{if(tool==='edge'){e.preventDefault();edgeRotation=(edgeRotation+(e.deltaY<0?8:-8)+360)%360;const r=$('edgeRotate');if(r)r.value=edgeRotation;updateEdgeStrip();}},{passive:false});
 $('magnetObject').addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=$('magnetObject').getBoundingClientRect();draggingMag={ox:e.clientX-r.left,oy:e.clientY-r.top};$('magnetObject').setPointerCapture(e.pointerId);e.preventDefault();});
 $('magnetObject').addEventListener('pointermove',e=>{if(!draggingMag)return;const p=getHitPosition(e);$('magnetObject').style.left=Math.max(0,Math.min($('desk').clientWidth-72,p.x-draggingMag.ox))+'px';$('magnetObject').style.top=Math.max(0,Math.min($('desk').clientHeight-80,p.y-draggingMag.oy))+'px';$('magnetObject').style.bottom='auto';detectMagnet();});
 $('magnetObject').addEventListener('pointerup',()=>{draggingMag=null;detectMagnet();});
 $('magnetObject').addEventListener('pointercancel',()=>{draggingMag=null;});
 $('caliperMeasure').addEventListener('click',markCaliper);

 $('authButtons').addEventListener('click',e=>{const b=e.target.closest('[data-auth]');if(!b)return;playSfx('decision');selectedAuth=b.dataset.auth;for(const one of $('authButtons').querySelectorAll('button'))one.classList.toggle('selected',one.dataset.auth===selectedAuth);$('signBtn').textContent=selectedAuth==='real'?'Emitir etiqueta y encapsular':'Cerrar expediente sin encapsular';saveCaseDraft();});
 $('rightScroll').addEventListener('change',updateTutorial);
 $('authButtons').addEventListener('click',updateTutorial);
 $('signBtn').addEventListener('click',signReport);
 $('creditsBtn').addEventListener('click',showCreditsInventory);
 for(const name of DRAFT_FIELDS){const el=$(name);if(el)el.addEventListener('input',()=>{clearSigningError();saveCaseDraft(true);});}
 $('serviceSel').addEventListener('change',()=>queueMicrotask(saveCaseDraft));
 $('newDayBtn').addEventListener('click',beginNewDay);$('menuBtn').addEventListener('click',showMainMenu);
 $('sfxToggle').onclick=toggleSfx;updateSfxButton();$('visualModeToggle').onchange=event=>setCoinView(event.target.value);updateVisualButton();
 $('modalBox').addEventListener('click',e=>{const slab=e.target.closest('[data-slab-flip]');if(slab)flipSlab(slab);});
 $('modalBox').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-slab-flip]')){e.preventDefault();flipSlab(e.target);}});
 $('historyBtn').onclick=showHistory;$('guideBtn').onclick=showManual;
 $('shaderGuideBtn').onclick=()=>NCGGuides.open('TUTORIAL_SHADERS.html');$('gradeGuideBtn').onclick=()=>NCGGuides.open('ESCALA_SHELDON_Y_SHADERS.html');$('workshopBtn').onclick=showWorkshop;
 $('modal').addEventListener('click',e=>{if(e.target===$('modal'))hideModal();});
 const expandSelect=(id,size)=>{const el=$(id);if(!el)return;const open=()=>{el.size=size;el.classList.add('pickerOpen');};const close=()=>{setTimeout(()=>{el.size=1;el.classList.remove('pickerOpen');},120);};el.addEventListener('mousedown',open);el.addEventListener('click',open);el.addEventListener('focus',open);el.addEventListener('change',close);el.addEventListener('blur',close);};
 expandSelect('gradeSel',12);expandSelect('finishSel',8);expandSelect('detailsSel',12);
 document.addEventListener('keydown',handleCabinetKey);
 window.addEventListener('resize',()=>{if(active)resetCoinPosition();});
}
function handleCabinetKey(e){
 if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.defaultPrevented)return;
 const key=e.key.toLowerCase();
 const target=e.target;
 const editing=target?.closest?.('input,select,textarea,[contenteditable]');
 if(editing&&!(key==='f'&&editing.id==='visualModeToggle'))return;

 // R nunca actúa sobre un selector, un diálogo, el menú o la pantalla de ajustes.
 // No borra nada: solamente propone un reinicio que exige confirmación expresa.
 if(key==='r'){
  if(!active||isMenuVisible()||$('modal')?.classList.contains('show')||
     (document.getElementById('ncgQolOverlay')&&!document.getElementById('ncgQolOverlay').hidden))return;
  e.preventDefault();
  resetRandomSeedByKey();
  return;
 }

 if(isMenuVisible()){
  if(e.key==='Escape'){
   e.preventDefault();
   if(menuView==='home'){
    closeCampaignMenu();
    if(session&&session.index>=session.cases.length){
     active=null;
     if(session.day>=CAMPAIGN_LENGTH)showCampaignFinale();
     else showEndDay();
    }else if(session)openCase();
   }else showMainMenu();
  }
  return;
 }

 const modalOpen=$('modal')?.classList.contains('show');
 if(modalOpen){
  if(e.key==='Escape'){
   e.preventDefault();
   hideModal();
  
  }
  return;
 }

 if(e.key==='Escape'){
  e.preventDefault();
  if(tool==='micro'){
   selectTool('view');
   return;
  }
  showMainMenu();
  return;
 }
 if(key==='f'&&active){e.preventDefault();flip();return;}
 if(tool==='edge'){
  if(key==='a'){edgeRotation=(edgeRotation+345)%360;const r=$('edgeRotate');if(r)r.value=edgeRotation;updateEdgeStrip();}
  if(key==='d'){edgeRotation=(edgeRotation+15)%360;const r=$('edgeRotate');if(r)r.value=edgeRotation;updateEdgeStrip();}
 }
}
window.addEventListener('resize',()=>{if(active&&tool==='micro')resizeMicroPanel();if(active&&tool==='caliper')centerCaliper();});
function updateServiceUI(){
 if(!active)return;
 const ancient=currentCoin().ancient===true;
 const service=$('serviceSel').value;
 const isAnc=service==='ancients';
 $('ancientFields').hidden=!isAnc;
 $('gradeCaption').textContent=isAnc?'Grado NCG Ancients · desgaste':'Grado que tú asignas · Sheldon';
 $('serviceHelp').textContent=ancient?(isAnc?'Moneda antigua: aplica grado de desgaste, Strike y Surface. Si es auténtica debes encapsularla.':'Este ejemplar antiguo requiere NCG Ancients, no Sheldon clásico.'):(isAnc?'La moneda moderna requiere NCG Sheldon; cambia el programa.':'Sistema estándar para monedas modernas e históricas no antiguas.');
 $('serviceHelp').style.color=(ancient!==isAnc)?'#ffb2b1':'';
 const priorGrade=$('gradeSel').value;
 const priorFinish=$('finishSel').value;
 if(isAnc){
  $('gradeSel').innerHTML='<option value="">Elegir grado…</option>'+ANCIENT_GRADE_NAMES.map(a=>`<option value="${a}">${a}</option>`).join('');
  $('finishSel').innerHTML='<option value="">Sin estilo</option><option value="Fine Style">Fine Style</option><option value="★">★</option>';
 }else{
  $('gradeSel').innerHTML=STANDARD_GRADES_HTML;
  $('finishSel').innerHTML=STANDARD_FINISH_HTML;
 }
 if([...$('gradeSel').options].some(o=>o.value===priorGrade))$('gradeSel').value=priorGrade;
 if([...$('finishSel').options].some(o=>o.value===priorFinish))$('finishSel').value=priorFinish;
 updateGradeMarginHelp();
}
function updateGradeMarginHelp(){
 const node=$('gradeMarginHelp');if(!node)return;
 if($('serviceSel')?.value==='ancients'){
  node.textContent='NCG Ancients: se usa una escala ordinal distinta; no se aplica el margen Sheldon.';return;
 }
 const lang=window.NCGLocale?.language?.()||'es';
 const val=$('gradeSel')?.value||'',range=sheldonWindow(val);
 if(!range){node.textContent=lang==='en'?'Select a grade to see the penalty-free range.':lang==='eu'?'Hautatu gradua zigorrik gabeko tartea ikusteko.':'Selecciona un grado para ver el margen sin penalización.';return;}
 const rangeText=`${sheldonGradeLabel(range.low,'lower')}–${sheldonGradeLabel(range.high,'upper')}`;
 node.textContent=lang==='en'?`Your ${val}: ${rangeText} is accepted without a grade penalty. Authenticity and Details are assessed separately.`:
  lang==='eu'?`Zure ${val}: ${rangeText} tartea onartzen da graduagatiko zigorrik gabe. Benetakotasuna eta Details aparte ebaluatzen dira.`:
  `Tu ${val}: se acepta ${rangeText} sin penalización de grado. La autenticidad y Details se evalúan por separado.`;
}
function initGrades(){const simple={1:'PO01',2:'FR02',3:'AG03',4:'G04',6:'G06',8:'VG08',10:'VG10',12:'F12',15:'F15',20:'VF20',25:'VF25',30:'VF30',35:'VF35',40:'XF40',45:'XF45',50:'AU50',53:'AU53',55:'AU55',58:'AU58'};let o='<option value="">Elegir grado…</option><optgroup label="Circuladas">';for(const v of Object.values(simple)){o+=`<option value="${v}">${v}</option>`;if(['XF45','AU50','AU53','AU55','AU58'].includes(v))o+=`<option value="${v}+">${v}+ · alto del grado</option>`;}o+='</optgroup><optgroup label="Sin circular · MS">';for(let i=60;i<=70;i++){o+=`<option value="MS${i}">MS${i}</option>`;if(i>=62&&i<=68)o+=`<option value="MS${i}+">MS${i}+ · alto del grado</option>`;}o+='</optgroup><optgroup label="Proof · PF">';for(let i=60;i<=70;i++){o+=`<option value="PF${i}">PF${i}</option>`;if(i>=62&&i<=68)o+=`<option value="PF${i}+">PF${i}+ · alto del grado</option>`;}o+='</optgroup><optgroup label="Specimen · SP">';for(let i=60;i<=70;i++)o+=`<option value="SP${i}">SP${i}</option>`;o+='</optgroup>';$('gradeSel').innerHTML=o;
 $('finishSel').innerHTML='<option value="">Sin acabado</option><option>PL</option><option>DMPL</option><option>CAM</option><option>DCAM</option><option>RD</option><option>RB</option><option>BN</option>';
 $('detailsSel').innerHTML='<option value="">Sin Details</option>'+DETAIL_OPTIONS.map(v=>`<option>${v}</option>`).join('');
 STANDARD_GRADES_HTML=$('gradeSel').innerHTML;STANDARD_FINISH_HTML=$('finishSel').innerHTML;
 $('serviceSel').addEventListener('change',updateServiceUI);
 $('gradeSel').addEventListener('change',updateGradeMarginHelp);
 $('gradeSel').addEventListener('input',updateGradeMarginHelp);
}
const MINIMUM_EXTRA_TESTS=['magnet','density','micro','uv','light','edge','tap','xrf'];
function minimumExamStatus(caseRecord=active){
 const r=caseRecord&&typeof caseRecord.readings==='object'&&caseRecord.readings?caseRecord.readings:{};
 const done=k=>typeof r[k]==='string'?r[k].trim().length>0:r[k]!==undefined&&r[k]!==null&&r[k]!==false;
 const mass=done('mass'),dia=done('dia');
 const extra=MINIMUM_EXTRA_TESTS.some(k=>done(k)||(k==='xrf'&&(done('xrf0')||done('xrf1'))));
 return {mass,dia,extra,ready:mass&&dia&&extra};
}
function refreshMinimumExamUI(){
 const node=$('minimumExamChecklist');if(!node)return;
 const st=minimumExamStatus();
 const lang=window.NCGLocale?.language?.()||'es';
 const summary=$('minimumExamSummary');
 if(summary){
  const count=Number(st.mass)+Number(st.dia)+Number(st.extra);
  const label=lang==='en'?'Checks before signing':lang==='eu'?'Sinatu aurreko probak':'Mínimo antes de firmar';
  summary.textContent=`${label} · ${count}/3 ${st.ready?'✓':'▾'}`;
  summary.dataset.done=String(st.ready);
 }
 const sets={
  es:{title:'Mínimo antes de firmar',mass:'Pesar en balanza',dia:'Medir con calibre',extra:'Otra prueba (imán, canto, lupa, etc.)',note:'XRF opcional · No tienes que pagarlo'},
  en:{title:'Minimum checks before signing',mass:'Weigh on scale',dia:'Measure with calipers',extra:'Another test (magnet, edge, loupe, etc.)',note:'XRF optional · No purchase required'},
  eu:{title:'Sinatu aurreko gutxieneko probak',mass:'Pisu balantzan',dia:'Diametroa kalibrearekin',extra:'Beste proba bat (imana, ertza, lupa...)',note:'XRF aukerakoa · Ez da ordaindu behar'}
 };
 const t=sets[lang]||sets.es;
 const chip=(ok,label)=>`<span class="ncg-min-chip ${ok?'is-done':'is-missing'}"><span aria-hidden="true">${ok?'✓':'○'}</span> ${esc(label)}</span>`;
 node.innerHTML=`<strong>${esc(t.title)}</strong><div class="ncg-min-items">${chip(st.mass,t.mass)}${chip(st.dia,t.dia)}${chip(st.extra,t.extra)}</div><small>${esc(t.note)}</small>`;
 node.dataset.ready=String(st.ready);
}
function missingMinimumText(){
 const st=minimumExamStatus(),lang=window.NCGLocale?.language?.()||'es';
 const names=lang==='en'?['weigh the coin','measure diameter','perform another test (magnet, edge, loupe, etc.)']:
  lang==='eu'?['txanpona pisatu','diametroa neurtu','beste proba bat egin (imana, ertza, lupa...)']:
  ['pesar la moneda','medir el diámetro','hacer otra prueba (imán, canto, lupa, etc.)'];
 const missing=[!st.mass?names[0]:null,!st.dia?names[1]:null,!st.extra?names[2]:null].filter(Boolean);
 if(!missing.length)return '';
 return (lang==='en'?'Before signing, you must: ':lang==='eu'?'Sinatu aurretik, egin: ':'Antes de firmar, debes: ')+missing.join(' · ')+'. '+(lang==='en'?'XRF is optional.':lang==='eu'?'XRF aukerakoa da.':'El XRF es opcional.');
}
function showSigningError(message,element){playSfx('error');NCGLog.event('DICTAMEN_INCOMPLETO',{message,field:element});
 if(message&&/(pesar|weigh|pisu|calibre|caliper|diametro|diameter|prueba|test|proba)/i.test(message)){const checklist=$('minimumExamDetails');if(checklist)checklist.open=true;}
 const box=$('ncgMissingField');if(box){box.textContent=message;box.hidden=false;}
 $('labelStatus').textContent='INFORME INCOMPLETO';
 for(const name of ['gradeSel','strikeSel','surfaceSel','serviceSel'])$(name)?.classList.remove('ncg-invalid-field');
 if(element){const field=$(element);if(field){field.classList.add('ncg-invalid-field');field.scrollIntoView({behavior:'smooth',block:'center'});field.focus({preventScroll:true});}}
 notify(message,'error',12);
}
function clearSigningError(){const box=$('ncgMissingField');if(box)box.hidden=true;for(const name of ['gradeSel','strikeSel','surfaceSel','serviceSel'])$(name)?.classList.remove('ncg-invalid-field');}
function signReport(){
 if(randomResetBusy)return;
 if(session.tutorialStep&&['ficha','girar'].includes(session.tutorialStep)){showSigningError('Lee la ficha y gira la moneda para continuar el tutorial.');return;}
 if(session.tutorialStep&&selectedAuth!=='real'){showSigningError('En este ejercicio selecciona Auténtica.');return;}
 if(window.__ncgSigningBusy)return;
 window.__ncgSigningBusy=true;
 try{
 NCGLog.event('INTENTO_DICTAMEN',{coin:active?.id,auth:selectedAuth,program:$('serviceSel').value,grade:$('gradeSel').value,details:$('detailsSel').value,strike:$('strikeSel').value,surface:$('surfaceSel').value});
 clearSigningError();
 if(!selectedAuth){showSigningError('Falta: decisión de autenticidad.');return;}
 const missingChecks=missingMinimumText();
 if(missingChecks){showSigningError(missingChecks);return;}
 const c=currentCoin(),program=$('serviceSel').value,grade=$('gradeSel').value;
 if(selectedAuth==='real'&&!!c.ancient !== (program==='ancients')){showSigningError(c.ancient?'Falta: seleccionar programa NCG Ancients.':'Falta: seleccionar programa NCG Sheldon.','serviceSel');return;}
 if(selectedAuth==='real'&&!grade){showSigningError(c.ancient?'Falta: grado de conservación NCG Ancients.':'Falta: grado Sheldon.','gradeSel');return;}
 if(selectedAuth==='real'&&c.ancient&&!$('strikeSel').value){showSigningError('Falta: Strike (1–5).','strikeSel');return;}
 if(selectedAuth==='real'&&c.ancient&&!$('surfaceSel').value){showSigningError('Falta: Surface (1–5).','surfaceSel');return;}
 const out={id:active.id,day:session.day,caseIndex:session.index,institutional:!!active.institutional,clientTier:active.clientTier||'',clientReputation:session.startReputation,date:new Date().toISOString(),sessionSeed:session.seed,auth:selectedAuth,program,grade,strike:program==='ancients'?$('strikeSel').value:'',surface:program==='ancients'?$('surfaceSel').value:'',finish:$('finishSel').value,details:$('detailsSel').value,notes:$('notes').value.trim(),readings:{...(active.readings||{})},variant:active.variant};
 if(selectedAuth==='real'){
  NCGLog.event('CAPSULA_PREPARANDO',{coin:out.id});
  sealScreen(out);
  NCGLog.event('CAPSULA_ABIERTA',{coin:out.id});
 }else{finalize(out,false);}
 }catch(error){
  NCGLog.error(error,{phase:'sign-report',coin:active?.id});
  showSigningError('No se pudo preparar el dictamen. La partida continúa intacta; prueba de nuevo o abre Registro.');
 }finally{window.__ncgSigningBusy=false;}
}
function sealScreen(report){const c=currentCoin();const rating=esc(report.grade+(report.finish?' '+report.finish:''));showModal(`<div class="modalHead"><h2>03 · Encapsulado NCG</h2><button class="close" onclick="NCG.hide()">Cerrar</button></div><div class="sealGrid"><div class="sealControls"><p>Tu diagnóstico será el que aparezca en la cápsula: <b>${rating}</b>${report.program==='ancients'?` · <b>Strike: ${esc(report.strike)}/5 · Surface: ${esc(report.surface)}/5</b>`:''}${report.details?' · '+esc(report.details):''}. El informe final comparará tu nota con una referencia simulada. Hay margen ±10 en circuladas/AU y margen MS hasta +5/−8; solo se penaliza el exceso. Details y PF/SP se juzgan aparte.</p><label>Alineación del inserto <strong id="alignView">0 / 100</strong></label><input id="alignRange" type="range" min="0" max="100" value="50"><label>Presión de sellado <strong id="pressView">55 / 100</strong></label><input id="pressRange" type="range" min="0" max="100" value="55"><p>Alineación recomendada: entre 43 y 57. Presión recomendada: entre 40 y 70. Un ajuste inadecuado puede dejar un incidente en el registro, pero <b>no reduce tu puntuación</b>.</p><button id="sealBtn" class="submit" data-ncg-sound="none">Sellar cápsula y guardar historial</button></div><div class="slab"><h3>${report.program==='ancients'?'NCG ANCIENTS':'NCG'}</h3><small>NUMISMATIC CERTIFICATION GUILD</small>${report.program==='ancients'?`<p style="font:700 12px monospace">Strike ${esc(report.strike)}/5 · Surface ${esc(report.surface)}/5</p>`:''}<div class="grade">${rating}</div><small>${esc(c.name)}</small><div><img src="${safeReportPortrait(report,0)}" alt="Moneda"></div><small>${esc(report.details||'GRADO DEL PERITO')}</small><div class="strip"></div></div></div>`);
 if(session.tutorialStep)$('sealBtn').insertAdjacentHTML('beforebegin','<p><b>Tutorial · Encapsulado.</b> Ajusta la alineación y la presión dentro de los intervalos indicados. Pulsa Sellar para registrar el dictamen y leer el resultado.</p>');
 $('alignRange').oninput=e=>$('alignView').textContent=e.target.value+' / 100';$('pressRange').oninput=e=>$('pressView').textContent=e.target.value+' / 100';$('sealBtn').onclick=()=>{let a=+$('alignRange').value,p=+$('pressRange').value;const incident=(Math.abs(a-50)>25||p>78)?'Incidente de alineación o presión en cápsula':'Encapsulado correcto';report.seal={alignment:a,pressure:p,incident};playSfx('seal');finalize(report,true,0);};}

function finalize(report,approved){
 const c=coins.find(x=>x.id===report.id);
 const score=calculatePeritaje(c,report,approved,session.reviewCount||0);
 const {change,repChange,judgment,quality,reviewCount,missedAncient,falseApproved,wasFake,labFee,trainingAid}=trainingResult(score,session);
 if(trainingAid)report.trainingAid=trainingAid;
 session.reviewCount=reviewCount;
 report.gradeAssessment=quality;
 const learning=diagnosticDebrief(c,report.variant);report.learning=learning.explanation+' Cómo se podía sospechar: '+learning.howToDetect+' '+learning.measurements+(learning.takeaway?' Lección: '+learning.takeaway:'')+(quality.reference?' Grado de referencia del simulador: '+quality.reference+'. '+quality.text:'');
 report.analysisSpent=active.analysisSpent||0;report.labFee=labFee;report.wasFake=wasFake;report.fakeType=report.variant.fakeType;report.judgment=judgment;report.reward=change;report.repChange=repChange;report.falseApproved=falseApproved;report.missedAncient=missedAncient;report.certified=approved;report.recordId=newRecordId();report.certNumber=nextCertificateNumber();
 session.money+=change;session.reputation=Math.max(0,session.reputation+repChange);
 const reputationFloorReached=repChange<0&&session.reputation===0;
 NCGLog.event('DICTAMEN_EMITIDO',{coin:report.id,day:report.day,index:report.caseIndex+1,auth:report.auth,grade:report.grade,details:report.details,actualFake:wasFake,actualGrade:report.variant.hiddenGrade?.grade,actualDetails:report.variant.hiddenDetails,judgment,change,repChange,moneyAfter:session.money,reputationAfter:session.reputation});history.unshift(report);saveHistory();delete active.draft;session.index++;session.finished=session.index>=session.cases.length;
 if(session.money<=0&&isDayStillInProgress(session)){
  NCGLog.event('DESCUBIERTO_TEMPORAL',{day:session.day,seed:session.seed,index:session.index,money:session.money,pending:session.cases.length-session.index});
  notify('Saldo negativo: quedan '+(session.cases.length-session.index)+' expedientes para recuperarte. Sin fondos, el XRF y las compras siguen bloqueados.','warning',9);
 }
 saveSession();$('signBtn').disabled=true;
 const realState=wasFake?({periodo:'Falsa de época',chapada:'Falsificación bañada',fundida:'Falsificación de fundición'})[report.fakeType]:'Auténtica';
 const title=falseApproved?'Falsificación aprobada':(report.auth==='real'?'Moneda calificada':'Dictamen registrado');
 const detailsLine=(report.program==='ancients'&&report.strike&&report.surface?` · Strike ${esc(report.strike)}/5 · Surface ${esc(report.surface)}/5`:'')+(report.details?' · '+esc(report.details):'');
 const gradeAssessmentText=String(report.gradeAssessment?.text||'').trim().replace(/[.\s]+$/g,'');
 const notes=report.auth==='real'?`<p><b>Etiqueta:</b> ${esc(report.grade)}${report.finish?' '+esc(report.finish):''}${detailsLine}. Referencia del simulador: ${esc(report.gradeAssessment?.reference||'—')}; ${esc(gradeAssessmentText)}.</p>`:'';
 const rewardLine=`${session.money<=0&&isDayStillInProgress(session)?'<p><b>Descubierto temporal:</b> sigue examinando las monedas pendientes; la quiebra se decide al cerrar la jornada.</p>':''}${report.trainingAid?`<p><b>Ayuda inicial:</b> subvención ${report.trainingAid.subsidy} € y ${report.trainingAid.reputationProtected} puntos de reputación protegidos. Sin ayuda: ${report.trainingAid.originalChange} € / ${report.trainingAid.originalRep} reputación. Las equivocaciones siguen registradas.</p>`:''}<p><b>Fondos:</b> ${money(session.money)} (${change>=0?'+':''}${change} € dictamen${report.analysisSpent?' · −'+report.analysisSpent+' € de análisis':''}${report.labFee?' · +'+report.labFee+' € servicio laboratorio':''}) · <b>Reputación:</b> ${session.reputation} (${repChange>=0?'+':''}${repChange}${reputationFloorReached?'; reputación mínima alcanzada (0)':''})</p>`;
 const sealLine=report.seal?(falseApproved?`<p><b>Resultado del encapsulado:</b> Encapsulada (era falsa)${report.seal.incident&&report.seal.incident!=='Encapsulado correcto'?' · '+esc(report.seal.incident):''}.</p>`:`<p><b>Encapsulado:</b> ${esc(String(report.seal.incident||'Encapsulado realizado').replace(/[.\s]+$/g,''))}.</p>`):'';
 const isSuccess=report.auth==='real'&&!falseApproved;
 const content=isSuccess
 ? `<div class="ncg-result-lead reveal"><div class="success-seal">MONEDA CALIFICADA</div></div>
  <div class="ncg-certificate-result"><div><div class="resultHero"><img src="${safeReportPortrait(report,0)}" alt="moneda"><div><h3>${esc(c.name)}</h3><p>Certificado: <b>${esc(report.certNumber)}</b></p>${notes}<p style="color:#256145"><b>${esc(judgment)}</b></p>${rewardLine}${sealLine}</div></div><p class="ncg-result-copy">Tu pieza ha sido certificada y añadida a la galería. Pulsa sobre la cápsula para girar la moneda y ver su reverso.</p>${debriefHTML(learning)}</div>${buildSlab(report,{featured:true})}</div>`
 : `<div class="resultHero"><img src="${safeReportPortrait(report,0)}" alt="moneda"><div><h3>${esc(c.name)}</h3><p><b>Tu dictamen:</b> ${report.auth==='real'?'Auténtica':report.auth==='fake'?'Falsa':'Revisión'} · <b>Estado simulado:</b> ${esc(realState)}</p>${notes}<p style="color:${falseApproved?'#b43139':'#256145'}"><b>${esc(judgment)}</b></p>${rewardLine}${sealLine}</div></div><p class="smallText" style="margin:15px 0">Los datos del expediente están guardados en el historial local. ${falseApproved?'La moneda se encapsuló, pero se detectó después que era falsa.':''}</p>`;
 showModal(`<div class="modalHead"><h2>${esc(title)}</h2><button class="close" onclick="NCG.hide()">Cerrar</button></div>${content}${isSuccess?'':debriefHTML(learning)}<button class="submit" id="nextCaseBtn" data-ncg-sound="nextCase">${session.finished?'Ver resumen de jornada':'Siguiente moneda'}</button>`);
 if(isSuccess)playSfx('success');else if(falseApproved)playSfx('warning');
 if(session.tutorialStep){session.tutorialStep='';saveSession();finishTutorial();$('nextCaseBtn').insertAdjacentHTML('beforebegin','<p><b>Tutorial completado.</b> Tu dictamen está en Historial. Con Siguiente moneda seguirás por tu cuenta. Al terminar la jornada podrás revisar fondos, visitar el taller y exportar un respaldo.</p>');}
 $('nextCaseBtn').onclick=hideModal;
 $('lastResult').innerHTML=`<strong>Último expediente:</strong><br>${esc(c.name)}<br>${esc(report.grade||'Sin grado')} · ${esc(judgment)}<br>${new Date(report.date).toLocaleString('es-ES')}`;
 renderCaseTop();
}
function getHour(){return (Number(session?.clockStart||9)+(Number(session?.index||0)))%24;}
function updateClock(){
 const el=$('ncgClock');if(!el||!session)return;
 const hour=getHour();el.textContent=`${String(hour).padStart(2,'0')}:00`;
 const phase=hour<7||hour>=20?'night':hour>=17?'dusk':hour<11?'morning':'day';
 document.body.dataset.time=phase;
 const p=$('ncgClockNote');if(p)p.textContent=phase==='night'?'Turno nocturno':phase==='dusk'?'Cae la tarde':phase==='morning'?'Apertura':'En servicio';
}
const STORY_EVENTS=[
 'Un comerciante de Cádiz asegura que su real colonial procede de un naufragio. No hay documentación; decide con las pruebas.',
 'Una clienta pide conservar la pátina original de su pieza. Los signos de corrosión no siempre indican falsedad.',
 'Una casa de subastas necesita un dictamen antes de publicar su catálogo. Tu reputación está en juego.',
 'Un coleccionista trae una moneda muy rara. Su procedencia es confusa; no confundas rareza con autenticidad.',
 'El antiguo jefe del laboratorio te recuerda que dos especialistas pueden discrepar un grado sin que ninguno sea incompetente.'
];

const RANDOM_RESET_COOLDOWN_MS=1000;
let randomResetBusy=false;
let lastRandomResetAt=-Infinity;
function canStartRandomReset(now=Date.now()){
 if(now-lastRandomResetAt<RANDOM_RESET_COOLDOWN_MS)return false;
 lastRandomResetAt=now;
 return true;
}
function resetRandomSeedByKey(){
 // También protege las llamadas desde la consola del juego / API pública.
 if(!sessionReady||randomResetBusy||changingDay||!active||isMenuVisible()||
    $('modal')?.classList.contains('show')||
    (document.getElementById('ncgQolOverlay')&&!document.getElementById('ncgQolOverlay').hidden)||
    !canStartRandomReset())return false;

 showModal(`<div class="modalHead"><h2 id="ncgResetTitle">Reinicio completo: borrar TODA la campaña</h2>
  <button type="button" class="close" onclick="NCG.hide()">Cerrar</button></div>
  <div class="noteBlock"><p role="alert"><b>¿Borrar TODA la campaña y el historial? No se puede deshacer.</b></p>
  <p>Se eliminarán la partida actual, los certificados, el calendario, el historial y las autocopias nativas. Volverás al día 1 con otra semilla, 400 € y reputación 50.</p>
  <p><b>Antes de continuar:</b> exporta un respaldo JSON y comprueba que existe. No es obligatorio, pero es la única copia recuperable si se confirma el borrado.</p>
  <label style="display:block;margin-top:16px"><input type="checkbox" id="ncgResetAcknowledge"> Entiendo que se perderán toda la campaña y el historial.</label></div>
  <div class="modalActions"><button type="button" id="ncgResetCancel">Cancelar</button>
  <button type="button" id="ncgResetExport">Exportar respaldo JSON</button>
  <button type="button" id="ncgResetConfirm" disabled>¡Sí, borrar todo!</button></div>`);
 const agree=$('ncgResetAcknowledge'),confirm=$('ncgResetConfirm');
 agree.addEventListener('change',()=>{confirm.disabled=!agree.checked;});
 $('ncgResetCancel').addEventListener('click',()=>hideModal());
 $('ncgResetExport').addEventListener('click',()=>exportFullBackup());
 confirm.addEventListener('click',()=>{
  if(randomResetBusy||!agree.checked||confirm.disabled||!$('modal')?.classList.contains('show'))return;
  // La única ruta de UI que puede invocar el borrado destructivo.
  randomResetBusy=true;
  void performConfirmedRandomReset();
 });
 $('ncgResetCancel').focus({preventScroll:true});
 return true;
}

async function performConfirmedRandomReset(){
 const wasInert=$('shell').inert;
 try{
   $('shell').inert=true;
   clearTimeout(draftTimer);draftTimer=null;
   window.NCGQoL?.close();window.NCGGuides?.close();
   closeCampaignMenu();finishTutorial();
   showModal('<p role="status">Borrando la partida confirmada…</p>');
   await window.NCGDesktop.resetProgress();
   active=null;history=[];dayBook=null;
   historyPage=0;historyFilter='all';historyQuery='';session=makeSession();
   resetCampaignForNewSession();
   if(!saveHistory()||!saveSession())throw Error('No se pudo guardar la campaña nueva.');
   if(window.NCGDesktop.native){
     do{if(!await window.NCGDesktop.flush())throw Error('Falló la escritura de la nueva partida.');}
     while(window.NCGDesktop.stats().pending);
   }
   $('lastResult').textContent='Aún no has firmado ningún expediente.';
   hideModal();openCase();showStoryIntro();
 }catch(error){
   showModal('<p>No se pudo completar el reinicio. Comprueba el almacenamiento. Revisa los respaldos antes de volver a intentarlo.</p>');
   NCGLog.error(error,{phase:'reinicio-completo'});
 }finally{$('shell').inert=wasInert;randomResetBusy=false;}
}

function replaySeedPrompt(){
 showModal(`<div class="modalHead"><h2>Repetir una jornada</h2><button class="close" onclick="NCG.hide()">Cerrar</button></div>
 <div class="noteBlock"><p>Introduce la semilla que quieres reproducir. Se reiniciará la jornada desde su comienzo; el historial de certificados se conserva.</p>
 <label for="replaySeedInput">Código de semilla</label><input id="replaySeedInput" maxlength="40" value="${esc(session?.seed||'')}" autocomplete="off" spellcheck="false" style="width:100%;padding:12px;font:inherit;background:#101d18;color:#f3e4c4;border:1px solid #846e4a;border-radius:5px">
 <p class="smallText" id="replaySeedError" role="alert" aria-live="polite"></p></div>
 <div class="modalActions"><button type="button" onclick="NCG.hide()">Cancelar</button><button type="button" id="replaySeedPrepare">Continuar</button></div>`);
 $('replaySeedInput').focus();
 $('replaySeedPrepare').onclick=()=>{
  const seed=$('replaySeedInput').value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,40);
  if(!seed){$('replaySeedError').textContent='Introduce una semilla válida (letras, números, guion o subrayado).';return;}
  showModal(`<div class="modalHead"><h2>Confirmar repetición</h2><button class="close" onclick="NCG.hide()">Cerrar</button></div>
   <div class="noteBlock"><p>¿Repetir la jornada desde cero con la semilla <b>${esc(seed)}</b>?</p>
   <p>Se perderá el progreso sin firmar de este turno, pero se conservará el historial de certificados anteriores.</p></div>
   <div class="modalActions"><button type="button" onclick="NCG.hide()">Cancelar</button><button type="button" id="replaySeedConfirm">Sí, repetir jornada</button></div>`);
  $('replaySeedConfirm').onclick=()=>{
   const day=session?.day||1, funds=session?.startMoney??session?.money??400,rep=session?.startReputation??session?.reputation??50;
   const previous=session;
   session=makeSession(day,funds,rep,'',seed,{...(previous?.startUpgrades||previous?.upgrades||{})});
   session.storySeen=true;
   session.campaignId=previous?.campaignId;
   session.beginnerAid=!!previous?.beginnerAid;
   ensureCampaignState();
   dayBook.days[day]=snapshotForDay(session);
   saveDayBook();
   if(!saveSession())notify('No se pudo guardar la repetición. Exporta un respaldo antes de cerrar.','error',12);
   hideModal();openCase();
  };
 };
}

function exportCSV(){const keys=['date','sessionSeed','certNumber','id','auth','program','grade','strike','surface','finish','details','notes','wasFake','fakeType','judgment','reward','analysisSpent','labFee','falseApproved','missedAncient','learning'];const csv=[keys.join(',')].concat(history.map(x=>keys.map(k=>'"'+String(x[k]??'').replace(/"/g,'""')+'"').join(','))).join('\r\n');download(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),'NCG_Historial.csv');}

function init(){
 setupBackupUI();
 history=loadJSON(HISTORY_KEY,[]);if(!Array.isArray(history))history=[];else ensureRecordIds(history);
 initGrades();setupInteractions();window.NCGSound?.install();
 const saved=loadJSON(SESSION_KEY,null);
 const legacyFinal=!!(saved&&Number(saved.day)>=CAMPAIGN_LENGTH&&Number.parseFloat(String(saved.version))<6.46);
 if(isCompatibleSession(saved)){
  session=saved;
  session.version=GAME_VERSION;
  if(normalizeInterruptedBankruptcy(session))NCGLog.event('JORNADA_RECUPERADA',{day:session.day,seed:session.seed,index:session.index,money:session.money});
  session.certSerial=Math.max(Number(session.certSerial)||0,history.length);
 }else{
  session=makeSession(saved?.day||1,Number.isFinite(saved?.money)?saved.money:400,Number.isFinite(saved?.reputation)?saved.reputation:50);
  if(saved)showFileWarning('La partida anterior no era compatible. Se inició una nueva jornada conservando los fondos y la reputación recuperables; revisa tus respaldos.',true);
 }
 if(legacyFinal){
  const previous=session;
  session=makeSession(CAMPAIGN_LENGTH,Number(previous.startMoney??previous.money),Number(previous.startReputation??previous.reputation),'',newSeed(),{...(previous.startUpgrades||previous.upgrades||{})});
  session.storySeen=true;
  showFileWarning('La partida antigua ya había llegado al día 30 o lo había superado. Se reconstruyó el desafío final (11 falsas y 1 auténtica); el historial de dictámenes anteriores permanece intacto. Exporta una copia.',false);
 }
 if(session.day>CAMPAIGN_LENGTH){session.day=CAMPAIGN_LENGTH;session.finished=true;session.index=session.cases.length;}
 ensureCampaignState();
 saveSession();sessionReady=true;
 NCGLog.event('ARRANQUE_COMPLETO',{version:GAME_VERSION,day:session.day,seed:session.seed,index:session.index,cases:session.cases.length,history:history.length,tools:TOOLS.length});
 if(session.day===1&&session.index===0&&!session.storySeen&&!session.cases[0].variant.isFake){closeCampaignMenu();openCase();showStoryIntro();}else showMainMenu();
}
function showUnexpectedGameError(error){
 NCGLog.error(error,{phase:'game-ui'});
 const description=String(error?.message||error||'Error inesperado').slice(0,180);
 try{notify('Error de interfaz: '+description+' · Haz una copia de respaldo y recarga el juego.','error',0);}catch(_e){
  const banner=document.getElementById('ncgNoticeText');if(banner)banner.textContent='Error de interfaz: '+description;
  const box=document.getElementById('ncgNotice');if(box)box.hidden=false;
 }
}
window.addEventListener('error',ev=>{if(ev.error)showUnexpectedGameError(ev.error);});
window.addEventListener('unhandledrejection',ev=>showUnexpectedGameError(ev.reason));

window.NCG={retryCurrentCoin,showMainMenu,showDayMenu,showCampaignFinale,resetRandomSeedByKey,hide:hideModal,showHistory,shop:showWorkshop,newDay:beginNewDay,replaySeed:replaySeedPrompt,saveHistory:saveHistory,debug:()=>({session,active,history,tool,face,imagesLoaded:Object.keys(IMAGES).length,caliper:{left:caliperLeftMm,right:caliperRightMm,targets:active&&tool==='caliper'?caliperTargetsMm():null,scale:pixelsPerMm(),anchor:[caliperAnchorX,caliperAnchorY]}})};
if(window.NCGQoL)window.NCGQoL.init();
window.NCGStartup=Promise.resolve().then(init).then(()=>window.NCGQoL?.apply());
