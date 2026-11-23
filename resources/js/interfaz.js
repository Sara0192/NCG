'use strict';

function toggleSfx(){sfxOn=!sfxOn;try{localStorage.setItem(NCG_SOUND_KEY,String(sfxOn));}catch(_e){}try{window.NCGDesktop?.queueWrite?.(NCG_SOUND_KEY,JSON.stringify(sfxOn));}catch(_e){}updateSfxButton();window.NCGQoL?.onSoundToggle?.(sfxOn);if(sfxOn)playSfx('preview');}

function updateSfxButton(){const b=$('sfxToggle');if(!b)return;b.setAttribute('aria-pressed',String(sfxOn));b.textContent=sfxOn?'♪ SFX: Sí':'♪ SFX: No';b.title=sfxOn?'Silenciar efectos de sonido':'Activar efectos de sonido';}

function setCoinView(mode,persist=true){
 if(mode!=='vectorial'&&mode!=='realista')return;
 if(mode===visualMode)return;
 visualMode=mode;
 updateVisualButton();
 if(persist)storeWithWarning(NCG_VISUAL_KEY,mode);
 drawCoin();
}

function updateVisualButton(){
 for(const id of ['visualModeToggle','settingsCoinView']){
  const select=$(id);
  if(select)select.value=visualMode;
 }
}

function filteredHistory(){
 const query=historyQuery.trim().toLocaleLowerCase('es');
 return history.filter(r=>{
  if(!r||typeof r!=='object')return false;
  if(historyFilter==='certified'&&!(r.certified&&r.auth==='real'))return false;
  if(historyFilter==='rejected'&&!(r.auth==='fake'&&r.wasFake))return false;
  if(historyFilter==='error'&&!(r.falseApproved||(r.auth==='fake'&&!r.wasFake)))return false;
  if(historyFilter==='review'&&r.auth!=='review')return false;
  if(!query)return true;
  const c=coins.find(a=>a.id===r.id);
  return [r.certNumber,r.date,c?.name,c?.origin,c?.year,r.id,r.grade,r.details,r.notes,r.judgment].some(v=>String(v||'').toLocaleLowerCase('es').includes(query));
 });
}

function buildSlab(record,opts={}){
 const c=coins.find(a=>a.id===record.id);if(!c)return '';
 const compact=!!opts.compact,featured=!!opts.featured;
 const grade=record.grade||'SIN NOTA';const cert=record.certNumber||'NCG —';
 const error=record.falseApproved;
 const ancient=(record.program==='ancients')||!!c.ancient;const klass='ncg-slab '+(compact?'ncg-slab--gallery':'ncg-slab--featured')+(featured?' reveal':'')+(error?' ncg-slab--error':'')+(ancient?' ncg-slab--ancient':'');
 const detail=record.details||record.finish||'CERTIFICADO';
 return `<div class="${klass}" role="button" tabindex="0" data-slab-flip="${esc(record.recordId||cert)}" data-slab-face="0" title="Pulsa para girar la moneda">
  <div class="ncg-slab__label"><div class="ncg-slab__head"><div><span class="ncg-slab__logo">NCG</span><span class="ncg-slab__org">${ancient?'ANCIENTS · NUMISMATIC GUILD':'NUMISMATIC GUILD'}</span></div><span class="ncg-slab__grade">${esc(grade)}</span></div>
   <div class="ncg-slab__subject">${esc(c.name)}</div>${ancient&&record.strike&&record.surface?`<div class="ncg-slab__ancient-info">STRIKE ${esc(record.strike)}/5 · SURFACE ${esc(record.surface)}/5</div>`:''}<div class="ncg-slab__meta"><span>${esc(cert)}</span><span>${esc(detail)}</span></div></div>
  <div class="ncg-slab__well"><img class="ncg-slab__coin" alt="Anverso de ${esc(c.name)}" src="${safeReportPortrait(record,0)}" loading="lazy" decoding="async"/></div>
  <div class="ncg-slab__foot"><span>${error?'DICTAMEN ERRÓNEO':'CERTIFICACIÓN NCG'}</span><b data-slab-face-label>↻ REVERSO</b></div>
 </div>`;
}

