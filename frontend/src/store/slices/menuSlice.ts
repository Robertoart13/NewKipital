import { createSlice } from '@reduxjs/toolkit';
import type { Permission } from './permissionsSlice';

/**
 * Definición de un ítem de menú.
 * requiredPermission: si está definido, el usuario debe tenerlo para ver el ítem.
 */
export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  requiredPermission?: Permission;
  children?: MenuItem[];
  /** Si true, se renderiza como título de grupo (no clickeable) en lugar de submenú */
  isGroup?: boolean;
}

/**
 * Configuración maestra del menú.
 * La visibilidad real se deriva en menu.selectors.ts según permisos.
 */
export interface MenuConfig {
  items: MenuItem[];
}

/**
 * Configuración maestra del menú. Data-driven.
 * Estructura: cada ítem puede tener children (submenú con dropdown).
 * requiredPermission: oculta la opción si el usuario no tiene el permiso.
 */
const initialMenuConfig: MenuItem[] = [
  {
    id: 'personal-actions',
    label: 'Acciones de Personal',
    path: '/personal-actions',
    requiredPermission: 'personal-action:view',
    children: [
      {
        id: 'entradas-personal',
        label: 'Entradas de Personal',
        path: '/personal-actions/entradas',
      },
      {
        id: 'salidas-personal',
        label: 'Salidas de Personal',
        path: '/personal-actions/salidas',
        children: [
          { id: 'despidos', label: 'Despidos', path: '/personal-actions/salidas/despidos' },
          { id: 'renuncias', label: 'Renuncias', path: '/personal-actions/salidas/renuncias' },
        ],
      },
      {
        id: 'deducciones',
        label: 'Deducciones',
        path: '/personal-actions/deducciones',
        children: [
          { id: 'retenciones', label: 'Retenciones', path: '/personal-actions/deducciones/retenciones' },
          { id: 'descuentos', label: 'Descuentos', path: '/personal-actions/deducciones/descuentos' },
        ],
      },
      {
        id: 'compensaciones',
        label: 'Compensaciones',
        path: '/personal-actions/compensaciones',
        children: [
          { id: 'aumentos', label: 'Aumentos', path: '/personal-actions/compensaciones/aumentos' },
          { id: 'bonificaciones', label: 'Bonificaciones', path: '/personal-actions/compensaciones/bonificaciones' },
          { id: 'horas-extras', label: 'Horas Extras', path: '/personal-actions/compensaciones/horas-extras' },
          { id: 'vacaciones', label: 'Vacaciones', path: '/personal-actions/compensaciones/vacaciones' },
        ],
      },
      {
        id: 'incapacidades',
        label: 'Incapacidades',
        path: '/personal-actions/incapacidades',
      },
      {
        id: 'licencias-permisos',
        label: 'Licencias y Permisos',
        path: '/personal-actions/licencias',
      },
      {
        id: 'ausencias',
        label: 'Ausencias',
        path: '/personal-actions/ausencias',
      },
    ],
  },
  {
    id: 'payroll-params',
    label: 'Parametros de Planilla',
    path: '/payroll-params',
    requiredPermission: 'payroll:view',
    children: [
      {
        id: 'calendario-nomina',
        label: 'Calendario de Nómina',
        path: '/payroll-params/calendario',
        children: [
          { id: 'calendario', label: 'Calendario', path: '/payroll-params/calendario/ver' },
          { id: 'listado-feriados', label: 'Listado de Feriados', path: '/payroll-params/calendario/feriados' },
          { id: 'dias-pago-planilla', label: 'Listado de Días de Pago de Planilla', path: '/payroll-params/calendario/dias-pago' },
        ],
      },
      { id: 'articulos-nomina', label: 'Artículos de Nomina', path: '/payroll-params/articulos' },
      { id: 'movimientos-nomina', label: 'Movimientos de Nomina', path: '/payroll-params/movimientos' },
    ],
  },
  {
    id: 'payroll-management',
    label: 'Gestion Planilla',
    path: '/payroll-management',
    requiredPermission: 'payroll:view',
    children: [
      {
        id: 'planillas',
        label: 'Planillas',
        path: '/payroll-management/planillas',
        children: [
          { id: 'generar-planilla', label: 'Generar Planilla', path: '/payroll-management/planillas/generar' },
          { id: 'listado-planillas', label: 'Listado de planillas', path: '/payroll-management/planillas/listado' },
          { id: 'planillas-aplicadas', label: 'Listado de planilla Aplicadas', path: '/payroll-management/planillas/aplicadas' },
          { id: 'carga-masiva', label: 'Carga Masiva', path: '/payroll-management/planillas/carga-masiva' },
        ],
      },
      { id: 'traslado-interempresas', label: 'Traslado Interempresas', path: '/payroll-management/traslado-interempresas' },
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
        label: 'Gestion de Organizacional',
        path: '#',
        isGroup: true,
        children: [
          { id: 'reglas-distribucion', label: 'Reglas de Distribución', path: '/configuration/reglas-distribucion', requiredPermission: 'config:reglas-distribucion' },
          { id: 'empresas', label: 'Empresas', path: '/configuration/empresas', requiredPermission: 'company:view' },
          { id: 'empleados', label: 'Empleados', path: '/employees', requiredPermission: 'employee:view' },
          { id: 'clases', label: 'Clases', path: '/configuration/clases', requiredPermission: 'config:clases' },
          { id: 'proyectos', label: 'Proyectos', path: '/configuration/proyectos', requiredPermission: 'config:proyectos' },
          { id: 'cuentas-contables', label: 'Cuentas Contables', path: '/configuration/cuentas-contables', requiredPermission: 'config:cuentas-contables' },
          { id: 'departamentos', label: 'Departamentos', path: '/configuration/departamentos', requiredPermission: 'config:departamentos' },
          { id: 'puestos', label: 'Puestos', path: '/configuration/puestos', requiredPermission: 'config:puestos' },
        ],
      },
    ],
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
