import { ArrayMaxSize, ArrayUnique, IsArray, IsString, Matches } from 'class-validator';

export class ReplaceRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]+(:[a-z0-9-]+)+$/, { each: true })
  permissions: string[];
}