function flipSlab(el){
 // Evita múltiples decodificaciones WebP al pulsar repetidamente sobre cápsulas.
 const now=performance.now(),last=Number(el.dataset.lastFlipAt||-COIN_FLIP_COOLDOWN_MS);
 if(now-last<COIN_FLIP_COOLDOWN_MS)return;
 const recordId=el.dataset.slabFlip,r=history.find(a=>String(a.recordId||a.certNumber)===recordId);if(!r)return;
 el.dataset.lastFlipAt=String(now);
 const side=el.dataset.slabFace==='0'?1:0;el.dataset.slabFace=String(side);
 const im=el.querySelector('.ncg-slab__coin');if(!im)return;
 im.src=safeReportPortrait(r,side);
 const c=coins.find(a=>a.id===r.id);im.alt=(side?'Reverso':'Anverso')+' de '+(c?.name||r.id);
 const label=el.querySelector('[data-slab-face-label]');if(label)label.textContent=side?'↻ ANVERSO':'↻ REVERSO';
 playSfx('flip');
}

function historyGallery(){
 const records=filteredHistory().map((r,index)=>({r,index})).filter(({r})=>r.certified&&r.auth==='real');
 const pageSize=6;const pages=Math.max(1,Math.ceil(records.length/pageSize));historyPage=Math.max(0,Math.min(historyPage,pages-1));
 if(!records.length)return '<div class="empty">Todavía no hay monedas encapsuladas. Certifica una auténtica para inaugurar tu gabinete.</div>';
 const cells=records.slice(historyPage*pageSize,(historyPage+1)*pageSize).map(({r})=>{
  const c=coins.find(a=>a.id===r.id);
  return `<div class="ncg-gallery-entry">${buildSlab(r,{compact:true})}<div class="ncg-gallery-caption">${esc(c?.name||r.id)}<span>${esc(r.certNumber||'')} · ${new Date(r.date).toLocaleDateString('es-ES')}</span>${r.falseApproved?'<span style="color:#ffaea6">Falsificación aprobada por error</span>':''}</div></div>`;
 }).join('');
 return `<div class="ncg-gallery">${cells}</div><div class="ncg-history-footer"><button id="histPrev" ${historyPage===0?'disabled':''}>← Anterior</button><span>Página ${historyPage+1} de ${pages} · ${records.length} cápsulas</span><button id="histNext" ${historyPage>=pages-1?'disabled':''}>Siguiente →</button></div>`;
}

function historyList(){const full=filteredHistory(),pageSize=16,pages=Math.max(1,Math.ceil(full.length/pageSize));historyPage=Math.max(0,Math.min(historyPage,pages-1));const rows=full.slice(historyPage*pageSize,(historyPage+1)*pageSize);return !full.length?'<div class="empty">No hay expedientes que coincidan con los filtros.</div>':'<div class="historyList">'+rows.map(r=>{const c=coins.find(a=>a.id===r.id);return `<div class="historyItem"><img data-ncg-record="${esc(r.recordId||r.certNumber||'')}" src="${safeReportPortrait(r,0)}" alt="Moneda" loading="lazy" decoding="async"><div><h3>${esc(c?.name||r.id)}</h3><p>${new Date(r.date).toLocaleString('es-ES')} · ${esc(r.certNumber)} · ${r.auth==='real'?'Auténtica':r.auth==='fake'?'Falsa':'Revisión'}</p><p><b>Tu grado:</b> ${esc(r.grade||'No asignado')}${r.strike&&r.surface?` · Strike ${esc(r.strike)}/5 · Surface ${esc(r.surface)}/5`:''}${r.finish?' · '+esc(r.finish):''}${r.details?' · '+esc(r.details):''}</p><p><b>Notas:</b> ${esc(r.notes||'Sin anotaciones')}</p><p><b>Daños observados:</b> ${esc([...new Set((Array.isArray(r.variant?.defects)?r.variant.defects:[]).flat().filter(d=>d&&typeof d==='object').map(d=>labelAsset(d.name)))].join(', ')||'Ninguno')}</p><p><b>Base visual:</b> ${esc(r.variant?.baseGrade||'Histórica / de época')}${r.variant?.shader?.finish&&r.variant.shader.finish!=='historic'&&r.variant.shader.finish!=='suspect'?' · '+esc(r.variant.shader.finish.replace('_',' ').replace('_',' ')):''}</p>${r.learning?`<p><b>Informe formativo:</b> ${esc(r.learning)}</p>`:''}</div><div class="status ${r.falseApproved?'bad':''}">${esc(r.judgment)}<br>${Number(r.reward)>=0?'+':''}${esc(Number(r.reward)||0)} €${Number(r.analysisSpent)>0?' · XRF −'+Number(r.analysisSpent)+' €':''}${Number(r.labFee)>0?' · laboratorio +'+Number(r.labFee)+' €':''}</div></div>`;}).join('')+'</div>'+`<div class="ncg-history-footer"><button id="histPrev" ${historyPage===0?'disabled':''}>← Anterior</button><span>Página ${historyPage+1} de ${pages} · ${full.length} expedientes</span><button id="histNext" ${historyPage>=pages-1?'disabled':''}>Siguiente →</button></div>`;}

