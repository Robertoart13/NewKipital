import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import {
  EstadoCalendarioNomina,
  PayrollCalendar,
} from '../payroll/entities/payroll-calendar.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { createReadStream } from 'node:fs';
import {
  access,
  copyFile,
  mkdir,
  readdir,
  rename,
  rm,
  unlink,
} from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { AuditOutboxService } from '../integration/audit-outbox.service';

const COMPANY_LOGO_DIR = join(process.cwd(), 'uploads', 'logoEmpresa');
const COMPANY_LOGO_TEMP_DIR = join(COMPANY_LOGO_DIR, 'temp');
const ALLOWED_LOGO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
const DEFAULT_LOGO_CANDIDATES = [
  process.env.COMPANY_DEFAULT_LOGO_PATH?.trim(),
  join(
    process.cwd(),
    '..',
    'frontend',
    'public',
    'assets',
    'images',
    'global',
    'LogoSmall.png',
  ),
  join(process.cwd(), 'public', 'assets', 'images', 'global', 'LogoSmall.png'),
].filter((v): v is string => Boolean(v));

export interface CompanyLogoTempResult {
  tempFileName: string;
  tempPath: string;
  size: number;
  mimeType: string;
}

export interface CompanyLogoCommitResult {
  logoFileName: string;
  logoPath: string;
  logoUrl: string;
}

export interface CompanyLogoResolved {
  absolutePath: string;
  mimeType: string;
}

export interface CompanyAuditTrailItem {
  id: string;
  modulo: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  actorUserId: number | null;
  actorNombre: string | null;
  actorEmail: string | null;
  descripcion: string;
  fechaCreacion: string | null;
  metadata: Record<string, unknown> | null;
  cambios: Array<{ campo: string; antes: string; despues: string }>;
}

