'use strict';

function chooseWearBand(c){
 const r=seededRandom();
 const older=c.id==='india_rupee_1840'||c.id==='france_5fr_1873'||c.id==='8_maravedis_Felipe_IV_1624'||c.id==='8_reales_macuquina_Carlos_II'||c.id==='real_reyes_catolicos_1497';
 if(older)return r<.50?'VF':r<.75?'XF':r<.92?'AU':'MS';
 if(metalFamilia(c)==='oro')return r<.23?'VF':r<.46?'XF':r<.78?'AU':'MS';
 if(metalFamilia(c)==='cobre')return r<.47?'VF':r<.73?'XF':r<.91?'AU':'MS';
 return r<.33?'VF':r<.59?'XF':r<.83?'AU':'MS';
}

function baseGradeFor(c){
 if(!!c.ancient)return 'HISTÓRICA';
 const band=chooseWearBand(c);
 return choice(MODERN_GRADE_BANDS[band]).toString().padStart(2,'0').replace(/^/,band);
}

function clampNumber(v,a,b){return Math.max(a,Math.min(b,v));}

/**
 * Intensidad de desgaste según la escala Sheldon del expediente.
 * La fórmula es común a históricas no antiguas y a monedas modernas.
 */
function wearForGrade(band,exact){
 if(band==='VF')return .78-(exact-20)/15*.15;
 if(band==='XF')return .49-(exact-40)/5*.13;
 if(band==='AU')return .32-(exact-50)/8*.15;
 return .15-(exact-60)/10*.135;
}

function makeShader(c,isFake,subtleFake=false){
 const ancient=ANCIENT_OR_HAMMERED.has(c.id)||!!c.ancient;
 const grade=c.ancient?'HISTÓRICA':baseGradeFor(c);
 const band=grade.slice(0,2);
 const metalTint=metalFamilia(c)==='oro'?'#ffdf80':metalFamilia(c)==='plata'?'#dce7ef':'#d48c5d';
 const finish=ancient?'historic':metalFamilia(c)==='oro'?'satin_gold':metalFamilia(c)==='cobre'?'dark_copper':seededRandom()<.38?'rainbow_toning':'washed_silver';
 if(isFake&&subtleFake){return {type:ancient?'historic':(band==='MS'?'gem':'circulated'),baseGrade:grade,wearBand:band,wearLevel:band==='VF'?.69:band==='XF'?.41:band==='AU'?.20:0,grime:random(.07,.18),lustre:random(.36,.65),tint:metalTint,finish};}
 if(isFake){return {type:'suspect',baseGrade:grade,wearBand:band,wearLevel:band==='VF'?.68:band==='XF'?.41:band==='AU'?.18:0,grime:random(.14,.3),lustre:random(.17,.37),tint:metalTint,finish:'suspect'};}
 if(ancient){
  const ancientFinish=metalFamilia(c)==='plata'&&seededRandom()<.28?'washed_silver':metalFamilia(c)==='cobre'&&seededRandom()<.4?'dark_copper':'historic';
  if(c.ancient)return {type:'historic',baseGrade:grade,wearBand:band,wearLevel:random(.35,.65),grime:random(.08,.19),lustre:random(.25,.44),tint:metalTint,finish:ancientFinish};
  const exact=Number(grade.match(/(\d{2})$/)?.[1]||55);
  const wearByGrade=wearForGrade(band,exact);
  const lustreByBand={VF:.17,XF:.32,AU:.52,MS:.79}[band]||.52;
  return {type:'historic',baseGrade:grade,wearBand:band,wearLevel:clampNumber(wearByGrade+random(-.025,.025),0,.95),grime:random(.08,.19),lustre:clampNumber(lustreByBand+random(-.038,.038),.06,.95),dieWeakness:random(.15,.42),contactDensity:random(.2,.55),tint:metalTint,finish:ancientFinish};
 }
 // Solo usamos la distribución de suciedad; los tramos de brillo y desgaste
 // se calculan con las funciones de graduación y no con valores duplicados.
 const grimeByBand={VF:[.28,.38],XF:[.18,.27],AU:[.09,.16],MS:[.02,.11]};
 const [gMin,gMax]=grimeByBand[band]||grimeByBand.AU;
 const exact=Number(grade.match(/(\d{2})$/)?.[1]||55);
 const wearByGrade=wearForGrade(band,exact);
 const lustreBase={VF:.17,XF:.32,AU:.52,MS:.79}[band]||.52;
 const survivingLustre=clampNumber(lustreBase+random(-.045,.045),.05,.94);
 return {type:band==='MS'?'gem':band==='AU'?'near_unc':'circulated',baseGrade:grade,wearBand:band,
 wearLevel:clampNumber(wearByGrade+random(-.028,.028),0,.97),grime:random(gMin,gMax),lustre:survivingLustre,
 contactDensity:clampNumber(random(.1,.36)+(band==='MS'?(70-exact)*.035:band==='AU'?.30:band==='XF'?.52:.7),0,1),
 dieWeakness:random(0,.21),surfaceSeed:Math.floor(seededRandom()*4294967295),tint:metalTint,finish};
}

