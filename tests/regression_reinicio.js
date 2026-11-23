// Simula los archivos que maneja el backend nativo. Incluye reanudación tras interrupción.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let script=fs.readFileSync('resources/js/desktop_boot.js','utf8');
script=script.slice(0,script.lastIndexOf(" if(document.readyState"))+' window.test={readData,resetProgress,setNative(){native=true;},values};})();';
const names=['partida.json','historial.json','campana.json','campana_anterior.json','progreso-v17.json','progreso-v17-anterior.json','historial-v17-a.json','historial-v17-b.json','autocopia-01.json','autocopia-02.json','autocopia-03.json'];
async function exercise(interrupted){
 const files=new Map(),local=new Map();
 const path=n=>'/data/NCG/'+n;
 const disk={async createDirectory(){},async readDirectory(){return [...files.keys()].map(f=>({entry:f.split('/').pop()}))},async readFile(f){if(!files.has(f))throw Error('not found');return files.get(f);},async writeFile(f,v){files.set(f,v)},async move(a,b){files.set(b,files.get(a));files.delete(a)},async remove(f){files.delete(f)}};
 const context={window:{},document:{getElementById:()=>null},NL_DATAPATH:'/data',Neutralino:{filesystem:disk},localStorage:{removeItem:k=>local.delete(k),setItem:(k,v)=>local.set(k,v)},clearTimeout,setTimeout};
 vm.createContext(context);vm.runInContext(script,context);const api=context.window.test;api.setNative();await api.readData();
 names.forEach(n=>{files.set(path(n),'anterior');files.set(path(n+'.tmp'),'anterior');});
 files.set(path('Respaldo-elegido.json'),'exportación');files.set(path('preferencias.json'),'{}');local.set('ncg_v6_history','anterior');
 if(interrupted){files.set(path('reinicio-en-curso.json'),'true');await api.readData();}
 else await api.resetProgress();
 assert.deepEqual([...files.keys()].sort(),[path('Respaldo-elegido.json'),path('preferencias.json')].sort());
 assert(!local.has('ncg_v6_history'));assert(!api.values.has('ncg_v6_history'));
}
(async()=>{await exercise(false);await exercise(true);console.log('REINICIO OK: limpia archivos, temporales e historial y termina un borrado interrumpido.');})().catch(e=>{console.error(e);process.exitCode=1;});
