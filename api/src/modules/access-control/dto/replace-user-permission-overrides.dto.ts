import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class ReplaceUserPermissionOverridesDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  appCode: string;

  @IsInt()
  @Min(1)
  companyId: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]+(:[a-z0-9-]+)+$/, { each: true })
  allow?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]+(:[a-z0-9-]+)+$/, { each: true })
  deny?: string[];
}
