import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdatePayrollArticleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  idEmpresa?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  idTipoAccionPersonal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idTipoArticuloNomina?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idCuentaGasto?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idCuentaPasivo?: number | null;
}
