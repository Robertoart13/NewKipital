import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { EstadoProvisionAguinaldoEmpleado } from '../entities/employee-aguinaldo-provision.entity.js';

export class CreateEmployeeAguinaldoProvisionDto {
  @IsInt()
  idEmpresa: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoProvisionado: number;

  @IsDateString()
  fechaInicioLaboral: string;

  @IsOptional()
  @IsDateString()
  fechaFinLaboral?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  registroEmpresa?: string;

  @IsOptional()
  @IsEnum(EstadoProvisionAguinaldoEmpleado)
  estado?: EstadoProvisionAguinaldoEmpleado;
}
