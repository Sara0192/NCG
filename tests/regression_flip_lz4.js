'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const flipSource=fs.readFileSync('resources/js/interfaz.js','utf8');
const start=flipSource.indexOf('const COIN_FLIP_COOLDOWN_MS=1000;');
const end=flipSource.indexOf('let rakingFrame=0;',start);
const labels={faceIndicator:{textContent:''}};
let now=300,save=0,update=0,draw=0;
const context={performance:{now:()=>now},session:{tutorialStep:'pesar'},face:0,$:id=>labels[id],drawCoin(){draw++},saveSession(){save++},updateTutorial(){update++},playSfx(){},addLog(){}};
vm.createContext(context);vm.runInContext(flipSource.slice(start,end),context);
assert.equal(context.flip(),true); // First flip
assert.equal(context.flip(),false); // Throttled normal flip
context.session.tutorialStep='girar';now+=100;
assert.equal(context.flip(),true,'El gesto F debe aceptarse durante el tutorial aunque el cooldown siga activo');
assert.equal(context.session.tutorialStep,'pesar','El tutorial debe avanzar');
assert.equal(save,1);assert.equal(update,1);assert.equal(draw,2);
const src=fs.readFileSync('resources/js/trazos.js','utf8');
vm.runInContext(src,context);
const b64=bytes=>Buffer.from(bytes).toString('base64');
context.atob=b64=>Buffer.from(b64,'base64').toString('binary');
assert.throws(()=>context.bloqueNCG(b64([0x00,0x01]),4),/desplazamiento LZ4 truncado/);
assert.throws(()=>context.bloqueNCG(b64([0x10,0x20,0x01]),5),/desplazamiento LZ4 truncado/);
assert.equal(context.bloqueNCG(b64([0x30,0x41,0x42,0x43]),3).length,3);
console.log('FLIP + LZ4 OK: tutorial no bloqueado y límites del desplazamiento comprobados.');
