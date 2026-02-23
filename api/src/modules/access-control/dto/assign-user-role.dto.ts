import { IsInt } from 'class-validator';

export class AssignUserRoleDto {
  @IsInt()
  idUsuario: number;

  @IsInt()
  idRol: number;

  @IsInt()
  idEmpresa: number;

  @IsInt()
  idApp: number;
}