function newDamage(name,large=false){return {name,x:randInt(-155,155),y:randInt(-155,155),rot:randInt(-145,145),size:large?random(.88,1.22):random(.42,.95),opacity:random(.55,.92)};}

function isHammeredCoin(c){return ANCIENT_OR_HAMMERED.has(c.id)||!!c.ancient||c.edgeType==='martillado_irregular';}

function hammeredWeightTolerance(c){
 if(c.id==='denario_elephante_Cesar')return .045;
 if(c.id==='athens_tetradrachm')return .055;
 if(c.id==='byzantium_solidus_justinian')return .035;
 if(c.id==='8_reales_macuquina_Carlos_II')return .06;
 if(c.id==='aureo_adriano')return .03;
 if(c.id==='denario_m_marcius_134ac')return .05;
 if(c.id==='real_reyes_catolicos_1497')return .06;
 return .04;
}

function genuineMass(c){
 if(isHammeredCoin(c))return c.mass*(1+random(-hammeredWeightTolerance(c),hammeredWeightTolerance(c)));
 const spread=Math.min(.07,Math.max(.015,c.mass*.008));
 return c.mass+random(-spread,spread);
}

function counterfeitMass(c,fakeType,camouflaged){
 const hammered=isHammeredCoin(c),tol=hammered?hammeredWeightTolerance(c):0;
 const closeChance=camouflaged?1:(fakeType==='periodo'?.58:fakeType==='chapada'?.43:.32);
 if(seededRandom()<closeChance){
  if(hammered)return c.mass*(1+random(-tol,tol));
  const spread=Math.min(.07,Math.max(.015,c.mass*.008));
  return c.mass+random(-spread,spread);
 }
 const maxDeficit=Math.min(2.3,c.mass*.35);
 return c.mass-random(Math.min(.3,maxDeficit*.45),maxDeficit);
}

function measuredDiameter(c,isFake,fakeType,camouflaged){
 const hammered=isHammeredCoin(c);
 const base=c.id==='8_reales_macuquina_Carlos_II'?random(34,38):c.diameter;
 const authenticSpread=hammered?random(.55,.95):.28;
 let delta;
 if(!isFake){delta=random(-authenticSpread,authenticSpread);}
 else{
  const closeChance=camouflaged?1:(fakeType==='periodo'?.58:fakeType==='chapada'?.45:.34);
  if(seededRandom()<closeChance)delta=random(-authenticSpread,authenticSpread);
  else delta=(seededRandom()<.5?-1:1)*random(.5,1.2);
 }
 return Math.round((base+delta)*10)/10;
}

function counterfeitDensity(c,fakeType,camouflaged){
 if(camouflaged)return c.rho+random(-.18,.18);
 const plausibleChance=fakeType==='periodo'?.42:fakeType==='chapada'?.32:.22;
 if(seededRandom()<plausibleChance)return c.rho+random(-.22,.22);
 if(fakeType==='chapada')return c.metal==='oro'?random(8.4,11.1):c.metal==='plata'?random(8.7,9.6):c.metal==='aluminio'?random(3.9,6.9):random(7.2,8.1);
 return fakeType==='periodo'?c.rho-random(.35,1.45):c.rho-random(.65,2.0);
}

function createEdgeProfile(c,isFake,subtleFake,hiddenDetails,faceDefects,fakeType){
 const marks=(faceDefects||[]).flat().map(d=>d&&d.name).filter(Boolean);
 const randMinor=()=>choice([
  {type:'rayas',label:'Rayas y roces de canto',note:'Se ven rayas cortas de contacto y pequeñas abrasiones por manipulación o circulación.',visual:'scratches',suspicious:false,severe:false},
  {type:'golpe',label:'Golpe localizado de canto',note:'Hay un pequeño golpe o aplanamiento del borde; es compatible con un impacto aislado.',visual:'bump',suspicious:false,severe:false},
  {type:'desgaste',label:'Desgaste del cordoncillo',note:'El estriado o cordoncillo aparece parcialmente aplanado por desgaste y roce.',visual:'flattened',suspicious:false,severe:false}
 ]);
 if(hiddenDetails==='Bent')return {type:'doblez',label:'Canto deformado',note:'El canto presenta una ligera deformación o alabeo visible al girarlo.',visual:'bent',suspicious:true,severe:true};
 if(hiddenDetails==='Edge damage')return choice([
  {type:'limado',label:'Canto limado',note:'Aparecen zonas limadas con pérdida del relieve del canto y estrías longitudinales.',visual:'filed',suspicious:true,severe:true},
  {type:'recortado',label:'Canto recortado',note:'El perímetro muestra un recorte o mordida irregular compatible con cercén o recorte posterior.',visual:'clipped',suspicious:true,severe:true},
  {type:'rayado',label:'Muescas y rayas profundas',note:'Se observan rayas y muescas profundas, más intensas que el contacto normal.',visual:'deep_scratches',suspicious:true,severe:true},
  {type:'golpe_fuerte',label:'Golpe fuerte de canto',note:'Hay un impacto notable que deforma localmente el borde y altera el cordoncillo.',visual:'bump',suspicious:true,severe:true}
 ]);
 if(isFake && !subtleFake){
  if(fakeType==='chapada')return choice([
   {type:'union_recubrimiento',label:'Línea de recubrimiento',note:'Se aprecia una transición longitudinal compatible con recubrimiento o baño superficial.',visual:'seam',suspicious:true,severe:true},
   {type:'limado',label:'Canto limado',note:'El canto parece repasado con herramienta, con estrías repetidas y pérdida del perfil original.',visual:'filed',suspicious:true,severe:true}
  ]);
  if(fakeType==='periodo')return choice([
   {type:'recortado',label:'Canto recortado',note:'El perímetro tiene una mordida irregular o recorte compatible con manipulación posterior.',visual:'clipped',suspicious:true,severe:true},
   {type:'rayado',label:'Rayas profundas de canto',note:'Aparecen rayas profundas y zonas aplanadas impropias del desgaste ligero.',visual:'deep_scratches',suspicious:true,severe:true}
  ]);
  return choice([
   {type:'costura',label:'Costura o unión visible',note:'El canto muestra una línea o costura compatible con fabricación por molde o unión de partes.',visual:'seam',suspicious:true,severe:true},
   {type:'poroso',label:'Canto irregular y poroso',note:'El perfil del canto es irregular y áspero, con pérdida de nitidez impropia del acuñado limpio.',visual:'ragged',suspicious:true,severe:true}
  ]);
 }
 if(marks.includes('golpe_canto'))return {type:'golpe',label:'Golpe de canto',note:'Se aprecia un golpe visible en el borde de la pieza.',visual:'bump',suspicious:true,severe:true};
 if(marks.includes('doblado_sombra'))return {type:'doblez',label:'Canto deformado',note:'El borde presenta una ligera deformación compatible con pieza doblada.',visual:'bent',suspicious:true,severe:true};
 const incidentalChance=isHammeredCoin(c)?.22:(metalFamilia(c)==='cobre'?.17:.11);
 if(seededRandom()<incidentalChance)return randMinor();
 return {type:'normal',label:'Canto regular',note:c.edgeNote||'Inspección visual no concluyente por sí sola.',visual:'none',suspicious:false,severe:false};
}

