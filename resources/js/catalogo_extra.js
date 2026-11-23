'use strict';
(function(){
 async function loadSafeExtras(){
   const response=await fetch('datos/monedas_extra.json',{cache:'no-store'});
   if(!response.ok)throw Error('No se pudo leer datos/monedas_extra.json');
   const data=await response.json();
   if(!data||!Array.isArray(data.coins)||data.coins.length>200)throw Error('Catálogo adicional inválido.');
   const ids=new Set(window.GAME_DATA.coins.map(c=>c.id));
   const staged=[];
   const physical=new Set(['oro','plata','cobre','cuproniquel','niquel','aluminio','bronce_aluminio','laton']);
   for(const entry of data.coins){
     if(!entry||typeof entry!=='object'||Array.isArray(entry)||
        !/^[A-Za-z0-9_-]{3,90}$/.test(entry.id)||ids.has(entry.id)||
        !physical.has(entry.metal)||!Number.isFinite(entry.mass)||entry.mass<=0||entry.mass>500||
        !Number.isFinite(entry.diameter)||entry.diameter<5||entry.diameter>42||
        !Number.isFinite(entry.rho)||entry.rho<1||entry.rho>24||
        typeof entry.name!=='string'||entry.name.length>130||
        typeof entry.origin!=='string'||entry.origin.length>130||
        typeof entry.year!=='string'||entry.year.length>50||
        typeof entry.vec?.obv?.kind!=='string'||typeof entry.vec?.rev?.kind!=='string'||
        entry.archivo!==undefined||entry.metalVisual!==undefined){
       throw Error('Moneda adicional incorrecta o no segura: '+String(entry?.id||'sin ID').slice(0,40));
     }
     if(entry.paleta&&!physical.has(entry.paleta))throw Error('Paleta no permitida en '+entry.id);
     const coin=sanitizeExtraObject(entry);
     coin.paleta=coin.paleta||coin.metal;
     staged.push(coin);ids.add(coin.id);
   }
   window.GAME_DATA.coins.push(...staged);
 }
 function sanitizeExtraObject(data){
   const clean=JSON.parse(JSON.stringify(data));
   if(JSON.stringify(clean).length>40000)throw Error('Moneda adicional excesivamente grande.');
   // Los datos externos jamás pasan al DOM con sintaxis HTML activa.
   function stripMarkup(value,depth){
     if(depth>20)throw Error('Catálogo adicional demasiado profundo.');
     if(typeof value==='string')return value.replace(/</g,'‹').replace(/>/g,'›').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
     if(Array.isArray(value))return value.map(v=>stripMarkup(v,depth+1));
     if(value&&typeof value==='object'){
       const out=Object.create(null);
       for(const [key,v] of Object.entries(value)){
         if(['__proto__','constructor','prototype'].includes(key))continue;
         out[key]=stripMarkup(v,depth+1);
       }
       return out;
     }
     return value;
   }
   return stripMarkup(clean,0);
 }
 window.NCGExtras={load:loadSafeExtras};
})();
