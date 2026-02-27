import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePayrollArticleDto {
  @IsInt()
  @Min(1)
  idEmpresa: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @IsInt()
  @Min(1)
  idTipoAccionPersonal: number;

  @IsInt()
  @Min(1)
  idTipoArticuloNomina: number;

  @IsInt()
  @Min(1)
  idCuentaGasto: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idCuentaPasivo?: number;
}
