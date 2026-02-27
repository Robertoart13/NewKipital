import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollMovement } from './entities/payroll-movement.entity';
import { CreatePayrollMovementDto } from './dto/create-payroll-movement.dto';
import { UpdatePayrollMovementDto } from './dto/update-payroll-movement.dto';
import { Company } from '../companies/entities/company.entity';
import { PayrollArticle } from '../payroll-articles/entities/payroll-article.entity';
import { PersonalActionType } from '../accounting-accounts/entities/personal-action-type.entity';
import { OrgClass } from '../classes/entities/class.entity';
import { OrgProject } from '../projects/entities/project.entity';
import { AuditOutboxService } from '../integration/audit-outbox.service';

@Injectable()
export class PayrollMovementsService {
  constructor(
    @InjectRepository(PayrollMovement)
    private readonly repo: Repository<PayrollMovement>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(PayrollArticle)
    private readonly articleRepo: Repository<PayrollArticle>,
    @InjectRepository(PersonalActionType)
    private readonly actionTypeRepo: Repository<PersonalActionType>,
    @InjectRepository(OrgClass)
    private readonly classRepo: Repository<OrgClass>,
    @InjectRepository(OrgProject)
    private readonly projectRepo: Repository<OrgProject>,
    private readonly auditOutbox: AuditOutboxService,
  ) {}

  private readonly auditFieldLabels: Record<string, string> = {
    idEmpresa: 'Empresa',
    nombre: 'Nombre movimiento',
    idArticuloNomina: 'Articulo nomina',
    idTipoAccionPersonal: 'Tipo accion personal',
    idClase: 'Clase',
    idProyecto: 'Proyecto',
    descripcion: 'Descripcion',
    esMontoFijo: 'Tipo calculo',
    montoFijo: 'Monto fijo',
    porcentaje: 'Porcentaje',
    formulaAyuda: 'Formula ayuda',
    esInactivo: 'Estado',
  };

