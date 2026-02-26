import { IsInt, IsOptional, IsString, MaxLength, MinLength, Min } from 'class-validator';

export class CreateAccountingAccountDto {
  @IsInt()
  @Min(1)
  idEmpresa: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  codigo: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  idExternoNetsuite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoExterno?: string;

  @IsInt()
  @Min(1)
  idTipoErp: number;

  @IsInt()
  @Min(1)
  idTipoAccionPersonal: number;
}
