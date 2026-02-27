import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class ReplaceUserGlobalRolesDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  appCode: string;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds: number[];
}
