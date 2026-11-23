'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

// SFX: verify the public API, volume persistence and all newly added event families.
let clock=1000;
class Param{constructor(){this.value=0;}setValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}}
class Node{constructor(){this.gain=new Param();this.frequency=new Param();this.Q=new Param();this.threshold=new Param();this.knee=new Param();this.ratio=new Param();this.attack=new Param();this.release=new Param();this.type='';this.loop=false;this.sampleRate=44100;}connect(){}start(){}stop(){}setValueAtTime(v){this.value=v;}}
class FakeContext{constructor(){this.currentTime=0;this.sampleRate=44100;this.state='running';this.destination={};}createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createOscillator(){return new Node();}createBuffer(){return {getChannelData:()=>new Float32Array(32)};}createBufferSource(){return new Node();}createBiquadFilter(){return new Node();}resume(){return Promise.resolve();}}
const storage=new Map([['ncg_v16_sfx_volume','0.58']]);
const sfxWindow={AudioContext:FakeContext,NCGDesktop:{queueWrite:()=>true}};
const sfxContext={window:sfxWindow,AudioContext:FakeContext,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},performance:{now:()=>clock},Date,Math,Number,Promise,console,sfxOn:true,document:{addEventListener(){}}};
vm.createContext(sfxContext);vm.runInContext(fs.readFileSync('resources/js/sfx.js','utf8'),sfxContext);
const sound=sfxWindow.NCGSound;
assert(sound&&sound.available(),'SFX API debe estar disponible');
for(const kind of ['ui','case','day','decision','purchase','error','modalOpen','modalClose','export','save','nextCase','ring','hydro','seal','success']){
 assert.equal(sound.play(kind),true,`Debe reproducirse el evento ${kind}`);clock+=250;
}
assert.equal(sound.setVolume(73),73,'El volumen SFX debe admitir un porcentaje independiente');
assert.equal(storage.get('ncg_v16_sfx_volume'),'0.73','El volumen SFX debe persistirse');
sfxContext.sfxOn=false;assert.equal(sound.play('ui'),false,'SFX apagado no debe emitir sonido');

// Music: no autoplay before a gesture; independent enable/volume and proper loop.
const handlers={};
class FakeAudio{constructor(src){this.src=src;this.loop=false;this.preload='';this.volume=1;this.paused=true;this.dataset={};this.calls=0;this.loaded=0;}addEventListener(){}load(){this.loaded++;}play(){this.paused=false;this.calls++;return Promise.resolve();}pause(){this.paused=true;}}
const musicDocument={hidden:false,addEventListener:(type,fn)=>{handlers[type]=fn;}};
const musicWindow={addEventListener:(type,fn)=>{handlers['window:'+type]=fn;}};
const musicContext={window:musicWindow,document:musicDocument,Audio:FakeAudio,Math,Number};
vm.createContext(musicContext);vm.runInContext(fs.readFileSync('resources/js/music.js','utf8'),musicContext);
const music=musicWindow.NCGMusic;
assert(music&&music.isEnabled(),'La música debe venir activada por defecto');
assert.equal(music.getVolume(),7,'La música debe iniciar al 20 % de la ganancia anterior (35 % → 7 %)');
assert.equal(music.play(),false,'No debe intentar autoplay antes de una interacción');
music.configure({enabled:true,volume:35});
assert.equal(music.hasStarted(),false,'La configuración no cuenta como interacción');
handlers.pointerdown({target:{closest:()=>null}});
assert.equal(music.isPlaying(),true,'La primera interacción debe iniciar la música');
assert.equal(music.getVolume(),35,'El volumen de música debe ser independiente');
assert.equal(musicDocument.hidden,false);
assert.equal(music.isPlaying(),true);
musicDocument.hidden=true;handlers.visibilitychange();assert.equal(music.isPlaying(),false,'Ocultar el juego debe pausar música');
assert.equal(music.play(),false,'La música no debe reanudarse mientras está oculta');
musicDocument.hidden=false;handlers.visibilitychange();assert.equal(music.isPlaying(),true,'Volver a la ventana debe reanudar música');
handlers['window:pagehide']();assert.equal(music.isPlaying(),false,'Al salir de la página debe detener música');
music.play();
music.setEnabled(false);assert.equal(music.isPlaying(),false,'Desactivar música debe pausarla');
music.setEnabled(true);assert.equal(music.isPlaying(),true,'Volver a activarla debe reanudarla');
music.setVolume(0);assert.equal(music.getVolume(),0,'La música debe poder silenciarse por volumen');

const qol=fs.readFileSync('resources/js/quality_of_life.js','utf8');
assert(qol.includes("rowToggle('sfx','sound')")&&qol.includes("rowToggle('music','music')"),'Ajustes deben tener interruptores separados');
assert(qol.includes("ncg_desktop_qol_v2")&&qol.includes('musicVolume:7')&&qol.includes('previousMusicVolume))/5'),'La actualización debe migrar una sola vez el volumen guardado a una quinta parte');
assert(qol.includes('data-ncg-music-volume'),'Ajustes deben ofrecer volumen independiente de música');
// Existing V18.36.9 preferences must be migrated once: 35% becomes 7%,
// while the other options remain unchanged and the native writer sees v2.
const preferenceStore=new Map([['ncg_desktop_qol_v1',JSON.stringify({lang:'es',sound:true,music:true,musicVolume:35})]]);
const queuedPreferenceWrites=[];
const preferenceWindow={NCGDesktop:{queueWrite:(key,value)=>{queuedPreferenceWrites.push([key,value]);return true;}}};
const preferenceContext={window:preferenceWindow,document:{},localStorage:{getItem:key=>preferenceStore.get(key)??null,setItem:(key,value)=>preferenceStore.set(key,String(value))},console,Math,Number,Object,JSON,Array,String,Boolean,Set,Map,Date,Promise};
vm.createContext(preferenceContext);vm.runInContext(qol,preferenceContext);
assert.equal(preferenceWindow.NCGQoL.getSettings().musicVolume,7,'El 35 % anterior debe migrar a 7 %');
assert.equal(JSON.parse(preferenceStore.get('ncg_desktop_qol_v2')).musicVolume,7,'La preferencia migrada debe persistirse');
assert.equal(preferenceWindow.NCGQoL.getSettings().sound,true,'La migración debe conservar SFX activados');
assert.equal(queuedPreferenceWrites[0]?.[0],'ncg_desktop_qol_v2','La preferencia migrada debe llegar al almacenamiento nativo');
const boot=fs.readFileSync('resources/js/desktop_boot.js','utf8');
assert(boot.includes("'js/music.js'"),'El arranque debe cargar el controlador de música');
assert(boot.includes("'ncg_desktop_qol_v1':'preferencias.json'")&&boot.includes("'ncg_desktop_qol_v2':'preferencias_v2.json'"),'El escritorio debe leer preferencias antiguas y guardar las nuevas en un archivo separado');
const asset='resources/assets/audio/music_loop.mp3';
assert(fs.statSync(asset).size>1_000_000,'Debe incluirse la pista de música de fondo');
console.log('AUDIO OK: normalización SFX, eventos, volumen independiente, música en bucle, autoplay seguro e interruptores separados.');
