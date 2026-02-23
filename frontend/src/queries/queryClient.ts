import { QueryClient, QueryCache } from '@tanstack/react-query';

/**
 * Handler global de errores de TanStack Query.
 * Centraliza la notificación de errores — no manejar uno por uno en cada query.
 * TODO: Conectar a sistema de notificaciones (toast) cuando esté disponible.
 */
function globalQueryErrorHandler(error: unknown) {
  const message = error instanceof Error ? error.message : 'Error al cargar los datos';
  console.error('[KPITAL Query Error]', message);
  // Cuando se integre sistema de notificaciones:
  // notificationService.error(message);
}

const queryCache = new QueryCache({
  onError: globalQueryErrorHandler,
});

/**
 * QueryClient configurado según directivas KPITAL 360.
 * - staleTime: 5 minutos (listados no cambian cada segundo)
 * - retry: 2 reintentos
 * - refetchOnWindowFocus: activado
 * - Error handling global
 */
export const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 2,
      refetchOnWindowFocus: true,
      throwOnError: false,
      meta: {
        errorMessage: 'Error al cargar los datos',
      },
    },
    mutations: {
      retry: 0,
      onError: globalQueryErrorHandler,
    },
  },
});
