import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePositionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;
}
