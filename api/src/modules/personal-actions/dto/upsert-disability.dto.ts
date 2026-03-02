import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TipoIncapacidadLinea,
  TipoInstitucionIncapacidadLinea,
} from '../entities/disability-line.entity';

export class UpsertDisabilityLineDto {
  @IsInt()
  @Min(1)
  payrollId: number;

  @IsDateString()
  fechaEfecto: string;

  @IsInt()
  @Min(1)
  movimientoId: number;

  @IsEnum(TipoIncapacidadLinea)
  tipoIncapacidad: TipoIncapacidadLinea;

  @IsEnum(TipoInstitucionIncapacidadLinea)
  tipoInstitucion: TipoInstitucionIncapacidadLinea;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001, { message: 'cantidad debe ser mayor a 0' })
  cantidad: number;

  @IsInt()
  @Type(() => Number)
  @Min(0)
  @Max(9999999999)
  monto: number;

  @IsBoolean()
  remuneracion: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoIns?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoPatrono?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  subsidioCcss?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalIncapacidad?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  formula?: string;
}

export class UpsertDisabilityDto {
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
  @Type(() => UpsertDisabilityLineDto)
  @IsNotEmpty()
  lines: UpsertDisabilityLineDto[];
}
