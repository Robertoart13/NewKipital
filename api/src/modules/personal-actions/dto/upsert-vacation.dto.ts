import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpsertVacationDateDto {
  @IsString()
  @IsNotEmpty()
  fecha: string;
}

export class UpsertVacationDto {
  @IsInt()
  @Min(1)
  idEmpresa: number;

  @IsInt()
  @Min(1)
  idEmpleado: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  payrollId?: number;

  @IsInt()
  @Min(1)
  movimientoId: number;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertVacationDateDto)
  fechas: UpsertVacationDateDto[];
}
