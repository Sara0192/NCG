# NCG V18.36.15 — Preparación para SignPath Foundation

**Importante: este ZIP NO es una aplicación firmada.** Es una versión de NCG con los flujos de GitHub Actions y los ficheros para solicitar una firma auténtica una vez que el proyecto sea aceptado.

## Qué se ha preparado

- `.github/workflows/comprobar.yml`: CI de auditoría de JavaScript, monedas y compilación Windows x64, sin secretos ni firma.
- `.github/workflows/firmar-signpath.yml`: compilación desde fuentes Go en un runner oficial Windows, inserción de metadatos PE de versión, subida del ejecutable no firmado como artefacto verificable, petición a SignPath, verificación Authenticode **y entrega del ZIP exclusivamente si la firma es válida, con un README específico para el paquete firmado y suma SHA-256**.
- `.signpath/artefacto-windows.xml`: configuración de SignPath para firmar `NCG_V18_36_15.exe` dentro del ZIP de GitHub Actions; los metadatos de versión y producto son obligatorios.
- `scripts/verificar_pe.py` y `scripts/comprobar_signpath.py`: comprobaciones locales sin firma ni certificados.
- `docs/PROCEDENCIA_Y_DERECHOS_PENDIENTES.md`: diferencia derechos de fotos de referencia y recreaciones IA; no altera licencias existentes.

## Pasos que quedan en manos de la responsable del proyecto

1. **Elegir las licencias abiertas** y verificar los derechos sobre todos los elementos distribuidos, en especial `music_loop.mp3`. El proyecto debe ser OSI-open-source según los términos de SignPath. No se añade aquí un archivo `LICENSE` sin autorización de la titular.
2. **Autorizar expresamente** la publicación del repositorio y realizar la primera publicación del juego como proyecto OSS. Publicar el repositorio en GitHub **sin usar el ZIP de distribución como único código fuente**: subir archivos descomprimidos al repositorio. No se ha efectuado ninguna publicación externa.
3. Configurar MFA en GitHub y SignPath, organizar permisos para autores, revisores y aprobadores; publicar política de firma real en página de proyecto / descargas.
4. Presentar solicitud en https://signpath.org/ y esperar aceptación. SignPath puede denegar proyectos nuevos sin trayectoria o sin reputación demostrable.
5. En SignPath crear proyecto, un artefacto configurado con el XML, una signing policy, y conectar GitHub como Trusted Build System; instalar la app GitHub de SignPath si se exige.
6. Configurar **secreto** `SIGNPATH_API_TOKEN` (nunca en código) y las **variables de repositorio**: `SIGNPATH_ORGANIZATION_ID`, `SIGNPATH_PROJECT_SLUG`, `SIGNPATH_SIGNING_POLICY_SLUG`, `SIGNPATH_ARTIFACT_CONFIGURATION_SLUG`.
7. Ejecutar manualmente workflow `NCG - firma SignPath`. Se bloqueará si faltan datos, o si no hay una firma válida; el firmante debe aprobar la solicitud en SignPath.
8. Publicar el artefacto `NCG-V18-36-14-FIRMADO` (solo tras firma) y su hash SHA-256. Verificar manualmente SmartScreen en Windows real; la firma por sí sola **no garantiza** que no aparezca nunca una advertencia.

## Qué contiene el ejecutable

El lanzador está escrito en Go; no requiere descargar Neutralinojs. Usa Edge, Brave o Chrome en modo ventana de aplicación y guarda la partida en `%LOCALAPPDATA%\NCG\Guardados`. El juego sigue incluyendo sus recursos en `resources/`, el lanzador Linux x86_64 y el guardado de formato 6.50.

## Limitaciones de esta entrega

- No se ha solicitado la firma ni hay certificado. Falta aprobar y publicar el repositorio y demostrar los derechos de redistribución de la música y recursos.
- El flujo GitHub Actions no se ha ejecutado en servidores de GitHub/SignPath: se ha validado estáticamente. La generación de recursos de Windows con `goversioninfo` se realiza en el runner, no en el ejecutable local incluido.
- Los `.exe` en este ZIP son **SIN FIRMA**; no usarlos como prueba de una firma real.

Fuentes: https://docs.signpath.io/trusted-build-systems/github , https://docs.signpath.io/artifact-configuration/examples y https://signpath.org/terms .
