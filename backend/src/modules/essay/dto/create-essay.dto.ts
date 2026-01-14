import { IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEssayDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  content: string;

  @Type(() => Number)
  @IsNumber()
  time: number;
}
