# Publicar NCG y tramitar firma — pasos pendientes

No se han realizado cambios en GitHub ni se ha enviado solicitud a SignPath. Este paquete es una preparación **local**, no una firma.

1. Conectar la cuenta GitHub a ChatGPT o crear el repositorio público desde GitHub con MFA activada. Nombre sugerido: `NCG` (sin asumir URL ni propietario).
2. Finalizar `docs/MANIFIESTO_DERECHOS_ASSETS.csv`, `LICENSE_SCOPE.md` y documentación de terceros. No afirmar que todo NCG es open-source hasta cerrar los derechos. `python scripts/verificar_licencias.py --release` debe pasar.
3. Subir **el contenido de la carpeta del juego** al repositorio Git, no un único ZIP. `git status` debe mostrar únicamente archivos que deseas publicar. No subir `.exe` locales, archivos `.pfx`, tokens, copias de guardados ni datos privados.
4. Publicar una primera versión pública real (sin hacer pasar el `.exe` por firmado). La documentación de lanzamiento debe enlazar a la política de firma y a la de privacidad ya revisadas.
5. Presentar solicitud en https://signpath.org/apply con la URL real del proyecto y de la descarga. SignPath Foundation puede rechazar proyectos que todavía no tengan reputación verificable.
6. Si se aprueba: instalar la GitHub App oficial de SignPath y enlazar GitHub como trusted build system en SignPath; crear proyecto y configuración usando `.signpath/artefacto-windows.xml`.
7. En GitHub configurar secreto `SIGNPATH_API_TOKEN` y variables `SIGNPATH_ORGANIZATION_ID`, `SIGNPATH_PROJECT_SLUG`, `SIGNPATH_SIGNING_POLICY_SLUG`, `SIGNPATH_ARTIFACT_CONFIGURATION_SLUG` con valores proporcionados por SignPath. **Nunca incluir el token en el repositorio.**
8. Ejecutar manualmente `.github/workflows/firmar-signpath.yml`; aprobar la solicitud desde SignPath. El flujo no debe distribuir nada como FIRMADO hasta verificar la firma Authenticode válida.
9. Probar la descarga en un Windows real; una firma válida no garantiza la desaparición inmediata de advertencias SmartScreen. Publicar SHA-256 y el enlace al código fuente correspondiente.

Documentación oficial: https://signpath.org/terms ; https://docs.signpath.io/trusted-build-systems/github .