function createAcousticProfile(c,variant){
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const raw=[c.id,variant.mass,variant.dia,variant.density,variant.fakeType,variant.hiddenDetails,variant.shader?.baseGrade].join('|');
 let h=2166136261;for(let i=0;i<raw.length;i++)h=Math.imul(h^raw.charCodeAt(i),16777619);
 const roll=(h>>>0)/4294967295;
 const metal=c.metal;
 const [expected,referenceHz]=sonidoMetal(c);
 let quality=expected+(roll-.5)*.28;
 if(variant.isFake){
  if(variant.fakeType==='chapada')quality-=variant.subtleFake?.02:.32;
  else if(variant.fakeType==='fundida')quality-=variant.subtleFake?.05:.35;
  else quality-=variant.subtleFake?.01:.14;
 }
 const damaged=['Bent','Holed','Repaired','Edge damage'].includes(variant.hiddenDetails);
 if(damaged)quality-=.18;
 if(variant.edgeProfile?.visual==='clipped'||variant.edgeProfile?.visual==='ragged')quality-=.08;
 if(isHammeredCoin(c))quality-=.07;
 const rho=Number(c.rho)||10,measured=Number(variant.density)||rho;
 const discrepancy=clamp(Math.abs(measured-rho)/Math.max(rho,1),0,.30);
 quality=clamp(quality-.22*discrepancy,.14,.96);
 const ratio=clamp((Number(c.mass)||10)/Math.max(Number(variant.mass)||10,.7),.65,1.45);
 const size=clamp(28/Math.max(15,Number(variant.dia)||28),.75,1.20);
 const hz=Math.round(clamp(referenceHz*Math.sqrt(ratio)*size*(.93+roll*.13),280,1250));
 const decay=Math.round((.13+quality*1.02)*100)/100;
 const brightness=clamp(.18+quality*.72,.25,.98);
 const dissonance=quality<.4||damaged&&roll>.45;
 const style=decay>.78?'clara':decay>.48?'moderada':'apagada';
 const label=style==='clara'?'Timbre claro · resonancia prolongada':style==='moderada'?'Timbre moderado · vibración breve':'Timbre apagado · vibración amortiguada';
 return {hz,decay,brightness,dissonance,style,label,referenceMetal:metal};
}

