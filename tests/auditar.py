#!/usr/bin/env python3
"""Auditoría local de los archivos NCG. Ejecutar: python3 tests/auditar.py"""
from __future__ import annotations
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
RES=ROOT/'resources'
errors=[]

def check(condition,message):
 if not condition:errors.append(message)

def load_json(path):
 try:return json.loads(path.read_text(encoding='utf-8'))
 except Exception as error:
  errors.append(f'JSON inválido {path}: {error}')
  return None

meta=load_json(ROOT/'ncg.version.json') or {}
# Obtener la versión del manifiesto para no dejar nombres hardcodeados tras cada parche.
VERSION=meta.get('release','')
check(bool(re.fullmatch(r'V\d+\.\d+\.\d+',VERSION)),'Versión raíz inválida')
check(meta.get('build')==VERSION,'Build y release difieren')
check(VERSION in (RES/'js/version.js').read_text(encoding='utf-8'),'Versión JavaScript incoherente')

check(meta.get('engineSaveFormat')=='6.50','Cambió el formato de guardado')
check(meta.get('catalogueSize')==129,'Cambió el tamaño declarado del catálogo')
launcher_name='NCG_'+VERSION.replace('.','_')
check((ROOT/f'{launcher_name}.exe').is_file(),'Falta el iniciador Windows x64')
check((ROOT/f'{launcher_name}.sh').is_file(),'Falta el lanzador Linux')
check((ROOT/'bin/neutralino-linux_x64').is_file(),'Falta el binario Linux')
check((RES/'js/neutralino.js').is_file(),'Falta la biblioteca Neutralino')

scripts=[p for p in RES.rglob('*.js')]
for rel in ['js/render_base.js','js/visualizacion.js','js/registro.js','js/juego.js','js/sfx.js','js/music.js']:
 check((RES/rel).is_file(),f'Falta el módulo {rel}')

# Verificar catálogo ejecutando solamente el archivo de datos en un contexto
# aislado; no se ejecuta el juego ni se modifica ninguna partida.
if shutil.which('node'):
 data=RES/'datos/indice_monedas.js'
 js="""const vm=require('node:vm'),fs=require('node:fs');
const w={};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),{window:w});
const list=w.GAME_DATA.coins;
if(list.length!==129||new Set(list.map(x=>x.id)).size!==129)process.exit(2);
process.stdout.write(JSON.stringify(list.map(x=>x.id)));"""
 result=subprocess.run(['node','-e',js,str(data)],capture_output=True,text=True)
 if result.returncode!=0:errors.append('Catálogo de monedas incorrecto: '+result.stderr[:200]);ids=[]
 else:ids=json.loads(result.stdout)
else:
 errors.append('Node.js no encontrado: no se puede validar la sintaxis ni el catálogo')
 ids=[]

for mode in ('realista','vectorial'):
 for resolution in ('alta','ligera'):
  directory=RES/'assets'/mode/resolution
  images=list(directory.glob('*.webp'))
  check(len(images)==258,f'{mode}/{resolution}: {len(images)} imágenes en vez de 258')
  if ids:
   expected={f'{identifier}_{side}.webp' for identifier in ids for side in ('anverso','reverso')}
   check(expected==set(p.name for p in images),f'{mode}/{resolution}: imágenes faltantes o ajenas al catálogo')
 die_root=RES/'assets'/mode/'cunos'
 for side in ('anverso','reverso'):
  files=list(die_root.rglob(side+'.js'))
  check(len(files)==129,f'{mode}: {len(files)} cuños {side} en vez de 129')
  if ids:check(set(p.parent.name for p in files)==set(ids),f'{mode}: cuños {side} no corresponden al catálogo')
 if mode=='vectorial':check((RES/'assets/vectorial/motor-clasico.js').is_file(),'Falta motor clásico')

