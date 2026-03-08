/* =============================================================================
   HOOK: useNotificationSocket
   =============================================================================

   Conexion WebSocket para notificaciones en tiempo real.

   Responsabilidades:
   - Conectar a socket.io
   - Escuchar notification:new, notification:count-update, notification:list-update
   - Invalidar queries de notificaciones
   - Mostrar mensaje al usuario en nuevo evento

   ========================================================================== */

import { useQueryClient } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

import { API_URL } from '../config/api';
import { notificationKeys } from '../queries/notifications/keys';

const WS_BASE = API_URL.replace(/\/api$/, '');

/**
 * ============================================================================
 * useNotificationSocket
 * ============================================================================
 *
 * Conecta WebSocket para notificaciones. Invalida queries al recibir eventos.
 *
 * @param enabled - Si true, conecta; si false, no hace nada.
 *
 * ============================================================================
 */
export function useNotificationSocket(enabled: boolean) {
  const { message } = AntdApp.useApp();
  const queryClient = useQueryClient();
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const connectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (socketRef.current) return;

    const socket = io(WS_BASE, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: false,
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 5000,
    });

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    socket.on('notification:new', () => {
      invalidate();
      message.info('Tiene un nuevo mensaje. Revise en la campanita.');
    });
    socket.on('notification:count-update', () => invalidate());
    socket.on('notification:list-update', () => invalidate());
    socket.on('connect_error', () => {});

    connectTimerRef.current = window.setTimeout(() => {
      socketRef.current = socket;
      socket.connect();
      connectTimerRef.current = null;
    }, 0);

    return () => {
      if (connectTimerRef.current !== null) {
        window.clearTimeout(connectTimerRef.current);
        connectTimerRef.current = null;
      }
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, queryClient]);

  return socketRef;
}
