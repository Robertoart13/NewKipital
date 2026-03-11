# Validacion con Usuario Nuevo - KPITAL 360

Version: 1.0  
Fecha: 2026-03-11

## Objetivo
Comprobar que una persona sin conocimiento tecnico pueda operar el sistema solo con el manual.

## Perfil del validador
- Usuario nuevo sin experiencia previa en KPITAL 360.
- Rol sugerido: RRHH operativo.

## Casos de prueba de aceptacion
| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| VU-01 | Ingresar al sistema y abrir `Ayuda` | Encuentra el manual y entiende ruta de lectura | Pendiente |
| VU-02 | Crear empresa | Guarda correctamente sin soporte | Pendiente |
| VU-03 | Crear empleado con datos obligatorios | Empleado creado y visible en listado | Pendiente |
| VU-04 | Configurar articulo y movimiento de nomina | Queda disponible para acciones | Pendiente |
| VU-05 | Crear accion de personal | Accion creada en estado pendiente | Pendiente |
| VU-06 | Cargar planilla regular | Tabla de empleados visible | Pendiente |
| VU-07 | Marcar solo algunos empleados | Totales muestran solo marcados | Pendiente |
| VU-08 | Verificar empleado marcado | Empleado queda bloqueado para cambios | Pendiente |
| VU-09 | Intentar crear/aprobar accion en empleado bloqueado | Sistema informa restriccion | Pendiente |
| VU-10 | Aplicar planilla | Flujo completo termina sin asistencia tecnica | Pendiente |

## Registro operativo de resultados
| Proceso | Resultado | Observaciones |
|---|---|---|
| Ingreso al sistema | Pendiente | |
| Crear empleado | Pendiente | |
| Registrar movimiento | Pendiente | |
| Generar planilla | Pendiente | |
| Revisar calculos | Pendiente | |
| Aplicar planilla | Pendiente | |

## Criterio de aprobacion
- Aprobado si completa >= 9/10 casos sin ayuda tecnica directa.
- Si falla, registrar punto exacto y mejorar documentacion.

## Evidencia requerida
- Nombre del validador.
- Fecha y hora.
- Capturas por caso (cuando aplique).
- Observaciones de comprension.

## Resultado final
| Campo | Valor |
|---|---|
| Validador | Por definir |
| Fecha | Por definir |
| Casos aprobados | 0/10 |
| Casos fallidos | 0/10 |
| Requiere ajustes de manual | Si/No |

## Acta de validacion (cierre)
| Campo | Valor |
|---|---|
| Usuario validador | Por definir |
| Rol simulado | RRHH operativo |
| Fecha de ejecucion | Por definir |
| Resultado global | Pendiente |
| Conclusion | Pendiente |

Texto sugerido al completar:
- "Todos los procesos pudieron completarse utilizando unicamente el manual."
- "El manual permite operar el sistema sin asistencia tecnica."

## Referencias
- [Manual de Usuario Enterprise](./14-MANUAL-USUARIO-ENTERPRISE-KPITAL360.md)
- [Guia Rapida de Usuario](./00-GUIA-RAPIDA-USUARIO.md)