# Regresiones de fin de jornada y salto de moneda en modo desarrollador.
interfaz=(RES/'js/interfaz.js').read_text(encoding='utf-8')
calibre=(RES/'js/calibre.js').read_text(encoding='utf-8')
tutorial=(RES/'js/tutorial_inicio.js').read_text(encoding='utf-8')
html=(RES/'index.html').read_text(encoding='utf-8')
check('updateTutorial();' in calibre and 'automáticamente' in tutorial and 'Registrar' in html,'Calibre o tutorial no reflejan el flujo automático')
check((RES/'assets/audio/music_loop.mp3').is_file() and (RES/'assets/audio/music_loop.mp3').stat().st_size>1_000_000,'Falta la música de fondo')
qol=(RES/'js/quality_of_life.js').read_text(encoding='utf-8')
check("rowToggle('sfx','sound')" in qol and "rowToggle('music','music')" in qol and 'data-ncg-music-volume' in qol,'Ajustes no separan SFX y música')
check('caliperCenter' not in html and 'caliperHandle' not in html and 'nudgeCaliper' not in calibre,'Quedan controles manuales antiguos del calibre')
juego=(RES/'js/juego.js').read_text(encoding='utf-8')
check('RANDOM_RESET_COOLDOWN_MS=1000' in juego and 'canStartRandomReset()' in juego,'La tecla R no tiene cooldown de 1 segundo')
debug=(RES/'js/debug_mode.js').read_text(encoding='utf-8')
check('dayHasNoActiveCase' in interfaz and 'showMainMenu()' in interfaz,'Escape/cierre del resumen no recupera la navegación')
check('hideModal({returnToMenu:false});beginNewDay();' in (RES/'js/economia.js').read_text(encoding='utf-8'),'La acción de abrir la jornada siguiente no preserva el flujo de navegación')
check("if(menuView==='home')" in juego and 'showEndDay()' in juego,'Escape no restaura la pantalla correcta al cerrar menú')
check('data-dev-command=\"saltar\"' in debug and 'Saltar 1 moneda' in debug,'Falta el botón debug Saltar 1 moneda')
check("case 'saltar':return doSkipCases(args.length?n:1);" in debug,'Falta el comando saltar N en debug')
check("case 'caso':return doSkipCases(1);" in debug,'Se perdió la compatibilidad del comando caso')

boot=(RES/'js/desktop_boot.js').read_text()
for script in ['js/render_base.js','js/visualizacion.js','js/registro.js','js/sfx.js','js/music.js','js/juego.js']:
 check(script in boot,f'No se carga {script} en desktop_boot.js')
if shutil.which('node'):
 # Una única ejecución de Node para comprobar la sintaxis de los 500+ JS.
 verifier="""const fs=require('node:fs'),vm=require('node:vm');
const paths=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
let failures=0;
for(const path of paths){try{new vm.Script(fs.readFileSync(path,'utf8'),{filename:path});}
catch(error){failures++;process.stderr.write(path+' '+error.message+'\\n');}}
process.stdout.write('JS sintácticamente válidos: '+(paths.length-failures)+'/'+paths.length+'\\n');
if(failures)process.exit(1);"""
 import tempfile
 with tempfile.TemporaryDirectory() as tmp:
  paths=Path(tmp)/'paths.json';paths.write_text(json.dumps([str(p) for p in scripts]))
  result=subprocess.run(['node','-e',verifier,str(paths)],capture_output=True,text=True)
  print(result.stdout.strip())
  if result.returncode:errors.append('Errores sintácticos: '+result.stderr[:1500])
 for suite in ['regression_jornada','regression_respaldos','regression_importacion','regression_reinicio','regression_calibre','regression_r_cooldown','regression_proteccion_r','regression_flip_lz4','regression_audio','regression_menu_overlay']:
  regression=subprocess.run(['node',str(ROOT/'tests'/(suite+'.js'))],cwd=ROOT,capture_output=True,text=True)
  print(regression.stdout.strip())
  if regression.returncode:errors.append(suite+': '+regression.stderr[:1500])

inventory=load_json(RES/'docs/inventario_licencias_258.json') or []
check(len(inventory)==258 and {(r['id'],r['cara']) for r in inventory}=={(i,s) for i in ids for s in ('anverso','reverso')},'Inventario incompleto')
check(load_json(ROOT/'neutralino.config.json')['modes']['window']['exitProcessOnClose'] is True,'El cierre requiere JavaScript')

if errors:
 print('\nAUDITORÍA NO SUPERADA:')
 for err in errors:print(' -',err)
 sys.exit(1)
print(f'AUDITORÍA OK: {len(ids)} monedas, cuatro conjuntos de 258 imágenes, 258 cuños por motor.')
print('Se han comprobado ambos lanzadores y la compatibilidad declarada de guardado 6.50.')
