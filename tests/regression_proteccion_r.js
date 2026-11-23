'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('resources/js/juego.js','utf8');
const keySection=source.slice(source.indexOf('function handleCabinetKey(e){'),source.indexOf("window.addEventListener('resize'",source.indexOf('function handleCabinetKey(e){')));
const resetSection=source.slice(source.indexOf('const RANDOM_RESET_COOLDOWN_MS=1000;'),source.indexOf('function replaySeedPrompt(){',source.indexOf('const RANDOM_RESET_COOLDOWN_MS=1000;')));
const state={clock:10_000,menu:false,settings:false,modal:false,destructive:0,backup:0,session:{campaignId:'original',tutorialStep:'',day:3},active:{id:'coin'},stored:'original-data',lastModal:'',elements:{}};
function element(id){return state.elements[id]??={id,checked:false,disabled:id==='ncgResetConfirm',handlers:{},classList:{contains:(x)=>x==='show'&&state.modal},addEventListener(name,fn){this.handlers[name]=fn;},focus(){},click(){if(!this.disabled)this.handlers.click?.();}};}
const document={getElementById:(id)=>id==='ncgQolOverlay'?{hidden:!state.settings}:element(id)};
const context={
  window:{NCGDesktop:{native:false,resetProgress:async()=>{state.destructive++;state.stored=null;},flush:async()=>true},NCGQoL:{close(){}},NCGGuides:{close(){}}},
  Date:{now:()=>state.clock},document,$:element,sessionReady:true,changingDay:false,
  get active(){return state.active;}, set active(value){state.active=value;},
  get session(){return state.session;}, set session(value){state.session=value;},
  get history(){return state.history??[];},set history(v){state.history=v;},
  get dayBook(){return state.dayBook??null;},set dayBook(v){state.dayBook=v;},
  get historyPage(){return state.historyPage??0;},set historyPage(v){state.historyPage=v;},
  get historyFilter(){return state.historyFilter??'all';},set historyFilter(v){state.historyFilter=v;},
  get historyQuery(){return state.historyQuery??'';},set historyQuery(v){state.historyQuery=v;},
  get draftTimer(){return null;},set draftTimer(v){},
  get menuView(){return 'home';},
  isMenuVisible:()=>state.menu,
  showModal(html){state.modal=true;state.lastModal=html;state.elements={};for(const [,id] of html.matchAll(/id="([^"]+)"/g))element(id);},
  hideModal(){state.modal=false;},
  closeCampaignMenu(){state.menu=false;}, finishTutorial(){},
  makeSession(){return {campaignId:'new-'+(state.destructive),day:1,index:0};},
  resetCampaignForNewSession(){},
  saveHistory:()=>true,saveSession:()=>true,openCase(){},showStoryIntro(){},
  exportFullBackup(){state.backup++;},
  NCGLog:{error(e){throw e;}},
  clearTimeout(){},
  isMenuVisibleFn:null,
  console,
};
vm.createContext(context);
vm.runInContext(resetSection+'\n'+keySection,context);
function press(key,target){let prevented=false;const e={key,repeat:false,ctrlKey:false,altKey:false,metaKey:false,defaultPrevented:false,target:target??{closest:()=>null},preventDefault(){prevented=true;}};context.handleCabinetKey(e);return prevented;}
const select={tagName:'SELECT',id:'gradeSel',closest:()=>({tagName:'SELECT',id:'gradeSel'})};
press('r',select);
assert.equal(state.modal,false,'R no debe actuar sobre un select');
state.menu=true;press('r');assert.equal(state.modal,false,'R no debe actuar en menú');state.menu=false;
state.settings=true;press('r');assert.equal(state.modal,false,'R no debe actuar con ajustes');state.settings=false;
press('r');assert.equal(state.destructive,0,'Un toque R NO puede borrar la partida');
assert(state.modal,'La primera R válida debe abrir confirmación');
assert.match(state.lastModal,/borrar TODA la campaña/i);
assert.match(state.lastModal,/autocopias nativas/i);
assert(element('ncgResetConfirm').disabled,'Confirmación de borrado comienza bloqueada');
press('r');assert.equal(state.destructive,0,'R en diálogo no puede borrar la partida');
element('ncgResetConfirm').click();assert.equal(state.destructive,0,'No permitir aceptar sin casilla');
element('ncgResetExport').click();assert.equal(state.backup,1,'Ofrecer exportación del backup');assert.equal(state.destructive,0);
element('ncgResetCancel').click();assert.equal(state.modal,false,'Cancelar debe cerrar');
assert.equal(state.stored,'original-data','Cancelar no puede modificar guardados');
state.clock+=1000;press('r');assert(state.modal);
const agree=element('ncgResetAcknowledge');agree.checked=true;agree.handlers.change();
assert.equal(element('ncgResetConfirm').disabled,false);
element('ncgResetConfirm').click();
setImmediate(()=>{
 assert.equal(state.destructive,1,'Solo confirmación expresa dispara resetProgress');
 assert.equal(state.session.day,1);assert.equal(state.stored,null);
 console.log('SEGURIDAD R OK: menú, ajustes, select, R accidental, cancelación, respaldo y borrado confirmado.');
});
