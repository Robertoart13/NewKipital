import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class DistributionRuleDetailDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTipoAccionPersonal: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idCuentaContable: number;
}

