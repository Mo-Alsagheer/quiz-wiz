import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerOptionDto {
  @ApiProperty({ description: 'Target question ID' })
  @IsMongoId()
  questionId: string;

  @ApiPropertyOptional({
    description:
      'Selected option key for MCQ/True-False questions (e.g. A, B, C, D)',
    example: 'A',
  })
  @IsOptional()
  @IsString()
  selectedOption?: string | null;

  @ApiPropertyOptional({
    description: 'Submitted text response for Essay questions',
  })
  @IsOptional()
  @IsString()
  essayAnswer?: string | null;
}

export class SubmitQuizDto {
  @ApiProperty({
    type: [AnswerOptionDto],
    description: 'List of submitted question answers',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionDto)
  answers: AnswerOptionDto[];
}
