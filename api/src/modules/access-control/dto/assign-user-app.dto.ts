import { IsInt } from 'class-validator';

export class AssignUserAppDto {
  @IsInt()
  idUsuario: number;

  @IsInt()
  idApp: number;
}
