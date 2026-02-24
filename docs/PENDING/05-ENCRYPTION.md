# 🔐 ENCRYPTION - Issues Pendientes

**Prioridad Global:** P0 (CRÍTICO - Compliance RGPD/CCPA)
**Esfuerzo Total:** 1 semana
**Asignado a:** [Sin asignar]

---

## ISSUE-032: Implementar EncryptionService completo

**Prioridad:** P0
**Esfuerzo:** M (2-3 días)
**Etiquetas:** [security] [encryption] [compliance]

### 📝 Descripción
Datos sensibles (salarios, cédulas, emails) se guardan en texto plano. Violación de RGPD/CCPA.

**Riesgo Legal:** Multas de hasta 4% del revenue anual global.

### 🎯 Objetivo
Servicio de encriptación AES-256-GCM funcionando end-to-end.

### 📁 Archivos Afectados
- `api/src/common/services/encryption.service.ts` (crear/completar)
- `api/src/common/services/employee-sensitive-data.service.ts` (ya existe, verificar)
- `api/.env` (añadir ENCRYPTION_KEY)
- `api/src/config/encryption.config.ts` (crear)

### ✅ Criterios de Aceptación
- [ ] EncryptionService con métodos encrypt/decrypt
- [ ] Algoritmo: AES-256-GCM (autenticado)
- [ ] Key management: AWS KMS o variable de entorno segura
- [ ] Key rotation strategy documentada
- [ ] Encrypt: retorna base64 con IV incluido
- [ ] Decrypt: valida MAC antes de decriptar
- [ ] Maneja errores de decriptación (datos corruptos)
- [ ] Tests unitarios: 100% coverage

### 🔧 Implementación Sugerida

```typescript
// src/common/services/encryption.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;
  private readonly saltLength = 64;
  private readonly tagLength = 16;

  constructor(private readonly config: ConfigService) {}

  /**
   * Deriva una key a partir del master secret usando scrypt.
   * IMPORTANTE: El master secret debe estar en AWS Secrets Manager, no en .env
   */
  private deriveKey(salt: Buffer): Buffer {
    const masterSecret = this.config.getOrThrow<string>('ENCRYPTION_MASTER_SECRET');
    return scryptSync(masterSecret, salt, this.keyLength);
  }

  /**
   * Encripta un string usando AES-256-GCM.
   * Formato del output (base64):
   *   salt (64 bytes) + iv (16 bytes) + tag (16 bytes) + ciphertext
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return plaintext;

    const salt = randomBytes(this.saltLength);
    const iv = randomBytes(this.ivLength);
    const key = this.deriveKey(salt);

    const cipher = createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const tag = cipher.getAuthTag();

    // Concatenar: salt + iv + tag + ciphertext
    const result = Buffer.concat([salt, iv, tag, encrypted]);

    return result.toString('base64');
  }

  /**
   * Decripta un string encriptado.
   * Lanza error si el tag de autenticación no coincide (datos manipulados).
   */
  decrypt(encrypted: string): string {
    if (!encrypted) return encrypted;

    try {
      const buffer = Buffer.from(encrypted, 'base64');

      // Extraer componentes
      const salt = buffer.subarray(0, this.saltLength);
      const iv = buffer.subarray(this.saltLength, this.saltLength + this.ivLength);
      const tag = buffer.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength,
      );
      const ciphertext = buffer.subarray(this.saltLength + this.ivLength + this.tagLength);

      const key = this.deriveKey(salt);

      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(ciphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encripta solo si el valor no está ya encriptado.
   * Detecta si es base64 válido con longitud > 100 (aproximación).
   */
  encryptIfPlaintext(value: string): string {
    if (!value) return value;

    // Si ya está encriptado (es base64 largo), no re-encriptar
    if (this.looksEncrypted(value)) {
      return value;
    }

    return this.encrypt(value);
  }

  /**
   * Heurística simple: si es base64 válido y largo, probablemente encriptado.
   */
  private looksEncrypted(value: string): boolean {
    if (value.length < 100) return false;
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    return base64Regex.test(value);
  }
}
```

```typescript
// encryption.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('encryption', () => ({
  masterSecret: process.env.ENCRYPTION_MASTER_SECRET,
  keyRotationDays: parseInt(process.env.ENCRYPTION_KEY_ROTATION_DAYS || '90', 10),
}));
```

### 🧪 Cómo Verificar

