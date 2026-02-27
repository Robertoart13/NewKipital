import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

const NON_NEGATIVE_DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

export class CreatePayrollMovementDto {
  @IsInt()
  @Min(1)
  idEmpresa: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @IsInt()
  @Min(1)
  idArticuloNomina: number;

  @IsInt()
  @Min(1)
  idTipoAccionPersonal: number;

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

  @IsInt()
  @Min(0)
  esMontoFijo: number;

  @IsString()
  @Matches(NON_NEGATIVE_DECIMAL_PATTERN, { message: 'montoFijo debe ser un numero no negativo' })
  @MaxLength(50)
  montoFijo: string;

  @IsString()
  @Matches(NON_NEGATIVE_DECIMAL_PATTERN, { message: 'porcentaje debe ser un numero no negativo' })
  @MaxLength(50)
  porcentaje: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  formulaAyuda?: string;
}

