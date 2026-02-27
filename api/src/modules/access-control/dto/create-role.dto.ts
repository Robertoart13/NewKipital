import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsIn,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  codigo: string;

  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  /** Aplicación del rol: kpital o timewise. Obligatorio al crear. */
  @IsString()
  @IsIn(['kpital', 'timewise'])
  appCode: string;
}