function generateVariant(c,isFake,isDetails=false){
 const fakeType=isFake?choice(['periodo','chapada','fundida']):'ninguna';
 const subtleFake=!!(isFake&&seededRandom()<.42);
 const faceDefects=[[],[]];
 const chopHosts=new Set(['8_reales_carlos_iv_mexico_1796','yen_meiji_22_1889','trade_dollar_1873s','8_reales_macuquina_Carlos_II','medio_real_carlos_iii_1765']);
 const hiddenDetails=isDetails
   ? (chopHosts.has(c.id)&&seededRandom()<.23?'Chopmarked':choice(DETAIL_OPTIONS))
   : '';
 for(let i=0;i<2;i++){
  const amount=randInt(0,2);
  for(let j=0;j<amount;j++){
   const mark=newDamage('rayas_finas');
   mark.opacity=random(.18,.38);mark.size=random(.17,.43);
   faceDefects[i].push(mark);
  }
 }
 if(hiddenDetails){
  const map={
   'Cleaned':'limpieza_paralela','Scratched':'rayas_cruzadas','Polished':'pulido_espejo','Environmental damage':`corrosion_${metalFamilia(c)}`,
   'Bent':'doblado_sombra','Edge damage':'golpe_canto','Chopmarked':'chopmark','Holed':'perforacion','Repaired':'reparacion','Graffiti':'graffiti','Corrosion':`corrosion_${metalFamilia(c)}`,'Altered surfaces':'alteracion_superficie'
  };
  faceDefects[randInt(0,1)].push(newDamage(map[hiddenDetails]||'rayas_finas', hiddenDetails==='Edge damage'||hiddenDetails==='Bent'||hiddenDetails==='Corrosion'));
 }
 if(!isFake){
  const naturalPoreChance=isHammeredCoin(c)?0.34:(metalFamilia(c)==='cobre'?0.19:0.055);
  if(seededRandom()<naturalPoreChance){
   const pore=newDamage('poros_fundicion');
   pore.size=random(.21,.42);pore.opacity=random(.24,.46);
   faceDefects[randInt(0,1)].push(pore);
   if(isHammeredCoin(c)&&seededRandom()<.24){
    const pore2=newDamage('poros_fundicion');pore2.size=random(.20,.39);pore2.opacity=random(.23,.41);
    faceDefects[randInt(0,1)].push(pore2);
   }
  }
 }
 if(isFake&&subtleFake){
  const clue=newDamage('poros_fundicion');
  clue.size=random(.22,.38);clue.opacity=random(.24,.42);
  faceDefects[randInt(0,1)].push(clue);
 }else if(isFake){
  if(fakeType==='chapada'){
   const crack=`grieta_bano_${metalFamilia(c)}`;
   faceDefects[randInt(0,1)].push(newDamage(crack,true));
   if(seededRandom()<.45)faceDefects[1].push(newDamage(crack,true));
   if(seededRandom()<.45)faceDefects[randInt(0,1)].push(newDamage('manchas_uv'));
  }else if(fakeType==='periodo'){
   for(const one of faceDefects)one.push(newDamage('poros_fundicion'));
   if(seededRandom()<.65)faceDefects[randInt(0,1)].push(newDamage('golpe_canto'));
  }else{
   faceDefects[randInt(0,1)].push(newDamage('poros_fundicion',true));
   if(seededRandom()<.65)faceDefects[randInt(0,1)].push(newDamage('manchas_uv'));
  }
 }
 const shader=makeShader(c,isFake,subtleFake);
 const mass=isFake?counterfeitMass(c,fakeType,subtleFake):genuineMass(c);
 const density=isFake?counterfeitDensity(c,fakeType,subtleFake):c.rho+random(isHammeredCoin(c)?-.28:-.12,isHammeredCoin(c)?.28:.12);
 const magnetChance=fakeType==='chapada'?.28:fakeType==='fundida'?.18:.08;
 const magneticMismatch=!!(isFake&&!subtleFake&&seededRandom()<magnetChance);
 const magnet=Boolean(c.attractedToMagnet)!==magneticMismatch;
 const xrfChance=subtleFake?.075:fakeType==='chapada'?.15:fakeType==='periodo'?.69:.82;
 const xrfAnomaly=!!(isFake&&seededRandom()<xrfChance);
 const genuineSurfaceInterference=!!(!isFake&&seededRandom()<.065);
 let xrf;
 if(xrfAnomaly)xrf='Se observa una desviación superficial de la composición esperada; contraste con peso, canto y microscopio.';
 else if(genuineSurfaceInterference)xrf='Trazas superficiales no uniformes; podrían proceder de pátina o contaminación. Resultado no concluyente.';
 else if(isFake&&fakeType==='chapada')xrf=`Superficie compatible con ${metalLabel(c).toLowerCase()}; el análisis superficial no descarta un núcleo distinto.`;
 else xrf=`Composición compatible con ${metalLabel(c).toLowerCase()} del tipo.`;
 const edgeProfile=createEdgeProfile(c,isFake,subtleFake,hiddenDetails,faceDefects,fakeType);
 const edgeIssue=!!(edgeProfile && edgeProfile.type!=='normal');
 const dia=measuredDiameter(c,isFake,fakeType,subtleFake);
 const variant={magnetExpected:Boolean(c.attractedToMagnet),fakeType,isFake,subtleFake,shader,defects:faceDefects,mass:Math.round(mass*1000)/1000,dia,density:Math.round(density*100)/100,magnet,xrf,baseGrade:shader.baseGrade||'',hiddenDetails,edgeIssue,edgeProfile,
 xrfEvidenceFace:randInt(0,1),xrfClueStrength:seededRandom(),xrfPatina:seededRandom()};
 const microRoll=seededRandom();
 variant.microEvidence=(isFake&&fakeType==='fundida'&&microRoll<.76)?'cast':
   (isFake&&fakeType==='chapada'&&microRoll<.65)?'plating':
   (!isFake&&microRoll<.035)?'ambiguous':'normal';
 variant.acoustic=createAcousticProfile(c,variant);
 if(c.ancient){
  // Selección uniforme de los cinco grados para que todos aparezcan durante la campaña.
  const target=randInt(1,5);
  const bounds={1:[9,10],2:[7,8],3:[5,6],4:[3,4],5:[0,2]};
  const [min,max]=bounds[target],magnitude=randInt(min,max);
  variant.dieOffsets=Array.from({length:2},()=>({x:randInt(-magnitude,magnitude),y:randInt(-magnitude,magnitude)}));
  const side=randInt(0,1),axis=randInt(0,1)?'x':'y';
  variant.dieOffsets[side][axis]=magnitude*(randInt(0,1)?1:-1);
 }

 variant.hiddenGrade=deriveHiddenGrade(c,variant);
 return variant;
}