function notify(message,type='info',seconds=7){
 const box=$('ncgNotice');if(!box)return;
 const msg=$('ncgNoticeText');if(msg)msg.textContent=String(message);
 box.dataset.kind=type;
 box.hidden=false;
 box.setAttribute('role',type==='error'?'alert':'status');
 if(noticeTimer)clearTimeout(noticeTimer);
 if(seconds>0)noticeTimer=setTimeout(()=>{box.hidden=true;},seconds*1000);
}

function hideNotice(){if(noticeTimer)clearTimeout(noticeTimer);$('ncgNotice').hidden=true;}

function showFileWarning(message,storageProblem=true){
 const b=$('storageAlert');if(!b)return;
 b.hidden=false;b.querySelector('[data-alert-text]').textContent=message;
 b.dataset.storageProblem=String(storageProblem);
}

function renderCase(){const c=currentCoin();updateClock();applyCoinScale(c);$('dayNum').textContent=String(session.day).padStart(2,'0')+(session.modifiedByDeveloper?' *':'');$('caseNum').textContent=String(session.index+1).padStart(2,'0')+' / '+String(session.cases.length).padStart(2,'0');renderCaseTop();$('deskTitle').textContent=session.day===CAMPAIGN_LENGTH?`ARCHIVO FINAL · CASO ${String(session.index+1).padStart(2,'0')} / ${session.cases.length}`:`BANDEJA DE RECEPCIÓN · NCG-${String(session.day).padStart(2,'0')}-${String(session.index+1).padStart(3,'0')}`;$('faceIndicator').textContent=face===0?'CARA 1 · F PARA GIRAR':'CARA 2 · F PARA GIRAR';$('deskLabel').textContent=(window.NCGQoL?.getSettings?.().theme||'verde')==='verde'?'ZONA SEGURA · FIELTRO VERDE':'ZONA SEGURA · MESA DE EXAMEN';$('fileCard').innerHTML=`<div class="stamp">SIN EXAMINAR</div><h2>Hoja de recepción</h2>${c.ancient?'<div class="ncg-ancient-note">NCG ANCIENTS · moneda de la Antigüedad. Si es auténtica, certifica y encapsula o perderás reputación.</div>':''}${active.institutional?`<div class="ncg-institutional"><b>ENCARGO INSTITUCIONAL</b> · ${esc(active.clientTier||'Cliente de archivo')}<small>Las piezas complejas reciben honorarios adicionales por dictamen correcto; los errores tienen mayor responsabilidad.</small></div>`:''}<div class="field"><label>Identificación declarada</label><div>${esc(c.name)}</div><small>${esc(c.origin)} · ${esc(c.year)}</small></div><div class="field"><label>Fidelidad artística</label><small>${esc(historicalCaption(c))}</small></div><div class="field"><label>Metal declarado</label><div>${esc(metalLabel(c))}</div></div><div class="field"><label>Referencia orientativa</label><div>${Number(c.mass).toFixed(2)} g · ${Number(c.diameter).toFixed(1)} mm</div><small data-ncg-reference-note>${esc(c.referenceNote||'Valores de referencia del tipo; algunas tolerancias son simuladas.')}</small><details class="ncg-source-note" data-ncg-original-note><summary>Nota original (español)</summary><small>${esc(c.referenceNote||'Valores de referencia del tipo; algunas tolerancias son simuladas.')}</small></details>${isHammeredCoin(c)?`<small><b>Tolerancia orientativa del simulador: ±${(hammeredWeightTolerance(c)*100).toFixed(1).replace('.',',')} %</b> (${(Number(c.mass)*(1-hammeredWeightTolerance(c))).toFixed(2)}–${(Number(c.mass)*(1+hammeredWeightTolerance(c))).toFixed(2)} g). Las acuñaciones a martillo pueden presentar variaciones; no rechaces por masa aislada.</small>`:''}<small>ρ orientativa: ${Number(c.rho).toFixed(2)} g/cm³ · ${esc(c.alloy||'aleación variable')}. Las lecturas son indicios, no una prueba definitiva.</small></div><div class="field"><label>Escala física representada</label><div>${sizeLabel(c)}</div><small>El diámetro visual es proporcional al módulo de la pieza. Usa la lupa (Micro) para ampliar los detalles.</small></div><div class="field"><label>Estado base visual</label><div>Pendiente de calificación pericial</div><small>${isHammeredCoin(c)?'La recreación base conserva aspecto histórico, sin forzar acabado GEM.':'La pieza simulada puede ser VF, XF, AU o MS. Observa lustre, desgaste y relieve, no solo las rayas.'}</small></div><div class="field"><label>Petición</label><div class="quote">«Compruebe la pieza y emita una etiqueta NCG con su criterio.»</div></div><div class="field"><label>Nota de archivo</label><small>Recreación digital del tipo. Peso, diámetro y densidad admiten variaciones según acuñación y conservación; ninguna lectura aislada determina autenticidad. Las alteraciones y el orden cambian en cada jornada.</small></div>`;
 if(session.day===CAMPAIGN_LENGTH){$('fileCard').insertAdjacentHTML('afterbegin','<div class="ncg-final-dossier">ARCHIVO FINAL · OPERACIÓN ÚLTIMO CUÑO <small>Inspecciona cada pieza sin conocer el resultado de la remesa; ningún dato aislado garantiza autenticidad.</small></div>');}
 drawCoin();showTool();}

