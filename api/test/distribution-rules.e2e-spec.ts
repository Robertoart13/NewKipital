import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';

jest.setTimeout(180000);

type ActionAccountPair = { idTipoAccionPersonal: number; idCuentaContable: number };

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const intValue = Math.trunc(parsed);
  return intValue > 0 ? intValue : null;
}

function expectPublicIdShape(publicId: string): void {
  expect(publicId).toMatch(/^dr1_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
}

describe('DistributionRulesController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let accessToken = '';

  let companyId = 0;
  let departmentId = 0;
  let positionId = 0;
  let actionAccountPairs: ActionAccountPair[] = [];
  let forcedPermissionIds: number[] = [];
  let authUserId = 0;

  const createdRulePublicIds: string[] = [];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.E2E_DISABLE_CSRF = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = app.get(DataSource);
    const authService = app.get(AuthService);
    const e2eEmail = 'rzuniga@roccacr.com';
    const e2ePassword = 'Demo2026!';
    const passwordHash = await bcrypt.hash(e2ePassword, 10);

    await dataSource.query(
      `
      UPDATE sys_usuarios
      SET password_hash_usuario = ?,
          failed_attempts_usuario = 0,
          locked_until_usuario = NULL,
          estado_usuario = 1
      WHERE email_usuario = ?
      `,
      [passwordHash, e2eEmail],
    );

    const userRows = await dataSource.query(
      `
      SELECT id_usuario AS id
      FROM sys_usuarios
      WHERE email_usuario = ?
      LIMIT 1
      `,
      [e2eEmail],
    );
    authUserId = toPositiveInt(userRows?.[0]?.id) ?? 0;
    if (!authUserId) {
      throw new Error(`No existe usuario E2E para email ${e2eEmail}`);
    }

    const auth = await authService.login(e2eEmail, e2ePassword, '127.0.0.1', 'e2e-test');
    accessToken = String(auth.accessToken ?? '');
    if (accessToken.length < 20) {
      throw new Error('No se pudo obtener accessToken E2E para distribution-rules');
    }

    const pairs = await dataSource.query(
      `
      SELECT
        acc.id_empresa AS idEmpresa,
        acc.id_tipo_accion_personal AS idTipoAccionPersonal,
        MIN(acc.id_cuenta_contable) AS idCuentaContable
      FROM erp_cuentas_contables acc
      INNER JOIN sys_empresas emp
        ON emp.id_empresa = acc.id_empresa
      INNER JOIN nom_tipos_accion_personal tap
        ON tap.id_tipo_accion_personal = acc.id_tipo_accion_personal
      WHERE acc.es_inactivo = 1
        AND emp.estado_empresa = 1
        AND tap.estado = 1
      GROUP BY acc.id_empresa, acc.id_tipo_accion_personal
      HAVING COUNT(*) >= 1
      ORDER BY acc.id_empresa ASC, acc.id_tipo_accion_personal ASC
      `,
    );

    const pairsByCompany = new Map<number, ActionAccountPair[]>();
    for (const row of pairs as Array<Record<string, unknown>>) {
      const idEmpresa = toPositiveInt(row.idEmpresa);
      const idTipoAccionPersonal = toPositiveInt(row.idTipoAccionPersonal);
      const idCuentaContable = toPositiveInt(row.idCuentaContable);
      if (!idEmpresa || !idTipoAccionPersonal || !idCuentaContable) continue;

      const current = pairsByCompany.get(idEmpresa) ?? [];
      current.push({ idTipoAccionPersonal, idCuentaContable });
      pairsByCompany.set(idEmpresa, current);
    }

    const targetCompany = Array.from(pairsByCompany.entries()).find(([, companyPairs]) => companyPairs.length >= 2);
    if (!targetCompany) {
      throw new Error('No hay empresa con al menos 2 tipos de accion + cuentas para E2E de reglas.');
    }

    companyId = targetCompany[0];
    actionAccountPairs = targetCompany[1].slice(0, 2);

    const permissionRows = await dataSource.query(
      `
      SELECT id_permiso AS id
      FROM sys_permisos
      WHERE codigo_permiso IN (
        'config:reglas-distribucion',
        'config:reglas-distribucion:view',
        'config:reglas-distribucion:edit',
        'config:reglas-distribucion:audit'
      )
      `,
    );
    forcedPermissionIds = (permissionRows as Array<Record<string, unknown>>)
      .map((row) => toPositiveInt(row.id))
      .filter((id): id is number => id != null);

    await dataSource.query(
      `
      INSERT IGNORE INTO sys_usuario_empresa (id_usuario, id_empresa, estado_usuario_empresa, fecha_asignacion_usuario_empresa)
      VALUES (?, ?, 1, NOW())
      `,
      [authUserId, companyId],
    );

    await dataSource.query(
      `
      INSERT IGNORE INTO sys_usuario_app (id_usuario, id_app, estado_usuario_app, fecha_asignacion_usuario_app)
      VALUES (?, 1, 1, NOW())
      `,
      [authUserId],
    );

    await dataSource.query(
      `
      INSERT INTO sys_usuario_rol (
        id_usuario,
        id_rol,
        id_empresa,
        id_app,
        estado_usuario_rol,
        fecha_asignacion_usuario_rol,
        fecha_modificacion_usuario_rol,
        creado_por_usuario_rol,
        modificado_por_usuario_rol
      )
      VALUES (?, 3, ?, 1, 1, NOW(), NOW(), ?, ?)
      ON DUPLICATE KEY UPDATE
        estado_usuario_rol = 1,
        fecha_modificacion_usuario_rol = NOW(),
        modificado_por_usuario_rol = VALUES(modificado_por_usuario_rol)
      `,
      [authUserId, companyId, authUserId, authUserId],
    );

    if (forcedPermissionIds.length > 0) {
      const valuesSql = forcedPermissionIds
        .map(() => "(?, ?, 1, ?, 'allow', 1, NOW(), NOW(), ?, ?)")
        .join(',');
      const valuesParams = forcedPermissionIds.flatMap((permissionId) => [
        authUserId,
        companyId,
        permissionId,
        authUserId,
        authUserId,
      ]);
      await dataSource.query(
        `
        INSERT INTO sys_usuario_permiso (
          id_usuario,
          id_empresa,
          id_app,
          id_permiso,
          efecto_usuario_permiso,
          estado_usuario_permiso,
          fecha_creacion_usuario_permiso,
          fecha_modificacion_usuario_permiso,
          creado_por_usuario_permiso,
          modificado_por_usuario_permiso
        )
        VALUES ${valuesSql}
        ON DUPLICATE KEY UPDATE
          efecto_usuario_permiso = VALUES(efecto_usuario_permiso),
          estado_usuario_permiso = 1,
          fecha_modificacion_usuario_permiso = NOW(),
          modificado_por_usuario_permiso = 1
        `,
        valuesParams,
      );
    }

    const departmentRows = await dataSource.query(
      `
      SELECT id_departamento AS id
      FROM org_departamentos
      WHERE estado_departamento = 1
      ORDER BY id_departamento ASC
      LIMIT 1
      `,
    );

    const positionRows = await dataSource.query(
      `
      SELECT id_puesto AS id
      FROM org_puestos
      WHERE estado_puesto = 1
      ORDER BY id_puesto ASC
      LIMIT 1
      `,
    );

    departmentId = toPositiveInt(departmentRows?.[0]?.id) ?? 0;
    positionId = toPositiveInt(positionRows?.[0]?.id) ?? 0;

    if (!departmentId || !positionId) {
      throw new Error('No hay departamento/puesto activos para E2E de reglas de distribucion.');
    }
  });

  afterAll(async () => {
    try {
      if (forcedPermissionIds.length > 0 && companyId > 0) {
        const placeholders = forcedPermissionIds.map(() => '?').join(',');
        await dataSource.query(
          `
          DELETE FROM sys_usuario_permiso
          WHERE id_usuario = ?
            AND id_app = 1
            AND id_empresa = ?
            AND id_permiso IN (${placeholders})
          `,
          [authUserId, companyId, ...forcedPermissionIds],
        );
      }

      if (createdRulePublicIds.length > 0) {
        const placeholders = createdRulePublicIds.map(() => '?').join(',');
        await dataSource.query(
          `
          DELETE d
          FROM config_reglas_distribucion_detalle d
          INNER JOIN config_reglas_distribucion r
            ON r.id_regla_distribucion = d.id_regla_distribucion
          WHERE r.public_id_regla_distribucion IN (${placeholders})
          `,
          createdRulePublicIds,
        );

        await dataSource.query(
          `
          DELETE FROM config_reglas_distribucion
          WHERE public_id_regla_distribucion IN (${placeholders})
          `,
          createdRulePublicIds,
        );
      }
    } finally {
      await app.close();
    }
  });

  const authHeader = () => ({
    Authorization: `Bearer ${accessToken}`,
    'x-app-code': 'kpital',
    'x-authz-refresh': '1',
  });

  it('health endpoint responde OK', async () => {
    const response = await request(app.getHttpServer()).get('/distribution-rules/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', module: 'distribution-rules' });
  });

  it('crea regla global y valida seguridad de publicId', async () => {
    const payload = {
      idEmpresa: companyId,
      esReglaGlobal: true,
      detalles: actionAccountPairs,
    };

    const createResponse = await request(app.getHttpServer())
      .post('/distribution-rules')
      .set(authHeader())
      .send(payload)
      .expect(201);

    const publicId = String(createResponse.body?.publicId ?? '');
    expectPublicIdShape(publicId);
    createdRulePublicIds.push(publicId);

    const getResponse = await request(app.getHttpServer())
      .get(`/distribution-rules/${publicId}`)
      .set(authHeader())
      .expect(200);

    expect(getResponse.body.idEmpresa).toBe(companyId);
    expect(getResponse.body.esReglaGlobal).toBe(1);
    expect(Array.isArray(getResponse.body.detalles)).toBe(true);
    expect(getResponse.body.detalles.length).toBe(actionAccountPairs.length);

    const tamperedPublicId = publicId.replace('dr1_', 'dr1x_');
    await request(app.getHttpServer())
      .get(`/distribution-rules/${tamperedPublicId}`)
      .set(authHeader())
      .expect(404);
  });

  it('bloquea duplicado de regla global activa por empresa', async () => {
    const response = await request(app.getHttpServer())
      .post('/distribution-rules')
      .set(authHeader())
      .send({
        idEmpresa: companyId,
        esReglaGlobal: true,
        detalles: actionAccountPairs,
      })
      .expect(409);

    expect(String(response.body?.message ?? '').toLowerCase()).toContain('ya existe');
  });

  it('crea regla especifica, actualiza scope y prueba inactivar/reactivar', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/distribution-rules')
      .set(authHeader())
      .send({
        idEmpresa: companyId,
        esReglaGlobal: false,
        idDepartamento: departmentId,
        idPuesto: null,
        detalles: actionAccountPairs,
      })
      .expect(201);

    const publicId = String(createResponse.body?.publicId ?? '');
    expectPublicIdShape(publicId);
    createdRulePublicIds.push(publicId);

    const updateResponse = await request(app.getHttpServer())
      .put(`/distribution-rules/${publicId}`)
      .set(authHeader())
      .send({
        esReglaGlobal: false,
        idDepartamento: departmentId,
        idPuesto: positionId,
        detalles: [actionAccountPairs[0]],
      })
      .expect(200);

    expect(updateResponse.body.idDepartamento).toBe(departmentId);
    expect(updateResponse.body.idPuesto).toBe(positionId);
    expect(updateResponse.body.detalles.length).toBe(1);

    await request(app.getHttpServer())
      .patch(`/distribution-rules/${publicId}/inactivate`)
      .set(authHeader())
      .expect(200);

    const listAfterInactivate = await request(app.getHttpServer())
      .get(`/distribution-rules?idEmpresa=${companyId}`)
      .set(authHeader())
      .expect(200);

    const inactivatedRow = (listAfterInactivate.body as Array<Record<string, unknown>>).find(
      (row) => String(row.publicId ?? '') === publicId,
    );
    expect(inactivatedRow).toBeDefined();
    expect(Number(inactivatedRow?.estadoRegla ?? 0)).toBe(0);

    await request(app.getHttpServer())
      .patch(`/distribution-rules/${publicId}/reactivate`)
      .set(authHeader())
      .expect(200);

    const getAfterReactivate = await request(app.getHttpServer())
      .get(`/distribution-rules/${publicId}`)
      .set(authHeader())
      .expect(200);

    expect(Number(getAfterReactivate.body.estadoRegla)).toBe(1);
  });

  it('bloquea lineas duplicadas por tipo de accion personal', async () => {
    const duplicateType = actionAccountPairs[0].idTipoAccionPersonal;
    const duplicateAccount = actionAccountPairs[0].idCuentaContable;

    const response = await request(app.getHttpServer())
      .post('/distribution-rules')
      .set(authHeader())
      .send({
        idEmpresa: companyId,
        esReglaGlobal: false,
        idDepartamento: departmentId,
        idPuesto: positionId,
        detalles: [
          { idTipoAccionPersonal: duplicateType, idCuentaContable: duplicateAccount },
          { idTipoAccionPersonal: duplicateType, idCuentaContable: duplicateAccount },
        ],
      })
      .expect(400);

    expect(String(response.body?.message ?? '').toLowerCase()).toContain('repetir');
  });

  it('bitacora devuelve eventos para regla existente', async () => {
    const targetPublicId = createdRulePublicIds[0];
    const response = await request(app.getHttpServer())
      .get(`/distribution-rules/${targetPublicId}/audit-trail?limit=10`)
      .set(authHeader())
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
});
