/**
 * Aplicaciones de la plataforma.
 * KPITAL y TimeWise comparten identidad, BD y autenticación.
 * El acceso a cada app es un permiso independiente por usuario.
 */
export enum PlatformApp {
  KPITAL = 'kpital',
  TIMEWISE = 'timewise',
}

export const ALL_APPS = Object.values(PlatformApp);
