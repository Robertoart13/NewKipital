import { configureStore } from '@reduxjs/toolkit';

import { companyChangeListener } from './middleware/companyChangeListener';
import activeAppReducer from './slices/activeAppSlice';
import activeCompanyReducer from './slices/activeCompanySlice';
import authReducer from './slices/authSlice';
import menuReducer from './slices/menuSlice';
import permissionsReducer from './slices/permissionsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    permissions: permissionsReducer,
    activeCompany: activeCompanyReducer,
    activeApp: activeAppReducer,
    menu: menuReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(companyChangeListener),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
