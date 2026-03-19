import 'dotenv/config';
import { DataSource } from 'typeorm';

interface SensitivePermissionRow {
  codigo_permiso: string;
  nombre_permiso: string;
}

interface RoleMatrixRow {
  id_rol: number;
  nombre_rol: string;
  codigo_permiso: string;
}

interface UserMatrixRow {
  id_usuario: number;
  email_usuario: string;
  nombre_usuario: string;
  apellido_usuario: string;
  id_empresa: number;
  nombre_rol: string;
  codigo_permiso: string;
}

interface UserGapRow {
  id_usuario: number;
  email_usuario: string;
  nombre_usuario: string;
  apellido_usuario: string;
  id_empresa: number;
}

function createDataSource(): DataSource {
  return new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'kpital360',
    synchronize: false,
    charset: 'utf8mb4',
  });
}

async function main(): Promise<void> {
  const ds = createDataSource();
  await ds.initialize();
  try {
    console.log('\n=== AUDITORIA PERMISOS SENSIBLES (PEND-007) ===\n');

    const sensitivePerms = (await ds.query(`
      SELECT codigo_permiso, nombre_permiso
      FROM sys_permisos
      WHERE codigo_permiso IN ('employee:view-sensitive', 'employee:view_sensitive', 'payroll:view_sensitive')
      ORDER BY codigo_permiso
    `)) as SensitivePermissionRow[];
    console.log('[1] Catalogo permisos sensibles detectados:');
    console.table(sensitivePerms);

    const roleMatrix = (await ds.query(`
      SELECT r.id_rol, r.nombre_rol, p.codigo_permiso
      FROM sys_roles r
      INNER JOIN sys_rol_permiso rp ON rp.id_rol = r.id_rol
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN ('employee:view-sensitive', 'employee:view_sensitive', 'payroll:view_sensitive')
      ORDER BY r.id_rol, p.codigo_permiso
    `)) as RoleMatrixRow[];
    console.log('[2] Matriz por rol:');
    console.table(roleMatrix);

    const userMatrix = (await ds.query(`
      SELECT
        su.id_usuario,
        su.email_usuario,
        su.nombre_usuario,
        su.apellido_usuario,
        ur.id_empresa,
        r.nombre_rol,
        p.codigo_permiso
      FROM sys_usuarios su
      INNER JOIN sys_usuario_rol ur
        ON ur.id_usuario = su.id_usuario
       AND ur.id_app = 1
       AND ur.estado_usuario_rol = 1
      INNER JOIN sys_roles r ON r.id_rol = ur.id_rol
      INNER JOIN sys_rol_permiso rp ON rp.id_rol = r.id_rol
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso IN ('employee:view-sensitive', 'employee:view_sensitive', 'payroll:view_sensitive')
      ORDER BY su.id_usuario, ur.id_empresa, p.codigo_permiso
    `)) as UserMatrixRow[];
    console.log('[3] Matriz por usuario/empresa:');
    console.table(userMatrix);

    const usersWithPayrollSensitiveOnly = (await ds.query(`
      SELECT DISTINCT
        su.id_usuario,
        su.email_usuario,
        su.nombre_usuario,
        su.apellido_usuario,
        ur.id_empresa
      FROM sys_usuarios su
      INNER JOIN sys_usuario_rol ur
        ON ur.id_usuario = su.id_usuario
       AND ur.id_app = 1
       AND ur.estado_usuario_rol = 1
      INNER JOIN sys_roles r ON r.id_rol = ur.id_rol
      INNER JOIN sys_rol_permiso rp ON rp.id_rol = r.id_rol
      INNER JOIN sys_permisos p ON p.id_permiso = rp.id_permiso
      WHERE p.codigo_permiso = 'payroll:view_sensitive'
        AND NOT EXISTS (
          SELECT 1
          FROM sys_usuario_rol ur2
          INNER JOIN sys_rol_permiso rp2 ON rp2.id_rol = ur2.id_rol
          INNER JOIN sys_permisos p2 ON p2.id_permiso = rp2.id_permiso
          WHERE ur2.id_usuario = su.id_usuario
            AND ur2.id_empresa = ur.id_empresa
            AND ur2.id_app = 1
            AND ur2.estado_usuario_rol = 1
            AND p2.codigo_permiso IN ('employee:view-sensitive', 'employee:view_sensitive')
        )
      ORDER BY su.id_usuario, ur.id_empresa
    `)) as UserGapRow[];
    console.log('[4] Usuarios con payroll:view_sensitive PERO sin employee:view-sensitive (revisar negocio):');
    console.table(usersWithPayrollSensitiveOnly);

    const legacyEmployeeSensitiveUnderscore = sensitivePerms.filter(
      (row) => row.codigo_permiso === 'employee:view_sensitive',
    );
    if (legacyEmployeeSensitiveUnderscore.length > 0) {
      console.warn(
        '\n[WARN] Existe codigo legacy employee:view_sensitive. Se recomienda retirar o migrar definitivamente a employee:view-sensitive.\n',
      );
    } else {
      console.log('\n[OK] No se detecto employee:view_sensitive legacy en catalogo.\n');
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

