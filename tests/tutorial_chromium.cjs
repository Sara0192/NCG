const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
const b=await chromium.launch({executablePath:process.env.NCG_CHROMIUM || undefined,headless:true});try{
const page=await b.newPage({viewport:{width:1600,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(6000);
const root=path.resolve(__dirname,'../resources');
await page.route('http://ncg.test/**',async route=>{const rel=decodeURIComponent(new URL(route.request().url()).pathname).slice(1)||'index.html';if(rel==='js/neutralino.js')return route.fulfill({body:'',contentType:'text/javascript'});const f=path.join(root,rel);if(!fs.existsSync(f))return route.fulfill({status:404,body:''});return route.fulfill({path:f});});
await page.goto('http://ncg.test/');await page.click('#startGuided');assert.equal(await page.evaluate(()=>NCG.debug().active.variant.isFake),false);
await page.getByText('Ya he leído la ficha').click();await page.keyboard.press('f');assert.equal(await page.locator('#ncgFirstTutorial').getAttribute('data-step'),'pesar');
await page.click('[data-tool=scale]');const station=await page.locator('#scaleStation').boundingBox(); const coin=await page.locator('#coinToken').boundingBox();
await page.mouse.move(coin.x+coin.width/2,coin.y+coin.height/2);await page.mouse.down();await page.mouse.move(station.x+station.width/2,station.y+station.height/2,{steps:10});await page.mouse.up();
console.log('Balanza:',await page.locator('#ncgFirstTutorial').getAttribute('data-step'));
await page.click('[data-tool=caliper]');
assert.equal(await page.locator('#caliperUI button').count(),1,'El calibre solo debe ofrecer Registrar');
assert.equal(await page.locator('#jawLeft').getAttribute('role'),null,'Las mordazas no deben ser controles');
assert.equal(await page.locator('.jawMarker').count(),0,'No deben aparecer las etiquetas D/I');
await page.click('#caliperMeasure');
const caliperReading=await page.evaluate(()=>({reading:NCG.debug().active.readings.dia,expected:effectiveDia().toFixed(1)+' mm'}));
assert.equal(caliperReading.reading,caliperReading.expected,'El calibre debe registrar automáticamente el diámetro');
assert.equal(await page.locator('#ncgFirstTutorial').getAttribute('data-step'),'prueba','Registrar debe avanzar el tutorial');
await page.click('[data-tool=light]');await page.click('[data-auth=real]');await page.selectOption('#gradeSel',{index:1});
if(await page.locator('#ancientFields').isVisible()){await page.selectOption('#strikeSel','3');await page.selectOption('#surfaceSel','4');}
await page.click('#signBtn');await page.click('#sealBtn');await page.getByText('Tutorial completado.',{exact:true}).waitFor();await page.click('#nextCaseBtn');
await page.click('#creditsBtn');assert.equal(await page.locator('#creditList p').count(),258);await page.keyboard.press('Escape');
const oldId=await page.evaluate(()=>NCG.debug().session.campaignId);
// R nunca borra directamente: es ignorada en selectores y exige confirmación explícita.
await page.locator('#gradeSel').focus();await page.keyboard.press('r');
assert.equal(await page.locator('#ncgResetTitle').count(),0,'No debe aparecer sobre un selector');
await page.click('#desk');await page.keyboard.press('r');
await page.locator('#ncgResetTitle').waitFor();
assert.equal(await page.locator('#ncgResetConfirm').isEnabled(),false,'El botón de borrar empieza inactivo');
assert.equal(await page.evaluate(()=>NCG.debug().session.campaignId),oldId,'Un toque de R no debe borrar');
await page.keyboard.press('r');
assert.equal(await page.evaluate(()=>NCG.debug().session.campaignId),oldId,'R repetida con modal abierto tampoco borra');
await page.locator('#ncgResetCancel').click();
assert.equal(await page.evaluate(()=>NCG.debug().session.campaignId),oldId,'Cancelar mantiene la campaña');
await page.waitForTimeout(1000);await page.click('#desk');await page.keyboard.press('r');
await page.locator('#ncgResetTitle').waitFor();
await page.locator('#ncgResetAcknowledge').check();
assert.equal(await page.locator('#ncgResetConfirm').isEnabled(),true);
await page.locator('#ncgResetConfirm').click();
await page.waitForFunction(id=>NCG.debug().session.campaignId!==id,oldId);
await page.click('#startStandard');let state=await page.evaluate(()=>NCG.debug());assert.equal(state.history.length,0);assert.equal(state.session.day,1);assert.equal(state.active.variant.isFake,false);
await page.reload();await page.click('[data-menu-action=continue]');state=await page.evaluate(()=>NCG.debug());assert.equal(state.history.length,0);assert.equal(state.session.index,0);assert(!errors.length,errors.join('\n'));
console.log('Chromium OK: tutorial completo, créditos, R protegida con confirmación, cancelar, saltar tutorial y recargar.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
