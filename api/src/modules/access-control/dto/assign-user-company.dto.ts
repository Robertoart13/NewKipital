import { IsInt } from 'class-validator';

export class AssignUserCompanyDto {
  @IsInt()
  idUsuario: number;

  @IsInt()
  idEmpresa: number;
}
