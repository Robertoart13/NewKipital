import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import { io } from 'socket.io-client';
import { API_URL } from '../config/api';
import { notificationKeys } from '../queries/notifications/keys';

const WS_BASE = API_URL.replace(/\/api$/, '');

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
  }, [enabled, queryClient]);

  return socketRef;
}
