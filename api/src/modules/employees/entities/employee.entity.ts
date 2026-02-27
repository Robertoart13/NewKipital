import {
  Entity, PrimaryGeneratedColumn, Column, Index,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Department } from './department.entity';
import { Position } from './position.entity';
import { PayPeriod } from '../../payroll/entities/pay-period.entity';

export enum GeneroEmpleado {
  MASCULINO = 'Masculino',
  FEMENINO = 'Femenino',
  OTRO = 'Otro',
}

export enum EstadoCivilEmpleado {
  SOLTERO = 'Soltero',
  CASADO = 'Casado',
  DIVORCIADO = 'Divorciado',
  VIUDO = 'Viudo',
  UNION_LIBRE = 'Unión Libre',
}

export enum TipoContratoEmpleado {
  INDEFINIDO = 'Indefinido',
  PLAZO_FIJO = 'Plazo Fijo',
  SERVICIOS_PROFESIONALES = 'Por Servicios Profesionales',
}

export enum JornadaEmpleado {
  TIEMPO_COMPLETO = 'Tiempo Completo',
  MEDIO_TIEMPO = 'Medio Tiempo',
  POR_HORAS = 'Por Horas',
}

export enum MonedaSalarioEmpleado {
  CRC = 'CRC',
  USD = 'USD',
}

/**
 * sys_empleados — Registro laboral de RRHH (entidad de negocio).
 *
 * REGLA: sys_empleados ≠ sys_usuarios.
 * - Empleado = persona contratada (salario, puesto, departamento).
 * - Usuario = identidad digital (login).
 * - Vínculo opcional: id_usuario (FK nullable), gestionado por workflow.
 * - id_usuario NO aparece en DTOs; se asigna vía EmployeeCreationWorkflow.
 *
 * Columnas ordenadas: identidad → personal → contacto → org → contrato → acumulados → vínculo → estado → auditoría.
 * Todas con sufijo _empleado (estándar enterprise).
 * NO delete físico. Solo inactivación lógica.
 */
@Entity('sys_empleados')
export class Employee {
  // ═══════════════════════════════ IDENTIDAD ═══════════════════════════════

  @PrimaryGeneratedColumn({ name: 'id_empleado' })
  id: number;

