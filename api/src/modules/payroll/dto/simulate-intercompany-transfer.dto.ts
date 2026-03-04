import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class EmployeeTransferItemDto {
  @IsInt()
  idEmpleado: number;
}

export class SimulateIntercompanyTransferDto {
  @IsInt()
  idEmpresaDestino: number;

  @IsDateString()
  fechaEfectiva: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EmployeeTransferItemDto)
  empleados: EmployeeTransferItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}