function deriveHiddenGrade(c,variant){
 const defects=(variant.defects||[]).flat();
 const prominent=defects.filter(z=>z.opacity>.70&&z.size>.70).length;
 const serious=['limpieza_paralela','rayas_cruzadas','doblado_sombra','golpe_canto'].filter(t=>defects.some(z=>z.name===t));
 if(c.ancient){
  const wear=variant.shader?.grime||.1;
  const base=wear>.14?3:wear>.10?4:6;
  const idx=Math.max(0,Math.min(10,base+Math.min(2,Math.round((variant.shader?.lustre||.3)*2))-Math.min(2,prominent)));
  const maxOffset=Array.isArray(variant.dieOffsets)?Math.max(...variant.dieOffsets.map(v=>Math.max(Math.abs(v.x),Math.abs(v.y)))):null;
  const strike=maxOffset===null?Math.max(1,Math.min(5,5-Math.min(3,prominent))):Math.max(1,5-Math.floor(Math.max(0,maxOffset-1)/2));
  const surface=Math.max(1,Math.min(5,5-Math.min(3,serious.length+(defects.some(z=>z.name.startsWith('corrosion')||z.name==='poros_fundicion')?1:0))));
  return {grade:ANCIENT_GRADE_NAMES[idx],strike,surface,notes:'Grado de antigua estimado según relieve, superficie y huellas visibles (modelo de juego).'};
 }
 const baseLabel=variant.shader?.baseGrade||'AU55';
 const raw=Number(baseLabel.match(/(\d{1,2})\+?$/)?.[1]||55);
 const downgrade=Math.min(5,Math.max(0,prominent+Math.floor(serious.length/2)));
 const candidate=Math.max(1,Math.min(70,raw-downgrade));
 const allowed=[1,2,3,4,6,8,10,12,15,20,25,30,35,40,45,50,53,55,58,...Array.from({length:11},(_,i)=>i+60)];
 const score=allowed.reduce((best,n)=>Math.abs(n-candidate)<Math.abs(best-candidate)?n:best,allowed[0]);
 const prefix=score>=60?'MS':score>=50?'AU':score>=40?'XF':score>=20?'VF':score>=12?'F':score>=8?'VG':score>=4?'G':score===3?'AG':score===2?'FR':'PO';
 return {grade:prefix+String(score).padStart(2,'0'),strike:null,surface:null,notes:'Referencia simulada que combina banda de circulación, lustre visual y defectos dibujados.'};
}

function gradeNumber(value,ancient){
 if(ancient)return ANCIENT_GRADE_NAMES.indexOf(value);
 let match=String(value||'').match(/(\d{1,2})\+?$/);return match?Number(match[1]):NaN;
}

