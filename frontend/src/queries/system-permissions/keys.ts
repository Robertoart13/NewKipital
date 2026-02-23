export const systemPermissionKeys = {
  all: ['system-permissions'] as const,
  list: (filters?: { modulo?: string; includeInactive?: boolean }) =>
    ['system-permissions', filters ?? {}] as const,
};
