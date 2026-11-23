# Code signing policy — NCG (borrador de proyecto)

**Estado actual: proyecto NO aprobado por SignPath; ejecutables NO firmados.** No presentar el siguiente texto como sello de certificación.

Una vez aprobado: **Free code signing provided by SignPath.io, certificate by SignPath Foundation**.

## Autoría, revisiones y aprobaciones
- Mantenedora del proyecto: propietaria de la cuenta de GitHub en la que se publique NCG (identificar URL real).
- Committers: mantenedora y personas con permiso de escritura explícito.
- Revisores: mantenedora o colaboradores de confianza; los cambios de terceros requieren revisión previa.
- Approvers de firma: mantenedora o personal designado; **cada solicitud** debe aprobarse manualmente en SignPath.
- Autenticación: MFA obligatorio para quienes gestionen el repositorio o SignPath.

## Procedimiento
1. Compilar desde el código fuente público mediante GitHub Actions, en runners alojados por GitHub.
2. Probar y auditar; registrar el commit y el artefacto de compilación.
3. Solo después de la verificación de licencias y la aprobación de SignPath, solicitar la firma.
4. Aprobar manualmente cada solicitud y comprobar la firma Authenticode de la descarga.
5. Distribuir únicamente el ejecutable firmado con su suma SHA-256 y una referencia al commit.

## Privacidad y retirada
Ver [política de privacidad pendiente de validación](docs/POLITICA_PRIVACIDAD_BORRADOR.md). El programa se desinstala eliminando su carpeta; sus archivos de guardado permanecen en una carpeta separada y se pueden eliminar manualmente.

## Estado de la solicitud
- Repositorio público: PENDIENTE (no existe URL verificada).
- Derechos de los recursos: PENDIENTES.
- Proyecto SignPath: PENDIENTE de admisión.
- Certificado y firma: NO DISPONIBLES.
