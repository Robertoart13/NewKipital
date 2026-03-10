import { ArrayNotEmpty, IsArray, IsBoolean, IsInt, Min } from 'class-validator';

export class UpdatePayrollEmployeeSelectionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  employeeIds: number[];

  @IsBoolean()
  selected: boolean;
}