```typescript
// encryption.service.spec.ts
describe('EncryptionService', () => {
  it('debe encriptar y decriptar correctamente', () => {
    const plaintext = 'Salario: $5000';
    const encrypted = service.encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.length).toBeGreaterThan(100);

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('debe lanzar error si datos están corruptos', () => {
    const encrypted = service.encrypt('test');
    const corrupted = encrypted.slice(0, -5) + 'XXXXX';

    expect(() => service.decrypt(corrupted)).toThrow('Decryption failed');
  });

  it('debe usar salt diferente cada vez', () => {
    const plaintext = 'test';
    const enc1 = service.encrypt(plaintext);
    const enc2 = service.encrypt(plaintext);

    expect(enc1).not.toBe(enc2); // Diferente salt/IV
    expect(service.decrypt(enc1)).toBe(plaintext);
    expect(service.decrypt(enc2)).toBe(plaintext);
  });
});
```

---

## ISSUE-033: Migración de datos legacy a formato encriptado

**Prioridad:** P0
**Esfuerzo:** M (2 días)
**Etiquetas:** [security] [encryption] [migration]

### 📝 Descripción
Datos existentes en BD están en plaintext. Necesitamos migrarlos sin downtime.

### 🎯 Objetivo
Script de migración que encripta datos sensibles de empleados existentes.

### 📁 Archivos Afectados
- `api/src/database/migrations/XXXXXX-EncryptEmployeeSensitiveData.ts` (crear)
- `api/scripts/encrypt-legacy-data.ts` (crear)

### ✅ Criterios de Aceptación
- [ ] Migración encripta campos:
  - salario_base_empleado
  - email_personal_empleado
  - telefono_personal_empleado
  - direccion_exacta_empleado
  - cedula_empleado
  - numero_cuenta_bancaria (si existe)
- [ ] Migración es idempotente (puede correr múltiples veces)
- [ ] No encripta datos ya encriptados
- [ ] Usa transacciones (batch de 100 registros)
- [ ] Logging de progreso
- [ ] Backup de BD antes de correr
- [ ] Rollback plan documentado

### 🔧 Implementación Sugerida

```typescript
// migrations/XXXXXX-EncryptEmployeeSensitiveData.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class EncryptEmployeeSensitiveData1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️  IMPORTANTE: Esta migración encripta datos sensibles.');
    console.log('⚠️  Asegúrese de tener backup de BD antes de continuar.');

    // Usar script externo para la encriptación
    throw new Error(
      'Esta migración debe ejecutarse manualmente usando: npm run encrypt-legacy-data',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Esta migración no es reversible. Restaure desde backup.');
  }
}

// scripts/encrypt-legacy-data.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EncryptionService } from '../src/common/services/encryption.service';
import { Repository } from 'typeorm';
import { Employee } from '../src/modules/employees/entities/employee.entity';
import { InjectRepository } from '@nestjs/typeorm';

async function encryptLegacyData() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const encryptionService = app.get(EncryptionService);
  const employeeRepo = app.get('EmployeeRepository') as Repository<Employee>;

  const employees = await employeeRepo.find();
  console.log(`Encontrados ${employees.length} empleados para encriptar`);

  let encrypted = 0;
  let skipped = 0;

  for (const employee of employees) {
    const needsEncryption =
      employee.salarioBase &&
      !encryptionService.looksEncrypted(employee.salarioBase.toString());

    if (needsEncryption) {
      employee.salarioBase = parseFloat(
        encryptionService.encrypt(employee.salarioBase.toString()),
      );
      employee.emailPersonal = encryptionService.encryptIfPlaintext(employee.emailPersonal);
      employee.telefonoPersonal = encryptionService.encryptIfPlaintext(employee.telefonoPersonal);
      employee.direccionExacta = encryptionService.encryptIfPlaintext(employee.direccionExacta);
      employee.cedula = encryptionService.encryptIfPlaintext(employee.cedula);

      await employeeRepo.save(employee);
      encrypted++;
      console.log(`✓ Empleado ${employee.id} encriptado`);
    } else {
      skipped++;
    }
  }

  console.log(`\n✓ Migración completada:`);
  console.log(`  - Encriptados: ${encrypted}`);
  console.log(`  - Saltados: ${skipped}`);

  await app.close();
}

encryptLegacyData().catch(console.error);
```

### 🧪 Cómo Verificar

```bash
# 1. Backup de BD
mysqldump -u user -p kpital_db > backup_pre_encryption.sql

# 2. Ejecutar script
npm run encrypt-legacy-data

# 3. Verificar en BD
SELECT id_empleado, salario_base_empleado FROM sys_empleados LIMIT 5;
# Debe mostrar strings base64 largos

# 4. Verificar que app puede leer
curl http://localhost:3000/api/employees/1
# Debe retornar salario decriptado correctamente
```

---

## ISSUE-034: Integrar encriptación en EmployeesService

**Prioridad:** P0
**Esfuerzo:** S (1 día)
**Etiquetas:** [security] [encryption] [backend]

