import { createSlice } from '@reduxjs/toolkit';

import type { Permission } from './permissionsSlice';

/**
 * Definicion de un item de menu.
 * requiredPermission: si esta definido, el usuario debe tenerlo para ver el item.
 */
export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  requiredPermission?: Permission;
  requiredAnyPermissions?: Permission[];
  children?: MenuItem[];
  /** Si true, se renderiza como titulo de grupo (no clickeable) en lugar de submenu */
  isGroup?: boolean;
}

/**
 * Configuracion maestra del menu.
 * La visibilidad real se deriva en menu.selectors.ts segun permisos.
 */
export interface MenuConfig {
  items: MenuItem[];
}

/**
 * Configuracion maestra del menu. Data-driven.
 * Estructura: cada item puede tener children (submenu con dropdown).
 * requiredPermission: oculta la opcion si el usuario no tiene el permiso.
 */
const initialMenuConfig: MenuItem[] = [
  {
    id: 'personal-actions',
    label: 'Acciones de Personal',
    path: '/personal-actions',
    requiredPermission: 'hr_action:view',
    children: [
      {
        id: 'entradas-personal',
        label: 'Entradas de Personal',
        path: '/personal-actions/entradas',
        requiredPermission: 'employee:view',
      },
      {
        id: 'salidas-personal',
        label: 'Salidas de Personal',
        path: '/personal-actions/salidas',
        requiredPermission: 'hr_action:view',
        children: [
          {
            id: 'despidos',
            label: 'Despidos',
            path: '/personal-actions/salidas/despidos',
            requiredPermission: 'hr-action-despidos:view',
          },
          {
            id: 'renuncias',
            label: 'Renuncias',
            path: '/personal-actions/salidas/renuncias',
            requiredPermission: 'hr-action-renuncias:view',
          },
        ],
      },
      {
        id: 'deducciones',
        label: 'Deducciones',
        path: '/personal-actions/deducciones',
        requiredPermission: 'hr_action:view',
        children: [
          {
            id: 'retenciones',
            label: 'Retenciones',
            path: '/personal-actions/deducciones/retenciones',
            requiredPermission: 'hr-action-retenciones:view',
          },
          {
            id: 'descuentos',
            label: 'Descuentos',
            path: '/personal-actions/deducciones/descuentos',
            requiredPermission: 'hr-action-descuentos:view',
          },
        ],
      },
      {
        id: 'compensaciones',
        label: 'Compensaciones',
        path: '/personal-actions/compensaciones',
        requiredPermission: 'hr_action:view',
        children: [
          {
            id: 'aumentos',
            label: 'Aumentos',
            path: '/personal-actions/compensaciones/aumentos',
            requiredPermission: 'hr-action-aumentos:view',
          },
          {
            id: 'bonificaciones',
            label: 'Bonificaciones',
            path: '/personal-actions/compensaciones/bonificaciones',
            requiredPermission: 'hr-action-bonificaciones:view',
          },
          {
            id: 'horas-extras',
            label: 'Horas Extras',
            path: '/personal-actions/compensaciones/horas-extras',
            requiredPermission: 'hr-action-horas-extras:view',
          },
          {
            id: 'vacaciones',
            label: 'Vacaciones',
            path: '/personal-actions/compensaciones/vacaciones',
            requiredPermission: 'hr-action-vacaciones:view',
          },
        ],
      },
      {
        id: 'incapacidades',
        label: 'Incapacidades',
        path: '/personal-actions/incapacidades',
        requiredPermission: 'hr-action-incapacidades:view',
      },
      {
        id: 'licencias-permisos',
        label: 'Licencias y Permisos',
        path: '/personal-actions/licencias',
        requiredPermission: 'hr-action-licencias:view',
      },
      {
        id: 'ausencias',
        label: 'Ausencias',
        path: '/personal-actions/ausencias',
        requiredPermission: 'hr-action-ausencias:view',
      },
    ],
  },
  {
    id: 'payroll-params',
    label: 'Parametros de Planilla',
    path: '/payroll-params',
    children: [
      {
        id: 'calendario-nomina',
        label: 'Calendario de Nomina',
        path: '/payroll-params/calendario',
        requiredPermission: 'payroll:view',
        children: [
          {
            id: 'calendario',
            label: 'Calendario',
            path: '/payroll-params/calendario/ver',
            requiredPermission: 'payroll:calendar:view',
          },
          {
            id: 'listado-feriados',
            label: 'Listado de Feriados',
            path: '/payroll-params/calendario/feriados',
            requiredPermission: 'payroll-holiday:view',
          },
          {
            id: 'dias-pago-planilla',
            label: 'Listado de Dias de Pago de Planilla',
            path: '/payroll-params/calendario/dias-pago',
            requiredPermission: 'payroll:view',
          },
        ],
      },
      {
        id: 'articulos-nomina',
        label: 'Articulos de Nomina',
        path: '/payroll-params/articulos',
        requiredPermission: 'payroll-article:view',
      },
      {
        id: 'movimientos-nomina',
        label: 'Movimientos de Nomina',
        path: '/payroll-params/movimientos',
        requiredPermission: 'payroll-movement:view',
      },
    ],
  },
  {
    id: 'payroll-management',
    label: 'Gestion Planilla',
    path: '/payroll-management',
    children: [
      {
        id: 'planillas',
        label: 'Planillas',
        path: '/payroll-management/planillas',
        children: [
          {
            id: 'generar-planilla',
            label: 'Cargar Planilla Regular',
            path: '/payroll-management/planillas/generar',
            requiredPermission: 'payroll:generate',
          },
          {
            id: 'lista-planillas-aplicadas',
            label: 'Lista de Planillas Aplicadas',
            path: '/payroll-management/planillas/aplicadas',
            requiredAnyPermissions: [
              'payroll:verify',
              'payroll:apply',
              'payroll:netsuite:send',
              'payroll:send_netsuite',
            ],
          },
          {
            id: 'carga-masiva-horas-extras',
            label: 'Carga Masiva de Horas Extras',
            path: '/payroll-management/planillas/carga-masiva-horas-extras',
            requiredPermission: 'payroll:overtime:bulk-upload',
          },
        ],
      },
      {
        id: 'traslado-interempresas',
        label: 'Traslado Interempresas',
        path: '/payroll-management/traslado-interempresas',
        requiredPermission: 'payroll:intercompany-transfer',
      },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuracion',
    path: '/configuration',
    children: [
      {
        id: 'grp-seguridad',
        label: 'Seguridad',
        path: '#',
        isGroup: true,
        children: [
          {
            id: 'permissions',
            label: 'Permisos',
            path: '/configuration/permissions',
            requiredPermission: 'config:permissions',
          },
          {
            id: 'roles',
            label: 'Roles',
            path: '/configuration/roles',
            requiredPermission: 'config:roles',
          },
          {
            id: 'users-access',
            label: 'Usuarios',
            path: '/configuration/users',
            requiredPermission: 'config:users',
          },
        ],
      },
      {
        id: 'grp-gestion-org',
        label: 'Gestion Organizacional',
        path: '#',
        isGroup: true,
        children: [
          {
            id: 'reglas-distribucion',
            label: 'Regla de Distribucion',
            path: '/configuration/reglas-distribucion',
            requiredPermission: 'config:reglas-distribucion',
          },
          {
            id: 'empresas',
            label: 'Empresas',
            path: '/configuration/empresas',
            requiredPermission: 'company:view',
          },
          {
            id: 'empleados',
            label: 'Empleados',
            path: '/employees',
            requiredPermission: 'employee:view',
          },
          {
            id: 'clases',
            label: 'Clases',
            path: '/configuration/clases',
            requiredPermission: 'class:view',
          },
          {
            id: 'proyectos',
            label: 'Proyectos',
            path: '/configuration/proyectos',
            requiredPermission: 'project:view',
          },
          {
            id: 'cuentas-contables',
            label: 'Cuentas Contables',
            path: '/configuration/cuentas-contables',
            requiredPermission: 'accounting-account:view',
          },
          {
            id: 'departamentos',
            label: 'Departamentos',
            path: '/configuration/departamentos',
            requiredPermission: 'department:view',
          },
          {
            id: 'puestos',
            label: 'Puestos',
            path: '/configuration/puestos',
            requiredPermission: 'position:view',
          },
        ],
      },
    ],
  },
  {
    id: 'monitoring',
    label: 'Monitoreo',
    path: '/monitoring/automation',
    requiredPermission: 'automation:monitor',
  },
];

const menuSlice = createSlice({
  name: 'menu',
  initialState: { config: initialMenuConfig } as { config: MenuItem[] },
  reducers: {
    setMenuConfig: (state, action: { payload: MenuItem[] }) => {
      state.config = action.payload;
    },
  },
});

export const { setMenuConfig } = menuSlice.actions;
export default menuSlice.reducer;







