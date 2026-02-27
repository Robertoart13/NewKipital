import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PAYROLL_HOLIDAY_TYPES } from './create-payroll-holiday.dto';

export class UpdatePayrollHolidayDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAYROLL_HOLIDAY_TYPES)
  tipo?: (typeof PAYROLL_HOLIDAY_TYPES)[number];

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;
}
