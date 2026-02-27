import {
  IsString,
  IsOptional,
  IsEmail,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MaxLength(200)
  nombre: string;

  @IsString()
  @MaxLength(300)
  nombreLegal: string;

  @IsString()
  @MaxLength(50)
  cedula: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  actividadEconomica?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  prefijo: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  idExterno?: string;

  @IsOptional()
  @IsString()
  direccionExacta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigoPostal?: string;
}
