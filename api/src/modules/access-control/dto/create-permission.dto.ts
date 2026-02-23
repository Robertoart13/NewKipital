import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreatePermissionDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)+$/, {
    message: 'codigo debe cumplir formato module:action[:subaction] en minusculas',
  })
  codigo: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @MaxLength(50)
  modulo: string;
}
