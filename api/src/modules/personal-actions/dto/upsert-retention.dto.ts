import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertRetentionLineDto {
  @IsInt()
  @Min(1)
  payrollId: number;

  @IsString()
  @IsNotEmpty()
  fechaEfecto: string;

  @IsInt()
  @Min(1)
  movimientoId: number;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  monto: number;

  @IsOptional()
  @IsString()
  formula?: string;
}

export class UpsertRetentionDto {
  @IsInt()
  @Min(1)
  idEmpresa: number;

  @IsInt()
  @Min(1)
  idEmpleado: number;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertRetentionLineDto)
  lines: UpsertRetentionLineDto[];
}