@Injectable()
export class CompaniesService {
  /** Estados de planilla que bloquean inactivar empresa (DOC-34 UC-18, PEND-001). */
  private static readonly PLANILLA_ESTADOS_BLOQUEANTES = [
    EstadoCalendarioNomina.ABIERTA,
    EstadoCalendarioNomina.EN_PROCESO,
    EstadoCalendarioNomina.VERIFICADA,
  ];

  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
    @InjectRepository(PayrollCalendar)
    private readonly payrollCalendarRepo: Repository<PayrollCalendar>,
    private readonly auditOutbox: AuditOutboxService,
  ) {}

  private toAuditSnapshot(company: Company): Record<string, unknown> {
    return {
      id: company.id,
      nombre: company.nombre,
      nombreLegal: company.nombreLegal ?? null,
      cedula: company.cedula ?? null,
      actividadEconomica: company.actividadEconomica ?? null,
      prefijo: company.prefijo ?? null,
      idExterno: company.idExterno ?? null,
      direccionExacta: company.direccionExacta ?? null,
      telefono: company.telefono ?? null,
      email: company.email ?? null,
      codigoPostal: company.codigoPostal ?? null,
      estado: company.estado,
      fechaInactivacion: company.fechaInactivacion ?? null,
      creadoPor: company.creadoPor ?? null,
      modificadoPor: company.modificadoPor ?? null,
    };
  }

  private async ensureLogoDirectories(): Promise<void> {
    await mkdir(COMPANY_LOGO_DIR, { recursive: true });
    await mkdir(COMPANY_LOGO_TEMP_DIR, { recursive: true });
  }

  private getLogoMimeTypeByExtension(extension: string): string {
    const ext = extension.toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.svg') return 'image/svg+xml';
    return 'application/octet-stream';
  }

  private getCompanyLogoUrl(companyId: number): string {
    return `/api/companies/${companyId}/logo`;
  }

  private readonly auditFieldLabels: Record<string, string> = {
    nombre: 'Nombre empresa',
    nombreLegal: 'Nombre legal',
    cedula: 'Cedula',
    actividadEconomica: 'Actividad economica',
    prefijo: 'Prefijo',
    idExterno: 'ID externo',
    direccionExacta: 'Direccion exacta',
    telefono: 'Telefono',
    email: 'Email',
    codigoPostal: 'Codigo postal',
    estado: 'Estado',
    fechaInactivacion: 'Fecha inactivacion',
    logoPath: 'Logo',
    logoFileName: 'Archivo de logo',
    logoUrl: 'URL de logo',
  };

  private normalizeAuditValue(value: unknown): string {
    if (value === null || value === undefined) return '(vacio)';
    if (typeof value === 'boolean') return value ? 'Si' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    const text = String(value).trim();
    return text.length > 0 ? text : '(vacio)';
  }

  private buildAuditChanges(
    payloadBefore: Record<string, unknown> | null,
    payloadAfter: Record<string, unknown> | null,
  ): Array<{ campo: string; antes: string; despues: string }> {
    if (!payloadBefore || !payloadAfter) return [];

    const keys = new Set<string>([
      ...Object.keys(payloadBefore),
      ...Object.keys(payloadAfter),
    ]);

    const changes: Array<{ campo: string; antes: string; despues: string }> =
      [];
    for (const key of keys) {
      if (!(key in this.auditFieldLabels)) continue;
      const beforeValue = this.normalizeAuditValue(payloadBefore[key]);
      const afterValue = this.normalizeAuditValue(payloadAfter[key]);
      if (beforeValue === afterValue) continue;
      changes.push({
        campo: this.auditFieldLabels[key] ?? key,
        antes: beforeValue,
        despues: afterValue,
      });
    }

    return changes;
  }

  private async findCompanyLogoAbsolutePath(
    companyId: number,
  ): Promise<string | null> {
    await this.ensureLogoDirectories();
    for (const extension of ALLOWED_LOGO_EXTENSIONS) {
      const candidate = join(COMPANY_LOGO_DIR, `${companyId}${extension}`);
      try {
        await access(candidate);
        return candidate;
      } catch {
        // noop
      }
    }
    return null;
  }

  private async getDefaultLogoAbsolutePath(): Promise<string> {
    for (const candidate of DEFAULT_LOGO_CANDIDATES) {
      try {
        await access(candidate);
        return candidate;
      } catch {
        // noop
      }
    }
    throw new NotFoundException(
      'No se encontro imagen por defecto. Configure COMPANY_DEFAULT_LOGO_PATH o verifique LogoSmall.png',
    );
  }

  private async removeExistingCompanyLogos(companyId: number): Promise<void> {
    await this.ensureLogoDirectories();
    const files = await readdir(COMPANY_LOGO_DIR, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile()) continue;
      const fileName = file.name.toLowerCase();
      if (!fileName.startsWith(`${companyId}.`)) continue;
      await unlink(join(COMPANY_LOGO_DIR, file.name)).catch(() => undefined);
    }
  }

  private async mapCompanyWithLogo(
    company: Company,
  ): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    const absoluteLogoPath = await this.findCompanyLogoAbsolutePath(company.id);
    const logoPath = absoluteLogoPath
      ? `uploads/logoEmpresa/${basename(absoluteLogoPath)}`
      : null;
    return {
      ...company,
      logoUrl: this.getCompanyLogoUrl(company.id),
      logoPath,
    };
  }

  private async getCompanyAuditLabel(companyId: number): Promise<string> {
    const row = await this.repo.findOne({ where: { id: companyId } });
    if (!row) return `empresa #${companyId}`;
    return `${row.nombre} (ID ${companyId})`;
  }

  private async getUserAuditLabel(userId: number): Promise<string> {
    const rows = await this.repo.query(
      `
      SELECT nombre_usuario AS nombre, apellido_usuario AS apellido, email_usuario AS email
      FROM sys_usuarios
      WHERE id_usuario = ?
      LIMIT 1
      `,
      [userId],
    );
    const row = rows?.[0];
    if (!row) return `usuario #${userId}`;
    const fullName =
      `${String(row.nombre ?? '').trim()} ${String(row.apellido ?? '').trim()}`.trim();
    const primary =
      fullName || String(row.email ?? '').trim() || `usuario #${userId}`;
    return `${primary} (ID ${userId})`;
  }

  async create(
    dto: CreateCompanyDto,
    userId: number,
  ): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    const saved = await this.repo.manager.transaction(async (manager) => {
      const txRepo = manager.getRepository(Company);
      const existing = await txRepo.findOne({
        where: [{ cedula: dto.cedula }, { prefijo: dto.prefijo }],
      });

      if (existing) {
        throw new ConflictException(
          existing.cedula === dto.cedula
            ? 'Ya existe una empresa con esa cedula'
            : 'Ya existe una empresa con ese prefijo',
        );
      }

      const company = txRepo.create({
        ...dto,
        estado: 1,
        creadoPor: userId,
        modificadoPor: userId,
      });

      const persisted = await txRepo.save(company);
      await this.assignCompanyToMasterUsers(persisted.id, manager, userId);
      return persisted;
    });

    this.auditOutbox.publish({
      modulo: 'companies',
      accion: 'create',
      entidad: 'company',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.id,
      descripcion: `Empresa creada: ${saved.nombre}`,
      payloadAfter: this.toAuditSnapshot(saved),
      metadata: { autoAssignedToMaster: true },
    });

    return this.mapCompanyWithLogo(saved);
  }

  async findAll(
    includeInactive = false,
    userId: number,
    inactiveOnly = false,
    includeAll = false,
  ): Promise<Array<Company & { logoUrl: string; logoPath: string | null }>> {
    const qb = this.repo
      .createQueryBuilder('company')
      .orderBy('company.nombre', 'ASC');

    if (!includeAll) {
      qb.innerJoin(
        'sys_usuario_empresa',
        'ue',
        'ue.id_empresa = company.id_empresa AND ue.id_usuario = :userId AND ue.estado_usuario_empresa = 1',
        { userId },
      );
    }

    if (inactiveOnly) {
      qb.andWhere('company.estado = 0');
    } else if (!includeInactive) {
      qb.andWhere('company.estado = 1');
    }

    const companies = await qb.getMany();
    return Promise.all(
      companies.map((company) => this.mapCompanyWithLogo(company)),
    );
  }

  async findOne(
    id: number,
    userId: number,
  ): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    await this.assertUserCompanyAccess(userId, id);
    const company = await this.repo.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }
    return this.mapCompanyWithLogo(company);
  }

  async update(
    id: number,
    dto: UpdateCompanyDto,
    userId: number,
  ): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    await this.assertUserCompanyAccess(userId, id);
    const company = await this.repo.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }
    const before = this.toAuditSnapshot(company);

    if (dto.prefijo && dto.prefijo !== company.prefijo) {
      const existing = await this.repo.findOne({
        where: { prefijo: dto.prefijo },
      });
      if (existing) {
        throw new ConflictException('Ya existe una empresa con ese prefijo');
      }
    }

    if (dto.cedula && dto.cedula !== company.cedula) {
      const existing = await this.repo.findOne({
        where: { cedula: dto.cedula },
      });
      if (existing) {
        throw new ConflictException('Ya existe una empresa con esa cedula');
      }
    }

    Object.assign(company, dto, { modificadoPor: userId });
    const saved = await this.repo.save(company);

    this.auditOutbox.publish({
      modulo: 'companies',
      accion: 'update',
      entidad: 'company',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.id,
      descripcion: `Empresa actualizada: ${saved.nombre}`,
      payloadBefore: before,
      payloadAfter: this.toAuditSnapshot(saved),
    });

    return this.mapCompanyWithLogo(saved);
  }

  async inactivate(
    id: number,
    userId: number,
  ): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    await this.assertUserCompanyAccess(userId, id);
    const company = await this.repo.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }
    const planillasActivas = await this.payrollCalendarRepo.find({
      where: {
        idEmpresa: id,
        estado: In(CompaniesService.PLANILLA_ESTADOS_BLOQUEANTES),
        esInactivo: 0,
      },
      select: {
        id: true,
        fechaInicioPeriodo: true,
        fechaFinPeriodo: true,
        estado: true,
        tipoPlanilla: true,
      },
    });
    if (planillasActivas.length > 0) {
      throw new ConflictException({
        message:
          'La empresa tiene planillas activas. Debe cerrarlas o aplicarlas primero.',
        code: 'PLANILLAS_ACTIVAS',
        planillas: planillasActivas.map((p) => ({
          id: p.id,
          fechaInicioPeriodo: p.fechaInicioPeriodo,
          fechaFinPeriodo: p.fechaFinPeriodo,
          estado: p.estado,
          tipoPlanilla: p.tipoPlanilla,
        })),
      });
    }
    const before = this.toAuditSnapshot(company);

    company.estado = 0;
    company.fechaInactivacion = new Date();
    company.modificadoPor = userId;
    const saved = await this.repo.save(company);

    this.auditOutbox.publish({
      modulo: 'companies',
      accion: 'inactivate',
      entidad: 'company',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.id,
      descripcion: `Empresa inactivada: ${saved.nombre}`,
      payloadBefore: before,
      payloadAfter: this.toAuditSnapshot(saved),
    });

    return this.mapCompanyWithLogo(saved);
  }

  async reactivate(
    id: number,
    userId: number,
  ): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    await this.assertUserCompanyAccess(userId, id);
    const company = await this.repo.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }
    const before = this.toAuditSnapshot(company);

    company.estado = 1;
    company.fechaInactivacion = null;
    company.modificadoPor = userId;
    const saved = await this.repo.save(company);

    this.auditOutbox.publish({
      modulo: 'companies',
      accion: 'reactivate',
      entidad: 'company',
      entidadId: saved.id,
      actorUserId: userId,
      companyContextId: saved.id,
      descripcion: `Empresa reactivada: ${saved.nombre}`,
      payloadBefore: before,
      payloadAfter: this.toAuditSnapshot(saved),
    });

    return this.mapCompanyWithLogo(saved);
  }

  async registerTempLogo(file: {
    filename: string;
    path: string;
    size: number;
    mimetype: string;
  }): Promise<CompanyLogoTempResult> {
    await this.ensureLogoDirectories();
    const extension = extname(file.filename).toLowerCase();
    if (!ALLOWED_LOGO_EXTENSIONS.includes(extension)) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Formato de imagen no permitido');
    }

    return {
      tempFileName: basename(file.filename),
      tempPath: `uploads/logoEmpresa/temp/${basename(file.filename)}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async commitTempLogo(
    companyId: number,
    tempFileName: string,
    actorUserId: number,
  ): Promise<CompanyLogoCommitResult> {
    await this.assertUserCompanyAccess(actorUserId, companyId);
    const safeTempFileName = basename(tempFileName || '').trim();
    if (!safeTempFileName) {
      throw new BadRequestException('tempFileName es requerido');
    }

    await this.ensureLogoDirectories();

    const company = await this.repo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${companyId} no encontrada`);
    }

    const tempAbsolutePath = resolve(COMPANY_LOGO_TEMP_DIR, safeTempFileName);
    if (!tempAbsolutePath.startsWith(resolve(COMPANY_LOGO_TEMP_DIR))) {
      throw new BadRequestException('tempFileName invalido');
    }

    await access(tempAbsolutePath).catch(() => {
      throw new NotFoundException('Archivo temporal no encontrado');
    });

    const extension = extname(safeTempFileName).toLowerCase();
    if (!ALLOWED_LOGO_EXTENSIONS.includes(extension)) {
      throw new BadRequestException('Formato de imagen no permitido');
    }

    await this.removeExistingCompanyLogos(companyId);

    const finalFileName = `${companyId}${extension}`;
    const finalAbsolutePath = join(COMPANY_LOGO_DIR, finalFileName);

    try {
      await rename(tempAbsolutePath, finalAbsolutePath);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code !== 'EXDEV') throw error;
      await copyFile(tempAbsolutePath, finalAbsolutePath);
      await rm(tempAbsolutePath, { force: true });
    }

    const result = {
      logoFileName: finalFileName,
      logoPath: `uploads/logoEmpresa/${finalFileName}`,
      logoUrl: this.getCompanyLogoUrl(companyId),
    };
    const companyLabel = await this.getCompanyAuditLabel(companyId);

    this.auditOutbox.publish({
      modulo: 'companies',
      accion: 'logo_commit',
      entidad: 'company',
      entidadId: companyId,
      actorUserId,
      companyContextId: companyId,
      descripcion: `Logo de empresa actualizado: "${companyLabel}"`,
      payloadAfter: result as unknown as Record<string, unknown>,
    });

    return result;
  }

  async resolveCompanyLogo(
    companyId: number,
    actorUserId: number,
  ): Promise<CompanyLogoResolved> {
    await this.assertUserCompanyAccess(actorUserId, companyId);
    const company = await this.repo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${companyId} no encontrada`);
    }

    const logoPath = await this.findCompanyLogoAbsolutePath(companyId);
    const absolutePath = logoPath ?? (await this.getDefaultLogoAbsolutePath());
    return {
      absolutePath,
      mimeType: this.getLogoMimeTypeByExtension(extname(absolutePath)),
    };
  }

  async getAuditTrail(
    companyId: number,
    actorUserId: number,
    limit = 100,
  ): Promise<CompanyAuditTrailItem[]> {
    await this.assertUserCompanyAccess(actorUserId, companyId);
    const company = await this.repo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${companyId} no encontrada`);
    }

    const safeLimit = Math.min(Math.max(Number(limit || 100), 1), 500);
    const companyIdAsText = String(companyId);
    const rows = await this.repo.query(
      `
      SELECT
        a.id_auditoria_accion AS id,
        a.modulo_auditoria AS modulo,
        a.accion_auditoria AS accion,
        a.entidad_auditoria AS entidad,
        a.id_entidad_auditoria AS entidadId,
        a.id_usuario_actor_auditoria AS actorUserId,
        a.descripcion_auditoria AS descripcion,
        a.fecha_creacion_auditoria AS fechaCreacion,
        a.metadata_auditoria AS metadata,
        a.payload_before_auditoria AS payloadBefore,
        a.payload_after_auditoria AS payloadAfter,
        CONCAT_WS(' ', actor.nombre_usuario, actor.apellido_usuario) AS actorNombre,
        actor.email_usuario AS actorEmail
      FROM sys_auditoria_acciones a
      LEFT JOIN sys_usuarios actor
        ON actor.id_usuario = a.id_usuario_actor_auditoria
      WHERE
        (a.entidad_auditoria = 'company' AND a.id_entidad_auditoria = ?)
        OR a.id_empresa_contexto_auditoria = ?
      ORDER BY a.fecha_creacion_auditoria DESC
      LIMIT ?
      `,
      [companyIdAsText, companyId, safeLimit],
    );

    return (rows ?? []).map((row: Record<string, unknown>) => {
      const payloadBefore =
        (row.payloadBefore as Record<string, unknown> | null) ?? null;
      const payloadAfter =
        (row.payloadAfter as Record<string, unknown> | null) ?? null;
      return {
        id: String(row.id ?? ''),
        modulo: String(row.modulo ?? ''),
        accion: String(row.accion ?? ''),
        entidad: String(row.entidad ?? ''),
        entidadId: row.entidadId == null ? null : String(row.entidadId),
        actorUserId: row.actorUserId == null ? null : Number(row.actorUserId),
        actorNombre: row.actorNombre ? String(row.actorNombre) : null,
        actorEmail: row.actorEmail ? String(row.actorEmail) : null,
        descripcion: String(row.descripcion ?? ''),
        fechaCreacion: row.fechaCreacion
          ? new Date(String(row.fechaCreacion)).toISOString()
          : null,
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
        cambios: this.buildAuditChanges(payloadBefore, payloadAfter),
      };
    });
  }

  createLogoReadStream(absolutePath: string) {
    return createReadStream(absolutePath);
  }

  private async assertUserCompanyAccess(
    userId: number,
    companyId: number,
  ): Promise<void> {
    const rows = await this.repo.query(
      `
      SELECT 1
      FROM sys_usuario_empresa ue
      WHERE ue.id_usuario = ?
        AND ue.id_empresa = ?
        AND ue.estado_usuario_empresa = 1
      LIMIT 1
      `,
      [userId, companyId],
    );
    if (rows.length === 0) {
      throw new ForbiddenException('No tiene acceso a esta empresa');
    }
  }

  private async assignCompanyToMasterUsers(
    companyId: number,
    manager: EntityManager,
    actorUserId: number,
  ): Promise<void> {
    const rows = await manager.query(
      `
      SELECT DISTINCT u.id_usuario AS id
      FROM sys_usuarios u
      INNER JOIN sys_roles r ON r.codigo_rol = 'MASTER' AND r.estado_rol = 1
      LEFT JOIN sys_usuario_rol ur
        ON ur.id_usuario = u.id_usuario
       AND ur.id_rol = r.id_rol
       AND ur.estado_usuario_rol = 1
      LEFT JOIN sys_usuario_rol_global urg
        ON urg.id_usuario = u.id_usuario
       AND urg.id_rol = r.id_rol
       AND urg.estado_usuario_rol_global = 1
      WHERE u.estado_usuario = 1
        AND (ur.id_usuario_rol IS NOT NULL OR urg.id_usuario_rol_global IS NOT NULL)
      `,
    );

    for (const row of rows) {
      const masterUserId = Number(row.id);
      if (!Number.isInteger(masterUserId) || masterUserId <= 0) continue;

      await manager.query(
        `
        INSERT INTO sys_usuario_empresa (
          id_usuario,
          id_empresa,
          estado_usuario_empresa,
          fecha_asignacion_usuario_empresa
        )
        VALUES (?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE estado_usuario_empresa = 1
        `,
        [masterUserId, companyId],
      );

      const [companyLabel, userLabel] = await Promise.all([
        this.getCompanyAuditLabel(companyId),
        this.getUserAuditLabel(masterUserId),
      ]);

      this.auditOutbox.publish({
        modulo: 'companies',
        accion: 'master_auto_assign',
        entidad: 'user_company',
        entidadId: `${masterUserId}:${companyId}`,
        actorUserId,
        companyContextId: companyId,
        descripcion: `Autoasignacion MASTER: "${companyLabel}" -> "${userLabel}"`,
        payloadAfter: { userId: masterUserId, companyId, estado: 1 },
      });
    }
  }
}
