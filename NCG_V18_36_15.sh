#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

for recurso in \
  resources/index.html \
  resources/GALERIA_VECTORIAL.html \
  resources/ESCALA_SHELDON_Y_SHADERS.html \
  resources/TUTORIAL_SHADERS.html \
  resources/js/quality_of_life.js \
  resources/js/music.js \
  resources/assets/audio/music_loop.mp3 \
  resources/js/desktop_guides.js; do
  if [[ ! -s "$recurso" ]]; then
    printf 'NCG: archivo obligatorio ausente o vacio: %s\n' "$recurso" >&2
    exit 1
  fi
done

if [[ "$(uname -m)" != x86_64 ]]; then
  printf 'Este paquete contiene Neutralino para Linux x86_64.\n' >&2
  exit 1
fi
if [[ -f bin/neutralino-linux_x64 && ! -x bin/neutralino-linux_x64 ]]; then
  chmod u+x bin/neutralino-linux_x64
fi
if [[ ! -x bin/neutralino-linux_x64 || ! -s resources/js/neutralino.js ]]; then
  if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
    echo 'Faltan Node.js y npm para instalar los binarios oficiales de Neutralinojs.' >&2
    exit 1
  fi
  echo 'Descargando Neutralinojs oficial. Solo requiere Internet la primera vez.'
  npm install --no-audit --no-fund
  npx neu update
fi

if [[ ! -x bin/neutralino-linux_x64 || ! -s resources/js/neutralino.js ]]; then
  echo 'ERROR: faltan el ejecutable de Neutralinojs o la biblioteca JavaScript.' >&2
  exit 1
fi

if command -v ldconfig >/dev/null; then
  libs="$(ldconfig -p)"
  if [[ "$libs" != *libwebkit2gtk-4.1.so.0* && "$libs" != *libwebkit2gtk-4.0.so.37* ]]; then
    printf '\nFalta WebKitGTK. En Linux Mint 22 puedes instalarlo con:\n  sudo apt install libwebkit2gtk-4.1-0\n' >&2
    exit 1
  fi
fi
if [[ "${1:-}" == --comprobar ]]; then
  printf 'Recursos, binario y dependencias de escritorio disponibles.\n'
  exit 0
fi
if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
  printf 'Abre el juego en una sesión gráfica de Linux.\n' >&2
  exit 1
fi

export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"
exec ./bin/neutralino-linux_x64 \
  --res-mode=directory \
  --path=. \
  --mode=window
