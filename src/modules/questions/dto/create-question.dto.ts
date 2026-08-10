import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DifficultyLevel } from 'src/common/enums/difficulty-enum';
import { CategoryType } from 'src/common/enums/category-enum';
import { QuestionType } from 'src/common/enums/question-type.enum';
import { AnswerDto } from './answer.dto';

export class CreateQuestionDto {
  @ApiProperty({
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
    description: 'Type of question: MULTIPLE_CHOICE, TRUE_FALSE, or ESSAY',
  })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    description: 'Question title/prompt',
    example: 'What does CSS stand for?',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({
    description: 'Optional question description or instructions',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    type: [AnswerDto],
    description:
      'Answers array: 4 items for MULTIPLE_CHOICE, 2 items for TRUE_FALSE, empty for ESSAY',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers?: AnswerDto[];

  @ApiPropertyOptional({
    description:
      'Correct answer option key (A, B, C, D) or reference answer text for ESSAY',
    example: 'A',
  })
  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @ApiProperty({ enum: DifficultyLevel, example: DifficultyLevel.MID })
  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @ApiProperty({ enum: CategoryType, example: CategoryType.FE })
  @IsEnum(CategoryType)
  categoryType: CategoryType;
}
