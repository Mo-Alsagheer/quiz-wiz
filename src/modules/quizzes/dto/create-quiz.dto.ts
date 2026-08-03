import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { DifficultyLevel } from 'src/common/enums/difficulty-enum';
import { CategoryType } from 'src/common/enums/category-enum';

export class CreateQuizDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsIn([5, 10, 15, 20, 30, 45, 60, 90, 120, 180])
  duration: number;

  @IsInt()
  @Min(1)
  @Max(100)
  numberOfQuestions: number;

  @IsInt()
  @Min(1)
  @Max(100)
  scorePerQuestion: number;

  @IsDateString()
  scheduledDateTime: string;

  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsEnum(CategoryType)
  categoryType: CategoryType;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  assignedToGroups: string[];

  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean = false;
}
