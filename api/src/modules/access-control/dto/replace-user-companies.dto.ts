import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class ReplaceUserCompaniesDto {
  @IsArray()
  @ArrayMinSize(0)
  @IsInt({ each: true })
  companyIds: number[];
}
