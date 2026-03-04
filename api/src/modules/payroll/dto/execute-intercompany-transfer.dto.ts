import { IsArray, ArrayMinSize, IsInt } from 'class-validator';

export class ExecuteIntercompanyTransferDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  transferIds: number[];
}
