#!/usr/bin/env python3
"""Valida el encabezado PE x64 del lanzador: NO verifica una firma digital."""
from pathlib import Path
import struct,sys
p=Path(sys.argv[1]);data=p.read_bytes()[:4096]
assert data[:2]==b'MZ','No es un archivo PE (falta MZ)'
assert len(data)>=0x40,'PE truncado'
offset=struct.unpack_from('<I',data,0x3c)[0]
assert offset+26<=len(data),'PE truncado (offset)'
assert data[offset:offset+4]==b'PE\0\0','Firma PE incorrecta'
assert struct.unpack_from('<H',data,offset+4)[0]==0x8664,'No es Windows x64'
assert struct.unpack_from('<H',data,offset+24)[0]==0x20b,'No es PE32+ (64 bits)'
print(f'OK: Windows x64 PE32+ — {p.name}, {p.stat().st_size} bytes (firma NO evaluada)')
