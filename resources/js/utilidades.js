'use strict';
const $ = id => document.getElementById(id);
let seededRandom=Math.random;
function mulberry32(seed){let t=seed>>>0;return function(){t=(t+0x6D2B79F5)>>>0;let x=Math.imul(t^(t>>>15),1|t);x^=x+Math.imul(x^(x>>>7),61|x);return ((x^(x>>>14))>>>0)/4294967296;};}
function seedHash(value){let h=2166136261>>>0;for(const ch of String(value)){h=Math.imul(h^ch.charCodeAt(0),16777619);}return h>>>0;}
function randomToken(){const a=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(a);else a[0]=(Date.now()^Math.floor(Math.random()*4294967295))>>>0;return a[0].toString(36).toUpperCase();}
function newSeed(){return randomToken().padStart(7,'0').slice(-7);}
function useSeed(seed){seededRandom=mulberry32(seedHash(seed));}
const random=(a,b)=>a+seededRandom()*(b-a);
const randInt=(a,b)=>Math.floor(random(a,b+1));
const choice=a=>a[randInt(0,a.length-1)];
const shuffled=a=>{let c=[...a];for(let i=c.length-1;i>0;i--){const j=randInt(0,i);[c[i],c[j]]=[c[j],c[i]];}return c;};
const money=n=>`${Math.round(n)} €`;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labelAsset=name=>({rayas_finas:'Rayas finas',rayas_cruzadas:'Rayas de contacto',limpieza_paralela:'Limpieza',poros_fundicion:'Porosidad superficial',corrosion_plata:'Corrosión de plata',corrosion_oro:'Ataque superficial',corrosion_cobre:'Oxidación',grieta_bano_oro:'Grieta del baño de oro',grieta_bano_plata:'Grieta del baño de plata',grieta_bano_cobre:'Grieta del baño de cobre',golpe_canto:'Golpe de canto',doblado_sombra:'Deformación',perforacion:'Perforación',reparacion:'Reparación',graffiti:'Grabado posterior',pulido_espejo:'Pulido',alteracion_superficie:'Superficie alterada',manchas_uv:'Residuo UV'})[name]||name;
