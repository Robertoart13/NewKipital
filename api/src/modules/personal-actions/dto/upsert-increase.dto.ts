import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoCalculoAumentoLinea } from '../entities/increase-line.entity';

export class UpsertIncreaseLineDto {
  @IsInt()
  @Min(1)
  payrollId: number;

  @IsString()
  @IsNotEmpty()
  fechaEfecto: string;

  @IsInt()
  @Min(1)
  movimientoId: number;

  @IsString()
  @IsIn(['MONTO', 'PORCENTAJE'])
  metodoCalculo: MetodoCalculoAumentoLinea;

  @IsNumber()
  @Min(0)
  monto: number;

  @IsNumber()
  @Min(0)
  porcentaje: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salarioActual?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  nuevoSalario?: number;

  @IsOptional()
  @IsString()
  formula?: string;
}

export class UpsertIncreaseDto {
  @IsInt()
  @Min(1)
  idEmpresa: number;

  @IsInt()
  @Min(1)
  idEmpleado: number;

  @IsOptional()
  @IsString()
  observacion?: string;

  @ValidateNested()
  @Type(() => UpsertIncreaseLineDto)
  line: UpsertIncreaseLineDto;
}
