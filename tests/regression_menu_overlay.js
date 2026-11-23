'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'resources/css/estilo.css'),'utf8');
const menu=fs.readFileSync(path.join(root,'resources/js/campana.js'),'utf8');
function assert(ok,message){if(!ok)throw new Error(message);}

const shellRule=css.match(/body\.ncg-in-menu\s+#shell\s*\{([^}]*)\}/);
assert(shellRule,'Falta la regla que controla el gabinete al abrir el menú');
assert(/visibility\s*:\s*hidden\s*!important/i.test(shellRule[1]),'El gabinete debe quedar visualmente oculto mientras el menú está abierto');
assert(/pointer-events\s*:\s*none\s*!important/i.test(shellRule[1]),'El gabinete no debe recibir clics detrás del menú');
assert(/filter\s*:\s*none\s*!important/i.test(shellRule[1]),'El filtro del gabinete no debe crear una capa de apilado borrosa');

const menuRule=css.match(/body\.ncg-in-menu\s+#campaignScreen\s*\{([^}]*)\}/);
assert(menuRule,'Falta la regla de capa superior del menú de campaña');
assert(/z-index\s*:\s*2147483000/i.test(menuRule[1]),'El menú debe tener prioridad de apilado');
assert(/isolation\s*:\s*isolate/i.test(menuRule[1]),'El menú debe aislar su propio contexto de apilado');

const show=menu.match(/function\s+showMenuScreen\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
const close=menu.match(/function\s+closeCampaignMenu\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
assert(show&&/classList\.add\(['"]ncg-in-menu['"]\)/.test(show[1]),'Al abrir menú debe activarse ncg-in-menu');
assert(/shell\.inert\s*=\s*true/.test(show[1])&&/setAttribute\(['"]aria-hidden['"],\s*['"]true['"]\)/.test(show[1]),'Al abrir menú el gabinete debe quedar inerte y oculto a lectores de pantalla');
assert(close&&/classList\.remove\(['"]ncg-in-menu['"]\)/.test(close[1]),'Al cerrar menú debe retirarse ncg-in-menu');
assert(/shell\.inert\s*=\s*false/.test(close[1])&&/removeAttribute\(['"]aria-hidden['"]\)/.test(close[1]),'Al cerrar menú el gabinete debe volver a estar accesible');
console.log('Menú OK: capa superior, paneles ocultos, gabinete inerte y restauración al cerrar.');
