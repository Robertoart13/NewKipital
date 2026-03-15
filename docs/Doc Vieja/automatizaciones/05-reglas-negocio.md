# 05 - Reglas de Negocio

## Reglas obligatorias
1. Empleado activo debe tener identidad digital asociada.
2. Empleado activo debe terminar con datos sensibles cifrados.
3. Cifrado no debe depender de exponer plaintext en UI/API.
4. Errores terminales no se reintentan automaticamente.
5. Reintentos no terminales tienen limite configurable (actual: 5).

## Reglas de enqueue
Identidad:
- `estado_empleado = 1`
- `id_usuario IS NULL`
- Sin job activo en cola (`PENDING` o `PROCESSING`)

Cifrado:
- `datos_encriptados_empleado = 0 OR NULL`
- Sin job activo en cola (`PENDING` o `PROCESSING`)

## Politica de duplicado email (actual)
Comportamiento actual implementado:
- Si existe usuario con email, se intenta reutilizar.
- Solo se permite reuse seguro:
  - Misma empresa.
  - Sin conflicto de `cedula_hash` cuando ambos existen.
- Si falla condicion segura: `ERROR_DUPLICATE`.

## Dependencias de configuracion
Si falta app o rol requerido:
- Estado terminal `ERROR_CONFIG`.
- Sin loops de retry.
- Requiere correccion operativa.
