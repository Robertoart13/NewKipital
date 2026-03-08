import { Type } from 'class-transformer';
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

import { TipoLicenciaLinea } from '../entities/license-line.entity';

export class UpsertLicenseLineDto {
  @IsInt()
  @Min(1)
  payrollId: number;

  @IsDateString()
  fechaEfecto: string;

  @IsInt()
  @Min(1)
  movimientoId: number;

  @IsEnum(TipoLicenciaLinea)
  tipoLicencia: TipoLicenciaLinea;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'cantidad debe ser un numero valido con hasta 4 decimales' },
  )
  @Min(0.0001, { message: 'cantidad debe ser mayor o igual a 0.0001' })
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

export class UpsertLicenseDto {
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
  @Type(() => UpsertLicenseLineDto)
  @IsNotEmpty()
  lines: UpsertLicenseLineDto[];
}
