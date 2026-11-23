# NCG V18.36.12

## Corrección del menú superpuesto

- Al abrir el menú de campaña, el gabinete (`#shell`) queda oculto con `visibility: hidden`, sin interacción y sin filtros que creen contextos de apilado adicionales.
- La capa del menú (`#campaignScreen`) queda fijada a la ventana, aislada y con prioridad de apilado superior.
- El gabinete se marca como `inert` y `aria-hidden="true"` mientras el menú está abierto, evitando foco y navegación accidental en controles que quedan detrás.
- Al cerrar el menú, se restaura la visibilidad, la interacción y la accesibilidad del gabinete.
- Se añade `tests/regression_menu_overlay.js` para comprobar apertura, prioridad de capa y restauración.

No cambia el formato de guardado (6.50), el catálogo (129 tipos / 258 caras), la campaña ni los datos de partida.
