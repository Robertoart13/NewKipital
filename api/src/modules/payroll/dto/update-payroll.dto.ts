import { IsInt, IsDateString, IsOptional, IsEnum, IsString, MaxLength } from 'class-validator';
import { MonedaCalendario } from '../entities/payroll-calendar.entity';

export class UpdatePayrollDto {
  @IsOptional()
  @IsInt()
  idEmpresa?: number;

  @IsOptional()
  @IsInt()
  idPeriodoPago?: number;

  @IsOptional()
  @IsInt()
  idTipoPlanilla?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombrePlanilla?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tipoPlanilla?: string;

  @IsOptional()
  @IsDateString()
  periodoInicio?: string;

  @IsOptional()
  @IsDateString()
  periodoFin?: string;

  @IsOptional()
  @IsDateString()
  fechaCorte?: string;

  @IsOptional()
  @IsDateString()
  fechaInicioPago?: string;

  @IsOptional()
  @IsDateString()
  fechaFinPago?: string;

  @IsOptional()
  @IsDateString()
  fechaPagoProgramada?: string;

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

