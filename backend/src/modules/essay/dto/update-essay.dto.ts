import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEssayDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsNumber()
  @IsOptional()
  status?: number;
}
