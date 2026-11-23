# NCG V18.36.11 — corrección de seguridad y estabilidad

- R solo abre un modal de confirmación desde el gabinete. No funciona en el menú, en ajustes, con un modal abierto ni sobre inputs/selects.
- El botón de borrado permanece deshabilitado hasta aceptar expresamente la pérdida de la campaña e historial; incluye «Exportar respaldo JSON» y «Cancelar».
- Borrado y reinicio nativo únicamente tras hacer clic en «Sí, borrar todo». Cancelar conserva guardados y autocopias.
- Se mantiene el cooldown de 1 segundo entre aperturas del aviso de reinicio.
- El tutorial permite el giro F aunque otro giro haya consumido temporalmente el cooldown.
- Música: pausa al ocultar la ventana y se reanuda al volver si está habilitada; se precarga después de la primera interacción.
- LZ4 valida límites antes de leer los dos bytes de desplazamiento.
- Corregidos textos incoherentes y varias entradas duplicadas del diccionario de traducción.
- Se preservan guardados 6.50, lanzadores Windows x64 y Linux x64 y recursos de monedas.

Precaución: el reinicio confirmado borra también el historial y las autocopias automáticas: exporta y verifica primero el respaldo JSON.
