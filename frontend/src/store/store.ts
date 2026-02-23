import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import permissionsReducer from './slices/permissionsSlice';
import activeCompanyReducer from './slices/activeCompanySlice';
import activeAppReducer from './slices/activeAppSlice';
import menuReducer from './slices/menuSlice';
import { companyChangeListener } from './middleware/companyChangeListener';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    permissions: permissionsReducer,
    activeCompany: activeCompanyReducer,
    activeApp: activeAppReducer,
    menu: menuReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(companyChangeListener),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
