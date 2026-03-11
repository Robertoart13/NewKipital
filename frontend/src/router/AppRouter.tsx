import { Routes, Route, Navigate } from 'react-router-dom';

import { PermissionGuard, PublicGuard, PrivateGuard } from '../guards';
import { PrivateLayout } from '../layouts/PrivateLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import {
  DashboardPage,
  ProfilePage,
  EmployeesListPage,
  EmployeeDetailPage,
  PermissionsAdminListPage,
  RolesManagementPage,
  UsersManagementPage,
  DistributionRulesPage,
  DistributionRuleCreatePage,
  DistributionRuleEditPage,
  CompaniesManagementPage,
  ClassesManagementPage,
  ProjectsManagementPage,
  AccountingAccountsManagementPage,
  DepartmentsManagementPage,
  PositionsManagementPage,
  AutomationMonitoringPage,
  PayrollArticlesManagementPage,
  PayrollMovementsManagementPage,
  PayrollManagementPage,
  AppliedPayrollManagementPage,
  PayrollDistributionPage,
  PayrollGeneratePage,
  PayrollCalendarPage,
  PayrollHolidaysPage,
  IntercompanyTransferPage,
  PersonalActionsPage,
  DocsBrowserPage,
  AbsencesPage,
  LicensesPage,
  IncapacitiesPage,
  BonusesPage,
  HoursExtrasPage,
  RetentionsPage,
  DiscountsPage,
  AumentosPage,
  VacationsPage,
} from '../pages/private';
import { LoginPage } from '../pages/public';

/**
 * Router principal - dos mundos separados.
 *
 * Rutas publicas: PublicGuard -> PublicLayout -> paginas de auth
 * Rutas privadas: PrivateGuard -> PrivateLayout -> modulos de negocio
 * Seleccion de empresa: ruta intermedia (auth requerida pero sin layout completo)
 */
