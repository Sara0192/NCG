'use strict';
let caliperLeftMm=7,caliperRightMm=30;
let caliperAnchorX=0,caliperAnchorY=0,caliperJawLength=140;
const snapHalf=mm=>Math.round(mm/CALIPER_STEP)*CALIPER_STEP;
let scenePxPerMm=10;
function recalibrateSceneScale(){const desk=$('desk');if(!desk)return;scenePxPerMm=Math.max(3.5,Math.min(12,(desk.clientHeight-32)/42,(desk.clientWidth-64)/44));}
function pixelsPerMm(){return scenePxPerMm;}
function effectiveDia(c=currentCoin()){const n=active?.variant?.dia??c?.diameter??25;return snapHalf(Math.max(CALIPER_MIN,Math.min(CALIPER_MAX,Number(n)||25)));}
function coinDisplayPx(c){return effectiveDia(c)*pixelsPerMm()/COIN_VISIBLE_RATIO;}
function applyCoinScale(c=currentCoin()){if(!c)return;const token=$('coinToken');token.style.width=coinDisplayPx(c)+'px';token.style.maxWidth='none';}
function sizeLabel(c){return Number(c.diameter).toFixed(1)+' mm · escala continua de 0,5 mm';}
