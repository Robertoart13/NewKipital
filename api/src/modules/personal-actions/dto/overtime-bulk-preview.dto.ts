import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OvertimeBulkPreviewRowDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  rowNumber: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreCompleto?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  codigoEmpleado: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  movimientoId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  tipoJornadaHorasExtras?: string;

  @Type(() => Number)
  @IsInt()
  cantidadHoras: number;

  @IsString()
  @MaxLength(30)
  fechaInicioHoraExtra: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  fechaFinHoraExtra?: string;
}

export class OvertimeBulkPreviewDto {
  @IsInt()
  @Type(() => Number)
  @Min(1)
  idEmpresa: number;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  payrollId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  fileHashSha256: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OvertimeBulkPreviewRowDto)
  rows: OvertimeBulkPreviewRowDto[];
}