function renderTools(){$('toolbar').innerHTML=TOOLS.map(([id,ico,name])=>`<button class="tool ${tool===id?'active':''}" data-tool="${id}" title="${esc(HINTS[id])}"><b>${ico}</b><small>${name}</small></button>`).join('');for(const btn of $('toolbar').querySelectorAll('button'))btn.onclick=()=>selectTool(btn.dataset.tool);window.NCGQoL?.refresh();}

function renderReadings(){const reads=active.readings||{};const fields=[['Peso','mass'],['Diámetro','dia'],['Imán','magnet'],['Densidad','density'],['Microscopio','micro'],['UV','uv'],['XRF','xrf'],['Luz rasante','light'],['Canto','edge'],['Resonancia','tap']];$('readings').innerHTML=fields.map(([n,k])=>`<div class="reading"><label>${n}</label><strong>${esc(reads[k]||'—')}</strong></div>`).join('');}

// Un único control de frecuencia para F y el botón Girar. No crear dibujos intermedios.
const COIN_FLIP_COOLDOWN_MS=1000;
let lastCoinFlipAt=-COIN_FLIP_COOLDOWN_MS;
function flip(){
 const now=performance.now();
 if(now-lastCoinFlipAt<COIN_FLIP_COOLDOWN_MS && session?.tutorialStep!=='girar')return false;
 lastCoinFlipAt=now;
 face=1-face;
 drawCoin();
 $('faceIndicator').textContent=face===0?'CARA 1 · F PARA GIRAR':'CARA 2 · F PARA GIRAR';
 if(session.tutorialStep==='girar'){session.tutorialStep='pesar';saveSession();updateTutorial();}
 playSfx('flip');addLog('Se ha girado la moneda.');
 return true;
}

