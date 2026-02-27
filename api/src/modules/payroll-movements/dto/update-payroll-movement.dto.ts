import { IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

const NON_NEGATIVE_DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

export class UpdatePayrollMovementDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  idEmpresa?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  idArticuloNomina?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idTipoAccionPersonal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idClase?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  idProyecto?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  esMontoFijo?: number;

  @IsOptional()
  @IsString()
  @Matches(NON_NEGATIVE_DECIMAL_PATTERN, { message: 'montoFijo debe ser un numero no negativo' })
  @MaxLength(50)
  montoFijo?: string;

  @IsOptional()
  @IsString()
  @Matches(NON_NEGATIVE_DECIMAL_PATTERN, { message: 'porcentaje debe ser un numero no negativo' })
  @MaxLength(50)
  porcentaje?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  formulaAyuda?: string;
}

