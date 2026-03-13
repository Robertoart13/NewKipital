import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class OvertimeBulkCommitDto {
  @IsString()
  @MaxLength(80)
  uploadPublicId: string;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  idEmpresa: number;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  payrollId: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}

