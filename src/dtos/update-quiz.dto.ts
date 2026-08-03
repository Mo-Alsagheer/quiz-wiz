import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsIn,
} from 'class-validator';

export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn([5, 10, 15, 20, 30, 45, 60, 90, 120, 180])
  @IsInt()
  duration?: number;
}
