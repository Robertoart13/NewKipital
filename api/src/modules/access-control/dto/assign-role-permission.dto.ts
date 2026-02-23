import { IsInt } from 'class-validator';

export class AssignRolePermissionDto {
  @IsInt()
  idRol: number;

  @IsInt()
  idPermiso: number;
}
