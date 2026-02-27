import {
  IsInt,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreatePersonalActionDto {
  @IsInt()
  idEmpresa: number;

  @IsInt()
  idEmpleado: number;

  @IsString()
  @MaxLength(50)
  tipoAccion: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fechaEfecto?: string;

  @IsOptional()
  @IsNumber()
  monto?: number;
}
