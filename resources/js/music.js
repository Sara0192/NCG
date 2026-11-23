(function(){
 'use strict';
 const SOURCE='assets/audio/music_loop.mp3';
 let audio=null,enabled=true,volume=.07,userActivated=false;
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,Number(v)||0));
 function ensureAudio(){
  if(audio)return audio;
  if(typeof Audio!=='function')return null;
  audio=new Audio(SOURCE);audio.loop=true;audio.preload='auto';audio.volume=volume;
  audio.addEventListener('error',()=>{audio.dataset.ncgLoadError='true';});
  return audio;
 }
 function play(){
  if(!enabled||!userActivated||document.hidden)return false;
  const player=ensureAudio();if(!player)return false;
  if(!player.paused)return true;
  player.volume=volume;
  try{const pending=player.play();if(pending&&typeof pending.catch==='function')pending.catch(()=>{});return true;}
  catch(_err){return false;}
 }
 function pause(){if(audio){try{audio.pause();}catch(_err){}}}
 function setEnabled(value){enabled=!!value;if(!enabled){pause();return false;}play();return true;}
 function setVolume(value){volume=clamp(value,0,100)/100;if(audio)audio.volume=volume;return Math.round(volume*100);}
 function configure(settings={}){
  if(typeof settings.enabled==='boolean')enabled=settings.enabled;
  if(settings.volume!==undefined&&settings.volume!==null)setVolume(settings.volume);
  if(enabled)play();else pause();
 }
 function onGesture(event){
  if(!userActivated){
   userActivated=true;
   // Primera interacción: iniciar precarga sin esperar al siguiente cambio de pantalla.
   const player=enabled?ensureAudio():null;
   if(player&&typeof player.load==='function')try{player.load();}catch(_err){}
  }
  const target=event.target;
  if(target?.closest?.('[data-qol-setting="music"]')||target?.closest?.('label')?.querySelector?.('[data-qol-setting="music"]'))return;
  if(enabled)play();
 }
 document.addEventListener('pointerdown',onGesture,{capture:true,passive:true});
 document.addEventListener('keydown',onGesture,true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else play();});
 window.addEventListener('pagehide',pause);
 window.NCGMusic={configure,setEnabled,setVolume,play,pause,getVolume:()=>Math.round(volume*100),isEnabled:()=>enabled,isPlaying:()=>!!audio&&!audio.paused,hasStarted:()=>userActivated};
})();
