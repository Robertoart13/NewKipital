import { describe, it, expect, beforeEach } from 'vitest';
import authReducer, {
  setCredentials,
  setUserAvatar,
  setSessionLoaded,
  logout,
  type AuthState,
  type User,
  type UserCompanyInfo,
} from './authSlice';

describe('authSlice', () => {
  const initialState: AuthState = {
    user: null,
    companies: [],
    isAuthenticated: false,
    sessionLoading: true,
  };

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    roles: ['EMPLOYEE_VIEWER'],
    enabledApps: ['kpital'],
    companyIds: ['1', '2'],
  };

  const mockCompanies: UserCompanyInfo[] = [
    { id: 1, nombre: 'Company A', codigo: 'CA' },
    { id: 2, nombre: 'Company B', codigo: 'CB' },
  ];

  describe('initial state', () => {
    it('should have correct initial state', () => {
      expect(initialState).toEqual({
        user: null,
        companies: [],
        isAuthenticated: false,
        sessionLoading: true,
      });
    });
  });

  describe('setCredentials', () => {
    it('should set user and mark as authenticated', () => {
      const state = authReducer(
        initialState,
        setCredentials({ user: mockUser, companies: mockCompanies }),
      );

      expect(state.user).toEqual(mockUser);
      expect(state.companies).toEqual(mockCompanies);
      expect(state.isAuthenticated).toBe(true);
      expect(state.sessionLoading).toBe(false);
    });

    it('should set user without companies', () => {
      const state = authReducer(initialState, setCredentials({ user: mockUser }));

      expect(state.user).toEqual(mockUser);
      expect(state.companies).toEqual([]);
      expect(state.isAuthenticated).toBe(true);
      expect(state.sessionLoading).toBe(false);
    });

    it('should set user with empty companies array', () => {
      const state = authReducer(initialState, setCredentials({ user: mockUser, companies: [] }));

      expect(state.user).toEqual(mockUser);
      expect(state.companies).toEqual([]);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should override previous user', () => {
      const stateWithUser: AuthState = {
        ...initialState,
        user: mockUser,
        isAuthenticated: true,
      };

      const newUser: User = {
        ...mockUser,
        id: '2',
        email: 'newuser@example.com',
        name: 'New User',
      };

      const state = authReducer(stateWithUser, setCredentials({ user: newUser }));

      expect(state.user).toEqual(newUser);
      expect(state.user?.id).toBe('2');
    });

    it('should always set sessionLoading to false', () => {
      const state = authReducer(initialState, setCredentials({ user: mockUser }));
      expect(state.sessionLoading).toBe(false);
    });
  });

  describe('setUserAvatar', () => {
    it('should set avatar URL for existing user', () => {
      const stateWithUser: AuthState = {
        ...initialState,
        user: mockUser,
        isAuthenticated: true,
      };

      const avatarUrl = 'https://example.com/avatar.jpg';
      const state = authReducer(stateWithUser, setUserAvatar(avatarUrl));

      expect(state.user?.avatarUrl).toBe(avatarUrl);
    });

    it('should set null avatar URL', () => {
      const stateWithUser: AuthState = {
        ...initialState,
        user: { ...mockUser, avatarUrl: 'https://example.com/avatar.jpg' },
        isAuthenticated: true,
      };

      const state = authReducer(stateWithUser, setUserAvatar(null));

      expect(state.user?.avatarUrl).toBeNull();
    });

    it('should not crash when user is null', () => {
      const state = authReducer(initialState, setUserAvatar('https://example.com/avatar.jpg'));

      expect(state.user).toBeNull();
      expect(state).toEqual(initialState); // State should be unchanged
    });

    it('should preserve other user properties', () => {
      const stateWithUser: AuthState = {
        ...initialState,
        user: mockUser,
        isAuthenticated: true,
      };

      const state = authReducer(stateWithUser, setUserAvatar('https://example.com/avatar.jpg'));

      expect(state.user?.id).toBe(mockUser.id);
      expect(state.user?.email).toBe(mockUser.email);
      expect(state.user?.name).toBe(mockUser.name);
      expect(state.user?.roles).toEqual(mockUser.roles);
    });
  });

  describe('setSessionLoaded', () => {
    it('should set sessionLoading to false', () => {
      const state = authReducer(initialState, setSessionLoaded());

      expect(state.sessionLoading).toBe(false);
    });

    it('should not change other state properties', () => {
      const stateWithUser: AuthState = {
        user: mockUser,
        companies: mockCompanies,
        isAuthenticated: true,
        sessionLoading: true,
      };

      const state = authReducer(stateWithUser, setSessionLoaded());

      expect(state.user).toEqual(mockUser);
      expect(state.companies).toEqual(mockCompanies);
      expect(state.isAuthenticated).toBe(true);
      expect(state.sessionLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should reset state to initial values', () => {
      const stateWithUser: AuthState = {
        user: mockUser,
        companies: mockCompanies,
        isAuthenticated: true,
        sessionLoading: false,
      };

      const state = authReducer(stateWithUser, logout());

      expect(state.user).toBeNull();
      expect(state.companies).toEqual([]);
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionLoading).toBe(false);
    });

    it('should work when already logged out', () => {
      const state = authReducer(initialState, logout());

      expect(state).toEqual({
        user: null,
        companies: [],
        isAuthenticated: false,
        sessionLoading: false,
      });
    });

    it('should clear all user data', () => {
      const stateWithData: AuthState = {
        user: {
          ...mockUser,
          avatarUrl: 'https://example.com/avatar.jpg',
          roles: ['ADMIN', 'USER'],
          enabledApps: ['kpital', 'timewise'],
          companyIds: ['1', '2', '3'],
        },
        companies: [
          { id: 1, nombre: 'Company A', codigo: 'CA' },
          { id: 2, nombre: 'Company B', codigo: 'CB' },
          { id: 3, nombre: 'Company C', codigo: 'CC' },
        ],
        isAuthenticated: true,
        sessionLoading: false,
      };

      const state = authReducer(stateWithData, logout());

      expect(state.user).toBeNull();
      expect(state.companies).toEqual([]);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle login -> update avatar -> logout flow', () => {
      // Login
      let state = authReducer(initialState, setCredentials({ user: mockUser, companies: mockCompanies }));
      expect(state.isAuthenticated).toBe(true);

      // Update avatar
      state = authReducer(state, setUserAvatar('https://example.com/avatar.jpg'));
      expect(state.user?.avatarUrl).toBe('https://example.com/avatar.jpg');

      // Logout
      state = authReducer(state, logout());
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('should handle session restore flow', () => {
      // Initial loading state
      let state = initialState;
      expect(state.sessionLoading).toBe(true);

      // Session restore successful
      state = authReducer(state, setCredentials({ user: mockUser, companies: mockCompanies }));
      expect(state.isAuthenticated).toBe(true);
      expect(state.sessionLoading).toBe(false);
    });

    it('should handle failed session restore', () => {
      // Initial loading state
      let state = initialState;
      expect(state.sessionLoading).toBe(true);

      // Session restore failed
      state = authReducer(state, setSessionLoaded());
      expect(state.isAuthenticated).toBe(false);
      expect(state.sessionLoading).toBe(false);
      expect(state.user).toBeNull();
    });

    it('should handle switching companies', () => {
      const initialCompanies: UserCompanyInfo[] = [
        { id: 1, nombre: 'Company A', codigo: 'CA' },
      ];

      // Login with Company A
      let state = authReducer(
        initialState,
        setCredentials({ user: mockUser, companies: initialCompanies }),
      );

      // Switch to multiple companies
      const newCompanies: UserCompanyInfo[] = [
        { id: 1, nombre: 'Company A', codigo: 'CA' },
        { id: 2, nombre: 'Company B', codigo: 'CB' },
      ];

      state = authReducer(state, setCredentials({ user: mockUser, companies: newCompanies }));
      expect(state.companies).toEqual(newCompanies);
      expect(state.companies).toHaveLength(2);
    });

    it('should handle user with multiple enabled apps', () => {
      const userWithApps: User = {
        ...mockUser,
        enabledApps: ['kpital', 'timewise'],
      };

      const state = authReducer(initialState, setCredentials({ user: userWithApps }));

      expect(state.user?.enabledApps).toEqual(['kpital', 'timewise']);
    });

    it('should handle user with multiple roles', () => {
      const userWithRoles: User = {
        ...mockUser,
        roles: ['ADMIN', 'EMPLOYEE_MANAGER', 'SUPERVISOR_TIMEWISE'],
      };

      const state = authReducer(initialState, setCredentials({ user: userWithRoles }));

      expect(state.user?.roles).toEqual(['ADMIN', 'EMPLOYEE_MANAGER', 'SUPERVISOR_TIMEWISE']);
    });
  });

  describe('Type Safety', () => {
    it('should maintain PlatformApp type for enabledApps', () => {
      const userWithValidApps: User = {
        ...mockUser,
        enabledApps: ['kpital', 'timewise'],
      };

      const state = authReducer(initialState, setCredentials({ user: userWithValidApps }));

      expect(state.user?.enabledApps).toEqual(['kpital', 'timewise']);
    });

    it('should maintain UserCompanyInfo structure', () => {
      const state = authReducer(
        initialState,
        setCredentials({ user: mockUser, companies: mockCompanies }),
      );

      state.companies.forEach((company) => {
        expect(company).toHaveProperty('id');
        expect(company).toHaveProperty('nombre');
        expect(company).toHaveProperty('codigo');
        expect(typeof company.id).toBe('number');
        expect(typeof company.nombre).toBe('string');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user roles', () => {
      const userWithoutRoles: User = {
        ...mockUser,
        roles: [],
      };

      const state = authReducer(initialState, setCredentials({ user: userWithoutRoles }));

      expect(state.user?.roles).toEqual([]);
    });

    it('should handle empty enabled apps', () => {
      const userWithoutApps: User = {
        ...mockUser,
        enabledApps: [],
      };

      const state = authReducer(initialState, setCredentials({ user: userWithoutApps }));

      expect(state.user?.enabledApps).toEqual([]);
    });

    it('should handle empty company IDs', () => {
      const userWithoutCompanies: User = {
        ...mockUser,
        companyIds: [],
      };

      const state = authReducer(initialState, setCredentials({ user: userWithoutCompanies }));

      expect(state.user?.companyIds).toEqual([]);
    });

    it('should handle user with null codigo in companies', () => {
      const companiesWithNullCodigo: UserCompanyInfo[] = [
        { id: 1, nombre: 'Company A', codigo: null },
      ];

      const state = authReducer(
        initialState,
        setCredentials({ user: mockUser, companies: companiesWithNullCodigo }),
      );

      expect(state.companies[0].codigo).toBeNull();
    });
  });
});