function sheldonWindow(grade){
 const n=gradeNumber(grade,false);
 if(!Number.isFinite(n)||n<1||n>70)return null;
 return n>=60
  ? {low:Math.max(55,n-8),high:Math.min(70,n+5),chosen:n}
  : {low:Math.max(1,n-10),high:Math.min(70,n+10),chosen:n};
}
function sheldonGradeLabel(n,edge='exact'){
 const grades=[1,2,3,4,6,8,10,12,15,20,25,30,35,40,45,50,53,55,58,...Array.from({length:11},(_,i)=>60+i)];
 if(edge==='lower')n=grades.find(x=>x>=n)??70;
 if(edge==='upper')n=[...grades].reverse().find(x=>x<=n)??1;
 const prefix=n>=60?'MS':n>=50?'AU':n>=40?'XF':n>=20?'VF':n>=12?'F':n>=8?'VG':n>=4?'G':n===3?'AG':n===2?'FR':'PO';
 return prefix+String(n).padStart(2,'0');
}
function assessGrade(c,report){
 const ref=report.variant.hiddenGrade||deriveHiddenGrade(c,report.variant);
 if(report.auth!=='real'||report.variant.isFake)return {deltaRep:0,deltaMoney:0,text:'No se puntúa grado en piezas rechazadas o falsificaciones.'};
 const ancient=!!c.ancient;
 const n=gradeNumber(report.grade,ancient),v=gradeNumber(ref.grade,ancient);
 const difference=Math.abs(n-v);
 const window=ancient?null:sheldonWindow(report.grade);
 let deltaRep=0,deltaMoney=0,label='',withinMargin=false,excess=0;
 if(!Number.isFinite(difference)||(!ancient&&!window)||(!ancient&&(v<1||v>70))){
  deltaRep=-5;deltaMoney=-25;label='Grado no comparable';
 }else if(ancient){
  const bracket=GRADE_BANDS.find(b=>difference<=b.limit);
  deltaRep=bracket.rep;deltaMoney=bracket.money;
  const direction=n>v?'sobrevaloración':n<v?'infravaloración':'acierto';
  label=`${bracket.label} · ${direction} de ${difference} niveles`;
 }else{
  excess=Math.max(0,window.low-v,v-window.high);
  withinMargin=excess===0;
  const range=`${sheldonGradeLabel(window.low,'lower')}–${sheldonGradeLabel(window.high,'upper')}`;
  if(withinMargin){
   if(difference<=1){deltaRep=2;deltaMoney=12;label='Grado muy preciso';}
   else if(difference<=2){deltaRep=1;deltaMoney=5;label='Buena aproximación';}
   else {label='Dentro del margen aceptable';}
   label+=` · diferencia de ${difference} puntos · margen ${range}`;
  }else{
   const direction=n>v?'sobrevaloración':'infravaloración';
   if(excess<=2){deltaRep=-1;deltaMoney=-5;}
   else if(excess<=4){deltaRep=-2;deltaMoney=-10;}
   else if(excess<=7){deltaRep=-4;deltaMoney=-22;}
   else if(excess<=11){deltaRep=-7;deltaMoney=-45;}
   else {deltaRep=-11;deltaMoney=-80;}
   label=`${excess>11?'Fallo grave en el grado':excess>4?'Desajuste importante':'Fuera del margen'} · ${direction} de ${difference} puntos · margen ${range} (exceso: ${excess})`;
  }
  const submitted=String(report.grade||'');const reference=String(ref.grade||'');
  if(/^(PF|SP)/.test(submitted)&&!reference.startsWith(submitted.slice(0,2))){
   deltaRep-=3;deltaMoney-=20;label+=' · designación PF/SP no corroborada';
  }
 }
 const realDetails=String(report.variant.hiddenDetails||'').trim();
 const chosenDetails=String(report.details||'').trim();
 if(realDetails&&!chosenDetails){deltaRep-=3;deltaMoney-=18;label+=' · Details grave no declarado';}
 else if(!realDetails&&chosenDetails){deltaRep-=2;deltaMoney-=12;label+=' · Details sin fundamento';}
 else if(realDetails&&chosenDetails&&realDetails!==chosenDetails){deltaRep-=1;deltaMoney-=6;label+=' · tipo de Details impreciso';}
 else if(realDetails&&chosenDetails===realDetails){deltaRep++;label+=' · Details identificado';}
 if(ancient&&report.strike&&report.surface){
  const diff=Math.abs(Number(report.strike)-ref.strike)+Math.abs(Number(report.surface)-ref.surface);
  if(diff===0){deltaRep++;deltaMoney+=4;label+='; Strike y Surface exactos';}
  else if(diff>=4){deltaRep--;label+='; Strike/Surface poco ajustados';}
 }
 return {deltaRep,deltaMoney,difference,withinMargin,excess,marginLow:window?.low??null,marginHigh:window?.high??null,reference:ref.grade,referenceStrike:ref.strike,referenceSurface:ref.surface,text:label};
}

function scheduleDetails(count){
 return Array.from({length:count},()=>seededRandom()<DETAILS_RATE);
}

function microscopeSurfaceObservation(){
 const d=Number(active?.variant?.shader?.contactDensity??.35);
 if(d>.71)return 'Contactos frecuentes en campos; no equivalen por sí solos a Details';
 if(d>.42)return 'Contactos aislados de circulación o manipulación; examina lustre y desgaste';
 return 'Pocos contactos aparentes en esta zona; comprueba ambas caras';
}

function xrfResultForFace(v,c,side){
 const exactSide=side===(v.xrfEvidenceFace??0);
 const strength=Number.isFinite(v.xrfClueStrength)?v.xrfClueStrength:.47;
 const upgraded=hasUpgrade('xrf'); // La calibración mejora ambas caras; sigue siendo XRF superficial.
 if(v.isFake){
   if(exactSide && strength<(upgraded?.62:.36)){
     return upgraded?'Señal anómala localizada en la capa superficial; posible baño, aleación o retoque. Contrasta con peso, canto y microscopio.':'Discontinuidad ligera en la composición superficial. Resultado sospechoso, no concluyente.';
   }
   if(!exactSide && strength<.14 && upgraded){
     return 'Diferencias débiles de composición superficial; necesitan confirmar con examen físico.';
   }
   return `Superficie compatible con ${metalLabel(c).toLowerCase()} del tipo; no se descarta un núcleo distinto ni una falsa de época.`;
 }
 if(exactSide && (v.xrfPatina??1)<.10){
   return 'Lectura superficial irregular compatible con pátina, contaminación o heterogeneidad. No prueba falsedad.';
 }
 return `Composición superficial compatible con ${metalLabel(c).toLowerCase()} del tipo. No prueba autenticidad.`;
}

