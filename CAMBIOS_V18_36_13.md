# NCG V18.36.13 — Inicio Windows sin descarga externa

**Error corregido por nueva vía de ejecución:** el EXE original fallaba al descargar el motor oficial Neutralinojs en GitHub o SourceForge: `context deadline exceeded`. La descarga dependía de Internet y de los servidores externos.

Se incorpora un nuevo EXE principal `NCG_V18_36_13.exe`, compilado para Windows x64 en Go, que no descarga Neutralinojs. Abre el juego en modo aplicación de Edge, Brave o Chrome, en ventana propia sin barra ni pestañas. El motor alternativo antiguo se conserva como `NCG_Neutralino_Alternativo.exe`.

El nuevo servidor sirve recursos exclusivamente en `127.0.0.1`, exige autenticación por token para partidas y exportaciones, valida las claves de almacenamiento y escribe JSON en `%LOCALAPPDATA%/NCG/Guardados`.

Se conservan intactos el catálogo de monedas, el juego, las vistas, la música, los SFX, las correcciones del menú Esc y el formato de guardado 6.50. El lanzador Linux sigue siendo Neutralino nativo.

**Limitación:** esta solución usa el navegador instalado como motor en modo ventana. No es el mismo motor Neutralino de V18.36.12. Requiere Edge, Brave o Chrome y no migra automáticamente los guardados del motor anterior: utiliza la exportación/importación JSON existente. La interfaz Windows real no pudo verificarse en este entorno; se verificó la compilación PE64 y los endpoints HTTP de manera aislada.
