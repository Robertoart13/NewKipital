/* =============================================================================
   MODULE: api config
   =============================================================================

   Configuracion base de la API.

   Responsabilidades:
   - URL base del API
   - En desarrollo apunta a localhost:3000
   - En produccion se configura via variable de entorno VITE_API_URL

   ========================================================================== */

/**
 * ============================================================================
 * API_URL
 * ============================================================================
 *
 * URL base del API.
 *
 * ============================================================================
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

