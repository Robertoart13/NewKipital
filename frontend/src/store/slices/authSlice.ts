import { createSlice } from '@reduxjs/toolkit';

export type PlatformApp = 'kpital' | 'timewise';

export interface UserCompanyInfo {
  id: number;
  nombre: string;
  codigo: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  roles: string[];
  enabledApps: PlatformApp[];
  companyIds: string[];
}

/**
 * El token JWT NO se almacena en Redux ni en JS.
 * Viaja en cookie httpOnly — el navegador lo envía automáticamente.
 * Redux solo trackea si el usuario está autenticado, sus datos, y sus empresas.
 */
export interface AuthState {
  user: User | null;
  companies: UserCompanyInfo[];
  isAuthenticated: boolean;
  sessionLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  companies: [],
  isAuthenticated: false,
  sessionLoading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: { payload: { user: User; companies?: UserCompanyInfo[] } }) => {
      state.user = action.payload.user;
      state.companies = action.payload.companies ?? [];
      state.isAuthenticated = true;
      state.sessionLoading = false;
    },
    setUserAvatar: (state, action: { payload: string | null }) => {
      if (state.user) {
        state.user.avatarUrl = action.payload;
      }
    },
    setSessionLoaded: (state) => {
      state.sessionLoading = false;
    },
    logout: (state) => {
      state.user = null;
      state.companies = [];
      state.isAuthenticated = false;
      state.sessionLoading = false;
    },
  },
});

export const { setCredentials, setUserAvatar, setSessionLoaded, logout } = authSlice.actions;
export default authSlice.reducer;