### 📝 Descripción
EmployeesService debe encriptar al guardar y decriptar al leer automáticamente.

### 📁 Archivos Afectados
- `api/src/modules/employees/employees.service.ts`
- `api/src/modules/employees/entities/employee.entity.ts`

### ✅ Criterios de Aceptación
- [ ] create(): encripta campos sensibles antes de save
- [ ] update(): encripta campos modificados
- [ ] findOne/findAll(): decripta al retornar
- [ ] Usar TypeORM @AfterLoad y @BeforeInsert/Update hooks
- [ ] Tests unitarios con datos encriptados

### 🔧 Implementación Sugerida

```typescript
// employee.entity.ts
import { AfterLoad, BeforeInsert, BeforeUpdate } from 'typeorm';

@Entity('sys_empleados')
export class Employee {
  @Column()
  salarioBase: string; // Guardado encriptado

  @Column()
  cedula: string; // Guardado encriptado

  // Campos temporales para versión decriptada
  private salarioBaseDecrypted?: number;
  private cedulaDecrypted?: string;

  @AfterLoad()
  async decrypt() {
    const encryptionService = /* inyectar de alguna forma */;
    this.salarioBaseDecrypted = parseFloat(encryptionService.decrypt(this.salarioBase));
    this.cedulaDecrypted = encryptionService.decrypt(this.cedula);
  }

  @BeforeInsert()
  @BeforeUpdate()
  async encrypt() {
    const encryptionService = /* inyectar */;
    if (this.salarioBaseDecrypted !== undefined) {
      this.salarioBase = encryptionService.encrypt(this.salarioBaseDecrypted.toString());
    }
    if (this.cedulaDecrypted !== undefined) {
      this.cedula = encryptionService.encrypt(this.cedulaDecrypted);
    }
  }
}

// Alternativa más simple: hacerlo en el service
// employees.service.ts
async create(dto: CreateEmployeeDto): Promise<Employee> {
  const employee = this.repo.create(dto);

  // Encriptar antes de guardar
  employee.salarioBase = this.encryptionService.encrypt(dto.salarioBase.toString());
  employee.cedula = this.encryptionService.encrypt(dto.cedula);
  employee.emailPersonal = this.encryptionService.encrypt(dto.emailPersonal);

  const saved = await this.repo.save(employee);

  // Decriptar antes de retornar
  return this.decryptEmployee(saved);
}

private decryptEmployee(employee: Employee): Employee {
  return {
    ...employee,
    salarioBase: parseFloat(this.encryptionService.decrypt(employee.salarioBase)),
    cedula: this.encryptionService.decrypt(employee.cedula),
    emailPersonal: this.encryptionService.decrypt(employee.emailPersonal),
  };
}
```

---

## ISSUE-035: Key management con AWS Secrets Manager

**Prioridad:** P1
**Esfuerzo:** M (2 días)
**Etiquetas:** [security] [encryption] [aws]

### 📝 Descripción
ENCRYPTION_MASTER_SECRET no debe estar en .env. Necesitamos AWS Secrets Manager.

### ✅ Criterios de Aceptación
- [ ] Master key guardada en AWS Secrets Manager
- [ ] App carga key al iniciar (no en cada request)
- [ ] Key rotation automática cada 90 días
- [ ] Documentar proceso de rotación manual
- [ ] Fallback a .env solo para desarrollo local

### 🔧 Implementación Sugerida

```typescript
// src/config/secrets.config.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export async function loadEncryptionKey(): Promise<string> {
  if (process.env.NODE_ENV === 'development') {
    return process.env.ENCRYPTION_MASTER_SECRET || 'dev-key-not-secure';
  }

  const client = new SecretsManagerClient({ region: 'us-east-1' });

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: 'kpital/encryption/master-key',
      }),
    );

    return JSON.parse(response.SecretString).masterKey;
  } catch (error) {
    console.error('Failed to load encryption key from AWS Secrets Manager', error);
    throw error;
  }
}
```

---

## 📊 Progreso Encryption

- [ ] ISSUE-032: EncryptionService completo
- [ ] ISSUE-033: Migración datos legacy
- [ ] ISSUE-034: Integración en EmployeesService
- [ ] ISSUE-035: AWS Secrets Manager

**Total:** 0/4 completados (0%)

---

## ⚠️ ADVERTENCIA LEGAL

**Datos sin encriptar es una violación de:**
- RGPD (Europa): Multas hasta €20M o 4% revenue anual
- CCPA (California): Multas hasta $7,500 por violación
- Ley 8968 Costa Rica: Protección de datos personales

**Implementar ANTES de producción es OBLIGATORIO.**
