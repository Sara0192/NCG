(function(){
 'use strict';
 const KEY='ncg_v16_sfx_volume';
 let volume=.58,ctx=null,master=null,compressor=null,noise=null,last={},eventGain=1;
 try{const raw=localStorage.getItem(KEY);if(raw!==null){const n=Number(raw);if(Number.isFinite(n))volume=Math.max(0,Math.min(1,n));}}catch(_e){}
 const clamp=(x,min,max)=>Math.min(max,Math.max(min,Number(x)||0));
 const now=()=>typeof performance==='object'?performance.now():Date.now();
 // Ganancias por evento: compensa diferencias de amplitud entre osciladores y ruidos.
 // El compresor final contiene los picos acumulados sin aplastar las colas.
 const NORMALIZATION={
  ui:.90,menu:.86,select:.95,switch:.86,modal:.98,paper:.76,flip:.86,
  scale:.76,caliper:.86,magnet:.80,hydro:.40,micro:1.50,uv:2.00,
  light:1.60,xrf:1.00,edge:.80,ring:.40,seal:.55,success:.80,
  warning:.80,negative:.80,preview:1.00,case:.82,day:.78,
  modalOpen:.90,modalClose:.85,decision:.92,purchase:.78,error:.78,
  export:.90,save:.90,nextCase:.86
 };
 const COOLDOWNS={ui:35,select:35,caliper:80,edge:100,magnet:110,case:650,day:900,modalOpen:90,modalClose:90,decision:100,purchase:140,error:180,export:180,save:120,nextCase:120};
 function enabled(){try{return typeof sfxOn==='boolean'?sfxOn:localStorage.getItem('ncg_v6_sfx_enabled')!=='false';}catch(_e){return true;}}
 function getContext(){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  if(!ctx){
   ctx=new AC();master=ctx.createGain();compressor=ctx.createDynamicsCompressor();
   compressor.threshold.value=-30;compressor.knee.value=18;compressor.ratio.value=4.5;
   compressor.attack.value=.004;compressor.release.value=.18;
   master.gain.value=volume*.72;master.connect(compressor);compressor.connect(ctx.destination);
  }
  if(ctx.state==='suspended')Promise.resolve(ctx.resume()).catch(()=>{});
  return ctx;
 }
 function tone(t,f,d,g=.09,type='sine',endF){
  if(!ctx||!master)return;
  const o=ctx.createOscillator(),a=ctx.createGain(),t0=ctx.currentTime+t;
  o.type=type;const hz=clamp(f,65,5000);o.frequency.setValueAtTime(hz,t0);
  if(endF)o.frequency.exponentialRampToValueAtTime(clamp(endF,65,5000),t0+Math.max(.015,d));
  const amplitude=Math.max(.00002,clamp(g*eventGain,.00002,.75));
  a.gain.setValueAtTime(.00001,t0);a.gain.exponentialRampToValueAtTime(amplitude,t0+.007);
  a.gain.exponentialRampToValueAtTime(.00001,t0+Math.max(.018,d));
  o.connect(a);a.connect(master);o.start(t0);o.stop(t0+Math.max(.018,d)+.024);
 }
 function noiseBuffer(){
  if(noise)return noise;
  const len=Math.round(ctx.sampleRate*.60);noise=ctx.createBuffer(1,len,ctx.sampleRate);
  const ch=noise.getChannelData(0);let carry=0;
  for(let i=0;i<len;i++){const raw=Math.random()*2-1;carry=carry*.68+raw*.32;ch[i]=carry;}
  return noise;
 }
 function hiss(t,d,amp=.10,freq=1700,filterType='bandpass'){
  if(!ctx)return;
  const start=ctx.currentTime+t,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),gain=ctx.createGain();
  src.buffer=noiseBuffer();src.loop=d>.56;f.type=filterType;f.frequency.value=clamp(freq,90,9500);f.Q.value=.9;
  const amplitude=Math.max(.00002,clamp(amp*eventGain,.00002,.75));
  gain.gain.setValueAtTime(.00001,start);gain.gain.exponentialRampToValueAtTime(amplitude,start+.008);
  gain.gain.exponentialRampToValueAtTime(.00001,start+Math.max(d,.025));
  src.connect(f);f.connect(gain);gain.connect(master);src.start(start);src.stop(start+Math.max(d,.025)+.01);
 }
 function ping(info,offset=0){
  const hz=clamp(info?.hz||735,260,1450),decay=clamp(info?.decay||.58,.09,1.45),brightness=clamp(info?.brightness??.6,.06,1);
  hiss(offset,.035,.15,2100);tone(offset+.005,hz,decay,.23,'sine');
  tone(offset+.012,hz*2.01,decay*.59,.10*brightness,'sine');
  tone(offset+.009,hz*2.91,decay*.36,.065*brightness,'sine');
  if(info?.dissonance)tone(offset+.012,hz*1.43,Math.min(.35,decay*.55),.07,'triangle');
 }
 function play(kind,payload){
  try{
   if(!enabled()||volume<=0)return false;
   const stamp=now(),cooldown=COOLDOWNS[kind]??0;
   if(last[kind]&&stamp-last[kind]<cooldown)return false;last[kind]=stamp;
   if(!getContext())return false;
   eventGain=NORMALIZATION[kind]??.86;
   switch(kind){
    case 'ui':tone(0,680,.055,.060,'triangle',580);break;
    case 'menu':tone(0,580,.075,.062,'sine');tone(.045,800,.10,.038);break;
    case 'select':tone(0,720,.055,.055,'triangle');break;
    case 'switch':tone(0,750,.075,.065,'sine',970);break;
    case 'modal':hiss(0,.055,.045,1300);tone(.012,540,.12,.040);break;
    case 'modalOpen':hiss(0,.075,.055,1500,'highpass');tone(.008,510,.11,.055,'sine',690);break;
    case 'modalClose':tone(0,650,.075,.055,'sine',470);break;
    case 'paper':hiss(0,.14,.09,2400,'highpass');break;
    case 'case':hiss(0,.09,.075,1900,'highpass');tone(.02,445,.085,.065,'triangle');tone(.085,625,.10,.04,'sine');break;
    case 'day':tone(0,392,.18,.065,'sine');tone(.13,523,.22,.070);tone(.28,659,.24,.055);break;
    case 'flip':hiss(0,.065,.07,950);tone(.005,285,.08,.038,'triangle');break;
    case 'scale':tone(0,365,.07,.085,'triangle');tone(.10,690,.12,.052);break;
    case 'caliper':tone(0,850,.04,.070,'square');tone(.06,960,.045,.035);break;
    case 'magnet':tone(0,350,.10,.075,'sawtooth',285);break;
    case 'hydro':
      hiss(0,.26,.21,920,'lowpass');tone(.02,190,.15,.09,'sine',120);
      for(let i=0;i<4;i++)tone(.045+i*.057,260+i*55,.065,.032,'sine',400+i*70);
      break;
    case 'micro':tone(0,620,.05,.040);tone(.03,795,.055,.032);break;
    case 'uv':tone(0,425,.16,.027,'sine',455);break;
    case 'light':hiss(0,.09,.035,3000);break;
    case 'xrf':tone(0,910,.065,.060);tone(.12,1080,.065,.052);tone(.24,1180,.065,.048);break;
    case 'edge':hiss(0,.09,.08,2700);tone(0,410,.065,.055,'triangle');break;
    case 'ring':ping(payload||{});break;
    case 'seal':hiss(0,.07,.14,1650);tone(0,240,.12,.11,'triangle');tone(.12,250,.085,.090,'triangle');break;
    case 'decision':tone(0,530,.07,.065,'triangle');tone(.055,720,.09,.05,'sine');break;
    case 'purchase':tone(0,523,.09,.06);tone(.08,784,.11,.06);tone(.17,1046,.16,.045);break;
    case 'export':hiss(0,.05,.055,2300,'highpass');tone(.02,740,.08,.055);break;
    case 'save':tone(0,680,.07,.05);tone(.07,890,.1,.045);break;
    case 'nextCase':tone(0,540,.07,.05);tone(.07,690,.08,.04);break;
    case 'error':tone(0,320,.12,.06,'triangle',250);tone(.13,220,.18,.05,'triangle');break;
    case 'success':tone(0,523,.20,.095);tone(.14,659,.23,.082);tone(.31,784,.28,.075);break;
    case 'warning':tone(0,355,.22,.09,'triangle');tone(.20,290,.28,.075,'triangle');break;
    case 'negative':tone(0,460,.16,.085,'triangle');tone(.10,320,.2,.065,'triangle');break;
    case 'preview':tone(0,660,.10,.055);break;
    default:tone(0,620,.06,.05);break;
   }
   return true;
  }catch(_err){return false;}finally{eventGain=1;}
 }
 function compareRings(reference,variant){
  try{
   if(!enabled()||volume<=0||!getContext())return false;
   const stamp=now();if(last.comparison&&stamp-last.comparison<1400)return false;
   last.comparison=stamp;eventGain=NORMALIZATION.ring;
   ping(reference||{},0);ping(variant||{},1.55);return true;
  }catch(_err){return false;}finally{eventGain=1;}
 }
 function setVolume(value,commit=true){
  volume=clamp(value,0,100)/100;
  if(master){try{master.gain.setTargetAtTime(volume*.72,ctx.currentTime,.022);}catch(_e){}}
  if(commit){try{localStorage.setItem(KEY,String(volume));}catch(_e){}try{window.NCGDesktop?.queueWrite?.(KEY,JSON.stringify(volume));}catch(_e){}}
  return Math.round(volume*100);
 }
 function getVolume(){return Math.round(volume*100);}
 function install(){
  document.addEventListener('click',ev=>{
   if(ev.target.closest('#sfxToggle,[data-ncg-ring]'))return;
   const b=ev.target.closest('button,[role="button"]');if(!b||b.disabled||b.matches('[aria-disabled="true"]'))return;
   if(b.closest('#toolbar'))return;
   let special=b.dataset.ncgSound;
   if(special==='none')return;
   if(!special)special=b.matches('#signBtn,#sealBtn,#nextCaseBtn')?'paper':
    b.matches('#qolSettingsBtn,#menuBtn,#historyBtn,#workshopBtn,#guideBtn,#gradeGuideBtn,#shaderGuideBtn,#creditsBtn')?'menu':'ui';
   play(special);
  },true);
  document.addEventListener('change',ev=>{
   if(ev.target.closest('select,[type="checkbox"],[type="radio"]')&&!ev.target.matches('[data-ncg-volume],[data-ncg-music-volume]'))play('select');
  },true);
 }
 window.NCGSound={play,compareRings,getVolume,setVolume,install,available:()=>!!(window.AudioContext||window.webkitAudioContext)};
})();
