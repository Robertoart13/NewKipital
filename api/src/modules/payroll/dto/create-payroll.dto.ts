import {
  IsInt,
  IsDateString,
  IsOptional,
  IsEnum,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  TipoPlanilla,
  MonedaCalendario,
} from '../entities/payroll-calendar.entity';

export class CreatePayrollDto {
  @IsInt()
  idEmpresa: number;

  @IsInt()
  idPeriodoPago: number;

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

  @IsDateString()
  periodoInicio: string;

  @IsDateString()
  periodoFin: string;

  @IsOptional()
  @IsDateString()
  fechaCorte?: string;

  @IsDateString()
  fechaInicioPago: string;

  @IsDateString()
  fechaFinPago: string;

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
