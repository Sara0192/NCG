'use strict';
const METALS={oro:{label:'Oro'},plata:{label:'Plata'},cobre:{label:'Cobre'},cuproniquel:{label:'Cuproníquel'},niquel:{label:'Níquel'},aluminio:{label:'Aluminio'},bronce_aluminio:{label:'Bronce de aluminio'},laton:{label:'Latón'}};
const METAL_FAMILY={oro:'oro',plata:'plata',cobre:'cobre',cuproniquel:'plata',niquel:'plata',aluminio:'plata',bronce_aluminio:'cobre',laton:'cobre'};
function metalFamilia(c){return METAL_FAMILY[c?.metal]||'plata';}
function paletaMoneda(c){return c?.paleta||c?.metalVisual||c?.metal||'plata';}
function metalLabel(c){return (c&&c.metalLabel)||(METALS[(c&&c.metal)||'plata']||METALS.plata).label;}

// Perfiles acústicos simulados: dependen del metal físico, no de su color en pantalla.
const METAL_SOUND={
 oro:[.67,585,.80,.65],plata:[.80,810,.98,.82],cobre:[.57,560,.67,.65],
 cuproniquel:[.63,690,.77,.73],niquel:[.66,680,.79,.76],
 aluminio:[.44,870,.51,.59],bronce_aluminio:[.64,610,.76,.70],laton:[.67,635,.79,.71]
};
function sonidoMetal(c){return METAL_SOUND[c?.metal]||METAL_SOUND.plata;}
