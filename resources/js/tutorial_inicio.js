'use strict';
const tutorialSteps = {
 ficha: ['Hoja de recepción', 'Compara el peso y el diámetro declarados en la ficha. Esta primera moneda es auténtica. Su estado de conservación lo decides tú.', '#fileCard'],
 girar: ['Examina el reverso', 'Pulsa F o elige Girar en la barra de instrumentos.', '[data-tool="flip"]'],
 pesar: ['Registra el peso', 'Selecciona Balanza. Arrastra la moneda hasta el plato y espera a que aparezca el peso en Lecturas.', '[data-tool="scale"]'],
 medir: ['Mide el diámetro', 'Selecciona Calibre y pulsa Registrar. El calibre se alinea automáticamente; no tienes que mover ninguna mordaza.', '[data-tool="caliper"]'],
 prueba: ['Haz una prueba complementaria', 'Selecciona Rasante para ver cómo cambia el relieve con la luz. Se registrará una lectura gratuita.', '[data-tool="light"]'],
 decidir: ['Decide la autenticidad', 'Compara las lecturas con la ficha. Selecciona Auténtica para certificar la pieza de aprendizaje.', '[data-auth="real"]'],
 grado: ['Valora la conservación', 'Elige un grado según el desgaste. Para una antigua, indica también Strike y Surface de 1 a 5. Revisa acabado y Details si procede.', '#gradeSel'],
 firmar: ['Emite la etiqueta', 'Pulsa Emitir etiqueta y encapsular. A continuación podrás ajustar el inserto, sellar la cápsula y leer tu resultado.', '#signBtn']
};
function startTutorial(){updateTutorial();}
function finishTutorial(){
 document.getElementById('ncgFirstTutorial')?.remove();
 document.querySelector('.ncg-tutorial-target')?.classList.remove('ncg-tutorial-target');
}
function updateTutorial(){
 if(!session?.tutorialStep || session.day!==1 || session.index!==0 || !active){finishTutorial();return;}
 const exam=minimumExamStatus();
 let step=session.tutorialStep;
 if(step!=='ficha' && step!=='girar'){
   if(!exam.mass)step='pesar';
   else if(!exam.dia)step='medir';
   else if(!exam.extra)step='prueba';
   else if(selectedAuth!=='real')step='decidir';
   else if(!$('gradeSel').value || (currentCoin().ancient && (!$('strikeSel').value || !$('surfaceSel').value)))step='grado';
   else step='firmar';
 }
 session.tutorialStep=step;
 const [title, hint, selector]=tutorialSteps[step];
 let box=$('ncgFirstTutorial');
 if(!box){
   box=document.createElement('aside');box.id='ncgFirstTutorial';box.setAttribute('aria-live','polite');
   $('fileCard').before(box);
 }
 if(box.dataset.step!==step){
   box.dataset.step=step;
   box.innerHTML='<small>Tutorial del primer expediente</small><h3></h3><p></p><div></div>';
   box.querySelector('h3').textContent=title;
   box.querySelector('p').textContent=hint;
   const actions=box.querySelector('div');
   function button(label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=action;actions.append(b);}
   if(step==='ficha')button('Ya he leído la ficha',()=>{session.tutorialStep='girar';saveSession();updateTutorial();});
   button('Saltar tutorial',()=>{session.tutorialStep='';saveSession();finishTutorial();});
 }
 const old=document.querySelector('.ncg-tutorial-target'),target=document.querySelector(selector);
 if(old!==target){old?.classList.remove('ncg-tutorial-target');target?.classList.add('ncg-tutorial-target');}
}
