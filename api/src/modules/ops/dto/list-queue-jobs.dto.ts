import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export type QueueType = 'identity' | 'encrypt';

export class ListQueueJobsDto {
  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idEmpleado?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  attemptsMin?: number;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lockedOnly?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stuckOnly?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1)
  includeDone?: number;
}

export class RequeueJobDto {
  @IsIn(['identity', 'encrypt'])
  queue: QueueType;
}

export class QueueTypeDto {
  @IsIn(['identity', 'encrypt'])
  queue: QueueType;
}
