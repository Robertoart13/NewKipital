import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { PermissionGuard } from './PermissionGuard';
import authReducer, { type User } from '../store/slices/authSlice';
import permissionsReducer from '../store/slices/permissionsSlice';
import activeCompanyReducer from '../store/slices/activeCompanySlice';
import activeAppReducer from '../store/slices/activeAppSlice';
import menuReducer from '../store/slices/menuSlice';

// Store de prueba sin middleware con efectos secundarios
function makeTestStore(preloadedState?: object) {
  return configureStore({
    reducer: {
      auth: authReducer,
      permissions: permissionsReducer,
      activeCompany: activeCompanyReducer,
      activeApp: activeAppReducer,
      menu: menuReducer,
    },
    preloadedState,
  });
}

function renderWithStore(ui: React.ReactElement, preloadedState?: object) {
  const store = makeTestStore(preloadedState);
  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>,
  );
}

const mockUser: User = {
  id: '1',
  email: 'test@kpital360.com',
  name: 'Test Admin',
  roles: ['admin'],
  enabledApps: ['kpital'],
  companyIds: ['1'],
};

const unauthState = {
  auth: { user: null, companies: [], isAuthenticated: false, sessionLoading: false },
  permissions: { appId: null, companyId: null, permissions: [], roles: [], loaded: false },
};

const authLoadingState = {
  auth: { user: mockUser, companies: [], isAuthenticated: true, sessionLoading: false },
  permissions: { appId: null, companyId: null, permissions: [], roles: [], loaded: false },
};

const authNoPermState = {
  auth: { user: mockUser, companies: [], isAuthenticated: true, sessionLoading: false },
  permissions: { appId: 'kpital', companyId: '1', permissions: ['payroll:view'], roles: ['viewer'], loaded: true },
};

const authWithPermState = (permissions: string[]) => ({
  auth: { user: mockUser, companies: [], isAuthenticated: true, sessionLoading: false },
  permissions: { appId: 'kpital', companyId: '1', permissions, roles: ['hr'], loaded: true },
});

describe('PermissionGuard', () => {
  it('redirects when user is not authenticated', () => {
    renderWithStore(
      <PermissionGuard requiredPermission="employee:view">
        <div>Contenido protegido</div>
      </PermissionGuard>,
      unauthState,
    );
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('renders nothing while permissions are loading', () => {
    const { container } = renderWithStore(
      <PermissionGuard requiredPermission="employee:view">
        <div>Contenido protegido</div>
      </PermissionGuard>,
      authLoadingState,
    );
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('shows 403 when user lacks required permission', () => {
    renderWithStore(
      <PermissionGuard requiredPermission="employee:view">
        <div>Contenido protegido</div>
      </PermissionGuard>,
      authNoPermState,
    );
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
  });

  it('renders children when user has required permission', () => {
    renderWithStore(
      <PermissionGuard requiredPermission="employee:view">
        <div>Contenido protegido</div>
      </PermissionGuard>,
      authWithPermState(['employee:view', 'employee:create']),
    );
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('shows the missing permission name in the 403 message', () => {
    renderWithStore(
      <PermissionGuard requiredPermission="payroll:create">
        <div>Crear planilla</div>
      </PermissionGuard>,
      authNoPermState,
    );
    expect(screen.getByText(/payroll:create/)).toBeInTheDocument();
  });

  it('grants access via company:manage alias for company scoped permissions', () => {
    renderWithStore(
      <PermissionGuard requiredPermission="company:edit">
        <div>Editar empresa</div>
      </PermissionGuard>,
      authWithPermState(['company:manage']),
    );
    expect(screen.getByText('Editar empresa')).toBeInTheDocument();
  });

  it('renders multiple children correctly', () => {
    renderWithStore(
      <PermissionGuard requiredPermission="employee:view">
        <span>Item 1</span>
        <span>Item 2</span>
      </PermissionGuard>,
      authWithPermState(['employee:view']),
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});