let rakingFrame=0;
function showTool(){
 cancelAnimationFrame(rakingFrame);rakingFrame=0;
 for(const id of ['scaleStation','hydroStation','magnetObject','caliperUI','uvBeam','loupe','rakingBeam','edgeView'])$(id).style.display='none';
 $('deskHelp').textContent=HINTS[tool]||HINTS.view;
 const opt=$('actionLine');
 const names={view:'VISTA LIBRE',scale:'BALANZA',hydro:'DENSIDAD',caliper:'CALIBRE',magnet:'IMÁN',micro:'MICROSCOPIO',uv:'LINTERNA UV',light:'LUZ RASANTE',xrf:'XRF',edge:'CANTO',tap:'PRUEBA ACÚSTICA'};
 const title=document.createElement('strong');title.textContent=names[tool]||'VISTA LIBRE';
 opt.replaceChildren(title,document.createTextNode(' · '+(HINTS[tool]||'')));
 const addNote=(message)=>{const span=document.createElement('span');span.style.whiteSpace='nowrap';span.textContent=message;opt.append(' ',span);};
 if(tool==='scale'){ $('scaleStation').style.display='flex'; $('scaleDigital').textContent=active.readings?.mass||'0.00 g';}
 if(tool==='hydro'){$('hydroStation').style.display='flex';}
 if(tool==='magnet'){$('magnetObject').style.display='block';$('magnetObject').style.left='22px';$('magnetObject').style.top='';$('magnetObject').style.bottom='18px';}
 if(tool==='caliper'){$('caliperUI').style.display='block';centerCaliper();addNote('Medición automática · pulsa Registrar');}
 if(tool==='uv')$('uvBeam').style.display='block';
 if(tool==='micro'){resizeMicroPanel();$('loupe').style.display='block';const label=$('loupe').querySelector('.loupeTitle');if(label)label.textContent=(hasUpgrade('micro')&&window.NCGQoL?.isMicro5xEnabled?.()!==false)?'MICROSCOPIO ×5 · MOVER':'MICROSCOPIO ×3 · MOVER';}
 if(tool==='light'){
  $('rakingBeam').style.display='block';
  const label=document.createElement('label');label.style.whiteSpace='nowrap';label.append('Ángulo ');
  const range=document.createElement('input');range.type='range';range.id='angleRange';range.min='5';range.max='170';range.value='25';range.style.width='105px';range.style.accentColor='var(--t-accent, #edc2d6)';range.style.verticalAlign='middle';label.appendChild(range);opt.append(' ',label);
  range.oninput=e=>{
   $('rakingBeam').style.background=`linear-gradient(${e.target.value}deg,transparent 8%,#ffe3a95e 50%,transparent 82%)`;
   if(!rakingFrame)rakingFrame=requestAnimationFrame(()=>{rakingFrame=0;if(tool==='light')drawCoin();});
   read('light',lightObservation(),'Luz rasante: '+lightObservation()+'.');
  };
  if(!active.readings?.light)read('light',lightObservation(),'Luz rasante: '+lightObservation()+'.');
 }
 if(tool==='edge'){$('edgeView').style.display='block';renderEdgeTool();addNote('A / D · rueda · deslizador');}
 if(tool==='tap'){
  const again=document.createElement('button');again.id='ncgTapAgain';again.type='button';again.className='ncg-tap-button';again.dataset.ncgRing='';again.textContent='♪ Golpear suavemente / escuchar';again.addEventListener('click',inspectCoinResonance);
  const reference=document.createElement('button');reference.id='ncgTapRef';reference.type='button';reference.dataset.ncgRing='';reference.textContent='♫ Referencia del metal';reference.addEventListener('click',inspectMetalReference);
  const note=document.createElement('small');note.textContent='Una moneda legítima puede sonar apagada; algunas falsas pueden resonar. Compara con el metal declarado.';
  opt.append(' ',again,' ',reference,' ',note);
 }
}

function showStoryIntro(){
 if(!session||session.storySeen)return;

 showModal(`<div class="modalHead"><h2>NCG · Historia del gabinete</h2></div><div class="ncg-story"><div class="ncg-story__tag">ARCHIVO 01 · MADRID · OTOÑO DE 2026</div><h3>El gabinete abre sus puertas</h3><p>Heredas un pequeño gabinete de certificación numismática: una mesa de fieltro, instrumental usado y una reputación todavía por construir. Museos, comerciantes y coleccionistas esperan dictámenes honestos.</p><p>Algunas monedas son falsas; otras son obras de arte auténticas. Tu trabajo es observar, medir y poner una nota defendible. El cliente ve tu etiqueta: un grado inflado puede arruinar tu nombre.</p><p><b>Hoy dispones de ${money(session.money)}.</b> El reloj avanza una hora por expediente, pero <b>no hay límite de tiempo real</b>. Cuando termine la jornada se evaluará tu trabajo. Desde el siguiente turno pagarás alquiler y sueldos; puedes invertir ahora en el taller.</p><p class="ncg-story__seed">Código reproducible del turno: <b>${esc(session.seed)}</b></p><div class="ncg-start-options"><button id="startGuided" class="submit" type="button">Hacer el tutorial</button><button id="startStandard" type="button">Saltar el tutorial</button></div><small>En las jornadas 1–3, el modo guiado limita la pérdida a 25 € y 4 puntos de reputación por dictamen. El primer XRF de cada expediente cuesta 6 € y el segundo, 12 €. En las jornadas 2 y 3, el gabinete recibe 95 € de ayuda de apertura en modo guiado y 50 € en modo normal.</small></div>`);
 $('startGuided').onclick=()=>{session.beginnerAid=true;session.storySeen=true;session.tutorialStep='ficha';saveSession();hideModal();renderCase();startTutorial();};
 $('startStandard').onclick=()=>{session.storySeen=true;session.tutorialStep='';saveSession();hideModal();};
 $('startGuided').focus({preventScroll:true});
}

