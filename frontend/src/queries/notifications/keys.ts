export const notificationKeys = {
  all: ['notifications'] as const,
  list: (status: string, appCode?: string, companyId?: number) =>
    ['notifications', 'list', status, appCode, companyId] as const,
  unreadCount: (appCode?: string, companyId?: number) =>
    ['notifications', 'unreadCount', appCode, companyId] as const,
};
