#!/usr/bin/env node
'use strict';

// Pruebas aisladas de regresión: cierre de jornada, Escape y salto debug.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
let passed = 0;
function check(condition, message) {
  if (!condition) throw new Error(message);
  passed++;
}
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`No se encuentra ${name}()`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', template = false, escape = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (quote) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '`') { template = !template; continue; }
    if (template) {
      if (ch === '\\') { i++; continue; }
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`No se pudo extraer ${name}()`);
}

function debugHarness({day=1, index=0, count=3}={}) {
  const calls = {open:0,end:0,finale:0,main:0,completed:0};
  const cases = Array.from({length:count}, (_,i)=>({id:`coin-${i+1}`,draft:{notes:'test'}}));
  const context = {
    window: {confirm:()=>true, NCGGraphics:{refresh(){}}},
    document: {getElementById:()=>null},
    session: {day,index,cases,finished:false,money:1000,reputation:50,seed:'TEST',upgrades:{},campaignId:'C-TEST'},
    sessionReady:true,
    active:{id:'coin-current'},
    history:[], dayBook:{schema:1,campaignId:'C-TEST',days:{}},
    coins:Array.from({length:129},(_,i)=>({id:`coin-${i+1}`,name:`Coin ${i+1}`})),
    CAMPAIGN_LENGTH:30,
    saveSession:()=>true, saveDayBook:()=>true,
    markDayCompleted(){calls.completed++;},
    isMenuVisible:()=>false, closeCampaignMenu(){},
    openCase(){calls.open++;},
    showEndDay(){calls.end++;}, showCampaignFinale(){calls.finale++;}, showMainMenu(){calls.main++;},
    NCGLog:{event(){},error(){}},
    nextDayOverhead:()=>95, makeNextSession:()=>null, isCompatibleSession:()=>true,
    WORKSHOP_ITEMS:[], renderCaseTop(){}, renderReadings(){}, refreshMinimumExamUI(){},
    exportFullBackup(){},
    console
  };
  vm.createContext(context);
  vm.runInContext(read('resources/js/debug_mode.js'), context, {filename:'debug_mode.js'});
  context.window.NCGDev.unlock('PASSWORD');
  return {context,calls};
}

// Debug command skips exactly one coin by default and preserves the old alias.
{
  const {context,calls}=debugHarness({day:2,index:0,count:4});
  context.window.NCGDev.execute('saltar');
  check(context.session.index===1,'saltar debe omitir exactamente una moneda');
  check(calls.open===1,'tras saltar una moneda debe abrir el siguiente expediente');
  check(calls.end===0,'no debe cerrar la jornada antes de tiempo');
}
{
  const {context,calls}=debugHarness({day:2,index:1,count:4});
  context.window.NCGDev.execute('saltar 2');
  check(context.session.index===3,'saltar 2 debe omitir dos monedas');
  check(calls.open===1,'saltar 2 debe abrir el siguiente expediente');
}
{
  const {context,calls}=debugHarness({day:2,index:2,count:3});
  context.window.NCGDev.execute('caso');
  check(context.session.index===3,'caso debe seguir siendo alias de saltar 1');
  check(calls.completed===1,'la última moneda omitida debe marcar el día completado');
  check(calls.end===1&&calls.main===0,'la última moneda debe mostrar resumen, no menú muerto');
}
{
  const {context,calls}=debugHarness({day:30,index:2,count:3});
  context.window.NCGDev.execute('saltar 1');
  check(calls.finale===1&&calls.end===0,'la última moneda del día 30 debe mostrar el final de campaña');
}
{
  const {context,calls}=debugHarness({day:5,index:3,count:3});
  context.window.NCGDev.execute('saltar');
  check(calls.end===1,'saltar cuando ya no hay monedas debe recuperar el resumen en lugar de dejar la pantalla bloqueada');
}
{
  const {context}=debugHarness({day:2,index:0,count:4});
  context.window.NCGDev.execute('saltar 17');
  check(context.session.index===0,'un salto fuera de rango no debe modificar la sesión');
}

// hideModal must route away from the inert last coin after closing the day summary.
{
  const source=read('resources/js/interfaz.js');
  const fn=extractFunction(source,'hideModal');
  const calls={main:0,end:0,finale:0};
  let completedReport=false;
  const context={
    $:id=>id==='modalBox'?{querySelector:()=> (completedReport ? {id:'nextCaseBtn'} : null)}:({classList:{remove(){}}}),
    window:{NCGGraphics:{refresh(){}}},
    session:{day:4,index:2,cases:[{},{}],finished:true},active:{id:'coin'},CAMPAIGN_LENGTH:30,
    isMenuVisible:()=>false,
    showMainMenu(){calls.main++;},showEndDay(){calls.end++;},showCampaignFinale(){calls.finale++;},
    NCGLog:{error(){}},notify(){}
  };
  vm.createContext(context);
  vm.runInContext(fn,context);
  context.hideModal();
  check(calls.main===1&&context.active===null,'cerrar el resumen debe volver al menú y limpiar moneda inactiva');
  completedReport=true;
  context.hideModal();
  check(calls.end===1,'cerrar un dictamen completo debe abrir el resumen');
  context.session.day=30;
  context.hideModal();
  check(calls.finale===1,'cerrar el último dictamen debe abrir el final de campaña');
  context.session.day=4;
  context.hideModal({returnToMenu:false});
  check(calls.main===1,'la acción de iniciar la siguiente jornada no debe abrir el menú antes de tiempo');
}

// Escape must return to a safe screen rather than leave the player stranded.
{
  const source=read('resources/js/juego.js');
  const fn=extractFunction(source,'handleCabinetKey');
  const calls={main:0,end:0,finale:0,open:0,closeMenu:0};
  let menu=false, view='game', modal=false;
  const context={
    $:id=>({classList:{contains:()=>modal}}),
    isMenuVisible:()=>menu, menuView:view,
    session:{day:3,index:0,cases:[{},{}]},active:{id:'coin'},tool:'view',
    showMainMenu(){calls.main++;},showEndDay(){calls.end++;},showCampaignFinale(){calls.finale++;},
    closeCampaignMenu(){menu=false;calls.closeMenu++;},openCase(){calls.open++;},
    selectTool(){},resetRandomSeedByKey(){},flip(){},nudgeCaliper(){},updateCaliper(){},updateEdgeStrip(){},
    CAMPAIGN_LENGTH:30,
    document:{},
  };
  vm.createContext(context);
  vm.runInContext(fn,context);
  const event=()=>({key:'Escape',repeat:false,ctrlKey:false,altKey:false,metaKey:false,defaultPrevented:false,target:{closest:()=>null},preventDefault(){this.prevented=true;}});
  context.handleCabinetKey(event());
  check(calls.main===1,'Escape en la mesa debe abrir el menú');
  menu=true;view='days';context.menuView='days';
  context.handleCabinetKey(event());
  check(calls.main===2,'Escape en calendario debe volver al menú principal');
  menu=true;view='home';context.menuView='home';context.session.index=2;
  context.handleCabinetKey(event());
  check(calls.end===1&&calls.closeMenu===1,'Escape desde menú con jornada completa debe abrir el resumen');
}

console.log(`REGRESIONES DE JORNADA OK: ${passed} comprobaciones.`);
