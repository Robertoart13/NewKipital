export const roleKeys = {
  byApp: (appCode: 'timewise' | 'kpital') => ['roles', appCode] as const,
};
