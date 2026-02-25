import { Routes, Route, Navigate } from 'react-router-dom';
import { PermissionGuard, PublicGuard, PrivateGuard } from '../guards';
import { PublicLayout } from '../layouts/PublicLayout';
import { PrivateLayout } from '../layouts/PrivateLayout';
import { LoginPage } from '../pages/public';
import {
  DashboardPage,
  ProfilePage,
  EmployeesListPage,
  EmployeeDetailPage,
  PermissionsAdminListPage,
  RolesManagementPage,
  UsersManagementPage,
  CompaniesManagementPage,
  ClassesManagementPage,
  AutomationMonitoringPage,
} from '../pages/private';

/**
 * Router principal — dos mundos separados.
 *
 * Rutas públicas: PublicGuard → PublicLayout → páginas de auth
 * Rutas privadas: PrivateGuard → PrivateLayout → módulos de negocio
 * Selección de empresa: ruta intermedia (auth requerida pero sin layout completo)
 */
export function AppRouter() {
  return (
    <Routes>
      {/* --- Rutas públicas --- */}
      <Route element={<PublicGuard />}>
        <Route element={<PublicLayout><LoginPage /></PublicLayout>} path="/auth/login" />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      </Route>

      {/* --- Rutas privadas --- */}
      <Route element={<PrivateGuard />}>
        <Route element={<PrivateLayout><DashboardPage /></PrivateLayout>} path="/dashboard" />
        <Route element={<PrivateLayout><ProfilePage /></PrivateLayout>} path="/profile" />
        <Route
          element={(
            <PrivateLayout>
              <PermissionGuard requiredPermission="employee:view">
                <EmployeeDetailPage />
              </PermissionGuard>
            </PrivateLayout>
          )}
          path="/employees/:id"
        />
        <Route
          element={(
            <PrivateLayout>
              <PermissionGuard requiredPermission="employee:view">
                <EmployeesListPage />
              </PermissionGuard>
            </PrivateLayout>
          )}
          path="/employees"
        />
        <Route
          element={(
            <PrivateLayout>
              <PermissionGuard requiredPermission="config:permissions">
                <PermissionsAdminListPage />
              </PermissionGuard>
            </PrivateLayout>
          )}
          path="/configuration/permissions"
        />
        <Route
          element={(
            <PrivateLayout>
              <PermissionGuard requiredPermission="config:roles">
                <RolesManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          )}
          path="/configuration/roles"
        />
        <Route
          element={(
            <PrivateLayout>
              <PermissionGuard requiredPermission="config:users">
                <UsersManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          )}
          path="/configuration/users"
        />
        <Route
          element={(
            <PrivateLayout>
              <PermissionGuard requiredPermission="company:view">
                <CompaniesManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          )}
          path="/configuration/empresas"
        />
        <Route
          element={(
            <PrivateLayout>
              <PermissionGuard requiredPermission="config:clases">
                <ClassesManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          )}
          path="/configuration/clases"
        />
        <Route
          element={(
            <PrivateLayout>
              <PermissionGuard requiredPermission="automation:monitor">
                <AutomationMonitoringPage />
              </PermissionGuard>
            </PrivateLayout>
          )}
          path="/monitoring/automation"
        />
        <Route path="/monitoring" element={<Navigate to="/monitoring/automation" replace />} />
      </Route>

      {/* --- Fallback --- */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