  async create(
    dto: CreatePayrollMovementDto,
    actorUserId: number,
  ): Promise<PayrollMovement> {
    await this.assertCompanyActive(dto.idEmpresa);
    const article = await this.assertArticleByCompany(
      dto.idArticuloNomina,
      dto.idEmpresa,
      true,
    );
    await this.assertActionTypeActive(dto.idTipoAccionPersonal);
    this.assertArticleActionMatch(
      article.idTipoAccionPersonal,
      dto.idTipoAccionPersonal,
    );
    await this.assertOptionalClass(dto.idClase ?? null);
    await this.assertOptionalProject(dto.idProyecto ?? null, dto.idEmpresa);

    const normalized = this.normalizeCalculation(
      dto.esMontoFijo,
      dto.montoFijo,
      dto.porcentaje,
    );

    const entity = this.repo.create({
      idEmpresa: dto.idEmpresa,
      nombre: dto.nombre.trim(),
      idArticuloNomina: dto.idArticuloNomina,
      idTipoAccionPersonal: dto.idTipoAccionPersonal,
      idClase: dto.idClase ?? null,
      idProyecto: dto.idProyecto ?? null,
      descripcion: dto.descripcion?.trim() || '--',
      esMontoFijo: normalized.esMontoFijo,
      montoFijo: normalized.montoFijo,
      porcentaje: normalized.porcentaje,
      formulaAyuda: dto.formulaAyuda?.trim() || '--',
      esInactivo: 0,
    });
    const saved = await this.repo.save(entity);
    this.auditOutbox.publish({
      modulo: 'payroll-movements',
      accion: 'create',
      entidad: 'payroll-movement',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Movimiento de nomina creado: ${saved.nombre}`,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async findAll(
    includeInactive = false,
    inactiveOnly = false,
    idEmpresa?: number,
    idEmpresas?: number[],
  ): Promise<PayrollMovement[]> {
    const qb = this.repo.createQueryBuilder('m').orderBy('m.nombre', 'ASC');

    if (idEmpresas && idEmpresas.length > 0) {
      qb.andWhere('m.idEmpresa IN (:...idEmpresas)', { idEmpresas });
    } else if (idEmpresa) {
      qb.andWhere('m.idEmpresa = :idEmpresa', { idEmpresa });
    }

    if (inactiveOnly) {
      qb.andWhere('m.esInactivo = 1');
    } else if (!includeInactive) {
      qb.andWhere('m.esInactivo = 0');
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<PayrollMovement> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(
        `Movimiento de nomina con ID ${id} no encontrado`,
      );
    }
    return found;
  }

  async update(
    id: number,
    dto: UpdatePayrollMovementDto,
    actorUserId: number,
  ): Promise<PayrollMovement> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);

    const nextEmpresa = dto.idEmpresa ?? found.idEmpresa;
    const nextArticulo = dto.idArticuloNomina ?? found.idArticuloNomina;
    const nextTipoAccion =
      dto.idTipoAccionPersonal ?? found.idTipoAccionPersonal;
    const nextClase = dto.idClase === undefined ? found.idClase : dto.idClase;
    const nextProyecto =
      dto.idProyecto === undefined ? found.idProyecto : dto.idProyecto;
    const nextEsMontoFijo = dto.esMontoFijo ?? found.esMontoFijo;
    const nextMonto = dto.montoFijo ?? found.montoFijo;
    const nextPorcentaje = dto.porcentaje ?? found.porcentaje;

    await this.assertCompanyActive(nextEmpresa);
    const article = await this.assertArticleByCompany(
      nextArticulo,
      nextEmpresa,
      true,
      found.idArticuloNomina,
    );
    await this.assertActionTypeActive(
      nextTipoAccion,
      found.idTipoAccionPersonal,
    );
    this.assertArticleActionMatch(article.idTipoAccionPersonal, nextTipoAccion);
    await this.assertOptionalClass(nextClase ?? null, found.idClase ?? null);
    await this.assertOptionalProject(
      nextProyecto ?? null,
      nextEmpresa,
      found.idProyecto ?? null,
    );
    const normalized = this.normalizeCalculation(
      nextEsMontoFijo,
      nextMonto,
      nextPorcentaje,
    );

    if (dto.idEmpresa !== undefined) found.idEmpresa = nextEmpresa;
    if (dto.nombre !== undefined) found.nombre = dto.nombre.trim();
    if (dto.idArticuloNomina !== undefined)
      found.idArticuloNomina = nextArticulo;
    if (dto.idTipoAccionPersonal !== undefined)
      found.idTipoAccionPersonal = nextTipoAccion;
    if (dto.idClase !== undefined) found.idClase = nextClase ?? null;
    if (dto.idProyecto !== undefined) found.idProyecto = nextProyecto ?? null;
    if (dto.descripcion !== undefined)
      found.descripcion = dto.descripcion.trim() || '--';
    if (
      dto.esMontoFijo !== undefined ||
      dto.montoFijo !== undefined ||
      dto.porcentaje !== undefined
    ) {
      found.esMontoFijo = normalized.esMontoFijo;
      found.montoFijo = normalized.montoFijo;
      found.porcentaje = normalized.porcentaje;
    }
    if (dto.formulaAyuda !== undefined) {
      found.formulaAyuda = dto.formulaAyuda.trim() || '--';
    }

    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'payroll-movements',
      accion: 'update',
      entidad: 'payroll-movement',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Movimiento de nomina actualizado: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async inactivate(id: number, actorUserId: number): Promise<PayrollMovement> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.esInactivo = 1;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'payroll-movements',
      accion: 'inactivate',
      entidad: 'payroll-movement',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Movimiento de nomina inactivado: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async reactivate(id: number, actorUserId: number): Promise<PayrollMovement> {
    const found = await this.findOne(id);
    const payloadBefore = this.buildAuditPayload(found);
    found.esInactivo = 0;
    const saved = await this.repo.save(found);
    this.auditOutbox.publish({
      modulo: 'payroll-movements',
      accion: 'reactivate',
      entidad: 'payroll-movement',
      entidadId: saved.id,
      actorUserId,
      descripcion: `Movimiento de nomina reactivado: ${saved.nombre}`,
      payloadBefore,
      payloadAfter: this.buildAuditPayload(saved),
    });
    return saved;
  }

  async getAuditTrail(id: number, limit = 100) {
    const found = await this.findOne(id);
    const safeLimit = Math.min(Math.max(Number(limit || 100), 1), 500);
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
      WHERE a.entidad_auditoria = 'payroll-movement'
        AND a.id_entidad_auditoria = ?
      ORDER BY a.fecha_creacion_auditoria DESC
      LIMIT ?
      `,
      [String(found.id), safeLimit],
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

  async listArticlesByCompany(
    idEmpresa: number,
    includeInactive = false,
  ): Promise<PayrollArticle[]> {
    const qb = this.articleRepo
      .createQueryBuilder('a')
      .where('a.idEmpresa = :idEmpresa', { idEmpresa })
      .orderBy('a.nombre', 'ASC');
    if (!includeInactive) {
      qb.andWhere('a.esInactivo = 0');
    }
    return qb.getMany();
  }

  async listPersonalActionTypes(
    includeInactive = false,
  ): Promise<PersonalActionType[]> {
    const qb = this.actionTypeRepo
      .createQueryBuilder('t')
      .orderBy('t.nombre', 'ASC');
    if (!includeInactive) {
      qb.andWhere('t.estado = 1');
    }
    return qb.getMany();
  }

  async listClasses(includeInactive = false): Promise<OrgClass[]> {
    const qb = this.classRepo
      .createQueryBuilder('c')
      .orderBy('c.nombre', 'ASC');
    if (!includeInactive) {
      qb.andWhere('c.esInactivo = 0');
    }
    return qb.getMany();
  }

  async listProjects(
    idEmpresa: number,
    includeInactive = false,
  ): Promise<OrgProject[]> {
    const qb = this.projectRepo
      .createQueryBuilder('p')
      .where('p.idEmpresa = :idEmpresa', { idEmpresa })
      .orderBy('p.nombre', 'ASC');
    if (!includeInactive) {
      qb.andWhere('p.esInactivo = 0');
    }
    return qb.getMany();
  }

  private buildAuditPayload(entity: PayrollMovement): Record<string, unknown> {
    return {
      idEmpresa: entity.idEmpresa ?? null,
      nombre: entity.nombre ?? null,
      idArticuloNomina: entity.idArticuloNomina ?? null,
      idTipoAccionPersonal: entity.idTipoAccionPersonal ?? null,
      idClase: entity.idClase ?? null,
      idProyecto: entity.idProyecto ?? null,
      descripcion: entity.descripcion ?? null,
      esMontoFijo: entity.esMontoFijo === 1 ? 'Monto fijo' : 'Porcentaje',
      montoFijo: entity.montoFijo ?? null,
      porcentaje: entity.porcentaje ?? null,
      formulaAyuda: entity.formulaAyuda ?? null,
      esInactivo: entity.esInactivo === 1 ? 'Inactivo' : 'Activo',
    };
  }

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

  private normalizeCalculation(
    esMontoFijoRaw: number,
    montoRaw: string,
    porcentajeRaw: string,
  ): {
    esMontoFijo: number;
    montoFijo: string;
    porcentaje: string;
  } {
    const esMontoFijo = Number(esMontoFijoRaw) === 1 ? 1 : 0;
    const montoFijo = (montoRaw ?? '').trim();
    const porcentaje = (porcentajeRaw ?? '').trim();

    const montoValue = this.parseNonNegativeValue(montoFijo, 'Monto fijo');
    const porcentajeValue = this.parseNonNegativeValue(
      porcentaje,
      'Porcentaje',
    );

    if (esMontoFijo === 1) {
      if (porcentajeValue !== 0) {
        throw new BadRequestException(
          'Si el tipo de calculo es monto fijo, el porcentaje debe ser 0.',
        );
      }
      return { esMontoFijo: 1, montoFijo, porcentaje: '0' };
    }

    if (montoValue !== 0) {
      throw new BadRequestException(
        'Si el tipo de calculo es porcentaje, el monto fijo debe ser 0.',
      );
    }
    return { esMontoFijo: 0, montoFijo: '0', porcentaje };
  }

  private parseNonNegativeValue(raw: string, label: string): number {
    if (!/^\d+(\.\d+)?$/.test(raw)) {
      throw new BadRequestException(`${label} debe ser un numero no negativo.`);
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`${label} debe ser un numero no negativo.`);
    }
    return value;
  }

  private assertArticleActionMatch(
    articleActionTypeId: number,
    selectedActionTypeId: number,
  ): void {
    if (articleActionTypeId !== selectedActionTypeId) {
      throw new BadRequestException(
        'El tipo de accion personal debe coincidir con el articulo de nomina seleccionado.',
      );
    }
  }

  private async assertCompanyActive(idEmpresa: number): Promise<void> {
    const company = await this.companyRepo.findOne({
      where: { id: idEmpresa },
    });
    if (!company || company.estado !== 1) {
      throw new BadRequestException('Debe seleccionar una empresa activa.');
    }
  }

  private async assertArticleByCompany(
    idArticuloNomina: number,
    idEmpresa: number,
    requireActive = true,
    allowedInactiveSameId?: number,
  ): Promise<PayrollArticle> {
    const article = await this.articleRepo.findOne({
      where: { id: idArticuloNomina },
    });
    if (!article) {
      throw new ConflictException('Articulo de nomina no encontrado.');
    }
    if (article.idEmpresa !== idEmpresa) {
      throw new BadRequestException(
        'El articulo de nomina no pertenece a la empresa seleccionada.',
      );
    }
    if (
      requireActive &&
      article.esInactivo === 1 &&
      (allowedInactiveSameId == null || allowedInactiveSameId !== article.id)
    ) {
      throw new BadRequestException(
        'El articulo de nomina seleccionado esta inactivo.',
      );
    }
    return article;
  }

  private async assertActionTypeActive(
    idTipoAccionPersonal: number,
    allowInactiveSameId?: number,
  ): Promise<void> {
    const actionType = await this.actionTypeRepo.findOne({
      where: { id: idTipoAccionPersonal },
    });
    if (!actionType) {
      throw new ConflictException('Tipo de accion personal no encontrado.');
    }
    if (
      actionType.estado !== 1 &&
      (allowInactiveSameId == null || allowInactiveSameId !== actionType.id)
    ) {
      throw new BadRequestException(
        'El tipo de accion personal seleccionado esta inactivo.',
      );
    }
  }

  private async assertOptionalClass(
    idClase: number | null,
    allowInactiveSameId?: number | null,
  ): Promise<void> {
    if (!idClase) return;
    const found = await this.classRepo.findOne({ where: { id: idClase } });
    if (!found) {
      throw new ConflictException('Clase no encontrada.');
    }
    if (
      found.esInactivo === 1 &&
      (allowInactiveSameId == null || allowInactiveSameId !== found.id)
    ) {
      throw new BadRequestException('La clase seleccionada esta inactiva.');
    }
  }

  private async assertOptionalProject(
    idProyecto: number | null,
    idEmpresa: number,
    allowInactiveSameId?: number | null,
  ): Promise<void> {
    if (!idProyecto) return;
    const found = await this.projectRepo.findOne({ where: { id: idProyecto } });
    if (!found) {
      throw new ConflictException('Proyecto no encontrado.');
    }
    if (found.idEmpresa !== idEmpresa) {
      throw new BadRequestException(
        'El proyecto seleccionado no pertenece a la empresa.',
      );
    }
    if (
      found.esInactivo === 1 &&
      (allowInactiveSameId == null || allowInactiveSameId !== found.id)
    ) {
      throw new BadRequestException('El proyecto seleccionado esta inactivo.');
    }
  }
}
