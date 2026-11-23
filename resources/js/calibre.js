'use strict';

// El calibre se alinea automáticamente con la moneda. El jugador solo registra la lectura.
function caliperValueMm(){return Math.max(0,caliperRightMm-caliperLeftMm);}
function caliperTargetsMm(){
 const track=$('caliperTrack').getBoundingClientRect();
 const coin=$('coinToken').getBoundingClientRect();
 const k=pixelsPerMm();
 const diameter=Math.min(coin.width,coin.height)*COIN_VISIBLE_RATIO;
 const left=coin.left+(coin.width-diameter)/2;
 const right=coin.right-(coin.width-diameter)/2;
 return {left:(left-track.left)/k,right:(right-track.left)/k};
}
function alignCaliperToCoin(){
 const diameter=effectiveDia();
 caliperLeftMm=(CALIPER_MAX-diameter)/2;
 caliperRightMm=(CALIPER_MAX+diameter)/2;
 updateCaliper();
}
function centerCaliper(){
 if(!active)return;
 const coin=$('coinToken').getBoundingClientRect();
 const desk=$('desk').getBoundingClientRect();
 const k=pixelsPerMm(),tokenSize=effectiveDia()*k;
 caliperAnchorX=coin.left-desk.left+coin.width/2;
 caliperAnchorY=Math.max(5,(coin.top-desk.top)+(coin.height-tokenSize)/2-54);
 const railY=caliperAnchorY+40;
 caliperJawLength=Math.max(65,coin.top-desk.top+coin.height/2-railY);
 updateCaliperGeometry();
 alignCaliperToCoin();
}
function updateCaliperGeometry(){
 const k=pixelsPerMm(),ui=$('caliperUI'),track=$('caliperTrack');
 if(!ui||!track)return;
 const width=CALIPER_MAX*k;
 ui.style.width=(width+20)+'px';
 ui.style.left=caliperAnchorX+'px';
 ui.style.top=caliperAnchorY+'px';
 track.style.width=width+'px';
 track.style.height=(caliperJawLength+50)+'px';
 track.style.setProperty('--half-step',k*CALIPER_STEP+'px');
 for(const jaw of [$('jawLeft'),$('jawRight')])jaw.style.height=(caliperJawLength+5)+'px';
 $('caliperTicks').style.backgroundImage='linear-gradient(90deg,rgba(233,244,234,.85) 0 1px, transparent 1px 100%)';
 $('caliperTicks').style.backgroundSize=(k*CALIPER_STEP)+'px 16px';
 $('caliperNumerals').innerHTML=Array.from({length:8},(_,i)=>{
  const mm=(i+1)*5;
  return `<span style="left:${mm/CALIPER_MAX*100}%">${mm}</span>`;
 }).join('');
 updateCaliper();
}
function resetCaliper(){alignCaliperToCoin();}
function updateCaliper(){
 const left=$('jawLeft'),right=$('jawRight');
 if(!left||!right)return;
 left.style.left=caliperLeftMm/CALIPER_MAX*100+'%';
 right.style.left=caliperRightMm/CALIPER_MAX*100+'%';
 $('caliperValue').textContent=caliperValueMm().toFixed(1)+' mm';
 if(active&&tool==='caliper'){
  const message='Medición automática preparada. Pulsa Registrar.';
  $('caliperInfo').classList.remove('ok','recorded');
  $('caliperInfo').textContent=message;
  $('deskHelp').textContent='Calibre alineado automáticamente. Pulsa Registrar para guardar el diámetro.';
 }
}
function markCaliper(){
 if(tool!=='caliper'||!active)return;
 alignCaliperToCoin();
 const value=caliperValueMm().toFixed(1)+' mm';
 if(!active.readings)active.readings={};
 active.readings.dia=value;
 if(!Array.isArray(active.caliperAttempts))active.caliperAttempts=[];
 active.caliperAttempts.push({value,at:new Date().toISOString()});
 renderReadings();
 refreshMinimumExamUI();
 addLog('Calibre: lectura automática registrada '+value+'.');
 $('caliperInfo').classList.add('recorded');
 $('caliperInfo').textContent='Lectura registrada: '+value+'.';
 $('deskHelp').textContent='Diámetro registrado: '+value+'.';
 saveSession();
 updateTutorial();
}
