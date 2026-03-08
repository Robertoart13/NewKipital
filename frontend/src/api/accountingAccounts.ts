/* =============================================================================
   MODULE: accountingAccounts
   =============================================================================

   Capa de acceso a datos para el módulo de Cuentas Contables.

   Responsabilidades:
   - Consultar cuentas contables
   - Obtener el detalle de una cuenta específica
   - Crear cuentas contables
   - Actualizar cuentas contables
   - Inactivar y reactivar registros
   - Consultar bitácora de auditoría
   - Consultar catálogos auxiliares

   Decisiones de diseño:
   - Todas las solicitudes HTTP se canalizan mediante `httpFetch`
   - La autenticación y manejo de tokens se delegan al interceptor
   - Este archivo contiene únicamente acceso a API
   - No incluye lógica de UI ni transformación de presentación

   ========================================================================== */

   import { httpFetch } from '../interceptors/httpInterceptor';

   /* =============================================================================
      INTERFACES DE DOMINIO
      ============================================================================= */
   
   /**
    * ============================================================================
    * Accounting Account List Item
    * ============================================================================
    *
    * Representa un elemento de la lista de cuentas contables retornado por la API.
    *
    * Incluye:
    * - datos funcionales del registro
    * - relaciones por llave foránea
    * - estado lógico
    * - campos de auditoría gestionados por el servidor
    *
    * ============================================================================
    */
   export interface AccountingAccountListItem {
     /** Identificador único de la cuenta contable. */
     id: number;
   
     /** Identificador de la empresa propietaria del registro. */
     idEmpresa: number;
   
     /** Nombre descriptivo de la cuenta contable. */
     nombre: string;
   
     /** Descripción ampliada de la cuenta; puede ser nula. */
     descripcion?: string | null;
   
     /** Código interno de la cuenta contable. */
     codigo: string;
   
     /** Identificador externo en NetSuite para integración ERP. */
     idExternoNetsuite?: string | null;
   
     /** Código externo para integración o conciliación con terceros. */
     codigoExterno?: string | null;
   
     /** Llave foránea hacia el catálogo de tipos ERP. */
     idTipoErp: number;
   
     /** Llave foránea hacia el catálogo de tipos de acción personal. */
     idTipoAccionPersonal: number;
   
     /**
      * Estado lógico del registro.
      * - 0 = activo
      * - 1 = inactivo
      */
     esInactivo: number;
   
     /** Fecha de creación asignada por el servidor en formato ISO 8601. */
     fechaCreacion?: string;
   
     /** Fecha de última modificación asignada por el servidor en formato ISO 8601. */
     fechaModificacion?: string;
   }
   
   /**
    * ============================================================================
    * Accounting Account Payload
    * ============================================================================
    *
    * Payload utilizado para crear o actualizar una cuenta contable.
    *
    * Este contrato excluye campos controlados por el backend:
    * - id
    * - flags de estado
    * - fechas de auditoría
    *
    * El servidor administra esos valores para mantener consistencia,
    * trazabilidad y control de integridad.
    *
    * ============================================================================
    */
   export interface AccountingAccountPayload {
     /** Identificador de la empresa a la que pertenece la cuenta. */
     idEmpresa: number;
   
     /** Nombre de la cuenta contable. */
     nombre: string;
   
     /** Descripción ampliada opcional. */
     descripcion?: string;
   
     /** Código interno de la cuenta contable. */
     codigo: string;
   
     /** Identificador externo NetSuite opcional. */
     idExternoNetsuite?: string;
   
     /** Código externo opcional para integración. */
     codigoExterno?: string;
   
     /** Llave foránea del tipo ERP asociado. */
     idTipoErp: number;
   
     /** Llave foránea del tipo de acción personal asociado. */
     idTipoAccionPersonal: number;
   }
   
   /**
    * ============================================================================
    * Accounting Account Type
    * ============================================================================
    *
    * Representa un tipo de cuenta ERP disponible en el catálogo.
    *
    * Ejemplos:
    * - Activo
    * - Pasivo
    * - Gasto
    * - Ingreso
    *
    * ============================================================================
    */
   export interface AccountingAccountType {
     /** Identificador único del tipo ERP. */
     id: number;
   
     /** Nombre visible del tipo ERP. */
     nombre: string;
   
     /** Descripción opcional del tipo ERP. */
     descripcion?: string | null;
   
     /** Identificador externo asociado a un ERP de terceros. */
     idExterno?: string | null;
   
     /**
      * Estado del catálogo.
      * Convención esperada:
      * - 1 = activo
      */
     status: number;
   }
   
   /**
    * ============================================================================
    * Personal Action Type
    * ============================================================================
    *
    * Representa un tipo de acción personal asociado a una cuenta contable.
    *
    * Ejemplos:
    * - Salario
    * - Bonificación
    * - Deducción
    *
    * ============================================================================
    */
   export interface PersonalActionType {
     /** Identificador único del tipo de acción personal. */
     id: number;
   
     /** Código corto del tipo. */
     codigo: string;
   
     /** Nombre descriptivo del tipo. */
     nombre: string;
   
     /**
      * Estado del registro.
      * Convención esperada:
      * - 1 = activo
      */
     estado: number;
   }
   
   /**
    * ============================================================================
    * Accounting Account Audit Trail Item
    * ============================================================================
    *
    * Representa un evento dentro de la bitácora de auditoría
    * de una cuenta contable.
    *
    * Cada elemento describe:
    * - quién realizó la acción
    * - qué acción se ejecutó
    * - sobre qué entidad ocurrió
    * - qué cambios fueron aplicados
    *
    * ============================================================================
    */
   export interface AccountingAccountAuditTrailItem {
     /** Identificador único del evento de auditoría. */
     id: string;
   
     /** Módulo que originó el evento. */
     modulo: string;
   
     /** Acción ejecutada sobre la entidad. */
     accion: string;
   
     /** Nombre lógico de la entidad afectada. */
     entidad: string;
   
     /** Identificador de la entidad afectada; puede ser nulo en eventos globales. */
     entidadId: string | null;
   
     /** ID del usuario actor que ejecutó la acción. */
     actorUserId: number | null;
   
     /** Nombre del usuario actor. */
     actorNombre: string | null;
   
     /** Email del usuario actor. */
     actorEmail: string | null;
   
     /** Resumen textual del evento. */
     descripcion: string;
   
     /** Fecha de creación del evento en formato ISO 8601. */
     fechaCreacion: string | null;
   
     /** Metadata libre asociada al evento. */
     metadata: Record<string, unknown> | null;
   
     /**
      * Lista de cambios realizados.
      * En eventos de creación puede venir vacía.
      */
     cambios: Array<{
       /** Nombre del campo afectado. */
       campo: string;
   
       /** Valor anterior serializado. */
       antes: string;
   
       /** Valor posterior serializado. */
       despues: string;
     }>;
   }
   
   /* =============================================================================
      FUNCIONES AUXILIARES
      ============================================================================= */
   
   /**
    * ============================================================================
    * Parse Error Message
    * ============================================================================
    *
    * Normaliza el mensaje de error retornado por la API.
    *
    * Soporta respuestas donde `message` puede venir como:
    * - string
    * - string[]
    * - undefined
    *
    * Este comportamiento es común en NestJS y class-validator,
    * por lo que se centraliza aquí para evitar repetición.
    *
    * @param res - Respuesta HTTP fallida.
    * @param fallbackMessage - Mensaje genérico de respaldo.
    *
    * @returns Mensaje final listo para ser lanzado como excepción.
    *
    * ============================================================================
    */
   async function parseErrorMessage(res: Response, fallbackMessage: string): Promise<string> {
     /** Intenta parsear el body de error como JSON. */
     const error = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
   
     /** Unifica errores de validación múltiples en una sola cadena legible. */
     const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
   
     /** Retorna el mensaje específico o el mensaje de respaldo. */
     return message || fallbackMessage;
   }
   
   /* =============================================================================
      API: OPERACIONES CRUD
      ============================================================================= */
   
   /**
    * ============================================================================
    * Fetch Accounting Accounts
    * ============================================================================
    *
    * Obtiene la lista de cuentas contables con filtros opcionales.
    *
    * Prioridad de filtros:
    * 1. `idEmpresas` para consulta multiempresa
    * 2. `idEmpresa` para consulta de una sola empresa
    * 3. sin filtro para usuarios con acceso global
    *
    * @param idEmpresa - ID de una empresa individual.
    * @param showInactive - Si es `true`, retorna únicamente registros inactivos.
    * @param idEmpresas - Lista de IDs de empresa para filtrado múltiple.
    *
    * @returns Arreglo de cuentas contables.
    *
    * @throws {Error} Si la petición falla.
    *
    * ============================================================================
    */
   export async function fetchAccountingAccounts(
     idEmpresa?: number,
     showInactive = false,
     idEmpresas?: number[],
   ): Promise<AccountingAccountListItem[]> {
     /** Inicializa el contenedor de query params. */
     const params = new URLSearchParams();
   
     /**
      * Si existe un filtro multiempresa, tiene prioridad sobre el filtro singular
      * porque representa una intención más específica del consumidor.
      */
     if (idEmpresas && idEmpresas.length > 0) {
       params.set('idEmpresas', idEmpresas.join(','));
     } else if (idEmpresa) {
       /** Aplica filtro por una sola empresa cuando no existe filtro múltiple. */
       params.set('idEmpresa', String(idEmpresa));
     }
   
     /** Agrega el flag para solicitar únicamente registros inactivos. */
     if (showInactive) {
       params.set('inactiveOnly', 'true');
     }
   
     /** Serializa los parámetros para anexarlos al endpoint. */
     const qs = params.toString();
   
     /** Ejecuta la solicitud HTTP al endpoint de cuentas contables. */
     const res = await httpFetch(`/accounting-accounts${qs ? `?${qs}` : ''}`);
   
     /** Valida la respuesta HTTP antes de intentar leer el body. */
     if (!res.ok) {
       throw new Error('Error al cargar cuentas contables');
     }
   
     /** Retorna la respuesta JSON tipada como lista de cuentas contables. */
     return res.json();
   }
   
   /**
    * ============================================================================
    * Fetch Accounting Account
    * ============================================================================
    *
    * Obtiene el detalle completo de una cuenta contable por su identificador.
    *
    * @param id - Identificador único de la cuenta contable.
    *
    * @returns Objeto con el detalle de la cuenta.
    *
    * @throws {Error} Si la cuenta no existe o la petición falla.
    *
    * ============================================================================
    */
   export async function fetchAccountingAccount(id: number): Promise<AccountingAccountListItem> {
     /** Ejecuta la consulta del recurso específico. */
     const res = await httpFetch(`/accounting-accounts/${id}`);
   
     /** Verifica si el servidor respondió correctamente. */
     if (!res.ok) {
       throw new Error('Error al cargar cuenta contable');
     }
   
     /** Retorna el detalle de la cuenta contable. */
     return res.json();
   }
   
   /**
    * ============================================================================
    * Create Accounting Account
    * ============================================================================
    *
    * Crea una nueva cuenta contable.
    *
    * El backend puede devolver errores de validación con formato `string[]`,
    * por lo que se normaliza el mensaje antes de lanzar la excepción.
    *
    * @param payload - Datos requeridos para crear la cuenta contable.
    *
    * @returns La cuenta contable creada por el servidor.
    *
    * @throws {Error} Si ocurre un error de validación o una falla general.
    *
    * ============================================================================
    */
   export async function createAccountingAccount(
     payload: AccountingAccountPayload,
   ): Promise<AccountingAccountListItem> {
     /** Ejecuta la solicitud de creación. */
     const res = await httpFetch('/accounting-accounts', {
       method: 'POST',
       body: JSON.stringify(payload),
     });
   
     /** Maneja errores de negocio o validación retornados por el servidor. */
     if (!res.ok) {
       const message = await parseErrorMessage(res, 'Error al crear cuenta contable');
       throw new Error(message);
     }
   
     /** Retorna la entidad creada con sus valores finales asignados por backend. */
     return res.json();
   }
   
   /**
    * ============================================================================
    * Update Accounting Account
    * ============================================================================
    *
    * Actualiza parcialmente una cuenta contable existente.
    *
    * Se utiliza `Partial<AccountingAccountPayload>` para permitir actualizaciones
    * parciales sin obligar al consumidor a reenviar la estructura completa.
    *
    * @param id - Identificador de la cuenta a actualizar.
    * @param payload - Campos a modificar.
    *
    * @returns La cuenta contable actualizada.
    *
    * @throws {Error} Si ocurre un error de validación o una falla general.
    *
    * ============================================================================
    */
   export async function updateAccountingAccount(
     id: number,
     payload: Partial<AccountingAccountPayload>,
   ): Promise<AccountingAccountListItem> {
     /** Ejecuta la solicitud de actualización del registro. */
     const res = await httpFetch(`/accounting-accounts/${id}`, {
       method: 'PUT',
       body: JSON.stringify(payload),
     });
   
     /** Normaliza el error si la respuesta HTTP no fue exitosa. */
     if (!res.ok) {
       const message = await parseErrorMessage(res, 'Error al actualizar cuenta contable');
       throw new Error(message);
     }
   
     /** Retorna la entidad actualizada según respuesta del backend. */
     return res.json();
   }
   
   /* =============================================================================
      API: GESTIÓN DE ESTADO
      ============================================================================= */
   
   /**
    * ============================================================================
    * Inactivate Accounting Account
    * ============================================================================
    *
    * Inactiva una cuenta contable mediante soft-delete.
    *
    * Esta operación no elimina físicamente el registro, sino que marca
    * `esInactivo = 1` para preservar integridad referencial e historial.
    *
    * @param id - Identificador de la cuenta contable a inactivar.
    *
    * @returns La cuenta contable ya marcada como inactiva.
    *
    * @throws {Error} Si la operación falla.
    *
    * ============================================================================
    */
   export async function inactivateAccountingAccount(id: number): Promise<AccountingAccountListItem> {
     /** Ejecuta el endpoint de inactivación lógica. */
     const res = await httpFetch(`/accounting-accounts/${id}/inactivate`, {
       method: 'PATCH',
     });
   
     /** Verifica que la operación haya sido exitosa. */
     if (!res.ok) {
       throw new Error('Error al inactivar cuenta contable');
     }
   
     /** Retorna la entidad actualizada en estado inactivo. */
     return res.json();
   }
   
   /**
    * ============================================================================
    * Reactivate Accounting Account
    * ============================================================================
    *
    * Reactiva una cuenta contable previamente inactivada.
    *
    * Esta operación revierte el valor de `esInactivo` a `0`,
    * haciendo visible nuevamente el registro en los listados activos.
    *
    * @param id - Identificador de la cuenta contable a reactivar.
    *
    * @returns La cuenta contable reactivada.
    *
    * @throws {Error} Si la operación falla.
    *
    * ============================================================================
    */
   export async function reactivateAccountingAccount(id: number): Promise<AccountingAccountListItem> {
     /** Ejecuta el endpoint de reactivación lógica. */
     const res = await httpFetch(`/accounting-accounts/${id}/reactivate`, {
       method: 'PATCH',
     });
   
     /** Verifica que la operación haya sido exitosa. */
     if (!res.ok) {
       throw new Error('Error al reactivar cuenta contable');
     }
   
     /** Retorna la entidad actualizada en estado activo. */
     return res.json();
   }
   
   /* =============================================================================
      API: AUDITORÍA
      ============================================================================= */
   
   /**
    * ============================================================================
    * Fetch Accounting Account Audit Trail
    * ============================================================================
    *
    * Obtiene el historial de auditoría de una cuenta contable específica.
    *
    * El resultado suele venir ordenado por fecha descendente y contiene:
    * - actor
    * - acción
    * - descripción
    * - metadata
    * - detalle de cambios
    *
    * @param id - Identificador de la cuenta contable.
    * @param limit - Número máximo de eventos a retornar. Por defecto `200`.
    *
    * @returns Lista de eventos de auditoría.
    *
    * @throws {Error} Si la petición falla.
    *
    * ============================================================================
    */
   export async function fetchAccountingAccountAuditTrail(
     id: number,
     limit = 200,
   ): Promise<AccountingAccountAuditTrailItem[]> {
     /** Construye el query string con el límite solicitado. */
     const qs = new URLSearchParams({ limit: String(limit) });
   
     /** Ejecuta la consulta a la bitácora del recurso específico. */
     const res = await httpFetch(`/accounting-accounts/${id}/audit-trail?${qs}`);
   
     /** Si la respuesta falla, intenta recuperar el mensaje específico del backend. */
     if (!res.ok) {
       const message = await parseErrorMessage(res, 'Error al cargar bitácora de cuentas contables');
       throw new Error(message);
     }
   
     /** Retorna la colección de eventos de auditoría. */
     return res.json();
   }
   
   /* =============================================================================
      API: CATÁLOGOS AUXILIARES
      ============================================================================= */
   
   /**
    * ============================================================================
    * Fetch Accounting Account Types
    * ============================================================================
    *
    * Obtiene el catálogo de tipos de cuenta ERP disponibles.
    *
    * Este catálogo alimenta el selector `idTipoErp` dentro del formulario
    * de mantenimiento de cuentas contables.
    *
    * @returns Lista de tipos de cuenta ERP.
    *
    * @throws {Error} Si la petición falla.
    *
    * ============================================================================
    */
   export async function fetchAccountingAccountTypes(): Promise<AccountingAccountType[]> {
     /** Ejecuta la consulta del catálogo de tipos ERP. */
     const res = await httpFetch('/accounting-accounts/types');
   
     /** Verifica si la respuesta fue exitosa. */
     if (!res.ok) {
       throw new Error('Error al cargar tipos de cuenta');
     }
   
     /** Retorna el catálogo solicitado. */
     return res.json();
   }
   
   /**
    * ============================================================================
    * Fetch Personal Action Types
    * ============================================================================
    *
    * Obtiene el catálogo de tipos de acción personal disponibles.
    *
    * Este catálogo se utiliza para poblar el selector
    * `idTipoAccionPersonal` en el formulario de cuentas contables.
    *
    * @returns Lista de tipos de acción personal.
    *
    * @throws {Error} Si la petición falla.
    *
    * ============================================================================
    */
   export async function fetchPersonalActionTypes(): Promise<PersonalActionType[]> {
     /** Ejecuta la consulta del catálogo de tipos de acción personal. */
     const res = await httpFetch('/accounting-accounts/personal-action-types');
   
     /** Verifica si la respuesta fue exitosa. */
     if (!res.ok) {
       throw new Error('Error al cargar tipos de acción personal');
     }
   
     /** Retorna el catálogo solicitado. */
     return res.json();
   }