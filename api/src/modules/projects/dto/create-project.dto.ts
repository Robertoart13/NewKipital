import { IsInt, IsOptional, IsString, MaxLength, MinLength, Min } from 'class-validator';

export class CreateProjectDto {
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
  @MaxLength(45)
  idExterno?: string;
}
