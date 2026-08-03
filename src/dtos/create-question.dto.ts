import {
  ArrayMaxSize,
  ArrayMinSize, IsArray,IsEnum,IsNotEmpty,IsOptional,IsString, MaxLength,MinLength,ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';
import { DifficultyLevel } from 'src/common/enums/difficulty-enum';
import { CategoryType } from 'src/common/enums/category-enum';
import { AnswerDto } from './answer-dto';

export class CreateQuestionDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];

  @IsEnum(['A', 'B', 'C', 'D'])
  correctAnswer: 'A' | 'B' | 'C' | 'D';

  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsEnum(CategoryType)
  categoryType: CategoryType;
}