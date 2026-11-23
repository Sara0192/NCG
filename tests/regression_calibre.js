const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

class FakeElement{
 constructor(){
  this.style={};this.dataset={step:'medir'};this.textContent='';this.innerHTML='';this.children=[];
  this.classList={add(){},remove(){}};
 }
 querySelector(selector){
  if(selector==='h3')return this.heading||(this.heading=new FakeElement());
  if(selector==='p')return this.paragraph||(this.paragraph=new FakeElement());
  if(selector==='div')return this.actions||(this.actions=new FakeElement());
  return null;
 }
 append(...items){this.children.push(...items);}
 before(){}
}

const elements={
 jawLeft:new FakeElement(),jawRight:new FakeElement(),caliperValue:new FakeElement(),
 caliperInfo:new FakeElement(),deskHelp:new FakeElement(),ncgFirstTutorial:new FakeElement(),fileCard:new FakeElement()
};
const target=new FakeElement();
const context={
 CALIPER_MAX:42,CALIPER_MIN:5,CALIPER_STEP:.5,COIN_VISIBLE_RATIO:.927,
 active:{variant:{dia:25.3},readings:{mass:'12.34 g'}},
 session:{tutorialStep:'medir',day:1,index:0},tool:'caliper',
 currentCoin:()=>({diameter:25}),
 $(id){return elements[id]||null;},
 document:{
  getElementById:id=>elements[id]||null,
  querySelector:selector=>selector==='.ncg-tutorial-target'?null:target,
  createElement:()=>new FakeElement()
 },
 minimumExamStatus(){
  const readings=context.active.readings;
  return {mass:!!readings.mass,dia:!!readings.dia,extra:false,ready:false};
 },
 renderReadings(){},refreshMinimumExamUI(){},addLog(){},saveSession(){}
};
vm.createContext(context);
const root=__dirname+'/../resources/js/';
for(const file of ['medicion.js','tutorial_inicio.js','calibre.js']){
 vm.runInContext(fs.readFileSync(root+file,'utf8'),context,{filename:file});
}
context.markCaliper();
assert.equal(context.active.readings.dia,'25.5 mm','Debe registrar el diámetro automático a la precisión de la escala.');
assert.equal(context.session.tutorialStep,'prueba','Registrar debe avanzar del paso medir al paso prueba.');
assert.equal(elements.caliperValue.textContent,'25.5 mm');
assert.equal(elements.caliperInfo.textContent,'Lectura registrada: 25.5 mm.');
assert.equal(typeof context.nudgeCaliper,'undefined','No debe existir ajuste manual por teclas.');
assert.equal(typeof context.moveCaliperJaw,'undefined','No debe existir movimiento manual de mordazas.');
console.log('Calibre automático OK: lectura guardada y tutorial avanzado.');
