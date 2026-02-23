/**
 * URL base del API.
 * En desarrollo apunta a localhost:3000.
 * En producción se configura vía variable de entorno.
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
