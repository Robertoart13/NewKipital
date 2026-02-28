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
import { TipoAusenciaLinea } from '../entities/absence-line.entity';

export class UpsertAbsenceLineDto {
  @IsInt()
  @Min(1)
  payrollId: number;

  @IsDateString()
  fechaEfecto: string;

  @IsInt()
  @Min(1)
  movimientoId: number;

  @IsEnum(TipoAusenciaLinea)
  tipoAusencia: TipoAusenciaLinea;

  @IsInt()
  @Min(1, { message: 'cantidad debe ser mayor o igual a 1' })
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

export class UpsertAbsenceDto {
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
  @Type(() => UpsertAbsenceLineDto)
  @IsNotEmpty()
  lines: UpsertAbsenceLineDto[];
}
