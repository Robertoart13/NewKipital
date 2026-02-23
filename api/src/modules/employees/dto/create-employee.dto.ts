import {
  IsString, IsEmail, IsOptional, IsInt, IsBoolean,
  IsDateString, IsNumber, IsEnum, MaxLength, MinLength, Min,
} from 'class-validator';
import {
  GeneroEmpleado, EstadoCivilEmpleado, TipoContratoEmpleado,
  JornadaEmpleado, MonedaSalarioEmpleado,
} from '../entities/employee.entity.js';

/**
 * DTO para crear empleado.
 * NO incluye idUsuario (gestionado por workflow si crearAccesoTimewise=true).
 * Campos ordenados: identidad → personal → contacto → org → contrato → acumulados → flags acceso.
 */
export class CreateEmployeeDto {
  // ═══════════ IDENTIDAD ═══════════

  @IsInt()
  idEmpresa: number;

  @IsString()
  @MinLength(1)
  @MaxLength(45)
  codigo: string;

  @IsString()
  @MaxLength(30)
  cedula: string;

  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MaxLength(100)
  apellido1: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido2?: string;

  // ═══════════ DATOS PERSONALES ═══════════

  @IsOptional()
  @IsEnum(GeneroEmpleado)
  genero?: GeneroEmpleado;

  @IsOptional()
  @IsEnum(EstadoCivilEmpleado)
  estadoCivil?: EstadoCivilEmpleado;

  @IsOptional()
  @IsInt()
  @Min(0)
  cantidadHijos?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  // ═══════════ CONTACTO ═══════════

  @IsEmail()
  @MaxLength(150)
  email: string;

  // ═══════════ RELACIONES ORG ═══════════

  @IsOptional()
  @IsInt()
  idDepartamento?: number;

  @IsOptional()
  @IsInt()
  idPuesto?: number;

  @IsOptional()
  @IsInt()
  idSupervisor?: number;

  // ═══════════ CONTRATO / PAGO ═══════════

  @IsDateString()
  fechaIngreso: string;

  @IsOptional()
  @IsEnum(TipoContratoEmpleado)
  tipoContrato?: TipoContratoEmpleado;

  @IsOptional()
  @IsEnum(JornadaEmpleado)
  jornada?: JornadaEmpleado;

  @IsOptional()
  @IsInt()
  idPeriodoPago?: number;

  @IsOptional()
  @IsNumber()
  salarioBase?: number;

  @IsOptional()
  @IsEnum(MonedaSalarioEmpleado)
  monedaSalario?: MonedaSalarioEmpleado;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(30)
  numeroCcss?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cuentaBanco?: string;

  // ═══════════ FLAGS DE ACCESO DIGITAL ═══════════
  // Controlan si el workflow crea usuario + asigna app.
  // NO son campos de sys_empleados.

  @IsOptional()
  @IsBoolean()
  crearAccesoTimewise?: boolean;

  @IsOptional()
  @IsBoolean()
  crearAccesoKpital?: boolean;

  @IsOptional()
  @IsInt()
  idRolTimewise?: number;

  @IsOptional()
  @IsInt()
  idRolKpital?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  passwordInicial?: string;
}
