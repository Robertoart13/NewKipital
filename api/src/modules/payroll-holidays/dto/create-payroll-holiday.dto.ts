import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const PAYROLL_HOLIDAY_TYPES = [
  'OBLIGATORIO_PAGO_DOBLE',
  'OBLIGATORIO_PAGO_SIMPLE',
  'MOVIBLE',
  'NO_OBLIGATORIO',
] as const;

export class CreatePayrollHolidayDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @IsString()
  @IsIn(PAYROLL_HOLIDAY_TYPES)
  tipo: (typeof PAYROLL_HOLIDAY_TYPES)[number];

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;
}