  @Index('IDX_empleado_empresa')
  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'codigo_empleado', type: 'varchar', length: 45 })
  codigo: string;

  @Index('IDX_empleado_cedula')
  @Column({ name: 'cedula_empleado', type: 'varchar', length: 255 })
  cedula: string;

  @Index('IDX_empleado_cedula_hash', { unique: true })
  @Column({ name: 'cedula_hash_empleado', type: 'varchar', length: 128, nullable: true })
  cedulaHash: string | null;

  @Column({ name: 'nombre_empleado', type: 'varchar', length: 255 })
  nombre: string;

  @Column({ name: 'apellido1_empleado', type: 'varchar', length: 255 })
  apellido1: string;

  @Column({ name: 'apellido2_empleado', type: 'varchar', length: 255, nullable: true })
  apellido2: string | null;

  // ═══════════════════════════════ DATOS PERSONALES ═══════════════════════

  @Column({ name: 'genero_empleado', type: 'enum', enum: GeneroEmpleado, nullable: true })
  genero: GeneroEmpleado | null;

  @Column({ name: 'estado_civil_empleado', type: 'enum', enum: EstadoCivilEmpleado, nullable: true })
  estadoCivil: EstadoCivilEmpleado | null;

  @Column({ name: 'cantidad_hijos_empleado', type: 'int', default: 0 })
  cantidadHijos: number;

  @Column({ name: 'telefono_empleado', type: 'varchar', length: 255, nullable: true })
  telefono: string | null;

  @Column({ name: 'direccion_empleado', type: 'text', nullable: true })
  direccion: string | null;

  // ═══════════════════════════════ CONTACTO / LOGIN ═══════════════════════

  @Index('IDX_empleado_email', { unique: true })
  @Column({ name: 'email_empleado', type: 'varchar', length: 255, unique: true })
  email: string;

  @Index('IDX_empleado_email_hash', { unique: true })
  @Column({ name: 'email_hash_empleado', type: 'varchar', length: 128, nullable: true })
  emailHash: string | null;

  // ═══════════════════════════════ RELACIONES ORG ═════════════════════════

  @Index('IDX_empleado_departamento')
  @Column({ name: 'id_departamento', type: 'int', nullable: true })
  idDepartamento: number | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'id_departamento' })
  departamento: Department | null;

  @Index('IDX_empleado_puesto')
  @Column({ name: 'id_puesto', type: 'int', nullable: true })
  idPuesto: number | null;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: 'id_puesto' })
  puesto: Position | null;

  @Index('IDX_empleado_supervisor')
  @Column({ name: 'id_supervisor_empleado', type: 'int', nullable: true })
  idSupervisor: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'id_supervisor_empleado' })
  supervisor: Employee | null;

  // ═══════════════════════════════ CONTRATO / PAGO ════════════════════════

  @Column({ name: 'fecha_ingreso_empleado', type: 'date' })
  fechaIngreso: Date;

  @Column({ name: 'fecha_salida_empleado', type: 'date', nullable: true })
  fechaSalida: Date | null;

  @Column({ name: 'motivo_salida_empleado', type: 'text', nullable: true })
  motivoSalida: string | null;

  @Column({ name: 'tipo_contrato_empleado', type: 'enum', enum: TipoContratoEmpleado, nullable: true })
  tipoContrato: TipoContratoEmpleado | null;

  @Column({ name: 'jornada_empleado', type: 'enum', enum: JornadaEmpleado, nullable: true })
  jornada: JornadaEmpleado | null;

  @Index('IDX_empleado_periodo_pago')
  @Column({ name: 'id_periodos_pago', type: 'int', nullable: true })
  idPeriodoPago: number | null;

  @ManyToOne(() => PayPeriod, { nullable: true })
  @JoinColumn({ name: 'id_periodos_pago' })
  periodoPago: PayPeriod | null;

  @Column({ name: 'salario_base_empleado', type: 'varchar', length: 255, nullable: true })
  salarioBase: string | null;

  @Column({ name: 'moneda_salario_empleado', type: 'enum', enum: MonedaSalarioEmpleado, default: MonedaSalarioEmpleado.CRC })
  monedaSalario: MonedaSalarioEmpleado;

  @Column({ name: 'numero_ccss_empleado', type: 'varchar', length: 255, nullable: true })
  numeroCcss: string | null;

  @Column({ name: 'cuenta_banco_empleado', type: 'varchar', length: 255, nullable: true })
  cuentaBanco: string | null;

  // ═══════════════════════════════ ACUMULADOS HR ══════════════════════════

  @Column({ name: 'vacaciones_acumuladas_empleado', type: 'varchar', length: 255, nullable: true })
  vacacionesAcumuladas: string | null;

  @Column({ name: 'cesantia_acumulada_empleado', type: 'varchar', length: 255, nullable: true })
  cesantiaAcumulada: string | null;

  // ═══════════════════════════ VÍNCULO IDENTIDAD ═════════════════════════
  // Gestionado por EmployeeCreationWorkflow. NO expuesto en DTOs.

  @Index('IDX_empleado_usuario')
  @Column({ name: 'id_usuario', type: 'int', nullable: true })
  idUsuario: number | null;

  // ═══════════════════════════════ ESTADO + AUDITORÍA ═════════════════════

  @Index('IDX_empleado_estado')
  @Column({ name: 'estado_empleado', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  @CreateDateColumn({ name: 'fecha_creacion_empleado' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_empleado' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_empleado', type: 'int', nullable: true })
  creadoPor: number | null;

  @Column({ name: 'modificado_por_empleado', type: 'int', nullable: true })
  modificadoPor: number | null;

  @Column({ name: 'datos_encriptados_empleado', type: 'tinyint', width: 1, default: 0 })
  datosEncriptados: number;

  @Column({ name: 'version_encriptacion_empleado', type: 'varchar', length: 10, nullable: true })
  versionEncriptacion: string | null;

  @Column({ name: 'fecha_encriptacion_empleado', type: 'datetime', nullable: true })
  fechaEncriptacion: Date | null;
}