export function AppRouter() {
  return (
    <Routes>
      {/* --- Rutas publicas --- */}
      <Route element={<PublicGuard />}>
        <Route
          element={
            <PublicLayout>
              <LoginPage />
            </PublicLayout>
          }
          path="/auth/login"
        />
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      </Route>

      {/* --- Rutas privadas --- */}
      <Route element={<PrivateGuard />}>
        <Route
          element={
            <PrivateLayout>
              <DashboardPage />
            </PrivateLayout>
          }
          path="/dashboard"
        />
        <Route
          element={
            <PrivateLayout>
              <ProfilePage />
            </PrivateLayout>
          }
          path="/profile"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="employee:view">
                <EmployeeDetailPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/employees/:id"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="employee:view">
                <EmployeesListPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/employees"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="config:permissions">
                <PermissionsAdminListPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/permissions"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="config:roles">
                <RolesManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/roles"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="config:users">
                <UsersManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/users"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="config:reglas-distribucion">
                <DistributionRulesPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/reglas-distribucion"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="config:reglas-distribucion:edit">
                <DistributionRuleCreatePage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/reglas-distribucion/crear"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="config:reglas-distribucion:view">
                <DistributionRuleEditPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/reglas-distribucion/editar/:publicId"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="company:view">
                <CompaniesManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/empresas"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="class:view">
                <ClassesManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/clases"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="project:view">
                <ProjectsManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/proyectos"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="accounting-account:view">
                <AccountingAccountsManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/cuentas-contables"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="department:view">
                <DepartmentsManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/departamentos"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="position:view">
                <PositionsManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/configuration/puestos"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="payroll-article:view">
                <PayrollArticlesManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/payroll-params/articulos"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="payroll-movement:view">
                <PayrollMovementsManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/payroll-params/movimientos"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr_action:view">
                <PersonalActionsPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/personal-actions"
        />
        <Route
          path="/personal-actions/entradas"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="employee:view">
                <Navigate to="/employees" replace />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          path="/personal-actions/salidas"
          element={<Navigate to="/personal-actions/salidas/despidos" replace />}
        />
        <Route
          path="/personal-actions/salidas/despidos"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr-action-despidos:view">
                <PersonalActionsPage
                  pageTitle="Despidos"
                  pageSubtitle="Acciones de salida por despido"
                  fixedTipoAccion="DESPIDO"
                  createPermission="hr-action-despidos:create"
                  approvePermission="hr-action-despidos:approve"
                />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          path="/personal-actions/salidas/renuncias"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr-action-renuncias:view">
                <PersonalActionsPage
                  pageTitle="Renuncias"
                  pageSubtitle="Acciones de salida por renuncia"
                  fixedTipoAccion="RENUNCIA"
                  createPermission="hr-action-renuncias:create"
                  approvePermission="hr-action-renuncias:approve"
                />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          path="/personal-actions/deducciones"
          element={<Navigate to="/personal-actions/deducciones/retenciones" replace />}
        />
        <Route
          path="/personal-actions/deducciones/retenciones"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr-action-retenciones:view">
                <RetentionsPage />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          path="/personal-actions/deducciones/descuentos"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr-action-descuentos:view">
                <DiscountsPage />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          path="/personal-actions/compensaciones"
          element={<Navigate to="/personal-actions/compensaciones/aumentos" replace />}
        />
        <Route
          path="/personal-actions/compensaciones/aumentos"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr-action-aumentos:view">
                <AumentosPage />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          path="/personal-actions/compensaciones/bonificaciones"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr-action-bonificaciones:view">
                <BonusesPage />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          path="/personal-actions/compensaciones/horas-extras"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr-action-horas-extras:view">
                <HoursExtrasPage />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          path="/personal-actions/compensaciones/vacaciones"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr-action-vacaciones:view">
                <VacationsPage />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          path="/personal-actions/incapacidades"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr-action-incapacidades:view">
                <IncapacitiesPage />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          path="/personal-actions/licencias"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr-action-licencias:view">
                <LicensesPage />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          path="/personal-actions/ausencias"
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="hr-action-ausencias:view">
                <AbsencesPage />
              </PermissionGuard>
            </PrivateLayout>
          }
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="payroll:calendar:view">
                <PayrollCalendarPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/payroll-params/calendario/ver"
        />
        <Route path="/payroll-params/calendario" element={<Navigate to="/payroll-params/calendario/ver" replace />} />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="payroll-holiday:view">
                <PayrollHolidaysPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/payroll-params/calendario/feriados"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="payroll:view">
                <PayrollManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/payroll-params/calendario/dias-pago"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="payroll:view">
                <PayrollManagementPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/payroll-management/planillas/listado"
        />
        <Route
          element={
            <PrivateLayout>
              <AppliedPayrollManagementPage />
            </PrivateLayout>
          }
          path="/payroll-management/planillas/aplicadas"
        />
        <Route
          element={
            <PrivateLayout>
              <PayrollDistributionPage />
            </PrivateLayout>
          }
          path="/payroll-management/planillas/aplicadas/distribucion/:publicId"
        />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="payroll:generate">
                <PayrollGeneratePage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/payroll-management/planillas/generar"
        />
        <Route path="/payroll-management/planillas" element={<Navigate to="/payroll-management/planillas/generar" replace />} />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="payroll:intercompany-transfer">
                <IntercompanyTransferPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/payroll-management/traslado-interempresas"
        />
        <Route path="/payroll-management" element={<Navigate to="/payroll-management/planillas/generar" replace />} />
        <Route
          element={
            <PrivateLayout>
              <PermissionGuard requiredPermission="automation:monitor">
                <AutomationMonitoringPage />
              </PermissionGuard>
            </PrivateLayout>
          }
          path="/monitoring/automation"
        />
        <Route path="/monitoring" element={<Navigate to="/monitoring/automation" replace />} />
        <Route
          element={
            <PrivateLayout>
              <DocsBrowserPage />
            </PrivateLayout>
          }
          path="/docs"
        />
      </Route>

      {/* --- Fallback --- */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}







