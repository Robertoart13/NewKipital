import { IsInt, IsOptional, IsString, MaxLength, MinLength, Min } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  idEmpresa?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(45)
  idExterno?: string;
}
