import {
  IsString, IsEmail, IsOptional, IsInt, IsNumber,
  IsDateString, IsEnum, MaxLength, Min, MinLength,
} from 'class-validator';
import {
  GeneroEmpleado, EstadoCivilEmpleado, TipoContratoEmpleado,
  JornadaEmpleado, MonedaSalarioEmpleado,
} from '../entities/employee.entity';

/**
 * DTO para actualizar empleado.
 * NO incluye idUsuario (gestionado por workflow).
 * Todos los campos opcionales.
 */
export class UpdateEmployeeDto {
  // ═══════════ IDENTIDAD ═══════════

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  apellido2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cedula?: string;

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

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

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

  @IsOptional()
  @IsDateString()
  fechaSalida?: string;

  @IsOptional()
  @IsString()
  motivoSalida?: string;
}
