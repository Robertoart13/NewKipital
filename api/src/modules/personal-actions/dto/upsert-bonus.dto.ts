import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoBonificacionLinea } from '../entities/bonus-line.entity';

export class UpsertBonusLineDto {
  @IsInt()
  @Min(1)
  payrollId: number;

  @IsDateString()
  fechaEfecto: string;

  @IsInt()
  @Min(1)
  movimientoId: number;

  @IsEnum(TipoBonificacionLinea)
  tipoBonificacion: TipoBonificacionLinea;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  cantidad: number;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  @Max(9999999999)
  monto: number;

  @IsBoolean()
  remuneracion: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  formula?: string;
}

export class UpsertBonusDto {
  @IsInt()
  @Min(1)
  idEmpresa: number;

  @IsInt()
  @Min(1)
  idEmpleado: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertBonusLineDto)
  @IsNotEmpty()
  lines: UpsertBonusLineDto[];
}