function showModal(html){$('modalBox').innerHTML=html;$('modal').classList.add('show');window.NCGSound?.play('modalOpen');window.NCGGraphics?.refresh();}

function hideModal(options){
 if($('startStandard')?.id==='startStandard'&&!session.storySeen)return;
 options=options||{};
 const hasCompletedReport=!!$('modalBox').querySelector('#nextCaseBtn');
 const dayHasNoActiveCase=!!(session&&Array.isArray(session.cases)&&session.index>=session.cases.length);
 $('modal').classList.remove('show');
 window.NCGSound?.play('modalClose');
 window.NCGGraphics?.refresh();
 if(hasCompletedReport){
  try{
   if(dayHasNoActiveCase||session.finished){
    if(session.day>=CAMPAIGN_LENGTH)showCampaignFinale();
    else showEndDay();
   }else openCase();
  }
  catch(err){
   NCGLog.error(err,{phase:'advance-after-verdict',index:session?.index});
   notify('No se pudo abrir el siguiente expediente. Tu progreso sigue guardado: abre Menú → Continuar expediente.','error',0);
   try{showMainMenu();}catch(_e){}
  }
  return;
 }
 // Al cerrar el resumen, el taller, el historial u otro modal una vez agotados
 // los expedientes, volver al menú principal; nunca dejar el último caso inerte.
 if(dayHasNoActiveCase&&options.returnToMenu!==false&&!isMenuVisible()){
  active=null;
  try{showMainMenu();}catch(err){NCGLog.error(err,{phase:'close-modal-after-day',index:session?.index});}
 }
}



function renderHistoryContent(){
 const content=$('histContent');if(!content)return;
 content.innerHTML=historyMode==='gallery'?historyGallery():historyList();
 const count=$('histCount');if(count)count.textContent=`${filteredHistory().length} de ${history.length} expedientes`;
 const prev=$('histPrev'),next=$('histNext');
 if(prev)prev.onclick=()=>{historyPage--;renderHistoryContent();};
 if(next)next.onclick=()=>{historyPage++;renderHistoryContent();};

}

function showHistory(){
 ensureRecordIds(history);
 const galleryCount=history.filter(r=>r.certified&&r.auth==='real').length;
 const inner=`<div class="modalHead"><h2>Gabinete de certificación · ${galleryCount} cápsulas</h2><button class="close" onclick="NCG.hide()">Cerrar</button></div>
 <p class="smallText">Busca entre tus certificados, rechazos y revisiones. Las piezas conservan las marcas particulares de cada partida. Usa «Respaldo» para conservar además la jornada y las mejoras.</p>
 <div class="ncg-history-toolbar"><div class="ncg-history-tabs"><button id="galleryTab" class="${historyMode==='gallery'?'active':''}">Galería de slabs</button><button id="listTab" class="${historyMode==='list'?'active':''}">Todos los dictámenes (${history.length})</button></div><div class="modalActions"><button id="exportJSON">Exportar JSON</button><button id="importJSON">Importar JSON</button><input id="importJSONFile" type="file" accept=".json,application/json" hidden/><button id="exportCSV">CSV</button><button id="clearHistory">Borrar historial</button></div></div>
 <div class="ncg-history-filters"><label>Buscar<input type="search" id="histSearch" placeholder="Moneda, ceca, fecha, certificado o notas…" value="${esc(historyQuery)}" autocomplete="off"></label><label>Tipo de dictamen<select id="histFilter"><option value="all">Todos</option><option value="certified">Certificados</option><option value="rejected">Falsas rechazadas</option><option value="error">Errores</option><option value="review">Revisiones</option></select></label><span id="histCount" role="status"></span></div>
 <p class="ncg-history-reference-note">Vista previa ligera: las imágenes de las cápsulas son referencias del tipo. Los daños, desgaste y dictámenes particulares se conservan en cada expediente.</p>
 <div id="histContent"></div>`;
 showModal(inner);
 $('histFilter').value=historyFilter;
 renderHistoryContent();
 let historySearchTimer=null;
 $('histSearch').addEventListener('input',e=>{historyQuery=e.target.value;historyPage=0;if(historySearchTimer!==null)clearTimeout(historySearchTimer);historySearchTimer=setTimeout(()=>{historySearchTimer=null;if($('histContent'))renderHistoryContent();},180);});
 $('histFilter').addEventListener('change',e=>{historyFilter=e.target.value;historyPage=0;renderHistoryContent();});
 $('galleryTab').onclick=()=>{historyMode='gallery';historyPage=0;showHistory();};
 $('listTab').onclick=()=>{historyMode='list';historyPage=0;showHistory();};
 $('exportJSON').onclick=()=>download(new Blob([JSON.stringify({version:6,exported:new Date().toISOString(),history},null,2)],{type:'application/json'}),'NCG_Historial.json');
 $('exportCSV').onclick=exportCSV;
 $('importJSON').onclick=()=>$('importJSONFile').click();
 $('importJSONFile').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const payload=JSON.parse(await file.text());const items=Array.isArray(payload)?payload:payload.history;
   if(!Array.isArray(items)||items.length>50000)throw Error('El JSON no contiene un historial válido de expedientes.');
   const valid=items.filter(r=>r&&typeof r==='object'&&!Array.isArray(r)&&typeof r.id==='string'&&coins.some(c=>c.id===r.id)&&typeof r.date==='string'&&(!r.variant?.defects||(Array.isArray(r.variant.defects)&&r.variant.defects.every(s=>Array.isArray(s)&&s.every(d=>d&&typeof d==='object'&&typeof d.name==='string')))));
   ensureRecordIds(history);ensureRecordIds(valid);
   const cleanValid=valid.map(sanitizeImportedRecord);
   const ids=new Set(history.map(r=>String(r.certNumber)+'|'+String(r.date)));
   let added=0;const merged=history.slice();
   for(const r of cleanValid){
    const key=String(r.certNumber)+'|'+r.date;
    if(ids.has(key))continue;
    ids.add(key);merged.push(r);added++;
   }
   merged.sort((a,b)=>(Date.parse(b.date)||0)-(Date.parse(a.date)||0));ensureRecordIds(merged);
   if(!storeWithWarning(HISTORY_KEY,merged))throw Error('No se pudo almacenar el historial; exporta un respaldo antes de cerrar.');
   history=merged;historyPage=0;showHistory();
   notify('Historial importado: '+added+' expediente(s) nuevo(s).','success');
  }catch(err){notify('No se ha podido importar el historial: '+err.message,'error',12);}
 };
 $('clearHistory').onclick=()=>{if(confirm('¿Borrar permanentemente el historial local? Esta acción no puede deshacerse.')){history=[];saveHistory();historyPage=0;showHistory();}};
}

