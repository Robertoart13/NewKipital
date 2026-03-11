import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

import { DistributionRuleDetailDto } from './distribution-rule-detail.dto';

export class UpdateDistributionRuleDto {
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  esReglaGlobal?: boolean;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  idDepartamento?: number | null;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  idPuesto?: number | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DistributionRuleDetailDto)
  detalles: DistributionRuleDetailDto[];
}
