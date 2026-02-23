import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markNotificationAsDeleted,
  markAllNotificationsAsRead,
} from '../../api/notifications';
import { notificationKeys } from './keys';

interface UseNotificationsParams {
  appCode?: string;
  companyId?: number;
  status?: 'unread' | 'all';
}

export function useNotifications(params?: UseNotificationsParams) {
  return useQuery({
    queryKey: notificationKeys.list(params?.status ?? 'all', params?.appCode, params?.companyId),
    queryFn: () => fetchNotifications({ status: params?.status ?? 'all', appCode: params?.appCode, companyId: params?.companyId }),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useUnreadCount(params?: { appCode?: string; companyId?: number }) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(params?.appCode, params?.companyId),
    queryFn: () => fetchUnreadCount(params),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAsDeleted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationAsDeleted(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params?: { appCode?: string; companyId?: number }) => markAllNotificationsAsRead(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
