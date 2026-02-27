import { ArrayUnique, IsArray, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

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
  @Matches(/^[a-z0-9-_]+(:[a-z0-9-_]+)+$/, { each: true })
  allow?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[a-z0-9-_]+(:[a-z0-9-_]+)+$/, { each: true })
  deny?: string[];
}
