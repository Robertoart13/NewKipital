import {
  IsString, IsEmail, IsOptional, IsInt, IsNumber,
  IsDateString, IsEnum, MaxLength, Min, MinLength, Matches,
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

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsInt()
  idDepartamento?: number;

  @IsOptional()
  @IsInt()
  idPuesto?: number;

  @IsOptional()
  @IsInt()
  idSupervisor?: number;

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
  fechaIngreso?: string;

  @IsOptional()
  @IsDateString()
  fechaSalida?: string;

  @IsOptional()
  @IsString()
  motivoSalida?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(0|[1-9]\d*)$/, { message: 'vacacionesAcumuladas debe ser un entero de 0 o mayor' })
  vacacionesAcumuladas?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(0|[1-9]\d*)(\.\d+)?$/, { message: 'cesantiaAcumulada debe ser un nÃºmero no negativo' })
  cesantiaAcumulada?: string;
}