function showManual(){if(window.NCGQoL?.getSettings?.().lang==='eu'&&window.NCGBasqueManual){showModal(window.NCGBasqueManual());return;}if(window.NCGQoL?.getSettings?.().lang==='en'&&window.NCGEnglishManual){showModal(window.NCGEnglishManual());return;}showModal(`<div class="modalHead"><h2>Manual NCG · peritaje y campaña · ${NCG_VERSION.release}</h2><button class="close" onclick="NCG.hide()">Cerrar</button></div><div class="noteBlock"><p><b>Campaña de 30 jornadas y 129 tipos con 258 caras vectoriales.</b> Cada jornada trae de 9 a 16 piezas según reputación, con 1–4 falsificaciones y semilla reproducible. Details aparece con una probabilidad independiente del 5 % por expediente (no está garantizada ninguna cantidad por jornada). Pulsa R desde el gabinete para abrir una confirmación de borrado irreversible, con opción de exportar un respaldo JSON. La tecla no actúa sobre los menús, los campos de edición ni los diálogos, y tiene un intervalo antispam de 1 segundo. Volverás al día 1 con semilla aleatoria, 400 € y reputación 50; se borran la partida y el historial. El reloj avanza una hora por expediente sin límite de tiempo real. El menú «Jugar» muestra el calendario de días: solo los desbloqueados pueden jugarse. La última jornada plantea una investigación reservada. Su composición se descubrirá únicamente al finalizar la campaña.</p><p><b>Peritaje:</b> observa las dos caras, pesa con balanza (0,01 g de serie), mide diámetro y examina con lupa ×3 (×5 con mejora), imán, UV, canto y luz rasante. Para emitir cualquier dictamen debes registrar peso, diámetro y una prueba complementaria. El XRF es opcional. El XRF cuesta 12 € por cara (hasta 24 € por ambas caras), con o sin mejora. La calibración avanzada mejora ambas caras y cuesta 400 € más 8 € de mantenimiento por jornada. Si certificas correctamente una auténtica con lecturas de ambas caras, cobras 15 € adicionales por el servicio documentado; no hay suplemento por lecturas parciales ni por falsificaciones aprobadas. Monedas auténticas pueden estar en VF, XF, AU o MS; su luz y desgaste se simulan. La nota se compara con un margen pedagógico: ±10 puntos en grados circulados o AU; para MS se aceptan hasta cinco puntos por encima y hasta ocho por debajo (como transición hacia AU). Dentro del margen no hay penalización numérica; ±1 tiene recompensa (+2 reputación, +12 €). Solo el exceso del margen se sanciona. Los errores de Details y de designación PF/SP se juzgan aparte; las falsificaciones se analizan de forma independiente. En NCG Ancients también se valoran Strike y Surface.</p><p><b>Falsificaciones bañadas:</b> una copia puede imitar el peso y dar XRF superficial compatible con el metal declarado. El XRF no mide el núcleo: coteja densidad hidrostática (después de pesar en seco), canto a 360°, microscopio y ambas caras. En copias sutiles incluso varias pruebas pueden resultar plausibles; si la evidencia no basta, utiliza «Revisar». La coincidencia de masa y XRF nunca prueba autenticidad. <b>Acuñación a martillo:</b> la ficha de recepción muestra la tolerancia simulada específica del tipo, que no constituye un criterio de autenticidad absoluto. <b>Notas +:</b> indica calidad alta dentro del mismo grado; no suma un punto Sheldon en las penalizaciones.</p><p><b>Consulta la <a href="ESCALA_SHELDON_Y_SHADERS.html" data-ncg-guide="ESCALA_SHELDON_Y_SHADERS.html">escala Sheldon completa</a></b> antes de certificar: la probabilidad de cada estado de conservación varía entre expedientes, pero se mantiene su referencia oculta.</p><p><b>Riesgos:</b> aprobar una falsa cuesta entre 240 y 515 € aproximadamente, según el valor y la licencia de la pieza, más entre 12 y 19 puntos de reputación (y responsabilidad institucional si procede). Rechazar una moderna auténtica cuesta 20 € y 3 puntos; una antigua auténtica 50 € y 7 puntos. Enviar a revisión cuesta 12 € y 1 punto inicialmente, con recargos. Rechazar una falsa da 18 € y 2 puntos.</p><p><b>Taller:</b> compra balanza metrológica (80 €), microscopio metalográfico (130 €) o calibración avanzada de XRF. Cada adquisición tiene un precio y un coste de mantenimiento al abrir nuevas jornadas. Costes fijos de alquiler y sueldos: ${OFFICE_FIXED_COST} € por jornada desde la segunda; desde la jornada 9 se aplican costes graduales de ampliación del gabinete (hasta 176 €) y licencias profesionales según reputación (hasta 85 €). Desde la jornada 11 se suman costes de capacidad (volumen de expedientes del día anterior, personal especializado y puestos de trabajo, hasta 525 € adicionales). El taller indica el gasto próximo antes de abrir jornada.</p><p><b>Progresión:</b> reputación sin límite; internacional desde 95, oro 115, prestigio 165, élite 225, instituciones 350, museos 500, patrimonio 650, especialistas 900, patrimonio internacional 1200, grandes colecciones públicas 1600 y maestros desde 2200. A partir de 750 se reconoce al gabinete consolidado. Los contratos institucionales ofrecen premios adicionales solo si el dictamen es correcto. El historial se conserva localmente; el botón de respaldo se destaca cada cinco jornadas. NCG Desktop guarda la partida en archivos JSON; exporta respaldos regularmente. La primera empresa puede elegir guía y seguro pedagógico para los tres primeros expedientes (dictamen mínimo −65 € y −5 reputación), además de alquiler y salarios subvencionados en las jornadas 2 y 3.</p></div><p><b>Shaders:</b> puedes estudiar las seis capas de iluminación, relieve, material, pátina, microtextura y marcas de contacto en el <a href="TUTORIAL_SHADERS.html" data-ncg-guide="TUTORIAL_SHADERS.html" style="color:#d6bd8e">tutorial interactivo</a>. El juego no muestra el grado verdadero antes del dictamen. <b>Privacidad:</b> la partida y los certificados se guardan localmente. No se recopilan registros de pulsaciones ni archivos de diagnóstico.</p><div class="modalActions"><button onclick="NCG.hide()">Volver al gabinete</button><button onclick="NCG.shop()">Abrir taller</button></div><p class="smallText">Los diseños vectoriales son recreaciones digitales y las mediciones son simuladas; estos criterios no sustituyen la autenticación de piezas reales.</p>`);}

