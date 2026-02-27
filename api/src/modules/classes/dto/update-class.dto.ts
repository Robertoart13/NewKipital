import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateClassDto {
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
