import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

export class CreateTodoDto {
  @IsString()
  @MaxLength(1024)
  content: string;

  @IsNumber()
  endTime: number;

  @IsNumber()
  @IsOptional()
  noticeTime?: number;

  @IsString()
  @MaxLength(128)
  @IsOptional()
  remark?: string;

  @IsNumber()
  @IsOptional()
  tag?: number;
}
