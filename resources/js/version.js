'use strict';
const NCG_VERSION = Object.freeze({"app":"NCG Desktop","core":"1.0.25","release":"V18.36.15","engineSaveFormat":"6.50","catalogueSize":129,"build":"V18.36.15"});
if(typeof window!=='undefined'){window.NCG_VERSION=NCG_VERSION;if(typeof document!=='undefined'){document.title=`NCG — Gabinete de certificación · Desktop ${NCG_VERSION.core} · ${NCG_VERSION.release} · Escritorio`;const hd=document.querySelector('#ncgVersionHeader');if(hd)hd.textContent=`GABINETE NCG · DESKTOP ${NCG_VERSION.core} · ${NCG_VERSION.release} · ARCHIVO AMPLIABLE`;}}
