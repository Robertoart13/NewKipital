import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateAppDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  codigo: string;

  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icono?: string;
}
