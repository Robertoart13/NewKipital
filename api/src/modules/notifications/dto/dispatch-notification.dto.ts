import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
} from 'class-validator';

export class DispatchNotificationDto {
  @IsString()
  tipo: string;

  @IsString()
  titulo: string;

  @IsString()
  @IsOptional()
  mensaje?: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  scope?: 'ROLE' | 'USER' | 'COMPANY' | 'APP' | 'GLOBAL';

  @IsNumber()
  @IsOptional()
  idApp?: number;

  @IsNumber()
  @IsOptional()
  idEmpresa?: number;

  /** Para scope ROLE: id del rol. Se resuelven usuarios con ese rol en idEmpresa+idApp. */
  @IsNumber()
  @IsOptional()
  idRol?: number;

  /** Para scope USER: ids de usuarios destino. */
  @IsArray()
  @IsOptional()
  idUsuarios?: number[];

  /** Usuarios que siempre reciben la notificación (ej. quien realizó el cambio). */
  @IsArray()
  @IsOptional()
  idUsuariosAdicionales?: number[];
}
