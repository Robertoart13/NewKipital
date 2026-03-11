import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ListDistributionRulesDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  idEmpresa?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  esReglaGlobal?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  idDepartamento?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  idPuesto?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  esActivo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  cb?: string;
}
