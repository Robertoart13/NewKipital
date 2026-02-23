import { IsArray, IsOptional, IsString, Matches } from 'class-validator';

export class ReplaceUserGlobalPermissionDenialsDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  appCode: string;

  /** Códigos de permisos a denegar globalmente (en todas las empresas) */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deny?: string[];
}
