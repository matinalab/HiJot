import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

export class UpdateTodoDto {
  @IsString()
  @MaxLength(1024)
  @IsOptional()
  content?: string;

  @IsNumber()
  @IsOptional()
  endTime?: number;

  @IsNumber()
  @IsOptional()
  status?: number;

  @IsString()
  @MaxLength(128)
  @IsOptional()
  remark?: string;

  @IsNumber()
  @IsOptional()
  tag?: number;

  @IsOptional()
  isReminded?: boolean;
}