function diagnosticDebrief(c,variant){
 const v=variant;
 const grams=n=>`${n>=0?'+':'−'}${Math.abs(n).toFixed(3)} g`;
 const mm=n=>`${n>=0?'+':'−'}${Math.abs(n).toFixed(1)} mm`;
 const shiftMass=Number(v.mass)-Number(c.mass);
 const shiftDia=Number(v.dia)-Number(c.diameter);
 const abnormalXRF=String(v.xrf||'').includes('desviación superficial');
 const pores=v.defects?.flat().filter(d=>d.name==='poros_fundicion').length||0;
 const cracks=v.defects?.flat().some(d=>String(d.name).startsWith('grieta_bano_'))||false;
 const massOutside=Math.abs(shiftMass)>(isHammeredCoin(c)?Number(c.mass)*hammeredWeightTolerance(c):.09);
 const diameterOutside=Math.abs(shiftDia)>(isHammeredCoin(c)?1:.42);
 const densityDelta=Number(v.density)-Number(c.rho);
 const densityOutside=Math.abs(densityDelta)>(isHammeredCoin(c)?.34:.22);
 const edge=v.edgeProfile||{type:'normal',label:'Canto regular',note:c.edgeNote||'Inspección visual no concluyente por sí sola.'};
 const signals=[];
 const how=[];
 const hints=[];
 if(massOutside){signals.push('peso fuera de tolerancia');how.push(`Balanza: desviación de ${grams(shiftMass)} frente a la referencia.`);}
 if(diameterOutside){signals.push('módulo atípico');how.push(`Calibre: diámetro ${Number(v.dia).toFixed(1)} mm (${mm(shiftDia)} respecto al tipo).`);}
 if(densityOutside){signals.push('densidad desviada');how.push(`Densidad: ${Number(v.density).toFixed(2)} g/cm³ frente a ${Number(c.rho).toFixed(2)} g/cm³ del tipo.`);}
 if(Boolean(v.magnet)!==Boolean(v.magnetExpected)){
  signals.push(v.magnet?'atracción magnética inesperada':'ausencia de atracción esperada');
  how.push(v.magnet?'Imán: la atracción se aparta de la respuesta esperada en el expediente.':'Imán: el tipo es de níquel y se esperaba atracción.');
 }else if(v.magnetExpected){
  how.push('Imán: la atracción es compatible con el níquel del tipo.');
 }
 if(abnormalXRF){signals.push('XRF superficial anómalo');how.push('XRF: apareció una desviación superficial que debía contrastarse con otras pruebas.');}
 if(cracks){signals.push('grieta del recubrimiento');how.push('Microscopio / vista: se podía ver una grieta o transición del baño superficial.');}
 if(v.microEvidence==='cast'){signals.push('microtextura de colada');how.push('Microscopio: textura compatible con fundición o porosidad anómala.');}
 if(v.microEvidence==='plating'){signals.push('indicio metalográfico de recubrimiento');how.push('Microscopio: límite o comportamiento superficial compatible con pieza recubierta.');}
 if(edge && edge.type!=='normal'){
  signals.push(`incidencia de canto: ${edge.label.toLowerCase()}`);
  how.push(`Canto: ${edge.note}`);
 }
 const resonance=v.acoustic||createAcousticProfile(c,v);
 if(v.isFake && resonance.style==='apagada'){
   signals.push('resonancia más apagada de lo esperable');
   how.push('Toque: el timbre breve o amortiguado podía orientar la sospecha, pero también ocurre en monedas auténticas dañadas.');
 }else if(v.isFake){
   hints.push('La prueba de resonancia podía resultar convincente incluso siendo falsa. El sonido no era una prueba concluyente.');
 }else if(resonance.style==='apagada'){
   hints.push('Su resonancia era apagada pese a ser auténtica; el desgaste y las alteraciones también modifican el sonido.');
 }
 if(pores && !v.isFake)hints.push('La microporosidad por sí sola no condena una auténtica, sobre todo en piezas antiguas o corroídas.');
 if(v.isFake && v.subtleFake)hints.push('Era una falsa camuflada: podía superar varias pruebas y no tenía una señal única definitiva.');
 if(v.isFake && !signals.length)hints.push('No había una pista aislada inequívoca; el juego buscaba que contrastaras varias lecturas antes de certificar.');
 if(!v.isFake && !signals.length)hints.push('Las lecturas eran compatibles con autenticidad: el juego espera prudencia y contraste, no buscar un defecto inexistente.');
 let explanation;
 if(v.isFake){
  const kinds={
   periodo:'Falsa de época simulada: puede ser históricamente plausible en metal, peso o estilo.',
   chapada:'Falsificación revestida simulada: la superficie puede parecer correcta y ocultar un núcleo distinto.',
   fundida:'Falsificación por fundición simulada: suele delatarse mejor por textura, borde o microrelieve que por una sola medida.'
  };
  explanation=(kinds[v.fakeType]||'Falsificación simulada.')+
   (v.subtleFake?' En este expediente estaba intencionadamente disimulada.':'')+
   (signals.length?` Los indicios más útiles eran: ${signals.slice(0,5).join('; ')}.`:' No tenía un único detector automático.');
 }else{
  explanation='Auténtica en esta partida. Las variaciones de masa, diámetro, pátina o textura no implican falsedad por sí solas.'+
   (abnormalXRF?' La lectura de XRF exigía contraste, no bastaba para condenarla.':'')+
   (pores?' Incluso podía mostrar microporos o superficie alterada sin dejar de ser auténtica.':'');
 }
 if(!how.length){
  how.push(v.isFake
   ?'No había una pista mecánica definitiva: la lección es no confiar en una sola lectura “bonita” ni en un único resultado normal.'
   :'No hacía falta detectar un defecto concreto: bastaba con no sobreinterpretar una lectura aislada.');
 }
 const measurements=`Peso ${Number(v.mass).toFixed(3)} g (ref. ${Number(c.mass).toFixed(2)} g; ${grams(shiftMass)}). `+
  `Diámetro ${Number(v.dia).toFixed(1)} mm (ref. ${Number(c.diameter).toFixed(1)} mm; ${mm(shiftDia)}). `+
  `Densidad ${Number(v.density).toFixed(2)} g/cm³ (ref. ${Number(c.rho).toFixed(2)}; ${densityDelta>=0?'+':'−'}${Math.abs(densityDelta).toFixed(2)}). `+
  `Imán: ${v.magnet?'atracción':'sin atracción'}. XRF: ${String(v.xrf||'no registrado').trim().replace(/[.\s]+$/g,'')}. `+
  `Canto: ${edge.label||'sin novedad'}${edge.note?` — ${edge.note}`:''}. `+
  `Resonancia simulada: ${resonance.label} (${resonance.hz} Hz, amortiguamiento ${resonance.decay} s). La resonancia no certifica autenticidad.`;
 return {explanation,measurements,howToDetect:how.join(' '),takeaway:hints.join(' ')};
}

