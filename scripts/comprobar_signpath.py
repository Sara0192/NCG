#!/usr/bin/env python3
"""Chequeo estatico de preparacion SignPath; sin emitir certificados."""
import json,sys,xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parent.parent
assert (root/'.github/workflows/comprobar.yml').is_file()
flow=(root/'.github/workflows/firmar-signpath.yml').read_text(encoding='utf-8')
assert 'signpath/github-action-submit-signing-request@v3' in flow
assert 'Get-AuthenticodeSignature' in flow
assert 'SIGNPATH_API_TOKEN' in flow
assert 'workflow_dispatch:' in flow
assert 'upload-artifact@v7' in flow
xml=ET.parse(root/'.signpath/artefacto-windows.xml').getroot()
assert xml.tag.endswith('artifact-configuration')
assert xml.find('.//{*}pe-file').attrib['path']=='NCG_V18_36_14.exe'
assert (root/'resources/assets/audio/music_loop.mp3').exists()
version=json.loads((root/'ncg.version.json').read_text())
assert version['release']=='V18.36.14'
print('Preparacion SignPath OK — configuracion local validada. NO implica certificado, firma ni admision.')
