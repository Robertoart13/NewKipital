import { IsInt, IsDateString, IsOptional, IsEnum, IsString, MaxLength } from 'class-validator';
import { TipoPlanilla, MonedaCalendario } from '../entities/payroll-calendar.entity';

export class CreatePayrollDto {
  @IsInt()
  idEmpresa: number;

  @IsInt()
  idPeriodoPago: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tipoPlanilla?: string;

  @IsDateString()
  periodoInicio: string;

  @IsDateString()
  periodoFin: string;

  @IsDateString()
  fechaInicioPago: string;

  @IsDateString()
  fechaFinPago: string;

  @IsOptional()
  @IsEnum(MonedaCalendario)
  moneda?: MonedaCalendario;

  @IsOptional()
  @IsString()
  descripcionEvento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  etiquetaColor?: string;
}
