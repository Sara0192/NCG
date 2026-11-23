// Ejecuta el manejador del selector de archivo, incluidos los fallos antes de guardar.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const fields=new Map(),messages=[];
const get=id=>{if(!fields.has(id))fields.set(id,{});return fields.get(id);};
const c={console,$:get,window:{},confirm:()=>true,history:[{id:'original'}],dayBook:null,session:{campaignId:'anterior'},coins:[{id:'moneda'}],CAMPAIGN_LENGTH:30,GAME_VERSION:'6.50',BACKUP_FORMAT:'NCG_PARTIDA_V650',SUPPORTED_SAVE_VERSIONS:new Set(['6.50']),notify:(msg,type)=>messages.push(type),hideNotice(){},hideModal(){},showMainMenu(){},ensureCampaignState(){},normalizeInterruptedBankruptcy(){},NCGLog:{event(){}},document:{addEventListener(){}}};
vm.createContext(c);vm.runInContext(fs.readFileSync('resources/js/guardado.js','utf8'),c);
c.saveSession=c.saveDayBook=c.saveHistory=()=>true;c.setupBackupUI();
async function load(text){await get('backupImportFile').onchange({target:{files:[{text:async()=>text}]}});return messages.pop();}
(async()=>{
 const valid={format:c.BACKUP_FORMAT,session:{version:'6.50',day:1,index:0,money:400,reputation:50,campaignId:'restaurada',cases:[{id:'moneda',variant:{defects:[[],[]],shader:{},mass:10,dia:20,density:9}}]},history:[{id:'moneda',recordId:'r1',date:'2026-11-23'}],dayBook:{campaignId:'restaurada',days:{'1':{seed:'test'}}}};
 const history=c.history,session=c.session;
 for(const text of ['{',JSON.stringify({...valid,format:'ajeno'}),JSON.stringify({...valid,history:[null]}),JSON.stringify({...valid,session:{...valid.session,index:100}}),JSON.stringify({...valid,dayBook:{...valid.dayBook,big:Array.from({length:30},()=>Array(500).fill(0))}})]){
   assert.equal(await load(text),'error');assert.equal(c.history,history);assert.equal(c.session,session);
 }
 assert.equal(await load(JSON.stringify(valid)),'success');assert.equal(c.dayBook.days['1'].seed,'test');assert.equal(c.history[0].recordId,'r1');assert.equal(c.session.campaignId,'restaurada');
 console.log('IMPORTACIÓN OK: 5 archivos dañados rechazados sin alterar la partida y restauración completa con calendario.');
})().catch(e=>{console.error(e);process.exitCode=1;});
