#!/usr/bin/env bash
# Prueba opcional de escritorio Linux/X11 con WebKitGTK y wmctrl.
# La ventana abre una página vacía sin ningún manejador JavaScript.
set -eu
cd "$(dirname "$0")/.."
command -v wmctrl >/dev/null
test -n "${DISPLAY:-}"
scratch=$(mktemp -d)
pid=''
trap 'if test -n "$pid"; then kill "$pid" 2>/dev/null || true; fi; rm -rf "$scratch"' EXIT
cp neutralino.config.json "$scratch/"
mkdir -p "$scratch/resources" "$scratch/state"
printf '<!doctype html><title>Prueba de cierre temprano</title>' > "$scratch/resources/index.html"
XDG_DATA_HOME="$scratch/state" ./bin/neutralino-linux_x64 --path="$scratch" --res-mode=directory --mode=window &
pid=$!
window=''
for ((n=0;n<100;n++)); do
 window=$(wmctrl -lp | awk -v p="$pid" '$3==p {print $1;exit}')
 test -z "$window" || break
 sleep 0.1
done
test -n "$window" || { echo 'No se abrió la ventana de prueba'; exit 1; }
wmctrl -ic "$window"
for ((n=0;n<70;n++)); do
 if ! kill -0 "$pid" 2>/dev/null; then wait "$pid"; pid=''; echo 'Cierre antes de ready correcto'; exit 0; fi
 sleep 0.1
done
echo 'El proceso no terminó al cerrar la ventana'
exit 1
