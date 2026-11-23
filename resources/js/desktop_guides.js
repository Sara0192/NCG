(function(){
 'use strict';
 const arte='docs/arte_V18_24/estado_del_arte.html';
 const allowed={
  'ESCALA_SHELDON_Y_SHADERS.html':'Escala Sheldon y penalizaciones',
  'TUTORIAL_SHADERS.html':'Laboratorio de shaders',
  'GALERIA_VECTORIAL.html':'Galería numismática',
  [arte]:'Estado del arte'
 };
 const homePages=new Set(['NCG.html','index.html']);
 let overlay=null, frame=null, title=null, status=null, previousFocus=null, current='';
 const themeVars=['--t-bg','--t-header','--t-header2','--t-panel','--t-panel2','--t-button','--t-button2','--t-active','--t-accent','--t-border','--t-fg','--t-muted','--t-ink'];
 // Los iframes no heredan los estilos del gabinete: compartir su paleta al abrirlos.
 function syncGuideTheme(){
  if(!frame||overlay?.hidden)return;
  let doc;
  try{doc=frame.contentDocument;}catch(_e){return;}
  if(!doc?.head||!doc.body)return;
  const theme=document.body.dataset.ncgTheme||'verde';
  doc.documentElement.dataset.ncgTheme=theme;
  const source=getComputedStyle(document.body);
  for(const name of themeVars){
   const value=source.getPropertyValue(name).trim();
   if(value)doc.documentElement.style.setProperty(name,value);
  }
  if(!doc.querySelector('link[data-ncg-guide-theme]')){
   const link=doc.createElement('link');
   link.rel='stylesheet';link.dataset.ncgGuideTheme='';
   link.href=new URL('css/desktop_guides.css',document.location.href).href;
   doc.head.append(link);
  }
 }
 function linkedPage(link,base){
  try {
   const url=new URL(link,base||document.location.href);
   if(url.origin!==document.location.origin)return '';
   if(url.pathname===new URL(arte,document.location.href).pathname)return arte;
   return url.pathname.split('/').pop();
  }catch(e){return '';}
 }
 function ensure(){
  if(overlay)return;
  overlay=document.createElement('section');
  overlay.className='ncg-guide-overlay';overlay.id='ncgGuideOverlay';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','ncgGuideTitle');overlay.hidden=true;
  overlay.innerHTML=`<div class="ncg-guide-window">
    <div class="ncg-guide-bar"><h2 class="ncg-guide-title" id="ncgGuideTitle">Consulta del gabinete</h2>
      <button type="button" data-guide="ESCALA_SHELDON_Y_SHADERS.html">Escala Sheldon</button>
      <button type="button" data-guide="TUTORIAL_SHADERS.html">Shaders · Tutorial</button>
      <button type="button" data-guide="GALERIA_VECTORIAL.html">Galería</button>
      <span class="ncg-guide-status" id="ncgGuideStatus"></span>
      <button type="button" class="ncg-guide-close" id="ncgGuideClose">Volver al gabinete ×</button></div>
    <iframe class="ncg-guide-frame" id="ncgGuideFrame" title="Documento de consulta NCG" loading="eager"></iframe>
  </div>`;
  document.body.appendChild(overlay);
  new MutationObserver(syncGuideTheme).observe(document.body,{attributes:true,attributeFilter:['data-ncg-theme','class']});
  frame=overlay.querySelector('#ncgGuideFrame');title=overlay.querySelector('#ncgGuideTitle');
  status=overlay.querySelector('#ncgGuideStatus');
  overlay.querySelector('#ncgGuideClose').addEventListener('click',close);
  overlay.querySelectorAll('[data-guide]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.guide)));
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  frame.addEventListener('load',()=>{
   if(overlay.hidden||!current)return;
   try{
    const doc=frame.contentDocument;
    if(!doc)return;
    syncGuideTheme();
    window.NCGLocale?.watchDocument(doc);
    doc.addEventListener('click',e=>intercept(e,doc.location.href),true);
    doc.addEventListener('click',e=>{if(e.target.closest?.('button,a[href],select,[role=button]'))window.NCGSound?.play('ui');},true);
    doc.addEventListener('change',e=>{if(e.target.matches?.('select,[type=checkbox],[type=radio]'))window.NCGSound?.play('select');},true);
    doc.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}},true);
    const opened=linkedPage(doc.location.href);
    const ready=opened===current&&(
      opened==='GALERIA_VECTORIAL.html' ? !!(doc.getElementById('coin')&&doc.getElementById('gallery')) :
      opened==='TUTORIAL_SHADERS.html' ? !!doc.querySelector('main') :
      opened==='ESCALA_SHELDON_Y_SHADERS.html' ? !!doc.querySelector('h1') :
      opened===arte ? !!doc.getElementById('artIndex') : false
    );
    if(!ready){
      status.textContent='Documento no disponible';
      try{
       doc.body.innerHTML='<main style="padding:30px;color:#fbe6cc;background:#252a2c;font:16px sans-serif"><h2>No se pudo abrir este documento</h2><p>Falta un archivo o hay un error de carga. Cierra la ventana, comprueba la instalacion y reintenta.</p></main>';
      }catch(_e){}
      return;
    }
    setActive(opened);
    status.textContent='Documento cargado';
   }catch(e){status.textContent='Consulta abierta';}
  });
 }
 function setActive(page){
  current=page;
  title.textContent=allowed[page]||'Consulta del gabinete';
  frame.title=title.textContent;
  overlay.querySelectorAll('[data-guide]').forEach(b=>{
   if(b.dataset.guide===page)b.setAttribute('aria-current','page');
   else b.removeAttribute('aria-current');
  });
 }
 function open(page,numero){
  if(!Object.hasOwn(allowed,page))return false;
  ensure();
  const wasHidden=overlay.hidden;
  if(wasHidden){previousFocus=document.activeElement;overlay.hidden=false;}
  // Al abrir los lienzos de formación, no mantener un segundo lienzo en composición detrás.
  document.body.classList.add('ncg-guide-open');
  window.NCGGraphics?.refresh();
  setActive(page);
  const destino=page==='GALERIA_VECTORIAL.html' && Number.isInteger(numero) && numero>0 ? page+'?moneda='+numero : page;
  if(frame.getAttribute('src')!==destino) {
   status.textContent='Cargando documento…';
   window.NCGLocale?.releaseDocument(frame.contentDocument);
   frame.src=destino;
  }
  if(wasHidden)overlay.querySelector('#ncgGuideClose').focus();
  return true;
 }
 function close(){
  if(!overlay||overlay.hidden)return;
  overlay.hidden=true;current='';
  window.NCGLocale?.releaseDocument(frame.contentDocument);
  frame.src='about:blank';
  document.body.classList.remove('ncg-guide-open');
  window.NCGGraphics?.refresh();
  status.textContent='';
  if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();
  previousFocus=null;
 }
 function intercept(e,base){
  if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey)return;
  const a=e.target.closest&&e.target.closest('a[href]');
  if(!a)return;
  const page=linkedPage(a.getAttribute('href'),base);
  if(page&&Object.hasOwn(allowed,page)){
   e.preventDefault();e.stopImmediatePropagation();open(page);
  }else if(page&&homePages.has(page)&&overlay&&!overlay.hidden){
   e.preventDefault();e.stopImmediatePropagation();close();
  }
 }
 document.addEventListener('click',e=>intercept(e,document.location.href),true);
 document.addEventListener('keydown',e=>{
  if(!overlay||overlay.hidden)return;
  if(e.key==='Escape'){e.preventDefault();close();}
  if(e.key==='Tab'){
   const elements=[...overlay.querySelectorAll('button:not([disabled]), iframe')].filter(el=>el.getClientRects().length>0);
   if(elements.length){
    const first=elements[0],last=elements[elements.length-1];
    if(!overlay.contains(document.activeElement)){e.preventDefault();first.focus();}
    else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   }
  }
  e.stopImmediatePropagation();
 },true);
 window.NCGGuides={open,close,isOpen:()=>!!overlay&&!overlay.hidden};
})();
