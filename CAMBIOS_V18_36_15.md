# NCG V18.36.15 — Preparación transparente de publicación OSS y SignPath

- Archivo `LICENSE` MIT con alcance limitado al código propio y documentos sobre los que exista derecho de licencia.
- `LICENSE_SCOPE.md` y manifiesto exhaustivo de recursos pendientes de validar.
- `scripts/verificar_licencias.py --release` bloquea la liberación firmada mientras existan recursos sin licencia OSI y evidencias.
- Borradores de política de firma, privacidad y solicitud formal; guía para configurar GitHub y SignPath sin exponer credenciales.
- CI de firma comprueba licencias antes de solicitar firmar.
- Empaquetado Windows firmado no incluye el ejecutable binario Linux de terceros.
- Sin cambios de gameplay: se mantienen 129 monedas / 258 caras y guardados 6.50.
- **La solicitud no está enviada, ningún ejecutable está firmado.**
