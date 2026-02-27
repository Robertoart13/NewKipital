import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let testEmployeeId: number;
  const testCompanyId = 1;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'ana.garcia@roccacr.com',
        password: 'Demo2026!',
      });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /employees', () => {
    it('should return paginated employees for company', () => {
      return request(app.getHttpServer())
        .get(`/employees?idEmpresa=${testCompanyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('data');
          expect(response.body).toHaveProperty('total');
          expect(response.body).toHaveProperty('page');
          expect(response.body).toHaveProperty('pageSize');
          expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .get(`/employees?idEmpresa=${testCompanyId}`)
        .expect(401);
    });

    it('should reject request without company access', () => {
      return request(app.getHttpServer())
        .get('/employees?idEmpresa=99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });

    it('should support pagination parameters', () => {
      return request(app.getHttpServer())
        .get(`/employees?idEmpresa=${testCompanyId}&page=1&pageSize=10`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.page).toBe(1);
          expect(response.body.pageSize).toBe(10);
          expect(response.body.data.length).toBeLessThanOrEqual(10);
        });
    });

    it('should support search parameter', () => {
      return request(app.getHttpServer())
        .get(`/employees?idEmpresa=${testCompanyId}&search=john`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('data');
          expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    it('should support estado filter', () => {
      return request(app.getHttpServer())
        .get(`/employees?idEmpresa=${testCompanyId}&estado=1`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('data');
          response.body.data.forEach((emp: any) => {
            expect(emp.estado).toBe(1);
          });
        });
    });

    it('should support sorting', () => {
      return request(app.getHttpServer())
        .get(
          `/employees?idEmpresa=${testCompanyId}&sort=fechaIngreso&order=DESC`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /employees', () => {
    it('should create employee without digital access', () => {
      return request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          codigo: `EMP${Date.now()}`,
          cedula: `${Date.now()}`,
          nombre: 'Test',
          apellido1: 'Employee',
          email: `test${Date.now()}@example.com`,
          fechaIngreso: '2024-01-01',
          crearAccesoKpital: false,
          crearAccesoTimewise: false,
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body.data).toHaveProperty('employee');
          testEmployeeId = response.body.data.employee.id;
        });
    });

    it('should create employee with TimeWise access', () => {
      return request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          codigo: `EMPTW${Date.now()}`,
          cedula: `${Date.now()}`,
          nombre: 'TimeWise',
          apellido1: 'User',
          email: `tw${Date.now()}@example.com`,
          fechaIngreso: '2024-01-01',
          crearAccesoTimewise: true,
          idRolTimewise: 5,
          passwordInicial: 'TempPassword123!',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('success', true);
          expect(response.body.data.appsAssigned).toContain('timewise');
        });
    });

    it('should reject employee creation with missing required fields', () => {
      return request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          // Missing codigo, cedula, nombre, etc.
        })
        .expect(400);
    });

    it('should reject employee creation with duplicate cedula', async () => {
      const cedula = `DUPLICATE${Date.now()}`;

      // Create first employee
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          codigo: `EMP${Date.now()}`,
          cedula,
          nombre: 'First',
          apellido1: 'Employee',
          email: `first${Date.now()}@example.com`,
          fechaIngreso: '2024-01-01',
        });

      // Try to create second employee with same cedula
      return request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          codigo: `EMP${Date.now()}`,
          cedula, // Same cedula
          nombre: 'Second',
          apellido1: 'Employee',
          email: `second${Date.now()}@example.com`,
          fechaIngreso: '2024-01-01',
        })
        .expect(409);
    });

    it('should reject employee creation with duplicate email', async () => {
      const email = `duplicate${Date.now()}@example.com`;

      // Create first employee
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          codigo: `EMP${Date.now()}`,
          cedula: `${Date.now()}`,
          nombre: 'First',
          apellido1: 'Employee',
          email,
          fechaIngreso: '2024-01-01',
        });

      // Try to create second employee with same email
      return request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          codigo: `EMP${Date.now()}`,
          cedula: `${Date.now() + 1}`,
          nombre: 'Second',
          apellido1: 'Employee',
          email, // Same email
          fechaIngreso: '2024-01-01',
        })
        .expect(409);
    });

    it('should reject employee creation without company access', () => {
      return request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: 99999, // Company without access
          codigo: `EMP${Date.now()}`,
          cedula: `${Date.now()}`,
          nombre: 'Test',
          apellido1: 'Employee',
          email: `test${Date.now()}@example.com`,
          fechaIngreso: '2024-01-01',
        })
        .expect(403);
    });

    it('should create employee with provisiones aguinaldo', () => {
      return request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          codigo: `EMPPROV${Date.now()}`,
          cedula: `${Date.now()}`,
          nombre: 'WithProvision',
          apellido1: 'Employee',
          email: `prov${Date.now()}@example.com`,
          fechaIngreso: '2024-01-01',
          provisionesAguinaldo: [
            {
              idEmpresa: testCompanyId,
              montoProvisionado: 50000,
              fechaInicioLaboral: '2023-01-01',
              registroEmpresa: 'Previous Company',
            },
          ],
        })
        .expect(201);
    });
  });

  describe('GET /employees/:id', () => {
    it('should return employee by id', () => {
      return request(app.getHttpServer())
        .get(`/employees/${testEmployeeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', testEmployeeId);
          expect(response.body).toHaveProperty('codigo');
          expect(response.body).toHaveProperty('idEmpresa');
        });
    });

    it('should return 404 for non-existent employee', () => {
      return request(app.getHttpServer())
        .get('/employees/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should reject request without authentication', () => {
      return request(app.getHttpServer())
        .get(`/employees/${testEmployeeId}`)
        .expect(401);
    });
  });

  describe('PUT /employees/:id', () => {
    it('should update employee', () => {
      return request(app.getHttpServer())
        .put(`/employees/${testEmployeeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'Updated',
          apellido1: 'Name',
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', testEmployeeId);
        });
    });

    it('should reject update without authentication', () => {
      return request(app.getHttpServer())
        .put(`/employees/${testEmployeeId}`)
        .send({
          nombre: 'Updated',
        })
        .expect(401);
    });

    it('should reject update of non-existent employee', () => {
      return request(app.getHttpServer())
        .put('/employees/999999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nombre: 'Updated',
        })
        .expect(404);
    });
  });

  describe('PATCH /employees/:id/inactivate', () => {
    it('should inactivate employee', () => {
      return request(app.getHttpServer())
        .patch(`/employees/${testEmployeeId}/inactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('estado', 0);
        });
    });

    it('should reject inactivate without authentication', () => {
      return request(app.getHttpServer())
        .patch(`/employees/${testEmployeeId}/inactivate`)
        .expect(401);
    });
  });

  describe('PATCH /employees/:id/reactivate', () => {
    it('should reactivate employee', () => {
      return request(app.getHttpServer())
        .patch(`/employees/${testEmployeeId}/reactivate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('estado', 1);
        });
    });
  });

  describe('GET /employees/supervisors', () => {
    it('should return supervisors for company', () => {
      return request(app.getHttpServer())
        .get(`/employees/supervisors?idEmpresa=${testCompanyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          response.body.forEach((supervisor: any) => {
            expect(supervisor).toHaveProperty('id');
            expect(supervisor).toHaveProperty('nombre');
            expect(supervisor).toHaveProperty('apellido1');
          });
        });
    });

    it('should reject request without idEmpresa', () => {
      return request(app.getHttpServer())
        .get('/employees/supervisors')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('Permissions', () => {
    it('should respect employee:view permission', async () => {
      // This test assumes the user has employee:view permission
      const response = await request(app.getHttpServer())
        .get(`/employees?idEmpresa=${testCompanyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should enforce employee:create permission', () => {
      // Test that employee creation requires proper permission
      return request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          codigo: `PERMTEST${Date.now()}`,
          cedula: `${Date.now()}`,
          nombre: 'Permission',
          apellido1: 'Test',
          email: `permtest${Date.now()}@example.com`,
          fechaIngreso: '2024-01-01',
        })
        .expect((response) => {
          // Should either succeed (201) or fail with 403 if permission missing
          expect([201, 403]).toContain(response.status);
        });
    });
  });

  describe('Data Validation', () => {
    it('should reject invalid email format', () => {
      return request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          codigo: `EMP${Date.now()}`,
          cedula: `${Date.now()}`,
          nombre: 'Test',
          apellido1: 'Employee',
          email: 'not-an-email',
          fechaIngreso: '2024-01-01',
        })
        .expect(400);
    });

    it('should reject negative vacaciones acumuladas', () => {
      return request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          codigo: `EMP${Date.now()}`,
          cedula: `${Date.now()}`,
          nombre: 'Test',
          apellido1: 'Employee',
          email: `test${Date.now()}@example.com`,
          fechaIngreso: '2024-01-01',
          vacacionesAcumuladas: -5,
        })
        .expect(400);
    });

    it('should reject future fechaIngreso', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      return request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          idEmpresa: testCompanyId,
          codigo: `EMP${Date.now()}`,
          cedula: `${Date.now()}`,
          nombre: 'Test',
          apellido1: 'Employee',
          email: `test${Date.now()}@example.com`,
          fechaIngreso: futureDate.toISOString().split('T')[0],
        })
        .expect(400);
    });
  });
});