function debriefHTML(learning){
 return `<section class="ncg-learning" aria-label="Explicación del dictamen"><div class="ncg-learning__head">¿Qué revela este expediente?</div><p>${esc(learning.explanation)}</p><p><b>Cómo se podía sospechar:</b> ${esc(learning.howToDetect||'No había una pista única; hacía falta contrastar varias pruebas.')}</p>${learning.takeaway?`<p><b>Lección de esta pieza:</b> ${esc(learning.takeaway)}</p>`:''}<details><summary>Ver mediciones y pistas completas</summary><p>${esc(learning.measurements)}</p><p class="ncg-learning__caution">Valores simulados de la partida, revelados después de firmar. No equivalen a un certificado ni sirven como límites universales de autenticidad.</p></details></section>`;
}

function calculatePeritaje(c,report,approved,previousReviews=0){
 const wasFake=!!report.variant.isFake;
 const falseApproved=!!(approved&&wasFake);
 const missedAncient=!!(c?.ancient&&!wasFake&&report.auth==='fake');
 let change=0,repChange=0,judgment='';
 const caseTier=coinAccessLevel(c);
 if(falseApproved){
  const highValue=c?.metal==='oro'&&Number(c?.mass)>=6?85:0;
  const risk=caseTier>=225?190:caseTier>=165?130:caseTier>=95?70:0;
  change=-(240+risk+highValue);repChange=-(12+(caseTier>=95?4:0)+(caseTier>=225?3:0));
  judgment='ERROR: falsificación aprobada · indemnización '+(-change)+' €';
 }
 else if(report.auth==='real'){change=caseTier>=225?88:caseTier>=140?66:caseTier>=95?52:38;repChange=caseTier>=165?3:2;judgment='Certificada con el grado elegido por ti';}
 else if(report.auth==='fake'&&wasFake){change=18;repChange=2;judgment='Falsificación rechazada correctamente';}
 else if(missedAncient){change=-50;repChange=-7;judgment='ERROR: antigua auténtica rechazada como falsa';}
 else if(report.auth==='fake'){change=-20;repChange=-3;judgment='ERROR: auténtica moderna rechazada como falsa';}
 else {change=-12;repChange=-1;judgment='Expediente derivado a revisión: tasa de gestión';}
 const reviewCount=previousReviews+(report.auth==='review'?1:0);
 if(report.auth==='review'){
  const surcharge=Math.min(32,(reviewCount-1)*8);
  change-=surcharge;
  repChange-=Math.min(4,reviewCount-1);
  if(surcharge)judgment+=` (recargo por ${reviewCount} revisiones)`;
 }
 const quality=assessGrade(c,report);
 if(report.institutional){
  const tier=institutionalTier(Number(report.clientReputation)||0);
  if(tier){
   if(falseApproved){change-=Math.round(tier.bonus*2);repChange-=4;judgment+=' · responsabilidad institucional';}
   else if(report.auth==='real'&&!wasFake&&quality.difference<=2){change+=tier.bonus;repChange+=1;judgment+=' · informe institucional';}
   else if(report.auth==='fake'&&wasFake){change+=Math.round(tier.bonus*.6);repChange+=1;judgment+=' · falsificación detectada para institución';}
   else if(report.auth==='fake'&&!wasFake){change-=Math.round(tier.bonus*.7);repChange-=2;judgment+=' · rechazo institucional injustificado';}
  }
 }
 const labFee=report.auth==='real'&&!wasFake&&report.readings?.xrf0&&report.readings?.xrf1?LABORATORY_FEE:0;
 if(report.auth==='real'&&!wasFake){change+=quality.deltaMoney+labFee;repChange+=quality.deltaRep;judgment+=' · '+quality.text;if(labFee)judgment+=' · laboratorio completo';}
 return {change,repChange,judgment,quality,reviewCount,missedAncient,falseApproved,wasFake,labFee};
}

