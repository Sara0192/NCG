#!/usr/bin/env python3
"""Auditoría conservadora: falla para publicación cuando faltan pruebas de licencia."""
import argparse,csv,pathlib,sys
root=pathlib.Path(__file__).resolve().parents[1]
manifest=root/'docs/MANIFIESTO_DERECHOS_ASSETS.csv'
allowed={'MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC','0BSD','Unlicense'}
parser=argparse.ArgumentParser();parser.add_argument('--release',action='store_true');args=parser.parse_args()
with manifest.open(encoding='utf-8',newline='') as f: rows=list(csv.DictReader(f))
paths=[r['ruta'] for r in rows]
if len(paths)!=len(set(paths)): sys.exit('ERROR: archivos duplicados en manifiesto')
expected={p.relative_to(root).as_posix() for p in (root/'resources/assets').rglob('*') if p.is_file()}
expected.update({p.relative_to(root).as_posix() for p in (root/'resources/docs').rglob('*') if p.is_file()})
expected.update(x for x in ['bin/neutralino-linux_x64','NCG_Neutralino_Alternativo.exe'] if (root/x).exists())
missing=expected-set(paths); surplus=set(paths)-expected
if missing or surplus:
 print('Archivos sin manifestar:',list(sorted(missing))[:8]);print('Filas sin archivo:',list(sorted(surplus))[:8]);sys.exit(1)
open_items=[r for r in rows if r['estado']!='APROBADO' or r['licencia_publicacion'] not in allowed or 'PENDIENTE' in r['justificacion'].upper()]
print(f'Recursos: {len(rows)} | pendientes o sin licencia validada: {len(open_items)}')
if args.release and open_items:
 print('BLOQUEO: no solicitar firma de distribución con recursos de licencia no confirmada.')
 sys.exit(2)
print('Estructura del manifiesto verificada.')
